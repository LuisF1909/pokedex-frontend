// ARCHIVO: pokedex/public/sw.js

// 1. Nombres de las caches (versiones)
const APP_SHELL_CACHE = 'appShell_v1';
const DYNAMIC_CACHE = 'dynamic_v1';

// 2. Archivos fijos de la aplicación (APP SHELL)
// Estos son los que se descargarán sí o sí al instalar.
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/App.vue',
  // Agrega aquí los archivos que aparecían en tu foto si los tienes creados:
  // '/src/pages/LoginPage.vue', 
  // Nota: En Vite, los archivos .jsx o .vue se transforman, pero pondremos estos por ahora
  // siguiendo tu ejemplo.
  'https://api.iconify.design/ri.json?icons=moon-clear-fill' 
];

// EVENTO INSTALL: Se dispara cuando el navegador encuentra el SW por primera vez
self.addEventListener('install', (event) => {
  console.log('SW: Instalando...');
  
  const cachePromise = caches.open(APP_SHELL_CACHE).then((cache) => {
    // "Instala cache de APP SHELL"
    return cache.addAll(APP_SHELL_FILES);
  });

  // "Activar nuevo SW automaticamente" (Parte 1: No esperar)
  self.skipWaiting(); 
  
  event.waitUntil(cachePromise);
});

// EVENTO ACTIVATE: Se dispara cuando el SW toma el control
self.addEventListener('activate', (event) => {
  console.log('SW: Activando y limpiando...');

  const limpiarCache = caches.keys().then((keys) => {
    return Promise.all(
      keys.map((key) => {
        // "Eliminar cache vieja"
        // Si la cache no se llama igual a las nuevas versiones, bórrala.
        if (key !== APP_SHELL_CACHE && key !== DYNAMIC_CACHE) {
          return caches.delete(key);
        }
      })
    );
  });

  event.waitUntil(limpiarCache);
  
  // "Activar nuevo SW automaticamente" (Parte 2: Tomar control inmediato)
  return self.clients.claim(); 
});

// EVENTO FETCH: Intercepta cada petición a internet
self.addEventListener('fetch', (event) => {
  
  // Solo nos interesan peticiones GET
  if (event.request.method !== 'GET') return;

  const respuesta = fetch(event.request)
    .then((newResp) => {
      // SI HAY INTERNET:
      
      // Si la respuesta es válida, la guardamos en el cache dinámico
      // "Carga cache dinámico"
      return caches.open(DYNAMIC_CACHE).then((cache) => {
        cache.put(event.request, newResp.clone());
        return newResp;
      });
    })
    .catch((err) => {
      // SI NO HAY INTERNET (OFFLINE):
      
      // "Carga desde cache las peticiones offline"
      console.log('SW: Offline activado, buscando en cache...');
      return caches.match(event.request);
    });

  event.respondWith(respuesta);
});