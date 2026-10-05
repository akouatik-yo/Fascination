/* Fascination — petite boîte à outils WebGL2 partagée (Feu, Eau…)
   GLKit(w, h) crée un canevas hors écran et son contexte WebGL2 avec cibles flottantes,
   compile des programmes (P.use().t(...).f(...).i(...).v4(...)), crée des cibles simples ou doubles,
   et dessine un triangle plein écran dans une ou deux cibles (sorties multiples).
   Lève une erreur si WebGL2 ou les cibles flottantes manquent : la machine bascule alors sur son repli 2D. */
(function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function GLKit(cw, ch) {
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 indisponible');
    const full = !!gl.getExtension('EXT_color_buffer_float');
    if (!full && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('cibles flottantes indisponibles');
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const emptyVao = gl.createVertexArray();
    const all = { tex: [], fb: [], prog: [] };

    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); throw new Error('shader : ' + log + '\n' + src.split('\n').slice(0, 3).join('\n')); }
      return s;
    }
    function program(fs, vs) {
      const p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, vs || VS));
      gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'aPos');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('liaison : ' + gl.getProgramInfoLog(p));
      all.prog.push(p);
      const loc = {};
      let unit = 0;
      const L = (n) => (n in loc ? loc[n] : (loc[n] = gl.getUniformLocation(p, n)));
      const P = {
        p,
        use() { gl.useProgram(p); unit = 0; return P; },
        t(n, tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex.tex || tex); gl.uniform1i(L(n), unit++); return P; },
        f(n, a, b, c, d) { const l = L(n); if (d !== undefined) gl.uniform4f(l, a, b, c, d); else if (c !== undefined) gl.uniform3f(l, a, b, c); else if (b !== undefined) gl.uniform2f(l, a, b); else gl.uniform1f(l, a); return P; },
        i(n, v) { gl.uniform1i(L(n), v); return P; },
        v4(n, arr) { gl.uniform4fv(L(n), arr); return P; },
      };
      return P;
    }
    function texture(w, h, fmt, filter, data) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      const f32 = fmt === 'f32' && full;
      gl.texImage2D(gl.TEXTURE_2D, 0, f32 ? gl.RGBA32F : gl.RGBA16F, w, h, 0, gl.RGBA, f32 ? gl.FLOAT : gl.HALF_FLOAT, null);
      if (data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      all.tex.push(t);
      return t;
    }
    function target(w, h, fmt, filter) {
      const tex = texture(w, h, fmt, filter == null ? gl.LINEAR : filter);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('cible incomplète');
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      all.fb.push(fb);
      return { tex, fb, w, h };
    }
    function double(w, h, fmt, filter) {
      let a = target(w, h, fmt, filter), b = target(w, h, fmt, filter);
      return { get r() { return a; }, get w() { return b; }, swap() { const t = a; a = b; b = t; }, W: w, H: h };
    }
    const mfb = gl.createFramebuffer();
    all.fb.push(mfb);
    // dessine un triangle plein écran dans une cible (ou deux, en sorties multiples)
    function run(P, out, out2) {
      if (out2) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, mfb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, out.tex, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, out2.tex, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      } else if (out) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb);
      } else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, out ? out.w : canvas.width, out ? out.h : canvas.height);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (out2) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, null, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      }
    }
    function clear(t) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.viewport(0, 0, t.w, t.h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    function read(t, x, y) {
      const out = new Float32Array(4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.readPixels(clamp(x | 0, 0, t.w - 1), clamp(y | 0, 0, t.h - 1), 1, 1, gl.RGBA, gl.FLOAT, out);
      return out;
    }
    function lose() {
      try { const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); } catch (err) { /* rien */ }
    }
    return { gl, canvas, full, program, texture, target, double, run, clear, read, lose, emptyVao };
  }

  /* ───────── shaders ───────── */
  const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0., 1.); }`;
  const HEAD = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 3; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
`;
  window.FKGL = { GLKit, VS, HEAD };
})();
