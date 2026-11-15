# Sprint 0 — Planning

Date de planification : 15 novembre 2026  
Objectif : créer un socle mobile reproductible et réduire les risques Jamendo, paroles, audio natif et SQLite avant de construire les écrans.

## Backlog ordonné

| Ordre | Story | Travail prévu | Dépendances | État initial |
|---:|---|---|---|---|
| 1 | H-001 | Ionic/Angular standalone, lint, formatage, scripts, structure, dépôt Git | — | À faire |
| 2 | H-002 | Import des 9 maquettes, tokens, Tailwind compilé, polices et sprite SVG locaux | H-001 | À faire |
| 3 | H-003 | Capacitor Android, HTTP natif, portrait, projet debug | H-001 | À faire |
| 4 | H-007 | SQLite natif/web, schéma v1, sonde de lecture/écriture | H-001, H-003 | À faire |
| 5 | H-004 | Valider les appels Jamendo, paramètres, licences et fixtures | Client ID Jamendo | À faire |
| 6 | H-005 | Valider LRCLIB, erreurs, instrumental et fixtures expurgées | H-001 | À faire |
| 7 | H-006 | Grille des lecteurs natifs et preuve de lecture écran éteint | H-003, Client ID, téléphone | À faire |
| 8 | H-008 | Vérificateur de contenu factice et commande `npm run verify` | H-001, H-002 | À faire |

## Risques au démarrage

1. Aucun client ID Jamendo n’est fourni ; impossible de valider une réponse Jamendo réussie.
2. Aucun JDK, Android SDK ni `adb` n’est disponible dans l’environnement ; build APK et recette appareil à confirmer ailleurs.
3. Les conditions Jamendo consultées interdisent les applications conçues pour l’accès hors ligne au contenu. Cette règle contredit le périmètre de téléchargement hors ligne.
4. Aucun plugin vérifié ne documente les neuf critères audio, notamment le préchargement explicite de la piste suivante ; décision Media3 maison à éprouver sur appareil.

La progression technique continue sur les stories indépendantes. Une porte non vérifiable reste « à valider », jamais verte.
