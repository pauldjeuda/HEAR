# Notes API — Sprint 0

Vérification : 15 novembre 2026. Les appels ci-dessous ont été faits depuis l’environnement de développement. Les fichiers fixtures indiquent leurs requêtes et statuts.

## Jamendo

- Base documentée : `https://api.jamendo.com/v3.0/` ; les méthodes exigent un `client_id` délivré depuis le portail développeur.
- Sonde exécutée : `/tracks/?client_id=demo&format=json&limit=1&namesearch=test` → HTTP 200, mais enveloppe API `status=failed`, `code=5`, `Invalid Client Id`. Cette réponse d’erreur est conservée dans `fixtures/jamendo/invalid-client-id.json` ; aucune donnée de piste n’a pu être vérifiée sans l’identifiant de Paul.
- Documentation actuelle de `/tracks/` : `order` accepte les champs de popularité hebdomadaire/mensuelle/totale et utilise la pertinence par défaut ; `tags` combine les termes en ET ; `fuzzytags` combine en OU.
- `imagesize` accepte 25, 35, 50, 55, 60, 65, 70, 75, 85, 100, 130, 150, 200, 300, 400, 500 et 600 pixels.
- `audioformat` accepte `mp31` (96 kbit/s), `mp32` (VBR), `ogg` et `flac`. L’interface doit afficher le format réellement choisi ; la valeur de qualité supérieure reste à mesurer avec l’URL réelle retournée.
- Les titres peuvent être des singles sans album associé. Gérer les champs d’album vides.
- Conditions Jamendo consultées : usage non commercial autorisé ; créditer Jamendo et les créateurs et fournir un lien vers la page du contenu ; les restrictions de fréquence peuvent évoluer ; les applications ne doivent pas être conçues pour mettre le contenu en cache ou fournir un accès hors ligne. Ce dernier point contredit explicitement le périmètre demandé et doit être résolu avant l’implémentation hors ligne.
- Les conditions consultées n’annoncent pas de quota numérique fixe ; respecter `Retry-After` et tout éventuel retour de limitation.
- À vérifier avec un vrai ID : `/albums/`, `/artists/`, `/albums/tracks/`, `/artists/tracks/`, formats réellement retournés, champs licence et téléchargement, disponibilité et débit de l’URL audio.

## LRCLIB

- Documentation actuelle : `https://lrclib.net/docs`. L’API v1 est publique et sans clé ; le client doit s’identifier via User-Agent avec nom, version et lien de projet ou adresse e-mail. Les limites publiées sont approximatives ; les requêtes par lot sont à séquencer avec 200–500 ms entre appels.
- `GET /api/get` a répondu HTTP 200 pour `Still Alive`, avec `duration=176`, `instrumental=false`, et des champs paroles présents. Le texte est expurgé de la fixture.
- `GET /api/search?q=John%20Cage` a répondu HTTP 200 avec 20 résultats ; plusieurs résultats instrumentaux ont `plainLyrics=null` et `syncedLyrics=null`.
- `GET /api/get/10998070` a répondu HTTP 200 pour un résultat instrumental, sans texte de paroles.
- Une requête `/api/get` sans correspondance a répondu HTTP 404 avec `TrackNotFound`.
- Fixtures : `fixtures/lrclib/get-still-alive.redacted.json`, `search-john-cage.redacted.json`, `get-instrumental.redacted.json`, `get-not-found.json`.
- User-Agent de la sonde : `Hear/0.1.0 (personal application)`. Ajouter un lien de projet ou une adresse de contact avant l’intégration distribuée ; aucune coordonnée n’est inventée.
- Le brief mentionne un cache de recherche serveur d’environ 24 h ; cette garantie n’a pas été confirmée dans la documentation consultée et ne sera pas supposée.

## Sources primaires

- Jamendo tracks : <https://developer.jamendo.com/v3.0/tracks>
- Conditions Jamendo : <https://devportal.jamendo.com/api_terms_of_use>
- LRCLIB API : <https://lrclib.net/docs>
- Android Media3 arrière-plan : <https://developer.android.com/media/media3/session/background-playback>
