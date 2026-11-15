# Checklist de recette

## Sprint 0 — automatisée

- [x] `npm run lint` — 0 erreur, Prettier conforme.
- [x] `npm test` — 2 fichiers, 3 tests réussis ; couverture non configurée.
- [x] `npm run build -- --configuration production` — OK.
- [x] `npx cap sync android` — 11 plugins synchronisés.
- [ ] Assemblage debug Android
- [x] `npm run e2e` — 2 tests réussis.
- [x] `npm run verify` — 27 fichiers examinés.

## Sprint 0 — téléphone Android

- [ ] Installer l’APK debug et vérifier que l’écran HEAR s’affiche.
- [ ] Appuyer sur « Vérifier SQLite » ; attendre « PRÊTE ».
- [ ] Configurer un client ID Jamendo et exécuter une recherche de piste réelle.
- [ ] Démarrer une piste Jamendo réelle, éteindre l’écran cinq minutes, puis rallumer et vérifier la continuité et la position.
- [ ] Vérifier contrôles notification/écran verrouillé, boutons casque et pause lors d’un appel entrant.

La piste hors ligne reste suspendue en attendant une autorisation de Jamendo ou un changement de fournisseur.
