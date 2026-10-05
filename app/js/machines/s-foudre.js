/* Fascination — La Foudre · traceurs par bonds, arcs en retour, tonnerre, farfadets et figures de Lichtenberg
   L'éclair pousse comme une figure de claquage diélectrique (modèle DBM de Niemeyer, Pietronero et Wiesmann, 1984) :
   on résout l'équation de Laplace entre le nuage et le sol (SOR rouge-noir), puis le canal avance d'une case voisine
   choisie avec une probabilité proportionnelle au potentiel puissance η. Arc de jonction quand il arrive à distance
   d'amorçage d'un conducteur, arc en retour sur le chemin principal, arcs subséquents, tonnerre retardé de 3 s par km.
   Ciel, nuages, pluie et haute atmosphère en WebGL2 ; repli en 2D si WebGL2 manque. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const { GLKit, HEAD } = window.FKGL;

  const QUAL = {
    legere: { cells: 150, lich: 150, lichN: 1500, gl: 0.45 },
    normale: { cells: 190, lich: 200, lichN: 2400, gl: 0.6 },
    haute: { cells: 230, lich: 250, lichN: 3400, gl: 0.8 },
  };
  const PAPER = '#f3eee3';
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');

  /* ───────── shaders : ciel d'orage et haute atmosphère ───────── */
  const FBM = `
float fbm5(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= .5; } return s; }
uniform vec2 uRes; uniform float uT; uniform int uNL; uniform vec4 uL[8];
float lights(vec2 px){ float L = 0.; for (int i = 0; i < 8; i++){ if (i >= uNL) break; vec2 d = (px - uL[i].xy) / uRes.y; float r = uL[i].w; L += uL[i].z * r * r / (r * r + dot(d, d)); } return L; }
`;
  const FS_SKY = HEAD + FBM + `
uniform float uBase, uRain; out vec4 o;
float rainL(vec2 p, float sc, float sp, float den){
  p.x += p.y * .17;
  float cx = floor(p.x / sc), fx = fract(p.x / sc) - .5;
  float h = hash12(vec2(cx, sc * 3.1));
  float yy = p.y / (sc * 18.) - uT * sp + h * 11.;
  float h2 = hash12(vec2(cx, floor(yy)));
  float fy = fract(yy);
  return smoothstep(.18, 0., abs(fx + (h - .5) * .5)) * step(1. - den, h2) * smoothstep(0., .06, fy) * smoothstep(.4, .12, fy);
}
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  float y = px.y / uRes.y, x = px.x / uRes.y;
  vec3 sky = mix(vec3(.010, .012, .022), vec3(.040, .036, .050), smoothstep(.15, .9, y));
  float L = lights(px);
  vec2 q = vec2(x * 1.5 + uT * .006, y * 2.4);
  float n = fbm5(q * 2.1 + vec2(0., uT * .004));
  float n2 = fbm5(vec2(x * 4.2 - uT * .01, y * 6.5) + n * 1.3);
  float base = uBase + (n - .5) * .1;
  float dens = smoothstep(base + .04, base - .08, y) * (.55 + .6 * n2);
  float scud = smoothstep(.55, .78, fbm5(vec2(x * 3. + uT * .02, y * 8.))) * smoothstep(base + .22, base + .02, y) * smoothstep(base - .03, base + .05, y);
  dens = clamp(dens + scud * .7, 0., 1.);
  vec3 lc = vec3(.78, .76, 1.);
  // dans le nuage, la lumière diffuse : les parties épaisses s'éclairent, les trous restent sombres
  vec3 cloud = vec3(.026, .028, .040) * (.6 + .8 * n2) + lc * L * (.2 + 1.2 * n2 * n2);
  vec3 col = mix(sky + lc * L * .2, cloud, dens);
  float rn = rainL(px, 3., .9, .3) * .55 + rainL(px + 50., 5., 1.25, .22);
  col += rn * uRain * smoothstep(base - .02, base + .08, y) * (vec3(.035, .04, .05) + lc * L * .45);
  o = vec4(col, 1.);
}`;
  const FS_ATMO = HEAD + FBM + `
uniform float uHz, uKm, uGlow, uCurv; out vec4 o;
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  float dx = (px.x - uRes.x * .5) / uRes.y;
  float yl = uHz + dx * dx * uRes.y * uCurv;
  float h = (yl - px.y) / uKm; // altitude au-dessus du limbe, en km
  float L = lights(px);
  vec3 lc = vec3(.8, .78, 1.);
  vec3 col = vec3(0.);
  vec2 sg = px / 2.2; vec2 si = floor(sg); float sh = hash12(si);
  col += step(.9968, sh) * (.25 + .75 * hash12(si + 3.1)) * vec3(.8, .86, 1.) * smoothstep(40., 120., h);
  if (h < 0.){
    float t = (px.y - yl) / uRes.y;
    vec2 e = vec2(dx / (t + .02), 1. / (t + .02)) * .5;
    float cl = smoothstep(.42, .72, fbm5(e * .7 + vec2(uT * .002, 0.)));
    float city = step(.996, hash12(floor(e * 30.))) * (1. - cl) * smoothstep(.0, .05, t);
    col = vec3(.004, .006, .012) + cl * vec3(.028, .032, .042) + city * vec3(.5, .3, .1) * .5 + cl * lc * L * .9;
    col += vec3(.02, .05, .12) * exp(-t * 60.); // la mince couche d'air vue par la tranche
  } else {
    // sommets d'orage : enclumes jusqu'à 15 km, éclairées de l'intérieur
    float top = 4. + 11. * clamp(L * 2.5, 0., 1.) + 4. * fbm5(vec2(px.x / uRes.y * 9., 3.));
    float cd = smoothstep(top, top - 2.5, h) * smoothstep(-1., 1., h);
    col += cd * (vec3(.02, .022, .03) + lc * L * (.5 + .6 * fbm5(px / uRes.y * 14.)));
    col += vec3(.02, .05, .13) * exp(-h / 6.) * .8;
    // lueur nocturne de l'oxygène atomique (557,7 nm), ondulée par les ondes de gravité
    float wv = .75 + .25 * sin(px.x / uRes.y * 22. + uT * .15 + 2.5 * sin(px.x / uRes.y * 4.1 - uT * .05));
    col += uGlow * vec3(.07, .24, .09) * exp(-pow((h - 95.) / 3.2, 2.)) * wv;
    col += uGlow * vec3(.035, .006, .006) * exp(-pow((h - 150.) / 25., 2.));
    col += lc * L * .25 * exp(-max(h, 0.) / 20.);
  }
  o = vec4(col, 1.);
}`;

  window.FASC.push({
    id: 'foudre', name: 'La Foudre', cat: 'Éléments', glyph: '🜍', decor: true, smoothTime: true,
    blurb: 'Traceurs, arcs en retour, tonnerre et farfadets',
    hint: 'OBSERVER : touchez un éclair, un nuage, un clocher, un farfadet · ÉCLAIR : touchez pour appeler la foudre au-dessus du doigt (ou une décharge dans le bloc, ou le doigt sur le globe) · PARATONNERRE : plantez une tige · GOMME : arrachez-la.',
    intro: 'Un orage la nuit. La charge monte dans le nuage, des aigrettes bleues s’allument au bout du clocher, puis un traceur descend par bonds en tâtonnant. Quand il rencontre l’étincelle qui monte du sol, le canal s’embrase d’un coup : c’est l’arc en retour, et le tonnerre arrive trois secondes par kilomètre plus tard. Plus haut, au-dessus des nuages, d’étranges farfadets rouges. Et dans un bloc de plexiglas, la foudre fige ses branches.',
    legend: [
      { color: '#c9c4ff', name: 'Traceur par bonds', role: 'leader · pousse par sauts de ~50 m', desc: 'Un fin canal ionisé qui descend du nuage par bonds de quelques dizaines de mètres, en se ramifiant. Presque invisible à l’œil : on le voit ici au ralenti.' },
      { color: '#ffffff', name: 'Arc en retour', role: 'return stroke · ~30 000 °C', desc: 'Dès que le traceur touche le sol, le courant remonte le canal au tiers de la vitesse de la lumière : 30 kA en moyenne, cinq fois la température de la surface du Soleil.' },
      { color: '#9fb6ff', name: 'Traceur ascendant', role: 'arc de jonction · monte du sol', desc: 'Des pointes au sol (arbres, clochers, paratonnerres) partent des étincelles vers le traceur qui approche. Une seule fait la jonction ; les autres retombent.' },
      { color: '#ffd9a0', name: 'Coup positif', role: 'depuis l’enclume · un seul arc, plus long', desc: 'Environ un coup de foudre sur dix part du haut du nuage, chargé positivement. Plus puissant et plus long, il peut tomber à plus de 15 km de l’orage, « dans le ciel bleu ».' },
      { color: '#b9a8ff', name: 'Éclair intranuage', role: 'le plus fréquent · reste dans le nuage', desc: 'La majorité des éclairs ne touchent pas le sol : ils relient les charges opposées du nuage et l’allument de l’intérieur. Certains rampent sous sa base en araignée.' },
      { color: '#8fb0ff', name: 'Feu de Saint-Elme', role: 'effet couronne · bleu violacé', desc: 'Sous un champ électrique intense, l’air s’ionise au bout des pointes et luit sans éclater. Les marins le voyaient au sommet des mâts et y lisaient la protection de saint Érasme.' },
      { color: '#ff4a4a', name: 'Farfadet rouge', role: 'sprite · 50 à 90 km d’altitude', desc: 'Au-dessus des gros coups positifs, une gerbe rouge de quelques millisecondes, aux tentacules bleus. Photographié pour la première fois par hasard, en 1989.' },
      { color: '#4f8dff', name: 'Jet bleu', role: 'blue jet · jusqu’à 40 km', desc: 'Un cône bleu qui jaillit du sommet de l’orage vers la stratosphère. Les jets géants montent jusqu’à 90 km et rougissent en haut.' },
      { color: '#ff7a5a', name: 'Elfe', role: 'anneau à 90 km · moins d’une milliseconde', desc: 'L’impulsion électromagnétique d’un coup de foudre chauffe la base de l’ionosphère : un anneau rouge s’élargit sur des centaines de kilomètres.' },
      { color: '#8ad8a0', name: 'Lueur nocturne', role: 'airglow · oxygène à 557,7 nm, ~95 km', desc: 'La nuit, les atomes d’oxygène séparés par le soleil du jour se recombinent et émettent un vert pâle, où l’on voit passer des ondes de gravité.' },
      { color: '#d8e4ff', name: 'Figure de Lichtenberg', role: 'arborescence électrique · fractale', desc: 'Des électrons injectés dans un bloc de plexiglas s’échappent d’un coup quand on le frappe d’une pointe : la décharge grave un arbre fractal, à mi-chemin entre la ligne (dimension 1) et la surface (dimension 2).' },
      { color: '#ff7ae0', name: 'Filament de plasma', role: 'globe à plasma · ~30 kHz, 2 à 5 kV', desc: 'Dans un gaz rare à basse pression, la haute tension trace des filaments lumineux qui montent avec la convection et se jettent vers le doigt.' },
    ],
    about: [
      'Il tombe sur Terre environ 45 éclairs par seconde. Dans un cumulonimbus, les grêlons mous qui tombent et les cristaux de glace qui montent se frottent : le haut du nuage se charge positivement, la base négativement. Quand le champ devient trop fort, un traceur part de la base et descend par bonds d’une cinquantaine de mètres, en quelques dizaines de millisecondes, en se ramifiant au hasard.',
      'La simulation fait pousser ce traceur comme le modèle de claquage diélectrique de Niemeyer, Pietronero et Wiesmann (1984) : on calcule le potentiel électrique entre le nuage et le sol, et le canal avance plus volontiers là où le champ est le plus fort. Le réglage de ramification η change tout : à η = 1 on obtient un corail touffu, à η = 3 un trait presque droit. Les clochers, les arbres et les paratonnerres déforment le champ et attirent le traceur ; à quelques dizaines de mètres, une étincelle monte à sa rencontre.',
      'Au contact, le courant remonte le canal en quelques microsecondes : c’est l’arc en retour, éblouissant. Puis un traceur obscur redescend le même chemin, sans branches, et un deuxième arc repart, puis un troisième : l’éclair scintille. L’air chauffé à 30 000 °C se dilate en une onde de choc, le tonnerre. Le son va à 343 m/s, d’où la règle des trois secondes par kilomètre ; le grondement s’étire parce que les différentes parties du canal sont à des distances différentes. Avec le SON, le tonnerre arrive avec ce retard.',
      'Le 10 mai 1752, à Marly-la-Ville, Thomas-François Dalibard tire des étincelles d’une tige de fer plantée sous un orage, confirmant l’intuition de Benjamin Franklin : la foudre est électrique, et une pointe reliée à la terre peut la capter. Un recensement allemand de 1784 comptait 386 clochers frappés et 103 sonneurs tués en 33 ans : on sonnait les cloches pour éloigner l’orage. Les normes actuelles placent les paratonnerres avec la méthode de la sphère roulante : partout où une boule de 20 à 60 m touche le bâtiment, la foudre peut tomber.',
      'En 1989, une caméra de l’université du Minnesota filme par hasard une gerbe rouge au-dessus d’un orage : le premier farfadet (sprite). On a découvert depuis les jets bleus (1994), les elfes et les jets géants (2002). Ce sont des décharges dans l’air raréfié de la mésosphère, rouges à cause de l’azote. Les éclairs émettent aussi des ondes radio : dans un récepteur à très basse fréquence on entend des craquements, et parfois des « siffleurs » qui glissent vers le grave après avoir fait l’aller-retour le long du champ magnétique terrestre.',
      'Georg Christoph Lichtenberg découvre en 1777 que la poussière dessine des étoiles ramifiées sur une plaque de résine électrisée. Aujourd’hui on bombarde des blocs de plexiglas avec des électrons de plusieurs millions de volts : ils restent piégés à l’intérieur jusqu’à ce qu’une pointe déclenche la décharge. Le même dessin apparaît parfois sur la peau des foudroyés, et la foudre qui frappe le sable le fond en tubes de verre, les fulgurites. Le globe à plasma, enfin, descend des tubes à gaz de Nikola Tesla.',
      'Simplifications : l’échelle verticale est comprimée (le nuage est à 1,5 km, le clocher fait 50 m), le traceur est montré très ralenti (en réalité il descend en 20 à 30 ms), et les éclairs intranuages sont ici moins nombreux que dans la nature, où ils sont trois fois plus fréquents que les coups au sol. Le réglage « flashs adoucis », activé par défaut, limite les variations brusques de luminosité de tout l’écran.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez un éclair pour son courant et sa distance, un nuage, un arbre, un clocher, un paratonnerre, un farfadet, une figure de Lichtenberg.' },
      { id: 'eclair', label: 'éclair', desc: 'Touchez le ciel pour lancer un traceur au-dessus du doigt. Dans la haute atmosphère, un farfadet ; dans le bloc, une décharge ; sur le globe, posez le doigt.' },
      { id: 'paratonnerre', label: 'paratonnerre', desc: 'Touchez le sol pour planter une tige de Franklin reliée à la terre (six au plus).' },
      { id: 'gomme', label: 'gomme', desc: 'Touchez un paratonnerre pour l’arracher.' },
    ],
    make(env) { return makeFoudre(env); },
  });

  function makeFoudre(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const kS = clamp(Math.min(W, H) / 800, 0.6, 1.5);
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = {
      scene: 'orage', q: 'haute', act: 0.5, dist: 3, eta: 2.4, pos: 0.12, slow: true, rain: true, after: true, soft: true,
      lichEta: 1.4, lichAuto: true, gas: 'nexe', tension: 0.6, tle: 0.6, glow: true,
    };
    let VT = 0;

    /* ───────── WebGL : le ciel ───────── */
    let G = null;
    function initGL() {
      if (G) { G.K.lose(); G = null; }
      try {
        const Q = QUAL[cfg.q], s = Q.gl; // nuages doux : inutile de suivre la densité de pixels
        const K = GLKit(Math.max(64, Math.round(W * s)), Math.max(64, Math.round(H * s)));
        G = { K, sky: K.program(FS_SKY), atmo: K.program(FS_ATMO) };
      } catch (e) { console.warn('La Foudre : ciel en 2D', e); G = null; }
    }
    initGL();

    /* ───────── couches 2D : lueurs à basse résolution ───────── */
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return { c, g: c.getContext('2d') }; };
    const L4 = mk(W / 4, H / 4), L8 = mk(W / 8, H / 8);
    const etch = mk(W * dpr, H * dpr), liveC = mk(W * dpr, H * dpr), liveG = mk(W / 4, H / 4);
    let land = null;

    /* ───────── géométrie de l'orage ───────── */
    const cbY = H * 0.21; // base du nuage
    const groundY = (x) => H * (0.865 + 0.016 * Math.sin((x / W) * 5.1 + 0.7) + 0.01 * Math.sin((x / W) * 13.3 + 2.1));
    const kmPxV = (groundY(W / 2) - cbY) / 1.5; // 1,5 km entre le sol et la base du nuage
    const STR = [
      { k: 'chene', fx: 0.19, fh: 0.155, nom: 'Chêne isolé', m: 25 },
      { k: 'clocher', fx: 0.63, fh: 0.24, nom: 'Clocher et son paratonnerre', m: 48 },
      { k: 'pylone', fx: 0.82, fh: 0.165, nom: 'Pylône à haute tension', m: 42 },
      { k: 'pylone', fx: 0.965, fh: 0.12, nom: 'Pylône à haute tension', m: 42, far: true },
    ];
    let conds = []; // conducteurs (fixes + paratonnerres posés)
    let rods = [];
    function buildConds() {
      conds = STR.map((s, i) => { const x = s.fx * W, gy = groundY(x); return { ...s, i, x, gy, top: gy - s.fh * H, hits: 0, elmo: 0 }; });
      rods.forEach((r) => { const gy = groundY(r.x); conds.push({ k: 'tige', nom: 'Paratonnerre posé', m: 30, x: r.x, gy, top: gy - 0.11 * H, hits: r.hits || 0, elmo: 0, rod: r, i: conds.length }); });
    }

    /* ───────── la grille du claquage diélectrique ───────── */
    const MAXN = 9000;
    const D = {
      n: 0, cs: 8, GW: 0, GH: 0, ox: 0, oy: 0,
      cell: new Int32Array(MAXN), par: new Int32Array(MAXN), tb: new Float32Array(MAXN), jx: new Float32Array(MAXN), jy: new Float32Array(MAXN),
      sub: new Int32Array(MAXN), main: new Uint8Array(MAXN), closed: new Uint8Array(MAXN), bn: new Float32Array(MAXN),
    };
    let cI = new Int32Array(1), cP = new Int32Array(1), cW = new Float64Array(1);
    function allocGrid(cs, GW, GH, ox, oy) {
      Object.assign(D, { cs, GW, GH, ox, oy, n: 0 });
      const N = GW * GH;
      D.phi = new Float32Array(N); D.phi0 = new Float32Array(N); D.fx = new Uint8Array(N); D.fx0 = new Uint8Array(N);
      D.cid = new Int16Array(N).fill(-1); D.dist = new Int16Array(N); D.st = new Int32Array(N); D.stamp = 1;
      if (cI.length < N) { cI = new Int32Array(N); cP = new Int32Array(N); cW = new Float64Array(N); }
    }
    const cx = (k) => (D.cell[k] % D.GW + 0.5 + D.jx[k]) * D.cs + D.ox;
    const cy = (k) => (((D.cell[k] / D.GW) | 0) + 0.5 + D.jy[k]) * D.cs + D.oy;
    // SOR rouge-noir, restreint à une fenêtre autour du canal
    function sor(n, x0, x1, y0, y1) {
      const { phi, fx, GW } = D, om = 1.86;
      x0 = Math.max(1, x0); x1 = Math.min(GW - 2, x1); y0 = Math.max(1, y0); y1 = Math.min(D.GH - 2, y1);
      for (let it = 0; it < n; it++) {
        for (let par = 0; par < 2; par++) {
          for (let y = y0; y <= y1; y++) {
            const row = y * GW;
            for (let x = x0 + ((x0 + y + par) & 1); x <= x1; x += 2) {
              const i = row + x;
              if (fx[i]) continue;
              const v = (phi[i - 1] + phi[i + 1] + phi[i - GW] + phi[i + GW]) * 0.25;
              phi[i] += om * (v - phi[i]);
            }
          }
        }
        // bords latéraux : flux nul (on recopie la colonne voisine)
        if (x0 <= 1) for (let y = y0; y <= y1; y++) { const i = y * GW; if (D.fx[i] === 4) phi[i] = phi[i + 1]; }
        if (x1 >= GW - 2) for (let y = y0; y <= y1; y++) { const i = y * GW + GW - 1; if (D.fx[i] === 4) phi[i] = phi[i - 1]; }
      }
    }
    // distance (en cases) au conducteur le plus proche
    function bfsDist() {
      const { fx, dist, GW, GH } = D, N = GW * GH, q = new Int32Array(N);
      dist.fill(32000); let h = 0, t = 0;
      for (let i = 0; i < N; i++) if (fx[i] === 2) { dist[i] = 0; q[t++] = i; }
      while (h < t) {
        const i = q[h++], x = i % GW, y = (i / GW) | 0, d = dist[i] + 1;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= GW || Y >= GH) continue;
          const j = Y * GW + X; if (dist[j] > d && fx[j] !== 3) { dist[j] = d; q[t++] = j; }
        }
      }
    }
    let NB8 = [];
    function addNode(cell, par, t) {
      const k = D.n++;
      D.cell[k] = cell; D.par[k] = par; D.tb[k] = t; D.jx[k] = rnd(0.42, -0.42); D.jy[k] = rnd(0.42, -0.42);
      D.sub[k] = 1; D.main[k] = 0; D.closed[k] = 0; D.bn[k] = 0;
      D.fx[cell] = 1; D.phi[cell] = 0;
      return k;
    }
    // un pas de croissance : m nouvelles cases, tirées avec une probabilité ∝ φ^η
    function grow(m, eta, t, bbox) {
      const { fx, phi, st } = D;
      const stamp = ++D.stamp; let nc = 0, tot = 0;
      for (let k = 0; k < D.n; k++) {
        if (D.closed[k]) continue;
        const c = D.cell[k]; let open = 0;
        for (let o = 0; o < 8; o++) {
          const j = c + NB8[o];
          if (fx[j] !== 0) continue;
          open = 1;
          if (st[j] === stamp) continue;
          st[j] = stamp;
          const p = phi[j]; if (p <= 1e-6) continue;
          const w = Math.pow(p, eta); cI[nc] = j; cP[nc] = k; cW[nc] = w; tot += w; nc++;
        }
        if (!open) D.closed[k] = 1;
      }
      const added = [];
      if (!nc) return added;
      for (let r = 0; r < m && D.n < MAXN - 2; r++) {
        let u = Math.random() * tot, i = 0;
        while (i < nc - 1 && (u -= cW[i]) > 0) i++;
        const j = cI[i]; if (fx[j] !== 0) continue;
        const k = addNode(j, cP[i], t); added.push(k);
        if (bbox) { const x = j % D.GW, y = (j / D.GW) | 0; if (x < bbox[0]) bbox[0] = x; if (x > bbox[1]) bbox[1] = x; if (y < bbox[2]) bbox[2] = y; if (y > bbox[3]) bbox[3] = y; }
      }
      return added;
    }
    function subSizes() {
      for (let k = 0; k < D.n; k++) D.sub[k] = 1;
      for (let k = D.n - 1; k > 0; k--) if (D.par[k] >= 0) D.sub[D.par[k]] += D.sub[k];
    }

    /* ───────── grille de l'orage ───────── */
    let cbRow = 0, SD = 3;
    function buildStorm() {
      buildConds();
      const Q = QUAL[cfg.q];
      const cs = Math.sqrt((W * H) / (Q.cells * Q.cells * 0.62));
      const GW = Math.ceil(W / cs) + 2, GH = Math.ceil(H / cs) + 2;
      allocGrid(cs, GW, GH, -cs, 0);
      NB8 = [-1, 1, -GW, GW, -GW - 1, -GW + 1, GW - 1, GW + 1];
      const { fx0, phi0, cid } = D;
      cbRow = Math.round(cbY / cs);
      const gRow = new Int32Array(GW);
      for (let x = 0; x < GW; x++) gRow[x] = Math.min(GH - 1, Math.floor(groundY((x + 0.5) * cs - cs) / cs));
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (y <= cbRow) { fx0[i] = 3; phi0[i] = 0; }
        else if (y >= gRow[x]) { fx0[i] = 2; phi0[i] = 1; }
        else if (x === 0 || x === GW - 1) { fx0[i] = 4; phi0[i] = (y - cbRow) / (gRow[x] - cbRow); }
        else phi0[i] = (y - cbRow) / (gRow[x] - cbRow);
      }
      const put = (x, y, c) => { if (x < 0 || y < 0 || x >= GW || y >= GH) return; const i = y * GW + x; fx0[i] = 2; phi0[i] = 1; cid[i] = c; };
      for (const c of conds) {
        const col = Math.floor((c.x + cs) / cs), r0 = Math.floor(c.top / cs);
        for (let y = r0; y < GH; y++) put(col, y, c.i);
        if (c.k === 'chene') for (let y = r0; y < r0 + 4; y++) for (let x = col - 3; x <= col + 3; x++) if (Math.abs(x - col) + (y - r0) * 0.8 < 4) put(x, y, c.i);
        if (c.k === 'pylone') { put(col - 1, r0 + 1, c.i); put(col + 1, r0 + 1, c.i); }
        c.cell = r0 * GW + col;
      }
      D.fx.set(fx0); D.phi.set(phi0);
      sor(160, 1, GW - 2, cbRow + 1, GH - 2);
      phi0.set(D.phi);
      bfsDist();
      SD = 3;
    }

    /* ───────── état de l'orage ───────── */
    let charge = 0.35, thr = rnd(1, 0.75), strike = null, ics = [], lastHit = null, flashV = 0, veil = 0, pendingTh = null;
    const hud = { txt: '', until: 0, th: 0, km: 0 };
    function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(TAU * Math.random()); }
    function startCG(xp, positive) {
      if (cfg.scene !== 'orage') return;
      D.fx.set(D.fx0); D.phi.set(D.phi0); D.n = 0;
      let col = clamp(Math.floor((xp + D.cs) / D.cs), 2, D.GW - 3);
      const root = addNode((cbRow + 1) * D.GW + col, -1, 0);
      const kA = positive ? clamp(45 * Math.exp(0.8 * gauss()), 15, 320) : clamp(30 * Math.exp(0.55 * gauss()), 6, 160);
      strike = {
        pos: positive, t: 0, phase: 'leader', acc: 0, burst: 0, root, bbox: [col, col, cbRow, cbRow + 1], kA,
        eta: cfg.eta + (positive ? 0.7 : 0), hit: -1, conn: [], streamers: [], strokes: [], cid: -1, km: clamp(cfg.dist * rnd(1.35, 0.7), 0.4, 25),
        streamed: new Set(), tEnd: 0,
      };
    }
    function finishLeader(k) {
      const S = strike;
      // arc de jonction : on descend la carte des distances jusqu'au conducteur
      let c = D.cell[k]; const path = [c];
      for (let guard = 0; guard < 40 && D.dist[c] > 0; guard++) {
        let best = c, bd = D.dist[c];
        for (let o = 0; o < 8; o++) { const j = c + NB8[o]; if (j >= 0 && j < D.dist.length && D.dist[j] < bd) { bd = D.dist[j]; best = j; } }
        if (best === c) break; c = best; path.push(c);
      }
      S.cid = D.cid[c];
      S.conn = path.reverse().map((cc) => ({ x: (cc % D.GW + 0.5 + rnd(0.35, -0.35)) * D.cs + D.ox, y: (((cc / D.GW) | 0) + 0.5 + rnd(0.3, -0.3)) * D.cs + D.oy }));
      if (S.cid >= 0 && conds[S.cid]) { const cd = conds[S.cid]; S.conn[0] = { x: cd.x, y: cd.top }; cd.hits++; if (cd.rod) cd.rod.hits = cd.hits; }
      S.hit = k;
      // chemin principal
      const mainL = [];
      for (let j = k; j >= 0; j = D.par[j]) { D.main[j] = 1; mainL.push(j); }
      S.mainL = mainL; // du bas vers le haut
      subSizes();
      let mx = 1; for (let j = 0; j < D.n; j++) if (!D.main[j] && D.sub[j] > mx) mx = D.sub[j];
      for (let j = 0; j < D.n; j++) D.bn[j] = D.main[j] ? 1 : 0.05 + 0.55 * Math.sqrt(D.sub[j] / mx);
      // arcs : 1 pour un coup positif, 1 à 5 pour un négatif
      const n = S.pos ? 1 : 1 + Math.min(4, rint(3) + rint(3));
      let t = S.t + 0.025;
      for (let i = 0; i < n; i++) { S.strokes.push({ t, cc: S.pos ? 1.1 : Math.random() < 0.3 ? rnd(0.6, 0.2) : 0, a: i === 0 ? 1 : rnd(0.9, 0.5) }); t += rnd(0.09, 0.035); }
      S.tEnd = S.strokes[n - 1].t + (S.pos ? 0.5 : 0.25);
      S.phase = 'jonction'; S.t0 = S.t;
      const hit = S.cid >= 0 ? conds[S.cid] : null;
      lastHit = { nom: hit ? hit.nom : 'le sol', km: S.km, kA: S.kA, n, pos: S.pos, t: VT };
    }
    function streamersCheck(k) {
      const S = strike, x = cx(k), y = cy(k);
      for (const c of conds) {
        if (S.streamed.has(c.i)) continue;
        const d = Math.hypot(x - c.x, y - c.top);
        if (d < D.cs * 13) {
          S.streamed.add(c.i);
          const pts = [{ x: c.x, y: c.top }]; let px = c.x, py = c.top;
          const L = d * rnd(0.45, 0.2), n = Math.max(3, Math.round(L / (D.cs * 0.8)));
          for (let i = 0; i < n; i++) { const a = Math.atan2(y - py, x - px) + rnd(0.7, -0.7); px += Math.cos(a) * (L / n); py += Math.sin(a) * (L / n); pts.push({ x: px, y: py }); }
          S.streamers.push({ pts, t: S.t, c });
        }
      }
    }
    function stepStrike(dt) {
      const S = strike; S.t += dt;
      if (S.phase === 'leader') {
        // croissance par bonds : 25 ms de poussée, 20 ms de pause (temps du ralenti)
        S.burst = (S.burst + dt) % 0.045;
        const rate = cfg.slow ? 260 : 700;
        if (S.burst < 0.025 || !cfg.slow) S.acc += dt * rate;
        let steps = 0;
        while (S.acc >= 1 && steps < (cfg.slow ? 5 : 9)) {
          S.acc -= 1; steps++;
          const b = S.bbox;
          sor(4, b[0] - 22, b[1] + 22, cbRow + 1, Math.min(D.GH - 2, b[3] + 26));
          const add = grow(S.pos ? 2 : 3, S.eta, S.t, b);
          for (const k of add) {
            streamersCheck(k);
            if (D.dist[D.cell[k]] <= SD) { finishLeader(k); return; }
          }
          if (!add.length || D.n > MAXN - 20) { strike = null; return; }
        }
        if (S.acc > 3) S.acc = 3;
      } else if (S.phase === 'jonction') {
        if (S.t >= S.strokes[0].t) { S.phase = 'arcs'; onStroke(0); S.next = 1; }
      } else if (S.phase === 'arcs') {
        while (S.next < S.strokes.length && S.t >= S.strokes[S.next].t) { onStroke(S.next); S.next++; }
        if (S.t > S.tEnd) { S.phase = 'fin'; S.tFin = S.t; lastHit.fin = VT; }
      } else if (S.phase === 'fin') {
        if (S.t - S.tFin > 4) strike = null;
      }
    }
    // intensité du canal principal à l'instant t
    function mainE(S, t) {
      let e = 0;
      for (const s of S.strokes) {
        if (t < s.t) continue;
        const u = t - s.t;
        e += s.a * (Math.exp(-u / 0.022) * 1.4 + s.cc * Math.exp(-u / 0.14));
      }
      return e;
    }
    function onStroke(i) {
      const S = strike;
      if (i === 0) {
        thunder(S);
        hud.km = S.km; hud.th = performance.now() + (S.km / 0.343) * 1000; hud.until = hud.th + 2500;
      } else if (snd() && S.km < 2.5) au.noise(0.12, 0.05 / S.km, 2400, 0.8, 'highpass');
    }

    /* ───────── éclairs intranuages et araignées ───────── */
    function startIC(xp) {
      const v = view(), x0 = xp == null ? v.x0 + rnd(0.9, 0.1) * v.w : xp;
      const ic = { t: 0, dur: rnd(0.7, 0.3), x0, x1: x0 + rnd(0.35, -0.35) * W, y: cbY * rnd(0.85, 0.35), pulses: [], spider: null, km: clamp(cfg.dist * rnd(1.6, 0.8), 1, 25) };
      const np = 2 + rint(4);
      for (let i = 0; i < np; i++) ic.pulses.push({ t: rnd(ic.dur * 0.85, 0), a: rnd(1, 0.35) });
      if (xp != null || Math.random() < 0.35) ic.spider = spider(x0, cbY + rnd(14, 2) * kS);
      ics.push(ic);
      if (snd()) setTimeout(() => rumble(ic.km * 1.4, 0.45), 0);
    }
    function spider(x, y) {
      const segs = [];
      const walk = (x, y, a, len, w, t0, depth) => {
        let px = x, py = y, t = t0;
        const st = 7 * kS, a0 = a;
        for (let s = 0; s < len; s += st) {
          a = a0 + clamp(a - a0 + rnd(0.8, -0.8), -1.1, 1.1);
          const nx = px + Math.cos(a) * st, ny = clamp(py + Math.sin(a) * st * 0.8, cbY - 10 * kS, cbY + 40 * kS);
          t += st / (W * 0.9);
          segs.push({ x1: px, y1: py, x2: nx, y2: ny, w, t });
          px = nx; py = ny;
          if (depth < 4 && Math.random() < 0.13) walk(px, py, a + (Math.random() < 0.5 ? 1 : -1) * rnd(1.1, 0.4), (len - s) * rnd(0.5, 0.15), w * 0.65, t, depth + 1);
        }
      };
      const dir = Math.random() < 0.5 ? 0 : Math.PI;
      walk(x, y, dir, W * rnd(0.6, 0.3), 1, 0, 0);
      walk(x, y, dir + Math.PI, W * rnd(0.3, 0.1), 0.8, 0, 1);
      return segs;
    }
    const icI = (ic, t) => { let e = 0; for (const p of ic.pulses) if (t >= p.t) e += p.a * Math.exp(-(t - p.t) / 0.05); return e; };

    /* ───────── tonnerre ───────── */
    const liveSnd = [];
    function burst(t0, dur, f, g, type, q, off) {
      const c = au.ctx;
      const s = c.createBufferSource(); s.buffer = au.noiseBuf(); s.loop = true;
      const bq = c.createBiquadFilter(); bq.type = type || 'lowpass'; bq.frequency.value = f; bq.Q.value = q || 0.7;
      const v = c.createGain();
      v.gain.setValueAtTime(0.0001, t0); v.gain.linearRampToValueAtTime(g, t0 + (off || 0.04)); v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(bq); bq.connect(v); v.connect(au.master);
      s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.1);
      liveSnd.push(s); if (liveSnd.length > 40) liveSnd.shift();
    }
    function thunder(S) {
      if (!snd()) return;
      const c = au.ctx, now = c.currentTime, d = S.km;
      // chaque morceau du canal est à une distance différente : le grondement s'étire
      const pts = S.mainL.filter((_, i) => i % Math.max(1, Math.floor(S.mainL.length / 9)) === 0);
      const x0 = cx(S.mainL[0]);
      const rs = pts.map((k) => { const hkm = (groundY(cx(k)) - cy(k)) / kmPxV, dxk = (cx(k) - x0) / kmPxV; return Math.hypot(d, hkm, dxk * 0.6); }).sort((a, b) => a - b);
      const g0 = (S.pos ? 0.5 : 0.36) / Math.sqrt(Math.max(0.5, d));
      const t0 = now + rs[0] / 0.343;
      if (d < 2.2) { burst(t0, 0.35, 1500, g0 * 0.9 * (2.2 - d), 'highpass', 0.6, 0.004); burst(t0 + 0.02, 0.6, 600, g0 * 0.8, 'bandpass', 0.8, 0.008); }
      rs.forEach((r, i) => burst(now + r / 0.343 + rnd(0.15, 0), rnd(3.2, 1.6) + d * 0.12, 320 / (1 + d / 4) + 60 + rnd(60, -30), g0 * (i === 0 ? 0.9 : rnd(0.7, 0.35)) * Math.exp(-i * 0.08), 'lowpass', 0.8));
      const o = c.createOscillator(), v = c.createGain();
      o.frequency.setValueAtTime(48, t0); o.frequency.exponentialRampToValueAtTime(26, t0 + 2.5);
      v.gain.setValueAtTime(0.0001, t0); v.gain.linearRampToValueAtTime(g0 * 0.7, t0 + 0.08); v.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);
      o.connect(v); v.connect(au.master); o.start(t0); o.stop(t0 + 3); liveSnd.push(o);
    }
    function rumble(d, k) {
      if (!snd()) return;
      const now = au.ctx.currentTime, g0 = (0.22 * k) / Math.sqrt(d);
      for (let i = 0; i < 4; i++) burst(now + d / 0.343 + i * rnd(0.6, 0.2), rnd(3, 1.5), 180 / (1 + d / 5) + 50, g0 * rnd(1, 0.5), 'lowpass', 0.7);
    }
    // pluie (et bourdonnement du globe)
    let rainS = null, hum = null;
    function startAmb() {
      if (!snd()) return;
      const c = au.ensure(); if (!c) return;
      const s = c.createBufferSource(); s.buffer = au.noiseBuf(); s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.35;
      const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 7000;
      const gg = c.createGain(); gg.gain.value = 0.0001;
      s.connect(f); f.connect(f2); f2.connect(gg); gg.connect(au.master); s.start();
      rainS = { s, gg };
      hum = au.drone(100, 'sawtooth', 0); hum.cut(380);
    }
    startAmb();

    /* ───────── paysage (sombre et éclairé) ───────── */
    function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
    function paintLand(lit) {
      const L = mk(W * dpr, H * dpr), g = L.g; g.scale(dpr, dpr);
      const R = seeded(7);
      const C = lit
        ? { far: '#565c78', farT: '#3e4660', near: '#33384a', grass: '#4c5a50', tree: '#2e3a34', trunk: '#3a3430', wall: '#8a8c9c', roof: '#454858', metal: '#9aa0b4', win: '#3a3a48' }
        : { far: '#0c0d16', farT: '#090a12', near: '#06070b', grass: '#090b0e', tree: '#040507', trunk: '#040507', wall: '#08090d', roof: '#050609', metal: '#0a0b10', win: '#e0a050' };
      // collines lointaines
      g.fillStyle = C.far; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) g.lineTo(x, groundY(x) - H * (0.04 + 0.02 * Math.sin(x / W * 7.3 + 1.2) + 0.012 * Math.sin(x / W * 19 + 0.4)));
      g.lineTo(W, H); g.fill();
      // lisière de forêt sur les collines
      g.fillStyle = C.farT;
      for (let x = 0; x < W * 0.5; x += 5 * kS) {
        const by = groundY(x) - H * (0.04 + 0.02 * Math.sin(x / W * 7.3 + 1.2) + 0.012 * Math.sin(x / W * 19 + 0.4)), hh = (6 + R() * 10) * kS;
        g.beginPath(); g.moveTo(x - 4 * kS, by + 2); g.lineTo(x, by - hh); g.lineTo(x + 4 * kS, by + 2); g.fill();
      }
      // sol proche
      g.fillStyle = C.near; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) g.lineTo(x, groundY(x));
      g.lineTo(W, H); g.fill();
      if (lit) { g.strokeStyle = C.grass; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < W * 0.6; i++) { const x = R() * W, y = groundY(x) + R() * (H - groundY(x)); g.moveTo(x, y); g.lineTo(x + R() * 2 - 1, y - 3 - R() * 4); } g.stroke(); }
      for (const c of conds) {
        if (c.rod) continue;
        const s = (c.gy - c.top) / H;
        if (c.k === 'chene') {
          g.fillStyle = C.trunk; g.fillRect(c.x - 3 * kS, c.top + s * H * 0.45, 6 * kS, s * H * 0.56);
          g.fillStyle = C.tree;
          for (let i = 0; i < 26; i++) { const a = R() * Math.PI, r = R(); g.beginPath(); g.arc(c.x + Math.cos(a) * r * H * 0.075 * (1 + R() * 0.3) * (R() < 0.5 ? -1 : 1), c.top + H * 0.045 + Math.sin(a) * r * H * 0.04 - R() * H * 0.02, H * (0.018 + R() * 0.016), 0, TAU); g.fill(); }
        } else if (c.k === 'clocher') {
          const bw = H * 0.05, nave = H * 0.11;
          g.fillStyle = C.wall; g.fillRect(c.x - bw / 2, c.top + H * 0.09, bw, c.gy - c.top - H * 0.09);
          g.fillRect(c.x + bw / 2, c.gy - H * 0.07, nave * 1.6, H * 0.07);
          g.fillStyle = C.roof; g.beginPath(); g.moveTo(c.x + bw / 2, c.gy - H * 0.07); g.lineTo(c.x + bw / 2 + nave * 0.15, c.gy - H * 0.105); g.lineTo(c.x + bw / 2 + nave * 1.6, c.gy - H * 0.105); g.lineTo(c.x + bw / 2 + nave * 1.6, c.gy - H * 0.07); g.fill();
          g.beginPath(); g.moveTo(c.x - bw * 0.6, c.top + H * 0.092); g.lineTo(c.x, c.top + H * 0.012); g.lineTo(c.x + bw * 0.6, c.top + H * 0.092); g.fill();
          g.strokeStyle = C.metal; g.lineWidth = 1.2; g.beginPath(); g.moveTo(c.x, c.top + H * 0.014); g.lineTo(c.x, c.top); g.moveTo(c.x - 3, c.top + 4); g.lineTo(c.x + 3, c.top + 4); g.stroke();
          g.fillStyle = C.win;
          for (let i = 0; i < 4; i++) g.fillRect(c.x + bw / 2 + nave * (0.2 + i * 0.36), c.gy - H * 0.052, 3 * kS, 7 * kS);
          g.fillRect(c.x - 2 * kS, c.top + H * 0.12, 4 * kS, 8 * kS);
          // maisons
          for (let i = 0; i < 3; i++) {
            const hx = c.x - H * (0.12 + i * 0.075), hy = groundY(hx), hw = H * 0.045, hh = H * 0.032;
            g.fillStyle = C.wall; g.fillRect(hx - hw / 2, hy - hh, hw, hh + 4);
            g.fillStyle = C.roof; g.beginPath(); g.moveTo(hx - hw * 0.6, hy - hh); g.lineTo(hx, hy - hh - H * 0.022); g.lineTo(hx + hw * 0.6, hy - hh); g.fill();
            g.fillStyle = C.win; if (R() < 0.8) g.fillRect(hx - hw * 0.25, hy - hh * 0.6, 3 * kS, 4 * kS); if (R() < 0.5) g.fillRect(hx + hw * 0.12, hy - hh * 0.6, 3 * kS, 4 * kS);
          }
        } else if (c.k === 'pylone') {
          const hh = c.gy - c.top, bw = hh * 0.22;
          g.strokeStyle = C.metal; g.lineWidth = c.far ? 0.8 : 1.1;
          g.beginPath();
          g.moveTo(c.x - bw / 2, c.gy); g.lineTo(c.x - bw * 0.08, c.top + hh * 0.08); g.lineTo(c.x, c.top); g.lineTo(c.x + bw * 0.08, c.top + hh * 0.08); g.lineTo(c.x + bw / 2, c.gy);
          for (let i = 0; i < 7; i++) { const t1 = i / 7, t2 = (i + 1) / 7, w1 = bw * (0.5 - 0.42 * (1 - t1)), w2 = bw * (0.5 - 0.42 * (1 - t2)); const y1 = c.top + hh * (0.08 + 0.92 * t1), y2 = c.top + hh * (0.08 + 0.92 * t2); g.moveTo(c.x - w1, y1); g.lineTo(c.x + w2, y2); g.moveTo(c.x + w1, y1); g.lineTo(c.x - w2, y2); }
          for (const f of [0.22, 0.4]) { const y = c.top + hh * f; g.moveTo(c.x - bw * 0.75, y); g.lineTo(c.x + bw * 0.75, y); }
          g.stroke();
        }
      }
      // câbles entre les pylônes
      const P = conds.filter((c) => c.k === 'pylone');
      if (P.length >= 2) {
        g.strokeStyle = C.metal; g.lineWidth = 0.7;
        const [a, b] = P;
        for (const f of [0.22, 0.4]) for (const s of [-0.75, 0.75]) {
          const ax = a.x + (a.gy - a.top) * 0.22 * s, ay = a.top + (a.gy - a.top) * f, bx = b.x + (b.gy - b.top) * 0.22 * s, by = b.top + (b.gy - b.top) * f;
          g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + H * 0.025, bx, by); g.stroke();
          g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(ax - W * 0.06, ay + H * 0.03, ax - W * 0.14, ay + H * 0.02); g.stroke();
        }
        g.beginPath(); g.moveTo(a.x, a.top); g.quadraticCurveTo((a.x + b.x) / 2, Math.max(a.top, b.top) + H * 0.02, b.x, b.top); g.stroke();
      }
      return L.c;
    }
    function buildLand() { land = { dark: paintLand(false), lit: paintLand(true) }; }

    /* ───────── haute atmosphère ───────── */
    const HZ = H * 0.8, KM = (HZ - H * 0.06) / 115, CURV = 0.055;
    const limbY = (x) => { const d = (x - W / 2) / H; return HZ + d * d * H * CURV; };
    const alt = (x, km) => limbY(x) - km * KM;
    let storms = [], tles = [];
    function buildAtmo() {
      storms = [0.18, 0.47, 0.78].map((f) => ({ x: W * (f + rnd(0.05, -0.05)), q: rnd(1, 0), fl: [], cd: rnd(3, 0.5) }));
    }
    function makeSprite(x) {
      const segs = [], cols = [];
      const nC = 3 + rint(6);
      const tend = (px, py, a, len, w, depth) => {
        const st = 2.4 * KM;
        for (let s = 0; s < len; s += st) {
          a = clamp(a + rnd(0.35, -0.35), Math.PI / 2 - 0.5, Math.PI / 2 + 0.5);
          const nx = px + Math.cos(a) * st, ny = py + Math.sin(a) * st;
          segs.push({ x1: px, y1: py, x2: nx, y2: ny, c: clamp((ny - alt(x, 72)) / (24 * KM), 0, 1), w });
          px = nx; py = ny;
          if (depth < 4 && Math.random() < 0.16) tend(px, py, a + rnd(0.6, -0.6), (len - s) * rnd(0.8, 0.4), w * 0.7, depth + 1);
        }
      };
      for (let i = 0; i < nC; i++) {
        const cx0 = x + gauss() * 9 * KM, top = alt(cx0, rnd(84, 78)), bot = alt(cx0, rnd(72, 66));
        cols.push({ x: cx0, top, bot, w: rnd(2.6, 1.2) * KM });
        tend(cx0, bot, Math.PI / 2 + rnd(0.2, -0.2), rnd(26, 14) * KM, 1, 0);
      }
      return { kind: 'sprite', x, t: 0, life: 0.32, segs, cols, pulses: [0, rnd(0.06, 0.02)], halo: Math.random() < 0.6 };
    }
    function makeJet(st, giant) {
      const base = { x: st.x + rnd(20, -20) * kS, y: alt(st.x, 16) };
      const top = giant ? 86 : rnd(46, 36);
      const strs = [];
      const n = giant ? 14 : 10;
      for (let i = 0; i < n; i++) {
        const pts = [{ x: base.x, y: base.y }]; let a = -Math.PI / 2 + rnd(0.24, -0.24), px = base.x, py = base.y;
        const L = (top - 16) * KM * rnd(1, 0.7);
        for (let s = 0; s < L; s += 2.2 * KM) { a += rnd(0.2, -0.2); a = clamp(a, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4); px += Math.cos(a) * 2.2 * KM; py += Math.sin(a) * 2.2 * KM; pts.push({ x: px, y: py }); }
        strs.push(pts);
      }
      return { kind: giant ? 'geant' : 'jet', x: base.x, base, t: 0, life: giant ? 0.9 : 0.7, grow: giant ? 0.4 : 0.3, strs, top };
    }
    const makeElve = (x) => ({ kind: 'elfe', x, t: 0, life: 0.14 });
    function stormFlash(st, strong) {
      st.fl.push({ t: 0, a: strong ? 1.6 : rnd(1, 0.4), dur: rnd(0.5, 0.2) });
      if (snd()) {
        au.noise(0.03, 0.06, rnd(4000, 2000), 1.2, 'bandpass'); // craquement radio (sferic)
        if (Math.random() < 0.25) au.note(rnd(7000, 5000), rnd(1.8, 1.1), 'sine', 0.035, rnd(1100, 700)); // siffleur
      }
      if (strong) {
        if (Math.random() < 0.75) tles.push(makeSprite(st.x + rnd(30, -30) * kS));
        if (Math.random() < 0.45) tles.push(makeElve(st.x));
      }
    }

    /* ───────── figure de Lichtenberg ───────── */
    let blk = null, lich = null;
    function buildLich() {
      const Q = QUAL[cfg.q];
      const v = view(), bw = Math.min(v.w * 0.86, H * 1.2), bh = Math.min(H * 0.72, bw * 0.7);
      blk = { x0: v.cx - bw / 2, y0: H * 0.5 - bh / 2, w: bw, h: bh };
      const cs = bw / Q.lich;
      const GW = Math.ceil(bw / cs) + 2, GH = Math.ceil(bh / cs) + 2;
      allocGrid(cs, GW, GH, blk.x0 - cs, blk.y0 - cs);
      NB8 = [-1, 1, -GW, GW, -GW - 1, -GW + 1, GW - 1, GW + 1];
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (x === 0 || y === 0 || x === GW - 1 || y === GH - 1) { D.fx0[i] = 2; D.phi0[i] = 1; } else D.phi0[i] = 1;
      }
      D.fx.set(D.fx0);
      bfsDist();
      etch.g.setTransform(1, 0, 0, 1, 0, 0); etch.g.clearRect(0, 0, etch.c.width, etch.c.height);
      lich = { t: 0, live: false, idle: 0, figs: 0, D: null };
    }
    function discharge(x, y) {
      if (!blk) return;
      const gx = clamp(Math.floor((x - D.ox) / D.cs), 4, D.GW - 5), gy = clamp(Math.floor((y - D.oy) / D.cs), 4, D.GH - 5);
      D.fx.set(D.fx0); D.n = 0;
      // potentiel initial approché (logarithmique autour du point), puis relaxé
      const { phi, GW, GH } = D, R = Math.max(GW, GH);
      for (let yy = 0; yy < GH; yy++) for (let xx = 0; xx < GW; xx++) { const i = yy * GW + xx; if (D.fx[i]) { phi[i] = 1; continue; } const r = Math.hypot(xx - gx, yy - gy); phi[i] = clamp(Math.log(1 + r) / Math.log(1 + R * 0.6), 0, 1); }
      addNode(gy * GW + gx, -1, 0);
      sor(30, gx - 30, gx + 30, gy - 30, gy + 30);
      for (const l of [liveC, liveG]) { l.g.setTransform(1, 0, 0, 1, 0, 0); l.g.clearRect(0, 0, l.c.width, l.c.height); }
      lich.live = true; lich.t = 0; lich.acc = 0; lich.bbox = [gx, gx, gy, gy]; lich.D = null; lich.x = x; lich.y = y; lich.done = false;
      if (snd()) { au.noise(0.18, 0.28, 2600, 0.6, 'highpass'); au.noise(0.5, 0.12, 900, 0.9, 'bandpass'); }
    }
    function stepLich(dt) {
      if (!lich.live) {
        lich.idle += dt;
        if (cfg.lichAuto && lich.idle > (lich.figs ? 7 : 0.4)) {
          if (lich.figs >= 1) { etch.g.setTransform(1, 0, 0, 1, 0, 0); etch.g.clearRect(0, 0, etch.c.width, etch.c.height); lich.figs = 0; }
          discharge(blk.x0 + blk.w * rnd(0.7, 0.3), blk.y0 + blk.h * rnd(0.7, 0.3));
        }
        return;
      }
      lich.t += dt;
      if (lich.done) { if (lich.t > lich.tDone + 0.5) { lich.live = false; lich.idle = 0; } return; }
      const Q = QUAL[cfg.q];
      lich.acc += dt * 420;
      let steps = 0;
      while (lich.acc >= 1 && steps < 8) {
        lich.acc -= 1; steps++;
        const b = lich.bbox;
        sor(5, b[0] - 18, b[1] + 18, b[2] - 18, b[3] + 18);
        const add = grow(3 + Math.floor(D.n * 0.015), cfg.lichEta, lich.t, b);
        liveDraw(add);
        let edge = false;
        for (const k of add) if (D.dist[D.cell[k]] <= 2) edge = true;
        if (snd() && Math.random() < 0.5) au.noise(0.04, 0.05, rnd(5000, 2000), 1, 'bandpass');
        if (edge || !add.length || D.n >= Q.lichN) { finishLich(); return; }
      }
    }
    // le tronc déjà tracé ne change plus : on ne dessine que les nouvelles branches
    function liveDraw(ks) {
      if (!ks.length) return;
      const ink = env.decor === false && env.theme === 'light';
      const gC = liveC.g, gG = liveG.g;
      gC.setTransform(dpr, 0, 0, dpr, 0, 0); gG.setTransform(1 / 4, 0, 0, 1 / 4, 0, 0);
      gC.lineCap = gG.lineCap = 'round';
      gC.beginPath(); gG.beginPath();
      for (const k of ks) { const p = D.par[k]; if (p < 0) continue; gC.moveTo(cx(p), cy(p)); gC.lineTo(cx(k), cy(k)); gG.moveTo(cx(p), cy(p)); gG.lineTo(cx(k), cy(k)); }
      gG.lineWidth = 4 * kS; gG.strokeStyle = ink ? 'rgba(150,130,220,.35)' : 'rgba(150,160,255,.32)'; gG.stroke();
      gC.lineWidth = 0.8 * kS; gC.strokeStyle = ink ? 'rgba(32,22,66,.7)' : 'rgba(225,230,255,.55)'; gC.stroke();
    }
    function boxDim() {
      const pts = []; for (let k = 0; k < D.n; k++) pts.push(D.cell[k] % D.GW, (D.cell[k] / D.GW) | 0);
      const xs = [], ys = [];
      for (const s of [1, 2, 4, 8, 16]) { const set = new Set(); for (let i = 0; i < pts.length; i += 2) set.add(((pts[i] / s) | 0) * 4096 + ((pts[i + 1] / s) | 0)); xs.push(Math.log(1 / s)); ys.push(Math.log(set.size)); }
      const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
      let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
      return num / den;
    }
    function finishLich() {
      lich.done = true; lich.tDone = lich.t; lich.figs++;
      subSizes();
      let mx = 1; for (let k = 0; k < D.n; k++) if (D.sub[k] > mx) mx = D.sub[k];
      lich.D = boxDim(); lich.N = D.n;
      // gravure permanente
      const g = etch.g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineCap = 'round';
      const ink = env.decor === false && env.theme === 'light';
      for (const pass of [0, 1, 2]) {
        for (let b = 0; b < 6; b++) {
          g.beginPath();
          for (let k = 1; k < D.n; k++) {
            const w = Math.sqrt(D.sub[k] / mx), bb = Math.min(5, Math.floor(w * 6));
            if (bb !== b) continue;
            const p = D.par[k]; g.moveTo(cx(p), cy(p)); g.lineTo(cx(k), cy(k));
          }
          // deux passes larges et pâles font la lueur, la dernière le trait gravé
          g.lineWidth = (0.5 + (b / 5) * 2.4) * kS * [7, 3, 1][pass];
          g.strokeStyle = ink ? `rgba(40,30,80,${[0.04, 0.1, 0.5 + b * 0.08][pass]})` : pass === 2 ? `rgba(235,242,255,${0.55 + b * 0.08})` : `rgba(130,165,255,${[0.05, 0.12][pass]})`;
          g.stroke();
        }
      }
      if (snd()) au.noise(0.6, 0.06, 500, 0.7, 'lowpass');
    }

    /* ───────── globe à plasma ───────── */
    let globe = null, finger = null;
    const GAS = {
      nexe: { nom: 'Néon et xénon', core: [255, 215, 255], glow: [205, 70, 255], tip: [150, 160, 255] },
      neon: { nom: 'Néon', core: [255, 225, 190], glow: [255, 90, 40], tip: [255, 150, 90] },
      argon: { nom: 'Argon', core: [225, 220, 255], glow: [120, 90, 255], tip: [200, 120, 255] },
    };
    function buildGlobe() {
      const R = Math.min(view().w * 0.42, H * 0.33);
      globe = { cx: view().cx, cy: H * 0.46, R, r0: R * 0.13, fil: [] };
      for (let i = 0; i < 18; i++) {
        const z = rnd(1, -1), a = rnd(TAU), s = Math.sqrt(1 - z * z);
        globe.fil.push({ v: [Math.cos(a) * s, Math.sin(a) * s, z], seed: rnd(100), br: rnd(1, 0.6) });
      }
    }
    function stepGlobe(dt) {
      globe.cx += (view().cx - globe.cx) * Math.min(1, dt * 3);
      const n = Math.round(6 + cfg.tension * 12);
      const F = finger ? (() => { const dx = (finger.x - globe.cx) / globe.R, dy = (finger.y - globe.cy) / globe.R, r2 = dx * dx + dy * dy; if (r2 > 1.05) return null; const z = Math.sqrt(Math.max(0, 1 - Math.min(1, r2))); const l = Math.hypot(dx, dy, z); return [dx / l, dy / l, z / l]; })() : null;
      for (let i = 0; i < n; i++) {
        const f = globe.fil[i], v = f.v;
        // dérive lente, convection vers le haut, répulsion mutuelle
        const t = VT * 0.35 + f.seed;
        v[0] += (Math.sin(t * 1.3) * 0.25 + Math.sin(t * 2.9) * 0.12) * dt;
        v[1] += (Math.cos(t * 1.1) * 0.22 - 0.12) * dt;
        v[2] += Math.sin(t * 0.8 + 1) * 0.2 * dt;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const u = globe.fil[j].v, dx = v[0] - u[0], dy = v[1] - u[1], dz = v[2] - u[2], d2 = dx * dx + dy * dy + dz * dz + 0.02;
          const k = (0.025 * dt) / d2; v[0] += dx * k; v[1] += dy * k; v[2] += dz * k;
        }
        if (F) {
          const d = Math.hypot(v[0] - F[0], v[1] - F[1], v[2] - F[2]);
          const k = Math.min(1, dt * (i < 3 ? 9 : 1.2 / (0.3 + d * d)));
          v[0] += (F[0] - v[0]) * k; v[1] += (F[1] - v[1]) * k; v[2] += (F[2] - v[2]) * k;
        }
        const l = Math.hypot(v[0], v[1], v[2]); v[0] /= l; v[1] /= l; v[2] /= l;
      }
      if (F && snd() && Math.random() < dt * 6) au.noise(0.03, 0.03, rnd(6000, 3000), 1.5, 'bandpass');
      globe.F = F;
    }

    /* ───────── scènes ───────── */
    function setScene(id) {
      cfg.scene = id; strike = null; ics = []; tles = []; finger = null; label = null;
      if (id === 'orage') { buildStorm(); buildLand(); }
      if (id === 'atmo') buildAtmo();
      if (id === 'lich') buildLich();
      if (id === 'plasma') buildGlobe();
    }
    function setQuality(q) {
      if (q === cfg.q) return;
      cfg.q = q; initGL(); setScene(cfg.scene);
    }

    /* ───────── vie autonome ───────── */
    function update(dt) {
      VT += dt;
      if (cfg.scene === 'orage') {
        charge += dt * (0.04 + 0.42 * cfg.act);
        if (charge > thr && !strike) {
          thr = rnd(1.05, 0.7);
          if (Math.random() < 0.45) { startIC(); charge *= 0.45; }
          else {
            charge = 0;
            const pos = Math.random() < cfg.pos, v = view();
            startCG(v.x0 + (pos ? (Math.random() < 0.5 ? rnd(0.2, 0.04) : rnd(0.96, 0.8)) : rnd(0.92, 0.08)) * v.w, pos);
          }
        }
        if (strike) stepStrike(dt);
        for (let i = ics.length - 1; i >= 0; i--) { const ic = ics[i]; ic.t += dt; if (ic.t > ic.dur + 0.4) ics.splice(i, 1); }
        // feu de Saint-Elme : il s'allume quand le champ est fort, surtout sous un traceur qui approche
        for (const c of conds) {
          let e = cfg.act * clamp((charge - 0.45) * 1.6, 0, 1) * (c.k === 'chene' ? 0.4 : 1);
          if (strike && strike.phase === 'leader' && D.n) { const tip = D.n - 1, d = Math.hypot(cx(tip) - c.x, cy(tip) - c.top); e = Math.max(e, clamp(1.4 - d / (H * 0.35), 0, 1)); }
          c.elmo += (e - c.elmo) * Math.min(1, dt * 4);
        }
        if (rainS) rainS.gg.gain.setTargetAtTime(cfg.rain ? 0.012 + cfg.act * 0.05 : 0.0001, au.ctx.currentTime, 0.5);
      } else if (rainS) rainS.gg.gain.setTargetAtTime(0.0001, au.ctx.currentTime, 0.3);
      if (hum) hum.gain(cfg.scene === 'plasma' ? 0.006 + cfg.tension * 0.01 : 0);
      if (cfg.scene === 'atmo') {
        for (const st of storms) {
          st.cd -= dt * (0.3 + cfg.act * 1.2) * (0.5 + st.q);
          if (st.cd <= 0) { st.cd = rnd(2.5, 0.6); stormFlash(st, Math.random() < 0.18 + cfg.tle * 0.35); if (Math.random() < cfg.tle * 0.06) tles.push(makeJet(st, Math.random() < 0.2)); }
          for (let i = st.fl.length - 1; i >= 0; i--) { st.fl[i].t += dt; if (st.fl[i].t > st.fl[i].dur) st.fl.splice(i, 1); }
        }
        for (let i = tles.length - 1; i >= 0; i--) { tles[i].t += dt; if (tles[i].t > tles[i].life) tles.splice(i, 1); }
      }
      if (cfg.scene === 'lich') stepLich(dt);
      if (cfg.scene === 'plasma') stepGlobe(dt);
    }

    /* ───────── tracé des canaux ───────── */
    const BK = 10, VMAX = 1.6;
    const bM = Array.from({ length: BK }, () => []), bB = Array.from({ length: BK }, () => []);
    function clearB() { for (let i = 0; i < BK; i++) { bM[i].length = 0; bB[i].length = 0; } }
    function seg(main, v, x1, y1, x2, y2) {
      if (v < 0.015) return;
      const b = Math.min(BK - 1, Math.floor((v / VMAX) * BK));
      (main ? bM : bB)[b].push(x1, y1, x2, y2);
    }
    function strokeB(g, arr, width, col, alphaK, widen) {
      for (let b = 0; b < BK; b++) {
        const a = arr[b]; if (!a.length) continue;
        const v = ((b + 0.5) / BK) * VMAX;
        g.beginPath();
        for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i], a[i + 1]); g.lineTo(a[i + 2], a[i + 3]); }
        g.lineWidth = width * (widen ? 1 + Math.max(0, v - 0.8) * 1.2 : 1);
        g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${Math.min(1, v * alphaK)})`;
        g.stroke();
      }
    }
    // dessine les seaux remplis : halo (1/8), lueur (1/4) et cœur (pleine résolution)
    function flushB(pal, ink, kW) {
      kW = kW || 1;
      const L = [L8, L4];
      for (const l of L) { l.g.setTransform(1, 0, 0, 1, 0, 0); l.g.clearRect(0, 0, l.c.width, l.c.height); }
      L8.g.setTransform(1 / 8, 0, 0, 1 / 8, 0, 0); L4.g.setTransform(1 / 4, 0, 0, 1 / 4, 0, 0);
      for (const l of L) { l.g.lineCap = 'round'; l.g.lineJoin = 'round'; }
      strokeB(L8.g, bM, 34 * kS * kW, pal.halo, 0.32); strokeB(L8.g, bB, 22 * kS * kW, pal.halo, 0.2);
      strokeB(L4.g, bM, 10 * kS * kW, pal.glow, 0.55); strokeB(L4.g, bB, 6 * kS * kW, pal.glow, 0.42);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalCompositeOperation = ink ? 'multiply' : 'lighter';
      ctx.drawImage(L8.c, 0, 0, W, H); ctx.drawImage(L4.c, 0, 0, W, H);
      ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokeB(ctx, bM, 1.7 * kS * kW, pal.core, 1, true); strokeB(ctx, bB, 0.9 * kS * kW, pal.core, 0.9, false);
      ctx.restore();
    }
    const PAL = { core: [255, 255, 255], glow: [200, 190, 255], halo: [140, 130, 255] };
    const PAL_POS = { core: [255, 250, 240], glow: [255, 220, 200], halo: [210, 160, 255] };
    const PAL_INK = { core: [32, 22, 66], glow: [150, 130, 220], halo: [175, 160, 235] };

    function collectStrike(S) {
      const t = S.t, n = D.n;
      if (S.phase === 'leader') {
        if (!cfg.slow) return 0;
        for (let k = 1; k < n; k++) { const p = D.par[k], v = 0.07 + 0.55 * Math.exp(-(t - D.tb[k]) / 0.03); seg(false, v, cx(p), cy(p), cx(k), cy(k)); }
        for (const s of S.streamers) streamer(s, t, 0.35);
        return 0.04;
      }
      const t0 = S.strokes[0].t;
      if (S.phase === 'jonction') {
        if (cfg.slow) for (let k = 1; k < n; k++) { const p = D.par[k]; seg(false, 0.1, cx(p), cy(p), cx(k), cy(k)); }
        const f = clamp((t - S.t0) / (t0 - S.t0), 0, 1), m = Math.max(1, Math.round(f * (S.conn.length - 1)));
        for (let i = 0; i < m; i++) seg(true, 0.8, S.conn[i].x, S.conn[i].y, S.conn[i + 1].x, S.conn[i + 1].y);
        for (const s of S.streamers) streamer(s, t, 0.4);
        return 0.06;
      }
      // arcs en retour, traceurs obscurs, puis rémanence
      let E = mainE(S, t);
      const last = S.strokes[S.strokes.length - 1].t;
      if (t > last) E += 0.12 * Math.exp(-(t - last) / 0.3);
      let front = 1;
      for (const s of S.strokes) { const u = t - s.t; if (u >= 0 && u < 0.008) front = u / 0.008; }
      const ML = S.mainL, nm = ML.length;
      for (let i = 0; i < nm; i++) {
        const k = ML[i], p = D.par[k]; if (p < 0) continue;
        let v = E * (i / nm <= front ? 1 : 0.15);
        // traceur obscur qui redescend le canal avant chaque arc subséquent
        for (let j = 1; j < S.strokes.length; j++) {
          const s = S.strokes[j], u = s.t - t;
          if (u > 0 && u < 0.014) { const tip = 1 - u / 0.014, pos = 1 - i / nm; if (pos <= tip) v = Math.max(v, pos > tip - 0.06 ? 0.9 : 0.22); }
        }
        seg(true, v, cx(p), cy(p), cx(k), cy(k));
      }
      // le canal monte dans le nuage
      const r = S.root; seg(true, E * 0.6, cx(r), cy(r), cx(r) + rnd(4, -4), cbY - 14 * kS);
      const eb = Math.exp(-(t - t0) / 0.035);
      if (t >= t0 && eb > 0.01) for (let k = 1; k < n; k++) { if (D.main[k]) continue; const p = D.par[k]; seg(false, D.bn[k] * eb * 1.2, cx(p), cy(p), cx(k), cy(k)); }
      const ec = E;
      for (let i = 0; i < S.conn.length - 1; i++) seg(true, ec, S.conn[i].x, S.conn[i].y, S.conn[i + 1].x, S.conn[i + 1].y);
      for (const s of S.streamers) streamer(s, t, t < t0 + 0.05 ? 0.3 : 0);
      return E;
    }
    function streamer(s, t, a) {
      if (a <= 0) return;
      const f = clamp((t - s.t) / 0.05, 0, 1), m = Math.max(1, Math.round(f * (s.pts.length - 1)));
      for (let i = 0; i < m; i++) seg(false, a, s.pts[i].x, s.pts[i].y, s.pts[i + 1].x, s.pts[i + 1].y);
    }

    /* ───────── rendu ───────── */
    function skyGL(P, setup, lights) {
      const LA = new Float32Array(32); const nl = Math.min(8, lights.length);
      for (let i = 0; i < nl; i++) LA.set(lights[i], i * 4);
      P.use().f('uRes', W, H).f('uT', VT).i('uNL', nl).v4('uL', LA);
      setup(P);
      G.K.run(P, null);
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.imageSmoothingEnabled = true; ctx.drawImage(G.K.canvas, 0, 0, W, H); ctx.restore();
    }
    function sky2D(lights) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#05060c'); g.addColorStop(0.25, '#0b0c16'); g.addColorStop(1, '#0d0c14');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const r = l[3] * H * 1.6, rg = ctx.createRadialGradient(l[0], l[1], 0, l[0], l[1], r);
        rg.addColorStop(0, `rgba(190,185,255,${Math.min(0.7, l[2] * 0.35)})`); rg.addColorStop(1, 'rgba(190,185,255,0)');
        ctx.fillStyle = rg; ctx.fillRect(l[0] - r, l[1] - r, 2 * r, 2 * r);
      }
      ctx.restore();
    }
    function renderStorm(bare, ink) {
      const lights = [];
      let E = 0;
      clearB();
      if (strike) {
        const S = strike, r = S.root;
        E = collectStrike(S);
        const midK = S.mainL ? S.mainL[(S.mainL.length * 0.5) | 0] : D.n - 1;
        lights.push([cx(r), cbY - H * 0.04, E * 1.3 + (S.phase === 'leader' ? 0.05 : 0), 0.32]);
        if (S.mainL) lights.push([cx(midK), cy(midK), E * 0.5, 0.2]);
      }
      for (const ic of ics) {
        const k = clamp(ic.t / ic.dur, 0, 1), I = icI(ic, ic.t);
        lights.push([ic.x0 + (ic.x1 - ic.x0) * k, ic.y, I * 0.9, 0.22]);
        if (ic.spider) for (const s of ic.spider) { if (s.t > ic.t * 1.6) continue; seg(s.w > 0.9, I * s.w * 0.9, s.x1, s.y1, s.x2, s.y2); }
      }
      // flashs adoucis : la luminosité de tout l'écran suit une moyenne glissante, plafonnée
      let tot = 0; for (const l of lights) tot += l[2];
      // (montée rapide, descente lente : les arcs successifs ne font qu'un seul flash)
      const target = Math.min(cfg.soft ? 0.9 : 2.2, tot);
      veil += (target - veil) * (!cfg.soft ? 1 : target > veil ? 0.22 : 0.035);
      const kL = tot > 1e-4 ? veil / tot : 0;
      const L2 = lights.map((l) => [l[0], l[1], l[2] * kL, l[3]]);
      if (!bare) {
        if (G) skyGL(G.sky, (P) => P.f('uBase', cbY / H + 0.02).f('uRain', cfg.rain ? 0.5 + cfg.act : 0), L2);
        else sky2D(L2);
        ctx.drawImage(land.dark, 0, 0, W, H);
        const gl = clamp(veil * 0.9, 0, cfg.soft ? 0.75 : 1);
        if (gl > 0.01) { ctx.globalAlpha = gl; ctx.drawImage(land.lit, 0, 0, W, H); ctx.globalAlpha = 1; }
        // paratonnerres posés
        ctx.strokeStyle = gl > 0.1 ? '#a0a6ba' : '#2a2c38'; ctx.lineWidth = 1.6;
        for (const c of conds) if (c.rod) { ctx.beginPath(); ctx.moveTo(c.x, c.gy + 2); ctx.lineTo(c.x, c.top); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(c.x - 3, c.gy - 2, 6, 4); }
        // feux de Saint-Elme
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const c of conds) {
          if (c.elmo < 0.04) continue;
          const a = c.elmo * (0.6 + 0.4 * Math.sin(VT * 37 + c.x)), r = (7 + 9 * c.elmo) * kS;
          const rg = ctx.createRadialGradient(c.x, c.top, 0, c.x, c.top, r);
          rg.addColorStop(0, `rgba(190,200,255,${0.7 * a})`); rg.addColorStop(0.35, `rgba(120,130,255,${0.35 * a})`); rg.addColorStop(1, 'rgba(90,80,255,0)');
          ctx.fillStyle = rg; ctx.fillRect(c.x - r, c.top - r, 2 * r, 2 * r);
          ctx.strokeStyle = `rgba(170,180,255,${0.5 * a})`; ctx.lineWidth = 0.7; ctx.beginPath();
          for (let i = 0; i < 5; i++) { const an = -Math.PI / 2 + rnd(1.2, -1.2), l = r * rnd(1, 0.4); ctx.moveTo(c.x, c.top); ctx.lineTo(c.x + Math.cos(an) * l, c.top + Math.sin(an) * l); }
          ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.fillStyle = ink ? PAPER : '#000'; ctx.fillRect(0, 0, W, H);
        if (rods.length) { ctx.strokeStyle = ink ? 'rgba(40,30,70,.5)' : 'rgba(200,200,230,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (const c of conds) if (c.rod) { ctx.moveTo(c.x, c.gy); ctx.lineTo(c.x, c.top); } ctx.stroke(); }
      }
      flushB(ink ? PAL_INK : strike && strike.pos ? PAL_POS : PAL, ink, strike && strike.pos ? 1.3 : 1);
      // rémanence rétinienne : l'image du canal persiste quelques secondes dans l'œil
      if (cfg.after && strike && strike.phase === 'fin') {
        const a = 0.22 * Math.exp(-(strike.t - strike.tFin) / 1.2);
        ctx.save(); ctx.globalCompositeOperation = ink ? 'multiply' : 'lighter'; ctx.strokeStyle = ink ? `rgba(120,100,200,${a})` : `rgba(150,120,255,${a})`; ctx.lineWidth = 3 * kS; ctx.lineJoin = 'round';
        ctx.beginPath(); const ML = strike.mainL; for (let i = 0; i < ML.length; i++) { const k = ML[i]; if (i) ctx.lineTo(cx(k), cy(k)); else ctx.moveTo(cx(k), cy(k)); } ctx.stroke(); ctx.restore();
      }
      // compte à rebours du tonnerre
      const now = performance.now();
      if (now < hud.until && !bare) {
        const v = view(), left = (hud.th - now) / 1000;
        ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(230,228,255,.75)'; ctx.textAlign = 'left';
        ctx.fillText(left > 0 ? `ÉCLAIR À ${fr(hud.km)} KM · TONNERRE DANS ${Math.ceil(left)} S` : `ÉCLAIR À ${fr(hud.km)} KM · 3 S PAR KILOMÈTRE`, v.x0 + 16, H - 16);
        ctx.restore();
      }
    }
    function renderAtmo(bare, ink) {
      const lights = [];
      for (const st of storms) for (const f of st.fl) lights.push([st.x, alt(st.x, 10), f.a * Math.exp(-f.t / 0.08) * (0.7 + 0.3 * Math.sin(f.t * 90)), 0.05]);
      lights.sort((a, b) => b[2] - a[2]);
      if (!bare) {
        if (G) skyGL(G.atmo, (P) => P.f('uHz', HZ).f('uKm', KM).f('uGlow', cfg.glow ? 1 : 0).f('uCurv', CURV), lights.slice(0, 8));
        else {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#05070c'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, limbY(x)); ctx.lineTo(W, H); ctx.fill();
          if (cfg.glow) { ctx.strokeStyle = 'rgba(80,200,110,.3)'; ctx.lineWidth = 6 * kS; ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, alt(x, 95)); ctx.stroke(); }
        }
      } else { ctx.fillStyle = ink ? PAPER : '#000'; ctx.fillRect(0, 0, W, H); }
      // farfadets, jets et elfes
      ctx.save(); ctx.globalCompositeOperation = ink ? 'multiply' : 'lighter'; ctx.lineCap = 'round';
      for (const e of tles) {
        if (e.kind === 'sprite') {
          let I = 0; for (const p of e.pulses) if (e.t >= p) I += Math.exp(-(e.t - p) / 0.045);
          I = Math.min(1.3, I);
          if (e.halo) { // halo diffus au sommet
            const y = alt(e.x, 85), r = 26 * KM;
            ctx.save(); ctx.translate(e.x, y); ctx.scale(1, 0.25);
            const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            rg.addColorStop(0, ink ? `rgba(200,80,80,${0.35 * I})` : `rgba(255,70,60,${0.35 * I})`); rg.addColorStop(1, 'rgba(255,40,40,0)');
            ctx.fillStyle = rg; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
          }
          for (const c of e.cols) {
            const lg = ctx.createLinearGradient(0, c.top, 0, c.bot);
            lg.addColorStop(0, 'rgba(255,40,40,0)'); lg.addColorStop(0.3, ink ? `rgba(190,50,60,${0.5 * I})` : `rgba(255,50,50,${0.55 * I})`); lg.addColorStop(1, ink ? `rgba(170,40,90,${0.6 * I})` : `rgba(255,60,90,${0.7 * I})`);
            ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(c.x, (c.top + c.bot) / 2, c.w, (c.bot - c.top) / 2, 0, 0, TAU); ctx.fill();
          }
          for (const pass of [0, 1]) for (const s of e.segs) {
            const c = s.c, r = Math.round(255 - c * 110), g = Math.round(50 + c * 50), b = Math.round(70 + c * 185);
            ctx.strokeStyle = ink ? `rgba(${r * 0.6 | 0},${g * 0.5 | 0},${b * 0.6 | 0},${(pass ? 0.5 : 0.15) * I})` : `rgba(${r},${g},${b},${(pass ? 0.6 : 0.16) * I * (1 - c * 0.3)})`;
            ctx.lineWidth = (pass ? 1.1 : 4.5) * s.w * kS;
            ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
          }
        } else if (e.kind === 'jet' || e.kind === 'geant') {
          const gr = clamp(e.t / e.grow, 0, 1), I = e.t < e.grow ? 1 : Math.exp(-(e.t - e.grow) / 0.12);
          for (const pts of e.strs) {
            const m = Math.max(1, Math.round(gr * (pts.length - 1)));
            for (const pass of [0, 1]) {
              ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 1; i <= m; i++) ctx.lineTo(pts[i].x, pts[i].y);
              const red = e.kind === 'geant' && gr > 0.6;
              if (red) { const lg = ctx.createLinearGradient(0, e.base.y, 0, alt(e.x, e.top)); lg.addColorStop(0, `rgba(70,130,255,${(pass ? 0.45 : 0.12) * I})`); lg.addColorStop(0.45, `rgba(120,110,255,${(pass ? 0.4 : 0.12) * I})`); lg.addColorStop(1, `rgba(255,60,70,${(pass ? 0.5 : 0.16) * I})`); ctx.strokeStyle = ink ? `rgba(60,50,150,${(pass ? 0.4 : 0.12) * I})` : lg; ctx.lineWidth = (pass ? 1 : 5) * kS; ctx.stroke(); continue; }
              ctx.strokeStyle = ink ? `rgba(40,70,170,${(pass ? 0.4 : 0.12) * I})` : `rgba(${red ? 140 : 70},${red ? 110 : 130},255,${(pass ? 0.45 : 0.12) * I})`;
              ctx.lineWidth = (pass ? 1 : 5) * kS; ctx.stroke();
            }
                      }
          const rg = ctx.createRadialGradient(e.base.x, e.base.y, 0, e.base.x, e.base.y, 9 * KM);
          rg.addColorStop(0, ink ? `rgba(40,80,180,${0.4 * I})` : `rgba(160,200,255,${0.6 * I})`); rg.addColorStop(1, 'rgba(60,120,255,0)');
          ctx.fillStyle = rg; ctx.fillRect(e.base.x - 9 * KM, e.base.y - 9 * KM, 18 * KM, 18 * KM);
        } else if (e.kind === 'elfe') {
          const k = e.t / e.life, r = k * 190 * KM, a = (1 - k) * 0.55, y = alt(e.x, 90);
          for (const pass of [0, 1]) {
            ctx.strokeStyle = ink ? `rgba(170,60,50,${a * (pass ? 0.8 : 0.3)})` : `rgba(255,${pass ? 110 : 70},70,${a * (pass ? 0.8 : 0.3)})`;
            ctx.lineWidth = (pass ? 2 : 9) * kS * (1 + k * 2);
            ctx.beginPath(); ctx.ellipse(e.x, y, Math.max(1, r), Math.max(0.5, r * 0.09), 0, 0, TAU); ctx.stroke();
          }
        }
      }
      ctx.restore();
    }
    function renderLich(bare, ink) {
      const b = blk;
      if (!bare) {
        const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7);
        g.addColorStop(0, '#11131c'); g.addColorStop(1, '#040408');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // reflet du bloc sur la table
        ctx.fillStyle = 'rgba(120,150,220,.035)'; ctx.fillRect(b.x0, b.y0 + b.h + 6, b.w, b.h * 0.18);
        ctx.fillStyle = 'rgba(90,130,200,.07)'; ctx.fillRect(b.x0, b.y0, b.w, b.h);
        ctx.strokeStyle = 'rgba(170,205,255,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x0, b.y0, b.w, b.h);
        ctx.strokeStyle = 'rgba(170,205,255,.12)'; ctx.lineWidth = 1; ctx.strokeRect(b.x0 + 8, b.y0 + 8, b.w - 16, b.h - 16);
        const lg = ctx.createLinearGradient(b.x0, b.y0, b.x0 + b.w * 0.5, b.y0 + b.h);
        lg.addColorStop(0, 'rgba(255,255,255,.06)'); lg.addColorStop(0.4, 'rgba(255,255,255,0)'); ctx.fillStyle = lg; ctx.fillRect(b.x0, b.y0, b.w, b.h);
      } else { ctx.fillStyle = ink ? PAPER : '#000'; ctx.fillRect(0, 0, W, H); }
      ctx.drawImage(etch.c, 0, 0, W, H);
      if (lich.live) {
        clearB();
        const t = lich.t, fade = lich.done ? Math.exp(-(t - lich.tDone) / 0.12) : 1;
        ctx.save(); ctx.globalAlpha = fade; ctx.globalCompositeOperation = ink ? 'multiply' : 'lighter';
        ctx.drawImage(liveG.c, 0, 0, W, H); ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter'; ctx.drawImage(liveC.c, 0, 0, W, H); ctx.restore();
        // seules les pointes fraîches brillent davantage
        for (let k = D.n - 1; k > 0 && t - D.tb[k] < 0.12; k--) { const p = D.par[k]; seg(false, 0.9 * Math.exp(-(t - D.tb[k]) / 0.05) * fade, cx(p), cy(p), cx(k), cy(k)); }
        flushB(ink ? PAL_INK : PAL, ink, 0.55);
        if (!bare) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(110,140,255,${0.06 * fade})`; ctx.fillRect(b.x0, b.y0, b.w, b.h); ctx.restore(); }
      }
      if (!bare && lich.x != null) { ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.arc(lich.x, lich.y, 2.2 * kS, 0, TAU); ctx.fill(); }
    }
    function renderGlobe(bare, ink) {
      const gb = globe, gas = GAS[cfg.gas], n = Math.round(6 + cfg.tension * 12);
      if (!bare) {
        const g = ctx.createRadialGradient(gb.cx, gb.cy, gb.R * 0.5, gb.cx, gb.cy, Math.max(W, H) * 0.8);
        g.addColorStop(0, '#0d0a14'); g.addColorStop(1, '#030305');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // socle
        const by = gb.cy + gb.R * 0.92;
        ctx.fillStyle = '#0b0b10'; ctx.beginPath(); ctx.moveTo(gb.cx - gb.R * 0.38, by); ctx.lineTo(gb.cx + gb.R * 0.38, by); ctx.lineTo(gb.cx + gb.R * 0.62, by + gb.R * 0.5); ctx.lineTo(gb.cx - gb.R * 0.62, by + gb.R * 0.5); ctx.fill();
        ctx.strokeStyle = 'rgba(160,160,190,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gb.cx - gb.R * 0.42, by + 3); ctx.lineTo(gb.cx + gb.R * 0.42, by + 3); ctx.stroke();
        // verre (fond)
        const gg = ctx.createRadialGradient(gb.cx, gb.cy, gb.R * 0.2, gb.cx, gb.cy, gb.R);
        gg.addColorStop(0, `rgba(${gas.glow[0]},${gas.glow[1]},${gas.glow[2]},.05)`); gg.addColorStop(0.85, 'rgba(40,30,60,.06)'); gg.addColorStop(1, 'rgba(160,150,220,.12)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gb.cx, gb.cy, gb.R, 0, TAU); ctx.fill();
        ctx.fillStyle = '#06060a'; ctx.fillRect(gb.cx - gb.r0 * 0.25, gb.cy, gb.r0 * 0.5, gb.R * 0.95);
      } else { ctx.fillStyle = ink ? PAPER : '#000'; ctx.fillRect(0, 0, W, H); }
      clearB();
      const t = VT;
      const bucketsTip = [];
      for (let i = 0; i < n; i++) {
        const f = gb.fil[i], v = f.v, depth = 0.55 + 0.45 * v[2];
        const ex = gb.cx + v[0] * gb.R * 0.985, ey = gb.cy + v[1] * gb.R * 0.985;
        const sx = gb.cx + v[0] * gb.r0, sy = gb.cy + v[1] * gb.r0;
        const dx = ex - sx, dy = ey - sy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
        const N = 22, amp = gb.R * 0.05;
        let px = sx, py = sy;
        const wob = (s, o) => (Math.sin(s * 7.1 + t * 2.3 + f.seed + o) * 0.6 + Math.sin(s * 13.7 - t * 3.1 + f.seed * 2 + o) * 0.35 + Math.sin(s * 23 + t * 5 + o) * 0.05) * Math.sin(Math.PI * s);
        const br = (0.55 + 0.45 * f.br) * depth * (0.85 + 0.15 * Math.sin(t * 9 + f.seed));
        for (let j = 1; j <= N; j++) {
          const s = j / N, w = wob(s, 0) * amp;
          const x = sx + dx * s + nx * w, y = sy + dy * s + ny * w;
          seg(j < N * 0.75, br * (0.8 + 0.4 * s), px, py, x, y);
          px = x; py = y;
          // les filaments se divisent en doigts près du verre
          if (j === Math.round(N * 0.75)) {
            for (let q = 0; q < 2 + (i % 3); q++) {
              let qx = x, qy = y; const off = (q - 1) * 0.07;
              for (let jj = j + 1; jj <= N; jj++) { const s2 = jj / N, w2 = (wob(s2, q * 3.3) * amp) + off * gb.R * (s2 - 0.75) * 4; const X = sx + dx * s2 + nx * w2, Y = sy + dy * s2 + ny * w2; seg(false, br * 0.55, qx, qy, X, Y); qx = X; qy = Y; }
              bucketsTip.push([qx, qy, br]);
            }
            break;
          }
        }
      }
      const pal = ink ? PAL_INK : { core: gas.core, glow: gas.glow, halo: gas.glow };
      flushB(pal, ink, 0.8);
      ctx.save(); ctx.globalCompositeOperation = ink ? 'multiply' : 'lighter';
      for (const [x, y, b] of bucketsTip) { const r = 6 * kS, rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, ink ? `rgba(90,80,160,${0.3 * b})` : `rgba(${gas.tip[0]},${gas.tip[1]},${gas.tip[2]},${0.45 * b})`); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
      // électrode centrale
      const er = gb.r0 * 1.9, rg = ctx.createRadialGradient(gb.cx, gb.cy, 0, gb.cx, gb.cy, er);
      rg.addColorStop(0, ink ? 'rgba(80,60,140,.5)' : `rgba(${gas.core[0]},${gas.core[1]},${gas.core[2]},.65)`); rg.addColorStop(0.5, ink ? 'rgba(120,100,190,.25)' : `rgba(${gas.glow[0]},${gas.glow[1]},${gas.glow[2]},.3)`); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(gb.cx - er, gb.cy - er, 2 * er, 2 * er);
      if (gb.F) { const x = gb.cx + gb.F[0] * gb.R, y = gb.cy + gb.F[1] * gb.R, r = 22 * kS, r2 = ctx.createRadialGradient(x, y, 0, x, y, r); r2.addColorStop(0, ink ? 'rgba(90,70,170,.35)' : `rgba(${gas.core[0]},${gas.core[1]},${gas.core[2]},.5)`); r2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = r2; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
      ctx.restore();
      if (!bare) {
        ctx.save(); ctx.strokeStyle = 'rgba(200,200,240,.28)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(gb.cx, gb.cy, gb.R, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 5 * kS; ctx.beginPath(); ctx.arc(gb.cx, gb.cy, gb.R * 0.9, -2.5, -1.7); ctx.stroke();
        ctx.lineWidth = 2 * kS; ctx.beginPath(); ctx.arc(gb.cx, gb.cy, gb.R * 0.93, 0.4, 0.75); ctx.stroke(); ctx.restore();
      }
    }

    /* ───────── identification ───────── */
    let label = null;
    function nearSeg(x, y) {
      if (!strike || strike.phase === 'leader') return null;
      let best = 1e9, bk = -1;
      for (let k = 1; k < D.n; k++) { const d = Math.hypot(cx(k) - x, cy(k) - y); if (d < best) { best = d; bk = k; } }
      return best < 18 * kS ? { k: bk, x: cx(bk), y: cy(bk) } : null;
    }
    function describe(l) {
      if (l.what === 'eclair') {
        const S = l.S, main = D.main[l.k];
        const kind = S.pos ? 'Éclair positif nuage-sol' : 'Éclair négatif nuage-sol';
        if (!main) return ['Ramification', 'traceur avorté · n’a jamais touché le sol', '#b9b4ff'];
        const hit = S.cid >= 0 ? conds[S.cid].nom.toLowerCase() : 'le sol';
        return [kind, `${Math.round(S.kA)} kA · ${S.strokes.length} arc${S.strokes.length > 1 ? 's' : ''} en retour · ~30 000 °C · à ${fr(S.km)} km · a frappé ${hit}`, S.pos ? '#ffd9a0' : '#c9c4ff'];
      }
      if (l.what === 'cond') { const c = l.c; return [c.nom, `${c.m} m · frappé ${c.hits} fois${c.elmo > 0.2 ? ' · feu de Saint-Elme' : ''}${c.k === 'chene' ? ' · la sève bout, l’écorce éclate' : ''}`, '#9fb6ff']; }
      if (l.what === 'nuage') return ['Cumulonimbus', `base à 1,5 km · sommet vers 12 km · charge ${Math.round(clamp(charge / thr, 0, 1) * 100)} % du seuil`, '#b9a8ff'];
      if (l.what === 'pluie') return ['Pluie d’orage', 'gouttes de 2 à 5 mm · la charge naît plus haut, entre grésil et cristaux de glace', '#9fd8ff'];
      if (l.what === 'sol') return ['Sol', 'chargé positivement par influence sous la base du nuage', '#c8c0b0'];
      if (l.what === 'tle') {
        const e = l.e;
        return {
          sprite: ['Farfadet rouge', 'sprite · 50 à 90 km · quelques millisecondes · azote excité', '#ff4a4a'],
          jet: ['Jet bleu', 'du sommet de l’orage jusqu’à ~40 km · ~100 km/s', '#4f8dff'],
          geant: ['Jet géant', 'de l’orage jusqu’à l’ionosphère, ~90 km', '#8a7dff'],
          elfe: ['Elfe', 'anneau à 90 km · s’élargit sur des centaines de km en < 1 ms', '#ff7a5a'],
        }[e.kind];
      }
      if (l.what === 'airglow') return ['Lueur nocturne', 'oxygène atomique · 557,7 nm · ~95 km d’altitude', '#8ad8a0'];
      if (l.what === 'orage') return ['Sommet d’orage', 'enclume à ~15 km, vue d’en haut · les éclairs l’allument de l’intérieur', '#b9a8ff'];
      if (l.what === 'terre') return ['Terre de nuit', 'nuages au clair de lune, lumières des villes', '#c8c0b0'];
      if (l.what === 'espace') return ['Espace', 'au-dessus de 100 km, l’air ne diffuse plus la lumière', '#c8d0e0'];
      if (l.what === 'lich') return lich.D ? ['Figure de Lichtenberg', `${lich.N} segments · dimension fractale ≈ ${fr(lich.D, 2)} · η = ${fr(cfg.lichEta, 1)}`, '#d8e4ff'] : ['Bloc de plexiglas', 'chargé d’électrons piégés · touchez avec l’outil ÉCLAIR', '#a8c4ff'];
      if (l.what === 'globe') return ['Filaments de plasma', `${GAS[cfg.gas].nom.toLowerCase()} à basse pression · ~30 kHz, 2 à 5 kV · la chaleur les fait monter`, '#ff7ae0'];
      return ['—', '', '#c8d0e0'];
    }
    function pick(x, y) {
      if (cfg.scene === 'orage') {
        const s = nearSeg(x, y); if (s) return { what: 'eclair', S: strike, k: s.k, x: s.x, y: s.y };
        for (const c of conds) if (Math.abs(c.x - x) < 16 * kS && y > c.top - 12 && y < c.gy) return { what: 'cond', c, x: c.x, y: c.top };
        if (y < cbY + 10) return { what: 'nuage', x, y };
        if (y < groundY(x)) return { what: 'pluie', x, y };
        return { what: 'sol', x, y };
      }
      if (cfg.scene === 'atmo') {
        for (const e of tles) { if (Math.abs(e.x - x) < 40 * kS + (e.kind === 'elfe' ? 100 * KM * (e.t / e.life) : 0) && y < limbY(x) - 10 * KM) return { what: 'tle', e, x: e.x, y: e.kind === 'elfe' ? alt(e.x, 90) : alt(e.x, e.kind === 'sprite' ? 70 : 30) }; }
        const h = (limbY(x) - y) / KM;
        if (h < 0) return { what: 'terre', x, y };
        if (h < 18) return { what: 'orage', x, y };
        if (Math.abs(h - 95) < 10 && cfg.glow) return { what: 'airglow', x, y };
        return { what: 'espace', x, y };
      }
      if (cfg.scene === 'lich') return { what: 'lich', x, y };
      return { what: 'globe', x, y };
    }
    function drawLabel(paper) {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (6 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      const { x, y } = label;
      let [name, role, col] = describe(label);
      if (paper) col = '#4a3a6a';
      const v = view(), side = x > v.x0 + v.w * 0.5 ? -1 : 1, lx = x + side * 46, ly = y < 70 ? y + 50 : y - 40;
      ctx.save();
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + side * 9, y + (ly > y ? 9 : -9)); ctx.lineTo(lx - side * 6, ly + (ly > y ? -12 : 6)); ctx.stroke();
      ctx.shadowColor = paper ? 'rgba(250,246,238,.9)' : 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
      ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = paper ? 'rgba(30,24,40,.94)' : 'rgba(250,250,245,.96)';
      ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(name, lx, ly);
      ctx.fillStyle = col; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    /* ───────── boucle ───────── */
    let pending = false;
    function render() {
      const bare = env.decor === false, ink = bare && env.theme === 'light';
      if (cfg.scene === 'orage') renderStorm(bare, ink);
      else if (cfg.scene === 'atmo') renderAtmo(bare, ink);
      else if (cfg.scene === 'lich') renderLich(bare, ink);
      else renderGlobe(bare, ink);
      drawLabel(ink);
    }
    function frame(t, dt) {
      if (dt > 0) { update(dt); if (label) label.t += dt * 2.5; }
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    if (window.FASC_DEBUG) window.FASC_DEBUG.foudre = { D, cfg, setScene, startCG: (x, p) => startCG(x, p), startIC, get strike() { return strike; }, get lich() { return lich; }, discharge, stormFlash: (i) => stormFlash(storms[i], true), jet: (i, g) => tles.push(makeJet(storms[i], g)), get tles() { return tles; }, run(n, h) { for (let i = 0; i < n; i++) { update(h); render(); } }, render };

    setScene('orage');
    for (let i = 0; i < 10; i++) update(1 / 30);

    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool;
        if (tool === 'observer') { const o = pick(p.x, p.y); label = { ...o, t: 0 }; return; }
        if (cfg.scene === 'orage') {
          if (tool === 'eclair') { if (!strike || strike.phase === 'fin') { startCG(p.x, Math.random() < cfg.pos); charge = 0; } }
          else if (tool === 'paratonnerre') { if (rods.length < 6 && p.y > H * 0.5) { rods.push({ x: p.x, hits: 0 }); strike = null; buildStorm(); buildLand(); } }
          else if (tool === 'gomme') { const i = rods.findIndex((r) => Math.abs(r.x - p.x) < 20 * kS); if (i >= 0) { rods.splice(i, 1); strike = null; buildStorm(); buildLand(); } }
        } else if (cfg.scene === 'atmo') {
          if (tool === 'eclair') { const st = storms.reduce((a, b) => (Math.abs(b.x - p.x) < Math.abs(a.x - p.x) ? b : a)); stormFlash(st, false); const e = makeSprite(p.x); tles.push(e); if (snd()) au.noise(0.04, 0.08, 3000, 1, 'bandpass'); }
        } else if (cfg.scene === 'lich') {
          if (tool === 'eclair' && p.x > blk.x0 + 8 && p.x < blk.x0 + blk.w - 8 && p.y > blk.y0 + 8 && p.y < blk.y0 + blk.h - 8) discharge(p.x, p.y);
        } else if (cfg.scene === 'plasma') {
          if (tool !== 'observer') finger = { x: p.x, y: p.y };
        }
      },
      move(p) { if (p.down && finger) { finger.x = p.x; finger.y = p.y; } },
      up() { finger = null; },
      clear() {
        if (cfg.scene === 'orage') { rods = []; strike = null; ics = []; buildStorm(); buildLand(); }
        else if (cfg.scene === 'lich') { buildLich(); }
        else if (cfg.scene === 'atmo') tles = [];
      },
      dispose() {
        for (const s of liveSnd) { try { s.stop(); } catch (e) { /* rien */ } }
        if (rainS) { try { rainS.gg.gain.setTargetAtTime(0.0001, au.ctx.currentTime, 0.1); rainS.s.stop(au.ctx.currentTime + 0.5); } catch (e) { /* rien */ } }
        if (hum) hum.stop();
        if (G) G.K.lose();
      },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: [
          { label: 'Orage', act: () => setScene('orage') },
          { label: 'Haute atmosphère', act: () => setScene('atmo') },
          { label: 'Figure de Lichtenberg', act: () => setScene('lich') },
          { label: 'Globe à plasma', act: () => setScene('plasma') },
        ] });
        if (cfg.scene === 'orage') {
          L.push({ type: 'section', label: 'Orage' });
          L.push({ type: 'bar', label: 'Charge du nuage', color: '#b9a8ff', value: clamp(charge / thr, 0, 1), txt: Math.round(clamp(charge / thr, 0, 1) * 100) + ' %' });
          const lh = lastHit;
          L.push({ type: 'note', text: !lh ? 'La charge monte. Touchez le ciel avec l’outil ÉCLAIR pour ne pas attendre.' : `Dernier coup : ${lh.pos ? 'positif' : 'négatif'}, ${Math.round(lh.kA)} kA, ${lh.n} arc${lh.n > 1 ? 's' : ''} en retour, sur ${lh.nom.toLowerCase()}, à ${fr(lh.km)} km : tonnerre ${fr(lh.km / 0.343, 0)} s plus tard.` });
          L.push({ type: 'buttons', items: [{ label: 'Éclair !', act: () => { if (!strike || strike.phase === 'fin') { startCG(rnd(0.85, 0.15) * W, Math.random() < cfg.pos); charge = 0; } } }, { label: 'Éclair intranuage', act: () => startIC() }] });
          L.push({ type: 'slider', label: 'Activité orageuse', min: 0, max: 1, step: 0.01, value: cfg.act, fmt: (x) => (x < 0.2 ? 'orage lointain' : x < 0.6 ? 'orage' : x < 0.85 ? 'fort orage' : 'supercellule'), set: (x) => { cfg.act = x; } });
          L.push({ type: 'slider', label: 'Distance de l’orage', min: 0.5, max: 15, step: 0.1, value: cfg.dist, fmt: (x) => fr(x) + ' km · tonnerre après ' + fr(x / 0.343, 0) + ' s', set: (x) => { cfg.dist = x; } });
          L.push({ type: 'slider', label: 'Ramification η', min: 1, max: 4.5, step: 0.05, value: cfg.eta, fmt: (x) => fr(x, 2) + (x < 1.6 ? ' · corail' : x < 2.8 ? ' · éclair' : ' · trait'), set: (x) => { cfg.eta = x; } });
          L.push({ type: 'slider', label: 'Part des coups positifs', min: 0, max: 0.6, step: 0.01, value: cfg.pos, fmt: (x) => Math.round(x * 100) + ' %' + (Math.abs(x - 0.1) < 0.03 ? ' · comme dans la nature' : ''), set: (x) => { cfg.pos = x; } });
          L.push({ type: 'choice', label: 'Déroulé', value: cfg.slow ? 'ralenti' : 'naturel', set: (x) => { cfg.slow = x === 'ralenti'; }, options: [{ id: 'ralenti', label: 'Ralenti (traceur visible)' }, { id: 'naturel', label: 'À l’œil nu' }] });
          L.push({ type: 'toggle', label: 'Pluie', value: cfg.rain, set: (x) => { cfg.rain = x; } });
          L.push({ type: 'toggle', label: 'Rémanence rétinienne', value: cfg.after, set: (x) => { cfg.after = x; } });
          L.push({ type: 'toggle', label: 'Flashs adoucis (photosensibilité)', value: cfg.soft, set: (x) => { cfg.soft = x; } });
          L.push({ type: 'note', text: `Paratonnerres posés : ${rods.length} / 6.` + (conds.some((c) => c.hits) ? ' Coups reçus : ' + conds.filter((c) => c.hits).map((c) => c.nom.split(' ')[0].toLowerCase() + ' ' + c.hits).join(', ') + '.' : '') });
        }
        if (cfg.scene === 'atmo') {
          L.push({ type: 'section', label: 'Haute atmosphère' });
          L.push({ type: 'note', text: 'Vue rasante depuis l’orbite, de nuit : trois orages au ras du limbe. L’échelle verticale est exagérée pour que les 100 km d’atmosphère tiennent dans l’écran.' });
          L.push({ type: 'buttons', items: [
            { label: 'Farfadet', act: () => { const st = storms[rint(storms.length)]; stormFlash(st, false); tles.push(makeSprite(st.x)); } },
            { label: 'Jet bleu', act: () => tles.push(makeJet(storms[rint(storms.length)], false)) },
            { label: 'Jet géant', act: () => tles.push(makeJet(storms[rint(storms.length)], true)) },
            { label: 'Elfe', act: () => { const st = storms[rint(storms.length)]; stormFlash(st, false); tles.push(makeElve(st.x)); } },
          ] });
          L.push({ type: 'slider', label: 'Activité des orages', min: 0, max: 1, step: 0.01, value: cfg.act, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.act = x; } });
          L.push({ type: 'slider', label: 'Phénomènes lumineux transitoires', min: 0, max: 1, step: 0.01, value: cfg.tle, fmt: (x) => (x < 0.2 ? 'rares' : x < 0.7 ? 'fréquents' : 'nuit exceptionnelle'), set: (x) => { cfg.tle = x; } });
          L.push({ type: 'toggle', label: 'Lueur nocturne (airglow)', value: cfg.glow, set: (x) => { cfg.glow = x; } });
          if (au && au.on) L.push({ type: 'note', text: 'Le son est celui d’un récepteur radio à très basse fréquence : craquements des éclairs et siffleurs.' });
        }
        if (cfg.scene === 'lich') {
          L.push({ type: 'section', label: 'Figure de Lichtenberg' });
          L.push({ type: 'note', text: lich && lich.D ? `${lich.N} segments · dimension fractale ≈ ${fr(lich.D, 2)}, mesurée par comptage de boîtes. Les très grandes figures à η = 1 tendent vers 1,7 ; une petite figure donne moins.` : 'Touchez le bloc avec l’outil ÉCLAIR pour déclencher la décharge.' });
          L.push({ type: 'slider', label: 'Ramification η', min: 0.5, max: 3, step: 0.05, value: cfg.lichEta, fmt: (x) => fr(x, 2) + (x < 1.3 ? ' · arborescence touffue' : x < 2 ? ' · branches' : ' · rares éclairs'), set: (x) => { cfg.lichEta = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Nouveau bloc', act: () => buildLich() }, { label: 'Décharge au centre', act: () => discharge(blk.x0 + blk.w / 2, blk.y0 + blk.h / 2) }] });
          L.push({ type: 'toggle', label: 'Décharges automatiques', value: cfg.lichAuto, set: (x) => { cfg.lichAuto = x; } });
        }
        if (cfg.scene === 'plasma') {
          L.push({ type: 'section', label: 'Globe à plasma' });
          L.push({ type: 'note', text: 'Posez le doigt sur le verre (avec n’importe quel outil sauf OBSERVER) : les filaments s’y précipitent, le courant passe par votre corps vers la terre.' });
          L.push({ type: 'slider', label: 'Tension', min: 0, max: 1, step: 0.01, value: cfg.tension, fmt: (x) => fr(2 + x * 3) + ' kV', set: (x) => { cfg.tension = x; } });
          L.push({ type: 'choice', label: 'Gaz', value: cfg.gas, set: (x) => { cfg.gas = x; }, options: Object.keys(GAS).map((k) => ({ id: k, label: GAS[k].nom })) });
        }
        L.push({ type: 'section', label: 'Calcul' });
        L.push({ type: 'choice', label: 'Définition', value: cfg.q, set: setQuality, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        if (cfg.scene === 'orage' || cfg.scene === 'lich') L.push({ type: 'note', text: `Grille ${D.GW}×${D.GH} pour le potentiel · ${G ? 'ciel en WebGL2' : 'ciel en 2D'}.` });
        return L;
      },
    };
  }
})();
