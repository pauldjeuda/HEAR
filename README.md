# HEAR

Lecteur musical personnel Android. Les écrans suivent le prototype Stitch fourni : accueil, navigation, recherche, artistes, bibliothèque, hors ligne, réglages et lecteur plein écran.

## Musique locale

Sur Android, Hear demande l’autorisation **Musique et audio**, puis indexe automatiquement les titres visibles par Android MediaStore. La bibliothèque est actualisée à l’ouverture de l’application et au retour au premier plan si l’option correspondante reste activée. Une nouvelle analyse est aussi disponible dans les Réglages.

Hear lit les fichiers depuis leur emplacement sur le téléphone : il ne les copie pas dans l’application et ne les envoie pas à un service distant. Les permissions sont limitées à l’audio (`READ_MEDIA_AUDIO` sur Android 13 et versions ultérieures, stockage audio hérité sur les versions plus anciennes). Les favoris, playlists et réglages sont conservés sur l’appareil.

La recherche, les pages Artistes et Hors ligne utilisent les métadonnées des fichiers locaux uniquement. Aucun morceau de démonstration n’est inclus. Dans l’aperçu navigateur de la pipeline seulement, le sélecteur accepte plusieurs fichiers à la fois pour tester le lecteur sans téléphone Android.

## Pipeline cloud

GitHub Actions exécute le lint, les tests unitaires, les parcours Playwright, le contrôle de contenu et le build Android. Les pushes sur `sprint/**` produisent un APK debug comme artefact Actions. Un tag de version `v<version>` publie l’APK dans les [Releases GitHub](https://github.com/pauldjeuda/HEAR/releases).

La version de travail est **0.2.0**. Elle remplace la première version de fondation `0.1.0`; elle n’est publiée qu’après la réussite des contrôles cloud.
