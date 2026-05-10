# Arquitectura de Módulos por Feature

Este documento describe el patrón arquitectónico aplicado en el refactor de `autohost-cloud-lite`. Cada vista (feature) tiene su propio módulo aislado bajo `lib/features/<feature>/`, con capas bien definidas.

---

## Motivación

Antes del refactor, los hooks y páginas llamaban directamente a `fetchWithAuth` o importaban funciones de un `api.ts` monolítico (`lib/features/nodes/api.ts`). Esto generaba:

- Acoplamiento directo entre UI y transporte HTTP
- Imports relativos frágiles (`../../api`) que turbopack resuelve ambiguamente cuando coexisten `lib/api.ts` y `lib/api/` (directorio)
- Difícil testabilidad y localización de errores

---

## Estructura por módulo

```
lib/features/<feature>/
├── fetch/
│   ├── constants.ts          # Definición de endpoints (client y backend)
│   ├── <feature>.client.ts   # Fetchers del lado del browser (fetchWithAuth)
│   └── <feature>.server.ts   # Fetchers del lado del servidor (backendFetch)
├── interfaces/
│   └── <feature>.ts          # Re-exporta los tipos desde lib/types o lib/features/nodes/types
├── services/
│   └── <feature>.service.ts  # Capa de servicio: orquesta los fetchers client-side
└── hooks/
    └── use<Feature>.ts       # Hook React: estado + efectos, consume el service
```

Para sub-features dentro de un dominio complejo (como `nodes`):

```
lib/features/nodes/<sub-feature>/
├── fetch/
│   ├── constants.ts
│   ├── <sub-feature>.client.ts
│   └── <sub-feature>.server.ts  (o <sub-feature>.ts para server-only)
├── interfaces/
│   └── <sub-feature>.ts
├── services/
│   └── <sub-feature>.service.ts
└── hooks/
    └── use<SubFeature>.ts
```

---

## Capas en detalle

### 1. `fetch/constants.ts`

Define dos grupos de constantes de endpoints:

```ts
// URLs que Next.js expone al browser (rutas /api/...)
export const CLIENT_API_SCHEDULE_ENDPOINTS = {
  SCHEDULED_TASKS: {
    LIST: "/api/scheduled-tasks",
    DETAIL: (id: string) => `/api/scheduled-tasks/${id}`,
    TOGGLE: (id: string) => `/api/scheduled-tasks/${id}/toggle`,
  },
} as const;

// URLs del backend Go (usadas solo en server-side route handlers)
export const API_SCHEDULE_ENDPOINTS = {
  SCHEDULED_TASKS: {
    LIST: "/v1/scheduled-tasks",
    DETAIL: (id: string) => `/v1/scheduled-tasks/${id}`,
    TOGGLE: (id: string) => `/v1/scheduled-tasks/${id}/toggle`,
  },
} as const;
```

**Regla:** Los endpoints de backend siguen el prefijo `/v1/` del router Go. No asumir que el path del frontend coincide con el del backend.

---

### 2. `fetch/<feature>.client.ts`

Funciones puras que llaman a las rutas `/api/...` de Next.js usando `fetchWithAuth`.

```ts
import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_SCHEDULE_ENDPOINTS } from "./constants";

export async function fetchScheduledTasks(): Promise<ScheduledTask[]> {
  const res = await fetchWithAuth(CLIENT_API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.LIST);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}
```

**Reglas:**
- Solo se ejecutan en el browser
- Nunca importan `backendFetch`
- Siempre importan desde `"@/lib/api/fetch-client"` (no relativo)

---

### 3. `fetch/<feature>.server.ts`

Funciones server-side usadas exclusivamente en Next.js Route Handlers (`app/api/...`). Llaman directamente al backend Go usando `backendFetch`.

```ts
import { backendFetch } from "@/lib/api";  // siempre alias absoluto
import { API_SCHEDULE_ENDPOINTS } from "./constants";

export async function getScheduledTasksBackend(accessToken: string) {
  return backendFetch(API_SCHEDULE_ENDPOINTS.SCHEDULED_TASKS.LIST, { method: "GET" }, accessToken);
}
```

**Reglas:**
- Siempre importar `backendFetch` con `"@/lib/api"` (alias absoluto). **Nunca** con rutas relativas como `"../../../api"` porque turbopack podría resolver el directorio `lib/api/` (index.ts) en lugar del archivo `lib/api.ts`, causando un `TypeError` en runtime.
- Reciben siempre el `accessToken` como parámetro (lo obtiene el route handler desde la cookie)
- Pueden incluir funciones mapper (`mapXFromBackend`) cuando el backend devuelve snake_case

---

### 4. `interfaces/<feature>.ts`

Re-exporta los tipos necesarios desde `@/lib/types` o `@/lib/features/nodes/types` para que el resto del módulo no dependa de paths externos.

```ts
export type {
  ScheduledTask,
  ScheduledTaskBackendResponse,
  CreateScheduledTaskRequest,
} from "@/lib/types";
```

---

### 5. `services/<feature>.service.ts`

Objeto (o namespace) que agrupa los fetchers client-side bajo una API semántica. Es la única dependencia que los hooks consumen.

```ts
import { fetchScheduledTasks, fetchCreateScheduledTask } from "../fetch/schedule.client";

export const ScheduleService = {
  async getTasks(): Promise<ScheduledTask[]> {
    return fetchScheduledTasks();
  },
  async createTask(data: CreateScheduledTaskRequest): Promise<ScheduledTask> {
    return fetchCreateScheduledTask(data);
  },
};
```

---

### 6. `hooks/use<Feature>.ts`

Hook React que gestiona el estado local, efectos de carga y acciones. Consume únicamente el service.

```ts
import { ScheduleService } from "../services/schedule.service";

export function useScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  // ...
  const load = useCallback(async () => {
    const data = await ScheduleService.getTasks();
    setTasks(data);
  }, []);
  // ...
  return { tasks, isLoading, create, remove, toggle };
}
```

---

## Flujo completo de datos

```
[Browser] page.tsx / component
      │  useScheduledTasks()
      ▼
[Browser] hooks/useScheduledTasks.ts
      │  ScheduleService.getTasks()
      ▼
[Browser] services/schedule.service.ts
      │  fetchScheduledTasks()
      ▼
[Browser] fetch/schedule.client.ts
      │  fetchWithAuth("/api/scheduled-tasks")
      ▼
[Next.js] app/api/scheduled-tasks/route.ts  (Route Handler)
      │  getScheduledTasksBackend(accessToken)
      ▼
[Server] fetch/schedule.server.ts
      │  backendFetch("/v1/scheduled-tasks", ..., accessToken)
      ▼
[Go API] :8080
```

---

## Route Handlers (`app/api/...`)

Cada route handler:
1. Obtiene el `accessToken` de la cookie con `getAccessTokenFromCookie()`
2. Devuelve `401` si no hay token
3. Llama al server fetcher del módulo correspondiente
4. Propaga el status del backend o devuelve 500 ante errores inesperados

```ts
// app/api/scheduled-tasks/route.ts
import { getScheduledTasksBackend } from "@/lib/features/schedules/fetch/schedule.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";

export async function GET() {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await getScheduledTasksBackend(accessToken);
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}
```

**Import del route handler:** siempre desde `@/lib/features/<feature>/fetch/<feature>.server`.

---

## Reglas globales de imports

| Qué importar | Desde |
|---|---|
| `backendFetch` | `@/lib/api` (alias absoluto, **nunca** relativo) |
| `fetchWithAuth` | `@/lib/api/fetch-client` |
| Tipos globales de nodo | `@/lib/features/nodes/types` |
| Tipos del dominio actual | `../interfaces/<feature>` |
| Endpoints client | `./constants` → `CLIENT_API_*_ENDPOINTS` |
| Endpoints backend | `./constants` → `API_*_ENDPOINTS` |
| Componentes UI de nodo | `@/components/features/nodes` |

---

## Features refactorizadas

| Feature | Módulo |
|---|---|
| Marketplace | `lib/features/marketplace/` |
| Alerts (globales) | `lib/features/alerts/` |
| Projects | `lib/features/projects/` |
| Scheduled tasks | `lib/features/schedules/` |
| Enrollments / Settings | `lib/features/enrollments/` |
| Node: jobs | `lib/features/nodes/jobs/` |
| Node: service monitors | `lib/features/nodes/monitoring/` |
| Node: caddy / proxy | `lib/features/nodes/caddy/` |
| Node: alerts config | `lib/features/nodes/config/` |
| Node: logs (SSE) | `lib/features/nodes/logs/` |
| Node: nodes list | `lib/features/nodes/nodes/` |
| Node: commands | `lib/features/nodes/commands/` |
