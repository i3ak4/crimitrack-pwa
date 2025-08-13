/**
 * Log Manager - Capture et sauvegarde tous les logs de la PWA
 * Permet d'exporter les logs pour diagnostic
 */

class LogManager {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Limite pour éviter trop de mémoire
    this.startTime = Date.now();
    this.isInitialized = false;
    
    this.init();
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('[LogManager] Initialisation...');
    // Déjà initialisé dans le constructeur via init()
    this.isInitialized = true;
    console.log('[LogManager] ✅ Initialisé');
  }
  
  init() {
    console.log('[LogManager] Initialisation du gestionnaire de logs');
    
    // Charger les logs existants
    this.loadLogs();
    
    // Capturer tous les console.log, console.error, etc.
    this.interceptConsole();
    
    // Capturer les erreurs JavaScript
    this.interceptErrors();
    
    // Capturer les erreurs de réseau
    this.interceptNetworkErrors();
    
    // Ajouter bouton d'export dans le header
    setTimeout(() => this.createExportButton(), 1000); // Délai pour que le DOM soit prêt
    
    this.addLog('INFO', '[LogManager] Gestionnaire de logs démarré');
  }
  
  interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    
    console.log = (...args) => {
      this.addLog('LOG', args.join(' '));
      originalLog.apply(console, args);
    };
    
    console.error = (...args) => {
      this.addLog('ERROR', args.join(' '));
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      this.addLog('WARN', args.join(' '));
      originalWarn.apply(console, args);
    };
    
    console.info = (...args) => {
      this.addLog('INFO', args.join(' '));
      originalInfo.apply(console, args);
    };
  }
  
  interceptErrors() {
    window.addEventListener('error', (event) => {
      this.addLog('ERROR', `JavaScript Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('ERROR', `Unhandled Promise Rejection: ${event.reason}`);
    });
  }
  
  interceptNetworkErrors() {
    // Intercepter les fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      this.addLog('NETWORK', `Fetch Request: ${url}`);
      
      try {
        const response = await originalFetch(...args);
        this.addLog('NETWORK', `Fetch Response: ${url} - Status: ${response.status}`);
        return response;
      } catch (error) {
        this.addLog('ERROR', `Fetch Error: ${url} - ${error.message}`);
        throw error;
      }
    };
  }
  
  addLog(level, message) {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;
    
    const logEntry = {
      timestamp,
      uptime,
      level,
      message,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.logs.push(logEntry);
    
    // Maintenir la limite de logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Supprimer le plus ancien
    }
    
    // Sauvegarder dans localStorage
    this.saveLogs();
  }
  
  saveLogs() {
    try {
      const logsToSave = this.logs.slice(-500); // Garder les 500 derniers
      localStorage.setItem('crimitrack_logs', JSON.stringify(logsToSave));
    } catch (error) {
      // Si localStorage est plein, vider et réessayer
      localStorage.removeItem('crimitrack_logs');
      const logsToSave = this.logs.slice(-100); // Garder seulement 100
      localStorage.setItem('crimitrack_logs', JSON.stringify(logsToSave));
    }
  }
  
  loadLogs() {
    try {
      const savedLogs = localStorage.getItem('crimitrack_logs');
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        this.logs = [...parsedLogs, ...this.logs];
      }
    } catch (error) {
      console.warn('Impossible de charger les logs sauvegardés:', error);
    }
  }
  
  exportLogs() {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      timestamp: new Date().toISOString()
    };
    
    const exportData = {
      deviceInfo,
      sessionInfo: {
        startTime: new Date(this.startTime).toISOString(),
        duration: Date.now() - this.startTime,
        totalLogs: this.logs.length
      },
      logs: this.logs
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `crimitrack-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    // Déclencher le téléchargement
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Nettoyer l'URL
    URL.revokeObjectURL(link.href);
    
    this.addLog('INFO', 'Logs exportés avec succès');
    
    return exportData;
  }
  
  createExportButton() {
    // Éviter les doublons
    if (document.getElementById('export-logs-button')) return;
    
    const button = document.createElement('button');
    button.id = 'export-logs-button';
    button.className = 'sync-database-button export-logs-button';
    button.style.cssText = `
      background: #e74c3c;
      margin-left: 10px;
      font-size: 12px;
      padding: 8px 12px;
    `;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" class="sync-icon" style="width: 16px; height: 16px;">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
      </svg>
      <span>Logs</span>
    `;
    
    button.addEventListener('click', () => {
      button.classList.add('loading');
      
      try {
        this.exportLogs();
        this.showNotification('Logs exportés dans Téléchargements !', 'success');
      } catch (error) {
        this.addLog('ERROR', `Erreur export logs: ${error.message}`);
        this.showNotification('Erreur export logs', 'error');
      } finally {
        button.classList.remove('loading');
      }
    });
    
    // Ajouter le bouton dans le header
    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
      headerRight.appendChild(button);
    }
  }
  
  showNotification(message, type) {
    // Utiliser le système de notification existant
    if (window.syncManager && window.syncManager.showSyncNotification) {
      window.syncManager.showSyncNotification(message, type);
    } else {
      // Fallback simple
      alert(message);
    }
  }
  
  clearLogs() {
    this.logs = [];
    localStorage.removeItem('crimitrack_logs');
    this.addLog('INFO', 'Logs effacés');
  }
  
  getLogs(level = null, limit = null) {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }
  
  getStats() {
    const stats = {
      total: this.logs.length,
      errors: this.logs.filter(log => log.level === 'ERROR').length,
      warnings: this.logs.filter(log => log.level === 'WARN').length,
      info: this.logs.filter(log => log.level === 'INFO').length,
      network: this.logs.filter(log => log.level === 'NETWORK').length,
      sessionDuration: Date.now() - this.startTime
    };
    
    return stats;
  }
}

// Exposer la classe LogManager globalement pour instanciation dans app.js
window.LogManager = LogManager;

console.log('[LogManager] Gestionnaire de logs chargé et initialisé');