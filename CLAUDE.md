# autohost-cloud-lite

Panel web de AutoHost (ver `../CLAUDE.md`). Next.js 16 (App Router, output standalone), TypeScript,
Tailwind + shadcn/ui, Node 20+. La UI está en inglés.

## Comandos

```bash
npm install
npm run dev       # :3000
npm run lint      # ESLint
npm run build     # build de producción; también hace el type-check. Correrlo antes de dar algo por hecho
```

Usar `npm` (hay `pnpm-lock.yaml`, pero el Makefile y el Dockerfile usan npm). No hay tests automáticos.

## Cómo habla con la API

El navegador nunca llama a la API de Go directamente. Siempre pasa por un Route Handler de Next (BFF):

```
componente → hook (lib/features/<f>/hooks) → service → fetcher *.client.ts (fetchWithAuth)
  → /api/<recurso> (app/api/<recurso>/route.ts) → fetcher *.server.ts (backendFetch) → API Go
```

- `backendFetch` (`lib/api.ts`): solo en servidor. Usa `INTERNAL_API_URL` y manda el token de la cookie
  como `Authorization: Bearer`.
- `fetchWithAuth` (`lib/api/fetch-client.ts`): en el navegador. Renueva el token automáticamente y
  coordina el refresh entre pestañas con BroadcastChannel.
- Los Route Handlers reenvían el status de la API y el cuerpo de error como JSON. Muchos endpoints de Go
  responden los errores en texto plano: el handler cae en `"Unknown error"`. Leer el cuerpo como texto si
  no es JSON en vez de perder el mensaje.

## Estructura

```
app/(auth), app/(dashboard)   páginas
app/api/<recurso>/            Route Handlers (BFF), uno por recurso de la API
lib/features/<feature>/       módulo por feature: fetch/ (constants, *.client.ts, *.server.ts),
                              interfaces/, services/, hooks/  (ver docs/FEATURE_MODULE_ARCHITECTURE.md)
components/features/<f>/      componentes de cada feature; components/ui = shadcn (no editar a mano)
lib/types, lib/context, lib/hooks
```

## Reglas

- Seguir el patrón de `lib/features/<feature>` para todo lo nuevo; no llamar a `fetch` desde componentes.
- Los tipos de las respuestas salen de `../autohost-cloud-api/api/openapi.yaml`: comprobar ahí nombres de
  campos (snake_case), qué es opcional y qué puede ser `null`.
- Compatibilidad: mientras haya APIs desplegadas con el formato anterior, aceptar los dos formatos y marcar
  el fallback con `TODO` (y apuntarlo en PENDIENTES). El frontend se despliega antes que la API.
- No guardar tokens en `localStorage`; la sesión vive en cookies httpOnly gestionadas por los Route
  Handlers de `app/api/auth`.
- Secretos (tokens de bot, contraseñas de shares, claves VPN) solo se muestran una vez o bajo acción
  explícita; no dejarlos en el estado global ni en logs.
- Confirmaciones con los diálogos propios de la UI, no `window.confirm`.
