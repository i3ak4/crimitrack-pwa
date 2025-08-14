# CrimiTrack Portable PWA

Application Progressive Web App pour la gestion d'expertises judiciaires et publipostage.

## 🚀 Accès à l'application

**[Accéder à CrimiTrack Portable](https://i3ak4.github.io/crimitrack-pwa/)**

## 📱 Installation sur iOS

1. Ouvrez le lien ci-dessus dans Safari sur votre iPhone ou iPad
2. Appuyez sur le bouton Partager (carré avec flèche vers le haut)
3. Sélectionnez "Sur l'écran d'accueil"
4. L'application sera installée comme une app native

## ✨ Fonctionnalités

### 📅 **Agenda**
- Vue calendaire des expertises
- Filtres par date, période et statut
- Recherche par nom, magistrat ou tribunal

### 📋 **Liste d'attente**
- Gestion des expertises programmées et en attente
- Recherche instantanée

### 📄 **Publipostage**
- Upload de templates Word (.docx) depuis votre appareil
- Fusion automatique avec les données des expertises
- Génération de documents Word personnalisés

### 📊 **Statistiques**
- Nombre d'expertises par tribunal (Paris, Créteil, Bobigny)
- Statistiques mensuelles et annuelles
- Graphiques interactifs

## 🔒 Sécurité & Confidentialité

- **100% hors ligne** : Toutes les données restent sur votre appareil
- **Aucun serveur** : Pas de transmission de données
- **Stockage local** : Utilise le localStorage du navigateur

## 💾 Gestion des données

- **Import** : Chargez votre base de données au format JSON
- **Export** : Sauvegardez vos données à tout moment
- **CRUD complet** : Ajoutez, modifiez, supprimez des expertises

## 🎨 Design

- Interface optimisée pour iPad 13" et iPhone
- Design tactile et responsive
- Mode clair/sombre automatique

## 📝 Variables pour le publipostage

Utilisez ces variables dans vos templates Word :
- `{patronyme}` - Nom de l'expertisé
- `{date_examen}` - Date de l'examen
- `{lieu_examen}` - Lieu
- `{magistrat}` - Nom du magistrat
- `{tribunal}` - Tribunal judiciaire
- `{numero_parquet}` - N° Parquet
- `{numero_instruction}` - N° Instruction
- `{chefs_accusation}` - Chefs d'accusation
- Et plus...

## 🛠 Technologies utilisées

- HTML5 / CSS3 / JavaScript vanilla
- Service Worker pour le mode hors ligne
- Docxtemplater pour le traitement des documents Word
- Canvas API pour les graphiques

## 📄 Licence

Propriété privée - Tous droits réservés

---

Développé avec ❤️ pour une gestion efficace des expertises judiciaires