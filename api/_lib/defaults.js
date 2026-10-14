// Valores por defecto por cliente que no van en el código público (márgenes, gastos fijos, objetivos).
// Lo que el encargado guarda en la base tiene prioridad sobre esto.
const MIX_MANOS = {
  fijos: 35000000,            // gastos fijos por mes, en pesos
  factorOdoo: 1.165,          // ventas en Odoo (con IVA) por cada $1 de venta neta
  // margen bruto por familia: compras (líneas de órdenes de compra) contra ventas sin IVA
  margenes: { vac: 9.0, pol: 30.5, cer: 36.4, alm: 13.8, fia: 25.4, ach: 43.6, beb: 21.1, pes: 34.9, car: 19.8 },
  // participación en la venta del mostrador, junio a septiembre de 2026
  base: { vac: 57.2, pol: 12.3, cer: 12.4, alm: 7.0, fia: 5.6, ach: 2.9, beb: 1.0, pes: 1.1, car: 0.4 },
  objetivos: {
    '2026-10': { vac: 53.2, pol: 13.3, cer: 13.9, alm: 7.5, fia: 6.3, ach: 2.9, beb: 1.3, pes: 1.1, car: 0.5 },
    '2026-11': { vac: 49.0, pol: 14.3, cer: 15.4, alm: 8.0, fia: 7.1, ach: 2.9, beb: 1.5, pes: 1.1, car: 0.7 }
  },
  // picada común: precio objetivo por kilo con IVA y máximo de kilos sobre el total de vacuno
  picada: { '2026-10': { precio: 14000, maxPct: 22 }, '2026-11': { precio: 15000, maxPct: 15 } },
  // aumento de precio de los cortes de vacuno previsto en el plan (sin la picada)
  precioVac: { '2026-10': 5, '2026-11': 8 },
  // puntos de margen del vacuno que se esperan recuperar con menos retazo y control de kilos
  mejoraVac: { '2026-10': 2, '2026-11': 6 }
};
export const DEFAULTS = {
  'manos-carhue': { mes: { '2026-10': 157000000, '2026-11': 160000000 }, mix: MIX_MANOS }
};
function merge(a, b) { // b gana; objetos se combinan
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b === undefined ? a : b;
  const o = { ...(a || {}) };
  for (const k of Object.keys(b)) o[k] = (a && typeof a[k] === 'object' && !Array.isArray(a[k])) ? merge(a[k], b[k]) : b[k];
  return o;
}
export function conDefaults(cliente, metas) {
  const D = DEFAULTS[cliente]; if (!D) return metas;
  const m = { ...(metas || {}) };
  m.mes = merge(D.mes, m.mes);
  m.mix = merge(D.mix, m.mix);
  return m;
}
