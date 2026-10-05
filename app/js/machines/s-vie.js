/* Fascination — Le Jeu de la vie · Conway, ses cousins et Lenia (WebGL2)
   Automates cellulaires sur la carte graphique, sur un tore. Règles « naissance / survie / générations »
   (B/S/C) : Conway, HighLife, Day & Night, Seeds, Labyrinthe, Corail, Diamoeba, Brian's Brain, Star Wars.
   Chaque cellule garde son âge et une traînée qui s'efface : les planeurs laissent des comètes.
   Bibliothèque de motifs (format RLE), soupe aléatoire, crayon et gomme.
   Lenia (Bert Chan, 2018) : version continue, noyau en anneau de rayon 13 et fonction de croissance gaussienne,
   d'où sortent des « créatures » qui nagent. Musique de la vie : la colonne centrale jouée à chaque génération. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');

  /* ───────── règles ───────── */
  const RULES = {
    conway: { nom: 'Conway', bs: 'B3/S23', why: 'La règle de 1970 : une cellule naît entourée de 3 voisines, survit avec 2 ou 3. Assez pour fabriquer des planeurs, des canons et même un ordinateur.' },
    highlife: { nom: 'HighLife', bs: 'B36/S23', why: 'Nathan Thompson, 1994 : on ajoute la naissance à 6 voisines. Apparaît alors un « réplicateur » qui se copie lui-même.' },
    daynight: { nom: 'Day & Night', bs: 'B3678/S34678', why: 'Symétrique : les cellules vivantes et mortes se comportent de la même façon. Des continents se forment et se grignotent.' },
    seeds: { nom: 'Seeds', bs: 'B2/S', why: 'Personne ne survit : chaque cellule vit une génération. Pourtant tout explose en feux d’artifice.' },
    labyrinthe: { nom: 'Labyrinthe', bs: 'B3/S12345', why: 'Les cellules survivent presque toujours : la soupe se fige en couloirs, comme un labyrinthe qui se creuse.' },
    corail: { nom: 'Corail', bs: 'B3/S45678', why: 'Seules les cellules bien entourées survivent : des massifs poussent lentement, comme un récif.' },
    diamoeba: { nom: 'Diamoeba', bs: 'B35678/S5678', why: 'Des amibes en losange gonflent, se rétractent et fusionnent.' },
    brain: { nom: 'Brian’s Brain', bs: 'B2/S/C3', why: 'Brian Silverman : une cellule allumée s’éteint aussitôt en passant par un état « fatigué ». Le monde grouille de vaisseaux qui ne s’arrêtent jamais.' },
    starwars: { nom: 'Star Wars', bs: 'B2/S345/C4', why: 'Une règle à quatre états : des flottes de vaisseaux sillonnent des structures en lignes.' },
  };
  function parseRule(s) {
    let B = 0, S = 0, C = 2;
    for (const part of s.split('/')) {
      const k = part[0], d = part.slice(1);
      if (k === 'B') for (const c of d) B |= 1 << +c;
      if (k === 'S') for (const c of d) S |= 1 << +c;
      if (k === 'C') C = +d;
    }
    return { B, S, C };
  }

  /* ───────── motifs (RLE) ───────── */
  const PAT = {
    planeur: { nom: 'Planeur', rle: 'bo$2bo$3o!', why: 'Le plus petit vaisseau : 5 cellules qui se reconstruisent en se décalant d’une case en diagonale toutes les 4 générations.' },
    lwss: { nom: 'Vaisseau léger', rle: 'bo2bo$o4b$o3bo$4o!', why: 'Il file en ligne droite à la moitié de la vitesse de la lumière (une case toutes les deux générations).' },
    gosper: { nom: 'Canon de Gosper', rle: '24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!', why: 'Bill Gosper, 1970 : il tire un planeur toutes les 30 générations, pour toujours. Il a gagné les 50 dollars promis par Conway pour un motif qui grandit sans fin.' },
    pulsar: { nom: 'Pulsar', rle: '2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2b2$2b3o3b3o2b$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!', why: 'Un oscillateur de période 3, le plus courant après le clignotant.' },
    penta: { nom: 'Pentadécathlon', rle: '2bo4bo2b$2ob4ob2o$2bo4bo!', why: 'Il revient à sa forme après 15 générations.' },
    rpento: { nom: 'R-pentomino', rle: 'b2o$2o$bo!', why: 'Cinq cellules qui bouillonnent pendant 1 103 générations avant de se calmer, en lâchant 6 planeurs. Un « mathusalem ».' },
    gland: { nom: 'Gland', rle: 'bo$3bo$2o2b3o!', why: 'Sept cellules, 5 206 générations d’agitation, 633 cellules à la fin.' },
    diehard: { nom: 'Diehard', rle: '6bo$2o$bo3b3o!', why: 'Il disparaît entièrement après exactement 130 générations.' },
  };
  function parseRLE(rle) {
    const cells = []; let x = 0, y = 0, n = '';
    for (const ch of rle) {
      if (ch >= '0' && ch <= '9') { n += ch; continue; }
      const k = n ? +n : 1; n = '';
      if (ch === 'b') x += k; else if (ch === 'o') { for (let i = 0; i < k; i++) cells.push([x + i, y]); x += k; }
      else if (ch === '$') { y += k; x = 0; } else if (ch === '!') break;
    }
    let w = 0, h = 0; for (const [a, b] of cells) { w = Math.max(w, a + 1); h = Math.max(h, b + 1); }
    return { cells, w, h };
  }

  /* ───────── shaders ───────── */
  const FS_LIFE = HEAD + `
uniform sampler2D uS; uniform ivec2 uN; uniform int uB, uSv, uC; uniform float uTrail;
uniform int uNP; uniform vec4 uP[16];
out vec4 o;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 me = texelFetch(uS, c, 0);
  int s = int(me.r + .5), n = 0;
  for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++){
    if (dx == 0 && dy == 0) continue;
    ivec2 q = (c + ivec2(dx, dy) + uN) % uN;
    if (int(texelFetch(uS, q, 0).r + .5) == 1) n++;
  }
  int ns; float age = me.g;
  if (s == 0){ ns = ((uB >> n) & 1) == 1 ? 1 : 0; age = 0.; }
  else if (s == 1){ ns = ((uSv >> n) & 1) == 1 ? 1 : (uC > 2 ? 2 : 0); age += 1.; }
  else { ns = s + 1 >= uC ? 0 : s + 1; }
  float tr = ns == 1 ? 1. : me.b * uTrail;
  o = vec4(float(ns), ns == 1 ? age : 0., tr, me.a + (ns == 1 && s == 0 ? 1. : 0.) * 0.);
}`;
  // crayon et gomme (sans avancer d'une génération)
  const FS_PAINT = HEAD + `
uniform sampler2D uS; uniform vec2 uCell; uniform int uNP; uniform vec4 uP[16]; uniform float uLenia;
out vec4 o;
float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec4 me = texelFetch(uS, ivec2(gl_FragCoord.xy), 0);
  vec2 p = gl_FragCoord.xy;
  for (int i = 0; i < 16; i++){
    if (i >= uNP) break;
    vec4 b = uP[i];
    if (length(p - b.xy) < b.z){
      if (b.w > 1.5) me = vec4(uLenia > .5 ? h(p + b.xy) : step(.6, h(p + b.xy)), 0., uLenia > .5 ? 0. : 1., 0.); // soupe
      else if (b.w > .5) me = vec4(uLenia > .5 ? clamp(me.r + .5, 0., 1.) : 1., 0., 1., 0.);
      else me = vec4(0., 0., me.b, 0.);
    }
  }
  o = me;
}`;
  const FS_LENIA = HEAD + `
uniform sampler2D uS, uK; uniform ivec2 uN; uniform int uR; uniform float uMu, uSig, uDt;
out vec4 o;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  float u = 0.;
  int D = 2 * uR + 1;
  for (int dy = -20; dy <= 20; dy++){
    if (dy < -uR || dy > uR) continue;
    for (int dx = -20; dx <= 20; dx++){
      if (dx < -uR || dx > uR) continue;
      float k = texelFetch(uK, ivec2(dx + uR, dy + uR), 0).r;
      if (k == 0.) continue;
      u += k * texelFetch(uS, (c + ivec2(dx, dy) + uN) % uN, 0).r;
    }
  }
  float g = 2. * exp(-(u - uMu) * (u - uMu) / (2. * uSig * uSig)) - 1.;
  vec4 me = texelFetch(uS, c, 0);
  float a = clamp(me.r + uDt * g, 0., 1.);
  o = vec4(a, u, max(a, me.b * .96), 0.);
}`;
  const FS_SHOW = HEAD + `
uniform sampler2D uS; uniform ivec2 uN; uniform vec2 uRes; uniform float uCell, uMode, uPal, uInk, uC, uDots, uGlow, uTime;
out vec4 o;
vec3 pal(float t){
  t = clamp(t, 0., 1.);
  if (uPal < .5) return mix(mix(vec3(.75, 1., 1.), vec3(.45, .55, 1.), smoothstep(0., .35, t)), vec3(.6, .2, .75), smoothstep(.35, 1., t));
  if (uPal < 1.5) return mix(mix(vec3(1., .95, .7), vec3(1., .5, .1), smoothstep(0., .4, t)), vec3(.6, .05, .1), smoothstep(.4, 1., t));
  if (uPal < 2.5) return mix(mix(vec3(.8, 1., .8), vec3(.2, .9, .5), smoothstep(0., .4, t)), vec3(.05, .35, .45), smoothstep(.4, 1., t));
  return vec3(.5) + .5 * cos(6.2831 * (t * .8 + vec3(0., .33, .67)));
}
vec3 lenia(float v){ return clamp(vec3(-.2 + 1.6 * v * v, .05 + 1.3 * v - .3 * v * v, .25 + .9 * sin(3.1416 * min(v * 1.3, 1.))), 0., 1.); }
vec4 cellAt(ivec2 q){ return texelFetch(uS, (q + uN) % uN, 0); }
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 g = vec2(px.x, uRes.y - px.y) / uCell; // repère des cellules (y vers le haut)
  ivec2 q = ivec2(floor(g));
  vec3 paper = vec3(.953, .933, .89);
  vec3 col = uInk > .5 ? paper : vec3(.012, .01, .03);
  if (uMode > .5){
    // Lenia : bilinéaire à la main, palette de chaleur
    vec2 f = g - .5; ivec2 b = ivec2(floor(f)); vec2 t = f - floor(f);
    float v = mix(mix(cellAt(b).r, cellAt(b + ivec2(1, 0)).r, t.x), mix(cellAt(b + ivec2(0, 1)).r, cellAt(b + ivec2(1, 1)).r, t.x), t.y);
    float tr = mix(mix(cellAt(b).b, cellAt(b + ivec2(1, 0)).b, t.x), mix(cellAt(b + ivec2(0, 1)).b, cellAt(b + ivec2(1, 1)).b, t.x), t.y);
    if (uInk > .5) col = mix(paper, vec3(.13, .1, .3), clamp(v * 1.2, 0., 1.)) - vec3(.04, .03, 0.) * tr;
    else col = lenia(v) + vec3(.05, .08, .2) * tr * uGlow;
    o = vec4(col, 1.); return;
  }
  vec4 c = cellAt(q);
  int s = int(c.r + .5);
  // halo : les vivantes voisines éclairent un peu la case
  float halo = 0.;
  if (uGlow > 0.) for (int dy = -2; dy <= 2; dy++) for (int dx = -2; dx <= 2; dx++){ vec4 n = cellAt(q + ivec2(dx, dy)); if (int(n.r + .5) == 1){ vec2 d = (vec2(q + ivec2(dx, dy)) + .5) - g; halo += exp(-dot(d, d) * .55); } }
  vec2 fp = fract(g) - .5;
  float shape = uDots > .5 && uCell > 3. ? smoothstep(.5, .5 - 1.6 / uCell, length(fp) * 1.08) : 1.;
  float ageT = 1. - exp(-c.g / 40.);
  vec3 alive = pal(ageT);
  vec3 dying = mix(vec3(1., .55, .15), vec3(.7, .1, .2), (c.r - 2.) / max(1., uC - 2.));
  vec3 trailC = pal(.85) * .35;
  if (uInk > .5){
    vec3 ink = vec3(.12, .1, .28);
    col = mix(col, paper * .82, clamp(c.b * .6, 0., 1.));
    if (s == 1) col = mix(col, ink, shape);
    else if (s >= 2) col = mix(col, vec3(.75, .35, .15), shape * .8);
    o = vec4(col, 1.); return;
  }
  col += trailC * c.b * .6 * uGlow;
  if (s == 1) col = mix(col, alive, shape);
  else if (s >= 2) col = mix(col, dying, shape * .9);
  col += alive * halo * .05 * uGlow;
  o = vec4(col, 1.);
}`;

  window.FASC.push({
    id: 'vie', name: 'Le Jeu de la vie', cat: 'Vivant', glyph: '⊞', smoothTime: true,
    blurb: 'Conway, ses cousins et des créatures continues',
    hint: 'OBSERVER : touchez une cellule · DESSINER : glissez pour faire naître · GOMME : glissez pour effacer · MOTIF : touchez pour poser le motif choisi dans le panneau (planeur, canon, mathusalem…).',
    intro: 'Une grille, des cellules vivantes ou mortes, et deux règles : naître entourée de trois voisines, survivre avec deux ou trois. Rien d’autre. Et pourtant, des planeurs filent, des canons tirent, des colonies bouillonnent pendant des milliers de générations. Dans Lenia, la grille devient continue, et l’on croirait regarder des bactéries au microscope.',
    legend: [
      { color: '#bff8ff', name: 'Cellule nouveau-née', role: 'blanche bleutée', desc: 'Elle vient de naître. Sa couleur glisse vers le bleu puis le violet à mesure qu’elle vieillit : les zones stables sont violettes, les zones agitées claires.' },
      { color: '#8a6cff', name: 'Traînée', role: 'mémoire des générations passées', desc: 'Les cellules mortes laissent une lueur qui s’éteint peu à peu : les planeurs dessinent des comètes, les oscillateurs des halos.' },
      { color: '#ff8c26', name: 'Cellule mourante', role: 'Brian’s Brain, Star Wars', desc: 'Dans les règles à plusieurs états, une cellule passe par un ou deux états « fatigués » avant de mourir, ce qui donne une direction au mouvement.' },
      { color: '#ffd23a', name: 'Planeur', role: '5 cellules, vitesse c/4', desc: 'Le premier vaisseau découvert (Richard Guy, 1970). Il est devenu l’emblème des hackers.' },
      { color: '#79f3b4', name: 'Mathusalem', role: 'petit motif, longue vie', desc: 'R-pentomino, gland, diehard : quelques cellules qui s’agitent des milliers de générations avant de se stabiliser ou de mourir.' },
      { color: '#ff9cf0', name: 'Créature de Lenia', role: 'Orbium · automate continu', desc: 'Une forme ronde qui nage en gardant sa forme, comme un organisme. Bert Chan en a catalogué plus de 400 espèces.' },
    ],
    about: [
      'John Horton Conway invente le jeu en 1970, à Cambridge, sur un plateau de go, en cherchant la règle la plus simple qui donne des comportements imprévisibles. Martin Gardner le publie en octobre 1970 dans Scientific American ; pendant des années, on estime qu’un quart du temps de calcul des ordinateurs du monde est consacré à faire tourner des grilles de vie.',
      'Le jeu est « Turing-complet » : avec des canons à planeurs comme signaux, des portes logiques et des mémoires, on peut y construire n’importe quel ordinateur, et même un jeu de la vie qui simule un jeu de la vie (le métapixel OTCA, 2006). Conséquence étrange : il est impossible de prédire en général si un motif finira par mourir, sauf en le laissant tourner.',
      'Les règles cousines se notent B/S : les nombres de voisines qui font naître (B, birth) et survivre (S). Il en existe 2¹⁸, soit 262 144 ; seules quelques-unes ont la juste mesure de chaos de celle de Conway. Les règles à « générations » ajoutent des états de fatigue, comme dans Brian’s Brain.',
      'Lenia (Bert Wang-Chak Chan, 2018) remplace les cases tout-ou-rien par des valeurs continues, le voisinage de 8 cases par un anneau de rayon 13, et la règle par une courbe en cloche. On y trouve des créatures qui se déplacent, tournent, se divisent : de la « vie artificielle » qui ne doit rien à la biologie. Le nom « automate cellulaire » vient de John von Neumann et Stanisław Ulam, dans les années 1940, qui cherchaient une machine capable de se reproduire.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une cellule : vivante ou morte, son âge, ses voisines.' },
      { id: 'dessiner', label: 'dessiner', desc: 'Glissez pour faire naître des cellules (dans Lenia, ajouter de la matière).' },
      { id: 'gomme', label: 'gomme', desc: 'Glissez pour effacer.' },
      { id: 'motif', label: 'motif', desc: 'Touchez pour poser le motif choisi dans le panneau (dans Lenia : une tache de soupe).' },
    ],
    make(env) { return makeLife(env); },
  });

  function makeLife(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = { scene: 'conway', rule: 'conway', cell: 5, gps: 12, trail: 0.6, glow: 0.7, dots: true, pal: env.theme === 'light' ? 0 : 0, ink: env.theme === 'light', pat: 'gosper', music: false, mu: 0.15, sig: 0.015, ldt: 0.1, auto: true };
    let K, P, R = null, gen = 0, acc = 0, pop = 0, popT = 0, paints = [];
    const kernelTex = { tex: null };

    function init() {
      if (!K) {
        K = GLKit(Math.round(W), Math.round(H));
        P = { life: K.program(FS_LIFE), paint: K.program(FS_PAINT), lenia: K.program(FS_LENIA), show: K.program(FS_SHOW) };
      }
      const len = cfg.scene === 'lenia';
      const cs = len ? Math.max(3, Math.min(W, H) / 130) : cfg.cell;
      const NX = Math.ceil(W / cs), NY = Math.ceil(H / cs);
      if (R) { /* les anciennes cibles restent allouées : rares changements de taille */ }
      R = { cs, NX, NY, S: K.double(NX, NY, 'f32', K.gl.NEAREST) };
      gen = 0; acc = 0;
      if (len) buildKernel(13);
    }
    function upload(data) {
      const gl = K.gl;
      for (const t of [R.S.r, R.S.w]) { gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texImage2D(gl.TEXTURE_2D, 0, K.full ? gl.RGBA32F : gl.RGBA16F, R.NX, R.NY, 0, gl.RGBA, gl.FLOAT, data); }
    }
    function soup(dens) {
      const n = R.NX * R.NY, d = new Float32Array(n * 4);
      const v = view(), x0 = Math.floor(v.x0 / R.cs), x1 = Math.ceil(v.x1 / R.cs);
      for (let y = 0; y < R.NY; y++) for (let x = x0; x < x1; x++) {
        const i = (y * R.NX + x) * 4;
        if (cfg.scene === 'lenia') {
          // quelques taches de matière aléatoire
          d[i] = 0;
        } else if (Math.random() < dens) { d[i] = 1; d[i + 2] = 1; }
      }
      if (cfg.scene === 'lenia') {
        // des taches lisses et un peu dissymétriques : certaines se mettent à nager (Orbium)
        const nb = 4 + rint(4), Rk = 13;
        for (let b = 0; b < nb; b++) {
          const r = Rk * rnd(1.1, 0.7), amp = rnd(1, 0.75), cx = rnd(x1 - 2 * r, x0 + 2 * r), cy = rnd(R.NY - 2 * r, 2 * r), a = rnd(TAU), sk = rnd(0.5, 0.2);
          for (let y = -2 * r; y <= 2 * r; y++) for (let x = -2 * r; x <= 2 * r; x++) {
            const u = (x * Math.cos(a) + y * Math.sin(a)) / r, w = (-x * Math.sin(a) + y * Math.cos(a)) / r;
            const v = amp * Math.exp(-(u * u + w * w) * 1.6) * (1 + sk * u);
            if (v < 0.02) continue;
            const X = ((Math.round(cx + x) % R.NX) + R.NX) % R.NX, Y = ((Math.round(cy + y) % R.NY) + R.NY) % R.NY;
            d[(Y * R.NX + X) * 4] = clamp(v, 0, 1);
          }
        }
      }
      upload(d); gen = 0;
    }
    function clearAll() { upload(new Float32Array(R.NX * R.NY * 4)); gen = 0; }
    // pose un motif (RLE) centré sur un point de l'écran
    function place(key, sx, sy) {
      const p = parseRLE(PAT[key].rle), gl = K.gl;
      const gx = Math.floor(sx / R.cs) - (p.w >> 1), gyTop = Math.floor(sy / R.cs) - (p.h >> 1);
      const pad = 1, w = p.w + 2 * pad, h = p.h + 2 * pad, d = new Float32Array(w * h * 4);
      for (const [x, y] of p.cells) { const yy = h - 1 - (y + pad); const i = (yy * w + x + pad) * 4; d[i] = 1; d[i + 2] = 1; }
      const X0 = gx - pad, Y0 = R.NY - 1 - (gyTop - pad) - (h - 1);
      if (X0 < 0 || Y0 < 0 || X0 + w > R.NX || Y0 + h > R.NY) return false;
      gl.bindTexture(gl.TEXTURE_2D, R.S.r.tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, X0, Y0, w, h, gl.RGBA, gl.FLOAT, d);
      if (snd()) au.pluck(392, 0.8, 0.05);
      return true;
    }
    function buildKernel(Rk) {
      const gl = K.gl, D = 2 * Rk + 1, d = new Float32Array(D * D * 4);
      let sum = 0;
      for (let y = -Rk; y <= Rk; y++) for (let x = -Rk; x <= Rk; x++) {
        const r = Math.hypot(x, y) / Rk;
        const k = r > 0 && r < 1 ? Math.exp(4 - 1 / (r * (1 - r))) : 0;
        d[((y + Rk) * D + x + Rk) * 4] = k; sum += k;
      }
      for (let i = 0; i < D * D; i++) d[i * 4] /= sum;
      if (!kernelTex.tex) kernelTex.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, kernelTex.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, D, D, 0, gl.RGBA, gl.FLOAT, d);
      for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
      R.Rk = Rk;
    }

    /* ───────── un pas ───────── */
    function applyPaints() {
      if (!paints.length) return;
      const A = new Float32Array(64);
      paints.slice(0, 16).forEach((p, i) => A.set([p.x / R.cs, R.NY - p.y / R.cs, p.r / R.cs, p.k], i * 4));
      P.paint.use().t('uS', R.S.r).f('uCell', R.cs, R.cs).i('uNP', Math.min(16, paints.length)).v4('uP', A).f('uLenia', cfg.scene === 'lenia' ? 1 : 0);
      K.run(P.paint, R.S.w); R.S.swap();
      paints = [];
    }
    function step() {
      if (cfg.scene === 'lenia') {
        P.lenia.use().t('uS', R.S.r).t('uK', kernelTex.tex).f('uMu', cfg.mu).f('uSig', cfg.sig).f('uDt', cfg.ldt).i('uR', R.Rk);
        K.gl.uniform2i(K.gl.getUniformLocation(P.lenia.p, 'uN'), R.NX, R.NY);
        K.run(P.lenia, R.S.w); R.S.swap();
      } else {
        const rl = parseRule(RULES[cfg.rule].bs);
        P.life.use().t('uS', R.S.r).i('uB', rl.B).i('uSv', rl.S).i('uC', rl.C).f('uTrail', 0.55 + cfg.trail * 0.43);
        K.gl.uniform2i(K.gl.getUniformLocation(P.life.p, 'uN'), R.NX, R.NY);
        K.run(P.life, R.S.w); R.S.swap();
      }
      gen++;
      if (cfg.music && snd() && cfg.scene !== 'lenia') music();
    }
    // musique de la vie : la colonne centrale, lue de haut en bas, joue une gamme pentatonique
    const PENTA = [0, 2, 4, 7, 9];
    let musT = 0;
    function music() {
      if ((musT = (musT + 1) % Math.max(1, Math.round(cfg.gps / 6))) !== 0) return;
      const v = view(), x = Math.floor(v.cx / R.cs), n = 16, step = Math.max(1, Math.floor(R.NY / n)), y0 = Math.floor((R.NY - n * step) / 2);
      const buf = new Float32Array(4 * R.NY);
      try { K.gl.bindFramebuffer(K.gl.FRAMEBUFFER, R.S.r.fb); K.gl.readPixels(x, 0, 1, R.NY, K.gl.RGBA, K.gl.FLOAT, buf); } catch (e) { return; }
      let played = 0;
      for (let k = 0; k < n && played < 3; k++) { const yy = y0 + k * step; if (Math.round(buf[yy * 4]) === 1 && buf[yy * 4 + 1] < 1) { const note = PENTA[k % 5] + 12 * Math.floor(k / 5); au.pluck(196 * Math.pow(2, note / 12), 0.9, 0.035); played++; } }
    }
    function countPop() {
      try {
        const buf = new Float32Array(R.NX * R.NY * 4);
        K.gl.bindFramebuffer(K.gl.FRAMEBUFFER, R.S.r.fb); K.gl.readPixels(0, 0, R.NX, R.NY, K.gl.RGBA, K.gl.FLOAT, buf);
        let p = 0; if (cfg.scene === 'lenia') { for (let i = 0; i < buf.length; i += 4) p += buf[i]; } else for (let i = 0; i < buf.length; i += 4) if (Math.round(buf[i]) === 1) p++;
        pop = p;
      } catch (e) { /* lecture indisponible */ }
    }

    /* ───────── boucle ───────── */
    let pending = false, label = null, still = 0;
    function update(dt) {
      applyPaints();
      const real = dt / 0.4;
      const rate = cfg.scene === 'lenia' ? 20 : cfg.gps;
      acc += real * rate;
      let n = Math.min(cfg.scene === 'lenia' ? 2 : 8, Math.floor(acc)); acc -= n; if (acc > 4) acc = 0;
      while (n-- > 0) step();
      if ((popT += real) > 1) {
        popT = 0; const old = pop; countPop();
        // si tout est mort (ou figé depuis longtemps), on réensemence
        still = Math.abs(pop - old) < (cfg.scene === 'lenia' ? 0.5 : 1) ? still + 1 : 0;
        if (cfg.auto && (pop < (cfg.scene === 'lenia' ? 5 : 3) || (cfg.scene !== 'lenia' && still > 25))) { soup(cfg.scene === 'lenia' ? 0 : 0.3); still = 0; }
      }
      if (label) label.t += real;
    }
    function render() {
      const ink = cfg.ink;
      P.show.use().t('uS', R.S.r).f('uRes', W, H).f('uCell', R.cs).f('uMode', cfg.scene === 'lenia' ? 1 : 0).f('uPal', cfg.pal).f('uInk', ink ? 1 : 0)
        .f('uC', parseRule(RULES[cfg.rule].bs).C).f('uDots', cfg.dots ? 1 : 0).f('uGlow', cfg.glow).f('uTime', gen);
      K.gl.uniform2i(K.gl.getUniformLocation(P.show.p, 'uN'), R.NX, R.NY);
      K.run(P.show, null);
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      const v = view();
      ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink ? 'rgba(40,30,80,.75)' : 'rgba(230,228,255,.7)';
      ctx.fillText(cfg.scene === 'lenia' ? `LENIA · μ = ${fr(cfg.mu, 3)} · σ = ${fr(cfg.sig, 4)} · MASSE ${Math.round(pop)}` : `${RULES[cfg.rule].nom.toUpperCase()} ${RULES[cfg.rule].bs} · GÉNÉRATION ${gen} · ${pop} CELLULES`, v.x0 + 16, H - 16);
      ctx.restore();
      drawLabel();
    }
    function frame(t, dt) {
      if (dt > 0) update(dt); else applyPaints();
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }
    function drawLabel() {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (6 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      const m = label.m; if (!m) return;
      let name, role;
      if (cfg.scene === 'lenia') { name = m[0] > 0.05 ? 'Matière' : 'Vide'; role = `densité ${fr(m[0], 2)} · voisinage pondéré ${fr(m[1], 3)} (croissance si proche de ${fr(cfg.mu, 2)})`; }
      else { const s = Math.round(m[0]); name = s === 1 ? 'Cellule vivante' : s >= 2 ? 'Cellule mourante' : 'Cellule morte'; role = s === 1 ? `âge ${Math.round(m[1])} génération${m[1] >= 2 ? 's' : ''}` : s >= 2 ? `état ${s} sur ${parseRule(RULES[cfg.rule].bs).C - 1}` : m[2] > 0.05 ? 'une cellule vivait ici récemment' : 'vide'; }
      const v = view(), side = label.x > v.x0 + v.w * 0.5 ? -1 : 1, lx = label.x + side * 40, ly = label.y < 70 ? label.y + 46 : label.y - 36;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(label.x, label.y, 11, 0, TAU); ctx.stroke();
      ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6; ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = 'rgba(250,250,245,.96)'; ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(name, lx, ly);
      ctx.fillStyle = '#ffd23a'; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    function setScene(id) {
      cfg.scene = id; label = null;
      if (id === 'conway') cfg.rule = 'conway';
      if (id === 'regles' && cfg.rule === 'conway') cfg.rule = 'brain';
      init();
      if (id === 'conway') { clearAll(); demo(); } else soup(id === 'lenia' ? 0 : cfg.rule === 'seeds' || cfg.rule === 'brain' || cfg.rule === 'starwars' ? 0.08 : 0.3);
    }
    // ouverture de Conway : deux canons qui tirent l'un vers l'autre, et une soupe à droite
    function demo() {
      const v = view();
      place('gosper', v.x0 + v.w * 0.28, H * 0.25);
      place('rpento', v.x0 + v.w * 0.7, H * 0.6);
      place('gland', v.x0 + v.w * 0.35, H * 0.72);
      place('pulsar', v.x0 + v.w * 0.82, H * 0.22);
    }

    if (window.FASC_DEBUG) window.FASC_DEBUG.vie = { cfg, setScene, soup, place, step, get gen() { return gen; }, get pop() { return pop; }, run(n, h) { for (let i = 0; i < n; i++) update(h); render(); } };

    setScene('conway');
    let last = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool; last = { x: p.x, y: p.y };
        if (tool === 'observer') {
          let m = null;
          try { const b = new Float32Array(4); K.gl.bindFramebuffer(K.gl.FRAMEBUFFER, R.S.r.fb); K.gl.readPixels(Math.floor(p.x / R.cs), R.NY - 1 - Math.floor(p.y / R.cs), 1, 1, K.gl.RGBA, K.gl.FLOAT, b); m = b; } catch (e) { /* rien */ }
          label = { x: p.x, y: p.y, t: 0, m }; return;
        }
        if (tool === 'motif') { if (cfg.scene === 'lenia') paints.push({ x: p.x, y: p.y, r: R.cs * 20, k: 2 }); else place(cfg.pat, p.x, p.y); return; }
        if (tool === 'dessiner') paints.push({ x: p.x, y: p.y, r: cfg.scene === 'lenia' ? R.cs * 6 : R.cs * 1.2, k: 1 });
        if (tool === 'gomme') paints.push({ x: p.x, y: p.y, r: R.cs * 6, k: 0 });
      },
      move(p) {
        if (!p.down || !last) return;
        const tool = env.tool;
        if (tool !== 'dessiner' && tool !== 'gomme') return;
        const d = Math.hypot(p.x - last.x, p.y - last.y), n = Math.max(1, Math.ceil(d / (R.cs * 0.8)));
        for (let i = 1; i <= n && paints.length < 16; i++) { const x = last.x + ((p.x - last.x) * i) / n, y = last.y + ((p.y - last.y) * i) / n; paints.push({ x, y, r: tool === 'gomme' ? R.cs * 6 : cfg.scene === 'lenia' ? R.cs * 6 : R.cs * 1.2, k: tool === 'gomme' ? 0 : 1 }); }
        last = { x: p.x, y: p.y };
      },
      up() { last = null; },
      clear() { clearAll(); },
      dispose() { if (K) K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: [
          { label: 'Jeu de la vie de Conway', act: () => setScene('conway') },
          { label: 'Autres univers', act: () => setScene('regles') },
          { label: 'Lenia', act: () => setScene('lenia') },
        ] });
        if (cfg.scene !== 'lenia') {
          if (cfg.scene === 'regles') {
            L.push({ type: 'section', label: 'Règle' });
            L.push({ type: 'choice', label: 'Univers', value: cfg.rule, set: (x) => { cfg.rule = x; soup(x === 'seeds' || x === 'brain' || x === 'starwars' ? 0.08 : 0.3); }, options: Object.keys(RULES).filter((k) => k !== 'conway').map((k) => ({ id: k, label: RULES[k].nom })) });
          } else L.push({ type: 'section', label: 'Conway' });
          L.push({ type: 'note', text: `${RULES[cfg.rule].bs} · ${RULES[cfg.rule].why}` });
          L.push({ type: 'bar', label: 'Population', color: '#bff8ff', value: clamp(pop / (R.NX * R.NY * 0.25), 0, 1), txt: pop + ' cellules · génération ' + gen });
          if (cfg.scene === 'conway') {
            L.push({ type: 'choice', label: 'Motif posé par l’outil MOTIF', value: cfg.pat, set: (x) => { cfg.pat = x; }, options: Object.keys(PAT).map((k) => ({ id: k, label: PAT[k].nom })) });
            L.push({ type: 'note', text: PAT[cfg.pat].why });
          }
          L.push({ type: 'buttons', items: [{ label: 'Soupe', act: () => soup(0.3) }, { label: 'Tout effacer', act: () => clearAll() }, ...(cfg.scene === 'conway' ? [{ label: 'Démonstration', act: () => { clearAll(); demo(); } }] : [])] });
          L.push({ type: 'slider', label: 'Générations par seconde', min: 1, max: 60, step: 1, value: cfg.gps, fmt: (x) => String(x), set: (x) => { cfg.gps = x; } });
          L.push({ type: 'toggle', label: 'Réensemencer quand tout meurt ou se fige', value: cfg.auto, set: (x) => { cfg.auto = x; } });
          L.push({ type: 'toggle', label: 'Musique de la vie (colonne centrale)', value: cfg.music, set: (x) => { cfg.music = x; } });
          L.push({ type: 'section', label: 'Affichage' });
          L.push({ type: 'slider', label: 'Taille des cellules', min: 2, max: 14, step: 1, value: cfg.cell, fmt: (x) => x + ' px', set: (x) => { cfg.cell = x; clearTimeout(cfg._t); cfg._t = setTimeout(() => setScene(cfg.scene), 300); } });
          L.push({ type: 'slider', label: 'Traînées', min: 0, max: 1, step: 0.01, value: cfg.trail, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.trail = x; } });
          L.push({ type: 'slider', label: 'Lueur', min: 0, max: 1, step: 0.01, value: cfg.glow, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.glow = x; } });
          L.push({ type: 'toggle', label: 'Cellules rondes', value: cfg.dots, set: (x) => { cfg.dots = x; } });
          L.push({ type: 'choice', label: 'Couleurs', value: cfg.ink ? 'encre' : cfg.pal, set: (x) => { if (x === 'encre') cfg.ink = true; else { cfg.ink = false; cfg.pal = x; } }, options: [{ id: 0, label: 'Glace' }, { id: 1, label: 'Braise' }, { id: 2, label: 'Lagon' }, { id: 3, label: 'Arc-en-ciel' }, { id: 'encre', label: 'Encre' }] });
        } else {
          L.push({ type: 'section', label: 'Lenia' });
          L.push({ type: 'note', text: 'Chaque case vaut entre 0 et 1. Elle regarde un anneau de rayon 13 autour d’elle ; si la moyenne pondérée tombe près de μ, elle grandit, sinon elle décline. Les taches de soupe se défont souvent ; parfois l’une d’elles devient un Orbium, une créature ronde qui nage.' });
          L.push({ type: 'bar', label: 'Masse totale', color: '#ff9cf0', value: clamp(pop / (R.NX * R.NY * 0.08), 0, 1), txt: String(Math.round(pop)) });
          L.push({ type: 'buttons', items: [{ label: 'Nouvelle soupe', act: () => soup(0) }, { label: 'Tout effacer', act: () => clearAll() }] });
          L.push({ type: 'slider', label: 'μ, croissance idéale', min: 0.1, max: 0.35, step: 0.001, value: cfg.mu, fmt: (x) => fr(x, 3) + (Math.abs(x - 0.15) < 0.002 ? ' · Orbium' : ''), set: (x) => { cfg.mu = x; } });
          L.push({ type: 'slider', label: 'σ, tolérance', min: 0.005, max: 0.05, step: 0.0005, value: cfg.sig, fmt: (x) => fr(x, 4) + (Math.abs(x - 0.015) < 0.0006 ? ' · Orbium' : ''), set: (x) => { cfg.sig = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Réglages de l’Orbium', act: () => { cfg.mu = 0.15; cfg.sig = 0.015; } }] });
          L.push({ type: 'toggle', label: 'Réensemencer quand tout s’éteint', value: cfg.auto, set: (x) => { cfg.auto = x; } });
          L.push({ type: 'section', label: 'Affichage' });
          L.push({ type: 'slider', label: 'Traînées', min: 0, max: 1, step: 0.01, value: cfg.glow, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.glow = x; } });
          L.push({ type: 'toggle', label: 'Encre sur papier', value: cfg.ink, set: (x) => { cfg.ink = x; } });
        }
        return L;
      },
    };
  }
})();
