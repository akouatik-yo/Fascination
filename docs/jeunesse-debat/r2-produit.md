# Tour 2 : Nadia Roussel, directrice de produit (avocate du diable)

> J'ai vu mourir beaucoup d'applis éducatives. Aucune n'est morte faute d'idées. Elles sont mortes parce qu'elles en avaient cent, toutes à moitié finies, et qu'elles avaient oublié leur promesse. La nôtre tient en une ligne : **on touche, c'est beau, ça réagit, et l'envie de comprendre vient après**. Tout ce qui ne sert pas cette ligne attendra.

Additionnées, les cinq propositions font plus de 40 000 mots à écrire, 120 merveilles à détecter, 30 défis, 7 fils, des ponts et des dessins mystère, pour **un seul développeur**. Je coupe donc beaucoup, et je l'assume.

---

## 1. Le consensus : à faire, sans débat

1. **Zéro réinitialisation non demandée**, rotation de la tablette comprise (Malik l'a trouvée dans le code). C'est le chantier n° 1 : sans lui, le bac à sable n'existe pas.
2. **Ouverture directe sur une machine tirée au hasard, déjà en mouvement**, panneau fermé. Pas d'écran d'accueil.
3. **Un hasard curé, jamais uniforme** : des plages « toujours belles » par scène, aucun écran vide ou figé.
4. **La machine en plein écran.** L'interface se pose par-dessus et ne la redimensionne jamais.
5. **Des outils en icônes avec un verbe**, dans une barre placée sous les pouces.
6. **Deux étages de réglages** : 3 ou 4 leviers aux noms concrets, et **tous** les réglages d'origine intacts dans un mode labo. On simplifie sans rien retirer.
7. **La science à la demande, après le jeu**, courte, en couches, qui finit par une action (« Essaie… »).
8. **Prédire puis vérifier, sans note.** Le « Et si… ? » de Jonas, le défi de Claire et le « aha » de Sofia sont **le même objet**. On garde un seul format.
9. **Pas de points, d'XP, de séries quotidiennes ni de machines verrouillées.** Pas de « Bravo champion ».
10. **Un carnet local** qui garde les photos et les découvertes.
11. **Sécurité** : flashs adoucis par défaut, avertissement pour les scènes stroboscopiques.

---

## 2. Les désaccords, tranchés

**6 catégories ou 7 fils rouges ?** → **Les 7 fils de Sofia, et eux seuls.** Garder les 6 catégories, c'est le « skin » que Yoann refuse (« Cosmos » contient une lampe à lave, « Invisible » une seule machine). Les fils couvrent exactement les 32 machines et **absorbent les Ponts de Jonas sans coût** : la passerelle, c'est l'appartenance au même fil. Une seule classification, donc un seul menu, avec des noms raccourcis.

**Collections/merveilles ou « pas de trophées » ?** → **Un carnet d'observations, pas une vitrine de trophées.** Pour la V1, le carnet range ce que l'enfant a *fait* : ses photos, ses paris « Et si » (avec « Bien vu ! » ou « Surpris ! », à valeur égale), ses épingles. Les merveilles détectées automatiquement passent en V2 : 120 prédicats à fiabiliser, c'est 120 occasions d'un « je l'ai fait et ça n'a pas compté », ce qui est le pire message possible.

**Titre-question à l'ouverture ou zéro texte avant de jouer ?** → **Les deux sont compatibles.** Un carton de cinéma (nom de la machine et titre-question, 8 mots au maximum) s'affiche en bas pendant 3 secondes et s'efface au premier toucher. Il ne bloque rien et ne demande aucune lecture pour jouer. Lina a raison sur l'esprit : rien ne doit **précéder** le geste. Le nom de tirage généré de Jonas fait doublon et passe en V2.

**Recettes ou labo intégral ?** → **Les deux, mais les recettes ne sont pas un contenu en plus.** Les « graines remarquables » de Jonas *sont* des recettes. Une seule structure de données sert à la fois au hasard (tirages pondérés) et au tiroir (cartes nommées). Le Mode labo affiche les réglages d'origine tels quels en V1. La petite phrase sous chacun (Lina) passe en V2 : traduire des centaines de réglages coûte plus que tout le reste.

**Hasard ou reproductibilité ?** → **Le hasard par défaut, et une sortie de secours honnête.** ‹ revient à la machine précédente avec **la même scène et les mêmes réglages**. « Épingler » range l'état dans le carnet avec sa photo, « Refaire » le recharge. Je refuse de promettre un « Rejouer ce moment » exact : les moteurs ne sont pas déterministes et on n'y touche pas. On restaure les conditions de l'expérience, pas le château de sable, et c'est ce que fait un scientifique.

**Défis « Et si » ou liberté ?** → **La liberté gagne toujours.** Un « Et si » n'apparaît jamais tout seul avant 40 secondes de jeu. Il prend la forme d'une pastille discrète, ne bloque rien et se balaie d'un geste. Un seul par machine en V1. **Règle de Claire non négociable** : chaque défi est validé sur la vraie machine, sinon il n'est pas publié. Objectif 32, plancher 20. Une machine sans défi validé garde ses lignes « Essaie ça ».

**Combien d'écrans ?** → **Trois** : la Machine, la Carte, le Carnet. S'y ajoute un coin des parents caché (appui long). Aucun écran d'accueil, aucun écran « défis », aucun écran « collection » séparé.

**Balayage ou boutons ?** → **Des boutons.** Malik a raison : dans 32 machines, le doigt dessine, verse, effraie, pince. Un balayage pour changer de machine volerait la moitié des gestes et provoquerait des départs involontaires, c'est-à-dire exactement la réinitialisation qu'on combat. ‹ › et les flèches du clavier suffisent.

**Le ton et la longueur des textes ?** → **Une charte unique, celle de Claire, plafonnée par Sofia** : tutoiement, présent, 15 mots par phrase, le phénomène d'abord puis le mot, un seul mot savant en gras, aucun mot magique dans une explication, le grand frère de Lina et pas le prof. Plafonds : titre-question ≤ 8 mots, étincelle ≤ 20, « Pourquoi » ≤ 90, « Essaie ça » ≤ 15. **« Pour les curieux » reprend le texte adulte existant**, sans réécriture : il est juste, il est dense, et les curieux le méritent tel quel.

**Combien de contenu écrire ?** → **Environ 9 000 mots, pas 40 000.**

| Texte | Unité | Volume |
|---|---|---|
| Titre-question + étincelle | 32 machines | ~900 mots |
| « Pourquoi ? » | 32 machines | ~2 900 mots |
| « Essaie ça » | ~90 scènes | ~1 300 mots |
| Noms des leviers | ~90 scènes × 3-4, beaucoup partagés | ~150 libellés |
| Recettes nommées | 2-3 par scène là où c'est utile | ~150 noms |
| « Et si… ? » | 20 à 32 | ~1 800 mots |

C'est relisable par Claire en un temps raisonnable. Le reste attend la V2.

---

## 3. Le risque d'échec de chaque grande idée, et ce que je coupe

- **Zéro réinitialisation, rotation comprise.** *Risque : élevé et technique.* Aucun moteur ne sait se redimensionner. Le canvas carré de Malik coûte 1,6 fois plus de pixels sur les moteurs WebGL lourds (Écoulement, Feu, Galaxie) d'une tablette moyenne. **Mon arbitrage** : on ne reconstruit jamais à la rotation. Le canvas garde sa taille et il est **recadré à l'échelle en CSS** pour couvrir le nouvel écran, en convertissant les coordonnées du toucher. Le coût en pixels est nul. Un bouton « Ajuster à l'écran » reconstruit, sur demande explicite. Chaque machine est vérifiée avec une liste de contrôle (son, thème, tiroir, rotation, Spectacle, arrière-plan).
- **Le hasard curé.** *Risque : moyen.* Il y a 90 scènes et autant de façons de tomber sur un écran noir. **Garde-fou** : un script tire 20 fois chaque scène, fait une capture et produit une planche-contact. On regarde les 1 800 vignettes, on serre les plages. L'« amorce » par avance rapide est coupée (les moteurs ne savent pas avancer le temps) : on garde l'amorce par **geste automatique** (une goutte, un éclair, une bulle).
- **Les merveilles.** *Risque : élevé.* Détection fragile, 120 textes, et des faux négatifs qui frustrent. **Reportées en V2**, et plafonnées à 2 par machine, uniquement si elles sont détectables par les réglages.
- **Les défis « Et si ».** *Risque : moyen.* Un défi qui rate enseigne le contraire. **Plancher de 20 défis validés**, choisis là où les trois listes se recoupent (Cymatiques, Ciel, Galaxie, Lampe à lave, Fourmilière, Monocorde, Chaufferette, Attracteur, Bulles, Murmuration, Feu en apesanteur, Quantique…).
- **Les icônes.** *Risque : sous-estimé par tout le monde.* Les 32 machines comptent environ 75 outils distincts. Il faut dessiner un jeu cohérent. On mutualise (observer, gomme, souffle, eau, semer) et on garde **toujours le verbe sous l'icône**, ce qui permet une icône simple.
- **Coupés ou reportés en V2** : dessins mystère, tours à montrer, histoires vraies, « Vrai ou légende ? », nom de tirage généré, Avant/Après, code de partage de dessin, sons d'interface, glossaire illustré, « À faire chez toi », gloses de tous les réglages du labo, défilement automatique, BRUITS. Ce sont de bonnes idées, mais elles passent après un cœur excellent.

---

## 4. La structure finale

### Les noms
**Application** (par ordre de préférence) :
1. **Phénoménal**. Le mot contient « phénomène », se dit « c'est phénoménal ! » et n'a rien de bébé.
2. **Fascinations Labo**. Il assure la continuité avec l'appli adulte et annonce le bac à sable.
3. **Et si… ?**. C'est le nom le plus juste pédagogiquement, mais le moins lisible sur une icône.

**Les éléments clés :**
- **Les gestes** : la barre d'outils.
- **Encore !** : le dé, qui donne la même machine avec un nouveau tirage.
- **Bidouiller** : le tiroir des leviers et des **recettes**.
- **Mode labo** : tous les vrais réglages, au fond de Bidouiller.
- **Pourquoi ?** : le tiroir des explications (étincelle, « Pourquoi », « Pour les curieux »).
- **Et si… ?** : le pari, puis la vérification.
- **Épingler** : garder ce moment dans le carnet.
- **Le Carnet** : photos, paris, épingles, machines visitées.
- **La Carte** et ses **7 mondes** : *Personne ne commande*, *La nature dessine*, *Imprévisible*, *Voir le son*, *Secrets de lumière*, *Ton cerveau se fait avoir*, *Aux limites du monde*.

### Les écrans
1. **La Machine** (90 % du temps), en plein écran. Neuf commandes permanentes, plus la barre des gestes, chacune à un emplacement fixe :
   - en haut : Carte, ‹ nom ›, son, et les scènes en pastilles-images juste dessous ;
   - en bas à gauche : pause et photo ;
   - en bas au centre : la barre des gestes ;
   - en bas à droite : Pourquoi ?, Bidouiller, Encore !
   La vitesse (3 crans), le mode Spectacle (plein écran, avec Psyché) et Recommencer (appui maintenu 1 s) passent dans Bidouiller.
2. **La Carte** : 7 mondes, 32 vignettes en vraies captures, avec un point « nouveau » sur les machines jamais ouvertes.
3. **Le Carnet** : une galerie chronologique, avec un filtre par monde.
4. **Coin des parents** (appui long sur le logo) : thème, photosensibilité, réduction des animations, effacement du carnet.

### Les cinq premières minutes d'Inès, 11 ans
- **0 s** : la Foudre, scène *Orage*, tirage « nuit de pluie, orage proche ». Un éclair tombe tout seul (c'est l'amorce). Le carton s'affiche : « La Foudre · Comment l'éclair choisit-il son chemin ? ».
- **5 s** : une main fantôme tapote le ciel au-dessus du geste *Éclair*. Inès tape. Un éclair, le tonnerre. Elle tape dix fois.
- **1 min** : elle choisit *Paratonnerre* (la main fantôme mime « pose »), plante une tige et appelle l'éclair à côté.
- **1 min 40** : une pastille « Et si… ? » apparaît : « Si l'orage s'éloigne, le tonnerre arrive plus tôt, plus tard, ou pareil ? ». Elle parie « pareil », pousse le levier *Distance*, compte, et se trompe. Le carnet note « Surpris ! » avec une phrase sur la vitesse du son.
- **2 min 30** : elle touche ›. C'est la Murmuration au crépuscule, avec le carton « Qui est le chef de la nuée ? ». Elle prend le geste *Faucon* et déchire la nuée.
- **3 min 30** : elle ouvre Bidouiller et touche la recette *Panique générale*. Elle pousse *Chacun pour soi* (Séparation) au maximum. La nuée explose et ne s'est **pas réinitialisée** quand elle a coupé le son pour que sa mère n'entende pas.
- **4 min 30** : elle prend une photo, puis appuie sur Pourquoi ? : « Aucun oiseau ne dirige. Chacun regarde 6 ou 7 voisins. » Elle ne lit pas plus loin, et c'est très bien.

### Sa dixième visite
- Elle ouvre l'appli sur un tirage neuf (le Cristal), évité parmi ses 5 dernières machines. Une pastille « Reprendre : le Sable » reste visible 8 secondes. Elle l'ignore.
- Elle va droit à la **Carte** : il reste 9 points « nouveau ». Elle choisit *Ton cerveau se fait avoir* et ouvre le Moiré pour la première fois.
- Elle passe directement en **Mode labo** dans le Feu, met la gravité à zéro et l'oxygène au maximum, puis **épingle** « ma flamme de l'espace ». Elle la montre à son frère depuis le **Carnet** avec « Refaire ».
- Elle a fait 14 « Et si » (6 « Bien vu ! », 8 « Surpris ! »). Elle lit pour la première fois un « Pour les curieux » entier, celui des Cymatiques, parce qu'elle a remarqué que le sable fuit les endroits qui vibrent. **La fascination a produit la question**, dans l'ordre demandé par Yoann.

---

## 5. Version 1 : le cœur (livré et excellent, dans cet ordre)

1. **Le socle sans réinitialisation** : son, thème, tiroirs, Spectacle et arrière-plan ne reconstruisent jamais la machine ; la rotation est gérée par recadrage CSS ; Recommencer et « Ajuster à l'écran » ne se déclenchent que sur demande explicite. Chacune des 32 machines est validée avec la liste de contrôle.
2. **Le hasard curé** : plages par scène, recettes et graines remarquables pondérées, file mélangée des 32 machines, ‹ qui restaure scène et réglages, Encore !, amorce par geste automatique. Planche-contact de vérification.
3. **L'écran Machine** : plein écran, 9 commandes fixes plus la barre des gestes avec icône et verbe, main fantôme (3 animations génériques : tapoter, glisser, maintenir), scènes en pastilles-images. Typographie Atkinson Hyperlegible, cibles de 56 px.
4. **Bidouiller** : 3 ou 4 leviers renommés par scène, avec une icône à chaque bout, des recettes, les boutons d'action spectaculaires remontés (« Éclair ! », « Le faucon attaque »), les révélations « maintiens pour voir », puis le Mode labo intact.
5. **Pourquoi ?** : titre-question, étincelle, « Pourquoi » (≤ 90 mots), « Essaie ça » par scène et « Pour les curieux » (texte existant). Relecture scientifique de Claire.
6. **La Carte en 7 mondes**, avec ses vignettes réelles.
7. **Et si… ?** : entre 20 et 32 défis, tous validés sur la machine.
8. **Le Carnet** : photos légendées automatiquement, paris, épingles avec « Refaire », machines visitées.
9. **Le coin des parents** et la sécurité : flashs adoucis, avertissements, réduction des animations.

## Version 2 : plus tard (dans cet ordre)

1. Les **merveilles** à dénicher (2 par machine au maximum, détectées par les réglages), rangées dans le Carnet.
2. Les **passerelles visibles** entre machines d'un même monde (le fil lumineux sur la Carte) et les **tours à montrer**.
3. Les **gloses** sous chaque réglage du Mode labo, et un glossaire illustré.
4. Le **comparateur Avant/Après** (deux photos et la variable modifiée).
5. Les **histoires vraies** et « Vrai ou légende ? ».
6. Les **dessins mystère** (Harmonographe, Lissajous, Turing, Cymatiques).
7. Les **noms de tirage générés**, et le code de partage d'un dessin.
8. Le **mode Spectacle enrichi** : défilement automatique et BRUITS d'ambiance.
9. Les **sons d'interface** et la vibration ; « À faire chez toi ».

> Mon dernier mot à l'atelier : si, dans six semaines, on ne peut livrer que les points 1 à 4 de la V1, **l'appli tient déjà sa promesse**. Si l'on livre la V2 sans les points 1 et 2, elle l'a trahie.
