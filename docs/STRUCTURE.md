# Estructura del Proyecto - AutoHost Cloud Lite

## 📁 Organización del Código

```
autohost-cloud-lite/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route Group: Autenticación
│   │   ├── login/
│   │   │   └── page.tsx         # Página de login
│   │   └── register/
│   │       └── page.tsx         # Página de registro
│   ├── (dashboard)/              # Route Group: Dashboard protegido
│   │   ├── layout.tsx           # Layout con Header + Sidebar
│   │   ├── page.tsx             # Dashboard principal (/)
│   │   ├── nodes/
│   │   │   └── page.tsx         # Lista de nodos (/nodes)
│   │   ├── alerts/
│   │   │   └── page.tsx         # Alertas (/alerts)
│   │   └── settings/
│   │       └── page.tsx         # Configuración (/settings)
│   ├── api/                     # API Routes (BFF)
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── me/route.ts
│   │   │   ├── refresh/route.ts
│   │   │   └── register/route.ts
│   │   └── nodes/
│   │       └── route.ts
│   ├── layout.tsx               # Root layout
│   └── globals.css
│
├── components/
│   ├── features/                # Componentes reutilizables
│   │   └── nodes/
│   │       ├── ServerCard.tsx
│   │       └── index.ts
│   ├── layout/                  # Componentes de layout
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── index.ts
│   └── ui/                      # shadcn/ui components
│
├── lib/
│   ├── api/                     # Cliente HTTP y API calls
│   │   ├── client.ts
│   │   ├── cookies.ts
│   │   ├── auth.ts
│   │   ├── nodes.ts
│   │   └── index.ts
│   ├── hooks/                   # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useNodes.ts
│   │   └── index.ts
│   ├── types/                   # TypeScript types
│   │   ├── auth.ts
│   │   ├── node.ts
│   │   └── index.ts
│   └── utils.ts
│
├── config/
│   └── constants.ts             # Constantes globales
│
└── public/                      # Archivos estáticos
```

## 🎯 Route Groups en Next.js

### `(auth)/`
- **Propósito**: Rutas de autenticación
- **Sin layout compartido**: Cada página tiene su propio diseño
- **Rutas**: `/login`, `/register`

### `(dashboard)/`
- **Propósito**: Rutas protegidas de la aplicación
- **Con layout compartido**: Header + Sidebar en todas las páginas
- **Rutas**: `/`, `/nodes`, `/alerts`, `/settings`

## 🔄 Flujo de Navegación

```
Usuario visita /login
    ↓
Página: app/(auth)/login/page.tsx
    ↓
Hace login exitoso
    ↓
Redirect a /
    ↓
Layout: app/(dashboard)/layout.tsx
    ↓
Página: app/(dashboard)/page.tsx (Dashboard)
```

## 📝 Diferencia Clave

### ❌ Antes (Incorrecto)
```
components/features/dashboard/DashboardView.tsx  # Vista en componentes
app/page.tsx  # Cambia vistas con estado
```

### ✅ Ahora (Correcto)
```
app/(dashboard)/page.tsx           # Vista del dashboard
app/(dashboard)/nodes/page.tsx     # Vista de nodos
app/(dashboard)/alerts/page.tsx    # Vista de alertas
app/(dashboard)/settings/page.tsx  # Vista de configuración

components/features/nodes/ServerCard.tsx  # Solo componente reutilizable
```

## 🎨 Beneficios

1. **File-based routing**: Las rutas se determinan por la estructura de carpetas
2. **Layouts compartidos**: El layout del dashboard se aplica automáticamente
3. **Separación clara**: Páginas en `app/`, componentes en `components/`
4. **SEO friendly**: Cada página puede tener sus propios metadatos
5. **Code splitting**: Next.js divide el código automáticamente por ruta
