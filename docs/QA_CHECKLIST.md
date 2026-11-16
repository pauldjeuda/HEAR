# Vérifications

## Pipeline GitHub Actions

- [ ] Lint et formatage.
- [ ] Tests unitaires.
- [ ] Parcours Playwright : navigation et retour, recherche locale, lecteur, favoris, playlists, réglages et molette.
- [ ] Vérification qu’aucun contenu audio n’est prérempli.
- [ ] Build Android et vérification de signature APK.
- [ ] Présence de l’APK dans l’artefact de build ou dans la Release versionnée.

## Téléphone Android

- [ ] Installer l’APK 0.2.1 depuis la Release GitHub.
- [ ] Accorder l’accès aux fichiers audio ; vérifier que la bibliothèque se remplit sans sélectionner les morceaux un par un.
- [ ] Vérifier accueil, recherche, artistes, bibliothèque, hors ligne, réglages et retour Android.
- [ ] Faire défiler chaque page avec le geste tactile et vérifier la molette dans l’aperçu navigateur.
- [ ] Lire plusieurs titres, chercher un passage, mettre en pause, reprendre et utiliser suivant/précédent.
- [ ] Éteindre l’écran et vérifier la continuité, la notification média et les commandes casque.
- [ ] Ajouter un favori et une playlist, fermer puis rouvrir Hear et vérifier leur persistance.
- [ ] Activer/désactiver l’indexation automatique et le thème, puis vérifier les préférences après redémarrage.
- [ ] Ajouter un nouveau fichier audio au téléphone et vérifier sa découverte au retour dans Hear.
- [ ] Révoquer l’autorisation audio dans Android et vérifier que l’application affiche un état clair, sans plantage.

Le runner cloud compile l’APK mais ne remplace pas ces vérifications sur appareil physique.
