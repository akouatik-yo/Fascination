# Rendu des machines : inventaire et référence

Rendu A (relève de Léa Nimation « Frame »), nuit du 12 au 13/11/2026, branche `rendu-a`.
Captures : Chromium sans écran, rendu logiciel SwiftShader, 1280 × 800, densité 1, mode zen, thème sombre (celui du Labo), 9 s après l'ouverture. **Le rendu logiciel est plus lent et plus grossier qu'une vraie carte graphique** : les captures servent à juger la direction artistique, pas la finesse.

## 1. Pourquoi le Feu est beau

Le Feu est la référence de qualité. Sa beauté ne vient pas du nombre de particules, mais d'une chaîne de lumière complète, celle d'un photographe :

1. **Lumière linéaire, en flottants (HDR)**. Tout est calculé en énergie lumineuse (cibles RGBA16F), sans plafond à 1. Le blanc du cœur de flamme n'est pas une couleur peinte : c'est de la lumière trop forte pour l'œil.
2. **Couleur physique**. La suie suit la loi de Planck, intégrée sur les fonctions CIE 1931 (table de 256 températures). Le dégradé rouge sombre → orange → jaune → blanc est juste, donc il est beau. S'y ajoutent le bleu de CH*/C₂* et les raies des sels.
3. **Courbe filmique (ACES)**. Les hautes lumières saturent vers le blanc avec douceur, comme sur une pellicule, au lieu de s'écraser en aplats.
4. **Halo à trois échelles**. Émission à demi-résolution, puis trois flous gaussiens en cascade (1/4, 1/8, 1/16). C'est la diffusion de l'œil et de l'objectif : elle dit « c'est lumineux » mieux que n'importe quelle couleur.
5. **La lumière éclaire le décor**. Le décor est peint en 2D, ramené en linéaire (γ 2,2), puis multiplié par la lumière du feu : 16 sources ponctuelles et le halo lui-même. Ambiance très sombre (0,05) : le contraste vient du sujet.
6. **Net sur flou**. Les étincelles sont tracées deux fois : une fois dans l'émission (elles nourrissent le halo), une fois nettes en pleine résolution par-dessus. Le détail fin posé sur la lueur large donne la profondeur.
7. **Mouvement organique à plusieurs échelles**. Fluide (Stam), confinement de vorticité, bruit à rotationnel, et un léger gauchissement du domaine à l'affichage (`uWob`). Les braises respirent (Voronoï + bruit lent).
8. **Matière**. Écorces et charbon procéduraux, grain peint sur le décor, et un tramage de ±½/255 en sortie qui supprime les bandes dans les dégradés sombres.

**Ce qu'il faut reproduire** : sujet émissif en HDR, couleur issue de la physique, halo multi-échelle, courbe filmique, décor éclairé par le sujet, net sur flou, tramage. **Ce qu'il ne faut pas copier** : le coût (fluide 165 × 91 + 26 itérations de Jacobi en qualité haute). Une machine peut être aussi belle avec un modèle plus léger, si sa lumière est juste.

## 2. Inventaire (31 machines)

Moteur : **GL-HDR** = WebGL2 en flottants + halo + ACES (la chaîne du Feu) · **GL-ACES** = WebGL2 + ACES, sans halo · **GL** = WebGL2, couleurs calculées directement entre 0 et 1, sans halo ni courbe · **2D** = canevas 2D (halo par sprites et mode `lighter` quand il y en a).

| id | Machine | Cat. | Moteur | Diagnostic visuel (captures du 13/11, 0 h 40) |
|---|---|---|---|---|
| `feu` | Le Feu | Éléments | GL-HDR | Référence. En rendu logiciel, flammes un peu crénelées (émission à demi-résolution). |
| `eau` | L'Eau | Éléments | GL-ACES | Physique riche (caustiques, réfraction), mais image plate : vert uniforme, nénuphars en aplat, pas de profondeur ni de ciel reflété. |
| `fluide` | L'Écoulement | Éléments | GL-ACES | En sombre : traînées néon lisibles mais pointillées (lignes d'émission visibles), obstacle gris plat. En clair : presque vide. |
| `sable` | Le Sable | Éléments | GL-ACES (3D) + 2D | Relief 3D rose-orangé délavé, peu de détail, ciel en aplat. Loin de la lumière rasante d'un désert. |
| `foudre` | La Foudre | Éléments | GL (ciel) + 2D (éclair) | Noir entre deux éclairs : l'attente est vide. À juger au moment du coup. |
| `cristal` | Le Cristal | Éléments | GL | Disques bleus concentriques et petit flocon : décor schématique, le cristal ne capte pas la lumière. |
| `ciel` | Les Couleurs du ciel | Éléments | GL (exposition auto) + 2D | Physique de diffusion juste ; paysage en silhouettes plates. |
| `galaxie` | La Galaxie | Cosmos | GL-HDR | Correcte ; c'est le sujet « Hubble » par excellence et il peut aller plus loin (poussière, nébuleuses H II, couleurs des populations). |
| `tunnel` | Le Tunnel | Cosmos | GL-HDR | Au départ (γ ≈ 1), presque noir : poussière d'étoiles grise, rien n'accroche l'œil avant d'accélérer. |
| `lave` | La Lampe à lave | Cosmos | GL | Le plus « clip-art » : fond violet en anneaux de dégradé (bandes visibles), lampe en aplats, cire sans lumière interne ni réfraction du verre. |
| `bulles` | Les Bulles | Cosmos | GL | Irisations justes, mais fond gris-vert flou sans sujet, reflets de fenêtre en carrés durs : les bulles flottent dans le vide. |
| `meduses` | Les Abysses | Vivant | GL-HDR | Bonne base (vraie 3D, halo) ; une bande sombre et crénelée en haut de l'image à vérifier (rendu logiciel ?). |
| `blob` | Le Blob | Vivant | 2D | Lisible et chaleureux ; plat (pas de relief du plasmode ni de gel translucide), fond brun sale. |
| `lucioles` | Les Lucioles | Vivant | 2D | Nuit plate, lucioles minuscules sans halo réel, arbre et herbes en découpe noire. Rien de la magie des photos de lucioles en pose longue. |
| `boids` | La Murmuration | Vivant | 2D | Coucher de soleil en bandes visibles (dégradé 8 bits), oiseaux en points ; la silhouette des roseaux fonctionne. |
| `fourmis` | La Fourmilière | Vivant | 2D | Style néon : cercles et halos épars sur fond nuit quadrillé ; schématique, peu de matière. |
| `mycelium` | Le Mycélium | Vivant | 2D | Fond brun flou, colonies petites et ternes ; ni lumière ni texture d'hyphes. |
| `vie` | Le Jeu de la vie | Vivant | GL | Sombre : petits carrés cyan épars. Clair : points noirs sur crème. Le plus austère de tous. |
| `attracteur` | L'Attracteur | Motifs | GL (points additifs) | Nuage de points orange-violet agréable ; pourrait devenir une pose longue lumineuse (halo, densité HDR). |
| `chladni` | Les Cymatiques | Motifs | GL (grains) + 2D | Carré de bruit beige (les grains n'ont pas encore migré) : à l'arrivée, l'image est du bruit. |
| `fractal` | Les Fractales | Motifs | GL + 2D | Mandelbrot en aplat violet sur fond clair, sans relief ni lumière (l'estimation de distance existe pourtant). |
| `harmono` | L'Harmonographe | Motifs | 2D | Trait fin sur papier crème : juste pour un dessin à la plume. À laisser, ou seulement soigner le papier. |
| `illusions` | Les Illusions | Motifs | 2D (+ GL spirale) | **Ne pas embellir** : une illusion dépend de luminances et de géométries exactes. |
| `kaleido` | Le Kaléidoscope | Motifs | GL (repli) + 2D | Aplats saturés et billes en dégradé « bureautique » : couleurs criardes, pas de verre ni de transparence. |
| `moire` | Le Moiré | Motifs | GL | **Ne pas embellir** : le phénomène, ce sont les traits nets eux-mêmes. |
| `rd` | Les Motifs de Turing | Motifs | GL | Taches orangées « en plastique » brillant sur gris : effet pâte à modeler plutôt que pelage ou pigment. |
| `spirales` | Les Spirales | Motifs | GL | Disque orange plat avec deux barres bleues (état initial) : aucune profondeur de boîte de Petri, aucun front lumineux. |
| `harpe` | La Harpe | Sons | 2D | Schéma propre sur crème. Hors priorité (machine sonore). |
| `pendules` | Les Pendules | Sons | 2D | Sphères en dégradé sur fond crème, correct. Hors priorité. |
| `sonillus` | Les Illusions sonores | Sons | 2D | Diagrammes sur crème. Hors priorité (illusions sonores). |
| `viz` | Le Spectre | Sons | 2D | Vide tant que le son est coupé. Hors priorité. |
| `quantique` | Le Monde quantique | Invisible | GL | Bandes noires et vertes sur blanc : |ψ|² sans lumière ni phase en couleur. Le sujet le plus « Hubble » des invisibles, et le plus pauvre visuellement. |

Défauts qui reviennent partout : **bandes dans les dégradés sombres** (Lave, Ciel, Murmuration : dégradés 8 bits sans tramage), **aplats sans lumière** (aucune source ne fait vivre la matière), **pas de halo** hors des quatre machines GL-HDR, **état de départ vide** (Tunnel, Cymatiques, Spirales, Foudre).

## 3. Priorités proposées (à arbitrer par Kurt)

- **P1, les plus « moches » à l'arrivée** : Lucioles (machine d'accueil de l'app adulte, donc la plus vue), Lampe à lave, Jeu de la vie, Cristal, Cymatiques, Spirales, Turing, Monde quantique, Sable 3D, Eau, Mycélium, Tunnel.
- **P2, bonnes bases à pousser** : Galaxie (le sujet Hubble), Attracteur, Abysses, Écoulement, Bulles, Kaléidoscope, Fractales, Blob, Fourmilière, Murmuration et Ciel (bandes), Foudre (attente vide).
- **Hors champ** : Feu (référence) ; Illusions et Moiré (l'exactitude est le sujet) ; Harpe, Pendules, Illusions sonores, Spectre, Harmonographe (schémas sonores ou dessin à la plume : finition seulement).

## 4. Outil commun : la cabine de projection (`app/js/fkcabine.js`)

> **Mise à jour du 13/11, 5 h 30** : une seule bibliothèque commune, FKR (`app/js/fkrendu.js`, propriété de rendu B, décision du CEO). La cabine y est portée à l'identique sous le même nom, `FKGL.cabine` ; `fkcabine.js` est retiré de `rendu-a`. Ce qui suit décrit la cabine telle qu'elle a été écrite.

Pour que toutes les machines refaites partagent la même « pellicule » que le Feu. Une machine WebGL2 dessine sa scène en lumière linéaire dans `cab.scene`, puis `cab.finish({...})` fait le reste :

- halo à 6 échelles, filtre double de Bjørge (2015), pensé pour les GPU mobiles : environ le coût d'une passe plein écran à demi-résolution ;
- seuil doux réglable (`thr`, `knee`) : seule la vraie lumière déborde, pas les surfaces éclairées ;
- exposition, teinte (`tint`), saturation, contraste ;
- courbe filmique : ACES comme le Feu, ou AgX (`tone: 'agx'`), qui blanchit les néons saturés sans virer de teinte ;
- vignettage naturel cos⁴, grain argentique dosé selon la luminance, tramage triangulaire ±1/255 (fin des bandes) ;
- mode encre pour le thème clair sans décor (`ink: true`), sur le principe de celui du Feu.

Testée en rendu logiciel (page d'essai : 6 sources HDR, ACES et AgX). Chargée après `fkgl.js` dans `app/index.html`, `jeunesse/index.html` et `app/sw.js`. Elle ne change rien aux machines qui ne l'appellent pas.
