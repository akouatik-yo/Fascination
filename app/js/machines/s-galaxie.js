/* Fascination — La Galaxie · bras spiraux, collisions et trou noir (WebGL2)
   Spirale : ~200 000 étoiles sur des orbites elliptiques dont l'orientation tourne avec le rayon (ondes de densité,
   modèle cinématique de Kalnajs) : les bras naissent de l'embouteillage des orbites et tournent plus lentement
   que les étoiles. Populations : bulbe jaune, disque, jeunes étoiles bleues et nébuleuses roses dans les bras,
   poussière qui absorbe. Collision : problème restreint (Toomre et Toomre, 1972) — deux ou trois noyaux massifs
   intégrés en JS, des dizaines de milliers d'étoiles-tests sur la carte graphique. Trou noir : rayons lumineux
   intégrés dans la métrique de Schwarzschild, disque d'accrétion avec effets Doppler et décalage gravitationnel.
   Rendu (FKR, la cabine commune) : la machine dépose de la LUMIÈRE en HDR linéaire, comme le Feu ; couleurs physiques :
   étoiles en corps noir (Planck × CIE 1931), régions H II en raies de Balmer et [N II] rougies par la poussière,
   poussière qui absorbe plus le bleu que le rouge (loi de Cardelli, Clayton et Mathis 1989 : elle brunit, elle ne noircit pas),
   lumière diffuse des étoiles non résolues en demi-résolution, étoiles résolues en profil de Moffat à flux conservé ;
   puis halo, courbe AgX, grain et vignetage de la cabine (DA de Fausta, famille Cosmos, fond #07050A). */
(function boot() {
  if (!window.FK || !window.FKGL || !window.FKR) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const FKR = window.FKR, COUL = FKR.couleur;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  // ech : fraction de la résolution de la cabine ; side, coll : étoiles (côté de la texture) ; bh : résolution du trou noir ; steps : pas d'intégration
  const QUAL = { legere: { side: 270, coll: 180, ech: 0.6, bh: 0.55, steps: 160 }, normale: { side: 380, coll: 230, ech: 0.8, bh: 0.62, steps: 220 }, haute: { side: 460, coll: 280, ech: 1, bh: 0.7, steps: 300 } };
  // le temps de la spirale : une unité de temps de la simulation, en millions d'années (le Soleil, vers 0,55 du rayon du disque, fait un tour en 230 Ma)
  const A_SOLEIL = 0.55, MA_PAR_T = 230 / (TAU * (A_SOLEIL + 0.07));
  // la collision : unités de Toomre (masse 10¹¹ M☉, longueur 10 kpc) → 47 Ma par unité de temps
  const MA_COLL = 47;
  // extinction relative de la poussière dans les canaux R, G, B de l'écran (≈ 610, 550, 465 nm ; Cardelli, Clayton et Mathis 1989, R_V = 3,1)
  const KEXT = [0.89, 1, 1.23];
  // couleurs (sRGB linéaire) : régions H II = Balmer (cas B) + [N II] + [S II], rougies (Hα/Hβ ≈ 4,5) ; plus pâle : moins rougie
  const H = COUL.MELANGES.hydrogene, rougir = (r) => H.map(([l, w]) => [l, w * Math.pow(l / 656.28, 1.12 * r)]);
  const C_HII = COUL.melange([...rougir(1.5), [658.35, 1], [654.8, 0.34], [671.65, 0.3], [673.08, 0.25]]).rgb;
  const C_HII2 = COUL.melange(rougir(1)).rgb;
  const duree = (ma) => (ma >= 995 ? `${fr(ma / 1000, 1)} MILLIARD${ma >= 1995 ? 'S' : ''} D’ANNÉES` : `${Math.round(ma)} MILLION${Math.round(ma) >= 2 ? 'S' : ''} D’ANNÉES`);

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
  // une direction (point à l'infini) : la translation de la caméra ne compte pas
  const xfd = (m, x, y, z) => { const w = m[3] * x + m[7] * y + m[11] * z; return [(m[0] * x + m[4] * y + m[8] * z) / w, (m[1] * x + m[5] * y + m[9] * z) / w, w]; };
  // hasard reproductible (décor : le même ciel à chaque visite)
  function graine(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ───────── nuanceurs ───────── */
  const COULEUR = FKR.glsl('couleur');
  const HASH = `uint hu(uint x){ x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
float hf(int i, uint s){ return float(hu(uint(i) * 2654435761u + s)) * (1. / 4294967296.); }`;
  // étoiles de la spirale : orbites calculées (pas de simulation). uNet = 0 : lumière diffuse (demi-résolution, rgb = lumière,
  // a = colonne de poussière) ; uNet = 1 : étoiles résolues et nœuds H II (pleine résolution, profil de Moffat à flux conservé)
  const VS_SPI = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uS1, uS2; uniform int uSide, uFirst; uniform float uT, uTwist, uEcc, uPat, uBar, uEll, uPx, uNet, uSensP, uPmin, uPmax, uAlpha;
uniform vec4 uLum; uniform vec3 uHII, uHII2; uniform mat4 uVP;
out vec4 vCol; out float vS, vA;
${COULEUR}
void main(){
  int id = gl_VertexID + uFirst; ivec2 tc = ivec2(id % uSide, id / uSide);
  vec4 A = texelFetch(uS1, tc, 0), B = texelFetch(uS2, tc, 0);
  float a = A.x, M0 = A.y, z = A.z, ty = A.w;
  vec3 p; float crowd = 0., crowdP = 0.;
  if (ty < 3.5 && uEll < .5){
    float bar = uBar * (1. - smoothstep(.12, .3, a));
    float orient = (bar > .01 ? 0. : 1.) * a * uTwist + uPat * uT + B.x * .25 * (1. - uBar);
    float e = clamp(uEcc * smoothstep(.04, .25, a) * (1. - smoothstep(.85, 1.25, a)) + bar * .55, 0., .8);
    float om = 1. / (a + .07);
    float M = M0 + (om - uPat) * uT;
    vec2 q = vec2(a * cos(M), a * (1. - e) * sin(M));
    float c = cos(orient), s = sin(orient);
    p = vec3(c * q.x - s * q.y, z, s * q.x + c * q.y);
    // embouteillage : les étoiles s'attardent près du petit axe de leur ellipse, là où les orbites voisines se pressent ;
    // la poussière (gaz comprimé) est décalée vers l'amont du bras : son bord intérieur
    crowd = pow(.5 + .5 * cos(2. * (M - 1.5708)), 3.) * smoothstep(.1, .3, a);
    crowdP = pow(.5 + .5 * cos(2. * (M - 1.5708 + uSensP * .35)), 3.) * smoothstep(.1, .3, a);
  } else {
    // bulbe et halo (ou galaxie elliptique) : une sphère aplatie qui tourne lentement
    float r = a, th = M0 + uT * .25 / (r + .2), ph = B.x * 3.14159;
    p = vec3(r * sin(ph) * cos(th), r * cos(ph) * (uEll > .5 ? .65 : .55), r * sin(ph) * sin(th));
  }
  // populations : couleur de corps noir (température effective), luminosité de la population
  vec3 col = vec3(0.); float dust = 0., taille = 1.;
  if (ty < .5) col = corpsNoir(4300. + B.y * 1900.) * uLum.x;                                       // disque ancien : G et K
  else if (ty < 1.5) col = corpsNoir(10000. + B.y * 20000.) * uLum.y * (.05 + 2.8 * crowd * crowd);   // jeunes étoiles O et B, nées dans le bras
  else if (ty < 2.5){ col = mix(uHII, uHII2, B.y) * uLum.z * crowd * crowd; taille = 1.4; }           // régions H II
  else if (ty < 3.5){ dust = crowdP * smoothstep(.3, .45, a); taille = 1.8; }                        // poussière
  else col = corpsNoir(3900. + B.y * 1700.) * uLum.w;                                                // bulbe, halo : étoiles anciennes
  col *= uNet > .5 || B.w < .5 ? B.z : 1.;     // les étoiles résolues ne comptent qu'une fois dans la lueur diffuse
  vec4 P = uVP * vec4(p, 1.);
  gl_Position = P;
  if (uNet < .5){
    float s = clamp(uPx * taille * 3. / P.w, uPmin, uPmax);
    gl_PointSize = s; vS = s; vA = 0.;
    vCol = vec4(col, dust * B.z) / (.2244 * s * s);          // flux conservé, quelle que soit la taille du point
  } else {
    // étoile résolue : un point (profil de Moffat, α ≈ 1 px) ; nœud H II : une petite tache, plus grande de près
    float al = ty > 1.5 ? uAlpha * 2.2 * clamp(2. / P.w, .7, 1.6) : uAlpha;
    float s = min(6. * al, 64.);
    gl_PointSize = s; vS = s; vA = al;
    vCol = vec4(col, 0.);
  }
}`;
  // profil gaussien (lumière diffuse) et profil de Moffat à flux conservé (étoiles), avec l'extinction par la poussière
  const FS_DIFF = `#version 300 es
precision highp float; in vec4 vCol; in float vS, vA; out vec4 o;
void main(){ vec2 d = gl_PointCoord - .5; float k = max(0., exp(-dot(d, d) * 14.) - .0302); o = vCol * k; }`;
  const FS_NET = `#version 300 es
precision highp float; precision highp sampler2D;
in vec4 vCol; in float vS, vA; out vec4 o;
uniform sampler2D uL; uniform vec2 uRes; uniform float uDustK; uniform vec3 uKext;
void main(){
  vec2 d = (gl_PointCoord - .5) * vS;
  float a2 = vA * vA, kb = pow(1. + .25 * vS * vS / a2, -3.);
  float k = max(0., pow(1. + dot(d, d) / a2, -3.) - kb) / (1. - kb) * .63662 / a2;   // (β − 1) / (π α²), β = 3
  float tau = max(texture(uL, gl_FragCoord.xy / uRes).a, 0.) * uDustK * .5;          // environ la moitié de la poussière est devant
  o = vec4(vCol.rgb * k * exp(-tau * uKext), 0.);
}`;
  // lumière diffuse floutée → lumière de la cabine, à travers la poussière : un mélange d'étoiles et de poussière (dalle)
  // et un écran ; l'absorption plus forte dans le bleu rougit et brunit ce qui reste
  const FS_COMP = FKR.fs(['couleur'], `
uniform sampler2D uL; uniform float uDustK, uGain; uniform vec3 uKext;
out vec4 o;
void main(){
  vec4 s = texture(uL, vUv);
  vec3 tau = max(vec3(s.a * uDustK) * uKext, vec3(1e-4));
  vec3 tr = mix((1. - exp(-tau)) / tau, exp(-tau), .3);
  o = vec4(max(s.rgb, 0.) * tr * uGain, 0.);
}`);
  const FS_BLUR = FKR.fs([], `uniform sampler2D uT; uniform vec2 uDir; out vec4 o;
void main(){ vec4 s = texture(uT, vUv) * .227; s += (texture(uT, vUv + uDir * 1.385) + texture(uT, vUv - uDir * 1.385)) * .316; s += (texture(uT, vUv + uDir * 3.23) + texture(uT, vUv - uDir * 3.23)) * .07; o = s; }`);
  // collision : étoiles-tests (position, vitesse) mises à jour sur la carte graphique
  const FS_NB = window.FKGL.HEAD + `
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
  // collision : couleurs. Disque bleuté au bord (étoiles jeunes) ; une étoile arrachée à son disque (queue de marée, pont)
  // bleuit ; le gaz arraché et comprimé y allume des nœuds roses de formation d'étoiles
  const VS_NB = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uP, uV, uLut; uniform int uSide, uPas; uniform mat4 uVP; uniform float uPx, uColMode, uNet, uPmin, uPmax, uAlpha;
uniform vec4 uC[4]; uniform vec2 uRd; uniform vec4 uLum; uniform vec3 uHII;
out vec4 vCol; out float vS, vA;
${COULEUR}
${HASH}
void main(){
  int id = gl_VertexID * uPas; ivec2 tc = ivec2(id % uSide, id / uSide);
  vec4 P = texelFetch(uP, tc, 0), V = texelFetch(uV, tc, 0);
  vec4 Q = uVP * vec4(P.xyz, 1.);
  gl_Position = Q;
  float g = P.w, r0 = V.w, h = hf(id, 17u), h2 = hf(id, 91u);
  vec3 c0 = g < .5 ? uC[0].xyz : uC[1].xyz; float rd = g < .5 ? uRd.x : uRd.y;
  float arr = smoothstep(1.35, 2.4, length(P.xyz - c0) / (r0 * rd + .1));   // arrachée à son disque
  vec3 col = g < .5 ? mix(corpsNoir(4700.), corpsNoir(12000.), smoothstep(.2, .95, r0)) : mix(corpsNoir(4200.), corpsNoir(7600.), smoothstep(.2, .95, r0));
  col = mix(col, corpsNoir(15000.), .55 * arr);
  // chaque étoile-test porte la lumière de son anneau d'origine : disque exponentiel (brillant au centre, pâle au bord)
  float lum = (g < .5 ? uLum.x : uLum.y) * (.55 + .9 * h2) * exp(-2. * r0) * 3.;
  bool gaz = h < .035;
  if (gaz) col = uHII * uLum.z * arr;                       // région H II : seulement là où la marée comprime le gaz
  if (uColMode > .5) col = texture(uLut, vec2(.22 + .78 * clamp(length(V.xyz) * .9 - .2, 0., 1.), .5)).rgb * (gaz ? 0. : 1.);
  col *= lum;
  if (uNet < .5){
    float s = clamp(uPx * 3. / Q.w, uPmin, uPmax);
    gl_PointSize = s; vS = s; vA = 0.;
    vCol = vec4(col * (gaz ? .5 : 1.), 0.) / (.2244 * s * s);
  } else {
    float al = gaz ? uAlpha * 2. : uAlpha;
    float s = 6. * al;
    gl_PointSize = s; vS = s; vA = al;
    vCol = vec4(col * (gaz ? 1.6 : .9 * pow(h2, 3.) + .1), 0.);
  }
}`;
  // le trou noir : rayons intégrés dans la métrique de Schwarzschild (rayon de Schwarzschild = 1), en lumière HDR
  const FS_BH = FKR.fs(['couleur', 'bruit'], `
uniform vec2 uRes, uCentre; uniform float uT, uDist, uIncl, uAz, uRin, uRout, uDop, uDisk, uDecor, uSteps, uFov, uTpic, uEclat, uIdisk, uPix;
out vec4 o;
// un champ d'étoiles ponctuelles sur la sphère céleste (grille sur les six faces d'un cube) : les étoiles sont des points,
// que la lentille gravitationnelle étire en arcs
vec3 champ(vec3 d, float n, float dens, float gain){
  vec3 a = abs(d); vec2 uv; float f;
  if (a.x >= a.y && a.x >= a.z){ uv = d.yz / a.x; f = d.x > 0. ? 0. : 1.; }
  else if (a.y >= a.z){ uv = d.xz / a.y; f = d.y > 0. ? 2. : 3.; }
  else { uv = d.xy / a.z; f = d.z > 0. ? 4. : 5.; }
  vec2 g = uv * n, c = floor(g), s0 = c + f * 1013.;
  if (alea(s0) > dens) return vec3(0.);
  vec2 dd = (g - c - .2 - .6 * alea2(s0 + 7.3)) / n;
  float T = 3200. * pow(9., alea(s0 + 3.1)), m = gain * (.03 + 2. * pow(alea(s0 + 9.7), 16.));
  float sig = uPix * .75;
  return corpsNoir(T) * m * exp(-.5 * dot(dd, dd) / (sig * sig)) / (sig * sig * 2.5e5);
}
vec3 ciel(vec3 d){
  if (uDecor < .5) return vec3(0.);
  float b = d.y * .9 + .22 * sin(atan(d.z, d.x) * 2. + .6);
  float bande = exp(-b * b * 14.);
  vec3 c = champ(d, 26., .45, .8) + champ(d, 80., .3, .25) * (1. + 2. * bande);
  // la Voie lactée : une lueur d'étoiles non résolues, rougie et coupée de poussière (sans couture : bruit sur la direction)
  float nu = fbmG(d.xz * 3.1 + d.y * 5., 4), pou = smoothstep(.05, .55, fbmG(d.xz * 6.3 - d.y * 9. + 4., 4)) * exp(-b * b * 60.);
  c += bande * vec3(.0075, .0062, .0052) * (.7 + .6 * nu) * mix(vec3(1.), vec3(.45, .32, .22), pou);
  return c;
}
// texture du disque : anneaux (axisymétriques, sans cisaillement) et grumeaux entraînés à la vitesse képlérienne locale,
// en deux couches fondues l'une dans l'autre pour que l'enroulement reste borné
float grumeaux(vec2 x){ return bruitV(x * 2.3) * .6 + bruitV(x * 5.1 + 3.7) * .4; }
float texDisque(float rr, float ang){
  float om = sqrt(.5 / rr) / rr * 6.;
  float an = .55 + .3 * bruitV(vec2(rr * 4.1, .5)) + .25 * bruitV(vec2(rr * 13.7, 2.5)) - .1;
  float per = 4., p1 = fract(uT / per), p2 = fract(uT / per + .5), w = abs(1. - 2. * p1);
  float a1 = ang - om * per * p1, a2 = ang - om * per * p2;
  float g1 = grumeaux(rr * vec2(cos(a1), sin(a1))), g2 = grumeaux(rr * vec2(cos(a2), sin(a2)) + 19.);
  return an * (.6 + .8 * mix(g1, g2, w));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - uCentre) / uRes.y;
  float ci = cos(uIncl), si = sin(uIncl), ca = cos(uAz), sa = sin(uAz);
  vec3 ro = vec3(ca * ci, si, sa * ci) * uDist;
  vec3 fw = normalize(-ro), rt = normalize(cross(fw, vec3(0., 1., 0.))), up = cross(rt, fw);
  vec3 v = normalize(fw + (uv.x * rt + uv.y * up) * uFov);
  vec3 p = ro; vec3 hh = cross(p, v); float h2 = dot(hh, hh);
  vec3 col = vec3(0.); float tr = 1.; bool trou = false;
  for (int i = 0; i < 400; i++){
    if (float(i) >= uSteps) break;
    float r = length(p);
    if (r < 1.){ trou = true; break; }
    if (r > uDist * 1.6 && dot(p, v) > 0.) break;
    float dt = clamp(.08 * (r - .9), .015, 1.5);
    vec3 acc = -1.5 * h2 * p / pow(r, 5.);
    v += acc * dt;
    vec3 pn = p + v * dt;
    if (uDisk > .5 && p.y * pn.y < 0.){
      vec3 X = mix(p, pn, p.y / (p.y - pn.y));
      float rr = length(X.xz);
      if (rr > uRin && rr < uRout){
        // température d'un disque mince (Shakura et Sunyaev), puis Doppler et décalage gravitationnel : on voit un corps noir
        // à g·T, de luminance celle de ce corps noir (invariance de I_ν/ν³) ; l'écart de luminance est adouci (exposant uEclat)
        float x = rr / uRin, f = (1. - inversesqrt(x)) / (x * x * x);
        float Td = uTpic * pow(max(f, 0.) / .0567, .25);
        float beta = sqrt(.5 / rr);
        vec3 vd = normalize(vec3(-X.z, 0., X.x)) * beta;
        vec3 n = -normalize(v);
        float gam = 1. / sqrt(1. - beta * beta);
        float g = mix(1., 1. / (gam * (1. - dot(vd, n))), uDop) * mix(1., sqrt(1. - 1. / rr), uDop);
        float To = Td * g, tex = texDisque(rr, atan(X.z, X.x));
        float L = pow(eclatCorpsNoir(To) / eclatCorpsNoir(uTpic), uEclat);
        float al = clamp(.9 * smoothstep(uRin, uRin * 1.25, rr) * (1. - smoothstep(uRout * .7, uRout, rr)) * (.55 + .5 * tex), 0., .95);
        col += tr * al * corpsNoir(To) * L * uIdisk * tex;
        tr *= 1. - al;
        if (tr < .02) break;
      }
    }
    p = pn;
  }
  if (!trou) col += tr * ciel(normalize(v));
  o = vec4(col, trou ? 1. : 0.);
}`);
  const FS_COPIE = FKR.fs([], `uniform sampler2D uT; uniform vec2 uK; out vec4 o; void main(){ o = texture(uT, vUv * uK); }`);
  // « encre » : sans décor et en thème clair, le phénomène est imprimé en sombre sur papier crème
  const FS_ENCRE = FKR.fs(['couleur'], `uniform sampler2D uT; uniform float uExpo; out vec4 o;
void main(){
  vec4 s = texture(uT, vUv);
  vec3 c = 1. - exp(-max(s.rgb, 0.) * uExpo);
  float l = dot(c, vec3(.3, .55, .15));
  vec3 col = s.a > .5 ? vec3(.12, .1, .2) : vec3(.953, .933, .89) * (1. - .88 * l);
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`);

  // couleurs de la légende : calculées comme dans l'image (corps noir, raies) ; une fausse couleur est nommée
  const css = COUL.css, cn = COUL.corpsNoir;
  window.FASC.push({
    id: 'galaxie', name: 'La Galaxie', cat: 'Cosmos', glyph: '✷', decor: true, smoothTime: true,
    blurb: 'Bras spiraux, galaxies qui se percutent, trou noir',
    hint: 'OBSERVER : touchez une région · TOURNER : glissez pour changer le point de vue · ASTRE : dans la collision, touchez pour lancer un troisième noyau.',
    intro: 'Deux cents milliards de soleils qui tournent autour d’un trou noir, en dessinant des bras qui ne sont pas faits des mêmes étoiles d’un siècle à l’autre. Puis deux galaxies qui se frôlent et s’arrachent des queues d’étoiles longues de cent mille années-lumière. Et, au centre, l’endroit d’où la lumière ne revient pas.',
    legend: [
      { color: css(cn(4400)), name: 'Bulbe', role: 'étoiles anciennes · blanc-jaune, 4 000 à 5 500 K', desc: 'Au centre, des étoiles vieilles de plus de dix milliards d’années, plus froides que le Soleil donc jaunâtres, sur des orbites désordonnées.' },
      { color: css(cn(16000)), name: 'Jeunes étoiles', role: 'chaudes, bleues, brèves · 10 000 à 30 000 K', desc: 'Les étoiles massives brillent en bleu et meurent en quelques millions d’années, avant d’avoir quitté le bras où elles sont nées : elles le soulignent. Ce sont des points : même au télescope, une étoile n’a pas de disque.' },
      { color: css(C_HII), name: 'Nébuleuse H II', role: 'hydrogène ionisé · 656 nm et 486 nm', desc: 'Le gaz chauffé par les jeunes étoiles émet les raies de l’hydrogène (surtout le rouge Hα, un peu de bleu Hβ) : des perles roses le long des bras.' },
      { color: '#675b4b', name: 'Poussière', role: 'absorbe, surtout le bleu · elle brunit', desc: 'Des grains de carbone et de silicates, au bord intérieur des bras, où le gaz est comprimé par l’onde de densité. Ils arrêtent davantage le bleu que le rouge : la lumière qui passe rougit, d’où les bandes brunes.' },
      { color: css(cn(13000)), name: 'Queue de marée', role: 'collision de galaxies · bleutée', desc: 'Lors d’une rencontre, la gravité de l’autre galaxie étire le bord du disque, riche en étoiles jeunes, en deux longues queues bleutées ; le gaz comprimé y allume des nœuds roses de jeunes étoiles.' },
      { color: css(FKR.palette.carte('inferno')(0.8)), name: 'Couleurs selon la vitesse', role: 'fausse couleur · échelle inferno', desc: 'Dans la collision, le réglage « Couleurs : par vitesse » teinte chaque étoile selon sa vitesse, des lentes (violet sombre) aux rapides (jaune). Ce ne sont pas les vraies couleurs des étoiles.' },
      { color: '#07050a', name: 'Horizon et ombre', role: 'trou noir · rayon de Schwarzschild', desc: 'Rien n’en sort. Son ombre paraît 2,6 fois plus grande que l’horizon, car la lumière qui passe trop près est capturée.' },
      { color: css(cn(4800)), name: 'Disque d’accrétion', role: 'couleurs stylisées · orange-blanc', desc: 'Le gaz qui tombe tourne à près de la moitié de la vitesse de la lumière : le côté qui vient vers nous est plus brillant et plus bleu (effet Doppler). Un vrai disque est si chaud qu’il brille surtout en ultraviolet et en rayons X ; ici, ses températures sont ramenées à celles d’étoiles, en orange-blanc. L’image du télescope Event Horizon est en ondes radio : ses couleurs sont fausses elles aussi.' },
    ],
    about: [
      'Jusqu’en 1924, on pensait que la Voie lactée était tout l’Univers. Edwin Hubble mesure alors la distance de la « nébuleuse » d’Andromède : 2,5 millions d’années-lumière. Les nébuleuses spirales sont d’autres galaxies. Il les classe en 1926 : elliptiques, spirales, spirales barrées. La Voie lactée est une spirale barrée d’environ 100 000 années-lumière, avec 100 à 400 milliards d’étoiles ; le Soleil en fait le tour en 230 millions d’années.',
      'Les bras spiraux posent une énigme : les étoiles proches du centre tournent plus vite que les autres, si bien que des bras faits d’étoiles s’enrouleraient en quelques tours. En 1964, Chia-Chiao Lin et Frank Shu proposent que les bras soient des ondes de densité : des embouteillages qui tournent plus lentement que les étoiles, lesquelles y entrent et en ressortent. La simulation suit cette idée : chaque étoile parcourt une ellipse, et l’orientation des ellipses tourne un peu d’un rayon à l’autre. Le gaz comprimé dans l’embouteillage forme des étoiles : les bras s’allument de bleu et de rose. Le temps y est énormément accéléré : quelques secondes pour des dizaines de millions d’années.',
      'En 1972, les frères Alar et Juri Toomre montrent avec un ordinateur que les formes bizarres de certaines galaxies, les Antennes ou les Souris, sont des collisions : il suffit de deux noyaux massifs et de disques d’étoiles-tests. Les étoiles ne se heurtent presque jamais (elles sont trop éloignées), mais les marées gravitationnelles tirent des ponts et des queues. Andromède fonce vers nous à 110 km/s. Longtemps, on a cru la collision certaine dans 4 à 5 milliards d’années ; une étude de 2025, avec les mesures de Gaia et de Hubble, ne lui donne plus qu’environ une chance sur deux dans les 10 milliards d’années à venir.',
      'Karl Schwarzschild trouve en 1916 la première solution exacte des équations d’Einstein : une masse ponctuelle entourée d’un horizon. En 2019, le télescope Event Horizon photographie l’ombre du trou noir de M87, 6,5 milliards de masses solaires ; en 2022, celle de Sagittarius A*, au centre de la Voie lactée. Le trou noir du film Interstellar (2014) a été calculé par l’équipe de Kip Thorne avec la même physique que celle utilisée ici : l’image du disque passe par-dessus et par-dessous l’ombre, parce que la lumière du disque situé derrière est courbée vers nous. Le film avait retiré l’effet Doppler pour le spectateur ; il est gardé ici.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une région : bulbe, bras, poussière, queue de marée, ombre du trou noir, anneau de photons, disque.' },
      { id: 'tourner', label: 'tourner', desc: 'Glissez pour tourner autour de la galaxie ou du trou noir (horizontalement : azimut ; verticalement : inclinaison).' },
      { id: 'astre', label: 'astre', desc: 'Dans la collision : touchez pour lancer un troisième noyau massif à travers la scène.' },
    ],
    make(env) {
      try { return makeGal(env); } catch (e) {
        console.warn('La Galaxie : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#07050a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('La Galaxie demande WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeGal(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; const y0 = v.y0 || 0, y1 = v.y1 || H; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2, y0, cy: (y0 + y1) / 2 }; };
    const cfg = { scene: 'spirale', q: 'haute', type: 'grand', twist: 3.2, ecc: 0.32, pat: 0.18, speed: 0.2, dust: 0.8, bloom: 0.7, incl: 0.95, az: 0.4, preset: 'antennes', colMode: 0, dop: 1, disk: true, dist: 26, bincl: 0.12, bAz: 0.6 };
    let T = 0, R = null, label = null;
    // le halo de la cabine (DA : 0,04 à 0,08) ; le réglage « Halo lumineux » garde son échelle (0,7 par défaut)
    const haloDe = (b) => b * 0.09;

    function initGL() {
      const Q = QUAL[cfg.q];
      const C = FKR.cabine(env, { echelle: Q.ech, fond: FKR.fond('cosmos'), halo: haloDe(cfg.bloom), tons: 'agx', grain: 0.05 });
      const K = C.K, gl = C.gl, cw = C.cw, ch = C.ch;
      const r = {
        C, K, gl, Q, cw, ch,
        pg: { spi: K.program(FS_DIFF, VS_SPI), spiNet: K.program(FS_NET, VS_SPI), nbP: K.program(FS_DIFF, VS_NB), nbNet: K.program(FS_NET, VS_NB), nb: K.program(FS_NB), blur: K.program(FS_BLUR), comp: K.program(FS_COMP), bh: K.program(FS_BH), copie: K.program(FS_COPIE), encre: K.program(FS_ENCRE) },
        D: K.target(cw >> 1, ch >> 1), Dt: K.target(cw >> 1, ch >> 1),
        BH: K.target(Math.max(32, Math.round(cw * Q.bh)), Math.max(32, Math.round(ch * Q.bh))),
        lut: C.lut(FKR.palette.carte('inferno')),
        lots: { etoiles: C.lot({ forme: 'moffat', mode: 'flux' }), eclat: C.lot({ forme: 'etoile', mode: 'flux', pointes: 1.2 }), loin: C.lot({ forme: 'gauss', mode: 'flux' }), noyau: C.lot({ forme: 'moffat', mode: 'flux', beta: 2.2 }) },
        dyn: 1, ft: 30, last: 0,
      };
      return r;
    }
    R = initGL();
    const tex32 = (w, h, data) => { const gl = R.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data); for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST); return t; };

    /* ───────── la spirale : populations d'étoiles ───────── */
    // rangées par population : [bulbe et halo][disque ancien][poussière][jeunes][jeunes brillantes][H II] ;
    // les deux dernières sont aussi dessinées « nettes », en points résolus
    let SP = null;
    function buildSpiral() {
      const side = R.Q.side, n = side * side;
      const ell = cfg.type === 'elliptique';
      const L = { 4: [], 0: [], 3: [], 1: [], 5: [], 2: [] };
      const add = (k, a, M0, z, ty, bx, by, bz, bw = 0) => L[k].push([a, M0, z, ty, bx, by, bz, bw]);
      const disque = () => { let a = 0.06 + -Math.log(1 - Math.random() * 0.96) * 0.3; if (a > 1.35) a = 0.2 + Math.random(); return a; };
      const gz = (hz) => (Math.random() + Math.random() - 1) * hz;
      let i = 0;
      while (i < n) {
        const u = Math.random();
        if (ell || u < 0.16) { add(4, 0.02 + Math.pow(Math.random(), 1.8) * (ell ? 1.0 : 0.32), Math.random() * TAU, 0, 4, Math.random(), Math.random(), 1); i++; continue; }  // bulbe / elliptique
        if (u < 0.2) { add(4, 0.3 + Math.random() * 0.9, Math.random() * TAU, 0, 4, Math.random(), Math.random(), 0.6); i++; continue; }                               // halo
        if (u < 0.6) { add(0, disque(), Math.random() * TAU, gz(0.03), 0, Math.random(), Math.random(), 1); i++; continue; }                                         // disque ancien
        if (u < 0.74) { add(3, disque(), Math.random() * TAU, gz(0.012), 3, Math.random(), Math.random(), 1); i++; continue; }                                       // poussière
        if (u < 0.98) {
          // jeunes étoiles, en associations : même orbite, un peu étalées le long de l'arc
          const a = disque(), M = Math.random() * TAU, z = gz(0.012), bx = Math.random(), m = 3 + Math.floor(Math.random() * 8);
          for (let k = 0; k < m && i < n; k++, i++) {
            const net = Math.random() < 0.16;
            add(net ? 5 : 1, a + (Math.random() - 0.5) * 0.008, M + (Math.random() - 0.5) * 0.08 / (a + 0.1), z + gz(0.004), 1, bx, Math.random(), net ? Math.min(25, 0.5 * Math.pow(Math.random(), -1.4)) : 1, net ? 1 : 0);
          }
          continue;
        }
        // régions H II, en nœuds : quelques dizaines de « perles » d'un même nuage
        const a = disque(), M = Math.random() * TAU, z = gz(0.008), bx = Math.random(), m = 6 + Math.floor(Math.random() * 16), by = Math.random();
        for (let k = 0; k < m && i < n; k++, i++) add(2, a + (Math.random() - 0.5) * 0.006, M + (Math.random() - 0.5) * 0.05 / (a + 0.1), z + gz(0.003), 2, bx, clamp(by + (Math.random() - 0.5) * 0.3, 0, 1), 0.4 + Math.random() * 1.2);
      }
      const ordre = [...L[4], ...L[0], ...L[3], ...L[1], ...L[5], ...L[2]];
      const A = new Float32Array(n * 4), B = new Float32Array(n * 4);
      for (let k = 0; k < n; k++) { const e = ordre[k]; A.set(e.slice(0, 4), k * 4); B.set(e.slice(4, 8), k * 4); }
      const debutNet = n - L[5].length - L[2].length;
      SP = { side, n, t1: tex32(side, side, A), t2: tex32(side, side, B), net: [debutNet, n - debutNet] };
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
      andromede: { nom: 'Voie lactée et Andromède', m: [1, 1.3], q: 0.6, inc: [[20, 30], [-40, 110]], f0: -2.0, why: 'Un scénario possible (une chance sur deux environ, selon une étude de 2025) : un premier passage, des queues de marée, puis la fusion en une grande elliptique, « Milkomède ».' },
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
      const Rds = [];
      let k = 0;
      cores.forEach((c, gi) => {
        const cnt = gi === 0 ? n1 : n2, [incD, omD] = pr.inc[gi], inc = (incD * Math.PI) / 180, om = (omD * Math.PI) / 180;
        // axe de rotation du disque
        const ax = [Math.sin(inc) * Math.cos(om), Math.sin(inc) * Math.sin(om), Math.cos(inc)];
        const t1 = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
        let e1 = [ax[1] * t1[2] - ax[2] * t1[1], ax[2] * t1[0] - ax[0] * t1[2], ax[0] * t1[1] - ax[1] * t1[0]]; const l1 = Math.hypot(...e1); e1 = e1.map((x) => x / l1);
        const e2 = [ax[1] * e1[2] - ax[2] * e1[1], ax[2] * e1[0] - ax[0] * e1[2], ax[0] * e1[1] - ax[1] * e1[0]];
        const Rd = (gi === 1 && pr.noDisk2 ? 0.25 : 1) * Math.sqrt(c.m);
        Rds.push(Rd);
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
      NB = { side, n, P: K.double(side, side, 'f32', R.gl.NEAREST), V: K.double(side, side, 'f32', R.gl.NEAREST), cores, E2, t: 0, Rd: Rds };
      for (const [D, data] of [[NB.P, P], [NB.V, V]]) for (const t of [D.r, D.w]) { R.gl.bindTexture(R.gl.TEXTURE_2D, t.tex); R.gl.texImage2D(R.gl.TEXTURE_2D, 0, R.gl.RGBA32F, side, side, 0, R.gl.RGBA, R.gl.FLOAT, data); }
    }
    const coresU = () => { const C = new Float32Array(16); NB.cores.slice(0, 4).forEach((c, i) => C.set([c.x[0], c.x[1], c.x[2], c.m], i * 4)); return C; };
    function stepColl(dt) {
      const { cores, E2 } = NB;
      // noyaux : saute-mouton avec adoucissement
      const acc = () => cores.map((c, i) => { const a = [0, 0, 0]; cores.forEach((o, j) => { if (i === j) return; const d = [0, 1, 2].map((k) => o.x[k] - c.x[k]); const r2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 + E2; const f = o.m / (r2 * Math.sqrt(r2)); for (let k = 0; k < 3; k++) a[k] += d[k] * f; }); return a; });
      let A = acc();
      cores.forEach((c, i) => { for (let k = 0; k < 3; k++) { c.v[k] += A[i][k] * dt * 0.5; c.x[k] += c.v[k] * dt; } });
      A = acc();
      cores.forEach((c, i) => { for (let k = 0; k < 3; k++) c.v[k] += A[i][k] * dt * 0.5; });
      R.pg.nb.use().t('uP', NB.P.r).t('uV', NB.V.r).v4('uC', coresU()).i('uNC', Math.min(4, cores.length)).f('uDt', dt).f('uE2', E2);
      R.K.run(R.pg.nb, NB.P.w, NB.V.w); NB.P.swap(); NB.V.swap();
      NB.t += dt;
    }

    /* ───────── le ciel du décor : étoiles de notre Galaxie au premier plan, galaxies lointaines ───────── */
    // sur la sphère céleste : elles bougent quand on tourne autour du sujet ; températures et éclats d'étoiles du voisinage solaire
    const CIEL = (() => {
      const al = graine(20251113), etoiles = [], loin = [];
      const dir = () => { const z = al() * 2 - 1, a = al() * TAU, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), z, s * Math.sin(a)]; };
      const Ts = [3200, 3500, 3900, 4300, 4700, 5200, 5600, 5900, 6300, 6900, 7800, 9500, 12000, 17000];
      for (let i = 0; i < 2600; i++) {
        const T = Ts[Math.min(Ts.length - 1, Math.floor(Math.pow(al(), 1.15) * Ts.length))];
        const f = Math.min(400, 0.35 * Math.pow(al(), -1.25));  // fonction de luminosité : beaucoup de faibles, quelques brillantes
        etoiles.push({ d: dir(), c: cn(T), f });
      }
      etoiles.sort((a, b) => b.f - a.f);
      for (let i = 0; i < 320; i++) {
        const ell = al() < 0.45, z = 0.4 + al() * 0.6;
        const c = ell ? cn(4300 + al() * 600) : al() < 0.5 ? cn(6500 + al() * 4000) : cn(5200);
        loin.push({ d: dir(), c: c.map((v, k) => v * [1, 0.9 + 0.1 * z, 0.75 + 0.25 * z][k]), f: 0.6 + 2.5 * Math.pow(al(), 3), L: 1 + al() * (ell ? 2 : 5), r: 0.6 + al() * 0.9, a: al() * Math.PI });
      }
      return { etoiles, loin };
    })();
    function dessinerCiel(VP, gain) {
      if (env.decor === false) return;
      const { etoiles, eclat, loin } = R.lots;
      etoiles.vider(); eclat.vider(); loin.vider();
      const sc = (q) => [((q[0] + 1) / 2) * W, ((1 - q[1]) / 2) * H];
      CIEL.etoiles.forEach((e, i) => {
        const q = xfd(VP, e.d[0], e.d[1], e.d[2]); if (q[2] <= 0 || Math.abs(q[0]) > 1.05 || Math.abs(q[1]) > 1.05) return;
        const [x, y] = sc(q), f = e.f * gain;
        if (i < 14) eclat.point(x, y, 1.1, e.c[0] * f, e.c[1] * f, e.c[2] * f, true);
        else etoiles.point(x, y, 0.9, e.c[0] * f, e.c[1] * f, e.c[2] * f);
      });
      for (const g of CIEL.loin) {
        const q = xfd(VP, g.d[0], g.d[1], g.d[2]); if (q[2] <= 0 || Math.abs(q[0]) > 1.05 || Math.abs(q[1]) > 1.05) continue;
        const [x, y] = sc(q), dx = Math.cos(g.a) * g.L * 0.5, dy = Math.sin(g.a) * g.L * 0.5, f = g.f * gain * 0.5;
        loin.segment(x - dx, y - dy, x + dx, y + dy, g.r, g.c[0] * f, g.c[1] * f, g.c[2] * f);
      }
      loin.dessiner(); etoiles.dessiner(); eclat.dessiner();
    }

    /* ───────── caméra ───────── */
    function camera(dist, incl, az, aspect) {
      const e = [Math.cos(az) * Math.cos(incl) * dist, Math.sin(incl) * dist, Math.sin(az) * Math.cos(incl) * dist];
      const Pm = persp(0.75, aspect, 0.05, 100), Vm = lookAt(e, [0, 0, 0], [0, 1, 0]);
      return mul(Pm, Vm);
    }
    // décale l'image vers le centre de la zone visible (panneaux ouverts, barre du haut)
    function shiftVP(VP) { const v = view(), sx = ((v.cx - W / 2) / W) * 2, sy = -((v.cy - H / 2) / H) * 2; const S = new Float32Array(16); S[0] = S[5] = S[10] = S[15] = 1; S[12] = sx; S[13] = sy; return mul(S, VP); }
    const ecran = (VP, x, y, z) => { const c = xf(VP, x, y, z); return [((c[0] + 1) / 2) * W, ((1 - c[1]) / 2) * H, c[2]]; };

    /* ───────── rendu ───────── */
    function setMat(P, name, m) { R.gl.uniformMatrix4fv(R.gl.getUniformLocation(P.p, name), false, m); }
    function points(out, first, count, clear) {
      const gl = R.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb); gl.viewport(0, 0, out.w, out.h);
      if (clear) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(R.K.emptyVao); gl.drawArrays(gl.POINTS, first, count);
      gl.disable(gl.BLEND);
    }
    // la lumière diffuse (demi-résolution) est adoucie : les étoiles non résolues font une lueur continue
    function adoucir() { const { K, pg } = R; pg.blur.use().t('uT', R.D).f('uDir', 1.2 / R.D.w, 0); K.run(pg.blur, R.Dt); pg.blur.use().t('uT', R.Dt).f('uDir', 0, 1.2 / R.D.h); K.run(pg.blur, R.D); }
    function composer(dustK, gain) { R.pg.comp.use().t('uL', R.D).f('uDustK', dustK).f('uGain', gain).f('uKext', KEXT[0], KEXT[1], KEXT[2]); R.C.passe(R.pg.comp); }
    const encre = () => env.decor === false && env.theme === 'light';
    function finir(dt) {
      if (!encre()) { R.C.fin(dt); return; }
      const { K, pg } = R;
      pg.encre.use().t('uT', R.C.cibles.lum).f('uExpo', 1.2); K.run(pg.encre, null);
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
    }
    let VPcur = null;
    // échelle des points : px du tampon (demi-résolution pour la lumière diffuse)
    const pxD = () => (Math.min(R.cw, R.ch) / 1800) * 1.35, alphaNet = () => R.cw / W * 0.95;
    function renderSpiral(dt) {
      const { pg, C } = R, ty = TYPES[cfg.type], ell = cfg.type === 'elliptique';
      const VP = shiftVP(camera(1.95, cfg.incl, cfg.az, W / H)); VPcur = VP;
      const dustK = ell ? 0 : cfg.dust * 3.2;
      C.debut(dt);
      const uni = (P, net) => {
        P.use().t('uS1', SP.t1).t('uS2', SP.t2).i('uSide', SP.side).f('uT', T).f('uTwist', ty.twist).f('uEcc', ty.ecc).f('uPat', 0.18).f('uBar', ty.bar)
          .f('uEll', ell ? 1 : 0).f('uPx', pxD()).f('uNet', net).f('uSensP', -1).f('uPmin', 2.5).f('uPmax', 9).f('uAlpha', alphaNet())
          .f('uLum', 0.9, 0.55, 1.1, 1.25).f('uHII', C_HII[0], C_HII[1], C_HII[2]).f('uHII2', C_HII2[0], C_HII2[1], C_HII2[2]);
        setMat(P, 'uVP', VP);
        return P;
      };
      // 1. lumière diffuse et colonne de poussière, en demi-résolution
      uni(pg.spi, 0).i('uFirst', 0); points(R.D, 0, SP.n, true);
      adoucir();
      // 2. dans la lumière de la cabine, à travers la poussière
      composer(dustK, 0.42);
      // 3. étoiles résolues et nœuds H II, nets
      if (SP.net[1] > 0) { uni(pg.spiNet, 1).i('uFirst', SP.net[0]).t('uL', R.D).f('uRes', R.cw, R.ch).f('uDustK', dustK).f('uKext', KEXT[0], KEXT[1], KEXT[2]); points(C.cibles.lum, 0, SP.net[1], false); }
      // 4. le noyau : un cœur d'étoiles anciennes, très dense
      const c = ecran(VP, 0, 0, 0), k = (Math.min(W, H) / 800) * (1.95 / c[2]);
      R.lots.noyau.vider().point(c[0], c[1], (ell ? 9 : 5) * k, ...cn(4600).map((v) => v * (ell ? 900 : 380) * k * k)).point(c[0], c[1], 1.4 * k, ...cn(4900).map((v) => v * 30)).dessiner();
      dessinerCiel(VP, 1);
      finir(dt);
    }
    function renderColl(dt) {
      const { pg, C } = R;
      const VP = shiftVP(camera(7.5, cfg.incl, cfg.az, W / H)); VPcur = VP;
      const Cu = coresU();
      C.debut(dt);
      const uni = (P, net, pas) => {
        P.use().t('uP', NB.P.r).t('uV', NB.V.r).t('uLut', R.lut).i('uSide', NB.side).i('uPas', pas).f('uPx', pxD()).f('uColMode', cfg.colMode).f('uNet', net)
          .f('uPmin', 2.5).f('uPmax', 6).f('uAlpha', alphaNet()).v4('uC', Cu).f('uRd', NB.Rd[0], NB.Rd[1]).f('uLum', 0.8, 0.8, 2.4, 0).f('uHII', C_HII[0], C_HII[1], C_HII[2]);
        setMat(P, 'uVP', VP);
        return P;
      };
      uni(pg.nbP, 0, 1); points(R.D, 0, NB.n, true);
      adoucir();
      composer(0, 0.5);
      const pas = 4;
      uni(pg.nbNet, 1, pas).t('uL', R.D).f('uRes', R.cw, R.ch).f('uDustK', 0).f('uKext', 1, 1, 1); points(C.cibles.lum, 0, Math.floor(NB.n / pas), false);
      // les noyaux : bulbes d'étoiles anciennes, blanc-jaune
      R.lots.noyau.vider();
      NB.cores.forEach((co, i) => {
        const c = ecran(VP, co.x[0], co.x[1], co.x[2]); if (c[2] <= 0) return;
        const k = (Math.min(W, H) / 800) * (7.5 / c[2]) * Math.sqrt(co.m), col = cn(i === 1 ? 4300 : 4700);
        R.lots.noyau.point(c[0], c[1], 3.2 * k, ...col.map((v) => v * 110 * k * k)).point(c[0], c[1], 1.1 * k, ...col.map((v) => v * 12));
      });
      R.lots.noyau.dessiner();
      dessinerCiel(VP, 1);
      finir(dt);
    }
    function renderBH(dt) {
      const { K, pg, C } = R;
      // résolution adaptative : le lancer de rayons est coûteux
      const now = performance.now(), d = now - R.last; R.last = now;
      if (d > 0 && d < 500) R.ft += (d - R.ft) * 0.1;
      if (R.ft > 42) R.dyn = Math.max(0.4, R.dyn * 0.97); else if (R.ft < 24) R.dyn = Math.min(1, R.dyn * 1.02);
      const cw = Math.max(32, Math.round(R.BH.w * R.dyn)), ch = Math.max(32, Math.round(R.BH.h * R.dyn));
      const v = view();
      pg.bh.use().f('uRes', cw, ch).f('uCentre', (v.cx / W) * cw, (1 - v.cy / H) * ch).f('uT', T).f('uDist', cfg.dist).f('uIncl', cfg.bincl).f('uAz', cfg.bAz).f('uRin', 3).f('uRout', 14).f('uDop', cfg.dop).f('uDisk', cfg.disk ? 1 : 0)
        .f('uDecor', env.decor === false ? 0 : 1).f('uSteps', R.Q.steps).f('uFov', 0.9).f('uTpic', 5200).f('uEclat', 0.62).f('uIdisk', 1.1).f('uPix', 0.9 / ch);
      K.run(pg.bh, { fb: R.BH.fb, w: cw, h: ch });
      C.debut(dt);
      pg.copie.use().t('uT', R.BH).f('uK', cw / R.BH.w, ch / R.BH.h); C.passe(pg.copie);
      finir(dt);
    }

    /* ───────── son ───────── */
    let drone = null;
    if (au) drone = au.drone(55, 'sine', 0);

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
    let pending = false, dtRendu = 1 / 60;
    function render() {
      if (R.C.perdu) { if (R.gl.isContextLost()) return; const old = R; R = initGL(); old.C.detruire(); SP = null; NB = null; setScene(cfg.scene); }
      R.C.regler({ halo: haloDe(cfg.bloom) });
      if (cfg.scene === 'spirale') renderSpiral(dtRendu);
      else if (cfg.scene === 'collision') renderColl(dtRendu);
      else renderBH(dtRendu);
      hud();
      drawLabel();
    }
    function hud() {
      const v = view(), ink = encre();
      ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink ? 'rgba(40,30,80,.75)' : 'rgba(230,228,255,.6)';
      let s = '';
      if (cfg.scene === 'spirale') s = `${TYPES[cfg.type].nom.toUpperCase()} · ${Math.round(SP.n / 1000)} 000 ÉTOILES · ${duree(T * MA_PAR_T)} · TEMPS TRÈS ACCÉLÉRÉ`;
      if (cfg.scene === 'collision') s = `${PRESETS[cfg.preset].nom.toUpperCase()} · ${duree(NB.t * MA_COLL)} · TEMPS TRÈS ACCÉLÉRÉ`;
      if (cfg.scene === 'trounoir') s = `TROU NOIR DE SCHWARZSCHILD · VU DE ${fr(cfg.dist, 0)} RAYONS · INCLINAISON ${Math.round((cfg.bincl * 180) / Math.PI)}° · COULEURS DU DISQUE STYLISÉES`;
      ctx.fillText(s, v.x0 + 16, H - 16); ctx.restore();
    }
    function frame(t, dt) {
      if (dt > 0) { update(dt); dtRendu = dt; }
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    /* ───────── identification ───────── */
    // le même rayon lumineux, en JS, pour savoir ce que l'on touche dans l'image du trou noir
    function traceBH(x, y) {
      const v0 = view(), uvx = (x - v0.cx) / H, uvy = -(y - v0.cy) / H;
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
        if (d < 0.07) return ['Bulbe et trou noir central', 'étoiles anciennes, blanc-jaune · au cœur, un trou noir de millions de masses solaires', '#ffe3c8'];
        if (d < 0.5) return ['Disque', 'étoiles, gaz et poussière en rotation · les bras sont des embouteillages, pas des objets', '#b5c9ff'];
        return ['Halo', 'étoiles isolées et amas globulaires, autour du disque', '#c8c8c8'];
      }
      return ['Étoiles en marée', 'les étoiles ne se heurtent pas : c’est la gravité des noyaux qui les arrache', '#c0d1ff'];
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

    if (window.FASC_DEBUG) window.FASC_DEBUG.gal = { cfg, setScene, buildColl, get NB() { return NB; }, get R() { return R; }, run(n, h) { for (let i = 0; i < n; i++) update(h); render(); }, traceBH };

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
      dispose() { if (drone) drone.stop(); R.C.detruire(); },
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
          L.push({ type: 'note', text: `Temps énormément accéléré : à ${Math.round(cfg.speed * 100)} %, une seconde vaut ${fr(cfg.speed * 2 * MA_PAR_T, 0)} millions d’années. En vrai, le Soleil fait un tour en 230 millions d’années.` });
          if (cfg.type !== 'elliptique') L.push({ type: 'slider', label: 'Poussière', min: 0, max: 1, step: 0.01, value: cfg.dust, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.dust = x; } });
          L.push({ type: 'buttons', items: [{ label: 'De face', act: () => { cfg.incl = 1.5; } }, { label: 'Incliné', act: () => { cfg.incl = 0.62; } }, { label: 'Par la tranche', act: () => { cfg.incl = 0.06; } }] });
        }
        if (cfg.scene === 'collision') {
          const pr = PRESETS[cfg.preset];
          L.push({ type: 'section', label: 'Rencontre' });
          L.push({ type: 'choice', label: 'Scénario', value: cfg.preset, set: (x) => { cfg.preset = x; buildColl(); }, options: Object.keys(PRESETS).map((k) => ({ id: k, label: PRESETS[k].nom })) });
          L.push({ type: 'note', text: pr.why });
          L.push({ type: 'bar', label: 'Temps écoulé', color: css(cn(13000)), value: clamp(NB.t / 40, 0, 1), txt: Math.round(NB.t * MA_COLL) + ' millions d’années' });
          L.push({ type: 'slider', label: 'Vitesse', min: 0.1, max: 2, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'choice', label: 'Couleurs', value: cfg.colMode, set: (x) => { cfg.colMode = x; }, options: [{ id: 0, label: 'Par galaxie' }, { id: 1, label: 'Par vitesse' }] });
          if (cfg.colMode) L.push({ type: 'note', text: 'Fausse couleur : la teinte dit la vitesse de chaque étoile (échelle inferno, du violet sombre pour les lentes au jaune pour les rapides).' });
          L.push({ type: 'buttons', items: [{ label: 'Recommencer', act: () => buildColl() }, { label: 'Vue du dessus', act: () => { cfg.incl = 1.5; } }, { label: 'De biais', act: () => { cfg.incl = 0.6; } }] });
          L.push({ type: 'note', text: `${Math.round(NB.n / 1000)} 000 étoiles-tests · ${NB.cores.length} noyaux. Temps énormément accéléré : la rencontre dure des centaines de millions d’années. L’outil ASTRE lance un noyau de plus.` });
        }
        if (cfg.scene === 'trounoir') {
          L.push({ type: 'section', label: 'Trou noir' });
          L.push({ type: 'toggle', label: 'Disque d’accrétion', value: cfg.disk, set: (x) => { cfg.disk = x; } });
          L.push({ type: 'toggle', label: 'Effets Doppler et décalage gravitationnel', value: !!cfg.dop, set: (x) => { cfg.dop = x ? 1 : 0; } });
          L.push({ type: 'slider', label: 'Distance', min: 8, max: 60, step: 0.5, value: cfg.dist, fmt: (x) => fr(x, 0) + ' rayons de Schwarzschild', set: (x) => { cfg.dist = x; } });
          L.push({ type: 'slider', label: 'Inclinaison', min: -1.4, max: 1.4, step: 0.01, value: cfg.bincl, fmt: (x) => Math.round((x * 180) / Math.PI) + '°', set: (x) => { cfg.bincl = x; } });
          L.push({ type: 'slider', label: 'Rotation du disque', min: 0, max: 2, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'note', text: 'Sans le disque, on voit la lentille gravitationnelle déformer le ciel ; avec, on voit l’image du disque arrière passer au-dessus et au-dessous de l’ombre. Couleurs du disque stylisées (orange-blanc) ; l’effet Doppler, lui, est calculé.' });
        }
        L.push({ type: 'section', label: 'Calcul et rendu' });
        L.push({ type: 'slider', label: 'Halo lumineux', min: 0, max: 1.5, step: 0.01, value: cfg.bloom, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.bloom = x; } });
        L.push({ type: 'choice', label: 'Définition', value: cfg.q, set: (x) => { if (x === cfg.q) return; cfg.q = x; const old = R; R = initGL(); old.C.detruire(); SP = null; NB = null; setScene(cfg.scene); }, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        return L;
      },
    };
  }
})();
