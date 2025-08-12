/**
 * CrimiTrack PWA - Application principale
 * Orchestration de tous les composants et modules
 */

class CrimiTrackApp {
  constructor() {
    this.currentModule = null;
    this.modules = new Map();
    this.deviceType = this.detectDevice();
    this.isStandalone = this.checkStandalone();
    
    this.init();
  }
  
  detectDevice() {
    const ua = navigator.userAgent;
    const width = window.innerWidth;
    
    if (/iPhone/.test(ua) || width <= 430) return 'iPhone';
    if (/iPad/.test(ua) || (width > 430 && width <= 1024)) return 'iPad';
    if (/Mac/.test(ua) || width > 1024) return 'MacBook';
    
    return 'Unknown';
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
  
  async init() {
    console.log(`[App] Initialisation CrimiTrack PWA sur ${this.deviceType}`);
    console.log(`[App] Mode: ${this.isStandalone ? 'Standalone PWA' : 'Navigateur'}`);
    
    try {
      // Cacher le splash screen après chargement
      await this.hideSplashScreen();
      
      // Initialiser l'interface
      this.setupUI();
      
      // Charger les modules selon l'appareil
      await this.loadModules();
      
      // Configurer la navigation
      this.setupNavigation();
      
      // Charger les statistiques initiales
      await this.loadDashboardStats();
      
      // Gérer l'orientation
      this.handleOrientation();
      
      // Configurer les raccourcis clavier
      this.setupKeyboardShortcuts();
      
      // Vérifier les mises à jour
      this.checkForUpdates();
      
      console.log('[App] Initialisation terminée');
    } catch (error) {
      console.error('[App] Erreur initialisation:', error);
      this.showError('Erreur lors du chargement de l\'application');
    }
  }
  
  async hideSplashScreen() {
    return new Promise(resolve => {
      setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.classList.add('hide');
          setTimeout(() => {
            splash.remove();
            resolve();
          }, 500);
        } else {
          resolve();
        }
      }, 1500);
    });
  }
  
  setupUI() {
    // Adapter l'interface selon l'appareil
    document.body.className = `device-${this.deviceType.toLowerCase()}`;
    
    if (this.isStandalone) {
      document.body.classList.add('standalone');
    }
    
    // Menu toggle pour mobile/tablet
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        sidebar.classList.toggle('open');
        
        // Overlay pour fermer le menu
        if (sidebar.classList.contains('open') && this.deviceType !== 'MacBook') {
          this.createOverlay(() => {
            menuToggle.classList.remove('active');
            sidebar.classList.remove('open');
          });
        }
      });
    }
    
    // Gérer le safe area sur iOS
    if (this.deviceType === 'iPhone' || this.deviceType === 'iPad') {
      this.handleSafeArea();
    }
  }
  
  handleSafeArea() {
    // Ajuster pour l'encoche et les coins arrondis
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    }
    
    // Ajuster les marges si nécessaire
    const safeAreaTop = getComputedStyle(document.documentElement)
      .getPropertyValue('--safe-area-inset-top');
    
    if (parseInt(safeAreaTop) > 20) {
      document.body.classList.add('has-notch');
    }
  }
  
  createOverlay(onClick) {
    const existing = document.querySelector('.sidebar-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 89;
      opacity: 0;
      transition: opacity 300ms;
    `;
    
    document.body.appendChild(overlay);
    
    // Fade in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
    
    overlay.addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
      if (onClick) onClick();
    });
  }
  
  async loadModules() {
    // Définir les modules disponibles selon l'appareil
    const moduleConfig = {
      iPhone: ['agenda', 'waitlist', 'statistics', 'convocations', 'publipostage'],
      iPad: ['agenda', 'waitlist', 'statistics', 'convocations', 'publipostage', 'billing'],
      MacBook: ['agenda', 'waitlist', 'statistics', 'convocations', 'publipostage', 'billing', 'synthese', 'import', 'planning', 'anonymisation']
    };
    
    const modulesToLoad = moduleConfig[this.deviceType] || moduleConfig.iPad;
    
    console.log(`[App] Chargement des modules pour ${this.deviceType}:`, modulesToLoad);
    
    // Charger les modules de manière asynchrone
    for (const moduleName of modulesToLoad) {
      try {
        // En production, charger depuis les fichiers JS
        // Pour le prototype, créer des modules factices
        this.modules.set(moduleName, {
          name: moduleName,
          loaded: true,
          render: () => this.renderModule(moduleName)
        });
      } catch (error) {
        console.error(`[App] Erreur chargement module ${moduleName}:`, error);
      }
    }
  }
  
  setupNavigation() {
    // Navigation onglets visuels (principal)
    const visualTabs = document.querySelectorAll('.visual-tab');
    visualTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const moduleName = tab.dataset.module;
        this.navigateToModule(moduleName);
      });
    });
    
    // Navigation sidebar (desktop/tablet)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const moduleName = item.dataset.module;
        this.navigateToModule(moduleName);
      });
    });
    
    // Navigation bottom (mobile)
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const moduleName = item.dataset.module;
        
        if (moduleName === 'more') {
          this.showMoreMenu();
        } else {
          this.navigateToModule(moduleName);
        }
      });
    });
    
    // Gestion du bouton retour
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.module) {
        this.navigateToModule(event.state.module, false);
      }
    });
    
    // Navigation initiale vers Agenda
    this.navigateToModule('agenda');
  }
  
  navigateToModule(moduleName, pushState = true) {
    if (moduleName === this.currentModule) return;
    
    console.log(`[App] Navigation vers: ${moduleName}`);
    
    // Mettre à jour l'état actif dans toutes les navigations
    document.querySelectorAll('.nav-item, .bottom-nav-item, .visual-tab').forEach(item => {
      item.classList.toggle('active', item.dataset.module === moduleName);
    });
    
    // Cacher l'écran de bienvenue
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }
    
    // Charger le module
    const module = this.modules.get(moduleName);
    if (module) {
      const container = document.getElementById('module-container');
      if (container) {
        container.innerHTML = module.render();
      }
      
      this.currentModule = moduleName;
      
      // Déclencher l'événement d'activation du module
      window.dispatchEvent(new CustomEvent('moduleactivated', {
        detail: { module: moduleName, device: this.deviceType }
      }));
      
      // Mettre à jour l'historique
      if (pushState) {
        history.pushState({ module: moduleName }, moduleName, `#${moduleName}`);
      }
      
      // Fermer le menu sur mobile
      if (this.deviceType !== 'MacBook') {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('menu-toggle')?.classList.remove('active');
      }
    } else {
      console.error(`[App] Module non trouvé: ${moduleName}`);
    }
  }
  
  renderModule(moduleName) {
    // Templates de modules pour le prototype
    const templates = {
      dashboard: `
        <div class="module-content">
          <h2>Tableau de bord</h2>
          <div class="dashboard-grid">
            <div class="dashboard-card">
              <h3>Expertises récentes</h3>
              <ul id="recent-expertises"></ul>
            </div>
            <div class="dashboard-card">
              <h3>Agenda du jour</h3>
              <ul id="today-agenda"></ul>
            </div>
            <div class="dashboard-card">
              <h3>Actions rapides</h3>
              <button class="action-button">Nouvelle expertise</button>
              <button class="action-button">Ajouter RDV</button>
              <button class="action-button">Générer rapport</button>
            </div>
          </div>
        </div>
      `,
      agenda: `
        <div class="module-content">
          <h2>Agenda</h2>
          <div class="agenda-view">
            <div class="agenda-header">
              <button>← Précédent</button>
              <h3>Novembre 2025</h3>
              <button>Suivant →</button>
            </div>
            <div class="agenda-calendar">
              <!-- Calendrier généré dynamiquement -->
            </div>
          </div>
        </div>
      `,
      expertises: `
        <div class="module-content">
          <h2>Expertises</h2>
          <div class="search-bar">
            <input type="search" placeholder="Rechercher une expertise..." />
            <button>Rechercher</button>
          </div>
          <div class="expertises-list">
            <!-- Liste générée dynamiquement -->
          </div>
        </div>
      `,
      statistics: `
        <div class="module-content">
          <h2>📊 Statistiques</h2>
          <div class="stats-overview">
            <div class="stat-card">
              <h3>Expertises totales</h3>
              <p class="stat-big-number" id="total-expertises">-</p>
            </div>
            <div class="stat-card">
              <h3>Ce mois</h3>
              <p class="stat-big-number" id="monthly-expertises">-</p>
            </div>
            <div class="stat-card">
              <h3>En attente</h3>
              <p class="stat-big-number" id="pending-expertises">-</p>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stat-chart">
              <h3>Évolution mensuelle</h3>
              <canvas id="monthly-chart"></canvas>
            </div>
            <div class="stat-chart">
              <h3>Répartition par type</h3>
              <canvas id="type-chart"></canvas>
            </div>
          </div>
        </div>
      `,
      waitlist: `
        <div class="module-content">
          <h2>⏳ Liste d'attentes</h2>
          <div class="waitlist-filter">
            <select id="waitlist-priority">
              <option value="">Toutes priorités</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
              <option value="low">Faible</option>
            </select>
            <button id="refresh-waitlist">🔄 Actualiser</button>
          </div>
          <div class="horizontal-scroll" id="waitlist-scroll">
            <div class="scroll-item">
              <h3>Chargement...</h3>
              <p>Synchronisez la base de données</p>
            </div>
          </div>
        </div>
      `,
      convocations: `
        <div class="module-content">
          <h2>📧 Convocations</h2>
          <div class="convocations-actions">
            <button class="action-button">Nouvelle convocation</button>
            <button class="action-button">Modèles de convocation</button>
            <button class="action-button">Historique envois</button>
          </div>
          <div class="convocations-list">
            <div class="horizontal-scroll">
              <div class="scroll-item">
                <h3>Convocations récentes</h3>
                <p>Aucune convocation récente</p>
              </div>
            </div>
          </div>
        </div>
      `,
      billing: `
        <div class="module-content">
          <h2>💰 Facturation</h2>
          <div class="billing-overview">
            <div class="stat-card">
              <h3>CA ce mois</h3>
              <p class="stat-big-number">-€</p>
            </div>
            <div class="stat-card">
              <h3>Factures en attente</h3>
              <p class="stat-big-number">-</p>
            </div>
          </div>
          <div class="billing-actions">
            <button class="action-button">Nouvelle facture</button>
            <button class="action-button">Suivi paiements</button>
            <button class="action-button">Rapports</button>
          </div>
        </div>
      `,
      publipostage: `
        <!-- Le contenu sera géré par publipostage-manager.js -->
        <div class="loading-publipostage">
          <h2>📄 Chargement du publipostage...</h2>
          <p>Initialisation du module</p>
        </div>
      `
    };
    
    return templates[moduleName] || `
      <div class="module-content">
        <h2>${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}</h2>
        <p>Module en cours de chargement...</p>
      </div>
    `;
  }
  
  showMoreMenu() {
    // Créer un menu contextuel pour les options supplémentaires
    const menu = document.createElement('div');
    menu.className = 'more-menu';
    menu.innerHTML = `
      <div class="more-menu-content">
        <h3>Plus d'options</h3>
        <button data-module="mailing">Publipostage</button>
        <button data-module="billing">Facturation</button>
        <button data-module="import">Import</button>
        <button data-module="settings">Paramètres</button>
        <button class="close-menu">Fermer</button>
      </div>
    `;
    
    document.body.appendChild(menu);
    
    // Gérer les clics
    menu.querySelectorAll('button[data-module]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigateToModule(btn.dataset.module);
        menu.remove();
      });
    });
    
    menu.querySelector('.close-menu').addEventListener('click', () => {
      menu.remove();
    });
  }
  
  async loadDashboardStats() {
    try {
      // Charger les statistiques depuis IndexedDB
      if (window.offlineManager) {
        const counts = await window.offlineManager.getItemCount();
        
        // Mettre à jour l'affichage
        const statElements = {
          'stat-expertises': counts.expertises || 0,
          'stat-rdv': counts.agenda || 0,
          'stat-waiting': counts.syncQueue || 0,
          'stat-sync': window.syncManager?.getStatus().queueLength || 0
        };
        
        for (const [id, value] of Object.entries(statElements)) {
          const element = document.getElementById(id);
          if (element) {
            element.textContent = value.toLocaleString('fr-FR');
          }
        }
      }
    } catch (error) {
      console.error('[App] Erreur chargement stats:', error);
    }
  }
  
  handleOrientation() {
    // Gérer les changements d'orientation sur mobile/tablet
    window.addEventListener('orientationchange', () => {
      const orientation = window.orientation;
      document.body.classList.toggle('landscape', Math.abs(orientation) === 90);
      
      // Ajuster l'interface si nécessaire
      if (this.deviceType === 'iPad') {
        this.adjustForOrientation(orientation);
      }
    });
    
    // Vérification initiale
    if (window.orientation !== undefined) {
      document.body.classList.toggle('landscape', Math.abs(window.orientation) === 90);
    }
  }
  
  adjustForOrientation(orientation) {
    const sidebar = document.getElementById('sidebar');
    
    if (Math.abs(orientation) === 90) {
      // Paysage - afficher la sidebar
      sidebar?.classList.add('landscape-visible');
    } else {
      // Portrait - masquer la sidebar
      sidebar?.classList.remove('landscape-visible');
    }
  }
  
  setupKeyboardShortcuts() {
    // Raccourcis clavier pour desktop
    if (this.deviceType === 'MacBook') {
      document.addEventListener('keydown', (event) => {
        // Cmd/Ctrl + K : Recherche rapide
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault();
          this.showQuickSearch();
        }
        
        // Cmd/Ctrl + N : Nouvelle expertise
        if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
          event.preventDefault();
          this.createNewExpertise();
        }
        
        // Cmd/Ctrl + S : Synchroniser
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
          event.preventDefault();
          window.connectionManager?.forceSyncNow();
        }
        
        // Échap : Fermer les modals
        if (event.key === 'Escape') {
          this.closeAllModals();
        }
      });
    }
  }
  
  showQuickSearch() {
    console.log('[App] Recherche rapide');
    // Implémenter la recherche rapide
  }
  
  createNewExpertise() {
    console.log('[App] Nouvelle expertise');
    // Implémenter la création d'expertise
  }
  
  closeAllModals() {
    document.querySelectorAll('.modal, .more-menu, .sidebar-overlay').forEach(element => {
      element.remove();
    });
  }
  
  async checkForUpdates() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdatePrompt();
            }
          });
        });
        
        // Vérifier manuellement les mises à jour toutes les heures
        setInterval(() => {
          registration.update();
        }, 3600000);
      }
    }
  }
  
  showUpdatePrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'update-prompt';
    prompt.innerHTML = `
      <p>Une nouvelle version de CrimiTrack est disponible</p>
      <button onclick="location.reload()">Mettre à jour</button>
      <button onclick="this.parentElement.remove()">Plus tard</button>
    `;
    
    document.body.appendChild(prompt);
  }
  
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }
}

// Initialiser l'application au chargement
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CrimiTrackApp();
});

console.log('[App] Script principal chargé');