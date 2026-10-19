import bcrypt from 'bcryptjs';
import { q } from './_lib/db.js';
import { body, json } from './_lib/http.js';
import { exigir } from './_lib/auth.js';

// Usuarios del cliente de la sesión. Solo admin y encargado.
// GET: lista. POST {usuario, clave}: cambia la contraseña; si el usuario no existe, lo crea con rol equipo.
// El encargado puede cambiar su propia contraseña y las de los usuarios del equipo; el admin, las de todos los de su cliente.
export default async function handler(req, res) {
  const s = await exigir(req, res, ['admin', 'encargado']); if (!s) return;
  try {
    if (req.method === 'GET') {
      const rows = await q('select usuario, nombre, rol, activo, ultimo_ingreso from usuarios where cliente_id=$1 order by rol, usuario', [s.cliente]);
      return json(res, 200, { usuarios: rows });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
    const b = await body(req);
    const usuario = String(b.usuario || '').trim().toLowerCase();
    const clave = String(b.clave || '');
    if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) return json(res, 400, { error: 'El usuario solo puede tener letras, números, puntos y guiones (de 3 a 40).' });
    if (clave.length < 8) return json(res, 400, { error: 'La contraseña tiene que tener al menos 8 caracteres.' });
    const ex = (await q('select id, cliente_id, rol from usuarios where usuario=$1', [usuario]))[0];
    if (ex && ex.cliente_id !== s.cliente) return json(res, 409, { error: 'Ese nombre de usuario ya está en uso. Elegí otro.' });
    if (ex && s.rol === 'encargado' && ex.rol !== 'equipo' && usuario !== s.usuario)
      return json(res, 403, { error: 'El encargado solo puede cambiar su contraseña y las del equipo.' });
    const hash = await bcrypt.hash(clave, 10);
    if (ex) await q('update usuarios set pass_hash=$1, activo=true where id=$2', [hash, ex.id]);
    else await q("insert into usuarios(cliente_id, usuario, pass_hash, rol) values ($1,$2,$3,'equipo')", [s.cliente, usuario, hash]);
    await q("insert into registro(cliente_id, usuario, accion, detalle) values ($1,$2,$3,$4::jsonb)",
      [s.cliente, s.usuario, ex ? 'cambio_clave' : 'alta_usuario', JSON.stringify({ usuario })]);
    return json(res, 200, { ok: true, usuario, creado: !ex });
  } catch (e) { console.error(e); return json(res, 500, { error: 'No se pudo guardar. Probá de nuevo.' }); }
}
