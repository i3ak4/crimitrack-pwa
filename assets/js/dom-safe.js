/**
 * DOM Safe - Protection contre les erreurs de manipulation DOM
 * Évite les crashes "Cannot set property 'innerHTML' of null"
 */

(function() {
  'use strict';
  
  // Wrapper sécurisé pour getElementById
  const originalGetElementById = document.getElementById.bind(document);
  document.getElementById = function(id) {
    const element = originalGetElementById(id);
    if (!element) {
      console.warn(`[DOM-Safe] Element avec id="${id}" non trouvé`);
    }
    return element;
  };
  
  // Wrapper sécurisé pour querySelector
  const originalQuerySelector = document.querySelector.bind(document);
  document.querySelector = function(selector) {
    try {
      const element = originalQuerySelector(selector);
      if (!element && selector) {
        console.debug(`[DOM-Safe] Aucun élément trouvé pour: ${selector}`);
      }
      return element;
    } catch (error) {
      console.error(`[DOM-Safe] Sélecteur invalide: ${selector}`, error);
      return null;
    }
  };
  
  // Wrapper sécurisé pour querySelectorAll
  const originalQuerySelectorAll = document.querySelectorAll.bind(document);
  document.querySelectorAll = function(selector) {
    try {
      return originalQuerySelectorAll(selector);
    } catch (error) {
      console.error(`[DOM-Safe] Sélecteur invalide: ${selector}`, error);
      return [];
    }
  };
  
  // Fonction utilitaire pour manipuler le DOM en sécurité
  window.safeDOM = {
    /**
     * Met à jour le contenu HTML d'un élément en sécurité
     */
    setHTML(elementOrId, html) {
      const element = typeof elementOrId === 'string' 
        ? document.getElementById(elementOrId)
        : elementOrId;
        
      if (element) {
        element.innerHTML = html;
        return true;
      }
      console.warn(`[DOM-Safe] Impossible de définir innerHTML sur élément null`);
      return false;
    },
    
    /**
     * Met à jour le texte d'un élément en sécurité
     */
    setText(elementOrId, text) {
      const element = typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;
        
      if (element) {
        element.textContent = text;
        return true;
      }
      console.warn(`[DOM-Safe] Impossible de définir textContent sur élément null`);
      return false;
    },
    
    /**
     * Ajoute une classe CSS en sécurité
     */
    addClass(elementOrId, className) {
      const element = typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;
        
      if (element) {
        element.classList.add(className);
        return true;
      }
      return false;
    },
    
    /**
     * Retire une classe CSS en sécurité
     */
    removeClass(elementOrId, className) {
      const element = typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;
        
      if (element) {
        element.classList.remove(className);
        return true;
      }
      return false;
    },
    
    /**
     * Vérifie si un élément existe
     */
    exists(elementOrId) {
      if (typeof elementOrId === 'string') {
        return document.getElementById(elementOrId) !== null;
      }
      return elementOrId !== null && elementOrId !== undefined;
    },
    
    /**
     * Attend qu'un élément soit disponible dans le DOM
     */
    async waitForElement(selector, timeout = 5000) {
      return new Promise((resolve) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        
        const observer = new MutationObserver((mutations, obs) => {
          const element = document.querySelector(selector);
          if (element) {
            obs.disconnect();
            resolve(element);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Timeout pour éviter d'attendre indéfiniment
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    },
    
    /**
     * Exécute une fonction quand le DOM est prêt
     */
    ready(callback) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
      } else {
        callback();
      }
    }
  };
  
  // Protection globale contre les erreurs innerHTML
  Object.defineProperty(HTMLElement.prototype, 'safeInnerHTML', {
    set: function(html) {
      try {
        this.innerHTML = html;
      } catch (error) {
        console.error('[DOM-Safe] Erreur lors de la définition de innerHTML:', error);
      }
    },
    get: function() {
      return this.innerHTML;
    }
  });
  
  console.log('✅ DOM-Safe activé - Protection contre les erreurs DOM');
  
})();