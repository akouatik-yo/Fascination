/* Fascinations — Le Mycélium · scène 2 : les ronds de sorcières (une prairie vue du ciel, en années accélérées) */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, layer, buf, scale } = window.FK;
  const M = (window.FK_MYCE = window.FK_MYCE || {});
  const fr = (x, d = 0) => x.toFixed(d).replace('.', ',');
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  // teinte de saison (multipliée sur l'herbe), mois par mois
  const SAISON = [[196, 206, 214], [200, 210, 212], [222, 236, 214], [236, 255, 222], [240, 255, 226], [250, 250, 214], [255, 240, 196], [255, 230, 182], [246, 232, 190], [236, 220, 176], [216, 206, 182], [198, 204, 210]];
  // réglages gardés d'une reconstruction à l'autre
  const cfg = { year: 8, speed: 25, auto: true, sous: false };

  M.ronds = function (env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    let quiet = true;
    const snd = () => !quiet && au && au.on;
    const V = () => env.view || { x0: 0, x1: W };
    const V0 = V(), VW = V0.x1 - V0.x0;
    // échelle : un drone assez haut pour voir des anneaux entiers. Le plus vieux (6 m environ au départ) tient
    // dans la hauteur utile en paysage et dans la largeur en portrait ; le bas de l'écran porte les boutons.
    const Y0 = V0.y0 || 0, YB = H * (H > W ? 0.83 : 0.86), PXM = clamp(Math.min(VW / 9, Math.max(120, YB - Y0) / 6.8), 34, 240);
    const BX = (u) => V0.x0 + VW * u, BY = (v) => Y0 + (YB - Y0) * v;
    const CS = W * H > 1.6e6 ? 5 : 4, GW = Math.ceil(W / CS), GH = Math.ceil(H / CS), NC = GW * GH;
    const F32 = () => new Float32Array(NC);
    const F = F32(), F2 = F32(), S = F32(), S0 = F32(), N = F32(), G = F32().fill(1), BARE = F32(), BLK = new Uint8Array(NC);
    const TH = 0.45; // en dessous de ce seuil de matière organique, le mycélium meurt de faim

    /* matière organique du sol : irrégulière, quelques zones plus riches ou plus pauvres */
    const blobs = [];
    for (let i = 0; i < 18; i++) blobs.push([rnd(W), rnd(H), rnd(2.2, 0.6) * PXM, rnd(0.22, -0.2)]);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const x = (gx + 0.5) * CS, y = (gy + 0.5) * CS;
      let s = 1 + rnd(0.06, -0.06);
      for (const b of blobs) { const dx = x - b[0], dy = y - b[1]; s += b[3] * Math.exp(-(dx * dx + dy * dy) / (b[2] * b[2])); }
      S[gy * GW + gx] = S0[gy * GW + gx] = s;
    }

    const SB = S0.slice();
    // vitesse nominale du front, en cases par an ; le front réel, freiné par l'épuisement du sol, avance à 82 % de la
    // vitesse de Fisher-KPP (mesuré en 1D) : on corrige, pour que « 25 cm par an » soit vrai à l'écran
    const cNom = () => ((cfg.speed / 100) * PXM) / CS / 0.82;
    const hmax = () => 0.2 / Math.max(1, cNom() / (2 * Math.sqrt(1 - TH)) * 1.7);

    /* l'herbe : une fois pour toutes, en haute résolution */
    const grass = layer(W, H);
    {
      const g = grass.g;
      g.fillStyle = '#4c8230'; g.fillRect(0, 0, W, H);
      // des taches de verts différents : herbe jeune (jaune-vert), trèfle (vert-bleu), herbe drue (sombre)
      const PATCH = ['126,164,58', '56,104,52', '44,84,30', '150,170,74', '70,120,44'];
      for (let i = 0; i < 90; i++) {
        const x = rnd(W), y = rnd(H), r = rnd(1.8, 0.4) * PXM, gr = g.createRadialGradient(x, y, 0, x, y, r);
        const c = PATCH[rint(PATCH.length)];
        gr.addColorStop(0, `rgba(${c},.4)`); gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      const COLS = ['rgba(120,168,70,.55)', 'rgba(88,134,52,.6)', 'rgba(60,100,38,.6)', 'rgba(150,186,92,.4)', 'rgba(40,74,28,.55)', 'rgba(170,190,110,.3)'];
      const L = clamp(PXM / 26, 3, 9);
      for (const col of COLS) {
        g.strokeStyle = col; g.lineWidth = Math.max(0.7, L * 0.16); g.lineCap = 'round'; g.beginPath();
        for (let i = 0; i < (W * H) / 60; i++) {
          const x = rnd(W), y = rnd(H), a = rnd(TAU), l = rnd(L, L * 0.4);
          g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        }
        g.stroke();
      }
      // de petites ombres entre les touffes : l'herbe a de l'épaisseur
      g.fillStyle = 'rgba(18,36,12,.28)';
      for (let i = 0; i < (W * H) / 260; i++) { const x = rnd(W), y = rnd(H); g.fillRect(x, y, rnd(2.2, 1), rnd(2.2, 1)); }
      // trèfle et pâquerettes
      for (let i = 0; i < (W * H) / 9000; i++) {
        const x = rnd(W), y = rnd(H), r = L * 0.45;
        g.fillStyle = 'rgba(70,120,50,.7)';
        for (let k = 0; k < 3; k++) { const a = (k * TAU) / 3 + rnd(0.3); g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r, 0, TAU); g.fill(); }
      }
      for (let i = 0; i < (W * H) / 4000; i++) {
        const x = rnd(W), y = rnd(H), r = L * 0.32;
        g.fillStyle = 'rgba(250,248,240,.85)';
        for (let k = 0; k < 8; k++) { const a = (k * TAU) / 8; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.45, 0, TAU); g.fill(); }
        g.fillStyle = '#f2c230'; g.beginPath(); g.arc(x, y, r * 0.45, 0, TAU); g.fill();
      }
    }
    const snow = layer(Math.ceil(W / 3), Math.ceil(H / 3));
    {
      const g = snow.g; g.fillStyle = 'rgba(244,247,250,.86)'; g.fillRect(0, 0, snow.w, snow.h);
      for (let i = 0; i < 24; i++) { const x = rnd(snow.w), y = rnd(snow.h), r = rnd(snow.w * 0.3, snow.w * 0.08), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(206,218,232,.22)'); gr.addColorStop(1, 'rgba(206,218,232,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let i = 0; i < (snow.w * snow.h) / 30; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.7)' : 'rgba(170,186,200,.35)'; g.fillRect(rnd(snow.w), rnd(snow.h), 1, 1); }
    }
    const deco = layer(W, H); // allées de gravier
    // trois calques de teinte : l'herbe drue en multiplication et le relief en lumière douce (la texture de l'herbe
    // reste visible au travers, au lieu d'un aplat flou), la paille et la terre nue par-dessus
    const tint = buf(GW, GH), tintM = buf(GW, GH), tintL = buf(GW, GH);
    const idx = (x, y) => { const gx = Math.floor(x / CS), gy = Math.floor(y / CS); return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? -1 : gy * GW + gx; };
    function disk(x, y, r, fn) {
      const R = Math.ceil(r / CS), cx = Math.floor(x / CS), cy = Math.floor(y / CS);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const gx = cx + dx, gy = cy + dy;
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
        const d = Math.hypot(dx, dy) / Math.max(1, R);
        if (d <= 1) fn(gy * GW + gx, d);
      }
    }

    /* le temps : T en années ; janvier = 0 */
    let T = 0, lastT = 0;
    const month = () => Math.floor((((T % 1) + 1) % 1) * 12);
    // croissance saisonnière : surtout au printemps et à l'automne humides (moyenne 1)
    const GROW = [0.25, 0.25, 0.7, 1.4, 1.6, 1.1, 0.7, 0.8, 1.5, 1.7, 1.2, 0.45];
    let drought = 0.8, rain = 0, rainT = 0, snowA = 0, snowy = false, lastYear = -1, nextSpore = rnd(4, 2);
    const spores = []; // pour le tableau : où et quand chaque rond est né
    const shrooms = [];
    let front = []; // cases du front (pour faire sortir les champignons)

    function seed(x, y, quietly) {
      const i = idx(x, y); if (i < 0 || BLK[i] || S[i] < TH + 0.1) return false;
      disk(x, y, CS * 1.6, (j) => { if (!BLK[j]) F[j] = Math.max(F[j], 0.5); });
      spores.push({ x, y, t0: T });
      if (!quietly && snd()) au.pluck(scale(rint(5) + 3, 220), 2.2, 0.05);
      return true;
    }

    function step(h) {
      const m = month(), sf = GROW[m];
      // vitesse du front (Fisher-KPP) : c = 2·√(D·r·(S−seuil)) ; on prend D = r (en cases) pour un front de quelques cases
      const c = cNom(), r = (c / (2 * Math.sqrt(1 - TH))) * sf, D = r;
      // la digestion suit la même horloge que la croissance : le profil du front (et les champignons, qui sortent là où
      // le mycélium est dense) ne dépend plus de l'échelle de l'écran ; c = 10 cases par an était le réglage d'origine
      const kap = 2.2 * Math.max(0.4, sf) * (c / 10), regen = 0.035;
      for (let gy = 0; gy < GH; gy++) {
        const o = gy * GW;
        for (let gx = 0; gx < GW; gx++) {
          const i = o + gx;
          if (BLK[i]) { F2[i] = 0; continue; }
          const f = F[i];
          const l = gx > 0 ? F[i - 1] : f, rr = gx < GW - 1 ? F[i + 1] : f, u = gy > 0 ? F[i - GW] : f, d = gy < GH - 1 ? F[i + GW] : f;
          const lap = l + rr + u + d - 4 * f;
          if (f < 1e-4 && lap < 1e-4) { F2[i] = 0; continue; }
          const s = S[i];
          // au-dessus du seuil, croissance logistique ; en dessous, le mycélium meurt de faim
          const reac = s > TH ? r * f * (s - TH) * (1 - f) : 3 * r * f * (s - TH);
          let nf = f + h * (D * lap + reac);
          if (nf < 2e-4) nf = 0;
          F2[i] = nf > 1 ? 1 : nf;
          // il digère la matière organique et libère de l'azote
          const eat = kap * f * s * h;
          S[i] = s - eat;
          N[i] += eat * 1.6;
        }
      }
      F.set(F2);
      const dry = m >= 5 && m <= 8 ? drought * (m === 6 || m === 7 ? 1 : 0.5) : 0;
      const nd = Math.exp(-h / 1.3), gRec = (m >= 2 && m <= 9 ? 1.4 : 0.25) * h;
      for (let i = 0; i < NC; i++) {
        if (BLK[i]) continue;
        S[i] += (S0[i] - S[i]) * regen * h;
        N[i] *= nd;
        // le feutrage de mycélium rend le sol imperméable : l'été sec, l'herbe jaunit au-dessus
        const f = F[i];
        G[i] += gRec * (1 - G[i]) * (1 - BARE[i] * 0.7) - h * G[i] * f * dry * 9;
        if (G[i] < 0) G[i] = 0;
        if (BARE[i] > 0) BARE[i] = Math.max(0, BARE[i] - h * 0.9);
      }
      T += h;
    }

    function flush(h) {
      // les champignons sortent sur l'anneau, après une pluie, surtout à l'automne (un peu à la fin du printemps)
      const m = month(), mf = m >= 7 && m <= 10 ? 1 : m === 5 || m === 6 ? 0.25 : 0;
      if (!rain || !mf || !front.length || snowA > 0.3) return;
      const n = front.length * h * 0.7 * rain * mf;
      let k = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
      while (k-- > 0 && shrooms.length < 2400) {
        const i = front[rint(front.length)], x = ((i % GW) + Math.random()) * CS, y = (((i / GW) | 0) + Math.random()) * CS;
        const nb = 1 + rint(2);
        for (let q = 0; q < nb; q++) {
          shrooms.push({ x: x + rnd(6, -6), y: y + rnd(6, -6), r: Math.max(1.3, rnd(2.5, 1.1) * 0.01 * PXM * 2.5), t0: T, life: Math.max(0.06, 1.2 / cfg.year) * rnd(1.3, 0.8), hue: rnd(1) });
        }
        if (snd() && Math.random() < 0.08) au.note(rnd(2400, 1600), 0.04, 'sine', 0.012);
      }
    }

    let diam = 0; // diamètre mesuré du plus vieux rond, en mètres (0 : pas mesurable)
    function scanFront() {
      front = [];
      for (let i = 0; i < NC; i++) if (F[i] > 0.4 && S[i] > TH * 0.8) front.push(i);
      // on mesure le vrai front plutôt que la formule (le démarrage et la courbure le retardent) : la crête du mycélium,
      // là où sortent les champignons (pas sa traîne affamée, à l'intérieur), médiane de 16 rayons
      diam = 0;
      const sp = spores[0];
      if (!sp) return;
      const hits = [];
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU, ca = Math.cos(a), sa = Math.sin(a);
        let best = 0, bd = 0;
        for (let d = CS; d < W + H; d += CS) {
          const i = idx(sp.x + ca * d, sp.y + sa * d);
          if (i < 0 || BLK[i]) { bd = 0; break; }
          if (F[i] > best) { best = F[i]; bd = d; } else if (best > 0.3 && F[i] < best * 0.5) break;
        }
        if (best > 0.3 && bd) hits.push(bd);
      }
      if (hits.length >= 6) { hits.sort((p, q) => p - q); diam = (2 * hits[hits.length >> 1]) / PXM; }
    }

    function paintTint() {
      const d = tint.d;
      if (cfg.sous) {
        for (let i = 0; i < NC; i++) {
          const o = i * 4, f = F[i], s = clamp(S[i], 0, 2);
          if (BLK[i]) { d[o] = 120; d[o + 1] = 118; d[o + 2] = 112; d[o + 3] = 255; continue; }
          const live = clamp(f * (S[i] - TH) * 3, 0, 1);
          // sol : plus sombre là où il ne reste plus de matière organique ; mycélium blanc, front doré
          let R = 28 + s * 34, Gc = 20 + s * 22, B = 14 + s * 12;
          R += (236 - R) * f * 0.9; Gc += (230 - Gc) * f * 0.9; B += (214 - B) * f * 0.9;
          R += (255 - R) * live * 0.6; Gc += (200 - Gc) * live * 0.6; B += (90 - B) * live * 0.6;
          d[o] = R; d[o + 1] = Gc; d[o + 2] = B; d[o + 3] = 255;
        }
      } else {
        const dm = tintM.d, dl = tintL.d;
        for (let i = 0; i < NC; i++) {
          const o = i * 4;
          if (BLK[i]) { d[o + 3] = 0; dm[o] = dm[o + 1] = dm[o + 2] = 255; dl[o + 3] = 0; continue; }
          // vert sombre : l'azote libéré, une herbe plus drue (multipliée sur l'herbe, donc texturée)
          const n = clamp((N[i] - 0.03) * 1.9, 0, 1);
          dm[o] = 255 - n * 150; dm[o + 1] = 255 - n * 92; dm[o + 2] = 255 - n * 165;
          // cette herbe est plus haute : le côté tourné vers le soleil (en haut à gauche, comme l'ombre des champignons)
          // s'éclaire, l'autre s'assombrit
          const gx = (N[i + 2] || 0) - (N[i - 2] || 0), gy = (N[i + 2 * GW] || 0) - (N[i - 2 * GW] || 0), sh = clamp((gx + gy) * 2.6, -1, 1);
          if (sh > 0) { dl[o] = 255; dl[o + 1] = 246; dl[o + 2] = 200; dl[o + 3] = sh * 200; } else { dl[o] = dl[o + 1] = dl[o + 2] = 0; dl[o + 3] = -sh * 210; }
          // paille : l'herbe desséchée ; brun : terre nue ou tas de feuilles
          let r = 0, g = 0, b = 0, a = 0;
          const add = (cr, cg, cb, ca) => { if (ca <= 0) return; const na = ca + a * (1 - ca); r = (cr * ca + r * a * (1 - ca)) / na; g = (cg * ca + g * a * (1 - ca)) / na; b = (cb * ca + b * a * (1 - ca)) / na; a = na; };
          add(204, 180, 112, (1 - G[i]) * 0.88);
          add(92, 66, 42, BARE[i] * 0.95);
          const ex = S[i] - S0[i] - 0.15; if (ex > 0) add(78, 52, 30, Math.min(0.85, ex * 0.8));
          d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a * 255;
        }
        tintM.flush(); tintL.flush();
      }
      tint.flush();
    }

    /* un dispositif de départ : une allée de gravier et quatre ronds d'âges différents */
    function gravel(x, y, r) {
      disk(x, y, r, (j) => { BLK[j] = 1; F[j] = 0; S[j] = 0; S0[j] = 0; });
      const g = deco.g;
      g.fillStyle = 'rgba(150,140,124,.9)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      for (let k = 0; k < r * 1.4; k++) {
        const a = rnd(TAU), dd = Math.sqrt(Math.random()) * r, s = rnd(2.4, 0.8);
        g.fillStyle = ['#cfc6b4', '#8e8574', '#b2a894', '#6f685c'][rint(4)];
        g.beginPath(); g.ellipse(x + Math.cos(a) * dd, y + Math.sin(a) * dd, s, s * 0.7, rnd(TAU), 0, TAU); g.fill();
      }
    }
    let lastG = null;
    function pathTo(x, y) {
      const a = lastG || { x, y }, d = Math.hypot(x - a.x, y - a.y), n = Math.max(1, Math.ceil(d / 4)), r = 0.2 * PXM;
      for (let k = 0; k <= n; k++) gravel(a.x + ((x - a.x) * k) / n, a.y + ((y - a.y) * k) / n, r);
      lastG = { x, y };
    }
    {
      const P = [];
      for (let k = 0; k <= 40; k++) { const u = k / 40; P.push([V0.x0 + VW * (0.52 + 0.5 * u) + Math.sin(u * 5) * PXM * 0.4, H * (1.05 - 0.75 * u)]); }
      lastG = null; for (const [x, y] of P) pathTo(x, y); lastG = null;
      // [année, position dans la zone libre] : des anneaux entiers d'âges différents, deux près de se rencontrer
      const plan = H > W
        ? [[0, 0.42, 0.36], [4, 0.62, 0.86], [7, 0.18, 0.66], [9, 0.84, 0.1], [10.5, 0.18, 0.06]]
        : [[0, 0.34, 0.52], [4, 0.74, 0.34], [7, 0.62, 0.86], [9, 0.08, 0.14], [10.5, 0.1, 0.84]];
      let pi = 0;
      while (T < 12.7) {
        while (pi < plan.length && T >= plan[pi][0]) { seed(BX(plan[pi][1]), BY(plan[pi][2]), true); pi++; }
        step(Math.min(0.02, hmax()));
      }
      drought = 1;
      // on arrive un matin de septembre, juste après une pluie : les champignons sont sortis sur les anneaux
      scanFront(); rain = 1; for (let k = 0; k < 8; k++) flush(0.01); rain = 0;
      for (const s of shrooms) s.t0 -= rnd(0.45) * s.life;
      paintTint();
    }
    quiet = false;
    if (window.FASC_DEBUG) window.FASC_DEBUG.ronds = { cfg, PXM, get T() { return T; }, get front() { return front.length; }, get shrooms() { return shrooms; }, get diam() { return diam; }, get spores() { return spores; }, probe(x, y) { const i = idx(x, y); return i < 0 ? null : [F[i], S[i], N[i]]; } };
    const drones = [];
    if (au) drones.push(au.drone(98, 'sine', 0.012), au.drone(147, 'sine', 0.006));

    function hud() {
      const v = V(), x0 = v.x0 + 16;
      ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace';
      const line = (txt, y, strong) => { const w = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(10,14,8,.62)'; ctx.fillRect(x0 - 6, y - 13, w + 12, 18); ctx.fillStyle = strong ? 'rgba(236,246,200,.96)' : 'rgba(230,236,220,.85)'; ctx.fillText(txt, x0, y); };
      const yr = Math.floor(T), m = month();
      // les lignes passent à la ligne aux « · » sur un écran étroit (la deuxième était coupée en 390 px)
      const old = spores.length ? T - spores[0].t0 : 0, maxW = v.x1 - v.x0 - 40;
      const wrap = (t) => { const out = []; let cur = ''; for (const part of t.split(' · ')) { const nx = cur ? cur + ' · ' + part : part; if (cur && ctx.measureText(nx).width > maxW) { out.push(cur); cur = part; } else cur = nx; } if (cur) out.push(cur); return out; };
      const L1 = wrap(`ANNÉE ${yr} · ${MOIS[m].toUpperCase()}${rain ? ' · PLUIE' : ''}${m >= 5 && m <= 8 && drought > 1.1 ? ' · ÉTÉ SEC' : ''}`);
      const L2 = wrap(`${spores.length} SPORES GERMÉES · LE PLUS VIEUX ROND A ${Math.floor(old)} ANS${diam ? ` ET ${fr(diam, 1)} M DE DIAMÈTRE` : ''}`);
      let y = H - 18 - (L1.length + L2.length) * 20;
      for (const t of L1) { line(t, y, true); y += 20; }
      for (const t of L2) { line(t, y); y += 20; }
      // échelle
      ctx.fillStyle = 'rgba(10,14,8,.62)'; ctx.fillRect(x0 - 6, y - 12, PXM + 50, 16);
      ctx.strokeStyle = 'rgba(236,246,200,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y - 7); ctx.lineTo(x0, y - 2); ctx.lineTo(x0 + PXM, y - 2); ctx.lineTo(x0 + PXM, y - 7); ctx.stroke();
      ctx.fillStyle = 'rgba(236,246,200,.9)'; ctx.fillText('1 m', x0 + PXM + 8, y);
      ctx.restore();
    }

    function drawShrooms() {
      const sh = 'rgba(20,30,10,.35)';
      for (let k = shrooms.length - 1; k >= 0; k--) {
        const s = shrooms[k], age = (T - s.t0) / s.life;
        if (age > 1) { shrooms.splice(k, 1); continue; }
      }
      ctx.fillStyle = sh;
      ctx.beginPath();
      for (const s of shrooms) { const age = (T - s.t0) / s.life, z = s.r * Math.min(1, age * 4); ctx.moveTo(s.x + z * 1.3 + z * 1.5, s.y + z * 1.0); ctx.ellipse(s.x + z * 1.3, s.y + z * 1.0, z * 1.5, z * 0.75, 0.6, 0, TAU); }
      ctx.fill();
      for (const s of shrooms) {
        const age = (T - s.t0) / s.life, z = s.r * Math.min(1, age * 4), old = clamp((age - 0.6) / 0.4, 0, 1);
        if (z < 0.6) continue;
        // faux mousseron : chapeau chamois, mamelon plus sombre ; il brunit et se ratatine en vieillissant
        const c1 = [240 - old * 70, 222 - old * 80, 186 - old * 90], c2 = [196 - old * 60, 150 - old * 60, 100 - old * 50];
        const gr = ctx.createRadialGradient(s.x - z * 0.3, s.y - z * 0.35, z * 0.1, s.x, s.y, z);
        gr.addColorStop(0, `rgb(${c2[0] | 0},${c2[1] | 0},${c2[2] | 0})`); gr.addColorStop(0.35, `rgb(${c1[0] | 0},${c1[1] | 0},${c1[2] | 0})`); gr.addColorStop(1, `rgb(${(c1[0] * 0.85) | 0},${(c1[1] * 0.85) | 0},${(c1[2] * 0.85) | 0})`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(s.x, s.y, z * (1 - old * 0.25), 0, TAU); ctx.fill();
      }
    }

    let tintT = 0, frontT = 0;
    const drops = [];
    return {
      frame(t, dt) {
        dt = Math.min(dt, 0.1);
        const yrs = dt / cfg.year;
        let left = yrs;
        const hm = hmax();
        while (left > 1e-9) { const h = Math.min(hm, left); step(h); flush(h); left -= h; }
        // météo : pluies plus fréquentes à l'automne ; neige certains hivers
        const m = month();
        if (Math.floor(T) !== lastYear) { lastYear = Math.floor(T); drought = rnd(1.5, 0.4); snowy = Math.random() < 0.55; }
        if (rainT > 0) { rainT -= yrs; rain = 1; if (rainT <= 0) rain = 0; }
        else if (Math.random() < yrs * (m >= 8 && m <= 10 ? 26 : m === 5 ? 8 : m >= 6 && m <= 7 ? 2 : 6)) { rainT = rnd(0.035, 0.015); }
        const wantSnow = snowy && (m === 0 || m === 1 || m === 11) ? 1 : 0;
        snowA += (wantSnow - snowA) * Math.min(1, yrs * 30);
        if (cfg.auto && (nextSpore -= yrs) <= 0) {
          nextSpore = rnd(5, 2.5);
          for (let k = 0; k < 30; k++) { const v = V(); if (seed(rnd(v.x1 - 30, v.x0 + 30), rnd(H - 30, (v.y0 || 0) + 30))) break; }
        }
        if ((frontT -= dt) <= 0) { frontT = 0.25; scanFront(); }
        if ((tintT -= dt) <= 0) { tintT = 0.08; paintTint(); }
        if (snd() && rain && Math.random() < dt * 6) au.noise(0.5, 0.012, rnd(4200, 2600), 0.6, 'bandpass');

        /* rendu */
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.imageSmoothingEnabled = true;
        if (cfg.sous) {
          ctx.drawImage(tint.c, 0, 0, GW * CS, GH * CS);
        } else {
          ctx.drawImage(grass.c, 0, 0);
          // la saison, multipliée sur l'herbe
          const ph = (((T % 1) + 1) % 1) * 12, m0 = Math.floor(ph) % 12, m1 = (m0 + 1) % 12, u = ph - Math.floor(ph);
          const sc = [0, 1, 2].map((k) => Math.round(255 - (255 - (SAISON[m0][k] * (1 - u) + SAISON[m1][k] * u)) * 0.55));
          ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${sc[0]},${sc[1]},${sc[2]})`; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(tintM.c, 0, 0, GW * CS, GH * CS);
          ctx.globalCompositeOperation = 'soft-light'; ctx.drawImage(tintL.c, 0, 0, GW * CS, GH * CS);
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(tint.c, 0, 0, GW * CS, GH * CS);
        }
        ctx.drawImage(deco.c, 0, 0);
        if (!cfg.sous) {
          drawShrooms();
          // une lumière de fin de journée, comme sur une photo de drone : chaude d'un côté, plus fraîche de l'autre
          // (atténuée sous la pluie), et un léger assombrissement des bords
          {
            const k = rain ? 0.45 : 1, lg = ctx.createLinearGradient(0, 0, W, H);
            lg.addColorStop(0, `rgba(255,214,140,${(0.34 * k).toFixed(3)})`); lg.addColorStop(0.55, 'rgba(128,128,128,0)'); lg.addColorStop(1, `rgba(40,70,120,${(0.3 * k).toFixed(3)})`);
            ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
            const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
            vg.addColorStop(0, 'rgba(10,20,8,0)'); vg.addColorStop(1, 'rgba(10,20,8,.28)');
            ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
          }
          if (snowA > 0.02) { ctx.globalAlpha = snowA * 0.72; ctx.drawImage(snow.c, 0, 0, W, H); ctx.globalAlpha = 1; }
          if (rain) {
            ctx.fillStyle = 'rgba(10,18,30,.1)'; ctx.fillRect(0, 0, W, H);   // la pluie assombrit un peu, sans voiler de gris
            ctx.strokeStyle = 'rgba(210,225,240,.35)'; ctx.lineWidth = 1; ctx.beginPath();
            for (let k = 0; k < (W * H) / 5000; k++) { const x = rnd(W + 80), y = rnd(H); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 22); }
            ctx.stroke();
          }
        } else {
          ctx.globalAlpha = 0.5; drawShrooms(); ctx.globalAlpha = 1;
        }
        for (let k = drops.length - 1; k >= 0; k--) {
          const q = drops[k]; q.t += dt; if (q.t > 1.4) { drops.splice(k, 1); continue; }
          ctx.strokeStyle = `rgba(255,250,220,${(0.6 * (1 - q.t / 1.4)).toFixed(3)})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(q.x, q.y, 6 + q.t * 40, 0, TAU); ctx.stroke();
        }
        hud();
      },
      down(p) {
        this._d = 0;
        const tool = env.tool;
        if (tool === 'semer') { if (seed(p.x, p.y)) drops.push({ x: p.x, y: p.y, t: 0 }); return; }
        if (tool === 'nourrir') { this.heap(p.x, p.y); return; }
        if (tool === 'tracer') { lastG = null; pathTo(p.x, p.y); if (snd()) au.noise(0.2, 0.03, 1600, 0.7, 'bandpass'); return; }
        if (tool === 'gratter') { this.dig(p.x, p.y); return; }
        if (tool === 'arroser') { rainT = 0.05; rain = 1; return; }
      },
      move(p) {
        if (!p.down) return;
        this._d = (this._d || 0) + Math.hypot(p.dx, p.dy);
        const tool = env.tool;
        if (tool === 'tracer') { if (this._d > 3) { this._d = 0; pathTo(p.x, p.y); } }
        else if (tool === 'gratter') { if (this._d > 6) { this._d = 0; this.dig(p.x, p.y); } }
        else if (tool === 'nourrir') { if (this._d > 20) { this._d = 0; this.heap(p.x, p.y); } }
      },
      up() { lastG = null; },
      heap(x, y) { disk(x, y, 0.35 * PXM, (j, d) => { if (!BLK[j]) S[j] = Math.min(3, S[j] + 1.4 * (1 - d * d)); }); if (snd()) au.noise(0.3, 0.03, 700, 0.8, 'bandpass'); },
      dig(x, y) { disk(x, y, 0.28 * PXM, (j) => { if (!BLK[j]) { F[j] = 0; G[j] = 0; BARE[j] = 1; N[j] = 0; } }); if (snd() && Math.random() < 0.4) au.noise(0.15, 0.03, 900, 0.8, 'bandpass'); },
      clear() {
        F.fill(0); N.fill(0); G.fill(1); BARE.fill(0); BLK.fill(0); S0.set(SB); S.set(S0);
        deco.g.clearRect(0, 0, W, H); shrooms.length = 0; spores.length = 0; front = [];
        paintTint();
      },
      dispose() { drones.forEach((d) => d.stop()); },
      ui() {
        const L = [{ type: 'section', label: 'Les ronds de sorcières' }];
        L.push({ type: 'slider', label: 'Durée d’une année', min: 3, max: 30, step: 1, value: cfg.year, fmt: (v) => v + ' s', set: (v) => { cfg.year = v; } });
        L.push({ type: 'slider', label: 'Avancée du front', min: 5, max: 60, step: 1, value: cfg.speed, fmt: (v) => v + ' cm par an', set: (v) => { cfg.speed = v; } });
        L.push({ type: 'toggle', label: 'Des spores apportées par le vent', value: cfg.auto, set: (v) => { cfg.auto = v; } });
        L.push({ type: 'toggle', label: 'Voir sous la surface', value: cfg.sous, set: (v) => { cfg.sous = v; paintTint(); } });
        L.push({ type: 'buttons', items: [{ label: 'Une averse', act: () => { rainT = 0.05; rain = 1; } }, { label: 'Une spore au hasard', act: () => { for (let k = 0; k < 30; k++) { const v = V(); if (seed(rnd(v.x1 - 30, v.x0 + 30), rnd(H - 30, (v.y0 || 0) + 30))) break; } } }] });
        L.push({ type: 'note', text: 'Ce que l’on voit, de l’intérieur vers l’extérieur d’un anneau : l’herbe redevenue normale (le sol est épuisé, le mycélium est mort), une bande vert sombre (l’azote libéré par la digestion), en été une bande jaunie (le feutrage de mycélium empêche l’eau d’entrer), puis le front lui-même. Les champignons sortent sur l’anneau après les pluies d’automne. Sous la surface : le mycélium en blanc, le front qui mange encore en doré, le sol épuisé en sombre.' });
        L.push({ type: 'note', text: 'Essayez : une allée de gravier (TRACER) coupe l’anneau en arcs ; un tas de feuilles (NOURRIR) l’accélère et l’attire ; deux anneaux qui se rencontrent s’arrêtent net. Les champignons sont dessinés environ 2,5 fois plus grands que nature (davantage sur un petit écran), sinon on ne les verrait pas d’aussi haut.' });
        return L;
      },
    };
  };
})();
