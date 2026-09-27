import { q } from './_lib/db.js';
import { json } from './_lib/http.js';
import { exigir } from './_lib/auth.js';
export default async function handler(req, res) {
  const s = await exigir(req, res); if (!s) return;
  const c = await q('select id, nombre from clientes where id=$1', [s.cliente]);
  return json(res, 200, { usuario: s.usuario, rol: s.rol, cliente: c[0] || { id: s.cliente } });
}
