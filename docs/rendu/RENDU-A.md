# Rendu A : journal des machines refaites

Branche `rendu-a`, nuit du 12 au 13/11/2026. La science des machines ne change pas : seul l'affichage est refait, sur le modèle du Feu (voir [`INVENTAIRE-RENDU.md`](INVENTAIRE-RENDU.md), § 1). Chaque machine refaite garde son ancien rendu en repli quand WebGL2 manque.

## Les Lucioles (`s-lucioles.js`)

**Avant** : canevas 2D, ciel en dégradé, paysage en découpes noires, lucioles en petits sprites. **Après** : WebGL2 en lumière linéaire, développé par la cabine commune (`fkcabine.js`).

- **Lucioles** : cœurs très lumineux (HDR) ; le halo naît de la cabine, comme celui du Feu. Une lueur douce entoure la lanterne. Les lucioles toutes proches sont légèrement floues (hors de la mise au point d'un photographe).
- **Leur lumière éclaire la nuit** : chaque luciole dépose sa lumière dans un champ d'éclairement à 1/8 de la résolution. Ce champ éclaire les herbes (avec un peu de lumière transmise à travers les lames), l'arbre, les buissons, le sol et la brume. Quand toute la vallée synchrone s'allume, la prairie s'illumine ; quand les Pteroptyx clignotent ensemble, la couronne de l'arbre s'allume avec elles.
- **Ciel** : étoiles procédurales avec scintillement et magnitude limite (la lune et la pollution lumineuse effacent d'abord les plus faibles), Voie lactée visible seulement sous un ciel noir, lune presque sans assombrissement au bord avec son auréole, dôme orangé des villes. Ce sont les mêmes curseurs qu'avant : leur effet se voit maintenant dans le ciel.
- **Paysage** : crêtes en perspective aérienne (la lointaine prend la couleur du ciel), brume entre les crêtes et au ras de la prairie, bord feuillu des silhouettes, liseré de lune.
- **Pose longue** : traînées accumulées dans une cible flottante à demi-résolution, effacées selon le curseur « Pose longue ».
- **Herbes du premier plan** : dessinées sur le GPU (une bande courbe par lame, antialiasée), elles suivent toujours le vent et le souffle.
- **Coût** : bruits fixes (Voie lactée, sol, bord des feuilles) calculés une seule fois ; résolution de rendu ×1,25 sur mobile, ×1,5 ailleurs. En rendu logiciel (SwiftShader), environ 11 images/s contre 17 pour l'ancien rendu 2D ; sur une vraie carte graphique, le rendu est très en deçà du budget, et le régulateur de la coquille baisse la résolution si besoin.
- **Correctif au passage** : la scène et les réglages sont gardés d'une construction à l'autre (objet `keep`). Avant, passer en mode zen ou tourner la tablette ramenait toujours à « Nuit d'été », contre la décision « ne jamais réinitialiser sans demande ».
- **Couleurs vraies (relecture de Kurt, 13/11)** : chaque espèce émet une bande d'environ 50 nm autour de son pic, convertie par les fonctions CIE 1931 (`FKR.couleur.bande`, repli local identique). Pics retenus, à confirmer : *Photinus* 562-563 nm (Lall et al., 1980), *Photuris* et *Lampyris* 552 nm, *Pteroptyx* 565 nm. Toutes sont jaune-vert : les espèces se reconnaissent à leur rythme. L'interrupteur « Couleurs pour reconnaître les espèces » (éteint par défaut) rend les anciennes fausses couleurs, annoncées comme telles. La légende du panneau montre les vraies.
- **Mode doux (`env.doux`, photosensibilité)** : l'éclairage d'ensemble (champ qui éclaire prairie et couronne) baisse de 82 %, la lueur autour des lucioles de 60 %, le halo de moitié ; les points restent nets. Même chose dans le repli 2D.
- **Recette qualité** : le trait noir droit sous la haie est retiré ; les étiquettes passent sous la bande réservée du Labo (`env.view.y0`).
