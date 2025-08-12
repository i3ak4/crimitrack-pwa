# 📚 Guide de Déploiement CrimiTrack PWA

## 🎯 Vue d'ensemble

CrimiTrack PWA se compose de deux parties :
1. **Frontend PWA** : Interface web accessible depuis n'importe où
2. **Backend Server** : Serveur Python sur votre Mac Mini (données privées)

## 🌐 Étape 1 : Déployer le Frontend PWA

### Option A : GitHub Pages (Recommandé - Gratuit)

1. **Créer un compte GitHub** (si pas déjà fait)
   - Aller sur [github.com](https://github.com)
   - Sign up gratuitement

2. **Créer un nouveau repository**
   ```
   Nom : crimitrack-pwa
   Visibilité : Public (nécessaire pour GitHub Pages gratuit)
   Initialiser : Sans README (on va pousser notre code)
   ```

3. **Préparer le code PWA**
   ```bash
   cd /Users/leonard/Library/Mobile\ Documents/com~apple~CloudDocs/Support/CrimiTrack_PWA
   
   # Initialiser git
   git init
   
   # Configurer votre identité
   git config user.name "Votre Nom"
   git config user.email "votre.email@example.com"
   
   # Ajouter tous les fichiers
   git add .
   
   # Premier commit
   git commit -m "Déploiement initial CrimiTrack PWA"
   
   # Lier au repository GitHub
   git remote add origin https://github.com/[VOTRE-USERNAME]/crimitrack-pwa.git
   
   # Pousser le code
   git push -u origin main
   ```

4. **Activer GitHub Pages**
   - Aller dans Settings → Pages
   - Source : Deploy from a branch
   - Branch : main
   - Folder : / (root)
   - Save

5. **Accéder à votre PWA**
   - URL : `https://[VOTRE-USERNAME].github.io/crimitrack-pwa`
   - Attendre 5-10 minutes pour le premier déploiement

### Option B : Vercel (Alternative - Instantané)

1. **Via l'interface web**
   - Aller sur [vercel.com](https://vercel.com)
   - Se connecter avec GitHub
   - Import Git Repository → Sélectionner crimitrack-pwa
   - Deploy

2. **Via CLI**
   ```bash
   npm install -g vercel
   cd CrimiTrack_PWA
   vercel
   # Suivre les instructions
   ```

## 🖥️ Étape 2 : Configurer le Backend (Mac Mini)

### 1. Installer Tailscale sur Mac Mini

```bash
# Installer via Homebrew
brew install tailscale

# Ou télécharger depuis App Store
# Chercher "Tailscale"

# Se connecter
tailscale up

# Noter votre adresse Tailscale
tailscale ip -4
# Exemple : 100.64.1.2
```

### 2. Configurer le serveur Python

```bash
cd /Users/leonard/Library/Mobile\ Documents/com~apple~CloudDocs/Support/CrimiTrack

# Créer un fichier de configuration CORS
cat > cors_config.py << 'EOF'
ALLOWED_ORIGINS = [
    "https://[VOTRE-USERNAME].github.io",
    "http://localhost:8081",
    "http://127.0.0.1:8081"
]
EOF

# Modifier server.py pour accepter les connexions externes
# Ajouter après les imports :
from cors_config import ALLOWED_ORIGINS

# Dans la classe HTTPRequestHandler, modifier end_headers() :
def end_headers(self):
    origin = self.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        self.send_header('Access-Control-Allow-Origin', origin)
    else:
        self.send_header('Access-Control-Allow-Origin', '*')
    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    super().end_headers()
```

### 3. Lancer le serveur

```bash
# Créer un script de lancement
cat > start_server.sh << 'EOF'
#!/bin/bash
cd /Users/leonard/Library/Mobile\ Documents/com~apple~CloudDocs/Support/CrimiTrack
python3 server.py --host 0.0.0.0 --port 8081
EOF

chmod +x start_server.sh
./start_server.sh
```

### 4. Configurer le démarrage automatique (optionnel)

```bash
# Créer un LaunchAgent
cat > ~/Library/LaunchAgents/com.crimitrack.server.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.crimitrack.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/leonard/Library/Mobile Documents/com~apple~CloudDocs/Support/CrimiTrack/server.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.crimitrack.server.plist
```

## 📱 Étape 3 : Installer sur vos Appareils

### Sur iPhone/iPad

1. **Installer Tailscale**
   - App Store → Rechercher "Tailscale"
   - Installer et se connecter avec le même compte

2. **Configurer la PWA**
   ```javascript
   // Modifier config/config.js AVANT de pousser sur GitHub
   server: {
     tailscale: 'http://100.64.1.2:8081', // Votre IP Tailscale
     local: 'http://192.168.1.100:8081'   // Votre IP locale
   }
   ```

3. **Installer la PWA**
   - Ouvrir Safari
   - Aller sur `https://[votre-username].github.io/crimitrack-pwa`
   - Tap sur Partager (icône carré avec flèche)
   - "Sur l'écran d'accueil"
   - Ajouter

### Sur MacBook Air

1. **Installer Tailscale** (même processus que Mac Mini)

2. **Installer la PWA**
   - Ouvrir Chrome ou Edge
   - Aller sur `https://[votre-username].github.io/crimitrack-pwa`
   - Cliquer sur l'icône d'installation dans la barre d'adresse
   - Installer

## 🔐 Étape 4 : Sécuriser l'Installation

### 1. Restreindre l'accès Tailscale

```bash
# Sur Mac Mini, configurer le firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/bin/python3
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --blockapp /usr/bin/python3

# Autoriser seulement Tailscale
tailscale serve --bg 8081 http://localhost:8081
```

### 2. Ajouter une authentification (optionnel)

```javascript
// Dans config/config.js
auth: {
  enabled: true,
  type: 'password',
  // Ne JAMAIS mettre le mot de passe dans GitHub !
  // Le configurer localement sur chaque appareil
}
```

### 3. Utiliser HTTPS

```bash
# Générer un certificat auto-signé
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Modifier server.py pour utiliser HTTPS
import ssl
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('cert.pem', 'key.pem')
```

## ✅ Vérification

### Test de connexion

1. **Sur iPhone** (connecté à Tailscale)
   - Ouvrir l'app CrimiTrack
   - Vérifier l'indicateur : 🟢 En ligne (Mac Mini)

2. **Mode hors ligne**
   - Désactiver WiFi/4G
   - L'app doit continuer à fonctionner
   - Indicateur : 🔴 Hors ligne

3. **Synchronisation**
   - Créer une expertise hors ligne
   - Réactiver la connexion
   - Vérifier la sync automatique

## 🚨 Dépannage

### "Impossible de se connecter au serveur"

1. Vérifier Tailscale connecté sur tous les appareils :
   ```bash
   tailscale status
   ```

2. Vérifier le serveur Python tourne :
   ```bash
   lsof -i :8081
   ```

3. Tester la connexion directe :
   ```bash
   curl http://100.64.1.2:8081/api/ping
   ```

### "CORS Policy Error"

Ajouter votre domaine GitHub Pages dans `ALLOWED_ORIGINS` du serveur.

### "PWA ne s'installe pas"

- Vérifier HTTPS activé (GitHub Pages le fait automatiquement)
- Vérifier manifest.json accessible
- Essayer un autre navigateur

## 📝 Maintenance

### Mise à jour du code PWA

```bash
cd CrimiTrack_PWA
git add .
git commit -m "Description des changements"
git push

# GitHub Pages se met à jour automatiquement (5-10 min)
```

### Backup des données

```bash
# Sur Mac Mini
cd /Users/leonard/Library/Mobile\ Documents/com~apple~CloudDocs/Support/CrimiTrack
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

## 🎉 C'est terminé !

Votre CrimiTrack PWA est maintenant :
- ✅ Accessible depuis n'importe où via GitHub Pages
- ✅ Sécurisé via Tailscale VPN
- ✅ Fonctionnel hors ligne sur tous vos appareils
- ✅ Synchronisé automatiquement avec votre Mac Mini

**Profitez de votre application mobile !**