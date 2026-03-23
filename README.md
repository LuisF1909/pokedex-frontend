# Pokédex PWA — Frontend

Aplicación web progresiva construida con **Vue 3** + **Vite** + **Pinia** para explorar, coleccionar y batallar con Pokémon.

## Tecnologías

- **Vue 3** (Composition API + `<script setup>`)
- **Vite 7** — Bundler ultrarrápido
- **Pinia** — Estado global (autenticación)
- **Vue Router 4** — Navegación con guards de autenticación
- **Axios** — Cliente HTTP con interceptores JWT
- **Web Push** — Notificaciones push

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run dev
# Servidor de desarrollo en http://localhost:5173
```

## Estructura del Proyecto

```
src/
  ├── assets/main.css       # Design system (dark theme, variables, componentes)
  ├── services/api.js       # Axios con interceptores JWT
  ├── stores/auth.js        # Pinia store de autenticación
  ├── router/index.js       # Rutas con guards (guest/auth)
  ├── views/
  │   ├── LoginView.vue     # Inicio de sesión
  │   ├── RegisterView.vue  # Registro (muestra código de amigo)
  │   ├── HomeView.vue      # Grid de Pokémon con filtros
  │   ├── PokemonDetailView.vue  # Detalle: stats, tipos, evoluciones
  │   └── ProfileView.vue   # Favoritos, equipos, amigos, batallas
  └── App.vue               # Layout con navbar + mobile nav
```

## Características

- **Autenticación** — Registro por email, login con JWT persistente
- **Pokédex** — Grid con búsqueda por nombre, filtro por tipo y región
- **Detalle** — Estadísticas base, tipos, descripción, peso, altura, cadena evolutiva
- **Favoritos** — Agregar/eliminar desde detalle, editar notas personalizadas
- **Equipos** — Crear, editar y eliminar equipos de hasta 6 Pokémon
- **Amigos** — Agregar por código único (PK-XXXXXX)
- **Batallas** — Reta a amigos con tu equipo, resultado basado en stats y tipos reales
- **PWA** — Service Worker, push notifications, manifest
