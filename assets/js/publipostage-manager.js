/**
 * Publipostage Manager - Gestion du publipostage multi-templates PWA
 * Sélection multiple et téléchargement dans dossier Téléchargements
 */

class PublipostageManager {
  constructor() {
    this.selectedTemplates = new Set();
    this.availableTemplates = [
      {
        id: 'afm',
        name: 'AFM',
        description: 'Avis de Fin de Mission',
        icon: '📄',
        filename: 'AFM.docx'
      },
      {
        id: 'convocation',
        name: 'Convocation',
        description: 'Convocation d\'expertise',
        icon: '📧',
        filename: 'Convocation_Instru.docx'
      },
      {
        id: 'rapport',
        name: 'Rapport',
        description: 'Rapport d\'expertise',
        icon: '📋',
        filename: 'Rapport_Expertise.docx'
      },
      {
        id: 'facture',
        name: 'Facture',
        description: 'Facture d\'honoraires',
        icon: '💰',
        filename: 'Facture.docx'
      },
      {
        id: 'devis',
        name: 'Devis',
        description: 'Devis d\'expertise',
        icon: '💼',
        filename: 'Devis.docx'
      },
      {
        id: 'certificat',
        name: 'Certificat',
        description: 'Certificat médical',
        icon: '🏥',
        filename: 'Certificat.docx'
      }
    ];
    
    this.isInitialized = false;
    this.init();
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('[PublipostageManager] Initialisation...');
    // Déjà initialisé dans le constructeur via init()
    this.isInitialized = true;
    console.log('[PublipostageManager] ✅ Initialisé');
  }
  
  init() {
    console.log('[PublipostageManager] Initialisation...');
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Écouter l'activation du module publipostage
    document.addEventListener('moduleactivated', (event) => {
      if (event.detail.module === 'publipostage') {
        this.renderPublipostageModule();
      }
    });
    
    // Écouter les événements de synchronisation BDD
    window.addEventListener('databasesync', (event) => {
      console.log('[PublipostageManager] BDD synchronisée, mise à jour des données');
      this.updateExpertisesList();
    });
  }
  
  renderPublipostageModule() {
    const container = document.getElementById('module-container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="publipostage-module">
        <h2>📄 Publipostage Multi-Templates</h2>
        <p>Sélectionnez une ou plusieurs expertises et les templates à générer</p>
        
        <!-- Filtre et recherche -->
        <div class="expertise-filter">
          <input type="text" id="expertise-search" placeholder="Rechercher une expertise..." />
          <select id="expertise-status">
            <option value="">Tous les statuts</option>
            <option value="programmee">Programmées</option>
            <option value="realisee">Réalisées</option>
            <option value="attente">En attente</option>
          </select>
        </div>
        
        <!-- Liste des expertises avec scroll horizontal -->
        <div class="horizontal-scroll" id="expertises-scroll">
          <div class="scroll-item loading-placeholder">
            <p>🔄 Chargement des expertises...</p>
            <p>Synchronisez la base de données si nécessaire</p>
          </div>
        </div>
        
        <!-- Sélection des templates -->
        <div class="publipostage-selector">
          <h3>📋 Templates disponibles</h3>
          <div class="template-grid" id="template-grid">
            ${this.renderTemplateCards()}
          </div>
          
          <!-- Actions -->
          <div class="publipostage-actions">
            <button class="publipostage-button" id="select-all-templates">
              Tout sélectionner
            </button>
            <button class="publipostage-button" id="clear-templates">
              Tout désélectionner
            </button>
            <button class="publipostage-button" id="generate-documents" disabled>
              Générer les documents (<span id="selected-count">0</span>)
            </button>
          </div>
        </div>
        
        <!-- Statut génération -->
        <div class="generation-status" id="generation-status" style="display: none;">
          <h3>📈 Progression</h3>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
            <span class="progress-text" id="progress-text">0%</span>
          </div>
          <div class="generation-log" id="generation-log"></div>
        </div>
      </div>
    `;
    
    this.setupPublipostageEvents();
    this.loadExpertises();
  }
  
  renderTemplateCards() {
    return this.availableTemplates.map(template => `
      <div class="template-card" data-template="${template.id}">
        <div class="template-icon" style="font-size: 32px;">${template.icon}</div>
        <div class="template-name">${template.name}</div>
        <div class="template-description">${template.description}</div>
      </div>
    `).join('');
  }
  
  setupPublipostageEvents() {
    // Sélection des templates
    document.getElementById('template-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.template-card');
      if (card) {
        const templateId = card.dataset.template;
        this.toggleTemplate(templateId, card);
      }
    });
    
    // Boutons de sélection
    document.getElementById('select-all-templates').addEventListener('click', () => {
      this.selectAllTemplates();
    });
    
    document.getElementById('clear-templates').addEventListener('click', () => {
      this.clearTemplates();
    });
    
    // Génération
    document.getElementById('generate-documents').addEventListener('click', () => {
      this.generateDocuments();
    });
    
    // Recherche et filtre
    document.getElementById('expertise-search').addEventListener('input', (e) => {
      this.filterExpertises(e.target.value);
    });
    
    document.getElementById('expertise-status').addEventListener('change', (e) => {
      this.filterExpertisesByStatus(e.target.value);
    });
  }
  
  toggleTemplate(templateId, cardElement) {
    if (this.selectedTemplates.has(templateId)) {
      this.selectedTemplates.delete(templateId);
      cardElement.classList.remove('selected');
    } else {
      this.selectedTemplates.add(templateId);
      cardElement.classList.add('selected');
    }
    
    this.updateSelectedCount();
  }
  
  selectAllTemplates() {
    this.availableTemplates.forEach(template => {
      this.selectedTemplates.add(template.id);
    });
    
    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.add('selected');
    });
    
    this.updateSelectedCount();
  }
  
  clearTemplates() {
    this.selectedTemplates.clear();
    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    this.updateSelectedCount();
  }
  
  updateSelectedCount() {
    const count = this.selectedTemplates.size;
    document.getElementById('selected-count').textContent = count;
    document.getElementById('generate-documents').disabled = count === 0;
  }
  
  async loadExpertises() {
    try {
      // Charger depuis IndexedDB d'abord
      let expertises = [];
      
      if (window.offlineManager) {
        const localData = await window.offlineManager.getAllData();
        if (localData) {
          expertises = [
            ...(localData.agenda || []),
            ...(localData.waitlist || []),
            ...(localData.expertises || [])
          ];
        }
      }
      
      // Essayer de charger depuis le serveur si connecté
      if (window.syncManager && window.syncManager.tailscaleConnected) {
        try {
          const response = await fetch(`${window.syncManager.config.server.primary}/api/expertises`, {
            headers: {
              'X-Device-Type': window.syncManager.getDeviceType()
            }
          });
          
          if (response.ok) {
            const serverData = await response.json();
            expertises = serverData.expertises || expertises;
          }
        } catch (error) {
          console.log('[PublipostageManager] Serveur non disponible, utilisation cache local');
        }
      }
      
      this.renderExpertises(expertises);
      
    } catch (error) {
      console.error('[PublipostageManager] Erreur chargement expertises:', error);
      this.showError('Erreur lors du chargement des expertises');
    }
  }
  
  renderExpertises(expertises) {
    const container = document.getElementById('expertises-scroll');
    if (!container) return;
    
    if (!expertises || expertises.length === 0) {
      container.innerHTML = `
        <div class="scroll-item">
          <h3>Aucune expertise</h3>
          <p>Synchronisez la base de données pour charger les expertises</p>
        </div>
      `;
      return;
    }
    
    // Ajouter un ID unique si manquant
    expertises.forEach((expertise, index) => {
      if (!expertise.id) {
        expertise.id = `expertise_${index}`;
      }
    });
    
    container.innerHTML = expertises.map(expertise => `
      <div class="scroll-item expertise-card" data-expertise-id="${expertise.id}">
        <h3>${expertise.patronyme || 'Sans nom'}</h3>
        <p><strong>Date:</strong> ${expertise.date_examen || 'Non définie'}</p>
        <p><strong>Type:</strong> ${expertise.type_mission || 'Non précisé'}</p>
        <p><strong>Statut:</strong> ${this.getStatusBadge(expertise.statut || 'inconnu')}</p>
        <p><strong>Tribunal:</strong> ${expertise.tribunal || 'Non précisé'}</p>
        <div class="expertise-actions">
          <button class="expertise-select-btn" onclick="publipostageManager.toggleExpertise('${expertise.id}', this)">
            Sélectionner
          </button>
        </div>
      </div>
    `).join('');
    
    this.allExpertises = expertises;
  }
  
  getStatusBadge(status) {
    const badges = {
      'realisee': '<span class="status-badge success">✅ Réalisée</span>',
      'programmee': '<span class="status-badge warning">📅 Programmée</span>',
      'attente': '<span class="status-badge info">⏳ En attente</span>',
      'inconnu': '<span class="status-badge secondary">❓ Inconnu</span>'
    };
    return badges[status] || badges['inconnu'];
  }
  
  toggleExpertise(expertiseId, buttonElement) {
    const card = buttonElement.closest('.expertise-card');
    
    if (card.classList.contains('selected')) {
      card.classList.remove('selected');
      buttonElement.textContent = 'Sélectionner';
      this.selectedExpertises = this.selectedExpertises || new Set();
      this.selectedExpertises.delete(expertiseId);
    } else {
      card.classList.add('selected');
      buttonElement.textContent = 'Désélectionner';
      this.selectedExpertises = this.selectedExpertises || new Set();
      this.selectedExpertises.add(expertiseId);
    }
    
    this.updateGenerateButton();
  }
  
  updateGenerateButton() {
    const hasExpertises = this.selectedExpertises && this.selectedExpertises.size > 0;
    const hasTemplates = this.selectedTemplates.size > 0;
    const generateBtn = document.getElementById('generate-documents');
    
    if (generateBtn) {
      generateBtn.disabled = !hasExpertises || !hasTemplates;
      
      if (hasExpertises && hasTemplates) {
        generateBtn.innerHTML = `Générer ${this.selectedExpertises.size} expertise(s) × ${this.selectedTemplates.size} template(s)`;
      }
    }
  }
  
  filterExpertises(searchTerm) {
    if (!this.allExpertises) return;
    
    const filtered = this.allExpertises.filter(expertise => {
      const text = `${expertise.patronyme} ${expertise.type_mission} ${expertise.tribunal}`.toLowerCase();
      return text.includes(searchTerm.toLowerCase());
    });
    
    this.renderExpertises(filtered);
  }
  
  filterExpertisesByStatus(status) {
    if (!this.allExpertises) return;
    
    let filtered = this.allExpertises;
    if (status) {
      filtered = this.allExpertises.filter(expertise => expertise.statut === status);
    }
    
    this.renderExpertises(filtered);
  }
  
  async generateDocuments() {
    if (!this.selectedExpertises || this.selectedExpertises.size === 0) {
      this.showError('Veuillez sélectionner au moins une expertise');
      return;
    }
    
    if (this.selectedTemplates.size === 0) {
      this.showError('Veuillez sélectionner au moins un template');
      return;
    }
    
    this.showGenerationStatus();
    
    const expertises = Array.from(this.selectedExpertises).map(id => 
      this.allExpertises.find(exp => exp.id === id)
    ).filter(Boolean);
    
    const templates = Array.from(this.selectedTemplates);
    const total = expertises.length * templates.length;
    let completed = 0;
    
    const results = [];
    
    for (const expertise of expertises) {
      for (const templateId of templates) {
        try {
          this.updateProgress(completed, total, `Génération ${expertise.patronyme} - ${templateId}...`);
          
          const result = await this.generateSingleDocument(expertise, templateId);
          results.push(result);
          
          completed++;
          this.updateProgress(completed, total, `${expertise.patronyme} - ${templateId} ✅`);
          
          // Petite pause pour éviter de surcharger
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Erreur génération ${expertise.patronyme} - ${templateId}:`, error);
          this.logError(`❌ ${expertise.patronyme} - ${templateId}: ${error.message}`);
          completed++;
        }
      }
    }
    
    // Télécharger tous les fichiers générés
    if (results.length > 0) {
      await this.downloadAllFiles(results);
      this.showSuccess(`✅ ${results.length} documents générés et téléchargés !`);
    } else {
      this.showError('Aucun document n\'a pu être généré');
    }
    
    this.hideGenerationStatus();
  }
  
  async generateSingleDocument(expertise, templateId) {
    const template = this.availableTemplates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} non trouvé`);
    }
    
    // Appeler l'API de génération
    const response = await fetch(`${window.syncManager.config.server.primary}/api/publipostage/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Type': window.syncManager.getDeviceType()
      },
      body: JSON.stringify({
        expertise: expertise,
        template: template.filename,
        outputName: `${expertise.patronyme}_${template.name}_${new Date().getTime()}.docx`
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erreur serveur: ${response.status}`);
    }
    
    const blob = await response.blob();
    const filename = `${expertise.patronyme}_${template.name}.docx`;
    
    return {
      blob: blob,
      filename: filename,
      expertise: expertise.patronyme,
      template: template.name
    };
  }
  
  async downloadAllFiles(results) {
    // Télécharger chaque fichier individuellement dans le dossier Téléchargements
    for (const result of results) {
      await this.downloadFile(result.blob, result.filename);
      await new Promise(resolve => setTimeout(resolve, 200)); // Pause entre téléchargements
    }
  }
  
  async downloadFile(blob, filename) {
    // Utiliser l'API File System Access si disponible (Chrome/Edge récents)
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Documents Word',
            accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        return;
      } catch (error) {
        console.log('File System Access API non disponible, utilisation fallback');
      }
    }
    
    // Fallback classique
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
  
  showGenerationStatus() {
    const status = document.getElementById('generation-status');
    if (status) {
      status.style.display = 'block';
      status.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  hideGenerationStatus() {
    setTimeout(() => {
      const status = document.getElementById('generation-status');
      if (status) {
        status.style.display = 'none';
      }
    }, 2000);
  }
  
  updateProgress(completed, total, message) {
    const percentage = Math.round((completed / total) * 100);
    
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${percentage}%`;
    }
    
    this.logMessage(message);
  }
  
  logMessage(message) {
    const log = document.getElementById('generation-log');
    if (log) {
      const p = document.createElement('p');
      p.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    }
  }
  
  logError(message) {
    const log = document.getElementById('generation-log');
    if (log) {
      const p = document.createElement('p');
      p.style.color = 'var(--danger-color)';
      p.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    }
  }
  
  showError(message) {
    this.showToast(message, 'error');
  }
  
  showSuccess(message) {
    this.showToast(message, 'success');
  }
  
  showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
  
  updateExpertisesList() {
    // Recharger les expertises après synchronisation
    this.loadExpertises();
  }
}

// Exposer la classe PublipostageManager globalement pour instanciation dans app.js
window.PublipostageManager = PublipostageManager;

console.log('[PublipostageManager] Chargé et initialisé');