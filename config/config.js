/**
 * Configuration CrimiTrack PWA
 * Adaptez ces paramètres selon votre déploiement
 */

const CONFIG = {
  // Serveur principal (Mac Mini via Tailscale)
  server: {
    // IMPORTANT: Remplacez par votre adresse Tailscale réelle
    tailscale: 'https://mac-mini.tail-scale.ts.net:8081',
    
    // Fallback sur IP locale (quand sur même réseau WiFi)
    local: 'http://192.168.1.100:8081',
    
    // Pour développement local
    localhost: 'http://localhost:8081'
  },
  
  // Mode de connexion par défaut
  connection: {
    // 'auto' : Détection automatique
    // 'tailscale' : Forcer Tailscale
    // 'local' : Forcer réseau local
    // 'offline' : Forcer mode hors ligne
    defaultMode: 'auto',
    
    // Intervalle de vérification (ms)
    checkInterval: 30000,
    
    // Timeout pour les requêtes (ms)
    timeout: 5000
  },
  
  // Configuration PWA
  pwa: {
    // Nom de l'application
    name: 'CrimiTrack Mobile',
    
    // Version
    version: '1.0.0',
    
    // Activer les notifications push
    enableNotifications: true,
    
    // Activer la synchronisation en arrière-plan
    enableBackgroundSync: true
  },
  
  // Stockage local
  storage: {
    // Quotas par appareil (en MB)
    quotas: {
      iPhone: 500,
      iPad: 2048,
      MacBook: 5120,
      default: 1024
    },
    
    // Durée de rétention (jours)
    retention: {
      iPhone: 90,
      iPad: 180,
      MacBook: null, // Illimité
      default: 90
    }
  },
  
  // Modules disponibles par appareil
  modules: {
    iPhone: [
      'dashboard',
      'agenda',
      'expertises',
      'waitlist',
      'statistics',
      'convocations'
    ],
    iPad: [
      'dashboard',
      'agenda',
      'expertises',
      'waitlist',
      'statistics',
      'convocations',
      'mailing',
      'synthese',
      'billing'
    ],
    MacBook: [
      'dashboard',
      'agenda',
      'expertises',
      'waitlist',
      'statistics',
      'convocations',
      'mailing',
      'synthese',
      'billing',
      'import',
      'planning',
      'anonymisation',
      'prompt-mastering'
    ]
  },
  
  // Authentification (optionnel)
  auth: {
    // Activer l'authentification
    enabled: false,
    
    // Type d'authentification
    // 'biometric' : FaceID/TouchID
    // 'pin' : Code PIN
    // 'password' : Mot de passe
    type: 'biometric',
    
    // Durée de session (ms)
    sessionDuration: 24 * 60 * 60 * 1000 // 24h
  },
  
  // API Keys (si nécessaire)
  api: {
    // Clé API La Poste (pour LRAR)
    laposte: '',
    
    // Clé API Chorus
    chorus: ''
  },
  
  // Options de développement
  dev: {
    // Mode debug
    debug: false,
    
    // Logger les requêtes réseau
    logNetworkRequests: false,
    
    // Afficher les métriques de performance
    showPerformanceMetrics: false
  }
};

// Export pour utilisation dans l'app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.APP_CONFIG = CONFIG;
}