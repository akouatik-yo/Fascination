/* Fascination — les éléments */
(function boot() {
  if(!window.FK) return setTimeout(boot,12);
  const { TAU, clamp, rnd, rint, lerp, buf, layer, blit, lut, diffuse, fade, hsv } = window.FK;
  const S = window.FASC;

  /* ─────────── LE SABLE ─────────── */
  /* ─────────── LA FOUDRE ─────────── */
  S.push({
    id: 'foudre', name: 'La Foudre', cat: 'Éléments', glyph: '🜍',
    blurb: 'Lichtenberg, tonnerre et rémanence',
    hint: 'Cliquez pour appeler l’éclair · glissez pour tirer des arcs.',
    tools: [{ id: 'eclair', label: 'éclair' }, { id: 'arc', label: 'arc' }],
    make(env) {
      const ctx = env.ctx;
      const bolts = [];
      const clouds = Array.from({ length: 16 }, () => ({ x: rnd(env.w), y: rnd(env.h * 0.33), r: rnd(190, 90), s: rnd(0.3, 0.05) }));
      let flash = 0, next = 0.6;
      function branch(x1, y1, x2, y2, disp, depth, out, w) {
        if (depth === 0 || disp < 2.5) { out.push({ x1, y1, x2, y2, w }); return; }
        let mx = (x1 + x2) / 2 + rnd(disp, -disp);
        let my = (y1 + y2) / 2 + rnd(disp, -disp) * 0.6;
        branch(x1, y1, mx, my, disp / 2, depth - 1, out, w);
        branch(mx, my, x2, y2, disp / 2, depth - 1, out, w * 0.96);
        if (depth > 2 && Math.random() < 0.45) {
          const a = Math.atan2(y2 - y1, x2 - x1) + rnd(1.1, -1.1);
          const len = Math.hypot(x2 - mx, y2 - my) * rnd(0.8, 0.35);
          branch(mx, my, mx + Math.cos(a) * len, my + Math.sin(a) * len, disp / 1.6, depth - 2, out, w * 0.5);
        }
      }
      function strike(tx, ty, big) {
        const segs = [];
        branch(rnd(env.w * 0.7, env.w * 0.3), -10, tx, ty, env.w * 0.14, 8, segs, big ? 2.6 : 1.4);
        bolts.push({ segs, life: 1, hue: rnd(0.72, 0.5) });
        flash = big ? 1 : 0.45;
        env.audio.noise(big ? 1.6 : 0.7, big ? 0.4 : 0.18, big ? 320 : 900, 0.7, 'lowpass', 60);
        if (big) env.audio.note(rnd(70, 40), 1.8, 'sine', 0.14, 28);
      }
      return {
        frame(t, dt) {
          next -= dt;
          if (next <= 0) { next = rnd(2.8, 0.9); strike(rnd(env.w * 0.9, env.w * 0.1), rnd(env.h * 0.95, env.h * 0.55), Math.random() < 0.6); }
          ctx.globalCompositeOperation = 'source-over';
          const g = ctx.createLinearGradient(0, 0, 0, env.h);
          g.addColorStop(0, '#0a0a16'); g.addColorStop(1, '#04040a');
          ctx.fillStyle = g; ctx.fillRect(0, 0, env.w, env.h);
          ctx.globalCompositeOperation = 'lighter';
          for (const c of clouds) {
            c.x += c.s; if (c.x - c.r > env.w) c.x = -c.r;
            const rg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
            const a = 0.055 + flash * 0.42;
            rg.addColorStop(0, `rgba(158,168,228,${a})`);
            rg.addColorStop(1, 'rgba(90,100,180,0)');
            ctx.fillStyle = rg;
            ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
          }
          if (flash > 0.02) {
            ctx.fillStyle = `rgba(180,190,255,${flash * 0.16})`;
            ctx.fillRect(0, 0, env.w, env.h);
          }
          flash *= 0.86;
          for (let i = bolts.length - 1; i >= 0; i--) {
            const bo = bolts[i];
            bo.life -= dt * 0.55;
            if (bo.life <= 0) { bolts.splice(i, 1); continue; }
            const c = hsv(bo.hue, 0.35, 1);
            ctx.lineCap = 'round';
            for (const s of bo.segs) {
              ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${bo.life * 0.2})`;
              ctx.lineWidth = s.w * 7 * bo.life;
              ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
              ctx.strokeStyle = `rgba(255,255,255,${bo.life * 0.85})`;
              ctx.lineWidth = s.w;
              ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
            }
          }
          ctx.globalCompositeOperation = 'source-over';
        },
        down(p) { strike(p.x, p.y, env.tool === 'eclair'); },
        move(p) {
          if (!p.down) return;
          if (env.tool === 'arc' && Math.random() < 0.35) {
            const segs = [];
            branch(p.x, p.y, p.x + rnd(160, -160), p.y + rnd(160, -160), 26, 5, segs, 1);
            bolts.push({ segs, life: 0.7, hue: rnd(0.62, 0.45) });
            if (Math.random() < 0.3) env.audio.noise(0.14, 0.09, 2600, 3, 'bandpass');
          }
        },
      };
    },
  });

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
