/* Fascinations — L'Attracteur · le chaos déterministe (WebGL2)
   131 072 particules intégrées sur la carte graphique (Runge-Kutta d'ordre 4) le long de systèmes de trois
   équations différentielles : Lorenz (1963), Rössler (1976), Aizawa, Thomas (1999), Halvorsen, Dadras (2009).
   Chaque particule est un état possible du système ; ensemble, elles dessinent l'attracteur étrange.
   Effet papillon : un nuage serré (écarts d'un millième) qui se disperse ; à côté, deux trajectoires calculées
   en double précision mesurent la croissance exponentielle de leur écart (exposant de Lyapunov).
   Plans : applications de Clifford et de Peter de Jong, densité accumulée et compressée en logarithme. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 2) => x.toFixed(d).replace('.', ',');

  const ATT = {
    lorenz: { label: 'Lorenz', id: 0, dt: 0.004, c: [0, 0, 24], s: 1 / 26, p: [10, 28, 8 / 3, 0, 0, 0], names: ['σ', 'ρ', 'β'], seed: [1, 1, 20], why: 'Edward Lorenz (1963), modèle grossier de convection atmosphérique : le « papillon » à deux ailes, l’emblème du chaos.' },
    rossler: { label: 'Rössler', id: 1, dt: 0.012, c: [0, 0, 6], s: 1 / 14, p: [0.2, 0.2, 5.7, 0, 0, 0], names: ['a', 'b', 'c'], seed: [1, 1, 1], why: 'Otto Rössler (1976) cherchait l’attracteur chaotique le plus simple possible : une seule non-linéarité, une bande qui s’étire et se replie.' },
    aizawa: { label: 'Aizawa', id: 2, dt: 0.008, c: [0, 0, 0.5], s: 1 / 1.6, p: [0.95, 0.7, 0.6, 3.5, 0.25, 0.1], names: ['a', 'b', 'c', 'd', 'e', 'f'], seed: [0.1, 0, 0], why: 'Une sphère traversée d’un tube : la trajectoire s’enroule à la surface puis s’échappe par l’axe.' },
    thomas: { label: 'Thomas', id: 3, dt: 0.04, c: [0, 0, 0], s: 1 / 4.2, p: [0.208186, 0, 0, 0, 0, 0], names: ['b'], seed: [1.1, 1.1, -0.01], why: 'René Thomas (1999) : un système parfaitement symétrique, qui modélise une boucle de rétroaction ; une particule y fait une marche au hasard sans hasard.' },
    halvorsen: { label: 'Halvorsen', id: 4, dt: 0.004, c: [-2, -2, -2], s: 1 / 12, p: [1.89, 0, 0, 0, 0, 0], names: ['a'], seed: [-1.48, -1.51, 2.04], why: 'Trois lobes identiques qui se renvoient la trajectoire par symétrie circulaire.' },
    dadras: { label: 'Dadras', id: 5, dt: 0.004, c: [0, 0, 0], s: 1 / 12, p: [3, 2.7, 1.7, 2, 9, 0], names: ['a', 'b', 'c', 'd', 'e'], seed: [1.1, 2.1, -2], why: 'Sara Dadras et Hamid Momeni (2009) : un attracteur à quatre ailes.' },
  };
  const PLANE = { clifford: { label: 'Clifford', p: [-1.4, 1.6, 1.0, 0.7] }, dejong: { label: 'Peter de Jong', p: [1.641, 1.902, 0.316, 1.525] } };
  const keep = { scene: 'att', att: 'lorenz', pal: 'feu', trail: 0.82, bright: 1, spin: true, n: 1, map: 'clifford', mdrift: true };

  const FLOW = `
uniform int uAtt; uniform float uP[6];
vec3 F(vec3 v){
  float x = v.x, y = v.y, z = v.z;
  if (uAtt == 0) return vec3(uP[0] * (y - x), x * (uP[1] - z) - y, x * y - uP[2] * z);
  if (uAtt == 1) return vec3(-y - z, x + uP[0] * y, uP[1] + z * (x - uP[2]));
  if (uAtt == 2) return vec3((z - uP[1]) * x - uP[3] * y, uP[3] * x + (z - uP[1]) * y, uP[2] + uP[0] * z - z * z * z / 3. - (x * x + y * y) * (1. + uP[4] * z) + uP[5] * z * x * x * x);
  if (uAtt == 3) return vec3(sin(y) - uP[0] * x, sin(z) - uP[0] * y, sin(x) - uP[0] * z);
  if (uAtt == 4) return vec3(-uP[0] * x - 4. * y - 4. * z - y * y, -uP[0] * y - 4. * z - 4. * x - z * z, -uP[0] * z - 4. * x - 4. * y - x * x);
  return vec3(y - uP[0] * x + uP[1] * y * z, uP[2] * y - x * z + z, uP[3] * x * y - uP[4] * z);
}`;
  const FS_INIT = HEAD + `
uniform vec3 uSeed; uniform float uSpread, uRnd;
out vec4 o;
void main(){ vec2 p = gl_FragCoord.xy; vec3 r = vec3(hash12(p + uRnd), hash12(p * 1.31 + uRnd + 3.), hash12(p * 0.77 + uRnd + 9.)) * 2. - 1.; o = vec4(uSeed + r * uSpread, 0.); }`;
  const FS_STEP = HEAD + FLOW + `
uniform sampler2D uS; uniform float uDt; uniform int uN; uniform vec3 uSeed; uniform float uRnd;
out vec4 o;
void main(){
  vec4 s = texelFetch(uS, ivec2(gl_FragCoord.xy), 0); vec3 v = s.xyz; float h = uDt;
  for (int i = 0; i < 16; i++){ if (i >= uN) break;
    vec3 k1 = F(v), k2 = F(v + .5 * h * k1), k3 = F(v + .5 * h * k2), k4 = F(v + h * k3);
    v += h / 6. * (k1 + 2. * k2 + 2. * k3 + k4); }
  float sp = length(F(v));
  if (any(isnan(v)) || length(v) > 1e3){ vec2 p = gl_FragCoord.xy; v = uSeed + (vec3(hash12(p + uRnd), hash12(p * 1.3 + uRnd), hash12(p * .7 + uRnd)) - .5) * .1; sp = 0.; }
  o = vec4(v, sp);
}`;
  const VS_PT = `#version 300 es
precision highp float; uniform sampler2D uS; uniform mat4 uVP; uniform vec3 uC; uniform float uSc, uSize, uSpMax; uniform int uW, uIdx;
out vec3 vC; out float vF;
vec3 pal(float t, int k){ t = clamp(t, 0., 1.);
  if (k == 0) return mix(mix(vec3(.25, .05, .6), vec3(1., .35, .1), smoothstep(0., .5, t)), vec3(1., .95, .7), smoothstep(.5, 1., t));
  if (k == 1) return mix(mix(vec3(.05, .2, .6), vec3(.1, .8, .9), smoothstep(0., .5, t)), vec3(.9, 1., 1.), smoothstep(.5, 1., t));
  return .5 + .5 * cos(6.2832 * (t + vec3(0., .33, .67))); }
void main(){
  ivec2 q = ivec2(gl_VertexID % uW, gl_VertexID / uW); vec4 s = texelFetch(uS, q, 0);
  vec3 p = (s.xyz - uC) * uSc; vec4 c = uVP * vec4(p.x, p.z, -p.y, 1.);
  gl_Position = c; gl_PointSize = uSize;
  float t = uIdx == 1 ? float(gl_VertexID) / float(uW * uW) : s.w / uSpMax;
  vC = pal(t, uIdx == 1 ? 2 : 0); vF = 1.;
}`;
  const FS_PT = `#version 300 es
precision highp float; in vec3 vC; in float vF; uniform float uB, uK; uniform int uPal; out vec4 o;
void main(){ vec3 c = vC; if (uPal == 1) c = c.bgr * vec3(.8, 1., 1.2); if (uPal == 3) c = vec3(dot(c, vec3(.3, .5, .2))); o = vec4(c * uB * uK, 1.); }`;
  const FS_FADE = HEAD + `uniform sampler2D uT; uniform float uK; out vec4 o; void main(){ o = texelFetch(uT, ivec2(gl_FragCoord.xy), 0) * uK; }`;
  const FS_TONE = HEAD + `uniform sampler2D uT; uniform float uInk, uExp; out vec4 o;
void main(){ vec3 c = texture(uT, vUv).rgb * uExp; c = 1. - exp(-c); c = pow(c, vec3(.85));
  if (uInk > .5) c = vec3(.955, .94, .91) * (1. - c * .95) + c * .0; else c += vec3(.008, .008, .016);
  o = vec4(c, 1.); }`;
  // plans : on itère chaque point, on dépose sa position dans une carte de densité
  const FS_MAP = HEAD + `uniform sampler2D uS; uniform vec4 uP; uniform int uKind; out vec4 o;
void main(){ vec4 s = texelFetch(uS, ivec2(gl_FragCoord.xy), 0); float x = s.x, y = s.y, a = uP.x, b = uP.y, c = uP.z, d = uP.w;
  vec2 n = uKind == 0 ? vec2(sin(a * y) + c * cos(a * x), sin(b * x) + d * cos(b * y)) : vec2(sin(a * y) - cos(b * x), sin(c * x) - cos(d * y));
  o = vec4(n, 0., 1.); }`;
  const VS_MAP = `#version 300 es
precision highp float; uniform sampler2D uS; uniform vec2 uSc; uniform int uW; void main(){ ivec2 q = ivec2(gl_VertexID % uW, gl_VertexID / uW); vec2 p = texelFetch(uS, q, 0).xy; gl_Position = vec4(p * uSc, 0., 1.); gl_PointSize = 1.; }`;
  const FS_DEP = `#version 300 es
precision highp float; out vec4 o; void main(){ o = vec4(1., 0., 0., 1.); }`;
  const FS_DENS = HEAD + `uniform sampler2D uT; uniform float uNorm, uInk, uHue; out vec4 o;
void main(){ float d = texture(uT, vUv).x; float t = clamp(log(1. + d * uNorm) / log(1. + 400.), 0., 1.);
  vec3 c = .5 + .5 * cos(6.2832 * (uHue + t * .55 + vec3(0., .1, .25))); c = mix(vec3(0.), c, smoothstep(0., .25, t)); c = mix(c, vec3(1., .97, .9), smoothstep(.7, 1., t));
  if (uInk > .5) c = vec3(.955, .94, .91) * (1. - t * .9) * mix(vec3(1.), .5 + .5 * cos(6.2832 * (uHue + vec3(0., .1, .25))), t * .5);
  else c += vec3(.008, .008, .016);
  o = vec4(c, 1.); }`;

  window.FASC.push({
    id: 'attracteur', name: 'L’Attracteur', cat: 'Motifs', glyph: '∞', smoothTime: true,
    blurb: 'Le chaos déterministe, en trois dimensions',
    hint: 'Glissez pour tourner autour. Effet papillon : regardez un nuage de points presque identiques se disperser.',
    intro: 'Trois équations, aucun hasard, et pourtant une trajectoire qui ne se répète jamais et qu’on ne peut pas prévoir longtemps. Chaque point lumineux est un état possible du système ; ensemble, ils dessinent sa forme, un « attracteur étrange », une surface feuilletée infiniment, de dimension fractionnaire.',
    about: [
      'Edward Lorenz, météorologue, relance en 1961 une simulation en arrondissant une valeur au millième : au bout de quelques semaines simulées, le temps n’a plus rien à voir. Il en tire en 1963 un modèle à trois équations et, en 1972, une conférence au titre resté célèbre : « Le battement d’ailes d’un papillon au Brésil peut-il déclencher une tornade au Texas ? »',
      'Le chaos n’est pas le désordre : la trajectoire reste sur l’attracteur, une forme précise. Mais deux points voisins s’écartent exponentiellement vite (pour Lorenz, l’écart est multiplié par e ≈ 2,7 toutes les 1,1 unités de temps environ) ; la moindre imprécision finit par tout recouvrir. Les prévisions météo sont limitées à une dizaine de jours pour cette raison.',
      'Un attracteur étrange s’étire et se replie sans cesse, comme une pâte feuilletée : il a une dimension fractale (2,06 pour Lorenz). Les applications « plans » de Clifford Pickover et de Peter de Jong itèrent une seule formule ; chaque point de l’image est l’endroit où un point est passé, et la lumière est comptée en logarithme.',
      'Le calcul : Runge-Kutta d’ordre 4 en flottants 32 bits sur la carte graphique, des centaines de milliers de pas par seconde. L’effet papillon y est réel : les erreurs d’arrondi elles-mêmes finissent par disperser les particules.',
    ],
    tools: [{ id: 'tourner', label: 'tourner', desc: 'Glissez pour tourner autour de l’attracteur.' }, { id: 'perturber', label: 'perturber', desc: 'Touchez : toutes les particules repartent d’un même point.' }],
    make(env) {
      try { return makeA(env); } catch (e) {
        console.warn('L’Attracteur : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#05050a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('L’Attracteur demande WebGL2 avec textures flottantes.', 20, env.h / 2); } };
      }
    },
  });

  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]; }
  function mul(a, b) { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function look(az, el, d) {
    const ex = Math.cos(el) * Math.sin(az) * d, ey = Math.sin(el) * d, ez = Math.cos(el) * Math.cos(az) * d;
    let zx = ex, zy = ey, zz = ez; const l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = zz, xy = 0, xz = -zx; const l2 = Math.hypot(xx, xy, xz); xx /= l2; xy /= l2; xz /= l2;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * ex + xy * ey + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1];
  }

  function makeA(env) {
    const ctx = env.ctx, W = env.w, H = env.h;
    const dpr = Math.min(1.5, env.dpr || 1), cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    const K = GLKit(cw, ch), gl = K.gl;
    if (!K.full) throw new Error('flottants 32 bits indisponibles');
    const PI = K.program(FS_INIT), PS = K.program(FS_STEP), PP = K.program(FS_PT, VS_PT), PF = K.program(FS_FADE), PT = K.program(FS_TONE), PM = K.program(FS_MAP), PDEP = K.program(FS_DEP, VS_MAP), PDN = K.program(FS_DENS);
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const ink = () => env.theme === 'light';
    const NW = 512, NH = 256, NP = NW * NH;
    const S = K.double(NW, NH, 'f32', gl.NEAREST), A = K.double(cw, ch, 'f16', gl.LINEAR), DN = K.target(cw, ch, 'f16', gl.NEAREST); // demi-flottants : le mélange additif y est toujours permis
    let T = 0, cam = { az: 0.6, el: 0.25 }, toast = null, params = null, spMax = 1, idxColor = false, frames = 0, mp = null;
    const say = (s) => { toast = { s, t: T }; };

    function setP(P) { const a = ATT[keep.att]; PS.use(); gl.uniform1fv(gl.getUniformLocation(PS.p, 'uP[0]'), new Float32Array(params)); PS.i('uAtt', a.id); void P; }
    function init(spread, seed, warm) {
      const a = ATT[keep.att]; params = a.p.slice();
      PI.use().f('uSeed', ...(seed || a.seed)).f('uSpread', spread).f('uRnd', rnd(100)); K.run(PI, S.w); S.swap();
      if (warm) { for (let i = 0; i < 140; i++) step(16); }
      K.clear(A.r); K.clear(A.w);
      spMax = { lorenz: 160, rossler: 30, aizawa: 2.5, thomas: 2.2, halvorsen: 50, dadras: 70 }[keep.att];
    }
    function step(n) {
      const a = ATT[keep.att]; setP();
      PS.use().t('uS', S.r).f('uDt', a.dt).i('uN', n).f('uSeed', ...a.seed).f('uRnd', rnd(100)); K.run(PS, S.w); S.swap();
    }
    /* ───────── effet papillon : deux trajectoires en double précision ───────── */
    let bf = null;
    function lorenzF(v, p) { return [p[0] * (v[1] - v[0]), v[0] * (p[1] - v[2]) - v[1], v[0] * v[1] - p[2] * v[2]]; }
    function rk4(v, h, p) { const f = (q) => lorenzF(q, p), add = (a, b, s) => a.map((x, i) => x + b[i] * s); const k1 = f(v), k2 = f(add(v, k1, h / 2)), k3 = f(add(v, k2, h / 2)), k4 = f(add(v, k3, h)); return v.map((x, i) => x + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); }
    function butterfly() {
      keep.att = 'lorenz'; idxColor = true;
      // un point de départ pris sur l'attracteur (on laisse d'abord une trajectoire s'y installer)
      let s0 = [1, 1, 20]; for (let i = 0; i < 6000; i++) s0 = rk4(s0, ATT.lorenz.dt, ATT.lorenz.p);
      init(1e-3, s0, false);
      bf = { a: s0.slice(), b: [s0[0] + 1e-3, s0[1], s0[2]], t: 0, log: [] };
      say('131 072 points partis à un millième près les uns des autres…');
    }
    function bfStep(dtSim) {
      if (!bf) return; const p = ATT.lorenz.p, h = ATT.lorenz.dt; let n = Math.round(dtSim / h);
      while (n-- > 0) { bf.a = rk4(bf.a, h, p); bf.b = rk4(bf.b, h, p); bf.t += h; }
      const d = Math.hypot(bf.a[0] - bf.b[0], bf.a[1] - bf.b[1], bf.a[2] - bf.b[2]);
      bf.log.push([bf.t, Math.log10(Math.max(1e-9, d))]); if (bf.log.length > 600) bf.log.shift();
    }

    /* ───────── plans ───────── */
    function mapInit() {
      mp = { p: PLANE[keep.map].p.slice(), target: null, t: 0 };
      PI.use().f('uSeed', 0, 0, 0).f('uSpread', 2).f('uRnd', rnd(100)); K.run(PI, S.w); S.swap();
      K.clear(DN); frames = 0;
    }
    function mapStep(k) {
      if (keep.mdrift) {
        mp.t += k;
        if (!mp.target || mp.t > 14) { mp.t = 0; mp.target = keep.map === 'clifford' ? [rnd(2, -2), rnd(2, -2), rnd(1.6, -1.6), rnd(1.6, -1.6)] : [rnd(3, -3), rnd(3, -3), rnd(3, -3), rnd(3, -3)]; }
        for (let i = 0; i < 4; i++) mp.p[i] += (mp.target[i] - mp.p[i]) * Math.min(1, k * 0.08);
      }
      // la densité s'estompe doucement : l'image suit les paramètres qui dérivent
      const tmp = A.w; PF.use().t('uT', DN).f('uK', keep.mdrift ? 0.9 : 1); K.run(PF, tmp);
      gl.bindFramebuffer(gl.FRAMEBUFFER, DN.fb); gl.viewport(0, 0, cw, ch); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      // recopier (le fondu passe par la cible intermédiaire)
      PF.use().t('uT', tmp).f('uK', 1); K.run(PF, DN);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      const v = view(), s = Math.min(v.w, H) / 4.6;
      for (let it = 0; it < 3; it++) {
        PM.use().t('uS', S.r).v4('uP', mp.p).i('uKind', keep.map === 'clifford' ? 0 : 1); gl.disable(gl.BLEND); K.run(PM, S.w); S.swap(); gl.enable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, DN.fb); gl.viewport(0, 0, cw, ch);
        PDEP.use().t('uS', S.r).f('uSc', (s * 2) / W * (keep.map === 'clifford' ? 0.85 : 1), (s * 2) / H * (keep.map === 'clifford' ? 0.85 : 1)).i('uW', NW);
        gl.bindVertexArray(K.emptyVao); gl.drawArrays(gl.POINTS, 0, NP);
      }
      gl.disable(gl.BLEND);
      frames++;
    }

    /* ───────── boucle ───────── */
    function update(k) {
      T += k;
      if (keep.scene === 'plan') { mapStep(k); return; }
      const a = ATT[keep.att], n = clamp(Math.round((k * 60 * 6 * 0.004) / a.dt * (keep.att === 'thomas' ? 3 : 1)), 1, 16);
      step(n);
      if (keep.scene === 'papillon') bfStep(n * a.dt);
      if (keep.spin && !drag) cam.az += k * 0.12;
    }
    function render() {
      const v = view();
      if (keep.scene === 'plan') {
        PDN.use().t('uT', DN).f('uNorm', 6 / Math.max(1, frames * 0.15) * (keep.mdrift ? 2.5 : 1)).f('uInk', ink() ? 1 : 0).f('uHue', keep.map === 'clifford' ? 0.58 : 0.05); K.run(PDN, null);
      } else {
        // traînées : on estompe l'image précédente, on y ajoute les particules
        PF.use().t('uT', A.r).f('uK', keep.scene === 'papillon' ? Math.max(keep.trail, 0.93) : keep.trail); K.run(PF, A.w); A.swap();
        const a = ATT[keep.att], dist = 3.1, P = persp(0.75, W / H, 0.05, 30), shift = ((v.cx - W / 2) / W) * 2;
        let VP = mul(P, look(cam.az, cam.el, dist)); VP = mul([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, shift, 0, 0, 1], VP);
        gl.bindFramebuffer(gl.FRAMEBUFFER, A.r.fb); gl.viewport(0, 0, cw, ch); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        PP.use().t('uS', S.r); gl.uniformMatrix4fv(gl.getUniformLocation(PP.p, 'uVP'), false, new Float32Array(VP));
        PP.f('uC', ...a.c).f('uSc', a.s).f('uSize', Math.max(1, dpr) * (keep.scene === 'papillon' ? 2 : 1)).f('uSpMax', spMax).i('uW', NW).i('uIdx', idxColor ? 1 : 0).f('uB', 0.06 * keep.bright).f('uK', 1).i('uPal', { feu: 0, glace: 1, arcenciel: 2, gris: 3 }[keep.pal]);
        gl.bindVertexArray(K.emptyVao); gl.drawArrays(gl.POINTS, 0, Math.round(NP * keep.n)); gl.disable(gl.BLEND);
        PT.use().t('uT', A.r).f('uInk', ink() ? 1 : 0).f('uExp', 1.4); K.run(PT, null);
      }
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      hud();
    }
    function hud() {
      const v = view(), c = ink() ? 'rgba(40,30,60,.8)' : 'rgba(235,230,255,.78)';
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = c;
      if (keep.scene === 'plan') ctx.fillText(`${PLANE[keep.map].label.toUpperCase()} · a ${fr(mp.p[0])} · b ${fr(mp.p[1])} · c ${fr(mp.p[2])} · d ${fr(mp.p[3])} · ${(NP * 3).toLocaleString('fr-FR')} POINTS PAR IMAGE`, v.x0 + 18, H - 16);
      else {
        const a = ATT[keep.att];
        ctx.fillText(`${a.label.toUpperCase()} · ${a.names.map((n, i) => n + ' = ' + fr(params[i], 3)).join(' · ')} · ${Math.round(NP * keep.n).toLocaleString('fr-FR')} PARTICULES`, v.x0 + 18, H - 16);
      }
      if (keep.scene === 'papillon' && bf && bf.log.length > 2) {
        // l'écart entre deux trajectoires, en échelle logarithmique : une droite = croissance exponentielle
        const x0 = v.x0 + 24, y0 = 80, w = Math.min(280, v.w * 0.32), h = 110, tm = Math.max(30, bf.t);
        ctx.strokeStyle = ink() ? 'rgba(40,30,60,.3)' : 'rgba(235,230,255,.25)'; ctx.strokeRect(x0, y0, w, h);
        ctx.strokeStyle = ink() ? '#c2368f' : '#ff8ad8'; ctx.lineWidth = 1.5; ctx.beginPath();
        bf.log.forEach(([t, l], i) => { const x = x0 + (t / tm) * w, y = y0 + h - ((l + 7) / 9) * h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.lineWidth = 1;
        const lastL = bf.log[bf.log.length - 1][1];
        ctx.fillStyle = c; ctx.fillText('ÉCART ENTRE DEUX TRAJECTOIRES (ÉCHELLE LOG)', x0, y0 - 8);
        ctx.fillText(`${lastL < 0 ? '10' + sup(Math.round(lastL)) : fr(Math.pow(10, lastL), 1)} · T = ${fr(bf.t, 1)}`, x0, y0 + h + 16);
      }
      if (toast && T - toast.t < 5) { ctx.globalAlpha = Math.min(1, (5 - (T - toast.t)) * 1.2); ctx.textAlign = 'center'; ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.fillText(toast.s, v.cx, 70); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    }
    const sup = (n) => String(n).split('').map((ch) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(ch)]).join('');
    function setScene(id) {
      keep.scene = id; toast = null; bf = null; idxColor = false;
      if (id === 'att') { init({ lorenz: 6, rossler: 7, aizawa: 0.6, thomas: 2.5, halvorsen: 4, dadras: 3 }[keep.att], null, true); say(ATT[keep.att].why); }
      else if (id === 'papillon') butterfly();
      else mapInit();
    }
    let drag = null;
    setScene(keep.scene);
    if (window.FASC_DEBUG) window.FASC_DEBUG.att = { keep, setScene, cam, peek: (i) => [...K.read(S.r, i % NW, Math.floor(i / NW))], run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); } };

    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) {
        if (env.tool === 'perturber' && keep.scene !== 'plan') { const a = ATT[keep.att]; init(1e-4, a.seed, false); idxColor = true; say('Toutes repartent du même point, à un dix-millième près.'); return; }
        drag = { x: p.x, y: p.y };
      },
      move(p) { if (!p.down || !drag) return; cam.az -= (p.x - drag.x) * 0.006; cam.el = clamp(cam.el + (p.y - drag.y) * 0.005, -1.4, 1.4); drag = { x: p.x, y: p.y }; },
      up() { drag = null; },
      clear() { setScene(keep.scene); },
      dispose() { K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'Attracteurs', act: () => setScene('att') },
          { label: 'Effet papillon', act: () => setScene('papillon') },
          { label: 'Plans', act: () => setScene('plan') },
        ] }];
        if (keep.scene === 'att') {
          L.push({ type: 'section', label: 'Attracteur' });
          L.push({ type: 'choice', label: 'Système', value: keep.att, set: (x) => { keep.att = x; setScene('att'); }, options: Object.keys(ATT).map((k) => ({ id: k, label: ATT[k].label })) });
          L.push({ type: 'note', text: ATT[keep.att].why });
          const a = ATT[keep.att];
          a.names.forEach((n, i) => { const v0 = a.p[i]; L.push({ type: 'slider', label: n, min: v0 * 0.7, max: v0 * 1.3 || 1, step: Math.abs(v0) / 200 || 0.01, value: params[i], fmt: (x) => fr(x, 3), set: (x) => { params[i] = x; } }); });
          L.push({ type: 'buttons', items: [{ label: 'Valeurs classiques', act: () => { params = ATT[keep.att].p.slice(); } }] });
        } else if (keep.scene === 'papillon') {
          L.push({ type: 'section', label: 'Papillon' });
          L.push({ type: 'buttons', items: [{ label: 'Recommencer', act: () => butterfly() }] });
          L.push({ type: 'note', text: 'Au début, le nuage reste un seul point lumineux qui parcourt l’attracteur. Puis il s’étire en filament, et, en une vingtaine d’unités de temps, se répand sur les deux ailes : on ne sait plus rien de la position de départ. Sur la courbe, la pente est l’exposant de Lyapunov (≈ 0,9 pour Lorenz). En flottants 32 bits, la carte graphique ne distingue pas des écarts plus fins qu’environ un millionième : d’où ce millième de départ.' });
        } else {
          L.push({ type: 'section', label: 'Plan' });
          L.push({ type: 'choice', label: 'Formule', value: keep.map, set: (x) => { keep.map = x; mapInit(); }, options: Object.keys(PLANE).map((k) => ({ id: k, label: PLANE[k].label })) });
          L.push({ type: 'toggle', label: 'Les paramètres dérivent', value: keep.mdrift, set: (x) => { keep.mdrift = x; K.clear(DN); frames = 0; } });
          L.push({ type: 'buttons', items: [{ label: 'Autres paramètres', act: () => { mp.target = null; mp.t = 99; if (!keep.mdrift) { mp.p = keep.map === 'clifford' ? [rnd(2, -2), rnd(2, -2), rnd(1.6, -1.6), rnd(1.6, -1.6)] : [rnd(3, -3), rnd(3, -3), rnd(3, -3), rnd(3, -3)]; K.clear(DN); frames = 0; } } }] });
        }
        if (keep.scene !== 'plan') {
          L.push({ type: 'section', label: 'Rendu' });
          L.push({ type: 'choice', label: 'Couleurs', value: keep.pal, set: (x) => { keep.pal = x; }, options: [{ id: 'feu', label: 'Feu (selon la vitesse)' }, { id: 'glace', label: 'Glace' }, { id: 'arcenciel', label: 'Arc-en-ciel' }, { id: 'gris', label: 'Argent' }] });
          L.push({ type: 'slider', label: 'Traînées', min: 0, max: 0.97, step: 0.01, value: keep.trail, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.trail = x; } });
          L.push({ type: 'slider', label: 'Éclat', min: 0.2, max: 4, step: 0.01, value: keep.bright, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.bright = x; } });
          L.push({ type: 'slider', label: 'Particules', min: 0.1, max: 1, step: 0.05, value: keep.n, fmt: (x) => Math.round(NP * x).toLocaleString('fr-FR'), set: (x) => { keep.n = x; } });
          L.push({ type: 'toggle', label: 'Rotation lente', value: keep.spin, set: (x) => { keep.spin = x; } });
        }
        return L;
      },
    };
  }
})();
