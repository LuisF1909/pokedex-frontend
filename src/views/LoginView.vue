<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card fade-in">
      <div class="auth-header">
        <div class="pokeball-icon">
          <div class="pokeball-top"></div>
          <div class="pokeball-center"></div>
          <div class="pokeball-bottom"></div>
        </div>
        <h1>Pokédex</h1>
        <p>Inicia sesión para explorar</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="alert alert-error" v-if="error">{{ error }}</div>

        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="tu@email.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          <span v-if="loading" class="spinner spinner-sm"></span>
          <span v-else>Iniciar Sesión</span>
        </button>
      </form>

      <p class="auth-footer">
        ¿No tienes cuenta?
        <router-link to="/register">Regístrate aquí</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(220, 10, 45, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 50%, rgba(59, 94, 255, 0.08) 0%, transparent 50%),
    var(--bg-primary);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-xl);
  padding: 40px 32px;
  box-shadow: var(--shadow-lg);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.pokeball-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: 50%;
  border: 3px solid var(--text-muted);
  position: relative;
  overflow: hidden;
}
.pokeball-top {
  height: 50%;
  background: var(--accent-red);
}
.pokeball-bottom {
  height: 50%;
  background: var(--text-primary);
}
.pokeball-center {
  width: 14px;
  height: 14px;
  background: var(--bg-card);
  border: 3px solid var(--text-muted);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.auth-header h1 {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent-red), var(--accent-gold));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-header p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 4px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.btn-full {
  width: 100%;
  padding: 14px;
  font-size: 1rem;
  margin-top: 6px;
}

.spinner-sm {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.auth-footer a {
  font-weight: 600;
}
</style>
