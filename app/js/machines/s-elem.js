/* Fascination — les éléments */
(function boot() {
  if(!window.FK) return setTimeout(boot,12);
  const { TAU, clamp, rnd, rint, lerp, buf, layer, blit, lut, diffuse, fade, hsv } = window.FK;
  const S = window.FASC;

  S.push({
    id: 'fluide', name: 'L’Écoulement', cat: 'Éléments', glyph: '🝆',
    blurb: 'De l’encre dans un fluide qui se souvient',
    hint: 'Glissez pour injecter de l’encre et remuer le fluide.',
    tools: [{ id: 'encre', label: 'encre' }, { id: 'remuer', label: 'remuer' }],
    make(env) {
      const ctx = env.ctx;
      const N = 96, W = N + 2, SZ = W * W;
      const IX = (i, j) => i + W * j;
      const mk = () => new Float32Array(SZ);
      let u = mk(), v = mk(), u0 = mk(), v0 = mk(), p = mk(), div = mk();
      let dye = [mk(), mk(), mk()], dye0 = [mk(), mk(), mk()];
      const b = buf(N, N);
      function bnd(bt, x) {
        for (let i = 1; i <= N; i++) {
          x[IX(0, i)] = bt === 1 ? -x[IX(1, i)] : x[IX(1, i)];
          x[IX(N + 1, i)] = bt === 1 ? -x[IX(N, i)] : x[IX(N, i)];
          x[IX(i, 0)] = bt === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
          x[IX(i, N + 1)] = bt === 2 ? -x[IX(i, N)] : x[IX(i, N)];
        }
      }
      function advect(bt, d, d0, uu, vv, dt) {
        const dt0 = dt * N;
        for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
          let x = i - dt0 * uu[IX(i, j)], y = j - dt0 * vv[IX(i, j)];
          if (x < 0.5) x = 0.5; if (x > N + 0.5) x = N + 0.5;
          if (y < 0.5) y = 0.5; if (y > N + 0.5) y = N + 0.5;
          const i0 = x | 0, j0 = y | 0, i1 = i0 + 1, j1 = j0 + 1;
          const s1 = x - i0, s0 = 1 - s1, t1 = y - j0, t0 = 1 - t1;
          d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) + s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
        }
        bnd(bt, d);
      }
      function project() {
        for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
          div[IX(i, j)] = -0.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]) / N;
          p[IX(i, j)] = 0;
        }
        bnd(0, div); bnd(0, p);
        for (let k = 0; k < 16; k++) {
          for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++)
            p[IX(i, j)] = (div[IX(i, j)] + p[IX(i - 1, j)] + p[IX(i + 1, j)] + p[IX(i, j - 1)] + p[IX(i, j + 1)]) / 4;
          bnd(0, p);
        }
        for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
          u[IX(i, j)] -= 0.5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
          v[IX(i, j)] -= 0.5 * N * (p[IX(i, j + 1)] - p[IX(i, j - 1)]);
        }
        bnd(1, u); bnd(2, v);
      }
      let hue = rnd(1);
      const inject = (px, py, fx, fy, amt) => {
        const i = clamp((px / env.w * N) | 0, 1, N), j = clamp((py / env.h * N) | 0, 1, N);
        const c = hsv(hue, 0.85, 1);
        for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
          const ii = clamp(i + ox, 1, N), jj = clamp(j + oy, 1, N), k = IX(ii, jj);
          u[k] += fx; v[k] += fy;
          if (amt) { dye[0][k] += c[0] / 255 * amt; dye[1][k] += c[1] / 255 * amt; dye[2][k] += c[2] / 255 * amt; }
        }
      };
      for (let i = 0; i < 6; i++) inject(rnd(env.w), rnd(env.h), rnd(4, -4), rnd(4, -4), 7);
      return {
        frame(t, dt) {
          hue = (hue + dt * 0.06) % 1;
          const st = clamp(dt, 0.008, 0.033);
          u0.set(u); v0.set(v);
          advect(1, u, u0, u0, v0, st); advect(2, v, v0, u0, v0, st);
          project();
          for (let c = 0; c < 3; c++) {
            dye0[c].set(dye[c]);
            advect(0, dye[c], dye0[c], u, v, st);
            const d = dye[c];
            for (let i = 0; i < SZ; i++) d[i] *= 0.9982;
          }
          const d = b.d;
          for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const k = IX(i + 1, j + 1), o = (j * N + i) * 4;
            d[o] = clamp(dye[0][k] * 255, 0, 255);
            d[o + 1] = clamp(dye[1][k] * 255, 0, 255);
            d[o + 2] = clamp(dye[2][k] * 255, 0, 255);
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, env.w, env.h);
          ctx.globalCompositeOperation = 'lighter';
          blit(ctx, b, env.w, env.h);
          ctx.globalCompositeOperation = 'source-over';
        },
        down(p) { inject(p.x, p.y, rnd(2, -2), rnd(2, -2), env.tool === 'encre' ? 8 : 0); },
        move(p) {
          if (!p.down) return;
          inject(p.x, p.y, p.dx * 2.4, p.dy * 2.4, env.tool === 'encre' ? 3 : 0);
        },
      };
    },
  });

  /* ─────────── LE SABLE ─────────── */
  S.push({
    id: 'sable', name: 'Le Sable', cat: 'Éléments', glyph: '⌛',
    blurb: 'Sable, eau, lave, vapeur, plantes',
    hint: 'Choisissez une matière et dessinez. La lave et l’eau ne s’aiment pas.',
    tools: [{ id: 'sable', label: 'sable' }, { id: 'eau', label: 'eau' }, { id: 'lave', label: 'lave' }, { id: 'mur', label: 'pierre' }, { id: 'graine', label: 'graine' }, { id: 'gomme', label: 'gomme' }],
    make(env) {
      const ctx = env.ctx;
      const GW = 175, GH = Math.max(70, Math.round(GW * env.h / env.w));
      const N = GW * GH;
      const T = { V: 0, S: 1, E: 2, M: 3, L: 4, P: 5, G: 6, A: 7 };
      const g = new Uint8Array(N), tint = new Float32Array(N);
      const b = buf(GW, GH);
      for (let i = 0; i < N; i++) tint[i] = Math.random();
      const inb = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH;
      const at = (x, y) => (inb(x, y) ? g[y * GW + x] : T.M);
      const set = (x, y, v) => { if (inb(x, y)) { g[y * GW + x] = v; } };
      for (let x = 0; x < GW; x++) for (let y = GH - 6; y < GH; y++) g[y * GW + x] = T.M;
      // décor initial : corniches de pierre, bassins, dune
      const shelf = (x0, x1, yy, th) => { const y = yy | 0; for (let x = x0 | 0; x < (x1 | 0); x++) for (let k = 0; k < (th || 3); k++) if (y + k > 0 && y + k < GH) g[(y + k) * GW + x] = T.M; };
      shelf(0, GW * 0.42, GH * 0.34, 3);
      shelf(GW * 0.58, GW, GH * 0.46, 3);
      shelf(GW * 0.2, GW * 0.8, GH * 0.66, 3);
      for (let x = (GW * 0.2) | 0; x < (GW * 0.34) | 0; x++) { g[(((GH * 0.66) | 0)) * GW + x] = T.M; for (let y = (GH * 0.6) | 0; y < ((GH * 0.66) | 0); y++) g[y * GW + x] = T.E; }
      for (let x = 0; x < GW; x++) {
        const dune = Math.round(7 + Math.sin(x * 0.06) * 5 + Math.sin(x * 0.19) * 2.5);
        for (let y = GH - 6 - dune; y < GH - 6; y++) if (y > 0) g[y * GW + x] = T.S;
      }
      for (let x = (GW * 0.44) | 0; x < GW * 0.5; x += 2) g[((GH * 0.66 - 1) | 0) * GW + x] = T.A;
      const src = [{ x: GW * 0.14, t: T.S }, { x: GW * 0.74, t: T.E }, { x: GW * 0.9, t: T.L }];
      let sizzle = 0;
      return {
        frame(t, dt) {
          for (const s of src) {
            if (Math.random() < (s.t === T.L ? 0.28 : 0.7)) {
              const x = (s.x + rint(3) - 1) | 0;
              if (x > 0 && x < GW - 1 && g[GW + x] === T.V) g[GW + x] = s.t;
            }
          }
          for (let y = GH - 2; y >= 0; y--) {
            const l2r = Math.random() < 0.5;
            for (let k = 0; k < GW; k++) {
              const x = l2r ? k : GW - 1 - k;
              const i = y * GW + x, c = g[i];
              if (c === T.V || c === T.M || c === T.P) continue;
              if (c === T.S) {
                const d = at(x, y + 1);
                if (d === T.V || d === T.E || d === T.G) { g[i] = d; set(x, y + 1, T.S); }
                else {
                  const s = Math.random() < 0.5 ? -1 : 1;
                  const dd = at(x + s, y + 1);
                  if (dd === T.V || dd === T.E) { g[i] = dd; set(x + s, y + 1, T.S); }
                }
              } else if (c === T.E || c === T.L) {
                if (c === T.L && Math.random() < 0.55) continue;
                // lave + eau -> pierre + vapeur
                if (c === T.L) {
                  let hit = false;
                  for (const [ox, oy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
                    if (at(x + ox, y + oy) === T.E) { set(x + ox, y + oy, T.G); hit = true; }
                  }
                  if (hit) { g[i] = T.P; sizzle = 1; continue; }
                }
                const d = at(x, y + 1);
                if (d === T.V || (c === T.L && d === T.G)) { g[i] = d; set(x, y + 1, c); }
                else {
                  const s = Math.random() < 0.5 ? -1 : 1;
                  if (at(x + s, y + 1) === T.V) { g[i] = T.V; set(x + s, y + 1, c); }
                  else if (at(x + s, y) === T.V) { g[i] = T.V; set(x + s, y, c); }
                  else if (at(x - s, y) === T.V) { g[i] = T.V; set(x - s, y, c); }
                }
              } else if (c === T.G) {
                if (Math.random() < 0.008) { g[i] = T.V; continue; }
                const s = rint(3) - 1;
                if (at(x + s, y - 1) === T.V) { g[i] = T.V; set(x + s, y - 1, T.G); }
                else if (at(x + s, y) === T.V) { g[i] = T.V; set(x + s, y, T.G); }
              } else if (c === T.A) {
                // plante : boit l’eau, grimpe
                if (Math.random() < 0.12) {
                  let water = null;
                  for (const [ox, oy] of [[0, 1], [1, 0], [-1, 0], [1, 1], [-1, 1]]) if (at(x + ox, y + oy) === T.E) water = [x + ox, y + oy];
                  if (water) {
                    set(water[0], water[1], T.V);
                    const dir = [[0, -1], [0, -1], [1, -1], [-1, -1]][rint(4)];
                    if (at(x + dir[0], y + dir[1]) === T.V) set(x + dir[0], y + dir[1], T.A);
                  }
                }
              }
            }
          }
          if (sizzle > 0) { env.audio.noise(0.5, 0.12 * sizzle, 3200, 0.8, 'bandpass', 400); sizzle = 0; }
          const d = b.d;
          for (let i = 0; i < N; i++) {
            const c = g[i], o = i * 4, n = tint[i];
            let r, gg, bl;
            switch (c) {
              case T.S: r = 216 + n * 30; gg = 172 + n * 30; bl = 92 + n * 30; break;
              case T.E: r = 26 + n * 20; gg = 96 + n * 40; bl = 200 + n * 40; break;
              case T.M: r = 62 + n * 22; gg = 58 + n * 20; bl = 76 + n * 24; break;
              case T.L: { const f = 0.6 + Math.abs(Math.sin(env.t * 3 + n * 9)) * 0.4; r = 255 * f; gg = (90 + n * 70) * f; bl = 30 * f; break; }
              case T.P: r = 118 + n * 26; gg = 108 + n * 22; bl = 116 + n * 22; break;
              case T.G: r = 190 + n * 40; gg = 200 + n * 40; bl = 215 + n * 40; break;
              case T.A: r = 60 + n * 40; gg = 200 + n * 55; bl = 90 + n * 40; break;
              default: r = 8 + n * 6; gg = 6 + n * 6; bl = 14 + n * 8;
            }
            d[o] = r; d[o + 1] = gg; d[o + 2] = bl;
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
        },
        paint(p) {
          const gx = p.x / env.w * GW, gy = p.y / env.h * GH;
          const map = { sable: T.S, eau: T.E, lave: T.L, mur: T.M, graine: T.A, gomme: T.V };
          const v = map[env.tool] !== undefined ? map[env.tool] : T.S;
          const r = env.tool === 'graine' ? 1 : 4;
          for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
            if (x * x + y * y > r * r) continue;
            if (v !== T.V && v !== T.M && v !== T.A && Math.random() < 0.25) continue;
            set((gx + x) | 0, (gy + y) | 0, v);
          }
        },
        down(p) { this.paint(p); if (env.tool === 'lave') env.audio.note(60, 1.4, 'sawtooth', 0.07); },
        move(p) { if (p.down) this.paint(p); },
      };
    },
  });

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
