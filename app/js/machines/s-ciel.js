/* Fascinations — Les Couleurs du ciel · deuxième machine surprise
   Trois scènes d'optique atmosphérique, calculées et non peintes :
   le ciel (diffusion simple de Rayleigh et de Mie, ozone, ombre de la planète ; WebGL2),
   l'arc-en-ciel (une goutte tracée rayon par rayon ; le ciel par la théorie d'Airy),
   les halos (rayons lancés au hasard à travers des prismes de glace hexagonaux). */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, layer } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const fr = (x, d = 0) => x.toFixed(d).replace('.', ',').replace('-', '−');

  // réglages gardés d'une scène à l'autre
  const keep = {
    scene: 'ciel', el: 6, anim: true,
    look: 'soleil', planet: 'terre', haze: 1, ozone: true, alt: 0,
    view: 'ciel', drop: 0.35, refl: 1, rbEl: 12,
    hEl: 18, mix: { plaques: 0.5, colonnes: 0.25, desordre: 0.5 }, proj: 'soleil', guides: true,
  };

  /* ─ couleur : fonctions colorimétriques CIE 1931 (ajustement de Wyman, Sloan et Shirley, 2013) ─ */
  const g3 = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
  const cmf = (l) => [1.056 * g3(l, 599.8, 37.9, 31.0) + 0.362 * g3(l, 442.0, 16.0, 26.7) - 0.065 * g3(l, 501.1, 20.4, 26.2),
    0.821 * g3(l, 568.8, 46.9, 40.5) + 0.286 * g3(l, 530.9, 16.3, 31.1),
    1.217 * g3(l, 437.0, 11.8, 36.0) + 0.681 * g3(l, 459.0, 26.0, 13.8)];
  const planck = (l) => { const x = l * 1e-9; return 1 / (Math.pow(x, 5) * (Math.exp(1.4388e-2 / (x * 5778)) - 1)); };
  const P0 = planck(560);
  const xyz2rgb = (X, Y, Z) => [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
  const srgb = (v) => { v = clamp(v, 0, 1); return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };

  /* ─ fonction d'Airy Ai(x) : série au centre, développements asymptotiques ailleurs ─ */
  function airy(x) {
    if (x > 5) { const z = (2 / 3) * Math.pow(x, 1.5); return Math.exp(-z) / (2 * Math.sqrt(Math.PI) * Math.pow(x, 0.25)); }
    if (x < -7) { const a = -x, z = (2 / 3) * Math.pow(a, 1.5); return (Math.sin(z + Math.PI / 4) - Math.cos(z + Math.PI / 4) * (5 / (72 * z))) / (Math.sqrt(Math.PI) * Math.pow(a, 0.25)); }
    let f = 1, g = x, tf = 1, tg = x; const x3 = x * x * x;
    for (let k = 1; k < 80; k++) { tf *= x3 / ((3 * k - 1) * 3 * k); tg *= x3 / (3 * k * (3 * k + 1)); f += tf; g += tg; if (Math.abs(tf) + Math.abs(tg) < 1e-17) break; }
    return 0.355028053887817 * f - 0.258819403792807 * g;
  }
  // table de Ai(x) de −260 à 8 : le profil se recalcule vite quand on change la taille des gouttes
  const AX0 = -260, AX1 = 8, ADX = 0.005, ATAB = new Float32Array(Math.round((AX1 - AX0) / ADX) + 2);
  for (let i = 0; i < ATAB.length; i++) ATAB[i] = airy(AX0 + i * ADX);
  const airyT = (x) => { if (x <= AX0) return airy(x); if (x >= AX1) return 0; const f = (x - AX0) / ADX, i = Math.floor(f), u = f - i; return ATAB[i] * (1 - u) + ATAB[i + 1] * u; };
  const nWater = (l) => 1.324 + 3300 / (l * l);
  const nIce = (l) => 1.3023 + 2412 / (l * l);
  // angle de l'arc (par rapport au point antisolaire) pour k réflexions internes
  function bowAngle(n, k) {
    const ci = Math.sqrt((n * n - 1) / (k * k + 2 * k)), i = Math.acos(ci), r = Math.asin(Math.sin(i) / n);
    const D = 2 * (i - r) + k * (Math.PI - 2 * r);
    return k === 1 ? Math.PI - D : D - Math.PI;
  }

  /* le profil lumineux de l'arc selon la taille des gouttes (théorie d'Airy, 1838), convolué par le disque solaire */
  const NT = 1400, TH = 70; // 0 à 70° par pas de 0,05°
  function bowProfile(aMM) {
    const X = new Float64Array(NT), Y = new Float64Array(NT), Z = new Float64Array(NT);
    // les gouttes d'une même pluie n'ont pas toutes la même taille (±15 %) ; un brouillard est bien plus disparate (jusqu'à ±45 %) :
    // les franges fines se brouillent, et l'arc de brouillard devient blanc
    const sg = clamp(0.15 + 0.3 * Math.log10(0.2 / aMM), 0.15, 0.45);
    const SZ = [-1.6, -1.1, -0.6, -0.2, 0.2, 0.6, 1.1, 1.6].map((u) => [aMM * (1 + sg * u), Math.exp(-u * u / 2)]);
    for (let l = 400; l <= 700; l += 10) {
      const n = nWater(l), c = cmf(l), sp = planck(l) / P0;
      for (const [a, wa] of SZ) {
        const ka = (TAU * a) / (l * 1e-6);
        for (const k of [1, 2]) {
          const p = k + 1, th = bowAngle(n, k);
          const h = ((p * p - 1) ** 2 / (p * p)) * Math.sqrt(p * p - n * n) / Math.pow(n * n - 1, 1.5);
          const s = Math.cbrt(12 / h) * Math.pow(ka, 2 / 3), amp = wa * (k === 1 ? 1 : 0.43) * Math.pow(l / 550, -1 / 3) * sp;
          for (let j = 0; j < NT; j++) {
            const t = ((j + 0.5) / NT) * TH * D2R, z = s * (k === 1 ? th - t : t - th);
            if (z < -8) continue;
            const A = airyT(-z), I = A * A * amp;
            X[j] += I * c[0]; Y[j] += I * c[1]; Z[j] += I * c[2];
          }
        }
      }
    }
    // le soleil n'est pas un point : son disque (0,53°) brouille les franges les plus fines
    const R = Math.round(0.265 / (TH / NT)), K = []; let ks = 0;
    for (let q = -R; q <= R; q++) { const w = Math.sqrt(Math.max(0, 1 - (q / (R + 0.5)) ** 2)); K.push(w); ks += w; }
    const out = new Float32Array(NT * 4); let mx = 0;
    const cv = (A, j) => { let s = 0; for (let q = -R; q <= R; q++) s += A[clamp(j + q, 0, NT - 1)] * K[q + R]; return s / ks; };
    const tmp = [];
    for (let j = 0; j < NT; j++) { const c = xyz2rgb(cv(X, j), cv(Y, j), cv(Z, j)); const m = Math.min(c[0], c[1], c[2]); if (m < 0) { c[0] -= m; c[1] -= m; c[2] -= m; } tmp.push(c); if (j * (TH / NT) > 30 && j * (TH / NT) < 45) mx = Math.max(mx, c[0] + c[1] + c[2]); }
    for (let j = 0; j < NT; j++) for (let q = 0; q < 3; q++) out[j * 4 + q] = (tmp[j][q] / mx) * 2.4;
    return out;
  }

  window.FASC.push({
    id: 'ciel', name: 'Les Couleurs du ciel', cat: 'Éléments', glyph: '☼',
    blurb: 'Pourquoi le ciel est bleu, l’arc-en-ciel courbe et le halo à 22°',
    hint: 'Glissez verticalement pour monter ou descendre le soleil · le panneau change de scène, de regard, de planète.',
    intro: 'Le soleil envoie une lumière blanche ; tout le reste vient de ce qu’elle rencontre. Les molécules d’air diffusent surtout le bleu : le ciel est bleu, le soleil couchant rouge. Une goutte de pluie renvoie la lumière autour de 42° : l’arc-en-ciel est un cône dont vous êtes le sommet. Un cristal de glace hexagonal la dévie d’au moins 22° : le halo. Ici, chaque couleur est calculée.',
    about: [
      'La diffusion de Rayleigh (1871) : une particule beaucoup plus petite que la longueur d’onde diffuse en 1/λ⁴, le violet seize fois plus que le rouge lointain. Le ciel n’est pourtant pas violet : le soleil en émet moins, l’ozone en absorbe, et notre œil y est peu sensible. Au coucher, la lumière traverse jusqu’à quarante fois plus d’air qu’au zénith : le bleu a été diffusé en route, il reste l’orangé et le rouge.',
      'La diffusion de Mie (1908) concerne les particules de taille voisine de la longueur d’onde : poussières, gouttelettes, pollution. Elle est presque indépendante de la couleur et très dirigée vers l’avant : le ciel blanchit et le soleil s’entoure d’une auréole. Sur Mars, la poussière rend le ciel couleur caramel le jour ; au coucher, elle renvoie mieux le bleu vers l’avant, et le soleil se couche dans le bleu (vu par les robots Spirit, Curiosity, Perseverance).',
      'Le bleu du ciel au crépuscule doit beaucoup à l’ozone (Edward Hulburt, 1953) : quand le soleil est sous l’horizon, la lumière qui éclaire le zénith a traversé la couche d’ozone en biais, et l’ozone absorbe l’orangé (bandes de Chappuis). Sans ozone, le zénith du crépuscule serait grisâtre. Dos au soleil, juste après le coucher : la bande sombre bleutée au-dessus de l’horizon est l’ombre de la Terre projetée sur l’atmosphère, surmontée d’une frange rose, la ceinture de Vénus.',
      'L’arc-en-ciel : René Descartes (1637) trace des milliers de rayons à travers une goutte et remarque qu’ils s’accumulent vers 42° : c’est l’angle de déviation minimale. Isaac Newton y ajoute la dispersion : le violet dévie un peu plus que le rouge. L’arc secondaire (deux réflexions dans la goutte) est à 51°, couleurs inversées ; entre les deux, la bande sombre d’Alexandre d’Aphrodise. Les arcs surnuméraires, de fines franges roses et vertes sous l’arc, sont des interférences : George Airy (1838) les a expliqués par l’optique ondulatoire. Ils n’apparaissent qu’avec de petites gouttes toutes semblables ; avec des gouttelettes de brouillard, les franges s’élargissent tant que les couleurs se mêlent : l’arc devient blanc.',
      'Les halos naissent dans les cirrus et le brouillard glacé, où flottent des prismes hexagonaux de glace. Deux faces latérales non voisines forment un prisme de 60° : la lumière y est déviée d’au moins 22°, d’où le halo de 22°. Une face latérale et une base forment un prisme de 90° : halo de 46°. Les plaquettes tombent à plat comme des feuilles : elles produisent les parhélies (les « faux soleils », à gauche et à droite du soleil) et l’arc circumzénithal, un arc-en-ciel à l’envers près du zénith, qui n’existe que si le soleil est à moins de 32° de hauteur. Les colonnes tombent couchées : arcs tangents. Ici, chaque image est faite de millions de rayons lancés au hasard à travers des cristaux orientés au hasard.',
    ],
    tools: [{ id: 'soleil', label: 'soleil', desc: 'Glissez de haut en bas pour déplacer le soleil (la marche automatique s’arrête).' }],
    make(env) {
      try { return makeCiel(env); } catch (e) {
        console.warn('Les Couleurs du ciel : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#05050a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Les Couleurs du ciel demandent WebGL2 avec textures flottantes.', 20, env.h / 2); } };
      }
    },
  });

  function makeCiel(env) {
    let w = build(env);
    function build(e) { return keep.scene === 'arc' ? arc(e) : keep.scene === 'halos' ? halos(e) : ciel(e); }
    const rebuild = () => { try { w.dispose && w.dispose(); } catch (e) { /* rien */ } w = build(env); };
    const api = {
      livePaused: true,
      frame: (t, dt) => w.frame(t, dt), down: (p) => w.down && w.down(p), move: (p) => w.move && w.move(p), up: () => w.up && w.up(),
      dispose: () => w.dispose && w.dispose(),
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'Le ciel', act: () => { keep.scene = 'ciel'; rebuild(); } },
          { label: 'L’arc-en-ciel', act: () => { keep.scene = 'arc'; rebuild(); } },
          { label: 'Les halos', act: () => { keep.scene = 'halos'; rebuild(); } },
        ] }];
        return L.concat(w.ui ? w.ui() : []);
      },
    };
    if (window.FASC_DEBUG) window.FASC_DEBUG.ciel = { keep, get w() { return w; }, scene(id) { keep.scene = id; rebuild(); } };
    return api;
  }

  /* ─ caméras : perspective (lacet, tangage) ou fish-eye (zénith au centre, soleil en bas) ─ */
  function camera(W, H, view, o) {
    const cx = (view.x0 + view.x1) / 2, cy = H / 2, vw = view.x1 - view.x0;
    const C = { cx, cy, fish: !!o.fish, yaw: o.yaw || 0, pitch: o.pitch || 0 };
    C.f = (H / 2) / Math.tan((o.vfov || 90) * D2R / 2);
    C.rf = Math.min(vw, H) * 0.46;
    const cp = Math.cos(C.pitch), sp = Math.sin(C.pitch), cyw = Math.cos(C.yaw), syw = Math.sin(C.yaw);
    C.F = [cp * cyw, cp * syw, sp]; C.R = [syw, -cyw, 0]; C.U = [-cyw * sp, -syw * sp, cp];
    C.proj = (v) => {
      if (C.fish) {
        if (v[2] < -0.02) return null;
        const z = Math.acos(clamp(v[2], -1, 1)), ph = Math.atan2(v[1], v[0]), r = (z / (Math.PI / 2)) * C.rf;
        return [cx + r * Math.sin(ph), cy + r * Math.cos(ph)];
      }
      const z = v[0] * C.F[0] + v[1] * C.F[1] + v[2] * C.F[2];
      if (z <= 0.05) return null;
      return [cx + (C.f * (v[0] * C.R[0] + v[1] * C.R[1] + v[2] * C.R[2])) / z, cy - (C.f * (v[0] * C.U[0] + v[1] * C.U[1] + v[2] * C.U[2])) / z];
    };
    return C;
  }
  const camGLSL = `
uniform vec2 uWH, uC; uniform float uF, uRf; uniform int uFish; uniform vec3 uFw, uRt, uUp;
vec3 viewDir(out bool ok){
  vec2 px = vec2(vUv.x * uWH.x, (1. - vUv.y) * uWH.y); ok = true;
  if (uFish == 1){ vec2 d = px - uC; float r = length(d) / uRf; if (r > 1.){ ok = false; return vec3(0, 0, 1); }
    float z = r * 1.5707963, ph = atan(d.x, d.y); return vec3(sin(z) * cos(ph), sin(z) * sin(ph), cos(z)); }
  vec2 q = (px - uC) / uF; return normalize(uFw + q.x * uRt - q.y * uUp);
}`;
  const setCam = (P, C, W, H) => P.f('uWH', W, H).f('uC', C.cx, C.cy).f('uF', C.f).f('uRf', C.rf).i('uFish', C.fish ? 1 : 0).f('uFw', C.F[0], C.F[1], C.F[2]).f('uRt', C.R[0], C.R[1], C.R[2]).f('uUp', C.U[0], C.U[1], C.U[2]);
  const sunVec = (el) => [Math.cos(el * D2R), 0, Math.sin(el * D2R)];
  function dragSun(env, key, lo, hi) {
    let y0 = 0, e0 = 0;
    return {
      down(p) { y0 = p.y; e0 = keep[key]; keep.anim = false; },
      move(p) { if (!p.down) return false; const v = clamp(e0 + (y0 - p.y) * 0.12, lo, hi); const ch = v !== keep[key]; keep[key] = v; return ch; },
    };
  }
  function txtLine(ctx, x, y, s, col) { const w = ctx.measureText(s).width; ctx.fillStyle = 'rgba(6,8,16,.55)'; ctx.fillRect(x - 6, y - 13, w + 12, 18); ctx.fillStyle = col || 'rgba(236,240,250,.92)'; ctx.fillText(s, x, y); }

  /* ═════════ scène 1 : le ciel ═════════ */
  const PLANETS = {
    terre: { nom: 'la Terre', Rp: 6360, Ra: 6420, Hr: 8, Hm: 1.2, bR: [5.802e-3, 13.558e-3, 33.1e-3], bMs: [3.996e-3, 3.996e-3, 3.996e-3], bMe: [4.4e-3, 4.4e-3, 4.4e-3], g: [0.8, 0.8, 0.8], oz: 1, sun: 1 },
    // Mars, en approximation : très peu d'air, une poussière fine qui absorbe le bleu mais le diffuse plus vers l'avant
    mars: { nom: 'Mars', Rp: 3390, Ra: 3480, Hr: 11.1, Hm: 11, bR: [0.1e-3, 0.24e-3, 0.58e-3], bMs: [0.043, 0.035, 0.024], bMe: [0.046, 0.046, 0.047], g: [0.62, 0.7, 0.84], oz: 0, sun: 0.43 },
    lune: { nom: 'la Lune', Rp: 1737, Ra: 1738, Hr: 1, Hm: 1, bR: [0, 0, 0], bMs: [0, 0, 0], bMe: [0, 0, 0], g: [0.8, 0.8, 0.8], oz: 0, sun: 1 },
  };
  const SKY_FS = HEAD + camGLSL + `
uniform vec3 uSun, uBR, uBMs, uBMe, uG; uniform float uRp, uRa, uHr, uHm, uAlt, uOz;
out vec4 o;
vec2 rs(vec3 p, vec3 d, float R){ float b = dot(p, d), c = dot(p, p) - R * R, h = b * b - c; if (h < 0.) return vec2(-1.); h = sqrt(h); return vec2(-b - h, -b + h); }
const vec3 BO = vec3(0.650e-3, 1.881e-3, 0.085e-3);
float oz(float h){ return max(0., 1. - abs(h - 25.) / 15.); }
void main(){
  bool ok; vec3 d = viewDir(ok);
  if (!ok){ o = vec4(0., 0., 0., 2.); return; }
  vec3 p0 = vec3(0., 0., uRp + uAlt + 0.002);
  float t1 = rs(p0, d, uRa).y; vec2 tg = rs(p0, d, uRp); bool ground = tg.x > 0.;
  if (ground) t1 = tg.x;
  if (t1 <= 0.){ o = vec4(0.); return; }
  const int N = 18; float ds = t1 / float(N);
  vec3 sR = vec3(0.), sM = vec3(0.), sA = vec3(0.); float oR = 0., oM = 0., oO = 0.;
  for (int i = 0; i < N; i++){
    vec3 p = p0 + d * (float(i) + .5) * ds; float h = length(p) - uRp;
    float dr = exp(-h / uHr) * ds, dm = exp(-h / uHm) * ds;
    oR += dr; oM += dm; oO += oz(h) * ds * uOz;
    vec3 Tv = exp(-(uBR * oR + uBMe * oM + BO * oO));
    // diffusion multiple, très approchée : l'air éclairé quelques kilomètres plus haut renvoie une lumière bleutée, même dans l'ombre
    vec3 q = p + normalize(p) * 16.;
    if (rs(q, uSun, uRp).x < 0.){
      float tq = rs(q, uSun, uRa).y, dq = tq / 4.; float qR = 0., qM = 0., qO = 0.;
      for (int j = 0; j < 4; j++){ vec3 r = q + uSun * (float(j) + .5) * dq; float hh = length(r) - uRp; qR += exp(-hh / uHr) * dq; qM += exp(-hh / uHm) * dq; qO += oz(hh) * dq * uOz; }
      vec3 Tq = exp(-(uBR * qR + uBMe * qM + BO * qO));
      sA += Tv * (dr * uBR + dm * uBMs) * Tq * (uBR * uHr + uBMs * uHm) * .5;
    }
    if (rs(p, uSun, uRp).x > 0.) continue; // dans l'ombre de la planète
    float tl = rs(p, uSun, uRa).y, dl = tl / 6.; float lR = 0., lM = 0., lO = 0.;
    for (int j = 0; j < 6; j++){ vec3 q = p + uSun * (float(j) + .5) * dl; float hh = length(q) - uRp; lR += exp(-hh / uHr) * dl; lM += exp(-hh / uHm) * dl; lO += oz(hh) * dl * uOz; }
    vec3 T = exp(-(uBR * (oR + lR) + uBMe * (oM + lM) + BO * (oO + lO)));
    sR += T * dr; sM += T * dm;
  }
  float mu = dot(d, uSun);
  float pR = 3. / (50.265) * (1. + mu * mu);
  vec3 g2 = uG * uG, pM = 3. / (25.133) * ((1. - g2) * (1. + mu * mu)) / ((2. + g2) * pow(1. + g2 - 2. * uG * mu, vec3(1.5)));
  vec3 L = 20. * (sR * uBR * pR + sM * uBMs * pM + sA * .0796);
  if (ground){ vec3 Tg = exp(-(uBR * oR + uBMe * oM)); L += Tg * vec3(.05, .055, .045) * 20. * max(uSun.z, 0.) * .2; }
  o = vec4(L, ground ? 1. : 0.);
}`;
  const TONE_FS = HEAD + `
uniform sampler2D uA; uniform float uExp; out vec4 o;
void main(){ vec4 a = texture(uA, vUv); if (a.a > 1.5){ o = vec4(0., 0., 0., 1.); return; }
  // on comprime la luminance en gardant la teinte (sinon tout ce qui est vif tourne au blanc)
  vec3 c = a.rgb * uExp; float m = max(max(c.r, c.g), max(c.b, 1e-6)); vec3 h = c * (1. - exp(-m)) / m;
  c = mix(h, vec3(1. - exp(-m)), smoothstep(2., 12., m) * .5);
  o = vec4(pow(c, vec3(1. / 2.2)), 1.); }`;

  // la même atmosphère en JavaScript, le long d'un seul rayon : couleur du disque solaire
  function sunColor(P, el, alt) {
    const s = sunVec(el), p0 = [0, 0, P.Rp + alt + 0.002];
    const b = p0[2] * s[2], c = p0[2] * p0[2] - P.Ra * P.Ra, hh = b * b - c;
    if (hh < 0) return [1, 1, 1];
    const bg = p0[2] * s[2], cg = p0[2] * p0[2] - P.Rp * P.Rp, hg = bg * bg - cg;
    if (hg > 0 && -bg - Math.sqrt(hg) > 0) return [0, 0, 0];
    const t1 = -b + Math.sqrt(hh), n = 64, ds = t1 / n; let oR = 0, oM = 0, oO = 0;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) * ds, x = s[0] * t, z = p0[2] + s[2] * t, h = Math.hypot(x, z) - P.Rp; oR += Math.exp(-h / P.Hr) * ds; oM += Math.exp(-h / P.Hm) * ds; oO += Math.max(0, 1 - Math.abs(h - 25) / 15) * ds * P.oz; }
    const BO = [0.65e-3, 1.881e-3, 0.085e-3];
    return [0, 1, 2].map((k) => Math.exp(-(P.bR[k] * oR + P.bMe[k] * oM + BO[k] * oO)));
  }

  function ciel(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const sc = 0.34, gw = Math.max(64, Math.round(W * sc)), gh = Math.max(48, Math.round(H * sc));
    const K = GLKit(gw, gh), gl = K.gl;
    const PS = K.program(SKY_FS), PT = K.program(TONE_FS), A = K.target(gw, gh, 'f32', gl.NEAREST); // même taille que l'écran WebGL : pas besoin de filtrage (et le linéaire sur float32 n'est pas garanti)
    const buf = new Float32Array(gw * gh * 4);
    let C = null, dirty = true, exp = 1, horizon = [0.5, 0.6, 0.7], T = 0, dir = -1;
    const stars = Array.from({ length: 260 }, () => { const z = Math.acos(Math.random()), a = rnd(TAU); return [Math.sin(z) * Math.cos(a), Math.sin(z) * Math.sin(a), Math.cos(z), rnd(1.6, 0.5)]; });
    // collines : silhouette fixe
    const hills = []; for (let x = 0; x <= W + 20; x += 16) hills.push([x, 0.012 * Math.sin(x * 0.006) + 0.008 * Math.sin(x * 0.019 + 2) + 0.004 * Math.sin(x * 0.05)]);
    const trees = Array.from({ length: Math.round(W / 70) }, () => [rnd(W), rnd(1.2, 0.6)]);
    const drag = dragSun(env, 'el', -18, 60);
    const drones = [];
    if (au && au.live) drones.push(au.drone(110, 'sine', 0.012), au.drone(164.8, 'sine', 0.007));

    function cam() {
      const v = env.view || { x0: 0, x1: W };
      if (keep.look === 'zenith') return camera(W, H, v, { fish: true });
      // horizon vers les deux tiers bas : surtout du ciel
      return camera(W, H, v, { yaw: keep.look === 'dos' ? Math.PI : 0, pitch: 24 * D2R, vfov: 80 });
    }
    function render() {
      const P = PLANETS[keep.planet], s = sunVec(keep.el);
      C = cam();
      const k = (a) => a.map((x) => x * (keep.planet === 'terre' ? 1 : 1));
      const hz = keep.planet === 'terre' ? keep.haze : 1;
      PS.use(); setCam(PS, C, W, H)
        .f('uSun', s[0], s[1], s[2]).f('uRp', P.Rp).f('uRa', P.Ra).f('uHr', P.Hr).f('uHm', P.Hm).f('uAlt', keep.planet === 'terre' ? keep.alt : 0).f('uOz', keep.ozone ? P.oz : 0)
        .f('uBR', ...k(P.bR)).f('uBMs', ...P.bMs.map((x) => x * hz)).f('uBMe', ...P.bMe.map((x) => x * hz)).f('uG', ...P.g);
      K.run(PS, A);
      // exposition automatique : on lit l'image (petite) et on vise une luminance moyenne, plus sombre la nuit
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb); gl.readPixels(0, 0, gw, gh, gl.RGBA, gl.FLOAT, buf);
      let s1 = 0, n1 = 0;
      for (let i = 0; i < gw * gh; i += 3) { const o = i * 4; if (buf[o + 3] > 0.5) continue; const L = 0.2126 * buf[o] + 0.7152 * buf[o + 1] + 0.0722 * buf[o + 2]; s1 += Math.log(1e-7 + L); n1++; }
      const avg = n1 ? Math.exp(s1 / n1) : 1, target = keep.el > 0 ? 0.3 : 0.3 * Math.exp(keep.el / 5);
      exp = clamp(target / Math.max(1e-7, avg), 0.05, keep.planet === 'lune' ? 1 : 5e4);
      // la couleur juste au-dessus de l'horizon, pour teinter les collines
      if (!C.fish) { const hp = C.proj([1, 0, 0.02]) || C.proj([-1, 0, 0.02]); if (hp) { const gx = clamp(Math.round(hp[0] * sc), 0, gw - 1), gy = clamp(Math.round((H - hp[1]) * sc), 0, gh - 1), o = (gy * gw + gx) * 4; horizon = [0, 1, 2].map((q) => Math.min(1, buf[o + q] * exp)); } }
      dirty = false;
    }
    function airMass(el) { return el <= -1 ? null : 1 / (Math.sin(Math.max(0.01, el) * D2R) + 0.50572 * Math.pow(Math.max(0.01, el) + 6.07995, -1.6364)); }

    return {
      frame(t, dt) {
        T += dt;
        if (keep.anim) { keep.el += dir * dt * 0.45; if (keep.el < -14) { keep.el = -14; dir = 1; } if (keep.el > 24) { keep.el = 24; dir = -1; } dirty = true; }
        if (dirty) render();
        PT.use().t('uA', A).f('uExp', exp); K.run(PT, null); // le tampon WebGL est effacé après chaque image : on redessine
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.drawImage(K.canvas, 0, 0, W, H);
        const P = PLANETS[keep.planet], s = sunVec(keep.el);
        // étoiles quand le ciel s'assombrit
        const dark = keep.planet === 'lune' ? 1 : clamp((-keep.el - 4) / 8, 0, 1);
        if (dark > 0) {
          ctx.fillStyle = '#fff';
          for (const st of stars) { const p = C.proj(st); if (!p) continue; ctx.globalAlpha = dark * (0.5 + 0.5 * Math.sin(T * 2 + st[3] * 9)) * 0.8; ctx.fillRect(p[0], p[1], st[3], st[3]); }
          ctx.globalAlpha = 1;
        }
        // le disque solaire (grossi trois fois), à la couleur de la lumière qui l'a traversée
        const sp = C.proj(s);
        if (sp && keep.el > -0.6) {
          const tc = sunColor(P, keep.el, keep.planet === 'terre' ? keep.alt : 0), m = Math.max(tc[0], tc[1], tc[2], 1e-6);
          const col = tc.map((v) => Math.round(255 * Math.pow(clamp((v / m) * 0.6 + 0.4 * Math.min(1, m * 3), 0, 1), 0.7)));
          const r = Math.max(4, (0.8 * D2R * (C.fish ? C.rf / (Math.PI / 2) : C.f))), gr = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], r * 6);
          gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.16, `rgba(${col},1)`); gr.addColorStop(0.22, `rgba(${col},.35)`); gr.addColorStop(1, `rgba(${col},0)`);
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(sp[0] - r * 6, sp[1] - r * 6, r * 12, r * 12); ctx.globalCompositeOperation = 'source-over';
        }
        // le paysage
        if (!C.fish) {
          const hp = C.proj([C.F[0], C.F[1], 0]);
          const hy = hp ? hp[1] : H * 0.8, lit = clamp(keep.el / 10 + 0.2, 0.05, 1);
          const col = horizon.map((v, q) => Math.round(255 * clamp(v * 0.28 * lit + [0.03, 0.05, 0.03][q] * lit, 0, 1)));
          ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.moveTo(0, H);
          for (const [x, y] of hills) ctx.lineTo(x, hy - y * H - 6);
          ctx.lineTo(W, H); ctx.fill();
          ctx.fillStyle = `rgb(${col.map((v) => Math.round(v * 0.7))})`;
          for (const [x, k] of trees) { const y = hy - 6 - (hills[Math.min(hills.length - 1, Math.round(x / 16))][1] * H); ctx.beginPath(); ctx.moveTo(x - 7 * k, y + 2); ctx.lineTo(x, y - 30 * k); ctx.lineTo(x + 7 * k, y + 2); ctx.fill(); }
          ctx.fillRect(0, hy + 10, W, H - hy);
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(C.cx, C.cy, C.rf, 0, TAU); ctx.stroke();
          ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,240,250,.7)';
          ctx.fillText('ZÉNITH', C.cx, C.cy - 6); ctx.fillText('HORIZON CÔTÉ SOLEIL', C.cx, C.cy + C.rf + 16); ctx.fillText('HORIZON OPPOSÉ', C.cx, C.cy - C.rf - 8); ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(C.cx - 1, C.cy - 1, 2, 2);
        }
        // tableau
        const v = env.view || { x0: 0, x1: W }, x0 = v.x0 + 16;
        ctx.font = '500 11px "JetBrains Mono", monospace';
        let y = H - 18;
        const e = keep.el, am = airMass(e);
        let st = `SOLEIL À ${fr(e, 1)}° SUR ${P.nom.toUpperCase()}`;
        if (keep.planet !== 'lune') {
          if (e >= 0 && am) st += ` · LA LUMIÈRE TRAVERSE ${fr(am, am < 10 ? 1 : 0)} FOIS L’ÉPAISSEUR D’AIR DU ZÉNITH`;
          else if (e > -6) st += ' · CRÉPUSCULE CIVIL'; else if (e > -12) st += ' · CRÉPUSCULE NAUTIQUE'; else st += ' · CRÉPUSCULE ASTRONOMIQUE';
        }
        txtLine(ctx, x0, y, st, 'rgba(255,236,200,.95)'); y -= 20;
        if (keep.look === 'dos' && keep.planet === 'terre' && e < 1 && e > -7) txtLine(ctx, x0, y, 'AU-DESSUS DE L’HORIZON : L’OMBRE DE LA TERRE (BLEU SOMBRE), PUIS LA CEINTURE DE VÉNUS (ROSE)');
        if (keep.look === 'zenith' && keep.planet === 'terre' && e < 0 && e > -8) txtLine(ctx, x0, y, keep.ozone ? 'LE BLEU DU ZÉNITH AU CRÉPUSCULE : SURTOUT L’OZONE, QUI ABSORBE L’ORANGÉ' : 'SANS OZONE, LE ZÉNITH DU CRÉPUSCULE TOURNE AU GRIS');
      },
      down(p) { drag.down(p); },
      move(p) { if (drag.move(p)) dirty = true; },
      dispose() { drones.forEach((d) => d.stop()); K.lose(); },
      ui() {
        const set = (f) => (v) => { f(v); dirty = true; };
        const L = [{ type: 'section', label: 'Le ciel' }];
        L.push({ type: 'slider', label: 'Hauteur du soleil', min: -18, max: 60, step: 0.1, value: keep.el, fmt: (v) => fr(v, 1) + '°', set: set((v) => { keep.el = v; keep.anim = false; }) });
        L.push({ type: 'toggle', label: 'Le soleil se couche et se lève', value: keep.anim, set: (v) => { keep.anim = v; } });
        L.push({ type: 'choice', label: 'Regard', value: keep.look, options: [{ id: 'soleil', label: 'Vers le soleil' }, { id: 'dos', label: 'Dos au soleil' }, { id: 'zenith', label: 'Tout le ciel' }], set: set((v) => { keep.look = v; }) });
        L.push({ type: 'choice', label: 'Planète', value: keep.planet, options: [{ id: 'terre', label: 'Terre' }, { id: 'mars', label: 'Mars' }, { id: 'lune', label: 'Lune' }], set: set((v) => { keep.planet = v; }) });
        if (keep.planet === 'terre') {
          L.push({ type: 'slider', label: 'Poussières et brume (Mie)', min: 0, max: 12, step: 0.1, value: keep.haze, fmt: (v) => (v < 0.3 ? 'air pur' : v < 2 ? 'normal' : v < 5 ? 'brumeux' : 'pollué ou volcanique') + ' (×' + fr(v, 1) + ')', set: set((v) => { keep.haze = v; }) });
          L.push({ type: 'slider', label: 'Altitude de l’observateur', min: 0, max: 40, step: 0.5, value: keep.alt, fmt: (v) => fr(v, 1) + ' km', set: set((v) => { keep.alt = v; }) });
          L.push({ type: 'toggle', label: 'Couche d’ozone', value: keep.ozone, set: set((v) => { keep.ozone = v; }) });
        }
        L.push({ type: 'note', text: keep.planet === 'mars' ? 'Mars (modèle approché) : presque pas d’air, mais une poussière fine en suspension. Le jour, elle donne au ciel sa couleur caramel ; au coucher, elle renvoie mieux le bleu vers l’avant : le soleil se couche dans une auréole bleue.' : keep.planet === 'lune' ? 'Sans atmosphère, rien ne diffuse la lumière : le ciel reste noir en plein jour, et les étoiles visibles à côté du soleil.' : 'Essayez : le soleil bas, regard vers lui, puis dos à lui (ombre de la Terre et ceinture de Vénus) ; tout le ciel juste après le coucher, avec et sans ozone ; beaucoup de poussières (ciel blanchi, couchant rouge sang après une éruption) ; 30 km d’altitude (le ciel noircit). Le disque solaire est dessiné trois fois plus gros que nature.' });
        return L;
      },
    };
  }

  /* ═════════ scène 2 : l'arc-en-ciel ═════════ */
  const BOW_FS = HEAD + camGLSL + `
uniform sampler2D uLut; uniform vec3 uAnti; uniform float uT, uLight; out vec4 o;
void main(){
  bool ok; vec3 d = viewDir(ok);
  float el = asin(clamp(d.z, -1., 1.));
  // ciel d'orage derrière la pluie, plus clair vers le haut à droite
  float az = atan(d.y, -d.x);
  vec3 sky = mix(vec3(.05, .055, .075), vec3(.12, .13, .17), smoothstep(-.1, .9, el)) * (0.85 + 0.3 * fbm(vec2(az * 2.5, el * 5.) + uT * .01));
  float th = degrees(acos(clamp(dot(d, uAnti), -1., 1.)));
  vec3 bow = th < 70. ? texture(uLut, vec2(th / 70., .5)).rgb : vec3(0.);
  // le rideau de pluie : plus dense par endroits
  float rain = .55 + .45 * smoothstep(.25, .75, fbm(vec2(az * 4., el * 3.) * 1.3 + 3.));
  vec3 c = sky + bow * rain * uLight * .75;
  float streak = hash12(floor(vec2(vUv.x * 900. + vUv.y * 180., vUv.y * 40. - uT * 30.)));
  c += vec3(.03) * step(.985, streak);
  o = vec4(pow(1. - exp(-c * 1.25), vec3(1. / 2.2)), 1.);
}`;

  function arc(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const sc = 0.5, gw = Math.round(W * sc), gh = Math.round(H * sc);
    let K = null, PB = null, LUT = null, lutA = -1;
    let T = 0, dirty = true;
    const drag = dragSun(env, 'rbEl', 0, 50);
    const drones = [];
    if (au && au.live) drones.push(au.drone(82.4, 'sine', 0.01));
    let lastRain = 0;
    function ensureGL() {
      if (K) return;
      K = GLKit(gw, gh); PB = K.program(BOW_FS);
    }
    let lutT = 0;
    function lut() {
      if (lutA === keep.drop && LUT) return;
      if (LUT && performance.now() - lutT < 150) return; // pendant qu'on glisse le curseur : au plus six fois par seconde
      lutT = performance.now();
      const data = bowProfile(keep.drop);
      if (LUT) K.gl.deleteTexture(LUT);
      LUT = K.texture(NT, 1, 'f16', K.gl.LINEAR, data); lutA = keep.drop;
    }
    // paysage éclairé par le soleil dans le dos
    const land = layer(W, H);
    let landFor = -1;
    function paintLand(hy) {
      const g = land.g; g.clearRect(0, 0, W, H);
      const lit = clamp(keep.rbEl / 20 + 0.4, 0.4, 1);
      const col = (r, gg, b, k) => `rgb(${Math.round(r * k)},${Math.round(gg * k)},${Math.round(b * k)})`;
      const layers = [[0.0, 0.022, 0.004, [70, 110, 80], 0.7], [0.02, 0.016, 0.009, [92, 140, 70], 0.85], [0.05, 0.01, 0.013, [120, 168, 70], 1]];
      for (const [dy, a, f, c, k] of layers) {
        g.fillStyle = col(c[0], c[1], c[2], k * lit); g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 10) g.lineTo(x, hy + dy * H - a * H * (0.5 + 0.5 * Math.sin(x * f + dy * 40)) - 4);
        g.lineTo(W, H); g.fill();
      }
      for (let i = 0; i < W / 40; i++) {
        const x = rnd(W), y = hy + rnd(0.12, 0.03) * H, s = rnd(1.3, 0.6);
        g.fillStyle = col(50, 86, 44, lit); g.beginPath(); g.arc(x, y - 14 * s, 10 * s, 0, TAU); g.fill();
        g.fillStyle = col(64, 44, 30, lit); g.fillRect(x - 1.5 * s, y - 6 * s, 3 * s, 8 * s);
      }
      landFor = keep.rbEl;
    }

    /* la goutte : rayons tracés un par un */
    const LS = [[700, '255,60,40'], [640, '255,140,30'], [590, '255,230,40'], [550, '80,230,60'], [500, '40,200,255'], [460, '60,90,255'], [420, '170,60,255']];
    const paths = layer(W, H), hist = new Float32Array(LS.length * 240);
    let bScan = 0, nRays = 0;
    function dropGeom() { const v = env.view || { x0: 0, x1: W }, vw = v.x1 - v.x0; return { cx: v.x0 + vw * 0.36, cy: H * 0.5, R: Math.min(vw * 0.28, H * 0.34), v }; }
    function fres(ci, n1, n2) { const s2 = ((n1 / n2) ** 2) * (1 - ci * ci); if (s2 >= 1) return 1; const ct = Math.sqrt(1 - s2), rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct), rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci); return (rs * rs + rp * rp) / 2; }
    function traceDrop(b, n, k) {
      const G = dropGeom(), pts = [];
      let px = -Math.sqrt(1 - b * b), py = -b, dx = 1, dy = 0;
      pts.push([px - 3, py], [px, py]);
      // entrée : réfraction
      let nx = px, ny = py, ci = -(dx * nx + dy * ny), eta = 1 / n, ct = Math.sqrt(1 - eta * eta * (1 - ci * ci));
      let w = 1 - fres(ci, 1, n);
      dx = eta * dx + (eta * ci - ct) * nx; dy = eta * dy + (eta * ci - ct) * ny;
      for (let r = 0; r <= k; r++) {
        const t = -2 * (dx * px + dy * py); px += dx * t; py += dy * t; pts.push([px, py]);
        nx = px; ny = py; const c2 = dx * nx + dy * ny;
        if (r < k) { w *= fres(c2, n, 1); dx -= 2 * c2 * nx; dy -= 2 * c2 * ny; }
        else { const e2 = n, s2 = e2 * e2 * (1 - c2 * c2); if (s2 >= 1) return null; const c3 = Math.sqrt(1 - s2); w *= 1 - fres(c2, n, 1); dx = e2 * dx + (c3 - e2 * c2) * nx; dy = e2 * dy + (c3 - e2 * c2) * ny; }
      }
      pts.push([px + dx * 3.2, py + dy * 3.2]);
      const th = Math.acos(clamp(-dx, -1, 1)) * R2D; // angle avec la direction antisolaire
      return { pts: pts.map(([x, y]) => [G.cx + x * G.R, G.cy + y * G.R]), th, w };
    }
    function dropFrame(dt) {
      const G = dropGeom(), k = keep.refl;
      // quelques nouveaux rayons, toutes couleurs, à des hauteurs d'impact au hasard
      const g = paths.g;
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 0.25)})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
      g.lineWidth = 1;
      for (let q = 0; q < 10; q++) {
        const b = Math.random() * 0.999;
        for (let li = 0; li < LS.length; li++) {
          const r = traceDrop(b, nWater(LS[li][0]), k); if (!r) continue;
          const bin = Math.floor(r.th * 4); if (bin >= 0 && bin < 240) hist[li * 240 + bin] += r.w;
          nRays++;
          if (q < 3) { g.strokeStyle = `rgba(${LS[li][1]},${(0.05 + r.w * 0.5).toFixed(3)})`; g.beginPath(); r.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
        }
      }
      ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
      // la goutte
      const gr = ctx.createRadialGradient(G.cx - G.R * 0.3, G.cy - G.R * 0.35, G.R * 0.1, G.cx, G.cy, G.R);
      gr.addColorStop(0, 'rgba(200,225,255,.14)'); gr.addColorStop(1, 'rgba(120,170,230,.06)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(180,215,255,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.drawImage(paths.c, 0, 0);
      // le rayon de Descartes (déviation minimale) en évidence, pour chaque couleur
      bScan = (bScan + dt * 0.12) % 1;
      ctx.lineWidth = 2.2;
      for (let li = 0; li < LS.length; li++) {
        const n = nWater(LS[li][0]), ci = Math.sqrt((n * n - 1) / (k * k + 2 * k)), b = Math.sqrt(1 - ci * ci), r = traceDrop(b, n, k);
        if (!r) continue;
        ctx.strokeStyle = `rgba(${LS[li][1]},.95)`; ctx.beginPath(); r.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,250,235,.85)'; ctx.font = '500 10.5px "JetBrains Mono", monospace';
      ctx.fillText('SOLEIL →', G.cx - G.R * 3.1, G.cy - G.R * 1.05);
      // l'histogramme des angles de sortie : les rayons s'entassent à l'angle de déviation minimale
      const v = G.v, hx = G.cx + G.R * 1.35, hw = Math.min(v.x1 - hx - 24, G.R * 1.6), hy = G.cy + G.R * 0.95, hh = G.R * 1.1;
      if (hw > 80) {
        ctx.fillStyle = 'rgba(10,14,24,.75)'; ctx.fillRect(hx - 10, hy - hh - 30, hw + 20, hh + 58);
        let mx = 1e-9; for (let i = 0; i < hist.length; i++) mx = Math.max(mx, hist[i]);
        const a0 = 0, a1 = 60;
        ctx.globalCompositeOperation = 'lighter';
        for (let li = 0; li < LS.length; li++) {
          ctx.strokeStyle = `rgba(${LS[li][1]},.85)`; ctx.lineWidth = 1.2; ctx.beginPath();
          for (let bin = a0 * 4; bin < a1 * 4; bin++) { const x = hx + ((bin / 4 - a0) / (a1 - a0)) * hw, y = hy - Math.pow(hist[li * 240 + bin] / mx, 0.5) * hh; bin === a0 * 4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(230,236,250,.8)'; ctx.font = '500 10px "JetBrains Mono", monospace';
        for (const a of [0, 20, 40, 60]) ctx.fillText(a + '°', hx + ((a - a0) / (a1 - a0)) * hw - 6, hy + 14);
        const thR = bowAngle(nWater(700), k) * R2D, thV = bowAngle(nWater(420), k) * R2D;
        ctx.fillText(`LUMIÈRE RENVOYÉE SELON L’ANGLE (${k === 1 ? 'UNE RÉFLEXION' : 'DEUX RÉFLEXIONS'})`, hx, hy - hh - 14);
        ctx.fillText(`ROUGE ${fr(thR, 1)}° · VIOLET ${fr(thV, 1)}°`, hx, hy + 30);
      }
      const x0 = v.x0 + 16;
      ctx.font = '500 11px "JetBrains Mono", monospace';
      txtLine(ctx, x0, H - 18, `${nRays} RAYONS TRACÉS · EN TRAIT ÉPAIS, LE RAYON DE DESCARTES : CELUI QUI EST LE MOINS DÉVIÉ`, 'rgba(255,236,200,.95)');
    }

    function skyFrame(dt) {
      ensureGL(); lut();
      const v = env.view || { x0: 0, x1: W };
      const C = camera(W, H, v, { yaw: Math.PI, pitch: 20 * D2R, vfov: 76 });
      const e = keep.rbEl * D2R, anti = [-Math.cos(e), 0, -Math.sin(e)];
      PB.use(); setCam(PB, C, W, H).t('uLut', LUT).f('uAnti', anti[0], anti[1], anti[2]).f('uT', T).f('uLight', clamp(1.1 - keep.rbEl / 60, 0.3, 1));
      K.run(PB, null);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
      ctx.drawImage(K.canvas, 0, 0, W, H);
      const hp = C.proj([-1, 0, 0]), hy = hp ? hp[1] : H * 0.8;
      if (landFor !== keep.rbEl) paintLand(hy);
      ctx.drawImage(land.c, 0, 0);
      // repères angulaires autour du point antisolaire (sous l'horizon)
      const x0 = v.x0 + 16;
      ctx.font = '500 11px "JetBrains Mono", monospace';
      const top1 = 42 - keep.rbEl, top2 = 51 - keep.rbEl;
      let y = H - 18;
      txtLine(ctx, x0, y, `SOLEIL DANS VOTRE DOS À ${fr(keep.rbEl, 1)}° · GOUTTES DE ${fr(keep.drop * 2, keep.drop < 0.05 ? 2 : 1)} MM DE DIAMÈTRE`, 'rgba(255,236,200,.95)'); y -= 20;
      txtLine(ctx, x0, y, top1 > 0 ? `HAUT DE L’ARC À ${fr(top1, 0)}° AU-DESSUS DE L’HORIZON · ARC SECONDAIRE À ${fr(top2, 0)}°` : `SOLEIL TROP HAUT : L’ARC PRINCIPAL EST SOUS L’HORIZON${top2 > 0 ? ' (LE SECONDAIRE DÉPASSE ENCORE)' : ''}`);
      if (snd() && T - lastRain > 0.5) { lastRain = T; au.noise(0.7, 0.01, rnd(4000, 2500), 0.5, 'bandpass'); }
    }
    const snd = () => au && au.on;

    return {
      frame(t, dt) {
        T += dt;
        if (keep.view === 'goutte') dropFrame(Math.min(dt, 0.1)); else skyFrame(dt);
      },
      down(p) { if (keep.view !== 'goutte') drag.down(p); },
      move(p) { if (keep.view !== 'goutte') drag.move(p); },
      dispose() { drones.forEach((d) => d.stop()); if (K) K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'L’arc-en-ciel' }];
        L.push({ type: 'choice', label: 'Vue', value: keep.view, options: [{ id: 'ciel', label: 'Dans le ciel' }, { id: 'goutte', label: 'Dans une goutte' }], set: (v) => { keep.view = v; } });
        if (keep.view === 'goutte') {
          L.push({ type: 'choice', label: 'Réflexions dans la goutte', value: keep.refl, options: [{ id: 1, label: 'Une (arc principal)' }, { id: 2, label: 'Deux (arc secondaire)' }], set: (v) => { keep.refl = v; hist.fill(0); nRays = 0; paths.g.clearRect(0, 0, W, H); } });
          L.push({ type: 'note', text: 'Les rayons du soleil arrivent de gauche et frappent la goutte à toutes les hauteurs. Chacun ressort avec une déviation différente, mais ils s’entassent près d’un angle : celui du rayon le moins dévié (Descartes, 1637). C’est ce surcroît de lumière que l’on voit comme un arc. Le violet, plus réfracté que le rouge, s’entasse à un angle un peu différent : les couleurs se séparent. Avec deux réflexions, l’ordre des couleurs s’inverse.' });
        } else {
          L.push({ type: 'slider', label: 'Hauteur du soleil', min: 0, max: 50, step: 0.5, value: keep.rbEl, fmt: (v) => fr(v, 1) + '°', set: (v) => { keep.rbEl = v; } });
          L.push({ type: 'slider', label: 'Diamètre des gouttes', min: -1.7, max: 0.5, step: 0.02, value: Math.log10(keep.drop * 2), fmt: (v) => { const d = Math.pow(10, v); return (d < 0.1 ? fr(d, 2) : fr(d, 1)) + ' mm' + (d < 0.12 ? ' (brouillard)' : d < 0.6 ? ' (bruine)' : ' (averse)'); }, set: (v) => { keep.drop = Math.pow(10, v) / 2; } });
          L.push({ type: 'buttons', items: [{ label: 'Averse', act: () => { keep.drop = 0.9; } }, { label: 'Bruine (surnuméraires)', act: () => { keep.drop = 0.17; } }, { label: 'Brouillard', act: () => { keep.drop = 0.012; } }] });
          L.push({ type: 'note', text: 'Grosses gouttes : un arc vif aux couleurs franches. Gouttes d’un quart de millimètre : sous l’arc principal apparaissent des franges roses et vertes, les arcs surnuméraires, qu’aucune optique géométrique n’explique (ce sont des interférences, théorie d’Airy). Gouttelettes de brouillard : les franges s’élargissent, les couleurs se mélangent : un arc blanc. Remarquez le ciel plus clair sous l’arc et la bande sombre d’Alexandre entre les deux arcs.' });
        }
        return L;
      },
    };
  }

  /* ═════════ scène 3 : les halos ═════════ */
  function halos(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const q = 0.5, GW = Math.round(W * q), GH = Math.round(H * q);
    const acc = new Float32Array(GW * GH * 3), img = ctx.createImageData(GW, GH), cv = layer(GW, GH);
    let nT = 0, C = null, s = null, key = '';
    const drag = dragSun(env, 'hEl', 0, 60);
    const drones = [];
    if (au && au.live) drones.push(au.drone(146.8, 'sine', 0.008), au.drone(220, 'sine', 0.004));
    // huit couleurs : indice de la glace et couleur affichée (soleil × sensibilité de l'œil)
    const BANDS = [];
    { let sum = [0, 0, 0];
      for (let l = 415; l <= 695; l += 40) { const c = cmf(l), sp = planck(l) / P0, rgb = xyz2rgb(c[0] * sp, c[1] * sp, c[2] * sp); BANDS.push({ n: nIce(l), c: rgb }); sum = sum.map((v, i) => v + rgb[i]); }
      for (const b of BANDS) b.c = b.c.map((v, i) => Math.max(0, v / sum[i]) * 3); }
    // le cristal : un prisme hexagonal (apothème 1) ; normales et distances de ses huit faces
    const NN = [], DD = [];
    function crystal(c) { NN.length = 0; DD.length = 0; for (let k = 0; k < 6; k++) { NN.push([Math.cos((k * Math.PI) / 3), Math.sin((k * Math.PI) / 3), 0]); DD.push(1); } NN.push([0, 0, 1], [0, 0, -1]); DD.push(c, c); }
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
    function frame3(cz) { // repère du cristal : axe c donné, rotation au hasard autour
      let r = [rnd(1, -1), rnd(1, -1), rnd(1, -1)]; const k = dot(r, cz); r = norm([r[0] - k * cz[0], r[1] - k * cz[1], r[2] - k * cz[2]]);
      return [r, cross(cz, r), cz];
    }
    function orient(type) {
      if (type === 0) { // plaquette : axe c vertical, à un degré près
        const t = Math.abs(gauss()) * 0.8 * D2R, a = rnd(TAU); return frame3([Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a), Math.cos(t)]);
      }
      if (type === 1) { // colonne : axe c horizontal, d'azimut quelconque
        const a = rnd(TAU), t = gauss() * 0.6 * D2R; return frame3(norm([Math.cos(a), Math.sin(a), Math.sin(t)]));
      }
      return frame3(norm([gauss(), gauss(), gauss()])); // en désordre
    }
    function fresnel(ci, n1, n2) { const s2 = ((n1 / n2) ** 2) * (1 - ci * ci); if (s2 >= 1) return 1; const ct = Math.sqrt(1 - s2), rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct), rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci); return (rs * rs + rp * rp) / 2; }
    const CH = [0.22, 2.2, 1]; // demi-hauteur : plaquette, colonne, désordre
    function trace(type, band) {
      crystal(CH[type]);
      const M = orient(type), n = BANDS[band].n;
      const din = [-s[0], -s[1], -s[2]];
      let d = [dot(din, M[0]), dot(din, M[1]), dot(din, M[2])]; // dans le repère du cristal
      // point d'entrée : un point au hasard du disque perpendiculaire au rayon (pondère les faces par leur surface apparente)
      const Rb = Math.hypot(1.1548, CH[type]), u = norm(cross(d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])), v = cross(d, u);
      const rr = Math.sqrt(Math.random()) * Rb, aa = rnd(TAU);
      const o = [u[0] * rr * Math.cos(aa) + v[0] * rr * Math.sin(aa) - d[0] * 10, u[1] * rr * Math.cos(aa) + v[1] * rr * Math.sin(aa) - d[1] * 10, u[2] * rr * Math.cos(aa) + v[2] * rr * Math.sin(aa) - d[2] * 10];
      let tin = -1e9, tout = 1e9, fin = -1;
      for (let k = 0; k < 8; k++) { const den = dot(NN[k], d), num = DD[k] - dot(NN[k], o); if (den < 0) { const t = num / den; if (t > tin) { tin = t; fin = k; } } else if (den > 0) { const t = num / den; if (t < tout) tout = t; } else if (num < 0) return false; }
      if (tin >= tout || fin < 0) return false;
      let p = [o[0] + d[0] * tin, o[1] + d[1] * tin, o[2] + d[2] * tin], N = NN[fin];
      let ci = -dot(d, N);
      if (Math.random() < fresnel(ci, 1, n)) { d = [d[0] + 2 * ci * N[0], d[1] + 2 * ci * N[1], d[2] + 2 * ci * N[2]]; return out(M, d, band, 0.6); }
      { const eta = 1 / n, ct = Math.sqrt(1 - eta * eta * (1 - ci * ci)); d = [eta * d[0] + (eta * ci - ct) * N[0], eta * d[1] + (eta * ci - ct) * N[1], eta * d[2] + (eta * ci - ct) * N[2]]; }
      for (let bnc = 0; bnc < 9; bnc++) {
        let t = 1e9, fk = -1;
        for (let k = 0; k < 8; k++) { const den = dot(NN[k], d); if (den > 1e-9) { const tt = (DD[k] - dot(NN[k], p)) / den; if (tt < t) { t = tt; fk = k; } } }
        if (fk < 0) return false;
        p = [p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t]; N = NN[fk]; ci = dot(d, N);
        const s2 = n * n * (1 - ci * ci);
        if (s2 >= 1 || Math.random() < fresnel(ci, n, 1)) { d = [d[0] - 2 * ci * N[0], d[1] - 2 * ci * N[1], d[2] - 2 * ci * N[2]]; continue; }
        const ct = Math.sqrt(1 - s2); d = [n * d[0] + (ct - n * ci) * N[0], n * d[1] + (ct - n * ci) * N[1], n * d[2] + (ct - n * ci) * N[2]];
        return out(M, d, band, 1);
      }
      return false;
    }
    function out(M, d, band, w) {
      // direction dans le ciel d'où la lumière semble venir
      const wd = [M[0][0] * d[0] + M[1][0] * d[1] + M[2][0] * d[2], M[0][1] * d[0] + M[1][1] * d[1] + M[2][1] * d[2], M[0][2] * d[0] + M[1][2] * d[1] + M[2][2] * d[2]];
      const vv = [-wd[0], -wd[1], -wd[2]];
      if (dot(vv, s) > 0.9997) return true; // la lumière qui traverse sans être déviée : noyée dans le soleil
      if (vv[2] < 0) return true; // le sol est opaque
      const pp = C.proj(vv); if (!pp) return true;
      const x = Math.floor(pp[0] * q), y = Math.floor(pp[1] * q); if (x < 0 || y < 0 || x >= GW || y >= GH) return true;
      const i = (y * GW + x) * 3, c = BANDS[band].c;
      acc[i] += c[0] * w; acc[i + 1] += c[1] * w; acc[i + 2] += c[2] * w;
      return true;
    }
    function setup() {
      const v = env.view || { x0: 0, x1: W };
      C = keep.proj === 'zenith' ? camera(W, H, v, { fish: true }) : camera(W, H, v, { yaw: 0, pitch: clamp(keep.hEl + 10, 25, 55) * D2R, vfov: 100 });
      s = sunVec(keep.hEl);
      acc.fill(0); nT = 0;
    }
    const sig = () => [keep.hEl, keep.proj, keep.mix.plaques, keep.mix.colonnes, keep.mix.desordre, (env.view || {}).x0, (env.view || {}).x1].join('|');
    // ciel : fond bleu, sol enneigé
    const bgL = layer(W, H); let bgKey = '';
    function paintBg() {
      const g = bgL.g;
      g.clearRect(0, 0, W, H);
      if (C.fish) {
        g.fillStyle = '#05070d'; g.fillRect(0, 0, W, H);
        const gr = g.createRadialGradient(C.cx, C.cy, 0, C.cx, C.cy, C.rf); gr.addColorStop(0, '#1d4f9a'); gr.addColorStop(0.75, '#4f86c8'); gr.addColorStop(1, '#a9c6e6');
        g.fillStyle = gr; g.beginPath(); g.arc(C.cx, C.cy, C.rf, 0, TAU); g.fill();
      } else {
        const hp = C.proj([1, 0, 0]), hy = hp ? hp[1] : H;
        const gr = g.createLinearGradient(0, 0, 0, hy); gr.addColorStop(0, '#163f86'); gr.addColorStop(0.6, '#3f78c0'); gr.addColorStop(1, '#a8c4e4');
        g.fillStyle = gr; g.fillRect(0, 0, W, hy);
        const sg = g.createLinearGradient(0, hy, 0, H); sg.addColorStop(0, '#d8e2ee'); sg.addColorStop(1, '#8e9fb4');
        g.fillStyle = sg; g.fillRect(0, hy, W, H - hy);
        g.fillStyle = 'rgba(60,80,100,.55)'; g.beginPath(); g.moveTo(0, hy + 2);
        for (let x = 0; x <= W; x += 14) g.lineTo(x, hy - 4 - 10 * Math.abs(Math.sin(x * 0.013)) - 6 * Math.abs(Math.sin(x * 0.041)));
        g.lineTo(W, hy + 2); g.fill();
      }
      bgKey = key;
    }
    const sparkles = Array.from({ length: 140 }, () => ({ x: rnd(1), y: rnd(1), p: rnd(TAU), f: rnd(3, 0.6) }));
    function guide(a, label) {
      const e1 = norm(cross(s, [0, 0, 1])), e2 = cross(e1, s);
      ctx.beginPath(); let on = false, lp = null;
      for (let k = 0; k <= 180; k++) {
        const t = (k / 180) * TAU, vv = [0, 1, 2].map((i) => Math.cos(a) * s[i] + Math.sin(a) * (Math.cos(t) * e1[i] + Math.sin(t) * e2[i]));
        const p = vv[2] > -0.05 ? C.proj(vv) : null;
        if (p) { if (on) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); on = true; if (!lp || p[1] < lp[1]) lp = p; } else on = false;
      }
      ctx.stroke();
      if (lp && label) ctx.fillText(label, lp[0] + 6, lp[1] - 6);
    }
    let T = 0;
    return {
      frame(t, dt) {
        T += dt;
        const k2 = sig(); if (k2 !== key) { key = k2; setup(); }
        // des rayons, encore et encore : l'image se précise
        const mix = [keep.mix.plaques, keep.mix.colonnes, keep.mix.desordre], ms = mix[0] + mix[1] + mix[2];
        if (ms > 0) {
          const t0 = performance.now();
          while (performance.now() - t0 < 14) {
            for (let r = 0; r < 400; r++) {
              let u = Math.random() * ms, type = 0; while (type < 2 && u > mix[type]) { u -= mix[type]; type++; }
              trace(type, rint(BANDS.length)); nT++;
            }
          }
        }
        if (bgKey !== key) paintBg();
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.drawImage(bgL.c, 0, 0);
        // l'image des halos
        const d = img.data, gain = (GW * GH) / Math.max(1, nT) * 0.5;
        for (let i = 0, j = 0; i < GW * GH; i++, j += 3) {
          const o = i * 4;
          d[o] = 255 * (1 - Math.exp(-acc[j] * gain)); d[o + 1] = 255 * (1 - Math.exp(-acc[j + 1] * gain)); d[o + 2] = 255 * (1 - Math.exp(-acc[j + 2] * gain)); d[o + 3] = 255;
        }
        cv.g.putImageData(img, 0, 0);
        ctx.globalCompositeOperation = 'screen'; ctx.imageSmoothingEnabled = true;
        ctx.drawImage(cv.c, 0, 0, W, H);
        // le soleil, éblouissant
        const sp = C.proj(s);
        if (sp) {
          const gr = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 60);
          gr.addColorStop(0, 'rgba(255,255,250,1)'); gr.addColorStop(0.1, 'rgba(255,255,245,1)'); gr.addColorStop(0.25, 'rgba(255,250,235,.3)'); gr.addColorStop(1, 'rgba(255,250,235,0)');
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(sp[0] - 60, sp[1] - 60, 120, 120);
        }
        // poussière de diamant : les cristaux tout près scintillent
        if (!C.fish) {
          ctx.fillStyle = '#fff';
          for (const sk of sparkles) { const a = Math.max(0, Math.sin(T * sk.f + sk.p)); if (a < 0.85) continue; ctx.globalAlpha = (a - 0.85) * 6; const x = (env.view ? env.view.x0 : 0) + sk.x * ((env.view ? env.view.x1 - env.view.x0 : W)), y = sk.y * H; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
          ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = 'source-over';
        if (keep.guides) {
          ctx.save(); ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(255,255,255,.75)';
          guide(22 * D2R, '22°'); guide(46 * D2R, '46°');
          ctx.restore();
        }
        const v = env.view || { x0: 0, x1: W }, x0 = v.x0 + 16;
        ctx.font = '500 11px "JetBrains Mono", monospace';
        let y = H - 18;
        txtLine(ctx, x0, y, `${(nT / 1e6).toFixed(1).replace('.', ',')} MILLION${nT >= 2e6 ? 'S' : ''} DE RAYONS · SOLEIL À ${fr(keep.hEl, 1)}°`, 'rgba(255,236,200,.95)'); y -= 20;
        if (keep.mix.plaques > 0.05) txtLine(ctx, x0, y, keep.hEl < 32.2 ? 'PLAQUETTES : PARHÉLIES DE PART ET D’AUTRE DU SOLEIL, ARC CIRCUMZÉNITHAL AU-DESSUS (SOLEIL SOUS 32°)' : 'SOLEIL AU-DESSUS DE 32° : L’ARC CIRCUMZÉNITHAL A DISPARU');
      },
      down(p) { drag.down(p); },
      move(p) { drag.move(p); },
      dispose() { drones.forEach((d) => d.stop()); },
      ui() {
        const L = [{ type: 'section', label: 'Les halos' }];
        L.push({ type: 'slider', label: 'Hauteur du soleil', min: 0, max: 60, step: 0.5, value: keep.hEl, fmt: (v) => fr(v, 1) + '°', set: (v) => { keep.hEl = v; } });
        L.push({ type: 'choice', label: 'Regard', value: keep.proj, options: [{ id: 'soleil', label: 'Vers le soleil' }, { id: 'zenith', label: 'Tout le ciel' }], set: (v) => { keep.proj = v; } });
        L.push({ type: 'slider', label: 'Plaquettes (tombent à plat)', min: 0, max: 1, step: 0.05, value: keep.mix.plaques, fmt: (v) => Math.round(v * 100) + ' %', set: (v) => { keep.mix.plaques = v; } });
        L.push({ type: 'slider', label: 'Colonnes (tombent couchées)', min: 0, max: 1, step: 0.05, value: keep.mix.colonnes, fmt: (v) => Math.round(v * 100) + ' %', set: (v) => { keep.mix.colonnes = v; } });
        L.push({ type: 'slider', label: 'Cristaux en désordre', min: 0, max: 1, step: 0.05, value: keep.mix.desordre, fmt: (v) => Math.round(v * 100) + ' %', set: (v) => { keep.mix.desordre = v; } });
        L.push({ type: 'buttons', items: [
          { label: 'Halo de 22° seul', act: () => { Object.assign(keep.mix, { plaques: 0, colonnes: 0, desordre: 1 }); } },
          { label: 'Parhélies', act: () => { Object.assign(keep.mix, { plaques: 1, colonnes: 0, desordre: 0.15 }); keep.hEl = Math.min(keep.hEl, 20); } },
          { label: 'Arc circumzénithal', act: () => { Object.assign(keep.mix, { plaques: 1, colonnes: 0, desordre: 0 }); keep.hEl = 18; keep.proj = 'zenith'; } },
          { label: 'Arcs tangents', act: () => { Object.assign(keep.mix, { plaques: 0, colonnes: 1, desordre: 0.2 }); } },
        ] });
        L.push({ type: 'toggle', label: 'Repères à 22° et 46°', value: keep.guides, set: (v) => { keep.guides = v; } });
        L.push({ type: 'note', text: 'Rien n’est dessiné à la main : chaque point de lumière est un rayon qui a traversé un cristal de glace hexagonal tiré au hasard (réfraction, réflexions, et la part de lumière réfléchie donnée par les formules de Fresnel). Montez le soleil : les parhélies s’écartent du halo de 22°, l’arc circumzénithal pâlit puis disparaît à 32°. Les cristaux en désordre donnent le halo de 22°, avec son bord intérieur rouge et net : aucun rayon ne peut être dévié de moins de 22°.' });
        return L;
      },
    };
  }
})();
