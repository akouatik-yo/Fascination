# Tour 1 — Malik Benali, designer UX/UI (tablettes enfants, bornes de musée)

> Ma conviction : **la machine est l'interface**. Tout ce qui n'est pas la machine doit se faire petit, rester toujours au même endroit, et se laisser trouver sans qu'on l'explique.

---

## 1. Diagnostic : ce que voit un enfant de 11 ans qui ouvre l'appli

J'ai regardé les captures APK (paysage 2560×1600, portrait 1600×2560) et le shell (`shell.js`).

**Une barre du haut qui ressemble à une console de mixage.** 13 contrôles côte à côte, tous en CAPITALES ESPACÉES en police à chasse fixe : `HASARD · SON OFF · BRUITS · ◐ AUTO · PSYCHÉ ON · VITESSE · PHOTO · PAUSE · ZEN · PANNEAU`. Pour un enfant (et encore plus pour un enfant dyslexique), les capitales en chasse fixe sont la forme de texte **la plus lente à lire** : tous les mots ont la même silhouette rectangulaire. Plusieurs mots ne veulent rien dire à 11 ans : *Psyché*, *Zen*, *Bruits* (des bruits de quoi ?), *Panneau*. « SON OFF » mélange deux langues. La molette VITESSE est un bel objet, mais elle demande un geste fin et affiche « ×0,063 ».

**Un rail de gauche qui est une liste de texte.** 32 noms, des accroches coupées par « … », six catégories abstraites (« Invisible » ? « Motifs » ?). Rien ne montre *à quoi ressemble* une machine. Or un enfant choisit avec les yeux, pas en lisant.

**Un panneau de droite qui commence par une dissertation.** Avant le premier bouton, il y a un paragraphe de 9 lignes (« hyphes », « substrat »…). Puis les outils : de simples mots (`SEMER · NOURRIR · TRACER · GRATTER · OMBRER · ARROSER`) sans icône, et une aide qui décrit trois scènes à la fois (« Combat : … Ronds : … Réseau : … »). Plus bas, des dizaines de curseurs savants : *Nombre de Reynolds, Ramification η, Mie, σ ρ β, Seuil (b), Raideur (ε), Facteur de Lorentz γ, Qualité du calcul*. L'adulte cultivé s'y régale ; l'enfant décroche.

**En portrait, c'est pire.** La barre prend deux lignes, le panneau est fermé : l'enfant voit un fond noir avec quatre étoiles (mycélium) et **aucune invitation à toucher**. Il ne sait pas qu'il y a des outils, ni lequel est actif.

**La machine n'occupe que 54 % de l'écran en paysage.** C'est le contenu le plus beau de l'appli, et c'est lui qui a le moins de place.

**Les réinitialisations sont pires que ce que décrit Yoann.** Dans le code, `toggleSound()` fait `disposeSim(); build()`, `toggleZen()` appelle `onResize()` qui fait aussi `disposeSim(); build()`, et **le moindre redimensionnement aussi : tourner la tablette efface le château de sable**. Aucune machine ne sait changer de taille sans être recréée. Sur une tablette tenue par un enfant, qui la tourne sans arrêt, c'est la première chose à corriger.

**Pas de retour sensoriel.** Choisir un outil ne fait ni son, ni vibration, ni rien sur la scène. Un enfant ne sait pas si son geste a été compris.

---

## 2. Une nouvelle architecture d'information

### Trois écrans, pas plus

1. **La Machine** (90 % du temps) : en plein écran, avec un habillage minimal.
2. **La Carte** : les 32 machines sous forme de vignettes en images, réparties sur 6 « îles » colorées. On y va pour choisir. Pas de liste de texte.
3. **Ma Collection** : les photos prises, les défis réussis, les machines découvertes (32 cases qui s'allument). C'est un carnet, rangé en local.

**Pas d'écran d'accueil qui bloque.** L'appli s'ouvre **directement sur une machine tirée au hasard**, scène et réglages tirés au hasard eux aussi. Le nom de la machine apparaît en grand pendant 2 secondes, puis glisse vers le haut et rapetisse. La fascination d'abord, comme le demande Yoann. Une seule bulle s'affiche alors à côté de la barre d'outils : « Touche l'écran ! ».

### L'écran Machine : 4 couches

```
 Couche 0  la scène, bord à bord, 100 % de l'écran, jamais redimensionnée par l'interface
 Couche 1  l'habillage permanent : 3 coins fixes et une barre de gestes (toujours là, en verre fumé)
 Couche 2  les tiroirs à la demande : « Bidouiller » (réglages + recettes) et « Comprendre » (explications)
 Couche 3  « Le labo du savant » : TOUS les réglages d'origine, intacts, au fond du tiroir Bidouiller
```

Les tiroirs **se posent par-dessus** la scène, en semi-transparence. Ils ne la poussent pas et ne la redimensionnent pas : la machine continue de tourner derrière, et l'enfant **voit l'effet de son curseur en direct**. C'est essentiel pour apprendre en manipulant.

### Paysage (tablette 16:10)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ (◉ Carte)       ‹    🜂 Le Feu · Feu de camp    ›            (🔊) (🎲 Hasard) │
│                 ( ○ ○ ● ○ ○ )  ← scènes en pastilles-images, + (✨ Surprise) │
│                                                                              │
│                                                                              │
│                             LA MACHINE                                       │
│                           (plein écran)                                      │
│                                                                              │
│                                                                              │
│ (⏸)(🐢▶🐇)(📷)                                         (❓ Comprendre)      │
│          ┌───────────────────────────────────────────────┐ (🎛 Bidouiller)   │
│          │ [👁 Regarder] [💨 Souffler] [🪵 Poser] [🧂 Sel] [💧 Eau] │  (⛶)  │
│          └───────────────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Haut gauche** : Carte. **Haut centre** : ‹ nom de la machine › et, juste en dessous, les scènes. **Haut droite** : son et hasard.
- **Bas centre** : la barre de gestes, dans la zone des pouces. Ce sont les outils : icône, verbe, et un liseré de couleur sur l'outil actif.
- **Bas gauche** : le temps (pause, vitesse en 3 crans) et la photo. **Bas droite** : Comprendre, Bidouiller, Spectacle (plein écran).
- Pas de geste de balayage pour changer de machine : la scène capte tous les doigts, et les bords d'écran appartiennent à Android. Les flèches restent des boutons.

### Portrait (tablette 10:16)

```
┌────────────────────────────────────┐
│ (◉)   ‹  🜂 Le Feu  ›   (🔊)(🎲)   │
│      ( ○ ○ ● ○ ○ ) (✨)            │
│                                    │
│                                    │
│            LA MACHINE              │
│                                    │
│                                    │
│                                    │
│                                    │
│ (⏸)(🐢▶🐇)(📷)      (❓)(🎛)(⛶)   │
│ ┌────────────────────────────────┐ │
│ │ [👁] [💨] [🪵] [🧂] [💧]       │ │
│ │ Regarder Souffler Poser Sel Eau│ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

Au-delà de 5 outils (le Blob en a 7, l'Eau 8), la barre défile latéralement et un petit « › » indique la suite.

### Le tiroir « Bidouiller » ouvert (paysage : à droite sur 34 % ; portrait : en bas, sur 45 % de la hauteur)

```
┌───────────────────────────────────────────────┬────────────────────────────┐
│                                               │ 🎛 BIDOUILLER         (×)  │
│                                               │                            │
│          la machine continue                  │ RECETTES                   │
│          de tourner ici                       │ [🌪 Tempête][😴 Braises]   │
│                                               │ [🔵 Flamme bleue][🎲]      │
│                                               │                            │
│                                               │ 🌬 Vent      peu ●━━━━ fort│
│                                               │ 🫁 Oxygène   peu ━━●━━ bcp │
│                                               │ 🍃 Gravité   0 ━━━━● Terre │
│                                               │                            │
│                                               │ [🔥 Raviver!] [🪵 Bûche]   │
│                                               │                            │
│                                               │ ▸ Le labo du savant (24)   │
└───────────────────────────────────────────────┴────────────────────────────┘
```

### La Carte

```
┌──────────────────────────────────────────────────────────────────────────┐
│ (×)  LA CARTE DES MACHINES            ● 14/32 découvertes   (🎲)        │
│                                                                          │
│  🟢 VIVANT            🟠 ÉLÉMENTS              🟣 MOTIFS                 │
│  [img][img][img]      [img][img][img][img]     [img][img][img][img]      │
│  [img][img][img][img] [img][img][img][img]     [img][img][img][img]      │
│                                                                          │
│  🔵 ESPACE            🩷 SONS                  🟡 L'INVISIBLE            │
│  [img][img][img][img] [img][img][img][img]     [img]                     │
└──────────────────────────────────────────────────────────────────────────┘
```

Chaque vignette (≥ 120 px) est une **capture réelle** de la machine (prise une fois, livrée en WebP), avec le nom en dessous. Une machine jamais visitée a un petit point « nouveau ». Les catégories sont renommées avec une icône, pour les rendre plus parlantes : *Vivant*, *Éléments*, *Motifs*, *Espace* (et non « Cosmos »), *Sons*, *L'invisible*. En portrait, les îles s'empilent et la page défile verticalement.

### Navigation et hasard

- **‹ ›** parcourent une **file mélangée** des 32 machines, comme une playlist en lecture aléatoire. **‹ ramène exactement à ce qu'on vient de voir** : même scène, mêmes réglages tirés. Quand la file est finie, on la remélange. Chaque arrivée sur une machine tire une scène et des réglages nouveaux.
- **🎲 Hasard** (en haut à droite) : une autre machine, n'importe laquelle.
- **✨ Surprise** (à côté des scènes) : la **même machine**, avec une autre scène ou d'autres réglages. C'est le bouton « encore ! ».
- Les tirages se font dans des **plages « toujours belles »** définies dans les métadonnées : on ne doit jamais tomber sur un écran vide ou sur une simulation qui explose.

---

## 3. Rendre compréhensibles des dizaines de curseurs savants

**Règle des 3 niveaux, scène par scène :**

| Niveau | Contenu | Visibilité |
|---|---|---|
| 1. Jouer | les gestes (outils) + 1 à 2 **boutons d'action** spectaculaires (« ⚡ Éclair ! », « 🦅 Le faucon attaque », « 🫧 Cinq bulles ») | toujours à l'écran |
| 2. Bidouiller | 3 ou 4 réglages renommés + 3 ou 4 **recettes** | tiroir |
| 3. Labo du savant | les réglages d'origine de `ui()`, rendus tels quels, avec le nom savant **et** une traduction | fond du tiroir |

Les **boutons d'action** sont ce qu'il y a de plus amusant dans le panneau actuel, mais ils y sont enterrés. Je les remonte près de la barre de gestes, sous forme de bulles flottantes et contextuelles. Elles ne s'affichent que pour la scène en cours.

**Types de contrôles :**

- **Gestes avec icône et verbe.** La première fois qu'on choisit un outil, une **main fantôme** semi-transparente mime le geste sur la scène pendant 1,5 s (tapoter, glisser, maintenir). C'est un onboarding sans tutoriel.
- **Curseurs illustrés.** Ils sont gros (poignée de 44 px, piste de 12 px) et ont une icône à chaque bout (🐢…🐇, petit flocon…gros flocon). **Aucun nombre au niveau 2** : la valeur savante apparaît en petit dans le labo.
- **Recettes.** Ce sont des cartes nommées qui règlent plusieurs paramètres à la fois : *Tempête*, *Calme plat*, *Chaos*, *Comme dans la nature*. Un enfant comprend « Tempête » bien avant « Charge du nuage 0,8 + Activité 0,9 ». Un 🎲 dans les recettes en tire une au hasard.
- **Maintenir pour comparer.** Certains interrupteurs révèlent quelque chose (*Révéler le trucage*, *Révéler la pénicilline*, *Montrer la piste*, *Pose longue*, *Lampe du plongeur*). Ils deviennent des boutons « 👁 maintiens pour voir » : on appuie, ça s'affiche ; on lâche, ça disparaît. C'est un avant/après immédiat, très parlant.
- **Jetons à bascule** pour les autres interrupteurs : une icône qui s'allume ou s'éteint, plutôt qu'une case à cocher.
- **Disparaissent de l'interface enfant** : *Qualité du calcul*, *Définition*, *Calcul par image*. Le régulateur automatique de résolution s'en charge déjà ; ces réglages restent dans le labo.

**Nommer les choses** (exemples de traductions, avec le nom savant gardé dans le labo) :

| Actuel | Niveau 2 |
|---|---|
| Nombre de Reynolds | Remous (calme → agité) |
| Couplage des synchrones | Envie de clignoter ensemble |
| Ramification η | Branches de l'éclair |
| Poussières et brume (Mie) | Brume |
| Facteur de Lorentz γ | (affiché comme « 99,9 % de la vitesse de la lumière ») |
| σ, ρ, β | Tourbillon · Énergie · Freinage |
| Seuil (b), Raideur (ε) | Facile à exciter · Vitesse de l'onde |
| Évaporation de la piste | La piste s'efface vite / lentement |
| Valeurs naturelles | 🌿 Comme dans la nature |

Les règles de nommage : 3 mots au maximum, un verbe ou un nom concret, pas de lettre grecque avant le labo, tutoiement.

**L'explication (tiroir ❓ Comprendre)** est découpée en **cartes à feuilleter**, jamais en un bloc de texte :
1. *Waouh* : une phrase et une question (« Pourquoi les lucioles finissent-elles par clignoter ensemble ? »).
2. *Essaie* : une action à faire **maintenant**, avec un bouton qui sélectionne l'outil ou la recette concernée.
3. *Ce qui se passe* : 3 ou 4 phrases courtes.
4. *Dans la vraie vie* : un lien avec le monde réel.
5. *Pour les curieux* : le texte savant actuel, dates et noms de savants compris.

---

## 4. Système visuel : sobre pour laisser briller les machines

- **Habillage** : du verre fumé sombre (fond noir à 55 %, flou de 12 px), avec des coins arrondis de 16 px. Il garde la même teinte quelle que soit la machine, car presque toutes les machines sont sombres. Le thème clair/sombre sort de la barre et va dans le coin des parents.
- **Typographie** : **Atkinson Hyperlegible** (licence OFL, embarquée hors ligne), conçue pour la faible vision, avec des lettres bien différenciées (I/l/1, b/d). On écrit en minuscules, sans capitales espacées ni chasse fixe. Tailles : libellés des boutons 16 px, corps de texte 18 px avec un interlignage de 1,5, titres 24 à 28 px, lignes de 60 caractères au maximum, texte aligné à gauche, jamais d'italique pour du texte long.
- **Cibles** : 56 px au minimum (64 px pour les gestes), 8 px d'écart entre deux cibles, rien d'important à moins de 24 px du bord.
- **Couleurs** : chaque catégorie a sa couleur d'accent, réservée à l'outil actif, au point de la scène en cours et à la Carte. **La couleur n'est jamais le seul signal** : l'outil actif a aussi un liseré et une icône pleine, pour les enfants daltoniens. Le contraste du texte est d'au moins 4,5:1 sur le verre.
- **Icônes** : un seul jeu en SVG, au trait arrondi de 2,5 px. **Toujours avec un libellé dessous** : un enfant ne devine pas ce que veut dire ⚙ ou ⛶. Pas d'emoji dans l'appli finale : ceux de mes schémas ne sont là que pour illustrer.
- **Animations** : de 180 à 300 ms, avec un ralentissement en fin de mouvement ; les tiroirs glissent, les boutons s'enfoncent légèrement quand on les touche. Si l'appareil demande de réduire les animations (`prefers-reduced-motion`), on se contente de fondus.
- **Photosensibilité** : les « flashs adoucis » de la Foudre sont **activés par défaut**. Au premier lancement, un avertissement doux s'affiche sur les scènes stroboscopiques (Hypnose dans les Illusions, Globe à plasma). Aucun élément d'interface ne clignote.
- **Son de l'interface** : des sons très discrets et « physiques » (un toc de bois quand on choisit un outil, un froissement quand un tiroir s'ouvre, un obturateur pour la photo), toujours plus faibles que la machine, et muets quand le son est coupé. Une **vibration** de 10 ms quand on choisit un outil ou qu'on prend une photo.
- **Ton** : tutoiement, phrases courtes, et des questions plutôt que des affirmations (« Et si tu soufflais dessus ? »).

---

## 5. Les comportements à garantir

1. **Une machine ne se réinitialise QUE sur demande.** Il faut en faire une règle technique, pas un vœu :
   - le son : on crée toujours le son de la machine et on coupe seulement son volume général. On ne recrée jamais la machine ;
   - le mode Spectacle (plein écran), les tiroirs, le décor et le thème : comme l'interface est posée par-dessus, la taille du canvas ne change jamais ;
   - **la rotation de la tablette** : c'est le cas le plus difficile, puisqu'aucun moteur ne sait se redimensionner. Je propose d'allouer d'emblée un canvas **carré, de la taille du plus grand côté de l'écran**, centré : en tournant la tablette, seule la partie visible change. Cela coûte environ 1,6 fois plus de pixels, ce que le régulateur peut compenser. L'autre option est un crochet `resize` optionnel pour les moteurs qui le permettent. **C'est à arbitrer avec le développeur** ;
   - le bouton **Recommencer** (dans Bidouiller, jamais dans la barre principale) se déclenche par un appui maintenu 1 s, avec un anneau qui se remplit. Pas de remise à zéro par erreur.
2. **Hasard au démarrage** : une machine tirée en évitant les 5 dernières vues, puis une scène et des réglages tirés dans les plages « belles ».
3. **Reprise** : au démarrage, une petite pastille « ↩ Reprendre : la Foudre » reste visible 8 s dans un coin. Le hasard reste la règle, mais on ne perd pas sa dernière machine, et ‹ y ramène aussi.
4. **Pause** : un gros bouton ⏸ qui gèle la scène. Les gestes restent possibles quand la machine le permet, et on peut photographier une scène figée. Pause automatique quand l'appli passe en arrière-plan.
5. **Vitesse** : 3 crans (🐢 ×¼, ▶ ×1, 🐇 ×4). La molette fine est conservée dans le labo.
6. **Spectacle** (l'ancien Zen) : tout disparaît sauf un bouton de sortie de 48 px, discret, dans un coin. Une option « défilement automatique » change de machine toutes les 2 minutes, pratique en salle de classe ou en vitrine. Le filtre PSYCHÉ et les BRUITS d'ambiance rejoignent ce mode, car ce sont des options de contemplation.
7. **Photo** : un flash blanc doux (une seule impulsion, pas de clignotement) et un son d'obturateur. La photo va dans **Ma collection**, d'où on peut l'exporter.
8. **Son** : un seul bouton haut-parleur. Les machines du groupe Sons s'ouvrent avec une grosse bulle « 👆 Touche pour entendre » plutôt qu'un bouton « Activer le son » perdu dans le panneau.
9. **Coin des parents** : un appui long de 2 s sur le logo ouvre le thème, la réduction des animations, la photosensibilité, l'effacement de la collection et la vitesse fine. C'est inaccessible par accident, mais rien n'est perdu.

---

## 6. Mon TOP 5

1. **La machine en plein écran, entourée d'un habillage minimal à emplacements fixes, et zéro réinitialisation involontaire, rotation comprise.** C'est la condition de tout le reste : sans elle, l'enfant perd ce qu'il a construit et cesse d'expérimenter.
2. **Une barre de gestes avec icônes et verbes dans la zone des pouces, plus une main fantôme qui montre le geste.** Les outils sont le vrai jeu ; aujourd'hui ils sont invisibles en portrait et illisibles en paysage.
3. **Le tiroir « Bidouiller » : 3 ou 4 réglages renommés, des recettes, des boutons « maintiens pour voir », et le labo du savant intact au fond.** On simplifie sans rien supprimer.
4. **Un hasard bien conçu** : file mélangée sans répétition, un ‹ qui revient exactement en arrière, ✨ Surprise dans la machine, tirages limités à des plages toujours belles.
5. **Un système visuel lisible et sûr** : Atkinson Hyperlegible en minuscules, un libellé sous chaque icône, des cibles de 56 px, une couleur jamais seule porteuse d'information, la photosensibilité activée par défaut, et des explications en cartes à feuilleter qui commencent par une question.
