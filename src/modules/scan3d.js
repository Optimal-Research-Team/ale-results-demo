/* ==========================================================================
   scan3d.js: The Living Scan (v7 hero, the exam-room welcome and body slides).

   The patient's results as luminous markers inside a scan volume, on
   forest-night, in a scanner HUD. The body is atmosphere: the 39 markers are
   the subject. Figure: the MakeHuman base mesh (CC0, released September 2020
   by Data Collection AB, Joel Palmius and Jonas Hauquier), voxelised offline
   by tools/bake-lattice.mjs into SCAN_LATTICE (two LODs, crown-first build
   order, metric frame: 1.77 m, feet on y 0, facing +z, +x is the figure's
   left).

   mountScan(el, opts) -> { enter(o), setProgress(p), select(id), lock(id),
     setPlate(bool), setPaused(bool), setView(v), refit(), destroy(), state }
   scanPoster(canvas, { camera: 'A' | 'B', composition, dpr, figX }) -> Canvas2D still

   opts = {
     systems: [{ id, label, worst, status, attn }],   (status: the page's sysStatus words)
     priorities: { systemId: 1..3 }, lockId, lockLabel, sex,
     mode: 'page' | 'deck', quality: 'tv' | 'desktop' | 'phone' | 'low',
     frame(): { composition: 'side' | 'stacked', copyTop, hudBottom, figX, plateX, safeL, safeR },
     hud: { tl, tr, honesty, hint, hintPhone, allLabel }, tags: 'attn' | 'none' | 'plate', tagScale,
     reducedMotion, staticGL, threeReady, forceFallback, timeScale, print: [elements],
     onSelect(id), onAll(), onBeat(name), onReady(), onFallback()
   }

   Two backends from one projector: WebGL (three r128) for the live figure;
   Canvas2D for the poster before three.js is ready, reduced motion, no WebGL
   and the A / B stills. Status colour appears only on the reticles; voxels
   are never tinted by status. Nothing here computes a medical value.
   ========================================================================== */
function mountScan(el, opts) { return _sc().mount(el, opts || {}); }
function scanPoster(canvas, opts) { return _sc().poster(canvas, opts || {}); }
function _sc() { return _sc.lib || (_sc.lib = _scMake()); }
function _scMake() {
  'use strict';
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const H_FIG = 1.77, FOV = 26;
  const C_FAR = [0xA4 / 255, 0xC2 / 255, 0x9D / 255], C_NEAR = [0xDD / 255, 0xEB / 255, 0xD6 / 255];
  const MARK = { optimal: '#A4C29D', in_range: '#8F887C', borderline: '#E0A340', out_of_range: '#E58A7A' };
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeIO = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1)); // the laser's sweep: shared with the shader
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const expoOut = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const needs = s => s === 'borderline' || s === 'out_of_range';
  const RANK = { out_of_range: 0, borderline: 1, in_range: 2, optimal: 3 };

  /* ---------------------------------------------------------------- lattice */
  const LAT = {};
  function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function lattice(lod) {
    if (LAT[lod]) return LAT[lod];
    const src = SCAN_LATTICE[lod], n = src.n, p16 = new Int16Array(b64(src.p)), n8 = new Int8Array(b64(src.nrm));
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n * 3; i++) { pos[i] = p16[i] / 10000; nrm[i] = n8[i] / 127; }
    for (let i = 0; i < n; i++) { let h = Math.imul(i ^ 0x9E3779B9, 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16; seed[i] = (h >>> 0) / 4294967296; }
    return (LAT[lod] = { n, pos, nrm, seed, pitch: src.pitch });
  }
  const BONES = () => SCAN_LATTICE.bones;

  /* ---------------------------------------------------------------- anchors */
  // body3d's metric anchor table (v6), carried over; blood sits at the left inner elbow (from the baked bones)
  function anchorTable(sex) {
    const B = BONES(), fa = B.lForeArm;
    return {
      thyroid: { p: [[0, 1.506, 0.047]], n: [0, 0, 1] },
      heart: { p: [[0.032, 1.300, 0.062]], n: [0.3, 0, 1] },
      liver: { p: [[-0.078, 1.160, 0.062]], n: [-0.45, 0, 1] },
      metabolic: { p: [[0.048, 1.116, 0.05]], n: [0.15, 0, 1] },
      kidney: { p: [[0.072, 1.082, -0.074], [-0.072, 1.082, -0.074]], n: [0, 0, -1] },
      urine: { p: [[0, 0.962, 0.065]], n: [0, 0, 1] },
      hormones: sex === 'F' ? { p: [[0.074, 0.992, 0.03], [-0.074, 0.992, 0.03]], n: [0, 0, 1] } : { p: [[0, 0.893, 0.058]], n: [0, 0, 1] },
      blood: { p: [[fa[0] - 0.012, fa[1] + 0.004, fa[2] + 0.05]], n: [-0.2, 0, 1] },
    };
  }
  const ANAT = ['thyroid', 'heart', 'liver', 'metabolic', 'kidney', 'urine', 'hormones', 'blood'];
  const RING = { R: 0.36, y: 0.004, spread: 46 * DEG };
  function buildAnchors(systems, sex) {
    const T = anchorTable(sex);
    const organ = ANAT.map(id => systems.find(s => s.id === id)).filter(Boolean);
    const whole = systems.filter(s => !T[s.id]).sort((a, b) => (RANK[a.worst] ?? 4) - (RANK[b.worst] ?? 4));
    const list = organ.map(s => ({ sys: s, kind: 'organ', p: T[s.id].p, n: norm(T[s.id].n) }));
    whole.forEach((s, k) => {
      const slot = k === 0 ? 0 : (k % 2 ? -1 : 1) * Math.ceil(k / 2), th = slot * RING.spread; // most urgent front and centre
      list.push({ sys: s, kind: 'ring', p: [[RING.R * Math.sin(th), RING.y, RING.R * Math.cos(th)]], n: [Math.sin(th), 0, Math.cos(th)], th, slot: k });
    });
    return list;
  }

  /* Marker positions: organ systems scatter tightly around their anchor; the
     whole-body systems (inflammation, nutrients, electrolytes) are seeded from
     real lattice points through the torso, because that is what they measure. */
  function markerPoints(A, markers, lat) {
    const byId = {}; A.forEach(a => { byId[a.sys.id] = a; });
    const out = [];
    const hash = (i, k) => { let h = Math.imul((i + 1) * 2654435761 ^ (k * 40503), 0x85EBCA6B); h ^= h >>> 13; return ((h >>> 0) / 4294967296); };
    (markers || []).forEach((m, i) => {
      const a = byId[m.system]; if (!a) return;
      let p;
      if (a.kind === 'organ') {
        const c = a.p[i % a.p.length], r = 0.052;
        p = [c[0] + (hash(i, 1) - 0.5) * r * 2, c[1] + (hash(i, 2) - 0.5) * r * 2.4, c[2] + (hash(i, 3) - 0.5) * r];
      } else if (lat && lat.n) {
        // a real point on the body, biased to the torso
        let k = Math.floor(hash(i, 4) * lat.n), guard = 0;
        while (guard++ < 24) { const y = lat.pos[k * 3 + 1]; if (y > 0.88 && y < 1.55) break; k = Math.floor(hash(i, 4 + guard) * lat.n); }
        p = [lat.pos[k * 3] * 1.02, lat.pos[k * 3 + 1], lat.pos[k * 3 + 2] * 1.02];
      } else { p = [(hash(i, 5) - 0.5) * 0.3, 0.95 + hash(i, 6) * 0.55, (hash(i, 7) - 0.5) * 0.14]; }
      out.push({ m, p, sysOrder: A.indexOf(a) });
    });
    return out;
  }

  /* The circulatory layer. A trunk up the spine and out to the pelvis, plus a
     path from the heart to every system's anchor, sampled into points that a
     pulse travels along. It is drawn inside the body and seen through it, the
     way a diagnostic screen shows what is under the skin. */
  function vesselPoints(A, sex) {
    const HEART = [0.032, 1.300, 0.062];
    const paths = [];
    const spine = [[0, 0.95, -0.01], [0, 1.12, 0.005], [0, 1.30, 0.01], [0, 1.47, 0.02], [0, 1.60, 0.04], [0, 1.68, 0.05]];
    paths.push(spine);
    paths.push([[0, 0.95, -0.01], [0.07, 0.86, 0], [0.10, 0.60, 0.01], [0.11, 0.30, 0.02], [0.10, 0.06, 0.03]]);
    paths.push([[0, 0.95, -0.01], [-0.07, 0.86, 0], [-0.10, 0.60, 0.01], [-0.11, 0.30, 0.02], [-0.10, 0.06, 0.03]]);
    A.forEach(a => {
      if (a.kind !== 'organ') return;
      a.p.forEach(t => {
        const mx = (HEART[0] + t[0]) / 2, my = (HEART[1] + t[1]) / 2, mz = (HEART[2] + t[2]) / 2;
        const bow = 0.035 * (t[0] >= HEART[0] ? 1 : -1);
        paths.push([HEART, [mx + bow, my, mz - 0.012], t]);
      });
    });
    // quadratic sampling, denser on the long runs
    const pts = [], dir = [], lens = [];
    paths.forEach((P, pi) => {
      const segs = P.length - 1;
      let total = 0;
      for (let k = 0; k < segs; k++) total += Math.hypot(P[k + 1][0] - P[k][0], P[k + 1][1] - P[k][1], P[k + 1][2] - P[k][2]);
      for (let s2 = 0; s2 < segs; s2++) {
        const a0 = P[s2], b0 = P[s2 + 1];
        const len = Math.hypot(b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2]);
        const n = Math.max(3, Math.round(len / 0.012));
        for (let i = 0; i <= n; i++) {
          const t = (s2 + i / n) / segs;
          const u = i / n;
          pts.push(a0[0] + (b0[0] - a0[0]) * u, a0[1] + (b0[1] - a0[1]) * u, a0[2] + (b0[2] - a0[2]) * u);
          dir.push(t, pi); lens.push(total);
        }
      }
    });
    return { pos: Float32Array.from(pts), t: Float32Array.from(dir.filter((_, i) => i % 2 === 0)),
      path: Float32Array.from(dir.filter((_, i) => i % 2 === 1)), len: Float32Array.from(lens) };
  }
  const VS_VES = `
attribute float aT, aPath, aLen;
uniform mat4 uMVP, uMV; uniform float uFd, uZN, uZF, uClock, uGain, uOn, uBob;
varying float vA; varying vec3 vC;
void main() {
  vec3 pos = position + vec3(0.0, uBob, 0.0);
  vec4 clip = uMVP * vec4(pos, 1.0);
  float z = -(uMV * vec4(pos, 1.0)).z;
  float near = 1.0 - smoothstep(uZN, uZF, z);
  // a pulse runs each path, offset per path so they do not beat together
  float ph = fract(uClock / 2600.0 + aPath * 0.137);
  float d = fract(aT - ph + 1.0);
  float w = 0.055 / max(aLen, 0.18);
  float pulse = smoothstep(1.0 - w, 1.0, 1.0 - d) + 0.40 * smoothstep(1.0 - w * 2.6, 1.0, 1.0 - d);
  float base = 0.17 + 0.20 * near;
  vA = (base + 0.42 * pulse) * uGain * uOn;
  vC = mix(vec3(0.40, 0.58, 0.38), vec3(0.80, 0.90, 0.76), min(1.0, pulse));
  gl_Position = clip;
  gl_PointSize = clamp((0.0085 + 0.008 * pulse) * uFd / max(z, 0.05), 1.0, 7.0);
}`;
  const FS_VES = `precision mediump float; varying float vA; varying vec3 vC;
void main() {
  float m = smoothstep(0.5, 0.26, length(gl_PointCoord - 0.5));
  if (m < 0.01) discard;
  gl_FragColor = vec4(vC, vA * m);
}`;

  /* ----------------------------------------------------------------- camera */
  function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // cam = { yaw (rad, + turns the figure's left toward the camera), tx, ty, tz, dist, pitch, fov, sx, sy (lens shift, NDC) }
  function camera(cam, W, H) {
    const cp = Math.cos(cam.pitch || 0), sp = Math.sin(cam.pitch || 0);
    const E = [cam.tx, cam.ty + cam.dist * sp, cam.tz + cam.dist * cp], T = [cam.tx, cam.ty, cam.tz];
    const f = norm([T[0] - E[0], T[1] - E[1], T[2] - E[2]]), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    const fy = 1 / Math.tan((cam.fov || FOV) * DEG / 2), fx = fy / (W / H), near = 0.05, far = 30;
    const V = [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, E), -dot(u, E), dot(f, E), 1];
    const P = [fx, 0, 0, 0, 0, fy, 0, 0, -(cam.sx || 0), -(cam.sy || 0), (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
    const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
    const M = [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]; // world = (c x - s z, y, s x + c z)
    const toWorld = p => [c * p[0] - s * p[2], p[1], s * p[0] + c * p[2]];
    const view = w => { const d = [w[0] - E[0], w[1] - E[1], w[2] - E[2]]; return [dot(d, r), dot(d, u), -dot(d, f)]; };
    const screen = v => { const zc = -v[2]; return { x: W / 2 * (1 + (fx * v[0] / zc + (cam.sx || 0))), y: H / 2 * (1 - (fy * v[1] / zc + (cam.sy || 0))), z: zc }; };
    return {
      E, V, P, M, fx, fy, W, H, toWorld, view,
      viewDir(d) { return [dot(d, r), dot(d, u), -dot(d, f)]; },
      local(p) { const w = toWorld(p), v = view(w); return Object.assign(screen(v), { v, w }); },
      world(w) { const v = view(w); return Object.assign(screen(v), { v, w }); },
      facing(p, n, isWorld) { const w = isWorld ? p : toWorld(p), nw = isWorld ? n : toWorld(n); return dot(nw, norm([E[0] - w[0], E[1] - w[1], E[2] - w[2]])); },
      pxPerM(z) { return fy * H / 2 / z; },
    };
  }
  function mul4(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }

  /* Framing. A = the whole figure on its floor (side) or a large 3/4 figure behind the copy (stacked);
     B = the dolly onto the priority anchor. Both are solved from the frame's own measurements. */
  function frameA(W, H, F) {
    const fy = 1 / Math.tan(FOV * DEG / 2);
    if (F.composition === 'stacked') {
      // crown 12 px under the HUD labels; the lowest organ reticle (hormones ≈0.89 m) at least 28 px above the copy block
      const p1 = F.hudBottom + 12, p2 = Math.max(p1 + 120, F.copyTop - 30), y1 = H_FIG + 0.01, y2 = 0.86;
      const k = (p2 - p1) / (y1 - y2), dist = fy * (H / 2) / k, ty = y1 - (H / 2 - p1) / k;
      return { yaw: (F.restYaw != null ? F.restYaw : 14) * DEG, tx: 0, ty, tz: 0, dist, pitch: 0, fov: FOV, sx: 2 * (F.figX != null ? F.figX : 0.5) - 1, sy: 0 };
    }
    const top = F.crown != null ? F.crown : 0.08, bot = F.sole != null ? F.sole : 0.91;
    const k = H * (bot - top) / H_FIG, dist = fy * (H / 2) / k, ty = H_FIG - (H / 2 - top * H) / k;
    return { yaw: (F.restYaw != null ? F.restYaw : 18) * DEG, tx: 0, ty, tz: 0, dist, pitch: 0, fov: FOV, sx: 2 * (F.figX != null ? F.figX : 0.7) - 1, sy: 0 };
  }
  function frameB(W, H, F, anchor) {
    const fy = 1 / Math.tan(FOV * DEG / 2), stacked = F.composition === 'stacked';
    // neck to navel ≈ 0.42 m. The deck locks from further back: its artboard is
    // already large, and the tag needs room to the figure's screen right.
    const span = F.spanB != null ? F.spanB : stacked ? 0.40 : 0.70, k = H * span / 0.42;
    const dist = fy * (H / 2) / k, a = anchor || [0.032, 1.3, 0.062];
    const hx = stacked ? 0.5 : (F.bx != null ? F.bx : 0.64), hy = stacked ? 0.32 : 0.44;
    return { yaw: (F.lockYaw != null ? F.lockYaw : 30) * DEG, tx: 0, ty: a[1], tz: 0, dist, pitch: 0, fov: FOV, sx: 2 * hx - 1, sy: 1 - 2 * hy, focus: a };
  }
  function mixCam(A, B, t) {
    const o = {}; for (const k of ['yaw', 'tx', 'ty', 'tz', 'pitch', 'fov', 'sx', 'sy']) o[k] = lerp(A[k], B[k], t);
    o.dist = Math.exp(lerp(Math.log(A.dist), Math.log(B.dist), t)); return o;
  }

  /* ------------------------------------------------------ Canvas2D poster */
  // The same squares in the same colours, additive, back to front: the still for reduced motion, no WebGL,
  // and the frame shown until three.js is ready.
  const LIGHT = [0.34, 0.62, 0.71];
  function paintPoster(canvas, W, H, dpr, cam, o) {
    const cw = Math.max(1, Math.round(W * dpr)), ch = Math.max(1, Math.round(H * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const ctx = canvas.getContext('2d'), C = camera(cam, W, H);
    const fig = C.local([0, cam.ty, 0]);
    paintBackground(ctx, cw, ch, fig.x * dpr, fig.y * dpr, o.bgR || 1);
    if (o.grid !== false) paintGrid(ctx, C, dpr);
    const L = lattice(o.lod || 'lo'), n = L.n, img = ctx.getImageData(0, 0, cw, ch), D = img.data;
    const acc = new Float32Array(cw * ch * 3);
    const zc = C.world([0, cam.ty, 0]).z, zN = zc - 0.36, zF = zc + 0.36, Fd = C.fy * ch / 2;
    const focus = o.focus, fk = o.focusK || 0;
    for (let i = 0; i < n; i++) {
      const p = [L.pos[i * 3], L.pos[i * 3 + 1], L.pos[i * 3 + 2]], q = C.local(p), z = q.z;
      if (z <= 0.05) continue;
      const nv = C.toWorld([L.nrm[i * 3], L.nrm[i * 3 + 1], L.nrm[i * 3 + 2]]), vd = norm([C.E[0] - q.w[0], C.E[1] - q.w[1], C.E[2] - q.w[2]]);
      const near = 1 - sstep(zN, zF, z);
      // the still has to match the live shader: round dots, the same Lambert
      // wrap for volume, and the same facing weighting for the silhouette
      const nView = C.viewDir(nv);
      const lit = clamp(nView[0] * LIGHT[0] + nView[1] * LIGHT[1] + nView[2] * LIGHT[2], -1, 1) * 0.5 + 0.5;
      const facing = Math.abs(nView[2]);
      let a = lerp(0.18, 0.98, near) * lerp(1, 0.46, facing);
      if (focus && fk) { const d = Math.hypot(p[0] - focus[0], p[1] - focus[1], p[2] - focus[2]); a *= lerp(1, 0.45, fk * sstep(0.3, 0.4, d)); }
      a *= o.alpha || 1;
      const side = Math.max(1, Math.round(L.pitch * Fd / z * 0.76 * (0.72 + 0.56 * L.seed[i])));
      const base = [lerp(0.286, 0.847, near), lerp(0.427, 0.937, near), lerp(0.271, 0.812, near)];
      const sh = lerp(0.26, 1.14, lit);
      const r = base[0] * sh * a, g = base[1] * sh * a, b = base[2] * sh * a;
      const px = q.x * dpr, py = q.y * dpr, half = side / 2;
      const x0 = Math.floor(px - half), y0 = Math.floor(py - half);
      for (let yy = Math.max(0, y0); yy < Math.min(ch, y0 + side); yy++) for (let xx = Math.max(0, x0); xx < Math.min(cw, x0 + side); xx++) {
        const dx = (xx + 0.5 - px) / half, dy = (yy + 0.5 - py) / half;
        const m = 1 - sstep(0.68, 1.0, Math.hypot(dx, dy));     // round, soft edge
        if (m <= 0.004) continue;
        const k = (yy * cw + xx) * 3; acc[k] += r * m; acc[k + 1] += g * m; acc[k + 2] += b * m;
      }
    }
    // the markers: the subject, so the still has to carry them too
    (o.mk || []).forEach(x => {
      const q = C.local(x.p); if (q.z <= 0.05) return;
      const near = 1 - sstep(zN, zF, q.z), prio = x.m.priority ? 1 : 0;
      let a = prio ? 1 : 0.80 + 0.20 * near;
      if (focus && fk) { const d = Math.hypot(x.p[0] - focus[0], x.p[1] - focus[1], x.p[2] - focus[2]); a *= lerp(1, 0.42, fk * sstep(0.3, 0.4, d)); }
      const side = Math.max(2, Math.floor((prio ? 0.072 : 0.046) * (o.mkK || 1) * Fd / q.z));
      const hex = MARK[x.m.state] || MARK.in_range;
      const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
      const px = Math.floor(q.x * dpr), py = Math.floor(q.y * dpr), half = side >> 1;
      for (let yy = py - half; yy < py - half + side; yy++) for (let xx = px - half; xx < px - half + side; xx++) {
        if (yy < 0 || yy >= ch || xx < 0 || xx >= cw) continue;
        const m = Math.max(Math.abs(xx - px), Math.abs(yy - py)) / Math.max(1, half);
        const w = m < 0.52 ? 1 : 0.26;
        const k = (yy * cw + xx) * 3; acc[k] += r * a * w; acc[k + 1] += g * a * w; acc[k + 2] += b * a * w;
      }
    });
    for (let i = 0, j = 0; i < acc.length; i += 3, j += 4) {
      if (!acc[i] && !acc[i + 1] && !acc[i + 2]) continue;
      D[j] = Math.min(255, D[j] + acc[i] * 255); D[j + 1] = Math.min(255, D[j + 1] + acc[i + 1] * 255); D[j + 2] = Math.min(255, D[j + 2] + acc[i + 2] * 255);
    }
    ctx.putImageData(img, 0, 0);
    return C;
  }
  function paintBackground(ctx, cw, ch, cx, cy, k) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(Math.max(cx, cw - cx), Math.max(cy, ch - cy)) * k);
    g.addColorStop(0, '#1C3118'); g.addColorStop(0.55, '#15250F'); g.addColorStop(1, '#0F1C0D');
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  }
  function gridSegments() {
    const segs = [], R = 3.2;
    for (let v = -R; v <= R + 1e-6; v += 0.25) {
      const major = Math.abs(v - Math.round(v)) < 1e-6, a = major ? 0.16 : 0.08, h = Math.sqrt(Math.max(0, R * R - v * v));
      if (h < 0.05) continue;
      segs.push([[v, 0, -h], [v, 0, h], a], [[-h, 0, v], [h, 0, v], a]);
    }
    return segs;
  }
  function paintGrid(ctx, C, dpr) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1;
    for (const [a, b, al] of gridSegments()) {
      const N = 24;
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = (i + 1) / N, p0 = [lerp(a[0], b[0], t0), 0, lerp(a[2], b[2], t0)], p1 = [lerp(a[0], b[0], t1), 0, lerp(a[2], b[2], t1)];
        const r = Math.hypot((p0[0] + p1[0]) / 2, (p0[2] + p1[2]) / 2), f = al * (1 - sstep(1.0, 3.2, r));
        if (f < 0.004) continue;
        const s0 = C.world(p0), s1 = C.world(p1); if (s0.z < 0.1 || s1.z < 0.1) continue;
        ctx.strokeStyle = `rgba(135,164,130,${f.toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(s0.x * dpr, s0.y * dpr); ctx.lineTo(s1.x * dpr, s1.y * dpr); ctx.stroke();
      }
    }
    // the scan disc under the feet
    const c = C.world([0, 0, 0]), e = C.world([0.5, 0, 0]), rz = C.world([0, 0, 0.5]);
    const rx = Math.abs(e.x - c.x) * dpr || 1, ry = Math.max(1, Math.abs(rz.y - c.y) * dpr);
    ctx.translate(c.x * dpr, c.y * dpr); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(164,194,157,.10)'); g.addColorStop(1, 'rgba(164,194,157,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
    ctx.restore();
    // floor ring: 32 square dashes at r 0.36 m
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(164,194,157,.42)'; ctx.lineWidth = 1.5 * dpr;
    for (let k = 0; k < 32; k++) {
      const a0 = k / 32 * TAU, a1 = a0 + TAU / 32 * 0.45;
      const s0 = C.world([RING.R * Math.sin(a0), RING.y, RING.R * Math.cos(a0)]), s1 = C.world([RING.R * Math.sin(a1), RING.y, RING.R * Math.cos(a1)]);
      ctx.beginPath(); ctx.moveTo(s0.x * dpr, s0.y * dpr); ctx.lineTo(s1.x * dpr, s1.y * dpr); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------- shaders */
  /* The body is a lit, translucent point cloud, not a field of flat squares.
     Four things carry it (the Neko reference does all four):
       · round, anti-aliased dots, so nothing aliases into a pixel grid;
       · Lambert shading from a fixed light, which is what gives it volume;
       · facing-weighted alpha - points facing the camera go MORE transparent
         and the silhouette goes opaque, so you see through to the far side
         and the outline reads without a hard edge being drawn;
       · normal blending with no depth write, so the cloud layers instead of
         blowing out the way additive did. */
  const VS_VOX = `
attribute vec3 aN; attribute float aSeed;
uniform mat4 uMVP, uMV; uniform mat3 uNM;
uniform vec2 uRes; uniform float uFd, uPitch, uZN, uZF, uT, uL0, uL1, uShim, uShimOn, uFocus, uFringe, uGain, uBob;
uniform vec3 uFocusP;
varying vec3 vC; varying float vA; varying vec3 vN;
const float PI = 3.14159265;
void main() {
  vec3 pos = position + vec3(0.0, uBob, 0.0);
  vec4 clip = uMVP * vec4(pos, 1.0);
  vec3 mv = (uMV * vec4(pos, 1.0)).xyz;
  float z = -mv.z;
  vN = normalize(uNM * aN);
  float near = 1.0 - smoothstep(uZN, uZF, z);
  float side = uPitch * uFd / max(z, 0.05) * 1.04 * (0.76 + 0.48 * aSeed);
  side *= mix(1.0, 0.72, 1.0 - near);                       // far dots shrink as well as dim
  vec3 col = mix(vec3(0.286, 0.427, 0.271), vec3(0.847, 0.937, 0.812), near);
  float a = mix(0.18, 0.98, near);
  // the build: the laser crosses this dot's screen row, then it pops in and cools
  float sy = (1.0 - clip.y / clip.w) * 0.5 * uRes.y;
  float e = clamp((sy - uL0) / max(uL1 - uL0, 1.0), 0.0, 1.0);
  float tc = 300.0 + 1400.0 * acos(1.0 - 2.0 * e) / PI + fract(aSeed * 7.13) * 60.0;
  float age = uT - tc;
  float k = clamp(age / 260.0, 0.0, 1.0);
  float pop = k < 0.5 ? 1.35 * (1.0 - (1.0 - k * 2.0) * (1.0 - k * 2.0)) : mix(1.35, 1.0, (k - 0.5) * 2.0);
  float flash = 1.0 - clamp(age / 400.0, 0.0, 1.0);
  col = mix(col, vec3(0.925, 0.973, 0.894), flash);
  a = mix(a, 0.92, flash * 0.7);
  // the shimmer: a soft 12 cm band travelling crown to sole, with a bright crest
  float db = pos.y - uShim;
  float band = uShimOn * (1.0 - smoothstep(0.0, 0.06, abs(db - 0.06)));
  float crest = uShimOn * (1.0 - step(uPitch * 0.5, abs(db)));
  a *= 1.0 + 0.85 * band; side *= 1.0 + 0.18 * band;
  col = mix(col, vec3(0.925, 0.973, 0.894), crest); a = mix(a, 0.95, crest);
  // focus: brightness only, never colour
  float d = distance(position, uFocusP);
  a *= mix(1.0, 0.45, uFocus * smoothstep(0.3, 0.4, d));
  side = side * (age < 0.0 ? 0.0 : pop);
  if (age < 0.0) { a = 0.0; }
  gl_Position = clip;
  gl_PointSize = clamp(side, 1.0, 14.0);
  vC = col; vA = a * uGain;
}`;
  const FS_VOX = `precision mediump float;
varying vec3 vC; varying float vA; varying vec3 vN;
uniform vec3 uLight;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float mask = smoothstep(0.5, 0.18, length(q));            // a wide feather, so dots melt together rather than tile
  if (mask < 0.01) discard;
  vec3 n = normalize(vN);
  float lit = clamp(dot(n, uLight) * 0.5 + 0.5, 0.0, 1.0);  // Lambert wrap: this is the volume
  vec3 col = mix(vC * 0.26, vC * 1.14, lit);   // a wide lit-to-shadow ramp reads as form
  float facing = abs(n.z);
  // facing the camera -> more transparent; edge-on -> opaque. The silhouette
  // emerges from the cloud instead of being drawn as a line.
  float a = vA * mask * mix(1.0, 0.46, facing);
  gl_FragColor = vec4(col, a);
}`;
  /* The 39 markers. These are the subject now: the figure is only the volume
     they sit in. Each is one of the patient's own results, at its system's
     anchor, in its status colour, with the priorities brightest. */
  const VS_MK = `
attribute vec3 aCol; attribute float aSeed, aPrio, aDelay;
uniform mat4 uMVP, uMV; uniform vec2 uRes; uniform float uFd, uZN, uZF, uT, uClock, uFocus, uGain, uK, uBob;
uniform vec3 uFocusP;
varying vec3 vC; varying float vA, vR;
void main() {
  vec3 pos = position + vec3(0.0, uBob, 0.0);
  vec4 clip = uMVP * vec4(pos, 1.0);
  float z = -(uMV * vec4(pos, 1.0)).z;
  float near = 1.0 - smoothstep(uZN, uZF, z);
  // they ignite with the reticles, in anatomical order
  float age = uT - aDelay;
  float in0 = clamp(age / 320.0, 0.0, 1.0);
  // priorities breathe slowly; everything else is steady
  float pulse = aPrio > 0.5 ? 0.86 + 0.14 * sin(uClock / 1150.0 + aSeed * 6.28) : 1.0;
  float r = (aPrio > 0.5 ? 0.055 : 0.030) * uK;
  float side = r * uFd / max(z, 0.05) * mix(2.2, 1.0, in0) * pulse;
  float a = (aPrio > 0.5 ? 1.0 : 0.50 + 0.26 * near) * in0 * pulse;
  float d = distance(position, uFocusP);
  a *= mix(1.0, 0.42, uFocus * smoothstep(0.3, 0.4, d));
  if (age < 0.0) { a = 0.0; side = 0.0; }
  vec2 px = (clip.xy / clip.w * 0.5 + 0.5) * uRes;
  clip.xy = (floor(px) + 0.5) / uRes * 2.0 - 1.0;
  clip.xy *= clip.w;
  gl_Position = clip;
  gl_PointSize = max(2.0, floor(side));
  vC = aCol; vA = a * uGain; vR = aPrio;
}`;
  // a square core with a soft square halo, so it reads as a pixel, not a blur
  const FS_MK = `varying vec3 vC; varying float vA, vR;
void main() {
  vec2 q = abs(gl_PointCoord - 0.5) * 2.0;
  float m = max(q.x, q.y);
  float core = 1.0 - smoothstep(0.42, 0.52, m);
  float halo = (1.0 - smoothstep(0.52, 1.0, m)) * 0.26;
  gl_FragColor = vec4(vC, vA * max(core, halo));
}`;
  const VS_LINE = `attribute float aA; uniform mat4 uVP; uniform float uR, uGain; varying float vA;
void main() { float r = length(position.xz); vA = aA * (1.0 - smoothstep(1.0, 3.2, r)) * step(r, uR) * uGain; gl_Position = uVP * vec4(position, 1.0); }`;
  const FS_LINE = `uniform vec3 uC; varying float vA; void main() { gl_FragColor = vec4(uC, vA); }`;
  const VS_DISC = `uniform mat4 uVP; varying vec2 vP; void main() { vP = position.xz; gl_Position = uVP * vec4(position, 1.0); }`;
  const FS_DISC = `uniform float uGain; varying vec2 vP;
void main() {
  float r = length(vec2(vP.x / 0.80, vP.y / 0.32));           // an ellipse: the floor is seen at a rake
  float core = 1.0 - smoothstep(0.0, 1.0, r);
  gl_FragColor = vec4(0.678, 0.792, 0.651, (0.052 + 0.20 * core * core) * core * uGain);
}`;
  const VS_BG = `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const FS_BG = `uniform vec2 uRes, uC; uniform float uR; varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() { vec2 p = vUv * uRes; float t = clamp(distance(p, uC) / uR, 0.0, 1.0);
  vec3 c = t < 0.55 ? mix(vec3(0.110, 0.192, 0.094), vec3(0.082, 0.145, 0.059), t / 0.55) : mix(vec3(0.082, 0.145, 0.059), vec3(0.059, 0.110, 0.051), (t - 0.55) / 0.45);
  c += (h(p) - 0.5) / 255.0; gl_FragColor = vec4(c, 1.0); }`;

  /* ==========================================================================
     The engraving. The same lattice read as a drawing rather than a cloud:
     every horizontal slice of the body becomes a closed contour, stroked as a
     sage hairline. Slices through the arms and torso break into separate
     clusters, so a slice is split on x gaps before each piece is wound by
     angle about its own centroid - otherwise the ring stars across the gap.
     ========================================================================== */
  const CONT = {};
  function contours(lod) {
    if (CONT[lod]) return CONT[lod];
    const L = lattice(lod), rows = new Map();
    const step = L.pitch;
    for (let i = 0; i < L.n; i++) {
      const y = L.pos[i * 3 + 1], k = Math.round(y / step);
      let r = rows.get(k); if (!r) rows.set(k, (r = []));
      r.push([L.pos[i * 3], y, L.pos[i * 3 + 2]]);
    }
    const out = [];
    let slice = -1;
    [...rows.keys()].sort((a2, b2) => b2 - a2).forEach(k => {
      slice++;
      const pts = rows.get(k); if (pts.length < 6) return;
      pts.sort((u, v) => u[0] - v[0]);
      // split the slice where x jumps: arms are separate from the torso
      const groups = [];
      let cur = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        if (pts[i][0] - cur[cur.length - 1][0] > step * 2.6) { groups.push(cur); cur = []; }
        cur.push(pts[i]);
      }
      groups.push(cur);
      groups.forEach(g => {
        if (g.length < 6) return;
        let cx = 0, cz = 0;
        g.forEach(q => { cx += q[0]; cz += q[2]; });
        cx /= g.length; cz /= g.length;
        const ring = g.slice().sort((u, v) => Math.atan2(u[2] - cz, u[0] - cx) - Math.atan2(v[2] - cz, v[0] - cx));
        ring.slice = slice;
        out.push(ring);
      });
    });
    return (CONT[lod] = out);
  }
  /* Stroke the contours through the same projector the points use, so the
     engraving sits in the same camera as everything else. */
  function paintLines(canvas, W, H, dpr, cam, o) {
    const cw = Math.max(1, Math.round(W * dpr)), ch = Math.max(1, Math.round(H * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const ctx = canvas.getContext('2d'), C = camera(cam, W, H);
    const fig = C.local([0, cam.ty, 0]);
    paintBackground(ctx, cw, ch, fig.x * dpr, fig.y * dpr, o.bgR || 1);
    if (o.grid !== false) paintGrid(ctx, C, dpr);
    const rings = contours(o.lod || 'lo'), bob = o.bob || 0;
    const zc = C.world([0, cam.ty, 0]).z, zN = zc - 0.34, zF = zc + 0.34;
    ctx.save(); ctx.scale(dpr, dpr);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const focus = o.focus, fk = o.focusK || 0;
    rings.forEach((ring, ri) => {
      if (o.every && (ring.slice == null ? ri : ring.slice) % o.every) return;
      let zsum = 0, drawn = 0;
      ctx.beginPath();
      for (let i = 0; i <= ring.length; i++) {
        const q0 = ring[i % ring.length];
        const q = C.local([q0[0], q0[1] + bob, q0[2]]);
        if (q.z <= 0.05) continue;
        zsum += q.z; drawn++;
        if (!i) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      if (drawn < 4) return;
      const z = zsum / drawn, near = 1 - sstep(zN, zF, z);
      let a = 0.20 + 0.52 * near;
      if (focus && fk) {
        const d = Math.abs(ring[0][1] - focus[1]);
        a *= lerp(1, 0.4, fk * sstep(0.22, 0.34, d));
      }
      ctx.strokeStyle = `rgba(${Math.round(lerp(96, 196, near))},${Math.round(lerp(132, 224, near))},${Math.round(lerp(92, 190, near))},${(a * (o.gain == null ? 1 : o.gain)).toFixed(3)})`;
      ctx.lineWidth = lerp(0.7, 1.25, near);
      ctx.stroke();
    });
    ctx.restore();
    return C;
  }

  /* ------------------------------------------------------------ reticles */
  function retSVG(state) {
    const c = MARK[state] || MARK.in_range;
    const br = (o, a) => `M${o} ${o + a}V${o}h${a}M${36 - o - a} ${o}h${a}v${a}M${36 - o} ${36 - o - a}v${a}h${-a}M${o + a} ${36 - o}h${-a}v${-a}`;
    let g = '';
    if (state === 'optimal') g = `<rect x="16" y="16" width="4" height="4" fill="${c}"/>`;
    else if (state === 'in_range') g = `<rect x="16.75" y="16.75" width="2.5" height="2.5" fill="none" stroke="${c}" stroke-width="1.5"/>`;
    else g = `<path d="M18 8v8M18 20v8M8 18h8M20 18h8" stroke="${c}" stroke-width="2" fill="none"/>`;
    const outer = state === 'out_of_range' ? `<path class="sc-ob" d="${br(1, 5)}" stroke="${c}" stroke-width="2" fill="none"/>` : '';
    return `<svg class="sc-rs" viewBox="0 0 36 36" aria-hidden="true" focusable="false">${outer}<path class="sc-br" d="${br(6, 6)}" stroke="${c}" stroke-width="2" fill="none"/>${g}</svg>`;
  }
  const GLYPH = s => `<span class="sc-gy sc-gy-${s}" aria-hidden="true"></span>`;

  /* ================================================================ mount */
  function mount(el, o) {
    const PAGE = o.mode !== 'deck', RM = !!o.reducedMotion, KT = o.timeScale || 1;
    const LINE = o.look === 'line';   // the engraving: Canvas2D contours, no WebGL at all
    const systems = (o.systems || []).map(s => Object.assign({}, s, { worst: s.worst || 'in_range' }));
    const A = buildAnchors(systems, o.sex);
    const byId = Object.fromEntries(A.map(a => [a.sys.id, a]));
    const lockA = byId[o.lockId || 'heart'];
    const state = { p: 0, ps: { x: 0, v: 0 }, plate: false, sel: null, locked: false, paused: false, built: false, live: false, drag: 0, dragV: 0, hover: null, destroyed: false };
    let quality = o.quality || 'desktop';
    const phoneQ = () => quality === 'phone' || quality === 'low';
    el.classList.add('sc-root'); if (!PAGE) el.classList.add('sc-deck');
    el.innerHTML = `<canvas class="sc-gl" aria-hidden="true"></canvas><canvas class="sc-poster" aria-hidden="true"></canvas>
      <svg class="sc-lead" aria-hidden="true" focusable="false"></svg>
      <div class="sc-hud" aria-hidden="true">
        <svg class="sc-hud-svg" focusable="false"></svg>
        <p class="sc-h sc-tl">${esc(o.hud && o.hud.tl || '')}</p><p class="sc-h sc-tr">${esc(o.hud && o.hud.tr || '')}</p>
        <p class="sc-h sc-hon">${esc(o.hud && o.hud.honesty || '')}</p>
        <p class="sc-h sc-wb">Whole body</p>
      </div>
      <div class="sc-rets"></div><div class="sc-tags" aria-hidden="true"></div>
      ${o.hud && (o.hud.hint || o.hud.hintPhone) ? `<button type="button" class="sc-h sc-hint"><span class="sc-hint-d">${esc(o.hud.hint || '')}</span><span class="sc-hint-p">${esc(o.hud.hintPhone || '')}</span></button>` : ''}
      <div class="sc-laser" aria-hidden="true"><i></i></div>`;
    const glCv = el.querySelector('.sc-gl'), poster = el.querySelector('.sc-poster'), hud = el.querySelector('.sc-hud'), hudSvg = el.querySelector('.sc-hud-svg');
    const retsEl = el.querySelector('.sc-rets'), tagsEl = el.querySelector('.sc-tags'), leadSvg = el.querySelector('.sc-lead'), laser = el.querySelector('.sc-laser');
    const hint = el.querySelector('.sc-hint');
    // reticles: real buttons, anatomical order
    retsEl.innerHTML = A.map(a => {
      const s = a.sys, pr = o.priorities && o.priorities[s.id];
      return `<button type="button" class="sc-ret s-${s.worst}${s.attn ? ' attn' : ''}${a.kind === 'ring' ? ' sc-ring' : ''}" data-scan-sys="${esc(s.id)}" aria-label="${esc(`${s.label}, ${s.status}. Open system.`)}">${retSVG(s.worst)}${pr ? `<span class="sc-pn" aria-hidden="true">${pr}</span>` : ''}</button>`;
    }).join('');
    tagsEl.innerHTML = A.map(a => {
      const s = a.sys, parts = String(s.status || '').split(' · ');
      const pr = o.priorities && o.priorities[s.id];
      const tiles = (s.tiles || []).map(t => `<i class="t-${t}"></i>`).join('');
      return `<div class="sc-tag s-${s.worst}" data-tag="${esc(s.id)}">` +
        `<span class="sc-t-br" aria-hidden="true"></span>` +
        `<p class="sc-t-k">Priority 1</p>` +
        `<p class="sc-t-n">${esc(s.label)}</p>` +
        `<p class="sc-t-s">${GLYPH(s.worst)}${parts.map((x, i) => `<span class="nw">${i ? '· ' : ''}${esc(x)}</span>`).join(' ')}<span class="sc-t-back nw"> · Back of body</span></p>` +
        `<p class="sc-t-c"><b class="num">${s.count || 0}</b> ${s.count === 1 ? 'marker' : 'markers'}${pr ? `<span class="sc-t-pn">PRIORITY ${pr}</span>` : ''}</p>` +
        `<span class="sc-t-tl" aria-hidden="true">${tiles}</span>` +
        `</div>`;
    }).join('');
    const retBtn = Object.fromEntries([...retsEl.children].map(b => [b.dataset.scanSys, b]));
    const tagEl = Object.fromEntries([...tagsEl.children].map(t => [t.dataset.tag, t]));

    /* ---------- geometry ---------- */
    let W = 0, H = 0, F = null, camA = null, camB = null, lastW = 0, lastH = 0, dprNow = 1, C = null;
    let mkPts = null, mkUni = null, ves = null, vesUni = null;
    const zoomK = () => { const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')); return document.documentElement.classList.contains('tv') && z > 0 ? z : 1; };
    function pixelRatio() {
      const dpr = window.devicePixelRatio || 1;
      if (!PAGE) return Math.min(3, dpr * (o.artScale ? o.artScale() : 1));
      if (quality === 'tv') return Math.min(dpr * zoomK(), 3);
      if (quality === 'phone') return dpr / Math.ceil(dpr / 1.5);
      if (quality === 'low') return (dpr / Math.ceil(dpr / 1.5)) * 0.75;
      return Math.min(dpr, 2);
    }
    function fit(force) {
      const w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return false;
      // iOS toolbar collapse: ignore height-only changes under 120 px
      if (!force && w === lastW && Math.abs(h - lastH) < 120 && lastH) return false;
      lastW = w; lastH = h; W = w; H = h;
      F = Object.assign({ composition: 'side' }, o.frame ? o.frame(W, H) : {});
      el.classList.toggle('sc-stacked', F.composition === 'stacked');
      camA = frameA(W, H, F); camB = frameB(W, H, F, lockA ? lockA.p[0] : null);
      dprNow = pixelRatio();
      layoutHud();
      if (gl) sizeGL();
      if (!state.live || RM) paintStill();
      return true;
    }

    /* ---------- HUD ---------- */
    function layoutHud() {
      const ph = F.composition === 'stacked', ins = ph ? 16 : 32, arm = 20;
      const L = (F.safeL || 0) + ins, R = W - (F.safeR || 0) - ins, T = ins + (F.hudTop || 0), B = H - ins;
      let d = `M${L} ${T + arm}V${T}h${arm}M${R - arm} ${T}h${arm}v${arm}M${R} ${B - arm}v${arm}h${-arm}M${L + arm} ${B}h${-arm}v${-arm}`;
      let ticks = '';
      if (!ph) {
        const y0 = H * 0.22, y1 = H * 0.78, x = ins;
        for (let i = 0; i < 40; i++) { const y = lerp(y0, y1, i / 39), long = i % 5 === 0; ticks += `M${x} ${y.toFixed(1)}h${long ? 12 : 6}`; }
      }
      hudSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      hudSvg.innerHTML = `<path class="sc-hb" d="${d}" pathLength="1"/>${ticks ? `<path class="sc-ht" d="${ticks}"/>` : ''}`;
      hud.style.setProperty('--ins', ins + 'px');
    }

    /* ---------- camera state ---------- */
    const t0 = performance.now();
    let swayOn = !RM, lastInput = performance.now(), idleStop = false;
    function curCam(now) {
      const p = state.ps.x, t = easeIO(clamp((p - 0.15) / 0.6, 0, 1));
      const base = state.plate ? Object.assign({}, camA, { sx: 2 * (F.plateX != null ? F.plateX : 0.58) - 1 }) : camA;
      const cam = mixCam(base, camB, t);
      const swayAmp = (phoneQ() ? 8 : 10) * DEG * (1 - sstep(0, 0.05, p)) * (swayOn && !idleStop && state.built ? 1 : 0);
      cam.yaw += swayAmp * Math.sin(TAU * ((now - t0) / 16000)) + state.drag;
      cam.t = t;
      return cam;
    }

    /* ---------- WebGL ---------- */
    let gl = null, THREE = null, renderer = null, scene = null, cam3 = null, vox = [], grid = null, disc = null, ring = null, bg = null, uni = null;
    let lod = null;
    function buildGL(T) {
      THREE = T;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: glCv, antialias: false, alpha: false, powerPreference: PAGE && phoneQ() ? 'default' : 'high-performance' });
      } catch (e) { return false; }
      gl = renderer.getContext(); if (!gl) return false;
      renderer.setClearColor(0x0F1C0D, 1); renderer.autoClear = true;
      scene = new THREE.Scene(); cam3 = new THREE.Camera();
      const M4 = () => new THREE.Matrix4();
      uni = {
        uMVP: { value: M4() }, uMV: { value: M4() }, uNM: { value: new THREE.Matrix3() }, uRes: { value: new THREE.Vector2(1, 1) },
        uFd: { value: 1 }, uPitch: { value: 0.01 }, uZN: { value: 1 }, uZF: { value: 2 }, uT: { value: 1e9 }, uL0: { value: 0 }, uL1: { value: 1 },
        uShim: { value: -9 }, uShimOn: { value: 0 }, uFocus: { value: 0 }, uFocusP: { value: new THREE.Vector3(0, 1.3, 0.06) }, uGain: { value: 1 },
        // a fixed key light, up and to the camera's right: the figure is lit, not flat
        uLight: { value: new THREE.Vector3(0.34, 0.62, 0.71).normalize() },
        uBob: { value: 0 },
      };
      mkUni = {
        uMVP: uni.uMVP, uMV: uni.uMV, uRes: uni.uRes, uFd: uni.uFd, uZN: uni.uZN, uZF: uni.uZF, uT: uni.uT,
        uFocus: uni.uFocus, uFocusP: uni.uFocusP, uGain: uni.uGain, uK: { value: 1 }, uClock: { value: 0 }, uBob: uni.uBob,
      };
      const bgMat = new THREE.ShaderMaterial({ vertexShader: VS_BG, fragmentShader: FS_BG, depthTest: false, depthWrite: false,
        uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uC: { value: new THREE.Vector2(0, 0) }, uR: { value: 1 } } });
      const bgGeo = new THREE.BufferGeometry(); bgGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      bg = new THREE.Mesh(bgGeo, bgMat); bg.frustumCulled = false; bg.renderOrder = 0; scene.add(bg);
      // grid floor, scan disc, floor ring (world space)
      const segs = gridSegments(), gp = new Float32Array(segs.length * 6), ga = new Float32Array(segs.length * 2);
      segs.forEach(([a, b, al], i) => { gp.set([a[0], 0, a[2], b[0], 0, b[2]], i * 6); ga[i * 2] = ga[i * 2 + 1] = al; });
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('aA', new THREE.BufferAttribute(ga, 1));
      const lineMat = (c, a) => new THREE.ShaderMaterial({ vertexShader: VS_LINE, fragmentShader: FS_LINE, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uVP: { value: M4() }, uR: { value: 99 }, uGain: { value: a }, uC: { value: new THREE.Color(c) } } });
      grid = new THREE.LineSegments(gg, lineMat('#87A482', 1)); grid.frustumCulled = false; grid.renderOrder = 1; scene.add(grid);
      const rp = [], ra = [];
      for (let k = 0; k < 32; k++) { const a0 = k / 32 * TAU, a1 = a0 + TAU / 32 * 0.45; rp.push(RING.R * Math.sin(a0), RING.y, RING.R * Math.cos(a0), RING.R * Math.sin(a1), RING.y, RING.R * Math.cos(a1)); ra.push(0.42, 0.42); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rp), 3)); rg.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(ra), 1));
      ring = new THREE.LineSegments(rg, lineMat('#A4C29D', 1)); ring.frustumCulled = false; ring.renderOrder = 1; scene.add(ring);
      const dg = new THREE.CircleGeometry(0.78, 64); dg.rotateX(-Math.PI / 2); dg.translate(0, 0.0008, 0.03);
      disc = new THREE.Mesh(dg, new THREE.ShaderMaterial({ vertexShader: VS_DISC, fragmentShader: FS_DISC, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uVP: { value: M4() }, uGain: { value: 1 } } }));
      disc.frustumCulled = false; disc.renderOrder = 1; scene.add(disc);
      buildVessels();
      buildMarkers();
      setLOD(phoneQ() ? 'lo' : 'hi');
      glCv.addEventListener('webglcontextlost', e => { e.preventDefault(); toFallback(); }, false);
      sizeGL();
      return true;
    }
    function setLOD(k) {
      if (lod === k) return; lod = k;
      vox.forEach(v => { scene.remove(v); }); if (vox[0]) vox[0].geometry.dispose();
      const L = lattice(k), g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(L.pos, 3)); g.setAttribute('aN', new THREE.BufferAttribute(L.nrm, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(L.seed, 1));
      uni.uPitch.value = L.pitch;
      const mk = fr => { const u = Object.assign({}, uni, { uFringe: { value: fr } });
        const m = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: VS_VOX, fragmentShader: FS_VOX, uniforms: u, transparent: true, depthTest: false, depthWrite: false, blending: THREE.NormalBlending }));
        m.frustumCulled = false; m.renderOrder = 2; return m; };
      vox = [mk(0)];
      if (fringeOn()) vox.push(mk(-1), mk(1));
      vox.forEach(v => scene.add(v));
    }
    /* The markers ignite with their system's reticle, in anatomical order, so
       the body and its results arrive as one sequence rather than two. */
    let MK_PTS = null;
    const mkPoints = () => (MK_PTS || (MK_PTS = markerPoints(A, o.markers, lattice(phoneQ() ? 'lo' : 'hi'))));
    function buildMarkers() {
      const MK_PTS = mkPoints();
      if (!MK_PTS.length) return;
      const n = MK_PTS.length;
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seed = new Float32Array(n), prio = new Float32Array(n), del = new Float32Array(n);
      MK_PTS.forEach((x, i) => {
        pos[i * 3] = x.p[0]; pos[i * 3 + 1] = x.p[1]; pos[i * 3 + 2] = x.p[2];
        const hex = MARK[x.m.state] || MARK.in_range;
        col[i * 3] = parseInt(hex.slice(1, 3), 16) / 255; col[i * 3 + 1] = parseInt(hex.slice(3, 5), 16) / 255; col[i * 3 + 2] = parseInt(hex.slice(5, 7), 16) / 255;
        seed[i] = (i * 0.618) % 1; prio[i] = x.m.priority ? 1 : 0;
        del[i] = K(1700) + x.sysOrder * K(60) + (i % 5) * K(18);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      g.setAttribute('aPrio', new THREE.BufferAttribute(prio, 1));
      g.setAttribute('aDelay', new THREE.BufferAttribute(del, 1));
      mkPts = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: VS_MK, fragmentShader: FS_MK, uniforms: mkUni, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      mkPts.frustumCulled = false; mkPts.renderOrder = 3; scene.add(mkPts);
    }
    function buildVessels() {
      if (!o.vessels) return;
      const V = vesselPoints(A, o.sex);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(V.pos, 3));
      g.setAttribute('aT', new THREE.BufferAttribute(V.t, 1));
      g.setAttribute('aPath', new THREE.BufferAttribute(V.path, 1));
      g.setAttribute('aLen', new THREE.BufferAttribute(V.len, 1));
      vesUni = { uMVP: uni.uMVP, uMV: uni.uMV, uFd: uni.uFd, uZN: uni.uZN, uZF: uni.uZF,
        uClock: { value: 0 }, uGain: uni.uGain, uOn: { value: 1 }, uBob: uni.uBob };
      ves = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: VS_VES, fragmentShader: FS_VES, uniforms: vesUni, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      ves.frustumCulled = false; ves.renderOrder = 2.5; scene.add(ves);
    }
    let fringeForcedOff = false;
    const fringeOn = () => false;   // retired with the square voxels
    function sizeGL() {
      if (!renderer) return;
      renderer.setPixelRatio(dprNow); renderer.setSize(W, H, false);
      const cw = Math.round(W * dprNow), ch = Math.round(H * dprNow);
      uni.uRes.value.set(cw, ch); bg.material.uniforms.uRes.value.set(cw, ch);
    }
    function setMats(cam) {
      C = camera(cam, W, H);
      const cw = W * dprNow, ch = H * dprNow;
      const VP = mul4(C.P, C.V), MVP = mul4(VP, C.M), MV = mul4(C.V, C.M);
      if (uni) {
        uni.uMVP.value.fromArray(MVP); uni.uMV.value.fromArray(MV);
        uni.uNM.value.set(MV[0], MV[4], MV[8], MV[1], MV[5], MV[9], MV[2], MV[6], MV[10]);
        uni.uFd.value = C.fy * ch / 2;
        const zc = C.world([0, cam.ty, 0]).z; uni.uZN.value = zc - 0.36; uni.uZF.value = zc + 0.36;
        grid.material.uniforms.uVP.value.fromArray(VP); ring.material.uniforms.uVP.value.fromArray(VP); disc.material.uniforms.uVP.value.fromArray(VP);
        const fc = C.local([0, cam.ty, 0]);
        bg.material.uniforms.uC.value.set(fc.x * dprNow, ch - fc.y * dprNow); bg.material.uniforms.uR.value = Math.hypot(Math.max(fc.x, W - fc.x), Math.max(fc.y, H - fc.y)) * dprNow;
      }
      return C;
    }

    /* ---------- the build timeline ---------- */
    let build = null; // { t0, resolve }
    const K = ms => ms * KT;
    const printEls = () => (o.print ? (typeof o.print === 'function' ? o.print() : o.print) : []).filter(Boolean);
    function laserY(tb) { // local px
      const crown = C ? C.local([0, H_FIG, 0]).y : H * 0.08;
      if (tb < K(300)) return Math.max(0, crown);
      return lerp(Math.max(0, crown), H, easeIO((tb - K(300)) / K(1400)));
    }
    function applyBuild(tb) {
      const ly = laserY(tb);
      // laser: appears at the crown at 100 ms, spreads from the centre over 200 ms, fades 1700–1900
      const on = tb >= K(100) && tb < K(1900);
      laser.style.opacity = on ? String(tb < K(1700) ? 1 : 1 - (tb - K(1700)) / K(200)) : '0';
      laser.style.transform = `translateY(${ly.toFixed(1)}px)`;
      laser.firstElementChild.style.transform = `scaleX(${clamp((tb - K(100)) / K(200), 0, 1).toFixed(3)})`;
      // copy printed as the line passes
      const fr = el.getBoundingClientRect(), frac = ly / H;
      printEls().forEach(pe => {
        const r = pe.getBoundingClientRect(); if (!r.height) return;
        const k = clamp((frac * fr.height - (r.top - fr.top)) / r.height, 0, 1);
        pe.style.clipPath = k >= 1 ? '' : `inset(-2px -40px ${((1 - k) * 100).toFixed(2)}% -40px)`;
        if (k > 0 && !pe._glow) { pe._glow = 1; pe.classList.add('sc-printed'); }
      });
      if (uni) { uni.uT.value = tb / KT; const ch = H * dprNow; uni.uL0.value = Math.max(0, (C ? C.local([0, H_FIG, 0]).y : 0)) * dprNow; uni.uL1.value = ch; }
      // HUD brackets 300–700, labels flicker 700–940 (3 steps within 250 ms), grid 1100–1700 radially from the feet
      el.style.setProperty('--hb', clamp((tb - K(300)) / K(400), 0, 1).toFixed(3));
      const fl = tb < K(700) ? 0 : tb < K(780) ? 0.6 : tb < K(860) ? 0.3 : 1;
      el.style.setProperty('--hl', String(fl));
      const gr = easeOut((tb - K(1100)) / K(600)) * 3.3;
      if (grid) { grid.material.uniforms.uR.value = gr; ring.material.uniforms.uGain.value = clamp((tb - K(1400)) / K(300), 0, 1); disc.material.uniforms.uGain.value = clamp((tb - K(1100)) / K(600), 0, 1); }
      // reticles ignite top to bottom from 1700 (60 ms stagger), the attention systems last with one pulse
      const order = retOrder();
      order.forEach((id, i) => { const b = retBtn[id]; const at = K(1700) + i * K(60); b.classList.toggle('lit', tb >= at); if (tb >= at && !b._ign) { b._ign = 1; b.classList.add('ign'); } });
      el.classList.toggle('sc-tags-in', tb >= K(2100));
      if (tb >= K(1800) && !build.counted) { build.counted = true; if (o.onBeat) o.onBeat('count'); }
    }
    function retOrder() {
      const ids = A.map(a => a.sys.id), organ = ids.filter(id => byId[id].kind === 'organ');
      const ring = ids.filter(id => byId[id].kind === 'ring');
      const seq = organ.concat(ring);
      return seq.filter(id => !byId[id].sys.attn).concat(seq.filter(id => byId[id].sys.attn));
    }
    function settle() {
      build = null; state.built = true;
      el.classList.remove('sc-building'); el.classList.add('sc-built', 'sc-tags-in');
      laser.style.opacity = '0';
      printEls().forEach(pe => { pe.style.clipPath = ''; });
      el.style.setProperty('--hb', '1'); el.style.setProperty('--hl', '1');
      Object.values(retBtn).forEach(b => b.classList.add('lit'));
      if (uni) { uni.uT.value = 1e9; grid.material.uniforms.uR.value = 99; ring.material.uniforms.uGain.value = 1; disc.material.uniforms.uGain.value = 1; }
      if (o.onBeat) o.onBeat('settled');
      kick();
    }
    function enter(opt) {
      opt = opt || {};
      return new Promise(res => {
        if (opt.skip || RM || o.staticGL) { settle(); if (o.onBeat) o.onBeat('count-skip'); res(); return; }
        const go = () => {
          if (state.destroyed) { res(); return; }
          if (!state.live) { // poster path: a plain 600 ms fade, text revealed without the laser
            el.classList.add('sc-fadein'); settle(); res(); return;
          }
          state.built = false; el.classList.remove('sc-built', 'sc-tags-in'); el.classList.add('sc-building');
          Object.values(retBtn).forEach(b => { b.classList.remove('lit', 'ign'); b._ign = 0; });
          printEls().forEach(pe => { pe._glow = 0; pe.classList.remove('sc-printed'); });
          build = { t0: performance.now(), resolve: res };
          if (o.onBeat) o.onBeat('start');
          kick();
        };
        const wait = opt.now ? Promise.resolve() : Promise.race([Promise.all([document.fonts ? document.fonts.ready : null, readyP]), new Promise(r => setTimeout(r, 1200))]);
        wait.then(go, go);
      });
    }

    /* ---------- overlay: reticles, tags, leaders ---------- */
    let tagMode = o.tags || 'attn';
    function overlay(cam) {
      const ph = F.composition === 'stacked', tagK = o.tagScale || 1, B = state.ps.x, bT = cam.t || 0;
      const pos = {};
      A.forEach(a => {
        const b = retBtn[a.sys.id];
        let x, y, back = false;
        if (a.kind === 'ring' && ph) { // phone: whole-body systems in a HUD column at the top right
          const k = a.slot; x = W - (F.safeR || 0) - 16 - 22; y = (F.wbTop || 64) + 26 + k * 48;
        } else {
          const pts = a.p.map(p => (a.kind === 'ring' ? C.world(p) : C.local([p[0], p[1] + bobY, p[2]])));
          const vis = pts.map((q, i) => ({ q, f: a.kind === 'ring' ? 1 : C.facing(a.p[i], a.n) }));
          vis.sort((u, v) => v.f - u.f); // the paired organ facing the camera carries the reticle
          x = vis[0].q.x; y = vis[0].q.y; back = a.kind === 'organ' && vis[0].f < -0.1 && a.sys.id !== 'blood';
          if (a.sys.id === 'kidney') back = C.facing(a.p[0], a.n) < -0.1 && C.facing(a.p[1], a.n) < -0.1;
        }
        pos[a.sys.id] = { x, y, back };
        b.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        b.classList.toggle('back', back);
        const isLock = a === lockA;
        b.classList.toggle('dim', bT > 0.05 && !isLock);
        b.style.setProperty('--dim', isLock ? '1' : (1 - 0.7 * bT).toFixed(3));
        b.classList.toggle('off', ph && a.kind === 'ring' && bT > 0.5);
      });
      layoutTags(pos, cam, tagK);
      return pos;
    }
    /* Which gutter a label belongs in is decided in BODY space, once. Deciding
       it from the projected x made every midline system (thyroid, urinalysis,
       hormones sit within a few px of the axis) flip columns as the idle sway
       crossed them. Midline systems are dealt out alternately so the two
       columns stay balanced. */
    const SIDE = (() => {
      const m = {}, mid = [];
      A.forEach(a => {
        if (a.kind === 'ring') { m[a.sys.id] = a.th < 0 ? 'L' : 'R'; return; }
        const bx = a.p[0][0];
        if (Math.abs(bx) > 0.02) m[a.sys.id] = bx < 0 ? 'L' : 'R'; else mid.push(a.sys.id);
      });
      let l = Object.values(m).filter(v => v === 'L').length, r = Object.values(m).length - l;
      mid.forEach(id => { if (l <= r) { m[id] = 'L'; l++; } else { m[id] = 'R'; r++; } });
      return m;
    })();
    const sideOf = id => SIDE[id] || 'R';
    function layoutTags(pos, cam, tagK) {
      const ph = F.composition === 'stacked', bT = cam.t || 0;
      let show = [];
      if (bT >= 0.5) show = lockA ? [lockA.sys.id] : [];
      else if (state.plate) show = A.map(a => a.sys.id);
      else if (!ph && tagMode !== 'none') show = A.filter(a => a.sys.attn || (tagMode === 'split' && a.kind === 'organ')).map(a => a.sys.id);
      if (!ph && state.hover && !show.includes(state.hover) && bT < 0.5) show.push(state.hover);
      if (state.sel && !show.includes(state.sel) && bT < 0.5 && !ph) show.push(state.sel);
      const fig = C.local([0, cam.ty, 0]), figL = C.local([-0.42, 1.2, 0]).x, figR = C.local([0.42, 1.2, 0]).x;
      const halfW = Math.abs(figR - figL) / 2, cx = fig.x;
      const gap = (F.tagGap != null ? F.tagGap : 36) * tagK, colR = cx + halfW + gap, colL = cx - halfW - gap;
      const cols = { L: [], R: [] };
      /* Measure BEFORE any class changes. Reading offsetWidth/Height flushes
         style, so measuring between removing .on and adding it back restarted
         the opacity transition every frame and pinned every tag but the first
         at zero. Sizes only change with content or scale, so they are cached. */
      const sizeOf = id => {
        const t = tagEl[id]; if (!t) return [160, 44 * tagK];
        if (!t._sz || t._szK !== tagK) { t._sz = [t.offsetWidth || 160, t.offsetHeight || 44 * tagK]; t._szK = tagK; }
        return t._sz;
      };
      show.forEach(id => {
        const q = pos[id], t = tagEl[id]; if (!q || !t) return;
        const split = state.plate || tagMode === 'split';
        const side = split && bT < 0.5 ? sideOf(id) : 'R';
        cols[side].push({ id, y: q.y, x: q.x, h: sizeOf(id)[1] });
      });
      const top = (F.tagTop != null ? F.tagTop : 70) * tagK, bot = H - (F.tagBot != null ? F.tagBot : 104) * tagK;
      let d = '';
      const want = new Set(show);
      // only touch a class that actually changes, so no transition is restarted
      Object.entries(tagEl).forEach(([id, t]) => { if (t.classList.contains('on') !== want.has(id)) t.classList.toggle('on', want.has(id)); });
      for (const side of ['L', 'R']) {
        const c = cols[side].sort((p, q) => p.y - q.y);
        const g = (a, b) => Math.max(16 * tagK, ((a.h || 0) + (b.h || 0)) / 2 + 12 * tagK);
        let prev = null; c.forEach(it => { it.ty = Math.max(it.y, prev ? prev.ty + g(prev, it) : -1e9, top); prev = it; });
        let next = null; for (let i = c.length - 1; i >= 0; i--) { c[i].ty = Math.min(c[i].ty, next ? next.ty - g(c[i], next) : 1e9, bot); next = c[i]; }
        c.forEach(it => {
          const t = tagEl[it.id], lock = bT >= 0.5, isL = side === 'L';
          const colX = lock ? Math.max(it.x + 90 * tagK, colR) : side === 'R' ? colR : colL;
          if (t.classList.contains('lock') !== lock) t.classList.toggle('lock', lock);
          if (t.classList.contains('L') !== isL) { t.classList.toggle('L', isL); t._sz = null; }
          const back = !!pos[it.id].back;
          if (t.classList.contains('back') !== back) t.classList.toggle('back', back);
          const sz = sizeOf(it.id);
          const tx = side === 'R' ? colX : colX - sz[0];
          t.style.transform = `translate3d(${tx.toFixed(1)}px,${(it.ty - sz[1] / 2).toFixed(1)}px,0)`;
          // leader: horizontal from the reticle, a 45° turn onto the tag's row, a square terminal
          const x0 = it.x + (side === 'R' ? 16 : -16) * tagK, y0 = it.y, xe = colX + (side === 'R' ? -8 : 8) * tagK, dy = it.ty - y0;
          const knee = xe - (side === 'R' ? 1 : -1) * Math.abs(dy);
          if ((side === 'R' && knee > x0) || (side === 'L' && knee < x0)) d += `M${x0.toFixed(1)} ${y0.toFixed(1)}H${knee.toFixed(1)}L${xe.toFixed(1)} ${it.ty.toFixed(1)}`;
          else d += `M${x0.toFixed(1)} ${y0.toFixed(1)}L${xe.toFixed(1)} ${it.ty.toFixed(1)}`;
          d += `M${(xe - 2.5).toFixed(1)} ${(it.ty - 2.5).toFixed(1)}h5v5h-5Z`;
        });
      }
      leadSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      leadSvg.innerHTML = d ? `<path d="${d}"/>` : '';
    }

    /* ---------- render loop ---------- */
    let raf = 0, lastT = 0, frameN = 0, fts = [], lockOn = false, shimT0 = performance.now();
    function kick() { if (!raf && !state.paused && !state.destroyed) raf = requestAnimationFrame(frame); }
    function needsLoop(now) {
      if (build) return true;
      if (!(Math.abs(state.ps.x - state.p) < 1e-4 && Math.abs(state.ps.v) < 1e-4)) return true;
      if (drag || Math.abs(state.drag) > 1e-4 && dragBack) return true;
      if (RM || o.staticGL) return false;
      if (LINE) return !idleStop;
      return state.live && !idleStop; // idle sway, shimmer and the float
    }
    function frame(now) {
      raf = 0; if (state.paused || state.destroyed) return;
      const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
      // phones idle at 30 fps; 60 during the build, a drag or the dolly
      const active = build || drag || Math.abs(state.ps.x - state.p) > 1e-3;
      frameN++;
      if (phoneQ() && !active && frameN % 2) { if (needsLoop(now)) kick(); return; }
      // critically damped spring on the scroll progress (ω ≈ 10) hides wheel stepping
      if (RM || o.staticGL) { state.ps.x = state.p; state.ps.v = 0; }
      else { const w = 10, f = 1 + 2 * dt * w, oo = w * w, hoo = dt * oo, det = 1 / (f + dt * hoo); const x = (f * state.ps.x + dt * state.ps.v + dt * hoo * state.p) * det; state.ps.v = (state.ps.v + hoo * (state.p - state.ps.x)) * det; state.ps.x = x; }
      if (!drag && dragBack) { state.drag *= Math.exp(-dt * 5.5); if (Math.abs(state.drag) < 1e-4) { state.drag = 0; dragBack = false; } }
      if (phoneQ() && now - lastInput > 45000) idleStop = true;
      const cam = curCam(now);
      render(cam, now);
      // lock: the priority reticle locks when p crosses 0.6 (reverses below 0.55)
      const want = state.ps.x >= 0.6 ? true : state.ps.x < 0.55 ? false : lockOn;
      if (want !== lockOn) { lockOn = want; setLock(want); }
      if (build) { const tb = now - build.t0; applyBuild(tb); if (tb >= K(2400)) { const r = build.resolve; settle(); r(); } }
      if (state.live && !phoneQ() && !o.staticGL) adapt(dt);
      if (needsLoop(now)) kick();
    }
    function render(cam, now) {
      if (LINE) {
        bobY = (RM || !state.built) ? 0 : Math.sin((now - shimT0) / 3400) * 0.017 + Math.sin((now - shimT0) / 5300) * 0.008;
        const ft = state.ps.x >= 0.15 ? clamp((state.ps.x - 0.15) / 0.6, 0, 1) : 0;
        const fp = lockA ? lockA.p[0] : null;
        paintLines(poster, W, H, dprNow, cam, { lod: phoneQ() ? 'lo' : 'hi', grid: true, bob: bobY,
          focus: fp, focusK: Math.max(easeIO(ft), deckFocus), gain: gain, every: phoneQ() ? 3 : 2 });
        C = camera(cam, W, H);
        overlay(cam);
        return;
      }
      setMats(cam);
      // a slow drift so the figure is never quite still; the floor stays put,
      // which is what makes it read as floating rather than the camera moving
      bobY = (RM || o.staticGL || !state.built) ? 0 : Math.sin((now - shimT0) / 3400) * 0.017 + Math.sin((now - shimT0) / 5300) * 0.008;
      if (uni) uni.uBob.value = bobY;
      if (uni && state.live) {
        const ph = phoneQ(), T = ph ? 8000 : 6000, on = state.built && !RM && !o.staticGL && !idleStop;
        const u = ((now - shimT0) % T) / T;
        uni.uShim.value = H_FIG + 0.1 - u * (H_FIG + 0.4); uni.uShimOn.value = on ? 1 : 0;
        const ft = state.ps.x >= 0.15 ? clamp((state.ps.x - 0.15) / 0.6, 0, 1) : 0;
        uni.uFocus.value = Math.max(easeIO(ft), state.sel ? 0.5 : 0, deckFocus);
        const fp = state.sel && byId[state.sel] && byId[state.sel].kind === 'organ' && !(ft > 0) ? byId[state.sel].p[0] : lockA ? lockA.p[0] : [0, 1.3, 0.06];
        uni.uFocusP.value.set(fp[0], fp[1], fp[2]);
        uni.uGain.value = gain;
        if (mkUni) { mkUni.uK.value = phoneQ() ? 0.80 : 1; mkUni.uClock.value = now - shimT0; }
        if (vesUni) { vesUni.uClock.value = now - shimT0; vesUni.uOn.value = state.built ? 1 : 0; }
        renderer.render(scene, cam3);
      }
      overlay(cam);
    }
    let deckFocus = 0, gain = 1, bobY = 0;
    function adapt(dt) {
      fts.push(dt * 1000); if (fts.length < 120) return;
      const s = fts.slice().sort((a, b) => a - b), p95 = s[Math.floor(s.length * 0.95)]; fts = [];
      if (p95 <= 22) return;
      if (fringeOn()) { fringeForcedOff = true; const keep = lod; lod = null; setLOD(keep); return; }
      if (lod === 'hi') { setLOD('lo'); return; }
      if (quality !== 'low') { quality = 'low'; dprNow = pixelRatio(); sizeGL(); }
    }
    function setLock(on) {
      if (!lockA) return;
      const b = retBtn[lockA.sys.id];
      b.classList.remove('locking', 'unlocking'); void b.offsetWidth;
      b.classList.add(on ? 'locking' : 'unlocking'); b.classList.toggle('locked', on);
      el.classList.toggle('sc-locked', on);
      state.locked = on;
      if (o.onBeat) o.onBeat(on ? 'lock' : 'unlock');
    }

    /* ---------- the still (Canvas2D) ---------- */
    let stillTimer = 0;
    function paintStill() {
      if (!W || !H) return;
      clearTimeout(stillTimer);
      stillTimer = setTimeout(() => {
        if (state.destroyed) return;
        const which = RM && state.p >= 0.5 ? 'B' : 'A';
        const cam = which === 'B' ? Object.assign({}, camB, { t: 1 }) : Object.assign({}, state.plate ? Object.assign({}, camA, { sx: 2 * (F.plateX != null ? F.plateX : 0.58) - 1 }) : camA, { t: 0 });
        if (LINE) paintLines(poster, W, H, Math.min(2, pixelRatio()), cam, { lod: phoneQ() ? 'lo' : 'hi', grid: true, focus: which === 'B' && lockA ? lockA.p[0] : null, focusK: which === 'B' ? 1 : 0, every: phoneQ() ? 3 : 2 });
        else paintPoster(poster, W, H, Math.min(2, pixelRatio()), cam, { lod: phoneQ() ? 'lo' : 'hi', grid: true, mk: mkPoints(), mkK: phoneQ() ? 0.80 : 1, focus: which === 'B' && lockA ? lockA.p[0] : null, focusK: which === 'B' ? 1 : 0 });
        C = camera(cam, W, H);
        overlay(cam);
      }, 0);
    }
    // reduced motion keeps the pin (it is scrolling, not animation) and swaps the A and B stills by opacity
    let rmWhich = 'A';
    function rmSwap(p) {
      const w = p >= 0.5 ? 'B' : 'A'; if (w === rmWhich) return; rmWhich = w;
      poster.style.transition = 'opacity .12s linear'; poster.style.opacity = '0';
      setTimeout(() => { paintStill(); setTimeout(() => { poster.style.opacity = '1'; }, 16); }, 120);
    }

    /* ---------- live swap ---------- */
    let readyRes; const readyP = new Promise(r => { readyRes = r; });
    function goLive() {
      if (state.destroyed || RM) { readyRes(); return; }
      state.live = true; el.classList.add('sc-live');
      const cam = curCam(performance.now()); render(cam, performance.now());
      requestAnimationFrame(() => { poster.style.transition = 'opacity .3s linear'; poster.style.opacity = '0'; });
      readyRes(); if (o.onReady) o.onReady();
      kick();
    }
    function toFallback() {
      state.live = false; el.classList.remove('sc-live'); poster.style.opacity = '1'; paintStill(); readyRes();
      if (o.onFallback) o.onFallback();
    }
    fit(true);
    if (LINE) {
      state.live = true; el.classList.add('sc-live', 'sc-line');
      poster.style.opacity = '1';
      requestAnimationFrame(() => { readyRes(); if (o.onReady) o.onReady(); kick(); });
    } else if (!RM && !o.forceFallback && o.threeReady) {
      Promise.resolve(o.threeReady).then(T => {
        if (state.destroyed) return;
        if (!T || !buildGL(T)) { toFallback(); return; }
        fit(true); goLive();
      }, () => toFallback());
    } else { paintStill(); readyRes(); }

    /* ---------- input ---------- */
    let drag = null, dragBack = false;
    const onDown = e => {
      if (e.button > 0 || e.target.closest('button,a')) return;
      drag = { x: e.clientX, y: e.clientY, d0: state.drag, id: e.pointerId, on: e.pointerType === 'mouse' };
      lastInput = performance.now(); idleStop = false;
    };
    const onMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.3) { drag.on = true; try { el.setPointerCapture(e.pointerId); } catch (x) { /* noop */ } } else if (Math.abs(dy) > 8) { drag = null; return; } else return; }
      state.drag = drag.d0 + dx / Math.max(260, W * 0.5) * Math.PI * 0.9; dragBack = false; kick();
    };
    const onUp = () => { if (!drag) return; drag = null; if (state.ps.x > 0.5 || !PAGE) dragBack = true; kick(); };
    el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
    const wake = () => { lastInput = performance.now(); if (idleStop) { idleStop = false; kick(); } };
    addEventListener('scroll', wake, { passive: true }); addEventListener('touchstart', wake, { passive: true });
    function pick(id) {
      const b = retBtn[id], t = tagEl[id];
      if (!RM) {
        if (b) { b.classList.remove('glitch'); void b.offsetWidth; b.classList.add('glitch'); }
        if (t) { t.classList.remove('glitch'); void t.offsetWidth; t.classList.add('glitch'); }
      }
      setTimeout(() => { if (o.onSelect) o.onSelect(id); }, RM ? 0 : 180);
    }
    retsEl.addEventListener('click', e => {
      const b = e.target.closest('[data-scan-sys]'); if (b) pick(b.dataset.scanSys);
    });
    retsEl.addEventListener('pointerover', e => { const b = e.target.closest('[data-scan-sys]'); if (b && e.pointerType === 'mouse') { state.hover = b.dataset.scanSys; redraw(); } });
    retsEl.addEventListener('pointerout', e => { const b = e.target.closest('[data-scan-sys]'); if (b && !b.contains(e.relatedTarget)) { state.hover = null; redraw(); } });
    retsEl.addEventListener('focusin', e => { const b = e.target.closest('[data-scan-sys]'); if (b) { state.hover = b.dataset.scanSys; redraw(); } });
    retsEl.addEventListener('focusout', () => { state.hover = null; redraw(); });
    if (hint) hint.addEventListener('click', () => { if (o.onAll) o.onAll(); });
    if (o.cards) {
      const tagId = e => { const t = e.target.closest && e.target.closest('.sc-tag'); return t ? t.dataset.tag : null; };
      tagsEl.addEventListener('pointerover', e => { const id = tagId(e); if (!id || e.pointerType !== 'mouse') return; state.hover = id; redraw(); });
      tagsEl.addEventListener('pointerout', e => { if (e.pointerType !== 'mouse') return; if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.sc-tag')) return; state.hover = null; redraw(); });
      tagsEl.addEventListener('click', e => { const id = tagId(e); if (id) pick(id); });
    }
    function redraw() { if (state.live && !RM) kick(); else if (C) overlay(Object.assign({}, rmWhich === 'B' ? camB : camA, { t: rmWhich === 'B' ? 1 : 0 })); }

    /* ---------- lifecycle ---------- */
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { const vis = es.some(x => x.isIntersecting); setPaused(!vis, 'io'); }, { rootMargin: '80px' }) : null;
    if (io && PAGE) io.observe(o.observe || el);
    const pausedBy = new Set();
    function setPaused(on, why = 'api') {
      if (on) pausedBy.add(why); else pausedBy.delete(why);
      state.paused = pausedBy.size > 0;
      if (!state.paused) { lastT = 0; kick(); } else { cancelAnimationFrame(raf); raf = 0; }
    }
    const onVis = () => setPaused(document.hidden, 'hidden');
    document.addEventListener('visibilitychange', onVis);
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { if (fit(false)) { redraw(); if (state.live) kick(); } }) : null;
    if (ro) ro.observe(el);

    const api = {
      state,
      enter,
      setProgress(p) {
        state.p = clamp(p, 0, 1);
        if (RM) { rmSwap(state.p); const want = state.p >= 0.6 ? true : state.p < 0.55 ? false : lockOn; if (want !== lockOn) { lockOn = want; setLock(want); } return; }
        if (o.staticGL) { state.ps.x = state.p; }
        lastInput = performance.now(); idleStop = false;
        if (state.live) kick(); else { state.ps.x = state.p; paintStill(); }
      },
      select(id) {
        state.sel = id && byId[id] ? id : null;
        Object.entries(retBtn).forEach(([k, b]) => b.classList.toggle('sel', k === state.sel));
        Object.entries(tagEl).forEach(([k, t]) => t.classList.toggle('sel', k === state.sel));
        redraw();
      },
      lock(id) { if (id && byId[id]) { api.setProgress(1); } else api.setProgress(0); },
      setPlate(on) { state.plate = !!on; el.classList.toggle('sc-plate', state.plate); if (!state.live || RM) paintStill(); else kick(); },
      setTags(m) { tagMode = m; redraw(); },
      setPaused(on) { setPaused(!!on, 'api'); },
      setFocus(k) { deckFocus = k; kick(); },
      setGain(g) { gain = g; poster.style.opacity = state.live ? '0' : String(g); kick(); },
      refit() { lastW = 0; fit(true); redraw(); },
      setQuality(q) { if (q === quality) return; quality = q; if (renderer) { dprNow = pixelRatio(); sizeGL(); setLOD(phoneQ() ? 'lo' : 'hi'); } api.refit(); },
      replay() { return enter({ now: true }); },
      anchorPos(id) { if (!C || !byId[id]) return null; const a = byId[id]; return a.kind === 'ring' ? C.world(a.p[0]) : C.local(a.p[0]); },
      destroy() {
        state.destroyed = true; cancelAnimationFrame(raf); if (io) io.disconnect(); if (ro) ro.disconnect();
        document.removeEventListener('visibilitychange', onVis); removeEventListener('scroll', wake); removeEventListener('touchstart', wake);
        if (renderer) { vox.forEach(v => v.material.dispose()); if (vox[0]) vox[0].geometry.dispose();
          if (mkPts) { mkPts.geometry.dispose(); mkPts.material.dispose(); }
          if (ves) { ves.geometry.dispose(); ves.material.dispose(); }
          renderer.dispose(); try { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { /* noop */ } }
        el.innerHTML = ''; el.classList.remove('sc-root', 'sc-deck', 'sc-live', 'sc-built', 'sc-building', 'sc-plate', 'sc-locked', 'sc-stacked', 'sc-tags-in');
      },
    };
    return api;
  }

  /* Standalone still: the same projector and colours as the live figure. */
  function poster(canvas, o) {
    const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height, F = Object.assign({ composition: 'side' }, o);
    const cam = o.camera === 'B' ? frameB(W, H, F, null) : frameA(W, H, F);
    return paintPoster(canvas, W, H, o.dpr || 1, cam, { lod: o.lod || 'lo', grid: o.grid !== false, focus: o.camera === 'B' ? [0.032, 1.3, 0.062] : null, focusK: o.camera === 'B' ? 1 : 0 });
  }
  return { mount, poster };
}
