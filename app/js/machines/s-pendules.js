/* Fascination — Les Pendules · vague de pendules et polyrythmie
   Vague : le pendule k fait exactement (N₀ + k) oscillations pendant le cycle Γ ; sa longueur en découle,
   L = g (Γ / 2π(N₀+k))². Partis ensemble, ils se déphasent, dessinent des vagues, deux rangées, trois serpents…
   puis se réalignent tous au bout de Γ. Chaque pendule sonne quand il touche le bout de sa course : on entend la
   figure. Polyrythmie : sur chaque arc, un point fait l'aller-retour à sa propre vitesse (M − k allers-retours par
   cycle) et sonne à chaque rebond. Les instants des notes sont calculés exactement, puis programmés à l'avance. */
(function boot() {
  if (!window.FK || !window.FKSON) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const { mtof, bus } = window.FKSON;
  const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const SCALES = { penta: [0, 2, 4, 7, 9], majeur: [0, 2, 4, 5, 7, 9, 11], dorien: [0, 2, 3, 5, 7, 9, 10], tons: [0, 2, 4, 6, 8, 10] };
  const keep = { scene: 'vague', n: 15, n0: 51, gam: 60, view: 'biais', ring: 21, ringM: 60, ringG: 180, scale: 'penta', timbre: 'cloche', vol: 0.8, trails: true };

  window.FASC.push({
    id: 'pendules', name: 'Les Pendules', cat: 'Sons', glyph: '⋔', smoothTime: true, decor: true,
    blurb: 'Vague de pendules et polyrythmie : des motifs qui s’entendent',
    hint: 'Glissez pour tourner autour des pendules. Chaque pendule sonne au bout de sa course ; au bout du cycle, ils se réalignent tous.',
    intro: 'Quinze pendules de longueurs à peine différentes, lâchés ensemble. Le plus long fait 51 oscillations par minute, le suivant 52, puis 53… Ils se déphasent, dessinent des vagues, des serpents, deux rangées qui s’opposent, un désordre apparent, puis, au bout d’une minute exactement, se retrouvent alignés. Et l’on entend la figure.',
    about: [
      'La période d’un pendule simple ne dépend (aux petites amplitudes) que de sa longueur : T = 2π √(L/g). Galilée l’aurait remarqué en regardant osciller un lustre de la cathédrale de Pise, en comptant avec son pouls. Ici, le pendule k doit faire N₀ + k oscillations en Γ secondes : sa longueur est donc L = g (Γ / 2π(N₀+k))², de 34 à 21 cm pour Γ = 60 s.',
      'Les figures ne sont qu’un effet de la différence d’une oscillation par cycle entre voisins. À l’instant t, le déphasage entre deux voisins vaut 2π t/Γ : à Γ/2, un pendule sur deux est en opposition (deux rangées) ; à Γ/3, trois serpents ; à Γ/4, quatre… C’est un cousin du moiré, et de l’« aliasing » des roues de charrette qui semblent tourner à l’envers au cinéma.',
      'La polyrythmie en arcs (popularisée en 2022 par la vidéo « Polyrhythm » de Project JDM) suit la même idée : l’arc k fait M − k allers-retours par cycle. Deux arcs voisins jouent des rythmes « M contre M−1 » ; tous se retrouvent au même bout après un cycle complet. La musique africaine et indonésienne pratique depuis des siècles ces superpositions de rythmes.',
      'Les pendules sont idéaux (sans frottement, petites amplitudes). Un vrai pendule lâché de plus haut oscille un peu plus lentement : la vague se dérègle alors peu à peu.',
    ],
    tools: [
      { id: 'tourner', label: 'tourner', desc: 'Glissez pour changer de point de vue (vague de pendules).' },
      { id: 'toucher', label: 'toucher', desc: 'Touchez un pendule ou un arc : il sonne.' },
    ],
    make(env) { return makePendules(env); },
  });

  function makePendules(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const B = bus(au, { rev: 0.32, sec: 3.4, gain: 0.85 });
    const c = B ? B.ctx : null;
    const light = () => env.theme === 'light', bare = () => env.decor === false;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    let T = 0, cam = { az: -0.32, el: 0.26 }, flash = [], toast = null;
    const G = 9.81, TH0 = 0.32; // amplitude de départ (18°)

    /* ───────── les notes ───────── */
    function pitch(k, n) { const sc = SCALES[keep.scale], o = Math.floor(k / sc.length); return mtof(50 + 12 * o + sc[k % sc.length]) * (n ? 1 : 1); }
    function hit(f, when, g = 1, pan = 0) {
      if (!c) return;
      const t = Math.max(c.currentTime, when), out = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null;
      const amp = 0.07 * keep.vol * g;
      // cloche douce (partiels 1 et 2,76, comme une lame de vibraphone) ou marimba (1 et 4) ou verre (1, 2,32, 4,25)
      const P = keep.timbre === 'marimba' ? [[1, 1, 0.5], [3.93, 0.28, 0.08]] : keep.timbre === 'verre' ? [[1, 1, 1.4], [2.32, 0.35, 0.6], [4.25, 0.12, 0.3]] : [[1, 1, 1.1], [2.76, 0.25, 0.35], [5.4, 0.08, 0.12]];
      for (const [r, a, d] of P) {
        const o = c.createOscillator(), v = c.createGain(); o.frequency.value = f * r; v.gain.value = 0;
        v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(amp * a, t + 0.004); v.gain.setTargetAtTime(0, t + 0.006, d / 3);
        o.connect(v); v.connect(out); o.start(t); o.stop(t + d * 2.2 + 0.1);
      }
      if (p) { p.pan.value = clamp(pan, -0.9, 0.9); out.connect(p); p.connect(B.input); } else out.connect(B.input);
    }
    const toAudio = (dtSim) => (c ? c.currentTime + 0.05 + dtSim / Math.max(0.05, env.speed || 1) : 0);

    /* ───────── vague de pendules ───────── */
    let pend = [];
    function buildPend() {
      pend = [];
      for (let k = 0; k < keep.n; k++) { const nk = keep.n0 + k, Tk = keep.gam / nk, L = G * (Tk / TAU) ** 2; pend.push({ k, nk, Tk, w: TAU / Tk, L, f: pitch(k), next: 0.5 * Tk + 0 }); }
      T = 0; for (const p of pend) p.next = p.Tk; // premier retour au point de départ (côté où on les lâche)
    }
    // θ(t) = θ₀ cos(ωt) : retour au bout droit aux instants m·T
    function schedPend() {
      const ahead = 0.25 * Math.max(1, env.speed || 1);
      for (const p of pend) while (p.next < T + ahead) { if (p.next >= T - 0.02) { hit(p.f, toAudio(p.next - T), 1, ((p.k / (keep.n - 1)) * 2 - 1) * 0.6); flash.push({ k: p.k, at: p.next }); } p.next += p.Tk; }
    }
    function proj(X, Y, Z, g) {
      // caméra en orbite autour du centre de la rangée
      const ca = Math.cos(cam.az), sa = Math.sin(cam.az), ce = Math.cos(cam.el), se = Math.sin(cam.el);
      const x1 = X * ca - Z * sa, z1 = X * sa + Z * ca;
      const y2 = Y * ce + z1 * se, z2 = -Y * se + z1 * ce; // caméra au-dessus : ce qui est proche descend
      const d = 1.15, s = g.f / (d + z2);
      return [g.cx + x1 * s, g.cy - y2 * s, s, z2];
    }
    function drawPend(cc) {
      const v = view(), Lmax = pend[0].L, rowLen = 0.62;
      const g = { cx: v.cx, cy: H * 0.3, f: Math.min(v.w, H * 1.3) * 1.3 };
      const items = [];
      for (const p of pend) {
        const th = TH0 * Math.cos(p.w * T), Z = -rowLen / 2 + (rowLen * p.k) / Math.max(1, keep.n - 1);
        const top = [0, 0.04, Z], ball = [p.L * Math.sin(th), 0.04 - p.L * Math.cos(th), Z];
        items.push({ p, th, top, ball, z: proj(ball[0], ball[1], ball[2], g)[3] });
      }
      // la poutre et le sol
      if (!bare()) {
        const a = proj(0, 0.04, -rowLen / 2 - 0.05, g), b = proj(0, 0.04, rowLen / 2 + 0.05, g);
        ctx.strokeStyle = light() ? 'rgba(90,70,50,.6)' : 'rgba(200,180,150,.35)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        const fy = 0.04 - Lmax - 0.06;
        ctx.strokeStyle = light() ? 'rgba(60,40,80,.1)' : 'rgba(180,200,255,.06)'; ctx.lineWidth = 1;
        for (let i = -4; i <= 4; i++) { const p1 = proj(i * 0.08, fy, -0.4, g), p2 = proj(i * 0.08, fy, 0.4, g); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); const q1 = proj(-0.32, fy, i * 0.1, g), q2 = proj(0.32, fy, i * 0.1, g); ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke(); }
        // ombres
        for (const it of items) { const s = proj(it.ball[0], fy, it.ball[2], g); ctx.fillStyle = light() ? 'rgba(40,30,60,.12)' : 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(s[0], s[1], 0.02 * s[2], 0.008 * s[2], 0, 0, TAU); ctx.fill(); }
      }
      items.sort((a, b) => b.z - a.z);
      for (const it of items) {
        const A = proj(...it.top, g), Bp = proj(...it.ball, g), r = Math.max(3, 0.016 * Bp[2]);
        const age = Math.min(...flash.filter((f) => f.k === it.p.k && f.at <= T).map((f) => T - f.at), 9), glow = Math.exp(-age * 5);
        const hue = 200 + (it.p.k / keep.n) * 120;
        ctx.strokeStyle = light() ? 'rgba(40,30,60,.45)' : 'rgba(220,225,255,.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Bp[0], Bp[1]); ctx.stroke();
        if (!light() && glow > 0.02) { const rg = ctx.createRadialGradient(Bp[0], Bp[1], 0, Bp[0], Bp[1], r * 5); rg.addColorStop(0, `hsla(${hue},90%,70%,${0.55 * glow})`); rg.addColorStop(1, 'hsla(0,0%,0%,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(Bp[0], Bp[1], r * 5, 0, TAU); ctx.fill(); }
        const sg = ctx.createRadialGradient(Bp[0] - r * 0.35, Bp[1] - r * 0.4, r * 0.1, Bp[0], Bp[1], r);
        sg.addColorStop(0, light() ? `hsl(${hue},60%,${70 + glow * 20}%)` : `hsl(${hue},80%,${78 + glow * 18}%)`); sg.addColorStop(1, light() ? `hsl(${hue},50%,30%)` : `hsl(${hue},60%,${28 + glow * 25}%)`);
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(Bp[0], Bp[1], r, 0, TAU); ctx.fill();
      }
      // le cycle
      const ph = (T % keep.gam) / keep.gam, fx = v.x0 + 24, fy2 = H - 30, fw = Math.min(320, v.w * 0.4);
      ctx.strokeStyle = cc.dim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy2); ctx.lineTo(fx + fw, fy2); ctx.stroke();
      ctx.strokeStyle = cc.acc; ctx.beginPath(); ctx.moveTo(fx, fy2); ctx.lineTo(fx + fw * ph, fy2); ctx.stroke();
      for (const q of [2, 3, 4, 5]) for (let j = 1; j < q; j++) { const x = fx + (fw * j) / q; ctx.fillStyle = cc.dim; ctx.fillRect(x - 0.5, fy2 - (q === 2 ? 6 : 3), 1, q === 2 ? 12 : 6); }
      ctx.fillStyle = cc.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      const tt = T % keep.gam, near = [[1 / 2, 'deux rangées'], [1 / 3, 'trois serpents'], [2 / 3, 'trois serpents'], [1 / 4, 'quatre serpents'], [3 / 4, 'quatre serpents'], [1 / 5, 'cinq'], [0, 'alignés'], [1, 'alignés']].find(([f]) => Math.abs(ph - f) < 0.012);
      ctx.fillText(`${fr(tt, 1)} S / ${keep.gam} S${near ? ' · ' + near[1].toUpperCase() : ''} · DU PLUS LONG (${pend[0].nk} OSC.) AU PLUS COURT (${pend[pend.length - 1].nk} OSC.)`, fx, fy2 - 14);
    }

    /* ───────── polyrythmie en arcs ───────── */
    let rings = [];
    function buildRings() {
      rings = [];
      for (let k = 0; k < keep.ring; k++) { const laps = keep.ringM - k, per = keep.ringG / laps; rings.push({ k, laps, per, f: pitch(keep.ring - 1 - k), next: per / 2, last: -9 }); }
      T = 0;
    }
    // position sur l'arc : aller-retour de 0 à π en « per » secondes (vitesse constante)
    const ringAng = (r, t) => { const u = (t / r.per) % 1; return Math.PI * (u < 0.5 ? u * 2 : 2 - u * 2); };
    function schedRings() {
      const ahead = 0.25 * Math.max(1, env.speed || 1);
      for (const r of rings) while (r.next < T + ahead) { if (r.next >= T - 0.02) hit(r.f, toAudio(r.next - T), 0.8, (Math.round(r.next / (r.per / 2)) % 2 ? 0.5 : -0.5) * (0.3 + r.k / keep.ring)); r.last = r.next; r.next += r.per / 2; }
    }
    function drawRings(cc) {
      const v = view(), cx = v.cx, cy = H * 0.74, R1 = Math.min(v.w * 0.46, H * 0.62), R0 = R1 * 0.16;
      if (!bare()) { ctx.strokeStyle = cc.dim; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - R1 - 20, cy); ctx.lineTo(cx + R1 + 20, cy); ctx.stroke(); }
      for (const r of rings) {
        const R = R0 + ((R1 - R0) * (r.k + 0.5)) / keep.ring, glow = Math.exp(-(T - r.last) * 3), hue = 330 - (r.k / keep.ring) * 150;
        ctx.strokeStyle = light() ? `hsla(${hue},55%,40%,${0.3 + 0.6 * glow})` : `hsla(${hue},85%,${55 + 25 * glow}%,${0.22 + 0.7 * glow})`;
        ctx.lineWidth = 1.4 + glow * 2.5; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, TAU); ctx.stroke();
        if (!light() && glow > 0.05) { ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 8 * glow; ctx.strokeStyle = `hsla(${hue},90%,60%,${0.12 * glow})`; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
        const a = ringAng(r, T), x = cx - Math.cos(a) * R, y = cy - Math.sin(a) * R;
        if (keep.trails && !light()) { ctx.strokeStyle = `hsla(${hue},90%,75%,.25)`; ctx.lineWidth = 3; ctx.beginPath(); const a2 = ringAng(r, T - 0.12); ctx.arc(cx, cy, R, Math.PI + Math.min(a, a2), Math.PI + Math.max(a, a2)); ctx.stroke(); }
        ctx.fillStyle = light() ? `hsl(${hue},55%,35%)` : `hsl(${hue},90%,${80 + 15 * glow}%)`; ctx.beginPath(); ctx.arc(x, y, 3.2 + glow * 2.5, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = cc.txt; ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText(`${fr(T % keep.ringG, 1)} S / ${keep.ringG} S · ARC EXTÉRIEUR ${keep.ringM - keep.ring + 1} ALLERS-RETOURS, INTÉRIEUR ${keep.ringM}`, v.x0 + 24, H - 18);
    }

    /* ───────── boucle ───────── */
    const C = () => light() ? { bg0: '#f4f0e8', bg1: '#e9e3d6', txt: 'rgba(40,30,60,.78)', dim: 'rgba(40,30,60,.3)', acc: '#c2368f' } : { bg0: '#06050c', bg1: '#0e0a18', txt: 'rgba(235,228,255,.75)', dim: 'rgba(235,228,255,.22)', acc: '#ff8ad8' };
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    let hintBox = null;
    function render() {
      const cc = C();
      if (bare()) { ctx.fillStyle = cc.bg0; ctx.fillRect(0, 0, W, H); } else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, cc.bg0); g.addColorStop(1, cc.bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      if (keep.scene === 'vague') drawPend(cc); else drawRings(cc);
      if (toast && T - toast.t < 4) { ctx.fillStyle = cc.txt; ctx.globalAlpha = Math.min(1, (4 - (T - toast.t)) * 1.5); ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(toast.s, view().cx, 70); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
      hintBox = null;
      if (!c) { const v = view(), w = 190, h = 34, x = v.x1 - w - 20, y = H - 58; ctx.fillStyle = light() ? 'rgba(255,255,255,.85)' : 'rgba(20,14,34,.85)'; ctx.strokeStyle = cc.acc; ctx.lineWidth = 1; rr(x, y, w, h, 17); ctx.fill(); ctx.stroke(); ctx.fillStyle = cc.acc; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('♪  ACTIVER LE SON', x + w / 2, y + 21); ctx.textAlign = 'left'; hintBox = { x, y, w, h }; }
    }
    function update(k) {
      T += k;
      flash = flash.filter((f) => T - f.at < 1.5);
      if (keep.scene === 'vague') schedPend(); else schedRings();
    }
    function setScene(id) { keep.scene = id; if (id === 'vague') buildPend(); else buildRings(); }
    setScene(keep.scene);
    if (window.FASC_DEBUG) window.FASC_DEBUG.pend = { keep, setScene, buildPend, buildRings, cam, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); }, set T(x) { T = x; for (const p of pend) p.next = Math.ceil(x / p.Tk) * p.Tk; for (const r of rings) r.next = Math.ceil(x / (r.per / 2)) * (r.per / 2); }, get T() { return T; } };

    let last = null;
    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) {
        if (hintBox && p.x > hintBox.x && p.x < hintBox.x + hintBox.w && p.y > hintBox.y && p.y < hintBox.y + hintBox.h) { env.askSound && env.askSound(); return; }
        last = { x: p.x, y: p.y };
        if (env.tool === 'toucher') {
          if (keep.scene === 'vague') { const v = view(), k = clamp(Math.round(((p.x - v.x0) / v.w) * (keep.n - 1)), 0, keep.n - 1); hit(pend[k].f, toAudio(0)); flash.push({ k, at: T }); }
          else { const v = view(), cx = v.cx, cy = H * 0.74, R1 = Math.min(v.w * 0.46, H * 0.62), R0 = R1 * 0.16, d = Math.hypot(p.x - cx, p.y - cy), k = clamp(Math.floor(((d - R0) / (R1 - R0)) * keep.ring), 0, keep.ring - 1); hit(rings[k].f, toAudio(0)); rings[k].last = T; }
        }
      },
      move(p) {
        if (!p.down || !last) return;
        if ((env.tool || 'tourner') === 'tourner' && keep.scene === 'vague') { cam.az += (p.x - last.x) * 0.006; cam.el = clamp(cam.el + (p.y - last.y) * 0.004, -0.1, 1.45); }
        last = { x: p.x, y: p.y };
      },
      up() { last = null; },
      clear() { setScene(keep.scene); toast = { s: 'Relâchés ensemble.', t: T }; },
      dispose() { if (B) B.dispose(); },
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'Vague de pendules', act: () => setScene('vague') },
          { label: 'Polyrythmie', act: () => setScene('arcs') },
        ] }];
        if (!c) L.push({ type: 'buttons', items: [{ label: '♪ Activer le son', act: () => env.askSound && env.askSound() }] });
        if (keep.scene === 'vague') {
          L.push({ type: 'section', label: 'Vague' });
          L.push({ type: 'buttons', items: [{ label: 'Relâcher ensemble', act: () => buildPend() }] });
          L.push({ type: 'buttons', items: [
            { label: 'Aller à ½ cycle', act: () => jump(keep.gam / 2 - 2) },
            { label: '⅓', act: () => jump(keep.gam / 3 - 2) },
            { label: '¼', act: () => jump(keep.gam / 4 - 2) },
          ] });
          L.push({ type: 'slider', label: 'Pendules', min: 8, max: 24, step: 1, value: keep.n, fmt: (x) => String(x), set: (x) => { keep.n = x; buildPend(); } });
          L.push({ type: 'slider', label: 'Durée du cycle', min: 20, max: 120, step: 1, value: keep.gam, fmt: (x) => x + ' s', set: (x) => { keep.gam = x; buildPend(); } });
          L.push({ type: 'choice', label: 'Point de vue', value: keep.view, set: (x) => { keep.view = x; Object.assign(cam, x === 'face' ? { az: 0, el: 0.08 } : x === 'dessus' ? { az: 0, el: 1.4 } : x === 'bout' ? { az: -1.5, el: 0.25 } : { az: -0.32, el: 0.26 }); }, options: [{ id: 'biais', label: 'Dans l’axe, de biais' }, { id: 'face', label: 'Dans l’axe' }, { id: 'dessus', label: 'Du dessus' }, { id: 'bout', label: 'De côté' }] });
          L.push({ type: 'note', text: `Longueurs de ${fr(pend[0].L * 100, 1)} à ${fr(pend[pend.length - 1].L * 100, 1)} cm ; chacun sonne en revenant au point d’où on l’a lâché. Vue « du dessus » : les serpents. Le cycle complet dure ${keep.gam} s à la vitesse ×1.` });
        } else {
          L.push({ type: 'section', label: 'Polyrythmie' });
          L.push({ type: 'buttons', items: [{ label: 'Repartir ensemble', act: () => buildRings() }] });
          L.push({ type: 'slider', label: 'Arcs', min: 6, max: 32, step: 1, value: keep.ring, fmt: (x) => String(x), set: (x) => { keep.ring = x; buildRings(); } });
          L.push({ type: 'slider', label: 'Durée du cycle', min: 30, max: 900, step: 10, value: keep.ringG, fmt: (x) => (x >= 120 ? fr(x / 60, 1) + ' min' : x + ' s'), set: (x) => { keep.ringG = x; buildRings(); } });
          L.push({ type: 'slider', label: 'Allers-retours de l’arc intérieur', min: 20, max: 90, step: 1, value: keep.ringM, fmt: (x) => String(x), set: (x) => { keep.ringM = Math.max(x, keep.ring + 1); buildRings(); } });
          L.push({ type: 'toggle', label: 'Traînées', value: keep.trails, set: (x) => { keep.trails = x; } });
        }
        L.push({ type: 'section', label: 'Son' });
        L.push({ type: 'choice', label: 'Gamme', value: keep.scale, set: (x) => { keep.scale = x; for (const p of pend) p.f = pitch(p.k); for (const r of rings) r.f = pitch(keep.ring - 1 - r.k); }, options: [{ id: 'penta', label: 'Pentatonique' }, { id: 'majeur', label: 'Majeur' }, { id: 'dorien', label: 'Dorien' }, { id: 'tons', label: 'Par tons' }] });
        L.push({ type: 'choice', label: 'Timbre', value: keep.timbre, set: (x) => { keep.timbre = x; }, options: [{ id: 'cloche', label: 'Vibraphone' }, { id: 'marimba', label: 'Marimba' }, { id: 'verre', label: 'Verre' }] });
        L.push({ type: 'slider', label: 'Volume', min: 0, max: 1.5, step: 0.01, value: keep.vol, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.vol = x; } });
        return L;
      },
    };
    // sauter dans le cycle (sans jouer toutes les notes intermédiaires)
    function jump(t) { T = Math.max(0, t); for (const p of pend) p.next = Math.ceil(T / p.Tk) * p.Tk; flash = []; toast = { s: 'Regardez, écoutez…', t: T }; void rnd; }
  }
})();
