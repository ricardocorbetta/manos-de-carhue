import { json } from './_lib/http.js';
import { cerrarSesion } from './_lib/auth.js';
export default async function handler(req, res) { cerrarSesion(res); return json(res, 200, { ok: true }); }
