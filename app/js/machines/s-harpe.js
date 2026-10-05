/* Fascination — La Harpe · cordes pincées, monocorde de Pythagore, harpe éolienne
   Le son : chaque corde est synthétisée par Karplus-Strong (fk-son.js), accordée au cent près, pincée là où le doigt
   la traverse (le point de pincement change le timbre). L'image : la forme de la corde est la somme de ses modes
   propres (série de Fourier du triangle de départ), chacun s'amortissant plus vite que le précédent ; elle est
   montrée au ralenti (une corde réelle vibre des centaines de fois par seconde). */
(function boot() {
  if (!window.FK || !window.FKSON) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const { mtof, nom, bus, ks, playBuf } = window.FKSON;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');

  const MODES = {
    majeur: { label: 'Majeur', st: [0, 2, 4, 5, 7, 9, 11] },
    mineur: { label: 'Mineur', st: [0, 2, 3, 5, 7, 8, 10] },
    penta: { label: 'Pentatonique', st: [0, 2, 4, 7, 9] },
    dorien: { label: 'Dorien', st: [0, 2, 3, 5, 7, 9, 10] },
    hira: { label: 'Hirajoshi', st: [0, 2, 3, 7, 8] },
    tons: { label: 'Par tons', st: [0, 2, 4, 6, 8, 10] },
  };
  const ROOTS = [['do', 48], ['ré', 50], ['mi♭', 51], ['fa', 53], ['sol', 55], ['la', 57]];
  // rapports simples du monocorde : longueur de la partie pincée / longueur totale
  const RATIOS = [
    [1, 2, 'octave'], [2, 3, 'quinte'], [3, 4, 'quarte'], [4, 5, 'tierce majeure'], [5, 6, 'tierce mineure'],
    [3, 5, 'sixte majeure'], [5, 8, 'sixte mineure'], [8, 9, 'ton'], [15, 16, 'demi-ton'], [1, 3, 'douzième'], [1, 4, 'double octave'], [8, 15, 'septième majeure'],
  ];
  // réglages qui survivent à la reconstruction de la machine (allumer le son la reconstruit)
  const keep = { scene: 'harpe', mode: 'majeur', root: 48, t60: 4, rev: 0.35, auto: true, names: false, harm: true, bridge: 2 / 3, snap: true, wind: 2.2, gusts: true };

  window.FASC.push({
    id: 'harpe', name: 'La Harpe', cat: 'Sons', glyph: '≡', smoothTime: true, decor: true,
    blurb: 'Cordes pincées, monocorde de Pythagore, harpe éolienne',
    hint: 'Traversez les cordes pour les pincer (plus vite = plus fort ; près du bord = plus brillant). Activez le son en haut.',
    intro: 'Une corde pincée ne vibre pas d’une seule façon : elle vibre en une, deux, trois… parties à la fois, et ces vibrations superposées font son timbre. Ici, la harpe, le monocorde avec lequel Pythagore aurait découvert les rapports des intervalles, et la harpe éolienne, que le vent fait chanter toute seule.',
    about: [
      'Le son est calculé comme une vraie corde : l’algorithme de Karplus et Strong (1983) fait circuler une impulsion dans une boucle dont la longueur est la période de la note ; à chaque aller-retour, un petit filtre retire un peu d’aigus, comme la corde perd son énergie. Le point où l’on pince creuse les harmoniques qui y ont un nœud : pincée en son milieu, une corde n’a plus d’harmoniques pairs, d’où un son creux ; près du bord, elle est brillante.',
      'Sur une harpe de concert (47 cordes), les cordes de do sont rouges et celles de fa bleu nuit ou noires, pour que la harpiste s’y retrouve. Sept pédales raccourcissent toutes les cordes d’une même note pour passer d’une tonalité à l’autre. Le « son harmonique » s’obtient en effleurant le milieu de la corde avec la paume : elle ne peut plus vibrer qu’en deux moitiés, et sonne une octave plus haut.',
      'Le monocorde : une seule corde et un chevalet mobile. La moitié de la corde sonne l’octave, les deux tiers la quinte, les trois quarts la quarte : les intervalles consonants sont des rapports de petits nombres. Pourquoi ? Leurs harmoniques coïncident ; quand ils ne coïncident pas tout à fait, ils produisent des battements. La légende des marteaux du forgeron, qui auraient mis Pythagore sur la voie, est fausse (le son d’un marteau ne dépend pas ainsi de son poids), mais le monocorde, lui, donne bien ces rapports.',
      'La harpe éolienne, connue depuis Athanasius Kircher (1650) : des cordes toutes accordées sur la même note, posées dans une fenêtre. Le vent qui passe derrière une corde y laisse une allée de tourbillons alternés (l’allée de von Kármán), à la fréquence f ≈ 0,2 × vitesse / diamètre. La corde ne peut chanter qu’une de ses harmoniques : elle choisit celle qui est la plus proche, et saute de l’une à l’autre quand le vent change. Vincenc Strouhal a étudié ces « sons éoliens » en 1878 : le nombre 0,2 porte son nom. C’est aussi le chant des fils électriques par grand vent.',
    ],
    tools: [
      { id: 'pincer', label: 'pincer', desc: 'Traversez une corde pour la pincer. Sur le monocorde, faites glisser le chevalet.' },
      { id: 'etouffer', label: 'étouffer', desc: 'Posez le doigt sur une corde pour l’arrêter net.' },
      { id: 'flageolet', label: 'harmonique', desc: 'Effleurez une corde : elle sonne une harmonique (l’octave au milieu, la quinte au tiers…).' },
    ],
    make(env) { return makeHarpe(env); },
  });

  function makeHarpe(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    let B = bus(au, { rev: keep.rev, sec: 3.6, bright: 0.4, gain: 0.9 });
    const light = () => env.theme === 'light', bare = () => env.decor === false;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    let T = 0, idle = 0, autoT = 0, autoStep = 0, lastPick = null, lastPt = null, drag = null, toast = null;

    /* ───────── vibration visible : somme des modes d'une corde pincée ───────── */
    const NM = 12;
    function excite(e, A, p, harmonic) {
      // coefficients de Fourier d'un triangle de hauteur 1 pincé en p : 2 sin(nπp) / (n²π² p(1−p))
      p = clamp(p, 0.03, 0.97);
      e.c = new Float32Array(NM + 1);
      for (let n = 1; n <= NM; n++) {
        if (harmonic && n % harmonic !== 0) continue; // effleurée : seules les harmoniques qui ont un nœud là survivent
        e.c[n] = (2 * Math.sin(n * Math.PI * p)) / (n * n * Math.PI * Math.PI * p * (1 - p));
      }
      e.A = A; e.t0 = T; e.p = p; e.hm = harmonic || 0;
    }
    function amp(e, n) { if (!e.c || !e.c[n]) return 0; const dt = T - e.t0; return e.c[n] * Math.exp((-dt * (1 + 0.35 * (n - 1))) / e.tau); }
    function disp(e, u) {
      if (!e.c) return 0;
      const dt = T - e.t0; if (dt > e.tau * 6) { e.c = null; return 0; }
      let y = 0;
      for (let n = 1; n <= NM; n++) { const a = e.c[n]; if (!a) continue; y += a * Math.exp((-dt * (1 + 0.35 * (n - 1))) / e.tau) * Math.sin(n * Math.PI * u) * Math.cos(TAU * n * e.fv * dt); }
      return y * e.A;
    }
    const energy = (e) => (e.c ? e.A * Math.exp(-(T - e.t0) / e.tau) : 0);

    /* ───────── la harpe ───────── */
    let strings = [];
    function buildHarp() {
      const st = MODES[keep.mode].st, N = st.length === 5 ? 16 : st.length === 6 ? 18 : 19;
      strings = [];
      for (let i = 0; i < N; i++) {
        const m = keep.root + 12 * Math.floor(i / st.length) + st[i % st.length];
        strings.push({ i, m, f: mtof(m), e: { tau: 1, fv: 2 + 2.6 * (i / N) }, voice: null, pc: ((m % 12) + 12) % 12 });
      }
      warm = 0;
    }
    function harpGeom() {
      const v = view(), N = strings.length, mx = Math.max(46, v.w * 0.07);
      const xa = v.x0 + mx + 30, xb = v.x1 - mx;
      const top = (s) => H * (0.1 + 0.11 * s + 0.045 * Math.sin(Math.PI * s * 1.7)), bot = (s) => H * (0.9 - 0.47 * s);
      for (const S of strings) { const s = N > 1 ? S.i / (N - 1) : 0; S.x = xa + (xb - xa) * s; S.y0 = top(s); S.y1 = bot(s); }
      return { xa, xb, top, bot, v };
    }
    let warm = 0; // préparation progressive des sons (pour que le premier glissando ne saccade pas)
    function harpPluck(S, A, p, harmonic) {
      const t60 = keep.t60 * (1.25 - 0.55 * (S.i / strings.length));
      S.e.tau = t60 * 0.32;
      excite(S.e, A, p, harmonic);
      lastPick = { S, kind: 'harpe' };
      if (B) {
        if (S.voice) S.voice.stop(0.02);
        const f = harmonic ? S.f * harmonic : S.f;
        const buf = ks(B.ctx, f, { pos: harmonic ? 0.5 / harmonic + 0.08 : Math.min(p, 1 - p), bright: harmonic ? 0.25 : clamp(0.25 + A * 0.05, 0.2, 0.9), t60: harmonic ? t60 * 0.8 : t60 });
        const v = view();
        S.voice = playBuf(B, buf, (harmonic ? 0.32 : 0.16 + 0.03 * Math.min(A, 8)) * (1 - 0.3 * (S.i / strings.length)), 0, clamp(((S.x - v.cx) / v.w) * 1.4, -0.8, 0.8));
      }
      if (navigator.vibrate) try { navigator.vibrate(5); } catch (e) { /* rien */ }
    }
    function harpDamp(S) { if (S.e.c) S.e.t0 -= S.e.tau * 4; S.e.c = null; if (S.voice) { S.voice.stop(0.03); S.voice = null; } }

    /* ───────── le monocorde ───────── */
    const mono = { ref: { tau: 1.4, fv: 1.6 }, L: { tau: 1.4, fv: 2 }, R: { tau: 1.4, fv: 2.4 }, f0: mtof(48), vL: null, vR: null, vRef: null };
    function monoGeom() {
      const v = view(), xa = v.x0 + Math.max(50, v.w * 0.08), xb = v.x1 - Math.max(40, v.w * 0.06);
      return { v, xa, xb, y: H * 0.56, yRef: H * 0.3, xr: xa + (xb - xa) * keep.bridge };
    }
    function nearestRatio(r) { let best = null, bd = 1e9; for (const q of RATIOS) { const d = Math.abs(1200 * Math.log2(r / (q[0] / q[1]))); if (d < bd) { bd = d; best = q; } } return { q: best, cents: bd }; }
    function monoPlay(which, A = 6, p = 0.3) {
      const r = keep.bridge, f = which === 'ref' ? mono.f0 : which === 'L' ? mono.f0 / r : mono.f0 / (1 - r);
      const e = mono[which]; e.tau = 1.6; e.fv = which === 'ref' ? 1.5 : 1.5 / (which === 'L' ? r : 1 - r) ** 0.5;
      excite(e, A, p);
      lastPick = { e, f, kind: 'mono' };
      if (B) {
        const k = 'v' + which; if (mono[k]) mono[k].stop(0.02);
        mono[k] = playBuf(B, ks(B.ctx, f, { pos: clamp(p, 0.08, 0.45), bright: 0.45, t60: 5 }), 0.24, 0, which === 'ref' ? -0.3 : 0.3);
      }
    }
    function monoHarm(n) {
      const e = mono.ref; e.tau = 1.8; e.fv = 1.5;
      excite(e, 6, 1 / n / 2 + 0.01, n);
      lastPick = { e, f: mono.f0 * n, kind: 'mono' };
      if (B) { if (mono.vRef) mono.vRef.stop(0.02); mono.vRef = playBuf(B, ks(B.ctx, mono.f0 * n, { pos: 0.3, bright: 0.25, t60: 4 }), 0.3, 0, -0.2); }
    }

    /* ───────── la harpe éolienne ───────── */
    const AEO_F0 = mtof(38), AEO_N = 8; // ré1 : toutes les cordes à l'unisson
    let aeo = [], gust = 0, gustV = 0, windNoise = null, wavePW = null, streaks = [];
    function buildAeo() {
      aeo = [];
      for (let i = 0; i < AEO_N; i++) aeo.push({ i, d: 0.0005 + 0.0013 * (i / (AEO_N - 1)) ** 1.1, n: 0, a: 0, fv: 1.4 + 0.25 * i, voices: null, cur: 0, ph: rnd(TAU), vort: [] });
      streaks = []; for (let i = 0; i < 90; i++) streaks.push({ x: rnd(1), y: rnd(1), l: rnd(1, 0.3), s: rnd(1, 0.6) });
    }
    function aeoAudioOn() {
      if (!B || aeo[0].voices) return;
      const c = B.ctx;
      // timbre doux : fondamentale, un peu d'octave et de quinte, comme une corde frottée par l'air
      if (!wavePW) wavePW = c.createPeriodicWave(new Float32Array([0, 1, 0.22, 0.08, 0.04]), new Float32Array(5));
      const v = view();
      for (const s of aeo) {
        s.voices = [0, 1].map(() => { const o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null; o.setPeriodicWave(wavePW); o.frequency.value = AEO_F0 * 4; g.gain.value = 0; o.connect(g); if (p) { p.pan.value = ((s.i / (AEO_N - 1)) * 2 - 1) * 0.7; g.connect(p); p.connect(B.input); } else g.connect(B.input); o.start(); return { o, g, n: 0 }; });
      }
      void v;
      const src = c.createBufferSource(); src.buffer = au.noiseBuf(); src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.7;
      const g = c.createGain(); g.gain.value = 0; src.connect(bp); bp.connect(g); g.connect(B.input); src.start();
      windNoise = { src, bp, g };
    }
    function aeoAudioOff() {
      for (const s of aeo) if (s.voices) { for (const v of s.voices) { try { v.g.gain.setTargetAtTime(0, B.ctx.currentTime, 0.1); v.o.stop(B.ctx.currentTime + 0.6); } catch (e) { /* rien */ } } s.voices = null; }
      if (windNoise) { try { windNoise.g.gain.setTargetAtTime(0, B.ctx.currentTime, 0.1); windNoise.src.stop(B.ctx.currentTime + 0.6); } catch (e) { /* rien */ } windNoise = null; }
    }
    function windSpeed() { return Math.max(0.2, keep.wind * (1 + (keep.gusts ? 0.42 * gust : 0))); }
    function updateAeo(k) {
      // rafales : bruit lissé (Ornstein-Uhlenbeck)
      gustV += (-gust * 0.35 + rnd(1, -1) * 0.9) * k; gustV *= Math.exp(-k * 1.2); gust = clamp(gust + gustV * k, -1, 1.4);
      const U = windSpeed();
      for (const s of aeo) {
        const fs = (0.2 * U) / s.d, x = fs / AEO_F0;          // fréquence des tourbillons, en harmoniques de la corde
        const n = clamp(Math.round(x), 1, 18), lock = Math.max(0, 1 - Math.abs(x - n) * 2.4);
        const target = x < 0.6 || x > 18.5 ? 0 : lock * clamp((U - 0.4) / 2.5, 0, 1) * (n > 1 ? 1 : 0.6);
        if (n !== s.n && s.a < 0.08) s.n = n;                  // elle ne change d'harmonique qu'en passant par le silence (ou presque)
        const goal = n === s.n ? target : 0;
        s.a += (goal - s.a) * Math.min(1, k * (goal > s.a ? 1.4 : 2.2));
        s.ph += k * TAU * s.fv;
        s.fs = fs;
        if (s.voices) {
          const c = B.ctx, t = c.currentTime;
          let vi = s.voices.findIndex((v) => v.n === s.n);
          if (vi < 0) { vi = s.voices[0].g.gain.value < s.voices[1].g.gain.value ? 0 : 1; s.voices[vi].n = s.n; s.voices[vi].o.frequency.setValueAtTime(AEO_F0 * s.n, t); }
          s.voices.forEach((v, j) => v.g.gain.setTargetAtTime(j === vi ? (0.05 * s.a) / Math.sqrt(1 + s.n * 0.15) : 0, t, 0.12));
        }
      }
      if (windNoise) { const t = B.ctx.currentTime; windNoise.g.gain.setTargetAtTime(0.012 * U * U * 0.12, t, 0.2); windNoise.bp.frequency.setTargetAtTime(250 + U * 90, t, 0.2); }
      for (const q of streaks) { q.x += k * (0.03 + 0.03 * U) * q.s; if (q.x > 1.1) { q.x = -0.1; q.y = rnd(1); } }
    }

    /* ───────── scènes ───────── */
    function setScene(id) {
      if (keep.scene === 'eolienne' && id !== 'eolienne') aeoAudioOff();
      keep.scene = id; lastPick = null; toast = null;
      if (id === 'harpe') buildHarp();
      if (id === 'eolienne') { buildAeo(); aeoAudioOn(); }
    }

    /* ───────── jeu automatique (le vent sur la harpe) ───────── */
    function autoPlay(k) {
      if (!keep.auto || keep.scene !== 'harpe') return;
      idle += k; if (idle < 5) return;
      autoT -= k; if (autoT > 0) return;
      const N = strings.length, st = MODES[keep.mode].st.length;
      autoStep++;
      // arpèges qui montent et redescendent, parfois un accord
      const phrase = Math.floor(autoStep / 8) % 4, pos = autoStep % 8;
      const base = [0, 3, 1, 4][phrase] % st;
      const deg = base + [0, 2, 4, 7, 9, 7, 4, 2][pos];
      const i = clamp(deg + (phrase % 2 ? st : 0), 0, N - 1);
      harpPluck(strings[i], rnd(4, 2.2), rnd(0.35, 0.18));
      if (pos === 0 && Math.random() < 0.5) { const j = clamp(i - st, 0, N - 1); if (j !== i) harpPluck(strings[j], 3, 0.3); }
      autoT = pos === 7 ? rnd(1.6, 1) : rnd(0.62, 0.42);
    }

    /* ───────── dessin ───────── */
    const C = () => light()
      ? { bg0: '#f4f0e8', bg1: '#ebe5d8', ink: '#2a2238', wood: 'rgba(120,80,40,', str: '#4a3a2a', red: '#c4362a', blue: '#2a4aa0', txt: 'rgba(40,30,60,.75)', dim: 'rgba(40,30,60,.4)' }
      : { bg0: '#07060d', bg1: '#110c1a', ink: '#efe6d2', wood: 'rgba(230,180,110,', str: '#f2e4c4', red: '#ff6a52', blue: '#7aa2ff', txt: 'rgba(235,228,255,.75)', dim: 'rgba(235,228,255,.35)' };
    function background(c) {
      if (bare()) { ctx.fillStyle = light() ? '#f4f0e8' : '#07060d'; ctx.fillRect(0, 0, W, H); return; }
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c.bg0); g.addColorStop(1, c.bg1);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    function strokeString(c, col, pts, en, w = 1.5) {
      // une corde : un trait fin, et un halo d'autant plus large qu'elle vibre fort
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (!light() && en > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = col; ctx.globalAlpha = Math.min(0.22, 0.04 + en * 0.025); ctx.lineWidth = 6 + en * 2.4; poly(pts); ctx.stroke();
        ctx.globalAlpha = Math.min(0.5, 0.1 + en * 0.05); ctx.lineWidth = 2.5 + en * 0.6; poly(pts); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = light() ? 0.85 : 0.55 + Math.min(0.45, en * 0.1); ctx.strokeStyle = col; ctx.lineWidth = w; poly(pts); ctx.stroke(); ctx.globalAlpha = 1;
    }
    function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
    function vertString(e, x, y0, y1, scale) { const pts = []; for (let j = 0; j <= 48; j++) { const u = j / 48; pts.push([x + disp(e, u) * scale, y0 + (y1 - y0) * u]); } return pts; }
    function horzString(e, x0, x1, y, scale) { const pts = []; for (let j = 0; j <= 64; j++) { const u = j / 64; pts.push([x0 + (x1 - x0) * u, y + disp(e, u) * scale]); } return pts; }

    function drawHarp(c) {
      const g = harpGeom();
      if (!bare()) {
        // la console (en haut), la colonne (à gauche), la table d'harmonie (en diagonale)
        const N = strings.length, s0 = -0.06, s1 = 1.04;
        ctx.save(); ctx.lineCap = 'round';
        const sx = (s) => g.xa + (g.xb - g.xa) * s;
        ctx.strokeStyle = c.wood + (light() ? '.55)' : '.35)'); ctx.lineWidth = 14;
        ctx.beginPath(); for (let j = 0; j <= 40; j++) { const s = s0 + (s1 - s0) * (j / 40); const x = sx(s), y = g.top(s) - 10; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        ctx.strokeStyle = c.wood + (light() ? '.75)' : '.55)'); ctx.lineWidth = 2; ctx.stroke();
        ctx.lineWidth = 18; ctx.strokeStyle = c.wood + (light() ? '.4)' : '.22)');
        ctx.beginPath(); ctx.moveTo(sx(s0), g.bot(s0) + 10); ctx.lineTo(sx(s1), g.bot(s1) + 10); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = c.wood + (light() ? '.75)' : '.5)'); ctx.stroke();
        const cx = sx(s0) - 16; ctx.lineWidth = 16; ctx.strokeStyle = c.wood + (light() ? '.45)' : '.25)');
        ctx.beginPath(); ctx.moveTo(cx, g.top(s0) - 18); ctx.lineTo(cx, g.bot(s0) + 26); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = c.wood + (light() ? '.75)' : '.5)'); ctx.stroke();
        // chevilles
        ctx.fillStyle = c.wood + (light() ? '.8)' : '.6)');
        for (const S of strings) { ctx.beginPath(); ctx.arc(S.x, S.y0 - 2, 2.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(S.x, S.y1 + 2, 1.8, 0, TAU); ctx.fill(); }
        ctx.restore(); void N;
      }
      for (const S of strings) {
        const col = S.pc === 0 ? c.red : S.pc === 5 ? c.blue : c.str, en = energy(S.e);
        const scale = 1.8 * Math.min(1, 0.4 + (S.y1 - S.y0) / (H * 0.7));
        strokeString(c, col, vertString(S.e, S.x, S.y0, S.y1, scale), en, S.pc === 0 || S.pc === 5 ? 1.8 : 1.4);
        if (S.e.c && S.e.hm) { ctx.fillStyle = col; ctx.globalAlpha = Math.min(1, en * 0.3); for (let k = 1; k < S.e.hm; k++) { ctx.beginPath(); ctx.arc(S.x, S.y0 + ((S.y1 - S.y0) * k) / S.e.hm, 3, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
        if (keep.names) { ctx.fillStyle = S.pc === 0 ? c.red : c.dim; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(nom(S.m), S.x, S.y1 + 22); ctx.textAlign = 'left'; }
      }
    }
    function drawMono(c) {
      const g = monoGeom(), sc = 2.6;
      if (!bare()) {
        // la caisse de résonance et sa rosace
        ctx.save();
        ctx.fillStyle = c.wood + (light() ? '.12)' : '.06)'); ctx.strokeStyle = c.wood + (light() ? '.6)' : '.4)'); ctx.lineWidth = 1.5;
        rr(g.xa - 24, g.y + 22, g.xb - g.xa + 48, 46, 8); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc((g.xa + g.xb) / 2, g.y + 45, 11, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      // repères des rapports simples
      ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      for (const [p, q, name] of RATIOS) {
        if (name === 'demi-ton' || name === 'septième majeure') continue;
        const x = g.xa + (g.xb - g.xa) * (p / q), on = Math.abs(keep.bridge - p / q) < 0.002;
        ctx.strokeStyle = on ? (light() ? '#2a6a3a' : '#9ff0b8') : c.dim; ctx.lineWidth = on ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(x, g.y + 74); ctx.lineTo(x, g.y + 84); ctx.stroke();
        ctx.fillStyle = on ? (light() ? '#2a6a3a' : '#9ff0b8') : c.dim;
        const yy = g.y + 98 + ((RATIOS.findIndex((r) => r[2] === name) % 3) * 24);
        ctx.fillText(p + '/' + q, x, yy); ctx.fillText(name, x, yy + 10);
      }
      ctx.textAlign = 'left';
      // corde de référence (à vide) et corde au chevalet
      strokeString(c, c.str, horzString(mono.ref, g.xa, g.xb, g.yRef, sc), energy(mono.ref), 1.4);
      if (mono.ref.c && mono.ref.hm) { ctx.fillStyle = c.str; for (let k = 1; k < mono.ref.hm; k++) { ctx.beginPath(); ctx.arc(g.xa + ((g.xb - g.xa) * k) / mono.ref.hm, g.yRef, 3, 0, TAU); ctx.fill(); } }
      strokeString(c, light() ? '#7a3a1a' : '#ffd08a', horzString(mono.L, g.xa, g.xr, g.y, sc * Math.sqrt(keep.bridge)), energy(mono.L), 1.6);
      strokeString(c, c.str, horzString(mono.R, g.xr, g.xb, g.y, sc * Math.sqrt(1 - keep.bridge)), energy(mono.R), 1.2);
      // sillets et chevalet
      ctx.fillStyle = c.ink; for (const [x, y] of [[g.xa, g.yRef], [g.xb, g.yRef], [g.xa, g.y], [g.xb, g.y]]) { ctx.fillRect(x - 2, y - 6, 4, 12); }
      ctx.fillStyle = light() ? '#7a3a1a' : '#ffd08a'; ctx.beginPath(); ctx.moveTo(g.xr, g.y - 1); ctx.lineTo(g.xr - 9, g.y + 20); ctx.lineTo(g.xr + 9, g.y + 20); ctx.closePath(); ctx.fill();
      // lecture
      const r = keep.bridge, fL = mono.f0 / r, nr = nearestRatio(r);
      ctx.fillStyle = c.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText(`CORDE À VIDE ${fr(mono.f0, 1)} HZ (${nom(48).toUpperCase()})`, g.xa, g.yRef - 26);
      ctx.font = 'italic 500 19px "Space Grotesk", sans-serif'; ctx.fillStyle = light() ? '#2a2238' : '#fff6e6';
      const exact = nr.cents < 1;
      ctx.fillText(exact ? `${nr.q[2]} · longueur ${nr.q[0]}/${nr.q[1]}, fréquence × ${nr.q[1]}/${nr.q[0]}` : `${fr(1 / r, 3)} · près de la ${nr.q[2]} (${nr.cents < 50 ? fr(nr.cents, 0) + ' cents' : 'loin'})`, g.xa, g.y - 44);
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = c.txt;
      const beat = Math.abs(nr.q[0] * fL - nr.q[1] * mono.f0);
      ctx.fillText(`PARTIE GAUCHE ${fr(fL, 1)} HZ · ${nom(window.FKSON.ftom(fL)).toUpperCase()}${exact ? ' · HARMONIQUES COMMUNES : ELLES SE CONFONDENT' : ` · BATTEMENTS ${fr(beat, 1)} PAR SECONDE`}`, g.xa, g.y - 26);
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

    function aeoGeom() { const v = view(), xa = v.x0 + v.w * 0.14, xb = v.x1 - v.w * 0.14; return { v, xa, xb, y0: H * 0.3, y1: H * 0.82 }; }
    function drawAeo(c) {
      const g = aeoGeom(), U = windSpeed();
      // le vent : traînées qui glissent
      ctx.save(); ctx.globalCompositeOperation = light() ? 'source-over' : 'lighter';
      ctx.strokeStyle = light() ? 'rgba(60,80,120,.18)' : 'rgba(150,190,255,.10)'; ctx.lineWidth = 1;
      for (const q of streaks) { const x = g.v.x0 + q.x * g.v.w, y = H * (0.08 + 0.84 * q.y), l = (16 + 22 * U) * q.l; ctx.beginPath(); ctx.moveTo(x - l, y); ctx.lineTo(x, y + Math.sin(T * 2 + q.y * 30) * 1.5); ctx.stroke(); }
      ctx.restore();
      if (!bare()) {
        ctx.strokeStyle = c.wood + (light() ? '.6)' : '.4)'); ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(g.xa - 30, g.y0 - 8); ctx.lineTo(g.xb + 30, g.y0 - 8); ctx.moveTo(g.xa - 30, g.y1 + 8); ctx.lineTo(g.xb + 30, g.y1 + 8); ctx.stroke();
      }
      ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      let loud = null;
      for (const s of aeo) {
        const x = g.xa + ((g.xb - g.xa) * s.i) / (AEO_N - 1), n = Math.max(1, s.n);
        // la corde vibre selon son harmonique n : n fuseaux, n−1 nœuds
        const A = s.a * 16 / Math.sqrt(n), pts = [];
        for (let j = 0; j <= 80; j++) { const u = j / 80; pts.push([x + A * Math.sin(n * Math.PI * u) * Math.cos(s.ph), g.y0 + (g.y1 - g.y0) * u]); }
        const col = `hsl(${200 + n * 9},${light() ? 55 : 80}%,${light() ? 35 : 72}%)`;
        strokeString(c, col, pts, s.a * 5, 0.8 + s.d * 1400);
        if (s.a > 0.05) {
          ctx.fillStyle = col; ctx.globalAlpha = Math.min(1, s.a * 2);
          for (let k = 1; k < n; k++) { ctx.beginPath(); ctx.arc(x, g.y0 + ((g.y1 - g.y0) * k) / n, 2, 0, TAU); ctx.fill(); }
          ctx.fillText(`${n}`, x, g.y1 + 28); ctx.globalAlpha = 1;
        }
        ctx.fillStyle = c.dim; ctx.fillText(fr(s.d * 1000, 2) + ' mm', x, g.y1 + 42);
        if (!loud || s.a > loud.a) loud = s;
      }
      ctx.textAlign = 'left';
      // encart : la corde vue en coupe, et l'allée de tourbillons qu'elle laisse derrière elle
      if (loud) drawVortex(c, loud, U);
      ctx.fillStyle = c.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText(`VENT ${fr(U, 1)} M/S · TOUTES LES CORDES EN ${nom(38).toUpperCase()} (${fr(AEO_F0, 1)} HZ) · LE CHIFFRE : L’HARMONIQUE QUI CHANTE`, g.v.x0 + 16, H - 16);
    }
    function drawVortex(c, s, U) {
      const g = aeoGeom(), w = Math.min(340, g.v.w * 0.6), h = 92, x0 = g.v.cx - w / 2, y0 = H * 0.3 - h - 40;
      ctx.save();
      ctx.fillStyle = light() ? 'rgba(255,255,255,.7)' : 'rgba(10,8,20,.7)'; ctx.strokeStyle = c.dim; ctx.lineWidth = 1; rr(x0, y0, w, h, 6); ctx.fill(); ctx.stroke();
      ctx.beginPath(); rr(x0, y0, w, h, 6); ctx.clip();
      const cx = x0 + 40, cy = y0 + h / 2, R = 8;
      // tourbillons alternés, emportés par le vent (fréquence montrée au ralenti)
      const fvis = 0.6 + s.a * 0.8, sp = 32 + U * 6;
      for (let k = 0; k < 14; k++) {
        const age = (T * fvis + k / 2) % 7, x = cx + R + age * sp * 0.5, side = k % 2 ? 1 : -1, y = cy + side * R * 0.9;
        const rad = 5 + age * 2, a = Math.max(0, 1 - age / 7);
        ctx.strokeStyle = light() ? `rgba(40,70,140,${a * 0.6})` : `rgba(150,200,255,${a * 0.55})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); for (let j = 0; j <= 30; j++) { const th = (j / 30) * TAU * 1.5 * side + T * 3 * side, r2 = rad * (j / 30); const px = x + Math.cos(th) * r2, py = y + Math.sin(th) * r2; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
      }
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = c.txt; ctx.font = '500 9.5px "JetBrains Mono", monospace';
      ctx.fillText(`UNE CORDE VUE EN COUPE : ${Math.round(s.fs || 0)} TOURBILLONS PAR SECONDE → HARMONIQUE ${s.n}`, x0, y0 - 7);
    }
    function drawHarmInset(c) {
      if (!keep.harm || !lastPick || keep.scene === 'eolienne') return;
      const e = lastPick.kind === 'harpe' ? lastPick.S.e : lastPick.e; if (!e.c) return;
      const v = view(), w = Math.min(230, v.w * 0.3), h = 66, x0 = v.x1 - w - 16, y0 = H - h - 40;
      const a = []; let mx = 0; for (let n = 1; n <= NM; n++) { const q = Math.abs(amp(e, n)) * Math.pow(n, 0.5); a.push(q); mx = Math.max(mx, q); }
      if (mx < 1e-4) return;
      ctx.fillStyle = c.txt; ctx.font = '500 9.5px "JetBrains Mono", monospace';
      ctx.fillText('HARMONIQUES DE LA DERNIÈRE CORDE', x0, y0 - 8);
      const bw = w / NM;
      for (let n = 0; n < NM; n++) {
        const hh = (a[n] / mx) * h; ctx.fillStyle = light() ? `rgba(60,40,90,${0.25 + 0.6 * (a[n] / mx)})` : `rgba(255,220,170,${0.2 + 0.7 * (a[n] / mx)})`;
        ctx.fillRect(x0 + n * bw + 2, y0 + h - hh, bw - 4, hh);
        ctx.fillStyle = c.dim; ctx.fillText(String(n + 1), x0 + n * bw + bw / 2 - 3, y0 + h + 12);
      }
      const p = e.p, half = Math.abs(p - 0.5) < 0.04;
      ctx.fillStyle = c.txt;
      ctx.fillText(e.hm ? `EFFLEURÉE : SEULS LES MULTIPLES DE ${e.hm}` : half ? 'PINCÉE AU MILIEU : PAS D’HARMONIQUES PAIRS' : `PINCÉE AU ${Math.round(Math.min(p, 1 - p) * 100)} % DE SA LONGUEUR`, x0, y0 + h + 26);
    }
    function soundHint(c) {
      if (au && au.on) return null;
      const v = view(), w = 190, h = 34, x = v.cx - w / 2, y = H - 64;
      ctx.fillStyle = light() ? 'rgba(255,255,255,.8)' : 'rgba(20,14,34,.8)'; ctx.strokeStyle = light() ? '#c2368f' : '#ff8ad8'; ctx.lineWidth = 1;
      rr(x, y, w, h, 17); ctx.fill(); ctx.stroke();
      ctx.fillStyle = light() ? '#c2368f' : '#ff8ad8'; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText('♪  ACTIVER LE SON', v.cx, y + 21); ctx.textAlign = 'left';
      return { x, y, w, h };
    }
    let hintBox = null;
    function render() {
      const c = C();
      background(c);
      if (keep.scene === 'harpe') drawHarp(c);
      else if (keep.scene === 'mono') drawMono(c);
      else drawAeo(c);
      drawHarmInset(c);
      if (toast && T - toast.t < 4) { ctx.fillStyle = c.txt; ctx.globalAlpha = Math.min(1, (4 - (T - toast.t)) * 1.5); ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(toast.s, view().cx, 70); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
      hintBox = soundHint(c);
    }

    function update(k) {
      T += k;
      autoPlay(k);
      if (keep.scene === 'eolienne') updateAeo(k);
      // préparer les sons de la harpe pendant les temps morts
      if (B && keep.scene === 'harpe' && warm < strings.length) { const S = strings[warm++]; ks(B.ctx, S.f, { pos: 0.25, bright: 0.45, t60: keep.t60 * (1.25 - 0.55 * (S.i / strings.length)) }); }
    }

    /* ───────── gestes ───────── */
    function crossHarp(x0, y0, x1, y1, speed) {
      const hit = [];
      for (const S of strings) {
        if ((x0 - S.x) * (x1 - S.x) > 0 || x0 === x1) continue;
        const f = (S.x - x0) / (x1 - x0), y = y0 + (y1 - y0) * f;
        if (y < S.y0 - 6 || y > S.y1 + 6) continue;
        hit.push([Math.abs(S.x - x0), S, clamp((y - S.y0) / (S.y1 - S.y0), 0.04, 0.96)]);
      }
      hit.sort((a, b) => a[0] - b[0]);
      for (const [, S, p] of hit) harpPluck(S, clamp(1.5 + speed * 0.22, 1.5, 9), p);
    }
    function nearestString(x, y) { let best = null, bd = 30; for (const S of strings) { const d = Math.abs(S.x - x); if (d < bd && y > S.y0 - 10 && y < S.y1 + 10) { bd = d; best = S; } } return best; }

    buildHarp();
    if (keep.scene === 'eolienne') { buildAeo(); aeoAudioOn(); }

    if (window.FASC_DEBUG) window.FASC_DEBUG.harpe = { keep, setScene, au, get bus() { return B; }, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); }, pluck: (i, A = 6, p = 0.3, hm) => harpPluck(strings[i], A, p, hm), monoPlay, monoHarm, get strings() { return strings; }, get aeo() { return aeo; } };

    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) {
        idle = 0;
        if (hintBox && p.x > hintBox.x && p.x < hintBox.x + hintBox.w && p.y > hintBox.y && p.y < hintBox.y + hintBox.h) { env.askSound && env.askSound(); return; }
        lastPt = { x: p.x, y: p.y };
        const tool = env.tool || 'pincer';
        if (keep.scene === 'harpe') {
          const S = nearestString(p.x, p.y); if (!S) return;
          if (tool === 'etouffer') harpDamp(S);
          else if (tool === 'flageolet') { const u = (p.y - S.y0) / (S.y1 - S.y0), n = [2, 3, 4].reduce((b, m) => { const d = Math.min(...Array.from({ length: m - 1 }, (_, j) => Math.abs(u - (j + 1) / m))); return d < b[1] ? [m, d] : b; }, [2, 9])[0]; harpPluck(S, 5, clamp(u + 0.12, 0.05, 0.95), n); }
          else if (Math.abs(S.x - p.x) < 8) harpPluck(S, 3, clamp((p.y - S.y0) / (S.y1 - S.y0), 0.04, 0.96));
        } else if (keep.scene === 'mono') {
          const g = monoGeom();
          if (tool === 'pincer' && Math.abs(p.x - g.xr) < 22 && p.y > g.y - 30 && p.y < g.y + 40) { drag = 'bridge'; return; }
          if (tool === 'flageolet') { const u = clamp((p.x - g.xa) / (g.xb - g.xa), 0, 1); let best = 2, bd = 9; for (let n = 2; n <= 8; n++) for (let j = 1; j < n; j++) { const d = Math.abs(u - j / n) * (1 + n * 0.08); if (d < bd) { bd = d; best = n; } } monoHarm(best); return; }
          if (Math.abs(p.y - g.yRef) < 30) monoPlay('ref', 6, clamp((p.x - g.xa) / (g.xb - g.xa), 0.05, 0.95));
          else if (Math.abs(p.y - g.y) < 34) { if (p.x < g.xr) monoPlay('L', 6, clamp((p.x - g.xa) / (g.xr - g.xa), 0.05, 0.95)); else monoPlay('R', 6, clamp((p.x - g.xr) / (g.xb - g.xr), 0.05, 0.95)); }
        } else {
          gustV += 1.2; // souffler : une rafale
        }
      },
      move(p) {
        idle = 0;
        if (!p.down) { lastPt = null; return; }
        if (keep.scene === 'harpe' && (env.tool || 'pincer') === 'pincer' && lastPt) crossHarp(lastPt.x, lastPt.y, p.x, p.y, Math.hypot(p.dx || 0, p.dy || 0));
        if (keep.scene === 'harpe' && env.tool === 'etouffer') { const S = nearestString(p.x, p.y); if (S) harpDamp(S); }
        if (keep.scene === 'mono' && drag === 'bridge') {
          const g = monoGeom(); let r = clamp((p.x - g.xa) / (g.xb - g.xa), 0.08, 0.95);
          if (keep.snap) for (const [a, b] of RATIOS) if (Math.abs(r - a / b) < 0.012) r = a / b;
          keep.bridge = r;
        }
        lastPt = { x: p.x, y: p.y };
      },
      up() { lastPt = null; if (drag === 'bridge') { drag = null; monoPlay('L'); } drag = null; },
      clear() {
        for (const S of strings) harpDamp(S);
        for (const k of ['ref', 'L', 'R']) mono[k].c = null;
        idle = 0;
      },
      dispose() { aeoAudioOff(); if (B) B.dispose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'La harpe', act: () => setScene('harpe') },
          { label: 'Le monocorde', act: () => setScene('mono') },
          { label: 'Harpe éolienne', act: () => setScene('eolienne') },
        ] }];
        if (!(au && au.on)) L.push({ type: 'buttons', items: [{ label: '♪ Activer le son', act: () => env.askSound && env.askSound() }] });
        if (keep.scene === 'harpe') {
          L.push({ type: 'section', label: 'Harpe' });
          L.push({ type: 'choice', label: 'Gamme', value: keep.mode, set: (x) => { keep.mode = x; buildHarp(); }, options: Object.keys(MODES).map((k) => ({ id: k, label: MODES[k].label })) });
          L.push({ type: 'choice', label: 'Tonalité', value: String(keep.root), set: (x) => { keep.root = +x; buildHarp(); }, options: ROOTS.map(([n, m]) => ({ id: String(m), label: n })) });
          L.push({ type: 'toggle', label: 'Le vent joue quand on ne touche à rien', value: keep.auto, set: (x) => { keep.auto = x; idle = 0; } });
          L.push({ type: 'slider', label: 'Résonance', min: 1, max: 9, step: 0.1, value: keep.t60, fmt: (x) => fr(x, 1) + ' s', set: (x) => { keep.t60 = x; warm = 0; } });
          L.push({ type: 'toggle', label: 'Noms des notes', value: keep.names, set: (x) => { keep.names = x; } });
          L.push({ type: 'toggle', label: 'Harmoniques de la dernière corde', value: keep.harm, set: (x) => { keep.harm = x; } });
          L.push({ type: 'note', text: 'Cordes rouges : les do ; bleues : les fa, comme sur une vraie harpe. Glissez vite pour un glissando, pincez près du bord pour un son plus brillant. Outil « harmonique » : effleurez une corde en son milieu (octave) ou au tiers (quinte de l’octave).' });
        } else if (keep.scene === 'mono') {
          L.push({ type: 'section', label: 'Monocorde' });
          L.push({ type: 'buttons', items: RATIOS.slice(0, 5).map(([a, b, n]) => ({ label: n[0].toUpperCase() + n.slice(1), act: () => { keep.bridge = a / b; monoPlay('ref'); setTimeout(() => monoPlay('L'), 650); setTimeout(() => { monoPlay('ref', 4); monoPlay('L', 4); }, 1500); } })) });
          L.push({ type: 'buttons', items: [
            { label: 'Les deux ensemble', act: () => { monoPlay('ref', 5); monoPlay('L', 5); } },
            { label: 'Comma pythagoricien', act: () => comma() },
          ] });
          L.push({ type: 'toggle', label: 'Aimanter aux rapports simples', value: keep.snap, set: (x) => { keep.snap = x; } });
          L.push({ type: 'note', text: 'Faites glisser le chevalet, puis touchez la corde à gauche ou à droite de celui-ci. En haut, la même corde à vide, pour comparer. Hors des rapports simples, écoutez les battements : le son « tremble ». Outil « harmonique » : effleurez la corde du haut à la moitié, au tiers, au quart…' });
        } else {
          L.push({ type: 'section', label: 'Harpe éolienne' });
          L.push({ type: 'slider', label: 'Vent', min: 0.3, max: 6, step: 0.05, value: keep.wind, fmt: (x) => fr(x, 1) + ' m/s', set: (x) => { keep.wind = x; } });
          L.push({ type: 'toggle', label: 'Rafales', value: keep.gusts, set: (x) => { keep.gusts = x; } });
          L.push({ type: 'note', text: 'Huit cordes accordées sur la même note, de diamètres différents. Chacune chante l’harmonique la plus proche de la fréquence des tourbillons, et en change quand le vent forcit : écoutez les sauts. Touchez l’écran pour souffler une rafale.' });
        }
        L.push({ type: 'section', label: 'Salle' });
        L.push({ type: 'slider', label: 'Réverbération', min: 0, max: 1, step: 0.01, value: keep.rev, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.rev = x; if (B) B.rev(x); } });
        return L;
      },
    };

    // douze quintes justes, ramenées dans l'octave, ne retombent pas sur la note de départ : il manque 23,5 cents
    function comma() {
      toast = { s: 'Douze quintes justes dépassent sept octaves de 23,5 cents : écoutez le battement.', t: T };
      mono.L.c = null; keep.bridge = 1 / 1.0136432647705078;
      if (!B) return;
      const f = mono.f0, g = f * 1.0136432647705078;
      monoPlay('ref', 5); excite(mono.L, 5, 0.3);
      playBuf(B, ks(B.ctx, g, { pos: 0.3, bright: 0.45, t60: 6 }), 0.24, 0, 0.3);
    }
  }
})();
