# Fascination — document d'amorce pour Claude Code

> À lire en premier. Ce document résume le projet, son architecture, les choix déjà faits et la suite du travail.
> L'utilisateur travaille **depuis une tablette** : il ne peut pas lancer de terminal local. Privilégie des livrables qui s'ouvrent dans un navigateur et qui s'hébergent simplement.

## 1. Le projet

**Fascination** est une application web de 26 « machines à fascination » : des simulations interactives, contemplatives et psychédéliques, inspirées de la réalité scientifique et biologique. Elles se regardent comme on regarde un feu de cheminée, et se manipulent du doigt.

Langue de l'interface et des textes : **français**. Style d'écriture : phrases simples, ton poétique mais précis scientifiquement.

### Objectifs de l'utilisateur pour la suite
1. Héberger l'application pour qu'elle soit accessible en ligne (il évoque « l'héberger directement sur Claude.ai » : propose la solution la plus simple, par exemple un artefact HTML unique, GitHub Pages, Netlify ou Vercel, selon ce qui est possible depuis une tablette).
2. À terme, en faire une **APK Android** (Capacitor, ou une PWA installable via TWA).
3. Continuer à **retravailler les machines une par une**, au même niveau d'exigence que celles déjà refaites (voir §4).

## 2. Contenu du dépôt (mis à jour le 5 octobre 2026)

Le projet a quitté l'outil de design : il vit maintenant dans ce dépôt, en HTML/JS natif. Voir le `README.md` à la racine pour l'arborescence complète.

- `app/` : l'application (coquille native `index.html` + `css/` + `js/shell.js`, machines dans `js/machines/`, générateur de bruits `js/bruits.js`, base PWA).
- `dist/fascination.html` : tout en un fichier, régénéré par `node tools/build.mjs`.
- `dist/artifact.html` : le même contenu, publié comme artefact sur claude.ai.
- `tools/smoke.mjs` : test automatique dans Chromium sans écran (WebGL logiciel via SwiftShader).

Le format « Design Component » (`support.js`, `<x-dc>`) a disparu. Les machines `s-*.js` et `fk.js` n'ont pas été modifiées, sauf `s-elem.js`, dont le Feu a été retiré (il vit désormais dans `s-feu.js`).

## 3. Architecture

### 3.1 La coquille (`app/index.html` + `app/js/shell.js`)
Réécriture native, fidèle à l'interface d'origine : mêmes boutons, mêmes volets, mêmes raccourcis, même boucle d'animation (dt × VITESSE, 4 sous-pas au plus, pause « en direct » si `sim.livePaused`).

Ce qui a changé :
- les commandes du panneau (`sim.ui()`) sont reconstruites seulement quand leur structure change, sinon mises à jour sur place toutes les 500 ms (un curseur qu'on tire n'est jamais remplacé) ;
- `env.dpr` est fourni aux machines (utile au WebGL) ;
- l'ancre de l'adresse choisit la machine (`#feu`), à l'ouverture comme en cours de route ;
- PHOTO passe par la capacité « downloads » dans un artefact claude.ai (le visiteur confirme l'enregistrement), sinon par un lien de téléchargement, et en dernier recours affiche l'image en surimpression (appui long pour l'enregistrer) ;
- nouveau bouton **BRUITS** (touche `N`) qui ouvre le générateur de bruits ;
- **thème clair / sombre** : bouton ◐ AUTO / ☀ CLAIR / ☾ SOMBRE (touche `T`), mémorisé ; en automatique, suit le thème de l'hôte (attribut `data-theme` posé par claude.ai) puis le système. La coquille pose `data-fasc-theme` sur `<html>` ; toutes les couleurs de l'interface sont des jetons CSS. Les accents de catégorie ont une variante foncée pour le fond crème ;
- **Décor** : interrupteur dans le panneau (touche `D`), affiché seulement pour les machines qui déclarent `decor: true`. Décor masqué, la machine ne montre que son phénomène, sur fond noir (thème sombre) ou crème (thème clair) ;
- **vitesse** : l'affichage ×1 correspond à 0,4 × la vitesse d'origine (constante `SPEED_UNIT` dans `shell.js`). Les machines qui déclarent `smoothTime: true` reçoivent un pas de temps plus court à chaque image (ralenti fluide) ; les autres gardent l'ancien mécanisme de pas sautés ;
- **panneau** : les rubriques de `ui()` intitulées « Scènes » ou « Expériences » (ou `top: true`) s'affichent juste sous la description ;
- configuration facultative : `window.FASC_CONFIG = { startSim, speed, sound, psyche, autoplay }` avant les scripts ;
- crochet de test : si `window.FASC_DEBUG = {}` existe, le Feu y expose `FASC_DEBUG.feu` (champs, scènes, mesures).

### 3.2 Le contrat d'une machine
Chaque fichier `s-*.js` attend que `window.FK` existe, puis fait `window.FASC.push(def)` :

```js
{
  id: 'meduses', name: 'Les Méduses', cat: 'Vivant', glyph: '🜄',
  decor: true,                              // facultatif : la machine sait se montrer sans décor
  blurb: 'accroche courte',
  hint: 'gestes possibles (texte)',
  intro: 'paragraphe d’introduction (panneau)',
  legend: [{ color, name, role, desc }],   // espèces, affichées dans « En savoir plus »
  about: ['paragraphe', …],                 // contexte scientifique
  tools: [{ id, label, desc }],             // outils sélectionnables (env.tool)
  make(env) {                               // env = { ctx, canvas, w, h, dpr, audio, tool, view, paused, decor, theme }
    return {
      frame(t, dt) {},                      // dt déjà multiplié par la VITESSE ; dt = 0 en pause « en direct »
      down(p), move(p), up(p),              // p = { x, y, dx, dy, down }
      dispose(),
      // env.decor (booléen) et env.theme ('dark' | 'light') se lisent à chaque image ; déclarer decor: true dans la définition
      livePaused: true,                     // facultatif
      clear(),                              // facultatif → bouton VIDER
      ui() { return [ … ] },                // facultatif → commandes du panneau
    };
  },
}
```

Les commandes que peut renvoyer `ui()` :
- `{type:'section', label}`
- `{type:'note', text}`
- `{type:'bar', label, color, value (0 à 1), txt}`
- `{type:'slider', label, min, max, step, value, fmt(v), set(v)}`
- `{type:'toggle', label, value, set(v)}`
- `{type:'choice', label, value, options:[{id,label}], set(v)}`
- `{type:'buttons', items:[{label, act()}]}`

`env.view` renvoie `{x0, x1}`, la zone horizontale non couverte par les volets. Les machines s'en servent pour placer leurs scènes et expériences au bon endroit.

### 3.3 `fk.js`
Contient :
- les outils de base : `TAU`, `clamp`, `rnd(max, min)` (attention à l'ordre des arguments), `rint`, `lerp` ;
- les outils canvas : `buf(w,h)` (ImageData avec `.d` et `.flush()`), `layer(w,h)` (canvas hors écran), `lut`, `diffuse(a, tmp, w, h, k)`, `fade`, `hsv` ;
- `scale(i, root)` : une gamme pentatonique ;
- `SoundKit` (Web Audio) : `note(f, dur, type, gain, glide)`, `pluck(f, dur, gain)`, `noise(dur, gain, freq, Q, type, sweepTo)`, `drone(f, type, gain)` → `{set, gain, cut, stop}`. Il ne joue rien tant que l'utilisateur n'a pas activé SON.

## 4. Le niveau d'exigence (à conserver pour toutes les machines)

L'utilisateur a beaucoup aimé les machines refaites. Les principes à reproduire :
1. **Ancrage dans la réalité scientifique et biologique** : de vraies espèces avec leur nom latin, de vrais comportements, de vrais modèles (Reynolds, Jones 2010, Mirollo-Strogatz, Parisi 2008…).
2. **Plusieurs espèces ou acteurs aux comportements très différents**, qui interagissent : symbiose, prédation, fuite, mimétisme…
3. **Une machine qui se suffit à elle-même** : elle évolue seule (cycles, évènements spontanés, renouvellement) sans jamais se figer.
4. **Interactions riches mais facultatives** : outils au toucher, puis réglages créatifs dans le panneau (curseurs, interrupteurs, scènes ou « expériences célèbres »), bouton VIDER pour construire en pause puis lancer la lecture.
5. **Identification au toucher** : nom latin en italique et rôle en majuscules à chasse fixe, avec un trait vers l'élément touché.
6. **Rendu soigné** : décor peint (fond, matières), profondeur, lumière additive façon néon. L'utilisateur trouvait le blob trop sombre au départ : il préfère les versions **lumineuses et néon**.
7. **Mouvement fluide**, sans saut d'une case à l'autre (les anciennes fourmis saccadaient).
8. **Son discret et contextuel** : bourdon d'ambiance, sons liés aux évènements, toujours avec une limite de fréquence.
9. **Panneau « En savoir plus »** : légende des espèces et 3 ou 4 paragraphes de contexte.

## 5. État des machines

Machines refaites (niveau final) :
- **Feu** (octobre 2026, WebGL2) : voir §7.
- **Eau** (octobre 2026, WebGL2) : voir §9.
- **Écoulement** (octobre 2026, WebGL2) : voir §10.
- **Sable** (octobre 2026, 3D WebGL2 + coupes 2D) : voir §11.
- **Foudre** (octobre 2026, claquage diélectrique + ciel WebGL2) : voir §12.
- **Cristal** (octobre 2026, WebGL2) : voir §13.
- **Fractales** (octobre 2026, WebGL2 + 2D ; ancien « Le Fractal ») : voir §14.
- **Illusions** (nouvelle, octobre 2026) : voir §15.
- **Jeu de la vie** (nouvelle, octobre 2026, WebGL2) : voir §16.
- **Galaxie** (octobre 2026, WebGL2) : voir §17.
- **Tunnel** (octobre 2026, WebGL2) : voir §18.
- **Lampe à lave** (octobre 2026, WebGL2) : voir §19.
- **Bulles** (octobre 2026, WebGL2) : voir §20.
- **Méduses** : 5 espèces (Aurelia, Chrysaora, Atolla, Aequorea, cténophore), nage par contraction, tentacules simulés physiquement, champ de courants, plancton bioluminescent, outils courant, lumière et éclosion. *Pas encore de `ui()` ni de `clear()`.*
- **Fourmilière** : *Lasius*, *Atta* (coupe-feuille), *Eciton* (raids), phéromones, vue chimie. *Pas encore de `ui()` ni de `clear()`.*
- **Mycélium** : 4 champignons (neutre, symbiote, craintive, prédatrice), onde électrique, murs, `ui()` complet.
- **Blob** : modèle de Jones, 3 espèces, expériences (labyrinthe, réseau ferré de France, cercle d'avoine, duel), éclat néon, `ui()` complet.
- **Lucioles** : 5 espèces (synchrones, dialogue pyralis, femme fatale *Photuris*, *Pteroptyx* sur l'arbre, vers luisants), outils signal, torche, pose longue, lune et pollution lumineuse.
- **Murmuration** : boids en 3D, voisinage topologique (7 voisins), étourneaux au marais et bécasseaux sur l'estran, faucon pèlerin, vagues de panique, coucher de soleil puis plongée au dortoir.

Machines **encore dans leur version d'origine**, à retravailler une par une : Réaction-diffusion, Spirales, Cymatiques, Kaléidoscope, Harmonographe, Attracteur, Moiré, Visualiseur, Harpe.

Points restés en suspens :
- vérifier le son de toutes les machines refaites ;
- vérifier la fluidité sur téléphone et tablette ;
- le Feu WebGL n'a été testé qu'en rendu logiciel (SwiftShader, sans écran) : vérifier la fluidité réelle sur la tablette, et le son (grondement, crépitements) à l'oreille ;
- vérifier que le blob trouve bien la sortie du labyrinthe ;
- la nuée d'étourneaux reste un peu compacte, on peut l'étirer davantage pour obtenir des nappes plus fines ;
- ajouter `ui()` et `clear()` aux Méduses et à la Fourmilière ;
- ajouter le pincement (zoom) et des gestes à plusieurs doigts ;
- à terme : passer en WebGL les machines de fluides, de lumière et de particules (méduses, galaxie… ; le feu et l'eau sont faits) pour des dizaines de milliers de particules, un vrai flou de profondeur et des réfractions.

## 6. Fait le 5 octobre 2026
1. Coquille réécrite en natif, machines chargées sans modification.
2. Application publiée comme artefact claude.ai (fichier `dist/artifact.html`).
3. Base PWA : manifeste, service worker, icônes 192/512 et « maskable ».
4. Feu refait en WebGL2 (§7).
5. Générateur de bruits (§8).

Suite possible : retravailler la machine suivante (l'Eau et l'Écoulement profiteraient du même moteur de fluide que le Feu), ajouter `ui()`/`clear()` aux Méduses et à la Fourmilière, héberger `app/` en HTTPS pour la TWA, ou passer par Capacitor pour l'APK.

## 7. Le Feu (WebGL2) — `app/js/machines/s-feu.js`

- **Moteur** : « stable fluids » (Stam 1999) sur GPU. Vitesse (grille ~165×91 en qualité normale), pression (Jacobi, haut ouvert pour le tirage), confinement de vorticité, bruit à rotationnel. Champs scalaires ×2,4 plus fins : `S` = (température, combustible, suie, vapeur), `C` = (couleur des sels, part prémélangée).
- **Chimie** : combustion au-dessus d'un seuil d'inflammation, plus rapide si le gaz est prémélangé (Bunsen) ; la suie naît des flammes riches puis s'oxyde au sommet ; pertes par rayonnement (T⁴) et mélange. La gravité règle la poussée, la ventilation et la diffusion (apesanteur = flamme sphérique bleue).
- **Lumière** : table de corps noir calculée avec la loi de Planck et les fonctions CIE 1931 (approximation de Wyman 2013) ; chimiluminescence bleue de CH*/C₂* noyée par la suie ; raies des sels (Na, Sr, Li, Ca, Cu, Ba, B, K). Halo à trois niveaux, tonalité ACES. Le décor est peint en 2D puis éclairé par le feu (sources ponctuelles + halo).
- **Acteurs** : bûches de chêne, pin et bouleau (humidité, charbon, braises qui respirent, effondrements, éclats de résine), bougie, bec Bunsen avec virole ; jusqu'à 16 éléments.
- **Étincelles** : jusqu'à 36 864 particules sur GPU (qualité haute), entraînées par le vent du fluide, refroidies selon Planck.
- **Scènes** : Cheminée, Feu de camp, Bougie de Faraday, Tests de flamme, Apesanteur. Entretien automatique (quelqu'un remet une bûche).
- **Outils** : observer (pyromètre : lit la vraie température de la cellule touchée), souffle, poser, sel, eau.
- **Repli** : si WebGL2 ou les cibles flottantes manquent, l'ancien feu 2D prend le relais (fonction `legacy`).
- **Qualité** : Légère (par défaut sur mobile), Normale, Haute, dans le panneau.
- Le canevas WebGL est hors écran, recopié dans le canevas 2D de la coquille à chaque image : PHOTO et le filtre PSYCHÉ continuent de marcher. Le contexte est libéré (`WEBGL_lose_context`) à chaque changement de machine.

## 8. Le générateur de bruits — `app/js/bruits.js`

Tiroir indépendant (bouton BRUITS, touche `N`), avec son propre contexte audio : il joue même si SON est coupé et continue quand on change de machine. Mélange de six couleurs (blanc, rose de Kellet, brun, gris par courbe d'égale sonie, bleu, violet), boucles stéréo décorrélées de 12 s sans couture ; battements binauraux (casque) ou isochrones ; « houle » qui module gain et filtre (rythme réglable, 5,5 vagues/min = respiration lente) ; minuterie avec fondu ; spectre en direct ; préréglages. Les réglages sont mémorisés dans `localStorage`.

## 9. L'Eau (WebGL2) — `app/js/machines/s-eau.js`

- **Boîte à outils partagée** : `app/js/fkgl.js` (`window.FKGL = { GLKit, VS, HEAD }`), utilisée par le Feu et l'Eau. Une machine WebGL attend `window.FK` et `window.FKGL`.
- **Surface** : équation d'onde sur GPU (hauteur, vitesse, moyenne de h² pour repérer nœuds et ventres). Vitesse locale lue dans une carte peinte en 2D (canal rouge : profondeur, vert : paroi) ; bords absorbants ; viscosité qui éteint d'abord les rides fines ; les nénuphars amortissent. Jusqu'à 64 sources par pas (gouttes, coups de rame, brise, sources oscillantes) et une source plane.
- **Lumière** : caustiques par maillage déformé (chaque sommet suit un rayon réfracté, indice 1,33 ; l'intensité est le rapport des aires, via `dFdx`/`dFdy`), lissées ; réfraction du fond, absorption de l'eau, ombres au fond (nénuphars, fossettes des pattes de gerris cerclées de lumière, koïs), reflets du soleil.
- **Peuple** : gerris (coups de rame, chasse aux ondes, signaux des mâles, saut quand un koï gobe), gyrins (radeau, dispersion en zigzag), koïs dessinés en GLSL (cinq robes, ondulation, départ en C), nénuphars en fleur, mouches qui se débattent, granulés. Météo autonome : averses, risées, mouches.
- **Scènes** : La mare, Averse, Cuve à ondes (deux sources, fente, fentes de Young, réfraction, lentille, Doppler ; option « amplitude moyenne »).
- **Outils** : observer, doigt, goutte, pluie, mouche, nourrir, mur, gomme.
- **Sans décor** : caustiques néon sur noir, ou à l'encre sarcelle sur crème ; seules les ondes restent.
- **Repli 2D** : l'ancienne Eau (fonction `legacy`).

## 10. L'Écoulement (WebGL2) — `app/js/machines/s-flux.js` (id `fluide`)

- **Moteur** : Navier-Stokes incompressible sur GPU, avec viscosité implicite (Jacobi), confinement de vorticité, projection de pression, obstacles (masque peint en 2D), entrée de veine propre et sortie ouverte (soufflerie), bords périodiques (Kelvin-Helmholtz) ou fermés. Gravité appliquée à la densité des encres (canal alpha).
- **Encres** : deux textures (absorbance + densité, fluorescence). Transport MacCormack (Selle 2008) en qualité normale et haute, semi-lagrangien en légère.
- **Acteurs** : fluorescéine, rhodamine B, encre de seiche, bleu de méthylène, permanganate (cristaux qui coulent en laissant une traînée).
- **Expériences** : Allée de Kármán (cylindre, plaque, aile NACA 0012 avec incidence, mur à main levée ; Re et fréquence de Strouhal estimés), Kelvin-Helmholtz (nombre de Richardson), Rayleigh-Taylor (nombre d'Atwood), Aquarium (gouttes en paires de tourbillons, cristaux), Mémoire de Taylor.
- **Taylor** : écoulement de Couette rampant calculé exactement (rotation φ(r) = Φ·r₁²(r₂²/r² − 1)/(r₂² − r₁²)) ; une image « matérielle » est déformée à l'affichage, donc l'expérience est parfaitement réversible ; curseur de diffusion moléculaire pour le réalisme. Les gouttes sont peintes dans l'état de référence (forme reconstruite point par point).
- **Rendus** : encres (UV ou rétroéclairage blanc), rhéoscopique (paillettes de mica), vorticité. Sans décor : noir néon ou encre sur crème.
- **Son** : chant éolien à la fréquence de lâcher des tourbillons, bruit d'eau.
- **Limites connues** : la grille ajoute sa propre viscosité numérique, d'où un Reynolds affiché « estimé » ; en 2D, une goutte forme une paire de tourbillons, pas un anneau.

## 11. Le Sable — `app/js/machines/s-sable.js` (coupes 2D) et `s-sable3d.js` (relief 3D)

- **Aiguillage** : la définition de la machine choisit le moteur selon la scène. Scènes en relief 3D (Dunes, Fourmilions, Tas de sable, Château) ; scènes en coupe 2D (Sablier, Tableau de sable). Sans WebGL2, les scènes 3D retombent sur la coupe.
- **Moteur 3D** (`window.SABLE3D`) : hauteur de sable par case sur un socle rocheux ; avalanches quand la pente dépasse l'angle de repos (par sable ; ≈ 80° mouillé ; ≈ 27° sous l'eau) ; dunes par le modèle de Werner (1995) avec zones d'ombre à 15° sous le vent ; rendu WebGL2 en perspective (ombres par marche de rayon dans la carte des hauteurs, rides éoliennes, éclats, brume, ciel, mer animée) ; fourmis et fourmilions dessinés en 2D par projection ; choix par clic par lancer de rayon sur le relief. ~3 à 4 ms par pas en finesse haute.

### Moteur 2D (coupes)


- **Automate granulaire en 2D** (pas de WebGL : le calcul est local et rapide, ~3 ms par pas en qualité moyenne). Chaque case garde sa matière, sa teinte, sa couleur teinte, sa vitesse de chute et son humidité.
- **Règles** : chute accélérée (jusqu'à 7 cases par pas) ; glissement en diagonale puis roulement de deux cases, dont les probabilités fixent l'angle de repos de chaque sable ; dans l'eau, chute freinée et dérive ; **cohésion du sable mouillé** (ponts capillaires) seulement à l'air libre, jamais sous l'eau ; humidité qui se propage par capillarité et sèche au soleil ; bulles d'air qui remontent ; grains projetés en vol (souffle, fourmilion).
- **Sables** : quartz, basalte, sable rose (*Homotrema rubrum*), olivine, gravier (effet noix du Brésil quand on secoue).
- **Vivant** : fourmilions (*Myrmeleon formicarius*) qui creusent en projetant le sable jusqu'à une profondeur cible, bombardent les fourmis qui glissent, puis se métamorphosent ; fourmis moissonneuses (*Messor barbarus*) en file entre la droite et le nid ; la plupart contournent les entonnoirs (en 3D il y a de la place), certaines y glissent.
- **Scènes** : Fourmilions (dune au couchant), Sablier (débit mesuré au goulot, voûtes qui bloquent un goulot étroit, retournement automatique), Tableau de sable (strates teintes sur une cloison percée, dans l'eau ; se retourne seul), Château de sable (marée, ressac, séchage au soleil, reconstruction).
- **Son** : sifflement du sable qui coule, « chant des dunes » (bourdon grave) pendant les grosses avalanches.
- **Rendu** : image à deux pixels par case, ombrage selon la profondeur sous la surface, éclat du quartz, sable mouillé plus sombre ; retournement animé.
- **Limite connue** : l'angle de repos naît des probabilités de glissement ; il est réaliste à quelques degrés près, pas mesuré précisément.

## 12. La Foudre — `app/js/machines/s-foudre.js` (id `foudre`)

- **Croissance de l'éclair** : modèle de claquage diélectrique (DBM, Niemeyer, Pietronero et Wiesmann, 1984) sur une grille d'environ 230 × 140 cases. Potentiel 0 sur le nuage et le canal, 1 sur le sol et les conducteurs (chêne, clocher, pylônes, paratonnerres posés) ; équation de Laplace par SOR rouge-noir restreint à une fenêtre autour du canal ; à chaque pas, 3 cases voisines du canal sont tirées avec une probabilité ∝ φ^η (réglage « Ramification η », 2,4 par défaut). Croissance par bonds (25 ms de poussée, 20 ms de pause, en temps ralenti).
- **Jonction** : quand une case du traceur arrive à 3 cases d'un conducteur (carte des distances précalculée par parcours en largeur), un arc de jonction monte du conducteur ; les autres pointes proches lancent des traceurs ascendants qui avortent.
- **Arcs** : chemin principal retrouvé par les parents ; courant des branches ∝ √(taille du sous-arbre) ; arc en retour qui monte en 8 ms (ralenti), 1 à 5 arcs pour un coup négatif (traceur obscur qui redescend avant chaque arc subséquent), un seul arc avec courant persistant pour un coup positif (parti du bord, depuis l'enclume). Rémanence rétinienne ensuite.
- **Ciel** (WebGL2) : nuages fbm éclairés de l'intérieur par jusqu'à 8 lumières (sommet du canal, milieu du canal, éclairs intranuages), pluie en traits ; paysage pré-dessiné en deux versions (nuit et éclairé) mélangées selon le flash. Repli 2D sans WebGL2.
- **Flashs adoucis** (par défaut) : la luminosité de tout l'écran monte vite et redescend lentement, de sorte que les arcs successifs ne font qu'un seul flash (photosensibilité). Désactivable dans le panneau.
- **Éclairs intranuages** et « araignées » sous la base du nuage ; **feu de Saint-Elme** aux pointes quand la charge monte ou qu'un traceur approche.
- **Son** : tonnerre retardé de distance ÷ 343 m/s, fait de plusieurs grondements filtrés, un par morceau du canal (d'où le roulement), claquement sec si l'orage est à moins de 2 km, boum grave ; pluie en fond.
- **Scènes** : Orage, Haute atmosphère (limbe terrestre vu d'orbite, lueur nocturne verte à 95 km avec ondes de gravité, farfadets rouges à tentacules bleus, jets bleus, jets géants, elfes ; son de récepteur VLF : craquements et siffleurs), Figure de Lichtenberg (même moteur DBM, bloc de plexiglas, la figure se grave et reste, dimension fractale mesurée par comptage de boîtes), Globe à plasma (filaments sur une sphère, répulsion, convection, attirés par le doigt ; trois gaz).
- **Limites connues** : échelle verticale comprimée ; traceur très ralenti ; dimension fractale mesurée sur une petite figure, plus faible que la valeur asymptotique (~1,7 à η = 1) ; perf. réelle sur tablette non mesurée (testé en rendu logiciel seulement).

## 13. Le Cristal — `app/js/machines/s-cristal.js` (id `cristal`)

- `s-elem.js` a disparu : il ne contenait plus que l'ancien Cristal, gardé comme repli 2D (agrégation limitée par diffusion) dans `s-cristal.js`.
- **Flocon** : automate de Reiter (2005) sur grille hexagonale en coordonnées axiales (texture N×N, N = 220 / 300 / 380). Deux passes par pas : (u, v) = vapeur qui diffuse / glace, puis diffusion α. Quatre conditions rangées sur le diagramme de Nakaya (plaque, plaque à secteurs, étoile, fougère : couples (β, γ, α) calibrés à l'œil) ; « Voyage dans le nuage » enchaîne 3 ou 4 conditions pendant la croissance. Vitesse adaptative : le nombre de pas par image est réglé sur les pas nécessaires par case gagnée (mesurés par lecture de la grille le long des six axes), pour qu'un flocon pousse en ~8 s de simulation quelle que soit sa forme. Rendu : bilinéaire manuel en coordonnées axiales, relief par gradient de l'épaisseur, éclairage coloré par l'arrière.
- **Givre, Surfusion, Chaufferette** : champ de phase de Kobayashi (1993) : φ, T, orientation du grain, date de gel (RGBA32F). Deux passes par pas : (ε², εε'φx, εε'φy) puis φ et T. dx = 0,03, dt = 1,5·10⁻⁴, τ = 3·10⁻⁴, α = 0,9, γ = 10, K = 2,1 à 2,2 (chaleur latente), anisotropie 6 (glace), 4 (cubique, succinonitrile), 2 avec δ = 0,25 (aiguilles d'acétate de sodium). L'orientation se propage vers les cases qui gagnent en φ. Lumière polarisée : couleurs d'interférence sin²(πΔ/λ) × sin²(2θ).
- **Piège rencontré** : les textures RGBA32F filtrées en LINEAR sont lues comme vides sans l'extension OES_texture_float_linear (absente en SwiftShader et sur beaucoup de mobiles). Simulation en NEAREST, lissage bilinéaire fait à la main dans le shader d'affichage.

## 14. Les Fractales — `app/js/machines/s-fractales.js` (id `fractal` conservé)

- **Mandelbrot profond** : orbite de référence en double précision (JS) au centre de la vue, envoyée en texture RGBA32F (1024 × n) ; chaque pixel calcule son écart δ en float32 : δ ← (2Z + δ)δ + δc, avec rebasage (Zhuoran 2021) quand |Z + δ| < |δ| ou en fin d'orbite. Intérieur détecté par la dérivée dz/dz₁ (cycle attractif). Ombrage : estimation de distance + carte de normales (z / dz/dc). Itérations : 160 + 60·log₂(zoom) + 0,9·log₂²(zoom). Zoom limité vers 10⁻¹³ (précision du centre en double). Les variantes (z³, Burning Ship, Tricorne) sont en calcul direct float32 : zoom ≤ 10⁻⁵.
- **Résolution adaptative** : si l'intervalle entre images dépasse 42 ms, la zone calculée rétrécit (jusqu'à 35 %), puis remonte sous 24 ms.
- **Destinations** : vallée des hippocampes, point de Feigenbaum (jusqu'à 2·10⁻⁵ seulement : au-delà les orbites s'échappent trop lentement), point de Misiurewicz M(3,1) (−0,10109636384562 + 0,95628651080914 i, vérifié : z₃ = z₄), dendrite c = i, mini-Mandelbrot de période 3 (racine de c³ + 2c² + c + 1 calculée par Newton), vallée des éléphants.
- **Son** : glissando de Shepard (7 sinusoïdes à l'octave sous une cloche gaussienne), une octave pour deux doublements de zoom.
- **Julia** (c qui longe la cardioïde, médaillon de Mandelbrot), **Flammes et fougères** (jeu du chaos sur processeur, densité log, cadrage sur centiles), **Courbes** (dragon par pliages animés, Koch avec périmètre et aire, arbre de Pythagore qui se balance).
- **Limites connues** : à grand zoom, l'image est lourde à calculer (plusieurs milliers d'itérations par pixel) ; la résolution adaptative la rend fluide au prix de la netteté. Non mesuré sur la tablette.

## Règle du panneau (demande de Yoann, octobre 2026)

Le panneau de droite ne montre que les réglages qui s'appliquent à ce qui est affiché : quand une machine a plusieurs scènes, les réglages propres à une scène n'apparaissent que dans cette scène. Audit fait sur toutes les machines : corrections dans la Murmuration (dortoir seulement au marais), le Blob (éclat et pulsation masqués en vue Chimie), le Feu (« s'entretient tout seul » seulement cheminée et camp), et le Sable (les réglages des coupes 2D — sablier, tableau — étaient masqués par erreur).

## 15. Les Illusions — `app/js/machines/s-illusions.js` (id `illusions`, nouvelle)

- 28 illusions en 5 familles (Mouvement, Lumière et contraste, Géométrie, Couleur, Hypnose). Chaque illusion = une fonction de dessin 2D `D[id](state)` + une fiche (auteur, ce qu'on voit, ce qui est vrai, explication) + ses réglages propres dans `ui()`.
- Outils : OBSERVER (fiche « on voit / en vrai »), RÉVÉLER (à maintenir ; l'interrupteur du panneau fait de même), MANIPULER (mesurer sa propre illusion : Müller-Lyer, Ebbinghaus, Poggendorff ; tourner les disques de Kanizsa ; zoomer les anneaux de Pinna ; vitesses).
- Le temps des illusions suit le temps réel à la vitesse ×1 (dt ÷ 0,4), pour que les durées perceptives (chasse au lilas, phi, toupie de Benham) soient justes.
- Spirale hypnotique et effet de cascade en WebGL2 (4 dessins, 4 palettes, bras, torsion, pulsation) ; repli 2D.
- Toupie de Benham : ne démarre qu'à la demande (photosensibilité).
- Échiquier d'Adelson : A = case sombre hors de l'ombre (0,48), B = case claire (0,8) dans l'ombre ×0,6 = 0,48 ; ombre douce dessinée dans le repère du plateau avec la même loi que le calcul.
- Triangle impossible en cubes (Reutersvärd) : trois barres de cubes en projection isométrique ; RÉVÉLER fait tourner la caméra et montre que les barres ne se touchent pas.

## 16. Le Jeu de la vie — `app/js/machines/s-vie.js` (id `vie`, nouvelle)

- WebGL2, grille torique RGBA32F : R = état (0 morte, 1 vivante, 2+ mourante pour les règles à générations), G = âge, B = traînée.
- Règles B/S/C : Conway, HighLife, Day & Night, Seeds, Labyrinthe, Corail, Diamoeba, Brian's Brain, Star Wars.
- Motifs RLE (planeur, vaisseau léger, canon de Gosper, pulsar, pentadécathlon, R-pentomino, gland, diehard) posés par texSubImage2D ; crayon, gomme et soupe par un petit shader de peinture.
- Lenia (Chan 2018) : noyau en anneau de rayon 13 (cœur exp(4 − 1/(r(1−r)))), croissance gaussienne μ = 0,15, σ = 0,015, dt = 0,1 (Orbium). Ensemencement par taches lisses dissymétriques : on voit en général une créature qui nage au bout de quelques dizaines de pas ; la soupe uniforme, elle, explose en labyrinthe.
- Réensemencement automatique si tout meurt (et, hors Lenia, si tout est figé depuis 25 s). Population lue une fois par seconde. Musique de la vie : la colonne centrale lue à chaque génération (pentatonique).

## 17. La Galaxie — `app/js/machines/s-galaxie.js` (id `galaxie`)

- **Spirale** : 70 000 à 210 000 étoiles dessinées en points (gl_VertexID, sans tampon de sommets) dans une cible HDR, avec halo (flou à trois niveaux) et ACES. Orbites calculées dans le shader : ellipses centrées dont l'orientation vaut a × torsion + Ωp t (ondes de densité, modèle cinématique de Kalnajs) ; l'étoile avance à ω(a) − Ωp dans le repère de l'ellipse. L'« embouteillage » (près du petit axe) module l'éclat des jeunes étoiles bleues et des régions H II, et la poussière (décalée vers le bord intérieur) est accumulée dans une cible à part puis absorbée (exp(−k·poussière)). Types : grand dessin, barrée, floconneuse, elliptique.
- **Collision** : problème restreint de Toomre (1972). Noyaux (2 à 4) en JS, saute-mouton adouci (ε² = 0,04) ; étoiles-tests sur GPU (positions et vitesses RGBA32F, une passe à sorties multiples). Orbite initiale parabolique de péricentre q. Unités : G = M = 1, longueur 10 kpc → 1 unité de temps ≈ 47 millions d'années. Scénarios : Antennes, Souris, Roue de charrette, Voie lactée et Andromède. L'outil ASTRE ajoute un noyau.
- **Trou noir** : par pixel, rayon intégré avec a = −1,5 h² r / r⁵ (rayon de Schwarzschild = 1), pas adaptatif ; disque mince de 3 à 14 rayons (profil de Shakura-Sunyaev), Doppler relativiste g = 1/(γ(1 − β·n)) et décalage gravitationnel √(1 − 1/r), intensité ∝ g⁴ ; images secondaires par transparence du disque. Résolution adaptative. L'outil OBSERVER relance le même rayon en JS pour dire ce que l'on touche (ombre, anneau de photons, disque côté approchant ou fuyant, image secondaire).
- Mesuré : avec Doppler, le côté approchant est environ deux fois plus lumineux à l'écran (après compression des hautes lumières).

## 18. Le Tunnel — `app/js/machines/s-tunnel.js` (id `tunnel`)

- **Vers la vitesse de la lumière** : 15 000 à 78 000 étoiles dans une boîte répétée de 400 unités, dessinées en points. Direction aberrée cos θ′ = (cos θ + β)/(1 + β cos θ), température × D (D = γ(1 + β cos θ′)), éclat physique ∝ D³ comprimé à l'écran (min(D², 8)) pour garder des étoiles distinctes ; projection équidistante (fisheye) de champ réglable jusqu'à 360°. Le fond cosmologique (2,725 K × D) est ajouté par pixel avec une brillance (T/2500)⁴ : visible vers γ ≈ 400, éblouissant vers γ ≈ 1 500. Réglage en log₁₀ γ (0 à 3,3). Bornes anti-débordement des flottants 16 bits (sinon : rectangles parasites).
- **Trou de ver** : métrique d'Ellis, r(l) = √(1 + l²). Par pixel : moment cinétique L = r sin α, intégration de (l, p_l, φ) avec dp_l/dλ = L² l / r⁴ ; le côté atteint (signe de l) choisit le ciel (le nôtre : étoiles, Voie lactée, une étoile proche ; l'autre : nébuleuse et géante gazeuse) ; direction d'arrivée = cos φ · (−z) + sin φ · t. La caméra traverse et revient (l = 7 cos ωt) ou se règle au curseur.
- **Porte des étoiles** : deux plans (et deux murs) de fentes lumineuses en perspective, à la manière du slit-scan de Trumbull.
- **Démoscène** : tunnel 1/r classique (damier, vortex, plasma), bout du tunnel déplaçable avec PILOTER.

## 19. La Lampe à lave — `app/js/machines/s-lave.js` (id `lave`)

- **Lampe** : grille ~80 × 300 dans le verre (profil en fuseau hw(y) = 0,17 + 0,29·exp(−((y − 0,24)/0,4)²)). Navier-Stokes semi-lagrangien + projection de Jacobi (cibles f16 filtrées en LINEAR). Cire = champ de phase de Cahn-Hilliard (μ = φ³ − φ − ε²∇²φ, mobilité 0,06, ε = 1 case), tension de surface par la force de Korteweg σμ∇φ. Température advectée et diffusée, ampoule (gaussienne en bas au centre), refroidissement en haut. Poussée sur la cire ∝ (T − 0,62) : la cire chaude monte. Socle et chapeau dessinés en 2D.
- **Cellules de Bénard** : même solveur, un seul liquide, plaque chaude en bas et froide en haut ; colorant passif en lignes ; nombre de Rayleigh affiché (estimation).
- **Surface du Soleil** : granulation procédurale (Voronoï animé, éclat ∝ (T/5800)⁷ en lumière visible), tache solaire (ombre, pénombre filamenteuse), assombrissement centre-bord ; teinte orangée des photographies filtrées.
- Piège : `in` est un mot réservé en GLSL (ne pas l'utiliser comme nom de variable).

## Molette de vitesse (coquille)

Le curseur de vitesse est remplacé par une molette dont on ne voit que la tranche crantée (`#wheel`, dessinée en canvas dans `shell.js`). Échelle logarithmique de ×0,05 à ×8 ; gain = 0,004 × (1 + min(7, (v/0,45)²)) par pixel, v = vitesse du geste en px/ms : lent = réglage fin, vif = grands pas ; un geste lancé garde un peu d'élan (décroissance 60 ms, au gain fin). Vibration à chaque cran (Android), double-touche = ×1, molette de souris et flèches du clavier. La valeur s'affiche dans la case à côté (« ×0,35 »).

## 20. Les Bulles — `app/js/machines/s-bulles.js` (id `bulles`)

- **Couleur du film** : réflectance d'une lame d'indice 1,33 (deux réflexions, déphasage 4πnd cos θt/λ + π), calculée pour 16 longueurs d'onde de 400 à 700 nm, intégrée avec les fonctions CIE 1931 (approximation de Wyman, Sloan et Shirley 2013), XYZ → sRGB, normalisée par la réflectance maximale 4r², saturation adoucie de 20 %. Piège rencontré : une normalisation trop forte rend les bulles opaques et criardes.
- **Bulles** : jusqu'à 12 sphères analytiques (uniformes), deux faces, reflet d'une fenêtre et du ciel, épaisseur = d₀(t) × (0,25 + 1,15 · haut^1,3) × (1 + 0,32 · tourbillons de Marangoni) ; le film s'amincit avec l'âge, la bulle éclate (trou qui s'agrandit, gouttelettes). Courants d'air, chocs doux, SOUFFLER pour créer une bulle ou un courant.
- **Film dans un cadre** : épaisseur en coin (1 600 nm × y^1,15) qui s'amincit avec le temps, déformée par des tourbillons (fbm) et par ceux lancés au doigt ; film noir en haut ; retrempé toutes les 45 s.
- **Caténoïde** : r(z) = a ch(z/a), a résolu par Newton (a ch(h/a) = 1) ; plus de solution au-delà de h/R = 0,6627 (Goldschmidt) : deux disques plats. Lancer de rayons par changement de signe + dichotomie, deux surfaces visibles ; anneaux en laiton par marche sur la distance au tore.
- `s-cosmos.js` ne contient plus que le Visualiseur et la Harpe (catégorie Sons).

