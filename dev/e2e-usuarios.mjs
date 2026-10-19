// Prueba de usuarios y contraseñas. Uso: PWPATH=... OUT=... node dev/e2e-usuarios.mjs (con dev/server.mjs corriendo)
import { createRequire } from 'node:module'; const require = createRequire(process.env.PWPATH + '/'); const { chromium } = require('playwright');
const B = 'http://localhost:3000', O = process.env.OUT;
const post = async (path, body, cookie) => { const r = await fetch(B + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }); return { r, j: await r.json().catch(() => ({})) }; };
await post('/api/setup', { token: 'codigo-local-1234567', cliente_id: 'manos-carhue', cliente_nombre: 'Manos de Carhué', cargar_datos: true,
  usuarios: [{ usuario: 'ricardo', clave: 'Admin12345', rol: 'admin' }, { usuario: 'joaquin', clave: 'Prueba12345', rol: 'encargado' }, { usuario: 'equipo.manos', clave: 'Local12345', rol: 'equipo' }] });
let x = await post('/api/login', { usuario: 'equipo.manos', clave: 'Local12345' }); let ck = x.r.headers.get('set-cookie').split(';')[0];
console.log('equipo lista usuarios:', (await fetch(B + '/api/usuarios', { headers: { cookie: ck } })).status);
x = await post('/api/login', { usuario: 'joaquin', clave: 'Prueba12345' }); ck = x.r.headers.get('set-cookie').split(';')[0];
console.log('encargado cambia admin:', (await post('/api/usuarios', { usuario: 'ricardo', clave: 'Otra123456' }, ck)).j);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
await ctx.route('**/xlsx.full.min.js', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
const p = await ctx.newPage(); p.on('pageerror', er => console.log('ERR', er.message));
await p.goto(B + '/'); await p.waitForSelector('#f-login');
await p.fill('#lg-u', 'joaquin'); await p.fill('#lg-p', 'Prueba12345'); await p.click('#lg-b'); await p.waitForSelector('#adm');
await p.click('#adm summary'); await p.waitForTimeout(1200);
console.log('opciones:', await p.$$eval('#us-sel option', o => o.map(x => x.textContent)));
await p.selectOption('#us-sel', 'equipo.manos'); await p.click('#us-gen'); const nueva = await p.inputValue('#us-clave');
await p.click('#us-save'); await p.waitForTimeout(1500); console.log('msg:', await p.textContent('#us-m'), nueva);
await p.locator('#us-sel').scrollIntoViewIfNeeded(); await p.screenshot({ path: O + '/usuarios.png', fullPage: false });
console.log('login vieja:', (await post('/api/login', { usuario: 'equipo.manos', clave: 'Local12345' })).r.status, '· nueva:', (await post('/api/login', { usuario: 'equipo.manos', clave: nueva })).r.status);
await p.selectOption('#us-sel', ''); await p.fill('#us-nuevo', 'equipo.ventas'); await p.fill('#us-clave', 'Carhue-abcd-efgh'); await p.click('#us-save'); await p.waitForTimeout(1500);
console.log('msg2:', await p.textContent('#us-m'));
const nl = await post('/api/login', { usuario: 'equipo.ventas', clave: 'Carhue-abcd-efgh' }); console.log('nuevo login:', nl.r.status, nl.j.rol);
await b.close();
