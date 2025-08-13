/**
 * 📅 Agenda PWA Module
 * Agent UI-Fantaisie - Module de gestion d'agenda
 */

export default class AgendaPWA {
  constructor(dependencies) {
    this.dataManager = dependencies.dataManager;
    this.syncManager = dependencies.syncManager;
    this.notificationManager = dependencies.notificationManager;
    this.animationEngine = dependencies.animationEngine;
    this.device = dependencies.device;
    
    this.moduleName = 'agenda';
    this.isInitialized = false;
    this.currentDate = new Date();
  }
  
  async initialize() {
    console.log('📅 Agenda PWA initialisé');
    this.isInitialized = true;
  }
  
  async render(container) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    container.innerHTML = `
      <div class="agenda-pwa-container">
        <!-- Header avec navigation de date -->
        <div class="agenda-header glass-panel">
          <div class="date-navigation">
            <button class="date-nav-btn" id="agenda-prev-day">
              <i class="fas fa-chevron-left"></i>
            </button>
            <div class="current-date">
              <h2 id="agenda-current-date">${this.formatDate(this.currentDate)}</h2>
              <span id="agenda-current-day">${this.formatDay(this.currentDate)}</span>
            </div>
            <button class="date-nav-btn" id="agenda-next-day">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
          
          <div class="agenda-actions">
            <button class="agenda-action-btn primary" id="agenda-add-rdv">
              <i class="fas fa-plus"></i>
              Nouveau RDV
            </button>
            <button class="agenda-action-btn secondary" id="agenda-today">
              <i class="fas fa-calendar-day"></i>
              Aujourd'hui
            </button>
          </div>
        </div>
        
        <!-- Vue calendrier -->
        <div class="agenda-content">
          <div class="agenda-timeline glass-panel">
            <div class="timeline-header">
              <h3>
                <i class="fas fa-clock"></i>
                Planning de la journée
              </h3>
              <div class="timeline-stats">
                <span class="stat-item">
                  <i class="fas fa-calendar-check"></i>
                  <span id="agenda-count-total">0</span> RDV
                </span>
                <span class="stat-item">
                  <i class="fas fa-clock"></i>
                  <span id="agenda-count-pending">0</span> en attente
                </span>
              </div>
            </div>
            
            <div class="timeline-content" id="agenda-timeline-content">
              <div class="timeline-loading">
                <div class="loading-skeleton"></div>
                <div class="loading-skeleton"></div>
                <div class="loading-skeleton"></div>
              </div>
            </div>
          </div>
          
          <!-- Liste des expertises -->
          <div class="agenda-list glass-panel">
            <div class="list-header">
              <h3>
                <i class="fas fa-list"></i>
                Expertises programmées
              </h3>
              <div class="list-filters">
                <select id="agenda-filter-type" class="filter-select">
                  <option value="all">Tous types</option>
                  <option value="flagrance">Flagrance</option>
                  <option value="instruction">Instruction</option>
                  <option value="correctionnel">Correctionnel</option>
                  <option value="expertise">Expertise</option>
                </select>
              </div>
            </div>
            
            <div class="expertise-list" id="agenda-expertise-list">
              <!-- Contenu chargé dynamiquement -->
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Charger les données
    await this.loadAgendaData();
    
    // Configurer les interactions
    this.setupInteractions(container);
    
    // Animer l'entrée
    this.animationEngine.slideIn(container);
  }
  
  async loadAgendaData() {
    try {
      const agendaData = await this.dataManager.getAgendaForDate(this.currentDate);
      this.renderTimeline(agendaData);
      this.renderExpertiseList(agendaData);
      this.updateStats(agendaData);
    } catch (error) {
      console.error('Erreur chargement agenda:', error);
      this.showError('Erreur de chargement des données');
    }
  }
  
  renderTimeline(agendaData) {
    const timelineContainer = document.getElementById('agenda-timeline-content');
    if (!timelineContainer) return;
    
    if (!agendaData || agendaData.length === 0) {
      timelineContainer.innerHTML = `
        <div class="no-appointments">
          <i class="fas fa-calendar-times"></i>
          <h4>Aucun rendez-vous</h4>
          <p>Profitez de cette journée libre !</p>
        </div>
      `;
      return;
    }
    
    // Trier par heure
    const sortedData = agendaData.sort((a, b) => {
      const timeA = a.heure_examen || '09:00';
      const timeB = b.heure_examen || '09:00';
      return timeA.localeCompare(timeB);
    });
    
    timelineContainer.innerHTML = sortedData.map(item => `
      <div class="timeline-item ${item.statut}" data-id="${item.id}">
        <div class="timeline-time">
          ${item.heure_examen || '09:00'}
        </div>
        <div class="timeline-content">
          <div class="timeline-main">
            <div class="timeline-title">${item.patronyme}</div>
            <div class="timeline-subtitle">${item.numero_dossier}</div>
          </div>
          <div class="timeline-details">
            <span class="timeline-type ${item.type_mission}">${item.type_mission}</span>
            <span class="timeline-location">${item.lieu_examen}</span>
          </div>
          <div class="timeline-status">
            <span class="status-badge ${item.statut}">${this.getStatusLabel(item.statut)}</span>
          </div>
        </div>
        <div class="timeline-actions">
          <button class="timeline-action" title="Modifier" data-action="edit" data-id="${item.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="timeline-action" title="Convocation" data-action="convocation" data-id="${item.id}">
            <i class="fas fa-paper-plane"></i>
          </button>
          <button class="timeline-action" title="Terminer" data-action="complete" data-id="${item.id}">
            <i class="fas fa-check"></i>
          </button>
        </div>
      </div>
    `).join('');
  }
  
  renderExpertiseList(agendaData) {
    const listContainer = document.getElementById('agenda-expertise-list');
    if (!listContainer) return;
    
    if (!agendaData || agendaData.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-list">
          <i class="fas fa-clipboard-list"></i>
          <p>Aucune expertise programmée</p>
        </div>
      `;
      return;
    }
    
    listContainer.innerHTML = agendaData.map(item => `
      <div class="expertise-card ${item.statut}" data-id="${item.id}">
        <div class="expertise-header">
          <div class="expertise-info">
            <h4>${item.patronyme}</h4>
            <span class="expertise-dossier">${item.numero_dossier}</span>
          </div>
          <div class="expertise-status">
            <span class="status-badge ${item.statut}">${this.getStatusLabel(item.statut)}</span>
          </div>
        </div>
        
        <div class="expertise-details">
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${this.formatDateFr(item.date_examen)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Lieu:</span>
            <span class="detail-value">${item.lieu_examen}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Type:</span>
            <span class="detail-value">${item.type_mission}</span>
          </div>
          ${item.magistrat ? `
          <div class="detail-row">
            <span class="detail-label">Magistrat:</span>
            <span class="detail-value">${item.magistrat}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="expertise-actions">
          <button class="expertise-btn primary" data-action="view" data-id="${item.id}">
            <i class="fas fa-eye"></i>
            Voir
          </button>
          <button class="expertise-btn secondary" data-action="edit" data-id="${item.id}">
            <i class="fas fa-edit"></i>
            Modifier
          </button>
          <button class="expertise-btn secondary" data-action="convocation" data-id="${item.id}">
            <i class="fas fa-paper-plane"></i>
            Convoquer
          </button>
        </div>
      </div>
    `).join('');
  }
  
  updateStats(agendaData) {
    const total = agendaData ? agendaData.length : 0;
    const pending = agendaData ? agendaData.filter(item => item.statut === 'programmee').length : 0;
    
    const totalElement = document.getElementById('agenda-count-total');
    const pendingElement = document.getElementById('agenda-count-pending');
    
    if (totalElement) totalElement.textContent = total;
    if (pendingElement) pendingElement.textContent = pending;
  }
  
  setupInteractions(container) {
    // Navigation de date
    const prevBtn = container.querySelector('#agenda-prev-day');
    const nextBtn = container.querySelector('#agenda-next-day');
    const todayBtn = container.querySelector('#agenda-today');
    const addBtn = container.querySelector('#agenda-add-rdv');
    const filterSelect = container.querySelector('#agenda-filter-type');
    
    prevBtn?.addEventListener('click', () => this.navigateDate(-1));
    nextBtn?.addEventListener('click', () => this.navigateDate(1));
    todayBtn?.addEventListener('click', () => this.goToToday());
    addBtn?.addEventListener('click', () => this.showAddRdvModal());
    filterSelect?.addEventListener('change', (e) => this.filterByType(e.target.value));
    
    // Actions sur les items
    container.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        const actionType = action.getAttribute('data-action');
        const itemId = action.getAttribute('data-id');
        this.handleItemAction(actionType, itemId);
      }
    });
  }
  
  async navigateDate(direction) {
    this.currentDate.setDate(this.currentDate.getDate() + direction);
    this.updateDateDisplay();
    await this.loadAgendaData();
  }
  
  async goToToday() {
    this.currentDate = new Date();
    this.updateDateDisplay();
    await this.loadAgendaData();
  }
  
  updateDateDisplay() {
    const dateElement = document.getElementById('agenda-current-date');
    const dayElement = document.getElementById('agenda-current-day');
    
    if (dateElement) dateElement.textContent = this.formatDate(this.currentDate);
    if (dayElement) dayElement.textContent = this.formatDay(this.currentDate);
  }
  
  showAddRdvModal() {
    // Déléguer à l'application principale
    if (window.crimiTrackApp) {
      window.crimiTrackApp.showNouvelleExpertiseModal();
    }
  }
  
  handleItemAction(action, itemId) {
    switch (action) {
      case 'edit':
        this.editExpertise(itemId);
        break;
      case 'view':
        this.viewExpertise(itemId);
        break;
      case 'convocation':
        this.sendConvocation(itemId);
        break;
      case 'complete':
        this.completeExpertise(itemId);
        break;
    }
  }
  
  editExpertise(itemId) {
    console.log('Éditer expertise:', itemId);
    // TODO: Implémenter l'édition
  }
  
  viewExpertise(itemId) {
    console.log('Voir expertise:', itemId);
    // TODO: Implémenter la vue détaillée
  }
  
  sendConvocation(itemId) {
    console.log('Envoyer convocation:', itemId);
    // Rediriger vers le module mailing
    if (window.crimiTrackApp) {
      window.crimiTrackApp.showModule('mailing');
    }
  }
  
  completeExpertise(itemId) {
    console.log('Terminer expertise:', itemId);
    // TODO: Marquer comme terminée
  }
  
  filterByType(type) {
    console.log('Filtrer par type:', type);
    // TODO: Implémenter le filtrage
  }
  
  showError(message) {
    if (this.notificationManager) {
      this.notificationManager.showToast(message, 'error');
    }
  }
  
  // Utilitaires de formatage
  formatDate(date) {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  formatDay(date) {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Demain";
    if (diffDays === -1) return "Hier";
    if (diffDays > 0) return `Dans ${diffDays} jours`;
    return `Il y a ${Math.abs(diffDays)} jours`;
  }
  
  formatDateFr(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }
  
  getStatusLabel(status) {
    const labels = {
      'programmee': 'Programmée',
      'en_cours': 'En cours',
      'terminee': 'Terminée',
      'annulee': 'Annulée',
      'reportee': 'Reportée'
    };
    return labels[status] || status;
  }
  
  async refresh() {
    console.log('📅 Agenda rafraîchi');
    await this.loadAgendaData();
  }
  
  destroy() {
    console.log('📅 Agenda PWA détruit');
  }
}