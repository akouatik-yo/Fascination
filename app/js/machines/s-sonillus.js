/* Fascination — Les Illusions sonores
   Escalier de Shepard (1964) et glissando de Risset : dix sons purs espacés d'octave en octave, pesés par une
   cloche gaussienne en log-fréquence ; ils montent tous ensemble, celui du haut s'éteint pendant qu'un nouveau
   naît en bas : la hauteur monte sans fin. Paradoxe du triton (Deutsch, 1986), fondamentale absente,
   battements binauraux, accélération éternelle (Risset). Tout est synthétisé en direct (Web Audio). */
(function boot() {
  if (!window.FK || !window.FKSON) return setTimeout(boot, 12);
  const { TAU, clamp } = window.FK;
  const { bus } = window.FKSON;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const PC = ['do', 'do♯', 'ré', 'ré♯', 'mi', 'fa', 'fa♯', 'sol', 'sol♯', 'la', 'la♯', 'si'];
  const keep = { scene: 'shepard', glide: false, dir: 1, rate: 1, f0: 200, harm: [1, 1, 1, 1, 1, 1, 1, 1], bin: 'binaural', bf: 220, bd: 4, risset: 1, answers: {} };
  const SCENES = [['shepard', 'L’escalier sans fin'], ['triton', 'Le paradoxe du triton'], ['absente', 'La fondamentale absente'], ['binaural', 'Les battements binauraux'], ['risset', 'L’accélération éternelle']];

  window.FASC.push({
    id: 'sonillus', name: 'Les Illusions sonores', cat: 'Sons', glyph: '◎', smoothTime: true,
    blurb: 'Un son qui monte sans fin, une note qui n’existe pas…',
    hint: 'Activez le son (un casque est préférable, indispensable pour les battements binauraux).',
    intro: 'L’oreille ne mesure pas les sons : elle les interprète, comme l’œil interprète les images. On peut donc la tromper. Ici, un son qui monte indéfiniment sans jamais aller plus haut, une note qu’on entend alors qu’elle n’est pas jouée, un battement qui n’existe que dans la tête, et un rythme qui accélère pour toujours.',
    about: [
      'L’escalier de Roger Shepard (1964) : chaque note est faite de dix sons purs à l’octave les uns des autres. Une cloche fixe dose leur volume : forts au milieu, inaudibles aux extrêmes. Quand tous montent d’un demi-ton, celui du haut s’efface et un nouveau apparaît en bas, sans qu’on le remarque. Après douze marches, on est revenu exactement au point de départ, mais on a l’impression d’être monté d’une octave. Jean-Claude Risset en a fait un glissando continu ; c’est l’équivalent sonore de l’escalier de Penrose.',
      'Le paradoxe du triton (Diana Deutsch, 1986) : deux notes de Shepard à un triton d’écart (une demi-octave, l’intervalle le plus ambigu) ne montent ni ne descendent objectivement. Pourtant chacun entend nettement l’un ou l’autre, et la frontière dépend de la personne : Deutsch a montré qu’elle varie selon la région où l’on a grandi, peut-être selon la hauteur de voix qu’on y entend.',
      'La fondamentale absente : retirez la note la plus grave d’un son harmonique (200 Hz dans 200, 400, 600…), on continue d’entendre 200 Hz. Le cerveau reconstruit la hauteur à partir de la périodicité du signal. C’est grâce à cela qu’on reconnaît une voix grave au téléphone, qui ne transmettait pas les fréquences sous 300 Hz.',
      'Les battements binauraux (Heinrich Dove, 1839) : 220 Hz dans une oreille, 224 Hz dans l’autre. Dans l’air, rien ne bat ; pourtant on entend une pulsation de 4 par seconde, fabriquée par le tronc cérébral qui compare les deux oreilles. Les promesses de « relaxation » ou de « concentration » qu’on leur prête n’ont pas été démontrées.',
      'L’accélération éternelle (Risset, 1970) : plusieurs pulsations aux tempos doublés les uns des autres accélèrent ensemble ; la plus rapide s’efface pendant qu’une plus lente apparaît. C’est l’escalier de Shepard transposé du domaine des hauteurs à celui du rythme.',
    ],
    tools: [{ id: 'toucher', label: 'toucher', desc: 'Selon la scène : changer de sens, jouer une paire, activer une harmonique.' }],
    make(env) { return makeIll(env); },
  });

  function makeIll(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const B = bus(au, { rev: 0.18, sec: 2.6, gain: 0.9 });
    const c = B ? B.ctx : null;
    const light = () => env.theme === 'light';
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    let T = 0, toast = null;
    const say = (s) => { toast = { s, t: T }; };
    const now = () => (c ? c.currentTime : 0);

    /* ───────── banc de Shepard ───────── */
    const NO = 10, FMIN = 16.35, SIG = 1.35, CEN = 6.0; // log2(f/FMIN) centré sur ~1 050 Hz
    const env0 = (x) => Math.exp(-((x - CEN) ** 2) / (2 * SIG * SIG));
    let bank = null, pos = 0; // pos : hauteur en octaves (la partie fractionnaire compte seule)
    function bankOn() {
      if (!c || bank) return;
      const out = c.createGain(); out.gain.value = 0; out.connect(B.input);
      const osc = Array.from({ length: NO }, () => { const o = c.createOscillator(), g = c.createGain(); g.gain.value = 0; o.connect(g); g.connect(out); o.start(); return { o, g, x: 0 }; });
      bank = { out, osc };
      bankSet(pos, true);
    }
    function bankSet(p, jump) {
      if (!bank) return;
      const t = now(), fp = ((p % 1) + 1) % 1;
      bank.osc.forEach((v, j) => {
        const x = j + fp, f = FMIN * Math.pow(2, x), g = 0.055 * env0(x);
        const wrapped = Math.abs(x - v.x) > 0.5;
        if (jump || wrapped) { v.o.frequency.cancelScheduledValues(t); v.o.frequency.setValueAtTime(f, t); v.g.gain.setValueAtTime(g, t); }
        else { v.o.frequency.setTargetAtTime(f, t, 0.015); v.g.gain.setTargetAtTime(g, t, 0.015); }
        v.x = x;
      });
    }
    function bankGate(level, tc = 0.02, at) { if (bank) bank.out.gain.setTargetAtTime(level, at || now(), tc); }
    function bankOff() { if (!bank) return; const t = now(); bank.out.gain.setTargetAtTime(0, t, 0.04); for (const v of bank.osc) v.o.stop(t + 0.4); bank = null; }

    /* ───────── escalier ───────── */
    let stepT = 0, step = 0, climb = 0; // climb : hauteur « perçue » cumulée (ne revient jamais)
    function shepTick(k) {
      if (keep.glide) {
        const d = keep.dir * k * 0.085 * keep.rate; pos += d; climb += d; bankSet(pos); bankGate(1, 0.05);
      } else {
        stepT -= k;
        if (stepT <= 0) {
          stepT += 0.5 / keep.rate; step += keep.dir; pos = step / 12; climb += keep.dir / 12;
          bankSet(pos, true);
          if (bank) { const t = now(); bank.out.gain.cancelScheduledValues(t); bank.out.gain.setValueAtTime(0, t); bank.out.gain.linearRampToValueAtTime(1, t + 0.012); bank.out.gain.setTargetAtTime(0.55, t + 0.02, 0.1); bank.out.gain.setTargetAtTime(0, t + 0.42 / keep.rate, 0.03); }
        }
      }
    }
    function drawShepard(cc) {
      const v = view();
      // l'hélice : la caméra monte avec la note, l'escalier défile vers le bas, sans fin
      const cx = v.cx - v.w * 0.16, cy = H * 0.46, R = Math.min(v.w * 0.2, H * 0.24), rise = R * 0.9, tilt = 0.32;
      // une hélice continue, plus vive devant ; un point par demi-ton, « do » à chaque tour
      const Pt = (q) => { const a = (q / 12) * TAU - Math.PI / 2; return [cx + Math.cos(a) * R, cy - (q / 12 - climb) * rise + Math.sin(a) * R * tilt, Math.sin(a)]; };
      const q0 = climb * 12 - 30, q1 = climb * 12 + 30;
      for (let q = q0; q < q1; q += 0.25) {
        const [x1, y1, f1] = Pt(q), [x2, y2] = Pt(q + 0.25), fade = Math.max(0, 1 - Math.abs(y1 - cy) / (H * 0.4));
        if (fade <= 0.01) continue;
        const hue = 200 + ((((q / 12) % 1) + 1) % 1) * 160, al = fade * (f1 > 0 ? 0.95 : 0.3);
        ctx.strokeStyle = light() ? `hsla(${hue},45%,35%,${al})` : `hsla(${hue},80%,72%,${al})`; ctx.lineWidth = f1 > 0 ? 2.2 : 1.2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      for (let q = Math.ceil(q0); q <= q1; q++) {
        const [x, y, f] = Pt(q), fade = Math.max(0, 1 - Math.abs(y - cy) / (H * 0.4)); if (fade <= 0.01) continue;
        const pc = ((q % 12) + 12) % 12;
        ctx.fillStyle = light() ? `rgba(40,30,60,${fade * (f > 0 ? 0.8 : 0.3)})` : `rgba(235,228,255,${fade * (f > 0 ? 0.8 : 0.25)})`;
        ctx.beginPath(); ctx.arc(x, y, pc === 0 ? 3.5 : 2, 0, TAU); ctx.fill();
        if (pc === 0 && f > -0.2) { ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText('do', x + 7, y + 3); }
      }
      // le marcheur
      const a = climb * TAU - Math.PI / 2, mx = cx + Math.cos(a) * R, my = cy + Math.sin(a) * R * tilt;
      ctx.fillStyle = light() ? '#c2368f' : '#ff8ad8'; ctx.beginPath(); ctx.arc(mx, my - 6, 6, 0, TAU); ctx.fill();
      if (!light()) { const rg = ctx.createRadialGradient(mx, my - 6, 0, mx, my - 6, 30); rg.addColorStop(0, 'rgba(255,138,216,.35)'); rg.addColorStop(1, 'rgba(255,138,216,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(mx, my - 6, 30, 0, TAU); ctx.fill(); }
      // le spectre : composantes à l'octave, cloche fixe
      const sx0 = v.cx + v.w * 0.06, sx1 = v.x1 - v.w * 0.05, sy = H * 0.72, sh = H * 0.36;
      const X = (x) => sx0 + ((sx1 - sx0) * x) / NO;
      ctx.strokeStyle = cc.dim; ctx.beginPath(); ctx.moveTo(sx0, sy); ctx.lineTo(sx1, sy); ctx.stroke();
      ctx.strokeStyle = light() ? 'rgba(40,30,60,.4)' : 'rgba(235,228,255,.35)'; ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const x = (i / 100) * NO; const px = X(x), py = sy - env0(x) * sh; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.setLineDash([]);
      const fpp = ((pos % 1) + 1) % 1;
      for (let j = 0; j < NO; j++) {
        const x = j + fpp, px = X(x), g = env0(x), hue = 200 + (fpp * 160);
        ctx.strokeStyle = light() ? `hsla(${hue},55%,35%,${0.25 + g * 0.75})` : `hsla(${hue},85%,72%,${0.25 + g * 0.75})`; ctx.lineWidth = 2 + g * 2.5;
        ctx.beginPath(); ctx.moveTo(px, sy); ctx.lineTo(px, sy - g * sh); ctx.stroke();
      }
      ctx.lineWidth = 1; ctx.fillStyle = cc.dim; ctx.font = '500 9.5px "JetBrains Mono", monospace';
      for (const [f, l] of [[31.25, '31 Hz'], [125, '125 Hz'], [500, '500 Hz'], [2000, '2 kHz'], [8000, '8 kHz']]) { const x = Math.log2(f / FMIN); ctx.fillText(l, X(x) - 12, sy + 14); }
      ctx.fillStyle = cc.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText('DIX SONS PURS À L’OCTAVE · LA CLOCHE (POINTILLÉS) NE BOUGE PAS', sx0, sy - sh - 14);
      const pc = ((Math.round(pos * 12) % 12) + 12) % 12;
      ctx.font = 'italic 500 22px "Space Grotesk", sans-serif'; ctx.fillStyle = light() ? '#2a2238' : '#fff6ea';
      ctx.fillText(PC[pc], v.x0 + 24, H - 64);
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = cc.txt;
      ctx.fillText(`MONTÉE PERÇUE : ${fr(climb, 2)} OCTAVE${Math.abs(climb) >= 2 ? 'S' : ''} · HAUTEUR RÉELLE : TOUJOURS LA MÊME FAMILLE DE SONS`, v.x0 + 24, H - 40);
    }

    /* ───────── paradoxe du triton ───────── */
    let tri = { cur: null, queue: [], t: 0 };
    function triPlay(p0) {
      if (!c) { say('Activez le son.'); return; }
      bankOn(); tri.cur = p0;
      const t = now() + 0.05;
      bankSet(p0 / 12, true); bank.out.gain.cancelScheduledValues(t);
      bank.out.gain.setValueAtTime(0, t); bank.out.gain.linearRampToValueAtTime(1, t + 0.015); bank.out.gain.setTargetAtTime(0, t + 0.5, 0.03);
      setTimeout(() => { if (!bank) return; bankSet((p0 + 6) / 12, true); const t2 = now(); bank.out.gain.cancelScheduledValues(t2); bank.out.gain.setValueAtTime(0, t2); bank.out.gain.linearRampToValueAtTime(1, t2 + 0.015); bank.out.gain.setTargetAtTime(0, t2 + 0.5, 0.03); }, 620);
    }
    function triGeom() { const v = view(), R = Math.min(v.w * 0.22, H * 0.26); return { v, cx: v.cx - v.w * 0.14, cy: H * 0.48, R, bx: v.cx + v.w * 0.12, by: H * 0.38 }; }
    function drawTriton(cc) {
      const g = triGeom();
      ctx.strokeStyle = cc.dim; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, TAU); ctx.stroke();
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU - Math.PI / 2, x = g.cx + Math.cos(a) * g.R, y = g.cy + Math.sin(a) * g.R, ans = keep.answers[k];
        ctx.fillStyle = ans === 'up' ? (light() ? '#2a7a4a' : '#8ff0b0') : ans === 'down' ? (light() ? '#b03a3a' : '#ff8a8a') : cc.dim;
        ctx.beginPath(); ctx.arc(x, y, tri.cur === k ? 9 : 6, 0, TAU); ctx.fill();
        ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = cc.txt;
        ctx.fillText(PC[k], g.cx + Math.cos(a) * (g.R + 22), g.cy + Math.sin(a) * (g.R + 22) + 4); ctx.textAlign = 'left';
      }
      if (tri.cur != null) {
        const a1 = (tri.cur / 12) * TAU - Math.PI / 2, a2 = a1 + Math.PI;
        ctx.strokeStyle = light() ? 'rgba(194,54,143,.6)' : 'rgba(255,138,216,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(g.cx + Math.cos(a1) * g.R, g.cy + Math.sin(a1) * g.R); ctx.lineTo(g.cx + Math.cos(a2) * g.R, g.cy + Math.sin(a2) * g.R); ctx.stroke(); ctx.setLineDash([]);
      }
      // boutons de réponse
      const bw = 150, bh = 40;
      const btn = (x, y, s, on) => { ctx.fillStyle = on ? (light() ? 'rgba(194,54,143,.15)' : 'rgba(255,138,216,.15)') : light() ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.05)'; ctx.strokeStyle = light() ? 'rgba(40,30,60,.35)' : 'rgba(235,228,255,.3)'; rr(x, y, bw, bh, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = cc.txt; ctx.font = '600 12px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(s, x + bw / 2, y + 25); ctx.textAlign = 'left'; };
      btn(g.bx, g.by, '▶ PAIRE SUIVANTE', false);
      btn(g.bx, g.by + 56, '↗ ÇA MONTE', false);
      btn(g.bx, g.by + 104, '↘ ÇA DESCEND', false);
      btn(g.bx, g.by + 152, '↺ REJOUER', false);
      const n = Object.keys(keep.answers).length, up = Object.values(keep.answers).filter((x) => x === 'up').length;
      ctx.fillStyle = cc.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText(tri.cur == null ? 'ÉCOUTEZ UNE PAIRE, PUIS DITES CE QUE VOUS ENTENDEZ.' : `PAIRE : ${PC[tri.cur].toUpperCase()} → ${PC[(tri.cur + 6) % 12].toUpperCase()} (UN TRITON : NI PLUS HAUT NI PLUS BAS)`, g.v.x0 + 24, H - 58);
      ctx.fillText(n ? `VOS RÉPONSES : ${up} « MONTE », ${n - up} « DESCEND » SUR ${n} PAIRES · VERT : MONTE, ROUGE : DESCEND` : 'LE CERCLE : LES DOUZE NOTES, SANS HAUT NI BAS', g.v.x0 + 24, H - 40);
      if (n >= 6) ctx.fillText('LES VERTS ET LES ROUGES SE GROUPENT EN GÉNÉRAL DE PART ET D’AUTRE D’UNE FRONTIÈRE : C’EST VOTRE ORIENTATION, PROPRE À VOUS.', g.v.x0 + 24, H - 22);
    }
    function triNext() { const left = [...Array(12).keys()].filter((k) => !keep.answers[k]); const k = left.length ? left[Math.floor(Math.random() * left.length)] : Math.floor(Math.random() * 12); triPlay(k); }

    /* ───────── fondamentale absente ───────── */
    let harmBank = null;
    function harmOn() {
      if (!c || harmBank) return;
      const out = c.createGain(); out.gain.value = 0; out.gain.setTargetAtTime(1, now(), 0.05); out.connect(B.input);
      const osc = keep.harm.map((on, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = keep.f0 * (i + 1); g.gain.value = on ? 0.06 / Math.sqrt(i + 1) : 0; o.connect(g); g.connect(out); o.start(); return { o, g }; });
      harmBank = { out, osc };
    }
    function harmSet() { if (!harmBank) return; const t = now(); harmBank.osc.forEach((v, i) => { v.o.frequency.setTargetAtTime(keep.f0 * (i + 1), t, 0.02); v.g.gain.setTargetAtTime(keep.harm[i] ? 0.06 / Math.sqrt(i + 1) : 0, t, 0.03); }); }
    function harmOff() { if (!harmBank) return; const t = now(); harmBank.out.gain.setTargetAtTime(0, t, 0.04); for (const v of harmBank.osc) v.o.stop(t + 0.4); harmBank = null; }
    function absGeom() { const v = view(); return { v, bx0: v.x0 + v.w * 0.1, bx1: v.x1 - v.w * 0.1, by: H * 0.48, bh: H * 0.26 }; }
    function drawAbsente(cc) {
      const g = absGeom(), n = keep.harm.length, bw = (g.bx1 - g.bx0) / n;
      // forme d'onde : la période 1/f₀ est toujours là
      const wy = H * 0.29, wa = H * 0.07, x0 = g.bx0, x1 = g.bx1;
      let mx = 1e-6; const s = [];
      for (let i = 0; i <= 600; i++) { const tt = (i / 600) * 4; let y = 0; keep.harm.forEach((on, j) => { if (on) y += Math.sin(TAU * (j + 1) * tt) / Math.sqrt(j + 1); }); s.push(y); mx = Math.max(mx, Math.abs(y)); }
      ctx.strokeStyle = light() ? '#6f45d4' : '#ff8ad8'; ctx.lineWidth = 2; ctx.beginPath(); s.forEach((y, i) => { const x = x0 + ((x1 - x0) * i) / 600, yy = wy - (y / mx) * wa; i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }); ctx.stroke();
      ctx.strokeStyle = cc.dim; ctx.setLineDash([3, 4]); for (let k = 0; k <= 4; k++) { const x = x0 + ((x1 - x0) * k) / 4; ctx.beginPath(); ctx.moveTo(x, wy - wa - 8); ctx.lineTo(x, wy + wa + 8); ctx.stroke(); } ctx.setLineDash([]);
      ctx.fillStyle = cc.txt; ctx.font = '500 10.5px "JetBrains Mono", monospace';
      ctx.fillText(`QUATRE PÉRIODES DE ${fr(1000 / keep.f0, 1)} MS (1/${keep.f0} S) : LE MOTIF SE RÉPÈTE MÊME SANS LA FONDAMENTALE`, x0, wy - wa - 16);
      // barres (touchez pour activer ou couper)
      for (let i = 0; i < n; i++) {
        const x = g.bx0 + i * bw, on = keep.harm[i], h = (g.bh * 1) / Math.sqrt(i + 1);
        ctx.strokeStyle = cc.dim; ctx.setLineDash(on ? [] : [4, 4]); ctx.strokeRect(x + 8, g.by + g.bh - h, bw - 16, h); ctx.setLineDash([]);
        if (on) { ctx.fillStyle = light() ? `hsla(${280 - i * 14},55%,45%,.85)` : `hsla(${280 - i * 14},80%,68%,.85)`; ctx.fillRect(x + 8, g.by + g.bh - h, bw - 16, h); }
        ctx.fillStyle = cc.txt; ctx.textAlign = 'center'; ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillText(`${keep.f0 * (i + 1)} Hz`, x + bw / 2, g.by + g.bh + 16); ctx.fillText(i === 0 ? 'fondamentale' : `harmonique ${i + 1}`, x + bw / 2, g.by + g.bh + 30); ctx.textAlign = 'left';
      }
      ctx.fillStyle = cc.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      const firstOn = keep.harm.findIndex((x) => x);
      ctx.fillText(firstOn > 0 ? `PAS DE SON À ${keep.f0} HZ… ET POURTANT C’EST CETTE NOTE QU’ON ENTEND (TOUCHEZ LES BARRES)` : 'TOUCHEZ LES BARRES POUR AJOUTER OU RETIRER UNE HARMONIQUE', g.v.x0 + 24, H - 30);
    }

    /* ───────── battements binauraux ───────── */
    let binNodes = null;
    function binOn() {
      if (!c || binNodes) return;
      const m = c.createChannelMerger(2), g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.11, now(), 0.1); m.connect(g); g.connect(au.master); // sans réverbération : elle mélangerait les oreilles
      const a = c.createOscillator(), b = c.createOscillator(), ga = c.createGain(), gb = c.createGain(), mixA = c.createGain(), mixB = c.createGain();
      a.frequency.value = keep.bf; b.frequency.value = keep.bf + keep.bd;
      a.connect(ga); b.connect(gb);
      binNodes = { m, g, a, b, ga, gb, mixA, mixB };
      binRoute(); a.start(); b.start();
    }
    function binRoute() {
      if (!binNodes) return; const n = binNodes;
      try { n.ga.disconnect(); n.gb.disconnect(); } catch (e) { /* rien */ }
      if (keep.bin === 'binaural') { n.ga.gain.value = 1; n.gb.gain.value = 1; n.ga.connect(n.m, 0, 0); n.gb.connect(n.m, 0, 1); }
      else { n.ga.gain.value = 0.7; n.gb.gain.value = 0.7; for (const ch of [0, 1]) { n.ga.connect(n.m, 0, ch); n.gb.connect(n.m, 0, ch); } }
    }
    function binTune() { if (!binNodes) return; const t = now(); binNodes.a.frequency.setTargetAtTime(keep.bf, t, 0.03); binNodes.b.frequency.setTargetAtTime(keep.bf + keep.bd, t, 0.03); }
    function binOff() { if (!binNodes) return; const t = now(); binNodes.g.gain.setTargetAtTime(0, t, 0.05); binNodes.a.stop(t + 0.4); binNodes.b.stop(t + 0.4); const m = binNodes.g; setTimeout(() => { try { m.disconnect(); } catch (e) { /* rien */ } }, 600); binNodes = null; }
    function drawBinaural(cc) {
      const v = view(), cx = v.cx, cy = H * 0.5, R = Math.min(v.w, H) * 0.13;
      const beat = 0.5 + 0.5 * Math.cos(TAU * keep.bd * T), bin = keep.bin === 'binaural';
      // la tête
      ctx.strokeStyle = light() ? 'rgba(40,30,60,.55)' : 'rgba(235,228,255,.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.82, R, 0, 0, TAU); ctx.stroke();
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * R * 0.86, cy, R * 0.12, R * 0.22, 0, 0, TAU); ctx.stroke(); }
      // la pulsation : dans la tête (binaural) ou dans l'air (acoustique)
      const gx = bin ? cx : cx, gy = bin ? cy - R * 0.1 : cy, rad = bin ? R * 0.55 : R * 2.2;
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad); const col = light() ? '194,54,143' : '255,138,216';
      rg.addColorStop(0, `rgba(${col},${0.08 + 0.42 * beat})`); rg.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(gx, gy, rad, 0, TAU); ctx.fill();
      // les deux ondes, ralenties
      const lane = (x0, x1, y, f, lab) => {
        ctx.strokeStyle = light() ? '#2a4aa0' : '#8fb8ff'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i <= 200; i++) { const u = i / 200, x = x0 + (x1 - x0) * u, ph = TAU * (u * 9 * (f / keep.bf) - T * 0.6 * (f / keep.bf)); const yy = y + Math.sin(ph) * 14; i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke();
        ctx.fillStyle = cc.txt; ctx.font = '500 10.5px "JetBrains Mono", monospace'; ctx.fillText(lab, x0, y - 24);
      };
      if (bin) { lane(v.x0 + 30, cx - R * 1.2, cy, keep.bf, `OREILLE GAUCHE ${fr(keep.bf, 0)} HZ`); lane(cx + R * 1.2, v.x1 - 30, cy, keep.bf + keep.bd, `OREILLE DROITE ${fr(keep.bf + keep.bd, 1)} HZ`); }
      else {
        const x0 = v.x0 + 30, x1 = cx - R * 1.2; ctx.strokeStyle = light() ? '#2a4aa0' : '#8fb8ff'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i <= 300; i++) { const u = i / 300, x = x0 + (x1 - x0) * u, e = Math.cos(Math.PI * keep.bd * (T - u * 0.6)); const yy = cy + Math.sin(TAU * (u * 30 - T * 0.6)) * 14 * Math.abs(e); i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke();
        ctx.fillStyle = cc.txt; ctx.font = '500 10.5px "JetBrains Mono", monospace'; ctx.fillText(`LES DEUX SONS MÉLANGÉS DANS L’AIR : L’ENVELOPPE BAT ${fr(keep.bd, 1)} FOIS PAR SECONDE`, x0, cy - 30);
      }
      ctx.fillStyle = cc.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText(bin ? `AU CASQUE · DANS L’AIR, AUCUN BATTEMENT ; DANS LA TÊTE, ${fr(keep.bd, 1)} PAR SECONDE` : 'BATTEMENTS ACOUSTIQUES · RÉELS, MESURABLES PAR UN MICRO', v.x0 + 24, H - 30);
    }

    /* ───────── accélération éternelle ───────── */
    const NL = 5, P_R = 10; // cinq pulsations au tempo doublé ; une octave de tempo toutes les 10 s
    let rs = { s: 0, phi: 0, last: [] }, pulses = [];
    function rissetTick(k) {
      // φ₀ intègre le tempo de la couche la plus lente, qui double en P_R secondes ; la couche j bat 2^j fois plus vite
      const r0 = 0.5;
      const dt = k * keep.risset, phi0 = rs.phi;
      rs.phi += r0 * Math.pow(2, rs.s) * dt; rs.s += dt / P_R;
      const frac = (n, j) => { const a = phi0 * 2 ** j, b = rs.phi * 2 ** j; return b > a ? clamp((n - a) / (b - a), 0, 1) : 1; }; // instant exact du clic dans le pas
      // à la fin d'une octave de tempo, chaque couche a rejoint le tempo de la suivante : on décale les couches d'un cran
      // (l'ancienne couche j devient la j+1, avec exactement la même phase) et une nouvelle couche lente naît, inaudible
      if (rs.s >= 1) { rs.s -= 1; rs.phi /= 2; rs.last.pop(); rs.last.unshift(Math.floor(rs.phi)); for (let j = 0; j < NL; j++) rs.last[j] = Math.floor(rs.phi * 2 ** j); return; }
      for (let j = 0; j < NL; j++) {
        const ph = rs.phi * 2 ** j, n = Math.floor(ph);
        if (rs.last[j] == null) rs.last[j] = n;
        if (n > rs.last[j]) {
          rs.last[j] = n;
          const x = j + rs.s, amp = Math.exp(-((x - (NL - 1) / 2) ** 2) / (2 * 0.9 * 0.9));
          if (amp > 0.03) { click(j, amp, (frac(n, j) - 1) * k); pulses.push({ j, t: T, a: amp }); }
        }
      }
      pulses = pulses.filter((p) => T - p.t < 1.2);
    }
    function click(j, amp, off = 0) {
      if (!c) return;
      const t = now() + 0.06 + off / Math.max(0.05, env.speed || 1), o = c.createOscillator(), g = c.createGain(), f = [180, 320, 560, 900, 1500][j];
      o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 * amp, t + 0.002); g.gain.setTargetAtTime(0, t + 0.004, 0.03);
      o.connect(g); g.connect(B.input); o.start(t); o.stop(t + 0.2);
    }
    function drawRisset(cc) {
      const v = view(), cx = v.cx, cy = H * 0.48, R = Math.min(v.w, H) * 0.34;
      for (const p of pulses) {
        const age = T - p.t, r = R * (0.15 + 0.85 * (1 - Math.exp(-age * 3))) * (0.45 + p.j * 0.14), a = p.a * Math.max(0, 1 - age / 1.2);
        ctx.strokeStyle = light() ? `hsla(${200 + p.j * 30},55%,35%,${a})` : `hsla(${200 + p.j * 30},85%,70%,${a})`; ctx.lineWidth = 1 + 3 * a;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = cc.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      const tempo = 0.5 * Math.pow(2, rs.s) * 60;
      ctx.fillText(`CINQ PULSATIONS, CHACUNE DEUX FOIS PLUS RAPIDE QUE LA PRÉCÉDENTE · TOUTES ACCÉLÈRENT (TEMPO DE BASE ${Math.round(tempo)} PAR MINUTE)`, v.x0 + 24, H - 40);
      ctx.fillText('LA PLUS RAPIDE S’EFFACE PENDANT QU’UNE PLUS LENTE APPARAÎT : ÇA ACCÉLÈRE, POUR TOUJOURS', v.x0 + 24, H - 24);
      // les cinq couches et leurs volumes
      const bx = v.x1 - 170, by = H * 0.2;
      for (let j = 0; j < NL; j++) { const x = j + rs.s, amp = Math.exp(-((x - (NL - 1) / 2) ** 2) / (2 * 0.81)); ctx.fillStyle = light() ? `hsla(${200 + j * 30},55%,35%,.8)` : `hsla(${200 + j * 30},85%,70%,.8)`; ctx.fillRect(bx + j * 24, by + 80 - amp * 80, 16, amp * 80); }
      ctx.fillStyle = cc.dim; ctx.fillText('VOLUMES', bx, by + 96);
    }

    /* ───────── scènes ───────── */
    function stopAll() { bankOff(); harmOff(); binOff(); }
    function setScene(id) {
      stopAll(); keep.scene = id; toast = null;
      if (id === 'shepard') bankOn();
      if (id === 'absente') harmOn();
      if (id === 'binaural') binOn();
      if (id === 'risset') { rs = { s: 0, phi: 0, last: [] }; pulses = []; }
    }
    const C = () => light() ? { bg: '#f4f0e8', txt: 'rgba(40,30,60,.78)', dim: 'rgba(40,30,60,.3)' } : { bg: '#07050d', txt: 'rgba(235,228,255,.78)', dim: 'rgba(235,228,255,.25)' };
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    let hintBox = null;
    function render() {
      const cc = C(); ctx.fillStyle = cc.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = cc.txt; ctx.font = 'italic 500 20px "Space Grotesk", sans-serif';
      ctx.fillText(SCENES.find((s) => s[0] === keep.scene)[1], view().x0 + 24, 86);
      if (keep.scene === 'shepard') drawShepard(cc);
      else if (keep.scene === 'triton') drawTriton(cc);
      else if (keep.scene === 'absente') drawAbsente(cc);
      else if (keep.scene === 'binaural') drawBinaural(cc);
      else drawRisset(cc);
      if (toast && T - toast.t < 4) { ctx.fillStyle = cc.txt; ctx.globalAlpha = Math.min(1, (4 - (T - toast.t)) * 1.5); ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(toast.s, view().cx, 116); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
      hintBox = null;
      if (!c) { const v = view(), w = 190, h = 34, x = v.x1 - w - 20, y = 64; ctx.fillStyle = light() ? 'rgba(255,255,255,.85)' : 'rgba(20,14,34,.85)'; ctx.strokeStyle = light() ? '#c2368f' : '#ff8ad8'; ctx.lineWidth = 1; rr(x, y, w, h, 17); ctx.fill(); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('♪  ACTIVER LE SON', x + w / 2, y + 21); ctx.textAlign = 'left'; hintBox = { x, y, w, h }; }
    }
    function update(k) {
      T += k;
      if (keep.scene === 'shepard') shepTick(k);
      else if (keep.scene === 'risset') rissetTick(k);
    }
    setScene(keep.scene);
    if (window.FASC_DEBUG) window.FASC_DEBUG.sonill = { keep, setScene, triPlay, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); } };

    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) {
        if (hintBox && p.x > hintBox.x && p.x < hintBox.x + hintBox.w && p.y > hintBox.y && p.y < hintBox.y + hintBox.h) { env.askSound && env.askSound(); return; }
        if (keep.scene === 'shepard') { keep.dir = -keep.dir; say(keep.dir > 0 ? 'Ça monte… sans fin.' : 'Ça descend… sans fin.'); }
        else if (keep.scene === 'triton') {
          const g = triGeom(), inB = (y) => p.x > g.bx && p.x < g.bx + 150 && p.y > y && p.y < y + 40;
          if (inB(g.by)) triNext();
          else if (inB(g.by + 56) && tri.cur != null) { keep.answers[tri.cur] = 'up'; triNext(); }
          else if (inB(g.by + 104) && tri.cur != null) { keep.answers[tri.cur] = 'down'; triNext(); }
          else if (inB(g.by + 152) && tri.cur != null) triPlay(tri.cur);
          else { const d = Math.hypot(p.x - g.cx, p.y - g.cy); if (Math.abs(d - g.R) < 30) { const a = Math.atan2(p.y - g.cy, p.x - g.cx) + Math.PI / 2; triPlay(((Math.round((a / TAU) * 12) % 12) + 12) % 12); } }
        } else if (keep.scene === 'absente') {
          const g = absGeom(), i = Math.floor(((p.x - g.bx0) / (g.bx1 - g.bx0)) * keep.harm.length);
          if (i >= 0 && i < keep.harm.length && p.y > g.by - 20 && p.y < g.by + g.bh + 40) { keep.harm[i] = keep.harm[i] ? 0 : 1; harmSet(); }
        } else if (keep.scene === 'binaural') { keep.bin = keep.bin === 'binaural' ? 'acoustique' : 'binaural'; binRoute(); }
      },
      move() {},
      up() {},
      clear() { if (keep.scene === 'triton') { keep.answers = {}; tri.cur = null; } else setScene(keep.scene); },
      dispose() { stopAll(); if (B) B.dispose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'choice', label: 'Illusion', value: keep.scene, set: (x) => setScene(x), options: SCENES.map(([id, label]) => ({ id, label })) }];
        if (!c) L.push({ type: 'buttons', items: [{ label: '♪ Activer le son', act: () => env.askSound && env.askSound() }] });
        if (keep.scene === 'shepard') {
          L.push({ type: 'section', label: 'Escalier' });
          L.push({ type: 'choice', label: 'Mouvement', value: keep.glide ? 'g' : 'm', set: (x) => { keep.glide = x === 'g'; }, options: [{ id: 'm', label: 'Par marches (Shepard)' }, { id: 'g', label: 'Glissando (Risset)' }] });
          L.push({ type: 'buttons', items: [{ label: '↗ Monter', act: () => { keep.dir = 1; } }, { label: '↘ Descendre', act: () => { keep.dir = -1; } }] });
          L.push({ type: 'slider', label: 'Allure', min: 0.3, max: 3, step: 0.01, value: keep.rate, fmt: (x) => '×' + fr(x, 1), set: (x) => { keep.rate = x; } });
          L.push({ type: 'note', text: 'Au bout de douze marches, tous les sons sont exactement revenus à leur point de départ : regardez le spectre. Touchez l’écran pour changer de sens.' });
        } else if (keep.scene === 'triton') {
          L.push({ type: 'section', label: 'Triton' });
          L.push({ type: 'buttons', items: [{ label: 'Paire suivante', act: () => triNext() }, { label: 'Effacer mes réponses', act: () => { keep.answers = {}; tri.cur = null; } }] });
          L.push({ type: 'note', text: 'Pour chaque paire, dites ce que vous entendez, sans réfléchir. Faites-le aussi faire à quelqu’un d’autre : vos cercles ne seront peut-être pas orientés pareil.' });
        } else if (keep.scene === 'absente') {
          L.push({ type: 'section', label: 'Harmoniques' });
          L.push({ type: 'choice', label: 'Fondamentale', value: String(keep.f0), set: (x) => { keep.f0 = +x; harmSet(); }, options: [100, 150, 200, 300].map((f) => ({ id: String(f), label: f + ' Hz' })) });
          L.push({ type: 'buttons', items: [
            { label: 'Son complet', act: () => { keep.harm = [1, 1, 1, 1, 1, 1, 1, 1]; harmSet(); } },
            { label: 'Sans la fondamentale', act: () => { keep.harm = [0, 1, 1, 1, 1, 1, 1, 1]; harmSet(); } },
          ] });
          L.push({ type: 'buttons', items: [
            { label: 'Harmoniques 4, 5, 6 seules', act: () => { keep.harm = [0, 0, 0, 1, 1, 1, 0, 0]; harmSet(); } },
            { label: 'Fondamentale seule', act: () => { keep.harm = [1, 0, 0, 0, 0, 0, 0, 0]; harmSet(); } },
          ] });
          L.push({ type: 'note', text: 'Comparez « fondamentale seule » et « harmoniques 4, 5, 6 seules » : aucune fréquence commune, et pourtant la même note (le timbre change, pas la hauteur).' });
        } else if (keep.scene === 'binaural') {
          L.push({ type: 'section', label: 'Battements' });
          L.push({ type: 'choice', label: 'Écoute', value: keep.bin, set: (x) => { keep.bin = x; binRoute(); }, options: [{ id: 'binaural', label: 'Binaurale (au casque)' }, { id: 'acoustique', label: 'Acoustique (mélangés)' }] });
          L.push({ type: 'slider', label: 'Écart', min: 0.5, max: 30, step: 0.1, value: keep.bd, fmt: (x) => fr(x, 1) + ' Hz', set: (x) => { keep.bd = x; binTune(); } });
          L.push({ type: 'slider', label: 'Hauteur', min: 100, max: 800, step: 1, value: keep.bf, fmt: (x) => Math.round(x) + ' Hz', set: (x) => { keep.bf = x; binTune(); } });
          L.push({ type: 'note', text: 'Au-delà de 1 000 Hz ou de 30 Hz d’écart, l’effet binaural disparaît, alors que les battements acoustiques, eux, restent. Sans casque, les deux oreilles reçoivent les deux sons : ce ne sont plus des battements binauraux.' });
        } else {
          L.push({ type: 'section', label: 'Accélération' });
          L.push({ type: 'slider', label: 'Allure', min: 0.3, max: 3, step: 0.01, value: keep.risset, fmt: (x) => '×' + fr(x, 1), set: (x) => { keep.risset = x; } });
        }
        return L;
      },
    };
  }
})();
