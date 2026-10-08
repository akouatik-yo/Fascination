/* Fascination — Les Bulles · interférences en film mince, drainage, film noir, caténoïde (WebGL2)
   La couleur d'un film de savon est calculée longueur d'onde par longueur d'onde : réflexion sur les deux faces
   d'une lame d'eau d'indice 1,33 et d'épaisseur d, déphasage 4π n d cos θt / λ (+ π à la première réflexion),
   puis intégration sur le spectre visible avec les fonctions colorimétriques CIE 1931 (approximation de Wyman).
   Le film s'amincit en haut (drainage par gravité), se tord en tourbillons (Marangoni), devient noir sous ~30 nm
   et éclate. Caténoïde : surface minimale entre deux anneaux, r(z) = a ch(z/a) ; au-delà de h/R ≈ 0,663
   (Goldschmidt, 1831), il n'existe plus de solution et le film se coupe en deux disques. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const MAXB = 12;

  const FILM = `
// fonctions colorimétriques CIE 1931 (approximation multi-lobes de Wyman, Sloan et Shirley, 2013)
vec3 cie(float l){
  float t1 = (l - 442.) * (l < 442. ? .0624 : .0374), t2 = (l - 599.8) * (l < 599.8 ? .0264 : .0323), t3 = (l - 501.1) * (l < 501.1 ? .049 : .0382);
  float x = .362 * exp(-.5 * t1 * t1) + 1.056 * exp(-.5 * t2 * t2) - .065 * exp(-.5 * t3 * t3);
  float u1 = (l - 568.8) * (l < 568.8 ? .0213 : .0247), u2 = (l - 530.9) * (l < 530.9 ? .0613 : .0322);
  float y = .821 * exp(-.5 * u1 * u1) + .286 * exp(-.5 * u2 * u2);
  float v1 = (l - 437.) * (l < 437. ? .0845 : .0278), v2 = (l - 459.) * (l < 459. ? .0385 : .0725);
  float z = 1.217 * exp(-.5 * v1 * v1) + .681 * exp(-.5 * v2 * v2);
  return vec3(x, y, z);
}
// réflectance d'une lame de savon d'épaisseur d (nm), vue sous un angle de cosinus ci, intégrée sur le spectre
vec3 film(float d, float ci){
  float n = 1.33, st2 = (1. - ci * ci) / (n * n), ct = sqrt(max(0., 1. - st2));
  float r = mix(.14, .5, pow(1. - ci, 5.));       // Fresnel, à peu près
  float r2 = r * r;
  vec3 xyz = vec3(0.);
  for (int i = 0; i < 16; i++){
    float l = 400. + float(i) * 20.;
    float delta = 12.566 * n * d * ct / l;          // 4π n d cos θt / λ ; le +π de la première réflexion donne le « 1 − cos »
    float R = 2. * r2 * (1. - cos(delta)) / (1. + r2 * r2 - 2. * r2 * cos(delta));
    xyz += cie(l) * R;
  }
  xyz *= 20. / 10.6;
  vec3 rgb = mat3(3.2406, -.9689, .0557, -1.5372, 1.8758, -.204, -.4986, .0415, 1.057) * xyz;
  rgb = max(rgb, 0.) / (4. * .0196 * 1.05);        // 1 = réflectance maximale (lame quart d'onde)
  float lu = dot(rgb, vec3(.2126, .7152, .0722));
  return mix(vec3(lu), rgb, .8);
}`;
  const ENV = `
uniform float uDecor, uInk, uT;
// ce qui se reflète : une fenêtre lumineuse, le ciel, un jardin flou ou une pièce sombre
vec3 env(vec3 d){
  if (uDecor < .5) return uInk > .5 ? vec3(.55) : vec3(.9);
  vec3 c = mix(vec3(.03, .05, .04), vec3(.25, .32, .4), smoothstep(-.2, .6, d.y));
  vec2 w = vec2(d.x, d.y) / max(.2, -d.z + 1.2);
  c += vec3(1.6, 1.55, 1.45) * smoothstep(.06, .0, max(abs(w.x + .25) - .16, abs(w.y - .25) - .2)) * step(.0, -d.z + .3);
  c += vec3(.9, .7, .45) * pow(max(dot(d, normalize(vec3(.7, .5, .3))), 0.), 40.) * 2.;
  return c;
}`;
  // bulles en vue de face : sphères analytiques, deux faces, film, reflets
  const FS_BUB = HEAD + FILM + ENV + `
uniform vec2 uRes; uniform int uN; uniform vec4 uB[${MAXB}]; uniform vec4 uB2[${MAXB}]; uniform vec4 uB3[${MAXB}];
out vec4 o;
vec3 bg(vec2 uv){
  if (uDecor < .5) return uInk > .5 ? vec3(.953, .933, .89) : vec3(0.);
  vec3 c = mix(vec3(.05, .07, .06), vec3(.015, .02, .03), uv.y);
  for (int i = 0; i < 7; i++){ float fi = float(i); vec2 p = vec2(fract(sin(fi * 12.9) * 437.) * uRes.x / uRes.y, .2 + .6 * fract(sin(fi * 7.3) * 91.)); float r = .06 + .08 * fract(sin(fi * 3.1) * 51.); c += mix(vec3(.25, .35, .12), vec3(.5, .45, .2), fract(fi * .37)) * .18 * smoothstep(r, r * .6, length(vec2(uv.x * uRes.x / uRes.y, uv.y) - p)); }
  return c;
}
float wnoise(vec3 p){ return fbm(p.xy * 1.7 + p.z * 1.3) * 2. - 1.; }
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec3 col = bg(vec2(vUv.x, 1. - vUv.y));
  for (int i = 0; i < ${MAXB}; i++){
    if (i >= uN) break;
    vec4 b = uB[i], b2 = uB2[i], b3 = uB3[i];       // b : x, y, rayon, épaisseur moyenne (nm) · b2 : phase, âge, éclatement, graine · b3 : point d'éclatement
    vec2 q = (px - b.xy) / b.z;
    float rr = dot(q, q);
    if (rr > 1.) continue;
    // trou d'éclatement qui s'agrandit
    if (b2.z > 0. && length(q - b3.xy) < b2.z * 2.2) continue;
    float nz = sqrt(1. - rr);
    vec3 n = vec3(q.x, -q.y, nz);
    // épaisseur : plus mince en haut (drainage), tourbillons de Marangoni qui tournent sur la bulle
    float top = .5 - .5 * n.y;
    float ca = cos(b2.x * .3), sa = sin(b2.x * .3);
    vec3 m = vec3(ca * n.x - sa * n.z, n.y, sa * n.x + ca * n.z);
    float sw = wnoise(m * 2.2 + vec3(b2.w, b2.x * .05, 0.)) + .5 * wnoise(m * 5. - vec3(0., b2.x * .08, b2.w));
    float d = b.w * (.25 + 1.15 * pow(top, 1.3)) * (1. + .32 * sw);
    d = max(d, 0.);
    float ci = nz;
    vec3 fr = film(d, ci), fb = film(d, max(.05, ci));
    vec3 v = vec3(0., 0., -1.);
    vec3 rf = reflect(v, n), rb = reflect(v, vec3(-n.xy, n.z));
    vec3 c = (env(rf) * fr + env(rb * vec3(1., 1., -1.)) * fb * .5) * .42;
    // la bulle est presque transparente : on voit le fond au travers
    float tr = 1. - .08 * (1. - nz);
    col = col * tr + c;
    col += vec3(1.) * pow(max(dot(rf, normalize(vec3(-.35, .4, .85))), 0.), 300.) * 1.2 * smoothstep(5., 25., d);
  }
  col = 1. - exp(-col * 1.1);
  if (uInk > .5 && uDecor < .5) col = mix(vec3(.953, .933, .89), col * .8, .9);
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;
  // film vertical dans un cadre : épaisseur en coin qui s'amincit, tourbillons, film noir en haut
  const FS_FRAME = HEAD + FILM + ENV + `
uniform vec2 uRes; uniform vec4 uBox; uniform float uAge, uSwirl; uniform int uNV; uniform vec4 uV[8];
out vec4 o;
void main(){
  vec2 px = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 p = (px - uBox.xy) / uBox.zw;                    // 0..1 dans le cadre (y vers le bas)
  vec3 col = uDecor > .5 ? mix(vec3(.04, .045, .05), vec3(.01), vUv.y) : (uInk > .5 ? vec3(.953, .933, .89) : vec3(0.));
  if (p.x > 0. && p.x < 1. && p.y > 0. && p.y < 1.){
    // déformation par des tourbillons qui dérivent (Marangoni, convection de l'air)
    vec2 w = p;
    for (int k = 0; k < 3; k++){ float s = float(k); w += uSwirl * .045 * vec2(fbm(w * 3. + vec2(uT * .05, s * 7.)) - .5, fbm(w * 3. + vec2(s * 3., uT * .04)) - .5) * (1. + s); }
    for (int i = 0; i < 8; i++){ if (i >= uNV) break; vec4 v = uV[i]; vec2 d = w - v.xy; float r2 = dot(d, d); float a = v.z * exp(-r2 / .012); w = v.xy + mat2(cos(a), -sin(a), sin(a), cos(a)) * d; }
    // épaisseur : quelques nm en haut, plus d'un micron en bas ; tout s'amincit avec le temps
    float d = 1600. * pow(clamp(w.y, 0., 1.), 1.15) / (1. + uAge * .08) + 40. * (fbm(w * 9. + uT * .02) - .5);
    d = max(0., d - 22. * smoothstep(.0, 1., uAge / 25.));
    vec3 n = vec3(0., 0., 1.);
    vec3 c = film(d, .97) * (env(vec3(.05, .1, 1.)) * .45 + .12);
    col = col * .35 + c;
  }
  col = 1. - exp(-col * 1.2);
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;
  // caténoïde entre deux anneaux (ou deux disques après la rupture)
  const FS_CAT = HEAD + FILM + ENV + `
uniform vec2 uRes, uC; uniform float uA, uH, uS, uBroke, uNeck, uYaw, uPitch;
out vec4 o;
float F(vec3 p){ return length(p.xy) - (uBroke > .5 ? 0. : uA * cosh(p.z / uA) * uNeck + (1. - uNeck) * 0.); }
vec3 shadeHit(vec3 p, vec3 rd, vec3 n){
  float ci = abs(dot(n, rd));
  float d = 350. * (.3 + .9 * (.5 + .5 * p.z / uH)) * (1. + .25 * (fbm(vec2(atan(p.y, p.x) * 2., p.z * 3.) + uT * .05) - .5));
  return env(reflect(rd, n)) * film(d, ci) * .5 + film(d, ci) * .06;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - uC) / uS;
  float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sp = sin(uPitch);
  vec3 ro = vec3(cy * cp, sy * cp, sp) * 3.3;
  vec3 fw = normalize(-ro), rt = normalize(cross(fw, vec3(0., 0., 1.))), up = cross(rt, fw);
  vec3 rd = normalize(fw + uv.x * rt + uv.y * up);
  vec3 col = uDecor > .5 ? mix(vec3(.02, .025, .03), vec3(.06, .07, .08), gl_FragCoord.y / uRes.y) : (uInk > .5 ? vec3(.953, .933, .89) : vec3(0.));
  vec3 acc = vec3(0.);
  // tout tient dans un cylindre de rayon 1,05 et de demi-hauteur uH + 0,05 : on ne cherche que là
  float qa = dot(rd.xy, rd.xy), qb = 2. * dot(ro.xy, rd.xy), qc = dot(ro.xy, ro.xy) - 1.1025, qd = qb * qb - 4. * qa * qc;
  if (qd < 0.){ col = 1. - exp(-col * 1.15); o = vec4(pow(col, vec3(1. / 2.2)), 1.); return; }
  float c0 = (-qb - sqrt(qd)) / (2. * qa), c1 = (-qb + sqrt(qd)) / (2. * qa);
  float z0 = (-(uH + .05) - ro.z) / rd.z, z1 = ((uH + .05) - ro.z) / rd.z;
  float tA = max(max(c0, min(z0, z1)), 0.), tB = min(c1, max(z0, z1));
  if (uBroke < .5 && tB > tA){
    // on avance le long du rayon et on repère les changements de signe de F (au plus deux surfaces visibles)
    float t = tA, prev = F(ro + rd * t); int hits = 0;
    for (int i = 0; i < 160; i++){
      if (t > tB) break;
      float tn = t + .035; vec3 p = ro + rd * tn; float f = F(p);
      if (abs(p.z) < uH && sign(f) != sign(prev)){
        float a = t, b = tn; for (int k = 0; k < 8; k++){ float m = .5 * (a + b); if (sign(F(ro + rd * m)) == sign(prev)) a = m; else b = m; }
        vec3 h = ro + rd * (.5 * (a + b));
        float rr = length(h.xy), sh = sinh(h.z / uA) * uNeck;
        vec3 n = normalize(vec3(h.xy / rr, -sh));
        acc += shadeHit(h, rd, n) * (hits == 0 ? 1. : .6);
        hits++; if (hits == 2) break;
      }
      prev = f; t = tn;
    }
  } else if (uBroke > .5) {
    // deux disques plats sur les anneaux
    for (int s = 0; s < 2; s++){ float zz = s == 0 ? uH : -uH; float t = (zz - ro.z) / rd.z; if (t > 0.){ vec3 h = ro + rd * t; if (length(h.xy) < 1.){ float d = 500. * (1. - .6 * length(h.xy)); acc += env(reflect(rd, vec3(0., 0., 1.))) * film(d + 40. * fbm(h.xy * 4. + uT * .04), abs(rd.z)) * .4; } } }
  }
  col += acc;
  // les anneaux de laiton
  for (int s = 0; s < 2; s++){
    float zz = s == 0 ? uH : -uH;
    float tb = 1e9; vec3 best;
    float t = max(c0 - .05, 0.); for (int i = 0; i < 90; i++){ vec3 p = ro + rd * t; float dd = length(vec2(length(p.xy) - 1., p.z - zz)) - .03; if (dd < .002){ tb = t; best = p; break; } t += max(dd, .004); if (t > c1 + .05) break; }
    if (tb < 1e8 && uDecor > .5) col = vec3(.75, .58, .3) * (.4 + .6 * clamp(best.z - zz + .5, 0., 1.));
    else if (tb < 1e8) col = uInk > .5 ? vec3(.2, .15, .1) : vec3(.6);
  }
  col = 1. - exp(-col * 1.15);
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;

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
        return { frame() { env.ctx.fillStyle = '#05070a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Les Bulles demandent WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeBub(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const cfg = { scene: 'bulles', life: 1, wind: 0.5, auto: true, swirl: 1, sep: 0.45, sepAuto: true, yaw: 0.5, pitch: 0.25, q: 'haute' };
    let T = 0, label = null;
    const s0 = Math.min(dpr, 1.25), K = GLKit(Math.round(W * s0), Math.round(H * s0));
    const P = { bub: K.program(FS_BUB), frame: K.program(FS_FRAME), cat: K.program(FS_CAT) };

    /* ───────── les bulles ───────── */
    let B = [], drops = [];
    function addBubble(x, y, r) {
      if (B.length >= MAXB) return;
      const m = Math.min(view().w, H);
      B.push({ x, y, r: r || m * rnd(0.16, 0.06), vx: rnd(10, -10), vy: rnd(-5, -20), d0: rnd(1100, 700), age: 0, life: rnd(26, 12) * cfg.life, ph: rnd(TAU), seed: rnd(50), pop: 0, px: 0, py: 0, grow: 0 });
    }
    function pop(b, x, y) {
      if (b.pop) return;
      b.pop = 0.001; b.px = clamp((x - b.x) / b.r, -0.9, 0.9); b.py = clamp((y - b.y) / b.r, -0.9, 0.9);
      // gouttelettes projetées par le bord qui se rétracte
      for (let i = 0; i < 18; i++) { const a = rnd(TAU); drops.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * rnd(260, 80), vy: Math.sin(a) * rnd(260, 80), life: rnd(0.5, 0.2) }); }
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
    function render() {
      const cw = K.canvas.width, ch = K.canvas.height, s = s0;
      const bare = env.decor === false, ink = bare && env.theme === 'light', v = view();
      if (cfg.scene === 'bulles') {
        const A = new Float32Array(MAXB * 4), A2 = new Float32Array(MAXB * 4), A3 = new Float32Array(MAXB * 4);
        B.forEach((b, i) => { A.set([b.x * s, b.y * s, b.r * s, thick(b)], i * 4); A2.set([b.ph, b.age, b.pop, b.seed], i * 4); A3.set([b.px, b.py, 0, 0], i * 4); });
        P.bub.use().f('uRes', cw, ch).i('uN', B.length).v4('uB', A).v4('uB2', A2).v4('uB3', A3).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uT', T);
        K.run(P.bub, null);
      } else if (cfg.scene === 'cadre') {
        const fw = Math.min(v.w * 0.62, H * 0.62), fh = Math.min(H * 0.78, fw * 1.25);
        const VV = new Float32Array(32); vort.slice(0, 8).forEach((q, i) => VV.set([q.x, q.y, q.s, 0], i * 4));
        P.frame.use().f('uRes', cw, ch).f('uBox', (v.cx - fw / 2) * s, (H / 2 - fh / 2) * s, fw * s, fh * s).f('uAge', filmAge).f('uSwirl', cfg.swirl).i('uNV', Math.min(8, vort.length)).v4('uV', VV).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uT', T);
        K.run(P.frame, null);
      } else {
        const neck = cat.broke ? 0 : 1;
        P.cat.use().f('uRes', cw, ch).f('uC', v.cx * s, (H / 2) * s).f('uS', Math.min(v.w, H) * 0.8 * s).f('uA', cat.a).f('uH', cfg.sep).f('uBroke', cat.broke ? 1 : 0).f('uNeck', neck).f('uYaw', cfg.yaw).f('uPitch', cfg.pitch).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uT', T);
        K.run(P.cat, null);
      }
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      if (cfg.scene === 'bulles') { ctx.save(); ctx.fillStyle = ink ? 'rgba(40,40,80,.5)' : 'rgba(220,235,255,.7)'; for (const d of drops) { ctx.globalAlpha = clamp(d.life * 3, 0, 1); ctx.fillRect(d.x, d.y, 1.6, 1.6); } ctx.restore(); }
      if (cfg.scene === 'cadre' && !bare) {
        const fw = Math.min(v.w * 0.62, H * 0.62), fh = Math.min(H * 0.78, fw * 1.25);
        ctx.save(); ctx.strokeStyle = '#8a8f9a'; ctx.lineWidth = 5; ctx.strokeRect(v.cx - fw / 2 - 3, H / 2 - fh / 2 - 3, fw + 6, fh + 6); ctx.fillStyle = '#6a6f7a'; ctx.fillRect(v.cx - 4, H / 2 + fh / 2 + 3, 8, H * 0.2); ctx.restore();
      }
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
      if (dt > 0) update(dt);
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
          const v = view(), fw = Math.min(v.w * 0.62, H * 0.62), fh = Math.min(H * 0.78, fw * 1.25);
          if (Math.random() < 0.3) vort.push({ x: (p.x - (v.cx - fw / 2)) / fw, y: (p.y - (H / 2 - fh / 2)) / fh, s: clamp(p.dx * 0.05, -2, 2) });
        }
        if (cfg.scene === 'cate' && tool === 'ecarter') { cfg.sepAuto = false; cfg.sep = clamp(cfg.sep + p.dy * 0.003, 0.1, 0.9); cfg.yaw -= p.dx * 0.006; }
      },
      up() { last = null; },
      clear() { if (cfg.scene === 'bulles') { B.forEach((b) => pop(b, b.x, b.y)); } else if (cfg.scene === 'cadre') filmAge = 0; else { cfg.sep = 0.4; cat.broke = false; } },
      dispose() { K.lose(); },
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
