# La nuit du 12 au 13/11 : synthèse pour Yoann

**▶ À ouvrir sur ta tablette : https://claude.ai/artifact/X3nwzJbLgt7zPvzXWmSbyR** (l'artefact « Fascinations », **version finale v38**, publiée le 14/11 vers 0 h 35, `app-unique`). Il est privé : toi seul peux l'ouvrir.

**État au 14/11, 0 h 35 (Paris)** : livraison arrêtée à ta demande, dans l'état actuel. La dernière version (v38) intègre ce qui était prêt chez rendu A et B **sans attendre une nouvelle recette de Constance** (consigne du CEO). La liste des points restants est plus bas.

**Machines refaites et intégrées** (toutes relues en science et mesurées sans déclin) :
- **Lucioles** et **Cristal** ;
- **Ciel**, **Bulles** et **Eau** (vers 13 h 30-13 h 50) ;
- **la Lampe à lave avec les volcans et la Terre en coupe** (question « Que se passe-t-il quand on chauffe par en dessous ? ») ;
- **la Danse des abeilles** (dans « Comment les insectes se parlent-ils ? »), vers 14 h.
- vers 15 h 10 (v31) : la **Lampe à lave** reprise (couleurs, départ en marche), les **Lucioles** au décor repris, les **Motifs de Turing** (thème sombre) et le **Mycélium** (combat et réseau ; les ronds de sorcières sont retirés du chemin le temps de leur reprise). La **Foudre** attend : l'attente entre les éclairs est encore jugée moche.
- vers 16 h (v32) : la **Lampe à lave** avec le Soleil entier (auréole, chromosphère, protubérances), les **Motifs de Turing** en thème clair (pigment sur papier), le **Mycélium** et les **Lucioles** repris. La **Foudre** attend encore, à peu près : des lueurs plus fortes et un nuage bleu-gris la feraient passer.
- vers 18 h 30 (v34) : la **Foudre** entre (orage, figure de Lichtenberg, globe à plasma ; « Au-dessus des orages » reste hors du chemin le temps de sa reprise), les **ronds de sorcières** reviennent, Lave et Turing retouchés.
- vers 19 h (v35) : la ligne d'état des machines n'est plus cachée par les boutons du bas ; le Soleil dit que la couronne ne se voit « à l'œil nu » qu'aux éclipses ; les ronds de sorcières en vue de drone, avec la vitesse de l'anneau corrigée (une vraie erreur de modèle).
- vers 19 h 10 (v36) : l'**Eau** revient à sa version d'origine. Pour Constance, la nouvelle mare au repos était moins belle qu'avant ; rendu B la reprend. Le Ciel reste, mais il est à reprendre (couchant gris, arc trop petit au téléphone).
- vers 20 h 15 (v37) : la **Fourmilière** entre, reprise par rendu B. Les ouvrières font environ 17 px sur un terrain d'environ 35 cm, les taches noires ont disparu, le pont se dresse sur téléphone, et le style réaliste est le plus fréquent. Sur un appareil trop lent (moins de 24 images/s), elle repasse d'elle-même à son ancien rendu 2D : à juger sur ta tablette, aucun test automatique ne le voit. Sur téléphone, le carton d'ouverture se pose sous le titre.
- vers 0 h 35 (v38, **finale**, sans recette) : le **Ciel** repris (couchant qui ne grisaille plus, arc lisible au téléphone, étoiles qui apparaissent avec la nuit, et une nouvelle scène, **les aurores polaires**, ouverte à l'œil nu sur une aurore forte), la **Fourmilière** lisible à 390 px, la **Foudre** avec « Au-dessus des orages » de retour dans le chemin (altitudes dilatées sous 20 km, annoncé à l'écran), les **ronds de sorcières** nets au téléphone et visibles sous la neige, le **Soleil** (étiquette et aide propres).


Session Fascinations, chef de projet et garant de la science. **Rien n'est sur `main` depuis la fusion de 0 h 40.** Tout est sur `jeunesse`, et l'application unique sur `app-unique` (voir `POUR-YOANN.md`). Le travail s'est arrêté de 1 h 46 à 5 h 10 (limite d'usage).

## À regarder en premier sur ta tablette (dans cet ordre)
1. **L'accueil.** Ouvre le lien ci-dessus. La Galaxie ou le Feu tourne derrière les tuiles. Choisis **6 ans** (les bougies), puis un signe, et regarde l'écran. Ensuite, dans la carte, ajoute un joueur **16 +** au niveau **Je connais déjà** : c'est l'ancienne version adulte. Compare les deux.
2. **Une question à plusieurs machines** : « Comment les insectes se parlent-ils ? ». Suis le chemin en bas : on passe des lucioles aux fourmis.
3. **Le fil « Pourquoi ? »** (en bas à gauche) : une phrase, puis « encore ».
4. **La main fantôme** : ne touche à rien pendant 20 secondes.
5. **Le niveau « Je connais déjà »**, avec le bouton Bidouiller : vrais noms, vraies valeurs, vitesse fine, Labo.

Questions à te poser :
- Est-ce qu'un enfant de 5 ans s'en sort seul ?
- Est-ce que l'adulte que tu es retrouve ce qu'il aimait ?

## Ce qui est fait
- **Sécurité** : l'ancienne clé de signature est retirée du dépôt, et le script refuse toute clé qui s'y trouve. Le workflow de signature est relu par Ruth. Son premier lancement attend ton approbation.
- **Fusion** de `jeunesse` dans `main` (avec ton accord). Depuis, `main` n'a pas bougé.
- **Âge et niveau** :
  - un accueil par l'âge, avec des bougies, puis un signe, puis le niveau (pas de question avant 9 ans) ;
  - plusieurs joueurs par tablette ;
  - l'âge n'est jamais affiché à l'enfant ;
  - police Andika pour les 5-9 ans et grosses cibles ;
  - lecture à voix haute quand l'appareil a une voix française ;
  - une phrase simple (`petit`) écrite pour chacune des 32 machines.
- **Refonte pédagogique** (`docs/REFONTE-PEDAGOGIQUE.md`) : les 32 machines passées au crible de « qu'est-ce qu'on y apprend ? ». Résultat : 24 grandes questions, des regroupements (insectes, réseaux du vivant, motifs, son, pendule), et des ajouts cadrés scientifiquement (volcans, aurores, système solaire, houle et tsunamis, bancs de poissons, danse des abeilles, double pendule).
- **Navigation** (avec Fausta) :
  - des questions, avec un chemin de chapitres selon le niveau ;
  - plus de colonnes : des boutons ronds dans les coins ;
  - le titre est la question ;
  - le fil « Pourquoi ? » ;
  - la carte des questions sans score.
  
  Les 7 retouches de Fausta sont appliquées.
- **Application unique** (`app-unique`) : l'adulte devient le niveau « Je connais déjà ». L'ancienne version reste constructible pour comparer.
- **Rendu** (brief `docs/RENDU-BRIEF.md`, deux relèves) :
  - la bibliothèque commune FKR est faite et relue ;
  - **Lucioles** et **Lampe à lave** sont refaites (rendu A, branche `rendu-a`) ;
  - Eau, Ciel, Fourmilière, Galaxie et Bulles sont en cours (rendu B, branches de travail).
  - Chaque livraison passe par ma relecture scientifique et par la recette « qualité ».

## Points restants (pour la reprise)
**À tester sur ta tablette** (aucun test automatique ne le voit) :
- le **repli 2D** de la Fourmilière et du Ciel quand l'appareil passe sous 24 images/s : à quel moment il bascule, et si c'est assez fluide ;
- le **Feu** en rendu logiciel, qui démarre en braises ;
- le **son**, jamais essayé sur un vrai appareil.

**Livré sans la recette de Constance** (v38) : le Ciel repris et les aurores, « Au-dessus des orages », la Fourmilière à 390 px, les ronds, le Soleil, le carton d'ouverture au téléphone.

**Jugé moche, ou pas vu, par Constance** :
- **Fourmilière** : les Trois sociétés (fourmis de 3 à 5 px) ; le repli 2D gris-brun, presque noir avec Renifle ; la jonction du double pont, où la branche courte paraît partir tout droit alors que le texte dit « même angle » (défaut de science, à corriger) ;
- **ronds de sorcières** au téléphone : anneaux encore doux ;
- **lignes d'état** longues (Soleil, 4 lignes à 390 px) : peut-être en partie cachées ;
- **Ciel** : zénith presque noir à −10° (en vrai, bleu sombre) ; herbe floue sous l'arc au téléphone ; dans les aurores, au téléphone, la ligne d'état chevauche les boutons du bas et la main fantôme montre un geste qui ne fait rien (vu par moi, pas par Constance).

**Pas intégré** :
- la **Galaxie** reprise (rectangle beige à 390 px, voile brun, elliptique en paliers) ;
- l'**Eau** v2 (revenue à l'originale) ;
- les scènes à créer : **système solaire**, **houle et tsunamis**, **bancs de poissons**, **double pendule**.

**Interface** : légendes techniques encore écrites à l'écran pour les 5 ans ; pause des chapitres précédents sans les détruire ; générateur de bruits à reporter ; gestes partis du bord de l'écran.

## Ce qui attend ta décision
1. **Garder l'application unique** (`app-unique`), ou revenir à deux applications.
2. **Valider la refonte pédagogique** (les regroupements et les ajouts).
3. **Lancer la première signature** de l'APK avec la nouvelle clé : ton approbation, puis désinstaller et réinstaller une fois sur la tablette.
