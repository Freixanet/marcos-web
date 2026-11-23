// «Trazo»: una sola línea cruza la pantalla de borde a borde. La punta improvisa un nudo
// (el problema), la línea se tensa y el nudo se deshace (la solución). Nunca se repite igual.
// Canvas 2D a la resolución real del dispositivo: todo es vector, sin shaders ni desenfoques.
(() => {
  const canvas = document.querySelector('.stage');
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const N = 900;
  const BONE = '#ece7de';
  const ACCENT = '255,164,112';
  const DRAW = 4600, HOLD = 1400, RESOLVE = 3600, REST = 2800;
  const CYCLE = DRAW + HOLD + RESOLVE + REST;

  let w = 0, h = 0, dpr = 1, narrow = false, minDim = 1;
  const xs = new Float32Array(N), ys = new Float32Array(N), ws = new Float32Array(N);
  const px = new Float32Array(N), py = new Float32Array(N);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: 0, ton: 0 };

  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const easeSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
  const clamp01 = t => Math.min(1, Math.max(0, t));

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeKnot(seed) {
    const r = rng(seed * 7919 + 17);
    return {
      c: 0.7 + (r() - 0.5) * 0.06,
      sigma: 0.075 + r() * 0.025,
      D: 11 + r() * 7,
      loops: 7 + r() * 5,
      R1: 0.15 + r() * 0.07,
      R2: 0.06 + r() * 0.05,
      f2: 2.3 + r() * 1.4,
      ph1: r() * Math.PI * 2,
      ph2: r() * Math.PI * 2,
      squash: 0.55 + r() * 0.35,
      tilt: (r() - 0.5) * 0.9,
      dir: r() < 0.5 ? 1 : -1,
      waves: [
        { a: 0.05 + r() * 0.05, f: 0.5 + r() * 0.5, p: r() * Math.PI * 2 },
        { a: 0.015 + r() * 0.025, f: 1.3 + r() * 1.1, p: r() * Math.PI * 2 },
      ],
      grain: r() * 100,
    };
  }

  // Calcula los N puntos de la línea para un nudo, una amplitud de nudo (1 = enredado, 0 = resuelto)
  // y una tensión (0 = suelta, 1 = tensa).
  function shape(k, amp, tension, time, outX, outY, outW) {
    // Recorrido: entra bajo el texto, sube hacia el nudo y sale por la derecha.
    const yIn = narrow ? 0.44 : 0.9, yOut = narrow ? 0.24 : 0.4;
    const x0 = -0.04 * w, x1 = 1.04 * w;
    // Densidad: dentro del nudo el parámetro avanza despacio en x, así las vueltas se amontonan.
    let acc = 0;
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      const u = (s - k.c) / k.sigma;
      const d = 1 + k.D * amp * Math.exp(-0.5 * u * u);
      acc += 1 / d;
      outX[i] = acc;
    }
    const scale = (x1 - x0) / outX[N - 1];
    const slack = 1 - 0.45 * tension;
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      let x = x0 + outX[i] * scale;
      const rise = s < 0.8 ? (3 - 2 * (s / 0.8)) * (s / 0.8) ** 2 : 1;
      let y = h * (yIn + (yOut - yIn) * rise);
      for (let j = 0; j < k.waves.length; j++) {
        const wv = k.waves[j];
        y += Math.sin(Math.PI * 2 * wv.f * s + wv.p + time * 0.00006 * (j + 1)) * wv.a * h * slack;
      }
      // Bucles del nudo: dos giros de frecuencias no enteras para que no parezca un muelle.
      const u = (s - k.c) / k.sigma;
      const win = amp * Math.exp(-0.5 * Math.pow(Math.abs(u), 2.4));
      if (win > 1e-4) {
        const S = (s - (k.c - 2.4 * k.sigma)) / (4.8 * k.sigma);
        const th = k.dir * Math.PI * 2 * k.loops * S + k.ph1 + time * 0.00022;
        const th2 = k.f2 * th + k.ph2;
        let ox = (k.R1 * Math.cos(th) + k.R2 * Math.cos(th2)) * minDim;
        let oy = (k.R1 * Math.sin(th) * k.squash + k.R2 * Math.sin(th2)) * minDim;
        const ct = Math.cos(k.tilt), st = Math.sin(k.tilt);
        x += (ox * ct - oy * st) * win;
        y += (ox * st + oy * ct) * win;
      }
      outX[i] = x;
      outY[i] = y;
      // Grosor de pluma: fino en los extremos, más fino aún dentro del nudo.
      const taper = Math.pow(Math.sin(Math.PI * clamp01(s * 1.02 - 0.01)), 0.6);
      const pressure = 0.78 + 0.22 * Math.sin(s * 23 + k.grain) * Math.sin(s * 7.3 + k.grain * 0.5);
      outW[i] = (narrow ? 1.25 : 1.55) * (0.3 + 0.7 * taper) * pressure * (1 - 0.3 * win);
    }
  }

  function applyPointer(X, Y) {
    if (pointer.on < 0.01) return;
    const r2 = (narrow ? 70 : 110) ** 2;
    for (let i = 0; i < N; i++) {
      const dx = pointer.x - X[i], dy = pointer.y - Y[i];
      const f = pointer.on * 0.32 * Math.exp(-(dx * dx + dy * dy) / (2 * r2));
      X[i] += dx * f;
      Y[i] += dy * f;
    }
  }

  // Dibuja segmentos agrupados por grosor: color opaco, así los solapes no se notan.
  function strokeLine(X, Y, W, upto, color, alpha) {
    const last = Math.min(N - 1, Math.floor(upto * (N - 1)));
    if (last < 1) return;
    const buckets = new Map();
    for (let i = 0; i < last; i++) {
      const key = Math.round(((W[i] + W[i + 1]) / 2) * 10);
      let p = buckets.get(key);
      if (!p) buckets.set(key, (p = new Path2D()));
      p.moveTo(X[i], Y[i]);
      p.lineTo(X[i + 1], Y[i + 1]);
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (const [key, p] of buckets) {
      ctx.lineWidth = key / 10;
      ctx.stroke(p);
    }
    ctx.globalAlpha = 1;
    return last;
  }

  function glow(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${ACCENT},${0.38 * a})`);
    g.addColorStop(1, `rgba(${ACCENT},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${ACCENT},${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function pointOn(X, Y, s) {
    const f = clamp01(s) * (N - 1), i = Math.min(N - 2, Math.floor(f)), t = f - i;
    return { x: X[i] + (X[i + 1] - X[i]) * t, y: Y[i] + (Y[i + 1] - Y[i]) * t };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    narrow = w < 761;
    minDim = narrow ? Math.min(w * 0.9, h * 0.5) : Math.min(w * 0.5, h * 0.95);
  }

  const start = performance.now();
  function frame(now) {
    const time = now - start;
    const cycle = Math.floor(time / CYCLE);
    const t = time - cycle * CYCLE;
    const knot = makeKnot(cycle + 1);
    const prevKnot = makeKnot(cycle);

    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;
    pointer.on += (pointer.ton - pointer.on) * 0.06;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Eco del ciclo anterior, ya resuelto, que se desvanece mientras se dibuja el nuevo.
    if (cycle > 0 && t < 2200) {
      shape(prevKnot, 0, 1, time, px, py, ws);
      applyPointer(px, py);
      strokeLine(px, py, ws, 1, BONE, 1 - easeSine(t / 2200));
    }

    let amp = 1, tension = 0, head = 1, solution = -1;
    if (t < DRAW) {
      head = easeSine(t / DRAW);
    } else if (t < DRAW + HOLD) {
      tension = 0.15 * ((t - DRAW) / HOLD);
    } else if (t < DRAW + HOLD + RESOLVE) {
      const p = ease((t - DRAW - HOLD) / RESOLVE);
      amp = 1 - p;
      tension = 0.15 + 0.85 * p;
    } else {
      amp = 0;
      tension = 1;
      solution = (t - DRAW - HOLD - RESOLVE) / 1900;
    }
    if (cycle === 0 && t < DRAW) {
      // Primera aparición: nada antes.
    }

    shape(knot, amp, tension, time, xs, ys, ws);
    applyPointer(xs, ys);
    strokeLine(xs, ys, ws, head, BONE, 1);

    if (head < 1) {
      const p = pointOn(xs, ys, head);
      glow(p.x, p.y, 16, 1);
    }
    if (solution >= 0 && solution <= 1) {
      // La solución sale disparada hacia el borde derecho.
      const s = knot.c + (1.02 - knot.c) * easeSine(solution);
      const p = pointOn(xs, ys, s);
      glow(p.x, p.y, 14, Math.sin(Math.PI * solution));
    }
  }

  function loop(now) {
    frame(now);
    if (!document.hidden) requestAnimationFrame(loop);
  }

  resize();
  new ResizeObserver(() => { resize(); if (reduce) frame(start + DRAW + 100); }).observe(canvas);
  if (reduce) frame(start + DRAW + 100);
  else requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) requestAnimationFrame(loop); });

  const hero = canvas.parentElement;
  hero.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    pointer.tx = e.clientX - r.left;
    pointer.ty = e.clientY - r.top;
    if (pointer.ton === 0) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.ton = 1;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.ton = 0; });
  hero.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') pointer.ton = 0; });
})();
