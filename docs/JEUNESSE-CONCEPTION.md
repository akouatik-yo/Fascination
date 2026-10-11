# Fascinations Labo : la version jeunesse (10-14 ans)

Synthèse du débat du 11 octobre 2026. Cinq personas ont fait une première proposition chacune :
- **Lina**, 12 ans ;
- **Claire Duval**, professeure de physique-chimie et de SVT au collège ;
- **Malik Benali**, designer d'applications tablettes pour enfants ;
- **Jonas Lefebvre**, game designer de jeux bac à sable ;
- **Sofia Marchetti**, médiatrice de musée scientifique.

Au deuxième tour, Lina et Claire ont réagi aux propositions des autres. Deux personas les ont rejointes : **Hugo Martin**, architecte logiciel, et **Nadia Roussel**, directrice de produit dans le rôle de l'avocate du diable. Les neuf textes complets (environ 24 000 mots) sont dans `docs/jeunesse-debat/`. Ce document en tire les décisions et tranche les désaccords.

## La promesse

> **On touche, c'est beau, ça réagit, et l'envie de comprendre vient après.**

C'est l'ordre demandé par Yoann : la fascination et le jeu d'abord, la science ensuite, comme une récompense et jamais comme un péage. Les 32 machines restent exactement les mêmes (aucun moteur n'est réécrit). Ce qui change, c'est tout ce qui les entoure : la structure, l'interface, les réglages, les textes, et le jeu qu'on y ajoute.

## Les décisions

### 1. Trois écrans, pas de menu
1. **La Machine**, 90 % du temps : en plein écran, la machine n'est jamais redimensionnée par l'interface, qui se pose par-dessus.
2. **La Carte** : les 32 machines en vignettes réelles, réparties en **7 mondes**. Ce sont les « fils rouges » de Sofia ; ils remplacent les 6 catégories, qui étaient un classement de spécialiste.
   - *Personne ne commande* : Murmuration, Lucioles, Fourmilière, Blob, Mycélium, Jeu de la vie.
   - *La nature dessine* : Turing, Spirales, Cristal, Sable, Lampe à lave, Fractales.
   - *Imprévisible* : Attracteur, Écoulement, Feu, Eau, Foudre.
   - *Voir le son* : Cymatiques, Spectre, Harpe, Pendules, Harmonographe.
   - *Secrets de lumière* : Couleurs du ciel, Bulles, Abysses, Kaléidoscope.
   - *Ton cerveau se fait avoir* : Illusions, Illusions sonores, Moiré.
   - *Aux limites du monde* : Quantique, Galaxie, Tunnel.

   *Désaccord tranché* : Lina voulait 6 îles, Nadia et Sofia 7 fils. On ne garde **qu'un seul classement** (la crainte de Lina, c'était d'avoir deux menus), et ce sont les 7 mondes : ils promettent une surprise, et chacun porte une idée qui voyage d'une machine à l'autre.
3. **Le Carnet** : les photos légendées automatiquement, les moments épinglés (avec « Refaire »), les paris « Et si… ? » et les machines visitées.

S'y ajoute le **coin des grands**, caché derrière un appui long sur le logo : thème, photosensibilité, animations, effacement du carnet.

### 2. L'écran Machine : des emplacements fixes, rien d'autre
```
┌──────────────────────────────────────────────────────────────────────┐
│ (Carte)          ‹   Le Feu   ›                     (son) (Hasard)   │
│                ( ● ○ ○ ○ ○ )  scènes en pastilles                    │
│                                                                      │
│                          LA MACHINE                                  │
│                                                                      │
│ (pause)(photo)    [geste][geste][geste][geste][geste]   (?)(Bidouiller)(Encore) │
└──────────────────────────────────────────────────────────────────────┘
```
- **La barre des gestes**, sous les pouces : une icône et un verbe pour chaque outil. Une **main fantôme** mime le geste la première fois qu'on le choisit. Les boutons d'action spectaculaires (« Éclair ! », « Le faucon attaque ») flottent à côté.
- **Bidouiller** (tiroir) contient :
  - 3 ou 4 **leviers** aux noms d'enfant, avec une icône à chaque bout ;
  - des **recettes** (« Tempête », « Presque étouffé ») ;
  - la vitesse en 3 crans, le mode Spectacle et **Recommencer** (appui maintenu, avec un anneau qui se remplit) ;
  - tout au fond, le **Labo** : *tous* les réglages d'origine, intacts, avec leur vrai nom. On simplifie sans rien retirer.
- **Pourquoi ?** (tiroir) déroule les explications en escalier, toujours à la demande :
  - la question ;
  - l'étincelle (une phrase) ;
  - le pourquoi (au plus 90 mots, un seul mot savant) ;
  - « Essaie ça » (une action à faire tout de suite) ;
  - « Pour les curieux » : le texte adulte existant.
- **Et si… ?** : une seule pastille discrète, qui n'apparaît qu'après un moment de jeu. On parie, avec « Aucune idée ! » comme choix légitime. Un bouton prépare la machine, on regarde, puis vient l'explication. **On récompense la surprise, jamais la bonne réponse** : « Surpris ! » vaut autant que « Bien vu ! ». Chaque défi est validé sur la vraie machine avant d'être publié (règle d'or de Claire).

### 3. Le hasard, bien conçu
- Au démarrage : une machine tirée dans un **sac**, qui ne revient pas sur les 5 dernières vues.
- À chaque arrivée dans une machine : une scène et des réglages tirés dans des **plages « toujours belles »** propres à chaque scène, ou parfois une **graine remarquable** écrite à la main, qui porte alors son nom (« Bougie dans une station spatiale »). Ces graines sont aussi les recettes : une seule structure sert aux deux.
- **‹** revient exactement en arrière : même machine, même scène, mêmes réglages. **›** donne une machine nouvelle avec un tirage frais. **Encore !** donne la même machine avec un autre tirage. **Épingler** garde le moment.
- *Désaccord tranché* : les noms de tirage générés automatiquement sont écartés, car en assemblant des fragments on fabrique des affirmations fausses (Claire). Seules les graines ont un nom, écrit et relu.

### 4. Ne jamais réinitialiser une machine sans qu'on le demande
- **Le son** ne recrée plus la machine (c'est déjà fait).
- **Le canevas** occupe toujours toute la fenêtre. Les tiroirs, le mode Spectacle et la carte se posent par-dessus.
- **Le régulateur de résolution** ne reconstruit une machine que si l'enfant n'y a pas encore touché. Sinon, il garde le palier pour la prochaine visite.
- **La rotation** suit une politique hybride. Si rien n'a été touché, ou si la machine n'a rien de construit à perdre, on la reconstruit à la nouvelle taille avec la même scène et les mêmes réglages. Sinon, l'image est mise à l'échelle sans rien perdre, et une pastille « Remplir l'écran » propose la reconstruction.

### 5. Les textes
La charte est celle de Claire, avec les plafonds de Sofia :
- tutoiement et présent, environ 15 mots par phrase ;
- le phénomène d'abord, le mot savant ensuite (un seul, en gras) ;
- aucun mot magique dans une explication, aucun anthropomorphisme non assumé ;
- on dit ce qui est simplifié et ce que les scientifiques ne savent pas encore ;
- le ton est celui d'un grand frère ou d'une grande sœur, pas celui d'un prof.

Les erreurs relevées pendant le débat ne doivent jamais apparaître :
- pas de feu sur la Lune, puisqu'il n'y a pas d'air ;
- la chaufferette chauffe, elle ne gèle pas ;
- l'oiseau isolé est la proie facile ;
- l'éclair ne « choisit » pas son chemin ;
- etc.

### 6. Le système visuel
- La police **Atkinson Hyperlegible**, en minuscules, embarquée.
- Des cibles d'au moins 56 px et un libellé sous chaque icône.
- Une couleur par monde, jamais seule porteuse d'information.
- Des tiroirs opaques à 85 % sans flou (le flou sur un canevas animé coûte cher sur tablette).
- Des icônes au trait arrondi : rigolotes, pas des icônes de bureau.

## Version 1 (dans cet ordre)
1. **Le socle** : plein écran, aucune réinitialisation involontaire (rotation et régulateur compris), pilotage des machines par leurs réglages (`ui()`), hasard à graine.
2. **Les 32 fiches** : scènes, plages de hasard, outils (icône et verbe), leviers renommés, recettes et graines.
3. **L'écran Machine** : barre des gestes, pastilles de scènes, Bidouiller et Labo, main fantôme.
4. **Pourquoi ?** : les textes jeunesse des 32 machines et des scènes, relus.
5. **La Carte** en 7 mondes, avec des vignettes générées automatiquement.
6. **Et si… ?** : une vingtaine de défis validés sur les machines.
7. **Le Carnet** : photos, épingles, paris, machines visitées.
8. **Le coin des grands**, la sécurité (flashs adoucis par défaut) et un APK jeunesse installable à côté de la version adulte.

## Version 2 (plus tard)
1. Les **merveilles** à dénicher (2 ou 3 par machine, détectées par les réglages), présentées comme des observations et non comme des trophées.
2. Les **passerelles lumineuses** sur la carte, quand la même loi est vraiment à l'œuvre dans deux machines.
3. Les **tours à montrer**.
4. Les **histoires vraies** et « Vrai ou légende ? ».
5. Le comparateur **avant / après**.
6. Les gloses sous chaque réglage du Labo.
7. Les dessins mystère.
8. Les sons d'interface.
9. « Rejouer le départ ».
