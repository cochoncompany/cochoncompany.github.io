/* ============================================================
   Panel de precios (admin.html)
   ------------------------------------------------------------
   Edita precios.json directamente en el repo vía la API de
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

  async function fetchFile(ref) {
    const data = await gh(`/contents/${FILE}?ref=${encodeURIComponent(ref)}`);
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
    if (changedFields().length && !window.confirm("Tenés cambios sin guardar. ¿Salir igual?")) return;
    writeStored(null);
    token = "";
    $("login-token").value = "";
    show("view-login");
  });

  $("save-btn").addEventListener("click", save);
  $("discard-btn").addEventListener("click", () => fillForm(baseline));

  window.addEventListener("beforeunload", (e) => {
    if (changedFields().length) {
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
