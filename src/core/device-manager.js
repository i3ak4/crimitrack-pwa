/**
 * Device Manager - Détection et gestion intelligente des appareils
 * Optimisé pour iPhone, iPad, MacBook avec features natives
 */

export class DeviceManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.device = null;
    this.capabilities = {};
    this.orientation = null;
    this.connection = null;
    
    // Métriques de performance par appareil
    this.performanceBaselines = {
      iPhone: { cpuScore: 0.7, memoryMB: 3000, maxConcurrency: 3 },
      iPad: { cpuScore: 0.85, memoryMB: 4000, maxConcurrency: 5 },
      MacBook: { cpuScore: 1.0, memoryMB: 8000, maxConcurrency: 8 }
    };
  }
  
  async initialize() {
    console.log('[DeviceManager] Initialisation détection appareil...');
    
    // Détecter le type d'appareil
    this.device = this.detectDevice();
    
    // Détecter les capacités
    this.capabilities = await this.detectCapabilities();
    
    // Configurer les listeners
    this.setupEventListeners();
    
    // Optimiser selon l'appareil
    await this.optimizeForDevice();
    
    console.log('[DeviceManager] Appareil détecté:', this.device);
    console.log('[DeviceManager] Capacités:', this.capabilities);
    
    this.eventBus.emit('device:ready', {
      type: this.device.type,
      capabilities: this.capabilities
    });
  }
  
  detectDevice() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const width = window.screen.width;
    const height = window.screen.height;
    const dpr = window.devicePixelRatio || 1;
    
    let device = {
      type: 'Unknown',
      model: 'Unknown',
      os: 'Unknown',
      browser: 'Unknown',
      screen: { width, height, dpr },
      touch: maxTouchPoints > 0,
      standalone: this.isStandalone()
    };
    
    // Détection iOS
    if (/iPhone|iPod/.test(userAgent)) {
      device.type = 'iPhone';
      device.os = 'iOS';
      device.model = this.getiPhoneModel(width, height, dpr);
    } 
    else if (/iPad/.test(userAgent) || (maxTouchPoints > 1 && /Mac/.test(platform))) {
      device.type = 'iPad';
      device.os = 'iPadOS';
      device.model = this.getiPadModel(width, height, dpr);
    }
    // Détection macOS
    else if (/Mac/.test(platform) && maxTouchPoints === 0) {
      device.type = 'MacBook';
      device.os = 'macOS';
      device.model = this.getMacModel(width, height);
    }
    
    // Détection navigateur
    if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      device.browser = 'Safari';
    } else if (/Chrome/.test(userAgent)) {
      device.browser = 'Chrome';
    } else if (/Firefox/.test(userAgent)) {
      device.browser = 'Firefox';
    }
    
    return device;
  }
  
  getiPhoneModel(width, height, dpr) {
    const resolution = width * dpr;
    
    // iPhone 15 Pro Max: 430x932 @3x
    if (resolution >= 1290 && height >= 932) return 'iPhone 15 Pro Max';
    // iPhone 15 Pro: 393x852 @3x
    if (resolution >= 1179 && height >= 852) return 'iPhone 15 Pro';
    // iPhone 15: 393x852 @2x
    if (width >= 393 && height >= 852) return 'iPhone 15';
    // iPhone 14 Pro: 393x852 @3x
    if (resolution >= 1179 && height >= 852) return 'iPhone 14 Pro';
    // iPhone 13/14: 390x844 @3x
    if (resolution >= 1170 && height >= 844) return 'iPhone 13/14';
    
    return 'iPhone (générique)';
  }
  
  getiPadModel(width, height, dpr) {
    const maxDimension = Math.max(width, height);
    
    // iPad Pro 13": 1024x1366
    if (maxDimension >= 1366) return 'iPad Pro 13"';
    // iPad Pro 11": 834x1194
    if (maxDimension >= 1194) return 'iPad Pro 11"';
    // iPad Air: 820x1180
    if (maxDimension >= 1180) return 'iPad Air';
    // iPad standard: 810x1080
    if (maxDimension >= 1080) return 'iPad';
    
    return 'iPad (générique)';
  }
  
  getMacModel(width, height) {
    const totalPixels = width * height;
    
    // MacBook Pro 16": 3456x2234
    if (totalPixels >= 7000000) return 'MacBook Pro 16"';
    // MacBook Pro 14": 3024x1964
    if (totalPixels >= 5000000) return 'MacBook Pro 14"';
    // MacBook Air M2: 2560x1664
    if (totalPixels >= 4000000) return 'MacBook Air M2';
    
    return 'MacBook (générique)';
  }
  
  async detectCapabilities() {
    const capabilities = {
      // APIs Web modernes
      serviceWorker: 'serviceWorker' in navigator,
      fileSystemAccess: 'showOpenFilePicker' in window,
      notifications: 'Notification' in window,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator,
      
      // Fonctionnalités avancées
      webGL: this.hasWebGL(),
      webGL2: this.hasWebGL2(),
      webAssembly: 'WebAssembly' in window,
      sharedArrayBuffer: 'SharedArrayBuffer' in window,
      
      // Stockage
      indexedDB: 'indexedDB' in window,
      localStorage: this.hasLocalStorage(),
      
      // Réseau
      onLine: navigator.onLine,
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
      
      // Performance
      performanceObserver: 'PerformanceObserver' in window,
      memoryInfo: 'memory' in performance,
      
      // Sécurité
      isSecureContext: window.isSecureContext,
      
      // Spécifique mobile
      touchEvents: 'ontouchstart' in window,
      deviceOrientationEvent: 'DeviceOrientationEvent' in window,
      vibration: 'vibrate' in navigator,
      
      // Estimation des performances
      ...await this.benchmarkDevice()
    };
    
    return capabilities;
  }
  
  hasWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }
  
  hasWebGL2() {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch (e) {
      return false;
    }
  }
  
  hasLocalStorage() {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  }
  
  async benchmarkDevice() {
    console.log('[DeviceManager] Benchmark performances...');
    
    const start = performance.now();
    
    // Test CPU simple
    let cpuScore = 0;
    const iterations = 100000;
    const cpuStart = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      Math.random() * Math.sin(i) + Math.cos(i);
    }
    
    const cpuTime = performance.now() - cpuStart;
    cpuScore = Math.max(0, Math.min(1, 100 / cpuTime));
    
    // Test mémoire
    let memoryScore = 0.5;
    if (performance.memory) {
      const totalMemory = performance.memory.totalJSHeapSize / 1024 / 1024;
      memoryScore = Math.min(1, totalMemory / 100);
    }
    
    const benchmarkTime = performance.now() - start;
    
    console.log(`[DeviceManager] Benchmark terminé en ${benchmarkTime.toFixed(2)}ms`);
    console.log(`[DeviceManager] CPU Score: ${cpuScore.toFixed(3)}, Memory Score: ${memoryScore.toFixed(3)}`);
    
    return {
      cpuScore,
      memoryScore,
      benchmarkTime,
      estimatedPerformance: this.estimatePerformanceCategory(cpuScore, memoryScore)
    };
  }
  
  estimatePerformanceCategory(cpuScore, memoryScore) {
    const overallScore = (cpuScore + memoryScore) / 2;
    
    if (overallScore >= 0.8) return 'high';
    if (overallScore >= 0.5) return 'medium';
    return 'low';
  }
  
  setupEventListeners() {
    // Orientation
    if (this.device.touch) {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          this.handleOrientationChange();
        }, 100);
      });
    }
    
    // Connexion réseau
    window.addEventListener('online', () => {
      this.handleConnectionChange(true);
    });
    
    window.addEventListener('offline', () => {
      this.handleConnectionChange(false);
    });
    
    // Visibilité de la page
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
    
    // Redimensionnement (iPad en mode split view)
    window.addEventListener('resize', this.debounce(() => {
      this.handleResize();
    }, 250));
  }
  
  handleOrientationChange() {
    const newOrientation = this.getOrientation();
    
    if (newOrientation !== this.orientation) {
      this.orientation = newOrientation;
      
      console.log('[DeviceManager] Orientation:', newOrientation);
      
      this.eventBus.emit('device:orientation', {
        orientation: newOrientation,
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      });
    }
  }
  
  getOrientation() {
    if (this.device.type === 'MacBook') {
      return 'landscape';
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return width > height ? 'landscape' : 'portrait';
  }
  
  handleConnectionChange(online) {
    console.log('[DeviceManager] Connexion:', online ? 'En ligne' : 'Hors ligne');
    
    this.eventBus.emit('device:connection', {
      online,
      connection: navigator.connection
    });
  }
  
  handleVisibilityChange() {
    const hidden = document.hidden;
    
    console.log('[DeviceManager] Visibilité:', hidden ? 'Cachée' : 'Visible');
    
    this.eventBus.emit('device:visibility', {
      hidden,
      timestamp: Date.now()
    });
  }
  
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Détecter mode split view sur iPad
    if (this.device.type === 'iPad') {
      const isSplitView = width < 1000;
      
      this.eventBus.emit('device:splitview', {
        enabled: isSplitView,
        dimensions: { width, height }
      });
    }
    
    this.eventBus.emit('device:resize', { width, height });
  }
  
  async optimizeForDevice() {
    const deviceType = this.device.type;
    const performance = this.capabilities.estimatedPerformance;
    
    console.log(`[DeviceManager] Optimisation pour ${deviceType} (${performance})`);
    
    // Optimisations spécifiques
    if (deviceType === 'iPhone') {
      // Réduire les animations pour économiser la batterie
      document.documentElement.style.setProperty('--animation-duration', '200ms');
      
      // Activer le feedback haptique
      if (this.capabilities.vibration) {
        this.enableHapticFeedback();
      }
    }
    
    if (deviceType === 'iPad') {
      // Optimiser pour les interactions tactiles
      document.documentElement.style.setProperty('--touch-target-size', '48px');
      
      // Activer les gestures avancées
      this.enableAdvancedGestures();
    }
    
    if (deviceType === 'MacBook') {
      // Optimiser pour la souris/trackpad
      document.documentElement.style.setProperty('--hover-transition', '150ms');
      
      // Activer les raccourcis clavier
      this.enableKeyboardShortcuts();
    }
    
    // Optimisations de performance
    if (performance === 'low') {
      // Réduire les animations
      document.documentElement.style.setProperty('--reduce-motion', '1');
      
      // Limiter la concurrence
      this.capabilities.maxConcurrentOperations = 2;
    }
  }
  
  enableHapticFeedback() {
    this.hapticFeedback = {
      light: () => navigator.vibrate && navigator.vibrate(10),
      medium: () => navigator.vibrate && navigator.vibrate(20),
      heavy: () => navigator.vibrate && navigator.vibrate([10, 10, 20])
    };
    
    console.log('[DeviceManager] Feedback haptique activé');
  }
  
  enableAdvancedGestures() {
    // Gestures pour iPad (implémentation basique)
    this.gestures = {
      swipe: true,
      pinch: true,
      rotation: true,
      longPress: true
    };
    
    console.log('[DeviceManager] Gestures avancées activées');
  }
  
  enableKeyboardShortcuts() {
    this.keyboardShortcuts = new Map([
      ['cmd+k', 'search'],
      ['cmd+n', 'new'],
      ['cmd+s', 'sync'],
      ['escape', 'close']
    ]);
    
    console.log('[DeviceManager] Raccourcis clavier activés');
  }
  
  isStandalone() {
    // iOS Safari
    if (window.navigator.standalone) return true;
    
    // Android Chrome
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    
    // Desktop PWA
    if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return true;
    
    return false;
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // API publique
  getType() {
    return this.device?.type || 'Unknown';
  }
  
  getModel() {
    return this.device?.model || 'Unknown';
  }
  
  getCapabilities() {
    return this.capabilities;
  }
  
  getOrientation() {
    return this.orientation;
  }
  
  isOnline() {
    return navigator.onLine;
  }
  
  getPerformanceCategory() {
    return this.capabilities.estimatedPerformance;
  }
  
  triggerHapticFeedback(intensity = 'light') {
    if (this.hapticFeedback && this.hapticFeedback[intensity]) {
      this.hapticFeedback[intensity]();
    }
  }
  
  getOptimalSettings() {
    const baseline = this.performanceBaselines[this.device.type];
    
    return {
      maxConcurrency: baseline?.maxConcurrency || 3,
      animationDuration: this.device.type === 'iPhone' ? 200 : 300,
      prefetchEnabled: this.device.type !== 'iPhone',
      backgroundSyncInterval: this.device.type === 'MacBook' ? 30000 : 60000
    };
  }
}

export default DeviceManager;