# Pipeline cloud et APK Android

Le workflow [ci-apk.yml](../.github/workflows/ci-apk.yml) s’exécute sur les pull requests vers `main`, les pushes sur `main` et `sprint/**`, les tags `v*`, et à la demande depuis GitHub Actions.

## Contrôles

- **Web** : installation verrouillée avec `npm ci`, lint et formatage, tests unitaires, vérification anti-contenu fictif, puis Playwright/Chromium. Les parcours vérifient la navigation, le retour, le défilement, l’index local de test dans le navigateur, les favoris, playlists, le lecteur et les réglages.
- **Android** : JDK 21 et SDK API 36 sur runner Ubuntu, build web, `cap sync android`, build `assembleDebug` et vérification de signature `apksigner`.
- **Artefact** : `hear-0.2.1-debug.apk`, conservé 30 jours après un build de branche.
- **Release** : le tag doit correspondre à la version du `package.json` (`v0.2.1`). Le job de publication attend les contrôles Web et Android et attache l’APK à la GitHub Release.

Toutes les installations de dépendances, les tests et la génération de l’APK s’exécutent dans GitHub Actions. Aucun téléchargement d’APK ou de SDK n’est requis sur le poste de travail.

Le build cloud confirme la compilation et la signature. Il ne simule pas les autorisations MediaStore ni une écoute sur appareil physique ; voir [QA_CHECKLIST.md](QA_CHECKLIST.md).
