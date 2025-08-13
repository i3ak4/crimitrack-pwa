/**
 * CrimiTrack PWA - Router
 * Routage SPA avec support History API
 * Navigation déclarative et programmatique
 */

class Router {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.routes = new Map();
    this.middlewares = [];
    this.currentRoute = null;
    this.currentParams = {};
    this.history = [];
    this.maxHistorySize = 50;
    this.basePath = '';
    this.debug = false;
    
    // Lier les méthodes au contexte
    this.handlePopState = this.handlePopState.bind(this);
    this.handleClick = this.handleClick.bind(this);
    
    console.log('[Router] Initialisé');
  }
  
  /**
   * Ajouter une route
   * @param {string} path - Chemin de la route
   * @param {Function} handler - Gestionnaire de la route
   * @param {Object} options - Options de la route
   */
  addRoute(path, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Le gestionnaire de route doit être une fonction');
    }
    
    const route = {
      path: this.normalizePath(path),
      handler,
      name: options.name || null,
      meta: options.meta || {},
      beforeEnter: options.beforeEnter || null,
      children: new Map()
    };
    
    // Compiler le pattern de route
    route.pattern = this.compilePattern(route.path);
    
    this.routes.set(route.path, route);
    
    if (this.debug) {
      console.log(`[Router] Route ajoutée: ${path}`);
    }
  }
  
  /**
   * Ajouter une route enfant
   * @param {string} parentPath - Chemin parent
   * @param {string} childPath - Chemin enfant
   * @param {Function} handler - Gestionnaire
   * @param {Object} options - Options
   */
  addChildRoute(parentPath, childPath, handler, options = {}) {
    const parent = this.routes.get(this.normalizePath(parentPath));
    if (!parent) {
      throw new Error(`Route parent "${parentPath}" non trouvée`);
    }
    
    const fullPath = this.joinPaths(parentPath, childPath);
    const route = {
      path: this.normalizePath(fullPath),
      handler,
      name: options.name || null,
      meta: options.meta || {},
      beforeEnter: options.beforeEnter || null,
      parent: parentPath
    };
    
    route.pattern = this.compilePattern(route.path);
    parent.children.set(childPath, route);
    this.routes.set(route.path, route);
    
    if (this.debug) {
      console.log(`[Router] Route enfant ajoutée: ${fullPath}`);
    }
  }
  
  /**
   * Ajouter un middleware global
   * @param {Function} middleware - Fonction middleware
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Le middleware doit être une fonction');
    }
    
    this.middlewares.push(middleware);
    
    if (this.debug) {
      console.log('[Router] Middleware ajouté');
    }
  }
  
  /**
   * Supprimer un middleware
   * @param {Function} middleware - Middleware à supprimer
   */
  removeMiddleware(middleware) {
    const index = this.middlewares.indexOf(middleware);
    if (index !== -1) {
      this.middlewares.splice(index, 1);
      
      if (this.debug) {
        console.log('[Router] Middleware supprimé');
      }
    }
  }
  
  /**
   * Démarrer le routeur
   * @param {Object} options - Options de démarrage
   */
  start(options = {}) {
    this.basePath = options.basePath || '';
    
    // Écouter les événements de navigation
    window.addEventListener('popstate', this.handlePopState);
    document.addEventListener('click', this.handleClick);
    
    // Traiter la route initiale
    this.handleInitialRoute();
    
    if (this.debug) {
      console.log('[Router] Démarré');
    }
  }
  
  /**
   * Arrêter le routeur
   */
  stop() {
    window.removeEventListener('popstate', this.handlePopState);
    document.removeEventListener('click', this.handleClick);
    
    if (this.debug) {
      console.log('[Router] Arrêté');
    }
  }
  
  /**
   * Naviguer vers une route
   * @param {string} path - Chemin de destination
   * @param {Object} options - Options de navigation
   */
  navigate(path, options = {}) {
    const normalizedPath = this.normalizePath(path);
    const replace = options.replace || false;
    const state = options.state || null;
    
    if (this.debug) {
      console.log(`[Router] Navigation vers: ${normalizedPath}`);
    }
    
    // Mettre à jour l'historique du navigateur
    if (replace) {
      history.replaceState(state, '', this.basePath + normalizedPath);
    } else {
      history.pushState(state, '', this.basePath + normalizedPath);
    }
    
    // Traiter la nouvelle route
    this.handleRoute(normalizedPath, state);
  }
  
  /**
   * Remplacer la route courante
   * @param {string} path - Nouveau chemin
   * @param {Object} state - État associé
   */
  replace(path, state = null) {
    this.navigate(path, { replace: true, state });
  }
  
  /**
   * Retourner en arrière
   * @param {number} steps - Nombre d'étapes (-1 par défaut)
   */
  back(steps = -1) {
    history.go(steps);
  }
  
  /**
   * Aller en avant
   * @param {number} steps - Nombre d'étapes (1 par défaut)
   */
  forward(steps = 1) {
    history.go(steps);
  }
  
  /**
   * Obtenir la route actuelle
   * @returns {Object} Informations sur la route courante
   */
  getCurrentRoute() {
    return {
      path: this.currentRoute,
      params: { ...this.currentParams },
      query: this.parseQuery(window.location.search),
      hash: window.location.hash,
      state: history.state
    };
  }
  
  /**
   * Gérer la route initiale
   */
  handleInitialRoute() {
    const path = this.getCurrentPath();
    this.handleRoute(path, history.state);
  }
  
  /**
   * Gérer l'événement popstate
   * @param {PopStateEvent} event - Événement popstate
   */
  handlePopState(event) {
    const path = this.getCurrentPath();
    this.handleRoute(path, event.state);
  }
  
  /**
   * Gérer les clics sur les liens
   * @param {MouseEvent} event - Événement de clic
   */
  handleClick(event) {
    // Ignorer si modificateurs actifs
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    
    // Trouver le lien le plus proche
    const link = event.target.closest('a[href]');
    if (!link) return;
    
    const href = link.getAttribute('href');
    
    // Ignorer les liens externes et les liens avec target
    if (!href || 
        href.startsWith('http') || 
        href.startsWith('mailto:') || 
        href.startsWith('tel:') ||
        link.target) {
      return;
    }
    
    // Empêcher le comportement par défaut
    event.preventDefault();
    
    // Naviguer vers la nouvelle route
    this.navigate(href);
  }
  
  /**
   * Traiter une route
   * @param {string} path - Chemin de la route
   * @param {*} state - État associé
   */
  async handleRoute(path, state = null) {
    const startTime = performance.now();
    
    try {
      // Chercher la route correspondante
      const match = this.matchRoute(path);
      
      if (!match) {
        await this.handleNotFound(path);
        return;
      }
      
      const { route, params } = match;
      
      // Créer le contexte de navigation
      const context = {
        path,
        route,
        params,
        query: this.parseQuery(window.location.search),
        hash: window.location.hash,
        state,
        meta: route.meta,
        from: this.currentRoute,
        cancel: false
      };
      
      // Exécuter les middlewares
      for (const middleware of this.middlewares) {
        try {
          await middleware(context);
          if (context.cancel) {
            if (this.debug) {
              console.log(`[Router] Navigation annulée par middleware`);
            }
            return;
          }
        } catch (error) {
          console.error('[Router] Erreur middleware:', error);
        }
      }
      
      // Exécuter le guard beforeEnter
      if (route.beforeEnter) {
        try {
          await route.beforeEnter(context);
          if (context.cancel) {
            if (this.debug) {
              console.log(`[Router] Navigation annulée par beforeEnter`);
            }
            return;
          }
        } catch (error) {
          console.error('[Router] Erreur beforeEnter:', error);
        }
      }
      
      // Émettre l'événement de début de navigation
      this.eventBus.emit('router:beforeroute', context);
      
      // Exécuter le gestionnaire de route
      await route.handler(context);
      
      // Mettre à jour l'état du routeur
      this.updateCurrentRoute(path, params);
      
      // Émettre l'événement de fin de navigation
      this.eventBus.emit('router:afterroute', context);
      
      const duration = performance.now() - startTime;
      
      if (this.debug) {
        console.log(`[Router] Route "${path}" traitée en ${duration.toFixed(2)}ms`);
      }
      
    } catch (error) {
      console.error(`[Router] Erreur traitement route "${path}":`, error);
      await this.handleError(path, error);
    }
  }
  
  /**
   * Trouver la route correspondante
   * @param {string} path - Chemin à matcher
   * @returns {Object|null} Correspondance trouvée
   */
  matchRoute(path) {
    for (const [routePath, route] of this.routes) {
      const match = this.matchPattern(route.pattern, path);
      if (match) {
        return {
          route,
          params: match.params
        };
      }
    }
    
    return null;
  }
  
  /**
   * Matcher un pattern avec un chemin
   * @param {Object} pattern - Pattern compilé
   * @param {string} path - Chemin à tester
   * @returns {Object|null} Résultat du matching
   */
  matchPattern(pattern, path) {
    const match = path.match(pattern.regex);
    if (!match) return null;
    
    const params = {};
    pattern.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1] || '');
    });
    
    return { params };
  }
  
  /**
   * Compiler un pattern de route
   * @param {string} path - Chemin de la route
   * @returns {Object} Pattern compilé
   */
  compilePattern(path) {
    const paramNames = [];
    
    // Remplacer les paramètres par des groupes de capture
    const regexPattern = path
      .replace(/\//g, '\\/')
      .replace(/:([^\/]+)/g, (match, paramName) => {
        paramNames.push(paramName);
        return '([^\\/]+)';
      })
      .replace(/\*/g, '(.*)');
    
    return {
      regex: new RegExp(`^${regexPattern}$`),
      paramNames
    };
  }
  
  /**
   * Gérer une route non trouvée
   * @param {string} path - Chemin non trouvé
   */
  async handleNotFound(path) {
    if (this.debug) {
      console.warn(`[Router] Route non trouvée: ${path}`);
    }
    
    // Émettre l'événement
    this.eventBus.emit('router:notfound', { path });
    
    // Rediriger vers une route par défaut si configurée
    if (this.routes.has('/')) {
      this.navigate('/', { replace: true });
    }
  }
  
  /**
   * Gérer une erreur de route
   * @param {string} path - Chemin qui a causé l'erreur
   * @param {Error} error - Erreur survenue
   */
  async handleError(path, error) {
    console.error(`[Router] Erreur sur route "${path}":`, error);
    
    // Émettre l'événement d'erreur
    this.eventBus.emit('router:error', { path, error });
  }
  
  /**
   * Mettre à jour la route courante
   * @param {string} path - Nouveau chemin
   * @param {Object} params - Nouveaux paramètres
   */
  updateCurrentRoute(path, params) {
    const previousRoute = this.currentRoute;
    
    this.currentRoute = path;
    this.currentParams = params;
    
    // Ajouter à l'historique
    this.addToHistory(previousRoute, path);
  }
  
  /**
   * Ajouter à l'historique du routeur
   * @param {string} from - Route précédente
   * @param {string} to - Nouvelle route
   */
  addToHistory(from, to) {
    this.history.push({
      timestamp: Date.now(),
      from,
      to
    });
    
    // Limiter la taille de l'historique
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Parser les paramètres de query
   * @param {string} search - Chaîne de recherche
   * @returns {Object} Paramètres parsés
   */
  parseQuery(search) {
    const params = new URLSearchParams(search);
    const result = {};
    
    for (const [key, value] of params) {
      result[key] = value;
    }
    
    return result;
  }
  
  /**
   * Obtenir le chemin actuel
   * @returns {string} Chemin actuel
   */
  getCurrentPath() {
    let path = window.location.pathname;
    
    if (this.basePath && path.startsWith(this.basePath)) {
      path = path.substring(this.basePath.length);
    }
    
    return this.normalizePath(path);
  }
  
  /**
   * Normaliser un chemin
   * @param {string} path - Chemin à normaliser
   * @returns {string} Chemin normalisé
   */
  normalizePath(path) {
    if (!path || path === '/') return '/';
    
    // Supprimer les slashes multiples et finaux
    return '/' + path.split('/').filter(Boolean).join('/');
  }
  
  /**
   * Joindre des chemins
   * @param {string} parent - Chemin parent
   * @param {string} child - Chemin enfant
   * @returns {string} Chemin joint
   */
  joinPaths(parent, child) {
    const normalizedParent = this.normalizePath(parent);
    const normalizedChild = this.normalizePath(child);
    
    if (normalizedParent === '/') {
      return normalizedChild;
    }
    
    return normalizedParent + normalizedChild;
  }
  
  /**
   * Activer/désactiver le mode debug
   * @param {boolean} enabled - Activer le debug
   */
  setDebug(enabled) {
    this.debug = enabled;
    console.log(`[Router] Debug ${enabled ? 'activé' : 'désactivé'}`);
  }
  
  /**
   * Obtenir l'historique de navigation
   * @param {number} limit - Limite du nombre d'entrées
   * @returns {Array} Historique
   */
  getHistory(limit = null) {
    return limit ? this.history.slice(-limit) : [...this.history];
  }
  
  /**
   * Obtenir les statistiques
   * @returns {Object} Statistiques du routeur
   */
  getStats() {
    return {
      routesCount: this.routes.size,
      middlewaresCount: this.middlewares.length,
      currentRoute: this.currentRoute,
      historySize: this.history.length,
      routes: Array.from(this.routes.keys())
    };
  }
}

// Export global
window.Router = Router;