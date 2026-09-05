-- ═══════════════════════════════════════════════════════════════════════════
-- 002_rls.sql — Quien toca que
--
-- Regla unica y corta: al panel entra solo el super_admin, y ve todo.
-- El publico (anon) NO tiene acceso a ninguna tabla; entra exclusivamente
-- por las funciones de 004_rpc_publico.sql, que son las que deciden que
-- campo se muestra y cual no.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- Helper en security definer: lee "usuarios" SALTEANDO la RLS.
-- Sin esto, una politica sobre "usuarios" que a su vez consulte "usuarios"
-- dispara "infinite recursion detected in policy".
-- ─────────────────────────────────────────────────────────────
create or replace function public.es_super_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select rol = 'super_admin' and activo from public.usuarios where id = auth.uid()),
    false
  )
$$;

revoke execute on function public.es_super_admin() from public, anon;
grant execute on function public.es_super_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- usuarios — cada uno ve su propia fila (useAuth la necesita para saber
-- que rol tiene). Editar usuarios es solo del super_admin: si alguien
-- pudiera hacer update sobre su fila, se pondria rol = 'super_admin'.
-- ─────────────────────────────────────────────────────────────
alter table usuarios enable row level security;

drop policy if exists "Ver mi usuario" on usuarios;
create policy "Ver mi usuario" on usuarios for select to authenticated
  using (id = auth.uid() or es_super_admin());

drop policy if exists "Super admin gestiona usuarios" on usuarios;
create policy "Super admin gestiona usuarios" on usuarios for all to authenticated
  using (es_super_admin()) with check (es_super_admin());

-- ─────────────────────────────────────────────────────────────
-- eventos / invitaciones / invitados / confirmaciones — todo del super_admin
-- ─────────────────────────────────────────────────────────────
alter table eventos enable row level security;

drop policy if exists "Super admin" on eventos;
create policy "Super admin" on eventos for all to authenticated
  using (es_super_admin()) with check (es_super_admin());

alter table invitaciones enable row level security;

drop policy if exists "Super admin" on invitaciones;
create policy "Super admin" on invitaciones for all to authenticated
  using (es_super_admin()) with check (es_super_admin());

alter table invitados enable row level security;

drop policy if exists "Super admin" on invitados;
create policy "Super admin" on invitados for all to authenticated
  using (es_super_admin()) with check (es_super_admin());

alter table confirmaciones enable row level security;

-- La bitacora se lee, no se edita a mano: las filas las escribe la funcion
-- publica de confirmacion, que corre en security definer.
drop policy if exists "Super admin lee" on confirmaciones;
create policy "Super admin lee" on confirmaciones for select to authenticated
  using (es_super_admin());

-- ─────────────────────────────────────────────────────────────
-- Permisos de tabla.
-- Supabase concede por defecto a anon sobre las tablas nuevas de public.
-- Aca eso seria grave: expondria la lista completa de invitados de todos
-- los eventos a cualquiera con la anon key (que viaja en el bundle).
-- ─────────────────────────────────────────────────────────────
revoke all on table usuarios, eventos, invitaciones, invitados, confirmaciones from anon;

grant select on table usuarios to authenticated;
grant insert, update, delete on table usuarios to authenticated;
grant select, insert, update, delete
  on table eventos, invitaciones, invitados to authenticated;
grant select on table confirmaciones to authenticated;
