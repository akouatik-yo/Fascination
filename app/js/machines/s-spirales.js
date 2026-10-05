/* Fascinations — Les Spirales · milieux excitables (WebGL2)
   Modèle de Barkley (1991) : u excitateur, v récupération. ∂u/∂t = ∇²u + u(1−u)(u − (v+b)/a)/ε ; ∂v/∂t = g(u) − v,
   avec g(u) = u (spirales stables) ou la variante de Bär et Eiswirth (1993), g(u) = 0 / 1 − 6,75u(u−1)² / 1, où
   les spirales se brisent en turbulence. Schéma semi-implicite de Barkley pour la réaction, diffusion explicite,
   bords sans flux. Une onde ne peut pas repasser là où le milieu est encore réfractaire : couper un front fait
   naître deux spirales. Mêmes équations pour la réaction de Belousov-Zhabotinsky, le muscle cardiaque et les
   amibes Dictyostelium (qui se relaient un signal d'AMPc). */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const keep = { scene: 'bz', eps: 0.02, b: 0.06, a: 0.75, bpm: 70, fib: false, glow: 1, ns: 14, agents: 1, pace: true, ecgBeep: true, pacers: true };

  /* ───────── shaders ───────── */
  const FS_MASK = HEAD + `
uniform vec2 uN, uC; uniform float uR; uniform int uKind;
out vec4 o;
void main(){
  vec2 p = gl_FragCoord.xy; float m = 1.;
  if (uKind == 0) m = length(p - uC) < uR ? 1. : 0.;
  else if (uKind == 1){ vec2 h = (p - uC) / uR * 1.25; h.y = h.y + .25; float a = h.x * h.x + h.y * h.y - 1.; m = a * a * a - h.x * h.x * h.y * h.y * h.y < 0. ? 1. : 0.; }
  o = vec4(m, 0., 0., 1.);
}`;
  const FS_SEED = HEAD + `
uniform float uSeed; uniform int uKind; uniform float uNs;
out vec4 o;
void main(){ vec2 p = gl_FragCoord.xy;
  if (uKind == 3) o = vec4(floor(hash12(p + uSeed) * uNs), 0., 0., 1.);
  else o = vec4(0., 0., 0., 1.); }`;
  const FS_STEP = HEAD + `
uniform sampler2D uS, uM, uD; uniform float uA, uB, uEps, uDt, uH2, uFib, uDicty, uSeed;
out vec4 o;
ivec2 sz; float uc;
float N(ivec2 q){ if (q.x < 0 || q.y < 0 || q.x >= sz.x || q.y >= sz.y) return uc; if (texelFetch(uM, q, 0).x < .5) return uc; return texelFetch(uS, q, 0).x; }
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy); sz = textureSize(uS, 0);
  vec4 s = texelFetch(uS, p, 0); if (texelFetch(uM, p, 0).x < .5){ o = vec4(0.); return; }
  float u = s.x, v = s.y; uc = u;
  float lap = (N(p + ivec2(1, 0)) + N(p - ivec2(1, 0)) + N(p + ivec2(0, 1)) + N(p - ivec2(0, 1)) - 4. * u) * uH2;
  float b = uB, a = uA;
  if (uDicty > .5){
    // l'AMPc n'est relayé que là où il y a des amibes ; les amas deviennent des centres émetteurs spontanés
    float d = texelFetch(uD, p, 0).x;
    b = .045 + .14 * (1. - clamp(d * .9, 0., 1.));
    if (d > 1.3 && v < .03 && hash12(floor(vec2(p) / 6.) + uSeed) < .0000012 * d * d * d) u = 1.;   // un petit amas tire d'un coup
  }
  float uth = (v + b) / a, k = uDt / uEps, un;
  if (u < uth) un = u / (1. - k * (1. - u) * (u - uth)); else un = (u + k * u * (u - uth)) / (1. + k * u * (u - uth));
  un += uDt * lap;
  float g = uFib > .5 ? (u < 1. / 3. ? 0. : (u <= 1. ? 1. - 6.75 * u * (u - 1.) * (u - 1.) : 1.)) : u;
  float vn = v + uDt * (g - v);
  o = vec4(clamp(un, 0., 1.), vn, s.z + uDt * un, 1.);       // z : temps passé excité (pour l'image)
}`;
  const FS_CYC = HEAD + `
uniform sampler2D uS; uniform float uNs;
out vec4 o;
void main(){ ivec2 p = ivec2(gl_FragCoord.xy), sz = textureSize(uS, 0); float c = texelFetch(uS, p, 0).x, want = mod(c + 1., uNs); int n = 0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){ if ((i == 0) == (j == 0)) continue; ivec2 q = (p + ivec2(i, j) + sz) % sz; if (abs(texelFetch(uS, q, 0).x - want) < .5) n++; }
  o = vec4(n >= 1 ? want : c, 0., 0., 1.); }`;
  const FS_STIM = HEAD + `
uniform sampler2D uS, uM; uniform vec2 uA, uB; uniform float uR, uNs, uSeed; uniform int uKind;
out vec4 o;
void main(){
  vec2 p = gl_FragCoord.xy; vec4 s = texelFetch(uS, ivec2(p), 0); float m = texelFetch(uM, ivec2(p), 0).x;
  if (uKind == 5){ vec2 d = (p - uA) / uR; if (abs(d.x + .5) < .5 && abs(d.y) < .5){ if (d.y > 0. && d.y < .12) s.xy = vec2(1., 0.); else if (d.y < 0. && d.y > -.3) s.xy = vec2(0., .45); } o = s; return; } // germe de spirale : un front dont le bout est libre, de la zone réfractaire derrière
  if (uKind == 4){ vec2 ab = uB - uA; float t = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-6), 0., 1.); if (length(p - uA - ab * t) < uR) s.x = floor(hash12(p + uSeed) * uNs); o = s; return; }
  vec2 ab = uB - uA; float t = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-6), 0., 1.), d = length(p - uA - ab * t);
  bool in_ = uKind == 2 ? true : uKind == 3 ? p.x < uA.x : d < uR;
  if (in_ && m > .5){ if (uKind == 1) s.xy = vec2(0., 0.); else s.x = 1.; }
  o = s;
}`;
  const FS_SCAR = HEAD + `
uniform sampler2D uM; uniform vec2 uA, uB; uniform float uR, uVal;
out vec4 o;
void main(){ vec2 p = gl_FragCoord.xy; vec4 m = texelFetch(uM, ivec2(p), 0); vec2 ab = uB - uA; float t = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-6), 0., 1.);
  if (length(p - uA - ab * t) < uR && m.y < .5) m.x = uVal; o = m; }`;
  // amibes : position (xy) ; elles montent le gradient d'AMPc au passage d'une onde
  const FS_AINIT = HEAD + `
uniform vec2 uN; uniform float uSeed;
out vec4 o;
void main(){ vec2 p = gl_FragCoord.xy; o = vec4(hash12(p + uSeed) * uN.x, hash12(p * 1.3 + uSeed + 7.) * uN.y, 0., 1.); }`;
  const FS_AGENT = HEAD + `
uniform sampler2D uA, uS; uniform vec2 uN; uniform float uDt, uSeed;
out vec4 o;
float U(vec2 q){ return texelFetch(uS, ivec2(clamp(q, vec2(0.), uN - 1.)), 0).x; }
void main(){
  vec4 a = texelFetch(uA, ivec2(gl_FragCoord.xy), 0); vec2 p = a.xy;
  float u = U(p); vec2 g = vec2(U(p + vec2(2., 0.)) - U(p - vec2(2., 0.)), U(p + vec2(0., 2.)) - U(p - vec2(0., 2.)));
  vec2 v = vec2(0.);
  float fresh = texelFetch(uS, ivec2(clamp(p, vec2(0.), uN - 1.)), 0).y;
  if (u > .15 && fresh < .35 && length(g) > 1e-4) v = normalize(g) * 1.5;   // front qui arrive : on remonte vers la source
  float h = hash12(gl_FragCoord.xy + uSeed) * 6.2832; v += vec2(cos(h), sin(h)) * .35;
  p = clamp(p + v * uDt * 6., vec2(1.), uN - 2.);
  o = vec4(p, 0., 1.);
}`;
  const VS_PT = `#version 300 es
precision highp float; uniform sampler2D uA; uniform vec2 uN, uView; uniform float uSize; uniform int uW;
void main(){ ivec2 q = ivec2(gl_VertexID % uW, gl_VertexID / uW); vec2 p = texelFetch(uA, q, 0).xy; gl_Position = vec4(p / uN * 2. - 1., 0., 1.); gl_PointSize = uSize; }`;
  const FS_DENS = `#version 300 es
precision highp float; out vec4 o; void main(){ o = vec4(3.6, 0., 0., 1.); }`;
  const FS_DOT = `#version 300 es
precision highp float; uniform vec3 uCol; out vec4 o; void main(){ vec2 d = gl_PointCoord - .5; float k = exp(-dot(d, d) * 14.); o = vec4(uCol * k, 1.); }`;
  const FS_BLUR = HEAD + `uniform sampler2D uT; uniform vec2 uDir; out vec4 o;
void main(){ vec2 sz = vec2(textureSize(uT, 0)); vec2 q = gl_FragCoord.xy; float s = 0.;
  for (int i = -3; i <= 3; i++) s += texelFetch(uT, ivec2(clamp(q + uDir * float(i), vec2(0.), sz - 1.)), 0).x * (4. - abs(float(i))) / 16.;
  o = vec4(s, 0., 0., 1.); }`;
  const FS_RED = HEAD + `uniform sampler2D uS, uM; uniform vec2 uBlk; out vec4 o;
void main(){ ivec2 b = ivec2(gl_FragCoord.xy), sz = textureSize(uS, 0); float s = 0., n = 0.;
  for (int j = 0; j < 40; j++){ if (float(j) >= uBlk.y) break; for (int i = 0; i < 40; i++){ if (float(i) >= uBlk.x) break;
    ivec2 q = ivec2(float(b.x) * uBlk.x + float(i), float(b.y) * uBlk.y + float(j)); if (q.x < sz.x && q.y < sz.y && texelFetch(uM, q, 0).x > .5){ s += texelFetch(uS, q, 0).x; n += 1.; } } }
  o = vec4(s, n, 0., 1.); }`;
  const FS_VIEW = HEAD + `
uniform sampler2D uS, uM, uD; uniform vec2 uRes, uDC; uniform int uMode; uniform float uInk, uGlow, uT, uNs, uDR;
out vec4 o;
vec4 S(vec2 g){ vec2 sz = vec2(textureSize(uS, 0)); g = clamp(g, vec2(.5), sz - .5) - .5; ivec2 i = ivec2(floor(g)); vec2 f = fract(g); ivec2 m = ivec2(sz) - 1;
  return mix(mix(texelFetch(uS, i, 0), texelFetch(uS, min(i + ivec2(1, 0), m), 0), f.x), mix(texelFetch(uS, min(i + ivec2(0, 1), m), 0), texelFetch(uS, min(i + 1, m), 0), f.x), f.y); }
void main(){
  vec2 sz = vec2(textureSize(uS, 0)); vec2 g = gl_FragCoord.xy / uRes * sz;
  vec4 s = S(g); float m = texelFetch(uM, ivec2(clamp(g, vec2(0.), sz - 1.)), 0).x;
  float u = s.x, v = s.y; vec3 col;
  bool L = uInk > .5;
  if (uMode == 3){
    float c = texelFetch(uS, ivec2(clamp(g, vec2(0.), sz - 1.)), 0).x / uNs;
    col = .5 + .5 * cos(6.2832 * (c + uT * .02 + vec3(0., .33, .67)));
    col *= .35 + .65 * (.5 + .5 * sin(c * 6.2832 * 2. + uT * .6));
    if (L) col = mix(vec3(.955, .94, .91), col * .8, .6);
    o = vec4(col, 1.); return;
  }
  if (uMode == 0){
    // boîte de Petri de réactif BZ à la ferroïne : orange-rouge au repos, bleu dans l'onde
    vec3 rest = L ? vec3(.93, .55, .42) : vec3(.62, .13, .05), wave = L ? vec3(.25, .35, .75) : vec3(.15, .35, .95);
    col = mix(rest, wave, smoothstep(.15, .7, u)) + vec3(.4, .55, 1.) * smoothstep(.5, 1., u) * .5 * uGlow;
    col *= 1. - .25 * smoothstep(.0, .6, v);
    vec2 c = uDC; float r = length(g - c) / uDR;
    vec3 bg = L ? vec3(.955, .94, .91) : vec3(.015, .015, .025);
    float rim = smoothstep(.97, 1., r) * (1. - smoothstep(1., 1.035, r));
    col = mix(bg, col, m);
    col += (L ? vec3(-.3) : vec3(.5, .55, .6)) * rim * .6;
    col += vec3(1.) * .08 * smoothstep(.5, 0., length((g - c) / uDR - vec2(-.35, .4))) * m;  // reflet du verre
  } else if (uMode == 1){
    // tissu cardiaque : potentiel d'action (u) en jaune-rouge sur un muscle sombre ; cicatrices grises
    vec3 tissue = L ? vec3(.88, .7, .68) : vec3(.22, .05, .07);
    col = mix(tissue, L ? vec3(.85, .15, .1) : vec3(1., .82, .35), smoothstep(.1, .8, u));
    col += (L ? vec3(0.) : vec3(1., .5, .2)) * smoothstep(.6, 1., u) * .4 * uGlow;
    col = mix(col, tissue * .7, smoothstep(0., .7, v) * (1. - u) * .5);
    vec3 bg = L ? vec3(.955, .94, .91) : vec3(.012, .01, .02);
    float sc = texelFetch(uM, ivec2(clamp(g, vec2(0.), sz - 1.)), 0).y;
    col = m > .5 ? col : (sc > .5 ? (L ? vec3(.55) : vec3(.18, .17, .2)) : bg);
  } else {
    // gélose : vagues d'AMPc bleutées ; les amibes sont dessinées par-dessus
    vec3 agar = L ? vec3(.93, .9, .82) : vec3(.02, .05, .06);
    col = agar + (L ? vec3(-.25, -.12, .0) : vec3(.05, .25, .35)) * smoothstep(.1, .8, u) * uGlow;
  }
  o = vec4(col, 1.);
}`;

  window.FASC.push({
    id: 'spirales', name: 'Les Spirales', cat: 'Motifs', glyph: '🌀', smoothTime: true,
    blurb: 'Ondes chimiques, cœur qui bat, amibes qui se rassemblent',
    hint: 'Touchez pour lancer une onde ; coupez un front d’un trait (outil couper) : il s’enroule en spirale.',
    intro: 'Un milieu excitable s’allume quand on le touche, transmet l’excitation à ses voisins, puis reste un moment insensible. Une onde y avance sans s’affaiblir et meurt quand elle rencontre une autre onde. Brisez-en le front : ses deux bouts s’enroulent en spirales qui tournent sans fin. La même géométrie gouverne une réaction chimique dans une boîte de Petri, le battement du cœur et le rassemblement des amibes.',
    about: [
      'La réaction de Belousov-Zhabotinsky : en 1951, Boris Belousov découvre un mélange chimique qui change de couleur à intervalles réguliers. Les revues refusent son article, jugeant la chose impossible (une réaction ne « revient » pas en arrière). Anatol Zhabotinsky reprend ses travaux dans les années 1960 ; dans une boîte de Petri, on voit des cercles concentriques et des spirales bleues sur fond rouge. C’est le premier exemple chimique de structure qui s’organise loin de l’équilibre.',
      'Le cœur : chaque battement est une onde électrique partie du nœud sinusal. Si une onde rencontre une zone encore réfractaire (une cicatrice d’infarctus, un battement prématuré au mauvais moment), elle peut s’enrouler en spirale : c’est une réentrée, une tachycardie. Si la spirale se brise en de nombreuses petites, le muscle ne se contracte plus d’ensemble : c’est la fibrillation, mortelle en quelques minutes. Le défibrillateur excite tout le muscle d’un coup : toutes les ondes meurent, le nœud sinusal reprend la main. Ici, le tracé du bas est un pseudo-électrocardiogramme, la variation de la surface excitée.',
      'Dictyostelium discoideum, l’amibe sociale : affamées, des dizaines de milliers d’amibes isolées émettent de l’AMP cyclique, se le relaient et marchent vers sa source. Des spirales d’AMPc balaient la gélose, les amibes forment des ruisseaux qui convergent, puis un organisme unique, qui deviendra une limace puis une fructification. Ici, les amibes relaient l’onde là où elles sont, et la remontent.',
      'L’automate cyclique (David Griffeath, 1989) : chaque case a un état parmi n et passe au suivant si l’un de ses voisins y est déjà. Partant du hasard, il s’organise en spirales : c’est la version la plus simple, presque abstraite, d’un milieu excitable.',
      'Le modèle de Barkley (1991) a deux nombres essentiels : a et b règlent le seuil d’excitation, ε la raideur. La variante de Bär et Eiswirth (1993) rend la récupération plus lente pour les grandes excitations, et les spirales se brisent : c’est la turbulence de défauts, la fibrillation.',
    ],
    tools: [
      { id: 'exciter', label: 'exciter', desc: 'Touchez : une onde part de là.' },
      { id: 'couper', label: 'couper', desc: 'Tracez un trait à travers un front : il s’enroule en deux spirales.' },
      { id: 'cicatrice', label: 'cicatrice', desc: 'Cœur : dessinez un tissu qui ne conduit plus.' },
    ],
    make(env) {
      try { return makeSp(env); } catch (e) {
        console.warn('Les Spirales : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#05050a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Les Spirales demandent WebGL2 avec textures flottantes.', 20, env.h / 2); } };
      }
    },
  });

  function makeSp(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = Math.min(1.5, env.dpr || 1), cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    const K = GLKit(cw, ch), gl = K.gl;
    if (!K.full) throw new Error('flottants 32 bits indisponibles');
    const PM = K.program(FS_MASK), PSEED = K.program(FS_SEED), PSTEP = K.program(FS_STEP), PCYC = K.program(FS_CYC), PSTIM = K.program(FS_STIM), PSCAR = K.program(FS_SCAR),
      PAI = K.program(FS_AINIT), PAG = K.program(FS_AGENT), PDENS = K.program(FS_DENS, VS_PT), PDOT = K.program(FS_DOT, VS_PT), PBLUR = K.program(FS_BLUR), PRED = K.program(FS_RED), PVIEW = K.program(FS_VIEW);
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const ink = () => env.theme === 'light';
    let dish = [0, 0, 1], T = 0, GW = 0, GH = 0, S = null, Mk = null, A = null, D = null, Dt = null, red = null, toast = null, cell = 2.2;
    const AW = 128, DT = 0.02, Hs = 0.3; // pas de temps et maille (unités du modèle)
    const say = (s) => { toast = { s, t: T }; };

    function setup() {
      cell = keep.scene === 'cyc' ? 2.4 : 2.1;
      GW = Math.round(W / cell); GH = Math.round(H / cell);
      S = K.double(GW, GH, 'f32', gl.NEAREST); Mk = K.double(GW, GH, 'f32', gl.NEAREST);
      const v = view(), cx = (v.cx / W) * GW, cy = GH * 0.5 - 6 / cell;
      dish = [cx, cy, keep.scene === 'bz' ? Math.min((v.w / W) * GW, GH) * 0.44 : GH * 0.4];
      PM.use().f('uN', GW, GH).f('uC', cx, keep.scene === 'coeur' ? cy + GH * 0.02 : cy).f('uR', dish[2]).i('uKind', keep.scene === 'bz' ? 0 : keep.scene === 'coeur' ? 1 : 2);
      K.run(PM, Mk.w); Mk.swap();
      PSEED.use().f('uSeed', rnd(100)).i('uKind', keep.scene === 'cyc' ? 3 : 0).f('uNs', keep.ns); K.run(PSEED, S.w); S.swap();
      if (keep.scene === 'dicty') {
        A = K.double(AW, AW, 'f32', gl.NEAREST); PAI.use().f('uN', GW, GH).f('uSeed', rnd(100)); K.run(PAI, A.w); A.swap();
        D = K.target(GW, GH, 'f32', gl.NEAREST); Dt = K.target(GW, GH, 'f32', gl.NEAREST);
      }
      if (keep.scene === 'coeur') { red = K.target(16, 12, 'f32', gl.NEAREST); ecg = []; beatT = 0.3; }
    }
    function stim(x0, y0, x1, y1, r, kind) {
      PSTIM.use().t('uS', S.r).t('uM', Mk.r).f('uA', x0, y0).f('uB', x1, y1).f('uR', r).i('uKind', kind).f('uNs', keep.ns).f('uSeed', rnd(100)); K.run(PSTIM, S.w); S.swap();
    }
    function steps(n) {
      const fib = keep.scene === 'coeur' && keep.fib;
      PSTEP.use().f('uA', keep.a).f('uB', keep.scene === 'dicty' ? 0.03 : keep.b).f('uEps', fib ? 0.025 : keep.eps).f('uDt', DT).f('uH2', 1 / (Hs * Hs)).f('uFib', fib ? 1 : 0).f('uDicty', keep.scene === 'dicty' ? 1 : 0);
      for (let i = 0; i < n; i++) { PSTEP.use().t('uS', S.r).t('uM', Mk.r).t('uD', D || Mk.r).f('uSeed', rnd(1000)); K.run(PSTEP, S.w); S.swap(); }
    }
    function agents(k) {
      PAG.use().t('uA', A.r).t('uS', S.r).f('uN', GW, GH).f('uDt', Math.min(0.05, k)).f('uSeed', rnd(1000)); K.run(PAG, A.w); A.swap();
      // densité : chaque amibe dépose un point, puis on lisse
      gl.bindFramebuffer(gl.FRAMEBUFFER, D.fb); gl.viewport(0, 0, GW, GH); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      PDENS.use().t('uA', A.r).f('uN', GW, GH).f('uSize', 2).i('uW', AW); gl.bindVertexArray(K.emptyVao); gl.drawArrays(gl.POINTS, 0, AW * AW * keep.agents);
      gl.disable(gl.BLEND);
      PBLUR.use().t('uT', D).f('uDir', 1, 0); K.run(PBLUR, Dt); PBLUR.use().t('uT', Dt).f('uDir', 0, 1); K.run(PBLUR, D);
    }
    /* ───────── cœur : stimulateur, ECG ───────── */
    let ecg = [], beatT = 0, lastSum = null, beepCool = 0, redBuf = new Float32Array(16 * 12 * 4), hr = [];
    function pace(k) {
      if (!keep.pace) return;
      beatT -= k;
      if (beatT <= 0) { beatT += 60 / keep.bpm; const v = view(); stim((v.cx / W) * GW + GH * 0.12, GH * 0.82, (v.cx / W) * GW + GH * 0.12, GH * 0.82, 7, 0); }
    }
    function ecgTick(k) {
      PRED.use().t('uS', S.r).t('uM', Mk.r).f('uBlk', Math.ceil(GW / 16), Math.ceil(GH / 12)); K.run(PRED, red);
      gl.bindFramebuffer(gl.FRAMEBUFFER, red.fb); gl.readPixels(0, 0, 16, 12, gl.RGBA, gl.FLOAT, redBuf);
      let s = 0, n = 0; for (let i = 0; i < 16 * 12; i++) { s += redBuf[i * 4]; n += redBuf[i * 4 + 1]; }
      const f = n ? s / n : 0, d = lastSum == null ? 0 : (f - lastSum) / Math.max(1e-3, k);
      lastSum = f;
      ecg.push(d); if (ecg.length > 420) ecg.shift();
      beepCool -= k;
      if (d > 0.35 && beepCool <= 0) { beepCool = 0.25; hr.push(T); if (keep.ecgBeep && au && au.on) au.note(880, 0.09, 'sine', 0.05); }
      hr = hr.filter((t) => T - t < 6);
    }

    function update(k) {
      T += k;
      if (keep.scene === 'cyc') { const n = clamp(Math.round(k * 60 * 2), 1, 6); for (let i = 0; i < n; i++) { PCYC.use().t('uS', S.r).f('uNs', keep.ns); K.run(PCYC, S.w); S.swap(); } return; }
      if (keep.scene === 'coeur') pace(k);
      if (keep.scene === 'bz' && keep.pacers) bzPacers(k);
      if (keep.scene === 'dicty') agents(k);
      steps(clamp(Math.round(k * 60 * 5), 1, 20));
      if (keep.scene === 'coeur') ecgTick(k);
    }
    function render() {
      const mode = { bz: 0, coeur: 1, dicty: 2, cyc: 3 }[keep.scene];
      PVIEW.use().t('uS', S.r).t('uM', Mk.r).t('uD', D || Mk.r).f('uRes', cw, ch).i('uMode', mode).f('uInk', ink() ? 1 : 0).f('uGlow', keep.glow).f('uT', T).f('uNs', keep.ns).f('uDC', dish[0], dish[1]).f('uDR', dish[2]);
      K.run(PVIEW, null);
      if (keep.scene === 'dicty') {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cw, ch); gl.enable(gl.BLEND);
        if (ink()) gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR); else gl.blendFunc(gl.ONE, gl.ONE);
        PDOT.use().t('uA', A.r).f('uN', GW, GH).f('uSize', 3.2 * dpr).i('uW', AW).f('uCol', ...(ink() ? [0.5, 0.45, 0.4] : [0.55, 0.62, 0.55]));
        gl.bindVertexArray(K.emptyVao); gl.drawArrays(gl.POINTS, 0, AW * AW * keep.agents); gl.disable(gl.BLEND);
      }
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      hud();
    }
    function hud() {
      const v = view(), c = ink() ? 'rgba(40,30,60,.8)' : 'rgba(235,230,255,.8)';
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = c;
      if (keep.scene === 'coeur') {
        const x0 = v.x0 + 20, x1 = v.x1 - 20, y = H - 52, hgt = 34;
        ctx.strokeStyle = ink() ? 'rgba(20,120,60,.9)' : 'rgba(110,255,160,.9)'; ctx.lineWidth = 1.6; ctx.beginPath();
        let mx = 0.6; for (const e of ecg) mx = Math.max(mx, Math.abs(e));
        ecg.forEach((e, i) => { const x = x1 - (ecg.length - 1 - i) * ((x1 - x0) / 420), yy = y - (e / mx) * hgt; i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }); ctx.stroke();
        const rate = hr.length > 1 ? Math.round((60 * (hr.length - 1)) / (hr[hr.length - 1] - hr[0])) : 0;
        ctx.fillText(`ÉLECTROCARDIOGRAMME (SIMULÉ) · ${rate ? rate + ' BATTEMENTS PAR MINUTE' : '—'}${keep.fib ? ' · TISSU FRAGILE (LES SPIRALES SE BRISENT)' : ''}`, x0, H - 12);
      } else if (keep.scene === 'bz') ctx.fillText('RÉACTION DE BELOUSOV-ZHABOTINSKY · TOUCHEZ POUR EXCITER, COUPEZ UN FRONT POUR FAIRE UNE SPIRALE', v.x0 + 20, H - 16);
      else if (keep.scene === 'dicty') ctx.fillText(`DICTYOSTELIUM · ${(AW * AW * keep.agents).toLocaleString('fr-FR')} AMIBES QUI SE RELAIENT L’AMPC ET MARCHENT VERS SA SOURCE`, v.x0 + 20, H - 16);
      else ctx.fillText(`AUTOMATE CYCLIQUE À ${keep.ns} ÉTATS · TOUCHEZ POUR SEMER LE DÉSORDRE`, v.x0 + 20, H - 16);
      if (toast && T - toast.t < 5) { ctx.globalAlpha = Math.min(1, (5 - (T - toast.t)) * 1.2); ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(toast.s, v.cx, 72); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    }

    /* ───────── démarrages ───────── */
    function setScene(id) {
      keep.scene = id; toast = null; D = null; A = null; setup();
      const v = view(), cx = (v.cx / W) * GW, cy = GH / 2;
      if (id === 'bz') {
        spiralSeed(dish[0] - dish[2] * 0.25, dish[1] + dish[2] * 0.2); spiralSeed(dish[0] + dish[2] * 0.3, dish[1] - dish[2] * 0.25, true);
        pacers = []; for (let i = 0; i < 2; i++) { const a = rnd(6.28), r = rnd(0.75, 0.3) * dish[2]; pacers.push({ x: dish[0] + Math.cos(a) * r, y: dish[1] + Math.sin(a) * r, per: rnd(16, 11), t: rnd(4) }); }
        say('Deux spirales, et deux centres qui émettent des cibles.');
      }
      if (id === 'coeur') { keep.fib = false; say('Rythme normal : chaque battement part du nœud sinusal, en haut à droite.'); }
      if (id === 'dicty') say('Les amibes affamées commencent à s’appeler…');
    }
    // une spirale toute faite : un front excité dont la moitié est coupée par une bande réfractaire
    function spiralSeed(x, y, flip) {
      PSTIM.use().t('uS', S.r).t('uM', Mk.r).f('uA', x, y).f('uB', x, y).f('uR', flip ? -70 : 70).i('uKind', 5).f('uNs', keep.ns).f('uSeed', 0); K.run(PSTIM, S.w); S.swap();
    }
    // quelques impuretés de la boîte émettent spontanément : les cibles concentriques du vrai BZ
    let pacers = [];
    function bzPacers(k) {
      for (const pc of pacers) { pc.t -= k * 2.5; if (pc.t <= 0) { pc.t += pc.per; stim(pc.x, pc.y, pc.x, pc.y, 4, 0); } }
    }
    function arrhythmia() {
      // protocole S1-S2 : un battement prématuré tombe sur la queue réfractaire du précédent
      const v = view(), cx = (v.cx / W) * GW;
      keep.pace = false; stim(cx, GH * 0.75, cx + GH * 0.3, GH * 0.75, 8, 0); steps(160);
      stim(cx - GH * 0.4, GH * 0.6, cx, GH * 0.6, 10, 0);
      setTimeout(() => { keep.pace = true; }, 4000);
      say('Un battement prématuré tombe au mauvais moment : l’onde s’enroule. Réentrée.');
    }
    function defib() { stim(0, 0, 0, 0, 0, 2); keep.fib = false; say('Choc ! Tout le muscle est excité d’un coup ; le nœud sinusal reprend la main.'); if (au && au.on) au.noise(0.25, 0.25, 600, 0.8, 'lowpass', 80); }

    setScene(keep.scene);
    if (window.FASC_DEBUG) window.FASC_DEBUG.spir = { keep, setScene, arrhythmia, defib, peekD: (x, y) => D ? [...K.read(D, x, y)] : null, peek: (x, y) => [...K.read(S.r, x, y)].concat([...K.read(Mk.r, x, y)]), get dish() { return dish; }, get G() { return [GW, GH]; }, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); } };

    let last = null;
    const g = (x, y) => [(x / W) * GW, ((H - y) / H) * GH];
    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) {
        last = { x: p.x, y: p.y };
        const [x, y] = g(p.x, p.y), tool = env.tool || 'exciter';
        if (keep.scene === 'cyc') { stim(x, y, x, y, 10, 4); return; }
        if (tool === 'exciter') stim(x, y, x, y, 4, 0);
        else if (tool === 'couper') stim(x, y, x, y, 3, 1);
        else if (tool === 'cicatrice') { PSCAR.use().t('uM', Mk.r).f('uA', x, y).f('uB', x, y).f('uR', 4).f('uVal', 0); K.run(PSCAR, Mk.w); Mk.swap(); }
      },
      move(p) {
        if (!p.down || !last) return;
        const a = g(last.x, last.y), b = g(p.x, p.y), tool = env.tool || 'exciter';
        if (keep.scene === 'cyc') stim(a[0], a[1], b[0], b[1], 10, 4); // semer du désordre
        else if (tool === 'couper') stim(a[0], a[1], b[0], b[1], 3, 1);
        else if (tool === 'cicatrice') { PSCAR.use().t('uM', Mk.r).f('uA', ...a).f('uB', ...b).f('uR', 4).f('uVal', 0); K.run(PSCAR, Mk.w); Mk.swap(); }
        else if (tool === 'exciter') stim(a[0], a[1], b[0], b[1], 3, 0);
        last = { x: p.x, y: p.y };
      },
      up() { last = null; },
      clear() { setScene(keep.scene); },
      dispose() { K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'Belousov-Zhabotinsky', act: () => setScene('bz') },
          { label: 'Le cœur', act: () => setScene('coeur') },
        ] }, { type: 'buttons', items: [
          { label: 'Les amibes', act: () => setScene('dicty') },
          { label: 'Automate cyclique', act: () => setScene('cyc') },
        ] }];
        if (keep.scene === 'bz') {
          L.push({ type: 'section', label: 'Réactif' });
          L.push({ type: 'slider', label: 'Seuil (b)', min: 0.02, max: 0.12, step: 0.001, value: keep.b, fmt: (x) => fr(x, 3), set: (x) => { keep.b = x; } });
          L.push({ type: 'slider', label: 'Raideur (ε)', min: 0.01, max: 0.05, step: 0.001, value: keep.eps, fmt: (x) => fr(x, 3), set: (x) => { keep.eps = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Semer une spirale', act: () => spiralSeed(dish[0] + rnd(0.5, -0.5) * dish[2], dish[1] + rnd(0.5, -0.5) * dish[2], Math.random() < 0.5) }, { label: 'Vider la boîte', act: () => { setup(); pacers = []; } }] });
          L.push({ type: 'toggle', label: 'Centres émetteurs (impuretés)', value: keep.pacers, set: (x) => { keep.pacers = x; } });
          L.push({ type: 'note', text: 'Outil « couper » : tracez un trait à travers un front bleu. Ses deux extrémités libres s’enroulent aussitôt. Seuil plus haut : ondes plus fines et plus lentes ; trop haut, elles meurent.' });
        } else if (keep.scene === 'coeur') {
          L.push({ type: 'section', label: 'Cœur' });
          L.push({ type: 'slider', label: 'Fréquence du nœud sinusal', min: 40, max: 140, step: 1, value: keep.bpm, fmt: (x) => x + ' /min', set: (x) => { keep.bpm = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Provoquer une réentrée', act: () => arrhythmia() }, { label: 'Fibrillation', act: () => { keep.fib = true; arrhythmia(); say('Tissu fragile : la spirale se brise en mille morceaux.'); } }] });
          L.push({ type: 'buttons', items: [{ label: '⚡ Défibriller', act: () => defib() }] });
          L.push({ type: 'toggle', label: 'Bip du moniteur (avec le son)', value: keep.ecgBeep, set: (x) => { keep.ecgBeep = x; } });
          L.push({ type: 'note', text: 'Outil « cicatrice » : dessinez une zone morte (comme après un infarctus) ; les ondes la contournent et peuvent s’y enrouler. C’est un modèle générique de tissu excitable, pas un vrai cœur : pas d’oreillettes, pas de faisceau de His.' });
        } else if (keep.scene === 'dicty') {
          L.push({ type: 'section', label: 'Amibes' });
          L.push({ type: 'slider', label: 'Population', min: 0.25, max: 1, step: 0.05, value: keep.agents, fmt: (x) => Math.round(AW * AW * x).toLocaleString('fr-FR'), set: (x) => { keep.agents = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Disperser', act: () => setScene('dicty') }] });
          L.push({ type: 'note', text: 'Attendez une ou deux minutes : des centres se mettent à émettre, les amibes forment des ruisseaux qui convergent en amas. Touchez pour lancer vous-même une onde d’AMPc.' });
        } else {
          L.push({ type: 'section', label: 'Automate' });
          L.push({ type: 'slider', label: 'États', min: 4, max: 24, step: 1, value: keep.ns, fmt: (x) => String(x), set: (x) => { keep.ns = x; setScene('cyc'); } });
        }
        if (keep.scene !== 'cyc') { L.push({ type: 'section', label: 'Rendu' }); L.push({ type: 'slider', label: 'Éclat des fronts', min: 0, max: 2, step: 0.01, value: keep.glow, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.glow = x; } }); }
        return L;
      },
    };
    void TAU;
  }
})();
