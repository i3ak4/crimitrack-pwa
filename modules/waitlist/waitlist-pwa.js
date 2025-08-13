/**
 * ⏰ Waitlist PWA Module
 * Agent UI-Fantaisie - Module de liste d'attente
 */

class WaitlistPWA {
  constructor(dependencies) {
    this.dataManager = dependencies.dataManager;
    this.syncManager = dependencies.syncManager;
    this.notificationManager = dependencies.notificationManager;
    this.animationEngine = dependencies.animationEngine;
    this.device = dependencies.device;
    
    this.moduleName = 'waitlist';
    this.isInitialized = false;
    this.currentFilter = 'all';
    this.searchQuery = '';
  }
  
  async initialize() {
    console.log('⏰ Waitlist PWA initialisé');
    this.isInitialized = true;
  }
  
  async render(container) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    container.innerHTML = `
      <div class="waitlist-pwa-container">
        <!-- Header avec filtres et actions -->
        <div class="waitlist-header glass-panel">
          <div class="header-title">
            <h2>
              <i class="fas fa-clock"></i>
              Liste d'attente
            </h2>
            <div class="waitlist-stats">
              <span class="stat-badge" id="waitlist-total">0</span>
              <span class="stat-label">missions en attente</span>
            </div>
          </div>
          
          <div class="header-controls">
            <div class="search-filter">
              <input type="text" 
                     id="waitlist-search" 
                     class="search-input"
                     placeholder="Rechercher patronyme, magistrat...">
              <select id="waitlist-filter" class="filter-select">
                <option value="all">Tous les lieux</option>
                <option value="CJ">CJ</option>
                <option value="GAV">GAV</option>
                <option value="Prisons">Prisons</option>
                <option value="Victimes">Victimes</option>
              </select>
            </div>
            
            <div class="header-actions">
              <button class="action-btn secondary" id="waitlist-export">
                <i class="fas fa-file-excel"></i>
                Export Excel
              </button>
              <button class="action-btn primary" id="waitlist-program">
                <i class="fas fa-calendar-plus"></i>
                Programmer sélection
              </button>
            </div>
          </div>
        </div>
        
        <!-- Sections par type d'établissement -->
        <div class="waitlist-sections" id="waitlist-sections">
          <!-- Sera chargé dynamiquement -->
        </div>
      </div>
    `;
    
    // Charger les données
    await this.loadWaitlistData();
    
    // Configurer les interactions
    this.setupInteractions(container);
    
    // Animer l'entrée
    this.animationEngine.slideIn(container);
  }
  
  async loadWaitlistData() {
    try {
      const waitlistData = await this.dataManager.getWaitlistData();
      this.renderSections(waitlistData);
      this.updateStats(waitlistData);
    } catch (error) {
      console.error('Erreur chargement waitlist:', error);
      this.showError('Erreur de chargement des données');
    }
  }
  
  renderSections(waitlistData) {
    const sectionsContainer = document.getElementById('waitlist-sections');
    if (!sectionsContainer) return;
    
    // Grouper par type d'établissement
    const sections = this.groupByEstablishment(waitlistData);
    
    sectionsContainer.innerHTML = Object.entries(sections).map(([type, items]) => `
      <div class="waitlist-section glass-panel" data-section="${type}">
        <div class="section-header" data-section-toggle="${type}">
          <div class="section-info">
            <h3>
              <i class="fas ${this.getSectionIcon(type)}"></i>
              ${type}
            </h3>
            <span class="section-count">${items.length} mission${items.length > 1 ? 's' : ''}</span>
          </div>
          <div class="section-controls">
            <button class="section-action" data-action="select-all" data-section="${type}">
              <i class="fas fa-check-square"></i>
              Tout sélectionner
            </button>
            <button class="section-toggle-btn">
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>
        </div>
        
        <div class="section-content ${items.length > 5 ? 'collapsed' : ''}">
          <div class="expertise-grid">
            ${items.map(item => this.renderExpertiseCard(item)).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }
  
  groupByEstablishment(data) {
    const sections = {
      'CJ': [],
      'GAV': [],
      'Prisons': [],
      'Victimes': [],
      'Autres': []
    };
    
    data.forEach(item => {
      const lieu = item.lieu_examen || '';
      if (lieu.includes('CJ') || lieu.includes('Tribunal')) {
        sections.CJ.push(item);
      } else if (lieu.includes('GAV') || lieu.includes('Commissariat')) {
        sections.GAV.push(item);
      } else if (lieu.includes('Prison') || lieu.includes('Maison') || lieu.includes('Centre')) {
        sections.Prisons.push(item);
      } else if (lieu.includes('Victime') || lieu.includes('UMJ')) {
        sections.Victimes.push(item);
      } else {
        sections.Autres.push(item);
      }
    });
    
    // Supprimer les sections vides
    Object.keys(sections).forEach(key => {
      if (sections[key].length === 0) {
        delete sections[key];
      }
    });
    
    return sections;
  }
  
  renderExpertiseCard(item) {
    const urgence = this.calculateUrgency(item);
    const priorite = this.getPriority(item);
    
    return `
      <div class="expertise-card ${urgence.class} ${priorite.class}" 
           data-id="${item._uniqueId || item.id}"
           data-lieu="${item.lieu_examen}">
        <div class="card-header">
          <div class="card-selection">
            <input type="checkbox" 
                   class="expertise-checkbox" 
                   data-id="${item._uniqueId || item.id}">
          </div>
          <div class="card-status">
            <span class="urgence-badge ${urgence.class}">
              ${urgence.label}
            </span>
            ${priorite.show ? `<span class="priority-badge ${priorite.class}">${priorite.label}</span>` : ''}
          </div>
        </div>
        
        <div class="card-main">
          <div class="card-identity">
            <h4 class="patronyme">${item.patronyme}</h4>
            <div class="card-details">
              <span class="age">${this.calculateAge(item.date_naissance)} ans</span>
              <span class="tribunal">${item.tribunal}</span>
            </div>
          </div>
          
          <div class="card-judicial">
            <div class="detail-row">
              <span class="detail-label">Dossier:</span>
              <span class="detail-value">${item.numero_parquet || item.numero_instruction || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Magistrat:</span>
              <span class="detail-value">${item.magistrat}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Lieu:</span>
              <span class="detail-value">${item.lieu_examen}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Chefs:</span>
              <span class="detail-value chefs">${item.chefs_accusation}</span>
            </div>
          </div>
        </div>
        
        <div class="card-actions">
          <button class="card-btn primary" 
                  data-action="program" 
                  data-id="${item._uniqueId || item.id}">
            <i class="fas fa-calendar-plus"></i>
            Programmer
          </button>
          <button class="card-btn secondary" 
                  data-action="convocation" 
                  data-id="${item._uniqueId || item.id}">
            <i class="fas fa-paper-plane"></i>
            Convoquer
          </button>
          <button class="card-btn secondary" 
                  data-action="edit" 
                  data-id="${item._uniqueId || item.id}">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </div>
    `;
  }
  
  calculateUrgency(item) {
    // Calculer l'urgence basée sur la date de création ou d'autres critères
    const dateCreation = new Date(item.date_creation || Date.now());
    const now = new Date();
    const diffDays = Math.floor((now - dateCreation) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      return { class: 'urgence-high', label: 'URGENT' };
    } else if (diffDays > 14) {
      return { class: 'urgence-medium', label: 'À programmer' };
    } else {
      return { class: 'urgence-low', label: 'Récent' };
    }
  }
  
  getPriority(item) {
    // Priorité basée sur le type de mission
    if (item.chefs_accusation?.toLowerCase().includes('viol') || 
        item.chefs_accusation?.toLowerCase().includes('agression sexuelle')) {
      return { class: 'priority-high', label: 'PRIORITÉ', show: true };
    }
    
    if (item.lieu_examen?.includes('Mineur') || item.lieu_examen?.includes('JAF')) {
      return { class: 'priority-medium', label: 'Mineur', show: true };
    }
    
    return { class: '', label: '', show: false };
  }
  
  updateStats(data) {
    const totalElement = document.getElementById('waitlist-total');
    if (totalElement) {
      totalElement.textContent = data.length;
      this.animationEngine.animateCounter(totalElement);
    }
  }
  
  setupInteractions(container) {
    const searchInput = container.querySelector('#waitlist-search');
    const filterSelect = container.querySelector('#waitlist-filter');
    const exportBtn = container.querySelector('#waitlist-export');
    const programBtn = container.querySelector('#waitlist-program');
    
    // Recherche
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.filterResults();
    });
    
    // Filtrage
    filterSelect?.addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.filterResults();
    });
    
    // Actions
    exportBtn?.addEventListener('click', () => this.exportToExcel());
    programBtn?.addEventListener('click', () => this.programSelected());
    
    // Interactions sections
    container.addEventListener('click', (e) => {
      // Toggle section
      if (e.target.closest('[data-section-toggle]')) {
        const section = e.target.closest('[data-section-toggle]').getAttribute('data-section-toggle');
        this.toggleSection(section);
      }
      
      // Actions sur les cartes
      const action = e.target.closest('[data-action]');
      if (action) {
        const actionType = action.getAttribute('data-action');
        const itemId = action.getAttribute('data-id');
        const sectionType = action.getAttribute('data-section');
        this.handleCardAction(actionType, itemId, sectionType);
      }
    });
  }
  
  filterResults() {
    const cards = document.querySelectorAll('.expertise-card');
    
    cards.forEach(card => {
      const lieu = card.getAttribute('data-lieu');
      const text = card.textContent.toLowerCase();
      
      // Filtrage par lieu
      const matchesFilter = this.currentFilter === 'all' || 
                           lieu.toLowerCase().includes(this.currentFilter.toLowerCase());
      
      // Filtrage par recherche
      const matchesSearch = this.searchQuery === '' || 
                           text.includes(this.searchQuery.toLowerCase());
      
      card.style.display = (matchesFilter && matchesSearch) ? 'block' : 'none';
    });
  }
  
  toggleSection(sectionType) {
    const section = document.querySelector(`[data-section="${sectionType}"] .section-content`);
    const toggleBtn = document.querySelector(`[data-section-toggle="${sectionType}"] .section-toggle-btn i`);
    
    if (section && toggleBtn) {
      section.classList.toggle('collapsed');
      toggleBtn.classList.toggle('fa-chevron-down');
      toggleBtn.classList.toggle('fa-chevron-up');
    }
  }
  
  handleCardAction(action, itemId, sectionType) {
    switch (action) {
      case 'program':
        this.programExpertise(itemId);
        break;
      case 'convocation':
        this.sendConvocation(itemId);
        break;
      case 'edit':
        this.editExpertise(itemId);
        break;
      case 'select-all':
        this.selectAllInSection(sectionType);
        break;
    }
  }
  
  programExpertise(itemId) {
    console.log('Programmer expertise:', itemId);
    // Rediriger vers le module planning
    if (window.crimiTrackApp) {
      window.crimiTrackApp.showModule('planning');
    }
  }
  
  sendConvocation(itemId) {
    console.log('Envoyer convocation:', itemId);
    // Rediriger vers le module convocations
    if (window.crimiTrackApp) {
      window.crimiTrackApp.showModule('convocations');
    }
  }
  
  editExpertise(itemId) {
    console.log('Éditer expertise:', itemId);
    // TODO: Ouvrir modal d'édition
  }
  
  selectAllInSection(sectionType) {
    const checkboxes = document.querySelectorAll(`[data-section="${sectionType}"] .expertise-checkbox`);
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
      cb.checked = !allChecked;
    });
  }
  
  programSelected() {
    const selectedCheckboxes = document.querySelectorAll('.expertise-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-id'));
    
    if (selectedIds.length === 0) {
      this.notificationManager.showToast('Aucune expertise sélectionnée', 'warning');
      return;
    }
    
    console.log('Programmer sélection:', selectedIds);
    // TODO: Ouvrir modal de programmation en lot
  }
  
  exportToExcel() {
    console.log('Export Excel waitlist');
    // TODO: Générer et télécharger Excel
  }
  
  getSectionIcon(type) {
    const icons = {
      'CJ': 'fa-gavel',
      'GAV': 'fa-shield-alt',
      'Prisons': 'fa-lock',
      'Victimes': 'fa-heart',
      'Autres': 'fa-folder'
    };
    return icons[type] || 'fa-folder';
  }
  
  calculateAge(dateNaissance) {
    if (!dateNaissance) return 'N/A';
    const birth = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
  
  showError(message) {
    if (this.notificationManager) {
      this.notificationManager.showToast(message, 'error');
    }
  }
  
  async refresh() {
    console.log('⏰ Waitlist rafraîchie');
    await this.loadWaitlistData();
  }
  
  destroy() {
    console.log('⏰ Waitlist PWA détruite');
  }
}

// Export ES6 et exposition globale pour compatibilité
// export default WaitlistPWA;
window.WaitlistPWA = WaitlistPWA;