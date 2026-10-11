# Tour 2 : Hugo Martin, architecte logiciel front-end

> Ma règle : on ne modifie **aucun moteur**. Tout passe par le contrat existant `make(env) → { frame, down/move/up, ui, clear, dispose }`. Ce que ce contrat ne permet pas, on ne le promet pas aux enfants.

## 0. Ce que dit le code (et qui change le débat)

- **`ui()` ne porte aucun identifiant.** Chaque appel renvoie une liste neuve d'objets `{type, label, value, set}` avec des libellés français. La liste change selon la scène et l'état : « Virole des becs Bunsen » n'apparaît que s'il y a un bec, et le bouton « Au dortoir » devient « Réveil ». **Une scène n'a pas d'état lisible.** C'est un bouton (`act: () => setScene('tests')`) dans 29 machines, et un `choice` dans la Murmuration (« Lieu › Espèce et paysage »). Le shell doit donc *mémoriser lui-même* la scène en cours.
- **Le décor et le thème ne réinitialisent déjà plus rien** : `env.decor` et `env.theme` sont lus en direct dans `frame`. Le son est corrigé. Restent trois causes. **Le Zen** : la barre est dans le flux flex, la zone de jeu change de taille, donc `onResize` et `disposeSim/build`. **Tout redimensionnement**, rotation comprise. Et une cause que personne n'a citée, **le régulateur de résolution** : `govTick` refait `disposeSim(); build()` entre la 1re et la 4e seconde si la machine rame. C'est une réinitialisation involontaire, qui effacerait en plus le tirage au hasard.
- **`env.view` n'a que `x0/x1`.** La plupart des machines le relisent à chaque image. La Fourmilière et le Mycélium le figent à la construction (`const V0 = env.view`). Les mises en page dépendent de `H` (« sol » à `H*0.8` dans le Feu). Aucune machine ne sait changer de taille.
- **22 machines** créent un contexte WebGL2 hors écran (`GLKit`) et le recopient dans le canevas 2D principal. `dispose()` appelle `lose()`.
- Plusieurs machines gardent des réglages **au niveau du module** (`const keep = {…}` : Mycélium, Fourmilière, Harpe, Attracteur…). Ils survivent à un « Recommencer ».
- **Android** : `configChanges="orientation|screenSize…"`, donc l'activité n'est pas recréée à la rotation et la WebView reçoit seulement un `resize`. Deux pièges dans l'APK : la PHOTO passe par `<a download>`, alors qu'aucun `DownloadListener` n'est branché (à vérifier, ça échoue sans doute en silence) ; et le micro du Spectre (`getUserMedia`) n'a ni permission `RECORD_AUDIO` ni `onPermissionRequest`.

## 1. Architecture du dépôt

```
app/                      version adulte : on n'y touche pas
  js/fk.js fkgl.js fk-son.js bruits.js        ← partagés
  js/machines/s-*.js                          ← partagés (36 fichiers, 32 machines)
jeunesse/
  index.html              charge ../app/js/fk*.js, ../app/js/machines/*.js, puis ses propres scripts
  css/jeunesse.css
  js/noyau.js             boucle, canevas, pointeur, cadrage, régulateur, garde audio
  js/pilote.js            résolution des chemins ui(), scènes, réglages, instantanés
  js/hasard.js            générateur à graine, sac de machines, tirages
  js/ui-*.js              barre de gestes, tiroirs, labo, carte, cartes « Pourquoi », coin des parents
  js/carnet.js            stockage (étape tardive)
  meta/feu.js … meta/vie.js   une fiche par machine → window.FJ_META[id]
  icones/gestes.svg       une planche de <symbol>
  vignettes/*.webp        générées par un script, jamais à la main
  polices/atkinson-*.woff2
tools/
  build.mjs  [adulte|jeunesse]     même mécanisme <!--build:…-->, chemins résolus depuis le dossier de l'index
  build-apk.mjs [adulte|jeunesse]
  inventaire-ui.mjs                vide ui() de chaque machine × scène → tools/out/ui.json
  test/*.mjs                       Playwright
```

**Le noyau est une copie adaptée des ~250 lignes utiles de `shell.js`, pas une extraction.** Il reprend la boucle (avec `smoothTime`, `livePaused` et `SPEED_UNIT`), le pointeur, la garde `AudioContext` et `visibilitychange`, et le régulateur. Extraire un module commun obligerait à retoucher `shell.js` et à risquer la version adulte. Une fois le noyau éprouvé, l'adulte pourra l'adopter et récupérer gratuitement la correction du Zen.

**Assemblage.** `build.mjs jeunesse` lit `jeunesse/index.html` et produit `dist/jeunesse.html`. Les polices Atkinson et les vignettes y sont intégrées en data URI : aucun appel réseau, même hors APK. Le contrôle de syntaxe `new Function` s'applique aussi aux fiches `meta/*.js`. Comme ce sont des fichiers JavaScript (pas du JSON), on peut y écrire des commentaires et partager des constantes.

**APK.** Les deux applications doivent pouvoir s'installer côte à côte. `build-apk.mjs jeunesse` passe `--rename-manifest-package fr.fascinations.jeunesse` à `aapt2 link`, réécrit le libellé (« Fascinations Jeunesse ») et ajoute `android/res-jeunesse/` (icônes) en surcouche. Le code Java est le même, avec deux ajouts derrière un drapeau d'asset (`assets/origine-https`) :
1. une **origine virtuelle** : `shouldInterceptRequest(WebView, String)` (API 11, donc compilable contre l'API 16 actuelle) sert `https://fascinations.local/*` depuis `getAssets()`. On obtient une vraie origine https : IndexedDB fiable, `navigator.storage.persist()`, plus aucun souci CORS en `file://` ;
2. une interface `@JavascriptInterface enregistrer(base64, nom)` qui écrit dans `MediaStore` (pour la PHOTO).

## 2. Les métadonnées par machine

### 2.1 Relier une fiche à `ui()` : des chemins « Rubrique/Libellé » normalisés

Un indice de position est trop fragile : les listes changent avec l'état. Ajouter un identifiant dans les moteurs n'est pas nécessaire. On désigne donc chaque contrôle par **la rubrique (`section`) qui le précède et son libellé**. Les deux sont normalisés : sans accents ni ponctuation, en minuscules, et les apostrophes ’ et ' sont confondues. Pour un groupe de `buttons`, chaque bouton devient son propre chemin.

```js
const norme = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();
function indexer(ui) {                       // à refaire après CHAQUE set/act : ui() change
  const idx = new Map(); let sec = '';
  for (const c of ui) {
    if (c.type === 'section') { sec = norme(c.label); continue; }
    const put = (lab, o) => { let k = sec + '/' + norme(lab); while (idx.has(k)) k += '+'; idx.set(k, o); };
    if (c.type === 'buttons') (c.items || []).forEach((it) => put(it.label, { kind: 'bouton', c, it }));
    else if (c.label) put(c.label, { kind: c.type, c });
  }
  return idx;
}
```

On rend cette méthode robuste **par un test, pas par de l'heuristique**. `inventaire-ui.mjs` parcourt chaque machine et chaque scène, et le test « contrat » échoue si un chemin cité dans une fiche ne se résout pas là où la fiche l'attend. Si Yoann renomme un curseur dans la version adulte, la CI le signale aussitôt. Au moment de l'exécution, un chemin introuvable masque simplement le réglage et laisse une trace en console. Ce test passe deux fois, **avec et sans WebGL** : le repli 2D du Feu a un autre `ui()`, et une tablette sans cibles flottantes doit continuer à fonctionner.

### 2.2 Exemple complet : le Feu et la Murmuration

```js
FJ_META.feu = {
  titre: 'Pourquoi une flamme est-elle pointue ?',
  scenes: {
    cheminee:   { nom: 'La cheminée', via: { bouton: 'scenes/cheminee' }, essaie: 'Souffle doucement sur les braises.' },
    camp:       { nom: 'Feu de camp', via: { bouton: 'scenes/feu de camp' } },
    faraday:    { nom: 'La bougie',   via: { bouton: 'scenes/bougie de faraday' } },
    tests:      { nom: 'Flammes de couleur', via: { bouton: 'scenes/tests de flamme' }, essaie: 'Jette du sel dans une flamme.' },
    apesanteur: { nom: 'Dans l’espace', via: { bouton: 'scenes/apesanteur' } },
  },
  outils: {
    observer: { icone: 'loupe', verbe: 'Regarde' },
    souffle:  { icone: 'souffle', verbe: 'Souffle' },
    poser:    { icone: 'buche', verbe: 'Pose', palette: 'poser/element pose par l outil poser' },
    sel:      { icone: 'pincee', verbe: 'Saupoudre', palette: 'sels/sel jete par l outil sel' },
    eau:      { icone: 'goutte', verbe: 'Arrose' },
  },
  reglages: {                       // noms d'enfant ; le labo garde les vrais noms
    gravite: { chemin: 'physique/gravite', nom: 'Gravité', bouts: ['espace', 'Terre', 'géante'] },
    oxygene: { chemin: 'physique/oxygene dans l air', nom: 'Air', bouts: ['étouffant', 'très riche'] },
    vent:    { chemin: 'physique/vent', nom: 'Vent', bouts: ['← fort', 'fort →'] },
    remous:  { chemin: 'physique/turbulence', nom: 'Remous', bouts: ['calme', 'agité'] },
  },
  exposes: { '*': ['vent', 'oxygene', 'gravite'], tests: ['oxygene', 'remous'] },
  actions: ['le foyer/raviver', 'le foyer/remettre une buche'],   // bulles près de la barre de gestes
  recettes: [
    { nom: 'Tempête', icone: 'tornade', regle: { vent: 0.8, remous: 0.9, oxygene: 26 } },
    { nom: 'Feu sur la Lune', icone: 'lune', scene: 'camp', regle: { gravite: 0.17 } },
    { nom: 'Presque étouffé', icone: 'bocal', regle: { oxygene: 14 } },
  ],
  hasard: {
    scenes: { cheminee: 3, camp: 3, faraday: 1, tests: 2, apesanteur: 1 },
    plages: { '*': { vent: [-0.35, 0.35], oxygene: [19, 27], remous: [0.3, 0.7] } },
    graines: [{ nom: 'Feu de camp sur la Lune', scene: 'camp', regle: { gravite: 0.17 }, poids: 2 }],
    interdits: [{ oxygene: ['<', 15] }],            // jamais un écran éteint au départ
    outil: { tests: 'sel', '*': 'souffle' },
  },
  pourquoi: { etincelle: '…', secret: '…', plusLoin: '…' },   // textes : Claire et Sofia
  etSi: [{ id: 'lune', question: 'Et si on allumait une bougie sur la Lune ?',
           choix: ['plus haute', 'plus ronde', 'elle s’éteint'], prepare: { scene: 'faraday' },
           essaie: { regle: { gravite: 0.17 } }, focus: 'gravite', revele: '…' }],
  merveilles: [
    { id: 'flamme-verte', nom: 'La flamme verte', indice: 'On dit qu’un métal rend le feu vert…',
      quand: { scene: 'tests', outil: 'sel', geste: 'touche', choix: { 'sels/sel jete par l outil sel': ['cu', 'ba', 'b'] } } },
    { id: 'bougie-espace', nom: 'La bougie de l’espace',
      quand: { scene: 'faraday', regle: { gravite: ['<=', 0.03] }, pendant: 3 } },
  ],
  rotation: 'garder',     // ce qu'on construit (bûches posées) ne se recrée pas
};

FJ_META.boids = {
  titre: 'Qui est le chef de la nuée ?',
  scenes: {
    marais: { nom: 'Étourneaux au marais', via: { choix: 'lieu/espece et paysage', valeur: 'marais' } },
    estran: { nom: 'Bécasseaux sur la plage', via: { choix: 'lieu/espece et paysage', valeur: 'estran' } },
  },
  outils: { guider: { icone: 'doigt', verbe: 'Guide' }, effrayer: { icone: 'mains', verbe: 'Effraie' },
            faucon: { icone: 'faucon', verbe: 'Chasse' }, nuee: { icone: 'oiseaux', verbe: 'Lâche' } },
  reglages: {
    ensemble: { chemin: 'regles de la nuee/cohesion', nom: 'Rester ensemble', bouts: ['chacun pour soi', 'collés'] },
    meme:     { chemin: 'regles de la nuee/alignement', nom: 'Voler pareil', bouts: ['en vrac', 'en rang'] },
    voisins:  { chemin: 'regles de la nuee/voisins suivis', nom: 'Voisins regardés', bouts: ['1', '24'] },
    nombre:   { chemin: 'la nuee/nombre d oiseaux', nom: 'Oiseaux', bouts: ['quelques-uns', 'une marée'] },
    heure:    { chemin: 'le soir/heure', nom: 'Heure', bouts: ['jour', 'nuit'] },
  },
  exposes: { '*': ['ensemble', 'meme', 'voisins'] },
  actions: ['faucon pelerin/lancer une attaque', 'regles de la nuee/valeurs naturelles'],
  recettes: [{ nom: 'Panique', icone: 'eclair', regle: { ensemble: 0.4, voisins: 3 } },
             { nom: 'Crépuscule', icone: 'lune', regle: { heure: 0.85 } }],
  hasard: { scenes: { marais: 2, estran: 1 },
            plages: { '*': { heure: [0.1, 0.7], nombre: [2500, 7000], voisins: [5, 9] } },
            outil: { '*': 'faucon' } },
  merveilles: [{ id: 'ordre', nom: 'La nuée parfaite', quand: { lire: { 'la nuee/ordre polarisation': ['>=', 0.92] }, pendant: 5 } }],
  rotation: 'recreer',    // rien de construit à perdre : on reconstruit avec les mêmes réglages
};
```

Les **prédicats sont déclaratifs**, sans `eval`. Ils lisent les `value` de `ui()` (curseurs, choix, et même les jauges `bar`), l'outil actif, le dernier geste, la scène mémorisée et une durée `pendant`. Un seul échantillonneur appelle `ui()` toutes les 500 ms, et le labo, les merveilles et les cartes « Et si » partagent sa lecture. Ce que `ui()` ne laisse pas voir (l'éclair tombé sur le paratonnerre) passe par « Je l'ai vu ! » et une photo.

### 2.3 Appliquer une scène et un tirage par `ui()` seulement

```js
async function appliquer(meta, t) {                // t = { scene, regle: { vent: 0.2, … } }
  if (t.scene) {
    const v = meta.scenes[t.scene].via, idx = indexer(sim.ui());
    if (v.bouton) idx.get(v.bouton)?.it.act(); else idx.get(v.choix)?.c.set(v.valeur);
    S.scene = t.scene;                             // le shell est la seule mémoire de la scène
    await images(2);                               // certaines scènes se reconstruisent à l'image suivante
  }
  for (const [nom, val] of Object.entries(t.regle || {})) {
    const r = indexer(sim.ui()).get(meta.reglages[nom].chemin);   // relu à chaque fois
    if (!r) { console.info('FJ : absent', nom); continue; }
    if (r.kind === 'slider') r.c.set(clamp(val, r.c.min, r.c.max));
    else if (r.kind === 'toggle') { if (!!r.c.value !== !!val) r.c.set(!!val); }
    else if (r.kind === 'choice') r.c.set(r.c.options.find((o) => o.id === val || norme(o.label) === norme(val)).id);
  }
}
```

**La scène passe toujours en premier**, parce que `setScene` du Feu remet `g`, `o2`, `wind` et `turb` à leurs valeurs d'origine. Toutes les scènes choisies dans l'interface jeunesse (cartes, labo, recettes) passent par cette même fonction : le shell sait donc toujours quelle scène tourne. Le tirage se fait avec un générateur à graine (mulberry32) dont la graine est conservée. Le moteur, lui, continue d'utiliser `Math.random`. Pour la même raison, l'**instantané** (`instantane()` : chaque `slider`, `toggle` et `choice` lu dans `ui()`, plus la scène) est toujours possible. L'état du monde (le château, les bûches), lui, ne l'est pas.

## 3. Zéro réinitialisation involontaire

| Cause | Solution |
|---|---|
| Son | déjà fait (`drone` différé, `whenLive`) |
| Zen / Spectacle, tiroirs, labo, carte | le canevas occupe **toujours** 100 % de la fenêtre (`position: fixed; inset: 0`) et tout le reste se pose par-dessus. Aucun élément de l'interface ne change sa taille. |
| Décor, thème | déjà lus en direct ; le thème quitte l'interface enfant et va au coin des parents |
| Régulateur | il ne reconstruit **que si l'enfant n'a pas encore touché** à la machine, et réapplique alors scène et instantané ; sinon il mémorise le palier pour la prochaine visite |
| Rotation, fenêtre redimensionnée | voir ci-dessous |

**Les options pour la rotation :**
- *Canevas carré au plus grand côté* : il coûte 1,6 fois plus de pixels (2560² contre 2560×1600 en pixels physiques, soit 26 Mo au lieu de 16 Mo pour le seul canevas 2D, et autant de plus sur les cibles flottantes RGBA16F à 8 octets par pixel). Le régulateur ne baisse que le `dpr`, alors que les machines calculées sur le processeur (Fourmilière, Mycélium, Blob, Sable 2D) dimensionnent leurs grilles en pixels CSS : il ne les soulagera pas. Surtout, les mises en page dépendent de `H`. Le « sol » du Feu à `H*0.8` serait rogné en paysage, et `env.view` ne sait pas exprimer une coupe verticale. **Écarté.**
- *Recréer avec sauvegarde de l'état* : c'est impossible, l'état est enfermé dans des fermetures (closures). On peut seulement réappliquer scène et réglages.
- *Boîte aux lettres (« letterbox »)* : on garde le canevas, on le met à l'échelle « contain » et on le centre. Cela ne coûte rien.

**Mon choix : une politique hybride, fondée sur la boîte aux lettres.**
1. La taille du canevas reste fixe pendant toute la visite : c'est celle de la fenêtre au moment de `build`.
2. Après une rotation, si l'enfant **n'a encore rien touché** depuis le dernier `build` ou le dernier changement de scène, ou si la fiche dit `rotation: 'recreer'` (Ciel, Kaléidoscope, Fractales, Illusions, Tunnel, Murmuration…), le shell reconstruit à la nouvelle taille et réapplique scène et instantané. Comme il n'y a rien à perdre, c'est invisible.
3. Sinon, l'image est mise à l'échelle et centrée, avec des bandes de la couleur du fond, et une pastille « ↻ Remplir l'écran » propose la reconstruction (avec confirmation, car le monde construit sera perdu). Le prochain changement de scène ou de machine reconstruit de toute façon à la bonne taille.

Prenons le pire cas : une construction en paysage affichée en portrait. Le canevas 1280×800 tient alors dans 800×500 (39 % de l'écran). Ce n'est pas beau, mais le château de sable est intact. Ce cas ne survient que si l'enfant tourne la tablette *après avoir construit*.

**Ce qui change dans `env` :** `env.view` devient **constant pendant la visite**, `{ x0: 0, x1: W, y0: 0, y1: H }`. Il ne bouge plus à l'ouverture d'un tiroir, sinon la Fourmilière (qui fige `V0`) et les autres machines se contrediraient. Les champs `y0/y1` sont ignorés aujourd'hui et prêts pour plus tard. Le pointeur se convertit : `x = (clientX - r.left) * env.w / r.width`. Une fonction `versEcran(x, y)` sert à placer la main fantôme et les bulles.

## 4. Faisabilité des idées du premier tour

**Le cœur indispensable**
- Canevas plein écran, habillage en surimpression, politique de rotation : **moyen**, le reste en dépend.
- Pilote `ui()`, hasard à graine, sac de machines sans répétition, fiches minimales (scènes, plages) : **moyen**. Le code est petit, mais il faut 32 fiches.
- Barre de gestes avec icônes SVG (les outils ont des `id` stables, donc aucun problème de libellé) : **faible**.
- Tiroir « Bidouiller » (3 ou 4 réglages, recettes, boutons d'action) : **faible**.
- **Labo intégral** : c'est `makeControl` (90 lignes) qui existe déjà, restylé, avec une ligne de traduction par chemin. **Faible.**
- Cartes « Pourquoi » (titre-question, « Essaie ça », trois profondeurs) : le code est **faible**, l'écriture est **lourde**.
- Carte des machines avec **vignettes fixes**, générées par `tools/vignettes.mjs` (Playwright, une par machine et par scène, WebP d'environ 15 Ko) : **faible**.
- Atkinson Hyperlegible intégrée (OFL, 2 graisses, environ 60 Ko) et coin des parents (appui long) : **faible**.

**Une bonne deuxième vague**
- Moteur des cartes « Et si ? » : **faible**. Mais chaque carte doit être validée sur la vraie machine (règle d'or de Claire). On en publie 6 à 10, puis on en ajoute.
- Main fantôme : une animation CSS d'une main en SVG, avec un trajet en coordonnées de `view`. **Faible.**
- Sons d'interface : `SoundKit.note`, donc coupés avec le son. **Faible.**
- Carnet en IndexedDB avec photos : **moyen**. Photos en JPEG 0,85, au plus 1600 px, avec une miniature de 320 px, et 200 photos au maximum. Le PNG pleine taille actuel pèse entre 3 et 6 Mo.
- Merveilles par prédicats : le moteur est **faible**, les 120 textes et leur validation sont **lourds**.
- Avant/après : deux photos et la différence entre deux instantanés. **Faible**, une fois le carnet en place.
- Tirages nommés : des fragments de texte par réglage. **Faible.**
- Fils rouges : ce sont des métadonnées et une vue de la carte. **Faible.**
- « Rejouer ce moment » : on rejoue la graine, la scène et les réglages, et on remplace `Math.random` par un générateur à graine *pendant `make` seulement*. Le départ est identique, la suite diverge, et il faut l'appeler honnêtement « Rejouer le départ ».

**Trop cher ou risqué**
- Vignettes animées en direct : un contexte WebGL et une simulation par vignette, c'est impossible. Des WebP animés coûteraient environ 6 Mo.
- Dessins mystère : il faut régler finement les cibles machine par machine.
- Détection par analyse des pixels (« flamme verte » d'après les teintes) : la lecture GPU vers CPU provoque des saccades sur tablette. À réserver à 2 ou 3 cas, si jamais.
- Balayer l'écran pour changer de machine : le canevas capte tous les doigts. Les flèches restent.
- Ponts : ils dépendent des merveilles. À faire en dernier.

**Pièges**
- **Contextes WebGL** : Chrome en garde au plus environ 16 actifs. Faire défiler les machines « des centaines de fois » crée et perd un contexte par machine. Pour éviter de construire et détruire dix machines par seconde, la flèche affiche d'abord la vignette, et la construction n'a lieu qu'après 300 ms sans nouvel appui.
- **`backdrop-filter`** posé sur un canevas animé oblige à recalculer le flou à chaque image, et le panneau adulte le fait déjà. Pour les tiroirs, on préfère un fond `rgba(10, 10, 16, 0.85)` sans flou. Même chose pour le filtre PSYCHÉ : on le réserve au Spectacle.
- **IndexedDB en `file://`** : son comportement varie selon les versions de la WebView. D'où l'origine virtuelle, un test d'écriture au démarrage et un repli sur `localStorage` (sans photos).
- **Mémoire** : le moteur de rendu de la WebView est un processus séparé, et `largeHeap` ne l'aide pas. Il faut garder une seule machine vivante à la fois.
- **Tablettes sans `EXT_color_buffer_float`** : le Feu, l'Eau et d'autres basculent sur leur repli 2D, avec un autre `ui()`. Les fiches doivent tolérer les chemins absents.

## 5. Plan de réalisation

1. **Filet de sécurité.** `inventaire-ui.mjs` (machines × scènes → `ui.json`, la référence pour écrire les fiches), un test commun et le test de fumée adulte rendu obligatoire. *Testable : la version adulte reste intacte.*
2. **Noyau jeunesse.** Plein écran, boucle, pointeur converti, régulateur corrigé, politique de rotation, flèches ‹ › et son. Aucune autre interface. *Tests : pas de réinitialisation, rotation, contextes.*
3. **Pilote et hasard.** Résolveur, `appliquer`, instantané, générateur à graine, sac, et 32 fiches minimales (scènes, plages, outil de départ). *Tests : contrat, hasard, toutes les machines.*
4. **Habillage.** Barre de gestes et icônes, cartes de scènes, Bidouiller, labo, Atkinson, coin des parents, photo. **Premier livrable** : `dist/jeunesse.html` et un APK jeunesse installable à côté de l'adulte.
5. **Textes et carte.** Les cartes « Pourquoi » des 32 machines, relues par Claire, et la carte avec ses vignettes générées. **Version 1.**
6. « Et si ? » validées, main fantôme, sons d'interface.
7. Carnet (stockage, photos, merveilles, « Je l'ai vu »), avant/après.
8. Fils rouges, tirages nommés, « Rejouer le départ », ponts.

**Tests automatiques** (Playwright sans écran, `--use-angle=swiftshader` comme `smoke.mjs`, avec un crochet `window.FJ_TEST` actif seulement si `?test`) :
- **Toutes les machines** : pour chaque machine × scène de la fiche, aucune `pageerror`. Le canevas n'est pas uniforme après 1,5 s : on mesure la variance d'un échantillon de 16×16 pixels, pour qu'il n'y ait jamais d'écran vide.
- **Contrat** : chaque chemin des fiches se résout, avec et sans WebGL (`--disable-webgl` : avertissements seulement).
- **Pas de réinitialisation** : on enveloppe chaque `def.make` d'un compteur. On pose une bûche (outil POSER), puis on bascule le son, le Spectacle, les tiroirs, le labo, le thème, le décor et la pause. Le compteur ne bouge pas, l'objet `sim` est le même, et la note « N bûches » est inchangée.
- **Rotation simulée** : `setViewportSize(1280×800 → 800×1280)`. Après un toucher : `make` n'est pas rappelé, le canevas est en « contain », et un clic au centre de l'écran donne `down(W/2, H/2)`. Sans toucher : `make` est appelé une fois de plus, et la scène et les valeurs de l'instantané sont identiques.
- **Régulateur** : on force une image lente (`FJ_TEST.lent`). Il n'y a pas de reconstruction après un toucher.
- **Hasard** : une même graine donne le même tirage. Sur 200 tirages par machine, tout reste dans les plages, aucun interdit n'apparaît, et chaque scène est tirée au moins une fois. Sur 50 démarrages, le sac ne répète pas les 5 dernières machines.
- **Contextes** : on compte `getContext('webgl2')` contre `loseContext` sur 100 changements de machine : au plus 2 vivants, et jamais l'avertissement « Too many active WebGL contexts ».
- **Hors ligne** : `dist/jeunesse.html` est chargé avec `page.route('**', abort)` pour tout ce qui n'est pas `file:` : aucune requête, polices présentes.
- **Stockage** : on écrit puis relit le carnet, et le repli fonctionne quand `indexedDB.open` lève une erreur.

Une même graine, un même chemin, un même compteur de `make` : si ces trois tests restent verts, Yoann peut ajouter des fiches et des textes pendant des mois sans jamais toucher au noyau.
