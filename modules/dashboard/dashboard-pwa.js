/**
 * 📊 Dashboard PWA Module
 * Agent UI-Fantaisie - Module de tableau de bord
 */

class DashboardPWA {
  constructor(dependencies) {
    this.dataManager = dependencies.dataManager;
    this.syncManager = dependencies.syncManager;
    this.notificationManager = dependencies.notificationManager;
    this.animationEngine = dependencies.animationEngine;
    this.device = dependencies.device;
    
    this.moduleName = 'dashboard';
    this.isInitialized = false;
  }
  
  async initialize() {
    console.log('📊 Dashboard PWA initialisé');
    this.isInitialized = true;
  }
  
  async render(container) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const stats = await this.dataManager.getDashboardStats();
    
    container.innerHTML = `
      <div class="dashboard-pwa-container">
        <!-- Vue d'ensemble -->
        <div class="stats-overview glass-panel">
          <h2 class="section-title">
            <i class="fas fa-chart-pulse"></i>
            Vue d'ensemble
          </h2>
          <div class="stats-grid">
            <div class="stat-card" data-stat="agenda">
              <div class="stat-icon agenda">
                <i class="fas fa-calendar-check"></i>
              </div>
              <div class="stat-content">
                <span class="stat-value" id="dashboard-stat-agenda">${stats.agenda || 0}</span>
                <span class="stat-label">RDV aujourd'hui</span>
              </div>
              <div class="stat-trend positive">
                <i class="fas fa-arrow-up"></i>
                <span>+2</span>
              </div>
            </div>
            
            <div class="stat-card" data-stat="waitlist">
              <div class="stat-icon waitlist">
                <i class="fas fa-clock"></i>
              </div>
              <div class="stat-content">
                <span class="stat-value" id="dashboard-stat-waitlist">${stats.waitlist || 0}</span>
                <span class="stat-label">En attente</span>
              </div>
              <div class="stat-trend negative">
                <i class="fas fa-arrow-down"></i>
                <span>-1</span>
              </div>
            </div>
            
            <div class="stat-card" data-stat="billing">
              <div class="stat-icon billing">
                <i class="fas fa-euro-sign"></i>
              </div>
              <div class="stat-content">
                <span class="stat-value" id="dashboard-stat-billing">${stats.billing || 0}</span>
                <span class="stat-label">Factures</span>
              </div>
              <div class="stat-trend positive">
                <i class="fas fa-arrow-up"></i>
                <span>+12</span>
              </div>
            </div>
            
            <div class="stat-card" data-stat="sync">
              <div class="stat-icon sync">
                <i class="fas fa-cloud-upload-alt"></i>
              </div>
              <div class="stat-content">
                <span class="stat-value" id="dashboard-stat-sync">${stats.syncStatus || '100%'}</span>
                <span class="stat-label">Synchronisé</span>
              </div>
              <div class="stat-trend stable">
                <i class="fas fa-check"></i>
                <span>OK</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Actions rapides -->
        <div class="quick-actions-panel glass-panel">
          <h2 class="section-title">
            <i class="fas fa-bolt"></i>
            Actions rapides
          </h2>
          <div class="actions-grid">
            <button class="action-card" data-action="nouvelle-mission">
              <div class="action-icon">
                <i class="fas fa-plus-circle"></i>
              </div>
              <div class="action-content">
                <span class="action-title">Nouvelle Mission</span>
                <span class="action-desc">Créer une expertise</span>
              </div>
            </button>
            
            <button class="action-card" data-action="charger-db">
              <div class="action-icon">
                <i class="fas fa-upload"></i>
              </div>
              <div class="action-content">
                <span class="action-title">Charger Base</span>
                <span class="action-desc">Importer JSON database</span>
              </div>
            </button>
            
            <button class="action-card" data-action="sauvegarder-db">
              <div class="action-icon">
                <i class="fas fa-download"></i>
              </div>
              <div class="action-content">
                <span class="action-title">Sauvegarder Base</span>
                <span class="action-desc">Exporter JSON database</span>
              </div>
            </button>
            
            <button class="action-card" data-action="send-convocation">
              <div class="action-icon">
                <i class="fas fa-paper-plane"></i>
              </div>
              <div class="action-content">
                <span class="action-title">Publipostage</span>
                <span class="action-desc">Envoyer convocations</span>
              </div>
            </button>
          </div>
        </div>
        
        <!-- Agenda aperçu -->
        <div class="agenda-preview glass-panel">
          <h2 class="section-title">
            <i class="fas fa-calendar-day"></i>
            Agenda aujourd'hui
          </h2>
          <div class="agenda-timeline" id="dashboard-agenda-preview">
            <div class="timeline-loading">
              <div class="loading-skeleton"></div>
              <div class="loading-skeleton"></div>
              <div class="loading-skeleton"></div>
            </div>
          </div>
        </div>
        
        <!-- Activité récente -->
        <div class="recent-activity glass-panel">
          <h2 class="section-title">
            <i class="fas fa-history"></i>
            Activité récente
          </h2>
          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon">
                <i class="fas fa-user-plus"></i>
              </div>
              <div class="activity-content">
                <span class="activity-title">Nouvelle expertise créée</span>
                <span class="activity-desc">DUPONT Jean - Dossier 2025-001</span>
                <span class="activity-time">Il y a 2 heures</span>
              </div>
            </div>
            
            <div class="activity-item">
              <div class="activity-icon">
                <i class="fas fa-sync-alt"></i>
              </div>
              <div class="activity-content">
                <span class="activity-title">Synchronisation terminée</span>
                <span class="activity-desc">Base de données mise à jour</span>
                <span class="activity-time">Il y a 4 heures</span>
              </div>
            </div>
            
            <div class="activity-item">
              <div class="activity-icon">
                <i class="fas fa-paper-plane"></i>
              </div>
              <div class="activity-content">
                <span class="activity-title">Convocation envoyée</span>
                <span class="activity-desc">MARTIN Sophie - Examen 16/08</span>
                <span class="activity-time">Hier à 16:30</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Charger les données de l'agenda
    await this.loadAgendaPreview();
    
    // Animer l'entrée
    this.animationEngine.slideIn(container);
    
    // Ajouter les interactions
    this.setupInteractions(container);
  }
  
  async loadAgendaPreview() {
    const previewContainer = document.getElementById('dashboard-agenda-preview');
    if (!previewContainer) return;
    
    try {
      const agendaData = await this.dataManager.getAgendaPreview();
      
      if (agendaData && agendaData.length > 0) {
        previewContainer.innerHTML = agendaData.map(item => `
          <div class="timeline-item">
            <div class="timeline-time">${item.time}</div>
            <div class="timeline-content">
              <div class="timeline-title">${item.patronyme}</div>
              <div class="timeline-desc">${item.type_mission} - ${item.lieu_examen}</div>
            </div>
          </div>
        `).join('');
      } else {
        previewContainer.innerHTML = `
          <div class="no-agenda">
            <i class="fas fa-calendar-times"></i>
            <p>Aucun rendez-vous aujourd'hui</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Erreur chargement agenda preview:', error);
      previewContainer.innerHTML = `
        <div class="error-agenda">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erreur de chargement</p>
        </div>
      `;
    }
  }
  
  setupInteractions(container) {
    // Interactions déjà gérées par l'application principale
    console.log('📊 Dashboard interactions configurées');
  }
  
  async refresh() {
    console.log('📊 Dashboard rafraîchi');
    const stats = await this.dataManager.getDashboardStats();
    
    // Mettre à jour les statistiques
    const statElements = {
      'dashboard-stat-agenda': stats.agenda || 0,
      'dashboard-stat-waitlist': stats.waitlist || 0,
      'dashboard-stat-billing': stats.billing || 0,
      'dashboard-stat-sync': stats.syncStatus || '100%'
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
        this.animationEngine.animateCounter(element);
      }
    });
    
    // Recharger l'aperçu agenda
    await this.loadAgendaPreview();
  }
  
  destroy() {
    console.log('📊 Dashboard PWA détruit');
  }
}

// Export ES6 et exposition globale pour compatibilité
export default DashboardPWA;
window.DashboardPWA = DashboardPWA;