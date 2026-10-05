/* Fascination — les motifs */
(function boot() {
  if(!window.FK) return setTimeout(boot,12);
  const { TAU, clamp, rnd, rint, lerp, buf, layer, blit, lut, diffuse, fade, hsv, scale } = window.FK;
  const S = window.FASC;

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
