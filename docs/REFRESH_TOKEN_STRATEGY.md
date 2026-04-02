# Estrategia de Refresh Token

## 🔐 Arquitectura

### Cookies Utilizadas

1. **`access_token`** (httpOnly, 15 min)
   - Token de acceso de corta duración
   - Gestionado por Next.js en el servidor
   - No accesible desde JavaScript del cliente

2. **`refresh_token`** (httpOnly, 30 días)
   - Token de refresco de larga duración
   - Enviado automáticamente por el navegador
   - Solo usado en el endpoint `/v1/auth/refresh`

## 🔄 Flujo de Refresh Automático

### 1. Usuario hace una petición
```
Cliente → /api/nodes → Backend (con access_token)
```

### 2. Token expirado (401)
```
Cliente ← 401 Unauthorized
    ↓
fetchWithAuth detecta 401
    ↓
Llama a /api/auth/refresh
    ↓
Next.js → Backend /v1/auth/refresh (con refresh_token cookie)
    ↓
Backend valida refresh_token
    ↓
Backend ← Nuevo access_token
    ↓
Next.js guarda nuevo access_token en cookie
    ↓
Cliente reintenta petición original
    ↓
Cliente → /api/nodes → Backend (con NUEVO access_token)
    ↓
Cliente ← 200 OK con datos
```

### 3. Refresh fallido
```
Cliente ← 401 de /api/auth/refresh
    ↓
fetchWithAuth detecta fallo
    ↓
Redirect automático a /login
```

## 📁 Archivos Clave

### Cliente (Browser)

**`lib/api/fetch-client.ts`**
- `fetchWithAuth()` - Wrapper de fetch con retry automático
- `refreshAccessToken()` - Maneja el refresh con deduplicación
- `logout()` - Limpia sesión y redirige

**`lib/hooks/useNodes.ts`**
- Usa `fetchWithAuth()` para todas las peticiones
- Manejo automático de tokens expirados

### Servidor (Next.js API Routes)

**`app/api/auth/refresh/route.ts`**
- Llama a backend `/v1/auth/refresh`
- Guarda nuevo `access_token` en cookie
- Propaga `refresh_token` si el backend lo actualiza

**`app/api/nodes/route.ts`**
- Lee `access_token` de cookies
- Llama al backend con el token
- Retorna 401 si no hay token

## 🎯 Características

### ✅ Ventajas

1. **Transparente**: El usuario no nota cuando se refresca el token
2. **Seguro**: Tokens httpOnly no accesibles desde JavaScript
3. **Eficiente**: Deduplicación de refreshes simultáneos
4. **Automático**: No requiere intervención del usuario
5. **Resiliente**: Manejo de errores y fallback a login

### 🔒 Seguridad

- **httpOnly cookies**: Previene XSS
- **SameSite=Lax**: Previene CSRF
- **Secure en producción**: Solo HTTPS
- **Tokens de corta duración**: Limita ventana de ataque
- **Refresh controlado**: Solo desde el servidor Next.js

## 🛠️ Uso en Componentes

### Ejemplo: Petición con auto-refresh

```typescript
import { fetchWithAuth } from "@/lib/api/fetch-client";

// En cualquier componente
const response = await fetchWithAuth("/api/nodes");
const data = await response.json();

// Si el token está expirado:
// 1. Se refresca automáticamente
// 2. Se reintenta la petición
// 3. El usuario no nota nada
```

### Ejemplo: Hook personalizado

```typescript
import { useNodes } from "@/lib/hooks";

function MyComponent() {
  const { nodes, isLoading, error } = useNodes();
  
  // useNodes usa fetchWithAuth internamente
  // Manejo automático de refresh
}
```

## 🔄 Estados del Token

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Token Válido → 200 OK                             │
│       ↓                                             │
│  Token Expira (tiempo)                             │
│       ↓                                             │
│  Petición → 401                                    │
│       ↓                                             │
│  Auto Refresh                                      │
│       ↓                                             │
│  ┌─────────┬──────────┐                            │
│  │         │          │                            │
│  ✓ OK     ✗ Fail    ✗ Network Error               │
│  │         │          │                            │
│  Retry    Logout    Logout                        │
│  │                                                  │
│  └──→ Token Válido                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 📊 Tiempos de Expiración

| Token | Duración | Renovación |
|-------|----------|------------|
| Access | 15 min | Cada 401 |
| Refresh | 30 días | En cada refresh |

## 🚀 Testing

### Simular token expirado
```typescript
// Forzar expiración esperando 15 minutos
// O manipular la cookie manualmente en DevTools
```

### Verificar logs
```
[CLIENT] Received 401, attempting token refresh
[REFRESH] Response status: 200
[REFRESH] Has access_token: true
[REFRESH] Setting new access token
[CLIENT] Token refreshed successfully
[CLIENT] Retrying original request with new token
[NODES] Access token from cookie: eyJhbGciOiJIUzI1NiIs...
```

## 🔧 Troubleshooting

### Token no se refresca
- Verificar que `refresh_token` cookie existe
- Verificar configuración de cookies (httpOnly, SameSite)
- Verificar que el backend acepta el refresh_token

### Loop infinito
- Verificar que el endpoint `/api/auth/refresh` no devuelve 401
- Verificar que `isRefreshing` flag funciona correctamente

### Logout automático inesperado
- Verificar logs del servidor
- Verificar que el backend no está rechazando el refresh_token
