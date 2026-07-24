document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("pedido-form");
  if (!form) return;

  const WHATSAPP_NUMBER = "5491136441214";

  const peopleRadios = form.querySelectorAll('input[name="people"]');
  const otherWrap = document.getElementById("people-other-wrap");
  const otherInput = document.getElementById("people-other-input");

  const meatChecks = form.querySelectorAll('input[name="carne"]');
  const breadChecks = form.querySelectorAll('input[name="pan"]');
  const sauceChecks = form.querySelectorAll('input[name="salsas"]');
  const modalidadRadios = form.querySelectorAll('input[name="modalidad"]');
  const addressWrap = document.getElementById("address-wrap");
  const addressInput = document.getElementById("address-input");

  const nameInput = document.getElementById("name-input");
  const dateInput = document.getElementById("date-input");
  const commentsInput = document.getElementById("comments-input");

  const sauceCountEl = document.getElementById("sauce-count");
  const sauceRecommendEl = document.getElementById("sauce-recommend");
  const summaryEl = document.getElementById("summary-list");
  const submitBtn = document.getElementById("submit-btn");
  const validationMsg = document.getElementById("validation-msg");
  const meatHintEl = document.getElementById("meat-hint");
  const budgetAmountEl = document.getElementById("budget-amount");
  const budgetNoteEl = document.getElementById("budget-note");

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

  function updateSummary() {
    updateMeatAvailability();
    updateMeatPriceTags();

    const people = getPeopleSelection();
    const meats = selectedValues(meatChecks);
    const breads = selectedValues(breadChecks);
    const sauces = selectedValues(sauceChecks);
    const modalidad = form.querySelector('input[name="modalidad"]:checked');

    sauceCountEl.textContent = String(sauces.length);
    sauceRecommendEl.textContent = people
      ? `Recomendado para ${people.label}: alrededor de ${people.sauces} salsas.`
      : "Elegí primero la cantidad de personas para ver una recomendación.";

    const budget = calculateBudget();
    budgetAmountEl.textContent = budget.amountText;
    budgetNoteEl.textContent = budget.note;

    const veggie = getVeggieSelection();

    const items = [
      ["Personas", people ? people.label : null],
      ["Carne", meats.length ? meats.join(", ") : null],
      ["Pan", breads.length ? breads.join(", ") : null],
      ["Salsas", sauces.length ? `${sauces.length} — ${sauces.join(", ")}` : null],
      ["Vegetariano", veggie ? `${veggie.nombre} — ${veggie.portions} ${veggie.portions > 1 ? "porciones" : "porción"} (${veggie.qty} personas)` : null],
      ["Modalidad", modalidad ? modalidad.value : null],
      ["Fecha", dateInput.value ? formatDate(dateInput.value) : null],
    ].filter(([, value]) => value);

    summaryEl.innerHTML = items.length
      ? items
          .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`)
          .join("")
      : '<li class="summary-empty">Todavía no elegiste nada. Empezá por la cantidad de personas.</li>';

    const ready = Boolean(people) && meats.length > 0;
    submitBtn.disabled = !ready;
    validationMsg.hidden = ready;
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
    })
  );
  otherInput.addEventListener("input", updateSummary);
  meatChecks.forEach((c) => c.addEventListener("change", updateSummary));
  breadChecks.forEach((c) => c.addEventListener("change", updateSummary));
  sauceChecks.forEach((c) => c.addEventListener("change", updateSummary));
  modalidadRadios.forEach((r) =>
    r.addEventListener("change", () => {
      updateAddressVisibility();
      updateSummary();
    })
  );

  if (veggieToggleInput) {
    veggieToggleInput.addEventListener("change", () => {
      veggieQtyWrap.hidden = !veggieToggleInput.checked;
      if (veggieToggleInput.checked) veggieQtyInput.focus();
      updateVeggiePriceText();
      updateSummary();
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
    if (!people || !meats.length) {
      updateSummary();
      validationMsg.hidden = false;
      validationMsg.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const breads = selectedValues(breadChecks);
    const sauces = selectedValues(sauceChecks);
    const modalidad = form.querySelector('input[name="modalidad"]:checked');
    const name = nameInput.value.trim();
    const date = formatDate(dateInput.value);
    const address = addressInput.value.trim();
    const comments = commentsInput.value.trim();
    const budget = calculateBudget();
    const veggie = getVeggieSelection();

    const lines = ["Hola Cochon & Co! 👋 Quiero armar un pedido:", ""];
    if (name) lines.push(`🙋 Nombre: ${name}`);
    lines.push(`👥 Personas: ${people.label}`);
    lines.push(`🍖 Carne: ${meats.join(", ")}`);
    if (breads.length) lines.push(`🍞 Pan: ${breads.join(", ")}`);
    if (sauces.length) lines.push(`🥄 Salsas (${sauces.length}): ${sauces.join(", ")}`);
    if (veggie) {
      const acompañamiento = veggie.acompañamiento ? ` (${veggie.acompañamiento})` : "";
      lines.push(
        `🍄 Vegetariano: ${veggie.nombre} — ${veggie.portions} ${veggie.portions > 1 ? "porciones" : "porción"} para ${veggie.qty} personas${acompañamiento}`
      );
    }
    if (budget.amountText && budget.amountText !== "—") lines.push(`💰 Presupuesto estimado: ${budget.amountText}`);
    if (modalidad) lines.push(`📦 Modalidad: ${modalidad.value}`);
    if (address) lines.push(`📍 Dirección: ${address}`);
    if (date) lines.push(`📅 Fecha del evento: ${date}`);
    if (comments) lines.push(`📝 Comentarios: ${comments}`);
    lines.push("", "¿Me ayudan a confirmar disponibilidad?");

    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener");
  });
});
