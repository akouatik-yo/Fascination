# Rendu B : point de reprise

Dernière mise à jour : 14/11/2026 vers 0 h 35, heure de Paris. **Chantier à l'arrêt** sur demande de Yoann (relayée par le CEO) : on termine ce qui était en cours, on n'itère plus, usage raisonné des ressources. Aucun agent ne tourne.

Rendu B, c'est la relève B du chantier de rendu, Léa « Frame », branche `rendu-b`. À relire ensemble :
- le brief de Kurt, `docs/RENDU-BRIEF.md` ;
- la refonte pédagogique, `docs/REFONTE-PEDAGOGIQUE.md` ;
- la direction artistique de Fausta, `design/fascinations/DA-rendu.md` sur la branche `design` du dépôt Lbxp ;
- la bibliothèque commune, `docs/RENDU-COMMUN.md` ;
- les recettes de Constance (dépôt Lbxp, dossier `qualite/recettes/`) : `2026-11-13-fascinations-rendu-B.md`, `…-galaxie.md`, `…-fourmiliere-recontrole.md`.

## Fait, sur `rendu-b`

- **FKR, la bibliothèque commune** (`app/js/fkrendu.js`), propriété de rendu B, relue par Kurt :
  - 1.0 `f8e8704`, 1.1 `276bc8e`, 1.2 `a87f5e0`, `c09d4ac` (l'échelle du son est une convention) ;
  - 1.3 `0ca5857` : `FKR.veille`, le repli automatique selon la cadence réelle.
- **Outils** : `tools/test-rendu.mjs`, `tools/demo-rendu.html`, `tools/avant-apres.mjs` (planches à 3, 15 et 30 s, i/s sur une fenêtre de 2 s, charge de l'hôte). Copie de référence pour les planches « avant » : `git worktree add /home/user/fasc-avant 93ac705 --detach`.

| Machine | Hash sur `rendu-b` | État |
|---|---|---|
| Bulles | `82260f8` | intégrées ; Kurt : elles restent dans l'artefact |
| Ciel et aurores | `bc7b9ff` (fusion de `rendu-b-encours-ciel-recette`) | recette traitée : couchant hors de l'épaule d'AgX, arc entier à 390 px, étoiles sous −6°/−18°, légende d'altitude et lignes d'état lisibles à 390 px, neige bleutée, aurore forte à l'œil nu par défaut ; `FKR.veille` |
| Fourmilière | `5340f50`, `955ced5` (planches), `4c3036b`, `7201aa3` | fourmis de 17 px sur environ 35 cm, taches noires corrigées (bug d'ombre), pont debout à 390 px, découverte lisible à 390 px, « 3 à 5 mm » ; `FKR.veille` vers le rendu 2D. Kurt l'a intégrée et publiée |
| Galaxie | `8b81836` | science validée par Kurt ; **n'entre pas encore** (recette de Constance, avis du CEO) : voir la liste ci-dessous |
| Eau | `e328a84` | la mare au repos redevient lumineuse (travail de l'agent, interrompu à 20 h 08 par la limite d'usage ; tests passés à l'intégration) ; la houle et les tsunamis sont dans le fichier, **non relus** |

Points de reprise poussés (le proxy git refuse de supprimer les branches) : `rendu-b-encours-ciel-recette` (`d101c28`, intégré), `rendu-b-encours-galaxie-veille` (`cb56a3d`, non vérifié, non intégré), et les anciens `rendu-b-encours-*`.

## Ce qui reste à faire

**Galaxie** (décision de Kurt : pas dans l'artefact tant que ce n'est pas corrigé ; recette de Constance, avis du CEO) :
1. Un rectangle beige à bords droits au centre de la spirale à 390 px, qui devient une « boîte » vue par la tranche. Il vient de la composition de la lumière diffuse en demi-résolution (`s-galaxie.js`, l. 121-133 et 529-532) : cadre, viewport ou arrondi de la cible quand la largeur est petite. À vérifier aussi sur un vrai GPU.
2. Le voile brun sur tout le disque (CEO), à remplacer par le rendu des photos Hubble (M51, M74) : bulbe jaune-orangé, bras bleutés nets bordés de bandes de poussière fines et sombres sur leur bord intérieur, perles roses (régions H II), disque extérieur bleu pâle.
3. L'elliptique : une nappe beige à cœur en escalier, à remplacer par un profil de Sérsic ou de de Vaucouleurs, sans paliers.
4. En option : le mode « par vitesse » qui vire au kaki ; l'anneau de la Roue de chariot absent à t8 (à voir sur tablette).
5. `FKR.veille` : un brouillon non vérifié existe sur `rendu-b-encours-galaxie-veille` (`cb56a3d`).

**Fourmilière** (le prochain lot, d'après Kurt) :
6. L'embranchement du pont doit être un vrai « Y » : les deux branches à ±30° sur 2 à 3 longueurs de fourmi, aux deux embranchements, avec un rapport des longueurs autour de 2, en portrait comme en paysage. Vérifier aussi qu'il n'y a pas de biais de direction à l'embranchement : le choix doit dépendre de la phéromone et du hasard, rien d'autre.
7. Les Trois sociétés : appliquer le même traitement d'échelle que la découverte (les fourmis font 3 à 5 px), sans perdre la vue d'ensemble des trois espèces.
8. Le repli 2D : il est gris-brun et brouillé, presque noir avec Renifle. Il doit rester lisible, puisque c'est ce que verra une tablette lente.
9. Le Néon : le sol est brun boue tant qu'aucune piste n'est tracée, et le pont est kaki sombre.
10. Des planches pour ces cas : Néon, Sociétés, repli forcé à la main (la veille est coupée sous automate).

**Eau** :
11. La houle et les tsunamis : à relire (science et rendu) puis à mettre dans la fiche (Kurt), ou bien à masquer dans le Labo.
12. La cadence de la mare baisse avec le temps, avant comme après (8 → 1 i/s sans GPU) : à mesurer sur tablette. `FKR.veille` n'est pas branché.

**Ciel** :
13. À 390 px, l'herbe du premier plan sous l'arc est floue.
14. Les doutes de science, à faire relire par Kurt :
    - à −10°, le zénith devient presque noir ;
    - les seuils d'apparition des étoiles sont stylisés ;
    - la couleur à l'œil nu suit une courbe mésopique stylisée ;
    - en pose longue, la neige reçoit deux fois plus de lumière.
15. La scène des aurores est à ajouter dans la fiche du Ciel (Kurt). Ses chemins de réglages : `scenes/les aurores polaires` et `les aurores polaires/{vision, intensite de l aurore, regard, paysage}`.

**Commun** :
16. `FKR.veille` n'est pas branché sur les Bulles ni sur l'Eau.
17. FKR ne sait pas changer la résolution de sa cabine à chaud. Ce serait le repli générique des machines qui n'ont pas de rendu 2D.

**Contenu nouveau, pas commencé** : le système solaire (Galaxie) ; le Tunnel (porte des étoiles et tunnel des démos étiquetés « fiction », trou de ver « hypothétique ») ; la vague 2 (Murmuration avec les bancs de poissons, Sable, Harpe, Spectre, Cymatiques) ; la vague 3 (Kaléidoscope, Jeu de la vie, Attracteur, Fractales). Harpe, Spectre et Cymatiques affichent l'échelle commune du son comme une convention. Le Blob et les Spirales sont à rendu A.

## Pour reprendre une machine

1. Partir de `rendu-b`, ou du point de reprise `rendu-b-encours-<machine>`.
2. Lire `git log`, puis le diff de `app/js/machines/s-*.js`.
3. Lancer les tests : `node tools/test-fiches.mjs <id>`, `node tools/test-jeunesse.mjs` (8/8 attendus), `node tools/smoke.mjs`.
4. Faire la planche : `node tools/avant-apres.mjs <id> <scène> --secondes=3,15,30`. Ajouter des captures à 390 × 844.
5. Envoyer le rapport de 5 lignes au CEO et le hash à Kurt.

**Règle de vitesse** (Kurt, brief 89f61bf) : pas de déclin, et au moins la moitié des i/s de l'original sous la même charge.

## Contraintes

- **Agents** : 2 au plus (CEO). La limite d'usage vaut pour tout le compte, sur 5 heures ; elle a arrêté les agents vers 20 h 10 le 13/11.
- **Dépôt public** : aucun secret. Pas de fusion sur `main`, pas de workflow de signature ni de publication.
