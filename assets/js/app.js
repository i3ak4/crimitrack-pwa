/**
 * ============================================
 * 🎭 CrimiTrack PWA - Application Fantastique
 * Agent UI-Fantaisie - Excellence Interactive
 * ============================================
 */

class CrimiTrackPWA {
  constructor() {
    // Configuration de base
    this.version = '4.0.0';
    this.buildDate = '2025-08-13';
    
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
  
  async initializeManagers() {
    // Data Manager - Gestion des données
    this.dataManager = new DataManager();
    await this.dataManager.initialize();
    
    // Sync Manager - Synchronisation iCloud/serveur
    this.syncManager = new SyncManager(this.dataManager);
    await this.syncManager.initialize();
    
    // Notification Manager - Système de notifications
    this.notificationManager = new NotificationManager();
    await this.notificationManager.initialize();
    
    // Animation Engine - Moteur d'animations fantastiques
    this.animationEngine = new AnimationEngine(this.device);
    await this.animationEngine.initialize();
    
    this.logSuccess('⚙️ Gestionnaires initialisés');
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
      { name: 'indemnites', priority: 2 },
      
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
    try {
      // Charger le module PWA adapté
      const moduleScript = await import(`./modules/${moduleName}/${moduleName}-pwa.js`);
      const ModuleClass = moduleScript.default;
      
      // Instancier avec les dépendances
      const moduleInstance = new ModuleClass({
        dataManager: this.dataManager,
        syncManager: this.syncManager,
        notificationManager: this.notificationManager,
        animationEngine: this.animationEngine,
        device: this.device
      });
      
      // Initialiser
      await moduleInstance.initialize();
      
      // Stocker
      this.modules.set(moduleName, moduleInstance);
      
      console.log(`✅ Module ${moduleName} chargé`);
    } catch (error) {
      console.warn(`⚠️ Module ${moduleName} non disponible:`, error.message);
      
      // Créer un placeholder pour les modules manquants
      this.modules.set(moduleName, new ModulePlaceholder(moduleName));
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
    // Afficher le module par défaut
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
     🧭 SYSTÈME DE NAVIGATION
     ============================================ */
  
  setupSidebarNavigation() {
    const navItems = this.elements.sidebar.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleName = item.getAttribute('data-module');
        this.showModule(moduleName);
        
        // Animation de sélection
        this.animationEngine.animateNavSelection(item);
      });
    });
  }
  
  setupBottomNavigation() {
    const navItems = this.elements.bottomNav.querySelectorAll('.bottom-nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleName = item.getAttribute('data-module');
        this.showModule(moduleName);
        
        // Animation ripple
        this.animationEngine.createRippleEffect(item, e);
      });
    });
  }
  
  setupMobileMenu() {
    this.elements.menuToggle.addEventListener('click', () => {
      this.toggleSidebar();
    });
    
    this.elements.sidebarOverlay.addEventListener('click', () => {
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
    await module.render(moduleContent);
    
    // Animation d'entrée
    moduleContent.classList.add('active');
    await this.animationEngine.slideIn(moduleContent);
    
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
    // Optimisations pour mobile
    document.body.style.webkitUserSelect = 'none';
    document.body.style.webkitTouchCallout = 'none';
    
    // Désactiver le zoom sur les inputs
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        document.querySelector('meta[name=viewport]').setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      });
      
      input.addEventListener('blur', () => {
        document.querySelector('meta[name=viewport]').setAttribute('content',
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      });
    });
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
  constructor(name) {
    this.name = name;
  }
  
  async initialize() {
    console.log(`📦 Module ${this.name} en mode placeholder`);
  }
  
  async render(container) {
    container.innerHTML = `
      <div class="module-placeholder">
        <div class="placeholder-content">
          <div class="placeholder-icon">
            <i class="fas fa-puzzle-piece"></i>
          </div>
          <h2>Module ${this.name}</h2>
          <p>Ce module sera bientôt disponible</p>
        </div>
      </div>
    `;
  }
}

// Gestionnaires simplifiés pour l'exemple
class DataManager {
  async initialize() {
    console.log('📊 DataManager initialisé');
  }
  
  async globalSearch(query) {
    // Simulation de recherche
    return [];
  }
  
  async getDashboardStats() {
    // Simulation de stats
    return {
      agenda: 12,
      waitlist: 5,
      billing: 187,
      convocations: 3,
      syncStatus: '100%'
    };
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