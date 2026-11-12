# Chantier « rendu » — brief scientifique et répartition (nuit du 12 au 13/11/2026)

Demande de Yoann (relayée par le CEO) : le fond scientifique est bon, mais le rendu des expériences est « moche ». **Le Feu est la référence** (et, avec l'Eau et la Fourmilière, il est intouchable) : toutes les machines devraient atteindre ce niveau.
- Le but n'est pas de calculer plus de particules. Il faut montrer **ce qu'un humain verrait vraiment**, en plus beau, comme les photos de Hubble colorisées : plus jolies, jamais fausses.
- **Chef de projet et garant de la science** : la session Fascinations. Envoyez-moi le hash après chaque machine : je relis la justesse.

## Règles communes (non négociables)
- **Le contrat machine ne change pas** : `make(env)` → `{frame, down, move, up, ui, clear, dispose, livePaused}`. Il faut respecter :
  - `env.view` (`y0` : rien sous la barre du haut) ;
  - `env.doux` (photosensibilité : **3 éclairs ou clignotements par seconde au plus**, contrastes adoucis) ;
  - le son via `whenLive` ;
  - les chemins des réglages, que les fiches jeunesse utilisent : `rubrique/libellé`.
- **Aucune réinitialisation involontaire.** Un réglage visuel ne doit pas reconstruire la simulation.
- **Les machines de `app/js/machines/` servent aux deux applications**, adulte et Labo. Vérifiez les deux :
  - `node tools/smoke.mjs` ;
  - `node tools/test-jeunesse.mjs` (8/8) ;
  - `node tools/test-fiches.mjs`.
- **Tablette d'abord** : 60 i/s visés sur une tablette moyenne, ratio de pixels ≤ 2, et un repli si WebGL2 manque.
- **Ne modifiez pas les fiches jeunesse** (`jeunesse/meta/`) sans me le demander : leurs textes décrivent ce que montre la machine.
- **Branches** : rendu A sur `rendu-a`, rendu B sur `rendu-b`, toutes deux depuis `jeunesse`.
  - Pas de fusion sur `main`.
  - On ne touche pas à `.github/workflows/`.
  - Dépôt public : aucun secret, aucune donnée personnelle.
- **Ce qu'on peut styliser** : la compression du temps, la lumière d'ambiance, le flou de profondeur, un léger halo (bloom) et le grain.
- **Ce qu'on ne peut pas** : changer une couleur physique, une échelle, un angle ou une loi de mouvement.
- **Une grandeur invisible** (phéromone, potentiel, probabilité) peut être montrée, mais comme une couche clairement désignée, désactivable si possible, jamais comme si on la voyait.

## Répartition, dans l'ordre de priorité
Ce qui est le plus visible et le plus améliorable passe en premier. Rendu B pose d'abord la bibliothèque commune ; rendu A attaque tout de suite.

| # | Rendu A (`rendu-a`) | Rendu B (`rendu-b`) |
|---|---|---|
| 1 | Lucioles | (chaîne optique commune, `fkgl.js`) |
| 2 | Foudre | Couleurs du ciel |
| 3 | Abysses (méduses) | Galaxie |
| 4 | Cristal | Bulles |
| 5 | Lampe à lave | Murmuration |
| 6 | Écoulement | Sable |
| 7 | Mycélium | Blob |
| 8 | Monde quantique | Tunnel |
| 9 | Cymatiques | Spirales |
| 10 | Motifs de Turing | Harpe |
| 11 | Pendules | Spectre |
| 12 | Harmonographe | Kaléidoscope |
| 13 | | Jeu de la vie |
| 14 | | Attracteur |
| 15 | | Fractales |

**Échange (13/11 vers 00 h 40)** : les Lucioles passent à rendu A, car c'est la machine d'accueil de l'application adulte, donc la plus vue. La Galaxie passe à rendu B : elle a déjà la chaîne de lumière du Feu, le gain y est moindre.

**Fichiers communs** :
- `app/js/fkcabine.js` (le développement de l'image : halo, ACES ou AgX, vignettage, grain, tramage) est écrit par rendu A sur `rendu-a` (79f63a2), et rendu A en reste propriétaire.
- `app/js/fkgl.js` (le cœur WebGL) appartient à rendu B.
- Personne ne duplique le post-traitement : rendu B utilise `fkcabine.js`.

**Feu, Eau et Fourmilière : intouchables.** C'est une décision de Yoann du 10/11, confirmée par le CEO le 13/11 vers 00 h 25 : on n'y touche pas tant que Yoann n'en décide pas autrement. Pour rééquilibrer, l'Attracteur et les Fractales passent de A à B.

**On ne touche pas au stimulus** des Illusions, du Moiré et des Illusions sonores : l'effet dépend du dessin exact. Seul le cadre autour peut être amélioré. Le Feu sert de référence et n'est pas touché.

## Ce qu'un humain verrait vraiment
Chaque machine a trois lignes : **Vu** (ce qu'on observe), **Juste** (ce qu'il faut garder exact), **Stylisé** (ce qui est permis).

### Rendu A
**Lucioles**
- **Vu** : des éclairs **jaune-vert** (vers 560 nm) de 0,1 à 0,5 s, dont le rythme dépend de l'espèce. On les voit comme de petits halos sur un paysage sombre au clair de lune.
- **Juste** : Photinus carolinus fait des salves de 5 à 8 éclairs, puis plusieurs secondes de noir, avec des vagues de synchronisation. Les Pteroptyx des mangroves d'Asie du Sud-Est sont presque parfaitement synchrones.
- **Stylisé** : la lune, la brume et la végétation. **Avec `env.doux`, les clignotements restent sous 3 Hz.**

**Foudre**
- **Vu** : un canal blanc éblouissant, teinté de violet ou de bleu par les raies de l'azote. Il tremble 3 à 4 fois (arcs en retour) en environ 0,2 s, puis laisse une image rémanente. Les ramifications du traceur sont à peine visibles. Le tonnerre arrive environ 3 s par kilomètre plus tard.
- **Juste** : au-dessus des orages, les sprites sont **rouges** en haut, avec des filaments bleus en bas, à 50-90 km d'altitude, et durent quelques millisecondes. Le bloc d'acrylique garde un arbre de Lichtenberg figé. Le globe à plasma a des filaments roses à violets qui suivent le doigt.
- **Stylisé** : halo, lumière diffusée dans les nuages et pluie. **Avec `env.doux`, 3 flashs par seconde au plus, sans plein écran blanc.**

**Abysses**
- **Vu** : un noir profond. La bioluminescence est surtout **bleue** (vers 470 nm, la lumière qui porte le plus loin dans l'eau), parfois verte. Pas de rouge au-delà de quelques dizaines de mètres. Des particules de « neige marine » tombent lentement.
- **Juste** : les méduses sont translucides et leur ombrelle pulse vers 1 Hz. Les irisations arc-en-ciel des cténophores sont de la **diffraction** sur les rangées de cils, éclairées par une lumière, et non de la bioluminescence. Atolla allume un anneau bleu tournant (alarme).
- **Stylisé** : la profondeur de champ, les particules en suspension et une légère dispersion volumétrique.

**Cristal**
- **Vu** : le flocon est transparent, blanc par diffusion, avec des reflets ; il a une symétrie d'ordre 6. Le givre forme des fougères qui partent des rayures de la vitre. Dans la chaufferette (acétate de sodium), un front blanc opaque avance de quelques mm à quelques cm par seconde et chauffe jusqu'à environ 54 °C.
- **Juste** : la forme dépend de la température et de l'humidité (diagramme de Nakaya) : des plaques vers −2 °C, des aiguilles vers −5 °C, des dendrites vers −15 °C par forte sursaturation. Les six branches sont presque identiques parce qu'elles grandissent dans les mêmes conditions, pas parce qu'elles se « copient ».
- **Stylisé** : les reflets irisés sur les facettes et un fond sombre. Pas de lueur bleue intérieure.

**Lampe à lave**
- **Vu** : de la cire colorée dans un liquide éclairé par l'ampoule du bas. Les gouttes montent quand elles sont chaudes, refroidissent en haut et redescendent en quelques minutes ; elles fusionnent rarement. Dans la casserole, les cellules de Bénard-Marangoni sont hexagonales, avec des reflets miroitants.
- **Juste** : à la surface du Soleil, les granules mesurent environ 1 000 km. Leur centre clair monte, leurs bords sombres descendent, et ils vivent 8 à 10 minutes. Il y a des taches solaires.
- **Stylisé** : le Soleil est **blanc**. L'orange des images filtrées est une convention, à dire si on la garde.

**Écoulement**
- **Vu** : l'eau est transparente ; on voit l'écoulement grâce à de l'encre ou des colorants. On voit ces motifs dans la nature : l'allée de tourbillons de Kármán derrière une île (nuages vus par satellite), les rouleaux de Kelvin-Helmholtz dans des nuages, les champignons d'encre de Rayleigh-Taylor quand on verse de l'encre dans l'eau.
- **Juste** : les tourbillons alternent derrière l'obstacle, et leur rythme suit le nombre de Strouhal, environ 0,2. Les rouleaux s'enroulent dans le sens du cisaillement.
- **Stylisé** : la couleur et la finesse de l'encre, et l'éclairage de l'aquarium.

**Mycélium**
- **Vu** : des filaments (hyphes) blancs très fins (2 à 10 µm) qui forment un éventail cotonneux. On les voit pousser de quelques millimètres par jour, en accéléré. Entre deux espèces, une ligne de barrage colorée (brune ou orange) apparaît.
- **Juste** : les ronds de sorcières sont un anneau d'herbe plus vert, avec des champignons sur l'anneau. Le réseau souterrain est invisible à l'œil nu, et sa représentation est une stylisation.
- **Stylisé** : la lumière rasante, le duvet et l'accélération du temps..

**Monde quantique**
- **Vu** : aux deux fentes, l'écran reçoit des **points un par un**, et les franges ne se dessinent qu'au fil de l'accumulation. On ne voit rien voyager entre la source et l'écran.
- **Juste** : la fonction d'onde est invisible. La teinte qui code la phase est une convention, à garder signalée. Les orbitales de l'hydrogène doivent avoir leurs formes exactes.
- **Stylisé** : tout ce qui montre l'onde, mais clairement présenté comme une carte de probabilité.

**Cymatiques**
- **Vu** : du sable clair sur une plaque métallique sombre. Les grains sautent sur les ventres et s'amassent sur les **lignes nodales**. La figure change brusquement d'une fréquence propre à la suivante.
- **Juste** : les ondes de Faraday (les mandalas d'eau) ont la moitié de la fréquence d'excitation et se voient par leurs reflets. Le tube de Rubens montre une rangée de flammes bleu-jaune dont la hauteur suit les ventres de pression.
- **Stylisé** : l'éclairage, et les grains en mouvement flou.

**Motifs de Turing**
- **Vu** : les vrais pelages et peaux, comme le poisson-zèbre, le poisson-globe, le léopard ou la girafe. Les couleurs sont organiques, avec la texture du poil ou de l'écaille.
- **Juste** : les morphogènes sont invisibles. Ce qu'on voit, c'est la pigmentation qui en résulte, et le motif apparaît pendant la croissance.
- **Stylisé** : la texture du pelage et l'ombrage en relief.

**Pendules**
- **Vu** : de vraies billes métalliques au bout de fils, avec leurs reflets et leurs ombres.
- **Juste** : la période dépend de la longueur (T = 2π√(L/g)). La vague naît du décalage des périodes et se recompose après le cycle complet.
- **Stylisé** : l'éclairage et le matériau.

**Harmonographe**
- **Vu** : un stylo à encre sur du papier. Le trait est d'épaisseur variable et plus dense au centre, car l'amortissement resserre la courbe.
- **Juste** : on garde les équations des pendules amortis.
- **Stylisé** : le grain du papier et la couleur de l'encre.

### Rendu B
**Eau** — intouchable, ces lignes servent de référence seulement
- **Vu** : au fond de la mare, des **caustiques** lumineuses et mouvantes. La surface est transparente vue d'en haut et devient un miroir en vue rasante (Fresnel), avec le ciel en reflet. Les ronds de pluie s'élargissent, avec des éclaboussures et de petites bulles.
- **Juste** : les ondes capillaires ont une vitesse minimale d'environ 23 cm/s (longueur d'onde vers 1,7 cm). La cuve à ondes montre des franges claires et sombres projetées. Le sillage de Kelvin fait **39° d'ouverture** (19,5° de chaque côté), quelle que soit la vitesse.
- **Stylisé** : la lumière du soleil et la couleur du fond.

**Couleurs du ciel**
- **Vu** : le ciel est bleu plus profond au zénith et pâlit vers l'horizon (diffusion Rayleigh). Au couchant, il est orange et rouge près du Soleil. À l'opposé, une bande rose (la ceinture de Vénus) surmonte l'ombre bleu-gris de la Terre.
- **Juste** : l'arc-en-ciel a un rayon de **42°** autour du point opposé au Soleil, le rouge à l'extérieur. Le ciel est plus clair à l'intérieur de l'arc, avec une bande sombre d'Alexandre entre les deux arcs. L'arc secondaire, à 51°, a ses couleurs inversées. Halos : un anneau de 22° et des parhélies à 22°, rouges côté Soleil, plus l'arc circumzénithal.
- **Stylisé** : les nuages, le paysage et le grain.

**Galaxie**
- **Vu** : un bulbe central blanc-jaune (vieilles étoiles), des bras bleu-blanc semés de nébuleuses roses (hydrogène ionisé), et des bandes de poussière sombres sur le bord intérieur des bras. Les étoiles sont des points, pas des disques.
- **Juste** : il faut 200 à 250 millions d'années pour un tour, et une collision dure des centaines de millions d'années. Les queues de marée sont bleutées, et des nœuds roses de formation d'étoiles s'y allument. Trou noir : une ombre d'environ 2,6 fois le rayon de l'horizon, un anneau de photons fin, un côté du disque plus brillant (effet Doppler) et les étoiles du fond déformées par la lentille.
- **Stylisé** : le temps est énormément accéléré, et on peut le dire. Les couleurs de l'image du trou noir de l'EHT sont fausses (c'est de la radio) : prendre un disque orange-blanc, dans le style d'Interstellar mais avec l'asymétrie Doppler.

**Bulles**
- **Vu** : les irisations sont des interférences en couches minces : magenta, vert et or, qui tourbillonnent. Ce n'est pas un arc-en-ciel régulier.
- **Juste** : dans le film qui s'écoule, des bandes horizontales apparaissent. Le haut devient argent, puis **noir** (le film noir) juste avant d'éclater. Entre deux anneaux, le film prend la forme d'une caténoïde (surface minimale).
- **Stylisé** : le reflet de la pièce et l'éclairage.

**Murmuration**
- **Vu** : des milliers de points noirs sur un ciel de crépuscule. Des vagues de densité, plus sombres ou plus claires, traversent la nuée quand les oiseaux s'inclinent. La nuée s'étend sur des centaines de mètres.
- **Juste** : les bécasseaux font des « flashs » blanc-brun en virant, parce qu'on voit tantôt leur ventre, tantôt leur dos.
- **Stylisé** : le ciel et le paysage. Les oiseaux restent des silhouettes.

**Sable**
- **Vu** : des dunes ocres, en croissant pour les barkhanes, couvertes de rides. Sous le vent, les grains sautent à quelques centimètres de hauteur (saltation).
- **Juste** : la pente d'éboulement est d'environ **34°** (angle de repos), et les avalanches glissent sur la face abritée. Les entonnoirs de fourmilions mesurent quelques centimètres. Le tas connaît des avalanches de toutes tailles. Le débit du sablier ne dépend pas de la hauteur de sable.
- **Stylisé** : la lumière rasante et les ombres.

**Blob**
- **Vu** : *Physarum polycephalum* est **jaune vif**. Ses veines pulsent : le cytoplasme va et vient environ toutes les 1 à 2 minutes. Il avance de quelques centimètres par heure et laisse une traînée de mucus translucide.
- **Juste** : l'expérience du réseau ferré de Tokyo (Tero et al., 2010).
- **Stylisé** : la boîte de Petri, l'humidité et le relief des flocons d'avoine.

**Tunnel**
- **Juste** (près de la vitesse de la lumière) : les étoiles se resserrent vers l'avant (aberration), deviennent plus bleues et plus brillantes devant, plus rouges et plus faibles derrière. À très grande vitesse, une partie sort du visible. Le trou de ver montre une sphère qui laisse voir un autre ciel, déformé par la lentille.
- **Stylisé** : la porte des étoiles et le tunnel des démos sont de la **fiction** et doivent être présentés comme tels.

**Spirales**
- **Vu** : la réaction de Belooussov-Jabotinski dans une boîte : des ondes en cibles et en spirales, rouge-orange sur bleu avec l'indicateur ferroïne. Les ondes s'annulent quand elles se rencontrent et avancent de quelques mm par minute.
- **Juste** : on ne voit pas l'électricité du cœur à l'œil nu. Les spirales viennent de la cartographie optique, en fausses couleurs. Chez les amibes *Dictyostelium*, les ondes d'AMPc se voient en bandes claires et sombres au fond noir.
- **Stylisé** : les fausses couleurs du cœur, à présenter comme telles.

**Fourmilière** — intouchable, ces lignes servent de référence seulement
- **Vu** : des fourmis brun-noir d'environ 5 mm, qui forment des pistes.
- **Juste** : les phéromones sont invisibles. Leur affichage est une couche stylisée, à présenter comme telle.
- **Stylisé** : le sol, les ombres et les détails des fourmis.

**Harpe**
- **Vu** : une corde qui vibre se voit comme une enveloppe floue, en forme de fuseau, dont la forme suit les harmoniques.
- **Juste** : le monocorde de Pythagore (chevalet) : 1/2 donne l'octave, 2/3 la quinte. La harpe éolienne chante sous le vent par l'allée de tourbillons.
- **Stylisé** : le bois et la lumière.

**Spectre**
- **Vu** : sur un oscilloscope, une trace verte de phosphore avec une rémanence ; les figures de Lissajous.
- **Juste** : les rapports de fréquences et la phase.
- **Stylisé** : la lueur du phosphore.

**Kaléidoscope**
- **Vu** : un vrai kaléidoscope : des morceaux de verre coloré, multipliés par 2 ou 3 miroirs (à 60° pour 3 miroirs).
- **Juste** : la géométrie des réflexions.
- **Stylisé** : la texture du verre.

**Jeu de la vie**
- **Vu** : un automate mathématique, sans équivalent réel.
- **Juste** : les règles. Lenia peut ressembler à des micro-organismes, mais ce n'en sont pas.
- **Stylisé** : tout le rendu.

**Attracteur**
- **Vu** : c'est un objet mathématique, qui ne se voit nulle part en vrai.
- **Juste** : la trajectoire et sa sensibilité aux conditions initiales.
- **Stylisé** : tout le reste (lueur, couleurs), à présenter comme un choix.

**Fractales**
- **Vu** : un objet mathématique. Seule la fougère de Barnsley ressemble à une vraie fougère.
- **Juste** : les ensembles eux-mêmes doivent être exacts.
- **Stylisé** : la coloration selon le nombre d'itérations, qui est une convention et peut être belle.
