# Le rendu commun (FKR)

`app/js/fkrendu.js` expose `window.FKR`, la bibliothèque de rendu partagée par les branches de reprise visuelle (`rendu-a`, `rendu-b`). Elle généralise ce qui rend le Feu beau, pour que toutes les machines parlent la même langue visuelle.

- **Une seule bibliothèque**, par décision du CEO (13/11, 0 h 55) : FKR. Rendu B en est propriétaire ; pour une demande, s'adresser à elle.
- **Sources de couleur** : relues et validées par Kurt (13/11). Le rapport Hα/Hβ ≈ 4 de la palette « nébuleuse » est un rougissement par la poussière, choisi pour le réalisme ; la valeur intrinsèque est 2,86 (cas B).
- **Réglages par défaut** : ceux de la direction artistique de Fausta (`design/fascinations/DA-rendu.md`, dépôt Lbxp, 059035f) :
  - AgX ;
  - halo à seuil 1,0 et d'intensité 0,06 ;
  - fond `#05060A` ;
  - grain animé de 2 à 3 % ;
  - coins assombris d'environ 25 %.
- **La cabine de rendu A** (`fkcabine.js`, 79f63a2) est portée à l'identique : `FKGL.cabine(K, opt)` a la même API et les mêmes calculs. Une machine qui l'utilisait peut charger `fkrendu.js` à la place, sans rien changer.

- **Banc d'essai** : `tools/demo-rendu.html` (scènes `#nebuleuse`, `#lucioles`, `#spectres`, `#traits`, `#matiere`).
- **Test** : `node tools/test-rendu.mjs` vérifie dix couleurs physiques, puis rend chaque scène dans Chromium sans écran. Les captures vont dans `tools/out/rendu/`.
- **Captures de référence** : `docs/rendu/fkr-*.jpg`.
- **Chargement** : après `fkgl.js`, dans `app/index.html`, `jeunesse/index.html` et `app/sw.js`.

## Pourquoi le Feu est beau

Le Feu (`s-feu.js`) ne dessine pas des flammes, il calcule de la lumière :

1. **L'émission est en HDR linéaire.** Une flamme vaut 3 ou 10, pas 255.
2. **La couleur vient de la physique.** Elle est donnée par la loi de Planck × CIE 1931 pour la suie, par les raies pour les sels.
3. **Le halo est pyramidal.** Trois flous de plus en plus larges : ce qui brille bave, et d'autant plus que c'est fort.
4. **Le décor est éclairé par le feu.** Les briques ne sont orange qu'à côté de la flamme : `couleur = albédo × (ambiant + lumière floutée)`.
5. **La courbe est filmique (ACES).** Les cœurs passent du jaune au blanc sans jamais saturer en aplat.
6. **Les détails sont organiques.** Bruit fractal, cellules de Voronoï pour les braises, ondulation de l'air chaud, étincelles en traînées.
7. **La finition est soignée.** Le tramage supprime les bandes ; le fond est sombre mais jamais `#000`.

Les autres machines sont souvent « moches » pour les raisons inverses : aplats saturés en sRGB, points durs, pas de halo, pas de lumière sur le décor, fond plat. Pourtant, la Galaxie a un halo et ACES. Ce qui lui manque, ce sont des **couleurs physiques bien exposées** : des étoiles en corps noir normalisé, des raies pour les nébuleuses, une poussière qui rougit, et une exposition plus basse qui laisse des noirs.

## Le langage visuel commun (règles techniques)

La direction artistique de Fausta prime. Ces règles décrivent seulement ce que garantit la bibliothèque.

1. **La lumière est calculée, pas peinte.** Chaque source a un spectre : `FKR.couleur` (corps noir, raies, bandes) ou une `FKR.palette`. On travaille en sRGB **linéaire**, et le passage en sRGB affichable ne se fait qu'au tirage.
2. **Le vide n'est jamais noir pur.** Le fond par défaut est un noir bleuté, proche du thème `#05050a`.
3. **Tout ce qui brille bave un peu.** Le halo n'a pas de seuil : il est proportionnel à l'énergie, comme la diffusion dans l'œil ou dans l'objectif.
4. **Les très fortes lumières pâlissent vers le blanc.** C'est le cas du cœur d'une étoile, d'un éclair ou d'une flamme. En dessous, la teinte est conservée : une lumière rouge vive reste rouge.
5. **Les lumières éclairent leur décor.** Il suffit de régler `eclairage` (voir plus bas).
6. **Pas de disque dur.** Un point lumineux a un profil gaussien ou de Moffat (le profil des étoiles photographiées). Un objet rapide laisse une traînée, comme sur une photo à pose longue.
7. **Les couleurs suivent la science.** Une étoile a la couleur de sa température. Une nébuleuse a celle de ses raies, rougie par la poussière. L'eau mange le rouge d'abord. Une luciole émet à 562 nm.
8. **La finition est la même partout.** Courbe filmique, saturation dans OkLab (sans dérive de teinte), vignetage naturel en cos⁴ léger, grain très fin, tramage.
9. **L'interface reste nette.** Mesures, étiquettes et légendes se dessinent en 2D **après** `R.fin()`, comme dans le Feu.
10. **Pensé pour une tablette modeste.** Le tampon HDR est plafonné à 1,25 pixel par pixel CSS. Le halo travaille en demi-résolution (filtre dual de Bjørge, conçu pour les GPU mobiles), et le tirage tient en une seule passe. Le régulateur de résolution du shell (`fj-dpr`) agit à travers `env.dpr`.

## Démarrer

### Une machine WebGL2

```js
const R = FKR.cabine(env, { halo: 0.7, eclairage: 0 });     // lève une erreur sans WebGL2 → prévoir un repli
const etoiles = R.lot({ forme: 'moffat', mode: 'flux' });   // un lot de lueurs, réutilisable
const P = R.K.program(FKR.fs(['bruit', 'couleur'], `
uniform float uT; out vec4 o;
void main(){ o = vec4(corpsNoir(3000.) * max(0., fbmG(vUv * 6. + uT, 5)), 1.); }`));
function frame(t, dt) {
  R.debut();                                // la lumière repart de zéro
  P.use().f('uT', t); R.passe(P);           // une passe plein écran écrit de la lumière (HDR)
  etoiles.vider();
  etoiles.point(x, y, 1.2, ...FKR.couleur.etoile('G').map((v) => v * 40));
  etoiles.dessiner();                       // addition dans la lumière
  R.fin(dt);                                // halo, tirage, copie dans env.ctx
  // ici : étiquettes et mesures en 2D, sur env.ctx
}
// dispose() : R.detruire()
```

Une machine qui a déjà son `GLKit` (Feu, Eau, Galaxie…) peut le partager : `FKR.cabine(env, { K })`. La cabine prend alors la taille de son canevas.

### Une machine en canvas 2D (le pont)

Une machine en canvas 2D n'a pas besoin d'être réécrite : elle peint dans deux calques.

```js
const R = FKR.cabineOuRepli(env, { eclairage: 12, ambiant: [0.05, 0.06, 0.1] });
const decor = R.calque('scene', { fixe: true });   // ce que l'on voit, éclairé au tirage (albédo, css sRGB)
const lum = R.calque('lumiere');                   // ce qui brille : blanc pur = gain2D (4 par défaut)
// … peindre decor.g une fois, puis decor.marquer()
function frame(t, dt) {
  R.debut();
  lum.vider(); lum.g.globalCompositeOperation = 'lighter';
  // … dessiner les lumières dans lum.g en px css (contexte déjà mis à l'échelle)
  R.fin(dt);
}
```

`calque('scene', { fixe: true })` n'est envoyé à la carte graphique qu'après `marquer()` ou `vider()`. Sans `fixe`, il l'est à chaque image, ce qui coûte environ 4 Mo par image en 1280 × 800.

`FKR.cabineOuRepli` renvoie `FKR.cabine2D` si WebGL2 manque. Le contrat est le même (`debut`, `calque`, `lot`, `fin`), mais il n'y a pas de tirage filmique : le halo y est un flou du calque des lumières.

## Référence

### `FKR.cabine(env, réglages)`

| réglage | défaut | rôle |
|---|---|---|
| `plafond` | 1,25 | densité de pixels maximale du tampon HDR |
| `echelle` | 1 | fraction supplémentaire de la résolution |
| `fond` | `FKR.fond('defaut')` = `#05060A` | le vide, linéaire ; aussi `FKR.fond('eau')` = `#04080C` et `FKR.fond('cosmos')` = `#07050A` (DA) |
| `expo` | 1 | exposition |
| `tons` | `'agx'` | `'agx'` (DA, Wrensch 2023), `'film'` (Lottes 2016, teinte conservée), `'aces'` (celui du Feu), `'lupton'` (asinh, images du Sloan Digital Sky Survey), `'reinhard'` |
| `courbe` | `{ contraste: 1.25, epaule: 0.97, milieu: 0.18, sortie: 0.2, max: 24 }` | courbe filmique : 0,18 → 0,2 et 24 → blanc |
| `blanc` | 2 | les lumières plus fortes que ceci pâlissent vers le blanc, jusqu'au blanc complet à `courbe.max` |
| `lupton` | `{ q: 8, etirement: 0.5 }` | réglages de l'étirement asinh |
| `saturation` | 1 | dans OkLab, après la courbe |
| `contraste` | 1 | autour du gris moyen, en espace d'affichage |
| `teinte`, `releve` | `[1, 1, 1]`, `[0, 0, 0]` | balance des blancs (×) et relevé des noirs (+), avant la courbe |
| `halo` | 0,06 | force du halo (DA : de 0,04 à 0,08 ; le Feu est beaucoup plus fort, vers 1) |
| `rayon` | 0,72 | étendue du halo (0 : serré ; 1 : très large) |
| `seuil`, `genou` | 1, 0,5 | seuil doux du halo, sur le canal le plus fort (DA : seul ce qui dépasse le blanc diffuse ; 0 = tout bave, comme le Feu) |
| `niveaux` | 5 | étages de la pyramide, depuis la demi-résolution |
| `eclairage` | 0 | les lumières éclairent la scène : `scène × (ambiant + eclairage × lumière floutée)` |
| `ambiant` | `[1, 1, 1]` | éclairage de base de la scène |
| `vignetage` | 0,39 | cos⁴ ; coins assombris d'environ 25 % |
| `grain`, `grainNoir` | 0,05, 0,25 | grain argentique animé (± 2,5 % dans les tons moyens), et sa part dans les noirs |
| `remanence` | 0 | phosphore : part de la trace gardée par image à 60 i/s (DA : 0,90 à 0,97) ; voir `phosphore()` |
| `gain2D` | 4 | luminance d'un blanc pur dans le calque 2D des lumières |
| `K` | — | un `GLKit` existant à partager |
| `copie` | — | `false` : ne pas copier dans `env.ctx` (le résultat reste dans `R.K.canvas`) |

Méthodes :
- `debut(dt)`, `fin(dt)` ;
- `phosphore()` : une cible persistante qui décroît selon `remanence`, ajoutée à la lumière au tirage. Les traits mathématiques y deviennent de la lumière accumulée (DA, règle 4), par exemple `lot.dessiner(R.phosphore())` ;
- `lot(o)` ;
- `calque(nom, o)` ;
- `scene()` : la cible WebGL de l'albédo, si la machine peint son décor en WebGL ;
- `passe(P, cible, ajout)` : `P.use()` et ses uniformes sont à la charge de la machine ;
- `lut(palette, n)` : une texture n × 1, lue avec `texture(uLut, vec2(t, .5))` ;
- `regler(o)` : changer les réglages en direct ;
- `detruire()`.

Propriétés :
- `R.cibles.lum` : la lumière HDR, pour y dessiner soi-même ;
- `R.K`, `R.gl` : le contexte WebGL2 ;
- `R.W`, `R.H` (px css), `R.cw`, `R.ch` (px du tampon) ;
- `R.perdu` : le contexte est perdu. Il faut alors reconstruire la cabine quand `!R.gl.isContextLost()`, comme le fait le Feu.

### `R.lot(o)` : des lueurs

Réglages de `o` :
- `forme` : `'gauss'`, `'moffat'` (cœur et longues ailes) ou `'etoile'` (Moffat et pointes de diffraction) ;
- `mode` : `'eclat'` (la couleur est celle du centre) ou `'flux'` (la couleur est l'énergie totale ; le centre faiblit quand le rayon grandit, comme une image floue) ;
- `gain`, `beta` (Moffat, 3 par défaut), `pointes`, `angle`.

Méthodes : `point(x, y, r, R, G, B, pointes)`, `trainee(x, y, vx, vy, …)`, `segment(x0, y0, x1, y1, r, …, bouts)`, `ligne([x0, y0, x1, y1, …], r, R, G, B, fermee)` (segments jointifs, sans perles aux jonctions), `vider()`, `dessiner(cible)`.

Coordonnées en px css, origine en haut à gauche. Le rayon est σ pour la forme gauss et α pour Moffat.

### `FKR.couleur` : des couleurs depuis les spectres

Les couleurs sont renvoyées en sRGB linéaire, normalisées au maximum = 1. Les intégrations utilisent la table CIE 1931 2°.

- `corpsNoir(T)` : exact (Planck × CIE). `eclatCorpsNoir(T)` donne la luminance relative à 1 000 K (× 2 900 à 1 500 K).
- `raie(nm)` : une raie pure, ramenée dans le gamut à teinte constante (OkLab).
- `melange('hydrogene' | 'oxygene3' | 'azote2' | 'soufre2' | 'sodium' | 'mercure' | 'neon' | 'aurore_verte' | 'aurore_rouge' | 'aurore_bleue' | 'eclair' | [[nm, poids], …])` : renvoie `{ rgb, Y }`. Les rapports d'intensité sont physiques : décrément de Balmer, [O III] 3:1…
- `bande('luciole' | 'luciole_verte' | 'ver_rouge' | 'mer' | 'aequorine' | 'gfp' | 'champignon' | 'lanterne' | 'dragon_rouge')` ou `bande(pic, largeur)` : la bioluminescence.
- `eau(m)` : renvoie `{ rgb, Y }`, la lumière du jour après m mètres d'eau pure (Pope et Fry 1997).
- `rayleigh()` : le bleu du ciel.
- `etoile('O'…'M' | T)` : la couleur d'une étoile.
- `son(hz)` : l'**échelle commune du son** (DA). 55 Hz donne 700 nm (rouge), 3 520 Hz donne 400 nm (violet). Harpe, Spectre et Cymatiques l'utilisent tous, comme les Pendules et les Illusions sonores s'ils en ont besoin.
  - **C'est une convention.** Aucun lien physique ne relie la hauteur d'un son à une couleur (Kurt, 13/11).
  - Chaque machine qui l'utilise doit le dire à l'écran, par exemple dans sa légende : « couleurs choisies pour repérer les notes ».
- `bande('phosphore')` : le vert P31 des oscilloscopes.
- `spectre(fn)` : n'importe quel spectre.
- Outils :
  - `css(rgbLin)` → `'#rrggbb'`, pour les légendes de l'interface ;
  - `deCss('#hex')` → linéaire ;
  - `oklab`, `deOklab`, `affichable`.
- Tables : `RAIES`, `MELANGES`, `BANDES`, `CLASSES`.

### `FKR.palette`

Une palette est une fonction `t ∈ [0, 1] → [r, g, b]`. Pour en faire une texture : `R.lut(palette)`.

- `corpsNoir(T0, T1, eclat)` : la luminance est comprimée par l'exposant `eclat`, 0,4 comme dans le Feu.
- `etoiles()`
- `eau(profMax)`
- `nebuleuse(rougi)` : t = excitation, de [S II] et [N II] à Hα puis [O III].
- `aurore()` : t = altitude.
- `carte('viridis' | 'magma' | 'inferno' | 'cividis' | 'twilight' | 'mako' | 'rocket')` : les cartes perceptivement uniformes demandées par la DA, pour une concentration, une densité, une énergie ou une itération. On n'utilise jamais `jet`. La légende de la machine nomme la carte, par exemple « couleurs : concentration de l'activateur, échelle *mako* ». Les 33 ancres sont interpolées dans OkLab, à moins de 0,006 des tables de matplotlib et seaborn.
- `rampe(['#hex', …] | [[t, '#hex'], …])` : interpolée dans OkLab, pour une palette dessinée à la main.

### `FKR.GLSL` et `FKR.glsl(…)` : morceaux de GLSL ES 3.00

`FKR.fs(['bruit', 'tons'], corps)` assemble la tête (`#version 300 es`, précisions, `in vec2 vUv`), les morceaux et leurs dépendances. Aucun nom n'est commun avec `FKGL.HEAD` : on peut inclure les deux.

- **couleur** : `luminance`, `versLineaire`, `versSrgb`, `oklab`, `deOklab`, `saturer`, `corpsNoir(T)` (ajustement < 0,8 %), `eclatCorpsNoir(T)`, `cmfRGB(nm)`, `couleurRaie(nm)`, `filmMince(e_nm, n, cosθ)` (bulles, huile ; la lame très fine est noire), `eauTransmission(m)`.
- **bruit** :
  - hachages : `alea`, `alea2`, `alea3` (PCG entier, robustes loin de l'origine) ;
  - `ign` (tramage) ;
  - bruits : `bruitV`, `bruitG`, `bruitGd` (avec dérivées), `bruitG3` ;
  - fractales : `fbmG(p, n)`, `fbmG3`, `strie` (filaments) ;
  - `boucle(p, n)` (curl, sans divergence), `voronoi` (F1, F2), `voronoiT(p, t)` (germes mobiles), `gauchir` (déformation de domaine) ;
  - `caustique(p, t)` : un réseau de caustiques procédural, quand il n'y a pas de surface simulée.
- **tons** : `tonAgX`, `tonFilm`, `courbeFilm`, `tonACES`, `tonLupton`, `tonReinhard`.
- **lumiere** :
  - profils : `gauss`, `halo` (lorentzien), `moffat` ;
  - surfaces : `schlick`, `fresnelDielectrique(cosθ, n)` (exact : l'eau renvoie 2 % de la lumière vue d'en haut et devient un miroir en vue rasante), `enveloppe` (éclairage enveloppant), `normaleHauteur` ;
  - caustiques : `caustiqueJacobien(∇²h, profondeur, n)`, l'éclairement du fond sous une surface simulée (1/|det J|) ;
  - milieux : `phaseHG`, `phaseRayleigh`, `beer`, `brouillard`.
- **formes** : `sdCercle`, `sdBoite`, `sdSegment`, `sminP`, `rot2`.
- **matiere** : de quoi donner du corps à un champ 2D (motif de Turing, lave, fluide, gel, cire…).
  - `normaleDe(h, hx, hy, pas)` : la normale du relief ;
  - `surface(n, l, albédo, rugosité, f0, lumière, cielHaut, cielBas)` : micro-facettes GGX, Fresnel de Schlick, diffus enveloppant, reflet d'un ciel en dégradé, qui se brouille avec la rugosité ;
  - `traverse(sigma, épaisseur)` : la translucidité de Beer-Lambert ;
  - voir la scène `#matiere` du banc d'essai.
- **finition** : `vignetage`, `tramer`.

## Partager entre les branches

La bibliothèque arrive dans un commit qui ne touche que les fichiers suivants : `app/js/fkrendu.js`, `docs/RENDU-COMMUN.md`, `tools/demo-rendu.html`, `tools/test-rendu.mjs`, une ligne dans chaque `index.html` et `app/sw.js`.

L'autre branche le récupère par `git cherry-pick <hash>`. Les mises à jour suivront de la même façon, en commits isolés.

À la fusion, les mêmes lignes seront identiques des deux côtés, donc sans conflit. Il vaut mieux ne pas committer `dist/` sur les branches de rendu : on le reconstruit à la fusion, sinon les deux branches s'y contredisent à chaque ligne.

## Sources

- Couleurs :
  - CIE 1931, observateur 2° (table à 10 nm) ;
  - Planck ;
  - Ottosson 2020 (OkLab) ;
  - Pope et Fry 1997, Smith et Baker 1981 (absorption de l'eau) ;
  - Osterbrock, *Astrophysics of Gaseous Nebulae* (décrément de Balmer, cas B) ;
  - Orville 1968 (spectre de l'éclair).
- Rendu :
  - Bjørge 2015 (filtre dual, *Bandwidth-Efficient Rendering*) ;
  - Jimenez 2014 (halo en pyramide, moyenne de Karis, tramage par bruit de gradient entrelacé) ;
  - Lottes 2016 (courbe filmique) ;
  - Narkowicz 2015 (ACES ajusté) ;
  - Lupton et al. 2004 (étirement asinh) ;
  - Moffat 1969 (profil des étoiles) ;
  - Jarzynski et Olano 2020 (hachage PCG) ;
  - Quilez (déformation de domaine, dérivées du bruit).
