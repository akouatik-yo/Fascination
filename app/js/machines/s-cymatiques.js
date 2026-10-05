/* Fascinations — Les Cymatiques · le son rendu visible (WebGL2 + son)
   Plaque de Chladni : 65 536 grains de sable sur une plaque qui vibre. Chaque mode propre a sa fréquence ; la
   réponse de la plaque à la fréquence jouée est une somme de résonances (lorentziennes). Les grains sautent là où
   la plaque vibre et s'immobilisent sur les lignes nodales. Plaque carrée : formule de Chladni (approximation
   classique) ; plaque ronde : modes de Bessel Jₙ(jₙ,ₛ r) cos(nθ).
   Eau : ondes de Faraday et « mandalas » de cymatique (surface d'eau éclairée par un anneau de lumière).
   Tube de Rubens (1905) : une rangée de flammes au-dessus d'un tube de gaz où le son forme une onde stationnaire. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 0) => x.toFixed(d).replace('.', ',');

  // zéros des fonctions de Bessel jₙ,ₛ (n = 0..6, s = 1..4)
  const JZ = [[2.405, 5.520, 8.654, 11.792], [3.832, 7.016, 10.173, 13.324], [5.136, 8.417, 11.620, 14.796], [6.380, 9.761, 13.015, 16.223], [7.588, 11.065, 14.373, 17.616], [8.771, 12.339, 15.700, 18.980], [9.936, 13.589, 17.004, 20.321]];
  function modesFor(shape) {
    const L = [];
    if (shape === 'carre') {
      for (let m = 0; m <= 9; m++) for (let n = m + 1; n <= 10; n++) for (const s of [1, -1]) if (m + n >= 2) L.push({ m, n, s, f: 34 * (m * m + n * n) * (s > 0 ? 1 : 1.04) + 40 });
    } else {
      for (let n = 0; n <= 6; n++) for (let s = 0; s < 4; s++) L.push({ m: n, n: JZ[n][s], s: 1, f: 11 * JZ[n][s] * JZ[n][s] + 40 });
    }
    return L.sort((a, b) => a.f - b.f);
  }
  const keep = { scene: 'chladni', shape: 'carre', f: 0, sweep: true, vol: 0.5, grains: 1, wfold: 0, wf: 0.35, rf: 0, rauto: true, rvol: 0.8 };

  /* ───────── shaders ───────── */
  const COMMON = `
uniform vec4 uM0, uM1, uM2; uniform int uShape;
float bes(int n, float x){ float s = 0.; for (int i = 0; i < 14; i++){ float t = (float(i) + .5) / 14. * 3.14159265; s += cos(float(n) * t - x * sin(t)); } return s / 14.; } // Jₙ(x) = (1/π)∫cos(nτ − x sin τ)dτ
float mode(vec4 M, vec2 p){
  if (M.w == 0.) return 0.;
  if (uShape == 0){ vec2 q = p * .5 + .5; float a = cos(M.x * 3.14159265 * q.x) * cos(M.y * 3.14159265 * q.y), b = cos(M.y * 3.14159265 * q.x) * cos(M.x * 3.14159265 * q.y); return a + M.z * b; }
  float r = length(p), th = atan(p.y, p.x); return bes(int(M.x + .5), M.y * r) * cos(M.x * th);
}
float field(vec2 p){ return mode(uM0, p) * uM0.w + mode(uM1, p) * uM1.w + mode(uM2, p) * uM2.w; }`;
  const FS_GINIT = HEAD + `
uniform float uSeed; out vec4 o;
void main(){ vec2 p = gl_FragCoord.xy; o = vec4(hash12(p + uSeed) * 2. - 1., hash12(p * 1.37 + uSeed + 3.) * 2. - 1., 0., 0.); }`;
  const FS_GRAIN = HEAD + COMMON + `
uniform sampler2D uP; uniform float uDrive, uDt, uSeed, uShake;
out vec4 o;
void main(){
  vec4 g = texelFetch(uP, ivec2(gl_FragCoord.xy), 0); vec2 p = g.xy, v = g.zw;
  float a = abs(field(p)) * uDrive;
  float h = hash12(gl_FragCoord.xy + uSeed) * 6.2832, j = hash12(gl_FragCoord.xy * 1.7 + uSeed);
  v = v * .8 + vec2(cos(h), sin(h)) * (a * .9 + uShake) * j;   // sauts proportionnels à la vibration : les grains finissent là où elle est nulle
  p += v * uDt;
  if (uShape == 0) { if (abs(p.x) > 1.){ p.x = sign(p.x) * 1.; v.x *= -.5; } if (abs(p.y) > 1.){ p.y = sign(p.y) * 1.; v.y *= -.5; } }
  else { float r = length(p); if (r > 1.){ p /= r; v -= p * dot(v, p) * 1.5; } }
  o = vec4(p, v);
}`;
  const VS_G = `#version 300 es
precision highp float; uniform sampler2D uP; uniform vec4 uRect; uniform vec2 uRes; uniform float uSize; uniform int uW;
out float vH;
void main(){ ivec2 q = ivec2(gl_VertexID % uW, gl_VertexID / uW); vec4 g = texelFetch(uP, q, 0);
  vec2 s = uRect.xy + (g.xy * .5 + .5) * uRect.zw; gl_Position = vec4(s / uRes * 2. - 1., 0., 1.); gl_PointSize = uSize; vH = fract(sin(float(gl_VertexID) * 12.9898) * 43758.5); }`;
  const FS_G = `#version 300 es
precision highp float; in float vH; uniform vec3 uCol; out vec4 o;
void main(){ vec2 d = gl_PointCoord - .5; float r = dot(d, d); if (r > .25) discard; o = vec4(uCol * (.75 + .5 * vH) * (1. - r * 2.), 1.); }`;
  const FS_PLATE = HEAD + COMMON + `
uniform vec4 uRect; uniform vec2 uRes; uniform float uInk, uDrive, uT;
out vec4 o;
void main(){
  vec2 fc = gl_FragCoord.xy; vec2 p = (fc - uRect.xy) / uRect.zw * 2. - 1.;
  vec3 bg = uInk > .5 ? vec3(.955, .94, .91) : vec3(.02, .02, .035);
  bool in_ = uShape == 0 ? (abs(p.x) <= 1. && abs(p.y) <= 1.) : length(p) <= 1.;
  if (!in_){ float d = uShape == 0 ? max(abs(p.x), abs(p.y)) - 1. : length(p) - 1.; o = vec4(bg + (uInk > .5 ? vec3(-.25) : vec3(.18, .18, .2)) * smoothstep(.02, 0., d), 1.); return; }
  // plaque métallique noire, légèrement brossée ; un soupçon de la vibration (miroitement)
  float f = field(p) * uDrive;
  vec3 c = vec3(.055, .055, .065) + .015 * sin(p.x * 900. + p.y * 30.);
  c += vec3(.05, .06, .09) * abs(f) * (.5 + .5 * sin(uT * 30.));
  float vg = uShape == 0 ? max(abs(p.x), abs(p.y)) : length(p); c *= 1. - .25 * smoothstep(.6, 1., vg);
  if (uShape == 1 && length(p) < .03) c = vec3(.35, .33, .3);    // la vis centrale
  if (uShape == 0 && length(p) < .03) c = vec3(.35, .33, .3);
  o = vec4(c, 1.);
}`;
  // surface d'eau dans une coupelle ronde, éclairée par un anneau de lumière (comme un « cymascope »)
  const FS_WATER = HEAD + `
uniform vec4 uRect; uniform vec2 uRes; uniform float uT, uK, uFold, uAmp, uInk, uHue;
out vec4 o;
float H(vec2 p){
  float h = 0., N = uFold;
  for (int i = 0; i < 12; i++){ if (float(i) >= N) break; float a = 3.14159265 * float(i) / N; h += cos(uK * dot(p, vec2(cos(a), sin(a)))); }
  h /= N;
  float r = length(p); h += .35 * cos(uK * r * 1.02) * (1. - r * .4);       // anneaux du bord de la coupelle
  return h * uAmp * cos(uT) * smoothstep(1., .9, r);
}
void main(){
  vec2 fc = gl_FragCoord.xy; vec2 p = (fc - (uRect.xy + uRect.zw * .5)) / (min(uRect.z, uRect.w) * .5) * 1.04;
  vec3 bg = uInk > .5 ? vec3(.955, .94, .91) : vec3(.01, .01, .02);
  float r = length(p);
  if (r > 1.){ o = vec4(bg + (uInk > .5 ? vec3(-.3) : vec3(.12, .13, .16)) * smoothstep(1.035, 1., r), 1.); return; }
  float e = .004, h = H(p);
  vec2 g = vec2(H(p + vec2(e, 0.)) - H(p - vec2(e, 0.)), H(p + vec2(0., e)) - H(p - vec2(0., e))) / (2. * e);
  vec3 n = normalize(vec3(-g * .045, 1.));
  vec3 R = reflect(vec3(0., 0., -1.), n);
  // l'anneau lumineux, vu en reflet : une couronne à 30-40° du zénith, plus une lueur douce
  float el = acos(clamp(R.z, -1., 1.)), ring = exp(-pow((el - .55) / .07, 2.)), soft = exp(-el * 6.) * .25;
  vec3 hue = .5 + .5 * cos(6.2832 * (uHue + vec3(0., .33, .67)));
  vec3 c = mix(vec3(.02, .03, .06), vec3(.0), r) + (hue * ring * 1.3 + vec3(.6, .7, 1.) * soft);
  c += hue * .05 * (1. - r);
  if (uInk > .5) c = vec3(.955, .94, .91) - c * .8;
  o = vec4(c, 1.);
}`;

  window.FASC.push({
    id: 'chladni', name: 'Les Cymatiques', cat: 'Motifs', glyph: '◈', smoothTime: true,
    blurb: 'Le son rendu visible : sable, eau, flammes',
    hint: 'Glissez horizontalement pour changer la fréquence (ou laissez le balayage). Activez le son.',
    intro: 'Posez du sable sur une plaque de métal et faites-la vibrer avec un archet : le sable fuit les parties qui vibrent et se rassemble sur les lignes qui restent immobiles. À chaque fréquence de résonance, une figure nouvelle. Ernst Chladni les montrait en 1787 ; Napoléon fut si impressionné qu’il finança un prix pour en trouver la théorie (remporté par Sophie Germain, en 1816).',
    about: [
      'Une plaque n’a pas une fréquence de résonance, mais une infinité : ses modes propres. À chacun correspond une figure de lignes nodales, qui restent immobiles pendant que le reste vibre. Entre deux résonances, la plaque répond à peine et le sable reste où il est. Ici, la réponse de la plaque est la somme des modes proches de la fréquence jouée, chacun pondéré par sa courbe de résonance.',
      'Plaque carrée : la formule de Chladni, cos(mπx)cos(nπy) ± cos(nπx)cos(mπy), est une approximation (celle d’une plaque libre est plus compliquée) ; les fréquences, proportionnelles à m² + n², aussi. Plaque ronde : les modes sont des fonctions de Bessel, Jₙ(jₙ,ₛ r) cos(nθ), avec n diamètres et s cercles nodaux. Sophie Germain a remporté le prix de l’Académie avec l’équation des plaques vibrantes, corrigée ensuite par Kirchhoff (1850).',
      'Sur l’eau, la vibration crée des ondes stationnaires qui oscillent à la moitié de la fréquence imposée (Faraday, 1831) et s’organisent en carrés, en hexagones, ou en motifs quasi cristallins à 8, 10 ou 12 branches. Le mot « cymatique » vient du grec kuma, la vague ; Hans Jenny l’a popularisé en 1967.',
      'Le tube de Rubens (Heinrich Rubens, 1905) : un tube percé de trous, rempli de gaz, fermé par un haut-parleur. L’onde sonore stationnaire module la pression, donc la hauteur des flammes : on voit la longueur d’onde. Résonances quand la longueur du tube vaut un nombre entier de demi-longueurs d’onde.',
    ],
    tools: [
      { id: 'frequence', label: 'fréquence', desc: 'Glissez horizontalement : la fréquence change (graves à gauche, aigus à droite).' },
      { id: 'secouer', label: 'secouer', desc: 'Touchez : le sable est jeté au hasard.' },
    ],
    make(env) {
      try { return makeCym(env); } catch (e) {
        console.warn('Les Cymatiques : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#05050a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Les Cymatiques demandent WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeCym(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = Math.min(1.5, env.dpr || 1), cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    const K = GLKit(cw, ch), gl = K.gl;
    if (!K.full) throw new Error('flottants 32 bits indisponibles');
    const PGI = K.program(FS_GINIT), PGR = K.program(FS_GRAIN), PGD = K.program(FS_G, VS_G), PPL = K.program(FS_PLATE), PWA = K.program(FS_WATER);
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const ink = () => env.theme === 'light';
    const GWg = 256;
    let T = 0, G = K.double(GWg, GWg, 'f32', gl.NEAREST), modes = modesFor(keep.shape), drive = [0, 0, 0], active = [], shake = 0, toast = null, sweepDir = 1;
    const say = (s) => { toast = { s, t: T }; };
    const FMIN = 60, FMAX = 3200, lf = (x) => FMIN * Math.pow(FMAX / FMIN, x), xf = (f) => Math.log(f / FMIN) / Math.log(FMAX / FMIN);
    if (!keep.f) keep.f = modes[3].f * 0.97;
    function grainsInit() { PGI.use().f('uSeed', rnd(100)); K.run(PGI, G.w); G.swap(); }
    grainsInit();

    /* ───────── son ───────── */
    let osc = null;
    function soundOn() {
      if (osc || !au || !au.on) return;
      const c = au.ensure(), o = c.createOscillator(), g = c.createGain(), sat = c.createWaveShaper(), n = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain();
      const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; curve[i] = Math.tanh(x * 1.6); } sat.curve = curve;
      o.frequency.value = 220; g.gain.value = 0; o.connect(sat); sat.connect(g); g.connect(au.master); o.start();
      n.buffer = au.noiseBuf(); n.loop = true; bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 0.8; ng.gain.value = 0; n.connect(bp); bp.connect(ng); ng.connect(au.master); n.start();
      osc = { c, o, g, ng };
    }
    function soundSet(f, amp, rattle) {
      if (!osc) return; const t = osc.c.currentTime;
      osc.o.frequency.setTargetAtTime(f, t, 0.03);
      osc.g.gain.setTargetAtTime(0.05 * keep.vol * (0.35 + 0.65 * amp) / Math.sqrt(Math.max(1, f / 400)), t, 0.05);
      osc.ng.gain.setTargetAtTime(0.03 * keep.vol * rattle, t, 0.08);
    }
    function soundOff() { if (!osc) return; const t = osc.c.currentTime; osc.g.gain.setTargetAtTime(0, t, 0.05); osc.ng.gain.setTargetAtTime(0, t, 0.05); osc.o.stop(t + 0.4); osc = null; }

    /* ───────── Chladni ───────── */
    function response() {
      // les trois modes les plus excités à cette fréquence, pondérés par leur résonance (largeur ~2 %)
      const f = keep.f, Q = 0.022;
      const w = modes.map((m) => { const d = (f - m.f) / (m.f * Q); return { m, a: 1 / (1 + d * d) }; }).sort((a, b) => b.a - a.a).slice(0, 3);
      return w;
    }
    function updChladni(k) {
      if (keep.sweep && !dragging) {
        // balayage lent : on traîne près des résonances, on file entre elles
        const top = response()[0].a, rate = 0.012 * (0.15 + 0.85 * (1 - top));
        keep.f = clamp(lf(xf(keep.f) + sweepDir * rate * k), FMIN, FMAX * 0.7);
        if (keep.f >= FMAX * 0.7 - 1 || keep.f <= FMIN + 1) sweepDir = -sweepDir;
      }
      active = response();
      for (let i = 0; i < 3; i++) drive[i] += ((active[i] ? active[i].a : 0) - drive[i]) * Math.min(1, k * 4);
      const amp = Math.min(1, active[0].a);
      shake = Math.max(0, shake - k * 2);
      const n = clamp(Math.round(k * 60 * 2), 1, 6);
      for (let i = 0; i < n; i++) {
        PGR.use().t('uP', G.r).f('uDrive', 1.2).f('uDt', 0.012).f('uSeed', rnd(1000)).f('uShake', shake * 0.6).i('uShape', keep.shape === 'carre' ? 0 : 1);
        setModes(PGR); K.run(PGR, G.w); G.swap();
      }
      soundOn(); soundSet(keep.f, amp, amp * 0.8);
    }
    function setModes(P) {
      const M = (i) => { const a = active[i]; if (!a) return [0, 0, 0, 0]; const m = a.m; return [m.m, m.n, m.s, drive[i] * (i === 0 ? 1 : 0.8)]; };
      P.v4('uM0', M(0)).v4('uM1', M(1)).v4('uM2', M(2));
    }
    function plateRect() { const v = view(), s = Math.min(v.w * 0.8, H * 0.74); return { x: v.cx - s / 2, y: H * 0.5 - s / 2 - 8, w: s, h: s }; }
    function drawChladni() {
      const r = plateRect(), gr = [r.x * dpr, (H - r.y - r.h) * dpr, r.w * dpr, r.h * dpr];
      PPL.use().f('uRect', ...gr).f('uRes', cw, ch).f('uInk', ink() ? 1 : 0).f('uDrive', drive[0]).f('uT', T).i('uShape', keep.shape === 'carre' ? 0 : 1); setModes(PPL);
      K.run(PPL, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cw, ch);
      PGD.use().t('uP', G.r).f('uRect', ...gr).f('uRes', cw, ch).f('uSize', Math.max(1.4, 1.7 * dpr * (r.w / 600))).i('uW', GWg).f('uCol', 0.93, 0.86, 0.7);
      gl.bindVertexArray(K.emptyVao); gl.drawArrays(gl.POINTS, 0, Math.round(GWg * GWg * keep.grains));
    }

    /* ───────── eau ───────── */
    function waterParams() {
      // plus la fréquence monte, plus la longueur d'onde raccourcit ; la symétrie change par paliers
      const x = keep.wf, folds = [4, 6, 8, 10, 12, 5, 7, 16];
      const fold = keep.wfold || folds[Math.min(folds.length - 1, Math.floor(x * folds.length))];
      return { k: 9 + x * 40, fold, f: Math.round(lf(0.25 + x * 0.45)) };
    }
    function drawWater() {
      const v = view(), s = Math.min(v.w * 0.86, H * 0.8), r = [(v.cx - s / 2) * dpr, (H / 2 - s / 2 + 6) * dpr, s * dpr, s * dpr];
      const wp = waterParams();
      PWA.use().f('uRect', ...r).f('uRes', cw, ch).f('uT', T * 3.1).f('uK', wp.k).f('uFold', wp.fold).f('uAmp', 1).f('uInk', ink() ? 1 : 0).f('uHue', 0.55 + keep.wf * 0.6);
      K.run(PWA, null);
      soundOn(); soundSet(wp.f, 0.6, 0);
    }

    /* ───────── tube de Rubens (2D) ───────── */
    const NJ = 90, flames = Array.from({ length: NJ }, () => ({ h: 0.3, ph: rnd(TAU) }));
    let rubT = 0, rubNote = 0;
    const L_TUBE = 1.5, C_SOUND = 343, RES = (n) => (n * C_SOUND) / (2 * L_TUBE);
    function updRubens(k) {
      if (keep.rauto && !dragging) {
        // une petite mélodie qui tombe tantôt juste sur les résonances, tantôt entre elles
        rubT -= k;
        if (rubT <= 0) { const seq = [3, 4, 5, 6, 8, 6, 5, 4, 3.5, 7, 9, 2]; keep.rf = RES(seq[rubNote++ % seq.length]); rubT = 2.6; }
      }
      if (!keep.rf) keep.rf = RES(5);
      const n = keep.rf / RES(1), q = 0.04, nn = Math.max(1, Math.round(n)), res = 1 / (1 + ((n - nn) / (nn * q)) ** 2), kk = (TAU * keep.rf) / C_SOUND;
      for (let i = 0; i < NJ; i++) {
        const x = ((i + 0.5) / NJ) * L_TUBE, p = Math.abs(Math.cos(kk * x)) * res * keep.rvol; // amplitude de pression de l'onde stationnaire
        const target = 0.25 + 0.75 * p;
        flames[i].h += (target - flames[i].h) * Math.min(1, k * 6);
        flames[i].ph += k * (6 + rnd(4));
      }
      soundOn(); soundSet(keep.rf, res, 0);
      return res;
    }
    function drawRubens() {
      const v = view(), x0 = v.x0 + v.w * 0.1, x1 = v.x1 - v.w * 0.06, y = H * 0.66, L = ink();
      ctx.fillStyle = L ? '#f4f0e8' : '#06050a'; ctx.fillRect(0, 0, W, H);
      // flammes
      ctx.save(); ctx.globalCompositeOperation = L ? 'source-over' : 'lighter';
      const step = (x1 - x0) / NJ;
      for (let i = 0; i < NJ; i++) {
        const f = flames[i], x = x0 + (i + 0.5) * step, hgt = H * 0.42 * f.h * (0.9 + 0.1 * Math.sin(f.ph)), w = step * 0.8;
        const g = ctx.createLinearGradient(x, y, x, y - hgt);
        g.addColorStop(0, L ? 'rgba(40,80,200,.8)' : 'rgba(60,110,255,.85)'); g.addColorStop(0.12, L ? 'rgba(230,120,30,.7)' : 'rgba(255,150,40,.75)'); g.addColorStop(0.6, L ? 'rgba(240,170,40,.45)' : 'rgba(255,200,80,.45)'); g.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w * 0.7, y - hgt * 0.5, x + Math.sin(f.ph * 1.3) * w * 0.3, y - hgt); ctx.quadraticCurveTo(x + w * 0.7, y - hgt * 0.5, x + w / 2, y); ctx.fill();
      }
      ctx.restore();
      // le tube, le haut-parleur
      const tg = ctx.createLinearGradient(0, y, 0, y + 30); tg.addColorStop(0, L ? '#9a9aa2' : '#5a5a66'); tg.addColorStop(0.5, L ? '#d8d8de' : '#a8a8b4'); tg.addColorStop(1, L ? '#6a6a72' : '#2a2a34');
      ctx.fillStyle = tg; ctx.fillRect(x0 - 6, y, x1 - x0 + 12, 30);
      ctx.fillStyle = L ? '#3a3a44' : '#1a1a22'; ctx.fillRect(x0 - 30, y - 14, 24, 58);
      ctx.strokeStyle = L ? '#55555f' : '#8a8a96'; ctx.beginPath(); ctx.arc(x0 - 18, y + 15, 12, 0, TAU); ctx.stroke();
      ctx.fillStyle = L ? 'rgba(40,30,60,.8)' : 'rgba(235,230,255,.8)'; ctx.font = '500 11px "JetBrains Mono", monospace';
      const n = keep.rf / RES(1), lam = C_SOUND / keep.rf;
      ctx.fillText(`${fr(keep.rf)} HZ · LONGUEUR D’ONDE ${fr(lam * 100)} CM · TUBE DE 1,5 M : RÉSONANCES TOUS LES ${fr(RES(1))} HZ · ICI ${fr(n, 2)} DEMI-ONDES`, v.x0 + 20, H - 18);
    }

    /* ───────── boucle ───────── */
    function update(k) {
      T += k;
      if (keep.scene === 'chladni') updChladni(k);
      else if (keep.scene === 'rubens') updRubens(k);
    }
    function hudChladni() {
      const v = view(), c = ink() ? 'rgba(40,30,60,.8)' : 'rgba(235,230,255,.8)', r = plateRect();
      // la règle des fréquences, avec les résonances
      const x0 = v.x0 + 30, x1 = v.x1 - 30, y = H - 22;
      ctx.strokeStyle = ink() ? 'rgba(40,30,60,.3)' : 'rgba(235,230,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      for (const m of modes) { if (m.f > FMAX * 0.7) continue; const x = x0 + (x1 - x0) * xf(m.f); ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke(); }
      const xc = x0 + (x1 - x0) * xf(keep.f); ctx.fillStyle = ink() ? '#c2368f' : '#ff8ad8'; ctx.beginPath(); ctx.arc(xc, y, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = c; ctx.font = '500 11px "JetBrains Mono", monospace';
      const a = active[0], lab = keep.shape === 'carre' ? `MODE (${a.m.m}, ${a.m.n}) ${a.m.s > 0 ? '+' : '−'}` : `MODE ${a.m.m} DIAMÈTRE${a.m.m > 1 ? 'S' : ''}, ${JZ[a.m.m].indexOf(a.m.n) + 1} CERCLE${JZ[a.m.m].indexOf(a.m.n) ? 'S' : ''}`;
      ctx.fillText(`${fr(keep.f)} HZ · ${a.a > 0.5 ? 'RÉSONANCE : ' + lab : 'ENTRE DEUX RÉSONANCES'}`, x0, y - 12);
      void r;
    }
    function render() {
      if (keep.scene === 'rubens') { drawRubens(); hudToast(); return; }
      if (keep.scene === 'chladni') drawChladni(); else drawWater();
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      if (keep.scene === 'chladni') hudChladni();
      else { const wp = waterParams(); ctx.fillStyle = ink() ? 'rgba(40,30,60,.8)' : 'rgba(235,230,255,.8)'; ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillText(`SURFACE D’EAU · SYMÉTRIE D’ORDRE ${wp.fold}${wp.fold % 2 ? ' (MOTIF QUASI CRISTALLIN)' : wp.fold > 6 ? ' (QUASI-CRISTAL)' : ''} · ${wp.f} HZ IMPOSÉS, L’EAU RÉPOND À ${Math.round(wp.f / 2)} HZ`, view().x0 + 20, H - 18); }
      hudToast();
    }
    function hudToast() { if (toast && T - toast.t < 4) { const v = view(); ctx.globalAlpha = Math.min(1, (4 - (T - toast.t)) * 1.5); ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = ink() ? '#2a2238' : '#fff'; ctx.fillText(toast.s, v.cx, 72); ctx.textAlign = 'left'; ctx.globalAlpha = 1; } }
    function setScene(id) { keep.scene = id; toast = null; if (id === 'chladni') { modes = modesFor(keep.shape); grainsInit(); } }

    if (window.FASC_DEBUG) window.FASC_DEBUG.cym = { keep, setScene, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); }, setShape(s) { keep.shape = s; modes = modesFor(s); grainsInit(); }, get modes() { return modes; } };

    let dragging = false, lastX = 0;
    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) {
        if (env.tool === 'secouer') { if (keep.scene === 'chladni') { shake = 1; say('Le sable est jeté au hasard.'); } return; }
        dragging = true; lastX = p.x;
      },
      move(p) {
        if (!p.down || !dragging) return;
        const v = view(), dx = (p.x - lastX) / v.w; lastX = p.x;
        if (keep.scene === 'chladni') keep.f = clamp(lf(xf(keep.f) + dx * 0.6), FMIN, FMAX * 0.7);
        else if (keep.scene === 'eau') keep.wf = clamp(keep.wf + dx * 0.8, 0, 1);
        else keep.rf = clamp(keep.rf * Math.pow(2, dx * 3), 60, 1500);
      },
      up() { dragging = false; },
      clear() { if (keep.scene === 'chladni') grainsInit(); },
      dispose() { soundOff(); K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'Plaque de Chladni', act: () => setScene('chladni') },
          { label: 'Eau', act: () => setScene('eau') },
          { label: 'Tube de Rubens', act: () => setScene('rubens') },
        ] }];
        if (!(au && au.on)) L.push({ type: 'buttons', items: [{ label: '♪ Activer le son', act: () => env.askSound && env.askSound() }] });
        if (keep.scene === 'chladni') {
          L.push({ type: 'section', label: 'Plaque' });
          L.push({ type: 'choice', label: 'Forme', value: keep.shape, set: (x) => { keep.shape = x; modes = modesFor(x); grainsInit(); }, options: [{ id: 'carre', label: 'Carrée' }, { id: 'rond', label: 'Ronde' }] });
          L.push({ type: 'toggle', label: 'Balayage automatique', value: keep.sweep, set: (x) => { keep.sweep = x; } });
          L.push({ type: 'slider', label: 'Fréquence', min: 0, max: 0.9, step: 0.001, value: xf(keep.f), fmt: (x) => fr(lf(x)) + ' Hz', set: (x) => { keep.f = lf(x); keep.sweep = false; } });
          L.push({ type: 'buttons', items: [
            { label: '‹ Résonance', act: () => { keep.sweep = false; const m = [...modes].reverse().find((q) => q.f < keep.f - 1); if (m) keep.f = m.f; } },
            { label: 'Résonance ›', act: () => { keep.sweep = false; const m = modes.find((q) => q.f > keep.f + 1); if (m) keep.f = m.f; } },
          ] });
          L.push({ type: 'slider', label: 'Sable', min: 0.2, max: 1, step: 0.05, value: keep.grains, fmt: (x) => Math.round(GWg * GWg * x).toLocaleString('fr-FR') + ' grains', set: (x) => { keep.grains = x; } });
          L.push({ type: 'note', text: 'Les traits sous la règle sont les fréquences de résonance. Le balayage ralentit quand il en approche : regardez le sable courir vers sa nouvelle figure. Outil « secouer » pour tout redistribuer.' });
        } else if (keep.scene === 'eau') {
          L.push({ type: 'section', label: 'Eau' });
          L.push({ type: 'slider', label: 'Fréquence', min: 0, max: 1, step: 0.001, value: keep.wf, fmt: (x) => Math.round(lf(0.25 + x * 0.45)) + ' Hz', set: (x) => { keep.wf = x; } });
          L.push({ type: 'choice', label: 'Symétrie', value: String(keep.wfold), set: (x) => { keep.wfold = +x; }, options: [{ id: '0', label: 'Selon la fréquence' }, ...[4, 5, 6, 7, 8, 10, 12].map((n) => ({ id: String(n), label: n + ' directions' }))] });
          L.push({ type: 'note', text: 'Des ondes venues de plusieurs directions se superposent : 4 directions donnent des carrés, 6 des hexagones, 5, 8, 10 ou 12 des quasi-cristaux, des motifs ordonnés qui ne se répètent jamais (comme les pavages de Penrose). L’anneau de lumière se reflète dans les pentes de l’eau.' });
        } else {
          L.push({ type: 'section', label: 'Tube' });
          L.push({ type: 'toggle', label: 'Petite mélodie', value: keep.rauto, set: (x) => { keep.rauto = x; } });
          L.push({ type: 'slider', label: 'Fréquence', min: 60, max: 1500, step: 1, value: keep.rf, fmt: (x) => Math.round(x) + ' Hz', set: (x) => { keep.rf = x; keep.rauto = false; } });
          L.push({ type: 'buttons', items: [3, 5, 8, 12].map((n) => ({ label: n + ' demi-ondes', act: () => { keep.rauto = false; keep.rf = RES(n); } })) });
          L.push({ type: 'slider', label: 'Volume (hauteur des flammes)', min: 0, max: 1.2, step: 0.01, value: keep.rvol, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.rvol = x; } });
        }
        L.push({ type: 'section', label: 'Son' });
        L.push({ type: 'slider', label: 'Volume', min: 0, max: 1, step: 0.01, value: keep.vol, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.vol = x; } });
        return L;
      },
    };
  }
})();
