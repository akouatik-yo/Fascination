/* Fascination — Le Feu · combustion, convection et lumière (WebGL2)
   Un fluide simulé sur la carte graphique (stable fluids, Stam 1999) : la poussée d'Archimède
   soulève l'air chaud, la vorticité replie les tourbillons, une chimie simplifiée brûle le
   combustible. La couleur vient de la loi de Planck (suie incandescente), de la
   chimiluminescence (bleu de CH* et C₂*) et des raies d'émission des sels métalliques.
   Repli automatique sur l'ancien feu en 2D si WebGL2 ou les cibles flottantes manquent. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, buf, blit, lut, layer } = window.FK;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const n1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); const hsh = (k) => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; return hsh(i) * (1 - u) + hsh(i + 1) * u; };

  /* ───────── les acteurs ───────── */
  const ESS = {
    chene: { nom: 'Quercus robur', fr: 'chêne pédonculé', code: 1, life: 260, flame: 1.0, spark: 0.35, pop: 0.025, crackle: 0.6, dry: 0.02, wetRes: 0, col: '#ff9a4d' },
    pin: { nom: 'Pinus sylvestris', fr: 'pin sylvestre', code: 2, life: 120, flame: 1.4, spark: 1.0, pop: 0.3, crackle: 1.5, dry: 0.03, wetRes: 0, col: '#ffc24d' },
    bouleau: { nom: 'Betula pendula', fr: 'bouleau verruqueux', code: 3, life: 160, flame: 1.25, spark: 0.45, pop: 0.06, crackle: 0.9, dry: 0.05, wetRes: 0.55, col: '#fff0b8' },
    bougie: { nom: 'Paraffine · C₂₅H₅₂', fr: 'bougie', code: 10, col: '#ffe08a' },
    bunsen: { nom: 'Méthane · CH₄', fr: 'bec Bunsen', code: 20, col: '#7fb2ff' },
  };
  const SELS = {
    na: { sym: 'Na', nom: 'sodium', raie: 'raie jaune 589 nm', col: [1.0, 0.6, 0.06], css: '#ffb020' },
    sr: { sym: 'Sr', nom: 'strontium', raie: 'rouge 606–682 nm', col: [1.0, 0.05, 0.08], css: '#ff2a3a' },
    li: { sym: 'Li', nom: 'lithium', raie: 'carmin 671 nm', col: [1.0, 0.04, 0.3], css: '#ff2a6e' },
    ca: { sym: 'Ca', nom: 'calcium', raie: 'rouge brique 622 nm', col: [1.0, 0.3, 0.04], css: '#ff6a1a' },
    cu: { sym: 'Cu', nom: 'cuivre', raie: 'vert-bleu 510–530 nm', col: [0.08, 1.0, 0.6], css: '#30ffaa' },
    ba: { sym: 'Ba', nom: 'baryum', raie: 'vert pâle 524 nm', col: [0.55, 1.0, 0.22], css: '#a0ff60' },
    b: { sym: 'B', nom: 'bore', raie: 'vert vif 518–548 nm', col: [0.2, 1.0, 0.15], css: '#58ff40' },
    k: { sym: 'K', nom: 'potassium', raie: 'lilas 404 + 766 nm', col: [0.62, 0.3, 1.0], css: '#b070ff' },
  };
  const TK = (T) => 300 + T * 1250; // température de la simulation → kelvins

  /* ───────── corps noir : loi de Planck × fonctions colorimétriques CIE 1931 ───────── */
  function blackbody(n) {
    const g = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
    const cie = (l) => [
      1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
      0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
      1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8)];
    const xyz = (T) => {
      let X = 0, Y = 0, Z = 0;
      for (let l = 380; l <= 780; l += 5) {
        const m = l * 1e-9, B = 1 / (Math.pow(m, 5) * (Math.exp(0.0143878 / (m * T)) - 1));
        const c = cie(l); X += B * c[0]; Y += B * c[1]; Z += B * c[2];
      }
      return [X, Y, Z];
    };
    const ref = xyz(1550)[1];
    const out = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const T = 600 + (i / (n - 1)) * 1600;
      const [X, Y, Z] = xyz(T);
      let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z, gg = -0.9689 * X + 1.8758 * Y + 0.0415 * Z, b = 0.0557 * X - 0.204 * Y + 1.057 * Z;
      r = Math.max(0, r); gg = Math.max(0, gg); b = Math.max(0, b);
      const mx = Math.max(r, gg, b) || 1;
      // la luminance réelle varie d'un facteur 10⁵ entre 800 K et 1 550 K : on la comprime pour l'œil
      const I = Math.pow(Y / ref, 0.4);
      out[i * 4] = (r / mx) * I; out[i * 4 + 1] = (gg / mx) * I; out[i * 4 + 2] = (b / mx) * I; out[i * 4 + 3] = 1;
    }
    return out;
  }

  const { GLKit, VS, HEAD } = window.FKGL;

  const EMIT_DECL = `
uniform int uN; uniform vec4 uEA[16]; uniform vec4 uEB[16]; uniform vec4 uEG[16];
`;
  // uEA : extrémités (px) · uEB : rayon, code, flamme, lumière · uEG : charbon, braise, humidité, graine

  const FS = {
    advect: HEAD + `
uniform sampler2D uVel, uSrc; uniform vec2 uVt; uniform float uDt; uniform vec4 uKeep;
out vec4 o;
void main(){ vec2 v = texture(uVel, vUv).xy; o = texture(uSrc, vUv - uDt * v * uVt) * uKeep; }`,

    advect2: HEAD + `
uniform sampler2D uVel, uS, uC; uniform vec2 uVt; uniform float uDt; uniform vec4 uKeepS, uKeepC; uniform float uTop;
layout(location = 0) out vec4 oS; layout(location = 1) out vec4 oC;
void main(){
  vec2 v = texture(uVel, vUv).xy; vec2 p = vUv - uDt * v * uVt;
  float top = mix(1., uTop, smoothstep(.84, 1., vUv.y));
  oS = texture(uS, p) * uKeepS * top; oC = texture(uC, p) * uKeepC * top;
}`,

    curl: HEAD + `
uniform sampler2D uVel; uniform vec2 uVt; out vec4 o;
void main(){
  float L = texture(uVel, vUv - vec2(uVt.x, 0.)).y, R = texture(uVel, vUv + vec2(uVt.x, 0.)).y;
  float B = texture(uVel, vUv - vec2(0., uVt.y)).x, T = texture(uVel, vUv + vec2(0., uVt.y)).x;
  o = vec4(.5 * (R - L - T + B), 0., 0., 1.);
}`,

    force: HEAD + `
uniform sampler2D uVel, uCurl, uS; uniform vec2 uVt, uRes, uCell; uniform float uDt, uBuoy, uWeight, uVort, uTurb, uTime, uDrag;
uniform vec2 uWind; uniform vec4 uPtr; uniform float uPtrR;
uniform int uN; uniform vec4 uEA[16]; uniform vec4 uEB[16]; uniform vec4 uEJ[16];
out vec4 o;
void main(){
  vec2 v = texture(uVel, vUv).xy;
  vec4 s = texture(uS, vUv);
  // poussée d'Archimède (approximation de Boussinesq) : l'air chaud et la vapeur montent, la suie pèse
  v.y += uDt * (uBuoy * (s.r + .35 * s.a) - uWeight * s.b);
  // confinement de la vorticité (Fedkiw 2001) : rend aux tourbillons l'énergie perdue par la grille
  float L = texture(uCurl, vUv - vec2(uVt.x, 0.)).x, R = texture(uCurl, vUv + vec2(uVt.x, 0.)).x;
  float B = texture(uCurl, vUv - vec2(0., uVt.y)).x, T = texture(uCurl, vUv + vec2(0., uVt.y)).x, C = texture(uCurl, vUv).x;
  vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 1e-4; f *= uVort * C; f.y = -f.y;
  v += f * uDt;
  // turbulence : un bruit à rotationnel, plus fort là où il fait chaud
  vec2 q = vec2(vUv.x * uRes.x / uRes.y, vUv.y) * 8. + vec2(0., -uTime * 1.6);
  float e = .04, n0 = fbm(q), nx = fbm(q + vec2(e, 0.)), ny = fbm(q + vec2(0., e));
  v += vec2(ny - n0, n0 - nx) / e * uTurb * smoothstep(.04, .6, s.r) * uDt;
  v += uWind * uDt * smoothstep(0., .3, s.r + s.b + s.a);
  // souffle du doigt
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  if (uPtrR > 0.){ vec2 d = p - uPtr.xy; v += exp(-dot(d, d) / (uPtrR * uPtrR)) * vec2(uPtr.z, -uPtr.w) * uCell * uDt * 6.; }
  // jets de gaz des becs et courant ascendant des mèches
  for (int i = 0; i < 16; i++){
    if (i >= uN) break;
    float jet = uEJ[i].w; if (jet <= 0.) continue;
    vec2 m = uEA[i].xy; float r = uEB[i].x * 1.2; vec2 d = p - m;
    float w = exp(-dot(d, d) / (r * r)) * step(-r * .3, -d.y);
    v = mix(v, vec2(v.x * .5, jet), w * .5);
  }
  o = vec4(v * uDrag, 0., 1.);
}`,

    div: HEAD + `
uniform sampler2D uVel; uniform vec2 uVt; out vec4 o;
void main(){
  vec2 C = texture(uVel, vUv).xy;
  float L = texture(uVel, vUv - vec2(uVt.x, 0.)).x, R = texture(uVel, vUv + vec2(uVt.x, 0.)).x;
  float B = texture(uVel, vUv - vec2(0., uVt.y)).y, T = texture(uVel, vUv + vec2(0., uVt.y)).y;
  if (vUv.y - uVt.y < 0.) B = -C.y;
  o = vec4(.5 * (R - L + T - B), 0., 0., 1.);
}`,

    jacobi: HEAD + `
uniform sampler2D uP, uDiv; uniform vec2 uVt; out vec4 o;
void main(){
  float L = texture(uP, vUv - vec2(uVt.x, 0.)).x, R = texture(uP, vUv + vec2(uVt.x, 0.)).x;
  float B = texture(uP, vUv - vec2(0., uVt.y)).x, T = texture(uP, vUv + vec2(0., uVt.y)).x;
  if (vUv.y + uVt.y > 1.) T = 0.; // le haut est ouvert : la fumée s'échappe par le conduit
  if (vUv.x - uVt.x < 0.) L = 0.; if (vUv.x + uVt.x > 1.) R = 0.; // côtés ouverts : l'air frais entre
  o = vec4((L + R + B + T - texture(uDiv, vUv).x) * .25, 0., 0., 1.);
}`,

    grad: HEAD + `
uniform sampler2D uP, uVel; uniform vec2 uVt; out vec4 o;
void main(){
  float L = texture(uP, vUv - vec2(uVt.x, 0.)).x, R = texture(uP, vUv + vec2(uVt.x, 0.)).x;
  float B = texture(uP, vUv - vec2(0., uVt.y)).x, T = texture(uP, vUv + vec2(0., uVt.y)).x;
  if (vUv.y + uVt.y > 1.) T = 0.;
  if (vUv.x - uVt.x < 0.) L = 0.; if (vUv.x + uVt.x > 1.) R = 0.;
  vec2 v = texture(uVel, vUv).xy - .5 * vec2(R - L, T - B);
  o = vec4(v, 0., 1.);
}`,

    inject: HEAD + `
uniform sampler2D uS, uC; uniform vec2 uRes; uniform float uDt, uTime;
uniform int uN; uniform vec4 uEA[16]; uniform vec4 uEB[16]; uniform vec4 uEI[16]; uniform vec4 uEC[16];
uniform vec4 uSplat; uniform vec3 uSplatCol;
layout(location = 0) out vec4 oS; layout(location = 1) out vec4 oC;
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec4 s = texture(uS, vUv), c = texture(uC, vUv);
  for (int i = 0; i < 16; i++){
    if (i >= uN) break;
    vec4 A = uEA[i], B = uEB[i], I = uEI[i];
    float r = B.x, w = 0.;
    if (B.y < 9.5){
      // bûche : les gaz de pyrolyse sortent en langues au-dessus du bois
      vec2 a = A.xy, b = A.zw, ab = b - a; float L = max(length(ab), 1.);
      float h = clamp(dot(p - a, ab) / (L * L), 0., 1.); vec2 n = p - (a + ab * h); float d = length(n);
      float shell = (1. - smoothstep(r, r * 1.5, d)) * smoothstep(r * .55, r * .95, d);
      float up = 1. - smoothstep(-.55, .3, n.y / max(d, 1e-3));
      float tong = smoothstep(.3, .85, vnoise(vec2(h * L / (r * 1.15) + I.w * 13., uTime * 1.7 + I.w * 7.)));
      w = shell * up * (.45 + .8 * tong);
    } else {
      vec2 d = p - A.xy; w = exp(-dot(d, d) / (r * r * (B.y > 15. ? .55 : .8)));
    }
    if (w < 1e-4) continue;
    float fuel = I.x * w * uDt;
    s.g += fuel;
    s.r = max(s.r, I.y * w);
    s.b += I.z * w * uDt;
    s.a += uEC[i].a * w * uDt;
    c.rgb += uEC[i].rgb * fuel;
    c.a += B.w * fuel;
  }
  if (uSplat.w > .5){
    vec2 d = p - uSplat.xy; float w = exp(-dot(d, d) / (uSplat.z * uSplat.z));
    if (uSplat.w < 1.5){ s.a += w * (s.r * 1.4 + .04); s.r *= 1. - .85 * w; s.g *= 1. - .7 * w; }
    else c.rgb += uSplatCol * w * 1.5;
  }
  oS = s; oC = c;
}`,

    react: HEAD + `
uniform sampler2D uS, uC; uniform vec2 uSt; uniform float uDt, uO2, uIgn, uBurn, uHeat, uSoot, uRad, uConv, uVent; uniform vec4 uDiff;
layout(location = 0) out vec4 oS; layout(location = 1) out vec4 oC;
void main(){
  vec4 s = texture(uS, vUv), c = texture(uC, vUv);
  vec4 lap = texture(uS, vUv + vec2(uSt.x, 0.)) + texture(uS, vUv - vec2(uSt.x, 0.)) + texture(uS, vUv + vec2(0., uSt.y)) + texture(uS, vUv - vec2(0., uSt.y)) - 4. * s;
  s += min(uDiff * uDt, vec4(.22)) * lap; // diffusion moléculaire
  float T = max(s.r, 0.), F = max(s.g, 0.);
  float pm = clamp(c.a / max(F, 1e-4), 0., 1.); // part de combustible déjà mélangée à l'air
  float ign = smoothstep(uIgn, uIgn + .12, T);
  float rate = uBurn * (1. + 3. * pm) * uO2 * uVent * ign;
  float burn = F * (1. - exp(-rate * uDt));
  float keep = F > 1e-5 ? (F - burn) / F : 0.;
  s.g = F - burn; c.a *= keep;
  s.r = T + burn * uHeat * (.85 + .5 * pm);
  s.b += burn * uSoot * (1. - pm) * (1.6 - .6 * min(uO2, 1.5)) * uVent; // la suie naît des flammes riches
  s.b *= exp(-uDt * .8 * smoothstep(.8, 1.25, T) * min(uO2, 1.5)); // la suie brûle à son tour au sommet de la flamme
  s.r -= uDt * (uRad * T * T * T * T + uConv * T); // rayonnement (T⁴) et mélange avec l'air frais
  s.r = max(s.r - s.a * .7 * uDt, 0.);
  oS = max(s, vec4(0.)); oC = max(c, vec4(0.));
}`,

    part: HEAD + `
uniform sampler2D uP, uQ, uVel; uniform vec2 uRes, uCell; uniform float uDt, uTime, uG, uSpawnK;
uniform int uN; uniform vec4 uEA[16]; uniform vec4 uEB[16]; uniform vec4 uEK[16]; uniform vec4 uBurst;
layout(location = 0) out vec4 oP; layout(location = 1) out vec4 oQ;
void main(){
  vec4 P = texture(uP, vUv), Q = texture(uQ, vUv);
  if (Q.x <= 0.){
    float h1 = hash12(vUv * 913.1 + uTime * 17.3), h2 = hash12(vUv * 377.7 + uTime * 23.1 + 5.), h3 = hash12(vUv * 251.3 - uTime * 13.7 + 9.), h4 = hash12(vUv * 619.9 + uTime * 7.9 + 2.);
    vec2 pos = vec2(0.), vel = vec2(0.); bool born = false;
    if (uBurst.z > 0. && h1 < uBurst.z){
      pos = uBurst.xy + (vec2(h2, h3) - .5) * uBurst.w * .35;
      float a = -1.5708 + (h4 - .5) * 2.4, sp = uBurst.w * (1.2 + 3. * h3);
      vel = vec2(cos(a), sin(a)) * sp; born = true;
    } else if (uN > 0){
      int i = min(int(h2 * float(uN)), uN - 1);
      if (h1 < uEK[i].x * uSpawnK * uDt){
        vec4 A = uEA[i]; float r = uEB[i].x;
        pos = uEB[i].y > 9.5 ? A.xy : mix(A.xy, A.zw, h3) + vec2(0., -r * .7);
        pos.x += (h4 - .5) * r;
        vel = vec2((h4 - .5) * 90., -50. - 150. * h3) * uEK[i].y; born = true;
      }
    }
    if (born){
      float typ = step(.8, fract(h4 * 7.13 + h3));
      float life = typ > .5 ? 2.5 + 3.5 * h2 : .5 + 1.7 * h3;
      oP = vec4(pos, vel); oQ = vec4(life, life, .8 + .35 * h2, typ); return;
    }
    oP = P; oQ = Q; return;
  }
  vec2 pos = P.xy, vel = P.zw; float typ = Q.w;
  vec2 fv = texture(uVel, vec2(pos.x / uRes.x, 1. - pos.y / uRes.y)).xy;
  vec2 flow = vec2(fv.x / uCell.x, -fv.y / uCell.y);
  float k = typ > .5 ? 4.5 : 1.4;
  vel += (flow - vel) * (1. - exp(-k * uDt));
  vel.y += uG * (typ > .5 ? 20. : 150.) * uDt;
  vel += (vec2(hash12(vUv * 71. + uTime), hash12(vUv * 37. - uTime)) - .5) * 260. * uDt;
  pos += vel * uDt;
  float life = Q.x - uDt;
  if (pos.x < -30. || pos.x > uRes.x + 30. || pos.y < -60. || pos.y > uRes.y + 30.) life = 0.;
  oP = vec4(pos, vel); oQ = vec4(life, Q.y, Q.z * exp(-(typ > .5 ? .16 : .85) * uDt), typ);
}`,

    emit: HEAD + EMIT_DECL + `
uniform sampler2D uS, uC, uBB; uniform vec2 uRes, uSt; uniform float uTime, uO2, uIgn, uBurn, uVent, uFlame, uSalt, uBlue0, uWob, uDecor;
out vec4 o;
vec3 bb(float T){ return texture(uBB, vec2(clamp((T * 1250. - 300.) / 1600., 0., 1.), .5)).rgb; }
float crack(vec2 p){ vec2 n = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j)); vec2 r = g + vec2(hash12(n + g), hash12(n + g + 31.7)) - f; float d = dot(r, r);
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return sqrt(d2) - sqrt(d1); }
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  float T0 = texture(uS, vUv).r;
  vec2 off = (vec2(vnoise(p * .05 + vec2(0., uTime * 2.4)), vnoise(p * .05 + vec2(17., uTime * 2.4))) - .5) * uSt * uWob * smoothstep(.1, .8, T0);
  vec4 s = texture(uS, vUv + off), c = texture(uC, vUv + off);
  float T = s.r, F = s.g;
  float pm = clamp(c.a / max(F, 1e-4), 0., 1.);
  float rate = uBurn * (1. + 3. * pm) * uO2 * uVent * smoothstep(uIgn, uIgn + .12, T);
  vec3 e = bb(T) * (1. - exp(-s.b * 3.2)) * 1.25;              // suie incandescente (corps noir)
  float saltI = c.r + c.g + c.b;
  e += vec3(.12, .3, 1.) * F * rate * (uBlue0 + 1.3 * pm) * .5 * exp(-s.b * 2.5 - saltI * 4.); // CH* 431 nm et C₂* 516 nm, noyés par la suie et les sels
  e += bb(T) * .12 * smoothstep(.35, 1., T);                     // gaz chauds
  e += c.rgb * smoothstep(.3, .7, T) * uSalt;                    // raies des sels
  e *= uFlame;
  for (int i = 0; i < 16; i++){
    if (uDecor < .5) break;
    if (i >= uN) break;
    vec4 A = uEA[i], B = uEB[i], G = uEG[i];
    if (B.y < 9.5){
      // braises : craquelures du charbon de bois, qui respirent
      vec2 a = A.xy, b = A.zw, ab = b - a; float L = max(length(ab), 1.); vec2 ax = ab / L, nr = vec2(-ax.y, ax.x);
      if (nr.y > 0.) nr = -nr;
      float sx = dot(p - a, ax), q = dot(p - a, nr);
      float d = length(p - (a + ax * clamp(sx, 0., L))) - B.x;
      if (d > 0.) continue;
      float qn = clamp(q / B.x, -1., 1.), cover = clamp(-d, 0., 1.);
      float cr = crack(vec2(sx / (B.x * .5), q / (B.x * .3)) + G.w * 7.);
      float lines = 1. - smoothstep(.03, .13, cr);
      float charAt = smoothstep(-.9, .6, qn + G.x * 1.7 - .6);
      float breath = .55 + .45 * vnoise(vec2(sx * .03 + G.w * 9., uTime * .6 + G.w * 5.));
      float g = G.y * charAt * breath;
      float under = 1. - smoothstep(-1., .2, qn);
      e += bb(.42 + .32 * g) * (lines * g * 2.4 + g * g * .45 + under * g * .5) * cover;
    } else if (B.y < 10.5){
      // bougie : la mèche rougeoie, la cire laisse passer la lumière de sa propre flamme
      vec2 m = A.xy; float r = B.x, top = m.y + r * .55;
      vec2 dw = p - vec2(m.x, m.y + r * .05);
      e += vec3(1., .3, .08) * .9 * G.y * exp(-dot(dw, dw) / 6.);
      if (abs(p.x - m.x) < r && p.y > top && p.y < A.w){
        float xn = (p.x - m.x) / r;
        e += vec3(1., .5, .2) * .28 * G.y * exp(-(p.y - top) / (r * .8)) * (1. - xn * xn);
      }
    }
  }
  o = vec4(e, 1.);
}`,

    blur: HEAD + `
uniform sampler2D uT; uniform vec2 uDir; out vec4 o;
void main(){
  vec3 c = texture(uT, vUv).rgb * .227027;
  c += (texture(uT, vUv + uDir * 1.3846).rgb + texture(uT, vUv - uDir * 1.3846).rgb) * .3162162;
  c += (texture(uT, vUv + uDir * 3.2308).rgb + texture(uT, vUv - uDir * 3.2308).rgb) * .0702703;
  o = vec4(c, 1.);
}`,

    comp: HEAD + EMIT_DECL + `
uniform sampler2D uBg, uS, uE, uB1, uB2, uB3; uniform vec2 uRes; uniform float uTime, uAmb, uSky, uBloom, uSmoke, uExpo, uDecor, uInk; uniform vec3 uAmbCol, uPaper;
uniform vec4 uL[16];
out vec4 o;
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
vec3 bark(float code, float sx, float q, float sd){
  if (code < 1.5){ float f = vnoise(vec2(sx * .035, q * .45) + sd * 9.); return mix(vec3(.12, .1, .085), vec3(.32, .27, .22), smoothstep(.35, .78, f)); }
  if (code < 2.5){ float f = vnoise(vec2(sx * .07, q * .18) + sd * 9.); return mix(vec3(.2, .1, .06), vec3(.58, .3, .15), smoothstep(.45, .82, f)); }
  float f = vnoise(vec2(sx * .45, q * .06) + sd * 9.), g = vnoise(vec2(sx * .04, q * .3) + sd * 3.);
  return mix(vec3(.5, .47, .42), vec3(.06, .05, .05), clamp(smoothstep(.74, .8, f) + smoothstep(.76, .92, g) * .6, 0., 1.));
}
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec3 bg = pow(texture(uBg, vUv).rgb, vec3(2.2));
  vec3 fire = vec3(0.);
  for (int i = 0; i < 16; i++){
    if (i >= uN) break;
    vec4 Lt = uL[i]; if (Lt.z <= 0.) continue;
    vec2 d = (p - Lt.xy) / uRes.y;
    fire += Lt.z / (.06 + dot(d, d) * 7.);
  }
  vec3 glow = texture(uB3, vUv).rgb + texture(uB2, vUv).rgb * .5;
  vec3 illum = uAmbCol * uAmb + vec3(1., .56, .26) * fire + glow * 1.1;
  vec3 col = p.y < uSky ? bg : bg * illum;
  if (uDecor < .5) col = uPaper;
  for (int i = 0; i < 16; i++){
    if (i >= uN || uDecor < .5) break;
    vec4 A = uEA[i], B = uEB[i], G = uEG[i];
    if (B.y < 9.5){
      vec2 a = A.xy, b = A.zw, ab = b - a; float L = max(length(ab), 1.); vec2 ax = ab / L, nr = vec2(-ax.y, ax.x);
      if (nr.y > 0.) nr = -nr;
      float sx = dot(p - a, ax), q = dot(p - a, nr);
      float d = length(p - (a + ax * clamp(sx, 0., L))) - B.x;
      if (d > 1.) continue;
      float qn = clamp(q / B.x, -1., 1.);
      vec3 alb = bark(B.y, sx, q, G.w);
      vec3 ch = vec3(.035, .03, .028) * (.7 + .6 * vnoise(vec2(sx, q) * .2));
      alb = mix(alb, ch, smoothstep(-.9, .6, qn + G.x * 1.7 - .6));
      alb = mix(alb, alb * vec3(.55, .5, .48), G.z);                      // bois mouillé, plus sombre
      vec3 c = alb * illum * (.3 + .7 * (.5 + .5 * qn)) * 1.25;
      col = mix(col, c, clamp(.5 - d, 0., 1.));
    } else if (B.y < 10.5){
      vec2 m = A.xy; float r = B.x, top = m.y + r * .55, bot = A.w;
      float d = sdBox(p - vec2(m.x, (top + bot) * .5), vec2(r - 2., (bot - top) * .5 - 2.)) - 2.;
      if (d < 1.){
        float xn = clamp((p.x - m.x) / r, -1., 1.);
        vec3 wax = vec3(.92, .86, .74);
        vec3 c = wax * illum * (.35 + .65 * sqrt(1. - xn * xn)) + wax * .03;
        col = mix(col, c, clamp(.5 - d, 0., 1.));
      }
      if (p.y > m.y && p.y < top + 1.) col = mix(col, vec3(.015), clamp(1.4 - abs(p.x - m.x), 0., 1.));
    } else {
      vec2 m = A.xy; float r = B.x, bot = A.w, hgt = bot - m.y;
      float dt = sdBox(p - vec2(m.x, m.y + hgt * .45), vec2(r, hgt * .45));
      float dc = sdBox(p - vec2(m.x, m.y + hgt * .74), vec2(r * 1.3, hgt * .05)) - 1.;
      float db = sdBox(p - vec2(m.x, bot - r * .35), vec2(r * 3.4, r * .35)) - 2.;
      float d = min(min(dt, dc), db);
      if (d < 1.){
        float xn = clamp((p.x - m.x) / (d == db ? r * 3.4 : d == dc ? r * 1.3 : r), -1., 1.);
        vec3 met = vec3(.5, .52, .56) * (.35 + .65 * sqrt(1. - xn * xn)) + vec3(.9) * exp(-pow((xn + .45) * 5., 2.)) * .35;
        if (d == dc) met *= .6 + .4 * step(.35, abs(fract(xn * 2.) - .5));
        col = mix(col, met * illum * 1.2 + met * .02, clamp(.5 - d, 0., 1.));
      }
    }
  }
  vec4 s = texture(uS, vUv);
  float sm = (1. - exp(-s.b * uSmoke)) * (1. - .75 * smoothstep(.3, .75, s.r));
  float stv = 1. - exp(-s.a * 1.8);
  vec3 em = texture(uE, vUv).rgb + (texture(uB1, vUv).rgb * .5 + texture(uB2, vUv).rgb * .4 + texture(uB3, vUv).rgb * .35) * uBloom;
  if (uInk > .5){
    // fond crème : on ne peut pas ajouter de lumière au blanc, la flamme est peinte comme une encre colorée
    col = mix(col, vec3(.2, .18, .17), sm * .8);
    col = mix(col, vec3(.55, .6, .66), stv * .45);
    vec3 fc = aces(em * uExpo * 1.6);
    float a = clamp(max(fc.r, max(fc.g, fc.b)) * 1.35, 0., 1.);
    float l = dot(fc, vec3(.3, .59, .11));
    vec3 ink = clamp(mix(vec3(l), fc, 1.45) * .94 - .03, 0., 1.);
    col = mix(col, ink, a);
  } else {
    if (uDecor < .5){ col = mix(col, vec3(.07, .065, .06) + glow * .3, sm * .9); col = mix(col, vec3(.5, .52, .56) * (glow * .6 + .05), stv * .7); }
    else { col = mix(col, vec3(.028, .025, .023) + glow * .3 + illum * .035, sm * .92); col = mix(col, vec3(.62, .64, .68) * (illum * .55 + .03), stv * .7); }
    col = aces((col + em) * uExpo);
  }
  col = pow(col, vec3(1. / 2.2)) + (hash12(p + fract(uTime) * 91.) - .5) / 255.;
  o = vec4(col, 1.);
}`,
  };
  const VS_SPARK = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uP, uQ, uBB; uniform vec2 uRes, uScale; uniform int uSide; uniform float uStreak, uGain;
out vec3 vCol;
void main(){
  int id = gl_VertexID, pi = id >> 1, hd = id & 1;
  ivec2 tc = ivec2(pi % uSide, pi / uSide);
  vec4 P = texelFetch(uP, tc, 0), Q = texelFetch(uQ, tc, 0);
  if (Q.x <= 0.){ gl_Position = vec4(9., 9., 0., 1.); vCol = vec3(0.); return; }
  vec2 d = P.zw * uStreak; float l = length(d);
  float mn = Q.w > .5 ? 2.2 : 1.3;
  if (l < mn) d = (l > 1e-3 ? d / l : vec2(0., 1.)) * mn;
  vec2 pos = hd == 1 ? P.xy : P.xy - d;
  gl_Position = vec4(pos.x / uRes.x * 2. - 1., 1. - pos.y / uRes.y * 2., 0., 1.);
  float fade = smoothstep(0., .4, Q.x) * smoothstep(0., .05, Q.y - Q.x + .001);
  vCol = texture(uBB, vec2(clamp((Q.z * 1250. - 300.) / 1600., 0., 1.), .5)).rgb * fade * uGain * (hd == 1 ? 1. : .2) * (Q.w > .5 ? 2. : 1.);
}`;
  const FS_SPARK = `#version 300 es
precision highp float; in vec3 vCol; uniform float uInk; out vec4 o;
void main(){
  if (uInk > .5){ float a = clamp(max(vCol.r, max(vCol.g, vCol.b)) * .9, 0., 1.); vec3 c = clamp(vCol / max(.001, max(vCol.r, max(vCol.g, vCol.b))), 0., 1.) * vec3(.95, .55, .2); o = vec4(c * a, a); }
  else o = vec4(vCol, 0.);
}`;

  /* ───────── décors peints (2D), éclairés ensuite par le feu ───────── */
  function grain(g, x, y, w, h, n, a, light) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = light ? `rgba(255,240,220,${Math.random() * a})` : `rgba(0,0,0,${Math.random() * a})`;
      g.fillRect(x + Math.random() * w, y + Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  }
  const PAINT = {
    cheminee(g, W, H, v) {
      const cx = (v.x0 + v.x1) / 2, floor = H * 0.8;
      const ow = Math.min((v.x1 - v.x0) * 0.86, H * 1.3), oh = H * 0.66, ox = cx - ow / 2, oy = floor - oh;
      g.fillStyle = '#3a332d'; g.fillRect(0, 0, W, H);
      grain(g, 0, 0, W, H, W * H / 90, 0.25, false);
      // manteau de pierre
      const mw = ow + H * 0.24;
      g.fillStyle = '#5b5046'; g.fillRect(cx - mw / 2, oy - H * 0.13, mw, oh + H * 0.13);
      g.strokeStyle = 'rgba(20,16,12,.55)'; g.lineWidth = 2;
      for (let y = oy - H * 0.13; y < floor; y += H * 0.065) {
        const off = ((y / (H * 0.065)) | 0) % 2 ? H * 0.06 : 0;
        g.beginPath(); g.moveTo(cx - mw / 2, y); g.lineTo(cx + mw / 2, y); g.stroke();
        for (let x = cx - mw / 2 + off; x < cx + mw / 2; x += H * 0.12) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + H * 0.065); g.stroke(); }
      }
      grain(g, cx - mw / 2, oy - H * 0.13, mw, oh, mw * oh / 60, 0.3, true);
      // linteau
      g.fillStyle = '#2c241e'; g.fillRect(cx - ow / 2 - H * 0.02, oy - H * 0.035, ow + H * 0.04, H * 0.05);
      // contrecœur de briques réfractaires
      g.fillStyle = '#251a15'; g.fillRect(ox, oy, ow, oh);
      const bh = H * 0.034, bw = bh * 2.6;
      for (let r = 0, y = oy + 2; y < floor; r++, y += bh) {
        for (let x = ox - (r % 2 ? bw / 2 : 0); x < ox + ow; x += bw) {
          const k = 0.75 + Math.random() * 0.35;
          g.fillStyle = `rgb(${(118 * k) | 0},${(58 * k) | 0},${(38 * k) | 0})`;
          g.fillRect(Math.max(ox, x + 1.5), y + 1.5, Math.min(bw - 3, ox + ow - x - 1.5), bh - 3);
        }
      }
      grain(g, ox, oy, ow, oh, ow * oh / 40, 0.35, false);
      const soot = g.createLinearGradient(0, oy, 0, floor);
      soot.addColorStop(0, 'rgba(8,6,5,.92)'); soot.addColorStop(0.55, 'rgba(8,6,5,.45)'); soot.addColorStop(1, 'rgba(8,6,5,.1)');
      g.fillStyle = soot; g.fillRect(ox, oy, ow, oh);
      // côtés en biais
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + ow * 0.08, oy + oh * 0.1); g.lineTo(ox + ow * 0.08, floor); g.lineTo(ox, floor); g.fill();
      g.beginPath(); g.moveTo(ox + ow, oy); g.lineTo(ox + ow * 0.92, oy + oh * 0.1); g.lineTo(ox + ow * 0.92, floor); g.lineTo(ox + ow, floor); g.fill();
      // sole et cendres
      g.fillStyle = '#4a423b'; g.fillRect(0, floor, W, H - floor);
      g.strokeStyle = 'rgba(0,0,0,.4)';
      for (let x = (cx % (H * 0.25)) - H * 0.25; x < W; x += H * 0.25) { g.beginPath(); g.moveTo(x, floor); g.lineTo(x - H * 0.08, H); g.stroke(); }
      g.beginPath(); g.moveTo(0, floor + H * 0.09); g.lineTo(W, floor + H * 0.09); g.stroke();
      grain(g, 0, floor, W, H - floor, W * (H - floor) / 50, 0.3, true);
      for (let i = 0; i < 900; i++) {
        const a = rnd(TAU), d = Math.sqrt(Math.random());
        const x = cx + Math.cos(a) * d * ow * 0.42, y = floor + Math.sin(a) * d * H * 0.035 - H * 0.004;
        const k = 70 + Math.random() * 70;
        g.fillStyle = `rgba(${k},${k * 0.96},${k * 0.92},.55)`; g.fillRect(x, y, 2 + Math.random() * 3, 1 + Math.random() * 2);
      }
      // chenets
      g.fillStyle = '#16120f';
      for (const s of [-1, 1]) {
        const x = cx + s * ow * 0.3;
        g.fillRect(x - H * 0.006, floor - H * 0.1, H * 0.012, H * 0.1);
        g.beginPath(); g.arc(x, floor - H * 0.11, H * 0.016, 0, TAU); g.fill();
        g.fillRect(x - H * 0.03, floor - H * 0.008, H * 0.06, H * 0.01);
      }
      return { floor, ground: floor, amb: 0.05, ambCol: [1, 0.92, 0.85], sky: -1 };
    },
    nuit(g, W, H, v) {
      const cx = (v.x0 + v.x1) / 2, hor = H * 0.6, ground = H * 0.8;
      const sky = g.createLinearGradient(0, 0, 0, hor);
      sky.addColorStop(0, '#02030a'); sky.addColorStop(0.7, '#070b1c'); sky.addColorStop(1, '#141a33');
      g.fillStyle = sky; g.fillRect(0, 0, W, hor + 2);
      for (let i = 0; i < W * H / 2600; i++) {
        const y = Math.pow(Math.random(), 1.4) * hor * 0.95, r = Math.pow(Math.random(), 4) * 1.6 + 0.35;
        g.fillStyle = `rgba(230,235,255,${0.25 + Math.random() * 0.6})`; g.beginPath(); g.arc(Math.random() * W, y, r, 0, TAU); g.fill();
      }
      // voie lactée discrète
      g.save(); g.globalAlpha = 0.07; g.translate(W * 0.6, hor * 0.3); g.rotate(-0.5);
      const mw = g.createLinearGradient(0, -H * 0.12, 0, H * 0.12);
      mw.addColorStop(0, 'rgba(180,190,255,0)'); mw.addColorStop(0.5, 'rgba(200,205,255,1)'); mw.addColorStop(1, 'rgba(180,190,255,0)');
      g.fillStyle = mw; g.fillRect(-W, -H * 0.12, W * 2, H * 0.24); g.restore();
      // lisière de forêt
      g.fillStyle = '#04050a';
      g.beginPath(); g.moveTo(0, hor + 4);
      for (let x = 0; x <= W; x += 6) {
        const tr = Math.abs(Math.sin(x * 0.045) * Math.sin(x * 0.013 + 1)) * H * 0.07;
        g.lineTo(x, hor - H * 0.025 - tr - Math.random() * H * 0.006);
      }
      g.lineTo(W, hor + 4); g.fill();
      // sol de terre et d'herbe
      const gr = g.createLinearGradient(0, hor, 0, H);
      gr.addColorStop(0, '#191510'); gr.addColorStop(1, '#3a3024');
      g.fillStyle = gr; g.fillRect(0, hor, W, H - hor);
      grain(g, 0, hor, W, H - hor, W * (H - hor) / 30, 0.4, false);
      g.strokeStyle = 'rgba(70,80,40,.6)'; g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < W * 1.2; i++) {
        const x = Math.random() * W, y = hor + Math.pow(Math.random(), 0.6) * (H - hor);
        if (Math.abs(x - cx) < H * 0.25 && Math.abs(y - ground) < H * 0.06) continue;
        const hh = (2 + (y - hor) / (H - hor) * 10) * (0.5 + Math.random());
        g.moveTo(x, y); g.lineTo(x + rnd(2, -2), y - hh);
      }
      g.stroke();
      // cercle de pierres
      const rx = Math.min((v.x1 - v.x0) * 0.3, H * 0.45), ry = H * 0.045;
      g.fillStyle = 'rgba(20,16,12,.8)'; g.beginPath(); g.ellipse(cx, ground, rx * 0.95, ry * 0.9, 0, 0, TAU); g.fill();
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * TAU, x = cx + Math.cos(a) * rx, y = ground + Math.sin(a) * ry, s = H * (0.022 + Math.random() * 0.014) * (Math.sin(a) > 0 ? 1.2 : 0.85);
        const k = 90 + Math.random() * 50;
        g.fillStyle = `rgb(${k},${k * 0.97},${k * 0.93})`;
        g.beginPath(); g.ellipse(x, y - s * 0.3, s * 1.2, s * 0.75, rnd(0.4, -0.4), 0, TAU); g.fill();
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y, s * 1.2, s * 0.4, 0, 0, Math.PI); g.fill();
      }
      return { floor: ground, ground, amb: 0.07, ambCol: [0.55, 0.65, 1], sky: hor - H * 0.1 };
    },
    labo(g, W, H, v) {
      const top = H * 0.84;
      g.fillStyle = '#9ea6ab'; g.fillRect(0, 0, W, top);
      const t = H * 0.06;
      g.fillStyle = '#6d7478';
      for (let y = 0; y < top; y += t) g.fillRect(0, y, W, 1.5);
      for (let x = 0; x < W; x += t) g.fillRect(x, 0, 1.5, top);
      grain(g, 0, 0, W, top, W * top / 120, 0.08, false);
      g.fillStyle = '#101214'; g.fillRect(0, top, W, H - top);
      g.fillStyle = '#2a2e32'; g.fillRect(0, top, W, 3);
      grain(g, 0, top, W, H - top, W * (H - top) / 80, 0.2, true);
      // étiquettes des sels
      return { floor: top, ground: top, amb: 0.055, ambCol: [0.9, 0.95, 1], sky: -1 };
    },
    table(g, W, H, v, opt) {
      const top = H * 0.8, cx = opt && opt.x != null ? opt.x : (v.x0 + v.x1) / 2;
      g.fillStyle = '#4c4038'; g.fillRect(0, 0, W, top);
      grain(g, 0, 0, W, top, W * top / 50, 0.18, false);
      grain(g, 0, 0, W, top, W * top / 120, 0.12, true);
      g.fillStyle = '#5a3a22'; g.fillRect(0, top, W, H - top);
      g.strokeStyle = 'rgba(30,16,8,.5)';
      for (let i = 0; i < 40; i++) {
        const y = top + Math.random() * (H - top);
        g.lineWidth = 0.5 + Math.random() * 1.5;
        g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 3);
        g.stroke();
      }
      g.fillStyle = '#7a5434'; g.fillRect(0, top, W, 3);
      // bougeoir de laiton
      if (opt && opt.r) {
        const r = opt.r;
        g.fillStyle = '#6b5326'; g.beginPath(); g.ellipse(cx, top + r * 0.2, r * 3.6, r * 0.9, 0, 0, TAU); g.fill();
        g.fillStyle = '#a08040'; g.beginPath(); g.ellipse(cx, top - r * 0.05, r * 3.4, r * 0.75, 0, 0, TAU); g.fill();
        g.fillStyle = '#5a4520'; g.fillRect(cx - r * 1.4, top - r * 1.1, r * 2.8, r * 1.1);
      }
      return { floor: top, ground: top, amb: 0.045, ambCol: [1, 0.9, 0.8], sky: -1 };
    },
    station(g, W, H, v) {
      g.fillStyle = '#3d424a'; g.fillRect(0, 0, W, H);
      const pw = H * 0.32, ph = H * 0.24;
      for (let y = -ph * 0.3; y < H; y += ph) for (let x = (W / 2) % pw - pw; x < W; x += pw) {
        g.fillStyle = `rgb(${66 + rint(10)},${71 + rint(10)},${80 + rint(10)})`; g.fillRect(x + 3, y + 3, pw - 6, ph - 6);
        g.fillStyle = '#23262b';
        for (const [a, b] of [[10, 10], [pw - 14, 10], [10, ph - 14], [pw - 14, ph - 14]]) { g.beginPath(); g.arc(x + a + 2, y + b + 2, 2.5, 0, TAU); g.fill(); }
      }
      g.fillStyle = '#b8a560'; g.fillRect(0, H * 0.86, W, H * 0.018);
      g.fillStyle = '#2a2d33'; g.fillRect(0, H * 0.878, W, H * 0.006);
      g.font = `600 ${Math.round(H * 0.018)}px "JetBrains Mono", monospace`;
      g.fillStyle = 'rgba(230,230,210,.5)';
      g.fillText('FLEX · COMBUSTION INTEGRATED RACK', (v.x0 + v.x1) / 2 - H * 0.25, H * 0.12);
      grain(g, 0, 0, W, H, W * H / 90, 0.12, false);
      return { floor: H * 0.86, ground: H * 0.86, amb: 0.1, ambCol: [0.85, 0.92, 1], sky: -1 };
    },
  };

  /* ───────── l'ancien feu, en 2D, conservé comme repli ───────── */
  function legacy(env) {
  // (version d'origine, inchangée sauf l'outil « braise » devenu « poser »)
      const ctx = env.ctx;
      const GW = 180, GH = Math.max(70, Math.round(GW * env.h / env.w));
      const N = GW * GH;
      const heat = new Float32Array(N);
      const b = buf(GW, GH);
      const L = lut([[0, 4, 2, 10], [0.14, 60, 8, 30], [0.34, 170, 30, 20], [0.55, 240, 100, 20], [0.76, 255, 190, 70], [0.9, 255, 240, 180], [1, 255, 255, 250]]);
      const emb = [];
      const GROUND = GH - Math.max(6, Math.round(GH * 0.12));
      for (let i = 0; i < 5; i++) emb.push({ x: GW * (0.14 + i * 0.18) + rnd(6, -6), y: GROUND + rnd(4, -2), h: rnd(1.15, 0.85), r: rnd(7, 4) });
      let wind = 0, drag = null, wet = new Float32Array(N);
      const sparks = [];
      const drone = env.audio.drone(70, 'sawtooth', 0.0);
      return {
        frame(t, dt) {
          wind *= 0.94;
          for (const e of emb) {
            e.h = clamp(e.h + rnd(0.06, -0.06), 0.55, 1.35);
            for (let y = -e.r; y <= e.r; y++) for (let x = -e.r; x <= e.r; x++) {
              const d2 = x * x + y * y; if (d2 > e.r * e.r) continue;
              const px = (e.x + x) | 0, py = (e.y + y) | 0;
              if (px < 1 || py < 1 || px >= GW - 1 || py >= GH - 1) continue;
              const i = py * GW + px;
              heat[i] = Math.max(heat[i], (1 - Math.sqrt(d2) / e.r) * e.h * rnd(1.05, 0.75) * (1 - wet[i]));
            }
          }
          for (let y = 1; y < GH; y++) {
            for (let x = 0; x < GW; x++) {
              const i = y * GW + x;
              const src = heat[i];
              if (src <= 0.002) continue;
              const off = Math.round(rnd(1.1, -1.1) + wind * 3);
              let nx = x + off; if (nx < 0) nx = 0; if (nx > GW - 1) nx = GW - 1;
              const ni = (y - 1) * GW + nx;
              const cool = 0.0038 + Math.random() * 0.011 + wet[ni] * 0.3;
              heat[ni] = Math.max(heat[ni], src - cool);
              heat[i] *= 0.9;
              if (src > 1.0 && Math.random() < 0.0025) sparks.push({ x, y, vx: rnd(0.4, -0.4) + wind, vy: -rnd(1.1, 0.4), l: rnd(1.4, 0.6) });
            }
          }
          for (let i = 0; i < N; i++) { heat[i] *= 0.996; wet[i] *= 0.997; }

          const d = b.d;
          let tot = 0;
          for (let i = 0; i < N; i++) {
            const v = clamp(heat[i] * 210, 0, 255) | 0;
            tot += v;
            const c = v * 3, o = i * 4;
            d[o] = L[c]; d[o + 1] = L[c + 1]; d[o + 2] = L[c + 2];
            if (wet[i] > 0.05) { d[o] *= 0.6; d[o + 1] = Math.min(255, d[o + 1] * 0.7 + wet[i] * 30); d[o + 2] = Math.min(255, d[o + 2] + wet[i] * 90); }
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
          const sx = env.w / GW, sy = env.h / GH;
          ctx.globalCompositeOperation = 'lighter';
          for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx; s.y += s.vy; s.vy += 0.012; s.vx += rnd(0.07, -0.07) + wind * 0.3; s.l -= dt;
            if (s.l <= 0 || s.y < 0) { sparks.splice(i, 1); continue; }
            ctx.fillStyle = `rgba(255,${170 + rint(80)},90,${clamp(s.l, 0, 1) * 0.8})`;
            ctx.beginPath(); ctx.arc(s.x * sx, s.y * sy, 1.6, 0, TAU); ctx.fill();
          }
          for (const e of emb) {
            const g = ctx.createRadialGradient(e.x * sx, e.y * sy, 0, e.x * sx, e.y * sy, e.r * sx * 2.2);
            g.addColorStop(0, `rgba(255,120,40,${0.4 + e.h * 0.2})`);
            g.addColorStop(1, 'rgba(255,60,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(e.x * sx, e.y * sy, e.r * sx * 2.2, 0, TAU); ctx.fill();
            ctx.fillStyle = `rgba(${40 + e.h * 40},${20},${18},.9)`;
            ctx.beginPath(); ctx.arc(e.x * sx, e.y * sy, e.r * sx * 0.75, 0, TAU); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
          if (drone) { drone.gain(clamp(tot / N / 255 * 0.5, 0, 0.14)); drone.cut(300 + tot / N * 12); }
        },
        down(p) {
          const gx = p.x / env.w * GW, gy = p.y / env.h * GH;
          if (env.tool === 'poser') {
            let best = null, bd = 1e9;
            for (const e of emb) { const d = Math.hypot(e.x - gx, e.y - gy); if (d < bd) { bd = d; best = e; } }
            if (bd < 12) drag = best;
            else if (emb.length < 14) { emb.push({ x: gx, y: gy, h: rnd(1.2, 0.85), r: rnd(7, 4) }); env.audio.noise(0.5, 0.18, 700, 1, 'lowpass', 90); }
          }
        },
        move(p) {
          if (!p.down) return;
          const gx = p.x / env.w * GW, gy = p.y / env.h * GH;
          if (env.tool === 'souffle') { wind = clamp(p.dx * 0.03, -1, 1); if (Math.random() < 0.2) env.audio.noise(0.3, 0.06, 900, 0.7, 'highpass'); }
          else if (env.tool === 'eau') {
            for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
              if (x * x + y * y > 36) continue;
              const px = (gx + x) | 0, py = (gy + y) | 0;
              if (px < 0 || py < 0 || px >= GW || py >= GH) continue;
              wet[py * GW + px] = 1; heat[py * GW + px] *= 0.2;
            }
            if (Math.random() < 0.15) env.audio.noise(0.4, 0.12, 3000, 1.4, 'bandpass', 700);
          } else if (drag) { drag.x = clamp(gx, 4, GW - 4); drag.y = clamp(gy, 6, GH - 3); }
        },
        up() { drag = null; wind *= 0.4; },
        dispose() { if (drone) drone.stop(); },
      };
  }

  /* ───────── la machine ───────── */
  const QUAL = {
    legere: { vel: 8000, sc: 2.0, jac: 12, side: 64, comp: 0.7 },
    normale: { vel: 15000, sc: 2.4, jac: 18, side: 128, comp: 1.1 },
    haute: { vel: 28000, sc: 2.6, jac: 26, side: 192, comp: 1.6 },
  };

  window.FASC.push({
    id: 'feu', name: 'Le Feu', cat: 'Éléments', glyph: '🜂', decor: true, smoothTime: true,
    blurb: 'Combustion, convection et lumière',
    hint: 'OBSERVER : touchez pour mesurer la température et identifier ce qui brûle · SOUFFLE : glissez pour attiser · POSER : touchez pour poser une bûche, une bougie ou un bec, glissez un élément pour le déplacer · SEL : touchez une flamme · EAU : glissez pour arroser.',
    intro: 'Un foyer simulé comme un vrai fluide : l’air chauffé monte, tourbillonne et étire les flammes. Le bois libère des gaz qui brûlent au contact de l’air, la suie chauffée au rouge donne la lumière jaune, et la base des flammes bleuit là où la réaction est la plus vive. Soufflez, arrosez, changez la gravité, jetez des sels : chaque élément colore la flamme de ses propres raies.',
    legend: [
      { color: '#ff9a4d', name: 'Quercus robur', role: 'chêne · braises longues', desc: 'Un bois dense, près de 700 kg par mètre cube. Il s’allume lentement, brûle longtemps et laisse un lit de braises qui rougeoie pendant des heures.' },
      { color: '#ffc24d', name: 'Pinus sylvestris', role: 'pin · résineux qui crépite', desc: 'Léger et chargé de résine. Les poches de sève et d’eau éclatent en gerbes d’étincelles. Ses flammes sont hautes, jaunes et fumeuses.' },
      { color: '#fff0b8', name: 'Betula pendula', role: 'bouleau · l’allume-feu', desc: 'Son écorce blanche contient de la bétuline, une substance huileuse qui brûle même humide. Les trappeurs en gardaient toujours un morceau dans la poche.' },
      { color: '#ffe08a', name: 'Paraffine', role: 'bougie · flamme de diffusion', desc: 'La chaleur fait fondre la cire, la mèche la fait monter, la flamme la vaporise. Le gaz et l’air se rencontrent en se mélangeant lentement : c’est une flamme de diffusion, comme celle du bois.' },
      { color: '#7fb2ff', name: 'Méthane', role: 'bec Bunsen · flamme prémélangée', desc: 'La virole laisse entrer l’air avant la flamme. Ouverte, le gaz brûle complètement en un cône bleu sans suie. Fermée, la flamme redevient jaune, éclairante et fumeuse.' },
      { color: '#ffd27a', name: 'Suie incandescente', role: 'lumière jaune · corps noir', desc: 'Des grains de carbone chauffés vers 1 000 °C brillent comme un corps noir : rouge sombre, orange, puis jaune quand la température monte. En refroidissant, ils deviennent fumée.' },
      { color: '#5b8cff', name: 'Radicaux CH* et C₂*', role: 'lumière bleue · chimiluminescence', desc: 'Là où la réaction est la plus vive, des molécules excitées émettent dans le bleu (431 nm) et le vert (516 nm) : c’est la base bleue des flammes.' },
      { color: '#ff2a3a', name: 'Sels métalliques', role: 'raies d’émission', desc: 'Chaque atome excité par la chaleur n’émet qu’à quelques longueurs d’onde précises : sodium jaune, strontium rouge, cuivre vert, potassium lilas. Les feux d’artifice utilisent les mêmes sels.' },
    ],
    about: [
      'Le bois ne brûle pas directement. Vers 250 °C, il se décompose en gaz combustibles : c’est la pyrolyse. Ces gaz brûlent au-dessus de la bûche en se mêlant à l’oxygène de l’air. Il reste du charbon de bois, qui rougeoie en braises. Qu’il manque le combustible, l’oxygène ou la chaleur, les trois côtés du « triangle du feu », et la flamme s’éteint.',
      'La simulation résout les équations d’un fluide sur la carte graphique (la méthode des « stable fluids » de Jos Stam, 1999). La poussée d’Archimède soulève l’air chaud, les tourbillons se replient et font battre la flamme. Une flamme de diamètre D bat environ 1,5/√D fois par seconde (D en mètres) : une quinzaine de fois pour une bougie qui vacille, une ou deux fois pour un grand feu.',
      'Tout objet chauffé au-delà d’environ 525 °C se met à luire d’un rouge sombre : c’est le « point de Draper », mesuré en 1847. Les forgerons lisaient la température du fer à sa couleur. Ici, chaque couleur de suie, de braise ou d’étincelle est calculée avec la loi de Planck.',
      'En 1859, Robert Bunsen et Gustav Kirchhoff font passer la lumière des flammes colorées dans un prisme : chaque élément y signe un code-barres de raies. Ils y découvrent deux éléments inconnus, le césium (du latin caesius, bleu ciel) et le rubidium (rubidus, rouge sombre), nommés d’après la couleur de leurs raies.',
      'Sans gravité, pas de convection : l’air chaud ne monte plus. Dans la Station spatiale internationale, la flamme d’une bougie devient une sphère bleue et pâle, nourrie seulement par la diffusion lente de l’oxygène (expériences FLEX, 2009 à 2012). Réglez la gravité à zéro pour la voir. Faraday le disait déjà en 1848, dans ses conférences sur « l’histoire chimique d’une bougie » : la forme de la flamme vient du courant d’air qu’elle crée.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une flamme pour lire sa température et ce qui la colore. Touchez une bûche, une bougie ou un bec pour l’identifier et suivre son état.' },
      { id: 'souffle', label: 'souffle', desc: 'Glissez pour souffler : l’air apporte de l’oxygène, attise les braises, couche les flammes et emporte les étincelles.' },
      { id: 'poser', label: 'poser', desc: 'Touchez pour poser l’élément choisi dans le panneau (rubrique « Poser »). Touchez un élément existant et glissez pour le déplacer.' },
      { id: 'sel', label: 'sel', desc: 'Touchez une flamme pour y jeter une pincée du sel choisi dans le panneau. Chaque élément colore la flamme de ses propres raies d’émission.' },
      { id: 'eau', label: 'eau', desc: 'Glissez pour arroser : l’eau refroidit les gaz, se vaporise en panache blanc et mouille le bois, qui fume avant de se rallumer.' },
    ],
    make(env) {
      try { return makeGL(env); } catch (e) {
        console.warn('Le Feu : repli en 2D', e);
        return legacy(env);
      }
    },
  });

  function makeGL(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const kS = clamp(Math.min(W, H) / 800, 0.6, 1.5);
    const mobile = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent) || Math.min(W, H) < 520;
    const cfg = { scene: 'cheminee', g: 1, o2: 21, wind: 0, turb: 0.45, valve: 1, smoke: true, sparks: true, glow: 1, auto: true, put: 'chene', sel: 'na', q: 'haute' };
    const snd = () => au && au.on && au.ctx;
    const BB = blackbody(256), BURN = 1.9;
    // sans convection, l'oxygène n'arrive plus que par diffusion : la combustion ralentit
    const VENT = () => 0.5 + 0.5 * clamp(cfg.g, 0, 1);

    /* ressources GPU (recréées si l'on change la qualité) */
    let R = null, lost = false;
    function initGL(qk) {
      const Q = QUAL[qk];
      const cs = Math.min(dpr, Q.comp);
      const cw = Math.max(2, Math.round(W * cs)), ch = Math.max(2, Math.round(H * cs));
      const K = GLKit(cw, ch);
      const gl = K.gl;
      const GVW = Math.max(32, Math.round(Math.sqrt((Q.vel * W) / H))), GVH = Math.max(32, Math.round((GVW * H) / W));
      const GSW = Math.round(GVW * Q.sc), GSH = Math.round(GVH * Q.sc);
      const EW = Math.round(cw / 2), EH = Math.round(ch / 2);
      const r = {
        K, gl, Q, cw, ch, GVW, GVH, GSW, GSH,
        vel: K.double(GVW, GVH), prs: K.double(GVW, GVH), curl: K.target(GVW, GVH), div: K.target(GVW, GVH),
        S: K.double(GSW, GSH), C: K.double(GSW, GSH),
        P: K.double(Q.side, Q.side, 'f32', gl.NEAREST), Pq: K.double(Q.side, Q.side, 'f32', gl.NEAREST),
        E: K.target(EW, EH),
        b1: K.target(EW >> 1, EH >> 1), b1t: K.target(EW >> 1, EH >> 1),
        b2: K.target(EW >> 2, EH >> 2), b2t: K.target(EW >> 2, EH >> 2),
        b3: K.target(EW >> 3, EH >> 3), b3t: K.target(EW >> 3, EH >> 3),
        bb: K.texture(256, 1, 'h', gl.LINEAR, BB),
        bg: null,
        pg: {},
      };
      for (const k in FS) r.pg[k] = K.program(FS[k]);
      r.pg.spark = K.program(FS_SPARK, VS_SPARK);
      K.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
      return r;
    }
    R = initGL(cfg.q);

    /* décor */
    let deco = null;
    function paint() {
      const v = view();
      const L = layer(R.cw, R.ch);
      L.g.scale(R.cw / W, R.ch / H);
      const opt = cfg.scene === 'faraday' && E[0] ? { x: E[0].x, r: E[0].r } : null;
      deco = PAINT[sceneBg()](L.g, W, H, v, opt);
      const gl = R.gl;
      if (!R.bg) {
        R.bg = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, R.bg);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      gl.bindTexture(gl.TEXTURE_2D, R.bg);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, L.c);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }
    const sceneBg = () => ({ cheminee: 'cheminee', camp: 'nuit', faraday: 'table', tests: 'labo', apesanteur: 'station' }[cfg.scene] || 'cheminee');
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };

    /* ───────── les éléments qui brûlent ───────── */
    let E = [], uid = 0, VT = 0, lastAdd = 0;
    function mk(o) { return Object.assign({ id: ++uid, mass: 1, char: 0, wet: 0, lit: true, glow: 0, boost: 0, age: 0, salt: null, saltT: 0, seed: Math.random(), flame: 0, sag: 0 }, o); }
    function addLog(sp, x, y, len, ang, o) {
      if (E.length >= 16) return null;
      const e = mk(Object.assign({ kind: 'log', sp, x, y, len, ang, r: len * 0.12, char: 0.05 }, o || {}));
      E.push(e); return e;
    }
    function addCandle(x, bottom, hgt, r) {
      if (E.length >= 16) return null;
      const e = mk({ kind: 'bougie', sp: 'bougie', x, y: bottom, hgt, r, glow: 1 });
      E.push(e); return e;
    }
    function addBunsen(x, bottom, hgt, r, salt) {
      if (E.length >= 16) return null;
      const e = mk({ kind: 'bunsen', sp: 'bunsen', x, y: bottom, hgt, r, glow: 1, salt: salt || null, saltT: salt ? 1e9 : 0 });
      E.push(e); return e;
    }
    function geom(e) {
      if (e.kind === 'log') {
        const L = e.len * (0.7 + 0.3 * e.mass), r = e.r * (0.45 + 0.55 * Math.sqrt(Math.max(0, e.mass)));
        const c = Math.cos(e.ang), s = Math.sin(e.ang);
        return { ax: e.x - (c * L) / 2, ay: e.y - (s * L) / 2, bx: e.x + (c * L) / 2, by: e.y + (s * L) / 2, r };
      }
      if (e.kind === 'bougie') {
        const top = e.y - e.hgt * (0.25 + 0.75 * e.mass);
        return { ax: e.x, ay: top - e.r * 0.55, bx: e.x, by: e.y, r: e.r };
      }
      return { ax: e.x, ay: e.y - e.hgt, bx: e.x, by: e.y, r: e.r };
    }
    function hit(e, x, y) {
      const g = geom(e);
      if (e.kind === 'log') {
        const abx = g.bx - g.ax, aby = g.by - g.ay, L2 = abx * abx + aby * aby || 1;
        const h = clamp(((x - g.ax) * abx + (y - g.ay) * aby) / L2, 0, 1);
        return Math.hypot(x - (g.ax + abx * h), y - (g.ay + aby * h)) < g.r + 14;
      }
      const top = e.kind === 'bougie' ? g.ay - e.r * 3 : g.ay - e.r * 2;
      return Math.abs(x - e.x) < e.r * (e.kind === 'bunsen' ? 3.4 : 1.6) + 10 && y > top && y < e.y + 8;
    }

    /* ───────── scènes ───────── */
    function setScene(id) {
      cfg.scene = id;
      E = []; VT = 0; lastAdd = 0;
      clearFields();
      const v = view(), cx = v.cx;
      Object.assign(cfg, { g: 1, wind: 0, o2: 21, turb: 0.45, valve: 1, auto: id === 'cheminee' || id === 'camp' });
      if (id === 'cheminee') {
        const floor = H * 0.8, L = Math.min(v.w * 0.3, H * 0.5), r = L * 0.12;
        addLog('chene', cx - L * 0.3, floor - r * 1.05, L, 0.05);
        addLog('chene', cx + L * 0.32, floor - r * 1.05, L * 0.95, -0.06);
        addLog('bouleau', cx + L * 0.02, floor - r * 2.75, L * 1.05, -0.1);
      } else if (id === 'camp') {
        const ground = H * 0.8, L = Math.min(v.w * 0.32, H * 0.46), apex = { x: cx, y: ground - L * 0.82 };
        const sp = ['pin', 'bouleau', 'pin', 'pin', 'bouleau'];
        [-2, 2, -1, 1, 0].forEach((k, i) => {
          const bx = cx + k * L * 0.22, by = ground - L * 0.04;
          const ax = apex.x + k * L * 0.03 + rnd(4, -4), ay = apex.y + rnd(6, -6);
          addLog(sp[i], (ax + bx) / 2, (ay + by) / 2, Math.hypot(bx - ax, by - ay), Math.atan2(by - ay, bx - ax), { r: L * 0.085 });
        });
      } else if (id === 'faraday') {
        const r = clamp(H * 0.035, 9, 30);
        addCandle(cx, H * 0.8 - r * 1.1, H * 0.34, r);
        cfg.turb = 0.04;
      } else if (id === 'tests') {
        const n = v.w < 520 ? 3 : 5, sp = Math.min(v.w / (n + 0.4), H * 0.36), r = clamp(H * 0.014, 5, 12);
        const salts = n === 3 ? ['na', 'sr', 'cu'] : ['na', 'sr', 'cu', 'k', 'li'];
        for (let i = 0; i < n; i++) addBunsen(cx + (i - (n - 1) / 2) * sp, H * 0.84, H * 0.3, r, salts[i]);
        cfg.turb = 0.1;
      } else if (id === 'apesanteur') {
        const r = clamp(H * 0.035, 9, 30);
        addCandle(cx, H * 0.78, H * 0.3, r);
        cfg.g = 0; cfg.turb = 0;
      }
      paint();
    }
    function clearFields() {
      if (!R) return;
      for (const t of [R.vel.r, R.vel.w, R.prs.r, R.prs.w, R.S.r, R.S.w, R.C.r, R.C.w, R.P.r, R.P.w, R.Pq.r, R.Pq.w]) R.K.clear(t);
    }

    /* ───────── évènements, sons ───────── */
    let burst = null, roar = null, crackT = 0, label = null, drag = null, ptr = null, water = null, saltSplat = null, lastWhoosh = 0;
    function addBurst(x, y, n, speed) {
      const NP = R.Q.side * R.Q.side;
      burst = { x, y, p: Math.min(0.5, (n * (cfg.sparks ? 1 : 0)) / NP), s: speed * kS };
    }
    if (snd()) {
      const c = au.ensure();
      if (c) {
        const s = c.createBufferSource(); s.buffer = au.noiseBuf(); s.loop = true;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 0.6;
        const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 900;
        const gg = c.createGain(); gg.gain.value = 0.0001;
        s.connect(lp); lp.connect(lp2); lp2.connect(gg); gg.connect(au.master); s.start();
        roar = { s, lp, gg };
      }
    }
    function feed() {
      if (E.length >= 16) return;
      lastAdd = VT;
      const v = view(), floor = deco ? deco.floor : H * 0.8, L = Math.min(v.w * 0.28, H * 0.45);
      const sp = cfg.scene === 'camp' ? (Math.random() < 0.6 ? 'pin' : 'bouleau') : ['chene', 'chene', 'bouleau', 'pin'][rint(4)];
      const top = E.reduce((s, e) => (e.kind === 'log' ? Math.min(s, e.y - e.r) : s), floor);
      const e = addLog(sp, v.cx + rnd(L * 0.25, -L * 0.25), Math.max(floor - L * 0.3, top - L * 0.06), L * rnd(1.05, 0.85), rnd(0.18, -0.18), { wet: rnd(0.22, 0.02), lit: false, char: 0 });
      if (e) {
        addBurst(e.x, e.y + e.r, 220, 230);
        if (snd()) { au.note(68, 0.4, 'sine', 0.22, 40); au.noise(0.3, 0.16, 420, 0.9, 'lowpass', 90); }
      }
    }
    function crackle(gain, f, d) {
      if (!snd()) return;
      const c = au.ctx, t = c.currentTime + Math.random() * 0.02;
      const s = c.createBufferSource(); s.buffer = au.noiseBuf();
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.1;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.0015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(bp); bp.connect(g); g.connect(au.master);
      s.start(t, Math.random() * 1.5); s.stop(t + d + 0.03);
    }
    function pop(e) {
      const g = geom(e), h = Math.random();
      addBurst(g.ax + (g.bx - g.ax) * h, g.ay + (g.by - g.ay) * h - g.r * 0.6, 40 + rint(60), 140);
      if (snd()) { crackle(0.32, 900 + Math.random() * 700, 0.05); crackle(0.14, 2500, 0.03); }
    }

    /* ───────── mise à jour des éléments (CPU) ───────── */
    const o2f = () => clamp((cfg.o2 - 13) / 8, 0, 2.2); // 21 % → 1 ; sous 15 % la plupart des flammes meurent
    function updateElems(dt) {
      VT += dt;
      const ox = o2f();
      let crack = 0;
      for (let i = E.length - 1; i >= 0; i--) {
        const e = E[i], S = ESS[e.sp];
        e.age += dt; e.boost *= Math.exp(-dt * 0.9);
        if (e.saltT > 0 && e.saltT < 1e8) { e.saltT -= dt; if (e.saltT <= 0) e.salt = null; }
        if (e.kind === 'log') {
          e.wet = Math.max(0, e.wet - dt * S.dry * (0.15 + e.glow * 1.6));
          if (e.lit && e.wet > 0.85) { e.lit = false; if (snd()) au.noise(0.9, 0.1, 5000, 0.7, 'highpass'); }
          if (!e.lit && e.wet < 0.4 && ox > 0.25 && (e.glow > 0.3 || E.some((o) => o !== e && o.lit && o.flame > 0.3 && Math.hypot(o.x - e.x, o.y - e.y) < (o.r + e.r) * 3.2)) && Math.random() < dt * 0.6) e.lit = true;
          const eff = clamp(1 - e.wet * (1.15 - S.wetRes), 0.05, 1);
          const ramp = smooth(0, 2.5, e.age);
          e.flame = e.lit ? eff * smooth(0.03, 0.35, e.mass) * Math.min(1.2, ox) * ramp * (1 + e.boost * 0.7) : Math.max(0, e.flame - dt);
          const tgt = e.lit ? clamp(0.25 + 0.75 * e.char, 0, 1) * (0.35 + 0.65 * Math.min(1.3, ox)) * (1 + e.boost * 0.5) : 0;
          e.glow += (tgt - e.glow) * (1 - Math.exp(-dt * (tgt > e.glow ? 0.5 : 0.08 * (1 + e.wet * 8))));
          const burn = e.lit ? (e.flame * 0.8 + e.glow * 0.45) : e.glow * 0.05;
          e.mass -= (dt * burn) / S.life;
          e.char = Math.min(1, e.char + dt * burn * 0.045);
          // effondrements : la bûche s'affaisse dans une gerbe d'étincelles
          for (const th of [0.55, 0.3]) if (e.sag < (th === 0.55 ? 1 : 2) && e.mass < th) {
            e.sag++;
            e.y = Math.min(e.y + e.r * 0.45, (deco ? deco.floor : H * 0.8) - e.r * 0.5); e.ang *= 0.55;
            const g = geom(e);
            addBurst((g.ax + g.bx) / 2, (g.ay + g.by) / 2 - g.r, 160, 200);
            if (snd()) { au.noise(0.35, 0.12, 500, 0.8, 'lowpass', 120); for (let k = 0; k < 6; k++) crackle(0.18, 1500 + Math.random() * 3000, 0.02); }
          }
          if (e.lit && Math.random() < S.pop * e.glow * dt * (1 + e.boost * 2)) pop(e);
          crack += S.crackle * e.glow * (e.lit ? 1 : 0.2) * (1 + e.boost);
          if (e.mass <= 0.015) { E.splice(i, 1); continue; }
        } else if (e.kind === 'bougie') {
          if (e.wet > 0.6) e.lit = false;
          e.wet = Math.max(0, e.wet - dt * 0.05);
          e.flame = e.lit ? Math.min(1, ox) * smooth(0, 1.5, e.age) : 0;
          e.glow += ((e.lit ? 1 : 0) - e.glow) * (1 - Math.exp(-dt * 2));
          e.mass = Math.max(0.02, e.mass - (dt * e.flame) / 1500);
        } else {
          e.flame = Math.min(1.2, ox + 0.2);
          e.glow = 1;
          e.wet = 0;
        }
      }
      // le feu s'entretient tout seul : quelqu'un remet une bûche
      if (cfg.auto && (cfg.scene === 'cheminee' || cfg.scene === 'camp')) {
        const m = E.reduce((s, e) => s + (e.kind === 'log' ? e.mass : 0), 0);
        if (m < 1.5 && VT - lastAdd > 9) feed();
      }
      // crépitements : un processus de Poisson, plafonné
      crackT += crack * dt * 5;
      let nC = 0;
      while (crackT > 1 && nC < 4) { crackT -= Math.random() * 2; nC++; if (snd()) crackle(0.05 + Math.random() * 0.14, 1800 + Math.random() * 4200, 0.006 + Math.random() * 0.025); }
      if (crackT > 3) crackT = 3;
    }

    /* ───────── uniformes partagés ───────── */
    const uEA = new Float32Array(64), uEB = new Float32Array(64), uEG = new Float32Array(64), uEI = new Float32Array(64), uEC = new Float32Array(64), uEJ = new Float32Array(64), uEK = new Float32Array(64), uL = new Float32Array(64);
    function pack() {
      uEA.fill(0); uEB.fill(0); uEG.fill(0); uEI.fill(0); uEC.fill(0); uEJ.fill(0); uEK.fill(0); uL.fill(0);
      E.forEach((e, i) => {
        const g = geom(e), o = i * 4, S = ESS[e.sp];
        uEA[o] = g.ax; uEA[o + 1] = g.ay; uEA[o + 2] = g.bx; uEA[o + 3] = g.by;
        const salt = e.salt ? SELS[e.salt] : null, sk = salt ? (e.saltT > 1e8 ? 1 : Math.min(1, e.saltT / 4)) : 0;
        let fuel = 0, pilot = 0, pm = 0, smoke = 0, steam = 0, jet = 0, spark = 0, sv = 1, light = 0;
        const fl = (0.5 + 0.5 * n1(VT * 7 + e.seed * 40)) * (0.75 + 0.25 * n1(VT * 2.3 + e.seed * 9));
        if (e.kind === 'log') {
          fuel = 4.4 * S.flame * e.flame; pilot = e.lit ? 0.62 * Math.min(1, e.flame + 0.25) : 0;
          smoke = e.wet * (e.glow + e.flame) * 1.5 + (!e.lit ? e.glow * 0.9 : 0);
          steam = e.wet * (e.glow * 1.2 + e.flame) * 1.6;
          spark = S.spark * e.glow * (1 + e.boost * 3) * (e.lit ? 1 : 0.1);
          light = (e.flame * 0.055 * S.flame + e.glow * 0.018) * fl;
          uL[o] = (g.ax + g.bx) / 2; uL[o + 1] = Math.min(g.ay, g.by) - g.r * 2.2;
        } else if (e.kind === 'bougie') {
          fuel = 4.2 * e.flame; pilot = e.lit ? 0.85 : 0; pm = 0.03; jet = e.flame * 7 * (R.GVH / 100) * clamp(cfg.g, 0, 1);
          light = e.flame * 0.035 * fl;
          uL[o] = g.ax; uL[o + 1] = g.ay - e.r * 2.5;
        } else {
          fuel = 4 * e.flame; pilot = 0.8; pm = cfg.valve; jet = (14 + 30 * cfg.valve) * (R.GVH / 100);
          light = (0.018 + 0.03 * (1 - cfg.valve)) * fl;
          uL[o] = g.ax; uL[o + 1] = g.ay - e.r * 4; sv = 0.5;
        }
        uEB[o] = g.r; uEB[o + 1] = S.code; uEB[o + 2] = e.flame; uEB[o + 3] = pm;
        uEG[o] = e.char; uEG[o + 1] = e.glow; uEG[o + 2] = e.wet; uEG[o + 3] = e.seed;
        uEI[o] = fuel; uEI[o + 1] = pilot; uEI[o + 2] = smoke; uEI[o + 3] = e.seed;
        if (salt) { uEC[o] = salt.col[0] * sk; uEC[o + 1] = salt.col[1] * sk; uEC[o + 2] = salt.col[2] * sk; }
        uEC[o + 3] = steam;
        uEJ[o + 3] = jet;
        uEK[o] = spark; uEK[o + 1] = sv * kS;
        uL[o + 2] = light;
      });
    }

    /* ───────── un pas de simulation (GPU) ───────── */
    function step(dt) {
      const { K, pg, GVW, GVH, GSW, GSH } = R;
      const vt = [1 / GVW, 1 / GVH], st = [1 / GSW, 1 / GSH];
      const g = cfg.g, vent = VENT(), ox = o2f();
      pg.curl.use().t('uVel', R.vel.r).f('uVt', vt[0], vt[1]);
      K.run(pg.curl, R.curl);
      const P = ptr && ptr.life > 0 ? ptr : null;
      pg.force.use().t('uVel', R.vel.r).t('uCurl', R.curl).t('uS', R.S.r)
        .f('uVt', vt[0], vt[1]).f('uRes', W, H).f('uCell', GVW / W, GVH / H)
        .f('uDt', dt).f('uBuoy', g * 1.2 * GVH).f('uWeight', g * 0.05 * GVH).f('uVort', 3 + 14 * cfg.turb).f('uTurb', cfg.turb * 0.14 * GVH).f('uTime', VT)
        .f('uDrag', Math.exp(-dt * 0.35)).f('uWind', cfg.wind * 0.6 * GVW, 0)
        .f('uPtr', P ? P.x : 0, P ? P.y : 0, P ? P.vx : 0, P ? P.vy : 0).f('uPtrR', P ? 70 * kS : 0)
        .i('uN', E.length).v4('uEA', uEA).v4('uEB', uEB).v4('uEJ', uEJ);
      K.run(pg.force, R.vel.w); R.vel.swap();
      if (P) { P.life -= 1; P.vx *= 0.6; P.vy *= 0.6; }
      pg.div.use().t('uVel', R.vel.r).f('uVt', vt[0], vt[1]);
      K.run(pg.div, R.div);
      for (let i = 0; i < R.Q.jac; i++) {
        pg.jacobi.use().t('uP', R.prs.r).t('uDiv', R.div).f('uVt', vt[0], vt[1]);
        K.run(pg.jacobi, R.prs.w); R.prs.swap();
      }
      pg.grad.use().t('uP', R.prs.r).t('uVel', R.vel.r).f('uVt', vt[0], vt[1]);
      K.run(pg.grad, R.vel.w); R.vel.swap();
      const kv = Math.exp(-dt * 0.1);
      pg.advect.use().t('uVel', R.vel.r).t('uSrc', R.vel.r).f('uVt', vt[0], vt[1]).f('uDt', dt).f('uKeep', kv, kv, 1, 1);
      K.run(pg.advect, R.vel.w); R.vel.swap();
      // combustible, chaleur, suie, vapeur, sels
      const sp = water ? { x: water.x, y: water.y, r: 46 * kS, m: 1 } : saltSplat ? { x: saltSplat.x, y: saltSplat.y, r: 30 * kS, m: 2 } : null;
      const sc = saltSplat ? SELS[saltSplat.k].col : [0, 0, 0];
      pg.inject.use().t('uS', R.S.r).t('uC', R.C.r).f('uRes', W, H).f('uDt', dt).f('uTime', VT)
        .i('uN', E.length).v4('uEA', uEA).v4('uEB', uEB).v4('uEI', uEI).v4('uEC', uEC)
        .f('uSplat', sp ? sp.x : 0, sp ? sp.y : 0, sp ? sp.r : 1, sp ? sp.m : 0).f('uSplatCol', sc[0], sc[1], sc[2]);
      K.run(pg.inject, R.S.w, R.C.w); R.S.swap(); R.C.swap();
      saltSplat = null;
      pg.react.use().t('uS', R.S.r).t('uC', R.C.r).f('uSt', st[0], st[1]).f('uDt', dt)
        .f('uO2', ox).f('uIgn', 0.3).f('uBurn', BURN).f('uHeat', 1.55).f('uSoot', 1.1 * (0.02 + 0.98 * clamp(g, 0, 1))).f('uRad', 0.5).f('uConv', 0.36 * (0.25 + 0.75 * clamp(g, 0, 1))).f('uVent', vent)
        .f('uDiff', 1.5 + 5 * (1 - clamp(g, 0, 1)), 2 + 22 * (1 - clamp(g, 0, 1)), 0.8, 1.2);
      K.run(pg.react, R.S.w, R.C.w); R.S.swap(); R.C.swap();
      const ks = Math.exp(-dt * (cfg.smoke ? 0.45 : 2.5));
      pg.advect2.use().t('uVel', R.vel.r).t('uS', R.S.r).t('uC', R.C.r).f('uVt', vt[0], vt[1]).f('uDt', dt)
        .f('uKeepS', Math.exp(-dt * 0.12), Math.exp(-dt * 0.5), ks, Math.exp(-dt * 0.7)).f('uKeepC', Math.exp(-dt * 0.45), Math.exp(-dt * 0.45), Math.exp(-dt * 0.45), 1).f('uTop', Math.exp(-dt * 3));
      K.run(pg.advect2, R.S.w, R.C.w); R.S.swap(); R.C.swap();
      // étincelles
      const NP = R.Q.side * R.Q.side;
      pg.part.use().t('uP', R.P.r).t('uQ', R.Pq.r).t('uVel', R.vel.r).f('uRes', W, H).f('uCell', GVW / W, GVH / H)
        .f('uDt', dt).f('uTime', VT % 1000).f('uG', clamp(g, 0, 2) * kS).f('uSpawnK', cfg.sparks ? (40 * Math.max(1, E.length)) / NP * kS : 0)
        .i('uN', E.length).v4('uEA', uEA).v4('uEB', uEB).v4('uEK', uEK)
        .f('uBurst', burst ? burst.x : 0, burst ? burst.y : 0, burst ? burst.p : 0, burst ? burst.s : 0);
      K.run(pg.part, R.P.w, R.Pq.w); R.P.swap(); R.Pq.swap();
      burst = null;
    }

    /* ───────── rendu ───────── */
    function render() {
      const { K, gl, pg } = R;
      const ox = o2f(), vent = VENT();
      pg.emit.use().t('uS', R.S.r).t('uC', R.C.r).t('uBB', R.bb).f('uRes', W, H).f('uSt', 1 / R.GSW, 1 / R.GSH).f('uTime', VT)
        .f('uO2', ox).f('uIgn', 0.3).f('uBurn', BURN).f('uVent', vent).f('uFlame', 1).f('uSalt', 3.5).f('uBlue0', 0.06 + 0.5 * (1 - clamp(cfg.g, 0, 1))).f('uWob', 0.4 + 2 * cfg.turb).f('uDecor', env.decor === false ? 0 : 1)
        .i('uN', E.length).v4('uEA', uEA).v4('uEB', uEB).v4('uEG', uEG);
      K.run(pg.emit, R.E);
      if (cfg.sparks) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        pg.spark.use().t('uP', R.P.r).t('uQ', R.Pq.r).t('uBB', R.bb).f('uRes', W, H).i('uSide', R.Q.side).f('uStreak', 0.03).f('uGain', 1.8).f('uInk', 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, R.E.fb); gl.viewport(0, 0, R.E.w, R.E.h);
        gl.bindVertexArray(K.emptyVao);
        gl.drawArrays(gl.LINES, 0, R.Q.side * R.Q.side * 2);
        gl.disable(gl.BLEND);
      }
      const blur = (src, tmp, dst) => {
        pg.blur.use().t('uT', src).f('uDir', 1.5 / src.w, 0); K.run(pg.blur, tmp);
        pg.blur.use().t('uT', tmp).f('uDir', 0, 1.5 / tmp.h); K.run(pg.blur, dst);
      };
      blur(R.E, R.b1t, R.b1); blur(R.b1, R.b2t, R.b2); blur(R.b2, R.b3t, R.b3);
      const d = deco || { amb: 0.05, ambCol: [1, 1, 1], sky: -1 };
      const bare = env.decor === false, ink = bare && env.theme === 'light';
      pg.comp.use().t('uBg', R.bg).t('uS', R.S.r).t('uE', R.E).t('uB1', R.b1).t('uB2', R.b2).t('uB3', R.b3)
        .f('uRes', W, H).f('uTime', VT).f('uAmb', d.amb).f('uAmbCol', d.ambCol[0], d.ambCol[1], d.ambCol[2]).f('uSky', d.sky)
        .f('uBloom', cfg.glow).f('uSmoke', cfg.smoke ? 0.65 : 0).f('uExpo', 1.35).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uPaper', ink ? 0.88 : 0, ink ? 0.84 : 0, ink ? 0.73 : 0)
        .i('uN', E.length).v4('uEA', uEA).v4('uEB', uEB).v4('uEG', uEG).v4('uL', uL);
      K.run(pg.comp, null);
      if (cfg.sparks) {
        // second tracé des étincelles, net, en pleine résolution (le premier nourrit le halo)
        gl.enable(gl.BLEND);
        if (ink) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.ONE, gl.ONE);
        pg.spark.use().t('uP', R.P.r).t('uQ', R.Pq.r).t('uBB', R.bb).f('uRes', W, H).i('uSide', R.Q.side).f('uStreak', 0.025).f('uGain', 1.1).f('uInk', ink ? 1 : 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, R.cw, R.ch);
        gl.bindVertexArray(K.emptyVao);
        gl.drawArrays(gl.LINES, 0, R.Q.side * R.Q.side * 2);
        gl.disable(gl.BLEND);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(K.canvas, 0, 0, W, H);
      ctx.restore();
      drawLabel();
    }

    /* ───────── identification et mesure ───────── */
    function measure(x, y) {
      try {
        const u = x / W, v = 1 - y / H;
        const s = R.K.read(R.S.r, u * R.GSW, v * R.GSH), c = R.K.read(R.C.r, u * R.GSW, v * R.GSH);
        return { T: s[0], F: s[1], soot: s[2], steam: s[3], c, ok: true };
      } catch (e) { return { ok: false }; }
    }
    function zone(m) {
      const C = TK(m.T) - 273;
      const pm = m.F > 1e-3 ? m.c[3] / m.F : 0, saltI = m.c[0] + m.c[1] + m.c[2];
      if (m.steam > 0.35 && C < 300) return 'vapeur d’eau · panache blanc';
      if (saltI > 0.05 && C > 500) {
        let best = null, bd = 1e9;
        for (const k in SELS) {
          const s = SELS[k], t = s.col[0] + s.col[1] + s.col[2];
          const d = Math.hypot(s.col[0] / t - m.c[0] / saltI, s.col[1] / t - m.c[1] / saltI, s.col[2] / t - m.c[2] / saltI);
          if (d < bd) { bd = d; best = s; }
        }
        return 'raies du ' + best.nom + ' · ' + best.raie;
      }
      if (C > 600 && m.F > 0.02 && pm > 0.4) return 'cône bleu · radicaux CH* et C₂*';
      if (C > 800 && m.soot > 0.25) return 'zone éclairante · suie incandescente';
      if (C > 600 && m.F > 0.05) return 'base de la flamme · gaz en combustion';
      if (C > 525) return 'gaz chauds · au-delà du point de Draper';
      if (m.soot > 0.6) return 'fumée · suie refroidie';
      if (C > 90) return 'air chaud · invisible, il ondule';
      return 'air ambiant';
    }
    function roleOf(e) {
      if (e.kind === 'log') {
        const st = !e.lit ? (e.glow > 0.08 ? 'éteinte, fume' : e.wet > 0.3 ? 'mouillée, attend' : 'pas encore prise') : e.mass < 0.25 ? 'lit de braises' : e.flame > 0.4 ? 'brûle' : 'couve';
        return ESS[e.sp].fr + ' · ' + st + ' · ' + Math.round((1 - e.mass) * 100) + ' % consumée' + (e.glow > 0.1 ? ' · braises ≈ ' + Math.round((525 + 380 * e.glow) / 10) * 10 + ' °C' : '') + (e.wet > 0.05 ? ' · humidité ' + Math.round(e.wet * 60) + ' %' : '') + (e.salt ? ' · ' + SELS[e.salt].nom : '');
      }
      if (e.kind === 'bougie') return 'bougie · ' + (e.lit ? (cfg.g < 0.15 ? 'flamme sphérique, sans convection' : 'flamme de diffusion ≈ 1 400 °C') : 'éteinte');
      return 'bec Bunsen · ' + (cfg.valve > 0.6 ? 'virole ouverte, flamme bleue' : cfg.valve > 0.25 ? 'virole entrouverte' : 'virole fermée, flamme jaune') + (e.salt ? ' · ' + SELS[e.salt].sym + ' : ' + SELS[e.salt].raie : '');
    }
    function drawLabel() {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (6 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      let x = label.x, y = label.y, name, role, col;
      if (label.e) {
        const e = label.e;
        if (!E.includes(e)) { label = null; return; }
        const g = geom(e);
        x = (g.ax + g.bx) / 2; y = e.kind === 'log' ? (g.ay + g.by) / 2 : g.ay + e.r * 2;
        name = ESS[e.sp].nom; role = roleOf(e); col = ESS[e.sp].col;
      } else {
        const m = label.m;
        if (!m || !m.ok) { name = 'Mesure indisponible'; role = 'ce navigateur ne lit pas les textures flottantes'; col = '#ffb070'; }
        else {
          const C = TK(m.T) - 273;
          name = (C < 40 ? '≈ ' + Math.round(C) : '≈ ' + (Math.round(C / 10) * 10).toLocaleString('fr-FR')) + ' °C';
          role = zone(m); col = C > 525 ? '#ffb070' : '#c9c3d8';
        }
      }
      const side = x > W * 0.62 ? -1 : 1, lx = x + side * 46, ly = y - 40;
      const paper = env.decor === false && env.theme === 'light';
      if (paper) col = label.e ? '#8a4a12' : col === '#ffb070' ? '#b4500e' : '#5d556b';
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + side * 9, y - 8); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
      ctx.shadowColor = paper ? 'rgba(250,246,238,.9)' : 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
      ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = paper ? 'rgba(30,24,40,.94)' : 'rgba(250,248,240,.96)';
      ctx.font = (label.e ? 'italic ' : '') + '500 14px "Space Grotesk", sans-serif';
      ctx.fillText(name, lx, ly);
      ctx.fillStyle = col;
      ctx.font = '500 9.5px "JetBrains Mono", monospace';
      ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    /* ───────── boucle ───────── */
    let pending = false, rTimer = 0;
    function frame(t, dt) {
      if (lost) { tryRestore(); return; }
      if (dt > 0) {
        let left = Math.min(dt, 0.07);
        while (left > 1e-4) {
          const h = Math.min(left, 0.035);
          updateElems(h); pack(); step(h);
          left -= h;
        }
        if (water) {
          for (const e of E) if (hit(e, water.x, water.y + 20)) { e.wet = Math.min(1, e.wet + dt * 1.4); e.glow *= Math.exp(-dt * 1.2); }
        }
        if (label) {
          label.t += dt;
          if (!label.e && (rTimer += dt) > 0.3) { rTimer = 0; label.m = measure(label.x, label.y); }
        }
        // grondement : un bruit sourd qui suit la puissance du feu
        if (roar) {
          let pw = 0; for (const e of E) pw += e.flame * (e.kind === 'log' ? 1 : e.kind === 'bunsen' ? 0.5 : 0.08) + e.glow * 0.15;
          const c = au.ctx.currentTime;
          roar.gg.gain.setTargetAtTime(clamp(pw * 0.045, 0, 0.16), c, 0.25);
          roar.lp.frequency.setTargetAtTime(160 + pw * 70 + E.reduce((s, e) => s + e.boost, 0) * 300, c, 0.2);
        }
      } else pack();
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; if (!lost) render(); }); }
    }
    function tryRestore() {
      if (R.K.gl.isContextLost()) return;
      try { R = initGL(cfg.q); lost = false; paint(); } catch (e) { /* rien */ }
    }
    function setQuality(q) {
      if (q === cfg.q) return;
      try { const old = R; R = initGL(q); cfg.q = q; old.K.lose(); paint(); } catch (e) { console.warn(e); }
    }

    // crochet de diagnostic (tests automatisés) : inactif sauf si la page définit window.FASC_DEBUG
    if (window.FASC_DEBUG) window.FASC_DEBUG.feu = { get R() { return R; }, cfg, get E() { return E; }, setScene, measure: (x, y) => measure(x, y), run(n, h) { for (let i = 0; i < n; i++) { updateElems(h); pack(); step(h); } render(); }, stats() {
      const t = R.S.r, out = new Float32Array(t.w * t.h * 4);
      R.gl.bindFramebuffer(R.gl.FRAMEBUFFER, t.fb); R.gl.readPixels(0, 0, t.w, t.h, R.gl.RGBA, R.gl.FLOAT, out);
      const mx = [0, 0, 0, 0], hot = { n: 0, ymin: 1 };
      for (let i = 0; i < out.length; i += 4) { for (let k = 0; k < 4; k++) mx[k] = Math.max(mx[k], out[i + k]); if (out[i] > 0.5) { hot.n++; hot.ymin = Math.min(hot.ymin, 1 - Math.floor(i / 4 / t.w) / t.h); } }
      return { max: mx.map((v) => +v.toFixed(3)), hotCells: hot.n, hotTop: +(hot.ymin).toFixed(3), grid: [t.w, t.h] };
    } };
    setScene('cheminee');
    // préchauffage : quelques secondes de simulation pour que le feu soit déjà pris
    for (let i = 0; i < 70; i++) { updateElems(1 / 30); pack(); step(1 / 30); }
    burst = null;

    function nearest(x, y) { for (let i = E.length - 1; i >= 0; i--) if (hit(E[i], x, y)) return E[i]; return null; }

    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool;
        if (tool === 'observer') {
          const e = nearest(p.x, p.y);
          label = e ? { e, t: 0 } : { x: p.x, y: p.y, t: 0, m: measure(p.x, p.y) };
          rTimer = 0;
          if (snd()) au.note(1300, 0.08, 'sine', 0.03);
        } else if (tool === 'poser') {
          const e = nearest(p.x, p.y);
          if (e) { drag = { e, dx: e.x - p.x, dy: e.y - p.y }; return; }
          const v = view(), L = Math.min(v.w * 0.28, H * 0.45);
          let n = null;
          if (cfg.put === 'bougie') { const r = clamp(H * 0.03, 8, 26); n = addCandle(p.x, p.y + H * 0.13, H * 0.26, r); }
          else if (cfg.put === 'bunsen') { const r = clamp(H * 0.014, 5, 12); n = addBunsen(p.x, p.y + H * 0.15, H * 0.3, r); }
          else n = addLog(cfg.put, p.x, p.y, L * rnd(1.05, 0.85), rnd(0.2, -0.2), { glow: 0.5, char: 0.25 });
          if (n) { drag = { e: n, dx: 0, dy: 0 }; label = { e: n, t: 0 }; if (snd()) au.note(90, 0.25, 'sine', 0.12, 50); }
        } else if (tool === 'souffle') {
          ptr = { x: p.x, y: p.y, vx: 0, vy: 0, life: 0 };
        } else if (tool === 'sel') {
          saltSplat = { x: p.x, y: p.y, k: cfg.sel };
          const e = nearest(p.x, p.y + 30) || nearest(p.x, p.y + 80);
          if (e) { e.salt = cfg.sel; e.saltT = e.kind === 'bunsen' && cfg.scene === 'tests' ? 1e9 : 16; }
          if (snd()) for (let k = 0; k < 8; k++) crackle(0.06, 3000 + Math.random() * 3000, 0.01);
        } else if (tool === 'eau') {
          water = { x: p.x, y: p.y };
        }
      },
      move(p) {
        if (!p.down) return;
        if (drag) {
          const e = drag.e;
          e.x = clamp(p.x + drag.dx, 10, W - 10); e.y = clamp(p.y + drag.dy, 20, H - 4);
          return;
        }
        if (env.tool === 'souffle') {
          ptr = { x: p.x, y: p.y, vx: clamp(p.dx * 60, -2500, 2500), vy: clamp(p.dy * 60, -2500, 2500), life: 3 };
          for (const e of E) if (Math.hypot(e.x - p.x, e.y - p.y) < 190 * kS) e.boost = Math.min(1.6, e.boost + 0.07);
          if (snd() && VT - lastWhoosh > 0.25 && Math.hypot(p.dx, p.dy) > 4) { lastWhoosh = VT; au.noise(0.45, 0.06, 700, 0.6, 'bandpass', 300); }
        } else if (env.tool === 'eau') {
          water = { x: p.x, y: p.y };
          if (snd() && Math.random() < 0.12) au.noise(0.5, 0.07, 5000, 0.7, 'highpass');
        } else if (env.tool === 'sel' && Math.random() < 0.3) {
          saltSplat = { x: p.x, y: p.y, k: cfg.sel };
        }
      },
      up() { drag = null; water = null; if (ptr) ptr.life = Math.min(ptr.life, 1); },
      clear() {
        E = []; label = null; clearFields(); cfg.auto = false;
        if (!env.paused) { /* rien de plus */ }
      },
      dispose() {
        if (roar) { try { roar.gg.gain.setTargetAtTime(0.0001, au.ctx.currentTime, 0.1); roar.s.stop(au.ctx.currentTime + 0.5); } catch (e) { /* rien */ } }
        R.K.lose();
      },
      ui() {
        const logs = E.filter((e) => e.kind === 'log');
        let pw = 0; for (const e of E) pw += e.flame * (e.kind === 'log' ? ESS[e.sp].flame * 9 : e.kind === 'bunsen' ? 1.2 : 0.08) + e.glow * (e.kind === 'log' ? 3 : 0);
        const mass = logs.length ? logs.reduce((s, e) => s + e.mass, 0) / logs.length : 0;
        const wet = logs.length ? logs.reduce((s, e) => s + e.wet, 0) / logs.length : 0;
        const nb = (k) => E.filter((e) => e.kind === k).length;
        const L = [{ type: 'section', label: 'Le foyer' }];
        L.push({ type: 'bar', label: 'Puissance dégagée', color: '#ff9c5c', value: clamp(pw / 40, 0, 1), txt: pw < 0.05 ? '—' : '≈ ' + pw.toFixed(pw < 10 ? 1 : 0).replace('.', ',') + ' kW' });
        if (logs.length) {
          L.push({ type: 'bar', label: 'Bois restant', color: '#c98a55', value: mass, txt: Math.round(mass * 100) + ' %' });
          L.push({ type: 'bar', label: 'Humidité du bois', color: '#7fc6ff', value: wet, txt: Math.round(wet * 60) + ' %' });
        }
        const parts = [];
        if (logs.length) parts.push(logs.length + ' bûche' + (logs.length > 1 ? 's' : ''));
        if (nb('bougie')) parts.push(nb('bougie') + ' bougie' + (nb('bougie') > 1 ? 's' : ''));
        if (nb('bunsen')) parts.push(nb('bunsen') + ' bec' + (nb('bunsen') > 1 ? 's' : '') + ' Bunsen');
        L.push({ type: 'note', text: (parts.length ? parts.join(' · ') : 'Foyer vide : posez une bûche, une bougie ou un bec.') + (E.length >= 16 ? ' · foyer plein (16 éléments)' : '') });
        L.push({ type: 'buttons', items: [
          { label: 'Raviver', act: () => { for (const e of E) { e.boost = 1.6; if (e.wet < 0.4) e.lit = true; } if (snd()) au.noise(1.2, 0.1, 500, 0.6, 'bandpass', 1400); } },
          { label: 'Remettre une bûche', act: feed },
          { label: 'Tout arroser', act: () => { for (const e of E) { e.wet = 1; if (e.kind !== 'bunsen') e.lit = false; } water = null; if (snd()) au.noise(1.6, 0.12, 4500, 0.6, 'highpass', 2000); } },
        ] });
        if (cfg.scene === 'cheminee' || cfg.scene === 'camp') L.push({ type: 'toggle', label: 'Le feu s’entretient tout seul', value: cfg.auto, set: (v) => { cfg.auto = v; } });
        L.push({ type: 'section', label: 'Scènes' });
        L.push({ type: 'buttons', items: [
          { label: 'Cheminée', act: () => setScene('cheminee') },
          { label: 'Feu de camp', act: () => setScene('camp') },
          { label: 'Bougie de Faraday', act: () => setScene('faraday') },
          { label: 'Tests de flamme', act: () => setScene('tests') },
          { label: 'Apesanteur', act: () => setScene('apesanteur') },
        ] });
        L.push({ type: 'section', label: 'Poser' });
        L.push({ type: 'choice', label: 'Élément posé par l’outil POSER', value: cfg.put, set: (v) => { cfg.put = v; },
          options: [{ id: 'chene', label: 'Chêne' }, { id: 'pin', label: 'Pin' }, { id: 'bouleau', label: 'Bouleau' }, { id: 'bougie', label: 'Bougie' }, { id: 'bunsen', label: 'Bunsen' }] });
        L.push({ type: 'section', label: 'Sels' });
        L.push({ type: 'choice', label: 'Sel jeté par l’outil SEL', value: cfg.sel, set: (v) => { cfg.sel = v; },
          options: Object.keys(SELS).map((k) => ({ id: k, label: SELS[k].sym + ' · ' + SELS[k].nom })) });
        L.push({ type: 'note', text: SELS[cfg.sel].nom[0].toUpperCase() + SELS[cfg.sel].nom.slice(1) + ' : ' + SELS[cfg.sel].raie + '.' });
        L.push({ type: 'section', label: 'Physique' });
        L.push({ type: 'slider', label: 'Gravité', min: 0, max: 2.5, step: 0.05, value: cfg.g, fmt: (v) => (v < 0.03 ? 'apesanteur' : Math.abs(v - 1) < 0.03 ? '1 g · Terre' : Math.abs(v - 0.17) < 0.03 ? '0,17 g · Lune' : Math.abs(v - 0.38) < 0.03 ? '0,38 g · Mars' : v.toFixed(2).replace('.', ',') + ' g'), set: (v) => { cfg.g = v; } });
        L.push({ type: 'slider', label: 'Oxygène dans l’air', min: 12, max: 35, step: 0.5, value: cfg.o2, fmt: (v) => String(v).replace('.', ',') + ' %' + (Math.abs(v - 21) < 0.3 ? ' · air normal' : v < 15 ? ' · étouffé' : v > 28 ? ' · suroxygéné' : ''), set: (v) => { cfg.o2 = v; } });
        L.push({ type: 'slider', label: 'Vent', min: -1, max: 1, step: 0.02, value: cfg.wind, fmt: (v) => (Math.abs(v) < 0.02 ? 'calme' : (v < 0 ? '← ' : '→ ') + Math.round(Math.abs(v) * 40) + ' km/h'), set: (v) => { cfg.wind = v; } });
        L.push({ type: 'slider', label: 'Turbulence', min: 0, max: 1, step: 0.01, value: cfg.turb, fmt: (v) => (v < 0.05 ? 'laminaire' : Math.round(v * 100) + ' %'), set: (v) => { cfg.turb = v; } });
        if (nb('bunsen')) L.push({ type: 'slider', label: 'Virole des becs Bunsen', min: 0, max: 1, step: 0.01, value: cfg.valve, fmt: (v) => (v < 0.1 ? 'fermée · flamme jaune' : v > 0.9 ? 'ouverte · cône bleu' : Math.round(v * 100) + ' % d’air'), set: (v) => { cfg.valve = v; } });
        L.push({ type: 'section', label: 'Affichage' });
        L.push({ type: 'slider', label: 'Halo lumineux', min: 0, max: 2, step: 0.05, value: cfg.glow, fmt: (v) => Math.round(v * 100) + ' %', set: (v) => { cfg.glow = v; } });
        L.push({ type: 'toggle', label: 'Fumée', value: cfg.smoke, set: (v) => { cfg.smoke = v; } });
        L.push({ type: 'toggle', label: 'Étincelles', value: cfg.sparks, set: (v) => { cfg.sparks = v; } });
        L.push({ type: 'choice', label: 'Qualité du calcul', value: cfg.q, set: setQuality,
          options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        L.push({ type: 'note', text: `Grille ${R.GVW}×${R.GVH} pour le vent, ${R.GSW}×${R.GSH} pour la chaleur · ${(R.Q.side * R.Q.side).toLocaleString('fr-FR')} étincelles possibles.` });
        return L;
      },
    };
  }
})();
