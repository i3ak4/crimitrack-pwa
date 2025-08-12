/**
 * Sync Manager - Gestion de la synchronisation directe (sans Tailscale)
 * Synchronisation manuelle via bouton pour iPad/iPhone
 */

class SyncManager {
  constructor() {
    this.config = {
      server: {
        primary: 'http://192.168.1.100:8081', // IP locale directe
        fallback: 'http://localhost:8081',
        timeout: 30000
      },
      sync: {
        interval: 5 * 60 * 1000, // 5 minutes
        batchSize: 10,
        maxRetries: 3,
        retryDelay: 1000
      },
      priorities: {
        URGENT: 1,
        NORMAL: 2,
        BATCH: 3
      }
    };
    
    this.queue = [];
    this.isSyncing = false;
    this.lastSync = null;
    this.tailscaleConnected = false;
    this.deviceId = this.getDeviceId();
    
    this.init();
  }
  
  async init() {
    console.log('[SyncManager] Initialisation...');
    
    // Vérifier la connexion serveur
    await this.checkServerConnection();
    
    // Charger la queue depuis IndexedDB
    await this.loadQueue();
    
    // Écouter les événements de connexion
    this.setupEventListeners();
    
    // Créer le bouton de synchronisation manuelle
    this.createSyncButton();
    
    // Désactiver la synchronisation périodique automatique
    // this.startPeriodicSync(); // Commenté pour sync manuelle seulement
    
    // Enregistrer le service worker pour la sync en arrière-plan
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('sync-data');
      });
    }
  }
  
  getDeviceId() {
    let deviceId = localStorage.getItem('device-id');
    if (!deviceId) {
      deviceId = `${this.getDeviceType()}-${this.generateUUID()}`;
      localStorage.setItem('device-id', deviceId);
    }
    return deviceId;
  }
  
  getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Mac/.test(ua)) return 'MacBook';
    return 'Unknown';
  }
  
  generateUUID() {
    return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  setupEventListeners() {
    // Écouter les changements de connexion
    window.addEventListener('online', () => {
      console.log('[SyncManager] Connexion rétablie');
      this.checkServerConnection();
      // Ne pas traiter automatiquement la queue
    });
    
    window.addEventListener('offline', () => {
      console.log('[SyncManager] Connexion perdue');
      this.tailscaleConnected = false;
      this.updateConnectionStatus(false);
    });
    
    // Écouter les messages du service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        this.handleServiceWorkerMessage(event.data);
      });
    }
    
    // Écouter les changements de visibilité
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkServerConnection();
        // Ne pas traiter automatiquement la queue
      }
    });
  }
  
  async checkServerConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Essayer d'abord l'IP principale
      let response;
      try {
        response = await fetch(`${this.config.server.primary}/api/ping`, {
          method: 'GET',
          signal: controller.signal,
          mode: 'cors'
        });
      } catch (primaryError) {
        console.log('[SyncManager] IP principale inaccessible, essai fallback...');
        // Essayer le fallback
        response = await fetch(`${this.config.server.fallback}/api/ping`, {
          method: 'GET',
          signal: controller.signal,
          mode: 'cors'
        });
        // Si fallback fonctionne, l'utiliser
        this.config.server.primary = this.config.server.fallback;
      }
      
      clearTimeout(timeoutId);
      
      this.tailscaleConnected = response.ok;
      this.updateConnectionStatus(this.tailscaleConnected);
      
      if (this.tailscaleConnected) {
        console.log('[SyncManager] Serveur connecté:', this.config.server.primary);
        // Récupérer l'état du serveur
        await this.fetchServerState();
      }
      
      return this.tailscaleConnected;
    } catch (error) {
      console.log('[SyncManager] Aucun serveur disponible:', error.message);
      this.tailscaleConnected = false;
      this.updateConnectionStatus(false);
      return false;
    }
  }
  
  async fetchServerState() {
    try {
      const response = await fetch(`${this.config.server.primary}/api/sync/state`, {
        headers: {
          'X-Device-Id': this.deviceId,
          'X-Device-Type': this.getDeviceType()
        }
      });
      
      if (response.ok) {
        const state = await response.json();
        console.log('[SyncManager] État serveur:', state);
        
        // Comparer avec l'état local
        await this.compareStates(state);
      }
    } catch (error) {
      console.error('[SyncManager] Erreur récupération état:', error);
    }
  }
  
  async compareStates(serverState) {
    const localState = await this.getLocalState();
    
    // Identifier les différences
    const differences = {
      toUpload: [],
      toDownload: [],
      conflicts: []
    };
    
    // Logique de comparaison (simplifiée)
    if (serverState.lastModified > localState.lastModified) {
      differences.toDownload.push('all');
    } else if (localState.lastModified > serverState.lastModified) {
      differences.toUpload.push('all');
    }
    
    // Résoudre les conflits si nécessaire
    if (differences.conflicts.length > 0) {
      await this.resolveConflicts(differences.conflicts);
    }
    
    return differences;
  }
  
  async addToQueue(action, priority = 2) {
    const item = {
      id: this.generateUUID(),
      action: action,
      priority: priority,
      timestamp: Date.now(),
      device: this.deviceId,
      attempts: 0,
      status: 'pending'
    };
    
    this.queue.push(item);
    this.queue.sort((a, b) => a.priority - b.priority);
    
    // Sauvegarder dans IndexedDB
    await this.saveQueue();
    
    // Traiter immédiatement si priorité urgente et connecté
    if (priority === this.config.priorities.URGENT && this.tailscaleConnected) {
      this.processQueue();
    }
    
    return item.id;
  }
  
  async processQueue() {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }
    
    // Vérifier la connexion serveur avant de synchroniser
    if (!this.tailscaleConnected) {
      const connected = await this.checkServerConnection();
      if (!connected) {
        console.log('[SyncManager] Sync reportée - Serveur non disponible');
        return;
      }
    }
    
    this.isSyncing = true;
    this.updateSyncStatus('syncing');
    
    try {
      // Traiter par batch
      const batch = this.queue.splice(0, this.config.sync.batchSize);
      
      console.log(`[SyncManager] Synchronisation de ${batch.length} éléments...`);
      
      const payload = {
        deviceId: this.deviceId,
        deviceType: this.getDeviceType(),
        timestamp: Date.now(),
        items: batch
      };
      
      // Compresser si nécessaire
      const compressed = await this.compressPayload(payload);
      
      const response = await fetch(`${this.config.server.primary}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': this.deviceId,
          'X-Compressed': compressed.compressed ? 'true' : 'false'
        },
        body: JSON.stringify(compressed.data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[SyncManager] Sync réussie:', result);
        
        this.lastSync = Date.now();
        this.updateSyncStatus('success');
        
        // Traiter la réponse du serveur
        await this.handleSyncResponse(result);
        
        // Sauvegarder l'état
        await this.saveQueue();
        
        // Continuer s'il reste des éléments
        if (this.queue.length > 0) {
          setTimeout(() => this.processQueue(), 1000);
        }
      } else {
        throw new Error(`Sync failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[SyncManager] Erreur sync:', error);
      
      // Remettre les éléments dans la queue
      this.queue.unshift(...batch);
      
      // Incrémenter les tentatives
      batch.forEach(item => item.attempts++);
      
      // Retry avec backoff exponentiel
      const delay = Math.min(
        this.config.sync.retryDelay * Math.pow(2, batch[0].attempts),
        60000
      );
      
      setTimeout(() => this.processQueue(), delay);
      
      this.updateSyncStatus('error');
    } finally {
      this.isSyncing = false;
    }
  }
  
  async compressPayload(payload) {
    const jsonString = JSON.stringify(payload);
    
    // Compresser si > 1KB
    if (jsonString.length > 1024) {
      try {
        const compressed = await this.gzipCompress(jsonString);
        return {
          compressed: true,
          data: compressed
        };
      } catch (error) {
        console.log('[SyncManager] Compression échouée, envoi non compressé');
      }
    }
    
    return {
      compressed: false,
      data: payload
    };
  }
  
  async gzipCompress(str) {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(new TextEncoder().encode(str));
    writer.close();
    
    const compressed = [];
    const reader = stream.readable.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      compressed.push(...value);
    }
    
    return btoa(String.fromCharCode(...compressed));
  }
  
  async handleSyncResponse(response) {
    // Traiter les mises à jour du serveur
    if (response.updates) {
      await this.applyServerUpdates(response.updates);
    }
    
    // Traiter les conflits
    if (response.conflicts && response.conflicts.length > 0) {
      await this.resolveConflicts(response.conflicts);
    }
    
    // Mettre à jour le token de sync
    if (response.syncToken) {
      localStorage.setItem('sync-token', response.syncToken);
    }
  }
  
  async applyServerUpdates(updates) {
    console.log('[SyncManager] Application des mises à jour serveur:', updates.length);
    
    for (const update of updates) {
      try {
        // Appliquer la mise à jour selon son type
        switch (update.type) {
          case 'expertise':
            await this.updateExpertise(update.data);
            break;
          case 'agenda':
            await this.updateAgenda(update.data);
            break;
          case 'document':
            await this.updateDocument(update.data);
            break;
          default:
            console.warn('[SyncManager] Type de mise à jour inconnu:', update.type);
        }
      } catch (error) {
        console.error('[SyncManager] Erreur application mise à jour:', error);
      }
    }
  }
  
  async resolveConflicts(conflicts) {
    console.log('[SyncManager] Résolution de conflits:', conflicts.length);
    
    for (const conflict of conflicts) {
      // Stratégie de résolution selon le type
      let resolution;
      
      if (conflict.autoResolvable) {
        // Résolution automatique (Last Write Wins par défaut)
        resolution = conflict.local.timestamp > conflict.server.timestamp 
          ? conflict.local 
          : conflict.server;
      } else {
        // Demander à l'utilisateur
        resolution = await this.promptUserForResolution(conflict);
      }
      
      // Appliquer la résolution
      await this.applyConflictResolution(conflict.id, resolution);
    }
  }
  
  async promptUserForResolution(conflict) {
    // Créer une interface pour résoudre le conflit
    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'sync-conflict-modal';
      modal.innerHTML = `
        <div class="conflict-content">
          <h3>Conflit de synchronisation</h3>
          <div class="conflict-comparison">
            <div class="local-version">
              <h4>Version locale</h4>
              <pre>${JSON.stringify(conflict.local, null, 2)}</pre>
              <button onclick="resolveConflict('local')">Garder local</button>
            </div>
            <div class="server-version">
              <h4>Version serveur</h4>
              <pre>${JSON.stringify(conflict.server, null, 2)}</pre>
              <button onclick="resolveConflict('server')">Garder serveur</button>
            </div>
          </div>
          <button onclick="resolveConflict('merge')">Fusionner</button>
        </div>
      `;
      
      window.resolveConflict = (choice) => {
        modal.remove();
        if (choice === 'merge') {
          resolve(this.mergeConflicts(conflict.local, conflict.server));
        } else {
          resolve(conflict[choice]);
        }
      };
      
      document.body.appendChild(modal);
    });
  }
  
  mergeConflicts(local, server) {
    // Stratégie de fusion intelligente
    const merged = { ...server };
    
    // Garder les champs les plus récents
    for (const key in local) {
      if (local[key] !== server[key]) {
        // Logique de fusion selon le type de champ
        if (typeof local[key] === 'object' && typeof server[key] === 'object') {
          merged[key] = { ...server[key], ...local[key] };
        } else if (local.lastModified && server.lastModified) {
          merged[key] = local.lastModified > server.lastModified 
            ? local[key] 
            : server[key];
        }
      }
    }
    
    merged._merged = true;
    merged._mergeTime = Date.now();
    
    return merged;
  }
  
  startPeriodicSync() {
    // Synchronisation périodique désactivée - mode manuel uniquement
    console.log('[SyncManager] Synchronisation périodique désactivée - Mode manuel');
    
    // Garder la synchronisation adaptative pour la queue locale
    this.setupAdaptiveSync();
  }
  
  setupAdaptiveSync() {
    let activityTimer;
    
    // Détecter l'activité utilisateur
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        clearTimeout(activityTimer);
        
        // Sync après 30 secondes d'inactivité
        activityTimer = setTimeout(() => {
          if (this.queue.length > 0) {
            this.processQueue();
          }
        }, 30000);
      });
    });
  }
  
  updateConnectionStatus(connected) {
    const indicator = document.getElementById('connection-status');
    if (indicator) {
      const statusText = indicator.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = connected 
          ? `🟢 Serveur disponible` 
          : `🔴 Mode local`;
      }
      indicator.className = connected ? 'connection-status connected' : 'connection-status disconnected';
    }
    
    // Déclencher un événement personnalisé
    window.dispatchEvent(new CustomEvent('connectionchange', {
      detail: { connected, tailscale: this.tailscaleConnected }
    }));
  }
  
  updateSyncStatus(status) {
    const indicator = document.getElementById('sync-status');
    if (indicator) {
      switch (status) {
        case 'syncing':
          indicator.innerHTML = '🔄 Synchronisation...';
          break;
        case 'success':
          indicator.innerHTML = `✅ Synchronisé (${new Date().toLocaleTimeString()})`;
          break;
        case 'error':
          indicator.innerHTML = '❌ Erreur de sync';
          break;
      }
    }
    
    // Mettre à jour le badge si des éléments sont en attente
    if (this.queue.length > 0) {
      this.updateBadge(this.queue.length);
    }
  }
  
  updateBadge(count) {
    const badge = document.getElementById('sync-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'block' : 'none';
    }
  }
  
  async loadQueue() {
    // Charger depuis IndexedDB (implémenté dans offline-manager.js)
    if (window.offlineManager) {
      this.queue = await window.offlineManager.getQueue() || [];
    }
  }
  
  async saveQueue() {
    // Sauvegarder dans IndexedDB
    if (window.offlineManager) {
      await window.offlineManager.saveQueue(this.queue);
    }
  }
  
  async getLocalState() {
    // Récupérer l'état local depuis IndexedDB
    return {
      lastModified: parseInt(localStorage.getItem('last-modified') || '0'),
      itemCount: await this.getLocalItemCount(),
      checksum: await this.calculateLocalChecksum()
    };
  }
  
  async getLocalItemCount() {
    // Compter les éléments locaux
    if (window.offlineManager) {
      return await window.offlineManager.getItemCount();
    }
    return 0;
  }
  
  async calculateLocalChecksum() {
    // Calculer un checksum des données locales
    // Simplifié pour l'exemple
    return 'checksum-placeholder';
  }
  
  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'sync-success':
        console.log('[SyncManager] SW sync réussie:', data.data);
        this.updateSyncStatus('success');
        break;
      case 'sync-failed':
        console.error('[SyncManager] SW sync échouée:', data.data);
        this.updateSyncStatus('error');
        break;
      default:
        console.log('[SyncManager] Message SW:', data);
    }
  }
  
  // API publique
  async sync() {
    return this.processQueue();
  }
  
  async forceSyncNow() {
    await this.checkServerConnection();
    return this.processQueue();
  }
  
  // Nouvelle méthode pour synchroniser la BDD complète
  async syncFullDatabase() {
    console.log('[SyncManager] Synchronisation complète de la BDD...');
    
    try {
      const connected = await this.checkServerConnection();
      if (!connected) {
        throw new Error('Mac Mini non accessible. Vérifiez que :\n1. Le serveur CrimiTrack tourne sur le Mac Mini\n2. L\'iPad est sur le même réseau WiFi\n3. L\'IP du Mac Mini est bien 192.168.1.100');
      }
      
      // Essayer plusieurs endpoints possibles
      const endpoints = [
        '/api/sync/full-database',
        '/api/database',
        '/data/database.json'
      ];
      
      let response;
      let data;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`[SyncManager] Tentative: ${this.config.server.primary}${endpoint}`);
          response = await fetch(`${this.config.server.primary}${endpoint}`, {
            method: 'GET',
            headers: {
              'X-Device-Id': this.deviceId,
              'X-Device-Type': this.getDeviceType(),
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            data = await response.json();
            console.log('[SyncManager] Données récupérées depuis:', endpoint);
            break;
          }
        } catch (endpointError) {
          console.log(`[SyncManager] Échec ${endpoint}:`, endpointError.message);
          continue;
        }
      }
      
      if (!data) {
        throw new Error('Aucun endpoint de données accessible sur le Mac Mini');
      }
      
      // Sauvegarder dans IndexedDB
      if (window.offlineManager) {
        await window.offlineManager.saveFullDatabase(data);
      }
      
      // Mettre à jour l'interface
      this.updateSyncStatus('success');
      
      // Déclencher un événement pour que l'app se mette à jour
      window.dispatchEvent(new CustomEvent('databasesync', {
        detail: { data, timestamp: Date.now() }
      }));
      
      console.log('[SyncManager] BDD synchronisée avec succès');
      return data;
      
    } catch (error) {
      console.error('[SyncManager] Erreur sync BDD:', error);
      this.updateSyncStatus('error');
      throw error;
    }
  }
  
  // Créer le bouton de synchronisation visible
  createSyncButton() {
    const existingButton = document.getElementById('sync-database-button');
    if (existingButton) return;
    
    const button = document.createElement('button');
    button.id = 'sync-database-button';
    button.className = 'sync-database-button';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" class="sync-icon">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
      </svg>
      <span>Synchroniser BDD</span>
    `;
    
    button.addEventListener('click', async () => {
      button.classList.add('loading');
      try {
        await this.syncFullDatabase();
        this.showSyncNotification('Base de données synchronisée !', 'success');
      } catch (error) {
        this.showSyncNotification('Erreur de synchronisation', 'error');
      } finally {
        button.classList.remove('loading');
      }
    });
    
    // Ajouter le bouton dans le header
    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
      headerRight.insertBefore(button, headerRight.firstChild);
    }
  }
  
  showSyncNotification(message, type) {
    // Créer le container s'il n'existe pas
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 1100;
        max-width: 350px;
      `;
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      padding: 16px;
      margin-bottom: 10px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transform: translateX(100%);
      transition: transform 300ms ease;
      word-wrap: break-word;
      white-space: pre-line;
      ${type === 'error' ? 'background: #e74c3c;' : 'background: #27ae60;'}
    `;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Animation d'entrée
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-suppression
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, type === 'error' ? 6000 : 3000);
  }
  
  getStatus() {
    return {
      connected: navigator.onLine,
      tailscale: this.tailscaleConnected,
      syncing: this.isSyncing,
      queueLength: this.queue.length,
      lastSync: this.lastSync,
      deviceId: this.deviceId
    };
  }
}

// Initialiser le gestionnaire de synchronisation
window.syncManager = new SyncManager();

console.log('[SyncManager] Chargé et initialisé');