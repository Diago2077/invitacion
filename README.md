# Invitaciones digitales

Panel para crear invitaciones de casamiento (y de cualquier otro evento),
repartirlas por WhatsApp con un link personal por familia, y seguir las
confirmaciones en vivo.

Comparte arquitectura, estilo y componentes con el sistema contable
(`D:\CLAUDE\contable`), pero es un proyecto aparte: mismo stack, otra base.

## Como esta armado

```
usuarios                        ← solo vos (super_admin)
eventos (el casamiento)
  └── invitaciones              ← una por familia/grupo, con su link unico
        ├── invitados           ← los nombres dentro de ese grupo
        └── confirmaciones      ← bitacora de cada respuesta
```

Son dos aplicaciones en un mismo repo:

- **El panel** (`/`), detras del login. Solo entra el `super_admin`; lo
  garantiza Row Level Security en Postgres, no el frontend.
- **Lo publico**, sin login: la invitacion que abre el invitado
  (`/i/{slug}/{token}`) y el tablero de solo lectura del cliente
  (`/r/{reporte_token}`). Estas paginas **no leen ninguna tabla**: pasan por
  tres funciones RPC (`supabase/migrations/004_rpc_publico.sql`) que arman a
  mano el JSON que devuelven. Lo que no se nombra ahi, no sale.

**Stack:** React + TypeScript + Vite · Tailwind v4 · React Router · Supabase
(Postgres + Auth + Storage) · Vercel.

## Los tres modos de pases

Los elegis vos por invitacion (con un default por evento). El invitado nunca
decide bajo que regla contesta:

| Modo | Que ve el invitado |
| --- | --- |
| `nominal` | Los nombres ya cargados. Marca quien va y quien no. |
| `cupo` | "Tenes 4 lugares". Elige cuantos usa y puede escribir los nombres. |
| `abierto` | Declara cuantas personas van. El maximo es opcional. |

La regla se valida en `confirmar_invitacion()` (SQL) y no en el formulario: el
formulario se puede saltear mandando el POST a mano, la funcion no.

## Puesta en marcha

### 1. Supabase

Crear un proyecto y correr, en orden, `supabase/migrations/*.sql` en el **SQL
Editor**. `005_super_admin.sql` es la unica que no se corre de una: antes hay
que crear el usuario en **Authentication → Users → Add user** (marcando *Auto
Confirm User*) y recien ahi correrla, con ese email.

### 2. Variables de entorno

Copiar `.env.example` a `.env` y completar con **Project Settings → API**.
Las dos son `VITE_*` y viajan al navegador: esta bien, son publicas por
diseno. No hay claves de servidor en este proyecto -- no hay funciones
serverless.

### 3. Correr

```bash
npm install
npm run dev
```

## Deploy

Vercel autodetecta Vite. Hay que cargar las dos variables en **Settings →
Environment Variables**. El `vercel.json` reescribe todo hacia `index.html`
para que recargar con F5 en `/i/ana-y-luis/abc123` no de 404.

## Como se usa (el flujo de un casamiento)

1. **Nuevo evento**: nombre, fecha, link (`slug`) y datos del cliente.
2. Pestana **Invitacion**: portada, foto, mensaje, ceremonia y fiesta con su
   direccion, dress code, regalos. Se mira con **Vista previa**.
3. Pestana **Invitados**: cargar la lista a mano o **Importar** un Excel. El
   boton *Descargar plantilla de ejemplo* baja el formato exacto.
4. **Publicar** el evento (hasta que no lo hagas, el link funciona como vista
   previa y nadie puede confirmar).
5. Repartir: el boton de compartir de cada fila arma el mensaje y abre el chat
   de WhatsApp con el link personal ya cargado.
6. Seguir las confirmaciones en la misma pestana, o pasarle al cliente el link
   de **Compartir → seguimiento**, que es de solo lectura.

## Decisiones que conviene no deshacer sin pensarlo

- **El token es lo unico que protege una invitacion.** Sale de
  `gen_random_bytes` (CSPRNG), no de `random()`. Diez caracteres hex = 40 bits.
- **`anon` no tiene permiso sobre ninguna tabla** (`002_rls.sql` lo revoca
  explicito, porque Supabase concede por defecto). Si eso se afloja, la anon
  key -- que viaja en el bundle -- alcanza para leer la lista de invitados de
  todos los eventos.
- **El bucket `eventos` es publico de lectura.** Una signed URL vence y
  dejaria la portada rota justo el dia del casamiento.
- **`eventos.contenido` es jsonb y no columnas.** Es lo que va a leer y
  escribir el editor visual de la fase 2 sin necesidad de migrar nada.
- **No hay envio automatico de WhatsApp.** El panel arma el mensaje y abre el
  chat; enviar lo hace la persona. Sin API de por medio no hay costo por
  mensaje ni riesgo de que bloqueen el numero.

## PWA y versionado

El panel es instalable y cachea de forma segura: los assets de Vite
(`/assets/*`) llevan hash y van cache-first; todo lo demas es red primero, con
el cache como red de contencion si el salon no tiene senal.

El nombre del cache incluye la version de `package.json`, asi que una release
es un solo paso: subir `"version"` (o `npm version patch`) y desplegar. El
build genera `dist/sw.js` con esa version inyectada.

Los iconos se generan con `node scripts/generate-icons.mjs` (necesita
`npm install --no-save sharp` antes). Si cambia el logo, se edita el SVG que
esta dentro de ese script y se vuelve a correr.

## Agregar una plantilla

1. Un componente en `src/plantillas/` con la firma de `PropsPlantilla`.
2. Registrarlo en `src/plantillas/index.ts`.

El selector del panel y la pagina publica salen los dos de ese registro, asi
que no hay una segunda lista que mantener sincronizada.

## Pendiente para las proximas fases

- Editor visual de la invitacion (hoy es un formulario).
- Galeria de fotos, musica de fondo, mas plantillas.
- QR por invitacion para el check-in en la puerta.
- Recordatorios automaticos a los que no confirmaron.
- Login para los novios (el rol `cliente` ya existe en la base, sin politicas).
- `npm run tipos` con `supabase gen types` y el chequeo de esquema contra
  `database.types.ts`, como en el sistema contable.
