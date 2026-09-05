-- ═══════════════════════════════════════════════════════════════════════════
-- 003_storage.sql — Bucket de las fotos de cada evento
--
-- Ruta de cada archivo: {evento_id}/{nombre}.{ext}
--
-- A diferencia del bucket de facturas del otro sistema, este es PUBLICO a
-- proposito: las fotos se muestran en la invitacion, que la abre gente sin
-- login. Una signed URL vence y dejaria la portada rota justo el dia del
-- casamiento. Publico es de lectura: subir y borrar sigue siendo del admin.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eventos',
  'eventos',
  true,
  8388608, -- 8 MB: una foto de portada razonable ya viene comprimida
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura publica (la sirve el CDN de Supabase, sin pasar por estas politicas
-- para los objetos del bucket publico, pero la dejamos explicita).
drop policy if exists "Fotos publicas" on storage.objects;
create policy "Fotos publicas" on storage.objects for select to anon, authenticated
  using (bucket_id = 'eventos');

drop policy if exists "Solo el admin sube fotos" on storage.objects;
create policy "Solo el admin sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'eventos' and es_super_admin());

drop policy if exists "Solo el admin borra fotos" on storage.objects;
create policy "Solo el admin borra fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'eventos' and es_super_admin());

drop policy if exists "Solo el admin edita fotos" on storage.objects;
create policy "Solo el admin edita fotos" on storage.objects for update to authenticated
  using (bucket_id = 'eventos' and es_super_admin())
  with check (bucket_id = 'eventos' and es_super_admin());
