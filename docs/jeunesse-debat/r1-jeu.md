# Round 1 — Jonas Lefebvre, game designer : « Des jouets d'abord, des jeux ensuite, la science au fond »

Mon credo tient en une phrase : **une machine doit être amusante dans les trois secondes sans qu'on lise un mot**. Toca Boca ne montre aucune règle : on touche, ça réagit, on retouche. The Powder Toy ne contient aucun « objectif », et des gamins y passent des centaines d'heures parce que **chaque outil se combine avec les autres**. Notre force, ce sont 32 moteurs déjà superbes. Il ne faut pas leur plaquer un jeu dessus. Il faut **dégager le jouet qui est déjà dedans**, puis ajouter de légers cadres (collections, énigmes, secrets) qui donnent une raison de revenir, sans jamais rien obliger.

La boucle que je vise pour chaque machine :
**curiosité** (une image vivante, un nom de tirage intrigant) → **geste** (un doigt, un outil-pinceau) → **réaction surprenante** (la nuée se déchire, la flamme verdit) → **question** (« et si je poussais plus fort ? ») → **nouvelle envie**. L'explication arrive *après* la surprise, comme une récompense, jamais comme un péage.

---

## 1. Le jouet caché dans chaque catégorie

**Vivant : « je suis une force de la nature ».** Le plaisir, c'est d'être un prédateur, une tempête ou une pluie de nourriture face à une foule qui s'organise toute seule.
- *Murmuration* : FAUCON qui fend la nuée, EFFRAYER qui propage une vague de panique. C'est le meilleur jouet de l'appli.
- *Blob* : COUPER le blob et le regarder cicatriser, poser de l'avoine et le voir tendre un réseau vers elle.
- *Fourmilière* : effacer une autoroute de phéromones au doigt et regarder les fourmis la reconstruire.
- *Lucioles* : SIGNAL, c'est-à-dire répondre à un mâle et se faire courtiser par un insecte. Il y a là une vraie conversation.
- *Jeu de la vie* : poser un planeur et le voir filer.
La surprise vient toujours de la même chose : **personne ne commande, et pourtant ça s'organise**.

**Éléments : « je fabrique la météo ».** Le plaisir est sensoriel et destructeur.
- *Feu* : SEL sur la flamme, qui devient verte (cuivre) ou rouge (strontium) ; gravité à 0, et la flamme devient une boule bleue.
- *Eau* : PLUIE maintenue et caustiques qui dansent ; NOURRIR les koïs.
- *Sable* : SECOUER, ou mouiller pour construire.
- *Foudre* : planter un PARATONNERRE et appeler l'éclair juste à côté.
- *Cristal* : la chaufferette qui gèle d'un coup au toucher.
- *Écoulement* : la Mémoire de Taylor, un mélange qui se « démélange ». C'est un tour de magie.

**Motifs : « je suis un artiste qui ne contrôle pas tout ».** C'est la catégorie des **dessins mystère**.
- *Harmonographe*, *Kaléidoscope*, *Cymatiques* (la figure qui saute d'un coup à la résonance), *Turing* (greffer un pelage sur un autre), *Fractales* (plonger sans fond).
- *Moiré* : bouger d'un millimètre, et les franges bougent d'un pouce.
- *Illusions* : RÉVÉLER, le « ah, c'était faux ! ».

**Cosmos : « je pilote l'immensité ».**
- *Tunnel* : maintenir ACCÉLÉRER.
- *Galaxie* : lancer un troisième noyau (ASTRE) dans une collision.
- *Lave* : chauffer sous le doigt et voir une colonne naître.
- *Bulles* : ÉCLATER, le plaisir universel du papier bulle ; ÉCARTER la caténoïde jusqu'à la rupture.

**Sons : « je suis un instrument ».**
- *Harpe* : traverser les cordes d'un geste.
- *Spectre* : chanter au doigt et voir sa note s'écrire.
- *Pendules* : relâcher et attendre le réalignement, comme une montée en suspense.
- *Illusions sonores* : un escalier qui monte sans fin, à tester sur un copain.

**Invisible : « je triche avec la réalité ».**
- *Quantique* : lancer des électrons un à un et voir les franges apparaître ; activer le détecteur « par quelle fente ? » et les voir disparaître. C'est le plus grand « quoi ?! » de toute la physique, et il tient en un interrupteur.

---

## 2. La structure de jeu transversale

### Ce que j'écarte d'emblée (le creux)
- **Points, XP, niveaux, classements, séries quotidiennes** : ils mesurent le temps passé, pas la curiosité. Ils transforment la Murmuration en corvée.
- **Machines verrouillées** : on ne cadenasse jamais un jouet. Les 32 sont ouvertes dès la première seconde.
- **QCM bloquants** avant d'accéder à quelque chose : c'est l'inverse exact de la demande de Yoann.
- **Chronos obligatoires**, vies, échec punitif.
- **Badges pour « avoir ouvert 10 machines »** : c'est de la récompense sans exploit.

### A. Les Merveilles à dénicher (collection de phénomènes), le cœur du système
**Comment.** Chaque machine a 3 à 6 « merveilles » : des phénomènes nommés, avec un nom d'enfant et une silhouette floutée dans le carnet. Chaque case vide porte un **indice-énigme**, pas une instruction. Par exemple, « On dit qu'un feu peut devenir vert… » plutôt que « mettez du cuivre ».

**Détection.** Trois niveaux, sans toucher aux moteurs :
1. **Automatique par les réglages** : le shell lit déjà les `value` renvoyées par `ui()`. On peut donc écrire un prédicat dans les métadonnées, du type `{label:'Gravité', max:0.03}`, qui donne la merveille « Bougie de l'espace ».
2. **Automatique par geste** : le shell sait quel outil est actif et voit passer les `down/move` ; il connaît aussi la valeur du choix associé. Exemple : outil SEL plus « cuivre » plus un toucher.
3. **« Je l'ai vu ! »** : quand l'événement n'est pas lisible de l'extérieur (un éclair qui tombe sur le paratonnerre), l'enfant valide lui-même en prenant une photo. C'est la photo qui compte comme preuve pour lui-même. Pas de triche possible, puisqu'il n'y a rien à gagner.

**Pourquoi.** La collection donne un « où aller ensuite » sans imposer de chemin, et chaque merveille est **un concept scientifique déguisé en trésor**. La fiche qui se débloque contient 3 lignes jeunesse : ce que tu as vu, pourquoi, et où on le trouve en vrai.

**Coût : moyen.** Il faut un moteur de prédicats générique (faible), mais l'écriture d'environ 120 merveilles est le vrai travail.

### B. Le Carnet de l'explorateur
**Comment.** Le bouton PHOTO existe déjà. Chaque photo arrive dans un carnet local (IndexedDB), **légendée automatiquement** avec la machine, la scène, le nom du tirage et les réglages-clés. Un bouton « Refaire cette expérience » recharge les réglages, ce qui est faisable pour la partie lisible et réglable via `ui()`. Le carnet contient aussi les merveilles trouvées et les ponts découverts (voir E).

**Pourquoi.** Le carnet est la mémoire du joueur et la seule « progression » visible. Il fait aussi office d'outil scientifique : l'enfant garde une trace, compare, montre.

**Coût : moyen.** Le stockage local et une galerie suffisent. On peut ajouter l'export d'image vers la galerie Android (partage), qui dépend du WebView.

### C. Les cartes « Et si… ? » (prédire, essayer, comprendre)
**Comment.** Dans chaque machine, une petite carte propose une question avec 2 ou 3 réponses illustrées. Exemple : « Et si on mettait le feu sur la Lune ? La flamme sera plus haute / plus ronde / s'éteindra. » L'enfant **parie**, puis un bouton « Essaie ! » règle la machine (ou lui dit quel curseur pousser). La réponse arrive par l'image, puis une phrase d'explication. **Avoir eu tort est le meilleur moment**, et l'interface doit le célébrer (« Surprise ! Presque tout le monde se trompe ici »).

**Pourquoi.** C'est la boucle « prédire, observer, expliquer » : le meilleur ratio fascination/apprentissage de toute la liste, et du pur Nicky Case.

**Coût : faible.** C'est du texte, plus des préréglages appliqués via les `set` de `ui()`.

### D. Les Dessins mystère (énigmes inverses, façon Zachtronics léger)
**Comment.** Dans les machines à motifs, on montre une **image cible** (une vignette produite par nos soins) et l'enfant doit retrouver les réglages. Exemples : « Retrouve ce trèfle » dans l'Harmonographe (quinte 3:2) ; « Fais apparaître cette figure de Lissajous » dans le Spectre ; « Retrouve ce pelage » dans Turing. La validation est automatique par prédicat sur les valeurs. Un « tiède / chaud / brûlant » guide l'enfant.

**Pourquoi.** L'enfant comprend qu'**un réglage produit une forme**, et il construit l'intuition des rapports (3:2, 4:3).

**Coût : moyen.** Il faut un panneau d'énigme et des vignettes. On limite à 5 ou 6 machines où c'est vraiment juste : Harmonographe, Spectre (Lissajous), Turing, Cymatiques, Kaléidoscope et Attracteur.

### E. Les Ponts (secrets entre machines)
**Comment.** Certaines merveilles sont **la même loi dans deux machines**. Quand l'enfant a trouvé les deux, un fil lumineux relie les deux machines sur la carte d'accueil, et une fiche « Même loi, deux mondes » s'ouvre. Exemples :
- Double fente dans la cuve à ondes de l'Eau ↔ double fente du Quantique ;
- Cellules de Bénard (Lave) ↔ convection du Feu ;
- Spirales (BZ, les amibes) ↔ Blob ;
- Turing (pelages) ↔ Jeu de la vie (règles locales, formes globales) ;
- Chaos de l'Attracteur ↔ Pendules (de l'ordre qui revient) ;
- Harmonographe ↔ Lissajous ↔ Harpe (monocorde) : trois façons de voir 3:2 ;
- Murmuration ↔ Fourmilière ↔ Lucioles : aucun chef.

**Pourquoi.** C'est **le** moment pédagogique profond : la science, c'est découvrir que des choses différentes obéissent à la même règle. Ces liens forment une constellation qui se dessine peu à peu, ce qui est très beau à l'écran.

**Coût : faible à moyen**, une fois que A existe.

### F. Les Tours à montrer
Une petite étiquette « Tour à montrer » (chapeau de magicien) sur 6 ou 7 expériences faites pour bluffer un copain ou un parent : la Mémoire de Taylor, la fondamentale absente, l'escalier de Shepard, les gris identiques des Illusions, la chaufferette, le détecteur quantique, Mars au coucher de soleil. Avec un mini-script : « Dis-lui… puis touche ici ». **Coût : faible.** La valeur sociale est énorme pour des 10-14 ans.

---

## 3. Le hasard : magique, pas frustrant

1. **Des graines curées, pas un tirage uniforme.** Les métadonnées de chaque machine contiennent des **plages « intéressantes »** pour chaque réglage exposé, une **liste de combinaisons interdites** (un tirage noir, vide ou figé) et des **graines remarquables** écrites à la main, avec un poids plus fort. Le tirage final mélange une graine et des variations dans les plages. Des centaines de combinaisons, toutes regardables.

2. **Nommer le tirage.** Chaque tirage reçoit un titre généré à partir de ses ingrédients : « Feu de camp sur la Lune », « Nuit sans lune dans la mangrove », « Murmuration au crépuscule, faucon en chasse », « Désert venteux, sable rouge ». Un nom transforme un hasard en **découverte**, et on a envie d'en collectionner. Le nom s'affiche 3 secondes en bas, façon carte de cinéma, puis disparaît.

3. **Garder ou relancer.** Un dé pour un nouveau tirage dans la même machine, une épingle pour garder ce tirage (il va au carnet avec sa photo). Les flèches ‹ › gardent leur sens : on passe à la machine suivante avec un tirage frais.

4. **Arriver en pleine action.** Le tirage doit montrer du mouvement en moins de 2 secondes. Les métadonnées indiquent pour chaque machine une **« amorce »** : quelques secondes de simulation avant le fondu (si le moteur le permet), ou un geste automatique joué une fois, comme une goutte dans la mare, un éclair, une spirale semée ou une bulle soufflée. On n'arrive jamais sur un écran vide.

5. **Un sac, pas un dé.** Au démarrage de l'appli, la machine est tirée dans un « sac » : on ne retombe pas sur une machine vue dans les dernières sessions. Les tirages favorisent légèrement les **merveilles non encore trouvées**, ce qui donne un hasard qui pousse doucement vers la découverte. Les machines Sons ne sont pas tirées au démarrage si le son est coupé (ou alors elles proposent un gros bouton « Écoute ! »).

6. **Ne jamais réinitialiser sans demande** : le son, le zen ou le décor ne touchent plus à l'état. Le dé est le seul bouton « recommencer » visible, et il est explicite.

**Coût : moyen.** Il faut écrire 32 fichiers de plages et graines. Le générateur de noms est un simple assemblage de fragments par réglage.

---

## 4. Le mode bac à sable / laboratoire

**Deux couches, un seul écran.**

- **Couche « Jouer » (par défaut)** : une **barre de pinceaux** en bas, avec les outils de la machine en grosses icônes et un verbe d'enfant (« Effraie », « Arrose », « Coupe »). Elle est toujours visible, parce que c'est elle le jeu. À côté, **3 grands leviers** maximum, choisis par machine pour leur effet spectaculaire : Gravité, Oxygène et Vent pour le Feu ; Cohésion, Séparation et Faucon pour la Murmuration. Des noms simples, avec le mot savant en petit dessous.

- **Couche « Labo » (un tiroir à ouvrir)** : tous les réglages de `ui()`, regroupés et renommés. Trois ajouts de game design :
  1. **Zone extrême** : les curseurs ont une graduation « normale » (la Terre, la nature, la zone verte) et des **extrémités marquées** (« monde impossible »). Pousser au bout est encouragé, avec un petit écriteau : « Ceci n'existe nulle part… sauf ici ». C'est le plaisir KSP de tout casser.
  2. **Avant / Après** : un bouton « Comparer » prend une photo, l'enfant change UN réglage, une deuxième photo est prise, et les deux s'affichent côte à côte avec le réglage modifié écrit en dessous. Faire tourner deux moteurs en parallèle coûte trop cher : les photos suffisent et enseignent la **variable contrôlée**. **Coût : faible.**
  3. **Les réglages « vrais »** : un bouton « Remettre comme dans la nature » (beaucoup de machines ont déjà « Valeurs naturelles » ou « Valeurs classiques »). La nature devient un repère, pas une contrainte.

- **Le ralenti et le pas à pas** : la vitesse et la pause existent déjà. Je propose d'exposer un **« ×0,1 »** franc et une **image par image** là où c'est possible (Jeu de la vie, Spirales, Quantique). Regarder au ralenti, c'est déjà faire de la science.

- **Pinceaux combinables** : ce n'est pas à nous de créer des combinaisons, mais il faut les **montrer**. Par exemple, poser un obstacle dans l'Écoulement, puis de l'encre, puis remuer. La première fois qu'un enfant combine deux outils, un petit « Combo ! » discret apparaît, sans points.

---

## 5. Trente défis, secrets et jouets sur 26 machines

*(M) = merveille à collectionner, (S) = secret, (E) = « Et si ? », (D) = dessin mystère, (T) = tour à montrer, (P) = pont.*

1. **Feu** (M) *Le nuancier des flammes* : colorer la flamme avec les 8 sels (sodium jaune, strontium rouge, cuivre vert, potassium lilas…). Une collection dans la collection.
2. **Feu** (E) « Sur la Lune, une bougie… ? » Gravité réglée sur 0,17 g, puis à 0 : la flamme sphérique et bleue (merveille *Bougie de l'espace*).
3. **Feu** (M) *L'asphyxie* : trouver le taux d'oxygène où le feu s'étouffe. *Le brasier* : passer en air suroxygéné.
4. **Eau** (P) *Les deux fentes de la mare* : construire avec MUR une paroi percée de deux trous dans la cuve à ondes, et voir les franges. Elle forme un pont avec le Quantique.
5. **Eau** (M) *Le banc de koïs* : avec NOURRIR, rassembler tous les koïs au même endroit.
6. **Écoulement** (T) *Le mélange qui se démélange* (Mémoire de Taylor).
7. **Écoulement** (E) « Si l'eau coule plus vite derrière le cylindre… ? » Pousser le Reynolds et voir naître l'allée de tourbillons.
8. **Sable** (M) *Le château qui tient* : mouiller, puis verser. Défi optionnel : une tour plus haute que la dune.
9. **Sable** (S) *Le repas du fourmilion* : verser du sable au bord d'un piège.
10. **Foudre** (M) *Paratonnerre victorieux* : un éclair capté par ta tige (validé par « Je l'ai vu ! »).
11. **Foudre** (jouet de mesure) *Compte le tonnerre* : compter les secondes entre l'éclair et le tonnerre, diviser par 3, puis comparer à la vraie distance réglée. C'est de la vraie science, avec le corps.
12. **Ciel** (S) *Le coucher de soleil bleu* : sur Mars, le couchant est bleu.
13. **Ciel** (M) *L'arc double* : trouver l'arc secondaire (deux réflexions) et remarquer que ses couleurs sont inversées. (E) « Où passe l'arc-en-ciel quand le soleil est haut ? »
14. **Cristal** (T) *La chaufferette* : un seul toucher, et tout gèle.
15. **Turing** (M) *Le safari de l'Atlas* : retrouver dans l'Atlas, en touchant, les zones qui font corail, mitose, labyrinthe, solitons…
16. **Turing** (D) *Zèbre en guépard* : greffer un pelage sur un autre jusqu'à obtenir la cible.
17. **Spirales** (M) *Couper l'onde* : briser un front et obtenir deux spirales jumelles. (P) avec les Amibes et le Blob.
18. **Cymatiques** (M) *Dix figures de Chladni* : les photographier. Jeu « chaud / froid » à l'oreille pour trouver la résonance.
19. **Harmonographe** (D) *Le trèfle, l'étoile, la fleur qui tourne* : retrouver l'intervalle et le désaccord. (P) avec Lissajous et le monocorde.
20. **Attracteur** (E) *Effet papillon* : « Combien de temps avant que les jumeaux se séparent ? » Parie, puis regarde. (S) Baisser ρ jusqu'à ce que le papillon meure en un seul point.
21. **Fractales** (M) *Safari Mandelbrot* : visiter la Vallée des hippocampes, la Vallée des éléphants et un Mini-Mandelbrot. Bonus : en trouver un **à la main** (profondeur atteinte avec l'outil PLONGER).
22. **Moiré** (S) *La loupe à mouvements* : un geste minuscule, une frange immense. Ombro-cinéma : faire marcher le dessin.
23. **Illusions** (T) *Les gris jumeaux* : faire parier un ami, puis RÉVÉLER.
24. **Galaxie** (E) « Et si un troisième noyau traversait la collision ? » Avec ASTRE.
25. **Tunnel** (M) *Le mur de lumière* : accélérer jusqu'à ce que le ciel se resserre devant et que le rayonnement du Big Bang s'allume.
26. **Lave** (M) *Le geyser de cire* : chauffer sous le doigt jusqu'à faire naître une colonne. (P) avec les Cellules de Bénard.
27. **Bulles** (M) *Le film noir* : observer une bulle qui noircit en haut juste avant d'éclater. *La caténoïde rompue* : écarter jusqu'à la rupture.
28. **Harpe** (M) *L'octave cachée* : avec l'outil HARMONIQUE au milieu de la corde. **Pendules** (E) « Au demi-cycle, les pendules forment… ? » **Illusions sonores** (T) *L'escalier sans fin*, *La note fantôme*.
29. **Quantique** (M) *L'espion qui efface les franges* : allumer le détecteur « par quelle fente ? ». C'est la merveille la plus profonde de l'appli.
30. **Vivant, à volonté** :
    - **Murmuration** : (D) dessiner un cœur avec GUIDER ; (E) « Séparation à zéro ? »
    - **Blob** (M) : *Le réseau ferré*, ou couper un blob et le voir se recoudre.
    - **Fourmilière** (E) : *Double pont*, parier sur le pont choisi.
    - **Mycélium** (S) : *La découverte de Fleming*, révéler la pénicilline autour du Penicillium.
    - **Abysses** (M) : allumer la lumière des 7 créatures.
    - **Lucioles** (M) : se faire courtiser avec SIGNAL ; (S) repérer la prédatrice ; (E) « Que se passe-t-il si on éteint la ville ? »
    - **Jeu de la vie** (M) : *Le zoo de Conway* (planeur, vaisseau, pulsar, canon) ; (S) le R-pentomino, 5 cellules qui vivent plus de 1 100 générations.

---

## 6. Mon TOP 5

1. **Arriver en pleine action, sur un tirage nommé** (graines curées, dé et épingle, aucune réinitialisation sauvage). C'est la première impression et la demande explicite de Yoann ; sans elle, rien d'autre ne compte.
2. **La barre de pinceaux et 3 grands leviers par machine**, avec le tiroir Labo (zones extrêmes, Avant/Après, « comme dans la nature »). Le jouet passe avant tout.
3. **Les Merveilles à dénicher dans le Carnet de l'explorateur** : une seule structure de collection qui porte à la fois l'envie de revenir et le contenu pédagogique, avec une détection par réglages ou gestes, ou par « Je l'ai vu ! ».
4. **Les cartes « Et si… ? »** : le meilleur rapport fascination/apprentissage/coût de toute la proposition.
5. **Les Ponts entre machines** : la constellation qui se dessine révèle l'idée la plus belle de la science, à savoir que la même loi est partout. Les Dessins mystère et les Tours à montrer viennent ensuite, s'il reste du temps.

Le reste (points, badges, niveaux) : non. Si un enfant revient, ce sera parce qu'il veut voir une flamme verte sur la Lune, pas pour remplir une jauge.
