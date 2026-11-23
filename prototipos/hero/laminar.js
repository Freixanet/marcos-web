// «Laminar»: miles de filamentos cruzan la pantalla de borde a borde. A la izquierda, tenues y
// turbulentos; hacia el foco se ordenan en una corriente laminar que se trenza en un pliegue de luz.
// Unos pocos, en #FFA470, toman un camino más directo. El cursor es un obstáculo que la corriente rodea.
// WebGL2: cada filamento es una tira de líneas calculada en el vertex shader (sin estado ni estelas),
// mezcla aditiva sobre negro opaco y limpieza total en cada fotograma.
(() => {
  const canvas = document.querySelector('.stage');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vs = `#version 300 es
  precision highp float;
  layout(location = 0) in float aT;
  layout(location = 1) in vec4 aSeed; // carril, aleatorio, aleatorio, acento
  uniform float uTime;
  uniform vec2 uFocus;
  uniform float uAspect;
  uniform vec3 uPointer; // x, y (0..1), fuerza
  uniform float uNarrow;
  out float vAlpha;
  out float vAccent;

  void main() {
    float u = mix(-0.03, 1.03, aT);
    float lane = aSeed.x, r1 = aSeed.y, r2 = aSeed.z, acc = aSeed.w;
    float t = uTime;
    float dx = u - uFocus.x;

    // Línea central: una gran S suave que respira.
    float cy = uFocus.y
      + 0.09 * sin(6.2831 * 0.5 * u + t * 0.045 - 0.6)
      + 0.025 * sin(6.2831 * 1.3 * u - t * 0.07 + 1.7);

    // Anchura de la corriente: abierta lejos del foco, estrecha en el foco.
    float pinch = exp(-dx * dx / (uNarrow > 0.5 ? 0.05 : 0.018));
    float open = mix(0.36, 0.2, smoothstep(-0.1, 0.25, dx)) * (uNarrow > 0.5 ? 0.55 : 1.0);
    float spread = mix(open, 0.035, pinch);

    // Trenzado: los carriles se cruzan entre sí con una fase propia.
    float braid = 0.18 * sin(6.2831 * (1.6 * u) + lane * 3.1 + t * 0.12 + r1 * 2.0);
    // La corriente gira sobre sí misma al pasar por el foco, como una cinta.
    float phi = 3.1416 * smoothstep(-0.35, 0.35, dx) + 0.25 * sin(t * 0.06);
    float depth = sin(phi) * lane;
    float y = cy + spread * (lane * cos(phi) + 0.35 * depth * dx + braid * (1.0 - pinch * 0.6));

    // Turbulencia: fuerte a la izquierda, casi nula en el foco y a la derecha.
    float turbAmp = (0.004 + 0.05 * smoothstep(0.62, 0.0, u) * (1.0 - pinch)) * mix(1.0, 0.25, acc);
    y += turbAmp * (0.6 * sin(17.0 * u + r1 * 40.0 + t * 0.9) + 0.4 * sin(23.0 * u + r2 * 60.0 - t * 1.4));

    // El cursor aparta la corriente, que lo rodea y se vuelve a cerrar detrás.
    vec2 d = vec2((u - uPointer.x) * uAspect, y - uPointer.y);
    float fall = exp(-dot(d, d) / 0.012);
    y += uPointer.z * 0.07 * fall * sign(d.y + 1e-4);

    // Brillo: paquetes de luz que viajan hacia la derecha a lo largo de cada filamento.
    float pk = fract(u * 0.7 - t * 0.05 * (0.6 + r1) - r2);
    float packet = exp(-pow((pk - 0.5) / 0.035, 2.0));
    float a = (0.012 + 0.026 * r2) * (0.45 + 1.8 * packet) * (0.75 + 0.25 * depth);
    a *= mix(0.25, 1.0, smoothstep(0.05, 0.5, u));                 // tenue bajo el texto
    a *= smoothstep(0.0, 0.14, y) * smoothstep(1.0, 0.86, y);      // se funde arriba y abajo
    a *= 1.0 + 0.5 * pinch;                                       // más luz donde se ordena
    if (acc > 0.5) a = (0.35 + 0.65 * packet) * smoothstep(0.1, 0.45, u) * smoothstep(1.0, 0.86, y);
    vAlpha = a;
    vAccent = acc;
    gl_Position = vec4(u * 2.0 - 1.0, 1.0 - 2.0 * y, 0.0, 1.0);
  }`;

  const fs = `#version 300 es
  precision highp float;
  in float vAlpha;
  in float vAccent;
  out vec4 o;
  void main() {
    vec3 bone = vec3(0.93, 0.91, 0.87);
    vec3 accent = vec3(1.0, 0.643, 0.439);
    o = vec4(mix(bone, accent, vAccent) * vAlpha, 1.0);
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
  const U = name => gl.getUniformLocation(prog, name);
  const uTime = U('uTime'), uFocus = U('uFocus'), uAspect = U('uAspect'), uPointer = U('uPointer'), uNarrow = U('uNarrow');

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  let count = 0, M = 0;
  const tBuf = gl.createBuffer(), seedBuf = gl.createBuffer();

  function build(narrow) {
    M = narrow ? 160 : 240;
    count = narrow ? 1400 : 2600;
    const ts = new Float32Array(M);
    for (let i = 0; i < M; i++) ts[i] = i / (M - 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
    gl.bufferData(gl.ARRAY_BUFFER, ts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);

    let seed = 12345;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const accent = i % 200 === 7 ? 1 : 0;
      // Carriles con distribución más densa en el centro de la corriente.
      const g = (rnd() + rnd() + rnd()) / 3 * 2 - 1;
      seeds.set([accent ? g * 0.25 : g * 1.15, rnd(), rnd(), accent], i * 4);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
  }

  let w = 0, h = 0, narrow = null;
  function resize() {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const n = w < 761;
    if (n !== narrow) { narrow = n; build(n); }
  }

  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, ton: 0 };
  const start = performance.now();
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 1);

  function frame(now) {
    const time = (now - start) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    pointer.on += (pointer.ton - pointer.on) * 0.05;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, time + 20);
    gl.uniform2f(uFocus, narrow ? 0.55 : 0.68, narrow ? 0.3 : 0.48);
    gl.uniform1f(uAspect, w / h);
    gl.uniform3f(uPointer, pointer.x, pointer.y, pointer.on);
    gl.uniform1f(uNarrow, narrow ? 1 : 0);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, M, count);
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
    const r = canvas.getBoundingClientRect();
    pointer.tx = (e.clientX - r.left) / r.width;
    pointer.ty = (e.clientY - r.top) / r.height;
    if (pointer.ton === 0) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.ton = 1;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.ton = 0; });
  hero.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') pointer.ton = 0; });
})();
