// Prueba del objetivo de ventas del mes. Uso: PWPATH=<node_modules con playwright> XLSX_OCT=<excel de octubre> node dev/e2e-mes.mjs
import { createRequire } from 'node:module'; const require = createRequire(process.env.PWPATH + '/'); const { chromium } = require('playwright');
import fs from 'node:fs';
const B = 'http://localhost:3000';
const post = async (path, body, cookie) => { const r = await fetch(B + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }); return { r, j: await r.json().catch(() => ({})) }; };
// instalación como en producción
let x = await post('/api/setup', { token: process.env.SETUP_TOKEN || 'codigo-local-1234567', cliente_id: 'manos-carhue', cliente_nombre: 'Manos de Carhué', cargar_datos: true, reemplazar: true,
  usuarios: [{ usuario: 'joaquin', clave: 'Prueba12345', rol: 'encargado' }, { usuario: 'equipo.manos', clave: 'Local12345', rol: 'equipo' }] });
console.log('setup:', JSON.stringify(x.j));
// estado de producción: metas sin objetivo del mes y días de octubre cargados con la versión anterior (sin total)
x = await post('/api/login', { usuario: 'joaquin', clave: 'Prueba12345' }); const ck = x.r.headers.get('set-cookie').split(';')[0];
const est = await (await fetch(B + '/api/estado', { headers: { cookie: ck } })).json(); delete est.metas.mes;
await post('/api/guardar', { metas: est.metas }, ck);
if (process.env.DIAS_VIEJOS) { const dv = JSON.parse(fs.readFileSync(process.env.DIAS_VIEJOS, 'utf8')); console.log('días viejos:', JSON.stringify((await post('/api/dias', { dias: dv }, ck)).j)); }

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
await ctx.route('**/xlsx.full.min.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(process.env.XLSX_JS, 'utf8') }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.clock.setFixedTime(new Date('2026-10-06T15:30:00-03:00'));
await p.goto(B + '/'); await p.waitForSelector('#f-login');
await p.fill('#lg-u', 'joaquin'); await p.fill('#lg-p', 'Prueba12345'); await p.click('#lg-b'); await p.waitForSelector('#adm');
console.log('sin guardar, tarjeta del mes con el objetivo inicial:', await p.$('#mes-obj') !== null);
await p.click('#adm summary'); await p.fill('#ob-mes', '140'); await p.click('#b-save'); await p.waitForTimeout(2500);
console.log('guardar:', await p.textContent('#m-save'));
console.log('con días viejos →', (await p.textContent('#mes-obj')).replace(/\s+/g, ' ').slice(0, 600));
await p.setInputFiles('#f-xlsx', process.env.XLSX_OCT); await p.waitForTimeout(4000);
console.log('carga:', await p.textContent('#m-xlsx'));
await p.click('#b-save'); await p.waitForTimeout(2500);
await p.reload(); await p.waitForSelector('#mes-obj');
console.log('con el Excel nuevo →', (await p.textContent('#mes-obj')).replace(/\s+/g, ' '));
await p.locator('#mes-obj').screenshot({ path: process.env.OUT + '/mes_enc.png' });
await p.screenshot({ path: process.env.OUT + '/enc_full.png', fullPage: true });
await p.click('.pills button[data-p="mes"]'); await p.waitForTimeout(500); console.log('vista Mes tiene tarjeta:', await p.$('#mes-obj') !== null);
await p.click('.salir'); await p.waitForSelector('#f-login');
await p.fill('#lg-u', 'equipo.manos'); await p.fill('#lg-p', 'Local12345'); await p.click('#lg-b'); await p.waitForSelector('#mes-eq'); await p.waitForTimeout(1500);
console.log('equipo →', (await p.textContent('#mes-eq')).replace(/\s+/g, ' '));
await p.locator('#mes-eq').screenshot({ path: process.env.OUT + '/mes_eq.png' });
await p.screenshot({ path: process.env.OUT + '/eq_full.png', fullPage: true });
await b.close();
