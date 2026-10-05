/* Fascination — Le Spectre · voir le son (remplace « Le Visualiseur », id `viz` conservé)
   Spectrogramme : transformée de Fourier glissante (analyseur Web Audio, 8 192 points) sur une échelle de
   fréquences logarithmique, comme l'oreille ; sources synthétisées (chants inspirés d'oiseaux, baleine à bosse,
   voix chantée par formants, musique) ou micro ; on peut aussi y dessiner au doigt.
   Lissajous : deux sons purs, un dans chaque oreille, tracés l'un contre l'autre (x = gauche, y = droite).
   Timbre : seize partiels qu'on règle comme les tirettes d'un orgue, et le clavier pour les jouer. */
(function boot() {
  if (!window.FK || !window.FKSON) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const { mtof, ftom, nom, bus, ks, playBuf } = window.FKSON;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');

  // palette « inferno » (ajustement polynomial de Matt Zucker, d'après matplotlib)
  const LUT = (() => {
    const c = [[0.0002189, 0.0016510, -0.0194809], [0.1065134, 0.5639564, 3.9327124], [11.6024931, -3.9728540, -15.9423941], [-41.7039961, 17.4363989, 44.3541452], [77.1629357, -33.4023589, -81.8073093], [-71.3194282, 32.6260643, 73.2095199], [25.1311262, -12.2426690, -23.0703250]];
    const L = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) { const t = i / 255; for (let k = 0; k < 3; k++) { let v = 0; for (let j = 6; j >= 0; j--) v = v * t + c[j][k]; L[i * 3 + k] = clamp(v, 0, 1) * 255; } }
    return L;
  })();

  const SOURCES = [
    ['oiseaux', 'Oiseaux'], ['baleine', 'Baleine'], ['voix', 'Voix'], ['musique', 'Musique'], ['micro', 'Micro'], ['silence', 'Silence'],
  ];
  const LISS = [[1, 1, 'unisson'], [1, 2, 'octave'], [2, 3, 'quinte'], [3, 4, 'quarte'], [4, 5, 'tierce majeure'], [5, 6, 'tierce mineure'], [3, 5, 'sixte majeure'], [8, 9, 'ton'], [15, 16, 'demi-ton'], [32, 45, 'triton']];
  const PRESETS = {
    sinus: { label: 'Son pur', g: [1] },
    flute: { label: 'Flûte', g: [1, 0.45, 0.12, 0.08, 0.04, 0.02] },
    clarinette: { label: 'Clarinette', g: [1, 0.02, 0.75, 0.02, 0.5, 0.02, 0.14, 0.01, 0.5, 0, 0.12, 0, 0.17, 0, 0.06] },
    hautbois: { label: 'Hautbois', g: [0.45, 0.9, 1, 0.7, 0.55, 0.45, 0.3, 0.22, 0.15, 0.1, 0.07, 0.05] },
    violon: { label: 'Violon', g: Array.from({ length: 16 }, (_, i) => 1 / (i + 1)) },
    trompette: { label: 'Trompette', g: [0.6, 0.85, 1, 0.95, 0.8, 0.65, 0.5, 0.38, 0.28, 0.2, 0.14, 0.1, 0.07, 0.05] },
    orgue: { label: 'Orgue', g: [1, 1, 0.7, 0.8, 0, 0.5, 0, 0.6, 0, 0, 0, 0.3, 0, 0, 0, 0.2] },
    cloche: { label: 'Cloche', g: [1, 0.67, 1, 0.9, 0.95, 0.67, 0.6, 0.5, 0.45, 0.3, 0.2], r: [0.56, 0.92, 1.19, 1.7, 2, 2.74, 3, 3.76, 4.07, 5.2, 6.1], bell: true },
  };
  const keep = { scene: 'spectro', src: 'oiseaux', fmin: 60, fmax: 12000, notes: false, liss: 2, det: 1.5, trace: 0.85, preset: 'clarinette', g: PRESETS.clarinette.g.slice(), inh: 0, hold: false, env: 'tenu', base: 57 };

  window.FASC.push({
    id: 'viz', name: 'Le Spectre', cat: 'Sons', glyph: '▤', smoothTime: true,
    blurb: 'Voir le son : spectrogramme, Lissajous, timbre',
    hint: 'Activez le son. Spectrogramme : glissez le doigt pour chanter une note et la voir s’écrire. Timbre : tirez les barres, jouez au clavier.',
    intro: 'Un son, c’est une pression qui oscille. Mais l’oreille n’entend pas une courbe : elle entend des fréquences, comme un prisme décompose la lumière. Le spectrogramme montre ces fréquences au fil du temps (les graves en bas, les aigus en haut) : c’est ainsi que les ornithologues « lisent » les chants d’oiseaux.',
    about: [
      'Le spectrogramme découpe le son en tranches de 0,17 seconde et calcule, pour chacune, l’intensité de chaque fréquence (transformée de Fourier rapide, 8 192 points). L’échelle verticale est logarithmique, comme celle de l’oreille et du clavier : chaque octave occupe la même hauteur.',
      'Un son musical n’est presque jamais pur : une note de 220 Hz contient aussi 440, 660, 880 Hz… ses harmoniques, qui dessinent des lignes parallèles. Leur dosage fait le timbre. Les voyelles, elles, sont des bandes renforcées (les formants), creusées par la forme de la bouche : l’œil exercé lit un « a » ou un « i » sur un spectrogramme.',
      'Les chants d’oiseaux sont ici synthétisés, inspirés de vraies espèces (pouillot véloce, mésange charbonnière, merle, rossignol) ; ceux de la baleine à bosse aussi. Les baleines à bosse mâles chantent des thèmes répétés pendant des heures, et toute une population finit par chanter le même chant, qui évolue d’une année sur l’autre.',
      'Les figures de Lissajous (Jules Lissajous, 1857, qui les projetait avec deux diapasons munis de miroirs) : un son pur dans chaque oreille, l’un sur l’axe horizontal, l’autre sur l’axe vertical. Si leurs fréquences sont dans un rapport de petits entiers (2:3, la quinte), la courbe se referme et reste simple ; un léger désaccord la fait tourner lentement : c’est le battement, rendu visible.',
      'Le timbre : seize partiels (harmoniques) dont on règle l’intensité. La clarinette n’a presque que des harmoniques impairs (un tuyau fermé à un bout), le violon les a tous (dent de scie). Une cloche n’est pas harmonique : ses partiels (0,56 · 0,92 · 1,19 · 1,7 · 2 · 2,74…, d’après Jean-Claude Risset) ne sont pas des multiples entiers, d’où sa note ambiguë.',
    ],
    tools: [{ id: 'toucher', label: 'toucher', desc: 'Spectrogramme : glissez pour chanter. Lissajous : glissez pour désaccorder. Timbre : tirez les barres, touchez le clavier.' }],
    make(env) { return makeSpectre(env); },
  });

  function makeSpectre(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const B = bus(au, { rev: 0.25, sec: 3, gain: 0.95 });
    const c = B ? B.ctx : null;
    const light = () => env.theme === 'light';
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    let T = 0, toast = null, hintBox = null;
    const say = (s) => { toast = { s, t: T }; };

    /* ───────── analyseur ───────── */
    let an = null, fbuf = null, mic = null, micAn = null;
    if (c) { an = c.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0.15; an.minDecibels = -105; an.maxDecibels = -25; B.out.connect(an); fbuf = new Float32Array(an.frequencyBinCount); }
    async function startMic() {
      if (!c) return say('Activez d’abord le son.');
      if (mic) return;
      try {
        const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        const src = c.createMediaStreamSource(st);
        micAn = c.createAnalyser(); micAn.fftSize = 8192; micAn.smoothingTimeConstant = 0.15; micAn.minDecibels = -100; micAn.maxDecibels = -20;
        src.connect(micAn); mic = { st, src };
        say('Micro ouvert : sifflez, chantez, parlez…');
      } catch (e) { say('Micro indisponible ici (autorisation refusée ou page sans accès).'); keep.src = 'silence'; }
    }
    function stopMic() { if (mic) { mic.st.getTracks().forEach((t) => t.stop()); try { mic.src.disconnect(); } catch (e) { /* rien */ } mic = null; micAn = null; } }

    /* ───────── instruments de la source ───────── */
    const voices = new Set();
    function track(n, end) { voices.add(n); setTimeout(() => voices.delete(n), Math.max(0, (end - c.currentTime) * 1000 + 300)); }
    // un syllabe d'oiseau : sifflement (son presque pur) qui suit une courbe de fréquence
    function chirp(t0, dur, fc, ac, g = 0.08, h2 = 0.08, pan = 0) {
      if (!c) return;
      const n = 48, F = new Float32Array(n), A = new Float32Array(n), F2 = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / (n - 1); F[i] = Math.max(30, fc(u)); F2[i] = F[i] * 2; A[i] = Math.max(0, ac(u)) * g; }
      const o = c.createOscillator(), o2 = c.createOscillator(), v = c.createGain(), v2 = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null;
      o.frequency.setValueCurveAtTime(F, t0, dur); o2.frequency.setValueCurveAtTime(F2, t0, dur);
      v.gain.value = 0; v.gain.setValueCurveAtTime(A, t0, dur); v2.gain.value = h2;
      o.connect(v); o2.connect(v2); v2.connect(v);
      if (p) { p.pan.value = pan; v.connect(p); p.connect(B.input); } else v.connect(B.input);
      o.start(t0); o2.start(t0); o.stop(t0 + dur + 0.02); o2.stop(t0 + dur + 0.02);
      track(o, t0 + dur);
    }
    const bell = (u) => Math.sin(Math.PI * u) ** 0.7;
    const BIRDS = {
      // pouillot véloce : « tsip-tsap » alternés, brefs coups de sifflet descendants
      pouillot(t0, pan) { let t = t0; const n = 7 + rint(6); for (let i = 0; i < n; i++) { const hi = i % 2 === 0 ? 5200 : 4300; chirp(t, 0.09, (u) => hi + 600 * (1 - u) - 300 * u, bell, 0.07, 0.04, pan); t += 0.34 + rnd(0.06); } return t - t0; },
      // mésange charbonnière : « ti-tu ti-tu ti-tu »
      mesange(t0, pan) { let t = t0; const n = 3 + rint(3); for (let i = 0; i < n; i++) { chirp(t, 0.11, (u) => 6800 - 900 * u, bell, 0.06, 0.03, pan); chirp(t + 0.15, 0.13, (u) => 4300 + 200 * Math.sin(u * 3), bell, 0.07, 0.05, pan); t += 0.42; } return t - t0; },
      // merle : phrases flûtées, glissées, dans le médium
      merle(t0, pan) {
        let t = t0; const n = 4 + rint(4);
        for (let i = 0; i < n; i++) {
          const a = rnd(2600, 1500), b = a * rnd(1.35, 0.7), d = rnd(0.32, 0.12), w = rnd(1, 0) < 0.4;
          chirp(t, d, (u) => a + (b - a) * u + (w ? 220 * Math.sin(u * 30) : 0), (u) => bell(u) * (0.7 + 0.3 * Math.sin(u * 9)), 0.08, 0.22, pan);
          t += d + rnd(0.09, 0.03);
        }
        chirp(t + 0.05, 0.5, (u) => 6000 + 1500 * Math.sin(u * 60), (u) => bell(u) * 0.5, 0.03, 0.02, pan); // gazouillis final, aigu
        return t + 0.6 - t0;
      },
      // rossignol : notes répétées, puis crescendo de sifflets, puis un trille
      rossignol(t0, pan) {
        let t = t0; const f = rnd(3200, 2200);
        for (let i = 0; i < 6; i++) { chirp(t, 0.05, (u) => f * 1.6 - f * 0.8 * u, bell, 0.06, 0.15, pan); t += 0.12; }
        for (let i = 0; i < 5; i++) { chirp(t, 0.3, () => f * 0.55, bell, 0.02 + i * 0.014, 0.05, pan); t += 0.38; }
        chirp(t, 0.9, (u) => f + 1800 * Math.abs(Math.sin(u * Math.PI * 14)), (u) => bell(u), 0.06, 0.1, pan);
        return t + 1 - t0;
      },
    };
    // baleine à bosse : longs gémissements graves et glissés, riches en harmoniques
    function whale(t0, kind) {
      if (!c) return 0;
      const dur = kind === 'whoop' ? rnd(1.6, 0.9) : kind === 'grunt' ? 0.5 : rnd(3.2, 1.6);
      const f0 = kind === 'whoop' ? rnd(220, 150) : kind === 'grunt' ? rnd(90, 60) : rnd(420, 140), f1 = kind === 'whoop' ? f0 * rnd(4, 2.5) : kind === 'grunt' ? f0 * 0.8 : f0 * rnd(1.5, 0.6);
      const n = 48, F = new Float32Array(n), A = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / (n - 1); F[i] = f0 * Math.pow(f1 / f0, kind === 'whoop' ? u * u : u) * (1 + 0.012 * Math.sin(u * 40)); A[i] = Math.sin(Math.PI * u) ** (kind === 'grunt' ? 0.4 : 1.2) * 0.16; }
      const o = c.createOscillator(), lp = c.createBiquadFilter(), bp = c.createBiquadFilter(), v = c.createGain(), v2 = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueCurveAtTime(F, t0, dur);
      lp.type = 'lowpass'; lp.frequency.value = kind === 'whoop' ? 2400 : 1300; lp.Q.value = 0.5;
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 3; v2.gain.value = 0.6;
      v.gain.value = 0; v.gain.setValueCurveAtTime(A, t0, dur);
      o.connect(lp); lp.connect(v); o.connect(bp); bp.connect(v2); v2.connect(v); v.connect(B.input);
      o.start(t0); o.stop(t0 + dur + 0.05); track(o, t0 + dur);
      return dur;
    }
    // la voix : une source riche (dent de scie, avec vibrato) filtrée par trois formants
    const VOWELS = { a: [730, 1250, 2550], é: [400, 2050, 2650], i: [280, 2250, 3000], o: [390, 760, 2400], ou: [300, 750, 2300], u: [280, 1800, 2250], è: [550, 1850, 2600] };
    let voice = null;
    function voiceOn() {
      if (!c || voice) return;
      const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 196;
      lfo.frequency.value = 5.3; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.detune); // vibrato ±14 cents
      const F = [0, 1, 2].map((i) => { const b = c.createBiquadFilter(), v = c.createGain(); b.type = 'bandpass'; b.Q.value = [9, 12, 14][i]; b.frequency.value = VOWELS.a[i]; v.gain.value = [1, 0.55, 0.3][i] * 2.6; o.connect(b); b.connect(v); v.connect(g); return { b, v }; });
      g.gain.value = 0; g.connect(B.input); o.start(); lfo.start();
      voice = { o, lfo, g, F, step: 0, next: 0 };
    }
    function voiceOff() { if (!voice) return; const t = c.currentTime; voice.g.gain.setTargetAtTime(0, t, 0.08); voice.o.stop(t + 0.5); voice.lfo.stop(t + 0.5); voice = null; }
    const MELO = [[55, 'a'], [57, 'é'], [59, 'i'], [62, 'o'], [59, 'ou'], [57, 'u'], [55, 'è'], [52, 'a'], [55, 'o'], [50, 'i'], [52, 'ou'], [55, 'a']];

    /* ───────── programmation de la source (en temps de la machine, joué en temps réel) ───────── */
    let nextEv = 0, birdTurn = 0, whaleTurn = 0, musicStep = 0;
    const lead = (dtSim) => c.currentTime + 0.06 + dtSim / Math.max(0.05, env.speed || 1);
    function sourceTick() {
      if (!c || keep.scene !== 'spectro') return;
      if (keep.src === 'voix') {
        voiceOn();
        if (T >= voice.next) {
          const [m, vw] = MELO[voice.step++ % MELO.length], t = lead(0);
          voice.o.frequency.setTargetAtTime(mtof(m), t, 0.04);
          voice.F.forEach((f, i) => f.b.frequency.setTargetAtTime(VOWELS[vw][i], t, 0.05));
          voice.g.gain.setTargetAtTime(0.11, t, 0.05);
          voice.vw = vw; voice.next = T + (voice.step % 4 === 0 ? 1.6 : 1.05);
          if (voice.step % 4 === 0) voice.g.gain.setTargetAtTime(0, t + 1.05, 0.08);
        }
        return;
      }
      voiceOff();
      if (T < nextEv) return;
      if (keep.src === 'oiseaux') {
        const sp = ['pouillot', 'mesange', 'merle', 'rossignol'][birdTurn++ % 4], pan = rnd(0.7, -0.7);
        const d = BIRDS[sp](lead(0), pan); curBird = sp;
        nextEv = T + d + rnd(1.6, 0.6);
      } else if (keep.src === 'baleine') {
        const th = ['moan', 'moan', 'whoop', 'grunt', 'grunt', 'moan', 'whoop'][whaleTurn++ % 7];
        const d = whale(lead(0), th);
        nextEv = T + d + (th === 'grunt' ? 0.25 : rnd(1.2, 0.4));
      } else if (keep.src === 'musique') {
        // arpèges de cordes pincées sur une grille lente (la mineur, fa, do, sol)
        const ch = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]][Math.floor(musicStep / 8) % 4], i = musicStep % 8;
        const m = ch[[0, 1, 2, 3, 2, 1, 3, 2][i]] + (i === 3 ? 12 : 0);
        playBuf(B, ks(c, mtof(m), { pos: 0.22, bright: 0.55, t60: 2.5 }), 0.22, lead(0), rnd(0.4, -0.4));
        if (i === 0) playBuf(B, ks(c, mtof(ch[0] - 12), { pos: 0.3, bright: 0.35, t60: 4 }), 0.25, lead(0));
        musicStep++; nextEv = T + 0.28;
      } else if (keep.src === 'micro') { if (!mic) startMic(); nextEv = T + 1e9; }
      else nextEv = T + 0.5;
    }
    let curBird = '';
    function stopSource() { voiceOff(); for (const o of voices) { try { o.stop(); } catch (e) { /* rien */ } } voices.clear(); nextEv = 0; if (keep.src !== 'micro') stopMic(); }

    /* ───────── chanter au doigt ───────── */
    let sing = null;
    const yToF = (y) => { const g = specGeom(); return keep.fmin * Math.pow(keep.fmax / keep.fmin, clamp(1 - (y - g.y0) / (g.y1 - g.y0), 0, 1)); };
    function singOn(y) {
      if (!c) return;
      const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain();
      o.frequency.value = yToF(y); o2.frequency.value = yToF(y) * 2; g2.gain.value = 0.15; o2.connect(g2); g2.connect(g);
      o.connect(g); g.gain.value = 0; g.gain.setTargetAtTime(0.09, c.currentTime, 0.02); g.connect(B.input); o.start(); o2.start();
      sing = { o, o2, g, y };
    }
    function singMove(y) { if (!sing) return; const f = yToF(y), t = c.currentTime; sing.o.frequency.setTargetAtTime(f, t, 0.012); sing.o2.frequency.setTargetAtTime(f * 2, t, 0.012); sing.y = y; }
    function singOff() { if (!sing) return; const t = c.currentTime; sing.g.gain.setTargetAtTime(0, t, 0.03); sing.o.stop(t + 0.3); sing.o2.stop(t + 0.3); sing = null; }

    /* ───────── spectrogramme : image qui défile ───────── */
    const sg = document.createElement('canvas'), sx = sg.getContext('2d');
    let sgW = 0, sgH = 0, col = null, rowBins = null, scroll = 0;
    function specGeom() { const v = view(); return { v, x0: v.x0 + 54, x1: v.x1 - 14, y0: 64, y1: H - 46 }; }
    function sgSetup() {
      const g = specGeom(), w = Math.max(50, Math.round(g.x1 - g.x0)), h = Math.max(50, Math.round(g.y1 - g.y0));
      if (w === sgW && h === sgH && rowBins && rowBins.fmin === keep.fmin) return;
      sgW = w; sgH = h; sg.width = w; sg.height = h; sx.fillStyle = light() ? '#fbf8f2' : '#000004'; sx.fillRect(0, 0, w, h);
      col = sx.createImageData(1, h);
      const sr = c ? c.sampleRate : 48000, bw = sr / 8192;
      rowBins = new Float32Array(h * 2); rowBins.fmin = keep.fmin;
      for (let y = 0; y < h; y++) {
        const f0 = keep.fmin * Math.pow(keep.fmax / keep.fmin, 1 - (y + 0.5) / h), f1 = keep.fmin * Math.pow(keep.fmax / keep.fmin, 1 - (y - 0.5) / h);
        rowBins[y * 2] = f0 / bw; rowBins[y * 2 + 1] = f1 / bw;
      }
    }
    function sgColumn(src) {
      const an2 = src; let ok = false;
      if (an2) { an2.getFloatFrequencyData(fbuf); ok = true; }
      const d = col.data, L = light();
      for (let y = 0; y < sgH; y++) {
        let v = -140;
        if (ok) {
          const b0 = rowBins[y * 2], b1 = rowBins[y * 2 + 1];
          if (b1 - b0 < 1) { const i = Math.floor(b0), fpart = b0 - i; v = fbuf[i] * (1 - fpart) + fbuf[Math.min(fbuf.length - 1, i + 1)] * fpart; }
          else for (let i = Math.floor(b0); i <= Math.ceil(b1) && i < fbuf.length; i++) if (fbuf[i] > v) v = fbuf[i];
        }
        let t = clamp((v + 100) / 72, 0, 1); t = t * t * (3 - 2 * t);
        const k = Math.round(t * 255) * 3;
        if (L) { d[y * 4] = 251 - t * 200; d[y * 4 + 1] = 248 - t * 215; d[y * 4 + 2] = 242 - t * 150; }
        else { d[y * 4] = LUT[k]; d[y * 4 + 1] = LUT[k + 1]; d[y * 4 + 2] = LUT[k + 2]; }
        d[y * 4 + 3] = 255;
      }
    }
    function sgAdvance(k) {
      sgSetup();
      scroll += k * 70; // pixels par seconde
      let n = Math.floor(scroll); scroll -= n; if (n <= 0) return; n = Math.min(n, 12);
      sx.drawImage(sg, -n, 0);
      const src = keep.src === 'micro' ? micAn : an;
      if (src && fbuf && micAn && src === micAn && fbuf.length !== micAn.frequencyBinCount) fbuf = new Float32Array(micAn.frequencyBinCount);
      sgColumn(src);
      for (let i = 0; i < n; i++) sx.putImageData(col, sgW - n + i, 0);
    }
    function drawSpectro(cc) {
      const g = specGeom();
      ctx.drawImage(sg, g.x0, g.y0);
      // graduations : fréquences et (option) notes
      ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
      const yOf = (f) => g.y0 + (g.y1 - g.y0) * (1 - Math.log(f / keep.fmin) / Math.log(keep.fmax / keep.fmin));
      for (const f of [62.5, 125, 250, 500, 1000, 2000, 4000, 8000]) {
        if (f < keep.fmin || f > keep.fmax) continue;
        const y = yOf(f); ctx.fillStyle = cc.dim; ctx.fillText(f >= 1000 ? fr(f / 1000, f % 1000 ? 1 : 0) + ' kHz' : Math.round(f) + ' Hz', g.x0 - 6, y + 3);
        ctx.strokeStyle = light() ? 'rgba(40,30,60,.12)' : 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke();
      }
      if (keep.notes) for (let m = 36; m <= 108; m += 12) { const f = mtof(m); if (f < keep.fmin || f > keep.fmax) continue; const y = yOf(f); ctx.fillStyle = light() ? '#a02a6a' : '#ff8ad8'; ctx.textAlign = 'left'; ctx.fillText(nom(m), g.x1 - 30, y - 2); }
      ctx.textAlign = 'left';
      if (sing) { ctx.strokeStyle = light() ? '#c2368f' : '#ff8ad8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.x1 - 6, sing.y, 7, 0, TAU); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.fillText(`${Math.round(yToF(sing.y))} Hz · ${nom(ftom(yToF(sing.y)))}`, g.x1 - 130, sing.y - 12); }
      // légende de la source
      ctx.fillStyle = cc.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      const lab = keep.src === 'oiseaux' ? 'CHANT SYNTHÉTIQUE INSPIRÉ ' + ({ pouillot: 'DU POUILLOT VÉLOCE', mesange: 'DE LA MÉSANGE CHARBONNIÈRE', merle: 'DU MERLE NOIR', rossignol: 'DU ROSSIGNOL' }[curBird] || '…')
        : keep.src === 'voix' ? `VOIX CHANTÉE PAR FORMANTS · VOYELLE « ${voice && voice.vw ? voice.vw.toUpperCase() : '…'} » : LES BANDES RENFORCÉES SONT LES FORMANTS`
        : keep.src === 'baleine' ? 'BALEINE À BOSSE (SYNTHÈSE) · GÉMISSEMENTS, « WHOOPS » MONTANTS, GROGNEMENTS'
        : keep.src === 'musique' ? 'CORDES PINCÉES : CHAQUE NOTE EST UNE PILE D’HARMONIQUES PARALLÈLES'
        : keep.src === 'micro' ? (mic ? 'MICRO : SIFFLEZ, CHANTEZ, PARLEZ…' : 'MICRO : EN ATTENTE D’AUTORISATION') : 'SILENCE : DESSINEZ AU DOIGT';
      ctx.fillText(lab, g.x0, g.y1 + 30);
      if (!c) { ctx.fillStyle = cc.txt; ctx.font = 'italic 500 16px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Pour voir le son, il faut l’entendre : activez le son.', (g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2); ctx.textAlign = 'left'; }
    }

    /* ───────── Lissajous ───────── */
    const ph = document.createElement('canvas'), px = ph.getContext('2d');
    let lissNodes = null, lissPhase = 0;
    function lissFreqs() { const [p, q] = LISS[keep.liss]; return [220, ((220 * q) / p) * Math.pow(2, keep.det / 1200)]; }
    function lissOn() {
      if (!c || lissNodes) return;
      const m = c.createChannelMerger(2), g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.09, c.currentTime, 0.1);
      const [fa, fb] = lissFreqs();
      const oa = c.createOscillator(), ob = c.createOscillator(); oa.frequency.value = fa; ob.frequency.value = fb;
      oa.connect(m, 0, 0); ob.connect(m, 0, 1); m.connect(g); g.connect(B.input); oa.start(); ob.start();
      lissNodes = { oa, ob, g };
    }
    function lissRetune() { if (!lissNodes) return; const [fa, fb] = lissFreqs(), t = c.currentTime; lissNodes.oa.frequency.setTargetAtTime(fa, t, 0.03); lissNodes.ob.frequency.setTargetAtTime(fb, t, 0.03); }
    function lissOff() { if (!lissNodes) return; const t = c.currentTime; lissNodes.g.gain.setTargetAtTime(0, t, 0.05); lissNodes.oa.stop(t + 0.4); lissNodes.ob.stop(t + 0.4); lissNodes = null; }
    function drawLiss(cc, k) {
      const v = view(), S = Math.min(v.w, H) * 0.34, cx = v.cx, cy = H * 0.5;
      if (ph.width !== W || ph.height !== H) { ph.width = W; ph.height = H; }
      const [p, q, name] = LISS[keep.liss];
      const fa = 220, fb = (220 * q) / p * Math.pow(2, keep.det / 1200), beat = fb - (220 * q) / p;
      lissPhase += TAU * beat * k; // dérive de phase = battement
      // persistance du phosphore
      px.globalCompositeOperation = 'source-over'; px.fillStyle = light() ? `rgba(246,242,234,${1 - keep.trace})` : `rgba(2,6,4,${1 - keep.trace})`; px.fillRect(0, 0, W, H);
      px.globalCompositeOperation = light() ? 'source-over' : 'lighter';
      const n = Math.min(5000, 70 * Math.max(p, q)), per = p; // une période complète de la figure : p tours de la voie lente
      const pass = (lw, a, colr) => {
        px.strokeStyle = colr; px.globalAlpha = a; px.lineWidth = lw; px.beginPath();
        for (let i = 0; i <= n; i++) { const tt = (i / n) * per; const x = cx + S * Math.sin(TAU * tt), y = cy - S * Math.sin(TAU * tt * (q / p) + lissPhase); i ? px.lineTo(x, y) : px.moveTo(x, y); }
        px.stroke();
      };
      if (light()) pass(1.6, 0.8, '#1e4a3a');
      else { pass(7, 0.06, '#5dffb0'); pass(3, 0.18, '#7dffc0'); pass(1.2, 0.8, '#d8ffe8'); }
      px.globalAlpha = 1; px.globalCompositeOperation = 'source-over';
      ctx.drawImage(ph, 0, 0, W, H);
      // réticule
      ctx.strokeStyle = light() ? 'rgba(30,60,50,.18)' : 'rgba(120,255,190,.12)'; ctx.lineWidth = 1;
      ctx.strokeRect(cx - S * 1.1, cy - S * 1.1, S * 2.2, S * 2.2);
      for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(cx + (i * S * 1.1) / 4, cy - S * 1.1); ctx.lineTo(cx + (i * S * 1.1) / 4, cy + S * 1.1); ctx.moveTo(cx - S * 1.1, cy + (i * S * 1.1) / 4); ctx.lineTo(cx + S * 1.1, cy + (i * S * 1.1) / 4); ctx.globalAlpha = i === 0 ? 1 : 0.4; ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.fillStyle = cc.txt; ctx.font = 'italic 500 19px "Space Grotesk", sans-serif';
      ctx.fillText(`${p} : ${q} · ${name}`, v.x0 + 22, H - 70);
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText(`GAUCHE ${fr(fa, 1)} HZ (HORIZONTAL) · DROITE ${fr(fb, 2)} HZ (VERTICAL)`, v.x0 + 22, H - 50);
      ctx.fillText(Math.abs(keep.det) < 0.05 ? 'ACCORD PARFAIT : LA FIGURE EST IMMOBILE' : `DÉSACCORD ${fr(keep.det, 1)} CENTS → LA FIGURE TOURNE ${fr(Math.abs(beat), 2)} FOIS PAR SECONDE`, v.x0 + 22, H - 34);
    }

    /* ───────── Timbre ───────── */
    const NP = 16;
    const held = new Map(); // note → voix
    function ratios() { const P = PRESETS[keep.preset]; return Array.from({ length: NP }, (_, i) => (P && P.r && i < P.r.length ? P.r[i] : (i + 1) * Math.sqrt(1 + keep.inh * (i + 1) * (i + 1)))); }
    function partialGains() { const s = keep.g.reduce((a, b, i) => a + (b || 0) / Math.sqrt(i + 1), 0) || 1; return keep.g.map((x) => (x || 0) / Math.max(1, s * 0.9)); }
    function noteOn(m) {
      if (!c) return;
      if (held.has(m)) noteOff(m, 0.01);
      const f = mtof(m), R = ratios(), G = partialGains(), t = c.currentTime, out = c.createGain();
      const bellish = PRESETS[keep.preset] && PRESETS[keep.preset].bell, pl = keep.env === 'pince' || bellish;
      out.gain.value = 0; out.gain.linearRampToValueAtTime(0.16, t + (pl ? 0.005 : 0.05));
      const parts = [];
      for (let i = 0; i < NP; i++) {
        const fq = f * R[i]; if (fq > 18000) continue;
        const o = c.createOscillator(), g = c.createGain(); o.frequency.value = fq; g.gain.value = G[i] || 0;
        if (pl) { const tau = bellish ? 4.5 / (1 + i * 0.45) : 2.2 / (1 + i * 0.35); g.gain.setTargetAtTime(0, t + 0.01, tau / 3); }
        o.connect(g); g.connect(out); o.start(t); parts.push({ o, g, i });
      }
      out.connect(B.input);
      const vce = { out, parts, t0: T, pl };
      held.set(m, vce);
      if (pl) setTimeout(() => { if (held.get(m) === vce) noteOff(m, 0.5); }, 6000);
    }
    function noteOff(m, rel = 0.25) { const v = held.get(m); if (!v) return; held.delete(m); const t = c.currentTime; v.out.gain.cancelScheduledValues(t); v.out.gain.setTargetAtTime(0, t, rel / 3); for (const p of v.parts) p.o.stop(t + rel * 2 + 0.1); }
    function retimbre() { const G = partialGains(), R = ratios(), t = c ? c.currentTime : 0; for (const [m, v] of held) { if (v.pl) continue; const f = mtof(m); for (const p of v.parts) { p.g.gain.setTargetAtTime(G[p.i] || 0, t, 0.03); p.o.frequency.setTargetAtTime(f * R[p.i], t, 0.03); } } }
    function timbreGeom() {
      const v = view(), bx0 = v.x0 + v.w * 0.08, bx1 = v.x1 - v.w * 0.08, by0 = H * 0.42, by1 = H * 0.7;
      const kx0 = v.x0 + v.w * 0.12, kx1 = v.x1 - v.w * 0.12, ky0 = H * 0.78, ky1 = H - 26;
      return { v, bx0, bx1, by0, by1, kx0, kx1, ky0, ky1, bw: (bx1 - bx0) / NP };
    }
    const KEYS = Array.from({ length: 13 }, (_, i) => i); // do à do
    function keyAt(x, y) {
      const g = timbreGeom(); if (y < g.ky0 || y > g.ky1 || x < g.kx0 || x > g.kx1) return null;
      const whites = [0, 2, 4, 5, 7, 9, 11, 12], ww = (g.kx1 - g.kx0) / whites.length;
      if (y < g.ky0 + (g.ky1 - g.ky0) * 0.6) for (const s of [1, 3, 6, 8, 10]) { const wi = whites.indexOf(s - 1), xc = g.kx0 + (wi + 1) * ww; if (Math.abs(x - xc) < ww * 0.3) return 48 + s; }
      return 48 + whites[clamp(Math.floor((x - g.kx0) / ww), 0, whites.length - 1)];
    }
    function drawTimbre(cc) {
      const g = timbreGeom(), R = ratios(), G = keep.g, f0 = mtof(keep.base);
      // la forme d'onde : somme des partiels (deux périodes de la fondamentale)
      const wx0 = g.v.x0 + g.v.w * 0.08, wx1 = g.v.x1 - g.v.w * 0.08, wy = H * 0.24, wa = H * 0.1;
      const pts = []; let mx = 1e-6;
      for (let i = 0; i <= 400; i++) { const tt = (i / 400) * 2; let s = 0; for (let n = 0; n < NP; n++) if (G[n]) s += G[n] * Math.sin(TAU * R[n] * tt + n * 0.3 * 0); pts.push(s); mx = Math.max(mx, Math.abs(s)); }
      ctx.strokeStyle = light() ? 'rgba(40,30,60,.18)' : 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx0, wy); ctx.lineTo(wx1, wy); ctx.stroke();
      ctx.strokeStyle = light() ? '#6f45d4' : '#ff8ad8'; ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach((s, i) => { const x = wx0 + ((wx1 - wx0) * i) / 400, y = wy - (s / mx) * wa; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      ctx.fillStyle = cc.txt; ctx.font = '500 10.5px "JetBrains Mono", monospace';
      ctx.fillText('FORME D’ONDE (DEUX PÉRIODES)', wx0, wy - wa - 12);
      // les tirettes
      ctx.textAlign = 'center';
      for (let n = 0; n < NP; n++) {
        const x = g.bx0 + n * g.bw, hgt = (G[n] || 0) * (g.by1 - g.by0);
        ctx.fillStyle = light() ? 'rgba(40,30,60,.07)' : 'rgba(255,255,255,.05)'; ctx.fillRect(x + 3, g.by0, g.bw - 6, g.by1 - g.by0);
        const hue = 300 - n * 9; ctx.fillStyle = `hsla(${hue},${light() ? 55 : 85}%,${light() ? 45 : 68}%,.9)`;
        ctx.fillRect(x + 3, g.by1 - hgt, g.bw - 6, hgt);
        ctx.fillStyle = cc.dim; ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillText(String(n + 1), x + g.bw / 2, g.by1 + 13);
        const m = ftom(f0 * R[n]), dev = Math.round((m - Math.round(m)) * 100);
        if (g.bw > 30 || n % 2 === 0) ctx.fillText(nom(m) + (Math.abs(dev) > 8 ? (dev > 0 ? '+' : '') + dev : ''), x + g.bw / 2, g.by1 + 25);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = cc.txt; ctx.font = '500 10.5px "JetBrains Mono", monospace';
      ctx.fillText(`PARTIELS (TIREZ LES BARRES) · SOUS CHAQUE BARRE, LA NOTE QU’IL FAIT ENTENDRE SUR ${nom(keep.base).toUpperCase()} (ÉCART EN CENTS)`, g.bx0, g.by0 - 10);
      // le clavier
      const whites = [0, 2, 4, 5, 7, 9, 11, 12], ww = (g.kx1 - g.kx0) / whites.length;
      whites.forEach((s, i) => { const on = held.has(48 + s); ctx.fillStyle = on ? (light() ? '#d8c8f0' : '#ffd2ee') : light() ? '#fffdf8' : '#e9e4f2'; ctx.fillRect(g.kx0 + i * ww + 1, g.ky0, ww - 2, g.ky1 - g.ky0); ctx.fillStyle = '#5a5070'; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(nom(48 + s), g.kx0 + i * ww + ww / 2, g.ky1 - 8); ctx.textAlign = 'left'; });
      for (const s of [1, 3, 6, 8, 10]) { const wi = whites.indexOf(s - 1), xc = g.kx0 + (wi + 1) * ww, on = held.has(48 + s); ctx.fillStyle = on ? '#b05a9a' : '#1d1828'; ctx.fillRect(xc - ww * 0.3, g.ky0, ww * 0.6, (g.ky1 - g.ky0) * 0.6); }
    }

    /* ───────── scènes ───────── */
    function setScene(id) {
      if (keep.scene === 'spectro' && id !== 'spectro') { stopSource(); singOff(); }
      if (keep.scene === 'liss' && id !== 'liss') lissOff();
      if (keep.scene === 'timbre' && id !== 'timbre') for (const m of [...held.keys()]) noteOff(m);
      keep.scene = id;
      if (id === 'liss') { ph.width = 0; lissOn(); }
      if (id === 'timbre' && keep.hold) noteOn(keep.base);
    }
    function setSrc(s) { stopSource(); singOff(); keep.src = s; if (s !== 'micro') stopMic(); }

    const C = () => light()
      ? { bg: '#f4f0e8', txt: 'rgba(40,30,60,.78)', dim: 'rgba(40,30,60,.45)' }
      : { bg: '#06050b', txt: 'rgba(235,228,255,.78)', dim: 'rgba(235,228,255,.4)' };
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function soundHint(cc) {
      if (c) return null;
      const v = view(), w = 190, h = 34, x = v.cx - w / 2, y = H - 64 - (keep.scene === 'timbre' ? H * 0.25 : 0);
      ctx.fillStyle = light() ? 'rgba(255,255,255,.85)' : 'rgba(20,14,34,.85)'; ctx.strokeStyle = light() ? '#c2368f' : '#ff8ad8'; ctx.lineWidth = 1; rr(x, y, w, h, 17); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('♪  ACTIVER LE SON', v.cx, y + 21); ctx.textAlign = 'left'; void cc;
      return { x, y, w, h };
    }
    let lastK = 0;
    function update(k) {
      T += k; lastK = k;
      if (keep.scene === 'spectro') { sourceTick(); sgAdvance(k); }
    }
    function render() {
      const cc = C();
      ctx.fillStyle = keep.scene === 'liss' && !light() ? '#020604' : cc.bg; ctx.fillRect(0, 0, W, H);
      if (keep.scene === 'spectro') drawSpectro(cc);
      else if (keep.scene === 'liss') drawLiss(cc, lastK);
      else drawTimbre(cc);
      if (toast && T - toast.t < 5) { ctx.fillStyle = cc.txt; ctx.globalAlpha = Math.min(1, (5 - (T - toast.t)) * 1.5); ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(toast.s, view().cx, 50); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
      hintBox = soundHint(cc);
      lastK = 0;
    }

    if (keep.scene === 'liss') lissOn();
    if (keep.scene === 'timbre' && keep.hold) noteOn(keep.base);
    if (window.FASC_DEBUG) window.FASC_DEBUG.spectre = { keep, setScene, setSrc, noteOn, noteOff, retimbre, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); }, get an() { return an; } };

    let barDrag = null, keyDown = null, lastX = null;
    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) {
        if (hintBox && p.x > hintBox.x && p.x < hintBox.x + hintBox.w && p.y > hintBox.y && p.y < hintBox.y + hintBox.h) { env.askSound && env.askSound(); return; }
        lastX = p.x;
        if (keep.scene === 'spectro') { const g = specGeom(); if (p.y > g.y0 && p.y < g.y1) singOn(p.y); }
        else if (keep.scene === 'timbre') {
          const g = timbreGeom();
          if (p.y > g.by0 - 10 && p.y < g.by1 + 6 && p.x > g.bx0 && p.x < g.bx1) { barDrag = true; this.move({ ...p, down: true }); return; }
          const m = keyAt(p.x, p.y); if (m != null) { keyDown = m; keep.base = m; noteOn(m); }
        }
      },
      move(p) {
        if (!p.down) return;
        if (keep.scene === 'spectro') singMove(p.y);
        else if (keep.scene === 'liss' && lastX != null) { keep.det = clamp(keep.det + (p.x - lastX) * 0.05, -60, 60); lissRetune(); }
        else if (keep.scene === 'timbre' && barDrag) {
          const g = timbreGeom(), n = Math.floor((p.x - g.bx0) / g.bw);
          if (n >= 0 && n < NP) { keep.g[n] = clamp((g.by1 - p.y) / (g.by1 - g.by0), 0, 1); if (keep.g[n] < 0.02) keep.g[n] = 0; keep.preset = PRESETS[keep.preset] && PRESETS[keep.preset].bell ? 'cloche' : 'libre'; retimbre(); }
        } else if (keep.scene === 'timbre' && keyDown != null) { const m = keyAt(p.x, p.y); if (m != null && m !== keyDown) { noteOff(keyDown); keyDown = m; keep.base = m; noteOn(m); } }
        lastX = p.x;
      },
      up() { singOff(); barDrag = null; if (keyDown != null) { if (!keep.hold) noteOff(keyDown); keyDown = null; } lastX = null; },
      clear() { sx.fillStyle = light() ? '#fbf8f2' : '#000004'; sx.fillRect(0, 0, sgW, sgH); ph.width = 0; for (const m of [...held.keys()]) noteOff(m); },
      dispose() { stopSource(); singOff(); lissOff(); stopMic(); for (const m of [...held.keys()]) noteOff(m, 0.05); try { if (an) B.out.disconnect(an); } catch (e) { /* rien */ } if (B) B.dispose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'Spectrogramme', act: () => setScene('spectro') },
          { label: 'Lissajous', act: () => setScene('liss') },
          { label: 'Timbre', act: () => setScene('timbre') },
        ] }];
        if (!c) L.push({ type: 'buttons', items: [{ label: '♪ Activer le son', act: () => env.askSound && env.askSound() }] });
        if (keep.scene === 'spectro') {
          L.push({ type: 'section', label: 'Spectrogramme' });
          L.push({ type: 'choice', label: 'Source', value: keep.src, set: (x) => setSrc(x), options: SOURCES.map(([id, label]) => ({ id, label })) });
          L.push({ type: 'toggle', label: 'Repères des do', value: keep.notes, set: (x) => { keep.notes = x; } });
          L.push({ type: 'choice', label: 'Plage', value: String(keep.fmin), set: (x) => { keep.fmin = +x; keep.fmax = +x === 30 ? 2000 : 12000; rowBins = null; }, options: [{ id: '60', label: '60 Hz – 12 kHz' }, { id: '30', label: '30 Hz – 2 kHz (graves)' }] });
          L.push({ type: 'note', text: 'Les graves en bas, les aigus en haut ; le temps défile de droite à gauche. Glissez le doigt verticalement sur l’image : vous chantez une note, et vous la voyez s’écrire avec sa première harmonique. Source « Micro » : votre propre voix (si le navigateur l’autorise).' });
        } else if (keep.scene === 'liss') {
          L.push({ type: 'section', label: 'Lissajous' });
          L.push({ type: 'choice', label: 'Intervalle', value: String(keep.liss), set: (x) => { keep.liss = +x; lissRetune(); }, options: LISS.map(([p, q, n], i) => ({ id: String(i), label: `${p}:${q} ${n}` })) });
          L.push({ type: 'slider', label: 'Désaccord', min: -30, max: 30, step: 0.1, value: keep.det, fmt: (x) => fr(x, 1) + ' cents', set: (x) => { keep.det = x; lissRetune(); } });
          L.push({ type: 'buttons', items: [{ label: 'Accorder juste', act: () => { keep.det = 0; lissRetune(); } }] });
          L.push({ type: 'slider', label: 'Rémanence', min: 0, max: 0.97, step: 0.01, value: keep.trace, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.trace = x; } });
          L.push({ type: 'note', text: 'Un son pur dans chaque oreille (au casque, l’effet est saisissant). Glissez horizontalement pour désaccorder : la figure se met à tourner, au rythme exact du battement. Le triton (45/32) ne se referme qu’après 32 tours : on le disait « diabolus in musica ».' });
        } else {
          L.push({ type: 'section', label: 'Timbre' });
          L.push({ type: 'choice', label: 'Instrument', value: PRESETS[keep.preset] ? keep.preset : '', set: (x) => { keep.preset = x; keep.g = Array.from({ length: NP }, (_, i) => PRESETS[x].g[i] || 0); retimbre(); }, options: Object.keys(PRESETS).map((k) => ({ id: k, label: PRESETS[k].label })) });
          L.push({ type: 'choice', label: 'Attaque', value: keep.env, set: (x) => { keep.env = x; }, options: [{ id: 'tenu', label: 'Tenue (souffle, archet)' }, { id: 'pince', label: 'Pincée (corde, marteau)' }] });
          L.push({ type: 'toggle', label: 'Tenir la note', value: keep.hold, set: (x) => { keep.hold = x; if (x) noteOn(keep.base); else for (const m of [...held.keys()]) noteOff(m); } });
          if (!(PRESETS[keep.preset] && PRESETS[keep.preset].bell)) L.push({ type: 'slider', label: 'Inharmonicité (raideur, piano)', min: 0, max: 0.004, step: 0.0001, value: keep.inh, fmt: (x) => (x === 0 ? 'aucune' : fr(x * 1000, 1) + ' ‰'), set: (x) => { keep.inh = x; retimbre(); } });
          L.push({ type: 'note', text: 'Tirez les barres pour doser chaque harmonique, jouez au clavier. Les harmoniques d’une note forment un accord : octave, quinte, double octave, tierce… la 7e (« si♭ −31 ») est trop basse pour notre gamme. Une corde raide (piano) a des partiels un peu trop hauts : c’est l’inharmonicité, qui oblige les accordeurs à « étirer » les octaves.' });
        }
        return L;
      },
    };
  }
})();
