# Sprint 0 — Fondations et spikes — 15 novembre 2026

## Objectif et résultat : partiel

Le socle web compile en production. Les sources Stitch, les tokens et les assets locaux sont importés, SQLite fonctionne dans le navigateur, les sondes LRCLIB sont documentées et les contrôles automatiques passent. L’API Jamendo n’a pas pu fournir de piste réelle sans le `client_id`. Le projet reste sur `sprint/0-fondations`, sans merge vers `main` ; le tag `v0.1.0` publie l’APK, mais la recette physique et l’audio natif en arrière-plan restent à valider.

### Mise à jour après ajout de la pipeline cloud

Le run [GitHub Actions #43765584497](https://github.com/pauldjeuda/HEAR/actions/runs/43765584497) a réussi les jobs Web et Android. `assembleDebug` et `apksigner` passent sur le runner cloud, et l’APK est conservé comme artefact Actions. Cette validation remplace le blocage local d’assemblage ; elle ne remplace pas l’installation sur le téléphone ni les tests audio en arrière-plan.

Le correctif d’application a ensuite réussi les contrôles Web et Android dans le [run #43771448620](https://github.com/pauldjeuda/HEAR/actions/runs/43771448620). Le [run de tag #43771672223](https://github.com/pauldjeuda/HEAR/actions/runs/43771672223) a également réussi et publié [Hear v0.1.0](https://github.com/pauldjeuda/HEAR/releases/tag/v0.1.0) avec l’APK debug signé et vérifié.

La page temporaire de fondation a été remplacée sur la branche par un accueil et une navigation vers Recherche, Collection, Hors ligne et Réglages. Les playlists locales, le contrôle SQLite, l’import de fichiers audio du téléphone, leur persistance locale et la lecture au premier plan sont accessibles ; la recherche Jamendo attend toujours un identifiant et l’audio natif en arrière-plan n’est pas livré. Les neuf écrans Stitch sont conservés comme référence et leur conversion complète reste à faire.

Le correctif interface/branding et audio local (logo Hear, splash et icône Android, navigation, retour, défilement, playlists, import et lecture de fichiers locaux) a passé les tests du workflow cloud. La recette sur téléphone reste à faire.

## Stories livrées

| Story | État                 | Critères vérifiés                                                                                                                                                          |
| ----- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-001 | Livrée               | Projet Ionic Angular standalone strict, Capacitor, scripts, lint/formatage et tests ; build production réussi.                                                             |
| H-002 | Livrée pour le socle | Les neuf écrans, leurs HTML et PNG, `DESIGN.md`, polices locales, tokens et sprite sont conservés sous `design/`/`src/`. La conversion des écrans appartient à S1.         |
| H-003 | Partielle            | Plateforme Android générée ; `cap sync`, assemblage `assembleDebug` et vérification `apksigner` réussis dans GitHub Actions. Installation et recette téléphone en attente. |
| H-004 | Partielle            | Paramètres documentés depuis la doc officielle ; appel `client_id=demo` rejeté avec code 5. Pas de réponse Jamendo valide sans l’identifiant fourni par Paul.              |
| H-005 | Livrée avec réserve  | `/get`, `/search`, instrumental et 404 sondés ; fixtures expurgées des paroles. Le User-Agent de production reste à compléter par un lien ou contact.                      |
| H-006 | Partielle            | Import et lecture de fichiers locaux au premier plan sont intégrés et testés en E2E ; moteur natif Media3, écran verrouillé et lecture en arrière-plan restent à valider.       |
| H-007 | Partielle            | Migration v1 et sonde lecture/écriture SQLite navigateur validées par e2e ; SQLite natif non éprouvé sur Android.                                                          |
| H-008 | Livrée               | `npm run verify` réussit et examine 30 fichiers.                                                                                                                           |

## Stories reportées et blocages

- H-003 : installer [l’APK de la Release v0.1.0](https://github.com/pauldjeuda/HEAR/releases/tag/v0.1.0) et effectuer la recette sur le téléphone.
- H-004 : refaire les requêtes Jamendo réelles avec `JAMENDO_CLIENT_ID` dans `.env.local`, puis compléter les fixtures et les endpoints albums/artistes.
- H-006 : valider les fichiers audio locaux sur téléphone ; implémenter Media3 si nécessaire pour l’écran éteint, la notification, le casque et les interruptions d’appel.
- H-007 : répéter la migration et la sonde SQLite sur Android.
- H-601 à H-606 : suspendues. Les conditions Jamendo consultées interdisent les applications conçues pour mettre le contenu en cache ou fournir un accès hors ligne. Il faut une autorisation écrite ou une source compatible avant de réaliser le téléchargement Jamendo.

## Résultats des portes de qualité

| Porte                         | Commande                                                 | Résultat réel                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint et formatage             | `npm run lint`                                           | `All files pass linting.` puis `All matched files use Prettier code style!` — code 0.                                                                             |
| Tests unitaires et couverture | `npm test`                                               | `Test Files 2 passed (2)`, `Tests 3 passed (3)` — code 0. Le seuil de couverture de la logique pure n’est pas configuré ni mesuré ; porte partielle.              |
| Build production              | `npm run build -- --configuration production`            | `Application bundle generation complete`; sortie `dist/hear` — code 0.                                                                                            |
| Capacitor et APK              | GitHub Actions #43771448620 et #43771672223             | `assembleDebug` et `apksigner verify` réussis ; Release `v0.1.0` publiée avec l’APK debug. Le build local reste indisponible faute de JDK/SDK.                         |
| E2E                           | `npm run e2e`                                            | `4 passed (8.9s)` ; tests couvrent navigation/retour, molette, création de playlist et SQLite, puis import, lecture et persistance d’un fichier audio local.          |
| Contenu factice               | `npm run verify`                                         | `Vérification HEAR réussie (30 fichiers examinés).`                                                                                                               |
| Fidélité visuelle             | Comparaison aux `screen.png`                             | Non applicable à S0 : aucun écran Stitch n’a encore été converti. La comparaison sera faite à S1 pour chaque écran modifié.                                       |
| Recette manuelle              | Android physique                                         | À faire par Paul ; la Release contient l’APK debug installable, mais aucun téléphone n’a été connecté aux runs cloud.                                                 |
| Rapport, branche et tag       | État Git                                                 | Correctif poussé sur `sprint/0-fondations` ; tag `v0.1.0` et Release APK publiés. Aucun merge vers `main` ; recette physique, Jamendo et audio arrière-plan restent ouverts. |

### Dépendances

`npm audit` rapporte 7 vulnérabilités modérées dans la chaîne de développement `typescript-eslint`/`minimatch`, aucune haute ou critique. `npm audit fix --dry-run` propose seulement un correctif forcé accompagné d’une rétrogradation breaking vers `typescript-eslint@8.36.0`. Aucun changement automatique n’a été appliqué. Voir K-006 et ADR-0008.

## Démo scriptée

1. Depuis la racine, lancer `npm start`.
2. Vérifier le logo, l’accueil et les accès Recherche/Collection.
3. Dans **Collection**, créer une playlist, puis la supprimer si nécessaire.
4. Dans **Collection > Titres locaux**, choisir un fichier audio, le lire puis le mettre en pause.
5. Fermer et relancer l’application ; le titre importé doit toujours figurer dans la bibliothèque privée Hear.
6. Dans **Réglages**, appuyer sur **VÉRIFIER SQLITE** ; la base doit afficher **PRÊTE** et confirmer l’écriture puis la lecture.

Cette démo lit un fichier local au premier plan ; les commandes écran verrouillé et la lecture en arrière-plan restent à vérifier sur téléphone.

## Recette manuelle pour Paul

- [ ] Installer l’APK de la [Release v0.1.0](https://github.com/pauldjeuda/HEAR/releases/tag/v0.1.0) et vérifier le splash Hear, l’icône et l’ouverture directe de l’accueil.
- [ ] Naviguer entre Accueil, Recherche et Collection ; créer une playlist locale.
- [ ] Importer un fichier audio du téléphone, le lire et vérifier sa présence après avoir fermé puis rouvert Hear.
- [ ] Dans Réglages, appuyer sur **VÉRIFIER SQLITE** ; résultat attendu : **PRÊTE**.
- [ ] Après création du client ID, le placer dans `.env.local` (`JAMENDO_CLIENT_ID=…`) et vérifier une recherche réelle Jamendo. L’identifiant reste local et ignoré par Git.
- [ ] Avec une piste Jamendo réelle autorisée, vérifier lecture continue écran éteint pendant 5 minutes, notification/écran verrouillé, boutons casque et pause lors d’un appel.
- [ ] Décider de la source ou obtenir une autorisation explicite avant tout téléchargement hors ligne de contenu Jamendo.

## Écarts visuels vs maquettes

Les écrans complets restent à convertir. Le shell, l’accueil vide sans données fictives, les accès rapides et le branding reprennent les couleurs, typographies et le disque vinyle des références. La comparaison détaillée écran par écran reste à faire.

## Bugs ouverts / dette technique

- K-001 — client ID Jamendo absent ; pas de données réelles Jamendo.
- K-002 — conditions Jamendo en conflit avec l’écoute hors ligne demandée.
- K-003 — JDK/SDK/adb absents ; APK non assemblable ici.
- K-004 — lecture locale au premier plan intégrée via WebView, service Media3 et recette Android en arrière-plan encore à faire.
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
