# Sprint 0 — Fondations et spikes — 15 novembre 2026

## Objectif et résultat : partiel

Le socle web compile en production. Les sources Stitch, les tokens et les assets locaux sont importés, SQLite fonctionne dans le navigateur, les sondes LRCLIB sont documentées et les contrôles automatiques du socle passent. L’API Jamendo n’a pas pu fournir de piste réelle sans le `client_id`. Le projet reste sur `sprint/0-fondations`, sans merge ni tag : les portes audio, API et recette physique ne sont pas vertes.

### Mise à jour après ajout de la pipeline cloud

Le run [GitHub Actions #43765584497](https://github.com/pauldjeuda/HEAR/actions/runs/43765584497) a réussi les jobs Web et Android. `assembleDebug` et `apksigner` passent sur le runner cloud, et l’APK est conservé comme artefact Actions. Cette validation remplace le blocage local d’assemblage ; elle ne remplace pas l’installation sur le téléphone ni les tests audio en arrière-plan.

L’écran de l’application est encore une page temporaire de fondation. Les neuf écrans Stitch sont conservés comme référence et ne sont pas encore convertis.

## Stories livrées

| Story | État                 | Critères vérifiés                                                                                                                                                          |
| ----- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-001 | Livrée               | Projet Ionic Angular standalone strict, Capacitor, scripts, lint/formatage et tests ; build production réussi.                                                             |
| H-002 | Livrée pour le socle | Les neuf écrans, leurs HTML et PNG, `DESIGN.md`, polices locales, tokens et sprite sont conservés sous `design/`/`src/`. La conversion des écrans appartient à S1.         |
| H-003 | Partielle            | Plateforme Android générée ; `cap sync`, assemblage `assembleDebug` et vérification `apksigner` réussis dans GitHub Actions. Installation et recette téléphone en attente. |
| H-004 | Partielle            | Paramètres documentés depuis la doc officielle ; appel `client_id=demo` rejeté avec code 5. Pas de réponse Jamendo valide sans l’identifiant fourni par Paul.              |
| H-005 | Livrée avec réserve  | `/get`, `/search`, instrumental et 404 sondés ; fixtures expurgées des paroles. Le User-Agent de production reste à compléter par un lien ou contact.                      |
| H-006 | Partielle            | Audit des plugins et décision Media3/`MediaSessionService` consignés ; aucun prototype natif ni lecture réelle écran éteint n’a pu être validé.                            |
| H-007 | Partielle            | Migration v1 et sonde lecture/écriture SQLite navigateur validées par e2e ; SQLite natif non éprouvé sur Android.                                                          |
| H-008 | Livrée               | `npm run verify` réussit et examine 27 fichiers.                                                                                                                           |

## Stories reportées et blocages

- H-003 : installer l’APK fourni comme artefact Actions et effectuer la recette sur le téléphone.
- H-004 : refaire les requêtes Jamendo réelles avec `JAMENDO_CLIENT_ID` dans `.env.local`, puis compléter les fixtures et les endpoints albums/artistes.
- H-006 : implémenter et compiler le prototype HearAudio/Media3 ; valider une vraie piste sur téléphone, écran éteint, notification, casque et interruption d’appel.
- H-007 : répéter la migration et la sonde SQLite sur Android.
- H-601 à H-606 : suspendues. Les conditions Jamendo consultées interdisent les applications conçues pour mettre le contenu en cache ou fournir un accès hors ligne. Il faut une autorisation écrite ou une source compatible avant de réaliser le téléchargement Jamendo.

## Résultats des portes de qualité

| Porte                         | Commande                                                 | Résultat réel                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint et formatage             | `npm run lint`                                           | `All files pass linting.` puis `All matched files use Prettier code style!` — code 0.                                                                             |
| Tests unitaires et couverture | `npm test`                                               | `Test Files 2 passed (2)`, `Tests 3 passed (3)` — code 0. Le seuil de couverture de la logique pure n’est pas configuré ni mesuré ; porte partielle.              |
| Build production              | `npm run build -- --configuration production`            | `Application bundle generation complete`; sortie `dist/hear` — code 0.                                                                                            |
| Capacitor et APK              | `npx cap sync android`, puis GitHub Actions #43765584497 | Sync réussi, 11 plugins ; `assembleDebug` et `apksigner verify` réussis sur le runner cloud. Le build local reste indisponible faute de JDK/SDK.                  |
| E2E                           | `npm run e2e`                                            | `2 passed (15.2s)` ; tests couvrent le shell français et l’écriture/lecture SQLite navigateur. Aucune erreur console ni erreur non interceptée dans les parcours. |
| Contenu factice               | `npm run verify`                                         | `Vérification HEAR réussie (27 fichiers examinés).`                                                                                                               |
| Fidélité visuelle             | Comparaison aux `screen.png`                             | Non applicable à S0 : aucun écran Stitch n’a encore été converti. La comparaison sera faite à S1 pour chaque écran modifié.                                       |
| Recette manuelle              | Android physique                                         | À faire par Paul ; l’APK debug installable est disponible comme artefact Actions, mais aucun téléphone n’a été connecté à ce run.                                 |
| Rapport, branche et tag       | État Git                                                 | Rapport ajouté sur `sprint/0-fondations`. Aucun merge vers `main` ni tag, car les portes Android, audio, Jamendo et recette ne sont pas validées.                 |

### Dépendances

`npm audit` rapporte 7 vulnérabilités modérées dans la chaîne de développement `typescript-eslint`/`minimatch`, aucune haute ou critique. `npm audit fix --dry-run` propose seulement un correctif forcé accompagné d’une rétrogradation breaking vers `typescript-eslint@8.36.0`. Aucun changement automatique n’a été appliqué. Voir K-006 et ADR-0008.

## Démo scriptée

1. Depuis la racine, lancer `npm start`.
2. Vérifier que la page HEAR en français indique que l’identifiant Jamendo est à fournir et que le test SQLite n’a pas encore été exécuté.
3. Appuyer sur **VÉRIFIER SQLITE** ; le navigateur doit afficher **PRÊTE** et confirmer l’écriture puis la lecture.

Cette démo vérifie le socle uniquement ; elle ne lit pas de musique.

## Recette manuelle pour Paul

- [ ] Installer JDK et Android SDK compatibles avec Capacitor 8, puis relancer `npm run cap:sync` et `cd android; .\gradlew.bat assembleDebug`.
- [ ] Installer l’APK debug et vérifier le démarrage portrait ainsi que l’écran de fondation.
- [ ] Appuyer sur **VÉRIFIER SQLITE** ; résultat attendu : **PRÊTE**.
- [ ] Après création du client ID, le placer dans `.env.local` (`JAMENDO_CLIENT_ID=…`) et vérifier une recherche réelle Jamendo. L’identifiant reste local et ignoré par Git.
- [ ] Avec une piste Jamendo réelle autorisée, vérifier lecture continue écran éteint pendant 5 minutes, notification/écran verrouillé, boutons casque et pause lors d’un appel.
- [ ] Décider de la source ou obtenir une autorisation explicite avant tout téléchargement hors ligne de contenu Jamendo.

## Écarts visuels vs maquettes

Aucun écart de conversion mesuré : le shell temporaire ne prétend pas reproduire les maquettes. Les comparaisons pixel seront consignées au Sprint 1, écran par écran.

## Bugs ouverts / dette technique

- K-001 — client ID Jamendo absent ; pas de données réelles Jamendo.
- K-002 — conditions Jamendo en conflit avec l’écoute hors ligne demandée.
- K-003 — JDK/SDK/adb absents ; APK non assemblable ici.
- K-004 — moteur Media3 décidé mais pas compilé ni testé sur appareil.
- K-005 — User-Agent LRCLIB sans lien de projet ni contact.
- K-006 — 7 alertes npm modérées dans les outils de développement ; correctif automatique breaking seulement.
- Couverture des tests purs non mesurée ; tests Android natifs inexistants à ce stade.

## Décisions prises

- [DECISIONS.md](DECISIONS.md) : Ionic 8, Media3, blocage hors ligne Jamendo, fixtures LRCLIB expurgées, configuration locale du client ID, haptique et épinglage SQL.js ; ADR-0008 consigne l’audit npm.
- [API_NOTES.md](API_NOTES.md) : requêtes Jamendo et LRCLIB réellement sondées, limites et conditions relevées.

## Risques mis à jour

Les risques critiques audio, client ID et conditions hors ligne restent ouverts ; le risque de compilation Android est confirmé. Le navigateur permet de continuer les travaux indépendants, mais il ne remplace pas la validation de l’APK et du téléphone.

## Rétrospective

- **À garder :** consigner les limites des API avant d’écrire des parcours fictifs ; valider SQLite web par un parcours réel navigateur.
- **À améliorer :** disposer plus tôt du JDK/SDK Android et d’un téléphone de recette pour éprouver les plugins natifs au fil du sprint.
- **Action :** reprendre H-003, H-006 et H-007 dès que l’environnement Android est prêt ; conserver l’accès hors ligne bloqué jusqu’à décision de source/licence.

## Prochain sprint

Sprint 1 vise le design system et la coquille navigable (H-101 à H-105) selon le planning. Il n’est pas démarré : ce rapport clôt le lot d’investigation S0 et la mission attend le retour de recette et le message `GO SPRINT 1` de Paul, conformément au mode par défaut.
