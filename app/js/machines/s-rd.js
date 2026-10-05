/* Fascinations — Les Motifs de Turing · réaction-diffusion de Gray-Scott (WebGL2)
   Deux substances : U (le « nourriture ») et V (le « catalyseur ») ; V se nourrit de U (U + 2V → 3V), U est
   réapprovisionné au taux f, V disparaît au taux f + k ; U diffuse deux fois plus vite que V.
   ∂u/∂t = Du ∇²u − uv² + f(1−u) ;  ∂v/∂t = Dv ∇²v + uv² − (f+k)v. Selon (f, k) : taches, rayures, labyrinthes,
   coraux, vers, solitons qui se divisent… Calcul en flottants 32 bits sur la carte graphique (les demi-flottants
   ne suffisent pas : les incréments sont de l'ordre de 10⁻⁴). Rendu en relief éclairé. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { clamp, rnd } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 3) => x.toFixed(d).replace('.', ',');

  const PRESETS = [
    { id: 'corail', label: 'Corail', f: 0.0545, k: 0.062, pal: 'corail', why: 'des branches qui poussent et se ramifient, comme un corail ou un lichen' },
    { id: 'mitose', label: 'Mitose', f: 0.0367, k: 0.0649, pal: 'nacre', why: 'des taches qui grossissent puis se divisent en deux, comme des cellules' },
    { id: 'labyrinthe', label: 'Labyrinthe', f: 0.029, k: 0.057, pal: 'encre', why: 'des rayures qui se replient en labyrinthe : l’empreinte digitale, le corail cerveau' },
    { id: 'vers', label: 'Vers', f: 0.078, k: 0.061, pal: 'ambre', why: 'des segments qui s’allongent sans jamais se toucher' },
    { id: 'trous', label: 'Bulles', f: 0.039, k: 0.058, pal: 'nacre', why: 'le négatif des taches : un réseau percé de trous' },
    { id: 'solitons', label: 'Solitons', f: 0.062, k: 0.0609, pal: 'neon', why: 'des points qui se déplacent, rebondissent et se reproduisent (le « U-skate world » de Robert Munafo)' },
    { id: 'ondes', label: 'Ondes', f: 0.014, k: 0.045, pal: 'neon', why: 'des fronts qui se poursuivent et se détruisent en se rencontrant' },
    { id: 'pulsar', label: 'Pulsations', f: 0.025, k: 0.06, pal: 'corail', why: 'des taches qui naissent, enflent et meurent sans cesse : le régime chaotique' },
  ];
  const COATS = {
    zebre: { label: 'Zèbre', f: 0.029, k: 0.057, aniso: 0.18, why: 'des rayures orientées : la diffusion est plus rapide dans une direction, qui tourne doucement le long du corps' },
    guepard: { label: 'Guépard', f: 0.0367, k: 0.0649, aniso: 1, why: 'des taches pleines, régulièrement espacées' },
    leopard: { label: 'Léopard', f: 0.034, k: 0.0625, aniso: 1, why: 'des rosettes : ici, le pourtour des taches seulement est foncé' },
    poisson: { label: 'Poisson-ange', f: 0.03, k: 0.0565, aniso: 0.35, why: 'des rayures qui se dédoublent quand le poisson grandit (Kondo et Asai, 1995)' },
  };
  const keep = { scene: 'galerie', cur: 0, auto: true, pal: 'auto', bump: 1, coat: 'zebre', f: 0.0545, k: 0.062, brush: 'semer', graft: 1, res: 1 };

  /* ───────── shaders ───────── */
  const FS_SEED = HEAD + `
uniform vec2 uN; uniform float uSeed, uDens;
out vec4 o;
void main(){
  vec2 p = gl_FragCoord.xy; float v = 0.;
  vec2 c = floor(p / 9.); float h = hash12(c + uSeed);
  if (h < uDens) v = .5 + .4 * hash12(c * 1.7 + uSeed);
  float n = hash12(p + uSeed * 3.1) * .02;
  o = vec4(1. - v * .5, v + n, 0., 1.);
}`;
  const FS_STEP = HEAD + `
uniform sampler2D uS, uM; uniform vec2 uFK; uniform int uMode; uniform float uAniso, uDt;
out vec4 o;
ivec2 sz;
vec2 T(ivec2 p){ p = (p + sz) % sz; return texelFetch(uS, p, 0).xy; }
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy); sz = textureSize(uS, 0);
  vec2 c = T(p);
  vec2 lap;
  if (uAniso >= .999) {
    lap = .2 * (T(p + ivec2(1, 0)) + T(p - ivec2(1, 0)) + T(p + ivec2(0, 1)) + T(p - ivec2(0, 1)))
        + .05 * (T(p + ivec2(1, 1)) + T(p + ivec2(-1, 1)) + T(p + ivec2(1, -1)) + T(p - ivec2(1, 1))) - c;
  } else {
    // diffusion anisotrope : tenseur D = R diag(1, a) Rᵀ, dont la direction tourne doucement (champ de bruit)
    float th = texelFetch(uM, p, 0).w;                            // direction précalculée (champ de bruit)
    float cs = cos(th), sn = sin(th), a = uAniso;
    float dxx = cs * cs + a * sn * sn, dyy = sn * sn + a * cs * cs, dxy = (1. - a) * cs * sn;
    vec2 uxx = T(p + ivec2(1, 0)) + T(p - ivec2(1, 0)) - 2. * c, uyy = T(p + ivec2(0, 1)) + T(p - ivec2(0, 1)) - 2. * c;
    vec2 uxy = (T(p + ivec2(1, 1)) - T(p + ivec2(1, -1)) - T(p + ivec2(-1, 1)) + T(p - ivec2(1, 1))) * .25;
    lap = (dxx * uxx + dyy * uyy + 2. * dxy * uxy) * .3; // même échelle que le noyau isotrope (0,3 ∇²)
  }
  vec2 fk = uFK;
  if (uMode == 1){ vec2 u = (vec2(p) + .5) / vec2(sz); float f = mix(.008, .085, u.y); fk = vec2(f, sqrt(f) * .5 - f + .0005 + (u.x - .5) * .012); } // l'atlas suit la frontière fertile
  else { vec4 m = texelFetch(uM, p, 0); fk = mix(fk, m.xy, m.z); }
  float u = c.x, v = c.y, uvv = u * v * v;
  u += uDt * (1.0 * lap.x - uvv + fk.x * (1. - u));
  v += uDt * (.5 * lap.y + uvv - (fk.x + fk.y) * v);
  o = vec4(clamp(u, 0., 1.), clamp(v, 0., 1.), 0., 1.);
}`;
  const FS_ANG = HEAD + `
uniform vec2 uN; uniform float uTw, uSeed;
out vec4 o;
void main(){ vec2 q = gl_FragCoord.xy / uN; o = vec4(0., 0., 0., uTw * (fbm(q * 2.3 + uSeed) - .5) * 6.2832 + .4); }`;
  const FS_BRUSH = HEAD + `
uniform sampler2D uS; uniform vec2 uA, uB; uniform float uR, uKind, uSeed;
out vec4 o;
void main(){
  vec2 p = gl_FragCoord.xy; vec4 s = texelFetch(uS, ivec2(p), 0);
  vec2 ab = uB - uA; float t = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-6), 0., 1.), d = length(p - uA - ab * t);
  if (d < uR){
    if (uKind < .5){ if (hash12(floor(p / 3.) + uSeed) < .5) s.xy = vec2(.5, .25 + .1 * hash12(p)); }
    else s.xy = vec2(1., 0.);
  }
  o = s;
}`;
  const FS_GRAFT = HEAD + `
uniform sampler2D uM; uniform vec2 uA, uB, uFK; uniform float uR;
out vec4 o;
void main(){
  vec2 p = gl_FragCoord.xy; vec4 m = texelFetch(uM, ivec2(p), 0);
  vec2 ab = uB - uA; float t = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-6), 0., 1.), d = length(p - uA - ab * t);
  float w = smoothstep(uR, uR * .5, d);
  if (w > 0.){ m.xy = mix(m.z > 0. ? m.xy : uFK, uFK, w); m.z = max(m.z, w); }
  o = m;
}`;
  const FS_VIEW = HEAD + `
uniform sampler2D uS; uniform vec2 uRes; uniform float uBump, uPal, uInk, uCoat, uT;
out vec4 o;
float V(vec2 g){ vec2 sz = vec2(textureSize(uS, 0)); g = g - .5; vec2 i = floor(g), f = fract(g);
  ivec2 a = (ivec2(i) + ivec2(sz)) % ivec2(sz), b = (a + ivec2(1, 0)) % ivec2(sz), c = (a + ivec2(0, 1)) % ivec2(sz), d = (a + ivec2(1, 1)) % ivec2(sz);
  return mix(mix(texelFetch(uS, a, 0).y, texelFetch(uS, b, 0).y, f.x), mix(texelFetch(uS, c, 0).y, texelFetch(uS, d, 0).y, f.x), f.y); }
vec3 ramp(float t, vec3 a, vec3 b, vec3 c, vec3 d){ t = clamp(t, 0., 1.); return t < .33 ? mix(a, b, t / .33) : t < .66 ? mix(b, c, (t - .33) / .33) : mix(c, d, (t - .66) / .34); }
void main(){
  vec2 sz = vec2(textureSize(uS, 0)); vec2 g = gl_FragCoord.xy / uRes * sz;
  float v = V(g), e = .75;
  float vx = V(g + vec2(e, 0.)) - V(g - vec2(e, 0.)), vy = V(g + vec2(0., e)) - V(g - vec2(0., e));
  vec3 n = normalize(vec3(-vx * 6. * uBump, -vy * 6. * uBump, 1.));
  vec3 L = normalize(vec3(-.45, .55, .75)), H = normalize(L + vec3(0., 0., 1.));
  float dif = max(dot(n, L), 0.), spe = pow(max(dot(n, H), 0.), 48.), t = smoothstep(.08, .42, v);
  vec3 base, col;
  int P = int(uPal + .5);
  if (uCoat > .5){
    int C = int(uCoat + .5); float fur = .92 + .08 * hash12(floor(g * 2.3)) + .05 * sin(g.x * 1.7 + g.y * 2.9);
    if (C == 1) base = mix(vec3(.96, .94, .9), vec3(.05, .05, .06), smoothstep(.17, .24, v));                 // zèbre
    else if (C == 2) base = mix(vec3(.86, .66, .36), vec3(.12, .08, .05), smoothstep(.2, .27, v));            // guépard
    else if (C == 3){ float ring = smoothstep(.09, .14, v) * (1. - smoothstep(.24, .3, v));                    // léopard : rosettes
      base = mix(mix(vec3(.88, .68, .38), vec3(.66, .43, .2), smoothstep(.25, .35, v)), vec3(.13, .09, .06), ring); }
    else base = mix(vec3(.12, .25, .7), vec3(1., .85, .2), smoothstep(.17, .24, v));                            // poisson-ange
    col = base * fur * (.75 + .3 * dif) + spe * .06;
  } else {
    if (P == 0) base = ramp(t, vec3(.02, .03, .08), vec3(.42, .1, .3), vec3(1., .45, .4), vec3(1., .9, .75));       // corail
    else if (P == 1) base = .5 + .5 * cos(6.2832 * (vec3(0., .33, .67) + t * .8 + n.x * .6 + n.y * .4)) * vec3(.9, .8, .9); // nacre
    else if (P == 2) base = ramp(t, vec3(.95, .93, .88), vec3(.7, .66, .6), vec3(.2, .18, .22), vec3(.05, .04, .06)); // encre
    else if (P == 3) base = ramp(t, vec3(.04, .02, .01), vec3(.45, .2, .03), vec3(.95, .6, .15), vec3(1., .95, .7)); // ambre
    else base = ramp(t, vec3(.0, .0, .03), vec3(.05, .2, .45), vec3(.2, .9, .95), vec3(.95, 1., 1.));              // néon
    if (P == 1) base *= .25 + .75 * t;
    col = base * (.45 + .7 * dif) + spe * (P == 2 ? .15 : .55) * (.3 + t);
    if (P == 4) col += base * t * .4;
  }
  if (uInk > .5 && uCoat < .5 && P != 2) col = mix(vec3(.955, .94, .91), col, .25 + .75 * t);
  o = vec4(pow(col, vec3(.95)), 1.);
}`;

  window.FASC.push({
    id: 'rd', name: 'Les Motifs de Turing', cat: 'Motifs', glyph: '⚯', smoothTime: true,
    blurb: 'Deux substances qui réagissent et diffusent dessinent des peaux',
    hint: 'Semez du catalyseur au doigt. Atlas : touchez un endroit pour adopter ses lois.',
    intro: 'En 1952, Alan Turing propose qu’une simple réaction chimique entre deux substances qui diffusent à des vitesses différentes suffit à faire naître des taches et des rayures à partir d’un mélange uniforme. Soixante-dix ans plus tard, on lui donne raison pour les doigts des embryons, les rayures des poissons et les poils du chat. Ici, le modèle de Gray-Scott : deux nombres, f et k, et tout un bestiaire.',
    about: [
      'Le modèle de Gray et Scott (1984) : une substance U est versée en continu (taux f), une substance V la consomme pour se reproduire (U + 2V → 3V) et disparaît d’elle-même (taux k). U diffuse deux fois plus vite que V. L’activateur agit localement, l’inhibition (le manque de U) se propage plus loin : c’est le principe d’« activation locale, inhibition à longue portée » de Turing (et de Gierer et Meinhardt, 1972).',
      'John Pearson a cartographié en 1993 les comportements selon f et k, et leur a donné des lettres grecques : α, β, γ… L’« Atlas » montre toute cette carte d’un coup : f augmente vers le haut, k vers la droite.',
      'Dans le vivant : les rayures du poisson-zèbre et du poisson-ange (Kondo et Asai, 1995, qui ont vu les rayures du poisson-ange se dédoubler à mesure qu’il grandit, comme le prédit le modèle), l’espacement des doigts (Raspopovic et coll., 2014), des plumes, des poils, des crêtes du palais. Les pelages proposés ici sont des imitations : les vrais mécanismes passent souvent par des cellules qui migrent, pas seulement par des molécules.',
      'Turing a publié cet article, « The Chemical Basis of Morphogenesis », deux ans avant sa mort. C’est l’un des articles les plus cités de toute la biologie théorique.',
    ],
    tools: [
      { id: 'semer', label: 'semer', desc: 'Semez du catalyseur V : un motif naît là où vous passez.' },
      { id: 'effacer', label: 'effacer', desc: 'Remettez le milieu à neuf.' },
      { id: 'greffer', label: 'greffer', desc: 'Peignez les lois d’un autre motif : deux mondes voisins, et leur frontière.' },
    ],
    make(env) {
      try { return makeRD(env); } catch (e) {
        console.warn('Motifs de Turing : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#05050a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Les Motifs de Turing demandent WebGL2 avec textures flottantes.', 20, env.h / 2); } };
      }
    },
  });

  function makeRD(env) {
    const ctx = env.ctx, W = env.w, H = env.h;
    const dpr = Math.min(1.5, env.dpr || 1), cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    const K = GLKit(cw, ch), gl = K.gl;
    if (!K.full) throw new Error('flottants 32 bits indisponibles');
    const PANG = K.program(FS_ANG), PSEED = K.program(FS_SEED), PSTEP = K.program(FS_STEP), PBR = K.program(FS_BRUSH), PGR = K.program(FS_GRAFT), PVIEW = K.program(FS_VIEW);
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const ink = () => env.theme === 'light';
    let T = 0, GW = 0, GH = 0, S = null, M = null, toast = null, holdT = 0, from = null, morph = 1;
    const say = (s) => { toast = { s, t: T }; };

    function setup() {
      const cell = keep.scene === 'pelage' ? (keep.coat === 'leopard' ? 2.6 : 1.8) : 2.1;
      GW = Math.round(W / cell); GH = Math.round(H / cell);
      S = K.double(GW, GH, 'f32', gl.NEAREST); M = K.double(GW, GH, 'f32', gl.NEAREST);
      K.clear(M.r); K.clear(M.w);
      PANG.use().f('uN', GW, GH).f('uTw', keep.coat === 'zebre' ? 1 : 0.35).f('uSeed', rnd(50)); K.run(PANG, M.w); M.swap();
      seed(0.06);
    }
    function seed(dens) { PSEED.use().f('uN', GW, GH).f('uSeed', rnd(100)).f('uDens', dens); K.run(PSEED, S.w); S.swap(); }
    function params() {
      if (keep.scene === 'pelage') { const c = COATS[keep.coat]; return [c.f, c.k]; }
      if (keep.scene === 'labo') return [keep.f, keep.k];
      const p = PRESETS[keep.cur];
      if (from && morph < 1) { const e = morph * morph * (3 - 2 * morph); return [from[0] + (p.f - from[0]) * e, from[1] + (p.k - from[1]) * e]; }
      return [p.f, p.k];
    }
    function steps(n) {
      const [f, k] = params(), aniso = keep.scene === 'pelage' ? COATS[keep.coat].aniso : 1;
      PSTEP.use().f('uFK', f, k).i('uMode', keep.scene === 'atlas' ? 1 : 0).f('uAniso', aniso).f('uDt', 1);
      for (let i = 0; i < n; i++) { PSTEP.use().t('uS', S.r).t('uM', M.r); K.run(PSTEP, S.w); S.swap(); }
    }
    function goPreset(i, smooth) {
      const old = params(); keep.cur = (i + PRESETS.length) % PRESETS.length; holdT = 0;
      if (smooth) { from = old; morph = 0; } else { from = null; morph = 1; seed(PRESETS[keep.cur].id === 'corail' ? 0.01 : 0.06); }
      say(PRESETS[keep.cur].label + ' : ' + PRESETS[keep.cur].why);
    }
    function setScene(id) {
      keep.scene = id; setup(); holdT = 0; from = null; morph = 1;
      if (id === 'atlas') { seed(0.25); say('f augmente vers le haut, k vers la droite. Touchez un motif pour l’adopter.'); }
      if (id === 'pelage') { seed(0.12); say(COATS[keep.coat].label + ' : ' + COATS[keep.coat].why); }
      if (id === 'labo') { seed(0); say('Semez au doigt.'); }
    }
    function update(k) {
      T += k;
      const n = clamp(Math.round(k * 60 * 18), 1, 60);
      steps(n);
      if (keep.scene === 'galerie') {
        if (morph < 1) morph = Math.min(1, morph + k / 10);
        if (keep.auto && (holdT += k) > 50) goPreset(keep.cur + 1, true);
      }
    }
    function pal() {
      const names = ['corail', 'nacre', 'encre', 'ambre', 'neon'];
      const p = keep.pal !== 'auto' ? keep.pal : keep.scene === 'galerie' ? PRESETS[keep.cur].pal : keep.scene === 'atlas' ? 'nacre' : 'corail';
      return names.indexOf(ink() && keep.pal === 'auto' && p === 'neon' ? 'encre' : p);
    }
    function render() {
      const coat = keep.scene === 'pelage' ? ['zebre', 'guepard', 'leopard', 'poisson'].indexOf(keep.coat) + 1 : 0;
      PVIEW.use().t('uS', S.r).f('uRes', cw, ch).f('uBump', keep.bump).f('uPal', pal()).f('uInk', ink() ? 1 : 0).f('uCoat', coat).f('uT', T);
      K.run(PVIEW, null);
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      hud();
    }
    function hud() {
      const v = view(), dark = !ink();
      ctx.font = '500 11px "JetBrains Mono", monospace';
      const tag = (s, x, y) => { const w = ctx.measureText(s).width + 16; ctx.fillStyle = dark ? 'rgba(6,6,12,.6)' : 'rgba(255,255,255,.7)'; ctx.fillRect(x - 8, y - 14, w, 20); ctx.fillStyle = dark ? 'rgba(235,230,255,.85)' : 'rgba(40,30,60,.85)'; ctx.fillText(s, x, y); };
      const [f, k] = params();
      if (keep.scene === 'atlas') {
        for (const [ff, y] of [[0.02, 0], [0.04, 0], [0.06, 0], [0.08, 0]]) { const yy = H - ((ff - 0.008) / 0.077) * H; tag('f ' + fr(ff, 2), v.x0 + 14, yy + 4); void y; }
        tag('← k PLUS PETIT · k PLUS GRAND →  (k SUIT LA FRONTIÈRE OÙ LES MOTIFS EXISTENT)', v.cx - 230, H - 18);
      } else tag(`${keep.scene === 'pelage' ? COATS[keep.coat].label.toUpperCase() : keep.scene === 'galerie' ? PRESETS[keep.cur].label.toUpperCase() : 'LABORATOIRE'} · f = ${fr(f, 4)} · k = ${fr(k, 4)}`, v.x0 + 18, H - 18);
      if (toast && T - toast.t < 6) { ctx.globalAlpha = Math.min(1, (6 - (T - toast.t)) * 1.2); ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; const w = ctx.measureText(toast.s).width; ctx.fillStyle = dark ? 'rgba(6,6,12,.55)' : 'rgba(255,255,255,.75)'; ctx.fillRect(v.cx - w / 2 - 12, 52, w + 24, 28); ctx.fillStyle = dark ? '#fff' : '#2a2238'; ctx.textAlign = 'center'; ctx.fillText(toast.s, v.cx, 71); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    }

    setScene(keep.scene);
    if (window.FASC_DEBUG) window.FASC_DEBUG.rd = { keep, setScene, goPreset, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); } };

    let last = null;
    const g = (x, y) => [(x / W) * GW, ((H - y) / H) * GH];
    function brush(x0, y0, x1, y1) {
      const a = g(x0, y0), b = g(x1, y1), tool = env.tool || 'semer', R = Math.max(4, 16 / 2.1);
      if (tool === 'greffer' && keep.scene !== 'atlas') {
        const p = PRESETS[(keep.cur + keep.graft) % PRESETS.length];
        PGR.use().t('uM', M.r).f('uA', ...a).f('uB', ...b).f('uFK', p.f, p.k).f('uR', R * 2.5); K.run(PGR, M.w); M.swap();
        PBR.use().t('uS', S.r).f('uA', ...a).f('uB', ...b).f('uR', R).f('uKind', 0).f('uSeed', rnd(100)); K.run(PBR, S.w); S.swap();
      } else { PBR.use().t('uS', S.r).f('uA', ...a).f('uB', ...b).f('uR', tool === 'effacer' ? R * 2 : R).f('uKind', tool === 'effacer' ? 1 : 0).f('uSeed', rnd(100)); K.run(PBR, S.w); S.swap(); }
    }
    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) {
        last = { x: p.x, y: p.y };
        if (keep.scene === 'atlas' && (env.tool || 'semer') === 'semer') {
          const fx = 0.008 + (1 - p.y / H) * 0.077, kx = Math.sqrt(fx) * 0.5 - fx + 0.0005 + (p.x / W - 0.5) * 0.012;
          keep.f = fx; keep.k = kx; say(`f = ${fr(fx, 4)}, k = ${fr(kx, 4)} : on passe au laboratoire avec ces lois.`);
          const tt = T; keep.scene = 'labo'; setup(); seed(0.08); toast = { s: `Laboratoire : f = ${fr(fx, 4)}, k = ${fr(kx, 4)}`, t: tt };
          return;
        }
        brush(p.x, p.y, p.x, p.y);
      },
      move(p) { if (!p.down || !last) return; brush(last.x, last.y, p.x, p.y); last = { x: p.x, y: p.y }; },
      up() { last = null; },
      clear() { setup(); if (keep.scene === 'labo') seed(0); },
      dispose() { K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'Galerie', act: () => setScene('galerie') },
          { label: 'Atlas', act: () => setScene('atlas') },
        ] }, { type: 'buttons', items: [
          { label: 'Pelages', act: () => setScene('pelage') },
          { label: 'Laboratoire', act: () => setScene('labo') },
        ] }];
        if (keep.scene === 'galerie') {
          L.push({ type: 'section', label: 'Galerie' });
          L.push({ type: 'choice', label: 'Motif', value: PRESETS[keep.cur].id, set: (x) => goPreset(PRESETS.findIndex((p) => p.id === x), true), options: PRESETS.map((p) => ({ id: p.id, label: p.label })) });
          L.push({ type: 'note', text: PRESETS[keep.cur].label + ' : ' + PRESETS[keep.cur].why + '.' });
          L.push({ type: 'toggle', label: 'Métamorphoses (un motif toutes les 50 s)', value: keep.auto, set: (x) => { keep.auto = x; holdT = 0; } });
          L.push({ type: 'buttons', items: [{ label: 'Repartir de zéro', act: () => goPreset(keep.cur, false) }] });
          L.push({ type: 'note', text: 'Les métamorphoses ne recommencent pas de zéro : les lois changent lentement, et le motif présent se transforme en un autre.' });
        } else if (keep.scene === 'pelage') {
          L.push({ type: 'section', label: 'Pelage' });
          L.push({ type: 'choice', label: 'Animal', value: keep.coat, set: (x) => { keep.coat = x; setScene('pelage'); }, options: Object.keys(COATS).map((k) => ({ id: k, label: COATS[k].label })) });
          L.push({ type: 'note', text: COATS[keep.coat].label + ' : ' + COATS[keep.coat].why + '.' });
        } else if (keep.scene === 'labo') {
          L.push({ type: 'section', label: 'Lois' });
          L.push({ type: 'slider', label: 'f (apport de U)', min: 0.005, max: 0.09, step: 0.0005, value: keep.f, fmt: (x) => fr(x, 4), set: (x) => { keep.f = x; } });
          L.push({ type: 'slider', label: 'k (disparition de V)', min: 0.04, max: 0.072, step: 0.0002, value: keep.k, fmt: (x) => fr(x, 4), set: (x) => { keep.k = x; } });
          L.push({ type: 'buttons', items: PRESETS.slice(0, 4).map((p) => ({ label: p.label, act: () => { keep.f = p.f; keep.k = p.k; } })) });
          L.push({ type: 'buttons', items: PRESETS.slice(4).map((p) => ({ label: p.label, act: () => { keep.f = p.f; keep.k = p.k; } })) });
          L.push({ type: 'buttons', items: [{ label: 'Tout effacer', act: () => { setup(); seed(0); } }, { label: 'Semer partout', act: () => seed(0.08) }] });
        } else {
          L.push({ type: 'note', text: 'La carte de Pearson : chaque point de l’écran a ses propres lois. Touchez une région qui vous plaît pour l’emporter au laboratoire.' });
        }
        if (keep.scene !== 'pelage') {
          L.push({ type: 'section', label: 'Rendu' });
          L.push({ type: 'choice', label: 'Palette', value: keep.pal, set: (x) => { keep.pal = x; }, options: [{ id: 'auto', label: 'Selon le motif' }, { id: 'corail', label: 'Corail' }, { id: 'nacre', label: 'Nacre' }, { id: 'encre', label: 'Encre' }, { id: 'ambre', label: 'Ambre' }, { id: 'neon', label: 'Néon' }] });
          L.push({ type: 'slider', label: 'Relief', min: 0, max: 3, step: 0.01, value: keep.bump, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.bump = x; } });
          if (keep.scene !== 'atlas') L.push({ type: 'choice', label: 'Greffe (outil greffer)', value: String(keep.graft), set: (x) => { keep.graft = +x; }, options: [1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: String(i), label: PRESETS[(keep.cur + i) % PRESETS.length].label })) });
        }
        return L;
      },
    };
  }
})();
