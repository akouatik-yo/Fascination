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

## La Lampe à lave (`s-lave.js`)

Toutes les scènes passent par la cabine (`FKGL.cabine`, dans FKR). L'ancien rendu reste pour le mode sans décor (encre sur crème) et si la cabine manque.

- **La lampe** : pièce sombre éclairée par la lampe ; verre cylindrique (le liquide fait loupe : centre grossi, bords serrés), reflets de Fresnel et d'une fenêtre, lumière piégée dans la paroi. Le liquide diffuse la lumière de l'ampoule (intense en bas) ; l'œil s'adapte à sa teinte chaude (balance des blancs partielle). La cire est translucide : les parties minces s'illuminent, le dessous des gouttes s'allume face à l'ampoule, un reflet de fenêtre les arrondit. Socle et chapeau en aluminium brossé, fentes d'aération lumineuses, table laquée où la lampe se reflète. Le verre et le socle sont un peu plus bas qu'avant (`lampBox`) pour laisser voir la table.
- **Bénard** : palette « inferno » (perceptuellement régulière) avec relief, plaque de cuivre qui rougeoie selon l'écart de température, plaque froide ; colorant en vert fluorescent sur liquide sombre.
- **Le Soleil** : granules bombés sur une grille de Voronoï tordue, couloirs, points brillants, granules qui « explosent » ; facules près du bord, chromosphère. Comme les images d'observatoire, une luminance colorisée par une palette or (l'image défait d'avance la courbe ACES de la cabine). Le texte le dit : le Soleil est blanc, l'or est une convention.

### Volcans et intérieur de la Terre (demande de Yoann, cadrage de Kurt, brief 93ac705)

Trois nouvelles scènes, rangées sous les trois premières. Couleurs des roches et des laves : l'incandescence du corps noir (`corpsNoir`, `eclatCorpsNoir` de FKR), avec un éclat comprimé, plus fort pour l'intérieur de la Terre (où tout est chaud) que pour la lave.

- **La Terre en coupe**, à l'échelle : graine de fer solide (≈ 5 400 °C), noyau externe de fer liquide (4 000 à 5 000 °C, tourbillons ; le texte dit qu'il brasse un million de fois plus vite que le manteau), manteau de roche **solide** (1 000 à 3 500 °C, couche limite chaude au contact du noyau) en convection lente : 7 cellules qui dérivent et un panache de point chaud qui ondule. Lithosphère de 100 km, croûte de 7 km (océans) à 35 km (continents), dorsales où le manteau fond par décompression. Une **loupe ×20** montre la croûte, fine comme une peau de pomme, et l'atmosphère d'une centaine de kilomètres. Horloge : 1 s ≈ 4 Ma par défaut (réglable de 0,5 à 20).
- **Le point chaud** : la plaque Pacifique avance d'environ 9 cm par an au-dessus d'un panache fixe ; une île naît toutes les 1,1 Ma, grandit, s'éloigne, s'enfonce et s'use ; âges affichés sous chaque île ; bombement du fond marin autour du point chaud ; fusion partielle en haut du panache et fissures jusqu'au volcan actif (chambre magmatique, lave, vapeur). **Relief exagéré ×25 au-dessus du fond marin, à l'échelle en dessous** : c'est écrit à l'écran. Horloge : 1 s ≈ 600 000 ans par défaut.
- **Sous le volcan**, à l'échelle (barre de 5 km) : chambre magmatique à 5-7 km (bouillie cristalline), cheminée. Basalte fluide (vers 1 150 °C) : fontaines et deux rivières de lave dont la couleur suit la température, avec une croûte qui fige. Magma visqueux et gazeux (vers 900 °C) : bulles qui grossissent dans la cheminée, colonne plinienne en volutes éclairées par en dessous, nuées ardentes de temps en temps, éclairs rares dans le panache (au plus un toutes les 2 s ; atténués avec `env.doux`).
- **L'analogie** : la note de la coupe le dit. Comme la cire, ce qui est chaud monte ; mais la cire est liquide et fait un tour en minutes, le manteau est solide et fait un tour en 100 millions d'années environ.
- **Outil OBSERVER** : il nomme la couche ou l'objet touché (graine, noyau externe, manteau, lithosphère ; plaque, panache, volcan actif ; chambre, cheminée, panache de cendres…).
- **Chemins pour les fiches du Labo** : `scenes/la terre en coupe`, `scenes/le point chaud`, `scenes/sous le volcan` ; `la terre en coupe/vitesse du temps` (0,5 à 20 Ma/s), `la terre en coupe/loupe sur la croute` ; `le point chaud/vitesse du temps` (0,1 à 2 Ma/s) ; `sous le volcan/magma` (`fluide` ou `visqueux`).

## La Danse des abeilles (`s-abeilles.js`, nouvelle machine)

Cadrage de Kurt (REFONTE-PEDAGOGIQUE.md § 2) : von Frisch, prix Nobel 1973 ; suivi radar de Riley et al., 2005. La machine décrit la règle : aucune abeille ne « veut » ni n'« explique ».

- **Dans la ruche**, sur le rayon vertical : cellules hexagonales de cire (miel operculé ou non en haut, pain d'abeille en couronne, couvain au centre, cellules vides de la piste de danse près de l'entrée), lumière douce, vignettage sombre.
- **La danseuse**, marquée d'un point de peinture bleue sur le thorax comme dans les expériences de von Frisch, danse en huit. Course frétillante : angle avec la verticale = angle des fleurs par rapport au soleil (sens horaire) ; abdomen qui frétille vers 13 battements par seconde ; durée = distance × secondes par km (1 s par défaut, réglable de 0,6 à 1,4 s : « la valeur varie selon les colonies », écrit dans le panneau). Demi-tours alternés à gauche et à droite. Sous 90 m : danse en rond, sans direction.
- **Les suiveuses** restent au contact derrière elle, puis, après 3 à 6 tours, partent vers l'entrée.
- **Dehors, vu du ciel** : la ruche, des cercles de 1 km, le soleil (azimut : environ 15° par heure, plein sud vers 13 h, heure d'été), le champ de fleurs, et les recrues qui volent dans la direction indiquée avec une erreur de quelques degrés et 20 % sur la distance (en rond : n'importe quelle direction, près de la ruche). L'angle entre le soleil et les fleurs est tracé dehors et, le même, entre la verticale et la course dans la ruche.
- **Toute une journée** : le soleil tourne, la danse tourne avec lui (une heure toutes les 8 s).
- **Rendu** : rayon, carte et abeilles en WebGL2 (abeilles dessinées en GLSL : tête, thorax velu, abdomen rayé avec un reflet sur la chitine, ailes irisées, ombres portées), développé par la cabine ; repli 2D sans WebGL2.
- **Chemins pour la fiche du Labo** : `scenes/la danse fretillante`, `scenes/la danse en rond`, `scenes/toute une journee` ; `les fleurs/distance` (0,03 à 5 km), `les fleurs/direction depuis la ruche` (0 à 359°, nord = 0), `les fleurs/heure` (6 à 20), `les fleurs/le temps passe` ; `la danse/secondes de fretillement par kilometre` (0,6 à 1,4), `la danse/montrer la trace`, `la danse/montrer les angles`. Outils : `observer`, `fleurs` (toucher la carte place la source).
- **Inscrite** dans `app/index.html`, `jeunesse/index.html` et `app/sw.js` ; pas encore dans les mondes du Labo (`jeunesse/js/mondes.js`), que Kurt regroupe.

## Le Cristal (`s-cristal.js`) : le flocon

Brief de Kurt : « transparent, blanc par diffusion, avec des reflets ; fond sombre ; pas de lueur bleue intérieure ».

- **Avant** : disques bleus concentriques (le champ de vapeur et une lueur bleue au centre), flocon bleuté. **Après** : en lumière linéaire, développé par la cabine. Le flocon est posé sur une étoffe sombre et floue, comme sur les photographies de flocons. La glace est transparente (on voit l'étoffe au travers) ; elle diffuse en blanc sur ses arêtes ; deux lumières s'y reflètent, et les reflets scintillent quand le flocon tourne lentement. Dans les lames les plus minces, des irisations d'interférence (`filmMince` de FKR, indice 1,31). Les cernes de croissance restent.
- La science ne change pas : automate de Reiter, conditions du diagramme de Nakaya, « Voyage dans le nuage ». Les scènes Givre, Surfusion et Chaufferette gardent leur rendu (prochaine étape), comme le mode sans décor.

## La Foudre (`s-foudre.js`) : l'attente entre deux éclairs

- **Avant** : entre deux éclairs, un écran presque noir. **Après** : sous l'orage, la lueur orangée des villes (lampes au sodium) éclaire le bas du ciel et le dessous des nuages, dont les bourrelets ressortent ; la pluie en reçoit un peu. C'est ce que montrent les photographies d'orages nocturnes près des villes. Tramage ajouté contre les bandes du dégradé sombre.
- Rien ne change aux éclairs, aux flashs adoucis ni au mode doux. La suite (le canal en lumière linéaire, avec son halo violet d'azote) reste à faire.
