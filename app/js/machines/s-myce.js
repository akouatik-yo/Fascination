/* Fascinations — Le Mycélium · le combat (ici), les ronds de sorcières (s-myce-ronds.js), le réseau souterrain (s-myce-reseau.js) */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, layer, buf, diffuse, scale } = window.FK;
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.22;

  const SP = [
    { key: 'neutre', nom: 'Mucor mucedo', fr: 'moisissure du pain · neutre', hy: [228, 226, 214], tip: [255, 250, 236], fluff: [236, 233, 222], spore: [30, 28, 26], stain: [96, 90, 74], v: 6.5, br: 1 / 30, fcap: 14 },
    { key: 'symbiote', nom: 'Laccaria bicolor', fr: 'réseau mycorhizien · symbiotique', hy: [255, 194, 92], tip: [255, 226, 150], fluff: [255, 205, 120], spore: [255, 160, 50], stain: [190, 120, 30], v: 5, br: 1 / 26, fcap: 8 },
    { key: 'craintive', nom: 'Penicillium chrysogenum', fr: 'moisissure bleue · craintive, se protège', hy: [158, 226, 236], tip: [210, 250, 255], fluff: [205, 240, 240], spore: [46, 150, 138], stain: [206, 172, 44], v: 4.5, br: 1 / 22, fcap: 9 },
    { key: 'predatrice', nom: 'Fusarium oxysporum', fr: 'fusariose · prédatrice', hy: [246, 128, 194], tip: [255, 190, 230], fluff: [250, 172, 215], spore: [196, 52, 150], stain: [150, 30, 120], v: 6, br: 1 / 30, fcap: 12 },
  ];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function sprite(c) {
    const s = layer(64, 64), g = s.g, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(0.2, rgba(c, 0.5)); gr.addColorStop(0.5, rgba(c, 0.12)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return s.c;
  }


  // réglages gardés quand la machine est reconstruite
  const keep = { scene: 'combat', sp: 0 };
  const M = (window.FK_MYCE = window.FK_MYCE || {});

  window.FASC.push({
    id: 'mycelium', name: 'Le Mycélium', cat: 'Vivant', glyph: '🜃',
    blurb: 'Moisissures rivales, ronds de sorcières, réseau sous la forêt',
    hint: 'SEMER : une spore germe là où vous touchez · touchez un mycélium dense pour y envoyer une onde · NOURRIR, TRACER, GRATTER, OMBRER, ARROSER selon la scène.',
    intro: 'Le mycélium est la partie cachée des champignons : un réseau de filaments microscopiques, les hyphes, qui explore le sol, digère ce qu’il touche et relie les êtres vivants entre eux. Trois échelles : quatre moisissures qui se disputent un substrat, une prairie où des cercles s’élargissent d’année en année, une forêt dont les racines échangent sucre et minéraux avec un champignon.',
    legend: [
      { color: '#e4e2d6', name: 'Mucor mucedo', role: 'le combat · neutre', desc: 'Pousse vite et s’arrête au contact des autres. En vieillissant, devient cotonneuse et se couvre de sporanges noirs.' },
      { color: '#ffc25c', name: 'Laccaria bicolor', role: 'le combat · symbiotique', desc: 'Cherche les autres espèces et s’entrelace avec elles. À chaque rencontre, elle enrichit le sol et échange des signaux lumineux.' },
      { color: '#9ee2ec', name: 'Penicillium chrysogenum', role: 'le combat · craintive', desc: 'Fuit les autres, diffuse de la pénicilline autour d’elle et trace des lignes noires de défense que personne ne franchit.' },
      { color: '#f682c2', name: 'Fusarium oxysporum', role: 'le combat · prédatrice', desc: 'Fonce sur les autres colonies et les dévore. Freinée par l’antibiotique, arrêtée par les lignes de défense.' },
    ],
    about: [
      'Chaque filament ne pousse que par sa pointe. Il se ramifie quand le substrat est riche, évite ses propres filaments pour mieux couvrir l’espace, et fusionne parfois avec eux : c’est l’anastomose. Un gramme de sol forestier peut contenir des dizaines de mètres d’hyphes.',
      'Le combat : les comportements des quatre espèces sont stylisés, mais s’inspirent du réel. Penicillium produit bien de la pénicilline, qui tue les bactéries (Alexander Fleming, 1928, une boîte de Petri contaminée) ; les lignes noires de démarcation s’observent dans le bois dit « spalté », là où deux champignons se sont affrontés. Des signaux électriques parcourent réellement les réseaux fongiques ; leur rôle reste discuté.',
      'Les ronds de sorcières : une spore germe, le mycélium s’étend en disque, épuise la matière organique au centre et ne survit plus qu’au bord. Le disque devient un anneau qui s’élargit de quelques dizaines de centimètres par an. Au front, le champignon libère de l’azote : l’herbe y est plus verte ; là où son feutrage rend le sol imperméable, elle jaunit en été. Les champignons sortent sur l’anneau à l’automne. Deux anneaux qui se rencontrent s’annulent : derrière chaque front, il n’y a plus rien à manger. On cite un rond de près de 600 m de diamètre près de Belfort, âgé de plusieurs siècles.',
      'Le réseau souterrain : la plupart des plantes vivent en mycorhize (du grec mykês, champignon, et rhiza, racine). Le champignon enveloppe les racines et leur apporte eau, phosphore et azote, qu’il va chercher bien plus loin qu’elles ; la plante le paie en sucres, une part notable de ce qu’elle produit. L’échange est surveillé des deux côtés : une plante donne plus de sucre aux champignons qui lui apportent plus de phosphore, et réciproquement (Kiers et al., 2011). Une plante bien fertilisée réduit ce qu’elle donne.',
      'L’idée que les arbres se « partagent » du carbone à travers le réseau, et qu’un vieil arbre nourrisse ses descendants à l’ombre (Suzanne Simard, 1997), a rendu célèbre le wood wide web. Elle est aujourd’hui très discutée : des transferts existent, mais leur importance en forêt reste à démontrer (Karst et al., 2023). Dans la scène, ce partage est une option, éteinte par défaut.',
    ],
    tools: [
      { id: 'semer', label: 'semer', desc: 'Combat : sème l’espèce choisie dans le panneau (touchez un mycélium dense pour y envoyer une onde). Ronds : une spore germe. Réseau : plante un jeune arbre.' },
      { id: 'nourrir', label: 'nourrir', desc: 'Combat : une goutte nourricière. Ronds : un tas de matière organique. Réseau : de l’engrais au pied d’un arbre (il paie moins le champignon).' },
      { id: 'tracer', label: 'tracer', desc: 'Combat : une rainure infranchissable. Ronds : une allée de gravier. Réseau : tranche les hyphes sur votre passage.' },
      { id: 'gratter', label: 'gratter', desc: 'Combat : efface le mycélium sous le doigt. Ronds : retourne la terre (plus de mycélium, ni d’herbe).' },
      { id: 'ombrer', label: 'ombrer', desc: 'Réseau : touchez un arbre pour le mettre à l’ombre (ou l’en sortir).' },
      { id: 'arroser', label: 'arroser', desc: 'Ronds : une pluie fait sortir les champignons sur les anneaux. Réseau : une averse.' },
    ],
    make(env) { return makeMy(env); },
  });

  function makeMy(env) {
    const build = () => (keep.scene === 'ronds' && M.ronds ? M.ronds(env, keep) : keep.scene === 'reseau' && M.reseau ? M.reseau(env, keep) : combat(env));
    let w = build();
    const rebuild = () => { try { w.dispose && w.dispose(); } catch (e) { /* rien */ } w = build(); };
    const api = {
      livePaused: true,
      frame: (t, dt) => w.frame(t, dt), down: (p) => w.down(p), move: (p) => w.move(p), up: () => w.up && w.up(),
      dispose: () => w.dispose && w.dispose(), clear: () => (w.clear ? w.clear() : rebuild()),
      ui() {
        const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: [
          { label: 'Le combat', act: () => { keep.scene = 'combat'; rebuild(); } },
          { label: 'Les ronds de sorcières', act: () => { keep.scene = 'ronds'; rebuild(); } },
          { label: 'Le réseau souterrain', act: () => { keep.scene = 'reseau'; rebuild(); } },
        ] }];
        return L.concat(w.ui ? w.ui() : []);
      },
    };
    if (window.FASC_DEBUG) window.FASC_DEBUG.myce = { keep, get w() { return w; }, scene(id) { keep.scene = id; rebuild(); } };
    return api;
  }

  /* ───────── scène 1 : le combat de quatre moisissures ───────── */
  function combat(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    let quiet = true;
    const snd = () => !quiet && au && au.on;
    const Q = Math.min(2, window.devicePixelRatio || 1);
    const kS = clamp(Math.min(W, H) / 800, 0.75, 1.4);
    const CS = 6, GW = Math.ceil(W / CS), GH = Math.ceil(H / CS), NC = GW * GH;
    const F32 = () => new Float32Array(NC);
    const D = [F32(), F32(), F32(), F32()];
    const N = F32(), N0 = F32(), AB = F32(), TMP = F32(), BIRTH = F32().fill(-1);
    const SA = F32(), SR = F32(), SG = F32(), SB = F32();
    const BAR = new Uint8Array(NC), FL = new Uint8Array(NC), SPO = new Uint8Array(NC);
    const NGR = [0, 1, 2, 3].map(() => new Int32Array(NC).fill(-1));
    const ci = (x, y) => (x < 0 || y < 0 || x >= GW * CS || y >= GH * CS ? -1 : ((y / CS) | 0) * GW + ((x / CS) | 0));
    const RT = 14;
    const cfg = { nut: 1, br: 1, life: true, sen: 210, spont: true, showAB: false, glow: true };
    const cov = [0, 0, 0, 0];
    let covT = 0;
    const jit = (i) => (((i * 2654435761) >>> 0) % 1000) * 0.09;

    /* substrat nourricier */
    const blobs = [];
    for (let i = 0; i < 14; i++) blobs.push([rnd(W), rnd(H), rnd(W * 0.18, W * 0.05), rnd(0.7, 0.25)]);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const x = (gx + 0.5) * CS, y = (gy + 0.5) * CS;
      let n = 0.72 + rnd(0.12);
      for (const b of blobs) { const dx = x - b[0], dy = y - b[1]; n += b[3] * Math.exp(-(dx * dx + dy * dy) / (b[2] * b[2])); }
      N[gy * GW + gx] = N0[gy * GW + gx] = n;
    }
    const bg = layer(W, H);
    {
      const g = bg.g;
      g.fillStyle = '#15110e'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        const x = rnd(W), y = rnd(H), r = rnd(W * 0.25, W * 0.05), light = Math.random() < 0.5;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, light ? 'rgba(70,56,42,.22)' : 'rgba(4,3,2,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      for (const b of blobs) {
        const gr = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
        gr.addColorStop(0, `rgba(92,70,44,${(b[3] * 0.32).toFixed(3)})`); gr.addColorStop(1, 'rgba(92,70,44,0)');
        g.fillStyle = gr; g.fillRect(b[0] - b[2], b[1] - b[2], 2 * b[2], 2 * b[2]);
      }
      for (let i = 0; i < (W * H) / 9; i++) {
        const r = Math.random();
        g.fillStyle = r < 0.5 ? 'rgba(255,230,200,.05)' : 'rgba(0,0,0,.18)';
        g.fillRect(rnd(W), rnd(H), 1, 1);
      }
      for (let i = 0; i < (W * H) / 2500; i++) {
        g.fillStyle = `rgba(${rnd(150, 90) | 0},${rnd(120, 70) | 0},${rnd(90, 50) | 0},${rnd(0.3, 0.1).toFixed(2)})`;
        g.beginPath(); g.arc(rnd(W), rnd(H), rnd(1.4, 0.4), 0, TAU); g.fill();
      }
      const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
      g.fillStyle = v; g.fillRect(0, 0, W, H);
    }

    const HL = layer(W * Q, H * Q), hg = HL.g;
    hg.setTransform(Q, 0, 0, Q, 0, 0); hg.lineCap = 'round'; hg.lineJoin = 'round';
    const GL = layer(Math.ceil(W / 5), Math.ceil(H / 5));
    const WL = layer(W * Q, H * Q), wg = WL.g;
    wg.setTransform(Q, 0, 0, Q, 0, 0); wg.lineCap = 'round'; wg.lineJoin = 'round';
    const ABB = buf(GW, GH);
    const STB = buf(GW, GH);
    const sprW = sprite([255, 255, 255]), sprTip = SP.map((s) => sprite(s.tip));

    /* graphe du réseau */
    const NMAX = 170000, NX = new Float32Array(NMAX), NY = new Float32Array(NMAX), NP = new Int32Array(NMAX), NCH = new Int32Array(NMAX).fill(-1), NNX = new Int32Array(NMAX).fill(-1), NS = new Uint8Array(NMAX);
    let nN = 0;
    function addNode(x, y, p, s) {
      if (nN >= NMAX) return p;
      const n = nN++;
      NX[n] = x; NY[n] = y; NP[n] = p; NS[n] = s;
      if (p >= 0) { NNX[n] = NCH[p]; NCH[p] = n; }
      const c = ci(x, y); if (c >= 0) NGR[s][c] = n;
      return n;
    }

    const tips = [], cnt = [0, 0, 0, 0];
    const TMAX = Math.round(clamp((W * H) / 850, 500, 1700)), SMAX = Math.round(TMAX * 0.42);
    function mkTip(s, x, y, a, gen, node, e) {
      if (cnt[s] >= SMAX) return;
      cnt[s]++;
      tips.push({ s, x, y, a, gen, node, e, w: 0, nz: 0, lx: x, ly: y, dn: 0, bc: rnd(0.5), cd: 0, fd: false });
    }
    const spores = [], rings = [], drops = [], pulses = [];
    let label = null;
    const ER = [], DK = [], BR = [], KN = [], SEG = SP.map(() => [[], [], []]), FLB = SP.map(() => []), SPB = SP.map(() => []), DRB = [];
    let lastSeed = 0, lastFeed = 0, lastBar = 0, lastSym = 0, lastCrk = 0;

    function seed(s, x, y, n) {
      const root = addNode(x, y, -1, s), k = n || rint(3) + 4, a0 = rnd(TAU);
      for (let i = 0; i < k; i++) mkTip(s, x, y, a0 + (i * TAU) / k + rnd(0.3, -0.3), 0, root, 2);
      spores.push({ x, y, s, t: 0 });
      hg.fillStyle = rgba(SP[s].tip, 0.9); hg.beginPath(); hg.arc(x, y, 2.2, 0, TAU); hg.fill();
      if (snd() && performance.now() - lastSeed > 90) { lastSeed = performance.now(); au.pluck(scale(rint(4) + s * 2, 110), 2.6, 0.06); }
    }

    function stain(i, c, a) {
      SA[i] += a; SR[i] += c[0] * a; SG[i] += c[1] * a; SB[i] += c[2] * a;
      if (SA[i] > 1.6) { const k = 1.6 / SA[i]; SA[i] *= k; SR[i] *= k; SG[i] *= k; SB[i] *= k; }
    }

    function pulse(n, dir, b) {
      if (n < 0 || pulses.length >= 700) return;
      const tgt = dir < 0 ? NP[n] : NCH[n];
      if (tgt < 0) return;
      pulses.push({ n, tgt, f: 0, dir, s: NS[n], b });
    }
    function nearNode(s, x, y, R) {
      const c0 = ci(x, y); if (c0 < 0) return -1;
      const gx = c0 % GW, gy = (c0 / GW) | 0;
      for (let r = 0; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x2 = gx + dx, y2 = gy + dy;
        if (x2 < 0 || y2 < 0 || x2 >= GW || y2 >= GH) continue;
        const n = NGR[s][y2 * GW + x2];
        if (n >= 0) return n;
      }
      return -1;
    }

    function symbio(p, i0, t) {
      pulse(p.node, -1, 0.85);
      for (let o = 0; o < 4; o++) {
        if (o === 1 || D[o][i0] < 0.2) continue;
        const n = nearNode(o, p.x, p.y, 2);
        pulse(n, -1, 0.85);
        if (n >= 0 && o !== 2 && Math.random() < 0.35) mkTip(o, p.x, p.y, rnd(TAU), 3, n, 1.6);
      }
      const gx = i0 % GW, gy = (i0 / GW) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x2 = gx + dx, y2 = gy + dy;
        if (x2 >= 0 && y2 >= 0 && x2 < GW && y2 < GH) { const j = y2 * GW + x2; N[j] = Math.min(2.5, N[j] + 0.35); }
      }
      KN.push(p.x, p.y);
      if (snd() && t - lastSym > 0.7) { lastSym = t; const b = rint(5); au.pluck(scale(b + 7, 220), 2.2, 0.035); au.pluck(scale(b + 9, 220), 2.6, 0.03); }
    }

    function grow(p, dt, t) {
      const s = p.s, sp = SP[s], Ds = D[s], i0 = ci(p.x, p.y);
      if (i0 < 0) return false;
      p.cd -= dt;
      const sd = 13, aL = p.a - 0.55, aR = p.a + 0.55, ca = Math.cos(p.a), sa = Math.sin(p.a);
      const il = ci(p.x + Math.cos(aL) * sd, p.y + Math.sin(aL) * sd), ic = ci(p.x + ca * sd, p.y + sa * sd), ir = ci(p.x + Math.cos(aR) * sd, p.y + Math.sin(aR) * sd);
      const fo = (i) => (i < 0 ? 0 : D[0][i] + D[1][i] + D[2][i] + D[3][i] - Ds[i]);
      const ab = (i) => (i < 0 ? 0 : AB[i]);
      let wd = 0;
      wd += ((ir < 0 ? -1 : N[ir]) - (il < 0 ? -1 : N[il])) * 1.6;
      const oc = ic < 0 ? 0 : Ds[ic];
      wd += ((il < 0 ? 2 : Ds[il]) - (ir < 0 ? 2 : Ds[ir])) * 1.4;
      if (oc > 0.95 && p.gen > 0 && Math.random() < dt * 3) return false;
      const fl = fo(il), fr = fo(ir), fc = fo(ic), f0 = fo(i0), a0 = AB[i0];
      p.fd = false;
      if (s === 0) {
        wd += (fl - fr) * 2.2 + (ab(il) - ab(ir)) * 4;
        if (fc > 0.35 && Math.random() < dt * 4) return false;
        if (a0 > 0.55 && Math.random() < dt * 2) return false;
      } else if (s === 1) {
        wd += (fr - fl) * 2.4 + (ab(il) - ab(ir)) * 1.2;
        if (f0 > 0.3 && p.cd <= 0) { p.cd = 5; symbio(p, i0, t); }
      } else if (s === 2) {
        const s2 = 30;
        const jl = ci(p.x + Math.cos(p.a - 0.7) * s2, p.y + Math.sin(p.a - 0.7) * s2), jc = ci(p.x + ca * s2, p.y + sa * s2), jr = ci(p.x + Math.cos(p.a + 0.7) * s2, p.y + Math.sin(p.a + 0.7) * s2);
        const gl = fo(jl), gr = fo(jr), gc = fo(jc);
        wd += (gl - gr) * 6;
        if (gc > 0.3) wd += (gl >= gr ? 1 : -1) * 4;
        if (f0 > 0.22) {
          const gx = i0 % GW, gy = (i0 / GW) | 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const x2 = gx + dx, y2 = gy + dy;
            if (x2 >= 0 && y2 >= 0 && x2 < GW && y2 < GH) BAR[y2 * GW + x2] = 1;
          }
          BR.push(p.x, p.y);
          if (snd() && t - lastBar > 0.25) { lastBar = t; au.noise(0.06, 0.03, rnd(3000, 2200), 12, 'bandpass'); }
          return false;
        }
        AB[i0] = Math.min(3, AB[i0] + dt * 0.9);
      } else {
        wd += (fr - fl) * 3;
        if (a0 > 0) p.e -= a0 * 0.6 * dt;
        if (f0 > 0.15) {
          let got = 0;
          for (let o = 0; o < 3; o++) { const d = D[o][i0]; if (d > 0) { const tk = Math.min(d, 1.6 * dt); D[o][i0] = d - tk; got += tk; } }
          if (got > 0.005) {
            p.fd = true; p.e = Math.min(3, p.e + got * 1.2); p.bc += got * 0.5;
            stain(i0, [70, 18, 40], got * 0.25);
            if (snd() && t - lastFeed > 0.9) { lastFeed = t; au.noise(0.5, 0.025, 170, 1, 'lowpass'); }
          }
        }
      }
      if (s !== 2 ? BAR[i0] : BAR[i0] === 2) return false;
      if (ic >= 0 && (s !== 2 ? BAR[ic] : BAR[ic] === 2)) wd += (p.w >= 0 ? 1 : -1) * 6;
      p.nz += -p.nz * 1.2 * dt + gauss() * 1.0 * Math.sqrt(dt);
      wd += p.nz * 0.55;
      p.w += (clamp(wd, -4, 4) - p.w) * Math.min(1, dt * 6);
      p.a += p.w * dt;
      const nloc = N[i0];
      const ds = sp.v * kS * dt * (0.45 + 0.55 * Math.min(1.3, nloc) / 1.3) * (p.fd ? 1.25 : 1);
      p.x += Math.cos(p.a) * ds; p.y += Math.sin(p.a) * ds;
      if (p.x < 1 || p.y < 1 || p.x > W - 1 || p.y > H - 1) return false;
      const eat = nloc * 0.22 * dt;
      N[i0] = nloc - eat * 0.55;
      p.e = Math.min(3, p.e + eat - ds * 0.014);
      if (p.e <= 0) return false;
      const i1 = ci(p.x, p.y);
      if (i1 >= 0) {
        Ds[i1] = Math.min(3, Ds[i1] + ds * 0.085);
        if (BIRTH[i1] < 0 && Ds[i1] > 0.3) BIRTH[i1] = t;
      }
      const mx = p.x - p.lx, my = p.y - p.ly;
      if (mx * mx + my * my > 6.25) {
        SEG[s][p.gen === 0 ? 0 : p.gen < 3 ? 1 : 2].push(p.lx, p.ly, p.x, p.y);
        if (p.fd) ER.push(p.x, p.y);
        p.lx = p.x; p.ly = p.y;
      }
      p.dn += ds;
      if (p.dn > 8) { p.node = addNode(p.x, p.y, p.node, s); p.dn = 0; }
      p.bc += ds * sp.br * cfg.br * (0.4 + 0.6 * Math.min(1.3, nloc)) * (p.gen > 5 ? 0.6 : 1);
      if (p.bc >= 1) {
        p.bc = 0;
        if (p.e > 0.6 && cnt[s] < SMAX && tips.length < TMAX) {
          p.node = addNode(p.x, p.y, p.node, s); p.dn = 0;
          const side = Math.random() < 0.5 ? -1 : 1;
          mkTip(s, p.x, p.y, p.a + side * rnd(1.05, 0.55), p.gen + 1, p.node, p.e * 0.5);
          p.e *= 0.6; p.a -= side * 0.12;
        }
      }
      return true;
    }

    function step(dt, t) {
      for (let i = tips.length - 1; i >= 0; i--) {
        const p = tips[i];
        if (!grow(p, dt, t)) { cnt[p.s]--; tips[i] = tips[tips.length - 1]; tips.pop(); }
      }
      const v = 85 * kS;
      for (let i = pulses.length - 1; i >= 0; i--) {
        const q = pulses[i];
        let alive = true;
        q.b *= Math.exp(-dt * 0.2);
        const len = Math.max(1, Math.hypot(NX[q.tgt] - NX[q.n], NY[q.tgt] - NY[q.n]));
        q.f += (v * dt) / len;
        while (q.f >= 1 && alive) {
          q.f -= 1; q.n = q.tgt;
          if (q.dir < 0) {
            q.tgt = NP[q.n];
            if (q.tgt < 0) {
              alive = false;
              if (q.b > 0.55) for (let c = NCH[q.n]; c >= 0; c = NNX[c]) if (pulses.length < 700) pulses.push({ n: q.n, tgt: c, f: 0, dir: 1, s: q.s, b: q.b * 0.95 });
            }
          } else {
            const c = NCH[q.n];
            if (c < 0) alive = false;
            else {
              q.tgt = c;
              if (q.b > 0.25) for (let k = NNX[c]; k >= 0; k = NNX[k]) if (pulses.length < 700) pulses.push({ n: q.n, tgt: k, f: q.f, dir: 1, s: q.s, b: q.b * 0.92 });
            }
          }
        }
        if (!alive) { pulses[i] = pulses[pulses.length - 1]; pulses.pop(); }
      }
      if (tips.length && Math.random() < dt * 1.6) { const p = tips[rint(tips.length)]; pulse(p.node, -1, 0.35); }
    }

    function mature(dt, t) {
      const M = Math.min(450, Math.round(3200 * dt));
      for (let k = 0; k < M; k++) {
        const i = rint(NC), b = BIRTH[i];
        if (b < 0) continue;
        let s = 0, m = D[0][i];
        for (let o = 1; o < 4; o++) if (D[o][i] > m) { m = D[o][i]; s = o; }
        const x = ((i % GW) + Math.random()) * CS, y = (((i / GW) | 0) + Math.random()) * CS;
        if (m < 0.3) {
          if (m < 0.12) { BIRTH[i] = -1; FL[i] = 0; SPO[i] = 0; }
          continue;
        }
        const age = t - b;
        if (age < 7) continue;
        const sp = SP[s], ring = 0.5 + 0.5 * Math.cos((TAU * b) / RT);
        stain(i, sp.stain, (s === 0 ? 0.006 : 0.02) * Math.min(1.5, m));
        if (s === 2) AB[i] = Math.min(3, AB[i] + 0.08);
        if (FL[i] < sp.fcap && Math.random() < 0.45 + 0.55 * ring) { FL[i]++; FLB[s].push(x, y); }
        if (age > 16 && SPO[i] < 8 && Math.random() < ring * ring * 0.8) {
          SPO[i]++; SPB[s].push(x, y);
          if (s === 2 && age > 40 && Math.random() < 0.03) DRB.push(x, y, rnd(3.8, 1.6) * kS);
        }
        if (cfg.life && age > cfg.sen + jit(i) && Math.random() < 0.3) {
          for (let o = 0; o < 4; o++) D[o][i] *= 0.55;
          N[i] = Math.min(N0[i] * 1.1, N[i] + 0.3);
          stain(i, [40, 26, 16], 0.06);
          DK.push(x, y);
        }
      }
    }

    function flush() {
      const g = hg;
      if (ER.length || DK.length) {
        g.globalCompositeOperation = 'destination-out';
        g.globalAlpha = 0.3;
        for (let k = 0; k < ER.length; k += 2) g.drawImage(sprW, ER[k] - 5, ER[k + 1] - 5, 10, 10);
        g.globalAlpha = 0.22;
        for (let k = 0; k < DK.length; k += 2) g.drawImage(sprW, DK[k] - 9, DK[k + 1] - 9, 18, 18);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      if (BR.length) {
        g.fillStyle = 'rgba(40,110,110,.18)'; g.beginPath();
        for (let k = 0; k < BR.length; k += 2) { g.moveTo(BR[k] + 3.2, BR[k + 1]); g.arc(BR[k], BR[k + 1], 3.2, 0, TAU); }
        g.fill();
        g.fillStyle = 'rgba(5,4,10,.7)'; g.beginPath();
        for (let k = 0; k < BR.length; k += 2) { g.moveTo(BR[k] + 1.7, BR[k + 1]); g.arc(BR[k], BR[k + 1], 1.7, 0, TAU); }
        g.fill();
      }
      const LW = [1.3, 0.85, 0.55], AL = [0.55, 0.45, 0.38];
      for (let s = 0; s < 4; s++) for (let b = 0; b < 3; b++) {
        const A = SEG[s][b];
        if (!A.length) continue;
        g.beginPath();
        for (let k = 0; k < A.length; k += 4) { g.moveTo(A[k], A[k + 1]); g.lineTo(A[k + 2], A[k + 3]); }
        g.lineWidth = LW[b] * kS; g.strokeStyle = rgba(SP[s].hy, AL[b]); g.stroke();
        A.length = 0;
      }
      for (let s = 0; s < 4; s++) {
        const A = FLB[s];
        if (!A.length) continue;
        g.beginPath();
        for (let k = 0; k < A.length; k += 2) for (let h = 0; h < 3; h++) {
          const an = rnd(TAU), l = rnd(6, 2) * kS, x = A[k], y = A[k + 1];
          g.moveTo(x, y);
          g.quadraticCurveTo(x + Math.cos(an + 0.6) * l * 0.5, y + Math.sin(an + 0.6) * l * 0.5, x + Math.cos(an) * l, y + Math.sin(an) * l);
        }
        g.lineWidth = 0.5; g.strokeStyle = rgba(SP[s].fluff, 0.14); g.stroke();
        A.length = 0;
      }
      for (let s = 0; s < 4; s++) {
        const A = SPB[s];
        if (!A.length) continue;
        const c = SP[s].spore;
        if (s === 0) {
          g.beginPath();
          for (let k = 0; k < A.length; k += 2) { const an = rnd(TAU), l = rnd(5, 2) * kS; g.moveTo(A[k], A[k + 1]); g.lineTo(A[k] + Math.cos(an) * l, A[k + 1] + Math.sin(an) * l); A[k] += Math.cos(an) * l; A[k + 1] += Math.sin(an) * l; }
          g.lineWidth = 0.45; g.strokeStyle = 'rgba(230,226,215,.3)'; g.stroke();
          g.fillStyle = rgba(c, 0.75); g.beginPath();
          for (let k = 0; k < A.length; k += 2) { const r = rnd(1.6, 0.9) * kS; g.moveTo(A[k] + r, A[k + 1]); g.arc(A[k], A[k + 1], r, 0, TAU); }
          g.fill();
        } else {
          const per = s === 2 ? 3 : s === 3 ? 2 : 1, a = s === 2 ? 0.5 : s === 3 ? 0.35 : 0.4, rr = s === 1 ? 0.6 : s === 2 ? 0.95 : 1.2;
          g.fillStyle = rgba(c, a); g.beginPath();
          for (let k = 0; k < A.length; k += 2) for (let h = 0; h < per; h++) {
            const x = A[k] + rnd(3, -3), y = A[k + 1] + rnd(3, -3), r = rr * rnd(1.3, 0.7) * kS;
            g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU);
          }
          g.fill();
        }
        A.length = 0;
      }
      for (let k = 0; k < DRB.length; k += 3) {
        const x = DRB[k], y = DRB[k + 1], r = DRB[k + 2];
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(x + r * 0.25, y + r * 0.35, r, 0, TAU); g.fill();
        const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
        gr.addColorStop(0, 'rgba(255,240,170,.9)'); gr.addColorStop(0.6, 'rgba(225,180,50,.8)'); gr.addColorStop(1, 'rgba(160,110,20,.85)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.38, r * 0.22, 0, TAU); g.fill();
      }
      DRB.length = 0;
      if (KN.length) {
        g.fillStyle = 'rgba(255,214,130,.55)'; g.beginPath();
        for (let k = 0; k < KN.length; k += 2) { g.moveTo(KN[k] + 1.1, KN[k + 1]); g.arc(KN[k], KN[k + 1], 1.1, 0, TAU); }
        g.fill();
      }
      ER.length = 0; DK.length = 0; BR.length = 0; KN.length = 0;
    }

    function stainPaint() {
      diffuse(SA, TMP, GW, GH, 0.08); diffuse(SR, TMP, GW, GH, 0.08); diffuse(SG, TMP, GW, GH, 0.08); diffuse(SB, TMP, GW, GH, 0.08);
      const d = STB.d;
      for (let i = 0; i < NC; i++) {
        const a = SA[i], o = i * 4;
        if (a < 0.004) { d[o + 3] = 0; continue; }
        d[o] = SR[i] / a; d[o + 1] = SG[i] / a; d[o + 2] = SB[i] / a; d[o + 3] = Math.min(150, a * 190);
      }
      STB.flush();
      if (cfg.showAB) {
        const a = ABB.d;
        for (let i = 0; i < NC; i++) { const o = i * 4; a[o] = 80; a[o + 1] = 220; a[o + 2] = 255; a[o + 3] = Math.min(170, AB[i] * 60); }
        ABB.flush();
      }
    }
    function stats() {
      const c = [0, 0, 0, 0];
      for (let i = 0; i < NC; i++) {
        let s = -1, m = 0.3;
        for (let o = 0; o < 4; o++) if (D[o][i] > m) { m = D[o][i]; s = o; }
        if (s >= 0) c[s]++;
      }
      for (let s = 0; s < 4; s++) cov[s] = c[s] / NC;
    }
    function cellsAround(x, y, r, fn) {
      const R = Math.ceil(r / CS), c0 = ci(clamp(x, 0, W - 1), clamp(y, 0, H - 1));
      const gx = c0 % GW, gy = (c0 / GW) | 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x2 = gx + dx, y2 = gy + dy;
        if (x2 < 0 || y2 < 0 || x2 >= GW || y2 >= GH || dx * dx + dy * dy > R * R) continue;
        fn(y2 * GW + x2);
      }
    }
    let wallLast = null;
    function wall(x, y) {
      const a = wallLast || { x, y };
      const d = Math.hypot(x - a.x, y - a.y), n = Math.max(1, Math.ceil(d / 3));
      for (let k = 0; k <= n; k++) cellsAround(a.x + ((x - a.x) * k) / n, a.y + ((y - a.y) * k) / n, 7, (i) => { BAR[i] = 2; });
      wg.strokeStyle = 'rgba(0,0,0,.5)'; wg.lineWidth = 8; wg.beginPath(); wg.moveTo(a.x, a.y); wg.lineTo(x + 0.01, y); wg.stroke();
      wg.strokeStyle = 'rgba(92,80,68,.9)'; wg.lineWidth = 4.5; wg.stroke();
      wg.strokeStyle = 'rgba(236,222,200,.35)'; wg.lineWidth = 1; wg.beginPath(); wg.moveTo(a.x - 1, a.y - 1.4); wg.lineTo(x - 0.99, y - 1.4); wg.stroke();
      wallLast = { x, y };
    }
    function scrape(x, y) {
      const r = 16;
      cellsAround(x, y, r, (i) => {
        for (let o = 0; o < 4; o++) { D[o][i] = 0; NGR[o][i] = -1; }
        BIRTH[i] = -1; FL[i] = 0; SPO[i] = 0; AB[i] *= 0.3; BAR[i] = 0;
        SA[i] *= 0.3; SR[i] *= 0.3; SG[i] *= 0.3; SB[i] *= 0.3;
      });
      for (let i = tips.length - 1; i >= 0; i--) {
        const p = tips[i];
        if (Math.hypot(p.x - x, p.y - y) < r) { cnt[p.s]--; tips[i] = tips[tips.length - 1]; tips.pop(); }
      }
      for (const g of [hg, wg]) {
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.globalCompositeOperation = 'source-over';
      }
    }
    function clearAll() {
      for (const d of D) d.fill(0);
      N.set(N0); AB.fill(0); BAR.fill(0); BIRTH.fill(-1); FL.fill(0); SPO.fill(0);
      SA.fill(0); SR.fill(0); SG.fill(0); SB.fill(0);
      for (const g of NGR) g.fill(-1);
      NCH.fill(-1); NNX.fill(-1); nN = 0;
      tips.length = 0; cnt.fill(0); pulses.length = 0; spores.length = 0; drops.length = 0; rings.length = 0; label = null;
      for (const L of [HL, WL]) { L.g.save(); L.g.setTransform(1, 0, 0, 1, 0, 0); L.g.clearRect(0, 0, L.w, L.h); L.g.restore(); }
      GL.g.clearRect(0, 0, GL.w, GL.h);
      stainPaint(); stats();
    }
    function seedRandom() {
      const v = env.view || { x0: 0, x1: W };
      for (let k = 0; k < 4; k++) seed(rint(4), rnd(v.x1 - 40, v.x0 + 40), rnd(H * 0.9, H * 0.1));
    }
    function seedFour() {
      const v = env.view || { x0: 0, x1: W }, vw = v.x1 - v.x0;
      [[0, 0.22, 0.3], [2, 0.78, 0.28], [1, 0.3, 0.74], [3, 0.8, 0.76]].forEach(([s, fx, fy]) => seed(s, v.x0 + vw * fx, H * fy, 6));
    }

    function spontaneous(t) {
      for (let k = 0; k < 50; k++) {
        const x = rnd(W * 0.94, W * 0.06), y = rnd(H * 0.94, H * 0.06), i = ci(x, y);
        if (i < 0 || N[i] < 0.6 || BAR[i]) continue;
        if (D[0][i] + D[1][i] + D[2][i] + D[3][i] > 0.1) continue;
        seed(rint(4), x, y, 3);
        return;
      }
    }

    function wave(x, y) {
      let any = false;
      for (let s = 0; s < 4; s++) {
        const n = nearNode(s, x, y, 3);
        if (n < 0) continue;
        any = true; pulse(n, -1, 1); pulse(n, 1, 1);
      }
      return any;
    }

    function drawLabel() {
      const L = label, a = Math.min(1, L.t, (6 - L.t) * 2.5);
      if (a <= 0.01) return;
      const sp = SP[L.s], side = L.x > W * 0.68 ? -1 : 1, lx = L.x + side * 46, ly = L.y - 36;
      ctx.save();
      ctx.strokeStyle = rgba(sp.tip, (a * 0.6).toFixed(3)); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(L.x, L.y, 14, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L.x + side * 10, L.y - 10); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
      ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 6;
      ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = `rgba(255,248,236,${(a * 0.95).toFixed(3)})`;
      ctx.font = 'italic 500 14px "Space Grotesk", sans-serif';
      ctx.fillText(sp.nom, lx, ly);
      ctx.fillStyle = rgba(sp.tip, (a * 0.9).toFixed(3));
      ctx.font = '500 9.5px "JetBrains Mono", monospace';
      ctx.fillText(sp.fr.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    /* colonies de départ */
    const port = H > W * 1.1;
    // dans la partie visible de l'écran (les panneaux latéraux cachent les bords)
    const V0 = env.view || { x0: 0, x1: W }, VW = V0.x1 - V0.x0;
    const START = port ? [[0, 0.3, 0.2], [2, 0.72, 0.38], [1, 0.35, 0.62], [3, 0.72, 0.84]] : [[0, 0.22, 0.3], [2, 0.76, 0.28], [1, 0.4, 0.72], [3, 0.8, 0.76]];
    for (const [s, fx, fy] of START) seed(s, V0.x0 + VW * fx, H * fy, 6);
    for (let k = 0; k < 60; k++) { step(1 / 20, k / 20); mature(1 / 20, k / 20); }
    flush(); stainPaint();
    let T0 = 3, stT = 0, abT = 0, glT = 0, nextSp = rnd(30, 20);
    quiet = false;
    const drones = [];
    if (au && au.live) drones.push(au.drone(49, 'sine', 0.03), au.drone(73.4, 'sine', 0.014), au.drone(146.8, 'triangle', 0.004));

    return {
      frame(tt, dt) {
        const n = Math.max(1, Math.ceil(dt / 0.04)), h = dt / n;
        for (let i = 0; i < n; i++) { T0 += h; step(h, T0); }
        const t = T0;
        mature(dt, t);
        flush();
        if ((abT -= dt) <= 0) {
          abT = 0.25; diffuse(AB, TMP, GW, GH, 0.18);
          const f = Math.exp(-0.03 * 0.25); for (let i = 0; i < NC; i++) AB[i] *= f;
        }
        if ((stT -= dt) <= 0) { stT = 0.5; stainPaint(); }
        if ((glT -= dt) <= 0) { glT = 0.2; GL.g.clearRect(0, 0, GL.w, GL.h); GL.g.drawImage(HL.c, 0, 0, GL.w, GL.h); }
        if ((nextSp -= dt) <= 0) { nextSp = rnd(32, 18); if (cfg.spont) spontaneous(t); }
        if ((covT -= dt) <= 0) { covT = 1; stats(); }
        for (const sp of spores) sp.t += dt;
        while (spores.length && spores[0].t > 5) spores.shift();
        for (const r of rings) r.t += dt;
        while (rings.length && rings[0].t > 1.6) rings.shift();
        if (label) { label.t -= dt; if (label.t <= 0) label = null; }
        if (snd() && tips.length > 40 && t - lastCrk > 0.1 && Math.random() < 0.35) { lastCrk = t; au.noise(0.04, Math.min(0.012, tips.length * 0.00001), rnd(9000, 6000), 6, 'bandpass'); }

        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(bg.c, 0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(STB.c, 0, 0, GW * CS, GH * CS);
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i], c = ci(d.x, d.y), k = c < 0 ? 0 : clamp((N[c] - 0.6) / 2.2, 0, 1);
          if (k <= 0.02) { drops.splice(i, 1); continue; }
          const r = d.r * Math.sqrt(k);
          const gr = ctx.createRadialGradient(d.x - r * 0.3, d.y - r * 0.35, r * 0.1, d.x, d.y, r);
          gr.addColorStop(0, 'rgba(255,236,190,.55)'); gr.addColorStop(0.7, 'rgba(200,150,80,.32)'); gr.addColorStop(1, 'rgba(140,100,50,.4)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(d.x - r * 0.35, d.y - r * 0.38, r * 0.16, 0, TAU); ctx.fill();
        }
        if (cfg.showAB) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ABB.c, 0, 0, GW * CS, GH * CS); ctx.globalCompositeOperation = 'source-over'; }
        ctx.drawImage(HL.c, 0, 0, W, H);
        ctx.drawImage(WL.c, 0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        if (cfg.glow) { ctx.globalAlpha = 0.32; ctx.drawImage(GL.c, 0, 0, W, H); }
        for (let s = 0; s < 4; s++) {
          const spr = sprTip[s], z = 7 * kS;
          ctx.globalAlpha = 0.6;
          for (const p of tips) if (p.s === s) { const zz = p.fd ? z * 1.8 : z; ctx.drawImage(spr, p.x - zz / 2, p.y - zz / 2, zz, zz); }
        }
        for (const sp of spores) {
          const a = (1 - sp.t / 5) * (0.6 + 0.4 * Math.sin(sp.t * 5)), z = 26 * kS;
          ctx.globalAlpha = Math.max(0, a); ctx.drawImage(sprTip[sp.s], sp.x - z / 2, sp.y - z / 2, z, z);
        }
        for (const q of pulses) {
          const x = NX[q.n] + (NX[q.tgt] - NX[q.n]) * q.f, y = NY[q.n] + (NY[q.tgt] - NY[q.n]) * q.f, z = (6 + 10 * q.b) * kS;
          ctx.globalAlpha = Math.min(1, q.b); ctx.drawImage(sprTip[q.s], x - z / 2, y - z / 2, z, z);
        }
        for (const r of rings) {
          const k = r.t / 1.6;
          ctx.globalAlpha = (1 - k) * 0.5; ctx.strokeStyle = 'rgba(255,245,225,1)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(r.x, r.y, 8 + k * 60 * kS, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (label) drawLabel();
      },
      down(p) {
        this._mode = null; this._d = 0;
        const tool = env.tool;
        if (tool === 'nourrir') { this._mode = 'nut'; feed(p.x, p.y); return; }
        if (tool === 'tracer') { this._mode = 'mur'; wallLast = null; wall(p.x, p.y); if (snd()) au.noise(0.15, 0.03, 900, 1, 'bandpass'); return; }
        if (tool === 'gratter') { this._mode = 'gratter'; scrape(p.x, p.y); if (snd()) au.noise(0.2, 0.04, 2400, 0.8, 'bandpass'); return; }
        let tot = 0, best = -1, bm = 0;
        const c0 = ci(p.x, p.y);
        if (c0 >= 0) {
          const gx = c0 % GW, gy = (c0 / GW) | 0;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const x2 = gx + dx, y2 = gy + dy;
            if (x2 < 0 || y2 < 0 || x2 >= GW || y2 >= GH) continue;
            for (let s = 0; s < 4; s++) { const v = D[s][y2 * GW + x2]; tot += v; if (v > bm) { bm = v; best = s; } }
          }
        }
        if (tot > 1.2 && wave(p.x, p.y)) {
          label = { x: p.x, y: p.y, s: best, t: 6 }; rings.push({ x: p.x, y: p.y, t: 0 });
          if (navigator.vibrate) navigator.vibrate([5, 25, 5]);
          if (snd()) [0, 2, 4, 7, 9].forEach((d, k) => setTimeout(() => au.pluck(scale(best * 2 + d + 5, 220), 1.6, 0.035), k * 70));
          return;
        }
        if (tool !== 'semer') return;
        const s = keep.sp;
        seed(s, p.x, p.y); this._mode = 'seed'; this._s = s; this._n = 0;
        if (navigator.vibrate) navigator.vibrate(6);
      },
      move(p) {
        if (!p.down || !this._mode) return;
        this._d += Math.hypot(p.dx, p.dy);
        if (this._mode === 'mur') { if (this._d > 4) { this._d = 0; wall(p.x, p.y); } return; }
        if (this._mode === 'gratter') { if (this._d > 5) { this._d = 0; scrape(p.x, p.y); if (snd() && Math.random() < 0.15) au.noise(0.12, 0.02, 2400, 0.8, 'bandpass'); } return; }
        if (this._mode === 'nut' && this._d > 22) { this._d = 0; feed(p.x, p.y); }
        else if (this._mode === 'seed' && this._d > 40 && this._n < 10) { this._d = 0; this._n++; seed(this._s, p.x, p.y, 2); }
      },
      up() { this._mode = null; wallLast = null; },
      dispose() { drones.forEach((d) => d.stop()); },
      livePaused: true,
      clear: clearAll,
      ui() {
        const L = [{ type: 'section', label: 'Le combat' }];
        L.push({ type: 'choice', label: 'Espèce semée (outil SEMER)', value: keep.sp, options: SP.map((sp, i) => ({ id: i, label: sp.nom.split(' ')[0] })), set: (v) => { keep.sp = v; } });
        L.push({ type: 'note', text: SP[keep.sp].nom + ' : ' + SP[keep.sp].fr + '.' });
        SP.forEach((sp, s) => L.push({ type: 'bar', label: sp.nom, color: rgba(sp.tip, 1), value: cov[s] * 1.6, txt: Math.round(cov[s] * 100) + ' % · ' + cnt[s] + ' pointes' }));
        L.push({ type: 'buttons', items: [{ label: 'Une colonie de chaque', act: seedFour }, { label: 'Semer au hasard', act: seedRandom }] });
        L.push({ type: 'section', label: 'Substrat' });
        L.push({ type: 'slider', label: 'Richesse du substrat', min: 0.3, max: 2.5, step: 0.05, value: cfg.nut, fmt: (v) => '×' + v.toFixed(2), set: (v) => { const r = v / cfg.nut; for (let i = 0; i < NC; i++) { N[i] *= r; N0[i] *= r; } cfg.nut = v; } });
        L.push({ type: 'slider', label: 'Ramification', min: 0.4, max: 2.5, step: 0.05, value: cfg.br, fmt: (v) => '×' + v.toFixed(2), set: (v) => { cfg.br = v; } });
        L.push({ type: 'section', label: 'Cycle de vie' });
        L.push({ type: 'toggle', label: 'Les vieilles colonies dépérissent', value: cfg.life, set: (v) => { cfg.life = v; } });
        L.push({ type: 'slider', label: 'Âge du dépérissement', min: 60, max: 600, step: 10, value: cfg.sen, fmt: (v) => Math.round(v / 60 * 10) / 10 + ' min', set: (v) => { cfg.sen = v; } });
        L.push({ type: 'toggle', label: 'Germinations spontanées', value: cfg.spont, set: (v) => { cfg.spont = v; } });
        L.push({ type: 'section', label: 'Affichage' });
        L.push({ type: 'toggle', label: 'Révéler la pénicilline', value: cfg.showAB, set: (v) => { cfg.showAB = v; if (v) stainPaint(); } });
        L.push({ type: 'toggle', label: 'Halo lumineux', value: cfg.glow, set: (v) => { cfg.glow = v; } });
        return L;
      },
    };

    function feed(x, y) {
      const r = 30 * kS, R = Math.ceil(r / CS), c0 = ci(x, y);
      if (c0 < 0) return;
      const gx = c0 % GW, gy = (c0 / GW) | 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x2 = gx + dx, y2 = gy + dy, d = Math.hypot(dx, dy) / R;
        if (d > 1 || x2 < 0 || y2 < 0 || x2 >= GW || y2 >= GH) continue;
        const j = y2 * GW + x2; N[j] = Math.min(3.2, N[j] + 2.2 * (1 - d * d));
      }
      if (drops.length > 40) drops.shift();
      drops.push({ x, y, r: rnd(14, 9) * kS });
      if (snd()) au.note(rnd(760, 560), 0.3, 'sine', 0.035, 380);
    }
  }
})();
