# Checklist de recette

## Sprint 0 — automatisée

- [x] `npm run lint` — 0 erreur, Prettier conforme.
- [x] `npm test` — 2 fichiers, 3 tests réussis ; couverture non configurée.
- [x] `npm run build -- --configuration production` — OK.
- [x] `npx cap sync android` — 11 plugins synchronisés.
- [x] Assemblage debug Android — GitHub Actions : `assembleDebug` et vérification `apksigner` réussis ; artefact uploadé.
- [x] `npm run e2e` — 4 tests réussis : navigation/retour, molette, SQLite, playlists, import/lecture/persistance audio locale.
- [x] `npm run verify` — 30 fichiers examinés.

## Sprint 0 — téléphone Android

- [ ] Installer [l’APK debug de la Release v0.1.0](https://github.com/pauldjeuda/HEAR/releases/tag/v0.1.0) et vérifier l’icône Hear, le splash natif et l’ouverture directe de l’accueil.
- [ ] Naviguer vers Recherche, Collection, Hors ligne et Réglages.
- [ ] Créer une playlist locale, fermer/réouvrir l’application et vérifier qu’elle persiste.
- [ ] Importer un fichier audio du téléphone, le lire, mettre en pause, naviguer entre titres et vérifier qu’il persiste après redémarrage.
- [ ] Appuyer sur « Vérifier SQLite » dans Réglages ; attendre « PRÊTE ».
- [ ] Configurer un client ID Jamendo et exécuter une recherche de piste réelle.
- [ ] Démarrer une piste Jamendo réelle, éteindre l’écran cinq minutes, puis rallumer et vérifier la continuité et la position.
- [ ] Vérifier contrôles notification/écran verrouillé, boutons casque et pause lors d’un appel entrant.

La piste hors ligne reste suspendue en attendant une autorisation de Jamendo ou un changement de fournisseur.
