# Autohost Cloud Lite

Dashboard web para gestión de nodos distribuidos. Frontend del ecosistema Autohost, consume la [autohost-cloud-api](../autohost-cloud-api).

## Stack

- **Next.js** 16 (App Router, standalone output)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **Node.js** 20+

## Requisitos previos

- Node.js 20+
- npm
- La API ([autohost-cloud-api](../autohost-cloud-api)) corriendo en `http://localhost:8080`

## Arranque rápido

### 1. Instalar dependencias

```bash
make install
# o directamente: npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Variables disponibles:

```bash
# URL interna que Next.js usa para llamar al backend (server-side)
INTERNAL_API_URL=http://localhost:8080

# URL pública de la app (usada para callbacks OAuth, etc.)
APP_URL=http://localhost:3000

# URL del backend accesible desde el cliente/CLI
# En Incus/container usa la IP del bridge host, ej: http://10.39.5.1:8080
PUBLIC_API_URL=http://localhost:8080

# false en desarrollo, true en producción (HTTPS)
COOKIE_SECURE=false

# OAuth Google (opcional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 3. Ejecutar en desarrollo

```bash
make dev
# o: npm run dev
```

La app estará disponible en `http://localhost:3000`.

---

## Comandos Make

```bash
make install      # Instalar dependencias (npm install)
make dev          # Servidor de desarrollo (next dev)
make build        # Compilar para producción (next build)
make start        # Iniciar servidor de producción (next start)
make lint         # Linter (eslint)
make docker       # Construir imagen Docker
make compose-up   # Levantar con Docker Compose
make compose-down # Detener contenedores
```

---

## Estructura del proyecto

```
.
├── app/
│   ├── (auth)/           # Rutas públicas: /login, /register
│   ├── (dashboard)/      # Rutas protegidas del dashboard
│   │   ├── page.tsx      # Inicio / overview
│   │   ├── nodes/        # Listado de nodos
│   │   ├── alerts/       # Alertas
│   │   ├── settings/     # Configuración
│   │   └── schedules/    # Tareas programadas
│   ├── api/              # Route handlers (proxy al backend)
│   └── node/[id]/        # Vista detallada de un nodo
├── components/
│   ├── features/         # Componentes de dominio
│   ├── layout/           # Layout, navegación
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── api/              # Clientes hacia el backend Go
│   ├── hooks/            # React hooks de datos
│   ├── types/            # TypeScript types
│   └── utils/            # Utilidades
├── config/
│   └── constants.ts      # Endpoints y constantes globales
├── middleware.ts          # Protección de rutas (JWT cookie)
├── compose.yml           # Docker Compose para producción
└── Makefile
```

---

## Autenticación

El middleware protege todas las rutas del dashboard. La autenticación se gestiona mediante cookies HTTP-only (`access_token`). Si la cookie no existe, redirige a `/login`.

---

## Producción con Docker

```bash
# Opción 1: con Docker Compose (imagen pre-construida)
make compose-up

# Opción 2: construir imagen local
make docker
docker run -p 3000:3000 --env-file .env.local autohost-cloud-lite
```

El `compose.yml` expone el servicio en el puerto `3002` y usa `.env.local` como fuente de variables.

---


## Licencia / License

Este proyecto es software libre y de código abierto (Open Source), distribuido bajo la licencia **[GNU Affero General Public License v3.0 (AGPLv3)](LICENSE)**.

Eres libre de usarlo, modificarlo y hospedar tu propia instancia (self-hosted) de forma gratuita. De acuerdo con los términos de AGPLv3, si modificas el software y ofreces servicios a través de una red, debes poner a disposición el código fuente correspondiente bajo la misma licencia.

Para licencias comerciales alternativas o consultas sobre la versión SaaS gestionada, contacta al equipo de AutoHost.
