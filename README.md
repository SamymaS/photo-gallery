# 📷 Photo Gallery App

Application mobile de gestion de photos avec Ionic, Capacitor et Leaflet.

## 🚀 Démarrage Rapide

### 1. Lancer l'application en mode développement (Web)

```bash
# Installer les dépendances (si nécessaire)
npm install

# Lancer l'application
npm start
```

L'application sera accessible sur `http://localhost:4200`

### 2. Tester sur Android

```bash
# D'abord, compiler l'application pour la production
npm run build

# Synchroniser avec Android
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android
```

Dans Android Studio :
- Ouvrez l'appareil virtuel ou connectez un appareil physique
- Cliquez sur "Run" pour lancer l'application

## ✨ Fonctionnalités

- **Capture de photos** avec la caméra du téléphone
- **Galerie** avec grille responsive et miniatures
- **Carte interactive** avec marqueurs pour chaque photo
- **Géolocalisation** : chaque photo enregistre son lieu de prise
- **Like/Favoris** : marquer vos photos préférées
- **Cluster** de points sur la carte pour une meilleure lisibilité
- **Modal** détaillée avec informations complètes (date, localisation, adresse)

## 📱 Permissions Android

L'application nécessite les permissions suivantes (configurées dans `AndroidManifest.xml`) :
- `CAMERA` - Pour prendre des photos
- `ACCESS_FINE_LOCATION` - Pour géolocaliser les photos
- `ACCESS_COARSE_LOCATION` - Alternative pour la localisation
- `READ_MEDIA_IMAGES` - Pour accéder aux photos (Android 13+)
- `READ_EXTERNAL_STORAGE` - Pour stocker les photos (Android ≤12)

## 🎨 Technologies Utilisées

- **Ionic 8** - Framework mobile
- **Angular 20** - Framework web
- **Capacitor 7** - Bridge natif
- **Leaflet** - Cartes interactives
- **Leaflet MarkerCluster** - Clustering des marqueurs

## 📦 Structure du Projet

```
src/
├── app/
│   ├── components/
│   │   └── photo-modal/     # Modal de détail photo
│   ├── services/
│   │   └── photo.service.ts  # Service de gestion des photos
│   ├── tab1/                 # Page Caméra
│   ├── tab2/                 # Page Galerie
│   ├── tab3/                 # Page Carte
│   └── tabs/                 # Navigation
├── assets/                   # Icônes et ressources
└── global.scss              # Styles globaux
```

## 🧪 Tester l'Application

### Mode Web (Développement)
1. Lancez `npm start`
2. Ouvrez votre navigateur sur `http://localhost:4200`
3. Utilisez les outils de développement (F12) pour simuler un appareil mobile

**Note** : En mode web, la géolocalisation et la caméra nécessitent HTTPS ou localhost

### Mode Android
1. Compilez : `npm run build`
2. Synchronisez : `npx cap sync android`
3. Lancez dans Android Studio

## 🎯 Guide d'Utilisation

### Capturer une Photo
1. Ouvrez l'onglet **Caméra**
2. Autorisez l'accès à la caméra et à la localisation
3. Prenez une photo avec le bouton rond
4. La photo est automatiquement géolocalisée et enregistrée

### Consulter la Galerie
1. Ouvrez l'onglet **Galerie**
2. Visualisez toutes vos photos en grille
3. Cliquez sur une photo pour voir les détails
4. Likez ou supprimez une photo depuis la modal

### Voir sur la Carte
1. Ouvrez l'onglet **Carte**
2. Tous les marqueurs représentent vos photos
3. Cliquez sur un marqueur pour voir le popup
4. Cliquez sur le bouton "Voir détails" pour la modal complète
5. Les marqueurs sont automatiquement regroupés en clusters

## 🐛 Résolution de Problèmes

### Les photos ne se chargent pas
- Vérifiez les permissions dans les paramètres Android
- Redémarrez l'application

### La carte ne s'affiche pas
- Vérifiez votre connexion internet
- Les tuiles Leaflet nécessitent une connexion pour le premier chargement

### Les autorisations sont refusées
- Allez dans Paramètres Android > Applications > Photo Gallery
- Activez manuellement les permissions

## 📝 Commandes Utiles

```bash
# Développement
npm start              # Lance l'app en mode dev (web)
npm run build          # Compile pour la production

# Capacitor
npx cap sync          # Synchronise les changements
npx cap open android  # Ouvre Android Studio

# Tests
npm test             # Lance les tests unitaires
npm run lint         # Vérifie le code
```

## 🌟 Améliorations Futures

- Export de photos
- Partage social
- Filtres de photo
- Mode sombre
- Synchronisation cloud

## 📄 Licence

Ce projet est sous licence MIT.

