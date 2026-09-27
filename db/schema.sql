-- Xenom tableros: esquema multi-cliente (una sola base para todos los clientes)
create table if not exists clientes (
  id text primary key,
  nombre text not null,
  creado timestamptz not null default now()
);
create table if not exists usuarios (
  id serial primary key,
  cliente_id text not null references clientes(id) on delete cascade,
  usuario text not null unique,
  nombre text,
  pass_hash text not null,
  rol text not null check (rol in ('admin','encargado','equipo')),
  activo boolean not null default true,
  creado timestamptz not null default now(),
  ultimo_ingreso timestamptz
);
create table if not exists dias (
  cliente_id text not null references clientes(id) on delete cascade,
  fecha date not null,
  data jsonb not null,
  actualizado timestamptz not null default now(),
  primary key (cliente_id, fecha)
);
create table if not exists config (
  cliente_id text not null references clientes(id) on delete cascade,
  clave text not null,
  data jsonb not null,
  actualizado timestamptz not null default now(),
  actualizado_por text,
  primary key (cliente_id, clave)
);
create table if not exists registro (
  id bigserial primary key,
  cliente_id text not null,
  usuario text,
  accion text not null,
  detalle jsonb,
  fecha timestamptz not null default now()
);
create index if not exists registro_cliente_fecha on registro (cliente_id, fecha desc)
