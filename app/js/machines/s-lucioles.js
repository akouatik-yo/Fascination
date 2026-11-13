/* Fascination — Les Lucioles · dialogues de lumière dans la nuit d'été */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
  // gardés d'une construction à l'autre (le mode zen ou une rotation reconstruisent la machine) : rien ne se réinitialise sans demande
  const keep = { scene: 'nuit', cfg: null };
  const { TAU, clamp, rnd, rint, layer, scale } = window.FK;
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.22;
  const css = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  function glow(c) {
    const s = layer(64, 64), g = s.g, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, css(c, 1)); gr.addColorStop(0.16, css(c, 0.5)); gr.addColorStop(0.45, css(c, 0.12)); gr.addColorStop(1, css(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return s.c;
  }
  // Couleurs vraies : chaque espèce émet une bande d'environ 50 nm autour de son pic (λmax), convertie en couleur par les
  // fonctions CIE 1931. Toutes sont jaune-vert, à quelques nanomètres près : les espèces se reconnaissent à leur rythme,
  // pas à leur couleur (c'est ce qu'imitent les femelles Photuris). Les « fausses couleurs », à la demande, aident à les repérer.
  // Pics retenus (à confirmer) : Photinus vers 562 nm (Lall et al., 1980), Photuris vers 552, Lampyris vers 552, Pteroptyx vers 565.
  const LMAX = { carolinus: 562, pyralis: 563, photuris: 552, pteroptyx: 565, lampyris: 552 };
  function bandeLin(pic, fwhm) {
    if (window.FKR && window.FKR.couleur && window.FKR.couleur.bande) return window.FKR.couleur.bande(pic, fwhm);
    const g = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
    let X = 0, Y = 0, Z = 0;
    for (let l = 380; l <= 780; l += 2) {
      const e = Math.exp(-0.5 * Math.pow((l - pic) / (fwhm / 2.3548), 2));
      X += e * (1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2));
      Y += e * (0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1));
      Z += e * (1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8));
    }
    const c = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z].map((v) => Math.max(0, v));
    const m = Math.max(c[0], c[1], c[2]) || 1;
    return c.map((v) => v / m);
  }
  const versSRGB = (v) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
  const SPC = {
    carolinus: { nom: 'Photinus carolinus', fr: 'luciole synchrone', faux: [190, 255, 100], rise: 0.05, dec: 0.13 },
    pyralis: { nom: 'Photinus pyralis', fr: 'luciole « grande ourse »', faux: [255, 204, 76], rise: 0.14, dec: 0.3 },
    photuris: { nom: 'Photuris versicolor', fr: 'luciole femme fatale', faux: [110, 255, 196], rise: 0.05, dec: 0.12 },
    pteroptyx: { nom: 'Pteroptyx malaccae', fr: 'luciole des mangroves', faux: [224, 255, 140], rise: 0.03, dec: 0.08 },
    lampyris: { nom: 'Lampyris noctiluca', fr: 'ver luisant', faux: [96, 255, 150], rise: 1, dec: 1 },
  };
  for (const k in SPC) {
    const sp = SPC[k];
    sp.lin = bandeLin(LMAX[k], 50);
    sp.vrai = sp.lin.map(versSRGB);
    // la couleur affichée : la vraie, sauf si l'on a demandé les fausses couleurs
    Object.defineProperty(sp, 'col', { get() { return keep.cfg && keep.cfg.fausses ? sp.faux : sp.vrai; } });
  }
  const cssHex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  const envF = (sp, a) => { const s = SPC[sp]; return a < s.rise ? a / s.rise : Math.exp(-(a - s.rise) / s.dec); };

  window.FASC.push({
    id: 'lucioles', name: 'Les Lucioles', cat: 'Vivant', glyph: '✳',
    blurb: 'Dialogues de lumière dans la nuit d’été',
    hint: 'OBSERVER : touchez une luciole pour l’identifier · SIGNAL : répondez à un mâle · TORCHE : maintenez pour éclairer · SOUFFLE : glissez · PERTURBER : brisez la synchronie · LÂCHER : ajoutez l’espèce choisie.',
    intro: 'Une nuit d’été où se croisent cinq lucioles du monde entier. Chaque flash est un mot : certaines espèces finissent par clignoter toutes ensemble, d’autres se font la cour par questions-réponses, et une prédatrice imite les femelles pour attirer les mâles… et les dévorer.',
    legend: [
      { color: cssHex(SPC.carolinus.vrai), name: 'Photinus carolinus', role: 'synchrone · Great Smoky Mountains', desc: 'Salves de 5 à 8 flashs, puis l’obscurité. Chaque mâle avance un peu son horloge quand il voit un voisin s’allumer : peu à peu, des vagues de lumière balaient la vallée, puis tout le monde clignote ensemble.' },
      { color: cssHex(SPC.pyralis.vrai), name: 'Photinus pyralis', role: 'dialogue · « grande ourse »', desc: 'Le mâle plonge puis remonte en s’allumant, et trace un J. La femelle, posée dans l’herbe, répond environ deux secondes plus tard. À chaque réponse, il se rapproche.' },
      { color: cssHex(SPC.photuris.vrai), name: 'Photuris versicolor', role: 'femme fatale', desc: 'La femelle imite la réponse des femelles Photinus. Le mâle trompé s’approche… et se fait dévorer.' },
      { color: cssHex(SPC.pteroptyx.vrai), name: 'Pteroptyx malaccae', role: 'synchrone · mangroves d’Asie', desc: 'Des milliers de mâles se posent sur un même arbre et clignotent à l’unisson, presque deux fois par seconde : l’arbre entier s’illumine comme un phare.' },
      { color: cssHex(SPC.lampyris.vrai), name: 'Lampyris noctiluca', role: 'ver luisant · Europe', desc: 'La femelle, sans ailes, grimpe sur une herbe et brille en continu pour attirer les mâles. Elle s’éteint si on la dérange.' },
    ],
    about: [
      'La lumière des lucioles est une lumière froide : une réaction chimique (luciférine et luciférase) convertit presque toute son énergie en lumière, sans chaleur.',
      'La synchronisation obéit au modèle des « oscillateurs couplés par impulsions » (Mirollo et Strogatz, 1990) : chaque luciole est une horloge que les flashs de ses voisines poussent légèrement en avant. Personne ne dirige, et pourtant l’ordre émerge.',
      'Les biologistes parlent aux lucioles avec une petite lampe : répondre deux secondes après le flash d’un mâle Photinus pyralis suffit à le faire venir. Essayez avec l’outil SIGNAL.',
      'La lune et surtout la pollution lumineuse noient leurs signaux : les lucioles se taisent, les couples ne se forment plus. C’est l’une des causes de leur déclin.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une luciole, même éteinte, pour l’identifier et suivre ce qu’elle fait.' },
      { id: 'signal', label: 'signal', desc: 'Touchez pour émettre un bref flash. Répondez environ 2 secondes après le J lumineux d’un mâle Photinus pyralis : il viendra vers vous. Les synchrones proches s’allument aussi.' },
      { id: 'torche', label: 'torche', desc: 'Maintenez pour éclairer : les lucioles se taisent dans la lumière et s’en écartent, comme sous un lampadaire.' },
      { id: 'souffle', label: 'souffle', desc: 'Glissez pour souffler : l’air pousse les lucioles et couche les herbes.' },
      { id: 'perturber', label: 'perturber', desc: 'Touchez pour dérégler les horloges autour de votre doigt, puis regardez la synchronie se reconstruire.' },
      { id: 'lacher', label: 'lâcher', desc: 'Touchez pour lâcher des lucioles de l’espèce choisie dans le panneau (rubrique « Lâcher »).' },
    ],
    make(env) {
      const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
      let quiet = true;
      const snd = () => !quiet && au && au.on;
      const kS = clamp(Math.min(W, H) / 800, 0.7, 1.4), area = clamp((W * H) / 1.2e6, 0.35, 1.3);
      const cfg = keep.cfg || (keep.cfg = { moon: 0.2, poll: 0, eps: 0.1, K: 0.9, trail: 0.5, dialog: true, sel: 'carolinus', fausses: false });
      const timers = [];
      const later = (ms, fn) => timers.push(setTimeout(fn, ms));
      const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0 }; };
      const hor = H * 0.6, v0 = view();
      const moon = { x: v0.x0 + v0.w * 0.8, y: H * 0.14, r: 17 * kS };
      const SPR = {};
      for (const k in SPC) { const v = glow(SPC[k].vrai), fz = glow(SPC[k].faux); Object.defineProperty(SPR, k, { get: () => (cfg.fausses ? fz : v) }); }
      const sprCore = glow([255, 255, 236]), sprSig = glow([255, 238, 205]), sprMoon = glow([190, 210, 255]), sprTorch = glow([255, 228, 176]);

      /* décor */
      const stars = Array.from({ length: Math.round(260 * area) + 80 }, () => ({ x: rnd(W), y: Math.pow(Math.random(), 1.3) * hor * 0.92, r: Math.pow(Math.random(), 3) * 1.5 + 0.4, ph: rnd(TAU), sp: rnd(3, 0.5) }));
      // farL : le fond peint (repli 2D) ; layM : la carte des plans pour le rendu WebGL
      // (rouge : crête lointaine, vert : crête proche, bleu : prairie ; le noir reste au ciel)
      const farL = layer(W, H), layM = layer(W, H);
      {
        const g = farL.g, gm = layM.g;
        const ridge = (base, amp, nT, tH, col, seed, mc) => {
          const n = Math.ceil(W / 3) + 2, hg = new Float32Array(n);
          for (let i = 0; i < n; i++) { const x = i * 3; hg[i] = amp * (0.5 + 0.5 * Math.sin(x * 0.0031 + seed)) + amp * 0.35 * Math.sin(x * 0.011 + seed * 2); }
          for (let k = 0; k < nT; k++) {
            const x0 = rnd(W), h = rnd(tH, tH * 0.4), w = h * rnd(0.32, 0.18), con = Math.random() < 0.65;
            for (let i = Math.max(0, ((x0 - w) / 3) | 0); i < Math.min(n, (x0 + w) / 3 + 1); i++) {
              const u = Math.abs(i * 3 - x0) / w;
              if (u > 1) continue;
              const p = con ? h * (1 - u) * (1 + 0.1 * Math.sin(i * 2.7)) : h * Math.sqrt(1 - u * u) * (0.9 + 0.1 * Math.sin(i * 1.3));
              if (p > hg[i]) hg[i] = p;
            }
          }
          for (const [gg, cc] of [[g, col], [gm, mc]]) {
            gg.fillStyle = cc; gg.beginPath(); gg.moveTo(0, H);
            for (let i = 0; i < n; i++) gg.lineTo(i * 3, base - hg[i]);
            gg.lineTo(W, H); gg.closePath(); gg.fill();
          }
        };
        ridge(hor - H * 0.03, H * 0.05, Math.round(W / 14), H * 0.09, '#0b1222', 1.3, '#ff0000');
        const mist = g.createLinearGradient(0, hor - H * 0.12, 0, hor + H * 0.02);
        mist.addColorStop(0, 'rgba(120,140,190,0)'); mist.addColorStop(0.7, 'rgba(120,140,190,.09)'); mist.addColorStop(1, 'rgba(120,140,190,0)');
        g.fillStyle = mist; g.fillRect(0, hor - H * 0.12, W, H * 0.14);
        ridge(hor, H * 0.025, Math.round(W / 10), H * 0.12, '#060a14', 4.1, '#00ff00');
        gm.fillStyle = '#0000ff'; gm.fillRect(0, hor, W, H - hor);
        const gr = g.createLinearGradient(0, hor, 0, H);
        gr.addColorStop(0, '#060913'); gr.addColorStop(1, '#020305');
        g.fillStyle = gr; g.fillRect(0, hor, W, H - hor);
        const m2 = g.createLinearGradient(0, hor, 0, hor + H * 0.16);
        m2.addColorStop(0, 'rgba(110,130,170,.08)'); m2.addColorStop(1, 'rgba(110,130,170,0)');
        g.fillStyle = m2; g.fillRect(0, hor, W, H * 0.16);
      }
      const midL = layer(W, H), perches = [];
      const tree = { x: v0.x0 + v0.w * 0.2, y: hor + H * 0.06, cx: 0, cy: 0 };
      {
        const g = midL.g;
        g.fillStyle = g.strokeStyle = '#020309'; g.lineCap = 'round';
        const clumps = [];
        const br = (x, y, a, len, w, d) => {
          const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
          g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
          g.quadraticCurveTo((x + x2) / 2 + rnd(len * 0.15, -len * 0.15), (y + y2) / 2, x2, y2); g.stroke();
          if (d === 0) { clumps.push([x2, y2, rnd(28, 15) * kS]); return; }
          const n = d > 4 ? 2 : rint(2) + 2;
          for (let k = 0; k < n; k++) br(x2, y2, a + (k - (n - 1) / 2) * rnd(0.75, 0.45) + rnd(0.2, -0.2), len * rnd(0.8, 0.66), w * 0.66, d - 1);
          if (d < 3) clumps.push([x2, y2, rnd(20, 11) * kS]);
        };
        br(tree.x, tree.y, -Math.PI / 2 + rnd(0.1, -0.1), H * 0.14, 16 * kS, 6);
        g.beginPath();
        for (const [cx, cy, r] of clumps) for (let k = 0; k < 7; k++) {
          const an = rnd(TAU), d = rnd(r * 0.7), rr = r * rnd(0.75, 0.4), x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d;
          g.moveTo(x + rr, y); g.arc(x, y, rr, 0, TAU);
        }
        g.fill();
        let sx = 0, sy = 0;
        for (const [cx, cy, r] of clumps) {
          sx += cx; sy += cy;
          for (let k = 0; k < 4; k++) perches.push([cx + rnd(r, -r) * 0.8, cy + rnd(r, -r) * 0.7, false]);
        }
        tree.cx = sx / clumps.length; tree.cy = sy / clumps.length;
        for (let i = perches.length - 1; i > 0; i--) { const j = rint(i + 1); const t = perches[i]; perches[i] = perches[j]; perches[j] = t; }
        g.beginPath();
        for (let k = 0; k < W / 34; k++) {
          const x = rnd(W), y = hor + rnd(H * 0.05, -H * 0.005), r = rnd(30, 10) * kS;
          for (let j = 0; j < 4; j++) { const xx = x + rnd(r, -r), yy = y + rnd(r * 0.3, -r * 0.4), rr = r * rnd(0.8, 0.4); g.moveTo(xx + rr, yy); g.arc(xx, yy, rr, 0, TAU); }
        }
        g.fill();
        g.strokeStyle = '#03050a'; g.lineWidth = 1;
        g.beginPath();
        for (let k = 0; k < W * 1.4; k++) {
          const x = rnd(W), y = hor + Math.pow(Math.random(), 0.7) * (H - hor), h = (3 + ((y - hor) / (H - hor)) * 22) * rnd(1.2, 0.5) * kS;
          g.moveTo(x, y); g.lineTo(x + rnd(3, -3), y - h);
        }
        g.stroke();
      }
      const blades = [];
      for (let i = 0, n = Math.round(W / 3.2); i < n; i++) {
        const h = (Math.random() < 0.12 ? rnd(175, 110) : rnd(95, 28)) * kS;
        blades.push({ x: rnd(W), h, w: rnd(2.6, 1.1) * kS, c: rnd(0.5, -0.5), ph: rnd(TAU), tx: 0, ty: 0, cx: 0, cy: 0, used: false });
      }
      const puffs = [];
      function grass(t) {
        const gust = 0.05 * Math.sin(t * 0.33) + 0.03 * Math.sin(t * 0.81 + 1);
        for (const b of blades) {
          let w = gust + 0.025 * Math.sin(t * 1.3 + b.x * 0.02 + b.ph);
          for (const p of puffs) {
            const dx = b.x - p.x;
            if (dx > -170 && dx < 170 && p.y > H - b.h - 80) w += p.vx * 0.0012 * (1 - Math.abs(dx) / 170) * p.life;
          }
          const k = clamp(b.c * 0.35 + w, -0.9, 0.9), lean = k * b.h;
          b.tx = b.x + lean; b.ty = H + 2 - b.h * (1 - 0.22 * Math.abs(k));
          b.cx = b.x + lean * 0.25; b.cy = H + 2 - b.h * 0.55;
        }
      }
      const P2 = [0, 0];
      function bladeAt(i, k) {
        const b = blades[i], u = 1 - k;
        P2[0] = u * u * b.x + 2 * u * k * b.cx + k * k * b.tx;
        P2[1] = u * u * (H + 2) + 2 * u * k * b.cy + k * k * b.ty;
        return P2;
      }

      /* lucioles */
      const F = [];
      let ID = 0, gen = 0, VT = 0, couples = 0, eaten = 0;
      const BAND = { carolinus: [0.4, 0.95], pyralis: [0.66, 0.97], photuris: [0.45, 0.86] };
      const SPD = { carolinus: 13, pyralis: 19, photuris: 28 };
      function freeBlade(x) {
        let best = -1, bd = 1e9;
        for (let i = 0; i < blades.length; i++) {
          const b = blades[i];
          if (b.used || b.h < 55 * kS) continue;
          const d = Math.abs(b.x - x) + rnd(40);
          if (d < bd) { bd = d; best = i; }
        }
        if (best >= 0) blades[best].used = true;
        return best;
      }
      function freePerch(x, y) {
        let best = -1, bd = 1e9;
        for (let i = 0; i < perches.length; i++) {
          const p = perches[i];
          if (p[2]) continue;
          const d = Math.hypot(p[0] - x, p[1] - y);
          if (d < bd) { bd = d; best = i; }
        }
        if (best >= 0) perches[best][2] = true;
        return best;
      }
      function mk(sp, sex, x, y, z) {
        const f = { id: ID++, sp, sex: sex || 'm', x, y, z: z || rnd(1, 0.35), vx: rnd(8, -8), vy: rnd(5, -5), th: Math.random(), per: 1, fa: 99, burst: 0, nb: 0, lx: x, ly: y,
          st: 'vol', tgt: null, timer: 0, blade: -1, perch: -1, bk: 0.95, resp: -1, respTo: null, lastF: -99, sup: false, dim: 0, busy: 0, feed: 0, ph: rnd(TAU), dead: false, label: 0 };
        if (sp === 'carolinus') f.per = rnd(9.2, 8.2);
        else if (sp === 'pyralis' && f.sex === 'm') f.per = rnd(6.2, 5.4);
        else if (sp === 'photuris' && f.sex === 'm') f.per = rnd(2.8, 1.9);
        else if (sp === 'pteroptyx') {
          f.perch = freePerch(x, y);
          if (f.perch < 0) return null;
          f.per = 0.56 * rnd(1.06, 0.94); f.z = 0.8; f.st = 'perche';
          f.x = perches[f.perch][0]; f.y = perches[f.perch][1];
        }
        if (((sp === 'pyralis' || sp === 'photuris') && f.sex === 'f') || sp === 'lampyris') {
          f.sex = 'f';
          f.blade = freeBlade(x);
          if (f.blade < 0) return null;
          f.st = 'perche'; f.z = 1; f.bk = sp === 'lampyris' ? rnd(0.5, 0.25) : rnd(0.99, 0.9);
          const p = bladeAt(f.blade, f.bk); f.x = f.lx = p[0]; f.y = f.ly = p[1];
        }
        F.push(f);
        return f;
      }
      function free(f) {
        if (f.blade >= 0) blades[f.blade].used = false;
        if (f.perch >= 0) perches[f.perch][2] = false;
      }
      function spawnEdge(sp) {
        const v = view(), left = Math.random() < 0.5;
        return mk(sp, 'm', left ? v.x0 - 10 : v.x1 + 10, H * rnd(BAND[sp][1], BAND[sp][0]), rnd(1, 0.6));
      }

      const torch = { on: false, x: 0, y: 0, r: 150 * kS };
      const sigs = [];
      const fc = { carolinus: 0, pteroptyx: 0 };
      function supP(f) {
        if (torch.on && Math.hypot(f.x - torch.x, f.y - torch.y) < torch.r) return 1;
        return clamp(cfg.moon * 0.35 + cfg.poll * 0.78, 0, 0.96);
      }
      function flash(f) {
        f.fa = 0; f.sup = Math.random() < supP(f);
        if (!f.sup && fc[f.sp] != null) fc[f.sp]++;
      }
      function couple(src, x, y, R, boost) {
        for (const g of F) {
          if (g.sp !== 'carolinus' || g === src || g.burst > 0) continue;
          const dx = g.x - x, dy = g.y - y;
          if (dx * dx + dy * dy > R * R) continue;
          if (g.th > 0.5) g.th = Math.min(1, g.th + boost);
        }
      }
      function maleFlash(m) {
        flash(m); m.lastF = VT;
        if (m.sup) return;
        for (const g of F) {
          if (g.sex !== 'f' || g.resp > 0 || g.busy > 0 || g.dead) continue;
          if (g.sp !== 'pyralis' && g.sp !== 'photuris') continue;
          if (m.st === 'court' && m.tgt && !m.tgt.virtual && m.tgt !== g) continue;
          const d = Math.hypot(g.x - m.x, g.y - m.y);
          if (d > 290 * kS) continue;
          if (Math.random() < (g.sp === 'pyralis' ? 0.72 : 0.55)) { g.resp = VT + (g.sp === 'pyralis' ? rnd(2.15, 1.85) : rnd(2.4, 1.7)); g.respTo = m; }
        }
      }
      function respawnLater(sp) { const g0 = gen; later(rnd(18000, 10000), () => { if (gen === g0) spawnEdge(sp); }); }

      function upd(f, dt, rP, psiP) {
        f.fa += dt;
        if (f.dim > 0) f.dim -= dt;
        if (f.busy > 0) f.busy -= dt;
        if (f.feed > 0) f.feed -= dt;
        if (f.label > 0) f.label -= dt;
        const sp = f.sp;
        if (f.blade >= 0) { const p = bladeAt(f.blade, f.bk); f.x = p[0]; f.y = p[1]; }
        /* horloges */
        if (sp === 'carolinus') {
          if (f.burst > 0) {
            if (VT >= f.nb) { flash(f); f.burst--; f.nb = VT + 0.47; }
          } else {
            f.th += dt / f.per;
            if (f.th >= 1) {
              f.th = 0; f.burst = rint(3) + 5; f.nb = VT + 0.47; flash(f);
              if (!f.sup) couple(f, f.x, f.y, 235 * kS * (0.6 + 0.4 * f.z), cfg.eps);
            }
          }
        } else if (sp === 'pteroptyx') {
          f.th += dt * (1 / f.per + (cfg.K * rP * Math.sin(TAU * (psiP - f.th))) / TAU);
          if (f.th >= 1) { f.th -= 1; flash(f); }
          if (f.th < 0) f.th += 1;
        } else if (f.sex === 'm' && f.st !== 'couple' && f.st !== 'proie') {
          f.th += dt / f.per;
          if (f.th >= 1) {
            f.th -= 1;
            if (sp === 'pyralis') maleFlash(f);
            else { flash(f); f.per = rnd(2.8, 1.9); }
          }
        }
        if (f.resp > 0 && VT >= f.resp) {
          f.resp = -1; flash(f);
          const m = f.respTo; f.respTo = null;
          if (!f.sup && m && !m.dead && (m.st === 'vol' || m.st === 'court') && VT - m.lastF < 3.4) {
            m.st = 'court'; m.tgt = f; m.timer = 20;
            if (snd()) au.pluck(scale(7 + rint(3), 330), 0.7, 0.016);
          }
        }
        if (f.st === 'perche') return;
        /* vol */
        if (f.st === 'couple') {
          f.timer -= dt;
          const t = f.tgt;
          if (t) { f.x += (t.x + 3 * kS - f.x) * Math.min(1, dt * 4); f.y += (t.y - 1 - f.y) * Math.min(1, dt * 4); }
          if (f.timer <= 0) { f.st = 'vol'; f.tgt = null; f.vy = -18 * kS; f.th = Math.random(); }
          return;
        }
        if (f.st === 'proie') {
          f.timer -= dt;
          const t = f.tgt;
          if (t) { f.x = t.x + 2 * kS; f.y = t.y; }
          if (Math.random() < dt * 16) { f.fa = 0; f.sup = false; }
          if (f.timer <= 0) { f.dead = true; eaten++; respawnLater('pyralis'); if (snd()) au.note(520, 0.7, 'triangle', 0.02, 160); }
          return;
        }
        const spd = SPD[sp] * kS * (0.5 + 0.5 * f.z), tau = 1.4, sig = spd * Math.sqrt(2 / tau), sq = Math.sqrt(dt);
        f.vx += -f.vx / tau * dt + gauss() * sig * sq;
        f.vy += -f.vy / tau * dt + gauss() * sig * sq * 0.7;
        const band = BAND[sp], y0 = H * band[0], y1 = H * band[1];
        if (f.y < y0) f.vy += (y0 - f.y) * 0.8 * dt;
        if (f.y > y1) f.vy -= (f.y - y1) * 0.8 * dt;
        const v = view();
        if (f.x < v.x0 + 15) f.vx += 40 * dt; else if (f.x > v.x1 - 15) f.vx -= 40 * dt;
        if (f.x < -40 || f.x > W + 40) f.vx += (W / 2 - f.x) * 0.02 * dt;
        if (f.st === 'court') {
          const t = f.tgt;
          f.timer -= dt;
          if (!t || (t.dead) || f.timer <= 0) { f.st = 'vol'; f.tgt = null; }
          else {
            const dx = t.x - f.x, dy = t.y - 4 * kS - f.y, d = Math.hypot(dx, dy) || 1, vv = spd * 1.9;
            f.vx += ((dx / d) * vv - f.vx) * dt * 2.2; f.vy += ((dy / d) * vv - f.vy) * dt * 2.2;
            if (d < 7 * kS) {
              if (t.virtual) { f.st = 'vol'; f.tgt = null; }
              else if (t.sp === 'photuris') { f.st = 'proie'; f.timer = 1.4; t.feed = 4; t.busy = 25; }
              else { f.st = 'couple'; f.timer = 30; t.busy = 45; couples++; if (snd()) { au.pluck(scale(9, 330), 1.6, 0.025); au.pluck(scale(11, 330), 1.8, 0.02); } }
            }
          }
        }
        if (sp === 'pyralis' && f.fa < 0.75) { f.vy = (f.fa < 0.22 ? 24 : -42) * kS * f.z; f.vx *= 1 - dt * 3; }
        for (const p of puffs) {
          const dx = f.x - p.x, dy = f.y - p.y, d2 = dx * dx + dy * dy, R = 150 * kS;
          if (d2 < R * R) { const k = (1 - Math.sqrt(d2) / R) * p.life; f.vx += p.vx * k * dt * 2.4; f.vy += p.vy * k * dt * 2.4; }
        }
        if (torch.on) {
          const dx = f.x - torch.x, dy = f.y - torch.y, d = Math.hypot(dx, dy) || 1;
          if (d < torch.r * 1.2) { f.vx += (dx / d) * 30 * kS * dt; f.vy += (dy / d) * 30 * kS * dt; }
        }
        const s = Math.hypot(f.vx, f.vy), mx = spd * 4.5;
        if (s > mx) { f.vx *= mx / s; f.vy *= mx / s; }
        f.x += f.vx * dt; f.y += f.vy * dt;
      }

      function bright(f) {
        if (f.sp === 'lampyris') {
          let b = (0.5 + 0.16 * Math.sin(VT * 0.8 + f.ph)) * (f.dim > 0 ? 0.12 : 1) * (f.busy > 0 ? 0.25 : 1);
          if (torch.on && Math.hypot(f.x - torch.x, f.y - torch.y) < torch.r) b *= 0.2;
          return b;
        }
        let b = f.sup ? 0 : envF(f.sp, f.fa);
        if (f.feed > 0) b = Math.max(b, 0.5 * Math.min(1, f.feed));
        return b;
      }

      /* rendu */
      const TL = layer(Math.ceil(W / 2), Math.ceil(H / 2)), tg = TL.g;
      tg.setTransform(0.5, 0, 0, 0.5, 0, 0); tg.lineCap = 'round';
      function drawGlow(f, b, k) {
        const z = f.z, s = (8 + 46 * b) * z * kS * (k || 1);
        ctx.globalAlpha = Math.min(1, b) * (0.45 + 0.55 * z);
        ctx.drawImage(SPR[f.sp], f.x - s / 2, f.y - s / 2, s, s);
        if (b > 0.22) {
          const c = (2.4 + 4 * b) * z * kS;
          ctx.globalAlpha = Math.min(1, b);
          ctx.drawImage(sprCore, f.x - c / 2, f.y - c / 2, c, c);
        }
      }
      let label = null;
      function roleOf(f) {
        if (f.sp === 'carolinus') return f.burst > 0 ? 'mâle · salve en cours' : 'mâle · attend son tour';
        if (f.sp === 'pteroptyx') return 'mâle · perché, clignote à l’unisson';
        if (f.sp === 'lampyris') return f.dim > 0 ? 'femelle aptère · éteinte, dérangée' : 'femelle aptère · brille en continu';
        if (f.sp === 'photuris') return f.sex === 'f' ? (f.feed > 0 ? 'femelle · dévore sa proie' : 'femelle · imite les Photinus pour les piéger') : 'mâle · flashs verts rapides';
        if (f.sex === 'f') return f.busy > 0 ? 'femelle · fécondée, se tait' : 'femelle · répond aux mâles après 2 s';
        if (f.st === 'court') return f.tgt && f.tgt.virtual ? 'mâle · croit que vous êtes une femelle !' : f.tgt && f.tgt.sp === 'photuris' ? 'mâle · attiré par une femme fatale…' : 'mâle · courtise une femelle';
        if (f.st === 'couple') return 'mâle · accouplement';
        if (f.st === 'proie') return 'mâle · capturé !';
        return 'mâle · cherche une femelle';
      }
      function drawLabel() {
        const f = label.f, a = Math.min(1, label.t, (6 - label.t) * 2.5);
        if (a <= 0.01 || f.dead) return;
        const v0 = env.view || {}, sp = SPC[f.sp], side = f.x > W * 0.65 ? -1 : 1, lx = f.x + side * 46, ly = f.y - 38 < (v0.y0 || 0) + 24 ? f.y + 46 : f.y - 38;
        ctx.save();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = css(sp.col, (a * 0.7).toFixed(3)); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, 13, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(f.x + side * 9, f.y - 9); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
        ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
        ctx.textAlign = side > 0 ? 'left' : 'right';
        ctx.fillStyle = `rgba(250,250,240,${(a * 0.95).toFixed(3)})`;
        ctx.font = 'italic 500 14px "Space Grotesk", sans-serif';
        ctx.fillText(sp.nom, lx, ly);
        ctx.fillStyle = css(sp.col, (a * 0.95).toFixed(3));
        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillText((sp.fr + ' · ' + roleOf(f)).toUpperCase(), lx, ly + 15);
        ctx.restore();
      }

      /* scènes */
      function clearAll() {
        for (const f of F) free(f);
        F.length = 0; label = null; sigs.length = 0; gen++; couples = 0; eaten = 0;
        tg.save(); tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, TL.w, TL.h); tg.restore();
      }
      function populate(kind) {
        keep.scene = kind;
        clearAll();
        const v = view(), rx = () => rnd(v.x1 - 20, v.x0 + 20), ry = (b) => H * rnd(BAND[b][1], BAND[b][0]);
        if (kind === 'nuit' || kind === 'vallee') { const n = Math.round((kind === 'vallee' ? 640 : 220) * area); for (let k = 0; k < n; k++) mk('carolinus', 'm', rx(), ry('carolinus')); }
        if (kind === 'mangrove') { for (let i = 0; i < perches.length; i++) mk('pteroptyx', 'm', perches[i][0], perches[i][1]); for (let k = 0; k < 30; k++) mk('carolinus', 'm', rx(), ry('carolinus')); }
        if (kind === 'nuit') for (let k = 0; k < Math.round(170 * area) + 40; k++) mk('pteroptyx', 'm', tree.cx + rnd(60, -60), tree.cy + rnd(60, -60));
        if (kind === 'nuit' || kind === 'dialogues') {
          const D = kind === 'dialogues';
          for (let k = 0; k < (D ? 32 : 16); k++) mk('pyralis', 'm', rx(), ry('pyralis'));
          for (let k = 0; k < (D ? 12 : 7); k++) mk('pyralis', 'f', rx());
          for (let k = 0; k < (D ? 5 : 3); k++) mk('photuris', 'f', rx());
          for (let k = 0; k < (D ? 12 : 8); k++) mk('photuris', 'm', rx(), ry('photuris'));
          for (let k = 0; k < 6; k++) mk('lampyris', 'f', rx());
        }
      }
      function release(x, y) {
        const s = cfg.sel, R = (a) => rnd(a, -a) * kS;
        if (s === 'carolinus') for (let k = 0; k < 24; k++) mk('carolinus', 'm', x + R(50), y + R(40));
        else if (s === 'pyralis') for (let k = 0; k < 6; k++) mk('pyralis', 'm', x + R(40), y + R(30));
        else if (s === 'pyralisF') for (let k = 0; k < 3; k++) mk('pyralis', 'f', x + R(70));
        else if (s === 'photurisF') mk('photuris', 'f', x);
        else if (s === 'photuris') for (let k = 0; k < 6; k++) mk('photuris', 'm', x + R(40), y + R(30));
        else if (s === 'pteroptyx') for (let k = 0; k < 40; k++) mk('pteroptyx', 'm', x + R(40), y + R(40));
        else if (s === 'lampyris') for (let k = 0; k < 2; k++) mk('lampyris', 'f', x + R(50));
      }
      function desync() { for (const f of F) { f.th = Math.random(); f.burst = 0; } }

      populate(keep.scene);
      grass(0);
      let syncC = 0, rPt = 0, statT = 0, cricT = 1, frogT = 6, lastC = 0, lastP = 0;
      quiet = false;
      const drones = [];
      if (au) drones.push(au.drone(65.4, 'sine', 0.012), au.drone(98, 'sine', 0.005));

      /* ───────── rendu WebGL2 : la nuit en lumière linéaire, développée par la cabine ─────────
         Les lucioles sont de petites sources très lumineuses (HDR) : leur halo naît de la cabine, comme celui du Feu.
         Leur lumière, sommée dans un champ d'éclairement à 1/8 de la résolution, éclaire l'herbe, l'arbre, le sol
         et la brume. Le ciel suit la lune et la pollution lumineuse : les étoiles faibles et la Voie lactée
         s'effacent quand le ciel s'éclaircit. */
      const LIN = {};
      for (const k in SPC) { const fz = SPC[k].faux.map((c) => Math.pow(c / 255, 2.2)); Object.defineProperty(LIN, k, { get: () => (cfg.fausses ? fz : SPC[k].lin) }); }
      let gfx = null;
      try { gfx = makeGfx(); } catch (e) { console.warn('Les Lucioles : repli en 2D', e); gfx = null; }

      function makeGfx() {
        const FG = window.FKGL;
        if (!FG || !FG.cabine) throw new Error('FKGL absent');
        const { GLKit, HEAD } = FG;
        const mobile = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent) || Math.min(W, H) < 520;
        const cs = Math.min(env.dpr || 1, mobile ? 1.25 : 1.5);
        const cw = Math.max(2, Math.round(W * cs)), ch = Math.max(2, Math.round(H * cs));
        const K = GLKit(cw, ch), gl = K.gl;
        const cab = FG.cabine(K);
        const lightT = K.target(Math.max(8, cw >> 3), Math.max(8, ch >> 3), 'h', gl.LINEAR);
        const trailT = K.target(Math.max(2, cw >> 1), Math.max(2, ch >> 1), 'h', gl.LINEAR);
        const tex = (c) => {
          const t = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          return t;
        };
        const layTex = tex(layM.c), midTex = tex(midL.c);
        // bruits fixes calculés une seule fois : nuages et poussière de la Voie lactée, taches de la prairie, cime des forêts
        const noiseT = K.target(cw, ch, 'h', gl.LINEAR);
        K.run(K.program(HEAD + `
uniform vec2 uRes; uniform float uHor; out vec4 o;
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  vec2 q = p - vec2(uRes.x * .62, uHor * .3), r = vec2(.8776 * q.x + .4794 * q.y, -.4794 * q.x + .8776 * q.y);
  o = vec4(fbm(r * .006 + 3.1), smoothstep(.42, .62, fbm(r * vec2(.004, .014) + 11.7)), fbm(p * vec2(.004, .012)), .8 + .4 * vnoise(p * .09));
}`).use().f('uRes', W, H).f('uHor', hor), noiseT);
        const warpT = K.target(cw, ch, 'h', gl.LINEAR);
        K.run(K.program(HEAD + `
uniform vec2 uRes; out vec4 o;
void main(){ vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y); o = vec4(vnoise(p * .32), vnoise(p * .32 + 9.1), 0., 1.); }`).use().f('uRes', W, H), warpT);

        const pBG = K.program(HEAD + `
uniform sampler2D uLay, uLight, uNz; uniform vec2 uRes; uniform float uT, uMoon, uPoll, uHor; uniform vec3 uMP;
out vec4 o;
vec3 skyCol(float y){
  float h = clamp(y / uHor, 0., 1.);
  vec3 zen = mix(vec3(.0012, .0022, .0075), vec3(.008, .018, .05), uMoon);
  vec3 hzn = mix(vec3(.0045, .0075, .018), vec3(.024, .04, .075), uMoon);
  vec3 c = mix(zen, hzn, h * h);
  c = mix(c, c * .6 + vec3(.05, .032, .02) * (.4 + .6 * h * h), uPoll);            // voile lumineux des villes
  c += vec3(.2, .075, .02) * uPoll * uPoll * exp(-(uHor - y) / (uRes.y * .16));    // dôme orangé sur l'horizon
  return c;
}
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y), tc = p / uRes;
  vec4 L4 = texture(uLay, tc);
  vec3 w = L4.rgb * L4.a;                       // crête lointaine, crête proche, prairie
  float ws = clamp(1. - w.r - w.g - w.b, 0., 1.);
  vec3 sky = skyCol(p.y);
  vec4 nz = texture(uNz, vUv);
  // étoiles : la lune et les villes effacent d'abord les plus faibles (magnitude limite)
  float lim = clamp(1. - .7 * uMoon - .9 * uPoll, 0., 1.);
  vec2 cell = floor(p / 3.5), f = p - cell * 3.5;
  float h1 = hash12(cell), h2 = hash12(cell + 17.3), h3 = hash12(cell + 41.9);
  float m = pow(h3, 7.), thr = .9 * (1. - lim) + .004;
  float st = h1 < .045 ? smoothstep(thr, thr * 1.6 + .01, m) : 0.;
  vec2 sp = .6 + vec2(h2, fract(h2 * 7.13)) * 2.3;
  float tw = .7 + .3 * sin(uT * (1.3 + 27. * h1) + h2 * 40.);
  float ext = smoothstep(uHor, uHor * .7, p.y);   // extinction près de l'horizon
  sky += mix(vec3(1., .78, .55), vec3(.7, .82, 1.), fract(h2 * 3.7)) * (m * 2.4 + .035) * st * tw * exp(-dot(f - sp, f - sp) * 2.5) * ext;
  // la Voie lactée : nuages d'étoiles et bandes de poussière, seulement sous un ciel noir
  vec2 q = p - vec2(uRes.x * .62, uHor * .3), r = vec2(.8776 * q.x + .4794 * q.y, -.4794 * q.x + .8776 * q.y);
  float band = exp(-r.y * r.y / (uRes.y * uRes.y * .012));
  float neb = nz.r, dust = nz.g;
  sky += mix(vec3(.55, .62, .9), vec3(.9, .8, .62), band) * .022 * band * (.35 + neb) * (1. - .75 * dust) * lim * lim * ext;
  // la lune (presque sans assombrissement au bord) et son auréole, diffusée vers l'avant par les aérosols
  float dm = length(p - uMP.xy), R = uMP.z, mI = .35 + .65 * uMoon;
  float mar = dm < R + 1. ? vnoise((p - uMP.xy) / R * 2.1 + 5.3) * .6 + vnoise((p - uMP.xy) / R * 5.3 + 1.7) * .4 : 0.;
  sky = mix(sky, vec3(1., .96, .88) * (1. - .28 * smoothstep(.45, .7, mar)) * 4.5 * mI, smoothstep(R + .8, R - .8, dm));
  sky += vec3(.7, .78, 1.) * mI * (.05 * exp(-max(dm - R, 0.) / (R * 1.2)) + .01 * exp(-max(dm - R, 0.) / (R * 6.))) * smoothstep(R - 1., R + 1., dm);
  // les plans du paysage, la brume entre les crêtes et au ras de la prairie
  vec3 Lf = texture(uLight, vUv).rgb;
  vec3 amb = vec3(.006, .01, .02) * uMoon + vec3(.004, .003, .002) * uPoll;
  float tx = nz.a;
  vec3 col = sky * ws + mix(skyCol(uHor), vec3(.002, .003, .007), .55) * tx * w.r;
  float mb = smoothstep(uHor - uRes.y * .13, uHor - uRes.y * .04, p.y) * smoothstep(uHor + uRes.y * .02, uHor - uRes.y * .02, p.y);
  float mist = mb > 0. ? mb * (.45 + .55 * fbm(vec2(p.x * .0035 - uT * .006, p.y * .02))) : 0.;
  col += mist * (vec3(.01, .014, .026) + vec3(.03, .04, .07) * uMoon + vec3(.05, .03, .015) * uPoll) * (1. - w.g - w.b);
  col += (vec3(.0016, .0026, .0055) * tx + amb * .4) * w.g;
  float gy = clamp((p.y - uHor) / (uRes.y - uHor), 0., 1.);
  vec3 grnd = vec3(.0024, .0036, .0042) * (.75 + .5 * nz.b) + amb * .9;
  grnd = mix(grnd + vec3(.003, .005, .01) * (.5 + uMoon), grnd, smoothstep(0., .35, gy));   // la prairie s'éclaircit au loin, dans la brume
  col += (grnd + vec3(.02, .035, .018) * Lf) * w.b;
  float gb = smoothstep(uHor, uHor + uRes.y * .05, p.y) * (1. - .6 * smoothstep(uHor + uRes.y * .1, uRes.y, p.y));
  float gm = gb > 0. ? gb * (.35 + .65 * fbm(vec2(p.x * .006 + uT * .01, p.y * .015 - uT * .004))) : 0.;
  col += gm * (vec3(.006, .009, .016) * (.4 + uMoon) + Lf / (1. + .8 * Lf) * .25);   // la brume sature quand toute la vallée s'allume
  o = vec4(col, 1.);
}`);

        const pTree = K.program(HEAD + `
uniform sampler2D uMid, uLight, uWarp; uniform vec2 uRes; uniform vec3 uMP; uniform float uMoon;
out vec4 o;
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  // bord feuillu : on déforme la silhouette peinte par un bruit fin
  // (le maximum avec la silhouette d'origine garde intacts le tronc, les branches et les tiges fines)
  vec2 tc = p / uRes;
  float a = max(texture(uMid, tc).a, texture(uMid, (p + (texture(uWarp, vUv).rg - .5) * 5.) / uRes).a);
  if (a < .004) discard;
  vec2 e = 1.6 / uRes;
  vec2 n = -vec2(texture(uMid, tc + vec2(e.x, 0.)).a - texture(uMid, tc - vec2(e.x, 0.)).a, texture(uMid, tc + vec2(0., e.y)).a - texture(uMid, tc - vec2(0., e.y)).a);
  float el = length(n); n /= max(el, 1e-4);
  float rim = max(dot(n, normalize(uMP.xy - p)), 0.) * smoothstep(0., .6, el);
  vec3 Lf = texture(uLight, vUv).rgb;
  vec3 moonL = vec3(.03, .045, .08) * uMoon;
  vec3 col = vec3(.012, .02, .012) * (moonL + Lf * 2.2) + moonL * rim * .6 + Lf * (rim * .25 + .015);
  o = vec4(col * a, a);
}`);

        const pAdd = K.program(HEAD + `
uniform sampler2D uT; uniform float uK; out vec4 o;
void main(){ o = vec4(texture(uT, vUv).rgb * uK, 0.); }`);
        const pFade = K.program(HEAD + `
uniform float uK; out vec4 o;
void main(){ o = vec4(0., 0., 0., uK); }`);

        const VS_SPR = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aA; layout(location = 1) in vec4 aC; layout(location = 2) in vec2 aQ;
uniform vec2 uRes;
out vec2 vQ; out vec3 vCol; flat out int vK;
void main(){
  vec2 pos = aA.xy + aQ * aA.z;
  vQ = aQ; vCol = aC.rgb * aA.w; vK = int(aC.a + .5);
  gl_Position = vec4(pos.x / uRes.x * 2. - 1., 1. - pos.y / uRes.y * 2., 0., 1.);
}`;
        // 0 : luciole (tache gaussienne) · 1 : luciole floue, hors de la mise au point · 2 : lumière portée · 3 : lueur douce
        const pSpr = K.program(`#version 300 es
precision highp float;
in vec2 vQ; in vec3 vCol; flat in int vK; out vec4 o;
void main(){
  float r2 = dot(vQ, vQ); if (r2 >= 1.) discard;
  float I;
  if (vK == 0) I = exp(-r2 * 7.);
  else if (vK == 1){ float r = sqrt(r2); I = smoothstep(1., .5, r) * (.8 + .2 * smoothstep(.3, .8, r)); }
  else if (vK == 2) I = (1. - r2) * (1. - r2) / (1. + r2 * 40.);
  else I = (1. - r2) * (1. - r2) * exp(-r2 * 2.5);
  o = vec4(vCol * I, 0.);
}`, VS_SPR);
        const pSeg = K.program(`#version 300 es
precision highp float;
in float vA; in vec3 vCol; out vec4 o;
void main(){ o = vec4(vCol * (1. - vA * vA), 0.); }`, `#version 300 es
precision highp float;
layout(location = 0) in vec4 aS; layout(location = 1) in vec4 aC; layout(location = 2) in vec2 aQ;
uniform vec2 uRes;
out float vA; out vec3 vCol;
void main(){
  vec2 a = aS.xy, b = aS.zw, d = b - a; float L = length(d);
  vec2 t = L > 1e-3 ? d / L : vec2(1., 0.), n = vec2(-t.y, t.x);
  float w = aC.a;
  vec2 pos = mix(a - t * w * .5, b + t * w * .5, aQ.x * .5 + .5) + n * aQ.y * w;
  vA = aQ.y; vCol = aC.rgb;
  gl_Position = vec4(pos.x / uRes.x * 2. - 1., 1. - pos.y / uRes.y * 2., 0., 1.);
}`);
        const NSEG = 7;
        const pGrass = K.program(`#version 300 es
precision highp float;
in vec2 vP; in float vS, vW, vT, vSh; uniform sampler2D uLight; uniform vec2 uRes; uniform float uMoon; out vec4 o;
void main(){
  float cov = clamp(vW - abs(vS) + .5, 0., 1.);
  if (cov <= 0.) discard;
  vec3 Lf = texture(uLight, vec2(vP.x / uRes.x, 1. - vP.y / uRes.y)).rgb;
  vec3 moonL = vec3(.02, .03, .05) * uMoon;
  float edge = clamp(abs(vS) / max(vW, .5), 0., 1.);
  vec3 alb = mix(vec3(.01, .016, .01), vec3(.028, .045, .022), vSh);
  vec3 col = alb * (moonL * (.3 + .7 * vT) + Lf * (1.2 + 1.6 * vT));
  col += Lf * vec3(.35, .5, .2) * .1 * vT;                   // la lumière traverse la lame (translucidité)
  col += vec3(.03, .045, .08) * uMoon * smoothstep(.55, 1., edge) * vT * .5;
  col += vec3(.0012, .0018, .0035) * vT * vT;                 // le haut des herbes reçoit le ciel
  o = vec4(col * cov, cov);
}`, `#version 300 es
precision highp float;
layout(location = 0) in vec4 aB; layout(location = 1) in vec4 aT; layout(location = 2) in vec2 aV;
uniform vec2 uRes; uniform float uN;
out vec2 vP; out float vS, vW, vT, vSh;
void main(){
  float t = aV.x / uN, u = 1. - t;
  vec2 B = vec2(aB.x, uRes.y + 2.), C = aB.zw, T = aT.xy;
  vec2 P = u * u * B + 2. * u * t * C + t * t * T;
  vec2 d = 2. * u * (C - B) + 2. * t * (T - C);
  vec2 n = normalize(vec2(-d.y, d.x) + 1e-6);
  float hw = aB.y * pow(u, .9) + .001, ex = hw + .9;
  vec2 pos = P + n * aV.y * ex;
  vP = pos; vS = aV.y * ex; vW = hw; vT = t; vSh = aT.z;
  gl_Position = vec4(pos.x / uRes.x * 2. - 1., 1. - pos.y / uRes.y * 2., 0., 1.);
}`);

        // tampons : coins du quad, sommets d'une lame, et un tampon d'instances par lot
        const sbuf = (data) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
        const qBuf = sbuf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
        const bv = []; for (let i = 0; i <= NSEG; i++) bv.push(i, -1, i, 1);
        const gBuf = sbuf(new Float32Array(bv));
        const MAXI = 4096;
        function batch(vbuf) {
          const data = new Float32Array(MAXI * 8), buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
          const vao = gl.createVertexArray();
          gl.bindVertexArray(vao);
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          for (let l = 0; l < 2; l++) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 32, l * 16); gl.vertexAttribDivisor(l, 1); }
          gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
          gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(2, 0);
          gl.bindVertexArray(null);
          const B = { data, n: 0, buf, vao,
            push(a, b, c, d, e, f, g, h) { if (B.n >= MAXI) return; const o = B.n++ * 8, D = B.data; D[o] = a; D[o + 1] = b; D[o + 2] = c; D[o + 3] = d; D[o + 4] = e; D[o + 5] = f; D[o + 6] = g; D[o + 7] = h; },
            upload() { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, B.data, 0, B.n * 8); } };
          return B;
        }
        const bFar = batch(qBuf), bNear = batch(qBuf), bTop = batch(qBuf), bLight = batch(qBuf), bSeg = batch(qBuf), bGrass = batch(gBuf);
        function draw(P, B, target, verts) {
          if (!B.n) return;
          B.upload();
          P.use().f('uRes', W, H);
          if (P === pGrass) P.f('uN', NSEG).t('uLight', lightT).f('uMoon', cfg.moon);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, target.w, target.h);
          gl.bindVertexArray(B.vao);
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, verts, B.n);
          gl.bindVertexArray(null);
        }

        const G = { lost: false };
        K.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); G.lost = true; });
        let trailOn = false, soft = 0;
        // une luciole : son cœur (net ou flou selon la distance) et sa lumière portée
        function fly(B, f, b, k) {
          const z = f.z, c = LIN[f.sp], r = (2.2 + 2.2 * b) * Math.sqrt(z) * kS * (k || 1), I = b * 16 * (0.35 + 0.65 * z);
          if (z > 0.95 && f.st !== 'perche') {
            const R = 3 + (z - 0.95) * 140 * kS;
            B.push(f.x, f.y, R, I * Math.min(1, (r / R) * (r / R)) * 1.6, c[0], c[1], c[2], 1);
          } else B.push(f.x, f.y, r, I, c[0], c[1], c[2], 0);
          // la lueur de la lanterne dans l'air humide, puis la lumière portée sur ce qui l'entoure
          B.push(f.x, f.y, (4 + 11 * b) * z * kS, b * 0.12 * (1 - 0.6 * soft), c[0], c[1], c[2], 3);
          bLight.push(f.x, f.y, 110 * kS * (0.6 + 0.4 * z), b * (f.sp === 'lampyris' ? 0.22 : 0.3) * (1 - 0.82 * soft), c[0], c[1], c[2], 2);
        }
        G.draw = function (dt, nP) {
          bFar.n = bNear.n = bTop.n = bLight.n = bSeg.n = bGrass.n = 0;
          // mode doux (photosensibilité) : quand des centaines de lucioles s'allument ensemble, l'éclairage d'ensemble
          // ne doit pas faire clignoter tout l'écran ; on le réduit fortement et l'on garde des points nets
          soft = env.doux ? 1 : 0;
          const trail = cfg.trail > 0.01;
          for (const f of F) {
            const b = bright(f);
            if (trail && f.st !== 'perche' && b > 0.08) {
              const c = LIN[f.sp], k = b * 1.6;
              bSeg.push(f.lx, f.ly, f.x + 0.01, f.y, c[0] * k, c[1] * k, c[2] * k, (0.6 + 1.1 * f.z) * kS);
            }
            if (b <= 0.02) continue;
            if (f.blade >= 0) fly(bTop, f, b, f.sp === 'lampyris' ? 0.7 : 1);
            else if (f.sp === 'pteroptyx' || (f.st !== 'perche' && f.z >= 0.6)) fly(bNear, f, b);
            else fly(bFar, f, b);
          }
          for (const f of F) { f.lx = f.x; f.ly = f.y; }
          for (const s of sigs) {
            const b = s.a < 0.1 ? s.a / 0.1 : Math.exp(-(s.a - 0.1) / 0.28);
            bTop.push(s.x, s.y, 5 * kS, b * 40, 1, 0.86, 0.66, 0);
            bTop.push(s.x, s.y, (14 + 70 * b) * kS, b * 0.5, 1, 0.86, 0.66, 3);
            bLight.push(s.x, s.y, 200 * kS, b * 0.6, 1, 0.86, 0.66, 2);
          }
          if (torch.on) {
            bTop.push(torch.x, torch.y, 7 * kS, 30, 1, 0.9, 0.72, 0);
            bTop.push(torch.x, torch.y, torch.r * 1.6, 0.35, 1, 0.9, 0.72, 3);
            bLight.push(torch.x, torch.y, torch.r * 2.2, 0.9, 1, 0.9, 0.72, 2);
          }
          for (const b of blades) bGrass.push(b.x, b.w, b.cx, b.cy, b.tx, b.ty, (b.ph / TAU) * 0.8 + 0.2, 0);

          gl.enable(gl.BLEND);
          // 1. champ d'éclairement des lucioles (1/8 de la résolution)
          K.clear(lightT);
          gl.blendFunc(gl.ONE, gl.ONE);
          draw(pSpr, bLight, lightT, 4);
          // 2. pose longue : la traînée s'efface, puis les nouveaux segments s'y ajoutent
          if (trail) {
            gl.blendFunc(gl.ZERO, gl.SRC_ALPHA);
            pFade.use().f('uK', Math.exp(-dt * (0.18 + (1 - cfg.trail) * 6)));
            K.run(pFade, trailT);
            gl.blendFunc(gl.ONE, gl.ONE);
            draw(pSeg, bSeg, trailT, 4);
            trailOn = true;
          } else if (trailOn) { K.clear(trailT); trailOn = false; }
          // 3. le fond : ciel, lune, crêtes, brume, prairie
          gl.disable(gl.BLEND);
          pBG.use().t('uLay', layTex).t('uLight', lightT).t('uNz', noiseT).f('uRes', W, H).f('uT', VT).f('uMoon', cfg.moon).f('uPoll', cfg.poll).f('uHor', hor).f('uMP', moon.x, moon.y, moon.r);
          K.run(pBG, cab.scene);
          gl.enable(gl.BLEND);
          // 4. lucioles lointaines, derrière l'arbre
          gl.blendFunc(gl.ONE, gl.ONE);
          draw(pSpr, bFar, cab.scene, 4);
          // 5. l'arbre et les buissons, éclairés par la lune et par les lucioles
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          pTree.use().t('uMid', midTex).t('uLight', lightT).t('uWarp', warpT).f('uRes', W, H).f('uMP', moon.x, moon.y, moon.r).f('uMoon', cfg.moon);
          K.run(pTree, cab.scene);
          // 6. lucioles proches et Pteroptyx de l'arbre, puis les traînées
          gl.blendFunc(gl.ONE, gl.ONE);
          draw(pSpr, bNear, cab.scene, 4);
          if (trail) { pAdd.use().t('uT', trailT).f('uK', 1); K.run(pAdd, cab.scene); }
          // 7. les herbes du premier plan
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          draw(pGrass, bGrass, cab.scene, 2 * (NSEG + 1));
          // 8. les femelles perchées au bout des herbes, le signal et la torche
          gl.blendFunc(gl.ONE, gl.ONE);
          draw(pSpr, bTop, cab.scene, 4);
          gl.disable(gl.BLEND);
          // 9. développement : halo, courbe filmique, vignettage, grain de pellicule de nuit
          cab.finish({ expo: 1.8, bloom: soft ? 0.55 : 1.0, thr: 0.8, knee: 0.6, radius: 0.8, vig: 0.45, grain: 0.045, grainBlack: 0.5, sat: 1.05 });
          ctx.save();
          ctx.globalCompositeOperation = 'copy';
          ctx.drawImage(K.canvas, 0, 0, W, H);
          ctx.restore();
        };
        G.lose = () => K.lose();
        return G;
      }

      /* rendu 2D (repli sans WebGL2) */
      function draw2D(dt, nP) {
        /* ciel */
        const top = mix([3, 5, 14], [16, 26, 56], cfg.moon), hz = mix(mix([12, 16, 38], [38, 50, 88], cfg.moon), [130, 74, 34], cfg.poll * 0.8);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        const sg = ctx.createLinearGradient(0, 0, 0, hor);
        sg.addColorStop(0, css(top, 1)); sg.addColorStop(0.65, css(mix(top, hz, 0.5), 1)); sg.addColorStop(1, css(hz, 1));
        ctx.fillStyle = sg; ctx.fillRect(0, 0, W, hor + 4);
        const sa = Math.max(0, 1 - cfg.moon * 0.65 - cfg.poll * 0.85);
        if (sa > 0.02) {
          ctx.fillStyle = '#e8eeff';
          for (const s of stars) { ctx.globalAlpha = sa * (0.5 + 0.5 * Math.sin(VT * s.sp + s.ph)) * Math.min(1, s.r); ctx.fillRect(s.x, s.y, s.r, s.r); }
        }
        ctx.globalCompositeOperation = 'lighter';
        if (cfg.moon > 0.02) {
          const m = cfg.moon, gs = 300 * kS;
          ctx.globalAlpha = m * 0.45; ctx.drawImage(sprMoon, moon.x - gs / 2, moon.y - gs / 2, gs, gs);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.35 + 0.65 * m; ctx.fillStyle = '#eef2ff';
          ctx.beginPath(); ctx.arc(moon.x, moon.y, moon.r, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(150,160,190,.35)';
          ctx.beginPath(); ctx.arc(moon.x - moon.r * 0.3, moon.y - moon.r * 0.2, moon.r * 0.28, 0, TAU); ctx.arc(moon.x + moon.r * 0.35, moon.y + moon.r * 0.25, moon.r * 0.2, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
        }
        if (cfg.poll > 0.01) {
          const pg = ctx.createLinearGradient(0, hor - H * 0.35, 0, hor);
          pg.addColorStop(0, 'rgba(255,150,60,0)'); pg.addColorStop(1, `rgba(255,150,60,${(cfg.poll * 0.35).toFixed(3)})`);
          ctx.globalAlpha = 1; ctx.fillStyle = pg; ctx.fillRect(0, hor - H * 0.35, W, H * 0.35);
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.drawImage(farL.c, 0, 0, W, H);

        /* traînées (pose longue) */
        if (cfg.trail > 0.01) {
          tg.globalCompositeOperation = 'destination-out'; tg.globalAlpha = 1;
          tg.fillStyle = `rgba(0,0,0,${clamp(dt * (0.18 + (1 - cfg.trail) * 6), 0, 1).toFixed(3)})`; tg.fillRect(0, 0, W, H);
          tg.globalCompositeOperation = 'lighter';
          for (const f of F) {
            if (f.st === 'perche') continue;
            const b = bright(f);
            if (b > 0.08) {
              tg.strokeStyle = css(SPC[f.sp].col, (b * 0.75).toFixed(3)); tg.lineWidth = (1 + 2.2 * f.z) * kS;
              tg.beginPath(); tg.moveTo(f.lx, f.ly); tg.lineTo(f.x + 0.01, f.y); tg.stroke();
            }
          }
        }
        for (const f of F) { f.lx = f.x; f.ly = f.y; }

        ctx.globalCompositeOperation = 'lighter';
        for (const f of F) if (f.st !== 'perche' && f.z < 0.6) { const b = bright(f); if (b > 0.02) drawGlow(f, b); }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.drawImage(midL.c, 0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        if (nP) {
          let sb = 0;
          for (const f of F) if (f.sp === 'pteroptyx') sb += bright(f);
          const fr = sb / nP;
          if (fr > 0.02) { const s = H * 0.75; ctx.globalAlpha = Math.min(1, fr * 0.5 * Math.min(1, nP / 150)) * (env.doux ? 0.25 : 1); ctx.drawImage(SPR.pteroptyx, tree.cx - s / 2, tree.cy - s / 2, s, s); }
        }
        for (const f of F) if (f.sp === 'pteroptyx' || (f.st !== 'perche' && f.z >= 0.6)) { const b = bright(f); if (b > 0.02) drawGlow(f, b); }
        ctx.globalAlpha = 1;
        if (cfg.trail > 0.01) ctx.drawImage(TL.c, 0, 0, W, H);

        /* herbes */
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.fillStyle = '#010205';
        ctx.beginPath();
        for (const b of blades) {
          ctx.moveTo(b.x - b.w, H + 2);
          ctx.quadraticCurveTo(b.cx - b.w * 0.4, b.cy, b.tx, b.ty);
          ctx.quadraticCurveTo(b.cx + b.w * 0.4, b.cy, b.x + b.w, H + 2);
        }
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        for (const f of F) if (f.blade >= 0) { const b = bright(f); if (b > 0.02) drawGlow(f, b, f.sp === 'lampyris' ? 0.7 : 1); }
        for (const f of F) {
          const b = bright(f);
          if (b < 0.15 || f.z < 0.6 || f.y < hor) continue;
          const s = 190 * f.z * kS;
          ctx.globalAlpha = b * 0.09 * (env.doux ? 0.25 : 1); ctx.drawImage(SPR[f.sp], f.x - s / 2, f.y - s / 2, s, s);
        }
        for (let i = sigs.length - 1; i >= 0; i--) {
          const s = sigs[i];
          s.a += dt;
          const b = s.a < 0.1 ? s.a / 0.1 : Math.exp(-(s.a - 0.1) / 0.28);
          if (s.a > 2) { sigs.splice(i, 1); continue; }
          const z = (14 + 70 * b) * kS;
          ctx.globalAlpha = Math.min(1, b); ctx.drawImage(sprSig, s.x - z / 2, s.y - z / 2, z, z);
          ctx.drawImage(sprCore, s.x - 4, s.y - 4, 8, 8);
        }
        if (torch.on) {
          const s = torch.r * 3.2;
          ctx.globalAlpha = 0.5; ctx.drawImage(sprTorch, torch.x - s / 2, torch.y - s / 2, s, s);
          ctx.globalAlpha = 0.9; ctx.drawImage(sprCore, torch.x - 10, torch.y - 10, 20, 20);
        }
      }

      return {
        frame(tt, dt) {
          VT += dt;
          fc.carolinus = fc.pteroptyx = 0;
          let zx = 0, zy = 0, nP = 0;
          for (const f of F) if (f.sp === 'pteroptyx') { zx += Math.cos(TAU * f.th); zy += Math.sin(TAU * f.th); nP++; }
          const rP = nP ? Math.hypot(zx, zy) / nP : 0, psiP = Math.atan2(zy, zx) / TAU;
          for (let i = puffs.length - 1; i >= 0; i--) { puffs[i].life -= dt * 1.2; if (puffs[i].life <= 0) puffs.splice(i, 1); }
          grass(VT);
          const n = Math.max(1, Math.ceil(dt / 0.05)), h = dt / n;
          for (let s = 0; s < n; s++) for (const f of F) upd(f, h, rP, psiP);
          for (let i = F.length - 1; i >= 0; i--) if (F[i].dead) { free(F[i]); if (label && label.f === F[i]) label = null; F.splice(i, 1); }
          if ((statT -= dt) <= 0) {
            statT = 0.25;
            let cx = 0, cy = 0, nc = 0;
            for (const f of F) if (f.sp === 'carolinus') { const a = f.burst > 0 ? 0 : TAU * f.th; cx += Math.cos(a); cy += Math.sin(a); nc++; }
            syncC = nc ? Math.hypot(cx, cy) / nc : 0; rPt = rP;
          }
          if (snd()) {
            if ((cricT -= dt) <= 0) {
              cricT = rnd(1.1, 0.55);
              const f0 = rnd(4900, 4300), g = 0.004 + cfg.moon * 0.002;
              for (let k = 0; k < 3; k++) later(k * 45, () => au.noise(0.03, g, f0, 18, 'bandpass'));
            }
            if ((frogT -= dt) <= 0) { frogT = rnd(14, 6); const f0 = rnd(220, 170); au.note(f0, 0.16, 'triangle', 0.01, f0 * 0.7); later(240, () => au.note(f0 * 0.95, 0.14, 'triangle', 0.008, f0 * 0.65)); }
            if (fc.carolinus >= 6 && VT - lastC > 0.35) { lastC = VT; au.note(scale(9 + rint(3), 440), 0.9, 'sine', Math.min(0.035, fc.carolinus * 0.0016)); }
            if (nP && fc.pteroptyx >= nP * 0.45 && VT - lastP > 0.3) { lastP = VT; au.pluck(scale(5, 220), 0.35, 0.012); }
          }
          if (label) { label.t -= dt; if (label.t <= 0) label = null; }

          if (gfx && !gfx.lost) gfx.draw(dt, nP); else draw2D(dt, nP);

          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          if (cfg.dialog) {
            ctx.setLineDash([2, 5]); ctx.lineWidth = 1;
            for (const f of F) {
              if (f.st !== 'court' || !f.tgt) continue;
              const t = f.tgt, fatal = t.sp === 'photuris';
              ctx.strokeStyle = fatal ? 'rgba(130,255,200,.32)' : t.virtual ? 'rgba(255,240,210,.4)' : 'rgba(255,214,110,.32)';
              ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(t.x, t.y); ctx.stroke();
            }
            ctx.setLineDash([]);
          }
          if (label) drawLabel();
        },
        down(p) {
          const tool = env.tool;
          this._mode = null; this._d = 0;
          if (tool === 'signal') { sigs.push({ x: p.x, y: p.y, a: 0 }); signal(p.x, p.y); if (snd()) au.note(880, 0.3, 'sine', 0.02); return; }
          if (tool === 'torche') { torch.on = true; torch.x = p.x; torch.y = p.y; this._mode = 'torche'; if (snd()) au.noise(0.08, 0.02, 2500, 3, 'bandpass'); return; }
          if (tool === 'souffle') { this._mode = 'souffle'; return; }
          if (tool === 'perturber') {
            for (const f of F) if (Math.hypot(f.x - p.x, f.y - p.y) < 230 * kS) { f.th = Math.random(); f.burst = 0; }
            if (snd()) au.noise(0.35, 0.03, 500, 1, 'lowpass', 120);
            if (navigator.vibrate) navigator.vibrate(8);
            return;
          }
          if (tool === 'lacher') { release(p.x, p.y); if (snd()) au.pluck(scale(rint(5) + 7, 330), 0.8, 0.02); return; }
          let best = null, bd = 46;
          for (const f of F) { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < bd) { bd = d; best = f; } }
          if (best) {
            label = { f: best, t: 6 };
            if (best.sp === 'lampyris') best.dim = 8;
            if (navigator.vibrate) navigator.vibrate(6);
            if (snd()) au.note(best.sp === 'pyralis' ? 660 : 990, 0.2, 'sine', 0.02);
          }
        },
        move(p) {
          if (!p.down || !this._mode) return;
          if (this._mode === 'torche') { torch.x = p.x; torch.y = p.y; }
          else if (this._mode === 'souffle') {
            if (puffs.length > 24) puffs.shift();
            puffs.push({ x: p.x, y: p.y, vx: clamp(p.dx * 30, -900, 900), vy: clamp(p.dy * 30, -900, 900), life: 1 });
            if (snd() && Math.random() < 0.12) au.noise(0.4, 0.02, 700, 0.6, 'bandpass', 300);
          }
        },
        up() { torch.on = false; this._mode = null; },
        dispose() { drones.forEach((d) => d.stop()); timers.forEach(clearTimeout); if (gfx) gfx.lose(); },
        livePaused: true,
        clear: clearAll,
        ui() {
          const nb = { carolinus: 0, pyralis: 0, photuris: 0, pteroptyx: 0, lampyris: 0 };
          for (const f of F) nb[f.sp]++;
          const L = [{ type: 'section', label: 'Synchronie' }];
          L.push({ type: 'bar', label: 'Photinus carolinus', color: css(SPC.carolinus.col, 1), value: syncC, txt: nb.carolinus ? Math.round(syncC * 100) + ' %' : '—' });
          L.push({ type: 'bar', label: 'Pteroptyx malaccae', color: css(SPC.pteroptyx.col, 1), value: rPt, txt: nb.pteroptyx ? Math.round(rPt * 100) + ' %' : '—' });
          L.push({ type: 'note', text: `${F.length} lucioles · ${couples} couple${couples > 1 ? 's' : ''} formé${couples > 1 ? 's' : ''} · ${eaten} mâle${eaten > 1 ? 's' : ''} dévoré${eaten > 1 ? 's' : ''}` });
          L.push({ type: 'buttons', items: [{ label: 'Tout désynchroniser', act: desync }] });
          L.push({ type: 'section', label: 'Scènes' });
          L.push({ type: 'buttons', items: [{ label: 'Nuit d’été', act: () => populate('nuit') }, { label: 'Vallée synchrone', act: () => populate('vallee') }, { label: 'Mangrove', act: () => populate('mangrove') }, { label: 'Dialogues amoureux', act: () => populate('dialogues') }] });
          L.push({ type: 'section', label: 'Lâcher' });
          L.push({ type: 'choice', label: 'Espèce lâchée par l’outil LÂCHER', value: cfg.sel, set: (v) => { cfg.sel = v; },
            options: [{ id: 'carolinus', label: 'Synchrones' }, { id: 'pyralis', label: 'Pyralis ♂' }, { id: 'pyralisF', label: 'Pyralis ♀' }, { id: 'photurisF', label: 'Femme fatale' }, { id: 'photuris', label: 'Photuris ♂' }, { id: 'pteroptyx', label: 'Pteroptyx' }, { id: 'lampyris', label: 'Ver luisant' }] });
          L.push({ type: 'section', label: 'La nuit' });
          L.push({ type: 'slider', label: 'Clair de lune', min: 0, max: 1, step: 0.02, value: cfg.moon, fmt: (v) => (v < 0.05 ? 'nouvelle lune' : v > 0.9 ? 'pleine lune' : Math.round(v * 100) + ' %'), set: (v) => { cfg.moon = v; } });
          L.push({ type: 'slider', label: 'Pollution lumineuse', min: 0, max: 1, step: 0.02, value: cfg.poll, fmt: (v) => Math.round(v * 100) + ' %', set: (v) => { cfg.poll = v; } });
          L.push({ type: 'section', label: 'Comportement' });
          L.push({ type: 'slider', label: 'Couplage des synchrones', min: 0, max: 0.35, step: 0.005, value: cfg.eps, fmt: (v) => (v === 0 ? 'aveugles' : '+' + Math.round(v * 100) + ' % par flash vu'), set: (v) => { cfg.eps = v; } });
          L.push({ type: 'slider', label: 'Couplage des Pteroptyx', min: 0, max: 4, step: 0.05, value: cfg.K, fmt: (v) => v.toFixed(2), set: (v) => { cfg.K = v; } });
          L.push({ type: 'section', label: 'Affichage' });
          L.push({ type: 'slider', label: 'Pose longue', min: 0, max: 1, step: 0.02, value: cfg.trail, fmt: (v) => (v < 0.01 ? 'désactivée' : Math.round(v * 100) + ' %'), set: (v) => { cfg.trail = v; } });
          L.push({ type: 'toggle', label: 'Montrer les dialogues', value: cfg.dialog, set: (v) => { cfg.dialog = v; } });
          L.push({ type: 'toggle', label: 'Couleurs pour reconnaître les espèces', value: !!cfg.fausses, set: (v) => { cfg.fausses = v; } });
          if (cfg.fausses) L.push({ type: 'note', text: 'Fausses couleurs : en vrai, toutes ces lucioles brillent d’un jaune-vert presque identique (de 552 à 565 nm). Elles se reconnaissent à leur rythme.' });
          return L;
        },
      };

      function signal(x, y) {
        for (const f of F) {
          const d = Math.hypot(f.x - x, f.y - y);
          if (f.sp === 'pyralis' && f.sex === 'm' && (f.st === 'vol' || f.st === 'court') && d < 340 * kS) {
            const e = VT - f.lastF;
            if (e > 1.2 && e < 3.2) { f.st = 'court'; f.tgt = { x, y, virtual: true }; f.timer = 10; }
          } else if (f.sp === 'carolinus' && f.burst === 0 && d < 240 * kS && f.th > 0.35) f.th = 1;
          else if (f.sp === 'pteroptyx' && d < 320 * kS) f.th -= (Math.sin(TAU * f.th) / TAU) * 0.5;
        }
      }
    },
  });
})();
