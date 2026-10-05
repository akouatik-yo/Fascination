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
    const cfg = { scene: 'lampe', q: 'haute', wax: 'classique', on: true, heat: 1, speed: 1, ra: 0.6, benView: 0, zoom: 1, spot: true, sunSpeed: 0.5 };
    let T = 0, R = null, G = null, label = null, warm = 0;

    function initGL() {
      const s = Math.min(dpr, 1.5), K = GLKit(Math.round(W * s), Math.round(H * s));
      const pg = {}; for (const k in FS) pg[k] = K.program(FS[k]);
      pg.lamp = K.program(FS_LAMP); pg.ben = K.program(FS_BEN); pg.sun = K.program(FS_SUN);
      return { K, gl: K.gl, s, pg };
    }
    G = initGL();

    /* ───────── grilles ───────── */
    // profil du verre : un fuseau renflé en bas (demi-largeur en fraction de la grille)
    const hw = (y) => 0.17 + 0.29 * Math.exp(-Math.pow((y - 0.24) / 0.4, 2));
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
        if (cfg.scene === 'lampe') { S[k] = y < 0.16 ? 1 : -1; S[k + 1] = 0.25; }
        else { S[k] = -1; S[k + 1] = 0.5 - (y - 0.5) * 0.02 + rnd(0.01, -0.01); S[k + 2] = y; }
      }
      const F = gl.LINEAR;
      R = {
        GW, GH, Q, px: [1 / GW, 1 / GH],
        M: K.texture(GW, GH, 'f16', gl.NEAREST, mask),
        V: K.double(GW, GH, 'f16', F), S: K.double(GW, GH, 'f16', F), Mu: K.target(GW, GH, 'f16', F), P: K.double(GW, GH, 'f16', gl.NEAREST), D: K.target(GW, GH, 'f16', gl.NEAREST),
      };
      for (const t of [R.S.r, R.S.w]) { gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, GW, GH, 0, gl.RGBA, gl.FLOAT, S); }
      warm = 0;
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
      const v = view(), hh = H * 0.74, ww = hh * (R.GW / R.GH);
      return { x: v.cx - ww / 2, y: H * 0.1, w: ww, h: hh };
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
      if (cfg.scene !== 'soleil' && R) {
        const n = Math.min(3, Math.max(1, Math.round(k * 60 * 0.5)));
        for (let i = 0; i < n; i++) step(Math.min(1.2, k * 30 * cfg.speed) / n * 1.5);
        warm = Math.min(1, warm + k * 0.01);
      }
      if (hum) hum.gain(cfg.scene === 'lampe' && cfg.on ? 0.012 : cfg.scene === 'soleil' ? 0.01 : 0);
      if (label) label.t += k;
    }
    function render() {
      const { K, pg } = G, cw = K.canvas.width, ch = K.canvas.height, s = G.s;
      const bare = env.decor === false, ink = bare && env.theme === 'light', v = view();
      if (cfg.scene === 'lampe') {
        const b = lampBox(), C = WAX[cfg.wax];
        pg.lamp.use().t('uS', R.S.r).t('uM', R.M).f('uRes', cw, ch).f('uPx', R.px[0], R.px[1]).f('uBox', b.x * s, b.y * s, b.w * s, b.h * s).f('uWax', ...C.wax).f('uLiq', ...C.liq).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uOn', cfg.on ? 1 : 0.15).f('uT', T);
        K.run(pg.lamp, null);
      } else if (cfg.scene === 'benard') {
        pg.ben.use().t('uS', R.S.r).f('uRes', cw, ch).f('uPx', R.px[0], R.px[1]).f('uView', cfg.benView).f('uInk', ink ? 1 : 0);
        K.run(pg.ben, { fb: null, w: cw, h: ch });
      } else {
        const R0 = Math.min(v.w, H) * 0.44 * s;
        pg.sun.use().f('uRes', cw, ch).f('uC', v.cx * s, (H / 2) * s).f('uT', T * cfg.sunSpeed).f('uZoom', cfg.zoom).f('uSpot', cfg.spot ? 1 : 0).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uR', cfg.zoom ? Math.max(v.w, H) * 0.5 * s : R0);
        K.run(pg.sun, null);
      }
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.imageSmoothingEnabled = true;
      if (cfg.scene === 'benard') {
        const y0 = H * 0.2, hh = H * 0.6;
        ctx.fillStyle = ink ? '#f3eee3' : '#06060a'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(K.canvas, 0, 0, cw, ch, v.x0, y0, v.w, hh);
        if (!bare) { ctx.fillStyle = '#7a1e10'; ctx.fillRect(v.x0, y0 + hh, v.w, 8); ctx.fillStyle = '#1c3c7a'; ctx.fillRect(v.x0, y0 - 8, v.w, 8); }
      } else ctx.drawImage(K.canvas, 0, 0, W, H);
      ctx.restore();
      if (cfg.scene === 'lampe' && !bare) drawMetal();
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
    function hud(ink) {
      const v = view();
      ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink ? 'rgba(40,30,80,.75)' : 'rgba(230,228,255,.6)';
      let s = '';
      if (cfg.scene === 'lampe') s = cfg.on ? (warm < 0.25 ? 'LA LAMPE CHAUFFE…' : 'CONVECTION · LA CIRE CHAUDE MONTE, LA FROIDE DESCEND') : 'LAMPE ÉTEINTE · LA CIRE REFROIDIT ET SE DÉPOSE';
      if (cfg.scene === 'benard') s = `CELLULES DE BÉNARD · NOMBRE DE RAYLEIGH ≈ ${Math.round(400 + cfg.ra * cfg.ra * 9000).toLocaleString('fr-FR')}${400 + cfg.ra * cfg.ra * 9000 < 1708 ? ' · SOUS LE SEUIL (1 708)' : ''}`;
      if (cfg.scene === 'soleil') s = cfg.zoom ? 'PHOTOSPHÈRE · CHAMP DE 30 000 KM · GRANULES DE ~1 000 KM' : 'LE SOLEIL · 1,39 MILLION DE KM · ASSOMBRISSEMENT CENTRE-BORD';
      ctx.fillText(s, v.x0 + 16, H - 16); ctx.restore();
    }
    let pending = false;
    function frame(t, dt) {
      if (dt > 0) update(dt);
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    /* ───────── identification ───────── */
    function readAt(x, y) {
      if (cfg.scene === 'soleil') return null;
      const [gx, gy] = toGrid(x, y);
      try { return { s: G.K.read(R.S.r, gx, gy), v: G.K.read(R.V.r, gx, gy), m: G.K.read(R.M, gx, gy) }; } catch (e) { return null; }
    }
    function describe(l) {
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

    function setScene(id) { cfg.scene = id; label = null; if (id !== 'soleil') build(); }
    if (window.FASC_DEBUG) window.FASC_DEBUG.lave = { cfg, setScene, run(n, h) { for (let i = 0; i < n; i++) update(h); render(); }, get R() { return R; }, get warm() { return warm; } };

    setScene('lampe');
    let last = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool; last = { x: p.x, y: p.y };
        if (tool === 'observer') { label = { x: p.x, y: p.y, t: 0, m: readAt(p.x, p.y) }; return; }
        if (cfg.scene === 'soleil') return;
        const [gx, gy, sc] = toGrid(p.x, p.y);
        if (tool === 'chauffer' || tool === 'refroidir') { last.brush = { x: gx, y: gy, r: 30 * sc + 2, k: tool === 'chauffer' ? 0.05 : -0.05 }; }
      },
      move(p) {
        if (!p.down || !last || cfg.scene === 'soleil') return;
        const tool = env.tool, [gx, gy, sc] = toGrid(p.x, p.y);
        if (tool === 'remuer') pushes.push({ x: gx, y: gy, r: 26 * sc + 2, k: 0.4, vx: p.dx * sc * 2.5, vy: -p.dy * sc * 2.5 });
        if (last.brush) { last.brush.x = gx; last.brush.y = gy; }
      },
      up() { last = null; },
      clear() { if (cfg.scene !== 'soleil') build(); },
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
        L.push({ type: 'section', label: 'Calcul' });
        L.push({ type: 'choice', label: 'Définition', value: cfg.q, set: (x) => { if (x === cfg.q) return; cfg.q = x; if (cfg.scene !== 'soleil') build(); }, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        return L;
      },
    };
  }
})();
