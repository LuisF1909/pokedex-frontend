import { io } from 'socket.io-client'
import { ref, reactive } from 'vue'
import router from '@/router'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const socket = ref(null)
const isConnected = ref(false)

// ============================================================
// ESTADO GLOBAL DE BATALLA (listeners se registran UNA VEZ en
// connectSocket, así los eventos no se pierden si el usuario
// no está en ProfileView).
// ============================================================
const battleState = reactive({
  pendingInvitation: null,       // { challengeId, challengerEmail, challengerId }
  showInvitationModal: false,
  challengeSent: false,           // true mientras esperamos respuesta del amigo
  challengeMsg: '',
  challengeError: '',
  loading: false,                 // "Cargando datos de los Pokémon..."
})

function resetBattleState() {
  battleState.pendingInvitation = null
  battleState.showInvitationModal = false
  battleState.challengeSent = false
  battleState.challengeMsg = ''
  battleState.challengeError = ''
  battleState.loading = false
}

function attachBattleListeners(s) {
  // Protección contra doble registro si connectSocket se llama dos veces
  if (s._battleListenersAttached) return
  s._battleListenersAttached = true

  // Reto recibido (soy el retado)
  s.on('battle-invitation', (data) => {
    battleState.pendingInvitation = data
    battleState.showInvitationModal = true
    // Si no estoy en perfil, llevarme ahí para que vea/acepte el modal
    if (router.currentRoute.value.name !== 'profile') {
      router.push('/profile')
    }
  })

  // Confirmación de que mi reto se envió (soy el retador)
  s.on('challenge-sent', (data) => {
    battleState.challengeSent = true
    battleState.challengeMsg = data?.message || 'Reto enviado, esperando respuesta...'
    battleState.challengeError = ''
  })

  // Mi reto fue rechazado
  s.on('challenge-rejected', (data) => {
    battleState.challengeSent = false
    battleState.challengeError = data?.message || 'Tu reto ha sido rechazado'
    battleState.challengeMsg = ''
  })

  // El server está cargando los datos de pokémon de ambos equipos
  s.on('battle-loading', () => {
    battleState.loading = true
    battleState.challengeMsg = 'Cargando datos de los Pokémon...'
  })

  // ¡La batalla arrancó! Guardar datos y navegar a la arena.
  // Esto funciona tanto para el retador como para el retado, sin
  // importar en qué vista estén.
  s.on('battle-start', (data) => {
    if (!data?.battleId) return
    sessionStorage.setItem(`battle_${data.battleId}`, JSON.stringify(data))
    // Limpiar estado de reto
    resetBattleState()
    router.push(`/battle/${data.battleId}`)
  })

  // Errores genéricos del servidor de batalla
  s.on('error-msg', (data) => {
    battleState.challengeError = data?.message || 'Error en la batalla'
    battleState.challengeSent = false
    battleState.loading = false
  })
}

export function connectSocket() {
  const token = localStorage.getItem('token')
  if (!token) return
  if (socket.value && socket.value.connected) return

  // Si había una instancia previa desconectada, la limpiamos
  if (socket.value) {
    try { socket.value.removeAllListeners(); socket.value.disconnect() } catch {}
    socket.value = null
  }

  socket.value = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  })

  socket.value.on('connect', () => {
    console.log('⚡ Socket conectado:', socket.value.id)
    isConnected.value = true
  })

  socket.value.on('disconnect', () => {
    console.log('❌ Socket desconectado')
    isConnected.value = false
  })

  socket.value.on('connect_error', (err) => {
    console.error('Socket error:', err.message)
    isConnected.value = false
  })

  attachBattleListeners(socket.value)
}

export function disconnectSocket() {
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
    isConnected.value = false
  }
  resetBattleState()
}

export function getSocket() {
  return socket.value
}

export { socket, isConnected, battleState, resetBattleState }
