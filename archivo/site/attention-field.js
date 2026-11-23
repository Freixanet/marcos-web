// Distances are CSS pixels; percentages are fractions of the hero height.
// FLOW_SPEED is a multiplier. SPRING_STIFFNESS is angular acceleration per radian.
export const CONFIG = {
  GRID_SPACING: 15,
  VECTOR_LENGTH: 11.5,
  ACCENT_HEX: "#FFA470",
  BASE_ALPHA: 0.09,
  ACTIVE_ALPHA: 0.71,
  FLOW_SPEED: 1,
  SPRING_STIFFNESS: 68,
  MOBILE_TOP_PCT: 0.14,
  MOBILE_BOTTOM_PCT: 0.5,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (t) => ((t = clamp(t, 0, 1)), t * t * (3 - 2 * t));
function hash(i, seed) {
  let n = Math.imul(i ^ seed, 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1;
}
// Smooth value noise with its analytic derivative. Broad knots give the
// stream its pivots; a shorter wavelength rounds off the approach and exit.
function sample(x, span, seed, out) {
  const u = x / span,
    i = Math.floor(u),
    t = u - i;
  const a = hash(i, seed),
    delta = hash(i + 1, seed) - a;
  out[0] = a + delta * t * t * (3 - 2 * t);
  out[1] = (delta * 6 * t * (1 - t)) / span;
}
const grayBands = 64,
  warmBands = 32;
const mounts = new WeakMap();
export function mountAttentionField(canvas, options = {}) {
  if (mounts.has(canvas)) return mounts.get(canvas);
  const hero = canvas.closest(".hero"),
    copy = hero?.querySelector(".hero-copy");
  const header = document.querySelector(".masthead");
  const ctx = canvas.getContext("2d");
  if (!ctx || !copy) return () => {};
  const cfg = { ...CONFIG, ...options };
  const step = clamp(cfg.GRID_SPACING, 9, 40),
    length = clamp(cfg.VECTOR_LENGTH, 5, 22);
  const stiffness = clamp(cfg.SPRING_STIFFNESS, 10, 200),
    damping = 1.8 * Math.sqrt(stiffness);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    mobile = matchMedia("(max-width: 760px)");
  const listeners = new AbortController(),
    passive = { passive: true, signal: listeners.signal };
  const seed = (Math.random() * 0x7fffffff) | 0;
  const streams = [
    { seed, level: 0.42, rate: 1, phase: 0.63 },
    { seed: seed ^ 0x7315, level: 0.6, rate: 0.74, phase: 0.21 },
  ];
  let width = 0,
    height = 0,
    cols = 0,
    rows = 0,
    pitch = step,
    time = 0,
    raf = 0,
    last = 0,
    visible = false;
  let pageTop = 0,
    pageLeft = 0,
    scrollYLast = window.scrollY,
    scrollAt = 0,
    impulse = 0;
  let pointerX = 0,
    pointerY = 0,
    pointerAngle = 0,
    pointerHeat = 0,
    contact = false;
  let angles, velocity, energy, weights, tips, links;
  const first = new Int32Array(grayBands + warmBands);
  const broad = [0, 0],
    fine = [0, 0];
  function layout() {
    const rect = hero.getBoundingClientRect(),
      text = copy.getBoundingClientRect();
    const top = Math.ceil(
      Math.max(
        (header?.offsetHeight || 0) + 12,
        rect.height * (mobile.matches ? cfg.MOBILE_TOP_PCT : 0.105),
      ),
    );
    const bottom = Math.floor(
      Math.min(
        rect.height * (mobile.matches ? cfg.MOBILE_BOTTOM_PCT : 0.52),
        text.top - rect.top - 22,
      ),
    );
    width = hero.clientWidth;
    height = Math.max(0, bottom - top);
    pageTop = rect.top + window.scrollY + top;
    pageLeft = rect.left + window.scrollX;
    canvas.style.top = top + "px";
    canvas.style.height = height + "px";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (!width || !height) {
      sync();
      return;
    }
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    // Keep both rims of the lattice just beyond the viewport.
    cols = Math.ceil(width / step) + 2;
    pitch = width / (cols - 2);
    rows = Math.ceil(height / step) + 1;
    const n = cols * rows;
    angles = new Float32Array(n);
    velocity = new Float32Array(n);
    energy = new Float32Array(n);
    weights = new Float32Array(n);
    tips = new Float32Array(n * 4);
    links = new Int32Array(n);
    for (let j = 0; j < rows; j++) {
      const y = j * step;
      const fade = smooth(
        (Math.min(y, height - y) - length * 0.65) / Math.max(16, height * 0.16),
      );
      for (let i = 0; i < cols; i++) {
        const x = (i - 0.65) * pitch;
        weights[j * cols + i] =
          fade *
          (mobile.matches ? 1 : 0.7 + 0.3 * smooth(x / width)) *
          (1 - (0.07 * y) / height);
      }
    }
    draw(0, true);
    sync();
  }
  function currents() {
    const reach = clamp(width * 0.21, 88, 260),
      pad = reach * 1.3;
    for (const s of streams) {
      const distance = time * clamp(width * 0.135, 62, 195) * s.rate;
      s.head =
        ((s.phase * (width + 2 * pad) + distance) % (width + 2 * pad)) - pad;
      // The sample domain keeps drifting across successive traversals.
      s.domain = distance * 0.3 + s.phase * 1083;
    }
    return reach;
  }
  function flowAt(x, s) {
    sample(x + s.domain, clamp(width * 0.4, 120, 340), s.seed, broad);
    sample(
      x - s.domain * 0.39,
      clamp(width * 0.19, 74, 160),
      s.seed ^ 0xa531,
      fine,
    );
    const amplitude = Math.min(height, 360);
    s.y = height * s.level + amplitude * (0.25 * broad[0] + 0.105 * fine[0]);
    s.slope = amplitude * (0.25 * broad[1] + 0.105 * fine[1]);
  }
  function draw(dt, settled = false) {
    if (!width || !height) return;
    const reach = currents(),
      spread = clamp(height * 0.15, 21, 48);
    const cycle = Math.floor(time / 4.5),
      pulseT = (time % 4.5) / 1.12;
    const signalX = (width + 100) * pulseT - 50,
      activeStream = cycle % 2;
    first.fill(-1);
    ctx.clearRect(0, 0, width, height);
    const relax = 1 - Math.exp(-dt * 7);
    for (let i = 0; i < cols; i++) {
      const x = (i - 0.65) * pitch;
      for (const s of streams) {
        flowAt(x, s);
        const gap = x - s.head;
        s.envelope = Math.exp(-((gap / (gap < 0 ? reach : reach * 0.39)) ** 2));
        s.crest = Math.exp(-((gap / step) ** 2) * 0.63);
      }
      const signal = pulseT <= 1 ? Math.exp(-(((x - signalX) / 25) ** 2)) : 0;
      for (let j = 0; j < rows; j++) {
        const k = j * cols + i,
          mask = weights[k];
        if (!mask) continue;
        const y = j * step;
        let strength = 0,
          turn = 0,
          core = 0;
        for (let m = 0; m < 2; m++) {
          const s = streams[m],
            offset = y - s.y;
          const cross = Math.exp(-((offset / spread) ** 2) * 1.45);
          const ripple = m === activeStream ? signal : 0;
          const power = cross * Math.max(s.envelope, ripple * 0.83);
          // Feather in adjacent parallels; the central vector takes the exact tangent.
          turn += power * Math.atan(s.slope - (0.42 * offset) / spread);
          strength += power;
          const narrow = Math.exp(-((offset / (step * 0.84)) ** 2));
          core = Math.max(core, narrow * Math.max(s.crest, ripple * 0.95));
        }
        if (pointerHeat > 0.005) {
          const dx = x - pointerX,
            dy = y - pointerY;
          const influence = pointerHeat * Math.exp(-(dx * dx + dy * dy) / 4400);
          turn += influence * pointerAngle;
          strength += influence;
          core = Math.max(
            core,
            influence * Math.exp(-(dx * dx + dy * dy) / 330),
          );
        }
        const target =
          turn / Math.max(1, strength) +
          impulse *
            0.19 *
            Math.exp(-(((y - height * 0.5) / (spread * 2)) ** 2));
        strength = Math.min(strength, 1);
        if (settled) {
          angles[k] = target;
          velocity[k] = 0;
          energy[k] = strength;
        } else {
          velocity[k] +=
            (stiffness * (target - angles[k]) - damping * velocity[k]) * dt;
          angles[k] += velocity[k] * dt;
          energy[k] += (strength - energy[k]) * relax;
        }
        const half = length * (1 + 0.2 * energy[k]) * 0.5;
        const dx = half * Math.cos(angles[k]),
          dy = half * Math.sin(angles[k]);
        const pos = k * 4;
        tips[pos] = x - dx;
        tips[pos + 1] = y - dy;
        tips[pos + 2] = x + dx;
        tips[pos + 3] = y + dy;
        const hot = smooth((core - 0.1) / 0.72);
        const alpha =
          mask *
          (hot > 0.09
            ? 0.95 * hot
            : cfg.BASE_ALPHA + (cfg.ACTIVE_ALPHA - cfg.BASE_ALPHA) * energy[k]);
        const group =
          hot > 0.09
            ? grayBands + Math.round(clamp(alpha, 0, 1) * (warmBands - 1))
            : Math.round(clamp(alpha, 0, 1) * (grayBands - 1));
        links[k] = first[group];
        first[group] = k;
      }
    }
    ctx.lineCap = "round";
    for (let g = 1; g < first.length; g++) {
      if (first[g] < 0) continue;
      const warm = g >= grayBands;
      const alpha = warm
        ? (g - grayBands) / (warmBands - 1)
        : g / (grayBands - 1);
      ctx.strokeStyle = warm ? cfg.ACCENT_HEX : "#faf9f6";
      ctx.beginPath();
      for (let k = first[g]; k >= 0; k = links[k]) {
        const p = k * 4;
        ctx.moveTo(tips[p], tips[p + 1]);
        ctx.lineTo(tips[p + 2], tips[p + 3]);
      }
      if (warm && alpha > 0.55) {
        ctx.lineWidth = 3.5;
        ctx.globalAlpha = alpha * 0.065;
        ctx.stroke();
      }
      ctx.lineWidth = 1.1;
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.033) : 1 / 60;
    last = now;
    time += dt * clamp(cfg.FLOW_SPEED, 0.1, 4);
    impulse *= Math.exp(-dt * 4);
    if (!contact) pointerHeat *= Math.exp(-dt * 3);
    draw(dt);
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (!visible || document.hidden || hero.closest("[inert]") || !height)
      return;
    if (reduced.matches) {
      time = 0;
      impulse = pointerHeat = 0;
      draw(0, true);
    } else raf = requestAnimationFrame(tick);
  }
  function point(event) {
    if (
      !raf ||
      (event.pointerType !== "mouse" &&
        !event.buttons &&
        event.type !== "pointerdown")
    )
      return;
    const x = event.pageX - pageLeft,
      y = event.pageY - pageTop;
    if (y < 0 || y > height || x < 0 || x > width) {
      contact = false;
      return;
    }
    const dx = x - pointerX,
      dy = y - pointerY;
    if (!contact) pointerAngle = -0.55;
    else if (Math.abs(dx) + Math.abs(dy) > 1) {
      // The segments are undirected: dragging left and right share a horizontal axis.
      const a = Math.atan2(dy, dx);
      pointerAngle = clamp(
        0.5 * Math.atan2(Math.sin(2 * a), Math.cos(2 * a)),
        -1.1,
        1.1,
      );
    }
    pointerX = x;
    pointerY = y;
    contact = true;
    pointerHeat = 1;
  }
  function release() {
    contact = false;
  }
  window.addEventListener("pointermove", point, passive);
  window.addEventListener("pointerdown", point, passive);
  window.addEventListener("pointerup", release, passive);
  window.addEventListener("pointercancel", release, passive);
  window.addEventListener(
    "pointerout",
    (e) => {
      if (!e.relatedTarget) release();
    },
    passive,
  );
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY,
        now = performance.now();
      if (raf && mobile.matches)
        impulse = clamp(
          impulse + ((y - scrollYLast) / Math.max(16, now - scrollAt)) * 0.5,
          -1,
          1,
        );
      scrollAt = now;
      scrollYLast = y;
      contact = false;
    },
    passive,
  );
  const resize = new ResizeObserver(layout);
  [hero, copy, header].filter(Boolean).forEach((e) => resize.observe(e));
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(canvas);
  const menu = new MutationObserver(sync);
  menu.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  reduced.addEventListener("change", sync, passive);
  document.addEventListener("visibilitychange", sync, passive);
  function destroy() {
    cancelAnimationFrame(raf);
    listeners.abort();
    resize.disconnect();
    observer.disconnect();
    menu.disconnect();
    mounts.delete(canvas);
    canvas.width = canvas.height = 0;
    canvas.style.removeProperty("height");
    canvas.style.removeProperty("top");
  }
  mounts.set(canvas, destroy);
  layout();
  return destroy;
}
document
  .querySelectorAll("canvas.attention-field")
  .forEach((canvas) => mountAttentionField(canvas));
