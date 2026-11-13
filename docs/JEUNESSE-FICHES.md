# Écrire une fiche jeunesse (Fascinations Labo)

Chaque machine a une fiche `jeunesse/meta/<id>.js`. La fiche ne touche jamais au moteur de la machine. Elle dit seulement au shell jeunesse :
- quelles scènes proposer, et comment tirer au hasard des départs toujours beaux ;
- comment s'appellent les gestes ;
- quels 3 ou 4 réglages montrer aux enfants, et sous quel nom ;
- quelles recettes proposer ;
- quels textes afficher (« Pourquoi ? ») et quels défis « Et si… ? ».

**La fiche de référence est `jeunesse/meta/feu.js`. Lis-la d'abord.**

## Les outils pour travailler
- **Inventaire de tous les réglages**, machine par machine et scène par scène : `tools/out/ui.json`. On le régénère avec `node tools/build.mjs && node tools/inventaire-ui.mjs`. Chaque contrôle y a un **chemin** « rubrique/libellé » normalisé : sans accents ni ponctuation, en minuscules, par exemple `physique/oxygene dans l air`. On y trouve aussi son type (`slider`, `toggle`, `choice`, `bouton`, `bar`), ses bornes, ses options et sa valeur par défaut.
- **Le code des machines** (`app/js/machines/s-*.js`) pour comprendre ce que fait réellement un réglage. Les textes adultes y sont aussi : `about`, `intro`, la description des outils.
- **Le test de contrat** : `node tools/test-fiches.mjs <id>`. Il vérifie chaque chemin, chaque scène, les bornes des valeurs et la longueur des textes. **Une fiche doit afficher ✓.**
- **La planche de tirages** : `node tools/capture-jeunesse.mjs <id> [n] [scène] [secondes]` produit `tools/out/captures/<id>.png`. Elle sert à vérifier que les plages de hasard donnent toujours une image intéressante. C'est du rendu logiciel, donc les machines WebGL y sont lentes.

## Le format
```js
FJ.fiche('id', {
  nom: 'Le Feu',                    // nom affiché (sinon celui de la machine)
  question: 'Pourquoi une flamme est-elle pointue ?',   // 12 mots max : le titre-question, curieux, jamais finaliste
  outil: 'souffle',                 // geste choisi à l'arrivée (sinon celui de la scène)
  scenes: {                         // clés courtes, sans accents ; l'ordre est celui des pastilles
    cle: {
      nom: 'La cheminée',           // nom d'enfant de la scène (2 à 4 mots)
      via: 'scenes/cheminee',       // le bouton de la scène, ou { choix: 'rubrique/libelle', valeur: id } (voir ui.json : "scenes")
      poids: 3,                     // fréquence au hasard (défaut 1) : plus fort pour les scènes les plus spectaculaires
      outil: 'souffle',             // geste à l'arrivée dans cette scène
      outils: ['souffle', 'eau'],   // facultatif : seuls ces gestes sont montrés dans cette scène
      noms: { pincer: { verbe: 'Souffle', icone: 'vent' } },   // facultatif : renomme un geste dans cette scène seulement
      exposes: ['gravite', 'oxygene'],  // facultatif : remplace « exposes » pour cette scène
      plages: { gravite: [0, 0.02] },   // facultatif : complète « plages » pour cette scène
      regle: { },                   // facultatif : appliqué quand l'enfant choisit cette scène lui-même
      actions: 'foyer',             // facultatif : un groupe de groupesActions (boutons spectaculaires)
      essaie: 'Souffle doucement sur les braises, puis plus fort.',   // 20 mots max, une action à faire tout de suite
      amorce: { outil: 'goutte', points: [[0.5, 0.4]], delai: 700 },  // facultatif : un toucher automatique à l'arrivée ou au choix de la scène, si elle démarre vide
      interne: 'pelage',            // facultatif : l'identifiant de la scène dans la machine, s'il diffère de la clé (machines qui exposent sim.sceneId et changent de scène d'elles-mêmes, comme Turing)
    },
  },
  essaie: '…',                      // facultatif : l'« Essaie ça » d'une machine sans scènes
  outils: { id: { verbe: 'Souffle', icone: 'vent', geste: 'trait', aide: '…' } },
  // verbe : 1 mot, à l'impératif (Souffle, Arrose, Coupe…) ; icone : facultative (voir jeunesse/js/icones.js) ;
  // geste : 'tap' ou 'trait' (pour la main qui montre le geste) ; aide : 1 phrase d'enfant (15 à 25 mots)
  leviers: {                        // les réglages montrés aux enfants, avec un nom concret
    cle: { chemin: 'physique/gravite', nom: 'Gravité', bouts: ['aucune (espace)', 'forte'],
           min: 0, max: 2,           // facultatif : resserrer la plage montrée
           options: { id: 'Nom d’enfant' },   // pour un choix : renommer les options
           garder: ['id1', 'id2'] }, // pour un choix : ne montrer que certaines options
  },
  exposes: ['vent', 'oxygene', 'gravite'],   // 3 ou 4 leviers par défaut, ceux qui changent VISIBLEMENT le phénomène
  groupesActions: { nom: [{ chemin: 'le foyer/raviver', nom: 'Raviver', icone: 'flamme' }] },
  actions: [ … ],                   // ou des actions pour toute la machine (boutons spectaculaires : « Éclair ! »)
  plages: { vent: [-0.3, 0.3] },    // le hasard : [min, max] pour un curseur ; [a, b, c] pour un choix ; 0.3 = interrupteur vrai 3 fois sur 10 ; true/false fixe
  partGraines: 0.25,                // part des tirages qui prennent une graine remarquable (défaut 0,3)
  graines: [{ nom: 'Bougie dans la station spatiale', scene: 'bougie', regle: { gravite: 0 } }],   // nom affiché au départ : il doit être VRAI
  recettes: [{ nom: 'Tempête', icone: 'vent', scene: 'camp', regle: { vent: 0.85 } }],            // 4 à 6 cartes du tiroir Bidouiller
  pourquoi: {
    etincelle: '…',                 // 1 phrase, 25 mots max : le phénomène expliqué d'un trait
    texte: '…\n\n…',                // 60 à 120 mots, 1 ou 2 paragraphes, **un** mot savant en **gras** (le mot arrive après l'idée)
    vraie: '…',                     // facultatif : une histoire vraie et vérifiée (2 ou 3 phrases)
    petit: '…',                     // facultatif : pour « Je découvre » (5-8 ans) : 1 ou 2 phrases de 8 à 12 mots, lisibles à voix haute ; les mêmes faits que l'étincelle, en mots de tous les jours (sinon l'étincelle sert)
  },
  etsi: [{ id: 'espace', scene: 'bougie', question: 'Et si … ?', choix: ['…', '…', '…'], bonne: 1,
           prepare: { scene: 'bougie', regle: { gravite: 0 }, outil: 'sel', action: 'rubrique/bouton' },
           regarde: 'Touche une flamme…',   // facultatif : ce que l'enfant doit faire ou regarder
           attente: 5,                      // secondes avant la révélation
           revele: '…' }],                  // 30 à 70 mots ; bonne: null si aucun choix n'est « juste »
  rotation: 'garder',               // 'garder' si l'enfant construit quelque chose (on ne recrée pas à la rotation), 'recreer' sinon
  flashs: 'rubrique/flashs adoucis', // seulement si la machine a un réglage anti-photosensibilité
});
```
Les valeurs de `regle`, `plages`, `recettes` et `graines` sont dans **les unités du vrai contrôle**, celles de `ui.json`. Une clé peut être un levier (`vent`) ou un chemin direct (`'physique/vent'`). Les réglages techniques (« Qualité du calcul », « Définition », etc.) ne sont **jamais** dans les leviers ni dans les plages : ils restent dans le Labo.

## La charte d'écriture (non négociable)
- **Tutoiement, présent, phrases courtes** (environ 15 mots). Le ton est celui d'un grand frère ou d'une grande sœur passionnés, pas celui d'un prof, et sans infantiliser : pas de « Bravo petit scientifique ! », pas de diminutifs.
- **Le phénomène d'abord, le mot ensuite** : « L'air chaud, plus léger, monte. On appelle ça la **convection**. » Un seul mot savant par texte, en gras.
- **Aucun anthropomorphisme ni finalisme non assumé** : pas de « la fourmi décide », « le blob veut », « l'éclair choisit », « les lucioles ont envie ». On décrit des règles et leurs conséquences.
- **Dire ce qui est simplifié ou accéléré** (« Dans la machine, des milliards d'années passent en quelques secondes. ») et ce que les scientifiques ne savent pas encore.
- **Aucun mot magique dans une explication** (« comme par magie », « mystérieusement »). On les garde pour une question.
- **Des ordres de grandeur concrets** plutôt que des nombres nus.
- **Les noms d'enfant des réglages** sont concrets (« Remous », « Rester ensemble », « Voisins regardés »), avec des bouts parlants. Pas de lettres grecques, pas de jargon (le vrai nom reste dans le Labo).
- **Les histoires vraies doivent être exactes.** Dans le doute, on ne l'écrit pas. Si l'on cite une légende, on la présente comme une légende.
- **Les « Et si… ? »** : une question qu'on peut trancher en regardant la machine. 2 ou 3 choix, et « Aucune idée ! » est ajouté automatiquement. On ne publie un défi que si la machine montre le résultat **clairement et à coup sûr** avec les réglages de `prepare` ; dans le doute, on s'abstient. La révélation explique, elle ne juge pas.

## Les erreurs déjà repérées (à ne jamais écrire)
Ces corrections viennent de la relecture scientifique de Claire :
- Il n'y a pas de feu sur la Lune : il n'y a pas d'air. On écrit « base lunaire sous un dôme d'air ».
- La chaufferette **chauffe** en devenant solide ; elle ne « gèle » pas.
- Dans une nuée, l'oiseau **isolé** est la proie facile ; au cœur de la nuée, le faucon est désorienté (effet de confusion).
- L'éclair ne « choisit » pas son chemin : il avance par bonds, un peu au hasard, plus volontiers là où le champ électrique est fort.
- Les animaux des abysses ont souvent des yeux ; la lumière y sert à attirer une proie, à se camoufler, à effrayer, à trouver un partenaire.
- Le « Nombre de Reynolds » n'est pas la vitesse : on l'appelle plutôt « Remous (calme → agité) ».
- La zone extrême « n'existe nulle part » est souvent fausse (l'apesanteur existe dans la station spatiale) : on écrit « rare » ou « impossible sur Terre ».
- La grille du Jeu de la vie se referme sur elle-même (un tore) : les records connus sur une grille infinie (R-pentomino : 1 103 générations) n'y sont pas reproduits. Et *diehard* disparaît à la génération 130.
- Mars : le couchant est bleu **autour du soleil** seulement, le ciel reste couleur caramel (c'est un modèle approché).
- La flamme en apesanteur est ronde, petite, bleue, et peut s'étouffer : l'air frais n'arrive plus.
- Les couleurs de flamme : sodium **jaune** ; potassium lilas pâle.
- Mémoire de Taylor : cela ne marche qu'avec un liquide très visqueux remué lentement ; l'encre était étirée, pas vraiment mélangée.
- Attracteur de Lorenz : avec ρ ≈ 20, la courbe finit sur l'un des **deux** points fixes. Ne pas appeler β « freinage ».
- Andromède et la Voie lactée : la fusion est **incertaine** (environ une chance sur deux dans les 10 prochains milliards d'années, d'après une étude de 2025).
- Turing : le mécanisme est confirmé pour quelques cas (les rayures du poisson-zèbre). Pour le guépard, ce n'est pas démontré.
- Sophie Germain : l'École polytechnique lui était fermée, elle en suivait les cours sous un nom d'homme. Elle a remporté le prix de l'Académie en 1816, et sa théorie était incomplète.
- Le Mycélium : le partage du carbone entre arbres est **débattu**.

## L'âge et le niveau (13/11/2026)
À la première ouverture, l'enfant (ou un parent) choisit **son âge** (de 5 à 15 ans, ou 16 et plus) puis **son niveau** : Je découvre, J'aime comprendre, Je veux tous les détails, Je connais déjà. Le niveau est proposé d'après l'âge ; on le change depuis la carte (pastille du profil) ou le coin des grands.
- **L'âge règle l'ergonomie.**
  - 5-6 ans : commandes agrandies (× 1,3), 2 gestes au plus, 2 leviers au plus, pas de Labo ; les « Et si » sont cachés au niveau « Je découvre ».
  - 7-9 ans : × 1,15, 3 leviers, pas de Labo (sauf niveau 3 ou 4).
  - 10-14 ans : l'interface d'origine.
  - 16 ans et plus : la même, avec le Labo.
- **Le niveau règle la profondeur.**
  - Je découvre : question, `petit` (ou l'étincelle) et « Essaie ça » ; le texte est replié sous « Lire la suite ».
  - J'aime comprendre : la fiche complète.
  - Je veux tous les détails : tous les leviers de la fiche et « Pour les curieux » ouvert.
  - Je connais déjà : en plus, le Labo ouvert, le texte adulte de la machine, et sous chaque levier son vrai nom et sa vraie valeur.
- **La lecture à voix haute** (« Écouter ») utilise la synthèse vocale de l'appareil, quand elle a une voix française. Elle est proposée aux moins de 10 ans et au niveau « Je découvre ».
- **Les retours de chef-design (13/11)** sont appliqués :
  - **plusieurs joueurs par tablette** : chacun a un signe (un avatar), et l'on change de joueur depuis la carte (« Qui joue ? ») ;
  - **l'âge n'est jamais affiché**, sauf dans le coin des grands ;
  - **sous 9 ans, « Je découvre » est posé d'office**, sans question ; le niveau se change dans le coin des grands, derrière l'appui long ;
  - **les chiffres de 5 à 9 portent des bougies**, et la question est lue au premier toucher ;
  - **pictogrammes de niveau** : graine, pousse, arbre, forêt ;
  - **police Andika** (SIL, OFL) de 5 à 9 ans ;
  - **cibles** d'au moins 76 px à 5-6 ans et 60 px à 7-9 ans, avec environ 16 px d'écart.
  - Captures : `docs/captures-jeunesse/`.
- **La science ne change pas d'un niveau à l'autre** : seuls la quantité de texte et le vocabulaire changent. Un texte `petit` dit les mêmes faits que l'étincelle, sans mot savant. Il ne simplifie jamais au point d'être faux.

## La navigation (refonte du 13/11/2026, avec chef-design)
- **Les questions** : 24 grandes questions, réparties en 6 mondes (`jeunesse/js/mondes.js`, `FJ.QUESTIONS`). Chaque question est un **chemin de chapitres** ; un chapitre est une machine et une de ses scènes. Le niveau en ouvre 2 (Je découvre), 4 (J'aime comprendre) ou tous. Une question peut traverser plusieurs machines (insectes : lucioles et fourmis).
- **L'écran** : plus de colonnes. Quatre grappes de boutons ronds, à 24 px des bords :
  - en haut à gauche, Carte et Encore ;
  - en haut à droite, le signe du joueur, Son, Pause et Photo ;
  - en bas à gauche, Pourquoi et Bidouiller ;
  - en bas à droite, les outils.
  
  Le chemin est en bas, au centre. Sur téléphone, il passe sur toute la largeur et l'agrandissement est plafonné (× 1,12).
- **La main fantôme** montre le geste au début de chaque chapitre, puis revient après 20 s sans contact.
- **« Pourquoi ? » est un fil** : une phrase (`petit` ou l'étincelle), puis « encore » (Essaie ça, le texte, l'histoire vraie), puis « Pour les curieux », qui ouvre le tiroir complet.
- **La carte** montre les questions, avec des vignettes fixes et un point de couleur pour ce qui a été vu.
- **Pas encore fait** :
  - la fusion des deux applications (l'adulte deviendrait le niveau « Je connais déjà ») ;
  - la mise en pause des 2 derniers chapitres sans les détruire (aujourd'hui, on garde l'état des réglages, pas ce qui a été construit) ;
  - un « Pourquoi ? » qui réagit à l'état de la machine.
- Captures : `docs/captures-jeunesse/nav-*.jpg`.
