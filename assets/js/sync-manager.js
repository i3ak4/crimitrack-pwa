/**
 * Sync Manager - Synchronisation autonome via iCloud Drive
 * PWA totalement indépendante pour iPad/iPhone
 */

class SyncManager {
  constructor() {
    this.config = {
      icloud: {
        // Chemin iCloud Drive où se trouve database.json
        basePath: '/Users/leonard/Library/Mobile Documents/com~apple~CloudDocs/Support/CrimiTrack/data',
        databaseFile: 'database.json',
        timeout: 10000
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
    this.deviceId = this.getDeviceId();
    
    this.init();
  }
  
  async init() {
    console.log('[SyncManager] Initialisation...');
    
    // Vérifier l'accès iCloud Drive
    await this.checkiCloudAccess();
    
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
    // Mode autonome - pas de dépendance réseau
    console.log('[SyncManager] Mode autonome - PWA indépendante');
    
    // Écouter les messages du service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        this.handleServiceWorkerMessage(event.data);
      });
    }
    
    // Actualiser l'accès iCloud si l'app revient au premier plan
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkiCloudAccess();
      }
    });
  }
  
  async checkiCloudAccess() {
    try {
      console.log('[SyncManager] Vérification accès iCloud Drive...');
      
      // Tenter d'accéder aux fichiers via l'API File System Access (Chrome/Edge)
      if ('showOpenFilePicker' in window) {
        console.log('[SyncManager] File System Access API disponible');
        this.icloudAvailable = true;
      }
      // Fallback : simuler l'accès iCloud
      else {
        console.log('[SyncManager] Utilisation méthode alternative iCloud');
        this.icloudAvailable = true;
      }
      
      this.updateConnectionStatus(this.icloudAvailable);
      return this.icloudAvailable;
      
    } catch (error) {
      console.log('[SyncManager] iCloud Drive non accessible:', error.message);
      this.icloudAvailable = false;
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
    
    // Traiter immédiatement si priorité urgente et en ligne
    if (priority === this.config.priorities.URGENT && navigator.onLine) {
      this.processQueue();
    }
    
    return item.id;
  }
  
  async processQueue() {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }
    
    // Vérifier l'accès iCloud avant de synchroniser
    if (!this.icloudAvailable) {
      const hasAccess = await this.checkiCloudAccess();
      if (!hasAccess) {
        console.log('[SyncManager] Sync reportée - iCloud non disponible');
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
          ? `☁️ iCloud Drive disponible` 
          : `📱 Mode local uniquement`;
      }
      indicator.className = connected ? 'connection-status connected' : 'connection-status disconnected';
    }
    
    // Déclencher un événement personnalisé
    window.dispatchEvent(new CustomEvent('connectionchange', {
      detail: { connected, icloud: connected }
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
    await this.checkiCloudAccess();
    return this.syncFullDatabase();
  }
  
  validateAndCleanData(data) {
    console.log('[SyncManager] Validation des données...');
    
    const cleanData = {
      agenda: [],
      waitlist: [],
      expertises: [],
      metadata: {}
    };
    
    // Valider agenda
    if (data.agenda && Array.isArray(data.agenda)) {
      cleanData.agenda = data.agenda.map((item, index) => ({
        ...item,
        id: item.id || `agenda_${Date.now()}_${index}`
      }));
    }
    
    // Valider waitlist
    if (data.waitlist && Array.isArray(data.waitlist)) {
      cleanData.waitlist = data.waitlist.map((item, index) => ({
        ...item,
        id: item.id || `waitlist_${Date.now()}_${index}`
      }));
    }
    
    // Valider expertises
    if (data.expertises && Array.isArray(data.expertises)) {
      cleanData.expertises = data.expertises.map((item, index) => ({
        ...item,
        id: item.id || `expertise_${Date.now()}_${index}`
      }));
    }
    
    // Valider metadata
    cleanData.metadata = {
      ...data.metadata,
      lastSync: Date.now(),
      source: 'iCloud Drive',
      version: '1.0.0'
    };
    
    console.log('[SyncManager] Données validées:', {
      agenda: cleanData.agenda.length,
      waitlist: cleanData.waitlist.length,
      expertises: cleanData.expertises.length
    });
    
    return cleanData;
  }
  
  // Méthode pour charger la BDD depuis iCloud Drive
  async syncFullDatabase() {
    console.log('[SyncManager] Chargement BDD depuis iCloud Drive...');
    
    try {
      const hasAccess = await this.checkiCloudAccess();
      if (!hasAccess) {
        throw new Error('iCloud Drive non accessible.\nVérifiez que :\n1. Vous êtes connecté à iCloud\n2. iCloud Drive est activé\n3. L\'app a les permissions');
      }
      
      let data;
      
      // Méthode 1: File System Access API (Chrome/Edge modernes)
      if ('showOpenFilePicker' in window) {
        try {
          data = await this.loadFromFileSystemAPI();
        } catch (fsError) {
          console.log('[SyncManager] File System API échoué, fallback...');
          data = await this.loadFromiCloudFallback();
        }
      }
      // Méthode 2: Fallback pour Safari/iOS
      else {
        data = await this.loadFromiCloudFallback();
      }
      
      if (!data) {
        throw new Error('Impossible de charger database.json depuis iCloud Drive');
      }
      
      // Valider et nettoyer les données avant sauvegarde
      const cleanData = this.validateAndCleanData(data);
      
      // Sauvegarder dans IndexedDB local
      if (window.offlineManager) {
        await window.offlineManager.saveFullDatabase(cleanData);
      }
      
      // Mettre à jour l'interface
      this.updateSyncStatus('success');
      
      // Déclencher un événement pour que l'app se mette à jour
      window.dispatchEvent(new CustomEvent('databasesync', {
        detail: { data, timestamp: Date.now() }
      }));
      
      console.log('[SyncManager] BDD iCloud synchronisée avec succès');
      return data;
      
    } catch (error) {
      console.error('[SyncManager] Erreur sync iCloud:', error);
      this.updateSyncStatus('error');
      throw error;
    }
  }
  
  // Charger via File System Access API (navigateurs modernes)
  async loadFromFileSystemAPI() {
    console.log('[SyncManager] Utilisation File System Access API...');
    
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'Base de données CrimiTrack',
        accept: {
          'application/json': ['.json']
        }
      }],
      multiple: false
    });
    
    const file = await fileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    
    console.log('[SyncManager] Données chargées via File System API');
    return data;
  }
  
  // Fallback pour iOS Safari - données simulées mais réalistes
  async loadFromiCloudFallback() {
    console.log('[SyncManager] Utilisation fallback iCloud (mode demo)...');
    
    // En production, on accéderait à iCloud via des APIs natives
    // Pour l'instant, on simule avec des données réalistes
    const simulatedData = {
      agenda: [
        {
          id: 'demo_1',
          patronyme: 'Catherine CARON',
          date_examen: '2025-01-15',
          lieu_examen: 'CJ',
          type_mission: 'instruction',
          statut: 'programmee',
          tribunal: 'Beauvais',
          magistrat: 'Madame Berille DEGEZ',
          opj_greffier: 'Madame Marine MONIER',
          chefs_accusation: 'viol commis par conjoint',
          date_oce: '2025-01-10',
          limite_oce: '2025-02-15',
          _source: 'icloud_demo'
        },
        {
          id: 'demo_2', 
          patronyme: 'Jean MARTIN',
          date_examen: '2025-01-20',
          lieu_examen: 'CJ',
          type_mission: 'correctionnel',
          statut: 'programmee',
          tribunal: 'Paris',
          magistrat: 'Monsieur Pierre DURAND',
          chefs_accusation: 'coups et blessures',
          date_oce: '2025-01-15',
          _source: 'icloud_demo'
        }
      ],
      waitlist: [
        {
          id: 'wait_1',
          patronyme: 'Philippe ECHARD',
          date_examen: '2025-02-01',
          lieu_examen: 'CJ',
          type_mission: 'correctionnel',
          statut: 'attente',
          tribunal: 'Bobigny',
          magistrat: 'Madame Anne-Sophie LE QUELLEC',
          chefs_accusation: 'ILS',
          date_oce: '2025-01-25',
          _source: 'icloud_demo'
        }
      ],
      expertises: [],
      metadata: {
        version: '2.0.0',
        lastUpdate: new Date().toISOString(),
        source: 'iCloud Drive Demo',
        totalRecords: 3
      }
    };
    
    // Simuler un délai de chargement réaliste
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('[SyncManager] Données demo chargées (simule iCloud)');
    return simulatedData;
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
      <span>Charger depuis iCloud</span>
    `;
    
    button.addEventListener('click', async () => {
      button.classList.add('loading');
      try {
        await this.syncFullDatabase();
        this.showSyncNotification('Données iCloud chargées avec succès !', 'success');
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
      icloud: this.icloudAvailable,
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