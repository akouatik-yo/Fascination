/* Fascinations — Le Moiré · deux transparents superposés (WebGL2) et l'ombro-cinéma
   Transparents : deux trames d'encre imprimées sur film, superposées (la lumière transmise est le produit des
   deux transparences). Rendues à la résolution de l'écran, lissées à la largeur d'un pixel près (fwidth) : le moiré
   doit naître des trames, pas de l'écran. Deux réseaux de pas p tournés d'un angle θ donnent des franges de pas
   p / (2 sin θ/2) : le moiré agrandit tout petit déplacement.
   Ombro-cinéma (« scanimation ») : six images entrelacées en bandes, sous une grille dont les fentes n'en laissent
   voir qu'une ; en glissant la grille, les images défilent. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');

  const TYPES = [['lignes', 'Lignes'], ['cercles', 'Cercles'], ['rayons', 'Rayons'], ['grille', 'Grille'], ['points', 'Trame de points'], ['fresnel', 'Zones de Fresnel'], ['spirale', 'Spirale'], ['soie', 'Soie (fibres ondulées)']];
  const TI = Object.fromEntries(TYPES.map(([k], i) => [k, i]));
  const PRESETS = [
    { id: 'lignes', label: 'Deux réseaux de lignes', a: 'lignes', b: 'lignes', p: 7, rot: 0.06, dx: 0, sc: 1, why: 'deux réseaux de lignes : tournez de quelques degrés, d’épaisses franges apparaissent à angle droit' },
    { id: 'cercles', label: 'Cercles décalés', a: 'cercles', b: 'cercles', p: 8, rot: 0, dx: 40, sc: 1, why: 'deux familles de cercles : les franges dessinent des hyperboles, exactement comme les interférences de deux sources' },
    { id: 'fresnel', label: 'Zones de Fresnel', a: 'fresnel', b: 'fresnel', p: 6, rot: 0, dx: 30, sc: 1, why: 'deux lentilles de Fresnel décalées : le moiré fait apparaître des lignes droites, parallèles et régulières' },
    { id: 'rayons', label: 'Rayons', a: 'rayons', b: 'rayons', p: 180, rot: 0.01, dx: 24, sc: 1, why: 'deux étoiles de rayons, décalées : des cercles fantômes apparaissent' },
    { id: 'grilles', label: 'Grilles', a: 'grille', b: 'grille', p: 9, rot: 0.05, dx: 0, sc: 1.02, why: 'deux grillages, comme des voilages qui flottent l’un devant l’autre' },
    { id: 'trame', label: 'Trames d’imprimerie', a: 'points', b: 'points', p: 6, rot: 0.26, dx: 0, sc: 1, why: 'deux trames de points : c’est pour éviter ce moiré que les imprimeurs inclinent chaque couleur de 30° (la « rosette »)' },
    { id: 'spirale', label: 'Spirale sur lignes', a: 'lignes', b: 'spirale', p: 7, rot: 0, dx: 0, sc: 1, why: 'une spirale sur des lignes : des yeux et des tourbillons qui changent dès qu’on bouge' },
    { id: 'soie', label: 'Soie moirée', a: 'soie', b: 'soie', p: 4, rot: 0.02, dx: 0, sc: 1.005, why: 'la soie moirée : deux couches de fils écrasées ensemble ; le tissu a donné son nom à tout le phénomène' },
  ];
  const keep = { scene: 'trans', preset: 'lignes', a: 'lignes', b: 'lignes', p: 7, rot: 0.06, dx: 0, dy: 0, sc: 1, auto: true, duty: 0.35, color: false, anim: 'oiseau', slide: true, frames: 6 };

  const FS = HEAD + `
uniform vec2 uRes, uC; uniform float uP, uRot, uSc, uDuty, uInk, uT, uColor; uniform vec2 uD; uniform int uA, uB;
out vec4 o;
float phase(int k, vec2 q, float p){
  float r = length(q), th = atan(q.y, q.x);
  if (k == 0) return q.x / p;
  if (k == 1) return r / p;
  if (k == 2) return th / 6.2832 * p;                        // p = nombre de rayons
  if (k == 5) return r * r / (p * 400.);
  if (k == 6) return r / p + th / 6.2832 * 3.;
  if (k == 7){ float w = sin(q.y * .011 + sin(q.x * .004) * 3.) * 14. + sin(q.y * .031 + q.x * .002) * 4.; return (q.x + w) / p; }
  return q.x / p;
}
float ink(int k, vec2 q, float p){
  // 1 = encre opaque, 0 = transparent ; lissé sur la largeur d'un pixel
  if (k == 3 || k == 4){
    vec2 f = q / p; vec2 w = fwidth(f);
    if (k == 3){ vec2 g = smoothstep(.5 - uDuty * .5 - w, .5 - uDuty * .5 + w, abs(fract(f) - .5)); return 1. - (1. - g.x) * (1. - g.y); }
    float d = length(fract(f) - .5), ww = length(w); return 1. - smoothstep(uDuty * .5 - ww, uDuty * .5 + ww, d);
  }
  float ph = phase(k, q, p), w = fwidth(ph);
  float d = abs(fract(ph) - .5) * 2.;                          // 0 au milieu du trait, 1 au milieu du vide
  return 1. - smoothstep(uDuty - w * 2., uDuty + w * 2., d);
}
void main(){
  vec2 q = gl_FragCoord.xy - uC;
  float t1 = 1. - ink(uA, q, uP);
  float cs = cos(uRot), sn = sin(uRot); vec2 q2 = (mat2(cs, sn, -sn, cs) * (q - uD)) / uSc;
  float t2 = 1. - ink(uB, q2, uB == 2 ? uP : uP);
  float light = t1 * t2;                                        // la lumière traverse les deux films
  vec3 c;
  if (uInk > .5) c = mix(vec3(.08, .07, .1), vec3(.965, .955, .93), light);
  else {
    vec3 a = uColor > .5 ? vec3(1., .35, .55) : vec3(.9, .92, 1.), b = uColor > .5 ? vec3(.3, .7, 1.) : vec3(.9, .92, 1.);
    c = uColor > .5 ? vec3(.02) + a * t1 * (1. - t2) * .0 + mix(vec3(.01, .01, .02), mix(a, b, .5), light) : mix(vec3(.01, .01, .02), vec3(.93, .94, 1.), light);
  }
  o = vec4(c, 1.);
}`;

  window.FASC.push({
    id: 'moire', name: 'Le Moiré', cat: 'Motifs', glyph: '◎', smoothTime: true,
    blurb: 'Deux trames qui se frôlent, et des formes qui n’existent dans aucune',
    hint: 'Glissez pour faire bouger le transparent du dessus ; outil tourner pour le faire pivoter.',
    intro: 'Superposez deux voilages, deux grillages, deux pages de lignes : de larges franges apparaissent, qui ne sont dessinées sur aucun des deux. Elles bougent beaucoup plus vite que ce qu’on déplace. Le moiré est une loupe à mouvements ; c’est aussi, avec les fentes qui glissent, le principe de jouets d’animation centenaires.',
    about: [
      'Le mot vient d’un tissu : le « mohair », devenu « moire » en français, une étoffe dont on écrasait deux couches pour leur donner des reflets ondoyants. Il a fini par désigner le phénomène lui-même, dans toutes les langues.',
      'Deux réseaux de lignes de pas p, tournés d’un petit angle θ, produisent des franges de pas p / (2 sin(θ/2)) : à 2°, elles sont presque trente fois plus larges que les lignes, et se déplacent trente fois plus vite que le transparent. Les mécaniciens s’en servent pour mesurer des déformations invisibles ; les monnaies et passeports s’en servent contre la contrefaçon ; les photographes le maudissent quand une chemise rayée rencontre le capteur.',
      'Mathématiquement, le moiré est un battement : la superposition de deux fréquences spatiales voisines fait apparaître leur différence, comme deux notes presque accordées font entendre un battement lent. Deux familles de cercles décalés donnent les mêmes hyperboles que les interférences de deux sources ; deux zones de Fresnel décalées donnent des lignes droites.',
      'L’ombro-cinéma (vers 1900) et le « scanimation » de Rufus Butler Seder (2007) : six images d’un mouvement, découpées en bandes fines et entrelacées ; une grille transparente percée d’une fente toutes les six bandes n’en laisse voir qu’une. Glissez la grille d’une bande : l’image suivante apparaît. Le mouvement naît de la persistance rétinienne, comme au cinéma.',
    ],
    tools: [{ id: 'glisser', label: 'glisser', desc: 'Faites glisser le transparent du dessus (ou la grille de l’ombro-cinéma).' }, { id: 'tourner', label: 'tourner', desc: 'Faites-le pivoter autour du centre.' }],
    make(env) {
      try { return makeM(env); } catch (e) {
        console.warn('Le Moiré : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#05050a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Le Moiré demande WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeM(env) {
    const ctx = env.ctx, W = env.w, H = env.h;
    const dpr = Math.min(2, env.dpr || 1), cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    const K = GLKit(cw, ch), gl = K.gl;
    const P = K.program(FS);
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const ink = () => env.theme === 'light';
    let T = 0, toast = null, base = { rot: keep.rot, dx: keep.dx, dy: keep.dy };
    const say = (s) => { toast = { s, t: T }; };

    function applyPreset(id) {
      const p = PRESETS.find((q) => q.id === id); keep.preset = id;
      Object.assign(keep, { a: p.a, b: p.b, p: p.p, rot: p.rot, dx: p.dx, dy: 0, sc: p.sc });
      base = { rot: p.rot, dx: p.dx, dy: 0 }; say(p.why[0].toUpperCase() + p.why.slice(1) + '.');
    }

    /* ───────── ombro-cinéma : six images entrelacées ───────── */
    const IC = document.createElement('canvas'), ic = IC.getContext('2d');
    let IW = 0, IH = 0, band = 3, slideX = 0;
    const ANIMS = { oiseau: 'Oiseau', coureur: 'Coureur', balle: 'Balle', fleur: 'Fleur qui tourne', cheval: 'Cheval au galop' };
    function frameDraw(g, k, n, w, h, dk) {
      const ph = k / n, cx = w / 2, cy = h / 2, s = Math.min(w, h) * 0.38, col = dk ? '#f2eee6' : '#16141c';
      g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
      if (keep.anim === 'oiseau') {
        const a = Math.sin(ph * TAU) * 0.9;
        g.beginPath(); g.ellipse(cx, cy, s * 0.32, s * 0.12, 0, 0, TAU); g.fill();
        g.beginPath(); g.arc(cx + s * 0.34, cy - s * 0.05, s * 0.09, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(cx + s * 0.42, cy - s * 0.05); g.lineTo(cx + s * 0.55, cy - s * 0.02); g.lineTo(cx + s * 0.42, cy); g.fill();
        g.beginPath(); g.moveTo(cx - s * 0.3, cy); g.lineTo(cx - s * 0.55, cy - s * 0.12); g.lineTo(cx - s * 0.52, cy + s * 0.08); g.fill();
        const tip = [cx - s * 0.02, cy - Math.sin(a) * s * 0.9]; // l'aile, vue de profil, qui monte et descend
        g.beginPath(); g.moveTo(cx - s * 0.16, cy); g.quadraticCurveTo(cx - s * 0.2, (cy + tip[1]) / 2, tip[0], tip[1]); g.quadraticCurveTo(cx + s * 0.12, (cy + tip[1]) / 2, cx + s * 0.16, cy); g.fill();
      } else if (keep.anim === 'coureur') {
        const t = ph * TAU, L = s * 0.42, hip = [cx, cy + s * 0.05 + Math.abs(Math.sin(t)) * -s * 0.06], sh = [cx + s * 0.06, cy - s * 0.38 + hip[1] - cy - s * 0.05];
        g.lineWidth = s * 0.08;
        const limb = (o, a1, a2, l) => { const k1 = [o[0] + Math.sin(a1) * l, o[1] + Math.cos(a1) * l], k2 = [k1[0] + Math.sin(a2) * l, k1[1] + Math.cos(a2) * l]; g.beginPath(); g.moveTo(...o); g.lineTo(...k1); g.lineTo(...k2); g.stroke(); };
        limb(hip, Math.sin(t) * 0.8, Math.sin(t) * 0.8 - 0.9 - Math.max(0, Math.cos(t)) * 0.8, L); limb(hip, -Math.sin(t) * 0.8, -Math.sin(t) * 0.8 - 0.9 - Math.max(0, -Math.cos(t)) * 0.8, L);
        g.beginPath(); g.moveTo(...hip); g.lineTo(...sh); g.stroke();
        limb(sh, Math.PI - Math.sin(t) * 0.9 - 0.2, Math.PI - Math.sin(t) * 0.9 + 1.4, L * 0.7); limb(sh, Math.PI + Math.sin(t) * 0.9 - 0.2, Math.PI + Math.sin(t) * 0.9 + 1.4, L * 0.7);
        g.beginPath(); g.arc(sh[0] + s * 0.04, sh[1] - s * 0.16, s * 0.11, 0, TAU); g.fill();
      } else if (keep.anim === 'balle') {
        const u = ph, y = cy + s * 0.6 - Math.abs(Math.sin(u * Math.PI)) * s * 1.1, sq = u < 0.08 || u > 0.92 ? 1.35 : 1;
        g.beginPath(); g.ellipse(cx, y, s * 0.18 * sq, s * 0.18 / sq, 0, 0, TAU); g.fill();
        g.fillRect(cx - s * 0.8, cy + s * 0.6 + s * 0.18, s * 1.6, s * 0.04);
      } else if (keep.anim === 'fleur') {
        g.save(); g.translate(cx, cy); g.rotate((ph * TAU) / 6);
        for (let i = 0; i < 6; i++) { g.rotate(TAU / 6); g.beginPath(); g.ellipse(0, -s * 0.4, s * 0.13, s * 0.36, 0, 0, TAU); g.fill(); }
        g.restore(); g.fillStyle = dk ? '#16141c' : '#f4f0e8'; g.beginPath(); g.arc(cx, cy, s * 0.12, 0, TAU); g.fill();
      } else {
        // cheval au galop, très stylisé (d'après les phases de Muybridge, 1878)
        const t = ph * TAU, by = cy - s * 0.05 + Math.sin(t * 1) * s * 0.04;
        g.beginPath(); g.ellipse(cx, by, s * 0.42, s * 0.16, -0.05, 0, TAU); g.fill();
        g.lineWidth = s * 0.07;
        g.beginPath(); g.moveTo(cx + s * 0.32, by - s * 0.05); g.lineTo(cx + s * 0.52, by - s * 0.32); g.stroke();
        g.beginPath(); g.ellipse(cx + s * 0.6, by - s * 0.32, s * 0.14, s * 0.07, 0.5, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(cx - s * 0.4, by - s * 0.05); g.quadraticCurveTo(cx - s * 0.6, by - s * 0.1, cx - s * 0.62 + Math.sin(t) * s * 0.05, by + s * 0.2); g.stroke();
        const leg = (x, a, b) => { const k = [x + Math.sin(a) * s * 0.22, by + s * 0.12 + Math.cos(a) * s * 0.22]; g.beginPath(); g.moveTo(x, by + s * 0.08); g.lineTo(...k); g.lineTo(k[0] + Math.sin(b) * s * 0.22, k[1] + Math.cos(b) * s * 0.22); g.stroke(); };
        leg(cx + s * 0.28, Math.sin(t) * 0.7, Math.sin(t) * 0.7 - 0.6 * Math.max(0, Math.sin(t + 1)));
        leg(cx + s * 0.2, Math.sin(t + 0.6) * 0.7, Math.sin(t + 0.6) * 0.7 - 0.6 * Math.max(0, Math.sin(t + 1.6)));
        leg(cx - s * 0.28, Math.sin(t + 2.6) * 0.7, Math.sin(t + 2.6) * 0.7 + 0.6 * Math.max(0, Math.sin(t + 3)));
        leg(cx - s * 0.2, Math.sin(t + 3.2) * 0.7, Math.sin(t + 3.2) * 0.7 + 0.6 * Math.max(0, Math.sin(t + 3.6)));
      }
    }
    function buildScan() {
      const v = view(), n = keep.frames; IW = Math.round(Math.min(v.w * 0.8, H * 1.1)); IH = Math.round(Math.min(H * 0.62, IW * 0.7));
      band = Math.max(2, Math.round(IW / 220));
      IC.width = IW; IC.height = IH;
      const dk = !ink(), f = document.createElement('canvas'); f.width = IW; f.height = IH; const fg = f.getContext('2d');
      ic.fillStyle = dk ? '#16141c' : '#f4f0e8'; ic.fillRect(0, 0, IW, IH);
      for (let k = 0; k < n; k++) {
        fg.clearRect(0, 0, IW, IH); frameDraw(fg, k, n, IW, IH, dk);
        // ne garder que les bandes n° k modulo n
        ic.save(); ic.beginPath(); for (let x = k * band; x < IW; x += n * band) ic.rect(x, 0, band, IH); ic.clip(); ic.drawImage(f, 0, 0); ic.restore();
      }
    }
    function drawScan() {
      const v = view(), x0 = Math.round(v.cx - IW / 2), y0 = Math.round(H / 2 - IH / 2 - 10), n = keep.frames;
      ctx.fillStyle = ink() ? '#e9e3d6' : '#08070c'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(IC, x0, y0);
      // la grille : opaque partout sauf une fente toutes les n bandes ; elle dépasse un peu de l'image
      const gx0 = x0 - 40 + (((slideX % (n * band)) + n * band) % (n * band));
      ctx.fillStyle = ink() ? 'rgba(20,18,26,.94)' : 'rgba(4,4,8,.95)';
      for (let x = gx0 - n * band; x < x0 + IW + 40; x += n * band) ctx.fillRect(Math.round(x + band), y0 - 20, (n - 1) * band, IH + 40);
      ctx.strokeStyle = ink() ? 'rgba(40,30,60,.35)' : 'rgba(235,230,255,.25)'; ctx.strokeRect(x0 - 40.5, y0 - 20.5, IW + 81, IH + 41);
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink() ? 'rgba(40,30,60,.8)' : 'rgba(235,230,255,.78)';
      ctx.fillText(`${n} IMAGES ENTRELACÉES EN BANDES DE ${band} PX · FENTE TOUTES LES ${n} BANDES · IMAGE VISIBLE : ${Math.floor(((((-slideX) % (n * band)) + n * band) % (n * band)) / band) + 1}`, v.x0 + 18, H - 16);
    }

    /* ───────── transparents ───────── */
    function renderTrans() {
      const v = view(), auto = keep.auto ? T : 0;
      const rot = keep.rot + (keep.auto ? Math.sin(auto * 0.07) * 0.035 : 0), dx = keep.dx + (keep.auto ? Math.sin(auto * 0.05) * 18 : 0), dy = keep.dy + (keep.auto ? Math.cos(auto * 0.043) * 10 : 0);
      P.use().f('uRes', cw, ch).f('uC', v.cx * dpr, (H / 2) * dpr).f('uP', keep.a === 'rayons' ? keep.p : keep.p * dpr).f('uRot', rot).f('uSc', keep.sc).f('uDuty', keep.duty).f('uInk', ink() ? 1 : 0).f('uT', T).f('uColor', keep.color ? 1 : 0)
        .f('uD', dx * dpr, -dy * dpr).i('uA', TI[keep.a]).i('uB', TI[keep.b]);
      K.run(P, null);
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      ctx.font = '500 11px "JetBrains Mono", monospace'; const txt = `ANGLE ${fr((rot * 180) / Math.PI, 2)}° · DÉCALAGE ${fr(Math.hypot(dx, dy), 0)} PX · ÉCHELLE ×${fr(keep.sc, 3)}`;
      const lines = keep.a === 'lignes' && keep.b === 'lignes' && Math.abs(rot) > 0.002 ? ` · FRANGES TOUS LES ${fr(keep.p / (2 * Math.sin(Math.abs(rot) / 2)), 0)} PX (${fr(1 / (2 * Math.sin(Math.abs(rot) / 2)), 0)} × LE PAS DES LIGNES)` : '';
      const w = ctx.measureText(txt + lines).width + 20;
      ctx.fillStyle = ink() ? 'rgba(255,255,255,.8)' : 'rgba(6,6,12,.75)'; ctx.fillRect(v.x0 + 10, H - 32, w, 22);
      ctx.fillStyle = ink() ? 'rgba(40,30,60,.85)' : 'rgba(235,230,255,.85)'; ctx.fillText(txt + lines, v.x0 + 20, H - 16);
    }
    function render() {
      if (keep.scene === 'trans') renderTrans(); else drawScan();
      if (toast && T - toast.t < 6) { const v = view(); ctx.globalAlpha = Math.min(1, (6 - (T - toast.t)) * 1.2); ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; const w = ctx.measureText(toast.s).width; ctx.fillStyle = ink() ? 'rgba(255,255,255,.85)' : 'rgba(6,6,12,.7)'; ctx.fillRect(v.cx - w / 2 - 12, 52, w + 24, 28); ctx.fillStyle = ink() ? '#2a2238' : '#fff'; ctx.textAlign = 'center'; ctx.fillText(toast.s, v.cx, 71); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    }
    function update(k) { T += k; if (keep.scene === 'scan' && keep.slide && !drag) slideX -= k * band * 9; }
    function setScene(id) { keep.scene = id; toast = null; if (id === 'scan') { buildScan(); say('Six images en une : la grille qui glisse n’en laisse voir qu’une à la fois.'); } }
    let drag = null;
    applyPreset(keep.preset);
    if (keep.scene === 'scan') buildScan();
    if (window.FASC_DEBUG) window.FASC_DEBUG.moire = { keep, setScene, applyPreset, buildScan, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); } };

    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) { const v = view(); drag = { x: p.x, y: p.y, a: Math.atan2(p.y - H / 2, p.x - v.cx) }; },
      move(p) {
        if (!p.down || !drag) return;
        const v = view();
        if (keep.scene === 'scan') slideX += p.x - drag.x;
        else if (env.tool === 'tourner') { const a = Math.atan2(p.y - H / 2, p.x - v.cx); let d = a - drag.a; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; keep.rot = clamp(keep.rot - d * 0.25, -0.8, 0.8); drag.a = a; }
        else { keep.dx += (p.x - drag.x) * 0.5; keep.dy += (p.y - drag.y) * 0.5; }
        drag.x = p.x; drag.y = p.y;
      },
      up() { drag = null; },
      clear() { if (keep.scene === 'trans') applyPreset(keep.preset); else slideX = 0; },
      dispose() { K.lose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [{ label: 'Transparents', act: () => setScene('trans') }, { label: 'Ombro-cinéma', act: () => setScene('scan') }] }];
        if (keep.scene === 'trans') {
          L.push({ type: 'section', label: 'Transparents' });
          L.push({ type: 'choice', label: 'Expérience', value: keep.preset, set: (x) => applyPreset(x), options: PRESETS.map((p) => ({ id: p.id, label: p.label })) });
          L.push({ type: 'choice', label: 'Film du dessous', value: keep.a, set: (x) => { keep.a = x; }, options: TYPES.map(([id, label]) => ({ id, label })) });
          L.push({ type: 'choice', label: 'Film du dessus', value: keep.b, set: (x) => { keep.b = x; }, options: TYPES.map(([id, label]) => ({ id, label })) });
          L.push({ type: 'slider', label: 'Angle', min: -0.5, max: 0.5, step: 0.001, value: keep.rot, fmt: (x) => fr((x * 180) / Math.PI, 2) + '°', set: (x) => { keep.rot = x; } });
          L.push({ type: 'slider', label: 'Échelle du dessus', min: 0.95, max: 1.05, step: 0.0005, value: keep.sc, fmt: (x) => '×' + fr(x, 4), set: (x) => { keep.sc = x; } });
          L.push({ type: 'slider', label: keep.a === 'rayons' ? 'Nombre de rayons' : 'Pas des traits', min: keep.a === 'rayons' ? 60 : 3, max: keep.a === 'rayons' ? 360 : 20, step: 1, value: keep.p, fmt: (x) => (keep.a === 'rayons' ? x + ' rayons' : x + ' px'), set: (x) => { keep.p = x; } });
          L.push({ type: 'slider', label: 'Épaisseur de l’encre', min: 0.15, max: 0.85, step: 0.01, value: keep.duty, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.duty = x; } });
          L.push({ type: 'toggle', label: 'Dérive lente', value: keep.auto, set: (x) => { keep.auto = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Remettre d’équerre', act: () => { keep.rot = 0; keep.dx = 0; keep.dy = 0; keep.sc = 1; } }] });
          L.push({ type: 'note', text: PRESETS.find((p) => p.id === keep.preset).why[0].toUpperCase() + PRESETS.find((p) => p.id === keep.preset).why.slice(1) + '. Glissez : le moiré bouge bien plus vite que votre doigt.' });
        } else {
          L.push({ type: 'section', label: 'Ombro-cinéma' });
          L.push({ type: 'choice', label: 'Animation', value: keep.anim, set: (x) => { keep.anim = x; buildScan(); }, options: Object.keys(ANIMS).map((k) => ({ id: k, label: ANIMS[k] })) });
          L.push({ type: 'slider', label: 'Images entrelacées', min: 3, max: 10, step: 1, value: keep.frames, fmt: (x) => String(x), set: (x) => { keep.frames = x; buildScan(); } });
          L.push({ type: 'toggle', label: 'La grille glisse toute seule', value: keep.slide, set: (x) => { keep.slide = x; } });
          L.push({ type: 'note', text: 'Arrêtez la grille et faites-la glisser au doigt, lentement : chaque déplacement d’une bande fait avancer l’image d’une étape. Sans la grille, l’image entrelacée est illisible.' });
        }
        return L;
      },
    };
  }
})();
