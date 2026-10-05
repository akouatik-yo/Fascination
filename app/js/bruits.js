/* Fascination — générateur de bruits colorés, battements binauraux et isochrones.
   Module autonome : son propre contexte audio, indépendant du bouton SON des machines.
   Il continue de jouer quand on change de machine. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  const COLORS = [
    { id: 'blanc', name: 'Blanc', slope: 'plat · 0 dB/oct', col: '#f2eeff', rms: 0.07,
      desc: 'Toutes les fréquences à puissance égale : le souffle d’une radio entre deux stations. C’est lui qui masque le mieux les bruits soudains.' },
    { id: 'rose', name: 'Rose', slope: '1/f · −3 dB/oct', col: '#ff9ad5', rms: 0.1,
      desc: 'Chaque octave porte la même énergie : une pluie régulière, le vent dans les feuilles. C’est le bruit que l’oreille trouve le plus équilibré.' },
    { id: 'brun', name: 'Brun', slope: '1/f² · −6 dB/oct', col: '#d0915a', rms: 0.13,
      desc: 'Grave et sourd, comme un torrent lointain ou une cabine d’avion. Il doit son nom au botaniste Robert Brown et au mouvement brownien, pas à la couleur.' },
    { id: 'gris', name: 'Gris', slope: 'égale sonie', col: '#bdb7c9', rms: 0.08,
      desc: 'Un bruit blanc corrigé par l’inverse des courbes d’égale sonie (ISO 226) : l’oreille perçoit chaque hauteur avec la même force.' },
    { id: 'bleu', name: 'Bleu', slope: 'f · +3 dB/oct', col: '#72b8ff', rms: 0.05,
      desc: 'Les aigus dominent : un jet d’eau, une fuite de vapeur.' },
    { id: 'violet', name: 'Violet', slope: 'f² · +6 dB/oct', col: '#b68eff', rms: 0.035,
      desc: 'Presque un sifflement. On le propose parfois pour soulager certains acouphènes aigus.' },
  ];
  const BANDS = [
    { id: 'delta', label: 'Delta', hz: 2, txt: '0,5–4 Hz · sommeil profond' },
    { id: 'theta', label: 'Thêta', hz: 6, txt: '4–8 Hz · somnolence, rêverie' },
    { id: 'alpha', label: 'Alpha', hz: 10, txt: '8–13 Hz · éveil calme, yeux fermés' },
    { id: 'beta', label: 'Bêta', hz: 18, txt: '13–30 Hz · attention active' },
    { id: 'gamma', label: 'Gamma', hz: 40, txt: '30–45 Hz · liaison perceptive' },
  ];
  const TIMERS = [{ id: 0, label: '∞' }, { id: 15, label: '15 min' }, { id: 30, label: '30 min' }, { id: 60, label: '1 h' }, { id: 90, label: '1 h 30' }];

  const DEF = { vol: 0.7, lv: { blanc: 0, rose: 0.6, brun: 0.25, gris: 0, bleu: 0, violet: 0 }, beat: 'off', hz: 10, carrier: 200, bvol: 0.35, swell: 0.35, bpm: 5.5, timer: 0 };
  let st = JSON.parse(JSON.stringify(DEF));
  try { const s = JSON.parse(localStorage.getItem('fasc-bruits') || 'null'); if (s && s.lv) st = Object.assign(st, s, { lv: Object.assign({}, DEF.lv, s.lv) }); } catch (e) { /* stockage indisponible */ }
  const save = () => { try { localStorage.setItem('fasc-bruits', JSON.stringify(st)); } catch (e) { /* rien */ } };

  /* ───────── moteur audio ───────── */
  let ctx = null, A = null, playing = false, endAt = 0, phase = 0, lfoT0 = 0;

  // un bruit coloré de 12 s en stéréo décorrélée, bouclé sans couture (fondu enchaîné de la fin sur le début)
  function makeBuffer(id) {
    const sr = ctx.sampleRate, N = Math.round(sr * 12), F = Math.round(sr * 0.5);
    const buf = ctx.createBuffer(2, N, sr);
    const target = COLORS.find((c) => c.id === id).rms;
    for (let ch = 0; ch < 2; ch++) {
      const x = new Float32Array(N + F);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, br = 0, pw = 0, pp = 0;
      for (let i = 0; i < N + F; i++) {
        const w = Math.random() * 2 - 1;
        // rose : filtre de Paul Kellet (somme de passe-bas du premier ordre)
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
        let v;
        if (id === 'blanc' || id === 'gris') v = w;
        else if (id === 'rose') v = pink;
        else if (id === 'brun') { br = (br + 0.02 * w) / 1.02; v = br; } // intégrateur avec fuite : marche aléatoire bornée
        else if (id === 'bleu') { v = pink - pp; } // dérivée du rose : +3 dB/oct
        else { v = w - pw; } // violet : dérivée du blanc : +6 dB/oct
        pp = pink; pw = w;
        x[i] = v;
      }
      const d = buf.getChannelData(ch);
      for (let i = 0; i < N; i++) d[i] = x[i];
      for (let i = 0; i < F; i++) { const a = i / F; d[i] = x[N + i] * Math.cos(a * Math.PI / 2) + x[i] * Math.sin(a * Math.PI / 2); }
      let s = 0;
      for (let i = 0; i < N; i++) s += d[i] * d[i];
      const k = target / Math.sqrt(s / N || 1);
      for (let i = 0; i < N; i++) d[i] *= k;
    }
    return buf;
  }

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4;
    const an = ctx.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0.86;
    master.connect(comp); comp.connect(an); an.connect(ctx.destination);
    // bus des bruits : houle = gain et filtre modulés par une onde lente et dissymétrique
    const bus = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.3;
    bus.connect(lp); lp.connect(master);
    const lfo = ctx.createOscillator();
    const re = new Float32Array([0, 0, 0, 0, 0]), im = new Float32Array([0, 1, 0.42, 0.18, 0.07]);
    lfo.setPeriodicWave(ctx.createPeriodicWave(re, im)); // montée lente, retombée plus rapide, comme une vague
    const lfoAmp = ctx.createGain(), lfoCut = ctx.createGain();
    lfo.connect(lfoAmp); lfoAmp.connect(bus.gain);
    lfo.connect(lfoCut); lfoCut.connect(lp.frequency);
    lfo.frequency.value = st.bpm / 60;
    lfo.start();
    lfoT0 = ctx.currentTime;
    // battements binauraux (gauche ≠ droite) et isochrones (une seule porteuse pulsée)
    const oL = ctx.createOscillator(), oR = ctx.createOscillator(), mer = ctx.createChannelMerger(2), binG = ctx.createGain();
    oL.connect(mer, 0, 0); oR.connect(mer, 0, 1); mer.connect(binG); binG.connect(master); binG.gain.value = 0;
    oL.start(); oR.start();
    const oI = ctx.createOscillator(), isoAmp = ctx.createGain(), isoG = ctx.createGain(), pulse = ctx.createOscillator(), shp = ctx.createWaveShaper(), pAmp = ctx.createGain();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 5) / Math.tanh(5); }
    shp.curve = curve;
    isoAmp.gain.value = 0.5; pAmp.gain.value = 0.5;
    pulse.connect(shp); shp.connect(pAmp); pAmp.connect(isoAmp.gain);
    oI.connect(isoAmp); isoAmp.connect(isoG); isoG.connect(master); isoG.gain.value = 0;
    oI.start(); pulse.start();
    A = { master, an, bus, lp, lfo, lfoAmp, lfoCut, oL, oR, binG, oI, pulse, isoG, src: {}, gains: {} };
    return true;
  }

  function layer(id) {
    if (A.src[id]) return;
    const s = ctx.createBufferSource();
    s.buffer = makeBuffer(id); s.loop = true;
    const g = ctx.createGain(); g.gain.value = 0;
    let head = s;
    if (id === 'gris') {
      // inverse approché d'une courbe d'égale sonie à bas niveau : graves relevés, creux vers 3–4 kHz
      const ls = ctx.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 250; ls.gain.value = 13;
      const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 3500; pk.Q.value = 0.9; pk.gain.value = -8;
      const hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 11000; hs.gain.value = 6;
      s.connect(ls); ls.connect(pk); pk.connect(hs); head = hs;
    }
    head.connect(g); g.connect(A.bus);
    s.start(ctx.currentTime, Math.random() * 10);
    A.src[id] = s; A.gains[id] = g;
  }

  function apply() {
    if (!ctx || !A) return;
    const t = ctx.currentTime, tc = 0.12;
    for (const c of COLORS) {
      const v = st.lv[c.id] || 0;
      if (v > 0 && playing) layer(c.id);
      if (A.gains[c.id]) A.gains[c.id].gain.setTargetAtTime(playing ? Math.pow(v, 1.6) * 1.6 : 0, t, tc);
    }
    const d = st.swell;
    A.bus.gain.setTargetAtTime(1 - d * 0.42, t, tc);
    A.lfoAmp.gain.setTargetAtTime(d * 0.42, t, tc);
    const f0 = 18000 * Math.pow(2500 / 18000, d);
    A.lp.frequency.setTargetAtTime(f0, t, tc);
    A.lfoCut.gain.setTargetAtTime(f0 * 0.55 * d, t, tc);
    A.lfo.frequency.setTargetAtTime(st.bpm / 60, t, tc);
    const bv = playing ? Math.pow(st.bvol, 1.5) * 0.3 : 0;
    A.oL.frequency.setTargetAtTime(st.carrier - st.hz / 2, t, 0.05);
    A.oR.frequency.setTargetAtTime(st.carrier + st.hz / 2, t, 0.05);
    A.oI.frequency.setTargetAtTime(st.carrier, t, 0.05);
    A.pulse.frequency.setTargetAtTime(st.hz, t, 0.05);
    A.binG.gain.setTargetAtTime(st.beat === 'bin' ? bv : 0, t, tc);
    A.isoG.gain.setTargetAtTime(st.beat === 'iso' ? bv * 0.8 : 0, t, tc);
    A.master.gain.setTargetAtTime(playing ? Math.pow(st.vol, 1.5) * timerGain() : 0, t, playing ? 0.25 : 0.12);
  }
  function timerGain() {
    if (!endAt) return 1;
    const left = (endAt - Date.now()) / 1000;
    return Math.max(0, Math.min(1, left / 60)); // fondu sur la dernière minute
  }

  function play() {
    if (!ensure()) { status.textContent = 'Web Audio indisponible sur ce navigateur.'; return; }
    playing = true;
    endAt = st.timer ? Date.now() + st.timer * 60000 : 0;
    apply(); render();
  }
  function stop() { playing = false; endAt = 0; apply(); render(); }

  setInterval(() => {
    if (!playing) return;
    if (endAt) {
      if (Date.now() >= endAt) { stop(); return; }
      apply();
    }
    renderTimer();
  }, 1000);

  /* ───────── interface ───────── */
  const h = (tag, props, ...kids) => {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
    return e;
  };
  const light = () => document.documentElement.getAttribute('data-fasc-theme') === 'light';
  const ACC = () => (light() ? '#c2368f' : '#ff8ad8');
  let box, playBtn, status, cv, timerTxt, about, open = false;
  const ctl = [];

  function slider(label, min, max, step, get, set, fmt, color) {
    const v = h('span'), inp = h('input', { type: 'range', min, max, step, 'aria-label': label });
    inp.style.accentColor = color || 'var(--rose)';
    inp.addEventListener('input', () => { set(parseFloat(inp.value)); v.textContent = fmt(get()); apply(); save(); });
    const el = h('div', { class: 'c-sl' }, h('div', { class: 'h' }, h('span', null, label), v), inp);
    ctl.push(() => { if (document.activeElement !== inp) inp.value = get(); v.textContent = fmt(get()); });
    return el;
  }
  function choice(label, opts, get, set) {
    const wrap = h('div', { class: 'opts' });
    const bs = opts.map((o) => { const b = h('button', { onclick: () => { set(o.id); apply(); save(); render(); } }, o.label); wrap.append(b); return [o, b]; });
    ctl.push(() => bs.forEach(([o, b]) => { const on = o.id === get(); b.style.background = on ? ACC() + '26' : ''; b.style.borderColor = on ? ACC() + 'aa' : ''; b.style.color = on ? 'var(--fg-strong)' : ''; }));
    return h('div', { class: 'c-ch' }, label ? h('span', null, label) : null, wrap);
  }

  function mount() {
    const stage = document.getElementById('stage');
    if (!stage || box) return;
    playBtn = h('button', { class: 'sb play', style: 'border-color:var(--rose)', onclick: () => (playing ? stop() : play()) });
    status = h('div', { class: 'note' });
    timerTxt = h('span', { class: 'v' });
    cv = h('canvas', { class: 'spec', width: 600, height: 150, 'aria-label': 'Spectre du son produit' });

    const colors = h('div', { class: 'mix' });
    for (const c of COLORS) {
      colors.append(h('div', { class: 'mixrow' },
        h('i', { style: 'background:' + c.col + ';box-shadow:0 0 8px ' + c.col + ';outline:1px solid var(--line-2)' }),
        slider(c.name, 0, 1, 0.01, () => st.lv[c.id], (x) => { st.lv[c.id] = x; }, (x) => (x < 0.005 ? 'coupé · ' : Math.round(x * 100) + ' % · ') + c.slope, c.col)));
    }

    const beatInfo = h('div', { class: 'note' });
    ctl.push(() => {
      const b = BANDS.slice().reverse().find((x) => st.hz >= x.hz * 0.6) || BANDS[0];
      beatInfo.textContent = st.beat === 'bin'
        ? 'Binaural : ' + Math.round(st.carrier - st.hz / 2) + ' Hz à gauche, ' + Math.round(st.carrier + st.hz / 2) + ' Hz à droite. Le battement de ' + fmtHz(st.hz) + ' naît dans le cerveau : il faut un casque. Bande ' + b.label.toLowerCase() + ' (' + b.txt + ').'
        : st.beat === 'iso'
          ? 'Isochrone : la porteuse de ' + Math.round(st.carrier) + ' Hz s’allume et s’éteint ' + fmtHz(st.hz).replace(' Hz', '') + ' fois par seconde. Fonctionne sans casque. Bande ' + b.label.toLowerCase() + ' (' + b.txt + ').'
          : 'Ajoutez un battement à la nappe de bruit : binaural au casque, isochrone sur haut-parleur.';
    });

    about = h('div', { class: 'about-body' },
      ...COLORS.map((c) => h('div', { class: 'lg' }, h('i', { style: 'background:' + c.col + ';box-shadow:0 0 10px ' + c.col }),
        h('div', null, h('b', null, 'Bruit ' + c.name.toLowerCase()), h('small', { style: 'color:' + c.col }, c.slope), h('span', null, c.desc)))),
      h('p', null, 'La « couleur » d’un bruit décrit comment sa puissance se répartit entre graves et aigus, par analogie avec la lumière : une lumière blanche contient toutes les longueurs d’onde, une lumière rose penche vers le rouge, c’est-à-dire vers les basses fréquences. Le graphique montre ce spectre en direct, des graves (à gauche) aux aigus.'),
      h('p', null, 'Le bruit rose, en 1/f, est partout dans la nature : crues du Nil, battements du cœur, et même la mélodie et l’intensité de la musique, comme l’ont montré Voss et Clarke en 1975.'),
      h('p', null, 'Les battements binauraux ont été décrits par Heinrich Wilhelm Dove en 1839. Deux sons purs de fréquences voisines, un par oreille, produisent une pulsation qui n’existe dans aucun des deux : c’est le tronc cérébral (le complexe olivaire supérieur) qui la fabrique. Les études sur leurs effets (détente, sommeil, attention) donnent des résultats modestes et contradictoires : écoutez-les pour le plaisir, sans en attendre de miracle.'),
      h('p', null, 'La houle module lentement le bruit, comme des vagues. Réglée vers 5 à 6 cycles par minute, elle accompagne la respiration lente dite de « cohérence cardiaque » : on inspire quand la vague monte, on expire quand elle retombe.'),
      h('p', null, 'Gardez un volume modéré, surtout au casque et pour un long moment. Pour un bébé, éloignez la source du lit et restez bas.'));
    about.hidden = true;
    const sign = h('span', null, '+');

    box = h('aside', { class: 'bruits', 'aria-label': 'Générateur de bruits', hidden: '' },
      h('div', { class: 'p-title' },
        h('span', { class: 'g', style: 'color:var(--rose)' }, '≋'),
        h('h1', null, 'Bruits'),
        h('button', { class: 'x', title: 'Fermer', 'aria-label': 'Fermer le générateur', onclick: () => toggle(false) }, '×')),
      h('div', { class: 'p-blurb', style: 'color:var(--rose)' }, 'Blanc, rose, brun · binaural · houle'),
      h('div', { class: 'row' }, playBtn),
      slider('Volume général', 0, 1, 0.01, () => st.vol, (x) => { st.vol = x; }, (x) => Math.round(x * 100) + ' %'),
      cv,
      status,
      h('div', { class: 'c-sec' }, 'Couleurs du bruit'),
      colors,
      h('div', { class: 'c-bt' },
        h('button', { onclick: () => preset('pluie') }, 'Pluie douce'),
        h('button', { onclick: () => preset('ocean') }, 'Océan'),
        h('button', { onclick: () => preset('cabine') }, 'Cabine d’avion'),
        h('button', { onclick: () => preset('focus') }, 'Concentration')),
      h('div', { class: 'c-sec' }, 'Battements'),
      choice(null, [{ id: 'off', label: 'Aucun' }, { id: 'bin', label: 'Binaural 🎧' }, { id: 'iso', label: 'Isochrone' }], () => st.beat, (v) => { st.beat = v; }),
      choice('Bande de fréquences', BANDS.map((b) => ({ id: b.id, label: b.label })), () => (BANDS.find((b) => Math.abs(b.hz - st.hz) < 0.01) || {}).id, (id) => { st.hz = BANDS.find((b) => b.id === id).hz; }),
      slider('Battement', 0.5, 45, 0.5, () => st.hz, (x) => { st.hz = x; }, fmtHz),
      slider('Porteuse', 90, 500, 1, () => st.carrier, (x) => { st.carrier = x; }, (x) => Math.round(x) + ' Hz'),
      slider('Volume des battements', 0, 1, 0.01, () => st.bvol, (x) => { st.bvol = x; }, (x) => Math.round(x * 100) + ' %'),
      beatInfo,
      h('div', { class: 'c-sec' }, 'Houle'),
      slider('Profondeur', 0, 1, 0.01, () => st.swell, (x) => { st.swell = x; }, (x) => (x < 0.01 ? 'mer d’huile' : Math.round(x * 100) + ' %')),
      slider('Rythme', 2, 14, 0.5, () => st.bpm, (x) => { st.bpm = x; }, (x) => String(x).replace('.', ',') + ' vagues/min' + (Math.abs(x - 5.5) < 0.6 ? ' · cohérence' : '')),
      h('div', { class: 'c-sec' }, h('span', null, 'Minuterie '), timerTxt),
      choice(null, TIMERS, () => st.timer, (v) => { st.timer = v; if (playing) endAt = v ? Date.now() + v * 60000 : 0; }),
      h('div', { class: 'about' }, h('button', { onclick: () => { about.hidden = !about.hidden; sign.textContent = about.hidden ? '+' : '−'; } }, h('span', null, 'En savoir plus'), sign), about));
    stage.append(box);
    render();
  }

  function fmtHz(x) { return (Math.round(x * 10) / 10).toString().replace('.', ',') + ' Hz'; }

  function preset(id) {
    const z = { blanc: 0, rose: 0, brun: 0, gris: 0, bleu: 0, violet: 0 };
    if (id === 'pluie') Object.assign(st, { lv: Object.assign(z, { rose: 0.7, blanc: 0.12 }), swell: 0.12, bpm: 9 });
    if (id === 'ocean') Object.assign(st, { lv: Object.assign(z, { brun: 0.75, rose: 0.35 }), swell: 0.8, bpm: 5.5 });
    if (id === 'cabine') Object.assign(st, { lv: Object.assign(z, { brun: 0.85, gris: 0.15 }), swell: 0, bpm: 6 });
    if (id === 'focus') Object.assign(st, { lv: Object.assign(z, { rose: 0.45, brun: 0.3 }), swell: 0.1, bpm: 6, beat: 'iso', hz: 18 });
    save();
    if (!playing) play(); else apply();
    render();
  }

  function renderTimer() {
    if (!timerTxt) return;
    if (playing && endAt) {
      const s = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      timerTxt.textContent = '· reste ' + Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0');
    } else timerTxt.textContent = '';
  }
  function render() {
    if (!box) return;
    playBtn.textContent = playing ? '■ ARRÊTER' : '▶ JOUER';
    ctl.forEach((f) => f());
    renderTimer();
    const b = document.getElementById('bNoise');
    if (b) {
      const on = open || playing;
      b.textContent = playing ? 'BRUITS ●' : 'BRUITS';
      b.style.background = on ? ACC() + '26' : '';
      b.style.borderColor = on ? ACC() + 'aa' : '';
      b.classList.toggle('on', on);
    }
  }

  /* spectre en direct, axe des fréquences logarithmique */
  let fd = null;
  function draw() {
    requestAnimationFrame(draw);
    if (!open || !cv) return;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    g.font = '18px "JetBrains Mono", monospace';
    g.textBaseline = 'bottom';
    const fx = (f) => (Math.log(f / 20) / Math.log(1000)) * W;
    for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) {
      g.fillStyle = light() ? 'rgba(45,30,80,.1)' : 'rgba(255,255,255,.07)'; g.fillRect(fx(f), 0, 1, H);
      g.fillStyle = light() ? 'rgba(45,30,80,.45)' : 'rgba(255,255,255,.3)';
      if ([100, 1000, 10000].includes(f)) g.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), fx(f) + 4, H - 2);
    }
    if (!ctx || !A) return;
    if (!fd || fd.length !== A.an.frequencyBinCount) fd = new Float32Array(A.an.frequencyBinCount);
    A.an.getFloatFrequencyData(fd);
    const ny = ctx.sampleRate / 2, n = fd.length;
    const grd = g.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, '#d0915a'); grd.addColorStop(0.35, light() ? '#d0569c' : '#ff9ad5'); grd.addColorStop(0.7, light() ? '#7a6f8c' : '#f2eeff'); grd.addColorStop(1, light() ? '#7b52d8' : '#b68eff');
    g.beginPath(); g.moveTo(0, H);
    let any = false;
    for (let x = 0; x <= W; x += 3) {
      const f = 20 * Math.pow(1000, x / W), i = Math.min(n - 1, Math.round((f / ny) * n));
      const db = fd[i];
      if (db > -140) any = true;
      const y = H - Math.max(0, Math.min(1, (db + 135) / 115)) * H;
      g.lineTo(x, y);
    }
    g.lineTo(W, H); g.closePath();
    if (!any) return;
    g.globalAlpha = 0.28; g.fillStyle = grd; g.fill();
    g.globalAlpha = 1; g.strokeStyle = grd; g.lineWidth = 2; g.stroke();
    // battement de la houle : un point qui monte et descend avec la vague
    if (playing && st.swell > 0.01) {
      phase = ((ctx.currentTime - lfoT0) * st.bpm / 60) % 1;
      const wv = Math.sin(TAU * phase) + 0.42 * Math.sin(2 * TAU * phase) + 0.18 * Math.sin(3 * TAU * phase) + 0.07 * Math.sin(4 * TAU * phase);
      const y = H * 0.5 - wv * H * 0.22;
      g.fillStyle = light() ? 'rgba(194,54,143,.9)' : 'rgba(255,154,213,.9)';
      g.beginPath(); g.arc(W - 16, y, 6, 0, TAU); g.fill();
    }
  }
  requestAnimationFrame(draw);

  function toggle(v) {
    mount();
    open = typeof v === 'boolean' ? v : !open;
    box.hidden = !open;
    render();
  }

  window.Bruits = { toggle, play, stop, retheme: render, get playing() { return playing; } };
})();
