/* Fascinations — la cabine de projection : le développement commun des images (WebGL2).
   Une machine dessine sa scène en lumière linéaire (HDR, sans plafond à 1) dans cab.scene,
   puis cab.finish(opt) la « développe » comme une pellicule, sur le modèle du Feu :
   halo à plusieurs échelles (filtre double de Bjørge, 2015, conçu pour les GPU mobiles),
   exposition, courbe filmique (ACES de Narkowicz, ou AgX), étalonnage, vignettage naturel (cos⁴),
   grain argentique et tramage contre les bandes.
   Usage :
     const K = FKGL.GLKit(cw, ch);
     const cab = FKGL.cabine(K, { levels: 6 });
     … on dessine dans cab.scene (K.run(prog, cab.scene) ou gl.bindFramebuffer(…, cab.scene.fb)) …
     cab.finish({ expo: 1.2, bloom: 0.8, thr: 0.9 });   // dessine dans le canevas de K
   Option : cab.finish({ glowSrc: maCible }) prend le halo d'une autre cible (une émission seule, comme le Feu). */
(function () {
  const F = window.FKGL;
  if (!F) return;
  const { HEAD } = F;

  const FS_DOWN = HEAD + `
uniform sampler2D uT; uniform vec2 uPx; uniform float uThr, uKnee, uFirst, uClampV;
out vec4 o;
vec3 pre(vec3 c){
  c = min(c, vec3(uClampV));
  if (uFirst < .5) return c;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThr + uKnee, 0., 2. * uKnee); soft = soft * soft / (4. * uKnee + 1e-5);
  return c * max(soft, br - uThr) / max(br, 1e-5);
}
void main(){
  vec3 s = pre(texture(uT, vUv).rgb) * 4.;
  s += pre(texture(uT, vUv - uPx).rgb) + pre(texture(uT, vUv + uPx).rgb);
  s += pre(texture(uT, vUv + vec2(uPx.x, -uPx.y)).rgb) + pre(texture(uT, vUv - vec2(uPx.x, -uPx.y)).rgb);
  o = vec4(s * .125, 1.);
}`;

  const FS_UP = HEAD + `
uniform sampler2D uT, uD; uniform vec2 uPx; uniform float uScat;
out vec4 o;
void main(){
  vec3 s = texture(uT, vUv + vec2(-2. * uPx.x, 0.)).rgb + texture(uT, vUv + vec2(2. * uPx.x, 0.)).rgb
         + texture(uT, vUv + vec2(0., 2. * uPx.y)).rgb + texture(uT, vUv + vec2(0., -2. * uPx.y)).rgb;
  s += 2. * (texture(uT, vUv + uPx).rgb + texture(uT, vUv - uPx).rgb + texture(uT, vUv + vec2(uPx.x, -uPx.y)).rgb + texture(uT, vUv - vec2(uPx.x, -uPx.y)).rgb);
  o = vec4(mix(texture(uD, vUv).rgb, s / 12., uScat), 1.);
}`;

  const FS_FIN = HEAD + `
uniform sampler2D uS, uB; uniform vec2 uRes; uniform float uExpo, uBloom, uSat, uCon, uVig, uGrain, uTime, uTone, uInk, uBlack;
uniform vec3 uTint, uPaper, uLift;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
// AgX minimal (Benjamin Wrensch, 2023) : les couleurs saturées très lumineuses blanchissent sans virer de teinte
vec3 agx(vec3 v){
  const mat3 M = mat3(.842479062253094, .0423282422610123, .0423756549057051, .0784335999999992, .878468636469772, .0784336, .0792237451477643, .0791661274605434, .879142973793104);
  const mat3 Mi = mat3(1.19687900512017, -.0528968517574562, -.0529716355144438, -.0980208811401368, 1.15190312990417, -.0980434501171241, -.0990297440797205, -.0989611768448433, 1.15107367264116);
  v = clamp(log2(max(M * v, vec3(1e-10))), -12.47393, 4.026069);
  v = (v + 12.47393) / 16.5;
  vec3 v2 = v * v, v4 = v2 * v2;
  v = 15.5 * v4 * v2 - 40.14 * v4 * v + 31.96 * v4 - 6.868 * v2 * v + .4298 * v2 + .1191 * v - .00232;
  return pow(max(Mi * v, vec3(0.)), vec3(2.2));
}
float tpdf(vec2 p){ return hash12(p) + hash12(p + 17.31) - 1.; }
void main(){
  vec3 c = texture(uS, vUv).rgb;
  c += texture(uB, vUv).rgb * uBloom;
  c = c * uTint * uExpo + uLift;
  // vignettage naturel d'un objectif : cos⁴ de l'angle de champ
  vec2 d = (vUv - .5) * vec2(uRes.x / uRes.y, 1.);
  float r2 = dot(d, d) * uVig;
  c *= 1. / ((1. + r2) * (1. + r2));
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = max(mix(vec3(l), c, uSat), 0.);
  vec3 t = uTone > .5 ? agx(c) : aces(c);
  // contraste autour du gris moyen, en espace perceptif
  t = pow(t, vec3(1. / 2.2));
  t = clamp((t - .5) * uCon + .5, 0., 1.);
  float lum = dot(t, vec3(.2126, .7152, .0722));
  if (uInk > .5){
    // fond papier : la lumière devient une encre de même teinte (on ne peut pas ajouter de lumière au blanc)
    float a = clamp(max(t.r, max(t.g, t.b)) * 1.3, 0., 1.);
    vec3 ink = clamp(mix(vec3(lum), t, 1.45) * .92 - .04, 0., 1.);
    t = mix(uPaper, ink, a);
  }
  vec2 px = vUv * uRes;
  // grain argentique, plus visible dans les tons moyens, renouvelé à chaque image
  float gm = 4. * lum * (1. - lum) + uBlack * (1. - lum);
  t += (hash12(px + fract(uTime * 7.31) * 113.) - .5) * uGrain * gm;
  t += tpdf(px + fract(uTime * 3.17) * 71.) / 255.;
  o = vec4(t, 1.);
}`;

  function cabine(K, opt) {
    opt = opt || {};
    const gl = K.gl;
    const W = opt.w || K.canvas.width, H = opt.h || K.canvas.height;
    const pd = K.program(FS_DOWN), pu = K.program(FS_UP), pf = K.program(FS_FIN);
    const scene = K.target(W, H, 'h', gl.LINEAR);
    const levels = [];
    let w = W, h = H;
    const nl = opt.levels || 6;
    for (let i = 0; i < nl; i++) {
      w = Math.max(2, w >> 1); h = Math.max(2, h >> 1);
      levels.push({ d: K.target(w, h, 'h', gl.LINEAR), u: K.target(w, h, 'h', gl.LINEAR) });
      if (w <= 4 || h <= 4) break;
    }
    const C = {
      scene, levels, W, H,
      t: 0,
      // calcule le halo dans levels[0].u ; src : la cible d'où il vient (par défaut la scène)
      glow(src, o) {
        o = o || {};
        let s = src || scene;
        for (let i = 0; i < levels.length; i++) {
          const L = levels[i];
          pd.use().t('uT', s).f('uPx', 1 / s.w, 1 / s.h).f('uThr', o.thr != null ? o.thr : 1).f('uKnee', o.knee != null ? o.knee : 0.5)
            .f('uFirst', i === 0 ? 1 : 0).f('uClampV', o.clampV || 64);
          K.run(pd, L.d);
          s = L.d;
        }
        let u = levels[levels.length - 1].d;
        for (let i = levels.length - 2; i >= 0; i--) {
          const L = levels[i];
          pu.use().t('uT', u).t('uD', L.d).f('uPx', 0.5 / L.d.w, 0.5 / L.d.h).f('uScat', o.radius != null ? o.radius : 0.72);
          K.run(pu, L.u);
          u = L.u;
        }
        return u;
      },
      finish(o) {
        o = o || {};
        C.t += 1 / 60;
        const b = (o.bloom == null ? 0.7 : o.bloom) > 0 ? C.glow(o.glowSrc, o) : levels[0].d;
        const tint = o.tint || [1, 1, 1], paper = o.paper || [0.9, 0.87, 0.8], lift = o.lift || [0, 0, 0];
        pf.use().t('uS', o.src || scene).t('uB', b).f('uRes', K.canvas.width, K.canvas.height)
          .f('uExpo', o.expo == null ? 1 : o.expo).f('uBloom', o.bloom == null ? 0.7 : o.bloom)
          .f('uSat', o.sat == null ? 1 : o.sat).f('uCon', o.con == null ? 1 : o.con).f('uVig', o.vig == null ? 0.35 : o.vig)
          .f('uGrain', o.grain == null ? 0.035 : o.grain).f('uBlack', o.grainBlack == null ? 0.25 : o.grainBlack).f('uTime', C.t)
          .f('uTone', o.tone === 'agx' ? 1 : 0).f('uInk', o.ink ? 1 : 0)
          .f('uTint', tint[0], tint[1], tint[2]).f('uPaper', paper[0], paper[1], paper[2]).f('uLift', lift[0], lift[1], lift[2]);
        K.run(pf, o.out || null);
      },
    };
    return C;
  }
  F.cabine = cabine;
})();
