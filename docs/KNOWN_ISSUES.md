# Points de recette

| ID | État | Point à vérifier | Suite |
| --- | --- | --- | --- |
| K-001 | Ouvert | L’indexation MediaStore et l’autorisation audio doivent être exercées sur plusieurs versions d’Android et avec des bibliothèques de tailles différentes. | Installer l’APK 0.2.1 sur le téléphone et vérifier le nombre, les métadonnées et l’ouverture des fichiers. |
| K-002 | Ouvert | La lecture en arrière-plan, le contrôle écran verrouillé, le casque Bluetooth et les interruptions audio sont implémentés dans le service Android mais ne peuvent pas être validés par le build seul. | Les essayer sur un téléphone après la réussite du workflow cloud. |
| K-003 | Ouvert | Certaines pistes sans tag de titre/artiste, ou masquées par Android MediaStore, peuvent apparaître avec des métadonnées génériques ou ne pas être indexées. | Comparer l’index Hear avec les fichiers réellement présents sur le téléphone. |

L’indexeur ne modifie ni ne supprime les fichiers sources. Les morceaux masqués et les dossiers ignorés par MediaStore restent sous le contrôle du système Android.
