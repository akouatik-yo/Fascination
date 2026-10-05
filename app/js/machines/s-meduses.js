/* Fascination — Abysses · l'écosystème des méduses */
(function boot() {
  if (!window.FK || !window.FK_MED) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, layer, scale } = window.FK;
  const M = window.FK_MED;

  window.FASC.push({
    id: 'meduses', name: 'Les Méduses', cat: 'Vivant', glyph: '🜄',
    blurb: 'Abysses bioluminescentes',
    hint: 'Touchez une méduse pour la surprendre · glissez pour créer un courant · LUMIÈRE les attire · ÉCLOSION fait naître une éphyrule.',
    tools: [{ id: 'courant', label: 'courant' }, { id: 'lumiere', label: 'lumière' }, { id: 'eclosion', label: 'éclosion' }],
    make(env) {
      const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
      const timers = [], drones = [];

      /* champ de courant */
      const CS = 24, GW = Math.ceil(W / CS) + 2, GH = Math.ceil(H / CS) + 2, NG = GW * GH;
      const U = new Float32Array(NG), V = new Float32Array(NG), TMP = new Float32Array(NG);
      function addFlow(x, y, vx, vy, r) {
        const x0 = Math.max(0, ((x - r) / CS) | 0), x1 = Math.min(GW - 1, Math.ceil((x + r) / CS));
        const y0 = Math.max(0, ((y - r) / CS) | 0), y1 = Math.min(GH - 1, Math.ceil((y + r) / CS));
        for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
          const d = Math.hypot(gx * CS - x, gy * CS - y);
          if (d >= r) continue;
          const f = (1 - d / r) * (1 - d / r), i = gy * GW + gx;
          U[i] += vx * f; V[i] += vy * f;
        }
      }
      const L = { x: W / 2, y: H / 2, on: false, s: 0 };
      const E = {
        W, H, t: 0, fu: 0, fv: 0, k: 1, lure: L, group: null,
        flow(x, y) {
          let gx = x / CS, gy = y / CS;
          gx = gx < 0 ? 0 : gx > GW - 1.01 ? GW - 1.01 : gx;
          gy = gy < 0 ? 0 : gy > GH - 1.01 ? GH - 1.01 : gy;
          const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, i = iy * GW + ix;
          const u = (U[i] * (1 - fx) + U[i + 1] * fx) * (1 - fy) + (U[i + GW] * (1 - fx) + U[i + GW + 1] * fx) * fy;
          const v = (V[i] * (1 - fx) + V[i + 1] * fx) * (1 - fy) + (V[i + GW] * (1 - fx) + V[i + GW + 1] * fx) * fy;
          const t = E.t;
          E.fu = u * E.k + 7 * Math.sin(y * 0.0035 + t * 0.09) + 4 * Math.sin((x + y) * 0.002 - t * 0.05);
          E.fv = v * E.k + 4 * Math.cos(x * 0.003 + t * 0.07);
        },
        wake(x, y, vx, vy, r) { addFlow(x, y, vx * E.k, vy * E.k, r); },
      };

      /* décor */
      const bg = layer(W, H);
      {
        const g = bg.g, gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#0d2c4a'); gr.addColorStop(0.2, '#081a31'); gr.addColorStop(0.55, '#040c1b'); gr.addColorStop(1, '#010308');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 16; i++) {
          const x = rnd(W), y = rnd(H), r = rnd(W * 0.4, W * 0.1), up = 1 - y / H;
          const f = g.createRadialGradient(x, y, 0, x, y, r);
          f.addColorStop(0, `rgba(${30 + up * 30 | 0},${70 + up * 50 | 0},${120 + up * 40 | 0},${(0.03 + up * 0.07).toFixed(3)})`);
          f.addColorStop(1, 'rgba(20,50,90,0)');
          g.fillStyle = f; g.fillRect(0, 0, W, H);
        }
      }
      const rays = Array.from({ length: 6 }, () => ({ x: rnd(W * 1.1, -W * 0.15), w: rnd(W * 0.11, W * 0.03), ph: rnd(TAU), sp: rnd(0.3, 0.08) }));
      const nSnow = Math.round(clamp((W * H) / 2600, 180, 560));
      const snow = Array.from({ length: nSnow }, () => ({ x: rnd(W), y: rnd(H), z: Math.pow(Math.random(), 1.7) * 0.9 + 0.1, ph: rnd(TAU), r: rnd(1.5, 0.6) }));
      const nPl = Math.round(clamp((W * H) / 1700, 300, 900));
      const pl = Array.from({ length: nPl }, () => ({ x: rnd(W), y: rnd(H), g: 0, ph: rnd(TAU) }));
      const sprBlue = M.sprite([80, 185, 255]), sprWhite = M.sprite([225, 238, 255]), sprLure = M.sprite([150, 235, 255]);

      /* population */
      const kS = clamp(Math.min(W, H) / 640, 0.62, 1.35);
      const bag = [];
      M.SP.forEach((s) => { for (let i = 0; i < s.w; i++) bag.push(s); });
      const pick = () => bag[(Math.random() * bag.length) | 0];
      const near = [], far = [];
      const nNear = Math.round(clamp((W * H) / 120000, 5, 11)), nFar = Math.round(clamp((W * H) / 150000, 4, 8));
      for (let i = 0; i < nNear; i++) near.push(M.create(i < M.SP.length ? M.SP[i] : pick(), rnd(W * 0.92, W * 0.08), rnd(H * 0.9, H * 0.15), rnd(1.15, 0.78), { k: kS }));
      for (let i = 0; i < nFar; i++) far.push(M.create(pick(), rnd(W), rnd(H), rnd(0.6, 0.36), { k: kS }));
      const FD = 3, FL = layer(Math.ceil(W / FD), Math.ceil(H / FD));
      // pré-roulage : tentacules au repos, poses variées
      for (let s = 0; s < 70; s++) {
        E.t = s / 30;
        E.group = near; for (const j of near) M.update(j, 1 / 30, E);
        E.group = far; for (const j of far) M.update(j, 1 / 30, E);
      }
      U.fill(0); V.fill(0);

      /* son */
      if (au && au.live) {
        drones.push(au.drone(55, 'sine', 0.05), au.drone(82.4, 'sine', 0.022), au.drone(164.8, 'triangle', 0.006));
      }
      let lastNote = 0, nextEvent = rnd(40, 22), sparkle = 0;
      const chime = (j) => {
        if (!au || !au.on) return;
        const base = 6 - Math.round((j.R0 * j.S) / 16) + M.SP.indexOf(j.sp) * 2;
        [0, 2, 4, 7, 9].forEach((d, k) => timers.push(setTimeout(() => au.pluck(scale(base + d, 330), 2.4, 0.06), k * 85)));
      };
      const burst = (x, y, r, g) => {
        for (const p of pl) { const d = Math.hypot(p.x - x, p.y - y); if (d < r) p.g = Math.max(p.g, g * (1 - d / r) + 0.2); }
      };
      const touchJ = (j, x, y) => {
        M.touch(j, x, y); chime(j); burst(x, y, 90, 1.1);
        if (navigator.vibrate) navigator.vibrate([6, 30, 6]);
      };

      function drawLabel(j) {
        const a = Math.min(1, j.label, (6 - j.label) * 2.5);
        if (a <= 0.01) return;
        const R = j.R0 * j.S, ax = j.x + Math.sin(j.a) * j.H * 0.4, ay = j.y - Math.cos(j.a) * j.H * 0.4;
        const side = j.x > W * 0.7 ? -1 : 1, lx = ax + side * (R * 1.3 + 30), ly = ay - R * 0.6 - 18;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(190,220,255,${(a * 0.4).toFixed(3)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax + side * R * 0.9, ay - R * 0.2); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
        ctx.textAlign = side > 0 ? 'left' : 'right';
        ctx.fillStyle = `rgba(232,242,255,${(a * 0.92).toFixed(3)})`;
        ctx.font = 'italic 500 14px "Space Grotesk", sans-serif';
        ctx.fillText(j.sp.nom, lx, ly);
        ctx.fillStyle = `rgba(150,195,235,${(a * 0.8).toFixed(3)})`;
        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillText(j.sp.fr.toUpperCase(), lx, ly + 15);
        ctx.textAlign = 'left';
      }

      return {
        frame(t, dt) {
          E.t = t;
          /* courant : dissipation + diffusion */
          const dk = Math.exp(-dt * 1.1);
          for (let i = 0; i < NG; i++) {
            let u = U[i] * dk, v = V[i] * dk;
            const m = u * u + v * v;
            if (m > 360000) { const s = 600 / Math.sqrt(m); u *= s; v *= s; }
            U[i] = u; V[i] = v;
          }
          window.FK.diffuse(U, TMP, GW, GH, 0.14); window.FK.diffuse(V, TMP, GW, GH, 0.14);
          L.s += ((L.on ? 1 : 0) - L.s) * Math.min(1, dt * (L.on ? 3 : 1.5));

          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(bg.c, 0, 0, W, H);
          /* rais de lumière venus de la surface */
          ctx.globalCompositeOperation = 'lighter';
          const Hb = H * 0.82;
          for (const r of rays) {
            const a = 0.03 + 0.025 * Math.sin(t * r.sp + r.ph), x0 = r.x + Math.sin(t * 0.05 + r.ph) * 50, sk = Hb * 0.22;
            const g = ctx.createLinearGradient(0, 0, 0, Hb);
            g.addColorStop(0, `rgba(140,200,255,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(140,200,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(x0 - r.w / 2, 0); ctx.lineTo(x0 + r.w / 2, 0);
            ctx.lineTo(x0 + sk + r.w * 1.7, Hb); ctx.lineTo(x0 + sk - r.w * 1.7, Hb); ctx.closePath(); ctx.fill();
          }

          /* neige marine */
          E.k = 1;
          const bands = [[], [], []];
          for (const s of snow) {
            E.flow(s.x, s.y);
            s.x += (E.fu * s.z + Math.sin(t * 0.4 + s.ph) * 4 * s.z) * dt;
            s.y += (E.fv * s.z + 4 + 13 * s.z) * dt;
            if (s.y > H + 4) { s.y = -4; s.x = rnd(W); } else if (s.y < -6) s.y = H + 4;
            if (s.x < -6) s.x = W + 4; else if (s.x > W + 6) s.x = -4;
            bands[s.z < 0.35 ? 0 : s.z < 0.75 ? 1 : 2].push(s);
          }
          ctx.globalCompositeOperation = 'source-over';
          [[0.16, 0.9], [0.3, 1.4]].forEach(([a, sz], b) => {
            ctx.fillStyle = `rgba(190,215,240,${a})`;
            ctx.beginPath();
            for (const s of bands[b]) ctx.rect(s.x, s.y, sz * s.r, sz * s.r);
            ctx.fill();
          });

          /* méduses lointaines (flou par sous-échantillonnage) */
          E.k = 0.35; E.group = far;
          const fg = FL.g;
          fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'source-over'; fg.clearRect(0, 0, FL.w, FL.h);
          fg.setTransform(1 / FD, 0, 0, 1 / FD, 0, 0);
          for (const j of far) { M.update(j, dt, E); M.draw(fg, j, t, 1); }
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9;
          ctx.drawImage(FL.c, 0, 0, W, H); ctx.globalAlpha = 1;

          /* plancton bioluminescent */
          E.k = 1;
          let excited = 0;
          for (const p of pl) {
            E.flow(p.x, p.y);
            p.x += (E.fu + Math.sin(t * 0.7 + p.ph) * 3) * dt;
            p.y += (E.fv + Math.cos(t * 0.6 + p.ph) * 3) * dt;
            const spd = Math.hypot(E.fu, E.fv), ex = (spd - 40) / 90;
            if (ex > 0) { p.g += ex * dt * 11; excited += ex; }
            if (L.s > 0.02) {
              const dx = L.x - p.x, dy = L.y - p.y, d = Math.hypot(dx, dy) || 1;
              if (d < 320) {
                const f = L.s * (1 - d / 320);
                p.x += (dx / d) * 34 * f * dt + (-dy / d) * 26 * f * dt; p.y += (dy / d) * 34 * f * dt + (dx / d) * 26 * f * dt;
                if (p.g < f * 0.6) p.g = f * 0.6;
              }
            }
            if (Math.random() < dt * 0.004) p.g = Math.max(p.g, 0.7);
            p.g = Math.min(1.5, p.g) * Math.exp(-dt * 1.7);
            if (p.x < 0) p.x += W; else if (p.x > W) p.x -= W;
            if (p.y < 0) p.y += H; else if (p.y > H) p.y -= H;
            if (p.g > 0.025) {
              const sz = 3 + p.g * 13;
              ctx.globalAlpha = p.g > 1 ? 1 : p.g;
              ctx.drawImage(sprBlue, p.x - sz / 2, p.y - sz / 2, sz, sz);
            }
          }
          ctx.globalAlpha = 1;
          sparkle += excited * dt;
          if (sparkle > 6 && au && au.on) { sparkle = 0; au.noise(0.35, 0.012, rnd(6500, 4200), 5, 'bandpass'); }

          /* méduses proches */
          E.group = near;
          near.sort((a, b) => a.z - b.z);
          for (const j of near) {
            M.update(j, dt, E);
            if (j.pulse && au && au.on && t - lastNote > 0.45 && Math.random() < 0.4) {
              lastNote = t;
              au.note(scale(8 - Math.round((j.R0 * j.S) / 12) + M.SP.indexOf(j.sp), 220), 3.2, 'sine', 0.026);
            }
            let I = 1;
            if (L.s > 0.01) { const d = Math.hypot(L.x - j.x, L.y - j.y); I += L.s * 1.5 * Math.exp(-(d * d) / 90000); }
            M.draw(ctx, j, t, I);
          }

          /* particules au premier plan (bokeh) */
          ctx.globalCompositeOperation = 'lighter';
          for (const s of bands[2]) {
            const sz = s.r * (s.z > 0.9 ? 7 : 4);
            ctx.globalAlpha = 0.16 + (s.z - 0.75) * 0.6;
            ctx.drawImage(sprWhite, s.x - sz / 2, s.y - sz / 2, sz, sz);
          }
          ctx.globalAlpha = 1;

          /* leurre lumineux */
          if (L.s > 0.01) {
            const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.7), big = 420 * L.s, mid = 120 * L.s * fl, core = 46 * L.s * fl;
            ctx.globalAlpha = 0.32 * L.s; ctx.drawImage(sprLure, L.x - big / 2, L.y - big / 2, big, big);
            ctx.globalAlpha = 0.5 * L.s; ctx.drawImage(sprLure, L.x - mid / 2, L.y - mid / 2, mid, mid);
            ctx.globalAlpha = 0.95 * L.s; ctx.drawImage(sprLure, L.x - core / 2, L.y - core / 2, core, core);
            ctx.globalAlpha = 1;
          }

          /* évènements spontanés */
          nextEvent -= dt;
          if (nextEvent <= 0) {
            nextEvent = rnd(55, 28);
            const j = near[(Math.random() * near.length) | 0];
            if (j && j.x > 0 && j.x < W && j.y > 0 && j.y < H) { M.touch(j, j.x + rnd(60, -60), j.y + 80); j.label = 0; }
          }
          for (const j of near) if (j.label > 0) drawLabel(j);
          ctx.globalCompositeOperation = 'source-over';
        },
        down(p) {
          let hitJ = null;
          for (let i = near.length - 1; i >= 0; i--) if (M.hit(near[i], p.x, p.y)) { hitJ = near[i]; break; }
          this._drag = false;
          if (hitJ) { touchJ(hitJ, p.x, p.y); return; }
          this._drag = true;
          burst(p.x, p.y, 45, 0.7);
          if (env.tool === 'lumiere') { L.on = true; L.x = p.x; L.y = p.y; if (au && au.on) au.note(660, 1.6, 'sine', 0.03, 990); }
          else if (env.tool === 'eclosion') {
            if (near.length >= 16) near.splice(near.findIndex((j) => j.label <= 0), 1);
            near.push(M.create(pick(), p.x, p.y, rnd(1.12, 0.85), { k: kS, grow: 0.1 }));
            burst(p.x, p.y, 110, 1.2);
            if (au && au.on) au.note(scale(rnd(14, 8) | 0, 220), 2.4, 'sine', 0.05);
          }
        },
        move(p) {
          if (L.on) { L.x = p.x; L.y = p.y; }
          if (!p.down || !this._drag || env.tool === 'lumiere') return;
          const vx = clamp(p.dx * 24, -900, 900), vy = clamp(p.dy * 24, -900, 900);
          addFlow(p.x, p.y, vx, vy, 75);
        },
        up() { L.on = false; this._drag = false; },
        dispose() {
          drones.forEach((d) => d.stop());
          timers.forEach(clearTimeout);
        },
      };
    },
  });
})();
