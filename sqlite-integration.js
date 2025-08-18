// SQLite Integration pour CrimiTrack PWA
// Extension pour supporter l'upload de fichiers SQLite (.db)

class SQLiteIntegration {
  constructor(app) {
    this.app = app;
    this.sqliteDB = null;
    this.sqliteSupported = false;
    this.init();
  }

  async init() {
    try {
      await this.checkSQLiteSupport();
      this.addSQLiteButton();
      this.setupUploadHandler();
    } catch (error) {
      console.log('SQLite non supporté, utilisation IndexedDB uniquement');
    }
  }

  async checkSQLiteSupport() {
    try {
      // Charger sql.js depuis CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          this.sqliteSupported = true;
          console.log('sql.js chargé avec succès');
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Erreur chargement sql.js:', error);
      throw error;
    }
  }

  addSQLiteButton() {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.getElementById('upload-sqlite')) {
      const sqliteBtn = document.createElement('button');
      sqliteBtn.id = 'upload-sqlite';
      sqliteBtn.className = 'btn-icon';
      sqliteBtn.title = 'Charger base SQLite (.db)';
      sqliteBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6"></path>
          <path d="m15.71 4.33-1.38 1.38M9.67 14.05l-1.38 1.38m1.38-9.1-1.38-1.38m9.1 1.38-1.38 1.38M1 12h6m6 0h6m-15.71 7.67 1.38-1.38M14.05 9.67l1.38-1.38"></path>
        </svg>
      `;
      sqliteBtn.addEventListener('click', () => this.triggerSQLiteUpload());
      headerActions.insertBefore(sqliteBtn, headerActions.firstChild);
    }
  }

  setupUploadHandler() {
    // Créer input file caché
    const sqliteInput = document.createElement('input');
    sqliteInput.type = 'file';
    sqliteInput.accept = '.db,.sqlite,.sqlite3';
    sqliteInput.style.display = 'none';
    sqliteInput.id = 'sqlite-file-input';
    document.body.appendChild(sqliteInput);
    sqliteInput.addEventListener('change', (e) => this.handleSQLiteUpload(e));
  }

  triggerSQLiteUpload() {
    document.getElementById('sqlite-file-input')?.click();
  }

  async handleSQLiteUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(db|sqlite|sqlite3)$/i)) {
      this.app.showNotification('Veuillez sélectionner un fichier .db, .sqlite ou .sqlite3', 'danger');
      return;
    }

    try {
      this.app.showNotification('Chargement de la base SQLite...', 'info');
      
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Initialiser sql.js si pas encore fait
      if (!window.SQL) {
        const SQL = await window.initSqlJs({
          locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        window.SQL = SQL;
      }
      
      // Créer la base de données
      this.sqliteDB = new window.SQL.Database(uint8Array);
      
      // Convertir les données SQLite en format JSON
      const expertises = await this.convertSQLiteToJSON();
      
      this.app.showNotification(`Base SQLite chargée: ${file.name} (${expertises.length} expertises)`, 'success');
      
      // Rafraîchir l'affichage
      this.app.showTab(this.app.currentTab);
      this.app.updateStatistics();
      
    } catch (error) {
      console.error('Erreur chargement SQLite:', error);
      this.app.showNotification('Erreur lors du chargement de la base SQLite', 'danger');
    }
  }

  async convertSQLiteToJSON() {
    if (!this.sqliteDB) return [];

    try {
      // Récupérer les données de la table expertises
      const expertisesResult = this.sqliteDB.exec('SELECT * FROM expertises ORDER BY date_examen DESC');
      
      let expertises = [];
      if (expertisesResult.length > 0) {
        const columns = expertisesResult[0].columns;
        const values = expertisesResult[0].values;
        
        expertises = values.map(row => {
          const expertise = {};
          columns.forEach((col, index) => {
            expertise[col] = row[index];
          });
          
          // Normaliser les noms de champs pour compatibilité
          if (expertise.PATRONYME) expertise.patronyme = expertise.PATRONYME;
          if (expertise.DATE_NAISSANCE) expertise.date_naissance = expertise.DATE_NAISSANCE;
          if (expertise.OPJ_GREFFIER) expertise.opj_greffier = expertise.OPJ_GREFFIER;
          if (expertise.CHEFS_ACCUSATION) expertise.chefs_accusation = expertise.CHEFS_ACCUSATION;
          if (expertise.PROC_1) expertise.numero_parquet = expertise.PROC_1;
          if (expertise.PROC_2) expertise.numero_instruction = expertise.PROC_2;
          if (expertise.DATE_OCE) expertise.date_oce = expertise.DATE_OCE;
          if (expertise.LIMITE_OCE) expertise.limite_oce = expertise.LIMITE_OCE;
          
          // S'assurer qu'il y a un ID unique
          if (!expertise._uniqueId) {
            expertise._uniqueId = expertise.id || `sqlite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          
          return expertise;
        });
      }

      // Récupérer les données de waitlist si elle existe
      try {
        const waitlistResult = this.sqliteDB.exec('SELECT * FROM waitlist');
        if (waitlistResult.length > 0) {
          console.log(`${waitlistResult[0].values.length} éléments en waitlist trouvés`);
        }
      } catch (e) {
        console.log('Pas de table waitlist ou erreur:', e.message);
      }

      // Mettre à jour la base de données locale
      this.app.database = { expertises };
      
      // Sanitiser les données
      this.app.sanitizeLoadedData();
      
      // Sauvegarder en IndexedDB
      await this.app.saveDatabase();
      
      console.log(`${expertises.length} expertises chargées depuis SQLite`);
      
      return expertises;
      
    } catch (error) {
      console.error('Erreur conversion SQLite:', error);
      throw error;
    }
  }
}

// Initialiser l'intégration SQLite après le chargement de l'app
window.addEventListener('load', () => {
  // Attendre que l'app soit disponible
  const initSQLite = () => {
    if (window.app && window.app.database) {
      window.sqliteIntegration = new SQLiteIntegration(window.app);
      console.log('SQLite Integration initialisée');
    } else {
      setTimeout(initSQLite, 100);
    }
  };
  initSQLite();
});