/**
 * SyncManager Simplifié pour Safari iOS
 * Version minimale sans dépendances complexes
 */

class SyncManager {
  constructor() {
    console.log('[SyncManager] Constructeur simple');
    this.isInitialized = false;
    this.icloudAvailable = false;
    this.queue = [];
    this.lastSync = null;
  }
  
  async initialize() {
    console.log('[SyncManager] Initialize simple');
    
    try {
      // Juste marquer comme initialisé
      this.isInitialized = true;
      this.icloudAvailable = true;
      
      console.log('[SyncManager] Initialisation réussie (mode simple)');
      return true;
      
    } catch (error) {
      console.error('[SyncManager] Erreur init:', error);
      return false;
    }
  }
  
  // Méthodes stub pour compatibilité
  async sync() {
    console.log('[SyncManager] Sync stub');
    return { success: true };
  }
  
  async forceSyncNow() {
    console.log('[SyncManager] Force sync stub');
    return { success: true };
  }
  
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      icloudAvailable: this.icloudAvailable,
      queueLength: this.queue.length,
      lastSync: this.lastSync
    };
  }
  
  async addToQueue(item) {
    this.queue.push(item);
    console.log('[SyncManager] Item ajouté à la queue');
  }
  
  updateConnectionStatus(status) {
    console.log('[SyncManager] Connection status:', status);
  }
}

// Exposition globale
window.SyncManager = SyncManager;
console.log('[SyncManager] Classe simple exposée globalement');