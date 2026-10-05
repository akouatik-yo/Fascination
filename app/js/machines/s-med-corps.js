/* Fascination — Abysses · anatomie, nage et rendu des méduses */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
  const { TAU, clamp, rnd } = window.FK;
  const TILT = 0.36, ST = Math.sin(TILT), CT = Math.cos(TILT), HALF = Math.PI / 2;

  function hslRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  const SPR = {};
  function sprite(rgb) {
    const key = rgb.join(',');
    if (SPR[key]) return SPR[key];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${key},1)`); g.addColorStop(0.22, `rgba(${key},.42)`);
    g.addColorStop(0.55, `rgba(${key},.1)`); g.addColorStop(1, `rgba(${key},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (SPR[key] = c);
  }
  const hsla = (h, s, l, a) => `hsla(${h},${s}%,${l}%,${a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)})`;

  const SP = [
    { key: 'aurelia', nom: 'Aurelia aurita', fr: 'méduse lune', w: 3, R: [40, 66], h: 0.33, T: [2.8, 3.8], thrust: 1.3,
      hue: 200, sat: 45, lum: 80, alpha: 0.28, canals: 32, branch: true, gonads: 308,
      arms: 4, armLen: 1.15, armW: 0.15, frill: 0.7, armHue: 285, tent: 46, tentLen: 0.55, tentW: 0.5, tentHue: 195, tentSeg: 7, flash: [140, 205, 255] },
    { key: 'chrysaora', nom: 'Chrysaora fuscescens', fr: 'ortie de mer', w: 2, R: [32, 54], h: 0.62, T: [2.0, 2.7], thrust: 1.45,
      hue: 26, sat: 85, lum: 62, alpha: 0.34, stripes: 16, stripeHue: 10,
      arms: 4, armLen: 4.6, armW: 0.12, frill: 0.7, armHue: 12, tent: 18, tentLen: 5.6, tentW: 0.85, tentHue: 20, tentSeg: 22, flash: [255, 175, 120] },
    { key: 'atolla', nom: 'Atolla wyvillei', fr: 'méduse couronne', w: 2, R: [28, 46], h: 0.4, T: [1.5, 2.1], thrust: 1.5,
      hue: 352, sat: 72, lum: 40, alpha: 0.5, crown: 22, dots: 22, dotCol: [70, 150, 255],
      arms: 0, tent: 22, tentLen: 1.3, tentW: 0.7, tentHue: 350, tentSeg: 11, longOne: true, flash: [70, 150, 255] },
    { key: 'aequorea', nom: 'Aequorea victoria', fr: 'méduse cristal', w: 2, R: [34, 58], h: 0.26, T: [3.2, 4.4], thrust: 1.15,
      hue: 185, sat: 30, lum: 88, alpha: 0.17, canals: 80, dots: 52, dotCol: [110, 255, 160], mouth: true,
      arms: 0, tent: 60, tentLen: 1.5, tentW: 0.38, tentHue: 160, tentSeg: 12, flash: [110, 255, 160] },
    { key: 'cteno', nom: 'Pleurobrachia pileus', fr: 'groseille de mer · cténophore', w: 2, R: [17, 28], cteno: true, T: [7, 10],
      hue: 200, sat: 30, lum: 85, alpha: 0.16, tent: 2, tentLen: 8, tentW: 0.7, tentHue: 28, tentSeg: 26, flash: [255, 255, 255] },
  ];
  SP.forEach((s) => { s.rgb = hslRgb(s.hue, s.sat, Math.min(75, s.lum)); s.armRgb = s.arms ? hslRgb(s.armHue, 70, 65) : s.rgb; });

  const contr = (p) => (p < 0.3 ? Math.sin((p / 0.3) * HALF) : 0.5 + 0.5 * Math.cos(((p - 0.3) / 0.7) * Math.PI));

  function chainNew(n, len, phi, x, y) {
    const P = new Float32Array(n * 2), Q = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { P[2 * i] = Q[2 * i] = x + rnd(1, -1); P[2 * i + 1] = Q[2 * i + 1] = y + i * 3; }
    return { n, len, phi, P, Q, ph: rnd(TAU) };
  }

  function create(sp, x, y, z, o) {
    o = o || {};
    const j = {
      sp, x, y, z, k: o.k || 1, vx: 0, vy: 0, a: o.a != null ? o.a : rnd(0.6, -0.6), w: 0,
      ph: rnd(1), T: rnd(sp.T[1], sp.T[0]), R0: rnd(sp.R[1], sp.R[0]), c: 0, grow: o.grow || 1,
      alarm: 0, at: 9, escape: 0, ex: 0, ey: 0, label: 0, spin: rnd(TAU), spinV: rnd(0.14, -0.14),
      seed: rnd(100), tx: x, ty: y, tTime: rnd(8, 2), pulse: false, ca: 1, sa: 0, S: 1, R: 1, H: 1, curl: 0,
    };
    j.tents = [];
    for (let i = 0; i < sp.tent; i++) {
      const long = sp.longOne && i === 0;
      const phi = sp.cteno ? i * Math.PI : (i / sp.tent) * TAU + rnd(0.08, -0.08);
      j.tents.push(chainNew(long ? sp.tentSeg * 3 : sp.tentSeg, sp.tentLen * (long ? 5 : rnd(1.15, 0.8)), phi, x, y));
    }
    j.arms = [];
    for (let i = 0; i < (sp.arms || 0); i++) j.arms.push(chainNew(sp.armLen > 2 ? 28 : 10, sp.armLen * rnd(1.1, 0.85), Math.PI / 4 + i * HALF, x, y));
    geom(j);
    return j;
  }

  function geom(j) {
    const S = j.z * j.k * j.grow, c = j.c;
    j.S = S;
    j.R = j.R0 * S * (1 - 0.27 * c);
    j.H = j.R0 * S * ((j.sp.h || 0.5) + 0.22 * c);
    j.curl = 0.05 + 0.17 * c;
  }

  const OUT = { x: 0, y: 0 };
  function dome(j, u, phi, sr, sh) {
    const th = u * HALF, u4 = u * u * u * u;
    const r = j.R * (sr || 1) * Math.sin(th) * (1 - j.curl * u4);
    const Y = -j.H * (sh || 1) * Math.cos(th) + j.H * j.curl * 0.7 * u4;
    OUT.x = r * Math.cos(phi);
    OUT.y = Y * CT + r * Math.sin(phi) * ST;
    return OUT;
  }
  let WX = 0, WY = 0;
  function toW(j, lx, ly) { WX = j.x + lx * j.ca - ly * j.sa; WY = j.y + lx * j.sa + ly * j.ca; }

  function stepChain(ch, ax, ay, seg, dt, E, wob, sink) {
    const P = ch.P, Q = ch.Q, n = ch.n, d = Math.exp(-dt * 3.6), kf = 1 - d;
    P[0] = Q[0] = ax; P[1] = Q[1] = ay;
    ch.ph += dt * 1.4;
    for (let i = 1; i < n; i++) {
      const ix = 2 * i, x = P[ix], y = P[ix + 1], f = i / n;
      E.flow(x, y);
      const wv = Math.sin(ch.ph + f * 5.5) * wob * f;
      P[ix] = x + (x - Q[ix]) * d + (E.fu + wv) * dt * kf;
      P[ix + 1] = y + (y - Q[ix + 1]) * d + (E.fv + sink) * dt * kf;
      Q[ix] = x; Q[ix + 1] = y;
    }
    for (let i = 1; i < n; i++) {
      const ix = 2 * i, px = P[ix - 2], py = P[ix - 1];
      const dx = P[ix] - px, dy = P[ix + 1] - py, l = Math.hypot(dx, dy) || 1e-3, k = seg / l;
      P[ix] = px + dx * k; P[ix + 1] = py + dy * k;
    }
  }
  function shift(j, sx, sy) {
    j.x += sx; j.y += sy; j.tx += sx; j.ty += sy;
    for (const ch of j.tents.concat(j.arms)) for (let i = 0; i < ch.n; i++) { ch.P[2 * i] += sx; ch.Q[2 * i] += sx; ch.P[2 * i + 1] += sy; ch.Q[2 * i + 1] += sy; }
  }

  function update(j, dt, E) {
    const sp = j.sp;
    if (j.grow < 1) j.grow = Math.min(1, j.grow + dt / 30);
    j.alarm = Math.max(0, j.alarm - dt * 0.26); j.at += dt;
    j.escape = Math.max(0, j.escape - dt); j.label = Math.max(0, j.label - dt);
    j.spin += j.spinV * dt;
    const prevC = j.c;
    j.pulse = false;
    if (sp.cteno) { j.ph = (j.ph + dt / j.T) % 1; j.c = 0.08 + 0.08 * Math.sin(j.ph * TAU); }
    else {
      j.ph += (dt / j.T) * (j.escape > 0 ? 2.4 : j.sinkMode ? 0.55 : 1);
      if (j.ph >= 1) { j.ph -= 1; j.pulse = true; }
      j.c = contr(j.ph);
    }
    geom(j);
    const fx = Math.sin(j.a), fy = -Math.cos(j.a), Rn = j.R0 * j.S;
    const dc = Math.max(0, j.c - prevC) / Math.max(dt, 1e-4);
    const acc = sp.cteno ? 0 : sp.thrust * Rn * dc * (j.escape > 0 ? 1.7 : 1);
    j.vx += fx * acc * dt; j.vy += fy * acc * dt;
    if (sp.cteno) {
      const tv = Rn * (j.escape > 0 ? 2.2 : 0.7);
      j.vx += (fx * tv - j.vx) * dt; j.vy += (fy * tv - j.vy) * dt;
    }
    const D = Math.exp(-dt * 1.6);
    j.vx *= D; j.vy = j.vy * D + 7 * j.S * dt;
    if (acc > 0) E.wake(j.x - fx * j.R * 0.5, j.y - fy * j.R * 0.5, -fx * acc * dt * 2.6, -fy * acc * dt * 2.6, j.R * 1.5);
    else if (sp.cteno && Math.random() < dt * 3) E.wake(j.x - fx * Rn, j.y - fy * Rn, -fx * Rn * 0.2, -fy * Rn * 0.2, Rn);

    // pilotage : cible, lumière, fuite, voisins
    j.tTime -= dt;
    if (j.tTime <= 0 || Math.hypot(j.tx - j.x, j.ty - j.y) < Rn * 2.5) {
      j.tx = rnd(E.W * 0.9, E.W * 0.1); j.ty = rnd(E.H * 0.88, E.H * 0.1); j.tTime = rnd(28, 12);
    }
    let dx = j.tx - j.x, dy = j.ty - j.y;
    const dl = Math.hypot(dx, dy) || 1;
    let ddx = dx / dl, ddy = dy / dl;
    const L = E.lure;
    if (L && L.s > 0.04 && j.escape <= 0) {
      const lx = L.x - j.x, ly = L.y - j.y, ld = Math.hypot(lx, ly) || 1;
      if (ld > Rn * 1.6 && ld < 700) { const w = L.s * 3 * (1 - ld / 700); ddx += (lx / ld) * w; ddy += (ly / ld) * w; }
    }
    if (j.escape > 0) { ddx += j.ex * 5; ddy += j.ey * 5; }
    for (const o of E.group) {
      if (o === j) continue;
      const ox = j.x - o.x, oy = j.y - o.y, od = Math.hypot(ox, oy), lim = (Rn + o.R0 * o.S) * 2.1;
      if (od < lim && od > 0.01) {
        const w = 1 - od / lim;
        ddx += (ox / od) * w * 3; ddy += (oy / od) * w * 3;
        j.vx += (ox / od) * w * Rn * 1.2 * dt; j.vy += (oy / od) * w * Rn * 1.2 * dt;
      }
    }
    let want = Math.atan2(ddx, -ddy);
    const lim = j.escape > 0 ? 1.7 : sp.cteno ? 1.3 : 0.8;
    if (Math.abs(want) > lim) want = Math.sign(want) * lim;
    j.sinkMode = !sp.cteno && j.escape <= 0 && ddy > 0.45;
    let da = want - j.a; da = Math.atan2(Math.sin(da), Math.cos(da));
    const steer = sp.cteno ? 0.5 : 0.18 + j.c * 1.5;
    j.w += da * steer * dt * (j.escape > 0 ? 4 : 1.3);
    j.w += Math.sin(E.t * 0.31 + j.seed) * 0.06 * dt;
    j.w -= Math.sin(j.a) * 0.3 * dt;
    j.w *= Math.exp(-dt * 2.4);
    j.a += j.w * dt;

    E.flow(j.x + fx * j.H * 0.8, j.y + fy * j.H * 0.8);
    j.x += (j.vx + E.fu * 0.85) * dt; j.y += (j.vy + E.fv * 0.85) * dt;
    const m = Rn * 2.5 + 40, mb = Rn * (sp.tentLen > 3 ? 4 : 1.5) + 40;
    if (j.x < -m) shift(j, E.W + 2 * m, 0); else if (j.x > E.W + m) shift(j, -(E.W + 2 * m), 0);
    if (j.y < -m - j.H) shift(j, 0, E.H + m + mb); else if (j.y > E.H + mb) shift(j, 0, -(E.H + m + mb));

    j.ca = Math.cos(j.a); j.sa = Math.sin(j.a);
    const wob = 16 * j.S, sink = 26 * j.S;
    for (const tn of j.tents) {
      if (sp.cteno) toW(j, Math.cos(tn.phi) * Rn * 0.42, Rn * 0.1);
      else { const p = dome(j, 1, tn.phi + j.spin); toW(j, p.x, p.y); }
      stepChain(tn, WX, WY, (tn.len * Rn) / tn.n, dt, E, wob, sink);
    }
    for (const ar of j.arms) {
      const ph = ar.phi + j.spin;
      toW(j, Math.cos(ph) * j.R * 0.07, j.H * j.curl * 0.5 + Math.sin(ph) * j.R * 0.07 * ST);
      stepChain(ar, WX, WY, (ar.len * Rn) / ar.n, dt, E, wob * 0.6, sink * 0.7);
    }
  }

  function hit(j, x, y) {
    toW(j, 0, -j.H * 0.45);
    return Math.hypot(x - WX, y - WY) < Math.max(j.R, j.H) * 1.15 + 8;
  }
  function touch(j, px, py) {
    j.alarm = 1; j.at = 0; j.escape = 3.6; j.label = 6;
    const dx = j.x - px, dy = j.y - py, d = Math.hypot(dx, dy) || 1;
    j.ex = dx / d; j.ey = dy / d;
    if (!j.sp.cteno && j.ph > 0.3) j.ph = (Math.asin(clamp(j.c, 0, 1)) / HALF) * 0.3;
  }

  /* ── rendu ── */
  function trace(ctx, P, s, e) {
    ctx.moveTo(P[2 * s], P[2 * s + 1]);
    for (let i = s + 1; i < e; i++) {
      const x = P[2 * i], y = P[2 * i + 1];
      ctx.quadraticCurveTo(x, y, (x + P[2 * i + 2]) * 0.5, (y + P[2 * i + 3]) * 0.5);
    }
    ctx.lineTo(P[2 * e], P[2 * e + 1]);
  }

  function drawTents(ctx, j, fog) {
    const sp = j.sp;
    const base = Math.max(0.35, sp.tentW * j.S * 1.5);
    const lum = Math.min(88, sp.lum + 8), al = 1 + j.alarm * 1.2;
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 3; pass++) {
      ctx.beginPath();
      for (const tn of j.tents) {
        const n = tn.n - 1, s = Math.floor((n * pass) / 3), e = Math.floor((n * (pass + 1)) / 3);
        if (e > s) trace(ctx, tn.P, s, e);
      }
      ctx.lineWidth = base * [1, 0.62, 0.34][pass];
      ctx.strokeStyle = hsla(sp.tentHue, sp.sat, lum, [0.4, 0.24, 0.12][pass] * fog * al);
      ctx.stroke();
    }
    if (sp.cteno) {
      const Rn = j.R0 * j.S;
      ctx.beginPath();
      for (const tn of j.tents) {
        const P = tn.P;
        for (let i = 3; i < tn.n - 1; i += 2) {
          const x = P[2 * i], y = P[2 * i + 1], tx = P[2 * i + 2] - P[2 * i - 2], ty = P[2 * i + 3] - P[2 * i - 1];
          const tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, sd = i % 4 === 1 ? 1 : -1;
          const len = Rn * 0.55 * (1 - (i / tn.n) * 0.6);
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + nx * sd * len * 0.6, y + ny * sd * len * 0.6, x + nx * sd * len + (tx / tl) * len * 0.7, y + ny * sd * len + (ty / tl) * len * 0.7);
        }
      }
      ctx.lineWidth = Math.max(0.3, base * 0.4);
      ctx.strokeStyle = hsla(sp.tentHue, 70, 75, 0.16 * fog);
      ctx.stroke();
    }
  }

  const EL = new Float32Array(128), ER = new Float32Array(128);
  function drawArms(ctx, j, t, fog) {
    const sp = j.sp, w0 = sp.armW * j.R0 * j.S;
    for (const ar of j.arms) {
      const P = ar.P, n = ar.n;
      for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        const tx = P[2 * b] - P[2 * a], ty = P[2 * b + 1] - P[2 * a + 1], tl = Math.hypot(tx, ty) || 1;
        const nx = -ty / tl, ny = tx / tl, f = i / (n - 1);
        const w = w0 * (0.3 + 0.7 * Math.sin(f * Math.PI * 0.85 + 0.3));
        const fl = 1 + sp.frill * 0.45 * Math.sin(f * 11 + t * 2.6 + ar.ph);
        const fr = 1 + sp.frill * 0.45 * Math.cos(f * 13 + t * 2.2 + ar.ph);
        EL[2 * i] = P[2 * i] + nx * w * fl; EL[2 * i + 1] = P[2 * i + 1] + ny * w * fl;
        ER[2 * i] = P[2 * i] - nx * w * fr; ER[2 * i + 1] = P[2 * i + 1] - ny * w * fr;
      }
      ctx.beginPath();
      trace(ctx, EL, 0, n - 1);
      ctx.lineTo(ER[2 * n - 2], ER[2 * n - 1]);
      for (let i = n - 2; i > 0; i--) ctx.quadraticCurveTo(ER[2 * i], ER[2 * i + 1], (ER[2 * i] + ER[2 * i - 2]) * 0.5, (ER[2 * i + 1] + ER[2 * i - 1]) * 0.5);
      ctx.lineTo(ER[0], ER[1]);
      ctx.closePath();
      ctx.fillStyle = hsla(sp.armHue, 70, 62, 0.13 * fog);
      ctx.fill();
      ctx.lineWidth = Math.max(0.4, j.S * 0.8);
      ctx.strokeStyle = hsla(sp.armHue, 75, 76, 0.26 * fog);
      ctx.stroke();
    }
  }

  function drawBell(ctx, j, t, fog) {
    const sp = j.sp, R = j.R, H = j.H, A = sp.alpha * fog, hue = sp.hue, sat = sp.sat, lum = sp.lum;
    const N = 14, rim = dome(j, 1, 0), rr = rim.x, ry0 = rim.y, ryr = rr * ST;
    // cavité sous-ombrelle
    ctx.beginPath(); ctx.ellipse(0, ry0, rr, ryr, 0, 0, TAU);
    ctx.fillStyle = hsla(hue, sat, lum * 0.7, A * 0.3); ctx.fill();
    ctx.lineWidth = Math.max(0.5, R * 0.02); ctx.strokeStyle = hsla(hue, sat, lum, A * 0.5); ctx.stroke();
    // lueur interne
    const glow = sprite(sp.rgb), gs = R * 2.6;
    ctx.globalAlpha = clamp(0.16 * fog, 0, 1); ctx.drawImage(glow, -gs / 2, -H * 0.45 - gs / 2, gs, gs); ctx.globalAlpha = 1;
    // ombrelle
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = dome(j, 1 - i / N, Math.PI); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
    for (let i = 1; i <= N; i++) { const p = dome(j, i / N, 0); ctx.lineTo(p.x, p.y); }
    ctx.ellipse(0, ry0, rr, ryr, 0, 0, Math.PI, false);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, -H * 0.5, 0, 0, -H * 0.5, Math.max(R, H) * 1.18);
    g.addColorStop(0, hsla(hue, sat, lum, A * 0.3));
    g.addColorStop(0.55, hsla(hue, sat, lum, A * 0.5));
    g.addColorStop(0.86, hsla(hue, sat, Math.min(95, lum + 8), A));
    g.addColorStop(1, hsla(hue, sat, lum, A * 0.45));
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(0.6, R * 0.03); ctx.strokeStyle = hsla(hue, sat, Math.min(96, lum + 14), A * 1.4); ctx.stroke();
    // épaisseur de la mésoglée
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = dome(j, 1 - i / N, Math.PI, 0.86, 0.72); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
    for (let i = 1; i <= N; i++) { const p = dome(j, i / N, 0, 0.86, 0.72); ctx.lineTo(p.x, p.y); }
    ctx.lineWidth = Math.max(0.5, R * 0.018); ctx.strokeStyle = hsla(hue, sat, lum, A * 0.55); ctx.stroke();
    // canaux radiaires
    if (sp.canals) {
      ctx.beginPath();
      for (let k = 0; k < sp.canals; k++) {
        const phi = (k / sp.canals) * TAU + j.spin, u0 = sp.branch && k % 2 ? 0.55 : 0.18;
        for (let s = 0; s <= 6; s++) { const p = dome(j, u0 + (1 - u0) * (s / 6), phi, 0.97, 0.97); if (s) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
      }
      ctx.lineWidth = Math.max(0.4, R * 0.011); ctx.strokeStyle = hsla(hue, sat, Math.min(95, lum + 10), A * 0.8); ctx.stroke();
    }
    if (sp.stripes) {
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let k = 0; k < sp.stripes; k++) {
          const phi = (k / sp.stripes) * TAU + j.spin;
          if ((Math.sin(phi) > -0.1) !== (pass === 1)) continue;
          for (let s = 0; s <= 7; s++) { const p = dome(j, 0.14 + 0.86 * (s / 7), phi); if (s) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
        }
        ctx.lineWidth = R * 0.075; ctx.lineCap = 'round';
        ctx.strokeStyle = hsla(sp.stripeHue, 90, 52, A * (pass ? 0.75 : 0.25)); ctx.stroke();
      }
    }
    if (sp.crown) {
      const p = dome(j, 0.62, 0), Yc = dome(j, 0.62, -HALF).y;
      const rc = p.x, yc = (Yc + dome(j, 0.62, HALF).y) / 2;
      ctx.beginPath(); ctx.ellipse(0, yc, rc, rc * ST, 0, 0, TAU);
      ctx.lineWidth = Math.max(0.6, R * 0.04); ctx.strokeStyle = hsla(hue, 80, 50, A * 0.9); ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < sp.crown; k++) {
        const phi = (k / sp.crown) * TAU + j.spin, a = dome(j, 0.64, phi);
        ctx.moveTo(a.x, a.y); const b = dome(j, 1, phi); ctx.lineTo(b.x, b.y);
      }
      ctx.lineWidth = Math.max(0.5, R * 0.02); ctx.strokeStyle = hsla(hue, 70, 55, A * 0.7); ctx.stroke();
      const s2 = R * 1.3; ctx.globalAlpha = clamp(0.5 * fog, 0, 1);
      ctx.drawImage(sprite([200, 30, 60]), -s2 / 2, -H * 0.42 - s2 / 2, s2, s2); ctx.globalAlpha = 1;
    }
    if (sp.gonads) {
      const Yg = -H * 0.42 * CT, rc = R * 0.36, rg = R * 0.19;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const phi = Math.PI / 4 + k * HALF + j.spin, cx = rc * Math.cos(phi), cz = rc * Math.sin(phi);
        for (let s = 0; s <= 18; s++) {
          const an = phi + 0.75 + (s / 18) * (TAU - 1.5);
          const x = cx + rg * Math.cos(an), y = Yg + (cz + rg * Math.sin(an)) * ST;
          if (s) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
      }
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, R * 0.075);
      ctx.strokeStyle = hsla(sp.gonads, 70, 72, A * 1.6); ctx.stroke();
      ctx.lineWidth = Math.max(2, R * 0.16); ctx.strokeStyle = hsla(sp.gonads, 80, 65, A * 0.35); ctx.stroke();
    }
    if (sp.mouth) {
      ctx.beginPath(); ctx.ellipse(0, ry0 - H * 0.25, rr * 0.34, rr * 0.34 * ST + H * 0.08, 0, 0, TAU);
      ctx.lineWidth = Math.max(0.5, R * 0.02); ctx.strokeStyle = hsla(hue, 40, 85, A * 1.2); ctx.stroke();
    }
    // reflet spéculaire
    ctx.globalAlpha = clamp(0.2 * fog, 0, 1);
    ctx.drawImage(sprite([255, 255, 255]), -R * 0.62, -H * 1.02, R * 0.62, H * 0.5);
    ctx.globalAlpha = 1;
    // photophores & alarme lumineuse
    const al = j.alarm, nd = sp.dots || 18;
    if (sp.dots || al > 0.01) {
      const spr = sprite(sp.dotCol || sp.flash);
      for (let k = 0; k < nd; k++) {
        const phi = (k / nd) * TAU + j.spin, p = dome(j, 1, phi);
        let b = sp.dots ? 0.3 + 0.22 * Math.sin(t * 1.3 + k * 0.7) : 0;
        if (al > 0) {
          const an = (((phi - j.at * 7.5) % TAU) + TAU) % TAU;
          b += al * (0.35 + 1.8 * Math.pow(0.5 + 0.5 * Math.cos(an), 9));
        }
        const front = 0.55 + 0.45 * Math.sin(phi), sz = R * (0.18 + b * 0.32);
        ctx.globalAlpha = clamp(b * front * fog, 0, 1);
        ctx.drawImage(spr, p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      if (al > 0.01) {
        const s3 = R * 3.4; ctx.globalAlpha = clamp(al * al * 0.5 * fog, 0, 1);
        ctx.drawImage(sprite(sp.flash), -s3 / 2, -H * 0.4 - s3 / 2, s3, s3);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawCteno(ctx, j, t, fog) {
    const R = j.R0 * j.S * (1 + j.c * 0.2), rx = R * 0.64, ry = R * 0.94, A = j.sp.alpha * fog;
    const g = ctx.createRadialGradient(0, -ry * 0.25, 0, 0, 0, ry * 1.05);
    g.addColorStop(0, hsla(200, 30, 85, A * 0.3)); g.addColorStop(0.75, hsla(200, 30, 85, A * 0.6)); g.addColorStop(1, hsla(200, 40, 90, A * 1.3));
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(0.5, R * 0.03); ctx.strokeStyle = hsla(200, 40, 90, A * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, ry * 0.08, rx * 0.22, ry * 0.6, 0, 0, TAU);
    ctx.strokeStyle = hsla(30, 60, 72, A * 1.2); ctx.stroke();
    const boost = 1 + j.alarm * 1.5;
    ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const phi = (k / 8) * TAU + j.spin, cp = Math.cos(phi), vis = Math.sin(phi) > 0 ? 1 : 0.32;
      ctx.lineWidth = Math.max(0.6, R * 0.06 * (0.45 + 0.55 * Math.abs(Math.sin(phi))));
      for (let s = 0; s < 16; s++) {
        const f = s / 15, th = (0.13 + 0.74 * f) * Math.PI;
        const X = rx * Math.sin(th) * cp, Y = -ry * Math.cos(th);
        const wv = 0.5 + 0.5 * Math.sin(f * 9 - t * 11 * boost + k * 0.8), b = wv * wv * wv;
        let tx = rx * Math.cos(th) * cp, ty = ry * Math.sin(th);
        const tl = Math.hypot(tx, ty) || 1, l = R * 0.05; tx /= tl; ty /= tl;
        const hue = (f * 240 + t * 80 + k * 45) % 360 | 0;
        ctx.strokeStyle = `hsla(${hue},100%,${(55 + b * 25) | 0}%,${clamp((0.1 + 0.9 * b) * vis * fog * boost, 0, 1).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(X - tx * l, Y - ty * l); ctx.lineTo(X + tx * l, Y + ty * l); ctx.stroke();
      }
    }
    if (j.alarm > 0.01) {
      const s3 = R * 3; ctx.globalAlpha = clamp(j.alarm * 0.35 * fog, 0, 1);
      ctx.drawImage(sprite([200, 230, 255]), -s3 / 2, -s3 / 2, s3, s3); ctx.globalAlpha = 1;
    }
  }

  function draw(ctx, j, t, I) {
    const fog = clamp(0.3 + 0.7 * j.z, 0, 1.15) * I * (0.35 + 0.65 * j.grow);
    ctx.globalCompositeOperation = 'lighter';
    drawTents(ctx, j, fog);
    if (j.arms.length) drawArms(ctx, j, t, fog);
    ctx.save(); ctx.translate(j.x, j.y); ctx.rotate(j.a);
    if (j.sp.cteno) drawCteno(ctx, j, t, fog); else drawBell(ctx, j, t, fog);
    ctx.restore();
  }

  window.FK_MED = { SP, create, update, draw, hit, touch, sprite, hslRgb };
})();
