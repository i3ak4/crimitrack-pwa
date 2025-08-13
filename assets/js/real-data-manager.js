/**
 * 🗄️ Real Data Manager - CrimiTrack PWA
 * Agent UI-Fantaisie - Gestionnaire de données réelles avec IndexedDB
 */

class RealDataManager {
  constructor() {
    this.dbName = 'CrimiTrackPWA';
    this.dbVersion = 1;
    this.db = null;
    this.dbUrl = './data/database_deploiement.json';
    this.lastUpdate = null;
    this.isInitialized = false;
    
    console.log('🗄️ Real Data Manager initialisé');
  }
  
  /* ============================================
     🔧 INITIALISATION D'INDEXEDDB
     ============================================ */
  
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚀 Initialisation de la base de données...');
      
      // Ouvrir IndexedDB
      await this.openDatabase();
      
      // Charger les données depuis le JSON
      await this.loadLatestData();
      
      this.isInitialized = true;
      console.log('✅ Real Data Manager prêt');
      
    } catch (error) {
      console.error('❌ Erreur initialisation Data Manager:', error);
      throw error;
    }
  }
  
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        reject(new Error('Erreur ouverture IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('📦 IndexedDB ouvert avec succès');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('🔄 Mise à jour du schéma IndexedDB...');
        
        // Store pour les expertises
        if (!db.objectStoreNames.contains('expertises')) {
          const expertisesStore = db.createObjectStore('expertises', { keyPath: '_uniqueId' });
          expertisesStore.createIndex('statut', 'statut', { unique: false });
          expertisesStore.createIndex('date_examen', 'date_examen', { unique: false });
          expertisesStore.createIndex('tribunal', 'tribunal', { unique: false });
          expertisesStore.createIndex('magistrat', 'magistrat', { unique: false });
        }
        
        // Store pour les métadonnées
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
        
        // Store pour les convocations
        if (!db.objectStoreNames.contains('convocations')) {
          const convocationsStore = db.createObjectStore('convocations', { keyPath: 'id' });
          convocationsStore.createIndex('statut', 'statut', { unique: false });
          convocationsStore.createIndex('date_envoi', 'date_envoi', { unique: false });
        }
        
        // Store pour la facturation
        if (!db.objectStoreNames.contains('billing')) {
          const billingStore = db.createObjectStore('billing', { keyPath: 'id' });
          billingStore.createIndex('statut', 'statut', { unique: false });
          billingStore.createIndex('date_facture', 'date_facture', { unique: false });
        }
        
        console.log('✅ Schéma IndexedDB créé');
      };
    });
  }
  
  /* ============================================
     📥 CHARGEMENT DES DONNÉES
     ============================================ */
  
  async loadLatestData() {
    try {
      console.log('📥 Chargement des données depuis', this.dbUrl);
      
      // Récupérer les données JSON
      const response = await fetch(this.dbUrl);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const jsonData = await response.json();
      console.log(`📊 ${jsonData.expertises?.length || 0} expertises trouvées`);
      
      // Vérifier si une mise à jour est nécessaire
      const lastImportDate = jsonData.expertises?.[0]?._importDate;
      const storedLastUpdate = await this.getMetadata('lastUpdate');
      
      if (!storedLastUpdate || lastImportDate !== storedLastUpdate) {
        console.log('🔄 Mise à jour nécessaire, import des données...');
        await this.importData(jsonData);
        await this.setMetadata('lastUpdate', lastImportDate);
        console.log('✅ Données mises à jour');
      } else {
        console.log('✅ Données déjà à jour');
      }
      
      this.lastUpdate = lastImportDate;
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      
      // Fallback: utiliser les données en cache si disponibles
      const cachedExpertises = await this.getAllExpertises();
      if (cachedExpertises.length > 0) {
        console.log(`⚠️ Utilisation des données en cache (${cachedExpertises.length} expertises)`);
        return;
      }
      
      throw error;
    }
  }
  
  async importData(jsonData) {
    const transaction = this.db.transaction(['expertises'], 'readwrite');
    const store = transaction.objectStore('expertises');
    
    // Vider le store avant import
    await this.clearStore('expertises');
    
    // Importer les expertises
    if (jsonData.expertises && Array.isArray(jsonData.expertises)) {
      for (const expertise of jsonData.expertises) {
        // S'assurer que l'expertise a un ID unique
        if (!expertise._uniqueId) {
          expertise._uniqueId = this.generateUniqueId();
        }
        
        // Normaliser le statut
        expertise.statut = this.normalizeStatus(expertise.statut);
        
        await this.addToStore('expertises', expertise);
      }
    }
    
    console.log(`📦 ${jsonData.expertises?.length || 0} expertises importées`);
    
    // Générer les données dérivées
    await this.generateDerivedData();
  }
  
  async generateDerivedData() {
    console.log('🔄 Génération des données dérivées...');
    
    const expertises = await this.getAllExpertises();
    
    // Générer les convocations basées sur les expertises
    await this.generateConvocationsFromExpertises(expertises);
    
    // Générer les données de facturation
    await this.generateBillingFromExpertises(expertises);
    
    console.log('✅ Données dérivées générées');
  }
  
  async generateConvocationsFromExpertises(expertises) {
    await this.clearStore('convocations');
    
    const convocations = expertises
      .filter(exp => exp.statut === 'programmee' || exp.statut === 'realisee')
      .map((exp, index) => ({
        id: `conv_${exp._uniqueId}`,
        patronyme: exp.patronyme,
        numero_dossier: exp.numero_parquet || exp.numero_instruction,
        date_envoi: this.generateConvocationDate(exp.date_examen, -7),
        date_rdv: exp.date_examen,
        lieu_examen: exp.lieu_examen,
        statut: this.generateConvocationStatus(exp.statut),
        type_envoi: Math.random() > 0.7 ? 'LRAR' : 'Email',
        numero_suivi: Math.random() > 0.7 ? this.generateTrackingNumber() : null,
        tracking_status: this.generateTrackingStatus(),
        error_message: Math.random() > 0.9 ? 'Adresse incorrecte' : null
      }));
    
    for (const convocation of convocations) {
      await this.addToStore('convocations', convocation);
    }
    
    console.log(`📧 ${convocations.length} convocations générées`);
  }
  
  async generateBillingFromExpertises(expertises) {
    await this.clearStore('billing');
    
    const billingItems = expertises
      .filter(exp => exp.statut === 'realisee')
      .map(exp => {
        const montant = this.calculateAmount(exp);
        const dateFacture = this.generateInvoiceDate(exp.date_examen);
        const isPaid = Math.random() > 0.3; // 70% payées
        
        return {
          id: `bill_${exp._uniqueId}`,
          patronyme: exp.patronyme,
          numero_facture: this.generateInvoiceNumber(),
          montant: montant,
          date_facture: dateFacture,
          date_echeance: this.addDays(dateFacture, 30),
          date_paiement: isPaid ? this.generatePaymentDate(dateFacture) : null,
          statut: isPaid ? 'paye' : 'en_attente',
          juridiction: exp.tribunal || 'Non défini',
          type_expertise: this.getExpertiseType(exp)
        };
      });
    
    for (const billing of billingItems) {
      await this.addToStore('billing', billing);
    }
    
    console.log(`💰 ${billingItems.length} factures générées`);
  }
  
  /* ============================================
     📊 MÉTHODES D'ACCÈS AUX DONNÉES
     ============================================ */
  
  async getAllExpertises() {
    return await this.getAll('expertises');
  }
  
  async getExpertiseById(id) {
    return await this.getById('expertises', id);
  }
  
  async getExpertisesByStatus(status) {
    return await this.getByIndex('expertises', 'statut', status);
  }
  
  async getConvocationsData() {
    return await this.getAll('convocations');
  }
  
  async getBillingData() {
    return await this.getAll('billing');
  }
  
  async getWaitlistData() {
    return await this.getExpertisesByStatus('en_attente');
  }
  
  async getTemplates() {
    // Templates par défaut pour le mailing
    return [
      { id: 'convocation-afm', name: 'Convocation AFM', type: 'convocation', description: 'Convocation standard AFM' },
      { id: 'convocation-instruction-h', name: 'Convocation Instruction (H)', type: 'convocation', description: 'Convocation instruction homme' },
      { id: 'convocation-instruction-f', name: 'Convocation Instruction (F)', type: 'convocation', description: 'Convocation instruction femme' },
      { id: 'devis', name: 'Devis', type: 'administratif', description: 'Devis d\'expertise' },
      { id: 'lrar', name: 'LRAR', type: 'administratif', description: 'Lettre recommandée AR' }
    ];
  }
  
  /* ============================================
     🔧 MÉTHODES UTILITAIRES INDEXEDDB
     ============================================ */
  
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getById(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  async addToStore(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async getMetadata(key) {
    try {
      const result = await this.getById('metadata', key);
      return result?.value;
    } catch {
      return null;
    }
  }
  
  async setMetadata(key, value) {
    return await this.addToStore('metadata', { key, value });
  }
  
  /* ============================================
     🛠️ MÉTHODES UTILITAIRES
     ============================================ */
  
  normalizeStatus(status) {
    const statusMap = {
      'realisee': 'realisee',
      'réalisée': 'realisee',
      'programmee': 'programmee',
      'programmée': 'programmee',
      'en_attente': 'en_attente',
      'en attente': 'en_attente',
      'refusee': 'refusee',
      'refusée': 'refusee'
    };
    
    return statusMap[status?.toLowerCase()] || 'en_attente';
  }
  
  generateUniqueId() {
    return Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }
  
  generateConvocationStatus(expertiseStatus) {
    if (expertiseStatus === 'realisee') return 'delivered';
    if (expertiseStatus === 'programmee') return Math.random() > 0.5 ? 'sent' : 'delivered';
    return 'pending';
  }
  
  generateConvocationDate(examDate, daysBefore) {
    if (!examDate) return new Date().toISOString();
    const date = new Date(examDate);
    date.setDate(date.getDate() + daysBefore);
    return date.toISOString();
  }
  
  generateTrackingNumber() {
    return '1A' + Math.random().toString().slice(2, 11) + 'FR';
  }
  
  generateTrackingStatus() {
    const statuses = [
      { posted: true, in_transit: true, delivered: true },
      { posted: true, in_transit: true, delivered: false },
      { posted: true, in_transit: false, delivered: false }
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }
  
  calculateAmount(expertise) {
    const baseAmounts = {
      'flagrance': 300,
      'instruction': 450,
      'correctionnel': 400,
      'cour_assises': 600,
      'civil': 350
    };
    
    const type = this.getExpertiseType(expertise);
    const baseAmount = baseAmounts[type] || 400;
    
    // Ajouter les frais kilométriques
    const km = expertise.kilometres || 0;
    const kmCost = km * 0.5;
    
    return Math.round(baseAmount + kmCost);
  }
  
  getExpertiseType(expertise) {
    const lieu = (expertise.lieu_examen || '').toLowerCase();
    const chefs = (expertise.chefs_accusation || '').toLowerCase();
    
    if (lieu.includes('gav') || chefs.includes('flagrant')) return 'flagrance';
    if (lieu.includes('instruction')) return 'instruction';
    if (lieu.includes('correctionnel')) return 'correctionnel';
    if (lieu.includes('assises')) return 'cour_assises';
    if (lieu.includes('civil')) return 'civil';
    
    return 'instruction'; // par défaut
  }
  
  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const number = Math.floor(Math.random() * 9999) + 1;
    return `F${year}-${number.toString().padStart(4, '0')}`;
  }
  
  generateInvoiceDate(examDate) {
    if (!examDate) return new Date().toISOString();
    const date = new Date(examDate);
    date.setDate(date.getDate() + Math.floor(Math.random() * 15) + 1); // 1-15 jours après
    return date.toISOString();
  }
  
  generatePaymentDate(invoiceDate) {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + Math.floor(Math.random() * 45) + 1); // 1-45 jours après
    return date.toISOString();
  }
  
  addDays(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }
  
  /* ============================================
     🔄 MÉTHODES DE SYNCHRONISATION
     ============================================ */
  
  async forceRefresh() {
    console.log('🔄 Rechargement forcé des données...');
    this.lastUpdate = null;
    await this.loadLatestData();
  }
  
  async exportData() {
    const expertises = await this.getAllExpertises();
    const convocations = await this.getConvocationsData();
    const billing = await this.getBillingData();
    
    return {
      expertises,
      convocations,
      billing,
      metadata: {
        exportDate: new Date().toISOString(),
        version: '4.0.0',
        totalExpertises: expertises.length
      }
    };
  }
  
  async getStatus() {
    if (!this.isInitialized) {
      return { status: 'not_initialized' };
    }
    
    const expertises = await this.getAllExpertises();
    const convocations = await this.getConvocationsData();
    const billing = await this.getBillingData();
    
    return {
      status: 'ready',
      lastUpdate: this.lastUpdate,
      counts: {
        expertises: expertises.length,
        convocations: convocations.length,
        billing: billing.length
      },
      statusBreakdown: {
        en_attente: expertises.filter(e => e.statut === 'en_attente').length,
        programmee: expertises.filter(e => e.statut === 'programmee').length,
        realisee: expertises.filter(e => e.statut === 'realisee').length
      }
    };
  }
}

// Export de la classe
window.RealDataManager = RealDataManager;