/* Fascination — L'Écoulement · tourbillons, instabilités et un fluide qui se souvient (WebGL2)
   Navier-Stokes incompressible sur GPU (stable fluids + viscosité implicite + confinement de vorticité),
   obstacles, entrée et sortie de veine, gravité agissant sur la densité des encres. Transport des encres
   par MacCormack (filaments nets). Expérience de Taylor (écoulement de Couette rampant) calculée exactement.
   Repli automatique sur l'ancien Écoulement en 2D si WebGL2 manque. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, buf, blit, layer, hsv } = window.FK;
  const { GLKit, HEAD } = window.FKGL;

  /* ───────── les encres ───────── */
  // A : absorbance (rouge, vert, bleu) d'une unité d'encre · E : fluorescence sous lumière UV · rho : densité relative
  const ENC = {
    fluo: { nom: 'Fluorescéine', fr: 'fluorescéine sodique', A: [0.9, 0.05, 1.6], E: [0.25, 1.0, 0.32], rho: 0.0, col: '#7dff6a', tr: [0.9, 1, 0.3] },
    rhod: { nom: 'Rhodamine B', fr: 'rhodamine', A: [0.05, 1.5, 0.5], E: [1.0, 0.22, 0.55], rho: 0.0, col: '#ff4fa0', tr: [1, 0.3, 0.6] },
    sepia: { nom: 'Sepia officinalis', fr: 'encre de seiche', A: [1.1, 1.3, 1.6], E: [0, 0, 0], rho: 0.3, col: '#8a6a4a', tr: [0.35, 0.25, 0.18] },
    bleu: { nom: 'Bleu de méthylène', fr: 'bleu de méthylène', A: [1.7, 0.55, 0.12], E: [0, 0, 0], rho: 0.1, col: '#3a7bff', tr: [0.15, 0.45, 0.95] },
    kmno4: { nom: 'Permanganate de potassium', fr: 'KMnO₄', A: [0.35, 1.7, 0.25], E: [0, 0, 0], rho: 0.9, col: '#b04dff', tr: [0.65, 0.15, 0.75] },
  };
  const RAKE = ['fluo', 'rhod', 'bleu', 'fluo', 'rhod', 'kmno4', 'fluo', 'rhod', 'bleu'];

  /* ───────── shaders ───────── */
  const BC = `
uniform sampler2D uO; uniform float uPer, uOut, uIn;
bool solidAt(vec2 uv){ return texture(uO, uv).r > .5; }
`;
  const FS = {
    force: HEAD + BC + `
uniform sampler2D uVel, uA, uCurl; uniform vec2 uVt, uRes, uCell; uniform float uDt, uG, uVort, uTime, uPert;
uniform int uNS; uniform vec4 uSP[24]; uniform vec4 uSV[24];
out vec4 o;
void main(){
  if (solidAt(vUv)){ o = vec4(0.); return; }
  vec2 v = texture(uVel, vUv).xy;
  v.y -= uG * texture(uA, vUv).a * uDt; // les encres lourdes coulent
  float L = texture(uCurl, vUv - vec2(uVt.x, 0.)).x, R = texture(uCurl, vUv + vec2(uVt.x, 0.)).x;
  float B = texture(uCurl, vUv - vec2(0., uVt.y)).x, T = texture(uCurl, vUv + vec2(0., uVt.y)).x, C = texture(uCurl, vUv).x;
  vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + 1e-4; f *= uVort * C; f.y = -f.y;
  v += f * uDt;
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  for (int i = 0; i < 24; i++){
    if (i >= uNS) break;
    vec2 d = p - uSP[i].xy; float w = exp(-dot(d, d) / (uSP[i].z * uSP[i].z));
    v = mix(v, vec2(uSV[i].x, -uSV[i].y) * uCell, w * uSV[i].z);
  }
  if (uIn > 0. && vUv.x < 2.5 * uVt.x) v = vec2(uIn, uPert * sin(uTime * 1.7) * uIn);
  o = vec4(v, 0., 1.);
}`,
    curl: HEAD + `
uniform sampler2D uVel; uniform vec2 uVt; out vec4 o;
void main(){
  float L = texture(uVel, vUv - vec2(uVt.x, 0.)).y, R = texture(uVel, vUv + vec2(uVt.x, 0.)).y;
  float B = texture(uVel, vUv - vec2(0., uVt.y)).x, T = texture(uVel, vUv + vec2(0., uVt.y)).x;
  o = vec4(.5 * (R - L - T + B), 0., 0., 1.);
}`,
    // viscosité implicite (une itération de Jacobi) ; parois et obstacles adhérents
    visc: HEAD + BC + `
uniform sampler2D uX, uB; uniform vec2 uVt; uniform float uAl; out vec4 o;
vec2 nb(vec2 uv){ if (solidAt(uv)) return vec2(0.); if (uPer < .5 && (uv.x < 0. || uv.x > 1.)) return texture(uX, vUv).xy; if (uv.y < 0. || uv.y > 1.) return vec2(0.); return texture(uX, uv).xy; }
void main(){
  if (solidAt(vUv)){ o = vec4(0.); return; }
  vec2 s = nb(vUv - vec2(uVt.x, 0.)) + nb(vUv + vec2(uVt.x, 0.)) + nb(vUv - vec2(0., uVt.y)) + nb(vUv + vec2(0., uVt.y));
  o = vec4((texture(uB, vUv).xy + uAl * s) / (1. + 4. * uAl), 0., 1.);
}`,
    div: HEAD + BC + `
uniform sampler2D uVel; uniform vec2 uVt; out vec4 o;
void main(){
  vec2 C = texture(uVel, vUv).xy;
  vec2 l = vUv - vec2(uVt.x, 0.), r = vUv + vec2(uVt.x, 0.), b = vUv - vec2(0., uVt.y), t = vUv + vec2(0., uVt.y);
  float L = texture(uVel, l).x, R = texture(uVel, r).x, B = texture(uVel, b).y, T = texture(uVel, t).y;
  if (solidAt(l) || (uPer < .5 && l.x < 0.)) L = uIn > 0. && l.x < 0. ? uIn : -C.x;
  if (solidAt(r) || (uPer < .5 && r.x > 1.)) R = uOut > .5 && r.x > 1. ? C.x : -C.x;
  if (solidAt(b) || b.y < 0.) B = -C.y;
  if (solidAt(t) || t.y > 1.) T = -C.y;
  o = vec4(.5 * (R - L + T - B), 0., 0., 1.);
}`,
    jacobi: HEAD + BC + `
uniform sampler2D uP, uDiv; uniform vec2 uVt; out vec4 o;
float pr(vec2 uv, float c){
  if (solidAt(uv)) return c;
  if (uPer < .5){ if (uv.x > 1.) return uOut > .5 ? 0. : c; if (uv.x < 0.) return c; }
  if (uv.y < 0. || uv.y > 1.) return c;
  return texture(uP, uv).x;
}
void main(){
  float c = texture(uP, vUv).x;
  o = vec4((pr(vUv - vec2(uVt.x, 0.), c) + pr(vUv + vec2(uVt.x, 0.), c) + pr(vUv - vec2(0., uVt.y), c) + pr(vUv + vec2(0., uVt.y), c) - texture(uDiv, vUv).x) * .25, 0., 0., 1.);
}`,
    grad: HEAD + BC + `
uniform sampler2D uP, uVel; uniform vec2 uVt; out vec4 o;
float pr(vec2 uv, float c){
  if (solidAt(uv)) return c;
  if (uPer < .5){ if (uv.x > 1.) return uOut > .5 ? 0. : c; if (uv.x < 0.) return c; }
  if (uv.y < 0. || uv.y > 1.) return c;
  return texture(uP, uv).x;
}
void main(){
  if (solidAt(vUv)){ o = vec4(0.); return; }
  float c = texture(uP, vUv).x;
  vec2 v = texture(uVel, vUv).xy - .5 * vec2(pr(vUv + vec2(uVt.x, 0.), c) - pr(vUv - vec2(uVt.x, 0.), c), pr(vUv + vec2(0., uVt.y), c) - pr(vUv - vec2(0., uVt.y), c));
  o = vec4(v, 0., 1.);
}`,
    // transport semi-lagrangien (uSign = 1 en avant, -1 en arrière pour MacCormack)
    adv: HEAD + BC + `
uniform sampler2D uVel, uSrc; uniform vec2 uVt; uniform float uDt, uSign; uniform vec4 uKeep; out vec4 o;
void main(){
  if (solidAt(vUv)){ o = vec4(0.); return; }
  vec2 q = vUv - uSign * uDt * texture(uVel, vUv).xy * uVt;
  if (uIn > 0. && q.x < 0.){ o = vec4(0.); return; } // l'eau qui entre est propre
  o = texture(uSrc, q) * uKeep;
}`,
    mac: HEAD + BC + `
uniform sampler2D uVel, uOrig, uFwd, uBack; uniform vec2 uVt, uSt; uniform float uDt; uniform vec4 uKeep; out vec4 o;
void main(){
  if (solidAt(vUv)){ o = vec4(0.); return; }
  vec2 pb = vUv - uDt * texture(uVel, vUv).xy * uVt;
  vec4 r = texture(uFwd, vUv) + .5 * (texture(uOrig, vUv) - texture(uBack, vUv));
  vec2 i0 = (floor(pb / uSt - .5) + .5) * uSt;
  vec4 a = texture(uOrig, i0), b = texture(uOrig, i0 + vec2(uSt.x, 0.)), c = texture(uOrig, i0 + vec2(0., uSt.y)), d = texture(uOrig, i0 + uSt);
  o = max(clamp(r, min(min(a, b), min(c, d)), max(max(a, b), max(c, d))), vec4(0.)) * uKeep;
}`,
    // dépôt d'encre (absorbance + densité, fluorescence) ; sources multiples
    inject: HEAD + `
uniform sampler2D uA, uE; uniform vec2 uRes; uniform float uDt;
uniform int uNI; uniform vec4 uIP[32]; uniform vec4 uIA[32]; uniform vec4 uIE[32];
layout(location = 0) out vec4 oA; layout(location = 1) out vec4 oE;
void main(){
  vec4 a = texture(uA, vUv), e = texture(uE, vUv);
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  for (int i = 0; i < 32; i++){
    if (i >= uNI) break;
    vec2 d = p - uIP[i].xy; float w = exp(-dot(d, d) / (uIP[i].z * uIP[i].z)) * uIP[i].w;
    a += uIA[i] * w; e.rgb += uIE[i].rgb * w;
  }
  oA = min(a, vec4(6.)); oE = min(e, vec4(6.));
}`,
    // états initiaux des expériences (1 : Kelvin-Helmholtz, 2 : Rayleigh-Taylor)
    initV: HEAD + `
uniform float uKind, uU, uSeed; out vec4 o;
void main(){
  vec2 v = vec2(0.);
  if (uKind < 1.5){ float y = vUv.y - .5; v.x = uU * tanh(y / .025); v.y = uU * .03 * sin(vUv.x * 6.2832 * 3.) * exp(-y * y / .004); }
  o = vec4(v, 0., 1.);
}`,
    initD: HEAD + `
uniform float uKind, uStrat, uSeed; uniform vec4 uTopA, uTopE, uBotA, uBotE;
layout(location = 0) out vec4 oA; layout(location = 1) out vec4 oE;
void main(){
  float y = vUv.y - .5;
  if (uKind < 1.5){
    // un ruban de chaque encre de part et d'autre de la frontière : on voit les rouleaux s'enrouler
    float top = smoothstep(-.012, .012, y), band = exp(-y * y / .006);
    oA = mix(uBotA, uTopA, top) * .7 * band; oA.a = uStrat * (1. - top);
    oE = mix(uBotE, uTopE, top) * .7 * band;
  } else {
    float pert = .012 * (sin(vUv.x * 37.7 + uSeed) + .6 * sin(vUv.x * 91.1 + uSeed * 2.) + .4 * sin(vUv.x * 151. + uSeed * 3.));
    float top = smoothstep(-.004, .004, y + pert);
    oA = mix(uBotA, uTopA, top) * .5; oA.a = top * uStrat;
    oE = mix(uBotE, uTopE, top) * .5;
  }
}`,
    comp: HEAD + `
uniform sampler2D uA, uE, uVel, uO, uCurl, uBg; uniform vec2 uRes, uVt;
uniform float uMode, uUV, uDecor, uInk, uTime; uniform vec3 uPaper;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec4 A = texture(uA, vUv); vec3 E = texture(uE, vUv).rgb;
  vec3 bg = uDecor > .5 ? pow(texture(uBg, vUv).rgb, vec3(2.2)) : uInk > .5 ? uPaper : vec3(0.);
  vec3 col;
  float dark = uInk < .5 && (uDecor < .5 || uUV > .5) ? 1. : 0.;
  if (uMode < .5){
    vec3 tr = exp(-A.rgb * 1.3);
    if (uInk > .5) col = bg * tr + E * .04;
    else if (dark > .5){
      // fond sombre : les encres fluorescentes brillent, les autres se devinent par la lumière qu'elles diffusent
      float od = dot(A.rgb, vec3(.33));
      col = bg * tr + E * 1.25 + exp(-A.rgb * .7) * (1. - exp(-od * 1.6)) * .16;
    } else col = bg * tr + E * .3;
  } else if (uMode < 1.5){
    // fluide rhéoscopique : des paillettes de mica s'alignent sur l'écoulement et renvoient la lumière
    vec2 v = texture(uVel, vUv).xy; float sp = length(v), ang = atan(v.y, v.x);
    float sh = abs(texture(uCurl, vUv).x);
    float fl = pow(.5 + .5 * cos(2. * (ang - .7)), 2.5);
    float al = smoothstep(.5, 12., sp + sh * 2.);
    float br = mix(.35 + .1 * hash12(floor(p * .5)), fl, al);
    vec3 pearl = mix(vec3(.42, .5, .72), vec3(1., .93, .82), br) * (.18 + .9 * br);
    vec3 tint = exp(-A.rgb * .5) + E * .4;
    if (uInk > .5) col = mix(uPaper, uPaper * .55 * vec3(.85, .9, 1.05), br) * mix(vec3(1.), tint, .5);
    else col = pearl * mix(vec3(1.), tint, .45);
  } else {
    float c = texture(uCurl, vUv).x, m = smoothstep(.15, 1., 1. - exp(-abs(c) * .22));
    vec3 cc = c > 0. ? vec3(1., .32, .14) : vec3(.12, .55, 1.);
    if (uInk > .5) col = mix(uPaper, cc * .75, m * .9);
    else col = cc * m * 1.2 + vec3(.02, .02, .035);
  }
  // obstacles
  float s = texture(uO, vUv).r;
  if (s > .02){
    float e = smoothstep(.25, .75, s);
    vec3 sc;
    if (uInk > .5) sc = vec3(.32, .3, .33);
    else if (uDecor > .5){
      float gx = texture(uO, vUv + vec2(.004, 0.)).r - texture(uO, vUv - vec2(.004, 0.)).r, gy = texture(uO, vUv + vec2(0., .004)).r - texture(uO, vUv - vec2(0., .004)).r;
      sc = vec3(.18, .19, .22) + vec3(.55, .6, .7) * clamp(-gx * .8 + gy * .8, 0., 1.) * (1. - e * .3);
    } else sc = vec3(.1, .11, .15);
    col = mix(col, sc, e);
  }
  if (uInk < .5) col = aces(col * 1.05);
  col = pow(col, vec3(1. / 2.2)) + (hash12(p + fract(uTime) * 91.) - .5) / 255.;
  o = vec4(col, 1.);
}`,
    // expérience de Taylor : écoulement de Couette rampant entre deux cylindres, calculé exactement
    couette: HEAD + `
uniform sampler2D uMat; uniform vec2 uRes, uC; uniform float uR1, uR2, uPhi, uBlur, uDecor, uInk, uTime; uniform vec3 uPaper;
out vec4 o;
vec4 mat(vec2 q){ return texture(uMat, vec2(q.x / uRes.x, 1. - q.y / uRes.y)); }
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y), d = p - uC;
  float r = length(d), th = atan(d.y, d.x);
  vec3 col = uDecor > .5 ? mix(vec3(.05, .035, .025), vec3(.11, .07, .045), vnoise(p * vec2(.004, .05)) * .8 + .2) : uInk > .5 ? uPaper : vec3(0.);
  vec3 gly = uDecor > .5 ? vec3(.95, .74, .38) * (.75 + .25 * (1. - r / uR2)) : uInk > .5 ? uPaper : vec3(.0);
  if (r > uR1 && r < uR2){
    float k = uR1 * uR1 * (uR2 * uR2 / (r * r) - 1.) / (uR2 * uR2 - uR1 * uR1);
    float t0 = th - k * uPhi;
    vec2 q = uC + r * vec2(cos(t0), sin(t0));
    vec2 tg = vec2(-sin(t0), cos(t0)), rd = vec2(cos(t0), sin(t0));
    vec4 m = mat(q) * .4 + (mat(q + tg * uBlur) + mat(q - tg * uBlur) + mat(q + rd * uBlur) + mat(q - rd * uBlur)) * .15;
    if (uInk > .5 || uDecor > .5) col = mix(gly, gly * m.rgb * 1.1, clamp(m.a, 0., 1.));
    else col = m.rgb * m.a * 1.3 + vec3(.02, .015, .01);
  }
  // cylindres : verre extérieur, laiton intérieur avec son repère qui tourne
  float ro = abs(r - uR2);
  if (r < uR1){
    if (uDecor > .5){
      vec3 brass = vec3(.75, .58, .3) * (.55 + .45 * (1. - r / uR1)) + vec3(.4) * pow(max(0., dot(normalize(d + 1e-3), normalize(vec2(-1., -1.)))), 6.) * (r / uR1);
      float mk = abs(atan(sin(th - uPhi), cos(th - uPhi)));
      col = brass * (mk < .06 && r > uR1 * .35 ? .3 : 1.);
    } else {
      float mk = abs(atan(sin(th - uPhi), cos(th - uPhi)));
      col = uInk > .5 ? uPaper * .82 : vec3(.07);
      if (mk < .05 && r > uR1 * .35) col = uInk > .5 ? vec3(.3) : vec3(.5);
    }
  }
  if (ro < 3.) col = mix(col, uDecor > .5 ? vec3(.85, .9, 1.) : uInk > .5 ? vec3(.35) : vec3(.35), (1. - ro / 3.) * .7);
  col = pow(col, vec3(1. / 2.2)) + (hash12(p + fract(uTime) * 91.) - .5) / 255.;
  o = vec4(col, 1.);
}`,
  };

  /* ───────── l'ancien Écoulement, en 2D, conservé comme repli ───────── */
  function legacy(env) {
  // (version d'origine, inchangée)
      const ctx = env.ctx;
      const N = 96, W = N + 2, SZ = W * W;
      const IX = (i, j) => i + W * j;
      const mk = () => new Float32Array(SZ);
      let u = mk(), v = mk(), u0 = mk(), v0 = mk(), p = mk(), div = mk();
      let dye = [mk(), mk(), mk()], dye0 = [mk(), mk(), mk()];
      const b = buf(N, N);
      function bnd(bt, x) {
        for (let i = 1; i <= N; i++) {
          x[IX(0, i)] = bt === 1 ? -x[IX(1, i)] : x[IX(1, i)];
          x[IX(N + 1, i)] = bt === 1 ? -x[IX(N, i)] : x[IX(N, i)];
          x[IX(i, 0)] = bt === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
          x[IX(i, N + 1)] = bt === 2 ? -x[IX(i, N)] : x[IX(i, N)];
        }
      }
      function advect(bt, d, d0, uu, vv, dt) {
        const dt0 = dt * N;
        for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
          let x = i - dt0 * uu[IX(i, j)], y = j - dt0 * vv[IX(i, j)];
          if (x < 0.5) x = 0.5; if (x > N + 0.5) x = N + 0.5;
          if (y < 0.5) y = 0.5; if (y > N + 0.5) y = N + 0.5;
          const i0 = x | 0, j0 = y | 0, i1 = i0 + 1, j1 = j0 + 1;
          const s1 = x - i0, s0 = 1 - s1, t1 = y - j0, t0 = 1 - t1;
          d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) + s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
        }
        bnd(bt, d);
      }
      function project() {
        for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
          div[IX(i, j)] = -0.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]) / N;
          p[IX(i, j)] = 0;
        }
        bnd(0, div); bnd(0, p);
        for (let k = 0; k < 16; k++) {
          for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++)
            p[IX(i, j)] = (div[IX(i, j)] + p[IX(i - 1, j)] + p[IX(i + 1, j)] + p[IX(i, j - 1)] + p[IX(i, j + 1)]) / 4;
          bnd(0, p);
        }
        for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
          u[IX(i, j)] -= 0.5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
          v[IX(i, j)] -= 0.5 * N * (p[IX(i, j + 1)] - p[IX(i, j - 1)]);
        }
        bnd(1, u); bnd(2, v);
      }
      let hue = rnd(1);
      const inject = (px, py, fx, fy, amt) => {
        const i = clamp((px / env.w * N) | 0, 1, N), j = clamp((py / env.h * N) | 0, 1, N);
        const c = hsv(hue, 0.85, 1);
        for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
          const ii = clamp(i + ox, 1, N), jj = clamp(j + oy, 1, N), k = IX(ii, jj);
          u[k] += fx; v[k] += fy;
          if (amt) { dye[0][k] += c[0] / 255 * amt; dye[1][k] += c[1] / 255 * amt; dye[2][k] += c[2] / 255 * amt; }
        }
      };
      for (let i = 0; i < 6; i++) inject(rnd(env.w), rnd(env.h), rnd(4, -4), rnd(4, -4), 7);
      return {
        frame(t, dt) {
          hue = (hue + dt * 0.06) % 1;
          const st = clamp(dt, 0.008, 0.033);
          u0.set(u); v0.set(v);
          advect(1, u, u0, u0, v0, st); advect(2, v, v0, u0, v0, st);
          project();
          for (let c = 0; c < 3; c++) {
            dye0[c].set(dye[c]);
            advect(0, dye[c], dye0[c], u, v, st);
            const d = dye[c];
            for (let i = 0; i < SZ; i++) d[i] *= 0.9982;
          }
          const d = b.d;
          for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const k = IX(i + 1, j + 1), o = (j * N + i) * 4;
            d[o] = clamp(dye[0][k] * 255, 0, 255);
            d[o + 1] = clamp(dye[1][k] * 255, 0, 255);
            d[o + 2] = clamp(dye[2][k] * 255, 0, 255);
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, env.w, env.h);
          ctx.globalCompositeOperation = 'lighter';
          blit(ctx, b, env.w, env.h);
          ctx.globalCompositeOperation = 'source-over';
        },
        down(p) { inject(p.x, p.y, rnd(2, -2), rnd(2, -2), env.tool === 'encre' ? 8 : 0); },
        move(p) {
          if (!p.down) return;
          inject(p.x, p.y, p.dx * 2.4, p.dy * 2.4, env.tool === 'encre' ? 3 : 0);
        },
      };
  }

  const QUAL = {
    legere: { vel: 9000, sc: 1.6, jac: 14, comp: 0.75, mac: false },
    normale: { vel: 18000, sc: 2, jac: 22, comp: 1.1, mac: true },
    haute: { vel: 32000, sc: 2.2, jac: 30, comp: 1.6, mac: true },
  };

  window.FASC.push({
    id: 'fluide', name: 'L’Écoulement', cat: 'Éléments', glyph: '🝆', decor: true,
    blurb: 'Tourbillons, instabilités et un fluide qui se souvient',
    hint: 'OBSERVER : touchez une encre ou un obstacle · ENCRE : glissez pour verser · REMUER : glissez pour brasser · GOUTTE : touchez pour lâcher une goutte lourde · OBSTACLE : posez un cylindre, une plaque ou une aile, glissez pour la déplacer · GOMME : effacez.',
    intro: 'Un bassin d’eau où l’on verse des encres. Derrière un cylindre, les tourbillons se détachent l’un après l’autre ; deux courants qui glissent l’un sur l’autre s’enroulent en vagues ; une encre lourde posée sur une légère tombe en champignons. Et dans la glycérine, un mélange qu’on croyait définitif se défait quand on tourne la manivelle à l’envers.',
    legend: [
      { color: '#7dff6a', name: 'Fluorescéine', role: 'encre fluorescente · vert', desc: 'Absorbe le bleu et réémet un vert éclatant. On en verse dans les rivières pour suivre l’eau, et elle teint chaque année la rivière de Chicago pour la Saint-Patrick.' },
      { color: '#ff4fa0', name: 'Rhodamine B', role: 'encre fluorescente · rose', desc: 'Réémet un orange rosé sous la lumière verte ou ultraviolette. Les mécaniciens des fluides l’utilisent pour mesurer les mélanges au laser.' },
      { color: '#8a6a4a', name: 'Sepia officinalis', role: 'seiche · encre de mélanine', desc: 'La seiche expulse un nuage de mélanine pour aveugler ses prédateurs. Un peu plus dense que l’eau, il dessine de lourdes volutes brunes.' },
      { color: '#3a7bff', name: 'Bleu de méthylène', role: 'colorant · bleu', desc: 'Absorbe le rouge et l’orange. Colorant des biologistes, il teinte aussi l’eau des aquariums contre les champignons.' },
      { color: '#b04dff', name: 'Permanganate de potassium', role: 'KMnO₄ · cristaux qui coulent', desc: 'Ses cristaux violets tombent au fond en laissant une traînée. Sa solution, plus dense que l’eau, plonge en filaments.' },
      { color: '#d8d0ff', name: 'Paillettes de mica', role: 'fluide rhéoscopique', desc: 'Des milliers de paillettes s’alignent dans le sens de l’écoulement et renvoient la lumière : les courants deviennent des moires nacrées.' },
      { color: '#f2bd61', name: 'Glycérine', role: 'fluide visqueux · expérience de Taylor', desc: 'Plus de mille fois plus visqueuse que l’eau. À cette lenteur, l’inertie disparaît : l’écoulement suit exactement la manivelle, dans un sens comme dans l’autre.' },
    ],
    about: [
      'En 1883, Osborne Reynolds injecte un filet d’encre dans de l’eau qui coule dans un tube de verre. Lentement, le filet reste droit ; plus vite, il se brise d’un coup en tourbillons. Ce qui compte, c’est le rapport entre l’inertie et la viscosité : le nombre de Reynolds, Re = vitesse × taille ÷ viscosité.',
      'Derrière un cylindre, au-delà de Re ≈ 47, les tourbillons se détachent alternativement d’un côté puis de l’autre : c’est l’allée de von Kármán (1911). Ils partent à une fréquence presque fixe, f ≈ 0,2 × vitesse ÷ diamètre (le nombre de Strouhal) : c’est ce qui fait chanter les fils électriques dans le vent, les harpes éoliennes, et osciller les cheminées d’usine. Avec le SON, vous entendez ce chant.',
      'Quand deux couches glissent l’une sur l’autre, la frontière se met à onduler puis s’enroule : c’est l’instabilité de Kelvin-Helmholtz, visible dans certains nuages en forme de vagues et dans les bandes de Jupiter. Une couche légère posée sous une couche lourde l’empêche : sous un nombre de Richardson de 1/4, le mélange l’emporte (Miles et Howard, 1961). Quand c’est le lourd qui est au-dessus, il tombe en champignons : c’est l’instabilité de Rayleigh-Taylor, celle des nuages atomiques et des filaments de la nébuleuse du Crabe.',
      'Dans les années 1960, G. I. Taylor filme une expérience troublante. Il dépose des gouttes d’encre dans de la glycérine entre deux cylindres, tourne la manivelle quatre fois : l’encre s’étale en un voile. Il tourne quatre fois en sens inverse, et les gouttes réapparaissent. À très faible Reynolds, l’écoulement est réversible. C’est pour cela, expliquera Edward Purcell en 1977, qu’une bactérie ne peut pas nager comme une coquille Saint-Jacques : un mouvement d’aller-retour ne la ferait pas avancer.',
      'Le fluide rhéoscopique a été inventé dans les années 1960 par Paul Matisse, petit-fils du peintre, sous le nom de Kalliroscope. Ici, la simulation résout les équations de Navier-Stokes sur la carte graphique, et transporte les encres avec un schéma de MacCormack, qui garde les filaments fins. Les gouttes forment en deux dimensions des paires de tourbillons ; dans l’eau réelle, ce sont des anneaux, comme des ronds de fumée.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une encre pour la reconnaître et lire la vitesse et le sens du tourbillon. Touchez un obstacle pour son nombre de Reynolds et la fréquence de ses tourbillons.' },
      { id: 'encre', label: 'encre', desc: 'Glissez pour verser l’encre choisie dans le panneau, en entraînant l’eau avec le doigt.' },
      { id: 'remuer', label: 'remuer', desc: 'Glissez pour brasser l’eau sans encre. Dans l’expérience de Taylor, glissez autour du cylindre pour tourner la manivelle.' },
      { id: 'goutte', label: 'goutte', desc: 'Touchez pour lâcher une goutte de l’encre choisie. Lourde, elle tombe en s’enroulant en deux tourbillons.' },
      { id: 'obstacle', label: 'obstacle', desc: 'Touchez pour poser la forme choisie dans le panneau (cylindre, plaque, aile, mur à main levée). Touchez un obstacle et glissez pour le déplacer.' },
      { id: 'gomme', label: 'gomme', desc: 'Glissez sur un obstacle ou un mur pour l’effacer.' },
    ],
    make(env) {
      try { return makeGL(env); } catch (e) {
        console.warn('L’Écoulement : repli en 2D', e);
        return legacy(env);
      }
    },
  });

  function makeGL(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const kS = clamp(Math.min(W, H) / 800, 0.6, 1.5);
    const mobile = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent) || Math.min(W, H) < 520;
    const cfg = { scene: 'karman', speed: 0.5, visc: 0.15, vort: 0.12, shape: 'cyl', aoa: 12, rake: true, mode: 0, uv: env.theme !== 'light', ink: 'fluo', strat: 0.15, atw: 0.5, auto: true, blur: 0.15, q: mobile ? 'legere' : 'normale' };
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };

    /* ressources GPU */
    let R = null;
    function initGL(qk) {
      const Q = QUAL[qk];
      const cs = Math.min(dpr, Q.comp);
      const cw = Math.max(2, Math.round(W * cs)), ch = Math.max(2, Math.round(H * cs));
      const K = GLKit(cw, ch);
      const gl = K.gl;
      const GVW = Math.max(40, Math.round(Math.sqrt((Q.vel * W) / H))), GVH = Math.max(30, Math.round((GVW * H) / W));
      const GSW = Math.round(GVW * Q.sc), GSH = Math.round(GVH * Q.sc);
      const r = {
        K, gl, Q, cw, ch, GVW, GVH, GSW, GSH,
        vel: K.double(GVW, GVH), v0: K.target(GVW, GVH), prs: K.double(GVW, GVH), curl: K.target(GVW, GVH), div: K.target(GVW, GVH),
        A: K.double(GSW, GSH), E: K.double(GSW, GSH), t1: K.target(GSW, GSH), t2: K.target(GSW, GSH),
        O: gl.createTexture(), bg: gl.createTexture(), mat: gl.createTexture(),
        oL: layer(Math.round(cw / 2), Math.round(ch / 2)), mL: layer(cw, ch),
        pg: {},
      };
      for (const k in FS) r.pg[k] = K.program(FS[k]);
      for (const t of [r.O, r.bg, r.mat]) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      return r;
    }
    R = initGL(cfg.q);
    function upload(tex, c) {
      const gl = R.gl;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }
    // bord périodique (Kelvin-Helmholtz) ou fermé
    function setWrap(per) {
      const gl = R.gl, m = per ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      for (const d of [R.vel, R.prs, R.A, R.E]) for (const t of [d.r, d.w]) { gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, m); }
      for (const t of [R.v0, R.curl, R.div, R.t1, R.t2]) { gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, m); }
    }

    /* ───────── obstacles ───────── */
    let obst = [], walls = [];
    function airfoil(g, o) {
      // profil NACA 0012
      const c = o.size * 2.4, t = 0.12, pts = [];
      for (let i = 0; i <= 40; i++) {
        const x = (1 - Math.cos((i / 40) * Math.PI)) / 2;
        const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
        pts.push([x, yt]);
      }
      g.save(); g.translate(o.x, o.y); g.rotate((o.ang * Math.PI) / 180); g.translate(-c * 0.3, 0);
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, -y * c) : g.moveTo(x * c, -y * c)));
      for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] * c, pts[i][1] * c);
      g.closePath(); g.fill(); g.restore();
    }
    function paintO() {
      const L = R.oL, g = L.g;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#000'; g.fillRect(0, 0, L.w, L.h);
      g.setTransform(L.w / W, 0, 0, L.h / H, 0, 0);
      g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round';
      for (const o of obst) {
        if (o.kind === 'cyl') { g.beginPath(); g.arc(o.x, o.y, o.size / 2, 0, TAU); g.fill(); }
        else if (o.kind === 'plaque') { g.save(); g.translate(o.x, o.y); g.rotate((o.ang * Math.PI) / 180 + Math.PI / 2); g.fillRect(-o.size * 0.6, -o.size * 0.06, o.size * 1.2, o.size * 0.12); g.restore(); }
        else airfoil(g, o);
      }
      for (const w of walls) { g.lineWidth = w.wd; g.beginPath(); g.moveTo(w.ax, w.ay); g.lineTo(w.bx, w.by); g.stroke(); }
      upload(R.O, L.c);
    }
    function paintBg() {
      const L = layer(R.cw, R.ch), g = L.g;
      g.scale(R.cw / W, R.ch / H);
      const uv = cfg.uv;
      const gr = g.createLinearGradient(0, 0, 0, H);
      if (uv) { gr.addColorStop(0, '#0b0816'); gr.addColorStop(1, '#130c22'); }
      else { gr.addColorStop(0, '#dfe6ea'); gr.addColorStop(1, '#c9d3d9'); }
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const s = 40 * kS;
      g.strokeStyle = uv ? 'rgba(150,120,255,.07)' : 'rgba(40,60,80,.12)'; g.lineWidth = 1;
      for (let x = 0; x < W; x += s) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.strokeStyle = uv ? 'rgba(150,120,255,.14)' : 'rgba(40,60,80,.22)';
      for (let x = 0; x < W; x += s * 5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += s * 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      if (uv) { const v = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); v.addColorStop(0, 'rgba(90,40,200,.10)'); v.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = v; g.fillRect(0, 0, W, H); }
      upload(R.bg, L.c);
    }

    /* ───────── expérience de Taylor ───────── */
    const tay = { phi: 0, target: 0, phase: 'gouttes', t: 0, turns: 4, drops: 0 };
    const geomT = () => { const v = view(); const R2 = Math.min(v.w * 0.44, H * 0.44); return { cx: v.cx, cy: H / 2, r1: R2 * 0.42, r2: R2 }; };
    const kOf = (r, G) => (G.r1 * G.r1 * (G.r2 * G.r2 / (r * r) - 1)) / (G.r2 * G.r2 - G.r1 * G.r1);
    function clearMat() { const g = R.mL.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, R.mL.w, R.mL.h); upload(R.mat, R.mL.c); tay.drops = 0; }
    function taylorDrop(x, y, key, rad) {
      const G = geomT(), g = R.mL.g, e = ENC[key];
      g.setTransform(R.cw / W, 0, 0, R.ch / H, 0, 0);
      g.fillStyle = `rgb(${e.tr.map((c) => Math.round(c * 255)).join(',')})`;
      g.beginPath();
      // le disque vu maintenant correspond, dans l'état de départ, à une forme cisaillée : on la reconstruit point par point
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * TAU, px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
        const dx = px - G.cx, dy = py - G.cy, r = Math.max(G.r1 + 1, Math.min(G.r2 - 1, Math.hypot(dx, dy)));
        const th = Math.atan2(dy, dx) - kOf(r, G) * tay.phi;
        const qx = G.cx + Math.cos(th) * r, qy = G.cy + Math.sin(th) * r;
        i ? g.lineTo(qx, qy) : g.moveTo(qx, qy);
      }
      g.fill();
      upload(R.mat, R.mL.c);
      tay.drops++;
    }
    function taylorSeed() {
      clearMat();
      const G = geomT(), keys = ['fluo', 'rhod', 'bleu', 'kmno4', 'sepia'];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + 0.4, r = G.r1 + (G.r2 - G.r1) * (0.3 + 0.4 * ((i * 0.37) % 1));
        taylorDrop(G.cx + Math.cos(a) * r, G.cy + Math.sin(a) * r, keys[i], (G.r2 - G.r1) * 0.13);
      }
    }

    /* ───────── scènes ───────── */
    let crystals = [], dropsT = 0, sceneT = 0, seed = rnd(100);
    function setScene(id) {
      cfg.scene = id; sceneT = 0; crystals = []; label = null;
      for (const t of [R.vel.r, R.vel.w, R.prs.r, R.prs.w, R.A.r, R.A.w, R.E.r, R.E.w]) R.K.clear(t);
      obst = []; walls = [];
      setWrap(id === 'kh');
      const v = view();
      if (id === 'karman') { obst.push({ kind: cfg.shape === 'mur' ? 'cyl' : cfg.shape, x: v.x0 + v.w * 0.3, y: H / 2 + 1, size: H * 0.1, ang: cfg.shape === 'aile' ? cfg.aoa : 0 }); }
      else if (id === 'kh' || id === 'rt') initExp(id);
      else if (id === 'taylor') { tay.phi = 0; tay.target = 0; tay.phase = 'gouttes'; tay.t = 0; taylorSeed(); }
      paintO(); paintBg();
    }
    function initExp(id) {
      const { K, pg } = R;
      seed = rnd(100);
      const top = ENC[id === 'kh' ? 'rhod' : 'kmno4'], bot = ENC[id === 'kh' ? 'fluo' : 'fluo'];
      pg.initV.use().f('uKind', id === 'kh' ? 1 : 2).f('uU', (12 + cfg.speed * 40) * (R.GVH / 100)).f('uSeed', seed);
      K.run(pg.initV, R.vel.r);
      K.clear(R.prs.r);
      pg.initD.use().f('uKind', id === 'kh' ? 1 : 2).f('uStrat', id === 'kh' ? cfg.strat * 2 : 0.2 + cfg.atw * 1.6).f('uSeed', seed)
        .f('uTopA', top.A[0], top.A[1], top.A[2], 0).f('uTopE', top.E[0], top.E[1], top.E[2], 0).f('uBotA', bot.A[0], bot.A[1], bot.A[2], 0).f('uBotE', bot.E[0], bot.E[1], bot.E[2], 0);
      K.run(pg.initD, R.A.r, R.E.r);
      sceneT = 0;
    }
    const gravity = () => (cfg.scene === 'rt' || cfg.scene === 'aqua' ? 1 : cfg.scene === 'kh' ? 1 : 0);

    /* ───────── sources (encre et poussées) ───────── */
    let inj = [], pushes = [];
    function ink(x, y, r, amt, key) { if (inj.length < 32) inj.push({ x, y, r, amt, e: ENC[key] }); }
    function push(x, y, r, vx, vy, k) { if (pushes.length < 24) pushes.push({ x, y, r, vx, vy, k }); }
    function drop(x, y, key) {
      ink(x, y, 13 * kS, 2.2, key);
      push(x, y, 16 * kS, 0, 110 * kS, 0.8);
      if (snd()) au.note(rnd(700, 450), 0.12, 'sine', 0.05, 300);
    }

    /* ───────── sons : chant éolien et eau qui coule ───────── */
    let aeol = null, water = null;
    if (snd()) {
      aeol = au.drone(220, 'sine', 0);
      const c = au.ensure();
      if (c) {
        const s = c.createBufferSource(); s.buffer = au.noiseBuf(); s.loop = true;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
        const gg = c.createGain(); gg.gain.value = 0.0001;
        s.connect(f); f.connect(gg); gg.connect(au.master); s.start();
        water = { s, f, gg };
      }
    }
    const U = () => (15 + cfg.speed * 85) * (R.GVH / 100); // vitesse d'entrée, en cellules par seconde
    const nu = () => cfg.visc * cfg.visc * 6; // viscosité explicite, en cellules² par seconde
    function reynolds(o) { const D = (o.size / W) * R.GVW, nuEff = nu() + 0.06 * U(); return (U() * D) / nuEff; }
    function shedHz(o) { const D = (o.size / W) * R.GVW; return (0.2 * U()) / D; }

    /* ───────── un pas (GPU) ───────── */
    let VT = 0;
    function step(dt) {
      const { K, pg, GVW, GVH, GSW, GSH } = R;
      const vt = [1 / GVW, 1 / GVH];
      const per = cfg.scene === 'kh' ? 1 : 0, out = cfg.scene === 'karman' ? 1 : 0, inflow = cfg.scene === 'karman' ? U() : 0;
      const setBC = (P) => P.t('uO', R.O).f('uPer', per).f('uOut', out).f('uIn', inflow);
      // encre
      if (inj.length) {
        const IP = new Float32Array(128), IA = new Float32Array(128), IE = new Float32Array(128);
        inj.forEach((s, i) => { IP.set([s.x, s.y, s.r, s.amt], i * 4); IA.set([s.e.A[0], s.e.A[1], s.e.A[2], s.e.rho], i * 4); IE.set([s.e.E[0], s.e.E[1], s.e.E[2], 0], i * 4); });
        pg.inject.use().t('uA', R.A.r).t('uE', R.E.r).f('uRes', W, H).f('uDt', dt).i('uNI', inj.length).v4('uIP', IP).v4('uIA', IA).v4('uIE', IE);
        K.run(pg.inject, R.A.w, R.E.w); R.A.swap(); R.E.swap();
      }
      pg.curl.use().t('uVel', R.vel.r).f('uVt', vt[0], vt[1]); K.run(pg.curl, R.curl);
      const SP = new Float32Array(96), SV = new Float32Array(96);
      pushes.forEach((s, i) => { SP.set([s.x, s.y, s.r, 0], i * 4); SV.set([s.vx, s.vy, s.k, 0], i * 4); });
      setBC(pg.force.use()).t('uVel', R.vel.r).t('uA', R.A.r).t('uCurl', R.curl).f('uVt', vt[0], vt[1]).f('uRes', W, H).f('uCell', GVW / W, GVH / H)
        .f('uDt', dt).f('uG', gravity() * 0.9 * GVH).f('uVort', cfg.scene === 'kh' ? 0 : cfg.vort * 12).f('uTime', VT).f('uPert', cfg.scene === 'karman' ? 0.004 : 0)
        .i('uNS', pushes.length).v4('uSP', SP).v4('uSV', SV);
      K.run(pg.force, R.vel.w); R.vel.swap();
      // viscosité implicite
      const al = nu() * dt;
      if (al > 0.002) {
        K.run(pg.adv.use().t('uVel', R.vel.r).t('uSrc', R.vel.r).f('uVt', 0, 0).f('uDt', 0).f('uSign', 1).f('uKeep', 1, 1, 1, 1).t('uO', R.O).f('uPer', per).f('uOut', out).f('uIn', inflow), R.v0);
        for (let i = 0; i < 6; i++) { setBC(pg.visc.use()).t('uX', R.vel.r).t('uB', R.v0).f('uVt', vt[0], vt[1]).f('uAl', al); K.run(pg.visc, R.vel.w); R.vel.swap(); }
      }
      setBC(pg.div.use()).t('uVel', R.vel.r).f('uVt', vt[0], vt[1]); K.run(pg.div, R.div);
      for (let i = 0; i < R.Q.jac; i++) { setBC(pg.jacobi.use()).t('uP', R.prs.r).t('uDiv', R.div).f('uVt', vt[0], vt[1]); K.run(pg.jacobi, R.prs.w); R.prs.swap(); }
      setBC(pg.grad.use()).t('uP', R.prs.r).t('uVel', R.vel.r).f('uVt', vt[0], vt[1]); K.run(pg.grad, R.vel.w); R.vel.swap();
      setBC(pg.adv.use()).t('uVel', R.vel.r).t('uSrc', R.vel.r).f('uVt', vt[0], vt[1]).f('uDt', dt).f('uSign', 1).f('uKeep', 1, 1, 1, 1); K.run(pg.adv, R.vel.w); R.vel.swap();
      // transport des encres
      const kp = Math.exp(-dt * (cfg.scene === 'karman' ? 0.05 : 0.012));
      for (const D of [R.A, R.E]) {
        if (R.Q.mac) {
          setBC(pg.adv.use()).t('uVel', R.vel.r).t('uSrc', D.r).f('uVt', vt[0], vt[1]).f('uDt', dt).f('uSign', 1).f('uKeep', 1, 1, 1, 1); K.run(pg.adv, R.t1);
          setBC(pg.adv.use()).t('uVel', R.vel.r).t('uSrc', R.t1).f('uVt', vt[0], vt[1]).f('uDt', dt).f('uSign', -1).f('uKeep', 1, 1, 1, 1); K.run(pg.adv, R.t2);
          setBC(pg.mac.use()).t('uVel', R.vel.r).t('uOrig', D.r).t('uFwd', R.t1).t('uBack', R.t2).f('uVt', vt[0], vt[1]).f('uSt', 1 / GSW, 1 / GSH).f('uDt', dt).f('uKeep', kp, kp, kp, kp); K.run(pg.mac, D.w); D.swap();
        } else { setBC(pg.adv.use()).t('uVel', R.vel.r).t('uSrc', D.r).f('uVt', vt[0], vt[1]).f('uDt', dt).f('uSign', 1).f('uKeep', kp, kp, kp, kp); K.run(pg.adv, D.w); D.swap(); }
      }
      inj = []; pushes = [];
    }

    /* ───────── vie autonome ───────── */
    function update(dt) {
      VT += dt; sceneT += dt;
      const v = view();
      if (cfg.scene === 'karman' && cfg.rake) {
        // râteau d'injecteurs : des filets d'encre en amont de l'obstacle
        const n = 9;
        for (let i = 0; i < n; i++) ink(12, H * (0.5 + (i - (n - 1) / 2) * 0.075), 2.6 * kS, 9 * dt, RAKE[i]);
      }
      if (cfg.scene === 'aqua' && cfg.auto) {
        dropsT -= dt;
        if (dropsT <= 0) {
          dropsT = rnd(6, 3);
          const keys = Object.keys(ENC);
          if (Math.random() < 0.25) crystals.push({ x: v.x0 + rnd(v.w * 0.8, v.w * 0.2), y: 20, vy: rnd(40, 25) * kS, life: 30 });
          else drop(v.x0 + rnd(v.w * 0.85, v.w * 0.15), H * rnd(0.22, 0.08), keys[rint(keys.length)]);
        }
      }
      // cristaux de permanganate : ils coulent et se dissolvent en laissant une traînée
      for (let i = crystals.length - 1; i >= 0; i--) {
        const c = crystals[i];
        c.y = Math.min(H - 8, c.y + c.vy * dt); c.life -= dt;
        ink(c.x, c.y, 4 * kS, 0.9 * dt * 60 * (c.y >= H - 9 ? 0.4 : 1) / 6, 'kmno4');
        if (c.life <= 0) crystals.splice(i, 1);
      }
      // les instabilités se rejouent quand le mélange est fait
      if (cfg.auto && (cfg.scene === 'kh' || cfg.scene === 'rt') && sceneT > (cfg.scene === 'kh' ? 45 : 32)) initExp(cfg.scene);
      // la manivelle de Taylor
      if (cfg.scene === 'taylor') {
        tay.t += dt;
        const N = tay.turns * TAU, dur = 11;
        if (cfg.auto) {
          if (tay.phase === 'gouttes' && tay.t > 2.5) { tay.phase = 'aller'; tay.t = 0; tay.from = tay.phi; tay.to = N; }
          else if (tay.phase === 'aller' && tay.t > dur) { tay.phase = 'pause'; tay.t = 0; }
          else if (tay.phase === 'pause' && tay.t > 3) { tay.phase = 'retour'; tay.t = 0; tay.from = tay.phi; tay.to = 0; }
          else if (tay.phase === 'retour' && tay.t > dur) { tay.phase = 'fin'; tay.t = 0; }
          else if (tay.phase === 'fin' && tay.t > 5) { tay.phase = 'gouttes'; tay.t = 0; taylorSeed(); }
        }
        if (tay.phase === 'aller' || tay.phase === 'retour') {
          const k = Math.min(1, tay.t / dur), e = k * k * (3 - 2 * k);
          tay.phi = tay.from + (tay.to - tay.from) * e;
        }
      }
      if (aeol) {
        const o = obst[0];
        if (cfg.scene === 'karman' && o && reynolds(o) > 47) { const f = shedHz(o); aeol.set(150 + f * 260); aeol.gain(0.018 + cfg.speed * 0.02); }
        else aeol.gain(0);
      }
      if (water) water.gg.gain.setTargetAtTime(cfg.scene === 'karman' ? 0.01 + cfg.speed * 0.03 : cfg.scene === 'taylor' ? 0 : 0.008, au.ctx.currentTime, 0.5);
    }

    /* ───────── rendu ───────── */
    let pending = false;
    function render() {
      const { K, pg } = R;
      const bare = env.decor === false, inkM = bare && env.theme === 'light';
      if (cfg.scene === 'taylor') {
        const G = geomT();
        pg.couette.use().t('uMat', R.mat).f('uRes', W, H).f('uC', G.cx, G.cy).f('uR1', G.r1).f('uR2', G.r2).f('uPhi', tay.phi)
          .f('uBlur', 0.4 + cfg.blur * 10 * Math.min(1, Math.abs(tay.phi) / TAU + 0.2)).f('uDecor', bare ? 0 : 1).f('uInk', inkM ? 1 : 0).f('uTime', VT).f('uPaper', 0.88, 0.84, 0.73);
        K.run(pg.couette, null);
      } else {
        pg.curl.use().t('uVel', R.vel.r).f('uVt', 1 / R.GVW, 1 / R.GVH); K.run(pg.curl, R.curl);
        pg.comp.use().t('uA', R.A.r).t('uE', R.E.r).t('uVel', R.vel.r).t('uO', R.O).t('uCurl', R.curl).t('uBg', R.bg)
          .f('uRes', W, H).f('uVt', 1 / R.GVW, 1 / R.GVH).f('uMode', cfg.mode).f('uUV', cfg.uv ? 1 : 0).f('uDecor', bare ? 0 : 1).f('uInk', inkM ? 1 : 0).f('uTime', VT).f('uPaper', 0.88, 0.84, 0.73);
        K.run(pg.comp, null);
      }
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      if (!bare) for (const c of crystals) { ctx.fillStyle = '#3a1050'; ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.y * 0.05); ctx.fillRect(-3 * kS, -2 * kS, 6 * kS, 4 * kS); ctx.restore(); }
      drawLabel(inkM);
    }

    /* ───────── identification ───────── */
    let label = null, rT = 0;
    function readAt(x, y) {
      try {
        const u = x / W, v = 1 - y / H;
        const a = R.K.read(R.A.r, u * R.GSW, v * R.GSH), e = R.K.read(R.E.r, u * R.GSW, v * R.GSH);
        const vel = R.K.read(R.vel.r, u * R.GVW, v * R.GVH), cu = R.K.read(R.curl, u * R.GVW, v * R.GVH);
        return { a, e, vel, curl: cu[0], ok: true };
      } catch (err) { return { ok: false }; }
    }
    function whichInk(m) {
      const od = m.a[0] + m.a[1] + m.a[2], em = m.e[0] + m.e[1] + m.e[2];
      if (od < 0.08 && em < 0.05) return null;
      let best = null, bs = -1;
      for (const k in ENC) {
        const e = ENC[k], ea = Math.hypot(...e.A) || 1, ma = Math.hypot(m.a[0], m.a[1], m.a[2]) || 1;
        let s = (e.A[0] * m.a[0] + e.A[1] * m.a[1] + e.A[2] * m.a[2]) / (ea * ma);
        if (em > 0.05) { const ee = Math.hypot(...e.E) || 0; s += ee ? (e.E[0] * m.e[0] + e.E[1] * m.e[1] + e.E[2] * m.e[2]) / (ee * (Math.hypot(m.e[0], m.e[1], m.e[2]) || 1)) : -1; }
        if (s > bs) { bs = s; best = k; }
      }
      return best;
    }
    function obstAt(x, y) {
      for (let i = obst.length - 1; i >= 0; i--) { const o = obst[i]; if (Math.hypot(o.x - x, o.y - y) < o.size * (o.kind === 'aile' ? 1.3 : 0.65) + 6) return o; }
      return null;
    }
    function describe(l) {
      const cmPx = 60 / W; // le bassin fait 60 cm de large
      if (cfg.scene === 'taylor') {
        const tours = tay.phi / TAU;
        return ['Glycérine', 'expérience de Taylor · ' + (Math.abs(tours) < 0.05 ? 'au repos' : tours.toFixed(1).replace('.', ',') + ' tour' + (Math.abs(tours) >= 2 ? 's' : '') + ' de manivelle') + ' · Re ≈ 0,01 : réversible', '#f2bd61'];
      }
      if (l.o) {
        const o = l.o, re = reynolds(o), f = shedHz(o);
        const nom = { cyl: 'Cylindre', plaque: 'Plaque', aile: 'Aile NACA 0012' }[o.kind];
        let role = (Math.round(o.size * cmPx * 10) / 10).toString().replace('.', ',') + ' cm · Re ≈ ' + Math.round(re);
        if (cfg.scene === 'karman') role += re > 47 ? ' · lâcher de tourbillons ≈ ' + f.toFixed(2).replace('.', ',') + ' par seconde' : ' · écoulement attaché, pas d’allée';
        if (o.kind === 'aile') role += ' · incidence ' + Math.round(o.ang) + '°' + (Math.abs(o.ang) > 14 ? ', décrochage' : '');
        return [nom, role, '#c8d0e0'];
      }
      const m = l.m;
      if (!m || !m.ok) return ['Mesure indisponible', 'ce navigateur ne lit pas les textures flottantes', '#c8d0e0'];
      const k = whichInk(m), sp = Math.hypot(m.vel[0], m.vel[1]) * (W / R.GVW) * cmPx;
      const rot = Math.abs(m.curl) < 0.4 ? 'sans rotation' : m.curl > 0 ? 'tourbillon antihoraire' : 'tourbillon horaire';
      const vit = (sp < 0.1 ? 'presque immobile' : (Math.round(sp * 10) / 10).toString().replace('.', ',') + ' cm/s') + ' · ' + rot;
      if (!k) return ['Eau claire', vit, '#9fd8ff'];
      return [ENC[k].nom, ENC[k].fr + ' · ' + vit, ENC[k].col];
    }
    function drawLabel(paper) {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (6 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      const x = label.o ? label.o.x : label.x, y = label.o ? label.o.y : label.y;
      let [name, role, col] = describe(label);
      if (paper) col = '#4a3a6a';
      const side = x > W * 0.62 ? -1 : 1, lx = x + side * 46, ly = y - 40;
      ctx.save();
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + side * 9, y - 9); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
      ctx.shadowColor = paper ? 'rgba(250,246,238,.9)' : 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
      ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = paper ? 'rgba(30,24,40,.94)' : 'rgba(250,250,245,.96)';
      ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(name, lx, ly);
      ctx.fillStyle = col; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    /* ───────── boucle ───────── */
    function frame(t, dt) {
      if (dt > 0) {
        update(dt);
        if (cfg.scene !== 'taylor') {
          let left = Math.min(dt, 0.066);
          while (left > 1e-4) { const h = Math.min(left, 0.033); step(h); left -= h; }
        }
        if (label) { label.t += dt; if (!label.o && (rT += dt) > 0.35) { rT = 0; label.m = readAt(label.x, label.y); } }
      }
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }
    function setQuality(q) {
      if (q === cfg.q) return;
      try { const old = R; R = initGL(q); cfg.q = q; old.K.lose(); setScene(cfg.scene); } catch (e) { console.warn(e); }
    }

    if (window.FASC_DEBUG) window.FASC_DEBUG.flux = { get R() { return R; }, cfg, setScene, run(n, h) { for (let i = 0; i < n; i++) frame(0, h); render(); } };

    setScene('karman');
    for (let i = 0; i < 40; i++) frame(0, 1 / 30);

    let drag = null, lastP = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool;
        lastP = { x: p.x, y: p.y };
        if (tool === 'observer') {
          const o = cfg.scene === 'taylor' ? null : obstAt(p.x, p.y);
          label = o ? { o, t: 0 } : { x: p.x, y: p.y, t: 0, m: cfg.scene === 'taylor' ? null : readAt(p.x, p.y) };
          rT = 0;
        } else if (tool === 'goutte') {
          if (cfg.scene === 'taylor') taylorDrop(p.x, p.y, cfg.ink, 12 * kS); else drop(p.x, p.y, cfg.ink);
        } else if (tool === 'encre') {
          if (cfg.scene === 'taylor') taylorDrop(p.x, p.y, cfg.ink, 9 * kS); else ink(p.x, p.y, 9 * kS, 1.2, cfg.ink);
        } else if (tool === 'obstacle' && cfg.scene !== 'taylor') {
          const o = obstAt(p.x, p.y);
          if (o) { drag = { o, dx: o.x - p.x, dy: o.y - p.y }; return; }
          if (cfg.shape === 'mur') { drag = { wall: true, x: p.x, y: p.y }; return; }
          if (obst.length < 8) { const n = { kind: cfg.shape, x: p.x, y: p.y, size: H * 0.1, ang: cfg.shape === 'aile' ? cfg.aoa : 0 }; obst.push(n); drag = { o: n, dx: 0, dy: 0 }; paintO(); }
        } else if (tool === 'gomme' && cfg.scene !== 'taylor') {
          const o = obstAt(p.x, p.y);
          if (o) { obst.splice(obst.indexOf(o), 1); paintO(); }
          drag = { erase: true };
        } else if (tool === 'remuer' && cfg.scene === 'taylor') {
          const G = geomT(); drag = { crank: true, a: Math.atan2(p.y - G.cy, p.x - G.cx) }; cfg.auto = false; tay.phase = 'main';
        }
      },
      move(p) {
        if (!p.down) return;
        const tool = env.tool;
        const vx = p.dx * 60, vy = p.dy * 60;
        if (drag && drag.o) { drag.o.x = clamp(p.x + drag.dx, 10, W - 10); drag.o.y = clamp(p.y + drag.dy, 10, H - 10); paintO(); return; }
        if (drag && drag.wall) { if (Math.hypot(p.x - drag.x, p.y - drag.y) > 6) { walls.push({ ax: drag.x, ay: drag.y, bx: p.x, by: p.y, wd: 7 * kS }); drag.x = p.x; drag.y = p.y; paintO(); } return; }
        if (drag && drag.erase) { const n = walls.length; walls = walls.filter((w) => Math.hypot((w.ax + w.bx) / 2 - p.x, (w.ay + w.by) / 2 - p.y) > 16 * kS); const o = obstAt(p.x, p.y); if (o) obst.splice(obst.indexOf(o), 1); if (o || n !== walls.length) paintO(); return; }
        if (drag && drag.crank) { const G = geomT(), a = Math.atan2(p.y - G.cy, p.x - G.cx); let d = a - drag.a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; tay.phi += d; drag.a = a; return; }
        if (cfg.scene === 'taylor') { if (tool === 'encre') taylorDrop(p.x, p.y, cfg.ink, 6 * kS); return; }
        if (tool === 'encre') { ink(p.x, p.y, 8 * kS, 0.5, cfg.ink); push(p.x, p.y, 18 * kS, vx, vy, 0.5); }
        else if (tool === 'remuer') push(p.x, p.y, 24 * kS, vx, vy, 0.6);
      },
      up() { drag = null; },
      clear() {
        if (cfg.scene === 'taylor') { clearMat(); tay.phi = 0; cfg.auto = false; tay.phase = 'main'; return; }
        for (const t of [R.vel.r, R.vel.w, R.prs.r, R.prs.w, R.A.r, R.A.w, R.E.r, R.E.w]) R.K.clear(t);
        obst = []; walls = []; crystals = []; cfg.auto = false; cfg.rake = false; paintO();
      },
      dispose() {
        if (aeol) aeol.stop();
        if (water) { try { water.gg.gain.setTargetAtTime(0.0001, au.ctx.currentTime, 0.1); water.s.stop(au.ctx.currentTime + 0.5); } catch (e) { /* rien */ } }
        R.K.lose();
      },
      ui() {
        const L = [{ type: 'section', label: 'Expériences' }];
        L.push({ type: 'buttons', items: [
          { label: 'Allée de Kármán', act: () => setScene('karman') },
          { label: 'Kelvin-Helmholtz', act: () => setScene('kh') },
          { label: 'Rayleigh-Taylor', act: () => setScene('rt') },
          { label: 'Aquarium', act: () => { setScene('aqua'); cfg.auto = true; } },
          { label: 'Mémoire de Taylor', act: () => { cfg.auto = true; setScene('taylor'); } },
        ] });
        const o = obst[0];
        if (cfg.scene === 'karman') {
          const re = o ? reynolds(o) : 0;
          L.push({ type: 'bar', label: 'Nombre de Reynolds', color: '#9fd8ff', value: clamp(Math.log10(Math.max(1, re)) / 3, 0, 1), txt: o ? '≈ ' + Math.round(re) : '—' });
          L.push({ type: 'note', text: !o ? 'Posez un obstacle avec l’outil OBSTACLE.' : re < 47 ? 'Sous Re ≈ 47, le sillage reste attaché : deux tourbillons immobiles derrière l’obstacle.' : 'Les tourbillons se détachent ' + shedHz(o).toFixed(2).replace('.', ',') + ' fois par seconde de chaque côté (Strouhal ≈ 0,2). Valeurs estimées : la grille ajoute sa propre viscosité.' });
          L.push({ type: 'slider', label: 'Vitesse du courant', min: 0, max: 1, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(((15 + x * 85) * (R.GVH / 100) * 60) / R.GVW) + ' cm/s', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'slider', label: 'Viscosité', min: 0, max: 1, step: 0.01, value: cfg.visc, fmt: (x) => (x < 0.05 ? 'eau' : x > 0.8 ? 'miel liquide' : '× ' + Math.round(1 + x * x * 60)), set: (x) => { cfg.visc = x; } });
          L.push({ type: 'choice', label: 'Forme posée par l’outil OBSTACLE', value: cfg.shape, set: (x) => { cfg.shape = x; }, options: [{ id: 'cyl', label: 'Cylindre' }, { id: 'plaque', label: 'Plaque' }, { id: 'aile', label: 'Aile' }, { id: 'mur', label: 'Mur' }] });
          if (obst.some((x) => x.kind === 'aile')) L.push({ type: 'slider', label: 'Incidence de l’aile', min: -25, max: 25, step: 1, value: cfg.aoa, fmt: (x) => x + '°' + (Math.abs(x) > 14 ? ' · décrochage' : ''), set: (x) => { cfg.aoa = x; for (const q of obst) if (q.kind === 'aile') q.ang = x; paintO(); } });
          L.push({ type: 'toggle', label: 'Râteau d’encre en amont', value: cfg.rake, set: (x) => { cfg.rake = x; } });
        }
        if (cfg.scene === 'kh') {
          L.push({ type: 'slider', label: 'Stratification (couche légère en haut)', min: 0, max: 1, step: 0.01, value: cfg.strat, fmt: (x) => { const ri = x * 0.9; return 'Ri ≈ ' + ri.toFixed(2).replace('.', ',') + (ri < 0.25 ? ' · instable' : ' · stable'); }, set: (x) => { cfg.strat = x; } });
          L.push({ type: 'slider', label: 'Cisaillement', min: 0, max: 1, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Relancer', act: () => initExp('kh') }] });
        }
        if (cfg.scene === 'rt') {
          L.push({ type: 'slider', label: 'Contraste de densité (Atwood)', min: 0, max: 1, step: 0.01, value: cfg.atw, fmt: (x) => 'A ≈ ' + (0.05 + x * 0.45).toFixed(2).replace('.', ','), set: (x) => { cfg.atw = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Relancer', act: () => initExp('rt') }] });
        }
        if (cfg.scene === 'kh' || cfg.scene === 'rt' || cfg.scene === 'aqua') L.push({ type: 'toggle', label: cfg.scene === 'aqua' ? 'Gouttes et cristaux spontanés' : 'Rejouer l’expérience quand tout est mélangé', value: cfg.auto, set: (x) => { cfg.auto = x; } });
        if (cfg.scene === 'aqua') L.push({ type: 'buttons', items: [{ label: 'Cristal de permanganate', act: () => { const v = view(); crystals.push({ x: v.x0 + rnd(v.w * 0.8, v.w * 0.2), y: 20, vy: rnd(40, 25) * kS, life: 30 }); } }] });
        if (cfg.scene === 'taylor') {
          L.push({ type: 'bar', label: 'Manivelle', color: '#f2bd61', value: clamp(Math.abs(tay.phi) / (tay.turns * TAU), 0, 1), txt: (tay.phi / TAU).toFixed(1).replace('.', ',') + ' tours' });
          L.push({ type: 'note', text: { gouttes: 'Des gouttes d’encre attendent dans la glycérine.', aller: 'On tourne : l’encre s’étire en un voile.', pause: 'Tout semble mélangé…', retour: '…on tourne exactement en sens inverse.', fin: 'Les gouttes sont revenues.', main: 'Tournez la manivelle avec l’outil REMUER, autour du cylindre.' }[tay.phase] || '' });
          L.push({ type: 'buttons', items: [
            { label: 'Tourner 4 tours', act: () => { cfg.auto = false; tay.phase = 'aller'; tay.t = 0; tay.from = tay.phi; tay.to = tay.phi + tay.turns * TAU; } },
            { label: 'Revenir', act: () => { cfg.auto = false; tay.phase = 'retour'; tay.t = 0; tay.from = tay.phi; tay.to = 0; } },
            { label: 'Nouvelles gouttes', act: () => { tay.phi = 0; taylorSeed(); tay.phase = 'gouttes'; tay.t = 0; } },
          ] });
          L.push({ type: 'slider', label: 'Diffusion moléculaire', min: 0, max: 1, step: 0.01, value: cfg.blur, fmt: (x) => (x < 0.05 ? 'aucune (idéal)' : Math.round(x * 100) + ' %'), set: (x) => { cfg.blur = x; } });
          L.push({ type: 'toggle', label: 'Démonstration automatique', value: cfg.auto, set: (x) => { cfg.auto = x; if (x) { tay.phase = 'gouttes'; tay.t = 0; } } });
        }
        L.push({ type: 'section', label: 'Encre' });
        L.push({ type: 'choice', label: 'Encre des outils ENCRE et GOUTTE', value: cfg.ink, set: (x) => { cfg.ink = x; }, options: Object.keys(ENC).map((k) => ({ id: k, label: { fluo: 'Fluorescéine', rhod: 'Rhodamine', sepia: 'Seiche', bleu: 'Méthylène', kmno4: 'Permanganate' }[k] })) });
        if (cfg.scene !== 'taylor') {
          L.push({ type: 'section', label: 'Affichage' });
          L.push({ type: 'choice', label: 'Rendu', value: cfg.mode, set: (x) => { cfg.mode = x; }, options: [{ id: 0, label: 'Encres' }, { id: 1, label: 'Rhéoscopique' }, { id: 2, label: 'Vorticité' }] });
          L.push({ type: 'choice', label: 'Éclairage', value: cfg.uv ? 'uv' : 'blanc', set: (x) => { cfg.uv = x === 'uv'; paintBg(); }, options: [{ id: 'uv', label: 'Lumière noire (UV)' }, { id: 'blanc', label: 'Rétroéclairage blanc' }] });
          L.push({ type: 'slider', label: 'Confinement des tourbillons', min: 0, max: 1, step: 0.01, value: cfg.vort, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.vort = x; } });
          L.push({ type: 'choice', label: 'Qualité du calcul', value: cfg.q, set: setQuality, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
          L.push({ type: 'note', text: `Grille ${R.GVW}×${R.GVH} pour l’eau, ${R.GSW}×${R.GSH} pour les encres · transport ${R.Q.mac ? 'MacCormack' : 'semi-lagrangien'}.` });
        }
        return L;
      },
    };
  }
})();
