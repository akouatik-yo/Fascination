/* Fascination — Le Sable en trois dimensions (moteur des scènes Dunes, Fourmilions, Tas de sable, Château)
   Le sable est un relief : une hauteur de sable par case, posée sur un socle rocheux. Une pente plus raide
   que l'angle de repos (propre à chaque sable, bien plus grand s'il est mouillé, plus faible sous l'eau)
   déclenche une avalanche. Les dunes suivent le modèle de Werner (1995) : le vent arrache des tranches de
   sable et les redépose plus loin, sauf à l'abri des crêtes. Rendu WebGL2 : maillage en perspective,
   ombres portées par marche de rayon dans la carte des hauteurs, rides éoliennes, éclats du quartz. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const { GLKit } = window.FKGL;
  const D2R = Math.PI / 180;

  const SANDS = [
    { nom: 'Quartz', fr: 'sable de dune · SiO₂', col: [0.78, 0.56, 0.31], ang: 33, css: '#e6b46a' },
    { nom: 'Basalte', fr: 'sable noir volcanique · Islande', col: [0.07, 0.07, 0.08], ang: 38, css: '#8a8894' },
    { nom: 'Homotrema rubrum', fr: 'sable rose · Bermudes', col: [0.86, 0.52, 0.5], ang: 31, css: '#f2a6a6' },
    { nom: 'Olivine', fr: 'sable vert · Papakōlea, Hawaï', col: [0.3, 0.38, 0.12], ang: 34, css: '#9ab45a' },
    { nom: 'Gravier', fr: 'gros grains', col: [0.42, 0.39, 0.35], ang: 30, css: '#a49a8c' },
  ];
  let ROCK = [0.28, 0.15, 0.1];

  /* ───────── petites matrices ───────── */
  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]); }
  function lookAt(e, c, u) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  }
  function mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function inv(m) {
    const a = m, o = new Float32Array(16);
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
    return o;
  }
  const xf = (m, x, y, z) => { const w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w, w]; };

  /* ───────── shaders ───────── */
  const COMMON = `
uniform sampler2D uH, uC; uniform vec2 uN; uniform float uHS;
float hAt(vec2 uv){ return texture(uH, uv).r * uHS; }
`;
  const VS_T = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 aPos; uniform mat4 uVP; ${COMMON}
out vec3 vW; out vec2 vUv;
void main(){ vUv = aPos; vec3 w = vec3(aPos.x * uN.x, hAt(aPos), aPos.y * uN.y); vW = w; gl_Position = uVP * vec4(w, 1.); }`;
  const FS_T = `#version 300 es
precision highp float; precision highp sampler2D;
in vec3 vW; in vec2 vUv; ${COMMON}
uniform vec3 uSun, uSunCol, uSky, uEye, uFog; uniform float uTime, uWind, uDecor, uInk, uSea, uFogK; uniform vec3 uPaper;
out vec4 o;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec2 du = 1. / uN;
  float hl = hAt(vUv - vec2(du.x, 0.)), hr = hAt(vUv + vec2(du.x, 0.)), hd = hAt(vUv - vec2(0., du.y)), hu = hAt(vUv + vec2(0., du.y));
  vec3 n = normalize(vec3(hl - hr, 2., hd - hu));
  vec4 C = texture(uC, vUv);
  float wet = C.a;
  // rides éoliennes : petites ondulations perpendiculaires au vent, effacées sur les pentes fortes
  float flat_ = smoothstep(.75, .95, n.y);
  float rip = sin(vW.x * 2.6 + sin(vW.z * .7) * 1.4 + hash12(floor(vW.xz * .25)) * .6);
  n = normalize(n + vec3(rip * .09 * flat_ * uWind * (1. - wet), 0., 0.));
  // ombres portées : on remonte vers le soleil dans la carte des hauteurs
  float sh = 1.; vec3 p = vW + n * .3; float st = .6;
  for (int i = 0; i < 40; i++){
    p += uSun * st; st *= 1.07;
    vec2 q = vec2(p.x / uN.x, p.z / uN.y);
    if (q.x < 0. || q.y < 0. || q.x > 1. || q.y > 1. || p.y > uHS * 1.2) break;
    float d = p.y - hAt(q);
    sh = min(sh, clamp(d * 1.2 / (st * 2.) + .5, 0., 1.));
    if (sh < .02) break;
  }
  vec3 alb = pow(C.rgb, vec3(2.2)) * (1. - wet * .45);
  float dif = max(dot(n, uSun), 0.);
  vec3 V = normalize(uEye - vW);
  vec3 col = alb * (uSunCol * dif * sh * 1.25 + uSky * (.22 + .2 * n.y));
  // éclats du quartz et reflet du sable mouillé
  vec3 Hh = normalize(uSun + V);
  float g = step(.985, hash12(floor(vW.xz * 6.) + floor(uTime * 2.) * .0)) * pow(max(dot(n, Hh), 0.), 30.) * sh;
  col += uSunCol * (g * 1.6 * (1. - wet) + pow(max(dot(n, Hh), 0.), 60.) * wet * .6 * sh);
  if (vW.y < uSea) col *= mix(vec3(.55, .75, .85), vec3(1.), clamp(1. - (uSea - vW.y) * .25, 0., 1.));
  float dist = length(uEye - vW);
  if (uDecor > .5) col = mix(col, uFog, 1. - exp(-dist * uFogK));
  if (uInk > .5){ col = aces(col * 1.1); o = vec4(pow(col, vec3(1. / 2.2)), 1.); return; }
  col = aces(col * 1.05);
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;
  const VS_SKY = `#version 300 es
in vec2 aPos; out vec2 vP; void main(){ vP = aPos; gl_Position = vec4(aPos, .9999, 1.); }`;
  const FS_SKY = `#version 300 es
precision highp float;
in vec2 vP; uniform mat4 uIVP; uniform vec3 uSun, uZen, uHor, uSunCol; uniform float uDecor; uniform vec3 uBg;
out vec4 o;
void main(){
  if (uDecor < .5){ o = vec4(uBg, 1.); return; }
  vec4 a = uIVP * vec4(vP, -1., 1.), b = uIVP * vec4(vP, 1., 1.);
  vec3 d = normalize(b.xyz / b.w - a.xyz / a.w);
  float y = max(d.y, 0.);
  vec3 c = mix(uHor, uZen, pow(y, .55));
  float s = max(dot(d, uSun), 0.);
  c += uSunCol * (pow(s, 900.) * 8. + pow(s, 12.) * .35 + pow(s, 3.) * .08);
  o = vec4(pow(c, vec3(1. / 2.2)), 1.);
}`;
  const VS_W = `#version 300 es
in vec2 aPos; uniform mat4 uVP; uniform vec2 uN; uniform float uSea, uTime; out vec3 vW;
void main(){ vec3 w = vec3(aPos.x * uN.x * 1.6 - uN.x * .3, uSea, aPos.y * uN.y * 1.6 - uN.y * .3); w.y += sin(w.x * .35 + uTime * 1.6) * .12 + sin(w.z * .5 - uTime) * .08; vW = w; gl_Position = uVP * vec4(w, 1.); }`;
  const FS_W = `#version 300 es
precision highp float;
in vec3 vW; uniform vec3 uEye, uSun, uSky, uSunCol; uniform float uTime; out vec4 o;
void main(){
  vec3 n = normalize(vec3(sin(vW.x * .9 + uTime * 2.) * .06 + sin(vW.z * 1.3 - uTime * 1.3) * .05, 1., cos(vW.z * .8 + uTime * 1.7) * .06));
  vec3 V = normalize(uEye - vW);
  float F = .03 + .97 * pow(1. - max(dot(n, V), 0.), 5.);
  vec3 R = reflect(-V, n);
  vec3 c = mix(vec3(.02, .12, .16), uSky * 1.2, F) + uSunCol * pow(max(dot(R, uSun), 0.), 200.) * 3.;
  o = vec4(pow(c, vec3(1. / 2.2)), .55 + F * .4);
}`;

  const QUAL = { legere: { nx: 130, comp: 0.8 }, normale: { nx: 170, comp: 1.1 }, haute: { nx: 220, comp: 1.6 } };

  /* ───────── le moteur ───────── */
  window.SABLE3D = function make3D(env, scene, opts) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const kS = clamp(Math.min(W, H) / 800, 0.6, 1.5);
    const cfg = Object.assign({ put: 0, sun: scene === 'dunes' ? 0.35 : 0.5, wind: 0.5, supply: 0.35, orbit: true, az: 0.2, el: scene === 'dunes' ? 0.3 : 0.55, q: 'haute' }, opts || {});
    const snd = () => au && au.on && au.ctx;

    let SH, K, gl, NX, NY, Nn, S, Rk, Wt, M, Hh, colB, hTex, cTex, mesh, P = {};
    function init() {
      const Q = QUAL[cfg.q];
      const cs = Math.min(dpr, Q.comp);
      K = GLKit(Math.round(W * cs), Math.round(H * cs), { depth: true });
      gl = K.gl;
      NX = Q.nx; NY = Math.round(NX * 0.72); Nn = NX * NY;
      SH = new Uint8Array(Nn); S = new Float32Array(Nn); Rk = new Float32Array(Nn); Wt = new Float32Array(Nn); M = new Uint8Array(Nn); Hh = new Float32Array(Nn); colB = new Uint8Array(Nn * 4);
      hTex = gl.createTexture(); cTex = gl.createTexture();
      for (const t of [hTex, cTex]) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      gl.bindTexture(gl.TEXTURE_2D, hTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, NX, NY, 0, gl.RED, gl.FLOAT, Hh);
      gl.bindTexture(gl.TEXTURE_2D, cTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NX, NY, 0, gl.RGBA, gl.UNSIGNED_BYTE, colB);
      P.t = K.program(FS_T, VS_T); P.sky = K.program(FS_SKY, VS_SKY); P.w = K.program(FS_W, VS_W);
      const vt = new Float32Array(NX * NY * 2);
      for (let j = 0, k = 0; j < NY; j++) for (let i = 0; i < NX; i++) { vt[k++] = i / (NX - 1); vt[k++] = j / (NY - 1); }
      const idx = new Uint32Array((NX - 1) * (NY - 1) * 6);
      for (let j = 0, k = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i; idx[k++] = a; idx[k++] = a + NX; idx[k++] = a + 1; idx[k++] = a + 1; idx[k++] = a + NX; idx[k++] = a + NX + 1; }
      mesh = { vao: gl.createVertexArray(), n: idx.length };
      gl.bindVertexArray(mesh.vao);
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, vt, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      // quadrillage grossier pour la mer
      const wv = new Float32Array(64 * 64 * 2); for (let j = 0, k = 0; j < 64; j++) for (let i = 0; i < 64; i++) { wv[k++] = i / 63; wv[k++] = j / 63; }
      const wi = new Uint16Array(63 * 63 * 6); for (let j = 0, k = 0; j < 63; j++) for (let i = 0; i < 63; i++) { const a = j * 64 + i; wi[k++] = a; wi[k++] = a + 64; wi[k++] = a + 1; wi[k++] = a + 1; wi[k++] = a + 64; wi[k++] = a + 65; }
      P.wm = { vao: gl.createVertexArray(), n: wi.length };
      gl.bindVertexArray(P.wm.vao);
      const wb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, wb); gl.bufferData(gl.ARRAY_BUFFER, wv, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const wib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wi, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
    }
    init();
    const I = (x, y) => y * NX + x;
    const per = () => scene === 'dunes';
    const wrapX = (x) => (x + NX) % NX, wrapY = (y) => (y + NY) % NY;
    function hAt(x, y) {
      x = clamp(x, 0, NX - 1.001); y = clamp(y, 0, NY - 1.001);
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, a = I(i, j);
      const h = (k) => Rk[k] + S[k];
      return (h(a) * (1 - fx) + h(a + 1) * fx) * (1 - fy) + (h(a + NX) * (1 - fx) + h(a + NX + 1) * fx) * fy;
    }

    /* ───────── scènes ───────── */
    let sea = -99, ants = [], antl = [], nest = null, food = null, fly = [], stream = null, VT = 0;
    function addSand(x, y, r, amt, m) {
      for (let dy = -Math.ceil(r); dy <= r; dy++) for (let dx = -Math.ceil(r); dx <= r; dx++) {
        const xx = Math.round(x + dx), yy = Math.round(y + dy); if (xx < 0 || yy < 0 || xx >= NX || yy >= NY) continue;
        const d = Math.hypot(dx, dy); if (d > r) continue;
        const k = I(xx, yy), a = amt * (1 - d / (r + 0.01));
        if (a > 0) { S[k] = Math.max(0, S[k] + a); if (amt > 0) M[k] = m; }
      }
    }
    function setup() {
      ROCK = scene === 'tas' ? [0.16, 0.15, 0.17] : scene === 'chateau' ? [0.7, 0.55, 0.36] : [0.58, 0.36, 0.22];
      S.fill(0); Rk.fill(0); Wt.fill(0); M.fill(0); ants = []; antl = []; fly = []; stream = null; sea = -99;
      if (scene === 'dunes') {
        // un sol rocheux et du sable en tas épars : le vent va les sculpter
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) Rk[I(i, j)] = 1.2 + Math.sin(i * 0.05) * 0.4 + Math.sin(j * 0.08 + 1) * 0.3;
        const n = Math.round(14 + cfg.supply * 40);
        for (let k = 0; k < n; k++) addSand(rnd(NX), rnd(NY), rnd(11, 6), rnd(6, 3), 0);
        if (cfg.supply > 0.5) for (let k = 0; k < Nn; k++) S[k] += (cfg.supply - 0.5) * 6 * (0.8 + Math.random() * 0.4);
      } else if (scene === 'fourmilions') {
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const k = I(i, j); Rk[k] = 0; S[k] = 6 + Math.sin(i * 0.04) * 1.2 + Math.sin(j * 0.06 + 2) * 1; M[k] = 0; }
        nest = { x: NX * 0.12, y: NY * 0.5 }; food = { x: NX * 0.88, y: NY * 0.45 };
        for (const [fx, fy] of [[0.4, 0.4], [0.56, 0.62], [0.68, 0.32]]) newAntlion(NX * fx, NY * fy, true);
      } else if (scene === 'tas') {
        for (let k = 0; k < Nn; k++) Rk[k] = 0.5;
        stream = { x: NX * 0.5, y: NY * 0.5, rate: 1.4, m: cfg.put, t: 0 };
      } else if (scene === 'chateau') {
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const k = I(i, j); S[k] = 5 + (1 - j / NY) * 3 - Math.max(0, i / NX - 0.6) * 18; Wt[k] = 0; }
        sea = 3.2;
        buildCastle();
      }
      relax(30);
    }
    function buildCastle() {
      const cx0 = NX * 0.38, cy0 = NY * 0.48, base = hAt(cx0, cy0);
      const tower = (x, y, r, h) => { for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) { const d = Math.hypot(dx, dy); if (d > r) continue; const k = I(Math.round(x + dx), Math.round(y + dy)); const top = base + h + (d > r - 1.2 && ((Math.atan2(dy, dx) * 4 / Math.PI + 8) % 1) < 0.5 ? 1.2 : 0); S[k] = Math.max(S[k], top - Rk[k]); Wt[k] = 1; M[k] = 0; } };
      const wall = (x0, y0, x1, y1, th, h) => { const L = Math.hypot(x1 - x0, y1 - y0); for (let t = 0; t <= L; t += 0.5) { const x = x0 + (x1 - x0) * t / L, y = y0 + (y1 - y0) * t / L; for (let o = -th; o <= th; o += 0.5) { const nx = -(y1 - y0) / L, ny = (x1 - x0) / L; const k = I(Math.round(x + nx * o), Math.round(y + ny * o)); S[k] = Math.max(S[k], base + h + (Math.floor(t / 2) % 2 ? 0.8 : 0) - Rk[k]); Wt[k] = 1; } } };
      const s = NX / 200;
      const c = [[-14, -10], [14, -10], [14, 10], [-14, 10]].map(([a, b]) => [cx0 + a * s, cy0 + b * s]);
      for (let k = 0; k < 4; k++) wall(c[k][0], c[k][1], c[(k + 1) % 4][0], c[(k + 1) % 4][1], 1.5 * s, 6 * s);
      for (const [x, y] of c) tower(x, y, 4 * s, 11 * s);
      tower(cx0, cy0, 5 * s, 16 * s);
      tower(cx0, cy0, 2.4 * s, 21 * s);
    }
    function newAntlion(x, y, predig) {
      const a = { x, y, R: 9, fed: 0, t: 0, toss: 0, life: rnd(150, 90), seed: rnd(10), depth: 0 };
      if (predig) for (let dy = -a.R; dy <= a.R; dy++) for (let dx = -a.R; dx <= a.R; dx++) { const d = Math.hypot(dx, dy); if (d > a.R) continue; const k = I(Math.round(x + dx), Math.round(y + dy)); S[k] = Math.max(0, S[k] - (a.R - d) * 0.6); }
      antl.push(a);
    }

    /* ───────── avalanches ───────── */
    const tanD = SANDS.map((s) => Math.tan(s.ang * D2R));
    let aval = 0, shake = null;
    function crit(k) {
      const h = Rk[k] + S[k];
      if (h < sea) return 0.5; // sous l'eau : aucun pont capillaire
      const w = Wt[k], base = tanD[M[k]];
      return w > 0.12 ? base + (5.5 - base) * Math.min(1, (w - 0.12) / 0.35) : base;
    }
    const NBX = new Int8Array([1, -1, 0, 0, 1, -1, 1, -1]), NBY = new Int8Array([0, 0, 1, -1, 1, 1, -1, -1]), NBD = new Float32Array([1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2]);
    let CR = null;
    function relax(passes) {
      aval = 0;
      const wrap = per();
      if (!CR || CR.length !== Nn) CR = new Float32Array(Nn);
      for (let k = 0; k < Nn; k++) if (S[k] > 0) CR[k] = crit(k);
      if (shake) for (let j = Math.max(0, Math.floor(shake.y - shake.r)); j < Math.min(NY, shake.y + shake.r); j++) for (let i = Math.max(0, Math.floor(shake.x - shake.r)); i < Math.min(NX, shake.x + shake.r); i++) CR[j * NX + i] *= 0.55;
      for (let p = 0; p < passes; p++) {
        const fwd = p & 1;
        for (let jj = 0; jj < NY; jj++) {
          const j = fwd ? jj : NY - 1 - jj, row = j * NX;
          for (let ii = 0; ii < NX; ii++) {
            const i = fwd ? ii : NX - 1 - ii, k = row + i;
            let sk = S[k];
            if (sk <= 0) continue;
            const c = CR[k], h = Rk[k] + sk;
            const edge = i === 0 || j === 0 || i === NX - 1 || j === NY - 1;
            for (let n = 0; n < 8; n++) {
              let q;
              if (edge) {
                let x = i + NBX[n], y = j + NBY[n];
                if (wrap) { x = (x + NX) % NX; y = (y + NY) % NY; } else if (x < 0 || y < 0 || x >= NX || y >= NY) continue;
                q = y * NX + x;
              } else q = k + NBX[n] + NBY[n] * NX;
              const dh = h - (Rk[q] + S[q]) - c * NBD[n];
              if (dh > 0.02) {
                const a = sk < dh * 0.22 ? sk : dh * 0.22;
                sk -= a; S[q] += a; aval += a;
                if (a > 0.04) M[q] = M[k];
                if (Wt[k] > Wt[q]) Wt[q] = Math.max(Wt[q], Wt[k] * 0.5);
                if (sk <= 0) break;
              }
            }
            S[k] = sk;
          }
        }
      }
    }

    /* ───────── le vent : modèle de Werner (1995) ───────── */
    function werner(n) {
      if (cfg.wind < 0.02) return;
      const tan15 = Math.tan(15 * D2R), L = Math.max(1, Math.round(1 + cfg.wind * 4)), q = 0.25;
      const shd = SH;
      // zones d'ombre : sous le vent d'une crête, rien n'est arraché et tout se dépose
      for (let j = 0; j < NY; j++) {
        let line = -1e9;
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NX; i++) {
          const k = j * NX + i, h = Rk[k] + S[k];
          line = Math.max(line - tan15, h);
          if (pass) shd[k] = line > h + 0.05 ? 1 : 0;
        }
      }
      for (let t = 0; t < n; t++) {
        let i = rint(NX), j = rint(NY), k = j * NX + i;
        if (S[k] < q || shd[k]) continue;
        S[k] -= q;
        const m = M[k];
        for (let hop = 0; hop < 30; hop++) {
          i = (i + L) % NX; j = (j + (Math.random() < 0.15 ? (Math.random() < 0.5 ? 1 : -1) : 0) + NY) % NY; k = j * NX + i;
          if (shd[k] || Math.random() < (S[k] > 0.05 ? 0.6 : 0.4)) { S[k] += q; M[k] = m; break; }
        }
      }
      return shd;
    }

    /* ───────── caméra ───────── */
    let VP, IVP, eye;
    function camera() {
      const zoom = { dunes: 0.85, fourmilions: 0.45, tas: 0.55, chateau: 0.8 }[scene] || 1;
      const cxm = NX / 2, cym = NY / 2, dist = Math.max(NX, NY) * (0.95 - cfg.el * 0.15) * zoom;
      const az = cfg.az * TAU, el = 0.25 + cfg.el * 0.75;
      eye = [cxm + Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist + 3, cym + Math.cos(az) * Math.cos(el) * dist];
      const ty = scene === 'chateau' ? 7 : scene === 'tas' ? 3 : 4;
      const Pm = persp(42 * D2R, W / H, 0.5, dist * 5), V = lookAt(eye, [cxm, ty, cym], [0, 1, 0]);
      VP = mul(Pm, V); IVP = inv(VP);
    }
    const focal = (H / 2) / Math.tan(21 * D2R);
    const proj = (x, y, z) => { const p = xf(VP, x, y, z); return [(p[0] * 0.5 + 0.5) * W, (1 - (p[1] * 0.5 + 0.5)) * H, p[2], p[3]]; };
    function pickGround(px, py) {
      const nx = (px / W) * 2 - 1, ny = 1 - (py / H) * 2;
      const a = xf(IVP, nx, ny, -1), b = xf(IVP, nx, ny, 1);
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d);
      let prev = null;
      for (let t = 0; t < L; t += 0.5) {
        const x = a[0] + d[0] * t / L, y = a[1] + d[1] * t / L, z = a[2] + d[2] * t / L;
        if (x < -2 || z < -2 || x > NX + 2 || z > NY + 2) { if (prev) break; continue; }
        prev = 1;
        if (y <= hAt(x, z)) return { x, y: z };
      }
      return null;
    }

    /* ───────── lumière par scène ───────── */
    function light() {
      const L = {
        dunes: { sunEl: 9 + cfg.sun * 30, sunAz: 120, sunCol: [1.6, 0.95, 0.55], sky: [0.35, 0.42, 0.62], zen: [0.12, 0.18, 0.42], hor: [0.95, 0.5, 0.32], fog: [0.62, 0.42, 0.36], fogK: 0.0016 },
        fourmilions: { sunEl: 20 + cfg.sun * 40, sunAz: 140, sunCol: [1.5, 1.15, 0.8], sky: [0.42, 0.55, 0.75], zen: [0.18, 0.35, 0.7], hor: [0.85, 0.82, 0.8], fog: [0.62, 0.66, 0.72], fogK: 0.0012 },
        tas: { sunEl: 35 + cfg.sun * 30, sunAz: 150, sunCol: [1.45, 1.3, 1.1], sky: [0.3, 0.32, 0.38], zen: [0.05, 0.05, 0.08], hor: [0.18, 0.16, 0.2], fog: [0.1, 0.1, 0.12], fogK: 0.001 },
        chateau: { sunEl: 40 + cfg.sun * 30, sunAz: 160, sunCol: [1.5, 1.4, 1.2], sky: [0.45, 0.6, 0.85], zen: [0.2, 0.42, 0.85], hor: [0.75, 0.85, 0.95], fog: [0.6, 0.72, 0.85], fogK: 0.0012 },
      }[scene];
      const e = L.sunEl * D2R, a = L.sunAz * D2R;
      L.dir = [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
      return L;
    }

    /* ───────── vie : fourmilions et fourmis ───────── */
    let antT = 1;
    function grad(x, y) { return [(hAt(x + 1, y) - hAt(x - 1, y)) / 2, (hAt(x, y + 1) - hAt(x, y - 1)) / 2]; }
    function life(dt) {
      for (let k = antl.length - 1; k >= 0; k--) {
        const a = antl[k]; a.t += dt; a.toss -= dt;
        let rim = 0; for (let n = 0; n < 8; n++) rim += hAt(a.x + Math.cos(n * TAU / 8) * (a.R + 1), a.y + Math.sin(n * TAU / 8) * (a.R + 1)); rim /= 8;
        a.depth = rim - hAt(a.x, a.y);
        const prey = ants.find((n) => n.pit === a && n.st === 'glisse');
        if (a.toss <= 0 && (a.depth < a.R * 0.55 || prey)) {
          a.toss = prey ? 0.14 : 0.06;
          const k0 = I(Math.round(a.x), Math.round(a.y));
          if (S[k0] > 0.3) {
            S[k0] -= 0.3;
            const ang = prey ? Math.atan2(prey.y - a.y, prey.x - a.x) + rnd(0.3, -0.3) : rnd(TAU), sp = rnd(13, 9);
            fly.push({ x: a.x, y: a.y, z: hAt(a.x, a.y) + 0.3, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vz: rnd(12, 8), m: M[k0], q: 0.3 });
            if (prey) prey.kick = 0.35;
          }
        }
        if (a.t > a.life && !prey) {
          antl.splice(k, 1);
          setTimeout(() => { if (antl.length < 4) newAntlion(rnd(NX * 0.75, NX * 0.3), rnd(NY * 0.8, NY * 0.2), false); }, 12000);
        }
      }
      if (scene !== 'fourmilions') return;
      antT -= dt;
      if (antT <= 0 && ants.length < 14) { antT = rnd(3, 1.2); ants.push({ x: nest.x, y: nest.y, a: Math.atan2(food.y - nest.y, food.x - nest.x) + rnd(0.4, -0.4), st: 'aller', seed: false, sp: rnd(9, 6), t: 0, kick: 0, pit: null, ph: rnd(TAU) }); }
      for (let k = ants.length - 1; k >= 0; k--) {
        const n = ants[k]; n.t += dt; n.ph += dt * 14; n.kick = Math.max(0, n.kick - dt);
        if (n.st === 'prise') { if (n.t > 2.5) { if (n.pit) n.pit.fed++; ants.splice(k, 1); } continue; }
        const g = grad(n.x, n.y), slope = Math.hypot(g[0], g[1]);
        if (n.st === 'glisse') {
          const a = n.pit;
          if (!antl.includes(a)) { n.st = 'aller'; continue; }
          // elle remonte la pente, le sable se dérobe ; les jets du fourmilion la font redescendre
          const up = Math.atan2(g[1], g[0]);
          n.x += Math.cos(up) * 3 * dt; n.y += Math.sin(up) * 3 * dt;
          const slide = (slope > 0.45 ? 5 : 2) + (n.kick > 0 ? 9 : 0);
          n.x -= g[0] / (slope + 1e-3) * slide * dt; n.y -= g[1] / (slope + 1e-3) * slide * dt;
          if (Math.random() < dt * 4) { const kk = I(Math.round(n.x), Math.round(n.y)); if (S[kk] > 0.1) { S[kk] -= 0.1; S[I(Math.round(n.x - g[0] * 2), Math.round(n.y - g[1] * 2))] += 0.1; } }
          if (Math.hypot(n.x - a.x, n.y - a.y) < 1.4) { n.st = 'prise'; n.t = 0; if (snd()) au.note(1100, 0.05, 'square', 0.02); }
          if (Math.hypot(n.x - a.x, n.y - a.y) > a.R + 1.5) n.st = n.seed ? 'retour' : 'aller';
          n.a = up;
          continue;
        }
        const goal = n.st === 'aller' ? food : nest;
        let ta = Math.atan2(goal.y - n.y, goal.x - n.x) + Math.sin(n.t * 1.3 + n.ph) * 0.5;
        // elle évite les pentes trop raides qu'elle voit devant elle, sauf faux pas
        for (const a of antl) {
          const d = Math.hypot(a.x - n.x, a.y - n.y);
          if (d < a.R + 3) {
            if (!n.misstep && d > a.R) n.misstep = Math.random() < 0.18 ? a : 'non';
            if (n.misstep === a && d < a.R * 0.85) { n.st = 'glisse'; n.pit = a; n.misstep = null; break; }
            if (n.misstep !== a) ta = Math.atan2(n.y - a.y, n.x - a.x) + (angDiff(Math.atan2(n.y - a.y, n.x - a.x), ta) > 0 ? 1.3 : -1.3);
          } else if (n.misstep === a || n.misstep === 'non') { if (d > a.R + 6) n.misstep = null; }
        }
        if (n.st === 'glisse') continue;
        n.a += clamp(angDiff(n.a, ta), -4 * dt, 4 * dt);
        n.x += Math.cos(n.a) * n.sp * dt; n.y += Math.sin(n.a) * n.sp * dt;
        n.x = clamp(n.x, 1, NX - 2); n.y = clamp(n.y, 1, NY - 2);
        if (Math.hypot(goal.x - n.x, goal.y - n.y) < 2.5) { if (n.st === 'aller') { n.st = 'retour'; n.seed = true; } else { ants.splice(k, 1); } }
      }
    }
    const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

    /* ───────── un pas ───────── */
    let shd = null, hiss = null, boom = null;
    if (snd()) {
      const c = au.ensure();
      if (c) {
        const s = c.createBufferSource(); s.buffer = au.noiseBuf(); s.loop = true;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 0.6;
        const g = c.createGain(); g.gain.value = 0.0001; s.connect(f); f.connect(g); g.connect(au.master); s.start();
        hiss = { s, g }; boom = au.drone(90, 'sawtooth', 0);
      }
    }
    function step(dt) {
      VT += dt;
      if (cfg.orbit) cfg.az = (cfg.az + dt * 0.006) % 1;
      if (stream) {
        stream.t += dt;
        addSand(stream.x, stream.y, 1.6, stream.rate * dt * 6, stream.m);
        // tous les quelques secondes, le filet change de sable : les couches successives se lisent dans le tas
        if (cfg.cycle && stream.t > 9) { stream.t = 0; stream.m = (stream.m + 1) % 4; }
      }
      if (scene === 'dunes') shd = werner(Math.round(Nn * 0.12 * cfg.wind * dt * 60));
      // humidité : le soleil sèche, la mer mouille
      const dry = dt * (0.004 + cfg.sun * 0.03);
      for (let k = 0; k < Nn; k++) { if (Rk[k] + S[k] < sea + 0.3) Wt[k] = 1; else if (Wt[k] > 0) Wt[k] = Math.max(0, Wt[k] - dry * (Wt[k] > 0.5 ? 0.6 : 1)); }
      if (scene === 'chateau') sea = 3.2 + Math.sin(VT * TAU / 70) * 1.4;
      relax(1);
      if (shake) { shake.t -= dt; if (shake.t <= 0) shake = null; }
      for (let k = fly.length - 1; k >= 0; k--) {
        const f = fly[k]; f.vz -= 40 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
        if (f.x < 0 || f.y < 0 || f.x >= NX || f.y >= NY) { fly.splice(k, 1); continue; }
        if (f.z <= hAt(f.x, f.y)) { const kk = I(Math.round(f.x), Math.round(f.y)); S[kk] += f.q; M[kk] = f.m; fly.splice(k, 1); }
      }
      life(dt);
      if (hiss) { hiss.g.gain.setTargetAtTime(clamp(aval / 60, 0, 1) * 0.05, au.ctx.currentTime, 0.2); boom.gain(scene === 'dunes' && aval > 25 ? clamp((aval - 25) / 80, 0, 1) * 0.045 : 0); }
    }

    /* ───────── rendu ───────── */
    function upload() {
      for (let k = 0; k < Nn; k++) {
        const s = S[k], h = Rk[k] + s; Hh[k] = h;
        const c = s > 0.6 ? SANDS[M[k]].col : ROCK, mix = clamp(s / 0.6, 0, 1);
        const r = s > 0.6 ? c[0] : ROCK[0] + (SANDS[M[k]].col[0] - ROCK[0]) * mix, g = s > 0.6 ? c[1] : ROCK[1] + (SANDS[M[k]].col[1] - ROCK[1]) * mix, b = s > 0.6 ? c[2] : ROCK[2] + (SANDS[M[k]].col[2] - ROCK[2]) * mix;
        colB[k * 4] = Math.min(255, r * 255); colB[k * 4 + 1] = Math.min(255, g * 255); colB[k * 4 + 2] = Math.min(255, b * 255); colB[k * 4 + 3] = Math.min(255, Wt[k] * 255);
      }
      gl.bindTexture(gl.TEXTURE_2D, hTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RED, gl.FLOAT, Hh);
      gl.bindTexture(gl.TEXTURE_2D, cTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RGBA, gl.UNSIGNED_BYTE, colB);
    }
    function render() {
      camera(); upload();
      const L = light(), bare = env.decor === false, ink = bare && env.theme === 'light';
      const bg = ink ? [0.94, 0.92, 0.86] : [0.02, 0.018, 0.025];
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, K.canvas.width, K.canvas.height);
      gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      P.sky.use().f('uSun', ...L.dir).f('uZen', ...L.zen).f('uHor', ...L.hor).f('uSunCol', ...L.sunCol).f('uDecor', bare ? 0 : 1).f('uBg', ...bg);
      gl.uniformMatrix4fv(gl.getUniformLocation(P.sky.p, 'uIVP'), false, IVP);
      K.run(P.sky, null);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      P.t.use().t('uH', hTex).t('uC', cTex).f('uN', NX, NY).f('uHS', 1).f('uSun', ...L.dir).f('uSunCol', ...L.sunCol).f('uSky', ...L.sky).f('uEye', ...eye)
        .f('uFog', ...L.fog).f('uFogK', L.fogK).f('uTime', VT).f('uWind', scene === 'dunes' || scene === 'fourmilions' ? 1 : 0.3).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uSea', sea).f('uPaper', 0.94, 0.92, 0.86);
      gl.uniformMatrix4fv(gl.getUniformLocation(P.t.p, 'uVP'), false, VP);
      gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.n, gl.UNSIGNED_INT, 0);
      if (sea > -50 && !bare) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        P.w.use().f('uN', NX, NY).f('uSea', sea).f('uTime', VT).f('uEye', ...eye).f('uSun', ...L.dir).f('uSky', ...L.sky).f('uSunCol', ...L.sunCol);
        gl.uniformMatrix4fv(gl.getUniformLocation(P.w.p, 'uVP'), false, VP);
        gl.bindVertexArray(P.wm.vao); gl.drawElements(gl.TRIANGLES, P.wm.n, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.BLEND);
      }
      gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(null);
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      overlay(bare, ink);
    }
    function overlay(bare, ink) {
      // grains en vol et filet de sable
      for (const f of fly) { const p = proj(f.x, f.z, f.y); if (p[3] <= 0) continue; const c = SANDS[f.m].col; ctx.fillStyle = `rgb(${c[0] * 300 | 0},${c[1] * 300 | 0},${c[2] * 300 | 0})`; ctx.fillRect(p[0] - 1.2, p[1] - 1.2, 2.4, 2.4); }
      if (stream) {
        const top = proj(stream.x, 60, stream.y), bot = proj(stream.x, hAt(stream.x, stream.y), stream.y), c = SANDS[stream.m].col;
        ctx.strokeStyle = `rgba(${c[0] * 300 | 0},${c[1] * 300 | 0},${c[2] * 300 | 0},.8)`; ctx.lineWidth = 2.5 * kS;
        ctx.setLineDash([2, 3]); ctx.lineDashOffset = -VT * 60; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bot[0], bot[1]); ctx.stroke(); ctx.setLineDash([]);
      }
      if (bare) { drawLabel(ink); return; }
      for (const a of antl) {
        const p = proj(a.x, hAt(a.x, a.y) + 0.2, a.y); if (p[3] <= 0) continue;
        const s = 1.3 * focal / p[3], op = 0.4 + 0.3 * Math.sin(VT * 3 + a.seed);
        ctx.strokeStyle = '#2a170a'; ctx.lineWidth = Math.max(1, s * 0.12); ctx.lineCap = 'round';
        for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(p[0] + sg * s * 0.15, p[1]); ctx.quadraticCurveTo(p[0] + sg * s * (0.5 + op * 0.3), p[1] - s * 0.4, p[0] + sg * s * 0.2, p[1] - s * 0.75); ctx.stroke(); }
      }
      if (nest && scene === 'fourmilions') { const p = proj(nest.x, hAt(nest.x, nest.y), nest.y), s = 260 / p[3] * kS; ctx.fillStyle = 'rgba(30,18,10,.85)'; ctx.beginPath(); ctx.ellipse(p[0], p[1], s * 0.7, s * 0.35, 0, 0, TAU); ctx.fill(); }
      if (food && scene === 'fourmilions') { const p = proj(food.x, hAt(food.x, food.y), food.y), s = 260 / p[3] * kS; ctx.fillStyle = '#d9b46a'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.ellipse(p[0] + Math.cos(k * 2.4) * s * 0.6 * (k % 3), p[1] + Math.sin(k * 2.4) * s * 0.3 * (k % 3), s * 0.12, s * 0.08, k, 0, TAU); ctx.fill(); } }
      for (const n of ants) {
        const p = proj(n.x, hAt(n.x, n.y) + 0.15, n.y); if (p[3] <= 0) continue;
        const p2 = proj(n.x + Math.cos(n.a), hAt(n.x + Math.cos(n.a), n.y + Math.sin(n.a)) + 0.15, n.y + Math.sin(n.a));
        const s = 1.7 * focal / p[3], ang = Math.atan2(p2[1] - p[1], p2[0] - p[0]);
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang); ctx.globalAlpha = n.st === 'prise' ? Math.max(0, 1 - n.t / 2.5) : 1;
        ctx.strokeStyle = '#1e120c'; ctx.lineWidth = Math.max(0.6, s * 0.06);
        for (let l = -1; l <= 1; l++) for (const sg of [-1, 1]) { const sw = Math.sin(n.ph + l * 2 + (sg > 0 ? 0 : 1.5)) * s * 0.12; ctx.beginPath(); ctx.moveTo(l * s * 0.12, 0); ctx.lineTo(l * s * 0.12 + sw, sg * s * 0.28); ctx.stroke(); }
        ctx.fillStyle = '#2a170e';
        ctx.beginPath(); ctx.ellipse(-s * 0.28, 0, s * 0.2, s * 0.13, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.1, s * 0.07, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4a1e10'; ctx.beginPath(); ctx.ellipse(s * 0.2, 0, s * 0.11, s * 0.1, 0, 0, TAU); ctx.fill();
        if (n.seed) { ctx.fillStyle = '#e0bd70'; ctx.beginPath(); ctx.ellipse(s * 0.36, 0, s * 0.12, s * 0.08, 0, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      drawLabel(false);
    }

    /* ───────── identification ───────── */
    let label = null;
    function describe(l) {
      if (l.kind === 'fourmi') { const n = l.o; return ['Messor barbarus', 'fourmi moissonneuse · ' + ({ aller: 'part chercher des graines', retour: 'rapporte une graine au nid', glisse: 'glisse dans un entonnoir !', prise: 'saisie par le fourmilion' }[n.st] || ''), '#c08a6a']; }
      if (l.kind === 'fourmilion') { const a = l.o; return ['Myrmeleon formicarius', 'fourmilion (larve) · ' + (a.depth < a.R * 0.5 ? 'creuse en jetant le sable' : 'attend au fond de son entonnoir') + ' · ' + a.fed + ' proie' + (a.fed > 1 ? 's' : ''), '#e0a060']; }
      const x = Math.round(l.x), y = Math.round(l.y), k = I(clamp(x, 0, NX - 1), clamp(y, 0, NY - 1));
      const g = grad(x, y), ang = Math.round(Math.atan(Math.hypot(g[0], g[1])) / D2R);
      if (S[k] < 0.15) return ['Socle rocheux', 'reg · pente ' + ang + '°', '#c49070'];
      const s = SANDS[M[k]], wet = Wt[k] > 0.12, sub = Rk[k] + S[k] < sea;
      return [s.nom, s.fr + ' · ' + (sub ? 'sous l’eau, sans cohésion' : wet ? 'mouillé, tient debout' : 'sec') + ' · pente ' + ang + '°' + (!wet && ang >= s.ang - 3 ? ' · au bord de l’avalanche' : '') + ' · ' + (S[k] * 4).toFixed(0) + ' cm de sable', s.css];
    }
    function drawLabel(paper) {
      if (!label) return;
      const al = Math.min(1, label.t * 4, (6 - label.t) * 2);
      if (al <= 0.01) { label = null; return; }
      if (label.o && ((label.kind === 'fourmi' && !ants.includes(label.o)) || (label.kind === 'fourmilion' && !antl.includes(label.o)))) { label = null; return; }
      const wx = label.o ? label.o.x : label.x, wy = label.o ? label.o.y : label.y;
      const p = proj(wx, hAt(wx, wy), wy); const x = p[0], y = p[1];
      let [name, role, col] = describe(label);
      if (paper) col = '#6a4a2a';
      const side = x > W * 0.62 ? -1 : 1, lx = x + side * 46, ly = y - 40;
      ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + side * 9, y - 8); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
      ctx.shadowColor = paper ? 'rgba(250,246,238,.9)' : 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
      ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = paper ? 'rgba(30,24,40,.94)' : 'rgba(255,252,245,.97)';
      ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(name, lx, ly);
      ctx.fillStyle = col; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    setup();
    camera();
    // les dunes ont besoin de temps : on laisse le vent travailler avant le premier regard
    if (scene === 'dunes') for (let i = 0; i < 220; i++) { werner(Math.round(Nn * 0.4 * Math.max(0.3, cfg.wind))); relax(1); }
    for (let i = 0; i < 40; i++) step(1 / 30);

    let pending = false, tool = null, last = null;
    function apply(px, py) {
      const g = pickGround(px, py); if (!g) return;
      const t = env.tool;
      if (t === 'verser') addSand(g.x, g.y, 2.2, 0.9, cfg.put);
      else if (t === 'eau') { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = Math.round(g.x + dx), y = Math.round(g.y + dy); if (x >= 0 && y >= 0 && x < NX && y < NY && dx * dx + dy * dy <= 16) Wt[I(x, y)] = 1; } }
      else if (t === 'gomme') addSand(g.x, g.y, 3, -0.8, 0);
      else if (t === 'pierre') { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = Math.round(g.x + dx), y = Math.round(g.y + dy); if (x >= 0 && y >= 0 && x < NX && y < NY && dx * dx + dy * dy <= 9) Rk[I(x, y)] += 0.6 * (1 - Math.hypot(dx, dy) / 3.5); } }
      else if (t === 'secouer') shake = { x: g.x, y: g.y, r: 12, t: 0.6 };
      else if (t === 'souffle' && last) {
        const dx = g.x - last.x, dy = g.y - last.y, L = Math.hypot(dx, dy) || 1;
        for (let n = 0; n < 40; n++) { const x = Math.round(g.x + rnd(6, -6)), y = Math.round(g.y + rnd(6, -6)); if (x < 0 || y < 0 || x >= NX || y >= NY) continue; const k = I(x, y); if (S[k] > 0.2) { S[k] -= 0.2; fly.push({ x, y, z: hAt(x, y) + 0.2, vx: dx / L * rnd(16, 8), vy: dy / L * rnd(16, 8), vz: rnd(7, 3), m: M[k], q: 0.2 }); } }
      }
      return g;
    }
    function pickThing(px, py) {
      let best = null, bd = 22 * kS;
      for (const n of ants) { const p = proj(n.x, hAt(n.x, n.y), n.y), d = Math.hypot(p[0] - px, p[1] - py); if (d < bd) { bd = d; best = { kind: 'fourmi', o: n }; } }
      for (const a of antl) { const p = proj(a.x, hAt(a.x, a.y), a.y), d = Math.hypot(p[0] - px, p[1] - py); if (d < bd) { bd = d; best = { kind: 'fourmilion', o: a }; } }
      return best;
    }
    function setQuality(q) { if (q === cfg.q) return; cfg.q = q; K.lose(); init(); setup(); }

    return {
      livePaused: true,
      cfg,
      frame(t, dt) {
        if (dt > 0) { step(Math.min(dt, 0.05)); if (label) label.t += dt; }
        if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
      },
      down(p) {
        if (env.tool === 'observer') {
          const th = env.decor === false ? null : pickThing(p.x, p.y);
          if (th) label = Object.assign(th, { t: 0 });
          else { const g = pickGround(p.x, p.y); if (g) label = { kind: 'sol', x: g.x, y: g.y, t: 0 }; }
          return;
        }
        tool = true; last = apply(p.x, p.y);
        if (env.tool === 'secouer' && snd()) au.noise(0.4, 0.05, 250, 1, 'lowpass');
      },
      move(p) { if (!p.down || !tool) return; const g = apply(p.x, p.y); if (g) last = g; },
      up() { tool = null; last = null; },
      clear() { S.fill(0); Wt.fill(0); ants = []; antl = []; fly = []; stream = null; label = null; },
      dispose() { if (boom) boom.stop(); if (hiss) { try { hiss.g.gain.setTargetAtTime(0.0001, au.ctx.currentTime, 0.1); hiss.s.stop(au.ctx.currentTime + 0.5); } catch (e) { /* rien */ } } K.lose(); },
      ui() {
        const L = [];
        if (scene === 'dunes') {
          L.push({ type: 'section', label: 'Le désert' });
          L.push({ type: 'note', text: 'Le vent souffle de gauche à droite (vue de départ). Peu de sable sur un sol rocheux : des barkhanes en croissant, cornes sous le vent. Beaucoup de sable : des cordons de dunes perpendiculaires au vent.' });
          L.push({ type: 'slider', label: 'Vent', min: 0, max: 1, step: 0.01, value: cfg.wind, fmt: (x) => (x < 0.03 ? 'calme' : Math.round(15 + x * 45) + ' km/h'), set: (x) => { cfg.wind = x; } });
          L.push({ type: 'slider', label: 'Sable disponible (nouveau désert)', min: 0.05, max: 1, step: 0.01, value: cfg.supply, fmt: (x) => (x < 0.3 ? 'rare · barkhanes' : x > 0.7 ? 'abondant · cordons' : Math.round(x * 100) + ' %'), set: (x) => { cfg.supply = x; clearTimeout(cfg._t); cfg._t = setTimeout(() => { setup(); for (let i = 0; i < 120; i++) step(1 / 30); }, 400); } });
        }
        if (scene === 'fourmilions') {
          const fed = antl.reduce((s, a) => s + a.fed, 0);
          L.push({ type: 'section', label: 'Les fourmilions' });
          L.push({ type: 'note', text: `${antl.length} fourmilion${antl.length > 1 ? 's' : ''} · ${ants.length} fourmis · ${fed} proie${fed > 1 ? 's' : ''} capturée${fed > 1 ? 's' : ''}. La plupart des fourmis voient l’entonnoir et le contournent ; quelques-unes font un faux pas.` });
          L.push({ type: 'buttons', items: [{ label: 'Nouveau fourmilion', act: () => { if (antl.length < 6) newAntlion(rnd(NX * 0.8, NX * 0.25), rnd(NY * 0.8, NY * 0.2), false); } }] });
        }
        if (scene === 'tas') {
          L.push({ type: 'section', label: 'Le tas' });
          L.push({ type: 'bar', label: 'Avalanches', color: '#e6b46a', value: clamp(aval / 40, 0, 1), txt: aval < 0.5 ? 'calme' : aval < 10 ? 'petites' : 'grosses' });
          L.push({ type: 'note', text: 'Le cône garde la pente de l’angle de repos du sable versé : comparez le basalte (38°) et le sable rose (31°).' });
          L.push({ type: 'toggle', label: 'Filet de sable', value: !!stream, set: (x) => { stream = x ? { x: NX * 0.5, y: NY * 0.5, rate: 1.4, m: cfg.put, t: 0 } : null; } });
          L.push({ type: 'toggle', label: 'Changer de sable toutes les 9 s', value: !!cfg.cycle, set: (x) => { cfg.cycle = x; } });
        }
        if (scene === 'chateau') {
          L.push({ type: 'section', label: 'La plage' });
          L.push({ type: 'note', text: 'Mouillé, le sable tient presque à la verticale. Le soleil sèche les tours, qui s’affaissent à l’angle de repos ; la marée ronge la base, car sous l’eau, plus aucun pont capillaire ne tient les grains.' });
          L.push({ type: 'buttons', items: [{ label: 'Rebâtir', act: () => { buildCastle(); } }] });
        }
        L.push({ type: 'section', label: 'Verser' });
        L.push({ type: 'choice', label: 'Sable versé par l’outil VERSER', value: cfg.put, set: (x) => { cfg.put = x; if (stream) stream.m = x; }, options: SANDS.map((s, i) => ({ id: i, label: ['Quartz', 'Basalte', 'Rose', 'Olivine', 'Gravier'][i] })) });
        L.push({ type: 'note', text: SANDS[cfg.put].nom + ' : angle de repos ≈ ' + SANDS[cfg.put].ang + '°.' });
        L.push({ type: 'section', label: 'Vue' });
        L.push({ type: 'toggle', label: 'Tourner lentement autour', value: cfg.orbit, set: (x) => { cfg.orbit = x; } });
        L.push({ type: 'slider', label: 'Angle de vue', min: 0, max: 1, step: 0.005, value: cfg.az, fmt: (x) => Math.round(x * 360) + '°', set: (x) => { cfg.az = x; cfg.orbit = false; } });
        L.push({ type: 'slider', label: 'Hauteur de vue', min: 0, max: 1, step: 0.01, value: cfg.el, fmt: (x) => Math.round((0.25 + x * 0.75) / D2R) + '°', set: (x) => { cfg.el = x; } });
        L.push({ type: 'slider', label: scene === 'chateau' ? 'Soleil (séchage)' : 'Hauteur du soleil', min: 0, max: 1, step: 0.01, value: cfg.sun, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.sun = x; } });
        L.push({ type: 'choice', label: 'Finesse du relief', value: cfg.q, set: setQuality, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        L.push({ type: 'note', text: `Relief de ${NX}×${NY} cases.` });
        return L;
      },
      debug: { get S() { return S; }, get aval() { return aval; }, step, render, get ants() { return ants; }, get antl() { return antl; } },
    };
  };
})();
