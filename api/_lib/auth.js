import { SignJWT, jwtVerify } from 'jose';
import { json } from './http.js';

const COOKIE = 'xs';
function clave() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('Falta SESSION_SECRET (mínimo 32 caracteres).');
  return new TextEncoder().encode(s);
}
function duracion(rol) { return rol === 'equipo' ? 60 * 24 * 3600 : 14 * 24 * 3600; }

export async function crearSesion(res, u) {
  const seg = duracion(u.rol);
  const token = await new SignJWT({ uid: u.id, cliente: u.cliente_id, rol: u.rol, usuario: u.usuario })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + seg).sign(clave());
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${seg}`);
}
export function cerrarSesion(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}
export async function leerSesion(req) {
  const h = req.headers.cookie || '';
  const m = h.split(/;\s*/).find(x => x.startsWith(COOKIE + '='));
  if (!m) return null;
  try { const { payload } = await jwtVerify(m.slice(COOKIE.length + 1), clave()); return payload; } catch { return null; }
}
// Devuelve la sesión o responde 401/403 y devuelve null.
export async function exigir(req, res, roles) {
  const s = await leerSesion(req);
  if (!s) { json(res, 401, { error: 'Iniciá sesión.' }); return null; }
  if (roles && !roles.includes(s.rol)) { json(res, 403, { error: 'Tu usuario no tiene permiso para esto.' }); return null; }
  return s;
}
