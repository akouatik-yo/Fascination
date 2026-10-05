/* Fascination — Les Lucioles · dialogues de lumière dans la nuit d'été */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
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
  const SPC = {
    carolinus: { nom: 'Photinus carolinus', fr: 'luciole synchrone', col: [190, 255, 100], rise: 0.05, dec: 0.13 },
    pyralis: { nom: 'Photinus pyralis', fr: 'luciole « grande ourse »', col: [255, 204, 76], rise: 0.14, dec: 0.3 },
    photuris: { nom: 'Photuris versicolor', fr: 'luciole femme fatale', col: [110, 255, 196], rise: 0.05, dec: 0.12 },
    pteroptyx: { nom: 'Pteroptyx malaccae', fr: 'luciole des mangroves', col: [224, 255, 140], rise: 0.03, dec: 0.08 },
    lampyris: { nom: 'Lampyris noctiluca', fr: 'ver luisant', col: [96, 255, 150], rise: 1, dec: 1 },
  };
  const envF = (sp, a) => { const s = SPC[sp]; return a < s.rise ? a / s.rise : Math.exp(-(a - s.rise) / s.dec); };

  window.FASC.push({
    id: 'lucioles', name: 'Les Lucioles', cat: 'Vivant', glyph: '✳',
    blurb: 'Dialogues de lumière dans la nuit d’été',
    hint: 'OBSERVER : touchez une luciole pour l’identifier · SIGNAL : répondez à un mâle · TORCHE : maintenez pour éclairer · SOUFFLE : glissez · PERTURBER : brisez la synchronie · LÂCHER : ajoutez l’espèce choisie.',
    intro: 'Une nuit d’été où se croisent cinq lucioles du monde entier. Chaque flash est un mot : certaines espèces finissent par clignoter toutes ensemble, d’autres se font la cour par questions-réponses, et une prédatrice imite les femelles pour attirer les mâles… et les dévorer.',
    legend: [
      { color: '#beff64', name: 'Photinus carolinus', role: 'synchrone · Great Smoky Mountains', desc: 'Salves de 5 à 8 flashs, puis l’obscurité. Chaque mâle avance un peu son horloge quand il voit un voisin s’allumer : peu à peu, des vagues de lumière balaient la vallée, puis tout le monde clignote ensemble.' },
      { color: '#ffcc4c', name: 'Photinus pyralis', role: 'dialogue · « grande ourse »', desc: 'Le mâle plonge puis remonte en s’allumant, et trace un J. La femelle, posée dans l’herbe, répond environ deux secondes plus tard. À chaque réponse, il se rapproche.' },
      { color: '#6effc4', name: 'Photuris versicolor', role: 'femme fatale', desc: 'La femelle imite la réponse des femelles Photinus. Le mâle trompé s’approche… et se fait dévorer.' },
      { color: '#e0ff8c', name: 'Pteroptyx malaccae', role: 'synchrone · mangroves d’Asie', desc: 'Des milliers de mâles se posent sur un même arbre et clignotent à l’unisson, presque deux fois par seconde : l’arbre entier s’illumine comme un phare.' },
      { color: '#60ff96', name: 'Lampyris noctiluca', role: 'ver luisant · Europe', desc: 'La femelle, sans ailes, grimpe sur une herbe et brille en continu pour attirer les mâles. Elle s’éteint si on la dérange.' },
    ],
    about: [
      'La lumière des lucioles est une lumière froide : une réaction chimique (luciférine et luciférase) convertit presque toute son énergie en lumière, sans chaleur.',
      'La synchronisation obéit au modèle des « oscillateurs couplés par impulsions » (Mirollo et Strogatz, 1990) : chaque luciole est une horloge que les flashs de ses voisines poussent légèrement en avant. Personne ne dirige, et pourtant l’ordre émerge.',
      'Les biologistes parlent aux lucioles avec une petite lampe : répondre deux secondes après le flash d’un mâle Photinus pyralis suffit à le faire venir. Essayez avec l’outil SIGNAL.',
      'La lune et surtout la pollution lumineuse noient leurs signaux : les lucioles se taisent, les couples ne se forment plus. C’est l’une des causes de leur déclin.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez une luciole, même éteinte, pour l’identifier et suivre ce qu’elle fait.' },
      { id: 'signal', label: 'signal', desc: 'Touchez pour émettre un bref flash. Répondez environ 2 secondes après le J ambré d’un mâle Photinus pyralis : il viendra vers vous. Les synchrones proches s’allument aussi.' },
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
      const cfg = { moon: 0.2, poll: 0, eps: 0.1, K: 0.9, trail: 0.5, dialog: true, sel: 'carolinus' };
      const timers = [];
      const later = (ms, fn) => timers.push(setTimeout(fn, ms));
      const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0 }; };
      const hor = H * 0.6, v0 = view();
      const moon = { x: v0.x0 + v0.w * 0.8, y: H * 0.14, r: 17 * kS };
      const SPR = {};
      for (const k in SPC) SPR[k] = glow(SPC[k].col);
      const sprCore = glow([255, 255, 236]), sprSig = glow([255, 238, 205]), sprMoon = glow([190, 210, 255]), sprTorch = glow([255, 228, 176]);

      /* décor */
      const stars = Array.from({ length: Math.round(260 * area) + 80 }, () => ({ x: rnd(W), y: Math.pow(Math.random(), 1.3) * hor * 0.92, r: Math.pow(Math.random(), 3) * 1.5 + 0.4, ph: rnd(TAU), sp: rnd(3, 0.5) }));
      const farL = layer(W, H);
      {
        const g = farL.g;
        const ridge = (base, amp, nT, tH, col, seed) => {
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
          g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
          for (let i = 0; i < n; i++) g.lineTo(i * 3, base - hg[i]);
          g.lineTo(W, H); g.closePath(); g.fill();
        };
        ridge(hor - H * 0.03, H * 0.05, Math.round(W / 14), H * 0.09, '#0b1222', 1.3);
        const mist = g.createLinearGradient(0, hor - H * 0.12, 0, hor + H * 0.02);
        mist.addColorStop(0, 'rgba(120,140,190,0)'); mist.addColorStop(0.7, 'rgba(120,140,190,.09)'); mist.addColorStop(1, 'rgba(120,140,190,0)');
        g.fillStyle = mist; g.fillRect(0, hor - H * 0.12, W, H * 0.14);
        ridge(hor, H * 0.025, Math.round(W / 10), H * 0.12, '#060a14', 4.1);
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
        g.fillRect(0, hor + H * 0.035, W, 2);
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
        const sp = SPC[f.sp], side = f.x > W * 0.65 ? -1 : 1, lx = f.x + side * 46, ly = f.y - 38;
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

      populate('nuit');
      grass(0);
      let syncC = 0, rPt = 0, statT = 0, cricT = 1, frogT = 6, lastC = 0, lastP = 0;
      quiet = false;
      const drones = [];
      if (au && au.live) drones.push(au.drone(65.4, 'sine', 0.012), au.drone(98, 'sine', 0.005));

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
            if (fr > 0.02) { const s = H * 0.75; ctx.globalAlpha = Math.min(1, fr * 0.5 * Math.min(1, nP / 150)); ctx.drawImage(SPR.pteroptyx, tree.cx - s / 2, tree.cy - s / 2, s, s); }
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
            ctx.globalAlpha = b * 0.09; ctx.drawImage(SPR[f.sp], f.x - s / 2, f.y - s / 2, s, s);
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
        dispose() { drones.forEach((d) => d.stop()); timers.forEach(clearTimeout); },
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
