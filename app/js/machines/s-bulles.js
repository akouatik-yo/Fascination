/* Fascination — Les Bulles · interférences en film mince, drainage, film noir, caténoïde (WebGL2, rendu FKR)
   La couleur d'un film de savon est calculée longueur d'onde par longueur d'onde (filmMince de FKR) : deux ondes réfléchies
   par les faces d'une lame d'eau d'indice 1,33 et d'épaisseur e interfèrent, avec un déphasage 4π n e cos θt / λ (+ π à la
   première réflexion), sous la lumière du jour (corps noir à 6 500 K), puis le spectre est intégré avec les fonctions
   colorimétriques CIE 1931. La table est calculée une fois par la carte graphique, au chemin optique e·cos θt ; une source
   étendue mêlant des chemins à ±3 % près, les films de plus d'un micron pâlissent vers le blanc. Le Fresnel exact (n = 1,33)
   rend le film plus réfléchissant sur les bords d'une bulle ; il ne renvoie que quelques % de la lumière : on voit donc
   surtout le reflet de la pièce (une fenêtre, une lampe), sur un fond sombre qui fait chanter les couleurs.
   Le film s'amincit en haut (drainage par gravité), se tord en tourbillons (Marangoni), devient noir sous ~30 nm
   et éclate. Caténoïde : surface minimale entre deux anneaux, r(z) = a ch(z/a) ; au-delà de h/R ≈ 0,663
   (Goldschmidt, 1831), il n'existe plus de solution et le film se coupe en deux disques. */
(function boot() {
  if (!window.FK || !window.FKGL || !window.FKR) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const FKR = window.FKR;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const MAXB = 12;
  const LUTN = 2048; // table du film : un texel par nanomètre de chemin optique e·cos θt, de 0 à 2 048 nm

  // ── la table des couleurs du film (filmMince de FKR), calculée une fois ──
  const FS_LUT = FKR.fs(['couleur'], `
out vec4 o;
void main(){
  float e = gl_FragCoord.x;                       // nm (centre du texel)
  vec3 s = vec3(0.);
  // une source étendue (fenêtre, ciel) mêle des chemins optiques à ±3 % près : au-delà d'un micron, les couleurs pâlissent
  for (int k = -4; k <= 4; k++) s += filmMince(e * (1. + .0075 * float(k)), 1.33, 1.);
  s /= 9.;
  float R0 = pow(.33 / 2.33, 2.);                // une face, incidence normale
  s = mix(s, vec3(2. * R0), smoothstep(1500., 2048., e)); // film très épais : deux reflets sans interférence, blanc
  o = vec4(s, 1.);
}`);
  // ── un marbre de bruit périodique (512², raccord sans couture), pour les tourbillons du film ──
  const FS_MARBRE = FKR.fs(['bruit'], `
uniform float uP; out vec4 o;
float hP(vec2 i, float per){ return alea(mod(i, per) + .5); }
float vP(vec2 p, float per){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hP(i, per), hP(i + vec2(1, 0), per), u.x), mix(hP(i + vec2(0, 1), per), hP(i + 1., per), u.x), u.y) * 2. - 1.; }
float fP(vec2 p, float per){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * vP(p, per); p *= 2.; per *= 2.; a *= .5; } return s; }
void main(){
  vec2 p = vUv * uP;
  vec2 w1 = vec2(fP(p + vec2(1.7, 9.2), uP), fP(p + vec2(8.3, 2.8), uP));
  vec2 w2 = vec2(fP(p + 1.8 * w1 + vec2(3.1, 4.7), uP), fP(p + 1.8 * w1 + vec2(6.2, 1.3), uP));
  o = vec4(fP(p + 2.2 * w2, uP), w1, fP(p * 2. + 5.5, uP * 2.));
}`);

  // ── ce que les trois scènes partagent : la réflectance du film et la pièce qui s'y reflète ──
  const COMMUN = `
uniform sampler2D uFilm, uMarbre;
uniform float uT, uDecor, uInk, uScint;
uniform vec3 uFenC; uniform vec4 uFenT; uniform vec3 uLampe, uSalleB, uSalleH; uniform float uCentre;
const float NF = 1.33;
// réflectance d'un film d'épaisseur e (nm), vu sous une incidence de cosinus ci : les couleurs d'interférence (filmMince,
// au chemin optique e·cos θt) × le Fresnel exact d'une face, borné comme la formule d'Airy (miroir en incidence rasante)
vec3 reflFilm(float e, float ci){
  ci = clamp(ci, 0., 1.);
  float ct = sqrt(1. - (1. - ci * ci) / (NF * NF)), F = fresnelDielectrique(ci, NF);
  vec3 c = texture(uFilm, vec2(clamp(max(e, 0.) * ct / ${LUTN}., 0., 1.), .5)).rgb;
  return c * (F / .02006) / (1. + F);
}
// la pièce qui se reflète (repère de l'observateur : x à droite, y en haut, z vers l'œil), de deux manières :
// uFenT.z = 1 : une pièce sombre et une grande fenêtre à croisillons (la caténoïde) ; uFenT.z = 0 : une pièce claire
// (sol plus sombre, plafond lumineux) et une petite fenêtre douce, en hauteur (les bulles, le film). Une lampe chaude sur
// le côté. uCentre : part de la pièce située derrière l'observateur, celle que reflète le centre des bulles (plus faible :
// le centre reste transparent, les bords brillent). kf : part de la fenêtre (la face arrière d'une bulle n'en garde qu'un
// reflet atténué, stylisé)
vec3 piece(vec3 d, float kf){
  if (uDecor < .5) return vec3(uInk > .5 ? 9. : 14.);   // sans décor : une lumière blanche uniforme, seul le phénomène reste
  bool croisee = uFenT.z > .5;
  vec3 c = mix(uSalleB, uSalleH, smoothstep(croisee ? -.7 : -.8, .9, d.y)) * mix(1., uCentre, smoothstep(.3, .9, d.z));
  vec3 ax = normalize(cross(vec3(0., 1., 0.), uFenC)), ay = cross(uFenC, ax);
  float k = dot(d, uFenC);
  if (k > .05){
    vec2 w = vec2(dot(d, ax), dot(d, ay)) / k, u = abs(w) / uFenT.xy;
    if (croisee){
      float bord = max(u.x, u.y);
      float f = smoothstep(1.03, .97, bord) * smoothstep(.006, .016, abs(w.x)) * smoothstep(.006, .016, abs(w.y - .2 * uFenT.y));
      c += uFenT.w * f * (.78 + .3 * w.y / uFenT.y) * vec3(.98, .99, 1.);
      c += uFenT.w * .22 / (1. + bord * bord * 1.6);
      c += uScint * uFenT.w * 6. * pow(max(dot(d, normalize(uFenC + .55 * uFenT.x * ax + .7 * uFenT.y * ay)), 0.), 900.);
    } else {
      float bord = pow(pow(u.x, 4.) + pow(u.y, 4.), .25);  // un rectangle aux coins arrondis
      float f = smoothstep(1.2, .72, bord);                 // aux bords doux : un seul reflet, sans croisillons
      c += kf * uFenT.w * f * (.8 + .25 * w.y / uFenT.y) * vec3(.98, .99, 1.);
      c += uFenT.w * .25 / (1. + bord * bord * 1.4);       // le mur et le plafond, éclairés par la fenêtre
      // un coin de soleil dans la fenêtre : un éclat très lumineux, assez large pour baver dans le halo
      c += kf * uScint * uFenT.w * 4. * pow(max(dot(d, normalize(uFenC + .4 * uFenT.x * ax + .5 * uFenT.y * ay)), 0.), 260.);
    }
  }
  c += uLampe * pow(max(dot(d, normalize(vec3(.94, .2, -.26))), 0.), 22.);
  c += uLampe * .06 * pow(max(dot(d, normalize(vec3(-.9, .1, -.35))), 0.), 6.) * vec3(.6, .75, 1.);
  return c;
}
// le fond vu directement : bleu nuit lumineux, plus clair en haut, une lueur douce au centre (uv : 0..1, y en haut)
vec3 nuit(vec2 uv){
  if (uDecor < .5) return vec3(0.);
  return mix(vec3(.009, .014, .034), vec3(.034, .05, .105), uv.y) + vec3(.016, .022, .04) * exp(-dot(uv - vec2(.5, .6), uv - vec2(.5, .6)) * 5.);
}
// les tourbillons sur une sphère : deux tuiles du marbre par tour (raccord), la longitude tourne avec le temps
float tourb(vec3 n, float rot, float graine){
  vec2 c = vec2((atan(n.x, n.z) + rot) * .3183099, asin(clamp(n.y, -1., 1.)) * .42 + graine);
  vec2 f = texture(uMarbre, c * .5 + vec2(uT * .004, graine * .21)).gb;
  return texture(uMarbre, c + .14 * f).r;
}`;

  // bulles en vue de face : sphères analytiques, deux faces (reflet droit devant, renversé derrière), film, Fresnel
  const FS_BUB = FKR.fs(['couleur', 'bruit', 'lumiere'], COMMUN + `
uniform vec2 uRes; uniform int uN; uniform vec4 uB[${MAXB}]; uniform vec4 uB2[${MAXB}]; uniform vec4 uB3[${MAXB}];
out vec4 o;
// le fond : la pièce sombre derrière les bulles, et quelques lueurs lointaines, floues (profondeur de champ)
vec3 fond(vec2 uv){
  if (uDecor < .5) return vec3(0.);
  float a = uRes.x / uRes.y;
  vec3 c = nuit(uv);
  for (int i = 0; i < 6; i++){
    float fi = float(i);
    vec2 p = vec2(fract(sin(fi * 12.9 + 3.) * 437.) * a, .25 + .6 * fract(sin(fi * 7.3 + 1.) * 91.));
    float r = .05 + .07 * fract(sin(fi * 3.1) * 51.), dd = length(vec2(uv.x * a, uv.y) - p);
    vec3 tc = mod(fi, 3.) < 1. ? vec3(1., .62, .3) : (mod(fi, 3.) < 2. ? vec3(.45, .6, 1.) : vec3(.8, .85, .7));
    c += tc * .02 * smoothstep(r, r * .82, dd) * (.7 + .3 * smoothstep(r * .5, r, dd));
  }
  return c;
}
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec3 col = fond(vUv);
  vec3 v = vec3(0., 0., -1.);
  for (int i = 0; i < ${MAXB}; i++){
    if (i >= uN) break;
    vec4 b = uB[i], b2 = uB2[i], b3 = uB3[i];       // b : x, y, rayon, épaisseur moyenne (nm) · b2 : phase, âge, éclatement, graine · b3 : point d'éclatement
    vec2 q = (px - b.xy) / b.z;
    float r = length(q), aa = 1.3 / b.z;
    if (r > 1. + aa) continue;
    float cov = smoothstep(1. + aa, 1. - aa, r), lev = 0.;
    // trou d'éclatement qui s'agrandit, bordé d'un bourrelet de liquide
    if (b2.z > 0.){
      float dh = length(q - b3.xy) - b2.z * 2.2;
      cov *= smoothstep(-aa, aa, dh);
      lev = exp(-dh * dh / (.0012 + aa * aa));
      if (cov < .002 && lev < .01) continue;
    }
    vec2 qs = q * (min(r, 1. - .6 * aa) / max(r, 1e-5));
    float nz = sqrt(max(0., 1. - dot(qs, qs)));
    vec3 nf = vec3(qs.x, -qs.y, nz), nb = vec3(qs.x, -qs.y, -nz);
    // épaisseur : plus mince en haut (drainage), tourbillons de Marangoni qui tournent avec la bulle
    float top = .5 - .5 * nf.y, rot = b2.x * .3;
    float base = b.w * (.25 + 1.15 * pow(top, 1.3));
    float df = max(base * (1. + .32 * 1.1 * tourb(nf, rot, b2.w)), 0.), db = max(base * (1. + .32 * 1.1 * tourb(nb, rot, b2.w)), 0.);
    // face avant (convexe) : reflet droit de la pièce ; face arrière (concave, vue au travers) : reflet renversé, plus petit
    vec3 Rf = reflFilm(df, nz), Rb = reflFilm(db, nz);
    vec3 Lf = piece(reflect(v, nf), 1.), Lb = piece(reflect(v, vec3(-qs.x, qs.y, nz)), .3);
    float tf = 1. - luminance(Rf), tb = 1. - luminance(Rb);
    vec3 c = Rf * Lf + tf * Rb * Lb;
    // le bourrelet du trou : un tore de liquide épais, qui renvoie la lumière de la pièce
    c += lev * (.12 * Lf + .25);
    col = col * mix(1., tf * tb, cov) + c * max(cov, lev * step(0., b2.z));
  }
  o = vec4(col, 1.);
}`);

  // film vertical dans un cadre de fil d'acier : épaisseur en coin qui s'amincit, tourbillons, film noir en haut
  const FS_FRAME = FKR.fs(['couleur', 'bruit', 'lumiere', 'formes'], COMMUN + `
uniform vec2 uRes; uniform vec4 uBox; uniform float uAge, uSwirl, uFil; uniform int uNV; uniform vec4 uV[8];
out vec4 o;
float sdB(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
// un fil de métal (cylindre) : s = position en travers (−1 à 1), g = direction en travers (px, y vers le bas)
vec3 fil(float s, vec2 g){
  vec3 n = normalize(vec3(g.x * s, -g.y * s, sqrt(max(0., 1. - s * s))));
  vec3 rr = reflect(vec3(0., 0., -1.), n);
  float ci = n.z;
  vec3 f0 = vec3(.56, .57, .58);
  return (f0 + (1. - f0) * pow(1. - ci, 5.)) * piece(rr, 1.) * .35 + f0 * .004;
}
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 ctr = uBox.xy + .5 * uBox.zw, hb = .5 * uBox.zw;
  vec2 p = (px - uBox.xy) / uBox.zw;                    // 0..1 dans le cadre (y vers le bas)
  vec3 col = nuit(vUv);
  float sd = sdB(px - ctr, hb);
  if (sd < 1.){
    float cov = smoothstep(1., -1., sd);
    // déformation par des tourbillons qui dérivent (Marangoni, convection de l'air)
    vec2 w = p;
    for (int k = 0; k < 3; k++){ float s = float(k); w += uSwirl * .045 * texture(uMarbre, w * (.5 + .3 * s) + vec2(uT * .004 * (1. + s), s * .37 - uT * .003)).gb * (1. + s); }
    // régénération marginale : le long des bords verticaux, des lames plus minces remontent en panaches
    float mr = exp(-min(p.x, 1. - p.x) / .05) * uSwirl;
    w.y += mr * .06 * texture(uMarbre, vec2(p.x * 2.1, p.y * .7 + uT * .012)).r;
    for (int i = 0; i < 8; i++){ if (i >= uNV) break; vec4 v = uV[i]; vec2 d = w - v.xy; float r2 = dot(d, d); float a = v.z * exp(-r2 / .012); w = v.xy + mat2(cos(a), -sin(a), sin(a), cos(a)) * d; }
    // épaisseur : quelques nm en haut, plus d'un micron en bas ; tout s'amincit avec le temps
    float d = 1150. * pow(clamp(w.y, 0., 1.), 1.15) / (1. + uAge * .08) + 30. * texture(uMarbre, w * 2.3 + uT * .003).a;
    d = max(0., d - 22. * smoothstep(.0, 1., uAge / 25.));
    // bord de Plateau : le liquide se rassemble le long du fil (ménisque), surtout en bas où il s'écoule
    float dist = max(-sd, 0.) / uBox.z;
    d += 2400. * exp(-dist / .007) + 2400. * exp(-(1. - p.y) * uBox.w / uBox.z / .02);
    // ce que le film reflète : une grande fenêtre en face de lui (derrière l'observateur), un peu plus haut
    vec3 rd = normalize(vec3((p.x - .5) * .42, -(p.y - .5) * .42 * uBox.w / uBox.z, 1.));
    vec3 Rf = reflFilm(d, .99);
    col = col * mix(1., 1. - luminance(Rf), cov) + Rf * piece(rd, 1.) * cov;
  }
  if (uDecor > .5){
    // le cadre et son manche, en fil d'acier
    float rw = uFil, aw = abs(sd);
    if (aw < rw + 1.){
      vec2 e = vec2(1., 0.);
      vec2 g = normalize(vec2(sdB(px - ctr + e, hb) - sdB(px - ctr - e, hb), sdB(px - ctr + e.yx, hb) - sdB(px - ctr - e.yx, hb)) + 1e-6);
      col = mix(col, fil(clamp(sd / rw, -1., 1.), g), smoothstep(rw + 1., rw - 1., aw));
    }
    float sm = abs(px.x - ctr.x), rm = rw * 1.25;
    if (px.y > uBox.y + uBox.w && sm < rm + 1.) col = mix(col, fil(clamp((px.x - ctr.x) / rm, -1., 1.), vec2(1., 0.)) * (1. - .6 * smoothstep(0., uRes.y * .25, px.y - uBox.y - uBox.w)), smoothstep(rm + 1., rm - 1., sm));
  }
  o = vec4(col, 1.);
}`);

  // caténoïde entre deux anneaux de laiton (ou deux disques après la rupture)
  const FS_CAT = FKR.fs(['couleur', 'bruit', 'lumiere'], COMMUN + `
uniform vec2 uRes, uC; uniform float uA, uH, uS, uBroke, uNeck, uYaw, uPitch;
out vec4 o;
vec3 RT, UP, FW;
vec3 vue(vec3 d){ return vec3(dot(d, RT), dot(d, UP), -dot(d, FW)); }   // monde → repère de l'observateur (les lumières le suivent)
float F(vec3 p){ return length(p.xy) - (uBroke > .5 ? 0. : uA * cosh(p.z / uA) * uNeck); }
// un point du film : couleur réfléchie ; tr reçoit la part transmise
vec3 filmEn(vec3 h, vec3 rd, vec3 n, float d, out float tr){
  if (dot(n, rd) > 0.) n = -n;
  vec3 R = reflFilm(d, abs(dot(n, rd)));
  tr = 1. - luminance(R);
  return R * piece(vue(reflect(rd, n)), 1.);
}
void main(){
  vec2 uv = (gl_FragCoord.xy - uC) / uS;
  float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sp = sin(uPitch);
  vec3 ro = vec3(cy * cp, sy * cp, sp) * 3.3;
  FW = normalize(-ro); RT = normalize(cross(FW, vec3(0., 0., 1.))); UP = cross(RT, FW);
  vec3 rd = normalize(FW + uv.x * RT + uv.y * UP);
  // le fond : une pièce sombre, une lueur douce derrière les anneaux
  vec3 col = uDecor > .5 ? mix(vec3(.003, .0035, .005), vec3(.014, .016, .021), gl_FragCoord.y / uRes.y) + vec3(.02, .022, .03) * exp(-dot(uv, uv) * 6.) : vec3(0.);
  // tout tient dans un cylindre de rayon 1,05 et de demi-hauteur uH + 0,05 : on ne cherche que là
  float qa = dot(rd.xy, rd.xy), qb = 2. * dot(ro.xy, rd.xy), qc = dot(ro.xy, ro.xy) - 1.1025, qd = qb * qb - 4. * qa * qc;
  if (qd < 0.){ o = vec4(col, 1.); return; }
  float c0 = (-qb - sqrt(qd)) / (2. * qa), c1 = (-qb + sqrt(qd)) / (2. * qa);
  // les anneaux de laiton d'abord : ils cachent ce qui est derrière eux
  float tAnn = 1e9; vec3 cAnn = vec3(0.);
  for (int s = 0; s < 2; s++){
    float zz = s == 0 ? uH : -uH;
    float t = max(c0 - .05, 0.), dmin = 1e9, tmin = 0.;
    for (int i = 0; i < 120; i++){
      vec3 p = ro + rd * t; float dd = length(vec2(length(p.xy) - 1., p.z - zz)) - .03;
      if (dd < dmin){ dmin = dd; tmin = t; }
      bool fin = t > c1 + .05 || i == 119;
      if (fin && dmin < .004){ t = tmin; p = ro + rd * t; dd = 0.; }   // rayon rasant : on garde le point le plus proche du tube
      if (dd < .0012){
        if (t < tAnn){
          tAnn = t;
          vec3 n = normalize(p - vec3(normalize(p.xy), zz));
          vec3 f0 = vec3(.91, .64, .3);                  // laiton
          float ci = max(dot(n, -rd), 0.);
          cAnn = uDecor > .5 ? (f0 + (1. - f0) * pow(1. - ci, 5.)) * piece(vue(reflect(rd, n)), 1.) * .5 + f0 * .006 : vec3(uInk > .5 ? .02 : .5);
        }
        break;
      }
      t += max(dd, .0025); if (t > c1 + .05 && dmin >= .004) break;
    }
  }
  if (tAnn < 1e8) col = cAnn;
  float z0 = (-(uH + .05) - ro.z) / rd.z, z1 = ((uH + .05) - ro.z) / rd.z;
  float tA = max(max(c0, min(z0, z1)), 0.), tB = min(min(c1, max(z0, z1)), tAnn);
  vec3 acc = vec3(0.); float T = 1., tr;
  if (uBroke < .5 && tB > tA){
    // on avance le long du rayon et on repère les changements de signe de F (au plus deux surfaces visibles)
    float t = tA, prev = F(ro + rd * t); int hits = 0;
    for (int i = 0; i < 160; i++){
      if (t > tB) break;
      float tn = t + .035; vec3 p = ro + rd * tn; float f = F(p);
      if (sign(f) != sign(prev)){
        float a = t, b = tn; for (int k = 0; k < 10; k++){ float m = .5 * (a + b); if (sign(F(ro + rd * m)) == sign(prev)) a = m; else b = m; }
        float th = .5 * (a + b);
        if (th > tB) break;                                   // derrière un anneau (ou hors du volume) : caché
        vec3 h = ro + rd * th;
        if (abs(h.z) >= uH){ prev = f; t = tn; continue; }   // le film s'arrête aux anneaux (test au point exact : bord net)
        float rr = length(h.xy), sh = sinh(h.z / uA) * uNeck;
        vec3 n = normalize(vec3(h.xy / rr, -sh));
        // épaisseur : le film s'écoule vers le bas, le haut s'amincit ; tourbillons sur la surface (raccord autour de l'axe)
        vec2 tc = vec2(atan(h.y, h.x) * .3183099, h.z * .55);
        float sw = texture(uMarbre, tc + .12 * texture(uMarbre, tc * .5 + uT * .003).gb).r;
        float d = 350. * (.3 + .9 * (.5 - .5 * h.z / uH)) * (1. + .4 * sw);
        acc += T * filmEn(h, rd, n, d, tr); T *= tr;
        hits++; if (hits == 2) break;
      }
      prev = f; t = tn;
    }
  } else if (uBroke > .5) {
    // deux disques plats sur les anneaux
    for (int s = 0; s < 2; s++){
      float zz = s == 0 ? uH : -uH; float t = (zz - ro.z) / rd.z;
      if (t > 0. && t < tAnn){ vec3 h = ro + rd * t; float rh = length(h.xy); if (rh < 1.){
        float d = 500. * (1. - .6 * rh) + 60. * texture(uMarbre, h.xy * .6 + uT * .003).r;
        acc += T * filmEn(h, rd, vec3(0., 0., 1.), d, tr) * smoothstep(1., .98, rh); T *= mix(1., tr, smoothstep(1., .98, rh)); } }
    }
  }
  o = vec4(col * T + acc, 1.);
}`);

  window.FASC.push({
    id: 'bulles', name: 'Les Bulles', cat: 'Cosmos', glyph: '○', decor: true, smoothTime: true,
    blurb: 'Interférences en film mince, film noir, surfaces minimales',
    hint: 'OBSERVER : touchez une bulle pour lire l’épaisseur de son film · SOUFFLER : touchez pour une nouvelle bulle, glissez pour faire un courant d’air · ÉCLATER : touchez une bulle · ÉCARTER : glissez verticalement pour écarter les anneaux.',
    intro: 'Une bulle de savon est une lame d’eau mille fois plus fine qu’un cheveu. La lumière s’y réfléchit deux fois, sur chaque face, et les deux reflets se renforcent ou s’annulent selon la couleur : c’est l’arc-en-ciel du savon. En s’amincissant, la bulle change de couleur, devient noire en haut, puis éclate.',
    legend: [
      { color: '#ffffff', name: 'Film épais', role: 'plus d’un micron · blanc nacré', desc: 'Quand le film est épais, toutes les couleurs se mélangent : il paraît blanc argenté.' },
      { color: '#e040c0', name: 'Magenta et vert', role: 'ordres d’interférence', desc: 'Entre 200 et 1 000 nm, les couleurs se suivent toujours dans le même ordre, en bandes qui se répètent : les ordres de Newton.' },
      { color: '#c8a050', name: 'Or et bleu', role: 'premier ordre · ~100 à 300 nm', desc: 'Les couleurs les plus vives, juste avant que le film ne devienne trop mince pour colorer la lumière.' },
      { color: '#000000', name: 'Film noir', role: 'moins de 30 nm', desc: 'Les deux reflets s’annulent pour toutes les couleurs : le haut de la bulle devient noir, transparent. Elle va éclater.' },
      { color: '#9fd8ff', name: 'Tourbillons de Marangoni', role: 'différences de tension de surface', desc: 'Là où le savon est moins concentré, la tension de surface est plus forte et tire le film : des tourbillons colorés naissent et dérivent.' },
      { color: '#c09aff', name: 'Caténoïde', role: 'surface minimale · Euler, 1744', desc: 'Entre deux anneaux, le film prend la forme qui a la plus petite aire possible. Au-delà d’un certain écartement, il n’en existe plus : il se coupe en deux.' },
    ],
    about: [
      'Isaac Newton étudie les couleurs des bulles en 1704 dans son Opticks : il remarque que les couleurs se succèdent toujours dans le même ordre, et que le haut d’une bulle devient noir juste avant qu’elle n’éclate. Il en déduit l’épaisseur du film, sans savoir encore que la lumière est une onde. Thomas Young donne l’explication en 1801 : la lumière réfléchie par la face avant et celle réfléchie par la face arrière interfèrent.',
      'La simulation calcule ce phénomène pour seize longueurs d’onde, de 400 à 700 nm, puis convertit le spectre obtenu en couleur comme le fait l’œil (fonctions colorimétriques de la CIE, 1931). C’est pour cela qu’on retrouve la vraie séquence : blanc argenté, puis bandes vertes et magenta, puis or, bleu, et enfin noir. Une différence de 100 nanomètres change complètement la teinte.',
      'L’eau s’écoule vers le bas sous son propre poids : le haut s’amincit, le bas s’épaissit, et les bandes colorées descendent. En même temps, les variations de concentration du savon créent des différences de tension de surface qui font tourbillonner le film (effet Marangoni, 1865). Quand le film atteint une trentaine de nanomètres, il devient noir ; une perturbation suffit alors à ouvrir un trou, qui s’agrandit à près de 10 mètres par seconde.',
      'Le film de savon cherche toujours l’aire la plus petite : c’est une « surface minimale ». Joseph Plateau en a établi les lois en 1873 en trempant des fils de fer dans du savon. Entre deux anneaux, la surface minimale est une caténoïde, découverte par Euler en 1744. Si l’on écarte les anneaux au-delà de 1,33 fois leur rayon, il n’y a plus de solution : le col se pince et le film se coupe d’un coup en deux disques plats.',
      'Ce qui est mis en scène : le film ne renvoie que quelques pour cent de la lumière, on y voit donc surtout le reflet de la pièce. La fenêtre, la lampe et le fond sombre sont un décor choisi pour faire ressortir les couleurs ; les couleurs, elles, sont calculées.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une bulle ou le film : épaisseur locale et couleur attendue.' },
      { id: 'souffler', label: 'souffler', desc: 'Touchez pour faire une bulle ; glissez pour souffler un courant d’air (ou des tourbillons dans le film).' },
      { id: 'eclater', label: 'éclater', desc: 'Touchez une bulle pour la crever.' },
      { id: 'ecarter', label: 'écarter', desc: 'Caténoïde : glissez verticalement pour écarter ou rapprocher les anneaux ; horizontalement pour tourner autour.' },
    ],
    make(env) {
      try { return makeBub(env); } catch (e) {
        console.warn('Les Bulles : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#05060a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Les Bulles demandent WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeBub(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = { scene: 'bulles', life: 1, wind: 0.5, auto: true, swirl: 1, sep: 0.45, sepAuto: true, yaw: 0.5, pitch: 0.25, q: 'haute' };
    let T = 0, label = null, lastDt = 1 / 60;

    /* ───────── la cabine FKR : lumière HDR, halo, AgX, grain ───────── */
    let R, P, lutT, marT, gouttes;
    function construire() {
      R = FKR.cabine(env, { halo: 0.06, rayon: 0.7 });
      const K = R.K, gl = R.gl;
      P = { lut: K.program(FS_LUT), marbre: K.program(FS_MARBRE), bub: K.program(FS_BUB), frame: K.program(FS_FRAME), cat: K.program(FS_CAT) };
      lutT = K.target(LUTN, 1);
      P.lut.use(); K.run(P.lut, lutT);
      marT = K.target(512, 512);
      P.marbre.use().f('uP', 4); K.run(P.marbre, marT);
      gl.bindTexture(gl.TEXTURE_2D, marT.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gouttes = R.lot({ forme: 'gauss' });
    }
    construire();
    const LAMPE = FKR.couleur.corpsNoir(3000).map((c) => c * 3.2), LAMPE_N = FKR.couleur.corpsNoir(3000), BLANC = [1, 1, 1.02];

    /* ───────── les bulles ───────── */
    let B = [], drops = [];
    function addBubble(x, y, r) {
      if (B.length >= MAXB) return;
      const m = Math.min(view().w, H);
      B.push({ x, y, r: r || m * rnd(0.16, 0.06), vx: rnd(10, -10), vy: rnd(-5, -20), d0: rnd(850, 520), age: 0, life: rnd(26, 12) * cfg.life, ph: rnd(TAU), seed: rnd(50), pop: 0, px: 0, py: 0, grow: 0 });
    }
    function pop(b, x, y) {
      if (b.pop) return;
      b.pop = 0.001; b.px = clamp((x - b.x) / b.r, -0.9, 0.9); b.py = clamp((y - b.y) / b.r, -0.9, 0.9);
      // gouttelettes projetées par le bord qui se rétracte
      for (let i = 0; i < 18; i++) { const a = rnd(TAU); drops.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * rnd(260, 80), vy: Math.sin(a) * rnd(260, 80), life: rnd(0.5, 0.2), teinte: Math.random() < 0.3 ? LAMPE_N : BLANC }); }
      if (snd()) { au.noise(0.05, 0.12, 3500, 1.2, 'bandpass'); au.noise(0.12, 0.05, 900, 1, 'lowpass'); }
    }
    let wind = [];
    function stepBubbles(dt) {
      const v = view();
      for (const b of B) {
        b.age += dt; b.ph += dt;
        // le film s'amincit ; une bulle « vieille » se perce quand son sommet est noir
        if (!b.pop && b.age > b.life) pop(b, b.x, b.y - b.r * 0.85);
        if (b.pop) { b.pop += dt * 6; continue; }
        // air : légère chute, dérive, courants
        const fx = Math.sin(T * 0.13 + b.seed) * 6 * cfg.wind + Math.sin(T * 0.07 + b.y * 0.004) * 8 * cfg.wind;
        const fy = 4 + Math.cos(T * 0.11 + b.seed * 2) * 5 * cfg.wind;
        b.vx += (fx - b.vx * 0.4) * dt; b.vy += (fy - b.vy * 0.4) * dt;
        for (const w of wind) { const d = Math.hypot(b.x - w.x, b.y - w.y); if (d < w.r) { b.vx += w.vx * dt * 3 * (1 - d / w.r); b.vy += w.vy * dt * 3 * (1 - d / w.r); } }
        for (const c of B) { if (c === b || c.pop) continue; const dx = b.x - c.x, dy = b.y - c.y, d = Math.hypot(dx, dy), m = b.r + c.r; if (d < m && d > 0) { const k = ((m - d) / m) * 40 * dt; b.vx += (dx / d) * k * 10; b.vy += (dy / d) * k * 10; } }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < v.x0 + b.r) { b.x = v.x0 + b.r; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x > v.x1 - b.r) { b.x = v.x1 - b.r; b.vx = -Math.abs(b.vx) * 0.5; }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.5; }
        if (b.y > H - b.r) { pop(b, b.x, b.y + b.r); }
      }
      B = B.filter((b) => !b.pop || b.pop < 1);
      for (const d of drops) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 600 * dt; d.life -= dt; }
      drops = drops.filter((d) => d.life > 0);
      wind = wind.filter((w) => (w.t -= dt) > 0);
      if (cfg.auto && B.length < 5 && Math.random() < dt * 0.6) addBubble(v.x0 + rnd(v.w * 0.8, v.w * 0.2), H * rnd(0.9, 0.6));
    }
    const thick = (b) => b.d0 * Math.max(0.03, 1 - (b.age / b.life) * 0.97);

    /* ───────── film dans un cadre ───────── */
    let filmAge = 0, vort = [];
    const cadreBox = () => { const v = view(), y0f = (env.view && env.view.y0) || 0, Hf = H - y0f, cyf = y0f + Hf / 2, fw = Math.min(v.w * 0.62, Hf * 0.62), fh = Math.min(Hf * 0.78, fw * 1.25); return { x: v.cx - fw / 2, y: cyf - fh / 2, w: fw, h: fh }; }; // sous la barre du haut (version jeunesse)
    /* ───────── caténoïde ───────── */
    let cat = { a: 1, broke: false, neck: 1, brokeT: 0 };
    function solveA(h) {
      // r(±h) = 1 : a ch(h/a) = 1, plus grande racine (la stable) ; aucune si h > 0,6627
      if (h > 0.66274) return null;
      let a = 0.9;
      for (let i = 0; i < 60; i++) { const f = a * Math.cosh(h / a) - 1, df = Math.cosh(h / a) - (h / a) * Math.sinh(h / a); a -= f / df; if (a < 0.05) a = 0.05; }
      // vérifie que c'est la racine du haut (col le plus large)
      return a;
    }

    /* ───────── boucle ───────── */
    function update(dt) {
      const k = dt / 0.4;
      T += k;
      if (cfg.scene === 'bulles') stepBubbles(k);
      if (cfg.scene === 'cadre') { filmAge += k; vort.forEach((v) => (v.s *= Math.exp(-k * 0.3))); vort = vort.filter((v) => Math.abs(v.s) > 0.05); if (filmAge > 45) { filmAge = 0; if (snd()) au.noise(0.06, 0.1, 3000, 1, 'bandpass'); } }
      if (cfg.scene === 'cate') {
        if (cfg.sepAuto) cfg.sep = 0.4 + 0.3 * (0.5 - 0.5 * Math.cos(T * 0.08));
        const a = solveA(cfg.sep);
        if (a == null) { if (!cat.broke) { cat.broke = true; cat.brokeT = T; if (snd()) au.noise(0.08, 0.1, 2500, 1, 'bandpass'); } }
        else if (cat.broke && cfg.sepAuto && cfg.sep < 0.45) { cat.broke = false; cat.a = a; } // en mode automatique, on retrempe
        else if (!cat.broke) cat.a = a;
        cfg.yaw += k * 0.03;
      }
      if (label) label.t += k;
    }
    // ce que reflète chaque scène : la fenêtre (direction, demi-taille, croisillons, luminance) et la lampe
    const FEN = {
      bulles: { c: [-0.3, 0.62, 0.72], t: [0.36, 0.28, 0, 22] },
      cadre: { c: [0.04, 0.12, 1], t: [0.55, 0.44, 0, 18] },
      cate: { c: [-0.36, 0.32, 0.88], t: [0.9, 1.1, 1, 14] },
    };
    // la pièce : couleur du sol et du plafond, part reflétée au centre des bulles ; le halo de chaque scène
    const SALLE = { bulles: [[0.5, 0.46, 0.44], [2, 2.3, 3], 0.3], cadre: [[0.5, 0.46, 0.44], [2, 2.3, 3], 1], cate: [[0.006, 0.007, 0.009], [0.05, 0.055, 0.065], 1] };
    const HALO = { bulles: 0.2, cadre: 0.15, cate: 0.06 };
    function render() {
      if (R.perdu) { if (R.gl.isContextLost()) return; try { construire(); } catch (e) { return; } }
      const sx = R.sx, cw = R.cw, ch = R.ch;
      // sans décor, le fond reste sombre même en thème clair : un film qui ne renvoie que quelques % de la lumière
      // serait invisible sur un fond crème (c'est vrai aussi d'une vraie bulle devant un mur blanc)
      const bare = env.decor === false, ink = false, v = view();
      const fen = FEN[cfg.scene], fc = fen.c, nf = Math.hypot(fc[0], fc[1], fc[2]);
      const sa = SALLE[cfg.scene];
      R.regler({ halo: HALO[cfg.scene] });
      R.debut(lastDt);
      const commun = (Pg) => Pg.f('uSalleB', sa[0][0], sa[0][1], sa[0][2]).f('uSalleH', sa[1][0], sa[1][1], sa[1][2]).f('uCentre', sa[2]).t('uFilm', lutT).t('uMarbre', marT).f('uT', T).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uScint', env.doux ? 0.5 : 1)
        .f('uFenC', fc[0] / nf, fc[1] / nf, fc[2] / nf).f('uFenT', fen.t[0], fen.t[1], fen.t[2], fen.t[3]).f('uLampe', LAMPE[0], LAMPE[1], LAMPE[2]);
      if (cfg.scene === 'bulles') {
        const A = new Float32Array(MAXB * 4), A2 = new Float32Array(MAXB * 4), A3 = new Float32Array(MAXB * 4);
        B.forEach((b, i) => { A.set([b.x * sx, b.y * sx, b.r * sx, thick(b)], i * 4); A2.set([b.ph, b.age, b.pop, b.seed], i * 4); A3.set([b.px, b.py, 0, 0], i * 4); });
        commun(P.bub.use()).f('uRes', cw, ch).i('uN', B.length).v4('uB', A).v4('uB2', A2).v4('uB3', A3);
        R.passe(P.bub);
        // les gouttelettes du bord qui se rétracte : de petites perles qui renvoient la fenêtre, en traînées
        gouttes.vider();
        for (const d of drops) { const a = clamp(d.life * 3, 0, 1) * (bare ? 2 : 5) * (env.doux ? 0.6 : 1), c = d.teinte; gouttes.trainee(d.x, d.y, d.vx * 0.012, d.vy * 0.012, 1.3, a * c[0], a * c[1], a * c[2]); }
        gouttes.dessiner();
      } else if (cfg.scene === 'cadre') {
        const bx = cadreBox();
        const VV = new Float32Array(32); vort.slice(0, 8).forEach((q, i) => VV.set([q.x, q.y, q.s, 0], i * 4));
        commun(P.frame.use()).f('uRes', cw, ch).f('uBox', bx.x * sx, bx.y * sx, bx.w * sx, bx.h * sx).f('uAge', filmAge).f('uSwirl', cfg.swirl).f('uFil', 3 * sx)
          .i('uNV', Math.min(8, vort.length)).v4('uV', VV);
        R.passe(P.frame);
      } else {
        const y0 = (env.view && env.view.y0) || 0, Hd = H - y0;
        commun(P.cat.use()).f('uRes', cw, ch).f('uC', v.cx * sx, (Hd / 2) * sx).f('uS', Math.min(v.w, Hd) * 1.05 * sx).f('uA', cat.a).f('uH', cfg.sep).f('uBroke', cat.broke ? 1 : 0).f('uNeck', cat.broke ? 0 : 1)
          .f('uYaw', cfg.yaw).f('uPitch', cfg.pitch);
        R.passe(P.cat);
      }
      R.fin(lastDt);
      hud(ink);
      drawLabel();
    }
    function hud(ink) {
      const v = view();
      ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink ? 'rgba(40,30,80,.75)' : 'rgba(230,228,255,.6)';
      let s = '';
      if (cfg.scene === 'bulles') s = `${B.filter((b) => !b.pop).length} BULLES · FILM DE ${Math.round(Math.min(...B.map(thick).concat([9999])))} À ${Math.round(Math.max(...B.map(thick).concat([0])))} NM`;
      if (cfg.scene === 'cadre') s = `FILM VERTICAL · ${Math.round(filmAge)} S · LE HAUT S’AMINCIT ET DEVIENT NOIR`;
      if (cfg.scene === 'cate') s = cat.broke ? `ÉCARTEMENT ${fr(cfg.sep, 3)} > 0,663 : PLUS DE SURFACE MINIMALE, DEUX DISQUES` : `CATÉNOÏDE · DEMI-ÉCARTEMENT / RAYON = ${fr(cfg.sep, 3)} (RUPTURE À 0,663) · COL ${fr(cat.a, 2)}`;
      ctx.fillText(s, v.x0 + 16, H - 16); ctx.restore();
    }
    let pending = false;
    function frame(t, dt) {
      if (dt > 0) { update(dt); lastDt = dt; }
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    /* ───────── identification ───────── */
    const ORDER = (d) => (d < 30 ? 'film noir : il va éclater' : d < 120 ? 'gris et blanc du premier ordre' : d < 350 ? 'or, rouge et bleu du premier ordre' : d < 650 ? 'violet, bleu, vert du deuxième ordre' : d < 1000 ? 'magenta et vert des ordres supérieurs' : 'blanc argenté, film épais');
    function describe(l) {
      if (cfg.scene === 'bulles') {
        const b = l.b;
        if (!b) return ['Air', 'rien ici · l’outil SOUFFLER fait naître une bulle', '#9fd8ff'];
        const ny = clamp((l.y - b.y) / b.r, -1, 1), d = thick(b) * (0.25 + 1.15 * Math.pow(0.5 + 0.5 * ny, 1.3));
        return ['Bulle de savon', `≈ ${Math.round(d)} nm à cet endroit · ${ORDER(d)} · Ø ${fr((b.r / Math.min(view().w, H)) * 20, 1)} cm`, '#9fd8ff'];
      }
      if (cfg.scene === 'cadre') return ['Film de savon', 'épaisseur croissante vers le bas : les bandes sont des lignes d’égale épaisseur', '#c09aff'];
      return cat.broke ? ['Deux disques', 'la caténoïde a disparu : chaque anneau garde un film plat', '#c09aff'] : ['Caténoïde', `r(z) = a ch(z/a), a = ${fr(cat.a, 3)} · courbure moyenne nulle en tout point`, '#c09aff'];
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

    function setScene(id) {
      cfg.scene = id; label = null;
      if (id === 'bulles' && !B.length) { const v = view(); for (let i = 0; i < 5; i++) addBubble(v.x0 + rnd(v.w * 0.85, v.w * 0.15), H * rnd(0.85, 0.25)); B.forEach((b) => (b.age = rnd(b.life * 0.6))); }
      if (id === 'cadre') { filmAge = 0; vort = []; }
      if (id === 'cate') { cat.broke = false; }
    }
    if (window.FASC_DEBUG) window.FASC_DEBUG.bul = { cfg, setScene, get B() { return B; }, run(n, h) { for (let i = 0; i < n; i++) update(h); render(); }, addBubble };

    setScene('bulles');
    let last = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool; last = { x: p.x, y: p.y };
        const hit = B.find((b) => !b.pop && Math.hypot(p.x - b.x, p.y - b.y) < b.r);
        if (tool === 'observer') { label = { x: p.x, y: p.y, t: 0, b: hit }; return; }
        if (cfg.scene === 'bulles') {
          if (tool === 'eclater' && hit) pop(hit, p.x, p.y);
          if (tool === 'souffler' && !hit) { addBubble(p.x, p.y, Math.min(view().w, H) * rnd(0.14, 0.07)); if (snd()) au.note(rnd(700, 500), 0.25, 'sine', 0.03, rnd(1100, 900)); }
        }
        if (cfg.scene === 'cadre' && tool === 'eclater') { filmAge = 60; }
      },
      move(p) {
        if (!p.down || !last) return;
        const tool = env.tool;
        if (cfg.scene === 'bulles' && tool === 'souffler') wind.push({ x: p.x, y: p.y, vx: p.dx * 30, vy: p.dy * 30, r: Math.min(view().w, H) * 0.25, t: 0.6 });
        if (cfg.scene === 'cadre' && tool === 'souffler' && vort.length < 8) {
          const bx = cadreBox();
          if (Math.random() < 0.3) vort.push({ x: (p.x - bx.x) / bx.w, y: (p.y - bx.y) / bx.h, s: clamp(p.dx * 0.05, -2, 2) });
        }
        if (cfg.scene === 'cate' && tool === 'ecarter') { cfg.sepAuto = false; cfg.sep = clamp(cfg.sep + p.dy * 0.003, 0.1, 0.9); cfg.yaw -= p.dx * 0.006; }
      },
      up() { last = null; },
      clear() { if (cfg.scene === 'bulles') { B.forEach((b) => pop(b, b.x, b.y)); } else if (cfg.scene === 'cadre') filmAge = 0; else { cfg.sep = 0.4; cat.broke = false; } },
      dispose() { R.detruire(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: [
          { label: 'Bulles de savon', act: () => setScene('bulles') },
          { label: 'Film dans un cadre', act: () => setScene('cadre') },
          { label: 'Caténoïde', act: () => setScene('cate') },
        ] });
        if (cfg.scene === 'bulles') {
          L.push({ type: 'section', label: 'Bulles' });
          L.push({ type: 'slider', label: 'Durée de vie', min: 0.3, max: 3, step: 0.01, value: cfg.life, fmt: (x) => '≈ ' + Math.round(19 * x) + ' s', set: (x) => { cfg.life = x; } });
          L.push({ type: 'slider', label: 'Courants d’air', min: 0, max: 2, step: 0.01, value: cfg.wind, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.wind = x; } });
          L.push({ type: 'toggle', label: 'De nouvelles bulles arrivent', value: cfg.auto, set: (x) => { cfg.auto = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Souffler cinq bulles', act: () => { const v = view(); for (let i = 0; i < 5; i++) addBubble(v.x0 + rnd(v.w * 0.85, v.w * 0.15), H * rnd(0.9, 0.5)); } }, { label: 'Tout éclater', act: () => B.forEach((b) => pop(b, b.x, b.y)) }] });
        }
        if (cfg.scene === 'cadre') {
          L.push({ type: 'section', label: 'Film' });
          L.push({ type: 'bar', label: 'Âge du film', color: '#c09aff', value: clamp(filmAge / 45, 0, 1), txt: Math.round(filmAge) + ' s' });
          L.push({ type: 'slider', label: 'Tourbillons', min: 0, max: 2, step: 0.01, value: cfg.swirl, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.swirl = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Retremper le cadre', act: () => { filmAge = 0; vort = []; } }] });
          L.push({ type: 'note', text: 'Avec l’outil SOUFFLER, glissez sur le film pour y lancer des tourbillons.' });
        }
        if (cfg.scene === 'cate') {
          L.push({ type: 'section', label: 'Deux anneaux' });
          L.push({ type: 'slider', label: 'Demi-écartement / rayon', min: 0.1, max: 0.9, step: 0.001, value: cfg.sep, fmt: (x) => fr(x, 3) + (x > 0.6627 ? ' · au-delà de la rupture' : ''), set: (x) => { cfg.sep = x; cfg.sepAuto = false; } });
          L.push({ type: 'toggle', label: 'Écarter et rapprocher tout seul', value: cfg.sepAuto, set: (x) => { cfg.sepAuto = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Retremper les anneaux', act: () => { cfg.sep = Math.min(cfg.sep, 0.6); cat.broke = false; cat.a = solveA(cfg.sep) || cat.a; } }] });
          L.push({ type: 'note', text: 'Une fois coupé, le film ne se reforme pas tout seul quand on rapproche les anneaux : il faut le retremper.' });
        }
        return L;
      },
    };
  }
})();
