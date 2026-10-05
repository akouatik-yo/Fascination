/* Fascination — Le Sable · la physique des grains
   Automate cellulaire granulaire : chute avec vitesse, glissements diagonaux et roulements qui fixent un angle
   de repos propre à chaque sable, cohésion du sable mouillé (ponts capillaires), eau, bulles d'air, grains
   projetés en vol. Acteurs vivants : fourmilions qui creusent leurs entonnoirs à l'angle de repos et fourmis
   moissonneuses. Scènes : fourmilions, sablier, tableau de sable, château de sable. */
(function boot() {
  if (!window.FK || !window.SABLE3D) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, layer } = window.FK;

  /* ───────── matières ───────── */
  const E = 0, Q = 1, B = 2, K = 3, O = 4, G = 5, WA = 6, P = 7, V = 8, A = 9;
  const isGrain = (m) => m >= 1 && m <= 5;
  // slide : probabilité de glisser en diagonale · roll : de rouler de deux cases (abaisse l'angle de repos) · sink : de couler dans l'eau
  const MAT = {
    [Q]: { nom: 'Quartz', fr: 'sable de dune · SiO₂', col: [222, 178, 104], slide: 0.92, roll: 0.42, sink: 0.45, angle: 33, css: '#e6b46a' },
    [B]: { nom: 'Basalte', fr: 'sable noir volcanique · Islande', col: [58, 56, 62], slide: 0.75, roll: 0.12, sink: 0.6, angle: 38, css: '#8a8894' },
    [K]: { nom: 'Homotrema rubrum', fr: 'sable rose · foraminifère des Bermudes', col: [238, 168, 168], slide: 0.95, roll: 0.5, sink: 0.3, angle: 31, css: '#f2a6a6' },
    [O]: { nom: 'Olivine', fr: 'sable vert · Papakōlea, Hawaï', col: [128, 150, 70], slide: 0.9, roll: 0.35, sink: 0.55, angle: 34, css: '#9ab45a' },
    [G]: { nom: 'Gravier', fr: 'gros grains · roulent plus loin', col: [150, 140, 128], slide: 1, roll: 0.8, sink: 0.8, angle: 30, css: '#a49a8c' },
  };
  // couleurs teintes (tableau de sable)
  const DYE = [null, [24, 22, 30], [245, 242, 232], [40, 200, 200], [230, 60, 150], [255, 170, 40], [70, 60, 200], [220, 40, 40]];

  window.FASC.push({
    id: 'sable', name: 'Le Sable', cat: 'Éléments', glyph: '⌛', decor: true, smoothTime: true,
    blurb: 'Dunes, avalanches, sabliers, fourmilions',
    hint: 'OBSERVER : touchez le sable ou une bête · VERSER : glissez pour verser le sable choisi · EAU : mouillez · PIERRE : posez un rocher · SECOUER : faites vibrer · SOUFFLE : glissez pour faire voler les grains · GOMME : creusez.',
    intro: 'Un désert vu en relief, où le vent pousse des dunes en croissant. Un tas de sable n’est ni un solide ni un liquide. Il coule comme de l’eau, puis s’arrête net à un angle précis ; mouillé, il tient debout ; secoué, il trie ses grains. Au pied des dunes, des fourmilions creusent des pièges réglés sur cet angle et attendent qu’une fourmi glisse.',
    legend: [
      { color: '#e6b46a', name: 'Quartz', role: 'sable de dune · angle de repos ≈ 33°', desc: 'Des grains de silice arrondis par des milliers d’années de vent. Ils roulent bien : les pentes s’arrêtent vers 33°.' },
      { color: '#8a8894', name: 'Basalte', role: 'sable noir · plages d’Islande', desc: 'De la lave refroidie brutalement dans la mer, broyée par les vagues. Ses grains anguleux s’accrochent : ses tas sont plus raides.' },
      { color: '#f2a6a6', name: 'Homotrema rubrum', role: 'foraminifère · sable rose des Bermudes', desc: 'Un animal unicellulaire à coquille rouge qui vit sous les récifs. Ses débris, mêlés au corail blanc, colorent les plages en rose.' },
      { color: '#9ab45a', name: 'Olivine', role: 'sable vert · Papakōlea, Hawaï', desc: 'Un minéral des laves, plus dense que le quartz, libéré par l’érosion d’un cône volcanique. Les vagues emportent le reste et le vert demeure.' },
      { color: '#a49a8c', name: 'Gravier', role: 'gros grains · effet noix du Brésil', desc: 'Secouez un bocal de grains mélangés : les gros remontent. Les petits se glissent sous eux à chaque secousse.' },
      { color: '#c9925a', name: 'Myrmeleon formicarius', role: 'fourmilion · larve chasseresse', desc: 'Elle recule en spirale pour creuser un entonnoir dont les pentes sont exactement à l’angle de repos, puis attend au fond. Quand une fourmi glisse, elle lui jette du sable pour déclencher une avalanche.' },
      { color: '#3a2a22', name: 'Messor barbarus', role: 'fourmi moissonneuse', desc: 'Elle rapporte des graines au nid, en file. Au bord d’un entonnoir, le sable se dérobe sous ses pattes.' },
      { color: '#6fb8ff', name: 'Eau', role: 'ponts capillaires', desc: 'Entre deux grains, un ménisque d’eau les tire l’un vers l’autre. Un peu d’eau rend le sable solide ; trop d’eau, et il redevient boue.' },
    ],
    about: [
      'Versez du sable sec : il forme un cône dont la pente ne dépasse jamais un angle précis, l’angle de repos, autour de 30 à 35° selon la forme des grains. Ajoutez des grains un à un : la pente monte, puis une avalanche la ramène à l’équilibre. Petites et grandes avalanches suivent une même loi ; Bak, Tang et Wiesenfeld (1987) en ont fait le symbole de la « criticité auto-organisée ».',
      'Pourquoi un sablier mesure-t-il le temps ? Dans un silo, les grains s’appuient sur les parois : la pression au fond cesse de croître avec la hauteur (Janssen, 1895). Le débit au goulot ne dépend donc que de sa largeur (loi de Beverloo, 1961), pas de la quantité de sable restante. Si le goulot fait moins de cinq grains, des voûtes se forment et bloquent tout : une petite tape les brise.',
      'Le sable mouillé tient debout grâce aux ponts d’eau entre les grains. Il suffit d’environ 1 % d’eau pour bâtir un château ; au-delà, le sable redevient fluide. Au soleil, les ponts s’évaporent et les tours s’effritent grain à grain.',
      'La larve du fourmilion marche à reculons et n’a pas d’anus : elle garde ses déchets jusqu’à sa métamorphose en un insecte ailé qui ressemble à une demoiselle. Son entonnoir exploite la physique : sur une pente à l’angle de repos, un rien suffit à déclencher une avalanche (Fertin et Casas, 2007).',
      'Le vent ne pousse pas le sable en bloc : il arrache des grains qui rebondissent sur la surface (la saltation, décrite par Ralph Bagnold en 1941) et retombent à l’abri des crêtes. Brad Werner (1995) a montré qu’une règle aussi simple suffit à faire naître toutes les formes de dunes : avec peu de sable sur un sol dur, des barkhanes en croissant qui avancent de plusieurs mètres par an, cornes pointées sous le vent ; avec beaucoup de sable, des cordons parallèles. Ici, chaque tranche emportée et chaque avalanche sont calculées.',
      'Certaines dunes chantent : quand une avalanche dévale leur face, elles grondent entre 70 et 105 Hz, un son que Marco Polo attribuait à des esprits. Avec le SON, écoutez les grosses avalanches.',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez un grain pour reconnaître le sable et mesurer la pente locale. Touchez un fourmilion ou une fourmi pour suivre ce qu’ils font.' },
      { id: 'verser', label: 'verser', desc: 'Glissez pour verser le sable choisi dans le panneau (rubrique « Verser »).' },
      { id: 'eau', label: 'eau', desc: 'Glissez pour verser de l’eau : le sable mouillé devient cohésif et tient debout.' },
      { id: 'pierre', label: 'pierre', desc: 'Glissez pour poser de la pierre : paroi, goulot, étagère.' },
      { id: 'secouer', label: 'secouer', desc: 'Maintenez le doigt pour faire vibrer le sable : les gros grains remontent, les voûtes se brisent.' },
      { id: 'souffle', label: 'souffle', desc: 'Glissez pour souffler : les grains de surface s’envolent et retombent plus loin.' },
      { id: 'gomme', label: 'gomme', desc: 'Glissez pour effacer.' },
    ],
    // aiguillage : scènes en relief (moteur 3D) ou en coupe (moteur 2D)
    make(env) {
      const self = this, SC3 = ['dunes', 'fourmilions', 'tas', 'chateau'];
      let cur = null, scene = 'dunes', is3 = false;
      function go(s) {
        if (cur) { try { cur.dispose(); } catch (e) { /* rien */ } }
        scene = s;
        if (SC3.includes(s) && window.SABLE3D) {
          try { cur = window.SABLE3D(env, s); is3 = true; return; } catch (e) { console.warn('Le Sable 3D : repli en 2D', e); }
        }
        is3 = false;
        cur = self._make2D(env, s === 'dunes' || s === 'tas' ? 'fourmilions' : s);
      }
      go('dunes');
      if (window.FASC_DEBUG) window.FASC_DEBUG.sable3 = { go, get cur() { return cur; } };
      const NAMES = [['dunes', 'Dunes'], ['fourmilions', 'Fourmilions'], ['tas', 'Tas de sable'], ['chateau', 'Château de sable'], ['sablier', 'Sablier (coupe)'], ['tableau', 'Tableau de sable (coupe)']];
      return {
        livePaused: true,
        frame: (t, dt) => cur.frame(t, dt),
        down: (p) => cur.down && cur.down(p),
        move: (p) => cur.move && cur.move(p),
        up: (p) => cur.up && cur.up(p),
        clear: () => cur.clear && cur.clear(),
        dispose: () => cur.dispose && cur.dispose(),
        ui() {
          const L = [{ type: 'section', label: 'Scènes' }, { type: 'buttons', items: NAMES.map(([id, label]) => ({ label: (id === scene ? '● ' : '') + label, act: () => go(id) })) }];
          if (!is3 && SC3.includes(scene)) L.push({ type: 'note', text: 'Le relief en 3D demande WebGL2 : cette scène s’affiche en coupe.' });
          const inner = cur.ui ? cur.ui() : [];
          // la coupe 2D a sa propre rubrique « Scènes » : on n'en retire que le titre et les boutons,
          // et ses réglages propres à la scène passent sous une rubrique au nom de la scène
          for (let i = 0; i < inner.length; i++) {
            const c = inner[i];
            if (c.type === 'section' && /^scènes$/i.test(c.label)) {
              if (inner[i + 1] && inner[i + 1].type === 'buttons') i++;
              if (inner[i + 1] && inner[i + 1].type !== 'section') L.push({ type: 'section', label: (NAMES.find(([id]) => id === scene) || [0, 'Scène'])[1] });
              continue;
            }
            L.push(c);
          }
          return L;
        },
      };
    },
    _make2D(env, startScene) {
      const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
      const kS = clamp(Math.min(W, H) / 800, 0.6, 1.5);
      const mobile = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent) || Math.min(W, H) < 520;
      const cfg = { scene: 'fourmilions', put: Q, sun: 0.5, auto: true, q: 'haute', neck: 4 };
      const snd = () => au && au.on && au.ctx;
      const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };

      /* ───────── la grille ───────── */
      let GW, GH, N, cs, M, T, D, Vy, Wt, St, img, imgL, F = 0;
      function alloc() {
        cs = { legere: 5, normale: 3.6, haute: 2.6 }[cfg.q] * Math.max(0.8, kS * 0.9);
        GW = Math.round(W / cs); GH = Math.round(H / cs); cs = W / GW; N = GW * GH;
        M = new Uint8Array(N); T = new Uint8Array(N); D = new Uint8Array(N); Vy = new Uint8Array(N); Wt = new Uint8Array(N); St = new Uint16Array(N);
        for (let i = 0; i < N; i++) T[i] = rint(256);
        imgL = layer(GW * 2, GH * 2); img = imgL.g.createImageData(GW * 2, GH * 2);
      }
      alloc();
      const id = (x, y) => y * GW + x;
      const cx = (px) => clamp(Math.floor(px / cs), 0, GW - 1), cy = (py) => clamp(Math.floor(py / cs), 0, GH - 1);
      function put(x, y, m, dye, wet) { if (x < 0 || y < 0 || x >= GW || y >= GH) return; const i = id(x, y); M[i] = m; D[i] = dye || 0; Wt[i] = wet || 0; Vy[i] = 0; T[i] = rint(256); }
      function swap(i, j) {
        let t = M[i]; M[i] = M[j]; M[j] = t; t = T[i]; T[i] = T[j]; T[j] = t; t = D[i]; D[i] = D[j]; D[j] = t;
        t = Wt[i]; Wt[i] = Wt[j]; Wt[j] = t; t = Vy[i]; Vy[i] = Vy[j]; Vy[j] = t;
      }
      const surf = (x) => { x = clamp(Math.round(x), 0, GW - 1); for (let y = 0; y < GH; y++) { const m = M[id(x, y)]; if (m !== E && m !== A) return y; } return GH; };

      /* ───────── vols de grains (souffle, fourmilion) ───────── */
      let fly = [];
      function launch(x, y, vx, vy) {
        const i = id(x, y), m = M[i];
        if (!isGrain(m)) return false;
        fly.push({ x: x + 0.5, y: y + 0.5, vx, vy, m, t: T[i], d: D[i], w: Wt[i] });
        M[i] = E; Wt[i] = 0; D[i] = 0;
        return true;
      }

      /* ───────── un pas de l'automate ───────── */
      let moved = 0, slid = 0, flowCount = 0;
      function tick() {
        F = (F + 1) & 0xffff || 1;
        moved = 0; slid = 0;
        // probabilité, à chaque contrôle, qu'un grain perde une unité d'humidité (à l'air libre : quatre fois plus)
        const dry = cfg.sun * (cfg.scene === 'chateau' ? 0.16 : 0.12);
        for (let y = GH - 1; y >= 0; y--) {
          const l2r = (F + y) & 1;
          for (let k = 0; k < GW; k++) {
            const x = l2r ? k : GW - 1 - k, i = y * GW + x, m = M[i];
            if (m === E || m === P || m === V || St[i] === F) continue;
            if (isGrain(m)) {
              const mt = MAT[m];
              // humidité : les grains au contact de l'eau se mouillent, les autres sèchent
              let wet = Wt[i];
              if (((x + y + F) & 3) === 0) {
                const nW = (x > 0 && M[i - 1] === WA) || (x < GW - 1 && M[i + 1] === WA) || (y > 0 && M[i - GW] === WA) || (y < GH - 1 && M[i + GW] === WA);
                if (nW) wet = 255;
                else {
                  // remontée capillaire depuis le grain du dessous, et séchage à l'air libre
                  if (y < GH - 1 && Wt[i + GW] > wet + 30 && isGrain(M[i + GW])) wet = Wt[i + GW] - 24;
                  const open = y > 0 && M[i - GW] === E;
                  if (wet > 0 && Math.random() < (open ? dry : dry * 0.1)) wet -= 1;
                }
                Wt[i] = wet;
              }
              // les ponts capillaires n'existent qu'entre air et eau : un sable noyé n'a aucune cohésion
              const sub = (y > 0 && M[i - GW] === WA) || (y < GH - 1 && M[i + GW] === WA);
              const cohesive = wet > 70 && !sub;
              if (y === GH - 1) { Vy[i] = 0; continue; }
              const b = i + GW, mb = M[b];
              const inWater = mb === WA || mb === A;
              if (mb === E || mb === WA || mb === A) {
                // pont capillaire : un grain mouillé tenu par ses voisins mouillés ne tombe pas
                if (cohesive && x > 0 && x < GW - 1 && isGrain(M[i - 1]) && isGrain(M[i + 1]) && Wt[i - 1] > 70 && Wt[i + 1] > 70 && Math.random() > 0.004) continue;
                if (inWater && Math.random() > mt.sink) { St[i] = F; continue; }
                let v = inWater ? 1 : Math.min(7, Vy[i] + 1), j = i, n = 0;
                while (n < v) { const nj = j + GW; if (nj >= N) break; const mm = M[nj]; if (mm === E || (inWater && (mm === WA || mm === A))) { j = nj; n++; } else break; }
                if (j === i) { j = b; }
                // dans l'eau, le grain dérive un peu de côté
                if (inWater && Math.random() < 0.1) { const s = Math.random() < 0.5 ? -1 : 1, jj = j + s; if (x + s >= 0 && x + s < GW && (M[jj] === WA || M[jj] === E)) j = jj; }
                swap(i, j); Vy[j] = inWater ? 0 : v; St[j] = F; moved++;
                if (cfg.scene === 'sablier' && y < neckY && Math.floor(j / GW) >= neckY) flowCount++;
                continue;
              }
              Vy[i] = 0;
              // glissement en diagonale, puis roulement plus loin
              const slide = cohesive ? 0.0012 : mt.slide, roll = cohesive ? 0 : mt.roll;
              if (Math.random() < slide) {
                const s = Math.random() < 0.5 ? -1 : 1;
                for (const dd of [s, -s]) {
                  const nx = x + dd; if (nx < 0 || nx >= GW) continue;
                  const j = b + dd, mj = M[j], side = M[i + dd];
                  if ((mj === E || mj === WA || mj === A) && (side === E || side === WA || side === A)) {
                    let jj = j;
                    const nx2 = x + 2 * dd;
                    if (Math.random() < roll && nx2 >= 0 && nx2 < GW && M[j + dd] === E && M[i + 2 * dd] === E) jj = j + dd;
                    swap(i, jj); St[jj] = F; slid++; moved++;
                    break;
                  }
                }
              }
            } else if (m === WA) {
              if (y < GH - 1) {
                const b = i + GW;
                if (M[b] === E || M[b] === A) { swap(i, b); St[b] = F; continue; }
                const s = Math.random() < 0.5 ? -1 : 1;
                let done = false;
                for (const dd of [s, -s]) { const nx = x + dd; if (nx >= 0 && nx < GW && (M[b + dd] === E) && M[i + dd] !== P) { swap(i, b + dd); St[b + dd] = F; done = true; break; } }
                if (done) continue;
              }
              const s = Math.random() < 0.5 ? -1 : 1;
              for (let r = 1; r <= 3; r++) { const nx = x + s * r; if (nx < 0 || nx >= GW) break; const j = i + s * r; if (M[j] === E) { swap(i, j); St[j] = F; break; } if (M[j] !== WA) break; }
              if (cfg.scene === 'chateau' && y > 0 && M[i - GW] === E && Math.random() < 0.00002 * (1 + cfg.sun * 4)) M[i] = E;
            } else if (m === A) {
              if (y > 0) {
                const u = i - GW;
                if (M[u] === WA || (isGrain(M[u]) && Math.random() < 0.08)) { swap(i, u); St[u] = F; continue; }
                const s = Math.random() < 0.5 ? -1 : 1, j = i + s;
                if (x + s >= 0 && x + s < GW && M[j] === WA) { swap(i, j); St[j] = F; }
              }
            }
          }
        }
        // grains en vol
        for (let k = fly.length - 1; k >= 0; k--) {
          const f = fly[k];
          f.vy += 0.09; f.x += f.vx; f.y += f.vy;
          const x = Math.floor(f.x), y = Math.floor(f.y);
          if (x < 0 || x >= GW || y >= GH) { fly.splice(k, 1); continue; }
          if (y < 0) continue;
          const mm = M[id(x, y)];
          if (mm !== E && mm !== A) {
            // atterrissage dans la dernière case libre au-dessus
            let yy = y - 1; while (yy >= 0 && M[id(x, yy)] !== E) yy--;
            if (yy >= 0) { const j = id(x, yy); M[j] = f.m; T[j] = f.t; D[j] = f.d; Wt[j] = f.w; Vy[j] = 0; }
            fly.splice(k, 1);
          }
        }
        if (fly.length > 600) fly.splice(0, fly.length - 600);
      }

      /* ───────── secousses ───────── */
      function shake(px, py, r) {
        const x0 = cx(px - r), x1 = cx(px + r), y0 = cy(py - r), y1 = cy(py + r);
        for (let y = y1; y >= y0; y--) for (let x = x0; x <= x1; x++) {
          const i = id(x, y), m = M[i];
          if (!isGrain(m)) continue;
          // effet noix du Brésil : un gros grain échange sa place avec le petit grain au-dessus
          if (m === G && y > 0 && isGrain(M[i - GW]) && M[i - GW] !== G && Math.random() < 0.35) { swap(i, i - GW); continue; }
          if (Math.random() < 0.12) { const s = Math.random() < 0.5 ? -1 : 1, j = i + s; if (x + s >= 0 && x + s < GW && (M[j] === E || M[j] === WA)) swap(i, j); }
          if (Wt[i] > 0 && Math.random() < 0.05) Wt[i] = Math.max(0, Wt[i] - 60);
        }
        unjam();
      }
      function unjam() { if (jam) { for (const i of jamCells) if (M[i] === V) M[i] = Q; jamCells = []; jam = 0; } }

      /* ───────── scènes ───────── */
      let jamCells = [], neckY = 0, neckX0 = 0, neckX1 = 0, jam = 0, flip = null, settle = 0, antl = [], ants = [], adults = [], nestX = 0, castleT = 0;
      function clearGrid() { M.fill(0); D.fill(0); Wt.fill(0); Vy.fill(0); fly = []; }
      function setScene(s) {
        cfg.scene = s; clearGrid(); antl = []; ants = []; adults = []; flip = null; settle = 0; jam = 0; label = null;
        const v = view(), gx0 = cx(v.x0), gx1 = cx(v.x1 - 1), gw = gx1 - gx0;
        if (s === 'fourmilions') {
          const base = Math.round(GH * 0.6);
          for (let x = 0; x < GW; x++) {
            const h = base - Math.round(Math.sin(x * 0.02) * GH * 0.018 + Math.sin(x * 0.09 + 1) * 1.2);
            for (let y = h; y < GH; y++) {
              const depth = y - h;
              const layerM = depth > GH * 0.18 && Math.sin(y * 0.6 + x * 0.02) > 0.82 ? O : depth > GH * 0.25 && Math.sin(y * 0.45) > 0.9 ? B : Q;
              put(x, y, layerM);
            }
          }
          for (let k = 0; k < 14; k++) { const x = rint(GW), y = surf(x) + rint(6); put(x, y, G); }
          nestX = gx0 + Math.round(gw * 0.07);
          const xs = [0.38, 0.62, 0.84].slice(0, gw < 160 ? 2 : 3);
          for (const f of xs) newAntlion(gx0 + Math.round(gw * f), true);
        } else if (s === 'sablier') {
          buildHourglass(true);
        } else if (s === 'tableau') {
          buildFrame();
        } else if (s === 'chateau') {
          buildBeach();
        }
        paintBg();
      }
      function newAntlion(x, predig) {
        const R = clamp(Math.round(GW * 0.045), 10, 30);
        const a = { x, R, depth: 0, fed: 0, toss: 0, t: 0, life: rnd(150, 90), seed: rnd(10) };
        if (predig) {
          const top = surf(x);
          for (let dx = -R; dx <= R; dx++) { const d = Math.round((R - Math.abs(dx)) * 0.62); const xx = x + dx; if (xx < 0 || xx >= GW) continue; for (let y = top - 3; y < top + d; y++) if (y >= 0) put(xx, y, E); }
        }
        antl.push(a);
        return a;
      }
      function buildHourglass(fill) {
        const v = view(), mx = cx(v.cx), top = Math.round(GH * 0.07), bot = Math.round(GH * 0.93), mid = Math.round((top + bot) / 2);
        const hw = Math.min(Math.round((v.w / cs) * 0.22), Math.round(GH * 0.3));
        neckY = mid;
        const wall = (y, half) => { put(mx - half - 1, y, V); put(mx + half + 1, y, V); };
        for (let y = top; y <= bot; y++) {
          const half = hgHalf(y, mid, top, hw);
          wall(y, half);
          if (y === mid) { neckX0 = mx - half; neckX1 = mx + half; }
          // on remplit d'abord les cases sous l'épaulement pour fermer la paroi
          const prevHalf = hgHalf(y - 1, mid, top, hw);
          for (let h = Math.min(half, prevHalf) + 1; h <= Math.max(half, prevHalf); h++) { put(mx - h - 1, y, V); put(mx + h + 1, y, V); }
        }
        for (let x = mx - hw - 1; x <= mx + hw + 1; x++) { put(x, top, V); put(x, bot, V); }
        if (fill) {
          const mats = [Q, K, Q, B, Q, O, K, Q];
          for (let y = top + Math.round((mid - top) * 0.25); y < mid - 2; y++) {
            const band = mats[Math.floor((y - top) / 4) % mats.length];
            for (let x = mx - hw; x <= mx + hw; x++) if (M[id(x, y)] === E && insideHG(x, y, mx, hw, top, mid)) put(x, y, Math.random() < 0.06 ? G : band);
          }
        }
        cfg.hg = { mx, hw, top, bot, mid };
      }
      // profil d'un bulbe : étroit au goulot, rond au milieu, refermé vers le chapeau
      function hgHalf(y, mid, top, hw) {
        const t = Math.min(1, Math.abs(y - mid) / (mid - top)), n = Math.floor(cfg.neck / 2);
        const bulb = Math.sin(Math.min(1, t / 0.62) * Math.PI / 2);
        const cap = t > 0.85 ? Math.sqrt(1 - Math.pow((t - 0.85) / 0.15, 2) * 0.55) : 1;
        return Math.max(n, Math.round(n + (hw - n) * Math.pow(bulb, 1.6) * cap));
      }
      function insideHG(x, y, mx, hw, top, mid) { return Math.abs(x - mx) <= hgHalf(y, mid, top, hw); }
      function buildFrame() {
        const v = view(), x0 = cx(v.x0) + 4, x1 = cx(v.x1 - 1) - 4, y0 = 3, y1 = GH - 4;
        for (let x = x0; x <= x1; x++) { put(x, y0, V); put(x, y1, V); }
        for (let y = y0; y <= y1; y++) { put(x0, y, V); put(x1, y, V); }
        for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) put(x, y, WA);
        // strates teintes en haut, épaisseurs ondulées
        // strates teintes empilées sans interstice sur la cloison, épaisseurs ondulées
        const dyes = [1, 2, 3, 2, 4, 1, 5, 2, 6, 1, 3, 7];
        const yTop = y0 + 1 + Math.round((y1 - y0) * 0.1), yEnd = y0 + Math.round((y1 - y0) * 0.48);
        const layers = []; for (let k = 0; k < 40; k++) layers.push({ th: 2 + rint(4), dye: dyes[k % dyes.length], ph: rnd(TAU), f: rnd(0.08, 0.03) });
        for (let x = x0 + 1; x < x1; x++) {
          let y = yEnd - 1;
          for (const l of layers) {
            const t = Math.max(1, l.th + Math.round(Math.sin(x * l.f + l.ph) * 1.6));
            for (let k = 0; k < t && y >= yTop; k++, y--) put(x, y, l.dye === 1 ? B : l.dye === 2 ? K : Q, l.dye);
            if (y < yTop) break;
          }
        }
        // bulles d'air au-dessus du sable
        for (let x = x1 - 1 - Math.round((x1 - x0) * 0.08); x < x1; x++) for (let y = y0 + 1; y < y0 + 1 + Math.round((y1 - y0) * 0.04); y++) put(x, y, A);
        // entretoises : de petites parois avec des passages, d'où tombent les filets de sable
        const yy = y0 + Math.round((y1 - y0) * 0.48);
        const gap = Math.max(26, Math.round((x1 - x0) / 7));
        for (let x = x0 + 1; x < x1; x++) if ((x - x0 + Math.round(gap / 2)) % gap > 1) { put(x, yy, V); put(x, yy + 1, V); }
        cfg.fr = { x0, x1, y0, y1 };
      }
      function buildBeach() {
        const v = view(), gx0 = cx(v.x0), gw = cx(v.x1 - 1) - gx0;
        const sea = Math.round(GH * 0.72);
        for (let x = 0; x < GW; x++) {
          const f = (x - gx0) / gw;
          const h = Math.round(GH * (0.6 + Math.max(0, f - 0.55) * 0.5));
          for (let y = h; y < GH; y++) put(x, y, Q, 0, y > sea ? 255 : 0);
        }
        for (let x = 0; x < GW; x++) for (let y = sea; y < GH; y++) if (M[id(x, y)] === E) put(x, y, WA);
        cfg.sea = sea; cfg.seaX = gx0 + Math.round(gw * 0.7);
        buildCastle();
      }
      function buildCastle() {
        const v = view(), gx0 = cx(v.x0), gw = cx(v.x1 - 1) - gx0, cxm = gx0 + Math.round(gw * 0.36), ground = surf(cxm);
        const S = Math.max(1, Math.round(GH / 120));
        const block = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (y >= 0 && M[id(x, y)] !== WA) put(x, y, Q, 0, 255); };
        const wall = 22 * S, hW = 18 * S;
        block(cxm - wall, cxm + wall, ground - hW, ground);
        for (const tx of [-wall, wall]) {
          block(cxm + tx - 6 * S, cxm + tx + 6 * S, ground - hW - 14 * S, ground);
          for (let k = -6; k <= 6; k += 4) block(cxm + tx + k * S, cxm + tx + (k + 1) * S, ground - hW - 17 * S, ground - hW - 14 * S);
        }
        block(cxm - 5 * S, cxm + 5 * S, ground - hW - 26 * S, ground - hW);
        block(cxm - 2 * S, cxm + 2 * S, ground - hW - 30 * S, ground - hW - 26 * S);
        for (let k = -wall + 8; k < wall - 6; k += 6) block(cxm + k, cxm + k + 2 * S, ground - hW - 3 * S, ground - hW);
        // porte
        for (let x = cxm - 3 * S; x <= cxm + 3 * S; x++) for (let y = ground - 8 * S; y < ground; y++) put(x, y, E);
        castleT = 0;
      }

      /* ───────── décor ───────── */
      let bg = null;
      function paintBg() {
        const L = layer(Math.round(W), Math.round(H)), g = L.g;
        if (cfg.scene === 'fourmilions') {
          const s = g.createLinearGradient(0, 0, 0, H * 0.7);
          s.addColorStop(0, '#2a1d4a'); s.addColorStop(0.45, '#c2556a'); s.addColorStop(0.8, '#f4a35a'); s.addColorStop(1, '#ffd38a');
          g.fillStyle = s; g.fillRect(0, 0, W, H);
          const v = view(), sx = v.x0 + v.w * 0.7, sy = H * 0.5;
          const sun = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.25);
          sun.addColorStop(0, 'rgba(255,240,200,1)'); sun.addColorStop(0.12, 'rgba(255,220,150,.9)'); sun.addColorStop(1, 'rgba(255,180,90,0)');
          g.fillStyle = sun; g.fillRect(0, 0, W, H);
          for (const [yy, col, amp] of [[0.5, 'rgba(150,70,80,.55)', 0.05], [0.55, 'rgba(110,50,60,.6)', 0.035]]) {
            g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
            for (let x = 0; x <= W; x += 8) g.lineTo(x, H * yy - Math.abs(Math.sin(x * 0.004 + yy * 9)) * H * amp - Math.sin(x * 0.013) * H * 0.008);
            g.lineTo(W, H); g.fill();
          }
        } else if (cfg.scene === 'sablier') {
          const s = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7);
          s.addColorStop(0, '#2b2236'); s.addColorStop(1, '#0c0a10');
          g.fillStyle = s; g.fillRect(0, 0, W, H);
        } else if (cfg.scene === 'tableau') {
          const s = g.createLinearGradient(0, 0, 0, H);
          s.addColorStop(0, '#e8eef2'); s.addColorStop(1, '#cdd8e0');
          g.fillStyle = s; g.fillRect(0, 0, W, H);
        } else {
          const s = g.createLinearGradient(0, 0, 0, H * 0.7);
          s.addColorStop(0, '#5aa8e6'); s.addColorStop(1, '#cfe9f7');
          g.fillStyle = s; g.fillRect(0, 0, W, H);
          g.fillStyle = 'rgba(255,255,255,.7)';
          for (let k = 0; k < 6; k++) { const x = rnd(W), y = rnd(H * 0.3, H * 0.05); for (let j = 0; j < 5; j++) { g.beginPath(); g.ellipse(x + j * 22, y + Math.sin(j) * 6, 40, 14, 0, 0, TAU); g.fill(); } }
        }
        bg = L.c;
      }

      /* ───────── sons : sable qui coule, dune qui chante ───────── */
      let hiss = null, boom = null;
      if (snd()) {
        const c = au.ensure();
        if (c) {
          const s = c.createBufferSource(); s.buffer = au.noiseBuf(); s.loop = true;
          const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3500; f.Q.value = 0.6;
          const gg = c.createGain(); gg.gain.value = 0.0001;
          s.connect(f); f.connect(gg); gg.connect(au.master); s.start();
          hiss = { s, gg };
          boom = au.drone(88, 'sawtooth', 0);
        }
      }

      /* ───────── le vivant : fourmilions et fourmis ───────── */
      let VT = 0, antT = 2;
      function life(dt) {
        if (cfg.scene !== 'fourmilions') return;
        // fourmilions : creusent tant que l'entonnoir n'est pas assez profond, jettent du sable sur les proies
        for (let k = antl.length - 1; k >= 0; k--) {
          const a = antl[k];
          a.t += dt; a.toss -= dt;
          const bottom = surf(a.x), rim = Math.min(surf(a.x - a.R - 1), surf(a.x + a.R + 1));
          a.depth = bottom - rim;
          const prey = ants.find((n) => n.pit === a && n.st === 'glisse');
          if (a.toss <= 0 && (a.depth < a.R * 0.55 || prey)) {
            a.toss = prey ? 0.12 : 0.05;
            for (let q = 0; q < (prey ? 1 : 2); q++) {
            const xs = a.x + rint(3) - 1, ys = surf(xs);
            if (ys < GH) {
              const dir = prey ? Math.sign(prey.x - a.x) || 1 : Math.random() < 0.5 ? -1 : 1;
              if (launch(xs, ys, dir * rnd(1.4, 0.8) * Math.sqrt(a.R / 13), -rnd(1.9, 1.3) * Math.sqrt(a.R / 13)) && snd() && Math.random() < 0.3) au.noise(0.04, 0.02, 4000, 2, 'bandpass');
              if (prey) prey.kick = 0.3;
            }
            }
          }
          if (a.t > a.life && !prey) {
            // métamorphose : un adulte ailé s'envole, une nouvelle larve s'installera ailleurs
            adults.push({ x: a.x * cs, y: surf(a.x) * cs, vx: rnd(40, -40), vy: -rnd(50, 30), t: 0 });
            antl.splice(k, 1);
            setTimeout(() => { if (cfg.scene === 'fourmilions' && antl.length < 3) { const v = view(); newAntlion(cx(v.x0 + v.w * rnd(0.9, 0.3)), false); } }, 15000);
          }
        }
        // fourmis : vont chercher des graines à droite et les rapportent au nid à gauche
        antT -= dt;
        const v = view();
        if (antT <= 0 && ants.length < 9) { antT = rnd(4, 1.5); ants.push({ x: cx(v.x1 - 4), dir: -1, seed: true, st: 'marche', sp: rnd(9, 6), t: 0, pit: null, kick: 0, side: 0, ph: rnd(TAU) }); }
        for (let k = ants.length - 1; k >= 0; k--) {
          const n = ants[k];
          n.t += dt; n.ph += dt * n.sp * 1.8; n.kick = Math.max(0, n.kick - dt);
          if (n.st === 'prise') { if (n.t > 3) { if (n.pit) n.pit.fed++; ants.splice(k, 1); } continue; }
          const near = antl.find((a) => Math.abs(a.x - n.x) < a.R + 2);
          if (n.st === 'marche') {
            if (near && Math.abs(near.x - n.x) < near.R + 1 && !n.pit) {
              // la plupart contournent l'entonnoir (en trois dimensions, il y a de la place) ; certaines y mettent la patte
              if (n.decided !== near) { n.decided = near; n.around = Math.random() < 0.72; n.rimY = Math.min(surf(near.x - near.R - 2), surf(near.x + near.R + 2)); }
              if (!n.around && Math.abs(near.x - n.x) < near.R * 0.8) { n.st = 'glisse'; n.pit = near; n.t = 0; }
            }
            n.side = near && n.around ? Math.min(1, n.side + dt * 2) : Math.max(0, n.side - dt * 2);
            n.x += n.dir * n.sp * dt;
            if (n.dir < 0 && n.x <= nestX) { n.dir = 1; n.seed = false; n.x = nestX + 1; n.t = 0; n.st = 'nid'; }
            if (n.dir > 0 && n.x > cx(v.x1 - 2)) { ants.splice(k, 1); continue; }
          } else if (n.st === 'nid') { if (n.t > rnd(6, 2)) n.st = 'marche'; }
          else if (n.st === 'glisse') {
            const a = n.pit;
            if (!antl.includes(a)) { n.st = 'marche'; n.pit = null; continue; }
            const xi = Math.round(n.x), slope = surf(xi + 1) - surf(xi - 1);
            const down = Math.sign(a.x - n.x) || 1;
            // elle tente de remonter, le sable se dérobe ; les jets du fourmilion la font glisser
            let mv = -down * n.sp * 0.45 * dt;
            if (Math.abs(slope) >= 1 || n.kick > 0) mv += down * (n.kick > 0 ? 9 : 4.5) * dt;
            n.x += mv;
            if (Math.random() < dt * 6) { const ys = surf(xi); if (ys < GH) { const j = id(xi, ys); const jd = id(xi + down, ys + 1); if (isGrain(M[j]) && xi + down >= 0 && xi + down < GW && M[jd] === E) swap(j, jd); } }
            if (Math.abs(n.x - a.x) < 1.6) { n.st = 'prise'; n.t = 0; if (snd()) au.note(1200, 0.06, 'square', 0.02); }
            if (Math.abs(n.x - a.x) > a.R + 1) { n.st = 'marche'; n.pit = null; n.around = true; }
          }
        }
        for (let k = adults.length - 1; k >= 0; k--) { const a = adults[k]; a.t += dt; a.x += a.vx * dt; a.y += a.vy * dt; a.vy -= 4 * dt; if (a.t > 8) adults.splice(k, 1); }
      }

      /* ───────── autonomie des scènes ───────── */
      let botCount = 0, flowRate = 0, hgT = 0;
      function scenes(dt) {
        if (cfg.scene === 'sablier' && cfg.hg && !flip) {
          hgT += dt;
          flowRate += (flowCount / Math.max(dt, 1e-3) - flowRate) * Math.min(1, dt * 1.5); flowCount = 0;
          // voûtes : un goulot étroit et des gros grains peuvent se coincer
          const { mx, mid } = cfg.hg;
          if (cfg.neck <= 3 && !jam) {
            let big = 0; for (let x = neckX0 - 1; x <= neckX1 + 1; x++) if (M[id(x, mid - 1)] === G || M[id(x, mid - 2)] === G) big++;
            if (big && Math.random() < dt * 0.8) {
              // une voûte de grains se coince au goulot : plus rien ne passe
              jam = 1; jamCells = [];
              for (let x = neckX0; x <= neckX1; x++) { const i = id(x, mid); if (M[i] === E || isGrain(M[i])) { M[i] = V; jamCells.push(i); } }
            }
          }
          let top = 0; for (let y = cfg.hg.top; y < mid; y++) for (let x = mx - cfg.hg.hw; x <= mx + cfg.hg.hw; x++) if (isGrain(M[id(x, y)])) top++;
          if (top < 3 && cfg.auto) { settle += dt; if (settle > 2.5) startFlip(); } else settle = 0;
        }
        if (cfg.scene === 'tableau' && !flip && cfg.auto) {
          settle = moved < 6 ? settle + dt : 0;
          if (settle > 6) startFlip();
        }
        if (cfg.scene === 'chateau') {
          castleT += dt;
          // la marée : le niveau de la mer monte et descend (période d'une minute ici)
          const v = view(), lvl = Math.round(cfg.sea + Math.sin(VT * TAU / 60) * GH * 0.06);
          for (let x = cfg.seaX; x < GW; x++) {
            const add = Math.random() < 0.3;
            for (let y = lvl; y < GH; y++) { const i = id(x, y); if (M[i] === E && add && (y === GH - 1 || M[i + GW] !== E)) { M[i] = WA; break; } }
            for (let y = 0; y < lvl - 1; y++) { const i = id(x, y); if (M[i] === WA && Math.random() < 0.3) M[i] = E; }
          }
          // vagues : un ressac qui pousse l'eau vers le château
          if (Math.random() < dt * 0.4) for (let y = lvl - 2; y < lvl + 3; y++) for (let x = cfg.seaX - 6; x < cfg.seaX; x++) if (y >= 0 && M[id(x, y)] === E && Math.random() < 0.5) put(x, y, WA);
          if (cfg.auto && castleT > 170) { const ground = surf(cx(v.x0 + v.w * 0.36)); for (let y = 0; y < ground; y++) for (let x = 0; x < cfg.seaX - 10; x++) if (isGrain(M[id(x, y)]) && y < ground - 2) M[id(x, y)] = E; buildCastle(); }
        }
      }
      function startFlip() { unjam(); flip = { t: 0 }; settle = 0; if (snd()) au.noise(0.5, 0.05, 900, 0.7, 'bandpass'); }
      function doFlip() {
        // le sablier ou le tableau se retourne : toute la grille pivote d'un demi-tour
        for (const arr of [M, T, D, Wt]) arr.reverse();
        Vy.fill(0);
        const v = view();
        if (cfg.scene === 'sablier' && cfg.hg) {
          const a = neckX0, b = neckX1, t0 = cfg.hg.top;
          cfg.hg.mx = GW - 1 - cfg.hg.mx; neckX0 = GW - 1 - b; neckX1 = GW - 1 - a;
          cfg.hg.mid = GH - 1 - cfg.hg.mid; neckY = cfg.hg.mid; cfg.hg.top = GH - 1 - cfg.hg.bot; cfg.hg.bot = GH - 1 - t0; hgT = 0;
        }
        if (cfg.scene === 'tableau' && cfg.fr) { const f = cfg.fr; cfg.fr = { x0: GW - 1 - f.x1, x1: GW - 1 - f.x0, y0: GH - 1 - f.y1, y1: GH - 1 - f.y0 }; }
      }

      /* ───────── rendu ───────── */
      const surfY = new Int16Array(4096);
      function render() {
        const bare = env.decor === false, light = env.theme === 'light';
        const d = img.data, W2 = GW * 2;
        for (let x = 0; x < GW; x++) { let y = 0; for (; y < GH; y++) { const m = M[x + y * GW]; if (m !== E && m !== A && m !== WA) break; } surfY[x] = y; }
        const glint = (VT * 7) | 0;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const i = y * GW + x, m = M[i], t = T[i];
          let r = 0, g = 0, b = 0, a = 0;
          if (isGrain(m)) {
            const dy = D[i], base = dy ? DYE[dy] : MAT[m].col;
            const j = (t / 255 - 0.5) * (m === B ? 34 : 46);
            const depth = y - surfY[x];
            let sh = 1 - Math.min(depth, 14) / 14 * 0.32;
            if (y > 0 && (M[i - GW] === E || M[i - GW] === A)) sh += 0.16;
            if (x > 0 && M[i - 1] === E) sh += 0.06;
            const wet = Wt[i] / 255;
            sh *= 1 - wet * 0.38;
            r = (base[0] + j) * sh; g = (base[1] + j) * sh; b = (base[2] + j * 0.8) * sh;
            if (wet > 0.3) { r *= 0.92; b *= 1.06; }
            if (m === Q && depth < 2 && ((t * 131 + glint * 17 + x * 7) % 997) < 3) { r = g = b = 255; }
            a = 255;
          } else if (m === WA) {
            const top = y > 0 && M[i - GW] === E;
            if (cfg.scene === 'tableau') { r = 205; g = 228; b = 240; a = 55; } else { r = 40; g = 120 + (t & 31); b = 220; a = top ? 230 : 150; }
            if (bare && !light) { r = 30; g = 140; b = 255; a = 120; }
          } else if (m === A) { r = 230; g = 245; b = 255; a = 60; }
          else if (m === P) { r = 92 + (t & 15); g = 88 + (t & 15); b = 96 + (t & 15); a = 255; }
          else if (m === V) { r = 210; g = 230; b = 245; a = bare ? 90 : 120; }
          const o = (y * 2 * W2 + x * 2) * 4;
          for (let k = 0; k < 4; k++) {
            const oo = o + ((k >> 1) * W2 + (k & 1)) * 4;
            const n = a === 255 && isGrain(m) ? (((t * (k + 3) * 37) & 31) - 15) * 0.9 : 0;
            d[oo] = r + n; d[oo + 1] = g + n; d[oo + 2] = b + n; d[oo + 3] = a;
          }
        }
        imgL.g.putImageData(img, 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        if (bare) { ctx.fillStyle = light ? '#f1ebdd' : '#050407'; ctx.fillRect(0, 0, W, H); }
        else ctx.drawImage(bg, 0, 0, W, H);
        if (flip) {
          const k = Math.min(1, flip.t / 1.2), e = k * k * (3 - 2 * k);
          ctx.translate(W / 2, H / 2); ctx.rotate(e * Math.PI); ctx.translate(-W / 2, -H / 2);
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imgL.c, 0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        // grains en vol
        for (const f of fly) { const c = f.d ? DYE[f.d] : MAT[f.m].col; ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(f.x * cs - cs * 0.5, f.y * cs - cs * 0.5, cs, cs); }
        if (!bare) drawLife();
        if (!bare && cfg.scene === 'sablier' && cfg.hg && !flip) drawHGFrame();
        if (!bare && cfg.scene === 'tableau' && cfg.fr && !flip) { const f = cfg.fr; ctx.strokeStyle = '#4a3624'; ctx.lineWidth = 10 * kS; ctx.strokeRect(f.x0 * cs - 5 * kS, f.y0 * cs - 5 * kS, (f.x1 - f.x0 + 1) * cs + 10 * kS, (f.y1 - f.y0 + 1) * cs + 10 * kS); }
        ctx.restore();
        drawLabel(bare && light);
      }
      function drawHGFrame() {
        const { mx, hw, top, bot } = cfg.hg, x0 = (mx - hw - 4) * cs, x1 = (mx + hw + 5) * cs;
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(x0 - 8 * kS, top * cs - 12 * kS, x1 - x0 + 16 * kS, 12 * kS);
        ctx.fillRect(x0 - 8 * kS, (bot + 1) * cs, x1 - x0 + 16 * kS, 12 * kS);
        ctx.fillStyle = '#3e2816';
        for (const xx of [x0 - 4 * kS, x1 - 2 * kS]) ctx.fillRect(xx, top * cs, 6 * kS, (bot - top + 1) * cs);
      }
      function drawLife() {
        // fourmilions : mâchoires qui dépassent au fond de l'entonnoir
        for (const a of antl) {
          const x = (a.x + 0.5) * cs, y = surf(a.x) * cs + cs * 0.6;
          ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1.6 * kS; ctx.lineCap = 'round';
          const op = 0.35 + 0.25 * Math.sin(VT * 3 + a.seed);
          for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 2 * kS, y); ctx.quadraticCurveTo(x + s * (6 + op * 4) * kS, y - 6 * kS, x + s * 2.5 * kS, y - 10 * kS); ctx.stroke(); }
          ctx.fillStyle = '#5a3b1e'; ctx.beginPath(); ctx.ellipse(x, y + 1.5 * kS, 3.2 * kS, 2 * kS, 0, 0, TAU); ctx.fill();
        }
        // nid
        if (cfg.scene === 'fourmilions') {
          const x = (nestX + 0.5) * cs, y = surf(nestX) * cs;
          ctx.fillStyle = 'rgba(40,24,14,.85)'; ctx.beginPath(); ctx.ellipse(x, y + 2 * kS, 5 * kS, 2.6 * kS, 0, 0, TAU); ctx.fill();
        }
        for (const n of ants) {
          if (n.st === 'nid') continue;
          const sy = surf(Math.round(n.x)), x = n.x * cs, y = (n.side > 0 && n.rimY != null ? sy + (Math.min(sy, n.rimY) - sy) * n.side : sy) * cs - 2.4 * kS;
          const a = n.st === 'prise' ? Math.max(0, 1 - n.t / 3) : 1 - n.side * 0.55;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y + (n.st === 'prise' ? n.t * 2 * kS : 0)); ctx.scale(n.dir * kS, kS);
          ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 0.9;
          for (let l = -1; l <= 1; l++) { const sw = Math.sin(n.ph + l * 2.1) * 1.6; ctx.beginPath(); ctx.moveTo(l * 1.8, 0.5); ctx.lineTo(l * 1.8 + sw, 2.8); ctx.stroke(); }
          ctx.fillStyle = '#3a2418';
          ctx.beginPath(); ctx.ellipse(-3.4, -0.3, 2.4, 1.6, 0.2, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(0, -0.4, 1.4, 1.0, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#5a2414'; ctx.beginPath(); ctx.ellipse(2.6, -0.8, 1.6, 1.4, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(3.4, -1.6); ctx.lineTo(5.4, -3.4); ctx.stroke();
          if (n.seed) { ctx.fillStyle = '#d9b46a'; ctx.beginPath(); ctx.ellipse(4.6, -0.8, 1.6, 1.1, 0.4, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
        for (const a of adults) {
          ctx.save(); ctx.translate(a.x, a.y); ctx.globalAlpha = Math.max(0, 1 - a.t / 8);
          const f = Math.sin(VT * 40) * 0.5;
          ctx.fillStyle = 'rgba(220,235,255,.5)';
          for (const s of [-1, 1]) for (const o of [0, 3]) { ctx.beginPath(); ctx.ellipse(o * kS, s * 4 * kS, 7 * kS, 1.6 * kS, s * (0.3 + f), 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-6 * kS, -0.8 * kS, 14 * kS, 1.6 * kS);
          ctx.restore();
        }
      }

      /* ───────── identification ───────── */
      let label = null;
      function pick(px, py) {
        for (const n of ants) if (n.st !== 'nid' && Math.hypot(n.x * cs - px, (surf(Math.round(n.x)) * cs) - py) < 12 * kS) return { kind: 'fourmi', o: n };
        for (const a of antl) if (Math.hypot((a.x + 0.5) * cs - px, surf(a.x) * cs - py) < 14 * kS) return { kind: 'fourmilion', o: a };
        return null;
      }
      function describe(l) {
        if (l.kind === 'fourmi') { const n = l.o; return ['Messor barbarus', 'fourmi moissonneuse · ' + ({ marche: n.seed ? 'rapporte une graine au nid' : 'repart chercher des graines', glisse: 'glisse dans un entonnoir !', prise: 'saisie par le fourmilion', nid: 'au nid' }[n.st] || ''), '#c08a6a']; }
        if (l.kind === 'fourmilion') { const a = l.o; return ['Myrmeleon formicarius', 'fourmilion (larve) · ' + (a.depth < a.R * 0.5 ? 'creuse en jetant le sable' : 'attend au fond de son entonnoir') + ' · ' + a.fed + ' proie' + (a.fed > 1 ? 's' : ''), '#e0a060']; }
        const x = cx(l.x), y = cy(l.y), m = M[id(x, y)];
        if (isGrain(m)) {
          const mt = MAT[m];
          const s1 = surf(x - 3), s2 = surf(x + 3), ang = Math.round(Math.atan2(Math.abs(s2 - s1), 6) * 180 / Math.PI);
          const wet = Wt[id(x, y)] > 70;
          let role = mt.fr + ' · ' + (wet ? 'mouillé, cohésif' : 'sec');
          if (Math.abs(y - surf(x)) < 4) role += ' · pente ' + ang + '°' + (ang >= mt.angle - 3 ? ', au bord de l’avalanche' : '');
          return [D[id(x, y)] ? 'Sable teint' : mt.nom, role, mt.css];
        }
        if (m === WA) return ['Eau', 'mouille le sable qu’elle touche', '#6fb8ff'];
        if (m === V) return ['Verre', 'paroi', '#c8d8e8'];
        if (m === P) return ['Pierre', 'paroi', '#a0a0a8'];
        if (m === A) return ['Bulle d’air', 'remonte à travers l’eau', '#e0f0ff'];
        return ['Air', cfg.scene === 'sablier' ? 'débit ≈ ' + Math.round(flowRate) + ' grains par seconde' : 'vide', '#d0d0e0'];
      }
      function drawLabel(paper) {
        if (!label) return;
        const al = Math.min(1, label.t * 4, (6 - label.t) * 2);
        if (al <= 0.01) { label = null; return; }
        const o = label.o;
        if (o && label.kind === 'fourmi' && !ants.includes(o)) { label = null; return; }
        if (o && label.kind === 'fourmilion' && !antl.includes(o)) { label = null; return; }
        const x = o ? (label.kind === 'fourmi' ? o.x * cs : (o.x + 0.5) * cs) : label.x;
        const y = o ? surf(Math.round(o.x)) * cs : label.y;
        let [name, role, col] = describe(label);
        if (paper) col = '#6a4a2a';
        const side = x > W * 0.62 ? -1 : 1, lx = x + side * 46, ly = y - 40;
        ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + side * 9, y - 8); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
        ctx.shadowColor = paper ? 'rgba(250,246,238,.9)' : 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
        ctx.textAlign = side > 0 ? 'left' : 'right';
        ctx.fillStyle = paper ? 'rgba(30,24,40,.94)' : 'rgba(255,252,245,.97)';
        ctx.font = 'italic 500 14px "Space Grotesk", sans-serif'; ctx.fillText(name, lx, ly);
        ctx.fillStyle = col; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.fillText(role.toUpperCase(), lx, ly + 15);
        ctx.restore();
      }

      /* ───────── boucle ───────── */
      let neckT = 0, acc = 0, pending = false, pour = null, shakeAt = null, globalShake = 0;
      function frame(t, dt) {
        if (dt > 0) {
          VT += dt;
          if (flip) { flip.t += dt; if (flip.t >= 1.2) { doFlip(); flip = null; } }
          else {
            acc += dt * 60;
            let n = 0;
            while (acc >= 1 && n < 3) { acc -= 1; n++; if (pour) doPour(); if (shakeAt) shake(shakeAt.x, shakeAt.y, 50 * kS); if (globalShake > 0) shake(W / 2, H / 2, Math.max(W, H)); tick(); }
            if (acc > 3) acc = 0;
            globalShake = Math.max(0, globalShake - dt);
            life(dt); scenes(dt);
          }
          if (label) label.t += dt;
          if (hiss) {
            const c = au.ctx.currentTime;
            hiss.gg.gain.setTargetAtTime(clamp(moved / 1500, 0, 1) * 0.05, c, 0.15);
            // une grosse avalanche fait gronder la dune
            if (boom) boom.gain(slid > 120 && cfg.scene !== 'tableau' ? clamp((slid - 120) / 600, 0, 1) * 0.05 : 0);
          }
        }
        if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
      }
      function doPour() {
        const p = pour, x0 = cx(p.x), y0 = cy(p.y), r = Math.max(1, Math.round(6 * kS * 3.6 / cs));
        for (let k = 0; k < r * 2; k++) {
          const x = x0 + rint(r * 2 + 1) - r, y = y0 + rint(3) - 1;
          if (x < 0 || x >= GW || y < 0 || y >= GH) continue;
          const i = id(x, y), m = M[i];
          if (p.tool === 'gomme') { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x0 + dx, yy = y0 + dy; if (xx >= 0 && yy >= 0 && xx < GW && yy < GH && dx * dx + dy * dy <= r * r) { const j = id(xx, yy); if (cfg.scene === 'tableau' && M[j] !== V) M[j] = WA; else if (M[j] !== V) M[j] = E; } } break; }
          if (p.tool === 'pierre') { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(x0 + dx, y0 + dy, P); break; }
          if (m !== E && m !== WA && m !== A) continue;
          if (p.tool === 'eau') { if (m === E) put(x, y, WA); }
          else if (Math.random() < 0.7) put(x, y, cfg.put, 0, m === WA ? 255 : 0);
        }
      }
      function setQuality(q) { if (q === cfg.q) return; cfg.q = q; alloc(); setScene(cfg.scene); }

      if (window.FASC_DEBUG) window.FASC_DEBUG.sable = { cfg, setScene, run(n, h) { for (let i = 0; i < n; i++) frame(0, h); render(); }, get grid() { return { GW, GH, M, surf }; }, get antl() { return antl; }, get ants() { return ants; }, get fly() { return fly; } };

      setScene(startScene || 'fourmilions');
      for (let i = 0; i < 60; i++) frame(0, 1 / 60);

      return {
        livePaused: true,
        frame,
        down(p) {
          const tool = env.tool;
          if (tool === 'observer') { const l = env.decor === false ? null : pick(p.x, p.y); label = l ? Object.assign(l, { t: 0 }) : { kind: 'grain', x: p.x, y: p.y, t: 0 }; return; }
          if (tool === 'verser' || tool === 'eau' || tool === 'pierre' || tool === 'gomme') pour = { x: p.x, y: p.y, tool };
          if (tool === 'secouer') { shakeAt = { x: p.x, y: p.y }; if (snd()) au.noise(0.3, 0.05, 300, 1, 'lowpass'); }
          if (tool === 'souffle') this._last = { x: p.x, y: p.y };
        },
        move(p) {
          if (!p.down) return;
          if (pour) { pour.x = p.x; pour.y = p.y; }
          if (shakeAt) { shakeAt.x = p.x; shakeAt.y = p.y; }
          if (env.tool === 'souffle') {
            const dir = Math.sign(p.dx) || 1, x0 = cx(p.x), r = Math.round(30 * kS / cs * 3.6 / 3.6);
            for (let k = 0; k < 10; k++) {
              const x = x0 + rint(r * 2 + 1) - r; if (x < 0 || x >= GW) continue;
              const y = surf(x); if (y >= GH || Math.abs(y * cs - p.y) > 90 * kS) continue;
              launch(x, y, dir * rnd(1.4, 0.5) * clamp(Math.abs(p.dx) / 6, 0.4, 2), -rnd(0.9, 0.3));
            }
            if (snd() && Math.random() < 0.15) au.noise(0.3, 0.04, 2500, 0.8, 'highpass');
          }
        },
        up() { pour = null; shakeAt = null; },
        clear() { clearGrid(); antl = []; ants = []; adults = []; cfg.auto = false; label = null; if (cfg.scene === 'sablier') buildHourglass(false); if (cfg.scene === 'tableau') { const f = cfg.fr; buildFrame(); for (let y = f.y0 + 1; y < f.y1; y++) for (let x = f.x0 + 1; x < f.x1; x++) if (isGrain(M[id(x, y)]) || M[id(x, y)] === A) M[id(x, y)] = WA; } },
        dispose() {
          if (boom) boom.stop();
          if (hiss) { try { hiss.gg.gain.setTargetAtTime(0.0001, au.ctx.currentTime, 0.1); hiss.s.stop(au.ctx.currentTime + 0.5); } catch (e) { /* rien */ } }
        },
        ui() {
          const L = [{ type: 'section', label: 'Scènes' }];
          L.push({ type: 'buttons', items: [
            { label: 'Fourmilions', act: () => { cfg.auto = true; setScene('fourmilions'); } },
            { label: 'Sablier', act: () => { cfg.auto = true; setScene('sablier'); } },
            { label: 'Tableau de sable', act: () => { cfg.auto = true; setScene('tableau'); } },
            { label: 'Château de sable', act: () => { cfg.auto = true; setScene('chateau'); } },
          ] });
          if (cfg.scene === 'fourmilions') {
            const fed = antl.reduce((s, a) => s + a.fed, 0);
            L.push({ type: 'note', text: `${antl.length} fourmilion${antl.length > 1 ? 's' : ''} · ${ants.filter((n) => n.st !== 'nid').length} fourmis dehors · ${fed} proie${fed > 1 ? 's' : ''} capturée${fed > 1 ? 's' : ''}` });
            L.push({ type: 'buttons', items: [{ label: 'Nouveau fourmilion', act: () => { const v = view(); if (antl.length < 5) newAntlion(cx(v.x0 + v.w * rnd(0.9, 0.25)), false); } }, { label: 'Lâcher une fourmi', act: () => { const v = view(); ants.push({ x: cx(v.x1 - 4), dir: -1, seed: true, st: 'marche', sp: rnd(9, 6), t: 0, pit: null, kick: 0, side: 0, ph: 0 }); } }] });
          }
          if (cfg.scene === 'sablier') {
            L.push({ type: 'bar', label: 'Débit au goulot', color: '#e6b46a', value: clamp(flowRate / 400, 0, 1), txt: Math.round(flowRate) + ' grains/s' });
            L.push({ type: 'note', text: 'Le débit reste le même quelle que soit la hauteur de sable : les grains s’appuient sur les parois (effet Janssen). ' + (cfg.neck <= 3 ? 'Goulot étroit : des voûtes peuvent bloquer, secouez pour les briser.' : '') });
            L.push({ type: 'slider', label: 'Largeur du goulot (nouveau sablier)', min: 2, max: 12, step: 1, value: cfg.neck, fmt: (x) => x + ' grains', set: (x) => { cfg.neck = x; clearTimeout(neckT); neckT = setTimeout(() => setScene('sablier'), 350); } });
            L.push({ type: 'buttons', items: [{ label: 'Retourner', act: startFlip }, { label: 'Nouveau sablier', act: () => setScene('sablier') }] });
          }
          if (cfg.scene === 'tableau') L.push({ type: 'buttons', items: [{ label: 'Retourner le tableau', act: startFlip }, { label: 'Nouveau tableau', act: () => setScene('tableau') }] });
          if (cfg.scene === 'chateau') {
            L.push({ type: 'note', text: 'La marée monte et descend ; le soleil sèche le château, qui s’effrite. Un nouveau château est bâti de temps en temps.' });
            L.push({ type: 'buttons', items: [{ label: 'Rebâtir', act: () => { const v = view(), ground = surf(cx(v.x0 + v.w * 0.36)); for (let y = 0; y < ground - 2; y++) for (let x = 0; x < cfg.seaX - 10; x++) if (isGrain(M[id(x, y)])) M[id(x, y)] = E; buildCastle(); } }] });
          }
          if (cfg.scene === 'sablier' || cfg.scene === 'tableau' || cfg.scene === 'chateau') L.push({ type: 'toggle', label: cfg.scene === 'chateau' ? 'Rebâtir de temps en temps' : 'Retourner tout seul', value: cfg.auto, set: (x) => { cfg.auto = x; } });
          L.push({ type: 'buttons', items: [{ label: 'Tout secouer', act: () => { globalShake = 2; if (snd()) au.noise(1.5, 0.06, 250, 1, 'lowpass'); } }] });
          L.push({ type: 'section', label: 'Verser' });
          L.push({ type: 'choice', label: 'Sable versé par l’outil VERSER', value: cfg.put, set: (x) => { cfg.put = x; }, options: [{ id: Q, label: 'Quartz' }, { id: B, label: 'Basalte' }, { id: K, label: 'Rose' }, { id: O, label: 'Olivine' }, { id: G, label: 'Gravier' }] });
          L.push({ type: 'note', text: MAT[cfg.put].nom + ' : ' + MAT[cfg.put].fr + ', angle de repos ≈ ' + MAT[cfg.put].angle + '°.' });
          L.push({ type: 'section', label: 'Climat' });
          L.push({ type: 'slider', label: 'Soleil (séchage)', min: 0, max: 1, step: 0.01, value: cfg.sun, fmt: (x) => (x < 0.05 ? 'ciel couvert' : x > 0.85 ? 'plein soleil' : Math.round(x * 100) + ' %'), set: (x) => { cfg.sun = x; } });
          L.push({ type: 'section', label: 'Affichage' });
          L.push({ type: 'choice', label: 'Finesse des grains', value: cfg.q, set: setQuality, options: [{ id: 'legere', label: 'Gros' }, { id: 'normale', label: 'Moyens' }, { id: 'haute', label: 'Fins' }] });
          L.push({ type: 'note', text: `${GW}×${GH} cases · ${moved} grains en mouvement.` });
          return L;
        },
      };
    },
  });
})();
