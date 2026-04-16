// Nombres de las caches
const APP_SHELL_CACHE = 'appShell_v1';
const DYNAMIC_CACHE = 'dynamic_v1';
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// --- EVENTOS DE INSTALACIÓN Y ACTIVACIÓN (Tu código anterior) ---
self.addEventListener('install', (event) => {
  const cachePromise = caches.open(APP_SHELL_CACHE).then(cache => cache.addAll(APP_SHELL_FILES));
  self.skipWaiting();
  event.waitUntil(cachePromise);
});

self.addEventListener('activate', (event) => {
  const limpiarCache = caches.keys().then(keys => Promise.all(
    keys.map(key => {
      if (key !== APP_SHELL_CACHE && key !== DYNAMIC_CACHE) return caches.delete(key);
    })
  ));
  event.waitUntil(limpiarCache);
  return self.clients.claim();
});

// ========================================================================
// REQUISITO 1: FUNCIONES PARA MANEJAR INDEXEDDB
// ========================================================================

// Abre (o crea) la base de datos IndexedDB
function abrirBD() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PokedexOfflineDB', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      db.createObjectStore('peticionesFallidas', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Guarda una petición fallida
function guardarEnIndexedDB(url, method, body, authHeader) {
  return abrirBD().then(db => {
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction('peticionesFallidas', 'readwrite');
      const store = transaccion.objectStore('peticionesFallidas');
      store.add({ url, method, body, authHeader });
      transaccion.oncomplete = () => resolve();
      transaccion.onerror = () => reject();
    });
  });
}

// Obtiene todas las peticiones guardadas
function obtenerDeIndexedDB() {
  return abrirBD().then(db => {
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction('peticionesFallidas', 'readonly');
      const store = transaccion.objectStore('peticionesFallidas');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

// Elimina una petición de la base de datos por su ID
function eliminarDeIndexedDB(id) {
  return abrirBD().then(db => {
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction('peticionesFallidas', 'readwrite');
      const store = transaccion.objectStore('peticionesFallidas');
      store.delete(id);
      transaccion.oncomplete = () => resolve();
      transaccion.onerror = () => reject();
    });
  });
}

// ========================================================================
// REQUISITO 2: INTERCEPTAR PETICIONES Y GENERAR TAREA ASÍNCRONA
// ========================================================================

self.addEventListener('fetch', (event) => {
  
  // A. SI ES UNA PETICIÓN QUE ENVÍA DATOS (POST, PUT, DELETE)
  if (event.request.method !== 'GET') {
    const respuestaOffline = fetch(event.request.clone())
      .catch((error) => {
        // "Cuando una peticion HTTP no se ejecute correctamente por falta de conexion"
        const authHeader = event.request.headers.get('Authorization');
        return event.request.clone().text().then((bodyString) => {

          // "guarde en indexedDB"
          return guardarEnIndexedDB(event.request.url, event.request.method, bodyString, authHeader);
          
        }).then(() => {
          
          // "genere tarea asíncrona" (Background Sync)
          return self.registration.sync.register('sync-peticiones-offline');
          
        }).then(() => {
          // Devolvemos una respuesta falsa para que la app no colapse
          return new Response(JSON.stringify({ offline: true, mensaje: "Guardado localmente. Se sincronizará al recuperar internet." }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      });

    event.respondWith(respuestaOffline);
    return; // Importante para que no siga con el código de abajo
  }

  // B. SI ES UNA PETICIÓN GET (Para mostrar páginas y datos - Tu código anterior)
  const respuestaGET = fetch(event.request)
    .then((newResp) => {
      return caches.open(DYNAMIC_CACHE).then((cache) => {
        cache.put(event.request, newResp.clone());
        return newResp;
      });
    })
    .catch((err) => {
      return caches.match(event.request);
    });

  event.respondWith(respuestaGET);
});

// ========================================================================
// REQUISITO 3: LISTENER SYNC (Ejecuta y elimina)
// ========================================================================

// "En el SW, crear un listener sync que ejecute peticiones HTTP guardados"
self.addEventListener('sync', (event) => {
  console.log('SW: Evento Sync detectado:', event.tag);
  
  if (event.tag === 'sync-peticiones-offline') {
    const sincronizarDatos = obtenerDeIndexedDB().then((peticiones) => {
      
      // Recorremos todas las peticiones guardadas
      return Promise.all(peticiones.map((pet) => {
        
        // Las enviamos de nuevo a internet
        const headers = { 'Content-Type': 'application/json' };
        if (pet.authHeader) headers['Authorization'] = pet.authHeader;

        return fetch(pet.url, {
          method: pet.method,
          headers,
          body: pet.body
        }).then((respuestaServidor) => {
          
          if (respuestaServidor.ok) {
            // "y los elimine" (Si se envió bien, la borramos de IndexedDB)
            console.log('SW: Petición sincronizada con éxito!', pet.url);
            return eliminarDeIndexedDB(pet.id);
          }
          
        }).catch(err => console.log('SW: Aún no hay internet para sincronizar', err));
      }));
    });

    // event.waitUntil asegura que el Service Worker no se apague hasta terminar
    event.waitUntil(sincronizarDatos);
  }
});

// ========================================================================
// REQUISITO: NOTIFICACIONES PUSH EN EL SW
// ========================================================================

// Escuchamos el evento 'push' que nos envía nuestro servidor Express
self.addEventListener('push', (event) => {
  console.log('SW: Notificación Push recibida');

  // Valores por defecto por si falla algo
  let data = { titulo: 'Nueva Notificación', mensaje: 'Tienes una actualización en la Pokedex' };
  
  // Extraemos el JSON que enviamos desde el Backend (el payload)
  if (event.data) {
    data = event.data.json(); 
  }

  // Configuramos cómo se verá la notificación en el celular o PC
  const opciones = {
    body: data.mensaje,
    icon: '/icon.png', // Tu icono del manifest
    badge: '/icon.png', // Icono pequeño para la barra de estado
    vibrate: [200, 100, 200], // Patrón de vibración
    data: {
      url: '/' // A dónde ir si el usuario hace clic en la notificación
    }
  };

  // Mostramos la notificación usando la API del Service Worker
  event.waitUntil(
    self.registration.showNotification(data.titulo, opciones)
  );
});

// Evento para cuando el usuario hace clic en la notificación
self.addEventListener('notificationclick', (event) => {
  const notificacion = event.notification;
  const url = notificacion.data.url;

  notificacion.close(); // Cerramos la notificación emergente

  // Abrimos la app en la ruta que definimos
  event.waitUntil(
    clients.openWindow(url)
  );
});