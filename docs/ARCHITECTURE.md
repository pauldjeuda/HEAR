# Architecture Hear

## Couches

`Pages et composants Ionic` → `services de domaine Angular avec signals` → `providers API / repositories SQLite / plugins Capacitor`.

- Les pages ne parlent ni à `HttpClient` ni à SQLite directement.
- Jamendo et LRCLIB passent derrière des interfaces fournisseurs.
- L’état utilisateur reste local dans SQLite et Capacitor Preferences.
- Audio : interface TypeScript `AudioEngine` et moteur navigateur pour le développement. HearAudio avec Media3 `MediaSessionService` est le choix prévu pour Android ; le plugin natif n’est pas encore implémenté ni validé.
- Les appels HTTP mobiles utiliseront `CapacitorHttp`; Tailwind, polices et icônes sont compilés ou locaux.

## Socle livré en Sprint 0

- App Angular standalone, configuration Ionic, variables de thème et configuration Tailwind.
- Shell temporaire de fondation localisé en français ; le remplacement par les écrans issus des maquettes est prévu au Sprint 1.
- SQLite avec migration initiale des tables produit et sonde manuelle de lecture/écriture.
- Capacitor configuré avec `app.hear.personal`, `CapacitorHttp` et thème de lancement clair.
- Environnement local Jamendo généré depuis `.env.local`, ignoré par Git.

## Répertoires de destination

Le dossier `design/stitch_minimalist_vinyl_music_app/` contient la référence Stitch en lecture seule. Les modules d’application sont organisés sous `src/app/core`, `shared` et `features`. Les routes et écrans métier sont introduits au Sprint 1.
