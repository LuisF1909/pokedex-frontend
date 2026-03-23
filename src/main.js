import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Check auth state before mounting
const authStore = useAuthStore()
authStore.checkAuth()

app.mount('#app')

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(async (registration) => {
        console.log('SW registrado con éxito:', registration.scope);

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Permiso de notificaciones concedido.');

          const publicVapidKey = 'BBZJ9vucGxeET5rpbomJc8xz9-FuAoHApWsncC23wDKYW8pz9rXLdVDEeTNdqDg5pCS3CXqt754p1ifMEEDYFoo';

          const urlBase64ToUint8Array = (base64String) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding)
              .replace(/-/g, '+')
              .replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
          };

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          });

          // Enviar suscripción al backend (con token JWT para guardarla en BD)
          const token = localStorage.getItem('token');
          await fetch('http://localhost:3000/api/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          console.log('Usuario suscrito a Push y enviado al Backend');
        } else {
          console.log('Permiso de notificaciones denegado.');
        }

      })
      .catch((err) => {
        console.log('SW falló al registrarse:', err);
      });
  });
}