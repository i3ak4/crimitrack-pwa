/**
 * 📧 Mailing PWA Module
 * Agent UI-Fantaisie - Module de publipostage
 */

export default class MailingPWA {
  constructor(dependencies) {
    this.dataManager = dependencies.dataManager;
    this.syncManager = dependencies.syncManager;
    this.notificationManager = dependencies.notificationManager;
    this.animationEngine = dependencies.animationEngine;
    this.device = dependencies.device;
    
    this.moduleName = 'mailing';
    this.isInitialized = false;
  }
  
  async initialize() {
    console.log('📧 Mailing PWA initialisé');
    this.isInitialized = true;
  }
  
  async render(container) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    container.innerHTML = `
      <div class="mailing-pwa-container">
        <!-- Header -->
        <div class="mailing-header glass-panel">
          <div class="header-title">
            <h2>
              <i class="fas fa-envelope"></i>
              Publipostage
            </h2>
            <p class="module-description">Génération automatisée de documents personnalisés</p>
          </div>
        </div>
        
        <!-- Workflow steps -->
        <div class="mailing-workflow glass-panel">
          <div class="workflow-steps">
            <div class="workflow-step active" data-step="1">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Sélection Template</h4>
                <p>Choisir le modèle de document</p>
              </div>
            </div>
            
            <div class="workflow-step" data-step="2">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Sélection Expertises</h4>
                <p>Choisir les expertises concernées</p>
              </div>
            </div>
            
            <div class="workflow-step" data-step="3">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>Génération</h4>
                <p>Créer les documents personnalisés</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Étape 1: Templates -->
        <div class="mailing-step" id="step-templates">
          <div class="templates-section glass-panel">
            <div class="section-header">
              <h3>
                <i class="fas fa-file-word"></i>
                Modèles de documents
              </h3>
              <div class="templates-info">
                <span id="templates-count">0</span> modèle(s) disponible(s)
              </div>
            </div>
            
            <div class="templates-grid" id="templates-grid">
              <!-- Sera chargé dynamiquement -->
            </div>
          </div>
        </div>
        
        <!-- Étape 2: Sélection expertises -->
        <div class="mailing-step hidden" id="step-expertises">
          <div class="expertises-section glass-panel">
            <div class="section-header">
              <h3>
                <i class="fas fa-users"></i>
                Sélection des expertises
              </h3>
              <div class="selection-controls">
                <button class="selection-btn" id="select-all-expertises">
                  <i class="fas fa-check-square"></i>
                  Tout sélectionner
                </button>
                <button class="selection-btn" id="clear-selection">
                  <i class="fas fa-square"></i>
                  Désélectionner
                </button>
              </div>
            </div>
            
            <div class="expertises-filters">
              <input type="text" 
                     id="expertises-search" 
                     class="search-input"
                     placeholder="Rechercher par nom, dossier...">
              <select id="expertises-filter-status" class="filter-select">
                <option value="all">Tous statuts</option>
                <option value="programmee">Programmées</option>
                <option value="en_attente">En attente</option>
                <option value="realisee">Réalisées</option>
              </select>
            </div>
            
            <div class="expertises-list" id="mailing-expertises-list">
              <!-- Sera chargé dynamiquement -->
            </div>
          </div>
        </div>
        
        <!-- Étape 3: Génération -->
        <div class="mailing-step hidden" id="step-generation">
          <div class="generation-section glass-panel">
            <div class="section-header">
              <h3>
                <i class="fas fa-cogs"></i>
                Génération des documents
              </h3>
            </div>
            
            <div class="generation-summary">
              <div class="summary-item">
                <span class="summary-label">Template sélectionné:</span>
                <span class="summary-value" id="selected-template-name">-</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Expertises sélectionnées:</span>
                <span class="summary-value" id="selected-expertises-count">0</span>
              </div>
            </div>
            
            <div class="generation-actions">
              <button class="generation-btn primary" id="generate-documents">
                <i class="fas fa-play"></i>
                Générer les documents
              </button>
              <button class="generation-btn secondary" id="preview-generation">
                <i class="fas fa-eye"></i>
                Aperçu
              </button>
            </div>
            
            <div class="generation-progress hidden" id="generation-progress">
              <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
              </div>
              <div class="progress-text" id="progress-text">Préparation...</div>
            </div>
            
            <div class="generation-results hidden" id="generation-results">
              <h4>Documents générés</h4>
              <div class="results-list" id="results-list">
                <!-- Documents générés -->
              </div>
              <div class="results-actions">
                <button class="results-btn primary" id="download-all">
                  <i class="fas fa-download"></i>
                  Télécharger tout (ZIP)
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Navigation entre étapes -->
        <div class="mailing-navigation glass-panel">
          <button class="nav-btn secondary" id="prev-step" disabled>
            <i class="fas fa-chevron-left"></i>
            Précédent
          </button>
          
          <div class="nav-info">
            <span>Étape <span id="current-step">1</span> sur 3</span>
          </div>
          
          <button class="nav-btn primary" id="next-step" disabled>
            Suivant
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    `;
    
    // Initialiser le workflow
    this.currentStep = 1;
    await this.loadTemplates();
    
    // Configurer les interactions
    this.setupInteractions(container);
    
    // Animer l'entrée
    this.animationEngine.slideIn(container);
  }
  
  async loadTemplates() {
    try {
      const templates = await this.dataManager.getTemplates();
      this.renderTemplates(templates);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      this.showError('Erreur de chargement des modèles');
    }
  }
  
  renderTemplates(templates) {
    const templatesGrid = document.getElementById('templates-grid');
    if (!templatesGrid) return;
    
    // Templates par défaut si aucun n'est défini
    const defaultTemplates = [
      { id: 'convocation-afm', name: 'Convocation AFM', type: 'convocation', description: 'Convocation standard AFM' },
      { id: 'convocation-instruction-h', name: 'Convocation Instruction (H)', type: 'convocation', description: 'Convocation instruction homme' },
      { id: 'convocation-instruction-f', name: 'Convocation Instruction (F)', type: 'convocation', description: 'Convocation instruction femme' },
      { id: 'convocation-correctionnel-h', name: 'Convocation Correctionnel (H)', type: 'convocation', description: 'Convocation correctionnel homme' },
      { id: 'convocation-correctionnel-f', name: 'Convocation Correctionnel (F)', type: 'convocation', description: 'Convocation correctionnel femme' },
      { id: 'devis', name: 'Devis', type: 'administratif', description: 'Devis d\'expertise' },
      { id: 'lrar', name: 'LRAR', type: 'administratif', description: 'Lettre recommandée AR' },
      { id: 'interprete', name: 'Interprète', type: 'administratif', description: 'Demande d\'interprète' }
    ];
    
    const templatesList = templates && templates.length > 0 ? templates : defaultTemplates;
    
    templatesGrid.innerHTML = templatesList.map(template => `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-header">
          <div class="template-icon">
            <i class="fas ${this.getTemplateIcon(template.type)}"></i>
          </div>
          <div class="template-type">${template.type}</div>
        </div>
        
        <div class="template-content">
          <h4>${template.name}</h4>
          <p>${template.description}</p>
        </div>
        
        <div class="template-actions">
          <button class="template-btn primary" 
                  data-action="select-template" 
                  data-template-id="${template.id}"
                  data-template-name="${template.name}">
            <i class="fas fa-check"></i>
            Sélectionner
          </button>
        </div>
      </div>
    `).join('');
    
    // Mettre à jour le compteur
    const countElement = document.getElementById('templates-count');
    if (countElement) {
      countElement.textContent = templatesList.length;
    }
  }
  
  async loadExpertises() {
    try {
      const expertises = await this.dataManager.getAllExpertises();
      this.renderExpertisesList(expertises);
    } catch (error) {
      console.error('Erreur chargement expertises:', error);
      this.showError('Erreur de chargement des expertises');
    }
  }
  
  renderExpertisesList(expertises) {
    const expertisesList = document.getElementById('mailing-expertises-list');
    if (!expertisesList) return;
    
    if (!expertises || expertises.length === 0) {
      expertisesList.innerHTML = `
        <div class="empty-expertises">
          <i class="fas fa-folder-open"></i>
          <h4>Aucune expertise</h4>
          <p>Aucune expertise disponible pour le publipostage</p>
        </div>
      `;
      return;
    }
    
    expertisesList.innerHTML = expertises.map(expertise => `
      <div class="expertise-item" data-expertise-id="${expertise._uniqueId || expertise.id}">
        <div class="expertise-checkbox">
          <input type="checkbox" class="expertise-check" data-id="${expertise._uniqueId || expertise.id}">
        </div>
        
        <div class="expertise-info">
          <div class="expertise-main">
            <h4>${expertise.patronyme}</h4>
            <span class="expertise-dossier">${expertise.numero_parquet || expertise.numero_instruction || 'N/A'}</span>
          </div>
          
          <div class="expertise-details">
            <span class="expertise-date">
              ${expertise.date_examen ? this.formatDate(expertise.date_examen) : 'Date non définie'}
            </span>
            <span class="expertise-lieu">${expertise.lieu_examen}</span>
            <span class="expertise-status ${expertise.statut}">${expertise.statut}</span>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  setupInteractions(container) {
    const prevBtn = container.querySelector('#prev-step');
    const nextBtn = container.querySelector('#next-step');
    const generateBtn = container.querySelector('#generate-documents');
    const selectAllBtn = container.querySelector('#select-all-expertises');
    const clearSelectionBtn = container.querySelector('#clear-selection');
    
    // Navigation entre étapes
    prevBtn?.addEventListener('click', () => this.previousStep());
    nextBtn?.addEventListener('click', () => this.nextStep());
    
    // Génération
    generateBtn?.addEventListener('click', () => this.generateDocuments());
    
    // Sélection expertises
    selectAllBtn?.addEventListener('click', () => this.selectAllExpertises());
    clearSelectionBtn?.addEventListener('click', () => this.clearSelection());
    
    // Actions sur les templates et expertises
    container.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        const actionType = action.getAttribute('data-action');
        const templateId = action.getAttribute('data-template-id');
        const templateName = action.getAttribute('data-template-name');
        this.handleAction(actionType, { templateId, templateName });
      }
    });
    
    // Gestion des checkboxes
    container.addEventListener('change', (e) => {
      if (e.target.classList.contains('expertise-check')) {
        this.updateSelectionCount();
      }
    });
  }
  
  handleAction(action, data) {
    switch (action) {
      case 'select-template':
        this.selectTemplate(data.templateId, data.templateName);
        break;
    }
  }
  
  selectTemplate(templateId, templateName) {
    // Marquer le template sélectionné
    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`[data-template-id="${templateId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }
    
    // Sauvegarder la sélection
    this.selectedTemplate = { id: templateId, name: templateName };
    
    // Activer le bouton suivant
    document.getElementById('next-step').disabled = false;
    
    // Mettre à jour le résumé
    const templateNameElement = document.getElementById('selected-template-name');
    if (templateNameElement) {
      templateNameElement.textContent = templateName;
    }
  }
  
  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
      this.updateStepDisplay();
      
      // Charger les données de l'étape
      if (this.currentStep === 2) {
        this.loadExpertises();
      }
    }
  }
  
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepDisplay();
    }
  }
  
  updateStepDisplay() {
    // Mettre à jour les étapes visuelles
    document.querySelectorAll('.workflow-step').forEach((step, index) => {
      step.classList.toggle('active', index + 1 <= this.currentStep);
      step.classList.toggle('completed', index + 1 < this.currentStep);
    });
    
    // Afficher/masquer les sections
    document.querySelectorAll('.mailing-step').forEach((step, index) => {
      step.classList.toggle('hidden', index + 1 !== this.currentStep);
    });
    
    // Mettre à jour les boutons de navigation
    document.getElementById('prev-step').disabled = this.currentStep === 1;
    document.getElementById('next-step').disabled = !this.canProceedToNext();
    document.getElementById('current-step').textContent = this.currentStep;
  }
  
  canProceedToNext() {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedTemplate;
      case 2:
        return this.getSelectedExpertises().length > 0;
      case 3:
        return false; // Dernière étape
      default:
        return false;
    }
  }
  
  getSelectedExpertises() {
    const checkboxes = document.querySelectorAll('.expertise-check:checked');
    return Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
  }
  
  updateSelectionCount() {
    const selectedCount = this.getSelectedExpertises().length;
    
    // Mettre à jour le bouton suivant
    document.getElementById('next-step').disabled = selectedCount === 0;
    
    // Mettre à jour le résumé
    const countElement = document.getElementById('selected-expertises-count');
    if (countElement) {
      countElement.textContent = selectedCount;
    }
  }
  
  selectAllExpertises() {
    const checkboxes = document.querySelectorAll('.expertise-check');
    checkboxes.forEach(cb => cb.checked = true);
    this.updateSelectionCount();
  }
  
  clearSelection() {
    const checkboxes = document.querySelectorAll('.expertise-check');
    checkboxes.forEach(cb => cb.checked = false);
    this.updateSelectionCount();
  }
  
  async generateDocuments() {
    const selectedExpertises = this.getSelectedExpertises();
    
    if (!this.selectedTemplate || selectedExpertises.length === 0) {
      this.showError('Sélection incomplète');
      return;
    }
    
    // Afficher la progression
    const progressContainer = document.getElementById('generation-progress');
    const resultsContainer = document.getElementById('generation-results');
    
    progressContainer.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    
    try {
      console.log('Génération documents:', {
        template: this.selectedTemplate,
        expertises: selectedExpertises
      });
      
      // Simulation de génération
      await this.simulateGeneration();
      
      // Afficher les résultats
      this.showGenerationResults(selectedExpertises);
      
    } catch (error) {
      console.error('Erreur génération:', error);
      this.showError('Erreur lors de la génération');
    } finally {
      progressContainer.classList.add('hidden');
    }
  }
  
  async simulateGeneration() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    const steps = [
      'Préparation des données...',
      'Fusion des templates...',
      'Génération des documents...',
      'Finalisation...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      progressText.textContent = steps[i];
      progressFill.style.width = `${(i + 1) * 25}%`;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  showGenerationResults(selectedExpertises) {
    const resultsContainer = document.getElementById('generation-results');
    const resultsList = document.getElementById('results-list');
    
    // Simuler les résultats
    resultsList.innerHTML = selectedExpertises.map((id, index) => `
      <div class="result-item">
        <div class="result-icon">
          <i class="fas fa-file-word"></i>
        </div>
        <div class="result-info">
          <span class="result-name">${this.selectedTemplate.name}_${index + 1}.docx</span>
          <span class="result-size">45 KB</span>
        </div>
        <div class="result-actions">
          <button class="result-btn" data-action="download" data-file-id="${id}">
            <i class="fas fa-download"></i>
          </button>
        </div>
      </div>
    `).join('');
    
    resultsContainer.classList.remove('hidden');
  }
  
  getTemplateIcon(type) {
    const icons = {
      'convocation': 'fa-paper-plane',
      'administratif': 'fa-file-alt',
      'rapport': 'fa-file-medical',
      'facturation': 'fa-euro-sign'
    };
    return icons[type] || 'fa-file';
  }
  
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }
  
  showError(message) {
    if (this.notificationManager) {
      this.notificationManager.showToast(message, 'error');
    }
  }
  
  async refresh() {
    console.log('📧 Mailing rafraîchi');
    await this.loadTemplates();
  }
  
  destroy() {
    console.log('📧 Mailing PWA détruit');
  }
}