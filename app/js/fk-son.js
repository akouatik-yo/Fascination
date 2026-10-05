/* Fascination — outils audio partagés par les machines Sons
   bus(audio)      : un départ propre à la machine, avec réverbération (salle synthétique) ; dispose() le débranche.
   ks(ctx, f, o)   : une corde pincée par l'algorithme de Karplus-Strong (1983) — une ligne à retard bouclée sur un
                     filtre passe-bas : chaque aller-retour de l'onde perd un peu d'aigus, comme une vraie corde.
                     Le point de pincement creuse les harmoniques dont il est un nœud (filtre en peigne).
   Notes : convention française (do3 = 261,6 Hz, la3 = 440 Hz). */
(function () {
  const NOMS = ['do', 'do♯', 'ré', 'mi♭', 'mi', 'fa', 'fa♯', 'sol', 'la♭', 'la', 'si♭', 'si'];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const ftom = (f) => 69 + 12 * Math.log2(f / 440);
  const nom = (m) => { const r = Math.round(m); return NOMS[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 2); };

  // réponse impulsionnelle d'une salle : bruit stéréo qui décroît et s'assombrit
  const irCache = new Map();
  function impulse(ctx, sec = 3, bright = 0.5) {
    const key = sec + '|' + bright + '|' + ctx.sampleRate;
    if (irCache.has(key)) return irCache.get(key);
    const sr = ctx.sampleRate, n = Math.round(sr * sec), b = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n, k = 0.08 + 0.9 * bright * (1 - t); // le filtre se ferme avec le temps
        lp += (Math.random() * 2 - 1 - lp) * k;
        d[i] = lp * Math.pow(1 - t, 2.2) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
      }
    }
    irCache.set(key, b);
    return b;
  }

  function bus(audio, o = {}) {
    const c = audio && audio.on ? audio.ensure() : null;
    if (!c) return null;
    const input = c.createGain(), dry = c.createGain(), wet = c.createGain(), conv = c.createConvolver(), out = c.createGain();
    conv.buffer = impulse(c, o.sec || 3.2, o.bright == null ? 0.45 : o.bright);
    dry.gain.value = 1; wet.gain.value = o.rev == null ? 0.35 : o.rev; out.gain.value = o.gain == null ? 1 : o.gain;
    input.connect(dry); input.connect(conv); conv.connect(wet); dry.connect(out); wet.connect(out); out.connect(audio.master);
    return {
      ctx: c, input, out,
      rev(v) { wet.gain.setTargetAtTime(v, c.currentTime, 0.1); },
      gain(v) { out.gain.setTargetAtTime(v, c.currentTime, 0.08); },
      dispose() { const t = c.currentTime; out.gain.setTargetAtTime(0.0001, t, 0.05); setTimeout(() => { try { out.disconnect(); } catch (e) { /* déjà débranché */ } }, 400); },
    };
  }

  /* Karplus-Strong « étendu » (Jaffe et Smith 1983) :
     - accord fin par un passe-tout du premier ordre (la boucle ne peut contenir qu'un nombre entier d'échantillons) ;
     - pos : point de pincement (0..0,5) → peigne qui annule les harmoniques n tels que n·pos est entier ;
     - bright : 0 doux (pincé avec la pulpe) … 1 vif (avec l'ongle) ;
     - t60 : durée de résonance de la fondamentale (s). */
  const ksCache = new Map();
  function ks(ctx, f, o = {}) {
    const pos = Math.min(0.5, Math.max(0.02, o.pos == null ? 0.25 : o.pos)), bright = o.bright == null ? 0.5 : o.bright, t60 = o.t60 || 3;
    const key = [Math.round(f * 10), Math.round(pos * 20), Math.round(bright * 6), Math.round(t60 * 4), ctx.sampleRate].join('|');
    if (ksCache.has(key)) return ksCache.get(key);
    const sr = ctx.sampleRate, dur = Math.min(8, t60 * 1.1 + 0.2), n = Math.round(sr * dur);
    const P = sr / f, N = Math.floor(P - 0.5), frac = P - 0.5 - N; // le moyennage ajoute ½ échantillon de retard
    const C = (1 - frac) / (1 + frac);
    const g = Math.pow(10, -3 / (t60 * f)); // perte par aller-retour pour atteindre −60 dB en t60
    const buf = ctx.createBuffer(1, n, sr), y = buf.getChannelData(0);
    // excitation : bruit adouci (le doigt), puis peigne du point de pincement
    const ex = new Float32Array(N + 2); let lp = 0; const a = 0.15 + 0.8 * bright;
    for (let i = 0; i < ex.length; i++) { lp += (Math.random() * 2 - 1 - lp) * a; ex[i] = lp; }
    const M = Math.max(1, Math.round(pos * N)), line = new Float32Array(N + 2);
    let mean = 0;
    for (let i = 0; i < ex.length; i++) { line[i] = ex[i] - (i >= M ? ex[i - M] : 0); mean += line[i]; }
    mean /= ex.length; let mx = 0;
    for (let i = 0; i < line.length; i++) { line[i] -= mean; mx = Math.max(mx, Math.abs(line[i])); }
    for (let i = 0; i < line.length; i++) line[i] /= mx || 1;
    const L = N; const d = new Float32Array(L); for (let i = 0; i < L; i++) d[i] = line[i];
    let w = 0, apX = 0, apY = 0, prev = 0;
    for (let i = 0; i < n; i++) {
      const cur = d[w];
      const avg = 0.5 * (cur + prev); prev = cur;          // passe-bas : moyenne de deux échantillons
      const ap = C * avg + apX - C * apY; apX = avg; apY = ap; // passe-tout : retard fractionnaire
      const out = ap * g;
      y[i] = cur;
      d[w] = out; w = (w + 1) % L;
    }
    // attaque : un léger fondu évite le clic ; fin : fondu pour la coupure
    const fi = Math.round(sr * 0.002), fo = Math.round(sr * 0.08);
    for (let i = 0; i < fi; i++) y[i] *= i / fi;
    for (let i = 0; i < fo; i++) y[n - 1 - i] *= i / fo;
    if (ksCache.size > 400) ksCache.delete(ksCache.keys().next().value);
    ksCache.set(key, buf);
    return buf;
  }
  function playBuf(b, buf, gain = 0.3, when = 0, pan = 0, rate = 1) {
    if (!b) return null;
    const c = b.ctx, s = c.createBufferSource(), v = c.createGain();
    s.buffer = buf; s.playbackRate.value = rate; v.gain.value = gain;
    let node = v;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; v.connect(p); node = p; }
    s.connect(v); node.connect(b.input);
    s.start(Math.max(c.currentTime, when || 0));
    return { src: s, gain: v, stop(t = 0.06) { v.gain.setTargetAtTime(0.0001, c.currentTime, t); try { s.stop(c.currentTime + t * 8); } catch (e) { /* déjà arrêtée */ } } };
  }

  window.FKSON = { NOMS, mtof, ftom, nom, impulse, bus, ks, playBuf };
})();
