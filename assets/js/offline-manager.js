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
    this.isInitialized = false;
    
    this.init();
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('[OfflineManager] Initialisation...');
    // Déjà initialisé dans le constructeur via init()
    this.isInitialized = true;
    console.log('[OfflineManager] ✅ Initialisé');
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
      await this.openDatabase();
      console.log('[OfflineManager] Base IndexedDB prête');
    } catch (error) {
      console.error('[OfflineManager] Erreur initialisation:', error);
    }
  }
  
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Créer les stores si ils n'existent pas
        Object.values(this.stores).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          }
        });
      };
    });
  }
  
  async saveFullDatabase(data) {
    console.log('[OfflineManager] Sauvegarde base complète...');
    
    try {
      const tx = this.db.transaction(Object.values(this.stores), 'readwrite');
      
      // Vider les stores existants
      await Promise.all(Object.values(this.stores).map(store => {
        return new Promise((resolve, reject) => {
          const clearRequest = tx.objectStore(store).clear();
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = () => reject(clearRequest.error);
        });
      }));
      
      // Sauvegarder les nouvelles données avec validation
      if (data.agenda && Array.isArray(data.agenda)) {
        const validAgenda = data.agenda.map(item => ({
          ...item,
          id: item.id || this.generateId()
        }));
        await this.saveToStore('agenda', validAgenda);
      }
      
      if (data.waitlist && Array.isArray(data.waitlist)) {
        const validWaitlist = data.waitlist.map(item => ({
          ...item,
          id: item.id || this.generateId(),
          _isWaitlist: true // Marquer comme liste d'attente
        }));
        await this.saveToStore('agenda', validWaitlist); // Stocker waitlist dans agenda
      }
      
      if (data.expertises && Array.isArray(data.expertises)) {
        const validExpertises = data.expertises.map(item => ({
          ...item,
          id: item.id || this.generateId()
        }));
        await this.saveToStore('expertises', validExpertises);
      }
      
      // Metadata avec ID fixe
      const metadata = {
        id: 'metadata',
        ...data.metadata,
        lastSync: Date.now(),
        deviceType: this.deviceType,
        version: '1.0.0'
      };
      await this.saveToStore('settings', [metadata]);
      
      console.log('[OfflineManager] Base sauvegardée avec succès');
      
    } catch (error) {
      console.error('[OfflineManager] Erreur sauvegarde:', error);
      throw error;
    }
  }
  
  async saveToStore(storeName, items) {
    if (!Array.isArray(items)) {
      items = [items];
    }
    
    const tx = this.db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    
    for (const item of items) {
      // S'assurer que l'item a un id valide
      if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
        item.id = this.generateId();
      }
      
      // S'assurer que l'objet est sérialisable
      const cleanItem = this.sanitizeForStorage(item);
      
      await new Promise((resolve, reject) => {
        const request = store.put(cleanItem);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
  
  sanitizeForStorage(item) {
    // Créer une copie propre de l'objet
    const cleaned = JSON.parse(JSON.stringify(item));
    
    // S'assurer que l'id est toujours valide
    if (!cleaned.id || typeof cleaned.id !== 'string' || cleaned.id.trim() === '') {
      cleaned.id = this.generateId();
    }
    
    return cleaned;
  }
  
  async getAllData() {
    console.log('[OfflineManager] Récupération données locales...');
    
    try {
      const data = {};
      
      // Récupérer agenda
      data.agenda = await this.getFromStore('agenda');
      
      // Récupérer expertises
      data.expertises = await this.getFromStore('expertises');
      
      // Récupérer métadonnées
      const metadata = await this.getFromStore('settings');
      data.metadata = metadata.find(item => item.id === 'metadata') || {};
      
      console.log('[OfflineManager] Données récupérées:', {
        agenda: data.agenda.length,
        expertises: data.expertises.length
      });
      
      return data;
      
    } catch (error) {
      console.error('[OfflineManager] Erreur récupération:', error);
      return null;
    }
  }
  
  async getFromStore(storeName) {
    const tx = this.db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getItemCount() {
    try {
      const data = await this.getAllData();
      
      return {
        agenda: data.agenda?.length || 0,
        expertises: data.expertises?.length || 0,
        syncQueue: 0,
        total: (data.agenda?.length || 0) + (data.expertises?.length || 0)
      };
      
    } catch (error) {
      console.error('[OfflineManager] Erreur comptage:', error);
      return { agenda: 0, expertises: 0, syncQueue: 0, total: 0 };
    }
  }
  
  generateId() {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async getStorageInfo() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || this.storageQuota,
          percentage: Math.round((estimate.usage || 0) / (estimate.quota || this.storageQuota) * 100)
        };
      }
      
      return {
        used: 0,
        available: this.storageQuota,
        percentage: 0
      };
      
    } catch (error) {
      console.error('[OfflineManager] Erreur info stockage:', error);
      return { used: 0, available: this.storageQuota, percentage: 0 };
    }
  }
  
  async getQueue() {
    try {
      const queueData = await this.getFromStore('syncQueue');
      return queueData || [];
    } catch (error) {
      console.error('[OfflineManager] Erreur récupération queue:', error);
      return [];
    }
  }
  
  async saveQueue(queue) {
    try {
      // Vider d'abord le store syncQueue
      const tx = this.db.transaction(['syncQueue'], 'readwrite');
      await new Promise((resolve, reject) => {
        const clearRequest = tx.objectStore('syncQueue').clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });
      
      // Sauvegarder la nouvelle queue avec validation
      if (queue && Array.isArray(queue) && queue.length > 0) {
        const validQueue = queue.map(item => ({
          ...item,
          id: item.id || this.generateId(),
          timestamp: item.timestamp || Date.now()
        }));
        await this.saveToStore('syncQueue', validQueue);
      }
      
    } catch (error) {
      console.error('[OfflineManager] Erreur sauvegarde queue:', error);
    }
  }

  async clearCache() {
    console.log('[OfflineManager] Nettoyage cache...');
    
    try {
      const tx = this.db.transaction(['cache'], 'readwrite');
      await new Promise((resolve, reject) => {
        const request = tx.objectStore('cache').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log('[OfflineManager] Cache nettoyé');
      
    } catch (error) {
      console.error('[OfflineManager] Erreur nettoyage:', error);
    }
  }
}

// Exposer la classe OfflineManager globalement pour instanciation dans app.js
window.OfflineManager = OfflineManager;

console.log('[OfflineManager] Classe exposée globalement');