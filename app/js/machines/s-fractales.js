/* Fascination — Les Fractales · Mandelbrot sans fond, Julia, flammes et courbes (WebGL2 + 2D)
   Mandelbrot : plongée profonde par la méthode des perturbations — une orbite de référence calculée en double
   précision (JS), et pour chaque pixel l'écart à cette orbite en simple précision sur la carte graphique, avec
   « rebasage » (Zhuoran, 2021) pour éviter les défauts. Zoom jusqu'à ~10⁻¹³. Ombrage par estimation de distance
   et carte de normales. Son : glissando de Shepard qui descend sans fin.
   Julia : c qui voyage au bord de l'ensemble de Mandelbrot, carte en médaillon.
   Flammes : jeu du chaos (fougère de Barnsley, Sierpiński, dragon, érable, flammes à variations) en densité log.
   Courbes : dragon qui se déplie, flocon de Koch, arbre de Pythagore. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const QUAL = { legere: { res: 0.5, pts: 40000, it: 0.7 }, normale: { res: 0.75, pts: 80000, it: 0.9 }, haute: { res: 1, pts: 140000, it: 1 } };

  /* ───────── couleurs (communes aux deux shaders) ───────── */
  const COLOR = `
uniform int uPal; uniform float uRhy, uPhase, uRelief, uInk;
vec3 cosp(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b * cos(6.2831853 * (c * t + d)); }
vec3 classic(float t){
  t = fract(t);
  vec3 c0 = vec3(0., 7., 100.) / 255., c1 = vec3(32., 107., 203.) / 255., c2 = vec3(237., 255., 255.) / 255., c3 = vec3(255., 170., 0.) / 255., c4 = vec3(0., 2., 0.) / 255.;
  if (t < .16) return mix(c4, c0, t / .16) * 0. + mix(c0, c1, t / .16);
  if (t < .42) return mix(c1, c2, (t - .16) / .26);
  if (t < .6425) return mix(c2, c3, (t - .42) / .2225);
  if (t < .8575) return mix(c3, c4, (t - .6425) / .215);
  return mix(c4, c0, (t - .8575) / .1425);
}
vec3 pal(float t){
  if (uPal == 0) return classic(t);
  if (uPal == 1) return cosp(t, vec3(.5), vec3(.5), vec3(1.), vec3(0., .1, .2));
  if (uPal == 2) return cosp(t, vec3(.5), vec3(.5), vec3(1., .7, .4), vec3(0., .15, .2));
  if (uPal == 3) return cosp(t, vec3(.5), vec3(.5), vec3(1.), vec3(0., .33, .67));
  if (uPal == 4) return cosp(t, vec3(.8, .5, .4), vec3(.2, .4, .2), vec3(2., 1., 1.), vec3(0., .25, .25));
  return vec3(.15, .13, .3);
}
// it : itérations lissées (-1 = intérieur) · z : valeur finale · der : dérivée · px : taille d'un pixel
vec3 shade(float it, vec2 z, vec2 der, float px){
  vec3 paper = vec3(.953, .933, .89);
  if (it < 0.) return uPal == 5 ? vec3(.13, .11, .26) : vec3(.012, .01, .025);
  float r = length(z), dist = .5 * r * log(r) / max(length(der), 1e-30);
  float e = clamp(dist / px, 0., 4.);
  vec2 u = z / der; u /= max(length(u), 1e-30);
  float lt = clamp((dot(u, vec2(.7071)) + 1.5) / 2.5, 0., 1.);
  if (uPal == 5){
    float ink = 1. - smoothstep(0., 1.6, e);
    return mix(paper, vec3(.13, .11, .26), clamp(ink * .9 + (1. - lt) * .25 * uRelief, 0., 1.));
  }
  vec3 c = pal(sqrt(max(it, 0.)) * .085 * uRhy + uPhase);
  c *= mix(1., .35 + .9 * lt, uRelief);
  c *= mix(.25, 1., smoothstep(0., 1.2, e));
  return c;
}
vec2 cmul(vec2 a, vec2 b){ return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
`;
  // Mandelbrot par perturbation autour d'une orbite de référence
  const FS_PERT = HEAD + COLOR + `
uniform sampler2D uRef; uniform int uRefN, uMaxI; uniform vec2 uRes, uOff; uniform float uScale;
out vec4 o;
vec2 Z(int n){ return texelFetch(uRef, ivec2(n % 1024, n / 1024), 0).xy; }
void main(){
  vec2 dc = uOff + (gl_FragCoord.xy - uRes * .5) * uScale;
  vec2 dz = vec2(0.), der = vec2(0.), dzz = vec2(1., 0.), z = vec2(0.);
  int n = 0, i = 0; bool esc = false;
  for (i = 0; i < 20000; i++){
    if (i >= uMaxI) break;
    vec2 Zn = Z(n);
    z = Zn + dz;
    der = 2. * cmul(z, der) + vec2(1., 0.);
    if (i > 0) dzz = 2. * cmul(z, dzz); // z₀ = 0 : on commence à z₁ = c
    dz = cmul(2. * Zn + dz, dz) + dc;
    n++;
    z = Z(n) + dz;
    float r2 = dot(z, z);
    if (r2 > 1e8){ esc = true; break; }
    if (dot(dzz, dzz) < 1e-12 && i > 8) break; // cycle attractif : intérieur
    if (r2 < dot(dz, dz) || n >= uRefN - 1){ dz = z; n = 0; } // rebasage
  }
  float it = esc ? float(i) + 1. - log2(log(length(z))) : -1.;
  o = vec4(shade(it, z, der, uScale), 1.);
}`;
  // calcul direct en simple précision : Julia et variantes
  const FS_DIRECT = HEAD + COLOR + `
uniform int uF, uMaxI; uniform vec2 uRes, uC0, uJc; uniform float uScale; uniform vec4 uMark;
out vec4 o;
void main(){
  vec2 p = uC0 + (gl_FragCoord.xy - uRes * .5) * uScale;
  bool jul = uF == 1;
  vec2 c = jul ? uJc : p, z = jul ? p : vec2(0.), der = jul ? vec2(1., 0.) : vec2(0.);
  int i = 0; bool esc = false;
  for (i = 0; i < 4000; i++){
    if (i >= uMaxI) break;
    if (uF == 4){ der = 3. * cmul(cmul(z, z), der) + vec2(1., 0.); z = cmul(cmul(z, z), z) + c; }
    else {
      vec2 zz = z;
      if (uF == 2) zz = vec2(abs(z.x), abs(z.y));
      if (uF == 3) zz = vec2(z.x, -z.y);
      der = 2. * cmul(zz, der) + (jul ? vec2(0.) : vec2(1., 0.));
      z = cmul(zz, zz) + c;
    }
    if (dot(z, z) > 1e8){ esc = true; break; }
  }
  float it = esc ? float(i) + 1. - log2(log(length(z))) / log2(uF == 4 ? 3. : 2.) : -1.;
  vec3 col = shade(it, z, der, uScale);
  if (uMark.z > 0.){ float d = length(gl_FragCoord.xy - uMark.xy); col = mix(col, vec3(1.), smoothstep(2.5, 1., abs(d - uMark.z))); }
  o = vec4(col, 1.);
}`;

  /* ───────── jeu du chaos : systèmes de fonctions itérées ───────── */
  // x' = a x + b y + e ; y' = c x + d y + f ; p : probabilité ; k : couleur
  const IFS = {
    fougere: { nom: 'Fougère de Barnsley', m: [[0, 0, 0, 0.16, 0, 0, 0.01], [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85], [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07], [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07]] },
    sierpinski: { nom: 'Triangle de Sierpiński', m: [[0.5, 0, 0, 0.5, 0, 0, 1], [0.5, 0, 0, 0.5, 0.5, 0, 1], [0.5, 0, 0, 0.5, 0.25, 0.433, 1]] },
    dragon: { nom: 'Dragon de Heighway', m: [[0.5, -0.5, 0.5, 0.5, 0, 0, 1], [-0.5, -0.5, 0.5, -0.5, 1, 0, 1]] },
    erable: { nom: 'Feuille d’érable', m: [[0.14, 0.01, 0, 0.51, -0.08, -1.31, 0.1], [0.43, 0.52, -0.45, 0.5, 1.49, -0.75, 0.35], [0.45, -0.49, 0.47, 0.47, -1.62, -0.74, 0.35], [0.49, 0, 0, 0.51, 0.02, 1.62, 0.2]] },
  };
  const VARS = ['linéaire', 'sinus', 'sphère', 'tourbillon', 'fer à cheval', 'mouchoir'];
  function randFlame() {
    const n = 3 + rint(2), m = [];
    for (let i = 0; i < n; i++) {
      const a = rnd(TAU), s = rnd(0.85, 0.35), sk = rnd(0.4, -0.4);
      m.push([s * Math.cos(a), -s * Math.sin(a) + sk, s * Math.sin(a), s * Math.cos(a), rnd(1, -1), rnd(1, -1), rnd(1, 0.3), VARS.map(() => (Math.random() < 0.45 ? rnd(1, 0) : 0))]);
    }
    for (const t of m) { const sum = t[7].reduce((x, y) => x + y, 0); if (sum < 0.1) t[7][0] = 1; else t[7] = t[7].map((x) => x / sum); }
    return { nom: 'Flamme', m, sym: [1, 2, 3, 5, 6][rint(5)], flame: true };
  }

  const MANDEL_TARGETS = [
    { nom: 'Vallée des hippocampes', x: -0.7436438870371587, y: 0.13182590420531197, fin: 2e-12 },
    { nom: 'Point de Feigenbaum', x: -1.4011551890920506, y: 0, fin: 2e-5 },
    { nom: 'Point de Misiurewicz', x: -0.10109636384562, y: 0.95628651080914, fin: 4e-12 }, // z₃ = z₄ : l'orbite tombe sur un point fixe
    { nom: 'Dendrite de c = i', x: 0, y: 1, fin: 4e-12 },
    { nom: 'Mini-Mandelbrot', x: -1.7548776662466927, y: 0, fin: 0.004 },
    { nom: 'Vallée des éléphants', x: 0.2925755, y: -0.0149977, fin: 2e-6 },
  ];
  // centre exact du mini-Mandelbrot de période 3 : racine de c³ + 2c² + c + 1 = 0
  (() => { let c = -1.75; for (let i = 0; i < 60; i++) c -= (c * c * c + 2 * c * c + c + 1) / (3 * c * c + 4 * c + 1); MANDEL_TARGETS[4].x = c; })();

  window.FASC.push({
    id: 'fractal', name: 'Les Fractales', cat: 'Motifs', glyph: '❈', smoothTime: true,
    blurb: 'Mandelbrot sans fond, Julia, flammes et courbes',
    hint: 'OBSERVER : touchez pour savoir si le point appartient à l’ensemble · PLONGER : touchez pour zoomer, glissez pour vous déplacer · RECULER : touchez pour dézoomer · SCULPTER : glissez pour changer c (Julia), voir le Julia d’un point (Mandelbrot) ou plier la courbe.',
    intro: 'Une seule ligne de calcul, z devient z² + c, répétée encore et encore. Selon le point de départ, le nombre reste sage ou s’envole. La frontière entre les deux est l’objet le plus compliqué des mathématiques : on peut y plonger mille milliards de fois sans jamais toucher le fond, et retrouver en chemin des copies de l’ensemble entier.',
    legend: [
      { color: '#202060', name: 'Ensemble de Mandelbrot', role: 'z → z² + c, z part de 0', desc: 'Les valeurs de c pour lesquelles la suite reste bornée. Il est connexe (Douady et Hubbard, 1982), et son bord a une dimension de Hausdorff égale à 2 (Shishikura, 1998).' },
      { color: '#ffaa00', name: 'Bandes de couleur', role: 'vitesse de fuite', desc: 'Hors de l’ensemble, la couleur dit combien d’étapes il faut pour s’échapper. Les bandes sont lissées par le logarithme de la distance atteinte.' },
      { color: '#9fd8ff', name: 'Ensemble de Julia', role: 'même formule, c fixé', desc: 'On fixe c et on fait varier le point de départ. Si c est dans l’ensemble de Mandelbrot, le Julia est d’un seul tenant ; sinon c’est une poussière de Cantor.' },
      { color: '#e8c070', name: 'Mini-Mandelbrot', role: 'copie presque parfaite', desc: 'Le long des filaments se cachent une infinité de copies de l’ensemble entier, entourées chacune de leur propre décor.' },
      { color: '#ff7a5a', name: 'Point de Feigenbaum', role: 'c ≈ −1,401155', desc: 'Là s’accumulent les doublements de période. En y plongeant, le même motif revient tous les 4,669… fois : la constante de Feigenbaum, qui régit aussi les robinets qui gouttent et les populations animales.' },
      { color: '#79f3b4', name: 'Fougère de Barnsley', role: '4 transformations · jeu du chaos', desc: 'Quatre déplacements choisis au hasard, répétés des milliers de fois : une fougère apparaît. Michael Barnsley l’a montré en 1988.' },
      { color: '#ff8ad8', name: 'Flamme fractale', role: 'Scott Draves, 1992', desc: 'Des transformations tordues par des fonctions (sinus, sphère, tourbillon), et une image tirée de la densité des points en échelle logarithmique, comme une photographie à pose longue.' },
      { color: '#c09aff', name: 'Courbe du dragon', role: 'pliages successifs', desc: 'Pliez une bande de papier en deux, puis encore en deux, dix fois dans le même sens, et dépliez chaque pli à angle droit : vous tenez un dragon. La courbe ne se croise jamais.' },
      { color: '#9fe0ff', name: 'Flocon de Koch', role: 'périmètre infini, aire finie', desc: 'Chaque côté est remplacé par quatre côtés trois fois plus courts. Le périmètre est multiplié par 4/3 à chaque étape et tend vers l’infini ; l’aire reste finie, 8/5 de celle du triangle de départ.' },
    ],
    about: [
      'Le mot « fractale » est inventé en 1975 par Benoît Mandelbrot, du latin fractus, brisé. Il voulait nommer ces formes rugueuses à toutes les échelles qu’on avait longtemps traitées de « monstres » : la courbe de Koch (1904), le triangle de Sierpiński (1915), les ensembles que Gaston Julia et Pierre Fatou étudiaient en 1918, sans ordinateur pour les voir. Sa question de 1967 est restée célèbre : combien mesure la côte de la Bretagne ? Plus la règle est petite, plus la côte est longue.',
      'L’ensemble de Mandelbrot apparaît pour la première fois sur une imprimante en 1980, au centre de recherche d’IBM. Sa définition tient en une ligne, mais son bord ne finit jamais : chaque zoom révèle des hippocampes, des spirales, des éclairs et des copies miniatures de l’ensemble entier, reliées par des filaments. Adrien Douady, qui l’a étudié avec John Hubbard, disait qu’il y avait là « de quoi occuper les mathématiciens pendant des siècles ».',
      'Plonger profond demande de la précision : à 10⁻⁷, la simple précision des cartes graphiques ne distingue plus deux pixels voisins. La simulation calcule donc une seule orbite de référence en double précision, puis, pour chaque pixel, seulement l’écart à cette orbite, qui tient dans les nombres de la carte graphique. Quand l’écart menace de devenir plus grand que l’orbite elle-même, on rebase. La limite est ici vers 10⁻¹³, soit un grossissement de dix mille milliards : la taille d’un atome agrandi jusqu’à celle de la Terre.',
      'Le son de la plongée est un glissando de Shepard : plusieurs notes à l’octave dont le volume suit une cloche, qui descendent ensemble ; en haut une nouvelle note naît en silence pendant qu’en bas une autre s’éteint. L’oreille entend une chute sans fin, comme le zoom. Jean-Claude Risset l’a rendu célèbre dans les années 1960.',
      'Les fougères, les dragons et les flammes se dessinent au hasard : on part d’un point, on lui applique une transformation tirée au sort, puis une autre, des centaines de milliers de fois. Le nuage de points ne peut que tomber sur la figure, l’« attracteur » des transformations. Le chou romanesco, les poumons, les rivières vues d’avion et les éclairs de la machine Foudre suivent des règles voisines.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez un point : appartient-il à l’ensemble ? En combien d’étapes s’échappe-t-il ? Sur quel cycle tombe-t-il ?' },
      { id: 'plonger', label: 'plonger', desc: 'Touchez pour zoomer vers ce point (la plongée automatique s’arrête). Glissez pour vous déplacer.' },
      { id: 'reculer', label: 'reculer', desc: 'Touchez pour dézoomer.' },
      { id: 'sculpter', label: 'sculpter', desc: 'Mandelbrot : glissez pour voir le Julia du point sous le doigt. Julia : glissez pour choisir c. Courbes : glissez pour plier. Flammes : touchez pour une nouvelle flamme.' },
    ],
    make(env) { return makeFract(env); },
  });
  // garde la machine à sa place dans la liste (après l'Attracteur)
  (() => { const A = window.FASC, i = A.findIndex((d) => d.id === 'fractal'), j = A.findIndex((d) => d.id === 'attracteur'); if (i > 0 && j >= 0 && j !== i - 1) { const [d] = A.splice(i, 1); A.splice(j + 1, 0, d); } })();

  function makeFract(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const kS = clamp(Math.min(W, H) / 800, 0.6, 1.5);
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = {
      scene: 'mandel', q: 'haute', pal: env.theme === 'light' ? 5 : 0, rhy: 1, flow: true, relief: 0.6, auto: true, target: 0, speed: 0.5, formula: 0, iterK: 1,
      jAuto: true, ifs: 'fougere', morph: true, curve: 'dragon', angle: 45,
    };
    let VT = 0;

    /* ───────── WebGL ───────── */
    let G = null;
    function initGL() {
      if (G) { G.K.lose(); G = null; }
      try {
        const s = Math.min(QUAL[cfg.q].res, dpr);
        const K = GLKit(Math.max(64, Math.round(W * s)), Math.max(64, Math.round(H * s)));
        const gl = K.gl;
        const ref = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, ref);
        for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
        G = { K, gl, s, dyn: 1, last: 0, ft: 30, pert: K.program(FS_PERT), dir: K.program(FS_DIRECT), ref, iw: Math.round(W * s * 0.3), ih: Math.round(H * s * 0.3), refBuf: new Float32Array(1024 * 24 * 4) };
      } catch (e) { console.warn('Les Fractales : sans WebGL2', e); G = null; }
    }
    initGL();

    /* ───────── Mandelbrot : vue en double précision ───────── */
    const M = { x: -0.6, y: 0, w: 3.6, tw: 3.6, tx: null, ty: null, pause: 0, phase: 'plonge' };
    const maxIter = () => { const z = Math.max(0, Math.log2(3.6 / M.w)); return Math.round(clamp((160 + 60 * z + 0.9 * z * z) * cfg.iterK * QUAL[cfg.q].it, 120, 20000)); };
    function refOrbit(cx, cy, N) {
      const B = G.refBuf; let x = 0, y = 0, n = 0;
      const cap = Math.min(N + 1, B.length / 4);
      for (; n < cap; n++) {
        B[n * 4] = x; B[n * 4 + 1] = y;
        const nx = x * x - y * y + cx; y = 2 * x * y + cy; x = nx;
        if (x * x + y * y > 1e8) { n++; B[n * 4] = x; B[n * 4 + 1] = y; n++; break; }
      }
      const rows = Math.ceil(n / 1024), gl = G.gl;
      gl.bindTexture(gl.TEXTURE_2D, G.ref);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1024, rows, 0, gl.RGBA, gl.FLOAT, B.subarray(0, rows * 1024 * 4));
      return n;
    }
    function setPalette(P) { const t = cfg.flow ? VT * 0.03 : 0; P.i('uPal', cfg.pal).f('uRhy', cfg.rhy).f('uPhase', t).f('uRelief', cfg.relief).f('uInk', cfg.pal === 5 ? 1 : 0); }
    // résolution adaptative : si les images arrivent trop lentement, on calcule moins de pixels
    function adapt() {
      const now = performance.now(), d = now - G.last; G.last = now;
      if (d > 0 && d < 500) G.ft += (d - G.ft) * 0.1;
      if (G.ft > 42) G.dyn = Math.max(0.35, G.dyn * 0.97); else if (G.ft < 24) G.dyn = Math.min(1, G.dyn * 1.02);
      const K = G.K; return { cw: Math.max(32, Math.round(K.canvas.width * G.dyn)), ch: Math.max(32, Math.round(K.canvas.height * G.dyn)) };
    }
    function blitOut(cw, ch) {
      const K = G.K;
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.imageSmoothingEnabled = true; ctx.drawImage(K.canvas, 0, K.canvas.height - ch, cw, ch, 0, 0, W, H); ctx.restore();
    }
    function drawMandel() {
      const { K } = G, { cw, ch } = adapt(), sG = G.s * (cw / K.canvas.width);
      const v = view();
      // le centre de l'écran visible (entre les panneaux) est le centre de la vue
      const sc = M.w / v.w; // unités complexes par pixel CSS
      const cxScreen = M.x - (v.cx - W / 2) * sc;
      if (cfg.formula === 0) {
        const N = maxIter(), n = refOrbit(M.x, M.y, N);
        const P = G.pert.use();
        P.t('uRef', G.ref).i('uRefN', n).i('uMaxI', N).f('uRes', cw, ch).f('uOff', cxScreen - M.x, 0).f('uScale', sc / sG);
        setPalette(P); K.run(P, { fb: null, w: cw, h: ch });
      } else {
        const P = G.dir.use();
        P.i('uF', [0, 4, 2, 3][cfg.formula]).i('uMaxI', Math.min(4000, maxIter())).f('uRes', cw, ch).f('uC0', cxScreen, M.y).f('uScale', sc / sG).f('uJc', 0, 0).f('uMark', 0, 0, 0, 0);
        setPalette(P); K.run(P, { fb: null, w: cw, h: ch });
      }
      blitOut(cw, ch);
    }
    function pickTarget(i) {
      const T = MANDEL_TARGETS[i % MANDEL_TARGETS.length];
      cfg.target = i % MANDEL_TARGETS.length; M.tx = T.x; M.ty = T.y; M.phase = 'plonge'; M.fin = T.fin;
    }
    function stepMandel(dt) {
      if (cfg.auto && M.tx != null) {
        if (M.phase === 'plonge') {
          // on glisse vers la cible pendant qu'on zoome
          const k = Math.min(1, dt * 1.2);
          M.x += (M.tx - M.x) * k; M.y += (M.ty - M.y) * k;
          M.w *= Math.exp(-dt * cfg.speed * 0.9);
          if (M.w < M.fin) { M.w = M.fin; M.phase = 'pause'; M.pause = 0; }
        } else if (M.phase === 'pause') { M.pause += dt; if (M.pause > 4) M.phase = 'remonte'; }
        else if (M.phase === 'remonte') { M.w *= Math.exp(dt * 4); if (M.w > 3.6) { M.w = 3.6; pickTarget(cfg.target + 1); } }
      } else if (M.tw) {
        M.w *= Math.pow(M.tw / M.w, Math.min(1, dt * 3));
        if (M.tx != null && !cfg.auto) { const k = Math.min(1, dt * 3); M.x += (M.tx - M.x) * k; M.y += (M.ty - M.y) * k; }
      }
      M.w = clamp(M.w, cfg.formula === 0 ? 1e-13 : 2e-5, 6);
      if (cfg.formula !== 0 && M.w <= 2.01e-5 && cfg.auto) M.phase = 'pause';
    }

    /* ───────── son : glissando de Shepard ───────── */
    let shep = null;
    function shepard() {
      if (!snd()) return;
      if (!shep) shep = Array.from({ length: 7 }, () => au.drone(110, 'sine', 0));
      const z = Math.log2(3.6 / M.w), base = 40;
      const ph = ((z * 0.5) % 1 + 1) % 1; // une octave pour deux doublements de zoom
      shep.forEach((d, i) => {
        const o = i + 1 - ph, f = base * Math.pow(2, o);
        const x = (o - 3.5) / 1.6, g = Math.exp(-x * x) * 0.022 * (cfg.scene === 'mandel' ? 1 : 0);
        d.set(f); d.gain(g);
      });
    }

    /* ───────── Julia ───────── */
    const J = { c: [-0.4, 0.6], t: 0, w: 3.2, x: 0, y: 0, hover: null };
    function stepJulia(dt) {
      if (cfg.jAuto && !J.drag) {
        J.t += dt * 0.12 * cfg.speed * 2;
        // c longe le bord de la cardioïde principale, un peu à l'extérieur
        const a = J.t, r = 1.02 + 0.03 * Math.sin(a * 3.1);
        J.c = [r * (0.5 * Math.cos(a) - 0.25 * Math.cos(2 * a)), r * (0.5 * Math.sin(a) - 0.25 * Math.sin(2 * a))];
      }
    }
    function drawJulia(c, big) {
      const { K } = G, { cw, ch } = adapt(), sG = G.s * (cw / K.canvas.width), v = view();
      const sc = J.w / Math.min(v.w, H);
      const P = G.dir.use();
      P.i('uF', 1).i('uMaxI', Math.round(300 * QUAL[cfg.q].it)).f('uRes', cw, ch).f('uC0', J.x - (v.cx - W / 2) * sc, J.y).f('uScale', sc / sG).f('uJc', c[0], c[1]).f('uMark', 0, 0, 0, 0);
      setPalette(P); K.run(P, { fb: null, w: cw, h: ch });
      blitOut(cw, ch);
    }
    // carte de Mandelbrot en médaillon, avec la position de c
    function drawInset(c, juliaInset) {
      const { K } = G, t = { fb: null, w: G.iw, h: G.ih }, v = view();
      const w = t.w / G.s, h = t.h / G.s;
      const P = G.dir.use();
      if (juliaInset) P.i('uF', 1).i('uMaxI', 250).f('uRes', t.w, t.h).f('uC0', 0, 0).f('uScale', 3.2 / t.h).f('uJc', c[0], c[1]).f('uMark', 0, 0, 0, 0);
      else {
        const sc = 3 / t.h, mx = (c[0] + 0.6) / sc + t.w / 2, my = c[1] / sc + t.h / 2;
        P.i('uF', 0).i('uMaxI', 200).f('uRes', t.w, t.h).f('uC0', -0.6, 0).f('uScale', sc).f('uJc', 0, 0).f('uMark', mx, my, 5, 0);
      }
      // dessiné dans un coin du canevas GL (l'image principale est déjà recopiée)
      setPalette(P); K.run(P, t);
      const x = v.x1 - w - 16, y = H - h - 16;
      ctx.save();
      ctx.drawImage(K.canvas, 0, K.canvas.height - t.h, t.w, t.h, x, y, w, h);
      ctx.strokeStyle = cfg.pal === 5 ? 'rgba(40,30,80,.5)' : 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
      ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillStyle = cfg.pal === 5 ? 'rgba(40,30,80,.8)' : 'rgba(255,255,255,.75)';
      ctx.fillText(juliaInset ? 'JULIA DE CE POINT' : 'c DANS LE PLAN DE MANDELBROT', x, y - 6);
      ctx.restore();
    }

    /* ───────── flammes (jeu du chaos, sur le processeur) ───────── */
    const F = { bw: Math.max(160, Math.round(W * 0.6)), bh: Math.max(100, Math.round(H * 0.6)), acc: null, img: null, cv: null, x: 0.1, y: 0.1, col: 0.5, A: null, B: null, mt: 0, box: null, tbox: null };
    F.acc = new Float32Array(F.bw * F.bh * 4);
    F.cv = document.createElement('canvas'); F.cv.width = F.bw; F.cv.height = F.bh; F.g = F.cv.getContext('2d'); F.img = F.g.createImageData(F.bw, F.bh);
    const palJS = (t) => {
      t = ((t % 1) + 1) % 1;
      const p = cfg.pal;
      const cosp = (a, b, c, d) => [0, 1, 2].map((k) => clamp(a[k] + b[k] * Math.cos(TAU * (c[k] * t + d[k])), 0, 1));
      if (p === 0) { const S = [[0, 0, 7, 100], [0.16, 32, 107, 203], [0.42, 237, 255, 255], [0.6425, 255, 170, 0], [0.8575, 40, 2, 0], [1, 0, 7, 100]]; for (let i = 0; i < 5; i++) if (t <= S[i + 1][0]) { const k = (t - S[i][0]) / (S[i + 1][0] - S[i][0]); return [1, 2, 3].map((j) => (S[i][j] + (S[i + 1][j] - S[i][j]) * k) / 255); } }
      if (p === 1) return cosp([0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0, 0.1, 0.2]);
      if (p === 2) return cosp([0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 0.7, 0.4], [0, 0.15, 0.2]);
      if (p === 3) return cosp([0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0, 0.33, 0.67]);
      if (p === 4) return cosp([0.8, 0.5, 0.4], [0.2, 0.4, 0.2], [2, 1, 1], [0, 0.25, 0.25]);
      return [0.13, 0.11, 0.26];
    };
    function setIFS(key, keepMorph) {
      cfg.ifs = key;
      const sys = key === 'flamme' ? randFlame() : { ...IFS[key], m: IFS[key].m.map((r) => r.slice()) };
      F.A = sys; F.B = null; F.mt = 0; F.box = null; F.tbox = null; F.acc.fill(0);
      // tirage à blanc pour connaître la taille de la figure
      let x = 0.1, y = 0.1; const xs = [], ys = [];
      const tot = sys.m.reduce((q, t) => q + t[6], 0);
      for (let i = 0; i < 30000; i++) {
        let u = Math.random() * tot, j = 0; while (j < sys.m.length - 1 && (u -= sys.m[j][6]) > 0) j++;
        const t = sys.m[j]; let nx = t[0] * x + t[1] * y + t[4], ny = t[2] * x + t[3] * y + t[5];
        if (sys.flame) [nx, ny] = variation(t[7], nx, ny);
        if (!isFinite(nx) || Math.abs(nx) > 1e4 || Math.abs(ny) > 1e4) { nx = rnd(1, -1); ny = rnd(1, -1); }
        x = nx; y = ny;
        if (i > 50 && i % 3 === 0) { xs.push(x); ys.push(y); }
      }
      // cadrage sur les centiles : quelques points égarés ne doivent pas rapetisser la figure
      xs.sort((p, q) => p - q); ys.sort((p, q) => p - q);
      const qt = (a, f) => a[Math.floor(f * (a.length - 1))], lo = sys.flame ? 0.03 : 0.001;
      let b = [qt(xs, lo), qt(xs, 1 - lo), qt(ys, lo), qt(ys, 1 - lo)];
      if (sys.flame) { const r = Math.max(Math.abs(b[0]), Math.abs(b[1]), Math.abs(b[2]), Math.abs(b[3]), 0.2); b = [-r, r, -r, r]; }
      F.box = b; F.x = x; F.y = y;
      if (!keepMorph) F.morphT = 0;
    }
    function variation(w, x, y) {
      let ox = 0, oy = 0; const r2 = x * x + y * y + 1e-9, r = Math.sqrt(r2);
      if (w[0]) { ox += w[0] * x; oy += w[0] * y; }
      if (w[1]) { ox += w[1] * Math.sin(x); oy += w[1] * Math.sin(y); }
      if (w[2]) { ox += (w[2] * x) / r2; oy += (w[2] * y) / r2; }
      if (w[3]) { const s = Math.sin(r2), c = Math.cos(r2); ox += w[3] * (x * s - y * c); oy += w[3] * (x * c + y * s); }
      if (w[4]) { ox += (w[4] * (x - y) * (x + y)) / r; oy += (w[4] * 2 * x * y) / r; }
      if (w[5]) { const th = Math.atan2(x, y); ox += w[5] * r * Math.sin(th + r); oy += w[5] * r * Math.cos(th - r); }
      return [ox, oy];
    }
    function stepFlame(dt) {
      // métamorphose : les coefficients dérivent doucement (flammes) ou respirent (fougère)
      const sys = F.A, m = sys.m;
      if (cfg.morph) {
        F.mt += dt;
        if (sys.flame) { for (const t of m) { t[4] += Math.sin(VT * 0.31 + t[6] * 7) * dt * 0.05; t[5] += Math.cos(VT * 0.27 + t[6] * 5) * dt * 0.05; const a = dt * 0.04 * Math.sin(VT * 0.2 + t[6] * 3); const [p, q, r, s] = t; t[0] = p * Math.cos(a) - r * Math.sin(a); t[2] = p * Math.sin(a) + r * Math.cos(a); t[1] = q * Math.cos(a) - s * Math.sin(a); t[3] = q * Math.sin(a) + s * Math.cos(a); } }
        else if (cfg.ifs === 'fougere') { const k = Math.sin(VT * 0.5) * 0.03; m[1][1] = 0.04 + k; m[1][2] = -0.04 - k; }
      }
      const tot = m.reduce((s, t) => s + t[6], 0);
      const cum = []; let a = 0; for (const t of m) { a += t[6] / tot; cum.push(a); }
      const n = QUAL[cfg.q].pts, acc = F.acc, bw = F.bw, bh = F.bh;
      // boîte englobante : suivie en douceur
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      const box = F.box || [-1, 1, -1, 1];
      const v = view(), sx = (v.w / W) * bw * 0.86, sy = bh * 0.86;
      const sc = Math.min(sx / (box[1] - box[0] || 1), sy / (box[3] - box[2] || 1));
      const ox = ((v.cx / W) * bw) - ((box[0] + box[1]) / 2) * sc, oy = bh / 2 + ((box[2] + box[3]) / 2) * sc;
      const sym = sys.sym || 1;
      const k = cfg.morph ? Math.exp(-dt * 1.8) : 1;
      if (k < 1) for (let i = 0; i < acc.length; i++) acc[i] *= k;
      let x = F.x, y = F.y, c = F.col;
      for (let i = 0; i < n; i++) {
        const u = Math.random(); let j = 0; while (j < m.length - 1 && u > cum[j]) j++;
        const t = m[j];
        let nx = t[0] * x + t[1] * y + t[4], ny = t[2] * x + t[3] * y + t[5];
        if (sys.flame) [nx, ny] = variation(t[7], nx, ny);
        if (sym > 1 && Math.random() < 0.5) { const an = (TAU * (1 + rint(sym - 1))) / sym, cs = Math.cos(an), sn = Math.sin(an); [nx, ny] = [nx * cs - ny * sn, nx * sn + ny * cs]; }
        if (!isFinite(nx) || Math.abs(nx) > 1e4 || Math.abs(ny) > 1e4) { nx = rnd(1, -1); ny = rnd(1, -1); }
        x = nx; y = ny; c = (c + j / Math.max(1, m.length - 1)) * 0.5;
        if (i < 20) continue;
        if (i % 7 === 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        const px = (ox + x * sc) | 0, py = (oy - y * sc) | 0;
        if (px < 0 || py < 0 || px >= bw || py >= bh) continue;
        const o = (py * bw + px) * 4, col = palJS(c * 0.9 + (cfg.flow ? VT * 0.02 : 0));
        acc[o] += col[0]; acc[o + 1] += col[1]; acc[o + 2] += col[2]; acc[o + 3] += 1;
      }
      F.x = x; F.y = y; F.col = c;
      const nb = [x0, x1, y0, y1];
      if (!F.box) F.box = nb; else if (!sys.flame) { const kk = Math.min(1, dt * 2); for (let i = 0; i < 4; i++) F.box[i] += (nb[i] - F.box[i]) * kk; }
    }
    function drawFlame(bare, ink) {
      const acc = F.acc, d = F.img.data, n = F.bw * F.bh;
      let mx = 1; for (let i = 3; i < acc.length; i += 4) if (acc[i] > mx) mx = acc[i];
      const lm = Math.log(1 + mx), paper = cfg.pal === 5 || ink;
      for (let i = 0; i < n; i++) {
        const o = i * 4, a = acc[o + 3];
        if (a <= 0) { if (paper) { d[o] = 243; d[o + 1] = 238; d[o + 2] = 227; } else { d[o] = 3; d[o + 1] = 2; d[o + 2] = 8; } d[o + 3] = 255; continue; }
        const al = Math.pow(Math.log(1 + a) / lm, 0.45);
        if (paper) { const v = al * 0.9; d[o] = 243 - v * 210; d[o + 1] = 238 - v * 210; d[o + 2] = 227 - v * 160; }
        else { const s = (al * 255) / a; d[o] = Math.min(255, acc[o] * s); d[o + 1] = Math.min(255, acc[o + 1] * s); d[o + 2] = Math.min(255, acc[o + 2] * s); }
        d[o + 3] = 255;
      }
      F.g.putImageData(F.img, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalCompositeOperation = 'copy'; ctx.drawImage(F.cv, 0, 0, W, H); ctx.restore();
    }

    /* ───────── courbes ───────── */
    const C = { ord: 0, k: 0, pts: null, cam: null, hold: 0 };
    function resetCurve() {
      C.ord = 0; C.k = 0; C.hold = 0; C.cam = null;
      if (cfg.curve === 'dragon') C.pts = [[0, 0], [1, 0]];
      if (cfg.curve === 'koch') { const s = Math.sqrt(3) / 2; C.pts = [[0, 0], [0.5, s], [1, 0], [0, 0]]; }
    }
    function dragonPts(k) {
      // la copie tourne autour du dernier point d'un angle k × 90°
      const P = C.pts, n = P.length, [px, py] = P[n - 1], a = (-k * Math.PI) / 2, cs = Math.cos(a), sn = Math.sin(a);
      const out = P.slice();
      for (let i = n - 2; i >= 0; i--) { const dx = P[i][0] - px, dy = P[i][1] - py; out.push([px + dx * cs - dy * sn, py + dx * sn + dy * cs]); }
      return out;
    }
    function kochPts(k) {
      const P = C.pts, out = [];
      for (let i = 0; i < P.length - 1; i++) {
        const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay;
        const mx = ax + dx / 2, my = ay + dy / 2, h = (Math.sqrt(3) / 6) * k;
        out.push([ax, ay], [ax + dx / 3, ay + dy / 3], [mx - dy * h, my + dx * h], [ax + (2 * dx) / 3, ay + (2 * dy) / 3]);
      }
      out.push(P[P.length - 1]);
      return out;
    }
    function stepCurve(dt) {
      if (cfg.curve === 'arbre') return;
      const maxO = cfg.curve === 'dragon' ? 14 : 6;
      if (C.ord >= maxO) { C.hold += dt; if (C.hold > 6 && cfg.auto) resetCurve(); return; }
      if (C.drag) return;
      C.k += dt * 0.5 * cfg.speed * 2;
      if (C.k >= 1) {
        C.pts = cfg.curve === 'dragon' ? dragonPts(1) : kochPts(1);
        C.ord++; C.k = 0;
        if (snd()) au.pluck(220 * Math.pow(2, (C.ord % 12) / 12), 0.9, 0.04);
      }
    }
    function drawCurve(bare, ink) {
      const paper = ink || cfg.pal === 5;
      ctx.save();
      ctx.fillStyle = paper ? '#f3eee3' : '#05040a'; ctx.fillRect(0, 0, W, H);
      const v = view();
      if (cfg.curve === 'arbre') { drawTree(paper, v); ctx.restore(); return; }
      const k = C.k * C.k * (3 - 2 * C.k);
      const P = cfg.curve === 'dragon' ? dragonPts(k) : kochPts(k);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y] of P) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const tb = [x0, x1, y0, y1];
      if (!C.cam) C.cam = tb.slice(); else for (let i = 0; i < 4; i++) C.cam[i] += (tb[i] - C.cam[i]) * 0.08;
      const [a0, a1, b0, b1] = C.cam;
      const sc = Math.min((v.w * 0.82) / (a1 - a0 || 1), (H * 0.78) / (b1 - b0 || 1));
      const ox = v.cx - ((a0 + a1) / 2) * sc, oy = H / 2 + ((b0 + b1) / 2) * sc;
      const n = P.length, chunks = Math.min(60, n - 1);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (cfg.curve === 'koch') {
        ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(ox + x * sc, oy - y * sc) : ctx.moveTo(ox + x * sc, oy - y * sc)));
        ctx.fillStyle = paper ? 'rgba(80,90,180,.08)' : 'rgba(120,180,255,.08)'; ctx.fill();
      }
      ctx.lineWidth = Math.max(0.7, 3.2 - C.ord * 0.2) * kS;
      for (let c = 0; c < chunks; c++) {
        const i0 = Math.floor((c * (n - 1)) / chunks), i1 = Math.floor(((c + 1) * (n - 1)) / chunks);
        const col = palJS(c / chunks * 0.8 + (cfg.flow ? VT * 0.02 : 0));
        ctx.strokeStyle = paper ? `rgba(${30 + col[0] * 60 | 0},${25 + col[1] * 40 | 0},${70 + col[2] * 60 | 0},.9)` : `rgb(${col[0] * 255 | 0},${col[1] * 255 | 0},${col[2] * 255 | 0})`;
        ctx.beginPath(); ctx.moveTo(ox + P[i0][0] * sc, oy - P[i0][1] * sc);
        for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(ox + P[i][0] * sc, oy - P[i][1] * sc);
        ctx.stroke();
      }
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = paper ? 'rgba(40,30,80,.75)' : 'rgba(230,228,255,.7)';
      const txt = cfg.curve === 'dragon' ? `${C.ord + (C.k > 0 ? 1 : 0)} PLI${C.ord ? 'S' : ''} · ${Math.pow(2, C.ord)} SEGMENTS`
        : `ÉTAPE ${C.ord} · PÉRIMÈTRE × ${fr(Math.pow(4 / 3, C.ord), 2)} · AIRE × ${fr(1 + (3 / 5) * (1 - Math.pow(4 / 9, C.ord)), 3)} (→ 1,6)`;
      ctx.fillText(txt, v.x0 + 16, H - 16);
      ctx.restore();
    }
    function drawTree(paper, v) {
      const a = (cfg.angle * Math.PI) / 180 + Math.sin(VT * 0.7) * 0.05 + Math.sin(VT * 1.9) * 0.015;
      const s0 = Math.min(v.w, H) * 0.14, depth = cfg.q === 'legere' ? 9 : 11;
      const rec = (x, y, s, ang, d) => {
        const c = Math.cos(ang), sn = Math.sin(ang);
        const p1 = [x, y], p2 = [x + s * c, y - s * sn], p3 = [p2[0] - s * sn, p2[1] - s * c], p4 = [x - s * sn, y - s * c];
        const t = d / depth, col = palJS(0.15 + t * 0.6 + (cfg.flow ? VT * 0.02 : 0));
        ctx.fillStyle = paper ? `rgba(${40 + t * 60 | 0},${30 + t * 80 | 0},${70 + t * 40 | 0},.85)` : `rgba(${col[0] * 255 | 0},${col[1] * 255 | 0},${col[2] * 255 | 0},.9)`;
        ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.lineTo(...p4); ctx.fill();
        if (d >= depth) return;
        const s1 = s * Math.cos(a), s2 = s * Math.sin(a);
        rec(p4[0], p4[1], s1, ang + a, d + 1);
        const q = [p4[0] + s1 * Math.cos(ang + a), p4[1] - s1 * Math.sin(ang + a)];
        rec(q[0], q[1], s2, ang + a - Math.PI / 2, d + 1);
      };
      rec(v.cx - s0 / 2, H * 0.94, s0, 0, 0);
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = paper ? 'rgba(40,30,80,.75)' : 'rgba(230,228,255,.7)';
      ctx.fillText(`ARBRE DE PYTHAGORE · ANGLE ${Math.round(cfg.angle)}° · ${Math.pow(2, depth + 1) - 1} CARRÉS`, v.x0 + 16, H - 16);
    }

    /* ───────── identification ───────── */
    let label = null;
    function screenToC(x, y) {
      if (cfg.scene === 'mandel') { const v = view(), sc = M.w / v.w; return [M.x + (x - v.cx) * sc, M.y - (y - H / 2) * sc]; }
      const v = view(), sc = J.w / Math.min(v.w, H); return [J.x + (x - v.cx) * sc, J.y - (y - H / 2) * sc];
    }
    function orbitInfo(cx, cy, julia) {
      let x = julia ? cx : 0, y = julia ? cy : 0;
      const c = julia ? J.c : [cx, cy], N = cfg.scene === 'mandel' ? Math.max(2000, maxIter()) : 2000;
      for (let i = 0; i < N; i++) {
        const nx = x * x - y * y + c[0]; y = 2 * x * y + c[1]; x = nx;
        if (x * x + y * y > 4) return { esc: i + 1 };
      }
      // cherche la période du cycle sur lequel l'orbite est tombée
      const sx = x, sy = y;
      for (let p = 1; p <= 64; p++) { const nx = x * x - y * y + c[0]; y = 2 * x * y + c[1]; x = nx; if (Math.hypot(x - sx, y - sy) < 1e-9) return { per: p }; }
      return { per: 0 };
    }
    const fmtC = (a, b, d) => `${a < 0 ? '−' : ''}${Math.abs(a).toFixed(d).replace('.', ',')} ${b < 0 ? '−' : '+'} ${Math.abs(b).toFixed(d).replace('.', ',')} i`;
    function describe(l) {
      if (cfg.scene === 'mandel' || cfg.scene === 'julia') {
        const d = Math.max(4, Math.min(15, Math.ceil(-Math.log10(cfg.scene === 'mandel' ? M.w : J.w)) + 3));
        const [cx, cy] = l.c, info = cfg.scene === 'julia' || cfg.formula === 0 ? orbitInfo(cx, cy, cfg.scene === 'julia') : null;
        const nm = cfg.scene === 'julia' ? 'z₀ = ' + fmtC(cx, cy, d) : 'c = ' + fmtC(cx, cy, d);
        if (!info) return [nm, 'formule variante : pas d’analyse d’orbite', '#c8d0e0'];
        if (info.esc) return [nm, `s’échappe après ${info.esc} itération${info.esc > 1 ? 's' : ''} · hors de l’ensemble`, '#ffaa00'];
        return [nm, info.per ? `dans l’ensemble · l’orbite tombe sur un cycle de période ${info.per}` : 'dans l’ensemble (ou si près du bord que 2000 étapes ne suffisent pas)', '#9fd8ff'];
      }
      if (cfg.scene === 'flamme') { const s = F.A; return [s.nom, s.flame ? `${s.m.length} transformations · symétrie d’ordre ${s.sym} · ${QUAL[cfg.q].pts.toLocaleString('fr-FR')} points par image` : `${s.m.length} transformations affines · le hasard dessine toujours la même figure`, '#ff8ad8']; }
      if (cfg.curve === 'dragon') return ['Courbe du dragon', `${C.ord} plis · ${Math.pow(2, C.ord)} segments · dimension du bord ≈ 1,52`, '#c09aff'];
      if (cfg.curve === 'koch') return ['Flocon de Koch', `étape ${C.ord} · dimension log 4 / log 3 ≈ 1,26`, '#9fe0ff'];
      return ['Arbre de Pythagore', `chaque carré porte deux carrés sur un triangle rectangle d’angle ${Math.round(cfg.angle)}°`, '#79f3b4'];
    }
    function drawLabel(paper) {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (7 - label.t) * 2);
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

    /* ───────── scènes et boucle ───────── */
    function setScene(id) {
      cfg.scene = id; label = null;
      if (id === 'mandel') { M.x = -0.6; M.y = 0; M.w = 3.6; M.tw = null; if (cfg.auto) pickTarget(cfg.target); }
      if (id === 'julia') { J.x = 0; J.y = 0; J.w = 3.2; }
      if (id === 'flamme') setIFS(cfg.ifs);
      if (id === 'courbes') resetCurve();
    }
    function setQuality(q) { if (q === cfg.q) return; cfg.q = q; initGL(); }
    function update(dt) {
      VT += dt;
      if (cfg.scene === 'mandel') stepMandel(dt);
      if (cfg.scene === 'julia') stepJulia(dt);
      if (cfg.scene === 'flamme') stepFlame(dt);
      if (cfg.scene === 'courbes') stepCurve(dt);
      if (snd()) shepard(); else if (shep) { shep.forEach((d) => d.gain(0)); }
    }
    let pending = false;
    function render() {
      const bare = env.decor === false, ink = env.theme === 'light' && cfg.pal === 5;
      if ((cfg.scene === 'mandel' || cfg.scene === 'julia') && !G) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#ccc'; ctx.fillText('WebGL2 indisponible : choisissez Flammes ou Courbes.', 20, H / 2); return; }
      if (cfg.scene === 'mandel') {
        drawMandel();
        if (J.hover) drawInset(J.hover, true);
        const v = view();
        ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = cfg.pal === 5 ? 'rgba(40,30,80,.8)' : 'rgba(255,255,255,.7)';
        const z = 3.6 / M.w;
        ctx.fillText(`ZOOM × ${z < 1e4 ? Math.round(z).toLocaleString('fr-FR') : z.toExponential(1).replace('.', ',').replace('e+', ' × 10^')} · ${maxIter()} ITÉRATIONS` + (cfg.auto && M.tx != null ? ' · ' + MANDEL_TARGETS[cfg.target].nom.toUpperCase() : ''), v.x0 + 16, H - 16);
        ctx.restore();
      } else if (cfg.scene === 'julia') { drawJulia(J.c); drawInset(J.c, false); const v = view(); ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = cfg.pal === 5 ? 'rgba(40,30,80,.8)' : 'rgba(255,255,255,.7)'; ctx.fillText('c = ' + fmtC(J.c[0], J.c[1], 4), v.x0 + 16, H - 16); ctx.restore(); }
      else if (cfg.scene === 'flamme') drawFlame(bare, ink);
      else drawCurve(bare, ink);
      drawLabel(cfg.pal === 5 || ink);
    }
    function frame(t, dt) {
      if (dt > 0) { update(dt); if (label) label.t += dt * 2.5; }
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    if (window.FASC_DEBUG) window.FASC_DEBUG.fract = { cfg, M, J, F, C, setScene, setIFS, pickTarget, resetCurve, run(n, h) { for (let i = 0; i < n; i++) { update(h); render(); } }, render };

    setScene('mandel');
    let drag = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool;
        drag = { x: p.x, y: p.y, moved: false };
        if (tool === 'observer') { label = { x: p.x, y: p.y, t: 0, c: (cfg.scene === 'mandel' || cfg.scene === 'julia') ? screenToC(p.x, p.y) : null }; return; }
        if (tool === 'sculpter') {
          if (cfg.scene === 'mandel') J.hover = screenToC(p.x, p.y);
          if (cfg.scene === 'julia') { J.drag = true; }
          if (cfg.scene === 'flamme') setIFS('flamme');
          if (cfg.scene === 'courbes') C.drag = true;
        }
      },
      move(p) {
        if (!p.down || !drag) return;
        const tool = env.tool;
        if (Math.hypot(p.x - drag.x, p.y - drag.y) > 6) drag.moved = true;
        if (tool === 'sculpter') {
          if (cfg.scene === 'mandel') J.hover = screenToC(p.x, p.y);
          if (cfg.scene === 'julia') { const v = view(); J.c = [-2 + ((p.x - v.x0) / v.w) * 2.5, 1.25 - (p.y / H) * 2.5]; }
          if (cfg.scene === 'courbes') { if (cfg.curve === 'arbre') cfg.angle = clamp(cfg.angle + p.dx * 0.15, 10, 80); else C.k = clamp(C.k + p.dx * 0.004, 0, 0.999); }
          return;
        }
        if (tool === 'plonger' && drag.moved) {
          if (cfg.scene === 'mandel') { const sc = M.w / view().w; M.x -= p.dx * sc; M.y += p.dy * sc; cfg.auto = false; M.tx = null; }
          if (cfg.scene === 'julia') { const sc = J.w / Math.min(view().w, H); J.x -= p.dx * sc; J.y += p.dy * sc; }
        }
      },
      up() {
        const tool = env.tool, d = drag; drag = null;
        J.hover = null; J.drag = false; C.drag = false;
        if (!d || d.moved) return;
        if (tool === 'plonger' || tool === 'reculer') {
          const f = tool === 'plonger' ? 0.3 : 3.3;
          if (cfg.scene === 'mandel') { const [x, y] = screenToC(d.x, d.y); cfg.auto = false; M.tx = x; M.ty = y; M.tw = M.w * f; if (snd()) au.note(tool === 'plonger' ? 220 : 330, 0.6, 'sine', 0.05, tool === 'plonger' ? 110 : 660); }
          if (cfg.scene === 'julia') { const [x, y] = screenToC(d.x, d.y); J.x = x; J.y = y; J.w = clamp(J.w * f, 1e-4, 6); }
        }
      },
      clear() { setScene(cfg.scene); },
      dispose() { if (shep) shep.forEach((d) => d.stop()); if (G) G.K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: [
          { label: 'Mandelbrot', act: () => setScene('mandel') },
          { label: 'Julia', act: () => setScene('julia') },
          { label: 'Flammes et fougères', act: () => setScene('flamme') },
          { label: 'Courbes', act: () => setScene('courbes') },
        ] });
        if (cfg.scene === 'mandel') {
          L.push({ type: 'section', label: 'Plongée' });
          L.push({ type: 'bar', label: 'Profondeur', color: '#ffaa00', value: clamp(Math.log10(3.6 / M.w) / 13, 0, 1), txt: '10^' + Math.round(Math.log10(3.6 / M.w)) });
          L.push({ type: 'toggle', label: 'Plongée automatique', value: cfg.auto, set: (x) => { cfg.auto = x; if (x) pickTarget(cfg.target); } });
          L.push({ type: 'choice', label: 'Destination', value: cfg.target, set: (x) => { cfg.target = x; cfg.auto = true; M.x = -0.6; M.y = 0; M.w = 3.6; pickTarget(x); }, options: MANDEL_TARGETS.map((t, i) => ({ id: i, label: t.nom })) });
          L.push({ type: 'slider', label: 'Vitesse de plongée', min: 0.1, max: 1.5, step: 0.01, value: cfg.speed, fmt: (x) => '×2 toutes les ' + fr(Math.LN2 / (x * 0.9) / 0.4, 1) + ' s', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'choice', label: 'Formule', value: cfg.formula, set: (x) => { cfg.formula = x; setScene('mandel'); }, options: [{ id: 0, label: 'z² + c' }, { id: 1, label: 'z³ + c' }, { id: 2, label: 'Burning Ship' }, { id: 3, label: 'Tricorne' }] });
          if (cfg.formula) L.push({ type: 'note', text: 'Les variantes sont calculées sans perturbation : zoom limité à environ 10⁻⁵.' });
          L.push({ type: 'slider', label: 'Itérations', min: 0.3, max: 3, step: 0.05, value: cfg.iterK, fmt: (x) => maxIter() + ' (× ' + fr(x, 2) + ')', set: (x) => { cfg.iterK = x; } });
        }
        if (cfg.scene === 'julia') {
          L.push({ type: 'section', label: 'Julia' });
          L.push({ type: 'toggle', label: 'c longe le bord de l’ensemble', value: cfg.jAuto, set: (x) => { cfg.jAuto = x; } });
          L.push({ type: 'slider', label: 'Vitesse', min: 0.1, max: 1.5, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'buttons', items: [
            { label: 'Lapin de Douady', act: () => { cfg.jAuto = false; J.c = [-0.123, 0.745]; } },
            { label: 'Dendrite', act: () => { cfg.jAuto = false; J.c = [0, 1]; } },
            { label: 'Poussière', act: () => { cfg.jAuto = false; J.c = [-0.75, 0.2]; } },
            { label: 'Spirales', act: () => { cfg.jAuto = false; J.c = [-0.8, 0.156]; } },
          ] });
        }
        if (cfg.scene === 'flamme') {
          L.push({ type: 'section', label: 'Jeu du chaos' });
          L.push({ type: 'choice', label: 'Figure', value: cfg.ifs, set: (x) => setIFS(x), options: [...Object.keys(IFS).map((k) => ({ id: k, label: IFS[k].nom })), { id: 'flamme', label: 'Flamme' }] });
          if (cfg.ifs === 'flamme') L.push({ type: 'buttons', items: [{ label: 'Nouvelle flamme', act: () => setIFS('flamme') }] });
          L.push({ type: 'toggle', label: 'Métamorphose lente', value: cfg.morph, set: (x) => { cfg.morph = x; } });
        }
        if (cfg.scene === 'courbes') {
          L.push({ type: 'section', label: 'Courbes' });
          L.push({ type: 'choice', label: 'Courbe', value: cfg.curve, set: (x) => { cfg.curve = x; resetCurve(); }, options: [{ id: 'dragon', label: 'Dragon' }, { id: 'koch', label: 'Flocon de Koch' }, { id: 'arbre', label: 'Arbre de Pythagore' }] });
          if (cfg.curve === 'arbre') L.push({ type: 'slider', label: 'Angle', min: 10, max: 80, step: 1, value: cfg.angle, fmt: (x) => x + '°', set: (x) => { cfg.angle = x; } });
          else L.push({ type: 'buttons', items: [{ label: 'Recommencer', act: () => resetCurve() }] });
          L.push({ type: 'slider', label: 'Vitesse', min: 0.1, max: 1.5, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'toggle', label: 'Recommencer tout seul', value: cfg.auto, set: (x) => { cfg.auto = x; } });
        }
        L.push({ type: 'section', label: 'Couleurs' });
        L.push({ type: 'choice', label: 'Palette', value: cfg.pal, set: (x) => { cfg.pal = x; }, options: [{ id: 0, label: 'Classique' }, { id: 1, label: 'Braise et glace' }, { id: 2, label: 'Or et nuit' }, { id: 3, label: 'Arc-en-ciel' }, { id: 4, label: 'Pastel' }, { id: 5, label: 'Encre' }] });
        if (cfg.scene === 'mandel' || cfg.scene === 'julia') {
          L.push({ type: 'slider', label: 'Rythme des bandes', min: 0.2, max: 4, step: 0.05, value: cfg.rhy, fmt: (x) => '× ' + fr(x, 2), set: (x) => { cfg.rhy = x; } });
          L.push({ type: 'slider', label: 'Relief', min: 0, max: 1, step: 0.01, value: cfg.relief, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.relief = x; } });
        }
        L.push({ type: 'toggle', label: 'Couleurs qui coulent', value: cfg.flow, set: (x) => { cfg.flow = x; } });
        L.push({ type: 'section', label: 'Calcul' });
        L.push({ type: 'choice', label: 'Définition', value: cfg.q, set: setQuality, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        return L;
      },
    };
  }
})();
