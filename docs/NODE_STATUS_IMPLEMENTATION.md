# Implementación de Estado Dinámico de Nodos

## 📋 Resumen

Los nodos ahora calculan su estado (`online`/`offline`) dinámicamente basándose en el campo `LastSeenAt` de la base de datos.

## 🔄 Lógica de Estado

### Regla Principal
- **Online**: Si `LastSeenAt` < 45 segundos atrás
- **Offline**: Si `LastSeenAt` >= 45 segundos atrás (3 intervalos × 15s)

### Parámetros Configurables
```typescript
intervalSeconds = 15      // Intervalo de heartbeat del agente
maxMissedIntervals = 3    // Número de intervalos perdidos antes de offline
```

## 📁 Archivos Creados/Modificados

### 1. `lib/utils/node-status.ts` (NUEVO)
Funciones utilitarias para calcular el estado del nodo:

```typescript
// Calcula si el nodo está online u offline
calculateNodeStatus(lastSeenAt: string, intervalSeconds = 15, maxMissedIntervals = 3)

// Formatea el tiempo transcurrido desde el último heartbeat
getTimeSinceLastSeen(lastSeenAt: string) // "2 min ago", "1 hour ago", etc.
```

### 2. `lib/api/nodes.ts`
- Importa `calculateNodeStatus`
- Calcula el estado dinámicamente en `mapNodeFromBackend()`
```typescript
status: calculateNodeStatus(node.LastSeenAt)
```

### 3. `lib/hooks/useNodes.ts`
- Importa `calculateNodeStatus`
- Actualiza cada **10 segundos** (antes 30s) para detectar cambios de estado más rápido
- Calcula estado en cada fetch
```typescript
status: calculateNodeStatus(node.LastSeenAt)
```

### 4. `components/features/nodes/ServerCard.tsx`
- Importa `getTimeSinceLastSeen`
- Agrega sección "Last Seen" con icono de reloj
- Muestra tiempo transcurrido de forma legible

### 5. `app/(dashboard)/nodes/page.tsx`
- Usa datos reales del hook `useNodes`
- Muestra `getTimeSinceLastSeen` en la tabla
- Reemplaza datos mock con nodos reales

### 6. `lib/utils.ts`
- Re-exporta funciones de `node-status` para facilitar imports

## 🔍 Flujo de Actualización

```
Backend actualiza LastSeenAt cada 15s
        ↓
useNodes hace fetch cada 10s
        ↓
calculateNodeStatus() compara LastSeenAt con tiempo actual
        ↓
Si diff > 45s → status = "offline"
Si diff ≤ 45s → status = "online"
        ↓
UI se actualiza automáticamente
```

## ⏱️ Tiempos Clave

| Evento | Tiempo |
|--------|--------|
| Heartbeat del agente | Cada 15 segundos |
| Refresh del dashboard | Cada 10 segundos |
| Tolerancia offline | 45 segundos (3 × 15s) |
| Detección de cambio de estado | Máximo 10 segundos |

## 💡 Ejemplos

### Nodo Online
```
LastSeenAt: "2024-12-09T10:00:00Z"
Ahora:      "2024-12-09T10:00:30Z"
Diff:       30 segundos
Estado:     🟢 online
Mostrar:    "30 sec ago"
```

### Nodo Offline
```
LastSeenAt: "2024-12-09T10:00:00Z"
Ahora:      "2024-12-09T10:02:00Z"
Diff:       120 segundos (> 45s)
Estado:     🔴 offline
Mostrar:    "2 min ago"
```

## 🎯 Beneficios

1. **Estado en tiempo real**: Se actualiza automáticamente sin refresh manual
2. **Detección rápida**: Máximo 10 segundos para detectar un nodo caído
3. **Información visual**: "Last seen" ayuda a diagnosticar problemas
4. **Configurable**: Intervalos ajustables según necesidades
5. **Automático**: No requiere intervención del usuario

## 🔧 Configuración Personalizada

Para cambiar los tiempos de detección:

```typescript
// En lib/utils/node-status.ts
calculateNodeStatus(
  lastSeenAt, 
  30,  // intervalSeconds: heartbeat cada 30s
  2    // maxMissedIntervals: offline después de 2 intervalos (60s)
)
```

## 📊 Mejoras Futuras

- [ ] Agregar estado "warning" cuando el nodo lleva 1-2 intervalos sin responder
- [ ] Mostrar gráfico de uptime histórico
- [ ] Alertas cuando un nodo pasa a offline
- [ ] Ping manual para verificar conectividad
