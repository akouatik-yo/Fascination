# Fascinations

Vingt-six « machines à fascination » : des simulations contemplatives et interactives, ancrées dans la science et la biologie, à regarder comme un feu de cheminée et à manipuler du doigt. Interface en français.

## Ouvrir l'application

- **Fichier unique** : `dist/fascination.html` s'ouvre dans n'importe quel navigateur, même hors ligne (seules les polices viennent de Google Fonts, avec une police de repli).
- **Version de travail** : `app/index.html` charge les fichiers séparés. Pour la PWA (service worker), il faut la servir en HTTP, par exemple `npx serve app`.
- **Lien direct vers une machine** : ajoutez son identifiant après `#`, par exemple `…/fascination.html#feu`.

## Organisation

```
app/                      l'application (HTML/CSS/JS natif, sans dépendance)
├─ index.html             gabarit de la coquille
├─ css/fascination.css    styles de la coquille et du tiroir BRUITS
├─ js/fk.js               boîte à outils partagée (maths, canvas, son)
├─ js/fkgl.js             boîte à outils WebGL2 partagée (Feu, Eau)
├─ js/shell.js            coquille : volets, en-tête, panneau, boucle d'animation, raccourcis
├─ js/bruits.js           générateur de bruits colorés, battements binauraux et isochrones
├─ js/machines/s-*.js     les machines (contrat décrit dans docs/AMORCE-CLAUDE-CODE.md)
├─ manifest.webmanifest   PWA
├─ sw.js                  service worker (hors ligne)
└─ icons/                 icônes de l'application
dist/                     fichiers assemblés (ne pas modifier à la main)
├─ fascination.html       page autonome
└─ artifact.html          fragment publié comme artefact sur claude.ai
tools/
├─ build.mjs              assemble dist/ à partir de app/
└─ smoke.mjs              test automatique dans Chromium sans écran
docs/AMORCE-CLAUDE-CODE.md  document de transmission (architecture, contrat, exigences)
```

## Construire et tester

```sh
node tools/build.mjs        # régénère dist/
node tools/smoke.mjs        # parcourt les 26 machines, teste le Feu et les bruits
```

## Raccourcis

`←` `→` changer de machine · `R` hasard · `espace` pause · `H` zen · `S` son des machines · `N` bruits · `D` décor · `T` thème · `[` `]` volets · `+` `−` vitesse.

## L'APK Android

`node tools/build-apk.mjs` produit `dist/fascinations.apk` (environ 0,7 Mo), installable directement sur une tablette ou un téléphone Android 7 ou plus récent :

- `android/` : une coquille minimale (une activité WebView plein écran, `MainActivity.java`), le manifeste, les icônes et les polices ;
- l'application web est assemblée en un seul fichier (`tools/build.mjs`), les polices y sont intégrées : tout fonctionne hors ligne ;
- aucun SDK Android n'est nécessaire : aapt2 (dans apktool), dx, android.jar et apksig sont pris sur Maven Central et mis en cache dans `~/.cache/fascinations-apk` ; il faut Java (JDK 17 ou plus) et Python 3 ;
- `tools/zipalign.py` aligne les fichiers non compressés ; la signature (schéma v2) utilise `android/fascinations.p12` (mot de passe `fascinations`). Cette clé est volontairement dans le dépôt : sans elle, une nouvelle version ne pourrait pas s'installer par-dessus l'ancienne. Elle ne convient qu'à une diffusion privée, pas à un magasin d'applications.
- Le numéro de version suit le nombre de commits.

Installation : copier l'APK sur l'appareil, l'ouvrir, autoriser l'installation d'applications de cette source. Sur l'appareil, l'application mémorise par machine une résolution réduite si l'animation n'arrive pas à suivre (clé `fasc-dpr` du stockage local).
