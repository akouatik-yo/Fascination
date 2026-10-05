/* Fascination — cosmos & sons */
(function boot() {
  if(!window.FK) return setTimeout(boot,12);
  const { TAU, clamp, rnd, rint, lerp, buf, layer, blit, lut, diffuse, fade, hsv, scale } = window.FK;
  const S = window.FASC;

  /* ─────────── LE TUNNEL ─────────── */
  S.push({
    id: 'tunnel', name: 'Le Tunnel', cat: 'Cosmos', glyph: '◉',
    blurb: 'Descente hypnotique dans un couloir infini',
    hint: 'Déplacez le curseur pour piloter · changez la texture avec les outils.',
    tools: [{ id: 'damier', label: 'damier' }, { id: 'vortex', label: 'vortex' }, { id: 'plasma', label: 'plasma' }],
    make(env) {
      const ctx = env.ctx;
      const RW = 260, RH = Math.max(100, Math.round(RW * env.h / env.w));
      const b = buf(RW, RH);
      let px = 0.5, py = 0.5, tx = 0.5, ty = 0.5, speed = 1;
      return {
        frame(t, dt) {
          px += (tx - px) * 0.05; py += (ty - py) * 0.05;
          const cx = RW * px, cy = RH * py;
          const mode = env.tool || 'damier';
          const d = b.d;
          for (let y = 0; y < RH; y++) {
            const dy = y - cy;
            for (let x = 0; x < RW; x++) {
              const dx = x - cx;
              const r = Math.sqrt(dx * dx + dy * dy) + 0.001;
              const a = Math.atan2(dy, dx);
              const depth = 34 / r;
              let v;
              if (mode === 'damier') {
                const u = (a / TAU * 12 + 100) % 1, w = (depth * 3 + t * 1.4) % 1;
                v = ((u < 0.5) !== (w < 0.5)) ? 1 : 0.16;
                v *= clamp(1.15 - depth * 0.18, 0, 1);
              } else if (mode === 'vortex') {
                v = 0.5 + 0.5 * Math.sin(a * 5 + depth * 9 + t * 2.4 + Math.sin(depth * 3 - t) * 2);
                v = Math.pow(v, 2.1);
              } else {
                v = 0.5 + 0.5 * Math.sin(depth * 6 + t * 1.7) * Math.sin(a * 3 - t * 0.9) * Math.cos(depth * 2.5 + a * 2 + t);
                v = Math.pow(clamp(v, 0, 1), 1.5);
              }
              const c = hsv(depth * 0.16 + t * 0.06 + a * 0.05, 0.72, clamp(v * clamp(r / 26, 0, 1), 0, 1));
              const o = (y * RW + x) * 4;
              d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
            }
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(cx / RW * env.w, cy / RH * env.h, 0, cx / RW * env.w, cy / RH * env.h, env.w * 0.1);
          g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, env.w, env.h);
          ctx.globalCompositeOperation = 'source-over';
        },
        move(p) { tx = clamp(p.x / env.w, 0.12, 0.88); ty = clamp(p.y / env.h, 0.12, 0.88); },
        down(p) { this.move(p); env.audio.note(rnd(120, 60), 1.6, 'sine', 0.09, rnd(700, 300)); },
      };
    },
  });

  /* ─────────── LA LAMPE À LAVE ─────────── */
  S.push({
    id: 'lave', name: 'La Lampe à Lave', cat: 'Cosmos', glyph: '⬮',
    blurb: 'Métaballes molles qui montent et retombent',
    hint: 'Attrapez une bulle et déplacez-la · cliquez dans le vide pour en verser une autre.',
    tools: [{ id: 'attraper', label: 'attraper' }, { id: 'chauffer', label: 'chauffer' }],
    make(env) {
      const ctx = env.ctx;
      const RW = 190, RH = Math.max(80, Math.round(RW * env.h / env.w));
      const b = buf(RW, RH);
      const B = [];
      const add = (x, y, r) => B.push({ x, y, r: r || rnd(11, 6), vx: rnd(0.2, -0.2), vy: 0, T: rnd(1), ph: rnd(TAU), sp: rnd(0.42, 0.16), amp: rnd(0.42, 0.24), base: rnd(0.72, 0.28) });
      for (let i = 0; i < 14; i++) add(rnd(RW * 0.85, RW * 0.15), rnd(RH * 0.85, RH * 0.15));
      let drag = null, heat = 0.5;
      return {
        frame(t, dt) {
          for (const o of B) {
            if (o === drag) continue;
            o.ph += dt * o.sp * (0.5 + heat);
            const target = RH * (o.base + Math.sin(o.ph) * o.amp * 0.5);
            o.y += (target - o.y) * 0.02;
            o.x += o.vx * (0.4 + heat * 0.5);
            o.vx = clamp(o.vx + rnd(0.02, -0.02), -0.5, 0.5);
            for (const q of B) {
              if (q === o) continue;
              const dx = o.x - q.x, dy = o.y - q.y, d = Math.hypot(dx, dy) + 0.001;
              const mn = (o.r + q.r) * 0.72;
              if (d < mn) { o.x += dx / d * (mn - d) * 0.06; o.y += dy / d * (mn - d) * 0.05; }
            }
            if (o.x < o.r * 0.5) { o.x = o.r * 0.5; o.vx = Math.abs(o.vx); }
            if (o.x > RW - o.r * 0.5) { o.x = RW - o.r * 0.5; o.vx = -Math.abs(o.vx); }
            o.y = clamp(o.y, o.r * 0.4, RH - o.r * 0.4);
          }
          const d = b.d;
          for (let y = 0; y < RH; y++) {
            for (let x = 0; x < RW; x++) {
              let f = 0;
              for (const o of B) {
                const dx = x - o.x, dy = (y - o.y) * 1.05;
                const q = (o.r * o.r) / (dx * dx + dy * dy + 1);
                f += q * q;
              }
              const s = clamp((f - 0.9) * 3.2, 0, 1);
              const edge = clamp(1 - Math.abs(f - 0.9) * 4.5, 0, 1);
              const base = hsv(0.79 + y / RH * 0.08 + Math.sin(t * 0.05) * 0.02, 0.85, 0.06 + (1 - y / RH) * 0.05);
              const body = hsv(0.955 + s * 0.075 + Math.sin(t * 0.07) * 0.015, 0.9 - s * 0.1, 0.32 + s * 0.72);
              const o4 = (y * RW + x) * 4;
              d[o4] = lerp(base[0], body[0], s) + edge * 60;
              d[o4 + 1] = lerp(base[1], body[1], s) + edge * 30;
              d[o4 + 2] = lerp(base[2], body[2], s) + edge * 40;
            }
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
        },
        down(p) {
          const gx = p.x / env.w * RW, gy = p.y / env.h * RH;
          if (env.tool === 'chauffer') { heat = clamp(1 - gy / RH, 0.1, 1.6); return; }
          let best = null, bd = 1e9;
          for (const o of B) { const d = Math.hypot(o.x - gx, o.y - gy); if (d < bd) { bd = d; best = o; } }
          if (best && bd < best.r * 1.1) drag = best;
          else if (B.length < 20) { add(gx, gy, rnd(11, 6)); env.audio.note(rnd(150, 70), 1.2, 'sine', 0.09); }
        },
        move(p) {
          if (!p.down) return;
          const gx = p.x / env.w * RW, gy = p.y / env.h * RH;
          if (env.tool === 'chauffer') { heat = clamp(1 - gy / RH, 0.1, 1.6); return; }
          if (drag) { drag.x = gx; drag.y = gy; drag.base = clamp(gy / RH, 0.12, 0.88); }
        },
        up() { drag = null; },
      };
    },
  });

  /* ─────────── LES BULLES ─────────── */
  S.push({
    id: 'bulles', name: 'Les Bulles', cat: 'Cosmos', glyph: '○',
    blurb: 'Interférences en film mince : l’arc-en-ciel du savon',
    hint: 'Cliquez pour souffler une bulle · glissez dessus pour l’étirer · elle finit par éclater.',
    tools: [{ id: 'souffler', label: 'souffler' }, { id: 'eclater', label: 'éclater' }],
    make(env) {
      const ctx = env.ctx;
      const RW = 210, RH = Math.max(90, Math.round(RW * env.h / env.w));
      const b = buf(RW, RH);
      const B = [];
      const add = (x, y, r) => B.push({ x, y, r, vx: rnd(0.16, -0.16), vy: -rnd(0.2, 0.04), ph: rnd(TAU), th: rnd(1.4, 0.7), life: rnd(28, 14) });
      for (let i = 0; i < 5; i++) add(rnd(RW * 0.8, RW * 0.2), rnd(RH * 0.8, RH * 0.2), rnd(34, 16));
      return {
        frame(t, dt) {
          const d = b.d;
          for (let i = 0; i < RW * RH; i++) {
            const o = i * 4;
            const y = (i / RW) | 0;
            d[o] = 6 + y * 0.03; d[o + 1] = 6; d[o + 2] = 14 + (RH - y) * 0.04;
          }
          for (let i = B.length - 1; i >= 0; i--) {
            const o = B[i];
            o.life -= dt;
            o.ph += dt * 0.7;
            o.x += o.vx; o.y += o.vy;
            o.vy += (Math.sin(t * 0.7 + o.ph) * 0.006) - 0.0025;
            o.vx += Math.sin(t * 0.51 + o.ph * 2) * 0.008;
            o.vx *= 0.995; o.vy *= 0.996;
            if (o.x < -o.r) o.x = RW + o.r; if (o.x > RW + o.r) o.x = -o.r;
            if (o.y < -o.r) { o.y = RH + o.r; }
            if (o.y > RH + o.r) o.y = -o.r;
            if (o.life <= 0) { B.splice(i, 1); env.audio.noise(0.18, 0.1, 2600, 2, 'bandpass', 900); continue; }
            const wob = 1 + Math.sin(o.ph * 2.2) * 0.05;
            const R = o.r * wob;
            const x0 = Math.max(0, (o.x - R) | 0), x1 = Math.min(RW - 1, (o.x + R) | 0);
            const y0 = Math.max(0, (o.y - R) | 0), y1 = Math.min(RH - 1, (o.y + R) | 0);
            for (let y = y0; y <= y1; y++) {
              for (let x = x0; x <= x1; x++) {
                const dx = (x - o.x) / R, dy = (y - o.y) / R;
                const rr = dx * dx + dy * dy;
                if (rr > 1) continue;
                const nz = Math.sqrt(1 - rr);
                const thick = o.th * (1 / (nz + 0.22)) * (1 + Math.sin(o.ph * 3 + dy * 5) * 0.12) + dy * 0.35;
                const rim = Math.pow(1 - nz, 2.2);
                const r1 = 0.5 + 0.5 * Math.cos(thick * 21.0);
                const g1 = 0.5 + 0.5 * Math.cos(thick * 24.2 + 1.1);
                const b1 = 0.5 + 0.5 * Math.cos(thick * 27.7 + 2.2);
                const a = clamp(rim * 1.5 + 0.16, 0, 1) * clamp(o.life / 4, 0, 1);
                const spec = Math.pow(clamp(-dx * 0.6 - dy * 0.7 + nz * 0.4, 0, 1), 12) * 1.6;
                const o4 = (y * RW + x) * 4;
                d[o4] = clamp(d[o4] + (r1 * 255 * a) + spec * 220, 0, 255);
                d[o4 + 1] = clamp(d[o4 + 1] + (g1 * 255 * a) + spec * 220, 0, 255);
                d[o4 + 2] = clamp(d[o4 + 2] + (b1 * 255 * a) + spec * 220, 0, 255);
              }
            }
          }
          if (B.length < 3) add(rnd(RW * 0.8, RW * 0.2), RH * 0.9, rnd(32, 16));
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
        },
        down(p) {
          const gx = p.x / env.w * RW, gy = p.y / env.h * RH;
          if (env.tool === 'eclater') {
            for (let i = B.length - 1; i >= 0; i--) {
              if (Math.hypot(B[i].x - gx, B[i].y - gy) < B[i].r) {
                B.splice(i, 1);
                env.audio.noise(0.22, 0.16, 3000, 2.5, 'bandpass', 700);
                break;
              }
            }
          } else if (B.length < 14) {
            add(gx, gy, rnd(38, 15));
            env.audio.note(rnd(900, 500), 0.3, 'sine', 0.05, rnd(1600, 1100));
          }
        },
        move(p) {
          if (!p.down || env.tool === 'eclater') return;
          const gx = p.x / env.w * RW, gy = p.y / env.h * RH;
          for (const o of B) {
            const d = Math.hypot(o.x - gx, o.y - gy);
            if (d < o.r * 1.4) { o.vx += p.dx * 0.03; o.vy += p.dy * 0.03; o.th = clamp(o.th + p.dx * 0.004, 0.4, 2.4); }
          }
        },
      };
    },
  });

  /* ─────────── LE VISUALISEUR ─────────── */
  S.push({
    id: 'viz', name: 'Le Visualiseur', cat: 'Sons', glyph: '▤',
    blurb: 'Une musique qui s’écrit toute seule, et son spectre',
    hint: 'Activez le son. Glissez : X ouvre le filtre, Y accélère la pulsation.',
    tools: [{ id: 'barres', label: 'barres' }, { id: 'oscillo', label: 'oscillo' }, { id: 'polaire', label: 'polaire' }],
    make(env) {
      const ctx = env.ctx;
      const A = env.audio;
      const fft = new Uint8Array(1024), wav = new Uint8Array(1024);
      let acc = 0, step = 0, bpm = 92, cut = 1400, root = 110;
      const pads = [A.drone(root, 'sine', 0.05), A.drone(root * 1.5, 'triangle', 0.035), A.drone(root * 2.51, 'sine', 0.025)];
      const peaks = new Float32Array(96);
      let rot = 0;
      return {
        frame(t, dt) {
          acc += dt;
          const spb = 60 / bpm / 2;
          while (acc > spb) {
            acc -= spb;
            const s = step % 16;
            if (s % 4 === 0) A.noise(0.18, 0.4, 150, 1, 'lowpass', 50);
            if (s % 8 === 4) A.noise(0.09, 0.14, 6000, 1.4, 'highpass');
            if (Math.random() < 0.82) A.note(scale(((step * 5) % 9) + (s % 4 === 0 ? 0 : 5), root * 2), 0.3, 'sawtooth', 0.045);
            if (s === 0) {
              const k = rint(5);
              pads.forEach((p, i) => p && p.set(scale(k + i * 2, root)));
            }
            step++;
          }
          pads.forEach((p) => p && p.cut && p.cut(cut));
          if (A.analyser && A.live) { A.analyser.getByteFrequencyData(fft); A.analyser.getByteTimeDomainData(wav); }
          else {
            for (let i = 0; i < 1024; i++) {
              fft[i] = clamp((Math.sin(t * 1.4 + i * 0.05) * 0.5 + 0.5) * 170 * Math.exp(-i / 200) + rnd(20), 0, 255);
              wav[i] = 128 + Math.sin(i * 0.08 + t * 3) * 40 * Math.sin(t * 0.7);
            }
          }
          const mode = env.tool || 'barres';
          fade(ctx, env.w, env.h, mode === 'oscillo' ? 0.13 : 0.5, '#05040c');
          ctx.globalCompositeOperation = 'lighter';
          const cx = env.w / 2, cy = env.h / 2;
          if (mode === 'barres') {
            const n = 96, bw = env.w / n;
            for (let i = 0; i < n; i++) {
              const v = fft[(i * i / n * 2.2 + i) | 0] / 255;
              peaks[i] = Math.max(peaks[i] * 0.965, v);
              const h = Math.pow(v, 1.25) * env.h * 0.44;
              const c = hsv(0.62 - v * 0.42 + t * 0.03, 0.8, 1);
              const col = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},`;
              ctx.fillStyle = col + '.75)';
              ctx.fillRect(i * bw + 1, cy - h, bw - 2, h);
              ctx.fillStyle = col + '.3)';
              ctx.fillRect(i * bw + 1, cy, bw - 2, h * 0.72);
              ctx.fillStyle = 'rgba(255,255,255,.7)';
              ctx.fillRect(i * bw + 1, cy - peaks[i] * env.h * 0.44 - 3, bw - 2, 2);
            }
          } else if (mode === 'oscillo') {
            for (let k = 0; k < 3; k++) {
              ctx.beginPath();
              for (let i = 0; i < 1024; i++) {
                const x = i / 1023 * env.w;
                const y = cy + (wav[i] - 128) / 128 * env.h * 0.34 * (1 + k * 0.22) + Math.sin(t * 1.3 + k) * 12;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
              }
              const c = hsv(0.5 + k * 0.14 + t * 0.05, 0.75, 1);
              ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},.5)`;
              ctx.lineWidth = 2.4 - k * 0.6;
              ctx.stroke();
            }
          } else {
            rot += dt * 0.35;
            const n = 180, R = Math.min(env.w, env.h) * 0.17;
            for (let sym = 0; sym < 3; sym++) {
              ctx.beginPath();
              for (let i = 0; i <= n; i++) {
                const a = i / n * TAU + rot + sym * 2.09;
                const v = fft[(i % 90) * 3] / 255;
                const r = R + Math.pow(v, 1.3) * Math.min(env.w, env.h) * 0.3;
                const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
              }
              ctx.closePath();
              const c = hsv(0.75 + sym * 0.12 + t * 0.04, 0.7, 1);
              ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},.45)`;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(235,235,255,.4)';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(A.live ? `${bpm | 0} bpm · filtre ${cut | 0} Hz` : 'activez le son ▸ en haut à droite', 16, env.h - 16);
        },
        move(p) {
          if (!p.down) return;
          cut = lerp(240, 6000, clamp(p.x / env.w, 0, 1));
          bpm = lerp(64, 148, clamp(1 - p.y / env.h, 0, 1));
        },
        down(p) { this.move({ ...p, down: true }); },
        dispose() { pads.forEach((p) => p && p.stop()); },
      };
    },
  });

  /* ─────────── LA HARPE ─────────── */
  S.push({
    id: 'harpe', name: 'La Harpe', cat: 'Sons', glyph: '≡',
    blurb: 'Des cordes de lumière à pincer',
    hint: 'Traversez les cordes pour les pincer. Le vent s’en charge si vous attendez.',
    tools: [{ id: 'pincer', label: 'pincer' }, { id: 'archet', label: 'archet' }],
    make(env) {
      const ctx = env.ctx;
      const n = 13;
      const str = [];
      for (let i = 0; i < n; i++) str.push({ x: (i + 1) / (n + 1) * env.w, a: 0, ph: rnd(TAU), f: scale(i, 165), hue: i / n });
      let lastX = null, lastY = null, breeze = rnd(4, 2);
      const pluck = (s, amp) => {
        s.a = clamp(s.a + amp, 0, 34); s.ph = 0;
        env.audio.pluck(s.f, 2.2, clamp(amp / 34 * 0.22, 0.02, 0.22));
        if (navigator.vibrate) navigator.vibrate(6);
      };
      return {
        frame(t, dt) {
          breeze -= dt;
          if (breeze <= 0) { breeze = rnd(7, 2.5); pluck(str[rint(n)], rnd(22, 8)); }
          const g = ctx.createLinearGradient(0, 0, 0, env.h);
          g.addColorStop(0, '#08060f'); g.addColorStop(1, '#0d0716');
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = g; ctx.fillRect(0, 0, env.w, env.h);
          ctx.globalCompositeOperation = 'lighter';
          for (const s of str) {
            s.ph += dt * (s.f * 0.06);
            s.a *= Math.pow(0.55, dt);
            const c = hsv(0.55 + s.hue * 0.42, 0.6, 1);
            const amp = s.a;
            for (let pass = 0; pass < 2; pass++) {
              ctx.beginPath();
              for (let y = 0; y <= env.h; y += 6) {
                const f = y / env.h;
                const env2 = Math.sin(f * Math.PI);
                const x = s.x + Math.sin(s.ph + f * Math.PI) * amp * env2 * (pass ? 0.5 : 1);
                y ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
              }
              ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${pass ? 0.1 + amp * 0.012 : 0.5 + amp * 0.012})`;
              ctx.lineWidth = pass ? 9 + amp * 0.5 : 1.6;
              ctx.stroke();
            }
            if (amp > 0.6) {
              const y = env.h * 0.5, x = s.x + Math.sin(s.ph + 0.5 * Math.PI) * amp;
              const rg = ctx.createRadialGradient(x, y, 0, x, y, 40 + amp);
              rg.addColorStop(0, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(amp * 0.02, 0, 0.3)})`);
              rg.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, 40 + amp, 0, TAU); ctx.fill();
            }
          }
          ctx.globalCompositeOperation = 'source-over';
        },
        down(p) { lastX = p.x; lastY = p.y; },
        move(p) {
          if (!p.down) { lastX = p.x; lastY = p.y; return; }
          const x0 = lastX === null ? p.x : lastX;
          for (const s of str) {
            if ((x0 - s.x) * (p.x - s.x) <= 0 && x0 !== p.x) {
              pluck(s, clamp(Math.abs(p.dx) * 2.2 + 8, 8, 34));
            } else if (env.tool === 'archet' && Math.abs(p.x - s.x) < 26 && Math.abs(p.dy) > 1.5 && Math.random() < 0.2) {
              pluck(s, clamp(Math.abs(p.dy), 4, 18));
            }
          }
          lastX = p.x; lastY = p.y;
        },
        up() { lastX = null; },
      };
    },
  });
})();
