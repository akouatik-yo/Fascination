# Fascinations

**Branche de référence : `jeunesse`** (elle contient `main` et la branche de session `ccr-ba505dc0-e427km`, plus la version Labo). Point de reprise : [`etat.md`](etat.md) ; décisions : [`decisions.md`](decisions.md).

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
- `tools/zipalign.py` aligne les fichiers non compressés ; la signature (schéma v2) utilise une clé PKCS12 gardée **hors du dépôt** : son chemin dans `FASC_KEYSTORE`, son mot de passe dans `FASC_KEYSTORE_PASS` (alias facultatif dans `FASC_KEY_ALIAS`, « fascinations » par défaut). Le script refuse de signer si l'une manque ou si la clé est sous la racine du dépôt, et ne crée plus de clé lui-même.
- **Ancienne clé compromise** : `android/fascinations.p12` et son mot de passe ont été publiés dans ce dépôt du 08/10/2026 au 12/11/2026 ; ils restent lisibles dans l'historique. Les APK de `dist/` (jusqu'à la version 0.1.65) sont signés avec elle. Une APK signée avec la nouvelle clé ne s'installera pas par-dessus : il faudra désinstaller l'application une fois.
- Le numéro de version suit le nombre de commits.

Installation : copier l'APK sur l'appareil, l'ouvrir, autoriser l'installation d'applications de cette source. Sur l'appareil, l'application mémorise par machine une résolution réduite si l'animation n'arrive pas à suivre (clé `fasc-dpr` du stockage local).

## Fascinations Labo : la version 10-14 ans (branche `jeunesse`)

Ce sont les mêmes machines, dans une autre application, pensée pour jouer d'abord et comprendre ensuite. Les choix de conception viennent d'un débat entre personas : `docs/jeunesse-debat/`, `docs/JEUNESSE-CONCEPTION.md`.

- **Ouvrir** : `jeunesse/index.html` (fichiers séparés) ou `dist/jeunesse.html` (fichier unique, entièrement hors ligne, polices intégrées).
- **APK** : `node tools/build-apk.mjs jeunesse` produit `dist/fascinations-labo.apk`. Le paquet `fr.fascinations.labo` s'installe à côté de la version adulte.
- **Organisation** :
  - `jeunesse/js/labo.js` : le shell ;
  - `jeunesse/js/pilote.js` : pilote les réglages des machines par leur chemin, et fait le hasard à graine ;
  - `jeunesse/meta/<id>.js` : une fiche par machine (scènes, gestes, leviers, recettes, textes, « Et si »), au format décrit dans `docs/JEUNESSE-FICHES.md`.
- **Tests** :
  - `node tools/test-fiches.mjs [ids]` : le contrat des fiches ;
  - `node tools/test-jeunesse.mjs` : aucune réinitialisation involontaire, rotation, historique, hasard, contextes WebGL ;
  - `node tools/capture-jeunesse.mjs <id> [n]` : une planche de tirages ;
  - `node tools/vignettes.mjs` : les images de la Carte.
