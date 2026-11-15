# Hear

Lecteur musical personnel pour Android, construit avec Ionic, Angular et Capacitor. L’interface est en français et reprend les maquettes Stitch conservées dans `design/stitch_minimalist_vinyl_music_app/`.

## Démarrer le web

Prérequis : Node.js 24.15+ et npm.

```powershell
npm install
Copy-Item .env.local.example .env.local
# Renseigner JAMENDO_CLIENT_ID dans .env.local
npm start
```

Le fichier `.env.local` est ignoré par Git. Angular génère `src/environments/environment.local.ts` avant le démarrage ou le build ; cet artefact est également ignoré.

## Vérifications locales

```powershell
npm run lint
npm test
npm run build -- --configuration production
npm run e2e
npm run verify
```

## Android

L’APK installable est disponible dans la [GitHub Release Hear v0.1.0](https://github.com/pauldjeuda/HEAR/releases/tag/v0.1.0). Sa génération et sa signature sont faites par GitHub Actions ; aucun JDK ni SDK Android local n’est nécessaire pour l’obtenir.

Installer Android Studio avec le JDK et le SDK Android requis par Capacitor 8, puis :

```powershell
npm run cap:sync
Set-Location android
.\gradlew.bat assembleDebug
```

L’APK debug se trouve dans `android/app/build/outputs/apk/debug/`. La lecture écran éteint et les commandes média doivent être testées sur un téléphone réel.

Pour construire et copier l’APK installable dans `release/` en une commande :

```powershell
npm run apk:debug
```

Cette commande génère également l’icône de l’application, le logo Android et les variantes de densité à partir des ressources Hear. La splash native Android utilise le même disque vinyle que le front.

La pipeline GitHub Actions lance lint, tests unitaires, e2e (navigation, playlist locale et SQLite), vérification anti-faux contenus et build Android. Elle publie l’APK comme artefact à chaque exécution réussie ; un tag `v<version du package.json>` ajoute l’APK debug à une GitHub Release. Cet APK est signé avec la clé debug Android, pas avec une clé de production.

L’application ouvre l’accueil et donne accès aux sections Recherche, Collection, Hors ligne et Réglages. Depuis l’accueil ou la collection, on peut choisir des fichiers audio sur le téléphone ; Hear les copie dans sa bibliothèque privée, les conserve après fermeture et les lit avec le lecteur intégré. Les playlists et l’import audio fonctionnent sans compte Jamendo et sans permission générale sur les fichiers du téléphone. La recherche du catalogue en ligne et les contrôles audio en arrière-plan restent à intégrer et valider ; aucun morceau de démonstration n’est inventé.

## État de portée

L’API Jamendo nécessite un client ID. Les conditions Jamendo actuellement consultées interdisent les applications conçues pour offrir l’accès hors ligne à son contenu ; le téléchargement de titres Jamendo reste donc suspendu dans l’attente d’une autorisation écrite ou d’un fournisseur compatible. Voir [API_NOTES.md](docs/API_NOTES.md), [DECISIONS.md](docs/DECISIONS.md) et [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).
