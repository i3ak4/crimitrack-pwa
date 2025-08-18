# 📁 Structure du Projet CrimiTrack PWA

## 🏗️ Organisation des Dossiers

```
CrimiTrack_PWA/
│
├── 📱 Fichiers Principaux
│   ├── index.html           # Page principale de l'application
│   ├── app.js              # Logique JavaScript principale
│   ├── styles.css          # Styles CSS
│   ├── ui-fantaisie.js     # Animations et effets UI
│   ├── manifest.json       # Configuration PWA
│   └── service-worker.js   # Service Worker pour mode offline
│
├── 📊 Données
│   └── database.json       # Base de données JSON (exemple)
│
├── 🖼️ icons/              # Icônes de l'application
│   ├── favicon-16.png
│   └── favicon-32.png
│
├── 📄 publipostage/        # Templates Word pour publipostage
│   └── [templates .docx]
│
├── 🧪 tests/               # Fichiers de test et debug
│   ├── test-publipostage-debug.html
│   ├── test-final-undefined.html
│   ├── test-fix-mapping.html
│   ├── init-test-data.html
│   └── force-sanitize.html
│
├── 🔧 tools/               # Outils de développement
│   ├── generate_icons.html
│   ├── generate_icons.py
│   └── create_basic_icons.html
│
└── 📚 docs/                # Documentation
    ├── STRUCTURE.md        # Ce fichier
    ├── SOLUTION_UNDEFINED_COMPLETE.md
    └── logs/              # Logs de sessions
        └── SESSION_LOG_UNDEFINED_FIX.md
```

## 🎯 Description des Fichiers Principaux

### Application Core
- **index.html** : Interface utilisateur avec 5 onglets (Agenda, Liste d'attente, Publipostage, Prison, Statistiques)
- **app.js** : Gestion des données, publipostage, et logique métier
- **styles.css** : Design responsive et moderne
- **ui-fantaisie.js** : Micro-interactions et animations

### PWA & Offline
- **manifest.json** : Configuration Progressive Web App
- **service-worker.js** : Cache et fonctionnement hors ligne

### Base de Données
- **db/database.json** : Fichier principal de base de données
- **localStorage backup** : Sauvegarde automatique pour sécurité

### Tests & Debug
- **init-test-data.html** : Créer des données de test
- **test-publipostage-debug.html** : Debug complet du publipostage
- **force-sanitize.html** : Nettoyer les données corrompues

## 🚀 Utilisation

### Développement Local
```bash
cd /path/to/CrimiTrack_PWA
python3 -m http.server 8082
# Ouvrir http://localhost:8082
```

### Déploiement GitHub Pages
```bash
git add -A
git commit -m "Description des changements"
git push origin main
```

### Test du Publipostage
1. Ouvrir `tests/init-test-data.html`
2. Créer des données propres
3. Retourner sur l'application principale
4. Onglet Publipostage → Charger template → Générer

## 🔒 Sécurité
- Toutes les données sont stockées localement (IndexedDB)
- Aucune connexion réseau requise (mode PWA offline)
- Sanitisation automatique des données

## 📈 Version
**v3.0.0** - Version PWA avec résolution complète du bug "undefined"