/* Fascination — Les Illusions · le cerveau qui voit ce qui n'est pas là
   Une trentaine d'illusions d'optique, fixes ou animées, rangées en familles (mouvement, lumière, géométrie,
   couleur, hypnose). Chacune a ses réglages ; l'outil RÉVÉLER (à maintenir) démasque le trucage, l'outil MANIPULER
   permet de mesurer sa propre illusion (Müller-Lyer, Ebbinghaus, Poggendorff…). La spirale hypnotique et l'effet
   de cascade sont dessinés en WebGL2 (repli 2D). Le temps des illusions suit le temps réel à la vitesse ×1. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const ease = (k) => k * k * (3 - 2 * k);

  /* ───────── spirales (WebGL2) ───────── */
  const FS_SPI = HEAD + `
uniform vec2 uRes, uC; uniform float uT, uR, uArms, uType, uPal, uTwist, uPulse, uMask;
out vec4 o;
vec3 hsv(float h, float s, float v){ vec3 k = clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); return v * mix(vec3(1.), k, s); }
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 p = (px - uC) / uR;
  float r = length(p), a = atan(p.y, p.x);
  float k = uTwist * (1. + uPulse * .18 * sin(uT * 1.3));
  float v;
  if (uType < .5) v = sin(uArms * a + k * 18. * r - uT);                        // Archimède
  else if (uType < 1.5) v = sin(uArms * a + k * 4. * log(r + 1e-4) - uT);       // logarithmique
  else if (uType < 2.5) v = sin(k * 7. * log(r + 1e-4) - uT * 1.5);             // tunnel
  else v = sin(uArms * a + k * 16. * r - uT) * sin(uArms * a - k * 16. * r - uT * .6); // double
  float w = fwidth(v) * 1.2;
  float b = smoothstep(-w, w, v);
  vec3 c0, c1;
  if (uPal < .5){ c0 = vec3(0.); c1 = vec3(1.); }
  else if (uPal < 1.5){ c0 = vec3(.16, .02, .3); c1 = vec3(1., .78, .3); }
  else if (uPal < 2.5){ c0 = vec3(0.); c1 = vec3(.9, .08, .1); }
  else { c0 = hsv(fract(r * .6 - uT * .05), .85, .2); c1 = hsv(fract(r * .6 - uT * .05 + .5), .8, 1.); }
  vec3 col = mix(c0, c1, b);
  col *= mix(1., smoothstep(1.02, .98, r), uMask);
  col += vec3(1., .2, .2) * smoothstep(.022, .012, r) * uMask; // point de fixation
  o = vec4(col, 1.);
}`;

  /* ───────── catalogue ───────── */
  const FAM = [
    { id: 'mouvement', nom: 'Mouvement' },
    { id: 'lumiere', nom: 'Lumière et contraste' },
    { id: 'geometrie', nom: 'Géométrie' },
    { id: 'couleur', nom: 'Couleur' },
    { id: 'hypnose', nom: 'Hypnose' },
  ];
  // nom, famille, auteur, ce qu'on voit, la vérité
  const ILL = {
    serpents: { f: 'mouvement', nom: 'Serpents tournants', aut: 'Akiyoshi Kitaoka, 2003', voit: 'Les disques tournent tout seuls, surtout dans le coin de l’œil.', vrai: 'L’image est parfaitement immobile.', why: 'Chaque écaille enchaîne noir, sombre, blanc, clair. Les zones contrastées sont traitées un peu plus vite que les autres : le cerveau lit ce décalage comme un mouvement. L’effet faiblit là où l’on regarde, et revient quand l’œil bouge.' },
    pinna: { f: 'mouvement', nom: 'Anneaux de Pinna', aut: 'Baingio Pinna et Gavin Brelstaff, 2000', voit: 'Quand l’image grandit, les deux anneaux tournent en sens contraires.', vrai: 'Les carrés ne font que s’éloigner du centre, sans tourner.', why: 'Les neurones du début de la vision ne voient le mouvement qu’à travers de petites fenêtres : chaque carré incliné semble glisser de travers. Le cerveau additionne ces glissements en une rotation. Avec MANIPULER, glissez de haut en bas pour zoomer vous-même.' },
    cascade: { f: 'mouvement', nom: 'Effet de cascade', aut: 'Robert Addams, 1834', voit: 'Après la rotation, la spirale immobile semble tourner et se dilater en sens inverse.', vrai: 'La spirale est arrêtée.', why: 'En regardant les chutes de Foyers, en Écosse, Robert Addams vit ensuite les rochers remonter. Les neurones qui détectent un sens de mouvement se fatiguent ; à l’arrêt, leurs rivaux l’emportent un moment. Fixez le point rouge jusqu’au bout.' },
    pieds: { f: 'mouvement', nom: 'Pieds qui marchent', aut: 'Stuart Anstis, 2003', voit: 'Les deux rectangles avancent l’un après l’autre, comme des pieds.', vrai: 'Ils glissent ensemble, à vitesse constante.', why: 'Sur une rayure de même teinte que lui, un rectangle perd ses bords et semble ralentir ; sur une rayure contrastée, il semble accélérer. Le jaune et le bleu alternent en opposition. Regardez entre les deux.' },
    lilas: { f: 'mouvement', nom: 'Chasse au lilas', aut: 'Jeremy Hinton, 2005', voit: 'Un point vert tourne en rond, et les taches lilas finissent par disparaître.', vrai: 'Il n’y a aucun point vert : seulement une tache lilas qui s’absente à tour de rôle.', why: 'Le trou laissé par la tache qui s’éteint laisse une image rémanente verte (la couleur complémentaire), qui saute de place en place : le phénomène phi en fait un mouvement. En fixant la croix, l’effet de Troxler efface les taches floues. Fixez la croix 20 secondes.' },
    enseigne: { f: 'mouvement', nom: 'Enseigne de barbier', aut: 'Hans Wallach, 1935', voit: 'Les rayures montent dans la fenêtre haute et filent de côté dans la fenêtre large.', vrai: 'Elles avancent toujours de la même façon.', why: 'Une ligne vue par une fenêtre ne dit pas comment elle glisse le long d’elle-même : c’est le problème de l’ouverture. Le cerveau tranche grâce aux coins de la fenêtre. Changez la forme de la fenêtre, ou RÉVÉLEZ.' },
    carre: { f: 'mouvement', nom: 'Carré qui respire', aut: 'Simone Gori et Kai Hamburger, 2006', voit: 'Le carré enfle et se contracte.', vrai: 'C’est un carré rigide qui tourne derrière quatre caches invisibles.', why: 'On ne voit que des morceaux de bords, et le cerveau reconstruit la forme la plus simple qui leur corresponde : une forme qui palpite. RÉVÉLEZ pour voir les caches.' },
    phi: { f: 'mouvement', nom: 'Phénomène phi', aut: 'Max Wertheimer, 1912', voit: 'Un point saute de gauche à droite.', vrai: 'Deux points fixes s’allument tour à tour.', why: 'Sous 200 millisecondes environ, deux éclairs voisins deviennent un mouvement. C’est la découverte qui fonda la psychologie de la forme (Gestalt), et le principe du cinéma. Variez l’intervalle : trop court, on voit deux points en même temps ; trop long, deux éclairs séparés.' },
    ouchi: { f: 'mouvement', nom: 'Disque d’Ōuchi', aut: 'Hajime Ōuchi, 1977', voit: 'Le disque central flotte et glisse au-dessus du fond.', vrai: 'Le disque est solidaire du fond.', why: 'Les mouvements de l’œil déplacent le motif sur la rétine ; pour des briquettes horizontales ou verticales, l’erreur d’estimation n’est pas la même, et le centre semble décoller. Bougez les yeux, ou activez la petite vibration.' },
    damier: { f: 'lumiere', nom: 'Échiquier d’Adelson', aut: 'Edward Adelson, 1995', voit: 'La case A est sombre, la case B est claire.', vrai: 'A et B ont exactement le même gris.', why: 'Le cerveau ne mesure pas la lumière, il estime la couleur des objets : il retire l’ombre du cylindre et en déduit que B est une case claire. C’est une interprétation, et elle est juste pour les objets ! RÉVÉLEZ pour masquer le reste.' },
    grille: { f: 'lumiere', nom: 'Grille scintillante', aut: 'Schrauf, Lingelbach et Wist, 1997', voit: 'Des points noirs clignotent dans les ronds blancs.', vrai: 'Tous les ronds sont blancs.', why: 'Dérivée de la grille de Hermann (1870), où des taches grises apparaissent aux croisements. On a longtemps expliqué l’effet par l’inhibition latérale de la rétine ; mais il disparaît si les lignes ondulent (Geier, 2008) : RÉVÉLEZ pour le vérifier.' },
    contraste: { f: 'lumiere', nom: 'Contraste simultané', aut: 'Michel-Eugène Chevreul, 1839', voit: 'La barre grise passe du clair au sombre.', vrai: 'Elle est d’un gris uniforme.', why: 'Chimiste aux Gobelins, Chevreul cherchait pourquoi certaines laines semblaient ternes : c’étaient leurs voisines. La vision juge une teinte par rapport à son entourage.' },
    white: { f: 'lumiere', nom: 'Illusion de White', aut: 'Michael White, 1979', voit: 'Les gris de gauche sont plus sombres que ceux de droite.', vrai: 'Tous les rectangles gris sont identiques.', why: 'Paradoxe : à gauche, le gris touche surtout du blanc, et pourtant il paraît plus sombre. Le cerveau l’attribue à la rayure dont il semble faire partie.' },
    cornsweet: { f: 'lumiere', nom: 'Illusion de Cornsweet', aut: 'Tom Cornsweet, 1970', voit: 'La moitié gauche est plus claire que la droite.', vrai: 'Les deux moitiés ont la même luminance, sauf tout près de la frontière.', why: 'La vision est surtout sensible aux bords ; elle étend à toute la surface l’information de la frontière. Cachez la frontière avec RÉVÉLER : les deux moitiés deviennent pareilles.' },
    kanizsa: { f: 'lumiere', nom: 'Triangle de Kanizsa', aut: 'Gaetano Kanizsa, 1955', voit: 'Un triangle blanc plus lumineux que le fond, posé sur trois disques.', vrai: 'Il n’y a pas de triangle : seulement trois disques entaillés et trois angles.', why: 'Le cerveau préfère un objet qui cache des disques à une coïncidence d’entailles. Les contours illusoires activent même des neurones de l’aire visuelle V2. Tournez les disques avec MANIPULER : le triangle s’évanouit.' },
    mullerlyer: { f: 'geometrie', nom: 'Müller-Lyer', aut: 'Franz Müller-Lyer, 1889', voit: 'Le segment du haut est plus long.', vrai: 'Les deux segments mesurent la même longueur (au départ).', why: 'Les pointes évoquent des coins de pièce, rentrants ou sortants, donc des distances différentes. Avec MANIPULER, réglez le segment du bas jusqu’à ce qu’il vous paraisse égal, puis RÉVÉLEZ : vous lirez l’ampleur de votre illusion.' },
    cafe: { f: 'geometrie', nom: 'Mur du café', aut: 'Richard Gregory et Priscilla Heard, 1979', voit: 'Les lignes de mortier penchent comme des coins.', vrai: 'Elles sont parfaitement horizontales et parallèles.', why: 'Un étudiant de Gregory l’a remarqué sur la façade d’un café de Bristol. Le mortier gris, entre une brique claire et une sombre décalées, crée de petits bords inclinés que le cerveau prolonge. Avec un mortier noir ou blanc, l’effet disparaît.' },
    ebbinghaus: { f: 'geometrie', nom: 'Cercles d’Ebbinghaus', aut: 'Hermann Ebbinghaus, vers 1890', voit: 'Le disque de gauche est plus petit.', vrai: 'Les deux disques orange ont le même diamètre (au départ).', why: 'Une taille est jugée par comparaison. Avec MANIPULER, réglez le disque de droite pour qu’il paraisse égal, puis RÉVÉLEZ. Curiosité : la main qui saisit un disque ouvre les doigts à la bonne taille, comme si elle échappait à l’illusion.' },
    hering: { f: 'geometrie', nom: 'Hering et Wundt', aut: 'Ewald Hering, 1861 · Wilhelm Wundt, 1896', voit: 'Les deux lignes rouges sont bombées.', vrai: 'Elles sont droites et parallèles.', why: 'Les rayons évoquent un tunnel en perspective ; le cerveau corrige des distorsions qui n’existent pas, et courbe les droites. Le motif de Wundt les courbe dans l’autre sens.' },
    zollner: { f: 'geometrie', nom: 'Illusion de Zöllner', aut: 'Johann Zöllner, 1860', voit: 'Les grandes lignes divergent deux à deux.', vrai: 'Elles sont toutes parallèles.', why: 'Zöllner l’a découverte sur un tissu imprimé. Les petits traits obliques gonflent les angles aigus qu’ils font avec les lignes, ce qui les fait pivoter en sens contraires.' },
    ponzo: { f: 'geometrie', nom: 'Illusion de Ponzo', aut: 'Mario Ponzo, 1911', voit: 'La barre du haut est plus longue.', vrai: 'Les deux barres jaunes ont la même longueur.', why: 'Les rails qui convergent signifient « loin » : le cerveau grossit ce qui est loin pour compenser. C’est aussi pourquoi la Lune paraît énorme à l’horizon.' },
    poggendorff: { f: 'geometrie', nom: 'Poggendorff', aut: 'Johann Poggendorff, 1860', voit: 'La ligne de droite ne prolonge pas celle de gauche : elle est trop haute.', vrai: 'Elles sont exactement alignées (au départ).', why: 'Les angles aigus près du bandeau sont surestimés. Avec MANIPULER, alignez la partie droite à l’œil, puis RÉVÉLEZ pour voir votre écart.' },
    impossible: { f: 'geometrie', nom: 'Figures impossibles et ambiguës', aut: 'Reutersvärd (1934), Penrose (1958), Necker (1832)', voit: 'Un triangle fermé fait de cubes ; un cube qui bascule.', vrai: 'Les trois barres ne se touchent pas : elles ne s’alignent que vues sous cet angle précis. Le cube a deux lectures.', why: 'Oscar Reutersvärd dessine ce triangle de cubes en 1934 ; Lionel et Roger Penrose le redécouvrent en 1958 et Escher en fait des cascades. Chaque coin est cohérent, c’est l’ensemble qui ne l’est pas : RÉVÉLEZ pour tourner autour. Le cube de Necker (1832), lui, a deux lectures également bonnes, et la perception bascule.' },
    remanence: { f: 'couleur', nom: 'Image rémanente', aut: 'Goethe, Théorie des couleurs, 1810', voit: 'L’image en noir et blanc apparaît en couleurs.', vrai: 'Elle est en noir et blanc.', why: 'Les cônes de la rétine qui ont regardé longtemps une couleur se fatiguent ; sur du gris, leurs voisins complémentaires dominent. Fixez la croix sans bouger les yeux pendant tout le compte à rebours.' },
    munker: { f: 'couleur', nom: 'Illusion de Munker', aut: 'Hans Munker, 1970', voit: 'Les barres sont violacées à gauche et orangées à droite.', vrai: 'C’est le même rouge partout.', why: 'Contrairement au contraste, l’assimilation tire une couleur vers celle de ses voisines immédiates. RÉVÉLEZ pour retirer les rayures.' },
    troxler: { f: 'couleur', nom: 'Effacement de Troxler', aut: 'Ignaz Troxler, 1804', voit: 'Les taches colorées s’effacent dans le gris.', vrai: 'Elles sont toujours là.', why: 'Ce qui ne change pas cesse d’être signalé : sans contour net, une tache immobile en vision périphérique disparaît en quelques secondes. Fixez la croix. Un clignement ou un geste les fait revenir.' },
    spirale: { f: 'hypnose', nom: 'Spirale hypnotique', aut: 'Marcel Duchamp, Rotoreliefs, 1935', voit: 'La spirale aspire le regard et semble creuser l’écran.', vrai: 'Ce n’est qu’un motif qui tourne.', why: 'Duchamp en faisait tourner sur des platines ; le cinéma (Vertigo, Hitchcock, 1958) et les hypnotiseurs de music-hall en ont fait un emblème. L’hypnose réelle n’en a pas besoin : c’est un état d’attention focalisée. La rotation fixe et fatigue les détecteurs de mouvement : arrêtez-la et regardez votre main.' },
    benham: { f: 'hypnose', nom: 'Toupie de Benham', aut: 'Charles Benham, 1894', voit: 'Des cercles colorés, pâles, bleus, verts ou rouges, sur un disque noir et blanc.', vrai: 'Il n’y a que du noir et du blanc.', why: 'Benham vendait sa toupie comme un jouet. On pense que les trois sortes de cônes réagissent à des vitesses différentes au clignotement noir-blanc, ce qui fabrique de fausses couleurs : les couleurs de Fechner. Inversez le sens : l’ordre des couleurs s’inverse.' },
  };
  const ORDER = Object.keys(ILL);
  const DEF = {
    serpents: { pal: 'kitaoka', n: 3 }, pinna: { auto: true, sc: 1 }, cascade: { dur: 25, sens: 1 }, pieds: { v: 0.5, p: 18 },
    lilas: { col: 'lilas', vit: 0.1, flou: 1 }, enseigne: { fen: 'haute', v: 0.5 }, carre: { cache: 'invisible', v: 0.5 }, phi: { ms: 120, coul: false },
    ouchi: { vib: true, r: 0.32 }, damier: {}, grille: { mode: 'scint', ep: 0.5 }, contraste: { forme: 'barre' }, white: {}, cornsweet: { ampl: 0.5 },
    kanizsa: { rot: 0, forme: 'triangle' }, mullerlyer: { ang: 35, bas: 1 }, cafe: { mortier: 'gris', anim: false }, ebbinghaus: { droite: 1, voisins: 1 },
    hering: { type: 'hering' }, zollner: {}, ponzo: {}, poggendorff: { dec: 0 }, impossible: { fig: 'penrose' },
    remanence: { dur: 25 }, munker: {}, troxler: { flou: 1 }, spirale: { type: 0, bras: 4, vit: 0.5, sens: 1, pal: 0, torsion: 1, pulse: true }, benham: { on: false, tps: 6, sens: 1 },
  };

  window.FASC.push({
    id: 'illusions', name: 'Les Illusions', cat: 'Motifs', glyph: '◐', smoothTime: true,
    blurb: 'Ce que le cerveau voit et qui n’est pas là',
    hint: 'OBSERVER : touchez pour savoir ce qui se passe vraiment · RÉVÉLER : maintenez pour démasquer le trucage · MANIPULER : glissez pour régler, tourner ou mesurer votre propre illusion.',
    intro: 'Le cerveau ne photographie pas le monde : il le devine, très vite, à partir d’indices. Ses raccourcis sont presque toujours justes. Ici, on les prend en défaut : des images immobiles qui tournent, des gris identiques qui ne le sont pas, des droites qui se courbent, des couleurs qui n’existent pas. Savoir le trucage n’y change rien : c’est ce qui les rend fascinantes.',
    legend: [
      { color: '#ffd23a', name: 'Mouvement', role: 'images fixes qui bougent', desc: 'Serpents tournants, anneaux de Pinna, effet de cascade, pieds qui marchent, chasse au lilas, enseigne de barbier, carré qui respire, phénomène phi, disque d’Ōuchi.' },
      { color: '#c8c8c8', name: 'Lumière et contraste', role: 'le gris n’est jamais seul', desc: 'Échiquier d’Adelson, grille scintillante, contraste simultané, illusion de White, Cornsweet, triangle de Kanizsa.' },
      { color: '#9fd8ff', name: 'Géométrie', role: 'longueurs, angles, droites', desc: 'Müller-Lyer, mur du café, cercles d’Ebbinghaus, Hering et Wundt, Zöllner, Ponzo, Poggendorff, figures impossibles.' },
      { color: '#ff7ae0', name: 'Couleur', role: 'fatigue et voisinage', desc: 'Image rémanente, illusion de Munker, effacement de Troxler.' },
      { color: '#c09aff', name: 'Hypnose', role: 'spirales et toupies', desc: 'La spirale des hypnotiseurs (quatre dessins, quatre palettes) et la toupie de Benham, qui fabrique des couleurs à partir du noir et du blanc.' },
    ],
    about: [
      'Hermann von Helmholtz parlait dès 1867 d’« inférence inconsciente » : la perception est un raisonnement rapide qui part de la lumière reçue et conclut à des objets. Les illusions sont les cas où ce raisonnement, d’ordinaire excellent, se trompe parce que l’image a été construite pour le piéger. Elles servent depuis plus d’un siècle à démonter la vision pièce par pièce.',
      'Certaines naissent dans l’œil lui-même : fatigue des cônes (images rémanentes), adaptation des cellules sensibles au mouvement (effet de cascade). D’autres viennent de l’interprétation : le cerveau corrige l’ombre (Adelson), la perspective (Ponzo), la distance (Müller-Lyer), ou complète un objet absent (Kanizsa). Savoir le trucage ne l’annule pas : la partie du cerveau qui voit n’écoute pas celle qui sait.',
      'Plusieurs illusions de mouvement ont été inventées récemment, par ordinateur. Akiyoshi Kitaoka, professeur de psychologie à Kyoto, en a créé des centaines ; ses serpents tournants (2003) sont parmi les images les plus partagées au monde. Les anneaux de Pinna (2000) et le carré qui respire (2006) montrent que le cerveau calcule le mouvement par petites fenêtres avant de l’assembler.',
      'Prudence : quelques illusions animées clignotent ou tournent vite (toupie de Benham, spirale rapide). Elles ne démarrent qu’à la demande et leur vitesse se règle. Si vous êtes sensible aux images clignotantes, gardez des vitesses basses.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez l’image : ce que vous voyez, et ce qui est vrai.' },
      { id: 'reveler', label: 'révéler', desc: 'Maintenez le doigt posé : le trucage se dévoile tant que vous appuyez.' },
      { id: 'manipuler', label: 'manipuler', desc: 'Glissez pour régler l’illusion : allonger un segment, grossir un disque, aligner une ligne, tourner des disques, zoomer.' },
    ],
    make(env) { return makeIll(env); },
  });

  function makeIll(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const st = JSON.parse(JSON.stringify(DEF));
    const cfg = { cur: 'serpents', fam: 'mouvement', reveal: false, slide: false };
    let T = 0, local = 0, holding = false, label = null, slideT = 0;

    let G = null;
    function gl() {
      if (G !== null) return G;
      try { const K = GLKit(Math.round(W), Math.round(H)); G = { K, P: K.program(FS_SPI) }; } catch (e) { console.warn('Illusions : spirales en 2D', e); G = false; }
      return G;
    }
    // spirale dessinée en WebGL, ou en 2D à défaut
    function spiral(cx, cy, R, o) {
      const g = gl();
      if (g) {
        g.P.use().f('uRes', W, H).f('uC', cx, cy).f('uT', o.ph).f('uR', R).f('uArms', o.arms).f('uType', o.type).f('uPal', o.pal).f('uTwist', o.tw).f('uPulse', o.pulse ? 1 : 0).f('uMask', o.mask ? 1 : 0);
        g.K.run(g.P, null);
        ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(g.K.canvas, 0, 0, W, H); ctx.restore();
        return;
      }
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = o.pal === 1 ? '#ffc84c' : o.pal === 2 ? '#e0141a' : '#fff';
      for (let a = 0; a < o.arms; a++) {
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) { const r = (i / 120) * R, th = (a / o.arms) * TAU - (o.tw * 18 * r) / R / o.arms + o.ph / o.arms; ctx.lineTo(cx + Math.cos(th) * r, cy + Math.sin(th) * r); }
        for (let i = 120; i >= 0; i--) { const r = (i / 120) * R, th = ((a + 0.5) / o.arms) * TAU - (o.tw * 18 * r) / R / o.arms + o.ph / o.arms; ctx.lineTo(cx + Math.cos(th) * r, cy + Math.sin(th) * r); }
        ctx.fill();
      }
    }

    /* ───────── petits outils de dessin ───────── */
    const bg = (c) => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); };
    const line = (x1, y1, x2, y2, c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const disc = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
    const cross = (x, y, s, c) => { line(x - s, y, x + s, y, c || '#000', 2); line(x, y - s, x, y + s, c || '#000', 2); };
    const txt = (s, x, y, c, al, size) => { ctx.font = `500 ${size || 11}px "JetBrains Mono", monospace`; ctx.fillStyle = c; ctx.textAlign = al || 'left'; ctx.fillText(s, x, y); ctx.textAlign = 'left'; };
    const gy = (v) => { const k = Math.round(clamp(v, 0, 1) * 255); return `rgb(${k},${k},${k})`; };
    const rv = () => cfg.reveal || holding;

    /* ───────── les dessins ───────── */
    const D = {};
    D.serpents = (s) => {
      const v = view(); bg('#808080');
      const P = { kitaoka: ['#000', '#2b3c9a', '#fff', '#e6d21c'], gris: ['#000', '#555', '#fff', '#aaa'], rouge: ['#000', '#9a1b1b', '#fff', '#59c24a'] }[s.pal];
      const cols = s.n, rows = Math.max(1, Math.round((cols * H) / v.w));
      const R = Math.min(v.w / cols, H / rows) * 0.47;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const cx = v.x0 + ((i + 0.5) * v.w) / cols, cy = ((j + 0.5) * H) / rows, dir = (i + j) % 2 ? 1 : -1;
        const rings = 4, segs = 16;
        for (let r = rings - 1; r >= 0; r--) {
          const r1 = (R * (r + 1)) / rings, r0 = (R * (r + 0.12)) / rings, d = (r % 2 ? 1 : -1) * dir;
          const parts = rv() ? [[0, 0.35], ['#808080', 0.15], [2, 0.35], ['#808080', 0.15]] : [[0, 0.35], [1, 0.15], [2, 0.35], [3, 0.15]];
          for (let k = 0; k < segs; k++) {
            let a = (k / segs) * TAU + (r % 2 ? Math.PI / segs : 0);
            const seq = d > 0 ? parts : parts.slice().reverse();
            for (const [c, w] of seq) {
              const a2 = a + (w * TAU) / segs;
              ctx.fillStyle = typeof c === 'number' ? P[c] : c;
              ctx.beginPath(); ctx.arc(cx, cy, r1, a, a2); ctx.arc(cx, cy, r0, a2, a, true); ctx.fill();
              a = a2;
            }
          }
        }
      }
    };
    D.pinna = (s) => {
      const v = view(); bg('#9a9a9a');
      const sc = s.auto ? 1 + 0.16 * Math.sin(local * 1.4) : s.sc;
      const R0 = Math.min(v.w, H) * 0.42 * sc;
      [[R0, 60, 1], [R0 * 0.74, 46, -1]].forEach(([R, n, pol]) => {
        const q = R * 0.042;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU, x = v.cx + Math.cos(a) * R, y = H / 2 + Math.sin(a) * R;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a + (Math.PI / 4) * pol);
          ctx.fillStyle = '#9a9a9a'; ctx.fillRect(-q, -q, 2 * q, 2 * q);
          ctx.lineWidth = Math.max(1.2, q * 0.24);
          ctx.strokeStyle = pol > 0 ? '#fff' : '#000'; ctx.beginPath(); ctx.moveTo(-q, q); ctx.lineTo(-q, -q); ctx.lineTo(q, -q); ctx.stroke();
          ctx.strokeStyle = pol > 0 ? '#000' : '#fff'; ctx.beginPath(); ctx.moveTo(q, -q); ctx.lineTo(q, q); ctx.lineTo(-q, q); ctx.stroke();
          ctx.restore();
          if (rv() && i % 6 === 0) line(v.cx, H / 2, v.cx + Math.cos(a) * R * 1.3, H / 2 + Math.sin(a) * R * 1.3, 'rgba(220,30,30,.8)', 1.5);
        }
      });
      cross(v.cx, H / 2, 8, '#000');
    };
    D.cascade = (s) => {
      const v = view(), R = Math.min(v.w, H) * 0.46;
      const cyc = s.dur + 12, k = local % cyc, adapt = k < s.dur;
      if (adapt) s.ph = (s.ph || 0) + s.sens * 3 * dtP;
      spiral(v.cx, H / 2, R, { ph: s.ph || 0, arms: 3, type: 0, pal: 0, tw: 1, pulse: false, mask: true });
      txt(adapt ? `FIXEZ LE POINT ROUGE · ${Math.ceil(s.dur - k)} S` : 'LA SPIRALE EST ARRÊTÉE · REGARDEZ-LA BOUGER QUAND MÊME', v.x0 + 16, H - 16, '#bbb');
    };
    D.pieds = (s) => {
      const v = view(), p = Math.max(6, s.p);
      bg('#7f7f7f');
      if (!rv()) for (let x = Math.floor(v.x0 / p) * p; x < v.x1; x += p) { ctx.fillStyle = (Math.floor(x / p) % 2 ? '#fff' : '#000'); ctx.fillRect(x, 0, p / 2 + 0.5, H); }
      const L = v.w * 0.8, ph = (local * s.v * 0.12) % 2, f = ph < 1 ? ph : 2 - ph;
      const x = v.x0 + v.w * 0.1 + f * (L - p * 4), w = p * 4, h = p * 1.6;
      ctx.fillStyle = '#ffe600'; ctx.fillRect(x, H / 2 - h * 1.6, w, h);
      ctx.fillStyle = '#001c8c'; ctx.fillRect(x, H / 2 + h * 0.6, w, h);
    };
    D.lilas = (s) => {
      const v = view(); bg('#c3c3c3');
      const R = Math.min(v.w, H) * 0.32, n = 12, off = Math.floor(local / s.vit) % n;
      const C = { lilas: [235, 120, 235], cyan: [80, 210, 230], orange: [245, 160, 60] }[s.col];
      for (let i = 0; i < n; i++) {
        if (i === off && !rv()) continue;
        const a = (i / n) * TAU - Math.PI / 2, x = v.cx + Math.cos(a) * R, y = H / 2 + Math.sin(a) * R, r = R * 0.16 * (0.6 + s.flou * 0.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${C[0]},${C[1]},${C[2]},1)`); g.addColorStop(0.35 - s.flou * 0.2, `rgba(${C[0]},${C[1]},${C[2]},.85)`); g.addColorStop(1, `rgba(${C[0]},${C[1]},${C[2]},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      cross(v.cx, H / 2, 10, '#000');
    };
    D.enseigne = (s) => {
      const v = view(); bg('#151520');
      const cx = v.cx, cy = H / 2, m = Math.min(v.w, H);
      const ap = { haute: [m * 0.18, m * 0.8], large: [m * 0.8, m * 0.18], ronde: [m * 0.5, m * 0.5] }[s.fen];
      const x0 = cx - ap[0] / 2, y0 = cy - ap[1] / 2;
      ctx.save();
      if (!rv()) { ctx.beginPath(); if (s.fen === 'ronde') ctx.arc(cx, cy, ap[0] / 2, 0, TAU); else ctx.rect(x0, y0, ap[0], ap[1]); ctx.clip(); }
      const p = m * 0.08, sh = (local * s.v * m * 0.12) % (2 * p);
      const cols = ['#d8202a', '#f4f4f4', '#2050c8', '#f4f4f4'];
      for (let k = -40; k < 60; k++) {
        const xx = v.x0 - H + k * p * 0.5 + sh;
        ctx.fillStyle = cols[((k % 4) + 4) % 4]; ctx.beginPath();
        ctx.moveTo(xx, H); ctx.lineTo(xx + p * 0.5, H); ctx.lineTo(xx + p * 0.5 + H, 0); ctx.lineTo(xx + H, 0); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); if (s.fen === 'ronde') ctx.arc(cx, cy, ap[0] / 2, 0, TAU); else ctx.rect(x0, y0, ap[0], ap[1]); ctx.stroke();
    };
    D.carre = (s) => {
      const v = view(); bg('#fff');
      const m = Math.min(v.w, H), cx = v.cx, cy = H / 2, a = local * s.v * 0.8, h = m * 0.24;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.fillStyle = '#2c4fd6'; ctx.fillRect(-h, -h, 2 * h, 2 * h); ctx.restore();
      const g = m * 0.07, o = m * 0.36;
      ctx.fillStyle = s.cache === 'invisible' ? '#fff' : '#e9e2c9';
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = cx + sx * (g + o / 2) - o / 2, y = cy + sy * (g + o / 2) - o / 2;
        if (rv()) { ctx.strokeStyle = '#e02020'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, o, o); } else ctx.fillRect(x, y, o, o);
      }
    };
    D.phi = (s) => {
      const v = view(); bg('#0c0c12');
      const per = s.ms / 1000, k = Math.floor(local / per) % 2, d = Math.min(v.w, H) * 0.18;
      const c0 = '#f4f4f4', c1 = s.coul ? '#40d060' : '#f4f4f4', c0b = s.coul ? '#e04040' : c0;
      disc(v.cx - d, H / 2, d * 0.18, k === 0 ? c0b : '#1a1a22'); disc(v.cx + d, H / 2, d * 0.18, k === 1 ? c1 : '#1a1a22');
      txt(`INTERVALLE ${s.ms} MS · ${s.ms < 40 ? 'DEUX POINTS EN MÊME TEMPS' : s.ms < 230 ? 'UN POINT QUI SAUTE' : 'DEUX ÉCLAIRS SÉPARÉS'}`, v.x0 + 16, H - 16, '#aaa');
    };
    D.ouchi = (s) => {
      const v = view(); bg('#fff');
      const m = Math.min(v.w, H), u = m / 60, jx = s.vib ? Math.cos(local * 5) * u * 0.6 : 0, jy = s.vib ? Math.sin(local * 5) * u * 0.6 : 0;
      const pat = (vert) => { for (let y = -2 * u; y < H + 4 * u; y += vert ? 4 * u : u) for (let x = v.x0 - 4 * u; x < v.x1 + 4 * u; x += vert ? u : 4 * u) { const i = Math.round((vert ? x : y) / u) + Math.round((vert ? y / (4 * u) : x / (4 * u))); if (i % 2) ctx.fillRect(x + jx, y + jy, vert ? u : 4 * u, vert ? 4 * u : u); } };
      ctx.fillStyle = '#000'; pat(false);
      ctx.save(); ctx.beginPath(); ctx.arc(v.cx + jx, H / 2 + jy, m * s.r, 0, TAU); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#000'; pat(!rv()); ctx.restore();
    };
    D.damier = () => {
      const v = view(); bg('#6f7c76');
      const m = Math.min(v.w, H), n = 5, L = 0.8, Dk = 0.48;
      const sh = (x, y) => 1 - 0.4 * clamp((1.75 - Math.hypot(x - 2.4, y - 2.55)) / 0.6, 0, 1);
      // plateau vu en biais : losange écrasé
      const T = (x, y) => [v.cx + (x - y) * m * 0.105, H * 0.5 + (x + y - 5) * m * 0.062];
      const tiles = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) tiles.push([i, j]);
      const A = [1, 4], B = [2, 2];
      const tileVal = (i, j) => ((i + j) % 2 ? Dk : L) * sh(i + 0.5, j + 0.5);
      const base = (i, j) => ((i + j) % 2 ? Dk : L);
      const drawTile = (i, j, c) => { const p = [T(i, j), T(i + 1, j), T(i + 1, j + 1), T(i, j + 1)]; ctx.fillStyle = c; ctx.beginPath(); p.forEach((q, k) => (k ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.fill(); };
      if (rv()) { bg('#e8e4dc'); drawTile(...A, gy(tileVal(...A))); drawTile(...B, gy(tileVal(...B))); }
      else {
        for (const [i, j] of tiles) drawTile(i, j, gy(base(i, j)));
        // ombre douce du cylindre : on assombrit dans le repère du plateau (×0,6 au cœur, comme sh())
        const o = T(0, 0), ex = T(1, 0), ey = T(0, 1);
        ctx.save(); ctx.transform(ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1], o[0], o[1]);
        ctx.beginPath(); ctx.rect(0, 0, 5, 5); ctx.clip();
        const g0 = ctx.createRadialGradient(2.4, 2.55, 1.15, 2.4, 2.55, 1.75);
        g0.addColorStop(0, 'rgb(153,153,153)'); g0.addColorStop(1, 'rgb(255,255,255)');
        ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g0; ctx.fillRect(0, 0, 5, 5); ctx.restore();
        // bordure du plateau
        ctx.fillStyle = '#3a3a3a'; const a = T(0, 5), b = T(5, 5), c = T(5, 0); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(b[0], b[1] + m * 0.04); ctx.lineTo(a[0], a[1] + m * 0.04); ctx.fill();
        ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.moveTo(...b); ctx.lineTo(...c); ctx.lineTo(c[0], c[1] + m * 0.04); ctx.lineTo(b[0], b[1] + m * 0.04); ctx.fill();
        // le cylindre vert
        const [px, py] = T(3.6, 1.4), cr = m * 0.075, ch = m * 0.3;
        const g = ctx.createLinearGradient(px - cr, 0, px + cr, 0); g.addColorStop(0, '#1e5a2a'); g.addColorStop(0.65, '#5fbf6a'); g.addColorStop(1, '#2f7a3a');
        ctx.fillStyle = g; ctx.fillRect(px - cr, py - ch, 2 * cr, ch);
        ctx.beginPath(); ctx.ellipse(px, py, cr, cr * 0.4, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#7fd08a'; ctx.beginPath(); ctx.ellipse(px, py - ch, cr, cr * 0.4, 0, 0, TAU); ctx.fill();
      }
      for (const [[i, j], l] of [[A, 'A'], [B, 'B']]) { const p = T(i + 0.5, j + 0.5); ctx.font = `600 ${Math.round(m * 0.04)}px "Space Grotesk", sans-serif`; ctx.fillStyle = l === 'A' ? '#ddd' : '#222'; ctx.textAlign = 'center'; ctx.fillText(l, p[0], p[1] + m * 0.014); ctx.textAlign = 'left'; }
    };
    D.grille = (s) => {
      const v = view(), sc = s.mode === 'scint';
      bg(sc ? '#000' : '#fff');
      const m = Math.min(v.w, H), step = m / 8, lw = step * (0.12 + s.ep * 0.14);
      ctx.strokeStyle = sc ? '#8a8a8a' : '#000'; ctx.lineWidth = lw;
      if (sc) { /* lignes grises sur fond noir */ } else { bg('#000'); ctx.strokeStyle = '#fff'; }
      const wav = rv() ? step * 0.12 : 0;
      for (let x = v.x0 + ((v.w / 2) % step); x < v.x1; x += step) { ctx.beginPath(); for (let y = 0; y <= H; y += 6) ctx.lineTo(x + Math.sin(y / step * Math.PI * 2) * wav, y); ctx.stroke(); }
      for (let y = (H / 2) % step; y < H; y += step) { ctx.beginPath(); for (let x = v.x0; x <= v.x1; x += 6) ctx.lineTo(x, y + Math.sin(x / step * Math.PI * 2) * wav); ctx.stroke(); }
      if (sc) for (let x = v.x0 + ((v.w / 2) % step); x < v.x1; x += step) for (let y = (H / 2) % step; y < H; y += step) disc(x, y, lw * 0.62, '#fff');
    };
    D.contraste = (s) => {
      const v = view();
      if (rv()) bg('#808080');
      else { const g = ctx.createLinearGradient(v.x0, 0, v.x1, 0); g.addColorStop(0, '#000'); g.addColorStop(1, '#fff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = '#808080';
      if (s.forme === 'barre') ctx.fillRect(v.x0 + v.w * 0.08, H * 0.45, v.w * 0.84, H * 0.1);
      else { const q = Math.min(v.w, H) * 0.14; ctx.fillRect(v.x0 + v.w * 0.22 - q / 2, H / 2 - q / 2, q, q); ctx.fillRect(v.x0 + v.w * 0.78 - q / 2, H / 2 - q / 2, q, q); }
    };
    D.white = () => {
      const v = view(); bg('#808080');
      const n = 14, h = (H * 0.7) / n, y0 = H * 0.15, x0 = v.x0 + v.w * 0.1, w = v.w * 0.8;
      if (!rv()) for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#000'; ctx.fillRect(x0, y0 + i * h, w, h); }
      ctx.fillStyle = '#7f7f7f';
      for (let i = 4; i < 10; i++) { if (i % 2 === 0) ctx.fillRect(x0 + w * 0.15, y0 + i * h, w * 0.22, h); else ctx.fillRect(x0 + w * 0.63, y0 + i * h, w * 0.22, h); }
    };
    D.cornsweet = (s) => {
      const v = view(), w = Math.min(v.w * 0.86, H * 1.3), x0 = v.cx - w / 2, y0 = H * 0.2, hh = H * 0.6;
      bg('#303030');
      const im = ctx.createImageData(Math.ceil(w), 1);
      for (let x = 0; x < im.width; x++) { const u = (x - im.width / 2) / (im.width / 2); const e = Math.sign(u) * Math.exp(-Math.abs(u) * 9) * s.ampl * 0.35; const L = clamp(0.5 - e, 0, 1) * 255; im.data[x * 4] = im.data[x * 4 + 1] = im.data[x * 4 + 2] = L; im.data[x * 4 + 3] = 255; }
      const c = document.createElement('canvas'); c.width = im.width; c.height = 1; c.getContext('2d').putImageData(im, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(c, x0, y0, w, hh);
      if (rv()) { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(v.cx - w * 0.07, y0 - 10, w * 0.14, hh + 20); }
    };
    D.kanizsa = (s) => {
      const v = view(); bg('#fff');
      const m = Math.min(v.w, H), R = m * 0.3, r = m * 0.075, rot = rv() ? Math.PI / 2 : (s.rot * Math.PI) / 180;
      const n = s.forme === 'carre' ? 4 : 3;
      const pts = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i / n) * TAU + (n === 4 ? Math.PI / 4 : 0); return [v.cx + Math.cos(a) * R, H / 2 + 0.05 * m + Math.sin(a) * R]; });
      pts.forEach(([x, y], i) => {
        const toC = Math.atan2(H / 2 + 0.05 * m - y, v.cx - x) + rot, half = Math.PI / n;
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, toC + half, toC - half + TAU); ctx.closePath(); ctx.fill();
      });
      if (n === 3) { // triangle inversé dessiné par trois angles
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
        const q = pts.map(([x, y]) => [2 * v.cx - x, 2 * (H / 2 + 0.05 * m) - y]);
        q.forEach((p, i) => { const a = q[(i + 1) % 3], b = q[(i + 2) % 3]; for (const t of [a, b]) { ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(p[0] + (t[0] - p[0]) * 0.28, p[1] + (t[1] - p[1]) * 0.28); ctx.stroke(); } });
      }
    };
    D.mullerlyer = (s) => {
      const v = view(); bg('#f3eee3');
      const L = Math.min(v.w * 0.5, H * 0.7), L2 = L * s.bas, f = L * 0.16, a = (s.ang * Math.PI) / 180, y1 = H * 0.36, y2 = H * 0.64;
      const seg = (cx, y, len, out) => {
        line(cx - len / 2, y, cx + len / 2, y, '#1a1630', 3);
        if (rv()) return;
        for (const sx of [-1, 1]) { const x = cx + (sx * len) / 2, dir = out ? -sx : sx; for (const sy of [-1, 1]) line(x, y, x + dir * Math.cos(a) * f, y + sy * Math.sin(a) * f, '#1a1630', 3); }
      };
      seg(v.cx, y1, L, false); seg(v.cx, y2, L2, true);
      if (rv()) {
        ctx.setLineDash([5, 5]); for (const x of [v.cx - L / 2, v.cx + L / 2]) line(x, y1 - 30, x, y2 + 30, '#c0392b', 1.2); ctx.setLineDash([]);
        txt(`SEGMENT DU BAS : ${Math.round(s.bas * 100)} % DE CELUI DU HAUT${Math.abs(s.bas - 1) > 0.015 ? ' · VOTRE ILLUSION : ' + Math.round(Math.abs(1 - s.bas) * 100) + ' %' : ''}`, v.x0 + 16, H - 16, '#c0392b');
      }
    };
    D.cafe = (s) => {
      const v = view(); bg('#888');
      const rows = 9, h = H / rows, w = h * 1.6, mort = Math.max(1.5, h * 0.06);
      const sh = s.anim ? (Math.sin(local * 0.6) * 0.5 + 0.5) * w : w / 4;
      for (let r = 0; r < rows; r++) {
        const off = [0, sh, 2 * sh, sh][r % 4];
        for (let x = v.x0 - 2 * w + (off % (2 * w)); x < v.x1 + w; x += 2 * w) { ctx.fillStyle = '#000'; ctx.fillRect(x, r * h, w, h); ctx.fillStyle = '#fff'; ctx.fillRect(x + w, r * h, w, h); }
        ctx.fillStyle = { gris: '#808080', noir: '#000', blanc: '#fff' }[s.mortier]; ctx.fillRect(v.x0, (r + 1) * h - mort / 2, v.w, mort);
        if (rv()) line(v.x0, (r + 1) * h, v.x1, (r + 1) * h, 'rgba(230,30,30,.9)', 1);
      }
    };
    D.ebbinghaus = (s) => {
      const v = view(); bg('#f3eee3');
      const m = Math.min(v.w * 0.5, H), r = m * 0.085, xL = v.cx - v.w * 0.22, xR = v.cx + v.w * 0.22, y = H / 2;
      if (!rv()) {
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; disc(xL + Math.cos(a) * r * 3.2, y + Math.sin(a) * r * 3.2, r * 1.45 * s.voisins, '#8a8fa3'); }
        for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; disc(xR + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9, r * 0.38, '#8a8fa3'); }
      }
      disc(xL, y, r, '#f08a24'); disc(xR, y, r * s.droite, '#f08a24');
      if (rv()) txt(`DISQUE DE DROITE : ${Math.round(s.droite * 100)} % DE CELUI DE GAUCHE`, v.x0 + 16, H - 16, '#c0392b');
    };
    D.hering = (s) => {
      const v = view(); bg('#fff');
      const m = Math.min(v.w, H), d = m * 0.13;
      if (!rv()) {
        ctx.strokeStyle = '#2a2a50'; ctx.lineWidth = 1.2; ctx.beginPath();
        if (s.type === 'hering') for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI; ctx.moveTo(v.cx - Math.cos(a) * m, H / 2 - Math.sin(a) * m); ctx.lineTo(v.cx + Math.cos(a) * m, H / 2 + Math.sin(a) * m); }
        else for (let i = -14; i <= 14; i++) { const k = i / 14; for (const sx of [-1, 1]) { ctx.moveTo(v.cx + sx * v.w * 0.6, H / 2); ctx.lineTo(v.cx - sx * v.w * 0.1, H / 2 + k * H * 1.2); } }
        ctx.stroke();
      }
      line(v.x0 + v.w * 0.08, H / 2 - d, v.x1 - v.w * 0.08, H / 2 - d, '#d81e2a', 4);
      line(v.x0 + v.w * 0.08, H / 2 + d, v.x1 - v.w * 0.08, H / 2 + d, '#d81e2a', 4);
    };
    D.zollner = () => {
      const v = view(); bg('#fff');
      const n = 7, gap = Math.min(v.w, H) / (n + 1), L = Math.hypot(v.w, H);
      ctx.save(); ctx.translate(v.cx, H / 2); ctx.rotate(Math.PI / 4);
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * gap;
        line(x, -L / 2, x, L / 2, '#111', 3);
        if (!rv()) { const dir = i % 2 ? 1 : -1; for (let y = -L / 2; y < L / 2; y += gap * 0.32) line(x - gap * 0.22, y - dir * gap * 0.22, x + gap * 0.22, y + dir * gap * 0.22, '#111', 2); }
      }
      ctx.restore();
    };
    D.ponzo = () => {
      const v = view(); bg('#efe8d6');
      const top = H * 0.08, bot = H * 0.95, cx = v.cx;
      if (!rv()) {
        line(cx - v.w * 0.04, top, cx - v.w * 0.42, bot, '#4a3a2a', 4); line(cx + v.w * 0.04, top, cx + v.w * 0.42, bot, '#4a3a2a', 4);
        for (let k = 0; k < 14; k++) { const t = Math.pow(k / 14, 1.8), y = top + (bot - top) * t, hw = v.w * (0.04 + 0.38 * t) * 1.1; line(cx - hw, y, cx + hw, y, 'rgba(90,70,50,.5)', 1 + t * 5); }
      }
      const bw = v.w * 0.16; ctx.fillStyle = '#f2c200'; ctx.fillRect(cx - bw / 2, H * 0.3, bw, H * 0.03); ctx.fillRect(cx - bw / 2, H * 0.75, bw, H * 0.03);
    };
    D.poggendorff = (s) => {
      const v = view(); bg('#f3eee3');
      const a = Math.PI / 6, cx = v.cx, cy = H / 2, bw = Math.min(v.w, H) * 0.16, L = v.w * 0.45;
      const yAt = (x) => cy - Math.tan(a) * (x - cx);
      line(cx - L, yAt(cx - L), cx - bw / 2, yAt(cx - bw / 2), '#1a1630', 3);
      line(cx + bw / 2, yAt(cx + bw / 2) + s.dec, cx + L, yAt(cx + L) + s.dec, '#1a1630', 3);
      ctx.fillStyle = rv() ? 'rgba(120,130,160,.25)' : '#8790a8'; ctx.fillRect(cx - bw / 2, H * 0.08, bw, H * 0.84);
      if (rv()) { ctx.setLineDash([4, 4]); line(cx - bw / 2, yAt(cx - bw / 2), cx + bw / 2, yAt(cx + bw / 2), '#c0392b', 1.5); ctx.setLineDash([]); txt(`ÉCART : ${fr(Math.abs(s.dec), 0)} PIXELS ${s.dec < 0 ? 'TROP HAUT' : s.dec > 0 ? 'TROP BAS' : '· ALIGNÉ'}`, v.x0 + 16, H - 16, '#c0392b'); }
    };
    D.impossible = (s) => {
      const v = view(); bg('#f3eee3');
      const m = Math.min(v.w, H) * 0.36, cx = v.cx, cy = H / 2 + m * 0.1;
      ctx.lineJoin = 'round';
      if (s.fig === 'penrose') {
        // triangle de cubes (Reutersvärd, 1934) : trois barres de cubes le long de x, y puis z ;
        // en projection isométrique, la fin de la troisième barre tombe juste à côté du début de la première
        const n = 7, sz = (m * 1.5) / n, rot = rv() ? Math.sin(Math.min(1, holdT * 0.8 + (cfg.reveal ? 1 : 0)) * Math.PI / 2) * 0.55 : 0;
        const az = Math.PI / 4 + rot, el = Math.atan(1 / Math.SQRT2);
        const P = (x, y, z) => { const xr = x * Math.cos(az) - y * Math.sin(az), yr = x * Math.sin(az) + y * Math.cos(az); return [cx + xr * sz, cy - m * 0.25 + (yr * Math.sin(el) - z * Math.cos(el)) * sz]; };
        const depth = (x, y, z) => { const yr = x * Math.sin(az) + y * Math.cos(az); return yr * Math.cos(el) + z * Math.sin(el); };
        const cubes = [];
        for (let k = 0; k < n; k++) cubes.push([k, 0, 0]);
        for (let k = 0; k < n; k++) cubes.push([n, k, 0]);
        for (let k = 0; k < n; k++) cubes.push([n, n, k]);
        // l'ordre de dessin suit le chemin (impossible) ; quand on tourne, il suit la vraie profondeur
        const order = rot ? cubes.slice().sort((A, B) => depth(...A) - depth(...B)) : cubes;
        const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath(); ctx.fill(); ctx.stroke(); };
        ctx.strokeStyle = '#1a1630'; ctx.lineWidth = 1.2;
        for (const [x, y, z] of order) {
          poly([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], '#e7ecf7');
          poly([P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)], '#8fa3d4');
          poly([P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], '#4b5d8c');
        }
      } else if (s.fig === 'necker') {
        const d = m * 0.45, o = rv() ? [m * 0.35 * Math.cos(local), m * 0.35 * Math.sin(local) * 0.6] : [m * 0.35, -m * 0.25];
        const f = [[-d, -d], [d, -d], [d, d], [-d, d]];
        ctx.strokeStyle = '#1a1630'; ctx.lineWidth = 3;
        const sq = (dx, dy) => { ctx.beginPath(); f.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x + dx, cy + y + dy) : ctx.moveTo(cx + x + dx, cy + y + dy))); ctx.closePath(); ctx.stroke(); };
        sq(-o[0] / 2, -o[1] / 2); sq(o[0] / 2, o[1] / 2);
        f.forEach(([x, y]) => line(cx + x - o[0] / 2, cy + y - o[1] / 2, cx + x + o[0] / 2, cy + y + o[1] / 2, '#1a1630', 3));
      }
    };
    // image rémanente : un paysage aux couleurs inversées, puis le même en gris
    let remCv = null;
    function paintLandscape(g, w, h, inv) {
      const C = (hex) => { if (!inv) return hex; const n = parseInt(hex.slice(1), 16); return '#' + (0xffffff - n).toString(16).padStart(6, '0'); };
      const sky = g.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, C('#2f7fd8')); sky.addColorStop(1, C('#9fd4f0'));
      g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.55);
      g.fillStyle = C('#ffd21e'); g.beginPath(); g.arc(w * 0.68, h * 0.28, h * 0.1, 0, TAU); g.fill();
      g.fillStyle = C('#1d5fa8'); g.fillRect(0, h * 0.55, w, h * 0.2);
      g.fillStyle = C('#e9cf8a'); g.fillRect(0, h * 0.75, w, h * 0.25);
      g.fillStyle = C('#2e8b3a'); for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(w * 0.18 + Math.cos(i * 1.26) * h * 0.09, h * 0.42 + Math.sin(i * 1.26) * h * 0.03, h * 0.1, h * 0.025, i * 1.26, 0, TAU); g.fill(); }
      g.strokeStyle = C('#7a4a20'); g.lineWidth = h * 0.02; g.beginPath(); g.moveTo(w * 0.2, h * 0.8); g.quadraticCurveTo(w * 0.15, h * 0.6, w * 0.18, h * 0.42); g.stroke();
      g.fillStyle = C('#d8202a'); g.beginPath(); g.moveTo(w * 0.45, h * 0.66); g.lineTo(w * 0.58, h * 0.66); g.lineTo(w * 0.55, h * 0.7); g.lineTo(w * 0.47, h * 0.7); g.fill();
      g.fillStyle = C('#f4f4f4'); g.beginPath(); g.moveTo(w * 0.515, h * 0.66); g.lineTo(w * 0.515, h * 0.52); g.lineTo(w * 0.57, h * 0.64); g.fill();
    }
    D.remanence = (s) => {
      const v = view(), w = Math.min(v.w * 0.9, H * 1.4), h = w / 1.6, x0 = v.cx - w / 2, y0 = H / 2 - h / 2;
      if (!remCv || remCv.w !== Math.round(w)) {
        const mk = (inv, grey) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); const g = c.getContext('2d'); paintLandscape(g, c.width, c.height, inv); if (grey) { const d = g.getImageData(0, 0, c.width, c.height); for (let i = 0; i < d.data.length; i += 4) { const L = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]; d.data[i] = d.data[i + 1] = d.data[i + 2] = L; } g.putImageData(d, 0, 0); } return c; };
        remCv = { w: Math.round(w), inv: mk(true, false), grey: mk(false, true), vrai: mk(false, false) };
      }
      bg('#202024');
      const cyc = s.dur + 10, k = local % cyc, adapt = k < s.dur;
      ctx.drawImage(rv() ? remCv.vrai : adapt ? remCv.inv : remCv.grey, x0, y0, w, h);
      cross(v.cx, H / 2, 9, adapt ? '#fff' : '#000');
      txt(adapt ? `FIXEZ LA CROIX SANS BOUGER LES YEUX · ${Math.ceil(s.dur - k)} S` : 'L’IMAGE EST EN NOIR ET BLANC', v.x0 + 16, H - 16, '#bbb');
    };
    D.munker = () => {
      const v = view(); bg('#808080');
      const n = 24, h = (H * 0.76) / n, y0 = H * 0.12, x0 = v.x0 + v.w * 0.08, w = v.w * 0.84;
      if (!rv()) for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#f2d11b' : '#2846d6'; ctx.fillRect(x0, y0 + i * h, w, h); }
      ctx.fillStyle = '#e8352a';
      for (let i = 4; i < n - 4; i++) { if (i % 2 === 0) ctx.fillRect(x0 + w * 0.12, y0 + i * h, w * 0.26, h); else ctx.fillRect(x0 + w * 0.62, y0 + i * h, w * 0.26, h); }
    };
    D.troxler = (s) => {
      const v = view(); bg('#a8a8a8');
      const R = Math.min(v.w, H) * 0.3, cols = [[230, 150, 150], [150, 200, 150], [150, 160, 230], [220, 210, 130], [200, 140, 220], [130, 210, 210]];
      const jig = rv() ? 6 : 0;
      cols.forEach((c, i) => {
        const a = (i / 6) * TAU, x = v.cx + Math.cos(a) * R + Math.sin(local * 9 + i) * jig, y = H / 2 + Math.sin(a) * R + Math.cos(local * 8 + i) * jig, r = R * 0.45 * (0.6 + s.flou * 0.5);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},.95)`); g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      });
      cross(v.cx, H / 2, 9, '#000');
    };
    D.spirale = (s) => {
      const v = view();
      s.ph = (s.ph || 0) + s.sens * s.vit * 6 * dtP * (rv() ? 0 : 1);
      spiral(v.cx, H / 2, Math.min(v.w, H) * 0.5, { ph: s.ph, arms: s.bras, type: s.type, pal: s.pal, tw: s.torsion, pulse: s.pulse, mask: false });
    };
    D.benham = (s) => {
      const v = view(); bg('#9a9a9a');
      const R = Math.min(v.w, H) * 0.38;
      if (s.on) s.a = (s.a || 0) + s.sens * s.tps * TAU * dtP;
      ctx.save(); ctx.translate(v.cx, H / 2); ctx.rotate(s.a || 0);
      disc(0, 0, R, '#fff');
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = R * 0.035;
      for (let q = 0; q < 4; q++) for (let k = 0; k < 3; k++) { const rr = R * (0.28 + q * 0.18 + k * 0.045), a0 = (q * Math.PI) / 4; ctx.beginPath(); ctx.arc(0, 0, rr, a0, a0 + Math.PI / 4); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(v.cx, H / 2, R, 0, TAU); ctx.stroke();
      txt(s.on ? `${fr(s.tps, 1)} TOURS PAR SECONDE` : 'TOUCHEZ « LANCER LA TOUPIE » DANS LE PANNEAU', v.x0 + 16, H - 16, '#222');
    };

    /* ───────── boucle ───────── */
    let dtP = 0, holdT = 0, pending = false;
    function render() {
      const id = cfg.cur;
      ctx.save(); D[id](st[id]); ctx.restore();
      drawLabel();
    }
    function frame(t, dt) {
      if (dt > 0) {
        dtP = dt / 0.4; // temps perçu : ×1 = temps réel
        T += dtP; local += dtP; holdT = holding ? holdT + dtP : 0;
        if (label) label.t += dtP;
        if (cfg.slide && (slideT += dtP) > 20) { slideT = 0; const i = ORDER.indexOf(cfg.cur); choose(ORDER[(i + 1) % ORDER.length], true); }
      } else dtP = 0;
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }
    function choose(id, keepSlide) {
      cfg.cur = id; cfg.fam = ILL[id].f; local = 0; label = null; cfg.reveal = false;
      if (!keepSlide) slideT = 0;
      if (id === 'benham') st.benham.on = false;
      if (snd()) au.note(660, 0.15, 'sine', 0.03);
    }

    /* ───────── étiquette ───────── */
    function drawLabel() {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (7 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      const I = ILL[cfg.cur], v = view(), x = label.x, y = label.y;
      const side = x > v.x0 + v.w * 0.5 ? -1 : 1, lx = x + side * 40, ly = y < 80 ? y + 46 : y - 46;
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = 'italic 500 14px "Space Grotesk", sans-serif';
      const l1 = 'On voit : ' + I.voit, l2 = 'En vrai : ' + I.vrai;
      ctx.font = '500 10px "JetBrains Mono", monospace';
      const wmax = Math.min(v.w * 0.6, 420), wrap = (s) => { const out = []; let cur = ''; for (const w of s.split(' ')) { const t2 = cur ? cur + ' ' + w : w; if (ctx.measureText(t2).width > wmax) { out.push(cur); cur = w; } else cur = t2; } if (cur) out.push(cur); return out; };
      const L1 = wrap(l1), L2 = wrap(l2), hh = 18 + (L1.length + L2.length) * 13 + 10;
      const bx = side > 0 ? lx : lx - wmax - 16, by = ly - 16;
      ctx.fillStyle = 'rgba(16,14,24,.86)'; ctx.fillRect(bx, by, wmax + 16, hh);
      ctx.strokeStyle = '#c09aff'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, wmax + 16, hh);
      ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(side > 0 ? bx : bx + wmax + 16, by + 10); ctx.stroke();
      ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(I.nom, bx + 8, by + 15);
      ctx.font = '500 10px "JetBrains Mono", monospace';
      let yy = by + 32; ctx.fillStyle = '#d8d0ff'; for (const s of L1) { ctx.fillText(s, bx + 8, yy); yy += 13; }
      ctx.fillStyle = '#ffd27a'; for (const s of L2) { ctx.fillText(s, bx + 8, yy); yy += 13; }
      ctx.restore();
    }

    if (window.FASC_DEBUG) window.FASC_DEBUG.ill = { st, cfg, choose, ORDER, run(n, h) { for (let i = 0; i < n; i++) frame(0, h); render(); }, set reveal(x) { cfg.reveal = x; } };

    let drag = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool, s = st[cfg.cur];
        if (tool === 'observer') { label = { x: p.x, y: p.y, t: 0 }; return; }
        if (tool === 'reveler') { holding = true; return; }
        drag = { x: p.x, y: p.y, s0: JSON.parse(JSON.stringify(s)) };
      },
      move(p) {
        if (!p.down || !drag || env.tool !== 'manipuler') return;
        const s = st[cfg.cur], dx = p.x - drag.x, dy = p.y - drag.y, m = Math.min(view().w, H);
        if (cfg.cur === 'mullerlyer') s.bas = clamp(drag.s0.bas + dx / (m * 0.4), 0.5, 1.6);
        else if (cfg.cur === 'ebbinghaus') s.droite = clamp(drag.s0.droite + dx / (m * 0.5), 0.5, 1.6);
        else if (cfg.cur === 'poggendorff') s.dec = clamp(drag.s0.dec + dy, -H * 0.3, H * 0.3);
        else if (cfg.cur === 'kanizsa') s.rot = clamp(drag.s0.rot + dx * 0.4, -180, 180);
        else if (cfg.cur === 'pinna') { s.auto = false; s.sc = clamp(drag.s0.sc - dy / (m * 0.6), 0.5, 1.4); }
        else if (cfg.cur === 'spirale') s.vit = clamp(drag.s0.vit + dx / 400, 0, 2);
        else if (cfg.cur === 'benham') { s.tps = clamp(drag.s0.tps + dx / 60, 1, 12); }
        else if (cfg.cur === 'phi') s.ms = Math.round(clamp(drag.s0.ms + dx, 20, 800));
        else if (cfg.cur === 'pieds' || cfg.cur === 'carre' || cfg.cur === 'enseigne') s.v = clamp(drag.s0.v + dx / 300, 0, 2);
      },
      up() { holding = false; drag = null; },
      clear() { st[cfg.cur] = JSON.parse(JSON.stringify(DEF[cfg.cur])); local = 0; },
      dispose() { if (G) G.K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: FAM.map((f) => ({ label: f.nom, act: () => choose(ORDER.find((k) => ILL[k].f === f.id)) })) });
        const I = ILL[cfg.cur], s = st[cfg.cur];
        L.push({ type: 'section', label: FAM.find((f) => f.id === cfg.fam).nom });
        L.push({ type: 'choice', label: 'Illusion', value: cfg.cur, set: (x) => choose(x), options: ORDER.filter((k) => ILL[k].f === cfg.fam).map((k) => ({ id: k, label: ILL[k].nom })) });
        L.push({ type: 'section', label: I.nom });
        L.push({ type: 'note', text: I.aut + '. ' + I.why });
        const sl = (label, key, min, max, step, fmt) => L.push({ type: 'slider', label, min, max, step, value: s[key], fmt, set: (x) => { s[key] = x; } });
        const ch = (label, key, options) => L.push({ type: 'choice', label, value: s[key], set: (x) => { s[key] = x; }, options });
        const tg = (label, key) => L.push({ type: 'toggle', label, value: s[key], set: (x) => { s[key] = x; } });
        switch (cfg.cur) {
          case 'serpents': ch('Couleurs', 'pal', [{ id: 'kitaoka', label: 'Kitaoka' }, { id: 'gris', label: 'Gris' }, { id: 'rouge', label: 'Rouge et vert' }]); sl('Disques par rangée', 'n', 1, 5, 1, (x) => String(x)); break;
          case 'pinna': tg('Zoom automatique', 'auto'); if (!s.auto) sl('Taille', 'sc', 0.5, 1.4, 0.01, (x) => Math.round(x * 100) + ' %'); break;
          case 'cascade': sl('Durée d’adaptation', 'dur', 10, 60, 1, (x) => x + ' s'); ch('Sens', 'sens', [{ id: 1, label: 'Horaire' }, { id: -1, label: 'Antihoraire' }]); L.push({ type: 'buttons', items: [{ label: 'Recommencer', act: () => { local = 0; } }] }); break;
          case 'pieds': sl('Vitesse', 'v', 0.1, 2, 0.01, (x) => Math.round(x * 100) + ' %'); sl('Largeur des rayures', 'p', 8, 60, 1, (x) => x + ' px'); break;
          case 'lilas': ch('Couleur', 'col', [{ id: 'lilas', label: 'Lilas' }, { id: 'cyan', label: 'Cyan' }, { id: 'orange', label: 'Orange' }]); sl('Pas', 'vit', 0.05, 0.4, 0.01, (x) => Math.round(x * 1000) + ' ms'); sl('Flou', 'flou', 0, 1, 0.01, (x) => Math.round(x * 100) + ' %'); break;
          case 'enseigne': ch('Fenêtre', 'fen', [{ id: 'haute', label: 'Haute' }, { id: 'large', label: 'Large' }, { id: 'ronde', label: 'Ronde' }]); sl('Vitesse', 'v', 0, 2, 0.01, (x) => Math.round(x * 100) + ' %'); break;
          case 'carre': ch('Caches', 'cache', [{ id: 'invisible', label: 'Invisibles' }, { id: 'visibles', label: 'Visibles' }]); sl('Vitesse', 'v', 0, 2, 0.01, (x) => Math.round(x * 100) + ' %'); break;
          case 'phi': sl('Intervalle', 'ms', 20, 800, 5, (x) => x + ' ms'); tg('Changer de couleur (phi coloré)', 'coul'); break;
          case 'ouchi': tg('Petite vibration', 'vib'); sl('Taille du disque', 'r', 0.15, 0.45, 0.01, (x) => Math.round(x * 100) + ' %'); break;
          case 'grille': ch('Version', 'mode', [{ id: 'scint', label: 'Scintillante' }, { id: 'hermann', label: 'Hermann (1870)' }]); sl('Épaisseur des lignes', 'ep', 0, 1, 0.01, (x) => Math.round(x * 100) + ' %'); break;
          case 'contraste': ch('Forme', 'forme', [{ id: 'barre', label: 'Barre' }, { id: 'carres', label: 'Deux carrés' }]); break;
          case 'cornsweet': sl('Force du bord', 'ampl', 0.1, 1, 0.01, (x) => Math.round(x * 100) + ' %'); break;
          case 'kanizsa': ch('Forme', 'forme', [{ id: 'triangle', label: 'Triangle' }, { id: 'carre', label: 'Carré' }]); sl('Rotation des disques', 'rot', -180, 180, 1, (x) => x + '°'); break;
          case 'mullerlyer': sl('Angle des pointes', 'ang', 10, 80, 1, (x) => x + '°'); sl('Segment du bas', 'bas', 0.5, 1.6, 0.005, (x) => Math.round(x * 100) + ' %'); break;
          case 'cafe': ch('Mortier', 'mortier', [{ id: 'gris', label: 'Gris' }, { id: 'noir', label: 'Noir' }, { id: 'blanc', label: 'Blanc' }]); tg('Décalage animé', 'anim'); break;
          case 'ebbinghaus': sl('Taille des grands voisins', 'voisins', 0.5, 1.4, 0.01, (x) => Math.round(x * 100) + ' %'); sl('Disque de droite', 'droite', 0.5, 1.6, 0.005, (x) => Math.round(x * 100) + ' %'); break;
          case 'hering': ch('Fond', 'type', [{ id: 'hering', label: 'Hering' }, { id: 'wundt', label: 'Wundt' }]); break;
          case 'poggendorff': sl('Décalage de la partie droite', 'dec', -150, 150, 1, (x) => x + ' px'); break;
          case 'impossible': ch('Figure', 'fig', [{ id: 'penrose', label: 'Triangle impossible' }, { id: 'necker', label: 'Cube de Necker' }]); break;
          case 'remanence': sl('Temps de fixation', 'dur', 10, 45, 1, (x) => x + ' s'); L.push({ type: 'buttons', items: [{ label: 'Recommencer', act: () => { local = 0; } }] }); break;
          case 'troxler': sl('Flou', 'flou', 0, 1, 0.01, (x) => Math.round(x * 100) + ' %'); break;
          case 'spirale':
            ch('Dessin', 'type', [{ id: 0, label: 'Spirale d’Archimède' }, { id: 1, label: 'Logarithmique' }, { id: 2, label: 'Tunnel' }, { id: 3, label: 'Double' }]);
            if (s.type !== 2) sl('Bras', 'bras', 1, 12, 1, (x) => String(x));
            sl('Torsion', 'torsion', 0.2, 3, 0.01, (x) => '× ' + fr(x, 2));
            sl('Vitesse', 'vit', 0, 2, 0.01, (x) => (x === 0 ? 'arrêtée' : Math.round(x * 100) + ' %'));
            ch('Sens', 'sens', [{ id: 1, label: 'Vers le centre' }, { id: -1, label: 'Vers l’extérieur' }]);
            ch('Couleurs', 'pal', [{ id: 0, label: 'Noir et blanc' }, { id: 1, label: 'Violet et or' }, { id: 2, label: 'Rouge et noir' }, { id: 3, label: 'Psyché' }]);
            tg('Pulsation', 'pulse');
            break;
          case 'benham':
            L.push({ type: 'note', text: 'Attention : le disque fait clignoter du noir et du blanc. Évitez si vous êtes sensible aux images clignotantes.' });
            L.push({ type: 'buttons', items: [{ label: s.on ? 'Arrêter la toupie' : 'Lancer la toupie', act: () => { s.on = !s.on; } }] });
            sl('Tours par seconde', 'tps', 1, 12, 0.1, (x) => fr(x, 1));
            ch('Sens', 'sens', [{ id: 1, label: 'Horaire' }, { id: -1, label: 'Antihoraire' }]);
            break;
          default: break;
        }
        L.push({ type: 'toggle', label: 'Révéler le trucage', value: cfg.reveal, set: (x) => { cfg.reveal = x; } });
        L.push({ type: 'section', label: 'Affichage' });
        L.push({ type: 'toggle', label: 'Diaporama (une illusion toutes les 20 s)', value: cfg.slide, set: (x) => { cfg.slide = x; slideT = 0; } });
        L.push({ type: 'buttons', items: [{ label: 'Illusion suivante', act: () => { const i = ORDER.indexOf(cfg.cur); choose(ORDER[(i + 1) % ORDER.length]); } }, { label: 'Au hasard', act: () => choose(ORDER[Math.floor(rnd(ORDER.length))]) }] });
        return L;
      },
    };
  }
})();
