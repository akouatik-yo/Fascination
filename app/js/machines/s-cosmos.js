/* Fascination — cosmos & sons */
(function boot() {
  if(!window.FK) return setTimeout(boot,12);
  const { TAU, clamp, rnd, rint, lerp, buf, layer, blit, lut, diffuse, fade, hsv, scale } = window.FK;
  const S = window.FASC;

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

})();
