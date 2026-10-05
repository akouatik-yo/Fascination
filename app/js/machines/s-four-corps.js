/* Fascination — Fourmilière · anatomie, rendu et décor */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
  const { TAU, rnd, layer } = window.FK;

  const SP = {
    lasius: { key: 'lasius', nom: 'Lasius niger', fr: 'fourmi noire des jardins', L: 8.5, speed: 40,
      col: '#18110e', sheen: 'rgba(235,220,205,.26)', legCol: 'rgba(22,16,12,.95)',
      body: { g: [-0.3, 0.22, 0.155], p: [-0.12, 0.04, 0.035], t: [0.03, 0.15, 0.07], h: [0.28, 0.11, 0.1] }, legK: 1 },
    atta: { key: 'atta', nom: 'Atta cephalotes', fr: 'fourmi coupe-feuille', L: 11, speed: 30,
      col: '#7a3c1a', sheen: 'rgba(255,190,140,.24)', legCol: 'rgba(88,42,18,.95)',
      body: { g: [-0.27, 0.17, 0.13], p: [-0.11, 0.045, 0.035], t: [0.04, 0.17, 0.075], h: [0.3, 0.14, 0.15] }, legK: 1.1 },
    eciton: { key: 'eciton', nom: 'Eciton burchellii', fr: 'fourmi légionnaire', L: 11, speed: 66,
      col: '#341709', sheen: 'rgba(255,190,130,.22)', legCol: 'rgba(52,24,10,.95)',
      body: { g: [-0.31, 0.18, 0.115], p: [-0.12, 0.05, 0.035], t: [0.03, 0.19, 0.065], h: [0.29, 0.12, 0.11] }, legK: 1.38 },
  };

  function ell(ctx, a, off, rx, ry) {
    const cx = a.x + off * a.ca, cy = a.y + off * a.sa;
    ctx.moveTo(cx + rx * a.ca, cy + rx * a.sa);
    ctx.ellipse(cx, cy, rx, ry, a.a, 0, TAU);
  }
  // hanche x, pied x, pied y, parité du trépied
  const LEG = [[0.08, 0.42, 0.28, 0], [0.02, 0.05, 0.4, 1], [-0.04, -0.34, 0.36, 0]];
  function limbs(ctx, a, sp, t) {
    const L = a.L, ca = a.ca * L, sa = a.sa * L, k = sp.legK, x0 = a.x, y0 = a.y;
    for (let i = 0; i < 3; i++) {
      const lg = LEG[i], hx = lg[0], fx = lg[1], fy = lg[2], par = lg[3], kxo = (i === 0 ? 0.05 : i === 2 ? -0.04 : 0) * k;
      for (let s = -1; s <= 1; s += 2) {
        const ph = a.g + ((par + (s > 0 ? 1 : 0)) % 2) * Math.PI;
        const lx = (fx + Math.sin(ph) * 0.12) * k, ly = fy * k * (Math.cos(ph) > 0 ? 0.86 : 1) * s, hy = 0.045 * s;
        const kx = hx + (lx - hx) * 0.5 + kxo, ky = hy + (ly - hy) * 0.62 + 0.07 * s * k;
        ctx.moveTo(x0 + hx * ca - hy * sa, y0 + hx * sa + hy * ca);
        ctx.lineTo(x0 + kx * ca - ky * sa, y0 + kx * sa + ky * ca);
        ctx.lineTo(x0 + lx * ca - ly * sa, y0 + lx * sa + ly * ca);
      }
    }
    const hk = a.hk || 1, hx0 = sp.body.h[0] + sp.body.h[1] * 0.7 * hk;
    for (let s = -1; s <= 1; s += 2) {
      const w1 = Math.sin(t * 7 + a.id + s) * 0.05 * a.wig, w2 = Math.sin(t * 9.3 + a.id * 2 + s) * 0.07 * a.wig;
      const by = 0.035 * s, ex = hx0 + 0.09, ey = (0.15 + w1) * s, tx = hx0 + 0.26 + w2 * 0.3, ty = (0.11 + w2) * s;
      ctx.moveTo(x0 + hx0 * ca - by * sa, y0 + hx0 * sa + by * ca);
      ctx.lineTo(x0 + ex * ca - ey * sa, y0 + ex * sa + ey * ca);
      ctx.lineTo(x0 + tx * ca - ty * sa, y0 + tx * sa + ty * ca);
    }
  }

  function drawGroup(ctx, A, sp, t, Lref) {
    if (!A.length) return;
    const B = sp.body;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(8,5,3,.32)';
    ctx.beginPath();
    for (const a of A) {
      const L = a.L, hk = a.hk || 1, rg = a.rep ? 1.45 : 1, sx = a.x, sy = a.y;
      a.x += L * 0.1; a.y += L * 0.17;
      ell(ctx, a, -0.02 * L, 0.5 * L * (rg > 1 ? 1.1 : 1), Math.max(B.g[2], B.h[2] * hk) * L * rg);
      a.x = sx; a.y = sy;
    }
    ctx.fill();
    ctx.beginPath();
    for (const a of A) limbs(ctx, a, sp, t);
    ctx.lineWidth = Math.max(0.55, Lref * 0.055); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = sp.legCol; ctx.stroke();
    ctx.fillStyle = sp.col;
    ctx.beginPath();
    let reps = 0, sold = 0;
    for (const a of A) {
      const L = a.L, hk = a.hk || 1;
      if (a.rep) reps++; else ell(ctx, a, B.g[0] * L, B.g[1] * L, B.g[2] * L);
      ell(ctx, a, B.p[0] * L, B.p[1] * L, B.p[2] * L);
      ell(ctx, a, B.t[0] * L, B.t[1] * L, B.t[2] * L);
      if (a.sold) sold++; else ell(ctx, a, (B.h[0] + (hk - 1) * 0.08) * L, B.h[1] * L * hk, B.h[2] * L * hk);
    }
    ctx.fill();
    if (reps) {
      ctx.beginPath();
      for (const a of A) if (a.rep) ell(ctx, a, B.g[0] * a.L * 1.15, B.g[1] * a.L * 1.45, B.g[2] * a.L * 1.45);
      ctx.fillStyle = 'rgba(214,150,62,.9)'; ctx.fill();
      ctx.beginPath();
      for (const a of A) if (a.rep) ell(ctx, a, B.g[0] * a.L * 1.1, B.g[1] * a.L * 0.9, B.g[2] * a.L * 0.9);
      ctx.fillStyle = 'rgba(255,214,130,.45)'; ctx.fill();
    }
    if (sold) {
      ctx.beginPath();
      for (const a of A) if (a.sold) ell(ctx, a, (B.h[0] + 0.03) * a.L, B.h[1] * a.L * a.hk, B.h[2] * a.L * a.hk);
      ctx.fillStyle = '#d8c48c'; ctx.fill();
      ctx.beginPath();
      for (const a of A) if (a.sold) {
        const L = a.L;
        for (let s = -1; s <= 1; s += 2) {
          const bx = 0.42 * L, by = 0.05 * s * L, cx1 = 0.66 * L, cy1 = 0.16 * s * L, ex = 0.72 * L, ey = -0.02 * s * L;
          ctx.moveTo(a.x + bx * a.ca - by * a.sa, a.y + bx * a.sa + by * a.ca);
          ctx.quadraticCurveTo(a.x + cx1 * a.ca - cy1 * a.sa, a.y + cx1 * a.sa + cy1 * a.ca, a.x + ex * a.ca - ey * a.sa, a.y + ex * a.sa + ey * a.ca);
        }
      }
      ctx.lineWidth = Math.max(0.8, Lref * 0.07); ctx.strokeStyle = '#3a1c0c'; ctx.stroke();
    }
    ctx.fillStyle = sp.sheen;
    ctx.beginPath();
    for (const a of A) {
      const L = a.L, hk = a.hk || 1, ox = -a.sa * L * 0.04, oy = a.ca * L * 0.04, sx = a.x, sy = a.y;
      a.x -= ox; a.y -= oy;
      ell(ctx, a, B.g[0] * L * (a.rep ? 1.15 : 1) + 0.03 * L, B.g[1] * L * 0.55, B.g[2] * L * 0.4);
      a.x = sx; a.y = sy;
    }
    ctx.fill();
  }

  function drawCarry(ctx, A) {
    for (const a of A) {
      if (!a.carry) continue;
      const L = a.L, hx = a.x + a.ca * L * 0.55, hy = a.y + a.sa * L * 0.55;
      if (a.carry === 'feuille' && a.leaf) {
        const P = a.leaf, r = a.a + a.leafRot, c = Math.cos(r), s = Math.sin(r), cx = a.x + a.ca * L * 0.15, cy = a.y + a.sa * L * 0.15;
        ctx.beginPath();
        for (let i = 0; i < P.length; i += 2) {
          const x = cx + P[i] * c - P[i + 1] * s, y = cy + P[i] * s + P[i + 1] * c;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.save(); ctx.translate(L * 0.35, L * 0.55); ctx.fill(); ctx.restore();
        ctx.fillStyle = a.leafCol; ctx.fill();
        ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(30,50,20,.55)'; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - c * L * 0.4, cy - s * L * 0.4); ctx.lineTo(cx + c * L * 0.4, cy + s * L * 0.4);
        ctx.strokeStyle = 'rgba(255,255,220,.35)'; ctx.stroke();
        if (a.hiker) {
          const m = L * 0.32, hcx = cx - c * L * 0.1, hcy = cy - s * L * 0.1, ha = r + a.hiker;
          ctx.fillStyle = '#9a4e26'; ctx.beginPath();
          for (const [o, rx, ry] of [[-0.3, 0.2, 0.15], [0.02, 0.15, 0.08], [0.3, 0.13, 0.12]]) {
            const ex = hcx + Math.cos(ha) * o * m, ey = hcy + Math.sin(ha) * o * m;
            ctx.moveTo(ex + rx * m, ey); ctx.ellipse(ex, ey, rx * m, ry * m, ha, 0, TAU);
          }
          ctx.fill();
        }
      } else if (a.carry === 'proie') {
        ctx.fillStyle = '#6f6a7c'; ctx.beginPath(); ctx.ellipse(hx + a.ca * L * 0.15, hy + a.sa * L * 0.15, L * 0.3, L * 0.14, a.a + 0.5, 0, TAU); ctx.fill();
      } else if (a.carry === 'miette') {
        ctx.fillStyle = '#e8d2a0'; ctx.beginPath(); ctx.arc(hx + a.ca * L * 0.1, hy + a.sa * L * 0.1, L * 0.14, 0, TAU); ctx.fill();
      }
    }
  }

  function leafPiece(L) {
    const P = [], n = 7, R = L * rnd(0.68, 0.48);
    for (let i = 0; i < n; i++) {
      const an = -0.3 + (i / (n - 1)) * (Math.PI + 0.6) - Math.PI / 2, r = R * rnd(1.1, 0.8);
      P.push(Math.sin(an) * r * 0.9, -Math.cos(an) * r);
    }
    return P;
  }

  function pebble(g, x, y, r) {
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.ellipse(x + r * 0.18, y + r * 0.26, r * 1.05, r * 0.92, 0.3, 0, TAU); g.fill();
    const hue = rnd(40, 20), l = rnd(44, 28);
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    gr.addColorStop(0, `hsl(${hue},${rnd(18, 6)}%,${l + 18}%)`); gr.addColorStop(0.6, `hsl(${hue},12%,${l}%)`); gr.addColorStop(1, `hsl(${hue},14%,${l - 14}%)`);
    g.fillStyle = gr;
    g.beginPath();
    const n = 9, rot = rnd(TAU);
    for (let i = 0; i <= n; i++) {
      const an = rot + (i / n) * TAU, rr = r * (0.88 + 0.12 * Math.sin(i * 2.3 + rot));
      const px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr * 0.86;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.fill();
    for (let i = 0; i < r * 1.5; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.12)';
      g.fillRect(x + rnd(r, -r) * 0.7, y + rnd(r, -r) * 0.6, 1.2, 1.2);
    }
  }

  function drawLeaf(g, x, y, len, ang, dry) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const w = len * 0.36;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(len * 0.25, -w * 1.2, len * 0.75, -w * 0.9, len, 0);
    g.bezierCurveTo(len * 0.75, w * 0.9, len * 0.25, w * 1.2, 0, 0);
    const gr = g.createLinearGradient(0, -w, 0, w);
    if (dry) { gr.addColorStop(0, 'rgba(120,80,40,.55)'); gr.addColorStop(1, 'rgba(80,52,28,.55)'); }
    else { gr.addColorStop(0, '#68a442'); gr.addColorStop(0.5, '#4f8a32'); gr.addColorStop(1, '#3b6e27'); }
    g.fillStyle = gr; g.fill();
    g.strokeStyle = dry ? 'rgba(60,40,20,.5)' : 'rgba(30,60,18,.8)'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.moveTo(-len * 0.12, 0); g.lineTo(len * 0.96, 0);
    for (let i = 1; i < 7; i++) {
      const px = (i / 7) * len, wd = Math.sin((i / 7) * Math.PI) * w * 0.85;
      g.moveTo(px, 0); g.quadraticCurveTo(px + wd * 0.5, -wd * 0.4, px + wd * 0.8, -wd);
      g.moveTo(px, 0); g.quadraticCurveTo(px + wd * 0.5, wd * 0.4, px + wd * 0.8, wd);
    }
    g.strokeStyle = dry ? 'rgba(160,120,70,.35)' : 'rgba(200,235,150,.42)'; g.lineWidth = 0.8; g.stroke();
    g.restore();
  }

  function ground(W, H, o) {
    const L = layer(W, H), g = L.g;
    g.fillStyle = '#5e4a35'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {
      const x = rnd(W), y = rnd(H), r = rnd(W * 0.22, W * 0.04), light = Math.random() < 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, light ? 'rgba(150,124,90,.3)' : 'rgba(30,22,14,.34)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const nG = (W * H) / 14;
    for (let i = 0; i < nG; i++) {
      const r = Math.random();
      g.fillStyle = r < 0.45 ? 'rgba(255,232,196,.07)' : r < 0.8 ? 'rgba(0,0,0,.16)' : 'rgba(170,140,100,.12)';
      g.fillRect(rnd(W), rnd(H), 1, 1);
    }
    for (let i = 0; i < (W * H) / 900; i++) {
      const x = rnd(W), y = rnd(H), r = rnd(1.8, 0.6) * o.k * 0.75, l = rnd(60, 30);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(x + r * 0.4, y + r * 0.5, r, 0, TAU); g.fill();
      g.fillStyle = `hsl(${rnd(40, 22)},${rnd(30, 10)}%,${l}%)`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    for (let i = 0; i < 5; i++) {
      const x = rnd(W), y = rnd(H), a = rnd(TAU), len = rnd(160, 70) * o.k, w = rnd(5, 2.5) * o.k;
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, mx = (x + ex) / 2 + rnd(20, -20), my = (y + ey) / 2 + rnd(20, -20);
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = w + 2; g.beginPath(); g.moveTo(x + 3, y + 4); g.quadraticCurveTo(mx + 3, my + 4, ex + 3, ey + 4); g.stroke();
      g.strokeStyle = '#4a3624'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      g.strokeStyle = 'rgba(150,120,84,.35)'; g.lineWidth = w * 0.3; g.beginPath(); g.moveTo(x - 1, y - 1); g.quadraticCurveTo(mx - 1, my - 1, ex - 1, ey - 1); g.stroke();
    }
    for (let i = 0; i < 6; i++) drawLeaf(g, rnd(W), rnd(H), rnd(70, 40) * o.k, rnd(TAU), true);
    for (const n of o.nests || []) {
      const big = n.kind === 'atta', R = n.r * (big ? 1.5 : 1.9);
      const gr = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, R);
      gr.addColorStop(0, big ? 'rgba(130,100,66,.65)' : 'rgba(110,86,60,.5)'); gr.addColorStop(0.7, 'rgba(90,70,48,.25)'); gr.addColorStop(1, 'rgba(90,70,48,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(n.x, n.y, R, 0, TAU); g.fill();
      const np = big ? 900 : 380;
      for (let i = 0; i < np; i++) {
        const an = rnd(TAU), d = Math.abs(rnd(1, 0) + rnd(1, 0) - 1) * R * 1.05 + n.r * 0.25, r = rnd(1.7, 0.8) * o.k * 0.75;
        const x = n.x + Math.cos(an) * d, y = n.y + Math.sin(an) * d;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x + 0.6, y + 0.8, r, 0, TAU); g.fill();
        g.fillStyle = `hsl(${rnd(38, 26)},${rnd(34, 18)}%,${rnd(52, 34)}%)`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      for (const h of n.holes) {
        const hr = n.r * (big ? 0.2 : 0.3);
        const hg = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, hr * 1.6);
        hg.addColorStop(0, 'rgba(0,0,0,.95)'); hg.addColorStop(0.55, 'rgba(10,6,4,.8)'); hg.addColorStop(1, 'rgba(10,6,4,0)');
        g.fillStyle = hg; g.beginPath(); g.arc(h.x, h.y, hr * 1.6, 0, TAU); g.fill();
      }
    }
    for (const p of o.pebbles || []) pebble(g, p.x, p.y, p.r);
    return L;
  }

  window.FK_ANT = { SP, drawGroup, drawCarry, leafPiece, pebble, drawLeaf, ground };
})();
