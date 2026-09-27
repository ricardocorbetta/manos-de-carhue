// Servidor local de prueba: simula Vercel (carpeta /public + funciones /api) con una base Postgres en memoria (PGlite).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

process.env.SESSION_SECRET ||= 'desarrollo-local-secreto-de-32-caracteres-min';
process.env.SETUP_TOKEN ||= 'codigo-local-1234567';
const db = new PGlite();
globalThis.__XENOM_DB = { query: (t, p) => db.query(t, p) };
const root = path.resolve('public');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const port = +process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const f = path.resolve('api', url.pathname.slice(5).replace(/[^a-z-]/g, '') + '.js');
    if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('{}'); }
    try { const mod = await import(f); return await mod.default(req, res); }
    catch (e) { console.error(e); res.statusCode = 500; return res.end(JSON.stringify({ error: e.message })); }
  }
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  if (p === '/setup') p = '/setup.html';
  const file = path.join(root, path.normalize(p));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.statusCode = 404; return res.end('No encontrado'); }
  res.setHeader('Content-Type', tipos[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log('Tablero local en http://localhost:' + port));
