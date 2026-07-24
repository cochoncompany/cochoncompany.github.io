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

  const SAUCE_TABLE = [
    { max: 10, sauces: 2 },
    { max: 15, sauces: 3 },
    { max: 30, sauces: 4 },
    { max: 50, sauces: 5 },
    { max: 70, sauces: 6 },
    { max: 90, sauces: 7 },
    { max: Infinity, sauces: 8 },
  ];

  function recommendedSauces(people) {
    if (!people) return null;
    const row = SAUCE_TABLE.find((r) => people <= r.max);
    return row.sauces;
  }

  // Returns { label, sauces } for the chosen people bracket, or null if none chosen yet.
  function getPeopleSelection() {
    const checked = form.querySelector('input[name="people"]:checked');
    if (!checked) return null;
    if (checked.value === "other") {
      const v = parseInt(otherInput.value, 10);
      if (!Number.isFinite(v) || v <= 0) return null;
      return { label: `${v} personas`, sauces: recommendedSauces(v) };
    }
    return { label: checked.value, sauces: Number(checked.dataset.sauces) };
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
    const people = getPeopleSelection();
    const meats = selectedValues(meatChecks);
    const breads = selectedValues(breadChecks);
    const sauces = selectedValues(sauceChecks);
    const modalidad = form.querySelector('input[name="modalidad"]:checked');

    sauceCountEl.textContent = String(sauces.length);
    sauceRecommendEl.textContent = people
      ? `Recomendado para ${people.label}: alrededor de ${people.sauces} salsas.`
      : "Elegí primero la cantidad de personas para ver una recomendación.";

    const items = [
      ["Personas", people ? people.label : null],
      ["Carne", meats.length ? meats.join(", ") : null],
      ["Pan", breads.length ? breads.join(", ") : null],
      ["Salsas", sauces.length ? `${sauces.length} — ${sauces.join(", ")}` : null],
      ["Modalidad", modalidad ? modalidad.value : null],
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

  updateOtherVisibility();
  updateAddressVisibility();
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

    const lines = ["Hola Cochon & Co! 👋 Quiero armar un pedido:", ""];
    if (name) lines.push(`🙋 Nombre: ${name}`);
    lines.push(`👥 Personas: ${people.label}`);
    lines.push(`🍖 Carne: ${meats.join(", ")}`);
    if (breads.length) lines.push(`🍞 Pan: ${breads.join(", ")}`);
    if (sauces.length) lines.push(`🥄 Salsas (${sauces.length}): ${sauces.join(", ")}`);
    if (modalidad) lines.push(`📦 Modalidad: ${modalidad.value}`);
    if (address) lines.push(`📍 Dirección: ${address}`);
    if (date) lines.push(`📅 Fecha del evento: ${date}`);
    if (comments) lines.push(`📝 Comentarios: ${comments}`);
    lines.push("", "¿Me ayudan a confirmar disponibilidad?");

    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener");
  });
});
