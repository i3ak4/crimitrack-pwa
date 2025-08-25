# 📋 CLAUDE.md - Notes importantes pour le développement

## 🔴 TRÈS IMPORTANT - Base de données de référence

### Fichier de référence principal
**`crimitrack-database-2025-08-24T23-21-38.json`**
- **NE JAMAIS PUBLIER CE FICHIER SUR GITHUB**
- Ce fichier contient la vraie base de données avec toutes les expertises
- À utiliser comme référence pour comprendre la structure exacte des données
- Contient ~8MB de données réelles

### Structure des champs (basée sur le fichier de référence)

#### Statuts possibles
- `"en_attente"` (avec underscore) - Expertise en attente
- `"programmee"` - Expertise programmée 
- `"realisee"` - Expertise réalisée

⚠️ **ATTENTION** : Le statut est `"en_attente"` et NON `"attente"`

#### Champs principaux d'une expertise
```json
{
  "patronyme": "string",
  "date_examen": "YYYY-MM-DD",
  "lieu_examen": "string",
  "date_naissance": "YYYY-MM-DD",
  "age": "number",
  "profession": "string",
  "domicile": "string",
  "telephone": "string",
  "email": "string",
  "numero_parquet": "string",
  "numero_instruction": "string",
  "chefs_accusation": "string",
  "magistrat": "string",
  "tribunal": "string",
  "opj_greffier": "string",
  "type_mission": "string",
  "date_oce": "YYYY-MM-DD",
  "limite_oce": "YYYY-MM-DD",
  "date_rapport": "YYYY-MM-DD",
  "date_envoi": "YYYY-MM-DD",
  "interprete": "string",
  "langue": "string",
  "kilometres": "number",
  "creance": "string",
  "date_paiement": "YYYY-MM-DD",
  "montant_paye": "string",
  "observations": "string",
  "statut": "en_attente|programmee|realisee",
  "heure_examen": "HH:MM",
  "_uniqueId": "string",
  "_importDate": "ISO datetime"
}
```

## 🛠️ Conventions de développement

### Noms des champs
- Toujours en `snake_case` (avec underscore)
- Exemples : `date_examen`, `limite_oce`, `numero_parquet`

### Statuts
- Utiliser exactement : `"en_attente"`, `"programmee"`, `"realisee"`
- Ne PAS utiliser : `"attente"`, `"en attente"` (avec espace), etc.

### Lieux d'examen spéciaux
- "BA" = Base Aérienne
- "Scellés" = Service des scellés
- Ces noms sont automatiquement corrigés par la fonction `fixLocationNames()`

## 📁 Fichiers à ne jamais publier

Ajouter au `.gitignore` :
```
crimitrack-database-*.json
*.db
*.db-shm
*.db-wal
```

## 🔧 Commandes utiles

### Vérifier la structure d'un champ
```bash
grep -n '"statut"' crimitrack-database-2025-08-24T23-21-38.json | head -20
```

### Compter les expertises par statut
```bash
grep -c '"statut": "en_attente"' crimitrack-database-2025-08-24T23-21-38.json
grep -c '"statut": "programmee"' crimitrack-database-2025-08-24T23-21-38.json
grep -c '"statut": "realisee"' crimitrack-database-2025-08-24T23-21-38.json
```

## 🚨 Points d'attention

1. **Filtres de statut** : Toujours vérifier que les filtres utilisent `"en_attente"` et non `"attente"`

2. **Onglet Prisons** : Doit afficher uniquement :
   - Expertises avec statut `"programmee"` OU `"en_attente"`
   - Avec date d'examen strictement supérieure à aujourd'hui

3. **Modal de formulaire** : 
   - Le titre change : "Nouvelle Expertise" / "Édition de l'expertise"
   - Tous les champs doivent être présents (voir structure ci-dessus)

4. **Performances** : La base réelle contient 3000+ expertises, optimiser les filtres et tris

## 📅 Dernière mise à jour
25 août 2025 - Session de développement avec Léonard