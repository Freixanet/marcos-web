// mobileOffsetY is measured in CSS pixels and clamped to the available safe zone.
export const CONFIG = {
  accentColor: "#FFA470",
  speed: 1,
  opacity: 1,
  complexity: 1,
  mobileOffsetY: 0,
};

const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const mod = (n) => ((n % TAU) + TAU) % TAU;
const shortest = (n) => mod(n + Math.PI) - Math.PI;
const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)];

function spring(angle, stiffness, damping) {
  return { angle, goal: angle, velocity: 0, stiffness, damping };
}
function advance(s, dt) {
  s.velocity +=
    (s.stiffness * shortest(s.goal - s.angle) - s.damping * s.velocity) * dt;
  s.angle += s.velocity * dt;
}

// Shortest route between two pivots outside a circular obstacle.
// Test the chord first, then compare clockwise and counterclockwise tangent paths.
function route(a, b, radius) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const u = clamp(-(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy || 1), 0, 1);
  if (Math.hypot(a[0] + u * dx, a[1] + u * dy) >= radius) return [a, b];
  const tangent = (p) => Math.acos(radius / Math.hypot(...p));
  const bearing = (p) => Math.atan2(p[1], p[0]);
  const paths = [1, -1].map((sign) => {
    const start = bearing(a) + sign * tangent(a);
    const end = bearing(b) - sign * tangent(b);
    return { start, turn: sign * mod(sign * (end - start)) };
  });
  const best =
    Math.abs(paths[0].turn) < Math.abs(paths[1].turn) ? paths[0] : paths[1];
  const points = [a];
  for (let i = 0; i <= 20; i++)
    points.push(polar(radius, best.start + (best.turn * i) / 20));
  return [...points, b];
}
function trace(c, points, fraction) {
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let remaining = lengths.reduce((a, b) => a + b, 0) * fraction;
  c.beginPath();
  c.moveTo(...points[0]);
  for (let i = 0; i < lengths.length && remaining > 0; i++) {
    const a = points[i],
      b = points[i + 1],
      t = Math.min(1, remaining / (lengths[i] || 1));
    c.lineTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
    remaining -= lengths[i];
  }
  c.stroke();
}
function circle(c, x, y, r, start = 0, end = TAU) {
  c.beginPath();
  c.arc(x, y, r, start, end);
  c.stroke();
}
function line(c, a, b) {
  c.beginPath();
  c.moveTo(...a);
  c.lineTo(...b);
  c.stroke();
}
const ink = (opacity) => "rgba(255,255,255," + opacity + ")";

function engravedPlate(c, complexity) {
  c.lineWidth = 0.85;
  c.strokeStyle = ink(0.18);
  for (const r of [33, 64, 101, 128, 153, 164]) circle(c, 0, 0, r);
  c.strokeStyle = ink(0.1);
  for (let i = 0; i < 12; i++)
    line(c, polar(38, (i * TAU) / 12), polar(126, (i * TAU) / 12));
  const divisions = 12 * Math.round(12 * clamp(complexity, 0.5, 2));
  for (let i = 0; i < divisions; i++) {
    const a = (i * TAU) / divisions,
      major = i % (divisions / 12) === 0;
    c.strokeStyle = ink(major ? 0.38 : 0.22);
    line(c, polar(major ? 150 : 157, a), polar(163, a));
  }
  c.font = "8px ui-monospace, monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = ink(0.36);
  for (let i = 0; i < 8; i++)
    c.fillText(
      String(i * 45).padStart(3, "0"),
      ...polar(177, (i * TAU) / 8 - Math.PI / 2),
    );
  c.strokeStyle = ink(0.16);
  for (const a of [-2.3, -0.72, 0.85, 2.42]) {
    const [x, y] = polar(142, a);
    circle(c, x, y, 2.3);
    line(c, [x - 1.4, y + 1], [x + 1.4, y - 1]);
  }
}

export function mountAstrolabe(host, config = CONFIG) {
  const canvas = host.querySelector("canvas"),
    c = canvas.getContext("2d");
  if (!c) return () => {};
  const plate = document.createElement("canvas");
  const sheenCanvas = document.createElement("canvas");
  sheenCanvas.width = sheenCanvas.height = 64;
  {
    const sg = sheenCanvas.getContext("2d");
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, config.accentColor);
    grad.addColorStop(1, "transparent");
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 64, 64);
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const outer = spring(-0.57, 22, 8.1),
    inner = spring(2.28, 36, 9.6),
    guide = spring(-0.57, 70, 15);
  let w = 0,
    h = 0,
    dpr = 1,
    scale = 1,
    visible = false,
    id = 0,
    last = 0,
    age = 0,
    next = 4 + 2 * Math.random();
  let changing = false,
    solution = 1,
    lastImpulse = -Infinity;
  const events = new AbortController();
  const passive = { passive: true, signal: events.signal };
  function layout() {
    w = host.clientWidth;
    h = host.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    scale = (0.9025 * Math.min(w, h)) / 382;
    const plateSize = Math.max(1, Math.ceil(410 * scale * dpr));
    if (plate.width !== plateSize) {
      plate.width = plate.height = plateSize;
      const g = plate.getContext("2d");
      g.translate(plate.width / 2, plate.height / 2);
      g.scale(plate.width / 410, plate.height / 410);
      engravedPlate(g, config.complexity);
    }
    draw();
  }
  function draw() {
    if (!w || !h) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.save();
    const slack = Math.max(0, (h - 384 * scale) / 2);
    const offset = clamp(config.mobileOffsetY, -slack, slack);
    c.translate(w / 2, h / 2 + offset);
    c.scale(scale, scale);
    c.globalAlpha = clamp(config.opacity, 0, 1);
    c.lineCap = "round";
    c.drawImage(plate, -205, -205, 410, 410);
    c.save();
    c.rotate(outer.angle);
    // The split vernier rides just inside the stationary graduation.
    c.strokeStyle = ink(0.38);
    c.lineWidth = 1.4;
    circle(c, 0, 0, 146, -0.43, 0.43);
    c.lineWidth = 0.9;
    const n = Math.round(12 * clamp(config.complexity, 0.5, 2));
    for (let i = -n; i <= n; i++) {
      const a = (i * 0.4) / n;
      line(c, polar(i % 4 === 0 ? 134 : 139, a), polar(145, a));
    }
    c.restore();
    const origin = polar(101, inner.angle),
      target = polar(128, outer.angle);
    for (const [angle, r] of [
      [inner.angle, 101],
      [guide.angle, 128],
    ]) {
      c.save();
      c.rotate(angle);
      c.strokeStyle = ink(0.34);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-29, -2.8);
      c.lineTo(r - 6, -1.2);
      c.lineTo(r, 0);
      c.lineTo(r - 6, 1.2);
      c.lineTo(-29, 2.8);
      c.closePath();
      c.stroke();
      c.restore();
    }
    c.strokeStyle = ink(0.29);
    circle(c, 0, 0, 8);
    circle(c, 0, 0, 3);
    circle(c, ...origin, 3.4);
    circle(c, ...target, 5.4);
    c.save();
    c.translate(...target);
    c.rotate(guide.angle);
    c.strokeStyle = ink(0.26);
    line(c, [0, -18], [0, -8]);
    line(c, [0, 8], [0, 18]);
    c.restore();
    if (solution > 0) {
      const reveal = Math.min(1, solution * 1.65);
      const pulse = Math.exp(-((solution - 0.7) ** 2) / 0.014);
      c.save();
      c.strokeStyle = config.accentColor;
      c.fillStyle = config.accentColor;
      c.globalAlpha *= 0.69 + pulse * 0.28;
      c.lineWidth = 1.25;
      trace(c, route(origin, target, 33), reveal);
      if (reveal >= 1) {
        c.save();
        c.globalAlpha *= 0.08 + pulse * 0.11;
        c.drawImage(sheenCanvas, target[0] - 16, target[1] - 16, 32, 32);
        c.restore();
        c.beginPath();
        c.arc(...target, 2.15, 0, TAU);
        c.fill();
      }
      c.restore();
    }
    c.restore();
  }
  function perturb(bearing) {
    outer.goal = bearing;
    inner.goal = bearing + Math.PI + (Math.random() - 0.5) * 0.9;
    guide.goal = guide.angle;
    age = 0;
    next = 4 + Math.random() * 2;
    solution = 0;
    changing = true;
  }
  function step(dt) {
    age += dt;
    if (age >= next)
      perturb(
        outer.angle +
          (Math.random() < 0.5 ? -1 : 1) * (0.65 + Math.random() * 1.5),
      );
    advance(outer, dt);
    advance(inner, dt);
    if (age > 0.48) guide.goal = outer.goal;
    advance(guide, dt);
    if (
      changing &&
      age > 0.55 &&
      Math.abs(shortest(inner.goal - inner.angle)) < 0.028 &&
      Math.abs(shortest(outer.goal - outer.angle)) < 0.028
    )
      changing = false;
    if (!changing) solution = Math.min(1, solution + dt * 0.96);
  }
  function frame(now) {
    let dt =
      Math.min(0.05, (now - (last || now)) / 1000) *
      clamp(config.speed, 0.1, 3);
    last = now;
    while (dt > 0) {
      const sub = Math.min(1 / 120, dt);
      step(sub);
      dt -= sub;
    }
    draw();
    id = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(id);
    last = 0;
    if (reduced.matches) {
      outer.angle = outer.goal;
      inner.angle = inner.goal;
      guide.angle = outer.goal;
      for (const s of [outer, inner, guide]) s.velocity = 0;
      changing = false;
      solution = 1;
      draw();
    } else if (visible && !document.hidden) id = requestAnimationFrame(frame);
  }
  function impulse(event) {
    if (
      !visible ||
      reduced.matches ||
      host.closest("[inert]") ||
      document.hidden
    )
      return;
    const now = performance.now();
    if (now - lastImpulse < 2400 || (changing && age < 1.8)) return;
    const box = canvas.getBoundingClientRect();
    let bearing;
    if (event.type === "scroll") {
      if (box.bottom < box.height * 0.7 || window.scrollY < 4) return;
      bearing = outer.angle + 0.48;
    } else {
      const x = event.clientX - box.left - w / 2,
        y = event.clientY - box.top - h / 2;
      if (Math.hypot(x, y) > scale * 184) return;
      bearing = Math.atan2(y, x);
      if (Math.abs(shortest(bearing - outer.goal)) < 0.28) return;
    }
    lastImpulse = now;
    perturb(bearing);
  }
  const resize = new ResizeObserver(layout);
  resize.observe(host);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  layout();
  observer.observe(host);
  window.addEventListener("pointermove", impulse, passive);
  window.addEventListener("pointerdown", impulse, passive);
  window.addEventListener("scroll", impulse, passive);
  document.addEventListener("visibilitychange", sync, {
    signal: events.signal,
  });
  reduced.addEventListener("change", sync, { signal: events.signal });
  return () => {
    events.abort();
    resize.disconnect();
    observer.disconnect();
    cancelAnimationFrame(id);
  };
}

for (const host of document.querySelectorAll(".menu-astrolabe"))
  mountAstrolabe(host);
