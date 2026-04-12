# Pokédex Frontend

Aplicación web progresiva (PWA) construida con **Vue 3 + Vite** que permite explorar Pokémon, gestionar favoritos, crear equipos, agregar amigos y batallar en tiempo real.

## Tecnologías

| Tecnología | Uso |
|---|---|
| **Vue 3** | Framework frontend con Composition API y `<script setup>` |
| **Vite 7** | Build tool y dev server |
| **Pinia** | Store de estado global (autenticación) |
| **Vue Router** | Navegación SPA con guards de autenticación |
| **Axios** | Cliente HTTP con interceptores JWT |
| **Socket.IO Client** | WebSocket para batallas en tiempo real |
| **PWA** | Service Worker con caché, notificaciones push, manifest |

## Instalación

```bash
npm install
```

## Variables de Entorno

Crear archivo `.env` en la raíz:

```env
VITE_API_URL=http://localhost:3000
```

Para producción (Railway), cambiar a la URL del backend desplegado:

```env
VITE_API_URL=https://tu-backend.up.railway.app
```

## Ejecución

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

## Estructura del Proyecto

```
src/
├── assets/
│   └── main.css              # Design system completo (dark theme)
├── components/
│   └── PokemonPicker.vue     # Selector de Pokémon con búsqueda para equipos
├── router/
│   └── index.js              # Rutas con guards de autenticación
├── services/
│   ├── api.js                # Axios con interceptores JWT
│   └── socket.js             # Socket.IO para batallas en tiempo real
├── stores/
│   └── auth.js               # Pinia store: login, register, logout, checkAuth
├── views/
│   ├── LoginView.vue         # Login con email/password
│   ├── RegisterView.vue      # Registro con confirmación y código de amigo
│   ├── HomeView.vue          # Pokédex: grid, búsqueda, filtros tipo 1/2, región
│   ├── PokemonDetailView.vue # Detalle: stats, especie, evolución, favoritos
│   ├── ProfileView.vue       # Perfil: favoritos, equipos, amigos, batallas
│   └── BattleArenaView.vue   # Arena de batalla en tiempo real
├── App.vue                   # Layout: navbar, mobile nav, router-view
└── main.js                   # Bootstrap: Pinia, Router, SW, Push
```

## Funcionalidades

### 🔐 Autenticación
- Registro con email y contraseña
- Login con JWT (almacenado en localStorage)
- Interceptor automático para adjuntar token a peticiones
- Guard de navegación: rutas protegidas redirigen a login

### 🔴 Pokédex (Home)
- Grid de Pokémon con imágenes oficiales de alta calidad
- Scroll infinito con paginación (40 por carga)
- Búsqueda por nombre o número
- **Filtro por Tipo 1** (18 tipos)
- **Filtro por Tipo 2** (combinación de tipos: ej. Fire + Flying)
- **Filtro por Región** (9 regiones: Kanto → Paldea)
- Badges de tipo con colores oficiales
- Animaciones de entrada escalonadas

### 📋 Detalle de Pokémon
- Imagen artwork oficial
- Estadísticas base con barras de progreso animadas
- Tipos con badges de color
- Descripción (en español cuando está disponible)
- Peso y altura
- **Cadena evolutiva** interactiva (click para navegar)
- Botón agregar/quitar de favoritos

### ⭐ Favoritos
- Lista de Pokémon favoritos con imagen
- **Características personalizadas** editables (notas del usuario)
- Eliminar favoritos

### 🎮 Equipos
- Crear equipos con nombre y hasta 6 Pokémon
- **PokemonPicker**: buscador con dropdown y chips de selección
- Editar nombre y composición de equipos
- Eliminar equipos

### 👥 Amigos
- Agregar amigos por **código único** (PK-XXXXXX)
- Ver lista de amigos con email y código
- El código se genera automáticamente al registrarse

### ⚔️ Batallas en Tiempo Real
- Seleccionar equipo propio
- Seleccionar amigo para retar
- El amigo recibe una **invitación en tiempo real** (modal)
- El amigo elige su equipo y acepta/rechaza
- **Arena de batalla**:
  - Sprites de ambos Pokémon activos
  - Barras de HP animadas con colores (verde/amarillo/rojo)
  - Indicador de equipo (dots activo/derrotado)
  - Botones de movimientos con tipo, poder y clase
  - Log de batalla en tiempo real
  - Animación de golpe (shake)
  - Pantalla de resultado (victoria/derrota)
- Funciona entre **dos dispositivos diferentes** (celulares, PCs, etc.)

### 📱 PWA
- Service Worker con caché (app shell + dinámico)
- Manifest con iconos y splash screen
- Notificaciones push (invitaciones de amistad, retos de batalla)
- Funcionalidad offline básica

## Design System

Tema oscuro premium con:
- **Fuente**: Inter (Google Fonts)
- **Colores**: Pokémon Red (#DC0A2D), Blue (#3B5EFF), Gold (#F0C040), Green (#3DD68C), Purple (#A855F7)
- **Efectos**: glassmorphism, glow shadows, gradients
- **Animaciones**: fadeInUp, spin, shakeHit, floatUp
- **Responsive**: Mobile-first con bottom nav para móvil y navbar superior para escritorio

## Despliegue

### Railway (Frontend estático)

1. Hacer build: `npm run build`
2. Servir la carpeta `dist/` como sitio estático en Railway
3. Configurar variable de entorno:
   - `VITE_API_URL` = URL del backend en Railway

### Alternativa: GitHub Pages / Netlify / Vercel

El build genera archivos estáticos en `dist/`. Compatible con cualquier CDN estático.

> **Importante:** Para que las batallas en tiempo real funcionen, la variable `VITE_API_URL` debe apuntar al backend desplegado (no a localhost). Se establece en **build time**, no en runtime.
