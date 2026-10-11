# Fascinations Labo — où en est la refonte jeunesse (branche `jeunesse`)

## Fait
- Le débat entre personas et sa synthèse : docs/jeunesse-debat/, docs/JEUNESSE-CONCEPTION.md, docs/JEUNESSE-FICHES.md.
- Le shell jeunesse : jeunesse/ (index.html, js/labo.js, pilote.js, icones.js, mondes.js, css/labo.css).
  - Aucune réinitialisation involontaire, rotation, historique, sac, hasard à graine.
  - Carte en 7 mondes, Carnet, Et si, coin des grands.
  - Les 8 tests de tools/test-jeunesse.mjs passent.
- Les fiches terminées (✓ test-fiches) :
  - feu, boids, lucioles, fourmis, blob, mycelium, vie ;
  - rd, spirales, cristal, sable, lave, fractal.
- Les fiches en cours de rédaction (état intermédiaire, à vérifier avec `node tools/test-fiches.mjs <id>`) :
  - attracteur, fluide, eau, foudre, quantique, galaxie, tunnel ;
  - chladni, viz, harpe, pendules, harmono.
- L'APK jeunesse se construit : `node tools/build-apk.mjs jeunesse` → dist/fascinations-labo.apk.
- Bugs corrigés :
  - le défibrillateur des Spirales ;
  - « Grande-Bretagne » dans les Fractales ;
  - la vitesse de la Lampe à lave ;
  - le labyrinthe du Blob ;
  - l'amorce au choix d'une scène ;
  - les « Et si » qui relancent la scène ;
  - le suivi de la scène quand Turing la change lui-même (sim.sceneId).

## Reste à faire
1. Terminer et vérifier les fiches en cours, puis écrire :
   - ciel, bulles, meduses, kaleido ;
   - illusions, sonillus, moire.
2. Une relecture scientifique de toutes les fiches.
3. `node tools/vignettes.mjs`, puis `node tools/build.mjs tout`, puis les tests (test-fiches, test-jeunesse).
4. L'APK jeunesse, l'artefact (dist/jeunesse-artifact.html), et le rapport final.

## Bugs connus encore ouverts
- Fourmis : le double pont échoue avec de grands pas de temps (tablette lente) ; l'état `keep` est au niveau du module.
- Murmuration : l'effet de confusion n'est pas modélisé.
- Spirales : il n'y a pas de réglage anti-flash.
