/**
 * 📊 Statistiques PWA Module
 * Agent UI-Fantaisie - Exact same statistics as desktop version
 */

class StatistiquesPWA {
  constructor(dependencies) {
    this.dataManager = dependencies.dataManager;
    this.syncManager = dependencies.syncManager;
    this.notificationManager = dependencies.notificationManager;
    this.animationEngine = dependencies.animationEngine;
    this.device = dependencies.device;
    
    this.moduleName = 'statistiques';
    this.isInitialized = false;
    this.charts = {};
  }
  
  async initialize() {
    console.log('📊 Statistiques PWA initialisé');
    this.isInitialized = true;
  }
  
  async render(container) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    container.innerHTML = `
      <div class="statistiques-pwa-container">
        <!-- Header avec filtres temporels -->
        <div class="statistiques-header glass-panel">
          <div class="header-title">
            <h2>
              <i class="fas fa-chart-bar"></i>
              Statistiques d'activité
            </h2>
            <p class="module-description">Analyse des performances et activités</p>
          </div>
          
          <div class="period-filters">
            <div class="filter-group">
              <label>Période d'analyse :</label>
              <select id="stats-period" class="filter-select">
                <option value="current_month">Mois en cours</option>
                <option value="last_month">Mois dernier</option>
                <option value="current_year">Année en cours</option>
                <option value="last_year">Année dernière</option>
                <option value="custom">Période personnalisée</option>
              </select>
            </div>
            
            <div class="date-range hidden" id="custom-date-range">
              <input type="date" id="start-date" class="date-input">
              <span>à</span>
              <input type="date" id="end-date" class="date-input">
              <button class="apply-btn" id="apply-dates">
                <i class="fas fa-check"></i>
                Appliquer
              </button>
            </div>
          </div>
        </div>
        
        <!-- Indicateurs clés de performance -->
        <div class="kpi-section glass-panel">
          <h3 class="section-title">
            <i class="fas fa-tachometer-alt"></i>
            Indicateurs clés
          </h3>
          
          <div class="kpi-grid">
            <div class="kpi-card primary">
              <div class="kpi-icon">
                <i class="fas fa-calendar-check"></i>
              </div>
              <div class="kpi-content">
                <span class="kpi-value" id="kpi-expertises-realisees">0</span>
                <span class="kpi-label">Expertises réalisées</span>
              </div>
            </div>
            
            <div class="kpi-card success">
              <div class="kpi-icon">
                <i class="fas fa-clock"></i>
              </div>
              <div class="kpi-content">
                <span class="kpi-value" id="kpi-expertises-programmees">0</span>
                <span class="kpi-label">Expertises programmées</span>
              </div>
            </div>
            
            <div class="kpi-card warning">
              <div class="kpi-icon">
                <i class="fas fa-hourglass-half"></i>
              </div>
              <div class="kpi-content">
                <span class="kpi-value" id="kpi-en-attente">0</span>
                <span class="kpi-label">En attente</span>
              </div>
            </div>
            
            <div class="kpi-card info">
              <div class="kpi-icon">
                <i class="fas fa-euro-sign"></i>
              </div>
              <div class="kpi-content">
                <span class="kpi-value" id="kpi-ca-total">0 €</span>
                <span class="kpi-label">CA estimé</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Graphiques d'activité -->
        <div class="charts-section">
          <!-- Répartition par statut -->
          <div class="chart-container glass-panel">
            <div class="chart-header">
              <h4>
                <i class="fas fa-pie-chart"></i>
                Répartition par statut
              </h4>
              <div class="chart-legend" id="status-legend">
                <!-- Légende dynamique -->
              </div>
            </div>
            <div class="chart-content">
              <canvas id="status-chart" width="400" height="300"></canvas>
            </div>
          </div>
          
          <!-- Évolution mensuelle -->
          <div class="chart-container glass-panel">
            <div class="chart-header">
              <h4>
                <i class="fas fa-line-chart"></i>
                Évolution de l'activité
              </h4>
            </div>
            <div class="chart-content">
              <canvas id="activity-chart" width="400" height="300"></canvas>
            </div>
          </div>
        </div>
        
        <!-- Analyses détaillées -->
        <div class="detailed-stats">
          <!-- Répartition par type d'établissement -->
          <div class="stats-container glass-panel">
            <div class="stats-header">
              <h4>
                <i class="fas fa-building"></i>
                Répartition par établissement
              </h4>
            </div>
            <div class="stats-content" id="etablissements-stats">
              <!-- Sera rempli dynamiquement -->
            </div>
          </div>
          
          <!-- Top magistrats -->
          <div class="stats-container glass-panel">
            <div class="stats-header">
              <h4>
                <i class="fas fa-gavel"></i>
                Top magistrats prescripteurs
              </h4>
            </div>
            <div class="stats-content" id="magistrats-stats">
              <!-- Sera rempli dynamiquement -->
            </div>
          </div>
          
          <!-- Délais d'expertise -->
          <div class="stats-container glass-panel">
            <div class="stats-header">
              <h4>
                <i class="fas fa-stopwatch"></i>
                Délais de traitement
              </h4>
            </div>
            <div class="stats-content" id="delais-stats">
              <!-- Sera rempli dynamiquement -->
            </div>
          </div>
          
          <!-- Types d'infractions -->
          <div class="stats-container glass-panel">
            <div class="stats-header">
              <h4>
                <i class="fas fa-list"></i>
                Types d'infractions les plus fréquents
              </h4>
            </div>
            <div class="stats-content" id="infractions-stats">
              <!-- Sera rempli dynamiquement -->
            </div>
          </div>
        </div>
        
        <!-- Actions d'export -->
        <div class="export-section glass-panel">
          <h4>
            <i class="fas fa-download"></i>
            Export des données
          </h4>
          <div class="export-actions">
            <button class="export-btn primary" id="export-excel">
              <i class="fas fa-file-excel"></i>
              Export Excel complet
            </button>
            <button class="export-btn secondary" id="export-pdf">
              <i class="fas fa-file-pdf"></i>
              Rapport PDF
            </button>
            <button class="export-btn secondary" id="export-csv">
              <i class="fas fa-file-csv"></i>
              Données CSV
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Charger les données et calculer les statistiques
    await this.loadStatisticsData();
    
    // Configurer les interactions
    this.setupInteractions(container);
    
    // Animer l'entrée
    this.animationEngine.slideIn(container);
  }
  
  async loadStatisticsData() {
    try {
      const data = await this.dataManager.getAllExpertises();
      const period = document.getElementById('stats-period')?.value || 'current_month';
      
      // Filtrer les données selon la période
      const filteredData = this.filterDataByPeriod(data, period);
      
      // Calculer les KPI
      this.calculateKPIs(filteredData);
      
      // Créer les graphiques
      this.createCharts(filteredData);
      
      // Générer les analyses détaillées
      this.generateDetailedStats(filteredData);
      
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
      this.showError('Erreur de chargement des données statistiques');
    }
  }
  
  filterDataByPeriod(data, period) {
    if (!data || !Array.isArray(data)) return [];
    
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        const startInput = document.getElementById('start-date')?.value;
        const endInput = document.getElementById('end-date')?.value;
        if (startInput && endInput) {
          startDate = new Date(startInput);
          endDate = new Date(endInput);
        } else {
          return data; // Retourner toutes les données si dates non définies
        }
        break;
      default:
        return data;
    }
    
    return data.filter(item => {
      const itemDate = this.getItemDate(item);
      return itemDate && itemDate >= startDate && itemDate <= endDate;
    });
  }
  
  getItemDate(item) {
    // Essayer différents champs de date
    const dateFields = [
      'date_examen', 
      'date_creation', 
      'date_programmation',
      'Date d\'examen',
      'Date de création'
    ];
    
    for (const field of dateFields) {
      if (item[field]) {
        const date = new Date(item[field]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    return null;
  }
  
  calculateKPIs(data) {
    const stats = {
      realisees: data.filter(item => item.statut === 'realisee').length,
      programmees: data.filter(item => item.statut === 'programmee').length,
      enAttente: data.filter(item => item.statut === 'en_attente').length,
      caTotal: this.calculateTotalCA(data)
    };
    
    // Mettre à jour les KPI avec animation
    this.updateKPI('kpi-expertises-realisees', stats.realisees);
    this.updateKPI('kpi-expertises-programmees', stats.programmees);
    this.updateKPI('kpi-en-attente', stats.enAttente);
    this.updateKPI('kpi-ca-total', `${stats.caTotal.toLocaleString('fr-FR')} €`);
  }
  
  calculateTotalCA(data) {
    // Estimer le CA selon les types d'expertise
    const tarifs = {
      'flagrance': 300,
      'instruction': 450,
      'correctionnel': 400,
      'cour_assises': 600,
      'civil': 350,
      'default': 400
    };
    
    return data.reduce((total, item) => {
      const type = this.getExpertiseType(item);
      const tarif = tarifs[type] || tarifs.default;
      
      if (item.statut === 'realisee') {
        return total + tarif;
      }
      return total;
    }, 0);
  }
  
  getExpertiseType(item) {
    const chefs = (item.chefs_accusation || '').toLowerCase();
    const lieu = (item.lieu_examen || '').toLowerCase();
    
    if (chefs.includes('flagrant') || lieu.includes('gav')) {
      return 'flagrance';
    } else if (lieu.includes('instruction')) {
      return 'instruction';
    } else if (lieu.includes('correctionnel')) {
      return 'correctionnel';
    } else if (lieu.includes('assises')) {
      return 'cour_assises';
    } else if (lieu.includes('civil')) {
      return 'civil';
    }
    return 'default';
  }
  
  updateKPI(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
      this.animationEngine.animateCounter(element);
    }
  }
  
  createCharts(data) {
    this.createStatusChart(data);
    this.createActivityChart(data);
  }
  
  createStatusChart(data) {
    const canvas = document.getElementById('status-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Calculer les données par statut
    const statusCount = this.groupByStatus(data);
    
    // Simuler un graphique en secteurs simple (sans Chart.js)
    this.drawPieChart(ctx, statusCount, canvas.width, canvas.height);
    
    // Mettre à jour la légende
    this.updateStatusLegend(statusCount);
  }
  
  groupByStatus(data) {
    const statusMap = {
      'en_attente': { label: 'En attente', color: '#f59e0b', count: 0 },
      'programmee': { label: 'Programmées', color: '#3b82f6', count: 0 },
      'realisee': { label: 'Réalisées', color: '#10b981', count: 0 },
      'refusee': { label: 'Refusées', color: '#ef4444', count: 0 }
    };
    
    data.forEach(item => {
      if (statusMap[item.statut]) {
        statusMap[item.statut].count++;
      }
    });
    
    return statusMap;
  }
  
  drawPieChart(ctx, statusCount, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    
    const total = Object.values(statusCount).reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return;
    
    let currentAngle = 0;
    
    Object.values(statusCount).forEach(status => {
      if (status.count > 0) {
        const sliceAngle = (status.count / total) * 2 * Math.PI;
        
        // Dessiner la part
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = status.color;
        ctx.fill();
        
        // Dessiner le contour
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        currentAngle += sliceAngle;
      }
    });
  }
  
  updateStatusLegend(statusCount) {
    const legendContainer = document.getElementById('status-legend');
    if (!legendContainer) return;
    
    legendContainer.innerHTML = Object.values(statusCount)
      .filter(status => status.count > 0)
      .map(status => `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${status.color}"></div>
          <span class="legend-label">${status.label}</span>
          <span class="legend-value">${status.count}</span>
        </div>
      `).join('');
  }
  
  createActivityChart(data) {
    const canvas = document.getElementById('activity-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Données d'activité par mois (exemple simplifié)
    const monthlyData = this.groupByMonth(data);
    this.drawLineChart(ctx, monthlyData, canvas.width, canvas.height);
  }
  
  groupByMonth(data) {
    const months = {};
    const now = new Date();
    
    // Initialiser les 12 derniers mois
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = month.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    
    // Compter les expertises par mois
    data.forEach(item => {
      const date = this.getItemDate(item);
      if (date) {
        const key = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        if (months.hasOwnProperty(key)) {
          months[key]++;
        }
      }
    });
    
    return months;
  }
  
  drawLineChart(ctx, monthlyData, width, height) {
    const margin = 40;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;
    
    const labels = Object.keys(monthlyData);
    const values = Object.values(monthlyData);
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
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    labels.forEach((label, index) => {
      const x = margin + (index * chartWidth) / (labels.length - 1);
      const y = height - margin - (values[index] * chartHeight) / maxValue;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Dessiner les points
    ctx.fillStyle = '#7c3aed';
    labels.forEach((label, index) => {
      const x = margin + (index * chartWidth) / (labels.length - 1);
      const y = height - margin - (values[index] * chartHeight) / maxValue;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
  
  generateDetailedStats(data) {
    this.generateEtablissementsStats(data);
    this.generateMagistratsStats(data);
    this.generateDelaisStats(data);
    this.generateInfractionsStats(data);
  }
  
  generateEtablissementsStats(data) {
    const container = document.getElementById('etablissements-stats');
    if (!container) return;
    
    const etablissements = {};
    
    data.forEach(item => {
      const lieu = item.lieu_examen || 'Non défini';
      const etablissement = this.categorizeEtablissement(lieu);
      
      if (!etablissements[etablissement]) {
        etablissements[etablissement] = 0;
      }
      etablissements[etablissement]++;
    });
    
    const sortedEtablissements = Object.entries(etablissements)
      .sort(([,a], [,b]) => b - a);
    
    const total = data.length || 1;
    
    container.innerHTML = sortedEtablissements.map(([etablissement, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      return `
        <div class="stat-item">
          <div class="stat-info">
            <span class="stat-name">${etablissement}</span>
            <span class="stat-percentage">${percentage}%</span>
          </div>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${percentage}%"></div>
          </div>
          <span class="stat-count">${count}</span>
        </div>
      `;
    }).join('');
  }
  
  categorizeEtablissement(lieu) {
    const lieuLower = lieu.toLowerCase();
    
    if (lieuLower.includes('gav') || lieuLower.includes('commissariat')) {
      return 'GAV / Commissariats';
    } else if (lieuLower.includes('tribunal') || lieuLower.includes('cj')) {
      return 'Tribunaux / CJ';
    } else if (lieuLower.includes('prison') || lieuLower.includes('maison') || lieuLower.includes('centre')) {
      return 'Établissements pénitentiaires';
    } else if (lieuLower.includes('umj') || lieuLower.includes('victime')) {
      return 'UMJ / Victimes';
    } else {
      return 'Autres';
    }
  }
  
  generateMagistratsStats(data) {
    const container = document.getElementById('magistrats-stats');
    if (!container) return;
    
    const magistrats = {};
    
    data.forEach(item => {
      const magistrat = item.magistrat || 'Non défini';
      if (!magistrats[magistrat]) {
        magistrats[magistrat] = 0;
      }
      magistrats[magistrat]++;
    });
    
    const sortedMagistrats = Object.entries(magistrats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); // Top 10
    
    container.innerHTML = sortedMagistrats.map(([magistrat, count], index) => `
      <div class="top-item">
        <span class="top-rank">${index + 1}</span>
        <span class="top-name">${magistrat}</span>
        <span class="top-count">${count} expertises</span>
      </div>
    `).join('');
  }
  
  generateDelaisStats(data) {
    const container = document.getElementById('delais-stats');
    if (!container) return;
    
    const realisees = data.filter(item => item.statut === 'realisee');
    if (realisees.length === 0) {
      container.innerHTML = '<p class="no-data">Aucune expertise réalisée pour calculer les délais</p>';
      return;
    }
    
    const delais = realisees.map(item => {
      const creation = new Date(item.date_creation || Date.now());
      const examen = new Date(item.date_examen || Date.now());
      return Math.max(0, Math.floor((examen - creation) / (1000 * 60 * 60 * 24)));
    });
    
    const moyenne = delais.reduce((a, b) => a + b, 0) / delais.length;
    const median = [...delais].sort((a, b) => a - b)[Math.floor(delais.length / 2)];
    const min = Math.min(...delais);
    const max = Math.max(...delais);
    
    container.innerHTML = `
      <div class="delai-metric">
        <span class="metric-label">Délai moyen</span>
        <span class="metric-value">${Math.round(moyenne)} jours</span>
      </div>
      <div class="delai-metric">
        <span class="metric-label">Délai médian</span>
        <span class="metric-value">${median} jours</span>
      </div>
      <div class="delai-metric">
        <span class="metric-label">Délai minimum</span>
        <span class="metric-value">${min} jours</span>
      </div>
      <div class="delai-metric">
        <span class="metric-label">Délai maximum</span>
        <span class="metric-value">${max} jours</span>
      </div>
    `;
  }
  
  generateInfractionsStats(data) {
    const container = document.getElementById('infractions-stats');
    if (!container) return;
    
    const infractions = {};
    
    data.forEach(item => {
      const chefs = item.chefs_accusation || 'Non défini';
      // Extraire les mots-clés principaux
      const keywords = this.extractInfractionKeywords(chefs);
      
      keywords.forEach(keyword => {
        if (!infractions[keyword]) {
          infractions[keyword] = 0;
        }
        infractions[keyword]++;
      });
    });
    
    const sortedInfractions = Object.entries(infractions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); // Top 10
    
    const total = data.length || 1;
    
    container.innerHTML = sortedInfractions.map(([infraction, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      return `
        <div class="infraction-item">
          <div class="infraction-info">
            <span class="infraction-name">${infraction}</span>
            <span class="infraction-percentage">${percentage}%</span>
          </div>
          <div class="infraction-bar">
            <div class="infraction-fill" style="width: ${percentage}%"></div>
          </div>
          <span class="infraction-count">${count}</span>
        </div>
      `;
    }).join('');
  }
  
  extractInfractionKeywords(chefs) {
    if (!chefs) return ['Non défini'];
    
    const keywords = [];
    const chefsLower = chefs.toLowerCase();
    
    // Infractions principales
    const patterns = {
      'Vol': /vol(?!ontaire)/i,
      'Violences': /violence|coup|blessure/i,
      'Stupéfiants': /stupéfiant|drogue|cannabis|cocaïne/i,
      'Viol': /viol/i,
      'Agression sexuelle': /agression sexuelle|attouchement/i,
      'Homicide': /homicide|meurtre|assassinat/i,
      'Conduite': /conduite|alcool|ivresse/i,
      'Escroquerie': /escroquerie|abus de confiance/i,
      'Recel': /recel/i,
      'Dégradation': /dégradation|destruction/i
    };
    
    for (const [keyword, pattern] of Object.entries(patterns)) {
      if (pattern.test(chefsLower)) {
        keywords.push(keyword);
      }
    }
    
    return keywords.length > 0 ? keywords : ['Autres infractions'];
  }
  
  setupInteractions(container) {
    const periodSelect = container.querySelector('#stats-period');
    const customDateRange = container.querySelector('#custom-date-range');
    const applyDatesBtn = container.querySelector('#apply-dates');
    const exportButtons = container.querySelectorAll('.export-btn');
    
    // Gestion du filtre de période
    periodSelect?.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        customDateRange.classList.remove('hidden');
      } else {
        customDateRange.classList.add('hidden');
        this.loadStatisticsData();
      }
    });
    
    // Appliquer les dates personnalisées
    applyDatesBtn?.addEventListener('click', () => {
      this.loadStatisticsData();
    });
    
    // Actions d'export
    exportButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.id;
        this.handleExport(action);
      });
    });
  }
  
  handleExport(action) {
    switch (action) {
      case 'export-excel':
        this.exportToExcel();
        break;
      case 'export-pdf':
        this.exportToPDF();
        break;
      case 'export-csv':
        this.exportToCSV();
        break;
    }
  }
  
  exportToExcel() {
    console.log('Export Excel des statistiques');
    this.notificationManager?.showToast('Export Excel en cours...', 'info');
    // TODO: Implémenter l'export Excel réel
  }
  
  exportToPDF() {
    console.log('Export PDF du rapport statistique');
    this.notificationManager?.showToast('Génération du rapport PDF...', 'info');
    // TODO: Implémenter l'export PDF réel
  }
  
  exportToCSV() {
    console.log('Export CSV des données statistiques');
    this.notificationManager?.showToast('Export CSV en cours...', 'info');
    // TODO: Implémenter l'export CSV réel
  }
  
  showError(message) {
    if (this.notificationManager) {
      this.notificationManager.showToast(message, 'error');
    }
  }
  
  async refresh() {
    console.log('📊 Statistiques rafraîchies');
    await this.loadStatisticsData();
  }
  
  destroy() {
    // Nettoyer les charts si nécessaire
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    console.log('📊 Statistiques PWA détruites');
  }
}

// Export ES6 et exposition globale pour compatibilité
export default StatistiquesPWA;
window.StatistiquesPWA = StatistiquesPWA;