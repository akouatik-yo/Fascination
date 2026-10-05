/* Fascination — Le Cristal · flocons, givre, surfusion et chaufferette (WebGL2)
   Flocons : automate hexagonal de Reiter (2005) — vapeur qui diffuse, cases réceptives qui gèlent ;
   les conditions changent pendant la chute, comme dans le diagramme de Nakaya.
   Givre, surfusion, chaufferette : champ de phase de Kobayashi (1993) — un champ φ (solide/liquide)
   couplé à la température, anisotropie de la tension de surface (6 pour la glace, 4 pour un cristal
   cubique, 2 pour des aiguilles), chaleur latente libérée au front. Chaque grain garde son orientation,
   d'où les couleurs en lumière polarisée. Repli sur l'ancien Cristal (agrégation 2D) sans WebGL2. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, buf, blit, hsv } = window.FK;
  const { GLKit, HEAD } = window.FKGL;

  const QUAL = {
    legere: { flake: 220, pf: 300, spf: 22, sfl: 30 },
    normale: { flake: 300, pf: 420, spf: 36, sfl: 44 },
    haute: { flake: 380, pf: 540, spf: 50, sfl: 60 },
  };
  const PAPER = [0.953, 0.933, 0.89];
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');

  /* ───────── flocon : automate de Reiter sur grille hexagonale (coordonnées axiales) ───────── */
  const HEX = `
uniform sampler2D uS; uniform int uN; uniform float uBeta, uRmax;
const ivec2 NB[6] = ivec2[6](ivec2(1,0), ivec2(-1,0), ivec2(0,1), ivec2(0,-1), ivec2(1,-1), ivec2(-1,1));
int hexd(ivec2 c){ ivec2 q = c - ivec2(uN / 2); return (abs(q.x) + abs(q.y) + abs(q.x + q.y)) / 2; }
bool outside(ivec2 c){ return c.x < 0 || c.y < 0 || c.x >= uN || c.y >= uN || float(hexd(c)) > uRmax; }
float S(ivec2 c){ return outside(c) ? uBeta : texelFetch(uS, c, 0).r; }
`;
  const FS_R1 = HEAD + HEX + `
uniform float uGam; out vec4 o;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  float s = S(c);
  bool rec = s >= 1.;
  for (int k = 0; k < 6; k++) if (S(c + NB[k]) >= 1.) rec = true;
  // u : part qui diffuse (vapeur), v : part figée (glace)
  o = rec ? vec4(0., s + uGam, 1., 0.) : vec4(s, 0., 0., 0.);
}`;
  const FS_R2 = HEAD + HEX + `
uniform sampler2D uUV; uniform float uAlp, uStep; out vec4 o;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 me = texelFetch(uS, c, 0);
  if (outside(c)) { o = vec4(uBeta, 0., 0., 0.); return; }
  vec4 a = texelFetch(uUV, c, 0);
  float su = 0.;
  for (int k = 0; k < 6; k++){ ivec2 d = c + NB[k]; su += outside(d) ? uBeta : texelFetch(uUV, d, 0).r; }
  float u = a.r + uAlp * .5 * (su / 6. - a.r);
  float s = u + a.g;
  // g : moment où la case a gelé (pour colorer les cernes de croissance)
  float born = me.g; if (me.r < 1. && s >= 1.) born = uStep;
  o = vec4(s, born, 0., 0.);
}`;
  const FS_FLAKE = HEAD + `
uniform sampler2D uS; uniform int uN; uniform vec2 uRes, uC; uniform float uCell, uDecor, uInk, uTime, uStep, uRot;
out vec4 o;
float sAt(vec2 a){ // bilinéaire manuel en coordonnées axiales
  vec2 f = a + float(uN / 2) - .5; vec2 i = floor(f), t = f - i; ivec2 b = ivec2(i);
  float s00 = texelFetch(uS, b, 0).r, s10 = texelFetch(uS, b + ivec2(1,0), 0).r, s01 = texelFetch(uS, b + ivec2(0,1), 0).r, s11 = texelFetch(uS, b + ivec2(1,1), 0).r;
  return mix(mix(s00, s10, t.x), mix(s01, s11, t.x), t.y);
}
float gAt(vec2 a){ vec2 f = a + float(uN / 2) - .5; return texelFetch(uS, ivec2(floor(f + .5)), 0).g; }
vec2 axial(vec2 p){ float r = p.y * 1.1547005; return vec2(p.x - r * .5, r); }
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 p = (px - uC) / uCell;
  float cs = cos(uRot), sn = sin(uRot); p = mat2(cs, -sn, sn, cs) * p;
  vec2 a = axial(p);
  float s = sAt(a);
  float e = .7;
  float sx = sAt(axial(p + vec2(e, 0.))) - sAt(axial(p - vec2(e, 0.)));
  float sy = sAt(axial(p + vec2(0., e))) - sAt(axial(p - vec2(0., e)));
  float ice = smoothstep(.985, 1.02, s);
  float th = clamp((s - 1.) * 1.6, 0., 1.);
  vec2 g = vec2(sx, sy) * 1.4;
  float edge = clamp(length(g) * 1.2, 0., 1.);
  // fond : éclairage coloré par l'arrière, comme sur les photographies de flocons
  vec2 q = px / uRes.y;
  vec3 bg = mix(vec3(.02, .035, .09), vec3(.07, .05, .12), q.x / max(1., uRes.x / uRes.y));
  bg += vec3(.05, .09, .2) * exp(-dot(px - uC, px - uC) / (uRes.y * uRes.y * .25));
  vec3 lightA = vec3(.55, .78, 1.), lightB = vec3(1., .78, .45);
  float lam = dot(normalize(vec3(-g, 1.)), normalize(vec3(.5, .6, .62)));
  float lb = dot(normalize(vec3(-g, 1.)), normalize(vec3(-.6, -.4, .7)));
  vec3 iceC = bg * .55 + lightA * (.16 + .55 * pow(max(lam, 0.), 6.)) + lightB * .35 * pow(max(lb, 0.), 8.);
  iceC += vec3(.75, .88, 1.) * edge * .6 + vec3(.2, .3, .45) * th;
  float age = gAt(a), ring = .5 + .5 * sin(age * .025);
  iceC *= .9 + .1 * ring;
  iceC += vec3(1.) * pow(max(lam, 0.), 40.) * .5;
  vec3 col = mix(bg, iceC, ice);
  if (uDecor < .5){
    vec3 base = uInk > .5 ? vec3(${PAPER.join(',')}) : vec3(0.);
    vec3 line = uInk > .5 ? vec3(.12, .14, .3) : vec3(.85, .93, 1.);
    float v = ice * (.18 + .5 * th) + edge * ice * .9;
    col = mix(base, line, clamp(v, 0., 1.));
  }
  o = vec4(col, 1.);
}`;

  /* ───────── champ de phase (Kobayashi) ───────── */
  const FS_PF1 = HEAD + `
uniform sampler2D uS; uniform vec2 uPx; uniform float uDx, uEps, uDel, uJ; out vec4 o;
void main(){
  vec4 c = texture(uS, vUv);
  float l = texture(uS, vUv - vec2(uPx.x, 0.)).r, r = texture(uS, vUv + vec2(uPx.x, 0.)).r;
  float b = texture(uS, vUv - vec2(0., uPx.y)).r, t = texture(uS, vUv + vec2(0., uPx.y)).r;
  vec2 g = vec2(r - l, t - b) / (2. * uDx);
  float th = dot(g, g) > 1e-10 ? atan(g.y, g.x) : 0.;
  float e = uEps * (1. + uDel * cos(uJ * (th - c.b)));
  float de = -uEps * uJ * uDel * sin(uJ * (th - c.b));
  o = vec4(e * e, e * de * g.x, e * de * g.y, 0.);
}`;
  const FS_PF2 = HEAD + `
uniform sampler2D uS, uQ; uniform vec2 uPx, uRes; uniform float uDx, uDt, uTau, uAlp, uGam, uK, uTeq, uCool, uTime, uSeedT;
uniform int uNS; uniform vec4 uSd[16]; uniform vec4 uSd2[16];
out vec4 o;
float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031 + uTime * 13.7); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec4 c = texture(uS, vUv);
  vec2 dx = vec2(uPx.x, 0.), dy = vec2(0., uPx.y);
  vec4 L = texture(uS, vUv - dx), R = texture(uS, vUv + dx), B = texture(uS, vUv - dy), T = texture(uS, vUv + dy);
  vec4 qL = texture(uQ, vUv - dx), qR = texture(uQ, vUv + dx), qB = texture(uQ, vUv - dy), qT = texture(uQ, vUv + dy), q = texture(uQ, vUv);
  float id2 = 1. / (uDx * uDx), i2 = .5 / uDx;
  float p = c.r;
  vec2 gp = vec2(R.r - L.r, T.r - B.r) * i2;
  float lap = (L.r + R.r + B.r + T.r - 4. * p) * id2;
  float t1 = (qT.g - qB.g) * i2;           // ∂y(εε' φx)
  float t2 = (qR.b - qL.b) * i2;           // ∂x(εε' φy)
  float div = q.r * lap + (qR.r - qL.r) * i2 * gp.x + (qT.r - qB.r) * i2 * gp.y;
  float m = uAlp / 3.14159265 * atan(uGam * (uTeq - c.g));
  float nz = .007 * p * (1. - p) * (h(gl_FragCoord.xy) - .5);
  float pn = p + uDt / uTau * (t1 - t2 + div + p * (1. - p) * (p - .5 + m) + nz);
  pn = clamp(pn, 0., 1.);
  float lapT = (L.g + R.g + B.g + T.g - 4. * c.g) * id2;
  float Tn = c.g + uDt * lapT + uK * (pn - p) - uCool * uDt;
  float ori = c.b, born = c.a;
  // un grain qui gagne une case lui donne son orientation
  if (p < .5){ float mx = p + .002; if (L.r > mx){ mx = L.r; ori = L.b; } if (R.r > mx){ mx = R.r; ori = R.b; } if (B.r > mx){ mx = B.r; ori = B.b; } if (T.r > mx){ mx = T.r; ori = T.b; } }
  if (p < .5 && pn >= .5) born = uSeedT;
  // germes, chaleur et froid apportés par les doigts
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  for (int i = 0; i < 16; i++){
    if (i >= uNS) break;
    vec4 s = uSd[i], s2 = uSd2[i];
    float d = length(px - s.xy);
    if (s2.x > .5){ if (d < s.z){ pn = 1.; ori = s.w; born = uSeedT; } }
    else { Tn += s2.y * exp(-d * d / (s.z * s.z)); }
  }
  o = vec4(pn, Tn, ori, born);
}`;
  const FS_PFR = HEAD + `
uniform sampler2D uS; uniform vec2 uPx, uRes; uniform float uMode, uDecor, uInk, uTime, uPol, uTeq, uSeedT;
out vec4 o;
vec4 bl(vec2 uv){ // bilinéaire à la main
  vec2 sz = 1. / uPx, f = uv * sz - .5, i = floor(f), t = f - i;
  ivec2 b = ivec2(i), mx = ivec2(sz) - 1;
  vec4 a = texelFetch(uS, clamp(b, ivec2(0), mx), 0), c = texelFetch(uS, clamp(b + ivec2(1, 0), ivec2(0), mx), 0);
  vec4 d = texelFetch(uS, clamp(b + ivec2(0, 1), ivec2(0), mx), 0), e = texelFetch(uS, clamp(b + ivec2(1, 1), ivec2(0), mx), 0);
  return mix(mix(a, c, t.x), mix(d, e, t.x), t.y);
}
float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
vec3 heat(float t){ t = clamp(t, 0., 1.); return clamp(vec3(1.6 * t - .25, 1.9 * t * t - .15, .45 + .9 * t - 1.6 * t * t), 0., 1.); }
void main(){
  vec4 c = bl(vUv);
  // l'orientation ne s'interpole pas : on prend celle de la case la plus proche
  c.b = texelFetch(uS, ivec2(vUv / uPx), 0).b;
  vec2 dx = vec2(uPx.x, 0.), dy = vec2(0., uPx.y);
  float l = bl(vUv - dx).r, r = bl(vUv + dx).r, b = bl(vUv - dy).r, t = bl(vUv + dy).r;
  vec2 g = vec2(r - l, t - b);
  float p = smoothstep(.2, .8, c.r), edge = clamp(length(g) * 1.6, 0., 1.);
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec3 n = normalize(vec3(-g * 2.2, 1.));
  float spec = pow(max(dot(n, normalize(vec3(.4, .5, .8))), 0.), 24.);
  vec3 col;
  if (uMode < .5){
    // givre sur une vitre, la nuit : lumières floues de la rue derrière
    vec2 q = px / uRes.y;
    vec3 bg = mix(vec3(.02, .025, .05), vec3(.05, .04, .06), vUv.y);
    for (int i = 0; i < 9; i++){
      float fi = float(i);
      vec2 lp = vec2(h1(fi + 1.) * uRes.x / uRes.y, .35 + .5 * h1(fi + 7.));
      float rr = .05 + .07 * h1(fi + 3.), d = length(q - lp);
      vec3 lc = mix(vec3(1., .62, .25), vec3(.6, .75, 1.), step(.7, h1(fi + 11.)));
      bg += lc * .22 * smoothstep(rr, rr * .7, d) * (.6 + .4 * sin(uTime * .3 + fi));
    }
    float frost = p * (.55 + .35 * fract(sin(dot(floor(px * .5), vec2(12.9898, 78.233))) * 43758.5)) ;
    vec3 ice = vec3(.78, .86, .95) * (.5 + .5 * frost) + vec3(.9, .95, 1.) * (edge * .7 + spec * .8);
    col = mix(bg, ice + bg * .4, clamp(p * .78 + edge * .3, 0., 1.));
  } else if (uMode < 1.5){
    // entre polariseurs croisés : un grain s'allume selon l'angle de son axe, en couleurs d'interférence
    float hsh = h1(c.b * 17.3 + 3.1);
    float D = (320. + 700. * hsh) * (.75 + .25 * p);
    vec3 lam = vec3(650., 532., 450.);
    vec3 ic = pow(sin(3.14159265 * D / lam), vec3(2.));
    float k = pow(sin(2. * (c.b - uPol)), 2.);
    col = ic * k * p * 1.1 + vec3(.9) * edge * p * .15;
    col += vec3(.012, .012, .02);
  } else if (uMode < 2.5){
    // surfusion : le liquide coloré par sa température, le cristal argenté
    vec3 liq = heat(clamp(c.g + .25, 0., 1.5) / 1.25) * .85;
    vec3 sol = vec3(.62, .66, .72) * (.55 + .45 * n.z) + vec3(1.) * spec * .9 + heat(c.g / uTeq) * .15;
    col = mix(liq, sol, p) + vec3(.9, .95, 1.) * edge * .25;
  } else {
    // chaufferette : liquide limpide, aiguilles laiteuses, chaleur rayonnée
    vec3 liq = vec3(.86, .82, .7) * .22 + vec3(.05, .04, .02);
    float warm = clamp(c.g / uTeq, 0., 1.);
    vec3 sol = vec3(.92, .9, .86) * (.62 + .3 * n.z) + spec * .4;
    col = mix(liq, sol, p) + vec3(.45, .12, .02) * warm * .5 + vec3(1.) * edge * .15;
  }
  if (uDecor < .5){
    vec3 base = uInk > .5 ? vec3(${PAPER.join(',')}) : vec3(0.);
    vec3 line = uInk > .5 ? vec3(.12, .14, .3) : vec3(.88, .93, 1.);
    if (uMode > .5 && uMode < 1.5) col = uInk > .5 ? base * (vec3(1.) - .75 * clamp(col, 0., 1.)) : col;
    else col = mix(base, line, clamp(p * .32 + edge * p * .9, 0., 1.));
  }
  o = vec4(col, 1.);
}`;

  window.FASC.push({
    id: 'cristal', name: 'Le Cristal', cat: 'Éléments', glyph: '❉', decor: true, smoothTime: true,
    blurb: 'Flocons, givre, surfusion et chaufferette',
    hint: 'OBSERVER : touchez un cristal ou le liquide · GERME : touchez pour faire naître un cristal · CHALEUR : glissez pour faire fondre · FROID : glissez pour refroidir.',
    intro: 'Un flocon pousse dans un nuage, et chacune de ses branches raconte la même histoire : les mêmes températures, les mêmes vapeurs, au même instant. Sur une vitre en hiver, la glace dessine des fougères. Et dans une chaufferette de poche, un liquide qui attendait de geler se solidifie d’un coup, en rendant sa chaleur.',
    legend: [
      { color: '#cfe6ff', name: 'Flocon de neige', role: 'glace hexagonale · 1 à 5 mm', desc: 'La molécule d’eau, avec son angle de 104,5°, s’empile en réseau hexagonal : d’où les six branches. Leur forme dépend de la température et de l’humidité du nuage traversé.' },
      { color: '#9fd8ff', name: 'Dendrite', role: 'branche qui se ramifie', desc: 'Une pointe qui avance trouve plus de vapeur (ou évacue mieux sa chaleur) : elle accélère, se déstabilise et lance des branches latérales. Du grec dendron, l’arbre.' },
      { color: '#e8eef8', name: 'Plaque hexagonale', role: 'croissance lente · faces planes', desc: 'Quand la vapeur est rare, les faces plates du cristal ont le temps de se remplir : on obtient des plaques, parfois creusées de nervures.' },
      { color: '#d8e4ff', name: 'Givre de vitre', role: 'glace en fougère', desc: 'Sur une vitre froide, l’eau gèle à partir d’une rayure ou d’une poussière, puis la glace court en dendrites le long du verre.' },
      { color: '#ffd27a', name: 'Lumière polarisée', role: 'biréfringence de la glace', desc: 'La glace dédouble la lumière selon l’orientation de son réseau. Entre deux filtres polarisants croisés, chaque grain s’allume d’une couleur qui dépend de son orientation et de son épaisseur.' },
      { color: '#ff8a3c', name: 'Chaleur latente', role: 'libérée au front de cristallisation', desc: 'Geler rend de la chaleur : 334 joules par gramme d’eau. Le liquide se réchauffe autour du cristal, ce qui freine sa croissance et façonne les branches.' },
      { color: '#c8ccd8', name: 'Succinonitrile', role: 'analogue transparent des métaux', desc: 'Cristal cubique qui fond à 58 °C. Les métallurgistes l’observent au microscope pour voir pousser des dendrites comme celles des métaux qui refroidissent, invisibles car opaques.' },
      { color: '#efe8d8', name: 'Acétate de sodium', role: 'chaufferette · 58 °C', desc: 'Dissous dans son eau de cristallisation, il reste liquide bien en dessous de 58 °C. Un clic sur la pastille de métal libère un germe : tout cristallise et la poche monte à 54 °C environ.' },
    ],
    about: [
      'En 1611, Johannes Kepler offre à son protecteur un petit livre, « L’étrennes, ou la neige à six angles », où il se demande pourquoi les flocons ont six branches. La réponse attendra les rayons X, au XXᵉ siècle : les molécules d’eau s’empilent en réseau hexagonal. En 1885, Wilson Bentley, un fermier du Vermont, photographie le premier flocon au microscope ; il en photographiera plus de cinq mille.',
      'Dans les années 1930, Ukichiro Nakaya fait pousser des flocons artificiels sur un poil de lapin et dresse leur diagramme : vers −2 °C, des plaques ; vers −5 °C, des aiguilles et des colonnes ; vers −15 °C, des étoiles ramifiées, d’autant plus fines que l’air est humide ; en dessous de −22 °C, à nouveau des plaques et des colonnes. « Un flocon est une lettre envoyée du ciel », écrivait-il : sa forme dit le chemin qu’il a parcouru.',
      'Pourquoi les six branches se ressemblent-elles ? Parce qu’elles poussent ensemble, à quelques dixièmes de millimètre l’une de l’autre : elles traversent les mêmes conditions au même moment. Et pourquoi deux flocons ne se ressemblent-ils jamais ? Parce qu’ils ne suivent jamais exactement le même chemin dans le nuage. La simulation des flocons est l’automate de Clifford Reiter (2005) : la vapeur diffuse sur une grille hexagonale et les cases au contact de la glace gèlent peu à peu.',
      'Le givre, la surfusion et la chaufferette sont calculés par un champ de phase (Ryo Kobayashi, 1993) : une grandeur passe continûment de liquide à solide, la tension de surface dépend de l’orientation (six directions pour la glace, quatre pour un cristal cubique, deux pour des aiguilles), et chaque case qui gèle libère sa chaleur latente. Les dendrites apparaissent d’elles-mêmes, par l’instabilité de Mullins et Sekerka (1964) : une bosse sur le front avance plus vite que ses voisines.',
      'Un liquide peut rester liquide sous son point de fusion s’il n’a rien sur quoi commencer à cristalliser : c’est la surfusion. Dans les nuages, des gouttelettes restent liquides jusqu’à −40 °C ; elles gèlent instantanément sur les ailes des avions (le givrage). La chaufferette de poche pousse l’idée jusqu’au bout : on la recharge en la faisant bouillir, et elle garde sa chaleur des mois, jusqu’au clic.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez la glace ou le liquide : orientation du grain, température, sursaturation de la vapeur.' },
      { id: 'germe', label: 'germe', desc: 'Touchez pour faire naître un cristal (un nouveau flocon dans la scène du nuage).' },
      { id: 'chaleur', label: 'chaleur', desc: 'Glissez pour réchauffer : la glace fond sous le doigt. Pour le flocon, de l’air sec qui le sublime.' },
      { id: 'froid', label: 'froid', desc: 'Glissez pour refroidir : la croissance repart. Pour le flocon, de la vapeur en plus.' },
    ],
    make(env) {
      try { return makeGL(env); } catch (e) {
        console.warn('Le Cristal : repli en 2D', e);
        return legacy(env);
      }
    },
  });

  function makeGL(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const kS = clamp(Math.min(W, H) / 800, 0.6, 1.5);
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = { scene: 'flocon', q: 'haute', cond: 'voyage', auto: true, pol: false, polRot: true, aniso: 4, under: 0.5, cool: 0.3, nucl: 0.4 };
    let VT = 0;

    /* ───────── ressources GPU ───────── */
    let R = null;
    function initGL(qk) {
      const Q = QUAL[qk];
      const K = GLKit(Math.round(W), Math.round(H));
      const gl = K.gl, N = gl.NEAREST, Lf = gl.LINEAR;
      const r = { K, Q, pg: { r1: K.program(FS_R1), r2: K.program(FS_R2), flake: K.program(FS_FLAKE), pf1: K.program(FS_PF1), pf2: K.program(FS_PF2), pfr: K.program(FS_PFR) } };
      r.FN = Q.flake;
      r.F = K.double(r.FN, r.FN, 'f32', N); r.UV = K.target(r.FN, r.FN, 'f32', N);
      r.PW = Q.pf; r.PH = Math.max(64, Math.round((Q.pf * H) / W));
      // filtrage au plus proche : le lissage des textures flottantes 32 bits manque sur beaucoup d'appareils
      r.P = K.double(r.PW, r.PH, 'f32', N); r.Qd = K.target(r.PW, r.PH, 'f32', N);
      return r;
    }
    R = initGL(cfg.q);

    /* ───────── le flocon ───────── */
    // conditions (β : vapeur ambiante, γ : apport, α : diffusion), rangées sur le diagramme de Nakaya
    const COND = {
      plaque: { nom: 'Plaque hexagonale', t: '−2 °C, air peu humide', b: 0.9, g: 0.0025, a: 1.0 },
      secteurs: { nom: 'Plaque à secteurs', t: '−10 °C, humidité moyenne', b: 0.45, g: 0.0012, a: 1.2 },
      etoile: { nom: 'Étoile', t: '−13 °C, air humide', b: 0.6, g: 0.0035, a: 1.6 },
      fougere: { nom: 'Étoile en fougère', t: '−15 °C, air saturé', b: 0.36, g: 0.0007, a: 1.4 },
    };
    const fl = { step: 0, path: [], done: false, doneT: 0, rot: 0, cond: COND.etoile, b: 0.45, g: 0.0012, a: 1.2, r: 0 };
    function newFlake() {
      const { K } = R;
      const N = R.FN, data = new Float32Array(N * N * 4);
      for (let i = 0; i < N * N; i++) data[i * 4] = 0.42;
      const c = (N >> 1) * N + (N >> 1); data[c * 4] = 1;
      for (const t of [R.F.r, R.F.w]) { K.gl.bindTexture(K.gl.TEXTURE_2D, t.tex); K.gl.texImage2D(K.gl.TEXTURE_2D, 0, K.full ? K.gl.RGBA32F : K.gl.RGBA16F, N, N, 0, K.gl.RGBA, K.gl.FLOAT, data); }
      fl.step = 0; fl.done = false; fl.rot = rnd(0.5, -0.5); fl.r = 0; fl.spc = 40; fl.lastR = 0; fl.lastS = 0; fl.acc = 0;
      // un chemin dans le nuage : trois ou quatre étapes de conditions
      const keys = Object.keys(COND);
      if (cfg.cond === 'voyage') { fl.path = []; let n = 3 + rint(2); for (let i = 0; i < n; i++) fl.path.push({ k: keys[rint(keys.length)], len: rnd(1, 0.5) }); }
      else fl.path = [{ k: cfg.cond, len: 1 }];
      const tot = fl.path.reduce((s, p) => s + p.len, 0); let acc = 0;
      for (const p of fl.path) { p.t0 = acc / tot; acc += p.len; p.t1 = acc / tot; }
      setCond(0);
      if (snd()) au.note(1568, 1.2, 'sine', 0.03);
    }
    function setCond(f) {
      const i = Math.max(0, fl.path.findIndex((p) => f >= p.t0 && f < p.t1));
      const P = fl.path[i] || fl.path[fl.path.length - 1], Q2 = fl.path[Math.min(fl.path.length - 1, i + 1)];
      const k = clamp((f - P.t0) / (P.t1 - P.t0), 0, 1), m = k > 0.8 ? (k - 0.8) / 0.2 : 0;
      const A = COND[P.k], B = COND[Q2.k];
      fl.cond = A; fl.b = A.b + (B.b - A.b) * m; fl.g = A.g + (B.g - A.g) * m; fl.a = A.a + (B.a - A.a) * m;
    }
    const Rmax = () => (R.FN >> 1) - 3;
    function flakeStep(n) {
      const { K, pg } = R, N = R.FN;
      for (let i = 0; i < n; i++) {
        const f = clamp(fl.r / (Rmax() * 0.86), 0, 0.999);
        setCond(f);
        pg.r1.use().t('uS', R.F.r).i('uN', N).f('uBeta', fl.b).f('uRmax', Rmax()).f('uGam', fl.g * fl.gk);
        K.run(pg.r1, R.UV);
        pg.r2.use().t('uS', R.F.r).t('uUV', R.UV).i('uN', N).f('uBeta', fl.b).f('uRmax', Rmax()).f('uAlp', fl.a).f('uStep', fl.step);
        K.run(pg.r2, R.F.w); R.F.swap();
        fl.step++;
      }
    }
    fl.gk = 1;
    // rayon atteint : on lit la grille le long des six axes de temps en temps
    function flakeRadius() {
      const N = R.FN, c = N >> 1;
      let best = 0;
      for (let d = 0; d < 6; d++) {
        const dir = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]][d];
        let lo = fl.r * 0.9, hi = Rmax();
        for (let r = Math.max(2, Math.floor(lo)); r < hi; r += 2) { const v = R.K.read(R.F.r, c + dir[0] * r, c + dir[1] * r)[0]; if (v < 1) { best = Math.max(best, r); break; } }
      }
      fl.r = Math.max(fl.r, best);
      // pas de calcul nécessaires par case gagnée : sert à régler la vitesse de croissance
      if (fl.r > fl.lastR + 2) { const k = (fl.step - fl.lastS) / (fl.r - fl.lastR); fl.spc = clamp(fl.spc * 0.5 + k * 0.5, 4, 400); fl.lastR = fl.r; fl.lastS = fl.step; }
      else if (fl.step - fl.lastS > 6000) fl.stall = true;
    }

    /* ───────── champ de phase ───────── */
    const PF = {
      givre: { j: 6, del: 0.04, K: 2.1, gam: 10, eps: 0.01, teq: 1, t0: 0, mode: 0 },
      surfusion: { j: 4, del: 0.035, K: 2.2, gam: 10, eps: 0.01, teq: 1, t0: 0, mode: 2 },
      chaufferette: { j: 2, del: 0.12, K: 2.3, gam: 10, eps: 0.008, teq: 1, t0: 0, mode: 3 },
    };
    let seeds = [], seedT = 0, pfStart = 0, growth = 0;
    function pfReset() {
      const { K } = R, n = R.PW * R.PH, data = new Float32Array(n * 4);
      const P = PF[cfg.scene];
      for (let i = 0; i < n; i++) { data[i * 4 + 1] = P.t0 - (cfg.scene === 'surfusion' ? cfg.under * 0.4 : 0); data[i * 4 + 2] = 0; data[i * 4 + 3] = -1; }
      for (const t of [R.P.r, R.P.w]) { K.gl.bindTexture(K.gl.TEXTURE_2D, t.tex); K.gl.texImage2D(K.gl.TEXTURE_2D, 0, K.full ? K.gl.RGBA32F : K.gl.RGBA16F, R.PW, R.PH, 0, K.gl.RGBA, K.gl.FLOAT, data); }
      seeds = []; seedT = 0; pfStart = VT; growth = 0;
      const v = view();
      if (cfg.scene === 'givre') {
        // la glace part des bords du cadre et de quelques rayures
        for (let i = 0; i < 7; i++) seed(v.x0 + rnd(v.w), H - rnd(4, 0), rnd(Math.PI));
        for (let i = 0; i < 3; i++) seed(v.x0 + rnd(4, 0) + (i % 2) * (v.w - 4), rnd(H), rnd(Math.PI));
        for (let i = 0; i < 3; i++) seed(v.x0 + rnd(v.w * 0.8, v.w * 0.2), rnd(H * 0.7, H * 0.2), rnd(Math.PI));
      } else if (cfg.scene === 'surfusion') seed(v.cx, H / 2, rnd(Math.PI));
      else chaufT = 0;
    }
    function seed(x, y, ori, r) { if (seeds.length < 16) seeds.push({ x, y, r: (r || 3.2) * (W / R.PW), ori: ori == null ? rnd(Math.PI) : ori, seed: true }); }
    function brush(x, y, amt) { if (seeds.length < 16) seeds.push({ x, y, r: 26 * kS, amt, seed: false }); }
    let chaufT = 0, disc = null;
    function pfStep(n, dt) {
      const { K, pg } = R, P = PF[cfg.scene];
      const px = [1 / R.PW, 1 / R.PH], DX = 0.03;
      // germes au premier sous-pas seulement ; chaleur et froid répartis sur tous
      const pack = (list) => { const A = new Float32Array(64), B = new Float32Array(64); list.forEach((s, i) => { A.set([s.x, s.y, s.r, s.ori || 0], i * 4); B.set([s.seed ? 1 : 0, (s.amt || 0) / n, 0, 0], i * 4); }); return [A, B, list.length]; };
      const first = pack(seeds), rest = pack(seeds.filter((s) => !s.seed));
      const del = cfg.scene === 'surfusion' && cfg.aniso === 6 ? 0.04 : P.del;
      const j = cfg.scene === 'surfusion' ? cfg.aniso : P.j;
      const cool = cfg.scene === 'givre' ? cfg.cool * 3 : 0;
      for (let i = 0; i < n; i++) {
        const S = i === 0 ? first : rest;
        pg.pf1.use().t('uS', R.P.r).f('uPx', px[0], px[1]).f('uDx', DX).f('uEps', P.eps).f('uDel', del).f('uJ', j);
        K.run(pg.pf1, R.Qd);
        pg.pf2.use().t('uS', R.P.r).t('uQ', R.Qd).f('uPx', px[0], px[1]).f('uRes', W, H).f('uDx', DX).f('uDt', 0.00015).f('uTau', 0.0003)
          .f('uAlp', 0.9).f('uGam', P.gam).f('uK', P.K).f('uTeq', P.teq).f('uCool', cool).f('uTime', (VT * 7.31 + i * 0.013) % 100).f('uSeedT', seedT)
          .i('uNS', S[2]).v4('uSd', S[0]).v4('uSd2', S[1]);
        K.run(pg.pf2, R.P.w); R.P.swap();
      }
      seedT += dt;
      seeds = [];
    }

    /* ───────── scènes ───────── */
    function setScene(id) {
      cfg.scene = id; label = null;
      if (id === 'flocon') newFlake();
      else {
        pfReset();
        if (id === 'chaufferette') { const v = view(); disc = { x: v.cx + Math.min(v.w, H) * 0.22, y: H * 0.42, r: 16 * kS }; }
      }
    }
    function setQuality(q) {
      if (q === cfg.q) return;
      try { const old = R; R = initGL(q); cfg.q = q; old.K.lose(); setScene(cfg.scene); } catch (e) { console.warn(e); }
    }

    /* ───────── sons ───────── */
    const PENTA = [0, 2, 4, 7, 9];
    function chime() { if (!snd()) return; const n = PENTA[rint(5)] + 12 * rint(2); au.note(1046 * Math.pow(2, n / 12), rnd(1.6, 0.8), 'sine', 0.018); }
    function crackle(k) { if (snd() && Math.random() < k) au.noise(0.02, 0.03, rnd(7000, 3500), 2, 'bandpass'); }

    /* ───────── vie autonome ───────── */
    function update(dt) {
      VT += dt;
      if (cfg.scene === 'flocon') {
        if (!fl.done) {
          // vitesse réglée pour qu'un flocon pousse en ~8 s de simulation, quelle que soit sa forme
          fl.acc += dt * ((Rmax() * 0.86) / 8) * fl.spc;
          const n = Math.min(R.Q.sfl * 1.6, Math.floor(fl.acc)); fl.acc = Math.min(fl.acc - n, 4);
          if (n > 0) flakeStep(n);
          if ((fl.chk = (fl.chk || 0) + dt) > 0.15) { fl.chk = 0; flakeRadius(); }
          if (Math.random() < dt * 1.5) chime();
          if (fl.r > Rmax() * 0.86 || fl.stall || fl.step > 60000) { fl.done = true; fl.doneT = VT; fl.stall = false; }
        } else if (cfg.auto && VT - fl.doneT > 6) newFlake();
        fl.rot += dt * 0.02;
      } else {
        const n = Math.max(1, Math.round(Math.min(R.Q.spf * 1.6, dt * R.Q.spf * 150)));
        // germes spontanés (givre) : poussières et rayures
        if (cfg.scene === 'givre' && Math.random() < dt * cfg.nucl * 0.6) { const v = view(); seed(v.x0 + rnd(v.w), rnd(H), rnd(Math.PI), 2.2); }
        if (cfg.scene === 'givre' && cfg.auto && VT - pfStart > 90) pfReset();
        if (cfg.scene === 'surfusion' && cfg.auto && VT - pfStart > 50) pfReset();
        if (cfg.scene === 'chaufferette' && chaufT > 0) chaufT += dt;
        if (cfg.scene === 'chaufferette' && cfg.auto && chaufT > 40) pfReset();
        if (cfg.scene === 'chaufferette' && cfg.auto && chaufT === 0 && VT - pfStart > 4) click();
        pfStep(n, dt);
        growth = Math.max(0, 1 - (VT - pfStart) / 25);
        crackle(dt * 20 * growth * (cfg.scene === 'chaufferette' ? (chaufT > 0 ? 3 : 0) : 1));
      }
      if (pol.on) pol.a += dt * 0.08;
    }
    const pol = { a: 0.3, get on() { return cfg.polRot; } };
    function click() {
      if (!disc) return;
      chaufT = 0.001;
      // le clic libère quelques germes d'orientations variées : une gerbe d'aiguilles en part
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; seed(disc.x + Math.cos(a) * disc.r * 1.3, disc.y + Math.sin(a) * disc.r * 1.3, a + rnd(0.3, -0.3), 2.5); }
      if (snd()) { au.noise(0.05, 0.12, 2500, 1.5, 'bandpass'); au.note(1800, 0.08, 'triangle', 0.05); }
    }

    /* ───────── rendu ───────── */
    let pending = false;
    function render() {
      const { K, pg } = R;
      const bare = env.decor === false, ink = bare && env.theme === 'light';
      if (cfg.scene === 'flocon') {
        const v = view(), size = Math.min(v.w, H) * 0.92;
        const cell = size / (2 * Rmax() * 0.9);
        pg.flake.use().t('uS', R.F.r).i('uN', R.FN).f('uRes', W, H).f('uC', v.cx, H / 2).f('uCell', cell).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uTime', VT).f('uStep', fl.step).f('uRot', fl.rot);
        K.run(pg.flake, null);
      } else {
        const P = PF[cfg.scene];
        const mode = cfg.scene === 'givre' ? (cfg.pol ? 1 : 0) : P.mode;
        pg.pfr.use().t('uS', R.P.r).f('uPx', 1 / R.PW, 1 / R.PH).f('uRes', W, H).f('uMode', mode).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uTime', VT).f('uPol', pol.a).f('uTeq', P.teq).f('uSeedT', seedT);
        K.run(pg.pfr, null);
      }
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      if (cfg.scene === 'chaufferette' && !bare) drawPouch();
      if (cfg.scene === 'flocon' && !bare) {
        ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(220,232,255,.7)'; ctx.textAlign = 'left';
        const v = view(); ctx.fillText((fl.cond.nom + ' · ' + fl.cond.t).toUpperCase(), v.x0 + 16, H - 16); ctx.restore();
      }
      drawLabel(ink);
    }
    function drawPouch() {
      const v = view(), d = disc;
      // la pastille de métal qu'on fait claquer
      ctx.save();
      const g = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 1, d.x, d.y, d.r);
      g.addColorStop(0, '#f4f4f8'); g.addColorStop(0.6, '#a8acb8'); g.addColorStop(1, '#5a5e6a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,40,50,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 0.6, 0, TAU); ctx.stroke();
      // thermomètre
      const temp = chaufT > 0 ? 20 + 34 * (1 - Math.exp(-chaufT / 4)) : 20;
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(255,236,210,.8)';
      ctx.fillText(chaufT > 0 ? `CRISTALLISATION · ${Math.round(temp)} °C` : 'LIQUIDE SURFONDU À 20 °C · TOUCHEZ LA PASTILLE', v.x0 + 16, H - 16);
      ctx.restore();
    }
    function frame(t, dt) {
      if (dt > 0) { update(dt); if (label) { label.t += dt * 2.5; if ((label.rt += dt) > 0.3) { label.rt = 0; label.m = readAt(label.x, label.y); } } }
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }

    /* ───────── identification ───────── */
    let label = null;
    function readAt(x, y) {
      try {
        if (cfg.scene === 'flocon') {
          const v = view(), size = Math.min(v.w, H) * 0.92, cell = size / (2 * Rmax() * 0.9);
          let px = (x - v.cx) / cell, py = (y - H / 2) / cell;
          const cs = Math.cos(fl.rot), sn = Math.sin(fl.rot); [px, py] = [cs * px - sn * py, sn * px + cs * py];
          const r = py * 1.1547, q = px - r / 2;
          const s = R.K.read(R.F.r, Math.round(q + (R.FN >> 1)), Math.round(r + (R.FN >> 1)));
          return { s: s[0], born: s[1], rmm: (Math.hypot(px, py) / (Rmax() * 0.86)) * 1.5 };
        }
        const s = R.K.read(R.P.r, (x / W) * R.PW, (1 - y / H) * R.PH);
        return { phi: s[0], T: s[1], ori: s[2] };
      } catch (e) { return null; }
    }
    function describe(l) {
      const m = l.m;
      if (!m) return ['Mesure indisponible', 'ce navigateur ne lit pas les textures flottantes', '#c8d0e0'];
      if (cfg.scene === 'flocon') {
        if (m.s >= 1) return ['Glace', `à ${fr(m.rmm, 2)} mm du centre · épaisseur relative ${fr(m.s - 1, 2)} · ${fl.cond.nom.toLowerCase()}`, '#cfe6ff'];
        return ['Vapeur d’eau', `sursaturée · densité ${fr(m.s, 2)} (le nuage en fournit ${fr(fl.b, 2)}) · elle se dépose sur les pointes`, '#9fd8ff'];
      }
      const deg = Math.round((((m.ori % Math.PI) + Math.PI) % Math.PI) * 180 / Math.PI);
      if (cfg.scene === 'givre') return m.phi > 0.5 ? ['Glace', `grain orienté à ${deg}° · ${fr((m.T - 1) * 12)} °C`, '#d8e4ff'] : ['Eau surfondue', `pellicule sur le verre · ${fr((m.T - 1) * 12)} °C · gèlera au contact de la glace`, '#9fd8ff'];
      if (cfg.scene === 'surfusion') return m.phi > 0.5 ? ['Succinonitrile solide', `dendrite cubique · grain à ${deg}° · ${fr(58 + (m.T - 1) * 4)} °C`, '#c8ccd8'] : ['Succinonitrile liquide', `surfondu · ${fr(58 + (m.T - 1) * 4)} °C (fond à 58 °C) · réchauffé par la chaleur latente`, '#ff8a3c'];
      return m.phi > 0.5 ? ['Acétate de sodium trihydraté', `aiguilles · ${Math.round(20 + 38 * clamp(m.T, 0, 1))} °C`, '#efe8d8'] : ['Solution surfondue', `${Math.round(20 + 38 * clamp(m.T, 0, 1))} °C · liquide bien sous 58 °C`, '#e8d8a8'];
    }
    function drawLabel(paper) {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (6 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      const { x, y } = label;
      let [name, role, col] = describe(label);
      if (paper) col = '#4a3a6a';
      const v = view(), side = x > v.x0 + v.w * 0.5 ? -1 : 1, lx = x + side * 46, ly = y < 70 ? y + 50 : y - 40;
      ctx.save();
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + side * 9, y + (ly > y ? 9 : -9)); ctx.lineTo(lx - side * 6, ly + (ly > y ? -12 : 6)); ctx.stroke();
      ctx.shadowColor = paper ? 'rgba(250,246,238,.9)' : 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
      ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = paper ? 'rgba(30,24,40,.94)' : 'rgba(250,250,245,.96)';
      ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(name, lx, ly);
      ctx.fillStyle = col; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    if (window.FASC_DEBUG) window.FASC_DEBUG.cristal = { get R() { return R; }, cfg, fl, setScene, newFlake, seed, click, run(n, h) { for (let i = 0; i < n; i++) { update(h); render(); } }, render, readAt };

    setScene('flocon');
    let last = null;
    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool; last = { x: p.x, y: p.y };
        if (tool === 'observer') { label = { x: p.x, y: p.y, t: 0, rt: 0, m: readAt(p.x, p.y) }; return; }
        if (cfg.scene === 'flocon') {
          if (tool === 'germe') newFlake();
          else if (tool === 'chaleur') fl.gk = 0.25; else if (tool === 'froid') fl.gk = 2.5;
          return;
        }
        if (cfg.scene === 'chaufferette' && Math.hypot(p.x - disc.x, p.y - disc.y) < disc.r * 1.6) { click(); return; }
        if (tool === 'germe') { seed(p.x, p.y, rnd(Math.PI)); if (snd()) au.note(rnd(2400, 1600), 0.15, 'triangle', 0.03); }
        else if (tool === 'chaleur') brush(p.x, p.y, 0.5);
        else if (tool === 'froid') brush(p.x, p.y, -0.5);
      },
      move(p) {
        if (!p.down) return;
        if (cfg.scene === 'flocon') return;
        const tool = env.tool;
        if (tool === 'chaleur') brush(p.x, p.y, 0.35);
        else if (tool === 'froid') brush(p.x, p.y, -0.35);
        else if (tool === 'germe' && last && Math.hypot(p.x - last.x, p.y - last.y) > 30 * kS) { seed(p.x, p.y, rnd(Math.PI)); last = { x: p.x, y: p.y }; }
      },
      up() { fl.gk = 1; },
      clear() { if (cfg.scene === 'flocon') newFlake(); else pfReset(); },
      dispose() { R.K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }];
        L.push({ type: 'buttons', items: [
          { label: 'Flocon de neige', act: () => setScene('flocon') },
          { label: 'Givre sur la vitre', act: () => setScene('givre') },
          { label: 'Surfusion', act: () => setScene('surfusion') },
          { label: 'Chaufferette', act: () => setScene('chaufferette') },
        ] });
        if (cfg.scene === 'flocon') {
          L.push({ type: 'section', label: 'Le nuage' });
          L.push({ type: 'note', text: `${fl.cond.nom} · ${fl.cond.t}.` + (cfg.cond === 'voyage' ? ' Parcours : ' + fl.path.map((p) => COND[p.k].nom.toLowerCase()).join(' → ') + '.' : '') });
          L.push({ type: 'bar', label: 'Croissance', color: '#cfe6ff', value: clamp(fl.r / (Rmax() * 0.86), 0, 1), txt: fr((fl.r / (Rmax() * 0.86)) * 1.5, 1) + ' mm' });
          L.push({ type: 'choice', label: 'Conditions', value: cfg.cond, set: (x) => { cfg.cond = x; newFlake(); }, options: [{ id: 'voyage', label: 'Voyage dans le nuage' }, ...Object.keys(COND).map((k) => ({ id: k, label: COND[k].nom }))] });
          L.push({ type: 'buttons', items: [{ label: 'Nouveau flocon', act: () => newFlake() }] });
          L.push({ type: 'toggle', label: 'Un nouveau flocon quand il est fini', value: cfg.auto, set: (x) => { cfg.auto = x; } });
        } else {
          L.push({ type: 'section', label: { givre: 'Givre', surfusion: 'Surfusion', chaufferette: 'Chaufferette' }[cfg.scene] });
          if (cfg.scene === 'givre') {
            L.push({ type: 'toggle', label: 'Entre deux polariseurs croisés', value: cfg.pol, set: (x) => { cfg.pol = x; } });
            if (cfg.pol) L.push({ type: 'toggle', label: 'Tourner les polariseurs', value: cfg.polRot, set: (x) => { cfg.polRot = x; } });
            L.push({ type: 'slider', label: 'Froid du dehors', min: 0, max: 1, step: 0.01, value: cfg.cool, fmt: (x) => (x < 0.15 ? 'redoux' : x < 0.6 ? 'nuit de gel' : 'grand froid'), set: (x) => { cfg.cool = x; } });
            L.push({ type: 'slider', label: 'Poussières et rayures', min: 0, max: 1, step: 0.01, value: cfg.nucl, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.nucl = x; } });
          }
          if (cfg.scene === 'surfusion') {
            L.push({ type: 'slider', label: 'Surfusion', min: 0, max: 1, step: 0.01, value: cfg.under, fmt: (x) => fr(1.5 + x * 2.5) + ' °C sous la fusion', set: (x) => { cfg.under = x; } });
            L.push({ type: 'choice', label: 'Symétrie du cristal', value: cfg.aniso, set: (x) => { cfg.aniso = x; pfReset(); }, options: [{ id: 4, label: 'Cubique (4)' }, { id: 6, label: 'Hexagonale (6)' }] });
          }
          if (cfg.scene === 'chaufferette') L.push({ type: 'buttons', items: [{ label: 'Clic !', act: () => click() }, { label: 'Faire bouillir (recharger)', act: () => pfReset() }] });
          else L.push({ type: 'buttons', items: [{ label: 'Recommencer', act: () => pfReset() }] });
          L.push({ type: 'toggle', label: 'Recommencer tout seul', value: cfg.auto, set: (x) => { cfg.auto = x; } });
        }
        L.push({ type: 'section', label: 'Calcul' });
        L.push({ type: 'choice', label: 'Définition', value: cfg.q, set: setQuality, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        L.push({ type: 'note', text: cfg.scene === 'flocon' ? `Grille hexagonale de ${R.FN}×${R.FN} cases · ${fl.step} pas.` : `Grille ${R.PW}×${R.PH} · champ de phase de Kobayashi.` });
        return L;
      },
    };
  }

  /* ───────── repli : l'ancien Cristal (agrégation limitée par diffusion) ───────── */
  function legacy(env) {
    const ctx = env.ctx;
    const GW = 300, GH = Math.max(120, Math.round(GW * env.h / env.w));
    const N = GW * GH;
    const occ = new Uint8Array(N);
    const b = buf(GW, GH);
    const d = b.d;
    for (let i = 0; i < N; i++) { const o = i * 4; d[o] = 6; d[o + 1] = 5; d[o + 2] = 14; }
    let age = 0;
    const walkers = [];
    const spawn = () => ({ x: rint(GW), y: rint(GH) });
    for (let i = 0; i < 500; i++) walkers.push(spawn());
    function put(x, y) { const c = hsv(0.5 + age * 0.00004 + Math.sin(age * 0.0002) * 0.2, 0.55, 1); const o = (y * GW + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; }
    function germ(x, y) { for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const px = clamp((x + ox) | 0, 1, GW - 2), py = clamp((y + oy) | 0, 1, GH - 2); occ[py * GW + px] = 1; put(px, py); } }
    germ(GW / 2, GH / 2);
    const near = (x, y) => occ[(y - 1) * GW + x] || occ[(y + 1) * GW + x] || occ[y * GW + x - 1] || occ[y * GW + x + 1];
    return {
      frame() {
        for (let step = 0; step < 7; step++) for (let i = 0; i < walkers.length; i++) {
          const w = walkers[i];
          w.x += Math.random() < 0.5 ? -1 : 1; w.y += Math.random() < 0.5 ? -1 : 1;
          if (w.x < 1 || w.y < 1 || w.x >= GW - 1 || w.y >= GH - 1) { walkers[i] = spawn(); continue; }
          const id = w.y * GW + w.x;
          if (occ[id]) { walkers[i] = spawn(); continue; }
          if (near(w.x, w.y)) { occ[id] = 1; age++; put(w.x, w.y); walkers[i] = spawn(); }
        }
        b.flush();
        ctx.fillStyle = '#06050e'; ctx.fillRect(0, 0, env.w, env.h);
        blit(ctx, b, env.w, env.h);
      },
      down(p) { if (env.tool === 'germe') germ(p.x / env.w * GW, p.y / env.h * GH); },
    };
  }
})();
