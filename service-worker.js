/**
 * Service Worker CrimiTrack PWA
 * Gestion du cache intelligent et mode offline
 */

const CACHE_VERSION = 'crimitrack-v4.1.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

// Détection du type d'appareil
const getDeviceType = () => {
  const ua = self.navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Mac/.test(ua)) return 'MacBook';
  return 'unknown';
};

const DEVICE_TYPE = getDeviceType();

// Configuration cache par appareil
const CACHE_CONFIG = {
  iPhone: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    maxSize: 500 * 1024 * 1024, // 500MB
    dataRetention: 90 * 24 * 60 * 60 * 1000, // 3 mois
    imageQuality: 0.6
  },
  iPad: {
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 jours
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    dataRetention: 180 * 24 * 60 * 60 * 1000, // 6 mois
    imageQuality: 0.8
  },
  MacBook: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    dataRetention: null, // Illimité
    imageQuality: 1.0
  }
};

const config = CACHE_CONFIG[DEVICE_TYPE] || CACHE_CONFIG.iPad;

// Fichiers essentiels à mettre en cache
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/pwa-styles.css',
  '/assets/css/pwa-animations.css',
  '/assets/js/app.js',
  '/assets/images/apple-touch-icon.png',
  '/assets/images/favicon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Modules à précharger selon l'appareil (chemins PWA)
const MODULE_FILES = {
  iPhone: [
    '/modules/dashboard/dashboard-pwa.js',
    '/modules/agenda/agenda-pwa.js',
    '/modules/waitlist/waitlist-pwa.js',
    '/modules/convocations/convocations-pwa.js'
  ],
  iPad: [
    '/modules/dashboard/dashboard-pwa.js',
    '/modules/agenda/agenda-pwa.js',
    '/modules/waitlist/waitlist-pwa.js',
    '/modules/convocations/convocations-pwa.js',
    '/modules/mailing/mailing-pwa.js',
    '/modules/synthese/synthese-pwa.js',
    '/modules/statistiques/statistiques-pwa.js'
  ],
  MacBook: [
    // Tous les modules PWA
    '/modules/dashboard/dashboard-pwa.js',
    '/modules/agenda/agenda-pwa.js',
    '/modules/waitlist/waitlist-pwa.js',
    '/modules/planning/planning-pwa.js',
    '/modules/convocations/convocations-pwa.js',
    '/modules/mailing/mailing-pwa.js',
    '/modules/import/import-pwa.js',
    '/modules/synthese/synthese-pwa.js',
    '/modules/statistiques/statistiques-pwa.js',
    '/modules/billing/billing-pwa.js',
    '/modules/indemnites/indemnites-pwa.js',
    '/modules/anonymisation/anonymisation-pwa.js',
    '/modules/prompt-mastering/prompt-mastering-pwa.js'
  ]
};

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installation en cours...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Mise en cache des fichiers statiques');
      const filesToCache = [
        ...STATIC_FILES,
        ...(MODULE_FILES[DEVICE_TYPE] || MODULE_FILES.iPad)
      ];
      return cache.addAll(filesToCache);
    }).then(() => {
      console.log('[SW] Installation réussie');
      return self.skipWaiting();
    })
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activation en cours...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName.startsWith('crimitrack-') && 
                   !cacheName.startsWith(CACHE_VERSION);
          })
          .map(cacheName => {
            console.log('[SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Activation réussie');
      return self.clients.claim();
    })
  );
});

// Stratégies de fetch selon le type de requête
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ne pas intercepter les requêtes non-HTTP(S)
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Stratégie pour l'API Tailscale
  if (url.hostname.includes('tail-scale.ts.net')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Stratégie pour les données API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }
  
  // Stratégie pour les images
  if (request.destination === 'image') {
    event.respondWith(cacheFirstWithNetworkFallback(request));
    return;
  }
  
  // Stratégie pour les fichiers statiques
  if (STATIC_FILES.includes(url.pathname) || 
      url.pathname.startsWith('/modules/') ||
      url.pathname.startsWith('/assets/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  
  // Par défaut : Network First
  event.respondWith(networkFirstStrategy(request));
});

// Stratégies de cache

// Network First : Réseau d'abord, cache en fallback
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retourner une page offline si disponible
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Network First avec mise en cache des données
async function networkFirstWithCache(request) {
  const cache = await caches.open(DATA_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cloner la réponse pour le cache
      const responseToCache = networkResponse.clone();
      
      // Ajouter timestamp pour gérer l'expiration
      const headers = new Headers(responseToCache.headers);
      headers.append('sw-fetched-on', new Date().toISOString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      await cache.put(request, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    // Chercher dans le cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Vérifier l'âge du cache
      const fetchedOn = cachedResponse.headers.get('sw-fetched-on');
      if (fetchedOn) {
        const age = Date.now() - new Date(fetchedOn).getTime();
        if (config.dataRetention === null || age < config.dataRetention) {
          // Ajouter header pour indiquer que c'est du cache
          const headers = new Headers(cachedResponse.headers);
          headers.append('x-from-cache', 'true');
          headers.append('x-cache-age', Math.floor(age / 1000));
          
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers: headers
          });
        }
      }
    }
    
    // Retourner erreur réseau
    return new Response(JSON.stringify({
      error: 'Network error',
      offline: true,
      message: 'Impossible de récupérer les données. Mode hors ligne actif.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache First : Cache d'abord, réseau en fallback
async function cacheFirstWithNetworkFallback(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Retourner une image placeholder si disponible
    return caches.match('/assets/images/placeholder.png');
  }
}

// Stale While Revalidate : Servir du cache et mettre à jour en arrière-plan
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', event => {
  console.log('[SW] Synchronisation en arrière-plan:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  } else if (event.tag === 'sync-expertises') {
    event.waitUntil(syncExpertises());
  }
});

// Fonction de synchronisation des données
async function syncData() {
  try {
    // Récupérer les données en attente depuis IndexedDB
    const pendingData = await getPendingSync();
    
    if (pendingData.length === 0) {
      console.log('[SW] Aucune donnée à synchroniser');
      return;
    }
    
    console.log(`[SW] Synchronisation de ${pendingData.length} éléments...`);
    
    // Envoyer au serveur via Tailscale
    const response = await fetch('http://mac-mini.tail-scale.ts.net:8081/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Type': DEVICE_TYPE,
        'X-Sync-Token': await getSyncToken()
      },
      body: JSON.stringify({
        device: DEVICE_TYPE,
        timestamp: Date.now(),
        data: pendingData
      })
    });
    
    if (response.ok) {
      // Marquer comme synchronisé
      await clearPendingSync();
      console.log('[SW] Synchronisation réussie');
      
      // Notifier les clients
      await notifyClients('sync-success', {
        count: pendingData.length,
        timestamp: Date.now()
      });
    } else {
      throw new Error(`Sync failed: ${response.status}`);
    }
  } catch (error) {
    console.error('[SW] Erreur de synchronisation:', error);
    
    // Replanifier la synchronisation
    await self.registration.sync.register('sync-data');
    
    // Notifier les clients de l'échec
    await notifyClients('sync-failed', {
      error: error.message,
      willRetry: true
    });
  }
}

// Récupérer les données en attente depuis IndexedDB
async function getPendingSync() {
  // Cette fonction sera implémentée avec IndexedDB
  return [];
}

// Effacer les données synchronisées
async function clearPendingSync() {
  // Cette fonction sera implémentée avec IndexedDB
}

// Récupérer le token de synchronisation
async function getSyncToken() {
  // Cette fonction récupérera le token depuis le stockage sécurisé
  return 'sync-token-placeholder';
}

// Synchroniser les expertises
async function syncExpertises() {
  // Implémentation spécifique pour les expertises
}

// Notifier tous les clients
async function notifyClients(type, data) {
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({
      type: type,
      data: data
    });
  });
}

// Gestion des notifications push
self.addEventListener('push', event => {
  console.log('[SW] Notification push reçue');
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification CrimiTrack',
    icon: '/assets/images/icon-192x192.png',
    badge: '/assets/images/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/assets/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/assets/images/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('CrimiTrack', options)
  );
});

// Gestion des clics sur notifications
self.addEventListener('notificationclick', event => {
  console.log('[SW] Clic sur notification:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Ouvrir l'application
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Gestion du nettoyage périodique du cache
self.addEventListener('message', event => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLEAN_CACHE') {
    cleanOldCache();
  } else if (event.data.type === 'CACHE_SIZE') {
    calculateCacheSize().then(size => {
      event.ports[0].postMessage({ size });
    });
  }
});

// Nettoyer les anciens caches
async function cleanOldCache() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, DATA_CACHE];
  
  const cachesToDelete = cacheNames.filter(cacheName => 
    !currentCaches.includes(cacheName)
  );
  
  await Promise.all(cachesToDelete.map(cacheName => 
    caches.delete(cacheName)
  ));
  
  // Nettoyer les entrées expirées dans le cache de données
  const cache = await caches.open(DATA_CACHE);
  const requests = await cache.keys();
  
  for (const request of requests) {
    const response = await cache.match(request);
    const fetchedOn = response.headers.get('sw-fetched-on');
    
    if (fetchedOn && config.dataRetention !== null) {
      const age = Date.now() - new Date(fetchedOn).getTime();
      if (age > config.dataRetention) {
        await cache.delete(request);
      }
    }
  }
}

// Calculer la taille du cache
async function calculateCacheSize() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }
  
  const { usage, quota } = await navigator.storage.estimate();
  return {
    usage: usage,
    quota: quota,
    percentage: (usage / quota) * 100
  };
}

console.log(`[SW] Service Worker initialisé pour ${DEVICE_TYPE}`);