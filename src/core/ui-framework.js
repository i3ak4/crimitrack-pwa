/**
 * UI Framework - Interface utilisateur native avec animations fluides
 * Design System inspiré d'iOS avec micro-interactions
 */

export class UIFramework {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.components = new Map();
    this.animations = new Map();
    this.themes = new Map();
    this.currentTheme = 'auto';
    
    // Configuration par défaut
    this.config = {
      animationDuration: 300,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      hapticFeedback: true,
      prefersReducedMotion: false
    };
    
    // Element containers
    this.containers = {};
    
    // Composants UI réutilisables
    this.componentDefinitions = {};
  }
  
  async initialize(deviceType = 'iPad') {
    console.log('[UIFramework] Initialisation interface pour', deviceType);
    
    // Détecter les préférences utilisateur
    this.detectUserPreferences();
    
    // Configurer le thème
    await this.setupThemes();
    
    // Initialiser les containers
    this.setupContainers();
    
    // Créer les composants de base
    await this.createBaseComponents();
    
    // Configurer les animations selon l'appareil
    this.configureAnimations(deviceType);
    
    // Initialiser le système de notifications
    this.setupNotificationSystem();
    
    // Configurer les gestures
    this.setupGestureSystem();
    
    console.log('[UIFramework] Interface initialisée');
    this.eventBus.emit('ui:ready');
  }
  
  detectUserPreferences() {
    // Préférence de mouvement réduit
    this.config.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Préférence de thème
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.currentTheme = prefersDark ? 'dark' : 'light';
    
    // Écouter les changements
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.currentTheme === 'auto') {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
    
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.config.prefersReducedMotion = e.matches;
      this.updateAnimationSettings();
    });
  }
  
  async setupThemes() {
    // Thème clair
    this.themes.set('light', {
      colors: {
        primary: '#007AFF',
        secondary: '#5856D6',
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
        info: '#5AC8FA',
        
        background: '#FFFFFF',
        backgroundSecondary: '#F2F2F7',
        backgroundTertiary: '#FFFFFF',
        
        text: '#000000',
        textSecondary: '#3C3C43',
        textTertiary: '#3C3C4399',
        
        border: '#C6C6C8',
        separator: '#C6C6C8',
        
        card: '#FFFFFF',
        modal: '#FFFFFF'
      },
      shadows: {
        small: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        medium: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
        large: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
        card: '0 1px 3px rgba(0,0,0,0.12)'
      }
    });
    
    // Thème sombre
    this.themes.set('dark', {
      colors: {
        primary: '#0A84FF',
        secondary: '#5E5CE6',
        success: '#32D74B',
        warning: '#FF9F0A',
        danger: '#FF453A',
        info: '#64D2FF',
        
        background: '#000000',
        backgroundSecondary: '#1C1C1E',
        backgroundTertiary: '#2C2C2E',
        
        text: '#FFFFFF',
        textSecondary: '#EBEBF5',
        textTertiary: '#EBEBF599',
        
        border: '#38383A',
        separator: '#38383A',
        
        card: '#1C1C1E',
        modal: '#2C2C2E'
      },
      shadows: {
        small: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)',
        medium: '0 3px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4)',
        large: '0 10px 20px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.3)',
        card: '0 1px 3px rgba(0,0,0,0.3)'
      }
    });
    
    // Appliquer le thème initial
    this.applyTheme(this.currentTheme);
  }
  
  applyTheme(themeName) {
    const theme = this.themes.get(themeName);
    if (!theme) return;
    
    const root = document.documentElement;
    
    // Appliquer les couleurs
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Appliquer les ombres
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
    
    console.log(`[UIFramework] Thème ${themeName} appliqué`);
  }
  
  setupContainers() {
    // Container principal pour les modals
    this.containers.modals = this.createContainer('ui-modals', {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '1000',
      pointerEvents: 'none'
    });
    
    // Container pour les notifications
    this.containers.notifications = this.createContainer('ui-notifications', {
      position: 'fixed',
      top: 'var(--safe-area-inset-top, 0)',
      right: '20px',
      zIndex: '1100',
      maxWidth: '400px',
      pointerEvents: 'none'
    });
    
    // Container pour les toasts
    this.containers.toasts = this.createContainer('ui-toasts', {
      position: 'fixed',
      bottom: 'calc(var(--safe-area-inset-bottom, 0) + 20px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '1050',
      pointerEvents: 'none'
    });
    
    // Ajouter au DOM
    Object.values(this.containers).forEach(container => {
      document.body.appendChild(container);
    });
  }
  
  createContainer(id, styles) {
    const container = document.createElement('div');
    container.id = id;
    
    Object.entries(styles).forEach(([prop, value]) => {
      container.style[prop] = value;
    });
    
    return container;
  }
  
  async createBaseComponents() {
    // Component Button
    this.defineComponent('Button', {
      template: ({ text, type = 'primary', size = 'medium', disabled = false, icon = null }) => `
        <button class="ui-button ui-button--${type} ui-button--${size}" ${disabled ? 'disabled' : ''}>
          ${icon ? `<svg class="ui-button__icon">${icon}</svg>` : ''}
          <span class="ui-button__text">${text}</span>
        </button>
      `,
      style: `
        .ui-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms var(--ui-easing);
          position: relative;
          overflow: hidden;
        }
        
        .ui-button--primary {
          background: var(--color-primary);
          color: white;
        }
        
        .ui-button--secondary {
          background: var(--color-backgroundSecondary);
          color: var(--color-primary);
        }
        
        .ui-button--small {
          padding: 8px 16px;
          font-size: 14px;
        }
        
        .ui-button--medium {
          padding: 12px 24px;
          font-size: 16px;
        }
        
        .ui-button--large {
          padding: 16px 32px;
          font-size: 18px;
        }
        
        .ui-button:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }
        
        .ui-button:active:not(:disabled) {
          transform: translateY(0);
          filter: brightness(0.95);
        }
        
        .ui-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `
    });
    
    // Component Card
    this.defineComponent('Card', {
      template: ({ title, content, actions = [] }) => `
        <div class="ui-card">
          ${title ? `<div class="ui-card__header">${title}</div>` : ''}
          <div class="ui-card__content">${content}</div>
          ${actions.length ? `
            <div class="ui-card__actions">
              ${actions.map(action => this.renderComponent('Button', action)).join('')}
            </div>
          ` : ''}
        </div>
      `,
      style: `
        .ui-card {
          background: var(--color-card);
          border-radius: 16px;
          box-shadow: var(--shadow-card);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
        
        .ui-card__header {
          padding: 20px 20px 0;
          font-weight: 600;
          font-size: 18px;
          color: var(--color-text);
        }
        
        .ui-card__content {
          padding: 20px;
          color: var(--color-textSecondary);
          line-height: 1.6;
        }
        
        .ui-card__actions {
          padding: 0 20px 20px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
      `
    });
    
    // Component Modal
    this.defineComponent('Modal', {
      template: ({ title, content, actions = [], size = 'medium' }) => `
        <div class="ui-modal-backdrop" onclick="this.closest('.ui-modal').remove()">
          <div class="ui-modal ui-modal--${size}" onclick="event.stopPropagation()">
            <div class="ui-modal__header">
              <h2 class="ui-modal__title">${title}</h2>
              <button class="ui-modal__close" onclick="this.closest('.ui-modal').remove()">
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </svg>
              </button>
            </div>
            <div class="ui-modal__content">${content}</div>
            ${actions.length ? `
              <div class="ui-modal__actions">
                ${actions.map(action => this.renderComponent('Button', action)).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `,
      style: `
        .ui-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: ui-modal-backdrop-in 300ms var(--ui-easing);
        }
        
        .ui-modal {
          background: var(--color-modal);
          border-radius: 20px;
          box-shadow: var(--shadow-large);
          max-height: 90vh;
          overflow: hidden;
          animation: ui-modal-in 300ms var(--ui-easing);
        }
        
        .ui-modal--small { width: 300px; }
        .ui-modal--medium { width: 500px; }
        .ui-modal--large { width: 800px; }
        
        .ui-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 24px 0;
        }
        
        .ui-modal__title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text);
        }
        
        .ui-modal__close {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-textSecondary);
          padding: 8px;
          border-radius: 8px;
          transition: background-color 200ms;
        }
        
        .ui-modal__close:hover {
          background: var(--color-backgroundSecondary);
        }
        
        .ui-modal__content {
          padding: 24px;
          overflow-y: auto;
        }
        
        .ui-modal__actions {
          padding: 0 24px 24px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        @keyframes ui-modal-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes ui-modal-in {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `
    });
    
    // Injecter les styles des composants
    this.injectComponentStyles();
  }
  
  defineComponent(name, definition) {
    this.componentDefinitions[name] = definition;
  }
  
  renderComponent(name, props) {
    const component = this.componentDefinitions[name];
    if (!component) {
      console.error(`[UIFramework] Composant ${name} non trouvé`);
      return '';
    }
    
    return component.template(props);
  }
  
  injectComponentStyles() {
    const styleId = 'ui-framework-styles';
    const existingStyle = document.getElementById(styleId);
    
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    
    const allStyles = Object.values(this.componentDefinitions)
      .map(def => def.style)
      .filter(Boolean)
      .join('\n');
    
    style.textContent = `
      :root {
        --ui-easing: cubic-bezier(0.25, 0.1, 0.25, 1);
        --ui-easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      ${allStyles}
    `;
    
    document.head.appendChild(style);
  }
  
  configureAnimations(deviceType) {
    // Durées d'animation selon l'appareil
    const durations = {
      iPhone: { fast: 150, normal: 200, slow: 300 },
      iPad: { fast: 200, normal: 300, slow: 400 },
      MacBook: { fast: 150, normal: 250, slow: 350 }
    };
    
    const deviceDurations = durations[deviceType] || durations.iPad;
    
    // Appliquer les durées
    document.documentElement.style.setProperty('--animation-fast', `${deviceDurations.fast}ms`);
    document.documentElement.style.setProperty('--animation-normal', `${deviceDurations.normal}ms`);
    document.documentElement.style.setProperty('--animation-slow', `${deviceDurations.slow}ms`);
    
    // Réduire les animations si demandé
    if (this.config.prefersReducedMotion) {
      document.documentElement.style.setProperty('--animation-fast', '0ms');
      document.documentElement.style.setProperty('--animation-normal', '0ms');
      document.documentElement.style.setProperty('--animation-slow', '0ms');
    }
  }
  
  setupNotificationSystem() {
    this.notifications = {
      queue: [],
      active: new Set()
    };
  }
  
  setupGestureSystem() {
    // Configuration des gestures selon l'appareil
    this.gestures = {
      swipeThreshold: 100,
      velocityThreshold: 0.3,
      enabled: true
    };
  }
  
  // Animations de transition entre modules
  async animateTransition(type = 'slide', callback) {
    const container = document.getElementById('module-container');
    if (!container || this.config.prefersReducedMotion) {
      if (callback) await callback();
      return;
    }
    
    const animations = {
      slide: () => this.slideTransition(container, callback),
      fade: () => this.fadeTransition(container, callback),
      scale: () => this.scaleTransition(container, callback),
      flip: () => this.flipTransition(container, callback)
    };
    
    const animationFunc = animations[type] || animations.slide;
    await animationFunc();
  }
  
  async slideTransition(container, callback) {
    // Animation slide native iOS
    container.style.transform = 'translateX(-100%)';
    container.style.transition = 'transform var(--animation-normal) var(--ui-easing)';
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (callback) await callback();
    
    container.style.transform = 'translateX(100%)';
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    container.style.transform = 'translateX(0)';
    
    setTimeout(() => {
      container.style.transform = '';
      container.style.transition = '';
    }, 300);
  }
  
  async fadeTransition(container, callback) {
    container.style.opacity = '0';
    container.style.transition = 'opacity var(--animation-fast) var(--ui-easing)';
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    if (callback) await callback();
    
    container.style.opacity = '1';
    
    setTimeout(() => {
      container.style.opacity = '';
      container.style.transition = '';
    }, 150);
  }
  
  async scaleTransition(container, callback) {
    container.style.transform = 'scale(0.95)';
    container.style.opacity = '0.5';
    container.style.transition = 'all var(--animation-fast) var(--ui-easing)';
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (callback) await callback();
    
    container.style.transform = 'scale(1)';
    container.style.opacity = '1';
    
    setTimeout(() => {
      container.style.transform = '';
      container.style.opacity = '';
      container.style.transition = '';
    }, 200);
  }
  
  // Masquer le splash screen avec animation
  async hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    
    return new Promise(resolve => {
      splash.style.transition = 'all 500ms var(--ui-easing)';
      splash.style.opacity = '0';
      splash.style.transform = 'scale(1.1)';
      
      setTimeout(() => {
        splash.remove();
        resolve();
      }, 500);
    });
  }
  
  // Système de notification avancé
  showNotification(message, type = 'info', options = {}) {
    const id = `notification-${Date.now()}`;
    const notification = this.createNotification(id, message, type, options);
    
    this.containers.notifications.appendChild(notification);
    this.notifications.active.add(id);
    
    // Animation d'entrée
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });
    
    // Auto-suppression
    const duration = options.duration || (type === 'error' ? 5000 : 3000);
    setTimeout(() => {
      this.hideNotification(id);
    }, duration);
    
    return id;
  }
  
  createNotification(id, message, type, options) {
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `ui-notification ui-notification--${type}`;
    
    const icons = {
      success: '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>',
      error: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>',
      warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
      info: '<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7H13V9H11V7M11,11H13V17H11V11Z"/>'
    };
    
    notification.innerHTML = `
      <div class="ui-notification__content">
        <svg class="ui-notification__icon" viewBox="0 0 24 24">
          ${icons[type] || icons.info}
        </svg>
        <span class="ui-notification__message">${message}</span>
        <button class="ui-notification__close" onclick="this.closest('.ui-notification').remove()">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>
      </div>
    `;
    
    // Styles inline pour l'animation
    notification.style.cssText = `
      transform: translateX(100%);
      opacity: 0;
      transition: all 300ms var(--ui-easing);
      margin-bottom: 12px;
      pointer-events: auto;
    `;
    
    return notification;
  }
  
  hideNotification(id) {
    const notification = document.getElementById(id);
    if (notification && this.notifications.active.has(id)) {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      
      setTimeout(() => {
        notification.remove();
        this.notifications.active.delete(id);
      }, 300);
    }
  }
  
  // Modal système
  async showModal(config) {
    const modal = document.createElement('div');
    modal.className = 'ui-modal-container';
    modal.innerHTML = this.renderComponent('Modal', config);
    
    this.containers.modals.appendChild(modal);
    this.containers.modals.style.pointerEvents = 'auto';
    
    return new Promise(resolve => {
      // Gérer la fermeture
      const cleanup = () => {
        modal.remove();
        if (!this.containers.modals.children.length) {
          this.containers.modals.style.pointerEvents = 'none';
        }
        resolve();
      };
      
      modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('ui-modal-backdrop')) {
          cleanup();
        }
      });
    });
  }
  
  // Gestion des erreurs avec interface
  async showErrorScreen(config) {
    const errorScreen = document.createElement('div');
    errorScreen.className = 'ui-error-screen';
    errorScreen.innerHTML = `
      <div class="ui-error-content">
        <div class="ui-error-icon">❌</div>
        <h2 class="ui-error-title">${config.title}</h2>
        <p class="ui-error-message">${config.message}</p>
        <div class="ui-error-actions">
          ${config.actions.map(action => `
            <button class="ui-button ui-button--primary" onclick="(${action.action})()">
              ${action.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    
    document.body.appendChild(errorScreen);
  }
  
  // Gestion de l'orientation
  handleOrientationChange(orientation) {
    document.body.classList.toggle('landscape', orientation === 'landscape');
    
    // Réajuster les containers
    if (orientation === 'landscape') {
      this.containers.notifications.style.right = '40px';
    } else {
      this.containers.notifications.style.right = '20px';
    }
    
    this.eventBus.emit('ui:orientation', { orientation });
  }
  
  // API publique
  setTheme(themeName) {
    if (this.themes.has(themeName)) {
      this.currentTheme = themeName;
      this.applyTheme(themeName);
    }
  }
  
  updateAnimationSettings() {
    this.configureAnimations(this.deviceType);
  }
  
  // Créer un composant dynamiquement
  createElement(type, props = {}, children = []) {
    const element = document.createElement(type);
    
    Object.entries(props).forEach(([key, value]) => {
      if (key.startsWith('on')) {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'style') {
        Object.entries(value).forEach(([prop, val]) => {
          element.style[prop] = val;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
    
    return element;
  }
}

export default UIFramework;