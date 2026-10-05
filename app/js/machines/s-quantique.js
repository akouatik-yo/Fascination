/* Fascination — Le Monde quantique · l'onde et la particule (WebGL2)
   Équation de Schrödinger dépendante du temps, en 2D, sur la carte graphique (ħ = m = 1, maille = 1) :
   schéma de Visscher (1991) — partie réelle et partie imaginaire avancées en quinconce, ce qui conserve la
   norme ; murs = ψ nul ; bords absorbants. Image : la phase de ψ en couleur, |ψ|² en lumière.
   Double fente : l'écran détecte des particules une à une, tirées au hasard selon le flux de |ψ|² qui l'atteint ;
   les franges apparaissent point par point. Orbitales : fonctions d'onde exactes de l'hydrogène, rendues en
   volume (lancer de rayons), avec superposition de deux états qui « respire ». */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');

  const keep = {
    scene: 'fentes', slits: 2, sep: 26, kk: 1.0, observe: false, phase: true, gain: 1, rate: 1,
    V0: 1.1, bw: 6, shape: 'stade', orb: [3, 2, 0], orb2: [1, 0, 0], mix: 0, real: true, ospin: true, obright: 1,
  };

  /* ───────── shaders ───────── */
  const FS_POT = HEAD + `
uniform vec2 uN; uniform int uMode, uShape, uSl; uniform float uWX, uTh, uW, uD, uSX, uBX, uBW, uV0, uOm;
out vec4 o;
void main(){
  vec2 p = floor(gl_FragCoord.xy) + .5; float V = 0., open = 1., ab = 0.;
  float e = 18.; vec2 dd = min(p, uN - p); float m = min(dd.x, dd.y);
  ab = m < e ? .035 * pow(1. - m / e, 2.) : 0.;                 // bords absorbants
  if (uMode == 0){                                                 // fentes
    if (abs(p.x - uWX) < uTh * .5){
      open = 0.;
      for (int i = 0; i < 7; i++){ if (i >= uSl) break; float yc = uN.y * .5 + (float(i) - float(uSl - 1) * .5) * uD; if (abs(p.y - yc) < uW * .5) open = 1.; }
    }
    if (p.x > uSX) ab = max(ab, .09 * clamp((p.x - uSX) / 6., 0., 1.)); // l'écran : tout ce qui l'atteint est détecté
  } else if (uMode == 1){                                          // barrière
    if (abs(p.x - uBX) < uBW * .5) V = uV0;
  } else {                                                         // billard
    vec2 q = p - uN * .5; float R = uN.y * .42, L = uN.x * .22;
    if (uShape == 1){ float sx = max(abs(q.x) - L, 0.); if (length(vec2(sx, q.y)) > R) open = 0.; }
    else if (uShape == 2){ if (length(q) > R) open = 0.; }
    else if (uShape == 3){ V = min(4., .5 * uOm * uOm * dot(q, q)); }
    else if (uShape == 4){ vec2 h = q / R * 1.15; h.y = -h.y + .25; float a = h.x * h.x + h.y * h.y - 1.; if (a * a * a - h.x * h.x * h.y * h.y * h.y > 0.) open = 0.; }
    if (uShape != 0 && uShape != 3) ab = 0.;
  }
  o = vec4(V, open, ab, 0.);
}`;
  const FS_PAINT = HEAD + `
uniform sampler2D uP; uniform vec2 uA, uB; uniform float uR, uOpen;
out vec4 o;
void main(){
  vec2 p = floor(gl_FragCoord.xy) + .5; vec4 v = texelFetch(uP, ivec2(p), 0);
  vec2 ab = uB - uA; float t = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-6), 0., 1.);
  if (length(p - uA - ab * t) < uR) v.g = uOpen;
  o = v;
}`;
  const FS_INIT = HEAD + `
uniform sampler2D uS, uP; uniform vec2 uC, uSig, uK; uniform float uAmp, uAdd, uDt;
out vec4 o;
void main(){
  ivec2 ip = ivec2(gl_FragCoord.xy); vec2 p = vec2(ip) + .5; vec2 d = p - uC;
  float g = uAmp * exp(-(d.x * d.x / (4. * uSig.x * uSig.x) + d.y * d.y / (4. * uSig.y * uSig.y)));
  float ph = dot(uK, p), E = .5 * dot(uK, uK);
  vec2 s = vec2(g * cos(ph), g * sin(ph - E * uDt * .5));       // I est en avance d'un demi-pas
  vec4 old = uAdd > .5 ? texelFetch(uS, ip, 0) : vec4(0.);
  if (texelFetch(uP, ip, 0).g < .5) s = vec2(0.);
  o = vec4(old.xy + s, 0., 0.);
}`;
  // un demi-pas de Visscher : R += dt·H·I (pass 0) ou I −= dt·H·R (pass 1)
  const FS_STEP = HEAD + `
uniform sampler2D uS, uP; uniform float uDt; uniform int uPass; uniform vec4 uBlock;
out vec4 o;
vec2 F(ivec2 q, ivec2 sz){ if (q.x < 0 || q.y < 0 || q.x >= sz.x || q.y >= sz.y) return vec2(0.); return texelFetch(uS, q, 0).xy; }
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy), sz = textureSize(uS, 0);
  vec4 s = texelFetch(uS, p, 0), pt = texelFetch(uP, p, 0);
  vec2 fp = vec2(p) + .5;
  if (pt.g < .5 || (fp.x > uBlock.x && fp.x < uBlock.y && fp.y > uBlock.z && fp.y < uBlock.w)){ o = vec4(0.); return; }
  vec2 lap = F(p + ivec2(1, 0), sz) + F(p - ivec2(1, 0), sz) + F(p + ivec2(0, 1), sz) + F(p - ivec2(0, 1), sz) - 4. * s.xy;
  if (uPass == 0) s.x += uDt * (-.5 * lap.y + pt.r * s.y);
  else s.y -= uDt * (-.5 * lap.x + pt.r * s.x);
  s.xy *= 1. - pt.b;
  o = s;
}`;
  // somme de |ψ|² par blocs (pour mesurer transmission et réflexion)
  const FS_RED = HEAD + `
uniform sampler2D uS; uniform vec2 uBlk;
out vec4 o;
void main(){
  ivec2 b = ivec2(gl_FragCoord.xy); ivec2 sz = textureSize(uS, 0); float s = 0.;
  for (int j = 0; j < 32; j++){ if (float(j) >= uBlk.y) break; for (int i = 0; i < 32; i++){ if (float(i) >= uBlk.x) break;
    ivec2 q = ivec2(float(b.x) * uBlk.x + float(i), float(b.y) * uBlk.y + float(j)); if (q.x < sz.x && q.y < sz.y){ vec2 v = texelFetch(uS, q, 0).xy; s += dot(v, v); } } }
  o = vec4(s, 0., 0., 1.);
}`;
  const PAL = `
vec3 hue(float a){ return .5 + .5 * cos(a + vec3(0., 2.094, 4.189)); }`;
  const FS_VIEW = HEAD + PAL + `
uniform sampler2D uS, uP; uniform vec4 uRect; uniform vec2 uRes; uniform float uGain, uPhase, uInk, uV0;
out vec4 o;
vec4 S(vec2 g){ vec2 sz = vec2(textureSize(uS, 0)); g = clamp(g, vec2(.5), sz - .5) - .5; ivec2 i = ivec2(floor(g)); vec2 f = fract(g);
  vec4 a = texelFetch(uS, i, 0), b = texelFetch(uS, min(i + ivec2(1, 0), ivec2(sz) - 1), 0), c = texelFetch(uS, min(i + ivec2(0, 1), ivec2(sz) - 1), 0), d = texelFetch(uS, min(i + 1, ivec2(sz) - 1), 0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
void main(){
  vec2 fc = gl_FragCoord.xy; vec2 u = (fc - uRect.xy) / uRect.zw;
  vec3 bg = uInk > .5 ? vec3(.955, .94, .91) : vec3(.012, .012, .03);
  if (u.x < 0. || u.y < 0. || u.x > 1. || u.y > 1.){ o = vec4(bg, 1.); return; }
  vec2 sz = vec2(textureSize(uS, 0)); vec2 g = u * sz;
  vec2 z = S(g).xy; vec4 pt = texelFetch(uP, ivec2(clamp(g, vec2(0.), sz - 1.)), 0);
  float d = dot(z, z) * uGain, L = 1. - exp(-d);
  vec3 c = uPhase > .5 ? hue(atan(z.y, z.x)) * L * 1.15 + vec3(L * L * .25) : vec3(.55, .8, 1.) * L + vec3(L * L * .35);
  vec3 col;
  if (uInk > .5) col = mix(bg, uPhase > .5 ? hue(atan(z.y, z.x)) * .55 : vec3(.12, .16, .32), clamp(L * 1.1, 0., 1.));
  else col = bg + c;
  // potentiel : ambre translucide ; murs : pierre
  if (pt.r > 1e-4) col = mix(col, uInk > .5 ? vec3(.85, .65, .3) : vec3(.55, .38, .12), clamp(pt.r / max(uV0, 1e-3), 0., 1.) * .35);
  if (pt.g < .5) col = uInk > .5 ? vec3(.62, .58, .54) : vec3(.11, .105, .13) + .03 * hash12(floor(g / 2.));
  o = vec4(col, 1.);
}`;
  const FS_ORB = HEAD + PAL + `
uniform vec4 uRect; uniform mat3 uRot; uniform float uDist, uRmax, uGain, uT, uMix, uEA, uEB, uInk; uniform int uReal;
uniform ivec3 uA, uB; uniform vec2 uNA, uNB;
out vec4 o;
float lag(int k, float a, float x){ if (k == 0) return 1.; float L0 = 1., L1 = 1. + a - x; for (int i = 1; i < 8; i++){ if (i >= k) break; float L2 = ((2. * float(i) + 1. + a - x) * L1 - (float(i) + a) * L0) / float(i + 1); L0 = L1; L1 = L2; } return L1; }
float plm(int l, int m, float x){ float pmm = 1., s = sqrt(max(0., 1. - x * x)), fct = 1.; for (int i = 0; i < 8; i++){ if (i >= m) break; pmm *= -fct * s; fct += 2.; }
  if (l == m) return pmm; float pm1 = x * float(2 * m + 1) * pmm; if (l == m + 1) return pm1; float pl = 0.;
  for (int ll = 2; ll < 10; ll++){ int L = m + ll; if (L > l) break; pl = (x * float(2 * L - 1) * pm1 - float(L + m - 1) * pmm) / float(L - m); pmm = pm1; pm1 = pl; } return pl; }
vec2 psi(ivec3 q, vec2 nr, vec3 p){
  int n = q.x, l = q.y, m = q.z; float r = length(p), rho = 2. * r / float(n);
  float R = nr.x * (l == 0 ? 1. : pow(rho, float(l))) * exp(-rho * .5) * lag(n - l - 1, float(2 * l + 1), rho);
  float ct = r > 1e-5 ? p.z / r : 1., ph = atan(p.y, p.x); int am = m < 0 ? -m : m;
  float Y = nr.y * plm(l, am, ct);
  if (uReal == 1 && m != 0) return vec2(R * Y * 1.41421 * (m > 0 ? cos(float(am) * ph) : sin(float(am) * ph)), 0.);
  return R * Y * vec2(cos(float(m) * ph), sin(float(m) * ph));
}
vec2 cm(vec2 a, vec2 b){ return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
void main(){
  vec2 fc = gl_FragCoord.xy; vec2 uv = (fc - (uRect.xy + uRect.zw * .5)) / (min(uRect.z, uRect.w) * .5);
  vec3 ro = uRot * vec3(0., 0., uDist), rd = uRot * normalize(vec3(uv * .5, -1.));
  float b = dot(ro, rd), c = dot(ro, ro) - uRmax * uRmax, h = b * b - c; vec3 col = vec3(0.);
  if (h > 0.){
    float t0 = max(-b - sqrt(h), 0.), t1 = -b + sqrt(h); const int N = 96; float dt = (t1 - t0) / float(N), t = t0 + dt * hash12(fc);
    for (int i = 0; i < N; i++){
      vec3 p = ro + rd * t; vec2 z = cm(psi(uA, uNA, p), vec2(cos(uEA * uT), -sin(uEA * uT)));
      if (uMix > 0.){ z = z * sqrt(1. - uMix) + cm(psi(uB, uNB, p), vec2(cos(uEB * uT), -sin(uEB * uT))) * sqrt(uMix); }
      float d = dot(z, z); col += d * hue(atan(z.y, z.x)) * dt; t += dt;
    }
  }
  col *= uGain; col = 1. - exp(-col * 1.4);
  if (uInk > .5) col = clamp(vec3(.955, .94, .91) - col * .85, 0., 1.);
  else col += vec3(.012, .012, .03);
  o = vec4(col, 1.);
}`;

  window.FASC.push({
    id: 'quantique', name: 'Le Monde quantique', cat: 'Invisible', glyph: 'ψ', smoothTime: true,
    blurb: 'Une onde qui passe par deux fentes, une particule qui arrive en un point',
    hint: 'Double fente : regardez les points s’accumuler. Billard : tracez un trait pour lancer une particule. Orbitales : glissez pour tourner.',
    intro: 'À cette échelle, une particule n’a pas de trajectoire : elle se propage comme une onde (ici, la couleur est sa phase, la lumière la probabilité de la trouver), puis, quand on la détecte, elle apparaît en un seul point, au hasard. Lancez des électrons un à un sur deux fentes : chacun arrive en un point, et pourtant, ensemble, ils dessinent des franges d’interférence.',
    about: [
      'Ce que vous voyez est la solution de l’équation de Schrödinger (1926), calculée en direct sur la carte graphique : iħ ∂ψ/∂t = −ħ²/2m ∇²ψ + Vψ. La couleur indique la phase de ψ (un nombre complexe, une flèche qui tourne), la luminosité |ψ|², la probabilité de présence. Le schéma numérique de Visscher avance alternativement la partie réelle et la partie imaginaire, ce qui conserve la probabilité totale.',
      'La double fente, « le seul mystère » de la mécanique quantique selon Feynman. L’onde passe par les deux fentes et interfère avec elle-même ; mais l’écran ne reçoit jamais une demi-particule : chaque détection est un point unique, tiré au hasard selon |ψ|². L’expérience a été faite électron par électron par Pier Giorgio Merli et ses collègues à Bologne (1974) puis par Akira Tonomura chez Hitachi (1989). Ici, chaque vague donne une cinquantaine de détections, tirées une à une selon |ψ|² : statistiquement, c’est exactement comme si on envoyait les particules vraiment une par une.',
      'Si l’on observe par quelle fente passe la particule (« qui est passé où ? »), les franges disparaissent : la mesure force la particule à être passée par l’une ou l’autre, et il ne reste que la somme de deux taches. C’est l’activation du détecteur, pas la présence d’un humain, qui compte.',
      'L’effet tunnel : une particule qui n’a pas l’énergie de franchir une barrière la traverse quand même, parfois. La probabilité décroît exponentiellement avec l’épaisseur. C’est lui qui fait briller le Soleil (les protons franchissent leur répulsion), qui permet la radioactivité alpha (Gamow, 1928) et le microscope à effet tunnel (Binnig et Rohrer, prix Nobel 1986), et c’est par lui que se vident les mémoires flash.',
      'Les orbitales sont les états stationnaires de l’électron de l’atome d’hydrogène, calculés exactement : ψₙₗₘ = Rₙₗ(r) Yₗₘ(θ, φ). La densité ne bouge pas ; seule la phase tourne, à la fréquence de l’énergie. Superposez deux états : le nuage se met à osciller, et un électron qui oscille rayonne ; c’est ainsi qu’un atome émet un photon (1s + 2p : la raie Lyman α, 121,6 nm).',
      'Les unités sont celles de la maille (ħ = m = 1) ; la vitesse est ralentie de quelque quinze ordres de grandeur : un vrai électron traverserait ce dispositif en une femtoseconde.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Regarder ; sur les orbitales, glisser pour tourner.' },
      { id: 'lancer', label: 'lancer', desc: 'Billard : tracez un trait, une particule part dans cette direction (plus long = plus rapide).' },
      { id: 'murs', label: 'murs', desc: 'Billard : dessinez des murs.' },
      { id: 'gomme', label: 'gomme', desc: 'Billard : effacez des murs.' },
    ],
    make(env) {
      try { return makeQ(env); } catch (e) {
        console.warn('Le Monde quantique : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#04040a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Le Monde quantique demande WebGL2 avec textures flottantes.', 20, env.h / 2); } };
      }
    },
  });

  function makeQ(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = Math.min(1.5, env.dpr || 1);
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const light = () => env.theme === 'light' && env.decor === false;
    const ink = () => env.theme === 'light';
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    const K = GLKit(cw, ch), gl = K.gl;
    if (!K.full) throw new Error('textures flottantes 32 bits indisponibles');
    void light;
    const PPOT = K.program(FS_POT), PPAINT = K.program(FS_PAINT), PINIT = K.program(FS_INIT), PSTEP = K.program(FS_STEP), PRED = K.program(FS_RED), PVIEW = K.program(FS_VIEW), PORB = K.program(FS_ORB);
    let T = 0, toast = null, NX = 0, NY = 0, S = null, Pt = null, red = null, rect = null;
    const DT = 0.2, NEAR = gl.NEAREST;
    const say = (s) => { toast = { s, t: T }; };

    /* ───────── la grille ───────── */
    function simRect() { const v = view(), top = 58, bot = 34, m = 14; return { x: v.x0 + m, y: top, w: v.w - 2 * m, h: H - top - bot }; }
    function setupGrid() {
      const r = simRect(), nx = 480, ny = clamp(Math.round((nx * r.h) / r.w), 200, 420);
      if (nx === NX && ny === NY) return;
      NX = nx; NY = ny;
      S = K.double(NX, NY, 'f32', NEAR); Pt = K.double(NX, NY, 'f32', NEAR);
      red = K.target(24, 16, 'f32', NEAR);
    }
    const slitX = () => Math.round(NX * 0.42), screenX = () => Math.round(NX * 0.86), SY = () => Math.max(30, Math.min(NY * 0.14, keep.sep * (keep.slits - 1) * 0.5 + 26));
    let peak = 1; // densité de départ, pour régler la luminosité
    function buildPot() {
      const mode = keep.scene === 'fentes' ? 0 : keep.scene === 'tunnel' ? 1 : 2;
      const shapes = { vide: 0, stade: 1, cercle: 2, puits: 3, coeur: 4 };
      PPOT.use().f('uN', NX, NY).i('uMode', mode).i('uShape', shapes[keep.shape] || 0).i('uSl', keep.slits)
        .f('uWX', slitX()).f('uTh', 5).f('uW', keep.slits === 1 ? 9 : 6).f('uD', keep.sep).f('uSX', screenX())
        .f('uBX', NX * 0.5).f('uBW', keep.bw).f('uV0', keep.V0 * 0.5 * keep.kk * keep.kk).f('uOm', Math.sqrt(7) / (NY * 0.5));
      K.run(PPOT, Pt.w); Pt.swap();
    }
    function packet(cx, cy, sx, sy, kx, ky, add) {
      const A = 1 / Math.sqrt(TAU * sx * sy);
      if (!add) peak = A * A;
      PINIT.use().t('uS', S.r).t('uP', Pt.r).f('uC', cx, cy).f('uSig', sx, sy).f('uK', kx, ky).f('uAmp', A).f('uAdd', add ? 1 : 0).f('uDt', DT);
      K.run(PINIT, S.w); S.swap();
    }
    let block = [0, 0, 0, 0], run = { t: 0, flux: 0, choice: 0, dots: 0 }, dots = [], hist = null, blockArmed = false;
    function launch() {
      const k = keep.kk;
      if (keep.scene === 'fentes') {
        packet(NX * 0.16, NY * 0.5, 13, SY(), k, 0, false);
        run = { t: 0, flux: 0, choice: Math.random() < 0.5 ? 0 : 1, dots: 0 };
        block = [0, 0, 0, 0]; blockArmed = keep.observe;
      } else if (keep.scene === 'tunnel') {
        packet(NX * 0.24, NY * 0.5, 16, 16, k, 0, false); run = { t: 0 };
      } else {
        if (keep.shape === 'puits') packet(NX * 0.5 - NY * 0.25, NY * 0.5, 14, 14, 0, k * 0.6, false);
        else packet(NX * 0.5 - NY * 0.15, NY * 0.5 + NY * 0.05, 12, 12, k * 0.8, k * 0.45, false);
        run = { t: 0 };
      }
    }
    function resetScene() {
      setupGrid(); buildPot(); dots = []; hist = new Float32Array(NY); launch();
      meas = null;
    }

    /* ───────── évolution ───────── */
    const colBuf = () => new Float32Array(NY * 4);
    let col = null, meas = null, redBuf = new Float32Array(24 * 16 * 4), frameN = 0;
    function steps(n) {
      for (let i = 0; i < n; i++) for (const pass of [0, 1]) {
        PSTEP.use().t('uS', S.r).t('uP', Pt.r).f('uDt', DT).i('uPass', pass).v4('uBlock', block);
        K.run(PSTEP, S.w); S.swap();
      }
    }
    function detect(simDt) {
      // flux à travers l'écran ≈ |ψ|² × vitesse de groupe (sin k sur la maille) × durée
      if (!col || col.length !== NY * 4) col = colBuf();
      gl.bindFramebuffer(gl.FRAMEBUFFER, S.r.fb);
      gl.readPixels(screenX() - 2, 0, 1, NY, gl.RGBA, gl.FLOAT, col);
      let sum = 0; for (let y = 0; y < NY; y++) sum += col[y * 4] ** 2 + col[y * 4 + 1] ** 2;
      const P = sum * Math.sin(keep.kk) * simDt;
      run.flux += P * (50 / estTrans());
      while (run.flux >= 1) {
        run.flux -= 1;
        let r = Math.random() * sum, y = 0; for (; y < NY - 1; y++) { r -= col[y * 4] ** 2 + col[y * 4 + 1] ** 2; if (r <= 0) break; }
        dots.push({ y: y + Math.random(), x: Math.random(), t: T }); hist[y] += 1; run.dots++;
        if (dots.length > 6000) dots.splice(0, 1000);
        if (au && au.on && Math.random() < 0.6) au.noise(0.018, 0.035, 3800, 1, 'highpass');
      }
    }
    function estTrans() { const w = keep.slits === 1 ? 9 : 6, sy = SY(); return Math.min(0.9, (keep.slits * w) / (Math.sqrt(TAU) * sy) * 0.8); }
    function measure() {
      PRED.use().t('uS', S.r).f('uBlk', Math.ceil(NX / 24), Math.ceil(NY / 16)); K.run(PRED, red);
      gl.bindFramebuffer(gl.FRAMEBUFFER, red.fb); gl.readPixels(0, 0, 24, 16, gl.RGBA, gl.FLOAT, redBuf);
      let L = 0, R = 0; const bx = Math.floor((NX * 0.5) / Math.ceil(NX / 24));
      for (let j = 0; j < 16; j++) for (let i = 0; i < 24; i++) { const v = redBuf[(j * 24 + i) * 4]; if (i < bx) L += v; else if (i > bx) R += v; }
      meas = { L, R };
    }
    function update(k) {
      T += k;
      if (keep.scene === 'orbitales') return;
      const n = clamp(Math.round(k * 60 * 22 * keep.rate), 1, 90), simDt = n * DT;
      steps(n); run.t += simDt; frameN++;
      if (keep.scene === 'fentes') {
        // mesure « par quelle fente » : quand l'onde arrive au mur, on ferme (absorbe) l'autre fente
        if (blockArmed && run.t > (slitX() - NX * 0.16 - 40) / Math.sin(keep.kk)) {
          const yc = NY * 0.5 + (run.choice ? 0.5 : -0.5) * keep.sep * (keep.slits === 2 ? 1 : 0);
          if (keep.slits === 2) block = [slitX() - 4, slitX() + 40, yc - 6, yc + 6];
          blockArmed = false;
        }
        detect(simDt);
        if (run.t > (screenX() - NX * 0.16) / Math.sin(keep.kk) + 260) launch();
      } else if (keep.scene === 'tunnel') {
        if (frameN % 5 === 0) measure();
        if (run.t > 820) launch();
      }
    }

    /* ───────── orbitales ───────── */
    const fact = (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
    const norms = ([n, l, m]) => [Math.sqrt(Math.pow(2 / n, 3) * fact(n - l - 1) / (2 * n * fact(n + l))), Math.sqrt(((2 * l + 1) / (4 * Math.PI)) * fact(l - Math.abs(m)) / fact(l + Math.abs(m)))];
    let ocam = { az: 0.6, el: 0.35 }, orbT = 0;
    const ORBNAME = (q) => `${q[0]}${'spdf'[q[1]]}${q[1] ? (keep.real ? { 1: ['y', 'z', 'x'], 2: ['xy', 'yz', 'z²', 'xz', 'x²−y²'], 3: ['y(3x²−y²)', 'xyz', 'yz²', 'z³', 'xz²', 'z(x²−y²)', 'x(x²−3y²)'] }[q[1]][q[2] + q[1]] : ` m=${q[2]}`) : ''}`;
    function renderOrb(r) {
      const A = keep.orb, Bq = keep.orb2, nmax = Math.max(A[0], keep.mix > 0 ? Bq[0] : 1);
      const ca = Math.cos(ocam.az), sa = Math.sin(ocam.az), ce = Math.cos(ocam.el), se = Math.sin(ocam.el);
      // rotation : d'abord l'élévation (autour de x), puis l'azimut (autour de z vertical) ; z est l'axe des orbitales
      const Rm = new Float32Array([ca, sa, 0, -sa * se, ca * se, ce, sa * ce, -ca * ce, se]);
      const Rmax = 2.1 * nmax * nmax + 5, E = (n) => -0.5 / (n * n);
      const dE = Math.abs(E(A[0]) - E(Bq[0])) || 0.375;
      PORB.use();
      gl.uniformMatrix3fv(gl.getUniformLocation(PORB.p, 'uRot'), false, Rm);
      gl.uniform3i(gl.getUniformLocation(PORB.p, 'uA'), A[0], A[1], A[2]);
      gl.uniform3i(gl.getUniformLocation(PORB.p, 'uB'), Bq[0], Bq[1], Bq[2]);
      PORB.f('uRect', r.x * dpr, (H - r.y - r.h) * dpr, r.w * dpr, r.h * dpr).f('uDist', Rmax * 1.9).f('uRmax', Rmax)
        .f('uGain', 9 * keep.obright * Math.pow(nmax, 3.0)).f('uT', orbT * (TAU / 4) / dE).f('uMix', keep.mix)
        .f('uEA', E(A[0])).f('uEB', E(Bq[0])).f('uInk', ink() ? 1 : 0).i('uReal', keep.real ? 1 : 0)
        .f('uNA', ...norms(A)).f('uNB', ...norms(Bq));
      K.run(PORB, null);
    }

    /* ───────── dessin ───────── */
    function render() {
      const r = simRect(); rect = r;
      if (keep.scene === 'orbitales') renderOrb(r);
      else {
        PVIEW.use().t('uS', S.r).t('uP', Pt.r).f('uRect', r.x * dpr, (H - r.y - r.h) * dpr, r.w * dpr, r.h * dpr).f('uRes', cw, ch)
          .f('uGain', (keep.gain * (keep.scene === 'fentes' ? 6 : 2.5)) / peak).f('uPhase', keep.phase ? 1 : 0).f('uInk', ink() ? 1 : 0).f('uV0', keep.V0 * 0.5 * keep.kk * keep.kk);
        K.run(PVIEW, null);
      }
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      hud(r);
    }
    const TXT = () => (ink() ? 'rgba(40,30,60,.8)' : 'rgba(235,230,255,.8)');
    function hud(r) {
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = TXT();
      const gx = (x) => r.x + (x / NX) * r.w, gy = (y) => r.y + r.h - (y / NY) * r.h;
      if (keep.scene === 'fentes') {
        // l'écran et ses impacts
        const x0 = gx(screenX()), x1 = r.x + r.w;
        ctx.fillStyle = ink() ? 'rgba(255,255,255,.7)' : 'rgba(8,8,16,.85)'; ctx.fillRect(x0, r.y, x1 - x0, r.h);
        ctx.strokeStyle = ink() ? 'rgba(40,30,60,.4)' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(x0, r.y); ctx.lineTo(x0, r.y + r.h); ctx.stroke();
        const wdt = x1 - x0 - 6;
        for (const d of dots) {
          const age = T - d.t, a = age < 0.25 ? 1 : 0.75;
          ctx.fillStyle = ink() ? `rgba(30,20,60,${a})` : age < 0.25 ? 'rgba(255,255,255,1)' : 'rgba(160,220,255,.75)';
          ctx.fillRect(x0 + 3 + d.x * wdt, gy(d.y) - 0.75, age < 0.25 ? 2.5 : 1.5, age < 0.25 ? 2.5 : 1.5);
        }
        if (dots.length > 60 && hist) {
          // la courbe des impacts (lissée) : les franges
          let mx = 1; const sm = new Float32Array(NY); for (let y = 0; y < NY; y++) { let a = 0; for (let j = -5; j <= 5; j++) a += hist[clamp(y + j, 0, NY - 1)]; sm[y] = a; if (a > mx) mx = a; }
          ctx.strokeStyle = ink() ? 'rgba(194,54,143,.7)' : 'rgba(255,200,120,.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
          for (let y = 0; y < NY; y++) { const xx = x0 + 3 + (sm[y] / mx) * wdt * 0.95, yy = gy(y + 0.5); y ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
        }
        ctx.fillStyle = TXT();
        ctx.fillText(`${dots.length.toLocaleString('fr-FR')} PARTICULES DÉTECTÉES, UNE PAR UNE (SEULES COMPTENT CELLES QUI ONT FRANCHI LE MUR)`, r.x + 8, r.y + r.h + 22);
        if (keep.observe) ctx.fillText('DÉTECTEUR AUX FENTES ALLUMÉ : ON SAIT PAR OÙ ELLE EST PASSÉE', r.x + 8, r.y + 18);
        if (block[1] > 0) { ctx.strokeStyle = ink() ? '#c2368f' : '#ff8ad8'; ctx.lineWidth = 1.5; ctx.strokeRect(gx(block[0]) - 2, gy(block[3]) - 2, gx(slitX() + 3) - gx(block[0]) + 4, gy(block[2]) - gy(block[3]) + 4); }
      } else if (keep.scene === 'tunnel') {
        if (meas) {
          const tot = meas.L + meas.R || 1, E = 0.5 * keep.kk * keep.kk;
          ctx.fillText(`RÉFLÉCHIE ${Math.round((100 * meas.L) / tot)} % · TRANSMISE ${Math.round((100 * meas.R) / tot)} %`, r.x + 8, r.y + r.h + 22);
          ctx.fillText(`BARRIÈRE ${fr(keep.V0, 2)} × L’ÉNERGIE DE LA PARTICULE (${keep.bw} MAILLES) · ${keep.V0 > 1 ? 'UNE BILLE CLASSIQUE SERAIT TOUJOURS RENVOYÉE' : 'UNE BILLE CLASSIQUE PASSERAIT TOUJOURS'}`, r.x + 8, r.y + 18);
          void E;
        }
      } else if (keep.scene === 'billard') {
        ctx.fillText({ stade: 'STADE DE BUNIMOVICH : UN BILLARD CHAOTIQUE ; L’ONDE FINIT PAR TOUT REMPLIR, AVEC DES « CICATRICES »', cercle: 'BILLARD CIRCULAIRE : RÉGULIER, L’ONDE GARDE DES MOTIFS ORDONNÉS', puits: 'PUITS HARMONIQUE : LE PAQUET OSCILLE SANS S’ÉTALER (ÉTAT COHÉRENT)', coeur: 'UN CŒUR : POUR LE PLAISIR', vide: 'ESPACE LIBRE : LE PAQUET S’ÉTALE EN AVANÇANT' }[keep.shape] || '', r.x + 8, r.y + r.h + 22);
        if (drag && env.tool === 'lancer') { ctx.strokeStyle = ink() ? '#c2368f' : '#ff8ad8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(drag.x0, drag.y0); ctx.lineTo(drag.x, drag.y); ctx.stroke(); }
      } else {
        const A = keep.orb, B2 = keep.orb2;
        ctx.font = 'italic 500 22px "Space Grotesk", sans-serif'; ctx.fillStyle = ink() ? '#2a2238' : '#fff6ea';
        ctx.fillText(keep.mix > 0 ? `${ORBNAME(A)} + ${ORBNAME(B2)}` : ORBNAME(A), r.x + 10, r.y + 26);
        ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = TXT();
        const En = (n) => -13.6 / (n * n);
        ctx.fillText(keep.mix > 0 ? `SUPERPOSITION : LE NUAGE OSCILLE ; ÉCART D’ÉNERGIE ${fr(Math.abs(En(A[0]) - En(B2[0])), 2)} EV → LUMIÈRE DE ${Math.round(1239.84 / Math.max(1e-6, Math.abs(En(A[0]) - En(B2[0]))))} NM` : `ÉTAT STATIONNAIRE : LA DENSITÉ NE BOUGE PAS, SEULE LA PHASE (COULEUR) TOURNE · ÉNERGIE ${fr(En(A[0]), 2)} EV`, r.x + 10, r.y + r.h + 22);
      }
      if (toast && T - toast.t < 4) { ctx.globalAlpha = Math.min(1, (4 - (T - toast.t)) * 1.5); ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = TXT(); ctx.fillText(toast.s, view().cx, r.y + 44); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    }

    /* ───────── scènes ───────── */
    function setScene(id) { keep.scene = id; toast = null; if (id !== 'orbitales') resetScene(); }
    setScene(keep.scene);
    if (window.FASC_DEBUG) window.FASC_DEBUG.quant = { keep, setScene, resetScene, launch, ocam, run(n, h) { for (let i = 0; i < n; i++) { update(h / 0.4); if (keep.scene === 'orbitales') orbT += h / 0.4; } render(); }, get dots() { return dots.length; }, get meas() { return meas; } };

    let drag = null;
    const toGrid = (x, y) => { const r = simRect(); return [((x - r.x) / r.w) * NX, ((r.y + r.h - y) / r.h) * NY]; };
    function paint(x0, y0, x1, y1, open) {
      const a = toGrid(x0, y0), b = toGrid(x1, y1);
      PPAINT.use().t('uP', Pt.r).f('uA', a[0], a[1]).f('uB', b[0], b[1]).f('uR', 3.5).f('uOpen', open);
      K.run(PPAINT, Pt.w); Pt.swap();
    }
    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) { update(dt / 0.4); if (keep.scene === 'orbitales' && keep.ospin) { orbT += dt / 0.4; ocam.az += (dt / 0.4) * 0.12; } else if (keep.scene === 'orbitales') orbT += dt / 0.4; } render(); },
      down(p) {
        drag = { x0: p.x, y0: p.y, x: p.x, y: p.y, lx: p.x, ly: p.y };
        if (keep.scene === 'billard' && (env.tool === 'murs' || env.tool === 'gomme')) paint(p.x, p.y, p.x, p.y, env.tool === 'murs' ? 0 : 1);
      },
      move(p) {
        if (!p.down || !drag) return;
        if (keep.scene === 'orbitales') { ocam.az -= (p.x - drag.lx) * 0.008; ocam.el = clamp(ocam.el + (p.y - drag.ly) * 0.006, -1.5, 1.5); }
        else if (keep.scene === 'billard' && (env.tool === 'murs' || env.tool === 'gomme')) paint(drag.lx, drag.ly, p.x, p.y, env.tool === 'murs' ? 0 : 1);
        drag.x = p.x; drag.y = p.y; drag.lx = p.x; drag.ly = p.y;
      },
      up() {
        if (drag && keep.scene === 'billard' && env.tool === 'lancer') {
          const a = toGrid(drag.x0, drag.y0), b = toGrid(drag.x, drag.y), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
          if (L > 4) { const k = clamp(0.3 + L / 120, 0.3, 1.25); packet(a[0], a[1], 11, 11, (dx / L) * k, (dy / L) * k, true); say('Une particule de plus : les ondes s’additionnent.'); }
        }
        drag = null;
      },
      clear() { if (keep.scene !== 'orbitales') resetScene(); },
      dispose() { K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'Double fente', act: () => setScene('fentes') },
          { label: 'Effet tunnel', act: () => setScene('tunnel') },
        ] }, { type: 'buttons', items: [
          { label: 'Billard quantique', act: () => setScene('billard') },
          { label: 'Orbitales', act: () => setScene('orbitales') },
        ] }];
        if (keep.scene === 'fentes') {
          L.push({ type: 'section', label: 'Fentes' });
          L.push({ type: 'choice', label: 'Nombre de fentes', value: String(keep.slits), set: (x) => { keep.slits = +x; resetScene(); }, options: [1, 2, 3, 5].map((n) => ({ id: String(n), label: n === 1 ? 'Une' : n === 2 ? 'Deux' : n === 3 ? 'Trois' : 'Cinq (réseau)' })) });
          L.push({ type: 'slider', label: 'Écart entre fentes', min: 14, max: 48, step: 1, value: keep.sep, fmt: (x) => x + ' mailles', set: (x) => { keep.sep = x; resetScene(); } });
          L.push({ type: 'slider', label: 'Longueur d’onde', min: 4, max: 12, step: 0.1, value: TAU / keep.kk, fmt: (x) => fr(x, 1) + ' mailles', set: (x) => { keep.kk = TAU / x; resetScene(); } });
          if (keep.slits === 2) L.push({ type: 'toggle', label: 'Détecteur « par quelle fente ? »', value: keep.observe, set: (x) => { keep.observe = x; dots = []; hist = new Float32Array(NY); launch(); say(x ? 'On regarde par où passe chaque particule…' : 'On ne regarde plus.'); } });
          L.push({ type: 'buttons', items: [{ label: 'Effacer l’écran', act: () => { dots = []; hist = new Float32Array(NY); } }] });
          L.push({ type: 'note', text: 'Chaque point blanc est une particule détectée. Au début, ils semblent tomber au hasard ; au bout de quelques centaines, les franges apparaissent. Allumez le détecteur : les franges disparaissent. Écart plus grand ou longueur d’onde plus courte : franges plus serrées (i = λD/a).' });
        } else if (keep.scene === 'tunnel') {
          L.push({ type: 'section', label: 'Barrière' });
          L.push({ type: 'slider', label: 'Hauteur (× énergie)', min: 0.5, max: 2.5, step: 0.01, value: keep.V0, fmt: (x) => '× ' + fr(x, 2), set: (x) => { keep.V0 = x; resetScene(); } });
          L.push({ type: 'slider', label: 'Épaisseur', min: 1, max: 16, step: 1, value: keep.bw, fmt: (x) => x + ' mailles', set: (x) => { keep.bw = x; resetScene(); } });
          L.push({ type: 'note', text: 'Au-dessus de 1, une bille classique rebondirait à coup sûr. L’onde, elle, fuit en partie à travers ; doublez l’épaisseur, la part transmise s’effondre (décroissance exponentielle). En dessous de 1, une partie est quand même réfléchie, ce qu’aucune bille ne ferait.' });
        } else if (keep.scene === 'billard') {
          L.push({ type: 'section', label: 'Billard' });
          L.push({ type: 'choice', label: 'Forme', value: keep.shape, set: (x) => { keep.shape = x; resetScene(); }, options: [{ id: 'stade', label: 'Stade (chaotique)' }, { id: 'cercle', label: 'Cercle' }, { id: 'puits', label: 'Puits harmonique' }, { id: 'coeur', label: 'Cœur' }, { id: 'vide', label: 'Espace libre' }] });
          L.push({ type: 'note', text: 'Outil « lancer » : tracez un trait pour envoyer une particule (elle s’ajoute à l’onde déjà présente). « Murs » et « gomme » : dessinez votre propre billard.' });
        } else {
          L.push({ type: 'section', label: 'Orbitale' });
          const A = keep.orb;
          L.push({ type: 'choice', label: 'n (couche)', value: String(A[0]), set: (x) => { const n = +x; keep.orb = [n, Math.min(A[1], n - 1), 0]; }, options: [1, 2, 3, 4].map((n) => ({ id: String(n), label: String(n) })) });
          L.push({ type: 'choice', label: 'l (forme)', value: String(A[1]), set: (x) => { keep.orb = [A[0], +x, 0]; }, options: Array.from({ length: A[0] }, (_, l) => ({ id: String(l), label: 'spdf'[l] })) });
          if (A[1] > 0) L.push({ type: 'choice', label: 'm (orientation)', value: String(A[2]), set: (x) => { keep.orb = [A[0], A[1], +x]; }, options: Array.from({ length: 2 * A[1] + 1 }, (_, i) => ({ id: String(i - A[1]), label: keep.real ? ORBNAME([A[0], A[1], i - A[1]]).slice(2) : String(i - A[1]) })) });
          L.push({ type: 'toggle', label: 'Orbitales réelles (celles des chimistes)', value: keep.real, set: (x) => { keep.real = x; } });
          L.push({ type: 'buttons', items: [
            { label: 'Superposer 1s + 2p', act: () => { keep.orb = [2, 1, 0]; keep.orb2 = [1, 0, 0]; keep.mix = 0.5; keep.real = true; } },
            { label: 'Superposer 2s + 3d', act: () => { keep.orb = [3, 2, 0]; keep.orb2 = [2, 0, 0]; keep.mix = 0.5; keep.real = true; } },
          ] });
          L.push({ type: 'slider', label: 'Part du second état', min: 0, max: 0.9, step: 0.01, value: keep.mix, fmt: (x) => (x === 0 ? 'aucune (état pur)' : Math.round(x * 100) + ' %'), set: (x) => { keep.mix = x; } });
          L.push({ type: 'toggle', label: 'Rotation lente', value: keep.ospin, set: (x) => { keep.ospin = x; } });
          L.push({ type: 'slider', label: 'Luminosité', min: 0.2, max: 4, step: 0.01, value: keep.obright, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.obright = x; } });
        }
        if (keep.scene !== 'orbitales') {
          L.push({ type: 'section', label: 'Affichage' });
          L.push({ type: 'toggle', label: 'Phase en couleur', value: keep.phase, set: (x) => { keep.phase = x; } });
          L.push({ type: 'slider', label: 'Luminosité', min: 0.2, max: 5, step: 0.01, value: keep.gain, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.gain = x; } });
          L.push({ type: 'slider', label: 'Calcul par image', min: 0.3, max: 3, step: 0.01, value: keep.rate, fmt: (x) => '×' + fr(x, 1), set: (x) => { keep.rate = x; } });
        }
        return L;
      },
    };
    void rnd;
  }
})();
