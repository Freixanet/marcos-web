// «Pliegue»: una lámina mate, más ancha que la pantalla y vista casi de canto, se pliega despacio.
// La superficie es negra sobre negro; solo las aristas atrapan una luz rasante. Cada pocos segundos
// se forma un pliegue nuevo, que nace en #FFA470 y se enfría a hueso. La luz sigue al cursor.
// WebGL2: un único plano deformado con funciones de pliegue analíticas; la luz se calcula por píxel,
// sin luz ambiente (las caras quedan en #000 exacto), con antialias por derivadas y MSAA.
(() => {
  const canvas = document.querySelector('.stage');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = 7;

  const common = `
  uniform float uA[${K}];
  uniform float uC[${K}];
  uniform float uPh[${K}];
  uniform float uSg[${K}];
  uniform float uT;
  uniform vec2 uF;

  float crease(int k, float X) {
    float conv = exp(-pow((X - uF.x) / 1.25, 2.0));
    float far = uC[k] + 0.15 * sin(0.7 * X + uPh[k] + uT * 0.05) + 0.04 * sin(1.9 * X - uPh[k] * 1.3 + uT * 0.08);
    float near = uF.y + (uC[k] - uF.y) * 0.3 + 0.03 * sin(2.6 * X + uPh[k] + uT * 0.1);
    return mix(far, near, conv);
  }
  float H(vec2 W) {
    float z = 0.0;
    for (int k = 0; k < ${K}; k++) {
      float d = W.y - crease(k, W.x);
      float tent = 0.13 - sqrt(d * d + 0.0009);
      z += uA[k] * uSg[k] * 0.5 * (tent + sqrt(tent * tent + 0.0009));
    }
    return z;
  }`;

  const vs = `#version 300 es
  precision highp float;
  layout(location = 0) in vec2 aGrid;
  uniform mat4 uPV;
  ${common}
  out vec2 vW;
  out vec3 vP;
  void main() {
    vec2 W = vec2(mix(-3.6, 3.6, aGrid.x), mix(-1.0, 1.5, aGrid.y));
    vec3 p = vec3(W, H(W));
    vW = W;
    vP = p;
    gl_Position = uPV * vec4(p, 1.0);
  }`;

  const fs = `#version 300 es
  precision highp float;
  ${common}
  uniform vec3 uEye;
  uniform vec3 uLight;
  uniform int uHot;
  uniform float uHeat;
  in vec2 vW;
  in vec3 vP;
  out vec4 o;
  void main() {
    float e = 0.0015;
    float hx = (H(vW + vec2(e, 0.0)) - H(vW - vec2(e, 0.0))) / (2.0 * e);
    float hp = H(vW + vec2(0.0, e)), hm = H(vW - vec2(0.0, e)), h0 = H(vW);
    float hy = (hp - hm) / (2.0 * e);
    float curv = abs(hp - 2.0 * h0 + hm) / (e * e);
    vec3 n = normalize(vec3(-hx, -hy, 1.0));
    vec3 V = normalize(uEye - vP);
    if (dot(n, V) < 0.0) n = -n;
    vec3 L = normalize(uLight);
    vec3 Hh = normalize(L + V);
    float g = 1.0 - max(dot(n, Hh), 0.0);
    float spec = exp(-g / max(0.006, fwidth(g) * 1.2)) * smoothstep(0.8, 5.0, curv);
    float fade = smoothstep(-0.75, 0.0, vW.y) * smoothstep(1.5, 0.9, vW.y) * smoothstep(3.6, 2.4, abs(vW.x));
    float hot = 0.0;
    for (int k = 0; k < ${K}; k++) {
      if (k == uHot) { float d = vW.y - crease(k, vW.x); hot = exp(-d * d / 0.0025) * uHeat; }
    }
    vec3 bone = vec3(0.93, 0.9, 0.85);
    vec3 accent = vec3(1.0, 0.643, 0.439);
    vec3 col = mix(bone, accent, clamp(hot, 0.0, 1.0)) * spec * (0.85 + 0.6 * hot);
    o = vec4(col * fade, 1.0);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const U = n => gl.getUniformLocation(prog, n);
  const u = { PV: U('uPV'), A: U('uA'), C: U('uC'), Ph: U('uPh'), Sg: U('uSg'), T: U('uT'), F: U('uF'), Eye: U('uEye'), Light: U('uLight'), Hot: U('uHot'), Heat: U('uHeat') };

  // Malla del plano
  const GX = 400, GY = 160;
  const grid = new Float32Array((GX + 1) * (GY + 1) * 2);
  for (let j = 0, p = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) { grid[p++] = i / GX; grid[p++] = j / GY; }
  const idx = new Uint16Array(GX * GY * 6);
  for (let j = 0, p = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, d = c + 1;
    idx.set([a, b, c, b, d, c], p); p += 6;
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

  // Matemática de cámara (column-major)
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, t, up) {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const z = norm(sub(e, t)), x = norm(cross(up, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  }
  function mul(a, b) {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  }

  let w = 0, h = 0, narrow = false, eye = [0, 0, 0];
  function resize() {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    narrow = w < 761;
    eye = narrow ? [0, -1.9, 2.3] : [0, -2.4, 1.75];
    const target = narrow ? [0, 0.45, -0.9] : [0, 0.3, 0.0];
    const proj = perspective((narrow ? 58 : 30) * Math.PI / 180, w / h, 0.1, 20);
    gl.uniformMatrix4fv(u.PV, false, new Float32Array(mul(proj, lookAt(eye, target, [0, 0, 1]))));
    gl.uniform3fv(u.Eye, eye);
    gl.uniform2f(u.F, narrow ? 0.0 : 0.55, 0.2);
  }

  const hash = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const base = [-0.5, -0.12, 0.42, 0.88];
  const PERIOD = 24, STEP = 8;

  const pointer = { x: 0, tx: 0, on: 0, ton: 0 };
  const A = new Float32Array(K), C = new Float32Array(K), Ph = new Float32Array(K), Sg = new Float32Array(K);

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 1);
  const start = performance.now();

  function frame(now) {
    const t = (now - start) / 1000 + 6;
    let hot = -1, heat = 0, newest = Infinity;
    for (let k = 0; k < 4; k++) {
      A[k] = 0.75 + 0.25 * Math.sin(t * 0.07 + k * 1.9);
      C[k] = base[k];
      Ph[k] = k * 1.7;
      Sg[k] = k % 2 ? -1 : 1;
    }
    for (let k = 4; k < K; k++) {
      const local = t - (k - 4) * STEP;
      const n = Math.floor(local / PERIOD), p = (local - n * PERIOD) / PERIOD;
      A[k] = p < 0.2 ? ease(p / 0.2) : p < 0.72 ? 1 : 1 - ease((p - 0.72) / 0.28);
      C[k] = -0.55 + 1.5 * hash(n, k);
      Ph[k] = hash(n + 9, k) * 6.28;
      Sg[k] = hash(n + 3, k) < 0.5 ? -1 : 1;
      const since = p * PERIOD;
      if (since < newest) { newest = since; hot = k; }
    }
    heat = Math.max(0, 1 - newest / 5) ** 1.5;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.on += (pointer.ton - pointer.on) * 0.03;
    const idle = Math.sin(t * 0.11) * 0.3;
    const lx = narrow ? idle : idle * (1 - pointer.on) + pointer.x * 0.5 * pointer.on;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1fv(u.A, A);
    gl.uniform1fv(u.C, C);
    gl.uniform1fv(u.Ph, Ph);
    gl.uniform1fv(u.Sg, Sg);
    gl.uniform1f(u.T, t);
    gl.uniform3f(u.Light, lx, 0.5, 0.85);
    gl.uniform1i(u.Hot, hot);
    gl.uniform1f(u.Heat, heat);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }

  function loop(now) {
    frame(now);
    if (!document.hidden) requestAnimationFrame(loop);
  }

  resize();
  new ResizeObserver(() => { resize(); frame(performance.now()); }).observe(canvas);
  if (reduce) frame(start);
  else requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) requestAnimationFrame(loop); });

  const hero = canvas.parentElement;
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.ton = 1;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.ton = 0; });
})();
