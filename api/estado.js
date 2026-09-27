import { q } from './_lib/db.js';
import { json, soloMetodo } from './_lib/http.js';
import { exigir } from './_lib/auth.js';

// Devuelve todo lo que el tablero necesita para el cliente de la sesión.
export default async function handler(req, res) {
  if (!soloMetodo(req, res, 'GET')) return;
  const s = await exigir(req, res); if (!s) return;
  try {
    const [conf, dias, cli] = await Promise.all([
      q('select clave, data, actualizado, actualizado_por from config where cliente_id=$1', [s.cliente]),
      q("select data from dias where cliente_id=$1 and fecha >= (current_date - interval '400 days') order by fecha", [s.cliente]),
      q('select id, nombre from clientes where id=$1', [s.cliente])
    ]);
    const C = {}; let actualizado = null;
    conf.forEach(r => { C[r.clave] = r.data; if (!actualizado || r.actualizado > actualizado) actualizado = r.actualizado; });
    let plan = C.plan || {};
    if (s.rol === 'equipo') { // el equipo no ve las acciones del encargado
      const p2 = {}; Object.keys(plan).forEach(k => { p2[k] = { dias: (plan[k] || {}).dias || {} }; }); plan = p2;
    }
    return json(res, 200, {
      cliente: cli[0], rol: s.rol, usuario: s.usuario,
      metas: C.metas || null, notas: C.notas || {}, plan,
      dias: dias.map(r => r.data), actualizado
    });
  } catch (e) { console.error(e); return json(res, 500, { error: 'No se pudieron leer los datos.' }); }
}
