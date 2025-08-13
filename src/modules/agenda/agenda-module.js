/**
 * CrimiTrack PWA - Module Agenda v2.0
 * Gestion des rendez-vous et examens médico-légaux
 * Interface optimisée multi-devices avec vue calendrier
 */

class AgendaModule {
  constructor(dependencies) {
    this.eventBus = dependencies.eventBus;
    this.stateManager = dependencies.stateManager;
    this.databaseManager = dependencies.databaseManager;
    this.config = dependencies.config;
    
    this.isActive = false;
    this.isInitialized = false;
    this.currentView = 'month'; // month, week, day, list
    this.currentDate = new Date();
    this.selectedDate = null;
    this.agendaItems = [];
    this.filteredItems = [];
    
    // Configuration du module
    this.moduleConfig = {
      views: ['month', 'week', 'day', 'list'],
      defaultView: this.config.layout === 'mobile' ? 'list' : 'month',
      autoRefresh: true,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      maxItemsPerPage: 50
    };
    
    // Filtres disponibles
    this.filters = {
      statut: 'all', // all, programmee, terminee, annulee
      type_mission: 'all', // all, instruction, correctionnel, expertise
      tribunal: 'all',
      periode: 'all' // all, today, week, month, custom
    };
    
    console.log('[AgendaModule] Initialisé');
  }
  
  /**
   * Initialiser le module
   */
  async init() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      console.log('[AgendaModule] Initialisation...');
      
      // Configurer la vue par défaut selon l'appareil
      this.currentView = this.moduleConfig.defaultView;
      
      // Écouter les événements
      this.setupEventListeners();
      
      // Charger les données initiales
      await this.loadAgendaData();
      
      this.isInitialized = true;
      console.log('[AgendaModule] Initialisé avec succès');
      
    } catch (error) {
      console.error('[AgendaModule] Erreur initialisation:', error);
      throw error;
    }
  }
  
  /**
   * Activer le module
   */
  async activate() {
    if (this.isActive) {
      return;
    }
    
    try {
      console.log('[AgendaModule] Activation...');
      
      // Charger les données fraîches
      await this.loadAgendaData();
      
      // Rendre l'interface
      this.render();
      
      // Démarrer le rafraîchissement automatique
      if (this.moduleConfig.autoRefresh) {
        this.startAutoRefresh();
      }
      
      this.isActive = true;
      
      // Émettre l'événement d'activation
      this.eventBus.emit('agenda:activated');
      
    } catch (error) {
      console.error('[AgendaModule] Erreur activation:', error);
    }
  }
  
  /**
   * Désactiver le module
   */
  async deactivate() {
    if (!this.isActive) {
      return;
    }
    
    console.log('[AgendaModule] Désactivation...');
    
    // Arrêter le rafraîchissement automatique
    this.stopAutoRefresh();
    
    // Nettoyer les événements spécifiques
    this.cleanupEventListeners();
    
    this.isActive = false;
    
    this.eventBus.emit('agenda:deactivated');
  }
  
  /**
   * Configurer les événements
   */
  setupEventListeners() {
    // Écouter les mises à jour de données
    this.eventBus.on('database:updated', async () => {
      if (this.isActive) {
        await this.loadAgendaData();
        this.render();
      }
    });
    
    // Écouter les changements d'orientation
    this.eventBus.on('device:orientationchange', (deviceInfo) => {
      if (this.isActive) {
        setTimeout(() => this.handleOrientationChange(deviceInfo), 100);
      }
    });
    
    // Écouter les commandes de navigation
    this.eventBus.on('agenda:navigate', (data) => {
      this.navigateToDate(new Date(data.date));
    });
  }
  
  /**
   * Nettoyer les événements
   */
  cleanupEventListeners() {
    // Ici on pourrait garder une référence aux fonctions pour les supprimer
    // Pour simplifier, on laisse les événements globaux
  }
  
  /**
   * Charger les données d'agenda
   */
  async loadAgendaData() {
    try {
      console.log('[AgendaModule] Chargement des données...');
      
      const data = await this.databaseManager.getAllData();
      
      // Filtrer et formater les données d'agenda
      this.agendaItems = (data.agenda || []).map(item => ({
        ...item,
        date_examen: this.parseDate(item.date_examen),
        isToday: this.isToday(item.date_examen),
        isPassed: this.isPassed(item.date_examen),
        isFuture: this.isFuture(item.date_examen)
      }));
      
      // Trier par date
      this.agendaItems.sort((a, b) => 
        new Date(a.date_examen) - new Date(b.date_examen)
      );
      
      // Appliquer les filtres
      this.applyFilters();
      
      console.log(`[AgendaModule] ${this.agendaItems.length} éléments chargés`);
      
    } catch (error) {
      console.error('[AgendaModule] Erreur chargement données:', error);
      this.agendaItems = [];
      this.filteredItems = [];
    }
  }
  
  /**
   * Appliquer les filtres
   */
  applyFilters() {
    this.filteredItems = this.agendaItems.filter(item => {
      // Filtre par statut
      if (this.filters.statut !== 'all' && item.statut !== this.filters.statut) {
        return false;
      }
      
      // Filtre par type de mission
      if (this.filters.type_mission !== 'all' && item.type_mission !== this.filters.type_mission) {
        return false;
      }
      
      // Filtre par tribunal
      if (this.filters.tribunal !== 'all' && item.tribunal !== this.filters.tribunal) {
        return false;
      }
      
      // Filtre par période
      if (this.filters.periode !== 'all') {
        const itemDate = new Date(item.date_examen);
        const now = new Date();
        
        switch (this.filters.periode) {
          case 'today':
            if (!this.isSameDay(itemDate, now)) return false;
            break;
          case 'week':
            const weekStart = this.getWeekStart(now);
            const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (itemDate < weekStart || itemDate >= weekEnd) return false;
            break;
          case 'month':
            if (itemDate.getMonth() !== now.getMonth() || 
                itemDate.getFullYear() !== now.getFullYear()) return false;
            break;
        }
      }
      
      return true;
    });
    
    console.log(`[AgendaModule] ${this.filteredItems.length} éléments après filtrage`);
  }
  
  /**
   * Rendre l'interface
   */
  render() {
    const container = document.getElementById('module-container');
    if (!container) {
      console.error('[AgendaModule] Container non trouvé');
      return;
    }
    
    container.innerHTML = this.getTemplate();
    
    // Attacher les événements
    this.attachEvents();
    
    // Rendre la vue spécifique
    this.renderCurrentView();
    
    // Mettre à jour les filtres UI
    this.updateFiltersUI();
  }
  
  /**
   * Obtenir le template principal
   */
  getTemplate() {
    const isMobile = this.config.layout === 'mobile';
    
    return `
      <div class="agenda-module">
        <div class="agenda-header">
          <div class="agenda-title">
            <h2>📅 Agenda</h2>
            <div class="agenda-stats">
              <span class="stat-item">
                <strong>${this.filteredItems.length}</strong> 
                ${this.filteredItems.length > 1 ? 'examens' : 'examen'}
              </span>
            </div>
          </div>
          
          <div class="agenda-actions">
            <button class="action-btn" id="add-agenda-btn">
              <svg viewBox="0 0 24 24">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
              <span>Ajouter</span>
            </button>
            
            <button class="action-btn secondary" id="refresh-agenda-btn">
              <svg viewBox="0 0 24 24">
                <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="agenda-toolbar">
          <div class="view-switcher">
            <button class="view-btn ${this.currentView === 'month' ? 'active' : ''}" 
                    data-view="month" ${isMobile ? 'style="display: none;"' : ''}>
              Mois
            </button>
            <button class="view-btn ${this.currentView === 'week' ? 'active' : ''}" 
                    data-view="week" ${isMobile ? 'style="display: none;"' : ''}>
              Semaine
            </button>
            <button class="view-btn ${this.currentView === 'day' ? 'active' : ''}" 
                    data-view="day">
              Jour
            </button>
            <button class="view-btn ${this.currentView === 'list' ? 'active' : ''}" 
                    data-view="list">
              Liste
            </button>
          </div>
          
          <div class="date-navigation">
            <button class="nav-btn" id="prev-period">
              <svg viewBox="0 0 24 24">
                <path d="M15.41,7.41L14,6L8,12L14,18L15.41,16.59L10.83,12L15.41,7.41Z" />
              </svg>
            </button>
            
            <button class="current-period" id="current-period-btn">
              ${this.getCurrentPeriodLabel()}
            </button>
            
            <button class="nav-btn" id="next-period">
              <svg viewBox="0 0 24 24">
                <path d="M10,6L8.59,7.41L13.17,12L8.59,16.59L10,18L16,12L10,6Z" />
              </svg>
            </button>
          </div>
          
          <button class="filter-btn" id="toggle-filters">
            <svg viewBox="0 0 24 24">
              <path d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z" />
            </svg>
          </button>
        </div>
        
        <div class="agenda-filters" id="agenda-filters" style="display: none;">
          <div class="filter-group">
            <label>Statut:</label>
            <select id="filter-statut">
              <option value="all">Tous</option>
              <option value="programmee">Programmée</option>
              <option value="terminee">Terminée</option>
              <option value="annulee">Annulée</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Type:</label>
            <select id="filter-type">
              <option value="all">Tous</option>
              <option value="instruction">Instruction</option>
              <option value="correctionnel">Correctionnel</option>
              <option value="expertise">Expertise</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Période:</label>
            <select id="filter-periode">
              <option value="all">Toutes</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
          </div>
          
          <div class="filter-actions">
            <button class="filter-action-btn" id="clear-filters">Effacer</button>
            <button class="filter-action-btn primary" id="apply-filters">Appliquer</button>
          </div>
        </div>
        
        <div class="agenda-content" id="agenda-content">
          <!-- Le contenu de la vue sera inséré ici -->
        </div>
        
        <div class="agenda-summary">
          <div class="summary-item">
            <span class="summary-label">Aujourd'hui:</span>
            <span class="summary-value">${this.getTodayCount()}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cette semaine:</span>
            <span class="summary-value">${this.getWeekCount()}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Ce mois:</span>
            <span class="summary-value">${this.getMonthCount()}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Attacher les événements
   */
  attachEvents() {
    // Changement de vue
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.changeView(e.target.dataset.view);
      });
    });
    
    // Navigation de période
    document.getElementById('prev-period')?.addEventListener('click', () => {
      this.navigatePeriod(-1);
    });
    
    document.getElementById('next-period')?.addEventListener('click', () => {
      this.navigatePeriod(1);
    });
    
    document.getElementById('current-period-btn')?.addEventListener('click', () => {
      this.goToToday();
    });
    
    // Actions
    document.getElementById('add-agenda-btn')?.addEventListener('click', () => {
      this.createNew();
    });
    
    document.getElementById('refresh-agenda-btn')?.addEventListener('click', () => {
      this.refresh();
    });
    
    // Filtres
    document.getElementById('toggle-filters')?.addEventListener('click', () => {
      this.toggleFilters();
    });
    
    document.getElementById('apply-filters')?.addEventListener('click', () => {
      this.applyFiltersFromUI();
    });
    
    document.getElementById('clear-filters')?.addEventListener('click', () => {
      this.clearFilters();
    });
  }
  
  /**
   * Rendre la vue courante
   */
  renderCurrentView() {
    const content = document.getElementById('agenda-content');
    if (!content) return;
    
    switch (this.currentView) {
      case 'month':
        content.innerHTML = this.renderMonthView();
        break;
      case 'week':
        content.innerHTML = this.renderWeekView();
        break;
      case 'day':
        content.innerHTML = this.renderDayView();
        break;
      case 'list':
        content.innerHTML = this.renderListView();
        break;
      default:
        content.innerHTML = this.renderListView();
    }
    
    // Attacher les événements spécifiques à la vue
    this.attachViewEvents();
  }
  
  /**
   * Rendre la vue liste
   */
  renderListView() {
    if (this.filteredItems.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>Aucun examen</h3>
          <p>Aucun examen ne correspond aux critères sélectionnés.</p>
          <button class="btn-primary" onclick="this.closest('.agenda-module').querySelector('#add-agenda-btn').click()">
            Ajouter un examen
          </button>
        </div>
      `;
    }
    
    const groupedItems = this.groupItemsByDate(this.filteredItems);
    
    return `
      <div class="agenda-list">
        ${Object.entries(groupedItems).map(([date, items]) => `
          <div class="agenda-date-group">
            <div class="date-header">
              <h3>${this.formatDateHeader(date)}</h3>
              <span class="item-count">${items.length} examen${items.length > 1 ? 's' : ''}</span>
            </div>
            <div class="agenda-items">
              ${items.map(item => this.renderAgendaItem(item)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Rendre un élément d'agenda
   */
  renderAgendaItem(item) {
    const statusIcon = this.getStatusIcon(item.statut);
    const timeClass = item.isPassed ? 'passed' : item.isToday ? 'today' : 'future';
    
    return `
      <div class="agenda-item ${timeClass}" data-item-id="${item.id}">
        <div class="item-status">
          <span class="status-icon ${item.statut}">${statusIcon}</span>
        </div>
        
        <div class="item-content">
          <div class="item-header">
            <h4 class="item-title">${this.escapeHtml(item.patronyme)}</h4>
            <div class="item-meta">
              <span class="item-time">${this.formatTime(item.date_examen)}</span>
              <span class="item-location">${this.escapeHtml(item.lieu_examen || 'CJ')}</span>
            </div>
          </div>
          
          <div class="item-details">
            <div class="detail-row">
              <span class="detail-label">Tribunal:</span>
              <span class="detail-value">${this.escapeHtml(item.tribunal || '')}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value">${this.escapeHtml(item.type_mission || '')}</span>
            </div>
            
            ${item.magistrat ? `
              <div class="detail-row">
                <span class="detail-label">Magistrat:</span>
                <span class="detail-value">${this.escapeHtml(item.magistrat)}</span>
              </div>
            ` : ''}
            
            ${item.chefs_accusation ? `
              <div class="detail-row">
                <span class="detail-label">Chefs:</span>
                <span class="detail-value">${this.escapeHtml(item.chefs_accusation)}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="item-actions">
          <button class="action-btn small" onclick="agendaModule.editItem('${item.id}')">
            <svg viewBox="0 0 24 24">
              <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
            </svg>
          </button>
          
          <button class="action-btn small danger" onclick="agendaModule.deleteItem('${item.id}')">
            <svg viewBox="0 0 24 24">
              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Rendre la vue mois (simplifiée)
   */
  renderMonthView() {
    return `
      <div class="month-view">
        <div class="calendar-grid">
          ${this.renderCalendarGrid()}
        </div>
      </div>
    `;
  }
  
  /**
   * Rendre la grille du calendrier
   */
  renderCalendarGrid() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const weeks = [];
    let currentDate = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const days = [];
      
      for (let day = 0; day < 7; day++) {
        const dayItems = this.getItemsForDate(currentDate);
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = this.isSameDay(currentDate, new Date());
        
        days.push(`
          <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}"
               data-date="${currentDate.toISOString().split('T')[0]}">
            <div class="day-number">${currentDate.getDate()}</div>
            <div class="day-items">
              ${dayItems.slice(0, 3).map(item => `
                <div class="day-item ${item.statut}" title="${this.escapeHtml(item.patronyme)}">
                  ${this.truncateText(item.patronyme, 15)}
                </div>
              `).join('')}
              ${dayItems.length > 3 ? `<div class="more-items">+${dayItems.length - 3}</div>` : ''}
            </div>
          </div>
        `);
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push(`<div class="calendar-week">${days.join('')}</div>`);
    }
    
    return `
      <div class="calendar-header">
        <div class="day-name">Dim</div>
        <div class="day-name">Lun</div>
        <div class="day-name">Mar</div>
        <div class="day-name">Mer</div>
        <div class="day-name">Jeu</div>
        <div class="day-name">Ven</div>
        <div class="day-name">Sam</div>
      </div>
      ${weeks.join('')}
    `;
  }
  
  /**
   * Attacher les événements spécifiques aux vues
   */
  attachViewEvents() {
    // Événements pour les éléments d'agenda
    document.querySelectorAll('.agenda-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.item-actions')) {
          const itemId = item.dataset.itemId;
          this.viewItemDetails(itemId);
        }
      });
    });
    
    // Événements pour les jours du calendrier
    document.querySelectorAll('.calendar-day').forEach(day => {
      day.addEventListener('click', (e) => {
        const date = e.currentTarget.dataset.date;
        this.selectDate(new Date(date));
      });
    });
  }
  
  /**
   * Changer de vue
   */
  changeView(view) {
    if (this.moduleConfig.views.includes(view)) {
      this.currentView = view;
      this.renderCurrentView();
      
      // Mettre à jour les boutons de vue
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
      });
      
      this.eventBus.emit('agenda:viewchanged', { view });
    }
  }
  
  /**
   * Naviguer dans les périodes
   */
  navigatePeriod(direction) {
    const newDate = new Date(this.currentDate);
    
    switch (this.currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction * 7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        break;
    }
    
    this.currentDate = newDate;
    this.updatePeriodLabel();
    this.renderCurrentView();
  }
  
  /**
   * Aller à aujourd'hui
   */
  goToToday() {
    this.currentDate = new Date();
    this.updatePeriodLabel();
    this.renderCurrentView();
  }
  
  /**
   * Mettre à jour le label de période
   */
  updatePeriodLabel() {
    const btn = document.getElementById('current-period-btn');
    if (btn) {
      btn.textContent = this.getCurrentPeriodLabel();
    }
  }
  
  /**
   * Obtenir le label de la période courante
   */
  getCurrentPeriodLabel() {
    const options = { year: 'numeric', month: 'long' };
    
    switch (this.currentView) {
      case 'month':
        return this.currentDate.toLocaleDateString('fr-FR', options);
      case 'week':
        const weekStart = this.getWeekStart(this.currentDate);
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        return `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('fr-FR', { month: 'long' })}`;
      case 'day':
        return this.currentDate.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      default:
        return 'Agenda';
    }
  }
  
  /**
   * Basculer l'affichage des filtres
   */
  toggleFilters() {
    const filters = document.getElementById('agenda-filters');
    if (filters) {
      const isVisible = filters.style.display !== 'none';
      filters.style.display = isVisible ? 'none' : 'block';
    }
  }
  
  /**
   * Appliquer les filtres depuis l'UI
   */
  applyFiltersFromUI() {
    this.filters.statut = document.getElementById('filter-statut')?.value || 'all';
    this.filters.type_mission = document.getElementById('filter-type')?.value || 'all';
    this.filters.periode = document.getElementById('filter-periode')?.value || 'all';
    
    this.applyFilters();
    this.renderCurrentView();
    this.toggleFilters();
    
    this.eventBus.emit('agenda:filterschanged', this.filters);
  }
  
  /**
   * Effacer les filtres
   */
  clearFilters() {
    this.filters = {
      statut: 'all',
      type_mission: 'all',
      tribunal: 'all',
      periode: 'all'
    };
    
    this.updateFiltersUI();
    this.applyFilters();
    this.renderCurrentView();
  }
  
  /**
   * Mettre à jour l'UI des filtres
   */
  updateFiltersUI() {
    const elements = {
      'filter-statut': this.filters.statut,
      'filter-type': this.filters.type_mission,
      'filter-periode': this.filters.periode
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.value = value;
      }
    });
  }
  
  /**
   * Rafraîchir les données
   */
  async refresh() {
    console.log('[AgendaModule] Rafraîchissement...');
    
    const refreshBtn = document.getElementById('refresh-agenda-btn');
    if (refreshBtn) {
      refreshBtn.classList.add('spinning');
    }
    
    try {
      await this.loadAgendaData();
      this.renderCurrentView();
      
      this.eventBus.emit('agenda:refreshed');
      
    } catch (error) {
      console.error('[AgendaModule] Erreur rafraîchissement:', error);
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove('spinning');
      }
    }
  }
  
  /**
   * Créer un nouvel élément
   */
  createNew() {
    console.log('[AgendaModule] Création nouvel examen...');
    
    // Pour l'instant, émettre un événement pour que l'application gère
    this.eventBus.emit('agenda:create', {
      date: this.selectedDate || new Date().toISOString().split('T')[0]
    });
  }
  
  /**
   * Éditer un élément
   */
  editItem(itemId) {
    console.log('[AgendaModule] Édition élément:', itemId);
    
    const item = this.agendaItems.find(i => i.id === itemId);
    if (item) {
      this.eventBus.emit('agenda:edit', { item });
    }
  }
  
  /**
   * Supprimer un élément
   */
  deleteItem(itemId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet examen ?')) {
      console.log('[AgendaModule] Suppression élément:', itemId);
      
      this.eventBus.emit('agenda:delete', { itemId });
    }
  }
  
  /**
   * Voir les détails d'un élément
   */
  viewItemDetails(itemId) {
    const item = this.agendaItems.find(i => i.id === itemId);
    if (item) {
      this.eventBus.emit('agenda:view', { item });
    }
  }
  
  /**
   * Démarrer le rafraîchissement automatique
   */
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(async () => {
      if (this.isActive && !document.hidden) {
        await this.loadAgendaData();
        if (this.hasDataChanged()) {
          this.renderCurrentView();
        }
      }
    }, this.moduleConfig.refreshInterval);
  }
  
  /**
   * Arrêter le rafraîchissement automatique
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  /**
   * Vérifier si les données ont changé
   */
  hasDataChanged() {
    // Simple vérification basée sur le nombre d'éléments
    // Une approche plus sophistiquée utiliserait des checksums
    return true; // Pour simplifier, on retourne toujours true
  }
  
  /**
   * Gérer le changement d'orientation
   */
  handleOrientationChange(deviceInfo) {
    // Ajuster la vue selon l'orientation
    if (deviceInfo.type === 'iPad') {
      if (Math.abs(deviceInfo.orientation) === 90) {
        // Paysage - peut afficher plus d'informations
        if (this.currentView === 'list') {
          this.renderCurrentView();
        }
      }
    }
  }
  
  // === MÉTHODES UTILITAIRES ===
  
  parseDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
  }
  
  isToday(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return this.isSameDay(date, today);
  }
  
  isPassed(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
  
  isFuture(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  }
  
  isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
  
  getWeekStart(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  
  formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  formatDateHeader(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    
    if (this.isSameDay(date, today)) {
      return 'Aujourd\'hui';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (this.isSameDay(date, tomorrow)) {
      return 'Demain';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (this.isSameDay(date, yesterday)) {
      return 'Hier';
    }
    
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }
  
  getStatusIcon(status) {
    switch (status) {
      case 'programmee': return '📅';
      case 'terminee': return '✅';
      case 'annulee': return '❌';
      default: return '❓';
    }
  }
  
  groupItemsByDate(items) {
    return items.reduce((groups, item) => {
      const date = item.date_examen.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {});
  }
  
  getItemsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return this.filteredItems.filter(item => {
      const itemDate = new Date(item.date_examen).toISOString().split('T')[0];
      return itemDate === dateStr;
    });
  }
  
  getTodayCount() {
    const today = new Date().toISOString().split('T')[0];
    return this.agendaItems.filter(item => 
      item.date_examen.split('T')[0] === today
    ).length;
  }
  
  getWeekCount() {
    const weekStart = this.getWeekStart(new Date());
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return this.agendaItems.filter(item => {
      const itemDate = new Date(item.date_examen);
      return itemDate >= weekStart && itemDate < weekEnd;
    }).length;
  }
  
  getMonthCount() {
    const now = new Date();
    return this.agendaItems.filter(item => {
      const itemDate = new Date(item.date_examen);
      return itemDate.getMonth() === now.getMonth() && 
             itemDate.getFullYear() === now.getFullYear();
    }).length;
  }
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  selectDate(date) {
    this.selectedDate = date;
    // Optionnel: changer de vue vers le jour sélectionné
    this.currentDate = new Date(date);
    if (this.currentView === 'day') {
      this.renderCurrentView();
    }
  }
  
  navigateToDate(date) {
    this.currentDate = new Date(date);
    this.renderCurrentView();
    this.updatePeriodLabel();
  }
}

// Export global
window.AgendaModule = AgendaModule;

// Instance globale pour les événements inline
window.agendaModule = null;