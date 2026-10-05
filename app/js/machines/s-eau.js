/* Fascination — L'Eau · la mare, ses rides et sa lumière (WebGL2)
   Surface : équation d'onde sur GPU (vitesse liée à la profondeur, bords absorbants, murs réfléchissants).
   Lumière : caustiques par tracé de rayons réfractés (maillage déformé, rapport d'aires), reflets du soleil,
   absorption de l'eau. Vie : gerris qui chassent aux ondes, gyrins en radeau, koïs sous la surface,
   nénuphars, mouches tombées. Expériences de la cuve à ondes : interférences, diffraction, réfraction, Doppler.
   Repli automatique sur l'ancienne Eau en 2D si WebGL2 manque. */
(function boot() {
  if (!window.FK || !window.FKGL) return setTimeout(boot, 12);
  const { TAU, clamp, rnd, rint, buf, blit, layer } = window.FK;
  const { GLKit, HEAD } = window.FKGL;
  const n1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); const hsh = (k) => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; return hsh(i) * (1 - u) + hsh(i + 1) * u; };
  const angd = (a, b) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

  const KOI = [
    { nom: 'Kohaku', desc: 'blanc à taches rouges' },
    { nom: 'Ogon', desc: 'or métallique' },
    { nom: 'Showa', desc: 'noir, rouge et blanc' },
    { nom: 'Asagi', desc: 'bleu ardoise, flancs orangés' },
    { nom: 'Chagoi', desc: 'bronze, le plus familier' },
  ];

  /* ───────── shaders ───────── */
  const SRC_DECL = `uniform int uNS; uniform vec4 uSrc[64];`;
  const FS = {
    // une étape de l'équation d'onde : h_tt = c² ∇²h, avec murs, amortissement et éponge sur les bords
    wave: HEAD + SRC_DECL + `
uniform sampler2D uW, uD; uniform vec2 uWt, uRes; uniform float uK, uDamp, uSponge, uCellPx, uVisc; uniform vec4 uLine;
uniform int uNP; uniform vec4 uPad[16];
out vec4 o;
float hh(vec2 q, float self){ return texture(uD, q).g > .5 ? self : texture(uW, q).r; }
void main(){
  vec4 w = texture(uW, vUv), d = texture(uD, vUv);
  if (d.g > .5){ o = vec4(0., 0., w.b * .99, 0.); return; }
  float avg = (hh(vUv - vec2(uWt.x, 0.), w.r) + hh(vUv + vec2(uWt.x, 0.), w.r) + hh(vUv - vec2(0., uWt.y), w.r) + hh(vUv + vec2(0., uWt.y), w.r)) * .25;
  w.g += (avg - w.r) * uK * max(d.r, .08);
  // viscosité : les rides les plus fines s'éteignent les premières
  float avgG = (texture(uW, vUv - vec2(uWt.x, 0.)).g + texture(uW, vUv + vec2(uWt.x, 0.)).g + texture(uW, vUv - vec2(0., uWt.y)).g + texture(uW, vUv + vec2(0., uWt.y)).g) * .25;
  w.g = mix(w.g, avgG, uVisc);
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  float e = min(min(p.x, uRes.x - p.x), min(p.y, uRes.y - p.y));
  float sp = uSponge * (1. - smoothstep(0., 46., e));
  float pd = 0.;
  for (int i = 0; i < 16; i++){ if (i >= uNP) break; vec2 q = p - uPad[i].xy; pd = max(pd, 1. - smoothstep(uPad[i].z * .8, uPad[i].z, length(q))); }
  w.g *= uDamp * (1. - sp * .12) * (1. - pd * .1);
  w.r += w.g;
  w.r *= 1. - sp * .04 - pd * .03;
  for (int i = 0; i < 64; i++){
    if (i >= uNS) break;
    vec4 s = uSrc[i]; float dd = length(p - s.xy), rr = max(s.w, uCellPx * 2.2);
    if (dd < rr){ float f = cos(dd / rr * 1.5708); w.r += 3. * s.z * f * f * min(1., s.w * s.w / (rr * rr) * 2.5 + .35); }
  }
  if (uLine.w > .5 && abs(p.x - uLine.x) < uLine.z) { w.r = uLine.y; w.g = 0.; }
  w.b = mix(w.b, w.r * w.r, .006);
  o = w;
}`,

    caustFS: `#version 300 es
precision highp float;
in vec2 vOld; in vec2 vNew; in float vWall; uniform float uGain; out vec4 o;
void main(){
  vec2 ox = dFdx(vOld), oy = dFdy(vOld), nx = dFdx(vNew), ny = dFdy(vNew);
  float a0 = abs(ox.x * oy.y - ox.y * oy.x), a1 = abs(nx.x * ny.y - nx.y * ny.x);
  o = vec4(a0 / max(a1, a0 * .025) * uGain * (1. - vWall), 0., 0., 1.);
}`,

    comp: HEAD + `
uniform sampler2D uW, uD, uCau, uFloor; uniform vec2 uRes, uWt, uSunDir;
uniform float uTime, uSlope, uRefr, uSun, uDecor, uInk, uTank, uGlint, uMean, uDepth, uCell; uniform vec2 uCauT;
uniform vec3 uWater, uPaper, uSky;
uniform int uNF; uniform vec4 uF0[8]; uniform vec4 uF1[8];
uniform int uNC; uniform vec4 uC[48];
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
vec2 toUv(vec2 q){ return vec2(q.x / uRes.x, 1. - q.y / uRes.y); }
// caustiques lissées (les facettes du maillage disparaissent)
float cauAt(vec2 uv){ return (texture(uCau, uv).r * 2. + texture(uCau, uv + vec2(uCauT.x, 0.)).r + texture(uCau, uv - vec2(uCauT.x, 0.)).r + texture(uCau, uv + vec2(0., uCauT.y)).r + texture(uCau, uv - vec2(0., uCauT.y)).r) / 6.; }
// une carpe koï vue de dessus : corps ondulant, nageoires translucides, robe selon la variété
vec4 koi(vec2 q, vec4 A, vec4 B){
  vec2 dir = vec2(cos(A.z), sin(A.z)), nr = vec2(-dir.y, dir.x);
  vec2 d = q - A.xy; float L = A.w;
  float u = -dot(d, dir) / L;
  if (u < -.06 || u > 1.18) return vec4(0.);
  float v = dot(d, nr) - L * .075 * sin(u * 5.2 - B.x) * smoothstep(.05, 1., u);
  float w = L * .125 * pow(max(0., sin(3.14159 * clamp((u + .05) / .9, 0., 1.))), .62);
  float body = (1. - smoothstep(-1., 1., abs(v) - w)) * (1. - step(.86, u));
  float tf = smoothstep(.78, 1.12, u);
  float tail = (1. - smoothstep(-1., 1., abs(v) - L * (.02 + .2 * tf * tf))) * step(.8, u) * (1. - step(1.12, u)) * .6;
  vec2 pf = vec2(u - .3, abs(v) - w - L * .045);
  float pec = (1. - smoothstep(.8, 1., length(pf * vec2(9., 1. / (L * .055)) ))) * .55;
  float cov = max(body, max(tail, pec));
  if (cov < .01) return vec4(0.);
  float vn = clamp(v / max(w, 1.), -1., 1.);
  float nz = vnoise(vec2(u * 5., v / L * 9.) + B.w * 13.), sc = .92 + .08 * sin(u * 70.) * sin(v / L * 70.);
  vec3 c;
  float var = B.z;
  if (var < .5) c = mix(vec3(.95, .93, .88), vec3(.86, .16, .05), smoothstep(.48, .56, nz));
  else if (var < 1.5) c = vec3(1., .74, .26) * (.85 + .25 * sin(u * 9. + vn * 3.));
  else if (var < 2.5) c = mix(mix(vec3(.04, .035, .035), vec3(.85, .15, .05), smoothstep(.5, .58, nz)), vec3(.93, .92, .88), smoothstep(.62, .7, vnoise(vec2(u * 4., v / L * 7.) + B.w * 5.)));
  else if (var < 3.5) c = mix(vec3(.42, .52, .6), vec3(.95, .42, .12), smoothstep(.62, .9, abs(vn)));
  else c = vec3(.55, .37, .19);
  c *= sc * (.62 + .38 * sqrt(max(0., 1. - vn * vn)));
  if (body < .5) c = mix(c, vec3(.95, .9, .85), .35);
  vec2 eye = vec2(u - .07, abs(v) - w * .55);
  if (u < .12 && length(eye * vec2(L, 1.)) < L * .022) c *= .25;
  return vec4(c, cov);
}
float koiShadow(vec2 q, vec4 A){
  vec2 dir = vec2(cos(A.z), sin(A.z)), nr = vec2(-dir.y, dir.x);
  vec2 d = q - A.xy; float L = A.w, u = -dot(d, dir) / L;
  if (u < -.2 || u > 1.2) return 0.;
  float w = L * .15 * pow(max(0., sin(3.14159 * clamp((u + .05) / .95, 0., 1.))), .6);
  return 1. - smoothstep(-L * .06, L * .06, abs(dot(d, nr)) - w);
}
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1. - vUv.y) * uRes.y);
  float hL = texture(uW, vUv - vec2(uWt.x, 0.)).r, hR = texture(uW, vUv + vec2(uWt.x, 0.)).r;
  float hB = texture(uW, vUv - vec2(0., uWt.y)).r, hT = texture(uW, vUv + vec2(0., uWt.y)).r;
  vec4 W4 = texture(uW, vUv);
  vec2 g = vec2(hR - hL, -(hT - hB)) * .5 / uCell;
  vec3 n = normalize(vec3(-g * uSlope, 1.));
  vec2 off = g * uSlope * uRefr;
  vec2 q = p + off;
  float cau = cauAt(toUv(q));
  vec4 D = texture(uD, vUv);
  vec3 col;
  // reflet du soleil sur les flancs des rides
  vec3 sunD = normalize(vec3(-uSunDir * 1.6, 1.));
  vec3 R = vec3(2. * n.z * n.xy, 2. * n.z * n.z - 1.);
  float glint = pow(max(dot(R, sunD), 0.), 1400.) * uGlint * uSun;
  if (uDecor > .5){
    vec3 fl = pow(texture(uFloor, toUv(q)).rgb, vec3(2.2));
    float sh = 1.;
    for (int i = 0; i < 48; i++){
      if (i >= uNC) break;
      vec4 C = uC[i]; vec2 c = C.xy + uSunDir * uDepth; float dd = length(q - c);
      if (C.w < .5) sh *= 1. - .72 * (1. - smoothstep(C.z * .82, C.z * 1.08, dd));
      else if (C.w < 1.5) sh *= 1. - .62 * (1. - smoothstep(C.z * .55, C.z, dd)) + .9 * exp(-pow((dd - C.z * 1.12) / (C.z * .22), 2.));
      else sh *= 1. - .5 * (1. - smoothstep(C.z * .5, C.z, dd));
    }
    for (int i = 0; i < 8; i++){ if (i >= uNF) break; float k = 1. - uF1[i].y; sh *= 1. - .45 * k * koiShadow(q - uSunDir * uDepth * k, uF0[i]); }
    float cc = min(cau, 5.);
    col = uTank > .5 ? fl * .35 + vec3(.45, .8, 1.) * pow(max(cc - .5, 0.), 1.5) * .5 * uSun : fl * (.2 + 1.1 * uSun * pow(cc, 1.25) * sh) * mix(1., sh, .55);
    // les koïs nagent entre le fond et la surface
    for (int i = 0; i < 8; i++){
      if (i >= uNF) break;
      vec4 k = koi(p + off * (.4 + uF1[i].y), uF0[i], uF1[i]);
      if (k.a > 0.){ vec3 kc = pow(k.rgb, vec3(2.2)) * (.45 + .75 * uSun * mix(1., cau, .6)); col = mix(col, mix(kc, uWater * .6, uF1[i].y * .55), k.a); }
    }
    if (uTank < .5){
      vec3 T = exp(-vec3(2.9, 1.15, 1.35) * uDepth / 115. * (.45 + .85 * D.r));
      col = col * T + uWater * (1. - T);
    } else {
      if (D.g > .5) col = vec3(.05, .06, .075) + vec3(.12, .14, .17) * smoothstep(0., 1., fract(p.y * .02));
      else if (D.r < .9) col *= vec3(.85, .95, 1.05);
    }
    float F = .02 + .98 * pow(1. - n.z, 5.);
    col = mix(col, uSky, clamp(F * 1.5, 0., .4)) + vec3(1., .97, .9) * glint * 1.4;
    if (uMean > .5){ float m = clamp(sqrt(W4.b) * 2.2, 0., 1.); col = mix(col, mix(vec3(.02, .01, .04), vec3(1., .3, .85), m) + vec3(.2, .9, 1.) * m * m * .5, .6); }
    col = aces(col * 1.1);
  } else if (uInk < .5){
    float c2 = max(cau - 1.02, 0.);
    col = vec3(.08, .75, 1.) * pow(c2, 1.2) * .7 * (.4 + .6 * uSun) + vec3(.45, .25, 1.) * length(g) * uSlope * .05 + vec3(1.) * glint * 2.;
    if (D.g > .5) col = vec3(.12, .14, .2);
    if (uMean > .5) col += vec3(.95, .35, .9) * sqrt(W4.b) * 3.;
    col = aces(col);
  } else {
    col = uPaper;
    float c2 = clamp((cau - 1.05) * .5, 0., .85);
    col = mix(col, vec3(.03, .32, .42), c2);
    col *= 1. - clamp(length(g) * uSlope * .06, 0., .2);
    if (D.g > .5) col = vec3(.3, .32, .38);
    if (uMean > .5) col = mix(col, vec3(.55, .12, .45), clamp(sqrt(W4.b) * 3., 0., .8));
  }
  col = pow(col, vec3(1. / 2.2)) + (hash12(p + fract(uTime) * 91.) - .5) / 255.;
  o = vec4(col, 1.);
}`,
  };
  const VS_CAUST = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 aPos; uniform sampler2D uW, uD; uniform vec2 uRes, uWt, uSunDir; uniform float uSlope, uDepth, uCell;
out vec2 vOld; out vec2 vNew; out float vWall;
void main(){
  vec2 uv = aPos;
  float hL = texture(uW, uv - vec2(uWt.x, 0.)).r, hR = texture(uW, uv + vec2(uWt.x, 0.)).r;
  float hB = texture(uW, uv - vec2(0., uWt.y)).r, hT = texture(uW, uv + vec2(0., uWt.y)).r;
  vec2 g = vec2(hR - hL, -(hT - hB)) * .5 / uCell;
  vec3 n = normalize(vec3(-g * uSlope, 1.));
  vec3 I = normalize(vec3(uSunDir * .55, -1.));
  vec3 T = refract(I, n, 1. / 1.333), T0 = refract(I, vec3(0., 0., 1.), 1. / 1.333);
  vec2 p = vec2(uv.x * uRes.x, (1. - uv.y) * uRes.y);
  vNew = p + T.xy / max(-T.z, .2) * uDepth;
  vOld = p + T0.xy / -T0.z * uDepth;
  vWall = texture(uD, uv).g;
  gl_Position = vec4(vNew.x / uRes.x * 2. - 1., 1. - vNew.y / uRes.y * 2., 0., 1.);
}`;

  /* ───────── décors peints ───────── */
  function grain(g, x, y, w, h, n, a, light) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = light ? `rgba(255,250,230,${Math.random() * a})` : `rgba(0,0,0,${Math.random() * a})`;
      g.fillRect(x + Math.random() * w, y + Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  }
  function paintPond(g, W, H) {
    const gr = g.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    gr.addColorStop(0, '#6a5c3c'); gr.addColorStop(0.6, '#7d6c45'); gr.addColorStop(1, '#94815a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    grain(g, 0, 0, W, H, W * H / 25, 0.18, false);
    grain(g, 0, 0, W, H, W * H / 40, 0.15, true);
    // plaques d'algues et de vase
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 30 + Math.random() * 120;
      const a = g.createRadialGradient(x, y, 0, x, y, r);
      const green = Math.random() < 0.6;
      a.addColorStop(0, green ? 'rgba(70,95,40,.45)' : 'rgba(70,55,35,.35)'); a.addColorStop(1, 'rgba(70,90,40,0)');
      g.fillStyle = a; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    // galets
    for (let i = 0; i < W * H / 5200; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 3 + Math.pow(Math.random(), 3) * 24, k = 85 + Math.random() * 80;
      const tint = Math.random();
      g.fillStyle = `rgba(0,0,0,.25)`; g.beginPath(); g.ellipse(x + r * 0.2, y + r * 0.25, r * 1.05, r * 0.8, 0.3, 0, TAU); g.fill();
      g.fillStyle = `rgb(${k * (0.95 + tint * 0.2) | 0},${k * 0.88 | 0},${k * (0.7 + (1 - tint) * 0.15) | 0})`;
      g.beginPath(); g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.3), Math.random() * 3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,240,.18)'; g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.2, r * 0.45, r * 0.25, 0.4, 0, TAU); g.fill();
    }
    // feuilles mortes au fond
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * W, y = Math.random() * H, s = 10 + Math.random() * 18, a = Math.random() * TAU;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = `rgba(${90 + rint(50)},${55 + rint(30)},${25},.75)`;
      g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.45, s, 0); g.quadraticCurveTo(0, s * 0.45, -s, 0); g.fill();
      g.strokeStyle = 'rgba(40,25,10,.5)'; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke();
      g.restore();
    }
    // herbiers (élodée) en touffes
    g.strokeStyle = 'rgba(40,80,30,.55)'; g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      for (let k = 0; k < 14; k++) {
        const a = Math.random() * TAU, l = 15 + Math.random() * 45;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    }
  }
  function paintTank(g, W, H) {
    g.fillStyle = '#1b1e24'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    grain(g, 0, 0, W, H, W * H / 80, 0.1, true);
  }

  /* ───────── l'ancienne Eau, en 2D, conservée comme repli ───────── */
  function legacy(env) {
  // (version d'origine, inchangée sauf l'outil « caillou » devenu « goutte »)
      const ctx = env.ctx;
      const GW = 230, GH = Math.max(90, Math.round(GW * env.h / env.w));
      const N = GW * GH;
      let a = new Float32Array(N), pb = new Float32Array(N);
      const b = buf(GW, GH);
      const drop = (gx, gy, amp, r) => {
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
          const d = Math.hypot(x, y); if (d > r) continue;
          const px = (gx + x) | 0, py = (gy + y) | 0;
          if (px < 2 || py < 2 || px >= GW - 2 || py >= GH - 2) continue;
          a[py * GW + px] += Math.cos(d / r * Math.PI * 0.5) * amp;
        }
      };
      for (let i = 0; i < 3; i++) drop(rnd(GW - 20, 20), rnd(GH - 20, 20), 60, 4);
      return {
        frame(t, dt) {
          if (env.tool === 'pluie' && Math.random() < 0.5) drop(rnd(GW - 6, 6), rnd(GH - 6, 6), rnd(50, 20), 2);
          for (let y = 1; y < GH - 1; y++) {
            const o = y * GW;
            for (let x = 1; x < GW - 1; x++) {
              const i = o + x;
              a[i] = ((pb[i - 1] + pb[i + 1] + pb[i - GW] + pb[i + GW]) * 0.5 - a[i]) * 0.9955;
            }
          }
          const tt = a; a = pb; pb = tt;
          const d = b.d;
          for (let y = 0; y < GH; y++) {
            const o = y * GW;
            for (let x = 0; x < GW; x++) {
              const i = o + x;
              const gx = pb[x > 0 ? i - 1 : i] - pb[x < GW - 1 ? i + 1 : i];
              const gy = pb[y > 0 ? i - GW : i] - pb[y < GH - 1 ? i + GW : i];
              const l = clamp(0.45 + (gx * 0.9 + gy * 0.6) * 0.03, 0, 2);
              const caus = Math.pow(clamp(l, 0, 1.6), 4) * 0.9;
              const dep = y / GH;
              const o4 = i * 4;
              d[o4] = clamp(18 + caus * 190 + gx * 1.2, 0, 255);
              d[o4 + 1] = clamp(60 + caus * 210 + dep * 20, 0, 255);
              d[o4 + 2] = clamp(110 + caus * 160 + (1 - dep) * 40, 0, 255);
            }
          }
          b.flush();
          ctx.globalCompositeOperation = 'source-over';
          blit(ctx, b, env.w, env.h);
        },
        down(p) {
          const gx = p.x / env.w * GW, gy = p.y / env.h * GH;
          if (env.tool === 'goutte') {
            drop(gx, gy, 190, 5);
            env.audio.note(rnd(420, 240), 0.22, 'sine', 0.16, 90);
            env.audio.noise(0.18, 0.06, 1400, 1.2, 'bandpass');
          } else drop(gx, gy, 60, 3);
        },
        move(p) {
          if (!p.down || env.tool === 'pluie') return;
          const gx = p.x / env.w * GW, gy = p.y / env.h * GH;
          drop(gx, gy, env.tool === 'goutte' ? 40 : 26, 3);
        },
      };
  }

  const QUAL = {
    legere: { cells: 30000, comp: 0.75, mesh: 9 },
    normale: { cells: 60000, comp: 1.1, mesh: 5 },
    haute: { cells: 110000, comp: 1.6, mesh: 4 },
  };

  window.FASC.push({
    id: 'eau', name: 'L’Eau', cat: 'Éléments', glyph: '🜄', decor: true,
    blurb: 'La mare : rides, caustiques et petites bêtes',
    hint: 'OBSERVER : touchez une bête, une feuille ou l’eau · DOIGT : glissez dans l’eau · GOUTTE : touchez · PLUIE : maintenez · MOUCHE : lâchez une proie · NOURRIR : appelez les koïs · MUR et GOMME : construisez une cuve à ondes.',
    intro: 'Une mare au soleil, vue d’en haut. Chaque ride est une petite lentille qui dessine au fond un filet de lumière. À la surface, des gerris patinent et chassent en lisant les vagues, des gyrins tournoient en radeau ; dessous, des koïs glissent avec leur ombre. Dans la cuve à ondes, retrouvez les expériences qui ont prouvé que la lumière est une onde.',
    legend: [
      { color: '#c9a36a', name: 'Gerris lacustris', role: 'gerris · patineur, chasse aux ondes', desc: 'Il marche sur l’eau grâce à ses pattes couvertes de microscopiques poils hydrofuges. Il rame avec la paire du milieu et repère une proie tombée à l’eau aux rides qu’elle fait en se débattant.' },
      { color: '#9fb7ff', name: 'Gyrinus substriatus', role: 'gyrin · tourniquet', desc: 'Petit coléoptère noir et luisant qui tourne en rond en groupe serré. Il sent les échos de ses propres vagues sur les obstacles, et ses yeux coupés en deux voient à la fois au-dessus et au-dessous de l’eau.' },
      { color: '#ff7a3c', name: 'Cyprinus rubrofuscus', role: 'koï · carpe d’ornement', desc: 'Sélectionnée au Japon depuis le XIXᵉ siècle, dans la région de Niigata. Les robes ont des noms : Kohaku, Showa, Ogon, Asagi… Elle gobe à la surface ce qui y tombe.' },
      { color: '#6fcf6a', name: 'Nymphaea alba', role: 'nénuphar blanc', desc: 'Ses feuilles flottent grâce à des canaux pleins d’air et respirent par le dessus, cireux et hydrofuge. Elles amortissent les rides qui passent dessous.' },
      { color: '#8a8070', name: 'Musca domestica', role: 'mouche tombée à l’eau', desc: 'Prisonnière de la tension superficielle, elle se débat et fait vibrer la surface : un signal que les gerris et les koïs savent lire.' },
      { color: '#7fe6ff', name: 'Caustiques', role: 'lumière réfractée', desc: 'Chaque crête concentre la lumière du soleil comme une loupe, chaque creux l’étale. Au fond, cela dessine un filet lumineux qui danse.' },
      { color: '#c8d8ff', name: 'Gouttes de pluie', role: 'bulle de Minnaert', desc: 'Le « plic » d’une goutte ne vient pas du choc, mais d’une minuscule bulle d’air piégée qui vibre, à quelques milliers de hertz.' },
    ],
    about: [
      'À la surface d’une mare, deux forces ramènent l’eau à plat : la pesanteur pour les vagues, la tension superficielle pour les petites rides. Les ondes les plus lentes avancent à 23 cm/s, pour une longueur d’onde de 1,7 cm : en dessous, ce sont des ondes capillaires, au-dessus des ondes de gravité. Ici, la simulation résout l’équation d’onde ; la profondeur règle la vitesse, comme dans une cuve à ondes.',
      'Les caustiques sont calculées rayon par rayon : la lumière du soleil traverse la surface, se plie selon l’indice de l’eau (1,33) et frappe le fond. Là où les rayons se resserrent, le fond s’illumine. Les pattes des gerris creusent de petites fossettes qui agissent comme des lentilles divergentes : au fond, chaque patte projette une ombre ronde cerclée de lumière.',
      'Comment les jeunes gerris avancent-ils, alors que leurs pattes vont moins vite que les ondes les plus lentes ? Ce « paradoxe de Denny » (1993) a été résolu en 2003 par David Hu, Brian Chan et John Bush : en ramant, le gerris lance surtout de petits tourbillons sous la surface. Ses pattes portent jusqu’à quinze fois son poids grâce à des milliers de poils striés.',
      'En 1801, Thomas Young fait passer la lumière par deux fentes et observe des franges : la lumière se comporte comme une onde. La cuve à ondes rend l’expérience visible. Deux sources font naître des lignes calmes (nœuds) et des lignes agitées (ventres), des hyperboles ; une fente étroite fait s’épanouir l’onde, une plaque immergée la ralentit et la dévie, comme un prisme.',
      'Quand on tape près d’une carpe, elle fuit en quelques millisecondes en se pliant en C : c’est le « départ en C », commandé par deux neurones géants, les cellules de Mauthner. Et le « plic » de la pluie vient d’une bulle d’air qui vibre à une fréquence d’environ 3,3 divisé par son rayon (Minnaert, 1933).',
    ],
    tools: [
      { id: 'observer', label: 'observer', desc: 'Touchez un gerris, un gyrin, un koï, un nénuphar ou une mouche pour l’identifier. Touchez l’eau pour lire la hauteur de la ride, ou, dans la cuve, si vous êtes sur un ventre ou un nœud.' },
      { id: 'doigt', label: 'doigt', desc: 'Glissez le doigt dans l’eau : il laisse un sillage, en V s’il va plus vite que les ondes.' },
      { id: 'goutte', label: 'goutte', desc: 'Touchez pour lâcher une goutte : un cercle d’ondes et un « plic ».' },
      { id: 'pluie', label: 'pluie', desc: 'Maintenez le doigt : il pleut autour de lui.' },
      { id: 'mouche', label: 'mouche', desc: 'Touchez pour faire tomber une mouche. Elle se débat ; les gerris arrivent en lisant ses rides, les koïs montent la gober.' },
      { id: 'nourrir', label: 'nourrir', desc: 'Touchez pour jeter quelques granulés : les koïs viennent les gober à la surface.' },
      { id: 'mur', label: 'mur', desc: 'Glissez pour dresser une paroi : les ondes s’y réfléchissent. Construisez fentes, chicanes et miroirs.' },
      { id: 'gomme', label: 'gomme', desc: 'Glissez pour effacer les parois.' },
    ],
    make(env) {
      try { return makeGL(env); } catch (e) {
        console.warn('L’Eau : repli en 2D', e);
        return legacy(env);
      }
    },
  });

  function makeGL(env) {
    const ctx = env.ctx, W = env.w, H = env.h, au = env.audio;
    const dpr = env.dpr || Math.min(2, window.devicePixelRatio || 1);
    const kS = clamp(Math.min(W, H) / 800, 0.6, 1.5);
    const mobile = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent) || Math.min(W, H) < 520;
    const cfg = { scene: 'mare', breeze: 0.4, depth: 0.75, damp: 0.35, sun: 0.85, glint: true, auto: true, mean: false, q: mobile ? 'legere' : 'normale', exp: 'deux', freq: 0.55, gap: 0.5, vsrc: 0.5 };
    const snd = () => au && au.on && au.ctx;
    const view = () => { const v = env.view || { x0: 0, x1: W }; return { x0: v.x0, x1: v.x1, w: v.x1 - v.x0, cx: (v.x0 + v.x1) / 2 }; };

    /* ressources GPU */
    let R = null;
    function initGL(qk) {
      const Q = QUAL[qk];
      const cs = Math.min(dpr, Q.comp);
      const cw = Math.max(2, Math.round(W * cs)), ch = Math.max(2, Math.round(H * cs));
      const K = GLKit(cw, ch);
      const gl = K.gl;
      const GW = Math.max(40, Math.round(Math.sqrt((Q.cells * W) / H))), GH = Math.max(30, Math.round((GW * H) / W));
      const r = {
        K, gl, Q, cw, ch, GW, GH,
        Wv: K.double(GW, GH),
        cau: qk === 'legere' ? K.target(Math.round(cw / 2), Math.round(ch / 2)) : K.target(cw, ch),
        D: gl.createTexture(), floor: gl.createTexture(),
        pg: { wave: K.program(FS.wave), comp: K.program(FS.comp), caust: K.program(FS.caustFS, VS_CAUST) },
      };
      for (const t of [r.D, r.floor]) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      // maillage des rayons lumineux (caustiques)
      const MW = Math.min(250, Math.round(cw / Q.mesh)), MH = Math.min(Math.floor(65000 / (MW + 1)) - 1, Math.round(ch / Q.mesh));
      const vtx = new Float32Array((MW + 1) * (MH + 1) * 2);
      for (let j = 0, k = 0; j <= MH; j++) for (let i = 0; i <= MW; i++) { vtx[k++] = i / MW; vtx[k++] = j / MH; }
      const idx = new Uint16Array(MW * MH * 6);
      for (let j = 0, k = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
        const a = j * (MW + 1) + i, b = a + 1, c = a + MW + 1, d = c + 1;
        idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = b; idx[k++] = d; idx[k++] = c;
      }
      r.mesh = { vao: gl.createVertexArray(), n: idx.length };
      gl.bindVertexArray(r.mesh.vao);
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, vtx, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      // carte des profondeurs et des murs, peinte en 2D à la résolution de la grille
      r.dL = layer(GW, GH);
      return r;
    }
    R = initGL(cfg.q);
    const cell = () => W / R.GW;

    function uploadCanvas(tex, c) {
      const gl = R.gl;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }
    // canal rouge : vitesse des ondes (profondeur) · canal vert : paroi
    const plates = [];
    let walls = [];
    function paintD() {
      const g = R.dL.g, sx = R.GW / W, sy = R.GH / H;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgb(255,0,0)'; g.fillRect(0, 0, R.GW, R.GH);
      g.setTransform(sx, 0, 0, sy, 0, 0);
      if (cfg.scene !== 'cuve') {
        // les bords de la mare sont moins profonds : les ondes y ralentissent
        const e = g.createLinearGradient(0, 0, W, 0);
        g.globalCompositeOperation = 'multiply';
        e.addColorStop(0, 'rgb(150,255,255)'); e.addColorStop(0.12, 'rgb(255,255,255)'); e.addColorStop(0.88, 'rgb(255,255,255)'); e.addColorStop(1, 'rgb(150,255,255)');
        g.fillStyle = e; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
      }
      for (const pl of plates) {
        g.fillStyle = `rgb(${Math.round(255 * pl.c)},0,0)`;
        g.beginPath();
        if (pl.kind === 'lens') { g.ellipse(pl.x, pl.y, pl.rx, pl.ry, 0, 0, TAU); }
        else { g.save(); g.translate(pl.x, pl.y); g.rotate(pl.a || 0); g.rect(-pl.w / 2, -pl.h / 2, pl.w, pl.h); g.restore(); }
        g.fill();
      }
      g.strokeStyle = 'rgb(255,255,0)'; g.lineCap = 'round';
      for (const w of walls) {
        g.lineWidth = w.wd;
        g.beginPath(); g.moveTo(w.ax, w.ay); g.lineTo(w.bx, w.by); g.stroke();
      }
      uploadCanvas(R.D, R.dL.c);
    }
    function paintFloor() {
      const L = layer(R.cw, R.ch);
      L.g.scale(R.cw / W, R.ch / H);
      if (cfg.scene === 'cuve') paintTank(L.g, W, H); else paintPond(L.g, W, H);
      uploadCanvas(R.floor, L.c);
    }

    /* ───────── le peuple de la mare ───────── */
    let gerris = [], gyrins = [], kois = [], pads = [], flies = [], pellets = [], splashes = [];
    let VT = 0, weather = { rain: 0, target: 0, next: 25 }, gust = null, label = null, drag = null;
    let srcs = [], osc = [], line = null, mover = null;
    const inView = (x, y, m = 30) => { const v = view(); return x > v.x0 + m && x < v.x1 - m && y > m && y < H - m; };
    function addSrc(x, y, a, r) { if (srcs.length < 64) srcs.push(x, y, a, r); }

    function populate() {
      const v = view();
      gerris = []; gyrins = []; kois = []; pads = []; flies = []; pellets = [];
      const nP = Math.round(clamp(v.w * H / 90000, 4, 10));
      for (let i = 0; i < nP; i++) {
        const r = rnd(62, 30) * kS;
        let x, y, ok = false, tries = 0;
        while (!ok && tries++ < 40) {
          x = v.x0 + rnd(v.w - 2 * r, 2 * r) ; y = rnd(H - r, r);
          if (Math.random() < 0.6) x = Math.random() < 0.5 ? v.x0 + rnd(v.w * 0.28, r) : v.x1 - rnd(v.w * 0.28, r);
          ok = pads.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + r + 6);
        }
        pads.push({ x, y, r, a: rnd(TAU), notch: rnd(TAU), flower: Math.random() < 0.3, va: rnd(0.02, -0.02), hue: rnd(1) });
      }
      for (let i = 0; i < 5; i++) kois.push({ x: v.x0 + rnd(v.w), y: rnd(H), a: rnd(TAU), sp: rnd(40, 20) * kS, len: rnd(110, 70) * kS, depth: rnd(0.8, 0.4), ph: rnd(TAU), var: i % KOI.length, seed: rnd(10), wand: rnd(100), target: null, startle: 0, gulp: 0 });
      for (let i = 0; i < 6; i++) gerris.push(mkGerris(v.x0 + rnd(v.w * 0.8, v.w * 0.2), rnd(H * 0.8, H * 0.2)));
      const gx = v.x0 + v.w * rnd(0.7, 0.3), gy = H * rnd(0.7, 0.3);
      for (let i = 0; i < 12; i++) gyrins.push({ x: gx + rnd(30, -30) * kS, y: gy + rnd(30, -30) * kS, a: rnd(TAU), w: rnd(4, -4), sp: rnd(50, 25) * kS, alarm: 0 });
    }
    function mkGerris(x, y) { return { x, y, a: rnd(TAU), vx: 0, vy: 0, t: rnd(1.2), st: 'erre', prey: null, fed: 0, sig: 0, sex: Math.random() < 0.5 ? 'm' : 'f', jump: 0 }; }

    /* ───────── scènes et expériences ───────── */
    function setScene(id) {
      cfg.scene = id;
      plates.length = 0; walls = []; osc = []; line = null; mover = null; srcs = [];
      R.K.clear(R.Wv.r); R.K.clear(R.Wv.w);
      label = null;
      if (id === 'cuve') {
        gerris = []; gyrins = []; kois = []; pads = []; flies = []; pellets = [];
        weather.rain = weather.target = 0;
        Object.assign(cfg, { damp: 0.15, sun: 1, glint: false, auto: false });
        setExp(cfg.exp);
      } else {
        Object.assign(cfg, { damp: 0.35, sun: 0.85, glint: true, auto: true, mean: false, breeze: id === 'averse' ? 0.15 : 0.4 });
        populate();
        if (id === 'averse') { weather.rain = 0.2; weather.target = 0.8; weather.next = 30; }
        else { weather.rain = 0; weather.target = 0; weather.next = 20; }
      }
      paintD(); paintFloor();
    }
    function setExp(k) {
      cfg.exp = k;
      plates.length = 0; walls = []; osc = []; line = null; mover = null;
      const v = view(), cx = v.cx, cy = H / 2, lam = 80 * kS;
      const gap = (0.3 + cfg.gap * 1.4) * lam;
      if (k === 'deux') { const d = (0.6 + cfg.gap * 2.6) * lam / 2; osc.push({ x: cx - d, y: cy * 0.55 }, { x: cx + d, y: cy * 0.55 }); }
      else if (k === 'fente' || k === 'double') {
        line = { x: v.x0 + 64 * kS };
        const wx = v.x0 + v.w * 0.42, th = 8 * kS;
        if (k === 'fente') { walls.push({ ax: wx, ay: -20, bx: wx, by: cy - gap / 2, wd: th }, { ax: wx, ay: cy + gap / 2, bx: wx, by: H + 20, wd: th }); }
        else {
          const s = gap * 0.45, sep = (0.8 + cfg.gap) * lam;
          walls.push({ ax: wx, ay: -20, bx: wx, by: cy - sep / 2 - s / 2, wd: th }, { ax: wx, ay: cy - sep / 2 + s / 2, bx: wx, by: cy + sep / 2 - s / 2, wd: th }, { ax: wx, ay: cy + sep / 2 + s / 2, bx: wx, by: H + 20, wd: th });
        }
      } else if (k === 'refraction') {
        line = { x: v.x0 + 64 * kS };
        plates.push({ kind: 'rect', x: v.x0 + v.w * 0.62, y: cy, w: v.w * 0.5, h: H * 1.6, a: 0.5, c: 0.35 });
      } else if (k === 'lentille') {
        line = { x: v.x0 + 64 * kS };
        plates.push({ kind: 'lens', x: v.x0 + v.w * 0.4, y: cy, rx: v.w * 0.07, ry: H * 0.36, c: 0.4 });
      } else if (k === 'doppler') {
        mover = { x: v.x0 + v.w * 0.15, y: cy, dir: 1 };
      }
      paintD();
    }

    /* ───────── sons ───────── */
    let amb = null, lastPlink = 0, plinkN = 0;
    if (snd()) {
      const c = au.ensure();
      if (c) {
        const s = c.createBufferSource(); s.buffer = au.noiseBuf(); s.loop = true;
        const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 600; hp.Q.value = 0.4;
        const gg = c.createGain(); gg.gain.value = 0.0001;
        s.connect(hp); hp.connect(gg); gg.connect(au.master); s.start();
        amb = { s, hp, gg };
      }
    }
    function plink(r) {
      if (!snd()) return;
      if (VT - lastPlink < 0.03) { if (++plinkN > 3) return; } else plinkN = 0;
      lastPlink = VT;
      // fréquence de Minnaert : f ≈ 3,26 / R (R en mètres) ; la bulle remonte et la note glisse vers l'aigu
      const f = clamp(3.26 / (r * 0.001), 700, 4200);
      au.note(f, 0.09 + Math.random() * 0.05, 'sine', 0.05 + Math.random() * 0.05, f * 1.4);
    }
    function gulpSound() { if (snd()) { au.note(150, 0.18, 'sine', 0.13, 70); au.noise(0.12, 0.05, 500, 1, 'lowpass'); } }

    /* ───────── évènements ───────── */
    function drop(x, y, big) {
      const r = (big ? rnd(9, 6) : rnd(5, 3)) * kS;
      addSrc(x, y, big ? -1.4 : -0.55, r);
      splashes.push({ x, y, t: 0, r: r * 1.6 });
      plink(big ? rnd(3.2, 2.2) : rnd(2.2, 1.2));
      alarm(x, y, big ? 120 * kS : 60 * kS);
    }
    function alarm(x, y, rad) {
      for (const g of gyrins) if (Math.hypot(g.x - x, g.y - y) < rad * 2) g.alarm = Math.max(g.alarm, 2.2);
      for (const k of kois) if (Math.hypot(k.x - x, k.y - y) < rad * 1.3 && k.startle <= 0) {
        k.startle = 0.6; k.a = Math.atan2(k.y - y, k.x - x) + rnd(0.4, -0.4); k.depth = Math.min(0.95, k.depth + 0.3);
      }
      for (const g of gerris) if (Math.hypot(g.x - x, g.y - y) < rad * 0.6) { g.a = Math.atan2(g.y - y, g.x - x); g.jump = 0.3; }
    }
    function addFly(x, y) { if (flies.length < 6) { flies.push({ x, y, t: 0, buzz: 0, alive: true, a: rnd(TAU), by: null }); addSrc(x, y, -0.5, 4 * kS); } }

    /* ───────── comportements (CPU) ───────── */
    function update(dt) {
      VT += dt;
      const v = view();
      // météo : averses et risées spontanées
      if (cfg.auto && cfg.scene !== 'cuve') {
        weather.next -= dt;
        if (weather.next <= 0) {
          if (weather.target > 0) { weather.target = 0; weather.next = rnd(70, 35); }
          else if (Math.random() < 0.5) { weather.target = rnd(0.8, 0.3); weather.next = rnd(28, 14); }
          else { gust = { x: v.x0 - 80, y: rnd(H), vx: rnd(120, 60) * kS, life: rnd(9, 5), r: rnd(170, 100) * kS }; weather.next = rnd(30, 15); }
        }
        if (Math.random() < dt / 18 && flies.length < 3) addFly(v.x0 + rnd(v.w * 0.85, v.w * 0.15), rnd(H * 0.85, H * 0.15));
      }
      weather.rain += (weather.target - weather.rain) * (1 - Math.exp(-dt * 0.4));
      // brise : de petites rides partout, qui dessinent au fond le filet de lumière
      if (cfg.scene !== 'cuve') {
        const nb = Math.min(8, Math.round(cfg.breeze * 9 * (0.6 + 0.4 * n1(VT * 0.2))));
        for (let k = 0; k < nb; k++) addSrc(rnd(W), rnd(H), rnd(0.75, -0.75) * cfg.breeze, rnd(22, 12) * kS);
      }
      let nd = weather.rain * 70 * dt * (v.w * H / 1e6 + 0.3);
      while (nd > 0) { if (Math.random() < nd) drop(v.x0 + rnd(v.w), rnd(H), false); nd -= 1; }
      if (gust) {
        gust.x += gust.vx * dt; gust.life -= dt;
        for (let k = 0; k < 3; k++) { const a = rnd(TAU), d = Math.sqrt(Math.random()) * gust.r; addSrc(gust.x + Math.cos(a) * d * 1.6, gust.y + Math.sin(a) * d * 0.7, rnd(0.06, -0.06), 3 * kS); }
        for (const p of pads) if (Math.hypot(p.x - gust.x, p.y - gust.y) < gust.r * 1.4) p.x += dt * 6 * kS;
        for (const g of gerris) if (Math.hypot(g.x - gust.x, g.y - gust.y) < gust.r * 1.4) g.vx += dt * 30 * kS;
        if (gust.life <= 0 || gust.x > v.x1 + 200) gust = null;
      }
      // nénuphars : ils tournent doucement et dérivent
      for (const p of pads) { p.a += p.va * dt; }
      // mouches : elles se débattent (rides périodiques), s'épuisent, s'envolent parfois
      for (let i = flies.length - 1; i >= 0; i--) {
        const f = flies[i];
        f.t += dt;
        const vigor = Math.exp(-f.t / 30);
        if (!f.by && Math.random() < dt * 7 * vigor) { addSrc(f.x + rnd(3, -3), f.y + rnd(3, -3), rnd(0.22, 0.1) * vigor, 3 * kS); f.buzz = 0.15; }
        f.buzz -= dt;
        if (!f.by && f.t > 9 && Math.random() < dt * 0.02) { flies.splice(i, 1); continue; }
        if (f.gone) flies.splice(i, 1);
      }
      for (let i = pellets.length - 1; i >= 0; i--) { const p = pellets[i]; p.t += dt; p.x += Math.sin(VT + p.s) * 2 * dt; if (p.t > 60 || p.gone) pellets.splice(i, 1); }
      // gerris
      for (const g of gerris) {
        g.t -= dt; g.jump = Math.max(0, g.jump - dt);
        g.sig = Math.max(0, g.sig - dt);
        if (g.prey && (g.prey.gone || !flies.includes(g.prey))) { g.prey = null; g.st = 'erre'; }
        if (!g.prey && g.st !== 'mange') {
          let best = null, bd = 320 * kS;
          for (const f of flies) { if (f.by) continue; const d = Math.hypot(f.x - g.x, f.y - g.y); if (d < bd) { bd = d; best = f; } }
          if (best) { g.prey = best; g.st = 'chasse'; }
        }
        if (g.st === 'mange') {
          g.eat -= dt;
          if (g.eat <= 0) { if (g.prey) { g.prey.gone = true; } g.prey = null; g.st = 'erre'; g.fed++; }
        } else {
          let ta = g.a;
          if (g.prey) {
            ta = Math.atan2(g.prey.y - g.y, g.prey.x - g.x);
            if (Math.hypot(g.prey.x - g.x, g.prey.y - g.y) < 9 * kS && !g.prey.by) { g.prey.by = g; g.st = 'mange'; g.eat = rnd(9, 5); g.vx = g.vy = 0; }
          } else ta = g.a + (n1(VT * 0.3 + g.x * 0.01) - 0.5) * 0.8;
          // évite les bords, les nénuphars et les congénères
          if (!inView(g.x, g.y, 50)) ta = Math.atan2(H / 2 - g.y, v.cx - g.x);
          for (const o of gerris) if (o !== g) { const d = Math.hypot(o.x - g.x, o.y - g.y); if (d < 40 * kS) { ta = Math.atan2(g.y - o.y, g.x - o.x); if (g.sex === 'm' && o.sex === 'm' && g.sig <= 0) g.sig = 0.8; } }
          for (const p of pads) if (Math.hypot(p.x - g.x, p.y - g.y) < p.r + 14 * kS) ta = Math.atan2(g.y - p.y, g.x - p.x);
          g.a += angd(g.a, ta) * Math.min(1, dt * (g.prey ? 6 : 2.5));
          if (g.t <= 0 || g.jump > 0) {
            // un coup de rame : la paire du milieu pousse, deux petites rides naissent
            const s = (g.jump > 0 ? 260 : g.prey ? 150 : rnd(110, 50)) * kS;
            g.vx += Math.cos(g.a) * s; g.vy += Math.sin(g.a) * s;
            const px = -Math.sin(g.a), py = Math.cos(g.a);
            addSrc(g.x + px * 9 * kS, g.y + py * 9 * kS, 0.12, 3 * kS); addSrc(g.x - px * 9 * kS, g.y - py * 9 * kS, 0.12, 3 * kS);
            g.t = g.prey ? rnd(0.45, 0.25) : rnd(2.2, 0.7);
            g.jump = 0;
          }
        }
        // signaux des mâles : battements rapides des pattes, qui font des ondes concentriques
        if (g.sig > 0 && Math.random() < dt * 25) addSrc(g.x, g.y, 0.06, 4 * kS);
        const fr = Math.exp(-dt * 2.8);
        g.vx *= fr; g.vy *= fr;
        g.x += g.vx * dt; g.y += g.vy * dt;
        g.x = clamp(g.x, v.x0 + 10, v.x1 - 10); g.y = clamp(g.y, 10, H - 10);
      }
      // gyrins : radeau serré qui tourne, dispersion en zigzag quand on les dérange
      let cx = 0, cy = 0;
      for (const g of gyrins) { cx += g.x; cy += g.y; }
      cx /= gyrins.length || 1; cy /= gyrins.length || 1;
      for (const g of gyrins) {
        g.alarm = Math.max(0, g.alarm - dt);
        const al = g.alarm > 0;
        g.w += (rnd(1, -1) * (al ? 20 : 5)) * dt; g.w = clamp(g.w, -7, 7);
        let ta = g.a + g.w * dt;
        if (!al) { const d = Math.hypot(cx - g.x, cy - g.y); if (d > 26 * kS) ta = g.a + angd(g.a, Math.atan2(cy - g.y, cx - g.x)) * 0.25; }
        for (const o of gyrins) if (o !== g && Math.hypot(o.x - g.x, o.y - g.y) < 7 * kS) ta = Math.atan2(g.y - o.y, g.x - o.x);
        if (!inView(g.x, g.y, 40)) ta = Math.atan2(H / 2 - g.y, v.cx - g.x);
        for (const p of pads) if (Math.hypot(p.x - g.x, p.y - g.y) < p.r + 8 * kS) ta = Math.atan2(g.y - p.y, g.x - p.x);
        g.a += angd(g.a, ta) * Math.min(1, dt * 8);
        const sp = g.sp * (al ? 3.2 : 1) * (0.7 + 0.3 * Math.sin(VT * 3 + g.w));
        g.x += Math.cos(g.a) * sp * dt; g.y += Math.sin(g.a) * sp * dt;
        if (Math.random() < dt * (al ? 30 : 10)) addSrc(g.x + Math.cos(g.a) * 4 * kS, g.y + Math.sin(g.a) * 4 * kS, 0.05 * (al ? 2 : 1), 3 * kS);
      }
      // koïs
      for (const k of kois) {
        k.startle = Math.max(0, k.startle - dt);
        k.gulp = Math.max(0, k.gulp - dt);
        if (k.target && (k.target.gone || (!flies.includes(k.target) && !pellets.includes(k.target)))) k.target = null;
        if (!k.target && k.startle <= 0) {
          let best = null, bd = 380 * kS;
          for (const f of pellets) { if (f.claimed && f.claimed !== k) continue; const d = Math.hypot(f.x - k.x, f.y - k.y); if (d < bd) { bd = d; best = f; } }
          if (!best) for (const f of flies) { if (f.by || f.t < 3) continue; const d = Math.hypot(f.x - k.x, f.y - k.y); if (d < bd * 0.8) { bd = d; best = f; } }
          if (best) { k.target = best; best.claimed = k; }
        }
        let ta, spd = k.sp, dep = 0.35 + 0.35 * n1(VT * 0.07 + k.seed);
        const head = { x: k.x + Math.cos(k.a) * k.len * 0.05, y: k.y + Math.sin(k.a) * k.len * 0.05 };
        if (k.startle > 0) { ta = k.a; spd = k.sp * 6; dep = 0.95; }
        else if (k.target) {
          ta = Math.atan2(k.target.y - head.y, k.target.x - head.x);
          const d = Math.hypot(k.target.x - head.x, k.target.y - head.y);
          spd = k.sp * 1.6; dep = clamp(d / (200 * kS), 0.05, 0.6);
          if (d < 14 * kS) {
            // le gobage : un anneau d'ondes, un bruit sourd
            k.target.gone = true; k.target.by = k; k.target = null; k.gulp = 0.5;
            addSrc(head.x, head.y, -1.1, 9 * kS); gulpSound();
            for (const g of gerris) if (Math.hypot(g.x - head.x, g.y - head.y) < 50 * kS) { g.jump = 0.3; g.a = Math.atan2(g.y - head.y, g.x - head.x); }
          }
        } else {
          k.wand += dt * 0.25;
          ta = k.a + (n1(k.wand + k.seed * 7) - 0.5) * 2.2 * dt * 4;
          for (const o of kois) if (o !== k) { const d = Math.hypot(o.x - k.x, o.y - k.y); if (d < k.len * 0.9) ta = k.a + angd(k.a, Math.atan2(k.y - o.y, k.x - o.x)) * 0.3; }
        }
        if (!inView(k.x, k.y, k.len * 0.6)) ta = k.a + angd(k.a, Math.atan2(H / 2 - k.y, v.cx - k.x)) * 0.5;
        k.a += clamp(angd(k.a, ta), -2.5 * dt * (k.startle > 0 ? 6 : 1), 2.5 * dt * (k.startle > 0 ? 6 : 1));
        k.depth += (dep - k.depth) * (1 - Math.exp(-dt * 1.2));
        k.x += Math.cos(k.a) * spd * dt; k.y += Math.sin(k.a) * spd * dt;
        k.ph += dt * (3 + spd / (12 * kS));
        if (k.depth < 0.18 && Math.random() < dt * 12) addSrc(head.x, head.y, 0.07, 6 * kS);
      }
      for (let i = splashes.length - 1; i >= 0; i--) { splashes[i].t += dt; if (splashes[i].t > 0.35) splashes.splice(i, 1); }
      if (amb) {
        const c = au.ctx.currentTime;
        amb.gg.gain.setTargetAtTime(0.006 + weather.rain * 0.05 + (gust ? 0.025 : 0), c, 0.5);
        amb.hp.frequency.setTargetAtTime(500 + weather.rain * 3500, c, 0.5);
      }
    }

    /* ───────── uniformes ───────── */
    const uSrc = new Float32Array(256), uPad = new Float32Array(64), uF0 = new Float32Array(32), uF1 = new Float32Array(32), uC = new Float32Array(192);
    let nC = 0;
    function packScene() {
      uPad.fill(0); uF0.fill(0); uF1.fill(0); uC.fill(0); nC = 0;
      pads.forEach((p, i) => { if (i < 16) { uPad[i * 4] = p.x; uPad[i * 4 + 1] = p.y; uPad[i * 4 + 2] = p.r; } });
      kois.forEach((k, i) => { if (i < 8) { uF0.set([k.x, k.y, k.a, k.len], i * 4); uF1.set([k.ph, clamp(k.depth, 0, 1), k.var, k.seed], i * 4); } });
      const cast = (x, y, r, kind) => { if (nC < 48) { uC.set([x, y, r, kind], nC * 4); nC++; } };
      for (const p of pads) cast(p.x, p.y, p.r, 0);
      for (const g of gerris) {
        const c = Math.cos(g.a), s = Math.sin(g.a);
        const feet = [[2, 15], [2, -15], [-14, 12], [-14, -12]];
        for (const [fx, fy] of feet) cast(g.x + (c * fx - s * fy) * kS, g.y + (s * fx + c * fy) * kS, 3.2 * kS, 1);
      }
      for (const f of flies) if (!f.gone) cast(f.x, f.y, 5 * kS, 2);
    }

    /* ───────── un sous-pas de l'onde (GPU) ───────── */
    let stepN = 0;
    function waveStep(extra) {
      const { K, pg, GW, GH } = R;
      uSrc.fill(0);
      const n = Math.min(64, srcs.length / 4 + extra.length / 4);
      uSrc.set(srcs.slice(0, 256));
      if (extra.length) uSrc.set(extra.slice(0, 256 - Math.min(256, srcs.length)), Math.min(256, srcs.length));
      const K2 = 1.75 * (0.25 + 0.75 * cfg.depth);
      const damp = 1 - 0.0004 - cfg.damp * 0.006;
      const L = line ? [line.x, Math.sin(stepN * waveW()) * 0.3, 1.5 * cell(), 1] : [0, 0, 0, 0];
      pg.wave.use().t('uW', R.Wv.r).t('uD', R.D).f('uWt', 1 / GW, 1 / GH).f('uRes', W, H).f('uK', K2).f('uDamp', damp).f('uSponge', 1).f('uCellPx', cell()).f('uVisc', 0.015 + cfg.damp * 0.08)
        .f('uLine', L[0], L[1], L[2], L[3]).i('uNP', Math.min(16, pads.length)).v4('uPad', uPad).i('uNS', n).v4('uSrc', uSrc);
      K.run(pg.wave, R.Wv.w); R.Wv.swap();
      stepN++;
    }
    // pulsation des sources de la cuve, en radians par sous-pas
    const waveW = () => 0.12 + cfg.freq * 0.32;

    /* ───────── rendu ───────── */
    function render() {
      const { K, gl, pg } = R;
      const bare = env.decor === false, ink = bare && env.theme === 'light';
      const tank = cfg.scene === 'cuve';
      const sunDir = [0.35, 0.55], slope = 30, depthPx = (tank ? 46 : 60) * kS * (0.5 + cfg.depth * 0.7);
      // caustiques : chaque sommet du maillage suit un rayon réfracté jusqu'au fond
      gl.bindFramebuffer(gl.FRAMEBUFFER, R.cau.fb); gl.viewport(0, 0, R.cau.w, R.cau.h);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      pg.caust.use().t('uW', R.Wv.r).t('uD', R.D).f('uRes', W, H).f('uWt', 1 / R.GW, 1 / R.GH).f('uSunDir', sunDir[0], sunDir[1]).f('uSlope', slope).f('uDepth', depthPx).f('uCell', cell()).f('uGain', 1);
      gl.bindVertexArray(R.mesh.vao);
      gl.drawElements(gl.TRIANGLES, R.mesh.n, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.BLEND);
      packScene();
      pg.comp.use().t('uW', R.Wv.r).t('uD', R.D).t('uCau', R.cau).t('uFloor', R.floor)
        .f('uRes', W, H).f('uWt', 1 / R.GW, 1 / R.GH).f('uSunDir', sunDir[0] * 30 / 60, sunDir[1] * 30 / 60).f('uTime', VT)
        .f('uSlope', slope).f('uRefr', 9 * kS).f('uSun', cfg.sun).f('uDecor', bare ? 0 : 1).f('uInk', ink ? 1 : 0).f('uTank', tank ? 1 : 0)
        .f('uGlint', cfg.glint ? 1 : 0).f('uMean', cfg.mean ? 1 : 0).f('uDepth', depthPx).f('uCell', cell())
        .f('uWater', 0.018, 0.085, 0.075).f('uCauT', 1 / R.cau.w, 1 / R.cau.h).f('uPaper', 0.88, 0.84, 0.73).f('uSky', 0.55, 0.68, 0.8)
        .i('uNF', bare ? 0 : Math.min(8, kois.length)).v4('uF0', uF0).v4('uF1', uF1).i('uNC', bare ? 0 : nC).v4('uC', uC);
      K.run(pg.comp, null);
      ctx.save();
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(K.canvas, 0, 0, W, H);
      ctx.restore();
      if (!bare) drawSurface();
      drawLabel(bare && env.theme === 'light');
    }

    /* ───────── ce qui flotte (2D, au-dessus de l'eau) ───────── */
    function drawSurface() {
      ctx.save();
      // traits des murs dans la cuve : rien à dessiner, le GPU s'en charge
      for (const p of pads) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        const g = ctx.createRadialGradient(-p.r * 0.2, -p.r * 0.2, p.r * 0.1, 0, 0, p.r);
        g.addColorStop(0, `hsl(${100 + p.hue * 20},45%,42%)`); g.addColorStop(1, `hsl(${95 + p.hue * 15},50%,28%)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, p.r, 0.12, TAU - 0.12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(200,230,150,.25)'; ctx.lineWidth = 1;
        for (let k = 1; k < 14; k++) { const a = 0.12 + (k / 14) * (TAU - 0.24); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * p.r * 0.92, Math.sin(a) * p.r * 0.92); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(120,40,40,.45)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, p.r - 1, 0.12, TAU - 0.12); ctx.stroke();
        if (p.flower) {
          ctx.rotate(-p.a * 1.3);
          for (let k = 0; k < 16; k++) {
            const a = (k / 16) * TAU + (k % 2) * 0.2, l = p.r * (k % 2 ? 0.42 : 0.5);
            ctx.fillStyle = k % 2 ? 'rgba(250,240,245,.95)' : 'rgba(255,255,255,.98)';
            ctx.beginPath(); ctx.ellipse(Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.5, l * 0.5, l * 0.17, a, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = '#f2c84b'; ctx.beginPath(); ctx.arc(0, 0, p.r * 0.11, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      for (const p of pellets) { ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6 * kS, 0, TAU); ctx.fill(); }
      for (const f of flies) {
        if (f.gone) continue;
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a);
        const wob = f.buzz > 0 ? Math.sin(VT * 90) * 0.5 : 0.1;
        ctx.fillStyle = 'rgba(220,230,240,.45)';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-1 * kS, s * 4 * kS, 5 * kS, 2.2 * kS, s * (0.5 + wob), 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#22201c'; ctx.beginPath(); ctx.ellipse(0, 0, 4.5 * kS, 2.4 * kS, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#7a2a1a'; ctx.beginPath(); ctx.arc(3.6 * kS, 0, 1.8 * kS, 0, TAU); ctx.fill();
        ctx.restore();
      }
      for (const g of gyrins) {
        ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.a);
        ctx.fillStyle = '#0d0f14'; ctx.beginPath(); ctx.ellipse(0, 0, 3.6 * kS, 2.3 * kS, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(170,200,255,.75)'; ctx.beginPath(); ctx.ellipse(0.8 * kS, -0.8 * kS, 1.6 * kS, 0.7 * kS, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.lineCap = 'round';
      for (const g of gerris) {
        ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.a); ctx.scale(kS, kS);
        ctx.strokeStyle = 'rgba(40,30,20,.9)'; ctx.lineWidth = 0.9;
        const row = Math.sin(g.t * 8) * 1.5;
        ctx.beginPath();
        ctx.moveTo(4, 1); ctx.lineTo(8, 4); ctx.moveTo(4, -1); ctx.lineTo(8, -4);
        ctx.moveTo(1, 1.2); ctx.quadraticCurveTo(3, 10, 2 + row, 15); ctx.moveTo(1, -1.2); ctx.quadraticCurveTo(3, -10, 2 + row, -15);
        ctx.moveTo(-2, 1); ctx.quadraticCurveTo(-8, 8, -14, 12); ctx.moveTo(-2, -1); ctx.quadraticCurveTo(-8, -8, -14, -12);
        ctx.stroke();
        ctx.fillStyle = '#3a2c1c'; ctx.beginPath(); ctx.ellipse(-1, 0, 7, 1.7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5a4428'; ctx.beginPath(); ctx.ellipse(5, 0, 1.8, 1.3, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(235,245,255,.7)';
      for (const s of splashes) { const k = s.t / 0.35; ctx.globalAlpha = 1 - k; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.4 + k * 1.4), 0, TAU); ctx.stroke(); }
      ctx.restore();
    }

    /* ───────── identification ───────── */
    function pick(x, y) {
      for (const g of gerris) if (Math.hypot(g.x - x, g.y - y) < 18 * kS) return { kind: 'gerris', o: g };
      for (const g of gyrins) if (Math.hypot(g.x - x, g.y - y) < 10 * kS) return { kind: 'gyrin', o: g };
      for (const f of flies) if (Math.hypot(f.x - x, f.y - y) < 12 * kS) return { kind: 'mouche', o: f };
      for (const p of pads) if (Math.hypot(p.x - x, p.y - y) < p.r) return { kind: 'pad', o: p };
      for (const k of kois) { const dx = x - k.x, dy = y - k.y, u = -(dx * Math.cos(k.a) + dy * Math.sin(k.a)) / k.len, vv = Math.abs(-dx * Math.sin(k.a) + dy * Math.cos(k.a)); if (u > -0.1 && u < 1 && vv < k.len * 0.16) return { kind: 'koi', o: k }; }
      return null;
    }
    function measure(x, y) {
      try {
        const t = R.Wv.r, gl = R.gl, out = new Float32Array(t.w * t.h * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.FLOAT, out);
        const i = clamp(Math.floor(x / W * t.w), 0, t.w - 1), j = clamp(Math.floor((1 - y / H) * t.h), 0, t.h - 1), o = (j * t.w + i) * 4;
        let mx = 0; for (let k = 2; k < out.length; k += 4) mx = Math.max(mx, out[k]);
        return { h: out[o], mean: out[o + 2], max: mx, ok: true };
      } catch (e) { return { ok: false }; }
    }
    function describe(l) {
      if (l.kind === 'gerris') { const g = l.o; return ['Gerris lacustris', 'gerris ' + (g.sex === 'm' ? 'mâle' : 'femelle') + ' · ' + (g.st === 'mange' ? 'dévore sa proie' : g.st === 'chasse' ? 'a senti une proie aux rides, fonce' : g.sig > 0 ? 'signale aux rivaux par vibrations' : 'patrouille') + (g.fed ? ' · ' + g.fed + ' proie' + (g.fed > 1 ? 's' : '') : ''), '#c9a36a']; }
      if (l.kind === 'gyrin') return ['Gyrinus substriatus', 'gyrin · ' + (l.o.alarm > 0 ? 'alerté, se disperse en zigzag' : 'tourne avec le radeau'), '#9fb7ff'];
      if (l.kind === 'mouche') return ['Musca domestica', 'mouche · ' + (l.o.by ? 'capturée' : l.o.t < 8 ? 'se débat, fait vibrer l’eau' : 'épuisée'), '#b0a490'];
      if (l.kind === 'pad') return ['Nymphaea alba', 'nénuphar blanc · ' + (l.o.flower ? 'en fleur · ' : '') + 'feuille de ' + Math.round(l.o.r / kS * 0.5) + ' cm', '#6fcf6a'];
      if (l.kind === 'koi') { const k = l.o; return ['Cyprinus rubrofuscus', 'koï ' + KOI[k.var].nom + ' · ' + KOI[k.var].desc + ' · ' + (k.startle > 0 ? 'départ en C, fuit' : k.target ? 'monte gober' : 'à ' + Math.round(k.depth * 60) + ' cm de fond'), '#ff7a3c']; }
      const m = l.m;
      if (!m || !m.ok) return ['Mesure indisponible', 'ce navigateur ne lit pas les textures flottantes', '#9fd0ff'];
      const mm = m.h * 2.5;
      const name = Math.abs(mm) < 0.05 ? 'Eau calme' : (mm > 0 ? 'Crête +' : 'Creux −') + Math.abs(mm).toFixed(1).replace('.', ',') + ' mm';
      let role = 'surface';
      if (cfg.scene === 'cuve' && (osc.length || line)) {
        const r = m.max > 0 ? Math.sqrt(m.mean / m.max) : 0;
        role = r > 0.55 ? 'ventre · interférence constructive' : r < 0.2 ? 'nœud · les ondes s’annulent' : 'entre nœud et ventre';
        role += ' · amplitude moyenne ' + Math.round(r * 100) + ' %';
      } else role = Math.abs(mm) < 0.05 ? 'la lumière traverse sans dévier' : mm > 0 ? 'crête : concentre la lumière, comme une loupe' : 'creux : étale la lumière';
      return [name, role, '#9fd0ff'];
    }
    function drawLabel(paper) {
      if (!label) return;
      const a = Math.min(1, label.t * 4, (6 - label.t) * 2);
      if (a <= 0.01) { label = null; return; }
      const o = label.o;
      if (o && (o.gone || (label.kind === 'mouche' && !flies.includes(o)))) { label = null; return; }
      const x = o ? o.x : label.x, y = o ? o.y : label.y;
      let [name, role, col] = describe(label);
      if (paper) col = '#245a6e';
      const side = x > W * 0.62 ? -1 : 1, lx = x + side * 46, ly = y - 40;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + side * 10, y - 9); ctx.lineTo(lx - side * 6, ly + 6); ctx.stroke();
      ctx.shadowColor = paper ? 'rgba(250,246,238,.9)' : 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
      ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillStyle = paper ? 'rgba(30,24,40,.94)' : 'rgba(250,250,245,.96)';
      ctx.font = (label.kind === 'eau' ? '' : 'italic ') + '500 14px "Space Grotesk", sans-serif';
      ctx.fillText(name, lx, ly);
      ctx.fillStyle = col;
      ctx.font = '500 9.5px "JetBrains Mono", monospace';
      ctx.fillText(role.toUpperCase(), lx, ly + 15);
      ctx.restore();
    }

    /* ───────── boucle ───────── */
    let pending = false, finger = null, rainAt = null, rTimer = 0;
    function frame(t, dt) {
      if (dt > 0) {
        update(dt);
        const n = clamp(Math.round(dt * 120), 1, 6);
        for (let i = 0; i < n; i++) {
          const ex = [];
          const w = waveW(), amp = 0.5;
          for (const o of osc) ex.push(o.x, o.y, Math.sin(stepN * w) * amp * 0.35, 5 * kS);
          if (mover) {
            const vs = (0.2 + cfg.vsrc * 1.3) * Math.sqrt(1.75 * (0.25 + 0.75 * cfg.depth)) / 2 * cell() * 120 * dt / n;
            mover.x += vs * mover.dir;
            const v = view();
            if (mover.x > v.x1 - 40 || mover.x < v.x0 + 40) mover.dir *= -1;
            ex.push(mover.x, mover.y, Math.sin(stepN * w) * amp * 0.35, 5 * kS);
          }
          if (finger) { const d = Math.hypot(finger.dx, finger.dy); if (d > 0.3) ex.push(finger.x, finger.y, -clamp(d * 0.02, 0.02, 0.25), 7 * kS); }
          waveStep(ex);
          srcs = [];
        }
        if (finger) { finger.dx *= 0.5; finger.dy *= 0.5; }
        if (rainAt) { let k = dt * 40; while (k > 0) { if (Math.random() < k) { const a = rnd(TAU), d = Math.sqrt(Math.random()) * 140 * kS; drop(rainAt.x + Math.cos(a) * d, rainAt.y + Math.sin(a) * d, false); } k -= 1; } }
        if (label) { label.t += dt; if (label.kind === 'eau' && (rTimer += dt) > 0.4) { rTimer = 0; label.m = measure(label.x, label.y); } }
      }
      if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); }
    }
    function setQuality(q) {
      if (q === cfg.q) return;
      try { const old = R; R = initGL(q); cfg.q = q; old.K.lose(); paintD(); paintFloor(); } catch (e) { console.warn(e); }
    }

    if (window.FASC_DEBUG) window.FASC_DEBUG.eau = { get R() { return R; }, cfg, setScene, setExp, drop, run(n, h) { for (let i = 0; i < n; i++) frame(0, h); render(); } };

    setScene('mare');
    for (let i = 0; i < 30; i++) frame(0, 1 / 30);

    // tracé des murs à la main (outil MUR / GOMME)
    function wallAt(x0, y0, x1, y1, erase) {
      if (erase) { walls = walls.filter((w) => distSeg(x1, y1, w) > 18 * kS); }
      else walls.push({ ax: x0, ay: y0, bx: x1, by: y1, wd: 8 * kS });
      paintD();
    }
    function distSeg(x, y, w) {
      const abx = w.bx - w.ax, aby = w.by - w.ay, L2 = abx * abx + aby * aby || 1, h = clamp(((x - w.ax) * abx + (y - w.ay) * aby) / L2, 0, 1);
      return Math.hypot(x - (w.ax + abx * h), y - (w.ay + aby * h));
    }

    return {
      livePaused: true,
      frame,
      down(p) {
        const tool = env.tool;
        if (tool === 'observer') {
          const l = env.decor === false ? null : pick(p.x, p.y);
          label = l ? Object.assign(l, { t: 0 }) : { kind: 'eau', x: p.x, y: p.y, t: 0, m: measure(p.x, p.y) };
          rTimer = 0;
        } else if (tool === 'doigt') { finger = { x: p.x, y: p.y, dx: 0, dy: 0 }; addSrc(p.x, p.y, -0.4, 6 * kS); alarm(p.x, p.y, 90 * kS); }
        else if (tool === 'goutte') drop(p.x, p.y, true);
        else if (tool === 'pluie') rainAt = { x: p.x, y: p.y };
        else if (tool === 'mouche') addFly(p.x, p.y);
        else if (tool === 'nourrir') { for (let i = 0; i < 4; i++) { const x = p.x + rnd(14, -14) * kS, y = p.y + rnd(14, -14) * kS; pellets.push({ x, y, t: 0, s: rnd(9) }); addSrc(x, y, -0.25, 3 * kS); } if (snd()) au.noise(0.2, 0.05, 2500, 1, 'bandpass'); }
        else if (tool === 'mur' || tool === 'gomme') { drag = { x: p.x, y: p.y }; wallAt(p.x, p.y, p.x + 0.1, p.y, tool === 'gomme'); }
      },
      move(p) {
        if (!p.down) return;
        if (env.tool === 'doigt' && finger) { finger.dx = p.x - finger.x; finger.dy = p.y - finger.y; finger.x = p.x; finger.y = p.y; if (Math.random() < 0.1) alarm(p.x, p.y, 70 * kS); }
        else if (env.tool === 'pluie' && rainAt) { rainAt.x = p.x; rainAt.y = p.y; }
        else if ((env.tool === 'mur' || env.tool === 'gomme') && drag) {
          if (Math.hypot(p.x - drag.x, p.y - drag.y) > 6) { wallAt(drag.x, drag.y, p.x, p.y, env.tool === 'gomme'); drag = { x: p.x, y: p.y }; }
        }
      },
      up() { finger = null; rainAt = null; drag = null; },
      clear() {
        gerris = []; gyrins = []; kois = []; pads = []; flies = []; pellets = []; osc = []; line = null; mover = null; walls = []; plates.length = 0;
        weather.rain = weather.target = 0; cfg.auto = false; gust = null; label = null;
        R.K.clear(R.Wv.r); R.K.clear(R.Wv.w); paintD();
      },
      dispose() {
        if (amb) { try { amb.gg.gain.setTargetAtTime(0.0001, au.ctx.currentTime, 0.1); amb.s.stop(au.ctx.currentTime + 0.5); } catch (e) { /* rien */ } }
        R.K.lose();
      },
      ui() {
        const L = [];
        if (cfg.scene !== 'cuve') {
          L.push({ type: 'section', label: 'La mare' });
          const fed = gerris.reduce((s, g) => s + g.fed, 0);
          L.push({ type: 'note', text: `${gerris.length} gerris · ${gyrins.length} gyrins · ${kois.length} koïs · ${pads.length} nénuphars · ${flies.filter((f) => !f.gone).length} mouche${flies.length > 1 ? 's' : ''} à l’eau${fed ? ' · ' + fed + ' proie' + (fed > 1 ? 's' : '') + ' dévorée' + (fed > 1 ? 's' : '') : ''}` });
          L.push({ type: 'bar', label: 'Pluie', color: '#9fd0ff', value: weather.rain, txt: weather.rain < 0.03 ? 'aucune' : Math.round(weather.rain * 100) + ' %' });
          L.push({ type: 'buttons', items: [
            { label: weather.target > 0 ? 'Arrêter l’averse' : 'Averse', act: () => { weather.target = weather.target > 0 ? 0 : 0.8; weather.next = 30; } },
            { label: 'Risée', act: () => { const v = view(); gust = { x: v.x0 - 80, y: rnd(H * 0.8, H * 0.2), vx: rnd(120, 70) * kS, life: 8, r: 150 * kS }; } },
            { label: 'Mouche', act: () => { const v = view(); addFly(v.x0 + rnd(v.w * 0.8, v.w * 0.2), rnd(H * 0.8, H * 0.2)); } },
          ] });
          L.push({ type: 'toggle', label: 'Météo changeante (averses, risées, mouches)', value: cfg.auto, set: (x) => { cfg.auto = x; } });
        }
        L.push({ type: 'section', label: 'Scènes' });
        L.push({ type: 'buttons', items: [{ label: 'La mare', act: () => setScene('mare') }, { label: 'Averse', act: () => setScene('averse') }, { label: 'Cuve à ondes', act: () => setScene('cuve') }] });
        if (cfg.scene === 'cuve') {
          L.push({ type: 'section', label: 'Expériences de la cuve' });
          L.push({ type: 'choice', label: 'Dispositif', value: cfg.exp, set: setExp, options: [
            { id: 'deux', label: 'Deux sources' }, { id: 'fente', label: 'Fente' }, { id: 'double', label: 'Fentes de Young' },
            { id: 'refraction', label: 'Réfraction' }, { id: 'lentille', label: 'Lentille' }, { id: 'doppler', label: 'Doppler' }] });
          const lam = (2 * Math.PI / waveW()) * Math.sqrt(1.75 * (0.25 + 0.75 * cfg.depth)) / 2 * cell();
          L.push({ type: 'note', text: {
            deux: 'Deux sources en phase. Les lignes calmes (nœuds) dessinent des hyperboles : là, une crête rencontre toujours un creux.',
            fente: 'Une onde plane traverse une fente. Plus la fente est étroite devant la longueur d’onde, plus l’onde s’épanouit : c’est la diffraction.',
            double: 'L’expérience de Thomas Young (1801), avec de l’eau : derrière deux fentes, des franges alternent.',
            refraction: 'Une plaque immergée rend l’eau moins profonde : l’onde y ralentit et change de direction, comme la lumière dans du verre.',
            lentille: 'Une zone peu profonde en forme de lentille ralentit le centre de l’onde : le front se courbe et converge vers un foyer.',
            doppler: 'La source se déplace : les crêtes se resserrent devant, s’espacent derrière. Plus vite que les ondes, elle trace un sillage en V, comme un bateau.',
          }[cfg.exp] + ' Longueur d’onde ≈ ' + Math.round(lam) + ' px.' });
          L.push({ type: 'slider', label: 'Fréquence', min: 0, max: 1, step: 0.01, value: cfg.freq, fmt: (x) => (Math.round((0.12 + x * 0.32) * 120 / TAU * 10) / 10).toString().replace('.', ',') + ' Hz', set: (x) => { cfg.freq = x; } });
          if (cfg.exp !== 'refraction' && cfg.exp !== 'lentille' && cfg.exp !== 'doppler') L.push({ type: 'slider', label: cfg.exp === 'deux' ? 'Écart des sources' : 'Largeur des fentes', min: 0, max: 1, step: 0.01, value: cfg.gap, fmt: (x) => Math.round(x * 100) + ' %', set: (x) => { cfg.gap = x; setExp(cfg.exp); } });
          if (cfg.exp === 'doppler') L.push({ type: 'slider', label: 'Vitesse de la source', min: 0, max: 1, step: 0.01, value: cfg.vsrc, fmt: (x) => { const r = 0.2 + x * 1.3; return (Math.round(r * 100) / 100).toString().replace('.', ',') + ' × la vitesse des ondes' + (r > 1 ? ' · mur du son !' : ''); }, set: (x) => { cfg.vsrc = x; } });
          L.push({ type: 'toggle', label: 'Montrer l’amplitude moyenne (nœuds et ventres)', value: cfg.mean, set: (x) => { cfg.mean = x; } });
        }
        L.push({ type: 'section', label: 'L’eau' });
        if (cfg.scene !== 'cuve') L.push({ type: 'slider', label: 'Brise', min: 0, max: 1, step: 0.01, value: cfg.breeze, fmt: (x) => (x < 0.03 ? 'miroir' : x > 0.8 ? 'vent frais' : Math.round(x * 100) + ' %'), set: (x) => { cfg.breeze = x; } });
        L.push({ type: 'slider', label: 'Profondeur', min: 0, max: 1, step: 0.01, value: cfg.depth, fmt: (x) => (x < 0.25 ? 'très peu profonde · ondes lentes' : x > 0.8 ? 'profonde · ondes rapides' : Math.round(10 + x * 50) + ' cm'), set: (x) => { cfg.depth = x; } });
        L.push({ type: 'slider', label: 'Amortissement', min: 0, max: 1, step: 0.01, value: cfg.damp, fmt: (x) => (x < 0.05 ? 'eau parfaite' : x > 0.8 ? 'eau sirupeuse' : Math.round(x * 100) + ' %'), set: (x) => { cfg.damp = x; } });
        L.push({ type: 'slider', label: 'Soleil', min: 0, max: 1, step: 0.01, value: cfg.sun, fmt: (x) => (x < 0.1 ? 'ciel couvert' : x > 0.9 ? 'plein soleil' : Math.round(x * 100) + ' %'), set: (x) => { cfg.sun = x; } });
        L.push({ type: 'toggle', label: 'Reflets du soleil', value: cfg.glint, set: (x) => { cfg.glint = x; } });
        L.push({ type: 'section', label: 'Affichage' });
        L.push({ type: 'choice', label: 'Qualité du calcul', value: cfg.q, set: setQuality, options: [{ id: 'legere', label: 'Légère' }, { id: 'normale', label: 'Normale' }, { id: 'haute', label: 'Haute' }] });
        L.push({ type: 'note', text: `Grille de ${R.GW}×${R.GH} pour l’onde · ${(R.mesh.n / 6).toLocaleString('fr-FR')} rayons lumineux suivis.` });
        return L;
      },
    };
  }
})();
