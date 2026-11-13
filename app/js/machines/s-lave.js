/* Fascination — La Lampe à lave · convection : cire, cellules de Bénard, granulation du Soleil (WebGL2)
   Lampe : Navier-Stokes incompressible (semi-lagrangien, projection de Jacobi) dans le verre en forme de fuseau ;
   la cire est un champ de phase de Cahn-Hilliard (deux liquides qui ne se mélangent pas, tension de surface par
   la force de Korteweg μ∇φ) ; température advectée et diffusée, chauffée par l'ampoule en bas et refroidie en haut.
   La cire chaude se dilate et devient plus légère que le liquide : poussée d'Archimède ∝ (T − Tn).
   Bénard : même solveur, un seul liquide entre une plaque chaude et une plaque froide.
   Soleil : granulation de la photosphère dessinée par cellules de Voronoï qui naissent et meurent, taches solaires. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const QUAL = { legere: { gw: 96, jac: 18, sub: 2 }, normale: { gw: 120, jac: 24, sub: 3 }, haute: { gw: 150, jac: 30, sub: 3 } };

  const BC = `
uniform sampler2D uM; uniform vec2 uPx;
bool solid(vec2 uv){ return uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1. || texture(uM, uv).r > .5; }
`;
  const FS = {
    adv: HEAD + BC + `uniform sampler2D uV, uQ; uniform float uDt, uKeep; out vec4 o;
void main(){
  if (solid(vUv)){ o = texture(uQ, vUv) * uKeep; return; }
  vec2 v = texture(uV, vUv).xy;
  o = texture(uQ, vUv - uDt * v * uPx);
}`,
    // potentiel chimique de Cahn-Hilliard (φ = 1 dans la cire, −1 dans le liquide)
    mu: HEAD + BC + `uniform sampler2D uS; uniform float uE2; out vec4 o;
float ph(vec2 uv, float c){ return solid(uv) ? c : texture(uS, uv).r; }
void main(){
  float c = texture(uS, vUv).r;
  float lap = ph(vUv + vec2(uPx.x, 0.), c) + ph(vUv - vec2(uPx.x, 0.), c) + ph(vUv + vec2(0., uPx.y), c) + ph(vUv - vec2(0., uPx.y), c) - 4. * c;
  o = vec4(c * c * c - c - uE2 * lap, 0., 0., 1.);
}`,
    // cire (Cahn-Hilliard), température (diffusion, ampoule, refroidissement), colorant
    upd: HEAD + BC + `uniform sampler2D uS, uMu; uniform float uDt, uMob, uKap, uHeat, uCool, uMode, uRoom; uniform vec4 uB[8]; uniform int uNB; uniform vec2 uRes;
out vec4 o;
float mu(vec2 uv, float c){ return solid(uv) ? c : texture(uMu, uv).r; }
vec4 S(vec2 uv, vec4 c){ return solid(uv) ? c : texture(uS, uv); }
void main(){
  vec4 s = texture(uS, vUv);
  if (solid(vUv)){ o = s; return; }
  float m = texture(uMu, vUv).r;
  float lm = mu(vUv + vec2(uPx.x, 0.), m) + mu(vUv - vec2(uPx.x, 0.), m) + mu(vUv + vec2(0., uPx.y), m) + mu(vUv - vec2(0., uPx.y), m) - 4. * m;
  vec4 l = S(vUv + vec2(uPx.x, 0.), s), r = S(vUv - vec2(uPx.x, 0.), s), u = S(vUv + vec2(0., uPx.y), s), d = S(vUv - vec2(0., uPx.y), s);
  float lapT = l.g + r.g + u.g + d.g - 4. * s.g;
  float phi = clamp(s.r + uDt * uMob * lm, -1.05, 1.05);
  float T = s.g + uDt * uKap * lapT;
  float y = vUv.y, x = vUv.x;
  if (uMode < .5){
    // ampoule sous le verre : chauffe le bas, au centre ; le haut se refroidit dans l'air de la pièce
    T += uDt * uHeat * (1.25 - T) * exp(-pow((x - .5) / .22, 2.) - pow(y / .07, 2.));
    T += uDt * uCool * (uRoom - T) * smoothstep(.7, 1., y);
    T += uDt * .0006 * (uRoom - T);
  } else {
    // Bénard : plaque chaude en bas, plaque froide en haut
    T += uDt * .25 * ((1. - T) * smoothstep(.04, 0., y) + (0. - T) * smoothstep(.96, 1., y)) * uHeat;
  }
  // doigts : chauffer ou refroidir
  vec2 px = vUv * uRes;
  for (int i = 0; i < 8; i++){ if (i >= uNB) break; vec4 b = uB[i]; float k = exp(-dot(px - b.xy, px - b.xy) / (b.z * b.z)); T += uDt * b.w * k; }
  o = vec4(phi, clamp(T, -.1, 1.4), s.b, 1.);
}`,
    // forces : poussée d'Archimède, tension de surface (Korteweg), mains
    frc: HEAD + BC + `uniform sampler2D uV, uS, uMu; uniform float uDt, uG, uAw, uAl, uTn, uSig, uMode, uDamp; uniform vec4 uP[8]; uniform vec4 uPV[8]; uniform int uNP; uniform vec2 uRes;
out vec4 o;
void main(){
  if (solid(vUv)){ o = vec4(0.); return; }
  vec2 v = texture(uV, vUv).xy;
  vec4 s = texture(uS, vUv);
  float w = clamp(s.r * .5 + .5, 0., 1.);
  float b = uMode < .5 ? w * uAw * (s.g - uTn) + (1. - w) * uAl * (s.g - .5) - w * .004 : uAw * (s.g - .5);
  v.y += uDt * uG * b;
  if (uMode < .5){
    float m = texture(uMu, vUv).r;
    vec2 gp = vec2(texture(uS, vUv + vec2(uPx.x, 0.)).r - texture(uS, vUv - vec2(uPx.x, 0.)).r, texture(uS, vUv + vec2(0., uPx.y)).r - texture(uS, vUv - vec2(0., uPx.y)).r) * .5;
    v += uDt * uSig * m * gp;
  }
  vec2 px = vUv * uRes;
  for (int i = 0; i < 8; i++){ if (i >= uNP) break; vec4 p = uP[i]; float k = exp(-dot(px - p.xy, px - p.xy) / (p.z * p.z)); v = mix(v, uPV[i].xy, k * p.w); }
  o = vec4(v * uDamp, 0., 1.);
}`,
    div: HEAD + BC + `uniform sampler2D uV; out vec4 o;
float vx(vec2 uv, float c){ return solid(uv) ? -c : texture(uV, uv).x; }
float vy(vec2 uv, float c){ return solid(uv) ? -c : texture(uV, uv).y; }
void main(){
  vec2 C = texture(uV, vUv).xy;
  o = vec4(.5 * (vx(vUv + vec2(uPx.x, 0.), C.x) - vx(vUv - vec2(uPx.x, 0.), C.x) + vy(vUv + vec2(0., uPx.y), C.y) - vy(vUv - vec2(0., uPx.y), C.y)), 0., 0., 1.);
}`,
    jac: HEAD + BC + `uniform sampler2D uP, uD; out vec4 o;
float p(vec2 uv, float c){ return solid(uv) ? c : texture(uP, uv).x; }
void main(){ float c = texture(uP, vUv).x; o = vec4((p(vUv + vec2(uPx.x, 0.), c) + p(vUv - vec2(uPx.x, 0.), c) + p(vUv + vec2(0., uPx.y), c) + p(vUv - vec2(0., uPx.y), c) - texture(uD, vUv).x) * .25, 0., 0., 1.); }`,
    grd: HEAD + BC + `uniform sampler2D uP, uV; out vec4 o;
float p(vec2 uv, float c){ return solid(uv) ? c : texture(uP, uv).x; }
void main(){
  if (solid(vUv)){ o = vec4(0.); return; }
  float c = texture(uP, vUv).x;
  vec2 v = texture(uV, vUv).xy - .5 * vec2(p(vUv + vec2(uPx.x, 0.), c) - p(vUv - vec2(uPx.x, 0.), c), p(vUv + vec2(0., uPx.y), c) - p(vUv - vec2(0., uPx.y), c));
  o = vec4(v, 0., 1.);
}`,
  };
  // rendu de la lampe : liquide éclairé par l'ampoule, cire translucide, verre
  const FS_LAMP = HEAD + `
uniform sampler2D uS, uM; uniform vec2 uRes, uPx; uniform vec4 uBox; uniform vec3 uWax, uLiq; uniform float uDecor, uInk, uOn, uT;
out vec4 o;
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 uv = vec2((px.x - uBox.x) / uBox.z, 1. - (px.y - uBox.y) / uBox.w);
  vec3 paper = vec3(.953, .933, .89);
  // la pièce, sombre, éclairée par la lampe
  vec2 lc = vec2(uBox.x + uBox.z * .5, uBox.y + uBox.w * .8);
  float gl = exp(-length((px - lc) / uRes.y) * 3.2) * uOn;
  vec3 col = uDecor > .5 ? vec3(.02, .018, .03) + uLiq * gl * .35 + vec3(.012) * (1. - vUv.y) : (uInk > .5 ? paper : vec3(0.));
  bool inGlass = uv.x > 0. && uv.x < 1. && uv.y > 0. && uv.y < 1. && texture(uM, uv).r < .5;
  if (inGlass){
    vec4 s = texture(uS, uv);
    float w = smoothstep(-.35, .35, s.r);
    vec2 g = vec2(texture(uS, uv + vec2(uPx.x, 0.)).r - texture(uS, uv - vec2(uPx.x, 0.)).r, texture(uS, uv + vec2(0., uPx.y)).r - texture(uS, uv - vec2(0., uPx.y)).r);
    vec3 n = normalize(vec3(-g * 1.4, 1.));
    float light = (.25 + 1.4 * exp(-uv.y * 2.6)) * (.25 + .75 * uOn);
    float spec = pow(max(dot(n, normalize(vec3(-.4, .5, .8))), 0.), 22.);
    float rim = clamp(length(g) * 1.5, 0., 1.);
    vec3 hot = mix(uWax, vec3(1., .8, .45), clamp((s.g - .6) * .8, 0., .25));
    vec3 liq = uLiq * light * .55;
    vec3 wax = hot * (.35 + .9 * light) * (.75 + .25 * n.z) + vec3(1., .95, .85) * spec * .35 * uOn + hot * rim * .4;
    vec3 inside = mix(liq, wax, w);
    // le verre : reflets verticaux, bords plus sombres
    float ex = abs(uv.x - .5) * 2.;
    inside *= .85 + .15 * (1. - ex * ex);
    inside += vec3(1.) * (smoothstep(.06, 0., abs(uv.x - .3)) * .06 + smoothstep(.03, 0., abs(uv.x - .72)) * .04) * (uDecor > .5 ? 1. : 0.);
    if (uDecor < .5) inside = uInk > .5 ? mix(paper, vec3(.15, .1, .3), w * .85 + rim * .3) : mix(vec3(0.), hot * (.6 + .5 * light), w);
    col = inside;
  }
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;
  /* La lampe en lumière linéaire (HDR), développée par la cabine commune, avec son décor : pièce sombre,
     verre cylindrique (effet de loupe du liquide, reflets de Fresnel, lumière piégée dans la paroi),
     liquide qui diffuse la lumière de l'ampoule, cire translucide (les parties minces s'illuminent),
     socle et chapeau métalliques qui reflètent la lampe, table laquée où elle se reflète. */
  const FS_LAMP_HDR = HEAD + `
uniform sampler2D uS; uniform vec2 uRes, uPx; uniform vec4 uBox, uBase, uCap; uniform vec3 uWax, uLiq; uniform float uOn, uT, uWarm, uHeat, uCx, uTab;
out vec4 o;
const vec3 BULB = vec3(1., .6, .28);   // ampoule à incandescence (~2 700 K)
// l'œil s'adapte à la lumière chaude de l'ampoule (adaptation chromatique) : on n'en garde qu'une part de la teinte
const vec3 WB = vec3(1., .86, .72);
float hw(float y){ return .17 + .29 * exp(-pow((y - .24) / .4, 2.)); }
vec3 wax, liq;
float power(){ return (.06 + .94 * uOn) * (.3 + .7 * uHeat); }   // l'ampoule éclaire dès qu'on l'allume ; c'est la cire qui met du temps à chauffer
// lumière de l'ampoule dans le liquide : intense en bas, diffusée puis absorbée en montant
float bulbL(float Y){ return (.16 + 2.6 * exp(-Y * 3.3) + .9 * exp(-Y * 12.)) * power(); }
vec3 glow(){ return (liq * .65 + wax * .35) * power(); }
// le métal reflète la pièce : la lampe au-dessus, une fenêtre à gauche, le reste dans l'ombre
vec3 env(vec3 r, float k){
  vec3 c = vec3(.004, .0035, .0045);
  vec3 gl = mix(vec3(dot(glow(), vec3(.3, .5, .2))), glow(), .55);                     // le métal argenté désature les reflets
  c += gl * 1.8 * k * smoothstep(.05, -.75, r.y) * exp(-r.x * r.x * 3.);           // la lampe elle-même
  c += gl * .16 * (1. - abs(r.y)) + vec3(.012, .012, .014) * smoothstep(.6, -.2, r.y);  // le mur qu'elle éclaire, le plafond
  c += vec3(.9, .95, 1.05) * exp(-pow((r.x + .62) / .16, 2.)) * smoothstep(.75, .1, abs(r.y + .1)) * .3;
  c += BULB * .02 * uOn * smoothstep(0., .8, r.y);
  return c;
}
vec3 metal(float Xm, float slope, float t, bool base){
  float k = base ? 1. : .12;   // le socle voit la lampe au-dessus de lui ; le chapeau ne voit que la pièce
  float ct = sqrt(max(1. - Xm * Xm, 0.));
  vec3 n = normalize(vec3(Xm, -slope * ct, ct));
  vec3 r = vec3(2. * n.z * n.x, 2. * n.z * n.y, 2. * n.z * n.z - 1.);
  vec3 c = vec3(.8, .78, .76) * env(r, k) * (.55 + .45 * ct);
  c *= .88 + .24 * vnoise(vec2(Xm * 2.5, t * 90.));                  // aluminium brossé : des stries très fines autour du cône
  if (base){
    // fentes d'aération : la lumière de l'ampoule s'en échappe
    float a = asin(clamp(Xm, -1., 1.)) * 2.228;
    float slot = smoothstep(.2, .15, abs(fract(a + .5) - .5)) * smoothstep(.02, .0, abs(t - .5) - .06) * smoothstep(.05, .2, ct);
    c = mix(c, BULB * vec3(1., .8, .6) * 1.7 * uOn * ct + vec3(.002), slot);
  }
  return c;
}
vec3 scene(vec2 px){
  vec3 col = vec3(.0032, .0028, .0036) * (.85 + .3 * smoothstep(0., uRes.y, px.y));
  vec2 c = vec2(uCx, uBox.y + uBox.w * .5), d = (px - c) / uRes.y;
  col += glow() * .11 / (1. + dot(d * vec2(1.3, .75), d * vec2(1.3, .75)) * 12.);       // le mur, éclairé par la lampe
  // le verre et ce qu'il contient
  float Y = 1. - (px.y - uBox.y) / uBox.w;
  if (Y > 0. && Y < 1.){
    float H = hw(Y) * uBox.z, X = (px.x - uCx) / H;
    float cov = clamp((1. - abs(X)) * H + .5, 0., 1.);
    if (cov > 0.){
      float ct = sqrt(max(1. - X * X, 0.));
      vec2 suv = vec2(.5 + hw(Y) * X * (1. - .18 * ct * ct), Y);   // le liquide fait loupe : centre grossi, bords serrés
      vec4 s = texture(uS, suv);
      // contour arrondi : la phase moyennée sur une case autour
      float ph = s.r * .4 + (texture(uS, suv + vec2(uPx.x, 0.)).r + texture(uS, suv - vec2(uPx.x, 0.)).r + texture(uS, suv + vec2(0., uPx.y)).r + texture(uS, suv - vec2(0., uPx.y)).r) * .15;
      float w = smoothstep(-.13, .13, ph);
      vec2 g = vec2(texture(uS, suv + vec2(uPx.x, 0.)).r - texture(uS, suv - vec2(uPx.x, 0.)).r, texture(uS, suv + vec2(0., uPx.y)).r - texture(uS, suv - vec2(0., uPx.y)).r);
      float pR = texture(uS, suv + vec2(3. * uPx.x, 0.)).r, pL = texture(uS, suv - vec2(3. * uPx.x, 0.)).r, pT = texture(uS, suv + vec2(0., 3. * uPx.y)).r, pB = texture(uS, suv - vec2(0., 3. * uPx.y)).r;
      float th = clamp((pR + pL + pT + pB) * .125 + .5, 0., 1.);
      // la goutte vue comme un relief : sa normale vient de la phase lissée
      vec3 nw = normalize(vec3(-(pR - pL) * .9, -(pT - pB) * .9, 1.));
      float L = bulbL(Y);
      vec3 lq = liq * WB * L * (.3 + .55 * ct) + liq * .015;   // un peu de lumière de la pièce, même lampe éteinte
      float hot = clamp((s.g - .55) * 2.2, 0., 1.), rim = clamp(length(g) * 2.2, 0., 1.), under = clamp(-g.y * 3., 0., 1.);
      vec3 wc = mix(wax, vec3(1., .5, .18), hot * .35);   // la cire la plus chaude pâlit vers l'orange clair
      // cire translucide : la lumière la traverse là où elle est mince, son cœur reste plus sombre ; le dessous, face à l'ampoule, s'allume
      float below = clamp(-nw.y, 0., 1.);                                    // face tournée vers l'ampoule
      float spec = pow(max(dot(nw, normalize(vec3(-.55, .35, 1.))), 0.), 36.);   // reflet de la fenêtre sur la cire
      // la cire reçoit aussi la lumière diffusée par le liquide tout autour d'elle
      vec3 wx = wc * WB * L * (.45 + 1.6 * exp(-2.2 * th) + .6 * rim + 1.1 * below + .8 * hot) + wc * (.03 + .5 * dot(lq, vec3(.3, .5, .2))) + vec3(1., .95, .9) * spec * (.08 + .25 * L);
      vec3 inside = mix(lq, wx, w);
      // le verre : reflets de Fresnel, une fenêtre à gauche, la lumière piégée dans la paroi qui fait briller les bords
      float F = .04 + .96 * pow(1. - ct, 5.);
      float bandY = smoothstep(.05, .35, Y) * smoothstep(.98, .7, Y);
      vec3 refl = vec3(.02, .022, .03) * F + vec3(1.05, 1.1, 1.2) * (exp(-pow((X + .48) / .11, 2.)) * .2 + exp(-pow((X - .62) / .06, 2.)) * .07) * bandY;
      inside = inside * (1. - F) + refl + lq * smoothstep(.78, 1., abs(X)) * .9;
      col = mix(col, inside, cov);
    }
  }
  // le socle (tronc de cône qui s'élargit vers le bas) et le chapeau
  if (px.y > uBase.x - 1. && px.y < uBase.y + 1.){
    float t = (px.y - uBase.x) / (uBase.y - uBase.x), Hb = mix(uBase.z, uBase.w, t), Xm = (px.x - uCx) / Hb;
    float cov = clamp((1. - abs(Xm)) * Hb + .5, 0., 1.) * clamp(min(px.y - uBase.x, uBase.y - px.y) + .5, 0., 1.);
    if (cov > 0.) col = mix(col, metal(Xm, (uBase.w - uBase.z) / (uBase.y - uBase.x), t, true), cov);
  }
  if (px.y > uCap.y - 1. && px.y < uCap.x + 1.){
    float t = (px.y - uCap.y) / (uCap.x - uCap.y), Hc = mix(uCap.w, uCap.z, t), Xm = (px.x - uCx) / Hc;
    float cov = clamp((1. - abs(Xm)) * Hc + .5, 0., 1.) * clamp(min(px.y - uCap.y, uCap.x - px.y) + .5, 0., 1.);
    if (cov > 0.) col = mix(col, metal(Xm, (uCap.z - uCap.w) / (uCap.x - uCap.y), t, false), cov);
  }
  return col;
}
void main(){
  wax = pow(uWax, vec3(2.2)); liq = pow(uLiq, vec3(2.2));
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec3 col;
  if (px.y < uTab) col = scene(px);
  else {
    // table laquée : la lampe s'y reflète (de moins en moins loin du pied), une flaque de lumière autour du socle
    float dy = px.y - uTab;
    vec3 rf = scene(vec2(px.x, 2. * uTab - px.y));
    float dx = (px.x - uCx) / uRes.y;
    col = vec3(.0025, .002, .0022) + rf * (.06 + .16 * exp(-dy / (uRes.y * .05)));
    col += glow() * .05 / (1. + dx * dx * 30.) + BULB * uOn * .02 * exp(-abs(dx) * 9.) * exp(-dy / (uRes.y * .03));
  }
  o = vec4(col, 1.);
}`;
  const FS_BEN = HEAD + `
uniform sampler2D uS; uniform vec2 uRes, uPx; uniform float uView, uInk; out vec4 o;
vec3 heat(float t){ t = clamp(t, 0., 1.); return mix(mix(vec3(.04, .1, .45), vec3(.55, .2, .55), smoothstep(.15, .5, t)), vec3(1., .55, .12), smoothstep(.5, .9, t)); }
void main(){
  vec4 s = texture(uS, vUv);
  vec3 col = heat(s.g);
  // colorant : des lignes qui suivent l'écoulement
  float dye = s.b, l = smoothstep(.08, 0., abs(fract(dye * 9.) - .5) - .38);
  if (uView > .5) col = mix(vec3(.04, .05, .08), vec3(.9, .85, 1.), l * .9) + heat(s.g) * .18;
  else col = mix(col, col * .55, l * .5);
  if (uInk > .5){ float k = dot(col, vec3(.3, .55, .15)); col = vec3(.953, .933, .89) * (.35 + .65 * k); }
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;
  // granulation solaire : cellules de Voronoï qui évoluent, couloirs sombres, taches
  const FS_SUN = HEAD + `
uniform vec2 uRes, uC; uniform float uT, uZoom, uSpot, uDecor, uInk, uR; out vec4 o;
vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
vec3 bb(float T){
  T = clamp(T, 1000., 40000.) / 100.;
  float r = T <= 66. ? 1. : clamp(1.29293618 * pow(T - 60., -.1332047592), 0., 1.);
  float g = T <= 66. ? clamp(.39008157876 * log(T) - .63184144378, 0., 1.) : clamp(1.12989086 * pow(T - 60., -.0755148492), 0., 1.);
  float b = T >= 66. ? 1. : (T <= 19. ? 0. : clamp(.54320678911 * log(T - 10.) - 1.19625408914, 0., 1.));
  return vec3(r, g, b);
}
vec2 gran(vec2 p, float t){
  // distance au centre de cellule le plus proche, et écart avec le deuxième (les couloirs)
  vec2 i = floor(p), f = fract(p); float d1 = 9., d2 = 9.; float life = 0.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(x, y), id = i + g, h = h22(id);
    float ph = t * (.25 + .2 * h.x) + h.y * 6.28;
    vec2 c = g + .5 + .32 * vec2(sin(ph), cos(ph * .9 + h.x * 3.));
    float d = length(c - f) * (.85 + .3 * (.5 + .5 * sin(ph * .7)));
    if (d < d1){ d2 = d1; d1 = d; life = .5 + .5 * sin(ph * .7); } else if (d < d2) d2 = d;
  }
  return vec2(d2 - d1, life);
}
void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 q = (px - uC) / uR;
  float rr = length(q);
  vec3 col = uDecor > .5 ? vec3(0.) : (uInk > .5 ? vec3(.953, .933, .89) : vec3(0.));
  float zoom = uZoom;
  if (rr < 1. || zoom > .5){
    vec2 p = zoom > .5 ? q * 7. : q * 150.;
    // sur le disque entier, la granulation est trop fine : on la voit comme un grain ; en gros plan, cellule par cellule
    vec2 g = gran(p, uT);
    float lane = smoothstep(.02, .22, g.x);
    float T = 5300. + 900. * lane * (.75 + .25 * g.y) + 250. * fbm(p * .7 + uT * .02);
    // tache solaire : ombre et pénombre filamenteuse
    vec2 sc = zoom > .5 ? vec2(.35, -.1) : vec2(.25, .2);
    float sd = length(q - sc) / (zoom > .5 ? .3 : .06);
    if (uSpot > .5 && sd < 1.){
      float a = atan(q.y - sc.y, q.x - sc.x);
      float fil = .5 + .5 * sin(a * 60. + fbm(vec2(a * 8., sd * 3.)) * 4.);
      float um = smoothstep(.5, .42, sd), pen = smoothstep(1., .9, sd) * (1. - um);
      T = mix(T, 4200. + 600. * fil, pen);
      T = mix(T, 3600., um);
    }
    float I = pow(T / 5800., 7.); // en lumière visible, l'éclat varie plus vite que T⁴
    if (zoom < .5){ float mu = sqrt(max(0., 1. - rr * rr)); I *= .3 + .7 * pow(mu, .6); } // assombrissement centre-bord
    col = bb(T) * I * .5 * vec3(1., .82, .5); // teinte des photographies prises à travers un filtre
    if (uInk > .5){ float k = dot(col, vec3(.3, .55, .15)); col = vec3(.953, .933, .89) * (1. - .75 * k) + vec3(.1, .05, 0.) * k; }
  } else if (uDecor > .5){
    col += vec3(1., .6, .3) * exp(-(rr - 1.) * 18.) * .5 + vec3(1., .4, .4) * exp(-(rr - 1.) * 4.) * .06; // couronne et chromosphère
  }
  o = vec4(pow(clamp(col, 0., 1.), vec3(1. / 2.2)), 1.);
}`;

  /* Les cellules de Bénard en lumière linéaire : la cuve entre une plaque de cuivre chauffée (qui rougeoie)
     et une plaque froide ; la température en palette « inferno » (perceptuellement régulière), avec un relief
     qui fait sortir les panaches ; ou le colorant, fluorescent sous ultraviolet, comme la fluorescéine. */
  const FS_BEN_HDR = HEAD + `
uniform sampler2D uS; uniform vec2 uRes, uPx; uniform vec4 uRect; uniform float uView, uRa, uT;
out vec4 o;
vec3 inferno(float t){
  t = clamp(t, 0., 1.);
  const vec3 c0 = vec3(.0002189, .001651, -.0194809), c1 = vec3(.1065134, .5639564, 3.9327124), c2 = vec3(11.6024931, -3.972854, -15.9423941);
  const vec3 c3 = vec3(-41.7039961, 17.4363989, 44.3541452), c4 = vec3(77.1629357, -33.4023589, -81.8073093), c5 = vec3(-71.3194282, 32.6260643, 73.2095199), c6 = vec3(25.1311262, -12.242669, -23.070325);
  return pow(clamp(c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6))))), 0., 1.), vec3(2.2));
}
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 tu = vec2((px.x - uRect.x) / uRect.z, 1. - (px.y - uRect.y) / uRect.w);
  float heat = .4 + 1.8 * uRa;
  vec3 col = vec3(.0035, .004, .0055);
  // la lampe du laboratoire, au-dessus : un peu de lumière neutre près de la cuve (à quelques dizaines de degrés, rien ne luit)
  float db = (px.y - (uRect.y + uRect.w)) / uRes.y, dt = ((uRect.y) - px.y) / uRes.y;
  col += vec3(.55, .5, .45) * .006 / (1. + db * db * 60.) + vec3(.5, .52, .55) * .004 / (1. + dt * dt * 60.);
  float pl = uRes.y * .012;
  if (px.x > uRect.x && px.x < uRect.x + uRect.z){
    if (tu.y >= 0. && tu.y <= 1.){
      vec4 s = texture(uS, tu);
      float T = s.g;
      if (uView < .5){
        // température : relief (les panaches chauds bombent), palette inferno, les parties chaudes un peu lumineuses
        float gx = texture(uS, tu + vec2(uPx.x, 0.)).g - texture(uS, tu - vec2(uPx.x, 0.)).g, gy = texture(uS, tu + vec2(0., uPx.y)).g - texture(uS, tu - vec2(0., uPx.y)).g;
        vec3 n = normalize(vec3(-gx * 9., -gy * 9., 1.));
        float sh = .72 + .4 * dot(n, normalize(vec3(-.5, .6, .65)));
        col = inferno(T) * (.35 + .9 * T) * sh;
      } else {
        // colorant fluorescent : des filets verts qui suivent l'écoulement, sur un liquide sombre
        float dye = s.b, l = 1. - smoothstep(.0, .08, .5 - abs(fract(dye * 9.) - .5) - .04);   // filets fins là où le colorant change de bande
        col = vec3(.003, .005, .009) + inferno(T) * .05 + vec3(.25, 1., .4) * l * 1.3;
      }
      // les parois de verre : un liseré clair sur les bords
      float e = min(px.x - uRect.x, uRect.x + uRect.z - px.x);
      col += vec3(.5, .55, .6) * .08 * exp(-e * .8);
    } else if (px.y > uRect.y + uRect.w && px.y < uRect.y + uRect.w + pl){
      // plaque de cuivre chauffée à quelques dizaines de degrés : couleur cuivre, sans lueur (un métal ne rougeoie que vers 500 °C)
      float k = (px.y - uRect.y - uRect.w) / pl;
      col = vec3(.955, .638, .538) * (.03 + .05 * (1. - k) + .12 * exp(-pow((k - .22) * 6., 2.)));
    } else if (px.y < uRect.y && px.y > uRect.y - pl){
      // plaque refroidie (métal, eau froide derrière) : grise, sans lueur
      float k = (uRect.y - px.y) / pl;
      col = vec3(.62, .66, .7) * (.025 + .04 * (1. - k) + .1 * exp(-pow((k - .78) * 6., 2.)));
    }
  }
  o = vec4(col, 1.);
}`;

  /* Le Soleil en lumière linéaire, développé par la cabine : granules bombés (le gaz chaud monte au centre),
     couloirs sombres et points brillants magnétiques, facules près du bord, tache solaire, chromosphère.
     La teinte dorée est celle des photographies prises à travers un filtre, comme celles du télescope Inouye. */
  const FS_SUN_HDR = HEAD + `
uniform vec2 uRes, uC; uniform float uT, uZoom, uSpot, uR; out vec4 o;
vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
// l'image est déjà colorisée : on défait d'avance la courbe ACES de la cabine (inverse exacte de l'ajustement de Narkowicz)
float acesInv(float y){ float a = 2.51 - 2.43 * y, b = .03 - .59 * y, c = -.14 * y; return (-b + sqrt(b * b - 4. * a * c)) / (2. * a); }
vec3 vecInv(vec3 y){ return vec3(acesInv(y.r), acesInv(y.g), acesInv(y.b)); }
// distance au bord de la cellule (0 dans les couloirs), âge de la cellule, et son identité
vec4 gran(vec2 p, float t){
  vec2 i = floor(p), f = fract(p); float d1 = 9., d2 = 9., life = 0., idh = 0.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(x, y), id = i + g, h = h22(id);
    float ph = t * (.25 + .2 * h.x) + h.y * 6.28;
    vec2 c = g + .5 + .32 * vec2(sin(ph), cos(ph * .9 + h.x * 3.));
    float d = length(c - f) * (.85 + .3 * (.5 + .5 * sin(ph * .7)));
    if (d < d1){ d2 = d1; d1 = d; life = .5 + .5 * sin(ph * .7); idh = h.x; } else if (d < d2) d2 = d;
  }
  return vec4(d2 - d1, life, idh, d1);
}
void main(){
  vec2 q = (gl_FragCoord.xy - uC) / uR;
  float rr = length(q), zoom = uZoom;
  vec3 col = vec3(0.);
  if (rr < 1. || zoom > .5){
    vec2 p = q * 7.;
    float T;
    vec4 g = vec4(.5);
    float dome = 1.;
    if (zoom > .5){
    // les cellules se déforment lentement : un bruit tord la grille de Voronoï
    vec2 wp = p + (vec2(fbm(p * .3 + uT * .04), fbm(p * .3 + 7.3 - uT * .04)) - .5) * .9;
    g = gran(wp, uT);
    dome = smoothstep(.0, .42, g.x);                            // le gaz chaud bombe le centre du granule
    dome *= 1. - .35 * smoothstep(.25, .5, g.x) * smoothstep(.75, .95, g.y);   // les vieux granules « explosent » : leur centre s'assombrit
    T = 5150. + 1150. * dome * (.7 + .3 * g.y) + 420. * (fbm(p * 2.3 + uT * .03) - .5) * (.4 + .6 * dome);
    // points brillants : le champ magnétique concentré dans certains couloirs
    float bp = smoothstep(.05, .0, g.x) * step(.9, fract(g.z * 13.7)) * smoothstep(.2, .05, abs(g.w - .5));
    T += 500. * bp;
    } else {
      // vue d'ensemble : un granule (1 000 km) est bien plus petit qu'un pixel ; on ne voit qu'un léger moutonnement (supergranules)
      T = 5700. + 160. * (fbm(q * 22. + uT * .01) - .5) + 90. * (vnoise(q * 90.) - .5);
    }
    float sd = 9.;
    vec2 sc = zoom > .5 ? vec2(.35, -.1) : vec2(.25, .2);
    if (uSpot > .5){
      sd = length(q - sc) / (zoom > .5 ? .3 : .06);
      if (sd < 1.){
        float a = atan(q.y - sc.y, q.x - sc.x);
        float fil = .5 + .5 * sin(a * 60. + fbm(vec2(a * 8., sd * 3.)) * 4.);
        float um = smoothstep(.5, .42, sd), pen = smoothstep(1., .9, sd) * (1. - um);
        T = mix(T, 4250. + 650. * fil, pen);
        T = mix(T, 3600., um);
      }
    }
    float I = pow(T / 5800., 7.);                               // en lumière visible, l'éclat varie bien plus vite que T⁴
    if (zoom > .5){
      // en gros plan, les granules ont du relief (ombre douce côté opposé à la lumière)
      float rl = clamp(.5 + (dFdx(dome) - dFdy(dome)) * 2.2, 0., 1.);
      I *= .82 + .36 * rl;
    } else {
      float mu = sqrt(max(0., 1. - rr * rr));
      I *= .38 + .62 * pow(mu, .7);                            // assombrissement centre-bord
      I *= 1. + .55 * pow(1. - mu, 2.) * smoothstep(.45, .7, fbm(q * 18. + 3.));   // facules, visibles près du bord
      I *= smoothstep(1., .995, rr);
    }
    // comme les images des observatoires : une luminance colorisée par une palette or (brun, orange, or pâle)
    float Y = clamp(I * (zoom > .5 ? .6 : .92), 0., 1.5);
    col = vecInv(min(vec3(Y * Y, .51 * Y * Y * Y, .08 * pow(Y, 5.)), vec3(.97)));
  }
  if (zoom < .5 && rr > .99){
    // chromosphère rose et couronne, très ténues
    float e = rr - 1.;
    col += vec3(.9, .25, .12) * exp(-max(e, 0.) * 160.) * .35 + vec3(.6, .3, .1) * exp(-max(e, 0.) * 6.) * .02;
  }
  o = vec4(col, 1.);
}`;

  /* ═════════ Volcans et intérieur de la Terre (cadrage de Kurt, brief 93ac705) ═════════
     Le manteau n'est pas de la lave : c'est de la roche solide, très chaude, qui s'écoule de quelques cm par an.
     Le magma n'existe que localement (dorsales, points chauds, subductions), dans des chambres à quelques km de profondeur.
     Toutes les couleurs des roches et des laves sont celles de leur incandescence (corps noir de Planck × CIE 1931),
     avec un éclat comprimé pour que l'œil voie à la fois le manteau rouge sombre et le noyau blanc. */
  const GL_TERRE = () => HEAD + (window.FKR ? window.FKR.glsl('couleur') : '') + `
// incandescence d'une matière à t °C : couleur du corps noir, éclat comprimé (la luminance réelle varie d'un facteur 10⁴)
vec3 incand(float t){ float K = t + 273.; return corpsNoir(K) * pow(eclatCorpsNoir(K) / eclatCorpsNoir(1600.), .27) * .55 * smoothstep(500., 900., K); }
// l'intérieur de la Terre : tout y est chaud ; l'éclat est bien plus comprimé pour que l'œil distingue les couches
vec3 interieur(float t){ float K = t + 273.; return corpsNoir(K) * .1 * pow(K / 1500., 1.9) * smoothstep(450., 900., K); }
float etoiles(vec2 p){ vec2 c = floor(p / 3.), f = p - c * 3.; float h = hash12(c); return h < .035 ? pow(hash12(c + 7.), 6.) * 2.5 * exp(-dot(f - 1.5, f - 1.5) * 2.) : 0.; }
`;
  // la Terre en coupe, à l'échelle : croûte (5 à 70 km), manteau solide en lente convection, noyau externe liquide, graine solide
  const FS_TERRE = () => GL_TERRE() + `
uniform vec2 uRes, uC, uLz; uniform float uR, uMa, uT, uLr, uLzoom; uniform vec2 uLc;
out vec4 o;
const float RT = 6371.;
// les plaques et les courants du manteau : 7 cellules de convection qui dérivent très lentement
float cellules(float th, float ma){ return cos(7. * th + .9 * sin(2. * th + ma * .004) + ma * .0016); }
// température (°C) au point p (km depuis le centre)
float temp(vec2 p, out float kind){
  float r = length(p), th = atan(p.y, p.x), d = RT - r, ma = uMa;
  float T;
  if (r < 1221.){ kind = 4.; T = 5400. - 200. * r / 1221.; T += 60. * (vnoise(p * .02) - .5); }    // graine : fer solide
  else if (r < 3480.){ kind = 3.;                                                               // noyau externe : fer liquide
    float s = (r - 1221.) / 2259.;
    T = mix(5000., 4000., s);
    // le fer liquide brasse vite (environ 15 km par an, un million de fois plus vite que le manteau) : on n'en montre que l'allure
    vec2 q = vec2(th * 4. + uT * .05, s * 5.);
    T += 520. * (fbm(q + vec2(fbm(q * 1.7 - uT * .04), fbm(q * 1.3 + 4.)) * 1.8) - .5);
  } else if (d > 100.){ kind = 2.;                                                              // manteau : roche solide
    float s = (r - 3480.) / 2791.;
    T = mix(3000., 1350., pow(s, .55)) + 700. * exp(-(r - 3480.) / 120.);   // couche limite chaude (D″) au contact du noyau
    float c = cellules(th, ma);
    T += 260. * c * smoothstep(.0, .25, s) * smoothstep(1., .75, s);                            // panaches chauds qui montent, roche froide qui plonge
    // un panache profond (point chaud) monte de la base du manteau, et ondule lentement
    float ph = th - (.95 + .04 * sin(s * 5. + ma * .01));
    T += 420. * exp(-pow(ph * r / (90. + 160. * smoothstep(.75, .97, s)), 2.)) * smoothstep(0., .1, s);
    vec2 q = vec2(th * 6., s * 5.) + vec2(.0, -ma * .002);
    T += 120. * (fbm(q + vec2(fbm(q * 1.3 + ma * .001), 0.)) - .5);
  } else { kind = 1.;                                                                           // lithosphère : croûte et manteau rigide
    T = mix(15., 1350., clamp(d / 100., 0., 1.));
    float c = cellules(th, ma);
    T += 900. * smoothstep(.97, 1., c) * smoothstep(100., 0., d) * step(d, 100.);              // dorsale : le manteau remonte et fond par décompression
  }
  return T;
}
// l'atmosphère : une centaine de kilomètres, fine comme un trait à cette échelle
vec3 atmos(float r, float kmpx){ float h = max(r - RT, 0.); return vec3(.2, .4, 1.) * .35 * exp(-h / (2.5 * kmpx)) + vec3(.02, .04, .1) * exp(-h / 8.5); }
vec3 terre(vec2 p, float kmpx){
  float r = length(p), th = atan(p.y, p.x), d = RT - r;
  float kind, T = temp(p, kind);
  vec3 col = interieur(T);
  float grain = vnoise(p / (kmpx * 2.2));
  if (kind == 2. || kind == 4.) col *= .86 + .28 * grain;                                      // roche cristalline
  if (kind >= 3.) col *= .42;                                                                     // le noyau, présenté moins éblouissant pour qu'on voie ses tourbillons
  if (kind == 3.) col *= .95 + .1 * grain;
  if (kind == 1.){
    // en surface : océans (croûte de 7 km sous 4 km d'eau) et continents (croûte de 35 km)
    float cont = smoothstep(.2, .45, fbm(vec2(th * 2.2, 3.1)));
    float crust = mix(7., 35., cont);
    if (d < crust){
      vec3 roche = mix(vec3(.05, .055, .06), vec3(.09, .075, .06), cont) * (.8 + .4 * grain);
      col = max(col, roche * .4);
    }
    if (cont < .5 && d < 4. + .5 * kmpx) col = mix(col, vec3(.02, .08, .25) * .6, .8);                       // l'océan, 4 km d'eau
    else if (d < .6 * kmpx) col = mix(col, mix(vec3(.12, .16, .07), vec3(.25, .2, .14), grain) * .5, .8);   // terres émergées
  }
  return col;
}
vec3 vue(vec2 p, float kmpx, vec3 bg){
  float r = length(p), a = clamp((RT - r) / kmpx + .5, 0., 1.);
  vec3 dehors = bg + (r < RT + 300. ? atmos(r, kmpx) : vec3(0.));
  return a > 0. ? mix(dehors, terre(p, kmpx), a) : dehors;
}
void main(){
  vec2 f = gl_FragCoord.xy;
  vec3 bg = vec3(.004, .0045, .007) + vec3(.9, .9, 1.) * etoiles(f) * .25;
  float kmpx = RT / uR;
  vec3 col = vue((f - uC) * kmpx, kmpx, bg);
  // la loupe : ×uLzoom sur le bord de la Terre, pour voir la croûte
  float dl = length(f - uLc);
  if (uLr > 0. && dl < uLr + 1.5){
    vec3 c = vue(uLz + (f - uLc) * kmpx / uLzoom, kmpx / uLzoom, vec3(.004, .0045, .007));
    col = mix(col, c, clamp(uLr - dl, 0., 1.));
    col += vec3(.7, .75, .8) * .06 * smoothstep(1.5, 0., abs(dl - uLr));
  }
  o = vec4(col, 1.);
}`;

  // le point chaud : une plaque océanique glisse au-dessus d'un panache fixe et laisse une chaîne d'îles de plus en plus vieilles.
  // Au-dessus du fond marin, le relief est exagéré (uEx) ; au-dessous, lithosphère et manteau sont à l'échelle.
  const FS_CHAUD = () => GL_TERRE() + `
uniform vec2 uRes; uniform float uKm, uEx, uSea, uHot, uMa, uT, uV, uDt;
out vec4 o;
// île n° k : née à k·uDt (Ma), hauteur au-dessus du fond marin (km) selon son âge
float hk(float k){ return 7.5 + 2.5 * hash12(vec2(k, 3.1)); }
float ile(float x, float k, out float age){
  age = uMa - k * uDt;
  if (age < 0.) return 0.;
  float xk = uHot - uV * age / uKm;                              // position (px) : la plaque l'emporte vers la gauche
  float grow = smoothstep(0., 1.1, age), sub = max(0., 1. - .045 * max(age - 1., 0.));
  float w = (34. + 10. * hash12(vec2(k, 9.))) * (1. - .25 * smoothstep(2., 20., age));
  float dx = (x - xk) / w;
  float h = hk(k) * grow * sub * exp(-dx * dx * 1.6);
  h *= 1. - .15 * smoothstep(1., 12., age) * (vnoise(vec2(x * .08, k)) - .3);   // l'érosion ravine les vieilles îles
  return h;
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float vz = uEx / uKm;                                            // px par km dans la zone du relief
  float x = px.x;
  // le fond marin : 5,5 km sous la mer, soulevé de 1,5 km autour du point chaud (le bombement hawaïen)
  float swell = 1.5 * exp(-pow((x - uHot) / (450. / uKm), 2.));
  float topo = -5.5 + swell, actif = 0., xa = uHot;
  float k0 = floor(uMa / uDt);
  for (int i = 0; i < 26; i++){
    float a, h = ile(x, k0 - float(i), a);
    if (h > 0.) topo = max(topo, -5.5 + swell + h);
  }
  // le volcan actif : la plus jeune île, encore au-dessus du panache ; son sommet est à xa
  for (int i = 0; i < 3; i++){
    float a = uMa - (k0 - float(i)) * uDt;
    if (a >= 0. && a < 1.7 && actif == 0.){ actif = smoothstep(0., .35, a) * smoothstep(1.7, 1.2, a); xa = uHot - uV * a / uKm; }
  }
  float ySea = uSea, yFloor = uSea + 5.5 * vz, yLith = yFloor + 95. / uKm;
  float ySurf = ySea - topo * vz;
  vec3 col;
  float lava = 0.;
  if (px.y < ySurf && px.y < ySea){
    // la nuit, et la lueur rouge du volcan actif sur son panache de vapeur
    float hy = px.y / ySea;
    col = mix(vec3(.004, .006, .016), vec3(.012, .016, .035), hy) + vec3(.9, .9, 1.) * etoiles(px) * .3;
    vec2 dv = vec2(x - xa, px.y - (ySea - 3.5 * vz)) / uRes.y;
    float plume = exp(-pow(dv.x * 14. - dv.y * 3., 2.)) * smoothstep(.0, -.25, dv.y) * fbm(vec2(x * .02, px.y * .02 + uT * .3));
    col += (vec3(1., .35, .1) * .12 * exp(-dot(dv, dv) * 160.) + vec3(.6, .5, .45) * plume * .05) * actif;
  } else if (px.y < ySurf || (px.y >= ySea && px.y < yFloor && px.y < ySurf)){
    // l'océan : bleu nuit, plus noir en profondeur ; la lave du volcan actif rougit l'eau près du rivage
    float dep = (px.y - ySea) / max(yFloor - ySea, 1.);
    col = mix(vec3(.005, .02, .045), vec3(.001, .004, .012), dep);
    col += vec3(1., .3, .08) * .03 * exp(-abs(x - xa) / 30.) * exp(-dep * 6.) * actif;
  } else {
    float yb = px.y;
    if (yb < yFloor || px.y < ySurf + 1.){
      col = vec3(0.);
    }
    if (px.y >= ySurf && px.y < yFloor + 2.){
      // l'édifice volcanique (basalte noir), avec de la lave qui coule sur le volcan actif
      float depth = (px.y - ySurf) / vz;                           // km sous la surface
      vec3 bas = vec3(.03, .028, .03) * (.7 + .6 * vnoise(px * .3));
      col = bas * (1. + .5 * smoothstep(.4, 0., depth));
      if (actif > .2){
        float d = abs(x - xa), f = vnoise(vec2(d * .25 - uT * 1.5, px.y * .4));
        float flow = smoothstep(.6, 0., depth) * smoothstep(.55, .75, f) * actif;
        float Tl = 1150. - 4. * d;                                  // la lave refroidit en descendant : jaune-orange, rouge, puis croûte noire
        lava = flow * step(800., Tl);
        col += incand(Tl) * 1.6 * lava;
        // la chambre magmatique, à quelques kilomètres sous le sommet
        vec2 ch = vec2((x - xa) / 14., (px.y - (ySea + .5 * vz)) / 9.);
        float cm = smoothstep(1., .7, length(ch)) * actif;
        col = mix(col, incand(1180.) * (1. + .3 * vnoise(px * .2 + uT)), cm);
        // la cheminée qui la relie au cratère
        col = mix(col, incand(1160.) * 1.2, smoothstep(2.5, 1.2, abs(x - xa)) * step(ySurf, px.y) * step(px.y, ySea + .5 * vz) * actif);
      }
    } else {
      // sous le fond marin, à l'échelle : lithosphère rigide (froide en haut), puis manteau solide
      float zk = (px.y - yFloor) * uKm;                              // km sous le fond marin
      float xp = x * uKm + uV * uMa;                                 // la lithosphère avance avec la plaque
      float Tc;
      if (zk < 95.) Tc = mix(10., 1330., pow(zk / 95., .9));
      else Tc = 1330. + .4 * (zk - 95.);
      // le panache : de la roche solide, 200 à 300 °C plus chaude, qui monte et s'étale sous la plaque
      float xr = (x - uHot) * uKm;
      float stem = exp(-pow(xr / (70. + 15. * sin(zk * .02 + uMa * .3)), 2.));
      float head = exp(-pow((xr + .3 * max(0., 250. - xr)) / 300., 2.)) * exp(-pow((zk - 130.) / 40., 2.));
      float dT = 300. * max(stem * smoothstep(110., 160., zk), head);
      if (zk >= 95.) Tc += dT * (.8 + .4 * fbm(vec2(xr * .01, zk * .02 - uMa * .8)));
      float glowP = dT / 300.;
      col = interieur(Tc) * (.5 + 1.6 * (zk >= 95. ? glowP : 0.)) * (.85 + .3 * vnoise(vec2(xp, zk) * .08));
      // la fusion partielle en haut du panache : du magma, en filets qui montent vers le volcan
      float melt = smoothstep(.55, .85, fbm(vec2(xr * .03, zk * .05 - uT * .4))) * exp(-pow(xr / 60., 2.)) * smoothstep(170., 100., zk) * smoothstep(0., 30., zk);
      col = mix(col, incand(1250.) * 1.2, melt * .8);
      if (zk < 95.){
        col *= .9 + .2 * vnoise(vec2(xp * .2, zk * .3));
        // le magma monte du panache au volcan actif par des fissures à travers la plaque
        float xd = mix(xa, uHot, zk / 95.) + 3. * sin(zk * .15);
        col = mix(col, incand(1200.) * 1.3, smoothstep(2.2, .8, abs(x - xd)) * actif);
      }
    }
  }
  o = vec4(col, 1.);
}`;

  // sous le volcan, à l'échelle : la chambre magmatique à quelques kilomètres, la cheminée, et l'éruption.
  // Basalte fluide (vers 1 150 °C) : fontaines et coulées. Magma visqueux et riche en gaz (vers 900 °C) : il explose.
  const FS_VOLCAN = () => GL_TERRE() + `
uniform vec2 uRes; uniform float uKm, uGround, uCx, uT, uVisq, uNuee, uEclair;
out vec4 o;
// le relief (km au-dessus de la plaine) selon la distance à l'axe (km) : cône de 9 km de rayon, cratère de 900 m
float relief(float d){ d = abs(d); return max(0., 3.1 * pow(max(1. - d / 9., 0.), 1.25) - .42 * smoothstep(.45, .08, d)); }
float lisse(float d){ d = abs(d); return 3.1 * pow(max(1. - d / 9., 0.), 1.25); }
// la cheminée : un chemin irrégulier, du toit de la chambre (vers -4,8 km) au cratère
float condX(float yk, float top){ return (.16 * sin(yk * .7 + 1.3) + .05 * sin(yk * 2.6 + .4)) * (1. - smoothstep(top - 1.4, top - .1, yk)); }
float condW(float yk, float top){ return .045 + .018 * sin(yk * 1.7 + .5) + .06 * smoothstep(top - .9, top, yk); }
// distance (km) d'un point à un segment, et position le long du segment (0 → 1)
vec2 seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return vec2(length(pa - ba * h), h); }
// une couleur par couche de roche (albédo sous la lune), d'après son numéro
vec3 couche(float id, float sous){
  float h = hash12(vec2(id, sous * 7.3 + 1.));
  vec3 c;
  if (sous < .5) c = h < .4 ? vec3(.021, .021, .024) : h < .65 ? vec3(.03, .023, .02) : h < .85 ? vec3(.036, .034, .031) : vec3(.027, .025, .024);   // laves, scories, cendres
  else c = h < .3 ? vec3(.04, .035, .028) : h < .55 ? vec3(.025, .025, .028) : h < .8 ? vec3(.042, .04, .036) : vec3(.023, .021, .021);          // grès, schistes, calcaires, vieilles laves
  return c * (.85 + .3 * hash12(vec2(id, 4.4)));
}
// des bulles (km) dans une grille qui défile vers le haut : (intérieur, liseré)
vec2 bulles(vec2 p, float cell, float vit, float dens, float rmin, float rmax){
  vec2 q = vec2(p.x, p.y - uT * vit) / cell, qi = floor(q), qf = fract(q);
  float b = 0., l = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 c = qi + vec2(i, j); float h = hash12(c);
    if (h > dens) continue;
    vec2 ctr = vec2(i, j) + .5 + .5 * (vec2(hash12(c + 3.1), hash12(c + 5.7)) - .5);
    ctr.x += .12 * sin(uT * .9 + h * 40.);
    float r = mix(rmin, rmax, hash12(c + 9.2)) / cell, d = length(qf - ctr);
    b = max(b, smoothstep(r, r * .7, d));
    l = max(l, smoothstep(r * .3, 0., abs(d - r * .8)));
  }
  return vec2(b, l);
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float xk = (px.x - uCx) * uKm, yk = (uGround - px.y) * uKm;   // km : à droite, et en hauteur au-dessus de la plaine
  float hs = relief(xk), top = relief(0.), visq = uVisq;
  float Tm = visq > .5 ? 900. : 1150.;
  float Hf = .9 + .22 * sin(uT * .55) + .1 * sin(uT * 1.37 + 1.);     // hauteur de la fontaine (km), comme à l'Etna : elle pulse lentement
  float lac = top + .12;                                               // le lac de lave au fond du cratère
  // les coulées de basalte : 5,5 km à gauche, 3,8 km à droite ; elles refroidissent en descendant
  float sF = abs(xk) - .45, LF = xk < 0. ? 5.5 : 3.8;
  float fl = visq > .5 ? 0. : step(0., sF) * step(sF, LF);
  float uF = clamp(sF / LF, 0., 1.);
  float TF = 1150. - 430. * pow(uF, .85);
  float thF = (.075 - .025 * uF) * fl;                                 // épaisseur grossie (×4 environ) pour rester visible
  vec3 col;
  if (yk > hs){
    float above = yk - hs, hv = yk - top;
    // le ciel nocturne
    col = mix(vec3(.006, .008, .02), vec3(.002, .003, .01), clamp(yk / 9., 0., 1.)) + vec3(.9, .9, 1.) * etoiles(px) * .3;
    // quelques nuages élevés : sombres au loin, rougis au-dessus du volcan par la lueur de l'éruption
    float nc = smoothstep(.5, .8, fbm(vec2(xk * .16 + uT * .008, yk * .55))) * exp(-pow((yk - 7.5) / 1.4, 2.));
    col = mix(col, vec3(.008, .009, .013) + incand(1050.) * (visq > .5 ? .1 : .3) * exp(-abs(xk) / 3.5), nc * .85);
    if (visq < .5){
      // la lueur de l'éruption dans l'air : autour de la fontaine, et au ras des coulées
      float rG = length(vec2(xk, (hv - Hf * .5) * 1.25));
      col += incand(1060.) * (.3 * exp(-rG / 1.) + .07 * exp(-rG / 3.5)) * (.7 + .35 * Hf);
      col += incand(TF) * .6 * smoothstep(.25, .75, abs(xk)) * step(sF, LF) * exp(-max(above - thF, 0.) / .22) * (1. - .6 * smoothstep(.3, 1., uF));
      col += incand(1150.) * .45 * exp(-max(yk - lac, 0.) / .3) * smoothstep(.7, .3, abs(xk));   // le lac de lave éclaire le cratère
      // le panache de gaz et de vapeur, poussé par le vent, éclairé par-dessous
      float h = max(hv, 0.), xc = .1 * h + .03 * h * h, w = .2 + .3 * h;
      if (hv > -.1 && abs(xk - xc) < 1.8 * w){
        vec2 q = vec2((xk - xc) / w * 1.1, h * .8 - uT * .09);
        vec2 wq = vec2(fbm(q * 2.1 + uT * .02), fbm(q * 1.6 - 2.));
        float n = fbm(q * 1.3 + wq * 1.2), nb = fbm(q * 1.3 + vec2(0., .12) + wq * 1.2);
        float dens = smoothstep(1.15, .3, abs(xk - xc) / w + (.55 - n) * .9) * smoothstep(-.05, .5, hv) * smoothstep(11., 5., h) * (.3 + .7 * n);
        float lit = clamp(.5 + (n - nb) * 9., 0., 1.);
        vec3 pl = incand(1080.) * 1.1 * exp(-h / 1.5) * (.35 + .65 * lit) + vec3(.022, .024, .032) * (.5 + .7 * n);
        col = mix(col, pl, clamp(dens, 0., 1.) * .92);
      }
      // la fontaine de lave : un jet qui pulse, et des gouttes en paraboles qui rougissent en refroidissant
      if (abs(xk) < 1.1 && hv > -.1 && hv < Hf * 1.3 + .1){
        float jw = .05 + .15 * clamp(hv / Hf, 0., 1.);
        float jet = exp(-pow(xk / jw, 2.)) * smoothstep(Hf * 1.1, Hf * .6, hv) * smoothstep(-.06, .02, hv);
        jet *= .7 + .6 * vnoise(vec2(xk * 30., hv * 10. - uT * 6.));
        col += incand(1160. - 70. * clamp(hv / Hf, 0., 1.)) * jet * 7.;
        col += incand(1100.) * .7 * exp(-pow(xk / (jw * 3.), 2.)) * smoothstep(Hf * 1.25, 0., hv) * smoothstep(-.06, .05, hv);   // le halo de la fontaine
        for (int i = 0; i < 64; i++){
          float fi = float(i), h1 = hash12(vec2(fi, 1.7)), h2 = hash12(vec2(fi, 4.1)), h3 = hash12(vec2(fi, 8.3));
          float tau = fract(uT * (.32 + .22 * h1) + h2);
          float D = (h3 - .5) * (.6 + 1.2 * h2 * h2), Hd = Hf * (.35 + .85 * h1);
          vec2 pp = vec2(D * tau, top + 4. * Hd * tau * (1. - tau));
          vec2 sv = vec2(D, 4. * Hd * (1. - 2. * tau)) * .055;          // une traînée, comme sur une photo posée
          float d = seg(vec2(xk, yk), pp - sv, pp).x / uKm;
          col += incand(1140. - 220. * tau) * 3. * exp(-d * d * 1.1);
        }
      }
      // la coulée, posée sur le flanc : croûte sombre qui fige vers l'aval, fissures incandescentes
      if (above < thF){
        float z = above / thF, adv = sF * 9. - uT * .5 * (1. - .7 * uF);
        float crack = smoothstep(.72, .93, vnoise(vec2(adv, xk < 0. ? 3. : 7.))) * (.4 + .6 * vnoise(vec2(adv * 3., z * 2.)));
        float crust = smoothstep(.05, .7, uF) * (.35 + .65 * z) * (1. - crack);
        vec3 lave = incand(TF + 40. * (vnoise(vec2(adv * 2., z)) - .5)) * 3.2;
        col = mix(lave, vec3(.018, .016, .016) * (.7 + .5 * vnoise(vec2(adv * 4., z * 3.))), clamp(crust, 0., 1.));
      }
      // le lac de lave au fond du cratère, couvert de plaques qui dérivent
      if (yk < lac && abs(xk) < .5){
        float pl2 = smoothstep(.55, .9, vnoise(vec2(xk * 18. - uT * .2, 2.)));
        col = incand(1150.) * 3.5 * (1. - .7 * pl2) + vec3(.02) * pl2;
      }
    } else {
      // colonne plinienne : jet de gaz étroit à la base, puis colonne de convection qui s'élargit en volutes (« chou-fleur »)
      float w = hv < .8 ? .12 + hv * .55 : .56 + (hv - .8) * .38;
      float e = fbm(vec2(hv * 1.4 - uT * .35, step(0., xk) * 5.3 + 1.));
      w *= .78 + .5 * e;
      vec2 q = vec2(xk * 1.6, hv * 1.5 - uT * .8);
      float n = fbm(q * 1.4 + vec2(fbm(q * 2.3 + uT * .15), fbm(q * 1.7 - 3.)) * 1.3);
      float nb = fbm(q * 1.4 + vec2(0., .06) + vec2(fbm(q * 2.3 + uT * .15), fbm(q * 1.7 - 3.)) * 1.3);
      float dens = smoothstep(1.05, .7, abs(xk) / w + (.5 - n) * .35) * smoothstep(-.05, .1, hv);
      float lit = clamp(.5 + (nb - n) * 12., 0., 1.);                       // le dessous des volutes reçoit la lueur du cratère
      vec3 cendre = vec3(.075, .07, .066) * (.55 + .7 * n) * (.8 + .3 * lit);
      vec3 lueur = incand(1000.) * (.6 * lit + .15) * exp(-max(hv, 0.) * 1.1);
      col = mix(col, cendre + lueur, clamp(dens, 0., 1.));
      col += incand(1050.) * 2.5 * smoothstep(.12, .0, abs(xk) - hv * .3) * smoothstep(.5, .0, hv) * step(0., hv);   // pyroclastes incandescents du jet
      // un éclair dans le panache (les cendres s'électrisent en se frottant) : local, jamais plein écran
      if (uEclair > 0.){ float e2 = exp(-pow(xk * 3. - sin(hv * 9. + uT) * .4 - .2, 2.) * 40.) * smoothstep(1.5, 2.5, hv) * smoothstep(5., 3.5, hv); col += vec3(.7, .75, 1.) * e2 * uEclair * 2.; }
      // le dôme de lave visqueuse dans le cratère : une croûte sombre fendue de lueurs
      float dome = top + .3 * (1. - pow(xk / .42, 2.));
      if (yk < dome && abs(xk) < .42){ float cr = smoothstep(.8, .95, vnoise(vec2(xk * 25., yk * 25.))); col = vec3(.03, .028, .027) * (.7 + .5 * vnoise(px * .7)) + incand(880.) * cr * 1.5; }
      // nuée ardente : un nuage brûlant de gaz et de cendres qui dévale le flanc
      if (uNuee > 0. && above < .6){
        float front = uNuee * 9.;
        float nu = smoothstep(.0, .35, front - abs(xk)) * smoothstep(.6, .0, above) * smoothstep(.3, .7, fbm(vec2(xk * 2. - uT, above * 3.)));
        col = mix(col, vec3(.07, .06, .055) + incand(720.) * .3, nu);
      }
    }
  } else {
    // la roche, coupée : couches de laves et de cendres dans l'édifice, vieilles couches plissées sous la plaine
    float sous = yk > 0. ? 0. : 1., u;
    if (yk > 0.) u = (lisse(xk) - yk) / (.16 + .06 * sin(xk * .9 + 1.)) + .9 * fbm(vec2(xk * .9, yk * 1.6));   // coulées et retombées, parallèles aux flancs
    else u = (-yk + step(xk, -5.2 + .35 * yk) * .9 + .22 * sin(xk * .33 + .6) + .4 * fbm(vec2(xk * .22, yk * .3))) / (.42 + .1 * sin(xk * .17 - yk * .4));   // une faille ancienne décale les couches
    vec3 roche = couche(floor(u), sous);
    roche *= .8 + .3 * vnoise(px * .45) + .12 * vnoise(px * 1.7);
    roche *= .92 + .08 * sin(fract(u) * 38. + vnoise(px * .2) * 3.) * sous;  // laminations fines des sédiments
    roche *= .7 + .3 * smoothstep(0., .06, fract(u));                        // le contact entre deux couches
    roche *= vec3(.9, .94, 1.06);                                            // lumière froide de la lune
    if (yk < -4.2 + .3 * fbm(vec2(xk * .3, 2.))){ float gr = hash12(floor(px * .5)); roche = vec3(.03, .028, .029) * (.75 + .4 * vnoise(px * .3)) + vec3(.008, .005, .004) * step(.9, gr) - vec3(.006) * step(gr, .06); }   // le socle cristallin (granite)
    col = roche;
    vec2 pw = vec2(xk + .03 * sin(yk * 9.) + .015 * sin(yk * 23.), yk);
    // un vieux dyke, figé : une bande de basalte sombre qui recoupe les couches
    vec2 d2 = seg(pw, vec2(-.8, -5.), vec2(-3.1, 1.));
    col = mix(col, vec3(.022, .022, .026) * (.8 + .4 * vnoise(px * .9)), smoothstep(.034, .02, d2.x));
    // la chambre magmatique, à 5-7 km : une lentille irrégulière de magma qui brasse
    vec2 cq = vec2((xk - .2) / 3.3, (yk + 6.) / 1.2);
    float ang = atan(cq.y, cq.x);
    float rc = length(cq) * (1. + .07 * sin(ang * 3. + 1.) + .05 * sin(ang * 7. + 2.));
    float m = smoothstep(1., .96, rc);
    if (rc < 1.4){
      vec2 p = vec2(xk, yk);
      vec2 wv = vec2(fbm(p * 1.4 + vec2(uT * .04, 0.)), fbm(p * 1.4 + vec2(0., -uT * .05) + 5.));
      float n = fbm(p * 2.2 + wv * 1.6 + vec2(0., -uT * .08));
      // convection : le magma chaud monte au centre, au-dessus de la recharge ; refroidi, il redescend le long des parois
      float plume = exp(-pow((xk - .2 - .25 * sin(yk * 3. - uT * .5)) / .75, 2.)) * smoothstep(1., .1, rc);
      float Tc = Tm + 150. * (n - .5) + 130. * plume - 260. * smoothstep(.6, 1., rc);
      vec3 mag = incand(Tc) * 1.7;
      mag *= 1. - .5 * smoothstep(.8, .95, vnoise(px * .55)) * (.5 + .5 * smoothstep(.6, 1., rc));   // cristaux, plus nombreux près des parois
      vec2 bb = bulles(p, .3, .07 + .05 * plume, (visq > .5 ? .3 : .14) + .3 * plume, .05, .11);         // bulles de gaz (grossies) qui montent, surtout dans le panache chaud
      mag = mix(mag, mag * .35, bb.x * m) + incand(Tc + 80.) * bb.y * 1.4 * m;
      col = mix(col, mag, m);
      col += incand(Tm - 80.) * .07 * exp(-max(rc - 1., 0.) * 6.) * (1. - m);                      // la roche autour, chauffée (auréole)
    }
    // un dyke actif : une lame de magma qui fend la roche depuis le toit de la chambre (elle n'a pas percé)
    vec2 d1 = seg(pw, vec2(1.15, -4.9), vec2(2.4, .8));
    float w1 = .024 * (1. - .85 * d1.y * d1.y), k1 = smoothstep(w1, w1 * .4, d1.x) * (1. - m);
    col = mix(col, incand(Tm - 60. - 160. * d1.y) * 1.8, k1);
    col += incand(Tm - 120.) * .045 * exp(-d1.x / .12) * (1. - k1) * (1. - m);
    // la cheminée : le magma monte ; ses bulles grossissent à mesure que la pression baisse
    float cx = condX(yk, top), cw = condW(yk, top);
    float cond = smoothstep(cw, cw * .55, abs(xk - cx)) * smoothstep(-5.4, -5., yk) * (1. - m);
    if (cond > 0.){
      float g = smoothstep(-5., top, yk);
      float Tcd = Tm - 30. + 30. * (vnoise(vec2(xk * 40., yk * 5. - uT * 1.2)) - .5);
      vec3 mc = incand(Tcd) * 1.9;
      vec2 bb = bulles(vec2(xk - cx, yk), .07, .25 + .5 * g, .25 + .5 * g, .008 + .02 * g, .016 + .03 * g);
      mc = mix(mc, mc * .3, bb.x) + incand(Tcd) * bb.y;
      if (visq > .5) mc = mix(mc, vec3(.05, .045, .04) + incand(950.) * bb.y * .6, smoothstep(top - 1.5, top - .9, yk) * .85);   // fragmentation : gaz et cendres
      col = mix(col, mc, cond);
    }
    col += incand(Tm - 50.) * .06 * exp(-abs(xk - cx) / .15) * step(-5., yk) * (1. - cond) * (1. - m);   // la roche chauffée le long de la cheminée
    // le haut du cône, éclairé par la fontaine
    float dd = hs - yk;
    col += incand(1060.) * (visq > .5 ? .06 : .22) * exp(-dd / .05) * exp(-abs(xk) / 1.3);
  }
  o = vec4(col, 1.);
}`;

  const WAX = {
    classique: { nom: 'Orange dans du violet', wax: [1.0, 0.42, 0.08], liq: [0.35, 0.12, 0.55] },
    rouge: { nom: 'Rouge dans du jaune', wax: [0.95, 0.12, 0.08], liq: [0.75, 0.6, 0.12] },
    vert: { nom: 'Vert dans du bleu', wax: [0.35, 1.0, 0.25], liq: [0.1, 0.22, 0.6] },
    rose: { nom: 'Rose dans du clair', wax: [1.0, 0.35, 0.65], liq: [0.55, 0.55, 0.6] },
  };

  window.FASC.push({
    id: 'lave', name: 'La Lampe à lave', cat: 'Cosmos', glyph: '⬮', decor: true, smoothTime: true,
    blurb: 'Convection : cire, cellules de Bénard, surface du Soleil',
    hint: 'OBSERVER : touchez la cire ou le liquide · REMUER : glissez pour brasser · CHAUFFER : maintenez pour chauffer sous le doigt · REFROIDIR : maintenez pour refroidir.',
    intro: 'Une ampoule chauffe une cire au fond d’une bouteille. La cire fond, se dilate, devient plus légère que le liquide qui l’entoure et monte en lentes colonnes. En haut, elle refroidit, s’alourdit et redescend. C’est la convection : le même mouvement que celui de la casserole d’eau, du manteau terrestre, et de la surface du Soleil, couverte de cellules grandes comme la France.',
    legend: [
      { color: '#ff6a14', name: 'Cire', role: 'paraffine et additifs', desc: 'Un peu plus dense que le liquide à froid, un peu moins une fois chaude : quelques degrés suffisent à inverser la poussée d’Archimède.' },
      { color: '#5a1e8c', name: 'Liquide', role: 'eau et additifs', desc: 'Les deux ne se mélangent pas : la tension de surface arrondit les gouttes et les fait se détacher en perles.' },
      { color: '#ffe080', name: 'Ampoule', role: '25 à 40 watts', desc: 'Elle chauffe par le bas et éclaire par transparence. Une lampe met une à deux heures à démarrer.' },
      { color: '#cc2010', name: 'Plaque chaude', role: 'cellules de Bénard', desc: 'Chauffé par le bas, un liquide reste immobile tant que l’écart de température est faible, puis s’organise d’un coup en rouleaux réguliers.' },
      { color: '#ffd27a', name: 'Granule solaire', role: '~1 000 km · 10 minutes', desc: 'Du gaz à 6 000 °C monte au centre de chaque granule, se refroidit en surface et replonge dans les couloirs sombres.' },
      { color: '#7a4a20', name: 'Tache solaire', role: 'champ magnétique intense', desc: 'Le champ magnétique y bloque la convection : la surface refroidit à 3 500 °C et paraît noire par contraste.' },
    ],
    about: [
      'L’Anglais Edward Craven Walker invente la lampe à lave en 1963, après avoir vu dans un pub un minuteur d’œuf fait de cire dans un liquide. La recette exacte reste secrète, mais le principe est connu : une cire à peine plus dense que le liquide à température ambiante, mais qui se dilate davantage en chauffant. Quand elle dépasse la température d’équilibre, la poussée d’Archimède l’emporte et elle monte ; arrivée en haut, loin de l’ampoule, elle refroidit et redescend.',
      'La simulation résout les équations de Navier-Stokes dans la bouteille, transporte la chaleur, et traite la cire par un champ de phase de Cahn et Hilliard (1958) : une grandeur qui vaut 1 dans la cire et −1 dans le liquide, et qui pousse les deux à se séparer avec une frontière fine. La tension de surface vient de la même équation : elle arrondit les gouttes et fait se pincer les colonnes, comme un filet d’eau qui se casse en perles (instabilité de Plateau-Rayleigh).',
      'En 1900, Henri Bénard chauffe par en dessous une fine couche d’huile de baleine et voit apparaître un réseau d’hexagones. Lord Rayleigh explique en 1916 le seuil d’apparition : le nombre de Rayleigh, qui compare la poussée d’Archimède à la viscosité et à la diffusion de la chaleur, doit dépasser environ 1 708. En dessous, la chaleur passe par conduction ; au-dessus, le liquide s’organise en rouleaux qui tournent alternativement dans un sens et dans l’autre.',
      'La surface du Soleil bout de la même façon : des millions de granules de 1 000 km environ, qui vivent une dizaine de minutes. Le gaz chaud monte au centre, le gaz refroidi redescend dans les couloirs sombres, 300 °C plus froids. Le télescope Daniel K. Inouye, à Hawaï, les a photographiées en 2020 avec des détails de 30 km. Le Soleil vibre aussi, toutes les cinq minutes environ : l’héliosismologie s’en sert pour sonder son intérieur.',
      'Sous nos pieds, la roche est solide : le magma ne naît qu’à trois endroits. Aux dorsales, le manteau remonte et fond parce que la pression baisse (la décompression). Aux points chauds, un panache plus chaud monte du fond du manteau. Aux subductions, la plaque océanique qui plonge entraîne de l’eau, et cette eau fait fondre le manteau au-dessus d’elle : ce sont les volcans des Andes, du Japon ou de l’Indonésie, souvent explosifs, car leur magma est visqueux et riche en gaz.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez la cire ou le liquide : température et sens du mouvement.' },
      { id: 'remuer', label: 'remuer', desc: 'Glissez pour brasser le liquide.' },
      { id: 'chauffer', label: 'chauffer', desc: 'Maintenez le doigt pour chauffer : la cire monte.' },
      { id: 'refroidir', label: 'refroidir', desc: 'Maintenez le doigt pour refroidir : la cire s’alourdit et tombe.' },
    ],
    make(env) {
      try { return makeLave(env); } catch (e) {
        console.warn('La Lampe à lave : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#100818'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('La Lampe à lave demande WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeLave(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = { scene: 'lampe', q: 'haute', wax: 'classique', on: true, heat: 1, speed: 1, ra: 0.6, benView: 0, zoom: 1, spot: true, sunSpeed: 0.5, geo: 4, hot: 0.6, magma: 'fluide', loupe: true };
    // volcans et intérieur de la Terre : temps géologique écoulé (millions d'années), nuées ardentes et éclairs du panache
    const GEO = ['terre', 'pointchaud', 'volcan'], isGeo = () => GEO.includes(cfg.scene);
    let ma = 0, nuee = 0, nueeT = 9, eclair = 0, eclT = 4;
    let T = 0, R = null, G = null, label = null, warm = 0;

    function initGL() {
      const s = Math.min(dpr, 1.5), K = GLKit(Math.round(W * s), Math.round(H * s));
      const pg = {}; for (const k in FS) pg[k] = K.program(FS[k]);
      pg.lamp = K.program(FS_LAMP); pg.ben = K.program(FS_BEN); pg.sun = K.program(FS_SUN);
      // la cabine commune (halo, courbe filmique, grain) : seulement si elle est chargée
      let cab = null;
      if (window.FKGL.cabine) { try { pg.lampH = K.program(FS_LAMP_HDR); pg.sunH = K.program(FS_SUN_HDR); pg.benH = K.program(FS_BEN_HDR); cab = window.FKGL.cabine(K); if (window.FKR) { pg.terre = K.program(FS_TERRE()); pg.chaud = K.program(FS_CHAUD()); pg.volc = K.program(FS_VOLCAN()); } } catch (e) { console.warn('Lampe à lave : rendu simple', e); cab = null; } }
      return { K, gl: K.gl, s, pg, cab };
    }
    G = initGL();

    /* ───────── grilles ───────── */
    // profil du verre : un fuseau renflé en bas (demi-largeur en fraction de la grille)
    const hw = (y) => 0.17 + 0.29 * Math.exp(-Math.pow((y - 0.24) / 0.4, 2));
    // gouttes de départ : x, y (fractions de la grille), rayon (en hauteur de grille), température (0 froid → 1 chaud)
    const LAMP_BLOBS = [[0.5, 0.3, 0.05, 0.42], [0.43, 0.5, 0.036, 0.4], [0.57, 0.66, 0.042, 0.34], [0.48, 0.84, 0.032, 0.26], [0.53, 0.17, 0.035, 0.45]];
    function build() {
      const Q = QUAL[cfg.q], { K, gl } = G;
      let GW, GH;
      if (cfg.scene === 'lampe') { GW = Math.round(Q.gw * 0.55); GH = Q.gw * 2; }
      else { GW = Q.gw * 2; GH = Math.max(32, Math.round((Q.gw * 2 * H * 0.6) / view().w)); }
      const n = GW * GH, mask = new Float32Array(n * 4), S = new Float32Array(n * 4);
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const x = (i + 0.5) / GW, y = (j + 0.5) / GH, k = (j * GW + i) * 4;
        let solid;
        if (cfg.scene === 'lampe') solid = Math.abs(x - 0.5) > hw(y) || y < 0.012 || y > 0.988;
        else solid = i === 0 || i === GW - 1 || j === 0 || j === GH - 1;
        mask[k] = solid ? 1 : 0;
        if (cfg.scene === 'lampe') {
          // une lampe déjà en marche (recette qualité : « départ vide ») : une flaque chaude au fond, des gouttes en route,
          // le liquide plus chaud en bas qu'en haut. Éteindre puis rallumer montre la longue mise en chauffe.
          let ph = y < 0.1 ? 1 : -1, tt = 0.3 - 0.05 * y;
          for (const [bx, by, br, bt] of LAMP_BLOBS) { const dx = ((x - bx) * GW) / GH, dy = y - by; if (dx * dx + dy * dy < br * br) { ph = 1; tt = bt; } }
          S[k] = ph; S[k + 1] = y < 0.1 ? 0.5 : tt;
        }
        else {
          // Bénard (recette qualité : « un rectangle uni, comme une mire ») : on part du profil de conduction (chaud en bas,
          // froid en haut) avec une petite ondulation en rouleaux ; au-dessus du seuil elle grandit, en dessous elle s'éteint.
          S[k] = -1; S[k + 2] = y;
          S[k + 1] = Math.min(1, Math.max(0, 0.82 - 0.64 * y + 0.07 * Math.cos(TAU * x * 6 + 0.4) * Math.sin(Math.PI * y) + rnd(0.01, -0.01)));
        }
      }
      const F = gl.LINEAR;
      R = {
        GW, GH, Q, px: [1 / GW, 1 / GH],
        M: K.texture(GW, GH, 'f16', gl.NEAREST, mask),
        V: K.double(GW, GH, 'f16', F), S: K.double(GW, GH, 'f16', F), Mu: K.target(GW, GH, 'f16', F), P: K.double(GW, GH, 'f16', gl.NEAREST), D: K.target(GW, GH, 'f16', gl.NEAREST),
      };
      for (const t of [R.S.r, R.S.w]) { gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, GW, GH, 0, gl.RGBA, gl.FLOAT, S); }
      warm = cfg.scene === 'lampe' && cfg.on ? 0.6 : 0;
    }

    /* ───────── un pas du solveur ───────── */
    let pushes = [], brushes = [];
    function step(dt) {
      const { K, pg } = G, px = R.px, lamp = cfg.scene === 'lampe';
      const bc = (P) => P.t('uM', R.M).f('uPx', px[0], px[1]);
      const sub = R.Q.sub, h = dt / sub;
      const BR = new Float32Array(32), PP = new Float32Array(32), PV = new Float32Array(32);
      brushes.slice(0, 8).forEach((b, i) => BR.set([b.x, b.y, b.r, b.k], i * 4));
      pushes.slice(0, 8).forEach((p, i) => { PP.set([p.x, p.y, p.r, p.k], i * 4); PV.set([p.vx, p.vy, 0, 0], i * 4); });
      for (let s = 0; s < sub; s++) {
        bc(pg.adv.use()).t('uV', R.V.r).t('uQ', R.V.r).f('uDt', h).f('uKeep', 0); K.run(pg.adv, R.V.w); R.V.swap();
        bc(pg.adv.use()).t('uV', R.V.r).t('uQ', R.S.r).f('uDt', h).f('uKeep', 1); K.run(pg.adv, R.S.w); R.S.swap();
        if (lamp) { bc(pg.mu.use()).t('uS', R.S.r).f('uE2', 1.0); K.run(pg.mu, R.Mu); }
        else { R.K = K; }
        bc(pg.upd.use()).t('uS', R.S.r).t('uMu', R.Mu).f('uDt', h).f('uMob', lamp ? 0.06 : 0).f('uKap', lamp ? 0.06 : 0.14).f('uHeat', lamp ? (cfg.on ? 0.06 * cfg.heat : 0) : cfg.ra * 0.8 + 0.1).f('uCool', 0.03).f('uMode', lamp ? 0 : 1).f('uRoom', 0.25)
          .i('uNB', Math.min(8, brushes.length)).v4('uB', BR).f('uRes', R.GW, R.GH);
        K.run(pg.upd, R.S.w); R.S.swap();
        bc(pg.frc.use()).t('uV', R.V.r).t('uS', R.S.r).t('uMu', R.Mu).f('uDt', h).f('uG', lamp ? 0.06 : 0.03 + cfg.ra * 0.15).f('uAw', lamp ? 1 : 1).f('uAl', 0.15).f('uTn', 0.62).f('uSig', lamp ? 0.5 : 0).f('uMode', lamp ? 0 : 1).f('uDamp', lamp ? 0.995 : 0.985)
          .i('uNP', Math.min(8, pushes.length)).v4('uP', PP).v4('uPV', PV).f('uRes', R.GW, R.GH);
        K.run(pg.frc, R.V.w); R.V.swap();
        bc(pg.div.use()).t('uV', R.V.r); K.run(pg.div, R.D);
        for (let i = 0; i < R.Q.jac; i++) { bc(pg.jac.use()).t('uP', R.P.r).t('uD', R.D); K.run(pg.jac, R.P.w); R.P.swap(); }
        bc(pg.grd.use()).t('uP', R.P.r).t('uV', R.V.r); K.run(pg.grd, R.V.w); R.V.swap();
      }
      pushes = []; brushes = [];
    }

    /* ───────── géométrie à l'écran ───────── */
    function lampBox() {
      // le verre, puis son socle (22 % de sa hauteur) qui pose sur une table : de quoi voir la lampe s'y refléter
      const v = view(), hh = H * 0.66, ww = hh * (R.GW / R.GH);
      return { x: v.cx - ww / 2, y: H * 0.075, w: ww, h: hh };
    }
    function toGrid(x, y) {
      if (cfg.scene === 'lampe') { const b = lampBox(); return [((x - b.x) / b.w) * R.GW, (1 - (y - b.y) / b.h) * R.GH, R.GW / b.w]; }
      const v = view(), y0 = H * 0.2, hh = H * 0.6; return [((x - v.x0) / v.w) * R.GW, (1 - (y - y0) / hh) * R.GH, R.GW / v.w];
    }

    /* ───────── son ───────── */
    let hum = null;
    if (snd()) { hum = au.drone(100, 'sine', 0); }

    /* ───────── boucle ───────── */
    function update(dt) {
      const k = dt / 0.4;
      T += k;
      if ((cfg.scene === 'lampe' || cfg.scene === 'benard') && R) {
        // la vitesse se répartit sur des sous-pas (au plus 1,2 chacun) : sur une tablette lente, « Vitesse » au-delà de 100 % agit encore
        const want = k * 30 * cfg.speed, n = Math.min(3, Math.max(1, Math.ceil(want / 1.2)));
        for (let i = 0; i < n; i++) step(Math.min(1.2, want / n) * 1.5);
        warm = Math.min(1, warm + k * 0.01);
      }
      if (hum) hum.gain(cfg.scene === 'lampe' && cfg.on ? 0.012 : cfg.scene === 'soleil' ? 0.01 : 0);
      if (cfg.scene === 'terre') ma += k * cfg.geo;
      if (cfg.scene === 'pointchaud') ma += k * cfg.hot;
      if (cfg.scene === 'volcan' && cfg.magma === 'visqueux'){
        // nuées ardentes de temps en temps ; éclairs rares dans le panache (au plus un toutes les 2 s, plus doux en mode doux)
        if (nuee > 0) { nuee += k / 9; if (nuee > 1) { nuee = 0; nueeT = rnd(16, 9); } } else if ((nueeT -= k) <= 0) nuee = 0.001;
        eclair *= Math.exp(-k * 14);
        if ((eclT -= k) <= 0) { eclair = env.doux ? 0.35 : 1; eclT = rnd(7, 2.2); }
      }
      if (label) label.t += k;
    }
    // géométrie des scènes géologiques (px CSS)
    function geoTerre() {
      const v = view(), y0 = (env.view && env.view.y0) || 0, R = Math.min(v.w * 0.34, (H - y0) * 0.43), cx = v.cx + R * 0.12, cy = y0 + (H - y0) * 0.52;
      const th = 2.35, zx = cx + Math.cos(th) * R, zy = cy - Math.sin(th) * R, Lr = R * 0.36;
      let lx = zx + Math.cos(th) * (Lr + R * 0.06), ly = zy - Math.sin(th) * (Lr + R * 0.06);
      lx = Math.max(v.x0 + Lr + 8, lx); ly = Math.max(y0 + Lr + 8, ly);
      return { cx, cy, R, th, zx, zy, Lr, lx, ly };
    }
    function geoChaud() {
      const v = view(), y0 = (env.view && env.view.y0) || 0;
      return { km: 2600 / v.w, ex: 25, sea: y0 + (H - y0) * 0.27, hot: v.x0 + v.w * 0.78, V: 90, dt: 1.1 };
    }
    function geoVolcan() {
      const v = view(), y0 = (env.view && env.view.y0) || 0;
      return { km: Math.max(30 / v.w, 7.6 / ((H - y0) * 0.38)), ground: y0 + (H - y0) * 0.55, cx: v.cx };
    }
    function render() {
      const { K, pg } = G, cw = K.canvas.width, ch = K.canvas.height, s = G.s;
      const bare = env.decor === false, ink = bare && env.theme === 'light', v = view();
      if (cfg.scene === 'lampe') {
        const b = lampBox(), C = WAX[cfg.wax];
        if (!bare && G.cab) {
          const cx = (b.x + b.w / 2) * s, wb = hw(0) * b.w * 1.02 * s, wt = hw(1) * b.w * 1.04 * s;
          const baseTop = (b.y + b.h - 1) * s, baseBot = (b.y + b.h * 1.22) * s, capBot = (b.y + 1) * s, capTop = (b.y - b.h * 0.07) * s;
          pg.lampH.use().t('uS', R.S.r).f('uRes', cw, ch).f('uPx', R.px[0], R.px[1]).f('uBox', b.x * s, b.y * s, b.w * s, b.h * s)
            .f('uBase', baseTop, baseBot, wb, wb * 1.55).f('uCap', capBot, capTop, wt, wt * 0.55).f('uWax', ...C.wax).f('uLiq', ...C.liq)
            .f('uOn', cfg.on ? 1 : 0).f('uT', T).f('uWarm', warm).f('uHeat', cfg.heat).f('uCx', cx).f('uTab', baseBot);
          K.run(pg.lampH, G.cab.scene);
          G.cab.finish({ tone: 'agx', expo: 1.25, bloom: 0.9, thr: 0.8, knee: 0.6, radius: 0.8, vig: 0.4, grain: 0.03, grainBlack: 0.4 });
        } else {
        pg.lamp.use().t('uS', R.S.r).t('uM', R.M).f('uRes', cw, ch).f('uPx', R.px[0], R.px[1]).f('uBox', b.x * s, b.y * s, b.w * s, b.h * s).f('uWax', ...C.wax).f('uLiq', ...C.liq).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uOn', cfg.on ? 1 : 0.15).f('uT', T);
        K.run(pg.lamp, null);
        }
      } else if (isGeo()) {
        if (!G.cab || !pg.terre) { K.gl.clearColor(0.02, 0.02, 0.03, 1); K.gl.bindFramebuffer(K.gl.FRAMEBUFFER, null); K.gl.clear(K.gl.COLOR_BUFFER_BIT); }
        else {
          if (cfg.scene === 'terre') {
            const g = geoTerre();
            pg.terre.use().f('uRes', cw, ch).f('uC', g.cx * s, (H - g.cy) * s).f('uR', g.R * s).f('uMa', ma).f('uT', T)
              .f('uLr', cfg.loupe ? g.Lr * s : 0).f('uLc', g.lx * s, (H - g.ly) * s).f('uLz', 6371 * Math.cos(g.th), 6371 * Math.sin(g.th)).f('uLzoom', 20);
            K.run(pg.terre, G.cab.scene);
            G.cab.finish({ expo: 1.05, bloom: 0.6, thr: 1.0, knee: 0.5, radius: 0.8, vig: 0.3, grain: 0.03, grainBlack: 0.3 });
          } else if (cfg.scene === 'pointchaud') {
            const g = geoChaud();
            pg.chaud.use().f('uRes', cw, ch).f('uKm', g.km / s).f('uEx', g.ex).f('uSea', g.sea * s).f('uHot', g.hot * s).f('uMa', ma).f('uT', T).f('uV', g.V).f('uDt', g.dt);
            K.run(pg.chaud, G.cab.scene);
            G.cab.finish({ expo: 1.2, bloom: 0.8, thr: 1.0, knee: 0.6, radius: 0.8, vig: 0.3, grain: 0.03, grainBlack: 0.3 });
          } else {
            const g = geoVolcan();
            pg.volc.use().f('uRes', cw, ch).f('uKm', g.km / s).f('uGround', g.ground * s).f('uCx', g.cx * s).f('uT', T).f('uVisq', cfg.magma === 'visqueux' ? 1 : 0).f('uNuee', nuee).f('uEclair', eclair);
            K.run(pg.volc, G.cab.scene);
            G.cab.finish({ expo: 1.2, bloom: 0.9, thr: 1.0, knee: 0.6, radius: 0.8, vig: 0.35, grain: 0.03, grainBlack: 0.35 });
          }
        }
      } else if (cfg.scene === 'benard' && !bare && G.cab) {
        const y0 = H * 0.2, hh = H * 0.6;
        pg.benH.use().t('uS', R.S.r).f('uRes', cw, ch).f('uPx', R.px[0], R.px[1]).f('uRect', v.x0 * s, y0 * s, v.w * s, hh * s).f('uView', cfg.benView).f('uRa', cfg.ra).f('uT', T);
        K.run(pg.benH, G.cab.scene);
        G.cab.finish({ expo: 1.25, bloom: 0.8, thr: 0.8, knee: 0.5, radius: 0.75, vig: 0.35, grain: 0.03, grainBlack: 0.35 });
      } else if (cfg.scene === 'benard') {
        pg.ben.use().t('uS', R.S.r).f('uRes', cw, ch).f('uPx', R.px[0], R.px[1]).f('uView', cfg.benView).f('uInk', ink ? 1 : 0);
        K.run(pg.ben, { fb: null, w: cw, h: ch });
      } else {
        const R0 = Math.min(v.w, H) * 0.44 * s;
        if (!bare && G.cab) {
          pg.sunH.use().f('uRes', cw, ch).f('uC', v.cx * s, (H / 2) * s).f('uT', T * cfg.sunSpeed).f('uZoom', cfg.zoom).f('uSpot', cfg.spot ? 1 : 0).f('uR', cfg.zoom ? Math.max(v.w, H) * 0.5 * s : R0);
          K.run(pg.sunH, G.cab.scene);
          G.cab.finish({ tone: 'aces', expo: 1, bloom: cfg.zoom ? 0.2 : 0.5, thr: 2.5, knee: 0.5, radius: 0.85, vig: cfg.zoom ? 0.3 : 0.2, grain: 0.025, grainBlack: 0.3 });
        } else {
        pg.sun.use().f('uRes', cw, ch).f('uC', v.cx * s, (H / 2) * s).f('uT', T * cfg.sunSpeed).f('uZoom', cfg.zoom).f('uSpot', cfg.spot ? 1 : 0).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uR', cfg.zoom ? Math.max(v.w, H) * 0.5 * s : R0);
        K.run(pg.sun, null);
        }
      }
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.imageSmoothingEnabled = true;
      if (cfg.scene === 'benard' && (bare || !G.cab)) {
        const y0 = H * 0.2, hh = H * 0.6;
        ctx.fillStyle = ink ? '#f3eee3' : '#06060a'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(K.canvas, 0, 0, cw, ch, v.x0, y0, v.w, hh);
        if (!bare) { ctx.fillStyle = '#7a1e10'; ctx.fillRect(v.x0, y0 + hh, v.w, 8); ctx.fillStyle = '#1c3c7a'; ctx.fillRect(v.x0, y0 - 8, v.w, 8); }
      } else ctx.drawImage(K.canvas, 0, 0, W, H);
      ctx.restore();
      if (cfg.scene === 'lampe' && !bare && !G.cab) drawMetal();
      if (isGeo()) geoLabels();
      hud(ink);
      drawLabel();
    }
    // socle et chapeau métalliques
    function drawMetal() {
      const b = lampBox(), cx = b.x + b.w / 2;
      const gbot = (y) => b.w * hw(y);
      ctx.save();
      const wb = gbot(0) * 1.02, wt = gbot(1) * 1.04;
      const grad = (x0, x1) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#2a2a30'); g.addColorStop(0.35, '#b8b8c4'); g.addColorStop(0.5, '#f0f0f6'); g.addColorStop(0.7, '#6a6a76'); g.addColorStop(1, '#202026'); return g; };
      // socle conique avec la fente d'aération
      ctx.fillStyle = grad(cx - wb * 1.5, cx + wb * 1.5);
      ctx.beginPath(); ctx.moveTo(cx - wb, b.y + b.h - 2); ctx.lineTo(cx + wb, b.y + b.h - 2); ctx.lineTo(cx + wb * 1.55, H * 0.985); ctx.lineTo(cx - wb * 1.55, H * 0.985); ctx.fill();
      if (cfg.on) { ctx.fillStyle = 'rgba(255,200,120,.35)'; ctx.fillRect(cx - wb * 0.5, b.y + b.h + (H * 0.985 - b.y - b.h) * 0.45, wb, 3); }
      // chapeau
      ctx.fillStyle = grad(cx - wt * 1.2, cx + wt * 1.2);
      ctx.beginPath(); ctx.moveTo(cx - wt, b.y + 2); ctx.lineTo(cx + wt, b.y + 2); ctx.lineTo(cx + wt * 0.55, b.y - H * 0.06); ctx.lineTo(cx - wt * 0.55, b.y - H * 0.06); ctx.fill();
      ctx.restore();
    }
    // étiquettes des scènes géologiques (texte à chasse fixe, comme le reste de l'application)
    function geoLabels() {
      ctx.save();
      ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.shadowColor = 'rgba(0,0,0,.95)'; ctx.shadowBlur = 5;
      const put = (t, x, y, col, al) => { ctx.textAlign = al || 'center'; ctx.fillStyle = col || 'rgba(240,236,255,.82)'; ctx.fillText(t, x, y); };
      if (cfg.scene === 'terre') {
        const g = geoTerre(), a = Math.PI * 1.13, at = (f) => [g.cx + Math.cos(a) * g.R * f, g.cy - Math.sin(a) * g.R * f];
        let [x, y] = at(0.02); put('GRAINE · FER SOLIDE · 5 400 °C', x, y + 3);
        [x, y] = at(0.37); put('NOYAU EXTERNE · FER LIQUIDE', x, y); put('4 000 À 5 000 °C', x, y + 13);
        [x, y] = at(0.76); put('MANTEAU · ROCHE SOLIDE', x, y); put('1 000 À 3 500 °C · QUELQUES CM PAR AN', x, y + 13);
        const pa = 0.97, px = g.cx + Math.cos(pa) * g.R * 0.62, py = g.cy - Math.sin(pa) * g.R * 0.62;
        put('PANACHE (POINT CHAUD)', px + 12, py, 'rgba(255,214,160,.9)', 'left');
        if (cfg.loupe) { put('LOUPE ×20 · LA CROÛTE (7 À 35 KM)', g.lx, g.ly + g.Lr + 16); put('EST FINE COMME UNE PEAU DE POMME', g.lx, g.ly + g.Lr + 29); }
      } else if (cfg.scene === 'pointchaud') {
        const g = geoChaud(), v = view(), vz = g.ex / g.km, floor = g.sea + 5.5 * vz, lith = floor + 95 / g.km;
        put('← PLAQUE PACIFIQUE · ENVIRON 9 CM PAR AN', v.x0 + 16, lith - 8, 'rgba(240,236,255,.8)', 'left');
        put('PANACHE : ROCHE SOLIDE,', g.hot - 50, lith + (H - lith) * 0.55, 'rgba(255,214,160,.9)', 'right');
        put('250 °C PLUS CHAUDE, QUI MONTE', g.hot - 50, lith + (H - lith) * 0.55 + 13, 'rgba(255,214,160,.9)', 'right');
        put('FUSION PARTIELLE → MAGMA', g.hot - 50, lith + 30, 'rgba(255,200,120,.9)', 'right');
        const k0 = Math.floor(ma / g.dt);
        for (let i = 0; i < 26; i++) {
          const k = k0 - i, age = ma - k * g.dt;
          if (age < 0) continue;
          const x = g.hot - g.V * age / g.km;
          if (x < v.x0 + 20 || x > v.x1 - 10) continue;
          if (i % (age > 6 ? 3 : 1)) continue;
          put(age < 3 ? fr(age, 1) + ' MA' : Math.round(age) + ' MA', x, floor + 14, 'rgba(220,226,255,.7)');
        }
        put('VOLCAN ACTIF', g.hot - 25, g.sea - 7 * vz, 'rgba(255,190,120,.9)');
      } else if (cfg.scene === 'volcan') {
        const g = geoVolcan(), z = (km) => km / g.km;
        put('CHAMBRE MAGMATIQUE · 5 À 7 KM SOUS LA PLAINE', g.cx + z(3.7), g.ground + z(6), 'rgba(255,200,120,.9)', 'left');
        put('LE MAGMA BRASSE · BULLES DE GAZ (GROSSIES)', g.cx + z(3.7), g.ground + z(6) + 13, 'rgba(255,200,120,.75)', 'left');
        put('CHEMINÉE', g.cx + z(0.4), g.ground + z(2.9), 'rgba(255,214,160,.85)', 'left');
        put('DYKE : LE MAGMA FEND LA ROCHE', g.cx + z(2.5), g.ground + z(0.9), 'rgba(255,214,160,.8)', 'left');
        put('VIEUX DYKE, FIGÉ', g.cx - z(2.9), g.ground + z(1.6), 'rgba(220,214,230,.7)', 'right');
        if (cfg.magma === 'visqueux') { put('COLONNE DE CENDRES', g.cx + z(2.2), g.ground - z(6.5), 'rgba(235,232,255,.8)', 'left'); put('ELLE MONTE À 20-40 KM', g.cx + z(2.2), g.ground - z(6.5) + 13, 'rgba(235,232,255,.8)', 'left'); if (nuee > 0.05) put('NUÉE ARDENTE', g.cx + z(nuee * 8.5), g.ground - z(0.6), 'rgba(255,220,190,.9)'); }
        else {
          put('FONTAINE DE LAVE · BASALTE À ~1 150 °C', g.cx + z(1.1), g.ground - z(3.9), 'rgba(255,200,120,.9)', 'left');
          put('COULÉE : JAUNE À 1 150 °C, ROUGE VERS 900 °C, PUIS UNE CROÛTE NOIRE', g.cx - z(3.2), g.ground - z(2.6), 'rgba(255,200,120,.85)', 'right');
          put('(ÉPAISSEUR GROSSIE POUR ÊTRE VISIBLE)', g.cx - z(3.2), g.ground - z(2.6) + 13, 'rgba(255,200,120,.65)', 'right');
        }
        const v = view(), bx = v.x1 - 30 - z(5), by = H - 34;
        ctx.strokeStyle = 'rgba(240,236,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + z(5), by); ctx.stroke();
        put('5 KM', bx + z(2.5), by - 6, 'rgba(240,236,255,.75)');
      }
      ctx.restore();
    }
    function hud(ink) {
      const v = view();
      ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink ? 'rgba(40,30,80,.75)' : 'rgba(230,228,255,.6)';
      let s = '';
      if (cfg.scene === 'lampe') s = cfg.on ? (warm < 0.25 ? 'LA LAMPE CHAUFFE…' : 'CONVECTION · LA CIRE CHAUDE MONTE, LA FROIDE DESCEND') : 'LAMPE ÉTEINTE · LA CIRE REFROIDIT ET SE DÉPOSE';
      if (cfg.scene === 'benard') s = `CELLULES DE BÉNARD · NOMBRE DE RAYLEIGH ≈ ${Math.round(400 + cfg.ra * cfg.ra * 9000).toLocaleString('fr-FR')}${400 + cfg.ra * cfg.ra * 9000 < 1708 ? ' · SOUS LE SEUIL (1 708)' : ''}`;
      if (cfg.scene === 'soleil') s = (cfg.zoom ? 'PHOTOSPHÈRE · CHAMP DE 30 000 KM · GRANULES DE ~1 000 KM' : 'LE SOLEIL · 1,39 MILLION DE KM · ASSOMBRISSEMENT CENTRE-BORD') + ' · LE SOLEIL EST BLANC : L’OR EST LA CONVENTION DES IMAGES FILTRÉES';
      if (cfg.scene === 'terre') s = `LA TERRE EN COUPE, À L’ÉCHELLE · 1 S ≈ ${fr(cfg.geo, cfg.geo < 1 ? 1 : 0)} MILLION${cfg.geo >= 2 ? 'S' : ''} D’ANNÉES · ${Math.round(ma)} MILLIONS D’ANNÉES ÉCOULÉS`;
      if (cfg.scene === 'pointchaud') s = `POINT CHAUD · 1 S ≈ ${Math.round(cfg.hot * 1000).toLocaleString('fr-FR')} 000 ANS · RELIEF EXAGÉRÉ ×25 AU-DESSUS DU FOND MARIN, À L’ÉCHELLE EN DESSOUS`;
      if (cfg.scene === 'volcan') s = 'SOUS LE VOLCAN, À L’ÉCHELLE · ' + (cfg.magma === 'visqueux' ? 'MAGMA VISQUEUX ET GAZEUX : IL EXPLOSE' : 'BASALTE FLUIDE : IL COULE');
      // la convention des couleurs, dite à l'écran (règle de Hubble de la DA)
      let c = '';
      if (cfg.scene === 'benard') c = cfg.benView ? 'COLORANT FLUORESCENT : IL SUIT L’ÉCOULEMENT' : 'FAUSSES COULEURS : LA TEMPÉRATURE (NOIR = PLUS FROID, JAUNE = PLUS CHAUD)';
      if (cfg.scene === 'terre') c = 'COULEURS : LA LUEUR QU’AURAIT LA MATIÈRE À SA TEMPÉRATURE · PERSONNE NE PEUT VOIR L’INTÉRIEUR DE LA TERRE';
      if (cfg.scene === 'pointchaud' || cfg.scene === 'volcan') c = 'COULEURS : LA LUEUR QU’AURAIT LA ROCHE À SA TEMPÉRATURE · PERSONNE NE PEUT VOIR SOUS LA SURFACE';
      // retour à la ligne aux « · » quand l'écran est étroit (tablette en portrait, téléphone)
      const lines = [], maxw = v.w - 32;
      for (const t of [c, s]) {
        if (!t) continue;
        let cur = '';
        for (const part of t.split(' · ')) { const nx = cur ? cur + ' · ' + part : part; if (cur && ctx.measureText(nx).width > maxw) { lines.push(cur); cur = part; } else cur = nx; }
        lines.push(cur);
      }
      lines.forEach((t, i) => { ctx.globalAlpha = t === s || s.includes(t) ? 1 : 0.75; ctx.fillText(t, v.x0 + 16, H - 16 - (lines.length - 1 - i) * 15); });
      ctx.restore();
    }
    let pending = false;
    function frame(t, dt) {
      if (dt > 0) update(dt);
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    /* ───────── identification ───────── */
    function readAt(x, y) {
      if (cfg.scene === 'soleil' || isGeo()) return { geo: true };
      const [gx, gy] = toGrid(x, y);
      try { return { s: G.K.read(R.S.r, gx, gy), v: G.K.read(R.V.r, gx, gy), m: G.K.read(R.M, gx, gy) }; } catch (e) { return null; }
    }
    function describe(l) {
      if (l.m && l.m.geo && isGeo()) {
        if (cfg.scene === 'terre') {
          const g = geoTerre(), r = Math.hypot(l.x - g.cx, l.y - g.cy) / g.R;
          if (r < 0.192) return ['Graine', 'fer et nickel solides · environ 5 400 °C · solide malgré la chaleur, à cause de la pression', '#fff2d0'];
          if (r < 0.546) return ['Noyau externe', 'fer liquide, 4 000 à 5 000 °C · ses courants créent le champ magnétique terrestre', '#ffd27a'];
          if (r < 0.984) return ['Manteau', 'roche solide, 1 000 à 3 500 °C · elle coule de quelques centimètres par an', '#ff8a3c'];
          if (r <= 1.0) return ['Lithosphère', 'les plaques : croûte (7 à 35 km) et manteau rigide, environ 100 km', '#c8b8a0'];
          return ['Espace', 'l’atmosphère ne fait qu’une centaine de kilomètres : un trait à cette échelle', '#9fd8ff'];
        }
        if (cfg.scene === 'pointchaud') {
          const g = geoChaud(), vz = g.ex / g.km, floor = g.sea + 5.5 * vz, lith = floor + 95 / g.km;
          if (l.y < g.sea) return ['Ciel', 'la nuit, la lave rougit le panache de vapeur', '#9fd8ff'];
          if (l.y < floor) return Math.abs(l.x - g.hot) < 40 ? ['Volcan actif', 'basalte fluide · il grandit tant qu’il est au-dessus du panache', '#ff8a3c'] : ['Océan, ou île', 'chaque île est née au-dessus du panache, puis s’est éloignée avec la plaque', '#7fb2ff'];
          if (l.y < lith) return ['Lithosphère', 'la plaque, rigide, environ 95 km · elle glisse au-dessus du panache', '#c8b8a0'];
          return Math.abs(l.x - g.hot) < 70 ? ['Panache', 'roche solide plus chaude qui monte du manteau profond ; elle fond un peu en haut', '#ffb070'] : ['Manteau', 'roche solide, vers 1 350 °C', '#ff8a3c'];
        }
        const g = geoVolcan(), xk = (l.x - g.cx) * g.km, yk = (g.ground - l.y) * g.km;
        if (Math.hypot(xk / 3.2, (yk + 6) / 1.3) < 1) return ['Chambre magmatique', (cfg.magma === 'visqueux' ? 'magma visqueux, riche en silice et en gaz, vers 900 °C' : 'magma basaltique, fluide, vers 1 150 °C') + ' · mêlé de cristaux', '#ff8a3c'];
        if (Math.abs(xk) < 0.15 && yk > -5 && yk < 3) return ['Cheminée', 'le magma monte par une fissure jusqu’au cratère', '#ffb070'];
        if (yk > 3.1 * Math.pow(Math.max(1 - Math.abs(xk) / 9, 0), 1.25)) return cfg.magma === 'visqueux' ? ['Panache', 'cendres : du magma pulvérisé par ses gaz, refroidi en verre', '#c8c8c8'] : ['Fontaine de lave', 'basalte à environ 1 150 °C : jaune-orange, puis rouge en refroidissant', '#ffb070'];
        return ['Roche', yk > 0 ? 'couches de laves et de cendres des éruptions passées' : 'roches et sédiments sous la plaine', '#c8b8a0'];
      }
      if (cfg.scene === 'soleil') return l.x && Math.hypot(l.x - view().cx, l.y - H / 2) > Math.min(view().w, H) * 0.44 && !cfg.zoom ? ['Couronne', 'l’atmosphère du Soleil, à plus d’un million de degrés', '#ffb070'] : ['Granulation', 'gaz chaud qui monte au centre des granules (≈ 6 000 °C), plus froid dans les couloirs sombres', '#ffd27a'];
      const m = l.m;
      if (!m || m.m[0] > 0.5) return ['Verre', 'paroi de la bouteille', '#c8c8c8'];
      const wax = m.s[0] > 0 && cfg.scene === 'lampe', Tc = cfg.scene === 'lampe' ? 20 + m.s[1] * 45 : 20 + m.s[1] * 30, vy = m.v[1];
      const dir = Math.abs(vy) < 0.05 ? 'presque immobile' : vy > 0 ? 'monte' : 'descend';
      if (cfg.scene === 'benard') return ['Liquide', `${fr(Tc, 0)} °C · ${dir}`, '#9fd8ff'];
      return wax ? ['Cire', `${fr(Tc, 0)} °C · ${Tc > 20 + 0.62 * 45 ? 'plus légère que le liquide' : 'plus lourde que le liquide'} · ${dir}`, '#ff8a3c'] : ['Liquide', `${fr(Tc, 0)} °C · ${dir}`, '#b09aff'];
    }
    function drawLabel() {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (6 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      if ((label.rt = (label.rt || 0) + 1) % 20 === 0) label.m = readAt(label.x, label.y);
      const [name, role, col] = describe(label), v = view();
      const side = label.x > v.x0 + v.w * 0.5 ? -1 : 1, lx = label.x + side * 40, ly = label.y < 70 ? label.y + 46 : label.y - 36;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(label.x, label.y, 11, 0, TAU); ctx.stroke();
      ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6; ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = 'rgba(250,250,245,.96)'; ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(name, lx, ly);
      ctx.fillStyle = col; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    function setScene(id) { cfg.scene = id; label = null; if (id === 'lampe' || id === 'benard') build(); }
    if (window.FASC_DEBUG) window.FASC_DEBUG.lave = { cfg, setScene, run(n, h) { for (let i = 0; i < n; i++) update(h); render(); }, get R() { return R; }, get warm() { return warm; } };

    setScene('lampe');
    let last = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool; last = { x: p.x, y: p.y };
        if (tool === 'observer') { label = { x: p.x, y: p.y, t: 0, m: readAt(p.x, p.y) }; return; }
        if (cfg.scene === 'soleil' || isGeo()) return;
        const [gx, gy, sc] = toGrid(p.x, p.y);
        if (tool === 'chauffer' || tool === 'refroidir') { last.brush = { x: gx, y: gy, r: 30 * sc + 2, k: tool === 'chauffer' ? 0.05 : -0.05 }; }
      },
      move(p) {
        if (!p.down || !last || cfg.scene === 'soleil' || isGeo()) return;
        const tool = env.tool, [gx, gy, sc] = toGrid(p.x, p.y);
        if (tool === 'remuer') pushes.push({ x: gx, y: gy, r: 26 * sc + 2, k: 0.4, vx: p.dx * sc * 2.5, vy: -p.dy * sc * 2.5 });
        if (last.brush) { last.brush.x = gx; last.brush.y = gy; }
      },
      up() { last = null; },
      clear() { if (cfg.scene === 'lampe' || cfg.scene === 'benard') build(); },
      dispose() { if (hum) hum.stop(); G.K.lose(); },
      ...(() => { // la chauffe au doigt agit à chaque image tant que le doigt est posé
        const f0 = frame;
        return { frame(t, dt) { if (last && last.brush) brushes.push(last.brush); f0(t, dt); } };
      })(),
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: [
          { label: 'Lampe à lave', act: () => setScene('lampe') },
          { label: 'Cellules de Bénard', act: () => setScene('benard') },
          { label: 'Surface du Soleil', act: () => setScene('soleil') },
        ] });
        L.push({ type: 'buttons', items: [
          { label: 'La Terre en coupe', act: () => setScene('terre') },
          { label: 'Le point chaud', act: () => setScene('pointchaud') },
          { label: 'Sous le volcan', act: () => setScene('volcan') },
        ] });
        if (cfg.scene === 'terre') {
          L.push({ type: 'section', label: 'La Terre en coupe' });
          L.push({ type: 'slider', label: 'Vitesse du temps', min: 0.5, max: 20, step: 0.5, value: cfg.geo, fmt: (x) => '1 s ≈ ' + fr(x, x < 1 ? 1 : 0) + ' Ma', set: (x) => { cfg.geo = x; } });
          L.push({ type: 'toggle', label: 'Loupe sur la croûte', value: cfg.loupe, set: (x) => { cfg.loupe = x; } });
          L.push({ type: 'note', text: 'C’est la même convection que dans la lampe : ce qui est chaud monte, ce qui est froid redescend. Mais c’est une analogie : la cire est liquide et fait un tour en quelques minutes ; le manteau est de la roche solide qui coule de quelques centimètres par an et fait un tour en 100 millions d’années environ. Les couleurs sont celles de l’incandescence de chaque couche.' });
        }
        if (cfg.scene === 'pointchaud') {
          L.push({ type: 'section', label: 'Le point chaud' });
          L.push({ type: 'slider', label: 'Vitesse du temps', min: 0.1, max: 2, step: 0.05, value: cfg.hot, fmt: (x) => '1 s ≈ ' + Math.round(x * 1000).toLocaleString('fr-FR') + ' 000 ans', set: (x) => { cfg.hot = x; } });
          L.push({ type: 'note', text: 'Le panache ne bouge presque pas ; c’est la plaque qui glisse au-dessus, d’environ 9 cm par an. Chaque île naît au-dessus de lui, puis s’éloigne, refroidit, s’enfonce et s’use : à Hawaï, plus on va vers le nord-ouest, plus les îles sont vieilles. Le magma ne se forme qu’en haut du panache, où la roche fond en partie.' });
        }
        if (cfg.scene === 'volcan') {
          L.push({ type: 'section', label: 'Sous le volcan' });
          L.push({ type: 'choice', label: 'Magma', value: cfg.magma, set: (x) => { cfg.magma = x; }, options: [{ id: 'fluide', label: 'Basalte fluide' }, { id: 'visqueux', label: 'Visqueux et gazeux' }] });
          L.push({ type: 'note', text: cfg.magma === 'visqueux' ? 'Riche en silice, le magma est épais : ses gaz ne peuvent pas s’échapper. En montant, les bulles grossissent, puis le magma éclate en cendres (éruption explosive). Le magma ne devient de la lave qu’en surface.' : 'Le basalte, pauvre en silice, est fluide : ses gaz s’échappent facilement. Il jaillit en fontaines et coule en rivières (Hawaï, Islande). Sa couleur dit sa température : jaune-orange vers 1 150 °C, rouge vers 850 °C, puis une croûte noire.' });
        }
        if (cfg.scene === 'lampe') {
          L.push({ type: 'section', label: 'La lampe' });
          L.push({ type: 'toggle', label: 'Allumée', value: cfg.on, set: (x) => { cfg.on = x; } });
          L.push({ type: 'bar', label: 'Mise en chauffe', color: '#ffe080', value: warm, txt: Math.round(warm * 100) + ' %' });
          L.push({ type: 'slider', label: 'Puissance de l’ampoule', min: 0.3, max: 2, step: 0.01, value: cfg.heat, fmt: (x) => Math.round(25 * x) + ' W', set: (x) => { cfg.heat = x; } });
          L.push({ type: 'choice', label: 'Couleurs', value: cfg.wax, set: (x) => { cfg.wax = x; }, options: Object.keys(WAX).map((k) => ({ id: k, label: WAX[k].nom })) });
          L.push({ type: 'slider', label: 'Vitesse', min: 0.2, max: 2, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Lampe froide (recommencer)', act: () => build() }] });
        }
        if (cfg.scene === 'benard') {
          L.push({ type: 'section', label: 'Bénard' });
          L.push({ type: 'slider', label: 'Écart de température', min: 0, max: 1, step: 0.01, value: cfg.ra, fmt: (x) => 'Ra ≈ ' + Math.round(400 + x * x * 9000).toLocaleString('fr-FR'), set: (x) => { cfg.ra = x; } });
          L.push({ type: 'choice', label: 'Voir', value: cfg.benView, set: (x) => { cfg.benView = x; }, options: [{ id: 0, label: 'Température' }, { id: 1, label: 'Colorant' }] });
          L.push({ type: 'slider', label: 'Vitesse', min: 0.2, max: 2, step: 0.01, value: cfg.speed, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.speed = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Recommencer au repos', act: () => build() }] });
          L.push({ type: 'note', text: 'Sous Ra ≈ 1 708, la chaleur passe par conduction et le liquide reste immobile. Au-dessus, des rouleaux apparaissent, de largeur voisine de l’épaisseur de la couche.' });
        }
        if (cfg.scene === 'soleil') {
          L.push({ type: 'section', label: 'Le Soleil' });
          L.push({ type: 'choice', label: 'Vue', value: cfg.zoom, set: (x) => { cfg.zoom = x; }, options: [{ id: 1, label: 'Gros plan (granules)' }, { id: 0, label: 'Disque entier' }] });
          L.push({ type: 'toggle', label: 'Tache solaire', value: cfg.spot, set: (x) => { cfg.spot = x; } });
          L.push({ type: 'slider', label: 'Vitesse du temps', min: 0.05, max: 2, step: 0.01, value: cfg.sunSpeed, fmt: (x) => '1 s ≈ ' + Math.round(x * 100) + ' s de Soleil', set: (x) => { cfg.sunSpeed = x; } });
        }
        if (isGeo()) return L;
        L.push({ type: 'section', label: 'Calcul' });
        L.push({ type: 'choice', label: 'Définition', value: cfg.q, set: (x) => { if (x === cfg.q) return; cfg.q = x; if (cfg.scene !== 'soleil') build(); }, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        return L;
      },
    };
  }
})();
