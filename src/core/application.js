/**
 * CrimiTrack PWA v4.0 - Application Core
 * Architecture moderne avec patterns avancés
 * 
 * Features:
 * - Dependency Injection avancée
 * - Event-Driven Architecture
 * - Module Lazy Loading
 * - State Management intelligent
 * - Performance monitoring
 */

import { EventBus } from './event-bus.js';
import { StateManager } from './state-manager.js';
import { Router } from './router.js';
import { UIFramework } from './ui-framework.js';
import { SyncEngine } from '../data/sync-engine.js';
import { DataManager } from '../data/database-manager.js';
import { DeviceManager } from './device-manager.js';
import { PerformanceMonitor } from './performance-monitor.js';

/**
 * Main Application Class - Architecture révolutionnaire
 */
export class CrimiTrackApplication {
  constructor() {
    // Core dependencies
    this.eventBus = new EventBus();
    this.state = new StateManager(this.eventBus);
    this.router = new Router(this.eventBus);
    this.ui = new UIFramework(this.eventBus);
    this.device = new DeviceManager(this.eventBus);
    this.performance = new PerformanceMonitor();
    
    // Data layer
    this.dataManager = new DataManager(this.eventBus);
    this.syncEngine = new SyncEngine(this.eventBus, this.dataManager);
    
    // Module registry
    this.modules = new Map();
    this.loadedModules = new Set();
    
    // App status
    this.initialized = false;
    this.loading = false;
    
    this.init();
  }
  
  /**
   * Initialisation intelligente avec détection d'appareil
   */
  async init() {
    console.log('[CrimiTrack] 🚀 Démarrage application v4.0...');
    
    try {
      this.performance.mark('app-init-start');
      this.loading = true;
      
      // 1. Initialiser la détection d'appareil
      await this.device.initialize();
      
      // 2. Configuration dynamique selon l'appareil
      await this.configureForDevice();
      
      // 3. Initialiser les services core
      await this.initializeServices();
      
      // 4. Configurer l'UI adaptative
      await this.ui.initialize(this.device.getType());
      
      // 5. Configurer le routage
      await this.setupRouting();
      
      // 6. Initialiser la synchronisation
      await this.syncEngine.initialize();
      
      // 7. Charger les modules essentiels
      await this.loadEssentialModules();
      
      // 8. Finaliser l'initialisation
      await this.finalizeInitialization();
      
      this.performance.mark('app-init-end');
      this.performance.measure('app-init', 'app-init-start', 'app-init-end');
      
      this.initialized = true;
      this.loading = false;
      
      console.log('[CrimiTrack] ✅ Application initialisée en', 
        this.performance.getLastMeasure('app-init').duration.toFixed(2) + 'ms');
        
      this.eventBus.emit('app:ready', { device: this.device.getType() });
      
    } catch (error) {
      console.error('[CrimiTrack] ❌ Erreur initialisation:', error);
      await this.handleInitializationError(error);
    }
  }
  
  /**
   * Configuration dynamique selon l'appareil
   */
  async configureForDevice() {
    const deviceType = this.device.getType();
    const config = {
      iPhone: {
        maxConcurrentModules: 3,
        prefetchNextModule: false,
        useHapticFeedback: true,
        animationDuration: 200,
        gestures: ['swipe', 'pinch', 'tap']
      },
      iPad: {
        maxConcurrentModules: 5,
        prefetchNextModule: true,
        useHapticFeedback: true,
        animationDuration: 300,
        gestures: ['swipe', 'pinch', 'tap', 'drag']
      },
      MacBook: {
        maxConcurrentModules: 8,
        prefetchNextModule: true,
        useHapticFeedback: false,
        animationDuration: 150,
        gestures: ['scroll', 'hover']
      }
    };
    
    this.config = config[deviceType] || config.iPad;
    console.log(`[CrimiTrack] Configuration ${deviceType}:`, this.config);
  }
  
  /**
   * Initialisation des services core
   */
  async initializeServices() {
    // Initialiser le state manager avec persistance
    await this.state.initialize({
      persist: true,
      storeName: 'crimitrack-state',
      syncInterval: 30000
    });
    
    // Initialiser le data manager
    await this.dataManager.initialize({
      dbName: 'CrimiTrackDB',
      version: 4,
      stores: ['agenda', 'expertises', 'waitlist', 'statistics', 'metadata', 'sync-queue']
    });
    
    // Configuration event listeners
    this.setupEventListeners();
  }
  
  /**
   * Event listeners principaux
   */
  setupEventListeners() {
    // Navigation events
    this.eventBus.on('navigate', async (route) => {
      await this.handleNavigation(route);
    });
    
    // Module lifecycle events
    this.eventBus.on('module:load', async (moduleId) => {
      await this.loadModule(moduleId);
    });
    
    this.eventBus.on('module:unload', (moduleId) => {
      this.unloadModule(moduleId);
    });
    
    // Sync events
    this.eventBus.on('sync:complete', (data) => {
      this.handleSyncComplete(data);
    });
    
    // Device events
    this.eventBus.on('device:orientation', (orientation) => {
      this.ui.handleOrientationChange(orientation);
    });
    
    // Error handling
    this.eventBus.on('error', (error) => {
      this.handleApplicationError(error);
    });
    
    // Performance monitoring
    this.eventBus.on('performance:metric', (metric) => {
      this.performance.recordMetric(metric);
    });
  }
  
  /**
   * Configuration du routage intelligent
   */
  async setupRouting() {
    // Routes principales avec lazy loading
    this.router.addRoute('/', 'dashboard', () => import('../modules/dashboard/dashboard-module.js'));
    this.router.addRoute('/agenda', 'agenda', () => import('../modules/agenda/agenda-module.js'));
    this.router.addRoute('/expertises', 'expertises', () => import('../modules/expertises/expertises-module.js'));
    this.router.addRoute('/waitlist', 'waitlist', () => import('../modules/waitlist/waitlist-module.js'));
    this.router.addRoute('/statistics', 'statistics', () => import('../modules/statistics/statistics-module.js'));
    this.router.addRoute('/convocations', 'convocations', () => import('../modules/convocations/convocations-module.js'));
    this.router.addRoute('/publipostage', 'publipostage', () => import('../modules/publipostage/publipostage-module.js'));
    this.router.addRoute('/billing', 'billing', () => import('../modules/billing/billing-module.js'));
    this.router.addRoute('/settings', 'settings', () => import('../modules/settings/settings-module.js'));
    
    // Routes spéciales selon appareil
    if (this.device.getType() === 'MacBook') {
      this.router.addRoute('/advanced', 'advanced', () => import('../modules/advanced/advanced-module.js'));
    }
    
    // Initialiser le router
    await this.router.initialize();
  }
  
  /**
   * Chargement des modules essentiels
   */
  async loadEssentialModules() {
    const essentialModules = ['dashboard'];
    
    // Ajouter modules selon appareil
    if (this.device.getType() !== 'iPhone') {
      essentialModules.push('agenda');
    }
    
    for (const moduleId of essentialModules) {
      await this.loadModule(moduleId);
    }
  }
  
  /**
   * Chargement intelligent des modules
   */
  async loadModule(moduleId) {
    if (this.loadedModules.has(moduleId)) {
      console.log(`[CrimiTrack] Module ${moduleId} déjà chargé`);
      return this.modules.get(moduleId);
    }
    
    try {
      this.performance.mark(`module-${moduleId}-start`);
      
      // Import dynamique du module
      const route = this.router.getRoute(moduleId);
      if (!route) {
        throw new Error(`Route non trouvée pour le module ${moduleId}`);
      }
      
      const moduleDefinition = await route.loader();
      const ModuleClass = moduleDefinition.default;
      
      // Instancier le module avec injection de dépendance
      const moduleInstance = new ModuleClass({
        eventBus: this.eventBus,
        state: this.state,
        dataManager: this.dataManager,
        ui: this.ui,
        device: this.device
      });
      
      // Initialiser le module
      await moduleInstance.initialize();
      
      this.modules.set(moduleId, moduleInstance);
      this.loadedModules.add(moduleId);
      
      this.performance.mark(`module-${moduleId}-end`);
      this.performance.measure(`module-${moduleId}`, `module-${moduleId}-start`, `module-${moduleId}-end`);
      
      console.log(`[CrimiTrack] ✅ Module ${moduleId} chargé en`, 
        this.performance.getLastMeasure(`module-${moduleId}`).duration.toFixed(2) + 'ms');
      
      this.eventBus.emit('module:loaded', { moduleId, instance: moduleInstance });
      
      return moduleInstance;
      
    } catch (error) {
      console.error(`[CrimiTrack] ❌ Erreur chargement module ${moduleId}:`, error);
      this.eventBus.emit('module:error', { moduleId, error });
      throw error;
    }
  }
  
  /**
   * Déchargement intelligent des modules
   */
  unloadModule(moduleId) {
    const module = this.modules.get(moduleId);
    if (module) {
      // Cleanup du module
      if (typeof module.destroy === 'function') {
        module.destroy();
      }
      
      this.modules.delete(moduleId);
      this.loadedModules.delete(moduleId);
      
      console.log(`[CrimiTrack] Module ${moduleId} déchargé`);
      this.eventBus.emit('module:unloaded', { moduleId });
    }
  }
  
  /**
   * Navigation intelligente avec animations
   */
  async handleNavigation(route) {
    const { path, params, animation = 'slide' } = route;
    
    try {
      this.performance.mark('navigation-start');
      
      // Résoudre le module correspondant
      const moduleId = this.router.resolve(path);
      if (!moduleId) {
        throw new Error(`Route non trouvée: ${path}`);
      }
      
      // Charger le module si nécessaire
      const module = await this.loadModule(moduleId);
      
      // Animation de transition
      await this.ui.animateTransition(animation, async () => {
        // Activer le nouveau module
        await module.activate(params);
        
        // Mettre à jour l'état
        this.state.set('currentModule', moduleId);
        this.state.set('currentRoute', path);
      });
      
      this.performance.mark('navigation-end');
      this.performance.measure('navigation', 'navigation-start', 'navigation-end');
      
      console.log(`[CrimiTrack] Navigation vers ${moduleId} en`, 
        this.performance.getLastMeasure('navigation').duration.toFixed(2) + 'ms');
      
      this.eventBus.emit('navigation:complete', { moduleId, path, params });
      
    } catch (error) {
      console.error('[CrimiTrack] Erreur navigation:', error);
      this.eventBus.emit('navigation:error', { path, error });
    }
  }
  
  /**
   * Gestion intelligente de la synchronisation
   */
  handleSyncComplete(data) {
    const { success, stats } = data;
    
    if (success) {
      this.ui.showNotification('Synchronisation réussie', 'success');
      
      // Mettre à jour les modules actifs
      this.modules.forEach((module, id) => {
        if (typeof module.onDataUpdate === 'function') {
          module.onDataUpdate(stats);
        }
      });
      
      // Mettre à jour les statistiques
      this.state.merge('syncStats', stats);
    }
  }
  
  /**
   * Finalisation de l'initialisation
   */
  async finalizeInitialization() {
    // Masquer le splash screen avec animation
    await this.ui.hideSplashScreen();
    
    // Démarrer la navigation initiale
    const initialRoute = this.router.getCurrentRoute() || '/';
    await this.handleNavigation({ path: initialRoute });
    
    // Démarrer la synchronisation en arrière-plan
    this.syncEngine.startBackgroundSync();
    
    // Nettoyer la mémoire
    if (window.gc) {
      window.gc();
    }
  }
  
  /**
   * Gestion des erreurs d'initialisation
   */
  async handleInitializationError(error) {
    console.error('[CrimiTrack] Erreur critique:', error);
    
    // Afficher une interface d'erreur
    await this.ui.showErrorScreen({
      title: 'Erreur de chargement',
      message: error.message,
      actions: [
        {
          label: 'Réessayer',
          action: () => window.location.reload()
        },
        {
          label: 'Mode dégradé',
          action: () => this.startFallbackMode()
        }
      ]
    });
  }
  
  /**
   * Mode dégradé en cas d'erreur
   */
  async startFallbackMode() {
    console.log('[CrimiTrack] Démarrage en mode dégradé...');
    
    // Charger seulement les modules essentiels
    try {
      const dashboardModule = await import('../modules/dashboard/dashboard-module.js');
      const dashboard = new dashboardModule.default({
        eventBus: this.eventBus,
        fallbackMode: true
      });
      
      await dashboard.initialize();
      this.modules.set('dashboard', dashboard);
      
      this.ui.showNotification('Mode dégradé activé', 'warning');
      
    } catch (fallbackError) {
      console.error('[CrimiTrack] Impossible de démarrer le mode dégradé:', fallbackError);
    }
  }
  
  /**
   * Gestion globale des erreurs
   */
  handleApplicationError(error) {
    console.error('[CrimiTrack] Erreur application:', error);
    
    // Logger l'erreur
    this.performance.recordError(error);
    
    // Afficher notification à l'utilisateur
    this.ui.showNotification('Une erreur est survenue', 'error');
  }
  
  /**
   * API publique de l'application
   */
  getAPI() {
    return {
      // Navigation
      navigate: (path, params) => this.eventBus.emit('navigate', { path, params }),
      
      // Modules
      loadModule: (moduleId) => this.loadModule(moduleId),
      getModule: (moduleId) => this.modules.get(moduleId),
      
      // State
      getState: () => this.state.getState(),
      setState: (key, value) => this.state.set(key, value),
      
      // Data
      getData: (collection) => this.dataManager.getCollection(collection),
      
      // Sync
      sync: () => this.syncEngine.syncNow(),
      
      // UI
      showNotification: (message, type) => this.ui.showNotification(message, type),
      
      // Performance
      getMetrics: () => this.performance.getMetrics()
    };
  }
  
  /**
   * Nettoyage avant fermeture
   */
  async destroy() {
    console.log('[CrimiTrack] Nettoyage application...');
    
    // Arrêter la synchronisation
    this.syncEngine.stop();
    
    // Décharger tous les modules
    for (const moduleId of this.loadedModules) {
      this.unloadModule(moduleId);
    }
    
    // Nettoyer les services
    this.eventBus.removeAllListeners();
    await this.state.persist();
    
    console.log('[CrimiTrack] Application fermée proprement');
  }
}

// Export pour utilisation globale
export default CrimiTrackApplication;