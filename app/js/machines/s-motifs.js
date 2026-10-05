/* Fascination — les motifs */
(function boot() {
  if(!window.FK) return setTimeout(boot,12);
  const { TAU, clamp, rnd, rint, lerp, buf, layer, blit, lut, diffuse, fade, hsv, scale } = window.FK;
  const S = window.FASC;

  /* ─────────── RÉACTION-DIFFUSION ─────────── */
  S.push({
    id: 'rd', name: 'Réaction-Diffusion', cat: 'Motifs', glyph: '⚯',
    blurb: 'Turing : la chimie qui dessine des peaux',
    hint: 'Peignez pour injecter du réactif · l’outil lois change les constantes selon la position.',
    tools: [{ id: 'peindre', label: 'peindre' }, { id: 'lois', label: 'lois' }],
    make(env) {
      const ctx = env.ctx;
      const GW = 180, GH = Math.max(70, Math.round(GW * env.h / env.w));
      const N = GW * GH;
      const A = new Float32Array(N).fill(1), B = new Float32Array(N);
      const A2 = new Float32Array(N), B2 = new Float32Array(N);
      const b = buf(GW, GH);
      let f = 0.037, k = 0.06;
      const seed = (cx, cy, r) => {
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          const px = (cx + x) | 0, py = (cy + y) | 0;
          if (px < 1 || py < 1 || px >= GW - 1 || py >= GH - 1) continue;
          B[py * GW + px] = 1;
        }
      };
      for (let i = 0; i < 6; i++) seed(rnd(GW - 20, 20), rnd(GH - 20, 20), 5);
      function tick() {
        for (let y = 1; y < GH - 1; y++) {
          const o = y * GW;
          for (let x = 1; x < GW - 1; x++) {
            const i = o + x;
            const la = (A[i - 1] + A[i + 1] + A[i - GW] + A[i + GW]) * 0.2 + (A[i - GW - 1] + A[i - GW + 1] + A[i + GW - 1] + A[i + GW + 1]) * 0.05 - A[i];
            const lb = (B[i - 1] + B[i + 1] + B[i - GW] + B[i + GW]) * 0.2 + (B[i - GW - 1] + B[i - GW + 1] + B[i + GW - 1] + B[i + GW + 1]) * 0.05 - B[i];
            const ab = A[i] * B[i] * B[i];
            A2[i] = clamp(A[i] + (1.0 * la - ab + f * (1 - A[i])), 0, 1);
            B2[i] = clamp(B[i] + (0.5 * lb + ab - (k + f) * B[i]), 0, 1);
          }
        }
        A.set(A2); B.set(B2);
      }
      return {
        frame(t) {
          tick(); tick();
          const d = b.d;
          const hs = t * 0.03;
          for (let i = 0; i < N; i++) {
            const v = clamp(B[i] * 3.4, 0, 1);
            const c = hsv(hs + 0.62 - v * 0.55, 0.85 - v * 0.4, 0.06 + Math.pow(v, 0.6) * 0.98);
            const o = i * 4;
            d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
          ctx.fillStyle = 'rgba(255,255,255,.3)';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`f=${f.toFixed(3)}  k=${k.toFixed(3)}`, 16, env.h - 16);
        },
        down(p) { this.move({ ...p, down: true }); },
        move(p) {
          if (!p.down) return;
          if (env.tool === 'lois') {
            f = lerp(0.012, 0.062, clamp(p.x / env.w, 0, 1));
            k = lerp(0.045, 0.07, clamp(p.y / env.h, 0, 1));
          } else seed(p.x / env.w * GW, p.y / env.h * GH, 4);
        },
      };
    },
  });

  /* ─────────── LES SPIRALES ─────────── */
  S.push({
    id: 'spirales', name: 'Les Spirales', cat: 'Motifs', glyph: '🌀',
    blurb: 'Automate cyclique : des galaxies naissent du bruit',
    hint: 'Glissez pour perturber ou lisser : chaque cicatrice devient une spirale.',
    tools: [{ id: 'perturber', label: 'perturber' }, { id: 'lisser', label: 'lisser' }],
    make(env) {
      const ctx = env.ctx;
      const GW = 260, GH = Math.max(100, Math.round(GW * env.h / env.w));
      const N = GW * GH, ST = 14;
      let cur = new Uint8Array(N), nxt = new Uint8Array(N);
      for (let i = 0; i < N; i++) cur[i] = rint(ST);
      const b = buf(GW, GH);
      const L = new Uint8Array(ST * 3);
      return {
        frame(t) {
          for (let s = 0; s < ST; s++) {
            const c = hsv(s / ST + t * 0.02, 0.72, 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s / ST * TAU + t * 0.6)));
            L[s * 3] = c[0]; L[s * 3 + 1] = c[1]; L[s * 3 + 2] = c[2];
          }
          for (let y = 0; y < GH; y++) {
            const yp = ((y - 1 + GH) % GH) * GW, yn = ((y + 1) % GH) * GW, yo = y * GW;
            for (let x = 0; x < GW; x++) {
              const i = yo + x, v = cur[i], want = (v + 1) % ST;
              const xp = (x - 1 + GW) % GW, xn = (x + 1) % GW;
              nxt[i] = (cur[yo + xp] === want || cur[yo + xn] === want || cur[yp + x] === want || cur[yn + x] === want ||
                cur[yp + xp] === want || cur[yn + xn] === want || cur[yp + xn] === want || cur[yn + xp] === want) ? want : v;
            }
          }
          const tm = cur; cur = nxt; nxt = tm;
          const d = b.d;
          for (let i = 0; i < N; i++) {
            const c = cur[i] * 3, o = i * 4;
            d[o] = L[c]; d[o + 1] = L[c + 1]; d[o + 2] = L[c + 2];
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
        },
        down(p) { this.move({ ...p, down: true }); },
        move(p) {
          if (!p.down) return;
          const gx = p.x / env.w * GW, gy = p.y / env.h * GH, r = 11;
          const uni = rint(ST);
          for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
            if (x * x + y * y > r * r) continue;
            const px = ((gx + x) | 0) , py = ((gy + y) | 0);
            if (px < 0 || py < 0 || px >= GW || py >= GH) continue;
            cur[py * GW + px] = env.tool === 'lisser' ? uni : rint(ST);
          }
        },
      };
    },
  });

  /* ─────────── LES CYMATIQUES ─────────── */
  S.push({
    id: 'chladni', name: 'Les Cymatiques', cat: 'Motifs', glyph: '◈',
    blurb: 'Le son rendu visible : figures de Chladni',
    hint: 'Glissez pour changer le mode : la plaque chante la fréquence que vous entendez.',
    tools: [{ id: 'jouer', label: 'jouer' }, { id: 'secouer', label: 'secouer' }],
    make(env) {
      const ctx = env.ctx;
      const P = [];
      for (let i = 0; i < 14000; i++) P.push({ x: rnd(1, -1), y: rnd(1, -1) });
      let m = 3, n = 5, tm = 3, tn = 5;
      const dr = env.audio.drone(220, 'sine', 0.05);
      const acc = layer(env.w, env.h);
      const f = (x, y) => Math.sin(n * Math.PI * x) * Math.sin(m * Math.PI * y) + Math.sin(m * Math.PI * x) * Math.sin(n * Math.PI * y);
      return {
        frame(t, dt) {
          m += (tm - m) * 0.06; n += (tn - n) * 0.06;
          const g = acc.g;
          g.globalCompositeOperation = 'source-over';
          g.globalAlpha = 0.14; g.fillStyle = '#07060f'; g.fillRect(0, 0, acc.w, acc.h); g.globalAlpha = 1;
          g.globalCompositeOperation = 'lighter';
          const R = Math.min(env.w, env.h) * 0.44, cx = env.w / 2, cy = env.h / 2;
          for (const p of P) {
            const v = Math.abs(f(p.x, p.y));
            const st = clamp(v, 0.0012, 1) * 0.055;
            p.x = clamp(p.x + rnd(st, -st), -1, 1);
            p.y = clamp(p.y + rnd(st, -st), -1, 1);
            const sx = cx + p.x * R, sy = cy + p.y * R;
            const c = hsv(0.55 + v * 0.4 + t * 0.02, 0.5, 1);
            g.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${0.5 - v * 0.3})`;
            g.fillRect(sx, sy, 1.5, 1.5);
          }
          g.globalCompositeOperation = 'source-over';
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#07060f'; ctx.fillRect(0, 0, env.w, env.h);
          ctx.strokeStyle = 'rgba(150,160,220,.18)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, 0, TAU); ctx.stroke();
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(acc.c, 0, 0, env.w, env.h);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(230,235,255,.4)';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`mode ${tn}:${tm}   ${(110 * (tn + tm) / 2).toFixed(0)} Hz`, 16, env.h - 16);
          if (dr) dr.set(110 * (n + m) / 2);
        },
        down(p) { this.move({ ...p, down: true }); },
        move(p) {
          if (!p.down) return;
          if (env.tool === 'secouer') {
            for (let i = 0; i < 2500; i++) { const q = P[rint(P.length)]; q.x = rnd(1, -1); q.y = rnd(1, -1); }
            return;
          }
          tn = 1 + Math.round(clamp(p.x / env.w, 0, 1) * 9);
          tm = 1 + Math.round(clamp(p.y / env.h, 0, 1) * 9);
        },
        dispose() { if (dr) dr.stop(); },
      };
    },
  });

  /* ─────────── LE KALÉIDOSCOPE ─────────── */
  S.push({
    id: 'kaleido', name: 'Le Kaléidoscope', cat: 'Motifs', glyph: '✺',
    blurb: 'Un geste, douze reflets, une rosace vivante',
    hint: 'Dessinez : chaque trait est démultiplié et tourne à l’infini.',
    tools: [{ id: 'x6', label: '6 miroirs' }, { id: 'x12', label: '12 miroirs' }, { id: 'x24', label: '24 miroirs' }],
    make(env) {
      const ctx = env.ctx;
      const acc = layer(env.w, env.h);
      acc.g.fillStyle = '#06040c'; acc.g.fillRect(0, 0, acc.w, acc.h);
      let auto = { a: rnd(TAU), r: Math.min(env.w, env.h) * 0.2, ph: rnd(TAU) };
      let hue = rnd(1), lastTouch = -99, spin = 0;
      const K = () => (env.tool === 'x6' ? 6 : env.tool === 'x24' ? 24 : 12);
      function stroke(x1, y1, x2, y2, w) {
        const g = acc.g, cx = env.w / 2, cy = env.h / 2, k = K();
        g.globalCompositeOperation = 'lighter';
        g.lineCap = 'round';
        const c = hsv(hue, 0.68, 1);
        g.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},.42)`;
        g.lineWidth = w;
        for (let i = 0; i < k; i++) {
          const a = i / k * TAU + spin;
          for (const mir of [1, -1]) {
            g.save();
            g.translate(cx, cy);
            g.rotate(a);
            g.scale(1, mir);
            g.beginPath();
            g.moveTo(x1 - cx, y1 - cy);
            g.lineTo(x2 - cx, y2 - cy);
            g.stroke();
            g.restore();
          }
        }
      }
      return {
        frame(t, dt) {
          spin += dt * 0.11;
          acc.g.globalCompositeOperation = 'source-over';
          acc.g.globalAlpha = 0.024;
          acc.g.fillStyle = '#06040c';
          acc.g.fillRect(0, 0, acc.w, acc.h);
          acc.g.globalAlpha = 1;
          hue = (hue + dt * 0.07) % 1;
          if (t - lastTouch > 2.2) {
            const px = env.w / 2 + Math.cos(auto.a) * auto.r, py = env.h / 2 + Math.sin(auto.a * 1.31 + auto.ph) * auto.r * 0.8;
            auto.a += dt * 1.5;
            auto.r = Math.min(env.w, env.h) * (0.16 + 0.24 * (0.5 + 0.5 * Math.sin(t * 0.23)));
            const nx = env.w / 2 + Math.cos(auto.a) * auto.r, ny = env.h / 2 + Math.sin(auto.a * 1.31 + auto.ph) * auto.r * 0.8;
            stroke(px, py, nx, ny, 3.6);
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(acc.c, 0, 0, env.w, env.h);
        },
        down(p) { lastTouch = env.t; env.audio.note(scale(rint(12), 330), 0.6, 'triangle', 0.05); },
        move(p) {
          if (!p.down) return;
          lastTouch = env.t;
          stroke(p.x - p.dx, p.y - p.dy, p.x, p.y, clamp(2 + Math.hypot(p.dx, p.dy) * 0.5, 2, 14));
        },
      };
    },
  });

  /* ─────────── L’HARMONOGRAPHE ─────────── */
  S.push({
    id: 'harmono', name: 'L’Harmonographe', cat: 'Motifs', glyph: '𖤔',
    blurb: 'Deux pendules, une courbe infinie, deux notes',
    hint: 'Glissez : l’axe X et l’axe Y accordent les deux pendules (et les deux sons).',
    tools: [{ id: 'accorder', label: 'accorder' }, { id: 'effacer', label: 'effacer' }],
    make(env) {
      const ctx = env.ctx;
      const acc = layer(env.w, env.h);
      acc.g.fillStyle = '#07050e'; acc.g.fillRect(0, 0, acc.w, acc.h);
      let f1 = 2, f2 = 3, f3 = 2.01, f4 = 3.02, ph = rnd(TAU), th = 0, hue = rnd(1);
      const d1 = env.audio.drone(220, 'sine', 0.045);
      const d2 = env.audio.drone(330, 'triangle', 0.03);
      const R = Math.min(env.w, env.h) * 0.32;
      const pt = (s) => {
        const dec = Math.exp(-s * 0.0006);
        return [
          env.w / 2 + (Math.sin(s * f1) + Math.sin(s * f3 + ph)) * R * 0.5 * dec,
          env.h / 2 + (Math.sin(s * f2 + 1.2) + Math.sin(s * f4 + ph * 1.7)) * R * 0.5 * dec,
        ];
      };
      let clear = 0;
      return {
        frame(t, dt) {
          const g = acc.g;
          g.globalCompositeOperation = 'source-over';
          g.globalAlpha = clear ? 0.5 : 0.006; g.fillStyle = '#07050e'; g.fillRect(0, 0, acc.w, acc.h); g.globalAlpha = 1;
          clear = 0;
          g.globalCompositeOperation = 'lighter';
          g.lineWidth = 1.3; g.lineCap = 'round';
          hue = (hue + dt * 0.04) % 1;
          const c = hsv(hue, 0.6, 1);
          g.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},.42)`;
          g.beginPath();
          let [px, py] = pt(th);
          g.moveTo(px, py);
          for (let i = 0; i < 220; i++) {
            th += 0.006;
            const [x, y] = pt(th);
            g.lineTo(x, y);
          }
          g.stroke();
          if (th > 900) th = 0;
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(acc.c, 0, 0, env.w, env.h);
          const [hx, hy] = pt(th);
          ctx.globalCompositeOperation = 'lighter';
          const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26);
          rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, hy, 26, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(240,240,255,.4)';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`pendules ${f1.toFixed(2)} : ${f2.toFixed(2)}`, 16, env.h - 16);
          if (d1) { d1.set(110 * f1); d2.set(110 * f2); }
        },
        down(p) {
          if (env.tool === 'effacer') { clear = 1; th = 0; ph = rnd(TAU); f3 = f1 + rnd(0.04, -0.02); f4 = f2 + rnd(0.04, -0.02); }
        },
        move(p) {
          if (!p.down || env.tool === 'effacer') return;
          f1 = 1 + clamp(p.x / env.w, 0, 1) * 6;
          f2 = 1 + clamp(p.y / env.h, 0, 1) * 6;
          f3 = f1 + 0.01; f4 = f2 + 0.02;
        },
        dispose() { if (d1) d1.stop(); if (d2) d2.stop(); },
      };
    },
  });

  /* ─────────── L’ATTRACTEUR ─────────── */
  S.push({
    id: 'attracteur', name: 'L’Attracteur', cat: 'Motifs', glyph: '∞',
    blurb: 'Chaos déterministe de Peter de Jong',
    hint: 'Glissez pour tordre l’équation · relâchez et regardez-la dériver.',
    tools: [{ id: 'tordre', label: 'tordre' }, { id: 'hasard', label: 'hasard' }],
    make(env) {
      const ctx = env.ctx;
      const RW = Math.min(560, env.w | 0), RH = Math.max(80, Math.round(RW * env.h / env.w));
      const dens = new Float32Array(RW * RH);
      const b = buf(RW, RH);
      let A = rnd(3, -3), B = rnd(3, -3), C = rnd(3, -3), D = rnd(3, -3);
      let tA = A, tB = B, tC = C, tD = D, drift = 0;
      return {
        frame(t, dt) {
          drift += dt;
          if (drift > 9) { drift = 0; tA = rnd(3, -3); tB = rnd(3, -3); tC = rnd(3, -3); tD = rnd(3, -3); }
          A += (tA - A) * 0.02; B += (tB - B) * 0.02; C += (tC - C) * 0.02; D += (tD - D) * 0.02;
          const sc = Math.min(RW, RH) * 0.24;
          for (let s = 0; s < 700; s++) {
            let x = rnd(2, -2), y = rnd(2, -2);
            for (let i = 0; i < 42; i++) {
              const nx = Math.sin(A * y) - Math.cos(B * x);
              const ny = Math.sin(C * x) - Math.cos(D * y);
              x = nx; y = ny;
              if (i < 4) continue;
              const px = (RW / 2 + x * sc) | 0, py = (RH / 2 + y * sc) | 0;
              if (px < 0 || py < 0 || px >= RW || py >= RH) continue;
              dens[py * RW + px] += 1;
            }
          }
          const d = b.d, n = RW * RH;
          for (let i = 0; i < n; i++) {
            dens[i] *= 0.88;
            const v = clamp(Math.log(1 + dens[i]) * 0.9, 0, 1);
            const c = hsv(0.72 + v * 0.5 + t * 0.03, 0.75 - v * 0.5, Math.pow(v, 0.75));
            const o = i * 4;
            d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#06050d'; ctx.fillRect(0, 0, env.w, env.h);
          ctx.globalCompositeOperation = 'lighter';
          blit(ctx, b, env.w, env.h);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(240,235,255,.35)';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`a ${A.toFixed(2)}  b ${B.toFixed(2)}  c ${C.toFixed(2)}  d ${D.toFixed(2)}`, 16, env.h - 16);
        },
        down(p) {
          if (env.tool === 'hasard') {
            tA = rnd(3, -3); tB = rnd(3, -3); tC = rnd(3, -3); tD = rnd(3, -3); drift = 0;
            env.audio.note(scale(rint(12), 220), 0.8, 'sine', 0.07);
          }
        },
        move(p) {
          if (!p.down || env.tool === 'hasard') return;
          tA = lerp(-3, 3, clamp(p.x / env.w, 0, 1));
          tB = lerp(-3, 3, clamp(p.y / env.h, 0, 1));
          tC = lerp(3, -3, clamp(p.y / env.h, 0, 1));
          drift = 0;
        },
      };
    },
  });

  /* ─────────── LE FRACTAL ─────────── */
  S.push({
    id: 'fractal', name: 'Le Fractal', cat: 'Motifs', glyph: '❈',
    blurb: 'Mandelbrot, Julia, et un puits sans fond',
    hint: 'Cliquez pour plonger vers un point · l’outil Julia sculpte l’ensemble avec le curseur.',
    tools: [{ id: 'plonger', label: 'plonger' }, { id: 'julia', label: 'julia' }, { id: 'sortir', label: 'reculer' }],
    make(env) {
      const ctx = env.ctx;
      const RW = 260, RH = Math.max(100, Math.round(RW * env.h / env.w));
      const b = buf(RW, RH);
      const it = new Float32Array(RW * RH);
      let cx = -0.743643887, cy = 0.131825904, zoom = 3.2, tzoom = 3.2;
      let jx = -0.4, jy = 0.6, julia = false;
      const MAXI = 190;
      return {
        frame(t, dt) {
          zoom += (tzoom - zoom) * 0.05;
          if (!julia) tzoom *= 1 - dt * 0.06;
          if (tzoom < 4e-13) tzoom = 3.2;
          const aspect = RW / RH;
          const w = zoom, h = zoom / aspect;
          for (let py = 0; py < RH; py++) {
            const y0 = cy + (py / RH - 0.5) * h;
            for (let px = 0; px < RW; px++) {
              const x0 = cx + (px / RW - 0.5) * w;
              let zx = julia ? x0 : 0, zy = julia ? y0 : 0;
              const kx = julia ? jx : x0, ky = julia ? jy : y0;
              let i = 0, zx2 = zx * zx, zy2 = zy * zy;
              while (i < MAXI && zx2 + zy2 < 16) {
                zy = 2 * zx * zy + ky; zx = zx2 - zy2 + kx;
                zx2 = zx * zx; zy2 = zy * zy; i++;
              }
              let v = i;
              if (i < MAXI) v = i + 1 - Math.log(Math.log(Math.sqrt(zx2 + zy2)) / Math.log(2)) / Math.log(2);
              it[py * RW + px] = i >= MAXI ? -1 : v;
            }
          }
          const d = b.d, n = RW * RH;
          for (let i = 0; i < n; i++) {
            const v = it[i], o = i * 4;
            if (v < 0) { d[o] = 6; d[o + 1] = 4; d[o + 2] = 12; continue; }
            const c = hsv(v * 0.012 + t * 0.05, 0.72, clamp(0.25 + v * 0.02, 0, 1));
            d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(julia ? `julia  c = ${jx.toFixed(3)} ${jy >= 0 ? '+' : '−'} ${Math.abs(jy).toFixed(3)}i` : `zoom ×${(3.2 / zoom).toExponential(1)}`, 16, env.h - 16);
        },
        down(p) {
          if (env.tool === 'julia') { julia = true; return this.move({ ...p, down: true }); }
          julia = false;
          const aspect = RW / RH;
          const nx = cx + (p.x / env.w - 0.5) * zoom, ny = cy + (p.y / env.h - 0.5) * zoom / aspect;
          cx = nx; cy = ny;
          if (env.tool === 'sortir') { tzoom = Math.min(3.2, zoom * 3); }
          else tzoom = zoom * 0.35;
          env.audio.note(rnd(300, 120), 0.7, 'sine', 0.07, rnd(900, 400));
        },
        move(p) {
          if (!p.down) return;
          if (env.tool === 'julia') {
            julia = true;
            jx = lerp(-1.1, 0.5, clamp(p.x / env.w, 0, 1));
            jy = lerp(-0.9, 0.9, clamp(p.y / env.h, 0, 1));
            cx = 0; cy = 0; tzoom = 3.2;
          }
        },
      };
    },
  });

  /* ─────────── LE MOIRÉ ─────────── */
  S.push({
    id: 'moire', name: 'Le Moiré', cat: 'Motifs', glyph: '◎',
    blurb: 'Deux trames qui se frôlent et tout se met à respirer',
    hint: 'Glissez pour décaler la deuxième trame · changez de trame avec les outils.',
    tools: [{ id: 'cercles', label: 'cercles' }, { id: 'lignes', label: 'lignes' }, { id: 'grille', label: 'grille' }],
    make(env) {
      const ctx = env.ctx;
      const RW = 300, RH = Math.max(120, Math.round(RW * env.h / env.w));
      const b = buf(RW, RH);
      let ox = 0.06, oy = 0.02, rot = 0.04;
      return {
        frame(t, dt) {
          rot = 0.03 + Math.sin(t * 0.11) * 0.04;
          const d = b.d;
          const c1x = RW * 0.5, c1y = RH * 0.5;
          const c2x = RW * (0.5 + ox), c2y = RH * (0.5 + oy);
          const cs = Math.cos(rot), sn = Math.sin(rot);
          const mode = env.tool || 'cercles';
          for (let y = 0; y < RH; y++) {
            for (let x = 0; x < RW; x++) {
              let v;
              if (mode === 'cercles') {
                const d1 = Math.hypot(x - c1x, y - c1y), d2 = Math.hypot(x - c2x, y - c2y);
                v = Math.sin(d1 * 0.55 - t * 2.2) * Math.sin(d2 * 0.55 + t * 1.6);
              } else if (mode === 'lignes') {
                const u1 = x * cs - y * sn, u2 = (x - (c2x - c1x)) * Math.cos(-rot) - (y - (c2y - c1y)) * Math.sin(-rot);
                v = Math.sin(u1 * 0.9 + t) * Math.sin(u2 * 0.94 - t * 0.8);
              } else {
                const u1 = x * cs - y * sn, w1 = x * sn + y * cs;
                const u2 = (x - (c2x - c1x)) * 1.02, w2 = (y - (c2y - c1y)) * 1.02;
                v = Math.sin(u1 * 0.8) * Math.sin(w1 * 0.8 + t) * Math.sin(u2 * 0.82 - t) * Math.sin(w2 * 0.82);
              }
              const m = Math.abs(v);
              const col = hsv(0.62 + m * 0.45 + t * 0.04, 0.65, Math.pow(m, 0.55));
              const o = (y * RW + x) * 4;
              d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2];
            }
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
        },
        move(p) {
          if (!p.down) return;
          ox = clamp(p.x / env.w - 0.5, -0.5, 0.5) * 0.6;
          oy = clamp(p.y / env.h - 0.5, -0.5, 0.5) * 0.6;
        },
        down(p) { this.move({ ...p, down: true }); },
      };
    },
  });
})();
