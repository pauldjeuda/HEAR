# Pipeline CI et APK Android

Le workflow [ci-apk.yml](../.github/workflows/ci-apk.yml) s’exécute sur les pull requests vers `main`, les pushes vers `main` et `sprint/**`, les tags `v*`, et à la demande depuis l’onglet Actions.

## Contrôles

Les jobs `Web quality gates` et `Build installable Android debug APK` partent en parallèle.

- Web : `npm ci`, lint/formatage, tests unitaires, `npm run verify`, puis e2e Playwright/Chromium.
- Android : JDK 21 et SDK API 36, build web de production, `cap sync android`, `assembleDebug`, empaquetage dans `release/hear-<version>-debug.apk`, puis vérification de signature avec `apksigner`.
- Le job de publication attend la réussite des deux jobs. Il vérifie que le tag est exactement `v<version package.json>`, puis crée la GitHub Release et y attache l’APK.

## Exécution cloud vérifiée

Le run [#43765584497](https://github.com/pauldjeuda/HEAR/actions/runs/43765584497), commit `adc277b`, a réussi le 15 novembre 2026 : jobs Web et Android verts, signature `apksigner` vérifiée, artefact `hear-debug-apk-adc277b0d2dfabd9e38c9f172e928513467a55ba` généré (14,6 Mo, rétention 30 jours). Aucun tag n’ayant été poussé, l’APK est disponible dans les artefacts Actions et aucune GitHub Release n’a été créée.

Les runners Actions et `gradle/actions/setup-gradle` mettent en cache npm et Gradle. Aucun `client_id` Jamendo ni secret de build n’est requis. Les builds des branches et l’exécution manuelle donnent un artefact Actions conservé 30 jours ; seuls les tags de version créent une GitHub Release.

## Générer localement

Avec Node/npm, Java 21 et Android SDK API 36 installés :

```powershell
npm ci
npm run apk:debug
```

La commande copie l’APK debug signé avec la clé de débogage Android dans `release/`. Ce n’est pas un APK signé pour distribution de production ; aucun keystore de production n’est configuré.
