/* Fascination — les motifs */
(function boot() {
  if(!window.FK) return setTimeout(boot,12);
  const { TAU, clamp, rnd, rint, lerp, buf, layer, blit, lut, diffuse, fade, hsv, scale } = window.FK;
  const S = window.FASC;

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
