/**
 * CrimiTrack PWA - Application Manager v2.0
 * Orchestrateur principal de l'application refactorisée
 * Gestion modulaire, performance optimisée, architecture moderne
 */

class AppManager {
  constructor() {
    this.version = '2.0.0';
    this.modules = new Map();
    this.loadedModules = new Set();
    this.currentModule = null;
    this.deviceInfo = this.detectDevice();
    this.isStandalone = this.checkStandalone();
    this.isInitialized = false;
    
    // Configuration selon l'appareil
    this.config = this.getDeviceConfig();
    
    // Gestionnaires core
    this.stateManager = null;
    this.router = null;
    this.eventBus = null;
    this.databaseManager = null;
    this.syncManager = null;
    
    console.log(`[AppManager] v${this.version} - Initialisation sur ${this.deviceInfo.type}`);
  }
  
  detectDevice() {
    const ua = navigator.userAgent;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    let type = 'Unknown';
    let capabilities = [];
    
    if (/iPhone/.test(ua) || (width <= 430 && height <= 932)) {
      type = 'iPhone';
      capabilities = ['touch', 'portrait', 'mobile'];
    } else if (/iPad/.test(ua) || (width > 430 && width <= 1366)) {
      type = 'iPad';
      capabilities = ['touch', 'tablet', 'landscape-primary'];
    } else if (/Mac/.test(ua) || width > 1366) {
      type = 'MacBook';
      capabilities = ['desktop', 'keyboard', 'mouse'];
    }
    
    return {
      type,
      width,
      height,
      capabilities,
      orientation: this.getOrientation(),
      pixelRatio: window.devicePixelRatio || 1,
      touch: 'ontouchstart' in window,
      standalone: this.checkStandalone()
    };
  }
  
  getOrientation() {
    if (window.screen && window.screen.orientation) {
      return window.screen.orientation.angle;
    }
    return window.orientation || 0;
  }
  
  checkStandalone() {
    // iOS Safari
    if (window.navigator.standalone) return true;
    
    // Android Chrome
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    
    // Windows PWA
    if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return true;
    
    return false;
  }
  
  getDeviceConfig() {
    const configs = {
      iPhone: {
        modules: ['agenda', 'waitlist', 'statistics', 'convocations'],
        layout: 'mobile',
        navigation: 'bottom',
        lazyLoad: true,
        cacheSize: 50, // MB
        syncInterval: 30000 // 30s
      },
      iPad: {
        modules: ['agenda', 'waitlist', 'statistics', 'convocations', 'publipostage', 'billing'],
        layout: 'tablet',
        navigation: 'sidebar-auto',
        lazyLoad: true,
        cacheSize: 200, // MB
        syncInterval: 60000 // 1m
      },
      MacBook: {
        modules: ['agenda', 'waitlist', 'statistics', 'convocations', 'publipostage', 'billing', 'synthese', 'import'],
        layout: 'desktop',
        navigation: 'sidebar-fixed',
        lazyLoad: false,
        cacheSize: 500, // MB
        syncInterval: 120000 // 2m
      }
    };
    
    return configs[this.deviceInfo.type] || configs.iPad;
  }
  
  async init() {
    if (this.isInitialized) {
      console.warn('[AppManager] Déjà initialisé');
      return;
    }
    
    try {
      console.log('[AppManager] Début initialisation...');
      
      // 1. Masquer splash screen avec animation
      await this.showSplashScreen();
      
      // 2. Initialiser les gestionnaires core
      await this.initializeCoreManagers();
      
      // 3. Charger la configuration persistante
      await this.loadConfiguration();
      
      // 4. Initialiser l'interface utilisateur
      await this.initializeUI();
      
      // 5. Configurer le routage
      await this.setupRouting();
      
      // 6. Charger les modules selon la configuration
      await this.loadInitialModules();
      
      // 7. Configurer les gestionnaires d'événements
      this.setupEventListeners();
      
      // 8. Vérifier et charger les données
      await this.initializeData();
      
      // 9. Masquer splash et afficher l'application
      await this.hideSplashScreen();
      
      this.isInitialized = true;
      console.log('[AppManager] Initialisation terminée avec succès');
      
      // Déclencher l'événement d'application prête
      this.eventBus.emit('app:ready', {
        version: this.version,
        device: this.deviceInfo,
        modules: Array.from(this.loadedModules)
      });
      
    } catch (error) {
      console.error('[AppManager] Erreur lors de l\'initialisation:', error);
      await this.handleInitializationError(error);
    }
  }
  
  async showSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.display = 'flex';
      // Mise à jour du status
      const statusEl = splash.querySelector('.splash-status');
      if (statusEl) {
        statusEl.textContent = 'Initialisation des composants...';
      }
    }
  }
  
  async initializeCoreManagers() {
    console.log('[AppManager] Initialisation des gestionnaires core...');
    
    // Charger et initialiser les gestionnaires dans l'ordre
    const managers = [
      { name: 'EventBus', path: './event-bus.js' },
      { name: 'StateManager', path: './state-manager.js' },
      { name: 'Router', path: './router.js' }
    ];
    
    for (const manager of managers) {
      try {
        const module = await this.loadScript(manager.path);
        
        switch (manager.name) {
          case 'EventBus':
            this.eventBus = new EventBus();
            break;
          case 'StateManager':
            this.stateManager = new StateManager(this.eventBus);
            break;
          case 'Router':
            this.router = new Router(this.eventBus);
            break;
        }
        
        console.log(`[AppManager] ${manager.name} initialisé`);
      } catch (error) {
        console.error(`[AppManager] Erreur chargement ${manager.name}:`, error);
        throw error;
      }
    }
    
    // Charger les gestionnaires de données
    await this.initializeDataManagers();
  }
  
  async initializeDataManagers() {
    console.log('[AppManager] Initialisation des gestionnaires de données...');
    
    try {
      // Charger DatabaseManager refactorisé
      await this.loadScript('../data/database-manager.js');
      this.databaseManager = new DatabaseManager(this.eventBus, this.config);
      await this.databaseManager.init();
      
      // Charger SyncManager refactorisé
      await this.loadScript('../data/sync-manager.js');
      this.syncManager = new SyncManager(this.eventBus, this.databaseManager, this.config);
      await this.syncManager.init();
      
    } catch (error) {
      console.error('[AppManager] Erreur gestionnaires données:', error);
      throw error;
    }
  }
  
  async loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = path;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Impossible de charger ${path}`));
      document.head.appendChild(script);
    });
  }
  
  async loadConfiguration() {
    console.log('[AppManager] Chargement configuration...');
    
    try {
      // Charger configuration depuis IndexedDB
      const config = await this.databaseManager.getConfiguration();
      
      if (config) {
        // Fusionner avec configuration par défaut
        this.config = { ...this.config, ...config };
      }
      
      // Sauvegarder configuration courante
      await this.databaseManager.saveConfiguration(this.config);
      
    } catch (error) {
      console.warn('[AppManager] Configuration par défaut utilisée:', error);
    }
  }
  
  async initializeUI() {
    console.log('[AppManager] Initialisation interface utilisateur...');
    
    // Appliquer les classes CSS selon l'appareil
    document.body.className = `device-${this.deviceInfo.type.toLowerCase()}`;
    
    if (this.isStandalone) {
      document.body.classList.add('standalone');
    }
    
    // Configurer l'interface selon le layout
    this.configureLayout();
    
    // Initialiser les composants UI
    await this.initializeUIComponents();
    
    // Configurer les safe areas iOS
    this.setupSafeAreas();
  }
  
  configureLayout() {
    const layout = this.config.layout;
    document.body.classList.add(`layout-${layout}`);
    
    // Configurer la navigation
    const sidebar = document.getElementById('sidebar');
    const bottomNav = document.getElementById('bottom-nav');
    
    switch (this.config.navigation) {
      case 'bottom':
        if (sidebar) sidebar.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'flex';
        break;
      case 'sidebar-fixed':
        if (sidebar) {
          sidebar.style.display = 'block';
          sidebar.classList.add('fixed');
        }
        if (bottomNav) bottomNav.style.display = 'none';
        break;
      case 'sidebar-auto':
        if (sidebar) sidebar.style.display = 'block';
        if (bottomNav) bottomNav.style.display = 'none';
        break;
    }
  }
  
  async initializeUIComponents() {
    // Initialiser les composants UI réutilisables
    try {
      await this.loadScript('../ui/components/modal.js');
      await this.loadScript('../ui/components/toast.js');
      await this.loadScript('../ui/components/loading.js');
      
      // Créer instances globales
      window.Modal = new ModalManager();
      window.Toast = new ToastManager();
      window.Loading = new LoadingManager();
      
    } catch (error) {
      console.warn('[AppManager] Composants UI optionnels non chargés:', error);
    }
  }
  
  setupSafeAreas() {
    if (this.deviceInfo.type === 'iPhone' || this.deviceInfo.type === 'iPad') {
      // Détecter et appliquer les safe areas
      const safeAreaTop = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-inset-top');
      
      if (parseInt(safeAreaTop) > 20) {
        document.body.classList.add('has-notch');
      }
    }
  }
  
  async setupRouting() {
    console.log('[AppManager] Configuration du routage...');
    
    // Configurer les routes
    this.router.addRoute('/', () => this.navigateToModule('agenda'));
    this.router.addRoute('/agenda', () => this.navigateToModule('agenda'));
    this.router.addRoute('/waitlist', () => this.navigateToModule('waitlist'));
    this.router.addRoute('/statistics', () => this.navigateToModule('statistics'));
    this.router.addRoute('/convocations', () => this.navigateToModule('convocations'));
    this.router.addRoute('/publipostage', () => this.navigateToModule('publipostage'));
    this.router.addRoute('/billing', () => this.navigateToModule('billing'));
    
    // Démarrer le routeur
    this.router.start();
  }
  
  async loadInitialModules() {
    console.log('[AppManager] Chargement des modules initiaux...');
    
    const modulesToLoad = this.config.lazyLoad 
      ? ['agenda'] // Charger seulement le module par défaut
      : this.config.modules; // Charger tous les modules
    
    for (const moduleName of modulesToLoad) {
      try {
        await this.loadModule(moduleName);
      } catch (error) {
        console.error(`[AppManager] Erreur chargement module ${moduleName}:`, error);
      }
    }
  }
  
  async loadModule(moduleName) {
    if (this.loadedModules.has(moduleName)) {
      return this.modules.get(moduleName);
    }
    
    console.log(`[AppManager] Chargement module ${moduleName}...`);
    
    try {
      // Charger le module
      const modulePath = `../modules/${moduleName}/${moduleName}-module.js`;
      await this.loadScript(modulePath);
      
      // Créer l'instance du module
      const ModuleClass = window[`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module`];
      if (!ModuleClass) {
        throw new Error(`Classe de module ${moduleName} non trouvée`);
      }
      
      const moduleInstance = new ModuleClass({
        eventBus: this.eventBus,
        stateManager: this.stateManager,
        databaseManager: this.databaseManager,
        config: this.config
      });
      
      // Initialiser le module
      await moduleInstance.init();
      
      // Enregistrer le module
      this.modules.set(moduleName, moduleInstance);
      this.loadedModules.add(moduleName);
      
      console.log(`[AppManager] Module ${moduleName} chargé avec succès`);
      
      return moduleInstance;
      
    } catch (error) {
      console.error(`[AppManager] Erreur chargement module ${moduleName}:`, error);
      throw error;
    }
  }
  
  async navigateToModule(moduleName) {
    console.log(`[AppManager] Navigation vers ${moduleName}`);
    
    try {
      // Charger le module si nécessaire
      if (!this.loadedModules.has(moduleName)) {
        await this.loadModule(moduleName);
      }
      
      const module = this.modules.get(moduleName);
      if (!module) {
        throw new Error(`Module ${moduleName} non trouvé`);
      }
      
      // Désactiver le module précédent
      if (this.currentModule && this.currentModule !== moduleName) {
        const previousModule = this.modules.get(this.currentModule);
        if (previousModule && typeof previousModule.deactivate === 'function') {
          await previousModule.deactivate();
        }
      }
      
      // Activer le nouveau module
      await module.activate();
      
      // Mettre à jour l'état
      this.currentModule = moduleName;
      this.stateManager.setState('currentModule', moduleName);
      
      // Mettre à jour l'UI
      this.updateNavigationState(moduleName);
      
      // Déclencher l'événement
      this.eventBus.emit('module:changed', { 
        from: this.currentModule, 
        to: moduleName 
      });
      
    } catch (error) {
      console.error(`[AppManager] Erreur navigation vers ${moduleName}:`, error);
      window.Toast?.error(`Erreur lors du chargement du module ${moduleName}`);
    }
  }
  
  updateNavigationState(activeModule) {
    // Mettre à jour tous les éléments de navigation
    const navElements = document.querySelectorAll('[data-module]');
    navElements.forEach(element => {
      element.classList.toggle('active', element.dataset.module === activeModule);
    });
  }
  
  setupEventListeners() {
    console.log('[AppManager] Configuration des événements...');
    
    // Événements de navigation
    this.setupNavigationEvents();
    
    // Événements d'orientation
    this.setupOrientationEvents();
    
    // Événements de cycle de vie
    this.setupLifecycleEvents();
    
    // Événements clavier (desktop)
    if (this.deviceInfo.type === 'MacBook') {
      this.setupKeyboardEvents();
    }
  }
  
  setupNavigationEvents() {
    // Navigation via data-module
    document.addEventListener('click', (event) => {
      const moduleElement = event.target.closest('[data-module]');
      if (moduleElement) {
        event.preventDefault();
        const moduleName = moduleElement.dataset.module;
        this.router.navigate(`/${moduleName}`);
      }
    });
  }
  
  setupOrientationEvents() {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.deviceInfo.orientation = this.getOrientation();
        this.eventBus.emit('device:orientationchange', this.deviceInfo);
      }, 100);
    });
  }
  
  setupLifecycleEvents() {
    // Visibilité de la page
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.eventBus.emit('app:hidden');
      } else {
        this.eventBus.emit('app:visible');
      }
    });
    
    // Avant déchargement
    window.addEventListener('beforeunload', (event) => {
      this.eventBus.emit('app:beforeunload');
    });
  }
  
  setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
      // Raccourcis clavier
      if ((event.metaKey || event.ctrlKey)) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            this.openQuickSearch();
            break;
          case 'n':
            event.preventDefault();
            this.createNewItem();
            break;
          case 's':
            event.preventDefault();
            this.triggerSync();
            break;
        }
      }
      
      if (event.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }
  
  async initializeData() {
    console.log('[AppManager] Initialisation des données...');
    
    try {
      // Vérifier les données locales
      const hasLocalData = await this.databaseManager.hasData();
      
      if (!hasLocalData) {
        // Proposer de charger depuis iCloud
        this.showiCloudLoadPrompt();
      } else {
        // Charger les statistiques
        await this.loadDashboardStats();
      }
      
    } catch (error) {
      console.error('[AppManager] Erreur initialisation données:', error);
    }
  }
  
  showiCloudLoadPrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'icloud-prompt';
    prompt.innerHTML = `
      <div class="prompt-content">
        <h3>Première utilisation</h3>
        <p>Chargez vos données CrimiTrack depuis iCloud Drive pour commencer.</p>
        <div class="prompt-actions">
          <button id="load-icloud" class="btn-primary">Charger depuis iCloud</button>
          <button id="use-demo" class="btn-secondary">Utiliser les données de démo</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(prompt);
    
    document.getElementById('load-icloud').addEventListener('click', () => {
      prompt.remove();
      this.syncManager.loadFromiCloud();
    });
    
    document.getElementById('use-demo').addEventListener('click', () => {
      prompt.remove();
      this.syncManager.loadDemoData();
    });
  }
  
  async loadDashboardStats() {
    try {
      const stats = await this.databaseManager.getStats();
      this.stateManager.setState('stats', stats);
      this.updateStatsDisplay(stats);
    } catch (error) {
      console.error('[AppManager] Erreur chargement stats:', error);
    }
  }
  
  updateStatsDisplay(stats) {
    const statElements = {
      'stat-expertises': stats.expertises || 0,
      'stat-rdv': stats.agenda || 0,
      'stat-waiting': stats.waitlist || 0,
      'stat-sync': stats.pendingSync || 0
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value.toLocaleString('fr-FR');
      }
    });
  }
  
  async hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('hide');
      await new Promise(resolve => setTimeout(resolve, 500));
      splash.remove();
    }
  }
  
  async handleInitializationError(error) {
    console.error('[AppManager] Erreur fatale:', error);
    
    // Afficher un message d'erreur à l'utilisateur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fatal-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <h3>Erreur de chargement</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()">Recharger l'application</button>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Masquer le splash screen
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
  }
  
  // API publique
  openQuickSearch() {
    console.log('[AppManager] Recherche rapide');
    // À implémenter
  }
  
  createNewItem() {
    if (this.currentModule) {
      const module = this.modules.get(this.currentModule);
      if (module && typeof module.createNew === 'function') {
        module.createNew();
      }
    }
  }
  
  triggerSync() {
    if (this.syncManager) {
      this.syncManager.forceSyncNow();
    }
  }
  
  closeAllModals() {
    document.querySelectorAll('.modal, .prompt, .overlay').forEach(el => {
      el.remove();
    });
  }
  
  getStatus() {
    return {
      version: this.version,
      initialized: this.isInitialized,
      device: this.deviceInfo,
      currentModule: this.currentModule,
      loadedModules: Array.from(this.loadedModules),
      config: this.config
    };
  }
}

// Export global
window.AppManager = AppManager;