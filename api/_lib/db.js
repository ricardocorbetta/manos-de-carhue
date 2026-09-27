import { neon } from '@neondatabase/serverless';

let _sql = null;
function cliente() {
  if (globalThis.__XENOM_DB) return globalThis.__XENOM_DB; // pruebas locales
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('Falta la variable DATABASE_URL (conexión a Neon).');
    _sql = neon(url);
  }
  return _sql;
}

// Ejecuta una consulta con parámetros ($1, $2...) y devuelve las filas.
export async function q(text, params = []) {
  const r = await cliente().query(text, params);
  return Array.isArray(r) ? r : r.rows;
}
