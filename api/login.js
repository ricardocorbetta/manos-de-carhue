import bcrypt from 'bcryptjs';
import { q } from './_lib/db.js';
import { body, json, soloMetodo } from './_lib/http.js';
import { crearSesion } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;
  try {
    const { usuario, clave } = await body(req);
    const u0 = String(usuario || '').trim().toLowerCase();
    if (!u0 || !clave) return json(res, 400, { error: 'Completá usuario y contraseña.' });
    const rows = await q('select u.id, u.usuario, u.pass_hash, u.rol, u.cliente_id, u.activo, c.nombre as cliente_nombre from usuarios u join clientes c on c.id=u.cliente_id where u.usuario=$1', [u0]);
    const u = rows[0];
    const ok = u && u.activo && await bcrypt.compare(String(clave), u.pass_hash);
    if (!ok) { await new Promise(r => setTimeout(r, 600)); return json(res, 401, { error: 'Usuario o contraseña incorrectos.' }); }
    await crearSesion(res, u);
    await q('update usuarios set ultimo_ingreso=now() where id=$1', [u.id]);
    await q("insert into registro(cliente_id, usuario, accion) values ($1,$2,'ingreso')", [u.cliente_id, u.usuario]);
    return json(res, 200, { usuario: u.usuario, rol: u.rol, cliente: { id: u.cliente_id, nombre: u.cliente_nombre } });
  } catch (e) { console.error(e); return json(res, 500, { error: 'No se pudo iniciar sesión. Probá de nuevo.' }); }
}
