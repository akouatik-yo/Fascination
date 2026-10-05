/* Fascination — La Galaxie · bras spiraux, collisions et trou noir (WebGL2)
   Spirale : ~200 000 étoiles sur des orbites elliptiques dont l'orientation tourne avec le rayon (ondes de densité,
   modèle cinématique de Kalnajs) : les bras naissent de l'embouteillage des orbites et tournent plus lentement
   que les étoiles. Populations : bulbe jaune, disque, jeunes étoiles bleues et nébuleuses roses dans les bras,
   poussière qui absorbe. Collision : problème restreint (Toomre et Toomre, 1972) — deux ou trois noyaux massifs
   intégrés en JS, des dizaines de milliers d'étoiles-tests sur la carte graphique. Trou noir : rayons lumineux
   intégrés dans la métrique de Schwarzschild, disque d'accrétion avec effets Doppler et décalage gravitationnel. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const QUAL = { legere: { side: 270, coll: 180, res: 0.5, bh: 0.45, steps: 160 }, normale: { side: 380, coll: 230, res: 0.75, bh: 0.6, steps: 220 }, haute: { side: 460, coll: 280, res: 1, bh: 0.75, steps: 300 } };

  /* ───────── matrices ───────── */
  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]); }
  function lookAt(e, c, u) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  }
  function mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  const xf = (m, x, y, z) => { const w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, w]; };

  /* ───────── shaders ───────── */
  const BB = `
vec3 bb(float T){ // couleur d'un corps noir (approximation), T en kelvins
  T = clamp(T, 1000., 40000.) / 100.;
  float r = T <= 66. ? 1. : clamp(1.29293618 * pow(T - 60., -.1332047592), 0., 1.);
  float g = T <= 66. ? clamp(.39008157876 * log(T) - .63184144378, 0., 1.) : clamp(1.12989086 * pow(T - 60., -.0755148492), 0., 1.);
  float b = T >= 66. ? 1. : (T <= 19. ? 0. : clamp(.54320678911 * log(T - 10.) - 1.19625408914, 0., 1.));
  return vec3(r, g, b);
}`;
  // étoiles de la spirale : orbites calculées (pas de simulation)
  const VS_SPI = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uS1, uS2; uniform int uSide; uniform float uT, uTwist, uEcc, uPat, uBar, uArm, uPx, uGain, uDust, uEll;
uniform mat4 uVP;
out vec3 vCol; out float vA;
${BB}
void main(){
  int id = gl_VertexID; ivec2 tc = ivec2(id % uSide, id / uSide);
  vec4 A = texelFetch(uS1, tc, 0), B = texelFetch(uS2, tc, 0);
  float a = A.x, M0 = A.y, z = A.z, ty = A.w;
  vec3 p; float bright = B.z, crowd = 0.;
  if (ty < 3.5 && uEll < .5){
    float bar = uBar * (1. - smoothstep(.12, .3, a));
    float orient = (bar > .01 ? 0. : 1.) * a * uTwist + uPat * uT + B.x * .25 * (1. - uBar);
    float e = clamp(uEcc * smoothstep(.04, .25, a) * (1. - smoothstep(.85, 1.25, a)) + bar * .55, 0., .8);
    float om = 1. / (a + .07);
    float M = M0 + (om - uPat) * uT;
    vec2 q = vec2(a * cos(M), a * (1. - e) * sin(M));
    float c = cos(orient), s = sin(orient);
    p = vec3(c * q.x - s * q.y, z, s * q.x + c * q.y);
    // embouteillage : les étoiles s'attardent près du petit axe de leur ellipse, là où les orbites voisines se pressent
    crowd = pow(.5 + .5 * cos(2. * (M - 1.5708 - uArm - (ty > 2.5 ? .35 : 0.))), 3.) * smoothstep(.1, .3, a);
  } else {
    // bulbe et halo (ou galaxie elliptique) : une sphère aplatie qui tourne lentement
    float r = a, th = M0 + uT * .25 / (r + .2), ph = B.x * 3.14159;
    p = vec3(r * sin(ph) * cos(th), r * cos(ph) * (uEll > .5 ? .65 : .55), r * sin(ph) * sin(th));
  }
  vec3 col; float size = uPx;
  if (ty < .5){ col = bb(5200. + B.y * 2500.) * .5; }                                   // disque ancien
  else if (ty < 1.5){ col = bb(14000. + B.y * 15000.); bright *= .06 + 2.8 * crowd * crowd; size *= 1.3; }  // jeunes étoiles bleues
  else if (ty < 2.5){ col = vec3(1., .3, .5); bright *= 2.2 * crowd * crowd; size *= 2.2; }      // nébuleuses H II
  else if (ty < 3.5){ col = vec3(1.); bright *= crowd * smoothstep(.3, .45, a); size *= 5.; }                               // poussière
  else { col = bb(3600. + B.y * 1800.) * .8; }                                                   // bulbe, halo
  if (uDust > .5) { col = vec3(1.); bright = ty > 2.5 && ty < 3.5 ? bright : 0.; }
  else if (ty > 2.5 && ty < 3.5) bright = 0.;
  vec4 P = uVP * vec4(p, 1.);
  gl_Position = P;
  gl_PointSize = clamp(size * 3. / P.w, 1., 40.);
  vCol = col * bright * uGain; vA = 1.;
}`;
  const FS_PT = `#version 300 es
precision highp float; in vec3 vCol; in float vA; out vec4 o;
void main(){ vec2 d = gl_PointCoord - .5; float k = exp(-dot(d, d) * 14.); o = vec4(vCol * k, k); }`;
  // collision : étoiles-tests (position, vitesse) mises à jour sur la carte graphique
  const FS_NB = HEAD + `
uniform sampler2D uP, uV; uniform vec4 uC[4]; uniform int uNC; uniform float uDt, uE2;
layout(location = 0) out vec4 oP; layout(location = 1) out vec4 oV;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 P = texelFetch(uP, c, 0), V = texelFetch(uV, c, 0);
  vec3 a = vec3(0.);
  for (int i = 0; i < 4; i++){ if (i >= uNC) break; vec3 d = uC[i].xyz - P.xyz; float r2 = dot(d, d) + uE2; a += uC[i].w * d / (r2 * sqrt(r2)); }
  V.xyz += a * uDt; P.xyz += V.xyz * uDt;
  oP = P; oV = V;
}`;
  const VS_NB = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uP, uV; uniform int uSide; uniform mat4 uVP; uniform float uPx, uGain, uColMode;
out vec3 vCol; out float vA;
${BB}
void main(){
  int id = gl_VertexID; ivec2 tc = ivec2(id % uSide, id / uSide);
  vec4 P = texelFetch(uP, tc, 0), V = texelFetch(uV, tc, 0);
  vec4 Q = uVP * vec4(P.xyz, 1.);
  gl_Position = Q; gl_PointSize = clamp(uPx * 3. / Q.w, 1., 6.);
  float g = P.w, r0 = V.w;
  vec3 col = g < .5 ? mix(bb(5200.), bb(16000.), smoothstep(.15, .9, r0)) : mix(bb(4200.), bb(7000.), smoothstep(.15, .9, r0));
  if (uColMode > .5) col = mix(vec3(.4, .6, 1.), vec3(1., .5, .3), clamp(length(V.xyz) * .9 - .2, 0., 1.));
  vCol = col * uGain; vA = 1.;
}`;
  const FS_BLUR = HEAD + `uniform sampler2D uT; uniform vec2 uDir; out vec4 o;
void main(){ vec4 s = texture(uT, vUv) * .227; s += (texture(uT, vUv + uDir * 1.385) + texture(uT, vUv - uDir * 1.385)) * .316; s += (texture(uT, vUv + uDir * 3.23) + texture(uT, vUv - uDir * 3.23)) * .07; o = s; }`;
  const FS_COMP = HEAD + `
uniform sampler2D uA, uD, uB1, uB2, uB3; uniform vec2 uRes; uniform float uExpo, uBloom, uDustK, uDecor, uInk, uT;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec3 col = texture(uA, vUv).rgb * exp(-texture(uD, vUv).r * uDustK);
  col += (texture(uB1, vUv).rgb * .5 + texture(uB2, vUv).rgb * .4 + texture(uB3, vUv).rgb * .35) * uBloom;
  vec2 px = vUv * uRes;
  if (uDecor > .5){
    // fond : étoiles de notre propre galaxie, au premier plan
    vec2 g = floor(px / 3.); float h = hash12(g);
    col += step(.9975, h) * vec3(.7, .8, 1.) * (.3 + .7 * hash12(g + 7.)) * .6;
    col += vec3(.006, .005, .011) * fbm(px / uRes.y * 2.5 + 3.);
  }
  col = aces(col * uExpo);
  if (uInk > .5){ float l = dot(col, vec3(.3, .55, .15)); col = vec3(.953, .933, .89) * (1. - .85 * l) + col * .0; }
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;
  // trou noir : rayons intégrés dans la métrique de Schwarzschild (rayon de Schwarzschild = 1)
  const FS_BH = HEAD + BB + `
uniform vec2 uRes; uniform float uT, uDist, uIncl, uAz, uRin, uRout, uDop, uDisk, uDecor, uInk, uSteps, uFov, uExpo;
out vec4 o;
vec3 sky(vec3 d){
  if (uDecor < .5) return vec3(0.);
  vec2 sp = vec2(atan(d.z, d.x), asin(clamp(d.y, -1., 1.)));
  vec2 g = floor(sp * vec2(180., 180.)); float h = hash12(g);
  vec3 c = step(.996, h) * mix(vec3(1., .85, .7), vec3(.7, .8, 1.), hash12(g + 3.)) * (.4 + 1.6 * pow(hash12(g + 9.), 6.));
  float band = exp(-pow((d.y * .9 + .25 * sin(sp.x * 2.)) * 4., 2.));
  c += band * (vec3(.012, .008, .014) * fbm(sp * 6.) + vec3(.002, .0015, .0012));
  return c;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - uRes * .5) / uRes.y;
  float ci = cos(uIncl), si = sin(uIncl), ca = cos(uAz), sa = sin(uAz);
  vec3 ro = vec3(ca * ci, si, sa * ci) * uDist;
  vec3 fw = normalize(-ro), rt = normalize(cross(fw, vec3(0., 1., 0.))), up = cross(rt, fw);
  vec3 v = normalize(fw + (uv.x * rt + uv.y * up) * uFov);
  vec3 p = ro; vec3 hh = cross(p, v); float h2 = dot(hh, hh);
  vec3 col = vec3(0.); float tr = 1.; bool hole = false;
  for (int i = 0; i < 400; i++){
    if (float(i) >= uSteps) break;
    float r = length(p);
    if (r < 1.){ hole = true; break; }
    if (r > uDist * 1.6 && dot(p, v) > 0.) break;
    float dt = clamp(.08 * (r - .9), .015, 1.5);
    vec3 acc = -1.5 * h2 * p / pow(r, 5.);
    v += acc * dt;
    vec3 pn = p + v * dt;
    if (uDisk > .5 && p.y * pn.y < 0.){
      vec3 x = mix(p, pn, p.y / (p.y - pn.y));
      float rr = length(x.xz);
      if (rr > uRin && rr < uRout){
        // température d'un disque mince (Shakura-Sunyaev), puis Doppler et décalage gravitationnel
        float T = pow((1. - sqrt(uRin / rr)) / (rr * rr * rr), .25);
        float beta = sqrt(.5 / rr);
        vec3 vd = normalize(vec3(-x.z, 0., x.x)) * beta;
        vec3 n = -normalize(v);
        float gam = 1. / sqrt(1. - beta * beta);
        float g = mix(1., 1. / (gam * (1. - dot(vd, n))), uDop) * mix(1., sqrt(1. - 1. / rr), uDop);
        float ang = atan(x.z, x.x), om = beta / rr;
        float tex = .55 + .45 * fbm(vec2(rr * 2.2, (ang - om * uT * 6.) * 3.));
        float Tk = (1600. + 11000. * T) * g;
        float I = T * T * T * T * 420. * pow(g, 4.) * tex;
        float al = clamp(.9 * smoothstep(uRin, uRin * 1.25, rr) * (1. - smoothstep(uRout * .7, uRout, rr)) * (.5 + .6 * tex), 0., .95);
        vec3 bc = bb(Tk); col += tr * al * bc * bc * I;
        tr *= 1. - al;
        if (tr < .02) break;
      }
    }
    p = pn;
  }
  if (!hole) col += tr * sky(normalize(v));
  col = 1. - exp(-col * uExpo);
  if (uInk > .5){ float l = dot(col, vec3(.3, .55, .15)); col = vec3(.953, .933, .89) * (1. - .9 * l); if (hole) col = vec3(.12, .1, .2); }
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;

  window.FASC.push({
    id: 'galaxie', name: 'La Galaxie', cat: 'Cosmos', glyph: '✷', decor: true, smoothTime: true,
    blurb: 'Bras spiraux, galaxies qui se percutent, trou noir',
    hint: 'OBSERVER : touchez une région · TOURNER : glissez pour changer le point de vue · ASTRE : dans la collision, touchez pour lancer un troisième noyau.',
    intro: 'Deux cents milliards de soleils qui tournent autour d’un trou noir, en dessinant des bras qui ne sont pas faits des mêmes étoiles d’un siècle à l’autre. Puis deux galaxies qui se frôlent et s’arrachent des queues d’étoiles longues de cent mille années-lumière. Et, au centre, l’endroit d’où la lumière ne revient pas.',
    legend: [
      { color: '#ffc870', name: 'Bulbe', role: 'étoiles anciennes · jaune orangé', desc: 'Au centre, des étoiles vieilles de plus de dix milliards d’années, froides donc orangées, sur des orbites désordonnées.' },
      { color: '#9fc4ff', name: 'Jeunes étoiles', role: 'chaudes, bleues, brèves', desc: 'Les étoiles massives brillent en bleu et meurent en quelques millions d’années, avant d’avoir quitté le bras où elles sont nées : elles le soulignent.' },
      { color: '#ff5f9a', name: 'Nébuleuse H II', role: 'hydrogène ionisé · 656 nm', desc: 'Le gaz chauffé par les jeunes étoiles émet la raie rouge de l’hydrogène : des perles roses le long des bras.' },
      { color: '#5a4030', name: 'Poussière', role: 'absorbe la lumière', desc: 'Des grains de carbone et de silicates, au bord intérieur des bras, où le gaz est comprimé par l’onde de densité.' },
      { color: '#ffe0a0', name: 'Queue de marée', role: 'collision de galaxies', desc: 'Lors d’une rencontre, la gravité de l’autre galaxie étire le bord du disque en deux longues queues, comme les marées étirent les océans.' },
      { color: '#000000', name: 'Horizon et ombre', role: 'trou noir · rayon de Schwarzschild', desc: 'Rien n’en sort. Son ombre paraît 2,6 fois plus grande que l’horizon, car la lumière qui passe trop près est capturée.' },
      { color: '#ffb060', name: 'Disque d’accrétion', role: 'gaz à des millions de degrés', desc: 'Le gaz qui tombe tourne à près de la moitié de la vitesse de la lumière : le côté qui vient vers nous est plus brillant et plus bleu (effet Doppler).' },
    ],
    about: [
      'Jusqu’en 1924, on pensait que la Voie lactée était tout l’Univers. Edwin Hubble mesure alors la distance de la « nébuleuse » d’Andromède : 2,5 millions d’années-lumière. Les nébuleuses spirales sont d’autres galaxies. Il les classe en 1926 : elliptiques, spirales, spirales barrées. La Voie lactée est une spirale barrée d’environ 100 000 années-lumière, avec 100 à 400 milliards d’étoiles ; le Soleil en fait le tour en 230 millions d’années.',
      'Les bras spiraux posent une énigme : les étoiles proches du centre tournent plus vite que les autres, si bien que des bras faits d’étoiles s’enrouleraient en quelques tours. En 1964, Chia-Chiao Lin et Frank Shu proposent que les bras soient des ondes de densité : des embouteillages qui tournent plus lentement que les étoiles, lesquelles y entrent et en ressortent. La simulation suit cette idée : chaque étoile parcourt une ellipse, et l’orientation des ellipses tourne un peu d’un rayon à l’autre. Le gaz comprimé dans l’embouteillage forme des étoiles : les bras s’allument de bleu et de rose.',
      'En 1972, les frères Alar et Juri Toomre montrent avec un ordinateur que les formes bizarres de certaines galaxies, les Antennes ou les Souris, sont des collisions : il suffit de deux noyaux massifs et de disques d’étoiles-tests. Les étoiles ne se heurtent presque jamais (elles sont trop éloignées), mais les marées gravitationnelles tirent des ponts et des queues. Andromède fonce vers nous à 110 km/s : la rencontre est prévue dans 4 à 5 milliards d’années.',
      'Karl Schwarzschild trouve en 1916 la première solution exacte des équations d’Einstein : une masse ponctuelle entourée d’un horizon. En 2019, le télescope Event Horizon photographie l’ombre du trou noir de M87, 6,5 milliards de masses solaires ; en 2022, celle de Sagittarius A*, au centre de la Voie lactée. Le trou noir du film Interstellar (2014) a été calculé par l’équipe de Kip Thorne avec la même physique que celle utilisée ici : l’image du disque passe par-dessus et par-dessous l’ombre, parce que la lumière du disque situé derrière est courbée vers nous.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une région : bulbe, bras, poussière, queue de marée, ombre du trou noir, anneau de photons, disque.' },
      { id: 'tourner', label: 'tourner', desc: 'Glissez pour tourner autour de la galaxie ou du trou noir (horizontalement : azimut ; verticalement : inclinaison).' },
      { id: 'astre', label: 'astre', desc: 'Dans la collision : touchez pour lancer un troisième noyau massif à travers la scène.' },
    ],
    make(env) {
      try { return makeGal(env); } catch (e) {
        console.warn('La Galaxie : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#04030a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('La Galaxie demande WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeGal(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = { scene: 'spirale', q: 'haute', type: 'grand', twist: 3.2, ecc: 0.32, pat: 0.18, speed: 0.2, dust: 0.8, bloom: 0.7, incl: 0.95, az: 0.4, preset: 'antennes', colMode: 0, dop: 1, disk: true, dist: 26, bincl: 0.12, bAz: 0.6 };
    let T = 0, R = null, label = null;

    function initGL() {
      const Q = QUAL[cfg.q], s = Math.min(Q.res * dpr, dpr);
      const cw = Math.max(64, Math.round(W * s)), ch = Math.max(64, Math.round(H * s));
      const K = GLKit(cw, ch);
      const gl = K.gl;
      const r = {
        K, gl, Q, cw, ch,
        pg: { spi: K.program(FS_PT, VS_SPI), nbP: K.program(FS_PT, VS_NB), nb: K.program(FS_NB), blur: K.program(FS_BLUR), comp: K.program(FS_COMP), bh: K.program(FS_BH) },
        A: K.target(cw, ch), Dst: K.target(cw >> 1, ch >> 1),
        b1: K.target(cw >> 1, ch >> 1), b1t: K.target(cw >> 1, ch >> 1), b2: K.target(cw >> 2, ch >> 2), b2t: K.target(cw >> 2, ch >> 2), b3: K.target(cw >> 3, ch >> 3), b3t: K.target(cw >> 3, ch >> 3),
        dyn: 1, ft: 30, last: 0,
      };
      return r;
    }
    R = initGL();
    const tex32 = (w, h, data) => { const gl = R.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data); for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST); return t; };

    /* ───────── la spirale : populations d'étoiles ───────── */
    let SP = null;
    function buildSpiral() {
      const side = R.Q.side, n = side * side, A = new Float32Array(n * 4), B = new Float32Array(n * 4);
      const ell = cfg.type === 'elliptique';
      for (let i = 0; i < n; i++) {
        const u = Math.random();
        let ty, a, z;
        if (ell || u < 0.16) { ty = 4; a = 0.02 + Math.pow(Math.random(), 1.8) * (ell ? 1.0 : 0.32); z = 0; }            // bulbe / elliptique
        else if (u < 0.2) { ty = 4; a = 0.3 + Math.random() * 0.9; z = 0; }                                                  // halo
        else {
          ty = u < 0.6 ? 0 : u < 0.84 ? 1 : u < 0.86 ? 2 : 3;
          a = 0.06 + -Math.log(1 - Math.random() * 0.96) * 0.3;  // disque exponentiel
          if (a > 1.35) a = 0.2 + Math.random();
          const hz = ty === 0 ? 0.03 : 0.012;
          z = (Math.random() + Math.random() - 1) * hz;
        }
        A.set([a, Math.random() * TAU, z, ty], i * 4);
        B.set([Math.random(), Math.random(), ty === 3 ? 0.06 : ty === 2 ? 0.5 : ty === 4 ? 0.14 : ty === 1 ? 0.35 : 0.1, 0], i * 4);
      }
      SP = { side, n, t1: tex32(side, side, A), t2: tex32(side, side, B) };
    }
    const TYPES = {
      grand: { nom: 'Spirale à deux grands bras (Sc)', twist: 3.2, ecc: 0.42, bar: 0 },
      barree: { nom: 'Spirale barrée (SBb)', twist: 2.6, ecc: 0.38, bar: 1 },
      floconneuse: { nom: 'Spirale floconneuse', twist: 5.5, ecc: 0.14, bar: 0 },
      elliptique: { nom: 'Elliptique (E3)', twist: 0, ecc: 0, bar: 0 },
    };

    /* ───────── collision : noyaux en JS, étoiles sur la carte graphique ───────── */
    const PRESETS = {
      antennes: { nom: 'Les Antennes', m: [1, 1], q: 1.0, inc: [[30, 0], [-60, 60]], f0: -1.9, why: 'NGC 4038/4039 : deux spirales semblables, disques en rotation dans le sens de l’orbite (prograde) : deux longues queues en arc.' },
      souris: { nom: 'Les Souris', m: [1, 1], q: 1.3, inc: [[10, 0], [70, 90]], f0: -1.9, why: 'NGC 4676 : une rencontre plus oblique ; chaque galaxie garde une seule queue, longue et droite, comme une queue de souris.' },
      roue: { nom: 'La Roue de charrette', m: [1, 0.3], q: 0.05, inc: [[90, 0], [0, 0]], f0: -1.4, noDisk2: true, why: 'Une petite galaxie traverse le disque d’une grande en son centre : une onde annulaire d’étoiles se propage vers l’extérieur, comme un caillou dans l’eau.' },
      andromede: { nom: 'Voie lactée et Andromède', m: [1, 1.3], q: 0.6, inc: [[20, 30], [-40, 110]], f0: -2.0, why: 'Le scénario prévu dans 4 à 5 milliards d’années : un premier passage, des queues de marée, puis la fusion en une grande elliptique, « Milkomède ».' },
    };
    let NB = null;
    function buildColl() {
      const pr = PRESETS[cfg.preset], side = R.Q.coll, n = side * side, P = new Float32Array(n * 4), V = new Float32Array(n * 4);
      const mu = pr.m[0] + pr.m[1], pq = 2 * pr.q, f = pr.f0, rr = pq / (1 + Math.cos(f));
      const rel = [rr * Math.cos(f), rr * Math.sin(f), 0], vk = Math.sqrt(mu / pq), vrel = [-vk * Math.sin(f), vk * (1 + Math.cos(f)), 0];
      const c1 = { x: rel.map((x) => (-x * pr.m[1]) / mu), v: vrel.map((x) => (-x * pr.m[1]) / mu), m: pr.m[0] };
      const c2 = { x: rel.map((x) => (x * pr.m[0]) / mu), v: vrel.map((x) => (x * pr.m[0]) / mu), m: pr.m[1] };
      const cores = [c1, c2];
      const E2 = 0.04;
      const n2 = pr.noDisk2 ? Math.floor(n * 0.06) : Math.floor((n * pr.m[1]) / mu), n1 = n - n2;
      let k = 0;
      cores.forEach((c, gi) => {
        const cnt = gi === 0 ? n1 : n2, [incD, omD] = pr.inc[gi], inc = (incD * Math.PI) / 180, om = (omD * Math.PI) / 180;
        // axe de rotation du disque
        const ax = [Math.sin(inc) * Math.cos(om), Math.sin(inc) * Math.sin(om), Math.cos(inc)];
        const t1 = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
        let e1 = [ax[1] * t1[2] - ax[2] * t1[1], ax[2] * t1[0] - ax[0] * t1[2], ax[0] * t1[1] - ax[1] * t1[0]]; const l1 = Math.hypot(...e1); e1 = e1.map((x) => x / l1);
        const e2 = [ax[1] * e1[2] - ax[2] * e1[1], ax[2] * e1[0] - ax[0] * e1[2], ax[0] * e1[1] - ax[1] * e1[0]];
        const Rd = (gi === 1 && pr.noDisk2 ? 0.25 : 1) * Math.sqrt(c.m);
        for (let i = 0; i < cnt; i++, k++) {
          const r = (0.12 + Math.pow(Math.random(), 0.75) * 0.95) * Rd, a = Math.random() * TAU;
          const lx = r * Math.cos(a), ly = r * Math.sin(a), z = (Math.random() - 0.5) * 0.02;
          const p = [0, 1, 2].map((j) => c.x[j] + lx * e1[j] + ly * e2[j] + z * ax[j]);
          const vc = Math.sqrt((c.m * r * r) / Math.pow(r * r + E2, 1.5));
          const dir = [0, 1, 2].map((j) => (-Math.sin(a) * e1[j] + Math.cos(a) * e2[j]));
          const v = [0, 1, 2].map((j) => c.v[j] + dir[j] * vc);
          P.set([p[0], p[1], p[2], gi], k * 4); V.set([v[0], v[1], v[2], r / Rd], k * 4);
        }
      });
      const K = R.K;
      if (NB) { /* anciennes textures laissées au ramasse-miettes du contexte */ }
      NB = { side, n, P: K.double(side, side, 'f32', R.gl.NEAREST), V: K.double(side, side, 'f32', R.gl.NEAREST), cores, E2, t: 0 };
      for (const [D, data] of [[NB.P, P], [NB.V, V]]) for (const t of [D.r, D.w]) { R.gl.bindTexture(R.gl.TEXTURE_2D, t.tex); R.gl.texImage2D(R.gl.TEXTURE_2D, 0, R.gl.RGBA32F, side, side, 0, R.gl.RGBA, R.gl.FLOAT, data); }
    }
    function stepColl(dt) {
      const { cores, E2 } = NB;
      // noyaux : saute-mouton avec adoucissement
      const acc = () => cores.map((c, i) => { const a = [0, 0, 0]; cores.forEach((o, j) => { if (i === j) return; const d = [0, 1, 2].map((k) => o.x[k] - c.x[k]); const r2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 + E2; const f = o.m / (r2 * Math.sqrt(r2)); for (let k = 0; k < 3; k++) a[k] += d[k] * f; }); return a; });
      let A = acc();
      cores.forEach((c, i) => { for (let k = 0; k < 3; k++) { c.v[k] += A[i][k] * dt * 0.5; c.x[k] += c.v[k] * dt; } });
      A = acc();
      cores.forEach((c, i) => { for (let k = 0; k < 3; k++) c.v[k] += A[i][k] * dt * 0.5; });
      const C = new Float32Array(16); cores.slice(0, 4).forEach((c, i) => C.set([c.x[0], c.x[1], c.x[2], c.m], i * 4));
      R.pg.nb.use().t('uP', NB.P.r).t('uV', NB.V.r).v4('uC', C).i('uNC', Math.min(4, cores.length)).f('uDt', dt).f('uE2', E2);
      R.K.run(R.pg.nb, NB.P.w, NB.V.w); NB.P.swap(); NB.V.swap();
      NB.t += dt;
    }

    /* ───────── caméra ───────── */
    function camera(dist, incl, az, aspect) {
      const e = [Math.cos(az) * Math.cos(incl) * dist, Math.sin(incl) * dist, Math.sin(az) * Math.cos(incl) * dist];
      const Pm = persp(0.75, aspect, 0.05, 100), Vm = lookAt(e, [0, 0, 0], [0, 1, 0]);
      return mul(Pm, Vm);
    }
    // décale l'image vers le centre de la zone visible (panneaux ouverts)
    function shiftVP(VP) { const v = view(), sx = ((v.cx - W / 2) / W) * 2; const S = new Float32Array(16); S[0] = S[5] = S[10] = S[15] = 1; S[12] = sx; return mul(S, VP); }

    /* ───────── rendu ───────── */
    function setMat(P, name, m) { R.gl.uniformMatrix4fv(R.gl.getUniformLocation(P.p, name), false, m); }
    function drawPoints(P, out, count, additive) {
      const gl = R.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb); gl.viewport(0, 0, out.w, out.h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(R.K.emptyVao); gl.drawArrays(gl.POINTS, 0, count);
      gl.disable(gl.BLEND);
      void additive;
    }
    function bloomAndComp(dustK) {
      const { K, pg } = R;
      const blur = (src, tmp, dst) => { pg.blur.use().t('uT', src).f('uDir', 1.5 / src.w, 0); K.run(pg.blur, tmp); pg.blur.use().t('uT', tmp).f('uDir', 0, 1.5 / tmp.h); K.run(pg.blur, dst); };
      blur(R.A, R.b1t, R.b1); blur(R.b1, R.b2t, R.b2); blur(R.b2, R.b3t, R.b3);
      const bare = env.decor === false, ink = bare && env.theme === 'light';
      pg.comp.use().t('uA', R.A).t('uD', R.Dst).t('uB1', R.b1).t('uB2', R.b2).t('uB3', R.b3).f('uRes', R.cw, R.ch).f('uExpo', 1.2).f('uBloom', cfg.bloom).f('uDustK', dustK).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uT', T);
      K.run(pg.comp, null);
    }
    let VPcur = null;
    function renderSpiral() {
      const { K, pg } = R, ty = TYPES[cfg.type];
      const VP = shiftVP(camera(1.95, cfg.incl, cfg.az, W / H)); VPcur = VP;
      const px = (Math.min(R.cw, R.ch) / 900) * 1.35;
      const P = pg.spi.use();
      P.t('uS1', SP.t1).t('uS2', SP.t2).i('uSide', SP.side).f('uT', T).f('uTwist', ty.twist).f('uEcc', ty.ecc).f('uPat', 0.18).f('uBar', ty.bar).f('uArm', 0).f('uPx', px).f('uGain', 0.55).f('uDust', 0).f('uEll', cfg.type === 'elliptique' ? 1 : 0);
      setMat(P, 'uVP', VP);
      drawPoints(P, R.A, SP.n);
      // poussière, dans une cible à demi-résolution
      P.use().f('uDust', 1).f('uPx', px * 0.5).f('uGain', 1.2);
      drawPoints(P, R.Dst, SP.n);
      bloomAndComp(cfg.type === 'elliptique' ? 0 : cfg.dust * 1.6);
    }
    function renderColl() {
      const { pg } = R;
      const VP = shiftVP(camera(7.5, cfg.incl, cfg.az, W / H)); VPcur = VP;
      const P = pg.nbP.use();
      P.t('uP', NB.P.r).t('uV', NB.V.r).i('uSide', NB.side).f('uPx', (Math.min(R.cw, R.ch) / 900) * 1.4).f('uGain', 0.5).f('uColMode', cfg.colMode);
      setMat(P, 'uVP', VP);
      drawPoints(P, R.A, NB.n);
      const gl = R.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, R.Dst.fb); gl.viewport(0, 0, R.Dst.w, R.Dst.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      bloomAndComp(0);
    }
    function renderBH() {
      const { K, pg } = R;
      // résolution adaptative : le lancer de rayons est coûteux
      const now = performance.now(), d = now - R.last; R.last = now;
      if (d > 0 && d < 500) R.ft += (d - R.ft) * 0.1;
      if (R.ft > 42) R.dyn = Math.max(0.35, R.dyn * 0.97); else if (R.ft < 24) R.dyn = Math.min(1, R.dyn * 1.02);
      const s = R.Q.bh / R.Q.res * R.dyn, cw = Math.max(32, Math.round(R.cw * Math.min(1, s))), ch = Math.max(32, Math.round(R.ch * Math.min(1, s)));
      const bare = env.decor === false, ink = bare && env.theme === 'light';
      const v = view();
      pg.bh.use().f('uRes', cw, ch).f('uT', T).f('uDist', cfg.dist).f('uIncl', cfg.bincl).f('uAz', cfg.bAz).f('uRin', 3).f('uRout', 14).f('uDop', cfg.dop).f('uDisk', cfg.disk ? 1 : 0)
        .f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uSteps', R.Q.steps).f('uFov', 0.9).f('uExpo', 1.1);
      K.run(pg.bh, { fb: null, w: cw, h: ch });
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.imageSmoothingEnabled = true;
      // l'image est centrée sur la zone visible
      const off = v.cx - W / 2;
      ctx.drawImage(K.canvas, 0, K.canvas.height - ch, cw, ch, off, 0, W, H);
      if (off) { ctx.fillStyle = ink ? '#f3eee3' : '#000'; if (off > 0) ctx.fillRect(0, 0, off, H); else ctx.fillRect(W + off, 0, -off, H); }
      ctx.restore();
    }
    function blit() { ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.imageSmoothingEnabled = true; ctx.drawImage(R.K.canvas, 0, 0, W, H); ctx.restore(); }

    /* ───────── son ───────── */
    let drone = null;
    if (snd()) { drone = au.drone(55, 'sine', 0); }

    /* ───────── scènes et boucle ───────── */
    function setScene(id) {
      cfg.scene = id; label = null;
      if (id === 'spirale') { if (!SP) buildSpiral(); cfg.incl = 0.62; cfg.az = 0.4; }
      if (id === 'collision') { buildColl(); cfg.incl = 1.25; cfg.az = 0.3; }
      if (id === 'trounoir') { cfg.bincl = 0.12; }
    }
    function update(dt) {
      const k = dt / 0.4;
      if (cfg.scene === 'spirale') T += k * cfg.speed * 0.8;
      if (cfg.scene === 'collision' && NB) {
        const h = 0.012, n = Math.min(6, Math.round((k * cfg.speed * 1.4) / h));
        for (let i = 0; i < n; i++) stepColl(h);
        if (cfg.autoReset !== false && NB.t > 40) buildColl();
      }
      if (cfg.scene === 'trounoir') T += k * cfg.speed;
      if (drone) drone.gain(cfg.scene === 'trounoir' ? 0.03 : 0.015);
      if (label) label.t += k;
    }
    let pending = false;
    function render() {
      if (cfg.scene === 'spirale') { renderSpiral(); blit(); }
      else if (cfg.scene === 'collision') { renderColl(); blit(); }
      else renderBH();
      hud();
      drawLabel();
    }
    function hud() {
      const v = view(), ink = env.decor === false && env.theme === 'light';
      ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink ? 'rgba(40,30,80,.75)' : 'rgba(230,228,255,.6)';
      let s = '';
      if (cfg.scene === 'spirale') s = `${TYPES[cfg.type].nom.toUpperCase()} · ${Math.round(SP.n / 1000)} 000 ÉTOILES · ${fr(T * 0.05 * 230 / 0.8 / 6.28, 0)} MILLIONS D’ANNÉES`;
      if (cfg.scene === 'collision') s = `${PRESETS[cfg.preset].nom.toUpperCase()} · ${Math.round(NB.t * 47)} MILLIONS D’ANNÉES`;
      if (cfg.scene === 'trounoir') s = `TROU NOIR DE SCHWARZSCHILD · VU DE ${fr(cfg.dist, 0)} RAYONS · INCLINAISON ${Math.round((cfg.bincl * 180) / Math.PI)}°`;
      ctx.fillText(s, v.x0 + 16, H - 16); ctx.restore();
    }
    function frame(t, dt) {
      if (dt > 0) update(dt);
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    /* ───────── identification ───────── */
    // le même rayon lumineux, en JS, pour savoir ce que l'on touche dans l'image du trou noir
    function traceBH(x, y) {
      const v0 = view(), uvx = (x - v0.cx) / H, uvy = -(y - H / 2) / H;
      const ci = Math.cos(cfg.bincl), si = Math.sin(cfg.bincl), ca = Math.cos(cfg.bAz), sa = Math.sin(cfg.bAz);
      let p = [ca * ci * cfg.dist, si * cfg.dist, sa * ci * cfg.dist];
      const n3 = (a) => { const l = Math.hypot(...a); return a.map((q) => q / l); }, cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const fw = n3(p.map((q) => -q)), rt = n3(cr(fw, [0, 1, 0])), up = cr(rt, fw);
      let v = n3([0, 1, 2].map((k) => fw[k] + (uvx * rt[k] + uvy * up[k]) * 0.9));
      const hh = cr(p, v), h2 = hh[0] ** 2 + hh[1] ** 2 + hh[2] ** 2;
      let cross = 0, minR = 1e9, first = null;
      for (let i = 0; i < 2000; i++) {
        const r = Math.hypot(...p); minR = Math.min(minR, r);
        if (r < 1) return { hole: true, cross, first, minR };
        if (r > cfg.dist * 1.6 && p[0] * v[0] + p[1] * v[1] + p[2] * v[2] > 0) break;
        const dt = clamp(0.04 * (r - 0.9), 0.008, 1);
        const f = (-1.5 * h2) / Math.pow(r, 5);
        v = v.map((q, k) => q + p[k] * f * dt);
        const pn = p.map((q, k) => q + v[k] * dt);
        if (p[1] * pn[1] < 0) { const t = p[1] / (p[1] - pn[1]); const X = p.map((q, k) => q + (pn[k] - q) * t); const rr = Math.hypot(X[0], X[2]); if (rr > 3 && rr < 14) { cross++; if (!first) first = { rr, X, v: v.slice() }; } }
        p = pn;
      }
      return { hole: false, cross, first, minR };
    }
    function describe(l) {
      if (cfg.scene === 'trounoir') {
        const t = l.tr;
        if (t.hole && !t.first) return ['Ombre du trou noir', `les rayons qui passent à moins de 2,6 rayons de Schwarzschild sont capturés`, '#c8c8c8'];
        if (t.first) {
          const X = t.first.X, rr = t.first.rr, vd = [-X[2], 0, X[0]], n = t.first.v.map((q) => -q), dot = (vd[0] * n[0] + vd[2] * n[2]) / (Math.hypot(...vd) * Math.hypot(...n));
          const side = dot > 0.2 ? 'côté qui vient vers nous : plus brillant, plus bleu' : dot < -0.2 ? 'côté qui s’éloigne : plus sombre, plus rouge' : 'mouvement transverse';
          return [t.cross > 1 || t.minR < 4 ? 'Image secondaire du disque' : 'Disque d’accrétion', `à ${fr(rr, 1)} rayons du centre · ${side}${t.minR < 6 ? ' · lumière courbée autour du trou noir' : ''}`, '#ffb060'];
        }
        if (t.minR < 3.2) return ['Anneau de photons', 'lumière qui a presque fait le tour du trou noir avant de s’échapper (sphère des photons : 1,5 rayon)', '#ffe0a0'];
        return ['Ciel lointain', t.minR < 10 ? 'étoiles du fond, déplacées et étirées par la lentille gravitationnelle' : 'étoiles du fond, à peine déviées', '#9fc4ff'];
      }
      if (cfg.scene === 'spirale') {
        const c = xf(VPcur, 0, 0, 0), cx = ((c[0] + 1) / 2) * W, cy = ((1 - c[1]) / 2) * H, d = Math.hypot(l.x - cx, l.y - cy) / Math.min(W, H);
        if (d < 0.07) return ['Bulbe et trou noir central', 'étoiles anciennes, orangées · au cœur, un trou noir de millions de masses solaires', '#ffc870'];
        if (d < 0.5) return ['Disque', 'étoiles, gaz et poussière en rotation · les bras sont des embouteillages, pas des objets', '#9fc4ff'];
        return ['Halo', 'étoiles isolées et amas globulaires, autour du disque', '#c8c8c8'];
      }
      return ['Étoiles en marée', 'les étoiles ne se heurtent pas : c’est la gravité des noyaux qui les arrache', '#ffe0a0'];
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

    if (window.FASC_DEBUG) window.FASC_DEBUG.gal = { cfg, setScene, buildColl, get NB() { return NB; }, run(n, h) { for (let i = 0; i < n; i++) update(h); render(); }, traceBH };

    setScene('spirale');
    let drag = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool;
        if (tool === 'observer') { label = { x: p.x, y: p.y, t: 0, tr: cfg.scene === 'trounoir' ? traceBH(p.x, p.y) : null }; return; }
        if (tool === 'astre' && cfg.scene === 'collision' && NB.cores.length < 4) {
          // un troisième noyau traverse la scène vers le centre de masse
          const a = rnd(TAU), d = 4;
          NB.cores.push({ x: [Math.cos(a) * d, Math.sin(a) * d, rnd(1, -1)], v: [-Math.cos(a) * 0.7, -Math.sin(a) * 0.7, 0], m: 0.5 });
          if (snd()) au.note(70, 2, 'sine', 0.08, 40);
          return;
        }
        drag = { x: p.x, y: p.y };
      },
      move(p) {
        if (!p.down || !drag || env.tool !== 'tourner') return;
        if (cfg.scene === 'trounoir') { cfg.bAz -= p.dx * 0.006; cfg.bincl = clamp(cfg.bincl + p.dy * 0.004, -1.4, 1.4); }
        else { cfg.az -= p.dx * 0.006; cfg.incl = clamp(cfg.incl + p.dy * 0.005, 0.05, 1.55); }
      },
      up() { drag = null; },
      clear() { if (cfg.scene === 'collision') buildColl(); else T = 0; },
      dispose() { if (drone) drone.stop(); R.K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: [
          { label: 'Galaxie spirale', act: () => setScene('spirale') },
          { label: 'Collision de galaxies', act: () => setScene('collision') },
          { label: 'Trou noir', act: () => setScene('trounoir') },
        ] });
        if (cfg.scene === 'spirale') {
          L.push({ type: 'section', label: 'Galaxie' });
          L.push({ type: 'choice', label: 'Type (classification de Hubble)', value: cfg.type, set: (x) => { cfg.type = x; buildSpiral(); }, options: Object.keys(TYPES).map((k) => ({ id: k, label: TYPES[k].nom })) });
          L.push({ type: 'note', text: cfg.type === 'elliptique' ? 'Une galaxie elliptique : des étoiles anciennes sur des orbites en tous sens, presque plus de gaz, donc plus de naissances d’étoiles.' : 'Les bras ne sont pas des objets : les étoiles y entrent et en ressortent. Regardez une étoile bleue : elle traverse le bras, qui tourne moins vite qu’elle.' });
          L.push({ type: 'slider', label: 'Vitesse du temps', min: 0, max: 2, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          if (cfg.type !== 'elliptique') L.push({ type: 'slider', label: 'Poussière', min: 0, max: 1, step: 0.01, value: cfg.dust, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.dust = x; } });
          L.push({ type: 'buttons', items: [{ label: 'De face', act: () => { cfg.incl = 1.5; } }, { label: 'Incliné', act: () => { cfg.incl = 0.62; } }, { label: 'Par la tranche', act: () => { cfg.incl = 0.06; } }] });
        }
        if (cfg.scene === 'collision') {
          const pr = PRESETS[cfg.preset];
          L.push({ type: 'section', label: 'Rencontre' });
          L.push({ type: 'choice', label: 'Scénario', value: cfg.preset, set: (x) => { cfg.preset = x; buildColl(); }, options: Object.keys(PRESETS).map((k) => ({ id: k, label: PRESETS[k].nom })) });
          L.push({ type: 'note', text: pr.why });
          L.push({ type: 'bar', label: 'Temps écoulé', color: '#ffe0a0', value: clamp(NB.t / 40, 0, 1), txt: Math.round(NB.t * 47) + ' millions d’années' });
          L.push({ type: 'slider', label: 'Vitesse', min: 0.1, max: 2, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'choice', label: 'Couleurs', value: cfg.colMode, set: (x) => { cfg.colMode = x; }, options: [{ id: 0, label: 'Par galaxie' }, { id: 1, label: 'Par vitesse' }] });
          L.push({ type: 'buttons', items: [{ label: 'Recommencer', act: () => buildColl() }, { label: 'Vue du dessus', act: () => { cfg.incl = 1.5; } }, { label: 'De biais', act: () => { cfg.incl = 0.6; } }] });
          L.push({ type: 'note', text: `${Math.round(NB.n / 1000)} 000 étoiles-tests · ${NB.cores.length} noyaux. L’outil ASTRE lance un noyau de plus.` });
        }
        if (cfg.scene === 'trounoir') {
          L.push({ type: 'section', label: 'Trou noir' });
          L.push({ type: 'toggle', label: 'Disque d’accrétion', value: cfg.disk, set: (x) => { cfg.disk = x; } });
          L.push({ type: 'toggle', label: 'Effets Doppler et décalage gravitationnel', value: !!cfg.dop, set: (x) => { cfg.dop = x ? 1 : 0; } });
          L.push({ type: 'slider', label: 'Distance', min: 8, max: 60, step: 0.5, value: cfg.dist, fmt: (x) => fr(x, 0) + ' rayons de Schwarzschild', set: (x) => { cfg.dist = x; } });
          L.push({ type: 'slider', label: 'Inclinaison', min: -1.4, max: 1.4, step: 0.01, value: cfg.bincl, fmt: (x) => Math.round((x * 180) / Math.PI) + '°', set: (x) => { cfg.bincl = x; } });
          L.push({ type: 'slider', label: 'Rotation du disque', min: 0, max: 2, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'note', text: 'Sans le disque, on voit la lentille gravitationnelle déformer le ciel ; avec, on voit l’image du disque arrière passer au-dessus et au-dessous de l’ombre.' });
        }
        L.push({ type: 'section', label: 'Calcul et rendu' });
        if (cfg.scene !== 'trounoir') L.push({ type: 'slider', label: 'Halo lumineux', min: 0, max: 1.5, step: 0.01, value: cfg.bloom, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.bloom = x; } });
        L.push({ type: 'choice', label: 'Définition', value: cfg.q, set: (x) => { if (x === cfg.q) return; cfg.q = x; const old = R; R = initGL(); old.K.lose(); SP = null; NB = null; setScene(cfg.scene); }, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        return L;
      },
    };
  }
})();
