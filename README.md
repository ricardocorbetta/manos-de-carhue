# Xenom · Tableros de gestión diaria

Tablero diario por cliente (primero: Manos de Carhué). Vista **Equipo** (lúdica, solo lo del día) y vista **Encargado** (desvíos, próximos 7 días, plan a 4 semanas, carga de ventas y metas).

- **Vercel**: publica `public/` y las funciones de `api/`.
- **Neon (Postgres)**: una sola base para todos los clientes. Cada fila lleva `cliente_id`.
- **Usuarios**: usuario + contraseña (bcrypt), sesión en cookie firmada. Roles: `admin`, `encargado`, `equipo`.

## Publicar por primera vez

1. Subir este repositorio a GitHub.
2. En Vercel: **Add New → Project → Import** el repositorio. Framework: *Other*. No hace falta comando de build.
3. En el proyecto de Vercel: **Storage → Create Database → Neon** y conectarla al proyecto (crea `DATABASE_URL`).
4. En **Settings → Environment Variables** agregar:
   - `SESSION_SECRET`: texto al azar de 32+ caracteres.
   - `SETUP_TOKEN`: código de instalación de 16+ caracteres (guardarlo).
5. **Redeploy** para que tome las variables.
6. Abrir `https://<tu-dominio>/setup`, ingresar el código, el cliente y los usuarios con sus contraseñas. Deja tildado "Cargar metas, plan y ventas iniciales" para Manos de Carhué.
7. Entrar en `https://<tu-dominio>/` con el usuario del encargado o del equipo.

## Uso diario

- Joaquín (encargado), a primera hora: Odoo → Punto de Venta → Reportes → Análisis de ventas → exportar a Excel (Fecha de la orden, Orden, Variante del producto, Cliente, Total) → en el tablero, "Cargar ventas del día y metas" → subir → **Guardar**.
- El equipo ve su vista con el usuario del local. La pantalla se actualiza sola cada 5 minutos.

## Agregar un cliente o cambiar contraseñas

Usar `/setup` con el código de instalación. Para un cliente nuevo: otro identificador (ej. `cnd-cipolletti`) y sus usuarios. Los usuarios son únicos en toda la plataforma.

## Desarrollo local

```
npm install
npm run dev   # http://localhost:3000 con base en memoria (PGlite)
```

## Estructura

- `api/` login, logout, me, estado (GET), guardar (POST metas/notas/plan), dias (POST ventas diarias), setup.
- `db/schema.sql` tablas: clientes, usuarios, dias, config, registro.
- `db/seeds.js` datos iniciales de Manos de Carhué.
- `public/reglas.js` reglas de venta cruzada y lectura del Excel de Odoo. `public/app.js` tablero.
