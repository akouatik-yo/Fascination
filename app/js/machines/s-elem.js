/* Fascination — les éléments */
(function boot() {
  if(!window.FK) return setTimeout(boot,12);
  const { TAU, clamp, rnd, rint, lerp, buf, layer, blit, lut, diffuse, fade, hsv } = window.FK;
  const S = window.FASC;

  /* ─────────── LE SABLE ─────────── */
  /* ─────────── LA FOUDRE ─────────── */
  /* ─────────── LE CRISTAL ─────────── */
  S.push({
    id: 'cristal', name: 'Le Cristal', cat: 'Éléments', glyph: '❉',
    blurb: 'Agrégation limitée par diffusion : le givre',
    hint: 'Cliquez pour poser un germe · l’outil brise incline la croissance.',
    tools: [{ id: 'germe', label: 'germe' }, { id: 'brise', label: 'brise' }],
    make(env) {
      const ctx = env.ctx;
      const GW = 300, GH = Math.max(120, Math.round(GW * env.h / env.w));
      const N = GW * GH;
      const occ = new Uint8Array(N);
      const b = buf(GW, GH);
      const d = b.d;
      for (let i = 0; i < N; i++) { const o = i * 4; d[o] = 6; d[o + 1] = 5; d[o + 2] = 14; }
      let age = 0, wind = 0;
      const walkers = [];
      const spawn = () => ({ x: rint(GW), y: rint(GH) });
      for (let i = 0; i < 500; i++) walkers.push(spawn());
      function germ(x, y) {
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const px = clamp((x + ox) | 0, 1, GW - 2), py = clamp((y + oy) | 0, 1, GH - 2);
          occ[py * GW + px] = 1; put(px, py);
        }
      }
      function put(x, y) {
        const c = hsv(0.5 + age * 0.00004 + Math.sin(age * 0.0002) * 0.2, 0.55, 1);
        const o = (y * GW + x) * 4;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
      }
      germ(GW / 2, GH / 2);
      for (let i = 0; i < 3; i++) germ(rnd(GW - 30, 30), rnd(GH - 30, 30));
      const near = (x, y) => occ[(y - 1) * GW + x] || occ[(y + 1) * GW + x] || occ[y * GW + x - 1] || occ[y * GW + x + 1];
      return {
        frame(t, dt) {
          wind *= 0.96;
          for (let step = 0; step < 7; step++) {
            for (let i = 0; i < walkers.length; i++) {
              const w = walkers[i];
              w.x += (Math.random() < 0.5 ? -1 : 1) + (Math.random() < Math.abs(wind) ? Math.sign(wind) : 0);
              w.y += Math.random() < 0.5 ? -1 : 1;
              if (w.x < 1 || w.y < 1 || w.x >= GW - 1 || w.y >= GH - 1) { walkers[i] = spawn(); continue; }
              const id = w.y * GW + w.x;
              if (occ[id]) { walkers[i] = spawn(); continue; }
              if (near(w.x, w.y)) {
                occ[id] = 1; age++; put(w.x, w.y);
                if (Math.random() < 0.004) env.audio.note(FK.scale(rint(10), 660), 0.5, 'sine', 0.03);
                walkers[i] = spawn();
              }
            }
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#06050e'; ctx.fillRect(0, 0, env.w, env.h);
          ctx.globalCompositeOperation = 'lighter';
          blit(ctx, b, env.w, env.h);
          ctx.globalAlpha = 0.35;
          ctx.filter = 'blur(6px)';
          blit(ctx, b, env.w, env.h);
          ctx.filter = 'none';
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        },
        down(p) {
          const gx = p.x / env.w * GW, gy = p.y / env.h * GH;
          if (env.tool === 'germe') { germ(gx, gy); env.audio.note(FK.scale(rint(8), 880), 0.7, 'triangle', 0.06); }
        },
        move(p) {
          if (!p.down) return;
          if (env.tool === 'brise') wind = clamp(p.dx * 0.05, -0.9, 0.9);
          else if (Math.random() < 0.2) germ(p.x / env.w * GW, p.y / env.h * GH);
        },
      };
    },
  });
})();
