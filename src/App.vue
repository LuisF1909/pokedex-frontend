<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAuthPage = computed(() => route.name === 'login' || route.name === 'register')

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <!-- Navbar (only when authenticated) -->
  <nav v-if="isAuthenticated && !isAuthPage" class="navbar">
    <div class="navbar-inner">
      <router-link to="/" class="navbar-brand">
        <span class="brand-icon">◓</span>
        <span class="brand-text">Pokédex</span>
      </router-link>

      <div class="navbar-links">
        <router-link to="/" class="nav-link" :class="{ active: route.name === 'home' }">
          Pokédex
        </router-link>
        <router-link to="/profile" class="nav-link" :class="{ active: route.name === 'profile' }">
          Mi Perfil
        </router-link>
        <button @click="handleLogout" class="btn btn-secondary btn-sm nav-logout">
          Salir
        </button>
      </div>
    </div>
  </nav>

  <router-view />

  <!-- Mobile bottom nav -->
  <div v-if="isAuthenticated && !isAuthPage" class="mobile-nav">
    <router-link to="/" class="mobile-nav-item" :class="{ active: route.name === 'home' }">
      <span class="mobile-icon">🔴</span>
      <span>Pokédex</span>
    </router-link>
    <router-link to="/profile" class="mobile-nav-item" :class="{ active: route.name === 'profile' }">
      <span class="mobile-icon">👤</span>
      <span>Perfil</span>
    </router-link>
    <button @click="handleLogout" class="mobile-nav-item">
      <span class="mobile-icon">🚪</span>
      <span>Salir</span>
    </button>
  </div>
</template>

<style scoped>
/* Navbar */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--navbar-height);
  background: rgba(15, 15, 26, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  z-index: 100;
}

.navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-primary);
}
.brand-icon {
  font-size: 1.6rem;
  color: var(--accent-red);
}
.brand-text {
  font-size: 1.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent-red), var(--accent-gold));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: 8px;
  transition: all var(--transition-fast);
  text-decoration: none;
}
.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}
.nav-link.active {
  color: var(--accent-red);
  background: rgba(220, 10, 45, 0.1);
}

.nav-logout {
  margin-left: 8px;
}

/* Mobile Bottom Nav */
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(15, 15, 26, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--border-color);
  z-index: 100;
}

.mobile-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  background: none;
  border: none;
  font-family: var(--font-family);
  cursor: pointer;
  transition: color var(--transition-fast);
}
.mobile-nav-item.active {
  color: var(--accent-red);
}
.mobile-icon {
  font-size: 1.2rem;
}

@media (max-width: 640px) {
  .navbar-links {
    display: none;
  }
  .mobile-nav {
    display: flex;
  }
}
</style>
