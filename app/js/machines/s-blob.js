/* Fascination — Le Blob · myxomycètes, une intelligence sans cerveau */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, layer, buf, diffuse, scale } = window.FK;

  const BASE = [
    { key: 'physarum', nom: 'Physarum polycephalum', fr: 'le blob · bâtisseur de réseaux', col: [255, 226, 70], deep: [255, 150, 30], SA: 0.42, RA: 0.42, SO: 9, SS: 1.0, dep: 5, light: 3.2 },
    { key: 'lycogala', nom: 'Lycogala epidendrum', fr: 'lait de loup · lent et massif', col: [255, 120, 150], deep: [255, 60, 120], SA: 0.8, RA: 0.3, SO: 15, SS: 0.65, dep: 6, light: 1.1 },
    { key: 'stemonitis', nom: 'Stemonitis fusca', fr: 'stémonite · réseau fin et nerveux', col: [190, 240, 255], deep: [90, 200, 255], SA: 0.95, RA: 0.6, SO: 5, SS: 1.35, dep: 4, light: 2.2 },
  ];
  const css = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 1 : a})`;
  const FR = [[2.55, 51.09], [1.6, 50.9], [1.55, 50.2], [0.2, 49.7], [-0.2, 49.3], [-1.1, 49.35], [-1.3, 49.7], [-1.9, 49.7], [-1.6, 48.65], [-2.7, 48.55], [-3.6, 48.8], [-4.7, 48.5], [-4.4, 48.0], [-4.7, 47.95], [-3.4, 47.7], [-2.5, 47.3], [-2.15, 47.1], [-1.8, 46.5], [-1.15, 46.15], [-1.25, 45.6], [-1.15, 44.6], [-1.4, 43.6], [-1.75, 43.35], [-1.3, 43.05], [-0.3, 42.85], [0.7, 42.8], [1.7, 42.5], [3.17, 42.43], [3.05, 43.05], [3.9, 43.5], [4.6, 43.4], [5.37, 43.2], [6.2, 43.1], [6.9, 43.45], [7.5, 43.78], [7.65, 44.15], [6.9, 44.4], [6.98, 45.0], [6.8, 45.8], [6.2, 46.4], [6.1, 46.6], [7.0, 47.4], [7.58, 47.58], [7.6, 48.3], [8.2, 48.97], [7.4, 49.17], [6.4, 49.47], [5.8, 49.55], [4.85, 50.15], [4.15, 49.97], [3.15, 50.78]];
  const CITIES = [['Paris', 2.35, 48.86], ['Lille', 3.06, 50.63], ['Rouen', 1.1, 49.44], ['Caen', -0.37, 49.18], ['Rennes', -1.68, 48.11], ['Brest', -4.49, 48.39], ['Nantes', -1.55, 47.22], ['Tours', 0.69, 47.39], ['Orléans', 1.91, 47.9], ['Reims', 4.03, 49.26], ['Metz', 6.18, 49.12], ['Strasbourg', 7.75, 48.58], ['Dijon', 5.04, 47.32], ['Besançon', 6.02, 47.24], ['Lyon', 4.84, 45.76], ['Grenoble', 5.72, 45.19], ['Clermont', 3.09, 45.78], ['Limoges', 1.26, 45.83], ['Poitiers', 0.34, 46.58], ['Bordeaux', -0.58, 44.84], ['Toulouse', 1.44, 43.6], ['Montpellier', 3.88, 43.61], ['Marseille', 5.37, 43.3], ['Nice', 7.26, 43.7]];

  window.FASC.push({
    id: 'blob', name: 'Le Blob', cat: 'Vivant', glyph: '🝤',
    blurb: 'Physarum : une intelligence sans cerveau',
    hint: 'Touchez pour déposer l’espèce choisie · touchez un blob pour l’identifier · nourrissez-le d’avoine, effrayez-le avec du sel ou de la lumière, coupez-le et regardez-le cicatriser.',
    intro: 'Le blob n’est ni un animal, ni une plante, ni un champignon : c’est une seule cellule géante, sans cerveau, capable de trouver le plus court chemin dans un labyrinthe et de tisser des réseaux aussi efficaces que ceux des ingénieurs.',
    legend: [
      { color: '#ffd02e', name: 'Physarum polycephalum', role: 'bâtisseur de réseaux', desc: 'Explore vite et relie la nourriture par des veines fines et efficaces. Déteste la lumière. Fructifie en petites têtes grises sur pied.' },
      { color: '#ff8070', name: 'Lycogala epidendrum', role: 'lent et massif', desc: 'Avance lentement en lobes épais et charnus. Supporte mieux la lumière. Fructifie en boules roses : le « lait de loup ».' },
      { color: '#e4eeff', name: 'Stemonitis fusca', role: 'fin et nerveux', desc: 'Rapide, tisse un réseau dense et changeant. Fructifie en touffes de sporanges couleur chocolat.' },
    ],
    about: [
      'Le blob avance en pulsant : son cytoplasme fait des allers-retours dans ses veines. Les tubes les plus utilisés grossissent, les autres se résorbent : le réseau s’optimise tout seul.',
      'Il laisse derrière lui un voile de mucus qu’il évite ensuite. Cette mémoire externe l’empêche de chercher deux fois au même endroit. Désactivez-la dans les réglages pour voir la différence.',
      'En 2010, des chercheurs ont posé des flocons d’avoine à l’emplacement des villes autour de Tokyo : le blob a tissé un réseau presque identique au réseau ferré. L’expérience « Réseau ferré » refait l’essai avec la France, la lumière jouant le rôle de la mer.',
      'Chaque blob est simulé par des milliers d’agents qui suivent leurs propres traces chimiques (modèle de Jeff Jones, 2010). Les espèces différentes s’évitent, deux fragments de la même espèce fusionnent. Affamé, le blob meurt et fructifie.',
    ],
    tools: [
      { id: 'physarum', label: 'physarum', desc: 'Touchez pour déposer un fragment de Physarum, le blob jaune. Touchez un blob existant pour l’identifier.' },
      { id: 'lycogala', label: 'lycogala', desc: 'Touchez pour déposer un fragment de Lycogala, le blob corail, lent et massif.' },
      { id: 'stemonitis', label: 'stemonitis', desc: 'Touchez pour déposer un fragment de Stemonitis, le blob blanc au réseau nerveux.' },
      { id: 'avoine', label: 'avoine', desc: 'Déposez des flocons d’avoine, son mets favori : il les relie par le réseau le plus court, puis grandit.' },
      { id: 'sel', label: 'sel', desc: 'Saupoudrez du sel en glissant : le blob le fuit et s’y brûle. Parfait pour dessiner des murs et des labyrinthes.' },
      { id: 'lumiere', label: 'lumière', desc: 'Posez une lampe : le blob déteste la lumière et la contourne. Glissez pour la déplacer, touchez-la pour l’éteindre.' },
      { id: 'couper', label: 'couper', desc: 'Tranchez le réseau en glissant : regardez-le cicatriser et se reconnecter.' },
    ],
    make(env) {
      const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
      let quiet = true;
      const snd = () => !quiet && au && au.on;
      const Q = Math.min(2, window.devicePixelRatio || 1);
      const kS = clamp(Math.min(W, H) / 800, 0.75, 1.4);
      const CS = Math.max(2.6, Math.sqrt((W * H) / 150000));
      const GW = Math.ceil(W / CS), GH = Math.ceil(H / CS), NC = GW * GH;
      const F32 = () => new Float32Array(NC);
      const T = [F32(), F32(), F32()], TT = F32(), HG = F32(), M = F32(), FOOD = F32(), LIT = F32(), LMASK = F32(), PH = F32();
      const SALT = new Uint8Array(NC), OCC = new Uint8Array(NC);
      for (let i = 0; i < NC; i++) {
        const x = i % GW, y = (i / GW) | 0, k = CS / 2.6;
        PH[i] = (x * 0.09 + y * 0.06) * k + Math.sin(x * 0.05 * k) * 1.4 + Math.cos(y * 0.043 * k) * 1.4;
      }
      const CC = 8, CW = Math.ceil(GW / CC), CHh = Math.ceil(GH / CC), CN = CW * CHh, CH = new Float32Array(CN), CT = new Float32Array(CN);
      const AMAX = Math.round(clamp(NC * 0.075, 6000, 18000));
      const AX = new Float32Array(AMAX), AY = new Float32Array(AMAX), AA = new Float32Array(AMAX), AE = new Float32Array(AMAX), AS = new Uint8Array(AMAX);
      let nA = 0;
      const cntS = [0, 0, 0];
      const P = BASE.map((b) => Object.assign({}, b));
      const cfg = { neon: 1, cap: 1, decay: 0.1, food: 1, memory: true, life: true, view: 'reel', pulse: true, sel: 0 };
      const SINL = new Float32Array(1024);
      for (let k = 0; k < 1024; k++) SINL[k] = Math.sin((k / 1024) * TAU);

      /* décor : bois mort humide */
      const bg = layer(W, H);
      {
        const g = bg.g;
        g.fillStyle = '#14120d'; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 36; i++) {
          const x = rnd(W), y = rnd(H), r = rnd(W * 0.25, W * 0.05), light = Math.random() < 0.5;
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, light ? 'rgba(66,58,40,.25)' : 'rgba(3,3,2,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        }
        const ang = rnd(0.3, -0.3);
        g.save(); g.translate(W / 2, H / 2); g.rotate(ang);
        const D = Math.hypot(W, H);
        for (let i = 0; i < 140; i++) {
          const y = rnd(D / 2, -D / 2), amp = rnd(8, 2), f = rnd(0.012, 0.003), ph = rnd(TAU);
          g.strokeStyle = Math.random() < 0.5 ? `rgba(90,78,56,${rnd(0.12, 0.04).toFixed(3)})` : `rgba(0,0,0,${rnd(0.3, 0.1).toFixed(3)})`;
          g.lineWidth = rnd(2.5, 0.6);
          g.beginPath();
          for (let x = -D / 2; x <= D / 2; x += 16) { const yy = y + Math.sin(x * f + ph) * amp; if (x === -D / 2) g.moveTo(x, yy); else g.lineTo(x, yy); }
          g.stroke();
        }
        g.restore();
        for (let i = 0; i < (W * H) / 9; i++) {
          g.fillStyle = Math.random() < 0.5 ? 'rgba(255,235,200,.04)' : 'rgba(0,0,0,.2)';
          g.fillRect(rnd(W), rnd(H), 1, 1);
        }
        for (let i = 0; i < 24; i++) {
          const x = rnd(W), y = rnd(H), r = rnd(40, 10) * kS;
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, 'rgba(60,78,34,.22)'); gr.addColorStop(1, 'rgba(60,78,34,0)');
          g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        }
        const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.62);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
        g.fillStyle = v; g.fillRect(0, 0, W, H);
      }
      const DL = layer(W * Q, H * Q), dg = DL.g; dg.setTransform(Q, 0, 0, Q, 0, 0);
      const FRL = layer(W * Q, H * Q), fg = FRL.g; fg.setTransform(Q, 0, 0, Q, 0, 0);
      const IMG = buf(GW, GH);
      const GBUF = buf(GW, GH);
      const GLA = layer(Math.ceil(GW / 2), Math.ceil(GH / 2)), GLB = layer(Math.ceil(GW / 6), Math.ceil(GH / 6));
      for (let i = 3; i < IMG.d.length; i += 4) IMG.d[i] = 0;
      const lampSpr = (() => {
        const s = layer(128, 128), g = s.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,244,214,1)'); gr.addColorStop(0.12, 'rgba(255,236,190,.55)'); gr.addColorStop(0.45, 'rgba(255,220,160,.16)'); gr.addColorStop(1, 'rgba(255,220,160,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return s.c;
      })();

      /* agents */
      function add(s, x, y, a, e) {
        if (nA >= AMAX) return false;
        const c = (y | 0) * GW + (x | 0);
        if (OCC[c]) return false;
        OCC[c] = 1;
        const k = nA++;
        AX[k] = x; AY[k] = y; AA[k] = a; AE[k] = e; AS[k] = s; cntS[s]++;
        return true;
      }
      function remove(k) {
        const last = --nA;
        cntS[AS[k]]--;
        OCC[(AY[k] | 0) * GW + (AX[k] | 0)] = 0;
        if (k !== last) { AX[k] = AX[last]; AY[k] = AY[last]; AA[k] = AA[last]; AE[k] = AE[last]; AS[k] = AS[last]; }
      }
      let lastInoc = 0;
      function inoc(s, x, y, n) {
        n = n || 1500;
        const cx = x / CS, cy = y / CS, r = Math.sqrt(n / 2.2) + 1, Ts = T[s];
        for (let k = 0; k < n * 3 && n > 0 && nA < AMAX; k++) {
          const an = rnd(TAU), d = Math.sqrt(Math.random()) * r, px = cx + Math.cos(an) * d, py = cy + Math.sin(an) * d;
          if (px < 1 || py < 1 || px >= GW - 1 || py >= GH - 1) continue;
          if (add(s, px, py, rnd(TAU), rnd(1.6, 1.0))) { Ts[(py | 0) * GW + (px | 0)] += P[s].dep * 2; n--; }
        }
        if (snd() && performance.now() - lastInoc > 120) { lastInoc = performance.now(); au.note(scale(s * 2 + rint(3), 110), 1.4, 'sine', 0.05, 82); }
      }

      /* nourriture */
      const flakes = [];
      function flakeSprite(r) {
        const S = Math.ceil(r * 2.8), L = layer(S, S), g = L.g, c = S / 2, pts = [];
        for (let k = 0; k < 16; k++) { const an = (k / 16) * TAU, rr = r * rnd(1.04, 0.88); pts.push([c + Math.cos(an) * rr, c + Math.sin(an) * rr * 0.74]); }
        const path = (ox, oy) => { g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy))); g.closePath(); };
        g.fillStyle = 'rgba(0,0,0,.42)'; path(r * 0.12, r * 0.18); g.fill();
        const gr = g.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r * 1.1);
        gr.addColorStop(0, '#f5e8c8'); gr.addColorStop(0.6, '#dcc391'); gr.addColorStop(1, '#ad8955');
        path(0, 0); g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(110,80,40,.55)'; g.lineWidth = 0.8; g.stroke();
        g.save(); path(0, 0); g.clip();
        for (let k = 0; k < 7; k++) {
          const off = (k / 6 - 0.5) * r * 1.5;
          g.strokeStyle = k % 2 ? 'rgba(255,248,225,.35)' : 'rgba(150,115,70,.32)'; g.lineWidth = rnd(1.4, 0.6);
          g.beginPath(); g.moveTo(c - r * 1.2, c + off - r * 0.2); g.quadraticCurveTo(c, c + off + rnd(r * 0.25, -r * 0.25), c + r * 1.2, c + off + r * 0.2); g.stroke();
        }
        g.fillStyle = 'rgba(120,88,48,.4)';
        for (let k = 0; k < 18; k++) g.fillRect(c + rnd(r, -r), c + rnd(r, -r) * 0.7, 1, 1);
        const br = g.createRadialGradient(c + r * 0.85, c, 0, c + r * 0.85, c, r * 0.7);
        br.addColorStop(0, 'rgba(120,80,40,.4)'); br.addColorStop(1, 'rgba(120,80,40,0)');
        g.fillStyle = br; g.fillRect(0, 0, S, S);
        g.restore();
        return L.c;
      }
      function addFlake(x, y, r) {
        r = r || rnd(19, 14) * kS;
        const rot = rnd(TAU), cells = [], rx = r / CS, ry = (r * 0.74) / CS, R = Math.ceil(rx) + 1, gx = x / CS, gy = y / CS, c = Math.cos(rot), s = Math.sin(rot);
        let amt = 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const u = dx * c + dy * s, v = -dx * s + dy * c;
          if ((u * u) / (rx * rx) + (v * v) / (ry * ry) > 1) continue;
          const X = (gx + dx) | 0, Y = (gy + dy) | 0;
          if (X < 0 || Y < 0 || X >= GW || Y >= GH) continue;
          const i = Y * GW + X; FOOD[i] = Math.min(1.5, FOOD[i] + 1); cells.push(i); amt += 1;
        }
        flakes.push({ x, y, r, rot, cells, amt0: Math.max(1, amt), rem: amt, spr: flakeSprite(r) });
      }

      /* sel */
      function grain(x, y, s) {
        dg.save(); dg.translate(x, y); dg.rotate(rnd(TAU));
        dg.fillStyle = 'rgba(0,0,0,.4)'; dg.fillRect(-s / 2 + s * 0.25, -s / 2 + s * 0.3, s, s);
        dg.fillStyle = '#e6eaee'; dg.fillRect(-s / 2, -s / 2, s, s);
        dg.fillStyle = 'rgba(255,255,255,.95)'; dg.fillRect(-s / 2, -s / 2, s, s * 0.35);
        dg.fillStyle = 'rgba(140,155,170,.55)'; dg.fillRect(-s / 2 + s * 0.55, -s / 2, s * 0.45, s);
        dg.restore();
        const R = Math.ceil((s * 0.5 + 2) / CS), gx = (x / CS) | 0, gy = (y / CS) | 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const X = gx + dx, Y = gy + dy;
          if (X >= 0 && Y >= 0 && X < GW && Y < GH && dx * dx + dy * dy <= R * R) SALT[Y * GW + X] = 1;
        }
      }
      function sprinkle(x, y) {
        const r = 14 * kS;
        for (let k = 0; k < 9; k++) { const an = rnd(TAU), d = Math.sqrt(Math.random()) * r; grain(x + Math.cos(an) * d, y + Math.sin(an) * d, rnd(3, 1.4) * kS); }
      }
      function saltLine(xa, ya, xb, yb) {
        const n = Math.ceil(Math.hypot(xb - xa, yb - ya) / 2.6);
        for (let k = 0; k <= n; k++) grain(xa + ((xb - xa) * k) / n + rnd(2, -2), ya + ((yb - ya) * k) / n + rnd(2, -2), rnd(2.8, 1.5) * kS);
      }

      /* lumière */
      const lamps = [];
      function computeLit() {
        LIT.set(LMASK);
        for (const l of lamps) {
          const R = l.r / CS, gx = l.x / CS, gy = l.y / CS, E = Math.ceil(R * 2.2);
          const x0 = Math.max(0, (gx - E) | 0), x1 = Math.min(GW - 1, (gx + E) | 0), y0 = Math.max(0, (gy - E) | 0), y1 = Math.min(GH - 1, (gy + E) | 0);
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const dx = x - gx, dy = y - gy, i = y * GW + x;
            LIT[i] = Math.min(1.6, LIT[i] + Math.exp(-(dx * dx + dy * dy) / (R * R)));
          }
        }
      }

      /* fructification */
      const frQ = [];
      let nFr = 0, lastFr = 0;
      function drawFruits() {
        for (let k = 0; k < frQ.length; k += 3) {
          const s = frQ[k], x = frQ[k + 1], y = frQ[k + 2], g = fg;
          if (s === 0) {
            const r = rnd(2.3, 1.3) * kS;
            g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x + r * 1.1, y + r * 1.4, r * 1.1, r * 0.8, 0.5, 0, TAU); g.fill();
            g.strokeStyle = 'rgba(200,170,90,.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x - r * 0.6, y - r * 1.2); g.stroke();
            const gr = g.createRadialGradient(x - r * 0.9, y - r * 1.6, 0, x - r * 0.6, y - r * 1.2, r);
            gr.addColorStop(0, '#9a9188'); gr.addColorStop(0.5, '#4c4540'); gr.addColorStop(1, '#1d1916');
            g.fillStyle = gr; g.beginPath(); g.arc(x - r * 0.6, y - r * 1.2, r, 0, TAU); g.fill();
            g.fillStyle = 'rgba(240,205,70,.55)'; g.beginPath(); g.arc(x, y, r * 0.45, 0, TAU); g.fill();
          } else if (s === 1) {
            const r = rnd(5, 2.4) * kS, k2 = Math.random(), col = [233 - k2 * 80, 138 - k2 * 40, 132 - k2 * 50];
            g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x + r * 0.3, y + r * 0.45, r * 1.05, r * 0.9, 0, 0, TAU); g.fill();
            const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
            gr.addColorStop(0, css([255, 220, 210])); gr.addColorStop(0.35, css(col.map((v) => v | 0))); gr.addColorStop(1, css(col.map((v) => (v * 0.5) | 0)));
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
          } else {
            const n = rint(3) + 2, lean = -0.9 + rnd(0.25, -0.25);
            for (let j = 0; j < n; j++) {
              const ox = x + rnd(3, -3) * kS, oy = y + rnd(3, -3) * kS, L = rnd(7, 4) * kS, a = lean + rnd(0.2, -0.2);
              const ex = ox + Math.cos(a) * L, ey = oy + Math.sin(a) * L;
              g.lineCap = 'round';
              g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2.6 * kS; g.beginPath(); g.moveTo(ox + 2, oy + 2.5); g.lineTo(ex + 3, ey + 3.5); g.stroke();
              g.strokeStyle = '#5a3322'; g.lineWidth = 2 * kS; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.stroke();
              g.strokeStyle = 'rgba(200,150,110,.45)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(ox - 0.5, oy - 0.5); g.lineTo(ex - 0.5, ey - 0.5); g.stroke();
            }
          }
        }
        frQ.length = 0;
      }

      /* simulation */
      function sv(sx, sy, Ts, To1, To2, ls, fw, mw) {
        if (sx < 0 || sy < 0 || sx >= GW || sy >= GH) return -1e4;
        const gx = sx | 0, gy = sy | 0, i = gy * GW + gx, t = Ts[i];
        let v = t - (To1[i] + To2[i]) * 1.2 + CH[((gy / CC) | 0) * CW + ((gx / CC) | 0)] * fw - LIT[i] * ls;
        if (SALT[i]) v -= 200;
        if (mw > 0 && t < 2) v -= M[i] * mw;
        return v;
      }
      function blurDecay(A, k) {
        for (let y = 0; y < GH; y++) {
          const o = y * GW;
          let prev = A[o], cur = A[o];
          for (let x = 0; x < GW; x++) { const nx = x < GW - 1 ? A[o + x + 1] : cur; TT[o + x] = prev + cur + nx; prev = cur; cur = nx; }
        }
        const kk = k / 9;
        for (let x = 0; x < GW; x++) {
          let prev = TT[x], cur = TT[x];
          for (let y = 0, i = x; y < GH; y++, i += GW) { const nx = y < GH - 1 ? TT[i + GW] : cur; A[i] = (prev + cur + nx) * kk; prev = cur; cur = nx; }
        }
      }
      const COST = 0.00028;
      let stepN = 0, ateAcc = 0;
      function step() {
        stepN++;
        const keep = 1 - cfg.decay, fw = 0.05 * cfg.food, mw = cfg.memory ? 1.6 : 0;
        for (let k = nA - 1; k >= 0; k--) {
          const s = AS[k], p = P[s], Ts = T[s], To1 = T[(s + 1) % 3], To2 = T[(s + 2) % 3];
          let x = AX[k], y = AY[k], a = AA[k];
          const so = p.SO, sa = p.SA, ra = p.RA, ls = p.light * 22;
          const F = sv(x + Math.cos(a) * so, y + Math.sin(a) * so, Ts, To1, To2, ls, fw, mw);
          const FL = sv(x + Math.cos(a - sa) * so, y + Math.sin(a - sa) * so, Ts, To1, To2, ls, fw, mw);
          const FRr = sv(x + Math.cos(a + sa) * so, y + Math.sin(a + sa) * so, Ts, To1, To2, ls, fw, mw);
          if (F > FL && F > FRr) { /* tout droit */ }
          else if (F < FL && F < FRr) a += Math.random() < 0.5 ? -ra : ra;
          else if (FL < FRr) a += ra;
          else if (FRr < FL) a -= ra;
          a += (Math.random() - 0.5) * 0.1;
          const nx = x + Math.cos(a) * p.SS, ny = y + Math.sin(a) * p.SS;
          if (nx < 0.5 || ny < 0.5 || nx >= GW - 0.5 || ny >= GH - 0.5) a = rnd(TAU);
          else {
            const ni = (ny | 0) * GW + (nx | 0), oi = (y | 0) * GW + (x | 0);
            if (SALT[ni]) { a += Math.PI + rnd(1, -1); AE[k] -= 0.06; }
            else if (LIT[ni] > LIT[oi] + 0.01 && Math.random() < LIT[ni] * p.light * 0.22) a += Math.PI + rnd(0.8, -0.8);
            else if (ni !== oi && OCC[ni]) a = rnd(TAU);
            else { if (ni !== oi) { OCC[oi] = 0; OCC[ni] = 1; } x = nx; y = ny; Ts[ni] += p.dep; if (M[ni] < 4) M[ni] += 0.012; }
          }
          const i = (y | 0) * GW + (x | 0);
          let e = AE[k] - COST * (1 + LIT[i] * p.light * 5);
          const fd = FOOD[i];
          if (fd > 0 && e < 2.6) { const tk = fd < 0.004 ? fd : 0.004; FOOD[i] = fd - tk; e += tk * 45; ateAcc += tk; }
          AX[k] = x; AY[k] = y; AA[k] = a;
          if (e <= 0) {
            if (cfg.life) {
              if (nFr < 3000 && Math.random() < 0.03) { nFr++; frQ.push(s, x * CS, y * CS); }
              remove(k); continue;
            }
            e = 0.02;
          }
          if (e > 2 && nA < AMAX * cfg.cap) {
            const a2 = rnd(TAU), bx = x - Math.cos(a) * 1.2, by = y - Math.sin(a) * 1.2;
            if (bx > 1 && by > 1 && bx < GW - 1 && by < GH - 1 && add(s, bx, by, a2, e * 0.5)) e *= 0.5;
          }
          AE[k] = e;
        }
        for (let s = 0; s < 3; s++) blurDecay(T[s], keep);
        for (const f of flakes) {
          const c = ((f.y / CS / CC) | 0) * CW + ((f.x / CS / CC) | 0);
          if (c >= 0 && c < CN) CH[c] += f.rem * 0.02;
        }
        diffuse(CH, CT, CW, CHh, 0.2); diffuse(CH, CT, CW, CHh, 0.2);
        for (let i = 0; i < CN; i++) CH[i] *= 0.985;
        if (stepN % 10 === 0) for (let i = 0; i < NC; i++) M[i] *= 0.997;
      }

      /* rendu */
      const BUMP = 7, Lx = -0.42, Ly = -0.52, Lz = 0.744;
      const hn = Math.hypot(Lx, Ly, Lz + 1), Hx = Lx / hn, Hy = Ly / hn, Hz = (Lz + 1) / hn;
      const C = BASE.map((b) => b.col), Dp = BASE.map((b) => b.deep);
      function render(t) {
        const d = IMG.d, T0 = T[0], T1 = T[1], T2 = T[2], tp = t * 1.25, puls = cfg.pulse;
        for (let i = 0; i < NC; i++) {
          const s = T0[i] + T1[i] + T2[i];
          let h = s > 0.05 ? 1 - Math.exp(-s * 0.042) : 0;
          if (puls && h > 0) h *= 1 + 0.13 * SINL[(((tp - PH[i]) * 162.975) | 0) & 1023];
          HG[i] = h;
        }
        const chem = cfg.view === 'chimie';
        for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
          const i = y * GW + x, o = i * 4, h = HG[i], m = M[i];
          if (chem) {
            const c = CH[((y / CC) | 0) * CW + ((x / CC) | 0)];
            d[o] = T0[i] * 4 + T1[i] * 7 + LIT[i] * 70 + SALT[i] * 160;
            d[o + 1] = T0[i] * 3.4 + T2[i] * 3 + c * 0.45 + SALT[i] * 160;
            d[o + 2] = T2[i] * 6 + m * 26 + c * 0.9 + SALT[i] * 160;
            d[o + 3] = 255;
            continue;
          }
          GBUF.d[o + 3] = 0;
          if (h < 0.008 && m < 0.03) { d[o + 3] = 0; continue; }
          let r = 0, g = 0, b = 0, sa = 0;
          if (h >= 0.008) {
            const nx = (HG[i - 1] - HG[i + 1]) * BUMP, ny = (HG[i - GW] - HG[i + GW]) * BUMP, inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
            let dif = (nx * Lx + ny * Ly + Lz) * inv; if (dif < 0) dif = 0;
            let hv = (nx * Hx + ny * Hy + Hz) * inv; if (hv < 0) hv = 0;
            hv *= hv; hv *= hv; hv *= hv; hv *= hv; hv *= hv;
            const a0 = T0[i], a1 = T1[i], a2 = T2[i], ss = a0 + a1 + a2 + 1e-6, w0 = a0 / ss, w1 = a1 / ss, w2 = a2 / ss;
            const th = h * h * 0.45, tl = 1 - th;
            const cr = (C[0][0] * w0 + C[1][0] * w1 + C[2][0] * w2) * tl + (Dp[0][0] * w0 + Dp[1][0] * w1 + Dp[2][0] * w2) * th;
            const cg = (C[0][1] * w0 + C[1][1] * w1 + C[2][1] * w2) * tl + (Dp[0][1] * w0 + Dp[1][1] * w1 + Dp[2][1] * w2) * th;
            const cb = (C[0][2] * w0 + C[1][2] * w1 + C[2][2] * w2) * tl + (Dp[0][2] * w0 + Dp[1][2] * w1 + Dp[2][2] * w2) * th;
            const sh = 0.55 + 0.6 * dif, sp = hv * 150 * Math.min(1, h * 1.6);
            r = cr * sh + sp; g = cg * sh + sp; b = cb * sh + sp;
            sa = Math.min(1, h * 1.5);
            const gd = GBUF.d;
            gd[o] = cr / tl > 255 ? 255 : (C[0][0] * w0 + C[1][0] * w1 + C[2][0] * w2);
            gd[o + 1] = (C[0][1] * w0 + C[1][1] * w1 + C[2][1] * w2) * 0.85;
            gd[o + 2] = C[0][2] * w0 + C[1][2] * w1 + C[2][2] * w2;
            gd[o + 3] = Math.min(255, h * 460);
          }
          const ma = m > 0.1 ? Math.min(0.13, (m - 0.1) * 0.035) * (1 - sa) : 0, A = sa + ma;
          if (A < 0.004) { d[o + 3] = 0; continue; }
          d[o] = (r * sa + 190 * ma) / A; d[o + 1] = (g * sa + 182 * ma) / A; d[o + 2] = (b * sa + 150 * ma) / A; d[o + 3] = A * 255;
        }
        IMG.flush();
        if (!chem && cfg.neon > 0) GBUF.flush();
      }

      /* expériences */
      const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0 }; };
      function clearAll() {
        for (const t of T) t.fill(0);
        M.fill(0); FOOD.fill(0); SALT.fill(0); OCC.fill(0); LMASK.fill(0); CH.fill(0);
        nA = 0; cntS.fill(0); flakes.length = 0; lamps.length = 0; frQ.length = 0; nFr = 0; label = null;
        for (const L of [DL, FRL]) { L.g.save(); L.g.setTransform(1, 0, 0, 1, 0, 0); L.g.clearRect(0, 0, L.w, L.h); L.g.restore(); }
        computeLit();
        cfg.cap = 1;
      }
      function expMaze() {
        clearAll(); cfg.cap = 0.4;
        const v = view(), mar = 26, x0 = v.x0 + mar, x1 = v.x1 - mar, y0 = mar, y1 = H - mar;
        const cs = clamp(Math.min(x1 - x0, y1 - y0) / 6, 55, 110), cols = Math.max(3, Math.floor((x1 - x0) / cs)), rows = Math.max(3, Math.floor((y1 - y0) / cs));
        const ox = x0 + (x1 - x0 - cols * cs) / 2, oy = y0 + (y1 - y0 - rows * cs) / 2;
        const Hw = new Uint8Array((rows + 1) * cols).fill(1), Vw = new Uint8Array(rows * (cols + 1)).fill(1), vis = new Uint8Array(rows * cols);
        const st = [[0, 0]]; vis[0] = 1;
        while (st.length) {
          const [r, c] = st[st.length - 1], nb = [];
          if (r > 0 && !vis[(r - 1) * cols + c]) nb.push([r - 1, c, 'n']);
          if (r < rows - 1 && !vis[(r + 1) * cols + c]) nb.push([r + 1, c, 's']);
          if (c > 0 && !vis[r * cols + c - 1]) nb.push([r, c - 1, 'w']);
          if (c < cols - 1 && !vis[r * cols + c + 1]) nb.push([r, c + 1, 'e']);
          if (!nb.length) { st.pop(); continue; }
          const [nr, nc, dir] = nb[rint(nb.length)];
          if (dir === 'n') Hw[r * cols + c] = 0; else if (dir === 's') Hw[(r + 1) * cols + c] = 0;
          else if (dir === 'w') Vw[r * (cols + 1) + c] = 0; else Vw[r * (cols + 1) + c + 1] = 0;
          vis[nr * cols + nc] = 1; st.push([nr, nc]);
        }
        for (let r = 0; r <= rows; r++) for (let c = 0; c < cols; c++) if (Hw[r * cols + c]) saltLine(ox + c * cs, oy + r * cs, ox + (c + 1) * cs, oy + r * cs);
        for (let r = 0; r < rows; r++) for (let c = 0; c <= cols; c++) if (Vw[r * (cols + 1) + c]) saltLine(ox + c * cs, oy + r * cs, ox + c * cs, oy + (r + 1) * cs);
        addFlake(ox + cs / 2, oy + cs / 2, 11 * kS);
        addFlake(ox + (cols - 0.5) * cs, oy + (rows - 0.5) * cs, 14 * kS);
        inoc(0, ox + cs / 2, oy + cs / 2, 2400);
      }
      function expFrance() {
        clearAll(); cfg.cap = 0.3;
        const v = view(), cl = Math.cos((46.6 * Math.PI) / 180), pj = (lo, la) => [(lo - 2.4) * cl, -la];
        const pts = FR.map(([lo, la]) => pj(lo, la));
        let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
        for (const [x, y] of pts) { mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
        const sc = Math.min((v.w - 60) / (mxx - mnx), (H - 50) / (mxy - mny)), cx = (v.x0 + v.x1) / 2, cy = H / 2, mx = (mnx + mxx) / 2, my = (mny + mxy) / 2;
        const tr = ([x, y]) => [cx + (x - mx) * sc, cy + (y - my) * sc];
        const poly = pts.map(tr);
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const px = (x + 0.5) * CS, py = (y + 0.5) * CS;
          let ins = false;
          for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
            const [xa, ya] = poly[a], [xb, yb] = poly[b];
            if (ya > py !== yb > py && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) ins = !ins;
          }
          LMASK[y * GW + x] = ins ? 0 : 1;
        }
        computeLit();
        dg.save();
        dg.beginPath(); dg.rect(0, 0, W, H);
        poly.forEach(([x, y], k) => (k ? dg.lineTo(x, y) : dg.moveTo(x, y))); dg.closePath();
        dg.fillStyle = 'rgba(150,185,255,.07)'; dg.fill('evenodd');
        dg.beginPath(); poly.forEach(([x, y], k) => (k ? dg.lineTo(x, y) : dg.moveTo(x, y))); dg.closePath();
        dg.setLineDash([4, 5]); dg.strokeStyle = 'rgba(205,220,255,.3)'; dg.lineWidth = 1; dg.stroke();
        dg.setLineDash([]);
        dg.font = '500 9px "JetBrains Mono", monospace'; dg.fillStyle = 'rgba(235,225,205,.55)';
        let paris = null;
        for (const [n, lo, la] of CITIES) {
          const [x, y] = tr(pj(lo, la));
          addFlake(x, y, (n === 'Paris' ? 15 : 10) * kS);
          dg.fillText(n.toUpperCase(), x + 9 * kS, y - 6 * kS);
          if (n === 'Paris') paris = [x, y];
        }
        dg.restore();
        inoc(0, paris[0], paris[1], 2600);
      }
      function expRing() {
        clearAll(); cfg.cap = 0.45;
        const v = view(), cx = (v.x0 + v.x1) / 2, cy = H / 2, R = Math.min(v.w, H) * 0.36;
        for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; addFlake(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
        addFlake(cx, cy, 10 * kS); inoc(0, cx, cy, 2400);
      }
      function expDuel() {
        clearAll();
        const v = view(), pos = [[0.2, 0.25], [0.82, 0.3], [0.5, 0.84]];
        pos.forEach(([fx, fy], s) => { const x = v.x0 + v.w * fx, y = H * fy; addFlake(x, y); inoc(s, x, y, 1800); });
        for (let k = 0; k < 12; k++) addFlake(v.x0 + v.w * rnd(0.75, 0.25), H * rnd(0.7, 0.3));
      }
      function defaultScene() {
        const v = view();
        const px = v.x0 + v.w * 0.36, py = H * 0.55;
        inoc(0, px, py, 2600); addFlake(px, py, 11 * kS);
        for (let k = 0; k < 9; k++) {
          const a = rnd(TAU), d = rnd(Math.min(v.w, H) * 0.42, Math.min(v.w, H) * 0.14);
          const x = clamp(px + Math.cos(a) * d, v.x0 + 30, v.x1 - 30), y = clamp(py + Math.sin(a) * d, 30, H - 30);
          addFlake(x, y);
        }
        const lx = v.x0 + v.w * 0.86, ly = H * 0.2; inoc(1, lx, ly, 1400); addFlake(lx, ly); addFlake(lx - 70 * kS, ly + 90 * kS);
        const sx = v.x0 + v.w * 0.84, sy = H * 0.82; inoc(2, sx, sy, 1400); addFlake(sx, sy); addFlake(sx - 90 * kS, sy - 50 * kS);
      }

      let label = null;
      const ripples = [];
      function drawLabel() {
        const L = label, a = Math.min(1, L.t, (6 - L.t) * 2.5);
        if (a <= 0.01) return;
        const p = P[L.s], side = L.x > W * 0.6 ? -1 : 1, lx = L.x + side * 46, ly = L.y - 36;
        ctx.save();
        ctx.strokeStyle = css(p.col, (a * 0.7).toFixed(3)); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(L.x, L.y, 14, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(L.x + side * 10, L.y - 10); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
        ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 6;
        ctx.textAlign = side > 0 ? 'left' : 'right';
        ctx.fillStyle = `rgba(255,248,236,${(a * 0.95).toFixed(3)})`;
        ctx.font = 'italic 500 14px "Space Grotesk", sans-serif';
        ctx.fillText(p.nom, lx, ly);
        ctx.fillStyle = css(p.col, (a * 0.9).toFixed(3));
        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillText(p.fr.toUpperCase(), lx, ly + 15);
        ctx.restore();
      }

      defaultScene();
      for (let k = 0; k < 90; k++) step();
      drawFruits();
      quiet = false;
      let VT = 0, acc = 0, remT = 0, litT = 0, litDirty = false, dronT = 0, lastEat = 0;
      const drones = [];
      if (au && au.live) drones.push(au.drone(55, 'sine', 0.03), au.drone(82.4, 'sine', 0.012));

      function cut(x, y) {
        const r = 12 * kS, gx = x / CS, gy = y / CS, R = r / CS;
        for (let k = nA - 1; k >= 0; k--) { const dx = AX[k] - gx, dy = AY[k] - gy; if (dx * dx + dy * dy < R * R) remove(k); }
        const E = Math.ceil(R);
        for (let dy = -E; dy <= E; dy++) for (let dx = -E; dx <= E; dx++) {
          const X = (gx + dx) | 0, Y = (gy + dy) | 0;
          if (X >= 0 && Y >= 0 && X < GW && Y < GH && dx * dx + dy * dy <= R * R) { const i = Y * GW + X; T[0][i] = T[1][i] = T[2][i] = 0; }
        }
      }

      return {
        frame(tt, dt) {
          VT += dt;
          acc += dt * 36;
          let n = Math.floor(acc); acc -= n; if (n > 3) n = 3;
          for (let i = 0; i < n; i++) step();
          if (frQ.length) {
            drawFruits();
            if (snd() && VT - lastFr > 0.3) { lastFr = VT; au.pluck(scale(rint(5) + 9, 440), 0.6, 0.012); }
          }
          if ((remT -= dt) <= 0) {
            remT = 0.5;
            for (let i = flakes.length - 1; i >= 0; i--) {
              const f = flakes[i]; let s = 0;
              for (const c of f.cells) s += FOOD[c];
              f.rem = s;
              if (s < f.amt0 * 0.03) { for (const c of f.cells) FOOD[c] = 0; flakes.splice(i, 1); }
            }
          }
          if (litDirty && (litT -= dt) <= 0) { litT = 0.06; litDirty = false; computeLit(); }
          if (snd() && ateAcc > 0.5 && VT - lastEat > 1.4) { lastEat = VT; ateAcc = 0; au.pluck(scale(rint(5), 110), 1.8, 0.03); }
          if (drones.length && (dronT -= dt) <= 0) { dronT = 0.25; drones[0].gain(0.02 + 0.016 * (0.5 + 0.5 * Math.sin(VT * 1.25))); }
          for (const r of ripples) r.t += dt;
          while (ripples.length && ripples[0].t > 1.4) ripples.shift();
          if (label) { label.t -= dt; if (label.t <= 0) label = null; }

          render(VT);
          const chem = cfg.view === 'chimie';
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(bg.c, 0, 0, W, H);
          if (!chem) {
            for (const f of flakes) {
              const k = f.rem / f.amt0, S = f.spr.width;
              ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
              ctx.globalAlpha = 0.25 + 0.75 * k;
              const z = 0.7 + 0.3 * k;
              ctx.drawImage(f.spr, (-S / 2) * z, (-S / 2) * z, S * z, S * z);
              ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.drawImage(DL.c, 0, 0, W, H);
          }
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(IMG.c, 0, 0, GW * CS, GH * CS);
          if (!chem && cfg.neon > 0) {
            const ga = GLA.g, gb = GLB.g;
            ga.clearRect(0, 0, GLA.w, GLA.h); ga.drawImage(GBUF.c, 0, 0, GLA.w, GLA.h);
            gb.clearRect(0, 0, GLB.w, GLB.h); gb.drawImage(GLA.c, 0, 0, GLB.w, GLB.h);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, 0.3 * cfg.neon); ctx.drawImage(GLA.c, 0, 0, GW * CS, GH * CS);
            ctx.globalAlpha = Math.min(1, 0.45 * cfg.neon); ctx.drawImage(GLB.c, 0, 0, GW * CS, GH * CS);
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          }
          if (!chem) ctx.drawImage(FRL.c, 0, 0, W, H);
          ctx.globalCompositeOperation = 'lighter';
          for (const l of lamps) {
            const fl = 0.92 + 0.08 * Math.sin(VT * 7 + l.x);
            ctx.globalAlpha = 0.5 * fl; ctx.drawImage(lampSpr, l.x - l.r * 1.6, l.y - l.r * 1.6, l.r * 3.2, l.r * 3.2);
            ctx.globalAlpha = 0.9; ctx.drawImage(lampSpr, l.x - 14, l.y - 14, 28, 28);
          }
          for (const r of ripples) {
            const k = r.t / 1.4;
            ctx.globalAlpha = (1 - k) * 0.5; ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(r.x, r.y, 8 + k * 50 * kS, 0, TAU); ctx.stroke();
          }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          if (label) drawLabel();
        },
        down(p) {
          const tool = env.tool;
          this._mode = null; this._d = 0;
          if (tool === 'avoine') { addFlake(p.x, p.y); if (snd()) au.noise(0.12, 0.03, 1400, 1, 'bandpass'); return; }
          if (tool === 'sel') { this._mode = 'sel'; sprinkle(p.x, p.y); if (snd()) au.noise(0.25, 0.03, 7000, 2, 'bandpass'); return; }
          if (tool === 'couper') { this._mode = 'cut'; cut(p.x, p.y); if (snd()) au.noise(0.3, 0.04, 3000, 1.5, 'bandpass', 600); return; }
          if (tool === 'lumiere') {
            let hit = -1;
            lamps.forEach((l, k) => { if (Math.hypot(l.x - p.x, l.y - p.y) < 26) hit = k; });
            if (hit >= 0) { this._lamp = lamps[hit]; this._mode = 'lamp'; this._moved = false; return; }
            if (lamps.length >= 6) lamps.shift();
            const l = { x: p.x, y: p.y, r: 70 * kS };
            lamps.push(l); this._lamp = l; this._mode = 'lamp'; this._moved = true; litDirty = true; litT = 0;
            if (snd()) au.note(520, 0.8, 'sine', 0.03, 780);
            return;
          }
          const s = Math.max(0, P.findIndex((q) => q.key === tool));
          const i = ((p.y / CS) | 0) * GW + ((p.x / CS) | 0);
          if (i >= 0 && i < NC) {
            const tot = T[0][i] + T[1][i] + T[2][i];
            if (tot > 8) {
              let b = 0; if (T[1][i] > T[b][i]) b = 1; if (T[2][i] > T[b][i]) b = 2;
              label = { x: p.x, y: p.y, s: b, t: 6 }; ripples.push({ x: p.x, y: p.y, t: 0 });
              if (navigator.vibrate) navigator.vibrate([5, 25, 5]);
              if (snd()) [0, 2, 4, 7].forEach((dd, k) => setTimeout(() => au.pluck(scale(b * 2 + dd + 4, 220), 1.4, 0.03), k * 80));
              return;
            }
          }
          inoc(s, p.x, p.y);
          if (navigator.vibrate) navigator.vibrate(6);
        },
        move(p) {
          if (!p.down || !this._mode) return;
          this._d += Math.hypot(p.dx, p.dy);
          if (this._mode === 'sel' && this._d > 8) { this._d = 0; sprinkle(p.x, p.y); if (snd() && Math.random() < 0.2) au.noise(0.15, 0.02, 7000, 2, 'bandpass'); }
          else if (this._mode === 'cut' && this._d > 4) { this._d = 0; cut(p.x, p.y); }
          else if (this._mode === 'lamp' && this._lamp && this._d > 3) { this._lamp.x = p.x; this._lamp.y = p.y; this._moved = true; litDirty = true; }
        },
        up() {
          if (this._mode === 'lamp' && !this._moved && this._lamp) {
            const k = lamps.indexOf(this._lamp); if (k >= 0) lamps.splice(k, 1); litDirty = true; litT = 0;
          }
          this._mode = null; this._lamp = null;
        },
        dispose() { drones.forEach((d) => d.stop()); },
        livePaused: true,
        clear: clearAll,
        ui() {
          const L = [{ type: 'section', label: 'Biomasse' }];
          P.forEach((p, s) => L.push({ type: 'bar', label: p.nom, color: css(p.col), value: (cntS[s] / AMAX) * 2.5, txt: cntS[s].toLocaleString('fr-FR') + ' agents' }));
          L.push({ type: 'section', label: 'Expériences célèbres' });
          L.push({ type: 'note', text: 'Chaque expérience vide la boîte puis installe le dispositif.' });
          L.push({ type: 'buttons', items: [{ label: 'Labyrinthe', act: expMaze }, { label: 'Réseau ferré', act: expFrance }, { label: 'Cercle d’avoine', act: expRing }, { label: 'Duel à trois', act: expDuel }] });
          const sp = P[cfg.sel], b = BASE[cfg.sel];
          L.push({ type: 'section', label: 'Comportement' });
          L.push({ type: 'choice', label: 'Espèce à régler', value: cfg.sel, options: [{ id: 0, label: 'Physarum' }, { id: 1, label: 'Lycogala' }, { id: 2, label: 'Stemonitis' }], set: (v) => { cfg.sel = v; } });
          L.push({ type: 'slider', label: 'Angle des capteurs', min: 0.1, max: 1.5, step: 0.01, value: sp.SA, fmt: (v) => Math.round((v * 180) / Math.PI) + '°', set: (v) => { sp.SA = v; } });
          L.push({ type: 'slider', label: 'Portée des capteurs', min: 2, max: 30, step: 0.5, value: sp.SO, fmt: (v) => Math.round(v * CS) + ' px', set: (v) => { sp.SO = v; } });
          L.push({ type: 'slider', label: 'Angle de rotation', min: 0.05, max: 1.5, step: 0.01, value: sp.RA, fmt: (v) => Math.round((v * 180) / Math.PI) + '°', set: (v) => { sp.RA = v; } });
          L.push({ type: 'slider', label: 'Vitesse', min: 0.3, max: 2.5, step: 0.05, value: sp.SS, fmt: (v) => '×' + v.toFixed(2), set: (v) => { sp.SS = v; } });
          L.push({ type: 'slider', label: 'Peur de la lumière', min: 0, max: 5, step: 0.1, value: sp.light, fmt: (v) => v.toFixed(1), set: (v) => { sp.light = v; } });
          L.push({ type: 'buttons', items: [{ label: 'Valeurs naturelles', act: () => Object.assign(sp, b) }] });
          L.push({ type: 'section', label: 'Milieu' });
          L.push({ type: 'slider', label: 'Biomasse maximale', min: 0.1, max: 1, step: 0.05, value: cfg.cap, fmt: (v) => Math.round(v * 100) + ' %', set: (v) => { cfg.cap = v; } });
          L.push({ type: 'slider', label: 'Évaporation des traces', min: 0.02, max: 0.3, step: 0.01, value: cfg.decay, fmt: (v) => Math.round(v * 100) + ' %', set: (v) => { cfg.decay = v; } });
          L.push({ type: 'slider', label: 'Attrait de la nourriture', min: 0, max: 3, step: 0.05, value: cfg.food, fmt: (v) => '×' + v.toFixed(2), set: (v) => { cfg.food = v; } });
          L.push({ type: 'toggle', label: 'Mémoire externe (mucus)', value: cfg.memory, set: (v) => { cfg.memory = v; } });
          L.push({ type: 'toggle', label: 'Faim, mort et fructification', value: cfg.life, set: (v) => { cfg.life = v; } });
          L.push({ type: 'section', label: 'Affichage' });
          L.push({ type: 'choice', label: 'Vue', value: cfg.view, options: [{ id: 'reel', label: 'Réaliste' }, { id: 'chimie', label: 'Chimie' }], set: (v) => { cfg.view = v; } });
          L.push({ type: 'slider', label: 'Éclat néon', min: 0, max: 1.6, step: 0.05, value: cfg.neon, fmt: (v) => Math.round(v * 100) + ' %', set: (v) => { cfg.neon = v; } });
          L.push({ type: 'toggle', label: 'Pulsation du cytoplasme', value: cfg.pulse, set: (v) => { cfg.pulse = v; } });
          return L;
        },
      };
    },
  });
})();
