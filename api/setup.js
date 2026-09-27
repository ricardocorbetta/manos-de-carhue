import bcrypt from 'bcryptjs';
import { q } from './_lib/db.js';
import { body, json, soloMetodo } from './_lib/http.js';
import { SCHEMA } from '../db/schema.js';
import SEEDS from '../db/seeds.js';

// Inicializa la base, crea o actualiza un cliente y sus usuarios. Protegido con SETUP_TOKEN.
export default async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;
  const b = await body(req);
  const tok = process.env.SETUP_TOKEN;
  if (!tok || tok.length < 16 || b.token !== tok) { await new Promise(r => setTimeout(r, 800)); return json(res, 403, { error: 'Código de instalación incorrecto.' }); }
  try {
    for (const st of SCHEMA.split(/;\s*\n/).map(x => x.trim()).filter(Boolean)) await q(st);
    const id = String(b.cliente_id || '').trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(id)) return json(res, 400, { error: 'El identificador del cliente solo puede tener letras, números y guiones.' });
    await q('insert into clientes(id, nombre) values ($1,$2) on conflict (id) do update set nombre=excluded.nombre', [id, String(b.cliente_nombre || id)]);
    const hechos = [];
    for (const u of (b.usuarios || [])) {
      const usuario = String(u.usuario || '').trim().toLowerCase();
      if (!usuario || !['admin', 'encargado', 'equipo'].includes(u.rol)) continue;
      if (!u.clave || String(u.clave).length < 8) return json(res, 400, { error: `La contraseña de ${usuario} tiene que tener al menos 8 caracteres.` });
      const hash = await bcrypt.hash(String(u.clave), 10);
      const ex = await q('select cliente_id from usuarios where usuario=$1', [usuario]);
      if (ex[0] && ex[0].cliente_id !== id) return json(res, 409, { error: `El usuario ${usuario} ya existe en otro cliente.` });
      await q(`insert into usuarios(cliente_id, usuario, nombre, pass_hash, rol) values ($1,$2,$3,$4,$5)
               on conflict (usuario) do update set pass_hash=excluded.pass_hash, rol=excluded.rol, nombre=excluded.nombre, activo=true`,
        [id, usuario, u.nombre || null, hash, u.rol]);
      hechos.push(usuario + ' (' + u.rol + ')');
    }
    let semilla = 'no';
    const seed = SEEDS[id];
    if (seed && b.cargar_datos) {
      const hay = await q('select count(*)::int n from config where cliente_id=$1', [id]);
      if (hay[0].n === 0 || b.reemplazar) {
        for (const k of ['metas', 'notas', 'plan']) if (seed[k])
          await q(`insert into config(cliente_id, clave, data, actualizado_por) values ($1,$2,$3::jsonb,'setup')
                   on conflict (cliente_id, clave) do update set data=excluded.data, actualizado=now()`, [id, k, JSON.stringify(seed[k])]);
        if (seed.dias && seed.dias.length)
          await q(`insert into dias(cliente_id, fecha, data) select $1, (e->>'fecha')::date, e from jsonb_array_elements($2::jsonb) e
                   on conflict (cliente_id, fecha) do update set data=excluded.data, actualizado=now()`, [id, JSON.stringify(seed.dias)]);
        semilla = 'sí (' + (seed.dias || []).length + ' días)';
      } else semilla = 'ya había datos: no se tocaron';
    }
    await q("insert into registro(cliente_id, usuario, accion, detalle) values ($1,'setup','setup',$2::jsonb)", [id, JSON.stringify({ usuarios: hechos, semilla })]);
    return json(res, 200, { ok: true, cliente: id, usuarios: hechos, datos_iniciales: semilla });
  } catch (e) { console.error(e); return json(res, 500, { error: 'Falló la instalación: ' + e.message }); }
}
