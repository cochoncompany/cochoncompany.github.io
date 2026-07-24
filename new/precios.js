/* ============================================================
   PRECIOS COCHON & CO. — fuente única de precios y costos
   ------------------------------------------------------------
   Este archivo es el único lugar donde hay que tocar números.
   pedido.js lo lee para armar el presupuesto en vivo del
   formulario — no toca precios en ningún otro lado.

   Cómo actualizar:
   - Para cambiar un precio, reemplazá el número.
   - Si todavía no tenés el precio de algo, dejá `null`:
     el formulario va a mostrar "consultanos" en su lugar,
     nunca un precio inventado.

   Última carga: tabla "PRECIOS MUNDIAL JUNIO/JULIO 2026"
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
    60:  { bondiola: null,   cerdo: null,   ternera: 590000, panes: 240, salsasIncluidas: 7 },
    70:  { bondiola: null,   cerdo: 510000, ternera: 663000, panes: 280, salsasIncluidas: 7 },
    80:  { bondiola: null,   cerdo: 569000, ternera: 732000, panes: 320, salsasIncluidas: 8 },
    90:  { bondiola: null,   cerdo: 623000, ternera: 821000, panes: 360, salsasIncluidas: 8 },
    100: { bondiola: null,   cerdo: 689000, ternera: 970000, panes: 400, salsasIncluidas: 9 },
  },

  // Solomillo: no estaba en la tabla que pasaste. Cargar acá cuando
  // tengas el precio (podés agregar más cantidades si hace falta).
  solomillo: {
    5: null,
    10: null,
  },

  // Bondiola y solomillo solo se ofrecen para grupos chicos.
  carnesGrupoChico: ["bondiola", "solomillo"],
  cantidadesGrupoChico: [5, 10],

  // Costo por CADA salsa que se elige por encima de las incluidas.
  // TODO: cargar el valor real. Mientras sea null, el formulario
  // avisa "consultanos" en vez de cobrar un número inventado.
  precioSalsaExtra: null,
};
