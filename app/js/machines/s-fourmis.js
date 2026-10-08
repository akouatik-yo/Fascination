/* Fascinations — La Fourmilière
   Trois scènes : « La découverte » (vue rapprochée, une colonie de Lasius niger : recherche au hasard, découverte,
   piste de recrutement qui se renforce puis s'évapore), « Le double pont » (l'expérience de Goss et Deneubourg :
   la colonie choisit la branche la plus courte, sans qu'aucune fourmi ne compare les longueurs) et « Trois
   sociétés » (Lasius, Atta coupe-feuilles, raids d'Eciton). Les phéromones sont des grilles qui s'évaporent et
   diffusent ; chaque fourmi sent la piste avec ses deux antennes et tourne vers le côté le plus odorant. */
(function boot() {
  if (!window.FK || !window.FK_ANT) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, layer, buf, diffuse, scale } = window.FK;
  const A = window.FK_ANT, SP = A.SP;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.22;
  const fr = (x, d = 0) => x.toFixed(d).replace('.', ',');
  // réglages gardés quand la machine est reconstruite
  const keep = { scene: 'decouverte', trails: true, evap: 1, n: 70, bridge: 'inegal', late: false, more: true };

  window.FASC.push({
    id: 'fourmis', name: 'La Fourmilière', cat: 'Vivant', glyph: '🜁',
    blurb: 'Des pistes qui s’inventent : recherche, découverte, recrutement',
    hint: 'Touchez une fourmi pour l’identifier · glissez le doigt pour effacer une piste · NOURRITURE dépose du sucre · CHIMIE révèle les phéromones.',
    intro: 'Aucune fourmi ne connaît le chemin. Des éclaireuses errent au hasard ; celle qui trouve du sucre rentre en marquant le sol d’une phéromone. D’autres suivent cette trace, la renforcent en revenant chargées : en quelques minutes, une autoroute relie le nid à la nourriture. Quand la source s’épuise, plus personne ne renforce la piste, qui s’évapore.',
    about: [
      'Lasius niger, la fourmi noire des jardins, recrute par piste : une ouvrière qui revient d’une bonne source tamponne le sol de son abdomen tous les quelques millimètres. La phéromone s’évapore en une vingtaine de minutes ; une piste n’existe donc que tant qu’on l’entretient. C’est une mémoire collective qui oublie toute seule.',
      'Le double pont (Goss, Aron, Deneubourg et Pasteels, 1989, avec la fourmi d’Argentine) : entre le nid et la nourriture, deux branches. Les fourmis qui empruntent la plus courte reviennent plus tôt et marquent leur branche deux fois avant que celles de la longue ne soient rentrées. Ce petit avantage s’amplifie : en quelques minutes, presque toutes passent par le court chemin. Aucune n’a mesuré quoi que ce soit. Avec deux branches égales, la colonie en choisit quand même une, au hasard : c’est une brisure de symétrie.',
      'Si la branche courte n’est ajoutée qu’après l’établissement de la piste sur la longue, beaucoup d’espèces restent prisonnières de leur habitude. Ce comportement a inspiré les « algorithmes de colonies de fourmis » (Marco Dorigo, 1992), qui servent à optimiser des tournées et des réseaux.',
      'Atta cephalotes cultive un champignon sur des feuilles découpées ; les minuscules ouvrières perchées sur les fragments (les « auto-stoppeuses ») protègent les porteuses des mouches parasites. Eciton burchellii, la fourmi légionnaire, n’a pas de nid fixe : ses raids en éventail balaient la litière et font fuir tout ce qui vit.',
    ],
    tools: [{ id: 'doigt', label: 'doigt' }, { id: 'nourriture', label: 'nourriture' }, { id: 'feuille', label: 'feuille' }, { id: 'chimie', label: 'chimie' }],
    make(env) { return makeAnts(env); },
  });

  // la machine garde ses réglages ; changer de scène reconstruit le monde
  function makeAnts(env) {
    let w = makeWorld(env);
    const rebuild = () => { try { w.dispose(); } catch (e) { /* rien */ } w = makeWorld(env); };
    const setScene = (id) => { keep.scene = id; rebuild(); };
    const api = {
      livePaused: true,
      frame: (t, dt) => w.frame(t, dt), down: (p) => w.down(p), move: (p) => w.move(p), up: () => w.up(),
      dispose: () => w.dispose(), clear: () => rebuild(),
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'La découverte', act: () => setScene('decouverte') },
          { label: 'Le double pont', act: () => setScene('ponts') },
          { label: 'Trois sociétés', act: () => setScene('societes') },
        ] }];
        if (keep.scene === 'decouverte') {
          L.push({ type: 'section', label: 'Découverte' });
          L.push({ type: 'toggle', label: 'Montrer la piste', value: keep.trails, set: (x) => { keep.trails = x; } });
          L.push({ type: 'slider', label: 'Évaporation de la piste', min: 0.3, max: 3, step: 0.05, value: keep.evap, fmt: (x) => '×' + fr(x, 2), set: (x) => { keep.evap = x; } });
          L.push({ type: 'slider', label: 'Fourmis de la colonie', min: 20, max: 160, step: 5, value: keep.n, fmt: (x) => String(x), set: (x) => { keep.n = x; rebuild(); } });
          L.push({ type: 'toggle', label: 'De nouvelles sources apparaissent', value: keep.more, set: (x) => { keep.more = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Sucre au hasard', act: () => w.sugar() }, { label: 'Effacer toutes les pistes', act: () => w.wipeAll() }] });
          L.push({ type: 'note', text: 'Au début, les éclaireuses errent sans but. Dès que l’une trouve le sucre, elle rentre en marquant le sol (en ambre) ; celles qu’elle croise font demi-tour et la suivent, et chaque fourmi chargée renforce la trace. Effacez un bout de piste au doigt : le trafic se désorganise, puis la piste se reforme. Évaporation forte : la colonie a du mal à garder ses pistes ; faible : elle s’accroche à des sources épuisées.' });
        } else if (keep.scene === 'ponts') {
          L.push({ type: 'section', label: 'Double pont' });
          L.push({ type: 'choice', label: 'Branches', value: keep.bridge, set: (x) => { keep.bridge = x; rebuild(); }, options: [{ id: 'inegal', label: 'Une courte, une longue' }, { id: 'egal', label: 'Deux égales' }] });
          L.push({ type: 'toggle', label: 'La branche courte n’arrive qu’après 50 s', value: keep.late, set: (x) => { keep.late = x; rebuild(); } });
          L.push({ type: 'toggle', label: 'Montrer la piste', value: keep.trails, set: (x) => { keep.trails = x; } });
          L.push({ type: 'slider', label: 'Évaporation de la piste', min: 0.3, max: 3, step: 0.05, value: keep.evap, fmt: (x) => '×' + fr(x, 2), set: (x) => { keep.evap = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Recommencer l’expérience', act: () => rebuild() }] });
          L.push({ type: 'note', text: 'Les deux branches partent du même angle : à l’embranchement, une fourmi ne peut pas savoir laquelle est la plus courte. Regardez la jauge : au début, moitié-moitié, puis la colonie bascule. Avec deux branches égales, elle choisit quand même, au hasard, et ce n’est pas toujours la même d’une fois sur l’autre. Branche courte ajoutée tard : selon l’évaporation, la colonie en change ou reste fidèle à son ancienne piste (essayez une évaporation faible).' });
        } else {
          L.push({ type: 'note', text: 'Vue d’ensemble : Lasius niger (piste de recrutement), Atta cephalotes (coupe des feuilles, auto-stoppeuses), Eciton burchellii (raids en éventail venus du bord de l’écran). Outil CHIMIE : les phéromones de chaque société.' });
        }
        return L;
      },
    };
    if (window.FASC_DEBUG) window.FASC_DEBUG.ants = { keep, setScene, get w() { return w; }, sim(sec) { for (let i = 0; i < sec * 15; i++) w._step(1 / 15); return w._stats(); } };
    return api;
  }

  function makeWorld(env) {
    {
      const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
      let quiet = true, T = 0;
      const snd = () => !quiet && au && au.on;
      const SCN = keep.scene, SOC = SCN === 'societes', PONT = SCN === 'ponts', DEC = SCN === 'decouverte';
      // la vue rapprochée : tout grandit (fourmis, odorat, grilles de phéromones), le terrain visible rétrécit d'autant
      const Z = DEC ? 1.8 : PONT ? 1.35 : 1;
      const kS = clamp(Math.min(W, H) / 600, 0.9, 1.8) * 1.5 * Z;
      const area = clamp((W * H) / 960000 / Math.pow(kS / 1.8, 2), 0.35, 1.3);
      const V0 = env.view || { x0: 0, x1: W }, VX0 = V0.x0, VW = V0.x1 - V0.x0;
      const CS = Math.round(7 * Z), GW = Math.ceil(W / CS) + 1, GH = Math.ceil(H / CS) + 1, NG = GW * GH;
      const G = () => new Float32Array(NG);
      const TMP = G(), ALARM = G(), WEAR = G();
      const gi = (x, y) => { const gx = Math.floor(x / CS), gy = Math.floor(y / CS); return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? -1 : gy * GW + gx; };
      // lecture bilinéaire : un arrondi à la case inférieure ferait pencher toutes les antennes du même côté
      const samp = (g, x, y) => {
        const fx = x / CS - 0.5, fy = y / CS - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        if (x0 < 0 || y0 < 0 || x0 >= GW - 1 || y0 >= GH - 1) { const i = gi(x, y); return i < 0 ? 0 : g[i]; }
        const i = y0 * GW + x0; return (g[i] * (1 - tx) + g[i + 1] * tx) * (1 - ty) + (g[i + GW] * (1 - tx) + g[i + GW + 1] * tx) * ty;
      };
      const dep = (g, x, y, v, cap) => { const i = gi(x, y); if (i >= 0) g[i] = Math.min(cap, g[i] + v); };

      /* nids, nourriture, décor */
      const port = H > W * 1.15;
      const nestL = { kind: 'lasius', x: W * (port ? 0.3 : 0.3), y: H * (port ? 0.72 : 0.64), r: 20 * kS };
      if (DEC) { nestL.x = VX0 + VW * (port ? 0.5 : 0.13); nestL.y = H * (port ? 0.84 : 0.68); }
      // double pont : plate-forme du nid à gauche, plate-forme de la nourriture à droite
      const PB = PONT ? { N: [VX0 + VW * 0.11, H * 0.52], F: [VX0 + VW * 0.89, H * 0.52], R: Math.min(VW, H) * 0.085 } : null;
      if (PONT) { nestL.x = PB.N[0]; nestL.y = PB.N[1]; nestL.r = PB.R * 0.55; }
      nestL.holes = [{ x: nestL.x, y: nestL.y }, { x: nestL.x + 13 * kS, y: nestL.y - 9 * kS }];
      const nestA = { kind: 'atta', x: W * 0.78, y: H * (port ? 0.84 : 0.7), r: 34 * kS, holes: [] };
      for (let i = 0; i < 4; i++) { const an = (i * TAU) / 4 + rnd(0.6); nestA.holes.push({ x: nestA.x + Math.cos(an) * nestA.r * 0.55, y: nestA.y + Math.sin(an) * nestA.r * 0.45 }); }

      const foods = [];
      function mkFood(x, y, kind) {
        const pts = []; for (let i = 0; i < 9; i++) pts.push(rnd(1.15, 0.72));
        const amt = kind === 'sucre' ? 70 : 45;
        return { x, y, kind, amt, amt0: amt, pts, rot: rnd(TAU), r: 1, pores: Array.from({ length: 5 }, () => [rnd(0.6, -0.6), rnd(0.6, -0.6)]) };
      }
      const leaves = [];
      const PETALS = ['#f2a7c3', '#f6d36b', '#f3efe6', '#e8735c', '#b9a3f0'];
      function mkLeaf(x, y, kind) {
        const fl = kind === 'fleur', len = (fl ? rnd(40, 30) : rnd(100, 72)) * kS * 0.8;
        const S = Math.ceil(len * 2.2 + 16), c = S / 2, tmp = layer(S, S), t = tmp.g, Lr = layer(S, S);
        let pc;
        if (!fl) {
          const ang = rnd(TAU);
          A.drawLeaf(t, c - Math.cos(ang) * len / 2, c - Math.sin(ang) * len / 2, len, ang, false);
          pc = ['#62a03e', '#70ac47', '#558f35'][rint(3)];
        } else {
          pc = PETALS[rint(PETALS.length)];
          const r0 = rnd(TAU);
          for (let k = 0; k < 5; k++) {
            t.save(); t.translate(c, c); t.rotate(r0 + (k * TAU) / 5);
            const gr = t.createLinearGradient(0, 0, len, 0);
            gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.3, pc); gr.addColorStop(1, pc);
            t.fillStyle = gr; t.beginPath(); t.ellipse(len * 0.5, 0, len * 0.52, len * 0.3, 0, 0, TAU); t.fill();
            t.strokeStyle = 'rgba(0,0,0,.12)'; t.lineWidth = 0.8; t.stroke();
            t.restore();
          }
          t.fillStyle = '#e2a92c'; t.beginPath(); t.arc(c, c, len * 0.22, 0, TAU); t.fill();
          t.fillStyle = '#8a5a12';
          for (let i = 0; i < 14; i++) { const an = rnd(TAU), d = rnd(len * 0.18); t.fillRect(c + Math.cos(an) * d, c + Math.sin(an) * d, 1.6, 1.6); }
        }
        const g = Lr.g;
        g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 6; g.shadowOffsetX = 3; g.shadowOffsetY = 4;
        g.drawImage(tmp.c, 0, 0);
        g.shadowColor = 'transparent';
        const MR = 3, mw = Math.ceil(S / MR), id = t.getImageData(0, 0, S, S).data, mask = new Uint8Array(mw * mw);
        let alive = 0;
        for (let my = 0; my < mw; my++) for (let mx = 0; mx < mw; mx++) {
          const px = Math.min(S - 1, mx * MR + 1), py = Math.min(S - 1, my * MR + 1);
          if (id[(py * S + px) * 4 + 3] > 200) { mask[my * mw + mx] = 1; alive++; }
        }
        return { x, y, S, c, Lr, mask, mw, MR, alive, alive0: alive, pc, kind, fade: 0, dying: false };
      }
      function leafHas(lf, x, y) {
        const mx = Math.floor((x - lf.x + lf.c) / lf.MR), my = Math.floor((y - lf.y + lf.c) / lf.MR);
        return mx >= 0 && my >= 0 && mx < lf.mw && my < lf.mw && lf.mask[my * lf.mw + mx] === 1;
      }
      function leafCell(lf) {
        for (let k = 0; k < 24; k++) {
          const i = rint(lf.mask.length);
          if (lf.mask[i]) return [lf.x - lf.c + ((i % lf.mw) + 0.5) * lf.MR, lf.y - lf.c + (((i / lf.mw) | 0) + 0.5) * lf.MR];
        }
        return [lf.x, lf.y];
      }
      function bite(lf, x, y, r) {
        const lx = x - lf.x + lf.c, ly = y - lf.y + lf.c, g = lf.Lr.g;
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(lx, ly, r, 0, TAU);
        for (let k = 0; k < 3; k++) { const an = rnd(TAU); g.moveTo(lx + Math.cos(an) * r * 0.7 + r * 0.5, ly + Math.sin(an) * r * 0.7); g.arc(lx + Math.cos(an) * r * 0.7, ly + Math.sin(an) * r * 0.7, r * 0.5, 0, TAU); }
        g.fill(); g.globalCompositeOperation = 'source-over';
        const R = Math.ceil(r / lf.MR) + 1, cx = Math.floor(lx / lf.MR), cy = Math.floor(ly / lf.MR);
        for (let y2 = cy - R; y2 <= cy + R; y2++) for (let x2 = cx - R; x2 <= cx + R; x2++) {
          if (x2 < 0 || y2 < 0 || x2 >= lf.mw || y2 >= lf.mw) continue;
          if (Math.hypot((x2 + 0.5) * lf.MR - lx, (y2 + 0.5) * lf.MR - ly) > r) continue;
          const i = y2 * lf.mw + x2;
          if (lf.mask[i]) { lf.mask[i] = 0; lf.alive--; }
        }
        if (lf.alive < lf.alive0 * 0.04) lf.dying = true;
      }

      const keepOut = [[nestL.x, nestL.y, nestL.r * 3], [nestA.x, nestA.y, nestA.r * 2.4]];
      const L0 = !SOC ? [] : port ? [[0.25, 0.14, 'feuille'], [0.72, 0.3, 'fleur'], [0.15, 0.4, 'feuille']] : [[0.2, 0.18, 'feuille'], [0.52, 0.13, 'fleur'], [0.1, 0.4, 'feuille']];
      for (const [fx, fy, k] of L0) { leaves.push(mkLeaf(W * fx, H * fy, k)); keepOut.push([W * fx, H * fy, 70 * kS]); }
      leaves.forEach((l) => (l.fade = 1));
      const F0 = PONT ? [] : DEC ? [] : port ? [[0.62, 0.55, 'miette'], [0.12, 0.88, 'sucre'], [0.5, 0.95, 'miette']] : [[0.47, 0.44, 'miette'], [0.12, 0.84, 'sucre'], [0.55, 0.86, 'miette'], [0.36, 0.3, 'sucre']];
      for (const [fx, fy, k] of F0) { foods.push(mkFood(W * fx, H * fy, k)); keepOut.push([W * fx, H * fy, 40 * kS]); }
      let FID = 0;
      function addSugar(x, y, amt) { const f = mkFood(x, y, 'sucre'); f.amt = f.amt0 = amt || 160; f.id = ++FID; f.t0 = T; f.found = null; f.finder = null; foods.push(f); return f; }
      if (DEC) { addSugar(VX0 + VW * (port ? 0.6 : 0.8), H * (port ? 0.22 : 0.3), 320); keepOut.push([foods[0].x, foods[0].y, 60 * kS]); }
      if (PONT) { const f = addSugar(PB.F[0], PB.F[1], 1e9); f.r0 = PB.R * 0.45; }
      const pebbles = [];
      for (let tries = 0; !PONT && pebbles.length < (DEC ? 3 : Math.round(6 * area) + 2) && tries < 300; tries++) {
        const p = { x: rnd(W * 0.95, W * 0.05), y: rnd(H * 0.95, H * 0.05), r: rnd(24, 9) * kS * 0.8 };
        if (keepOut.some((k) => Math.hypot(k[0] - p.x, k[1] - p.y) < k[2] + p.r) || pebbles.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < q.r + p.r + 30)) continue;
        pebbles.push(p);
      }
      let bg = PONT ? null : A.ground(W, H, { k: kS, nests: SOC ? [nestL, nestA] : [nestL], pebbles });

      /* double pont : les mêmes tracés servent au décor (pixels) et au masque de marche (grille) */
      let WALK = null, BR = null, lateT = PONT && keep.late ? 50 : 0, lateOn = !(PONT && keep.late);
      const BW = PONT ? SP.lasius.L * kS * 2.4 : 0;
      function bridgeShapes() {
        const [nx, ny] = PB.N, [fx, fy] = PB.F, P1 = [nx + PB.R + VW * 0.08, ny], P2 = [fx - PB.R - VW * 0.08, fy], dx = P2[0] - P1[0];
        const eq = keep.bridge === 'egal', h1 = H * (eq ? 0.27 : 0.06), h2 = H * (eq ? 0.27 : 0.42), a30 = Math.PI / 6; // inégal : la longue fait presque le double
        // les deux branches partent du même angle (30°) : à l'embranchement, rien ne dit laquelle est la plus courte
        const branch = (h, sg) => { const d = h / Math.sin(a30); return [P1, [P1[0] + Math.cos(a30) * d, P1[1] + sg * Math.sin(a30) * d], [P2[0] - Math.cos(a30) * d, P2[1] + sg * Math.sin(a30) * d], P2]; };
        return { stem: [[nx, ny], P1], join: [P2, [fx, fy]], up: branch(h1, -1), dn: branch(h2, 1), P1, P2, dx };
      }
      function bezLen(b) { let L = 0, q = b[0]; for (let i = 1; i <= 60; i++) { const t = i / 60, u = 1 - t, x = u * u * u * b[0][0] + 3 * u * u * t * b[1][0] + 3 * u * t * t * b[2][0] + t * t * t * b[3][0], y = u * u * u * b[0][1] + 3 * u * u * t * b[1][1] + 3 * u * t * t * b[2][1] + t * t * t * b[3][1]; L += Math.hypot(x - q[0], y - q[1]); q = [x, y]; } return L; }
      function pathB(g, b, k) { g.moveTo(b[0][0] * k, b[0][1] * k); g.bezierCurveTo(b[1][0] * k, b[1][1] * k, b[2][0] * k, b[2][1] * k, b[3][0] * k, b[3][1] * k); }
      function strokeBridges(g, k, w, withUp) {
        const B = bridgeShapes();
        g.lineWidth = w * k; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
        g.moveTo(B.stem[0][0] * k, B.stem[0][1] * k); g.lineTo(B.stem[1][0] * k, B.stem[1][1] * k);
        g.moveTo(B.join[0][0] * k, B.join[0][1] * k); g.lineTo(B.join[1][0] * k, B.join[1][1] * k);
        pathB(g, B.dn, k); if (withUp) pathB(g, B.up, k); g.stroke();
        g.beginPath(); g.arc(PB.N[0] * k, PB.N[1] * k, PB.R * k, 0, TAU); g.arc(PB.F[0] * k, PB.F[1] * k, PB.R * k, 0, TAU); g.fill();
      }
      function buildWalk() {
        const L = layer(GW, GH), g = L.g, k = 1 / CS;
        g.fillStyle = '#fff'; g.strokeStyle = '#fff'; strokeBridges(g, k, BW, lateOn);
        let d = g.getImageData(0, 0, GW, GH).data; WALK = new Uint8Array(NG); for (let i = 0; i < NG; i++) WALK[i] = d[i * 4 + 3] > 100 ? 1 : 0;
        // repérer les deux branches (hors des abords de l'embranchement)
        BR = new Uint8Array(NG); const B = bridgeShapes(), cut = BW * 2.2;
        for (const [b, id] of [[B.up, 1], [B.dn, 2]]) {
          g.clearRect(0, 0, GW, GH); g.lineWidth = BW * k; g.strokeStyle = '#fff'; g.beginPath(); pathB(g, b, k); g.stroke();
          g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(B.P1[0] * k, B.P1[1] * k, cut * k, 0, TAU); g.arc(B.P2[0] * k, B.P2[1] * k, cut * k, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
          d = g.getImageData(0, 0, GW, GH).data; for (let i = 0; i < NG; i++) if (d[i * 4 + 3] > 100) BR[i] = id;
        }
      }
      function pontGround() {
        const Lr = layer(W, H), g = Lr.g;
        // de l'eau sombre (les vraies expériences isolent le pont au-dessus d'un fossé d'eau)
        const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#16222c'); wg.addColorStop(1, '#0c141b'); g.fillStyle = wg; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(160,200,230,.05)'; g.lineWidth = 1;
        for (let i = 0; i < 90; i++) { const x = rnd(W), y = rnd(H), l = rnd(60, 20); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3, x + l, y); g.stroke(); }
        g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 14; g.shadowOffsetY = 6; g.fillStyle = '#c9b48e'; g.strokeStyle = '#c9b48e'; strokeBridges(g, 1, BW, lateOn); g.restore();
        // carton : fibres, bords plus clairs
        g.save(); g.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < (W * H) / 60; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,245,220,.12)' : 'rgba(80,60,30,.1)'; g.fillRect(rnd(W), rnd(H), rnd(3, 1), 1); }
        g.restore();
        // le nid : de la terre sur la plate-forme de gauche, avec ses entrées
        const [nx, ny] = PB.N, gr = g.createRadialGradient(nx, ny, 0, nx, ny, PB.R);
        gr.addColorStop(0, 'rgba(90,66,42,.95)'); gr.addColorStop(0.75, 'rgba(110,84,56,.7)'); gr.addColorStop(1, 'rgba(110,84,56,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(nx, ny, PB.R, 0, TAU); g.fill();
        for (const h of nestL.holes) { const hg = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, nestL.r * 0.5); hg.addColorStop(0, 'rgba(0,0,0,.95)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hg; g.beginPath(); g.arc(h.x, h.y, nestL.r * 0.5, 0, TAU); g.fill(); }
        return Lr;
      }
      if (PONT) { nestL.holes = [{ x: nestL.x, y: nestL.y }, { x: nestL.x - PB.R * 0.3, y: nestL.y + PB.R * 0.25 }]; buildWalk(); bg = pontGround(); }
      const walkAt = (x, y) => { if (!WALK) return 1; const i = gi(x, y); return i < 0 ? 0 : WALK[i]; };

      /* colonies */
      const colL = { sp: SP.lasius, nest: nestL, F: G(), Hm: G(), ants: [], acc: 0 };
      const colA = { sp: SP.atta, nest: nestA, F: G(), Hm: G(), ants: [], acc: 0 };
      const colE = { sp: SP.eciton, F: G(), ants: [], acc: 0 };
      let AID = 0;
      function mkAnt(col, role) {
        const sp = col.sp;
        let L = sp.L * kS, hk = 1, v = 1, sold = false;
        if (role === 'soldat') { if (sp === SP.atta) { L *= 1.42; hk = 1.75; v = 0.75; } else { L *= 1.2; hk = 1.3; sold = true; v = 0.9; } }
        if (role === 'minime') { L *= 0.56; v = 0.85; }
        L *= rnd(1.07, 0.93);
        const a = { col, sp, role, L, hk, v, sold, rep: false, id: AID++, x: -99, y: -99, a: rnd(TAU), ca: 1, sa: 0, w: 0, nz: 0, g: rnd(TAU), wig: 1,
          st: 'nid', tIn: rnd(22), carry: null, pause: 0, cut: 0, alarm: 0, label: 0, spd: 0, life: 0, giveUp: 90, q: 0, uturn: 0, free: false, fleeK: 0, fleeA: 0, pt: null, tx: 0, ty: 0, tl: null };
        col.ants.push(a);
        return a;
      }
      const nL = SOC ? Math.round(190 * area) : PONT ? Math.round(keep.n * 1.4) : keep.n, nA = SOC ? Math.round(190 * area) : 0, nE = SOC ? Math.round(240 * area) : 0;
      for (let i = 0; i < nL; i++) mkAnt(colL, 'ouvrière');
      for (let i = 0; i < nA; i++) { const r = Math.random(); mkAnt(colA, r < 0.07 ? 'soldat' : r < 0.25 ? 'minime' : 'ouvrière'); }
      for (let i = 0; i < nE; i++) mkAnt(colE, Math.random() < 0.06 ? 'soldat' : 'ouvrière');
      const ALL = colL.ants.concat(colA.ants, colE.ants);

      /* proies : collemboles */
      const prey = [], nP = SOC ? Math.round(9 * area) + 4 : DEC ? 3 : 0;
      const mkPrey = () => ({ prey: true, x: rnd(W * 0.95, W * 0.05), y: rnd(H * 0.95, H * 0.05), a: rnd(TAU), hop: 0, vx: 0, vy: 0, L: rnd(8, 5.5) * kS * 0.8, still: rnd(3), fade: 0, dead: false, hue: rnd(270, 220) });
      for (let i = 0; i < nP; i++) prey.push(mkPrey());

      /* raid légionnaire */
      const raid = { on: false, t: 0, next: 1e9, ex: 0, ey: 0, fx: 0, fy: 0, dir: 0, fan: 85 * kS };
      function startRaid() {
        const side = rint(4), u = rnd(0.8, 0.2), o = 30 * kS;
        if (side === 0) { raid.ex = -o; raid.ey = H * u; raid.dir = 0; }
        else if (side === 1) { raid.ex = W + o; raid.ey = H * u; raid.dir = Math.PI; }
        else if (side === 2) { raid.ex = W * u; raid.ey = -o; raid.dir = Math.PI / 2; }
        else { raid.ex = W * u; raid.ey = H + o; raid.dir = -Math.PI / 2; }
        raid.dir += rnd(0.5, -0.5);
        raid.fx = raid.ex + Math.cos(raid.dir) * 60 * kS; raid.fy = raid.ey + Math.sin(raid.dir) * 60 * kS;
        raid.on = true; raid.t = rnd(95, 70);
      }

      /* grille spatiale */
      const HC = Math.round(32 * Z), HW = Math.ceil(W / HC) + 3, HH = Math.ceil(H / HC) + 3, BK = Array.from({ length: HW * HH }, () => []);
      const hcx = (x) => clamp(Math.floor(x / HC) + 1, 0, HW - 1), hcy = (y) => clamp(Math.floor(y / HC) + 1, 0, HH - 1);
      const finger = { x: 0, y: 0, on: false };

      let SL = 0, SC = 0, SR = 0, WAN = 1;
      function sense(g, a, sd) {
        const c1 = Math.cos(a.a - 0.6), s1 = Math.sin(a.a - 0.6), c2 = Math.cos(a.a + 0.6), s2 = Math.sin(a.a + 0.6);
        SL = samp(g, a.x + c1 * sd, a.y + s1 * sd); SC = samp(g, a.x + a.ca * sd, a.y + a.sa * sd); SR = samp(g, a.x + c2 * sd, a.y + s2 * sd);
        return SL + SC + SR;
      }
      const toward = (a, tx, ty) => wrap(Math.atan2(ty - a.y, tx - a.x) - a.a);
      const uturn = (a) => { a.uturn = (Math.random() < 0.5 ? -1 : 1) * Math.PI * rnd(1.08, 0.9); };
      let lastPluck = 0, lastChirp = 0, lastRustle = 0, delivered = 0;

      let trips = 0, nextFoodT = 140, lastBr = 0, recruit = 0;
      const spent = [], brHist = [];
      let toastM = null;
      const toast = (m) => { toastM = { m, t: T }; };
      function enterNest(a, t) {
        if (a.carry || a.rep) { trips++; recruit = Math.min(4, recruit + 0.6); }
        if ((a.carry || a.rep) && snd() && t - lastPluck > 0.22) {
          lastPluck = t; delivered++;
          if (a.sp === SP.lasius) au.pluck(scale(7 + (delivered % 5), 330), 0.9, 0.035);
          else au.pluck(scale(2 + (delivered % 4), 165), 1.2, 0.03);
        }
        a.st = 'nid'; a.tIn = DEC || PONT ? rnd(5, 1) : rnd(9, 2); a.carry = null; a.rep = false; a.leaf = null; a.hiker = 0; a.x = -99; a.y = -99; a.label = 0;
      }
      function exitNest(a) {
        const h = a.col.nest.holes[rint(a.col.nest.holes.length)];
        a.x = h.x + rnd(3, -3); a.y = h.y + rnd(3, -3); a.a = rnd(TAU); a.st = 'cherche'; a.life = 0; a.spd = 0; a.uturn = 0; a.pause = 0; a.alarm = 0;
        a.giveUp = a.role === 'soldat' ? rnd(240, 120) : rnd(130, 60); a.q = 0; a.tl = null;
      }

      function behaveCol(a, dt, t, hx, hy, sd) {
        const col = a.col, n = col.nest;
        let wd = 0; WAN = 1;
        if (a.st === 'cherche') {
          let best = null, bd = 1e9;
          if (a.role === 'ouvrière') {
            if (a.sp === SP.lasius) {
              for (const f of foods) { const d = Math.hypot(f.x - a.x, f.y - a.y); if (d < f.r + (SOC ? 48 : 20) * kS && d < bd) { bd = d; best = f; } } // l'odeur du sucre ne porte pas loin
              if (best) {
                wd += toward(a, best.x, best.y) * 4; WAN = 0.25;
                if (Math.hypot(hx - best.x, hy - best.y) < best.r + a.L * 0.1) {
                  best.amt -= 1;
                  if (best.id && !best.found) { best.found = T; best.finder = a; a.finder = best.id; a.label = 9; if (!SOC) toast(`Une éclaireuse a trouvé le sucre n° ${best.id} au bout de ${fr(T - best.t0)} s. Elle rentre en marquant le sol.`); }
                  if (best.id) a.src = best.id;
                  if (best.kind === 'sucre') { a.st = 'boit'; a.cut = rnd(2.8, 1.6); }
                  else { a.carry = 'miette'; a.st = 'retour'; a.q = 1; uturn(a); }
                }
              }
            } else {
              if (a.tl && (a.tl.dying || !leaves.includes(a.tl))) a.tl = null;
              if (!a.tl) for (const lf of leaves) {
                if (lf.dying) continue;
                const d = Math.hypot(lf.x - a.x, lf.y - a.y);
                if (d < lf.c + 75 * kS) { a.tl = lf; const c = leafCell(lf); a.tx = c[0]; a.ty = c[1]; break; }
              }
              if (a.tl) {
                best = a.tl;
                wd += toward(a, a.tx, a.ty) * 3.5; WAN = 0.35;
                if (leafHas(a.tl, hx, hy)) { a.st = 'coupe'; a.cut = rnd(3, 1.6); a.cutA = a.a; }
                else if (Math.hypot(a.tx - a.x, a.ty - a.y) < a.L * 0.5) { const c = leafCell(a.tl); a.tx = c[0]; a.ty = c[1]; }
              }
            }
          }
          if (!best) {
            const s = sense(col.F, a, sd);
            // sur le pont, les fourmis suivent la piste plus fidèlement (réponse non linéaire : plus elle est forte, moins on s'en écarte)
            if (s > 0.05) { const at = a.sp === SP.atta; wd += ((SR - SL) / (s + (PONT ? 0.15 : 0.4))) * (at ? 5.5 : PONT ? 6.5 : 4.5); WAN = 1 / (1 + s * (at ? 1.6 : PONT ? 2.5 : 0.7)); }
            else if (a.role !== 'soldat') wd -= toward(a, n.x, n.y) * 0.08;
          }
          dep(col.Hm, a.x, a.y, 1.6 * dt, 12);
          // sur le pont, comme chez la fourmi d'Argentine de l'expérience, on marque aussi à l'aller (plus faiblement)
          if (PONT) dep(col.F, a.x, a.y, 0.9 * dt, 14);
          if (a.life > a.giveUp) { a.st = 'retour'; a.q = 0; }
        } else {
          // au retour : l'odeur du nid, et (hors vue d'ensemble) surtout la piste de nourriture, suivie dans les deux sens
          const s = sense(col.Hm, a, sd), kH = SOC ? 2.6 : PONT ? 0.35 : 1;
          if (s > 0.05) wd += ((SR - SL) / (s + 0.4)) * kH;
          if (!SOC) { const s2 = sense(col.F, a, sd); if (s2 > 0.05) { wd += ((SR - SL) / (s2 + (PONT ? 0.15 : 0.4))) * (PONT ? 5 : 2); if (PONT) WAN = 1 / (1 + s2 * 2.5); } }
          wd += toward(a, n.x, n.y) * 1.1; WAN = 0.55;
          if (a.q > 0.02) { dep(col.F, a.x, a.y, 6 * a.q * dt, 14); a.q *= Math.exp(-dt * 0.022); }
          if (Math.hypot(a.x - n.x, a.y - n.y) < n.r * 0.9) enterNest(a, t);
        }
        return wd;
      }

      function behaveE(a, dt, t, hx, hy, sd) {
        let wd = 0; WAN = 1;
        if (!raid.on && a.st !== 'retour') a.st = 'retour';
        if (a.st === 'aller') {
          const px = -Math.sin(raid.dir), py = Math.cos(raid.dir);
          const tx = raid.fx + px * a.off * raid.fan, ty = raid.fy + py * a.off * raid.fan;
          const s = sense(colE.F, a, sd); if (s > 0.05) wd += ((SR - SL) / (s + 0.4)) * 3;
          wd += toward(a, tx, ty) * 1.3; WAN = 0.75;
          dep(colE.F, a.x, a.y, 2.4 * dt, 14);
          if (Math.hypot(tx - a.x, ty - a.y) < 40 * kS) { a.st = 'chasse'; a.cut = rnd(12, 5); }
        } else if (a.st === 'chasse') {
          a.cut -= dt; WAN = 2.3;
          wd += toward(a, raid.fx, raid.fy) * 0.45;
          if (a.pt && !a.pt.dead) { wd += toward(a, a.pt.x, a.pt.y) * 4; WAN = 0.5; }
          dep(colE.F, a.x, a.y, 1.2 * dt, 14);
          if (a.cut <= 0 || a.carry) { a.st = 'retour'; a.pt = null; }
        } else {
          const s = sense(colE.F, a, sd); if (s > 0.05) wd += ((SR - SL) / (s + 0.4)) * 3;
          wd += toward(a, a.ex, a.ey) * 1.25; WAN = 0.6;
          dep(colE.F, a.x, a.y, (a.carry ? 4 : 2) * dt, 14);
          if (Math.hypot(a.ex - a.x, a.ey - a.y) < 22 * kS) { a.st = 'nid'; a.carry = null; a.x = -999; a.y = -999; a.label = 0; }
        }
        return wd;
      }

      function upd(a, dt, t) {
        const sp = a.sp, L = a.L, ecit = sp === SP.eciton;
        a.label = Math.max(0, a.label - dt); a.alarm = Math.max(0, a.alarm - dt * 0.35); a.life += dt;
        const hx = a.x + a.ca * L * 0.45, hy = a.y + a.sa * L * 0.45, sd = Math.max(2.4 * L, CS * 2.3);
        let wd = 0, vf = 1, steer = false;
        a.wig += (1 - a.wig) * Math.min(1, dt * 3);
        if (a.pause > 0) { a.pause -= dt; vf = 0; a.wig = 2.6; }
        else if (a.st === 'coupe') {
          a.cut -= dt; vf = 0; a.wig = 1.4; a.a = a.cutA + Math.sin(t * 7 + a.id) * 0.28;
          if (a.cut <= 0) {
            const lf = a.tl;
            if (lf && !lf.dying) {
              bite(lf, a.x + Math.cos(a.cutA) * L * 0.55, a.y + Math.sin(a.cutA) * L * 0.55, L * 0.55);
              a.carry = 'feuille'; a.leaf = A.leafPiece(L); a.leafCol = lf.pc; a.leafRot = rnd(0.5, -0.5);
              a.hiker = Math.random() < 0.22 ? rnd(TAU) + 0.01 : 0; a.st = 'retour'; a.q = 1; uturn(a);
            } else a.st = 'cherche';
            a.a = a.cutA; a.tl = null;
          }
        } else if (a.st === 'boit') {
          a.cut -= dt; vf = 0; a.wig = 0.5;
          if (a.cut <= 0) { a.rep = true; a.st = 'retour'; a.q = 1; uturn(a); }
        } else if (a.uturn) {
          const s = Math.sign(a.uturn), st = Math.min(Math.abs(a.uturn), 4.2 * dt);
          a.a += s * st; a.uturn -= s * st; if (Math.abs(a.uturn) < 1e-3) a.uturn = 0;
          vf = 0.4; a.w = 0;
        } else {
          steer = true;
          wd = ecit ? behaveE(a, dt, t, hx, hy, sd) : behaveCol(a, dt, t, hx, hy, sd);
          if (a.st === 'nid') return;
        }
        a.nz += -a.nz * 1.6 * dt + gauss() * 3.2 * Math.sqrt(dt);
        if (steer) {
          wd += a.nz * WAN;
          for (const p of pebbles) {
            const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy) || 1, lim = p.r + L * 1.4;
            if (d < lim) {
              const out = Math.atan2(dy, dx);
              if (Math.cos(a.a - out) < 0.2) {
                const t1 = out + Math.PI / 2, t2 = out - Math.PI / 2;
                const want = Math.abs(wrap(t1 - a.a)) < Math.abs(wrap(t2 - a.a)) ? t1 : t2;
                wd += wrap(want - a.a) * 5 * (1 - (d - p.r) / (L * 1.4));
              }
              const mn = p.r + L * 0.35;
              if (d < mn) { a.x = p.x + (dx / d) * mn; a.y = p.y + (dy / d) * mn; }
            }
          }
          if (WALK) {
            // les antennes sentent le bord du pont : on tourne du côté où il y a du carton
            const r = L * 1.3, ok = (da) => walkAt(a.x + Math.cos(a.a + da) * r, a.y + Math.sin(a.a + da) * r);
            if (!ok(0)) { const l = ok(-0.8), rr = ok(0.8); wd += l && !rr ? -6 : rr && !l ? 6 : (a.id % 2 ? 6 : -6); }
            else if (!ok(-0.5)) wd += 2.5; else if (!ok(0.5)) wd -= 2.5;
          }
          if (!a.free && !WALK) { const m = 26 * Z; if (a.x < m || a.x > W - m || a.y < m || a.y > H - m) wd += toward(a, W / 2, H / 2) * 2.5; }
          if (finger.on) {
            const d = Math.hypot(a.x - finger.x, a.y - finger.y);
            if (d < L * 3.5 + 22) { wd += wrap(Math.atan2(a.y - finger.y, a.x - finger.x) - a.a) * 4; a.alarm = Math.max(a.alarm, 0.8); }
          }
          if (a.fleeK > 0) { wd += wrap(a.fleeA - a.a) * 4 * a.fleeK; a.fleeK = 0; }
          if (!ecit) {
            const s = sense(ALARM, a, sd);
            if (s > 0.3) {
              a.alarm = Math.max(a.alarm, Math.min(1, s * 0.15));
              wd += ((SR - SL) / (s + 0.5)) * (a.role === 'soldat' ? 5 : -4);
            }
          }
          wd = clamp(wd, -7, 7);
        }
        a.w += (wd - a.w) * Math.min(1, dt * 8);
        a.a += a.w * dt;
        let vt = sp.speed * kS * a.v * vf * (1 + a.alarm * 0.8) * (a.carry === 'feuille' ? 0.72 : a.carry ? 0.85 : 1) * (a.rep ? 0.8 : 1);
        if (ecit && a.st === 'chasse') vt *= 0.8;
        a.spd += (vt - a.spd) * Math.min(1, dt * 6);
        a.ca = Math.cos(a.a); a.sa = Math.sin(a.a);
        const ds = a.spd * dt;
        const ox = a.x, oy = a.y;
        a.x += a.ca * ds; a.y += a.sa * ds; a.g += (ds / L) * 5.2;
        if (WALK && !walkAt(a.x, a.y)) { a.x = ox; a.y = oy; a.a += Math.PI * rnd(1.3, 0.7) * (Math.random() < 0.5 ? 1 : -1); a.w = 0; }
        if (!a.free) {
          if (a.x < 3) { a.x = 3; a.a = Math.PI - a.a; } else if (a.x > W - 3) { a.x = W - 3; a.a = Math.PI - a.a; }
          if (a.y < 3) { a.y = 3; a.a = -a.a; } else if (a.y > H - 3) { a.y = H - 3; a.a = -a.a; }
        }
        dep(WEAR, a.x, a.y, ds * (sp === SP.atta ? 0.0035 : 0.001), 1);
      }

      function evap(g, k, dt, dk) {
        const f = Math.exp(-k * dt);
        for (let i = 0; i < NG; i++) g[i] *= f;
        if (dk) diffuse(g, TMP, GW, GH, Math.min(0.2, dk * dt));
      }

      function step(dt, t) {
        T += dt; recruit *= Math.exp(-dt / 25);
        evap(colL.F, 0.03 * (SOC ? 1 : keep.evap), dt, 2.2); evap(colL.Hm, 0.05, dt, 2.2);
        if (WALK) { const F = colL.F, Hm = colL.Hm; for (let i = 0; i < NG; i++) if (!WALK[i]) { F[i] = 0; Hm[i] = 0; } }
        if (PONT && !lateOn && (lateT -= dt) <= 0) { lateOn = true; buildWalk(); bg = pontGround(); toast('La branche courte vient d’être ajoutée. La colonie va-t-elle en changer ?'); }
        evap(colA.F, 0.022, dt, 2.2); evap(colA.Hm, 0.05, dt, 2.2);
        evap(colE.F, 0.07, dt, 2.2); evap(ALARM, 0.7, dt, 6);
        const wf = Math.exp(-dt * 0.004); for (let i = 0; i < NG; i++) WEAR[i] *= wf;

        /* raid */
        if (raid.on) {
          raid.t -= dt;
          const v = 9 * kS;
          raid.dir += gauss() * 0.45 * Math.sqrt(dt);
          if (raid.fx < W * 0.12 || raid.fx > W * 0.88 || raid.fy < H * 0.12 || raid.fy > H * 0.88) {
            const want = Math.atan2(H / 2 - raid.fy, W / 2 - raid.fx);
            raid.dir += wrap(want - raid.dir) * dt * 0.8;
          }
          raid.fx += Math.cos(raid.dir) * v * dt; raid.fy += Math.sin(raid.dir) * v * dt;
          if (raid.t > 10) {
            colE.acc = Math.min(4, colE.acc + dt * 15);
            for (const a of colE.ants) {
              if (colE.acc < 1) break;
              if (a.st !== 'nid') continue;
              colE.acc -= 1;
              a.x = raid.ex + rnd(10, -10) * kS; a.y = raid.ey + rnd(10, -10) * kS; a.a = raid.dir + rnd(0.3, -0.3);
              a.ex = raid.ex; a.ey = raid.ey; a.off = clamp(gauss() * 0.5, -1.2, 1.2);
              a.st = 'aller'; a.free = true; a.spd = 0; a.life = 0; a.uturn = 0; a.pause = 0; a.carry = null; a.pt = null;
            }
          }
          if (raid.t <= 0) { raid.on = false; raid.next = rnd(45, 30); }
        } else if ((raid.next -= dt) <= 0) startRaid();

        /* sorties des nids */
        for (const col of [colL, colA]) {
          // vue rapprochée : quelques éclaireuses sortent d'abord ; chaque retour chargé stimule les sœurs restées au nid
          col.acc = Math.min(3, col.acc + dt * (SOC ? 6 : 0.35 + recruit * 1.2));
          for (const a of col.ants) {
            if (a.st !== 'nid') continue;
            a.tIn -= dt;
            if (a.tIn <= 0 && col.acc >= 1) { col.acc -= 1; exitNest(a); }
          }
        }

        /* voisinage */
        for (const b of BK) b.length = 0;
        let nOut = 0;
        for (const a of ALL) if (a.st !== 'nid') { BK[hcx(a.x) + hcy(a.y) * HW].push(a); nOut++; }
        for (const p of prey) BK[hcx(p.x) + hcy(p.y) * HW].push(p);
        for (const a of ALL) {
          if (a.st === 'nid') continue;
          const ecit = a.sp === SP.eciton, L = a.L;
          const R = ecit ? (a.st === 'chasse' ? L * 6 : L * 1.2) : raid.on ? L * 4.5 : L * 1.2;
          const x0 = hcx(a.x - R), x1 = hcx(a.x + R), y0 = hcy(a.y - R), y1 = hcy(a.y + R);
          let bp = null, bpd = 1e9;
          for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) for (const o of BK[gy * HW + gx]) {
            if (o === a) continue;
            const dx = o.x - a.x, dy = o.y - a.y, d = Math.hypot(dx, dy);
            if (d > R) continue;
            if (o.prey) {
              if (ecit && a.st === 'chasse' && !a.carry && !a.sold && !o.dead) {
                if (d < L * 0.8) {
                  o.dead = true; a.carry = 'proie'; a.pt = null;
                  if (snd()) au.note(rnd(1800, 1300), 0.05, 'triangle', 0.025);
                } else if (d < bpd) { bpd = d; bp = o; }
              }
              continue;
            }
            if (o.col === a.col) {
              const lim = (L + o.L) * 0.42;
              if (d < lim && d > 0.01) { const k = ((lim - d) / d) * 0.3, nx = a.x - dx * k, ny = a.y - dy * k; if (walkAt(nx, ny)) { a.x = nx; a.y = ny; } }
              if (d < (L + o.L) * 0.55 && a.pause <= 0 && o.pause <= 0 && !a.uturn && a.st !== 'coupe' && a.ca * o.ca + a.sa * o.sa < -0.4 && Math.random() < dt * 2.5) {
                a.pause = rnd(0.6, 0.3); o.pause = rnd(0.6, 0.3);
                if (a.st === 'cherche' && o.st === 'retour' && (o.carry || o.rep)) a.uturn = wrap(o.a + Math.PI - a.a) || 0.01;
              }
            } else if (!ecit && o.sp === SP.eciton) {
              if (d < L * 4.5) {
                a.fleeA = a.role === 'soldat' ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx); a.fleeK = 1; a.alarm = 1;
                if (a.sp === SP.lasius) dep(ALARM, a.x, a.y, 3 * dt, 20);
              }
            } else if (ecit && a.st === 'chasse' && !a.carry && !a.sold && o.sp === SP.lasius && d < L * 0.8 && Math.random() < dt * 1.5) {
              o.st = 'nid'; o.tIn = rnd(40, 20); o.carry = null; o.rep = false; o.x = -99; o.y = -99; o.label = 0;
              a.carry = 'proie';
            }
          }
          if (ecit && a.st === 'chasse') a.pt = bp;
        }

        let cutting = 0, raiders = 0;
        for (const a of ALL) {
          if (a.st === 'nid') continue;
          upd(a, dt, t);
          if (a.st === 'coupe') cutting++;
          if (a.sp === SP.eciton && a.st !== 'nid') raiders++;
        }

        /* collemboles */
        for (let i = prey.length - 1; i >= 0; i--) {
          const p = prey[i];
          if (p.dead) { prey.splice(i, 1); continue; }
          p.fade = Math.min(1, p.fade + dt * 0.5);
          if (p.hop > 0) { p.hop -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
          else {
            p.still -= dt;
            if (p.still < 0) {
              p.a += gauss() * 1.5 * Math.sqrt(dt);
              p.x += Math.cos(p.a) * 7 * kS * dt; p.y += Math.sin(p.a) * 7 * kS * dt;
              if (p.still < -rnd(6, 2)) p.still = rnd(4, 1);
            }
            let tx = 0, ty = 0, th = false;
            const R = 42 * kS;
            for (let gy = hcy(p.y - R); gy <= hcy(p.y + R); gy++) for (let gx = hcx(p.x - R); gx <= hcx(p.x + R); gx++) for (const o of BK[gy * HW + gx]) {
              if (o.prey || o.sp !== SP.eciton) continue;
              if (Math.hypot(o.x - p.x, o.y - p.y) < R) { tx = o.x; ty = o.y; th = true; }
            }
            if (finger.on && Math.hypot(finger.x - p.x, finger.y - p.y) < R * 1.4) { tx = finger.x; ty = finger.y; th = true; }
            if (th && Math.random() < dt * 5) {
              const an = Math.atan2(p.y - ty, p.x - tx) + rnd(0.9, -0.9), v = rnd(200, 130) * kS * 0.7;
              p.hop = 0.28; p.vx = Math.cos(an) * v; p.vy = Math.sin(an) * v; p.a = an + rnd(1, -1);
            }
          }
          if (p.x < 6 || p.x > W - 6) { p.vx = -p.vx; p.x = clamp(p.x, 6, W - 6); }
          if (p.y < 6 || p.y > H - 6) { p.vy = -p.vy; p.y = clamp(p.y, 6, H - 6); }
        }
        if (prey.length < nP && Math.random() < dt * 0.15) prey.push(mkPrey());
        if (DEC && keep.more && T > nextFoodT && foods.filter((f) => f.amt > 0).length < 2) {
          // une nouvelle goutte, ailleurs : les éclaireuses doivent tout recommencer
          for (let k = 0; k < 30; k++) {
            const an = rnd(TAU), d = rnd(0.62, 0.3) * VW, x = nestL.x + Math.cos(an) * d, y = nestL.y + Math.sin(an) * d;
            if (x < VX0 + 60 || x > VX0 + VW - 60 || y < 70 || y > H - 50 || pebbles.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + 50)) continue;
            addSugar(x, y, rnd(320, 200)); toast('Une nouvelle goutte de sucre, quelque part…'); break;
          }
          nextFoodT = T + rnd(110, 70);
        }
        if (PONT && (T - lastBr) > 0.5) {
          lastBr = T; let up = 0, dn = 0;
          for (const a of colL.ants) { if (a.st === 'nid') continue; const i = gi(a.x, a.y); if (i >= 0) { if (BR[i] === 1) up++; else if (BR[i] === 2) dn++; } }
          brHist.push([T, up, dn]); if (brHist.length > 600) brHist.shift();
        }

        for (let i = foods.length - 1; i >= 0; i--) {
          const f = foods[i];
          if (f.amt <= 0) { if (f.id) { spent.push({ id: f.id, found: f.found, end: T, t0: f.t0 }); if (!SOC) toast(`Le sucre n° ${f.id} est épuisé : plus personne ne renforce sa piste, elle va s’évaporer.`); } foods.splice(i, 1); continue; }
          f.r = Math.max(2, (f.kind === 'sucre' ? 11 : 9) * kS * 0.8 * Math.sqrt(f.amt / f.amt0));
        }
        for (let i = leaves.length - 1; i >= 0; i--) {
          const lf = leaves[i];
          lf.fade = clamp(lf.fade + (lf.dying ? -dt * 0.4 : dt * 2), 0, 1);
          if (lf.dying && lf.fade <= 0) leaves.splice(i, 1);
        }

        if (snd()) {
          if (cutting && t - lastChirp > 0.07 && Math.random() < Math.min(0.8, cutting * 0.05)) { lastChirp = t; au.noise(0.05, 0.018, rnd(6500, 4800), 9, 'bandpass'); }
          if (raiders > 20 && t - lastRustle > 0.35) { lastRustle = t; au.noise(0.5, Math.min(0.03, raiders * 0.00015), rnd(3200, 2200), 0.8, 'bandpass'); }
        }
        return nOut;
      }

      /* rendu */
      const wearB = buf(GW, GH), chemB = buf(GW, GH), trailB = buf(GW, GH);
      let trailT = 0;
      function trailPaint() {
        // la phéromone de piste, en ambre ; une piste fraîche et très parcourue brille davantage
        const d = trailB.d, F = colL.F;
        for (let i = 0; i < NG; i++) { const o = i * 4, v = Math.min(1, F[i] * 0.7); d[o] = 255; d[o + 1] = 170; d[o + 2] = 50; d[o + 3] = Math.pow(v, 0.6) * 150; }
        trailB.flush();
      }
      let wearT = 0;
      function wearPaint() {
        const d = wearB.d;
        for (let i = 0; i < NG; i++) { const o = i * 4; d[o] = 170; d[o + 1] = 144; d[o + 2] = 110; d[o + 3] = Math.min(105, WEAR[i] * 150); }
        wearB.flush();
      }
      function chemPaint() {
        const d = chemB.d, lF = colL.F, lH = colL.Hm, aF = colA.F, aH = colA.Hm, eF = colE.F;
        for (let i = 0; i < NG; i++) {
          const o = i * 4, lf = lF[i], lh = lH[i], af = aF[i], ah = aH[i], ef = eF[i], al = ALARM[i];
          d[o] = lf * 6 + af * 10 + ef * 34 + al * 70;
          d[o + 1] = lf * 22 + lh * 2 + af * 36 + ah * 5 + al * 12;
          d[o + 2] = lf * 34 + lh * 7 + ef * 30 + ah * 2;
        }
        chemB.flush();
      }
      function drawFoods() {
        for (const f of foods) {
          const r = f.r;
          if (f.kind === 'sucre') {
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(f.x + r * 0.25, f.y + r * 0.35, r * 1.05, r * 0.9, 0, 0, TAU); ctx.fill();
            const g = ctx.createRadialGradient(f.x - r * 0.3, f.y - r * 0.35, r * 0.1, f.x, f.y, r);
            g.addColorStop(0, 'rgba(255,226,150,.95)'); g.addColorStop(0.5, 'rgba(232,150,40,.88)'); g.addColorStop(1, 'rgba(150,80,16,.92)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.88, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(f.x - r * 0.35, f.y - r * 0.38, r * 0.26, r * 0.14, -0.6, 0, TAU); ctx.fill();
          } else {
            const pt = (i, k) => { const an = f.rot + (i / 9) * TAU, rr = r * f.pts[i] * k; return [f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr]; };
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath();
            for (let i = 0; i < 9; i++) { const [x, y] = pt(i, 1); ctx.lineTo(x + r * 0.25, y + r * 0.35); }
            ctx.fill();
            const g = ctx.createRadialGradient(f.x - r * 0.3, f.y - r * 0.3, 0, f.x, f.y, r * 1.2);
            g.addColorStop(0, '#f3dfb2'); g.addColorStop(0.7, '#d9b47a'); g.addColorStop(1, '#a7773e');
            ctx.fillStyle = g; ctx.beginPath();
            for (let i = 0; i < 9; i++) { const [x, y] = pt(i, 1); ctx.lineTo(x, y); }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(120,80,40,.4)';
            for (const [px, py] of f.pores) { ctx.beginPath(); ctx.arc(f.x + px * r, f.y + py * r, r * 0.09, 0, TAU); ctx.fill(); }
          }
        }
      }
      function drawPrey() {
        for (const p of prey) {
          const h = p.hop > 0 ? Math.sin(Math.PI * (1 - p.hop / 0.28)) : 0, L = p.L;
          ctx.globalAlpha = p.fade;
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x + 2 + h * 6, p.y + 3 + h * 8, L * 0.5 * (1 - h * 0.3), L * 0.22, p.a, 0, TAU); ctx.fill();
          const y = p.y - h * 14 * kS, ca = Math.cos(p.a), sa = Math.sin(p.a), s = 1 + h * 0.2;
          ctx.fillStyle = `hsl(${p.hue | 0},14%,62%)`; ctx.beginPath(); ctx.ellipse(p.x, y, L * 0.5 * s, L * 0.21 * s, p.a, 0, TAU); ctx.fill();
          ctx.fillStyle = `hsl(${p.hue | 0},18%,74%)`; ctx.beginPath(); ctx.ellipse(p.x + ca * L * 0.45, y + sa * L * 0.45, L * 0.16 * s, L * 0.15 * s, p.a, 0, TAU); ctx.fill();
          ctx.strokeStyle = `hsla(${p.hue | 0},14%,70%,.8)`; ctx.lineWidth = 0.7; ctx.beginPath();
          for (let k = -1; k <= 1; k += 2) { ctx.moveTo(p.x + ca * L * 0.55, y + sa * L * 0.55); ctx.lineTo(p.x + Math.cos(p.a + k * 0.5) * L * 0.95, y + Math.sin(p.a + k * 0.5) * L * 0.95); }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      const ROLES = { ouvrière: 'ouvrière', soldat: 'soldat', minime: 'minime' };
      function drawLabel(a) {
        const al = Math.min(1, a.label, (6 - a.label) * 2.5);
        if (al <= 0.01) return;
        const side = a.x > W * 0.68 ? -1 : 1, lx = a.x + side * (a.L * 1.4 + 26), ly = a.y - a.L - 22;
        let role = ROLES[a.role];
        if (a.finder) role += ` · a découvert le sucre n° ${a.finder}`;
        if (a.rep) role += ' · gorgée de sucre';
        else if (a.carry === 'feuille') role += ' · porte une feuille';
        else if (a.carry) role += ' · rapporte une proie';
        else if (a.sp === SP.eciton) role += ' · en raid';
        ctx.save();
        ctx.strokeStyle = `rgba(255,240,215,${(al * 0.7).toFixed(3)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.L * 0.95 + 4, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x + side * (a.L * 0.95 + 4) * 0.7, a.y - (a.L * 0.95 + 4) * 0.7); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
        ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 5;
        ctx.textAlign = side > 0 ? 'left' : 'right';
        ctx.fillStyle = `rgba(255,246,230,${(al * 0.95).toFixed(3)})`;
        ctx.font = 'italic 500 14px "Space Grotesk", sans-serif';
        ctx.fillText(a.sp.nom, lx, ly);
        ctx.fillStyle = `rgba(232,205,160,${(al * 0.9).toFixed(3)})`;
        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillText(`${a.sp.fr} · ${role}`.toUpperCase(), lx, ly + 15);
        ctx.restore();
      }

      function hud() {
        const v = env.view || { x0: 0, x1: W }, x0 = v.x0 + 16;
        ctx.save(); ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.textBaseline = 'alphabetic';
        const line = (txt, y, strong) => { const w = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(14,10,6,.62)'; ctx.fillRect(x0 - 6, y - 13, w + 12, 18); ctx.fillStyle = strong ? 'rgba(255,214,140,.95)' : 'rgba(245,232,210,.88)'; ctx.fillText(txt, x0, y); };
        const mm = (t) => (t >= 60 ? Math.floor(t / 60) + ' min ' + String(Math.floor(t % 60)).padStart(2, '0') + ' s' : fr(t) + ' s');
        if (DEC) {
          let out = 0; for (const a of colL.ants) if (a.st !== 'nid') out++;
          let y = H - 18 - 20 * (foods.filter((f) => f.id).length + Math.min(3, spent.length));
          line(`${mm(T)} · ${out} FOURMIS DEHORS SUR ${colL.ants.length} · ${trips} ALLERS-RETOURS CHARGÉS`.toUpperCase(), y, true); y += 20;
          for (const f of foods) {
            if (!f.id) continue;
            let n = 0; for (const a of colL.ants) if (a.st !== 'nid' && a.src === f.id) n++;
            line(f.found == null ? `SUCRE N° ${f.id} · PAS ENCORE TROUVÉ (${mm(T - f.t0)})` : `SUCRE N° ${f.id} · TROUVÉ EN ${mm(f.found - f.t0)} · ${n} FOURMIS L’EXPLOITENT · RESTE ${Math.round((100 * f.amt) / f.amt0)} %`, y); y += 20;
          }
          for (const e of spent.slice(-3)) { line(`SUCRE N° ${e.id} · ÉPUISÉ ${mm(T - e.end)} PLUS TÔT`, y); y += 20; }
        } else if (PONT) {
          const B = bridgeShapes(), lu = bezLen(B.up), ld = bezLen(B.dn);
          // moyenne des dix dernières secondes
          let su = 0, sd = 0; for (const [t, u, d] of brHist) if (T - t < 10) { su += u; sd += d; }
          const tot = su + sd, pu = tot ? su / tot : 0.5;
          const bw = Math.min(460, (v.x1 - v.x0) * 0.6), bx = v.x0 + (v.x1 - v.x0) / 2 - bw / 2, by = 70;
          ctx.fillStyle = 'rgba(14,10,6,.62)'; ctx.fillRect(bx - 10, by - 18, bw + 20, 62);
          ctx.fillStyle = 'rgba(255,200,110,.9)'; ctx.fillRect(bx, by, bw * pu, 12);
          ctx.fillStyle = 'rgba(140,180,255,.85)'; ctx.fillRect(bx + bw * pu, by, bw * (1 - pu), 12);
          ctx.fillStyle = 'rgba(245,232,210,.9)';
          const nu = lateOn ? (keep.bridge === 'egal' ? 'HAUT' : 'COURTE (HAUT)') : 'COURTE : PAS ENCORE LÀ';
          ctx.fillText(`${nu} ${tot ? Math.round(pu * 100) + ' %' : '—'}`, bx, by - 5);
          ctx.textAlign = 'right'; ctx.fillText(`${tot ? Math.round((1 - pu) * 100) + ' %' : '—'} ${keep.bridge === 'egal' ? 'BAS' : 'LONGUE (BAS)'}`, bx + bw, by - 5); ctx.textAlign = 'left';
          // l'histoire : la part de la branche du haut, seconde après seconde
          ctx.strokeStyle = 'rgba(255,200,110,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); let k = 0;
          const H0 = brHist.filter(([t]) => T - t < 240);
          for (let i = 0; i < H0.length; i++) { const [t, u, d] = H0[i]; if (u + d < 3) continue; const xx = bx + bw * ((t - (T - 240)) / 240), yy = by + 38 - (u / (u + d)) * 20; k++ ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.stroke();
          ctx.fillStyle = 'rgba(245,232,210,.6)'; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText('4 DERNIÈRES MINUTES', bx, by + 40);
          line(`${mm(T)} · LONGUEURS : HAUT ${fr(lu / (SP.lasius.L * kS))} FOURMIS, BAS ${fr(ld / (SP.lasius.L * kS))} FOURMIS · ${trips} ALLERS-RETOURS`, H - 18);
        }
        if (toastM && T - toastM.t < 6) {
          const a = Math.min(1, (6 - (T - toastM.t)) * 1.2), cx = (v.x0 + v.x1) / 2;
          ctx.globalAlpha = a; ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; const w = ctx.measureText(toastM.m).width;
          ctx.fillStyle = 'rgba(14,10,6,.7)'; ctx.fillRect(cx - w / 2 - 12, PONT ? 128 : 54, w + 24, 28);
          ctx.fillStyle = '#fff3e0'; ctx.textAlign = 'center'; ctx.fillText(toastM.m, cx, PONT ? 147 : 73); ctx.globalAlpha = 1;
        }
        ctx.restore();
      }

      function wipe(x, y) {
        const r = 18 * kS, R = Math.ceil(r / CS), cx = Math.floor(x / CS), cy = Math.floor(y / CS);
        for (let gy = cy - R; gy <= cy + R; gy++) for (let gx = cx - R; gx <= cx + R; gx++) {
          if (gx < 0 || gy < 0 || gx >= GW || gy >= GH || (gx - cx) ** 2 + (gy - cy) ** 2 > R * R) continue;
          const i = gy * GW + gx;
          colL.F[i] = colL.Hm[i] = colA.F[i] = colA.Hm[i] = colE.F[i] = 0;
        }
      }

      // pré-roulage : les colonies ont déjà tracé leurs pistes
      if (SOC) for (let s = 0; s < 330; s++) step(1 / 15, s / 15);
      T = 0;
      wearPaint();
      quiet = false;
      raid.next = SOC ? 9 : 1e9;
      if (DEC) toast('Les éclaireuses sortent. Aucune ne sait où est le sucre.');
      if (PONT) toast(keep.bridge === 'egal' ? 'Deux branches égales : laquelle la colonie choisira-t-elle ?' : 'Une branche courte, une longue. Aucune fourmi ne peut les comparer.');
      const drones = [];
      if (au && au.live) drones.push(au.drone(73.4, 'sine', 0.018), au.drone(110, 'triangle', 0.005));

      return {
        frame(t, dt) {
          const n = Math.max(1, Math.ceil(dt / 0.05)), h = dt / n;
          for (let i = 0; i < n; i++) step(h, t - dt + h * (i + 1));
          const chem = env.tool === 'chimie';
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(bg.c, 0, 0, W, H);
          if ((wearT -= dt) <= 0) { wearT = 0.5; wearPaint(); }
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(wearB.c, 0, 0, GW * CS, GH * CS);
          for (const lf of leaves) { ctx.globalAlpha = lf.fade; ctx.drawImage(lf.Lr.c, lf.x - lf.c, lf.y - lf.c); }
          ctx.globalAlpha = 1;
          if (keep.trails && !SOC && !chem) {
            if ((trailT -= dt) <= 0) { trailT = 0.15; trailPaint(); }
            ctx.drawImage(trailB.c, 0, 0, GW * CS, GH * CS);
          }
          drawFoods();
          if (chem) {
            ctx.fillStyle = 'rgba(4,3,10,.72)'; ctx.fillRect(0, 0, W, H);
            chemPaint();
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(chemB.c, 0, 0, GW * CS, GH * CS);
            ctx.drawImage(chemB.c, 0, 0, GW * CS, GH * CS);
            ctx.globalCompositeOperation = 'source-over';
          }
          drawPrey();
          const LA = [], AA = [], EA = [];
          for (const a of colL.ants) if (a.st !== 'nid') LA.push(a);
          for (const a of colA.ants) if (a.st !== 'nid') AA.push(a);
          for (const a of colE.ants) if (a.st !== 'nid') EA.push(a);
          A.drawGroup(ctx, LA, SP.lasius, t, SP.lasius.L * kS);
          A.drawGroup(ctx, EA, SP.eciton, t, SP.eciton.L * kS);
          A.drawGroup(ctx, AA, SP.atta, t, SP.atta.L * kS);
          A.drawCarry(ctx, LA); A.drawCarry(ctx, EA); A.drawCarry(ctx, AA);
          for (const a of ALL) if (a.label > 0 && a.st !== 'nid') drawLabel(a);
          hud();
        },
        _step(dt) { step(dt, T); },
        _stats() { let out = 0; for (const a of colL.ants) if (a.st !== 'nid') out++; const b = brHist.slice(-20).reduce((s, [, u, d]) => [s[0] + u, s[1] + d], [0, 0]); return { T: Math.round(T), out, trips, foods: foods.map((f) => [f.id, f.found && Math.round(f.found - f.t0), Math.round(f.amt)]), spent: spent.length, br: b }; },
        sugar() { const v = env.view || { x0: 0, x1: W }; for (let k = 0; k < 30; k++) { const x = rnd(v.x1 - 70, v.x0 + 70), y = rnd(H - 60, 80); if (Math.hypot(x - nestL.x, y - nestL.y) < nestL.r * 3 || pebbles.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + 40)) continue; addSugar(x, y, rnd(200, 120)); break; } },
        wipeAll() { for (const g of [colL.F, colL.Hm]) g.fill(0); toast('Toutes les pistes effacées : il faut tout réapprendre.'); },
        down(p) {
          const tool = env.tool;
          this._wipe = false;
          if (tool === 'nourriture') {
            if (foods.length >= 14) foods.shift();
            foods.push(mkFood(p.x, p.y, Math.random() < 0.45 ? 'sucre' : 'miette'));
            if (snd()) au.pluck(scale(rint(5) + 5, 220), 0.6, 0.04);
            return;
          }
          if (tool === 'feuille') {
            if (leaves.length >= 7) leaves[0].dying = true;
            leaves.push(mkLeaf(p.x, p.y, Math.random() < 0.3 ? 'fleur' : 'feuille'));
            if (snd()) au.noise(0.25, 0.04, 1800, 0.7, 'bandpass', 600);
            return;
          }
          let best = null, bd = 1e9;
          for (const a of ALL) {
            if (a.st === 'nid') continue;
            const d = Math.hypot(a.x - p.x, a.y - p.y);
            if (d < Math.max(18, a.L * 1.7) && d < bd) { bd = d; best = a; }
          }
          if (best) {
            for (const a of ALL) a.label = 0;
            best.label = 6; best.alarm = 1; best.pause = 0.4;
            for (let k = 0; k < 4; k++) dep(ALARM, best.x + rnd(8, -8), best.y + rnd(8, -8), 6, 20);
            if (navigator.vibrate) navigator.vibrate(8);
            if (snd()) au.note(best.sp === SP.eciton ? 520 : best.sp === SP.atta ? 392 : 660, 0.25, 'triangle', 0.04);
            return;
          }
          this._wipe = true; finger.on = true; finger.x = p.x; finger.y = p.y;
          wipe(p.x, p.y);
        },
        move(p) {
          if (!p.down || !this._wipe) return;
          finger.x = p.x; finger.y = p.y;
          wipe(p.x, p.y);
          if (snd() && Math.random() < 0.08) au.noise(0.12, 0.012, 1200, 0.6, 'bandpass');
        },
        up() { finger.on = false; this._wipe = false; },
        dispose() { drones.forEach((d) => d.stop()); },
      };
    }
  }
})();
