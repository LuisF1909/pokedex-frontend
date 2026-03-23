<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref(null)
const loading = ref(false)

const handleRegister = async () => {
  error.value = ''
  success.value = null

  if (password.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  if (password.value.length < 4) {
    error.value = 'La contraseña debe tener al menos 4 caracteres.'
    return
  }

  loading.value = true
  try {
    const data = await authStore.register(email.value, password.value)
    success.value = data
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
        <h1>Crear Cuenta</h1>
        <p>Únete a la Pokédex</p>
      </div>

      <!-- Success state -->
      <div v-if="success" class="register-success">
        <div class="success-icon">✓</div>
        <h2>¡Registro exitoso!</h2>
        <p>Tu código de amigo es:</p>
        <div class="friend-code">{{ success.user.friend_code }}</div>
        <p class="friend-code-hint">Compártelo para que otros te agreguen</p>
        <router-link to="/login" class="btn btn-primary btn-full" style="margin-top:20px;">
          Ir a Iniciar Sesión
        </router-link>
      </div>

      <!-- Register form -->
      <form v-else @submit.prevent="handleRegister" class="auth-form">
        <div class="alert alert-error" v-if="error">{{ error }}</div>

        <div class="form-group">
          <label class="form-label" for="reg-email">Email</label>
          <input
            id="reg-email"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="tu@email.com"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-password">Contraseña</label>
          <input
            id="reg-password"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="Mínimo 4 caracteres"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-confirm">Confirmar Contraseña</label>
          <input
            id="reg-confirm"
            v-model="confirmPassword"
            type="password"
            class="form-input"
            placeholder="Repite tu contraseña"
            required
          />
        </div>

        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          <span v-if="loading" class="spinner spinner-sm"></span>
          <span v-else>Registrarme</span>
        </button>
      </form>

      <p v-if="!success" class="auth-footer">
        ¿Ya tienes cuenta?
        <router-link to="/login">Inicia sesión</router-link>
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

.auth-header h1 {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
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

.register-success {
  text-align: center;
}
.success-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: var(--accent-green);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  font-weight: 700;
}
.register-success h2 {
  font-size: 1.3rem;
  margin-bottom: 8px;
}
.register-success p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.friend-code {
  margin: 12px 0 4px;
  padding: 14px;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 3px;
  background: var(--bg-secondary);
  border: 1px dashed var(--accent-gold);
  border-radius: var(--border-radius);
  color: var(--accent-gold);
}
.friend-code-hint {
  font-size: 0.8rem !important;
  color: var(--text-muted) !important;
}
</style>
