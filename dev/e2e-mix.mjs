// Prueba de la vista Mix. Uso: PWPATH=... XLSX_JS=... XLSX_OCT=... OUT=... node dev/e2e-mix.mjs (con dev/server.mjs corriendo)
import { createRequire } from 'node:module'; const require = createRequire(process.env.PWPATH + '/'); const { chromium } = require('playwright');
import fs from 'node:fs';
const B = 'http://localhost:3000', O = process.env.OUT;
const post = async (path, body, cookie) => { const r = await fetch(B + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }); return { r, j: await r.json().catch(() => ({})) }; };
await post('/api/setup', { token: 'codigo-local-1234567', cliente_id: 'manos-carhue', cliente_nombre: 'Manos de Carhué', cargar_datos: true, reemplazar: true,
  usuarios: [{ usuario: 'joaquin', clave: 'Prueba12345', rol: 'encargado' }, { usuario: 'equipo.manos', clave: 'Local12345', rol: 'equipo' }] });
let x = await post('/api/login', { usuario: 'equipo.manos', clave: 'Local12345' }); let ck = x.r.headers.get('set-cookie').split(';')[0];
let e = await (await fetch(B + '/api/estado', { headers: { cookie: ck } })).json(); console.log('equipo recibe mix:', !!e.metas.mix, '· mes:', JSON.stringify(e.metas.mes));
x = await post('/api/login', { usuario: 'joaquin', clave: 'Prueba12345' }); ck = x.r.headers.get('set-cookie').split(';')[0];
e = await (await fetch(B + '/api/estado', { headers: { cookie: ck } })).json(); console.log('encargado recibe mix:', !!e.metas.mix, Object.keys(e.metas.mix));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
await ctx.route('**/xlsx.full.min.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(process.env.XLSX_JS, 'utf8') }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
const p = await ctx.newPage(); p.on('pageerror', er => console.log('ERR', er.message));
await p.clock.setFixedTime(new Date('2026-10-08T09:00:00-03:00'));
await p.goto(B + '/'); await p.waitForSelector('#f-login');
await p.fill('#lg-u', 'joaquin'); await p.fill('#lg-p', 'Prueba12345'); await p.click('#lg-b'); await p.waitForSelector('#adm');
await p.click('#adm summary'); await p.setInputFiles('#f-xlsx', process.env.XLSX_OCT); await p.waitForTimeout(3000);
console.log('carga:', await p.textContent('#m-xlsx')); await p.click('#b-save'); await p.waitForTimeout(2000); console.log('guardar:', await p.textContent('#m-save'));
await p.click('.pills button[data-p="mix"]'); await p.waitForTimeout(600);
console.log((await p.textContent('#app')).replace(/\s+/g, ' ').slice(0, 1600));
await p.screenshot({ path: O + '/mix.png', fullPage: true });
await p.click('.simsrc[data-s="obj-2026-11"]'); await p.waitForTimeout(300); await p.fill('#sim-v', '135'); await p.dispatchEvent('#sim-v', 'change'); await p.waitForTimeout(300);
console.log('sim nov:', (await p.textContent('#sim .proygrid')).replace(/\s+/g, ' '));
await p.locator('#sim').screenshot({ path: O + '/sim.png' });
await b.close();
