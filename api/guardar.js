import { q } from './_lib/db.js';
import { body, json, soloMetodo } from './_lib/http.js';
import { exigir } from './_lib/auth.js';

// Guarda metas, notas y plan (solo encargado o admin).
export default async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;
  const s = await exigir(req, res, ['encargado', 'admin']); if (!s) return;
  try {
    const b = await body(req);
    const claves = ['metas', 'notas', 'plan'].filter(k => b[k] && typeof b[k] === 'object');
    if (!claves.length) return json(res, 400, { error: 'No hay nada para guardar.' });
    for (const k of claves) {
      const txt = JSON.stringify(b[k]);
      if (txt.length > 400000) return json(res, 413, { error: 'Los datos son demasiado grandes.' });
      await q(`insert into config(cliente_id, clave, data, actualizado, actualizado_por) values ($1,$2,$3::jsonb, now(), $4)
               on conflict (cliente_id, clave) do update set data=excluded.data, actualizado=now(), actualizado_por=excluded.actualizado_por`,
        [s.cliente, k, txt, s.usuario]);
    }
    await q("insert into registro(cliente_id, usuario, accion, detalle) values ($1,$2,'guardar',$3::jsonb)", [s.cliente, s.usuario, JSON.stringify({ claves })]);
    return json(res, 200, { ok: true, guardado: claves });
  } catch (e) { console.error(e); return json(res, 500, { error: 'No se pudo guardar.' }); }
}
