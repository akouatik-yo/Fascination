/* Fascinations — L'Harmonographe · pendules et engrenages qui dessinent
   Harmonographe « latéral » victorien : deux pendules déplacent la plume (x et y), un troisième, rotatif, fait
   tourner la table sous elle. Chacun oscille à sa fréquence, s'amortit lentement : la courbe se resserre vers le
   centre. Des fréquences en rapport simple (1:2, 2:3…) donnent des figures closes ; un léger désaccord les fait
   tourner. L'encre est plus épaisse là où la plume ralentit. Le son fait entendre l'intervalle des deux pendules.
   Spirographe : une roue dentée qui roule dans un anneau (hypotrochoïde) ; la courbe se referme après
   r / pgcd(R, r) tours. */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const fr = (x, d = 2) => x.toFixed(d).replace('.', ',');
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  const RATIOS = [[1, 1, 'unisson'], [1, 2, 'octave'], [2, 3, 'quinte'], [3, 4, 'quarte'], [3, 5, 'sixte'], [4, 5, 'tierce'], [5, 6, 'tierce mineure'], [1, 3, 'douzième'], [2, 5, 'dixième']];
  const INKS = { encre: ['#1d2a5a', '#5a1d2a', '#1d4a3a', '#2a2a2a'], noir: ['#f2e6c8', '#9fd8ff', '#ff9fc8', '#c8ff9f'], sepia: ['#4a2a12', '#7a3a1a', '#2a3a4a', '#5a4a2a'] };
  const RINGS = [96, 105, 144, 150];
  const WHEELS = [24, 30, 32, 36, 40, 42, 45, 48, 52, 56, 60, 63, 64, 72, 75, 80, 84];
  const keep = { scene: 'harmono', ratio: 2, det: 0.006, damp: 0.025, rotary: true, paper: 'auto', auto: true, sound: true, ring: 105, wheel: 63, hole: 0.75, outside: false };

  window.FASC.push({
    id: 'harmono', name: 'L’Harmonographe', cat: 'Motifs', glyph: '𖤔', smoothTime: true,
    blurb: 'Des pendules et des roues dentées qui dessinent',
    hint: 'Regardez la plume tracer. Panneau : choisissez l’intervalle, le désaccord, l’amortissement.',
    intro: 'Vers 1844, le professeur Hugh Blackburn suspend un entonnoir de sable à deux pendules ; dans les salons victoriens, l’harmonographe devient la machine à dessiner les intervalles musicaux. Deux pendules accordés en quinte tracent une figure à trois boucles ; un rien de désaccord la fait tourner lentement, et l’amortissement l’enroule vers son centre.',
    about: [
      'Un pendule oscille à une fréquence fixée par sa longueur (f = √(g/L) / 2π). L’harmonographe additionne deux ou trois oscillations amorties : x(t) = A₁ sin(ω₁t + φ₁) e^(−d₁t) + …, y(t) = A₂ sin(ω₂t + φ₂) e^(−d₂t) + … Quand ω₁/ω₂ est un rapport de petits entiers, la courbe se referme : ce sont les mêmes rapports que ceux des intervalles consonants, d’où le nom.',
      'Le pendule rotatif (Goodwin) fait décrire un petit cercle à la table : il superpose à la figure une rotation qui la tisse en rosace. L’amortissement, lui, n’est pas une imperfection : c’est lui qui fait passer la plume de la figure extérieure à la spirale intérieure, et donne au dessin sa profondeur.',
      'Le Spirographe, inventé par l’ingénieur Denys Fisher en 1965 (et précédé par le « géométrographe » du XIXᵉ siècle), fait rouler une roue dentée de r dents dans un anneau de R dents. La plume, placée dans un trou de la roue, trace une hypotrochoïde, qui se referme après r / pgcd(R, r) tours : 105 et 63 ont 21 pour plus grand diviseur commun, la figure a 5 branches et demande 3 tours.',
    ],
    tools: [{ id: 'regarder', label: 'regarder', desc: 'Touchez pour lancer un nouveau dessin.' }],
    make(env) { return makeH(env); },
  });

  function makeH(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = Math.min(2, env.dpr || 1);
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const dark = () => (keep.paper === 'auto' ? env.theme !== 'light' : keep.paper === 'noir');
    let T = 0, toast = null;

    /* ───────── la carte (canevas d'encre) et son papier ───────── */
    const card = document.createElement('canvas'), cg = card.getContext('2d');
    const paperC = document.createElement('canvas'), pg = paperC.getContext('2d', { willReadFrequently: true });
    let CS = 0, ink = '#1d2a5a', holdT = 0, done = false, cardDark = null;
    function makePaper(size, dk) {
      paperC.width = paperC.height = size;
      pg.fillStyle = dk ? '#121016' : '#f3ecdc'; pg.fillRect(0, 0, size, size);
      const id = pg.getImageData(0, 0, size, size), d = id.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * (dk ? 7 : 10); d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8; }
      pg.putImageData(id, 0, 0);
      // fibres
      pg.globalAlpha = dk ? 0.05 : 0.06; pg.strokeStyle = dk ? '#ffffff' : '#7a6a50';
      for (let i = 0; i < size / 3; i++) { const x = rnd(size), y = rnd(size), a = rnd(TAU), l = rnd(14, 4) * dpr; pg.beginPath(); pg.moveTo(x, y); pg.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rnd(3, -3), y + Math.sin(a) * l * 0.5 + rnd(3, -3), x + Math.cos(a) * l, y + Math.sin(a) * l); pg.stroke(); }
      pg.globalAlpha = 1;
    }
    function newCard() {
      const v = view(), size = Math.round(Math.min(v.w * 0.86, H * 0.84) * dpr);
      CS = size; card.width = card.height = size; cardDark = dark();
      makePaper(size, cardDark);
      cg.clearRect(0, 0, size, size);
      const pal = INKS[cardDark ? 'noir' : Math.random() < 0.5 ? 'encre' : 'sepia'];
      ink = pal[rint(pal.length)];
      done = false; holdT = 0; last = null; t = 0;
    }

    /* ───────── harmonographe ───────── */
    let P = null, t = 0, last = null;
    function newHarmono(random) {
      if (random) { keep.ratio = rint(RATIOS.length); keep.det = rnd(0.012, -0.012); keep.rotary = Math.random() < 0.7; keep.damp = rnd(0.026, 0.012); }
      const [a, b] = RATIOS[keep.ratio], f0 = 1.1;
      P = {
        w1: TAU * f0 * a, w2: TAU * f0 * b * (1 + keep.det), w3: TAU * f0 * rnd(1.02, 0.98) * (Math.random() < 0.5 ? a : b),
        p1: rnd(TAU), p2: rnd(TAU), p3: rnd(TAU),
        A1: rnd(1, 0.65), A2: rnd(1, 0.65), A3: keep.rotary ? rnd(0.4, 0.15) : 0,
        d1: keep.damp * rnd(1.2, 0.8), d2: keep.damp * rnd(1.2, 0.8), d3: keep.damp * rnd(1.3, 0.7), dir: Math.random() < 0.5 ? 1 : -1,
      };
      const s = P.A1 + P.A3, s2 = P.A2 + P.A3, n = Math.max(s, s2); P.A1 /= n; P.A2 /= n; P.A3 /= n;
      newCard(); soundStart();
    }
    const penH = (tt) => {
      const e1 = Math.exp(-P.d1 * tt), e2 = Math.exp(-P.d2 * tt), e3 = Math.exp(-P.d3 * tt);
      return [P.A1 * Math.sin(P.w1 * tt + P.p1) * e1 + P.A3 * Math.sin(P.w3 * tt + P.p3) * e3, P.A2 * Math.sin(P.w2 * tt + P.p2) * e2 + P.A3 * P.dir * Math.cos(P.w3 * tt + P.p3) * e3];
    };

    /* ───────── spirographe ───────── */
    let SP = null;
    function newSpiro(random) {
      if (random) { keep.ring = RINGS[rint(RINGS.length)]; let w; do { w = WHEELS[rint(WHEELS.length)]; } while (w >= keep.ring - 6); keep.wheel = w; keep.hole = rnd(0.9, 0.45); keep.outside = Math.random() < 0.2; }
      const R = keep.ring, r = keep.wheel, turns = r / gcd(R, r);
      SP = { R, r, d: keep.hole * r, turns, layer: 0, end: TAU * turns };
      newCard(); soundStop();
    }
    const penS = (tt) => {
      const { R, r, d } = SP, k = keep.outside ? -1 : 1, Rk = R - k * r, s = 1 / (R + (keep.outside ? 2 * r : 0));
      return [(Rk * Math.cos(tt) + k * d * Math.cos((Rk / r) * tt)) * s, (Rk * Math.sin(tt) - d * Math.sin((Rk / r) * tt)) * s];
    };

    /* ───────── son : les deux pendules, transposés dans l'audible ───────── */
    let snd = null;
    function soundStart() {
      soundStop(); if (!keep.sound || !au || !au.on || keep.scene !== 'harmono') return;
      const c = au.ensure(), g = c.createGain(); g.gain.value = 0; g.connect(au.master);
      const o1 = c.createOscillator(), o2 = c.createOscillator(), g1 = c.createGain(), g2 = c.createGain();
      const base = 196 / (P.w1 / TAU / RATIOS[keep.ratio][0]);
      o1.frequency.value = (P.w1 / TAU) * base; o2.frequency.value = (P.w2 / TAU) * base; o2.type = 'triangle';
      o1.connect(g1); o2.connect(g2); g1.connect(g); g2.connect(g); g2.gain.value = 0.5; o1.start(); o2.start();
      g.gain.setTargetAtTime(0.045, c.currentTime, 0.5);
      snd = { c, g, g1, g2, o1, o2 };
    }
    function soundStop() { if (!snd) return; const t0 = snd.c.currentTime; snd.g.gain.setTargetAtTime(0, t0, 0.2); snd.o1.stop(t0 + 1.2); snd.o2.stop(t0 + 1.2); snd = null; }

    /* ───────── tracé ───────── */
    function drawTo(tt, pen) {
      const half = CS / 2, sc = CS * 0.45;
      const [x, y] = pen(tt), px = half + x * sc, py = half - y * sc;
      if (last) {
        const dx = px - last[0], dy = py - last[1], sp = Math.hypot(dx, dy);
        // plus la plume va lentement, plus l'encre s'accumule
        cg.strokeStyle = ink; cg.lineCap = 'round';
        cg.lineWidth = clamp(1.6 * dpr / Math.sqrt(1 + sp / (1.2 * dpr)), 0.5 * dpr, 1.7 * dpr);
        cg.globalAlpha = clamp(0.95 / Math.sqrt(1 + sp / (3 * dpr)), 0.35, 0.95);
        cg.beginPath(); cg.moveTo(last[0], last[1]); cg.lineTo(px, py); cg.stroke(); cg.globalAlpha = 1;
      }
      last = [px, py];
    }
    function update(k) {
      T += k;
      if (keep.scene === 'harmono') {
        if (!P) newHarmono(false);
        const amp = Math.exp(-Math.min(P.d1, P.d2) * t);
        if (amp < 0.035) { if (!done) { done = true; holdT = 0; soundStop(); } }
        if (!done) { const n = Math.max(1, Math.round(k * 500)); for (let i = 1; i <= n; i++) drawTo(t + (k * i) / n, penH); t += k; }
        else if (keep.auto && (holdT += k) > 8) { newHarmono(true); toast = { s: `${RATIOS[keep.ratio][2]} (${RATIOS[keep.ratio][0]}:${RATIOS[keep.ratio][1]})${keep.rotary ? ', avec la table tournante' : ''}`, t: T }; }
        if (snd) { const t0 = snd.c.currentTime; snd.g1.gain.setTargetAtTime(Math.exp(-P.d1 * t), t0, 0.1); snd.g2.gain.setTargetAtTime(0.5 * Math.exp(-P.d2 * t), t0, 0.1); }
      } else {
        if (!SP) newSpiro(false);
        if (!done) {
          const speed = 2.2 + SP.turns * 0.3, n = Math.max(1, Math.round(k * 300));
          for (let i = 1; i <= n && t < SP.end; i++) drawTo(Math.min(SP.end, t + (k * speed * i) / n), penS);
          t = Math.min(SP.end, t + k * speed);
          if (t >= SP.end) {
            // une couche de plus : autre trou, autre encre, légère rotation
            if (SP.layer < 2) { SP.layer++; keep.hole = clamp(keep.hole - 0.18, 0.2, 1); SP.d = keep.hole * SP.r; const pal = INKS[cardDark ? 'noir' : 'encre']; ink = pal[(pal.indexOf(ink) + 1) % pal.length]; t = 0; last = null; SP.end = TAU * SP.turns; }
            else { done = true; holdT = 0; }
          }
        } else if (keep.auto && (holdT += k) > 7) newSpiro(true);
      }
    }
    function render() {
      const v = view(), L = env.theme === 'light';
      ctx.fillStyle = L ? '#e9e3d6' : '#08070c'; ctx.fillRect(0, 0, W, H);
      const s = CS / dpr, x = v.cx - s / 2, y = H / 2 - s / 2;
      // la carte, son ombre
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6; ctx.drawImage(paperC, x, y, s, s); ctx.restore();
      ctx.drawImage(card, x, y, s, s);
      // la plume, et (spirographe) les engrenages en transparence
      if (last && !done) {
        const px = x + last[0] / dpr, py = y + last[1] / dpr;
        if (keep.scene === 'spiro' && SP) {
          const sc = (CS * 0.45) / dpr / (SP.R + (keep.outside ? 2 * SP.r : 0)), cx = x + s / 2, cy = y + s / 2, k = keep.outside ? -1 : 1;
          const wc = [cx + (SP.R - k * SP.r) * sc * Math.cos(t), cy - (SP.R - k * SP.r) * sc * Math.sin(t)];
          ctx.strokeStyle = cardDark ? 'rgba(255,255,255,.18)' : 'rgba(40,40,60,.22)'; ctx.lineWidth = 1;
          gear(cx, cy, SP.R * sc, SP.R, 0, true); gear(wc[0], wc[1], SP.r * sc, SP.r, -((SP.R - k * SP.r) / SP.r) * t, false);
          ctx.beginPath(); ctx.moveTo(wc[0], wc[1]); ctx.lineTo(px, py); ctx.stroke();
        }
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fill();
        ctx.strokeStyle = cardDark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.stroke();
      }
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = L ? 'rgba(40,30,60,.75)' : 'rgba(235,230,255,.7)';
      if (keep.scene === 'harmono' && P) {
        const [a, b] = RATIOS[keep.ratio];
        ctx.fillText(`${RATIOS[keep.ratio][2].toUpperCase()} ${a}:${b} · DÉSACCORD ${fr(keep.det * 100, 1)} % · AMORTISSEMENT ${fr(keep.damp, 3)} /S${keep.rotary ? ' · TABLE TOURNANTE' : ''}${done ? ' · TERMINÉ' : ''}`, v.x0 + 18, H - 16);
      } else if (SP) ctx.fillText(`ANNEAU ${SP.R} DENTS · ROUE ${SP.r} DENTS · PGCD ${gcd(SP.R, SP.r)} → ${SP.R / gcd(SP.R, SP.r)} BRANCHES EN ${SP.turns} TOURS${keep.outside ? ' · ROUE À L’EXTÉRIEUR' : ''}`, v.x0 + 18, H - 16);
      if (toast && T - toast.t < 4) { ctx.globalAlpha = Math.min(1, (4 - (T - toast.t)) * 1.5); ctx.textAlign = 'center'; ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.fillText(toast.s, v.cx, 70); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    }
    function gear(cx, cy, r, teeth, rot, inner) {
      ctx.beginPath();
      for (let i = 0; i <= teeth * 2; i++) { const a = rot + (i / (teeth * 2)) * TAU, rr = r + (i % 2 ? 1 : -1) * Math.min(3, r * 0.03) * (inner ? -1 : 1); i ? ctx.lineTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr); }
      ctx.stroke();
    }
    function setScene(id) { keep.scene = id; t = 0; last = null; if (id === 'harmono') { SP = null; newHarmono(false); } else { soundStop(); P = null; newSpiro(false); } }
    setScene(keep.scene);
    if (window.FASC_DEBUG) window.FASC_DEBUG.harm = { keep, setScene, newHarmono, newSpiro, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); } };

    return {
      livePaused: true,
      frame(tt, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down() { if (keep.scene === 'harmono') newHarmono(true); else newSpiro(true); },
      clear() { if (keep.scene === 'harmono') newHarmono(false); else newSpiro(false); },
      dispose() { soundStop(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [{ label: 'Harmonographe', act: () => setScene('harmono') }, { label: 'Spirographe', act: () => setScene('spiro') }] }];
        if (keep.scene === 'harmono') {
          L.push({ type: 'section', label: 'Pendules' });
          L.push({ type: 'choice', label: 'Intervalle', value: String(keep.ratio), set: (x) => { keep.ratio = +x; newHarmono(false); }, options: RATIOS.map(([a, b, n], i) => ({ id: String(i), label: `${n} ${a}:${b}` })) });
          L.push({ type: 'slider', label: 'Désaccord', min: -0.03, max: 0.03, step: 0.0005, value: keep.det, fmt: (x) => fr(x * 100, 2) + ' %', set: (x) => { keep.det = x; } });
          L.push({ type: 'slider', label: 'Amortissement', min: 0.004, max: 0.06, step: 0.001, value: keep.damp, fmt: (x) => fr(x, 3) + ' /s', set: (x) => { keep.damp = x; } });
          L.push({ type: 'toggle', label: 'Table tournante (3ᵉ pendule)', value: keep.rotary, set: (x) => { keep.rotary = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Nouveau dessin avec ces réglages', act: () => newHarmono(false) }, { label: 'Au hasard', act: () => newHarmono(true) }] });
          L.push({ type: 'toggle', label: 'Entendre l’intervalle (avec le son)', value: keep.sound, set: (x) => { keep.sound = x; if (x) soundStart(); else soundStop(); } });
        } else {
          L.push({ type: 'section', label: 'Engrenages' });
          L.push({ type: 'choice', label: 'Anneau', value: String(keep.ring), set: (x) => { keep.ring = +x; newSpiro(false); }, options: RINGS.map((r) => ({ id: String(r), label: r + ' dents' })) });
          L.push({ type: 'choice', label: 'Roue', value: String(keep.wheel), set: (x) => { keep.wheel = +x; newSpiro(false); }, options: WHEELS.filter((w) => w < keep.ring - 6).map((w) => ({ id: String(w), label: w + ' dents' })) });
          L.push({ type: 'slider', label: 'Trou de la plume', min: 0.15, max: 1, step: 0.01, value: keep.hole, fmt: (x) => Math.round(x * 100) + ' % du rayon', set: (x) => { keep.hole = x; } });
          L.push({ type: 'toggle', label: 'Roue à l’extérieur', value: keep.outside, set: (x) => { keep.outside = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Tracer', act: () => newSpiro(false) }, { label: 'Au hasard', act: () => newSpiro(true) }] });
        }
        L.push({ type: 'section', label: 'Papier' });
        L.push({ type: 'choice', label: 'Carte', value: keep.paper, set: (x) => { keep.paper = x; if (keep.scene === 'harmono') newHarmono(false); else newSpiro(false); }, options: [{ id: 'auto', label: 'Selon le thème' }, { id: 'creme', label: 'Crème, encre' }, { id: 'noir', label: 'Noire, encre pâle' }] });
        L.push({ type: 'toggle', label: 'Enchaîner les dessins', value: keep.auto, set: (x) => { keep.auto = x; } });
        return L;
      },
    };
  }
})();
