/* ============================================================
   PRECIOS COCHON & CO.
   ------------------------------------------------------------
   Los precios VIGENTES están en precios.json, que se edita desde
   /admin.html (el panel guarda el archivo directo en GitHub).
   Los números de este archivo son solo el RESPALDO por si
   precios.json no carga.

   - `null` = "consultanos": el formulario nunca inventa un precio.
   - La estructura (qué cantidades de personas hay, qué carnes,
     nombres) se define acá. Desde el panel solo se editan números,
     así que agregar una cantidad nueva requiere tocar este archivo
     Y los botones de pedido.html.

   Respaldo: tabla "PRECIOS MUNDIAL JUNIO/JULIO 2026"
   ============================================================ */

window.PRECIOS_COCHON = {
  // Precio del pedido completo según cantidad de personas y carne.
  // panes = cantidad de panes incluidos. salsasIncluidas = cuántas
  // salsas entran sin costo extra para ese tamaño de evento.
  porPersonas: {
    5:   { bondiola: 85000,  cerdo: 85000,  ternera: 145000, panes: 25,  salsasIncluidas: 2 },
    10:  { bondiola: null,   cerdo: 123000, ternera: 170000, panes: 40,  salsasIncluidas: 2 },
    15:  { bondiola: null,   cerdo: 147000, ternera: 245000, panes: 60,  salsasIncluidas: 3 },
    20:  { bondiola: null,   cerdo: 171000, ternera: 280000, panes: 80,  salsasIncluidas: 4 },
    25:  { bondiola: null,   cerdo: 185000, ternera: 310000, panes: 100, salsasIncluidas: 4 },
    30:  { bondiola: null,   cerdo: 243000, ternera: 366900, panes: 120, salsasIncluidas: 5 },
    35:  { bondiola: null,   cerdo: 264000, ternera: 382400, panes: 140, salsasIncluidas: 5 },
    40:  { bondiola: null,   cerdo: 326000, ternera: 405900, panes: 160, salsasIncluidas: 6 },
    50:  { bondiola: null,   cerdo: 386000, ternera: 480000, panes: 200, salsasIncluidas: 6 },
    60:  { bondiola: null,   cerdo: 430000, ternera: 590000, panes: 240, salsasIncluidas: 7 },
    70:  { bondiola: null,   cerdo: 510000, ternera: 663000, panes: 280, salsasIncluidas: 7 },
    80:  { bondiola: null,   cerdo: 569000, ternera: 732000, panes: 320, salsasIncluidas: 8 },
    90:  { bondiola: null,   cerdo: 623000, ternera: 821000, panes: 360, salsasIncluidas: 8 },
    100: { bondiola: null,   cerdo: 689000, ternera: 970000, panes: 400, salsasIncluidas: 9 },
  },

  // Solomillo: todavía sin precio.
  solomillo: {
    5: null,
    10: null,
  },

  // Bondiola y solomillo solo se ofrecen para grupos chicos.
  carnesGrupoChico: ["bondiola", "solomillo"],
  cantidadesGrupoChico: [5, 10],

  // Costo por CADA salsa que se elige por encima de las incluidas.
  precioSalsaExtra: 5000,

  // Opción vegetariana (add-on, no reemplaza la carne del evento).
  // Se vende por porción: cada porción rinde para un rango de personas,
  // trae sus propios panes y coleslaw en vez de salsas.
  vegetariano: {
    nombre: "Pulled shrooms",
    precioPorPorcion: 40000,
    personasMinPorPorcion: 5,
    personasMaxPorPorcion: 6,
    panesPorPorcion: "20 a 25",
    acompañamiento: "Coleslaw (en lugar de salsas)",
  },
};

// Copia `remoto` sobre `local` solo en claves que ya existen en `local`
// y con el mismo tipo (número/null o texto). Así la base puede cambiar
// precios pero nunca la estructura que el formulario espera.
window.mergePreciosCochon = function mergePreciosCochon(local, remoto) {
  if (!remoto || typeof remoto !== "object") return local;
  const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const out = Array.isArray(local) ? local.slice() : { ...local };
  Object.keys(local).forEach((k) => {
    if (!Object.prototype.hasOwnProperty.call(remoto, k)) return;
    const l = local[k];
    const r = remoto[k];
    if (isPlain(l)) {
      if (isPlain(r)) out[k] = mergePreciosCochon(l, r);
    } else if (typeof l === "number" || l === null) {
      if (r === null || (typeof r === "number" && Number.isFinite(r) && r >= 0)) out[k] = r;
    } else if (typeof l === "string" && typeof r === "string") {
      out[k] = r;
    }
  });
  return out;
};

// Promesa que resuelve con los precios a usar: los de precios.json si
// carga a tiempo, si no los de respaldo de arriba.
window.PRECIOS_COCHON_LISTO = (function cargarPreciosJson() {
  const local = window.PRECIOS_COCHON;
  if (window.COCHON_PRECIOS_SKIP_FETCH || !window.fetch) return Promise.resolve(local);

  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl && ctrl.abort(), 4000);

  // ?t= evita la caché de GitHub Pages (10 min): un cambio del panel se ve
  // apenas termina de publicarse, no 10 minutos después.
  return fetch(`precios.json?t=${Date.now()}`, {
    cache: "no-store",
    signal: ctrl ? ctrl.signal : undefined,
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((datos) => {
      const merged = window.mergePreciosCochon(local, datos);
      window.PRECIOS_COCHON = merged;
      return merged;
    })
    .catch((err) => {
      console.warn("Precios: usando respaldo local.", err);
      return local;
    })
    .finally(() => clearTimeout(timer));
})();
