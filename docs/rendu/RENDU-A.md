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
- **Couleurs vraies (relecture de Kurt, 13/11)** : chaque espèce émet une bande d'environ 50 nm autour de son pic, convertie par les fonctions CIE 1931 (`FKR.couleur.bande`, repli local identique). Pics retenus, validés par Kurt (13/11) : *Photinus* 562-563 nm (Lall et al., 1980), *Photuris* et *Lampyris* 552 nm ; *Pteroptyx* 565 nm est plausible mais **reste à sourcer**. Toutes sont jaune-vert : les espèces se reconnaissent à leur rythme. L'interrupteur « Couleurs pour reconnaître les espèces » (éteint par défaut) rend les anciennes fausses couleurs, annoncées comme telles. La légende du panneau montre les vraies.
- **Mode doux (`env.doux`, photosensibilité)** : l'éclairage d'ensemble (champ qui éclaire prairie et couronne) baisse de 82 %, la lueur autour des lucioles de 60 %, le halo de moitié ; les points restent nets. Même chose dans le repli 2D.
- **Recette qualité** : le trait noir droit sous la haie est retiré ; les étiquettes passent sous la bande réservée du Labo (`env.view.y0`).
- **Décor repris (recette qualité, 13/11)** : les montagnes « en dents de scie » deviennent un bois varié (conifères en flèche et feuillus en dôme mêlés, hauteurs et largeurs très différentes, arbres un peu penchés, feuillage bosselé) ; les buissons « taches rondes » (qui lisaient comme des nuages) deviennent des touffes posées au sol, à bord inférieur plat et dessus découpé en feuilles ; la scène « Dialogues amoureux », trop vide, a plus d'acteurs (≈ 54 Pyralis ♂, 22 ♀, 20 Photuris ♂, 8 ♀, 12 vers luisants) pour que des dialogues se jouent en permanence.
- **Mesure au banc de B** (`tools/avant-apres.mjs`, Labo, 1280 × 800, rendu logiciel) : 8,5 / 10,5 / 9,5 i/s à 3, 15 et 30 s, **sans déclin** (avant : 50,5 / 14,5 / 17, avec déclin).

## La Lampe à lave (`s-lave.js`)

Toutes les scènes passent par la cabine (`FKGL.cabine`, dans FKR). L'ancien rendu reste pour le mode sans décor (encre sur crème) et si la cabine manque.

- **La lampe** : pièce sombre éclairée par la lampe ; verre cylindrique (le liquide fait loupe : centre grossi, bords serrés), reflets de Fresnel et d'une fenêtre, lumière piégée dans la paroi. Le liquide diffuse la lumière de l'ampoule (intense en bas) ; l'œil s'adapte à sa teinte chaude (balance des blancs partielle). La cire est translucide : les parties minces s'illuminent, le dessous des gouttes s'allume face à l'ampoule, un reflet de fenêtre les arrondit. Socle et chapeau en aluminium brossé, fentes d'aération lumineuses, table laquée où la lampe se reflète. Le verre et le socle sont un peu plus bas qu'avant (`lampBox`) pour laisser voir la table.
- **Bénard** : palette « inferno » (perceptuellement régulière) avec relief ; colorant en vert fluorescent sur liquide sombre. Relecture de Kurt : la plaque de cuivre ne rougeoie plus (à quelques dizaines de degrés, un métal ne luit pas ; il faut environ 500 °C), elle est couleur cuivre, et la plaque froide est grise ; l'écran dit « fausses couleurs : la température (noir = plus froid, jaune = plus chaud) ».
- **Retours de la recette qualité (13/11)** : la lampe passe en courbe AgX (la cire reste orange au lieu de virer au jaune citron, le liquide reste violet au lieu de magenta) ; les reflets de fenêtre sur le verre et le socle sont des bandes larges et douces, plus de traits blancs de haut en bas ; les bords de la cire sont plus nets ; la lampe démarre **déjà en marche** (une flaque chaude au fond et des gouttes en route : plus de « départ vide » ; éteindre puis rallumer montre toujours la longue mise en chauffe). Bénard démarre du profil de conduction (chaud en bas, froid en haut) avec une petite ondulation en rouleaux : on voit la convection dès la première seconde, au lieu d'un rectangle rose uni pendant 30 s (au-dessus du seuil l'ondulation grandit, en dessous elle s'éteint). Reste : la cire s'effiloche en filets (« fumée ») et perd du volume avec le temps ; c'est le solveur (advection non conservative), pas le rendu.
- **Le Soleil** : granules bombés sur une grille de Voronoï tordue, couloirs, points brillants, granules qui « explosent » ; facules près du bord, chromosphère. Comme les images d'observatoire, une luminance colorisée par une palette or (l'image défait d'avance la courbe ACES de la cabine). Le texte le dit : le Soleil est blanc, l'or est une convention.

### Volcans et intérieur de la Terre (demande de Yoann, cadrage de Kurt, brief 93ac705)

Trois nouvelles scènes, rangées sous les trois premières. Couleurs des roches et des laves : l'incandescence du corps noir (`corpsNoir`, `eclatCorpsNoir` de FKR), avec un éclat comprimé, plus fort pour l'intérieur de la Terre (où tout est chaud) que pour la lave.

- **La Terre en coupe**, à l'échelle : graine de fer solide (≈ 5 400 °C), noyau externe de fer liquide (4 000 à 5 000 °C, tourbillons ; le texte dit qu'il brasse un million de fois plus vite que le manteau), manteau de roche **solide** (1 000 à 3 500 °C, couche limite chaude au contact du noyau) en convection lente : 7 cellules qui dérivent et un panache de point chaud qui ondule. Lithosphère de 100 km, croûte de 7 km (océans) à 35 km (continents), dorsales où le manteau fond par décompression. Une **loupe ×20** montre la croûte, fine comme une peau de pomme, et l'atmosphère d'une centaine de kilomètres. Horloge : 1 s ≈ 4 Ma par défaut (réglable de 0,5 à 20).
- **Le point chaud** : la plaque Pacifique avance d'environ 9 cm par an au-dessus d'un panache fixe ; une île naît toutes les 1,1 Ma, grandit, s'éloigne, s'enfonce et s'use ; âges affichés sous chaque île ; bombement du fond marin autour du point chaud ; fusion partielle en haut du panache et fissures jusqu'au volcan actif (chambre magmatique, lave, vapeur). **Relief exagéré ×25 au-dessus du fond marin, à l'échelle en dessous** : c'est écrit à l'écran. Horloge : 1 s ≈ 600 000 ans par défaut.
- **Sous le volcan**, à l'échelle (barre de 5 km) : chambre magmatique à 5-7 km (bouillie cristalline), cheminée. Basalte fluide (vers 1 150 °C) : fontaines et deux rivières de lave dont la couleur suit la température, avec une croûte qui fige. Magma visqueux et gazeux (vers 900 °C) : bulles qui grossissent dans la cheminée, colonne plinienne en volutes éclairées par en dessous, nuées ardentes de temps en temps, éclairs rares dans le panache (au plus un toutes les 2 s ; atténués avec `env.doux`).
- **Sous le volcan, refait (demande du CEO, 13/11 ; « le volcan effusif : il dirait c'est moche »)** : chambre en lentille irrégulière où l'on voit la convection (panache chaud au centre au-dessus de la recharge, magma plus froid et plus cristallin contre les parois) et des bulles de gaz qui montent (grossies, c'est écrit) ; cheminée sinueuse dont les bulles grossissent en montant ; un dyke actif (une lame de magma qui fend la roche depuis le toit de la chambre, sans percer) et un vieux dyke figé qui recoupe les couches ; couches naturelles (laves, scories et cendres parallèles aux flancs dans l'édifice ; grès, schistes, calcaires plissés et décalés par une faille sous la plaine ; socle de granite) ; lac de lave dans le cratère ; fontaine de lave d'environ 1 km qui pulse lentement, comme à l'Etna, avec des gouttes en arcs qui rougissent en vol ; coulées qui refroidissent en descendant (jaune vers 1 150 °C, rouge vers 900 °C, puis croûte noire fendue de lueurs), **épaisseur grossie (×4 environ), écrit à l'écran** ; panache de gaz et de vapeur poussé par le vent, éclairé par-dessous ; lueur dans l'air et nuages élevés rougis au-dessus du volcan. En mode visqueux : dôme de lave, fragmentation du magma en haut de la cheminée, nuée ardente au ras du flanc. Le sol est un peu plus haut (55 % de la hauteur) : la chambre ne touche plus le bandeau.
- **Conventions de couleurs à l'écran (relecture de Kurt)** : coupe de la Terre, « couleurs : la lueur qu'aurait la matière à sa température · personne ne peut voir l'intérieur de la Terre » ; point chaud et volcan, « … la lueur qu'aurait la roche à sa température · personne ne peut voir sous la surface ». Le bandeau passe à la ligne aux « · » sur écran étroit (il était tronqué en 390 px).
- **Éclairs du panache** : au plus un toutes les 2,2 s, locaux (jamais plein écran), à 35 % avec `env.doux` : bien en dessous de 3 par seconde.
- **L'analogie** : la note de la coupe le dit. Comme la cire, ce qui est chaud monte ; mais la cire est liquide et fait un tour en minutes, le manteau est solide et fait un tour en 100 millions d'années environ.
- **Outil OBSERVER** : il nomme la couche ou l'objet touché (graine, noyau externe, manteau, lithosphère ; plaque, panache, volcan actif ; chambre, cheminée, panache de cendres…).
- **Chemins pour les fiches du Labo** : `scenes/la terre en coupe`, `scenes/le point chaud`, `scenes/sous le volcan` ; `la terre en coupe/vitesse du temps` (0,5 à 20 Ma/s), `la terre en coupe/loupe sur la croute` ; `le point chaud/vitesse du temps` (0,1 à 2 Ma/s) ; `sous le volcan/magma` (`fluide` ou `visqueux`).

## La Danse des abeilles (`s-abeilles.js`, nouvelle machine)

Cadrage de Kurt (REFONTE-PEDAGOGIQUE.md § 2) : von Frisch, prix Nobel 1973 ; suivi radar de Riley et al., 2005. La machine décrit la règle : aucune abeille ne « veut » ni n'« explique ».

- **Dans la ruche**, sur le rayon vertical : cellules hexagonales de cire (miel operculé ou non en haut, pain d'abeille en couronne, couvain au centre, cellules vides de la piste de danse près de l'entrée), lumière douce, vignettage sombre.
- **La danseuse**, marquée d'un point de peinture bleue sur le thorax comme dans les expériences de von Frisch, danse en huit. Course frétillante : angle avec la verticale = angle des fleurs par rapport au soleil (sens horaire) ; abdomen qui frétille vers 13 battements par seconde ; durée = distance × secondes par km (1 s par défaut, réglable de 0,6 à 1,4 s : « la valeur varie selon les colonies », écrit dans le panneau). Demi-tours alternés à gauche et à droite. Sous 90 m : danse en rond, sans direction.
- **Les suiveuses** restent au contact derrière elle, puis, après 3 à 6 tours, partent vers l'entrée.
- **Dehors, vu du ciel** : la ruche, des cercles de 1 km, le soleil (vrai azimut, relecture de Kurt : 48° N, 21 juin, déclinaison 23,44°, midi solaire vers 13 h 50 en heure d'été française ; il avance lentement le matin et le soir, vite vers midi : 54° à 6 h, 97° à 10 h, 180° à 13 h 50, 288° à 20 h), le champ de fleurs, et les recrues qui volent dans la direction indiquée avec une erreur de quelques degrés et 20 % sur la distance (en rond : n'importe quelle direction, près de la ruche). L'angle entre le soleil et les fleurs est tracé dehors et, le même, entre la verticale et la course dans la ruche.
- **Toute une journée** : le soleil tourne, la danse tourne avec lui (une heure toutes les 8 s).
- **Rendu** : rayon, carte et abeilles en WebGL2 (abeilles dessinées en GLSL : tête, thorax velu, abdomen rayé avec un reflet sur la chitine, ailes irisées, ombres portées), développé par la cabine ; repli 2D sans WebGL2.
- **Chemins pour la fiche du Labo** : `scenes/la danse fretillante`, `scenes/la danse en rond`, `scenes/toute une journee` ; `les fleurs/distance` (0,03 à 5 km), `les fleurs/direction depuis la ruche` (0 à 359°, nord = 0), `les fleurs/heure` (6 à 20), `les fleurs/le temps passe` ; `la danse/secondes de fretillement par kilometre` (0,6 à 1,4), `la danse/montrer la trace`, `la danse/montrer les angles`. Outils : `observer`, `fleurs` (toucher la carte place la source).
- **Inscrite** dans `app/index.html`, `jeunesse/index.html` et `app/sw.js` ; Kurt l'a regroupée dans « Comment les insectes se parlent-ils ? » (jeunesse 6e94d37).
- **La danseuse en lumière (demande du CEO, 13/11 ; « on ne sait pas qui regarder »)** : on regarde de près la piste de danse (zoom ×2 : abeilles de 76 px sur une tablette, deux fois moins nombreuses à l'écran) ; la piste est dans la lumière, le reste du rayon dans la pénombre de la ruche ; la lumière suit la danseuse, qui porte un liseré clair ; les autres sont estompées selon leur distance. Sa trace dessine le huit : demi-tours en fil d'or, course frétillante en zigzag bleu-blanc (le frétillement est dessiné, pas échantillonné : il reste net à faible cadence).
- **Coût** : le rayon et la carte sont rendus une fois dans une texture, et redessinés seulement quand la carte change (soleil, fleurs) ; chaque image ne recopie que cette texture sous les abeilles. Crochet `FASC_DEBUG.abeilles.run(n, h)` pour les captures.

## Le Cristal (`s-cristal.js`) : le flocon

Brief de Kurt : « transparent, blanc par diffusion, avec des reflets ; fond sombre ; pas de lueur bleue intérieure ».

- **Avant** : disques bleus concentriques (le champ de vapeur et une lueur bleue au centre), flocon bleuté. **Après** : en lumière linéaire, développé par la cabine. Le flocon est posé sur une étoffe sombre et floue, comme sur les photographies de flocons. La glace est transparente (on voit l'étoffe au travers) ; elle diffuse en blanc sur ses arêtes ; deux lumières s'y reflètent, et les reflets scintillent quand le flocon tourne lentement. Dans les lames les plus minces, des irisations d'interférence (`filmMince` de FKR, indice 1,31). Les cernes de croissance restent.
- La science ne change pas : automate de Reiter, conditions du diagramme de Nakaya, « Voyage dans le nuage ». Les scènes Givre, Surfusion et Chaufferette gardent leur rendu (prochaine étape), comme le mode sans décor.

## La Foudre (`s-foudre.js`) : l'attente entre deux éclairs

- **Avant** : entre deux éclairs, un écran presque noir. **Après** : sous l'orage, la lueur orangée des villes (lampes au sodium) éclaire le bas du ciel et le dessous des nuages, dont les bourrelets ressortent ; la pluie en reçoit un peu. C'est ce que montrent les photographies d'orages nocturnes près des villes. Tramage ajouté contre les bandes du dégradé sombre.
- Rien ne change aux éclairs, aux flashs adoucis ni au mode doux.
- **L'arc en retour (13/11)** : le canal est blanc (surexposé, comme sur les photographies), entouré d'une lueur lavande (raies de l'azote, un peu d'hydrogène) et d'un halo plus large, la lumière diffusée par la pluie et l'air humide. Le cœur est un peu plus épais. Seuls changent la palette et les largeurs des trois couches (halo au 1/8, lueur au 1/4, cœur) ; les flashs adoucis, le voile plafonné et `env.doux` sont intacts (le canal n'éclaire jamais tout l'écran). Captures : `foudre-arc.jpg` (et `-avant`, deux éclairs différents).

## Les Abysses (`s-abysses.js`) : pas de rouge sans la lampe

- **Écart avec le brief corrigé** : la lumière ambiante des profondeurs contenait du rouge (0,25), et la « lueur propre » des méduses reprenait la couleur de leur pigment. Sans la lampe, Atolla et Periphylla paraissaient rouges, alors qu'« au-delà de quelques dizaines de mètres, pas de rouge ». La lumière ambiante est maintenant bleue (vers 470 nm), et la lueur qui dessine les silhouettes l'est aussi. La lampe révèle toujours les vraies couleurs, comme le dit le texte de la machine.

## Les Spirales (`s-spirales.js`) : la boîte de Petri

- **Avant** : disque orange et bleu en aplat. **Après** (scène BZ, thème sombre) : la boîte posée sur une table lumineuse dans une pièce sombre, en lumière linéaire développée par la cabine. La lumière traverse le liquide (Beer-Lambert) : la ferroïne réduite absorbe le vert et le bleu (rouge orangé), la ferriine oxydée absorbe le rouge (bleu). Le ménisque, plus épais contre le verre, rougit le bord ; la paroi réfracte la lumière ; la lampe se reflète sur le verre. Les fronts d'onde sont un peu plus clairs.
- Modèle de Barkley inchangé. Cœur, amibes, automate cyclique et thème clair gardent leur rendu.

## Les Motifs de Turing (`s-rd.js`) : une matière, pas du plastique

- **Avant** : des tubes roses et lisses avec de grands reflets blancs, comme du plastique moulé. **Après** (palettes sombres : corail, nacre, ambre, néon) : en lumière linéaire, développé par la cabine (courbe AgX, qui ne jaunit pas le corail). Lumière large et douce qui contourne les bords, creux moins éclairés (occlusion d'après les hauteurs voisines), ombre courte des crêtes, lumière qui ressort teintée du cœur des crêtes, reflet mouillé discret, gel du fond à peine visible. La hauteur reste la concentration de V : rien n'est inventé, tout est éclairé.
- Modèle de Gray-Scott inchangé. L'encre sur papier, les pelages et le thème clair gardent leur rendu direct (la cabine grisait le papier et verdissait le guépard).

## Le Mycélium (`s-myce.js`, scène « le combat »)

Machine 2D héritée de `jeunesse` (réseau de filaments, diffusion de nutriments, graphe). Elle était juste, mais les quatre colonies, parties de points aux coins, restaient de minuscules étoiles dans un grand vide pendant la première minute — contre la règle de la DA (« le sujet à l'écran dès la première seconde »).

- **Après** : les quatre colonies partent plus rapprochées et sont pré-développées (230 pas de croissance au chargement, contre 60) ; dès la première image, on voit de vrais réseaux mycéliens qui s'étalent, et le combat (les fronts qui se touchent, s'inhibent ou fusionnent selon l'espèce) s'engage vite. Le halo lumineux du réseau vivant est un peu renforcé.
- La biologie ne change pas : mêmes espèces (Mucor, Laccaria, Penicillium, Fusarium), même croissance tropique vers les nutriments, même inhibition au contact. Les scènes « ronds de sorcières » et « réseau souterrain » gardent leur rendu.

## Machines examinées et laissées telles quelles

- **L'Écoulement (`s-flux.js`)** : il paraissait à moitié vide sur mes captures (l'allée de von Kármán ne se formait pas, la moitié droite restait grise). Diagnostic : **artefact du banc de capture**. Il tourne sous SwiftShader (rendu logiciel, sans GPU), trop lent pour développer l'allée en temps réel ; en 12 s de capture, le solveur n'avait calculé qu'une poignée d'images. Avec des pas de temps fixes (crochet `FASC_DEBUG.flux.run`), ce que voit une vraie carte graphique en 8 à 10 s, l'allée se forme et remplit tout l'écran, aux réglages par défaut. La machine est donc déjà belle sur l'appareil cible ; je n'ai rien changé (modifier la vitesse, la viscosité et la vorticité par défaut aurait déplacé le nombre de Reynolds et la fréquence de Strouhal affichés, et touché les autres scènes — Kelvin-Helmholtz, Rayleigh-Taylor — pour un gain nul).
- **Leçon générale** : mes captures Playwright sous SwiftShader **sous-estiment les machines GPU** (celles dont l'image dépend du nombre d'images calculées : fluides, réaction-diffusion à forte itération). Pour juger une machine GPU, utiliser un crochet `FASC_DEBUG` à pas de temps fixes, pas une capture en temps réel.
- **Le Blob, les Pendules, l'Harmonographe (2D), le Quantique (GPU)** : examinés, corrects. L'Harmonographe fait déjà varier l'épaisseur de l'encre avec la vitesse de la plume (une vraie encre victorienne) ; le Quantique est à revoir sur une vraie carte (capture logicielle sous-estimée). Aucun ne dirait « c'est moche » à un enfant de 5 ans ; je n'y touche pas sans raison.

## Recette qualité pour la v31 (13/11, après-midi)

Retours de la recette (« un enfant de 5 ans dirait-il c'est moche ? »), repris un par un :

- **Lucioles, le bois** : il restait des dents de scie. Je les avais moi-même introduites avec un feuillage « bosselé » (`sin(i*bump)` échantillonné tous les 3 px, soit une période de 5 à 13 px : une dent par couronne). Les feuillus sont maintenant des dômes à 2 à 4 lobes larges, à l'échelle de la couronne. Les conifères sont plus rares (22 %) et isolés. Une masse de forêt continue empêche les trous en V. Un léger lissage enlève les aspérités de 3 px. **En portrait**, les arbres se mesurent à la largeur du paysage (`min(H, 0,75 W)`), et non plus à la hauteur de l'écran, qui en faisait des montagnes.
- **Foudre, l'attente** : « 2/3 de noir et des nuages brun boue ».
  - Le corps des nuages est bleu ardoise ; seul leur bas reçoit un liseré ambré de la ville.
  - Des **lueurs dans le nuage** (éclairs intranuages cachés, trois fois plus fréquents que les coups au sol dans la nature) l'allument de l'intérieur entre deux coups, environ une par seconde. Elles sont locales et douces : montée en 40 ms (120 ms avec `env.doux`), amplitude divisée par deux en doux, sans effet sur le sol ni sur le voile des flashs adoucis.
  - Des **rideaux de pluie** pendent sous la base et reçoivent la lueur.
- **Foudre, haute atmosphère** (« moche ») : le sommet des orages ne montait que lorsqu'un éclair l'éclairait, donc on voyait des jets et des farfadets sortir de rien. Il y a maintenant **trois cumulonimbus permanents**, chacun avec :
  - une colonne bosselée jusqu'à 11-15 km ;
  - une enclume plate sous la tropopause, étirée par le vent ;
  - un dôme qui la perce ;
  - un sommet éclairé par la lueur du ciel, et un intérieur que les éclairs allument.

  La couche verte de l'oxygène (557,7 nm, vers 95 km) est devenue une couche lumineuse (un cœur et un halo), ondulée par les ondes de gravité.
- **Foudre, 390 px** : le bloc de Lichtenberg et le globe à plasma restaient dimensionnés sous le panneau. Le globe suit maintenant en douceur la partie visible (taille et centre). Le bloc se recalcule tout de suite s'il est vide ; s'il est gravé, il attend le début de la figure suivante, pour ne jamais effacer une figure qu'on regarde.
- **Lave, le Soleil entier** (« plat, orange, sans halo ni couronne ») :
  - auréole de lumière diffusée autour du disque, comme sur les photographies ;
  - liseré de la chromosphère, et protubérances (flammes et arches) groupées autour de quelques régions actives ;
  - centre or pâle et bord orangé : une boule, pas une assiette.

  Le halo de la cabine (bloom) teintait en rouge la petite tache solaire ; il est réduit dans cette vue, puisque l'auréole est maintenant dessinée. En gros plan, la tache n'est plus un oursin : bords irréguliers, filaments de pénombre de longueurs et de largeurs variées, un peu courbés.
- **Turing, thème clair** (« rose bonbon sur gris ») : le motif est un pigment posé sur du papier, qui absorbe la lumière comme une aquarelle (Beer-Lambert) : sanguine pour le corail, indigo pour la nacre, sépia pour l'ambre, vert-bleu pour le néon. Le pigment s'accumule un peu au bord des taches. La consigne de l'Atlas est centrée, et raccourcie sous 640 px (elle était coupée en 390 px).
- **Mycélium** :
  - Combat : le pré-développement a un budget de temps (160 ms, au moins 60 pas) ; en portrait, il va plus loin (340 pas) avec plus de bourgeons par colonie.
  - Réseau : les étiquettes des arbres ne se chevauchent plus (une rangée de plus quand deux se touchent, texte court sur écran étroit).
  - Ronds de sorcières : l'herbe de l'anneau, plus haute et plus drue, a un côté au soleil et un côté dans son ombre (du relief au lieu d'un aplat), et sa bande verte est un peu plus franche.
- **Hors de mon périmètre** : le mode PSYCHÉ, actif par défaut (`shell.js`), fait tourner la teinte de ±16° et décale toutes les couleurs. La qualité l'a signalé à Kurt.
- **Captures et couleurs (13/11, fin d'après-midi)** : Kurt l'a signalé, le shell adulte (`app/index.html`) applique au canvas le filtre PSYCHÉ, actif par défaut : saturation +22 %, contraste +4 %, teinte qui oscille de ±16° en une minute. Toutes mes captures passaient par lui. L'application unique (l'artefact de Yoann) ne l'a pas. Mes scripts de capture le neutralisent désormais (`canvas { filter: none !important }`), et les captures de cette page ont été refaites **en vraies couleurs** : Soleil (entier, téléphone, gros plan), Foudre (orage, haute atmosphère), Lucioles (bureau, téléphone), Turing (sombre, clair, Atlas), volcan effusif, abeilles, lampe, Mycélium. Ce que le filtre m'avait caché : le Soleil entier, que j'avais éclairci vers l'or pâle, paraissait abricot terne en vraies couleurs. Son gain revient à 1,0 : un or franc, et un bord orangé nettement plus sombre. Le « guépard olive » d'hier venait aussi du filtre.
- **Le Soleil, textes** (relecture de Kurt) : une entrée « Protubérance » dans la légende (« environ 5 000 à 10 000 °C, bien plus froides que la couronne autour, à plus d'un million de degrés »). L'outil OBSERVER la nomme au bord du disque ; plus loin, il nomme l'**auréole**, de la lumière diffusée, et précise que la vraie couronne ne se voit qu'aux éclipses (avant, il appelait ce halo « couronne »). Les étiquettes de l'OBSERVER ont un fond sombre, qui les garde lisibles sur le disque doré, et passent à la ligne sur écran étroit.
- **Recontrôle de la qualité dans le Labo, sans PSYCHÉ (211ccba)** : la Lave, Turing et les Lucioles passent le critère pour la v32. Les quatre points restants sont repris, vérifiés dans le Labo lui-même (`jeunesse/index.html?test`, 390 × 844 et 1280 × 800 ; captures `*-labo*.jpg`) :
  1. **Orage au repos** : nuage bleu-gris lisible même entre deux lueurs, air un peu plus clair sous la base, lueur de la ville atténuée ; lueurs intranuages 2 à 3 fois plus fortes (toujours locales et douces, ×0,45 avec `env.doux`).
  2. **Au-dessus des orages** : cumulonimbus bleu-gris bien visibles. Le Labo ne réserve que le haut de l'écran (`env.view.y0`), et ses boutons du bas couvrent le canvas. En portrait, le limbe remonte donc à 62 % de la hauteur utile, et les orages s'écartent des coins où sont les boutons ronds. L'échelle d'altitude part de sous la bande réservée.
  3. **Mycélium** : ronds de sorcières en relief plus marqué (pente mesurée sur 2 cases, ombre et lumière plus fortes) ; la pluie assombrit un peu au lieu de voiler de gris (l'image était délavée). Combat : la pré-croissance fait au moins 140 pas (220 en portrait), avec un budget de 450 ms.
  4. **Détails** : les gouttes de départ de la lampe se répartissent dans la largeur du verre (elles faisaient une colonne). La lampe se loge sous la bande réservée du Labo et tient en largeur sur un écran étroit (elle était rognée en 390 px). Le message de l'Atlas passe à la ligne (il était coupé des deux côtés en 390 px).


- **Pause demandée par Yoann (13/11, 16 h 07)** : tout est poussé (2c13f37). Point de reprise : ajouter « à l’œil nu » dans le texte de l’auréole (« la vraie couronne… ne se voit à l’œil nu qu’aux éclipses », demande de Kurt), puis attendre le recontrôle de la qualité sur 2c13f37.

## Reprise après la pause (13/11, 18 h 05 → 19 h)

Trois demandes du CEO :

1. **Soleil, auréole** : « la vraie couronne… ne se voit **à l’œil nu** qu’aux éclipses » (demande de Kurt). Les protubérances à « 5 000 à 10 000 °C » étaient déjà dans la v33.
2. **Foudre** (Constance : lueurs 2 à 3 fois plus fortes, nuage bleu-gris) : c'était déjà fait avant la pause, dans a7c8d19. Les lueurs dans le nuage ont une amplitude de 0,9 à 2 (×0,45 avec `env.doux`) et le nuage est bleu ardoise (0,085 ; 0,095 ; 0,135). Captures `foudre-labo*.jpg`.
3. **Ronds de sorcières** (« moches ») : on voit maintenant une vraie vue de drone, des anneaux entiers couronnés de champignons. Captures `mycelium-ronds-labo.jpg` et `mycelium-ronds-labo-tel.jpg` (avant : `mycelium-ronds-avant.jpg`).
   - **Échelle** : le drone est plus haut, pour que les anneaux tiennent en entier. Il y a environ 88 px par mètre en 1280 × 800 et 43 px en 390 × 844 (contre 160 et 127 dans la v32). Les spores de départ sont placées dans la zone libre, sous la bande du haut et au-dessus des boutons du bas, avec un plan propre au portrait. Le plus vieux rond était coupé par le bord, et deux ronds passaient sous les boutons.
   - **Texture** : l'herbe drue de l'anneau est multipliée sur l'herbe, et le relief passe en lumière douce. Les brins restent visibles au travers ; avant, c'était un aplat flou posé par-dessus. La lumière vient d'en haut à gauche, comme l'ombre des champignons et la lumière chaude de fin de journée. Le relief était éclairé d'en haut à droite, ce qui était incohérent.
   - **Une erreur du modèle, corrigée** : le taux de croissance du mycélium (Fisher-KPP) était calé sur la vitesse du front comptée en cases, alors que la digestion du sol ne l'était pas. Plus l'écran montrait de prairie, moins le front était dense.
     - Au-dessous de 160 px par mètre, il ne dépassait plus le seuil où sortent les champignons : il n'en restait aucun en 1280, comme en 390.
     - Le front avançait en outre à 67 % de la vitesse affichée en 390.

     La digestion suit maintenant la même horloge que la croissance (`kap ∝ c`), et le profil du front ne dépend plus de l'échelle. La vitesse est aussi étalonnée : l'épuisement du sol freine le front à 82 % de la vitesse théorique, et on compense. En 1D, on mesure 2,67, 5,5, 10,2 et 24 cases par an pour des cibles de 2,7, 5,55, 10 et 24.
   - **Le diamètre affiché est mesuré** sur la crête du mycélium (médiane de 16 rayons), et non plus calculé par la formule. La formule annonçait 6,4 m pour un rond qui en mesure 5,5 en 1280 et 4,4 en 390 : le sol est plus ou moins riche, la croissance suit les saisons et un rond met du temps à démarrer.
   - **Départ** : un matin de septembre, juste après une pluie ; les champignons sont déjà sortis sur les anneaux. Ils sont dessinés 2,5 fois plus grands que nature (1,6 fois avant ; c'est annoncé dans la notice), sinon on ne les verrait pas d'aussi haut. Les spores apportées par le vent ne tombent plus sous la bande du haut.
   - **Hors de mon périmètre** : dans le Labo, le texte d'état en bas à gauche est caché par les boutons Bidouiller et Pourquoi. C'est le cas de toutes les machines qui écrivent en bas (Foudre, Lave, Réseau…) : c'est à décider côté shell.

## « Au-dessus des orages », repris (13/11, 19 h)

Le verdict de Constance et de la qualité sur ded80e4 était « moche, de justesse » : trois enclumes visibles, mais pâles et sans lumière, sous 70 % de noir. Kurt a sorti la scène du parcours des enfants jusqu'à sa reprise. Les changements :

- **Clair de lune** : une Lune gibbeuse, éclairée par le Soleil qui est sous l'horizon.
  - Elle argente le dessus des enclumes et des tours. Une surface est éclairée quand il n'y a plus de nuage juste au-dessus d'elle, un peu vers la Lune.
  - Elle éclaire la mer de nuages sous le limbe, bosselée, et se reflète sur la mer dans les trouées : un chemin de lumière étiré vers nous par la perspective.
  - Elle allume la basse atmosphère en bleu (diffusion Rayleigh, hauteur d'échelle de l'air environ 8 km). C'est la lumière des photos prises depuis la Station spatiale.
  - La notice l'annonce : l'image est une pose longue, et le dessus des nuages comme la basse atmosphère y paraissent plus clairs qu'à l'œil nu. Un réglage « Clair de lune » permet de l'éteindre.
- **La Voie lactée** traverse le vide entre les orages et la lueur nocturne, avec ses bandes de poussière. Au-dessus de l'air, le ciel reste noir même au clair de lune : on la voit. L'outil OBSERVER nomme la Lune et la Voie lactée.
- **Éclairs dans les orages** : leur cadence passe de 0,6-2,5 s à 0,4-1,7 s par orage. Les lueurs restent locales. Avec `env.doux`, la cadence reste l'ancienne, l'amplitude est de 0,55, et la montée (50 ms) comme la descente (140 ms) sont plus lentes.
- **Cadrage** : la vue monte jusque vers 104 km au lieu de 115, ce qui grossit les orages de 10 %. En portrait, le limbe est à 56 % de la hauteur utile au lieu de 62 % : les orages sortent de sous les boutons du Labo, et la mer de nuages au clair de lune occupe le bas. La Lune est à droite, dans le vide, loin des farfadets. Placée derrière la lueur nocturne, elle verdissait.
- Captures : `foudre-atmo-labo.jpg` (1280 × 800, des farfadets en cours) et `foudre-atmo-labo-tel.jpg` (390 × 844).
- **L'orage au repos en 390 px** (« limite » : nuage presque noir) : en portrait, la base du nuage était à 21 % de la hauteur. La bande réservée du Labo en couvrait l'essentiel, et il ne restait qu'une quarantaine de pixels de nuage visibles. La base descend sous la bande réservée (`y0` + 14 % de la hauteur), et les lueurs et éclairs intranuages se placent dans la partie visible. La pose est un peu plus longue en portrait (×1,35), où l'on voit moins de ciel. Le paysage ne change pas. Capture : `foudre-repos-labo-tel.jpg`.
- Tests : smoke OK ; test-jeunesse 8/8, lancé seul (en parallèle d'autres navigateurs, le test des 40 machines dépasse 500 s en rendu logiciel) ; test-fiches : seulement les 4 problèmes Blob déjà connus.

## Recontrôle de Constance sur b57b07b et 22ee8e8 (13/11, 19 h 40)

Rien ne passe encore à « non moche » en 390 px. Repris :

- **Ronds de sorcières en 390** (« anneaux flous, champignons de 1 à 3 px ») :
  - le calcul utilise des cases de 3 px au lieu de 4 sur un téléphone (moins de 500 000 px²), et les anneaux sont nets ;
  - un champignon dessiné mesure au moins 2,1 px de rayon sur petit écran. La notice dit déjà « davantage sur un petit écran ».
- **La neige d'hiver** : c'était le « voile délavé ». Un reste du code d'origine : un hiver neigeux 55 % des années, et un calque blanc uni jusqu'à environ 62 %, qui ressemblait à du brouillard.
  - La neige est maintenant presque continue et piquetée par les pointes de l'herbe.
  - L'herbe plus haute des anneaux la perce : les ronds se dessinent en vert sombre sur la pelouse blanchie, comme sur les photos de ronds dans le givre.
  - Captures : `mycelium-ronds-hiver-labo.jpg` et `-tel.jpg`.
- **Soleil en 390** :
  - l'étiquette de l'OBSERVER reste dans l'écran, sur les côtés comme sous la bande du haut ; celle de l'auréole sortait par le bord et coupait « à l'œil nu » (capture `lave-soleil-aureole-labo-tel.jpg`) ;
  - la ligne d'état « le Soleil est blanc : l'or est la convention… » passe à la ligne entre les mots ;
  - la scène du Soleil a sa propre aide pour « Regarde » (`jeunesse/meta/lave.js`, `scenes.soleil.noms`, le mécanisme de Moiré et de Sonillus) : « un grain, la tache sombre ou une flamme au bord », au lieu de « la cire ou le liquide ».
- **Restent ouverts** :
  - « Au-dessus des orages » : environ 60 % de noir. Le vrai remède serait une échelle des altitudes dilatée sous 20 km, où sont les orages (environ ×1,8), et annoncée. C'est un choix de représentation : je le soumets d'abord à Kurt.
  - Le carton du début, qui couvre les orages, est posé par le shell.
  - L'orage au repos en 390.

## « Au-dessus des orages » : règle des altitudes dilatée sous 20 km (13/11, 20 h 15)

Proposée à Kurt, acceptée à quatre conditions, toutes tenues :

1. **Graduée en vraies altitudes** : un axe sur le bord gauche porte des repères à 0, 10, 20, 50 et 90 km. De petits traits tous les 10 km se resserrent au-dessus de 20 km. La règle est continue, sans coupure : ×1,8 sous 20 km, vraie au-dessus.
2. **Chaque objet reste à sa vraie altitude**, lue sur la règle (`alt(x, km)` côté JavaScript, `hk(dy)` côté shader) :
   - sommets d'orage à 11-15 km ;
   - jets bleus jusqu'à 40-50 km (40 à 50 au lieu de 36 à 46 ; leur longueur se calcule à travers la règle) ;
   - farfadets de 50 à 90 km ;
   - elfes vers 90 km, lueur nocturne vers 95 km.
   Les orages sont dessinés à l'échelle dilatée dans les deux sens, pour garder leur forme.
3. **Annoncée** dans la notice et dans l'OBSERVER (sommet d'orage) : « Altitudes dilatées sous 20 km (× 1,8) pour voir les orages ; les graduations donnent les vraies valeurs. »
4. **Même règle en paysage et en portrait.** Sur écran étroit, il y a deux orages au lieu de trois : à cette taille, trois se fondaient en un seul.

Effet : des cumulonimbus environ 1,56 fois plus grands qu'en règle linéaire (et 1,8 fois plus grands que les objets au-dessus de 20 km), et une bande bleue de clair de lune plus haute. Le noir recule nettement. Captures : `foudre-atmo-labo.jpg` et `-tel.jpg`.

## Recontrôle de Constance sur 47e38d7 (13/11, 20 h 15)

La neige et le Soleil ne sont plus moches, ni les ronds en 1280. Suite :

- **L'étiquette du Soleil** se place tout entière au-dessus du cercle du toucher. Avec quatre lignes, elle le recouvrait, et sous le disque elle passait sous « Regarde ». Si elle heurterait la bande du haut, elle passe en dessous. La capture `lave-soleil-aureole-labo-tel.jpg`, prise avant le correctif de la ligne d'état, est refaite. Nouvelle capture : `lave-soleil-sous-disque-labo-tel.jpg`.
- **Ronds en 390, « des bandes douces »** : j'ai essayé une rampe de teinte plus raide sur l'azote. Les anneaux sont devenus plus sombres et boueux, pas plus nets : essai retiré. La douceur vient du modèle. L'azote libéré persiste environ 1,3 an derrière le front, d'où une bande large au bord intérieur flou. Les bandes vert sombre des vrais ronds font plutôt 10 à 30 cm, soit une persistance d'environ 0,5 à 1 an à 25 cm par an. Proposé à Kurt, pas fait.

## Arrêt demandé par Yoann (13/11, nuit) : point de reprise

Tout est poussé sur `rendu-a` (dernier commit 76e9960). Rien n'est en cours.

**Commits depuis la pause de 16 h** :
- b57b07b : ronds de sorcières en vue de drone, front indépendant de l'échelle, diamètre mesuré ; « à l'œil nu » pour l'auréole ;
- 22ee8e8 : « Au-dessus des orages » au clair de lune (Lune, Voie lactée, mer de nuages) ; orage au repos en portrait ;
- 47e38d7 : ronds nets et champignons visibles sur téléphone, neige percée par les anneaux ; étiquette et aide du Soleil en 390 ;
- b31a11e : règle des altitudes dilatée sous 20 km (×1,8), graduée en vraies valeurs (accord de Kurt) ;
- 76e9960 : étiquette du Soleil au-dessus du cercle du toucher.

**Reste à faire sur le lot A** :
1. **Ronds en 390** (« bandes douces », moche de justesse) : en attente de Kurt sur la persistance de l'azote derrière le front (1,3 an → environ 0,7 an, pour des bandes de 10 à 30 cm comme dans la nature).
2. **« Au-dessus des orages »** : recontrôle de Constance sur b31a11e à attendre, puis retour dans le parcours par Kurt. Le carton du début, qui couvre les orages, relève du shell (Kurt).
3. **Orage au repos en 390** (moche de justesse, très sombre entre deux lueurs) : pas de levier honnête trouvé. Pistes : lueurs intranuages un peu plus fréquentes en portrait, halo de la ville sur l'air sous la base.
4. **Lampe à lave en 390** : une flaque plate au fond à t1.
5. **Atlas de Turing** : les étiquettes « f 0,08 » et « f 0,02 » sont cachées sous les barres.
6. **Mycélium, combat** : encore quatre îlots dans le noir (le sol est trop sombre) ; la pousse est à voir sur tablette.
7. **Lignes d'état** cachées par les boutons du bas (toutes les machines) : marge basse dans `env.view` côté shell (Kurt). Recontrôle dans app-unique une fois intégré (bande de 28 px).
