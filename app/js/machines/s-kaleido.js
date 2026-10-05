/* Fascinations — Le Kaléidoscope · éclats de verre, miroirs (WebGL2)
   La cellule d'objets : des éclats de verre coloré et des perles, éclairés par derrière, qui roulent sous la
   gravité quand on tourne le tube (physique de disques, en 2D). Les miroirs : chaque pixel de l'oculaire est
   replié par réflexions successives jusque dans le domaine fondamental (un secteur pour deux miroirs, un triangle
   pour trois), puis on lit la cellule à cet endroit. Chaque réflexion perd quelques pour cent de lumière, comme un
   vrai miroir : les reflets lointains s'assombrissent. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint } = window.FK;
  const { GLKit, HEAD } = window.FKGL;

  const MIRRORS = {
    m3: { label: '2 miroirs à 60° (6)', kind: 0, n: 3 },
    m4: { label: '2 miroirs à 45° (8)', kind: 0, n: 4 },
    m6: { label: '2 miroirs à 30° (12)', kind: 0, n: 6 },
    m8: { label: '2 miroirs à 22,5° (16)', kind: 0, n: 8 },
    t60: { label: '3 miroirs 60-60-60', kind: 1, tri: [60, 60, 60] },
    t45: { label: '3 miroirs 90-45-45', kind: 1, tri: [90, 45, 45] },
    t30: { label: '3 miroirs 90-60-30', kind: 1, tri: [90, 60, 30] },
  };
  const PALS = {
    vitrail: ['#d62828', '#f77f00', '#fcbf49', '#2a9d8f', '#3a86ff', '#8338ec', '#06d6a0', '#ef476f'],
    ocean: ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#2ec4b6', '#e0fbfc', '#3d5a80', '#98c1d9'],
    automne: ['#9b2226', '#ae2012', '#bb3e03', '#ca6702', '#ee9b00', '#e9d8a6', '#94d2bd', '#5f0f40'],
    bonbon: ['#ff70a6', '#ff9770', '#ffd670', '#e9ff70', '#70d6ff', '#c77dff', '#ff477e', '#7bf1a8'],
  };
  const keep = { mirror: 'm6', obj: 'eclats', pal: 'vitrail', auto: true, zoom: 1, loss: 0.06, count: 58, tinkle: true };

  const FS_VIEW = HEAD + `
uniform sampler2D uO; uniform vec4 uRect; uniform vec2 uRes; uniform int uKind, uN; uniform vec3 uE0, uE1, uE2; uniform float uScale, uLoss, uInk, uRot;
out vec4 o;
void main(){
  vec2 fc = gl_FragCoord.xy; vec2 c = uRect.xy + uRect.zw * .5; float R = min(uRect.z, uRect.w) * .5;
  vec2 p = (fc - c) / R; float r = length(p);
  vec3 bg = uInk > .5 ? vec3(.955, .94, .91) : vec3(.01, .01, .015);
  if (r > 1.){ float b = smoothstep(1.06, 1., r); o = vec4(mix(bg, uInk > .5 ? vec3(.2, .18, .2) : vec3(.12, .1, .09), b), 1.); return; }
  p *= uScale; float cnt = 0.;
  if (uKind == 0){
    float w = 3.14159265 / float(uN), th = atan(p.y, p.x) + 3.14159265 * .5, k = floor(th / w);
    float t = th - k * w; if (mod(k, 2.) > .5) t = w - t; cnt = min(abs(k), abs(k - 2. * float(uN))) ;
    p = length(p) * vec2(cos(t - 3.14159265 * .5 + w * .5), sin(t - 3.14159265 * .5 + w * .5));
    p.y -= .0;
  } else {
    // repli dans le triangle : on réfléchit sur chaque côté tant qu'on est du mauvais côté
    for (int i = 0; i < 48; i++){
      bool f = false; float d;
      d = dot(p, uE0.xy) - uE0.z; if (d > 0.){ p -= 2. * d * uE0.xy; cnt += 1.; f = true; }
      d = dot(p, uE1.xy) - uE1.z; if (d > 0.){ p -= 2. * d * uE1.xy; cnt += 1.; f = true; }
      d = dot(p, uE2.xy) - uE2.z; if (d > 0.){ p -= 2. * d * uE2.xy; cnt += 1.; f = true; }
      if (!f) break;
    }
  }
  float cs = cos(uRot), sn = sin(uRot); vec2 q = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);
  vec3 col = texture(uO, q * .31 + .5).rgb;                          // la partie centrale de la cellule
  col *= pow(1. - uLoss, cnt);                                        // chaque reflet coûte un peu de lumière
  col *= 1. - .35 * smoothstep(.75, 1., r);                            // l'oculaire
  o = vec4(col, 1.);
}`;

  window.FASC.push({
    id: 'kaleido', name: 'Le Kaléidoscope', cat: 'Motifs', glyph: '✺', smoothTime: true,
    blurb: 'De vrais éclats de verre, deux ou trois miroirs',
    hint: 'Glissez pour tourner le tube : les éclats roulent. Touchez pour secouer.',
    intro: 'Quelques éclats de verre coloré au bout d’un tube, deux ou trois miroirs en long : David Brewster invente le kaléidoscope en 1816 en étudiant la polarisation de la lumière. Son nom, il le forge du grec : kalos, beau ; eidos, image ; skopein, regarder. « Regarder de belles images. »',
    about: [
      'Avec deux miroirs faisant un angle de 180°/n, on voit 2n copies de l’objet, disposées en rosace : l’angle doit diviser exactement le demi-tour, sinon les reflets ne se raccordent pas. Avec trois miroirs, les reflets se reflètent à leur tour sans fin et pavent tout le champ de vision. Seuls trois triangles le permettent sans défaut : 60-60-60, 90-45-45 et 90-60-30. Ce sont aussi trois des « groupes de pavage » que les mathématiciens ont classés (il y en a 17 en tout).',
      'Chaque reflet sur un miroir argenté perd environ 5 à 8 % de la lumière : les copies lointaines sont plus sombres. Le réglage « perte par reflet » le simule ; à zéro, on obtient un kaléidoscope idéal, d’une profondeur irréelle.',
      'Les éclats sont éclairés par derrière, à travers un verre dépoli : là où deux éclats se chevauchent, leurs couleurs se soustraient (comme deux filtres superposés), d’où des teintes plus sombres et plus riches. Le tube tourne, la gravité fait rouler les objets : la même image ne revient jamais. Brewster a vendu 200 000 kaléidoscopes en trois mois, sans en toucher les bénéfices : son brevet avait été copié.',
    ],
    tools: [
      { id: 'tourner', label: 'tourner', desc: 'Glissez autour du centre pour tourner le tube.' },
      { id: 'secouer', label: 'secouer', desc: 'Touchez : les éclats sautent.' },
    ],
    make(env) {
      try { return makeK(env); } catch (e) {
        console.warn('Le Kaléidoscope : WebGL2 indisponible', e);
        return { frame() { env.ctx.fillStyle = '#05050a'; env.ctx.fillRect(0, 0, env.w, env.h); env.ctx.fillStyle = '#ccc'; env.ctx.fillText('Le Kaléidoscope demande WebGL2.', 20, env.h / 2); } };
      }
    },
  });

  function makeK(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = Math.min(1.5, env.dpr || 1), cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    const K = GLKit(cw, ch), gl = K.gl;
    const PV = K.program(FS_VIEW);
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };
    const ink = () => env.theme === 'light';
    let T = 0, rot = 0, rotV = 0.05, toast = null, drag = null;

    /* ───────── la cellule d'objets (canevas 2D → texture) ───────── */
    const CS = 640, cell = document.createElement('canvas'); cell.width = cell.height = CS;
    const cg = cell.getContext('2d');
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    let pieces = [];
    function makePieces() {
      pieces = [];
      const pal = PALS[keep.pal], n = keep.count;
      for (let i = 0; i < n; i++) {
        const kind = keep.obj === 'perles' ? 'perle' : keep.obj === 'eclats' ? (Math.random() < 0.82 ? 'eclat' : 'perle') : Math.random() < 0.5 ? 'goutte' : 'eclat';
        const r = kind === 'perle' ? rnd(0.085, 0.045) : rnd(0.22, 0.09);
        const verts = []; const nv = 3 + rint(4);
        for (let j = 0; j < nv; j++) { const a = (j / nv) * TAU + rnd(0.6, -0.3); verts.push([Math.cos(a) * r * rnd(1.1, 0.6), Math.sin(a) * r * rnd(1.1, 0.6)]); }
        const ang = rnd(TAU), d = Math.sqrt(Math.random()) * 0.75;
        pieces.push({ kind, r: r * 0.8, x: Math.cos(ang) * d, y: Math.sin(ang) * d, vx: 0, vy: 0, a: rnd(TAU), w: 0, col: pal[rint(pal.length)], verts });
      }
    }
    makePieces();
    let lastTink = 0;
    function physics(k) {
      // gravité dans le repère de la cellule : le tube tourne, « le bas » tourne avec lui
      const g = 0.9, gx = Math.sin(rot) * g, gy = -Math.cos(rot) * g, dt = Math.min(k, 0.033) / 2;
      for (let s = 0; s < 2; s++) {
        for (const p of pieces) { p.vx += gx * dt; p.vy += gy * dt; p.vx *= 0.995; p.vy *= 0.995; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.w * dt; p.w *= 0.99; }
        for (let i = 0; i < pieces.length; i++) {
          const p = pieces[i];
          const d = Math.hypot(p.x, p.y), lim = 0.96 - p.r;
          if (d > lim) { const nx = p.x / d, ny = p.y / d; p.x = nx * lim; p.y = ny * lim; const vn = p.vx * nx + p.vy * ny; if (vn > 0) { p.vx -= 1.4 * vn * nx; p.vy -= 1.4 * vn * ny; p.w += (p.vx * -ny + p.vy * nx) * 3; } }
          for (let j = i + 1; j < pieces.length; j++) {
            const q = pieces[j], dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy), m = p.r + q.r;
            if (dd < m && dd > 1e-6) {
              const nx = dx / dd, ny = dy / dd, o = (m - dd) / 2; p.x -= nx * o; p.y -= ny * o; q.x += nx * o; q.y += ny * o;
              const rv = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
              if (rv < 0) {
                const imp = -1.3 * rv / 2; p.vx -= imp * nx; p.vy -= imp * ny; q.vx += imp * nx; q.vy += imp * ny;
                p.w -= rv * 2; q.w += rv * 2;
                if (keep.tinkle && -rv > 0.35 && au && au.on && T - lastTink > 0.06) { lastTink = T; au.note(rnd(3600, 2200), 0.25, 'sine', Math.min(0.02, -rv * 0.012)); }
              }
            }
          }
        }
      }
    }
    function drawCell() {
      const L = CS, c = L / 2, s = L * 0.5;
      // verre dépoli éclairé par derrière
      const bgG = cg.createRadialGradient(c, c, 0, c, c, c * 1.1); bgG.addColorStop(0, '#f6eedf'); bgG.addColorStop(1, '#cfc3b0');
      cg.globalCompositeOperation = 'source-over'; cg.fillStyle = bgG; cg.fillRect(0, 0, L, L);
      if (keep.obj === 'huile') {
        // tube à huile : gouttes de couleur qui flottent doucement
        for (const p of pieces) { const x = c + p.x * s, y = c - p.y * s, R = p.r * s * 1.6; const g = cg.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, p.col); g.addColorStop(1, 'rgba(255,255,255,0)'); cg.globalCompositeOperation = 'multiply'; cg.fillStyle = g; cg.beginPath(); cg.arc(x, y, R, 0, TAU); cg.fill(); }
      }
      cg.globalCompositeOperation = 'multiply';
      for (const p of pieces) {
        if (keep.obj === 'huile' && p.kind === 'goutte') continue;
        const x = c + p.x * s, y = c - p.y * s;
        cg.save(); cg.translate(x, y); cg.rotate(p.a);
        if (p.kind === 'perle') {
          const R = p.r * s * 1.1, g = cg.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, p.col); g.addColorStop(1, '#202030');
          cg.fillStyle = g; cg.beginPath(); cg.arc(0, 0, R, 0, TAU); cg.fill();
        } else {
          cg.fillStyle = p.col; cg.globalAlpha = 0.9; cg.beginPath(); p.verts.forEach(([vx, vy], j) => (j ? cg.lineTo(vx * s, vy * s) : cg.moveTo(vx * s, vy * s))); cg.closePath(); cg.fill();
          cg.globalAlpha = 1; cg.strokeStyle = 'rgba(40,30,40,.55)'; cg.lineWidth = 1.5; cg.stroke();
        }
        cg.restore();
      }
      // reflets sur les arêtes des éclats
      cg.globalCompositeOperation = 'screen';
      for (const p of pieces) { if (p.kind !== 'eclat') continue; const x = c + p.x * s, y = c - p.y * s; cg.save(); cg.translate(x, y); cg.rotate(p.a); cg.strokeStyle = 'rgba(255,255,255,.35)'; cg.lineWidth = 1; cg.beginPath(); const [a, b] = [p.verts[0], p.verts[1]]; cg.moveTo(a[0] * s * 0.9, a[1] * s * 0.9); cg.lineTo(b[0] * s * 0.9, b[1] * s * 0.9); cg.stroke(); cg.restore(); }
      cg.globalCompositeOperation = 'source-over';
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cell);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }

    /* ───────── les miroirs ───────── */
    function triEdges(angles, size) {
      // triangle de sommets A, B, C (angles en A, B, C), centré sur son centre de gravité ; normales sortantes
      const [a, b] = angles.map((x) => (x * Math.PI) / 180);
      const A = [0, 0], B = [1, 0], C = [Math.tan(b) / (Math.tan(a) + Math.tan(b)), (Math.tan(a) * Math.tan(b)) / (Math.tan(a) + Math.tan(b))];
      const g = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3], P = [A, B, C].map((q) => [(q[0] - g[0]) * size, (q[1] - g[1]) * size]);
      const E = [];
      for (let i = 0; i < 3; i++) { const p = P[i], q = P[(i + 1) % 3]; let nx = q[1] - p[1], ny = -(q[0] - p[0]); const l = Math.hypot(nx, ny); nx /= l; ny /= l; if (nx * -p[0] + ny * -p[1] > 0) { nx = -nx; ny = -ny; } E.push([nx, ny, nx * p[0] + ny * p[1]]); }
      return E;
    }
    function render() {
      drawCell();
      const v = view(), s = Math.min(v.w * 0.92, H * 0.88), r = [(v.cx - s / 2) * dpr, (H / 2 - s / 2) * dpr, s * dpr, s * dpr];
      const M = MIRRORS[keep.mirror];
      PV.use().t('uO', tex).f('uRect', ...r).f('uRes', cw, ch).i('uKind', M.kind).i('uN', M.n || 3).f('uScale', (M.kind ? 2.2 : 1.05) / keep.zoom).f('uLoss', keep.loss).f('uInk', ink() ? 1 : 0).f('uRot', 0);
      if (M.kind) { const E = triEdges(M.tri, 1.25); PV.f('uE0', ...E[0]).f('uE1', ...E[1]).f('uE2', ...E[2]); }
      K.run(PV, null);
      ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(K.canvas, 0, 0, W, H); ctx.restore();
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = ink() ? 'rgba(40,30,60,.75)' : 'rgba(235,230,255,.7)';
      ctx.fillText(`${MIRRORS[keep.mirror].label.toUpperCase()} · ${pieces.length} ${keep.obj === 'perles' ? 'PERLES' : 'OBJETS'} DANS LA CELLULE`, v.x0 + 18, H - 16);
      if (toast && T - toast.t < 3) { ctx.globalAlpha = Math.min(1, (3 - (T - toast.t)) * 1.5); ctx.textAlign = 'center'; ctx.font = 'italic 500 15px "Space Grotesk", sans-serif'; ctx.fillText(toast.s, v.cx, 70); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    }
    function update(k) {
      T += k;
      if (keep.auto && !drag) rotV += (0.12 - rotV) * Math.min(1, k * 0.5);
      rot += rotV * k; if (!drag) rotV *= Math.exp(-k * 0.2);
      if (keep.auto && !drag && Math.abs(rotV) < 0.1) rotV = 0.1 * Math.sign(rotV || 1);
      physics(k);
    }
    if (window.FASC_DEBUG) window.FASC_DEBUG.kal = { keep, makePieces, run(n, h) { for (let i = 0; i < n; i++) update(h / 0.4); render(); } };
    // laisser les éclats se poser avant le premier regard
    for (let i = 0; i < 90; i++) update(1 / 30);

    return {
      livePaused: true,
      frame(t, dt) { if (dt > 0) update(dt / 0.4); render(); },
      down(p) {
        if (env.tool === 'secouer') { for (const q of pieces) { q.vx += rnd(1.5, -1.5); q.vy += rnd(1.5, -1.5); q.w += rnd(8, -8); } toast = { s: 'Secoué !', t: T }; return; }
        const v = view(); drag = { a: Math.atan2(p.y - H / 2, p.x - v.cx) };
      },
      move(p) {
        if (!p.down || !drag) return;
        const v = view(), a = Math.atan2(p.y - H / 2, p.x - v.cx); let d = a - drag.a; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
        rot -= d; rotV = -d * 20; drag.a = a;
      },
      up() { drag = null; },
      clear() { makePieces(); for (let i = 0; i < 60; i++) update(1 / 30); },
      dispose() { K.lose(); },
      ui() {
        return [
          { type: 'section', label: 'Miroirs' },
          { type: 'choice', label: 'Disposition', value: keep.mirror, set: (x) => { keep.mirror = x; }, options: Object.keys(MIRRORS).map((k) => ({ id: k, label: MIRRORS[k].label })) },
          { type: 'slider', label: 'Perte par reflet', min: 0, max: 0.2, step: 0.005, value: keep.loss, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { keep.loss = x; } },
          { type: 'slider', label: 'Grossissement', min: 0.5, max: 2.5, step: 0.01, value: keep.zoom, fmt: (x) => '×' + x.toFixed(2).replace('.', ','), set: (x) => { keep.zoom = x; } },
          { type: 'section', label: 'Cellule' },
          { type: 'choice', label: 'Objets', value: keep.obj, set: (x) => { keep.obj = x; makePieces(); }, options: [{ id: 'eclats', label: 'Éclats de verre' }, { id: 'perles', label: 'Perles' }, { id: 'huile', label: 'Tube à huile' }] },
          { type: 'choice', label: 'Couleurs', value: keep.pal, set: (x) => { keep.pal = x; makePieces(); }, options: [{ id: 'vitrail', label: 'Vitrail' }, { id: 'ocean', label: 'Océan' }, { id: 'automne', label: 'Automne' }, { id: 'bonbon', label: 'Bonbons' }] },
          { type: 'slider', label: 'Nombre', min: 8, max: 70, step: 1, value: keep.count, fmt: (x) => String(x), set: (x) => { keep.count = x; makePieces(); } },
          { type: 'toggle', label: 'Le tube tourne tout seul', value: keep.auto, set: (x) => { keep.auto = x; } },
          { type: 'toggle', label: 'Tintement (avec le son)', value: keep.tinkle, set: (x) => { keep.tinkle = x; } },
          { type: 'note', text: 'Deux miroirs : une rosace. Trois miroirs : le motif se répète à l’infini. Tournez le tube en faisant glisser le doigt autour du centre : les éclats roulent, l’image ne revient jamais.' },
        ];
      },
    };
  }
})();
