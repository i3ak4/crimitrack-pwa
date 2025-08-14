/**
 * ============================================
 * 🎭 CrimiTrack PWA - Application Fantastique
 * Agent UI-Fantaisie - Excellence Interactive
 * ============================================
 */

class CrimiTrackPWA {
  constructor() {
    // Configuration de base
    this.version = '5.1.0';
    this.buildDate = '2025-08-14';
    
    // État de l'application
    this.currentModule = 'dashboard';
    this.modules = new Map();
    this.isInitialized = false;
    
    // Détection de l'appareil
    this.device = this.detectDevice();
    this.isStandalone = this.checkStandaloneMode();
    this.supportsPWA = this.checkPWASupport();
    
    // Gestionnaires principaux
    this.dataManager = null;
    this.syncManager = null;
    this.notificationManager = null;
    this.animationEngine = null;
    
    // Éléments DOM principaux
    this.elements = {};
    
    console.log(`🚀 CrimiTrack PWA v${this.version} - ${this.device.name}`);
    
    // Lancement de l'application
    this.initialize();
  }
  
  /* ============================================
     🔍 DÉTECTION DE L'APPAREIL ET CAPACITÉS
     ============================================ */
  
  detectDevice() {
    const ua = navigator.userAgent;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    
    // iPhone (toutes les tailles)
    if (/iPhone/i.test(ua)) {
      if (width >= 414) return { 
        name: 'iPhone Pro Max', 
        type: 'mobile', 
        optimizations: ['haptic', 'gestures', 'reduced-motion'] 
      };
      if (width >= 390) return { 
        name: 'iPhone Pro', 
        type: 'mobile', 
        optimizations: ['haptic', 'gestures', 'reduced-motion'] 
      };
      return { 
        name: 'iPhone', 
        type: 'mobile', 
        optimizations: ['haptic', 'gestures', 'reduced-motion', 'minimal-animations'] 
      };
    }
    
    // iPad (optimisé pour iPad Pro 13")
    if (/iPad/i.test(ua) || (width >= 768 && width <= 1366)) {
      if (width >= 1024) return { 
        name: 'iPad Pro 13"', 
        type: 'tablet', 
        optimizations: ['hover', 'multi-touch', 'advanced-animations', 'glass-effects'] 
      };
      return { 
        name: 'iPad', 
        type: 'tablet', 
        optimizations: ['hover', 'multi-touch', 'advanced-animations'] 
      };
    }
    
    // MacBook et desktop
    if (width >= 1024) {
      return { 
        name: 'MacBook', 
        type: 'desktop', 
        optimizations: ['hover', 'keyboard', 'complex-animations', 'glass-effects', 'parallax'] 
      };
    }
    
    // Fallback
    return { 
      name: 'Unknown', 
      type: 'mobile', 
      optimizations: ['reduced-motion'] 
    };
  }
  
  checkStandaloneMode() {
    return window.navigator.standalone || 
           window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: window-controls-overlay)').matches;
  }
  
  checkPWASupport() {
    return 'serviceWorker' in navigator && 
           'indexedDB' in window && 
           'fetch' in window;
  }
  
  /* ============================================
     🚀 INITIALISATION DE L'APPLICATION
     ============================================ */
  
  async initialize() {
    try {
      // Étape 1: Configuration initiale
      await this.setupConfiguration();
      
      // Étape 2: Éléments DOM
      this.cacheElements();
      
      // Étape 3: Gestionnaires principaux
      await this.initializeManagers();
      
      // Étape 4: Interface utilisateur
      await this.setupUI();
      
      // Étape 5: Modules de l'application
      await this.loadAllModules();
      
      // Étape 6: Navigation et interactions
      this.setupNavigation();
      this.setupInteractions();
      
      // Étape 7: Données initiales
      await this.loadInitialData();
      
      // Étape 8: Finalisation
      await this.finalizeLaunch();
      
      this.isInitialized = true;
      this.logSuccess('✅ Application entièrement initialisée');
      
    } catch (error) {
      console.error('❌ Erreur critique initialisation:', error);
      this.showCriticalError(error);
    }
  }
  
  async setupConfiguration() {
    // Configuration de l'appareil
    document.documentElement.className = `device-${this.device.type}`;
    document.body.classList.add(
      `device-${this.device.name.toLowerCase().replace(/\s+/g, '-')}`,
      this.isStandalone ? 'standalone' : 'browser',
      ...this.device.optimizations.map(opt => `opt-${opt}`)
    );
    
    // Variables CSS dynamiques
    this.updateCSSVariables();
    
    // Préférences utilisateur
    this.loadUserPreferences();
  }
  
  cacheElements() {
    this.elements = {
      // Navigation
      sidebar: document.getElementById('sidebar'),
      bottomNav: document.getElementById('bottom-nav'),
      sidebarOverlay: document.getElementById('sidebar-overlay'),
      menuToggle: document.getElementById('menu-toggle'),
      
      // Header
      header: document.getElementById('app-header'),
      globalSearch: document.getElementById('global-search'),
      searchResults: document.getElementById('search-results'),
      syncStatus: document.getElementById('sync-status'),
      notifications: document.getElementById('notifications'),
      profileButton: document.getElementById('profile-button'),
      
      // Contenu principal
      mainContent: document.getElementById('main-content'),
      moduleContainer: document.getElementById('module-container'),
      currentModuleBreadcrumb: document.getElementById('current-module'),
      
      // Modals et toasts
      modalSystem: document.getElementById('modal-system'),
      toastContainer: document.getElementById('toast-container'),
      installPrompt: document.getElementById('install-prompt')
    };
    
    this.logSuccess('🎯 Éléments DOM cachés');
  }
  
  async showDatabaseStatus() {
    const status = await this.dataManager.getStatus();
    console.log('📊 Statut de la base de données:', status);
    
    // Afficher dans une notification
    if (this.notificationManager) {
      const message = `Base de données: ${status.counts?.expertises || 0} expertises chargées`;
      this.notificationManager.showToast(message, 'success');
    }
    
    return status;
  }
  
  async initializeManagers() {
    try {
      // Vérifier que les classes des gestionnaires sont disponibles
      this.verifyManagerClasses();
      
      // Real Data Manager - Gestion des données réelles avec IndexedDB
      this.dataManager = new window.RealDataManager();
      await this.dataManager.initialize();
      
      // Afficher le statut des données
      await this.showDatabaseStatus();
      
      // Sync Manager - Synchronisation iCloud/serveur (sans paramètre dataManager car il l'obtient autrement)
      this.syncManager = new window.SyncManager();
      await this.syncManager.initialize();
      
      // Connection Manager - Gestion de la connectivité
      this.connectionManager = new window.ConnectionManager();
      await this.connectionManager.initialize();
      
      // Offline Manager - Gestion hors ligne
      this.offlineManager = new window.OfflineManager();
      await this.offlineManager.initialize();
      
      // Log Manager - Gestion des logs
      this.logManager = new window.LogManager();
      await this.logManager.initialize();
      
      // Publipostage Manager - Gestion du publipostage
      this.publipostageManager = new window.PublipostageManager();
      await this.publipostageManager.initialize();
      
      // Notification Manager - Système de notifications (défini localement)
      this.notificationManager = new NotificationManager();
      await this.notificationManager.initialize();
      
      // Animation Engine - Moteur d'animations fantastiques (défini localement)
      this.animationEngine = new AnimationEngine(this.device);
      await this.animationEngine.initialize();
      
      this.logSuccess('⚙️ Gestionnaires initialisés');
      
    } catch (error) {
      console.error('❌ Erreur initialisation gestionnaires:', error);
      this.showFallbackManagers();
      throw error;
    }
  }
  
  verifyManagerClasses() {
    const requiredClasses = [
      'RealDataManager',
      'SyncManager', 
      'ConnectionManager',
      'OfflineManager',
      'LogManager',
      'PublipostageManager'
    ];
    
    const missingClasses = requiredClasses.filter(className => !window[className]);
    
    if (missingClasses.length > 0) {
      console.error('❌ Classes gestionnaires manquantes:', missingClasses);
      throw new Error(`Classes manquantes: ${missingClasses.join(', ')}`);
    }
    
    console.log('✅ Toutes les classes gestionnaires sont disponibles');
  }
  
  showFallbackManagers() {
    console.log('🔄 Utilisation des gestionnaires de fallback...');
    
    // Gestionnaires simplifiés pour éviter les crashes
    this.dataManager = this.dataManager || new DataManager();
    this.syncManager = this.syncManager || new SyncManager();
    this.notificationManager = this.notificationManager || new NotificationManager();
    this.animationEngine = this.animationEngine || new AnimationEngine(this.device);
  }
  
  async setupUI() {
    // Masquer le splash screen avec animation
    await this.hideSplashScreen();
    
    // Configuration de l'interface selon l'appareil
    this.adaptUIForDevice();
    
    // Activation des animations
    this.animationEngine.activate();
    
    this.logSuccess('🎨 Interface utilisateur configurée');
  }
  
  async loadAllModules() {
    const moduleList = [
      // Modules principaux - TOUS les modules de l'app desktop
      { name: 'dashboard', priority: 1 },
      { name: 'agenda', priority: 1 },
      { name: 'waitlist', priority: 1 },
      { name: 'planning', priority: 2 },
      
      // Modules de communication
      { name: 'convocations', priority: 2 },
      { name: 'mailing', priority: 2 },
      
      // Modules de gestion
      { name: 'import', priority: 3 },
      { name: 'synthese', priority: 2 },
      { name: 'statistiques', priority: 2 },
      { name: 'billing', priority: 2 },
      
      // Modules outils
      { name: 'anonymisation', priority: 3 },
      { name: 'prompt-mastering', priority: 3 }
    ];
    
    // Charger par priorité
    for (let priority = 1; priority <= 3; priority++) {
      const modulesForPriority = moduleList.filter(m => m.priority === priority);
      await Promise.all(modulesForPriority.map(module => this.loadModule(module.name)));
    }
    
    this.logSuccess(`📦 ${moduleList.length} modules chargés`);
  }
  
  async loadModule(moduleName) {
    console.log(`🔄 Chargement du module ${moduleName}...`);
    
    try {
      // Vérifier que les gestionnaires sont bien initialisés
      if (!this.dataManager || !this.syncManager || !this.notificationManager || !this.animationEngine) {
        throw new Error('Gestionnaires non initialisés - dependencies manquantes');
      }
      
      // Tenter d'abord d'utiliser les classes déjà chargées globalement
      let ModuleClass;
      const moduleClassMap = {
        'dashboard': 'DashboardPWA',
        'agenda': 'AgendaPWA',
        'waitlist': 'WaitlistPWA',
        'convocations': 'ConvocationsPWA',
        'mailing': 'MailingPWA',
        'statistiques': 'StatistiquesPWA',
        'billing': 'BillingPWA',
        'planning': 'PlanningPWA',
        'import': 'ImportPWA',
        'synthese': 'SynthesePWA',
        'anonymisation': 'AnonymisationPWA',
        'prompt-mastering': 'PromptMasteringPWA'
      };
      
      const className = moduleClassMap[moduleName];
      if (!className) {
        throw new Error(`Nom de module inconnu: ${moduleName}`);
      }
      
      // Chercher la classe dans window et globalThis
      ModuleClass = window[className] || globalThis[className];
      
      if (!ModuleClass) {
        console.warn(`❌ Classe ${className} non trouvée dans window/globalThis pour module ${moduleName}`);
        throw new Error(`Classe ${className} non trouvée`);
      }
      
      console.log(`✅ Classe ${className} trouvée pour module ${moduleName}`);
      
      // Préparer les dépendances avec vérification
      const dependencies = {
        dataManager: this.dataManager,
        syncManager: this.syncManager,
        notificationManager: this.notificationManager,
        animationEngine: this.animationEngine,
        device: this.device
      };
      
      // Vérifier que toutes les dépendances sont valides
      const invalidDeps = Object.entries(dependencies)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
      
      if (invalidDeps.length > 0) {
        throw new Error(`Dépendances invalides: ${invalidDeps.join(', ')}`);
      }
      
      // Instancier le module
      console.log(`🔧 Instanciation du module ${moduleName}...`);
      const moduleInstance = new ModuleClass(dependencies);
      
      if (!moduleInstance) {
        throw new Error('Échec instanciation - moduleInstance null');
      }
      
      // Initialiser le module
      console.log(`⚡ Initialisation du module ${moduleName}...`);
      await moduleInstance.initialize();
      
      // Vérifier que l'initialisation a réussi
      if (!moduleInstance.isInitialized) {
        console.warn(`⚠️ Module ${moduleName} non marqué comme initialisé`);
      }
      
      // Stocker le module
      this.modules.set(moduleName, moduleInstance);
      
      console.log(`✅ Module ${moduleName} chargé avec succès (${className})`);
      return moduleInstance;
      
    } catch (error) {
      console.error(`❌ Erreur chargement module ${moduleName}:`, {
        message: error.message,
        stack: error.stack,
        managersState: {
          dataManager: !!this.dataManager,
          syncManager: !!this.syncManager,
          notificationManager: !!this.notificationManager,
          animationEngine: !!this.animationEngine
        },
        windowState: {
          className: moduleClassMap[moduleName],
          classExists: !!(window[moduleClassMap[moduleName]] || globalThis[moduleClassMap[moduleName]])
        }
      });
      
      // Créer un placeholder pour les modules en échec AVEC debugging
      const placeholder = new ModulePlaceholder(moduleName, error.message);
      this.modules.set(moduleName, placeholder);
      
      // Ne pas propager l'erreur pour éviter de casser l'app entière
      return placeholder;
    }
  }
  
  setupNavigation() {
    // Navigation sidebar (desktop/iPad)
    this.setupSidebarNavigation();
    
    // Navigation bottom (mobile)
    this.setupBottomNavigation();
    
    // Menu burger
    this.setupMobileMenu();
    
    // Navigation au clavier
    this.setupKeyboardNavigation();
    
    this.logSuccess('🧭 Navigation configurée');
  }
  
  setupInteractions() {
    // Recherche globale
    this.setupGlobalSearch();
    
    // Actions rapides
    this.setupQuickActions();
    
    // Base de données
    this.setupDatabaseActions();
    
    // Profil utilisateur
    this.setupUserProfile();
    
    // Statut de synchronisation
    this.setupSyncStatus();
    
    // Gestes tactiles (mobile/iPad)
    if (this.device.type !== 'desktop') {
      this.setupTouchGestures();
    }
    
    this.logSuccess('👆 Interactions configurées');
  }
  
  async loadInitialData() {
    // Charger les statistiques du dashboard
    await this.loadDashboardStats();
    
    // Charger les données de l'agenda du jour
    await this.loadTodayAgenda();
    
    // Synchronisation initiale si connecté
    if (navigator.onLine) {
      this.syncManager.performSync();
    }
    
    this.logSuccess('📊 Données initiales chargées');
  }
  
  async finalizeLaunch() {
    console.log('🚀 Finalisation du lancement...');
    console.log(`📦 Modules chargés: ${this.modules.size}`);
    console.log(`📦 Modules disponibles:`, Array.from(this.modules.keys()));
    
    // Afficher le module par défaut
    console.log('📊 Tentative d\'affichage du dashboard...');
    await this.showModule('dashboard');
    
    // Configuration finale des animations
    this.animationEngine.activateInteractions();
    
    // Vérification des mises à jour PWA
    this.checkForPWAUpdates();
    
    // Analytics et télémétrie
    this.trackLaunch();
    
    this.logSuccess('🎉 Lancement finalisé');
  }
  
  /* ============================================
     🎭 GESTION DU SPLASH SCREEN
     ============================================ */
  
  async hideSplashScreen() {
    return new Promise(resolve => {
      const splash = document.getElementById('splash-screen');
      if (!splash) {
        resolve();
        return;
      }
      
      // Animation de sortie progressive
      const phases = [
        () => this.updateSplashStatus("Chargement des modules..."),
        () => this.updateSplashStatus("Configuration de l'interface..."),
        () => this.updateSplashStatus("Synchronisation des données..."),
        () => this.updateSplashStatus("Finalisation...")
      ];
      
      let phaseIndex = 0;
      const phaseInterval = setInterval(() => {
        if (phaseIndex < phases.length) {
          phases[phaseIndex]();
          phaseIndex++;
        } else {
          clearInterval(phaseInterval);
          
          // Masquage final avec animation fantastique
          splash.style.opacity = '0';
          splash.style.transform = 'scale(0.9)';
          
          setTimeout(() => {
            splash.remove();
            resolve();
          }, 600);
        }
      }, 400);
    });
  }
  
  updateSplashStatus(message) {
    const statusEl = document.getElementById('splash-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.animation = 'fadeIn 0.3s ease';
    }
  }
  
  /* ============================================
     📱 ADAPTATION À L'APPAREIL
     ============================================ */
  
  adaptUIForDevice() {
    switch (this.device.type) {
      case 'mobile':
        this.setupMobileUI();
        break;
      case 'tablet':
        this.setupTabletUI();
        break;
      case 'desktop':
        this.setupDesktopUI();
        break;
    }
  }
  
  setupMobileUI() {
    // Masquer la sidebar sur mobile
    this.elements.sidebar.style.transform = 'translateX(-100%)';
    
    // Afficher la navigation bottom
    this.elements.bottomNav.style.display = 'flex';
    
    // Bouton menu visible
    this.elements.menuToggle.style.display = 'flex';
    
    // Optimisations mobile
    this.enableMobileOptimizations();
  }
  
  setupTabletUI() {
    // iPad Pro 13" optimisé
    if (this.device.name === 'iPad Pro 13"') {
      // Sidebar partiellement visible
      this.elements.sidebar.style.width = '240px';
      
      // Navigation adaptative
      if (window.orientation === 90 || window.orientation === -90) {
        // Mode paysage - sidebar visible
        this.elements.sidebar.style.transform = 'translateX(0)';
        this.elements.bottomNav.style.display = 'none';
      } else {
        // Mode portrait - navigation bottom
        this.elements.sidebar.style.transform = 'translateX(-100%)';
        this.elements.bottomNav.style.display = 'flex';
      }
    }
    
    // Optimisations tactiles
    this.enableTouchOptimizations();
  }
  
  setupDesktopUI() {
    // Sidebar toujours visible
    this.elements.sidebar.style.transform = 'translateX(0)';
    
    // Navigation bottom masquée
    this.elements.bottomNav.style.display = 'none';
    
    // Menu burger masqué
    this.elements.menuToggle.style.display = 'none';
    
    // Optimisations desktop
    this.enableDesktopOptimizations();
  }
  
  /* ============================================
     🧭 SYSTÈME DE NAVIGATION - iOS TOUCH OPTIMISÉ
     ============================================ */
  
  setupSidebarNavigation() {
    const navItems = this.elements.sidebar.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      this.onTap(item, (e) => {
        e.preventDefault();
        const moduleName = item.getAttribute('data-module');
        console.log(`🎯 Navigation sidebar vers: ${moduleName}`);
        this.showModule(moduleName);
        
        // Animation de sélection
        this.animationEngine.animateNavSelection(item);
      });
    });
  }
  
  setupBottomNavigation() {
    const navItems = this.elements.bottomNav.querySelectorAll('.bottom-nav-item');
    
    navItems.forEach(item => {
      this.onTap(item, (e) => {
        e.preventDefault();
        const moduleName = item.getAttribute('data-module');
        console.log(`🎯 Navigation bottom vers: ${moduleName}`);
        this.showModule(moduleName);
        
        // Animation ripple
        this.animationEngine.createRippleEffect(item, e);
      });
    });
  }
  
  /**
   * 🎯 Fonction utilitaire pour gérer les événements tactiles iOS
   * Résout le délai de 300ms et les problèmes de click fantômes
   */
  onTap(element, callback) {
    let touchStartTime = 0;
    let touchStarted = false;
    
    // Pour les événements tactiles (iOS)
    element.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchStarted = true;
      console.log('👆 TouchStart détecté');
    }, { passive: true });
    
    element.addEventListener('touchend', (e) => {
      if (touchStarted && (Date.now() - touchStartTime < 500)) {
        e.preventDefault(); // Empêcher le click fantôme
        console.log('👆 TouchEnd -> callback exécuté');
        callback(e);
      }
      touchStarted = false;
    }, { passive: false });
    
    // Pour les appareils non-tactiles (fallback)
    element.addEventListener('click', (e) => {
      if (!touchStarted && (Date.now() - touchStartTime > 100)) {
        console.log('🖱️ Click détecté (non-touch)');
        callback(e);
      }
    });
  }
  
  setupMobileMenu() {
    // Menu toggle avec onTap pour iOS
    this.onTap(this.elements.menuToggle, () => {
      console.log('🍔 Menu toggle activé');
      this.toggleSidebar();
    });
    
    // Overlay avec onTap pour iOS
    this.onTap(this.elements.sidebarOverlay, () => {
      console.log('🫥 Overlay cliqué - fermeture sidebar');
      this.hideSidebar();
    });
  }
  
  setupKeyboardNavigation() {
    if (this.device.type === 'desktop') {
      document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + nombre pour naviguer
        if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          const moduleIndex = parseInt(e.key) - 1;
          const modules = ['dashboard', 'agenda', 'waitlist', 'planning', 'convocations', 'mailing', 'synthese', 'statistiques', 'billing'];
          if (modules[moduleIndex]) {
            this.showModule(modules[moduleIndex]);
          }
        }
        
        // Cmd/Ctrl + K pour la recherche
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          this.elements.globalSearch.focus();
        }
      });
    }
  }
  
  /* ============================================
     🎪 GESTION DES MODULES
     ============================================ */
  
  async showModule(moduleName) {
    if (this.currentModule === moduleName) return;
    
    const module = this.modules.get(moduleName);
    if (!module) {
      console.warn(`Module ${moduleName} non trouvé`);
      return;
    }
    
    // Animation de sortie du module actuel
    if (this.currentModule) {
      const currentContent = document.querySelector('.module-content.active');
      if (currentContent) {
        await this.animationEngine.fadeOut(currentContent);
        currentContent.classList.remove('active');
      }
    }
    
    // Préparation du nouveau module
    let moduleContent = document.getElementById(`${moduleName}-module`);
    if (!moduleContent) {
      moduleContent = await this.createModuleContainer(moduleName, module);
    }
    
    // Rendu du module
    try {
      // Nos modules retournent du HTML depuis render(), ils ne l'injectent pas
      const html = module.render();
      moduleContent.innerHTML = html;
      console.log(`✅ Module ${moduleName} rendu avec succès`);
    } catch (error) {
      console.error(`❌ Erreur rendu module ${moduleName}:`, error);
      moduleContent.innerHTML = `
        <div class="error-container">
          <h2>Erreur de chargement</h2>
          <p>Le module ${moduleName} n'a pas pu être chargé.</p>
          <p class="error-detail">${error.message}</p>
        </div>
      `;
    }
    
    // Animation d'entrée
    moduleContent.classList.add('active');
    if (this.animationEngine && this.animationEngine.slideIn) {
      await this.animationEngine.slideIn(moduleContent);
    }
    
    // Mise à jour de l'état
    this.currentModule = moduleName;
    this.updateNavigation(moduleName);
    this.updateBreadcrumb(moduleName);
    
    // Analytics
    this.trackModuleView(moduleName);
  }
  
  async createModuleContainer(moduleName, module) {
    const container = document.createElement('div');
    container.id = `${moduleName}-module`;
    container.className = 'module-content';
    container.setAttribute('data-module', moduleName);
    
    this.elements.moduleContainer.appendChild(container);
    return container;
  }
  
  updateNavigation(moduleName) {
    // Sidebar
    const sidebarItems = this.elements.sidebar.querySelectorAll('.nav-item');
    sidebarItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-module') === moduleName);
    });
    
    // Bottom nav
    const bottomItems = this.elements.bottomNav.querySelectorAll('.bottom-nav-item');
    bottomItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-module') === moduleName);
    });
  }
  
  updateBreadcrumb(moduleName) {
    const moduleNames = {
      'dashboard': 'Tableau de bord',
      'agenda': 'Agenda',
      'waitlist': 'Liste d\'attente',
      'planning': 'Programmation',
      'convocations': 'Convocations',
      'mailing': 'Publipostage',
      'import': 'Import Excel',
      'synthese': 'Synthèse & Rapports',
      'statistiques': 'Statistiques',
      'billing': 'Facturation',
      'indemnites': 'Indemnités',
      'anonymisation': 'Anonymisation',
      'prompt-mastering': 'Prompt Mastering'
    };
    
    if (this.elements.currentModuleBreadcrumb) {
      this.elements.currentModuleBreadcrumb.textContent = moduleNames[moduleName] || moduleName;
    }
  }
  
  /* ============================================
     🔍 RECHERCHE GLOBALE
     ============================================ */
  
  setupGlobalSearch() {
    let searchTimeout;
    
    this.elements.globalSearch.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        this.hideSearchResults();
        return;
      }
      
      searchTimeout = setTimeout(() => {
        this.performGlobalSearch(query);
      }, 300);
    });
    
    this.elements.globalSearch.addEventListener('focus', () => {
      if (this.elements.globalSearch.value.length >= 2) {
        this.elements.searchResults.style.display = 'block';
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!this.elements.globalSearch.contains(e.target) && 
          !this.elements.searchResults.contains(e.target)) {
        this.hideSearchResults();
      }
    });
  }
  
  async performGlobalSearch(query) {
    try {
      const results = await this.dataManager.globalSearch(query);
      this.displaySearchResults(results);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  }
  
  displaySearchResults(results) {
    const container = this.elements.searchResults;
    container.innerHTML = '';
    
    if (results.length === 0) {
      container.innerHTML = '<div class="search-no-results">Aucun résultat trouvé</div>';
    } else {
      results.forEach(result => {
        const resultElement = this.createSearchResultElement(result);
        container.appendChild(resultElement);
      });
    }
    
    container.style.display = 'block';
  }
  
  hideSearchResults() {
    this.elements.searchResults.style.display = 'none';
  }
  
  /* ============================================
     📊 ACTIONS RAPIDES - NOUVELLES FONCTIONNALITÉS
     ============================================ */
  
  setupQuickActions() {
    // Gestionnaire pour toutes les actions rapides du dashboard avec onTap iOS
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach(actionCard => {
      this.onTap(actionCard, (e) => {
        const action = actionCard.getAttribute('data-action');
        console.log(`⚡ Action rapide: ${action}`);
        this.handleQuickAction(action);
      });
    });
    
    // Gestionnaire pour les boutons d'action rapide du header avec onTap iOS  
    const quickActions = document.querySelectorAll('.quick-action');
    quickActions.forEach(quickAction => {
      this.onTap(quickAction, (e) => {
        e.preventDefault();
        const action = quickAction.getAttribute('data-action');
        console.log(`⚡ Action header: ${action}`);
        this.handleHeaderAction(action);
      });
    });
  }
  
  async handleQuickAction(action) {
    switch (action) {
      case 'nouvelle-mission':
        this.showNouvelleExpertiseModal();
        break;
      case 'charger-db':
        this.chargerBaseDonnees();
        break;
      case 'sauvegarder-db':
        await this.sauvegarderBaseDonnees();
        break;
      case 'send-convocation':
        this.showModule('mailing');
        break;
      default:
        console.log(`Action non implémentée: ${action}`);
    }
  }
  
  async handleHeaderAction(action) {
    console.log(`Exécution action header: ${action}`);
    switch (action) {
      case 'new-patient':
        this.showNouvelleExpertiseModal();
        break;
      case 'search':
        // Focus sur la recherche globale
        this.elements.globalSearch?.focus();
        break;
      case 'export':
        await this.sauvegarderBaseDonnees();
        break;
      default:
        console.log(`Action header non implémentée: ${action}`);
    }
  }
  
  /* ============================================
     🗃️ GESTION DE LA BASE DE DONNÉES
     ============================================ */
  
  setupDatabaseActions() {
    const fileInput = document.getElementById('db-file-input');
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleDatabaseFile(file);
      }
    });
  }
  
  async chargerBaseDonnees() {
    try {
      this.logInfo('🔄 Rechargement de la base de données...');
      
      // Force le rechargement des données depuis le JSON
      await this.dataManager.forceRefresh();
      
      // Afficher le nouveau statut
      const status = await this.showDatabaseStatus();
      
      this.logSuccess(`✅ Base rechargée: ${status.counts?.expertises || 0} expertises`);
      
      // Rafraîchir le module actuel
      if (this.currentModule) {
        await this.showModule(this.currentModule.moduleName);
      }
      
    } catch (error) {
      console.error('❌ Erreur rechargement base:', error);
      if (this.notificationManager) {
        this.notificationManager.showToast('Erreur lors du rechargement', 'error');
      }
    }
  }
  
  async handleDatabaseFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Valider la structure des données
      if (!this.validateDatabaseStructure(data)) {
        throw new Error('Format de base de données invalide');
      }
      
      // Comparer avec la version existante
      const shouldImport = await this.compareDatabaseVersions(data);
      
      if (shouldImport) {
        await this.importDatabase(data);
        this.showToast('Base de données importée avec succès', 'success');
        
        // Recharger les données
        await this.loadInitialData();
      } else {
        this.showToast('Base de données locale plus récente', 'info');
      }
    } catch (error) {
      console.error('Erreur import base de données:', error);
      this.showToast(`Erreur: ${error.message}`, 'error');
    }
  }
  
  validateDatabaseStructure(data) {
    // Vérifier la présence des propriétés essentielles
    const requiredKeys = ['agenda', 'expertises', 'metadata'];
    return requiredKeys.every(key => data.hasOwnProperty(key));
  }
  
  async compareDatabaseVersions(newData) {
    try {
      const currentData = await this.dataManager.exportDatabase();
      
      // Comparer les timestamps de dernière modification
      const newTimestamp = newData.metadata?.lastSync || 0;
      const currentTimestamp = currentData.metadata?.lastSync || 0;
      
      if (newTimestamp > currentTimestamp) {
        return true; // Importer la nouvelle version
      } else if (newTimestamp === currentTimestamp) {
        return confirm('Les versions semblent identiques. Importer quand même ?');
      } else {
        return confirm('Votre base locale semble plus récente. Écraser avec les données importées ?');
      }
    } catch (error) {
      console.error('Erreur comparaison versions:', error);
      return true; // En cas d'erreur, permettre l'import
    }
  }
  
  async importDatabase(data) {
    // Ajouter metadata de synchronisation
    data.metadata = {
      ...data.metadata,
      lastSync: Date.now(),
      importTime: new Date().toISOString(),
      importSource: 'PWA Import'
    };
    
    await this.dataManager.importDatabase(data);
  }
  
  async sauvegarderBaseDonnees() {
    try {
      const data = await this.dataManager.exportDatabase();
      
      // Ajouter metadata de synchronisation
      data.metadata = {
        ...data.metadata,
        version: this.version,
        exportTime: new Date().toISOString(),
        exportSource: 'CrimiTrack PWA',
        device: this.device.name
      };
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crimitrack-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      this.showToast('Base de données exportée avec succès', 'success');
      
    } catch (error) {
      console.error('Erreur export base de données:', error);
      this.showToast(`Erreur export: ${error.message}`, 'error');
    }
  }
  
  /* ============================================
     🎯 NOUVELLE EXPERTISE/MISSION
     ============================================ */
  
  showNouvelleExpertiseModal() {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalActions = document.getElementById('modal-actions');
    const modalSystem = document.getElementById('modal-system');
    
    modalTitle.textContent = 'Nouvelle Mission d\'Expertise';
    
    modalBody.innerHTML = `
      <form id="nouvelle-expertise-form" class="expertise-form">
        <div class="form-row">
          <div class="form-group">
            <label for="patronyme">Patronyme *</label>
            <input type="text" id="patronyme" name="patronyme" required class="form-input">
          </div>
          <div class="form-group">
            <label for="numero_dossier">N° Dossier *</label>
            <input type="text" id="numero_dossier" name="numero_dossier" required class="form-input">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="date_examen">Date d'examen *</label>
            <input type="date" id="date_examen" name="date_examen" required class="form-input">
          </div>
          <div class="form-group">
            <label for="lieu_examen">Lieu d'examen</label>
            <input type="text" id="lieu_examen" name="lieu_examen" value="CJ" class="form-input">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="type_mission">Type de mission</label>
            <select id="type_mission" name="type_mission" class="form-select">
              <option value="instruction">Instruction</option>
              <option value="correctionnel">Correctionnel</option>
              <option value="expertise">Expertise</option>
              <option value="flagrance">Flagrance</option>
            </select>
          </div>
          <div class="form-group">
            <label for="tribunal">Tribunal</label>
            <input type="text" id="tribunal" name="tribunal" class="form-input">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="magistrat">Magistrat</label>
            <input type="text" id="magistrat" name="magistrat" class="form-input">
          </div>
          <div class="form-group">
            <label for="opj_greffier">OPJ/Greffier</label>
            <input type="text" id="opj_greffier" name="opj_greffier" class="form-input">
          </div>
        </div>
        
        <div class="form-group">
          <label for="chefs_accusation">Chefs d'accusation</label>
          <textarea id="chefs_accusation" name="chefs_accusation" rows="3" class="form-textarea"></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="date_oce">Date OCE</label>
            <input type="date" id="date_oce" name="date_oce" class="form-input">
          </div>
          <div class="form-group">
            <label for="limite_oce">Limite OCE</label>
            <input type="date" id="limite_oce" name="limite_oce" class="form-input">
          </div>
        </div>
      </form>
    `;
    
    modalActions.innerHTML = `
      <button type="button" class="modal-btn secondary" id="cancel-expertise">Annuler</button>
      <button type="button" class="modal-btn primary" id="save-expertise">Créer & Publiposer</button>
    `;
    
    // Afficher le modal
    modalSystem.classList.add('show');
    
    // Gestionnaires d'événements
    document.getElementById('cancel-expertise').addEventListener('click', () => {
      modalSystem.classList.remove('show');
    });
    
    document.getElementById('save-expertise').addEventListener('click', () => {
      this.saveNouvelleExpertise();
    });
    
    // Fermer avec l'overlay
    document.querySelector('.modal-backdrop').addEventListener('click', () => {
      modalSystem.classList.remove('show');
    });
  }
  
  async saveNouvelleExpertise() {
    const form = document.getElementById('nouvelle-expertise-form');
    const formData = new FormData(form);
    
    // Valider les champs requis
    if (!formData.get('patronyme') || !formData.get('numero_dossier') || !formData.get('date_examen')) {
      this.showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }
    
    try {
      const expertiseData = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patronyme: formData.get('patronyme'),
        numero_dossier: formData.get('numero_dossier'),
        date_examen: formData.get('date_examen'),
        lieu_examen: formData.get('lieu_examen') || 'CJ',
        type_mission: formData.get('type_mission'),
        tribunal: formData.get('tribunal'),
        magistrat: formData.get('magistrat'),
        opj_greffier: formData.get('opj_greffier'),
        chefs_accusation: formData.get('chefs_accusation'),
        date_oce: formData.get('date_oce'),
        limite_oce: formData.get('limite_oce'),
        statut: 'programmee',
        date_creation: new Date().toISOString(),
        _lastModified: Date.now(),
        _isWaitlist: false
      };
      
      // Sauvegarder dans la base de données
      await this.dataManager.addExpertise(expertiseData);
      
      // Fermer le modal
      document.getElementById('modal-system').classList.remove('show');
      
      // Afficher confirmation
      this.showToast('Expertise créée avec succès !', 'success');
      
      // Proposer automatiquement le publipostage
      setTimeout(() => {
        this.showPublipostageConfirmation(expertiseData);
      }, 1000);
      
      // Recharger les données
      await this.loadDashboardStats();
      
    } catch (error) {
      console.error('Erreur création expertise:', error);
      this.showToast(`Erreur: ${error.message}`, 'error');
    }
  }
  
  showPublipostageConfirmation(expertiseData) {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalActions = document.getElementById('modal-actions');
    const modalSystem = document.getElementById('modal-system');
    
    modalTitle.textContent = 'Publipostage automatique';
    
    modalBody.innerHTML = `
      <div class="publipostage-confirmation">
        <div class="confirmation-icon">
          <i class="fas fa-paper-plane"></i>
        </div>
        <h3>Expertise créée avec succès !</h3>
        <p>Voulez-vous envoyer automatiquement la convocation pour :</p>
        <div class="expertise-summary">
          <strong>${expertiseData.patronyme}</strong><br>
          <span class="text-muted">Dossier: ${expertiseData.numero_dossier}</span><br>
          <span class="text-muted">Date: ${new Date(expertiseData.date_examen).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    `;
    
    modalActions.innerHTML = `
      <button type="button" class="modal-btn secondary" id="skip-publipostage">Plus tard</button>
      <button type="button" class="modal-btn primary" id="send-publipostage">
        <i class="fas fa-paper-plane"></i>
        Envoyer convocation
      </button>
    `;
    
    modalSystem.classList.add('show');
    
    document.getElementById('skip-publipostage').addEventListener('click', () => {
      modalSystem.classList.remove('show');
    });
    
    document.getElementById('send-publipostage').addEventListener('click', () => {
      modalSystem.classList.remove('show');
      this.showModule('mailing');
      this.showToast('Module de publipostage ouvert', 'info');
    });
  }
  
  /* ============================================
     📊 DONNÉES DU DASHBOARD
     ============================================ */
  
  async loadDashboardStats() {
    try {
      const stats = await this.dataManager.getDashboardStats();
      this.updateDashboardUI(stats);
    } catch (error) {
      console.error('Erreur stats dashboard:', error);
    }
  }
  
  updateDashboardUI(stats) {
    // Mettre à jour les compteurs
    this.updateStatCard('stat-agenda', stats.agenda || 0);
    this.updateStatCard('stat-waitlist', stats.waitlist || 0);
    this.updateStatCard('stat-revenue', stats.billing || 0);
    this.updateStatCard('stat-sync', stats.syncStatus || '100%');
    
    // Mettre à jour les badges de navigation
    this.updateNavBadges(stats);
  }
  
  updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
      this.animationEngine.animateCounter(element);
    }
  }
  
  updateNavBadges(stats) {
    const badges = {
      'nav-agenda-count': stats.agenda,
      'nav-waitlist-count': stats.waitlist,
      'nav-convocations-count': stats.convocations,
      'nav-billing-count': stats.billing
    };
    
    Object.entries(badges).forEach(([id, count]) => {
      const badge = document.getElementById(id);
      if (badge && count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline';
      } else if (badge) {
        badge.style.display = 'none';
      }
    });
  }
  
  /* ============================================
     📱 GESTION DU PWA
     ============================================ */
  
  checkForPWAUpdates() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.showToast('Nouvelle version installée', 'success');
        
        // Recharger après un délai
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
    }
  }
  
  /* ============================================
     🍞 SYSTÈME DE NOTIFICATIONS
     ============================================ */
  
  showToast(message, type = 'info', options = {}) {
    if (this.notificationManager) {
      this.notificationManager.showToast(message, type, options);
    } else {
      // Fallback simple
      console.log(`[Toast ${type}] ${message}`);
    }
  }
  
  showError(message) {
    this.showToast(message, 'error');
  }
  
  showCriticalError(error) {
    const container = document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'critical-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <h2>Erreur Critique</h2>
        <p>L'application a rencontré une erreur critique.</p>
        <button onclick="location.reload()">Recharger</button>
      </div>
    `;
    container.appendChild(errorDiv);
  }
  
  /* ============================================
     🔧 UTILITAIRES
     ============================================ */
  
  updateCSSVariables() {
    const root = document.documentElement;
    
    // Variables dynamiques selon l'appareil
    if (this.device.name === 'iPad Pro 13"') {
      root.style.setProperty('--sidebar-width', '260px');
      root.style.setProperty('--header-height', '64px');
    }
    
    // Variables de performance
    if (this.device.optimizations.includes('reduced-motion')) {
      root.style.setProperty('--duration-fast', '0.1s');
      root.style.setProperty('--duration-normal', '0.15s');
    }
  }
  
  loadUserPreferences() {
    const prefs = localStorage.getItem('crimitrack-preferences');
    if (prefs) {
      try {
        this.userPreferences = JSON.parse(prefs);
      } catch (e) {
        this.userPreferences = {};
      }
    } else {
      this.userPreferences = {};
    }
  }
  
  saveUserPreferences() {
    localStorage.setItem('crimitrack-preferences', JSON.stringify(this.userPreferences));
  }
  
  toggleSidebar() {
    const isOpen = this.elements.sidebar.classList.contains('open');
    
    if (isOpen) {
      this.hideSidebar();
    } else {
      this.showSidebar();
    }
  }
  
  showSidebar() {
    this.elements.sidebar.classList.add('open');
    this.elements.sidebarOverlay.classList.add('active');
    this.elements.menuToggle.classList.add('active');
  }
  
  hideSidebar() {
    this.elements.sidebar.classList.remove('open');
    this.elements.sidebarOverlay.classList.remove('active');
    this.elements.menuToggle.classList.remove('active');
  }
  
  logSuccess(message) {
    console.log(`%c${message}`, 'color: #10b981; font-weight: bold;');
  }
  
  trackLaunch() {
    // Analytics basiques sans données personnelles
    console.log('📈 Lancement tracké:', {
      device: this.device.name,
      standalone: this.isStandalone,
      version: this.version,
      timestamp: new Date().toISOString()
    });
  }
  
  trackModuleView(moduleName) {
    console.log(`📊 Module vu: ${moduleName}`);
  }
  
  /* ============================================
     ⚡ OPTIMISATIONS SPÉCIFIQUES
     ============================================ */
  
  enableMobileOptimizations() {
    // Optimisations mobiles MODÉRÉES pour iOS
    // 🎯 CORRECTION: Appliquer seulement aux éléments texte, pas à body entier
    const textElements = document.querySelectorAll('.brand-text, .nav-text, .stat-label, .section-title');
    textElements.forEach(element => {
      element.style.webkitUserSelect = 'none';
      element.style.webkitTouchCallout = 'none';
    });
    
    // 🎯 CORRECTION: Désactiver le zoom sur les inputs SANS modifications dynamiques du viewport
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      // Utiliser font-size 16px pour éviter le zoom automatique iOS
      if (window.parseFloat(getComputedStyle(input).fontSize) < 16) {
        input.style.fontSize = '16px';
      }
    });
    
    console.log('📱 Optimisations mobiles iOS appliquées (version modérée)');
  }
  
  enableTouchOptimizations() {
    // Support des gestes sur iPad
    this.setupSwipeGestures();
  }
  
  enableDesktopOptimizations() {
    // Optimisations desktop
    document.body.style.cursor = 'default';
  }
}

/* ============================================
   🏗️ CLASSES AUXILIAIRES
   ============================================ */

class ModulePlaceholder {
  constructor(name, errorMessage = null) {
    this.name = name;
    this.errorMessage = errorMessage;
    this.isInitialized = false;
  }
  
  async initialize() {
    console.log(`📦 Module ${this.name} en mode placeholder${this.errorMessage ? ' (erreur: ' + this.errorMessage + ')' : ''}`);
    this.isInitialized = true;
  }
  
  async render(container) {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
    
    container.innerHTML = `
      <div class="module-placeholder">
        <div class="placeholder-content">
          <div class="placeholder-icon">
            <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
          </div>
          <h2>Module ${this.name}</h2>
          <p style="color: #e74c3c; font-weight: bold;">Erreur de chargement</p>
          ${this.errorMessage ? `
            <div class="error-details" style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: left;">
              <h4 style="color: #e53e3e; margin: 0 0 10px 0;">Détails de l'erreur:</h4>
              <code style="background: #fff; padding: 8px; border-radius: 4px; display: block; font-size: 12px; color: #e53e3e;">${this.errorMessage}</code>
            </div>
          ` : ''}
          ${isDevelopment ? `
            <div class="debug-info" style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: left;">
              <h4 style="color: #4a5568; margin: 0 0 10px 0;">Debug Info:</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #718096;">
                <li>Module: ${this.name}</li>
                <li>Timestamp: ${new Date().toLocaleString()}</li>
                <li>User Agent: ${navigator.userAgent.substring(0, 100)}...</li>
                <li>Window classes: ${Object.keys(window).filter(k => k.endsWith('PWA')).join(', ') || 'Aucune'}</li>
              </ul>
            </div>
          ` : ''}
          <div class="placeholder-actions" style="margin-top: 20px;">
            <button onclick="window.location.reload()" class="retry-btn" style="background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
              <i class="fas fa-redo"></i> Réessayer
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Gestionnaires simplifiés pour l'exemple
class DataManager {
  constructor() {
    this.data = {
      agenda: [],
      expertises: [],
      waitlist: [],
      documents: [],
      metadata: {
        version: '4.0.0',
        lastSync: Date.now(),
        device: 'PWA'
      }
    };
  }
  
  async initialize() {
    console.log('📊 DataManager initialisé');
    // Charger depuis localStorage si disponible
    const savedData = localStorage.getItem('crimitrack-data');
    if (savedData) {
      try {
        this.data = JSON.parse(savedData);
      } catch (e) {
        console.warn('Erreur lecture localStorage:', e);
      }
    }
  }
  
  async save() {
    localStorage.setItem('crimitrack-data', JSON.stringify(this.data));
  }
  
  async globalSearch(query) {
    // Simulation de recherche
    return [];
  }
  
  async getDashboardStats() {
    return {
      agenda: this.data.agenda.length,
      waitlist: this.data.waitlist.length,
      billing: this.data.expertises.length,
      convocations: 3,
      syncStatus: '100%'
    };
  }
  
  async addExpertise(expertiseData) {
    // Ajouter à l'agenda
    this.data.agenda.push(expertiseData);
    await this.save();
    console.log('✅ Expertise ajoutée:', expertiseData.patronyme);
  }
  
  async exportDatabase() {
    return {
      ...this.data,
      metadata: {
        ...this.data.metadata,
        exportTime: new Date().toISOString(),
        lastSync: Date.now()
      }
    };
  }
  
  async importDatabase(newData) {
    this.data = {
      ...newData,
      metadata: {
        ...newData.metadata,
        importTime: new Date().toISOString(),
        lastSync: Date.now()
      }
    };
    await this.save();
    console.log('✅ Base de données importée');
  }
}

class SyncManager {
  constructor(dataManager) {
    this.dataManager = dataManager;
  }
  
  async initialize() {
    console.log('🔄 SyncManager initialisé');
  }
  
  async performSync() {
    console.log('🔄 Synchronisation en cours...');
  }
}

class NotificationManager {
  async initialize() {
    console.log('🔔 NotificationManager initialisé');
  }
  
  showToast(message, type = 'info', options = {}) {
    console.log(`🍞 Toast: ${message} (${type})`);
  }
}

class AnimationEngine {
  constructor(device) {
    this.device = device;
  }
  
  async initialize() {
    console.log('🎬 AnimationEngine initialisé');
  }
  
  activate() {
    console.log('🎬 Animations activées');
  }
  
  activateInteractions() {
    console.log('🎬 Interactions activées');
  }
  
  async fadeOut(element) {
    element.style.transition = 'opacity 0.3s ease';
    element.style.opacity = '0';
    return new Promise(resolve => setTimeout(resolve, 300));
  }
  
  async slideIn(element) {
    element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    element.style.transform = 'translateX(0)';
    element.style.opacity = '1';
    return new Promise(resolve => setTimeout(resolve, 300));
  }
  
  animateNavSelection(item) {
    console.log('🎬 Animation nav selection');
  }
  
  createRippleEffect(element, event) {
    console.log('🎬 Effet ripple créé');
  }
  
  animateCounter(element) {
    console.log('🎬 Animation compteur');
  }
}

/* ============================================
   🚀 LANCEMENT DE L'APPLICATION
   ============================================ */

// Fonction globale pour les toasts (utilisée dans les scripts inline)
window.showToast = function(message, type = 'info', options = {}) {
  if (window.crimiTrackApp && window.crimiTrackApp.notificationManager) {
    window.crimiTrackApp.notificationManager.showToast(message, type, options);
  } else {
    console.log(`[Toast ${type}] ${message}`);
  }
};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
  window.crimiTrackApp = new CrimiTrackPWA();
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
  console.error('Erreur globale:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejetée:', event.reason);
});