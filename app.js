// CrimiTrack Portable - Application principale
class CrimiTrackApp {
  constructor() {
    this.database = { expertises: [] };
    this.currentTab = 'agenda';
    this.selectedExpertises = new Set();
    this.currentTemplate = null;
    this.db = null; // IndexedDB instance
    this.init();
  }

  async init() {
    // Enregistrer le service worker
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/crimitrack-pwa/service-worker.js', {
          scope: '/crimitrack-pwa/'
        });
        console.log('Service Worker enregistré');
      } catch (error) {
        console.error('Erreur Service Worker:', error);
      }
    }

    // Initialiser IndexedDB
    await this.initIndexedDB();
    
    // Charger la base de données
    await this.loadDatabase();
    
    // Migrer depuis localStorage si nécessaire
    await this.migrateFromLocalStorage();
    
    // Initialiser les event listeners
    this.initEventListeners();
    
    // Afficher le premier onglet
    this.showTab('agenda');
    
    // Mettre à jour les statistiques
    this.updateStatistics();
    
    // Vérifier FileSaver.js
    this.checkFileSaver();
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CrimiTrackDB', 2);
      
      request.onerror = () => {
        console.error('Erreur ouverture IndexedDB');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialisé');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Créer le store pour la base de données
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database', { keyPath: 'id' });
        }
      };
    });
  }

  async migrateFromLocalStorage() {
    // Vérifier s'il y a des données dans localStorage
    const localData = localStorage.getItem('crimitrack_database');
    if (localData && this.database.expertises.length === 0) {
      try {
        const parsedData = JSON.parse(localData);
        this.database = parsedData;
        // SANITISER LES DONNÉES MIGRÉES
        this.sanitizeLoadedData();
        await this.saveDatabase();
        // Supprimer de localStorage après migration réussie
        localStorage.removeItem('crimitrack_database');
        console.log('Migration depuis localStorage réussie et données nettoyées');
      } catch (error) {
        console.error('Erreur migration localStorage:', error);
      }
    }
  }

  async loadDatabase() {
    if (!this.db) {
      console.error('IndexedDB non initialisé');
      this.database = { expertises: [] };
      return;
    }
    
    try {
      // Charger depuis IndexedDB
      const transaction = this.db.transaction(['database'], 'readonly');
      const store = transaction.objectStore('database');
      const request = store.get('main');
      
      return new Promise((resolve) => {
        request.onsuccess = async () => {
          if (request.result) {
            this.database = request.result.data;
            console.log('Base de données chargée depuis IndexedDB');
            // SANITISER LES DONNÉES AU CHARGEMENT
            this.sanitizeLoadedData();
          } else {
            // Charger le fichier par défaut si aucune donnée
            try {
              const response = await fetch('/database.json');
              if (response.ok) {
                this.database = await response.json();
                // SANITISER LES DONNÉES AU CHARGEMENT
                this.sanitizeLoadedData();
                await this.saveDatabase();
              }
            } catch (error) {
              console.log('Pas de fichier database.json par défaut');
              this.database = { expertises: [] };
            }
          }
          resolve();
        };
        
        request.onerror = () => {
          console.error('Erreur chargement IndexedDB:', request.error);
          this.database = { expertises: [] };
          resolve();
        };
      });
    } catch (error) {
      console.error('Erreur chargement BDD:', error);
      this.database = { expertises: [] };
    }
  }

  // Nouvelle méthode pour sanitiser les données chargées
  sanitizeLoadedData() {
    console.log('🧹 Sanitisation des données chargées...');
    
    if (!this.database || !this.database.expertises) {
      return;
    }
    
    let sanitizedCount = 0;
    
    this.database.expertises = this.database.expertises.map(expertise => {
      let modified = false;
      const sanitized = {};
      
      Object.keys(expertise).forEach(key => {
        const value = expertise[key];
        
        // Ne pas toucher aux champs système
        if (key.startsWith('_')) {
          sanitized[key] = value;
          return;
        }
        
        // Sanitiser les valeurs problématiques
        if (value === undefined || 
            value === 'undefined' || 
            value === null || 
            value === 'null' ||
            String(value).toLowerCase() === 'undefined') {
          sanitized[key] = '';
          modified = true;
          console.log(`  ✨ Nettoyage: ${key} était "${value}", maintenant ""`);
        } else {
          sanitized[key] = value;
        }
      });
      
      if (modified) {
        sanitizedCount++;
      }
      
      return sanitized;
    });
    
    if (sanitizedCount > 0) {
      console.log(`✅ ${sanitizedCount} expertise(s) nettoyée(s)`);
      // Sauvegarder automatiquement les données nettoyées
      this.saveDatabase();
    } else {
      console.log('✅ Toutes les données sont propres');
    }
  }

  async saveDatabase() {
    if (!this.db) {
      console.error('IndexedDB non initialisé');
      return;
    }
    
    try {
      const transaction = this.db.transaction(['database'], 'readwrite');
      const store = transaction.objectStore('database');
      const request = store.put({
        id: 'main',
        data: this.database,
        timestamp: new Date().toISOString()
      });
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          this.showNotification('Base de données sauvegardée');
          resolve();
        };
        
        request.onerror = () => {
          console.error('Erreur sauvegarde IndexedDB:', request.error);
          this.showNotification('Erreur lors de la sauvegarde', 'danger');
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      this.showNotification('Erreur lors de la sauvegarde', 'danger');
    }
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
    
    // Filtre de recherche unifié
    document.getElementById('search-global')?.addEventListener('input', () => this.updateAgenda());
    document.getElementById('clear-filters')?.addEventListener('click', () => this.clearFilters());
    
    // Filtres onglet Prisons
    document.getElementById('prison-search')?.addEventListener('input', () => this.updatePrisons());
    document.getElementById('prison-filter')?.addEventListener('change', () => this.updatePrisons());
    
    // Filtres onglet Interprètes
    document.getElementById('interpretes-search')?.addEventListener('input', () => this.updateInterpretes());
    document.getElementById('interpretes-sort')?.addEventListener('change', () => this.updateInterpretes());
    
    
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
    document.getElementById('publi-search')?.addEventListener('input', (e) => this.filterPublipostage(e.target.value));
    
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
      case 'interpretes':
        this.updateInterpretes();
        break;
      case 'prisons':
        this.updatePrisons();
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
    const searchGlobal = document.getElementById('search-global')?.value?.toLowerCase() || '';
    
    let expertises = [...this.database.expertises];
    
    // Par défaut, afficher les prochaines expertises (aujourd'hui et futur)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Si pas de filtre spécifique ou "all", afficher les prochaines expertises
    if (filterType === 'all' && !dateFilter) {
      expertises = expertises.filter(exp => {
        if (!exp.date_examen) return false;
        const date = new Date(exp.date_examen);
        return date >= today && exp.statut !== 'realisee';
      });
    } else if (dateFilter) {
      // Filtrer par date spécifique
      expertises = expertises.filter(exp => exp.date_examen === dateFilter);
    } else {
      // Appliquer les autres filtres
      switch(filterType) {
        case 'today':
          expertises = expertises.filter(exp => exp.date_examen === todayStr);
          break;
        case 'week':
          const weekEnd = new Date(today);
          weekEnd.setDate(today.getDate() + 7);
          expertises = expertises.filter(exp => {
            if (!exp.date_examen) return false;
            const date = new Date(exp.date_examen);
            return date >= today && date <= weekEnd;
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
    }
    
    // Filtrer par recherche globale (nom, magistrat, tribunal)
    if (searchGlobal) {
      expertises = expertises.filter(exp => 
        exp.patronyme?.toLowerCase().includes(searchGlobal) ||
        exp.magistrat?.toLowerCase().includes(searchGlobal) ||
        exp.tribunal?.toLowerCase().includes(searchGlobal) ||
        exp.lieu_examen?.toLowerCase().includes(searchGlobal)
      );
    }
    
    // Trier par date (prochaines en premier)
    expertises.sort((a, b) => new Date(a.date_examen || '2099-12-31') - new Date(b.date_examen || '2099-12-31'));
    
    // Grouper par date pour ajouter des séparateurs
    if (expertises.length > 0) {
      let html = '';
      let lastDisplayedDate = null;
      
      expertises.forEach((exp, index) => {
        const expDate = exp.date_examen;
        
        // Ajouter un séparateur pour chaque nouvelle date
        if (expDate && expDate !== lastDisplayedDate) {
          // Ajouter un espacement avant le séparateur (sauf pour le premier)
          if (index > 0 && lastDisplayedDate !== null) {
            html += '<div style="margin: 1.5rem 0;"></div>';
          }
          
          // Créer le séparateur de date
          const dateObj = new Date(expDate);
          const formatDateSeparator = dateObj.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit'
          });
          
          html += `
            <div class="date-separator">
              <span class="date-line">────── ${formatDateSeparator} ──────</span>
            </div>
          `;
          
          lastDisplayedDate = expDate;
        }
        
        // Ajouter la carte d'expertise
        html += this.createExpertiseCard(exp, false, true);
      });
      
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Aucune expertise à venir</p>';
    }
  }
  
  clearFilters() {
    document.getElementById('agenda-date').value = '';
    document.getElementById('agenda-filter').value = 'all';
    const searchGlobal = document.getElementById('search-global');
    if (searchGlobal) searchGlobal.value = '';
    this.updateAgenda();
  }

  updateWaitlist(status) {
    const container = document.getElementById('waitlist-content');
    if (!container) return;
    
    let expertises = [...this.database.expertises];
    
    // Filtrer par statut - corriger la logique
    if (status === 'programmees') {
      // Programmées = celles qui ont une date d'examen dans le futur ou statut programmée
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expertises = expertises.filter(exp => {
        if (exp.statut === 'programmee') return true;
        if (exp.date_examen) {
          const examDate = new Date(exp.date_examen);
          return examDate >= today && exp.statut !== 'realisee';
        }
        return false;
      });
    } else {
      // En attente = pas de statut ou statut "attente" ou pas de date d'examen
      expertises = expertises.filter(exp => {
        return exp.statut === 'attente' || 
               (!exp.statut && exp.statut !== 'realisee' && exp.statut !== 'programmee') ||
               (!exp.date_examen && exp.statut !== 'realisee');
      });
    }
    
    // Trier par date
    expertises.sort((a, b) => {
      const dateA = new Date(a.date_examen || '2099-12-31');
      const dateB = new Date(b.date_examen || '2099-12-31');
      return dateA - dateB;
    });
    
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

  updatePublipostage(searchTerm = '') {
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
    
    // Trier les expertises par date (plus récentes en premier)
    let expertises = [...this.database.expertises].sort((a, b) => {
      const dateA = new Date(a.date_examen || '1900-01-01');
      const dateB = new Date(b.date_examen || '1900-01-01');
      return dateB - dateA;
    });
    
    // Filtrer par recherche si un terme est fourni
    if (searchTerm) {
      expertises = expertises.filter(exp => 
        exp.patronyme?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      // Si pas de recherche, limiter aux 10 dernières
      expertises = expertises.slice(0, 10);
    }
    
    // Afficher les expertises avec gestion sécurisée des événements
    container.innerHTML = expertises.length ? expertises.map(exp => {
      const safeId = exp._uniqueId ? exp._uniqueId.replace(/'/g, "\\'") : '';
      const isSelected = this.selectedExpertises.has(exp._uniqueId);
      
      return `
      <div class="expertise-card ${isSelected ? 'selected' : ''}" 
           data-expertise-id="${safeId}"
           onclick="app.handleExpertiseCardClick(event, '${safeId}')">
        <div class="card-header">
          <span class="card-title">${exp.patronyme || 'Sans nom'}</span>
          <input type="checkbox" ${isSelected ? 'checked' : ''} 
                 onchange="app.handleCheckboxChange(event, '${safeId}')">
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
      `;
    }).join('') : '<p style="text-align: center; color: var(--text-secondary);">Aucune expertise trouvée</p>';
  }
  
  filterPublipostage(searchTerm) {
    this.updatePublipostage(searchTerm);
  }

  toggleExpertiseSelection(id) {
    // Validation de sécurité : vérifier que l'expertise existe
    const expertise = this.database.expertises.find(exp => exp._uniqueId === id);
    if (!expertise) {
      console.warn('Tentative de sélection d\'une expertise inexistante:', id);
      return;
    }
    
    if (this.selectedExpertises.has(id)) {
      this.selectedExpertises.delete(id);
    } else {
      this.selectedExpertises.add(id);
    }
    this.updatePublipostage();
  }

  // Nouvelle fonction pour gérer les clics sur la card avec gestion d'événements sécurisée
  handleExpertiseCardClick(event, id) {
    // Empêcher la propagation si le clic vient du checkbox
    if (event.target.type === 'checkbox') {
      return; // Le checkbox gère sa propre logique
    }
    this.toggleExpertiseSelection(id);
  }

  // Fonction pour gérer le changement du checkbox
  handleCheckboxChange(event, id) {
    event.stopPropagation(); // Empêcher la propagation à la card
    this.toggleExpertiseSelection(id);
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
      
      console.log('🔍 GÉNÉRATION DOCUMENT - DEBUG ULTRATHINK');
      console.log(`📊 Nombre d'expertises sélectionnées: ${selected.length}`);
      
      // Pour chaque expertise, générer un document
      for (let i = 0; i < selected.length; i++) {
        const expertise = selected[i];
        
        console.log(`\n🎯 EXPERTISE ${i + 1}/${selected.length}`);
        console.log('📋 Expertise brute:', expertise);
        
        // FONCTION SANITIZE LOCALE SÉCURISÉE - plus de problème de contexte this
        const sanitizeLocal = (value, fieldName) => {
          console.log(`  🧹 Sanitize [${fieldName}]: "${value}" (type: ${typeof value})`);
          
          // Gérer tous les cas d'undefined
          if (value === null || 
              value === undefined || 
              value === 'null' || 
              value === 'undefined' || 
              value === '' || 
              String(value).trim() === '' ||
              String(value).toLowerCase() === 'undefined') {
            console.log(`    ➡️ Valeur vide détectée, retour: ""`);
            return '';
          }
          
          const result = String(value).trim();
          console.log(`    ➡️ Valeur nettoyée: "${result}"`);
          return result;
        };
        
        // FONCTION FORMAT DATE LOCALE SÉCURISÉE
        const formatDateLocal = (dateStr, fieldName) => {
          console.log(`  📅 Format date [${fieldName}]: "${dateStr}"`);
          
          if (!dateStr || 
              dateStr === 'null' || 
              dateStr === null || 
              dateStr === undefined ||
              String(dateStr).toLowerCase() === 'undefined') {
            console.log(`    ➡️ Date vide, retour: ""`);
            return '';
          }
          
          try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              console.log(`    ➡️ Date invalide, retour: ""`);
              return '';
            }
            const formatted = date.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            console.log(`    ➡️ Date formatée: "${formatted}"`);
            return formatted;
          } catch (error) {
            console.log(`    ❌ Erreur format date: ${error.message}`);
            return '';
          }
        };
        
        // CRÉATION DATA OBJECT AVEC LOGS DÉTAILLÉS
        console.log('🏗️ Construction de l\'objet data...');
        const data = {};
        
        // IMPORTANT: Il faut aussi garder les variables en minuscules pour certains templates
        // Donc on va créer les deux versions : MAJUSCULES et minuscules
        
        // 1. Variables en minuscules (pour compatibilité avec anciens templates)
        const fields = [
          'patronyme', 'lieu_examen', 'age', 'profession', 'domicile',
          'magistrat', 'tribunal', 'numero_parquet', 'numero_instruction',
          'chefs_accusation', 'opj_greffier', 'type_mission', 'statut'
        ];
        
        fields.forEach(field => {
          const rawValue = expertise[field];
          const cleanValue = sanitizeLocal(rawValue, field);
          data[field] = cleanValue;
        });
        
        // Dates en minuscules
        data.date_examen = formatDateLocal(expertise.date_examen, 'date_examen');
        data.date_naissance = formatDateLocal(expertise.date_naissance, 'date_naissance');
        
        // 2. AJOUTER aussi les variables EN MAJUSCULES pour les templates qui les utilisent
        data.NOM_PRENOM = data.patronyme;
        data.LIEU_EXAMEN = data.lieu_examen;
        data.AGE = data.age;
        data.PROFESSION = data.profession;
        data.DOMICILE = data.domicile;
        data.MAGISTRAT = data.magistrat;
        data.TRIBUNAL = data.tribunal;
        data.PROC_1 = data.numero_parquet;
        data.PROC_2 = data.numero_instruction;
        data.CHEFS_ACCUSATION = data.chefs_accusation;
        data.OPJ_GREFFIER = data.opj_greffier;
        data.TYPE_MISSION = data.type_mission;
        data.STATUT = data.statut;
        data.DATE_EXAMEN = data.date_examen;
        data.DATE_NAISSANCE = data.date_naissance;
        
        console.log('📊 Double mapping créé (minuscules + MAJUSCULES) pour compatibilité maximale');
        
        console.log('\n📦 OBJET DATA FINAL:');
        console.log(JSON.stringify(data, null, 2));
        
        // Vérification finale - détecter les undefined restants
        const undefinedFields = Object.entries(data).filter(([key, value]) => 
          value === undefined || value === 'undefined' || String(value).toLowerCase().includes('undefined')
        );
        
        if (undefinedFields.length > 0) {
          console.error('❌ ALERTE: Des champs contiennent encore "undefined":');
          undefinedFields.forEach(([key, value]) => {
            console.error(`  - ${key}: "${value}"`);
            data[key] = ''; // Force à vide si still undefined
          });
        } else {
          console.log('✅ Aucun champ "undefined" détecté');
        }
        
        // Créer une instance de PizZip avec le template
        console.log('📋 Création PizZip avec template...');
        const zip = new PizZip(this.currentTemplate);
        
        // Créer un nouveau Docxtemplater
        console.log('🔧 Création docxtemplater...');
        const doc = new window.docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: {
            start: '{',
            end: '}'
          }
        });
        
        console.log('🎯 DATA ENVOYÉ À DOCXTEMPLATER:');
        console.log('Keys:', Object.keys(data));
        console.log('Values:', Object.values(data));
        console.log('Full object:', data);
        
        // TEST CRITIQUE: Vérifier chaque propriété individuellement
        Object.entries(data).forEach(([key, value]) => {
          console.log(`  📝 ${key}: "${value}" (${typeof value}) [length: ${String(value).length}]`);
          if (String(value).includes('undefined')) {
            console.error(`    ❌ DANGER: La valeur contient "undefined"!`);
          }
        });
        
        // Remplacer les variables dans le template
        console.log('🔄 Appel doc.render() avec les données nettoyées...');
        try {
          // Utiliser directement les vraies données nettoyées
          doc.render(data);
          console.log('✅ doc.render() réussi avec données nettoyées');
          
        } catch (renderError) {
          console.error('❌ Erreur lors du render:', renderError);
          console.error('Stack:', renderError.stack);
          console.error('Propriétés problématiques:', renderError.properties);
          
          // Afficher les données qui ont causé l'erreur pour debug
          console.error('Données envoyées qui ont causé l\'erreur:');
          console.error(JSON.stringify(data, null, 2));
          
          throw renderError;
        }
        
        // Générer le document
        const out = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        // Créer un nom de fichier au format NOM.Prenom.docx
        let fileName;
        if (expertise.patronyme) {
          // Séparer le nom complet en parties
          const nameParts = expertise.patronyme.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            // Si on a nom et prénom, format NOM.Prenom
            const nom = nameParts[nameParts.length - 1].toUpperCase(); // Dernier mot = nom de famille
            const prenom = nameParts[0]; // Premier mot = prénom
            fileName = `${nom}.${prenom}.docx`;
          } else {
            // Si un seul mot, l'utiliser tel quel
            fileName = `${nameParts[0]}.docx`;
          }
        } else {
          fileName = 'export.docx';
        }
        
        // Nettoyer le nom de fichier des caractères invalides
        fileName = fileName.replace(/[/\\?%*:|"<>]/g, '-');
        
        // Si c'est le seul document ou si on veut télécharger individuellement
        console.log(`📄 Document prêt pour ${fileName}, taille: ${out.size} octets`);
        
        if (selected.length === 1) {
          console.log('📥 Téléchargement immédiat du document unique');
          if (typeof this.downloadFile === 'function') {
            this.downloadFile(out, fileName);
          } else {
            console.error('❌ downloadFile n\'est pas définie !');
            // Fallback direct si downloadFile n'existe pas
            if (typeof saveAs !== 'undefined') {
              saveAs(out, fileName);
            } else {
              const url = URL.createObjectURL(out);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          }
        } else {
          // Pour plusieurs documents, les télécharger avec un délai
          console.log(`📥 Téléchargement différé (${i * 500}ms) pour ${fileName}`);
          setTimeout(() => {
            if (typeof this.downloadFile === 'function') {
              this.downloadFile(out, fileName);
            } else {
              console.error('❌ downloadFile n\'est pas définie !');
              // Fallback direct
              if (typeof saveAs !== 'undefined') {
                saveAs(out, fileName);
              }
            }
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

  // Vérifier la disponibilité de FileSaver.js
  checkFileSaver() {
    console.log('🔍 Vérification de FileSaver.js...');
    
    if (typeof saveAs === 'function') {
      console.log('✅ FileSaver.js est disponible');
    } else {
      console.warn('⚠️ FileSaver.js n\'est PAS disponible');
      console.log('🔧 La méthode de fallback sera utilisée pour les téléchargements');
    }
    
    // Vérifier les autres dépendances
    console.log('📋 État des dépendances:');
    console.log('- PizZip:', typeof PizZip !== 'undefined' ? '✅' : '❌');
    console.log('- docxtemplater:', typeof docxtemplater !== 'undefined' ? '✅' : '❌');
    console.log('- saveAs:', typeof saveAs !== 'undefined' ? '✅' : '❌');
  }

  // Fonction de téléchargement avec fallback et débogage
  downloadFile(blob, fileName) {
    console.log('📥 Tentative de téléchargement:', fileName);
    console.log('📊 Blob info:', {
      size: blob.size,
      type: blob.type
    });
    
    try {
      // Vérifier si saveAs est disponible
      if (typeof saveAs === 'function') {
        console.log('✅ FileSaver.js détecté, utilisation de saveAs');
        saveAs(blob, fileName);
        console.log('✅ saveAs appelé avec succès');
      } else {
        console.warn('⚠️ FileSaver.js non disponible, utilisation du fallback');
        this.downloadFileFallback(blob, fileName);
      }
    } catch (error) {
      console.error('❌ Erreur avec saveAs:', error);
      console.log('🔄 Basculement vers la méthode de fallback');
      this.downloadFileFallback(blob, fileName);
    }
  }

  // Méthode de fallback pour le téléchargement
  downloadFileFallback(blob, fileName) {
    console.log('🔄 Utilisation de la méthode de fallback pour:', fileName);
    
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      console.log('🖱️ Simulation du clic pour téléchargement');
      a.click();
      
      // Nettoyer après un court délai
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('🧹 Nettoyage terminé');
      }, 100);
      
    } catch (error) {
      console.error('❌ Erreur dans la méthode de fallback:', error);
      this.showNotification('Impossible de télécharger le fichier. Vérifiez les paramètres de votre navigateur.', 'danger');
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
      paris: 0,
      creteil: 0,
      bobigny: 0,
      autres: 0
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
    
    // Calculer les délais d'attente par prison
    this.updatePrisonDelays();
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

  updatePrisonDelays() {
    // Configuration des prisons avec leurs paramètres
    const prisonConfig = {
      fresnes: {
        capacity: 5, // personnes par déplacement
        frequency: 1 // toutes les semaines (1 semaine)
      },
      villepinte: {
        capacity: 4, // personnes par déplacement
        frequency: 2 // une semaine sur 2 (2 semaines)
      },
      fleury: {
        capacity: 4, // personnes par déplacement
        frequency: 2 // une semaine sur 2 (2 semaines)
      },
      cj: {
        capacity: 7, // personnes par mardi
        frequency: 1 // tous les mardis (1 semaine)
      }
    };

    // Compter les expertises en attente pour chaque prison
    const waitingCounts = {
      fresnes: 0,
      villepinte: 0,
      fleury: 0,
      cj: 0
    };

    // Filtrer les expertises en attente
    this.database.expertises.filter(exp => exp.statut === 'en_attente').forEach(exp => {
      const lieu = (exp.lieu_examen || '').toLowerCase();
      
      if (lieu.includes('fresnes')) {
        waitingCounts.fresnes++;
      } else if (lieu.includes('villepinte')) {
        waitingCounts.villepinte++;
      } else if (lieu.includes('fleury')) {
        waitingCounts.fleury++;
      } else if (lieu.includes('cj') || lieu.includes('centre judiciaire')) {
        waitingCounts.cj++;
      }
    });

    // Calculer les délais en semaines
    Object.keys(prisonConfig).forEach(prison => {
      const waitingCount = waitingCounts[prison];
      const config = prisonConfig[prison];
      
      // Délai = (nombre en attente / capacité par déplacement) * fréquence
      const delay = Math.ceil(waitingCount / config.capacity) * config.frequency;
      
      // Mettre à jour l'interface
      const delayElement = document.getElementById(`delay-${prison}`);
      const detailElement = document.getElementById(`detail-${prison}`);
      
      if (delayElement) {
        delayElement.textContent = delay;
      }
      
      if (detailElement && waitingCount > 0) {
        const frequencyText = config.frequency === 1 ? 'semaine' : `${config.frequency} semaines`;
        detailElement.textContent = `${waitingCount} en attente • ${config.capacity} pers./${frequencyText}`;
      }
    });
  }

  createExpertiseCard(expertise, showActions = false, clickable = false) {
    const statusClass = expertise.statut ? `badge-${expertise.statut}` : 'badge-attente';
    const statusText = expertise.statut || 'attente';
    
    return `
      <div class="expertise-card" data-id="${expertise._uniqueId}" 
           ${clickable ? `onclick="app.showExpertiseDetails('${expertise._uniqueId}')" style="cursor: pointer;"` : ''}>
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
  
  showExpertiseDetails(id) {
    const expertise = this.database.expertises.find(exp => exp._uniqueId === id);
    if (!expertise) return;
    
    // Créer une modal avec tous les détails
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h2>Détails de l'expertise</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <div class="details-grid">
            <div class="detail-row">
              <strong>Patronyme:</strong> ${expertise.patronyme || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Date d'examen:</strong> ${this.formatDate(expertise.date_examen)}
            </div>
            <div class="detail-row">
              <strong>Lieu d'examen:</strong> ${expertise.lieu_examen || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Date de naissance:</strong> ${this.formatDate(expertise.date_naissance)}
            </div>
            <div class="detail-row">
              <strong>Âge:</strong> ${expertise.age || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Profession:</strong> ${expertise.profession || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Domicile:</strong> ${expertise.domicile || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Magistrat:</strong> ${expertise.magistrat || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Tribunal:</strong> ${expertise.tribunal || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>OPJ/Greffier:</strong> ${expertise.opj_greffier || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>N° Parquet:</strong> ${expertise.numero_parquet || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>N° Instruction:</strong> ${expertise.numero_instruction || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Chefs d'accusation:</strong> ${expertise.chefs_accusation || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Date OCE:</strong> ${this.formatDate(expertise.date_oce)}
            </div>
            <div class="detail-row">
              <strong>Limite OCE:</strong> ${this.formatDate(expertise.limite_oce)}
            </div>
            <div class="detail-row">
              <strong>Type de mission:</strong> ${expertise.type_mission || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Kilomètres:</strong> ${expertise.kilometres || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Statut:</strong> <span class="card-badge badge-${expertise.statut || 'attente'}">${expertise.statut || 'attente'}</span>
            </div>
          </div>
          <div class="modal-actions" style="margin-top: 2rem;">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
            <button class="btn btn-primary" onclick="app.editExpertise('${expertise._uniqueId}'); this.closest('.modal').remove()">Modifier</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
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

  async handleEntrySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const expertise = {};
    
    formData.forEach((value, key) => {
      // SANITISER LES VALEURS DU FORMULAIRE
      // Si la valeur est vide, undefined, ou contient 'undefined', la remplacer par une chaîne vide
      if (!value || value === 'undefined' || value === 'null' || String(value).trim() === '') {
        expertise[key] = '';
      } else {
        expertise[key] = String(value).trim();
      }
    });
    
    // Générer un ID unique
    expertise._uniqueId = this.generateUniqueId();
    expertise._importDate = new Date().toISOString();
    
    console.log('📝 Nouvelle expertise sanitisée:', expertise);
    
    // Ajouter à la base de données
    this.database.expertises.push(expertise);
    
    // Sauvegarder
    await this.saveDatabase();
    
    // Fermer la modal
    this.hideModal();
    
    // Rafraîchir l'affichage
    this.showTab(this.currentTab);
    
    this.showNotification('Expertise ajoutée avec succès', 'success');
  }

  editExpertise(id) {
    this.showEntryModal(id);
  }

  async deleteExpertise(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette expertise ?')) {
      const index = this.database.expertises.findIndex(exp => exp._uniqueId === id);
      if (index > -1) {
        this.database.expertises.splice(index, 1);
        await this.saveDatabase();
        this.showTab(this.currentTab);
        this.showNotification('Expertise supprimée', 'success');
      }
    }
  }

  importDatabase() {
    document.getElementById('file-input')?.click();
  }

  async handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.expertises && Array.isArray(data.expertises)) {
          this.database = data;
          await this.saveDatabase();
          this.showTab(this.currentTab);
          this.updateStatistics();
          this.showNotification(`Base de données importée avec succès (${data.expertises.length} expertises)`, 'success');
        } else {
          throw new Error('Format invalide');
        }
      } catch (error) {
        console.error('Erreur import:', error);
        this.showNotification('Erreur lors de l\'import. Vérifiez le format du fichier.', 'danger');
      }
    };
    
    reader.onerror = () => {
      this.showNotification('Erreur de lecture du fichier', 'danger');
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

  // Fonction helper pour sanitiser les valeurs pour les templates
  sanitizeValue(value) {
    if (value === null || value === undefined || value === 'null' || value === 'undefined') {
      return '';
    }
    return String(value);
  }

  // Version spéciale pour les templates Word - retourne chaîne vide au lieu de "N/A"
  formatDateForTemplate(dateStr) {
    if (!dateStr || dateStr === 'null' || dateStr === null || dateStr === undefined) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return ''; // Date invalide
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }

  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  updatePrisons() {
    const container = document.getElementById('prisons-container');
    if (!container) return;
    
    const searchTerm = document.getElementById('prison-search')?.value?.toLowerCase() || '';
    const filter = document.getElementById('prison-filter')?.value || 'all';
    
    let expertises = [...this.database.expertises];
    
    // Filtrer uniquement les expertises en attente (non réalisées)
    expertises = expertises.filter(exp => exp.statut !== 'realisee');
    
    // Grouper par lieu_examen
    const locationGroups = {};
    expertises.forEach(exp => {
      const location = exp.lieu_examen || 'Lieu non spécifié';
      if (!locationGroups[location]) {
        locationGroups[location] = {
          name: location,
          expertises: []
        };
      }
      
      // Ajouter l'expertise avec son statut
      locationGroups[location].expertises.push({
        ...exp,
        isProgrammee: exp.statut === 'programmee' || (exp.date_examen && exp.statut !== 'realisee')
      });
    });
    
    // Filtrer par recherche
    let filteredLocations = Object.values(locationGroups);
    if (searchTerm) {
      filteredLocations = filteredLocations.filter(location =>
        location.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filtrer par type
    if (filter === 'programmees') {
      filteredLocations = filteredLocations.filter(location => 
        location.expertises.some(exp => exp.isProgrammee)
      );
    } else if (filter === 'attente') {
      filteredLocations = filteredLocations.filter(location => 
        location.expertises.some(exp => !exp.isProgrammee)
      );
    }
    
    // Trier les lieux par nom
    filteredLocations.sort((a, b) => a.name.localeCompare(b.name));
    
    // Pour chaque lieu, trier les expertises : programmées en tête, puis par limite_oce
    filteredLocations.forEach(location => {
      location.expertises.sort((a, b) => {
        // D'abord par statut (programmées en tête)
        if (a.isProgrammee && !b.isProgrammee) return -1;
        if (!a.isProgrammee && b.isProgrammee) return 1;
        
        // Puis par limite_oce (les plus urgentes en premier)
        const dateA = new Date(a.limite_oce || '2099-12-31');
        const dateB = new Date(b.limite_oce || '2099-12-31');
        return dateA - dateB;
      });
    });
    
    // Afficher
    if (filteredLocations.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">Aucun lieu trouvé</p>';
    } else {
      container.innerHTML = filteredLocations.map(location => this.createPrisonCard(location)).join('');
    }
  }
  
  createPrisonCard(location) {
    const totalCount = location.expertises.length;
    const programmees = location.expertises.filter(exp => exp.isProgrammee);
    const enAttente = location.expertises.filter(exp => !exp.isProgrammee);
    const cardId = `prison-${this.generateUniqueId()}`;
    
    // Choisir une couleur basée sur le nom du lieu (cohérente)
    const colors = [
      'var(--primary-color)',
      'var(--accent-color)', 
      'var(--success-color)',
      'var(--warning-color)',
      '#8B5CF6',
      '#F59E0B'
    ];
    const colorIndex = location.name.length % colors.length;
    const cardColor = colors[colorIndex];
    
    return `
      <div class="prison-card-collapsible" style="--card-color: ${cardColor}">
        <div class="prison-card-header" onclick="app.togglePrisonCard('${cardId}')">
          <div class="prison-card-left">
            <svg class="prison-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
            <div class="prison-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9L12 2L21 9V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20V9Z"></path>
              </svg>
            </div>
            <h3 class="prison-card-title">${location.name}</h3>
          </div>
          <span class="prison-card-count">${totalCount}</span>
        </div>
        
        <div class="prison-card-content" id="${cardId}">
          <div class="prison-expertises-list">
            ${location.expertises.map(exp => `
              <div class="prison-expertise-item ${exp.isProgrammee ? 'programmee' : 'attente'}" 
                   onclick="app.showExpertiseDetails('${exp.id || this.generateUniqueId()}', ${JSON.stringify(exp).replace(/"/g, '&quot;')})">
                <div class="expertise-item-header">
                  <span class="expertise-status">${exp.isProgrammee ? '✅' : '⏳'}</span>
                  <span class="expertise-name">${exp.patronyme || 'Sans nom'}</span>
                </div>
                <div class="expertise-item-details">
                  ${exp.limite_oce ? `<span class="expertise-limit">⚠️ ${this.formatDate(exp.limite_oce)}</span>` : ''}
                  ${exp.date_examen ? `<span class="expertise-date">📅 ${this.formatDate(exp.date_examen)}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  togglePrisonCard(cardId) {
    const content = document.getElementById(cardId);
    const arrow = content.previousElementSibling.querySelector('.prison-card-arrow');
    
    if (content.classList.contains('expanded')) {
      content.classList.remove('expanded');
      arrow.style.transform = 'rotate(0deg)';
    } else {
      content.classList.add('expanded');
      arrow.style.transform = 'rotate(90deg)';
    }
  }
  
  showExpertiseDetails(id, expertiseData) {
    // Parser les données de l'expertise
    const exp = typeof expertiseData === 'string' ? JSON.parse(expertiseData.replace(/&quot;/g, '"')) : expertiseData;
    
    // Créer et afficher le modal détaillé
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Détails de l'expertise - ${exp.patronyme || 'Sans nom'}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="details-grid">
            <div class="detail-row">
              <strong>Nom/Prénom :</strong>
              <span>${exp.patronyme || 'Non renseigné'}</span>
            </div>
            <div class="detail-row">
              <strong>Date d'examen :</strong>
              <span>${exp.date_examen ? this.formatDate(exp.date_examen) : 'Non programmée'}</span>
            </div>
            <div class="detail-row">
              <strong>Lieu d'examen :</strong>
              <span>${exp.lieu_examen || 'Non renseigné'}</span>
            </div>
            <div class="detail-row">
              <strong>Statut :</strong>
              <span class="status-badge status-${exp.statut || 'attente'}">${exp.statut || 'En attente'}</span>
            </div>
            <div class="detail-row">
              <strong>Limite OCE :</strong>
              <span class="${exp.limite_oce ? 'text-danger' : ''}">${exp.limite_oce ? this.formatDate(exp.limite_oce) : 'Non définie'}</span>
            </div>
            <div class="detail-row">
              <strong>Magistrat :</strong>
              <span>${exp.magistrat || 'Non renseigné'}</span>
            </div>
            <div class="detail-row">
              <strong>Tribunal :</strong>
              <span>${exp.tribunal || 'Non renseigné'}</span>
            </div>
            <div class="detail-row">
              <strong>N° Parquet :</strong>
              <span>${exp.numero_parquet || 'Non renseigné'}</span>
            </div>
            <div class="detail-row">
              <strong>N° Instruction :</strong>
              <span>${exp.numero_instruction || 'Non renseigné'}</span>
            </div>
            <div class="detail-row">
              <strong>Date de naissance :</strong>
              <span>${exp.date_naissance ? this.formatDate(exp.date_naissance) : 'Non renseignée'}</span>
            </div>
            <div class="detail-row">
              <strong>Âge :</strong>
              <span>${exp.age || (exp.date_naissance ? this.calculateAge(exp.date_naissance) : 'Non calculé')}</span>
            </div>
            <div class="detail-row">
              <strong>Profession :</strong>
              <span>${exp.profession || 'Non renseignée'}</span>
            </div>
            <div class="detail-row">
              <strong>Domicile :</strong>
              <span>${exp.domicile || 'Non renseigné'}</span>
            </div>
            <div class="detail-row">
              <strong>OPJ/Greffier :</strong>
              <span>${exp.opj_greffier || 'Non renseigné'}</span>
            </div>
            ${exp.chefs_accusation ? `
              <div class="detail-row detail-row-full">
                <strong>Chefs d'accusation :</strong>
                <span>${exp.chefs_accusation}</span>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fermer au clic sur le backdrop
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age + ' ans';
  }

  showNotification(message, type = 'success') {
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

  // Méthode pour l'onglet Interprètes
  updateInterpretes() {
    const container = document.getElementById('interpretes-container');
    if (!container) return;
    
    const searchTerm = document.getElementById('interpretes-search')?.value?.toLowerCase() || '';
    const sortBy = document.getElementById('interpretes-sort')?.value || 'langue';
    
    // Filtrer les expertises nécessitant un interprète ET en attente uniquement
    let interpretesExpertises = this.database.expertises.filter(exp => {
      const notes = exp.notes || '';
      const statut = exp.statut || '';
      return notes.toLowerCase().includes('int.') && statut.toLowerCase() === 'en_attente';
    });
    
    // Appliquer la recherche
    if (searchTerm) {
      interpretesExpertises = interpretesExpertises.filter(exp => {
        const notes = (exp.notes || '').toLowerCase();
        const lieu = (exp.lieu_examen || '').toLowerCase();
        const patronyme = (exp.patronyme || '').toLowerCase();
        return notes.includes(searchTerm) || lieu.includes(searchTerm) || patronyme.includes(searchTerm);
      });
    }
    
    // Trier selon le critère sélectionné
    interpretesExpertises.sort((a, b) => {
      switch (sortBy) {
        case 'langue':
          const langueA = this.extractLangue(a.notes || '');
          const langueB = this.extractLangue(b.notes || '');
          const langueCompare = langueA.localeCompare(langueB);
          if (langueCompare !== 0) return langueCompare;
          // Si même langue, trier par lieu
          const lieuCompare = (a.lieu_examen || '').localeCompare(b.lieu_examen || '');
          if (lieuCompare !== 0) return lieuCompare;
          // Si même lieu, trier par limite OCE
          return this.compareDateLimite(a.limite_oce, b.limite_oce);
          
        case 'lieu':
          const lieuCompareB = (a.lieu_examen || '').localeCompare(b.lieu_examen || '');
          if (lieuCompareB !== 0) return lieuCompareB;
          return this.compareDateLimite(a.limite_oce, b.limite_oce);
          
        case 'date':
          return this.compareDateLimite(a.limite_oce, b.limite_oce);
          
        default:
          return 0;
      }
    });
    
    // TOUJOURS grouper par langue → lieu → limite OCE pour usage rapide
    let groupedByLangue = {};
    
    interpretesExpertises.forEach(exp => {
      const langueInfo = this.getLangueInfo(exp.notes || '');
      const lieu = exp.lieu_examen || 'Lieu non spécifié';
      
      if (!groupedByLangue[langueInfo.name]) {
        groupedByLangue[langueInfo.name] = {
          flag: langueInfo.flag,
          name: langueInfo.name,
          total: 0,
          lieux: {}
        };
      }
      
      if (!groupedByLangue[langueInfo.name].lieux[lieu]) {
        groupedByLangue[langueInfo.name].lieux[lieu] = [];
      }
      
      groupedByLangue[langueInfo.name].lieux[lieu].push(exp);
      groupedByLangue[langueInfo.name].total++;
    });
    
    // Trier les expertises par lieu par limite OCE
    Object.keys(groupedByLangue).forEach(langue => {
      Object.keys(groupedByLangue[langue].lieux).forEach(lieu => {
        groupedByLangue[langue].lieux[lieu].sort((a, b) => 
          this.compareDateLimite(a.limite_oce, b.limite_oce)
        );
      });
    });
    
    // Mettre à jour les statistiques
    const totalInterpretes = interpretesExpertises.length;
    const languesUniques = Object.keys(groupedByLangue).length;
    
    document.getElementById('interpretes-total').textContent = totalInterpretes;
    document.getElementById('langues-total').textContent = languesUniques;
    
    // Générer le HTML optimisé pour contact rapide
    let html = '';
    
    if (Object.keys(groupedByLangue).length > 0) {
      Object.keys(groupedByLangue).sort().forEach(langue => {
        const langueData = groupedByLangue[langue];
        
        html += `
          <div class="interpretes-groupe-langue">
            <div class="interpretes-langue-header-new">
              <span class="langue-flag">${langueData.flag}</span>
              <span class="langue-name">${langueData.name}</span>
              <span class="langue-count">(${langueData.total})</span>
            </div>
            <div class="interpretes-lieux-container">
        `;
        
        // Grouper par lieu
        Object.keys(langueData.lieux).sort().forEach(lieu => {
          const expertisesLieu = langueData.lieux[lieu];
          
          html += `
            <div class="interpretes-lieu-groupe">
              <div class="interpretes-lieu-header">
                <span class="lieu-icon">📍</span>
                <span class="lieu-name">${lieu}</span>
                <span class="lieu-count">(${expertisesLieu.length})</span>
              </div>
              <div class="interpretes-expertises-list">
          `;
          
          expertisesLieu.forEach(exp => {
            html += this.generateCompactInterpreteCard(exp);
          });
          
          html += `
              </div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      });
    }
    
    if (html === '') {
      html = `
        <div class="empty-state">
          <div class="empty-icon">🗣️</div>
          <h3>Aucune expertise nécessitant un interprète</h3>
          <p>Les expertises avec "int. LANGUE" dans les notes apparaîtront ici</p>
        </div>
      `;
    }
    
    container.innerHTML = html;
  }
  
  // Extraire la langue depuis les notes avec drapeaux
  extractLangue(notes) {
    const match = notes.match(/int\.\s*([a-záàâäéèêëïîôùûüÿçñ\s\-]+)/i);
    if (match) {
      let langue = match[1].trim();
      // Normaliser les langues connues
      langue = langue.charAt(0).toUpperCase() + langue.slice(1).toLowerCase();
      
      // Gérer les cas spéciaux
      if (langue.includes('arabe')) return 'Arabe';
      if (langue.includes('espagnol')) return 'Espagnol';
      if (langue.includes('soninké')) return 'Soninké';
      if (langue.includes('mandarin') || langue.includes('chinois')) return 'Mandarin';
      if (langue.includes('russe')) return 'Russe';
      
      return langue;
    }
    return 'Non spécifiée';
  }
  
  // Obtenir le drapeau et nom complet de la langue
  getLangueInfo(notes) {
    const langue = this.extractLangue(notes);
    const langueMap = {
      'Arabe': { flag: '🇸🇦', name: 'Arabe' },
      'Espagnol': { flag: '🇪🇸', name: 'Espagnol' },
      'Anglais': { flag: '🇬🇧', name: 'Anglais' },
      'Mandarin': { flag: '🇨🇳', name: 'Mandarin' },
      'Chinois': { flag: '🇨🇳', name: 'Chinois' },
      'Russe': { flag: '🇷🇺', name: 'Russe' },
      'Portugais': { flag: '🇵🇹', name: 'Portugais' },
      'Italien': { flag: '🇮🇹', name: 'Italien' },
      'Allemand': { flag: '🇩🇪', name: 'Allemand' },
      'Turc': { flag: '🇹🇷', name: 'Turc' },
      'Bengali': { flag: '🇧🇩', name: 'Bengali' },
      'Ourdou': { flag: '🇵🇰', name: 'Ourdou' },
      'Hindi': { flag: '🇮🇳', name: 'Hindi' },
      'Punjabi': { flag: '🇮🇳', name: 'Punjabi' },
      'Tamoul': { flag: '🇮🇳', name: 'Tamoul' },
      'Somali': { flag: '🇸🇴', name: 'Somali' },
      'Soninké': { flag: '🇲🇱', name: 'Soninké' },
      'Wolof': { flag: '🇸🇳', name: 'Wolof' },
      'Bambara': { flag: '🇲🇱', name: 'Bambara' },
      'Peul': { flag: '🇸🇳', name: 'Peul' },
      'Lingala': { flag: '🇨🇩', name: 'Lingala' },
      'Swahili': { flag: '🇹🇿', name: 'Swahili' },
      'Amharique': { flag: '🇪🇹', name: 'Amharique' },
      'Tigrigna': { flag: '🇪🇷', name: 'Tigrigna' },
      'Kurde': { flag: '🏴', name: 'Kurde' },
      'Farsi': { flag: '🇮🇷', name: 'Farsi' },
      'Dari': { flag: '🇦🇫', name: 'Dari' },
      'Pachto': { flag: '🇦🇫', name: 'Pachto' },
      'Albanais': { flag: '🇦🇱', name: 'Albanais' },
      'Serbe': { flag: '🇷🇸', name: 'Serbe' },
      'Croate': { flag: '🇭🇷', name: 'Croate' },
      'Bosniaque': { flag: '🇧🇦', name: 'Bosniaque' },
      'Bulgare': { flag: '🇧🇬', name: 'Bulgare' },
      'Roumain': { flag: '🇷🇴', name: 'Roumain' },
      'Polonais': { flag: '🇵🇱', name: 'Polonais' },
      'Hongrois': { flag: '🇭🇺', name: 'Hongrois' },
      'Tchèque': { flag: '🇨🇿', name: 'Tchèque' },
      'Slovaque': { flag: '🇸🇰', name: 'Slovaque' },
      'Ukrainien': { flag: '🇺🇦', name: 'Ukrainien' },
      'Géorgien': { flag: '🇬🇪', name: 'Géorgien' },
      'Arménien': { flag: '🇦🇲', name: 'Arménien' },
      'Hébreu': { flag: '🇮🇱', name: 'Hébreu' },
      'Japonais': { flag: '🇯🇵', name: 'Japonais' },
      'Coréen': { flag: '🇰🇷', name: 'Coréen' },
      'Vietnamien': { flag: '🇻🇳', name: 'Vietnamien' },
      'Thaï': { flag: '🇹🇭', name: 'Thaï' },
      'Malais': { flag: '🇲🇾', name: 'Malais' },
      'Indonésien': { flag: '🇮🇩', name: 'Indonésien' },
      'Tagalog': { flag: '🇵🇭', name: 'Tagalog' },
      'Non spécifiée': { flag: '🗣️', name: 'Non spécifiée' }
    };
    
    return langueMap[langue] || { flag: '🗣️', name: langue };
  }
  
  // Comparer les dates limites OCE
  compareDateLimite(dateA, dateB) {
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    const a = new Date(dateA);
    const b = new Date(dateB);
    return a - b;
  }
  
  // Générer une carte compacte pour contact rapide interprète
  generateCompactInterpreteCard(expertise) {
    const urgence = this.getUrgenceLevel(expertise.limite_oce);
    const urgenceIcon = this.getUrgenceIcon(urgence);
    
    return `
      <div class="interpretes-card-compact ${urgence}">
        <div class="compact-main-info">
          <div class="compact-person">
            <strong class="person-name">${expertise.patronyme || 'Non renseigné'}</strong>
            <span class="compact-urgence ${urgence}">${urgenceIcon}</span>
          </div>
          <div class="compact-timing">
            <span class="compact-date">📅 ${expertise.date_examen ? new Date(expertise.date_examen).toLocaleDateString('fr-FR') : 'Non programmée'}</span>
            ${expertise.limite_oce ? `<span class="compact-limite">⏰ ${new Date(expertise.limite_oce).toLocaleDateString('fr-FR')}</span>` : ''}
          </div>
        </div>
        <div class="compact-details">
          <span class="compact-tribunal">${expertise.tribunal || 'Non renseigné'}</span>
          <span class="compact-notes">${expertise.notes || ''}</span>
        </div>
        <div class="compact-actions">
          <button onclick="app.contactInterpreter('${expertise._uniqueId}')" class="btn-contact" title="Contacter l'interprète">📞</button>
          <button onclick="app.editExpertise('${expertise._uniqueId}')" class="btn-edit" title="Modifier">✏️</button>
        </div>
      </div>
    `;
  }
  
  // Générer une carte pour une expertise interprète (ancienne version)
  generateInterpreteCard(expertise) {
    const langue = this.extractLangue(expertise.notes || '');
    const urgence = this.getUrgenceLevel(expertise.limite_oce);
    
    return `
      <div class="interpretes-card ${urgence}">
        <div class="interpretes-card-header">
          <span class="interpretes-langue">${langue}</span>
          <span class="interpretes-urgence ${urgence}">${this.getUrgenceText(urgence)}</span>
        </div>
        <div class="interpretes-card-body">
          <div class="interpretes-info">
            <strong>${expertise.patronyme || 'Non renseigné'}</strong>
            <span class="interpretes-lieu">📍 ${expertise.lieu_examen || 'Non renseigné'}</span>
            <span class="interpretes-date">📅 ${expertise.date_examen ? new Date(expertise.date_examen).toLocaleDateString('fr-FR') : 'Non programmée'}</span>
            ${expertise.limite_oce ? `<span class="interpretes-limite">⏰ Limite OCE: ${new Date(expertise.limite_oce).toLocaleDateString('fr-FR')}</span>` : ''}
          </div>
          <div class="interpretes-details">
            <span class="interpretes-tribunal">${expertise.tribunal || 'Non renseigné'}</span>
            <span class="interpretes-notes">${expertise.notes || ''}</span>
          </div>
        </div>
        <div class="interpretes-card-actions">
          <button onclick="app.editExpertise('${expertise._uniqueId}')" class="btn btn-sm btn-secondary">Modifier</button>
          <button onclick="app.deleteExpertise('${expertise._uniqueId}')" class="btn btn-sm btn-danger">Supprimer</button>
        </div>
      </div>
    `;
  }
  
  // Déterminer le niveau d'urgence selon la limite OCE
  getUrgenceLevel(limite_oce) {
    if (!limite_oce) return 'normal';
    
    const limite = new Date(limite_oce);
    const today = new Date();
    const diffTime = limite - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'depassee';
    if (diffDays <= 7) return 'urgent';
    if (diffDays <= 30) return 'attention';
    return 'normal';
  }
  
  // Icône d'urgence pour affichage compact
  getUrgenceIcon(urgence) {
    switch (urgence) {
      case 'depassee': return '🔴';
      case 'urgent': return '🟠';
      case 'attention': return '🟡';
      default: return '🟢';
    }
  }
  
  // Texte d'urgence
  getUrgenceText(urgence) {
    switch (urgence) {
      case 'depassee': return '🔴 Dépassée';
      case 'urgent': return '🟠 Urgent (< 7j)';
      case 'attention': return '🟡 Attention (< 30j)';
      default: return '🟢 Normal';
    }
  }
  
  // Fonction pour contacter un interprète (placeholder)
  contactInterpreter(expertiseId) {
    const expertise = this.database.expertises.find(exp => exp._uniqueId === expertiseId);
    if (expertise) {
      const langueInfo = this.getLangueInfo(expertise.notes || '');
      const message = `Bonjour, êtes-vous disponible pour une expertise en ${langueInfo.name} ?\n\nLieu: ${expertise.lieu_examen}\nDate: ${expertise.date_examen ? new Date(expertise.date_examen).toLocaleDateString('fr-FR') : 'À programmer'}\nPersonne: ${expertise.patronyme}\n\nMerci !`;
      
      if (navigator.share) {
        navigator.share({
          title: `Demande interprète ${langueInfo.name}`,
          text: message
        });
      } else {
        // Fallback: copier dans le presse-papier
        navigator.clipboard.writeText(message).then(() => {
          this.showNotification('Message copié dans le presse-papier', 'success');
        }).catch(() => {
          alert(message);
        });
      }
    }
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