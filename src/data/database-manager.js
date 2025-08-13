/**
 * CrimiTrack PWA - Database Manager v2.0
 * Gestionnaire de base de données refactorisé avec IndexedDB optimisé
 * Performance améliorée, validation robuste, gestion d'erreurs avancée
 */

class DatabaseManager {
  constructor(eventBus, config) {
    this.eventBus = eventBus;
    this.config = config;
    this.dbName = 'CrimiTrackV2';
    this.dbVersion = 2;
    this.db = null;
    this.isInitialized = false;
    
    // Configuration des stores
    this.stores = {
      agenda: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'date_examen', keyPath: 'date_examen', unique: false },
          { name: 'patronyme', keyPath: 'patronyme', unique: false },
          { name: 'statut', keyPath: 'statut', unique: false },
          { name: 'type_mission', keyPath: 'type_mission', unique: false },
          { name: 'tribunal', keyPath: 'tribunal', unique: false }
        ]
      },
      expertises: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'numero_dossier', keyPath: 'numero_dossier', unique: false },
          { name: 'date_creation', keyPath: 'date_creation', unique: false },
          { name: 'statut', keyPath: 'statut', unique: false },
          { name: 'type_expertise', keyPath: 'type_expertise', unique: false }
        ]
      },
      documents: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'expertise_id', keyPath: 'expertise_id', unique: false },
          { name: 'type_document', keyPath: 'type_document', unique: false },
          { name: 'date_creation', keyPath: 'date_creation', unique: false }
        ]
      },
      templates: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'type', keyPath: 'type', unique: false },
          { name: 'categorie', keyPath: 'categorie', unique: false }
        ]
      },
      configuration: {
        keyPath: 'key',
        autoIncrement: false
      },
      cache: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'type', keyPath: 'type', unique: false }
        ]
      },
      syncQueue: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'priority', keyPath: 'priority', unique: false },
          { name: 'status', keyPath: 'status', unique: false }
        ]
      }
    };
    
    // Cache en mémoire pour les requêtes fréquentes
    this.memoryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    console.log('[DatabaseManager] v2.0 initialisé');
  }
  
  /**
   * Initialiser la base de données
   */
  async init() {
    if (this.isInitialized) {
      return this.db;
    }
    
    try {
      console.log('[DatabaseManager] Ouverture de la base de données...');
      
      this.db = await this.openDatabase();
      await this.setupEventListeners();
      await this.cleanupOldData();
      
      this.isInitialized = true;
      console.log('[DatabaseManager] Base de données prête');
      
      this.eventBus.emit('database:ready', { version: this.dbVersion });
      
      return this.db;
      
    } catch (error) {
      console.error('[DatabaseManager] Erreur initialisation:', error);
      throw error;
    }
  }
  
  /**
   * Ouvrir la base de données IndexedDB
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        const error = new Error(`Erreur ouverture base: ${request.error?.message}`);
        reject(error);
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        console.log('[DatabaseManager] Mise à jour de la structure...');
        
        // Créer ou mettre à jour les stores
        Object.entries(this.stores).forEach(([storeName, storeConfig]) => {
          this.createOrUpdateStore(db, storeName, storeConfig);
        });
        
        console.log('[DatabaseManager] Structure mise à jour');
      };
      
      request.onblocked = () => {
        console.warn('[DatabaseManager] Mise à jour bloquée par une autre instance');
      };
    });
  }
  
  /**
   * Créer ou mettre à jour un store
   */
  createOrUpdateStore(db, storeName, config) {
    let store;
    
    if (db.objectStoreNames.contains(storeName)) {
      // Le store existe, on ne peut pas le modifier durant cette transaction
      console.log(`[DatabaseManager] Store "${storeName}" existe déjà`);
      return;
    }
    
    // Créer le store
    store = db.createObjectStore(storeName, {
      keyPath: config.keyPath,
      autoIncrement: config.autoIncrement
    });
    
    // Créer les index
    if (config.indexes) {
      config.indexes.forEach(index => {
        store.createIndex(index.name, index.keyPath, {
          unique: index.unique || false
        });
      });
    }
    
    console.log(`[DatabaseManager] Store "${storeName}" créé avec ${config.indexes?.length || 0} index`);
  }
  
  /**
   * Configurer les événements de la base
   */
  async setupEventListeners() {
    // Écouter les changements de visibilité pour optimiser les performances
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearMemoryCache();
      }
    });
    
    // Écouter les événements de synchronisation
    this.eventBus.on('sync:complete', () => {
      this.clearMemoryCache();
    });
  }
  
  /**
   * Nettoyer les anciennes données
   */
  async cleanupOldData() {
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 jours
    
    try {
      // Nettoyer le cache
      await this.cleanupCache(cutoffDate);
      
      // Nettoyer les éléments de synchronisation terminés
      await this.cleanupSyncQueue();
      
      console.log('[DatabaseManager] Nettoyage terminé');
      
    } catch (error) {
      console.warn('[DatabaseManager] Erreur nettoyage:', error);
    }
  }
  
  /**
   * Sauvegarder des données complètes
   */
  async saveFullDatabase(data) {
    console.log('[DatabaseManager] Sauvegarde complète...');
    
    const transaction = this.db.transaction(
      Object.keys(this.stores), 
      'readwrite'
    );
    
    try {
      // Vider les stores de données
      const dataStores = ['agenda', 'expertises', 'documents'];
      for (const storeName of dataStores) {
        const store = transaction.objectStore(storeName);
        await this.promisifyRequest(store.clear());
      }
      
      // Valider et sauvegarder les nouvelles données
      await this.saveDataByType(transaction, 'agenda', data.agenda || []);
      await this.saveDataByType(transaction, 'expertises', data.expertises || []);
      await this.saveDataByType(transaction, 'documents', data.documents || []);
      
      // Sauvegarder les métadonnées
      await this.saveMetadata(transaction, data.metadata || {});
      
      // Attendre la fin de la transaction
      await this.promisifyTransaction(transaction);
      
      // Vider le cache mémoire
      this.clearMemoryCache();
      
      console.log('[DatabaseManager] Sauvegarde complète terminée');
      
      this.eventBus.emit('database:updated', {
        type: 'full',
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('[DatabaseManager] Erreur sauvegarde complète:', error);
      throw error;
    }
  }
  
  /**
   * Sauvegarder des données par type
   */
  async saveDataByType(transaction, storeName, items) {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    
    const store = transaction.objectStore(storeName);
    const validatedItems = this.validateItems(storeName, items);
    
    for (const item of validatedItems) {
      await this.promisifyRequest(store.put(item));
    }
    
    console.log(`[DatabaseManager] ${validatedItems.length} éléments sauvegardés dans ${storeName}`);
  }
  
  /**
   * Valider les éléments avant sauvegarde
   */
  validateItems(storeName, items) {
    return items.map(item => {
      const validated = this.validateSingleItem(storeName, item);
      return this.sanitizeItem(validated);
    }).filter(item => item !== null);
  }
  
  /**
   * Valider un élément individuel
   */
  validateSingleItem(storeName, item) {
    if (!item || typeof item !== 'object') {
      console.warn(`[DatabaseManager] Item invalide ignoré pour ${storeName}`);
      return null;
    }
    
    // Générer un ID si manquant
    if (!item.id) {
      item.id = this.generateId(storeName);
    }
    
    // Validation spécifique par type
    switch (storeName) {
      case 'agenda':
        return this.validateAgendaItem(item);
      case 'expertises':
        return this.validateExpertiseItem(item);
      case 'documents':
        return this.validateDocumentItem(item);
      default:
        return item;
    }
  }
  
  /**
   * Valider un élément d'agenda
   */
  validateAgendaItem(item) {
    const required = ['patronyme', 'date_examen'];
    
    for (const field of required) {
      if (!item[field]) {
        console.warn(`[DatabaseManager] Agenda item sans ${field} ignoré`);
        return null;
      }
    }
    
    return {
      ...item,
      date_examen: this.normalizeDate(item.date_examen),
      statut: item.statut || 'programmee',
      type_mission: item.type_mission || 'instruction',
      lieu_examen: item.lieu_examen || 'CJ',
      _lastModified: Date.now(),
      _isWaitlist: Boolean(item._isWaitlist)
    };
  }
  
  /**
   * Valider un élément d'expertise
   */
  validateExpertiseItem(item) {
    const required = ['numero_dossier'];
    
    for (const field of required) {
      if (!item[field]) {
        console.warn(`[DatabaseManager] Expertise item sans ${field} ignoré`);
        return null;
      }
    }
    
    return {
      ...item,
      date_creation: item.date_creation || new Date().toISOString(),
      statut: item.statut || 'en_cours',
      _lastModified: Date.now()
    };
  }
  
  /**
   * Valider un élément de document
   */
  validateDocumentItem(item) {
    const required = ['expertise_id', 'nom_fichier'];
    
    for (const field of required) {
      if (!item[field]) {
        console.warn(`[DatabaseManager] Document item sans ${field} ignoré`);
        return null;
      }
    }
    
    return {
      ...item,
      date_creation: item.date_creation || new Date().toISOString(),
      taille: item.taille || 0,
      _lastModified: Date.now()
    };
  }
  
  /**
   * Nettoyer un élément pour le stockage
   */
  sanitizeItem(item) {
    if (!item) return null;
    
    // Supprimer les propriétés non sérialisables
    const cleaned = JSON.parse(JSON.stringify(item));
    
    // S'assurer que l'ID est valide
    if (!cleaned.id || typeof cleaned.id !== 'string') {
      cleaned.id = this.generateId();
    }
    
    return cleaned;
  }
  
  /**
   * Récupérer toutes les données
   */
  async getAllData() {
    const cacheKey = 'all_data';
    
    // Vérifier le cache mémoire
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    try {
      const transaction = this.db.transaction(
        ['agenda', 'expertises', 'documents', 'configuration'],
        'readonly'
      );
      
      const [agenda, expertises, documents, config] = await Promise.all([
        this.getAllFromStore(transaction, 'agenda'),
        this.getAllFromStore(transaction, 'expertises'),
        this.getAllFromStore(transaction, 'documents'),
        this.getAllFromStore(transaction, 'configuration')
      ]);
      
      // Séparer l'agenda de la waitlist
      const agendaItems = agenda.filter(item => !item._isWaitlist);
      const waitlistItems = agenda.filter(item => item._isWaitlist);
      
      const data = {
        agenda: agendaItems,
        waitlist: waitlistItems,
        expertises,
        documents,
        metadata: this.extractMetadata(config)
      };
      
      // Mettre en cache
      this.memoryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
      
    } catch (error) {
      console.error('[DatabaseManager] Erreur récupération données:', error);
      throw error;
    }
  }
  
  /**
   * Récupérer tous les éléments d'un store
   */
  async getAllFromStore(transaction, storeName) {
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    return this.promisifyRequest(request);
  }
  
  /**
   * Extraire les métadonnées de la configuration
   */
  extractMetadata(configItems) {
    const metadata = {};
    
    configItems.forEach(item => {
      if (item.key === 'metadata') {
        Object.assign(metadata, item.value);
      }
    });
    
    return {
      ...metadata,
      lastAccess: Date.now(),
      version: this.dbVersion
    };
  }
  
  /**
   * Obtenir les statistiques
   */
  async getStats() {
    const cacheKey = 'stats';
    
    // Vérifier le cache
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    try {
      const data = await this.getAllData();
      
      const stats = {
        agenda: data.agenda.length,
        waitlist: data.waitlist.length,
        expertises: data.expertises.length,
        documents: data.documents.length,
        pendingSync: await this.getSyncQueueCount(),
        lastUpdate: this.getLastUpdateTime(data),
        storageUsed: await this.getStorageUsage()
      };
      
      // Mettre en cache
      this.memoryCache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });
      
      return stats;
      
    } catch (error) {
      console.error('[DatabaseManager] Erreur calcul statistiques:', error);
      return {
        agenda: 0,
        waitlist: 0,
        expertises: 0,
        documents: 0,
        pendingSync: 0,
        lastUpdate: null,
        storageUsed: 0
      };
    }
  }
  
  /**
   * Vérifier si des données existent
   */
  async hasData() {
    try {
      const stats = await this.getStats();
      return stats.agenda > 0 || stats.expertises > 0;
    } catch (error) {
      console.error('[DatabaseManager] Erreur vérification données:', error);
      return false;
    }
  }
  
  /**
   * Obtenir la configuration
   */
  async getConfiguration() {
    try {
      const transaction = this.db.transaction(['configuration'], 'readonly');
      const store = transaction.objectStore('configuration');
      const request = store.get('app_config');
      const result = await this.promisifyRequest(request);
      
      return result?.value || null;
      
    } catch (error) {
      console.error('[DatabaseManager] Erreur récupération configuration:', error);
      return null;
    }
  }
  
  /**
   * Sauvegarder la configuration
   */
  async saveConfiguration(config) {
    try {
      const transaction = this.db.transaction(['configuration'], 'readwrite');
      const store = transaction.objectStore('configuration');
      
      const configItem = {
        key: 'app_config',
        value: config,
        timestamp: Date.now()
      };
      
      await this.promisifyRequest(store.put(configItem));
      await this.promisifyTransaction(transaction);
      
      console.log('[DatabaseManager] Configuration sauvegardée');
      
    } catch (error) {
      console.error('[DatabaseManager] Erreur sauvegarde configuration:', error);
      throw error;
    }
  }
  
  /**
   * Sauvegarder les métadonnées
   */
  async saveMetadata(transaction, metadata) {
    const store = transaction.objectStore('configuration');
    
    const metadataItem = {
      key: 'metadata',
      value: {
        ...metadata,
        lastSync: Date.now(),
        version: this.dbVersion
      },
      timestamp: Date.now()
    };
    
    await this.promisifyRequest(store.put(metadataItem));
  }
  
  /**
   * Rechercher des éléments
   */
  async search(storeName, query, options = {}) {
    const limit = options.limit || 100;
    const sortBy = options.sortBy || null;
    const filters = options.filters || {};
    
    try {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let items = await this.promisifyRequest(store.getAll());
      
      // Appliquer les filtres
      if (Object.keys(filters).length > 0) {
        items = items.filter(item => {
          return Object.entries(filters).every(([key, value]) => {
            if (Array.isArray(value)) {
              return value.includes(item[key]);
            }
            return item[key] === value;
          });
        });
      }
      
      // Recherche textuelle
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        items = items.filter(item => {
          return Object.values(item).some(value => 
            String(value).toLowerCase().includes(searchTerm)
          );
        });
      }
      
      // Tri
      if (sortBy) {
        items.sort((a, b) => {
          const aVal = a[sortBy];
          const bVal = b[sortBy];
          
          if (typeof aVal === 'string') {
            return aVal.localeCompare(bVal);
          }
          
          return aVal - bVal;
        });
      }
      
      // Limiter les résultats
      return items.slice(0, limit);
      
    } catch (error) {
      console.error(`[DatabaseManager] Erreur recherche dans ${storeName}:`, error);
      return [];
    }
  }
  
  /**
   * Ajouter à la queue de synchronisation
   */
  async addToSyncQueue(action, priority = 'normal') {
    try {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const queueItem = {
        id: this.generateId('sync'),
        action,
        priority,
        status: 'pending',
        timestamp: Date.now(),
        attempts: 0
      };
      
      await this.promisifyRequest(store.put(queueItem));
      await this.promisifyTransaction(transaction);
      
      this.eventBus.emit('syncqueue:added', queueItem);
      
      return queueItem.id;
      
    } catch (error) {
      console.error('[DatabaseManager] Erreur ajout queue sync:', error);
      throw error;
    }
  }
  
  /**
   * Obtenir le nombre d'éléments dans la queue
   */
  async getSyncQueueCount() {
    try {
      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.count();
      return await this.promisifyRequest(request);
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Nettoyer le cache
   */
  async cleanupCache(cutoffDate) {
    try {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('timestamp');
      
      const range = IDBKeyRange.upperBound(cutoffDate);
      const request = index.openCursor(range);
      
      await this.promisifyCursor(request, cursor => {
        cursor.delete();
      });
      
      await this.promisifyTransaction(transaction);
      
    } catch (error) {
      console.warn('[DatabaseManager] Erreur nettoyage cache:', error);
    }
  }
  
  /**
   * Nettoyer la queue de synchronisation
   */
  async cleanupSyncQueue() {
    try {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('status');
      
      const range = IDBKeyRange.only('completed');
      const request = index.openCursor(range);
      
      await this.promisifyCursor(request, cursor => {
        const item = cursor.value;
        // Supprimer les éléments terminés depuis plus de 24h
        if (Date.now() - item.timestamp > 24 * 60 * 60 * 1000) {
          cursor.delete();
        }
      });
      
      await this.promisifyTransaction(transaction);
      
    } catch (error) {
      console.warn('[DatabaseManager] Erreur nettoyage queue sync:', error);
    }
  }
  
  /**
   * Obtenir l'utilisation du stockage
   */
  async getStorageUsage() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Obtenir le timestamp de dernière mise à jour
   */
  getLastUpdateTime(data) {
    let lastUpdate = 0;
    
    const allItems = [
      ...(data.agenda || []),
      ...(data.waitlist || []),
      ...(data.expertises || []),
      ...(data.documents || [])
    ];
    
    allItems.forEach(item => {
      if (item._lastModified && item._lastModified > lastUpdate) {
        lastUpdate = item._lastModified;
      }
    });
    
    return lastUpdate || null;
  }
  
  /**
   * Vider le cache mémoire
   */
  clearMemoryCache() {
    this.memoryCache.clear();
    console.log('[DatabaseManager] Cache mémoire vidé');
  }
  
  /**
   * Normaliser une date
   */
  normalizeDate(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    } catch (error) {
      console.warn('[DatabaseManager] Date invalide:', dateString);
      return null;
    }
  }
  
  /**
   * Générer un ID unique
   */
  generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Convertir une requête IndexedDB en Promise
   */
  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Convertir une transaction IndexedDB en Promise
   */
  promisifyTransaction(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction annulée'));
    });
  }
  
  /**
   * Convertir un curseur IndexedDB en Promise
   */
  promisifyCursor(request, callback) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          callback(cursor);
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Obtenir le statut de la base
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      dbName: this.dbName,
      dbVersion: this.dbVersion,
      stores: Object.keys(this.stores),
      cacheSize: this.memoryCache.size,
      connected: this.db !== null
    };
  }
  
  /**
   * Fermer la base de données
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      this.clearMemoryCache();
      
      console.log('[DatabaseManager] Base de données fermée');
    }
  }
}

// Export global
window.DatabaseManager = DatabaseManager;