/* Fascination — La Murmuration · étourneaux, bécasseaux et faucon pèlerin, en 3D */
(function boot() {
  if (!window.FK) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, layer, scale } = window.FK;
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.22;
  const css = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const SKY = [
    [0, [72, 112, 172], [156, 176, 208], [252, 216, 164]],
    [0.35, [48, 66, 128], [178, 126, 150], [255, 166, 98]],
    [0.6, [28, 34, 78], [126, 72, 112], [242, 112, 72]],
    [0.8, [14, 16, 42], [62, 40, 82], [150, 72, 72]],
    [1, [5, 6, 16], [14, 15, 34], [38, 28, 44]],
  ];
  function skyAt(h) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (h <= b[0]) { const k = (h - a[0]) / (b[0] - a[0]); return [mix(a[1], b[1], k), mix(a[2], b[2], k), mix(a[3], b[3], k)]; }
    }
    const l = SKY[SKY.length - 1]; return [l[1], l[2], l[3]];
  }
  const SCN = {
    marais: { nom: 'Sturnus vulgaris', fr: 'étourneau sansonnet', horF: 0.8, D: 330, span: 0.38, kSize: 5, v0: 11, vmin: 7, vmax: 17, cY: 105, ampX: 95, ampY: 30, ampZ: 60, R: 12, sep: 7, n: 5600 },
    estran: { nom: 'Calidris alpina', fr: 'bécasseau variable', horF: 0.62, D: 250, span: 0.36, kSize: 4.6, v0: 14, vmin: 9, vmax: 21, cY: 36, ampX: 110, ampY: 16, ampZ: 50, R: 10, sep: 5.5, n: 2600, belly: [250, 248, 240], back: [52, 44, 40] },
  };
  const NAT = { coh: 1, ali: 1, sep: 1, topo: 7, speed: 1 };

  window.FASC.push({
    id: 'boids', name: 'La Murmuration', cat: 'Vivant', glyph: '🜋',
    blurb: 'Des milliers d’oiseaux, un seul organisme',
    hint: 'GUIDER : glissez pour emmener la nuée · EFFRAYER : touchez pour déclencher une vague de panique · FAUCON : touchez la nuée pour lancer une attaque · NUÉE : touchez pour lâcher des oiseaux.',
    intro: 'Au coucher du soleil, des milliers d’étourneaux dansent au-dessus des roseaux avant de s’y poser pour la nuit. Aucun chef : chaque oiseau ne regarde que ses sept voisins les plus proches, et pourtant la nuée entière se plie et se tord comme un seul être.',
    legend: [
      { color: '#c9a8ff', name: 'Sturnus vulgaris', role: 'étourneau sansonnet · marais', desc: 'Nuées immenses, lentes et ondulantes. Les zones sombres sont celles où les oiseaux se présentent de face, ailes ouvertes. Les zones claires sont celles qu’on voit par la tranche.' },
      { color: '#f4efe4', name: 'Calidris alpina', role: 'bécasseau variable · estran', desc: 'Petits limicoles au ventre blanc et au dos brun. À chaque virage, la nuée passe d’un coup du sombre à l’argenté.' },
      { color: '#ff7a6a', name: 'Falco peregrinus', role: 'faucon pèlerin · prédateur', desc: 'Il tourne au-dessus de la nuée puis pique à plus de 150 km/h. Les oiseaux s’écartent et une vague de panique traverse la nuée.' },
    ],
    about: [
      'Craig Reynolds a montré en 1986 que trois règles suffisent à simuler une nuée : s’éloigner d’un voisin trop proche, voler dans la même direction que ses voisins, rester près d’eux.',
      'En filmant des nuées en 3D à Rome, l’équipe de Giorgio Parisi a découvert en 2008 que chaque étourneau suit un nombre fixe de voisins (six ou sept), quelle que soit leur distance. C’est ce qui rend la nuée si cohérente, même quand elle s’étire.',
      'Les « vagues d’agitation » sont des virages de fuite qui se transmettent de proche en proche plus vite que le faucon ne vole. Elles apparaissent comme des bandes sombres qui traversent la nuée.',
      'Ici, chaque oiseau vole dans un vrai volume en trois dimensions. Les formes et les ombres de la nuée naissent de la perspective et de l’inclinaison de chaque oiseau dans ses virages.',
    ],
    tools: [
      { id: 'guider', label: 'guider', desc: 'Glissez dans le ciel : la nuée suit votre doigt, puis reprend peu à peu sa propre route.' },
      { id: 'effrayer', label: 'effrayer', desc: 'Touchez la nuée, comme un battement de mains : les oiseaux touchés virent brusquement et la panique se propage.' },
      { id: 'faucon', label: 'faucon', desc: 'Touchez un endroit de la nuée : le faucon pèlerin pique sur l’oiseau le plus proche.' },
      { id: 'nuee', label: 'nuée', desc: 'Touchez ou glissez pour lâcher de nouveaux groupes d’oiseaux, qui rejoindront la nuée.' },
    ],
    make(env) {
      const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
      let quiet = true;
      const snd = () => !quiet && au && au.on;
      const Q = Math.min(2, window.devicePixelRatio || 1);
      const kA = clamp((W * H) / 1e6, 0.5, 1.4);
      const cfg = { scene: 'marais', coh: 1, ali: 1, sep: 1, topo: 7, speed: 1, falcon: true, auto: true, hour: 0.42, flow: true, view: 'reel', trail: false, refl: true, roost: false };
      const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0 }; };
      let S = SCN.marais, horY = 0, foc = 0;
      const camH = 2;
      const NMAX = 9000;
      const PX = new Float32Array(NMAX), PY = new Float32Array(NMAX), PZ = new Float32Array(NMAX);
      const VX = new Float32Array(NMAX), VY = new Float32Array(NMAX), VZ = new Float32Array(NMAX);
      const AX = new Float32Array(NMAX), AY = new Float32Array(NMAX), AZ = new Float32Array(NMAX);
      const BK = new Float32Array(NMAX), FLP = new Float32Array(NMAX), AL = new Float32Array(NMAX), LAT = new Float32Array(NMAX), NA = new Float32Array(NMAX);
      const TS = new Int8Array(NMAX), NTS = new Int8Array(NMAX), NXT = new Int32Array(NMAX);
      const HS = 1 << 15, HEAD = new Int32Array(HS);
      const OFF = [];
      for (let z = -1; z <= 1; z++) for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) OFF.push([x, y, z, x * x + y * y + z * z]);
      OFF.sort((a, b) => a[3] - b[3]);
      const hk = (ix, iy, iz) => (((ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)) >>> 0) & (HS - 1);
      let N = 0, landed = 0, target = 0, VT = 0;

      function addBird(x, y, z, vx, vy, vz) {
        if (N >= NMAX) return;
        const i = N++;
        PX[i] = x; PY[i] = y; PZ[i] = z; VX[i] = vx; VY[i] = vy; VZ[i] = vz;
        BK[i] = 0; FLP[i] = rnd(TAU); AL[i] = 0; LAT[i] = 9; TS[i] = 1;
      }
      function removeBird(i) {
        const l = --N;
        if (i === l) return;
        PX[i] = PX[l]; PY[i] = PY[l]; PZ[i] = PZ[l]; VX[i] = VX[l]; VY[i] = VY[l]; VZ[i] = VZ[l];
        BK[i] = BK[l]; FLP[i] = FLP[l]; AL[i] = AL[l]; LAT[i] = LAT[l]; TS[i] = TS[l];
      }
      const guide = { x: 0, y: 0, z: 0, k: 0, hold: false };
      const roostP = { x: -70, y: 0, z: 30 };
      const C = { x: 0, y: 0, z: 0 };
      function center(t) {
        let x = Math.sin(t * 0.047) * S.ampX + Math.sin(t * 0.13) * S.ampX * 0.25;
        let y = S.cY + Math.sin(t * 0.071 + 1) * S.ampY, z = Math.sin(t * 0.033 + 2) * S.ampZ;
        if (cfg.roost) { x = roostP.x; y = 0; z = roostP.z; }
        if (guide.k > 0) { x += (guide.x - x) * guide.k; y += (guide.y - y) * guide.k; z += (guide.z - z) * guide.k; }
        C.x = x; C.y = y; C.z = z;
      }
      function spawnGroup(n, x, y, z, hd) {
        const h = hd != null ? hd : rnd(TAU), v = S.v0;
        const sp = Math.cbrt(n) * S.sep * 0.9;
        for (let k = 0; k < n; k++) addBird(x + gauss() * sp, Math.max(4, y + gauss() * sp * 0.3), z + gauss() * sp * 0.7, Math.cos(h) * v + gauss(), gauss() * 0.5, Math.sin(h) * v + gauss());
      }

      /* faucon */
      const FA = { x: 0, y: 260, z: 60, vx: 18, vy: 0, vz: 0, mode: 'patrouille', t: 0, tgt: -1, next: rnd(28, 14), bk: 0, fl: 0 };
      const feathers = [];
      function attack(i) {
        if (N === 0) return;
        if (!cfg.falcon) { cfg.falcon = true; FA.x = C.x + 200; FA.y = C.y + 160; FA.z = C.z; }
        FA.mode = 'pique'; FA.tgt = i >= 0 && i < N ? i : rint(N); FA.t = 0;
        if (snd()) au.noise(1.4, 0.045, 3400, 1.6, 'bandpass', 500);
      }
      function falcon(dt) {
        const f = FA;
        let tx, ty, tz, sp, k;
        f.t += dt;
        if (!cfg.falcon) { tx = f.x + f.vx; ty = 500; tz = 400; sp = 26; k = 0.8; }
        else if (f.mode === 'pique' && N > 0) {
          if (f.tgt >= N) f.tgt = rint(N);
          const i = f.tgt;
          tx = PX[i] + VX[i] * 0.4; ty = PY[i] + VY[i] * 0.4; tz = PZ[i] + VZ[i] * 0.4; sp = 48; k = 3.2;
          const d = Math.hypot(tx - f.x, ty - f.y, tz - f.z);
          if (d < 2.5 || f.t > 7) {
            if (d < 2.5 && Math.random() < 0.15 && N > 30) {
              for (let q = 0; q < 14; q++) feathers.push({ x: PX[i], y: PY[i], z: PZ[i], vx: gauss() * 3, vy: gauss() * 2 + 1, vz: gauss() * 3, life: rnd(5, 3), a: rnd(TAU) });
              removeBird(i);
              if (snd()) au.noise(0.25, 0.03, 1800, 2, 'bandpass');
            }
            f.mode = 'remonte'; f.t = 0;
          }
        } else if (f.mode === 'remonte') {
          tx = f.x + f.vx * 2; ty = C.y + 140; tz = f.z + f.vz * 2; sp = 24; k = 1.2;
          if (f.t > 5) { f.mode = 'patrouille'; f.t = 0; f.next = rnd(38, 18); }
        } else {
          f.mode = 'patrouille';
          tx = C.x + Math.cos(VT * 0.21) * 140; ty = C.y + 95 + Math.sin(VT * 0.13) * 20; tz = C.z + Math.sin(VT * 0.21) * 110; sp = 20; k = 0.7;
          if (cfg.auto && N > 0 && !cfg.roost && (f.next -= dt) <= 0) attack(-1);
        }
        const dx = tx - f.x, dy = ty - f.y, dz = tz - f.z, d = Math.hypot(dx, dy, dz) || 1;
        const ax = ((dx / d) * sp - f.vx) * k, ay = ((dy / d) * sp - f.vy) * k, az = ((dz / d) * sp - f.vz) * k;
        f.vx += ax * dt; f.vy += ay * dt; f.vz += az * dt;
        const hv = Math.hypot(f.vx, f.vz) || 1;
        f.bk += (clamp(Math.atan(((ax * -f.vz) / hv + (az * f.vx) / hv) / 9.8), -1.2, 1.2) - f.bk) * Math.min(1, dt * 4);
        f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
        if (f.y < 3) { f.y = 3; f.vy = Math.abs(f.vy); }
        f.fl += dt * (f.mode === 'pique' ? 2 : 7);
      }

      /* simulation */
      function step(dt) {
        const R = S.R, R2 = R * R, sp = S.sep * cfg.sep, S2 = sp * sp, topo = Math.max(1, cfg.topo | 0);
        const Ka = 1.7 * cfg.ali, Kc = 0.22 * cfg.coh, Ks = 22;
        const v0 = S.v0 * cfg.speed, vmin = S.vmin * cfg.speed, vmax = S.vmax * cfg.speed;
        const Rr = cfg.roost ? 6 : 120, Kr = cfg.roost ? 0.07 : 0.026, top = S.cY * 2.6;
        HEAD.fill(-1);
        for (let i = 0; i < N; i++) { const k = hk(Math.floor(PX[i] / R), Math.floor(PY[i] / R), Math.floor(PZ[i] / R)); NXT[i] = HEAD[k]; HEAD[k] = i; }
        const fOn = cfg.falcon, fx = FA.x, fy = FA.y, fz = FA.z, fR = FA.mode === 'pique' ? 48 : 34;
        for (let i = 0; i < N; i++) {
          const x = PX[i], y = PY[i], z = PZ[i], vx = VX[i], vy = VY[i], vz = VZ[i];
          const ix = Math.floor(x / R), iy = Math.floor(y / R), iz = Math.floor(z / R);
          let cnt = 0, ax = 0, ay = 0, az = 0, sx = 0, sy = 0, sz = 0, svx = 0, svy = 0, svz = 0, trig = 0, tsg = 1;
          outer: for (let o = 0; o < 27; o++) {
            const of = OFF[o];
            for (let j = HEAD[hk(ix + of[0], iy + of[1], iz + of[2])]; j >= 0; j = NXT[j]) {
              if (j === i) continue;
              const dx = PX[j] - x, dy = PY[j] - y, dz = PZ[j] - z, d2 = dx * dx + dy * dy + dz * dz;
              if (d2 > R2) continue;
              cnt++;
              sx += dx; sy += dy; sz += dz; svx += VX[j]; svy += VY[j]; svz += VZ[j];
              if (d2 < S2) { const d = Math.sqrt(d2) + 0.01, k = (Ks * (sp - d)) / (sp * d); ax -= dx * k; ay -= dy * k; az -= dz * k; }
              const lj = LAT[j];
              if (AL[j] > 0.45 && lj > 0.09 && lj < 0.5 && AL[j] > trig) { trig = AL[j]; tsg = TS[j]; }
              if (cnt >= topo) break outer;
            }
          }
          if (cnt) {
            const ic = 1 / cnt;
            ax += (svx * ic - vx) * Ka + sx * ic * Kc;
            ay += (svy * ic - vy) * Ka + sy * ic * Kc;
            az += (svz * ic - vz) * Ka + sz * ic * Kc;
          }
          NA[i] = trig * 0.965; NTS[i] = tsg;
          const cx = C.x - x, cy = C.y - y, cz = C.z - z, cd = Math.hypot(cx, cy, cz) || 1;
          if (cd > Rr) { const k = ((cd - Rr) * Kr) / cd; ax += cx * k; ay += cy * k * 1.4; az += cz * k; }
          if (!cfg.roost) { if (y < 14) ay += (14 - y) * 1.6; if (y > top) ay -= (y - top) * 0.5; }
          const v = Math.hypot(vx, vy, vz) || 1, kv = ((v0 - v) * 0.9) / v;
          ax += vx * kv; ay += vy * kv - vy * 0.35; az += vz * kv;
          if (fOn) {
            const dx = x - fx, dy = y - fy, dz = z - fz, d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < fR * fR) {
              const d = Math.sqrt(d2) + 0.1, k = (1 - d / fR) * 75 / d;
              ax += dx * k; ay += dy * k; az += dz * k;
              if (d < fR * 0.7 && AL[i] < 0.5) { NA[i] = 1; NTS[i] = dx * vz - dz * vx > 0 ? 1 : -1; }
            }
          }
          const al = AL[i];
          if (al > 0.2) {
            const hv = Math.hypot(vx, vz) || 1, s = TS[i] * 17 * al;
            ax += (-vz / hv) * s; az += (vx / hv) * s; ay -= 5 * al;
          }
          AX[i] = ax + gauss() * 0.5; AY[i] = ay + gauss() * 0.3; AZ[i] = az + gauss() * 0.5;
        }
        const ed = Math.exp(-dt * 0.9), bk = Math.min(1, dt * 5);
        for (let i = 0; i < N; i++) {
          let vx = VX[i] + AX[i] * dt, vy = VY[i] + AY[i] * dt, vz = VZ[i] + AZ[i] * dt;
          const v = Math.hypot(vx, vy, vz) || 1;
          if (v > vmax) { const k = vmax / v; vx *= k; vy *= k; vz *= k; }
          else if (v < vmin && !cfg.roost) { const k = vmin / v; vx *= k; vy *= k; vz *= k; }
          VX[i] = vx; VY[i] = vy; VZ[i] = vz;
          PX[i] += vx * dt; PY[i] += vy * dt; PZ[i] += vz * dt;
          if (PY[i] < 0.5) { PY[i] = 0.5; VY[i] = Math.abs(vy); }
          const hv = Math.hypot(vx, vz) || 1, lat = (AX[i] * -vz + AZ[i] * vx) / hv;
          BK[i] += (clamp(Math.atan(lat / 9.8), -1.3, 1.3) - BK[i]) * bk;
          if (NA[i] > 0.45 && AL[i] < 0.4) { AL[i] = NA[i]; LAT[i] = 0; TS[i] = NTS[i]; }
          else { AL[i] *= ed; LAT[i] += dt; }
        }
        if (cfg.roost) {
          for (let i = N - 1; i >= 0; i--) if (PY[i] < 3 && Math.hypot(PX[i] - roostP.x, PZ[i] - roostP.z) < 45) { removeBird(i); landed++; }
        } else if (landed > 0) {
          const n = Math.min(landed, Math.ceil(dt * 260));
          for (let k = 0; k < n; k++) addBird(roostP.x + gauss() * 15, 1, roostP.z + gauss() * 15, gauss() * 3, rnd(9, 5), gauss() * 3);
          landed -= n;
        }
      }

      /* ciel & paysage */
      const skyL = layer(W, H), clouds = layer(W, H), ctint = layer(W, H);
      {
        const g = clouds.g;
        for (let k = 0; k < 26; k++) {
          const x = rnd(W * 1.2, -W * 0.1), y = rnd(H * 0.6, H * 0.05), w = rnd(W * 0.35, W * 0.08), h = w * rnd(0.08, 0.03);
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
          gr.addColorStop(0, `rgba(255,255,255,${rnd(0.5, 0.18).toFixed(2)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.save(); g.translate(x, y); g.scale(w, h); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
        }
      }
      const reeds = [];
      let lastSky = -1, lastScene = '', lastView = '', lastMode = '';
      function buildReeds() {
        reeds.length = 0;
        if (cfg.scene !== 'marais') return;
        const n = Math.round(W / 3);
        for (let k = 0; k < n; k++) {
          const tall = Math.random() < 0.7;
          reeds.push({ x: rnd(W), h: (tall ? rnd(H * 0.24, H * 0.12) : rnd(H * 0.12, H * 0.05)) * rnd(1.1, 0.85), w: rnd(3, 1.4) * kA, c: rnd(0.3, -0.3), ph: rnd(TAU), plume: tall && Math.random() < 0.55 });
        }
      }
      function sunPos(h) {
        const v = view();
        return { x: v.x0 + v.w * 0.66, y: horY - (0.58 - h) * H * 0.62, r: 16 * kA + 8 };
      }
      function renderSky() {
        const g = skyL.g, h = cfg.hour, neon = cfg.view === 'neon';
        const [top, mid, hz] = neon ? [[6, 3, 18], [22, 8, 44], [70, 20, 90]] : skyAt(h);
        const gr = g.createLinearGradient(0, 0, 0, horY);
        gr.addColorStop(0, css(top, 1)); gr.addColorStop(0.62, css(mid, 1)); gr.addColorStop(1, css(hz, 1));
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.fillStyle = gr; g.fillRect(0, 0, W, horY + 1);
        const sun = sunPos(h);
        if (!neon && sun.y < horY + sun.r) {
          const sc = mix([255, 244, 214], [255, 128, 70], clamp(h * 1.6, 0, 1));
          const sg = g.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, H * 0.55);
          sg.addColorStop(0, css(sc, 0.55)); sg.addColorStop(0.2, css(sc, 0.16)); sg.addColorStop(1, css(sc, 0));
          g.globalCompositeOperation = 'lighter'; g.fillStyle = sg; g.fillRect(0, 0, W, horY);
          g.globalCompositeOperation = 'source-over';
          g.save(); g.beginPath(); g.rect(0, 0, W, horY); g.clip();
          g.fillStyle = css(mix(sc, [255, 255, 255], 0.3), 1); g.beginPath(); g.arc(sun.x, sun.y, sun.r, 0, TAU); g.fill();
          g.restore();
        }
        const t = ctint.g;
        t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, W, H); t.drawImage(clouds.c, 0, 0);
        t.globalCompositeOperation = 'source-in';
        t.fillStyle = css(neon ? [120, 40, 160] : mix(mix(mid, hz, 0.6), [255, 255, 255], 0.15 * (1 - h)), 1); t.fillRect(0, 0, W, H);
        g.globalAlpha = neon ? 0.35 : 0.85 - h * 0.4; g.drawImage(ctint.c, 0, 0); g.globalAlpha = 1;
        if (neon || h > 0.75) {
          const sa = neon ? 0.8 : (h - 0.75) * 3;
          g.fillStyle = '#eef'; for (let k = 0; k < 160; k++) { g.globalAlpha = sa * rnd(0.8, 0.2); g.fillRect(rnd(W), rnd(horY * 0.85), 1.2, 1.2); }
          g.globalAlpha = 1;
        }
        const sil = neon ? [3, 2, 8] : mix(mix(hz, [0, 0, 0], 0.8), [20, 14, 26], 0.4);
        if (cfg.scene === 'marais') {
          g.fillStyle = css(mix(sil, hz, 0.12), 1);
          g.beginPath(); g.moveTo(0, horY + 1);
          for (let x = 0; x <= W + 8; x += 8) {
            let y = horY - (6 + 10 * (0.5 + 0.5 * Math.sin(x * 0.007 + 2)) + 18 * Math.max(0, Math.sin(x * 0.0021 + 1))) * kA;
            if (Math.sin(x * 0.051) > 0.92) y -= 16 * kA;
            g.lineTo(x, y);
          }
          g.lineTo(W, horY + 1); g.closePath(); g.fill();
          const py = horY, ph = H * 0.075;
          const wg = g.createLinearGradient(0, py, 0, py + ph);
          wg.addColorStop(0, css(mix(hz, sil, 0.25), 1)); wg.addColorStop(1, css(mix(mid, sil, 0.45), 1));
          g.fillStyle = wg; g.fillRect(0, py, W, ph);
          g.fillStyle = css(sil, 1); g.fillRect(0, py + ph, W, H - py - ph);
        } else {
          g.fillStyle = css(mix(sil, hz, 0.2), 1);
          g.beginPath(); g.moveTo(0, horY + 1);
          for (let x = 0; x <= W + 10; x += 10) g.lineTo(x, horY - (2 + 5 * Math.max(0, Math.sin(x * 0.004 + 0.5))) * kA);
          g.lineTo(W, horY + 1); g.closePath(); g.fill();
          const wg = g.createLinearGradient(0, horY, 0, H);
          wg.addColorStop(0, css(mix(hz, sil, 0.15), 1)); wg.addColorStop(0.5, css(mix(mid, sil, 0.35), 1)); wg.addColorStop(1, css(mix(top, sil, 0.55), 1));
          g.fillStyle = wg; g.fillRect(0, horY, W, H - horY);
          if (!neon && sun.y < horY + sun.r) {
            const sc = mix([255, 236, 190], [255, 140, 80], clamp(h * 1.6, 0, 1));
            g.globalCompositeOperation = 'lighter';
            for (let k = 0; k < 220; k++) {
              const y = horY + Math.pow(Math.random(), 1.6) * (H - horY), sp = (y - horY) / (H - horY), w = rnd(26, 4) * (0.3 + sp * 1.5);
              g.fillStyle = css(sc, (rnd(0.22, 0.04) * (1 - sp * 0.6)).toFixed(3));
              g.fillRect(sun.x + gauss() * (8 + sp * 70) - w / 2, y, w, 1 + sp * 1.5);
            }
            g.globalCompositeOperation = 'source-over';
          }
          const sand = horY + (H - horY) * 0.62;
          const sgr = g.createLinearGradient(0, sand, 0, H);
          sgr.addColorStop(0, css(mix(sil, mid, 0.18), 0.55)); sgr.addColorStop(1, css(sil, 0.92));
          g.fillStyle = sgr;
          g.beginPath(); g.moveTo(0, H);
          for (let x = 0; x <= W + 10; x += 10) g.lineTo(x, sand + Math.sin(x * 0.006 + 1) * 10 * kA + Math.sin(x * 0.017) * 4);
          g.lineTo(W, H); g.closePath(); g.fill();
          g.fillStyle = css(sil, 1);
          for (let k = 0; k < 9; k++) { const x = W * (0.08 + k * 0.035) + Math.sin(k * 7) * 8, y = sand - 4 + k * 3, h2 = (40 - k * 2.5) * kA; g.fillRect(x, y - h2, 3.5 * kA, h2); }
        }
        lastSky = cfg.hour; lastScene = cfg.scene; lastMode = cfg.view;
      }

      /* rendu des oiseaux */
      const BL = layer(W * Q, H * Q), bg = BL.g;
      bg.setTransform(Q, 0, 0, Q, 0, 0); bg.lineCap = 'round'; bg.lineJoin = 'round';
      const ALV = [0.3, 0.48, 0.66, 0.86];
      function drawBirds(dt) {
        const v = view(), cxs = (v.x0 + v.x1) / 2, D = S.D, f = foc, neon = cfg.view === 'neon', dun = cfg.scene === 'estran';
        const span = S.span * S.kSize * 0.5;
        const paths = [];
        for (let k = 0; k < 16; k++) paths.push(new Path2D());
        const night = cfg.hour > 0.82 && !neon;
        for (let i = 0; i < N; i++) {
          const Z = PZ[i] + D;
          if (Z < 10) continue;
          const s = f / Z, sx = cxs + PX[i] * s, sy = horY - (PY[i] - camH) * s;
          if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
          const vx = VX[i], vy = VY[i], vz = VZ[i], vl = Math.hypot(vx, vy, vz) || 1, fx = vx / vl, fy = vy / vl, fz = vz / vl;
          const ul = Math.sqrt(Math.max(1e-4, 1 - fy * fy)), ux = (-fy * fx) / ul, uy = (1 - fy * fy) / ul, uz = (-fy * fz) / ul;
          const hv = Math.hypot(vx, vz) || 1, rx = -vz / hv, rz = vx / hv, b = BK[i], cb = Math.cos(b), sb = Math.sin(b);
          const nx = ux * cb + rx * sb, ny = uy * cb, nz = uz * cb + rz * sb;
          const tx = -PX[i], ty = camH - PY[i], tz = -Z, tl = Math.hypot(tx, ty, tz);
          const dn = (nx * tx + ny * ty + nz * tz) / tl, vis = Math.abs(dn);
          let dsx = vx - (PX[i] * vz) / Z, dsy = -(vy - ((PY[i] - camH) * vz) / Z);
          const dl = Math.hypot(dsx, dsy) || 1; dsx /= dl; dsy /= dl;
          FLP[i] += dt * (AL[i] > 0.3 ? 9 : 5.5);
          const fl = Math.sin(FLP[i]) * (Math.sin(FLP[i] * 0.09 + i) > -0.3 ? 1 : 0.15);
          const L = span * s, w = L * (0.28 + 0.72 * vis), bx = -dsx * L * 0.35, by = -dsy * L * 0.35 - fl * L * 0.45;
          let q = vis < 0.3 ? 0 : vis < 0.55 ? 1 : vis < 0.8 ? 2 : 3;
          if (dun && dn < 0) q += 4;
          if (L > 1.3) q += 8;
          const p = paths[q];
          p.moveTo(sx - dsy * w + bx, sy + dsx * w + by); p.lineTo(sx, sy); p.lineTo(sx + dsy * w + bx, sy - dsx * w + by);
        }
        bg.globalCompositeOperation = neon ? 'lighter' : 'source-over';
        for (let k = 0; k < 16; k++) {
          const q = k & 3, belly = (k & 4) > 0, big = k >= 8;
          let col;
          if (neon) col = dun ? (belly ? [255, 240, 255] : [130, 90, 255]) : mix([60, 200, 255], [255, 70, 200], q / 3);
          else if (dun) col = belly ? mix(S.belly, [120, 110, 120], cfg.hour * 0.7) : S.back;
          else col = night ? [4, 4, 8] : [12, 10, 18];
          const a = neon ? 0.25 + q * 0.18 : dun ? (belly ? 0.55 + q * 0.12 : ALV[q]) : ALV[q];
          bg.strokeStyle = css(col, a.toFixed(2)); bg.lineWidth = big ? 1.7 : 1.15;
          bg.stroke(paths[k]);
        }
        bg.globalCompositeOperation = 'source-over';
        // faucon
        if (FA.y < 480) {
          const Z = FA.z + D;
          if (Z > 10) {
            const s = f / Z, sx = cxs + FA.x * s, sy = horY - (FA.y - camH) * s;
            let dsx = FA.vx - (FA.x * FA.vz) / Z, dsy = -(FA.vy - ((FA.y - camH) * FA.vz) / Z);
            const dl = Math.hypot(dsx, dsy) || 1; dsx /= dl; dsy /= dl;
            const L = 1.0 * S.kSize * 0.5 * s * 1.3, px = -dsy, py = dsx, fold = FA.mode === 'pique' ? 0.35 : 1, fl = Math.sin(FA.fl) * 0.25 * fold;
            const pt = (a, b) => [sx + dsx * a * L + px * b * L, sy + dsy * a * L + py * b * L - (Math.abs(b) > 0.5 ? fl * L : 0)];
            const poly = [pt(0.55, 0), pt(0.1, 0.15), pt(-0.35, 1.05 * fold), pt(-0.2, 0.12), pt(-0.65, 0.12), pt(-0.7, 0), pt(-0.65, -0.12), pt(-0.2, -0.12), pt(-0.35, -1.05 * fold), pt(0.1, -0.15)];
            bg.fillStyle = neon ? 'rgba(255,90,90,.95)' : 'rgba(18,10,10,.95)';
            bg.beginPath(); poly.forEach((p, k) => (k ? bg.lineTo(p[0], p[1]) : bg.moveTo(p[0], p[1]))); bg.closePath(); bg.fill();
          }
        }
        if (feathers.length) {
          bg.strokeStyle = neon ? 'rgba(255,220,255,.8)' : 'rgba(40,34,40,.8)'; bg.lineWidth = 1;
          bg.beginPath();
          for (const p of feathers) {
            const Z = p.z + D; if (Z < 10) continue;
            const s = f / Z, sx = cxs + p.x * s, sy = horY - (p.y - camH) * s, l = 1.5 + s * 0.4;
            bg.moveTo(sx - Math.cos(p.a) * l, sy - Math.sin(p.a) * l); bg.lineTo(sx + Math.cos(p.a) * l, sy + Math.sin(p.a) * l);
          }
          bg.stroke();
        }
      }
      function unproject(sx, sy, depth) {
        const v = view(), cxs = (v.x0 + v.x1) / 2, Z = depth + S.D;
        return { x: ((sx - cxs) * Z) / foc, y: camH + ((horY - sy) * Z) / foc, z: depth };
      }
      function nearestScreen(px, py, R) {
        const v = view(), cxs = (v.x0 + v.x1) / 2, out = [];
        for (let i = 0; i < N; i++) {
          const Z = PZ[i] + S.D; if (Z < 10) continue;
          const s = foc / Z, dx = cxs + PX[i] * s - px, dy = horY - (PY[i] - camH) * s - py;
          if (dx * dx + dy * dy < R * R) out.push(i);
        }
        return out;
      }

      function setup(scene) {
        cfg.scene = scene; S = SCN[scene];
        horY = H * S.horF; foc = ((0.65 * W) / 2) * (S.D / 150);
        N = 0; landed = 0; cfg.roost = false; feathers.length = 0;
        target = Math.round(S.n * kA);
        center(VT);
        spawnGroup(target, C.x, C.y, C.z, rnd(TAU));
        FA.mode = 'patrouille'; FA.next = rnd(26, 14); FA.x = C.x + 150; FA.y = C.y + 100; FA.z = C.z;
        buildReeds(); lastSky = -1;
        for (let k = 0; k < 140; k++) { VT += 1 / 30; center(VT); step(1 / 30); }
        bg.save(); bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, BL.w, BL.h); bg.restore();
      }
      function setCount(n) {
        target = n;
        if (N > n) N = n;
        else if (N < n) { const k = n - N; center(VT); spawnGroup(k, C.x + gauss() * 30, C.y, C.z, rnd(TAU)); }
      }
      function scare(px, py) {
        const ids = nearestScreen(px, py, 80);
        const v = view(), cxs = (v.x0 + v.x1) / 2;
        for (const i of ids) { AL[i] = 1; LAT[i] = 0.1; TS[i] = (cxs + PX[i] * (foc / (PZ[i] + S.D))) > px ? 1 : -1; }
        return ids.length;
      }

      setup('marais');
      quiet = false;
      let impT = 4, windT = 0.5, chatT = 0.3, waveT = 3, alarmFrac = 0, polar = 0, statT = 0;
      const drones = [];
      if (au && au.live) drones.push(au.drone(73.4, 'sine', 0.008));

      return {
        frame(tt, dt) {
          VT += dt;
          if (cfg.flow && dt > 0) {
            cfg.hour = Math.min(1, cfg.hour + dt / 480);
            if (cfg.hour > 0.9 && !cfg.roost && N > 0 && cfg.scene === 'marais') cfg.roost = true;
            if (cfg.hour >= 1 && N === 0) { cfg.hour = 0.2; cfg.roost = false; }
            if (cfg.scene === 'estran' && cfg.hour >= 1) cfg.hour = 0.15;
          }
          if (N > 50 && !cfg.roost && (impT -= dt) <= 0) { impT = rnd(7, 2.5); const i = rint(N); AL[i] = rnd(0.62, 0.5); LAT[i] = 0.1; TS[i] = Math.random() < 0.5 ? 1 : -1; }
          if (guide.k > 0 && !guide.hold) guide.k = Math.max(0, guide.k - dt / 8);
          center(VT);
          const n = Math.max(1, Math.ceil(dt / 0.034)), h = dt / n;
          for (let s = 0; s < n && dt > 0; s++) { step(h); falcon(h); }
          for (let i = feathers.length - 1; i >= 0; i--) {
            const p = feathers[i]; p.life -= dt; p.vy -= 1.2 * dt; p.vx *= 1 - dt; p.vz *= 1 - dt; p.vy = Math.max(p.vy, -1.6);
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.a += dt * 3;
            if (p.life <= 0 || p.y < 0) feathers.splice(i, 1);
          }
          if (N < target && !cfg.roost && landed === 0 && Math.random() < dt * 0.4) { const k = Math.min(target - N, 120); const e = Math.random() < 0.5 ? -1 : 1; spawnGroup(k, C.x + e * 260, C.y + rnd(30, -10), C.z + rnd(60, -60), e > 0 ? Math.PI : 0); }
          if ((statT -= dt) <= 0 && N) {
            statT = 0.3;
            let sx = 0, sy = 0, sz = 0, a = 0;
            const st = Math.max(1, (N / 600) | 0);
            let m = 0;
            for (let i = 0; i < N; i += st) { const v = Math.hypot(VX[i], VY[i], VZ[i]) || 1; sx += VX[i] / v; sy += VY[i] / v; sz += VZ[i] / v; if (AL[i] > 0.3) a++; m++; }
            polar = Math.hypot(sx, sy, sz) / m; alarmFrac = a / m;
          }
          if (snd()) {
            if ((windT -= dt) <= 0) { windT = 0.55; const g = Math.min(1, N / 5000) * 0.014 * (1 + alarmFrac * 4); if (g > 0.001) au.noise(0.8, g, rnd(1500, 900), 0.6, 'bandpass'); }
            if ((chatT -= dt) <= 0) {
              chatT = rnd(0.35, 0.08) * (cfg.scene === 'estran' ? 2 : 1);
              const g = Math.min(1, N / 4000) * 0.004;
              if (cfg.scene === 'marais') { if (Math.random() < 0.2) au.note(rnd(3200, 2200), 0.16, 'sine', g, rnd(4200, 1800)); else au.note(rnd(4500, 1800), 0.035, 'triangle', g); }
              else au.note(rnd(3600, 2800), 0.06, 'sine', g * 0.8, rnd(3400, 2600));
            }
            if (cfg.scene === 'estran' && (waveT -= dt) <= 0) { waveT = rnd(6, 3.5); au.noise(2.6, 0.03, 650, 0.5, 'lowpass', 180); }
          }
          const vk = view(), vkey = vk.x0 + ',' + vk.x1;
          if (Math.abs(cfg.hour - lastSky) > 0.004 || lastScene !== cfg.scene || lastMode !== cfg.view || lastView !== vkey) { lastView = vkey; renderSky(); }

          if (cfg.trail) { bg.save(); bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalCompositeOperation = 'destination-out'; bg.fillStyle = `rgba(0,0,0,${clamp(dt * 9, 0.05, 1).toFixed(3)})`; bg.fillRect(0, 0, BL.w, BL.h); bg.restore(); }
          else { bg.save(); bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, BL.w, BL.h); bg.restore(); }
          drawBirds(dt);

          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
          ctx.drawImage(skyL.c, 0, 0, W, H);
          if (cfg.refl) {
            const y0 = horY, y1 = cfg.scene === 'marais' ? horY + H * 0.075 : H;
            ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, y1 - y0); ctx.clip();
            ctx.translate(0, 2 * horY); ctx.scale(1, -1);
            ctx.globalAlpha = cfg.scene === 'marais' ? 0.35 : 0.42;
            ctx.drawImage(BL.c, 0, 0, W, H);
            ctx.restore(); ctx.globalAlpha = 1;
            if (cfg.scene === 'estran') {
              ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.beginPath();
              for (let k = 0; k < 14; k++) { const y = horY + ((k / 14 + VT * 0.006) % 1) ** 1.8 * (H - horY) * 0.62; ctx.moveTo(0, y); ctx.lineTo(W, y + Math.sin(k + VT * 0.3) * 2); }
              ctx.stroke();
            }
          }
          ctx.drawImage(BL.c, 0, 0, W, H);
          if (reeds.length) {
            const sil = cfg.view === 'neon' ? '#030208' : css(mix(skyAt(cfg.hour)[2], [0, 0, 0], 0.88), 1);
            const gust = 0.05 * Math.sin(VT * 0.4) + 0.025 * Math.sin(VT * 1.1);
            ctx.fillStyle = sil; ctx.strokeStyle = sil; ctx.lineCap = 'round';
            const st = new Path2D(), pp = new Path2D();
            for (const r of reeds) {
              const k = clamp(r.c * 0.2 + gust + 0.02 * Math.sin(VT * 1.6 + r.x * 0.02 + r.ph), -0.6, 0.6), tx = r.x + k * r.h, ty = H + 2 - r.h, cx = r.x + k * r.h * 0.3, cy = H - r.h * 0.5;
              st.moveTo(r.x, H + 2); st.quadraticCurveTo(cx, cy, tx, ty);
              if (r.plume) { const pa = Math.atan2(ty - cy, tx - cx), pl = r.h * 0.1; pp.moveTo(tx + Math.cos(pa) * pl * 1.6, ty + Math.sin(pa) * pl * 1.6); pp.ellipse(tx + Math.cos(pa) * pl * 0.6, ty + Math.sin(pa) * pl * 0.6, pl, pl * 0.24, pa, 0, TAU); }
            }
            ctx.lineWidth = 1.3 * kA; ctx.stroke(st); ctx.fill(pp);
          }
        },
        down(p) {
          const tool = env.tool;
          this._mode = null; this._d = 0;
          if (tool === 'guider' || !tool) {
            const g = unproject(p.x, p.y, C.z);
            guide.x = g.x; guide.y = Math.max(8, g.y); guide.z = g.z; guide.k = 1; guide.hold = true; this._mode = 'guide';
            return;
          }
          if (tool === 'effrayer') {
            const n = scare(p.x, p.y);
            if (snd()) { au.noise(0.12, 0.08, 2200, 1.2, 'bandpass'); if (n) au.noise(1.2, 0.04, 1300, 0.7, 'bandpass', 600); }
            if (navigator.vibrate) navigator.vibrate(12);
            return;
          }
          if (tool === 'faucon') {
            const ids = nearestScreen(p.x, p.y, 60);
            attack(ids.length ? ids[rint(ids.length)] : -1);
            return;
          }
          if (tool === 'nuee') { this._mode = 'nuee'; release(p.x, p.y); }
        },
        move(p) {
          if (!p.down || !this._mode) return;
          if (this._mode === 'guide') { const g = unproject(p.x, p.y, C.z); guide.x = g.x; guide.y = Math.max(8, g.y); guide.z = g.z; }
          else if (this._mode === 'nuee') { this._d += Math.hypot(p.dx, p.dy); if (this._d > 30) { this._d = 0; release(p.x, p.y); } }
        },
        up() { guide.hold = false; this._mode = null; },
        dispose() { drones.forEach((d) => d.stop()); },
        livePaused: true,
        clear() { N = 0; landed = 0; target = 0; feathers.length = 0; cfg.roost = false; },
        ui() {
          const L = [{ type: 'section', label: 'La nuée' }];
          L.push({ type: 'bar', label: 'Ordre (polarisation)', color: '#c9a8ff', value: N ? polar : 0, txt: N ? Math.round(polar * 100) + ' %' : '—' });
          L.push({ type: 'bar', label: 'Vigilance', color: '#ff7a6a', value: N ? Math.min(1, alarmFrac * 3) : 0, txt: N ? Math.round(alarmFrac * 100) + ' % en fuite' : '—' });
          L.push({ type: 'note', text: `${N.toLocaleString('fr-FR')} oiseaux en vol` + (landed ? ` · ${landed.toLocaleString('fr-FR')} au dortoir` : '') });
          L.push({ type: 'slider', label: 'Nombre d’oiseaux', min: 0, max: NMAX, step: 100, value: target, fmt: (v) => v.toLocaleString('fr-FR'), set: (v) => setCount(Math.round(v)) });
          L.push({ type: 'section', label: 'Lieu' });
          L.push({ type: 'choice', label: 'Espèce et paysage', value: cfg.scene, options: [{ id: 'marais', label: 'Étourneaux · marais' }, { id: 'estran', label: 'Bécasseaux · estran' }], set: (v) => { if (v !== cfg.scene) setup(v); } });
          L.push({ type: 'section', label: 'Règles de la nuée' });
          L.push({ type: 'slider', label: 'Cohésion', min: 0, max: 3, step: 0.05, value: cfg.coh, fmt: (v) => '×' + v.toFixed(2), set: (v) => { cfg.coh = v; } });
          L.push({ type: 'slider', label: 'Alignement', min: 0, max: 3, step: 0.05, value: cfg.ali, fmt: (v) => '×' + v.toFixed(2), set: (v) => { cfg.ali = v; } });
          L.push({ type: 'slider', label: 'Séparation', min: 0, max: 3, step: 0.05, value: cfg.sep, fmt: (v) => '×' + v.toFixed(2), set: (v) => { cfg.sep = v; } });
          L.push({ type: 'slider', label: 'Voisins suivis', min: 1, max: 24, step: 1, value: cfg.topo, fmt: (v) => v + (v > 1 ? ' voisins' : ' voisin'), set: (v) => { cfg.topo = v; } });
          L.push({ type: 'slider', label: 'Vitesse de vol', min: 0.5, max: 1.6, step: 0.05, value: cfg.speed, fmt: (v) => Math.round(S.v0 * v * 3.6) + ' km/h', set: (v) => { cfg.speed = v; } });
          L.push({ type: 'buttons', items: [{ label: 'Valeurs naturelles', act: () => Object.assign(cfg, NAT) }] });
          L.push({ type: 'section', label: 'Faucon pèlerin' });
          L.push({ type: 'toggle', label: 'Un faucon chasse ici', value: cfg.falcon, set: (v) => { cfg.falcon = v; if (v) { FA.x = C.x + 200; FA.y = C.y + 160; FA.z = C.z; FA.mode = 'patrouille'; } } });
          L.push({ type: 'toggle', label: 'Attaques spontanées', value: cfg.auto, set: (v) => { cfg.auto = v; } });
          L.push({ type: 'buttons', items: [{ label: 'Lancer une attaque', act: () => attack(-1) }] });
          L.push({ type: 'section', label: 'Le soir' });
          L.push({ type: 'slider', label: 'Heure', min: 0, max: 1, step: 0.005, value: cfg.hour, fmt: (v) => { const m = 19 * 60 + 10 + Math.round(v * 100); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); }, set: (v) => { cfg.hour = v; } });
          L.push({ type: 'toggle', label: 'Le temps passe (le soleil se couche)', value: cfg.flow, set: (v) => { cfg.flow = v; } });
          // dortoir dans les roseaux : seulement au marais (l’estran n’a pas de roselière)
          if (cfg.scene === 'marais' || cfg.roost || landed) L.push({ type: 'buttons', items: [cfg.roost || landed ? { label: 'Réveil : tous en vol', act: () => { cfg.roost = false; } } : { label: 'Au dortoir dans les roseaux', act: () => { cfg.roost = true; } }] });
          L.push({ type: 'section', label: 'Affichage' });
          L.push({ type: 'choice', label: 'Rendu', value: cfg.view, options: [{ id: 'reel', label: 'Réaliste' }, { id: 'neon', label: 'Néon' }], set: (v) => { cfg.view = v; } });
          L.push({ type: 'toggle', label: 'Traînées de vol', value: cfg.trail, set: (v) => { cfg.trail = v; } });
          L.push({ type: 'toggle', label: 'Reflets dans l’eau', value: cfg.refl, set: (v) => { cfg.refl = v; } });
          return L;
        },
      };

      function release(px, py) {
        const g = unproject(px, py, C.z + rnd(30, -30));
        spawnGroup(60, g.x, Math.max(6, g.y), g.z, Math.atan2(C.z - g.z, C.x - g.x) + rnd(0.6, -0.6));
        target = Math.max(target, N);
        if (snd()) au.noise(0.6, 0.025, 1300, 0.7, 'bandpass');
      }
    },
  });
})();
