/* Fascinations — La Danse des abeilles · comment une butineuse indique une source de nourriture (von Frisch)
   Dans la ruche sombre, sur le rayon vertical, une butineuse de retour danse en huit. Pendant la course
   frétillante, l'angle de sa course avec la verticale est l'angle entre la source et le soleil ; la durée du
   frétillement croît avec la distance (environ 1 s par km ; la valeur varie selon les colonies). Pour une source
   proche, elle danse en rond, sans direction. Les recrues la suivent au contact, puis partent dans la direction
   indiquée, avec une erreur (le suivi par radar l'a montré : Riley et al., 2005).
   Rendu WebGL2 développé par la cabine commune (FKGL.cabine, dans FKR) ; repli en 2D sans WebGL2. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const deg = (a) => (a * 180) / Math.PI;
  const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.22;
  // gardés d'une construction à l'autre : rien ne se réinitialise sans demande
  const keep = { scene: 'fretillante', cfg: null };

  window.FASC.push({
    id: 'abeilles', name: 'La Danse des abeilles', cat: 'Vivant', glyph: '⬡', smoothTime: true,
    blurb: 'Une danse qui dit où sont les fleurs',
    hint: 'OBSERVER : touchez une abeille ou une cellule · FLEURS : touchez la carte pour déplacer la source de nourriture.',
    intro: 'Une butineuse revient d’un champ de fleurs. Dans la ruche, sur le rayon vertical, elle danse en huit. La direction de sa course frétillante par rapport à la verticale est celle des fleurs par rapport au soleil, et plus elle frétille longtemps, plus les fleurs sont loin. Les ouvrières qui la suivent au contact partent ensuite chercher les fleurs, dans la bonne direction mais avec une erreur.',
    legend: [
      { color: '#7fb2ff', name: 'Apis mellifera', role: 'la danseuse · marquée à la peinture', desc: 'Une butineuse de retour, marquée d’un point de peinture sur le thorax, comme le faisait Karl von Frisch pour suivre chaque abeille. Elle danse en huit : une course frétillante, puis un demi-tour, à gauche puis à droite.' },
      { color: '#ffd27a', name: 'Apis mellifera', role: 'les suiveuses, puis les recrues', desc: 'Elles suivent la danseuse au contact, antennes contre son corps : la ruche est sombre, elles sentent la danse plus qu’elles ne la voient. Elles sentent aussi l’odeur du nectar rapporté. Après quelques tours, elles partent.' },
      { color: '#e8a83c', name: 'Le rayon', role: 'cire · miel, pain d’abeille, couvain', desc: 'Des cellules hexagonales de cire : du miel en haut, du pollen (le « pain d’abeille ») autour, le couvain au centre. La danse a lieu près de l’entrée, sur la « piste de danse ».' },
      { color: '#ffe080', name: 'Le soleil', role: 'la référence de la danse', desc: 'Dehors, l’angle se mesure par rapport au soleil ; dans la ruche, par rapport à la verticale. Le soleil tourne dans le ciel (lentement le matin et le soir, vite vers midi) : la danse tourne avec lui.' },
    ],
    about: [
      'Karl von Frisch a décodé la danse des abeilles à partir de 1945, en marquant les abeilles et en déplaçant des sources de sucre. Il a reçu le prix Nobel en 1973, avec Konrad Lorenz et Nikolaas Tinbergen.',
      'La course frétillante code la direction : sur le rayon vertical, « en haut » correspond à la direction du soleil. Si les fleurs sont à 60° à droite du soleil, la danseuse court à 60° à droite de la verticale. Elle code aussi la distance : environ une seconde de frétillement par kilomètre, une valeur qui varie selon les colonies et les sous-espèces.',
      'Pour une source toute proche, à moins de 50 à 100 mètres, la danse devient une ronde, sans direction : les recrues cherchent alors autour de la ruche, guidées par l’odeur du nectar.',
      'En 2005, l’équipe de Joe Riley a suivi des recrues au radar : elles partent bien dans la direction indiquée, à quelques degrés près, puis cherchent autour de l’endroit prévu.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une abeille pour savoir ce qu’elle fait, ou une cellule pour savoir ce qu’elle contient.' },
      { id: 'fleurs', label: 'fleurs', desc: 'Touchez la carte du dehors pour y déplacer le champ de fleurs : la danse change d’angle et de durée.' },
    ],
    make(env) {
      const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
      const cfg = keep.cfg || (keep.cfg = { dist: 1.5, cap: 120, heure: 11, spk: 1, trace: true, angles: true, jour: false });
      const mobile = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent) || Math.min(W, H) < 520;
      let VT = 0, label = null;

      /* ───────── géométrie : le rayon à gauche, la carte du dehors à droite (ou en bas) ───────── */
      function geo() {
        const v = env.view || { x0: 0, x1: W }, y0 = v.y0 || 0, w = v.x1 - v.x0, h = H - y0;
        if (w > h * 1.15) {
          const mw = Math.min(w * 0.36, h * 0.78), mx = v.x1 - mw - 14, my = y0 + (h - mw) * 0.42;
          return { comb: { x: v.x0, y: y0, w: mx - 16 - v.x0, h }, map: { x: mx, y: my, w: mw, h: mw } };
        }
        const mh = Math.min(h * 0.36, w * 0.9), mw = Math.min(w - 24, mh * 1.4);
        return { comb: { x: v.x0, y: y0, w, h: h - mh - 24 }, map: { x: v.x0 + (w - mw) / 2, y: H - mh - 12, w: mw, h: mh } };
      }
      let G0 = geo();
      // on regarde de près la piste de danse (zoom ×2) : des abeilles plus grandes, moins nombreuses à l'écran
      const ZB = 2, kS = clamp(Math.min(W, H) / 800, 0.7, 1.3), BEE = 38 * kS * ZB;   // longueur d'une abeille (px) : environ 2,2 cellules
      const CELL = BEE / 3.6;                                                   // rayon d'une cellule hexagonale (px)

      /* ───────── le soleil et la source ───────── */
      // azimut du soleil (rad, depuis le nord, sens horaire), calculé pour 48° de latitude nord le 21 juin (déclinaison 23,44°),
      // midi solaire vers 13 h 50 (heure d'été, en France). L'angle horaire tourne de 15° par heure ; l'azimut, lui, avance
      // lentement le matin et le soir, et vite autour de midi.
      const LAT = (48 * Math.PI) / 180, DEC = (23.44 * Math.PI) / 180;
      const sunAz = () => { const Hh = ((cfg.heure - 13.83) * 15 * Math.PI) / 180; return Math.PI + Math.atan2(Math.sin(Hh), Math.cos(Hh) * Math.sin(LAT) - Math.tan(DEC) * Math.cos(LAT)); };
      const foodAz = () => (cfg.cap * Math.PI) / 180;
      const alpha = () => wrap(foodAz() - sunAz());                             // angle de la source par rapport au soleil (horaire)
      const ronde = () => cfg.dist < 0.09;

      /* ───────── les abeilles ───────── */
      const B = [];
      const combR = () => geo().comb;
      function bee(kind) {
        const c = combR();
        const b = { kind, x: c.x + rnd(c.w * 0.92, c.w * 0.04), y: c.y + rnd(c.h * 0.92, c.h * 0.05), a: rnd(TAU), v: 0, ph: rnd(TAU), t: 0, follow: 0, runs: 0, wob: 0, buzz: 0, out: false };
        B.push(b);
        return b;
      }
      const N = Math.round(((mobile ? 50 : 80) * clamp((G0.comb.w * G0.comb.h) / 600000, 0.5, 1.4)) / (ZB * ZB));
      for (let i = 0; i < N; i++) bee('ouvriere');
      const dancer = bee('danseuse');
      // la danse : un huit autour de son centre, sur la « piste de danse » près de l'entrée (en bas du rayon)
      const D = { cx: 0, cy: 0, phase: 'retour', t: 0, side: 1, run: 0, runs: 0 };
      function placeDance() { const c = combR(); D.cx = c.x + c.w * 0.5; D.cy = c.y + c.h * 0.62; dancer.x = D.cx; dancer.y = D.cy; }
      placeDance();
      const flights = [];   // les recrues dehors : départ, cap, distance prévue

      // durée de la course frétillante (s) et longueur parcourue (px)
      const wagDur = () => Math.max(0.25, cfg.dist * cfg.spk);
      function stepDance(dt) {
        const up = -Math.PI / 2, th = up + alpha();                              // direction de la course : alpha à droite de la verticale
        const runLen = BEE * (0.9 + 0.25 * Math.min(4, wagDur()));
        D.t += dt;
        if (ronde()) {
          // danse en rond : de petits cercles, alternativement dans un sens puis dans l'autre, sans course frétillante
          const per = 1.4, k = (D.t % per) / per;
          if (D.t > per) { D.t -= per; D.side = -D.side; D.runs++; }
          const ang = D.side * k * TAU, r = BEE * 0.55;
          const x = D.cx + Math.cos(ang - Math.PI / 2) * r * D.side, y = D.cy + r + Math.sin(ang - Math.PI / 2) * r;
          dancer.a = Math.atan2(y - dancer.y, x - dancer.x) || dancer.a; dancer.x = x; dancer.y = y; dancer.wob = 0;
          return;
        }
        if (D.phase === 'frétille') {
          const k = Math.min(1, D.t / wagDur());
          const x0 = D.cx - Math.cos(th) * runLen / 2, y0 = D.cy - Math.sin(th) * runLen / 2;
          dancer.x = x0 + Math.cos(th) * runLen * k; dancer.y = y0 + Math.sin(th) * runLen * k; dancer.a = th;
          dancer.wob = Math.sin(VT * TAU * 13) * BEE * 0.09;                    // l'abdomen frétille vers 13 battements par seconde
          if (D.t >= wagDur()) { D.phase = 'retour'; D.t = 0; D.runs++; dancer.wob = 0; }
        } else {
          // demi-tour : un demi-cercle qui ramène au départ, à gauche puis à droite
          const per = 1.1, k = Math.min(1, D.t / per);
          const ex = D.cx + Math.cos(th) * runLen / 2, ey = D.cy + Math.sin(th) * runLen / 2;
          const sx = D.cx - Math.cos(th) * runLen / 2, sy = D.cy - Math.sin(th) * runLen / 2;
          const mx = (ex + sx) / 2, my = (ey + sy) / 2, r = runLen / 2;
          const a0 = th, ang = a0 + D.side * Math.PI * k;
          const x = mx + Math.cos(ang) * r, y = my + Math.sin(ang) * r;
          dancer.a = Math.atan2(y - dancer.y, x - dancer.x) || dancer.a; dancer.x = x; dancer.y = y; dancer.wob = 0;
          if (D.t >= per) { D.phase = 'frétille'; D.t = 0; D.side = -D.side; if (snd()) au.noise(Math.min(0.5, wagDur()), 0.012, 260, 6, 'bandpass'); }
        }
      }
      const trace = [];
      function stepBees(dt) {
        const c = combR();
        let nf = 0;
        for (const b of B) {
          if (b === dancer || b.out) continue;
          const dx = dancer.x - b.x, dy = dancer.y - b.y, d = Math.hypot(dx, dy) || 1;
          if (b.kind === 'suiveuse') {
            nf++;
            // au contact : derrière la danseuse, antennes vers elle
            const tx = dancer.x - Math.cos(dancer.a + b.ph * 0.6) * BEE * (0.85 + 0.15 * Math.sin(b.ph)), ty = dancer.y - Math.sin(dancer.a + b.ph * 0.6) * BEE * (0.85 + 0.15 * Math.sin(b.ph));
            b.x += (tx - b.x) * Math.min(1, dt * 3.2); b.y += (ty - b.y) * Math.min(1, dt * 3.2);
            b.a += wrap(Math.atan2(dy, dx) - b.a) * Math.min(1, dt * 5);
            if (D.runs - b.runs >= b.follow) {
              // elle a suivi assez de tours : elle part vers l'entrée, puis s'envole
              b.kind = 'recrue';
            }
            continue;
          }
          if (b.kind === 'recrue') {
            const ex = c.x + c.w * 0.5, ey = c.y + c.h + BEE;
            const a = Math.atan2(ey - b.y, ex - b.x);
            b.a += wrap(a - b.a) * Math.min(1, dt * 4); b.x += Math.cos(b.a) * BEE * 2.2 * dt; b.y += Math.sin(b.a) * BEE * 2.2 * dt;
            if (b.y > c.y + c.h + BEE * 0.5) {
              b.out = true;
              // dehors : elle part dans la direction indiquée, avec une erreur de quelques degrés, et vole la distance indiquée, à 20 % près
              const err = ronde() ? rnd(Math.PI, -Math.PI) : gauss() * 0.22;
              flights.push({ az: ronde() ? foodAz() + err : foodAz() + err, d: ronde() ? cfg.dist * rnd(1.6, 0.3) : cfg.dist * (1 + gauss() * 0.18), t: 0, b });
            }
            continue;
          }
          // les autres ouvrières : elles marchent lentement, font place à la danseuse, et certaines se mettent à la suivre
          b.t -= dt;
          if (b.t <= 0) { b.t = rnd(3, 0.6); b.v = Math.random() < 0.35 ? rnd(0.9, 0.2) * BEE : 0; b.a += rnd(1.5, -1.5); }
          if (d < BEE * 1.25) { b.x -= (dx / d) * BEE * dt * 1.5; b.y -= (dy / d) * BEE * dt * 1.5; }
          else if (d < BEE * 2.6 && nf < 6 && Math.random() < dt * 0.25 && !ronde() || (ronde() && d < BEE * 2.4 && nf < 5 && Math.random() < dt * 0.2)) { b.kind = 'suiveuse'; b.follow = 3 + Math.floor(Math.random() * 4); b.runs = D.runs; b.ph = rnd(1.2, -1.2); continue; }
          b.x += Math.cos(b.a) * b.v * dt; b.y += Math.sin(b.a) * b.v * dt;
          if (b.x < c.x + BEE * 0.4) b.a = 0; else if (b.x > c.x + c.w - BEE * 0.4) b.a = Math.PI;
          if (b.y < c.y + BEE * 0.4) b.a = Math.PI / 2; else if (b.y > c.y + c.h - BEE * 0.4) b.a = -Math.PI / 2;
          b.x = clamp(b.x, c.x, c.x + c.w); b.y = clamp(b.y, c.y, c.y + c.h);
        }
        // de nouvelles butineuses rentrent par l'entrée pour remplacer les recrues parties
        for (let i = B.length - 1; i >= 0; i--) if (B[i].out) { const b = B[i]; b.out = false; b.kind = 'ouvriere'; b.x = c.x + c.w * rnd(0.6, 0.4); b.y = c.y + c.h - BEE * 0.3; b.a = -Math.PI / 2; }
        for (let i = flights.length - 1; i >= 0; i--) { const f = flights[i]; f.t += dt; if (f.t > 9) flights.splice(i, 1); }
        if (cfg.trace && !ronde()) { trace.push([dancer.x, dancer.y, D.phase === 'frétille' ? 1 : 0]); if (trace.length > 360) trace.shift(); }
        else if (cfg.trace) { trace.push([dancer.x, dancer.y, 0]); if (trace.length > 240) trace.shift(); }
      }

      /* ───────── le rayon et les abeilles en WebGL2 ───────── */
      const snd = () => au && au.on && au.ctx;
      let gfx = null;
      try { gfx = makeGfx(); } catch (e) { console.warn('La Danse des abeilles : repli en 2D', e); gfx = null; }
      function makeGfx() {
        const FG = window.FKGL;
        if (!FG.cabine) throw new Error('cabine absente');
        const cs = Math.min(env.dpr || 1, mobile ? 1.25 : 1.5);
        const cw = Math.max(2, Math.round(W * cs)), ch = Math.max(2, Math.round(H * cs));
        const K = FG.GLKit(cw, ch), gl = K.gl, cab = FG.cabine(K);
        // le rayon : hexagones de cire ; miel en haut, pain d'abeille, couvain operculé ou ouvert, cellules vides sur la piste de danse ; et, à part, la carte du dehors
        const pFond = K.program(FG.HEAD + `
uniform vec2 uRes; uniform vec4 uComb, uMap; uniform float uCell, uT, uSun, uFood, uDist; uniform vec3 uSpot;
out vec4 o;
vec2 hexc(vec2 p, float R){
  vec2 s = vec2(1.7320508, 1.) * R * 2.;
  vec2 a = mod(p, s) - s * .5, b = mod(p - s * .5, s) - s * .5;
  return dot(a, a) < dot(b, b) ? a : b;
}
float hexd(vec2 q, float R){ q = abs(q); return max(q.x * .8660254 + q.y * .5, q.y) - R; }
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 col = vec3(.006, .005, .004);
  if (px.x > uComb.x && px.x < uComb.x + uComb.z && px.y > uComb.y && px.y < uComb.y + uComb.w){
    vec2 q = hexc(px, uCell), cen = px - q;
    float d = hexd(q, uCell * .985);
    float wall = smoothstep(-uCell * .2, -uCell * .07, d);
    float h = hash12(floor(cen * .37) + 3.1);
    float yy = (cen.y - uComb.y) / uComb.w, xx = (cen.x - uComb.x) / uComb.z;
    // où est quoi : du miel en haut, une couronne de pain d'abeille, le couvain au centre, la piste de danse en bas
    float rb = length(vec2((xx - .5) * 1.3, (yy - .55) * 1.1));
    vec3 c;
    float r = length(q) / uCell;
    float lum = .55 + .45 * smoothstep(1.2, -.2, (px.x - uComb.x) / uComb.z + (px.y - uComb.y) / uComb.w * .7);   // lumière douce depuis le haut à gauche
    if (yy < .26 + .05 * sin(xx * 9.)){
      // miel : ambre profond, plus sombre au fond de la cellule, avec un reflet de la lumière
      float spec = pow(max(0., 1. - length(q / uCell - vec2(-.3, -.32)) * 2.2), 6.);
      c = mix(vec3(.09, .03, .004), vec3(.2, .075, .008), r) + spec * vec3(.5, .38, .22);
      if (h < .55 && yy < .18) c = mix(vec3(.2, .14, .07), vec3(.27, .2, .11), vnoise(px * .4)) * (.8 + .3 * smoothstep(1., .2, r));   // operculé : un bouchon de cire claire
    } else if (rb > .42 && yy < .62){
      // pain d'abeille : des pelotes de pollen de toutes les couleurs, tassées
      vec3 pc = h < .3 ? vec3(.26, .13, .015) : h < .55 ? vec3(.2, .07, .015) : h < .75 ? vec3(.28, .17, .02) : vec3(.11, .045, .015);
      c = pc * (.6 + .5 * vnoise(px * .9)) * smoothstep(1.05, .5, r);
    } else if (rb < .42 && yy < .66){
      // couvain operculé (brun clair, bombé) ou ouvert (larve blanche lovée)
      if (h < .88) c = mix(vec3(.1, .055, .022), vec3(.15, .085, .035), vnoise(px * .3)) * (.75 + .35 * smoothstep(1., 0., r));
      else { float lar = smoothstep(.5, .15, length(q / uCell - vec2(.08, .05) * (h - .9) * 20.)); c = mix(vec3(.03, .015, .006), vec3(.2, .19, .16) * (.7 + .3 * vnoise(px * 2.)), lar * .8); }   // une larve nacrée, lovée au fond
    } else {
      // cellules vides : le fond pyramidal de cire, sombre
      c = vec3(.035, .016, .005) * (.45 + .55 * r) * (.85 + .3 * vnoise(px * .2));
    }
    vec3 waxc = vec3(.21, .11, .03) * (.75 + .3 * vnoise(px * .15));
    col = mix(c, waxc, wall) * lum;
    col += vec3(.4, .25, .08) * .08 * smoothstep(0., -uCell * .1, d) * smoothstep(-uCell * .25, -uCell * .1, d);    // la cire translucide s'éclaire sur l'arête
    col *= smoothstep(0., uCell * 4., min(min(px.x - uComb.x, uComb.x + uComb.z - px.x), min(px.y - uComb.y, uComb.y + uComb.w - px.y)) + uCell);
    // la piste de danse dans la lumière, le reste du rayon dans la pénombre de la ruche
    float sp = exp(-dot(px - uSpot.xy, px - uSpot.xy) / (uSpot.z * uSpot.z));
    col *= (.16 + .84 * sp) * mix(vec3(1.), vec3(1.15, 1.05, .9), sp) * 1.15;
  }
  // la carte du dehors : une prairie vue du ciel, le soleil, la source
  vec2 m = (px - uMap.xy) / uMap.zw;
  if (m.x > 0. && m.x < 1. && m.y > 0. && m.y < 1.){
    vec2 mp = (m - .5) * 2.;
    float f = fbm(m * 7.) , g2 = fbm(m * 23. + 4.);
    vec3 pre = mix(vec3(.025, .05, .012), vec3(.06, .085, .02), f) * (.75 + .4 * g2);
    float champ = smoothstep(.55, .65, fbm(m * 3.3 + 2.));
    pre = mix(pre, vec3(.1, .08, .025) * (.8 + .3 * g2), champ * .55);
    float haie = smoothstep(.025, .0, abs(fract(m.x * 3. + .25 * fbm(m * 5.)) - .5) - .45 + .45) * .0 + smoothstep(.012, .0, abs(fract(m.x * 2.7 + .25 * fbm(m * 5.)) - .5)) + smoothstep(.012, .0, abs(fract(m.y * 2.4 + .25 * fbm(m * 5. + 3.)) - .5));
    pre = mix(pre, vec3(.008, .018, .006), clamp(haie, 0., 1.) * .8);
    // la lumière vient du soleil : un dégradé doré du côté du soleil
    vec2 sd = vec2(sin(uSun), -cos(uSun));
    pre *= .75 + .45 * smoothstep(-1.2, 1.2, dot(mp, sd));
    // le champ de fleurs
    vec2 fd = vec2(sin(uFood), -cos(uFood)) * min(.9, uDist / 5. * .9 + .04) ;
    float fl = smoothstep(.09, .05, length(mp - fd));
    float pts = step(.7, hash12(floor(px * .5))) * fl;
    pre = mix(pre, vec3(.5, .08, .3), pts) + vec3(.6, .5, .08) * step(.85, hash12(floor(px * .5) + 9.)) * fl;
    col = pre * .9;
    float e = min(min(m.x, 1. - m.x), min(m.y, 1. - m.y));
    col *= smoothstep(0., .02, e);
  }
  o = vec4(col, 1.);
}`);
        // une abeille ouvrière (Apis mellifera), dessinée en GLSL : tête, thorax velu, abdomen rayé, ailes translucides
        const VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aA; layout(location = 1) in vec4 aB; layout(location = 2) in vec2 aQ;
uniform vec2 uRes; uniform float uOmb; uniform vec3 uSpot; uniform vec2 uDan;
out vec2 vQ; out vec4 vB; out float vS;
void main(){
  float L = aA.z, a = aA.w;
  float sp = exp(-dot(aA.xy - uDan, aA.xy - uDan) / (uSpot.z * uSpot.z * .36));
  vS = aB.y > .5 ? 1.25 : .16 + .84 * sp;
  vec2 q = aQ * vec2(1., .62);
  vec2 d = vec2(cos(a), sin(a)), n = vec2(-d.y, d.x);
  vec2 pos = aA.xy + (d * q.x + n * q.y) * L * .62 + uOmb * vec2(2.5, 4.);
  vQ = q; vB = aB;
  gl_Position = vec4(pos.x / uRes.x * 2. - 1., 1. - pos.y / uRes.y * 2., 0., 1.);
}`;
        const pBee = K.program(FG.HEAD.replace('in vec2 vUv;', '') + `
in vec2 vQ; in vec4 vB; in float vS; uniform float uOmb, uT; out vec4 o;
float el(vec2 p, vec2 c, vec2 r){ return length((p - c) / r) - 1.; }
void main(){
  vec2 p = vQ;                          // x : de la queue (-1) à la tête (+1)
  float wob = vB.x, mark = vB.y, fly = vB.z;
  p.y -= wob * smoothstep(.2, -.8, p.x);   // l'abdomen frétille
  float dh = el(p, vec2(.72, 0.), vec2(.17, .16)), dt = el(p, vec2(.36, 0.), vec2(.24, .22)), da = el(p, vec2(-.3, 0.), vec2(.46, .26));
  vec2 pw = vec2(p.x - .18, abs(p.y) - .2); pw = mat2(.9, -.44, .44, .9) * pw;
  float dw = el(pw, vec2(-.12, .1), vec2(.42 + .1 * fly, .13));
  float body = min(dh, min(dt, da));
  if (uOmb > .5){ float s = smoothstep(.35, -.4, body); o = vec4(0., 0., 0., s * .35 * min(vS, 1.)); return; }
  vec4 c = vec4(0.);
  // ailes : à peine visibles, irisées sur le bord ; floues quand elle vole
  float wa = smoothstep(.02, -.05, dw) * (.22 - .1 * fly);
  vec3 wc = vec3(.35, .38, .42) + .08 * vec3(sin(p.x * 20.), sin(p.x * 20. + 2.), sin(p.x * 20. + 4.));
  if (body > 0.){ o = vec4(wc * wa * vS, wa); return; }
  vec3 col;
  if (da <= 0. && dt > 0. && dh > 0.){
    float band = smoothstep(.45, .55, fract((p.x + .76) * 4.2));
    col = mix(vec3(.26, .12, .022), vec3(.035, .018, .008), band * smoothstep(-.2, .2, -p.x - .05));
    float sh = .55 + .45 * (1. - (da + 1.)) ;
    col *= .6 + .6 * sqrt(clamp(-da, 0., 1.));
    col += vec3(1., .9, .7) * .22 * pow(clamp(1. - length(p - vec2(-.38, .12)) * 3.5, 0., 1.), 3.);   // reflet sur la chitine
  } else if (dt <= 0. && dh > 0.){
    float fuzz = vnoise(p * 60.);
    col = vec3(.16, .09, .035) * (.7 + .5 * fuzz) * (.6 + .6 * sqrt(clamp(-dt, 0., 1.)));
    if (mark > .5) col = mix(col, vec3(.2, .45, 1.) * 1.4, smoothstep(.1, .06, length(p - vec2(.36, 0.))));   // la marque de peinture
  } else col = vec3(.02, .014, .01) * (.6 + .6 * sqrt(clamp(-dh, 0., 1.)));
  col = mix(col, wc, wa * .6);
  float edge = smoothstep(0., -.08, body);
  if (vB.y > .5) col += vec3(1., .82, .5) * .22 * smoothstep(-.3, -.02, body);   // la danseuse : un liseré de lumière
  o = vec4(col * edge * vS, edge);
}`, VS);
        const qBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const MAX = 512, data = new Float32Array(MAX * 8), ib = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
        const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, ib);
        for (let l = 0; l < 2; l++) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 32, l * 16); gl.vertexAttribDivisor(l, 1); }
        gl.bindBuffer(gl.ARRAY_BUFFER, qBuf); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(2, 0);
        gl.bindVertexArray(null);
        const bgT = K.target(cw, ch, 'f16', gl.NEAREST);
        const pCopy = K.program(FG.HEAD + `
uniform sampler2D uB; out vec4 o;
void main(){ o = texture(uB, vUv); }`);
        let bgKey = '';
        const Gx = { lost: false };
        K.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); Gx.lost = true; });
        Gx.draw = function () {
          const g = geo();
          const R = BEE * 2.8 * cs, key = [g.comb.x, g.comb.y, g.comb.w, g.comb.h, g.map.x, g.map.y, g.map.w, sunAz().toFixed(2), cfg.cap, cfg.dist, Math.round(D.cx), Math.round(D.cy)].join(',');
          if (key !== bgKey) {
            bgKey = key;
            pFond.use().f('uRes', cw, ch).f('uComb', g.comb.x * cs, g.comb.y * cs, g.comb.w * cs, g.comb.h * cs).f('uMap', g.map.x * cs, g.map.y * cs, g.map.w * cs, g.map.h * cs)
              .f('uCell', CELL * cs).f('uT', VT).f('uSun', sunAz()).f('uFood', foodAz()).f('uDist', cfg.dist).f('uSpot', D.cx * cs, D.cy * cs, R);
            K.run(pFond, bgT);
          }
          pCopy.use().t('uB', bgT); K.run(pCopy, cab.scene);
          let n = 0;
          for (const b of B) {
            if (b.out || n >= MAX) continue;
            const o = n++ * 8;
            data[o] = b.x * cs; data[o + 1] = b.y * cs; data[o + 2] = BEE * cs; data[o + 3] = b.a;
            data[o + 4] = b === dancer ? b.wob / BEE : 0; data[o + 5] = b === dancer ? 1 : 0; data[o + 6] = b.kind === 'recrue' ? 1 : 0; data[o + 7] = 0;
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, n * 8);
          gl.bindFramebuffer(gl.FRAMEBUFFER, cab.scene.fb); gl.viewport(0, 0, cab.scene.w, cab.scene.h);
          gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.bindVertexArray(vao);
          pBee.use().f('uRes', cw, ch).f('uOmb', 1).f('uT', VT).f('uSpot', D.cx * cs, D.cy * cs, R).f('uDan', dancer.x * cs, dancer.y * cs); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);   // ombres portées
          pBee.use().f('uRes', cw, ch).f('uOmb', 0).f('uT', VT).f('uSpot', D.cx * cs, D.cy * cs, R).f('uDan', dancer.x * cs, dancer.y * cs); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
          gl.bindVertexArray(null); gl.disable(gl.BLEND);
          cab.finish({ expo: 1.6, bloom: 0.3, thr: 1.0, knee: 0.5, radius: 0.7, vig: 0.5, grain: 0.03, grainBlack: 0.3, sat: 1.0 });
          ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
        };
        Gx.lose = () => K.lose();
        return Gx;
      }

      /* ───────── repli 2D ───────── */
      function draw2D() {
        const g = geo();
        ctx.fillStyle = '#0b0805'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.beginPath(); ctx.rect(g.comb.x, g.comb.y, g.comb.w, g.comb.h); ctx.clip();
        ctx.fillStyle = '#3a2208'; ctx.fillRect(g.comb.x, g.comb.y, g.comb.w, g.comb.h);
        ctx.strokeStyle = 'rgba(220,150,60,.5)'; ctx.lineWidth = 1.2;
        const R = CELL, dx = R * Math.sqrt(3), dy = R * 1.5;
        ctx.beginPath();
        for (let j = 0, y = g.comb.y; y < g.comb.y + g.comb.h + R; j++, y += dy) for (let x = g.comb.x + (j % 2 ? dx / 2 : 0); x < g.comb.x + g.comb.w + R; x += dx) {
          for (let k = 0; k <= 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3, X = x + Math.cos(a) * R, Y = y + Math.sin(a) * R; if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
        }
        ctx.stroke(); ctx.restore();
        for (const b of B) {
          if (b.out) continue;
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
          ctx.fillStyle = '#9a6014'; ctx.beginPath(); ctx.ellipse(-BEE * 0.18, b === dancer ? b.wob : 0, BEE * 0.28, BEE * 0.16, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#6a4a20'; ctx.beginPath(); ctx.ellipse(BEE * 0.22, 0, BEE * 0.14, BEE * 0.13, 0, 0, TAU); ctx.fill();
          if (b === dancer) { ctx.fillStyle = '#4a7dff'; ctx.beginPath(); ctx.arc(BEE * 0.22, 0, BEE * 0.05, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
        ctx.fillStyle = '#2c4a18'; ctx.fillRect(g.map.x, g.map.y, g.map.w, g.map.h);
      }

      /* ───────── surimpressions : la trace de la danse, les angles, la carte ───────── */
      function overlays() {
        const g = geo();
        ctx.save();
        // la trace de la danse : la course frétillante en trait vif, le retour en pointillé
        if (cfg.trace && trace.length > 2) {
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
          const n = trace.length;
          // les retours (demi-cercles) : un fil d'or pâle, plus vif quand il est récent
          for (let i = 1; i < n; i++) {
            const [x0, y0, w0] = trace[i - 1], [x1, y1, w1] = trace[i], a = i / n;
            if (w0 && w1) continue;
            for (const [lw, al] of [[6, 0.07], [2, 0.42]]) { ctx.lineWidth = lw; ctx.strokeStyle = `rgba(255,214,140,${(al * a).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
          }
          // les courses frétillantes : du premier au dernier point de chaque course, un zigzag dessiné finement (le frétillement)
          for (let i = 0; i < n; i++) {
            if (!trace[i][2]) continue;
            let j = i; while (j + 1 < n && trace[j + 1][2]) j++;
            const [xa, ya] = trace[i], [xb, yb] = trace[j], len = Math.hypot(xb - xa, yb - ya), a = (j + 1) / n;
            if (len > 4) {
              const ux = (xb - xa) / len, uy = (yb - ya) / len, lam = BEE * 0.17, amp = BEE * 0.075;
              for (const [lw, al] of [[7, 0.12], [2.2, 0.9]]) {
                ctx.lineWidth = lw; ctx.strokeStyle = `rgba(150,200,255,${(al * a).toFixed(3)})`; ctx.beginPath();
                for (let s = 0; s <= len; s += 1.5) { const o = Math.sin((s / lam) * TAU) * amp * Math.min(1, s / 6, (len - s) / 6); ctx.lineTo(xa + ux * s - uy * o, ya + uy * s + ux * o); }
                ctx.stroke();
              }
            }
            i = j;
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.shadowColor = 'rgba(0,0,0,.95)'; ctx.shadowBlur = 5; ctx.textAlign = 'left';
        const al = alpha(), up = -Math.PI / 2;
        if (cfg.angles && !ronde()) {
          // dans la ruche : la verticale et la direction de la course
          const L = BEE * 2.6;
          ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,240,200,.65)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(D.cx, D.cy); ctx.lineTo(D.cx, D.cy - L); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(140,190,255,.9)'; ctx.beginPath(); ctx.moveTo(D.cx, D.cy); ctx.lineTo(D.cx + Math.cos(up + al) * L, D.cy + Math.sin(up + al) * L); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,214,120,.9)'; ctx.beginPath(); ctx.arc(D.cx, D.cy, L * 0.45, up, up + al, al < 0); ctx.stroke();
          ctx.fillStyle = 'rgba(255,240,200,.85)'; ctx.fillText('VERTICALE (HAUT)', D.cx + 6, D.cy - L - 4);
          ctx.fillStyle = 'rgba(255,214,120,.95)'; ctx.fillText(`${Math.round(Math.abs(deg(al)))}° ${al >= 0 ? 'À DROITE' : 'À GAUCHE'}`, D.cx + Math.cos(up + al / 2) * L * 0.55 + 6, D.cy + Math.sin(up + al / 2) * L * 0.55);
        }
        // la carte : la ruche au centre, le soleil, la source, les recrues en vol
        const m = g.map, cx = m.x + m.w / 2, cy = m.y + m.h / 2, Rm = m.w * 0.45, kpx = (Rm * 0.9) / 5;
        const P = (az, dkm) => [cx + Math.sin(az) * Math.min(Rm, 4 + dkm * kpx), cy - Math.cos(az) * Math.min(Rm, 4 + dkm * kpx)];
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
        for (const r of [1, 2, 3, 4, 5]) { ctx.beginPath(); ctx.arc(cx, cy, r * kpx, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText('1 KM', cx + kpx + 3, cy - 3);
        const sa = sunAz(), [sx, sy] = [cx + Math.sin(sa) * Rm * 0.98, cy - Math.cos(sa) * Rm * 0.98];
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26); sg.addColorStop(0, 'rgba(255,240,170,1)'); sg.addColorStop(0.3, 'rgba(255,220,120,.6)'); sg.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, TAU); ctx.fill();
        ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,230,160,.7)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]);
        const [fx, fy] = P(foodAz(), cfg.dist);
        ctx.strokeStyle = 'rgba(140,190,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(fx, fy); ctx.stroke();
        if (cfg.angles && !ronde()) { ctx.strokeStyle = 'rgba(255,214,120,.9)'; ctx.beginPath(); ctx.arc(cx, cy, Rm * 0.25, sa - Math.PI / 2, sa - Math.PI / 2 + al, al < 0); ctx.stroke(); ctx.fillStyle = 'rgba(255,214,120,.95)'; ctx.fillText(`${Math.round(Math.abs(deg(al)))}°`, cx + Math.sin(sa + al / 2) * Rm * 0.3 + 4, cy - Math.cos(sa + al / 2) * Rm * 0.3); }
        for (const f of flights) {
          const k = Math.min(1, f.t / 5), [x1, y1] = P(f.az, f.d * k);
          ctx.strokeStyle = `rgba(255,214,120,${(0.6 * (1 - Math.max(0, f.t - 6) / 3)).toFixed(3)})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.fillStyle = 'rgba(255,230,160,.95)'; ctx.beginPath(); ctx.arc(x1, y1, 2.2, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#e8a83c'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText('RUCHE', cx + 8, cy + 14); ctx.fillText('N', cx - 3, m.y + 12);
        ctx.fillStyle = 'rgba(255,170,220,.95)'; ctx.fillText('FLEURS', fx + 8, fy + 4);
        ctx.fillStyle = 'rgba(255,240,200,.9)'; ctx.fillText('SOLEIL', sx + (sx > cx ? -48 : 8), sy + (sy > cy ? -10 : 18));
        ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(235,232,255,.7)';
        ctx.fillText('DEHORS, VU DU CIEL', m.x, m.y - 8);
        ctx.restore();
      }
      function hud() {
        const v = env.view || { x0: 0 };
        ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(230,228,255,.6)'; ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 4;
        const s = ronde() ? `DANSE EN ROND · SOURCE À ${Math.round(cfg.dist * 1000)} M : PAS DE DIRECTION, LES RECRUES CHERCHENT AUTOUR DE LA RUCHE`
          : `DANSE FRÉTILLANTE · ${fr(cfg.dist, 1)} KM → ${fr(wagDur(), 1)} S DE FRÉTILLEMENT (${fr(cfg.spk, 2)} S PAR KM DANS CETTE COLONIE) · ${Math.floor(cfg.heure)} H ${String(Math.round((cfg.heure % 1) * 60)).padStart(2, '0')}`;
        ctx.fillText(s, v.x0 + 16, H - 16); ctx.restore();
      }
      function drawLabel() {
        if (!label) return;
        const a = Math.min(1, label.t * 4, (6 - label.t) * 2);
        if (a <= 0.01) { label = null; return; }
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = label.col; ctx.lineWidth = 1;
        const x = label.b ? label.b.x : label.x, y = label.b ? label.b.y : label.y, side = x > W * 0.55 ? -1 : 1, lx = x + side * 40, ly = y - 36 < ((env.view && env.view.y0) || 0) + 24 ? y + 46 : y - 36;
        ctx.beginPath(); ctx.arc(x, y, BEE * 0.55, 0, TAU); ctx.stroke();
        ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6; ctx.textAlign = side > 0 ? 'left' : 'right';
        ctx.fillStyle = 'rgba(250,250,245,.96)'; ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(label.name, lx, ly);
        ctx.fillStyle = label.col; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(label.role.toUpperCase(), lx, ly + 15);
        ctx.restore();
      }

      function setScene(id) {
        keep.scene = id;
        if (id === 'fretillante') { cfg.dist = 1.5; cfg.cap = 120; cfg.heure = 11; cfg.jour = false; }
        if (id === 'ronde') { cfg.dist = 0.05; cfg.jour = false; }
        if (id === 'journee') { cfg.dist = 2; cfg.cap = 200; cfg.heure = 7; cfg.jour = true; }
        trace.length = 0; D.runs = 0; D.t = 0;
      }
      if (!keep.cfg.init) { keep.cfg.init = true; setScene(keep.scene); }

      if (window.FASC_DEBUG) window.FASC_DEBUG.abeilles = { cfg, run(n, h) { for (let i = 0; i < n; i++) { VT += h; stepDance(h); stepBees(h); } } };
      return {
        livePaused: true,
        frame(t, dt) {
          if (dt > 0) {
            VT += dt / 0.4;
            const h = dt / 0.4;
            if (cfg.jour) { cfg.heure += h / 8; if (cfg.heure > 20) cfg.heure = 6; }    // une heure toutes les 8 secondes : le soleil tourne, la danse aussi
            const n = Math.max(1, Math.ceil(h / 0.04));
            for (let i = 0; i < n; i++) { stepDance(h / n); stepBees(h / n); }
            if (label) label.t += h;
          }
          if (gfx && !gfx.lost) gfx.draw(); else draw2D();
          overlays(); hud(); drawLabel();
        },
        down(p) {
          const g = geo();
          if (env.tool === 'fleurs' || (p.x > g.map.x && p.x < g.map.x + g.map.w && p.y > g.map.y && p.y < g.map.y + g.map.h && env.tool !== 'observer')) {
            const cx = g.map.x + g.map.w / 2, cy = g.map.y + g.map.h / 2, Rm = g.map.w * 0.45, kpx = (Rm * 0.9) / 5;
            if (p.x < g.map.x || p.x > g.map.x + g.map.w || p.y < g.map.y || p.y > g.map.y + g.map.h) return;
            const dx = p.x - cx, dy = p.y - cy;
            cfg.cap = ((deg(Math.atan2(dx, -dy)) + 360) % 360); cfg.dist = clamp((Math.hypot(dx, dy) - 4) / kpx, 0.03, 5);
            trace.length = 0;
            return;
          }
          let best = null, bd = BEE * 0.7;
          for (const b of B) { const d = Math.hypot(b.x - p.x, b.y - p.y); if (!b.out && d < bd) { bd = d; best = b; } }
          if (best) {
            const R = {
              danseuse: ['Apis mellifera', ronde() ? 'butineuse · danse en rond : la source est tout près' : `butineuse · danse frétillante : ${fr(cfg.dist, 1)} km, ${Math.round(Math.abs(deg(alpha())))}° ${alpha() >= 0 ? 'à droite' : 'à gauche'} du soleil`, '#7fb2ff'],
              suiveuse: ['Apis mellifera', 'suiveuse · au contact de la danseuse, antennes contre elle', '#ffd27a'],
              recrue: ['Apis mellifera', 'recrue · elle part vers l’entrée, puis vers les fleurs', '#ffd27a'],
              ouvriere: ['Apis mellifera', 'ouvrière', '#e8c890'],
            }[best.kind];
            label = { b: best, t: 0, name: R[0], role: R[1], col: R[2] };
          } else if (p.x > g.comb.x && p.x < g.comb.x + g.comb.w) {
            const yy = (p.y - g.comb.y) / g.comb.h;
            const quoi = yy < 0.26 ? ['Miel', 'nectar épaissi, puis fermé d’un opercule de cire'] : yy < 0.66 ? ['Couvain et pain d’abeille', 'larves au centre, pollen tassé autour'] : ['Piste de danse', 'des cellules vides, près de l’entrée'];
            label = { x: p.x, y: p.y, t: 0, name: quoi[0], role: quoi[1], col: '#e8a83c' };
          }
        },
        move() {},
        up() {},
        clear() { for (const b of B) if (b.kind !== 'danseuse') b.kind = 'ouvriere'; flights.length = 0; trace.length = 0; },
        dispose() { if (gfx) gfx.lose(); },
        ui() {
          const L = [{ type: 'section', label: 'Scènes' }];
          L.push({ type: 'buttons', items: [{ label: 'La danse frétillante', act: () => setScene('fretillante') }, { label: 'La danse en rond', act: () => setScene('ronde') }, { label: 'Toute une journée', act: () => setScene('journee') }] });
          L.push({ type: 'section', label: 'Les fleurs' });
          L.push({ type: 'slider', label: 'Distance', min: 0.03, max: 5, step: 0.01, value: cfg.dist, fmt: (x) => (x < 1 ? Math.round(x * 1000) + ' m' : fr(x, 1) + ' km'), set: (x) => { cfg.dist = x; trace.length = 0; } });
          L.push({ type: 'slider', label: 'Direction depuis la ruche', min: 0, max: 359, step: 1, value: cfg.cap, fmt: (x) => Math.round(x) + '° (nord = 0°)', set: (x) => { cfg.cap = x; trace.length = 0; } });
          L.push({ type: 'slider', label: 'Heure', min: 6, max: 20, step: 0.25, value: cfg.heure, fmt: (x) => Math.floor(x) + ' h ' + String(Math.round((x % 1) * 60)).padStart(2, '0'), set: (x) => { cfg.heure = x; trace.length = 0; } });
          L.push({ type: 'toggle', label: 'Le temps passe', value: cfg.jour, set: (x) => { cfg.jour = x; } });
          L.push({ type: 'section', label: 'La danse' });
          L.push({ type: 'slider', label: 'Secondes de frétillement par kilomètre', min: 0.6, max: 1.4, step: 0.05, value: cfg.spk, fmt: (x) => fr(x, 2) + ' s', set: (x) => { cfg.spk = x; } });
          L.push({ type: 'note', text: 'Environ une seconde par kilomètre : la valeur exacte varie selon les colonies et les sous-espèces.' });
          L.push({ type: 'toggle', label: 'Montrer la trace', value: cfg.trace, set: (x) => { cfg.trace = x; trace.length = 0; } });
          L.push({ type: 'toggle', label: 'Montrer les angles', value: cfg.angles, set: (x) => { cfg.angles = x; } });
          return L;
        },
      };
    },
  });
})();
