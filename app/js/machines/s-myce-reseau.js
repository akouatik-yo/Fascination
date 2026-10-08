/* Fascinations — Le Mycélium · scène 3 : le réseau souterrain (mycorhizes : sucre contre minéraux) */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, layer, scale } = window.FK;
  const M = (window.FK_MYCE = window.FK_MYCE || {});
  const fr = (x, d = 0) => x.toFixed(d).replace('.', ',');
  const cfg = { share: false, day: 50, cycle: true };
  const KIND = {
    bouleau: { nom: 'Bouleau', h: 0.32, col: [148, 196, 84] },
    douglas: { nom: 'Douglas', h: 0.4, col: [46, 104, 70] },
    jeune: { nom: 'Jeune douglas', h: 0.4, col: [56, 118, 78] },
    hetre: { nom: 'Jeune hêtre', h: 0.3, col: [104, 160, 70] },
  };
  function glow(c) {
    const s = layer(32, 32), g = s.g, gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(0.25, `rgba(${c},.55)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return s.c;
  }

  M.reseau = function (env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    let quiet = true;
    const snd = () => !quiet && au && au.on;
    const V = () => env.view || { x0: 0, x1: W };
    const V0 = V(), VX = V0.x0, VW = V0.x1 - V0.x0;
    const GY = Math.round(H * 0.42); // la surface du sol
    const kS = clamp(Math.min(VW, H) / 700, 0.7, 1.6);
    const SUG = glow('255,200,90'), MIN = glow('110,220,255'), SHR = glow('255,140,200');

    /* ─ décor : le sol ─ */
    const soil = layer(W, H);
    const patches = [];
    {
      const g = soil.g, gr = g.createLinearGradient(0, GY, 0, H);
      gr.addColorStop(0, '#2a1c12'); gr.addColorStop(0.06, '#3b291b'); gr.addColorStop(0.35, '#4a3423'); gr.addColorStop(1, '#5a4430');
      g.fillStyle = gr; g.fillRect(0, GY, W, H - GY);
      for (let i = 0; i < (W * (H - GY)) / 40; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,220,180,.05)'; g.fillRect(rnd(W), rnd(H, GY), rnd(2, 1), rnd(2, 1)); }
      for (let i = 0; i < (W * (H - GY)) / 9000; i++) {
        const x = rnd(W), y = rnd(H, GY + 20), r = rnd(9, 3) * kS;
        g.fillStyle = `rgba(${rint(40) + 110},${rint(30) + 96},${rint(30) + 80},.75)`; g.beginPath(); g.ellipse(x, y, r, r * rnd(0.8, 0.5), rnd(TAU), 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.25, 0, 0, TAU); g.fill();
      }
      // des poches de phosphate et d'azote, plus loin et plus profond que les racines
      const PP = [[0.04, 0.82], [0.36, 0.9], [0.66, 0.66], [0.97, 0.86], [0.5, 0.56], [0.18, 0.58]];
      for (const [fx, fy] of PP) {
        const x = VX + VW * fx + rnd(20, -20), y = GY + (H - GY) * fy, r = 34 * kS;
        patches.push({ x, y, r, q: 1 });
        const pg = g.createRadialGradient(x, y, 0, x, y, r * 1.6);
        pg.addColorStop(0, 'rgba(120,190,210,.22)'); pg.addColorStop(1, 'rgba(120,190,210,0)');
        g.fillStyle = pg; g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
        for (let k = 0; k < 70; k++) { const a = rnd(TAU), d = Math.sqrt(Math.random()) * r; g.fillStyle = Math.random() < 0.5 ? 'rgba(200,240,250,.8)' : 'rgba(120,200,220,.6)'; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, rnd(2.5, 1), rnd(2.5, 1)); }
      }
      // litière en surface
      g.fillStyle = '#3a2a1a'; g.fillRect(0, GY - 2, W, 6);
      for (let i = 0; i < W / 3; i++) { g.fillStyle = ['#7a5a2a', '#a07432', '#5e4a24', '#4f6a2a'][rint(4)]; g.beginPath(); g.ellipse(rnd(W), GY + rnd(3, -2), rnd(5, 2), rnd(2, 1), rnd(TAU), 0, TAU); g.fill(); }
    }

    /* ─ les arbres ─ */
    const trees = [];
    function crownCanvas(kind, hpx, sick) {
      const w = Math.ceil(hpx * (kind === 'douglas' || kind === 'jeune' ? 0.62 : 0.85)), h = Math.ceil(hpx * 1.02), L = layer(w, h), g = L.g, cx = w / 2;
      const K = KIND[kind], col = sick ? [168, 150, 70] : K.col;
      const sh = (c, k) => `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
      if (kind === 'douglas' || kind === 'jeune') {
        g.fillStyle = '#5a3420'; g.fillRect(cx - hpx * 0.018, h * 0.1, hpx * 0.036, h * 0.9);
        const tiers = kind === 'douglas' ? 11 : 7;
        for (let i = 0; i < tiers; i++) {
          const u = i / (tiers - 1), y = h * (0.04 + 0.78 * u), half = w * (0.08 + 0.42 * u);
          g.fillStyle = sh(col, 0.7 + 0.3 * Math.sin(i * 1.7) * 0.5 + 0.15);
          g.beginPath(); g.moveTo(cx, y - h * 0.06);
          const n = 7;
          for (let k = 0; k <= n; k++) { const t = k / n, x = cx - half + 2 * half * t; g.lineTo(x, y + h * 0.07 + Math.sin(t * Math.PI) * h * 0.02 + (k % 2 ? h * 0.02 : 0)); }
          g.closePath(); g.fill();
        }
      } else {
        g.strokeStyle = kind === 'bouleau' ? '#ece8de' : '#7d746a'; g.lineCap = 'round';
        g.lineWidth = hpx * 0.035; g.beginPath(); g.moveTo(cx, h); g.lineTo(cx, h * 0.3); g.stroke();
        if (kind === 'bouleau') { g.fillStyle = '#222'; for (let i = 0; i < 12; i++) g.fillRect(cx - hpx * 0.017 + rnd(hpx * 0.01), h * rnd(0.98, 0.35), rnd(hpx * 0.02, hpx * 0.008), 1.5); }
        for (let i = 0; i < 26; i++) {
          const a = rnd(TAU), d = Math.sqrt(Math.random()), x = cx + Math.cos(a) * d * w * 0.38, y = h * 0.34 + Math.sin(a) * d * h * 0.28, r = rnd(0.16, 0.09) * hpx;
          g.fillStyle = sh(col, rnd(1.1, 0.7)); g.globalAlpha = 0.85; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        for (let i = 0; i < hpx * 3; i++) { const a = rnd(TAU), d = Math.sqrt(Math.random()), x = cx + Math.cos(a) * d * w * 0.45, y = h * 0.34 + Math.sin(a) * d * h * 0.32; g.fillStyle = sh(col, rnd(1.3, 0.6)); g.fillRect(x, y, 2, 2); }
      }
      return L.c;
    }
    function growRoots(t) {
      // racines : quelques pivots qui se ramifient ; chaque extrémité est une pointe colonisée par le champignon
      t.paths = []; t.segs = [];
      const sz = t.s, maxD = (H - GY) * (0.2 + 0.28 * sz), spread = VW * (0.06 + 0.11 * sz);
      const rec = (pts, x, y, a, len, w, depth) => {
        const n = 5; let px = x, py = y;
        const P = pts.slice();
        for (let k = 0; k < n; k++) {
          a += rnd(0.35, -0.35); a = clamp(a, 0.05, Math.PI - 0.05);
          const nx = px + Math.cos(a) * (len / n), ny = Math.min(H - 12, py + Math.sin(a) * (len / n));
          t.segs.push([px, py, nx, ny, w * (1 - (0.5 * k) / n)]);
          px = nx; py = ny; P.push([px, py]);
        }
        if (depth > 0) { const nb = 2; for (let b = 0; b < nb; b++) rec(P, px, py, a + rnd(0.9, -0.9), len * rnd(0.75, 0.55), w * 0.6, depth - 1); }
        else t.paths.push(P);
      };
      const nm = sz > 0.6 ? 4 : 2;
      for (let i = 0; i < nm; i++) {
        const a = Math.PI / 2 + ((i + 0.5) / nm - 0.5) * 2.2 + rnd(0.2, -0.2);
        rec([[t.x, GY]], t.x, GY, a, Math.min(maxD, spread) * rnd(0.6, 0.38), 7 * kS * sz + 1.5, sz > 0.6 ? 2 : 1);
      }
    }
    function mkTree(kind, fx, s) {
      const K = KIND[kind], hpx = H * K.h * (kind === 'jeune' ? 1 : 1);
      const t = { kind, nom: K.nom, x: VX + VW * fx, s, hpx, shade: false, fert: 0, vig: 1, P: 0, Pav: 0.5 * s * s, pay: 0, payAv: 0, rec: 0, recAv: 0, shIn: 0, shOut: 0, inAv: 0, outAv: 0, rc: 1, rm: 1, tips: [] };
      t.crown = crownCanvas(kind, hpx, false); t.sick = crownCanvas(kind, hpx, true);
      growRoots(t);
      trees.push(t);
      return t;
    }
    mkTree('bouleau', 0.2, 1); mkTree('douglas', 0.52, 1); mkTree('jeune', 0.78, 0.36);
    trees[2].under = trees[1]; // le jeune pousse à l'ombre du grand

    /* ─ le réseau d'hyphes : un graphe ─ */
    let nodes = [], edges = [];
    const adj = () => { for (const n of nodes) n.e = []; for (const e of edges) if (!e.cut) { nodes[e.a].e.push(e); nodes[e.b].e.push(e); } };
    function bez(e) {
      const A = nodes[e.a], B = nodes[e.b], dx = B.x - A.x, dy = B.y - A.y, P = [];
      const c1x = A.x + dx / 3 + e.ox, c1y = A.y + dy / 3 + e.oy, c2x = A.x + (2 * dx) / 3 - e.ox2, c2y = A.y + (2 * dy) / 3 - e.oy2;
      for (let k = 0; k <= 10; k++) { const t = k / 10, u = 1 - t; P.push([u * u * u * A.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * B.x, u * u * u * A.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * B.y]); }
      e.pts = P; e.len = 0; for (let k = 1; k < P.length; k++) e.len += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
    }
    function link(a, b) {
      if (a === b || edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) return;
      const A = nodes[a], B = nodes[b], L = Math.hypot(B.x - A.x, B.y - A.y), nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L, o = rnd(0.28, -0.28) * L, o2 = rnd(0.28, -0.28) * L;
      const e = { a, b, ox: nx * o, oy: ny * o, ox2: nx * o2, oy2: ny * o2, tr: 0, cut: false, grow: 1, re: 0 };
      bez(e); edges.push(e);
    }
    function buildNet() {
      nodes = []; edges = [];
      for (const t of trees) { t.tips = []; for (const P of t.paths) { const q = P[P.length - 1]; t.tips.push(nodes.length); nodes.push({ x: q[0], y: q[1], tree: t, path: P }); } }
      for (const p of patches) { p.node = nodes.length; nodes.push({ x: p.x, y: p.y, patch: p }); }
      const nH = Math.round(46 * clamp((VW * (H - GY)) / 400000, 0.6, 1.6));
      for (let k = 0, tries = 0; k < nH && tries < 2000; tries++) {
        const x = rnd(V0.x1 - 10, VX + 10), y = rnd(H - 14, GY + 30);
        if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 42 * kS)) continue;
        nodes.push({ x, y }); k++;
      }
      const R = Math.max(VW, H) * 0.2;
      nodes.forEach((n, i) => {
        const near = nodes.map((m, j) => [j, Math.hypot(m.x - n.x, m.y - n.y)]).filter(([j, d]) => j !== i && d < R && !(n.tree && m_same(n, nodes[j]))).sort((p, q) => p[1] - q[1]);
        const k = n.patch ? 4 : 3;
        for (let q = 0; q < Math.min(k, near.length); q++) link(i, near[q][0]);
      });
      adj(); dirty = true; fuzz();
    }
    const m_same = (n, m) => m.tree && m.tree === n.tree;
    let dirty = true;
    const DT = new Map(); // distances au but (chaque arbre, et les poches de minéraux)
    function dijkstra(src) {
      const d = new Float64Array(nodes.length).fill(Infinity), done = new Uint8Array(nodes.length);
      for (const s of src) d[s] = 0;
      for (;;) {
        let u = -1, best = Infinity;
        for (let i = 0; i < nodes.length; i++) if (!done[i] && d[i] < best) { best = d[i]; u = i; }
        if (u < 0) break;
        done[u] = 1;
        for (const e of nodes[u].e) { if (e.grow < 0.6) continue; const v = e.a === u ? e.b : e.a, nd = d[u] + e.len; if (nd < d[v]) d[v] = nd; }
      }
      return d;
    }
    function routes() {
      if (!dirty) return;
      dirty = false; DT.clear();
      for (const t of trees) DT.set(t, dijkstra(t.tips));
      DT.set('P', dijkstra(patches.map((p) => p.node)));
    }
    // descendre le champ de distance jusqu'au but ; renvoie la liste des arêtes traversées
    function walk(from, d) {
      if (!isFinite(d[from])) return null;
      const out = []; let u = from, guard = 0;
      while (d[u] > 0 && guard++ < 80) {
        let be = null, bd = d[u];
        for (const e of nodes[u].e) { if (e.grow < 0.6) continue; const v = e.a === u ? e.b : e.a; const dv = d[v] + rnd(6, 0); if (dv < bd) { bd = dv; be = e; } }
        if (!be) return null;
        out.push([be, be.a === u]); u = be.a === u ? be.b : be.a;
      }
      return { edges: out, end: u };
    }

    /* fines hyphes autour du réseau (calque) */
    const fz = layer(W, H);
    function fuzz() {
      const g = fz.g; g.clearRect(0, 0, W, H);
      g.strokeStyle = 'rgba(240,232,214,.07)'; g.lineWidth = 0.6; g.beginPath();
      for (const e of edges) {
        if (e.cut) continue;
        for (let k = 0; k < 5; k++) {
          const P = e.pts, i = rint(P.length - 1), x = P[i][0] + rnd(8, -8), y = P[i][1] + rnd(8, -8);
          g.moveTo(x, y); let a = rnd(TAU), px = x, py = y;
          for (let q = 0; q < 4; q++) { a += rnd(0.8, -0.8); px += Math.cos(a) * 7; py += Math.sin(a) * 7; g.lineTo(px, py); }
        }
      }
      g.stroke();
      // le manteau fongique autour des pointes de racines
      for (const n of nodes) if (n.tree) { const r = 5 * kS; const gr = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.2); gr.addColorStop(0, 'rgba(250,244,230,.7)'); gr.addColorStop(1, 'rgba(250,244,230,0)'); g.fillStyle = gr; g.fillRect(n.x - r * 3, n.y - r * 3, r * 6, r * 6); }
    }
    buildNet();

    /* ─ les flux ─ */
    const parts = [];
    const pathLen = (P) => { let L = 0; for (let k = 1; k < P.length; k++) L += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); return L; };
    function treeUp(t, path) { // de la pointe de racine jusque dans la couronne
      const P = path.slice().reverse(), top = GY - t.hpx * t.s * rnd(0.85, 0.45);
      P.push([t.x + rnd(3, -3), GY - 4], [t.x + rnd(6, -6) * t.s, top], [t.x + rnd(0.25, -0.25) * t.hpx * t.s, top + rnd(20, -10) * t.s]);
      return P;
    }
    function netPts(w) { const P = []; for (const [e, fwd] of w.edges) { const Q = fwd ? e.pts : e.pts.slice().reverse(); for (const q of Q) P.push(q); } return P; }
    function launch(P, kind, edgesUsed, to, amt) { parts.push({ P, L: pathLen(P), s: 0, k: kind, E: edgesUsed, to, amt, v: (kind === 'm' ? 70 : 60) * kS * rnd(1.2, 0.8) }); }
    function sendMineral(t, amt) {
      routes();
      const d = DT.get(t), cand = patches.filter((p) => isFinite(d[p.node]));
      if (!cand.length) return false;
      const p = cand[rint(cand.length)], w = walk(p.node, d);
      if (!w || !nodes[w.end].tree) return false;
      const P = [[p.x + rnd(10, -10), p.y + rnd(8, -8)]].concat(netPts(w), treeUp(t, nodes[w.end].path));
      launch(P, 'm', w.edges, t, amt); return true;
    }
    function sendSugar(t, amt, toTree) {
      routes();
      const tips = t.tips.filter((i) => isFinite((toTree ? DT.get(toTree) : DT.get('P'))[i]));
      if (!tips.length) return false;
      const ti = tips[rint(tips.length)], n = nodes[ti];
      const down = treeUp(t, n.path).reverse();
      const w = walk(ti, toTree ? DT.get(toTree) : DT.get('P'));
      if (!w) return false;
      let P = down.concat(netPts(w));
      if (toTree) P = P.concat(treeUp(toTree, nodes[w.end].path));
      launch(P, toTree ? 'x' : 's', w.edges, toTree || null, amt); return true;
    }

    /* ─ le temps, la lumière ─ */
    let T = 0.3 * cfg.day, rainT = 0;
    const sun = () => { const ph = cfg.cycle ? (T / cfg.day) % 1 : 0.35; return { ph, el: Math.sin(ph * TAU) }; };
    function light(t) {
      // avec le cycle, ×2,4 au plus fort du jour : en moyenne sur la journée, à peu près autant que sans cycle
      const el = Math.max(0, sun().el), day = cfg.cycle ? Math.min(1, el * 1.6) * 2.4 : 1;
      let L = day * (t.shade ? 0.22 : 1);
      if (t.under) L *= 0.2; // à l'ombre du grand douglas : un cinquième de la lumière
      return L;
    }
    let acc = new Map();
    function econ(dt) {
      // photosynthèse, paiement du champignon, minéraux en retour (proportionnels au paiement : le champignon récompense)
      const raining = rainT > 0;
      let payTot = 0;
      for (const t of trees) {
        const A = t.s * t.s;
        t.P = light(t) * A * (0.4 + 0.6 * t.vig);
        // les réserves lissent la journée : le bilan se fait sur une moyenne d'environ un jour
        const k = 1 - Math.exp(-dt / (cfg.cycle ? cfg.day : 8)); t.Pav += (t.P - t.Pav) * k;
        t.fert = Math.max(0, t.fert - dt / 45);
        t.pay = 0.28 * t.Pav * (1 - 0.75 * t.fert);
        payTot += t.pay;
      }
      const Mtot = 1.3 * (raining ? 1.8 : 1);
      // partage (hypothèse) : des arbres en excédent vers ceux en déficit, à travers le réseau
      let give = 0, needT = 0;
      for (const t of trees) {
        const A = t.s * t.s, resp = 0.25 * A;
        t.need = Math.max(0, resp + t.pay - t.Pav);
        t.extra = Math.max(0, t.Pav - resp - t.pay);
        needT += t.need; give += t.extra;
      }
      const sh = cfg.share ? Math.min(give * 0.3, needT * 0.5) : 0; // au plus la moitié du manque
      for (const t of trees) {
        const A = t.s * t.s, resp = 0.25 * A;
        t.rec = payTot > 0 ? (Mtot * t.pay) / payTot : 0;
        t.shIn = needT > 0 ? (sh * t.need) / needT : 0;
        t.shOut = give > 0 ? (sh * t.extra) / give : 0;
        const need = 0.55 * t.Pav + 0.03 * A;
        t.rc = (t.Pav + t.shIn) / (resp + t.pay + t.shOut + 1e-6);
        t.rm = (t.rec + 0.5 * t.fert * A) / (need + 1e-6);
        const target = clamp(Math.min(t.rc, t.rm), 0, 1.15);
        t.vig = clamp(t.vig + (target - t.vig) * (1 - Math.exp(-dt / 25)), 0.05, 1.15);
        // les jeunes bien nourris grandissent (lentement)
        if (t.s < 1 && t.vig > 0.8) t.s = Math.min(1, t.s + dt * 0.0016 * (t.vig - 0.7));
        // les particules : une par petite quantité
        const a = acc.get(t) || { s: 0, m: 0, x: 0 };
        a.s += t.pay * dt * 32; a.m += t.rec * dt * 9; a.x += t.shOut * dt * 160;
        while (a.s >= 1) { a.s -= 1; sendSugar(t, 1); }
        while (a.m >= 1) { a.m -= 1; sendMineral(t, 1); }
        while (a.x >= 1) {
          a.x -= 1;
          const tgt = trees.filter((q) => q !== t && q.need > 0);
          if (tgt.length) { let r = Math.random() * tgt.reduce((s2, q) => s2 + q.need, 0), q = tgt[0]; for (const c of tgt) { r -= c.need; if (r <= 0) { q = c; break; } } sendSugar(t, 1, q); }
        }
        acc.set(t, a);
        const kk = 1 - Math.exp(-dt / 6);
        t.payAv += (t.pay - t.payAv) * kk; t.recAv += (t.rec - t.recAv) * kk; t.inAv += (t.shIn - t.inAv) * kk; t.outAv += (t.shOut - t.outAv) * kk;
      }
    }

    /* ─ dessin ─ */
    function sky() {
      const s = sun(), el = s.el, day = clamp(el * 2 + 0.3, 0, 1), dusk = clamp(1 - Math.abs(el) * 4, 0, 1);
      const top = [Math.round(14 + 60 * day), Math.round(18 + 120 * day), Math.round(40 + 175 * day)];
      const bot = [Math.round(30 + 160 * day + 80 * dusk), Math.round(30 + 160 * day + 20 * dusk), Math.round(60 + 170 * day - 30 * dusk)];
      const g = ctx.createLinearGradient(0, 0, 0, GY);
      g.addColorStop(0, `rgb(${top})`); g.addColorStop(1, `rgb(${bot.map((v) => clamp(v, 0, 255))})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY);
      if (day < 0.5) { ctx.fillStyle = `rgba(255,255,240,${((0.5 - day) * 1.6).toFixed(3)})`; for (let i = 0; i < 90; i++) { const x = (i * 97.3) % W, y = (i * 53.7) % (GY * 0.9); ctx.fillRect(x, y, 1.3, 1.3); } }
      const v = V(), sx = v.x0 + (v.x1 - v.x0) * (((s.ph + 0.75) % 1) * 1.0), sy = GY - Math.max(-0.2, el) * GY * 0.8;
      if (cfg.cycle && el > -0.15) { const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60 * kS); gr.addColorStop(0, 'rgba(255,246,210,1)'); gr.addColorStop(0.2, 'rgba(255,230,160,.8)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = gr; ctx.fillRect(sx - 60 * kS, sy - 60 * kS, 120 * kS, 120 * kS); }
      // collines lointaines
      ctx.fillStyle = `rgba(${Math.round(20 + 40 * day)},${Math.round(34 + 60 * day)},${Math.round(30 + 50 * day)},1)`;
      ctx.beginPath(); ctx.moveTo(0, GY);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, GY - 30 * kS - Math.sin(x * 0.004) * 18 * kS - Math.sin(x * 0.011 + 1) * 8 * kS);
      ctx.lineTo(W, GY); ctx.fill();
      return day;
    }
    const TMPL = layer(Math.ceil(H * 0.5), Math.ceil(H * 0.5));
    function drawTree(t, day) {
      const h = t.hpx * t.s, w = (t.crown.width / t.crown.height) * h * 1.02, hh = h * 1.02, g = TMPL.g;
      const tw = Math.min(TMPL.w, Math.ceil(w)), th = Math.min(TMPL.h, Math.ceil(hh));
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, tw + 2, th + 2);
      g.drawImage(t.sick, 0, 0, tw, th);
      g.globalAlpha = clamp((t.vig - 0.25) / 0.6, 0, 1); g.drawImage(t.crown, 0, 0, tw, th); g.globalAlpha = 1;
      // nuit, ombre : on assombrit la silhouette elle-même
      const dark = (1 - day) * 0.6 + (t.shade ? 0.35 : 0) + (t.under ? 0.2 : 0);
      if (dark > 0.02) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(6,10,22,${Math.min(0.8, dark).toFixed(3)})`; g.fillRect(0, 0, tw, th); g.globalCompositeOperation = 'source-over'; }
      ctx.drawImage(TMPL.c, 0, 0, tw, th, t.x - tw / 2, GY - th, tw, th);
      if (t.shade) {
        const cx = t.x, cy = GY - h * 1.1 - 26 * kS;
        ctx.fillStyle = 'rgba(214,220,230,.92)';
        for (const [dx, dy, r] of [[-26, 4, 16], [-8, -6, 20], [14, -2, 18], [30, 6, 13], [0, 8, 16]]) { ctx.beginPath(); ctx.arc(cx + dx * kS, cy + dy * kS, r * kS, 0, TAU); ctx.fill(); }
      }
      if (t.fert > 0.02) { ctx.fillStyle = `rgba(230,240,255,${(0.8 * t.fert).toFixed(3)})`; for (let k = 0; k < 14; k++) ctx.fillRect(t.x + ((k * 37) % 50) - 25, GY - 2 + ((k * 13) % 5), 2.5, 2.5); }
    }
    const roots = layer(W, H);
    function paintRoots() {
      const g = roots.g; g.clearRect(0, 0, W, H); g.lineCap = 'round';
      for (const t of trees) {
        for (const [x0, y0, x1, y1, w] of t.segs) { g.strokeStyle = '#6b4a2e'; g.lineWidth = Math.max(1, w * t.s * 1.1); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
        for (const [x0, y0, x1, y1, w] of t.segs) { g.strokeStyle = 'rgba(200,160,110,.35)'; g.lineWidth = Math.max(0.5, w * t.s * 0.35); g.beginPath(); g.moveTo(x0 - 1, y0 - 1); g.lineTo(x1 - 1, y1 - 1); g.stroke(); }
      }
    }
    paintRoots();
    function drawNet(dt) {
      // les cordons : plus épais là où le trafic est fort (le champignon renforce ses meilleures routes)
      ctx.save(); ctx.lineCap = 'round';
      for (const e of edges) {
        e.tr *= Math.exp(-dt / 8);
        if (e.cut) { if ((e.re -= dt) <= 0) { e.cut = false; e.grow = 0; adj(); dirty = true; fuzz(); } continue; }
        if (e.grow < 1) { const was = e.grow < 0.6; e.grow = Math.min(1, e.grow + dt / 6); if (was && e.grow >= 0.6) dirty = true; }
        const P = e.pts, n = Math.max(1, Math.round((P.length - 1) * e.grow));
        ctx.strokeStyle = `rgba(242,234,214,${(0.13 + Math.min(0.55, e.tr * 0.04)).toFixed(3)})`;
        ctx.lineWidth = (0.6 + Math.min(3.2, Math.sqrt(e.tr) * 0.5)) * kS;
        ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let k = 1; k <= n; k++) ctx.lineTo(P[k][0], P[k][1]); ctx.stroke();
      }
      ctx.restore();
    }
    function drawParts(dt) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.s += p.v * dt;
        if (p.s >= p.L) {
          parts[i] = parts[parts.length - 1]; parts.pop();
          for (const [e] of p.E) e.tr += 1;
          if (p.k === 'm' && snd() && Math.random() < 0.05) au.pluck(scale(trees.indexOf(p.to) * 2 + 7 + rint(3), 220), 1.2, 0.02);
          continue;
        }
        let s = p.s, k = 1;
        while (k < p.P.length) { const L = Math.hypot(p.P[k][0] - p.P[k - 1][0], p.P[k][1] - p.P[k - 1][1]); if (s <= L) break; s -= L; k++; }
        if (k >= p.P.length) continue;
        const A = p.P[k - 1], B = p.P[k], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, x = A[0] + ((B[0] - A[0]) * s) / L, y = A[1] + ((B[1] - A[1]) * s) / L;
        const z = (p.k === 'm' ? 9 : 10) * kS, spr = p.k === 'm' ? MIN : p.k === 'x' ? SHR : SUG;
        ctx.globalAlpha = Math.min(1, p.s / 20, (p.L - p.s) / 20 + 0.2);
        ctx.drawImage(spr, x - z / 2, y - z / 2, z, z);
      }
      ctx.restore();
    }
    function labels() {
      ctx.save(); ctx.font = '500 10.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      for (const t of trees) {
        const y = GY + 16, txt = `${t.nom.toUpperCase()} · VIGUEUR ${Math.round(Math.min(1, t.vig) * 100)} %`, w = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(14,10,6,.6)'; ctx.fillRect(t.x - w / 2 - 6, y - 12, w + 12, 17);
        ctx.fillStyle = t.vig > 0.6 ? 'rgba(230,240,210,.92)' : 'rgba(240,200,150,.92)'; ctx.fillText(txt, t.x, y);
      }
      const v = V(), x0 = v.x0 + 16; let y = H - 18;
      ctx.textAlign = 'left';
      const line = (txt, c) => { const w = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(14,10,6,.62)'; ctx.fillRect(x0 - 6, y - 13, w + 12, 18); ctx.fillStyle = c; ctx.fillText(txt, x0, y); y -= 20; };
      if (cfg.share) line('ROSE : SUCRE PASSÉ D’UN ARBRE À L’AUTRE (HYPOTHÈSE)', 'rgba(255,170,215,.95)');
      line('BLEU : PHOSPHORE ET AZOTE, DU CHAMPIGNON VERS LES ARBRES', 'rgba(150,230,255,.95)');
      line('OR : SUCRES, DES ARBRES VERS LE CHAMPIGNON' + (rainT > 0 ? ' · AVERSE' : ''), 'rgba(255,214,130,.95)');
      ctx.restore();
    }

    quiet = false;
    const drones = [];
    if (au && au.live) drones.push(au.drone(65.4, 'sine', 0.02), au.drone(98, 'sine', 0.008));
    let lastCut = null;
    function cutAlong(a, b) {
      let n = 0;
      for (const e of edges) {
        if (e.cut) continue;
        const P = e.pts;
        for (let k = 1; k < P.length; k++) {
          if (segX(a, b, P[k - 1], P[k])) { e.cut = true; e.re = rnd(30, 18); e.tr = 0; n++; break; }
        }
      }
      if (n) { adj(); dirty = true; fuzz(); for (let i = parts.length - 1; i >= 0; i--) if (parts[i].E.some(([e]) => e.cut)) parts.splice(i, 1); if (snd()) au.noise(0.12, 0.04, 2600, 2, 'bandpass'); }
    }
    const segX = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
    const nearestTree = (x) => trees.reduce((b, t) => (Math.abs(t.x - x) < Math.abs(b.x - x) ? t : b), trees[0]);
    let lastSnd = 0;

    return {
      frame(tt, dt) {
        dt = Math.min(dt, 0.1);
        T += dt; if (rainT > 0) rainT -= dt;
        econ(dt);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        const day = sky();
        ctx.drawImage(soil.c, 0, 0);
        ctx.drawImage(fz.c, 0, 0);
        drawNet(dt);
        ctx.drawImage(roots.c, 0, 0);
        for (const t of trees) drawTree(t, day);
        drawParts(dt);
        if (rainT > 0) {
          ctx.strokeStyle = 'rgba(200,215,240,.4)'; ctx.lineWidth = 1; ctx.beginPath();
          for (let k = 0; k < W / 6; k++) { const x = rnd(W + 60), y = rnd(GY); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); }
          ctx.stroke();
          ctx.fillStyle = 'rgba(20,30,50,.12)'; ctx.fillRect(0, GY, W, H - GY);
          if (snd() && tt - lastSnd > 0.4) { lastSnd = tt; au.noise(0.6, 0.014, rnd(4000, 2500), 0.6, 'bandpass'); }
        }
        labels();
      },
      down(p) {
        const tool = env.tool;
        if (tool === 'ombrer') { const t = nearestTree(p.x); t.shade = !t.shade; if (snd()) au.note(t.shade ? 330 : 440, 0.3, 'sine', 0.03); return; }
        if (tool === 'nourrir') { const t = nearestTree(p.x); t.fert = 1; if (snd()) au.noise(0.3, 0.03, 3000, 1, 'bandpass'); return; }
        if (tool === 'arroser') { rainT = 10; return; }
        if (tool === 'tracer' || tool === 'gratter') { lastCut = { x: p.x, y: p.y }; return; }
        if (tool === 'semer') {
          if (trees.length >= 7) { const i = trees.findIndex((t) => t.s < 1 && t !== trees[2]); if (i >= 0) trees.splice(i, 1); else return; }
          const fx = clamp((p.x - VX) / VW, 0.03, 0.97);
          const t = mkTree(Math.random() < 0.5 ? 'hetre' : 'jeune', fx, 0.3);
          t.vig = 0.7; if (trees[1] && Math.abs(t.x - trees[1].x) < VW * 0.14) t.under = trees[1];
          buildNet(); paintRoots(); parts.length = 0;
          if (snd()) au.pluck(scale(rint(5) + 5, 220), 1.6, 0.05);
        }
      },
      move(p) {
        if (!p.down || !lastCut) return;
        const a = [lastCut.x, lastCut.y], b = [p.x, p.y];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 3) return;
        cutAlong(a, b); lastCut = { x: p.x, y: p.y };
        ctx.save(); ctx.strokeStyle = 'rgba(255,120,90,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
      },
      up() { lastCut = null; },
      dispose() { drones.forEach((d) => d.stop()); },
      _sim(sec) { for (let i = 0; i < sec * 10; i++) { T += 0.1; econ(0.1); parts.length = 0; } return trees.map((t) => `${t.nom} vig ${t.vig.toFixed(2)} rc ${t.rc.toFixed(2)} rm ${t.rm.toFixed(2)} in ${(t.inAv * 100).toFixed(1)}`); },
      _trees: trees,
      ui() {
        const L = [{ type: 'section', label: 'Le réseau souterrain' }];
        for (const t of trees) L.push({ type: 'bar', label: t.nom + (t.shade ? ' (à l’ombre)' : '') + (t.fert > 0.05 ? ' (engrais)' : ''), color: t.vig > 0.6 ? '#9ad46a' : '#e0a050', value: t.vig / 1.15, txt: `donne ${fr(t.payAv * 100)} · reçoit ${fr(t.recAv * 100)}` + (cfg.share ? ` · partage +${fr(t.inAv * 100)} −${fr(t.outAv * 100)}` : '') });
        L.push({ type: 'toggle', label: 'Partage du carbone entre arbres (hypothèse débattue)', value: cfg.share, set: (v) => { cfg.share = v; } });
        L.push({ type: 'toggle', label: 'Le jour et la nuit', value: cfg.cycle, set: (v) => { cfg.cycle = v; } });
        L.push({ type: 'slider', label: 'Durée d’une journée', min: 20, max: 120, step: 5, value: cfg.day, fmt: (v) => v + ' s', set: (v) => { T *= v / cfg.day; cfg.day = v; } });
        L.push({ type: 'buttons', items: [{ label: 'Ombrer le jeune douglas', act: () => { const t = trees[2]; if (t) t.shade = !t.shade; } }, { label: 'Réparer le réseau', act: () => { for (const e of edges) if (e.cut) e.re = 0; } }, { label: 'Une averse', act: () => { rainT = 10; } }] });
        L.push({ type: 'note', text: 'Chaque arbre paie le champignon en sucres (or), à proportion de ce qu’il produit ; le champignon lui rend des minéraux (bleu) à proportion de ce qu’il paie. À l’ombre, un arbre produit moins, paie moins et reçoit moins. Avec de l’engrais (NOURRIR), il paie moins le champignon. Coupez des hyphes (TRACER) : les flux se reroutent, le réseau repousse en une demi-minute. Les « unités » sont arbitraires : seules les proportions comptent.' });
        if (cfg.share) L.push({ type: 'note', text: 'Partage activé : une part des sucres excédentaires des grands arbres rejoint, par le réseau, ceux qui en manquent (rose). Suzanne Simard l’a mesuré en 1997 avec des isotopes, entre bouleau et douglas ; l’ampleur et le sens écologique de ces transferts en forêt sont aujourd’hui contestés (Karst et al., 2023).' });
        return L;
      },
    };
  };
})();
