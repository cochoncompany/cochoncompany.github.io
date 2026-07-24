document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("pedido-form");
  if (!form) return;

  const WHATSAPP_NUMBER = "5491136441214";

  // Emoji as \u{} escapes, not literal characters: some hosting/serving
  // setups mis-detect the charset of external .js files and mangle
  // 4-byte (astral) characters like emoji into "�". Escapes are plain
  // ASCII in the source, so no charset guessing can ever break them.
  const EMOJI = {
    wave: "\u{1F44B}",
    raise: "\u{1F64B}",
    people: "\u{1F465}",
    meat: "\u{1F356}",
    bread: "\u{1F35E}",
    spoon: "\u{1F944}",
    mushroom: "\u{1F344}",
    money: "\u{1F4B0}",
    package: "\u{1F4E6}",
    pin: "\u{1F4CD}",
    calendar: "\u{1F4C5}",
    memo: "\u{1F4DD}",
    check: "\u{2705}",
    remove: "\u{274C}",
  };

  const peopleRadios = form.querySelectorAll('input[name="people"]');
  const otherWrap = document.getElementById("people-other-wrap");
  const otherInput = document.getElementById("people-other-input");

  const meatChecks = form.querySelectorAll('input[name="carne"]');
  const breadChecks = form.querySelectorAll('input[name="pan"]');
  const sauceChecks = form.querySelectorAll('input[name="salsas"]');
  const modalidadRadios = form.querySelectorAll('input[name="modalidad"]');
  const addressWrap = document.getElementById("address-wrap");
  const addressInput = document.getElementById("address-input");
  const addressStatusEl = document.getElementById("address-status");
  const addressFloorInput = document.getElementById("address-floor-input");

  const nameInput = document.getElementById("name-input");
  const dateInput = document.getElementById("date-input");
  const commentsInput = document.getElementById("comments-input");

  const sauceCountEl = document.getElementById("sauce-count");
  const sauceRecommendEl = document.getElementById("sauce-recommend");
  const summaryEl = document.getElementById("summary-list");
  const submitBtn = document.getElementById("submit-btn");
  const validationMsg = document.getElementById("validation-msg");
  const meatHintEl = document.getElementById("meat-hint");
  const breadHintEl = document.getElementById("bread-hint");
  const budgetAmountEl = document.getElementById("budget-amount");
  const budgetNoteEl = document.getElementById("budget-note");
  const mobileBudgetAmountEl = document.getElementById("mobile-budget-amount");
  const toastContainer = document.getElementById("toast-container");

  const veggieToggleInput = document.getElementById("veggie-toggle-input");
  const veggieQtyWrap = document.getElementById("veggie-qty-wrap");
  const veggieQtyInput = document.getElementById("veggie-qty-input");
  const veggiePriceText = document.getElementById("veggie-price-text");

  const PRECIOS = window.PRECIOS_COCHON || {
    porPersonas: {},
    solomillo: {},
    carnesGrupoChico: [],
    cantidadesGrupoChico: [],
    precioSalsaExtra: null,
  };

  const PEOPLE_BRACKETS = Object.keys(PRECIOS.porPersonas)
    .map(Number)
    .sort((a, b) => a - b);

  // Salsas incluidas para cantidades que no están en la tabla ("otra cantidad"):
  // toma el escalón real más cercano hacia arriba.
  function estimateSauces(n) {
    const match = PEOPLE_BRACKETS.find((k) => n <= k);
    const key = match !== undefined ? match : PEOPLE_BRACKETS[PEOPLE_BRACKETS.length - 1];
    return PRECIOS.porPersonas[key] ? PRECIOS.porPersonas[key].salsasIncluidas : null;
  }

  function formatCurrency(n) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);
  }

  // Returns { label, people, sauces } for the chosen people bracket, or null if none chosen yet.
  function getPeopleSelection() {
    const checked = form.querySelector('input[name="people"]:checked');
    if (!checked) return null;
    if (checked.value === "other") {
      const v = parseInt(otherInput.value, 10);
      if (!Number.isFinite(v) || v <= 0) return null;
      return { label: `${v} personas`, people: v, sauces: estimateSauces(v) };
    }
    const n = Number(checked.value);
    const bracket = PRECIOS.porPersonas[n];
    return { label: `${n} personas`, people: n, sauces: bracket ? bracket.salsasIncluidas : estimateSauces(n) };
  }

  // undefined = esa carne no se ofrece para esa cantidad. null = se ofrece pero
  // todavía no cargamos el precio. number = precio real.
  function priceForMeat(meatKey, people) {
    if (!people) return undefined;
    if (meatKey === "solomillo") {
      return Object.prototype.hasOwnProperty.call(PRECIOS.solomillo, people)
        ? PRECIOS.solomillo[people]
        : undefined;
    }
    const bracket = PRECIOS.porPersonas[people];
    return bracket ? bracket[meatKey] : undefined;
  }

  function updateMeatAvailability() {
    const sel = getPeopleSelection();
    const smallGroupOk = Boolean(sel) && PRECIOS.cantidadesGrupoChico.includes(sel.people);

    meatChecks.forEach((input) => {
      const key = input.dataset.meatKey;
      const isSmallGroupMeat = PRECIOS.carnesGrupoChico.includes(key);
      const chip = input.closest(".choice-chip");
      const locked = isSmallGroupMeat && !smallGroupOk;

      if (locked && input.checked) input.checked = false;
      input.disabled = locked;
      chip.classList.toggle("choice-chip--locked", locked);
    });

    if (meatHintEl) {
      meatHintEl.textContent = sel && !smallGroupOk
        ? "Podés combinar más de una opción. Bondiola y solomillo solo están disponibles para grupos de 5 o 10 personas."
        : "Podés combinar más de una opción. El precio exacto se muestra cuando elegís una sola carne.";
    }
  }

  function updateMeatPriceTags() {
    const sel = getPeopleSelection();

    document.querySelectorAll(".chip-price[data-price-for]").forEach((el) => {
      const key = el.dataset.priceFor;

      if (!sel || !sel.people) {
        el.textContent = "Elegí personas";
        return;
      }

      const isSmallGroupMeat = PRECIOS.carnesGrupoChico.includes(key);
      if (isSmallGroupMeat && !PRECIOS.cantidadesGrupoChico.includes(sel.people)) {
        el.textContent = "Solo para 5 o 10 personas";
        return;
      }

      const price = priceForMeat(key, sel.people);
      if (price === undefined) el.textContent = "No disponible para esa cantidad";
      else if (price === null) el.textContent = "Consultanos el precio";
      else el.textContent = formatCurrency(price);
    });
  }

  // La cantidad de panes viene fija por la tabla según personas (no se
  // elige) — lo que el cliente elige acá es solo el/los tipo(s).
  function panesFor(people) {
    const bracket = PRECIOS.porPersonas[people];
    return bracket ? bracket.panes : null;
  }

  function updateBreadHint() {
    if (!breadHintEl) return;
    const sel = getPeopleSelection();
    const breads = selectedValues(breadChecks);

    if (!sel || !sel.people) {
      breadHintEl.textContent = "Podés elegir uno o combinar varios. Elegí primero la cantidad de personas para ver cuántos panes incluye.";
      return;
    }

    const panes = panesFor(sel.people);
    if (panes == null) {
      breadHintEl.textContent = "Podés elegir uno o combinar varios. Te confirmamos la cantidad exacta de panes por WhatsApp.";
      return;
    }

    if (breads.length <= 1) {
      breadHintEl.textContent = `Para ${sel.label} incluye ${panes} panes en total. Podés combinar más de un tipo.`;
      return;
    }

    breadHintEl.textContent = `Para ${sel.label} incluye ${panes} panes en total — los repartimos en partes iguales entre los ${breads.length} tipos elegidos, salvo que nos aclares otra proporción en comentarios.`;
  }

  // Pulled shrooms se vende por porción (rinde 5-6 personas c/u), no por
  // persona suelta. Redondeamos siempre para arriba: para 7 personas
  // hacen falta 2 porciones (cubren hasta 12).
  function portionsFor(qty) {
    const v = PRECIOS.vegetariano;
    if (!v || !v.personasMaxPorPorcion) return null;
    return Math.ceil(qty / v.personasMaxPorPorcion);
  }

  // Returns { qty, portions, price, nombre, acompañamiento } once a valid
  // quantity is entered, null otherwise (toggle off, or qty not typed yet).
  function getVeggieSelection() {
    if (!veggieToggleInput || !veggieToggleInput.checked) return null;
    const qty = parseInt(veggieQtyInput.value, 10);
    if (!Number.isFinite(qty) || qty <= 0) return null;

    const v = PRECIOS.vegetariano;
    const nombre = v ? v.nombre : "Opción vegetariana";
    const portions = portionsFor(qty);
    const price = v && v.precioPorPorcion != null && portions != null ? portions * v.precioPorPorcion : null;
    return { qty, portions, price, nombre, acompañamiento: v ? v.acompañamiento : null };
  }

  function updateVeggiePriceText() {
    if (!veggiePriceText) return;
    const v = PRECIOS.vegetariano;
    const qty = parseInt(veggieQtyInput.value, 10);
    const hasQty = Number.isFinite(qty) && qty > 0;

    if (!v || v.precioPorPorcion == null) {
      veggiePriceText.textContent = "Consultanos el precio";
      return;
    }
    if (!hasQty) {
      veggiePriceText.textContent = `Cada porción (${formatCurrency(v.precioPorPorcion)}) cubre ${v.personasMinPorPorcion} a ${v.personasMaxPorPorcion} personas`;
      return;
    }
    const portions = portionsFor(qty);
    const total = portions * v.precioPorPorcion;
    veggiePriceText.textContent = `${portions} ${portions > 1 ? "porciones" : "porción"} de Pulled shrooms — ${formatCurrency(total)}`;
  }

  function calculateBudget() {
    const sel = getPeopleSelection();
    const checkedMeats = [...meatChecks].filter((c) => c.checked);
    const sauces = selectedValues(sauceChecks);
    const veggie = getVeggieSelection();

    function withVeggie(result) {
      if (!veggie) return result;
      const portionsLabel = veggie.portions ? `${veggie.portions} ${veggie.portions > 1 ? "porciones" : "porción"}` : "";
      const acompañamiento = veggie.acompañamiento ? `, con ${veggie.acompañamiento.toLowerCase()}` : "";

      if (veggie.price != null && result.total != null) {
        return {
          amountText: formatCurrency(result.total + veggie.price),
          note: `${result.note} Incluye ${veggie.nombre} — ${portionsLabel} para ${veggie.qty} personas (${formatCurrency(veggie.price)})${acompañamiento}.`,
        };
      }
      const amountText =
        result.amountText === "—" || result.amountText === "A confirmar"
          ? result.amountText
          : `${result.amountText} + vegetariano`;
      return {
        amountText,
        note: `${result.note} Sumaste ${veggie.nombre} para ${veggie.qty} personas — te confirmamos ese costo por WhatsApp.`,
      };
    }

    if (!sel || !sel.people) {
      return withVeggie({ amountText: "—", note: "Elegí personas y una carne para ver el precio.", total: null });
    }
    if (checkedMeats.length === 0) {
      return withVeggie({ amountText: "—", note: "Elegí una carne para ver el precio.", total: null });
    }
    if (checkedMeats.length > 1) {
      return withVeggie({
        amountText: "A confirmar",
        note: "Combinás más de una carne: te confirmamos el precio exacto por WhatsApp.",
        total: null,
      });
    }

    const meatKey = checkedMeats[0].dataset.meatKey;
    const meatPrice = priceForMeat(meatKey, sel.people);

    if (meatPrice === undefined) {
      return withVeggie({
        amountText: "A confirmar",
        note: "Esa carne no está disponible para esa cantidad de personas. Te confirmamos opciones por WhatsApp.",
        total: null,
      });
    }
    if (meatPrice === null) {
      return withVeggie({
        amountText: "A confirmar",
        note: "Todavía no tenemos ese precio cargado. Te lo confirmamos por WhatsApp.",
        total: null,
      });
    }

    const bracket = PRECIOS.porPersonas[sel.people];
    const recomendadas = bracket ? bracket.salsasIncluidas : sel.sauces || 0;
    const extra = Math.max(0, sauces.length - recomendadas);

    if (extra === 0) {
      return withVeggie({
        amountText: formatCurrency(meatPrice),
        note: `Incluye ${recomendadas} salsas a elección, panes y todo listo para servir.`,
        total: meatPrice,
      });
    }

    if (PRECIOS.precioSalsaExtra == null) {
      return withVeggie({
        amountText: `${formatCurrency(meatPrice)} + salsas extra`,
        note: `Elegiste ${extra} salsa${extra > 1 ? "s" : ""} más de las ${recomendadas} incluidas — te confirmamos el costo extra por WhatsApp.`,
        total: null,
      });
    }

    const total = meatPrice + extra * PRECIOS.precioSalsaExtra;
    return withVeggie({
      amountText: formatCurrency(total),
      note: `Incluye ${recomendadas} salsas + ${extra} extra a ${formatCurrency(PRECIOS.precioSalsaExtra)} c/u.`,
      total,
    });
  }

  function selectedValues(nodeList) {
    return [...nodeList].filter((n) => n.checked).map((n) => n.value);
  }

  function updateOtherVisibility() {
    const checked = form.querySelector('input[name="people"]:checked');
    const isOther = Boolean(checked) && checked.value === "other";
    otherWrap.hidden = !isOther;
    if (isOther) otherInput.focus();
  }

  function updateAddressVisibility() {
    const checked = form.querySelector('input[name="modalidad"]:checked');
    addressWrap.hidden = !checked || checked.value !== "Envío a domicilio";
    if (addressWrap.hidden) hideAddressStatus();
  }

  // ---- Verificación de dirección (OpenStreetMap Nominatim, sin API key) ----
  // No bloquea el envío: es una ayuda visual para que el cliente confirme
  // que escribió bien la dirección, y para que ustedes tengan un link al
  // mapa listo en el mensaje.
  let geocodeTimer = null;
  let geocodeRequestId = 0;
  let lastGeocode = null; // { lat, lon, displayName } de la dirección actualmente confirmada

  function showAddressStatus(kind, html) {
    if (!addressStatusEl) return;
    addressStatusEl.hidden = false;
    addressStatusEl.className = `address-status address-status--${kind}`;
    addressStatusEl.innerHTML = html;
  }

  function hideAddressStatus() {
    if (!addressStatusEl) return;
    addressStatusEl.hidden = true;
    addressStatusEl.innerHTML = "";
  }

  async function geocodeAddress(query, requestId) {
    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        q: `${query}, Buenos Aires, Argentina`,
        countrycodes: "ar",
        limit: "1",
        // Preferencia (no filtro estricto) hacia Zona Norte / CABA, la zona
        // de cobertura real, para no confundir calles homónimas de otros partidos.
        viewbox: "-58.75,-34.40,-58.35,-34.65",
        bounded: "0",
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (requestId !== geocodeRequestId) return; // ya hay una búsqueda más nueva en curso
      if (!res.ok) throw new Error("geocode request failed");

      const results = await res.json();
      if (requestId !== geocodeRequestId) return;

      if (results.length) {
        const r = results[0];
        lastGeocode = { lat: r.lat, lon: r.lon, displayName: r.display_name };
        const mapUrl = `https://www.google.com/maps?q=${r.lat},${r.lon}`;
        showAddressStatus(
          "found",
          `✓ Encontramos: ${escapeHtml(r.display_name)} · <a href="${mapUrl}" target="_blank" rel="noreferrer">Ver en mapa</a>`
        );
      } else {
        lastGeocode = null;
        showAddressStatus(
          "notfound",
          "⚠ No pudimos encontrar esta dirección en el mapa. Revisá calle, altura y localidad — igual podés enviarla, la confirmamos por WhatsApp."
        );
      }
    } catch (err) {
      if (requestId !== geocodeRequestId) return;
      lastGeocode = null;
      hideAddressStatus();
    }
  }

  function addressHasNumber(value) {
    return /\d/.test(value);
  }

  function scheduleAddressCheck() {
    clearTimeout(geocodeTimer);
    const query = addressInput.value.trim();
    lastGeocode = null;

    if (!query) {
      hideAddressStatus();
      return;
    }

    if (!addressHasNumber(query)) {
      showAddressStatus(
        "missingnumber",
        "⚠ Falta el número de la calle — agregalo para poder enviar (ej: Ingeniero Marconi 1643)."
      );
      return;
    }

    if (query.length < 6) {
      hideAddressStatus();
      return;
    }

    geocodeRequestId += 1;
    const requestId = geocodeRequestId;
    showAddressStatus("loading", "Buscando la dirección…");
    geocodeTimer = setTimeout(() => geocodeAddress(query, requestId), 900);
  }

  // ---- Calendar (Fecha del evento) ----
  const dateDisplay = document.getElementById("date-display");
  const dateDisplayText = document.getElementById("date-display-text");
  const calendarPopover = document.getElementById("calendar-popover");
  const calMonthLabel = document.getElementById("cal-month-label");
  const calDaysEl = document.getElementById("cal-days");
  const calPrev = document.getElementById("cal-prev");
  const calNext = document.getElementById("cal-next");

  function setupCalendar() {
    if (!dateDisplay || !calendarPopover) return;

    const MONTH_LABELS = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 2); // mínimo 48hs de anticipación

    let viewYear = minDate.getFullYear();
    let viewMonth = minDate.getMonth();
    let selectedDate = null;

    function toISO(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    function formatDisplay(date) {
      return `${WEEKDAY_LABELS[date.getDay()]} ${date.getDate()} de ${MONTH_LABELS[date.getMonth()]} de ${date.getFullYear()}`;
    }

    function renderCalendar() {
      const label = MONTH_LABELS[viewMonth];
      calMonthLabel.textContent = `${label.charAt(0).toUpperCase()}${label.slice(1)} ${viewYear}`;

      const firstOfMonth = new Date(viewYear, viewMonth, 1);
      const startOffset = firstOfMonth.getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      calDaysEl.innerHTML = "";

      for (let i = 0; i < startOffset; i++) {
        const filler = document.createElement("span");
        filler.className = "calendar-day calendar-day--empty";
        calDaysEl.appendChild(filler);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(viewYear, viewMonth, day);
        const iso = toISO(date);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-day";
        btn.textContent = String(day);

        if (date < minDate) {
          btn.disabled = true;
          btn.classList.add("calendar-day--disabled");
        } else {
          btn.addEventListener("click", () => {
            selectedDate = date;
            dateInput.value = iso;
            dateDisplayText.textContent = formatDisplay(date);
            dateDisplayText.classList.add("is-set");
            closeCalendar();
            dateDisplay.focus();
            updateSummary();
            showToast(`${EMOJI.calendar} Fecha: ${formatDisplay(date)}`);
          });
        }

        if (selectedDate && toISO(selectedDate) === iso) {
          btn.classList.add("calendar-day--selected");
        }
        if (toISO(today) === iso) {
          btn.classList.add("calendar-day--today");
        }

        calDaysEl.appendChild(btn);
      }

      calPrev.disabled = viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth();
    }

    function onOutsideClick(event) {
      if (!calendarPopover.contains(event.target) && event.target !== dateDisplay) {
        closeCalendar();
      }
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        closeCalendar();
        dateDisplay.focus();
      }
    }

    function openCalendar() {
      renderCalendar();
      calendarPopover.hidden = false;
      dateDisplay.setAttribute("aria-expanded", "true");
      document.addEventListener("click", onOutsideClick);
      document.addEventListener("keydown", onKeydown);
    }

    function closeCalendar() {
      calendarPopover.hidden = true;
      dateDisplay.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", onOutsideClick);
      document.removeEventListener("keydown", onKeydown);
    }

    dateDisplay.addEventListener("click", (event) => {
      event.stopPropagation();
      if (calendarPopover.hidden) openCalendar();
      else closeCalendar();
    });

    calPrev.addEventListener("click", () => {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      renderCalendar();
    });

    calNext.addEventListener("click", () => {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      renderCalendar();
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  // ---- Toast feedback: confirms what just changed in the order ----
  const MAX_TOASTS = 3;
  const TOAST_LIFETIME_MS = 2400;

  function showToast(message) {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);

    while (toastContainer.children.length > MAX_TOASTS) {
      toastContainer.firstElementChild.remove();
    }

    requestAnimationFrame(() => toast.classList.add("toast--visible"));

    setTimeout(() => {
      toast.classList.remove("toast--visible");
      toast.classList.add("toast--leaving");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, TOAST_LIFETIME_MS);
  }

  // Brief scale "pop" on the chip that was just toggled, for tactile feedback.
  function popChip(input) {
    const chip = input.closest(".choice-chip");
    if (!chip) return;
    chip.classList.remove("is-popping");
    // Force reflow so the animation can restart if toggled again quickly.
    void chip.offsetWidth;
    chip.classList.add("is-popping");
  }

  function pulseBudget() {
    [budgetAmountEl, mobileBudgetAmountEl].forEach((el) => {
      if (!el) return;
      el.classList.remove("is-pulsing");
      void el.offsetWidth;
      el.classList.add("is-pulsing");
    });
  }

  let hasRenderedOnce = false;
  let lastBudgetText = null;

  function updateSummary() {
    updateMeatAvailability();
    updateMeatPriceTags();
    updateBreadHint();

    const people = getPeopleSelection();
    const meats = selectedValues(meatChecks);
    const breads = selectedValues(breadChecks);
    const sauces = selectedValues(sauceChecks);
    const modalidad = form.querySelector('input[name="modalidad"]:checked');
    const panes = people ? panesFor(people.people) : null;

    sauceCountEl.textContent = String(sauces.length);
    sauceRecommendEl.textContent = people
      ? `Recomendado para ${people.label}: alrededor de ${people.sauces} salsas.`
      : "Elegí primero la cantidad de personas para ver una recomendación.";

    const budget = calculateBudget();
    budgetAmountEl.textContent = budget.amountText;
    budgetNoteEl.textContent = budget.note;
    if (mobileBudgetAmountEl) mobileBudgetAmountEl.textContent = budget.amountText;

    if (hasRenderedOnce && budget.amountText !== lastBudgetText) {
      pulseBudget();
    }
    lastBudgetText = budget.amountText;

    const veggie = getVeggieSelection();

    const breadLabel = breads.length
      ? `${breads.join(", ")}${panes != null ? ` (${panes} panes en total)` : ""}`
      : null;

    const addressValueForSummary = addressInput.value.trim();
    const addressFloorValue = addressFloorInput.value.trim();
    const addressLabel = addressValueForSummary
      ? `${addressValueForSummary}${addressFloorValue ? `, ${addressFloorValue}` : ""}`
      : null;

    const items = [
      ["Personas", people ? people.label : null],
      ["Carne", meats.length ? meats.join(", ") : null],
      ["Pan", breadLabel],
      ["Salsas", sauces.length ? `${sauces.length} — ${sauces.join(", ")}` : null],
      ["Vegetariano", veggie ? `${veggie.nombre} — ${veggie.portions} ${veggie.portions > 1 ? "porciones" : "porción"} (${veggie.qty} personas)` : null],
      ["Modalidad", modalidad ? modalidad.value : null],
      ["Dirección", modalidad && modalidad.value === "Envío a domicilio" ? addressLabel : null],
      ["Fecha", dateInput.value ? formatDate(dateInput.value) : null],
    ].filter(([, value]) => value);

    summaryEl.innerHTML = items.length
      ? items
          .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`)
          .join("")
      : '<li class="summary-empty">Todavía no elegiste nada. Empezá por la cantidad de personas.</li>';

    const needsAddress = Boolean(modalidad) && modalidad.value === "Envío a domicilio";
    const addressValue = addressInput.value.trim();
    const hasAddress = addressValue.length > 0 && addressHasNumber(addressValue);
    const basicsReady = Boolean(people) && meats.length > 0 && Boolean(modalidad);
    const ready = basicsReady && (!needsAddress || hasAddress);

    submitBtn.disabled = !ready;
    validationMsg.hidden = ready;

    if (basicsReady && needsAddress && !hasAddress) {
      validationMsg.textContent = addressValue
        ? "Falta el número de la calle en la dirección para poder enviar."
        : "Falta la dirección de envío para poder enviar.";
    } else {
      validationMsg.textContent = "Elegí cantidad de personas, una carne y retiro/envío para poder enviar.";
    }

    hasRenderedOnce = true;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  peopleRadios.forEach((r) =>
    r.addEventListener("change", () => {
      updateOtherVisibility();
      updateSummary();
      if (r.value !== "other") showToast(`${EMOJI.people} ${r.value} personas seleccionadas`);
    })
  );
  otherInput.addEventListener("input", updateSummary);
  otherInput.addEventListener("change", () => {
    const v = parseInt(otherInput.value, 10);
    if (Number.isFinite(v) && v > 0) showToast(`${EMOJI.people} ${v} personas seleccionadas`);
  });
  meatChecks.forEach((c) =>
    c.addEventListener("change", () => {
      updateSummary();
      popChip(c);
      showToast(c.checked ? `${EMOJI.meat} ${c.value} agregada` : `${EMOJI.remove} ${c.value} quitada`);
    })
  );
  breadChecks.forEach((c) =>
    c.addEventListener("change", () => {
      updateSummary();
      popChip(c);
      showToast(c.checked ? `${EMOJI.bread} ${c.value} agregado` : `${EMOJI.remove} ${c.value} quitado`);
    })
  );
  sauceChecks.forEach((c) =>
    c.addEventListener("change", () => {
      updateSummary();
      popChip(c);
      showToast(c.checked ? `${EMOJI.spoon} ${c.value} agregada` : `${EMOJI.remove} ${c.value} quitada`);
    })
  );
  modalidadRadios.forEach((r) =>
    r.addEventListener("change", () => {
      updateAddressVisibility();
      updateSummary();
      showToast(`${EMOJI.package} ${r.value}`);
    })
  );
  addressInput.addEventListener("input", () => {
    updateSummary();
    scheduleAddressCheck();
  });
  addressFloorInput.addEventListener("input", updateSummary);

  if (veggieToggleInput) {
    veggieToggleInput.addEventListener("change", () => {
      veggieQtyWrap.hidden = !veggieToggleInput.checked;
      if (veggieToggleInput.checked) veggieQtyInput.focus();
      updateVeggiePriceText();
      updateSummary();
      showToast(
        veggieToggleInput.checked
          ? `${EMOJI.mushroom} Opción vegetariana agregada`
          : `${EMOJI.remove} Opción vegetariana quitada`
      );
    });
    veggieQtyInput.addEventListener("input", () => {
      updateVeggiePriceText();
      updateSummary();
    });
    updateVeggiePriceText();
  }

  updateOtherVisibility();
  updateAddressVisibility();
  setupCalendar();
  updateSummary();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const people = getPeopleSelection();
    const meats = selectedValues(meatChecks);
    const modalidad = form.querySelector('input[name="modalidad"]:checked');
    const needsAddress = Boolean(modalidad) && modalidad.value === "Envío a domicilio";
    const addressValue = addressInput.value.trim();
    const hasAddress = addressValue.length > 0 && addressHasNumber(addressValue);

    if (!people || !meats.length || !modalidad || (needsAddress && !hasAddress)) {
      updateSummary();
      validationMsg.hidden = false;
      validationMsg.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const breads = selectedValues(breadChecks);
    const sauces = selectedValues(sauceChecks);
    const name = nameInput.value.trim();
    const date = formatDate(dateInput.value);
    const address = addressInput.value.trim();
    const addressFloor = addressFloorInput.value.trim();
    const comments = commentsInput.value.trim();
    const budget = calculateBudget();
    const veggie = getVeggieSelection();
    const panes = panesFor(people.people);

    const lines = [`Hola Cochon & Co! ${EMOJI.wave} Quiero armar un pedido:`, ""];
    if (name) lines.push(`${EMOJI.raise} Nombre: ${name}`);
    lines.push(`${EMOJI.people} Personas: ${people.label}`);
    lines.push(`${EMOJI.meat} Carne: ${meats.join(", ")}`);
    if (breads.length) {
      const panesNote = panes != null ? ` — ${panes} panes en total` : "";
      const repartoNote = breads.length > 1 ? " (partes iguales salvo que aclare otra proporción)" : "";
      lines.push(`${EMOJI.bread} Pan: ${breads.join(", ")}${panesNote}${repartoNote}`);
    }
    if (sauces.length) lines.push(`${EMOJI.spoon} Salsas (${sauces.length}): ${sauces.join(", ")}`);
    if (veggie) {
      const acompañamiento = veggie.acompañamiento ? ` (${veggie.acompañamiento})` : "";
      lines.push(
        `${EMOJI.mushroom} Vegetariano: ${veggie.nombre} — ${veggie.portions} ${veggie.portions > 1 ? "porciones" : "porción"} para ${veggie.qty} personas${acompañamiento}`
      );
    }
    if (budget.amountText && budget.amountText !== "—") lines.push(`${EMOJI.money} Presupuesto estimado: ${budget.amountText}`);
    if (modalidad) lines.push(`${EMOJI.package} Modalidad: ${modalidad.value}`);
    if (address) {
      const floorNote = addressFloor ? `, ${addressFloor}` : "";
      const mapsLink = lastGeocode ? ` (mapa: https://www.google.com/maps?q=${lastGeocode.lat},${lastGeocode.lon})` : "";
      lines.push(`${EMOJI.pin} Dirección: ${address}${floorNote}${mapsLink}`);
    }
    if (date) lines.push(`${EMOJI.calendar} Fecha del evento: ${date}`);
    if (comments) lines.push(`${EMOJI.memo} Comentarios: ${comments}`);
    lines.push("", "¿Me ayudan a confirmar disponibilidad?");

    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener");
  });
});
