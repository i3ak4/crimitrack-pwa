/**
 * Sync Manager Simple - Chargement local uniquement (sans serveur)
 * PWA totalement autonome pour iPad/iPhone
 */

class SyncManagerSimple {
  constructor() {
    this.database = null;
    this.initialized = false;
    this.deviceId = this.getDeviceId();
    
    console.log('[SyncManager] Mode local uniquement - Aucun serveur requis');
  }
  
  async initialize() {
    if (this.initialized) {
      console.log('[SyncManager] Déjà initialisé');
      return;
    }
    
    try {
      // Charger la base de données locale depuis IndexedDB
      await this.loadLocalDatabase();
      
      // Créer les boutons de chargement
      this.createLoadButtons();
      
      // Marquer comme initialisé
      this.initialized = true;
      
      console.log('[SyncManager] Initialisation complète (mode local)');
      
      // Si aucune donnée, proposer le chargement
      if (!this.database || Object.keys(this.database).length === 0) {
        this.showWelcomeMessage();
      }
      
    } catch (error) {
      console.error('[SyncManager] Erreur initialisation:', error);
      // Ne pas bloquer l'app en cas d'erreur
      this.showWelcomeMessage();
    }
  }
  
  getDeviceId() {
    let deviceId = localStorage.getItem('device-id');
    if (!deviceId) {
      deviceId = `${this.getDeviceType()}-${Date.now()}`;
      localStorage.setItem('device-id', deviceId);
    }
    return deviceId;
  }
  
  getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Mac/.test(ua)) return 'MacBook';
    return 'Device';
  }
  
  async loadLocalDatabase() {
    try {
      // Charger depuis IndexedDB si disponible
      if (window.offlineManager) {
        const data = await window.offlineManager.getFullDatabase();
        if (data && Object.keys(data).length > 0) {
          this.database = data;
          console.log('[SyncManager] Base de données locale chargée');
          return data;
        }
      }
      
      // Sinon charger depuis localStorage en fallback
      const localData = localStorage.getItem('crimitrack-database');
      if (localData) {
        this.database = JSON.parse(localData);
        console.log('[SyncManager] Base de données chargée depuis localStorage');
        return this.database;
      }
      
      console.log('[SyncManager] Aucune base de données locale trouvée');
      return null;
      
    } catch (error) {
      console.error('[SyncManager] Erreur chargement local:', error);
      return null;
    }
  }
  
  async loadFromFile() {
    console.log('[SyncManager] Chargement depuis fichier local...');
    
    try {
      let data;
      
      // Méthode 1: File System Access API (Chrome/Edge)
      if ('showOpenFilePicker' in window) {
        data = await this.loadFromFileSystemAPI();
      }
      // Méthode 2: Input file classique (Safari/iOS)
      else {
        data = await this.loadFromInputFile();
      }
      
      if (!data) {
        throw new Error('Aucun fichier sélectionné');
      }
      
      // Valider et nettoyer les données
      const cleanData = this.validateData(data);
      
      // Sauvegarder localement
      await this.saveDatabase(cleanData);
      
      // Notifier le succès
      this.showNotification('Base de données chargée avec succès !', 'success');
      
      // Recharger l'application
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
      return cleanData;
      
    } catch (error) {
      console.error('[SyncManager] Erreur chargement fichier:', error);
      this.showNotification('Erreur: ' + error.message, 'error');
      throw error;
    }
  }
  
  async loadFromFileSystemAPI() {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'Base de données JSON',
        accept: { 'application/json': ['.json'] }
      }],
      multiple: false
    });
    
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  }
  
  async loadFromInputFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';
      
      input.onchange = async (event) => {
        try {
          const file = event.target.files[0];
          if (!file) {
            reject(new Error('Aucun fichier sélectionné'));
            return;
          }
          
          const text = await file.text();
          const data = JSON.parse(text);
          
          document.body.removeChild(input);
          resolve(data);
          
        } catch (error) {
          document.body.removeChild(input);
          reject(error);
        }
      };
      
      input.oncancel = () => {
        document.body.removeChild(input);
        reject(new Error('Sélection annulée'));
      };
      
      document.body.appendChild(input);
      input.click();
    });
  }
  
  async loadDemoData() {
    console.log('[SyncManager] Chargement données de démonstration...');
    
    const demoData = {
      agenda: [
        {
          id: 'demo_1',
          patronyme: 'Catherine CARON',
          date_examen: '2025-02-15',
          lieu_examen: 'CJ',
          type_mission: 'instruction',
          statut: 'programmee',
          tribunal: 'Beauvais',
          magistrat: 'Madame Berille DEGEZ',
          opj_greffier: 'Madame Marine MONIER',
          chefs_accusation: 'viol commis par conjoint',
          date_oce: '2025-02-10',
          limite_oce: '2025-03-15'
        },
        {
          id: 'demo_2',
          patronyme: 'Jean MARTIN',
          date_examen: '2025-02-20',
          lieu_examen: 'CJ',
          type_mission: 'correctionnel',
          statut: 'programmee',
          tribunal: 'Paris',
          magistrat: 'Monsieur Pierre DURAND',
          chefs_accusation: 'coups et blessures',
          date_oce: '2025-02-15'
        },
        {
          id: 'demo_3',
          patronyme: 'Marie DUBOIS',
          date_examen: '2025-02-18',
          lieu_examen: 'CJ',
          type_mission: 'JAP',
          statut: 'programmee',
          tribunal: 'Bobigny',
          magistrat: 'Madame Sophie BERNARD',
          chefs_accusation: 'vol avec violence',
          date_oce: '2025-02-12'
        }
      ],
      waitlist: [
        {
          id: 'wait_1',
          patronyme: 'Philippe ECHARD',
          date_demande: '2025-02-01',
          lieu_examen: 'CJ',
          type_mission: 'correctionnel',
          statut: 'attente',
          tribunal: 'Bobigny',
          magistrat: 'Madame Anne-Sophie LE QUELLEC',
          chefs_accusation: 'ILS',
          priorite: 'normale'
        },
        {
          id: 'wait_2',
          patronyme: 'Sylvie MOREAU',
          date_demande: '2025-02-05',
          lieu_examen: 'CJ',
          type_mission: 'instruction',
          statut: 'attente',
          tribunal: 'Créteil',
          magistrat: 'Monsieur Jean DUPUIS',
          chefs_accusation: 'agression sexuelle',
          priorite: 'urgente'
        }
      ],
      expertises: [],
      statistiques: {
        total_expertises: 2517,
        en_cours: 45,
        terminees: 2472,
        mois_actuel: 23
      },
      metadata: {
        version: '2.0.0',
        lastUpdate: new Date().toISOString(),
        source: 'Données de démonstration',
        device: this.deviceId
      }
    };
    
    // Sauvegarder les données de démo
    await this.saveDatabase(demoData);
    
    // Notifier et recharger
    this.showNotification('Données de démonstration chargées !', 'success');
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
    return demoData;
  }
  
  validateData(data) {
    console.log('[SyncManager] Validation des données...');
    
    const cleanData = {
      agenda: [],
      waitlist: [],
      expertises: [],
      statistiques: {},
      metadata: {}
    };
    
    // Valider et nettoyer agenda
    if (data.agenda && Array.isArray(data.agenda)) {
      cleanData.agenda = data.agenda.map((item, index) => ({
        ...item,
        id: item.id || `agenda_${Date.now()}_${index}`
      }));
    }
    
    // Valider et nettoyer waitlist
    if (data.waitlist && Array.isArray(data.waitlist)) {
      cleanData.waitlist = data.waitlist.map((item, index) => ({
        ...item,
        id: item.id || `waitlist_${Date.now()}_${index}`
      }));
    }
    
    // Valider expertises
    if (data.expertises && Array.isArray(data.expertises)) {
      cleanData.expertises = data.expertises;
    }
    
    // Copier statistiques
    if (data.statistiques) {
      cleanData.statistiques = data.statistiques;
    }
    
    // Mettre à jour metadata
    cleanData.metadata = {
      ...data.metadata,
      lastSync: Date.now(),
      device: this.deviceId,
      version: '2.0.0'
    };
    
    console.log('[SyncManager] Données validées:', {
      agenda: cleanData.agenda.length,
      waitlist: cleanData.waitlist.length,
      expertises: cleanData.expertises.length
    });
    
    return cleanData;
  }
  
  async saveDatabase(data) {
    try {
      // Sauvegarder dans IndexedDB si disponible
      if (window.offlineManager) {
        await window.offlineManager.saveFullDatabase(data);
        console.log('[SyncManager] Sauvegardé dans IndexedDB');
      }
      
      // Sauvegarder aussi dans localStorage en backup
      localStorage.setItem('crimitrack-database', JSON.stringify(data));
      localStorage.setItem('crimitrack-lastsync', Date.now().toString());
      console.log('[SyncManager] Sauvegardé dans localStorage');
      
      // Mettre à jour la référence locale
      this.database = data;
      
      // Déclencher un événement pour notifier l'app
      window.dispatchEvent(new CustomEvent('databaseloaded', {
        detail: { data, timestamp: Date.now() }
      }));
      
      return true;
      
    } catch (error) {
      console.error('[SyncManager] Erreur sauvegarde:', error);
      throw error;
    }
  }
  
  createLoadButtons() {
    try {
      // Ne pas créer si déjà présents
      if (document.getElementById('load-file-button')) return;
      
      // Conteneur pour les boutons
      const container = document.createElement('div');
      container.className = 'sync-buttons-container';
      container.style.cssText = `
        display: flex;
        gap: 10px;
        align-items: center;
      `;
      
      // Bouton charger fichier
      const loadButton = document.createElement('button');
      loadButton.id = 'load-file-button';
      loadButton.className = 'sync-button primary';
      loadButton.innerHTML = `
        📁 Charger Base de Données
      `;
      loadButton.onclick = async () => {
        loadButton.disabled = true;
        try {
          await this.loadFromFile();
        } catch (error) {
          console.error('Erreur chargement:', error);
        } finally {
          loadButton.disabled = false;
        }
      };
      
      // Bouton démo
      const demoButton = document.createElement('button');
      demoButton.id = 'load-demo-button';
      demoButton.className = 'sync-button secondary';
      demoButton.innerHTML = `
        🎭 Données Démo
      `;
      demoButton.onclick = async () => {
        demoButton.disabled = true;
        try {
          await this.loadDemoData();
        } catch (error) {
          console.error('Erreur démo:', error);
        } finally {
          demoButton.disabled = false;
        }
      };
      
      // Indicateur de statut
      const status = document.createElement('div');
      status.id = 'sync-status';
      status.className = 'sync-status';
      status.style.cssText = `
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        background: #f0f0f0;
      `;
      
      // Mettre à jour le statut
      if (this.database) {
        const count = (this.database.agenda?.length || 0) + (this.database.waitlist?.length || 0);
        status.innerHTML = `✅ ${count} entrées`;
      } else {
        status.innerHTML = `📱 Mode local`;
      }
      
      container.appendChild(loadButton);
      container.appendChild(demoButton);
      container.appendChild(status);
      
      // Ajouter dans le header
      const header = document.querySelector('.header-right, .app-header, header');
      if (header) {
        header.insertBefore(container, header.firstChild);
      } else {
        // Fallback: ajouter en haut du body
        document.body.insertBefore(container, document.body.firstChild);
        container.style.cssText += `
          position: fixed;
          top: 10px;
          right: 10px;
          z-index: 1000;
          background: white;
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
      }
      
    } catch (error) {
      console.error('[SyncManager] Erreur création boutons:', error);
    }
  }
  
  showWelcomeMessage() {
    // Afficher un message de bienvenue si aucune donnée
    const message = document.createElement('div');
    message.className = 'welcome-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
      z-index: 1000;
    `;
    message.innerHTML = `
      <h2>🎯 Bienvenue dans CrimiTrack PWA</h2>
      <p>Application autonome de gestion d'expertises médico-légales</p>
      <p style="margin: 20px 0;">Pour commencer, chargez votre base de données ou essayez la démo :</p>
      <button onclick="window.syncManager.loadFromFile()" class="sync-button primary" style="margin: 5px;">
        📁 Charger ma base de données
      </button>
      <button onclick="window.syncManager.loadDemoData()" class="sync-button secondary" style="margin: 5px;">
        🎭 Essayer la démo
      </button>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        💡 L'application fonctionne 100% hors ligne après le chargement initial
      </p>
    `;
    
    document.body.appendChild(message);
    
    // Fermer au clic en dehors
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!message.contains(e.target)) {
          message.remove();
        }
      }, { once: true });
    }, 100);
  }
  
  showNotification(message, type = 'info') {
    // Créer ou réutiliser le conteneur de notifications
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2000;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transform: translateX(400px);
      transition: transform 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      max-width: 350px;
    `;
    notification.textContent = message;
    
    // Fermer au clic
    notification.onclick = () => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => notification.remove(), 300);
    };
    
    container.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-suppression
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => notification.remove(), 300);
    }, type === 'error' ? 5000 : 3000);
  }
  
  // API publique simplifiée
  async getDatabase() {
    if (!this.database) {
      await this.loadLocalDatabase();
    }
    return this.database;
  }
  
  async sync() {
    // Pas de sync serveur - juste charger un fichier
    return this.loadFromFile();
  }
  
  getStatus() {
    return {
      mode: 'local',
      hasData: !!this.database,
      entriesCount: this.database ? 
        (this.database.agenda?.length || 0) + (this.database.waitlist?.length || 0) : 0,
      lastUpdate: localStorage.getItem('crimitrack-lastsync'),
      deviceId: this.deviceId
    };
  }
}

// Exposer globalement
window.SyncManagerSimple = SyncManagerSimple;

// Compatibilité avec l'ancien nom
window.SyncManager = SyncManagerSimple;

// Auto-initialiser si le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.syncManager) {
      window.syncManager = new SyncManagerSimple();
      window.syncManager.initialize().catch(console.error);
    }
  });
} else {
  // DOM déjà chargé
  if (!window.syncManager) {
    window.syncManager = new SyncManagerSimple();
    window.syncManager.initialize().catch(console.error);
  }
}

console.log('[SyncManager] Mode local simple activé - Aucun serveur requis');