// The offset is in CSS pixels. Scale 1 leaves a black margin around the sculpture.
export const ACCENT_HEX = "#FFA470";
export const SPEED = 0.55;
export const SCALE = 1;
export const MOBILE_Y_OFFSET = 0;
export const LIGHT_INTENSITY = 1;

const vertex = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }
`;
const fragment = `
precision highp float;
uniform vec2 resolution, tilt;
uniform vec3 accent;
uniform float time, size, intensity;
mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c,s,-s,c);
}
// A rounded rectangular profile rotates by half a turn around a closed spine.
// The section is centrally symmetric, so the two ends meet at the angular seam.
vec2 section(vec3 p) {
  float a = atan(p.y,p.x);
  float radius = 0.99 + .085*cos(2.*a+.3) + .035*sin(3.*a-time*.14);
  vec2 q = vec2(length(p.xy)-radius, p.z-.18*sin(2.*a+.65));
  return rot(.5*a + .62 + .29*sin(time*.29) + .18*sin(a-time*.21))*q;
}
float field(vec3 p) {
  vec2 d = abs(section(p)) - vec2(.385,.062);
  return length(max(d,0.)) + min(max(d.x,d.y),0.) - .048;
}
vec3 normalAt(vec3 p) {
  vec2 k=vec2(.0014,-.0014);
  return normalize(k.xyy*field(p+k.xyy)+k.yyx*field(p+k.yyx)+
                   k.yxy*field(p+k.yxy)+k.xxx*field(p+k.xxx));
}
vec3 orient(vec3 p) {
  p.xy=rot(-.47 + tilt.x*.05)*p.xy;
  p.yz=rot(.83+.13*sin(time*.19)+tilt.y*.14)*p.yz;
  p.xz=rot(-.40+.12*sin(time*.16+.5)+tilt.x*.16)*p.xz;
  return p;
}
// Rectangular studio cards in reflection space: a broad silk, a narrow strip,
// and a lower bounce. Only a hit on the ribbon can see them.
float card(vec3 r, vec3 aim, vec2 span, float feather) {
  vec3 n=normalize(aim);
  vec3 u=normalize(cross(vec3(0.,1.,0.),n)), v=cross(n,u);
  vec2 q=abs(vec2(dot(r,u),dot(r,v))/max(dot(r,n),.001))-span;
  return (1.-smoothstep(-feather,feather,max(q.x,q.y)))*smoothstep(.01,.25,dot(r,n));
}
float studio(vec3 r) {
  return .65*card(r,vec3(-.82,1.,.52),vec2(.86,.20),.18)
       + .94*card(r,vec3(.75,.25,-.66),vec2(.14,1.05),.065)
       + .20*card(r,vec3(-.25,-.9,.2),vec2(.92,.32),.19);
}
void main() {
  vec2 uv=(2.*gl_FragCoord.xy-resolution)/min(resolution.x,resolution.y);
  vec3 ro=orient(vec3(uv*1.85/size,3.6));
  vec3 rd=orient(vec3(0.,0.,-1.));
  float b=dot(ro,rd), disc=b*b-dot(ro,ro)+1.63*1.63;
  vec3 rgb=vec3(0.);
  if(disc>0.) {
    float halfChord=sqrt(disc), t=-b-halfChord, farT=-b+halfChord;
    vec3 p=vec3(0.); bool hit=false;
    for(int i=0;i<60;i++) {
      p=ro+rd*t;
      float d=field(p);
      if(d<.0016) {hit=true;break;}
      t+=d*.77;
      if(t>farT) break;
    }
    if(hit) {
      vec3 n=normalAt(p), eye=-rd, refl=reflect(rd,n);
      refl.xy=rot(tilt.x*.11)*refl.xy;
      float facing=clamp(dot(n,eye),0.,1.);
      float fres=pow(1.-facing,3.);
      float soft=clamp(dot(n,normalize(vec3(-.45,.85,.7)))*.5+.5,0.,1.);
      float silver=studio(refl);
      float knife=card(refl,vec3(-.45,.3,.84),vec2(.034,.8),.02);
      vec3 base=vec3(.002+.011*soft*soft+.009*fres);
      base+=vec3(.98,.985,1.)*(silver*(.21+.73*fres)+knife*(.15+.42*fres)+.60*pow(1.-facing,8.)*(.25+.75*soft));
      // Sample a virtual rear face through the glass and concentrate transmission
      // along the internal bevel. This is a local caustic approximation.
      vec3 transmitted=refract(rd,n,1./1.49);
      vec3 inside=p+transmitted*.11;
      float edge=abs(section(inside).x);
      float fold=pow(max(0.,dot(normalize(p.xy),normalize(vec2(.73,-.65)))),3.);
      float vein=exp(-58.*abs(edge-.347))*fold;
      float inner=card(reflect(transmitted,-n),vec3(.5,-.7,-.4),vec2(.5,.12),.13);
      base+=pow(accent,vec3(2.2))*(vein*(.26+.53*inner)+.014*inner*fold);
      rgb=pow(clamp(base*intensity,0.,1.),vec3(1./2.2));
      float grain=fract(sin(dot(mod(gl_FragCoord.xy,127.),vec2(12.9898,78.233)))*43758.5453)-.5;
      rgb+=grain/255.;
    }
  }
  vec2 edgeUV=abs(2.*gl_FragCoord.xy/resolution-1.);
  rgb*=1.-smoothstep(.85,1.,max(edgeUV.x,edgeUV.y));
  rgb*=1.-smoothstep(.86,1.04,length(uv)/size);
  gl_FragColor=vec4(max(rgb,0.),1.);
}
`;

function pipeline(gl) {
  const program = gl.createProgram();
  const shaders = [];
  let quad;
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ]) {
      const s = gl.createShader(type);
      shaders.push(s);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(s));
      gl.attachShader(program, s);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(
      ["resolution", "time", "tilt", "size", "accent", "intensity"].map((k) => [
        k,
        gl.getUniformLocation(program, k),
      ]),
    );
    gl.uniform3fv(
      u.accent,
      ACCENT_HEX.slice(1)
        .match(/../g)
        .map((s) => parseInt(s, 16) / 255),
    );
    gl.uniform1f(u.intensity, LIGHT_INTENSITY);
    gl.uniform1f(u.size, SCALE);
    return {
      u,
      dispose() {
        gl.deleteBuffer(quad);
        gl.deleteProgram(program);
      },
    };
  } catch (err) {
    gl.deleteBuffer(quad);
    gl.deleteProgram(program);
    throw err;
  } finally {
    shaders.forEach((s) => gl.deleteShader(s));
  }
}

export function mountRibbon(host) {
  const canvas = host.querySelector("canvas"),
    hero = host.closest(".hero");
  const copy = hero.querySelector(".hero-copy"),
    header = document.querySelector(".masthead");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 760px)");
  const listeners = new AbortController(),
    opts = { passive: true, signal: listeners.signal };
  let gl,
    pipe,
    visible = false,
    id = 0,
    last = 0,
    time = 0,
    quality = 1,
    slow = 0,
    w = 0,
    h = 0;
  let x = 0,
    y = 0,
    vx = 0,
    vy = 0,
    tx = 0,
    ty = 0,
    scrollImpulse = 0;
  let touch = null,
    prevScroll = window.scrollY;
  function resizeBuffer() {
    const density = Math.min(window.devicePixelRatio || 1, 2) * quality;
    // Upper bound on total samples even on very wide or high-density displays.
    const ratio = Math.min(density, 720 / Math.max(1, w, h));
    canvas.width = Math.max(1, Math.round(w * ratio));
    canvas.height = Math.max(1, Math.round(h * ratio));
  }
  function draw() {
    if (!pipe || !w || !h) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(pipe.u.resolution, canvas.width, canvas.height);
    gl.uniform1f(pipe.u.time, time);
    gl.uniform2f(pipe.u.tilt, x, y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    host.classList.add("ribbon-live");
  }
  function layout() {
    const box = hero.getBoundingClientRect(),
      text = copy.getBoundingClientRect();
    const left = mobile.matches
      ? 0
      : Math.max(box.width * 0.49, text.right - box.left + 20);
    const top = Math.max(
      (header?.offsetHeight || 0) + 14,
      mobile.matches ? box.height * 0.1 : 0,
    );
    const bottom = mobile.matches
      ? Math.min(box.height * 0.52, text.top - box.top - 24)
      : box.height - 32;
    const available = Math.max(0, bottom - top);
    // A square viewport avoids shading empty columns on ultrawide heroes.
    const room = mobile.matches
      ? Math.max(
          0,
          available - 2 * Math.min(Math.abs(MOBILE_Y_OFFSET), available * 0.15),
        )
      : available;
    const side = Math.max(0, Math.min(box.width - left, room, 660));
    const offset = mobile.matches
      ? Math.max(
          -(available - side) / 2,
          Math.min((available - side) / 2, MOBILE_Y_OFFSET),
        )
      : 0;
    Object.assign(host.style, {
      left: left + (box.width - left - side) / 2 + "px",
      top: top + (available - side) / 2 + offset + "px",
      width: side + "px",
      height: side + "px",
    });
    w = h = side;
    resizeBuffer();
    if (visible) draw();
  }
  function tick(now) {
    const ms = last ? now - last : 16.7;
    last = now;
    const dt = Math.min(ms / 1000, 0.04);
    time += dt * SPEED;
    // Damped pose, in seconds. Scroll feeds a decaying impulse.
    scrollImpulse *= Math.exp(-dt * 3);
    const gain = 1 - Math.exp(-dt * 8);
    vx += (8 * (tx - x) - vx) * gain;
    vy += (8 * (ty + scrollImpulse - y) - vy) * gain;
    x += vx * dt;
    y += vy * dt;
    slow = ms > 23 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 18 && canvas.width > 180) {
      quality *= 0.8;
      resizeBuffer();
      slow = 0;
    }
    draw();
    id = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(id);
    last = 0;
    prevScroll = window.scrollY;
    if (!visible || document.hidden || !pipe || hero.closest("[inert]")) return;
    if (motion.matches) {
      x = y = vx = vy = tx = ty = scrollImpulse = 0;
      draw();
    } else id = requestAnimationFrame(tick);
  }
  function init() {
    try {
      gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
      if (gl) pipe = pipeline(gl);
    } catch (error) {
      console.warn("Ribbon poster active:", error.message);
    }
    sync();
  }
  function point(e) {
    const b = host.getBoundingClientRect();
    return [
      ((e.clientX - b.left) / Math.max(1, b.width)) * 2 - 1,
      1 - ((e.clientY - b.top) / Math.max(1, b.height)) * 2,
    ];
  }
  function enabled() {
    return visible && !motion.matches && !hero.closest("[inert]");
  }
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (!enabled() || e.pointerType === "mouse") return;
      const [a, b] = point(e);
      if (Math.max(Math.abs(a), Math.abs(b)) <= 1)
        touch = { id: e.pointerId, a, b };
    },
    opts,
  );
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!enabled()) return;
      const [a, b] = point(e);
      if (e.pointerType === "mouse") {
        tx = Math.max(-1, Math.min(1, a));
        ty = Math.max(-1, Math.min(1, b));
      } else if (touch?.id === e.pointerId) {
        tx = Math.tanh(2 * (a - touch.a));
        ty = Math.tanh(2 * (b - touch.b));
      }
    },
    opts,
  );
  function release(e) {
    if (touch?.id === e.pointerId) {
      touch = null;
      tx = ty = 0;
    }
  }
  window.addEventListener("pointerup", release, opts);
  window.addEventListener("pointercancel", release, opts);
  window.addEventListener(
    "scroll",
    () => {
      const sy = window.scrollY;
      if (enabled())
        scrollImpulse = Math.max(
          -0.6,
          Math.min(0.6, scrollImpulse + (sy - prevScroll) * 0.003),
        );
      prevScroll = sy;
    },
    opts,
  );
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      pipe = null;
      host.classList.remove("ribbon-live");
      sync();
    },
    { signal: listeners.signal },
  );
  canvas.addEventListener("webglcontextrestored", init, {
    signal: listeners.signal,
  });
  const resize = new ResizeObserver(layout);
  [hero, copy, header].filter(Boolean).forEach((el) => resize.observe(el));
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  const menu = new MutationObserver(sync);
  menu.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  motion.addEventListener("change", sync, opts);
  document.addEventListener("visibilitychange", sync, opts);
  layout();
  init();
  observer.observe(host);
  return () => {
    listeners.abort();
    resize.disconnect();
    observer.disconnect();
    menu.disconnect();
    cancelAnimationFrame(id);
    pipe?.dispose();
    host.classList.remove("ribbon-live");
  };
}
document.querySelectorAll(".ribbon-stage").forEach(mountRibbon);
