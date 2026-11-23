// Hero «Laminar»: miles de filamentos cruzan el hero de borde a borde. Lejos del foco son tenues
// y turbulentos; al acercarse se ordenan en una corriente laminar que gira sobre sí misma como una
// cinta de seda. Por ellos viajan paquetes de luz y unos pocos, en #FFA470, toman un camino más
// directo. El cursor aparta la corriente, que lo rodea y se vuelve a cerrar detrás.
//
// WebGL2: cada filamento es una tira de líneas calculada entera en el vertex shader (sin estado
// ni estelas acumuladas), con mezcla aditiva sobre negro opaco y limpieza total en cada fotograma.
// El texto del hero se protege dentro del shader: los filamentos se apagan cerca de él.

const VERTEX = `#version 300 es
precision highp float;
layout(location = 0) in float aT;
layout(location = 1) in vec4 aSeed; // carril, aleatorio, aleatorio, acento
uniform float uTime;
uniform vec2 uFocus;
uniform vec4 uCopy;    // rectángulo del texto en fracciones del hero: x0, y0, x1, y1
uniform float uAspect;
uniform vec3 uPointer; // x, y (fracciones del hero), fuerza
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

  // Anchura de la corriente: abierta lejos del foco, recogida en el foco.
  float pinch = exp(-dx * dx / (uNarrow > 0.5 ? 0.05 : 0.018));
  float open = mix(0.36, 0.2, smoothstep(-0.1, 0.25, dx)) * (uNarrow > 0.5 ? 0.55 : 1.0);
  float spread = mix(open, 0.035, pinch);

  // Trenzado y giro de cinta al pasar por el foco.
  float braid = 0.18 * sin(6.2831 * (1.6 * u) + lane * 3.1 + t * 0.12 + r1 * 2.0);
  float phi = 3.1416 * smoothstep(-0.35, 0.35, dx) + 0.25 * sin(t * 0.06);
  float depth = sin(phi) * lane;
  float y = cy + spread * (lane * cos(phi) + 0.35 * depth * dx + braid * (1.0 - pinch * 0.6));

  // Turbulencia: fuerte lejos del foco por la izquierda, casi nula en el foco y a la derecha.
  float turbAmp = (0.004 + 0.05 * smoothstep(0.62, 0.0, u) * (1.0 - pinch)) * mix(1.0, 0.25, acc);
  y += turbAmp * (0.6 * sin(17.0 * u + r1 * 40.0 + t * 0.9) + 0.4 * sin(23.0 * u + r2 * 60.0 - t * 1.4));

  // El cursor aparta la corriente.
  vec2 d = vec2((u - uPointer.x) * uAspect, y - uPointer.y);
  float fall = exp(-dot(d, d) / 0.012);
  y += uPointer.z * 0.07 * fall * sign(d.y + 1e-4);

  // Paquetes de luz que viajan hacia la derecha a lo largo de cada filamento.
  float pk = fract(u * 0.7 - t * 0.05 * (0.6 + r1) - r2);
  float packet = exp(-pow((pk - 0.5) / 0.035, 2.0));
  float a = (0.012 + 0.026 * r2) * (0.45 + 1.8 * packet) * (0.75 + 0.25 * depth);
  a *= 1.0 + 0.5 * pinch;
  if (acc > 0.5) a = (0.35 + 0.65 * packet) * smoothstep(0.1, 0.45, u);

  // Se funde arriba (barra superior) y abajo, y se apaga alrededor del texto.
  a *= smoothstep(0.02, 0.16, y) * smoothstep(1.0, 0.86, y);
  // Óvalo muy suave alrededor del texto: sin esquinas ni bordes visibles.
  vec2 center = (uCopy.xy + uCopy.zw) * 0.5;
  vec2 radius = (uCopy.zw - uCopy.xy) * 0.5 + vec2(0.06 / uAspect, 0.06);
  float r = length((vec2(u, y) - center) / max(radius, vec2(1e-3)));
  a *= mix(0.05, 1.0, smoothstep(0.75, 1.7, r));

  vAlpha = a;
  vAccent = acc;
  gl_Position = vec4(u * 2.0 - 1.0, 1.0 - 2.0 * y, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in float vAlpha;
in float vAccent;
out vec4 o;
void main() {
  vec3 bone = vec3(0.93, 0.91, 0.87);
  vec3 accent = vec3(1.0, 0.643, 0.439); // #FFA470
  o = vec4(mix(bone, accent, vAccent) * vAlpha, 1.0);
}`;

const mounts = new WeakMap();

export function mountLaminar(canvas) {
  if (mounts.has(canvas)) return mounts.get(canvas);
  const hero = canvas.closest('.hero');
  const copy = hero?.querySelector('.hero-copy');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl || !hero) return () => {};

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const listeners = new AbortController();
  const passive = { passive: true, signal: listeners.signal };

  let prog, uni, tBuf, seedBuf, vao;
  let M = 0, count = 0, builtFor = null;
  let width = 0, height = 0, raf = 0, visible = true, lost = false;
  const focus = [0.7, 0.38], rect = [0, 0, 0, 0];
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, ton: 0 };
  const start = performance.now();

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function init() {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    uni = Object.fromEntries(['uTime', 'uFocus', 'uCopy', 'uAspect', 'uPointer', 'uNarrow'].map(n => [n, gl.getUniformLocation(prog, n)]));
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    tBuf = gl.createBuffer();
    seedBuf = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 1);
    builtFor = null;
  }

  // Menos filamentos y vértices en móvil: misma imagen, mitad de trabajo.
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
      const g = ((rnd() + rnd() + rnd()) / 3) * 2 - 1; // más densidad en el centro de la corriente
      seeds.set([accent ? g * 0.25 : g * 1.15, rnd(), rnd(), accent], i * 4);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    builtFor = narrow;
  }

  function layout() {
    const h = hero.getBoundingClientRect();
    width = h.width;
    height = h.height;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const narrow = mobile.matches;
    if (builtFor !== narrow) build(narrow);
    // Rectángulo del texto, con margen, y foco de la corriente por encima o a la derecha de él.
    if (copy) {
      const c = copy.getBoundingClientRect();
      rect[0] = (c.left - h.left) / width;
      rect[1] = (c.top - h.top) / height;
      rect[2] = (c.right - h.left) / width;
      rect[3] = (c.bottom - h.top) / height;
    }
    focus[0] = narrow ? 0.55 : 0.7;
    focus[1] = narrow ? Math.max(0.22, rect[1] * 0.55) : Math.min(0.48, Math.max(0.3, rect[1] - 0.06));
  }

  function frame(now) {
    if (lost || !width || !height) return;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    pointer.on += (pointer.ton - pointer.on) * 0.05;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uni.uTime, (now - start) / 1000 + 20);
    gl.uniform2f(uni.uFocus, focus[0], focus[1]);
    gl.uniform4f(uni.uCopy, rect[0], rect[1], rect[2], rect[3]);
    gl.uniform1f(uni.uAspect, width / height);
    gl.uniform3f(uni.uPointer, pointer.x, pointer.y, pointer.on);
    gl.uniform1f(uni.uNarrow, mobile.matches ? 1 : 0);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, M, count);
  }

  function tick(now) {
    raf = 0;
    frame(now);
    schedule();
  }

  // Solo anima mientras el hero se ve y la pestaña está activa; con «reducir movimiento», un fotograma fijo.
  function schedule() {
    if (raf || lost) return;
    if (reduced.matches) { frame(start + 12000); return; }
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  init();
  layout();
  schedule();

  const resizer = new ResizeObserver(() => { layout(); frame(performance.now()); });
  resizer.observe(hero);
  if (copy) resizer.observe(copy);
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule(); else stop();
  });
  seen.observe(hero);

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : schedule()), { signal: listeners.signal });
  reduced.addEventListener('change', () => { stop(); schedule(); }, { signal: listeners.signal });
  mobile.addEventListener('change', layout, { signal: listeners.signal });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; stop(); }, { signal: listeners.signal });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; init(); layout(); schedule(); }, { signal: listeners.signal });

  hero.addEventListener('pointermove', e => {
    const h = hero.getBoundingClientRect();
    pointer.tx = (e.clientX - h.left) / h.width;
    pointer.ty = (e.clientY - h.top) / h.height;
    if (pointer.ton === 0) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.ton = 1;
  }, passive);
  hero.addEventListener('pointerleave', () => { pointer.ton = 0; }, passive);
  hero.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') pointer.ton = 0; }, passive);

  function destroy() {
    stop();
    listeners.abort();
    resizer.disconnect();
    seen.disconnect();
    mounts.delete(canvas);
  }
  mounts.set(canvas, destroy);
  return destroy;
}

document.querySelectorAll('canvas.laminar-field').forEach(canvas => mountLaminar(canvas));
