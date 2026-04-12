import { io } from 'socket.io-client'
import { ref } from 'vue'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const socket = ref(null)
const isConnected = ref(false)

export function connectSocket() {
  const token = localStorage.getItem('token')
  if (!token || (socket.value && socket.value.connected)) return

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
}

export function disconnectSocket() {
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
    isConnected.value = false
  }
}

export function getSocket() {
  return socket.value
}

export { socket, isConnected }
