/* Fascination — Les Abysses · bioluminescence des profondeurs (WebGL2)
   Créatures en vraie 3D : cloches maillées (profil, pulsation, lobes, canaux), cerclées de lumière par effet de
   bord (Fresnel), tentacules en chaînes souples qui suivent l'eau, photophores et organes lumineux en points.
   Tout est additif dans une cible HDR, puis halo (flou à trois niveaux), brume de l'eau et compression ACES.
   Portraits : une créature à la fois, en plein écran, dans le noir ; la LAMPE révèle ses vraies couleurs
   (souvent rouges, couleur invisible en profondeur). Descente : de la surface à 4 000 m, avec les espèces
   de chaque zone, la lumière du jour qui s'éteint et la neige marine. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');

  /* ───────── matrices ───────── */
  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]); }
  function lookAt(e, c, u) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  }
  function mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  const proj = (m, x, y, z) => { const w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, w]; };

  /* ───────── shaders ───────── */
  const VS_MESH = `#version 300 es
precision highp float;
in vec3 aP; in vec3 aN; in vec4 aE; in vec3 aA;
uniform mat4 uVP; uniform vec3 uEye; uniform float uFog;
out vec3 vN; out vec3 vV; out vec4 vE; out vec3 vA; out float vF;
void main(){ gl_Position = uVP * vec4(aP, 1.); vN = aN; vV = uEye - aP; vE = aE; vA = aA; vF = exp(-length(uEye - aP) * uFog); }`;
  const FS_MESH = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vV; in vec4 vE; in vec3 vA; in float vF;
uniform float uAmb, uLamp; uniform vec3 uAmbCol;
out vec4 o;
void main(){
  vec3 n = normalize(vN + vec3(1e-6)), v = normalize(vV + vec3(1e-6));
  float c = abs(dot(n, v)), rim = pow(1. - c, 2.6);
  vec3 col = vE.rgb * (.35 + rim * vE.a);                         // lumière émise (bioluminescence), plus vive sur les bords
  col += uAmbCol * vA * (rim * 1.1 + .06) * uAmb;                  // très faible lumière ambiante : les silhouettes
  col += uLamp * vA * (.05 + .25 * c + .9 * rim);                  // la lampe du plongeur : les vraies couleurs
  o = vec4(min(col * vF, vec3(40.)), 1.);
}`;
  const VS_LINE = `#version 300 es
precision highp float;
in vec3 aP; in vec4 aE; in vec3 aA;
uniform mat4 uVP; uniform vec3 uEye; uniform float uFog, uAmb, uLamp; uniform vec3 uAmbCol;
out vec3 vC;
void main(){ gl_Position = uVP * vec4(aP, 1.); float f = exp(-length(uEye - aP) * uFog); vC = (aE.rgb * aE.a + aA * (uAmb * uAmbCol * 1.4 + uLamp * .6)) * f; }`;
  const FS_LINE = `#version 300 es
precision highp float; in vec3 vC; out vec4 o; void main(){ o = vec4(min(vC, vec3(40.)), 1.); }`;
  const VS_PT = `#version 300 es
precision highp float;
in vec3 aP; in vec4 aE;
uniform mat4 uVP; uniform vec3 uEye; uniform float uFog, uPx;
out vec3 vC;
void main(){ vec4 q = uVP * vec4(aP, 1.); gl_Position = q; gl_PointSize = clamp(aE.a * uPx / q.w, 1., 48.); vC = aE.rgb * exp(-length(uEye - aP) * uFog); }`;
  const FS_PT = `#version 300 es
precision highp float; in vec3 vC; out vec4 o; void main(){ vec2 d = gl_PointCoord - .5; float k = exp(-dot(d, d) * 18.); o = vec4(min(vC * k, vec3(40.)), 1.); }`;
  const FS_BLUR = HEAD + `uniform sampler2D uT; uniform vec2 uDir; out vec4 o;
void main(){ vec4 s = texture(uT, vUv) * .227; s += (texture(uT, vUv + uDir * 1.385) + texture(uT, vUv - uDir * 1.385)) * .316; s += (texture(uT, vUv + uDir * 3.23) + texture(uT, vUv - uDir * 3.23)) * .07; o = s; }`;
  const FS_COMP = HEAD + `
uniform sampler2D uA, uB1, uB2, uB3; uniform vec2 uRes; uniform vec3 uTop, uBot; uniform float uRays, uT, uBloom, uDecor, uInk, uExpo;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec3 bg = uDecor > .5 ? mix(uBot, uTop, pow(vUv.y, 1.6)) : vec3(0.);
  if (uDecor > .5 && uRays > 0.){
    // rayons de soleil près de la surface
    float x = vUv.x * 3. + (1. - vUv.y) * .5;
    float r = pow(.5 + .5 * sin(x * 7. + sin(x * 2.3 + uT * .2) * 2. + uT * .1), 8.) * pow(vUv.y, 2.5);
    bg += uTop * r * uRays * .8;
  }
  vec3 col = bg + texture(uA, vUv).rgb + (texture(uB1, vUv).rgb * .55 + texture(uB2, vUv).rgb * .45 + texture(uB3, vUv).rgb * .4) * uBloom;
  vec2 q = vUv - .5; col *= 1. - dot(q, q) * .55;
  col = aces(col * uExpo);
  if (uInk > .5){ float l = dot(col, vec3(.3, .55, .15)); col = vec3(.953, .933, .89) * (1. - .85 * l); }
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;

  /* ───────── les créatures ───────── */
  // R : rayon de la cloche (m) ; profil ; couleurs : alb (vraie couleur), glass (lueur propre), bio (bioluminescence)
  const SPEC = {
    atolla: { nom: 'Atolla wyvillei', fr: 'méduse couronne', prof: '500 à 1 500 m', zone: [600, 3000], R: 0.08, H: 0.32, profile: 'flat', lappets: 22, groove: true, canals: 0,
      alb: [0.55, 0.04, 0.06], glass: [0.02, 0.0, 0.0], bio: [0.25, 0.55, 1.0], bioKind: 'alarme', T: 1.8, tent: 22, tentL: 1.4, tentW: 1, longOne: true, tentAlb: [0.5, 0.06, 0.08],
      why: 'Rouge sombre, donc invisible là où la lumière rouge n’arrive pas. Attaquée, elle déclenche une roue de lumière bleue qui tourne autour de sa cloche : « l’alarme antivol », un appel à un prédateur plus gros que son agresseur. Edith Widder en a fait un leurre électronique, l’e-jelly, qui a permis de filmer pour la première fois un calmar géant vivant, en 2012.' },
    periphylla: { nom: 'Periphylla periphylla', fr: 'méduse casquée', prof: '500 à 7 000 m', zone: [900, 4000], R: 0.09, H: 1.5, profile: 'cone', lappets: 16, canals: 0, inner: [0.55, 0.02, 0.06],
      alb: [0.32, 0.05, 0.13], glass: [0.015, 0.0, 0.01], bio: [0.3, 0.6, 1.0], bioKind: 'etincelles', T: 2.6, tent: 12, tentL: 1.3, tentW: 1.6, tentAlb: [0.45, 0.08, 0.12],
      why: 'Une cloche conique et pourpre, avec un estomac rouge foncé qui masque la lumière de ses proies avalées. Dérangée, elle crépite d’étincelles bleues sur toute la cloche. Elle fuit la lumière : dans certains fjords norvégiens assez sombres, elle remonte près de la surface.' },
    pelagia: { nom: 'Pelagia noctiluca', fr: 'pélagie, la « lumière de la nuit »', prof: '0 à 300 m', zone: [0, 600], R: 0.06, H: 0.7, profile: 'dome', lappets: 16, canals: 0, warts: true, arms: 4, armL: 3.2,
      alb: [0.75, 0.4, 0.62], glass: [0.02, 0.01, 0.02], bio: [0.3, 0.9, 0.85], bioKind: 'lueur', T: 1.4, tent: 8, tentL: 4.2, tentW: 0.8, tentAlb: [0.7, 0.35, 0.5],
      why: 'Son nom savant veut dire « lumière de la nuit en haute mer ». Quand on la touche, toute sa cloche s’illumine et laisse un mucus lumineux. Les pêcheurs de Méditerranée la redoutent : ses piqûres brûlent.' },
    aequorea: { nom: 'Aequorea victoria', fr: 'méduse cristal', prof: '0 à 100 m', zone: [0, 300], R: 0.09, H: 0.28, profile: 'flat', lappets: 0, canals: 100,
      alb: [0.6, 0.72, 0.8], glass: [0.01, 0.015, 0.02], bio: [0.25, 1.0, 0.45], bioKind: 'anneau', T: 3.4, tent: 90, tentL: 1.5, tentW: 0.5, tentAlb: [0.55, 0.65, 0.7],
      why: 'Presque invisible, transparente. Autour de sa cloche, une couronne de points verts : sa protéine lumineuse émet du bleu, qu’une seconde protéine convertit en vert. Cette protéine fluorescente verte (GFP) est devenue l’outil le plus utilisé de la biologie moderne : prix Nobel de chimie 2008 pour Osamu Shimomura, Martin Chalfie et Roger Tsien.' },
    beroe: { nom: 'Beroe forskalii', fr: 'béroé, un cténophore', prof: '0 à 1 000 m', zone: [0, 1200], R: 0.05, H: 2.6, profile: 'sack', lappets: 0, canals: 0, combs: 8,
      alb: [0.75, 0.5, 0.55], glass: [0.01, 0.006, 0.008], bio: [0.3, 0.6, 1.0], bioKind: 'eclair', T: 9, tent: 0,
      why: 'Pas une méduse : un cténophore, qui nage grâce à huit rangées de palettes ciliées. Ces palettes décomposent la lumière comme un prisme : les arcs-en-ciel qui y courent ne sont pas de la bioluminescence, mais de la diffraction (allumez la lampe). Dérangé, il émet en plus des éclairs bleus.' },
    praya: { nom: 'Praya dubia', fr: 'siphonophore géant', prof: '700 à 1 000 m', zone: [500, 1500], R: 0.05, H: 0.9, profile: 'praya', canals: 0,
      alb: [0.75, 0.82, 0.85], glass: [0.01, 0.012, 0.015], bio: [0.25, 0.75, 1.0], bioKind: 'chaine', T: 2.2, tent: 0,
      why: 'Une colonie de milliers d’individus spécialisés, enfilés sur une tige qui peut dépasser 40 mètres : l’un des plus longs animaux du monde. En tête, deux cloches nageuses ; derrière, une file de lumières bleues et de filets de pêche tendus en rideau.' },
    pyrosoma: { nom: 'Pyrosoma atlanticum', fr: 'pyrosome, « corps de feu »', prof: '0 à 800 m', zone: [100, 900], R: 0.05, H: 1.4, profile: 'tube', canals: 0,
      alb: [0.75, 0.6, 0.65], glass: [0.012, 0.01, 0.01], bio: [0.3, 0.95, 0.75], bioKind: 'vague', T: 6, tent: 0,
      why: 'Un tube creux formé de centaines de petits animaux (des tuniciers). Chacun s’allume quand il voit la lumière de son voisin : une vague de lumière parcourt alors toute la colonie. Thomas Huxley écrivait en 1849 avoir lu à leur lueur.' },
  };
  const ORDER = Object.keys(SPEC);

  window.FASC.push({
    id: 'meduses', name: 'Les Abysses', cat: 'Vivant', glyph: '🜄', decor: true, smoothTime: true,
    blurb: 'Méduses et lumières vivantes des profondeurs',
    hint: 'OBSERVER : touchez une créature · TOUCHER : effleurez-la pour déclencher sa lumière · LAMPE : maintenez pour l’éclairer (ses vraies couleurs) · COURANT : glissez pour pousser l’eau.',
    intro: 'Sous 200 mètres, la lumière du jour s’éteint. Pourtant, il ne fait pas noir : les trois quarts des animaux des profondeurs fabriquent leur propre lumière, presque toujours bleue. Ici, une créature à la fois, en plein écran, pour la regarder vivre ; ou bien une descente de la surface jusqu’à 4 000 mètres.',
    legend: ORDER.map((k) => ({ color: '#' + SPEC[k].bio.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join(''), name: SPEC[k].nom, role: SPEC[k].fr + ' · ' + SPEC[k].prof, desc: SPEC[k].why.split('. ')[0] + '.' })),
    about: [
      'La bioluminescence est une réaction chimique : une molécule, la luciférine, s’oxyde grâce à une enzyme, la luciférase, et libère un photon au lieu de chaleur. Elle est apparue indépendamment plus de 90 fois dans l’évolution. Une étude de 2017 (Martini et Haddock) estime que 76 % des animaux observés entre la surface et 4 000 m produisent de la lumière.',
      'La lumière des profondeurs est presque toujours bleue, autour de 470 nanomètres : c’est la couleur qui traverse l’eau le plus loin. Le rouge, lui, est absorbé dans les premières dizaines de mètres. Résultat : un animal rouge est invisible en profondeur, comme peint en noir. Atolla, Periphylla et bien d’autres ont adopté ce rouge ; allumez la LAMPE pour le voir.',
      'À quoi sert cette lumière ? À se cacher (contre-illumination : un ventre lumineux efface la silhouette vue d’en dessous), à attirer des proies, à appeler un partenaire, et à se défendre : éblouir, laisser un nuage lumineux, ou, comme Atolla, sonner l’alarme pour attirer un prédateur plus gros que son agresseur.',
      'Chaque nuit, des milliards de poissons-lanternes et de crevettes remontent des profondeurs pour se nourrir près de la surface, puis redescendent à l’aube : c’est la plus grande migration de la planète. La « neige marine » qui tombe en permanence, débris d’organismes de la surface, nourrit tout ce monde. Les créatures sont ici montrées un peu grossies et plus actives que dans la réalité.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une créature : son nom, sa profondeur, sa lumière.' },
      { id: 'toucher', label: 'toucher', desc: 'Effleurez une créature : elle déclenche sa bioluminescence de défense.' },
      { id: 'lampe', label: 'lampe', desc: 'Maintenez le doigt : la lampe du plongeur révèle les vraies couleurs (et la lumière vivante devient moins visible).' },
      { id: 'courant', label: 'courant', desc: 'Glissez pour pousser l’eau : les tentacules suivent.' },
    ],
    make(env) {
      try { return makeAbyss(env); } catch (e) {
        console.warn('Les Abysses : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#020610'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Les Abysses demandent WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeAbyss(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = { scene: 'portrait', cur: 'atolla', slide: true, amb: 0.5, lamp: false, bloom: 0.9, depth: 0, descAuto: true, descSpeed: 1, q: 'haute' };
    let T = 0, label = null, lampHold = 0;

    /* ───────── WebGL ───────── */
    const s0 = Math.min(dpr, 1.5), cw = Math.round(W * s0), ch = Math.round(H * s0);
    const K = GLKit(cw, ch), gl = K.gl;
    const PM = K.program(FS_MESH, VS_MESH), PL = K.program(FS_LINE, VS_LINE), PP = K.program(FS_PT, VS_PT), PB = K.program(FS_BLUR), PC = K.program(FS_COMP);
    const A = K.target(cw, ch), b1 = K.target(cw >> 1, ch >> 1), b1t = K.target(cw >> 1, ch >> 1), b2 = K.target(cw >> 2, ch >> 2), b2t = K.target(cw >> 2, ch >> 2), b3 = K.target(cw >> 3, ch >> 3), b3t = K.target(cw >> 3, ch >> 3);
    // tampons dynamiques : maillages (13 flottants par sommet), lignes (10), points (7)
    function mkBuf(P, layout) {
      const vao = gl.createVertexArray(), vbo = gl.createBuffer();
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      const stride = layout.reduce((s, l) => s + l[1], 0) * 4; let off = 0;
      for (const [name, n] of layout) { const loc = gl.getAttribLocation(P.p, name); if (loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, off); } off += n * 4; }
      gl.bindVertexArray(null);
      return { vao, vbo, stride: stride / 4, data: new Float32Array(1 << 16), n: 0 };
    }
    const BM = mkBuf(PM, [['aP', 3], ['aN', 3], ['aE', 4], ['aA', 3]]), BL = mkBuf(PL, [['aP', 3], ['aE', 4], ['aA', 3]]), BP = mkBuf(PP, [['aP', 3], ['aE', 4]]);
    function push(B, arr) {
      if (B.n + arr.length > B.data.length) { const d = new Float32Array(Math.max(B.data.length * 2, B.n + arr.length)); d.set(B.data); B.data = d; }
      for (let i = 0; i < arr.length; i++) B.data[B.n + i] = arr[i];
      B.n += arr.length;
    }
    const V = (B, ...a) => push(B, a);

    /* ───────── une créature ───────── */
    function create(key, x, y, z, scale) {
      const S = SPEC[key];
      const c = { key, S, p: [x, y, z], v: [0, 0, 0], ax: [0, 1, 0], sc: scale || 1, ph: rnd(1), bio: 0, bioT: -9, tilt: [rnd(0.3, -0.3), rnd(0.3, -0.3)], seed: rnd(100), tents: [], snow: [] };
      const R = S.R * c.sc;
      // tentacules : chaînes de points
      const nt = S.tent || 0;
      for (let i = 0; i < nt; i++) {
        const a = (i / nt) * TAU, long = S.longOne && i === 0, L = R * S.tentL * (long ? 5 : 1) * (0.8 + 0.4 * Math.random()), k = long ? 30 : Math.max(8, Math.round(S.tentL * 7));
        const pts = []; for (let j = 0; j <= k; j++) pts.push([x + Math.cos(a) * R, y - (j * L) / k, z + Math.sin(a) * R]);
        c.tents.push({ a, L, k, pts, prev: pts.map((q) => q.slice()), long });
      }
      const na = S.arms || 0;
      for (let i = 0; i < na; i++) {
        const a = (i / na) * TAU + 0.4, L = R * S.armL, k = 16;
        const pts = []; for (let j = 0; j <= k; j++) pts.push([x + Math.cos(a) * R * 0.15, y - (j * L) / k, z + Math.sin(a) * R * 0.15]);
        c.tents.push({ a, L, k, pts, prev: pts.map((q) => q.slice()), arm: true, r0: 0.15 });
      }
      // photophores et zooïdes, fixés sur le corps (u : le long de la cloche, v : autour)
      c.spots = [];
      const nsp = S.bioKind === 'etincelles' ? 140 : S.bioKind === 'anneau' ? 120 : S.bioKind === 'alarme' ? S.lappets * 2 : S.bioKind === 'vague' ? 260 : S.bioKind === 'chaine' ? 90 : 0;
      for (let i = 0; i < nsp; i++) c.spots.push({ u: S.bioKind === 'anneau' || S.bioKind === 'alarme' ? 0.97 : rnd(1, 0.05), v: S.bioKind === 'anneau' || S.bioKind === 'alarme' ? (i / nsp) * TAU : rnd(TAU), ph: rnd(TAU), s: rnd(1, 0.5) });
      if (S.profile === 'praya') { const n = 90, L = R * 26; c.stem = []; for (let i = 0; i <= n; i++) c.stem.push([x, y - (i * L) / n, z]); c.stemPrev = c.stem.map((q) => q.slice()); }
      return c;
    }
    // contraction de la cloche au cours du cycle de nage : rapide puis lente
    const pulse = (c) => { const x = c.ph % 1; return x < 0.3 ? Math.sin((x / 0.3) * Math.PI * 0.5) : Math.cos(((x - 0.3) / 0.7) * Math.PI * 0.5); };
    function basis(c) {
      const a = c.ax, t = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let e1 = [a[1] * t[2] - a[2] * t[1], a[2] * t[0] - a[0] * t[2], a[0] * t[1] - a[1] * t[0]]; const l = Math.hypot(...e1); e1 = e1.map((q) => q / l);
      const e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
      return [e1, a, e2];
    }
    const W3 = (c, B, x, y, z) => [c.p[0] + B[0][0] * x + B[1][0] * y + B[2][0] * z, c.p[1] + B[0][1] * x + B[1][1] * y + B[2][1] * z, c.p[2] + B[0][2] * x + B[1][2] * y + B[2][2] * z];
    // profil de la cloche : rayon et hauteur au paramètre u (0 au sommet, 1 au bord), en unités de R
    function prof(S, u, k, v) {
      let r, y;
      if (S.profile === 'flat') { r = Math.pow(Math.sin(u * Math.PI * 0.5), 0.75); y = S.H * Math.pow(Math.cos(u * Math.PI * 0.5), 1.4); if (S.groove) r *= 1 - 0.06 * Math.exp(-Math.pow((u - 0.55) / 0.06, 2)); }
      else if (S.profile === 'cone') { r = 0.06 + 0.94 * Math.pow(Math.sin(u * Math.PI * 0.5), 1.25); y = S.H * Math.pow(1 - u, 1.35); r *= 1 - 0.07 * Math.exp(-Math.pow((u - 0.72) / 0.05, 2)); }
      else if (S.profile === 'sack') { r = 0.55 * Math.pow(Math.sin(Math.min(1, u * 1.05) * Math.PI * 0.5 + 0.02), 0.6) * (1 - 0.3 * u * u); y = S.H * 0.5 * (1 - u * 1.9); }
      else { r = Math.sin(u * Math.PI * 0.5); y = S.H * Math.cos(u * Math.PI * 0.5); }
      // contraction : le bord se resserre, la cloche se bombe ; lobes du bord
      if (S.profile !== 'sack') { r *= 1 - 0.24 * k * u * u; y *= 1 + 0.14 * k; }
      if (S.lappets) r *= 1 + 0.035 * Math.max(0, Math.cos(S.lappets * v)) * Math.pow(u, 6);
      return [r, y];
    }

    /* ───────── lumière de chaque créature ───────── */
    function bioAt(c, u, v, t) {
      const S = c.S, b = c.bio, dt = t - c.bioT;
      if (b <= 0.01) return 0;
      if (S.bioKind === 'lueur') return b * (0.4 + 0.6 * Math.max(0, Math.sin(v * 5 + u * 9 + t * 3))) ;
      if (S.bioKind === 'eclair') return b * Math.exp(-Math.pow((u - ((dt * 0.8) % 1)) * 6, 2));
      return 0;
    }
    function spotLight(c, sp, t) {
      const S = c.S, b = c.bio, dt = t - c.bioT;
      if (S.bioKind === 'alarme') { // roue de lumière qui tourne autour de la cloche
        let k = 0; for (let w = 0; w < 3; w++) { const ph = ((sp.v - dt * 7 - (w * TAU) / 3) % TAU + TAU) % TAU; k += Math.exp(-ph * ph * 3); }
        return b * k * 1.6 + 0.03 * (0.5 + 0.5 * Math.sin(t * 2 + sp.ph));
      }
      if (S.bioKind === 'etincelles') return b * Math.pow(Math.max(0, Math.sin(t * 9 * sp.s + sp.ph)), 12) * 2.2;
      if (S.bioKind === 'anneau') return (0.08 + b * 1.4) * (0.7 + 0.3 * Math.sin(t * 2 + sp.ph));
      if (S.bioKind === 'vague') { const w = Math.exp(-Math.pow((sp.u - ((dt * 0.5) % 1.4) + 0.2) * 6, 2)); return 0.03 + b * w * 2 + 0.02 * Math.sin(t + sp.ph); }
      if (S.bioKind === 'chaine') return 0.15 + b * (0.8 + 0.6 * Math.sin(t * 6 + sp.ph));
      return 0;
    }

    /* ───────── construction des géométries ───────── */
    function buildCreature(c, t, light) {
      const S = c.S, R = S.R * c.sc, B = basis(c), k = pulse(c);
      const glass = S.glass, alb = S.alb, bio = S.bio;
      const nu = S.profile === 'sack' ? 26 : 22, nv = S.canals > 60 ? 140 : S.profile === 'sack' ? 48 : 72;
      const dense = cfg.scene === 'portrait';
      const NU = dense ? nu : Math.round(nu * 0.6), NV = dense ? nv : Math.round(nv * 0.5);
      if (S.profile === 'praya') return buildPraya(c, t, B, R);
      if (S.profile === 'tube') return buildTube(c, t, B, R);
      const P = (u, v) => { const [r, y] = prof(S, u, k, v); return W3(c, B, Math.cos(v) * r * R, y * R, Math.sin(v) * r * R); };
      const em = (u, v) => {
        // lueur propre + motifs internes (canaux, verrues) + bioluminescence de surface
        let e = 1;
        if (S.canals) e += 1.6 * Math.pow(Math.max(0, Math.cos(S.canals * v * 0.5)), 30) * u;
        if (S.warts) e += 0.8 * Math.pow(Math.max(0, Math.sin(v * 11) * Math.sin(u * 14)), 6);
        const b = bioAt(c, u, v, t);
        return [glass[0] * e + bio[0] * b, glass[1] * e + bio[1] * b, glass[2] * e + bio[2] * b];
      };
      // surface de la cloche (deux couches : ombrelle et sous-ombrelle)
      for (const layer of [1, 0.9]) {
        for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
          const u0 = i / NU, u1 = (i + 1) / NU, v0 = (j / NV) * TAU, v1 = ((j + 1) / NV) * TAU;
          const q = [[u0, v0], [u1, v0], [u1, v1], [u0, v0], [u1, v1], [u0, v1]];
          for (const [u, v] of q) {
            const p = P(u, v), p2 = P(Math.min(1, u + 0.01), v), p1 = P(Math.max(0, u - 0.01), v), p3 = P(Math.max(u, 0.02), v + 0.02), p4 = P(Math.max(u, 0.02), v);
            const pc = layer < 1 ? [c.p[0] + (p[0] - c.p[0]) * layer, c.p[1] + (p[1] - c.p[1]) * layer, c.p[2] + (p[2] - c.p[2]) * layer] : p;
            const du = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]], dv = [p3[0] - p4[0], p3[1] - p4[1], p3[2] - p4[2]];
            let n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]]; const ln = Math.hypot(...n);
            n = ln > 1e-12 ? n.map((x) => x / ln) : B[1].slice();
            const e = em(u, v), w = layer < 1 ? 0.45 : 1;
            const inner = S.inner && u < 0.6 && layer < 1;
            const a = inner ? S.inner : alb;
            V(BM, pc[0], pc[1], pc[2], n[0], n[1], n[2], e[0] * w, e[1] * w, e[2] * w, 2.2 * w, a[0] * w, a[1] * w, a[2] * w);
          }
        }
      }
      // rangées de palettes du cténophore : arcs-en-ciel qui courent (diffraction, visible sous la lampe)
      if (S.combs) {
        for (let r = 0; r < S.combs; r++) {
          const v = (r / S.combs) * TAU;
          for (let i = 0; i < 40; i++) {
            const u = 0.08 + (i / 40) * 0.82, p = P(u, v);
            const hue = (u * 3 - t * 1.2 + r * 0.1) % 1, rgb = [0.5 + 0.5 * Math.cos(TAU * hue), 0.5 + 0.5 * Math.cos(TAU * (hue - 0.33)), 0.5 + 0.5 * Math.cos(TAU * (hue - 0.67))];
            const lit = 0.1 + 1.4 * light;
            const wave = 0.5 + 0.5 * Math.sin(u * 30 - t * 9 + r);
            V(BP, p[0], p[1], p[2], rgb[0] * lit * wave, rgb[1] * lit * wave, rgb[2] * lit * wave, R * 0.12 * (dense ? 1 : 0.7));
          }
        }
      }
      // photophores en points
      for (const sp of c.spots) {
        const L = spotLight(c, sp, t); if (L < 0.01) continue;
        const p = P(sp.u, sp.v);
        V(BP, p[0], p[1], p[2], bio[0] * L, bio[1] * L, bio[2] * L, R * (S.bioKind === 'anneau' ? 0.07 : 0.1));
      }
      // tentacules et bras
      for (const tn of c.tents) {
        const col = tn.arm ? alb : S.tentAlb || alb;
        for (let j = 0; j < tn.k; j++) {
          const a = tn.pts[j], b = tn.pts[j + 1], f = 1 - j / tn.k;
          const g = tn.long ? 0.12 : 0.04;
          const eb = c.bio * (S.bioKind === 'alarme' && tn.long ? 1 : 0.15);
          for (const q of [a, b]) V(BL, q[0], q[1], q[2], glass[0] * 2 + bio[0] * eb, glass[1] * 2 + bio[1] * eb, glass[2] * 2 + bio[2] * eb, f * (1 + g * 10), col[0] * f * (tn.arm ? 0.9 : 0.6), col[1] * f * (tn.arm ? 0.9 : 0.6), col[2] * f * (tn.arm ? 0.9 : 0.6));
        }
        if (S.bioKind === 'lueur' && c.bio > 0.05) { const q = tn.pts[tn.k]; V(BP, q[0], q[1], q[2], bio[0] * c.bio, bio[1] * c.bio, bio[2] * c.bio, R * 0.15); }
      }
    }
    // siphonophore : deux cloches nageuses en tête, une longue tige ondulante semée de lumières
    function buildPraya(c, t, B, R) {
      const S = c.S, n = 90, L = R * 26;
      // les deux nectophores : petites cloches ovales
      for (const side of [-1, 1]) {
        const cen = W3(c, B, side * R * 0.55, R * 0.3, 0);
        for (let i = 0; i < 10; i++) for (let j = 0; j < 20; j++) {
          const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]];
          for (const [a, b] of q) {
            const u = a / 10, v = (b / 20) * TAU, r = Math.sin(u * Math.PI) * R * 0.55, y = Math.cos(u * Math.PI) * R * 0.85;
            const p = [cen[0] + B[0][0] * Math.cos(v) * r + B[1][0] * y + B[2][0] * Math.sin(v) * r, cen[1] + B[0][1] * Math.cos(v) * r + B[1][1] * y + B[2][1] * Math.sin(v) * r, cen[2] + B[0][2] * Math.cos(v) * r + B[1][2] * y + B[2][2] * Math.sin(v) * r];
            const nn = [p[0] - cen[0], p[1] - cen[1], p[2] - cen[2]], l = Math.hypot(...nn) || 1;
            V(BM, p[0], p[1], p[2], nn[0] / l, nn[1] / l, nn[2] / l, S.glass[0], S.glass[1], S.glass[2], 2.4, S.alb[0], S.alb[1], S.alb[2]);
          }
        }
      }
      for (let i = 0; i < n; i++) {
        const a = c.stem[i], b = c.stem[i + 1], f = 1 - (i / n) * 0.6;
        V(BL, a[0], a[1], a[2], S.glass[0] * 3, S.glass[1] * 3, S.glass[2] * 3, f, S.alb[0] * f * 0.5, S.alb[1] * f * 0.5, S.alb[2] * f * 0.5);
        V(BL, b[0], b[1], b[2], S.glass[0] * 3, S.glass[1] * 3, S.glass[2] * 3, f, S.alb[0] * f * 0.5, S.alb[1] * f * 0.5, S.alb[2] * f * 0.5);
        if (i % 3 === 1) {
          const sp = c.spots[i % c.spots.length], L = spotLight(c, sp, t + i * 0.05);
          V(BP, a[0], a[1], a[2], S.bio[0] * L, S.bio[1] * L, S.bio[2] * L, R * 0.25);
          // filets de pêche : de fins tentacules qui pendent de chaque cormidie
          const dn = [a[0] + Math.sin(t * 0.7 + i) * R * 0.3, a[1] - R * (1.5 + Math.sin(i * 1.7) * 0.5), a[2] + Math.cos(t * 0.6 + i) * R * 0.3];
          V(BL, a[0], a[1], a[2], S.glass[0], S.glass[1], S.glass[2], 0.6, S.alb[0] * 0.2, S.alb[1] * 0.2, S.alb[2] * 0.2);
          V(BL, dn[0], dn[1], dn[2], 0, 0, 0, 0, 0, 0, 0);
        }
      }
    }
    // pyrosome : un tube couvert de petits zooïdes
    function buildTube(c, t, B, R) {
      const S = c.S, L = R * S.H * 10, r0 = R * 1.6;
      const Pt = (u, v) => { const r = r0 * (0.85 + 0.15 * Math.sin(u * Math.PI)) * (u > 0.97 ? 0.8 : 1); return W3(c, B, Math.cos(v) * r, L * (0.5 - u), Math.sin(v) * r); };
      for (let i = 0; i < 24; i++) for (let j = 0; j < 36; j++) {
        const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]];
        for (const [a, b] of q) {
          const u = a / 24, v = (b / 36) * TAU, p = Pt(u, v), cen = W3(c, B, 0, L * (0.5 - u), 0);
          const nn = [p[0] - cen[0], p[1] - cen[1], p[2] - cen[2]], l = Math.hypot(...nn) || 1;
          V(BM, p[0], p[1], p[2], nn[0] / l, nn[1] / l, nn[2] / l, S.glass[0], S.glass[1], S.glass[2], 2, S.alb[0], S.alb[1], S.alb[2]);
        }
      }
      for (const sp of c.spots) { const L2 = spotLight(c, sp, t), p = Pt(sp.u, sp.v); if (L2 > 0.01) V(BP, p[0], p[1], p[2], S.bio[0] * L2, S.bio[1] * L2, S.bio[2] * L2, R * 0.35); }
    }

    /* ───────── nage et tentacules ───────── */
    let flowPush = [];
    function stepCreature(c, dt, t) {
      const S = c.S, R = S.R * c.sc, B = basis(c);
      const kPrev = pulse(c);
      c.ph += dt / S.T;
      const k = pulse(c);
      // poussée pendant la contraction, frottement de l'eau
      const thrust = Math.max(0, k - kPrev) * S.R * Math.sqrt(c.sc) * 7; // les grandes ne nagent pas proportionnellement plus vite
      for (let i = 0; i < 3; i++) c.v[i] += c.ax[i] * thrust;
      c.v[1] -= R * 0.05 * dt; // la créature est à peine plus dense que l'eau
      for (const f of flowPush) { const d = Math.hypot(c.p[0] - f.p[0], c.p[1] - f.p[1], c.p[2] - f.p[2]); if (d < f.r) for (let i = 0; i < 3; i++) c.v[i] += f.v[i] * dt * 2 * (1 - d / f.r); }
      for (let i = 0; i < 3; i++) { c.v[i] *= Math.exp(-dt * 1.6); c.p[i] += c.v[i] * dt; }
      // l'axe dérive lentement (on tourne la tête)
      c.tilt[0] += Math.sin(t * 0.13 + c.seed) * dt * 0.05; c.tilt[1] += Math.cos(t * 0.11 + c.seed * 2) * dt * 0.05;
      c.tilt[0] *= 1 - dt * 0.12; c.tilt[1] *= 1 - dt * 0.12;
      const ax = [Math.sin(c.tilt[0]), 1, Math.sin(c.tilt[1])], l = Math.hypot(...ax); c.ax = ax.map((q) => q / l);
      c.bio *= Math.exp(-dt / (S.bioKind === 'anneau' ? 4 : S.bioKind === 'vague' ? 3 : 1.6));
      // tentacules : chaînes de Verlet accrochées au bord de la cloche
      for (const tn of c.tents) {
        const [r, y] = tn.arm ? [tn.r0, 0] : prof(S, 1, k, tn.a);
        const anchor = W3(c, B, Math.cos(tn.a) * r * R, y * R, Math.sin(tn.a) * r * R);
        const seg = tn.L / tn.k;
        tn.pts[0] = anchor;
        for (let j = 1; j <= tn.k; j++) {
          const p = tn.pts[j], q = tn.prev[j];
          const nx = p[0] + (p[0] - q[0]) * 0.93, ny = p[1] + (p[1] - q[1]) * 0.93 - seg * 0.035, nz = p[2] + (p[2] - q[2]) * 0.93;
          tn.prev[j] = p.slice();
          tn.pts[j] = [nx + Math.sin(t * 1.3 + j * 0.4 + tn.a) * seg * 0.012, ny, nz + Math.cos(t * 1.1 + j * 0.3 + tn.a) * seg * 0.012];
          for (const f of flowPush) { const d = Math.hypot(nx - f.p[0], ny - f.p[1], nz - f.p[2]); if (d < f.r) for (let i = 0; i < 3; i++) tn.pts[j][i] += f.v[i] * dt * 0.5 * (1 - d / f.r); }
        }
        for (let it = 0; it < 2; it++) for (let j = 1; j <= tn.k; j++) {
          const a = tn.pts[j - 1], b = tn.pts[j], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], d = Math.hypot(dx, dy, dz) || 1, f = seg / d;
          const nb = [a[0] + dx * f, a[1] + dy * f, a[2] + dz * f], pr = tn.prev[j];
          for (let i = 0; i < 3; i++) pr[i] += (nb[i] - b[i]) * 0.6; // moins de coups de fouet
          tn.pts[j] = nb;
        }
      }
      if (c.stem) {
        const L = R * 26, n = c.stem.length - 1, seg = L / n;
        c.stem[0] = W3(c, B, 0, -R * 0.5, 0);
        for (let j = 1; j <= n; j++) {
          const p = c.stem[j], q = c.stemPrev[j];
          c.stemPrev[j] = p.slice();
          c.stem[j] = [p[0] + (p[0] - q[0]) * 0.92 + Math.sin(t * 0.5 + j * 0.15) * seg * 0.006, p[1] + (p[1] - q[1]) * 0.92 - seg * 0.03, p[2] + (p[2] - q[2]) * 0.92 + Math.cos(t * 0.4 + j * 0.12) * seg * 0.006];
        }
        // contrainte « suivre le meneur » sans injecter de vitesse (la correction est aussi appliquée à la position précédente)
        for (let j = 1; j <= n; j++) {
          const a = c.stem[j - 1], b = c.stem[j], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], d = Math.hypot(dx, dy, dz) || 1, f = seg / d;
          const nb = [a[0] + dx * f, a[1] + dy * f, a[2] + dz * f], pr = c.stemPrev[j];
          for (let i = 0; i < 3; i++) pr[i] += (nb[i] - b[i]) * 0.9;
          c.stem[j] = nb;
        }
      }
    }
    function trigger(c) { c.bio = 1; c.bioT = T; if (snd()) au.note(c.S.bioKind === 'alarme' ? 880 : 660, 1.2, 'sine', 0.03, c.S.bioKind === 'alarme' ? 1320 : 990); }

    /* ───────── portrait ───────── */
    let hero = null, cam = { az: 0.3, el: 0.12, tgt: [0, 0, 0] }, slideT = 0, snow = [];
    function setHero(key) {
      cfg.cur = key; slideT = 0; label = null;
      hero = create(key, 0, 0, 0, 1);
      for (let i = 0; i < 160; i++) { stepCreature(hero, 1 / 30, i / 30); recentre(hero); }
      frameBox = heroBox(hero); cam.tgt = frameBox.c.slice();
      if (Math.random() < 0.5 || key === 'aequorea' || key === 'praya') trigger(hero);
    }
    // boîte englobante réelle (cloche, tentacules, tige) : la caméra cadre ce qu'on voit vraiment
    function heroBox(c) {
      const R = c.S.R * c.sc; let x0 = c.p[0] - R, x1 = c.p[0] + R, y0 = c.p[1] - R, y1 = c.p[1] + R * Math.max(0.6, c.S.H * 1.2), z0 = c.p[2] - R, z1 = c.p[2] + R;
      const add = (q) => { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; if (q[2] < z0) z0 = q[2]; if (q[2] > z1) z1 = q[2]; };
      for (const tn of c.tents) for (const q of tn.pts) add(q);
      if (c.stem) for (let i = 0; i < c.stem.length * 0.4; i++) add(c.stem[i]); // la tige file hors champ : on cadre la tête
      if (c.S.profile === 'tube') { const L = R * c.S.H * 10, B = basis(c); add(W3(c, B, 0, L * 0.5 + R, 0)); add(W3(c, B, 0, -L * 0.5 - R, 0)); }
      if (c.S.profile === 'sack') { const B = basis(c); add(W3(c, B, 0, R * c.S.H * 0.55, 0)); add(W3(c, B, 0, -R * c.S.H * 0.5, 0)); }
      return { c: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], hw: Math.max(x1 - x0, z1 - z0) / 2, hh: (y1 - y0) / 2 };
    }
    let frameBox = null;
    function recentre(c) {
      const d = c.p.slice(), sh = (q) => { q[0] -= d[0]; q[1] -= d[1]; q[2] -= d[2]; };
      sh(c.p);
      for (const tn of c.tents) { for (const q of tn.pts) sh(q); for (const q of tn.prev) sh(q); }
      if (c.stem) { for (const q of c.stem) sh(q); for (const q of c.stemPrev) sh(q); }
      for (const sn of snow) sh(sn.p);
      for (const f of flowPush) sh(f.p);
    }
    function heroExtent() { const S = hero.S, R = S.R; if (S.profile === 'praya') return R * 14; if (S.profile === 'tube') return R * S.H * 7; if (S.profile === 'sack') return R * 2.6; return R * (1.2 + Math.max(S.tentL || 0, (S.armL || 0) * 0.7) * (S.longOne ? 1.4 : 0.9)); }
    function seedSnow(cx, cy, cz, size) { snow = []; for (let i = 0; i < 700; i++) snow.push({ p: [cx + rnd(size, -size), cy + rnd(size, -size), cz + rnd(size, -size)], s: rnd(1, 0.3), ph: rnd(TAU) }); }

    /* ───────── descente ───────── */
    // La jauge avance en temps accéléré (cfg.depth) ; l'image, elle, défile lentement (camY, en mètres « visuels »)
    // pour qu'on ait le temps de regarder chaque créature passer.
    let pop = [], schools = [], sparks = [], camY = 0, lastDepth = 0;
    const DSC = (k) => (k === 'pyrosoma' || k === 'praya' ? rnd(1.8, 1.2) : rnd(4, 2.6)); // créatures grossies
    const ZONES = [[0, 200, 'Zone éclairée (épipélagique)'], [200, 1000, 'Zone crépusculaire (mésopélagique)'], [1000, 4000, 'Zone de minuit (bathypélagique)'], [4000, 6000, 'Zone abyssale']];
    function zoneName(d) { const z = ZONES.find((q) => d >= q[0] && d < q[1]); return z ? z[2] : ZONES[3][2]; }
    function populate() {
      // les créatures vivent dans une tranche devant la caméra (z de 1 à 7 m), on les renouvelle en descendant
      const d = cfg.depth, cy = -camY;
      if (Math.abs(d - lastDepth) > 150) { pop = []; schools = []; } // saut de profondeur au curseur : autre faune
      const fresh = !pop.length;
      lastDepth = d;
      pop = pop.filter((c) => c.p[1] < cy + 4.5 && c.p[1] > cy - 5);
      const want = d < 150 ? 6 : d < 1000 ? 8 : d < 3000 ? 7 : 5;
      let guard = 0;
      while (pop.length < want && guard++ < 40) {
        // les nouvelles arrivent par le bas (on descend), sauf au premier remplissage
        const y = fresh || !pop.length ? cy + rnd(2.2, -3.2) : cy - rnd(4.6, 3.6);
        const cands = ORDER.filter((k) => d >= SPEC[k].zone[0] && d <= SPEC[k].zone[1]);
        if (!cands.length) break;
        const key = cands[rint(cands.length)];
        const c = create(key, rnd(2.4, -2.4), y, -rnd(4.5, 0.3), DSC(key));
        for (let i = 0; i < 40; i++) stepCreature(c, 1 / 30, i / 30);
        if (Math.random() < 0.15) trigger(c);
        pop.push(c);
      }
      // bancs de poissons-lanternes entre 200 et 1 500 m (ils remontent la nuit)
      schools = schools.filter((s) => s.y < cy + 6 && s.y > cy - 8 && Math.abs(s.x) < 9 && d < 1700);
      if (d > 150 && d < 1600 && schools.length < 2 && Math.random() < 0.02) {
        const s = { y: cy - rnd(2.5, -1.5), z: -rnd(5, 1.5), x: rnd(-6, -4), vx: rnd(0.5, 0.25) * (Math.random() < 0.5 ? 1 : -1), fish: [] };
        if (s.vx < 0) s.x = -s.x;
        for (let i = 0; i < 26; i++) s.fish.push([rnd(1.2, -1.2), rnd(0.5, -0.5), rnd(0.8, -0.8), rnd(TAU)]);
        schools.push(s);
      }
    }

    /* ───────── son ───────── */
    let drone = null;
    if (snd()) drone = au.drone(48, 'sine', 0);

    /* ───────── boucle ───────── */
    function update(dt) {
      const k = dt / 0.4;
      T += k;
      if (cfg.scene === 'portrait') {
        stepCreature(hero, k, T);
        // caméra embarquée : on suit la créature comme un robot sous-marin ; c'est l'eau (la neige) qui défile
        recentre(hero);
        const bx = heroBox(hero), fk = Math.min(1, k * 0.6);
        for (let i = 0; i < 3; i++) frameBox.c[i] += (bx.c[i] - frameBox.c[i]) * fk;
        frameBox.hw += (bx.hw - frameBox.hw) * fk; frameBox.hh += (bx.hh - frameBox.hh) * fk;
        cam.tgt = frameBox.c;
        cam.az += k * 0.05;
        if (Math.random() < k * 0.06) trigger(hero);
        if (cfg.slide && (slideT += k) > 45) setHero(ORDER[(ORDER.indexOf(cfg.cur) + 1) % ORDER.length]);
      } else {
        const go = cfg.descAuto && cfg.depth < 4500;
        if (go) { cfg.depth = Math.min(4500, cfg.depth + k * cfg.descSpeed * 6); camY += k * cfg.descSpeed * 0.3; }
        populate();
        const deep = clamp((cfg.depth - 150) / 700, 0, 1);
        for (const c of pop) { stepCreature(c, k, T); if (Math.random() < k * (0.02 + 0.06 * deep)) trigger(c); }
        for (const s of schools) { s.x += s.vx * k; for (const f of s.fish) f[3] += k * 6; }
        sparks = sparks.filter((p) => (p.life -= k) > 0);
        // le plancton (copépodes, dinoflagellés…) scintille quand on le dérange : plus on descend, plus on le voit
        const rate = deep * (14 + (go ? 40 * cfg.descSpeed : 0)) * k;
        for (let n = Math.floor(rate + Math.random()); n > 0; n--) {
          const z = -rnd(5, 0.3), y = -camY + rnd(2.6, -2.6) * (1 + -z * 0.25), l = rnd(1.2, 0.25);
          sparks.push({ p: [rnd(1, -1) * (1.6 - z * 0.55), y, z], life: l, l0: l, s: rnd(1, 0.4), g: Math.random() < 0.25 });
        }
      }
      // neige marine : elle tombe lentement
      for (const sn of snow) { sn.p[1] -= k * 0.004 * sn.s; sn.p[0] += Math.sin(T * 0.3 + sn.ph) * k * 0.002; }
      flowPush = flowPush.filter((f) => (f.t -= k) > 0);
      if (lampHold > 0) lampHold = Math.max(0, lampHold - k * 0.0);
      if (drone) drone.gain(0.02);
      if (label) label.t += k;
    }
    let VP = null, eye = [0, 0, 0];
    function render() {
      BM.n = BL.n = BP.n = 0;
      const v = view(), bare = env.decor === false, ink = bare && env.theme === 'light';
      const light = (cfg.lamp || lamping) ? 1 : 0;
      let fog, top, bot, rays = 0, amb = cfg.amb;
      if (cfg.scene === 'portrait') {
        const ext = heroExtent(), fb = frameBox, vw = v.w / H, th = Math.tan(0.45);
        // distance qui fait tenir la créature dans ~78 % de la hauteur et de la largeur visibles
        const dist = Math.max(fb.hh / (th * 0.78), fb.hw / (th * vw * 0.78)) + fb.hw;
        const tg = cam.tgt;
        eye = [tg[0] + Math.cos(cam.az) * Math.cos(cam.el) * dist, tg[1] + Math.sin(cam.el) * dist, tg[2] + Math.sin(cam.az) * Math.cos(cam.el) * dist];
        const shift = ((v.cx - W / 2) / W) * 2, S2 = new Float32Array(16); S2[0] = S2[5] = S2[10] = S2[15] = 1; S2[12] = shift;
        VP = mul(S2, mul(persp(0.9, W / H, dist * 0.05, dist * 6), lookAt(eye, tg, [0, 1, 0])));
        const sz = Math.max(fb.hh, fb.hw) * 2.5;
        if (!snow.length || !snow.sz || Math.abs(Math.log((sz * 100) / snow.sz)) > 0.4) { seedSnow(tg[0], tg[1], tg[2], sz); snow.sz = Math.round(sz * 100); }
        for (const sn of snow) for (let i = 0; i < 3; i++) { if (sn.p[i] > tg[i] + sz) sn.p[i] -= 2 * sz; else if (sn.p[i] < tg[i] - sz) sn.p[i] += 2 * sz; }
        buildCreature(hero, T, light);
        fog = 0.3 / dist; void ext; top = [0.004, 0.012, 0.03]; bot = [0, 0.002, 0.008];
      } else {
        const d = cfg.depth;
        eye = [0, -camY, 2.2];
        const shift = ((v.cx - W / 2) / W) * 2, S2 = new Float32Array(16); S2[0] = S2[5] = S2[10] = S2[15] = 1; S2[12] = shift;
        VP = mul(S2, mul(persp(0.95, W / H, 0.05, 40), lookAt(eye, [0, -camY - 0.2, -3], [0, 1, 0])));
        if (!snow.length || Math.abs(snow[0].p[1] + camY) > 10) seedSnow(0, -camY, -2, 4);
        for (const sn of snow) if (sn.p[1] > -camY + 4) sn.p[1] -= 8; else if (sn.p[1] < -camY - 4) sn.p[1] += 8;
        for (const c of pop) buildCreature(c, T, light);
        for (const s of schools) for (const f of s.fish) {
          // poisson-lanterne : une rangée de photophores bleus le long du ventre
          const x = s.x + f[0] * 1.6, y = s.y + f[1] * 1.6 + Math.sin(f[3] * 0.1) * 0.05, z = s.z + f[2], dir = Math.sign(s.vx);
          for (let i = 0; i < 6; i++) V(BP, x + dir * i * 0.028, y - 0.01, z, 0.25, 0.55, 1.0, 0.024);
          V(BP, x + dir * 0.17, y + 0.014, z, 0.35, 0.7, 1, 0.04);
        }
        for (const p of sparks) { const a2 = p.life / p.l0, k2 = Math.min(1, (1 - a2) * 8) * a2 * (p.s || 1); V(BP, p.p[0], p.p[1], p.p[2], (p.g ? 0.2 : 0.25) * k2, (p.g ? 1 : 0.7) * k2, (p.g ? 0.5 : 1) * k2, 0.025); }
        // lumière du jour : 1 % vers 200 m, plus rien vers 1 000 m
        const day = Math.exp(-d / 45);
        top = [0.02 + 0.25 * day, 0.08 + 0.45 * day, 0.16 + 0.6 * day].map((x) => x * (0.15 + 0.85 * Math.min(1, day * 6 + 0.02)));
        bot = top.map((x) => x * 0.25);
        if (d > 900) { top = [0.002, 0.005, 0.012]; bot = [0, 0.001, 0.004]; }
        rays = day; amb = cfg.amb * (0.3 + 3 * day);
        fog = 0.18 + 0.1 * day;
      }
      for (const sn of snow) V(BP, sn.p[0], sn.p[1], sn.p[2], 0.05 + 0.22 * light, 0.06 + 0.22 * light, 0.07 + 0.2 * light, (cfg.scene === 'portrait' ? Math.max(frameBox.hh, frameBox.hw) * 0.018 : 0.012) * sn.s);
      // passe additive dans la cible HDR
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb); gl.viewport(0, 0, A.w, A.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      const setU = (P) => { P.use(); gl.uniformMatrix4fv(gl.getUniformLocation(P.p, 'uVP'), false, VP); P.f('uEye', eye[0], eye[1], eye[2]).f('uFog', fog); };
      const ambCol = [0.25, 0.45, 0.8];
      setU(PM); PM.f('uAmb', amb * 0.25).f('uLamp', light * 0.32).f('uAmbCol', ...ambCol);
      gl.bindVertexArray(BM.vao); gl.bindBuffer(gl.ARRAY_BUFFER, BM.vbo); gl.bufferData(gl.ARRAY_BUFFER, BM.data.subarray(0, BM.n), gl.DYNAMIC_DRAW); gl.drawArrays(gl.TRIANGLES, 0, BM.n / BM.stride);
      setU(PL); PL.f('uAmb', amb * 0.25).f('uLamp', light * 0.45).f('uAmbCol', ...ambCol);
      gl.bindVertexArray(BL.vao); gl.bindBuffer(gl.ARRAY_BUFFER, BL.vbo); gl.bufferData(gl.ARRAY_BUFFER, BL.data.subarray(0, BL.n), gl.DYNAMIC_DRAW); gl.drawArrays(gl.LINES, 0, BL.n / BL.stride);
      setU(PP); PP.f('uPx', ch * 1.1);
      gl.bindVertexArray(BP.vao); gl.bindBuffer(gl.ARRAY_BUFFER, BP.vbo); gl.bufferData(gl.ARRAY_BUFFER, BP.data.subarray(0, BP.n), gl.DYNAMIC_DRAW); gl.drawArrays(gl.POINTS, 0, BP.n / BP.stride);
      gl.disable(gl.BLEND); gl.bindVertexArray(null);
      const blur = (src, tmp, dst) => { PB.use().t('uT', src).f('uDir', 1.5 / src.w, 0); K.run(PB, tmp); PB.use().t('uT', tmp).f('uDir', 0, 1.5 / tmp.h); K.run(PB, dst); };
      blur(A, b1t, b1); blur(b1, b2t, b2); blur(b2, b3t, b3);
      PC.use().t('uA', A).t('uB1', b1).t('uB2', b2).t('uB3', b3).f('uRes', cw, ch).f('uTop', ...top).f('uBot', ...bot).f('uRays', rays).f('uT', T).f('uBloom', cfg.bloom).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uExpo', 1.6);
      K.run(PC, null);
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      hud(ink);
      drawLabel();
    }
    function hud(ink) {
      const v = view();
      ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink ? 'rgba(40,30,80,.75)' : 'rgba(200,225,255,.6)';
      if (cfg.scene === 'portrait') {
        const S = hero.S;
        ctx.font = 'italic 500 20px "Space Grotesk", sans-serif'; ctx.fillStyle = ink ? 'rgba(30,24,50,.85)' : 'rgba(235,245,255,.85)'; ctx.fillText(S.nom, v.x0 + 22, H - 44);
        ctx.font = '500 10.5px "JetBrains Mono", monospace'; ctx.fillStyle = ink ? 'rgba(40,30,80,.7)' : 'rgba(160,200,255,.65)'; ctx.fillText((S.fr + ' · ' + S.prof).toUpperCase(), v.x0 + 22, H - 24);
      } else {
        // jauge de profondeur
        const d = cfg.depth, x = v.x0 + 26, y0 = H * 0.12, y1 = H * 0.86, f = (dd) => y0 + (y1 - y0) * Math.sqrt(Math.min(1, dd / 4500));
        ctx.strokeStyle = ink ? 'rgba(40,30,80,.4)' : 'rgba(160,200,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
        for (const [a, , nm] of ZONES) { if (a > 4500) continue; const yy = f(a); ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.lineTo(x + 4, yy); ctx.stroke(); ctx.fillText(a + ' m', x + 8, yy + 4); void nm; }
        ctx.fillStyle = ink ? '#4a3a6a' : '#9fd8ff'; ctx.beginPath(); ctx.arc(x, f(d), 4, 0, TAU); ctx.fill();
        ctx.fillStyle = ink ? 'rgba(40,30,80,.8)' : 'rgba(220,235,255,.75)';
        ctx.fillText(`${Math.round(d).toLocaleString('fr-FR')} M · ${zoneName(d).toUpperCase()} · LUMIÈRE DU JOUR ${d < 1000 ? (Math.exp(-d / 45) * 100 < 0.01 ? '< 0,01' : fr(Math.exp(-d / 45) * 100, 2)) + ' %' : 'AUCUNE'}`, v.x0 + 16, H - 16);
      }
      ctx.restore();
    }
    let pending = false;
    function frame(t, dt) {
      if (dt > 0) update(dt);
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    /* ───────── désignation ───────── */
    function nearest(x, y) {
      const list = cfg.scene === 'portrait' ? [hero] : pop;
      let best = null, bd = 1e9;
      for (const c of list) {
        const q = proj(VP, c.p[0], c.p[1] - c.S.R * c.sc * 0.5, c.p[2]); if (q[2] <= 0) continue;
        const sx = ((q[0] + 1) / 2) * W, sy = ((1 - q[1]) / 2) * H, d = Math.hypot(sx - x, sy - y);
        const rad = Math.max(30, (c.S.R * c.sc * 3 * H) / q[2]);
        if (d < rad && d < bd) { bd = d; best = c; }
      }
      return best;
    }
    function drawLabel() {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (7 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      const c = label.c, v = view();
      const name = c ? c.S.nom : 'Eau', role = c ? `${c.S.fr} · ${c.S.prof}` : `neige marine · ${cfg.scene === 'portrait' ? 'débris qui tombent de la surface' : Math.round(cfg.depth) + ' m'}`;
      const side = label.x > v.x0 + v.w * 0.5 ? -1 : 1, lx = label.x + side * 40, ly = label.y < 70 ? label.y + 46 : label.y - 36;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(label.x, label.y, 11, 0, TAU); ctx.stroke();
      ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6; ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = 'rgba(250,250,245,.96)'; ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(name, lx, ly);
      ctx.fillStyle = '#9fd8ff'; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    function setScene(id) {
      cfg.scene = id; label = null; snow = [];
      if (id === 'portrait') setHero(cfg.cur);
      else { pop = []; schools = []; cfg.depth = cfg.depth > 4400 ? 0 : cfg.depth; populate(); }
    }
    if (window.FASC_DEBUG) window.FASC_DEBUG.aby = { cfg, setScene, setHero, trigger: () => trigger(hero), run(n, h) { for (let i = 0; i < n; i++) update(h); render(); }, get pop() { return pop; }, get hero() { return hero; }, get box() { return frameBox; }, heroBox, get eye() { return eye; } };

    setScene('portrait');
    let lamping = false, drag = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool;
        drag = { x: p.x, y: p.y };
        if (tool === 'observer') { label = { x: p.x, y: p.y, t: 0, c: nearest(p.x, p.y) }; return; }
        if (tool === 'lampe') { lamping = true; return; }
        if (tool === 'toucher') {
          const c = nearest(p.x, p.y); if (c) trigger(c);
          if (cfg.scene === 'descente') for (let i = 0; i < 40; i++) sparks.push({ p: [eye[0] + ((p.x / W) * 2 - 1) * 1.5 + rnd(0.3, -0.3), eye[1] - ((p.y / H) * 2 - 1) * 1.0 + rnd(0.3, -0.3), eye[2] - rnd(2, 0.6)], life: rnd(1.5, 0.5), l0: 1.5, s: 1.4 });
        }
      },
      move(p) {
        if (!p.down || !drag) return;
        if (env.tool === 'courant') {
          const tgt = cfg.scene === 'portrait' ? cam.tgt : [0, -camY, -3], sc = cfg.scene === 'portrait' ? heroExtent() / H * 2.5 : 3 / H;
          flowPush.push({ p: [tgt[0] + (p.x - W / 2) * sc, tgt[1] - (p.y - H / 2) * sc, tgt[2]], v: [p.dx * sc * 30, -p.dy * sc * 30, 0], r: cfg.scene === 'portrait' ? heroExtent() : 1.5, t: 0.4 });
          if (cfg.scene === 'portrait') cam.az -= p.dx * 0.002;
        }
      },
      up() { drag = null; lamping = false; },
      clear() { if (cfg.scene === 'portrait') setHero(cfg.cur); else { cfg.depth = 0; pop = []; } },
      dispose() { if (drone) drone.stop(); K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: [
          { label: 'Portraits', act: () => setScene('portrait') },
          { label: 'La descente', act: () => setScene('descente') },
        ] });
        if (cfg.scene === 'portrait') {
          const S = SPEC[cfg.cur];
          L.push({ type: 'section', label: 'Portrait' });
          L.push({ type: 'choice', label: 'Créature', value: cfg.cur, set: (x) => setHero(x), options: ORDER.map((k) => ({ id: k, label: SPEC[k].nom.split(' ')[0] })) });
          L.push({ type: 'note', text: `${S.nom} · ${S.fr} · ${S.prof}. ${S.why}` });
          L.push({ type: 'buttons', items: [
            { label: '‹ Précédente', act: () => setHero(ORDER[(ORDER.indexOf(cfg.cur) + ORDER.length - 1) % ORDER.length]) },
            { label: 'Allumer sa lumière', act: () => trigger(hero) },
            { label: 'Suivante ›', act: () => setHero(ORDER[(ORDER.indexOf(cfg.cur) + 1) % ORDER.length]) },
          ] });
          L.push({ type: 'toggle', label: 'Diaporama (une créature toutes les 45 s)', value: cfg.slide, set: (x) => { cfg.slide = x; slideT = 0; } });
        } else {
          L.push({ type: 'section', label: 'Descente' });
          L.push({ type: 'bar', label: 'Profondeur', color: '#9fd8ff', value: clamp(cfg.depth / 4500, 0, 1), txt: Math.round(cfg.depth).toLocaleString('fr-FR') + ' m' });
          L.push({ type: 'note', text: zoneName(cfg.depth) + '. ' + (cfg.depth < 200 ? 'La lumière du soleil suffit encore à la photosynthèse.' : cfg.depth < 1000 ? 'Une lueur bleue de plus en plus faible ; les animaux s’y cachent en s’éclairant le ventre.' : 'Plus aucune lumière du soleil : seules les créatures éclairent.') });
          L.push({ type: 'toggle', label: 'Descendre tout seul', value: cfg.descAuto, set: (x) => { cfg.descAuto = x; } });
          L.push({ type: 'slider', label: 'Profondeur', min: 0, max: 4500, step: 10, value: cfg.depth, fmt: (x) => Math.round(x).toLocaleString('fr-FR') + ' m', set: (x) => { cfg.depth = x; cfg.descAuto = false; } });
          if (cfg.descAuto) L.push({ type: 'slider', label: 'Vitesse de descente (accélérée)', min: 0.2, max: 4, step: 0.01, value: cfg.descSpeed, fmt: (x) => '×' + fr(x, 1), set: (x) => { cfg.descSpeed = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Remonter à la surface', act: () => { cfg.depth = 0; pop = []; } }] });
        }
        L.push({ type: 'section', label: 'Lumière' });
        L.push({ type: 'toggle', label: 'Lampe du plongeur (vraies couleurs)', value: cfg.lamp, set: (x) => { cfg.lamp = x; } });
        L.push({ type: 'slider', label: 'Lueur ambiante', min: 0, max: 1.5, step: 0.01, value: cfg.amb, fmt: (x) => (x < 0.05 ? 'noir total' : Math.round(x * 100) + ' %'), set: (x) => { cfg.amb = x; } });
        L.push({ type: 'slider', label: 'Halo', min: 0, max: 2, step: 0.01, value: cfg.bloom, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.bloom = x; } });
        return L;
      },
    };
  }
})();
