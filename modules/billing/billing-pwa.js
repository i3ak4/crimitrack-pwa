/**
 * 💰 Billing PWA Module
 * Agent UI-Fantaisie - Simplified version with payment tracking
 */

class BillingPWA {
  constructor(dependencies) {
    this.dataManager = dependencies.dataManager;
    this.syncManager = dependencies.syncManager;
    this.notificationManager = dependencies.notificationManager;
    this.animationEngine = dependencies.animationEngine;
    this.device = dependencies.device;
    
    this.moduleName = 'billing';
    this.isInitialized = false;
    this.currentView = 'overview';
  }
  
  async initialize() {
    console.log('💰 Billing PWA initialisé');
    this.isInitialized = true;
  }
  
  async render(container) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    container.innerHTML = `
      <div class="billing-pwa-container">
        <!-- Header avec indicateurs financiers -->
        <div class="billing-header glass-panel">
          <div class="header-title">
            <h2>
              <i class="fas fa-euro-sign"></i>
              Suivi de facturation
            </h2>
            <p class="module-description">Gestion simplifiée des paiements et facturation</p>
          </div>
          
          <div class="billing-indicators">
            <div class="indicator-card pending">
              <div class="indicator-icon">
                <i class="fas fa-clock"></i>
              </div>
              <div class="indicator-content">
                <span class="indicator-value" id="amount-pending">0 €</span>
                <span class="indicator-label">Attentes de paiement</span>
              </div>
            </div>
            
            <div class="indicator-card current-month">
              <div class="indicator-icon">
                <i class="fas fa-calendar-month"></i>
              </div>
              <div class="indicator-content">
                <span class="indicator-value" id="amount-current-month">0 €</span>
                <span class="indicator-label">Payés ce mois</span>
              </div>
            </div>
            
            <div class="indicator-card current-year">
              <div class="indicator-icon">
                <i class="fas fa-calendar-year"></i>
              </div>
              <div class="indicator-content">
                <span class="indicator-value" id="amount-current-year">0 €</span>
                <span class="indicator-label">Payés cette année</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Navigation des vues -->
        <div class="billing-navigation glass-panel">
          <div class="nav-tabs">
            <button class="nav-tab active" data-view="overview">
              <i class="fas fa-chart-pie"></i>
              Vue d'ensemble
            </button>
            <button class="nav-tab" data-view="pending">
              <i class="fas fa-hourglass-half"></i>
              En attente <span class="tab-count" id="pending-count">0</span>
            </button>
            <button class="nav-tab" data-view="paid">
              <i class="fas fa-check-circle"></i>
              Payées <span class="tab-count" id="paid-count">0</span>
            </button>
            <button class="nav-tab" data-view="analytics">
              <i class="fas fa-analytics"></i>
              Analyse
            </button>
          </div>
          
          <div class="nav-actions">
            <button class="action-btn secondary" id="export-billing">
              <i class="fas fa-download"></i>
              Export
            </button>
            <button class="action-btn primary" id="add-payment">
              <i class="fas fa-plus"></i>
              Ajouter paiement
            </button>
          </div>
        </div>
        
        <!-- Vue d'ensemble -->
        <div class="billing-view" id="overview-view">
          <div class="overview-grid">
            <!-- Graphique des paiements -->
            <div class="overview-card glass-panel">
              <div class="card-header">
                <h3>
                  <i class="fas fa-chart-line"></i>
                  Évolution des paiements
                </h3>
              </div>
              <div class="chart-container">
                <canvas id="payments-chart" width="400" height="200"></canvas>
              </div>
            </div>
            
            <!-- Derniers paiements -->
            <div class="overview-card glass-panel">
              <div class="card-header">
                <h3>
                  <i class="fas fa-receipt"></i>
                  Derniers paiements
                </h3>
                <button class="view-all-btn" onclick="switchBillingView('paid')">
                  Voir tout
                </button>
              </div>
              <div class="recent-payments" id="recent-payments">
                <!-- Sera rempli dynamiquement -->
              </div>
            </div>
            
            <!-- Statistiques mensuelles -->
            <div class="overview-card glass-panel">
              <div class="card-header">
                <h3>
                  <i class="fas fa-calculator"></i>
                  Statistiques mensuelles
                </h3>
              </div>
              <div class="monthly-stats" id="monthly-stats">
                <!-- Sera rempli dynamiquement -->
              </div>
            </div>
            
            <!-- Actions rapides -->
            <div class="overview-card glass-panel">
              <div class="card-header">
                <h3>
                  <i class="fas fa-bolt"></i>
                  Actions rapides
                </h3>
              </div>
              <div class="quick-actions-grid">
                <button class="quick-action-btn" data-action="generate-invoice">
                  <i class="fas fa-file-invoice"></i>
                  Générer facture
                </button>
                <button class="quick-action-btn" data-action="mark-paid">
                  <i class="fas fa-check"></i>
                  Marquer payé
                </button>
                <button class="quick-action-btn" data-action="send-reminder">
                  <i class="fas fa-bell"></i>
                  Envoyer relance
                </button>
                <button class="quick-action-btn" data-action="view-reports">
                  <i class="fas fa-chart-bar"></i>
                  Voir rapports
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Vue des paiements en attente -->
        <div class="billing-view hidden" id="pending-view">
          <div class="pending-section glass-panel">
            <div class="section-header">
              <h3>
                <i class="fas fa-hourglass-half"></i>
                Paiements en attente
              </h3>
              <div class="section-filters">
                <select id="pending-filter" class="filter-select">
                  <option value="all">Tous les délais</option>
                  <option value="overdue">En retard</option>
                  <option value="due_soon">Échéance proche</option>
                  <option value="recent">Récents</option>
                </select>
                <input type="text" 
                       id="pending-search" 
                       class="search-input"
                       placeholder="Rechercher...">
              </div>
            </div>
            
            <div class="pending-list" id="pending-list">
              <!-- Sera rempli dynamiquement -->
            </div>
          </div>
        </div>
        
        <!-- Vue des paiements effectués -->
        <div class="billing-view hidden" id="paid-view">
          <div class="paid-section glass-panel">
            <div class="section-header">
              <h3>
                <i class="fas fa-check-circle"></i>
                Paiements effectués
              </h3>
              <div class="section-filters">
                <select id="paid-period" class="filter-select">
                  <option value="current_month">Ce mois</option>
                  <option value="last_month">Mois dernier</option>
                  <option value="current_year">Cette année</option>
                  <option value="all">Tous</option>
                </select>
                <input type="text" 
                       id="paid-search" 
                       class="search-input"
                       placeholder="Rechercher...">
              </div>
            </div>
            
            <div class="paid-list" id="paid-list">
              <!-- Sera rempli dynamiquement -->
            </div>
          </div>
        </div>
        
        <!-- Vue d'analyse -->
        <div class="billing-view hidden" id="analytics-view">
          <div class="analytics-grid">
            <!-- KPI financiers -->
            <div class="analytics-card glass-panel">
              <div class="card-header">
                <h3>
                  <i class="fas fa-chart-bar"></i>
                  Indicateurs financiers
                </h3>
              </div>
              <div class="kpi-grid">
                <div class="kpi-item">
                  <span class="kpi-label">CA mensuel moyen</span>
                  <span class="kpi-value" id="avg-monthly-ca">0 €</span>
                </div>
                <div class="kpi-item">
                  <span class="kpi-label">Délai moyen de paiement</span>
                  <span class="kpi-value" id="avg-payment-delay">0 j</span>
                </div>
                <div class="kpi-item">
                  <span class="kpi-label">Taux de recouvrement</span>
                  <span class="kpi-value" id="recovery-rate">0%</span>
                </div>
                <div class="kpi-item">
                  <span class="kpi-label">Factures en retard</span>
                  <span class="kpi-value" id="overdue-count">0</span>
                </div>
              </div>
            </div>
            
            <!-- Répartition par juridiction -->
            <div class="analytics-card glass-panel">
              <div class="card-header">
                <h3>
                  <i class="fas fa-gavel"></i>
                  Répartition par juridiction
                </h3>
              </div>
              <div class="jurisdiction-chart">
                <canvas id="jurisdiction-chart" width="300" height="300"></canvas>
              </div>
            </div>
            
            <!-- Évolution du CA -->
            <div class="analytics-card glass-panel full-width">
              <div class="card-header">
                <h3>
                  <i class="fas fa-trending-up"></i>
                  Évolution du chiffre d'affaires
                </h3>
              </div>
              <div class="ca-evolution-chart">
                <canvas id="ca-evolution-chart" width="800" height="300"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Charger les données
    await this.loadBillingData();
    
    // Configurer les interactions
    this.setupInteractions(container);
    
    // Animer l'entrée
    this.animationEngine.slideIn(container);
  }
  
  async loadBillingData() {
    try {
      const billingData = await this.dataManager.getBillingData();
      this.updateIndicators(billingData);
      this.updateCurrentView(billingData);
    } catch (error) {
      console.error('Erreur chargement billing:', error);
      this.showError('Erreur de chargement des données de facturation');
    }
  }
  
  updateIndicators(data) {
    if (!data) {
      // Données de démonstration si pas de données réelles
      data = this.generateMockBillingData();
    }
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // Calculer les montants
    const pendingAmount = this.calculatePendingAmount(data);
    const currentMonthAmount = this.calculatePeriodAmount(data, startOfMonth, now);
    const currentYearAmount = this.calculatePeriodAmount(data, startOfYear, now);
    
    // Mettre à jour les indicateurs
    this.updateIndicator('amount-pending', `${pendingAmount.toLocaleString('fr-FR')} €`);
    this.updateIndicator('amount-current-month', `${currentMonthAmount.toLocaleString('fr-FR')} €`);
    this.updateIndicator('amount-current-year', `${currentYearAmount.toLocaleString('fr-FR')} €`);
    
    // Mettre à jour les compteurs d'onglets
    const pendingCount = data.filter(item => item.statut === 'en_attente').length;
    const paidCount = data.filter(item => item.statut === 'paye').length;
    
    this.updateTabCount('pending-count', pendingCount);
    this.updateTabCount('paid-count', paidCount);
  }
  
  generateMockBillingData() {
    // Générer des données de démonstration pour la facturation
    const mockData = [];
    const now = new Date();
    
    // Expertise en attente de paiement
    for (let i = 0; i < 15; i++) {
      const invoiceDate = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      mockData.push({
        id: `pending_${i}`,
        patronyme: `MARTIN Jean ${i + 1}`,
        numero_facture: `F2024-${String(i + 1).padStart(3, '0')}`,
        montant: Math.floor(Math.random() * 500) + 300,
        date_facture: invoiceDate.toISOString(),
        date_echeance: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        statut: 'en_attente',
        juridiction: ['TGI Paris', 'TGI Nanterre', 'TGI Bobigny', 'TGI Créteil'][Math.floor(Math.random() * 4)],
        type_expertise: ['Flagrance', 'Instruction', 'Correctionnel'][Math.floor(Math.random() * 3)]
      });
    }
    
    // Paiements effectués
    for (let i = 0; i < 25; i++) {
      const invoiceDate = new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000);
      const paymentDate = new Date(invoiceDate.getTime() + Math.random() * 45 * 24 * 60 * 60 * 1000);
      
      mockData.push({
        id: `paid_${i}`,
        patronyme: `DUPONT Marie ${i + 1}`,
        numero_facture: `F2024-${String(i + 100).padStart(3, '0')}`,
        montant: Math.floor(Math.random() * 500) + 300,
        date_facture: invoiceDate.toISOString(),
        date_paiement: paymentDate.toISOString(),
        statut: 'paye',
        juridiction: ['TGI Paris', 'TGI Nanterre', 'TGI Bobigny', 'TGI Créteil'][Math.floor(Math.random() * 4)],
        type_expertise: ['Flagrance', 'Instruction', 'Correctionnel'][Math.floor(Math.random() * 3)]
      });
    }
    
    return mockData;
  }
  
  calculatePendingAmount(data) {
    return data
      .filter(item => item.statut === 'en_attente')
      .reduce((total, item) => total + (item.montant || 0), 0);
  }
  
  calculatePeriodAmount(data, startDate, endDate) {
    return data
      .filter(item => {
        if (item.statut !== 'paye' || !item.date_paiement) return false;
        const paymentDate = new Date(item.date_paiement);
        return paymentDate >= startDate && paymentDate <= endDate;
      })
      .reduce((total, item) => total + (item.montant || 0), 0);
  }
  
  updateIndicator(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
      this.animationEngine.animateCounter(element);
    }
  }
  
  updateTabCount(elementId, count) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = count;
    }
  }
  
  updateCurrentView(data) {
    switch (this.currentView) {
      case 'overview':
        this.renderOverviewView(data);
        break;
      case 'pending':
        this.renderPendingView(data);
        break;
      case 'paid':
        this.renderPaidView(data);
        break;
      case 'analytics':
        this.renderAnalyticsView(data);
        break;
    }
  }
  
  renderOverviewView(data) {
    this.renderRecentPayments(data);
    this.renderMonthlyStats(data);
    this.renderPaymentsChart(data);
  }
  
  renderRecentPayments(data) {
    const container = document.getElementById('recent-payments');
    if (!container) return;
    
    const recentPayments = data
      .filter(item => item.statut === 'paye')
      .sort((a, b) => new Date(b.date_paiement) - new Date(a.date_paiement))
      .slice(0, 5);
    
    if (recentPayments.length === 0) {
      container.innerHTML = '<p class="no-data">Aucun paiement récent</p>';
      return;
    }
    
    container.innerHTML = recentPayments.map(payment => `
      <div class="payment-item">
        <div class="payment-info">
          <span class="payment-name">${payment.patronyme}</span>
          <span class="payment-invoice">${payment.numero_facture}</span>
        </div>
        <div class="payment-details">
          <span class="payment-amount">${payment.montant} €</span>
          <span class="payment-date">${this.formatDate(payment.date_paiement)}</span>
        </div>
      </div>
    `).join('');
  }
  
  renderMonthlyStats(data) {
    const container = document.getElementById('monthly-stats');
    if (!container) return;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const currentMonthAmount = this.calculatePeriodAmount(data, startOfMonth, now);
    const lastMonthAmount = this.calculatePeriodAmount(data, startOfLastMonth, endOfLastMonth);
    
    const currentMonthCount = data.filter(item => {
      if (item.statut !== 'paye' || !item.date_paiement) return false;
      const paymentDate = new Date(item.date_paiement);
      return paymentDate >= startOfMonth && paymentDate <= now;
    }).length;
    
    const evolution = lastMonthAmount > 0 
      ? ((currentMonthAmount - lastMonthAmount) / lastMonthAmount * 100).toFixed(1)
      : 0;
    
    container.innerHTML = `
      <div class="stat-row">
        <span class="stat-label">CA ce mois</span>
        <span class="stat-value">${currentMonthAmount.toLocaleString('fr-FR')} €</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Nombre de paiements</span>
        <span class="stat-value">${currentMonthCount}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Évolution vs mois dernier</span>
        <span class="stat-value ${evolution >= 0 ? 'positive' : 'negative'}">
          ${evolution >= 0 ? '+' : ''}${evolution}%
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Ticket moyen</span>
        <span class="stat-value">
          ${currentMonthCount > 0 ? Math.round(currentMonthAmount / currentMonthCount) : 0} €
        </span>
      </div>
    `;
  }
  
  renderPaymentsChart(data) {
    const canvas = document.getElementById('payments-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Préparer les données des 6 derniers mois
    const monthlyData = this.prepareMonthlyData(data, 6);
    this.drawLineChart(ctx, monthlyData, canvas.width, canvas.height);
  }
  
  prepareMonthlyData(data, months) {
    const result = {};
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = month.toLocaleDateString('fr-FR', { month: 'short' });
      result[key] = 0;
    }
    
    data.filter(item => item.statut === 'paye' && item.date_paiement).forEach(item => {
      const paymentDate = new Date(item.date_paiement);
      const key = paymentDate.toLocaleDateString('fr-FR', { month: 'short' });
      if (result.hasOwnProperty(key)) {
        result[key] += item.montant || 0;
      }
    });
    
    return result;
  }
  
  drawLineChart(ctx, data, width, height) {
    const margin = 40;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    const maxValue = Math.max(...values, 1);
    
    // Dessiner les axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Axe X
    ctx.beginPath();
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();
    
    // Axe Y
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.stroke();
    
    // Dessiner la ligne
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    labels.forEach((label, index) => {
      const x = margin + (index * chartWidth) / Math.max(labels.length - 1, 1);
      const y = height - margin - (values[index] * chartHeight) / maxValue;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Dessiner les points
    ctx.fillStyle = '#10b981';
    labels.forEach((label, index) => {
      const x = margin + (index * chartWidth) / Math.max(labels.length - 1, 1);
      const y = height - margin - (values[index] * chartHeight) / maxValue;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
  
  renderPendingView(data) {
    const container = document.getElementById('pending-list');
    if (!container) return;
    
    const pendingItems = data.filter(item => item.statut === 'en_attente');
    
    if (pendingItems.length === 0) {
      container.innerHTML = '<p class="no-data">Aucun paiement en attente</p>';
      return;
    }
    
    // Trier par date d'échéance
    pendingItems.sort((a, b) => new Date(a.date_echeance) - new Date(b.date_echeance));
    
    container.innerHTML = pendingItems.map(item => {
      const isOverdue = new Date(item.date_echeance) < new Date();
      const daysDiff = Math.ceil((new Date(item.date_echeance) - new Date()) / (1000 * 60 * 60 * 24));
      
      return `
        <div class="billing-item ${isOverdue ? 'overdue' : ''}">
          <div class="item-header">
            <div class="item-identity">
              <h4>${item.patronyme}</h4>
              <span class="invoice-number">${item.numero_facture}</span>
            </div>
            <div class="item-status">
              <span class="status-badge ${isOverdue ? 'overdue' : 'pending'}">
                ${isOverdue ? 'En retard' : 'En attente'}
              </span>
            </div>
          </div>
          
          <div class="item-details">
            <div class="detail-row">
              <span class="detail-label">Montant:</span>
              <span class="detail-value amount">${item.montant} €</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date facture:</span>
              <span class="detail-value">${this.formatDate(item.date_facture)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Échéance:</span>
              <span class="detail-value ${isOverdue ? 'overdue' : ''}">
                ${this.formatDate(item.date_echeance)}
                ${isOverdue ? ` (${Math.abs(daysDiff)} j de retard)` : 
                  daysDiff <= 7 ? ` (dans ${daysDiff} j)` : ''}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Juridiction:</span>
              <span class="detail-value">${item.juridiction}</span>
            </div>
          </div>
          
          <div class="item-actions">
            <button class="item-btn primary" 
                    data-action="mark-paid" 
                    data-id="${item.id}">
              <i class="fas fa-check"></i>
              Marquer payé
            </button>
            <button class="item-btn secondary" 
                    data-action="send-reminder" 
                    data-id="${item.id}">
              <i class="fas fa-bell"></i>
              Relance
            </button>
            <button class="item-btn secondary" 
                    data-action="view-details" 
                    data-id="${item.id}">
              <i class="fas fa-eye"></i>
              Détails
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
  
  renderPaidView(data) {
    const container = document.getElementById('paid-list');
    if (!container) return;
    
    const paidItems = data.filter(item => item.statut === 'paye');
    
    if (paidItems.length === 0) {
      container.innerHTML = '<p class="no-data">Aucun paiement effectué</p>';
      return;
    }
    
    // Trier par date de paiement (plus récent en premier)
    paidItems.sort((a, b) => new Date(b.date_paiement) - new Date(a.date_paiement));
    
    container.innerHTML = paidItems.map(item => `
      <div class="billing-item paid">
        <div class="item-header">
          <div class="item-identity">
            <h4>${item.patronyme}</h4>
            <span class="invoice-number">${item.numero_facture}</span>
          </div>
          <div class="item-status">
            <span class="status-badge paid">Payé</span>
          </div>
        </div>
        
        <div class="item-details">
          <div class="detail-row">
            <span class="detail-label">Montant:</span>
            <span class="detail-value amount">${item.montant} €</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date paiement:</span>
            <span class="detail-value">${this.formatDate(item.date_paiement)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Type expertise:</span>
            <span class="detail-value">${item.type_expertise}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Juridiction:</span>
            <span class="detail-value">${item.juridiction}</span>
          </div>
        </div>
        
        <div class="item-actions">
          <button class="item-btn secondary" 
                  data-action="view-details" 
                  data-id="${item.id}">
            <i class="fas fa-eye"></i>
            Détails
          </button>
          <button class="item-btn secondary" 
                  data-action="download-invoice" 
                  data-id="${item.id}">
            <i class="fas fa-download"></i>
            Facture
          </button>
        </div>
      </div>
    `).join('');
  }
  
  renderAnalyticsView(data) {
    // Vue d'analyse - fonctionnalité future
    console.log('Rendu vue analytics avec', data.length, 'éléments');
  }
  
  setupInteractions(container) {
    const navTabs = container.querySelectorAll('.nav-tab');
    const addPaymentBtn = container.querySelector('#add-payment');
    const exportBtn = container.querySelector('#export-billing');
    
    // Navigation entre vues
    navTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = tab.getAttribute('data-view');
        this.switchView(view);
      });
    });
    
    // Actions globales
    addPaymentBtn?.addEventListener('click', () => this.showAddPaymentModal());
    exportBtn?.addEventListener('click', () => this.exportBillingData());
    
    // Actions sur les éléments de facturation
    container.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        const actionType = action.getAttribute('data-action');
        const itemId = action.getAttribute('data-id');
        this.handleBillingAction(actionType, itemId);
      }
    });
  }
  
  switchView(view) {
    // Mettre à jour les onglets actifs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-view') === view);
    });
    
    // Afficher/masquer les vues
    document.querySelectorAll('.billing-view').forEach(viewElement => {
      viewElement.classList.toggle('hidden', viewElement.id !== `${view}-view`);
    });
    
    this.currentView = view;
    
    // Recharger les données pour la nouvelle vue si nécessaire
    this.loadBillingData();
  }
  
  handleBillingAction(action, itemId) {
    switch (action) {
      case 'mark-paid':
        this.markAsPaid(itemId);
        break;
      case 'send-reminder':
        this.sendReminder(itemId);
        break;
      case 'view-details':
        this.viewDetails(itemId);
        break;
      case 'download-invoice':
        this.downloadInvoice(itemId);
        break;
      case 'generate-invoice':
        this.generateInvoice();
        break;
    }
  }
  
  markAsPaid(itemId) {
    console.log('Marquer comme payé:', itemId);
    this.notificationManager?.showToast('Paiement marqué comme effectué', 'success');
    // TODO: Implémenter la logique réelle
  }
  
  sendReminder(itemId) {
    console.log('Envoyer relance:', itemId);
    this.notificationManager?.showToast('Relance envoyée', 'success');
    // TODO: Implémenter l'envoi de relance
  }
  
  viewDetails(itemId) {
    console.log('Voir détails:', itemId);
    // TODO: Ouvrir modal avec détails complets
  }
  
  downloadInvoice(itemId) {
    console.log('Télécharger facture:', itemId);
    this.notificationManager?.showToast('Téléchargement de la facture...', 'info');
    // TODO: Implémenter le téléchargement
  }
  
  showAddPaymentModal() {
    console.log('Ajouter nouveau paiement');
    // TODO: Ouvrir modal d'ajout de paiement
  }
  
  exportBillingData() {
    console.log('Export des données de facturation');
    this.notificationManager?.showToast('Export en cours...', 'info');
    // TODO: Implémenter l'export Excel/PDF
  }
  
  generateInvoice() {
    console.log('Générer nouvelle facture');
    // TODO: Ouvrir assistant de génération de facture
  }
  
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  showError(message) {
    if (this.notificationManager) {
      this.notificationManager.showToast(message, 'error');
    }
  }
  
  async refresh() {
    console.log('💰 Billing rafraîchi');
    await this.loadBillingData();
  }
  
  destroy() {
    console.log('💰 Billing PWA détruit');
  }
}

// Export ES6 et exposition globale pour compatibilité
// export default BillingPWA;
window.BillingPWA = BillingPWA;

// Fonction globale pour changer de vue (appelée depuis le HTML)
window.switchBillingView = function(view) {
  if (window.currentBillingInstance) {
    window.currentBillingInstance.switchView(view);
  }
};