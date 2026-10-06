/* ============================================================
   Panel de precios y reseñas (admin.html)
   ------------------------------------------------------------
   Edita precios.json y resenas.json directamente en el repo vía la API de
   GitHub. La "clave de acceso" es un token de GitHub con
   permiso de escritura SOLO sobre este repo: sin ella se puede
   mirar el panel pero no guardar. Cada guardado es un commit,
   así que el historial es el de git.
   ============================================================ */

(function () {
  const $ = (id) => document.getElementById(id);
  const views = ["view-loading", "view-login", "view-editor"];
  function show(id) {
    views.forEach((v) => ($(v).hidden = v !== id));
  }

  const REPO = "cochoncompany/cochoncompany.github.io";
  const BRANCH = "gh-pages";
  const FILE = "precios.json";
  const RESENAS_FILE = "resenas.json";
  const STORAGE_KEY = "cochon-precios-acceso";

  let token = "";
  let editorName = "";
  let fileSha = null; // versión de precios.json sobre la que estamos editando

  async function gh(path, opts = {}) {
    const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
      ...opts,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  function decodeBase64Utf8(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  function encodeBase64Utf8(str) {
    let bin = "";
    new TextEncoder().encode(str).forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }

  async function fetchFile(ref, file = FILE) {
    const data = await gh(`/contents/${file}?ref=${encodeURIComponent(ref)}`);
    return { sha: data.sha, datos: JSON.parse(decodeBase64Utf8(data.content)) };
  }

  function readStored() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
    } catch (e) {
      return null;
    }
  }
  function writeStored(value) {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* sin storage: hay que loguearse cada vez */
    }
  }

  // Estructura de referencia: define qué filas y campos existen.
  const LOCAL = window.PRECIOS_COCHON;
  const merge = window.mergePreciosCochon;
  const BRACKETS = Object.keys(LOCAL.porPersonas)
    .map(Number)
    .sort((a, b) => a - b);
  const SMALL_ONLY = new Set(LOCAL.cantidadesGrupoChico);

  const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

  // ---------- Campos ----------
  // kind: "money" (pesos), "int" (cantidad), "text"
  const fields = [];
  let baseline = null; // precios guardados (merge de LOCAL + base)

  function getAt(obj, path) {
    return path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setAt(obj, path, value) {
    let o = obj;
    path.slice(0, -1).forEach((k) => {
      if (o[k] == null || typeof o[k] !== "object") o[k] = {};
      o = o[k];
    });
    o[path[path.length - 1]] = value;
  }

  function formatValue(kind, v) {
    if (v == null) return "";
    if (kind === "money") return moneyFmt.format(v);
    return String(v);
  }

  // Devuelve { ok, value }. Vacío = null ("consultanos").
  function parseValue(kind, raw) {
    const s = raw.trim();
    if (kind === "text") return { ok: true, value: s };
    if (s === "") return { ok: true, value: null };
    const digits = s.replace(/[$\s.]/g, "");
    if (!/^\d+$/.test(digits)) return { ok: false };
    return { ok: true, value: Number(digits) };
  }

  function makeInput(path, kind, label) {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = kind === "text" ? "text" : "numeric";
    input.autocomplete = "off";
    input.setAttribute("aria-label", label);
    if (kind === "money") input.placeholder = "Consultanos";
    const was = document.createElement("span");
    was.className = "adm-was";
    const field = { path, kind, input, was };
    fields.push(field);
    input.addEventListener("input", () => refreshField(field));
    input.addEventListener("blur", () => {
      const p = parseValue(kind, input.value);
      if (p.ok && kind !== "text") input.value = formatValue(kind, p.value);
    });
    return field;
  }

  function cell(field) {
    const td = document.createElement("td");
    td.append(field.input, field.was);
    return td;
  }

  function labeled(field, text) {
    const label = document.createElement("label");
    label.append(text, field.input, field.was);
    return label;
  }

  function buildForm() {
    const tbody = $("brackets-body");
    BRACKETS.forEach((n) => {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = n;
      tr.append(th);
      tr.append(cell(makeInput(["porPersonas", String(n), "cerdo"], "money", `Cerdo, ${n} personas`)));
      tr.append(cell(makeInput(["porPersonas", String(n), "ternera"], "money", `Ternera, ${n} personas`)));
      if (SMALL_ONLY.has(n)) {
        tr.append(cell(makeInput(["porPersonas", String(n), "bondiola"], "money", `Bondiola, ${n} personas`)));
      } else {
        const td = document.createElement("td");
        td.className = "adm__muted";
        td.textContent = "—";
        td.title = "La bondiola solo se ofrece para grupos chicos";
        tr.append(td);
      }
      tr.append(cell(makeInput(["porPersonas", String(n), "panes"], "int", `Panes, ${n} personas`)));
      tr.append(cell(makeInput(["porPersonas", String(n), "salsasIncluidas"], "int", `Salsas incluidas, ${n} personas`)));
      tbody.append(tr);
    });

    const solo = $("solomillo-fields");
    Object.keys(LOCAL.solomillo)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((n) => solo.append(labeled(makeInput(["solomillo", String(n)], "money", `Solomillo, ${n} personas`), `${n} personas`)));

    $("salsa-fields").append(labeled(makeInput(["precioSalsaExtra"], "money", "Precio por salsa extra"), "Precio por salsa extra"));

    const veg = $("veggie-fields");
    veg.append(labeled(makeInput(["vegetariano", "precioPorPorcion"], "money", "Precio por porción"), "Precio por porción"));
    veg.append(labeled(makeInput(["vegetariano", "personasMinPorPorcion"], "int", "Rinde desde (personas)"), "Rinde desde (personas)"));
    veg.append(labeled(makeInput(["vegetariano", "personasMaxPorPorcion"], "int", "Rinde hasta (personas)"), "Rinde hasta (personas)"));
    veg.append(labeled(makeInput(["vegetariano", "panesPorPorcion"], "text", "Panes por porción"), "Panes por porción"));
  }

  function fillForm(precios) {
    fields.forEach((f) => {
      f.input.value = formatValue(f.kind, getAt(precios, f.path));
      refreshField(f);
    });
  }

  function refreshField(f) {
    const p = parseValue(f.kind, f.input.value);
    const original = baseline ? getAt(baseline, f.path) : undefined;
    const changed = p.ok && (p.value ?? null) !== (original ?? null);
    f.input.classList.toggle("is-invalid", !p.ok);
    f.input.classList.toggle("is-changed", changed);
    f.was.textContent = changed || !p.ok ? `antes: ${original == null ? "vacío" : formatValue(f.kind, original)}` : "";
    updateBar();
  }

  function changedFields() {
    return fields.filter((f) => f.input.classList.contains("is-changed"));
  }
  function invalidFields() {
    return fields.filter((f) => f.input.classList.contains("is-invalid"));
  }

  function setMsg(el, text, type) {
    el.textContent = text;
    el.classList.toggle("adm__msg--error", type === "error");
    el.classList.toggle("adm__msg--ok", type === "ok");
  }

  function updateBar(okText) {
    const changed = changedFields().length;
    const invalid = invalidFields().length;
    $("save-btn").disabled = changed === 0 || invalid > 0;
    $("discard-btn").disabled = changed === 0 && invalid === 0;
    if (invalid) setMsg($("save-msg"), `Revisá ${invalid === 1 ? "1 casillero" : `${invalid} casilleros`}: solo números, sin comas.`, "error");
    else if (changed) setMsg($("save-msg"), `${changed === 1 ? "1 cambio" : `${changed} cambios`} sin guardar`);
    else setMsg($("save-msg"), okText || "Sin cambios", okText ? "ok" : null);
  }

  // Solo lo editable: la estructura y los textos fijos quedan en precios.js.
  function snapshotFromForm() {
    const datos = {
      porPersonas: JSON.parse(JSON.stringify(baseline.porPersonas)),
      solomillo: { ...baseline.solomillo },
      precioSalsaExtra: baseline.precioSalsaExtra,
      vegetariano: {
        precioPorPorcion: baseline.vegetariano.precioPorPorcion,
        personasMinPorPorcion: baseline.vegetariano.personasMinPorPorcion,
        personasMaxPorPorcion: baseline.vegetariano.personasMaxPorPorcion,
        panesPorPorcion: baseline.vegetariano.panesPorPorcion,
      },
    };
    fields.forEach((f) => setAt(datos, f.path, parseValue(f.kind, f.input.value).value));
    return datos;
  }

  // Avisos antes de publicar: precios sospechosamente bajos o saltos grandes.
  function warningsFor(datos) {
    const warnings = [];
    changedFields().forEach((f) => {
      if (f.kind !== "money") return;
      const nuevo = getAt(datos, f.path);
      const antes = getAt(baseline, f.path);
      const label = f.input.getAttribute("aria-label");
      if (nuevo != null && nuevo < 1000) warnings.push(`${label}: $${formatValue("money", nuevo)} (¿faltan ceros?)`);
      else if (nuevo != null && antes) {
        const ratio = nuevo / antes;
        if (ratio > 1.8 || ratio < 0.55) warnings.push(`${label}: de $${formatValue("money", antes)} a $${formatValue("money", nuevo)}`);
      }
    });
    const v = datos.vegetariano;
    if (v.personasMinPorPorcion != null && v.personasMaxPorPorcion != null && v.personasMinPorPorcion > v.personasMaxPorPorcion) {
      warnings.push("Vegetariano: “rinde desde” es mayor que “rinde hasta”");
    }
    return warnings;
  }

  // ---------- Datos (GitHub) ----------
  async function loadPrices() {
    const file = await fetchFile(BRANCH);
    fileSha = file.sha;
    baseline = merge(LOCAL, file.datos);
    fillForm(baseline);
  }

  function setLastUpdate(commit) {
    $("last-update").textContent = commit
      ? `Última actualización: ${dateFmt.format(new Date(commit.commit.author.date))} · ${commit.commit.message.split("\n")[0]}`
      : "";
  }

  // Cada commit que tocó precios.json es una versión. El primero es la
  // vigente; los demás se pueden volver a cargar.
  async function loadHistory() {
    const list = $("history-list");
    let commits;
    try {
      commits = await gh(`/commits?path=${FILE}&sha=${BRANCH}&per_page=16`);
    } catch (err) {
      commits = null;
    }
    setLastUpdate(commits && commits[0]);
    list.replaceChildren();
    const previous = commits ? commits.slice(1) : [];
    if (!previous.length) {
      const li = document.createElement("li");
      li.className = "adm__muted";
      li.textContent = commits ? "Todavía no hay versiones anteriores." : "No se pudo cargar el historial.";
      list.append(li);
      return;
    }
    previous.forEach((c) => {
      const li = document.createElement("li");
      const text = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = dateFmt.format(new Date(c.commit.author.date));
      const msg = document.createElement("span");
      msg.className = "adm__muted";
      msg.textContent = ` · ${c.commit.message.split("\n")[0]}`;
      text.append(strong, msg);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "adm-btn";
      btn.textContent = "Cargar";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          const file = await fetchFile(c.sha);
          fillForm(merge(LOCAL, file.datos));
          window.scrollTo({ top: 0, behavior: "smooth" });
          if (!changedFields().length) updateBar("Esa versión es igual a la actual");
        } catch (err) {
          console.error(err);
          setMsg($("save-msg"), "No se pudo cargar esa versión.", "error");
        }
        btn.disabled = false;
      });
      li.append(text, btn);
      list.append(li);
    });
  }

  async function save() {
    const datos = snapshotFromForm();
    const warnings = warningsFor(datos);
    if (warnings.length && !window.confirm(`Revisá antes de publicar:\n\n• ${warnings.join("\n• ")}\n\n¿Guardar igual?`)) return;

    const btn = $("save-btn");
    btn.disabled = true;
    setMsg($("save-msg"), "Guardando…");
    const n = changedFields().length;
    try {
      const res = await gh(`/contents/${FILE}`, {
        method: "PUT",
        body: JSON.stringify({
          message: `precios: ${n} ${n === 1 ? "cambio" : "cambios"} desde el panel${editorName ? ` (${editorName})` : ""}`,
          content: encodeBase64Utf8(JSON.stringify(datos, null, 2) + "\n"),
          sha: fileSha,
          branch: BRANCH,
        }),
      });
      fileSha = res.content.sha;
    } catch (err) {
      console.error(err);
      const text =
        err.status === 409 || err.status === 422
          ? "Alguien cambió los precios mientras editabas. Recargá la página y volvé a hacer tus cambios."
          : err.status === 401 || err.status === 403 || err.status === 404
            ? "Tu clave de acceso no tiene permiso para guardar (o venció). Salí y entrá con una nueva."
            : "No se pudo guardar. Revisá la conexión y probá de nuevo.";
      setMsg($("save-msg"), text, "error");
      btn.disabled = false;
      return;
    }
    baseline = merge(LOCAL, datos);
    fillForm(baseline);
    updateBar("Guardado. En 1–2 minutos se ve en la web.");
    loadHistory();
  }

  // ---------- Reseñas ----------
  // Cada alta, edición o baja se publica en el momento (un commit por
  // acción). Si alguien guardó otra reseña en el medio, se vuelve a
  // leer resenas.json y se aplica la misma acción sobre lo nuevo.
  const R = window.ResenasCochon;
  const POR_PAGINA = 5;
  let resenas = [];
  let resenasSha = null;
  let editandoId = null;
  let pagina = 1;
  let busqueda = "";
  let ocupado = false;

  const fechaCortaFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" });
  const normalizar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  function hoyIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function formatFecha(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-").map(Number);
    return fechaCortaFmt.format(new Date(y, m - 1, d));
  }
  function nuevoId(nombre) {
    const slug = normalizar(nombre).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    return `${slug || "resena"}-${Date.now().toString(36)}`;
  }

  // Envuelve en <mark> lo que coincide con la búsqueda (ignorando tildes).
  function resaltar(texto, q) {
    const frag = document.createDocumentFragment();
    if (!q) {
      frag.append(texto);
      return frag;
    }
    let norm = "";
    const origen = []; // posición en `norm` → posición en `texto`
    for (let i = 0; i < texto.length; i++) {
      const n = normalizar(texto[i]);
      norm += n;
      for (let j = 0; j < n.length; j++) origen.push(i);
    }
    let desde = 0;
    let at = norm.indexOf(q);
    while (at !== -1) {
      const ini = origen[at];
      const fin = origen[at + q.length - 1] + 1;
      frag.append(texto.slice(desde, ini));
      const mark = document.createElement("mark");
      mark.textContent = texto.slice(ini, fin);
      frag.append(mark);
      desde = fin;
      at = norm.indexOf(q, at + q.length);
    }
    frag.append(texto.slice(desde));
    return frag;
  }

  // ----- Formulario -----
  const starLabels = [...document.querySelectorAll("#resena-estrellas label")];
  function estrellasElegidas() {
    const checked = document.querySelector('#resena-estrellas input:checked');
    return checked ? Number(checked.value) : 5;
  }
  function pintarEstrellas(n) {
    starLabels.forEach((l, i) => l.classList.toggle("is-on", i < n));
  }
  function setEstrellas(n) {
    $(`est-${n}`).checked = true;
    pintarEstrellas(n);
    $("estrellas-valor").textContent = `${n} de 5`;
  }

  function datosDelForm() {
    return {
      nombre: $("resena-nombre").value.trim().replace(/\s+/g, " "),
      estrellas: estrellasElegidas(),
      texto: $("resena-texto").value.trim(),
      fecha: $("resena-fecha").value,
    };
  }

  function formSucio() {
    const d = datosDelForm();
    if (editandoId) {
      const r = resenas.find((x) => x.id === editandoId);
      return !!r && (r.nombre !== d.nombre || r.estrellas !== d.estrellas || r.texto !== d.texto || r.fecha !== d.fecha);
    }
    return !!(d.nombre || d.texto);
  }

  function resetForm() {
    editandoId = null;
    $("resena-form").reset();
    $("resena-fecha").value = hoyIso();
    setEstrellas(5);
    $("resena-form").classList.remove("is-editing");
    $("resena-form-title").textContent = "Sumar reseña";
    $("resena-submit").textContent = "Publicar reseña";
    $("resena-cancel").hidden = true;
    $("resena-nombre").classList.remove("is-invalid");
    renderTabla();
  }

  function editar(r) {
    if (editandoId !== r.id && formSucio() && !window.confirm("Tenés una reseña a medio escribir. ¿Descartarla?")) return;
    editandoId = r.id;
    $("resena-nombre").value = r.nombre;
    $("resena-texto").value = r.texto;
    $("resena-fecha").value = r.fecha;
    setEstrellas(r.estrellas);
    $("resena-form").classList.add("is-editing");
    $("resena-form-title").textContent = `Editar reseña de ${r.nombre}`;
    $("resena-submit").textContent = "Guardar cambios";
    $("resena-cancel").hidden = false;
    setMsg($("resena-msg"), "");
    renderTabla();
    $("resena-form").scrollIntoView({ behavior: "smooth", block: "start" });
    $("resena-nombre").focus({ preventScroll: true });
  }

  // ----- Datos -----
  async function loadResenas() {
    const file = await fetchFile(BRANCH, RESENAS_FILE);
    resenasSha = file.sha;
    resenas = R.normalizarResenas(file.datos) || [];
    renderResenas();
  }

  // `cambio` recibe la lista actual y devuelve la nueva.
  async function publicarResenas(cambio, mensaje) {
    ocupado = true;
    renderTabla();
    $("resena-submit").disabled = true;
    try {
      for (let intento = 0; ; intento++) {
        const nueva = R.normalizarResenas({ resenas: cambio(resenas) });
        try {
          const res = await gh(`/contents/${RESENAS_FILE}`, {
            method: "PUT",
            body: JSON.stringify({
              message: `reseñas: ${mensaje} desde el panel${editorName ? ` (${editorName})` : ""}`,
              content: encodeBase64Utf8(JSON.stringify({ resenas: nueva }, null, 2) + "\n"),
              sha: resenasSha,
              branch: BRANCH,
            }),
          });
          resenasSha = res.content.sha;
          resenas = nueva;
          return null;
        } catch (err) {
          if ((err.status === 409 || err.status === 422) && intento === 0) {
            await loadResenas(); // otra persona guardó en el medio: reintentar sobre lo nuevo
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      console.error(err);
      return err.status === 409 || err.status === 422
        ? "Alguien cambió las reseñas al mismo tiempo. Recargá la página y probá de nuevo."
        : err.status === 401 || err.status === 403 || err.status === 404
          ? "Tu clave de acceso no tiene permiso para guardar (o venció). Salí y entrá con una nueva."
          : "No se pudo guardar. Revisá la conexión y probá de nuevo.";
    } finally {
      ocupado = false;
      $("resena-submit").disabled = false;
      renderResenas();
    }
  }

  async function guardarResena(e) {
    e.preventDefault();
    if (ocupado) return;
    const d = datosDelForm();
    const msg = $("resena-msg");
    $("resena-nombre").classList.toggle("is-invalid", !d.nombre);
    if (!d.nombre) {
      setMsg(msg, "Poné el nombre de quien dejó la reseña.", "error");
      $("resena-nombre").focus();
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) d.fecha = hoyIso();
    if (d.fecha > hoyIso() && !window.confirm("La fecha es en el futuro. ¿Guardar igual?")) return;

    const id = editandoId;
    if (id) {
      if (!formSucio()) {
        resetForm();
        setMsg(msg, "No había cambios.");
        return;
      }
      setMsg(msg, "Guardando…");
      const error = await publicarResenas((lista) => lista.map((r) => (r.id === id ? { ...r, ...d } : r)), `edita "${d.nombre}"`);
      if (error) return setMsg(msg, error, "error");
      resetForm();
      setMsg(msg, "Cambios guardados. En 1–2 minutos se ve en la web.", "ok");
    } else {
      const dup = resenas.find((r) => normalizar(r.nombre) === normalizar(d.nombre));
      if (dup && !window.confirm(`Ya hay una reseña de “${dup.nombre}”. ¿Sumar otra igual?`)) return;
      setMsg(msg, "Publicando…");
      const nueva = { id: nuevoId(d.nombre), ...d };
      const error = await publicarResenas((lista) => [nueva, ...lista], `suma "${d.nombre}"`);
      if (error) return setMsg(msg, error, "error");
      resetForm();
      busqueda = "";
      $("resenas-buscar").value = "";
      pagina = Math.floor(resenas.findIndex((r) => r.id === nueva.id) / POR_PAGINA) + 1;
      renderTabla();
      setMsg(msg, "Reseña publicada. En 1–2 minutos se ve en la web.", "ok");
    }
  }

  async function eliminar(r) {
    if (ocupado) return;
    if (!window.confirm(`¿Eliminar la reseña de ${r.nombre}?\n\nSe saca de la web y baja el total de reseñas.`)) return;
    const msg = $("resena-msg");
    setMsg(msg, "Eliminando…");
    const error = await publicarResenas((lista) => lista.filter((x) => x.id !== r.id), `elimina "${r.nombre}"`);
    if (error) return setMsg(msg, error, "error");
    if (editandoId === r.id) resetForm();
    setMsg(msg, `Se eliminó la reseña de ${r.nombre}.`, "ok");
  }

  // ----- Vista -----
  function renderResenas() {
    const { total, promedioTexto } = R.resumenResenas(resenas);
    $("resenas-count").textContent = total ? String(total) : "";
    $("resenas-summary").textContent = total
      ? `${total} ${total === 1 ? "reseña" : "reseñas"} · promedio ${promedioTexto} ★ · Así se muestra en la web (total, promedio y tarjetas).`
      : "Todavía no hay reseñas cargadas.";
    renderTabla();
  }

  function filtradas() {
    const q = normalizar(busqueda.trim());
    if (!q) return resenas;
    return resenas.filter((r) => normalizar(r.nombre).includes(q) || normalizar(r.texto).includes(q));
  }

  function renderTabla() {
    const q = normalizar(busqueda.trim());
    const lista = filtradas();
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    pagina = Math.min(Math.max(1, pagina), paginas);
    const desde = (pagina - 1) * POR_PAGINA;
    const visibles = lista.slice(desde, desde + POR_PAGINA);

    const tbody = $("resenas-body");
    tbody.replaceChildren();
    if (!visibles.length) {
      const tr = document.createElement("tr");
      tr.className = "adm-empty";
      const td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = q ? `No hay reseñas que coincidan con “${busqueda.trim()}”.` : "Todavía no hay reseñas.";
      tr.append(td);
      tbody.append(tr);
    }
    visibles.forEach((r) => {
      const tr = document.createElement("tr");
      tr.classList.toggle("is-editing", r.id === editandoId);

      const nombre = document.createElement("td");
      nombre.className = "adm-r-nombre";
      nombre.append(resaltar(r.nombre, q));

      const stars = document.createElement("td");
      stars.className = "adm-r-stars";
      stars.textContent = R.estrellasTexto(r.estrellas);
      stars.setAttribute("aria-label", `${r.estrellas} de 5`);
      stars.title = `${r.estrellas} de 5`;

      const texto = document.createElement("td");
      const div = document.createElement("div");
      div.className = "adm-r-texto";
      if (r.texto) {
        div.append(resaltar(r.texto, q));
        div.title = r.texto;
      } else {
        div.textContent = "(solo estrellas, sin texto)";
        div.style.fontStyle = "italic";
      }
      texto.append(div);

      const fecha = document.createElement("td");
      fecha.className = "adm-r-fecha";
      fecha.textContent = formatFecha(r.fecha);
      fecha.title = R.fechaRelativa(r.fecha);

      const acciones = document.createElement("td");
      acciones.className = "adm-r-acciones";
      const btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.className = "adm-btn adm-btn--sm";
      btnEditar.textContent = "Editar";
      btnEditar.disabled = ocupado;
      btnEditar.setAttribute("aria-label", `Editar reseña de ${r.nombre}`);
      btnEditar.addEventListener("click", () => editar(r));
      const btnBorrar = document.createElement("button");
      btnBorrar.type = "button";
      btnBorrar.className = "adm-btn adm-btn--sm adm-btn--danger";
      btnBorrar.textContent = "Eliminar";
      btnBorrar.disabled = ocupado;
      btnBorrar.setAttribute("aria-label", `Eliminar reseña de ${r.nombre}`);
      btnBorrar.addEventListener("click", () => eliminar(r));
      acciones.append(btnEditar, btnBorrar);

      tr.append(nombre, stars, texto, fecha, acciones);
      tbody.append(tr);
    });

    $("pager-info").textContent = lista.length
      ? `Mostrando ${desde + 1}–${desde + visibles.length} de ${lista.length}${q ? ` (filtradas de ${resenas.length})` : ""}`
      : "";
    renderPager(paginas);
  }

  function renderPager(paginas) {
    const cont = $("pager-btns");
    cont.replaceChildren();
    if (paginas <= 1) return;
    const boton = (texto, destino, opts = {}) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "adm-btn";
      b.textContent = texto;
      b.disabled = !!opts.disabled;
      if (opts.label) b.setAttribute("aria-label", opts.label);
      if (destino === pagina && !opts.label) b.setAttribute("aria-current", "page");
      b.addEventListener("click", () => {
        pagina = destino;
        renderTabla();
      });
      cont.append(b);
    };
    boton("‹", pagina - 1, { disabled: pagina === 1, label: "Página anterior" });
    // 1 … 4 5 6 … 10
    let anterior = 0;
    for (let n = 1; n <= paginas; n++) {
      if (n !== 1 && n !== paginas && Math.abs(n - pagina) > 1) continue;
      if (n - anterior > 1) {
        const gap = document.createElement("span");
        gap.className = "adm-pager__gap";
        gap.textContent = "…";
        cont.append(gap);
      }
      boton(String(n), n);
      anterior = n;
    }
    boton("›", pagina + 1, { disabled: pagina === paginas, label: "Página siguiente" });
  }

  // ----- Eventos -----
  $("resena-form").addEventListener("submit", guardarResena);
  $("resena-cancel").addEventListener("click", () => {
    if (formSucio() && !window.confirm("¿Descartar los cambios de esta reseña?")) return;
    resetForm();
    setMsg($("resena-msg"), "");
  });
  $("resena-nombre").addEventListener("input", () => $("resena-nombre").classList.remove("is-invalid"));
  document.querySelectorAll("#resena-estrellas input").forEach((input) =>
    input.addEventListener("change", () => setEstrellas(Number(input.value)))
  );
  starLabels.forEach((label, i) => label.addEventListener("mouseenter", () => pintarEstrellas(i + 1)));
  document.querySelector(".adm-stars__row").addEventListener("mouseleave", () => pintarEstrellas(estrellasElegidas()));
  $("resenas-buscar").addEventListener("input", (e) => {
    busqueda = e.target.value;
    pagina = 1;
    renderTabla();
  });
  resetForm();

  // ---------- Pestañas ----------
  const TABS = { precios: "Precios", resenas: "Reseñas" };
  function setTab(name, focus) {
    Object.keys(TABS).forEach((t) => {
      const activo = t === name;
      $(`tab-${t}`).setAttribute("aria-selected", String(activo));
      $(`tab-${t}`).tabIndex = activo ? 0 : -1;
      $(`panel-${t}`).hidden = !activo;
    });
    $("editor-title").textContent = TABS[name];
    if (focus) $(`tab-${name}`).focus();
    try {
      history.replaceState(null, "", name === "precios" ? location.pathname : `#${name}`);
    } catch (e) {
      /* sin history: no pasa nada */
    }
  }
  Object.keys(TABS).forEach((t) => $(`tab-${t}`).addEventListener("click", () => setTab(t)));
  document.querySelector(".adm-tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const names = Object.keys(TABS);
    const actual = names.findIndex((t) => $(`tab-${t}`).getAttribute("aria-selected") === "true");
    setTab(names[(actual + (e.key === "ArrowRight" ? 1 : names.length - 1)) % names.length], true);
  });
  setTab(location.hash === "#resenas" ? "resenas" : "precios");

  // ---------- Sesión ----------
  let editorReady = false;
  async function enterEditor() {
    $("who").textContent = editorName;
    show("view-loading");
    if (!editorReady) {
      buildForm();
      editorReady = true;
    }
    await loadPrices();
    show("view-editor");
    loadHistory();
    loadResenas().catch((err) => {
      console.error(err);
      $("resenas-summary").textContent = "No se pudieron cargar las reseñas. Recargá la página.";
    });
  }

  async function login(access, remember) {
    token = access.token;
    editorName = access.name || "";
    try {
      await enterEditor();
      if (remember) writeStored(access);
      return null;
    } catch (err) {
      console.error(err);
      token = "";
      show("view-login");
      return err.status === 401 || err.status === 403 || err.status === 404
        ? "Clave de acceso incorrecta o vencida."
        : "No se pudo conectar con GitHub. Probá de nuevo.";
    }
  }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("login-msg");
    setMsg(msg, "Entrando…");
    const error = await login(
      { token: $("login-token").value.trim(), name: $("login-name").value.trim() },
      $("login-remember").checked
    );
    if (error) setMsg($("login-msg"), error, "error");
    else setMsg(msg, "");
  });

  $("logout-btn").addEventListener("click", () => {
    if ((changedFields().length || formSucio()) && !window.confirm("Tenés cambios sin guardar. ¿Salir igual?")) return;
    writeStored(null);
    token = "";
    $("login-token").value = "";
    show("view-login");
  });

  $("save-btn").addEventListener("click", save);
  $("discard-btn").addEventListener("click", () => fillForm(baseline));

  window.addEventListener("beforeunload", (e) => {
    if (changedFields().length || formSucio() || ocupado) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // Arranque: si este dispositivo ya tiene la clave guardada, entrar directo.
  const stored = readStored();
  if (stored && stored.token) {
    $("login-name").value = stored.name || "";
    login(stored, true).then((error) => {
      if (error) {
        writeStored(null);
        setMsg($("login-msg"), error, "error");
      }
    });
  } else {
    show("view-login");
  }
})();
