/**
 * CrimiTrack PWA - State Manager
 * Gestion d'état centralisée avec réactivité
 * Pattern Store avec proxy pour détection des changements
 */

class StateManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.state = {};
    this.subscribers = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    this.debug = false;
    
    // Créer un proxy pour détecter automatiquement les changements
    this.store = this.createReactiveStore();
    
    console.log('[StateManager] Initialisé');
  }
  
  createReactiveStore() {
    return new Proxy(this.state, {
      set: (target, property, value) => {
        const oldValue = target[property];
        
        if (oldValue !== value) {
          // Appliquer les middleware avant modification
          const context = {
            property,
            oldValue,
            newValue: value,
            state: { ...target },
            prevent: false
          };
          
          for (const middleware of this.middleware) {
            try {
              middleware(context);
              if (context.prevent) {
                if (this.debug) {
                  console.log(`[StateManager] Modification de "${property}" empêchée par middleware`);
                }
                return false;
              }
            } catch (error) {
              console.error('[StateManager] Erreur middleware:', error);
            }
          }
          
          // Appliquer la modification
          target[property] = context.newValue !== undefined ? context.newValue : value;
          
          // Ajouter à l'historique
          this.addToHistory(property, oldValue, target[property]);
          
          // Notifier les changements
          this.notifyChange(property, oldValue, target[property]);
          
          if (this.debug) {
            console.log(`[StateManager] État modifié: ${property}`, { oldValue, newValue: target[property] });
          }
        }
        
        return true;
      },
      
      get: (target, property) => {
        return target[property];
      },
      
      deleteProperty: (target, property) => {
        if (property in target) {
          const oldValue = target[property];
          delete target[property];
          
          this.addToHistory(property, oldValue, undefined);
          this.notifyChange(property, oldValue, undefined);
          
          if (this.debug) {
            console.log(`[StateManager] Propriété supprimée: ${property}`);
          }
        }
        return true;
      }
    });
  }
  
  /**
   * Définir une valeur dans l'état
   * @param {string} key - Clé de la propriété
   * @param {*} value - Valeur à définir
   */
  setState(key, value) {
    this.store[key] = value;
  }
  
  /**
   * Récupérer une valeur de l'état
   * @param {string} key - Clé de la propriété
   * @param {*} defaultValue - Valeur par défaut
   * @returns {*} Valeur de l'état
   */
  getState(key, defaultValue = undefined) {
    return this.store[key] !== undefined ? this.store[key] : defaultValue;
  }
  
  /**
   * Vérifier si une clé existe dans l'état
   * @param {string} key - Clé à vérifier
   * @returns {boolean}
   */
  hasState(key) {
    return key in this.store;
  }
  
  /**
   * Supprimer une clé de l'état
   * @param {string} key - Clé à supprimer
   */
  removeState(key) {
    delete this.store[key];
  }
  
  /**
   * Mettre à jour partiellement l'état
   * @param {Object} updates - Objet avec les mises à jour
   */
  updateState(updates) {
    if (typeof updates !== 'object' || updates === null) {
      throw new Error('Les mises à jour doivent être un objet');
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      this.setState(key, value);
    });
  }
  
  /**
   * Réinitialiser l'état
   * @param {Object} newState - Nouvel état (optionnel)
   */
  resetState(newState = {}) {
    const oldState = { ...this.state };
    
    // Vider l'état actuel
    Object.keys(this.state).forEach(key => {
      delete this.store[key];
    });
    
    // Appliquer le nouvel état
    Object.entries(newState).forEach(([key, value]) => {
      this.store[key] = value;
    });
    
    // Émettre un événement de reset
    this.eventBus.emit('state:reset', { oldState, newState });
    
    if (this.debug) {
      console.log('[StateManager] État réinitialisé', newState);
    }
  }
  
  /**
   * S'abonner aux changements d'état
   * @param {string|Array} keys - Clé(s) à surveiller (* pour tout)
   * @param {Function} callback - Fonction de callback
   * @param {Object} options - Options d'abonnement
   * @returns {Function} Fonction de désabonnement
   */
  subscribe(keys, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Le callback doit être une fonction');
    }
    
    const subscription = {
      id: this.generateId(),
      keys: Array.isArray(keys) ? keys : [keys],
      callback,
      immediate: options.immediate || false,
      deep: options.deep || false
    };
    
    // Ajouter l'abonnement
    if (!this.subscribers.has('all')) {
      this.subscribers.set('all', []);
    }
    this.subscribers.get('all').push(subscription);
    
    // Exécuter immédiatement si demandé
    if (subscription.immediate) {
      const currentValues = {};
      subscription.keys.forEach(key => {
        if (key === '*') {
          Object.assign(currentValues, this.state);
        } else {
          currentValues[key] = this.getState(key);
        }
      });
      
      try {
        callback(currentValues, {});
      } catch (error) {
        console.error('[StateManager] Erreur callback immédiat:', error);
      }
    }
    
    if (this.debug) {
      console.log(`[StateManager] Abonnement créé pour ${subscription.keys.join(', ')}`);
    }
    
    // Retourner fonction de désabonnement
    return () => this.unsubscribe(subscription.id);
  }
  
  /**
   * Se désabonner
   * @param {string} subscriptionId - ID de l'abonnement
   */
  unsubscribe(subscriptionId) {
    const allSubscriptions = this.subscribers.get('all') || [];
    const index = allSubscriptions.findIndex(sub => sub.id === subscriptionId);
    
    if (index !== -1) {
      allSubscriptions.splice(index, 1);
      
      if (this.debug) {
        console.log(`[StateManager] Désabonnement ${subscriptionId}`);
      }
    }
  }
  
  /**
   * Notifier les changements aux abonnés
   * @param {string} key - Clé modifiée
   * @param {*} oldValue - Ancienne valeur
   * @param {*} newValue - Nouvelle valeur
   */
  notifyChange(key, oldValue, newValue) {
    const allSubscriptions = this.subscribers.get('all') || [];
    
    for (const subscription of allSubscriptions) {
      // Vérifier si l'abonnement concerne cette clé
      const shouldNotify = subscription.keys.includes('*') || 
                          subscription.keys.includes(key);
      
      if (shouldNotify) {
        try {
          const changeInfo = {
            key,
            oldValue,
            newValue,
            timestamp: Date.now()
          };
          
          const currentValues = {};
          subscription.keys.forEach(subKey => {
            if (subKey === '*') {
              Object.assign(currentValues, this.state);
            } else {
              currentValues[subKey] = this.getState(subKey);
            }
          });
          
          subscription.callback(currentValues, changeInfo);
          
        } catch (error) {
          console.error(`[StateManager] Erreur callback abonnement ${subscription.id}:`, error);
        }
      }
    }
    
    // Émettre l'événement global
    this.eventBus.emit('state:change', {
      key,
      oldValue,
      newValue,
      state: { ...this.state }
    });
  }
  
  /**
   * Ajouter à l'historique
   * @param {string} key - Clé modifiée
   * @param {*} oldValue - Ancienne valeur
   * @param {*} newValue - Nouvelle valeur
   */
  addToHistory(key, oldValue, newValue) {
    this.history.push({
      timestamp: Date.now(),
      key,
      oldValue,
      newValue
    });
    
    // Limiter la taille de l'historique
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Obtenir l'historique des changements
   * @param {string} key - Clé spécifique (optionnel)
   * @param {number} limit - Limite du nombre d'entrées
   * @returns {Array} Historique
   */
  getHistory(key = null, limit = null) {
    let history = this.history;
    
    if (key) {
      history = history.filter(entry => entry.key === key);
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
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
      console.log('[StateManager] Middleware ajouté');
    }
  }
  
  /**
   * Supprimer un middleware
   * @param {Function} middleware - Middleware à supprimer
   */
  removeMiddleware(middleware) {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      
      if (this.debug) {
        console.log('[StateManager] Middleware supprimé');
      }
    }
  }
  
  /**
   * Sauvegarder l'état dans localStorage
   * @param {string} key - Clé de sauvegarde
   * @param {Array} excludeKeys - Clés à exclure
   */
  persist(key = 'crimitrack_state', excludeKeys = []) {
    try {
      const stateToPersist = { ...this.state };
      
      // Exclure les clés spécifiées
      excludeKeys.forEach(excludeKey => {
        delete stateToPersist[excludeKey];
      });
      
      localStorage.setItem(key, JSON.stringify(stateToPersist));
      
      if (this.debug) {
        console.log('[StateManager] État sauvegardé');
      }
      
    } catch (error) {
      console.error('[StateManager] Erreur sauvegarde état:', error);
    }
  }
  
  /**
   * Restaurer l'état depuis localStorage
   * @param {string} key - Clé de sauvegarde
   * @param {boolean} merge - Fusionner avec l'état actuel
   */
  restore(key = 'crimitrack_state', merge = true) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const savedState = JSON.parse(saved);
        
        if (merge) {
          this.updateState(savedState);
        } else {
          this.resetState(savedState);
        }
        
        if (this.debug) {
          console.log('[StateManager] État restauré');
        }
        
        return true;
      }
      
    } catch (error) {
      console.error('[StateManager] Erreur restauration état:', error);
    }
    
    return false;
  }
  
  /**
   * Créer un computed state (valeur dérivée)
   * @param {Function} computeFn - Fonction de calcul
   * @param {Array} dependencies - Dépendances à surveiller
   * @returns {Function} Fonction de désabonnement
   */
  computed(computeFn, dependencies = ['*']) {
    if (typeof computeFn !== 'function') {
      throw new Error('La fonction de calcul doit être une fonction');
    }
    
    let currentValue;
    let isFirst = true;
    
    const update = () => {
      try {
        const newValue = computeFn(this.state);
        
        if (isFirst || newValue !== currentValue) {
          currentValue = newValue;
          isFirst = false;
          
          this.eventBus.emit('state:computed', {
            value: newValue,
            dependencies
          });
        }
        
      } catch (error) {
        console.error('[StateManager] Erreur computed:', error);
      }
    };
    
    // Calculer la valeur initiale
    update();
    
    // S'abonner aux changements
    const unsubscribe = this.subscribe(dependencies, update);
    
    return {
      get value() {
        return currentValue;
      },
      unsubscribe
    };
  }
  
  /**
   * Activer/désactiver le mode debug
   * @param {boolean} enabled - Activer le debug
   */
  setDebug(enabled) {
    this.debug = enabled;
    console.log(`[StateManager] Debug ${enabled ? 'activé' : 'désactivé'}`);
  }
  
  /**
   * Générer un ID unique
   * @returns {string}
   */
  generateId() {
    return `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Obtenir les statistiques
   * @returns {Object}
   */
  getStats() {
    return {
      stateKeys: Object.keys(this.state).length,
      subscribers: this.subscribers.get('all')?.length || 0,
      historySize: this.history.length,
      middlewareCount: this.middleware.length,
      state: { ...this.state }
    };
  }
  
  /**
   * Obtenir l'état complet (copie)
   * @returns {Object}
   */
  getFullState() {
    return { ...this.state };
  }
}

// Export global
window.StateManager = StateManager;