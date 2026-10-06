/* ============================================================
   RESEÑAS COCHON & CO.
   ------------------------------------------------------------
   Las reseñas viven en resenas.json, que se edita desde
   /admin.html. Este archivo las carga y actualiza la página:
   tarjetas (#reviewsTrack), total, promedio, estrellas y el
   aggregateRating del JSON-LD. Lo que está escrito en el HTML
   queda como respaldo si resenas.json no carga.

   Elementos que se actualizan solos:
   - [data-resenas="badge"]    → badge del topbar (aria-label + texto)
   - [data-resenas="tag"]      → "★ 5.0 en Google (22 reseñas)"
   - [data-resenas="promedio"] → "5.0"
   - [data-resenas="estrellas"]→ "★★★★★"
   - [data-resenas="total"]    → "sobre 22 reseñas en Google"
   ============================================================ */

(function () {
  // ---------- Utilidades (también las usa admin.js) ----------
  function normalizarResenas(datos) {
    const lista = datos && Array.isArray(datos.resenas) ? datos.resenas : null;
    if (!lista) return null;
    return lista
      .filter((r) => r && typeof r.nombre === "string" && r.nombre.trim())
      .map((r) => ({
        id: String(r.id || ""),
        nombre: r.nombre.trim(),
        estrellas: Math.min(5, Math.max(1, Math.round(Number(r.estrellas) || 5))),
        texto: typeof r.texto === "string" ? r.texto.trim() : "",
        fecha: typeof r.fecha === "string" ? r.fecha : "",
      }))
      .sort((a, b) => (b.fecha > a.fecha ? 1 : b.fecha < a.fecha ? -1 : 0));
  }

  function resumenResenas(lista) {
    const total = lista.length;
    const suma = lista.reduce((acc, r) => acc + r.estrellas, 0);
    const promedio = total ? suma / total : 0;
    return { total, promedio, promedioTexto: promedio.toFixed(1) };
  }

  function estrellasTexto(n) {
    const llenas = Math.round(n);
    return "★".repeat(llenas) + "☆".repeat(5 - llenas);
  }

  // "Hace 3 días", "Hace 2 meses"… como en Google.
  function fechaRelativa(iso, hoy = new Date()) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const fecha = new Date(y, m - 1, d);
    if (Number.isNaN(fecha.getTime())) return "";
    const dias = Math.floor((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - fecha) / 86400000);
    const plural = (n, uno, varios) => `Hace ${n} ${n === 1 ? uno : varios}`;
    if (dias <= 0) return "Hoy";
    if (dias === 1) return "Ayer";
    if (dias < 7) return plural(dias, "día", "días");
    if (dias < 30) return plural(Math.floor(dias / 7), "semana", "semanas");
    const meses = (hoy.getFullYear() - fecha.getFullYear()) * 12 + hoy.getMonth() - fecha.getMonth() - (hoy.getDate() < fecha.getDate() ? 1 : 0);
    if (meses < 12) return plural(Math.max(1, meses), "mes", "meses");
    return plural(Math.floor(meses / 12), "año", "años");
  }

  window.ResenasCochon = { normalizarResenas, resumenResenas, estrellasTexto, fechaRelativa };

  if (window.COCHON_RESENAS_SKIP_FETCH || !window.fetch) return;

  // ---------- Página ----------
  function crearTarjeta(r) {
    const card = document.createElement("article");
    card.className = "review-card";

    const head = document.createElement("div");
    head.className = "review-card__head";
    const avatar = document.createElement("span");
    avatar.className = "review-card__avatar";
    avatar.textContent = r.nombre.charAt(0).toUpperCase();
    const info = document.createElement("div");
    const nombre = document.createElement("strong");
    nombre.textContent = r.nombre;
    const stars = document.createElement("span");
    stars.className = "review-card__stars";
    stars.setAttribute("aria-label", `${r.estrellas} de 5 estrellas`);
    stars.textContent = estrellasTexto(r.estrellas);
    info.append(nombre, stars);
    head.append(avatar, info);
    card.append(head);

    if (r.texto) {
      const p = document.createElement("p");
      p.textContent = `“${r.texto}”`;
      card.append(p);
    }

    const fecha = document.createElement("span");
    fecha.className = "review-card__date";
    fecha.textContent = fechaRelativa(r.fecha);
    card.append(fecha);
    return card;
  }

  function aplicar(lista) {
    const { total, promedio, promedioTexto } = resumenResenas(lista);
    const resenasTxt = `${total} ${total === 1 ? "reseña" : "reseñas"}`;

    const track = document.getElementById("reviewsTrack");
    if (track) {
      if (total) track.replaceChildren(...lista.map(crearTarjeta));
      document.dispatchEvent(new CustomEvent("resenas:render"));
    }
    if (!total) return;

    const set = (sel, fn) => document.querySelectorAll(`[data-resenas="${sel}"]`).forEach(fn);
    set("badge", (el) => {
      el.setAttribute("aria-label", `${promedioTexto} de 5 estrellas, ${resenasTxt} en Google`);
      const txt = el.querySelector(".rating-badge__text");
      if (txt) {
        const em = document.createElement("em");
        em.textContent = `· ${total} en Google`;
        txt.replaceChildren(`${promedioTexto} `, em);
      }
      const st = el.querySelector(".rating-badge__stars");
      if (st) st.textContent = estrellasTexto(promedio);
    });
    set("tag", (el) => (el.textContent = `★ ${promedioTexto} en Google (${resenasTxt})`));
    set("promedio", (el) => (el.textContent = promedioTexto));
    set("estrellas", (el) => (el.textContent = estrellasTexto(promedio)));
    set("total", (el) => (el.textContent = `sobre ${resenasTxt} en Google`));

    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.content = meta.content.replace(/\d\.\d★ en Google \(\d+ reseñas?\)/, `${promedioTexto}★ en Google (${resenasTxt})`);
    }

    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const ld = JSON.parse(s.textContent);
        if (!ld.aggregateRating) return;
        ld.aggregateRating.ratingValue = promedioTexto;
        ld.aggregateRating.reviewCount = String(total);
        s.textContent = JSON.stringify(ld, null, 2);
      } catch (e) {
        /* JSON-LD inválido: se deja como está */
      }
    });
  }

  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl && ctrl.abort(), 4000);

  // ?t= evita la caché de GitHub Pages: un cambio del panel se ve apenas se publica.
  fetch(`resenas.json?t=${Date.now()}`, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((datos) => {
      const lista = normalizarResenas(datos);
      if (!lista) throw new Error("resenas.json sin lista");
      aplicar(lista);
    })
    .catch((err) => console.warn("Reseñas: usando las del HTML.", err))
    .finally(() => clearTimeout(timer));
})();
