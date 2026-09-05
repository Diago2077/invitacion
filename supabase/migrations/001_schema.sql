-- ═══════════════════════════════════════════════════════════════════════════
-- 001_schema.sql — Esquema base del sistema de invitaciones digitales
--
--   usuarios                        ← solo el super admin, por ahora
--   eventos (el casamiento)
--     └── invitaciones              ← una por familia/grupo, con su link unico
--           ├── invitados           ← los nombres dentro de ese grupo
--           └── confirmaciones      ← bitacora de cada respuesta (append-only)
--
-- El panel es de un solo dueno (super_admin). Lo que es publico -- la
-- invitacion que abre el invitado y el reporte que ve el cliente -- NO toca
-- estas tablas directamente: pasa por las funciones de 004_rpc_publico.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- gen_random_bytes(), para los tokens de los links. En Supabase pgcrypto ya
-- viene instalada en el schema "extensions"; el create es por las dudas.
create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- usuarios — perfil colgado de auth.users (comparten el id)
-- ─────────────────────────────────────────────────────────────
create table if not exists usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  email text not null,
  -- 'cliente' queda reservado para cuando los novios tengan login propio.
  -- Hoy el cliente no entra al panel: mira su evento por el link de reporte.
  rol text not null default 'cliente' check (rol in ('super_admin', 'cliente')),
  activo boolean not null default true,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- Token de los links publicos
--
-- 10 caracteres hex = 40 bits. Es lo unico que protege una invitacion, asi
-- que sale de gen_random_bytes (CSPRNG) y no de random(), que es predecible.
-- El unique index de cada tabla es la garantia real de que no se repita.
-- ─────────────────────────────────────────────────────────────
create or replace function public.generar_token()
returns text language sql volatile
set search_path = public, extensions as $$
  select substr(encode(gen_random_bytes(8), 'hex'), 1, 10)
$$;

-- ─────────────────────────────────────────────────────────────
-- eventos — el casamiento (o cualquier otro tipo de evento)
--
-- "contenido" es el JSON que dibuja la invitacion: portada, textos, actos
-- (ceremonia/fiesta), dress code, regalos. Vive en jsonb y no en columnas
-- porque cada plantilla usa lo suyo, y el editor visual (fase 2) va a
-- agregarle secciones sin que eso sea una migracion cada vez.
-- ─────────────────────────────────────────────────────────────
create table if not exists eventos (
  id uuid default gen_random_uuid() primary key,

  -- Parte legible del link: /i/{slug}/{token}
  slug text not null unique,
  tipo text not null default 'casamiento'
    check (tipo in ('casamiento', 'cumpleanos', 'quince', 'bautismo', 'corporativo', 'otro')),
  nombre text not null,
  fecha_evento timestamptz,

  plantilla text not null default 'clasica',
  contenido jsonb not null default '{}'::jsonb,

  -- Modo que se propone al crear una invitacion nueva. Cada invitacion puede
  -- pisarlo: la decision es siempre del super admin, nunca del invitado.
  modo_pases_default text not null default 'nominal'
    check (modo_pases_default in ('nominal', 'cupo', 'abierto')),
  confirmar_hasta date,

  estado text not null default 'borrador'
    check (estado in ('borrador', 'publicado', 'cerrado', 'archivado')),

  -- Link de solo lectura que se le pasa al cliente: /r/{reporte_token}
  reporte_token text not null unique default public.generar_token(),

  -- Datos de quien contrato el evento (no entra al panel)
  cliente_nombre text,
  cliente_telefono text,
  cliente_email text,
  notas text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists eventos_fecha_idx on eventos (fecha_evento desc);

-- ─────────────────────────────────────────────────────────────
-- invitaciones — una por grupo/familia. Es la unidad que se comparte.
--
-- modo_pases decide como confirma el invitado:
--   nominal  → los nombres ya estan cargados; marca quien va y quien no.
--   cupo     → tiene N lugares asignados y elige cuantos usa.
--   abierto  → declara cuantos van (tope opcional).
-- ─────────────────────────────────────────────────────────────
create table if not exists invitaciones (
  id uuid default gen_random_uuid() primary key,
  evento_id uuid not null references eventos (id) on delete cascade,
  token text not null unique default public.generar_token(),

  nombre_grupo text not null,
  -- Encabezado personalizado; si esta vacio la plantilla usa nombre_grupo
  saludo text,

  modo_pases text not null default 'nominal'
    check (modo_pases in ('nominal', 'cupo', 'abierto')),
  -- cupo: lugares asignados. abierto: tope maximo (null = sin tope).
  -- nominal: se ignora, el cupo son los invitados cargados.
  pases int check (pases is null or pases >= 0),

  telefono text,
  email text,
  mesa text,
  -- Privado: nunca sale en la invitacion publica
  notas text,

  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmado', 'parcial', 'rechazado')),
  pases_confirmados int not null default 0,
  mensaje_invitado text,
  confirmado_at timestamptz,

  -- Acuse de recibo: se llena solo, la primera vez que abren el link
  visto_at timestamptz,
  vistas int not null default 0,
  -- Lo marca el panel cuando se copia o se envia el link
  enviado_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists invitaciones_evento_idx on invitaciones (evento_id);
create index if not exists invitaciones_evento_estado_idx on invitaciones (evento_id, estado);

-- ─────────────────────────────────────────────────────────────
-- invitados — las personas dentro de una invitacion
--
-- "origen" distingue a los que cargo el admin de los que sumo el propio
-- invitado al confirmar: al reconfirmar se borran los suyos y se rehacen,
-- pero los del admin nunca se pisan (en modo nominal la lista es fija).
-- ─────────────────────────────────────────────────────────────
create table if not exists invitados (
  id uuid default gen_random_uuid() primary key,
  invitacion_id uuid not null references invitaciones (id) on delete cascade,
  orden int not null default 0,
  nombre text not null,
  es_menor boolean not null default false,
  -- null = todavia no respondio por esta persona
  asiste boolean,
  restriccion text,
  origen text not null default 'admin' check (origen in ('admin', 'invitado')),
  created_at timestamptz default now()
);

create index if not exists invitados_invitacion_idx on invitados (invitacion_id, orden);

-- ─────────────────────────────────────────────────────────────
-- confirmaciones — bitacora append-only
--
-- El estado vigente vive en invitaciones; esto guarda cada respuesta tal
-- como llego. Sirve para el caso incomodo de siempre: "yo confirme que
-- ibamos cuatro" cuando en la tabla figuran dos.
-- ─────────────────────────────────────────────────────────────
create table if not exists confirmaciones (
  id uuid default gen_random_uuid() primary key,
  invitacion_id uuid not null references invitaciones (id) on delete cascade,
  asiste boolean not null,
  pases int not null default 0,
  invitados jsonb,
  mensaje text,
  created_at timestamptz default now()
);

create index if not exists confirmaciones_invitacion_idx
  on confirmaciones (invitacion_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- updated_at automatico
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists eventos_updated_at on eventos;
create trigger eventos_updated_at
  before update on eventos
  for each row execute function public.set_updated_at();

drop trigger if exists invitaciones_updated_at on invitaciones;
create trigger invitaciones_updated_at
  before update on invitaciones
  for each row execute function public.set_updated_at();
