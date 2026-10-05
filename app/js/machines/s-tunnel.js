/* Fascination — Le Tunnel · vers la vitesse de la lumière, trou de ver, porte des étoiles, démoscène (WebGL2)
   Relativiste : un champ d'étoiles traversé à vitesse β ; chaque étoile est vue dans sa direction aberrée
   (cos θ' = (cos θ + β)/(1 + β cos θ)), avec sa température multipliée par le facteur Doppler D et son éclat
   par D³ ; le rayonnement fossile à 2,725 K devient visible droit devant quand D dépasse quelques centaines.
   Projection « fisheye » équidistante pour voir tout le ciel compressé vers l'avant.
   Trou de ver : géodésiques de lumière dans la métrique d'Ellis (gorge de rayon 1), intégrées par pixel ;
   un autre ciel de l'autre côté. Porte des étoiles : couloir de lumière façon « slit-scan » (2001, 1968).
   Démoscène : le tunnel classique (damier, vortex, plasma), piloté au doigt. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const QUAL = { legere: { n: 120, res: 0.5, worm: 0.45, steps: 120 }, normale: { n: 200, res: 0.75, worm: 0.6, steps: 170 }, haute: { n: 280, res: 1, worm: 0.75, steps: 220 } };

  const BB = `
vec3 bb(float T){
  T = clamp(T, 800., 60000.) / 100.;
  float r = T <= 66. ? 1. : clamp(1.29293618 * pow(T - 60., -.1332047592), 0., 1.);
  float g = T <= 66. ? clamp(.39008157876 * log(T) - .63184144378, 0., 1.) : clamp(1.12989086 * pow(T - 60., -.0755148492), 0., 1.);
  float b = T >= 66. ? 1. : (T <= 19. ? 0. : clamp(.54320678911 * log(T - 10.) - 1.19625408914, 0., 1.));
  return vec3(r, g, b);
}`;
  /* ───────── relativiste : étoiles en points ───────── */
  const VS_STAR = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uS; uniform int uSide; uniform float uZ, uBox, uBeta, uGam, uFov, uR, uPx, uDop, uAb, uGain;
uniform vec2 uRes, uC, uLook;
out vec3 vCol;
${BB}
void main(){
  int id = gl_VertexID; ivec2 tc = ivec2(id % uSide, id / uSide);
  vec4 S = texelFetch(uS, tc, 0);
  // position de l'étoile dans le repère des étoiles, relative au vaisseau (boîte répétée le long de z)
  vec3 p = S.xyz; p.z = mod(p.z - uZ + uBox * .5, uBox) - uBox * .5;
  float d = length(p); vec3 n = p / d;
  float ct = n.z, phi = atan(n.y, n.x);
  float b = uBeta * uAb;
  float ct2 = (ct + b) / (1. + b * ct);                         // aberration
  float D = mix(1., uGam * (1. + uBeta * ct2), uDop);            // facteur Doppler
  float th = acos(clamp(ct2, -1., 1.));
  // regard un peu dévié par le pilote
  vec2 q = vec2(cos(phi), sin(phi)) * th;
  q -= uLook;
  float rr = length(q);
  vec2 sp = q / uFov * uR;
  gl_Position = vec4((uC + sp) / uRes * 2. - 1., 0., 1.);
  if (rr > uFov * 1.05) gl_Position = vec4(9., 9., 0., 1.);
  float near = clamp(40. / d, .5, 5.);
  float T = S.w * D;
  // éclat ∝ D³ en physique ; à l'écran on le comprime pour garder des étoiles distinctes
  float I = min(pow(clamp(D, .02, 1e4), 2.), 8.) * near * near * .18;
  gl_PointSize = clamp(uPx * (1. + log(1. + I) * .6), 1., 6.);
  vCol = bb(T) * min(I, 6.) * uGain;
}`;
  const FS_STAR = `#version 300 es
precision highp float; in vec3 vCol; out vec4 o;
void main(){ vec2 d = gl_PointCoord - .5; float k = exp(-dot(d, d) * 16.); o = vec4(vCol * k, k); }`;
  // fond relativiste : rayonnement fossile décalé par Doppler, vu dans la même projection
  const FS_RELBG = HEAD + BB + `
uniform vec2 uRes, uC, uLook; uniform float uBeta, uGam, uFov, uR, uDop, uDecor, uInk;
uniform sampler2D uA, uB1, uB2;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 q = (px - uC) / uR * uFov + uLook;
  float th = length(q);
  vec3 col = vec3(0.);
  if (th < 3.1415 && uDecor > .5){
    float ct2 = cos(th), D = mix(1., uGam * (1. + uBeta * ct2), uDop);
    float T = 2.725 * D;
    // brillance du fond diffus ∝ T⁴, visible seulement quand T atteint des centaines de kelvins
    float I = pow(T / 2500., 4.);
    col += bb(T) * clamp(I, 0., 30.) * .4;
  }
  col += min(texture(uA, vUv).rgb + texture(uB1, vUv).rgb * .45 + texture(uB2, vUv).rgb * .35, vec3(50.));
  col = aces(col);
  if (uInk > .5){ float l = dot(col, vec3(.3, .55, .15)); col = vec3(.953, .933, .89) * (1. - .9 * l); }
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;
  const FS_BLUR = HEAD + `uniform sampler2D uT; uniform vec2 uDir; out vec4 o;
void main(){ vec4 s = texture(uT, vUv) * .227; s += (texture(uT, vUv + uDir * 1.385) + texture(uT, vUv - uDir * 1.385)) * .316; s += (texture(uT, vUv + uDir * 3.23) + texture(uT, vUv - uDir * 3.23)) * .07; o = s; }`;

  /* ───────── trou de ver d'Ellis ───────── */
  const FS_WORM = HEAD + BB + `
uniform vec2 uRes; uniform float uL, uT, uSteps, uFov, uYaw, uPitch, uDecor, uInk;
out vec4 o;
vec3 skyA(vec3 d){ // notre ciel : étoiles et Voie lactée
  vec2 sp = vec2(atan(d.z, d.x), asin(clamp(d.y, -1., 1.)));
  vec2 g = floor(sp * 160.); float h = hash12(g);
  vec3 c = step(.994, h) * mix(vec3(1., .85, .7), vec3(.7, .8, 1.), hash12(g + 3.)) * (.5 + 2.5 * pow(hash12(g + 9.), 8.));
  float band = exp(-pow((d.y + .3 * sin(sp.x * 1.3)) * 3.5, 2.));
  c += band * (vec3(.05, .042, .035) * fbm(sp * 7.) + vec3(.006, .005, .004));
  c += vec3(1., .9, .7) * pow(max(dot(d, normalize(vec3(.6, .3, .7))), 0.), 900.) * 3.; // une étoile proche
  return c;
}
vec3 skyB(vec3 d){ // l'autre univers : nébuleuse colorée et une géante gazeuse
  vec2 sp = vec2(atan(d.z, d.x), asin(clamp(d.y, -1., 1.)));
  float n = fbm(sp * 3. + vec2(uT * .01, 0.)), m = fbm(sp * 6. - 4.);
  vec3 c = mix(vec3(.02, .05, .09), vec3(.35, .08, .25), smoothstep(.35, .75, n)) + vec3(.05, .25, .3) * smoothstep(.55, .85, m) * .8;
  vec2 g = floor(sp * 200.); c += step(.996, hash12(g)) * vec3(.9, .95, 1.);
  vec3 pc = normalize(vec3(-.4, .2, -.9));
  float pd = acos(clamp(dot(d, pc), -1., 1.));
  if (pd < .22){ float k = pd / .22; c = mix(vec3(.85, .65, .4) * (.6 + .4 * sin(asin(d.y - pc.y) * 60.)), c, smoothstep(.95, 1., k)) * (1. - .5 * k * k); }
  return c;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - uRes * .5) / uRes.y;
  // repère local : l'axe radial pointe vers la gorge ; le regard peut tourner
  vec3 dir = normalize(vec3(uv * uFov, 1.));
  float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), spp = sin(uPitch);
  dir = vec3(dir.x, dir.y * cp - dir.z * spp, dir.y * spp + dir.z * cp);
  dir = vec3(dir.x * cy + dir.z * sy, dir.y, -dir.x * sy + dir.z * cy);
  float l = uL, r0 = sqrt(1. + l * l);
  // la lumière part vers la gorge si l > 0 (vers les l décroissants)
  float ca = dir.z;                      // cosinus de l'angle avec l'axe radial (vers la gorge)
  vec3 tang = dir - vec3(0., 0., ca); float sa = length(tang); tang = sa > 1e-5 ? tang / sa : vec3(1., 0., 0.);
  float Lm = r0 * sa;                    // moment cinétique conservé
  float pl = -sign(l + 1e-6) * ca;       // dl/dλ
  float ph = 0.;
  for (int i = 0; i < 400; i++){
    if (float(i) >= uSteps) break;
    float r2 = 1. + l * l;
    float h = clamp(.06 * sqrt(r2), .02, 1.2);
    pl += Lm * Lm * l / (r2 * r2) * h;
    l += pl * h;
    ph += Lm / r2 * h;
    if (abs(l) > 40.) break;
  }
  // direction d'où vient la lumière : position angulaire ph autour de la gorge, dans le plan du rayon,
  // comptée depuis la direction du vaisseau (−z vu du vaisseau) ; l > 0 : notre univers, l < 0 : l'autre
  vec3 fin = normalize(cos(ph) * vec3(0., 0., -1.) + sin(ph) * tang);
  bool ours = l > 0.;
  vec3 col = uDecor > .5 ? (ours ? skyA(fin) : skyB(fin)) : (ours ? vec3(0.) : vec3(.8, .85, 1.) * (.3 + .7 * fbm(vec2(atan(fin.z, fin.x), fin.y) * 5.)));
  col = 1. - exp(-col * 1.6);
  if (uInk > .5){ float k = dot(col, vec3(.3, .55, .15)); col = vec3(.953, .933, .89) * (1. - .9 * k); }
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;

  /* ───────── porte des étoiles (slit-scan) ───────── */
  const FS_GATE = HEAD + `
uniform vec2 uRes; uniform float uT, uSpeed, uWalls, uHue, uInk; out vec4 o;
vec3 hsv(float h, float s, float v){ vec3 k = clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); return v * mix(vec3(1.), k, s); }
vec3 plane(float x, float z, float side){
  // des fentes de lumière parallèles à la marche, dont la couleur change lentement avec la distance
  float cell = floor(x * 2.2 + side * 7.), fx = fract(x * 2.2) - .5;
  float w = .05 + .3 * hash12(vec2(cell, side));
  float slit = smoothstep(w, 0., abs(fx));
  float seg = floor(z * .08 + hash12(vec2(cell, 3.)) * 10.);
  float on = step(.35, hash12(vec2(cell, seg)));
  float pulse = .6 + .4 * sin(z * .35 + cell * 1.7);
  vec3 c = hsv(fract(uHue + .07 * cell + .13 * seg + side * .3), .75, 1.);
  float grid = smoothstep(.03, 0., abs(fract(z * .5) - .5)) * .25;
  return c * (slit * on * pulse + grid * .25 * on);
}
void main(){
  vec2 p = (gl_FragCoord.xy - uRes * .5) / uRes.y;
  vec3 d = normalize(vec3(p, .8));
  vec3 col = vec3(0.);
  float z0 = uT * uSpeed;
  if (abs(d.y) > 1e-3){ float t = 1. / abs(d.y); vec3 h = d * t; col += plane(h.x, h.z + z0, sign(d.y)) * (1. - exp(-t * .05)) * exp(-t * .004); }
  if (uWalls > .5 && abs(d.x) > 1e-3){ float t = 1.5 / abs(d.x); vec3 h = d * t; if (abs(h.y) < 1.) col += plane(h.y * 1.6 + 5., h.z + z0, sign(d.x) * 2.) * (1. - exp(-t * .05)) * exp(-t * .004) * .8; }
  col += vec3(1., .95, .9) * exp(-length(p) * 9.) * .5;
  col = 1. - exp(-col * 1.4);
  if (uInk > .5){ float k = dot(col, vec3(.3, .55, .15)); col = vec3(.953, .933, .89) * (1. - .9 * k); }
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;

  /* ───────── tunnel de la démoscène ───────── */
  const FS_DEMO = HEAD + `
uniform vec2 uRes, uC; uniform float uT, uTex, uSpeed, uInk; out vec4 o;
vec3 hsv(float h, float s, float v){ vec3 k = clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); return v * mix(vec3(1.), k, s); }
void main(){
  vec2 p = (gl_FragCoord.xy - uC) / uRes.y;
  float r = length(p), a = atan(p.y, p.x);
  float depth = .28 / max(r, 1e-3);
  float z = depth + uT * uSpeed;
  float u = a / 6.2831853;
  float v;
  if (uTex < .5){ vec2 g = vec2(u * 16., z * 3.); vec2 f = abs(fract(g) - .5); float e = fwidth(g.x) + fwidth(g.y); v = mix(.12, 1., smoothstep(-e, e, (f.x - .25) * (f.y - .25) * -4.) ); v = (mod(floor(g.x) + floor(g.y), 2.) < .5) ? 1. : .14; }
  else if (uTex < 1.5){ v = .5 + .5 * sin(a * 5. + z * 9. + sin(z * 3. - uT) * 2.); v = pow(v, 2.); }
  else { v = .5 + .5 * sin(z * 6. + uT * 1.7) * sin(a * 3. - uT * .9) * cos(z * 2.5 + a * 2. + uT); v = pow(clamp(v, 0., 1.), 1.5); }
  vec3 c = hsv(fract(depth * .16 + uT * .05 + a * .05), .7, 1.) * v;
  c *= clamp(r * 3.2, 0., 1.);                       // le fond du tunnel s'éteint
  c += vec3(1.) * exp(-r * 16.) * .6;                // la lumière au bout
  if (uInk > .5){ float k = dot(c, vec3(.3, .55, .15)); c = vec3(.953, .933, .89) * (1. - .9 * k); }
  o = vec4(pow(c, vec3(.9)), 1.);
}`;

  window.FASC.push({
    id: 'tunnel', name: 'Le Tunnel', cat: 'Cosmos', glyph: '◉', decor: true, smoothTime: true,
    blurb: 'Vers la vitesse de la lumière, trou de ver, porte des étoiles',
    hint: 'OBSERVER : touchez pour savoir ce que vous voyez · PILOTER : glissez pour regarder ailleurs (ou déplacer le bout du tunnel) · ACCÉLÉRER : maintenez pour aller plus vite.',
    intro: 'Un vaisseau qui accélère jusqu’à frôler la vitesse de la lumière : le ciel se resserre devant lui, bleuit, puis s’embrase d’une lueur venue du Big Bang. Plus loin, un trou de ver ouvre une fenêtre sur un autre univers. Et pour finir, deux couloirs de lumière : celui de 2001, et celui des démos de 1993.',
    legend: [
      { color: '#9fc4ff', name: 'Aberration', role: 'le ciel se resserre vers l’avant', desc: 'Comme la pluie qui semble tomber de face quand on court, la lumière des étoiles paraît venir de devant. À 99 % de la vitesse de la lumière, la moitié du ciel tient dans un cône de 16°.' },
      { color: '#ffb070', name: 'Effet Doppler', role: 'bleu devant, rouge derrière', desc: 'Devant, les ondes se tassent : les étoiles bleuissent et brillent davantage. Derrière, elles rougissent et s’éteignent.' },
      { color: '#ff7040', name: 'Fond diffus cosmologique', role: '2,725 K · lumière du Big Bang', desc: 'Partout dans le ciel, une lueur micro-onde très froide. Au-delà de γ ≈ 400, l’effet Doppler la décale dans le visible : un disque de feu apparaît droit devant.' },
      { color: '#c09aff', name: 'Gorge du trou de ver', role: 'métrique d’Ellis · 1973', desc: 'Une sphère que l’on traverse pour déboucher dans une autre région de l’espace. On y voit l’autre ciel, déformé comme dans une boule de cristal.' },
      { color: '#ff9cf0', name: 'Slit-scan', role: '2001, l’Odyssée de l’espace · 1968', desc: 'Douglas Trumbull filmait une fente lumineuse devant laquelle glissaient des motifs, en pose longue, image par image : des couloirs de lumière infinis.' },
      { color: '#79f3b4', name: 'Tunnel de démo', role: 'démoscène · années 1990', desc: 'Un effet calculé en temps réel sur des ordinateurs de 33 MHz : une table d’angles et de profondeurs suffit à faire défiler une texture à l’infini.' },
    ],
    about: [
      'Si l’on accélère vers la vitesse de la lumière, le ciel ne file pas sur les côtés comme dans les films : il se resserre vers l’avant. C’est l’aberration de la lumière, mesurée par James Bradley dès 1727 avec la vitesse de la Terre autour du Soleil (20 secondes d’arc). La relativité d’Einstein (1905) en donne la forme exacte : cos θ′ = (cos θ + β) / (1 + β cos θ). Dans les années 1970, on a prédit qu’un « arc-en-ciel d’étoiles » apparaîtrait en anneau autour de la direction de vol ; les calculs détaillés de 1979 ont montré qu’il n’existe pas. Les étoiles changent de couleur, mais sans anneau net : c’est ce que montre la simulation.',
      'Le facteur de Lorentz γ dit combien le temps de bord ralentit. À γ = 10, une année à bord en vaut dix sur Terre. Le fond diffus cosmologique, émis 380 000 ans après le Big Bang et refroidi à 2,725 K, devient visible devant le vaisseau vers γ ≈ 400 : un soleil rouge qui n’est fait que du passé de l’Univers.',
      'Les trous de ver sont des solutions des équations d’Einstein (Einstein et Rosen, 1935). Celui d’Ellis (1973) a une gorge qu’on pourrait traverser, à condition de la maintenir ouverte avec une matière d’énergie négative qu’on ne sait pas fabriquer. Pour le film Interstellar (2014), Kip Thorne et l’équipe de Double Negative ont calculé son image avec les mêmes équations que celles utilisées ici : on voit l’autre univers dans une sphère, entouré d’un anneau de notre propre ciel déformé.',
      'Le couloir de lumière de 2001 n’a rien d’une image de synthèse : Douglas Trumbull a construit une machine à fente (slit-scan) dont chaque image demandait une minute de pose. Vingt-cinq ans plus tard, les jeunes programmeurs de la démoscène (Future Crew, Second Reality, 1993) faisaient défiler des tunnels en temps réel, en trichant intelligemment avec des tables précalculées.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez le ciel ou le tunnel : ce que vous voyez et pourquoi.' },
      { id: 'piloter', label: 'piloter', desc: 'Glissez pour regarder ailleurs ; dans le tunnel de démo, pour déplacer le bout du tunnel.' },
      { id: 'accelerer', label: 'accélérer', desc: 'Maintenez le doigt pour pousser les moteurs ; relâchez pour ralentir.' },
    ],
    make(env) {
      try { return makeTun(env); } catch (e) {
        console.warn('Le Tunnel : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#000'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Le Tunnel demande WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeTun(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = { scene: 'relat', q: 'haute', lg: 0.0, auto: true, fov: 1.6, dop: 1, ab: 1, wormSpeed: 0.5, wormAuto: true, wl: 6, gate: 1, walls: true, demoTex: 0, demoSpeed: 1 };
    let T = 0, R = null, label = null, look = [0, 0], boost = false;

    function initGL() {
      const Q = QUAL[cfg.q], s = Math.min(Q.res * dpr, dpr);
      const cw = Math.max(64, Math.round(W * s)), ch = Math.max(64, Math.round(H * s));
      const K = GLKit(cw, ch), gl = K.gl;
      const side = Q.n, n = side * side, data = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        // étoiles dans une boîte de 400 unités, températures selon la population (les naines rouges dominent)
        const u = Math.random(), T0 = u < 0.6 ? 3000 + Math.random() * 1000 : u < 0.85 ? 4500 + Math.random() * 1700 : u < 0.97 ? 7000 + Math.random() * 3000 : 12000 + Math.random() * 18000;
        data.set([rnd(200, -200), rnd(200, -200), rnd(200, -200), T0], i * 4);
      }
      const st = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, st); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, side, side, 0, gl.RGBA, gl.FLOAT, data);
      for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
      return {
        K, gl, Q, cw, ch, side, n, st, dyn: 1, ft: 30, last: 0,
        pg: { star: K.program(FS_STAR, VS_STAR), relbg: K.program(FS_RELBG), blur: K.program(FS_BLUR), worm: K.program(FS_WORM), gate: K.program(FS_GATE), demo: K.program(FS_DEMO) },
        A: K.target(cw, ch), b1: K.target(cw >> 1, ch >> 1), b1t: K.target(cw >> 1, ch >> 1), b2: K.target(cw >> 2, ch >> 2), b2t: K.target(cw >> 2, ch >> 2),
      };
    }
    R = initGL();

    /* ───────── vitesse : on règle log10(γ) ───────── */
    const gam = () => Math.pow(10, cfg.lg);
    const beta = () => Math.sqrt(Math.max(0, 1 - 1 / (gam() * gam())));
    function betaTxt() {
      const b = beta();
      if (b < 0.9) return fr(b * 100, 1) + ' %';
      const one = 1 - b, nines = Math.max(1, Math.floor(-Math.log10(one)));
      return (b * 100).toFixed(Math.min(10, nines + 1)).replace('.', ',') + ' %';
    }
    let Z = 0;

    /* ───────── son ───────── */
    let drone = null, wind = null;
    if (snd()) {
      drone = au.drone(55, 'sawtooth', 0); drone.cut(300);
      const c = au.ensure();
      if (c) { const s = c.createBufferSource(); s.buffer = au.noiseBuf(); s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.7; const g = c.createGain(); g.gain.value = 0.0001; s.connect(f); f.connect(g); g.connect(au.master); s.start(); wind = { s, f, g }; }
    }

    /* ───────── boucle ───────── */
    function update(dt) {
      const k = dt / 0.4;
      T += k;
      if (cfg.scene === 'relat') {
        if (boost) cfg.lg = Math.min(3.3, cfg.lg + k * 0.25);
        else if (cfg.auto) cfg.lg = 1.65 + 1.65 * Math.sin(T * 0.05 - 1.5707);
        Z += k * beta() * 60;
      }
      if (cfg.scene === 'worm' && cfg.wormAuto) cfg.wl = 7 * Math.cos(T * 0.06 * cfg.wormSpeed * 2);
      if (cfg.scene === 'gate' && boost) cfg.gate = Math.min(4, cfg.gate + k * 0.6); else if (cfg.scene === 'gate') cfg.gate += (1 - cfg.gate) * Math.min(1, k * 0.5);
      if (drone) { const f = cfg.scene === 'relat' ? 40 + 30 * cfg.lg : cfg.scene === 'worm' ? 45 + 20 / (1 + cfg.wl * cfg.wl) * 3 : 55; drone.set(f); drone.gain(0.02); }
      if (wind) { wind.g.gain.setTargetAtTime(cfg.scene === 'relat' ? 0.01 + 0.04 * beta() : cfg.scene === 'gate' ? 0.03 * cfg.gate : 0.008, au.ctx.currentTime, 0.3); wind.f.frequency.setTargetAtTime(cfg.scene === 'relat' ? 300 + 1500 * beta() : 600, au.ctx.currentTime, 0.3); }
      if (label) label.t += k;
    }
    function adapt() {
      const now = performance.now(), d = now - R.last; R.last = now;
      if (d > 0 && d < 500) R.ft += (d - R.ft) * 0.1;
      if (R.ft > 42) R.dyn = Math.max(0.35, R.dyn * 0.97); else if (R.ft < 24) R.dyn = Math.min(1, R.dyn * 1.02);
      return R.dyn;
    }
    function blitPart(cw, ch, offX) {
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.imageSmoothingEnabled = true;
      ctx.drawImage(R.K.canvas, 0, R.K.canvas.height - ch, cw, ch, offX || 0, 0, W, H);
      if (offX) { ctx.fillStyle = '#000'; if (offX > 0) ctx.fillRect(0, 0, offX, H); else ctx.fillRect(W + offX, 0, -offX, H); }
      ctx.restore();
    }
    function render() {
      const { K, gl, pg } = R, v = view();
      const bare = env.decor === false, ink = bare && env.theme === 'light';
      if (cfg.scene === 'relat') {
        const rad = Math.min(v.w, H) * 0.5 * (R.cw / W), cx = (v.cx / W) * R.cw, cy = R.ch / 2;
        gl.bindFramebuffer(gl.FRAMEBUFFER, R.A.fb); gl.viewport(0, 0, R.cw, R.ch); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        pg.star.use().t('uS', R.st).i('uSide', R.side).f('uZ', Z).f('uBox', 400).f('uBeta', beta()).f('uGam', gam()).f('uFov', cfg.fov).f('uR', rad).f('uPx', (R.ch / 800) * 1.6).f('uDop', cfg.dop).f('uAb', cfg.ab).f('uGain', 0.9)
          .f('uRes', R.cw, R.ch).f('uC', cx, cy).f('uLook', look[0], look[1]);
        gl.bindVertexArray(K.emptyVao); gl.drawArrays(gl.POINTS, 0, R.n);
        gl.disable(gl.BLEND);
        const blur = (src, tmp, dst) => { pg.blur.use().t('uT', src).f('uDir', 1.5 / src.w, 0); K.run(pg.blur, tmp); pg.blur.use().t('uT', tmp).f('uDir', 0, 1.5 / tmp.h); K.run(pg.blur, dst); };
        blur(R.A, R.b1t, R.b1); blur(R.b1, R.b2t, R.b2);
        pg.relbg.use().t('uA', R.A).t('uB1', R.b1).t('uB2', R.b2).f('uRes', R.cw, R.ch).f('uC', cx, cy).f('uLook', look[0], look[1]).f('uBeta', beta()).f('uGam', gam()).f('uFov', cfg.fov).f('uR', rad).f('uDop', cfg.dop).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0);
        K.run(pg.relbg, null);
        blitPart(R.cw, R.ch, 0);
      } else if (cfg.scene === 'worm') {
        const s = Math.min(1, (R.Q.worm / R.Q.res) * adapt()), cw = Math.max(32, Math.round(R.cw * s)), ch = Math.max(32, Math.round(R.ch * s));
        pg.worm.use().f('uRes', cw, ch).f('uL', cfg.wl).f('uT', T).f('uSteps', R.Q.steps).f('uFov', 1.1).f('uYaw', look[0]).f('uPitch', look[1]).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0);
        K.run(pg.worm, { fb: null, w: cw, h: ch });
        blitPart(cw, ch, v.cx - W / 2);
      } else if (cfg.scene === 'gate') {
        const s = Math.min(1, adapt()), cw = Math.max(32, Math.round(R.cw * s)), ch = Math.max(32, Math.round(R.ch * s));
        pg.gate.use().f('uRes', cw, ch).f('uT', T).f('uSpeed', 3 * cfg.gate).f('uWalls', cfg.walls ? 1 : 0).f('uHue', T * 0.004).f('uInk', ink ? 1 : 0);
        K.run(pg.gate, { fb: null, w: cw, h: ch });
        blitPart(cw, ch, v.cx - W / 2);
      } else {
        const s = Math.min(1, adapt()), cw = Math.max(32, Math.round(R.cw * s)), ch = Math.max(32, Math.round(R.ch * s));
        const cx = ((v.cx + look[0] * v.w * 0.35) / W) * cw, cy = ch / 2 - look[1] * ch * 0.35;
        pg.demo.use().f('uRes', cw, ch).f('uC', cx, cy).f('uT', T).f('uTex', cfg.demoTex).f('uSpeed', cfg.demoSpeed * (boost ? 3 : 1)).f('uInk', ink ? 1 : 0);
        K.run(pg.demo, { fb: null, w: cw, h: ch });
        blitPart(cw, ch, 0);
      }
      hud(ink);
      drawLabel();
    }
    function hud(ink) {
      const v = view();
      ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink ? 'rgba(40,30,80,.75)' : 'rgba(230,228,255,.7)';
      let s = '';
      if (cfg.scene === 'relat') { const g = gam(); s = `v = ${betaTxt()} DE LA VITESSE DE LA LUMIÈRE · γ = ${g < 100 ? fr(g, 2) : Math.round(g).toLocaleString('fr-FR')} · 1 AN À BORD = ${g < 100 ? fr(g, 1) : Math.round(g).toLocaleString('fr-FR')} ANS SUR TERRE`; }
      if (cfg.scene === 'worm') s = `TROU DE VER D’ELLIS · ${Math.abs(cfg.wl) < 0.3 ? 'DANS LA GORGE' : cfg.wl > 0 ? 'DE NOTRE CÔTÉ' : 'DANS L’AUTRE UNIVERS'} · ${fr(Math.abs(cfg.wl), 1)} RAYONS DE LA GORGE`;
      if (cfg.scene === 'gate') s = 'PORTE DES ÉTOILES · SLIT-SCAN (TRUMBULL, 1968)';
      if (cfg.scene === 'demo') s = 'TUNNEL DE DÉMOSCÈNE · ' + ['DAMIER', 'VORTEX', 'PLASMA'][cfg.demoTex];
      ctx.fillText(s, v.x0 + 16, H - 16); ctx.restore();
    }
    let pending = false;
    function frame(t, dt) {
      if (dt > 0) update(dt);
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    /* ───────── identification ───────── */
    function describe(l) {
      const v = view();
      if (cfg.scene === 'relat') {
        const rad = Math.min(v.w, H) * 0.5, qx = ((l.x - v.cx) / rad) * cfg.fov + look[0], qy = (-(l.y - H / 2) / rad) * cfg.fov + look[1];
        const th = Math.hypot(qx, qy), b = beta(), g = gam(), ct2 = Math.cos(th), D = g * (1 + b * ct2), ct = (ct2 - b) / (1 - b * ct2), th0 = Math.acos(clamp(ct, -1, 1));
        const deg = (x) => Math.round((x * 180) / Math.PI);
        return [th < 0.25 ? 'Droit devant' : th > 2.6 ? 'Vers l’arrière' : 'Le ciel déformé', `vu à ${deg(th)}° de l’avant · en réalité à ${deg(th0)}° · lumière ${D > 1 ? 'bleuie' : 'rougie'} d’un facteur ${fr(D, D < 10 ? 2 : 0)}${2.725 * D > 600 ? ' · fond cosmologique à ' + Math.round(2.725 * D) + ' K' : ''}`, D > 1 ? '#9fc4ff' : '#ffb070'];
      }
      if (cfg.scene === 'worm') return [Math.abs(cfg.wl) < 1.5 ? 'Gorge du trou de ver' : 'Lentille du trou de ver', 'au centre, l’autre univers ; autour, notre ciel courbé par la gorge, plusieurs fois', '#c09aff'];
      if (cfg.scene === 'gate') return ['Couloir de lumière', 'deux plans de fentes lumineuses qui défilent, comme dans la machine de Trumbull', '#ff9cf0'];
      return ['Tunnel', 'chaque pixel lit un angle et une profondeur 1/r : la texture défile sans fin', '#79f3b4'];
    }
    function drawLabel() {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (6 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      const [name, role, col] = describe(label), v = view();
      const side = label.x > v.x0 + v.w * 0.5 ? -1 : 1, lx = label.x + side * 40, ly = label.y < 70 ? label.y + 46 : label.y - 36;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(label.x, label.y, 11, 0, TAU); ctx.stroke();
      ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6; ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = 'rgba(250,250,245,.96)'; ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(name, lx, ly);
      ctx.fillStyle = col; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    function setScene(id) { cfg.scene = id; label = null; look = [0, 0]; }
    if (window.FASC_DEBUG) window.FASC_DEBUG.tun = { cfg, setScene, run(n, h) { for (let i = 0; i < n; i++) update(h); render(); } };

    let drag = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool;
        if (tool === 'observer') { label = { x: p.x, y: p.y, t: 0 }; return; }
        if (tool === 'accelerer') { boost = true; cfg.auto = false; return; }
        drag = { x: p.x, y: p.y };
      },
      move(p) {
        if (!p.down || !drag || env.tool !== 'piloter') return;
        const m = Math.min(view().w, H);
        if (cfg.scene === 'demo') { look[0] = clamp(look[0] + p.dx / (m * 0.5), -1, 1); look[1] = clamp(look[1] + p.dy / (m * 0.5), -1, 1); }
        else if (cfg.scene === 'worm') { look[0] += p.dx * 0.004; look[1] = clamp(look[1] + p.dy * 0.004, -1.2, 1.2); }
        else { look[0] = clamp(look[0] - p.dx * 0.004, -2.5, 2.5); look[1] = clamp(look[1] + p.dy * 0.004, -2.5, 2.5); }
      },
      up() { drag = null; boost = false; },
      clear() { look = [0, 0]; T = 0; },
      dispose() { if (drone) drone.stop(); if (wind) { try { wind.g.gain.setTargetAtTime(0.0001, au.ctx.currentTime, 0.1); wind.s.stop(au.ctx.currentTime + 0.5); } catch (e) { /* rien */ } } R.K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: [
          { label: 'Vers la vitesse de la lumière', act: () => setScene('relat') },
          { label: 'Trou de ver', act: () => setScene('worm') },
          { label: 'Porte des étoiles', act: () => setScene('gate') },
          { label: 'Tunnel de la démoscène', act: () => setScene('demo') },
        ] });
        if (cfg.scene === 'relat') {
          L.push({ type: 'section', label: 'Le vaisseau' });
          L.push({ type: 'bar', label: 'Vitesse', color: '#9fc4ff', value: beta(), txt: betaTxt() });
          L.push({ type: 'slider', label: 'Facteur de Lorentz γ', min: 0, max: 3.3, step: 0.01, value: cfg.lg, fmt: (x) => { const g = Math.pow(10, x); return 'γ = ' + (g < 100 ? fr(g, 2) : Math.round(g).toLocaleString('fr-FR')); }, set: (x) => { cfg.lg = x; cfg.auto = false; } });
          L.push({ type: 'toggle', label: 'Accélérer et freiner tout seul', value: cfg.auto, set: (x) => { cfg.auto = x; } });
          L.push({ type: 'slider', label: 'Champ de vision', min: 0.6, max: 3.1, step: 0.01, value: cfg.fov, fmt: (x) => Math.round((x * 2 * 180) / Math.PI) + '°', set: (x) => { cfg.fov = x; } });
          L.push({ type: 'toggle', label: 'Aberration', value: !!cfg.ab, set: (x) => { cfg.ab = x ? 1 : 0; } });
          L.push({ type: 'toggle', label: 'Effet Doppler (couleur et éclat)', value: !!cfg.dop, set: (x) => { cfg.dop = x ? 1 : 0; } });
          L.push({ type: 'note', text: 'Coupez l’aberration ou le Doppler pour voir ce que chacun fait. Un champ de vision de 360° montre tout le ciel : l’avant au centre, l’arrière sur le bord.' });
        }
        if (cfg.scene === 'worm') {
          L.push({ type: 'section', label: 'Le trou de ver' });
          L.push({ type: 'slider', label: 'Position', min: -9, max: 9, step: 0.05, value: cfg.wl, fmt: (x) => (Math.abs(x) < 0.3 ? 'dans la gorge' : (x > 0 ? 'notre côté, ' : 'autre côté, ') + fr(Math.abs(x), 1) + ' rayons'), set: (x) => { cfg.wl = x; cfg.wormAuto = false; } });
          L.push({ type: 'toggle', label: 'Traverser et revenir tout seul', value: cfg.wormAuto, set: (x) => { cfg.wormAuto = x; } });
          if (cfg.wormAuto) L.push({ type: 'slider', label: 'Vitesse', min: 0.1, max: 2, step: 0.01, value: cfg.wormSpeed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.wormSpeed = x; } });
        }
        if (cfg.scene === 'gate') {
          L.push({ type: 'section', label: 'Porte des étoiles' });
          L.push({ type: 'toggle', label: 'Murs de lumière sur les côtés', value: cfg.walls, set: (x) => { cfg.walls = x; } });
          L.push({ type: 'note', text: 'Maintenez l’outil ACCÉLÉRER pour plonger plus vite.' });
        }
        if (cfg.scene === 'demo') {
          L.push({ type: 'section', label: 'Démoscène' });
          L.push({ type: 'choice', label: 'Texture', value: cfg.demoTex, set: (x) => { cfg.demoTex = x; }, options: [{ id: 0, label: 'Damier' }, { id: 1, label: 'Vortex' }, { id: 2, label: 'Plasma' }] });
          L.push({ type: 'slider', label: 'Vitesse', min: 0, max: 3, step: 0.01, value: cfg.demoSpeed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.demoSpeed = x; } });
        }
        L.push({ type: 'section', label: 'Calcul' });
        L.push({ type: 'choice', label: 'Définition', value: cfg.q, set: (x) => { if (x === cfg.q) return; cfg.q = x; const old = R; R = initGL(); old.K.lose(); }, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        return L;
      },
    };
  }
})();
