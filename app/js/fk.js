/* Fascination — petite boîte à outils partagée par toutes les expériences */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a = 1, b = 0) => b + Math.random() * (a - b);
  const rint = (n) => (Math.random() * n) | 0;
  const lerp = (a, b, t) => a + (b - a) * t;

  function buf(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = 255;
    return { c, g, img, d, w, h, flush() { g.putImageData(img, 0, 0); } };
  }

  function layer(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
    return { c, g: c.getContext('2d'), w: c.width, h: c.height };
  }

  function blit(ctx, b, W, H) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(b.c, 0, 0, W, H);
  }

  // stops: [pos, r, g, b]
  function lut(stops) {
    const L = new Uint8Array(768);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let a = stops[0], b = stops[stops.length - 1];
      for (let s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
      }
      const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      L[i * 3] = lerp(a[1], b[1], f);
      L[i * 3 + 1] = lerp(a[2], b[2], f);
      L[i * 3 + 2] = lerp(a[3], b[3], f);
    }
    return L;
  }

  function diffuse(a, tmp, w, h, k) {
    for (let y = 0; y < h; y++) {
      const o = y * w;
      for (let x = 0; x < w; x++) {
        const i = o + x;
        const l = a[x > 0 ? i - 1 : i], r = a[x < w - 1 ? i + 1 : i];
        tmp[i] = a[i] + (l + r - 2 * a[i]) * k;
      }
    }
    for (let y = 0; y < h; y++) {
      const o = y * w;
      for (let x = 0; x < w; x++) {
        const i = o + x;
        const u = tmp[y > 0 ? i - w : i], d = tmp[y < h - 1 ? i + w : i];
        a[i] = tmp[i] + (u + d - 2 * tmp[i]) * k;
      }
    }
  }

  function fade(ctx, W, H, alpha, color) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color || '#06050c';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  function hsv(h, s, v) {
    h = ((h % 1) + 1) % 1;
    const i = Math.floor(h * 6), f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q;
    }
    return [r * 255, g * 255, b * 255];
  }

  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
  const scale = (i, root) => (root || 110) * Math.pow(2, PENTA[((i % PENTA.length) + PENTA.length) % PENTA.length] / 12);

  class SoundKit {
    constructor() { this.ctx = null; this.on = false; this.analyser = null; this._noise = null; }
    ensure() {
      if (!this.ctx && !this.on) return null;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        const c = new AC();
        this.ctx = c;
        this.master = c.createGain();
        this.master.gain.value = 0.0001;
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -18; comp.ratio.value = 6;
        this.analyser = c.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.78;
        this.master.connect(comp); comp.connect(this.analyser); this.analyser.connect(c.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.master.gain.setTargetAtTime(this.on ? 0.55 : 0.0001, this.ctx.currentTime, 0.08);
      return this.ctx;
    }
    setOn(v) {
      this.on = !!v;
      if (v) this.ensure();
      else if (this.ctx) this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
    }
    get live() { return this.on && this.ctx; }
    noiseBuf() {
      const c = this.ctx;
      if (!this._noise) {
        const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this._noise = b;
      }
      return this._noise;
    }
    note(f, dur = 0.5, type = 'sine', g = 0.18, glide) {
      if (!this.on) return;
      const c = this.ensure(); if (!c) return;
      const o = c.createOscillator(), v = c.createGain(), t = c.currentTime;
      o.type = type; o.frequency.value = f;
      if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t + dur);
      v.gain.value = 0.0001;
      v.gain.linearRampToValueAtTime(g, t + Math.min(0.04, dur * 0.2));
      v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(v); v.connect(this.master);
      o.start(t); o.stop(t + dur + 0.05);
    }
    pluck(f, dur = 1.4, g = 0.2) {
      if (!this.on) return;
      const c = this.ensure(); if (!c) return;
      const t = c.currentTime;
      [1, 2.01, 3.02].forEach((m, i) => {
        const o = c.createOscillator(), v = c.createGain();
        o.type = i === 0 ? 'triangle' : 'sine';
        o.frequency.value = f * m;
        v.gain.value = 0.0001;
        v.gain.linearRampToValueAtTime(g / (i + 1.4), t + 0.006);
        v.gain.exponentialRampToValueAtTime(0.0001, t + dur / (i + 1));
        o.connect(v); v.connect(this.master);
        o.start(t); o.stop(t + dur + 0.05);
      });
    }
    noise(dur = 0.6, g = 0.25, f = 900, q = 1, type = 'lowpass', sweepTo) {
      if (!this.on) return;
      const c = this.ensure(); if (!c) return;
      const s = c.createBufferSource(); s.buffer = this.noiseBuf();
      const bq = c.createBiquadFilter(); bq.type = type; bq.frequency.value = f; bq.Q.value = q;
      const v = c.createGain(); const t = c.currentTime;
      v.gain.value = 0.0001;
      v.gain.linearRampToValueAtTime(g, t + 0.015);
      v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (sweepTo) bq.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + dur);
      s.connect(bq); bq.connect(v); v.connect(this.master);
      s.start(t); s.stop(t + dur + 0.05);
    }
    drone(f, type = 'sine', g = 0.1) {
      const c = this.ensure();
      if (!c) return { set() {}, gain() {}, cut() {}, stop() {} };
      const o = c.createOscillator(), v = c.createGain(), lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1800;
      o.type = type; o.frequency.value = f;
      v.gain.value = 0.0001;
      v.gain.setTargetAtTime(g, c.currentTime, 0.4);
      o.connect(lp); lp.connect(v); v.connect(this.master);
      o.start();
      return {
        set: (nf) => o.frequency.setTargetAtTime(Math.max(20, nf), c.currentTime, 0.06),
        gain: (ng) => v.gain.setTargetAtTime(ng, c.currentTime, 0.15),
        cut: (nc) => lp.frequency.setTargetAtTime(nc, c.currentTime, 0.1),
        stop: () => {
          v.gain.setTargetAtTime(0.0001, c.currentTime, 0.2);
          try { o.stop(c.currentTime + 1.2); } catch (e) {}
        },
      };
    }
  }

  window.FK = { TAU, clamp, rnd, rint, lerp, buf, layer, blit, lut, diffuse, fade, hsv, scale, SoundKit };
  window.FASC = window.FASC || [];
})();
