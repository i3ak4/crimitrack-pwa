# 🚀 Guide de déploiement GitHub PWA - CrimiTrack

## 📋 Configuration du repository i3ak4/crimitrack-pwa

### 1. Initialiser Git dans le dossier PWA

```bash
cd "/Users/leonard/Library/Mobile Documents/com~apple~CloudDocs/Support/CrimiTrack_PWA"

# Initialiser le repository git
git init

# Ajouter le remote GitHub
git remote add origin https://github.com/i3ak4/crimitrack-pwa.git

# Configurer les informations utilisateur
git config user.name "Leonard"
git config user.email "votre-email@example.com"
```

### 2. Structure des fichiers à commit

```
CrimiTrack_PWA/
├── index.html                 ✅ Interface principale optimisée
├── manifest.json             ✅ Configuration PWA
├── service-worker.js         ✅ Cache et offline
├── assets/
│   ├── css/
│   │   └── pwa-styles.css    ✅ Styles responsive iPad/iPhone
│   ├── js/
│   │   ├── app.js            ✅ Application principale
│   │   ├── sync-manager.js   ✅ Sync sans Tailscale
│   │   ├── connection-manager.js
│   │   ├── offline-manager.js
│   │   └── publipostage-manager.js ✅ Nouveau module
│   └── images/
├── config/
├── modules/
├── README.md                 ✅ Documentation mise à jour
└── GITHUB_SETUP.md           ✅ Ce guide
```

### 3. Premier commit et push

```bash
# Ajouter tous les fichiers
git add .

# Créer le commit initial
git commit -m "🚀 CrimiTrack PWA v2.0 - Sans Tailscale

✨ Nouvelles fonctionnalités:
- 🔄 Bouton synchronisation BDD manuelle
- 📱 Onglets visuels optimisés iPad 13\" / iPhone 15 Pro
- 📄 Publipostage multi-templates avec téléchargement
- 🎨 Interface responsive avec scroll horizontal
- 🔒 Abandon Tailscale pour connexion directe

🎯 Optimisé pour:
- iPad Pro 13\" (2732x2048)
- iPhone 15 Pro (430x932)
- Téléchargement vers dossier standard

📋 Modules disponibles:
- Agenda, Liste d'attentes, Statistiques
- Convocations, Facturation, Publipostage

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push vers GitHub
git branch -M main
git push -u origin main
```

### 4. Configuration GitHub Pages

1. **Accéder au repository** : https://github.com/i3ak4/crimitrack-pwa
2. **Aller dans Settings > Pages**
3. **Source** : Deploy from a branch
4. **Branch** : main / (root)
5. **Save**

✅ **URL PWA** : https://i3ak4.github.io/crimitrack-pwa/

### 5. Configuration des secrets (si nécessaire)

Pour des déploiements automatisés ou des API privées :

```bash
# Dans GitHub > Settings > Secrets and variables > Actions
SERVER_URL=https://votre-serveur.com:8081
API_KEY=votre-clé-api
```

## 🔧 Workflow de développement

### Modifications locales

```bash
# Après modification des fichiers
git add .
git commit -m "📱 Description des changements

🔄 Détails:
- Fonctionnalité modifiée
- Bug corrigé
- Amélioration apportée"

git push origin main
```

### Branches pour nouvelles fonctionnalités

```bash
# Créer une branche pour une nouvelle fonctionnalité
git checkout -b feature/nouvelle-fonctionnalite

# Développer, puis merge
git checkout main
git merge feature/nouvelle-fonctionnalite
git push origin main
```

### Tags pour les versions

```bash
# Créer un tag de version
git tag -a v2.0.0 -m "Version 2.0.0 - PWA Sans Tailscale"
git push origin --tags
```

## 📱 Installation sur appareils

### iPhone/iPad

1. **Ouvrir Safari**
2. **Naviguer vers** : https://i3ak4.github.io/crimitrack-pwa/
3. **Bouton Partager** (carré avec flèche)
4. **"Sur l'écran d'accueil"**
5. **Ajouter**

### Android

1. **Ouvrir Chrome**
2. **Naviguer vers** : https://i3ak4.github.io/crimitrack-pwa/
3. **Menu (3 points) > Ajouter à l'écran d'accueil**
4. **Installer**

### Desktop (Chrome/Edge)

1. **Naviguer vers** : https://i3ak4.github.io/crimitrack-pwa/
2. **Icône d'installation** dans la barre d'adresse
3. **Installer**

## 🔄 Synchronisation avec le serveur Mac Mini

### Configuration réseau

La PWA se connecte directement au Mac Mini via :

- **IP locale** : `http://192.168.1.100:8081`
- **Fallback** : `http://localhost:8081`

### Bouton de synchronisation

- ✅ **Vert** : BDD synchronisée
- 🔄 **Animation** : Synchronisation en cours
- ❌ **Rouge** : Erreur de connexion

### Première utilisation

1. **Lancer la PWA**
2. **Appuyer sur "Synchroniser BDD"**
3. **Attendre le téléchargement complet**
4. **Utiliser l'application normalement**

## 🎯 Fonctionnalités PWA v2.0

### ✅ Implémentées

- 🔄 **Synchronisation manuelle** BDD via bouton
- 📱 **Onglets visuels** : Agenda, Attentes, Stats, Convocations, Facturation
- 📄 **Publipostage multi-templates** avec sélection
- 💾 **Téléchargement** vers dossier Téléchargements
- 📐 **Responsive design** iPad 13" / iPhone 15 Pro
- ↔️ **Scroll horizontal** pour contenus
- 🎨 **Interface optimisée** tactile

### 🚀 Améliorations apportées

1. **Abandon Tailscale** → Connexion directe plus simple
2. **Interface mobile-first** → Meilleure UX tactile
3. **Onglets visuels** → Navigation intuitive
4. **Publipostage amélioré** → Sélection multiple, téléchargement
5. **Optimisations spécifiques** → iPad 13" et iPhone 15 Pro
6. **Scroll horizontal** → Adaptation aux écrans tactiles

## 🛠️ Maintenance

### Logs et debugging

- **Console du navigateur** : F12 > Console
- **Service Worker** : Application > Service Workers
- **Cache** : Application > Storage

### Mises à jour

- **Automatiques** via GitHub Pages
- **Cache** : Vidé automatiquement sur nouvelle version
- **Notification** : "Nouvelle version disponible"

### Support

- **Issues GitHub** : https://github.com/i3ak4/crimitrack-pwa/issues
- **Discussions** : https://github.com/i3ak4/crimitrack-pwa/discussions

---

## 📞 Contact

- **Repository** : https://github.com/i3ak4/crimitrack-pwa
- **PWA Live** : https://i3ak4.github.io/crimitrack-pwa/
- **Documentation** : README.md

---

*Guide créé le 12/08/2025 - CrimiTrack PWA v2.0*