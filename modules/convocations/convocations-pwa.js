/**
 * 📞 Convocations PWA Module
 * Agent UI-Fantaisie - Suivi des convocations en cours
 */

export default class ConvocationsPWA {
  constructor(dependencies) {
    this.dataManager = dependencies.dataManager;
    this.syncManager = dependencies.syncManager;
    this.notificationManager = dependencies.notificationManager;
    this.animationEngine = dependencies.animationEngine;
    this.device = dependencies.device;
    
    this.moduleName = 'convocations';
    this.isInitialized = false;
  }
  
  async initialize() {
    console.log('📞 Convocations PWA initialisé');
    this.isInitialized = true;
  }
  
  async render(container) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    container.innerHTML = `
      <div class="convocations-pwa-container">
        <!-- Header avec statistiques -->
        <div class="convocations-header glass-panel">
          <div class="header-title">
            <h2>
              <i class="fas fa-paper-plane"></i>
              Suivi des Convocations
            </h2>
            <p class="module-description">Statut des convocations en cours et historique</p>
          </div>
          
          <div class="convocations-stats">
            <div class="stat-card">
              <div class="stat-icon pending">
                <i class="fas fa-clock"></i>
              </div>
              <div class="stat-content">
                <span class="stat-value" id="convocations-pending">0</span>
                <span class="stat-label">En attente</span>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon sent">
                <i class="fas fa-paper-plane"></i>
              </div>
              <div class="stat-content">
                <span class="stat-value" id="convocations-sent">0</span>
                <span class="stat-label">Envoyées</span>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon delivered">
                <i class="fas fa-check-circle"></i>
              </div>
              <div class="stat-content">
                <span class="stat-value" id="convocations-delivered">0</span>
                <span class="stat-label">Reçues</span>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon failed">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="stat-content">
                <span class="stat-value" id="convocations-failed">0</span>
                <span class="stat-label">Échecs</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Filtres de statut -->
        <div class="convocations-filters glass-panel">
          <div class="filter-tabs">
            <button class="filter-tab active" data-filter="all">
              <i class="fas fa-list"></i>
              Toutes
            </button>
            <button class="filter-tab" data-filter="pending">
              <i class="fas fa-clock"></i>
              En attente
            </button>
            <button class="filter-tab" data-filter="sent">
              <i class="fas fa-paper-plane"></i>
              Envoyées
            </button>
            <button class="filter-tab" data-filter="delivered">
              <i class="fas fa-check-circle"></i>
              Reçues
            </button>
            <button class="filter-tab" data-filter="failed">
              <i class="fas fa-exclamation-triangle"></i>
              Échecs
            </button>
          </div>
          
          <div class="filter-actions">
            <input type="text" 
                   id="convocations-search" 
                   class="search-input"
                   placeholder="Rechercher par nom ou dossier...">
            <button class="refresh-btn" id="convocations-refresh">
              <i class="fas fa-sync-alt"></i>
              Actualiser
            </button>
          </div>
        </div>
        
        <!-- Liste des convocations -->
        <div class="convocations-list glass-panel">
          <div class="list-header">
            <h3>Convocations en cours</h3>
            <div class="list-info">
              <span id="convocations-count">0</span> convocation(s)
            </div>
          </div>
          
          <div class="convocations-content" id="convocations-content">
            <div class="loading-skeleton">
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Charger les données
    await this.loadConvocationsData();
    
    // Configurer les interactions
    this.setupInteractions(container);
    
    // Animer l'entrée
    this.animationEngine.slideIn(container);
  }
  
  async loadConvocationsData() {
    try {
      const convocationsData = await this.dataManager.getConvocationsData();
      this.renderConvocationsList(convocationsData);
      this.updateStats(convocationsData);
    } catch (error) {
      console.error('Erreur chargement convocations:', error);
      this.showError('Erreur de chargement des données');
    }
  }
  
  renderConvocationsList(data) {
    const contentContainer = document.getElementById('convocations-content');
    if (!contentContainer) return;
    
    if (!data || data.length === 0) {
      contentContainer.innerHTML = `
        <div class="empty-convocations">
          <i class="fas fa-paper-plane"></i>
          <h4>Aucune convocation</h4>
          <p>Les convocations envoyées apparaîtront ici</p>
        </div>
      `;
      return;
    }
    
    // Trier par date d'envoi (plus récent en premier)
    const sortedData = data.sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi));
    
    contentContainer.innerHTML = sortedData.map(item => `
      <div class="convocation-item ${item.statut}" data-id="${item.id}" data-status="${item.statut}">
        <div class="convocation-header">
          <div class="convocation-identity">
            <h4>${item.patronyme}</h4>
            <span class="dossier">${item.numero_dossier}</span>
          </div>
          <div class="convocation-status">
            <span class="status-badge ${item.statut}">
              ${this.getStatusLabel(item.statut)}
            </span>
          </div>
        </div>
        
        <div class="convocation-details">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Type:</span>
              <span class="detail-value">${item.type_envoi || 'Email'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Date envoi:</span>
              <span class="detail-value">${this.formatDate(item.date_envoi)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">RDV prévu:</span>
              <span class="detail-value">${this.formatDate(item.date_rdv)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Lieu:</span>
              <span class="detail-value">${item.lieu_examen}</span>
            </div>
          </div>
          
          ${item.numero_suivi ? `
          <div class="tracking-info">
            <div class="tracking-header">
              <i class="fas fa-truck"></i>
              <span>Suivi postal: ${item.numero_suivi}</span>
            </div>
            <div class="tracking-status">
              ${this.renderTrackingStatus(item.tracking_status)}
            </div>
          </div>
          ` : ''}
          
          ${item.statut === 'failed' && item.error_message ? `
          <div class="error-info">
            <i class="fas fa-exclamation-circle"></i>
            <span>Erreur: ${item.error_message}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="convocation-actions">
          <button class="convocation-btn secondary" 
                  data-action="view" 
                  data-id="${item.id}">
            <i class="fas fa-eye"></i>
            Détails
          </button>
          
          ${item.statut === 'failed' ? `
          <button class="convocation-btn primary" 
                  data-action="retry" 
                  data-id="${item.id}">
            <i class="fas fa-redo"></i>
            Renvoyer
          </button>
          ` : ''}
          
          ${item.type_envoi === 'LRAR' && item.numero_suivi ? `
          <button class="convocation-btn secondary" 
                  data-action="track" 
                  data-id="${item.id}">
            <i class="fas fa-truck"></i>
            Suivre
          </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }
  
  renderTrackingStatus(trackingStatus) {
    if (!trackingStatus) return '<span class="tracking-unknown">Statut inconnu</span>';
    
    const steps = [
      { key: 'posted', label: 'Posté', icon: 'fa-paper-plane' },
      { key: 'in_transit', label: 'En transit', icon: 'fa-truck' },
      { key: 'delivered', label: 'Distribué', icon: 'fa-check-circle' }
    ];
    
    return steps.map(step => `
      <div class="tracking-step ${trackingStatus[step.key] ? 'completed' : ''}">
        <i class="fas ${step.icon}"></i>
        <span>${step.label}</span>
      </div>
    `).join('');
  }
  
  updateStats(data) {
    const stats = {
      pending: data.filter(item => item.statut === 'pending').length,
      sent: data.filter(item => item.statut === 'sent').length,
      delivered: data.filter(item => item.statut === 'delivered').length,
      failed: data.filter(item => item.statut === 'failed').length
    };
    
    Object.entries(stats).forEach(([key, value]) => {
      const element = document.getElementById(`convocations-${key}`);
      if (element) {
        element.textContent = value;
        this.animationEngine.animateCounter(element);
      }
    });
    
    // Mettre à jour le compteur total
    const countElement = document.getElementById('convocations-count');
    if (countElement) {
      countElement.textContent = data.length;
    }
  }
  
  setupInteractions(container) {
    const filterTabs = container.querySelectorAll('.filter-tab');
    const searchInput = container.querySelector('#convocations-search');
    const refreshBtn = container.querySelector('#convocations-refresh');
    
    // Filtres par onglets
    filterTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter');
        this.filterByStatus(filter);
      });
    });
    
    // Recherche
    searchInput?.addEventListener('input', (e) => {
      this.filterBySearch(e.target.value);
    });
    
    // Actualisation
    refreshBtn?.addEventListener('click', () => {
      this.refresh();
    });
    
    // Actions sur les convocations
    container.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        const actionType = action.getAttribute('data-action');
        const itemId = action.getAttribute('data-id');
        this.handleConvocationAction(actionType, itemId);
      }
    });
  }
  
  filterByStatus(status) {
    const items = document.querySelectorAll('.convocation-item');
    
    items.forEach(item => {
      const itemStatus = item.getAttribute('data-status');
      const shouldShow = status === 'all' || itemStatus === status;
      item.style.display = shouldShow ? 'block' : 'none';
    });
  }
  
  filterBySearch(query) {
    const items = document.querySelectorAll('.convocation-item');
    const lowerQuery = query.toLowerCase();
    
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const shouldShow = text.includes(lowerQuery);
      item.style.display = shouldShow ? 'block' : 'none';
    });
  }
  
  handleConvocationAction(action, itemId) {
    switch (action) {
      case 'view':
        this.viewConvocationDetails(itemId);
        break;
      case 'retry':
        this.retryConvocation(itemId);
        break;
      case 'track':
        this.trackConvocation(itemId);
        break;
    }
  }
  
  viewConvocationDetails(itemId) {
    console.log('Voir détails convocation:', itemId);
    // TODO: Ouvrir modal avec détails complets
  }
  
  retryConvocation(itemId) {
    console.log('Renvoyer convocation:', itemId);
    // TODO: Relancer l'envoi
    this.notificationManager?.showToast('Renvoi en cours...', 'info');
  }
  
  trackConvocation(itemId) {
    console.log('Suivre convocation LRAR:', itemId);
    // TODO: Ouvrir le suivi postal détaillé
  }
  
  getStatusLabel(status) {
    const labels = {
      'pending': 'En attente',
      'sent': 'Envoyée',
      'delivered': 'Reçue',
      'failed': 'Échec',
      'in_progress': 'En cours'
    };
    return labels[status] || status;
  }
  
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  showError(message) {
    if (this.notificationManager) {
      this.notificationManager.showToast(message, 'error');
    }
  }
  
  async refresh() {
    console.log('📞 Convocations rafraîchies');
    const refreshBtn = document.getElementById('convocations-refresh');
    if (refreshBtn) {
      refreshBtn.classList.add('loading');
      const icon = refreshBtn.querySelector('i');
      icon.classList.add('fa-spin');
    }
    
    try {
      await this.loadConvocationsData();
      this.notificationManager?.showToast('Données actualisées', 'success');
    } catch (error) {
      this.showError('Erreur lors de l\'actualisation');
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove('loading');
        const icon = refreshBtn.querySelector('i');
        icon.classList.remove('fa-spin');
      }
    }
  }
  
  destroy() {
    console.log('📞 Convocations PWA détruites');
  }
}