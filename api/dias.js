import { q } from './_lib/db.js';
import { body, json, soloMetodo } from './_lib/http.js';
import { exigir } from './_lib/auth.js';

// Carga o reemplaza días de venta ya procesados en el navegador (solo encargado o admin).
export default async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;
  const s = await exigir(req, res, ['encargado', 'admin']); if (!s) return;
  try {
    const b = await body(req);
    const dias = Array.isArray(b.dias) ? b.dias.filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d.fecha) && Number.isFinite(+d.tickets)) : [];
    if (!dias.length) return json(res, 400, { error: 'El archivo no tiene días válidos.' });
    if (dias.length > 800) return json(res, 413, { error: 'Demasiados días en una sola carga.' });
    await q(`insert into dias(cliente_id, fecha, data, actualizado)
             select $1, (e->>'fecha')::date, e, now() from jsonb_array_elements($2::jsonb) e
             on conflict (cliente_id, fecha) do update set data=excluded.data, actualizado=now()`,
      [s.cliente, JSON.stringify(dias)]);
    await q("insert into registro(cliente_id, usuario, accion, detalle) values ($1,$2,'carga_dias',$3::jsonb)",
      [s.cliente, s.usuario, JSON.stringify({ desde: dias[0].fecha, hasta: dias[dias.length - 1].fecha, n: dias.length })]);
    return json(res, 200, { ok: true, dias: dias.length });
  } catch (e) { console.error(e); return json(res, 500, { error: 'No se pudieron guardar las ventas.' }); }
}
