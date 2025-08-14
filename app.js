// CrimiTrack Portable - Application principale
class CrimiTrackApp {
  constructor() {
    this.database = { expertises: [] };
    this.currentTab = 'agenda';
    this.selectedExpertises = new Set();
    this.currentTemplate = null;
    this.init();
  }

  async init() {
    // Enregistrer le service worker
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker enregistré');
      } catch (error) {
        console.error('Erreur Service Worker:', error);
      }
    }

    // Charger la base de données locale
    await this.loadDatabase();
    
    // Initialiser les event listeners
    this.initEventListeners();
    
    // Afficher le premier onglet
    this.showTab('agenda');
    
    // Mettre à jour les statistiques
    this.updateStatistics();
  }

  async loadDatabase() {
    try {
      // Essayer de charger depuis localStorage
      const savedData = localStorage.getItem('crimitrack_database');
      if (savedData) {
        this.database = JSON.parse(savedData);
      } else {
        // Charger le fichier par défaut
        const response = await fetch('/database.json');
        if (response.ok) {
          this.database = await response.json();
          this.saveDatabase();
        }
      }
    } catch (error) {
      console.error('Erreur chargement BDD:', error);
      // Créer une base vide si erreur
      this.database = { expertises: [] };
    }
  }

  saveDatabase() {
    localStorage.setItem('crimitrack_database', JSON.stringify(this.database));
    this.showNotification('Base de données sauvegardée');
  }


  initEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.showTab(tab);
      });
    });

    // Import/Export
    document.getElementById('import-db')?.addEventListener('click', () => this.importDatabase());
    document.getElementById('export-db')?.addEventListener('click', () => this.exportDatabase());
    
    // Nouvelle entrée
    document.getElementById('add-entry')?.addEventListener('click', () => this.showEntryModal());
    
    // Modal
    document.getElementById('cancel-entry')?.addEventListener('click', () => this.hideModal());
    document.querySelector('.modal-close')?.addEventListener('click', () => this.hideModal());
    document.getElementById('entry-form')?.addEventListener('submit', (e) => this.handleEntrySubmit(e));
    
    // Filtres et recherche
    document.getElementById('agenda-date')?.addEventListener('change', () => this.updateAgenda());
    document.getElementById('agenda-filter')?.addEventListener('change', () => this.updateAgenda());
    document.getElementById('waitlist-search')?.addEventListener('input', (e) => this.filterWaitlist(e.target.value));
    
    // Nouveaux filtres de recherche
    document.getElementById('search-name')?.addEventListener('input', () => this.updateAgenda());
    document.getElementById('search-magistrat')?.addEventListener('input', () => this.updateAgenda());
    document.getElementById('search-tribunal')?.addEventListener('input', () => this.updateAgenda());
    document.getElementById('clear-filters')?.addEventListener('click', () => this.clearFilters());
    
    // Toggle liste d'attente
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateWaitlist(btn.dataset.status);
      });
    });
    
    // Publipostage
    document.getElementById('template-upload')?.addEventListener('change', (e) => this.handleTemplateUpload(e));
    document.getElementById('generate-doc')?.addEventListener('click', () => this.generateDocument());
    
    // File input pour import
    const fileInput = document.getElementById('file-input');
    fileInput?.addEventListener('change', (e) => this.handleFileImport(e));
  }

  showTab(tabName) {
    // Masquer tous les onglets
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    
    // Masquer tous les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Afficher l'onglet sélectionné
    const tabPane = document.getElementById(tabName);
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (tabPane) tabPane.classList.add('active');
    if (tabBtn) tabBtn.classList.add('active');
    
    this.currentTab = tabName;
    
    // Mettre à jour le contenu selon l'onglet
    switch(tabName) {
      case 'agenda':
        this.updateAgenda();
        break;
      case 'waitlist':
        this.updateWaitlist('programmees');
        break;
      case 'publipostage':
        this.updatePublipostage();
        break;
      case 'stats':
        this.updateStatistics();
        break;
    }
  }

  updateAgenda() {
    const container = document.getElementById('agenda-list');
    if (!container) return;
    
    const dateFilter = document.getElementById('agenda-date')?.value;
    const filterType = document.getElementById('agenda-filter')?.value || 'all';
    const searchName = document.getElementById('search-name')?.value?.toLowerCase() || '';
    const searchMagistrat = document.getElementById('search-magistrat')?.value?.toLowerCase() || '';
    const searchTribunal = document.getElementById('search-tribunal')?.value?.toLowerCase() || '';
    
    let expertises = [...this.database.expertises];
    
    // Filtrer par date spécifique
    if (dateFilter) {
      expertises = expertises.filter(exp => exp.date_examen === dateFilter);
    }
    
    // Filtrer par période ou statut
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch(filterType) {
      case 'today':
        expertises = expertises.filter(exp => exp.date_examen === todayStr);
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        expertises = expertises.filter(exp => {
          const date = new Date(exp.date_examen);
          return date >= weekStart && date <= weekEnd;
        });
        break;
      case 'month':
        expertises = expertises.filter(exp => {
          const date = new Date(exp.date_examen);
          return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        });
        break;
      case 'passees':
        expertises = expertises.filter(exp => {
          const date = new Date(exp.date_examen);
          return date < today || exp.statut === 'realisee';
        });
        break;
      case 'programmees':
        expertises = expertises.filter(exp => exp.statut === 'programmee');
        break;
      case 'attente':
        expertises = expertises.filter(exp => exp.statut === 'attente' || !exp.statut);
        break;
    }
    
    // Filtrer par recherche de nom
    if (searchName) {
      expertises = expertises.filter(exp => 
        exp.patronyme?.toLowerCase().includes(searchName)
      );
    }
    
    // Filtrer par recherche de magistrat
    if (searchMagistrat) {
      expertises = expertises.filter(exp => 
        exp.magistrat?.toLowerCase().includes(searchMagistrat)
      );
    }
    
    // Filtrer par recherche de tribunal
    if (searchTribunal) {
      expertises = expertises.filter(exp => 
        exp.tribunal?.toLowerCase().includes(searchTribunal) ||
        exp.lieu_examen?.toLowerCase().includes(searchTribunal)
      );
    }
    
    // Trier par date
    expertises.sort((a, b) => new Date(a.date_examen) - new Date(b.date_examen));
    
    // Afficher les expertises
    container.innerHTML = expertises.length ? 
      expertises.map(exp => this.createExpertiseCard(exp)).join('') :
      '<p style="text-align: center; color: var(--text-secondary);">Aucune expertise trouvée</p>';
  }
  
  clearFilters() {
    document.getElementById('agenda-date').value = '';
    document.getElementById('agenda-filter').value = 'all';
    document.getElementById('search-name').value = '';
    document.getElementById('search-magistrat').value = '';
    document.getElementById('search-tribunal').value = '';
    this.updateAgenda();
  }

  updateWaitlist(status) {
    const container = document.getElementById('waitlist-content');
    if (!container) return;
    
    let expertises = [...this.database.expertises];
    
    // Filtrer par statut
    if (status === 'programmees') {
      expertises = expertises.filter(exp => exp.statut === 'programmee');
    } else {
      expertises = expertises.filter(exp => exp.statut === 'attente' || !exp.statut);
    }
    
    // Afficher les expertises
    container.innerHTML = expertises.length ? 
      expertises.map(exp => this.createExpertiseCard(exp, true)).join('') :
      '<p style="text-align: center; color: var(--text-secondary);">Aucune expertise trouvée</p>';
  }

  filterWaitlist(searchTerm) {
    const cards = document.querySelectorAll('#waitlist-content .expertise-card');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
  }

  updatePublipostage() {
    const container = document.getElementById('publi-list');
    const selectionCount = document.getElementById('selection-count');
    if (!container) return;
    
    // Mettre à jour le compteur
    if (selectionCount) {
      selectionCount.textContent = this.selectedExpertises.size;
    }
    
    // Activer/désactiver le bouton de génération
    const generateBtn = document.getElementById('generate-doc');
    if (generateBtn) {
      generateBtn.disabled = !this.currentTemplate || this.selectedExpertises.size === 0;
    }
    
    // Afficher toutes les expertises avec checkbox
    container.innerHTML = this.database.expertises.map(exp => `
      <div class="expertise-card ${this.selectedExpertises.has(exp._uniqueId) ? 'selected' : ''}" 
           onclick="app.toggleExpertiseSelection('${exp._uniqueId}')">
        <div class="card-header">
          <span class="card-title">${exp.patronyme || 'Sans nom'}</span>
          <input type="checkbox" ${this.selectedExpertises.has(exp._uniqueId) ? 'checked' : ''} 
                 onclick="event.stopPropagation()">
        </div>
        <div class="card-body">
          <div class="card-info">
            <strong>Date:</strong> ${this.formatDate(exp.date_examen)}
          </div>
          <div class="card-info">
            <strong>Lieu:</strong> ${exp.lieu_examen || 'N/A'}
          </div>
          <div class="card-info">
            <strong>Tribunal:</strong> ${exp.tribunal || 'N/A'}
          </div>
        </div>
      </div>
    `).join('');
  }

  toggleExpertiseSelection(id) {
    if (this.selectedExpertises.has(id)) {
      this.selectedExpertises.delete(id);
    } else {
      this.selectedExpertises.add(id);
    }
    this.updatePublipostage();
  }

  handleTemplateUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.docx')) {
      this.showNotification('Veuillez sélectionner un fichier Word (.docx)', 'warning');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentTemplate = e.target.result;
      document.getElementById('template-name').textContent = file.name;
      
      const generateBtn = document.getElementById('generate-doc');
      if (generateBtn) {
        generateBtn.disabled = this.selectedExpertises.size === 0;
      }
      
      this.showNotification(`Template "${file.name}" chargé avec succès`, 'success');
    };
    reader.readAsArrayBuffer(file);
  }

  async generateDocument() {
    if (!this.currentTemplate) {
      this.showNotification('Veuillez charger un template Word', 'warning');
      return;
    }
    
    if (this.selectedExpertises.size === 0) {
      this.showNotification('Veuillez sélectionner au moins une expertise', 'warning');
      return;
    }
    
    try {
      // Récupérer les expertises sélectionnées
      const selected = Array.from(this.selectedExpertises).map(id => 
        this.database.expertises.find(exp => exp._uniqueId === id)
      ).filter(Boolean);
      
      // Pour chaque expertise, générer un document
      for (let i = 0; i < selected.length; i++) {
        const expertise = selected[i];
        
        // Préparer les données avec formatage des dates
        const data = {
          ...expertise,
          date_examen: this.formatDate(expertise.date_examen),
          date_naissance: this.formatDate(expertise.date_naissance),
          // Ajouter des valeurs par défaut pour les champs vides
          magistrat: expertise.magistrat || '',
          tribunal: expertise.tribunal || '',
          numero_parquet: expertise.numero_parquet || '',
          numero_instruction: expertise.numero_instruction || '',
          chefs_accusation: expertise.chefs_accusation || '',
          profession: expertise.profession || '',
          domicile: expertise.domicile || '',
          opj_greffier: expertise.opj_greffier || ''
        };
        
        // Créer une instance de PizZip avec le template
        const zip = new PizZip(this.currentTemplate);
        
        // Créer un nouveau Docxtemplater
        const doc = new window.docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: {
            start: '{',
            end: '}'
          }
        });
        
        // Remplacer les variables
        doc.render(data);
        
        // Générer le document
        const out = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        // Créer un nom de fichier unique
        const fileName = `${expertise.patronyme || 'export'}_${expertise.numero_parquet || Date.now()}.docx`
          .replace(/[/\\?%*:|"<>]/g, '-'); // Nettoyer le nom de fichier
        
        // Si c'est le seul document ou si on veut télécharger individuellement
        if (selected.length === 1) {
          saveAs(out, fileName);
        } else {
          // Pour plusieurs documents, les télécharger avec un délai
          setTimeout(() => {
            saveAs(out, fileName);
          }, i * 500); // Délai de 500ms entre chaque téléchargement
        }
      }
      
      this.showNotification(
        selected.length === 1 
          ? 'Document généré avec succès' 
          : `${selected.length} documents générés avec succès`,
        'success'
      );
      
    } catch (error) {
      console.error('Erreur génération document:', error);
      this.showNotification('Erreur lors de la génération du document. Vérifiez que votre template utilise les bonnes variables.', 'danger');
    }
  }

  updateStatistics() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    // Filtrer les expertises de l'année en cours
    const expertisesThisYear = this.database.expertises.filter(exp => {
      const date = new Date(exp.date_examen);
      return date.getFullYear() === currentYear;
    });
    
    // Total des expertises réalisées (tous temps confondus)
    const totalCompleted = this.database.expertises.filter(exp => 
      exp.statut === 'realisee'
    ).length;
    
    // Expertises du mois en cours
    const expertisesThisMonth = expertisesThisYear.filter(exp => {
      const date = new Date(exp.date_examen);
      return date.getMonth() === currentMonth;
    }).length;
    
    // Moyenne mensuelle depuis le début de l'année
    const monthsPassed = currentMonth + 1;
    const monthlyAverage = Math.round(expertisesThisYear.length / monthsPassed);
    
    // Mettre à jour les cartes statistiques
    document.getElementById('stat-total-completed').textContent = totalCompleted;
    document.getElementById('stat-current-month').textContent = expertisesThisMonth;
    document.getElementById('stat-month-label').textContent = monthNames[currentMonth] + ' ' + currentYear;
    document.getElementById('stat-monthly-average').textContent = monthlyAverage;
    document.getElementById('stat-current-year').textContent = expertisesThisYear.length;
    document.getElementById('stat-year-label').textContent = 'Année ' + currentYear;
    
    // Statistiques par tribunal
    const tribunalStats = {
      'paris': 0,
      'creteil': 0,
      'bobigny': 0,
      'autres': 0
    };
    
    expertisesThisYear.forEach(exp => {
      const tribunal = (exp.tribunal || exp.lieu_examen || '').toLowerCase();
      if (tribunal.includes('paris')) {
        tribunalStats.paris++;
      } else if (tribunal.includes('créteil') || tribunal.includes('creteil')) {
        tribunalStats.creteil++;
      } else if (tribunal.includes('bobigny')) {
        tribunalStats.bobigny++;
      } else {
        tribunalStats.autres++;
      }
    });
    
    // Mettre à jour les tribunaux
    document.getElementById('tj-paris').textContent = tribunalStats.paris;
    document.getElementById('tj-creteil').textContent = tribunalStats.creteil;
    document.getElementById('tj-bobigny').textContent = tribunalStats.bobigny;
    document.getElementById('tj-autres').textContent = tribunalStats.autres;
    
    // Calculer les pourcentages pour les barres
    const maxTribunal = Math.max(...Object.values(tribunalStats));
    if (maxTribunal > 0) {
      document.getElementById('bar-paris').style.width = (tribunalStats.paris / maxTribunal * 100) + '%';
      document.getElementById('bar-creteil').style.width = (tribunalStats.creteil / maxTribunal * 100) + '%';
      document.getElementById('bar-bobigny').style.width = (tribunalStats.bobigny / maxTribunal * 100) + '%';
      document.getElementById('bar-autres').style.width = (tribunalStats.autres / maxTribunal * 100) + '%';
    }
    
    // Dessiner le graphique mensuel
    this.drawMonthlyChart();
  }

  drawMonthlyChart() {
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 350;
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                       'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    // Compter les expertises par mois
    const monthlyData = new Array(12).fill(0);
    this.database.expertises.forEach(exp => {
      const date = new Date(exp.date_examen);
      if (date.getFullYear() === currentYear) {
        monthlyData[date.getMonth()]++;
      }
    });
    
    // Ne dessiner que jusqu'au mois actuel
    const monthsToShow = currentMonth + 1;
    const relevantData = monthlyData.slice(0, monthsToShow);
    
    if (relevantData.every(v => v === 0)) {
      ctx.fillStyle = '#7f8c8d';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Aucune donnée disponible pour ' + currentYear, canvas.width / 2, canvas.height / 2);
      return;
    }
    
    // Configuration du graphique
    const padding = 40;
    const chartWidth = canvas.width - (padding * 2);
    const chartHeight = canvas.height - (padding * 2);
    const barWidth = chartWidth / monthsToShow - 20;
    const maxValue = Math.max(...relevantData) || 1;
    
    // Dessiner les axes
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Dessiner les barres
    relevantData.forEach((value, index) => {
      const x = padding + (index * (chartWidth / monthsToShow)) + 10;
      const barHeight = (value / maxValue) * chartHeight;
      const y = canvas.height - padding - barHeight;
      
      // Gradient pour les barres
      const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - padding);
      gradient.addColorStop(0, '#3498db');
      gradient.addColorStop(1, '#2980b9');
      
      // Dessiner la barre
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Valeur au-dessus de la barre
      if (value > 0) {
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + barWidth / 2, y - 5);
      }
      
      // Nom du mois
      ctx.fillStyle = '#7f8c8d';
      ctx.font = '11px sans-serif';
      ctx.fillText(monthNames[index], x + barWidth / 2, canvas.height - padding + 20);
    });
    
    // Titre de l'axe Y
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nombre d\'expertises', 0, 0);
    ctx.restore();
  }

  createExpertiseCard(expertise, showActions = false) {
    const statusClass = expertise.statut ? `badge-${expertise.statut}` : 'badge-attente';
    const statusText = expertise.statut || 'attente';
    
    return `
      <div class="expertise-card" data-id="${expertise._uniqueId}">
        <div class="card-header">
          <span class="card-title">${expertise.patronyme || 'Sans nom'}</span>
          <span class="card-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="card-body">
          <div class="card-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <strong>Date:</strong> ${this.formatDate(expertise.date_examen)}
          </div>
          <div class="card-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <strong>Lieu:</strong> ${expertise.lieu_examen || 'N/A'}
          </div>
          <div class="card-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <strong>Magistrat:</strong> ${expertise.magistrat || 'N/A'}
          </div>
          ${expertise.chefs_accusation ? `
            <div class="card-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <strong>Chefs:</strong> ${expertise.chefs_accusation}
            </div>
          ` : ''}
        </div>
        ${showActions ? `
          <div class="card-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; gap: 0.5rem;">
            <button class="btn btn-sm" onclick="app.editExpertise('${expertise._uniqueId}')">Modifier</button>
            <button class="btn btn-sm btn-secondary" onclick="app.deleteExpertise('${expertise._uniqueId}')">Supprimer</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  showEntryModal(expertiseId = null) {
    const modal = document.getElementById('entry-modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    if (expertiseId) {
      // Mode édition
      const expertise = this.database.expertises.find(exp => exp._uniqueId === expertiseId);
      if (expertise) {
        const form = document.getElementById('entry-form');
        Object.keys(expertise).forEach(key => {
          const input = form.elements[key];
          if (input) {
            input.value = expertise[key] || '';
          }
        });
      }
    } else {
      // Mode création
      document.getElementById('entry-form')?.reset();
    }
  }

  hideModal() {
    const modal = document.getElementById('entry-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  handleEntrySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const expertise = {};
    
    formData.forEach((value, key) => {
      expertise[key] = value;
    });
    
    // Générer un ID unique
    expertise._uniqueId = this.generateUniqueId();
    expertise._importDate = new Date().toISOString();
    
    // Ajouter à la base de données
    this.database.expertises.push(expertise);
    
    // Sauvegarder
    this.saveDatabase();
    
    // Fermer la modal
    this.hideModal();
    
    // Rafraîchir l'affichage
    this.showTab(this.currentTab);
    
    this.showNotification('Expertise ajoutée avec succès', 'success');
  }

  editExpertise(id) {
    this.showEntryModal(id);
  }

  deleteExpertise(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette expertise ?')) {
      const index = this.database.expertises.findIndex(exp => exp._uniqueId === id);
      if (index > -1) {
        this.database.expertises.splice(index, 1);
        this.saveDatabase();
        this.showTab(this.currentTab);
        this.showNotification('Expertise supprimée', 'success');
      }
    }
  }

  importDatabase() {
    document.getElementById('file-input')?.click();
  }

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.expertises && Array.isArray(data.expertises)) {
          this.database = data;
          this.saveDatabase();
          this.showTab(this.currentTab);
          this.updateStatistics();
          this.showNotification('Base de données importée avec succès', 'success');
        } else {
          throw new Error('Format invalide');
        }
      } catch (error) {
        this.showNotification('Erreur lors de l\'import: ' + error.message, 'danger');
      }
    };
    reader.readAsText(file);
  }

  exportDatabase() {
    const dataStr = JSON.stringify(this.database, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crimitrack_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('Base de données exportée', 'success');
  }

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  showNotification(message, type = 'info') {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : type === 'danger' ? '#e74c3c' : '#3498db'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 2000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Ajouter les animations CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialiser l'application
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new CrimiTrackApp();
});