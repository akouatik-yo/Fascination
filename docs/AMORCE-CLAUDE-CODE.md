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
- **Sable** (octobre 2026, 2D) : voir §11.
- **Méduses** : 5 espèces (Aurelia, Chrysaora, Atolla, Aequorea, cténophore), nage par contraction, tentacules simulés physiquement, champ de courants, plancton bioluminescent, outils courant, lumière et éclosion. *Pas encore de `ui()` ni de `clear()`.*
- **Fourmilière** : *Lasius*, *Atta* (coupe-feuille), *Eciton* (raids), phéromones, vue chimie. *Pas encore de `ui()` ni de `clear()`.*
- **Mycélium** : 4 champignons (neutre, symbiote, craintive, prédatrice), onde électrique, murs, `ui()` complet.
- **Blob** : modèle de Jones, 3 espèces, expériences (labyrinthe, réseau ferré de France, cercle d'avoine, duel), éclat néon, `ui()` complet.
- **Lucioles** : 5 espèces (synchrones, dialogue pyralis, femme fatale *Photuris*, *Pteroptyx* sur l'arbre, vers luisants), outils signal, torche, pose longue, lune et pollution lumineuse.
- **Murmuration** : boids en 3D, voisinage topologique (7 voisins), étourneaux au marais et bécasseaux sur l'estran, faucon pèlerin, vagues de panique, coucher de soleil puis plongée au dortoir.

Machines **encore dans leur version d'origine**, à retravailler une par une : Foudre, Cristal, Réaction-diffusion, Spirales, Cymatiques, Kaléidoscope, Harmonographe, Attracteur, Fractal, Moiré, Galaxie, Tunnel, Lampe à lave, Bulles, Visualiseur, Harpe.

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

## 11. Le Sable — `app/js/machines/s-sable.js`

- **Automate granulaire en 2D** (pas de WebGL : le calcul est local et rapide, ~3 ms par pas en qualité moyenne). Chaque case garde sa matière, sa teinte, sa couleur teinte, sa vitesse de chute et son humidité.
- **Règles** : chute accélérée (jusqu'à 7 cases par pas) ; glissement en diagonale puis roulement de deux cases, dont les probabilités fixent l'angle de repos de chaque sable ; dans l'eau, chute freinée et dérive ; **cohésion du sable mouillé** (ponts capillaires) seulement à l'air libre, jamais sous l'eau ; humidité qui se propage par capillarité et sèche au soleil ; bulles d'air qui remontent ; grains projetés en vol (souffle, fourmilion).
- **Sables** : quartz, basalte, sable rose (*Homotrema rubrum*), olivine, gravier (effet noix du Brésil quand on secoue).
- **Vivant** : fourmilions (*Myrmeleon formicarius*) qui creusent en projetant le sable jusqu'à une profondeur cible, bombardent les fourmis qui glissent, puis se métamorphosent ; fourmis moissonneuses (*Messor barbarus*) en file entre la droite et le nid ; la plupart contournent les entonnoirs (en 3D il y a de la place), certaines y glissent.
- **Scènes** : Fourmilions (dune au couchant), Sablier (débit mesuré au goulot, voûtes qui bloquent un goulot étroit, retournement automatique), Tableau de sable (strates teintes sur une cloison percée, dans l'eau ; se retourne seul), Château de sable (marée, ressac, séchage au soleil, reconstruction).
- **Son** : sifflement du sable qui coule, « chant des dunes » (bourdon grave) pendant les grosses avalanches.
- **Rendu** : image à deux pixels par case, ombrage selon la profondeur sous la surface, éclat du quartz, sable mouillé plus sombre ; retournement animé.
- **Limite connue** : l'angle de repos naît des probabilités de glissement ; il est réaliste à quelques degrés près, pas mesuré précisément.
