# La nuit du 12 au 13/11 : synthèse pour Yoann

**▶ À ouvrir sur ta tablette : https://claude.ai/artifact/X3nwzJbLgt7zPvzXWmSbyR** (l'artefact « Fascinations », mis à jour le 13/11 vers 13 h 10 avec l'application unique, commit 62dea1c). Il est privé : toi seul peux l'ouvrir.

**État à 13 h (Paris)** : le travail s'est arrêté deux fois sur la limite d'usage, de 1 h 46 à 5 h 10 puis de 7 h 31 à 13 h. L'artefact prévu à 7 h 45 n'est donc publié qu'à 13 h 10.
- **La recette de Constance** (le regard d'un enfant de 5 ans) dit « pas moche » pour tous les écrans sur tablette. Au téléphone, ses derniers retours sont corrigés.
- **Deux points restent ouverts** :
  - certaines machines écrivent encore à l'écran des légendes techniques (en petites capitales monospace), même pour les 5 ans ;
  - en rendu logiciel, le Feu démarre en braises. À vérifier sur ta tablette.

**Machines refaites et intégrées** (toutes relues en science et mesurées sans déclin) :
- **Lucioles** et **Cristal** ;
- **Ciel**, **Bulles** et **Eau** (vers 13 h 30-13 h 50) ;
- **la Lampe à lave avec les volcans et la Terre en coupe** (question « Que se passe-t-il quand on chauffe par en dessous ? ») ;
- **la Danse des abeilles** (dans « Comment les insectes se parlent-ils ? »), vers 14 h.
- vers 15 h 10 (v31) : la **Lampe à lave** reprise (couleurs, départ en marche), les **Lucioles** au décor repris, les **Motifs de Turing** (thème sombre) et le **Mycélium** (combat et réseau ; les ronds de sorcières sont retirés du chemin le temps de leur reprise). La **Foudre** attend : l'attente entre les éclairs est encore jugée moche.
- vers 16 h (v32) : la **Lampe à lave** avec le Soleil entier (auréole, chromosphère, protubérances), les **Motifs de Turing** en thème clair (pigment sur papier), le **Mycélium** et les **Lucioles** repris. La **Foudre** attend encore, à peu près : des lueurs plus fortes et un nuage bleu-gris la feraient passer.


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

## Ce qui reste
- **Rendu** : rien n'est encore intégré à `jeunesse` ni à `app-unique`. Les machines refaites vivent sur `rendu-a` et `rendu-b` et viendront après relecture. Corrections demandées :
  - **Lucioles** : vraies couleurs (toutes jaune-vert ; les espèces se reconnaissent au rythme) et protection photosensibilité ;
  - **Lave** : la plaque de Bénard ne rougeoie pas (il faudrait environ 500 °C), et la teinte du Soleil doit être dite « filtre » à l'écran.
- **À créer** :
  - les nouvelles scènes : danse des abeilles, volcans, aurores, système solaire, houle ;
  - les fiches qui vont avec (je les écris dès que les scènes existent).
- **Interface** :
  - la pause des chapitres précédents sans les détruire (aujourd'hui, les réglages sont gardés, pas les constructions) ;
  - le générateur de bruits, à reporter dans l'application unique ;
  - l'audit des gestes partis du bord de l'écran.
- **Recette de Constance** avant toute arrivée sur `main`.
- **Jamais essayé sur un vrai appareil, ni avec le son.** C'est pour ça que ton regard sur la tablette compte d'abord.

## Ce qui attend ta décision
1. **Garder l'application unique** (`app-unique`), ou revenir à deux applications.
2. **Valider la refonte pédagogique** (les regroupements et les ajouts).
3. **Lancer la première signature** de l'APK avec la nouvelle clé : ton approbation, puis désinstaller et réinstaller une fois sur la tablette.
