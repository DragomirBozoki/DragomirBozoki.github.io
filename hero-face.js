/* Hero face: the 68 dlib facial landmarks (the layout from the lip-reading
   project) driven by a few ARKit blendshapes, like the AI-SPEAK avatar.

   - The head and the eyes follow the pointer.
   - Hovering makes it say a word. The jaw and smile come from the letters,
     a tiny text-to-blendshape model.
   - A click surprises it.
   - It blinks on the AI-SPEAK blink module's timing: every 2.4 to 4.8 s,
     cosine pulses of 110 to 190 ms.

   Plain canvas, no libraries. Stops drawing when off screen. */

(function () {
  const root = document.querySelector("[data-hero-face]");
  if (!root) return;

  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const said = root.querySelector("[data-said]");
  const meters = [...root.querySelectorAll("[data-bs]")].map((el) => ({
    key: el.dataset.bs,
    el,
    out: el.querySelector("output"),
  }));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  /* ───────── Geometry ───────── */

  // Face space: x right, y down, z towards the viewer. The face spans
  // roughly x in [-1, 1] and y in [-1.1, 1.05].
  function landmarks(b) {
    const P = [];
    const { jaw, smile } = b;
    const jawDrop = (y) => jaw * 0.3 * clamp((y - 0.25) / 0.6, 0, 1);

    // 0-16 jaw line, temple to temple
    for (let i = 0; i <= 16; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 16;
      const s = Math.sin(a);
      const c = Math.cos(a);
      const y = -0.2 + 1.22 * c;
      P.push([0.92 * s * (0.78 + 0.22 * Math.abs(s)), y + jawDrop(y), -0.35 + 0.75 * c - jawDrop(y) * 0.25]);
    }

    // 17-26 brows. u runs from the outer end (0) to the inner end (1).
    for (const side of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const u = side < 0 ? k / 4 : 1 - k / 4;
        P.push([
          side * (0.8 - 0.62 * u),
          -0.5 - 0.13 * Math.sin(Math.PI * Math.pow(u, 0.75)) - b.brow * (0.05 + 0.09 * u),
          0.32 + 0.16 * u,
        ]);
      }
    }

    // 27-30 nose bridge, 31-35 nostrils
    for (let k = 0; k < 4; k++) P.push([0, -0.36 + k * 0.16, 0.48 + k * 0.12]);
    for (let k = -2; k <= 2; k++) {
      const m = 1 - Math.abs(k) / 2;
      P.push([k * 0.09 * (1 + smile * 0.08), 0.17 + 0.05 * m, 0.5 + 0.18 * m]);
    }

    // 36-41 and 42-47 eyes: left corner, two upper lid points, right
    // corner, two lower lid points.
    for (const side of [-1, 1]) {
      const cx = side * 0.4;
      const cy = -0.27;
      const rx = 0.17;
      const ry = 0.068;
      const blink = side < 0 ? b.blinkL : b.blinkR;
      const upper = cy - ry * (1 + b.wide * 0.45) + blink * ry * 1.85;
      const lower = cy + ry * 0.85 - blink * ry * 0.15 - smile * ry * 0.25;
      const outer = cy - 0.012;
      const inner = cy + 0.01;
      P.push(
        [cx - rx, side < 0 ? outer : inner, 0.28],
        [cx - rx / 3, upper, 0.38],
        [cx + rx / 3, upper, 0.38],
        [cx + rx, side < 0 ? inner : outer, 0.28],
        [cx + rx / 3, lower, 0.36],
        [cx - rx / 3, lower, 0.36]
      );
    }

    // 48-59 outer lip, 60-67 inner lip
    const W = 0.34 + smile * 0.07 - jaw * 0.05;
    const my = 0.52;
    const corner = my - smile * 0.07 + jaw * 0.05;
    const lip = (x, y, inset) => [x, y, 0.6 - 0.28 * (x / W) ** 2 - inset];
    const open = (f) => jaw * (1 - 0.35 * f * f);

    P.push(lip(-W, corner, 0));
    [-0.62, -0.26, 0, 0.26, 0.62].forEach((f, i) =>
      P.push(lip(f * W, my - [0.075, 0.105, 0.085, 0.105, 0.075][i] - jaw * 0.03 - smile * 0.05 * Math.abs(f), 0))
    );
    P.push(lip(W, corner, 0));
    [0.62, 0.3, 0, -0.3, -0.62].forEach((f, i) =>
      P.push(lip(f * W, my + [0.085, 0.125, 0.135, 0.125, 0.085][i] + 0.3 * open(f) - smile * 0.04 * Math.abs(f), 0))
    );

    P.push(lip(-W * 0.78, corner + 0.005, 0.03));
    [-0.32, 0, 0.32].forEach((f) => P.push(lip(f * W, my - 0.012 - jaw * 0.035 - smile * 0.03 * Math.abs(f), 0.03)));
    P.push(lip(W * 0.78, corner + 0.005, 0.03));
    [0.32, 0, -0.32].forEach((f) => P.push(lip(f * W, my + 0.012 + 0.28 * open(f) - smile * 0.03 * Math.abs(f), 0.03)));

    // 68+ extra mesh points: forehead, temples, cheeks, chin. Not part of
    // the 68, they only give the wireframe something to hang on.
    for (const [x, y] of EXTRA) {
      const z = 0.62 * Math.sqrt(Math.max(0, 1 - (x / 0.98) ** 2)) - 0.12 - (y < -0.7 ? (0.12 * (-0.7 - y)) / 0.4 : 0);
      P.push([x, y + jawDrop(y), z]);
    }

    return P;
  }

  const EXTRA = [
    [-0.65, -0.8], [-0.33, -0.86], [0, -0.88], [0.33, -0.86], [0.65, -0.8],
    [-0.42, -1.04], [0, -1.08], [0.42, -1.04],
    [-0.86, -0.58], [0.86, -0.58],
    [-0.62, 0.06], [0.62, 0.06],
    [-0.56, 0.46], [0.56, 0.46],
    [-0.22, -0.06], [0.22, -0.06],
    [-0.4, 0.74], [0.4, 0.74], [0, 0.86],
  ];

  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const CONTOURS = [
    { idx: range(0, 16) },
    { idx: range(17, 21) },
    { idx: range(22, 26) },
    { idx: range(27, 30) },
    { idx: range(31, 35) },
    { idx: range(36, 41), closed: true },
    { idx: range(42, 47), closed: true },
    { idx: range(48, 59), closed: true },
    { idx: range(60, 67), closed: true },
  ];
  const HOLES = [range(36, 41), range(42, 47), range(60, 67)];

  // Wireframe: Delaunay triangulation of the neutral face, computed once.
  // Triangles made only of eye or inner-lip points would cover the holes,
  // so they are dropped.
  const EDGES = (function () {
    const neutral = landmarks({ jaw: 0, smile: 0, brow: 0, wide: 0, blinkL: 0, blinkR: 0 });
    const tris = delaunay(neutral.map((p) => [p[0], p[1]])).filter(
      (t) => !HOLES.some((hole) => t.every((v) => hole.includes(v)))
    );
    const seen = new Set();
    const edges = [];
    for (const t of tris) {
      for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
        const key = a < b ? a + "," + b : b + "," + a;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([a, b]);
        }
      }
    }
    return edges;
  })();

  // Bowyer-Watson, fine for ~90 points.
  function delaunay(pts) {
    const n = pts.length;
    const all = pts.concat([[-10, -10], [10, -10], [0, 10]]);
    let tris = [[n, n + 1, n + 2]];

    pts.forEach((p, i) => {
      const bad = [];
      const keep = [];
      for (const t of tris) (inCircumcircle(all, t, p) ? bad : keep).push(t);
      const boundary = new Map();
      for (const t of bad) {
        for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
          const key = a < b ? a + "," + b : b + "," + a;
          boundary.set(key, boundary.has(key) ? null : [a, b]);
        }
      }
      tris = keep;
      for (const e of boundary.values()) if (e) tris.push([e[0], e[1], i]);
    });

    return tris.filter((t) => t.every((v) => v < n));
  }

  function inCircumcircle(P, t, p) {
    const [ax, ay] = P[t[0]];
    const [bx, by] = P[t[1]];
    const [cx, cy] = P[t[2]];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const a2 = ax * ax + ay * ay;
    const b2 = bx * bx + by * by;
    const c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
    return (p[0] - ux) ** 2 + (p[1] - uy) ** 2 < (ax - ux) ** 2 + (ay - uy) ** 2;
  }

  /* ───────── State ───────── */

  const st = { yaw: 0, pitch: 0, gx: 0, gy: 0, jaw: 0, smile: 0.08, brow: 0, wide: 0, blinkL: 0, blinkR: 0 };
  const target = { yaw: 0, pitch: 0, gx: 0, gy: 0, jaw: 0, smile: 0.08, brow: 0, wide: 0 };
  const RATE = { yaw: 6, pitch: 6, gx: 14, gy: 14, jaw: 22, smile: 8, brow: 10, wide: 12 };

  let lastPointer = -1e9;
  let hovering = false;
  let surpriseUntil = 0;
  let nextBlink = performance.now() + rand(1200, 2400);
  let blinkStart = -1e9;
  let blinkDur = 150;
  const introStart = performance.now();
  const INTRO = 1400;

  /* ───────── Speech ───────── */

  // Each letter gets 85 ms. Vowels open the jaw (and e/i pull the
  // corners back), m/b/p close the lips, other consonants sit half shut.
  const WORDS = ["zdravo", "bonjour", "hello", "hvala", "merci"];
  const VOWELS = { a: [0.8, 0.1], o: [0.55, 0], e: [0.45, 0.45], i: [0.28, 0.6], u: [0.32, 0] };
  const LETTER_MS = 85;
  let wordIndex = 0;
  let speech = null; // { word, start }
  let shownLetters = -1;

  function startWord(now) {
    speech = { word: WORDS[wordIndex % WORDS.length], start: now };
    wordIndex++;
    shownLetters = -1;
  }

  function speechTargets(now) {
    if (!speech) return null;
    const i = Math.floor((now - speech.start) / LETTER_MS);
    const { word } = speech;

    if (i !== shownLetters && i <= word.length) {
      shownLetters = i;
      said.innerHTML = "<b>" + word.slice(0, i) + "</b>" + word.slice(i);
    }

    if (i >= word.length) {
      // Short pause, then the next word while the pointer stays.
      if (now - speech.start > word.length * LETTER_MS + 650) {
        if (hovering) startWord(now);
        else speech = null;
      }
      return { jaw: 0, smile: 0 };
    }

    const ch = word[i];
    if (VOWELS[ch]) return { jaw: VOWELS[ch][0], smile: VOWELS[ch][1] };
    if ("mbp".includes(ch)) return { jaw: 0, smile: 0 };
    return { jaw: 0.14, smile: 0.05 };
  }

  /* ───────── Update ───────── */

  function update(now, dt) {
    const t = now / 1000;

    if (now - lastPointer > 2600) {
      // Idle: look around slowly.
      target.yaw = 0.2 * Math.sin(t * 0.37);
      target.pitch = 0.06 * Math.sin(t * 0.51);
      target.gx = 0.5 * Math.sin(t * 0.7 + 1);
      target.gy = 0.25 * Math.sin(t * 0.43);
    }

    const say = speechTargets(now);
    const surprised = now < surpriseUntil;
    target.jaw = surprised ? 0.55 : say ? say.jaw : 0;
    target.smile = surprised ? 0 : hovering ? 0.4 + (say ? say.smile * 0.5 : 0) : 0.08;
    target.brow = surprised ? 1 : say ? 0.12 + say.jaw * 0.25 : clamp(-target.pitch * 1.5, 0, 0.3);
    target.wide = surprised ? 1 : 0;

    for (const k in RATE) st[k] += (target[k] - st[k]) * (1 - Math.exp(-RATE[k] * dt));

    if (!reduceMotion.matches && !surprised && now >= nextBlink) {
      blinkStart = now;
      blinkDur = rand(110, 190);
      nextBlink = now + rand(2400, 4800);
    }
    const pulse = (ms) => (ms >= 0 && ms <= blinkDur ? 0.5 - 0.5 * Math.cos((2 * Math.PI * ms) / blinkDur) : 0);
    st.blinkL = pulse(now - blinkStart);
    st.blinkR = pulse(now - blinkStart - 12);

    for (const m of meters) {
      const v = clamp(st[m.key], 0, 1);
      m.el.style.setProperty("--v", v.toFixed(3));
      m.out.textContent = v.toFixed(2);
    }
  }

  /* ───────── Draw ───────── */

  let colors = {};
  function readColors() {
    const css = getComputedStyle(document.documentElement);
    colors = {
      accent: css.getPropertyValue("--accent").trim() || "#0f766e",
      text: css.getPropertyValue("--text").trim() || "#0b1016",
      bg: css.getPropertyValue("--bg").trim() || "#f6f8fa",
    };
  }

  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function draw(now) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const view = { cx: w / 2, cy: h * 0.5, s: Math.min(w / 2.45, h / 2.55), f: 4 };
    const roll = -st.yaw * 0.12 + 0.02 * Math.sin(now / 1600);
    const R = {
      cy: Math.cos(st.yaw), sy: Math.sin(st.yaw),
      cp: Math.cos(st.pitch), sp: Math.sin(st.pitch),
      cr: Math.cos(roll), sr: Math.sin(roll),
    };
    const project = ([x, y, z]) => {
      const x1 = x * R.cy + z * R.sy;
      const z1 = -x * R.sy + z * R.cy;
      const y1 = y * R.cp - z1 * R.sp;
      const z2 = y * R.sp + z1 * R.cp;
      const x2 = x1 * R.cr - y1 * R.sr;
      const y2 = x1 * R.sr + y1 * R.cr;
      const k = view.f / (view.f - z2);
      return [view.cx + x2 * k * view.s, view.cy + y2 * k * view.s, z2];
    };

    const Q = landmarks(st).map(project);
    const path = (idx, closed) => {
      ctx.beginPath();
      idx.forEach((i, n) => (n ? ctx.lineTo(Q[i][0], Q[i][1]) : ctx.moveTo(Q[i][0], Q[i][1])));
      if (closed) ctx.closePath();
    };

    // Intro: a scan line sweeps down and reveals the mesh, like a
    // landmark detector locking on.
    const intro = reduceMotion.matches ? 1 : clamp((now - introStart) / INTRO, 0, 1);
    const scanY = (1 - (1 - intro) ** 3) * h * 1.04;
    ctx.save();
    if (intro < 1) {
      ctx.beginPath();
      ctx.rect(0, 0, w, scanY);
      ctx.clip();
    }

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Wireframe
    ctx.strokeStyle = colors.accent;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 0.75 * dpr;
    ctx.beginPath();
    for (const [a, b] of EDGES) {
      ctx.moveTo(Q[a][0], Q[a][1]);
      ctx.lineTo(Q[b][0], Q[b][1]);
    }
    ctx.stroke();

    // Mouth interior
    path(range(60, 67), true);
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.1 + st.jaw * 0.25;
    ctx.fill();

    // Feature contours
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.3 * dpr;
    for (const c of CONTOURS) {
      path(c.idx, c.closed);
      ctx.stroke();
    }

    // Irises, clipped to the lids so blinks cover them.
    for (const [from, side] of [[36, -1], [42, 1]]) {
      const iris = project([side * 0.4 + st.gx * 0.08, -0.27 + st.gy * 0.035, 0.36]);
      const r = 0.062 * view.s;
      ctx.save();
      path(range(from, from + 5), true);
      ctx.clip();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(iris[0], iris[1], r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.bg;
      ctx.beginPath();
      ctx.arc(iris[0], iris[1], r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Landmark dots, fainter as they turn away.
    ctx.fillStyle = colors.text;
    Q.forEach(([x, y, z], i) => {
      const facing = clamp((z + 0.4) / 1.2, 0, 1);
      ctx.globalAlpha = (i < 68 ? 0.85 : 0.4) * (0.35 + 0.65 * facing);
      ctx.beginPath();
      ctx.arc(x, y, (i < 68 ? 1.6 : 1.1) * dpr, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    if (intro < 1) {
      ctx.globalAlpha = 0.6 * (1 - intro);
      ctx.fillStyle = colors.accent;
      ctx.fillRect(0, scanY - dpr, w, 1.5 * dpr);
    }
    ctx.globalAlpha = 1;
  }

  /* ───────── Loop and events ───────── */

  let raf = 0;
  let last = 0;
  let onScreen = true;
  const animated = () => !reduceMotion.matches && onScreen && !document.hidden;

  function frame(now) {
    raf = 0;
    update(now, Math.min(0.05, (now - last) / 1000));
    last = now;
    draw(now);
    if (animated()) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (animated()) {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    } else {
      // Reduced motion: no idle animation, just snap to the pointer.
      const now = performance.now();
      update(now, 10);
      draw(now);
    }
  }

  window.addEventListener(
    "pointermove",
    (e) => {
      if (!onScreen) return;
      const r = canvas.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height * 0.45)) / window.innerHeight;
      target.yaw = clamp(dx * 1.4, -1, 1) * 0.38;
      target.pitch = -clamp(dy * 1.4, -1, 1) * 0.25;
      target.gx = clamp(dx * 3, -1, 1);
      target.gy = clamp(dy * 3, -1, 1);
      lastPointer = performance.now();
      if (!animated()) kick();
    },
    { passive: true }
  );

  canvas.addEventListener("pointerenter", () => {
    hovering = true;
    if (!speech && !reduceMotion.matches) startWord(performance.now());
  });
  canvas.addEventListener("pointerleave", () => {
    hovering = false;
  });
  canvas.addEventListener("pointerdown", () => {
    surpriseUntil = performance.now() + 450;
    kick();
  });

  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    kick();
  }).observe(canvas);

  document.addEventListener("visibilitychange", kick);
  new ResizeObserver(() => {
    resize();
    if (!animated()) kick();
  }).observe(canvas);

  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  (scheme.addEventListener ? scheme.addEventListener.bind(scheme, "change") : scheme.addListener.bind(scheme))(() => {
    readColors();
    kick();
  });

  readColors();
  resize();
  kick();
})();
