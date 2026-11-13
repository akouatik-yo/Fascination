/* Fascinations — La Fourmilière
   Trois scènes : « La découverte » (vue rapprochée, une colonie de Lasius niger : recherche au hasard, découverte,
   piste de recrutement qui se renforce puis s'évapore), « Le double pont » (l'expérience de Goss et Deneubourg :
   la colonie choisit la branche la plus courte, sans qu'aucune fourmi ne compare les longueurs) et « Trois
   sociétés » (Lasius, Atta coupe-feuilles, raids d'Eciton). Les phéromones sont des grilles qui s'évaporent et
   diffusent ; chaque fourmi sent la piste avec ses deux antennes et tourne vers le côté le plus odorant. */
(function boot() {
  if (!window.FK || !window.FK_ANT) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, layer, buf, diffuse, scale } = window.FK;
  const A = window.FK_ANT, SP = A.SP;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.22;
  const fr = (x, d = 0) => x.toFixed(d).replace('.', ',');
  // réglages gardés quand la machine est reconstruite
  // (style « realiste » par défaut : le sol et les fourmis vrais, les phéromones en couche de fausse couleur nommée)
  const keep = { scene: 'decouverte', trails: true, evap: 1, n: 900, np: 160, size: 5, psize: 3, bridge: 'inegal', late: false, more: true, style: 'realiste', ssize: 3 };

  window.FASC.push({
    id: 'fourmis', name: 'La Fourmilière', cat: 'Vivant', glyph: '🜁',
    blurb: 'Des pistes qui s’inventent : recherche, découverte, recrutement',
    hint: 'Touchez une fourmi pour l’identifier · glissez le doigt pour effacer une piste · NOURRITURE dépose du sucre · CHIMIE révèle les phéromones.',
    intro: 'Aucune fourmi ne connaît le chemin. Des éclaireuses errent au hasard ; celle qui trouve du sucre rentre en marquant le sol d’une phéromone. D’autres suivent cette trace, la renforcent en revenant chargées : en quelques minutes, une autoroute relie le nid à la nourriture. Quand la source s’épuise, plus personne ne renforce la piste, qui s’évapore.',
    about: [
      'Lasius niger, la fourmi noire des jardins, recrute par piste : une ouvrière qui revient d’une bonne source tamponne le sol de son abdomen tous les quelques millimètres. La phéromone s’évapore en une vingtaine de minutes ; une piste n’existe donc que tant qu’on l’entretient. C’est une mémoire collective qui oublie toute seule.',
      'Le double pont (Goss, Aron, Deneubourg et Pasteels, 1989, avec la fourmi d’Argentine) : entre le nid et la nourriture, deux branches. Les fourmis qui empruntent la plus courte reviennent plus tôt et marquent leur branche deux fois avant que celles de la longue ne soient rentrées. Ce petit avantage s’amplifie : en quelques minutes, presque toutes passent par le court chemin. Aucune n’a mesuré quoi que ce soit. Avec deux branches égales, la colonie en choisit quand même une, au hasard : c’est une brisure de symétrie.',
      'Si la branche courte n’est ajoutée qu’après l’établissement de la piste sur la longue, beaucoup d’espèces restent prisonnières de leur habitude. Ce comportement a inspiré les « algorithmes de colonies de fourmis » (Marco Dorigo, 1992), qui servent à optimiser des tournées et des réseaux.',
      'Atta cephalotes cultive un champignon sur des feuilles découpées ; les minuscules ouvrières perchées sur les fragments (les « auto-stoppeuses ») protègent les porteuses des mouches parasites. Eciton burchellii, la fourmi légionnaire, n’a pas de nid fixe : ses raids en éventail balaient la litière et font fuir tout ce qui vit.',
    ],
    // couleurs de la légende : la cuticule des trois espèces ; les deux fausses couleurs (rocket, mako) sont nommées
    legend: [
      { color: '#4a3226', name: 'Lasius niger', role: 'fourmi noire des jardins · brun-noir, environ 5 mm', desc: 'La plus commune des fourmis d’Europe. Elle recrute ses sœurs par une piste de phéromone et élève des pucerons pour leur miellat.' },
      { color: '#9a5028', name: 'Atta cephalotes', role: 'fourmi coupe-feuille · rousse', desc: 'Les ouvrières découpent des fragments de feuilles qu’elles ne mangent pas : elles en nourrissent un champignon cultivé dans le nid.' },
      { color: '#7a4020', name: 'Eciton burchellii', role: 'fourmi légionnaire · brun-rouge', desc: 'Pas de nid fixe : des raids en éventail balaient le sol. Les soldats ont la tête pâle et de longues mandibules en crochet.' },
      { color: '#f08c64', name: 'Phéromone de piste', role: 'fausse couleur · échelle rocket', desc: 'Invisible en vrai. La couche ajoutée montre sa concentration au sol : violet sombre, faible ; saumon clair, forte. Elle se retire avec « Montrer la piste ».' },
      { color: '#5ab4ac', name: 'Odeur du nid et alarme', role: 'fausse couleur · échelle mako', desc: 'Visible seulement avec l’outil CHIMIE, comme la piste : deux autres signaux chimiques que les fourmis sentent avec leurs antennes.' },
    ],
    tools: [{ id: 'doigt', label: 'doigt' }, { id: 'nourriture', label: 'nourriture' }, { id: 'feuille', label: 'feuille' }, { id: 'chimie', label: 'chimie' }],
    make(env) { return makeAnts(env); },
  });

  /* ═══════════ Le rendu (WebGL2, bibliothèque commune FKR) ═══════════
     Un sol de terre réelle (brun-ocre) en lumière rasante, avec ses grains, ses cailloux et ses brindilles, éclairé une fois
     pour toutes (relief, ombres douces, occlusion) ; des fourmis de chitine sombre (abdomen, pétiole, thorax, tête, six pattes,
     deux antennes) avec leur reflet spéculaire et leur ombre portée floue. Les phéromones, invisibles en vrai, sont une couche
     ajoutée en fausse couleur nommée (échelle rocket), désactivable. Sans WebGL2, la machine garde son rendu 2D. */
  const RAD = Math.PI / 180;
  // le soleil bas (22°) vient du haut à gauche (repère y vers le haut) : les ombres tombent vers le bas à droite
  const SOLEIL = [Math.cos(140 * RAD) * Math.cos(22 * RAD), Math.sin(140 * RAD) * Math.cos(22 * RAD), Math.sin(22 * RAD)];
  const ESPECES = ['lasius', 'atta', 'eciton'];
  // rugosité de la cuticule : la fourmi noire des jardins luit, la coupe-feuille est mate et granuleuse
  const RUG = { lasius: 0.3, atta: 0.55, eciton: 0.42 };

  const FS_CUISSON = `
uniform sampler2D uH, uA;
uniform vec2 uRes;
uniform float uPxMm, uGraine;
uniform vec3 uL, uSol, uCielH, uCielB;
out vec4 o;
// la carte des hauteurs (mm) : r = hauteur, g = rugosité, b = part de « sol » (grains et couleur procéduraux)
float hMap(vec2 uv){ return (texture(uH, uv).r - .25) * 16.; }
// le relief propre du sol, en mm : mottes, grains d'environ 1 mm, petites fissures entre agrégats
float hSol(vec2 m){
  float f = fbmG(m * .15 + uGraine, 4) * .6 + fbmG(m * .035 + 4.1, 3) * 1.1;
  vec2 v = voronoi(m * .95 + uGraine * 3.1);
  float g = (1. - smoothstep(0., .72, v.x)) * .3;
  vec2 w = voronoi(m * .3 + 17.);
  float c = smoothstep(.12, 0., w.y - w.x) * -.3;
  return f + g + c;
}
// la couleur du sol : ocre, taches d'humus sombre, sable plus clair, quelques grains de quartz
vec3 albSol(vec2 m){
  float n1 = fbmG(m * .02 + uGraine * .7, 4), n2 = fbmG(m * .085 + 7.3, 3);
  vec3 c = mix(vec3(.2, .115, .052), vec3(.055, .034, .02), smoothstep(-.3, .5, n1));
  c = mix(c, vec3(.36, .25, .13), smoothstep(.15, .8, n2) * .5);
  c *= .72 + .56 * bruitV(m * 1.9 + 3.);
  c = mix(c, vec3(.5, .46, .4), step(.985, alea(floor(m * 1.25 + 9.))) * .45);
  return c;
}
void main(){
  vec2 tx = 1. / uRes, m = vUv * uRes / uPxMm;
  float e = 1. / uPxMm;
  vec4 H0 = texture(uH, vUv);
  float sol = H0.b, rug = max(H0.g, .04);
  float h0 = hMap(vUv);
  float dx = hMap(vUv + vec2(tx.x, 0.)) - hMap(vUv - vec2(tx.x, 0.)), dy = hMap(vUv + vec2(0., tx.y)) - hMap(vUv - vec2(0., tx.y));
  float s0 = hSol(m), sx = hSol(m + vec2(e, 0.)), sy = hSol(m + vec2(0., e));
  vec3 n = normalize(vec3(-dx * .5 - (sx - s0) * sol, -dy * .5 - (sy - s0) * sol, e));
  if (rug < .1){ vec3 r = bruitGd(m * .12 + uGraine); n = normalize(n + vec3(r.yz * .05, 0.)); }   // l'eau frémit
  // ombre portée douce : on remonte vers le soleil au-dessus de la carte des hauteurs
  vec2 d = normalize(uL.xy); float tanE = uL.z / length(uL.xy);
  float hr = h0 + s0 * sol + .06, sh = 1., t = 1.;
  for (int i = 0; i < 32; i++){
    float tm = t * e, w = .1 + tm * .045;
    sh = min(sh, smoothstep(-w, w, hr + tm * tanE - hMap(vUv + d * t * tx)));
    t = t * 1.13 + .8;
    if (tm * tanE > 13. || sh < .02) break;
  }
  // occlusion ambiante : ce qui dépasse alentour cache une part du ciel
  float ao = 0.;
  for (int i = 0; i < 8; i++){
    float an = float(i) * .785398 + .3; vec2 dd = vec2(cos(an), sin(an)) * uPxMm * tx;
    ao += max(0., hMap(vUv + dd * 1.6) - h0) / 1.6 + max(0., hMap(vUv + dd * 5.) - h0) / 5.;
  }
  ao = clamp(1. - ao * .075, .2, 1.) * mix(1., clamp(.8 + s0 * .35, .45, 1.), sol);
  vec4 A = texture(uA, vUv);
  vec3 alb = mix(rug < .1 ? vec3(.006, .011, .014) : albSol(m), versLineaire(A.rgb), A.a);   // eau sombre ou terre
  float ndl = max(dot(n, uL), 0.), ndv = max(n.z, 1e-3);
  vec3 h = normalize(uL + vec3(0., 0., 1.));
  float sp = ggxD(max(dot(n, h), 0.), rug) * smithG(ndv, ndl, rug) * schlick(h.z, .04) / (4. * ndv);
  vec3 ciel = mix(uCielB, uCielH, n.z * .5 + .5);
  vec3 c = alb * (uSol * ndl * sh + ciel * ao) + uSol * sp * sh;
  if (rug < .1) c += uCielH * schlick(ndv, .02) * 1.4 * ao;   // l'eau renvoie un peu de ciel
  o = vec4(c, 1.);
}`;

  const FS_SOL = `
uniform sampler2D uDecor, uG1, uG2, uFeuil, uRocket, uMako;
uniform vec2 uRes, uGrille;
uniform float uMode, uPiste, uFeuilOn, uDoux;
uniform vec3 uPlat, uNuit;
out vec4 o;
void main(){
  vec3 c = texture(uDecor, vUv).rgb;
  vec2 g = vec2(vUv.x, 1. - vUv.y) * uRes / uGrille;      // la grille des phéromones (ligne 0 en haut)
  vec4 G1 = texture(uG1, g);
  if (uFeuilOn > .5){ vec4 f = texture(uFeuil, vUv); c = mix(c, versLineaire(f.rgb) * uPlat, f.a); }
  c *= 1. + .28 * G1.a;                                   // les sentiers dégagés par le passage (usure)
  float tf = max(G1.r, max(G1.g, G1.b));                  // phéromone de piste (toutes les sociétés)
  if (uMode > 1.5){
    // outil chimie : le sol s'efface, toutes les odeurs paraissent (piste : rocket ; nid et alarme : mako)
    vec4 G2 = texture(uG2, g);
    float th = max(G2.r, max(G2.g, G2.b));
    c *= .16;
    c += texture(uRocket, vec2(.2 + .78 * tf, .5)).rgb * pow(tf, 1.2) * 1.5;
    c += texture(uMako, vec2(.3 + .65 * th, .5)).rgb * th * .55;
  } else if (uMode > .5){
    // néon : le sol dans la pénombre, la couche des phéromones s'allume
    c *= uNuit;
    if (uPiste > .5) c += texture(uRocket, vec2(.22 + .76 * tf, .5)).rgb * pow(tf, 1.3) * (uDoux > .5 ? 1.1 : 1.7);
  } else if (uPiste > .5){
    // réaliste : un film translucide, peu opaque, posé sur le sol
    float a = smoothstep(.03, .55, tf) * (.22 + .3 * tf);
    c = mix(c, texture(uRocket, vec2(.15 + .8 * tf, .5)).rgb * uPlat * .62, a);
  }
  o = vec4(c, 1.);
}`;

  // une instance = une fourmi, une goutte, une miette ou un collembole : un quadrilatère tourné, en px css
  const VS_INST = `#version 300 es
precision highp float; precision highp int;
layout(location = 0) in vec2 aCoin;
layout(location = 1) in vec4 aA;   // x, y, angle, taille L (px css)
layout(location = 2) in vec4 aB;   // allure des pattes, antennes, tête (×), nature (0 fourmi, 1 goutte, 2 miette, 3 collembole)
layout(location = 3) in vec4 aC;   // albédo (linéaire), charge (0, 1 miette, 2 feuille, 3 proie)
layout(location = 4) in vec4 aD;   // couleur de la feuille portée (linéaire), rotation de la feuille
layout(location = 5) in vec4 aE;   // espèce, drapeaux (1 gorgée, 2 soldat légionnaire, 4 auto-stoppeuse), hauteur (mm), graine
uniform vec2 uRes, uDecal; uniform float uOmbre;
uniform vec4 uCorps[12];
out vec2 vUv; out vec2 vLoc; flat out vec4 vA, vB, vC, vD, vE, vG, vP, vT, vH;
void main(){
  float L = aA.w; int nat = int(aB.w + .5);
  vec4 bx = nat == 0 ? vec4(-.82, 1.08, -.86, .86) : vec4(-1.25, 1.25, -1.25, 1.25);
  if (uOmbre > .5) bx += vec4(-.3, .3, -.3, .3);
  float m = 1.5 / L;
  vec2 loc = vec2(mix(bx.x - m, bx.y + m, aCoin.x * .5 + .5), mix(bx.z - m, bx.w + m, aCoin.y * .5 + .5));
  vec2 ax = vec2(cos(aA.z), sin(aA.z)), nr = vec2(-ax.y, ax.x);
  vec2 p = aA.xy + (ax * loc.x + nr * loc.y) * L;
  if (uOmbre > .5) p += uDecal * (aE.z + (nat == 1 ? 1.5 : nat == 2 ? 1.2 : .9));   // hauteur de l'objet (mm) ÷ tan(élévation)
  gl_Position = vec4(p.x / uRes.x * 2. - 1., 1. - p.y / uRes.y * 2., 0., 1.);
  vUv = vec2(p.x / uRes.x, 1. - p.y / uRes.y);
  vLoc = loc; vA = aA; vB = aB; vC = aC; vD = aD; vE = aE;
  int s = clamp(int(aE.x + .5), 0, 2) * 4;
  vG = uCorps[s]; vP = uCorps[s + 1]; vT = uCorps[s + 2]; vH = uCorps[s + 3];
}`;

  const FS_OMBRE = `
in vec2 vLoc; flat in vec4 vA, vB, vC, vD, vE, vG, vP, vT, vH;
uniform float uPx, uForce;
out vec4 o;
void main(){
  int nat = int(vB.w + .5), fl = int(vE.y + .5);
  float L = vA.w, b = 1.6 * uPx / L + .06;
  vec2 p = vLoc;
  float a;
  if (nat == 0){
    vec2 r = vec2(.47, (fl & 1) != 0 ? .2 : .15) + b;
    a = exp(-2.2 * dot(p / r, p / r)) * .62;
    if (vC.w > 1.5 && vC.w < 2.5){ vec2 q = rot2(-vD.w) * (p - vec2(.18, 0.)) / (.62 + b); a = max(a, exp(-2.4 * dot(q, q)) * .5); }
  } else if (nat == 3){
    vec2 r = vec2(.5, .2) + b + vE.z * .05;
    a = exp(-2.2 * dot(p / r, p / r)) * .5 / (1. + vE.z * .4);
  } else {
    vec2 r = vec2(1., .9) + b + .15;
    a = exp(-2.4 * dot(p / r, p / r)) * (nat == 1 ? .4 : .6);
  }
  o = vec4(0., 0., 0., a * uForce);
}`;

  const FS_CORPS = `
in vec2 vLoc; flat in vec4 vA, vB, vC, vD, vE, vG, vP, vT, vH;
uniform float uPx, uT, uSpec;
uniform vec3 uL, uSol, uCielH, uCielB;
out vec4 o;
vec2 AX, NR;
// un ellipsoïde allongé selon l'axe du corps (centre, demi-axes ; section ronde) : distance signée, hauteur, normale locale
float ellipsoide(vec2 p, vec3 e, out float z, out vec3 n){
  vec2 d = (p - vec2(e.x, 0.)) / e.yz;
  float q = dot(d, d), w = sqrt(max(1. - q, 0.));
  z = w * e.z;
  n = normalize(vec3(d.x / e.y, d.y / e.z, w / e.z + 1e-3));
  return (sqrt(q) - 1.) * min(e.y, e.z);
}
// éclairage d'une surface du corps : soleil rasant, ciel, reflet spéculaire (GGX) et liseré de Fresnel
vec3 eclaire(vec3 nl, vec3 alb, float rug, float f0){
  vec2 nc = AX * nl.x + NR * nl.y;
  vec3 n = normalize(vec3(nc.x, -nc.y, nl.z));
  float ndl = max(dot(n, uL), 0.), ndv = max(n.z, 1e-3);
  vec3 h = normalize(uL + vec3(0., 0., 1.));
  float sp = ggxD(max(dot(n, h), 0.), rug) * smithG(ndv, ndl, rug) * schlick(h.z, f0) / (4. * ndv);
  vec3 ciel = mix(uCielB, uCielH, n.z * .5 + .5);
  return alb * (uSol * ndl + ciel) + uSol * sp * uSpec + ciel * schlick(ndv, f0) * .5;
}
float trait(float d, float w, float px){ return clamp((w + .5 * px - d) / px, 0., 1.) * min(1., 2. * w / px + .12); }
void over(inout vec4 acc, vec3 c, float a){ acc.rgb = c * a + acc.rgb * (1. - a); acc.a = a + acc.a * (1. - a); }
void main(){
  int nat = int(vB.w + .5), fl = int(vE.y + .5);
  float L = vA.w, px = uPx / L;
  AX = vec2(cos(vA.z), sin(vA.z)); NR = vec2(-AX.y, AX.x);
  vec2 p = vLoc;
  vec4 acc = vec4(0.);
  vec3 alb = vC.rgb;
  float z, zb; vec3 n, nb; float s, cb;
  if (nat == 0){
    float k = vG.w, hk = vB.z, rug = vT.w;
    bool rep = (fl & 1) != 0, sold = (fl & 2) != 0;
    // six pattes (trépied alterné) et deux antennes, sous le corps
    float dl = 1e3;
    for (int i = 0; i < 3; i++){
      vec4 lg = i == 0 ? vec4(.08, .42, .28, 0.) : i == 1 ? vec4(.02, .05, .4, 1.) : vec4(-.04, -.34, .36, 0.);
      float kxo = (i == 0 ? .05 : i == 2 ? -.04 : 0.) * k;
      for (int j = 0; j < 2; j++){
        float sg = j == 0 ? -1. : 1.;
        float ph = vB.x + mod(lg.w + float(j), 2.) * 3.14159265;
        vec2 pied = vec2((lg.y + sin(ph) * .12) * k, lg.z * k * (cos(ph) > 0. ? .86 : 1.) * sg);
        vec2 hanche = vec2(lg.x, .045 * sg);
        vec2 genou = vec2(hanche.x + (pied.x - hanche.x) * .5 + kxo, hanche.y + (pied.y - hanche.y) * .62 + .07 * sg * k);
        dl = min(dl, min(sdSegment(p, hanche, genou), sdSegment(p, genou, pied)));
      }
    }
    float hx0 = vH.x + vH.y * .7 * hk, da = 1e3;
    for (int j = 0; j < 2; j++){
      float sg = j == 0 ? -1. : 1.;
      float w1 = sin(uT * 7. + vE.w + sg) * .05 * vB.y, w2 = sin(uT * 9.3 + vE.w * 2. + sg) * .07 * vB.y;
      vec2 b0 = vec2(hx0, .035 * sg), e0 = vec2(hx0 + .09, (.15 + w1) * sg), t0 = vec2(hx0 + .26 + w2 * .3, (.11 + w2) * sg);
      da = min(da, min(sdSegment(p, b0, e0), sdSegment(p, e0, t0)));
    }
    float cl = max(trait(dl, .03, px), trait(da, .02, px));
    if (cl > 0.) over(acc, eclaire(vec3(0., 0., 1.), alb * .85, .5, .04), cl);
    // le corps : abdomen (gonflé et rayé quand il est plein de sucre), pétiole, thorax, tête
    vec3 G = rep ? vec3(vG.x * 1.15, vG.y * 1.45, vG.z * 1.45) : vG.xyz;
    vec3 Hd = vec3(vH.x + (hk - 1.) * .08, vH.y * hk, vH.z * hk);
    zb = -1.; cb = 0.; nb = vec3(0., 0., 1.); int part = -1;
    s = ellipsoide(p, G, z, n); { float c = clamp(.5 - s / px, 0., 1.); if (c > 0. && z > zb){ zb = z; nb = n; part = 0; } cb = max(cb, c); }
    s = ellipsoide(p, vP.xyz, z, n); { float c = clamp(.5 - s / px, 0., 1.); if (c > 0. && z > zb){ zb = z; nb = n; part = 1; } cb = max(cb, c); }
    s = ellipsoide(p, vT.xyz, z, n); { float c = clamp(.5 - s / px, 0., 1.); if (c > 0. && z > zb){ zb = z; nb = n; part = 2; } cb = max(cb, c); }
    s = ellipsoide(p, Hd, z, n); { float c = clamp(.5 - s / px, 0., 1.); if (c > 0. && z + .002 > zb){ zb = z; nb = n; part = 3; } cb = max(cb, c); }
    if (cb > 0.){
      vec3 a2 = alb;
      if (part == 0 && rep){
        // abdomen plein : entre les plaques sombres, les membranes tendues laissent voir le sirop
        float bnd = abs(fract((p.x - G.x) / (G.y * .42) + .5) - .5) * 2.;
        a2 = mix(alb, vec3(.42, .24, .06), smoothstep(.55, .85, bnd) * .9);
      }
      if (part == 3 && sold) a2 = vec3(.62, .5, .26);   // soldat légionnaire : tête pâle
      over(acc, eclaire(nb, a2, rug, .045), cb);
    }
    if (sold){
      // les mandibules en crochet des soldats légionnaires
      float dm = 1e3;
      for (int j = 0; j < 2; j++){ float sg = j == 0 ? -1. : 1.; vec2 a0 = vec2(.42, .05 * sg), a1 = vec2(.64, .14 * sg), a3 = vec2(.73, -.02 * sg); dm = min(dm, min(sdSegment(p, a0, a1), sdSegment(p, a1, a3))); }
      float cm = trait(dm, .035, px); if (cm > 0.) over(acc, eclaire(vec3(0., 0., 1.), vec3(.03, .012, .005), .3, .05), cm);
    }
    // ce qu'elle porte : une miette, un fragment de feuille (parfois avec une minuscule auto-stoppeuse), une proie
    float ch = vC.w;
    if (ch > .5 && ch < 1.5){ s = ellipsoide(p, vec3(.66, .15, .13), z, n); float c = clamp(.5 - s / px, 0., 1.); if (c > 0.) over(acc, eclaire(n, vec3(.52, .4, .22), .8, .04), c); }
    else if (ch > 2.5){ vec2 q = rot2(-.5) * (p - vec2(.68, 0.)); s = ellipsoide(q, vec3(0., .3, .14), z, n); float c = clamp(.5 - s / px, 0., 1.); if (c > 0.) over(acc, eclaire(n, vec3(.2, .19, .24), .6, .04), c); }
    else if (ch > 1.5){
      vec2 q = rot2(-vD.w) * (p - vec2(.18, 0.));
      float df = max(length(q) - .6, -q.x - .26);
      float c = clamp(.5 - df / px, 0., 1.);
      if (c > 0.){
        float nerv = trait(abs(q.y), .015, px) * step(-.26, q.x);
        vec3 cf = eclaire(normalize(vec3(-.25, .2, 1.)), mix(vD.rgb, vD.rgb * 1.5 + .02, nerv * .6), .7, .04);
        over(acc, cf * (.8 + .2 * smoothstep(.0, -.1, df)), c);
        if ((fl & 4) != 0){ s = ellipsoide(q, vec3(-.02, .11, .05), z, n); float c2 = clamp(.5 - s / px, 0., 1.); if (c2 > 0.) over(acc, eclaire(n, vec3(.2, .05, .012), .5, .045), c2); }
      }
    }
  } else if (nat == 1){
    // une goutte de sirop : un dôme brillant, translucide ; la lumière qui la traverse se concentre du côté opposé au soleil
    vec2 q = p / vec2(1., .9);
    float r2 = dot(q, q), w = sqrt(max(1. - r2, 0.));
    float c = clamp(.5 - (sqrt(r2) - 1.) / (px * 1.05), 0., 1.);
    if (c > 0.){
      vec3 nl = normalize(vec3(q * .9, w * .55 + .05));
      vec2 sl = vec2(uL.x, -uL.y);
      vec2 dl2 = vec2(dot(sl, AX), dot(sl, NR));
      float caus = exp(-dot(q + dl2 * .45, q + dl2 * .45) * 9.);
      vec3 sirop = vec3(.5, .32, .09);
      vec3 col = sirop * (uSol * .2 + uCielH * .4) * (.55 + .45 * w) + sirop * uSol * caus * .55;
      vec2 nc = AX * nl.x + NR * nl.y; vec3 n3 = normalize(vec3(nc.x, -nc.y, nl.z));
      vec3 h = normalize(uL + vec3(0., 0., 1.));
      float ndl = max(dot(n3, uL), 0.), ndv = max(n3.z, 1e-3);
      col += uSol * ggxD(max(dot(n3, h), 0.), .1) * smithG(ndv, ndl, .1) * schlick(h.z, .04) / (4. * ndv) * uSpec;
      col += mix(uCielB, uCielH, n3.z * .5 + .5) * schlick(ndv, .04) * .9;
      over(acc, col, c);
    }
  } else if (nat == 2){
    // une miette : contour irrégulier, relief bosselé, mie poreuse
    float an = atan(p.y, p.x), sd = vE.w;
    float rr = 1. + .14 * sin(an * 3. + sd) + .09 * sin(an * 5. + sd * 2.3) + .05 * sin(an * 9. + sd * 1.7);
    float r = length(p) / rr;
    float c = clamp(.5 - (r - 1.) / px, 0., 1.);
    if (c > 0.){
      float w = sqrt(max(1. - r * r, 0.));
      vec3 bd = bruitGd(p * 4. + sd);
      vec3 nl = normalize(vec3(p * .8 / rr - bd.yz * .25, w + .15));
      float pore = smoothstep(.55, .9, bruitV(p * 7. + sd * 3.));
      over(acc, eclaire(nl, vec3(.5, .38, .2) * (1. - .45 * pore), .85, .04), c);
    }
  } else {
    // un collembole : corps allongé, tête ronde, deux antennes ; il saute pour fuir
    float sc = 1. + vE.z * .06;
    vec2 q = p / sc;
    float ca = trait(min(sdSegment(q, vec2(.55, .04), vec2(.95, .25)), sdSegment(q, vec2(.55, -.04), vec2(.95, -.25))), .02, px);
    if (ca > 0.) over(acc, eclaire(vec3(0., 0., 1.), alb * .8, .6, .04), ca);
    s = ellipsoide(q, vec3(0., .5, .21), z, n); float c = clamp(.5 - s / px, 0., 1.); zb = z; nb = n;
    s = ellipsoide(q, vec3(.45, .16, .15), z, n); float c2 = clamp(.5 - s / px, 0., 1.); if (c2 > 0. && z > zb) nb = n;
    c = max(c, c2);
    if (c > 0.) over(acc, eclaire(nb, alb, .45, .04), c);
  }
  o = acc;
}`;

  // la cabine de la machine : partagée par tous les mondes (changer de scène ne recrée pas le contexte WebGL)
  function makeVue(env) {
    if (!window.FKR || !window.FKGL) return null;
    let R;
    try { R = window.FKR.cabine(env, { halo: 0.05, rayon: 0.65, saturation: 1.06 }); } catch (e) { console.warn('La Fourmilière : repli en 2D', e); return null; }
    try {
      const K = R.K, gl = R.gl, W = R.W, H = R.H, C = window.FKR.couleur;
      const prog = (corps, noms, vs) => K.program(window.FKR.fs(noms, corps), vs);
      const P = {
        cuisson: prog(FS_CUISSON, ['couleur', 'bruit', 'lumiere', 'matiere']),
        sol: prog(FS_SOL, ['couleur']),
        ombre: prog(FS_OMBRE, ['formes'], VS_INST),
        corps: prog(FS_CORPS, ['couleur', 'bruit', 'lumiere', 'formes', 'matiere'], VS_INST),
      };
      // la lumière : un soleil de fin d'après-midi (corps noir à 4 300 K), le bleu du ciel dans les ombres
      const sol = C.corpsNoir(4300).map((v) => v * 3), cielH = C.rayleigh().map((v) => v * 0.3), cielB = [0.3, 0.25, 0.2];
      const plat = sol.map((v, i) => v * SOLEIL[2] + cielH[i]);
      const decor = K.target(R.cw, R.ch);
      const tex = () => {
        const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        return t;
      };
      const tH = tex(), tA = tex(), tG1 = tex(), tG2 = tex(), tF = tex();
      const lutR = R.lut(window.FKR.palette.carte('rocket')), lutM = R.lut(window.FKR.palette.carte('mako'));
      const toile = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return { c, g: c.getContext('2d') }; };
      const cH = toile(), cA = toile(), cF = toile();
      const envoyer = (t, c) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); };
      // les instances : un quadrilatère partagé, 20 nombres par objet
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, 1024 * 80, gl.DYNAMIC_DRAW);
      for (let k = 0; k < 5; k++) { gl.enableVertexAttribArray(1 + k); gl.vertexAttribPointer(1 + k, 4, gl.FLOAT, false, 80, k * 16); gl.vertexAttribDivisor(1 + k, 1); }
      gl.bindVertexArray(null);
      let I = new Float32Array(20 * 1024), nI = 0;
      const corpsU = new Float32Array(48);
      ESPECES.forEach((k, i) => { const B = SP[k].body; corpsU.set([...B.g, SP[k].legK, ...B.p, 0, ...B.t, RUG[k], ...B.h, 0], i * 16); });
      const lin = (css) => C.deCss(css);
      const V = {
        R, W, H, cH, cA, cF, plat, lin,
        // le décor : peint en 2D (hauteurs, albédo), puis éclairé une seule fois sur la carte graphique
        cuire(peindre, pxmm, graine) {
          for (const T of [cH, cA]) { T.g.setTransform(1, 0, 0, 1, 0, 0); T.g.globalAlpha = 1; T.g.globalCompositeOperation = 'source-over'; }
          cH.g.fillStyle = 'rgb(64,242,255)'; cH.g.fillRect(0, 0, W, H);
          cA.g.clearRect(0, 0, W, H);
          peindre(cH.g, cA.g);
          envoyer(tH, cH.c); envoyer(tA, cA.c);
          P.cuisson.use().t('uH', tH).t('uA', tA).f('uRes', W, H).f('uPxMm', pxmm).f('uGraine', graine || 0)
            .f('uL', SOLEIL[0], SOLEIL[1], SOLEIL[2]).f('uSol', sol[0], sol[1], sol[2]).f('uCielH', cielH[0], cielH[1], cielH[2]).f('uCielB', cielB[0], cielB[1], cielB[2]);
          K.run(P.cuisson, decor);
        },
        // les grilles de phéromones (octets, déjà ramenés à [0, 1]) : r, g, b, a
        grille(quelle, gw, gh, u8) { gl.bindTexture(gl.TEXTURE_2D, quelle === 2 ? tG2 : tG1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gw, gh, 0, gl.RGBA, gl.UNSIGNED_BYTE, u8); },
        feuilles() { envoyer(tF, cF.c); },
        vider() { nI = 0; },
        inst(x, y, an, L, g, wig, hk, nat, r, gg, b, ch, lr, lg, lb, lrot, sp, fl, haut, graine) {
          if (nI * 20 >= I.length) { const N = new Float32Array(I.length * 2); N.set(I); I = N; }
          const k = nI++ * 20;
          I[k] = x; I[k + 1] = y; I[k + 2] = an; I[k + 3] = L; I[k + 4] = g; I[k + 5] = wig; I[k + 6] = hk; I[k + 7] = nat;
          I[k + 8] = r; I[k + 9] = gg; I[k + 10] = b; I[k + 11] = ch; I[k + 12] = lr; I[k + 13] = lg; I[k + 14] = lb; I[k + 15] = lrot;
          I[k + 16] = sp; I[k + 17] = fl; I[k + 18] = haut; I[k + 19] = graine;
        },
        // une image : le sol et ses couches, puis les ombres, puis les corps ; le développement commun (FKR) à la fin
        image(o) {
          if (R.perdu) return false;
          R.debut(o.dt);
          const mode = o.mode, nuit = mode === 1 ? [0.2, 0.24, 0.34] : [1, 1, 1];
          P.sol.use().t('uDecor', decor).t('uG1', tG1).t('uG2', tG2).t('uFeuil', tF).t('uRocket', lutR).t('uMako', lutM)
            .f('uRes', W, H).f('uGrille', o.grille[0], o.grille[1]).f('uMode', mode).f('uPiste', o.piste ? 1 : 0).f('uFeuilOn', o.feuilles ? 1 : 0)
            .f('uDoux', o.doux ? 1 : 0).f('uPlat', plat[0], plat[1], plat[2]).f('uNuit', nuit[0], nuit[1], nuit[2]);
          R.passe(P.sol);
          if (nI) {
            const lum = R.cibles.lum;
            gl.bindFramebuffer(gl.FRAMEBUFFER, lum.fb); gl.viewport(0, 0, lum.w, lum.h);
            gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, I.subarray(0, nI * 20), gl.DYNAMIC_DRAW);
            gl.enable(gl.BLEND);
            // les ombres floues assombrissent ce qui est déjà là (dst × (1 − a)) ; décalées à l'opposé du soleil
            const tanE = SOLEIL[2] / Math.hypot(SOLEIL[0], SOLEIL[1]), dlen = o.pxmm / tanE, dn = Math.hypot(SOLEIL[0], SOLEIL[1]);
            gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
            P.ombre.use().f('uRes', W, H).f('uDecal', -SOLEIL[0] / dn * dlen, SOLEIL[1] / dn * dlen).f('uOmbre', 1).f('uPx', W / lum.w).f('uForce', mode === 0 ? 1 : 0.6).v4('uCorps', corpsU);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nI);
            // les corps, peints par-dessus (alpha prémultiplié)
            const k = mode === 0 ? 1 : mode === 1 ? 0.28 : 0.4, s2 = sol.map((v) => v * k), c2 = cielH.map((v) => v * (mode === 0 ? 1 : 0.5)), b2 = cielB.map((v) => v * (mode === 0 ? 1 : 0.4));
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            P.corps.use().f('uRes', W, H).f('uDecal', 0, 0).f('uOmbre', 0).f('uPx', W / lum.w).f('uT', o.t).f('uSpec', o.doux ? 0.45 : 1).v4('uCorps', corpsU)
              .f('uL', SOLEIL[0], SOLEIL[1], SOLEIL[2]).f('uSol', s2[0], s2[1], s2[2]).f('uCielH', c2[0], c2[1], c2[2]).f('uCielB', b2[0], b2[1], b2[2]);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nI);
            gl.disable(gl.BLEND); gl.bindVertexArray(null);
          }
          R.fin(o.dt);
          return true;
        },
        detruire() { R.detruire(); },
      };
      return V;
    } catch (e) {
      console.warn('La Fourmilière : repli en 2D', e);
      try { R.detruire(); } catch (e2) { /* rien */ }
      return null;
    }
  }

  // la machine garde ses réglages ; changer de scène reconstruit le monde
  function makeAnts(env) {
    const V = makeVue(env);
    let w = makeWorld(env, V);
    const rebuild = () => { try { w.dispose(); } catch (e) { /* rien */ } w = makeWorld(env, V); };
    const setScene = (id) => { keep.scene = id; rebuild(); };
    const api = {
      livePaused: true,
      frame: (t, dt) => w.frame(t, dt), down: (p) => w.down(p), move: (p) => w.move(p), up: () => w.up(),
      dispose: () => { w.dispose(); if (V) V.detruire(); }, clear: () => rebuild(),
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'La découverte', act: () => setScene('decouverte') },
          { label: 'Le double pont', act: () => setScene('ponts') },
          { label: 'Trois sociétés', act: () => setScene('societes') },
        ] }];
        if (keep.scene === 'decouverte') {
          L.push({ type: 'section', label: 'Découverte' });
          L.push({ type: 'toggle', label: 'Montrer la piste', value: keep.trails, set: (x) => { keep.trails = x; } });
          L.push({ type: 'slider', label: 'Évaporation de la piste', min: 0.3, max: 3, step: 0.05, value: keep.evap, fmt: (x) => '×' + fr(x, 2), set: (x) => { keep.evap = x; } });
          L.push({ type: 'slider', label: 'Taille du terrain', min: 1, max: 6, step: 0.5, value: keep.size, fmt: (x) => '×' + fr(x, 1), set: (x) => { keep.size = x; keep.n = Math.round(clamp(36 * x * x, 40, 1400) / 10) * 10; rebuild(); } });
          L.push({ type: 'slider', label: 'Fourmis de la colonie', min: 20, max: 1600, step: 10, value: keep.n, fmt: (x) => String(x), set: (x) => { keep.n = x; rebuild(); } });
          L.push({ type: 'toggle', label: 'De nouvelles sources apparaissent', value: keep.more, set: (x) => { keep.more = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Sucre au hasard', act: () => w.sugar() }, { label: 'Effacer toutes les pistes', act: () => w.wipeAll() }] });
          L.push({ type: 'note', text: 'Au début, les éclaireuses errent sans but. Dès que l’une trouve le sucre, elle rentre en marquant le sol d’une phéromone (invisible en vrai : la couche colorée la montre) ; celles qu’elle croise font demi-tour et la suivent, et chaque fourmi chargée renforce la trace. Effacez un bout de piste au doigt : le trafic se désorganise, puis la piste se reforme. Évaporation forte : la colonie a du mal à garder ses pistes ; faible : elle s’accroche à des sources épuisées.' });
        } else if (keep.scene === 'ponts') {
          L.push({ type: 'section', label: 'Double pont' });
          L.push({ type: 'choice', label: 'Branches', value: keep.bridge, set: (x) => { keep.bridge = x; rebuild(); }, options: [{ id: 'inegal', label: 'Une courte, une longue' }, { id: 'egal', label: 'Deux égales' }] });
          L.push({ type: 'toggle', label: 'La branche courte n’arrive qu’après 50 s', value: keep.late, set: (x) => { keep.late = x; rebuild(); } });
          L.push({ type: 'slider', label: 'Taille du terrain', min: 1, max: 6, step: 0.5, value: keep.psize, fmt: (x) => '×' + fr(x, 1), set: (x) => { keep.psize = x; keep.np = Math.round(clamp(18 * x * x, 60, 900) / 10) * 10; rebuild(); } });
          L.push({ type: 'slider', label: 'Fourmis de la colonie', min: 40, max: 1200, step: 10, value: keep.np, fmt: (x) => String(x), set: (x) => { keep.np = x; rebuild(); } });
          L.push({ type: 'toggle', label: 'Montrer la piste', value: keep.trails, set: (x) => { keep.trails = x; } });
          L.push({ type: 'slider', label: 'Évaporation de la piste', min: 0.3, max: 3, step: 0.05, value: keep.evap, fmt: (x) => '×' + fr(x, 2), set: (x) => { keep.evap = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Recommencer l’expérience', act: () => rebuild() }] });
          L.push({ type: 'note', text: 'Les deux branches partent du même angle : à l’embranchement, une fourmi ne peut pas savoir laquelle est la plus courte. Regardez la jauge : au début, moitié-moitié, puis la colonie bascule. Avec deux branches égales, elle choisit quand même, au hasard, et ce n’est pas toujours la même d’une fois sur l’autre. Branche courte ajoutée tard : selon l’évaporation, la colonie en change ou reste fidèle à son ancienne piste (essayez une évaporation faible).' });
        } else {
          L.push({ type: 'section', label: 'Trois sociétés' });
          L.push({ type: 'slider', label: 'Taille du terrain', min: 1, max: 5, step: 0.5, value: keep.ssize, fmt: (x) => '×' + fr(x, 1), set: (x) => { keep.ssize = x; rebuild(); } });
          L.push({ type: 'toggle', label: 'Montrer la piste', value: keep.trails, set: (x) => { keep.trails = x; } });
          L.push({ type: 'note', text: 'Vue d’ensemble : Lasius niger (piste de recrutement), Atta cephalotes (coupe des feuilles, auto-stoppeuses), Eciton burchellii (raids en éventail venus du bord de l’écran). Grand terrain : plus de fourmis, de feuilles et de miettes, qui repoussent quand on les a consommées. Outil CHIMIE : les phéromones de chaque société.' });
        }
        L.push({ type: 'section', label: 'Rendu' });
        // un réglage visuel : il ne reconstruit pas la simulation
        L.push({ type: 'choice', label: 'Style', value: keep.style, set: (x) => { keep.style = x; }, options: [{ id: 'realiste', label: 'Réaliste' }, { id: 'neon', label: 'Néon' }] });
        L.push({ type: 'note', text: keep.style === 'neon'
          ? 'Néon : le sol passe dans la pénombre et la couche des phéromones s’allume. Couleurs : concentration de phéromone, échelle rocket (sombre : faible ; clair : forte). En vrai, une phéromone ne se voit pas.'
          : 'Réaliste : un sol de terre en lumière rasante, des fourmis d’environ 5 mm. Les phéromones sont invisibles : la couche translucide les montre en fausse couleur (concentration, échelle rocket). « Montrer la piste » la retire.' });
        return L;
      },
    };
    if (window.FASC_DEBUG) window.FASC_DEBUG.ants = { keep, setScene, get w() { return w; }, sim(sec) { for (let i = 0; i < sec * 15; i++) w._step(1 / 15); return w._stats(); } };
    return api;
  }

  function makeWorld(env, V) {
    {
      const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
      let quiet = true, T = 0;
      const snd = () => !quiet && au && au.on;
      const SCN = keep.scene, SOC = SCN === 'societes', PONT = SCN === 'ponts', DEC = SCN === 'decouverte';
      // la vue rapprochée : tout grandit (fourmis, odorat, grilles de phéromones), le terrain visible rétrécit d'autant
      // ZB : la vue rapprochée d'origine ; « size » agrandit le terrain (×5 par défaut) : tout rétrécit d'autant
      const ZB = DEC ? 1.8 : PONT ? 1.35 : 1, Z = SOC ? 1 / keep.ssize : ZB / (PONT ? keep.psize : keep.size);
      // trois sociétés sur grand terrain : les effectifs croissent moins vite que la surface (sinon des milliers de fourmis)
      const MS = SOC ? Math.max(1, keep.ssize * keep.ssize * 0.3) : 1;
      const kS = clamp(Math.min(W, H) / 600, 0.9, 1.8) * 1.5 * Z;
      const area = SOC ? clamp((W * H) / 960000 / Math.pow(clamp(Math.min(W, H) / 600, 0.9, 1.8) * 1.5 / 1.8, 2), 0.35, 1.3) : clamp((W * H) / 960000 / Math.pow(kS / 1.8, 2), 0.35, 1.3);
      const V0 = env.view || { x0: 0, x1: W }, VX0 = V0.x0, VW = V0.x1 - V0.x0;
      const CS = Math.max(3, Math.round(7 * Z)), GW = Math.ceil(W / CS) + 1, GH = Math.ceil(H / CS) + 1, NG = GW * GH;
      const G = () => new Float32Array(NG);
      const TMP = G(), ALARM = G(), WEAR = G();
      const gi = (x, y) => { const gx = Math.floor(x / CS), gy = Math.floor(y / CS); return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? -1 : gy * GW + gx; };
      // lecture bilinéaire : un arrondi à la case inférieure ferait pencher toutes les antennes du même côté
      const samp = (g, x, y) => {
        const fx = x / CS - 0.5, fy = y / CS - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        if (x0 < 0 || y0 < 0 || x0 >= GW - 1 || y0 >= GH - 1) { const i = gi(x, y); return i < 0 ? 0 : g[i]; }
        const i = y0 * GW + x0; return (g[i] * (1 - tx) + g[i + 1] * tx) * (1 - ty) + (g[i + GW] * (1 - tx) + g[i + GW + 1] * tx) * ty;
      };
      const depK = (7 * ZB) / CS; // la concentration d'une case dépend du temps qu'on y passe, donc de sa taille
      const dep = (g, x, y, v, cap) => { const i = gi(x, y); if (i >= 0) g[i] = Math.min(cap, g[i] + v * depK); };

      /* nids, nourriture, décor */
      const port = H > W * 1.15;
      const nestL = { kind: 'lasius', x: W * (port ? 0.3 : 0.3), y: H * (port ? 0.72 : 0.64), r: 20 * kS };
      if (DEC) { nestL.x = VX0 + VW * (port ? 0.5 : 0.13); nestL.y = H * (port ? 0.84 : 0.68); }
      // double pont : plate-forme du nid à gauche, plate-forme de la nourriture à droite
      // plates-formes à la mesure des fourmis : trop grandes, l'entrée du pont devient un trou de serrure introuvable
      const PB = PONT ? { N: [VX0 + VW * 0.08, H * 0.52], F: [VX0 + VW * 0.92, H * 0.52], R: Math.min(Math.min(VW, H) * 0.085, SP.lasius.L * kS * 3.2 * 1.5) } : null;
      if (PONT) { nestL.x = PB.N[0]; nestL.y = PB.N[1]; nestL.r = PB.R * 0.55; }
      nestL.holes = [{ x: nestL.x, y: nestL.y }, { x: nestL.x + 13 * kS, y: nestL.y - 9 * kS }];
      const nestA = { kind: 'atta', x: W * 0.78, y: H * (port ? 0.84 : 0.7), r: 34 * kS, holes: [] };
      for (let i = 0; i < 4; i++) { const an = (i * TAU) / 4 + rnd(0.6); nestA.holes.push({ x: nestA.x + Math.cos(an) * nestA.r * 0.55, y: nestA.y + Math.sin(an) * nestA.r * 0.45 }); }

      const foods = [];
      function mkFood(x, y, kind) {
        const pts = []; for (let i = 0; i < 9; i++) pts.push(rnd(1.15, 0.72));
        const amt = Math.round((kind === 'sucre' ? 70 : 45) * MS);
        return { x, y, kind, amt, amt0: amt, pts, rot: rnd(TAU), r: 1, pores: Array.from({ length: 5 }, () => [rnd(0.6, -0.6), rnd(0.6, -0.6)]) };
      }
      const leaves = [];
      const PETALS = ['#f2a7c3', '#f6d36b', '#f3efe6', '#e8735c', '#b9a3f0'];
      function mkLeaf(x, y, kind) {
        const fl = kind === 'fleur', len = (fl ? rnd(40, 30) : rnd(100, 72)) * kS * 0.8;
        const S = Math.ceil(len * 2.2 + 16), c = S / 2, tmp = layer(S, S), t = tmp.g, Lr = layer(S, S);
        let pc;
        if (!fl) {
          const ang = rnd(TAU);
          A.drawLeaf(t, c - Math.cos(ang) * len / 2, c - Math.sin(ang) * len / 2, len, ang, false);
          pc = ['#62a03e', '#70ac47', '#558f35'][rint(3)];
        } else {
          pc = PETALS[rint(PETALS.length)];
          const r0 = rnd(TAU);
          for (let k = 0; k < 5; k++) {
            t.save(); t.translate(c, c); t.rotate(r0 + (k * TAU) / 5);
            const gr = t.createLinearGradient(0, 0, len, 0);
            gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.3, pc); gr.addColorStop(1, pc);
            t.fillStyle = gr; t.beginPath(); t.ellipse(len * 0.5, 0, len * 0.52, len * 0.3, 0, 0, TAU); t.fill();
            t.strokeStyle = 'rgba(0,0,0,.12)'; t.lineWidth = 0.8; t.stroke();
            t.restore();
          }
          t.fillStyle = '#e2a92c'; t.beginPath(); t.arc(c, c, len * 0.22, 0, TAU); t.fill();
          t.fillStyle = '#8a5a12';
          for (let i = 0; i < 14; i++) { const an = rnd(TAU), d = rnd(len * 0.18); t.fillRect(c + Math.cos(an) * d, c + Math.sin(an) * d, 1.6, 1.6); }
        }
        const g = Lr.g;
        g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 6; g.shadowOffsetX = 3; g.shadowOffsetY = 4;
        g.drawImage(tmp.c, 0, 0);
        g.shadowColor = 'transparent';
        const MR = 3, mw = Math.ceil(S / MR), id = t.getImageData(0, 0, S, S).data, mask = new Uint8Array(mw * mw);
        let alive = 0;
        for (let my = 0; my < mw; my++) for (let mx = 0; mx < mw; mx++) {
          const px = Math.min(S - 1, mx * MR + 1), py = Math.min(S - 1, my * MR + 1);
          if (id[(py * S + px) * 4 + 3] > 200) { mask[my * mw + mx] = 1; alive++; }
        }
        return { x, y, S, c, Lr, mask, mw, MR, alive, alive0: alive, pc, kind, fade: 0, dying: false };
      }
      function leafHas(lf, x, y) {
        const mx = Math.floor((x - lf.x + lf.c) / lf.MR), my = Math.floor((y - lf.y + lf.c) / lf.MR);
        return mx >= 0 && my >= 0 && mx < lf.mw && my < lf.mw && lf.mask[my * lf.mw + mx] === 1;
      }
      function leafCell(lf) {
        for (let k = 0; k < 24; k++) {
          const i = rint(lf.mask.length);
          if (lf.mask[i]) return [lf.x - lf.c + ((i % lf.mw) + 0.5) * lf.MR, lf.y - lf.c + (((i / lf.mw) | 0) + 0.5) * lf.MR];
        }
        return [lf.x, lf.y];
      }
      function bite(lf, x, y, r) {
        const lx = x - lf.x + lf.c, ly = y - lf.y + lf.c, g = lf.Lr.g;
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(lx, ly, r, 0, TAU);
        for (let k = 0; k < 3; k++) { const an = rnd(TAU); g.moveTo(lx + Math.cos(an) * r * 0.7 + r * 0.5, ly + Math.sin(an) * r * 0.7); g.arc(lx + Math.cos(an) * r * 0.7, ly + Math.sin(an) * r * 0.7, r * 0.5, 0, TAU); }
        g.fill(); g.globalCompositeOperation = 'source-over';
        const R = Math.ceil(r / lf.MR) + 1, cx = Math.floor(lx / lf.MR), cy = Math.floor(ly / lf.MR);
        for (let y2 = cy - R; y2 <= cy + R; y2++) for (let x2 = cx - R; x2 <= cx + R; x2++) {
          if (x2 < 0 || y2 < 0 || x2 >= lf.mw || y2 >= lf.mw) continue;
          if (Math.hypot((x2 + 0.5) * lf.MR - lx, (y2 + 0.5) * lf.MR - ly) > r) continue;
          const i = y2 * lf.mw + x2;
          if (lf.mask[i]) { lf.mask[i] = 0; lf.alive--; }
        }
        if (lf.alive < lf.alive0 * 0.04) lf.dying = true;
        feuillesSale = true;
      }

      const keepOut = [[nestL.x, nestL.y, nestL.r * 3], [nestA.x, nestA.y, nestA.r * 2.4]];
      const L0 = !SOC ? [] : port ? [[0.25, 0.14, 'feuille'], [0.72, 0.3, 'fleur'], [0.15, 0.4, 'feuille']] : [[0.2, 0.18, 'feuille'], [0.52, 0.13, 'fleur'], [0.1, 0.4, 'feuille']];
      for (const [fx, fy, k] of L0) { leaves.push(mkLeaf(W * fx, H * fy, k)); keepOut.push([W * fx, H * fy, 70 * kS]); }
      leaves.forEach((l) => (l.fade = 1));
      const F0 = PONT ? [] : DEC ? [] : port ? [[0.62, 0.55, 'miette'], [0.12, 0.88, 'sucre'], [0.5, 0.95, 'miette']] : [[0.47, 0.44, 'miette'], [0.12, 0.84, 'sucre'], [0.55, 0.86, 'miette'], [0.36, 0.3, 'sucre']];
      for (const [fx, fy, k] of F0) { foods.push(mkFood(W * fx, H * fy, k)); keepOut.push([W * fx, H * fy, 40 * kS]); }
      // grand terrain : d'autres feuilles et d'autres miettes, semées loin des nids ; elles repoussent quand on les a consommées
      const spot = (r) => { for (let k = 0; k < 60; k++) { const x = rnd(W * 0.94, W * 0.06), y = rnd(H * 0.94, H * 0.06); if (!keepOut.some((o) => Math.hypot(o[0] - x, o[1] - y) < o[2] + r)) return [x, y]; } return null; };
      const NL0 = SOC ? L0.length + Math.round((keep.ssize - 1) * 2) : 0, NF0 = SOC ? F0.length + Math.round((keep.ssize - 1) * 2.5) : 0;
      for (let i = L0.length; i < NL0; i++) { const q = spot(70 * kS); if (q) { const l = mkLeaf(q[0], q[1], Math.random() < 0.3 ? 'fleur' : 'feuille'); l.fade = 1; leaves.push(l); keepOut.push([q[0], q[1], 70 * kS]); } }
      for (let i = F0.length; i < NF0; i++) { const q = spot(40 * kS); if (q) { foods.push(mkFood(q[0], q[1], Math.random() < 0.45 ? 'sucre' : 'miette')); keepOut.push([q[0], q[1], 40 * kS]); } }
      let FID = 0;
      const FK = SOC ? MS : Math.max(1, (PONT ? keep.np : keep.n) / 70); // une goutte nourrit une colonie à sa mesure
      function addSugar(x, y, amt) { const f = mkFood(x, y, 'sucre'); f.amt = f.amt0 = Math.round((amt || 160) * (amt > 1e8 ? 1 : FK)); f.id = ++FID; f.t0 = T; f.found = null; f.finder = null; foods.push(f); return f; }
      if (DEC) {
        addSugar(VX0 + VW * (port ? 0.6 : 0.8), H * (port ? 0.22 : 0.3), 320); keepOut.push([foods[0].x, foods[0].y, 60 * kS]);
        if (keep.size >= 3) { addSugar(VX0 + VW * (port ? 0.25 : 0.42), H * (port ? 0.5 : 0.18), 220); addSugar(VX0 + VW * (port ? 0.8 : 0.62), H * (port ? 0.62 : 0.82), 260); }
      }
      if (PONT) { const f = addSugar(PB.F[0], PB.F[1], 1e9); f.r0 = PB.R * 0.45; }
      const pebbles = [];
      for (let tries = 0; !PONT && pebbles.length < (DEC ? Math.round(3 + keep.size * 3) : Math.round((6 * area + 2) * (SOC ? keep.ssize : 1))) && tries < 400; tries++) {
        const p = { x: rnd(W * 0.95, W * 0.05), y: rnd(H * 0.95, H * 0.05), r: rnd(24, 9) * kS * 0.8 };
        if (keepOut.some((k) => Math.hypot(k[0] - p.x, k[1] - p.y) < k[2] + p.r) || pebbles.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < q.r + p.r + 30)) continue;
        pebbles.push(p);
      }
      // le décor 2D ne sert qu'au repli (sans WebGL2) : il est peint à la première image qui en a besoin
      let bg = null;
      const fond2D = () => bg || (bg = PONT ? pontGround() : A.ground(W, H, { k: kS, nests: SOC ? [nestL, nestA] : [nestL], pebbles }));
      let decorSale = true, feuillesSale = true;

      /* double pont : les mêmes tracés servent au décor (pixels) et au masque de marche (grille) */
      let WALK = null, BR = null, lateT = PONT && keep.late ? 50 : 0, lateOn = !(PONT && keep.late);
      const BW = PONT ? SP.lasius.L * kS * 3.2 : 0;
      function bridgeShapes() {
        const [nx, ny] = PB.N, [fx, fy] = PB.F, P1 = [nx + PB.R + VW * 0.08, ny], P2 = [fx - PB.R - VW * 0.08, fy], dx = P2[0] - P1[0];
        const eq = keep.bridge === 'egal', h1 = H * (eq ? 0.27 : 0.04), h2 = H * 0.27, a30 = Math.PI / 6;
        // les deux branches partent du même angle (30°) : à l'embranchement, rien ne dit laquelle est la plus courte
        // une branche = une suite de courbes de Bézier cubiques ; toutes partent de l'embranchement à 30°
        const branch = (h, sg) => { const d = h / Math.sin(a30); return [[P1, [P1[0] + Math.cos(a30) * d, P1[1] + sg * Math.sin(a30) * d], [P2[0] - Math.cos(a30) * d, P2[1] + sg * Math.sin(a30) * d], P2]]; };
        // la longue : elle descend en serpentant, puis remonte (environ deux fois la courte)
        const longB = () => {
          const d = H * 0.12, c = Math.cos(a30) * d, sn = Math.sin(a30) * d, yb = P1[1] + H * 0.27, n = 5, xs = (i) => P1[0] + dx * (0.12 + (0.76 * i) / (n - 1));
          const S = [[P1, [P1[0] + c, P1[1] + sn], [xs(0) - dx * 0.06, yb - H * 0.05], [xs(0), yb]]];
          for (let i = 0; i < n - 1; i++) { const x0 = xs(i), x1 = xs(i + 1), up = i % 2 === 0 ? -1 : 1; S.push([[x0, yb], [x0 + (x1 - x0) * 0.35, yb + up * H * 0.13], [x1 - (x1 - x0) * 0.35, yb + up * H * 0.13], [x1, yb]]); }
          S.push([[xs(n - 1), yb], [xs(n - 1) + dx * 0.06, yb - H * 0.05], [P2[0] - c, P2[1] + sn], P2]);
          return S;
        };
        return { stem: [[nx, ny], P1], join: [P2, [fx, fy]], up: branch(h1, -1), dn: eq ? branch(h2, 1) : longB(), P1, P2, dx };
      }
      function bezLen(S) { return S.reduce((s, b) => s + bezLen1(b), 0); }
      function bezLen1(b) { let L = 0, q = b[0]; for (let i = 1; i <= 60; i++) { const t = i / 60, u = 1 - t, x = u * u * u * b[0][0] + 3 * u * u * t * b[1][0] + 3 * u * t * t * b[2][0] + t * t * t * b[3][0], y = u * u * u * b[0][1] + 3 * u * u * t * b[1][1] + 3 * u * t * t * b[2][1] + t * t * t * b[3][1]; L += Math.hypot(x - q[0], y - q[1]); q = [x, y]; } return L; }
      function pathB(g, S, k) { for (const b of S) { g.moveTo(b[0][0] * k, b[0][1] * k); g.bezierCurveTo(b[1][0] * k, b[1][1] * k, b[2][0] * k, b[2][1] * k, b[3][0] * k, b[3][1] * k); } }
      function strokeBridges(g, k, w, withUp) {
        const B = bridgeShapes();
        g.lineWidth = w * k; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
        g.moveTo(B.stem[0][0] * k, B.stem[0][1] * k); g.lineTo(B.stem[1][0] * k, B.stem[1][1] * k);
        g.moveTo(B.join[0][0] * k, B.join[0][1] * k); g.lineTo(B.join[1][0] * k, B.join[1][1] * k);
        pathB(g, B.dn, k); if (withUp) pathB(g, B.up, k); g.stroke();
        g.beginPath(); g.arc(PB.N[0] * k, PB.N[1] * k, PB.R * k, 0, TAU); g.arc(PB.F[0] * k, PB.F[1] * k, PB.R * k, 0, TAU); g.fill();
      }
      function buildWalk() {
        const L = layer(GW, GH, true), g = L.g, k = 1 / CS;
        g.fillStyle = '#fff'; g.strokeStyle = '#fff'; strokeBridges(g, k, BW, lateOn);
        let d = g.getImageData(0, 0, GW, GH).data; WALK = new Uint8Array(NG); for (let i = 0; i < NG; i++) WALK[i] = d[i * 4 + 3] > 100 ? 1 : 0;
        // repérer les deux branches (hors des abords de l'embranchement)
        BR = new Uint8Array(NG); const B = bridgeShapes(), cut = BW * 2.2;
        for (const [b, id] of [[B.up, 1], [B.dn, 2]]) {
          g.clearRect(0, 0, GW, GH); g.lineWidth = BW * k; g.strokeStyle = '#fff'; g.beginPath(); pathB(g, b, k); g.stroke();
          g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(B.P1[0] * k, B.P1[1] * k, cut * k, 0, TAU); g.arc(B.P2[0] * k, B.P2[1] * k, cut * k, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
          d = g.getImageData(0, 0, GW, GH).data; for (let i = 0; i < NG; i++) if (d[i * 4 + 3] > 100) BR[i] = id;
        }
      }
      function pontGround() {
        const Lr = layer(W, H), g = Lr.g;
        // de l'eau sombre (les vraies expériences isolent le pont au-dessus d'un fossé d'eau)
        const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#16222c'); wg.addColorStop(1, '#0c141b'); g.fillStyle = wg; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(160,200,230,.05)'; g.lineWidth = 1;
        for (let i = 0; i < 90; i++) { const x = rnd(W), y = rnd(H), l = rnd(60, 20); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3, x + l, y); g.stroke(); }
        g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 14; g.shadowOffsetY = 6; g.fillStyle = '#c9b48e'; g.strokeStyle = '#c9b48e'; strokeBridges(g, 1, BW, lateOn); g.restore();
        // carton : fibres, bords plus clairs
        g.save(); g.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < (W * H) / 60; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,245,220,.12)' : 'rgba(80,60,30,.1)'; g.fillRect(rnd(W), rnd(H), rnd(3, 1), 1); }
        g.restore();
        // le nid : de la terre sur la plate-forme de gauche, avec ses entrées
        const [nx, ny] = PB.N, gr = g.createRadialGradient(nx, ny, 0, nx, ny, PB.R);
        gr.addColorStop(0, 'rgba(90,66,42,.95)'); gr.addColorStop(0.75, 'rgba(110,84,56,.7)'); gr.addColorStop(1, 'rgba(110,84,56,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(nx, ny, PB.R, 0, TAU); g.fill();
        for (const h of nestL.holes) { const hg = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, nestL.r * 0.5); hg.addColorStop(0, 'rgba(0,0,0,.95)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hg; g.beginPath(); g.arc(h.x, h.y, nestL.r * 0.5, 0, TAU); g.fill(); }
        return Lr;
      }
      if (PONT) { nestL.holes = [{ x: nestL.x, y: nestL.y }, { x: nestL.x - PB.R * 0.3, y: nestL.y + PB.R * 0.25 }]; buildWalk(); }
      const walkAt = (x, y) => { if (!WALK) return 1; const i = gi(x, y); return i < 0 ? 0 : WALK[i]; };

      /* colonies */
      const colL = { sp: SP.lasius, nest: nestL, F: G(), Hm: G(), ants: [], acc: 0 };
      const colA = { sp: SP.atta, nest: nestA, F: G(), Hm: G(), ants: [], acc: 0 };
      const colE = { sp: SP.eciton, F: G(), ants: [], acc: 0 };
      let AID = 0;
      function mkAnt(col, role) {
        const sp = col.sp;
        let L = sp.L * kS, hk = 1, v = 1, sold = false;
        if (role === 'soldat') { if (sp === SP.atta) { L *= 1.42; hk = 1.75; v = 0.75; } else { L *= 1.2; hk = 1.3; sold = true; v = 0.9; } }
        if (role === 'minime') { L *= 0.56; v = 0.85; }
        L *= rnd(1.07, 0.93);
        const a = { col, sp, role, L, hk, v, sold, rep: false, id: AID++, x: -99, y: -99, a: rnd(TAU), ca: 1, sa: 0, w: 0, nz: 0, g: rnd(TAU), wig: 1,
          st: 'nid', tIn: rnd(22), carry: null, pause: 0, cut: 0, alarm: 0, label: 0, spd: 0, life: 0, giveUp: 90, q: 0, uturn: 0, free: false, fleeK: 0, fleeA: 0, pt: null, tx: 0, ty: 0, tl: null };
        col.ants.push(a);
        return a;
      }
      const nL = SOC ? Math.round(190 * area * MS) : PONT ? keep.np : keep.n, nA = SOC ? Math.round(190 * area * MS) : 0, nE = SOC ? Math.round(240 * area * MS) : 0;
      for (let i = 0; i < nL; i++) mkAnt(colL, 'ouvrière');
      for (let i = 0; i < nA; i++) { const r = Math.random(); mkAnt(colA, r < 0.07 ? 'soldat' : r < 0.25 ? 'minime' : 'ouvrière'); }
      for (let i = 0; i < nE; i++) mkAnt(colE, Math.random() < 0.06 ? 'soldat' : 'ouvrière');
      const ALL = colL.ants.concat(colA.ants, colE.ants);

      /* proies : collemboles */
      const prey = [], nP = SOC ? Math.round((9 * area + 4) * keep.ssize) : DEC ? Math.round(3 * keep.size) : 0;
      const mkPrey = () => ({ prey: true, x: rnd(W * 0.95, W * 0.05), y: rnd(H * 0.95, H * 0.05), a: rnd(TAU), hop: 0, vx: 0, vy: 0, L: rnd(8, 5.5) * kS * 0.8, still: rnd(3), fade: 0, dead: false, hue: rnd(270, 220) });
      for (let i = 0; i < nP; i++) prey.push(mkPrey());

      /* raid légionnaire */
      const raid = { on: false, t: 0, next: 1e9, ex: 0, ey: 0, fx: 0, fy: 0, dir: 0, fan: 85 * kS };
      function startRaid() {
        const side = rint(4), u = rnd(0.8, 0.2), o = 30 * kS;
        if (side === 0) { raid.ex = -o; raid.ey = H * u; raid.dir = 0; }
        else if (side === 1) { raid.ex = W + o; raid.ey = H * u; raid.dir = Math.PI; }
        else if (side === 2) { raid.ex = W * u; raid.ey = -o; raid.dir = Math.PI / 2; }
        else { raid.ex = W * u; raid.ey = H + o; raid.dir = -Math.PI / 2; }
        raid.dir += rnd(0.5, -0.5);
        raid.fx = raid.ex + Math.cos(raid.dir) * 60 * kS; raid.fy = raid.ey + Math.sin(raid.dir) * 60 * kS;
        raid.on = true; raid.t = rnd(95, 70);
      }

      /* grille spatiale */
      const HC = Math.max(12, Math.round(32 * Z)), HW = Math.ceil(W / HC) + 3, HH = Math.ceil(H / HC) + 3, BK = Array.from({ length: HW * HH }, () => []);
      const hcx = (x) => clamp(Math.floor(x / HC) + 1, 0, HW - 1), hcy = (y) => clamp(Math.floor(y / HC) + 1, 0, HH - 1);
      const finger = { x: 0, y: 0, on: false };

      let SL = 0, SC = 0, SR = 0, WAN = 1;
      function sense(g, a, sd) {
        const c1 = Math.cos(a.a - 0.6), s1 = Math.sin(a.a - 0.6), c2 = Math.cos(a.a + 0.6), s2 = Math.sin(a.a + 0.6);
        SL = samp(g, a.x + c1 * sd, a.y + s1 * sd); SC = samp(g, a.x + a.ca * sd, a.y + a.sa * sd); SR = samp(g, a.x + c2 * sd, a.y + s2 * sd);
        return SL + SC + SR;
      }
      const toward = (a, tx, ty) => wrap(Math.atan2(ty - a.y, tx - a.x) - a.a);
      const uturn = (a) => { a.uturn = (Math.random() < 0.5 ? -1 : 1) * Math.PI * rnd(1.08, 0.9); };
      let lastPluck = 0, lastChirp = 0, lastRustle = 0, delivered = 0;

      let trips = 0, nextFoodT = 140, lastBr = 0, recruit = 0;
      const spent = [], brHist = [];
      let toastM = null;
      const toast = (m) => { toastM = { m, t: T }; };
      function enterNest(a, t) {
        if (a.carry || a.rep) { trips++; recruit = Math.min(4, recruit + 0.6); }
        if ((a.carry || a.rep) && snd() && t - lastPluck > 0.22) {
          lastPluck = t; delivered++;
          if (a.sp === SP.lasius) au.pluck(scale(7 + (delivered % 5), 330), 0.9, 0.035);
          else au.pluck(scale(2 + (delivered % 4), 165), 1.2, 0.03);
        }
        a.st = 'nid'; a.tIn = DEC || PONT ? rnd(5, 1) : rnd(9, 2); a.carry = null; a.rep = false; a.leaf = null; a.hiker = 0; a.x = -99; a.y = -99; a.label = 0;
      }
      function exitNest(a) {
        const h = a.col.nest.holes[rint(a.col.nest.holes.length)];
        a.x = h.x + rnd(3, -3); a.y = h.y + rnd(3, -3); a.a = rnd(TAU); a.st = 'cherche'; a.life = 0; a.spd = 0; a.uturn = 0; a.pause = 0; a.alarm = 0;
        a.giveUp = a.role === 'soldat' ? rnd(240, 120) : rnd(130, 60); a.q = 0; a.tl = null;
      }

      function behaveCol(a, dt, t, hx, hy, sd) {
        const col = a.col, n = col.nest;
        let wd = 0; WAN = 1;
        if (a.st === 'cherche') {
          let best = null, bd = 1e9;
          if (a.role === 'ouvrière') {
            if (a.sp === SP.lasius) {
              for (const f of foods) { const d = Math.hypot(f.x - a.x, f.y - a.y); if (d < f.r + (SOC ? 48 : 20) * kS && d < bd) { bd = d; best = f; } } // l'odeur du sucre ne porte pas loin
              if (best) {
                wd += toward(a, best.x, best.y) * 4; WAN = 0.25;
                if (Math.hypot(hx - best.x, hy - best.y) < best.r + a.L * 0.1) {
                  best.amt -= 1;
                  if (best.id && !best.found) { best.found = T; best.finder = a; a.finder = best.id; a.label = 9; if (!SOC) toast(`Une éclaireuse a trouvé le sucre n° ${best.id} au bout de ${fr(T - best.t0)} s. Elle rentre en marquant le sol.`); }
                  if (best.id) a.src = best.id;
                  if (best.kind === 'sucre') { a.st = 'boit'; a.cut = rnd(2.8, 1.6); }
                  else { a.carry = 'miette'; a.st = 'retour'; a.q = 1; uturn(a); }
                }
              }
            } else {
              if (a.tl && (a.tl.dying || !leaves.includes(a.tl))) a.tl = null;
              if (!a.tl) for (const lf of leaves) {
                if (lf.dying) continue;
                const d = Math.hypot(lf.x - a.x, lf.y - a.y);
                if (d < lf.c + 75 * kS) { a.tl = lf; const c = leafCell(lf); a.tx = c[0]; a.ty = c[1]; break; }
              }
              if (a.tl) {
                best = a.tl;
                wd += toward(a, a.tx, a.ty) * 3.5; WAN = 0.35;
                if (leafHas(a.tl, hx, hy)) { a.st = 'coupe'; a.cut = rnd(3, 1.6); a.cutA = a.a; }
                else if (Math.hypot(a.tx - a.x, a.ty - a.y) < a.L * 0.5) { const c = leafCell(a.tl); a.tx = c[0]; a.ty = c[1]; }
              }
            }
          }
          if (!best) {
            const s = sense(col.F, a, sd);
            // sur le pont, les fourmis suivent la piste plus fidèlement (réponse non linéaire : plus elle est forte, moins on s'en écarte)
            if (s > 0.05) { const at = a.sp === SP.atta; wd += ((SR - SL) / (s + (PONT ? 0.15 : 0.4))) * (at ? 5.5 : PONT ? 6.5 : 4.5); WAN = 1 / (1 + s * (at ? 1.6 : PONT ? 2.5 : 0.7)); }
            else if (a.role !== 'soldat') wd -= toward(a, n.x, n.y) * 0.08;
          }
          dep(col.Hm, a.x, a.y, 1.6 * dt, 12);
          // sur le pont, comme chez la fourmi d'Argentine de l'expérience, on marque aussi à l'aller (plus faiblement)
          if (PONT) dep(col.F, a.x, a.y, 0.9 * dt, 14);
          if (a.life > a.giveUp) { a.st = 'retour'; a.q = 0; }
        } else {
          // au retour : l'odeur du nid, et (hors vue d'ensemble) surtout la piste de nourriture, suivie dans les deux sens
          const s = sense(col.Hm, a, sd), kH = SOC ? 2.6 : PONT ? 0.35 : 1;
          if (s > 0.05) wd += ((SR - SL) / (s + 0.4)) * kH;
          if (!SOC) { const s2 = sense(col.F, a, sd); if (s2 > 0.05) { wd += ((SR - SL) / (s2 + (PONT ? 0.15 : 0.4))) * (PONT ? 5 : 2); if (PONT) WAN = 1 / (1 + s2 * 2.5); } }
          wd += toward(a, n.x, n.y) * 1.1; WAN = 0.55;
          if (a.q > 0.02) { dep(col.F, a.x, a.y, 6 * a.q * dt, 14); a.q *= Math.exp(-dt * 0.022); }
          if (Math.hypot(a.x - n.x, a.y - n.y) < n.r * 0.9) enterNest(a, t);
        }
        return wd;
      }

      function behaveE(a, dt, t, hx, hy, sd) {
        let wd = 0; WAN = 1;
        if (!raid.on && a.st !== 'retour') a.st = 'retour';
        if (a.st === 'aller') {
          const px = -Math.sin(raid.dir), py = Math.cos(raid.dir);
          const tx = raid.fx + px * a.off * raid.fan, ty = raid.fy + py * a.off * raid.fan;
          const s = sense(colE.F, a, sd); if (s > 0.05) wd += ((SR - SL) / (s + 0.4)) * 3;
          wd += toward(a, tx, ty) * 1.3; WAN = 0.75;
          dep(colE.F, a.x, a.y, 2.4 * dt, 14);
          if (Math.hypot(tx - a.x, ty - a.y) < 40 * kS) { a.st = 'chasse'; a.cut = rnd(12, 5); }
        } else if (a.st === 'chasse') {
          a.cut -= dt; WAN = 2.3;
          wd += toward(a, raid.fx, raid.fy) * 0.45;
          if (a.pt && !a.pt.dead) { wd += toward(a, a.pt.x, a.pt.y) * 4; WAN = 0.5; }
          dep(colE.F, a.x, a.y, 1.2 * dt, 14);
          if (a.cut <= 0 || a.carry) { a.st = 'retour'; a.pt = null; }
        } else {
          const s = sense(colE.F, a, sd); if (s > 0.05) wd += ((SR - SL) / (s + 0.4)) * 3;
          wd += toward(a, a.ex, a.ey) * 1.25; WAN = 0.6;
          dep(colE.F, a.x, a.y, (a.carry ? 4 : 2) * dt, 14);
          if (Math.hypot(a.ex - a.x, a.ey - a.y) < 22 * kS) { a.st = 'nid'; a.carry = null; a.x = -999; a.y = -999; a.label = 0; }
        }
        return wd;
      }

      function upd(a, dt, t) {
        const sp = a.sp, L = a.L, ecit = sp === SP.eciton;
        a.label = Math.max(0, a.label - dt); a.alarm = Math.max(0, a.alarm - dt * 0.35); a.life += dt;
        const hx = a.x + a.ca * L * 0.45, hy = a.y + a.sa * L * 0.45, sd = Math.max(2.4 * L, CS * 2.3);
        let wd = 0, vf = 1, steer = false;
        a.wig += (1 - a.wig) * Math.min(1, dt * 3);
        if (a.pause > 0) { a.pause -= dt; vf = 0; a.wig = 2.6; }
        else if (a.st === 'coupe') {
          a.cut -= dt; vf = 0; a.wig = 1.4; a.a = a.cutA + Math.sin(t * 7 + a.id) * 0.28;
          if (a.cut <= 0) {
            const lf = a.tl;
            if (lf && !lf.dying) {
              bite(lf, a.x + Math.cos(a.cutA) * L * 0.55, a.y + Math.sin(a.cutA) * L * 0.55, L * 0.55);
              a.carry = 'feuille'; a.leaf = A.leafPiece(L); a.leafCol = lf.pc; a.leafRot = rnd(0.5, -0.5);
              a.hiker = Math.random() < 0.22 ? rnd(TAU) + 0.01 : 0; a.st = 'retour'; a.q = 1; uturn(a);
            } else a.st = 'cherche';
            a.a = a.cutA; a.tl = null;
          }
        } else if (a.st === 'boit') {
          a.cut -= dt; vf = 0; a.wig = 0.5;
          if (a.cut <= 0) { a.rep = true; a.st = 'retour'; a.q = 1; uturn(a); }
        } else if (a.uturn) {
          const s = Math.sign(a.uturn), st = Math.min(Math.abs(a.uturn), 4.2 * dt);
          a.a += s * st; a.uturn -= s * st; if (Math.abs(a.uturn) < 1e-3) a.uturn = 0;
          vf = 0.4; a.w = 0;
        } else {
          steer = true;
          wd = ecit ? behaveE(a, dt, t, hx, hy, sd) : behaveCol(a, dt, t, hx, hy, sd);
          if (a.st === 'nid') return;
        }
        a.nz += -a.nz * 1.6 * dt + gauss() * 3.2 * Math.sqrt(dt);
        if (steer) {
          wd += a.nz * WAN;
          for (const p of pebbles) {
            const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy) || 1, lim = p.r + L * 1.4;
            if (d < lim) {
              const out = Math.atan2(dy, dx);
              if (Math.cos(a.a - out) < 0.2) {
                const t1 = out + Math.PI / 2, t2 = out - Math.PI / 2;
                const want = Math.abs(wrap(t1 - a.a)) < Math.abs(wrap(t2 - a.a)) ? t1 : t2;
                wd += wrap(want - a.a) * 5 * (1 - (d - p.r) / (L * 1.4));
              }
              const mn = p.r + L * 0.35;
              if (d < mn) { a.x = p.x + (dx / d) * mn; a.y = p.y + (dy / d) * mn; }
            }
          }
          if (WALK) {
            // les antennes sentent le bord du pont : on tourne du côté où il y a du carton
            const r = L * 1.3, ok = (da) => walkAt(a.x + Math.cos(a.a + da) * r, a.y + Math.sin(a.a + da) * r);
            if (!ok(0)) { const l = ok(-0.8), rr = ok(0.8); wd += l && !rr ? -6 : rr && !l ? 6 : (a.id % 2 ? 6 : -6); }
            else if (!ok(-0.5)) wd += 2.5; else if (!ok(0.5)) wd -= 2.5;
          }
          if (!a.free && !WALK) { const m = 26 * Z; if (a.x < m || a.x > W - m || a.y < m || a.y > H - m) wd += toward(a, W / 2, H / 2) * 2.5; }
          if (finger.on) {
            const d = Math.hypot(a.x - finger.x, a.y - finger.y);
            if (d < L * 3.5 + 22) { wd += wrap(Math.atan2(a.y - finger.y, a.x - finger.x) - a.a) * 4; a.alarm = Math.max(a.alarm, 0.8); }
          }
          if (a.fleeK > 0) { wd += wrap(a.fleeA - a.a) * 4 * a.fleeK; a.fleeK = 0; }
          if (!ecit) {
            const s = sense(ALARM, a, sd);
            if (s > 0.3) {
              a.alarm = Math.max(a.alarm, Math.min(1, s * 0.15));
              wd += ((SR - SL) / (s + 0.5)) * (a.role === 'soldat' ? 5 : -4);
            }
          }
          wd = clamp(wd, -7, 7);
        }
        a.w += (wd - a.w) * Math.min(1, dt * 8);
        a.a += a.w * dt;
        let vt = sp.speed * kS * a.v * vf * (1 + a.alarm * 0.8) * (a.carry === 'feuille' ? 0.72 : a.carry ? 0.85 : 1) * (a.rep ? 0.8 : 1);
        if (ecit && a.st === 'chasse') vt *= 0.8;
        a.spd += (vt - a.spd) * Math.min(1, dt * 6);
        a.ca = Math.cos(a.a); a.sa = Math.sin(a.a);
        const ds = a.spd * dt;
        const ox = a.x, oy = a.y;
        a.x += a.ca * ds; a.y += a.sa * ds; a.g += (ds / L) * 5.2;
        if (WALK && !walkAt(a.x, a.y)) { a.x = ox; a.y = oy; a.a += Math.PI * rnd(1.3, 0.7) * (Math.random() < 0.5 ? 1 : -1); a.w = 0; }
        if (!a.free) {
          if (a.x < 3) { a.x = 3; a.a = Math.PI - a.a; } else if (a.x > W - 3) { a.x = W - 3; a.a = Math.PI - a.a; }
          if (a.y < 3) { a.y = 3; a.a = -a.a; } else if (a.y > H - 3) { a.y = H - 3; a.a = -a.a; }
        }
        dep(WEAR, a.x, a.y, ds * (sp === SP.atta ? 0.0035 : 0.001), 1);
      }

      function evap(g, k, dt, dk) {
        const f = Math.exp(-k * dt);
        for (let i = 0; i < NG; i++) g[i] *= f;
        // la diffusion en cases : sur des cases plus fines, une piste reste plus étroite à l'écran
        if (dk) { let r = dk * dt; while (r > 1e-4) { const k2 = Math.min(0.2, r); diffuse(g, TMP, GW, GH, k2); r -= k2; } }
      }

      let chemDt = 0, alarmT = 0;
      function step(dt, t) {
        T += dt; recruit *= Math.exp(-dt / 25);
        // les grilles de phéromones (fines sur un grand terrain) évoluent dix fois par seconde : c'est bien assez lent
        chemDt += dt;
        if (chemDt >= 0.1) {
          const cd = chemDt; chemDt = 0;
          evap(colL.F, 0.03 * (SOC ? 1 : keep.evap), cd, SOC ? 2.2 : 1); evap(colL.Hm, 0.05, cd, SOC ? 2.2 : 1);
          if (WALK) { const F = colL.F, Hm = colL.Hm; for (let i = 0; i < NG; i++) if (!WALK[i]) { F[i] = 0; Hm[i] = 0; } }
          if (SOC) { evap(colA.F, 0.022, cd, 2.2); evap(colA.Hm, 0.05, cd, 2.2); evap(colE.F, 0.07, cd, 2.2); }
          if (alarmT > 0 || SOC) evap(ALARM, 0.7, cd, 6);
          alarmT = Math.max(0, alarmT - cd);
          const wf = Math.exp(-cd * 0.004); for (let i = 0; i < NG; i++) WEAR[i] *= wf;
        }
        if (PONT && !lateOn && (lateT -= dt) <= 0) { lateOn = true; buildWalk(); bg = null; decorSale = true; toast('La branche courte vient d’être ajoutée. La colonie va-t-elle en changer ?'); }

        /* raid */
        if (raid.on) {
          raid.t -= dt;
          const v = 9 * kS;
          raid.dir += gauss() * 0.45 * Math.sqrt(dt);
          if (raid.fx < W * 0.12 || raid.fx > W * 0.88 || raid.fy < H * 0.12 || raid.fy > H * 0.88) {
            const want = Math.atan2(H / 2 - raid.fy, W / 2 - raid.fx);
            raid.dir += wrap(want - raid.dir) * dt * 0.8;
          }
          raid.fx += Math.cos(raid.dir) * v * dt; raid.fy += Math.sin(raid.dir) * v * dt;
          if (raid.t > 10) {
            colE.acc = Math.min(4 * MS, colE.acc + dt * 15 * MS);
            for (const a of colE.ants) {
              if (colE.acc < 1) break;
              if (a.st !== 'nid') continue;
              colE.acc -= 1;
              a.x = raid.ex + rnd(10, -10) * kS; a.y = raid.ey + rnd(10, -10) * kS; a.a = raid.dir + rnd(0.3, -0.3);
              a.ex = raid.ex; a.ey = raid.ey; a.off = clamp(gauss() * 0.5, -1.2, 1.2);
              a.st = 'aller'; a.free = true; a.spd = 0; a.life = 0; a.uturn = 0; a.pause = 0; a.carry = null; a.pt = null;
            }
          }
          if (raid.t <= 0) { raid.on = false; raid.next = rnd(45, 30); }
        } else if ((raid.next -= dt) <= 0) startRaid();

        /* sorties des nids */
        for (const col of [colL, colA]) {
          // vue rapprochée : quelques éclaireuses sortent d'abord ; chaque retour chargé stimule les sœurs restées au nid
          col.acc = Math.min(3 * FK, col.acc + dt * (SOC ? 6 * MS : (0.35 + recruit * 1.2) * FK));
          for (const a of col.ants) {
            if (a.st !== 'nid') continue;
            a.tIn -= dt;
            if (a.tIn <= 0 && col.acc >= 1) { col.acc -= 1; exitNest(a); }
          }
        }

        /* voisinage */
        for (const b of BK) b.length = 0;
        let nOut = 0;
        for (const a of ALL) if (a.st !== 'nid') { BK[hcx(a.x) + hcy(a.y) * HW].push(a); nOut++; }
        for (const p of prey) BK[hcx(p.x) + hcy(p.y) * HW].push(p);
        for (const a of ALL) {
          if (a.st === 'nid') continue;
          const ecit = a.sp === SP.eciton, L = a.L;
          const R = ecit ? (a.st === 'chasse' ? L * 6 : L * 1.2) : raid.on ? L * 4.5 : L * 1.2;
          const x0 = hcx(a.x - R), x1 = hcx(a.x + R), y0 = hcy(a.y - R), y1 = hcy(a.y + R);
          let bp = null, bpd = 1e9;
          for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) for (const o of BK[gy * HW + gx]) {
            if (o === a) continue;
            const dx = o.x - a.x, dy = o.y - a.y, d = Math.hypot(dx, dy);
            if (d > R) continue;
            if (o.prey) {
              if (ecit && a.st === 'chasse' && !a.carry && !a.sold && !o.dead) {
                if (d < L * 0.8) {
                  o.dead = true; a.carry = 'proie'; a.pt = null;
                  if (snd()) au.note(rnd(1800, 1300), 0.05, 'triangle', 0.025);
                } else if (d < bpd) { bpd = d; bp = o; }
              }
              continue;
            }
            if (o.col === a.col) {
              const lim = (L + o.L) * 0.42;
              if (d < lim && d > 0.01) { const k = ((lim - d) / d) * 0.3, nx = a.x - dx * k, ny = a.y - dy * k; if (walkAt(nx, ny)) { a.x = nx; a.y = ny; } }
              if (d < (L + o.L) * 0.55 && a.pause <= 0 && o.pause <= 0 && !a.uturn && a.st !== 'coupe' && a.ca * o.ca + a.sa * o.sa < -0.4 && Math.random() < dt * 2.5) {
                a.pause = rnd(0.6, 0.3); o.pause = rnd(0.6, 0.3);
                if (a.st === 'cherche' && o.st === 'retour' && (o.carry || o.rep)) a.uturn = wrap(o.a + Math.PI - a.a) || 0.01;
              }
            } else if (!ecit && o.sp === SP.eciton) {
              if (d < L * 4.5) {
                a.fleeA = a.role === 'soldat' ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx); a.fleeK = 1; a.alarm = 1;
                if (a.sp === SP.lasius) { dep(ALARM, a.x, a.y, 3 * dt, 20); alarmT = 4; }
              }
            } else if (ecit && a.st === 'chasse' && !a.carry && !a.sold && o.sp === SP.lasius && d < L * 0.8 && Math.random() < dt * 1.5) {
              o.st = 'nid'; o.tIn = rnd(40, 20); o.carry = null; o.rep = false; o.x = -99; o.y = -99; o.label = 0;
              a.carry = 'proie';
            }
          }
          if (ecit && a.st === 'chasse') a.pt = bp;
        }

        let cutting = 0, raiders = 0;
        for (const a of ALL) {
          if (a.st === 'nid') continue;
          upd(a, dt, t);
          if (a.st === 'coupe') cutting++;
          if (a.sp === SP.eciton && a.st !== 'nid') raiders++;
        }

        /* collemboles */
        for (let i = prey.length - 1; i >= 0; i--) {
          const p = prey[i];
          if (p.dead) { prey.splice(i, 1); continue; }
          p.fade = Math.min(1, p.fade + dt * 0.5);
          if (p.hop > 0) { p.hop -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
          else {
            p.still -= dt;
            if (p.still < 0) {
              p.a += gauss() * 1.5 * Math.sqrt(dt);
              p.x += Math.cos(p.a) * 7 * kS * dt; p.y += Math.sin(p.a) * 7 * kS * dt;
              if (p.still < -rnd(6, 2)) p.still = rnd(4, 1);
            }
            let tx = 0, ty = 0, th = false;
            const R = 42 * kS;
            for (let gy = hcy(p.y - R); gy <= hcy(p.y + R); gy++) for (let gx = hcx(p.x - R); gx <= hcx(p.x + R); gx++) for (const o of BK[gy * HW + gx]) {
              if (o.prey || o.sp !== SP.eciton) continue;
              if (Math.hypot(o.x - p.x, o.y - p.y) < R) { tx = o.x; ty = o.y; th = true; }
            }
            if (finger.on && Math.hypot(finger.x - p.x, finger.y - p.y) < R * 1.4) { tx = finger.x; ty = finger.y; th = true; }
            if (th && Math.random() < dt * 5) {
              const an = Math.atan2(p.y - ty, p.x - tx) + rnd(0.9, -0.9), v = rnd(200, 130) * kS * 0.7;
              p.hop = 0.28; p.vx = Math.cos(an) * v; p.vy = Math.sin(an) * v; p.a = an + rnd(1, -1);
            }
          }
          if (p.x < 6 || p.x > W - 6) { p.vx = -p.vx; p.x = clamp(p.x, 6, W - 6); }
          if (p.y < 6 || p.y > H - 6) { p.vy = -p.vy; p.y = clamp(p.y, 6, H - 6); }
        }
        if (prey.length < nP && Math.random() < dt * 0.15) prey.push(mkPrey());
        if (DEC && keep.more && T > nextFoodT && foods.filter((f) => f.amt > 0).length < 2) {
          // une nouvelle goutte, ailleurs : les éclaireuses doivent tout recommencer
          for (let k = 0; k < 30; k++) {
            const an = rnd(TAU), d = rnd(0.62, 0.3) * VW, x = nestL.x + Math.cos(an) * d, y = nestL.y + Math.sin(an) * d;
            if (x < VX0 + 60 || x > VX0 + VW - 60 || y < 70 || y > H - 50 || pebbles.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + 50)) continue;
            addSugar(x, y, rnd(320, 200)); toast('Une nouvelle goutte de sucre, quelque part…'); break;
          }
          nextFoodT = T + rnd(110, 70);
        }
        if (PONT && (T - lastBr) > 0.5) {
          lastBr = T; let up = 0, dn = 0;
          for (const a of colL.ants) { if (a.st === 'nid') continue; const i = gi(a.x, a.y); if (i >= 0) { if (BR[i] === 1) up++; else if (BR[i] === 2) dn++; } }
          brHist.push([T, up, dn]); if (brHist.length > 600) brHist.shift();
        }

        for (let i = foods.length - 1; i >= 0; i--) {
          const f = foods[i];
          if (f.amt <= 0) { if (f.id) { spent.push({ id: f.id, found: f.found, end: T, t0: f.t0 }); if (!SOC) toast(`Le sucre n° ${f.id} est épuisé : plus personne ne renforce sa piste, elle va s’évaporer.`); } foods.splice(i, 1); continue; }
          f.r = Math.max(2, (f.kind === 'sucre' ? 11 : 9) * kS * 0.8 * (SOC || PONT ? 1 : 1.8) * Math.sqrt(f.amt / f.amt0));
        }
        if (SOC && foods.length < NF0 && Math.random() < dt / 14) { const q = spot(0); if (q) foods.push(mkFood(q[0], q[1], Math.random() < 0.45 ? 'sucre' : 'miette')); }
        if (SOC && leaves.filter((l) => !l.dying).length < NL0 && Math.random() < dt / 25) { const q = spot(0); if (q) leaves.push(mkLeaf(q[0], q[1], Math.random() < 0.3 ? 'fleur' : 'feuille')); }
        for (let i = leaves.length - 1; i >= 0; i--) {
          const lf = leaves[i];
          lf.fade = clamp(lf.fade + (lf.dying ? -dt * 0.4 : dt * 2), 0, 1);
          if (lf.dying && lf.fade <= 0) leaves.splice(i, 1);
        }

        if (snd()) {
          if (cutting && t - lastChirp > 0.07 && Math.random() < Math.min(0.8, cutting * 0.05)) { lastChirp = t; au.noise(0.05, 0.018, rnd(6500, 4800), 9, 'bandpass'); }
          if (raiders > 20 && t - lastRustle > 0.35) { lastRustle = t; au.noise(0.5, Math.min(0.03, raiders * 0.00015), rnd(3200, 2200), 0.8, 'bandpass'); }
        }
        return nOut;
      }

      /* rendu */
      // l'échelle : une ouvrière de Lasius niger mesure environ 5 mm ; le décor est dessiné à la même échelle
      const PXMM = (SP.lasius.L * kS) / 5;
      const wearB = buf(GW, GH), chemB = buf(GW, GH), trailB = buf(GW, GH);
      // les fausses couleurs nommées de la DA (cartes perceptivement uniformes), en octets sRGB pour le repli 2D et le cartel
      const FKR = window.FKR;
      const table = (nom) => {
        const f = FKR ? FKR.palette.carte(nom) : null, T = new Uint8Array(256 * 3);
        for (let i = 0; i < 256; i++) { const c = f ? FKR.couleur.css(f(i / 255)) : '#808080'; for (let k = 0; k < 3; k++) T[i * 3 + k] = parseInt(c.slice(1 + k * 2, 3 + k * 2), 16); }
        return T;
      };
      const ROCKET = table('rocket'), MAKO = table('mako');
      // concentrations ramenées à [0, 1] (courbes monotones, les mêmes en WebGL et en 2D)
      const tF = (v) => 1 - Math.exp(-v * 0.28), tA = (v) => 1 - Math.exp(-v * 0.5), tE = (v) => 1 - Math.exp(-v * 0.4), tH = (v) => 1 - Math.exp(-v * 0.12), tAl = (v) => 1 - Math.exp(-v * 0.25);
      let trailT = 0;
      function trailPaint() {
        // repli 2D : la phéromone de piste en fausse couleur (échelle rocket), translucide
        const d = trailB.d, F = colL.F, aF = colA.F, eF = colE.F;
        for (let i = 0; i < NG; i++) {
          const o = i * 4, v = SOC ? Math.max(tF(F[i]), tA(aF[i]), tE(eF[i])) : tF(F[i]), j = Math.round((0.15 + 0.8 * v) * 255) * 3;
          d[o] = ROCKET[j]; d[o + 1] = ROCKET[j + 1]; d[o + 2] = ROCKET[j + 2];
          d[o + 3] = v < 0.03 ? 0 : (0.22 + 0.3 * v) * 255 * Math.min(1, (v - 0.03) / 0.5);
        }
        trailB.flush();
      }
      let wearT = 0;
      function wearPaint() {
        const d = wearB.d;
        for (let i = 0; i < NG; i++) { const o = i * 4; d[o] = 170; d[o + 1] = 144; d[o + 2] = 110; d[o + 3] = Math.min(105, WEAR[i] * 150); }
        wearB.flush();
      }
      function chemPaint() {
        // repli 2D de l'outil chimie : la piste en rocket ; l'odeur du nid et l'alarme en mako
        const d = chemB.d, lF = colL.F, lH = colL.Hm, aF = colA.F, aH = colA.Hm, eF = colE.F;
        for (let i = 0; i < NG; i++) {
          const o = i * 4, f = Math.max(tF(lF[i]), tA(aF[i]), tE(eF[i])), h = Math.max(tH(lH[i]), tH(aH[i]), tAl(ALARM[i]));
          const jr = Math.round((0.2 + 0.78 * f) * 255) * 3, jm = Math.round((0.3 + 0.65 * h) * 255) * 3, kf = Math.pow(f, 1.2), kh = h * 0.55;
          for (let k = 0; k < 3; k++) d[o + k] = ROCKET[jr + k] * kf + MAKO[jm + k] * kh;
        }
        chemB.flush();
      }

      /* rendu WebGL : le décor est cuit une fois ; les couches et les corps sont redessinés à chaque image */
      // brindilles et feuilles mortes (au hasard, loin des nids)
      const brindilles = [], mortes = [];
      if (V && !PONT) {
        const libre = (x, y) => !keepOut.slice(0, SOC ? 2 : 1).some((k) => Math.hypot(k[0] - x, k[1] - y) < k[2]);
        for (let i = 0, k = 0; i < 5 && k < 60; k++) { const x = rnd(W), y = rnd(H); if (libre(x, y)) { brindilles.push({ x, y, a: rnd(TAU), len: rnd(160, 70) * kS, w: rnd(5, 2.5) * kS, mx: rnd(20, -20) * kS, my: rnd(20, -20) * kS }); i++; } }
        for (let i = 0, k = 0; i < 6 && k < 60; k++) { const x = rnd(W), y = rnd(H); if (libre(x, y)) { mortes.push({ x, y, a: rnd(TAU), len: rnd(70, 40) * kS, c: `hsl(${rnd(34, 22) | 0},${rnd(45, 28) | 0}%,${rnd(30, 19) | 0}%)` }); i++; } }
      }
      // une hauteur (mm) pour la carte du relief : r = hauteur, g = rugosité, b = part de sol procédural
      const hc = (mm, rug, sol, a = 1) => `rgba(${Math.round(clamp(64 + (mm / 16) * 255, 0, 255))},${Math.round(rug * 255)},${Math.round(sol * 255)},${a})`;
      function nidDecor(gH, gA, n, base, R0) {
        const big = n.kind === 'atta', R = R0 || n.r * (big ? 1.5 : 1.9), haut = big ? 3.2 : 1.6;
        // le monticule de terre remuée, plus claire (elle vient du sous-sol)
        const gr = gH.createRadialGradient(n.x, n.y, 0, n.x, n.y, R);
        gr.addColorStop(0, hc(base + haut, 0.95, 1, 1)); gr.addColorStop(0.55, hc(base + haut * 0.7, 0.95, 1, 0.75)); gr.addColorStop(1, hc(base, 0.95, 1, 0));
        gH.fillStyle = gr; gH.beginPath(); gH.arc(n.x, n.y, R, 0, TAU); gH.fill();
        const ga = gA.createRadialGradient(n.x, n.y, 0, n.x, n.y, R);
        ga.addColorStop(0, 'rgba(150,112,74,.6)'); ga.addColorStop(0.7, 'rgba(140,104,68,.3)'); ga.addColorStop(1, 'rgba(140,104,68,0)');
        gA.fillStyle = ga; gA.beginPath(); gA.arc(n.x, n.y, R, 0, TAU); gA.fill();
        // les boulettes de terre déposées par les ouvrières autour des entrées
        gH.globalCompositeOperation = 'lighter';
        for (let i = 0, np = big ? 900 : 380; i < np; i++) {
          const an = rnd(TAU), d = Math.abs(rnd(1, 0) + rnd(1, 0) - 1) * R * 1.05 + n.r * 0.25, r = rnd(1.7, 0.8) * kS * 0.75;
          const x = n.x + Math.cos(an) * d, y = n.y + Math.sin(an) * d;
          gH.fillStyle = `rgb(${Math.round((r / PXMM) * 0.8 * 16)},0,0)`; gH.beginPath(); gH.arc(x, y, r, 0, TAU); gH.fill();
          gA.fillStyle = `hsl(${rnd(38, 26) | 0},${rnd(34, 18) | 0}%,${rnd(50, 32) | 0}%)`; gA.beginPath(); gA.arc(x, y, r, 0, TAU); gA.fill();
        }
        gH.globalCompositeOperation = 'source-over';
        // les entrées : des puits sombres
        for (const h of n.holes) {
          const hr = n.r * (big ? 0.2 : 0.3) * 1.6;
          const g1 = gH.createRadialGradient(h.x, h.y, 0, h.x, h.y, hr);
          g1.addColorStop(0, hc(base - 3.5, 0.95, 1, 1)); g1.addColorStop(0.45, hc(base - 1.5, 0.95, 1, 0.9)); g1.addColorStop(1, hc(base, 0.95, 1, 0));
          gH.fillStyle = g1; gH.beginPath(); gH.arc(h.x, h.y, hr, 0, TAU); gH.fill();
          const g2 = gA.createRadialGradient(h.x, h.y, 0, h.x, h.y, hr);
          g2.addColorStop(0, 'rgba(6,4,3,1)'); g2.addColorStop(0.5, 'rgba(14,9,6,.85)'); g2.addColorStop(1, 'rgba(14,9,6,0)');
          gA.fillStyle = g2; gA.beginPath(); gA.arc(h.x, h.y, hr, 0, TAU); gA.fill();
        }
      }
      function pontTrace(g, w, retrait) {
        const B = bridgeShapes();
        g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
        g.moveTo(B.stem[0][0], B.stem[0][1]); g.lineTo(B.stem[1][0], B.stem[1][1]);
        g.moveTo(B.join[0][0], B.join[0][1]); g.lineTo(B.join[1][0], B.join[1][1]);
        pathB(g, B.dn, 1); if (lateOn) pathB(g, B.up, 1); g.stroke();
        g.beginPath(); g.arc(PB.N[0], PB.N[1], PB.R - retrait, 0, TAU); g.arc(PB.F[0], PB.F[1], PB.R - retrait, 0, TAU); g.fill();
      }
      function peindreDecor(gH, gA) {
        if (PONT) {
          // une cuve d'eau sombre ; le pont de carton, 7 mm au-dessus, y jette son ombre ; le nid de terre sur la plate-forme de gauche
          const ep = 7;
          gH.fillStyle = hc(0, 0.06, 0); gH.fillRect(0, 0, W, H);
          [[0, ep - 0.8, 0], [2, ep - 0.25, 1], [4, ep, 2]].forEach(([dw, mm, r]) => { gH.fillStyle = gH.strokeStyle = hc(mm, 0.9, 0); pontTrace(gH, BW - dw, r); });
          gA.fillStyle = gA.strokeStyle = '#b39b74'; pontTrace(gA, BW, 0);
          gA.save(); gA.globalCompositeOperation = 'source-atop';
          for (let i = 0; i < (W * H) / 50; i++) { gA.fillStyle = Math.random() < 0.5 ? 'rgba(255,245,220,.16)' : 'rgba(80,60,30,.14)'; gA.fillRect(rnd(W), rnd(H), rnd(3, 1), 1); }
          gA.restore();
          const [nx, ny] = PB.N, rn = PB.R * 0.9;
          gH.fillStyle = hc(ep + 0.2, 0.95, 1); gH.beginPath(); gH.arc(nx, ny, rn, 0, TAU); gH.fill();
          gA.save(); gA.globalCompositeOperation = 'destination-out'; gA.beginPath(); gA.arc(nx, ny, rn, 0, TAU); gA.fill(); gA.restore();
          nidDecor(gH, gA, nestL, ep + 0.2, rn);
          return;
        }
        // feuilles mortes, brindilles, nids, cailloux
        for (const m of mortes) {
          const forme = (g) => { const len = m.len, w = len * 0.36; g.save(); g.translate(m.x, m.y); g.rotate(m.a); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -w * 1.2, len * 0.75, -w * 0.9, len, 0); g.bezierCurveTo(len * 0.75, w * 0.9, len * 0.25, w * 1.2, 0, 0); };
          forme(gH); gH.fillStyle = hc(0.4, 0.8, 0); gH.fill(); gH.restore();
          forme(gA); gA.fillStyle = m.c; gA.fill(); gA.strokeStyle = 'rgba(190,150,100,.35)'; gA.lineWidth = 0.8; gA.beginPath(); gA.moveTo(0, 0); gA.lineTo(m.len * 0.95, 0); gA.stroke(); gA.restore();
        }
        for (const b of brindilles) {
          const ex = b.x + Math.cos(b.a) * b.len, ey = b.y + Math.sin(b.a) * b.len, mx = (b.x + ex) / 2 + b.mx, my = (b.y + ey) / 2 + b.my, wm = b.w / PXMM;
          const trace = (g) => { g.beginPath(); g.moveTo(b.x, b.y); g.quadraticCurveTo(mx, my, ex, ey); };
          gH.lineCap = gA.lineCap = 'round';
          for (const f of [1, 0.8, 0.6, 0.4, 0.2]) { gH.strokeStyle = hc(wm * 0.5 * (1 + Math.sqrt(1 - f * f)), 0.7, 0); gH.lineWidth = b.w * f; trace(gH); gH.stroke(); }
          gA.strokeStyle = '#5b4733'; gA.lineWidth = b.w; trace(gA); gA.stroke();
          gA.strokeStyle = 'rgba(165,135,100,.4)'; gA.lineWidth = b.w * 0.3; trace(gA); gA.stroke();
        }
        nidDecor(gH, gA, nestL, 0);
        if (SOC) nidDecor(gH, gA, nestA, 0);
        for (const p of pebbles) {
          const rot = rnd(TAU), hm = (p.r / PXMM) * 0.55;
          const forme = (g) => { g.save(); g.translate(p.x, p.y); g.rotate(rot); g.scale(1, 0.86); g.beginPath(); g.arc(0, 0, p.r, 0, TAU); };
          forme(gH); const gr = gH.createRadialGradient(0, 0, 0, 0, 0, p.r);
          [[0, 1], [0.55, 0.835], [0.8, 0.6], [0.92, 0.39], [1, 0.08]].forEach(([s, k]) => gr.addColorStop(s, hc(hm * k, 0.5, 0)));
          gH.fillStyle = gr; gH.fill(); gH.restore();
          forme(gA); gA.fillStyle = `hsl(${rnd(40, 20) | 0},${rnd(18, 6) | 0}%,${rnd(46, 30) | 0}%)`; gA.fill();
          for (let i = 0; i < p.r * 2; i++) { gA.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.14)'; gA.fillRect(rnd(p.r, -p.r) * 0.75, rnd(p.r, -p.r) * 0.75, 1.3, 1.3); }
          gA.restore();
        }
      }
      let u1 = null, u2 = null, grilleT = 0, chem0 = null;
      function grillesGL(chem) {
        if (!u1) { u1 = new Uint8Array(NG * 4); u2 = new Uint8Array(NG * 4); }
        const lF = colL.F, aF = colA.F, eF = colE.F;
        for (let i = 0; i < NG; i++) {
          const o = i * 4;
          u1[o] = 255 * tF(lF[i]);
          if (SOC) { u1[o + 1] = 255 * tA(aF[i]); u1[o + 2] = 255 * tE(eF[i]); }
          u1[o + 3] = Math.min(255, WEAR[i] * 255);
        }
        V.grille(1, GW, GH, u1);
        if (chem) {
          const lH = colL.Hm, aH = colA.Hm;
          for (let i = 0; i < NG; i++) { const o = i * 4; u2[o] = 255 * tH(lH[i]); u2[o + 1] = SOC ? 255 * tH(aH[i]) : 0; u2[o + 2] = 255 * tAl(ALARM[i]); }
          V.grille(2, GW, GH, u2);
        }
      }
      let feuillesT = 0, feuillesSig = -1;
      function feuillesGL() {
        const g = V.cF.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
        for (const lf of leaves) { g.globalAlpha = lf.fade; g.drawImage(lf.Lr.c, lf.x - lf.c, lf.y - lf.c); }
        g.globalAlpha = 1; V.feuilles();
      }
      // couleurs de la cuticule (sRGB) : brun-noir pour Lasius niger, roux pour Atta, brun-rouge pour Eciton
      const CUTI = { lasius: '#2a1c14', atta: SP.atta.col, eciton: '#4a230f' };
      const ALB = {}, LINC = new Map();
      const linc = (css) => { let c = LINC.get(css); if (!c) { c = V.lin(css); LINC.set(css, c); } return c; };
      if (V) for (const k of ESPECES) ALB[k] = V.lin(CUTI[k]);
      const CHARGE = { miette: 1, feuille: 2, proie: 3 };
      function instancesGL() {
        V.vider();
        for (const f of foods) V.inst(f.x, f.y, f.rot || 0, Math.max(2, f.r), 0, 0, 1, f.kind === 'sucre' ? 1 : 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, (f.rot || 0) * 7.1);
        for (const p of prey) {
          const h = p.hop > 0 ? Math.sin(Math.PI * (1 - p.hop / 0.28)) : 0, c = p.lin || (p.lin = linc(`hsl(${p.hue | 0},14%,62%)`));
          V.inst(p.x, p.y, p.a, p.L * (0.4 + 0.6 * p.fade), 0, 0, 1, 3, c[0], c[1], c[2], 0, 0, 0, 0, 0, 0, 0, (h * 14 * kS) / PXMM, p.hue);
        }
        for (const a of ALL) {
          if (a.st === 'nid') continue;
          const k = a.sp.key, c = ALB[k], ch = CHARGE[a.carry] || 0, lc = ch === 2 && a.leafCol ? linc(a.leafCol) : c;
          V.inst(a.x, a.y, a.a, a.L, a.g, a.wig, a.hk || 1, 0, c[0], c[1], c[2], ch, lc[0], lc[1], lc[2], a.leafRot || 0, ESPECES.indexOf(k), (a.rep ? 1 : 0) | (a.sold ? 2 : 0) | (a.hiker ? 4 : 0), 0, a.id);
        }
      }
      function renduGL(t, dt) {
        const chem = env.tool === 'chimie';
        if (decorSale) { V.cuire(peindreDecor, PXMM, (W * 0.37 + H * 0.11) % 53); decorSale = false; }
        if ((grilleT -= dt) <= 0 || chem !== chem0) { grilleT = 0.1; grillesGL(chem); chem0 = chem; }
        if (SOC) {
          let sig = leaves.length * 1000; for (const l of leaves) sig += l.fade;
          if (sig !== feuillesSig) { feuillesSig = sig; feuillesSale = true; }
          if (feuillesSale && (feuillesT -= dt) <= 0) { feuillesT = 0.15; feuillesSale = false; feuillesGL(); }
        }
        instancesGL();
        return V.image({ t, dt, mode: chem ? 2 : keep.style === 'neon' ? 1 : 0, piste: keep.trails, feuilles: SOC, grille: [GW * CS, GH * CS], doux: !!env.doux, pxmm: PXMM });
      }
      // le cartel : la fausse couleur est nommée à l'écran (DA) ; et l'échelle, pour voir que les fourmis mesurent 5 mm
      function degrade(g, x, w, nom) {
        const T = nom === 'mako' ? MAKO : ROCKET, gr = g.createLinearGradient(x, 0, x + w, 0);
        for (let i = 0; i <= 8; i++) { const j = Math.round((nom === 'mako' ? 0.3 + 0.65 * (i / 8) : 0.15 + 0.83 * (i / 8)) * 255) * 3; gr.addColorStop(i / 8, `rgb(${T[j]},${T[j + 1]},${T[j + 2]})`); }
        return gr;
      }
      function cartel() {
        const v = env.view || { x0: 0, x1: W }, chem = env.tool === 'chimie', montre = chem || keep.trails;
        const lignes = chem ? [['rocket', 'phéromone de piste'], ['mako', 'odeur du nid, alarme']] : montre ? [['rocket', 'concentration de phéromone']] : [];
        const bw = 220, x = v.x1 - 16 - bw - 12, h = 22 + lignes.length * 26 + 14;
        let y = H - 14 - h;
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        // l'échelle : une barre de 1, 2, 5 ou 10 cm
        const cm = [1, 2, 5, 10].find((c) => c * 10 * PXMM >= 46) || 10, lw = cm * 10 * PXMM, ex = v.x1 - 28 - lw, ey = (montre ? y : H - 14) - 12;
        ctx.strokeStyle = 'rgba(245,236,220,.85)'; ctx.lineWidth = 1.5; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.moveTo(ex, ey - 4); ctx.lineTo(ex, ey); ctx.lineTo(ex + lw, ey); ctx.lineTo(ex + lw, ey - 4); ctx.stroke();
        ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(245,236,220,.9)'; ctx.textAlign = 'right';
        ctx.fillText(`${cm} CM`, ex - 6, ey + 1);
        ctx.shadowBlur = 0; ctx.textAlign = 'left';
        if (montre) {
          ctx.fillStyle = 'rgba(14,10,6,.66)'; ctx.fillRect(x, y, bw + 12, h);
          ctx.fillStyle = 'rgba(245,232,210,.92)'; ctx.font = '500 10px "JetBrains Mono", monospace';
          ctx.fillText('COULEURS (FAUSSES) :', x + 6, y + 15);
          y += 22;
          for (const [nom, txt] of lignes) {
            ctx.fillStyle = degrade(ctx, x + 6, bw, nom); ctx.fillRect(x + 6, y, bw, 7);
            ctx.fillStyle = 'rgba(245,232,210,.88)'; ctx.font = '500 9.5px "JetBrains Mono", monospace';
            ctx.fillText(`${txt} · ${nom}`.toUpperCase(), x + 6, y + 19);
            y += 26;
          }
          ctx.fillStyle = 'rgba(245,232,210,.62)'; ctx.font = 'italic 500 10.5px "Space Grotesk", sans-serif';
          ctx.fillText('Une phéromone ne se voit pas : couche ajoutée.', x + 6, y + 6);
        }
        ctx.restore();
      }
      function drawFoods() {
        for (const f of foods) {
          const r = f.r;
          if (f.kind === 'sucre') {
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(f.x + r * 0.25, f.y + r * 0.35, r * 1.05, r * 0.9, 0, 0, TAU); ctx.fill();
            const g = ctx.createRadialGradient(f.x - r * 0.3, f.y - r * 0.35, r * 0.1, f.x, f.y, r);
            g.addColorStop(0, 'rgba(255,226,150,.95)'); g.addColorStop(0.5, 'rgba(232,150,40,.88)'); g.addColorStop(1, 'rgba(150,80,16,.92)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.88, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(f.x - r * 0.35, f.y - r * 0.38, r * 0.26, r * 0.14, -0.6, 0, TAU); ctx.fill();
          } else {
            const pt = (i, k) => { const an = f.rot + (i / 9) * TAU, rr = r * f.pts[i] * k; return [f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr]; };
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath();
            for (let i = 0; i < 9; i++) { const [x, y] = pt(i, 1); ctx.lineTo(x + r * 0.25, y + r * 0.35); }
            ctx.fill();
            const g = ctx.createRadialGradient(f.x - r * 0.3, f.y - r * 0.3, 0, f.x, f.y, r * 1.2);
            g.addColorStop(0, '#f3dfb2'); g.addColorStop(0.7, '#d9b47a'); g.addColorStop(1, '#a7773e');
            ctx.fillStyle = g; ctx.beginPath();
            for (let i = 0; i < 9; i++) { const [x, y] = pt(i, 1); ctx.lineTo(x, y); }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(120,80,40,.4)';
            for (const [px, py] of f.pores) { ctx.beginPath(); ctx.arc(f.x + px * r, f.y + py * r, r * 0.09, 0, TAU); ctx.fill(); }
          }
        }
      }
      function drawPrey() {
        for (const p of prey) {
          const h = p.hop > 0 ? Math.sin(Math.PI * (1 - p.hop / 0.28)) : 0, L = p.L;
          ctx.globalAlpha = p.fade;
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x + 2 + h * 6, p.y + 3 + h * 8, L * 0.5 * (1 - h * 0.3), L * 0.22, p.a, 0, TAU); ctx.fill();
          const y = p.y - h * 14 * kS, ca = Math.cos(p.a), sa = Math.sin(p.a), s = 1 + h * 0.2;
          ctx.fillStyle = `hsl(${p.hue | 0},14%,62%)`; ctx.beginPath(); ctx.ellipse(p.x, y, L * 0.5 * s, L * 0.21 * s, p.a, 0, TAU); ctx.fill();
          ctx.fillStyle = `hsl(${p.hue | 0},18%,74%)`; ctx.beginPath(); ctx.ellipse(p.x + ca * L * 0.45, y + sa * L * 0.45, L * 0.16 * s, L * 0.15 * s, p.a, 0, TAU); ctx.fill();
          ctx.strokeStyle = `hsla(${p.hue | 0},14%,70%,.8)`; ctx.lineWidth = 0.7; ctx.beginPath();
          for (let k = -1; k <= 1; k += 2) { ctx.moveTo(p.x + ca * L * 0.55, y + sa * L * 0.55); ctx.lineTo(p.x + Math.cos(p.a + k * 0.5) * L * 0.95, y + Math.sin(p.a + k * 0.5) * L * 0.95); }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      const ROLES = { ouvrière: 'ouvrière', soldat: 'soldat', minime: 'minime' };
      function drawLabel(a) {
        const al = Math.min(1, a.label, (6 - a.label) * 2.5);
        if (al <= 0.01) return;
        const side = a.x > W * 0.68 ? -1 : 1, lx = a.x + side * (a.L * 1.4 + 26), ly = a.y - a.L - 22;
        let role = ROLES[a.role];
        if (a.finder) role += ` · a découvert le sucre n° ${a.finder}`;
        if (a.rep) role += ' · gorgée de sucre';
        else if (a.carry === 'feuille') role += ' · porte une feuille';
        else if (a.carry) role += ' · rapporte une proie';
        else if (a.sp === SP.eciton) role += ' · en raid';
        ctx.save();
        ctx.strokeStyle = `rgba(255,240,215,${(al * 0.7).toFixed(3)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.L * 0.95 + 4, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x + side * (a.L * 0.95 + 4) * 0.7, a.y - (a.L * 0.95 + 4) * 0.7); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
        ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 5;
        ctx.textAlign = side > 0 ? 'left' : 'right';
        ctx.fillStyle = `rgba(255,246,230,${(al * 0.95).toFixed(3)})`;
        ctx.font = 'italic 500 14px "Space Grotesk", sans-serif';
        ctx.fillText(a.sp.nom, lx, ly);
        ctx.fillStyle = `rgba(232,205,160,${(al * 0.9).toFixed(3)})`;
        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillText(`${a.sp.fr} · ${role}`.toUpperCase(), lx, ly + 15);
        ctx.restore();
      }

      function hud() {
        const v = env.view || { x0: 0, x1: W }, x0 = v.x0 + 16;
        ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.textBaseline = 'alphabetic';
        const line = (txt, y, strong) => { const w = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(14,10,6,.62)'; ctx.fillRect(x0 - 6, y - 13, w + 12, 18); ctx.fillStyle = strong ? 'rgba(255,214,140,.95)' : 'rgba(245,232,210,.88)'; ctx.fillText(txt, x0, y); };
        const mm = (t) => (t >= 60 ? Math.floor(t / 60) + ' min ' + String(Math.floor(t % 60)).padStart(2, '0') + ' s' : fr(t) + ' s');
        if (DEC) {
          let out = 0; for (const a of colL.ants) if (a.st !== 'nid') out++;
          let y = H - 18 - 20 * (foods.filter((f) => f.id).length + Math.min(3, spent.length));
          line(`${mm(T)} · ${out} FOURMIS DEHORS SUR ${colL.ants.length} · ${trips} ALLERS-RETOURS CHARGÉS`.toUpperCase(), y, true); y += 20;
          for (const f of foods) {
            if (!f.id) continue;
            let n = 0; for (const a of colL.ants) if (a.st !== 'nid' && a.src === f.id) n++;
            line(f.found == null ? `SUCRE N° ${f.id} · PAS ENCORE TROUVÉ (${mm(T - f.t0)})` : `SUCRE N° ${f.id} · TROUVÉ EN ${mm(f.found - f.t0)} · ${n} FOURMIS L’EXPLOITENT · RESTE ${Math.round((100 * f.amt) / f.amt0)} %`, y); y += 20;
          }
          for (const e of spent.slice(-3)) { line(`SUCRE N° ${e.id} · ÉPUISÉ ${mm(T - e.end)} PLUS TÔT`, y); y += 20; }
        } else if (PONT) {
          const B = bridgeShapes(), lu = bezLen(B.up), ld = bezLen(B.dn);
          // moyenne des dix dernières secondes
          let su = 0, sd = 0; for (const [t, u, d] of brHist) if (T - t < 10) { su += u; sd += d; }
          const tot = su + sd, pu = tot ? su / tot : 0.5;
          const bw = Math.min(460, (v.x1 - v.x0) * 0.6), bx = v.x0 + (v.x1 - v.x0) / 2 - bw / 2, by = ((env.view && env.view.y0) || 0) + 70;
          ctx.fillStyle = 'rgba(14,10,6,.62)'; ctx.fillRect(bx - 10, by - 18, bw + 20, 62);
          ctx.fillStyle = 'rgba(255,200,110,.9)'; ctx.fillRect(bx, by, bw * pu, 12);
          ctx.fillStyle = 'rgba(140,180,255,.85)'; ctx.fillRect(bx + bw * pu, by, bw * (1 - pu), 12);
          ctx.fillStyle = 'rgba(245,232,210,.9)';
          const nu = lateOn ? (keep.bridge === 'egal' ? 'HAUT' : 'COURTE (HAUT)') : 'COURTE : PAS ENCORE LÀ';
          ctx.fillText(`${nu} ${tot ? Math.round(pu * 100) + ' %' : '—'}`, bx, by - 5);
          ctx.textAlign = 'right'; ctx.fillText(`${tot ? Math.round((1 - pu) * 100) + ' %' : '—'} ${keep.bridge === 'egal' ? 'BAS' : 'LONGUE (BAS)'}`, bx + bw, by - 5); ctx.textAlign = 'left';
          // l'histoire : la part de la branche du haut, seconde après seconde
          ctx.strokeStyle = 'rgba(255,200,110,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); let k = 0;
          const H0 = brHist.filter(([t]) => T - t < 240);
          for (let i = 0; i < H0.length; i++) { const [t, u, d] = H0[i]; if (u + d < 3) continue; const xx = bx + bw * ((t - (T - 240)) / 240), yy = by + 38 - (u / (u + d)) * 20; k++ ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.stroke();
          ctx.fillStyle = 'rgba(245,232,210,.6)'; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText('4 DERNIÈRES MINUTES', bx, by + 40);
          line(`${mm(T)} · LONGUEURS : HAUT ${fr(lu / (SP.lasius.L * kS))} FOURMIS, BAS ${fr(ld / (SP.lasius.L * kS))} FOURMIS · ${trips} ALLERS-RETOURS`, H - 18);
        }
        if (toastM && T - toastM.t < 6) {
          const a = Math.min(1, (6 - (T - toastM.t)) * 1.2), cx = (v.x0 + v.x1) / 2;
          ctx.globalAlpha = a; ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; const w = ctx.measureText(toastM.m).width;
          ctx.fillStyle = 'rgba(14,10,6,.7)'; ctx.fillRect(cx - w / 2 - 12, ((env.view && env.view.y0) || 0) + (PONT ? 128 : 54), w + 24, 28);
          ctx.fillStyle = '#fff3e0'; ctx.textAlign = 'center'; ctx.fillText(toastM.m, cx, ((env.view && env.view.y0) || 0) + (PONT ? 147 : 73)); ctx.globalAlpha = 1;
        }
        ctx.restore();
      }

      function wipe(x, y) {
        const r = 18 * kS, R = Math.ceil(r / CS), cx = Math.floor(x / CS), cy = Math.floor(y / CS);
        for (let gy = cy - R; gy <= cy + R; gy++) for (let gx = cx - R; gx <= cx + R; gx++) {
          if (gx < 0 || gy < 0 || gx >= GW || gy >= GH || (gx - cx) ** 2 + (gy - cy) ** 2 > R * R) continue;
          const i = gy * GW + gx;
          colL.F[i] = colL.Hm[i] = colA.F[i] = colA.Hm[i] = colE.F[i] = 0;
        }
      }

      // pré-roulage : les colonies ont déjà tracé leurs pistes
      if (SOC) for (let s = 0; s < 330; s++) step(1 / 15, s / 15);
      T = 0;
      wearPaint();
      quiet = false;
      raid.next = SOC ? 9 : 1e9;
      if (DEC) toast('Les éclaireuses sortent. Aucune ne sait où est le sucre.');
      if (PONT) toast(keep.bridge === 'egal' ? 'Deux branches égales : laquelle la colonie choisira-t-elle ?' : 'Une branche courte, une longue. Aucune fourmi ne peut les comparer.');
      const drones = [];
      if (au) drones.push(au.drone(73.4, 'sine', 0.018), au.drone(110, 'triangle', 0.005));

      return {
        frame(t, dt) {
          const n = Math.max(1, Math.ceil(dt / 0.05)), h = dt / n;
          for (let i = 0; i < n; i++) step(h, t - dt + h * (i + 1));
          if (V && renduGL(t, dt)) {
            for (const a of ALL) if (a.label > 0 && a.st !== 'nid') drawLabel(a);
            cartel(); hud();
            return;
          }
          // repli 2D (sans WebGL2) : le décor peint, la piste translucide en fausse couleur (rocket)
          const chem = env.tool === 'chimie';
          ctx.globalCompositeOperation = 'source-over';
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(fond2D().c, 0, 0, W, H);
          if ((wearT -= dt) <= 0) { wearT = 0.5; wearPaint(); }
          ctx.drawImage(wearB.c, 0, 0, GW * CS, GH * CS);
          for (const lf of leaves) { ctx.globalAlpha = lf.fade; ctx.drawImage(lf.Lr.c, lf.x - lf.c, lf.y - lf.c); }
          ctx.globalAlpha = 1;
          if (keep.trails && !chem) {
            if ((trailT -= dt) <= 0) { trailT = 0.15; trailPaint(); }
            ctx.drawImage(trailB.c, 0, 0, GW * CS, GH * CS);
          }
          drawFoods();
          if (chem) {
            ctx.fillStyle = 'rgba(4,3,10,.78)'; ctx.fillRect(0, 0, W, H);
            chemPaint();
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(chemB.c, 0, 0, GW * CS, GH * CS);
            ctx.globalCompositeOperation = 'source-over';
          }
          drawPrey();
          const LA = [], AA = [], EA = [];
          for (const a of colL.ants) if (a.st !== 'nid') LA.push(a);
          for (const a of colA.ants) if (a.st !== 'nid') AA.push(a);
          for (const a of colE.ants) if (a.st !== 'nid') EA.push(a);
          A.drawGroup(ctx, LA, SP.lasius, t, SP.lasius.L * kS);
          A.drawGroup(ctx, EA, SP.eciton, t, SP.eciton.L * kS);
          A.drawGroup(ctx, AA, SP.atta, t, SP.atta.L * kS);
          A.drawCarry(ctx, LA); A.drawCarry(ctx, EA); A.drawCarry(ctx, AA);
          for (const a of ALL) if (a.label > 0 && a.st !== 'nid') drawLabel(a);
          cartel(); hud();
        },
        _step(dt) { step(dt, T); },
        _stats() { let out = 0; for (const a of colL.ants) if (a.st !== 'nid') out++; const b = brHist.slice(-20).reduce((s, [, u, d]) => [s[0] + u, s[1] + d], [0, 0]); return { T: Math.round(T), out, trips, foods: foods.map((f) => [f.id, f.found && Math.round(f.found - f.t0), Math.round(f.amt)]), spent: spent.length, br: b }; },
        sugar() { const v = env.view || { x0: 0, x1: W }; for (let k = 0; k < 30; k++) { const x = rnd(v.x1 - 70, v.x0 + 70), y = rnd(H - 60, 80); if (Math.hypot(x - nestL.x, y - nestL.y) < nestL.r * 3 || pebbles.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + 40)) continue; addSugar(x, y, rnd(200, 120)); break; } },
        wipeAll() { for (const g of [colL.F, colL.Hm]) g.fill(0); toast('Toutes les pistes effacées : il faut tout réapprendre.'); },
        down(p) {
          const tool = env.tool;
          this._wipe = false;
          if (tool === 'nourriture') {
            if (foods.length >= Math.max(14, NF0 + 6)) foods.shift();
            foods.push(mkFood(p.x, p.y, Math.random() < 0.45 ? 'sucre' : 'miette'));
            if (snd()) au.pluck(scale(rint(5) + 5, 220), 0.6, 0.04);
            return;
          }
          if (tool === 'feuille') {
            if (leaves.length >= Math.max(7, NL0 + 4)) leaves[0].dying = true;
            leaves.push(mkLeaf(p.x, p.y, Math.random() < 0.3 ? 'fleur' : 'feuille'));
            if (snd()) au.noise(0.25, 0.04, 1800, 0.7, 'bandpass', 600);
            return;
          }
          let best = null, bd = 1e9;
          for (const a of ALL) {
            if (a.st === 'nid') continue;
            const d = Math.hypot(a.x - p.x, a.y - p.y);
            if (d < Math.max(18, a.L * 1.7) && d < bd) { bd = d; best = a; }
          }
          if (best) {
            for (const a of ALL) a.label = 0;
            best.label = 6; best.alarm = 1; best.pause = 0.4;
            for (let k = 0; k < 4; k++) dep(ALARM, best.x + rnd(8, -8), best.y + rnd(8, -8), 6, 20);
            alarmT = 4;
            if (navigator.vibrate) navigator.vibrate(8);
            if (snd()) au.note(best.sp === SP.eciton ? 520 : best.sp === SP.atta ? 392 : 660, 0.25, 'triangle', 0.04);
            return;
          }
          this._wipe = true; finger.on = true; finger.x = p.x; finger.y = p.y;
          wipe(p.x, p.y);
        },
        move(p) {
          if (!p.down || !this._wipe) return;
          finger.x = p.x; finger.y = p.y;
          wipe(p.x, p.y);
          if (snd() && Math.random() < 0.08) au.noise(0.12, 0.012, 1200, 0.6, 'bandpass');
        },
        up() { finger.on = false; this._wipe = false; },
        dispose() { drones.forEach((d) => d.stop()); },
      };
    }
  }
})();
