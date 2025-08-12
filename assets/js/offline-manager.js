/**
 * Offline Manager - Gestion du stockage local avec IndexedDB
 * Permet le fonctionnement complet en mode hors ligne
 */

class OfflineManager {
  constructor() {
    this.dbName = 'CrimiTrackOffline';
    this.dbVersion = 1;
    this.db = null;
    
    this.stores = {
      expertises: 'expertises',
      agenda: 'agenda',
      documents: 'documents',
      syncQueue: 'syncQueue',
      cache: 'cache',
      settings: 'settings'
    };
    
    this.deviceType = this.getDeviceType();
    this.storageQuota = this.getStorageQuota();
    
    this.init();
  }
  
  getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Mac/.test(ua)) return 'MacBook';
    return 'Unknown';
  }
  
  getStorageQuota() {
    // Quotas de stockage par appareil
    const quotas = {
      iPhone: 500 * 1024 * 1024,      // 500 MB
      iPad: 2 * 1024 * 1024 * 1024,   // 2 GB
      MacBook: 5 * 1024 * 1024 * 1024, // 5 GB
      Unknown: 1024 * 1024 * 1024     // 1 GB par défaut
    };
    
    return quotas[this.deviceType];
  }
  
  async init() {
    console.log('[OfflineManager] Initialisation...');
    
    try {
      // Ouvrir la base de données
      await this.openDatabase();
      
      // Vérifier l'espace disponible
      await this.checkStorageQuota();
      
      // Charger les données initiales si nécessaire
      await this.loadInitialData();
      
      // Nettoyer les anciennes données
      await this.cleanupOldData();
      
      console.log('[OfflineManager] Initialisation réussie');
    } catch (error) {
      console.error('[OfflineManager] Erreur initialisation:', error);
    }
  }
  
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        reject(new Error('Erreur ouverture IndexedDB'));
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineManager] Base de données ouverte');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Créer les object stores
        this.createObjectStores(db);
        
        console.log('[OfflineManager] Base de données créée/mise à jour');
      };
    });
  }
  
  createObjectStores(db) {
    // Store pour les expertises
    if (!db.objectStoreNames.contains(this.stores.expertises)) {
      const expertiseStore = db.createObjectStore(this.stores.expertises, {
        keyPath: '_uniqueId'
      });
      
      expertiseStore.createIndex('date_examen', 'date_examen', { unique: false });
      expertiseStore.createIndex('patronyme', 'patronyme', { unique: false });
      expertiseStore.createIndex('numero_parquet', 'numero_parquet', { unique: false });
      expertiseStore.createIndex('statut', 'statut', { unique: false });
      expertiseStore.createIndex('_lastModified', '_lastModified', { unique: false });
    }
    
    // Store pour l'agenda
    if (!db.objectStoreNames.contains(this.stores.agenda)) {
      const agendaStore = db.createObjectStore(this.stores.agenda, {
        keyPath: 'id',
        autoIncrement: true
      });
      
      agendaStore.createIndex('date', 'date', { unique: false });
      agendaStore.createIndex('type', 'type', { unique: false });
      agendaStore.createIndex('statut', 'statut', { unique: false });
    }
    
    // Store pour les documents
    if (!db.objectStoreNames.contains(this.stores.documents)) {
      const docStore = db.createObjectStore(this.stores.documents, {
        keyPath: 'id',
        autoIncrement: true
      });
      
      docStore.createIndex('expertiseId', 'expertiseId', { unique: false });
      docStore.createIndex('type', 'type', { unique: false });
      docStore.createIndex('created', 'created', { unique: false });
    }
    
    // Store pour la queue de synchronisation
    if (!db.objectStoreNames.contains(this.stores.syncQueue)) {
      const syncStore = db.createObjectStore(this.stores.syncQueue, {
        keyPath: 'id',
        autoIncrement: true
      });
      
      syncStore.createIndex('priority', 'priority', { unique: false });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('status', 'status', { unique: false });
    }
    
    // Store pour le cache général
    if (!db.objectStoreNames.contains(this.stores.cache)) {
      const cacheStore = db.createObjectStore(this.stores.cache, {
        keyPath: 'key'
      });
      
      cacheStore.createIndex('expires', 'expires', { unique: false });
      cacheStore.createIndex('category', 'category', { unique: false });
    }
    
    // Store pour les paramètres
    if (!db.objectStoreNames.contains(this.stores.settings)) {
      db.createObjectStore(this.stores.settings, {
        keyPath: 'key'
      });
    }
  }
  
  async checkStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || this.storageQuota;
      const percentUsed = (usage / quota) * 100;
      
      console.log(`[OfflineManager] Stockage: ${this.formatBytes(usage)} / ${this.formatBytes(quota)} (${percentUsed.toFixed(1)}%)`);
      
      // Alerter si > 80% utilisé
      if (percentUsed > 80) {
        console.warn('[OfflineManager] Espace de stockage faible!');
        await this.cleanupOldData(true); // Nettoyage agressif
      }
      
      return {
        usage,
        quota,
        percentUsed,
        available: quota - usage
      };
    }
  }
  
  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
  }
  
  async loadInitialData() {
    // Vérifier si c'est la première ouverture
    const isFirstRun = await this.getSetting('firstRun');
    
    if (isFirstRun === null) {
      console.log('[OfflineManager] Première exécution détectée');
      
      // Marquer comme initialisé
      await this.setSetting('firstRun', false);
      await this.setSetting('deviceType', this.deviceType);
      await this.setSetting('installDate', Date.now());
      
      // Charger les données essentielles depuis le serveur si connecté
      if (navigator.onLine && window.syncManager?.tailscaleConnected) {
        await this.fetchEssentialData();
      }
    }
  }
  
  async fetchEssentialData() {
    console.log('[OfflineManager] Chargement des données essentielles...');
    
    try {
      // Définir les périodes de données selon l'appareil
      const dataRanges = {
        iPhone: { months: 3, limit: 500 },
        iPad: { months: 6, limit: 2000 },
        MacBook: { months: null, limit: null } // Tout
      };
      
      const range = dataRanges[this.deviceType];
      
      // Calculer la date de début
      const startDate = range.months 
        ? new Date(Date.now() - range.months * 30 * 24 * 60 * 60 * 1000)
        : null;
      
      // Récupérer les expertises
      await this.fetchAndStoreExpertises(startDate, range.limit);
      
      // Récupérer l'agenda
      await this.fetchAndStoreAgenda(startDate);
      
      console.log('[OfflineManager] Données essentielles chargées');
    } catch (error) {
      console.error('[OfflineManager] Erreur chargement données:', error);
    }
  }
  
  async fetchAndStoreExpertises(startDate, limit) {
    if (!window.syncManager) return;
    
    const url = new URL(`${window.syncManager.config.server.primary}/api/expertises`);
    if (startDate) {
      url.searchParams.append('from', startDate.toISOString());
    }
    if (limit) {
      url.searchParams.append('limit', limit);
    }
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const expertises = await response.json();
        
        // Stocker dans IndexedDB
        const transaction = this.db.transaction([this.stores.expertises], 'readwrite');
        const store = transaction.objectStore(this.stores.expertises);
        
        for (const expertise of expertises) {
          expertise._lastModified = Date.now();
          await store.put(expertise);
        }
        
        console.log(`[OfflineManager] ${expertises.length} expertises stockées`);
      }
    } catch (error) {
      console.error('[OfflineManager] Erreur récupération expertises:', error);
    }
  }
  
  async fetchAndStoreAgenda(startDate) {
    if (!window.syncManager) return;
    
    const url = new URL(`${window.syncManager.config.server.primary}/api/agenda`);
    if (startDate) {
      url.searchParams.append('from', startDate.toISOString());
    }
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const events = await response.json();
        
        // Stocker dans IndexedDB
        const transaction = this.db.transaction([this.stores.agenda], 'readwrite');
        const store = transaction.objectStore(this.stores.agenda);
        
        for (const event of events) {
          await store.put(event);
        }
        
        console.log(`[OfflineManager] ${events.length} événements agenda stockés`);
      }
    } catch (error) {
      console.error('[OfflineManager] Erreur récupération agenda:', error);
    }
  }
  
  async cleanupOldData(aggressive = false) {
    console.log(`[OfflineManager] Nettoyage des données ${aggressive ? 'agressif' : 'normal'}...`);
    
    // Définir les périodes de rétention
    const retentionPeriods = {
      iPhone: aggressive ? 30 : 90,     // jours
      iPad: aggressive ? 90 : 180,      // jours
      MacBook: aggressive ? 365 : null  // jours ou illimité
    };
    
    const retention = retentionPeriods[this.deviceType];
    
    if (retention === null) {
      console.log('[OfflineManager] Rétention illimitée, pas de nettoyage');
      return;
    }
    
    const cutoffDate = Date.now() - (retention * 24 * 60 * 60 * 1000);
    
    // Nettoyer les expertises
    await this.cleanupStore(this.stores.expertises, '_lastModified', cutoffDate);
    
    // Nettoyer l'agenda
    await this.cleanupStore(this.stores.agenda, 'date', cutoffDate);
    
    // Nettoyer le cache expiré
    await this.cleanupExpiredCache();
    
    // Nettoyer la queue de sync traitée
    await this.cleanupSyncQueue();
  }
  
  async cleanupStore(storeName, dateField, cutoffDate) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const index = store.index(dateField);
    
    const range = IDBKeyRange.upperBound(cutoffDate);
    const request = index.openCursor(range);
    
    let deletedCount = 0;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        if (deletedCount > 0) {
          console.log(`[OfflineManager] ${deletedCount} enregistrements supprimés de ${storeName}`);
        }
      }
    };
  }
  
  async cleanupExpiredCache() {
    const transaction = this.db.transaction([this.stores.cache], 'readwrite');
    const store = transaction.objectStore(this.stores.cache);
    const index = store.index('expires');
    
    const range = IDBKeyRange.upperBound(Date.now());
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }
  
  async cleanupSyncQueue() {
    const transaction = this.db.transaction([this.stores.syncQueue], 'readwrite');
    const store = transaction.objectStore(this.stores.syncQueue);
    const index = store.index('status');
    
    const request = index.openCursor(IDBKeyRange.only('completed'));
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }
  
  // API Publique pour les expertises
  
  async saveExpertise(expertise) {
    expertise._lastModified = Date.now();
    expertise._offline = !navigator.onLine;
    
    const transaction = this.db.transaction([this.stores.expertises], 'readwrite');
    const store = transaction.objectStore(this.stores.expertises);
    
    await store.put(expertise);
    
    // Ajouter à la queue de sync si hors ligne
    if (!navigator.onLine || !window.syncManager?.tailscaleConnected) {
      await this.addToSyncQueue({
        type: 'UPDATE_EXPERTISE',
        data: expertise,
        priority: 2
      });
    }
    
    return expertise;
  }
  
  async getExpertise(id) {
    const transaction = this.db.transaction([this.stores.expertises], 'readonly');
    const store = transaction.objectStore(this.stores.expertises);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async searchExpertises(query) {
    const transaction = this.db.transaction([this.stores.expertises], 'readonly');
    const store = transaction.objectStore(this.stores.expertises);
    
    const results = [];
    
    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const expertise = cursor.value;
          
          // Recherche simple dans les champs principaux
          const searchFields = ['patronyme', 'numero_parquet', 'tribunal', 'magistrat'];
          const match = searchFields.some(field => 
            expertise[field]?.toLowerCase().includes(query.toLowerCase())
          );
          
          if (match) {
            results.push(expertise);
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async getAllExpertises(limit = null) {
    const transaction = this.db.transaction([this.stores.expertises], 'readonly');
    const store = transaction.objectStore(this.stores.expertises);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll(null, limit);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  // API Publique pour l'agenda
  
  async saveAgendaEvent(event) {
    const transaction = this.db.transaction([this.stores.agenda], 'readwrite');
    const store = transaction.objectStore(this.stores.agenda);
    
    await store.put(event);
    
    // Ajouter à la queue de sync si hors ligne
    if (!navigator.onLine || !window.syncManager?.tailscaleConnected) {
      await this.addToSyncQueue({
        type: 'UPDATE_AGENDA',
        data: event,
        priority: 1 // Priorité haute pour l'agenda
      });
    }
    
    return event;
  }
  
  async getAgendaEvents(startDate, endDate) {
    const transaction = this.db.transaction([this.stores.agenda], 'readonly');
    const store = transaction.objectStore(this.stores.agenda);
    const index = store.index('date');
    
    const range = IDBKeyRange.bound(
      startDate.toISOString(),
      endDate.toISOString()
    );
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  // API Publique pour la queue de synchronisation
  
  async addToSyncQueue(item) {
    const queueItem = {
      ...item,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0,
      deviceId: localStorage.getItem('device-id')
    };
    
    const transaction = this.db.transaction([this.stores.syncQueue], 'readwrite');
    const store = transaction.objectStore(this.stores.syncQueue);
    
    await store.add(queueItem);
    
    // Notifier le sync manager
    if (window.syncManager) {
      window.syncManager.queue.push(queueItem);
    }
    
    return queueItem;
  }
  
  async getQueue() {
    const transaction = this.db.transaction([this.stores.syncQueue], 'readonly');
    const store = transaction.objectStore(this.stores.syncQueue);
    const index = store.index('status');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async saveQueue(queue) {
    const transaction = this.db.transaction([this.stores.syncQueue], 'readwrite');
    const store = transaction.objectStore(this.stores.syncQueue);
    
    // Effacer et recréer la queue
    await store.clear();
    
    for (const item of queue) {
      await store.add(item);
    }
  }
  
  async updateQueueItem(id, updates) {
    const transaction = this.db.transaction([this.stores.syncQueue], 'readwrite');
    const store = transaction.objectStore(this.stores.syncQueue);
    
    const item = await store.get(id);
    if (item) {
      Object.assign(item, updates);
      await store.put(item);
    }
  }
  
  // API pour le cache
  
  async cacheData(key, data, ttl = 3600000) { // TTL par défaut: 1 heure
    const cacheItem = {
      key,
      data,
      expires: Date.now() + ttl,
      category: this.categorizeData(key),
      size: JSON.stringify(data).length
    };
    
    const transaction = this.db.transaction([this.stores.cache], 'readwrite');
    const store = transaction.objectStore(this.stores.cache);
    
    await store.put(cacheItem);
    
    return cacheItem;
  }
  
  async getCachedData(key) {
    const transaction = this.db.transaction([this.stores.cache], 'readonly');
    const store = transaction.objectStore(this.stores.cache);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        const item = request.result;
        
        if (item && item.expires > Date.now()) {
          resolve(item.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  categorizeData(key) {
    if (key.includes('expertise')) return 'expertise';
    if (key.includes('agenda')) return 'agenda';
    if (key.includes('stat')) return 'statistics';
    return 'other';
  }
  
  // API pour les paramètres
  
  async setSetting(key, value) {
    const transaction = this.db.transaction([this.stores.settings], 'readwrite');
    const store = transaction.objectStore(this.stores.settings);
    
    await store.put({ key, value });
  }
  
  async getSetting(key) {
    const transaction = this.db.transaction([this.stores.settings], 'readonly');
    const store = transaction.objectStore(this.stores.settings);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  // Méthodes utilitaires
  
  async getItemCount() {
    const counts = {};
    
    for (const storeName of Object.values(this.stores)) {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      counts[storeName] = await new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    
    return counts;
  }
  
  async exportData() {
    const data = {};
    
    for (const storeName of Object.values(this.stores)) {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      data[storeName] = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    
    return data;
  }
  
  async importData(data) {
    for (const [storeName, records] of Object.entries(data)) {
      if (this.stores[storeName]) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        for (const record of records) {
          await store.put(record);
        }
      }
    }
  }
  
  async clearAllData() {
    for (const storeName of Object.values(this.stores)) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await store.clear();
    }
    
    console.log('[OfflineManager] Toutes les données ont été effacées');
  }
}

// Initialiser le gestionnaire offline
window.offlineManager = new OfflineManager();

console.log('[OfflineManager] Chargé et initialisé');