# Architecture HEAR

## Parcours

`Écrans Angular` → `services locaux` → `Capacitor Preferences` et le plugin Android `LocalMusic`.

- Android `LocalMusicPlugin` demande la permission audio et interroge `MediaStore.Audio` pour indexer les fichiers visibles sur le téléphone.
- Les pistes natives restent des URI `content://` ; Hear n’en copie pas le contenu. La lecture native passe par `LocalPlaybackService` et `MediaPlayer`, avec audio focus, notification média, session Android, file de lecture et progression.
- Le navigateur utilise un adaptateur de test à sélection multiple et un lecteur Web Audio. Il n’existe pas d’indexeur de stockage Android dans le navigateur.
- `LocalCollectionStore` conserve favoris, historique, playlists et réglages sur l’appareil via Preferences.
- Recherche, artistes, bibliothèque et hors ligne sont des vues calculées à partir des pistes indexées. Aucun catalogue distant ni contenu seed n’est embarqué.

## Structure

- `src/app/app.html`, `app.ts`, `app.scss` : navigation et interface éditoriale issue du prototype Stitch.
- `src/app/core/audio/` : lecteur Web et contrat Capacitor pour MediaStore/lecture Android.
- `src/app/core/data/local-collection-store.service.ts` : préférences, favoris, historique et playlists.
- `android/app/src/main/java/app/hear/personal/` : plugin d’indexation et service de lecture.
- `design/stitch_minimalist_vinyl_music_app/` : références visuelles du prototype.

Les permissions Android restent limitées à l’audio. La permission `INTERNET` sert au serveur d’assets local de Capacitor ; l’application n’utilise aucun fournisseur de musique distant.
