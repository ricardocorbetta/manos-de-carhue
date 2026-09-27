export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 5e6) throw new Error('Pedido demasiado grande'); chunks.push(c); }
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
export function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
export function soloMetodo(req, res, m) {
  if (req.method !== m) { json(res, 405, { error: 'Método no permitido' }); return false; }
  return true;
}
