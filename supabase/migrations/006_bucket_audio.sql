-- ═══════════════════════════════════════════════════════════════════════════
-- 006_bucket_audio.sql — El bucket "eventos" tambien acepta musica de fondo
--
-- La plantilla "Elegante" permite subir un audio para reproducir de fondo.
-- Mismo bucket publico que las fotos (mismo aislamiento por evento_id en el
-- path, mismas politicas de 003_storage.sql -- no hace falta tocarlas
-- porque no distinguen por tipo de archivo, solo por carpeta).
-- ═══════════════════════════════════════════════════════════════════════════

update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav'
  ],
  -- 15 MB: una foto pesada entra comoda, y alcanza para una cancion de un
  -- par de minutos bien comprimida (128kbps).
  file_size_limit = 15728640
where id = 'eventos';
