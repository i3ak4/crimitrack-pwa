# 🚀 CrimiTrack PWA v2.0 - Sans Tailscale

## 📱 PWA Optimisée pour iPad & iPhone

Application Progressive Web App moderne pour la gestion d'expertises médico-légales, **abandonnant Tailscale** pour une approche de synchronisation manuelle simplifiée.

## ✨ Nouvelles Fonctionnalités v2.0

### 🔄 Synchronisation Manuelle
- **Bouton "Synchroniser BDD"** visible dans le header
- **Connexion directe** au serveur (192.168.1.100:8081)
- **Téléchargement complet** de la base de données
- **Indicateur visuel** de l'état de synchronisation

### 📱 Onglets Visuels Améliorés
- **Navigation principale** : Agenda, Attentes, Statistiques, Convocations, Facturation
- **Design moderne** avec icônes et animations
- **Responsive** : s'adapte automatiquement à l'écran
- **Scroll horizontal** sur petits écrans

### 📄 Publipostage Multi-Templates
- **Sélection multiple** d'expertises et de templates
- **6 templates disponibles** : AFM, Convocation, Rapport, Facture, Devis, Certificat
- **Génération simultanée** de plusieurs documents
- **Téléchargement automatique** dans le dossier Téléchargements
- **Barre de progression** en temps réel

### 🎨 Optimisations Spécifiques
- **iPad Pro 13"** (2732x2048) : Interface large avec grilles 4 colonnes
- **iPhone 15 Pro** (430x932) : Interface compacte avec gestures tactiles
- **Scroll horizontal** fluide pour tous les contenus
- **Safe areas** iOS pour l'encoche et les coins arrondis

## 🏗️ Architecture Technique

### 📂 Structure PWA
```
CrimiTrack_PWA/
├── index.html                     ✅ Interface avec onglets visuels
├── manifest.json                  ✅ Configuration PWA optimisée
├── service-worker.js              ✅ Cache intelligent
├── GITHUB_SETUP.md               ✅ Guide déploiement GitHub
├── assets/
│   ├── css/
│   │   └── pwa-styles.css        ✅ Styles responsive complets
│   ├── js/
│   │   ├── app.js                ✅ Application principale
│   │   ├── sync-manager.js       ✅ Sync manuelle (SANS Tailscale)
│   │   ├── publipostage-manager.js ✅ Module publipostage
│   │   ├── connection-manager.js  ✅ Gestion connectivité
│   │   └── offline-manager.js     ✅ Stockage IndexedDB
│   └── images/                    ✅ Icônes PWA
```

### 🔧 Modules Disponibles par Appareil

**iPhone** : Agenda, Attentes, Statistiques, Convocations, Publipostage
**iPad** : + Facturation
**Desktop** : + Synthèse, Import, Planning, Anonymisation

## 🎯 Utilisation

### 🚀 Installation PWA

#### Sur iPhone/iPad
1. Ouvrir **Safari**
2. Naviguer vers l'URL PWA
3. **Bouton Partager** → **"Sur l'écran d'accueil"**
4. **Ajouter**

#### Sur Android
1. Ouvrir **Chrome**
2. **Menu** → **"Ajouter à l'écran d'accueil"**
3. **Installer**

### 🔄 Première Synchronisation
1. **Lancer la PWA**
2. **Appuyer sur "Synchroniser BDD"** (bouton bleu en haut)
3. **Attendre le téléchargement** complet
4. **Naviguer** avec les onglets visuels

### 📄 Publipostage Multi-Templates
1. **Onglet "Publipostage"**
2. **Sélectionner** les expertises (scroll horizontal)
3. **Choisir** les templates (grid responsive)
4. **"Générer les documents"**
5. **Téléchargement automatique** vers Téléchargements

## 🔧 Configuration Serveur

### Connexion Directe (SANS Tailscale)
- **IP principale** : `http://192.168.1.100:8081`
- **Fallback** : `http://localhost:8081`
- **Timeout** : 10 secondes
- **Mode** : Synchronisation manuelle uniquement

### API Endpoints Requis
```
GET  /api/ping                    # Test connexion
GET  /api/sync/full-database      # Téléchargement BDD complète
POST /api/publipostage/generate   # Génération documents
```

## 📱 Interface Responsive

### Breakpoints Optimisés
- **iPhone 15 Pro** (≤430px) : Navigation bottom, templates 2 colonnes
- **iPad Pro** (1024-1366px) : Onglets larges, templates 4 colonnes
- **Desktop** (>1366px) : Interface complète avec sidebar

### Fonctionnalités Tactiles
- **Tap highlight** désactivé
- **Scroll momentum** iOS natif
- **Gestures** optimisées
- **Safe areas** respectées

## 🚀 Déploiement GitHub

### Repository
- **URL** : https://github.com/i3ak4/crimitrack-pwa
- **Déploiement** : GitHub Pages automatique
- **PWA Live** : https://i3ak4.github.io/crimitrack-pwa/

### Commands Git
```bash
git clone https://github.com/i3ak4/crimitrack-pwa.git
cd crimitrack-pwa
# Développement local...
git add .
git commit -m "Improvements"
git push origin main
```

## 🔍 Différences v1.0 → v2.0

| Fonctionnalité | v1.0 (Tailscale) | v2.0 (Direct) |
|----------------|-------------------|----------------|
| **Connexion** | Tailscale automatique | Bouton sync manuel |
| **Navigation** | Sidebar classique | Onglets visuels |
| **Publipostage** | Template unique | Multi-templates |
| **Optimisation** | Générique | iPad 13" / iPhone 15 Pro |
| **Téléchargement** | API complexe | Dossier standard |
| **Interface** | Desktop-first | Mobile-first |

## 🛠️ Maintenance

## 📲 Installation

### 1. Sur Mac Mini (Serveur)

```bash
# Copier l'application principale
cp -r CrimiTrack_PWA/* /Users/leonard/Library/Mobile\ Documents/com~apple~CloudDocs/Support/CrimiTrack/

# Installer Tailscale
brew install tailscale
tailscale up

# Noter l'adresse Tailscale du Mac Mini
tailscale ip -4
```

### 2. Sur iPhone/iPad

1. Ouvrir Safari
2. Naviguer vers `http://mac-mini.tail-scale.ts.net:8081`
3. Appuyer sur le bouton Partager
4. Sélectionner "Sur l'écran d'accueil"
5. L'app s'installe comme une PWA native

### 3. Sur MacBook Air

1. Ouvrir Chrome/Edge
2. Naviguer vers `http://mac-mini.tail-scale.ts.net:8081`
3. Cliquer sur l'icône d'installation dans la barre d'adresse
4. L'app s'installe comme application desktop

## 🔧 Configuration

### Tailscale (Tous appareils)

1. Installer l'app Tailscale depuis l'App Store
2. Se connecter avec le même compte sur tous les appareils
3. Vérifier que tous les appareils sont sur le même réseau Tailscale

### Paramètres par Appareil

**iPhone**
- Cache : 500 MB (3 derniers mois)
- Modules : Agenda, Stats, Convocations
- Sync : Sur WiFi uniquement

**iPad Pro**
- Cache : 2 GB (6 derniers mois)
- Modules : Tous sauf facturation
- Sync : WiFi + 5G

**MacBook Air**
- Cache : 5 GB (illimité)
- Modules : Tous
- Sync : Temps réel

## 💡 Utilisation

### Bouton Mode Connexion
- **🟢 Vert** : Connecté au Mac Mini via Tailscale
- **🟡 Jaune** : En ligne mais serveur inaccessible
- **🔴 Rouge** : Mode hors ligne actif

### Synchronisation
- **Automatique** : Toutes les 5 minutes (configurable)
- **Manuelle** : Bouton sync dans le header
- **Badge** : Nombre d'éléments en attente

### Création Expertise Hors Ligne
1. Créer l'expertise normalement
2. Les données sont stockées localement
3. Synchronisation automatique au retour en ligne
4. Notification de succès

## 📊 Performances

### Temps de Chargement
- **Premier chargement** : < 3s sur 4G
- **Chargements suivants** : < 500ms (cache)
- **Mode offline** : Instantané

### Stockage
- **iPhone** : ~200 MB typique
- **iPad** : ~800 MB typique
- **MacBook** : ~2 GB typique

### Batterie
- Optimisation automatique sur batterie faible
- Sync réduite en mode économie
- Animations désactivées si < 20%

## 🐛 Troubleshooting

### "Serveur non accessible"
1. Vérifier Tailscale connecté sur tous appareils
2. Vérifier que le serveur Python tourne sur Mac Mini
3. Essayer l'IP de fallback dans les paramètres

### "Synchronisation échouée"
1. Vérifier la connexion internet
2. Vider le cache du navigateur
3. Réinstaller la PWA

### "Espace insuffisant"
1. L'app nettoie automatiquement les anciennes données
2. Forcer nettoyage : Paramètres > Stockage > Nettoyer

## 🎉 Prochaines Étapes

### Pour tester immédiatement
1. Lancer le serveur sur Mac Mini : `python3 server.py`
2. Ouvrir sur iPhone/iPad via Safari
3. Installer comme PWA
4. Tester le mode offline en coupant le WiFi

### Améliorations futures
- [ ] Notifications push natives
- [ ] Widgets iOS 17+
- [ ] Sync avec Apple Watch
- [ ] Mode collaboratif multi-utilisateurs

## 📝 Notes Importantes

- Les données sont synchronisées via Tailscale (VPN sécurisé)
- Aucune donnée n'est stockée dans le cloud public
- Backup automatique quotidien sur Mac Mini
- Compatible iOS 15+, iPadOS 15+, macOS 12+

## 🆘 Support

Pour toute question ou problème :
1. Consulter les logs : `Paramètres > Debug > Logs`
2. Exporter les diagnostics : `Paramètres > Debug > Export`
3. Contact : [Votre email]

---

**CrimiTrack PWA v1.0.0** - Déployé avec succès le 10/02/2025