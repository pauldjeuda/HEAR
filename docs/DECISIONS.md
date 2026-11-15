# Décisions techniques

Dernière mise à jour : 15 novembre 2026.

## Hypothèses du brief

- Plateforme prioritaire : Android sur le téléphone de Paul ; iOS reste une cible de code ultérieure, sans recette dans cette mission.
- Nom : Hear ; identifiant d’application `app.hear.personal`.
- Interface : français uniquement, avec les chaînes prêtes à être centralisées.
- Client ID Jamendo : absent pour le moment. Un client ID de démonstration est utilisé uniquement pour constater le refus d’authentification ; aucune réponse musicale de Jamendo n’est inventée.
- Connexion limitée : qualité Standard par défaut ; téléchargement Wi-Fi uniquement si le périmètre hors ligne est autorisé par le fournisseur.

## ADR courts

### ADR-0001 — Versions du socle — 2026-11-15

**Contexte :** le brief fixe Ionic 8 et demande les versions stables compatibles les plus récentes.  
**Décision :** Ionic Angular 8.8.19, Angular 22.2.6, Capacitor 8.6.2, TypeScript 6.0.2, Node 24.20.0. On garde la version majeure Ionic explicitement fixée, et on prend la dernière version de correctifs disponible dans cette ligne compatible, même si Ionic 9 existe. Tailwind 3.4.17 est compilé au build avec `preflight` désactivé pour limiter les conflits avec Ionic.  
**Conséquence :** vérifier les compatibilités des extensions Capacitor à chaque sprint.

### ADR-0002 — Lecture native Android — 2026-11-15

**Contexte :** les plugins maintenus étudiés annoncent streaming, fichiers locaux, notification, seek et événements, mais aucun ne documente le préchargement de la piste suivante avec les contrôles exigés. Le plugin Capgo indique aussi qu’il ne démarre pas le service Android de premier plan.  
**Décision :** retenir un plugin Capacitor HearAudio, basé sur Media3 ExoPlayer et `MediaSessionService` de premier plan (`mediaPlayback`) pour Android. WebAudio reste réservé au navigateur.  
**Validation :** choix d’architecture seulement ; lecture réelle, interruptions et commandes casque attendent un build Android et un téléphone.

### ADR-0003 — Accès hors ligne Jamendo — 2026-11-15

**Contexte :** le périmètre demande de télécharger et lire hors ligne des titres Jamendo. Les conditions d’utilisation Jamendo consultées disent que les applications ne doivent pas être conçues pour mettre le contenu en cache ou fournir un accès hors ligne.  
**Décision :** ne pas implémenter le téléchargement ni l’écoute hors ligne de contenu Jamendo avant une autorisation écrite ou un changement de source compatible. Les fichiers locaux appartenant à l’utilisateur restent un sujet distinct à examiner.  
**Conséquence :** ce conflit bloque H-601 à H-606 et empêche de considérer la mission initiale comme livrable sans décision produit/licence.

### ADR-0004 — Fixtures LRCLIB expurgées — 2026-11-15

**Contexte :** les réponses réelles LRCLIB incluent parfois des paroles protégées.  
**Décision :** les fixtures réelles conservent requête, statut, métadonnées, et présence/absence des champs paroles ; le texte intégral des paroles n’est pas enregistré.  
**Conséquence :** les tests du parseur LRC utiliseront des exemples synthétiques, et les métadonnées des fixtures restent issues d’appels réels.

### ADR-0005 — Client ID Jamendo — 2026-11-15

**Contexte :** l’application n’a pas de serveur et le client ID est nécessaire aux requêtes publiques Jamendo.  
**Décision :** lire `JAMENDO_CLIENT_ID` depuis `.env.local`, fichier ignoré par Git. Le script `scripts/write-environment.mjs` génère le fichier local ignoré consommé par Angular. Un identifiant embarqué dans l’application cliente est visible à l’exécution et ne doit pas être traité comme un secret.

### ADR-0006 — Retour haptique — 2026-11-15

**Décision :** utiliser `@capacitor/haptics`. Aucun appel direct à `navigator.vibrate` n’est prévu hors d’un éventuel service de repli.

### ADR-0007 — WASM SQLite web — 2026-11-15

**Contexte :** le module `jeep-sqlite` publié embarque le glue code généré avec SQL.js 1.11.0. La résolution semver prenait SQL.js 1.16.0 et échouait à l’initialisation WASM.  
**Décision :** épingler SQL.js 1.11.0 en dépendance de développement et copier son `sql-wasm.wasm` dans `public/assets` avant le démarrage/build.  
**Validation :** écriture et lecture SQLite navigateur vérifiées avec Playwright après l’épinglage.

### ADR-0008 — Alertes npm du lint — 2026-11-15

**Contexte :** `npm audit` signale 7 vulnérabilités modérées dans la chaîne de développement `typescript-eslint` / `minimatch`. Le correctif proposé par `npm audit fix --dry-run` rétrograde `typescript-eslint` en 8.36.0 et le qualifie de breaking change ; aucun correctif automatique sans changement majeur n’est offert.
**Décision :** conserver pour ce sprint les versions résolues compatibles et ne pas appliquer un `--force` aveugle. Retenir une vérification de compatibilité/correctif avant la livraison.
**Conséquence :** dette mineure ouverte sous K-006 ; aucune vulnérabilité haute ou critique signalée.
