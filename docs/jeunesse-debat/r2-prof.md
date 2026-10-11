# Round 2 : Claire Duval, revue critique

> J'ai relu les quatre propositions. Pour les points douteux, j'ai aussi regardé le code des moteurs (`s-feu.js`, `s-ciel.js`, `s-foudre.js`, `s-tunnel.js`, `s-vie.js`). Elles convergent beaucoup, et c'est une bonne nouvelle. Mais il reste une dizaine d'erreurs qui, une fois affichées dans l'appli, se graveraient dans la tête des enfants.

## 1. Relecture scientifique

### A. Faux ou trompeur : à corriger

| Où | Problème | Correction proposée |
|---|---|---|
| Jonas : « Et si on mettait le feu sur la Lune ? », tirage « Feu de camp sur la Lune » | Sur la Lune, il n'y a pas d'air, donc pas de flamme du tout. La machine montrerait pourtant une jolie flamme arrondie : on enseignerait le contraire de la vérité. Le curseur du moteur affiche d'ailleurs « 0,17 g · Lune ». | « Dans une base lunaire, sous un dôme rempli d'air… ». Il faut ajouter cette précision au libellé du curseur. |
| Lina, Jonas : la chaufferette « gèle » | Elle **cristallise et chauffe** (vers 50 °C). Dire « gèle » renforce l'idée fausse que solide égale froid. | « Elle devient solide d'un coup… et chauffe ! » |
| Sofia : farfadets « trop brefs pour nos yeux » | C'est contredit par sa propre histoire : des pilotes les voyaient. | « Brefs, pâles et cachés au-dessus du nuage, ils sont rarement vus à l'œil nu. » |
| Sofia : « Pourquoi faire de la lumière là où personne ne voit ? » | La prémisse est fausse : beaucoup d'animaux des abysses ont des yeux. Et la tournure est finaliste. | « Dans le noir total, à quoi peut servir une lumière ? » La réponse parle de survie : attirer une proie, se camoufler, effrayer, trouver un partenaire. |
| Lina : « attraper un oiseau isolé, c'est super dur » | C'est l'inverse. L'oiseau isolé est la proie facile. Au cœur de la nuée, le faucon est désorienté (effet de confusion). | Le défi devient : « Attrape un oiseau au cœur de la nuée, puis un isolé. Compare. » |
| Sofia : le « Nombre de Reynolds » renommé « Vitesse du courant » | Il existe déjà un curseur « Vitesse du courant ». Le Reynolds dépend aussi de la taille de l'obstacle et de la viscosité. | Garder la proposition de Malik : « Remous (calme → agité) ». |
| Malik : le couplage renommé « Envie de clignoter ensemble » | Anthropomorphisme : les lucioles n'ont pas « envie ». | « Attention aux voisines : faible ↔ forte ». |
| Sofia : « Comment l'éclair choisit-il son chemin ? » | La question nourrit le mythe du « chemin le plus facile ». | « Pourquoi l'éclair zigzague-t-il ? » Réponse : il avance par bonds, un peu au hasard, plus volontiers là où le champ électrique est fort. C'est le modèle même de la machine. |
| Sofia : « Que se disent les champignons sous nos pieds ? », sur la scène du *combat* | La question est hors sujet pour cette scène. Elle présuppose aussi le « wood wide web », que Sofia dit elle-même débattu. | « Qui gagne la guerre des moisissures, et avec quelle arme ? » |
| Jonas : la zone extrême « Ceci n'existe nulle part… sauf ici » | L'apesanteur existe bel et bien, dans la station spatiale. | « Rare, ou impossible sur Terre ». À vérifier curseur par curseur. |
| Jonas : le R-pentomino « plus de 1 100 générations » | C'est exact sur une grille infinie (1 103 générations). Mais le moteur tourne sur un **tore** : les 6 planeurs font le tour et percutent les débris, donc le résultat sera différent dans l'appli. | « Sur une grille infinie : 1 103 générations. Ici, la grille se referme sur elle-même : compte, et compare ! » C'est même un excellent défi. |

En passant, une erreur dans le moteur lui-même : la fiche « Mathusalem » de `s-vie.js` dit que *diehard* s'agite « des milliers de générations ». C'est faux : il disparaît à la génération 130. **Les textes existants doivent aussi passer en relecture.**

### B. Juste, mais à préciser

- **« Un éclair est 5 fois plus chaud que la surface du Soleil »** : l'ordre de grandeur est bon. Le canal monte à environ 30 000 °C, contre environ 5 500 °C pour la surface du Soleil. Il faut ajouter : « pendant un instant, dans un canal de quelques centimètres ».
- **« 1 km toutes les 3 secondes »** : c'est exact (343 m/s, soit 2,9 s par km). Le moteur retarde bien le tonnerre de 3 s par km, donc le défi « compte le tonnerre » est vérifiable. Excellent.
- **Le coucher de soleil bleu sur Mars** : c'est vrai, Spirit (2005) et Curiosity (2015) l'ont photographié. Mais l'explication n'est pas celle du ciel terrestre. Une poussière fine renvoie le bleu *vers l'avant* : le bleu n'apparaît donc qu'autour du Soleil, et le ciel reste couleur caramel. Le moteur le dit correctement (« modèle approché »). Attention à ne pas le présenter comme « le contraire de la Terre ».
- **La flamme ronde et bleue en apesanteur** : c'est vrai, on l'a observé dans les navettes et dans l'ISS. Je complète ma propre formule du tour 1 : sans gravité, l'air chaud ne monte plus, *et l'air frais n'arrive plus non plus*. L'oxygène n'arrive que lentement, la flamme est plus petite et moins chaude. Elle fait peu de suie incandescente, d'où sa couleur bleue. Elle peut même s'étouffer.
- **Les couleurs de flamme** : le moteur propose 8 sels, et non 6. Le sodium est « jaune », et non « orange » : il faut être cohérent avec ce qui s'affiche. En vrai, le potassium donne un lilas très pâle.
- **La Mémoire de Taylor** : il faut préciser que ça ne marche qu'avec un liquide très visqueux, remué lentement. L'encre n'était pas vraiment mélangée, seulement étirée. Sinon, on fabrique l'idée qu'on peut « démélanger » n'importe quoi.
- **L'Attracteur avec ρ ≈ 20** : la courbe finit sur l'un des *deux* points fixes, pas sur « un point ». Pour σ, ρ, β, je ne montrerais que ρ au niveau 2, sous le nom de « Chauffage ». β n'est pas un « freinage ».
- **Andromède** : Sofia a raison et j'avais tort. Une étude de 2025 ne donne qu'environ une chance sur deux de fusion dans les 10 prochains milliards d'années. En revanche, son analogie des « nuées de moucherons » est trop faible, car des moucherons se cognent parfois. L'écart entre deux étoiles vaut environ 30 millions de fois leur diamètre.
- **Turing** : écrire « la machine Enigma de l'armée allemande » plutôt que « les codes secrets nazis ». Le mécanisme est confirmé pour quelques cas, comme les rayures du poisson-zèbre. **Pour le guépard, ce n'est pas démontré.**
- **Sophie Germain** : elle n'était pas « interdite d'université ». C'est l'École polytechnique qui lui était fermée, et elle en suivait les cours sous un nom d'homme. Le prix de 1816 est exact. Sa théorie était incomplète, ce qui est aussi une belle leçon.
- **Lorenz** : l'anecdote du café (1961) est exacte. Mais la machine montre son modèle de 1963, à 3 équations, qui n'est pas celui de l'anecdote.
- **La harpe éolienne et « les cordes courtes chantent aigu »** : sur une vraie harpe éolienne, les cordes ont souvent la même longueur, et c'est le vent qui fait sonner leurs harmoniques. Il faut rattacher cette question au monocorde.
- **« Chaque flocon est différent »** : dans le ciel, c'est vrai en pratique. Mais deux flocons qui poussent dans les mêmes conditions se ressemblent beaucoup. Ça fait un beau défi : « la forme raconte le voyage ».
- **Les Ponts de Jonas** :
  - Eau ↔ Quantique : c'est le même phénomène d'interférence, mais il faut dire « se comporte comme une onde ».
  - Spirales/amibes ↔ Blob : ce sont deux organismes différents, et il n'y a pas de « même loi ».
  - Attracteur ↔ Pendules : c'est un contraste, pas une loi commune. Il faut l'étiqueter comme tel.

### C. Vérifié, conforme

Les histoires suivantes sont justes : Lynn Faust (début des années 1990), Belousov (1951, rejeté, puis un résumé en 1959), Nakagaki (labyrinthe en 2000, Tokyo en 2010, avec de la lumière pour figurer les reliefs) et les farfadets filmés par hasard en 1989 au Minnesota (à 50-90 km d'altitude).

Les badges « Vrai ou légende ? » (Pythagore, Fleming, Galilée) sont justes, eux aussi.

Les phénomènes suivants sont vrais, et sont souvent déjà dans les moteurs :
- l'arc secondaire aux couleurs inversées ;
- le film noir qui apparaît en haut de la bulle ;
- l'octave obtenue en effleurant le milieu de la corde ;
- un front BZ coupé qui donne deux spirales ;
- les 6 à 7 voisins suivis par chaque étourneau ;
- le fond diffus qui devient visible au-delà de γ ≈ 400 (le moteur le fait).

### D. Ce que je ne peux pas vérifier sans tester la machine

- La torche peut-elle vraiment synchroniser les lucioles ?
- Peut-on déclencher une avalanche avec un seul grain ?
- Les profondeurs des « trésors » de Mandelbrot.
- Le jeu « chaud / froid » à l'oreille.
- Le résultat des greffes de pelage.
- La formule « première femme primée par l'Académie », qui est couramment citée mais que je dois sourcer.

## 2. Didactique : ce qui sert, ce qui risque

**Ce qui sert vraiment :**
- Les cartes **« Et si… ? »** de Jonas, c'est mon défi en mieux : le bouton « Essaie ! » prépare la machine.
- **Avant / Après** (Jonas) : le contrôle des variables enseigné sans le nommer.
- Les boutons **« maintiens pour voir »** (Malik).
- La question **« Que se passe-t-il ? »** laissée sans réponse (Sofia).
- **« Rejouer ce moment »** (Sofia) : comprendre, c'est reproduire.
- **Les photos légendées automatiquement** : c'est un vrai carnet de labo.
- **« Comme dans la nature »** comme repère.
- **Les fils rouges et les ponts**, c'est-à-dire le transfert d'une même idée d'un monde à l'autre, l'apprentissage le plus profond qui soit.

**Les risques :**
- **Récompenser la bonne réponse** : « Je gagne un point si j'ai raison » (Lina). Il faut récompenser le pari, pas le score.
- **Le chrono et les réflexes** (lucioles « synchronisées en 14 s », chaufferette « défi de réflexes », record du château). Ils mesurent la vitesse, pas l'observation.
- **Les noms de tirage générés automatiquement** : en assemblant des fragments, on fabrique des affirmations (« Feu sur la Lune »). Chaque combinaison doit être relue.
- **120 merveilles à écrire** : c'est 120 occasions d'erreur. Je propose de commencer avec 3 merveilles relues par machine.
- **Les « cartes Pokémon » des moisissures** : c'est un bon accroche, mais les « surnoms marrants » glissent vite vers « Penicillium le méchant ». Il faut des surnoms descriptifs, et non moraux.
- **La merveille-trophée** : une fiche doit dire *ce qu'on a observé*, et non « débloqué ! ».

## 3. Où je change d'avis, où je maintiens

**Je change d'avis :**
1. **Sur les collections.** Je m'en méfiais. Lina et Jonas m'ont convaincue, à une condition : on collectionne des *observations nommées*, pas des clics.
2. **Sur les histoires.** Je les reléguais à « pour aller plus loin ». Les histoires de Sofia, où une amatrice corrige les experts et où un article est refusé, montrent *comment* la science se fait. Elles méritent le niveau 2.
3. **Sur le labo complet.** Je limitais l'interface à 2 à 4 réglages. Lina a raison : on ne retire rien, on range seulement. Le labo reste entier, au fond du tiroir.
4. **Sur Andromède**, comme dit plus haut.

**Je maintiens :**
1. **Aucune récompense pour une prédiction juste.** Sinon, l'enfant apprend à deviner ce que l'appli attend au lieu de penser.
2. **Un seul mot savant par niveau**, et **zéro anthropomorphisme non assumé**. Le tableau ci-dessus montre que même des adultes attentifs y glissent.
3. **Chaque défi est testé sur le moteur réel avant d'être publié.** Le R-pentomino sur un tore et la flamme « lunaire » le prouvent.

## 4. Mon TOP 7 final

1. **Zéro réinitialisation involontaire, rotation comprise, et « Rejouer ce moment »** (graine et réglages mémorisés). Sans reproductibilité, pas d'expérience.
2. **Les cartes « Et si… ? »** (prédire, essayer, comprendre), avec un bouton qui prépare la machine. Elles célèbrent la surprise, jamais le score.
3. **Un cartel en 3 couches qui part du geste** : d'abord la question, puis « Essaie ça » et « Que se passe-t-il ? », puis « Pourquoi ? » (60 à 100 mots, un mot savant). Ensuite viennent, au choix, une « Histoire vraie » et « Pour aller plus loin ».
4. **Des outils en icônes et 3 leviers aux noms concrets**, avec le labo intact, l'Avant / Après et « Comme dans la nature ».
5. **Un circuit de relecture scientifique** pour tout ce qui s'affiche : textes nouveaux, textes existants des moteurs, libellés de curseurs, noms de tirage, ainsi qu'un test sur la machine. Je m'en charge.
6. **Un carnet d'observations** : des photos légendées automatiquement et 3 merveilles par machine au départ, présentées comme des phénomènes observés.
7. **Les ponts et les fils rouges**, seulement là où la loi est vraiment la même : aucun chef (Murmuration, Fourmilière, Lucioles), le rapport 3:2 (Harmonographe, Lissajous, monocorde), l'interférence (Eau, Quantique), la convection (Lave, Feu).
