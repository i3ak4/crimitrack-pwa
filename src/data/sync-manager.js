/**
 * CrimiTrack PWA - Sync Manager v2.0
 * Gestionnaire de synchronisation iCloud Drive refactorisé
 * Gestion robuste des fichiers, validation avancée, UI optimisée
 */

class SyncManager {
  constructor(eventBus, databaseManager, config) {
    this.eventBus = eventBus;
    this.databaseManager = databaseManager;
    this.config = config;
    
    this.isInitialized = false;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncStatus = 'idle';
    
    // Configuration
    this.settings = {
      maxFileSize: 50 * 1024 * 1024, // 50MB max
      allowedExtensions: ['.json'],
      validateStructure: true,
      autoValidation: true,
      backupBeforeSync: true,
      compressionThreshold: 1024 * 1024 // 1MB
    };
    
    // Métriques
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncDuration: 0,
      averageSyncTime: 0,
      dataTransferred: 0
    };
    
    console.log('[SyncManager] v2.0 initialisé');
  }
  
  /**
   * Initialiser le gestionnaire de synchronisation
   */
  async init() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      console.log('[SyncManager] Initialisation...');
      
      // Charger les métriques sauvegardées
      await this.loadMetrics();
      
      // Vérifier les capacités du navigateur
      this.checkBrowserCapabilities();
      
      // Créer l'interface utilisateur
      this.createSyncInterface();
      
      // Configurer les événements
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('[SyncManager] Initialisé avec succès');
      
      this.eventBus.emit('sync:ready');
      
    } catch (error) {
      console.error('[SyncManager] Erreur initialisation:', error);
      throw error;
    }
  }
  
  /**
   * Vérifier les capacités du navigateur
   */
  checkBrowserCapabilities() {
    this.capabilities = {
      fileSystemAccess: 'showOpenFilePicker' in window,
      fileReader: 'FileReader' in window,
      compressionStreams: 'CompressionStream' in window,
      webWorkers: 'Worker' in window,
      indexedDB: 'indexedDB' in window
    };
    
    console.log('[SyncManager] Capacités détectées:', this.capabilities);
    
    if (!this.capabilities.fileReader) {
      throw new Error('FileReader API non supporté par ce navigateur');
    }
  }
  
  /**
   * Créer l'interface de synchronisation
   */
  createSyncInterface() {
    // Vérifier si l'interface existe déjà
    if (document.getElementById('sync-interface')) {
      return;
    }
    
    const interface = document.createElement('div');
    interface.id = 'sync-interface';
    interface.className = 'sync-interface';
    interface.innerHTML = `
      <div class="sync-controls">
        <button id="load-icloud-btn" class="sync-btn primary">
          <svg class="sync-icon" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
          <span>Charger depuis iCloud</span>
        </button>
        
        <button id="load-demo-btn" class="sync-btn secondary">
          <svg class="sync-icon" viewBox="0 0 24 24">
            <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3.9,19 5,19 5,19H19C20.1,19 21,18.1 21,17V5C21,3.9 20.1,3 19,3M19,17H5V5H19V17Z" />
          </svg>
          <span>Données de démo</span>
        </button>
        
        <button id="export-data-btn" class="sync-btn outline">
          <svg class="sync-icon" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
          <span>Exporter</span>
        </button>
      </div>
      
      <div class="sync-status" id="sync-status">
        <div class="status-indicator" id="status-indicator"></div>
        <span class="status-text" id="status-text">Prêt pour synchronisation</span>
      </div>
      
      <div class="sync-progress" id="sync-progress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="progress-text" id="progress-text">Préparation...</div>
      </div>
      
      <div class="sync-metrics" id="sync-metrics">
        <div class="metric">
          <span class="metric-label">Dernière sync:</span>
          <span class="metric-value" id="last-sync-time">Jamais</span>
        </div>
        <div class="metric">
          <span class="metric-label">Syncs réussies:</span>
          <span class="metric-value" id="success-count">${this.metrics.successfulSyncs}</span>
        </div>
      </div>
    `;
    
    // Ajouter l'interface au header ou au footer selon l'appareil
    const target = document.querySelector('.header-right') || document.body;
    target.appendChild(interface);
    
    // Attacher les événements
    this.attachInterfaceEvents();
  }
  
  /**
   * Attacher les événements de l'interface
   */
  attachInterfaceEvents() {
    const loadiCloudBtn = document.getElementById('load-icloud-btn');
    const loadDemoBtn = document.getElementById('load-demo-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    
    if (loadiCloudBtn) {
      loadiCloudBtn.addEventListener('click', () => this.loadFromiCloud());
    }
    
    if (loadDemoBtn) {
      loadDemoBtn.addEventListener('click', () => this.loadDemoData());
    }
    
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => this.exportData());
    }
  }
  
  /**
   * Configurer les événements système
   */
  setupEventListeners() {
    // Écouter les événements de base de données
    this.eventBus.on('database:updated', () => {
      this.updateSyncStatus('data_updated');
    });
    
    // Écouter les changements de visibilité
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.lastSyncTime) {
        this.checkForUpdates();
      }
    });
    
    // Écouter les erreurs globales
    window.addEventListener('error', (event) => {
      if (event.filename && event.filename.includes('sync')) {
        this.handleSyncError(event.error);
      }
    });
  }
  
  /**
   * Charger des données depuis iCloud Drive
   */
  async loadFromiCloud() {
    if (this.isSyncing) {
      console.warn('[SyncManager] Synchronisation déjà en cours');
      return;
    }
    
    const startTime = performance.now();
    this.metrics.totalSyncs++;
    
    try {
      console.log('[SyncManager] Début chargement iCloud Drive...');
      
      this.setSyncStatus('loading', 'Accès à iCloud Drive...');
      this.showProgress(0, 'Ouverture du sélecteur de fichier...');
      
      // Étape 1: Sélectionner et lire le fichier
      const fileData = await this.selectAndReadFile();
      this.showProgress(30, 'Fichier lu, validation en cours...');
      
      // Étape 2: Valider la structure
      const validatedData = await this.validateFileData(fileData);
      this.showProgress(60, 'Données validées, sauvegarde...');
      
      // Étape 3: Backup des données existantes (optionnel)
      if (this.settings.backupBeforeSync) {
        await this.createBackup();
      }
      
      this.showProgress(80, 'Mise à jour de la base de données...');
      
      // Étape 4: Sauvegarder dans la base
      await this.databaseManager.saveFullDatabase(validatedData);
      
      this.showProgress(100, 'Synchronisation terminée !');
      
      // Métriques
      const duration = performance.now() - startTime;
      this.updateMetrics(true, duration, this.calculateDataSize(validatedData));
      
      this.setSyncStatus('success', `Synchronisation réussie (${Math.round(duration)}ms)`);
      
      // Masquer la progression après un délai
      setTimeout(() => this.hideProgress(), 2000);
      
      // Déclencher les événements
      this.eventBus.emit('sync:complete', {
        type: 'icloud',
        success: true,
        duration,
        recordsCount: this.countRecords(validatedData)
      });
      
      // Suggérer de recharger la page
      this.showReloadPrompt();
      
      console.log('[SyncManager] Chargement iCloud terminé avec succès');
      
    } catch (error) {
      console.error('[SyncManager] Erreur chargement iCloud:', error);
      
      this.metrics.failedSyncs++;
      this.setSyncStatus('error', this.getErrorMessage(error));
      this.hideProgress();
      
      this.eventBus.emit('sync:error', {
        type: 'icloud',
        error: error.message
      });
      
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Sélectionner et lire un fichier
   */
  async selectAndReadFile() {
    if (this.capabilities.fileSystemAccess) {
      return await this.selectFileModern();
    } else {
      return await this.selectFileFallback();
    }
  }
  
  /**
   * Sélection de fichier moderne (File System Access API)
   */
  async selectFileModern() {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Base de données CrimiTrack',
          accept: {
            'application/json': ['.json']
          }
        }],
        multiple: false,
        excludeAcceptAllOption: true
      });
      
      const file = await fileHandle.getFile();
      
      // Vérifications de sécurité
      this.validateFile(file);
      
      const content = await file.text();
      return JSON.parse(content);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Sélection de fichier annulée');
      }
      throw error;
    }
  }
  
  /**
   * Sélection de fichier fallback (input classique)
   */
  async selectFileFallback() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';
      
      let resolved = false;
      
      input.onchange = async (event) => {
        if (resolved) return;
        resolved = true;
        
        try {
          const file = event.target.files[0];
          if (!file) {
            throw new Error('Aucun fichier sélectionné');
          }
          
          this.validateFile(file);
          
          const content = await file.text();
          const data = JSON.parse(content);
          
          document.body.removeChild(input);
          resolve(data);
          
        } catch (error) {
          document.body.removeChild(input);
          reject(error);
        }
      };
      
      input.oncancel = () => {
        if (resolved) return;
        resolved = true;
        
        document.body.removeChild(input);
        reject(new Error('Sélection de fichier annulée'));
      };
      
      // Timeout de sécurité
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          document.body.removeChild(input);
          reject(new Error('Timeout de sélection de fichier'));
        }
      }, 60000); // 1 minute
      
      document.body.appendChild(input);
      input.click();
    });
  }
  
  /**
   * Valider un fichier
   */
  validateFile(file) {
    // Vérifier la taille
    if (file.size > this.settings.maxFileSize) {
      throw new Error(`Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)}MB max: ${Math.round(this.settings.maxFileSize / 1024 / 1024)}MB)`);
    }
    
    // Vérifier l'extension
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.settings.allowedExtensions.includes(extension)) {
      throw new Error(`Extension de fichier non autorisée: ${extension}`);
    }
    
    // Vérifier le type MIME
    if (file.type && !file.type.includes('json')) {
      console.warn('[SyncManager] Type MIME inattendu:', file.type);
    }
    
    console.log('[SyncManager] Fichier validé:', {
      name: file.name,
      size: `${Math.round(file.size / 1024)}KB`,
      type: file.type
    });
  }
  
  /**
   * Valider les données du fichier
   */
  async validateFileData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Structure de données invalide');
    }
    
    console.log('[SyncManager] Validation de la structure des données...');
    
    // Structure attendue
    const expectedStructure = {
      agenda: 'array',
      expertises: 'array',
      metadata: 'object'
    };
    
    const validatedData = {
      agenda: [],
      waitlist: [],
      expertises: [],
      documents: [],
      metadata: {}
    };
    
    // Valider chaque section
    for (const [key, expectedType] of Object.entries(expectedStructure)) {
      if (data[key]) {
        if (expectedType === 'array' && Array.isArray(data[key])) {
          validatedData[key] = data[key];
        } else if (expectedType === 'object' && typeof data[key] === 'object') {
          validatedData[key] = data[key];
        } else {
          console.warn(`[SyncManager] Type invalide pour ${key}, ignoré`);
        }
      }
    }
    
    // Traiter la waitlist si elle existe
    if (data.waitlist && Array.isArray(data.waitlist)) {
      validatedData.waitlist = data.waitlist;
    }
    
    // Traiter les documents si ils existent
    if (data.documents && Array.isArray(data.documents)) {
      validatedData.documents = data.documents;
    }
    
    // Valider les métadonnées
    validatedData.metadata = {
      ...data.metadata,
      importTime: new Date().toISOString(),
      importSource: 'iCloud Drive',
      version: '2.0.0'
    };
    
    // Statistiques de validation
    const stats = {
      agenda: validatedData.agenda.length,
      waitlist: validatedData.waitlist.length,
      expertises: validatedData.expertises.length,
      documents: validatedData.documents.length
    };
    
    console.log('[SyncManager] Données validées:', stats);
    
    if (stats.agenda === 0 && stats.expertises === 0) {
      throw new Error('Aucune donnée valide trouvée dans le fichier');
    }
    
    return validatedData;
  }
  
  /**
   * Charger des données de démonstration
   */
  async loadDemoData() {
    if (this.isSyncing) {
      console.warn('[SyncManager] Synchronisation déjà en cours');
      return;
    }
    
    const startTime = performance.now();
    this.metrics.totalSyncs++;
    
    try {
      console.log('[SyncManager] Chargement des données de démonstration...');
      
      this.setSyncStatus('loading', 'Génération des données de démo...');
      this.showProgress(0, 'Création des données...');
      
      // Simuler un délai de chargement réaliste
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const demoData = this.generateDemoData();
      this.showProgress(50, 'Validation des données...');
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      this.showProgress(80, 'Sauvegarde en cours...');
      
      await this.databaseManager.saveFullDatabase(demoData);
      
      this.showProgress(100, 'Démonstration chargée !');
      
      // Métriques
      const duration = performance.now() - startTime;
      this.updateMetrics(true, duration, this.calculateDataSize(demoData));
      
      this.setSyncStatus('success', `Données de démo chargées (${Math.round(duration)}ms)`);
      
      setTimeout(() => this.hideProgress(), 2000);
      
      this.eventBus.emit('sync:complete', {
        type: 'demo',
        success: true,
        duration,
        recordsCount: this.countRecords(demoData)
      });
      
      this.showReloadPrompt();
      
      console.log('[SyncManager] Données de démo chargées avec succès');
      
    } catch (error) {
      console.error('[SyncManager] Erreur chargement démo:', error);
      
      this.metrics.failedSyncs++;
      this.setSyncStatus('error', 'Erreur chargement démonstration');
      this.hideProgress();
      
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Générer des données de démonstration
   */
  generateDemoData() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return {
      agenda: [
        {
          id: 'demo_agenda_1',
          patronyme: 'Catherine CARON',
          date_examen: today,
          lieu_examen: 'CJ',
          type_mission: 'instruction',
          statut: 'programmee',
          tribunal: 'Beauvais',
          magistrat: 'Madame Berille DEGEZ',
          opj_greffier: 'Madame Marine MONIER',
          chefs_accusation: 'viol commis par conjoint',
          date_oce: '2024-12-01',
          limite_oce: '2025-02-15',
          _lastModified: Date.now(),
          _source: 'demo'
        },
        {
          id: 'demo_agenda_2',
          patronyme: 'Jean MARTIN',
          date_examen: nextWeek,
          lieu_examen: 'CJ',
          type_mission: 'correctionnel',
          statut: 'programmee',
          tribunal: 'Paris',
          magistrat: 'Monsieur Pierre DURAND',
          chefs_accusation: 'coups et blessures',
          date_oce: '2024-12-10',
          _lastModified: Date.now(),
          _source: 'demo'
        }
      ],
      waitlist: [
        {
          id: 'demo_waitlist_1',
          patronyme: 'Philippe ECHARD',
          date_examen: '2025-02-01',
          lieu_examen: 'CJ',
          type_mission: 'correctionnel',
          statut: 'attente',
          tribunal: 'Bobigny',
          magistrat: 'Madame Anne-Sophie LE QUELLEC',
          chefs_accusation: 'ILS',
          date_oce: '2024-12-15',
          _lastModified: Date.now(),
          _isWaitlist: true,
          _source: 'demo'
        }
      ],
      expertises: [
        {
          id: 'demo_expertise_1',
          numero_dossier: 'DEMO2024-001',
          date_creation: now.toISOString(),
          statut: 'en_cours',
          type_expertise: 'expertise psychiatrique',
          _lastModified: Date.now(),
          _source: 'demo'
        }
      ],
      documents: [],
      metadata: {
        version: '2.0.0',
        source: 'Données de démonstration',
        created: now.toISOString(),
        totalRecords: 4,
        demo: true
      }
    };
  }
  
  /**
   * Exporter les données
   */
  async exportData() {
    try {
      console.log('[SyncManager] Export des données...');
      
      this.setSyncStatus('loading', 'Préparation de l\'export...');
      
      const data = await this.databaseManager.getAllData();
      const exportData = {
        ...data,
        metadata: {
          ...data.metadata,
          exportTime: new Date().toISOString(),
          exportedBy: 'CrimiTrack PWA v2.0'
        }
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Générer un nom de fichier
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `crimitrack-export-${timestamp}.json`;
      
      // Télécharger le fichier
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      this.setSyncStatus('success', 'Export réussi');
      
      this.eventBus.emit('sync:export', {
        filename,
        size: blob.size,
        recordsCount: this.countRecords(exportData)
      });
      
      console.log('[SyncManager] Export terminé:', filename);
      
    } catch (error) {
      console.error('[SyncManager] Erreur export:', error);
      this.setSyncStatus('error', 'Erreur lors de l\'export');
    }
  }
  
  /**
   * Créer une sauvegarde
   */
  async createBackup() {
    try {
      const data = await this.databaseManager.getAllData();
      const backupKey = `backup_${Date.now()}`;
      
      localStorage.setItem(backupKey, JSON.stringify(data));
      
      // Nettoyer les anciennes sauvegardes (garder seulement les 3 dernières)
      const backups = Object.keys(localStorage)
        .filter(key => key.startsWith('backup_'))
        .sort()
        .reverse();
      
      backups.slice(3).forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('[SyncManager] Sauvegarde créée:', backupKey);
      
    } catch (error) {
      console.warn('[SyncManager] Erreur sauvegarde:', error);
    }
  }
  
  /**
   * Mettre à jour le statut de synchronisation
   */
  setSyncStatus(status, message) {
    this.syncStatus = status;
    this.lastSyncTime = Date.now();
    
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (statusIndicator) {
      statusIndicator.className = `status-indicator ${status}`;
    }
    
    if (statusText) {
      statusText.textContent = message;
    }
    
    // Émettre l'événement
    this.eventBus.emit('sync:status', { status, message });
  }
  
  /**
   * Afficher la progression
   */
  showProgress(percentage, text) {
    const progressContainer = document.getElementById('sync-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressContainer) {
      progressContainer.style.display = 'block';
    }
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = text;
    }
  }
  
  /**
   * Masquer la progression
   */
  hideProgress() {
    const progressContainer = document.getElementById('sync-progress');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }
  
  /**
   * Afficher un prompt de rechargement
   */
  showReloadPrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'reload-prompt';
    prompt.innerHTML = `
      <div class="prompt-content">
        <h3>✅ Synchronisation terminée</h3>
        <p>Rechargez la page pour voir les nouvelles données.</p>
        <div class="prompt-actions">
          <button onclick="window.location.reload()" class="btn-primary">Recharger</button>
          <button onclick="this.closest('.reload-prompt').remove()" class="btn-secondary">Plus tard</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(prompt);
    
    // Auto-suppression après 10 secondes
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.remove();
      }
    }, 10000);
  }
  
  /**
   * Mettre à jour les métriques
   */
  updateMetrics(success, duration, dataSize) {
    if (success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
    }
    
    this.metrics.lastSyncDuration = duration;
    this.metrics.dataTransferred += dataSize;
    
    // Calculer le temps moyen
    if (this.metrics.totalSyncs > 0) {
      this.metrics.averageSyncTime = 
        (this.metrics.averageSyncTime * (this.metrics.totalSyncs - 1) + duration) / 
        this.metrics.totalSyncs;
    }
    
    // Sauvegarder les métriques
    this.saveMetrics();
    
    // Mettre à jour l'affichage
    this.updateMetricsDisplay();
  }
  
  /**
   * Calculer la taille des données
   */
  calculateDataSize(data) {
    return new Blob([JSON.stringify(data)]).size;
  }
  
  /**
   * Compter les enregistrements
   */
  countRecords(data) {
    return (data.agenda?.length || 0) + 
           (data.waitlist?.length || 0) + 
           (data.expertises?.length || 0) + 
           (data.documents?.length || 0);
  }
  
  /**
   * Obtenir un message d'erreur convivial
   */
  getErrorMessage(error) {
    if (error.name === 'AbortError') {
      return 'Opération annulée par l\'utilisateur';
    }
    
    if (error.message.includes('JSON')) {
      return 'Fichier JSON invalide ou corrompu';
    }
    
    if (error.message.includes('taille') || error.message.includes('size')) {
      return 'Fichier trop volumineux';
    }
    
    if (error.message.includes('extension') || error.message.includes('type')) {
      return 'Type de fichier non supporté';
    }
    
    return error.message || 'Erreur de synchronisation';
  }
  
  /**
   * Charger les métriques sauvegardées
   */
  async loadMetrics() {
    try {
      const saved = localStorage.getItem('sync_metrics');
      if (saved) {
        const savedMetrics = JSON.parse(saved);
        this.metrics = { ...this.metrics, ...savedMetrics };
      }
    } catch (error) {
      console.warn('[SyncManager] Erreur chargement métriques:', error);
    }
  }
  
  /**
   * Sauvegarder les métriques
   */
  saveMetrics() {
    try {
      localStorage.setItem('sync_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('[SyncManager] Erreur sauvegarde métriques:', error);
    }
  }
  
  /**
   * Mettre à jour l'affichage des métriques
   */
  updateMetricsDisplay() {
    const lastSyncEl = document.getElementById('last-sync-time');
    const successCountEl = document.getElementById('success-count');
    
    if (lastSyncEl && this.lastSyncTime) {
      const timeAgo = this.formatTimeAgo(this.lastSyncTime);
      lastSyncEl.textContent = timeAgo;
    }
    
    if (successCountEl) {
      successCountEl.textContent = this.metrics.successfulSyncs;
    }
  }
  
  /**
   * Formater le temps écoulé
   */
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'À l\'instant';
  }
  
  /**
   * Vérifier les mises à jour
   */
  async checkForUpdates() {
    // Cette méthode pourrait vérifier si le fichier iCloud a été modifié
    // Pour l'instant, on se contente de log
    console.log('[SyncManager] Vérification des mises à jour...');
  }
  
  /**
   * Gérer les erreurs de synchronisation
   */
  handleSyncError(error) {
    console.error('[SyncManager] Erreur de synchronisation:', error);
    
    this.metrics.failedSyncs++;
    this.setSyncStatus('error', this.getErrorMessage(error));
    
    this.eventBus.emit('sync:error', {
      error: error.message,
      timestamp: Date.now()
    });
  }
  
  /**
   * Forcer une synchronisation manuelle
   */
  async forceSyncNow() {
    console.log('[SyncManager] Synchronisation forcée demandée');
    
    // Pour l'instant, proposer de charger depuis iCloud
    if (confirm('Voulez-vous charger les données depuis iCloud Drive ?')) {
      await this.loadFromiCloud();
    }
  }
  
  /**
   * Obtenir le statut du gestionnaire
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      syncing: this.isSyncing,
      status: this.syncStatus,
      lastSync: this.lastSyncTime,
      metrics: { ...this.metrics },
      capabilities: { ...this.capabilities }
    };
  }
}

// Export global
window.SyncManager = SyncManager;