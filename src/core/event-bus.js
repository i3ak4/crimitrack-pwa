/**
 * CrimiTrack PWA - Event Bus
 * Système de communication inter-modules
 * Pattern Observer pour architecture découplée
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.listeners = new Map();
    this.middleware = [];
    this.debug = false;
    
    console.log('[EventBus] Initialisé');
  }
  
  /**
   * Abonner un listener à un événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction callback
   * @param {Object} options - Options (once, priority)
   * @returns {Function} Fonction de désabonnement
   */
  on(event, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Le callback doit être une fonction');
    }
    
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: this.generateId()
    };
    
    const listeners = this.events.get(event);
    listeners.push(listener);
    
    // Trier par priorité (plus haute en premier)
    listeners.sort((a, b) => b.priority - a.priority);
    
    // Mapper l'ID pour le tracking
    this.listeners.set(listener.id, { event, listener });
    
    if (this.debug) {
      console.log(`[EventBus] Listener ajouté pour "${event}"`);
    }
    
    // Retourner fonction de désabonnement
    return () => this.off(event, listener.id);
  }
  
  /**
   * Abonner un listener une seule fois
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction callback
   * @returns {Function} Fonction de désabonnement
   */
  once(event, callback) {
    return this.on(event, callback, { once: true });
  }
  
  /**
   * Désabonner un listener
   * @param {string} event - Nom de l'événement
   * @param {string|Function} callbackOrId - Callback ou ID du listener
   */
  off(event, callbackOrId) {
    if (!this.events.has(event)) {
      return;
    }
    
    const listeners = this.events.get(event);
    
    if (typeof callbackOrId === 'string') {
      // Désabonnement par ID
      const index = listeners.findIndex(l => l.id === callbackOrId);
      if (index !== -1) {
        listeners.splice(index, 1);
        this.listeners.delete(callbackOrId);
      }
    } else if (typeof callbackOrId === 'function') {
      // Désabonnement par callback
      const index = listeners.findIndex(l => l.callback === callbackOrId);
      if (index !== -1) {
        const listener = listeners[index];
        listeners.splice(index, 1);
        this.listeners.delete(listener.id);
      }
    }
    
    // Nettoyer si plus de listeners
    if (listeners.length === 0) {
      this.events.delete(event);
    }
    
    if (this.debug) {
      console.log(`[EventBus] Listener supprimé pour "${event}"`);
    }
  }
  
  /**
   * Émettre un événement
   * @param {string} event - Nom de l'événement
   * @param {*} data - Données à transmettre
   * @param {Object} options - Options d'émission
   * @returns {Promise} Résultat de l'émission
   */
  async emit(event, data = null, options = {}) {
    const startTime = performance.now();
    
    if (this.debug) {
      console.log(`[EventBus] Émission "${event}"`, data);
    }
    
    // Créer l'objet événement
    const eventObj = {
      type: event,
      data,
      timestamp: Date.now(),
      source: options.source || 'unknown',
      preventDefault: false,
      stopPropagation: false
    };
    
    // Appliquer les middleware
    for (const middleware of this.middleware) {
      try {
        await middleware(eventObj);
        if (eventObj.stopPropagation) {
          break;
        }
      } catch (error) {
        console.error('[EventBus] Erreur middleware:', error);
      }
    }
    
    if (eventObj.preventDefault) {
      if (this.debug) {
        console.log(`[EventBus] Événement "${event}" annulé par middleware`);
      }
      return { prevented: true };
    }
    
    // Récupérer les listeners
    const listeners = this.events.get(event) || [];
    const results = [];
    const toRemove = [];
    
    // Exécuter les listeners
    for (const listener of listeners) {
      try {
        const result = await listener.callback(eventObj.data, eventObj);
        results.push(result);
        
        // Marquer pour suppression si 'once'
        if (listener.once) {
          toRemove.push(listener.id);
        }
        
        if (eventObj.stopPropagation) {
          break;
        }
        
      } catch (error) {
        console.error(`[EventBus] Erreur listener pour "${event}":`, error);
        results.push({ error });
      }
    }
    
    // Supprimer les listeners 'once'
    toRemove.forEach(id => {
      this.off(event, id);
    });
    
    const duration = performance.now() - startTime;
    
    if (this.debug) {
      console.log(`[EventBus] "${event}" traité en ${duration.toFixed(2)}ms`);
    }
    
    // Retourner le résultat
    return {
      event,
      listenersCount: listeners.length,
      results,
      duration,
      prevented: false
    };
  }
  
  /**
   * Émettre un événement de manière synchrone
   * @param {string} event - Nom de l'événement
   * @param {*} data - Données à transmettre
   */
  emitSync(event, data = null) {
    if (this.debug) {
      console.log(`[EventBus] Émission sync "${event}"`, data);
    }
    
    const listeners = this.events.get(event) || [];
    const toRemove = [];
    
    for (const listener of listeners) {
      try {
        listener.callback(data);
        
        if (listener.once) {
          toRemove.push(listener.id);
        }
      } catch (error) {
        console.error(`[EventBus] Erreur listener sync pour "${event}":`, error);
      }
    }
    
    // Supprimer les listeners 'once'
    toRemove.forEach(id => {
      this.off(event, id);
    });
  }
  
  /**
   * Ajouter un middleware
   * @param {Function} middleware - Fonction middleware
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Le middleware doit être une fonction');
    }
    
    this.middleware.push(middleware);
    
    if (this.debug) {
      console.log('[EventBus] Middleware ajouté');
    }
  }
  
  /**
   * Supprimer un middleware
   * @param {Function} middleware - Fonction middleware à supprimer
   */
  removeMiddleware(middleware) {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      
      if (this.debug) {
        console.log('[EventBus] Middleware supprimé');
      }
    }
  }
  
  /**
   * Vérifier si un événement a des listeners
   * @param {string} event - Nom de l'événement
   * @returns {boolean}
   */
  hasListeners(event) {
    return this.events.has(event) && this.events.get(event).length > 0;
  }
  
  /**
   * Obtenir le nombre de listeners pour un événement
   * @param {string} event - Nom de l'événement
   * @returns {number}
   */
  getListenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }
  
  /**
   * Obtenir la liste de tous les événements
   * @returns {Array} Liste des noms d'événements
   */
  getEvents() {
    return Array.from(this.events.keys());
  }
  
  /**
   * Supprimer tous les listeners d'un événement
   * @param {string} event - Nom de l'événement
   */
  removeAllListeners(event) {
    if (this.events.has(event)) {
      const listeners = this.events.get(event);
      listeners.forEach(listener => {
        this.listeners.delete(listener.id);
      });
      this.events.delete(event);
      
      if (this.debug) {
        console.log(`[EventBus] Tous les listeners supprimés pour "${event}"`);
      }
    }
  }
  
  /**
   * Vider complètement l'event bus
   */
  clear() {
    this.events.clear();
    this.listeners.clear();
    
    if (this.debug) {
      console.log('[EventBus] Tous les événements supprimés');
    }
  }
  
  /**
   * Activer/désactiver le mode debug
   * @param {boolean} enabled - Activer le debug
   */
  setDebug(enabled) {
    this.debug = enabled;
    console.log(`[EventBus] Debug ${enabled ? 'activé' : 'désactivé'}`);
  }
  
  /**
   * Générer un ID unique
   * @returns {string}
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Obtenir les statistiques
   * @returns {Object}
   */
  getStats() {
    const eventStats = {};
    
    this.events.forEach((listeners, event) => {
      eventStats[event] = {
        listenersCount: listeners.length,
        listeners: listeners.map(l => ({
          id: l.id,
          once: l.once,
          priority: l.priority
        }))
      };
    });
    
    return {
      totalEvents: this.events.size,
      totalListeners: this.listeners.size,
      middlewareCount: this.middleware.length,
      events: eventStats
    };
  }
  
  /**
   * Créer un namespace pour éviter les conflits
   * @param {string} namespace - Nom du namespace
   * @returns {Object} Event bus avec namespace
   */
  namespace(namespace) {
    return {
      on: (event, callback, options) => this.on(`${namespace}:${event}`, callback, options),
      once: (event, callback) => this.once(`${namespace}:${event}`, callback),
      off: (event, callbackOrId) => this.off(`${namespace}:${event}`, callbackOrId),
      emit: (event, data, options) => this.emit(`${namespace}:${event}`, data, { ...options, source: namespace }),
      emitSync: (event, data) => this.emitSync(`${namespace}:${event}`, data)
    };
  }
}

// Export global
window.EventBus = EventBus;