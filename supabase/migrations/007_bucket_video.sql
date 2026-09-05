-- ═══════════════════════════════════════════════════════════════════════════
-- 007_bucket_video.sql — El bucket "eventos" tambien acepta video de apertura
--
-- La plantilla "Elegante" permite reemplazar el sobre animado en CSS por un
-- video generado por fuera (Veo, Gemini, etc.) con los nombres de la pareja
-- ya incrustados. Mismo bucket publico que fotos y musica (mismo aislamiento
-- por evento_id en el path, mismas politicas de 003_storage.sql).
-- ═══════════════════════════════════════════════════════════════════════════

update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav',
    'video/mp4', 'video/webm', 'video/quicktime'
  ],
  -- 40 MB: deja margen para un video corto (5-10s) bien comprimido, mas lo
  -- que ya usaban fotos y musica en ese mismo bucket.
  file_size_limit = 41943040
where id = 'eventos';
