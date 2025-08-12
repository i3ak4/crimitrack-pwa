/**
 * Connection Manager - Gestion intelligente de la connectivité
 * Détection Tailscale, bascule online/offline, indicateurs visuels
 */

class ConnectionManager {
  constructor() {
    this.state = {
      online: navigator.onLine,
      tailscale: false,
      serverAvailable: false,
      connectionType: this.getConnectionType(),
      lastCheck: null,
      autoMode: true
    };
    
    this.callbacks = new Map();
    this.checkInterval = null;
    this.serverEndpoint = 'http://mac-mini.tail-scale.ts.net:8081';
    this.fallbackEndpoint = 'http://192.168.1.100:8081';
    
    this.init();
  }
  
  async init() {
    console.log('[ConnectionManager] Initialisation...');
    
    // Configurer les listeners
    this.setupEventListeners();
    
    // Vérification initiale
    await this.checkConnectivity();
    
    // Démarrer le monitoring
    this.startMonitoring();
    
    // Mettre à jour l'UI
    this.updateUI();
    
    console.log('[ConnectionManager] Prêt');
  }
  
  setupEventListeners() {
    // Événements réseau natifs
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Network Information API si disponible
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.handleConnectionChange();
      });
    }
    
    // Visibilité de la page
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkConnectivity();
      }
    });
    
    // Bouton de synchronisation manuelle
    const syncButton = document.getElementById('sync-button');
    if (syncButton) {
      syncButton.addEventListener('click', () => this.forceSyncNow());
    }
    
    // Bouton toggle online/offline
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
      connectionStatus.addEventListener('click', () => this.toggleConnectionMode());
    }
  }
  
  getConnectionType() {
    if (!navigator.onLine) return 'offline';
    
    if ('connection' in navigator) {
      const conn = navigator.connection;
      const type = conn.effectiveType || conn.type;
      
      // Mapper les types de connexion
      if (type === 'slow-2g' || type === '2g') return '2g';
      if (type === '3g') return '3g';
      if (type === '4g') return '4g';
      if (type === 'wifi' || type === 'ethernet') return 'wifi';
    }
    
    // Détecter 5G par user agent (approximatif)
    const ua = navigator.userAgent;
    if (ua.includes('5G') || (ua.includes('iPhone') && parseInt(ua.match(/iPhone OS (\d+)/)?.[1]) >= 14)) {
      return '5g';
    }
    
    return 'unknown';
  }
  
  async checkConnectivity() {
    console.log('[ConnectionManager] Vérification connectivité...');
    
    // 1. Vérifier si online
    this.state.online = navigator.onLine;
    
    if (!this.state.online) {
      this.state.tailscale = false;
      this.state.serverAvailable = false;
      this.updateState();
      return false;
    }
    
    // 2. Vérifier Tailscale
    this.state.tailscale = await this.checkTailscale();
    
    // 3. Vérifier serveur
    this.state.serverAvailable = await this.checkServer();
    
    // 4. Mettre à jour le type de connexion
    this.state.connectionType = this.getConnectionType();
    
    // 5. Timestamp
    this.state.lastCheck = Date.now();
    
    this.updateState();
    
    return this.state.serverAvailable;
  }
  
  async checkTailscale() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${this.serverEndpoint}/api/ping`, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Pour éviter les erreurs CORS
      });
      
      clearTimeout(timeoutId);
      
      // Si on arrive ici sans erreur, Tailscale est probablement connecté
      return true;
    } catch (error) {
      // Essayer le fallback
      try {
        const response = await fetch(`${this.fallbackEndpoint}/api/ping`, {
          method: 'HEAD',
          mode: 'no-cors'
        });
        this.serverEndpoint = this.fallbackEndpoint; // Utiliser le fallback
        return true;
      } catch {
        return false;
      }
    }
  }
  
  async checkServer() {
    if (!this.state.tailscale) return false;
    
    try {
      const response = await fetch(`${this.serverEndpoint}/api/status`, {
        method: 'GET',
        headers: {
          'X-Device-Type': this.getDeviceType(),
          'X-Connection-Type': this.state.connectionType
        }
      });
      
      if (response.ok) {
        const status = await response.json();
        console.log('[ConnectionManager] Serveur disponible:', status);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[ConnectionManager] Serveur indisponible:', error);
      return false;
    }
  }
  
  getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Mac/.test(ua)) return 'MacBook';
    return 'Unknown';
  }
  
  startMonitoring() {
    // Vérifier toutes les 30 secondes
    this.checkInterval = setInterval(() => {
      if (document.hidden) return; // Ne pas vérifier si la page est cachée
      this.checkConnectivity();
    }, 30000);
    
    // Monitoring adaptatif selon l'activité
    this.setupAdaptiveMonitoring();
  }
  
  setupAdaptiveMonitoring() {
    let inactivityTimer;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      
      // Après 2 minutes d'inactivité, réduire la fréquence
      inactivityTimer = setTimeout(() => {
        clearInterval(this.checkInterval);
        this.checkInterval = setInterval(() => {
          this.checkConnectivity();
        }, 60000); // Vérifier toutes les minutes
      }, 120000);
    };
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });
  }
  
  handleOnline() {
    console.log('[ConnectionManager] Connexion rétablie');
    this.state.online = true;
    this.checkConnectivity();
    
    // Notifier les composants
    this.emit('online');
    
    // Afficher notification
    this.showNotification('Connexion rétablie', 'success');
  }
  
  handleOffline() {
    console.log('[ConnectionManager] Connexion perdue');
    this.state.online = false;
    this.state.tailscale = false;
    this.state.serverAvailable = false;
    this.updateState();
    
    // Notifier les composants
    this.emit('offline');
    
    // Afficher notification
    this.showNotification('Mode hors ligne activé', 'warning');
  }
  
  handleConnectionChange() {
    const oldType = this.state.connectionType;
    const newType = this.getConnectionType();
    
    if (oldType !== newType) {
      console.log(`[ConnectionManager] Connexion changée: ${oldType} → ${newType}`);
      this.state.connectionType = newType;
      
      // Adapter la stratégie selon le type
      this.adaptStrategy(newType);
      
      this.updateState();
      this.emit('connectionchange', { from: oldType, to: newType });
    }
  }
  
  adaptStrategy(connectionType) {
    // Adapter les paramètres selon le type de connexion
    const strategies = {
      'offline': {
        syncInterval: null,
        cacheFirst: true,
        prefetch: false,
        imageQuality: 'low'
      },
      '2g': {
        syncInterval: 300000, // 5 minutes
        cacheFirst: true,
        prefetch: false,
        imageQuality: 'low'
      },
      '3g': {
        syncInterval: 180000, // 3 minutes
        cacheFirst: true,
        prefetch: false,
        imageQuality: 'medium'
      },
      '4g': {
        syncInterval: 60000, // 1 minute
        cacheFirst: false,
        prefetch: true,
        imageQuality: 'high'
      },
      '5g': {
        syncInterval: 30000, // 30 secondes
        cacheFirst: false,
        prefetch: true,
        imageQuality: 'full'
      },
      'wifi': {
        syncInterval: 30000, // 30 secondes
        cacheFirst: false,
        prefetch: true,
        imageQuality: 'full'
      }
    };
    
    const strategy = strategies[connectionType] || strategies['4g'];
    
    // Appliquer la stratégie
    if (window.syncManager) {
      window.syncManager.config.sync.interval = strategy.syncInterval;
    }
    
    // Notifier les autres composants
    this.emit('strategychange', strategy);
  }
  
  toggleConnectionMode() {
    this.state.autoMode = !this.state.autoMode;
    
    if (this.state.autoMode) {
      this.showNotification('Mode automatique activé', 'info');
      this.checkConnectivity();
    } else {
      // Forcer le mode offline
      this.state.online = false;
      this.state.tailscale = false;
      this.state.serverAvailable = false;
      this.updateState();
      this.showNotification('Mode hors ligne forcé', 'info');
    }
  }
  
  async forceSyncNow() {
    const syncButton = document.getElementById('sync-button');
    if (syncButton) {
      syncButton.classList.add('syncing');
    }
    
    try {
      // Vérifier la connexion d'abord
      const connected = await this.checkConnectivity();
      
      if (!connected) {
        this.showNotification('Impossible de synchroniser - Serveur non disponible', 'error');
        return;
      }
      
      // Lancer la synchronisation
      if (window.syncManager) {
        await window.syncManager.forceSyncNow();
        this.showNotification('Synchronisation réussie', 'success');
      }
    } catch (error) {
      console.error('[ConnectionManager] Erreur sync:', error);
      this.showNotification('Erreur de synchronisation', 'error');
    } finally {
      if (syncButton) {
        syncButton.classList.remove('syncing');
      }
    }
  }
  
  updateState() {
    // Mettre à jour l'UI
    this.updateUI();
    
    // Émettre l'événement de changement d'état
    this.emit('statechange', this.state);
    
    // Logger l'état
    console.log('[ConnectionManager] État:', this.state);
  }
  
  updateUI() {
    // Indicateur de connexion
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
      const statusText = connectionStatus.querySelector('.status-text');
      
      if (this.state.serverAvailable) {
        connectionStatus.className = 'connection-status connected';
        statusText.textContent = `En ligne (Mac Mini)`;
      } else if (this.state.online) {
        connectionStatus.className = 'connection-status';
        statusText.textContent = `En ligne (Local)`;
      } else {
        connectionStatus.className = 'connection-status disconnected';
        statusText.textContent = `Hors ligne`;
      }
      
      // Ajouter le type de connexion
      if (this.state.connectionType !== 'unknown' && this.state.connectionType !== 'offline') {
        statusText.textContent += ` • ${this.state.connectionType.toUpperCase()}`;
      }
    }
    
    // Badge de synchronisation
    const syncBadge = document.getElementById('sync-badge');
    if (syncBadge && window.syncManager) {
      const queueLength = window.syncManager.queue.length;
      syncBadge.textContent = queueLength;
      syncBadge.style.display = queueLength > 0 ? 'flex' : 'none';
    }
    
    // Statut de synchronisation
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus && window.syncManager) {
      const lastSync = window.syncManager.lastSync;
      if (lastSync) {
        const date = new Date(lastSync);
        const time = date.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        syncStatus.querySelector('.sync-status-text').textContent = `Dernière sync: ${time}`;
      }
    }
    
    // Mode auto/manuel
    if (!this.state.autoMode) {
      const indicator = document.createElement('div');
      indicator.className = 'manual-mode-indicator';
      indicator.textContent = 'Mode manuel';
      document.body.appendChild(indicator);
    } else {
      const indicator = document.querySelector('.manual-mode-indicator');
      if (indicator) indicator.remove();
    }
  }
  
  showNotification(message, type = 'info') {
    // Créer toast notification
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto-dismiss
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // Event Emitter Pattern
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[ConnectionManager] Erreur callback ${event}:`, error);
        }
      });
    }
  }
  
  // API Publique
  
  isOnline() {
    return this.state.online;
  }
  
  isTailscaleConnected() {
    return this.state.tailscale;
  }
  
  isServerAvailable() {
    return this.state.serverAvailable;
  }
  
  getConnectionType() {
    return this.state.connectionType;
  }
  
  getState() {
    return { ...this.state };
  }
  
  async waitForConnection(timeout = 30000) {
    return new Promise((resolve, reject) => {
      if (this.state.serverAvailable) {
        resolve(true);
        return;
      }
      
      const timeoutId = setTimeout(() => {
        this.off('statechange', handler);
        reject(new Error('Connection timeout'));
      }, timeout);
      
      const handler = (state) => {
        if (state.serverAvailable) {
          clearTimeout(timeoutId);
          this.off('statechange', handler);
          resolve(true);
        }
      };
      
      this.on('statechange', handler);
    });
  }
  
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.callbacks.clear();
  }
}

// Initialiser le gestionnaire de connexion
window.connectionManager = new ConnectionManager();

// Exposer l'état global
window.isOnline = () => window.connectionManager.isOnline();
window.isTailscaleConnected = () => window.connectionManager.isTailscaleConnected();

console.log('[ConnectionManager] Chargé et initialisé');