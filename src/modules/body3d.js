/* ==========================================================================
   body3d.js · v5 signature 2 · "Your body, system by system"

   A stipple figure drawn in moss-graphite ink (three r128 points on a depth
   pre-pass, so it reads as a solid engraving that turns in space), with:
     · system hotspots at anatomically plausible anchors, coloured by
       SYSTEMS[i].worst and always paired with a status sentence
     · soft organ glows seen through the ink, and stipple that warms toward a
       hotspot's state colour near it
     · a flowing vessel along the left arm for Blood count (anchored at the
       inner elbow, where blood is drawn)
     · an orbit ring for whole-body systems (inflammation, nutrients,
       electrolytes, and any system without a local anchor)
     · anatomical-plate leader labels on wide stages, a glass tip on narrow
       ones, a Pause motion pill, keyboard control, reduced-motion stills
     · bodyFallbackSVG(): the same figure as a static SVG engraving (poster
       while three.js loads, and the whole stage when WebGL is unavailable)

   Concatenated INSIDE the page IIFE by build.py: no import/export, and the
   only top-level names are mountBody, bodyFallbackSVG, _b3 and _b3make.
   Everything is created lazily on first call, so call order in the IIFE
   doesn't matter. Needs window.THREE (r128 UMD) for WebGL; without it the
   module renders the SVG fallback with the same hotspots and labels.

   API
     const body = mountBody(el, {
       systems: [{ id | system, label, worst, byState, markerIds }],
       reducedMotion,            // default: prefers-reduced-motion
       onSelect(id | null),      // user picked (or cleared) a system
       selected,                 // optional initial selection
       // optional
       mode: 'ink' | 'lume',     // lume = exam-room deck, forest-night
       sex: 'M' | 'F',           // VIEW.patient.sex
       labels: 'auto' | 'plate' | 'tip',  // auto = plate when stage >= 620px wide
       quality: 'desktop' | 'phone' | 'low' | 'tv',
       scale: 1,                 // label type scale (TV ≈ 1.6)
       pauseControl: true,       // render the Pause motion pill
       hotspotTabStops: false,   // the page's system list is the canonical control
       threeReady: Promise,      // show the SVG poster until three.js loads
       forceFallback: false, adaptive: true, ariaLabel,
     });
     body.select(id | null)      // from the page (does not call onSelect)
     body.preview(id | null)     // hover-preview from a list row (turn + highlight)
     body.setPaused(bool)        // external pause (e.g. deck open)
     body.destroy()
   ========================================================================== */

function mountBody(el, opts) { return _b3().mount(el, opts || {}); }
function bodyFallbackSVG(opts) { return _b3().svg(opts || {}); }
function _b3() { return _b3.lib || (_b3.lib = _b3make()); }

function _b3make() {
  'use strict';
  /* ---------------------------------------------------------------- consts */
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const FOV = 28, DIST = 4.85, LOOK_Y = 0.8, PITCH0 = Math.atan2(0.1, 4.7), REST = -25 * DEG;
  const SWAY_AMP = 35 * DEG, SWAY_T = 24, BREATH_T = 5.5, ENTER_MS = 3200, WIPE_MS = 1300, IDLE_MS = 4000;
  const STATES = ['optimal', 'in_range', 'borderline', 'out_of_range'];
  const S_LABEL = { optimal: 'Optimal', in_range: 'In range', borderline: 'Borderline', out_of_range: 'Out of range' };
  const VIZ = { optimal: '#2C4E25', in_range: '#A9A49B', borderline: '#C97B2D', out_of_range: '#B3402F' };
  const TXT = { optimal: '#1A500F', in_range: '#76736D', borderline: '#9A5A1C', out_of_range: '#B3402F' };
  // forest-night marks: in range sits clearly below optimal in luminance (≈4:1 on #1C3118); its text keeps the lighter tone
  const DARK = { optimal: '#A4C29D', in_range: '#8F887C', borderline: '#E0A340', out_of_range: '#E58A7A' };
  const DARK_TXT = { optimal: '#A4C29D', in_range: '#C4BCAE', borderline: '#E0A340', out_of_range: '#E58A7A' };
  const INK = '#3B4A38', SAGE = '#87A482', LUME = '#A4C29D', CREAM = '#FFFCF7', NIGHT = '#1C3118';
  // Point budgets (spec §11). Blue-noise sampling plus the forest-glass form pass hold the figure at these counts;
  // about a third of the stipple goes into the cross-section contour rings, the plate's main engraving line.
  const BUDGET = {
    desktop: { surf: 8800, ring: 3800, floor: 900, organ: 1500, vessel: 160, orbit: 360, dpr: 2 },
    phone: { surf: 3900, ring: 1900, floor: 520, organ: 760, vessel: 140, orbit: 240, dpr: 1.75 },
    low: { surf: 2800, ring: 1300, floor: 380, organ: 520, vessel: 120, orbit: 200, dpr: 1.25 },
    tv: { surf: 13200, ring: 5600, floor: 1300, organ: 2200, vessel: 180, orbit: 480, dpr: 1.5 },
  };
  const ORBIT = { R: 0.34, y: 0.004, tilt: 0, a0: 0, spread: 46 * DEG }; // a plinth ring for whole-body systems; its dots hold still in front of the feet while the figure turns
  const ORGAN_SLOTS = ['thyroid', 'heart', 'liver', 'metabolic', 'kidney', 'urine', 'hormones'];

  /* --------------------------------------------------------------- helpers */
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const hexRGB = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const rgba = (h, a) => { const c = hexRGB(h); return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wrapPi = a => a - TAU * Math.round(a / TAU);
  const needs = s => s === 'borderline' || s === 'out_of_range';
  const LIGHT = norm3([-0.5, 0.62, 0.6]); // key light, view space, upper left
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); }
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5) return Y(t); if (Math.abs(d) < 1e-6) break; t -= e / d; if (t < 0 || t > 1) break; }
      for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; }
      return Y(t);
    };
  }
  const easeEmph = bezier(0.16, 1, 0.3, 1), easeIO = bezier(0.65, 0, 0.35, 1);
  function spring(s, target, w, dt) { // critically damped, implicit Euler
    const f = 1 + 2 * dt * w, oo = w * w, hoo = dt * oo, hhoo = dt * hoo, det = 1 / (f + hhoo);
    const x = (f * s.x + dt * s.v + hhoo * target) * det; s.v = (s.v + hoo * (target - s.x)) * det; s.x = x;
  }
  const settled = (s, t) => Math.abs(s.x - t) < 2e-4 && Math.abs(s.v) < 2e-4;
  const lowEnd = () => (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

  /* Names every state that needs attention, worst first ("1 out of range · 2 borderline"),
     so severity never rides on colour alone. */
  function statusOf(s) {
    const b = s.byState || {};
    if (b.out_of_range || b.borderline) return [b.out_of_range ? `${b.out_of_range} out of range` : '', b.borderline ? `${b.borderline} borderline` : ''].filter(Boolean).join(' · ');
    const present = STATES.filter(k => b[k]);
    if (!present.length) return s.worst ? S_LABEL[s.worst] : '';
    if (present.length === 1) return b[present[0]] === 1 ? S_LABEL[present[0]] : 'All ' + S_LABEL[present[0]].toLowerCase();
    return present.map(k => `${b[k]} ${S_LABEL[k].toLowerCase()}`).join(', ');
  }
  function normSystems(list) {
    return (list || []).map(s => ({ id: s.id || s.system, label: s.label || s.id || s.system, worst: s.worst || null, byState: s.byState || {}, markerIds: s.markerIds || [] })).filter(s => s.id);
  }

  /* ----------------------------------------------------------- the figure */
  // Tube stations: [x, y, z, halfWidth, frontDepth, backDepth, superellipse n].
  // Metres, feet at y 0, the figure faces +z, +x is the figure's left.
  function spec(sex) {
    const S = {
      torso: [
        [0, 1.505, -0.024, 0.078, 0.056, 0.066, 2.1],
        [0, 1.480, -0.018, 0.136, 0.070, 0.080, 2.3],
        [0, 1.450, -0.012, 0.186, 0.086, 0.092, 2.7],
        [0, 1.400, -0.005, 0.184, 0.110, 0.102, 2.6],
        [0, 1.330, 0.000, 0.166, 0.124, 0.106, 2.5],
        [0, 1.250, 0.002, 0.156, 0.118, 0.102, 2.4],
        [0, 1.170, 0.004, 0.146, 0.108, 0.097, 2.3],
        [0, 1.085, 0.005, 0.139, 0.104, 0.094, 2.2],
        [0, 1.000, 0.001, 0.150, 0.104, 0.100, 2.3],
        [0, 0.930, -0.008, 0.166, 0.100, 0.114, 2.4],
        [0, 0.870, -0.010, 0.169, 0.094, 0.118, 2.4],
        [0, 0.820, -0.006, 0.156, 0.084, 0.100, 2.3],
        [0, 0.782, 0.000, 0.090, 0.058, 0.060, 2.1],
      ],
      neck: [[0, 1.605, -0.004, 0.049, 0.052, 0.056, 2], [0, 1.545, -0.007, 0.052, 0.054, 0.058, 2], [0, 1.485, -0.014, 0.062, 0.058, 0.068, 2.1]],
      head: { c: [0, 1.655, 0.012], r: [0.077, 0.112, 0.095], jaw: 0.84 },
      cap: { c: [0.186, 1.417, -0.008], r: [0.06, 0.068, 0.064] },
      arm: [[0.182, 1.44, -0.010, 0.050, 0.052, 0.052, 2], [0.206, 1.345, -0.016, 0.047, 0.050, 0.048, 2], [0.225, 1.24, -0.020, 0.042, 0.046, 0.043, 2],
        [0.245, 1.135, -0.020, 0.036, 0.039, 0.040, 2], [0.259, 1.06, -0.010, 0.038, 0.042, 0.040, 2], [0.272, 0.97, 0.008, 0.031, 0.036, 0.034, 2], [0.283, 0.885, 0.022, 0.022, 0.030, 0.028, 2]],
      hand: { c: [0.292, 0.806, 0.028], r: [0.019, 0.094, 0.045], roll: 0.12, hand: 1 },
      leg: [[0.091, 0.945, -0.004, 0.078, 0.088, 0.096, 2.1], [0.094, 0.80, 0, 0.078, 0.080, 0.086, 2], [0.097, 0.68, 0.006, 0.068, 0.072, 0.072, 2],
        [0.099, 0.57, 0.010, 0.057, 0.060, 0.058, 2], [0.100, 0.50, 0.012, 0.050, 0.053, 0.050, 2], [0.101, 0.44, 0.004, 0.051, 0.052, 0.058, 2],
        [0.102, 0.36, -0.004, 0.052, 0.048, 0.066, 2], [0.103, 0.24, -0.010, 0.041, 0.040, 0.048, 2], [0.105, 0.11, -0.016, 0.030, 0.032, 0.034, 2], [0.106, 0.06, -0.018, 0.031, 0.034, 0.036, 2]],
      foot: { c: [0.112, 0.036, 0.050], r: [0.043, 0.036, 0.118], yaw: 0.12, foot: 1 },
    };
    if (sex === 'F') { // narrower shoulders and waist, fuller hips; neutral, no anatomical detail
      const T = S.torso;
      T[2][3] = 0.170; T[3][3] = 0.170; T[4][3] = 0.158; T[4][4] = 0.132; T[5][3] = 0.146; T[6][3] = 0.132; T[7][3] = 0.124;
      T[8][3] = 0.146; T[9][3] = 0.176; T[9][5] = 0.122; T[10][3] = 0.180; T[10][5] = 0.124; T[11][3] = 0.156;
      S.arm = S.arm.map(s => [s[0] * 0.95, s[1], s[2], s[3] * 0.88, s[4] * 0.88, s[5] * 0.88, s[6]]);
      S.cap = { c: [0.172, 1.417, -0.008], r: [0.05, 0.06, 0.056] };
      S.hand = Object.assign({}, S.hand, { c: [0.281, 0.800, 0.030], r: [0.016, 0.08, 0.039] });
      S.head = { c: [0, 1.652, 0.012], r: [0.074, 0.108, 0.092], jaw: 0.84 };
      S.leg = S.leg.map((s, i) => [s[0] + (i < 3 ? 0.004 : 0), s[1], s[2], s[3] * (i < 3 ? 1.03 : 0.94), s[4] * (i < 3 ? 1.03 : 0.94), s[5] * (i < 3 ? 1.04 : 0.94), s[6]]);
    }
    return S;
  }
  const mirrorSt = st => st.map(s => [-s[0], s[1], s[2], s[3], s[4], s[5], s[6]]);
  const mirrorEll = e => Object.assign({}, e, { c: [-e.c[0], e.c[1], e.c[2]], roll: -(e.roll || 0), yaw: -(e.yaw || 0) });

  function interp(st, u) { // Catmull-Rom through stations, linear extrapolation at the ends
    const n = st.length, f = clamp(u, 0, 1) * (n - 1), i = Math.min(n - 2, Math.floor(f)), t = f - i, t2 = t * t, t3 = t2 * t, out = new Array(7);
    for (let k = 0; k < 7; k++) {
      const p1 = st[i][k], p2 = st[i + 1][k], p0 = i > 0 ? st[i - 1][k] : 2 * p1 - p2, p3 = i + 2 < n ? st[i + 2][k] : 2 * p2 - p1;
      out[k] = 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
    }
    return out;
  }
  function tubeGrid(st, nu, nv) {
    const P = new Float32Array((nu + 1) * nv * 3), C = new Float32Array((nu + 1) * 3);
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, s = interp(st, u), a = interp(st, Math.max(0, u - 0.004)), b = interp(st, Math.min(1, u + 0.004));
      const t = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      const X = norm3([1 - t[0] * t[0], -t[0] * t[1], -t[0] * t[2]]);
      let Z = norm3(cross3(X, t)); if (Z[2] < 0) Z = [-Z[0], -Z[1], -Z[2]];
      C[i * 3] = s[0]; C[i * 3 + 1] = s[1]; C[i * 3 + 2] = s[2];
      const e = 2 / s[6];
      for (let j = 0; j < nv; j++) {
        const th = TAU * j / nv, cs = Math.cos(th), sn = Math.sin(th);
        const px = s[3] * Math.sign(cs) * Math.pow(Math.abs(cs), e), pz = (sn >= 0 ? s[4] : s[5]) * Math.sign(sn) * Math.pow(Math.abs(sn), e), o = (i * nv + j) * 3;
        P[o] = s[0] + X[0] * px + Z[0] * pz; P[o + 1] = s[1] + X[1] * px + Z[1] * pz; P[o + 2] = s[2] + X[2] * px + Z[2] * pz;
      }
    }
    return { P, C, nu, nv, tube: true };
  }
  function ellGrid(e, nu, nv) {
    const P = new Float32Array((nu + 1) * nv * 3), C = new Float32Array((nu + 1) * 3);
    const cr = Math.cos(e.roll || 0), sr = Math.sin(e.roll || 0), cy = Math.cos(e.yaw || 0), sy = Math.sin(e.yaw || 0);
    for (let i = 0; i <= nu; i++) {
      const ph = Math.PI * (0.003 + 0.994 * i / nu), ly = Math.cos(ph), rr = Math.sin(ph);
      C[i * 3] = e.c[0]; C[i * 3 + 1] = e.c[1]; C[i * 3 + 2] = e.c[2];
      for (let j = 0; j < nv; j++) {
        const th = TAU * j / nv, lx = rr * Math.cos(th), lz = rr * Math.sin(th);
        let x = e.r[0] * lx, y = e.r[1] * ly, z = e.r[2] * lz;
        if (e.jaw && ly < 0) x *= 1 - (1 - e.jaw) * Math.min(1, -ly * 1.4);
        if (e.foot) { if (ly < 0) y *= 0.5; y *= 1 - 0.5 * Math.max(0, lz); }
        if (e.hand) z *= 1 - 0.3 * Math.max(0, -ly);
        const x1 = x * cr - y * sr, y1 = x * sr + y * cr, x2 = x1 * cy + z * sy, z2 = -x1 * sy + z * cy, o = (i * nv + j) * 3;
        P[o] = e.c[0] + x2; P[o + 1] = e.c[1] + y1; P[o + 2] = e.c[2] + z2;
      }
    }
    return { P, C, nu, nv, tube: false };
  }
  function addNormals(g) {
    const { P, C, nu, nv } = g, N = new Float32Array(P.length), rowY = new Float32Array(nu + 1);
    const at = (i, j, k) => P[(i * nv + j) * 3 + k];
    for (let i = 0; i <= nu; i++) {
      const ip = Math.min(nu, i + 1), im = Math.max(0, i - 1); let ys = 0;
      for (let j = 0; j < nv; j++) {
        const jp = (j + 1) % nv, jm = (j - 1 + nv) % nv, o = (i * nv + j) * 3;
        const du = [at(ip, j, 0) - at(im, j, 0), at(ip, j, 1) - at(im, j, 1), at(ip, j, 2) - at(im, j, 2)];
        const dv = [at(i, jp, 0) - at(i, jm, 0), at(i, jp, 1) - at(i, jm, 1), at(i, jp, 2) - at(i, jm, 2)];
        const rad = [P[o] - C[i * 3], P[o + 1] - C[i * 3 + 1], P[o + 2] - C[i * 3 + 2]];
        let n = cross3(du, dv); if (Math.hypot(n[0], n[1], n[2]) < 1e-12) n = rad;
        n = norm3(n); if (dot3(n, rad) < 0) n = [-n[0], -n[1], -n[2]];
        N[o] = n[0]; N[o + 1] = n[1]; N[o + 2] = n[2]; ys += P[o + 1];
      }
      rowY[i] = ys / nv;
    }
    g.N = N; g.rowY = rowY; return g;
  }
  function bilinear(g, fi, fj, outP, outN) { // fi in [0, nu], fj in [0, nv) wraps
    const i0 = Math.min(g.nu - 1, Math.max(0, Math.floor(fi))), a = clamp(fi - i0, 0, 1), jf = ((fj % g.nv) + g.nv) % g.nv, j0 = Math.floor(jf), b = jf - j0, j1 = (j0 + 1) % g.nv;
    const w00 = (1 - a) * (1 - b), w10 = a * (1 - b), w01 = (1 - a) * b, w11 = a * b;
    const o00 = (i0 * g.nv + j0) * 3, o10 = ((i0 + 1) * g.nv + j0) * 3, o01 = (i0 * g.nv + j1) * 3, o11 = ((i0 + 1) * g.nv + j1) * 3;
    for (let k = 0; k < 3; k++) {
      outP[k] = w00 * g.P[o00 + k] + w10 * g.P[o10 + k] + w01 * g.P[o01 + k] + w11 * g.P[o11 + k];
      outN[k] = w00 * g.N[o00 + k] + w10 * g.N[o10 + k] + w01 * g.N[o01 + k] + w11 * g.N[o11 + k];
    }
    const l = Math.hypot(outN[0], outN[1], outN[2]) || 1; outN[0] /= l; outN[1] /= l; outN[2] /= l;
  }

  const MC = {};
  function buildModel(sex, q) {
    const key = sex + ':' + q; if (MC[key]) return MC[key];
    const B = BUDGET[q] || BUDGET.desktop, S = spec(sex), r = rng(0x0A1A2026);
    const parts = [
      { name: 'torso', g: tubeGrid(S.torso, 84, 96), rings: 1, w: 1 },
      { name: 'neck', g: tubeGrid(S.neck, 14, 48), rings: 0, w: 1 },
      { name: 'head', g: ellGrid(S.head, 40, 60), rings: 0, w: 1.12 },
      { name: 'capL', g: ellGrid(S.cap, 18, 28), w: 1 }, { name: 'capR', g: ellGrid(mirrorEll(S.cap), 18, 28), w: 1 },
      { name: 'armL', g: tubeGrid(S.arm, 60, 36), rings: 1, w: 1 }, { name: 'armR', g: tubeGrid(mirrorSt(S.arm), 60, 36), rings: 1, w: 1 },
      { name: 'handL', g: ellGrid(S.hand, 24, 28), w: 0.9 }, { name: 'handR', g: ellGrid(mirrorEll(S.hand), 24, 28), w: 0.9 },
      { name: 'legL', g: tubeGrid(S.leg, 72, 40), rings: 1, w: 1 }, { name: 'legR', g: tubeGrid(mirrorSt(S.leg), 72, 40), rings: 1, w: 1 },
      { name: 'footL', g: ellGrid(S.foot, 20, 36), w: 0.9 }, { name: 'footR', g: ellGrid(mirrorEll(S.foot), 20, 36), w: 0.9 },
    ];
    parts.forEach(p => addNormals(p.g));
    const armL = parts[5].g;

    // --- surface samples ∝ area (weighted), jittered along the normal
    let nCells = 0; parts.forEach(p => { nCells += p.g.nu * p.g.nv; });
    const cum = new Float64Array(nCells), cg = new Uint8Array(nCells), ci = new Uint16Array(nCells), cj = new Uint16Array(nCells);
    let tot = 0, k = 0;
    parts.forEach((p, gi) => {
      const g = p.g;
      for (let i = 0; i < g.nu; i++) for (let j = 0; j < g.nv; j++) {
        const o00 = (i * g.nv + j) * 3, o10 = ((i + 1) * g.nv + j) * 3, o01 = (i * g.nv + (j + 1) % g.nv) * 3;
        const a = [g.P[o10] - g.P[o00], g.P[o10 + 1] - g.P[o00 + 1], g.P[o10 + 2] - g.P[o00 + 2]], b = [g.P[o01] - g.P[o00], g.P[o01 + 1] - g.P[o00 + 1], g.P[o01 + 2] - g.P[o00 + 2]];
        const c = cross3(a, b); tot += Math.hypot(c[0], c[1], c[2]) * p.w; cum[k] = tot; cg[k] = gi; ci[k] = i; cj[k] = j; k++;
      }
    });
    // --- contour rings (horizontal cross-sections every 7 cm on torso, arms, legs)
    const loops = []; let ringLen = 0;
    parts.forEach(p => {
      if (!p.rings) return; const g = p.g;
      for (let i = 0; i < g.nu; i++) {
        const y0 = g.rowY[i], y1 = g.rowY[i + 1], lo = Math.min(y0, y1), hi = Math.max(y0, y1);
        for (let kk = Math.ceil((lo - 0.1) / 0.07); 0.1 + kk * 0.07 < hi; kk++) {
          const y = 0.1 + kk * 0.07; if (y < lo || y > 1.47) continue;
          const fi = i + (y - y0) / (y1 - y0 || 1); let len = 0; const pa = [0, 0, 0], pb = [0, 0, 0], tmp = [0, 0, 0];
          for (let j = 0; j < g.nv; j++) { bilinear(g, fi, j, pa, tmp); bilinear(g, fi, j + 1, pb, tmp); len += Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]); }
          loops.push({ g, fi, len }); ringLen += len;
        }
      }
    });
    const nRing = loops.length ? B.ring : 0, nSurf = B.surf, nBody = nRing + nSurf;
    const pos = new Float32Array(nBody * 3), nrm = new Float32Array(nBody * 3), rnd = new Float32Array(nBody * 4);
    const P = [0, 0, 0], N = [0, 0, 0];
    let w = 0;
    const put = (kind) => {
      pos[w * 3] = P[0]; pos[w * 3 + 1] = P[1]; pos[w * 3 + 2] = P[2]; nrm[w * 3] = N[0]; nrm[w * 3 + 1] = N[1]; nrm[w * 3 + 2] = N[2];
      rnd[w * 4] = r(); rnd[w * 4 + 1] = r(); rnd[w * 4 + 2] = r(); rnd[w * 4 + 3] = kind; w++;
    };
    // contour rings: evenly spaced, so each reads as one continuous dotted engraving line
    const spacing = nRing ? ringLen / nRing : 1;
    loops.forEach(L => {
      const n = Math.max(3, Math.round(L.len / spacing));
      for (let m = 0; m < n && w < nRing; m++) { bilinear(L.g, L.fi, (m + 0.5 + (r() - 0.5) * 0.12) / n * L.g.nv, P, N); put(1); }
    });
    while (w < nRing) { bilinear(loops[0].g, loops[0].fi, r() * loops[0].g.nv, P, N); put(1); }
    // surface stipple: blue noise by dart throwing on the surface itself (a 3-D spatial hash rejects any
    // candidate closer than rMin to an accepted dot), so dots never clump or leave holes. Weighted parts
    // (the head) get a proportionally smaller radius.
    {
      const rMin = 0.72 * Math.sqrt(tot / nSurf), cell = rMin * 1.1, hash = new Map(), Q = [0, 0, 0], QN = [0, 0, 0];
      const keyOf = (x, y, z) => ((Math.floor(x / cell) + 512) * 1048576) + ((Math.floor(y / cell) + 512) * 1024) + (Math.floor(z / cell) + 512);
      const near = (x, y, z, rr2) => {
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
          const list = hash.get(((cx + a + 512) * 1048576) + ((cy + b + 512) * 1024) + (cz + c + 512)); if (!list) continue;
          for (let t = 0; t < list.length; t += 3) { const dx = list[t] - x, dy = list[t + 1] - y, dz = list[t + 2] - z; if (dx * dx + dy * dy + dz * dz < rr2) return true; }
        }
        return false;
      };
      const start = w, tries = nSurf * 9, spare = [];
      for (let t = 0; t < tries && w < start + nSurf; t++) {
        const x = r() * tot; let lo = 0, hi = nCells - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < x) lo = mid + 1; else hi = mid; }
        bilinear(parts[cg[lo]].g, ci[lo] + r(), cj[lo] + r(), Q, QN);
        const rr = rMin / Math.sqrt(parts[cg[lo]].w), rr2 = rr * rr;
        if (near(Q[0], Q[1], Q[2], rr2)) { if (spare.length < nSurf * 3) spare.push(Q[0], Q[1], Q[2], QN[0], QN[1], QN[2]); continue; }
        const k2 = keyOf(Q[0], Q[1], Q[2]); let list = hash.get(k2); if (!list) hash.set(k2, list = []); list.push(Q[0], Q[1], Q[2]);
        P[0] = Q[0]; P[1] = Q[1]; P[2] = Q[2]; N[0] = QN[0]; N[1] = QN[1]; N[2] = QN[2];
        put(r() < 0.02 ? 2 : 0);
      }
      for (let t = 0; w < start + nSurf; t += 6) { // rare: top up from rejected candidates
        if (t >= spare.length) { bilinear(parts[0].g, r() * parts[0].g.nu, r() * parts[0].g.nv, P, N); put(0); continue; }
        P[0] = spare[t]; P[1] = spare[t + 1]; P[2] = spare[t + 2]; N[0] = spare[t + 3]; N[1] = spare[t + 4]; N[2] = spare[t + 5]; put(0);
      }
    }

    // --- depth pre-pass mesh (surfaces pulled 6 mm inward); it also carries the forest-glass form pass, so it keeps normals
    let nv = 0, ni = 0; parts.forEach(p => { nv += (p.g.nu + 1) * p.g.nv; ni += p.g.nu * p.g.nv * 6; });
    const dpos = new Float32Array(nv * 3), dnrm = new Float32Array(nv * 3), didx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    parts.forEach(p => {
      const g = p.g, base = vo;
      for (let v = 0; v < (g.nu + 1) * g.nv; v++) { for (let c = 0; c < 3; c++) { dpos[(vo) * 3 + c] = g.P[v * 3 + c] - g.N[v * 3 + c] * 0.006; dnrm[vo * 3 + c] = g.N[v * 3 + c]; } vo++; }
      for (let i = 0; i < g.nu; i++) for (let j = 0; j < g.nv; j++) {
        const a = base + i * g.nv + j, b = base + (i + 1) * g.nv + j, c = base + i * g.nv + (j + 1) % g.nv, d = base + (i + 1) * g.nv + (j + 1) % g.nv;
        didx[io++] = a; didx[io++] = b; didx[io++] = c; didx[io++] = c; didx[io++] = b; didx[io++] = d;
      }
    });

    // --- floor: stippled contact shadow + hairline plinth ring
    const nF = B.floor, fpos = new Float32Array(nF * 3), fa = new Float32Array(nF);
    for (let s = 0; s < nF; s++) {
      let x, z;
      if (true) {
        if (r() < 0.62) { const side = r() < 0.5 ? 1 : -1; x = side * 0.11 + gauss(r) * 0.042; z = 0.045 + gauss(r) * 0.085; }
        else { x = gauss(r) * 0.16; z = 0.02 + gauss(r) * 0.11; }
        fa[s] = Math.exp(-((x / 0.2) ** 2 + ((z - 0.03) / 0.16) ** 2)) * 0.9;
      } else { const th = TAU * (s - nF * 0.8) / (nF * 0.2); x = Math.sin(th) * 0.36; z = Math.cos(th) * 0.36; fa[s] = -1; } // -1 marks ring
      fpos[s * 3] = x; fpos[s * 3 + 1] = 0.001; fpos[s * 3 + 2] = z;
    }
    // --- orbit ring (dotted, tilted)
    const nO = B.orbit, opos = new Float32Array(nO * 3);
    for (let s = 0; s < nO; s++) { const p = orbitPoint(TAU * s / nO); opos[s * 3] = p[0]; opos[s * 3 + 1] = p[1]; opos[s * 3 + 2] = p[2]; }

    // --- organ engravings: points on each organ's shell with its normal, so the shader can draw the outline
    const ORG = organShapes(sex), orgList = [];
    let vol = 0; ORGAN_SLOTS.forEach((id, slot) => (ORG[id] || []).forEach(e => { const v = Math.pow(e[3] * e[4] * e[5], 2 / 3); vol += v; orgList.push({ slot, e, v }); }));
    const oCounts = orgList.map(o => Math.max(60, Math.round(B.organ * o.v / vol)));
    const nOrg = oCounts.reduce((a, b) => a + b, 0), gpos = new Float32Array(nOrg * 3), gnrm = new Float32Array(nOrg * 3), gsys = new Float32Array(nOrg), gr = new Float32Array(nOrg * 2);
    let gw = 0;
    orgList.forEach((o, oi) => {
      const e = o.e, c = Math.cos(e[6] || 0), s = Math.sin(e[6] || 0);
      for (let m = 0; m < oCounts[oi]; m++) {
        let x, y, z, l;
        do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; l = x * x + y * y + z * z; } while (l > 1 || l < 1e-6);
        const L = Math.sqrt(l); x /= L; y /= L; z /= L;
        if (e[7]) y *= 1 - 0.45 * (x + 1) / 2;
        const X = x * e[3], Y = y * e[4], Z = z * e[5], nx = x / e[3], ny = y / e[4], nz = z / e[5], nl = Math.hypot(nx, ny, nz) || 1;
        gpos[gw * 3] = e[0] + X * c - Y * s; gpos[gw * 3 + 1] = e[1] + X * s + Y * c; gpos[gw * 3 + 2] = e[2] + Z;
        gnrm[gw * 3] = (nx * c - ny * s) / nl; gnrm[gw * 3 + 1] = (nx * s + ny * c) / nl; gnrm[gw * 3 + 2] = nz / nl;
        gsys[gw] = o.slot; gr[gw * 2] = r(); gr[gw * 2 + 1] = r(); gw++;
      }
    });

    // --- Blood count: one tapered vein up the medial forearm into the inner elbow (antecubital fossa),
    //     where blood is drawn. A smooth path on the surface, no branches.
    const nVs = B.vessel, vpos = new Float32Array(nVs * 3), vs = new Float32Array(nVs), vj = 0.315 * armL.nv;
    for (let s = 0; s < nVs; s++) {
      const t = s / (nVs - 1), fi = (0.93 - 0.43 * t) * armL.nu, fj = vj - 0.55 * t * t + 0.25 * t;
      bilinear(armL, fi, fj, P, N);
      vpos[s * 3] = P[0] + N[0] * 0.0015; vpos[s * 3 + 1] = P[1] + N[1] * 0.0015; vpos[s * 3 + 2] = P[2] + N[2] * 0.0015; vs[s] = t;
    }
    bilinear(armL, 0.5 * armL.nu, vj - 0.3, P, N);
    const elbow = { p: [P[0] + N[0] * 0.004, P[1] + N[1] * 0.004, P[2] + N[2] * 0.004], n: [N[0], 0, N[2]] };

    return (MC[key] = {
      q, sex, parts,
      body: { pos, nrm, rnd, count: nBody, ring: nRing },
      depth: { pos: dpos, nrm: dnrm, idx: didx },
      floor: { pos: fpos, a: fa, count: nF },
      orbit: { pos: opos, count: nO },
      organs: { pos: gpos, nrm: gnrm, sys: gsys, r: gr, count: nOrg },
      vessel: { pos: vpos, s: vs, count: nVs },
      elbow,
    });
  }
  function orbitPoint(th) {
    const c = Math.cos(th), s = Math.sin(th);
    return [ORBIT.R * s, ORBIT.y - ORBIT.R * c * Math.sin(ORBIT.tilt), ORBIT.R * c * Math.cos(ORBIT.tilt)];
  }
  // Organ ellipsoids: [cx, cy, cz, rx, ry, rz, roll (bottom toward +x), wedge]
  function organShapes(sex) {
    return {
      thyroid: [[0.017, 1.503, 0.037, 0.011, 0.021, 0.009, 0], [-0.017, 1.503, 0.037, 0.011, 0.021, 0.009, 0], [0, 1.496, 0.042, 0.012, 0.006, 0.005, 0]],
      heart: [[0.024, 1.296, 0.048, 0.043, 0.056, 0.039, 0.6]],
      liver: [[-0.05, 1.163, 0.036, 0.098, 0.056, 0.066, 0.12, 1]],
      metabolic: [[0.035, 1.114, 0.02, 0.074, 0.016, 0.018, 0.22]],
      kidney: [[0.071, 1.078, -0.058, 0.026, 0.05, 0.022, 0.2], [-0.071, 1.078, -0.058, 0.026, 0.05, 0.022, -0.2]],
      urine: [[0, 0.956, 0.038, 0.042, 0.036, 0.036, 0]],
      hormones: sex === 'F' ? [[0.072, 0.99, 0.02, 0.018, 0.012, 0.013, 0], [-0.072, 0.99, 0.02, 0.018, 0.012, 0.013, 0]] : [[0, 0.898, 0.03, 0.03, 0.024, 0.026, 0]],
    };
  }
  function localAnchors(M, sex) {
    return {
      thyroid: { pts: [[0, 1.506, 0.047]], n: [0, 0, 1], r: 0.075 },
      heart: { pts: [[0.032, 1.300, 0.062]], n: [0.3, 0, 1], r: 0.12 },
      liver: { pts: [[-0.078, 1.160, 0.062]], n: [-0.45, 0, 1], r: 0.12 },
      metabolic: { pts: [[0.048, 1.116, 0.05]], n: [0.15, 0, 1], r: 0.085 },
      kidney: { pts: [[0.072, 1.082, -0.074], [-0.072, 1.082, -0.074]], n: [0, 0, -1], r: 0.085 },
      urine: { pts: [[0, 0.962, 0.065]], n: [0, 0, 1], r: 0.08 },
      hormones: sex === 'F' ? { pts: [[0.074, 0.992, 0.03], [-0.074, 0.992, 0.03]], n: [0, 0, 1], r: 0.06 } : { pts: [[0, 0.893, 0.058]], n: [0, 0, 1], r: 0.07 },
      blood: { pts: [M.elbow.p], n: M.elbow.n, r: 0.07, vessel: true },
    };
  }
  function anchorsFor(systems, M, sex) {
    const rank = { out_of_range: 0, borderline: 1, in_range: 2, optimal: 3 };
    const L = localAnchors(M, sex), orbit = systems.filter(s => !L[s.id]).sort((a, b) => (rank[a.worst] ?? 4) - (rank[b.worst] ?? 4)); // most urgent takes the front slot
    return systems.map(s => {
      const a = L[s.id];
      if (a) return { sys: s, kind: a.vessel ? 'vessel' : 'organ', pts: a.pts, n: norm3(a.n), r: a.r, organ: ORGAN_SLOTS.indexOf(s.id), status: statusOf(s) };
      const k = orbit.indexOf(s), slot = k === 0 ? 0 : (k % 2 ? -1 : 1) * Math.ceil(k / 2), th = ORBIT.a0 + slot * ORBIT.spread; // most urgent front and centre
      return { sys: s, kind: 'orbit', pts: [orbitPoint(th)], n: [Math.sin(th), 0, Math.cos(th)], r: 0, th, organ: -1, status: statusOf(s) };
    });
  }
  const faceYaw = n => -Math.atan2(n[0], n[2]);

  /* ------------------------------------------------------------ projection */
  // Mirrors the three.js camera exactly so the DOM overlay and the SVG
  // fallback line up with the WebGL figure.
  function projector(W, H, yaw, cam) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), pit = PITCH0 + (cam.pitch || 0);
    const T = [cam.lookX || 0, cam.lookY, 0], E = [T[0], T[1] + cam.dist * Math.sin(pit), cam.dist * Math.cos(pit)];
    const f = norm3(sub3(T, E)), rt = norm3(cross3(f, [0, 1, 0])), up = cross3(rt, f), F = (H / 2) / Math.tan(FOV * DEG / 2);
    const world = p => [cy * p[0] + sy * p[2], p[1], -sy * p[0] + cy * p[2]];
    return {
      E, world,
      pt(p) { const w = world(p), d = sub3(w, E), zv = dot3(d, f); return { x: W / 2 + dot3(d, rt) / zv * F, y: H / 2 - dot3(d, up) / zv * F, z: zv, v: [dot3(d, rt), dot3(d, up), -zv] }; },
      nview(n) { const w = world(n); return [dot3(w, rt), dot3(w, up), -dot3(w, f)]; },
      facing(p, n) { return dot3(world(n), norm3(sub3(E, world(p)))); },
    };
  }
  const ROW_H = 52;
  // The figure fills the stage height. Plate stages keep a band under the plinth for the whole-body label
  // row; narrow stages (bare plinth dots, no row) give almost all of it to the figure.
  function framing(W, H, narrow, s) {
    const band = narrow ? 30 : (ROW_H + 44) * (s || 1), top = 0.035;
    const f = clamp((H - band - top * H) / H, 0.5, narrow ? 0.88 : 0.86), vh = 1.77 / f, dist = vh / (2 * Math.tan(FOV * DEG / 2));
    return { dist, lookY: 1.77 + top * vh - vh / 2 };
  }
  function solveColumn(c, gap, top, bot) { // c sorted by y; returns target y per item with min gap (or the labels' own heights), clamped
    const g = (a, b) => Math.max(gap, ((a.h || 0) + (b.h || 0)) / 2 + 10);
    let prev = null; c.forEach(it => { it.ty = Math.max(it.y, prev ? prev.ty + g(prev, it) : -1e9, top); prev = it; });
    let next = null; for (let i = c.length - 1; i >= 0; i--) { c[i].ty = Math.min(c[i].ty, next ? next.ty - g(c[i], next) : 1e9, bot); next = c[i]; }
  }
  const camDefault = (W, H, narrow, s) => Object.assign({ lookX: 0, pitch: 0 }, framing(W || 600, H || 680, !!narrow, s));

  /* --------------------------------------------------------------- shaders */
  const VS_BODY = `
attribute vec3 aNormal; attribute vec4 aRnd;
uniform float uTime, uPx, uRef, uBreath, uShim, uReveal, uDim, uLume, uAlpha, uZoom, uSzK;
uniform vec3 uInk, uSage, uL, uRimC;
uniform vec3 uHP[12]; uniform vec3 uHC[12]; uniform float uHW[12]; uniform float uHR[12]; uniform float uHS[12];
uniform vec4 uG;
varying vec4 vC; varying float vS; varying float vK;
void main() {
  vec3 p = position;
  float chest = smoothstep(1.0, 1.2, p.y) * (1.0 - smoothstep(1.38, 1.5, p.y)) * (1.0 - smoothstep(0.17, 0.24, abs(p.x)));
  p.xz *= 1.0 + uBreath * chest;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 n = normalize(normalMatrix * aNormal);
  vec3 v = normalize(-mv.xyz);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float rim = pow(1.0 - ndv, 1.5);
  float sil = smoothstep(0.5, 0.88, 1.0 - ndv);
  float lit = max(dot(n, uL), 0.0);
  float kind = aRnd.w;
  bool lume = uLume > 0.5;
  vec3 col = kind > 1.5 ? uSage : uInk;
  float hl = 0.0, near = 0.0;
  for (int i = 0; i < 12; i++) {
    float k = (1.0 - smoothstep(0.0, uHR[i], distance(position, uHP[i]))) * uHW[i];
    col = mix(col, uHC[i], 0.35 * k);
    hl = max(hl, k); near = max(near, k * uHS[i]);
  }
  float a, keep, sz;
  if (lume) {
    // moonlit engraving: cream stipple lit from the upper left, a sage rim only on the silhouette
    col = mix(col, uRimC, 0.85 * sil);
    a = 0.2 + 0.4 * pow(lit, 0.9) + 0.14 * sil;
    keep = max(mix(0.46, 1.0, pow(lit, 0.8)), sil * 1.3);
    sz = mix(1.15, 2.0, aRnd.x * aRnd.x) * mix(0.9, 1.14, lit);
  } else {
    // ink on paper: fewer, lighter dots in the light; bigger, darker ones in shade, like hand stipple
    float shade = 1.0 - lit;
    col = mix(col, uSage, 0.5 * rim * smoothstep(0.15, 0.6, lit));
    a = (0.34 + 0.6 * rim) * (1.0 - 0.55 * lit) + 0.16 * shade * (1.0 - rim);
    keep = max(mix(1.0, 0.42, pow(lit, 0.85)), rim * 1.3);
    sz = mix(1.5, 2.5, aRnd.x) * mix(0.9, 1.16, shade);
  }
  col = mix(col, uG.rgb, uG.a);
  a *= 1.0 - uShim + uShim * (0.5 + 0.5 * sin(uTime * 1.2 + aRnd.z * 6.2832));
  if (kind > 0.5 && kind < 1.5) { a *= lume ? 0.7 : 0.78; a = max(a, lume ? 0.2 : 0.3); sz = lume ? 1.2 : 1.3; keep = 1.0; } // contour rings: the plate's engraving line
  if (kind > 1.5) { a = lume ? 0.04 : 0.06; sz = 9.0; keep = aRnd.y < 0.5 ? 1.0 : 0.0; }
  keep = mix(keep, 1.0, clamp((uZoom - 1.0) * 1.4, 0.0, 0.75)); // zoomed in: bring back culled dots so the form holds
  a *= mix(uDim, 1.0, near);
  a = mix(a, max(a, lume ? 0.5 : 0.6), hl * 0.3);
  a *= (1.0 - smoothstep(uReveal - 0.14, uReveal, p.y)) * uAlpha;
  if (aRnd.y > keep || a < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vC = vec4(0.0); vS = 1.0; vK = 0.0; return; }
  if (kind < 1.5) sz *= uSzK;
  vS = max(sz * uRef / -mv.z / sqrt(max(uZoom, 1.0)), 1.0) * uPx;
  gl_PointSize = vS; vK = kind; vC = vec4(col, a);
  gl_Position = projectionMatrix * mv;
}`;
  // forest-glass form: the depth mesh drawn as a soft volume under the stipple, so the silhouette holds everywhere
  const VS_FORM = `
uniform float uBreath;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
  vec3 p = position;
  float chest = smoothstep(1.0, 1.2, p.y) * (1.0 - smoothstep(1.38, 1.5, p.y)) * (1.0 - smoothstep(0.17, 0.24, abs(p.x)));
  p.xz *= 1.0 + uBreath * chest;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = position.y;
  gl_Position = projectionMatrix * mv;
}`;
  const FS_FORM = `
uniform vec3 uL, uShade, uFill, uRimC, uKey;
uniform float uFillA, uRimA, uKeyA, uReveal, uAlpha, uDim;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
  vec3 n = normalize(vN), v = normalize(vV);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.4);
  float wrap = clamp(dot(n, uL) * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uShade, uFill, pow(wrap, 1.4));
  float a = uFillA * mix(0.55, 1.0, wrap);
  float key = pow(max(dot(n, uL), 0.0), 3.0) * (1.0 - fres);
  col = mix(col, uKey, key * 0.6); a += uKeyA * key;
  col = mix(col, uRimC, fres * 0.9); a += uRimA * fres;
  a *= mix(0.62, 1.0, uDim) * (1.0 - smoothstep(uReveal - 0.14, uReveal, vY)) * uAlpha;
  if (a < 0.002) discard;
  gl_FragColor = vec4(col, a);
}`;
  const FS_DOT = `
varying vec4 vC; varying float vS; varying float vK;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = vK > 1.5 ? exp(-d * d * 3.0) * (1.0 - smoothstep(0.85, 1.0, d)) : 1.0 - smoothstep(1.0 - 2.0 / max(vS, 2.0), 1.0, d);
  a *= vC.a;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vC.rgb, a);
}`;
  const VS_SIMPLE = `
attribute float aA;
uniform float uPx, uRef, uSize, uAlpha, uReveal; uniform vec3 uCol, uCol2;
varying vec4 vC; varying float vS; varying float vK;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float ring = aA < 0.0 ? 1.0 : 0.0;
  float a = (ring > 0.5 ? 0.3 : aA) * uAlpha * (1.0 - smoothstep(uReveal - 0.14, uReveal, position.y));
  vS = max((ring > 0.5 ? 1.2 : uSize) * uRef / -mv.z, 1.0) * uPx; gl_PointSize = a < 0.004 ? 0.0 : vS;
  vC = vec4(ring > 0.5 ? uCol2 : uCol, a); vK = 0.0;
  gl_Position = projectionMatrix * mv;
}`;
  // selected organ: an engraved outline (dense, bright at the silhouette, faint inside), never a glowing blob
  const VS_ORGAN = `
attribute float aSys; attribute vec2 aR; attribute vec3 aN;
uniform float uPx, uRef, uAlpha, uReveal; uniform float uW[8]; uniform vec3 uCol[8];
varying vec4 vC; varying float vS; varying float vK;
void main() {
  float w = 0.0; vec3 c = vec3(0.0);
  for (int i = 0; i < 8; i++) { if (abs(float(i) - aSys) < 0.5) { w = uW[i]; c = uCol[i]; } }
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * aN), v = normalize(-mv.xyz);
  float edge = smoothstep(0.5, 0.92, 1.0 - abs(dot(n, v)));
  float a = w * mix(0.12, 1.0, edge) * (0.55 + 0.45 * aR.x) * uAlpha * (1.0 - smoothstep(uReveal - 0.2, uReveal, position.y));
  vS = max((1.05 + 0.5 * aR.y) * uRef / -mv.z, 1.0) * uPx; gl_PointSize = a < 0.002 ? 0.0 : vS;
  vC = vec4(c, a); vK = 0.0;
  gl_Position = projectionMatrix * mv;
}`;
  // Blood count's vein: hidden at rest, a slow alpha swell (1.6 s) when the system is hovered or selected
  const VS_VESSEL = `
attribute float aS;
uniform float uTime, uPx, uRef, uFlow, uW, uAlpha, uReveal; uniform vec3 uBase, uCol;
varying vec4 vC; varying float vS; varying float vK;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float swell = uFlow > 0.5 ? 0.5 + 0.5 * sin(uTime * 3.927) : 1.0;
  float taper = smoothstep(0.0, 0.16, aS) * mix(0.6, 1.0, aS);
  float a = uW * (0.15 + 0.2 * swell) * taper * uAlpha * (1.0 - smoothstep(uReveal - 0.14, uReveal, position.y));
  vS = max(1.7 * uRef / -mv.z, 1.0) * uPx; gl_PointSize = a < 0.004 ? 0.0 : vS;
  vC = vec4(mix(uBase, uCol, 0.7), a); vK = 0.0;
  gl_Position = projectionMatrix * mv;
}`;

  /* ------------------------------------------------------------------- CSS */
  const NOISE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";
  function injectCSS() {
    if (document.getElementById('b3-css')) return;
    const st = document.createElement('style'); st.id = 'b3-css';
    st.textContent = `
.b3{--b3-s:1;--b3-ring:${CREAM};--b3-ease:cubic-bezier(.16,1,.3,1);--b3-floor-y:91%;position:relative;width:100%;height:100%;min-height:300px;overflow:hidden;isolation:isolate;touch-action:pan-y;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;cursor:grab;font-family:var(--sans,"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif);
  font-feature-settings:"cv05" 1,"cv08" 1,"ss01" 1;letter-spacing:-.011em;color:#252525;border-radius:8px;outline:none}
.b3:focus-visible{box-shadow:inset 0 0 0 2px var(--focus,#519044)}
.b3.b3-is-drag{cursor:grabbing}
.b3.b3-is-static{cursor:default}
.b3 > *{position:absolute}
.b3 *,.b3 *::before,.b3 *::after{box-sizing:border-box}
.b3-bg{inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse 30% 44% at 50% 47%,rgba(135,164,130,.17),rgba(135,164,130,.06) 55%,rgba(135,164,130,0) 78%)}
.b3-floor{inset:0;z-index:0;pointer-events:none;transition:opacity .5s var(--b3-ease);background:radial-gradient(ellipse 22% 5% at 50% var(--b3-floor-y),rgba(62,58,44,.07),rgba(62,58,44,0) 70%)}
.b3.b3-zoom .b3-floor{opacity:0}
.b3-poster,.b3-cv{inset:0;width:100%;height:100%;display:block;z-index:1}
.b3-poster{transition:opacity .6s var(--b3-ease)}
.b3-poster svg{width:100%;height:100%;display:block}
.b3-poster.b3-out{opacity:0}
.b3-grain{inset:0;z-index:2;pointer-events:none;opacity:.05;mix-blend-mode:multiply;background-image:url("${NOISE}");
  -webkit-mask-image:radial-gradient(ellipse 34% 48% at 50% 48%,#000 30%,transparent 100%);mask-image:radial-gradient(ellipse 34% 48% at 50% 48%,#000 30%,transparent 100%)}
.b3-lead{inset:0;width:100%;height:100%;z-index:3;pointer-events:none;overflow:visible}
.b3-lead path{fill:none;stroke:rgba(118,115,109,.42);stroke-width:1;transition:stroke .3s,opacity .35s}
.b3-lead path.b3-bk{stroke-dasharray:2 3}
.b3-lead path.b3-sel{stroke:rgba(37,37,37,.75)}
.b3-lead path.b3-dim{opacity:.3}
.b3-lead circle{fill:rgba(118,115,109,.55);transition:opacity .35s}
.b3-hsl,.b3-labs{inset:0;pointer-events:none}
.b3-hsl{z-index:4}.b3-labs{z-index:5}
.b3-hs{position:absolute;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;padding:0;border:0;background:none;border-radius:50%;pointer-events:auto;cursor:pointer;opacity:0;transition:opacity .5s var(--b3-ease);will-change:transform}
.b3-hs.b3-on{opacity:1}
.b3-hs.b3-dim{opacity:.42}
.b3-hs.b3-hide{opacity:0;pointer-events:none}
.b3-hs > i{position:absolute;left:50%;top:50%;border-radius:50%;pointer-events:none;display:block}
.b3-hs .b3-c{width:10px;height:10px;margin:-5px 0 0 -5px;background:var(--c);box-shadow:0 0 0 2px var(--b3-ring);transition:transform .35s var(--b3-ease),background-color .3s,box-shadow .3s,opacity .3s}
.b3-hs .b3-p{width:16px;height:16px;margin:-8px 0 0 -8px;border:1px solid var(--c);opacity:0}
.b3.b3-motion.b3-amb .b3-hs.b3-attn:not(.b3-away) .b3-p{animation:b3p 2.8s cubic-bezier(.16,1,.3,1) infinite;animation-delay:var(--d,0s)}
@keyframes b3p{0%{transform:scale(1);opacity:.55}100%{transform:scale(2.4);opacity:0}}
.b3-hs .b3-o{width:26px;height:26px;margin:-13px 0 0 -13px;border:1px solid var(--c);opacity:0;transform:scale(.6);transition:opacity .35s,transform .45s var(--b3-ease)}
.b3-hs.b3-sel .b3-o{opacity:.9;transform:scale(1)}
.b3-hs.b3-sel .b3-c,.b3-hs.b3-hov .b3-c{transform:scale(1.25)}
.b3-hs.b3-away .b3-c{opacity:.45;transform:scale(.8)}
.b3-hs.b3-orbit .b3-c{width:8px;height:8px;margin:-4px 0 0 -4px}
.b3.b3-zoom .b3-hs.b3-orbit{opacity:0;pointer-events:none}
.b3-lab{position:absolute;left:0;top:0;padding:4px 0;pointer-events:auto;cursor:pointer;opacity:0;transition:opacity .4s var(--b3-ease);will-change:transform}
.b3-lab.b3-on{opacity:1}
.b3-lab.b3-on.b3-dim{opacity:.36}
.b3-lab.b3-l{text-align:right}
.b3-lab.b3-wb{text-align:center}
.b3-lab b{display:block;font:400 calc(17px*var(--b3-s))/1.15 var(--serif,"Castoro",Georgia,serif);letter-spacing:-.012em;color:#252525;white-space:nowrap}
.b3-lab > span{display:inline-flex;align-items:center;gap:6px;margin-top:calc(4px*var(--b3-s));font:500 calc(12.5px*var(--b3-s))/1.25 var(--sans,Inter,sans-serif);letter-spacing:0;color:#76736D}
.b3-lab > span i{align-self:flex-start;margin-top:calc(4.5px*var(--b3-s))}
.b3-lab.b3-l > span{flex-direction:row}
.b3-lab > span i{width:calc(6px*var(--b3-s));height:calc(6px*var(--b3-s));border-radius:50%;background:var(--c);flex:none}
.b3-lab em{display:none;margin-top:calc(3px*var(--b3-s));font:500 calc(11.5px*var(--b3-s))/1.2 var(--sans,Inter,sans-serif);font-style:normal;letter-spacing:0;color:#76736D;white-space:nowrap}
.b3-lab em svg{width:calc(11px*var(--b3-s));height:calc(11px*var(--b3-s));margin-right:4px;vertical-align:calc(-1.5px*var(--b3-s))}
.b3-lab.b3-back em{display:block}
.b3-lab.b3-wb b{font-size:calc(15.5px*var(--b3-s))}
.b3-lab.b3-wb span{font-size:calc(12px*var(--b3-s))}
.b3-lab.b3-attn > span{color:var(--fg)}
.b3-lab.b3-sel b{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px;text-decoration-color:var(--c)}
.b3-wbh{position:absolute;left:0;top:0;z-index:5;pointer-events:none;opacity:0;transition:opacity .4s var(--b3-ease);font:600 calc(10.5px*var(--b3-s))/1 var(--sans,Inter,sans-serif);letter-spacing:.1em;text-transform:uppercase;color:#76736D;white-space:nowrap}
.b3-wbh.b3-on{opacity:1}
.b3-tip{left:0;top:0;z-index:6;pointer-events:none;padding:10px 14px 11px;border-radius:8px;background:rgba(255,255,255,.96);
  border:1px solid #DDDCDB;opacity:0;transition:opacity .28s var(--b3-ease);white-space:nowrap}
.b3-tip.b3-on{opacity:1}
.b3-tip b{display:block;font:400 16px/1.2 var(--serif,"Castoro",Georgia,serif);letter-spacing:-.01em;color:#252525}
.b3-tip > span{display:flex;align-items:center;gap:6px;margin-top:4px;font:500 12.5px/1.2 var(--sans,Inter,sans-serif);letter-spacing:0;color:#76736D}
.b3-tip > span i{width:6px;height:6px;border-radius:50%;background:var(--c);flex:none}
.b3-tip.b3-attn > span{color:var(--fg)}
.b3-tip.b3-wrap{white-space:normal;padding:10px 13px 11px}
.b3-tip.b3-wrap > span{align-items:flex-start;line-height:1.3}
.b3-tip.b3-wrap > span i{margin-top:4px}
.b3-pause{right:14px;top:14px;z-index:7;display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px 0 12px;border-radius:999px;border:1px solid #DDDCDB;
  background:rgba(255,252,247,.92);font:500 13px/1 var(--sans,Inter,sans-serif);letter-spacing:0;color:#474747;cursor:pointer;
  transition:color .16s,border-color .16s,background-color .16s}
.b3-pause::before{content:"";position:absolute;inset:-5px}
.b3-pause:hover{color:#252525;border-color:#C9C6BF}
.b3-pause:focus-visible{outline:2px solid var(--focus,#519044);outline-offset:3px}
.b3-pause svg{width:12px;height:12px;flex:none}
.b3.b3-narrow .b3-pause{width:34px;padding:0;justify-content:center}
.b3.b3-narrow .b3-pause span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.b3.b3-is-static .b3-pause{display:none}
.b3-sr{width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;margin:0}
.b3.b3-lume{--b3-ring:${NIGHT};color:${CREAM};background:transparent}
.b3.b3-lume .b3-bg{background:radial-gradient(ellipse 30% 44% at 50% 46%,rgba(135,164,130,.16),rgba(135,164,130,.05) 55%,rgba(135,164,130,0) 80%)}
.b3.b3-lume .b3-floor{background:radial-gradient(ellipse 24% 5.5% at 50% var(--b3-floor-y),rgba(255,236,204,.085),rgba(255,236,204,0) 72%)}
.b3.b3-lume .b3-grain{mix-blend-mode:screen;opacity:.04}
.b3.b3-lume .b3-lead path{stroke:rgba(255,252,247,.28)} .b3.b3-lume .b3-lead path.b3-sel{stroke:rgba(255,252,247,.75)} .b3.b3-lume .b3-lead circle{fill:rgba(255,252,247,.42)}
.b3.b3-lume .b3-lab b,.b3.b3-lume .b3-tip b{color:${CREAM}} .b3.b3-lume .b3-lab > span,.b3.b3-lume .b3-tip > span,.b3.b3-lume .b3-lab em,.b3.b3-lume .b3-wbh{color:rgba(255,252,247,.66)}
.b3.b3-lume .b3-lab.b3-attn > span,.b3.b3-lume .b3-tip.b3-attn > span{color:var(--fg)}
.b3.b3-lume .b3-tip,.b3.b3-lume .b3-pause{background:rgba(28,49,24,.94);border-color:rgba(255,252,247,.18);color:rgba(255,252,247,.86)}
.b3.b3-lume .b3-pause:hover{color:${CREAM};border-color:rgba(255,252,247,.34)}
.b3.b3-lume:focus-visible{box-shadow:inset 0 0 0 2px rgba(255,252,247,.8)}
.b3.b3-lume .b3-pause:focus-visible{outline-color:${CREAM}}
@media (prefers-reduced-motion:reduce){.b3 *{animation:none!important}}
`;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------ SVG figure */
  function depthRaster(M, pr, W, H) {
    const s = 0.5, w = Math.ceil(W * s), h = Math.ceil(H * s), Z = new Float32Array(w * h).fill(Infinity);
    const { pos, idx } = M.depth, nv = pos.length / 3, X = new Float32Array(nv), Y = new Float32Array(nv), D = new Float32Array(nv);
    for (let i = 0; i < nv; i++) { const q = pr.pt([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]); X[i] = q.x * s; Y[i] = q.y * s; D[i] = q.z; }
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2], x0 = X[a], y0 = Y[a], x1 = X[b], y1 = Y[b], x2 = X[c], y2 = Y[c];
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0); if (Math.abs(area) < 1e-9) continue;
      const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1, x2)));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1, y2)));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5, w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area, w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * D[a] + w1 * D[b] + w2 * D[c], k = y * w + x; if (z < Z[k]) Z[k] = z;
      }
    }
    return { w, h, s, Z, hidden(q, tol) { const x = Math.floor(q.x * s), y = Math.floor(q.y * s); if (x < 0 || y < 0 || x >= w || y >= h) return false; return q.z > Z[y * w + x] + (tol || 0.012); } };
  }
  function hull(pts) { // Andrew's monotone chain
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function partOutlines(M, pr, k) { // one polygon per part, for the union-outline mask
    const polys = [];
    M.parts.forEach(p => {
      const g = p.g, row = i => { const out = []; for (let j = 0; j < g.nv; j++) { const o = (i * g.nv + j) * 3; out.push(pr.pt([g.P[o], g.P[o + 1], g.P[o + 2]])); } return out; };
      if (!g.tube) { const all = []; for (let i = 0; i <= g.nu; i += 2) row(i).forEach(q => all.push([q.x, q.y])); polys.push(hull(all)); return; }
      const L = [], R = [];
      for (let i = 0; i <= g.nu; i += 2) {
        const im = Math.max(0, i - 2), ip = Math.min(g.nu, i + 2), c0 = pr.pt([g.C[im * 3], g.C[im * 3 + 1], g.C[im * 3 + 2]]), c1 = pr.pt([g.C[ip * 3], g.C[ip * 3 + 1], g.C[ip * 3 + 2]]);
        const c = pr.pt([g.C[i * 3], g.C[i * 3 + 1], g.C[i * 3 + 2]]), dx = c1.x - c0.x, dy = c1.y - c0.y, l = Math.hypot(dx, dy) || 1, px = -dy / l, py = dx / l;
        let mn = Infinity, mx = -Infinity, qa = null, qb = null;
        row(i).forEach(q => { const d = (q.x - c.x) * px + (q.y - c.y) * py; if (d < mn) { mn = d; qa = q; } if (d > mx) { mx = d; qb = q; } });
        L.push([qa.x, qa.y]); R.push([qb.x, qb.y]);
      }
      polys.push(L.concat(R.reverse()));
    });
    return polys.map(poly => 'M' + poly.map(q => (q[0] * k).toFixed(0) + ' ' + (q[1] * k).toFixed(0)).join('L') + 'Z').join('');
  }
  let svgSeq = 0;
  function svgFigure(o) {
    const W = Math.max(200, Math.round(o.width || 600)), H = Math.max(200, Math.round(o.height || 680)), lume = o.mode === 'lume', sex = o.sex === 'F' ? 'F' : 'M';
    const q0 = BUDGET[o.quality] ? o.quality : 'desktop';
    const M = buildModel(sex, q0), cam = o.cam || camDefault(W, H, o.narrow != null ? o.narrow : W < 520, o.scale), pr = projector(W, H, o.yaw == null ? REST : o.yaw, cam), prFix = projector(W, H, 0, cam), zb = depthRaster(M, pr, W, H);
    const K = 2, id = (o.idPrefix || 'b3s') + (++svgSeq), ink = lume ? CREAM : INK, pal = lume ? DARK : VIZ, pTxt = lume ? DARK_TXT : TXT;
    const systems = normSystems(o.systems), A = anchorsFor(systems, M, sex);
    const dotp = (x, y) => `M${Math.round(x * K)} ${Math.round(y * K)}h0`;
    // stipple: the contour rings (every other dot) plus a thinned share of the blue-noise surface
    const AL = lume ? [0.16, 0.26, 0.38, 0.5] : [0.24, 0.44, 0.64, 0.86], bk = [[], [], [], []], B = M.body, n0 = B.ring, n1 = Math.min(B.count, n0 + (o.dots || 2400));
    let rings = '';
    for (let k = 0; k < n0; k += 2) { const q = pr.pt([B.pos[k * 3], B.pos[k * 3 + 1], B.pos[k * 3 + 2]]); if (!zb.hidden(q)) rings += dotp(q.x, q.y); }
    const stride = Math.max(1, Math.floor((B.count - n0) / Math.max(1, n1 - n0)));
    for (let k = n0; k < B.count; k += stride) {
      const p = [B.pos[k * 3], B.pos[k * 3 + 1], B.pos[k * 3 + 2]], q = pr.pt(p);
      if (q.x < -4 || q.y < -4 || q.x > W + 4 || q.y > H + 4 || zb.hidden(q)) continue;
      const nv = pr.nview([B.nrm[k * 3], B.nrm[k * 3 + 1], B.nrm[k * 3 + 2]]), vv = norm3([-q.v[0], -q.v[1], -q.v[2]]);
      const rim = Math.pow(1 - Math.min(1, Math.abs(dot3(nv, vv))), 1.5), lit = Math.max(0, dot3(nv, LIGHT)), kind = B.rnd[k * 4 + 3];
      if (kind > 1.5) continue;
      const keep = lume ? Math.max(0.46 + 0.54 * Math.pow(lit, 0.8), rim * 1.3) : Math.max(1 - 0.58 * Math.pow(lit, 0.8), rim * 1.3); if (B.rnd[k * 4 + 1] > keep) continue;
      const a = lume ? 0.18 + 0.3 * lit + 0.14 * rim : (0.2 + 0.66 * rim) * (1 - 0.45 * lit) * 1.12;
      const t = lume ? (a - 0.18) / 0.45 : a;
      bk[lume ? (t < 0.25 ? 0 : t < 0.5 ? 1 : t < 0.75 ? 2 : 3) : (a < 0.34 ? 0 : a < 0.54 ? 1 : a < 0.74 ? 2 : 3)].push(dotp(q.x, q.y));
    }
    let body = '';
    bk.forEach((b, i) => { if (b.length) body += `<path d="${b.join('')}" stroke="${ink}" stroke-opacity="${AL[i]}" stroke-width="${(1.9 * K).toFixed(1)}"/>`; });
    body += `<path d="${rings}" stroke="${ink}" stroke-opacity="${lume ? 0.3 : 0.4}" stroke-width="${(1.3 * K).toFixed(1)}"/>`;
    // floor: a soft pool of light (lume) or a stippled contact shadow (ink)
    let floor = '';
    for (let k = 0; k < M.floor.count; k += 2) { const a = M.floor.a[k], q = pr.pt([M.floor.pos[k * 3], 0, M.floor.pos[k * 3 + 2]]); if (a > 0.08) floor += dotp(q.x, q.y); }
    // plinth ring (static: the whole-body systems sit on it in front of the feet)
    let orbit = '';
    for (let k = 0; k < M.orbit.count; k += 2) { const q = prFix.pt([M.orbit.pos[k * 3], M.orbit.pos[k * 3 + 1], M.orbit.pos[k * 3 + 2]]); if (!zb.hidden(q, 0.002)) orbit += dotp(q.x, q.y); }
    // hotspots: dot + ring, no halo; a back-facing system shows one dimmed, filled dot
    let hs = '', pulse = '';
    if (o.hotspots !== false) A.forEach((a, i) => {
      const st = a.sys.worst || 'in_range', c = pal[st], P0 = a.kind === 'orbit' ? prFix : pr;
      let shown = 0;
      a.pts.forEach(p => {
        const q = P0.pt(p), vis = a.kind === 'orbit' ? 1 : sstep(-0.15, 0.35, pr.facing(p, a.n)), x = (q.x * K).toFixed(0), y = (q.y * K).toFixed(0);
        if (vis < 0.35) { if (!shown++) hs += `<circle cx="${x}" cy="${y}" r="${4 * K}" fill="${c}" fill-opacity=".45"/>`; return; }
        shown++;
        if (needs(st)) pulse += `<circle class="${id}p" style="animation-delay:${(i * 0.4) % 2.8}s" cx="${x}" cy="${y}" r="${8 * K}" fill="none" stroke="${c}" stroke-width="${K}"/>`;
        hs += `<circle cx="${x}" cy="${y}" r="${5 * K}" fill="${c}" stroke="${lume ? NIGHT : CREAM}" stroke-width="${2 * K}"/>`;
      });
    });
    // optional plate labels (static / print): organ labels in two columns, whole-body systems in a row under the plinth
    let labels = '';
    if (o.labels && o.hotspots !== false && W >= 420) {
      const serif = 'Castoro,Georgia,serif', sans = 'Inter,Arial,sans-serif', inkT = lume ? CREAM : '#252525', mutedT = lume ? 'rgba(255,252,247,.66)' : '#76736D', lead = lume ? 'rgba(255,252,247,.28)' : 'rgba(118,115,109,.42)';
      const colW = Math.min(196, W * 0.27), inset = 22, cols = { l: [], r: [] };
      A.forEach(a => {
        if (a.kind === 'orbit') return;
        let best = null; a.pts.forEach(p => { const q = pr.pt(p); if (!best || Math.abs(q.x - W / 2) > Math.abs(best.x - W / 2)) best = q; });
        cols[best.x < W / 2 ? 'l' : 'r'].push({ a, x: best.x, y: best.y, back: sstep(-0.15, 0.35, pr.facing(a.pts[0], a.n)) < 0.6 });
      });
      ['l', 'r'].forEach(side => {
        const c = cols[side].sort((p, q) => p.y - q.y); solveColumn(c, 56, 46, H - 124);
        const xc = side === 'l' ? Math.min(...c.map(it => it.x)) - 14 : Math.max(...c.map(it => it.x)) + 14;
        c.forEach(it => {
          const st = it.a.sys.worst || 'in_range', endX = side === 'l' ? inset + colW + 10 : W - inset - colW - 10;
          const elX = side === 'l' ? Math.min(endX + 26, xc) : Math.max(endX - 26, xc), tx = side === 'l' ? inset + colW : W - inset - colW, anchor = side === 'l' ? 'end' : 'start';
          const f = v => (v * K).toFixed(0), stc = needs(st) ? pTxt[st] : mutedT, dotX = side === 'l' ? tx - (it.a.status.length * 5.95 + 9) : tx + 3;
          labels += `<path d="M${f(it.x + (side === 'l' ? -8 : 8))} ${f(it.y)}L${f(xc)} ${f(it.y)}L${f(elX)} ${f(it.ty)}L${f(endX)} ${f(it.ty)}" stroke="${lead}" stroke-width="${K}"${it.back ? ` stroke-dasharray="${2 * K} ${3 * K}"` : ''}/><circle cx="${f(endX)}" cy="${f(it.ty)}" r="${1.6 * K}" fill="${lead}"/>`
            + `<text x="${f(tx)}" y="${f(it.ty - 3)}" text-anchor="${anchor}" font-family="${serif}" font-size="${17 * K}" fill="${inkT}" letter-spacing="-.2">${esc(it.a.sys.label)}</text>`
            + `<circle cx="${f(dotX)}" cy="${f(it.ty + 11)}" r="${3 * K}" fill="${pal[st]}"/><text x="${f(side === 'l' ? tx : tx + 12)}" y="${f(it.ty + 15.5)}" text-anchor="${anchor}" font-family="${sans}" font-weight="500" font-size="${12.5 * K}" fill="${stc}">${esc(it.a.status)}</text>`
            + (it.back ? `<text x="${f(side === 'l' ? tx : tx + 12)}" y="${f(it.ty + 31)}" text-anchor="${anchor}" font-family="${sans}" font-weight="500" font-size="${11.5 * K}" fill="${mutedT}">Back of body</text>` : '');
        });
      });
      const orbs = A.filter(a => a.kind === 'orbit').map(a => ({ a, q: prFix.pt(a.pts[0]) })).sort((p, q) => p.q.x - q.q.x);
      if (orbs.length) {
        const n = orbs.length, gw = Math.min(190, (W - 40) / n), y0 = Math.max(...orbs.map(o2 => o2.q.y)) + 30, x0 = W / 2 - gw * n / 2;
        orbs.forEach((it, i) => {
          const f = v => (v * K).toFixed(0), st = it.a.sys.worst || 'in_range', cx = x0 + gw * (i + 0.5), stc = needs(st) ? pTxt[st] : mutedT;
          labels += `<path d="M${f(it.q.x)} ${f(it.q.y + 7)}L${f(cx)} ${f(y0 - 8)}" stroke="${lead}" stroke-width="${K}"/>`
            + `<text x="${f(cx)}" y="${f(y0 + 8)}" text-anchor="middle" font-family="${serif}" font-size="${15.5 * K}" fill="${inkT}">${esc(it.a.sys.label)}</text>`
            + `<text x="${f(cx)}" y="${f(y0 + 25)}" text-anchor="middle" font-family="${sans}" font-weight="500" font-size="${12 * K}" fill="${stc}">${esc(it.a.status)}</text>`;
        });
      }
    }
    const outline = partOutlines(M, pr, K);
    const att = systems.filter(s => needs(s.worst));
    const label = o.ariaLabel || `Illustration of a body with ${systems.length} systems marked.` + (att.length ? ' ' + att.map(s => `${s.label}: ${statusOf(s)}`).join('; ') + '.' : '');
    const glassA = lume ? 0.11 : 0.06, glassC = lume ? '#87A482' : SAGE;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * K} ${H * K}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(label)}" fill="none" stroke-linecap="round">`
      + `<defs><mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W * K}" height="${H * K}"><rect width="${W * K}" height="${H * K}" fill="#fff"/><path d="${outline}" fill="#000"/></mask>`
      + `<linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${glassC}" stop-opacity="${glassA * 1.5}"/><stop offset="1" stop-color="${glassC}" stop-opacity="${glassA * 0.5}"/></linearGradient></defs>`
      + `<style>.${id}p{transform-box:fill-box;transform-origin:center;animation:${id}k 2.8s cubic-bezier(.16,1,.3,1) infinite;opacity:0}@keyframes ${id}k{0%{transform:scale(1);opacity:.55}100%{transform:scale(2.4);opacity:0}}@media (prefers-reduced-motion:reduce){.${id}p{animation:none}}</style>`
      + `<path d="${floor}" stroke="${lume ? '#F3E6CF' : INK}" stroke-opacity="${lume ? 0.14 : 0.2}" stroke-width="${1.6 * K}"/>`
      + `<path d="${outline}" fill="url(#${id}f)"/>`
      + `<path d="${outline}" mask="url(#${id}m)" stroke="${lume ? LUME : INK}" stroke-opacity="${lume ? 0.34 : 0.42}" stroke-width="${1.6 * K}" stroke-linejoin="round"/>`
      + body
      + `<path d="${orbit}" stroke="${lume ? LUME : SAGE}" stroke-opacity=".5" stroke-width="${1.3 * K}"/>`
      + (o.hotspots === false ? '' : `<g>${hs}</g>${pulse}`) + labels
      + `</svg>`;
  }
  function orbitVis(pr, p) { // plinth chips fade only while they pass behind the legs
    const w = pr.world(p);
    return 1 - sstep(-0.02, 0.15, -w[2]) * (1 - sstep(0.12, 0.2, Math.abs(w[0])));
  }

  /* ------------------------------------------------------------------ mount */
  const BACK_GLYPH = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3.2 4.2A3.6 3.6 0 1 1 2.4 7.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M1.6 2.6l1.7 1.8 1.9-1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function mount(el, o) {
    injectCSS();
    const systems = normSystems(o.systems), lume = o.mode === 'lume', sex = o.sex === 'F' ? 'F' : 'M';
    const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduced = o.reducedMotion != null ? !!o.reducedMotion : !!(mq && mq.matches);
    const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const onSelect = typeof o.onSelect === 'function' ? o.onSelect : () => {};
    const scale = o.scale || 1, pal = lume ? DARK : VIZ, pTxt = lume ? DARK_TXT : TXT;
    let paused = !!o.paused, alive = true;
    const motion = () => !reduced && !paused;

    /* DOM */
    const root = document.createElement('div');
    root.className = 'b3' + (lume ? ' b3-lume' : '');
    root.style.setProperty('--b3-s', scale);
    root.tabIndex = 0;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-roledescription', 'interactive figure');
    const nAtt = systems.filter(s => needs(s.worst)).length;
    root.setAttribute('aria-label', o.ariaLabel || `Figure of the body with ${systems.length} systems marked${nAtt ? `, ${nAtt} of them need attention` : ''}. Left and right arrow keys turn it; up and down arrow keys move between systems; Escape clears.`);
    const pauseHTML = reduced || o.pauseControl === false ? '' : `<button type="button" class="b3-pause" aria-pressed="false"><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="2" width="2.2" height="8" rx=".6" fill="currentColor"/><rect x="7.3" y="2" width="2.2" height="8" rx=".6" fill="currentColor"/></svg><span>Pause motion</span></button>`;
    root.innerHTML = `<div class="b3-bg"></div><div class="b3-floor"></div><div class="b3-poster" aria-hidden="true"></div><div class="b3-grain" aria-hidden="true"></div><svg class="b3-lead" aria-hidden="true"></svg><div class="b3-hsl"></div><div class="b3-labs" aria-hidden="true"></div><div class="b3-tip" aria-hidden="true"><b></b><span><i></i><em style="font-style:normal"></em></span></div>${pauseHTML}<p class="b3-sr" aria-live="polite"></p>`;
    el.appendChild(root);
    const $ = s => root.querySelector(s);
    const posterEl = $('.b3-poster'), leadSvg = $('.b3-lead'), hsl = $('.b3-hsl'), labs = $('.b3-labs'), tipEl = $('.b3-tip'), pauseEl = $('.b3-pause'), srEl = $('.b3-sr');
    let W = root.clientWidth || el.clientWidth || 600, H = root.clientHeight;
    if (H < 80) { root.style.height = Math.round(W * 1.05) + 'px'; H = root.clientHeight || Math.round(W * 1.05); }

    const quality = BUDGET[o.quality] ? o.quality : lume && o.quality === 'tv' ? 'tv' : (W < 640 || coarse) ? (lowEnd() ? 'low' : 'phone') : lowEnd() ? 'low' : 'desktop';
    const M = buildModel(sex, quality);
    const A = anchorsFor(systems, M, sex), byId = new Map(A.map(a => [a.sys.id, a]));
    const worstA = A.filter(a => a.kind !== 'orbit').sort((p, q) => (STATES.indexOf(q.sys.worst) - STATES.indexOf(p.sys.worst)))[0] || null;

    /* hotspots, labels, leaders */
    const NS = 'http://www.w3.org/2000/svg';
    A.forEach((a, k) => {
      const s = a.sys, st = s.worst || 'in_range', c = pal[st];
      a.w = needs(st) ? 0.55 : 0.2; a.status = statusOf(s); a.attn = needs(st); a.color = c; a.isBack = a.kind === 'organ' && a.n[2] < -0.5;
      a.els = a.pts.map(() => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'b3-hs' + (a.attn ? ' b3-attn' : '') + (a.kind === 'orbit' ? ' b3-orbit' : '');
        b.style.setProperty('--c', c); b.style.setProperty('--d', ((k * 0.4) % 2.8) + 's');
        b.innerHTML = `<i class="b3-p"></i><i class="b3-o"></i><i class="b3-c"></i>`;
        if (o.hotspotTabStops) { b.setAttribute('aria-label', `${s.label}, ${a.status}`); b.setAttribute('aria-pressed', 'false'); }
        else { b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
        b.dataset.sys = s.id; hsl.appendChild(b); b._x = b._y = -1e4; return b;
      });
      if (o.hotspotTabStops) a.els.slice(1).forEach(b => { b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); });
      const lab = document.createElement('div');
      lab.className = 'b3-lab' + (a.attn ? ' b3-attn' : '') + (a.kind === 'orbit' ? ' b3-wb' : ''); lab.dataset.sys = s.id;
      lab.style.setProperty('--c', c); lab.style.setProperty('--fg', pTxt[st]);
      lab.innerHTML = `<b>${esc(s.label)}</b><span><i></i><span>${a.status.split(' · ').map(t => `<span style="white-space:nowrap">${esc(t)}</span>`).join(' · ')}</span></span>` + (a.isBack ? `<em>${BACK_GLYPH}Back of body</em>` : '');
      labs.appendChild(lab); a.lab = lab; a.labY = null; a.side = null; a.labOn = false; a._t = '';
      a.path = document.createElementNS(NS, 'path'); a.cap = document.createElementNS(NS, 'circle'); a.cap.setAttribute('r', 1.6); a.path.style.opacity = 0; a.cap.style.opacity = 0; a._d = '';
      leadSvg.appendChild(a.path); leadSvg.appendChild(a.cap);
    });

    /* state */
    const plateMode = () => (o.labels === 'plate' ? true : o.labels === 'tip' ? false : W >= 520);
    const narrow = () => !plateMode();
    let base = framing(W, H, narrow(), scale);
    let sel = null, hoverId = null, peek = null, tAnim = 0, entered = false, ent = null, reveal = 3, entP = 1;
    let holdYaw = null, lastUser = -1e9, vel = 0, drag = null, suppressClick = false, inView = true, ratio = 'IntersectionObserver' in window ? 0 : 1;
    let ambient = false; // the idle sway: one 24 s cycle after the entrance or the last interaction, then the loop stops
    const yawS = { x: REST, v: 0 }, distS = { x: base.dist, v: 0 }, lyS = { x: base.lookY, v: 0 }, lxS = { x: 0, v: 0 }, pitS = { x: 0, v: 0 };
    let dim = 1, gTint = 0, gCol = INK, raf = 0, lastT = 0, mode = 'fallback', firstFrame = false;
    const cam = () => ({ dist: distS.x, lookY: lyS.x, lookX: lxS.x, pitch: pitS.x });
    const focusYaw = a => (a.kind === 'orbit' ? REST : faceYaw(a.n));
    function startAmbient() { if (!motion() || mode !== 'webgl') return; if (!ambient) { ambient = true; tAnim = 0; } root.classList.add('b3-amb'); wake(); }

    /* GL */
    let T = null, renderer = null, scene = null, camera = null, fig = null, stat = null, canvas = null, U = null, UOI = null, UV = null, US = null, UF = null, bodyGeo = null, dpr = 1, dprMax = BUDGET[quality].dpr;
    const disposables = [];
    function initGL() {
      T = window.THREE;
      if (!T || o.forceFallback) return false;
      try {
        const test = document.createElement('canvas');
        if (!(test.getContext('webgl2') || test.getContext('webgl'))) return false;
        canvas = document.createElement('canvas'); canvas.className = 'b3-cv'; canvas.setAttribute('aria-hidden', 'true');
        root.insertBefore(canvas, $('.b3-grain'));
        renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'default' });
        renderer.setClearColor(0x000000, 0);
        canvas.addEventListener('webglcontextlost', onLost, false);
        scene = new T.Scene(); camera = new T.PerspectiveCamera(FOV, W / H, 0.05, 30); fig = new T.Group(); stat = new T.Group(); scene.add(fig, stat);
        const geo = attrs => { const g = new T.BufferGeometry(); Object.keys(attrs).forEach(k => g.setAttribute(k, new T.BufferAttribute(attrs[k][0], attrs[k][1]))); disposables.push(g); return g; };
        const mat = (vs, uniforms, extra) => { const m = new T.ShaderMaterial(Object.assign({ uniforms, vertexShader: vs, fragmentShader: FS_DOT, transparent: true, depthWrite: false, depthTest: true, blending: T.NormalBlending }, extra || {})); disposables.push(m); return m; };
        const v3h = h => new T.Vector3(...hexRGB(h));
        // depth pre-pass, then the same mesh as a soft forest-glass volume
        const dg = geo({ position: [M.depth.pos, 3], normal: [M.depth.nrm, 3] }); dg.setIndex(new T.BufferAttribute(M.depth.idx, 1));
        const dm = new T.MeshBasicMaterial({ colorWrite: false, side: T.DoubleSide }); disposables.push(dm);
        const depth = new T.Mesh(dg, dm); depth.renderOrder = 0; fig.add(depth);
        UF = {
          uBreath: { value: 0 }, uL: { value: new T.Vector3(...LIGHT) }, uReveal: { value: 3 }, uAlpha: { value: 1 }, uDim: { value: 1 },
          uShade: { value: v3h(lume ? '#1F351A' : '#DCE3D5') }, uFill: { value: v3h(lume ? '#87A482' : SAGE) }, uRimC: { value: v3h(lume ? LUME : '#2C4E25') }, uKey: { value: v3h('#FFF1DE') },
          uFillA: { value: lume ? 0.1 : 0.06 }, uRimA: { value: lume ? 0.2 : 0.22 }, uKeyA: { value: lume ? 0.07 : 0.1 },
        };
        const fm = new T.ShaderMaterial({ uniforms: UF, vertexShader: VS_FORM, fragmentShader: FS_FORM, transparent: true, depthWrite: false, depthTest: true, side: T.DoubleSide, blending: T.NormalBlending }); disposables.push(fm);
        const form = new T.Mesh(dg, fm); form.renderOrder = 0.5; fig.add(form);
        // body stipple + contour rings
        const v3 = () => Array.from({ length: 12 }, () => new T.Vector3());
        U = {
          uTime: { value: 0 }, uPx: { value: 1 }, uRef: { value: DIST }, uBreath: UF.uBreath, uShim: { value: 0 }, uReveal: UF.uReveal, uDim: UF.uDim, uLume: { value: lume ? 1 : 0 }, uAlpha: { value: 1 },
          uZoom: { value: 1 }, uSzK: { value: quality === 'phone' || quality === 'low' ? 1.22 : 1 },
          uInk: { value: v3h(lume ? CREAM : INK) }, uSage: { value: v3h(lume ? '#D8E6D2' : SAGE) }, uL: UF.uL, uRimC: { value: v3h(LUME) },
          uHP: { value: v3() }, uHC: { value: v3() }, uHW: { value: new Array(12).fill(0) }, uHR: { value: new Array(12).fill(1) }, uHS: { value: new Array(12).fill(0) }, uG: { value: new T.Vector4(0, 0, 0, 0) },
        };
        bodyGeo = geo({ position: [M.body.pos, 3], aNormal: [M.body.nrm, 3], aRnd: [M.body.rnd, 4] });
        const body = new T.Points(bodyGeo, mat(VS_BODY, U)); body.renderOrder = 1; body.frustumCulled = false; fig.add(body);
        // floor pool (lume: warm light; ink: stippled contact shadow) + the plinth ring: static, they don't turn with the figure
        US = { uPx: U.uPx, uRef: U.uRef, uSize: { value: 1.5 }, uAlpha: { value: lume ? 0.22 : 0.34 }, uReveal: U.uReveal, uCol: { value: v3h(lume ? '#F3E6CF' : '#3E3A2C') }, uCol2: { value: v3h(lume ? LUME : SAGE) } };
        const floor = new T.Points(geo({ position: [M.floor.pos, 3], aA: [M.floor.a, 1] }), mat(VS_SIMPLE, US)); floor.renderOrder = 2; floor.frustumCulled = false; stat.add(floor);
        const oa = new Float32Array(M.orbit.count).fill(lume ? 0.42 : 0.55);
        const UR = { uPx: U.uPx, uRef: U.uRef, uSize: { value: 1.3 }, uAlpha: { value: 1 }, uReveal: U.uReveal, uCol: { value: v3h(lume ? LUME : SAGE) }, uCol2: { value: v3h(SAGE) } };
        const ring = new T.Points(geo({ position: [M.orbit.pos, 3], aA: [oa, 1] }), mat(VS_SIMPLE, UR)); ring.renderOrder = 3; ring.frustumCulled = false; stat.add(ring);
        // Blood count's vein (hidden until the system is hovered or selected)
        UV = { uTime: U.uTime, uPx: U.uPx, uRef: U.uRef, uFlow: { value: 0 }, uW: { value: 0 }, uAlpha: { value: 1 }, uReveal: U.uReveal, uBase: { value: v3h(lume ? CREAM : '#6F8C69') }, uCol: { value: v3h(pal.in_range) } };
        const vessel = new T.Points(geo({ position: [M.vessel.pos, 3], aS: [M.vessel.s, 1] }), mat(VS_VESSEL, UV)); vessel.renderOrder = 4; vessel.frustumCulled = false; fig.add(vessel);
        // engraved organ shape, drawn only on hover / selection (no ambient glow: the dot, ring and words carry the state)
        const og = geo({ position: [M.organs.pos, 3], aN: [M.organs.nrm, 3], aSys: [M.organs.sys, 1], aR: [M.organs.r, 2] });
        UOI = { uPx: U.uPx, uRef: U.uRef, uReveal: U.uReveal, uAlpha: { value: lume ? 0.55 : 0.62 }, uW: { value: new Array(8).fill(0) }, uCol: { value: Array.from({ length: 8 }, () => new T.Vector3()) } };
        const organInk = new T.Points(og, mat(VS_ORGAN, UOI, { depthTest: false })); organInk.renderOrder = 6; organInk.frustumCulled = false; fig.add(organInk);
        // static uniforms: hotspot tint slots (half the old reach) and organ colours
        let slot = 0;
        A.forEach(a => {
          if (a.kind === 'orbit') return;
          a.slots = [];
          a.pts.forEach(p => { if (slot >= 12) return; U.uHP.value[slot].set(p[0], p[1], p[2]); U.uHC.value[slot].set(...hexRGB(a.color)); U.uHR.value[slot] = a.r * 0.5; a.slots.push(slot++); });
          if (a.organ >= 0) UOI.uCol.value[a.organ].set(...hexRGB(lume ? a.color : (a.sys.worst === 'in_range' ? '#76736D' : a.color)));
          if (a.kind === 'vessel') UV.uCol.value.set(...hexRGB(lume ? DARK_TXT[a.sys.worst || 'in_range'] : (a.sys.worst === 'in_range' ? '#76736D' : a.color)));
        });
        vessel.visible = A.some(a => a.kind === 'vessel');
        if (!A.some(a => a.kind === 'orbit')) ring.visible = false;
        mode = 'webgl';
        resize(true);
        return true;
      } catch (e) {
        if (window.console) console.warn('body3d: WebGL unavailable, using the SVG figure.', e);
        teardownGL(); return false;
      }
    }
    function teardownGL() {
      disposables.forEach(d => { try { d.dispose(); } catch (e) { /* noop */ } }); disposables.length = 0;
      if (renderer) { try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* noop */ } }
      if (canvas) { canvas.removeEventListener('webglcontextlost', onLost); canvas.remove(); }
      renderer = scene = camera = fig = stat = canvas = U = UOI = UV = US = UF = bodyGeo = null; mode = 'fallback';
    }
    function onLost(e) { e.preventDefault(); if (!alive) return; teardownGL(); toFallback(); }

    /* fallback + poster: drawn from the same quality model the GL path uses, at a poster's dot count */
    let posterSize = '';
    function drawPoster() {
      const key = W + 'x' + H; if (posterSize === key) return; posterSize = key;
      posterEl.innerHTML = svgFigure({ width: W, height: H, mode: o.mode, sex, systems: o.systems, hotspots: false, narrow: narrow(), scale, quality, cam: camDefault(W, H, narrow(), scale), dots: W < 640 ? 1800 : 2400, ariaLabel: '' });
    }
    function toFallback() {
      mode = 'fallback'; root.classList.add('b3-is-static'); posterEl.classList.remove('b3-out'); posterEl.style.transition = 'none';
      yawS.x = REST; distS.x = base.dist; lyS.x = base.lookY; lxS.x = 0; pitS.x = 0; ent = null; entered = true; reveal = 3; entP = 1; ambient = false;
      drawPoster(); wake();
    }

    /* sizing */
    function resize(force) {
      const w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
      if (!force && w === W && h === H) return;
      const wasNarrow = narrow(); W = w; H = h; base = framing(W, H, narrow(), scale);
      if (wasNarrow !== narrow() || reduced || !entered || !sel) { distS.x = base.dist; lyS.x = base.lookY; }
      A.forEach(a => { a.labY = null; a._t = ''; a._d = ''; a.els.forEach(b => { b._x = b._y = -1e4; }); });
      root.classList.toggle('b3-plate', plateMode()); root.classList.toggle('b3-narrow', W < 420);
      if (renderer) {
        dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprMax));
        renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
        camera.aspect = W / H; camera.updateProjectionMatrix(); U.uPx.value = dpr;
      }
      const feet = projector(W, H, REST, camDefault(W, H, narrow(), scale)).pt([0, 0, 0.03]);
      root.style.setProperty('--b3-floor-y', (feet.y / H * 100).toFixed(1) + '%');
      if (mode === 'fallback' || !firstFrame) drawPoster();
      wake();
    }
    let ro = null;
    if ('ResizeObserver' in window) { let t = 0; ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => resize(false), 60); }); ro.observe(root); }
    else window.addEventListener('resize', onWinResize);
    function onWinResize() { resize(false); }

    /* selection */
    function announce(id) { const a = id && byId.get(id); srEl.textContent = a ? `${a.sys.label}: ${a.status}.` : 'No system selected.'; }
    function setSel(id, fromUser) {
      id = id && byId.has(id) ? id : null;
      if (id === sel) return;
      sel = id; holdYaw = null; lastUser = -1e9;
      A.forEach(a => { const on = a.sys.id === sel; a.els.forEach(b => { b.classList.toggle('b3-sel', on); if (o.hotspotTabStops) b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); });
      root.classList.toggle('b3-has-sel', !!sel);
      root.classList.toggle('b3-zoom', !!sel && byId.get(sel).kind !== 'orbit' && mode === 'webgl');
      if (reduced && mode === 'webgl') snapCamera();
      announce(sel);
      if (fromUser) onSelect(sel);
      if (!sel) startAmbient();
      wake();
    }
    function snapCamera() {
      const t = targets(performance.now());
      yawS.x = t.yaw; yawS.v = 0; distS.x = t.dist; distS.v = 0; lyS.x = t.ly; lyS.v = 0; lxS.x = t.lx; lxS.v = 0;
    }
    function setHover(id) { if (id === hoverId) return; hoverId = id; A.forEach(a => a.els.forEach(b => b.classList.toggle('b3-hov', a.sys.id === id))); wake(); }

    /* targets */
    const VH = d => 2 * d * Math.tan(FOV * DEG / 2);
    function targets(now) {
      const a = sel ? byId.get(sel) : null, pk = !a && peek ? byId.get(peek) : null;
      let yaw;
      if (holdYaw != null && now - lastUser < IDLE_MS) yaw = holdYaw;
      else if (a) yaw = focusYaw(a);
      else if (pk) yaw = focusYaw(pk);
      else if (holdYaw != null && !motion()) yaw = holdYaw;
      else { holdYaw = null; yaw = motion() && entered && ambient ? REST + SWAY_AMP * Math.sin(TAU * tAnim / SWAY_T) : REST; }
      const local = a && a.kind !== 'orbit';
      const dist = local ? base.dist * 0.63 : base.dist, vh = VH(dist);
      // zoomed: centre on the system, but never cut off the head
      const ly = local ? Math.max(clamp(a.pts[0][1], 0.75, 1.5), Math.min(1.84 - vh / 2, a.pts[0][1] + vh / 2 - 0.12)) : base.lookY;
      let lx = 0;
      if (local) { const fy = focusYaw(a), p = a.pts[0]; lx = (Math.cos(fy) * p[0] + Math.sin(fy) * p[2]) * 0.55; }
      return { yaw, dist, ly, lx };
    }

    /* motion step: returns 2 while something user-driven moves, 1 while only the idle sway runs, 0 at rest */
    function step(now, dt) {
      let busy = false; const mo = motion();
      if (mo && entered && ambient && !sel && !peek && !drag) {
        tAnim += dt;
        if (tAnim >= SWAY_T) { tAnim = 0; ambient = false; root.classList.remove('b3-amb'); } // one cycle, then rest
      }
      if (!mo && ambient) { ambient = false; tAnim = 0; root.classList.remove('b3-amb'); }
      if (mode === 'webgl') {
        const t = targets(now);
        if (ent) {
          const p = clamp((now - ent.t0) / ENTER_MS, 0, 1), pw = clamp((now - ent.t0) / WIPE_MS, 0, 1);
          yawS.x = REST - TAU * (1 - easeEmph(p)); yawS.v = 0; reveal = -0.15 + 2.1 * easeIO(pw); entP = p;
          if (p >= 1) { ent = null; entered = true; reveal = 3; yawS.x = REST; startAmbient(); }
          busy = true;
        } else if (drag && drag.claimed) busy = true;
        else if (Math.abs(vel) > 1e-4) { yawS.x += vel * dt * 60; vel *= Math.pow(0.9, dt * 60); holdYaw = yawS.x; lastUser = now; busy = true; }
        else {
          yawS.x = t.yaw + wrapPi(yawS.x - t.yaw);
          if (reduced) { yawS.x = t.yaw; yawS.v = 0; }
          else { spring(yawS, t.yaw, sel || peek ? 7 : holdYaw != null ? 9 : 2.4, dt); if (!settled(yawS, t.yaw) && !(ambient && !sel && !peek && holdYaw == null)) busy = true; }
        }
        const pitT = drag && drag.claimed ? pitS.x : now - lastUser < IDLE_MS ? pitS.x : 0;
        const pairs = [[distS, t.dist], [lyS, t.ly], [lxS, t.lx], [pitS, pitT]];
        pairs.forEach(([s, v]) => { if (reduced) { s.x = v; s.v = 0; } else { spring(s, v, 6, dt); if (!settled(s, v)) busy = true; } });
        if (holdYaw != null && now - lastUser < IDLE_MS + 400) busy = true; // wait out the hold, then glide home
        const selA = sel ? byId.get(sel) : null, dimT = !selA ? 1 : selA.kind === 'orbit' ? 0.8 : lume ? 0.62 : 0.4; dim += (dimT - dim) * (1 - Math.exp(-dt * 7)); if (Math.abs(dimT - dim) > 0.002) busy = true;
        const sa = sel ? byId.get(sel) : null, gT = sa && sa.kind === 'orbit' ? 0.28 : 0; gTint += (gT - gTint) * (1 - Math.exp(-dt * 6)); if (sa && sa.kind === 'orbit') gCol = lume ? DARK_TXT[sa.sys.worst || 'in_range'] : sa.color;
        if (Math.abs(gT - gTint) > 0.002) busy = true;
      }
      const focus = hoverId || peek;
      A.forEach(a => {
        const id = a.sys.id, t = sel ? (id === sel ? 1 : 0.05) : focus ? (id === focus ? 0.95 : a.attn ? 0.3 : 0.1) : a.attn ? 0.55 : 0.2;
        a.w += (t - a.w) * (1 - Math.exp(-dt * 7)); if (Math.abs(t - a.w) > 0.003) busy = true;
      });
      if (busy) return 2;
      return mo && mode === 'webgl' && (ambient || (sel && byId.get(sel).kind === 'vessel')) ? 1 : 0;
    }

    /* draw */
    function draw(now) {
      if (mode === 'webgl' && renderer) {
        const mo = motion() && (ambient || !!ent);
        U.uTime.value = mo || (sel && byId.get(sel).kind === 'vessel') ? now / 1000 : 0;
        UF.uBreath.value = mo ? 0.006 * Math.sin(TAU * tAnim / BREATH_T) : 0; U.uShim.value = mo ? 0.08 : 0;
        UF.uReveal.value = reveal; UF.uDim.value = dim;
        U.uZoom.value = Math.max(1, base.dist / Math.max(0.1, distS.x));
        const g = hexRGB(gCol); U.uG.value.set(g[0], g[1], g[2], gTint);
        UOI.uW.value.fill(0);
        A.forEach((a, i) => {
          const pulse = a.attn && mo && !sel ? 0.85 + 0.15 * Math.sin(tAnim * 2.2 + i) : 1, sw = a.w * pulse;
          (a.slots || []).forEach(s => { U.uHW.value[s] = a.kind === 'vessel' ? 0 : sw; U.uHS.value[s] = a.sys.id === sel ? 1 : 0; });
          if (a.organ >= 0) UOI.uW.value[a.organ] = clamp((a.w - 0.6) / 0.4, 0, 1);
          if (a.kind === 'vessel') UV.uW.value = clamp((a.w - 0.45) / 0.5, 0, 1);
        });
        UV.uFlow.value = motion() ? 1 : 0;
        fig.rotation.y = yawS.x;
        const c = cam(), pit = PITCH0 + c.pitch;
        camera.position.set(c.lookX, c.lookY + c.dist * Math.sin(pit), c.dist * Math.cos(pit));
        camera.lookAt(c.lookX, c.lookY, 0);
        renderer.render(scene, camera);
        if (!firstFrame) { firstFrame = true; if (entered || ent || reduced) posterOut(); }
      }
      overlay(now);
    }
    let lastOverlayDt = 0.016;
    function posterOut() { posterEl.classList.add('b3-out'); if (reduced) posterEl.style.transition = 'none'; }

    function setXY(elm, x, y, extra) { // skip sub-pixel moves: no style write, no layout
      if (Math.abs(x - elm._x) < 0.25 && Math.abs(y - elm._y) < 0.25) return;
      elm._x = x; elm._y = y; elm.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)${extra || ''}`;
    }
    function setPath(a, d, op) { if (a._d !== d) { a._d = d; a.path.setAttribute('d', d); } if (a._op !== op) { a._op = op; a.path.style.opacity = op; } }
    function overlay(now) {
      const cm = mode === 'webgl' ? cam() : camDefault(W, H, narrow(), scale);
      const pr = projector(W, H, mode === 'webgl' ? yawS.x : REST, cm), prFix = projector(W, H, 0, cm);
      const plate = plateMode(), items = [], labelsReady = mode !== 'webgl' || !ent || entP > 0.82;
      root.classList.toggle('b3-entering', !labelsReady);
      A.forEach(a => {
        const id = a.sys.id, revealed = reveal > a.pts[0][1] + 0.02, orb = a.kind === 'orbit';
        let vis0 = -1, x0 = 0, y0 = 0, far = -1;
        const qs = a.els.map((b, j) => { const p = a.pts[j], q = (orb ? prFix : pr).pt(p); return { b, q, vis: orb ? 1 : sstep(-0.15, 0.35, pr.facing(p, a.n)) }; });
        qs.forEach((it, j) => { const d = Math.abs(it.q.x - W / 2); if (d > far) { far = d; x0 = it.q.x; y0 = it.q.y; vis0 = it.vis; } });
        const away = vis0 < 0.35;
        qs.forEach((it, j) => {
          const b = it.b, hideTwin = away && a.els.length > 1 && (it.q.x !== x0);
          setXY(b, it.q.x, it.q.y);
          b.classList.toggle('b3-away', it.vis < 0.35);
          b.classList.toggle('b3-hide', hideTwin);
          b.classList.toggle('b3-on', revealed);
          b.classList.toggle('b3-dim', !!sel && sel !== id);
          const z = it.vis < 0.35 ? '1' : id === sel ? '4' : '3'; if (b._z !== z) { b._z = z; b.style.zIndex = z; }
        });
        a.sx = x0; a.sy = y0; a.vis = vis0; a.revealed = revealed; a.away = away;
        const inside = x0 > 6 && x0 < W - 6 && y0 > 6 && y0 < H - 6;
        const facingOK = a.isBack ? true : vis0 > (a.labOn ? 0.4 : 0.6);
        const want = plate && !orb && revealed && labelsReady && inside && facingOK && (!sel || sel === id);
        if (want) items.push({ a, x: x0, y: y0 });
        else if (!orb && a.labOn) { a.labOn = false; a.lab.classList.remove('b3-on'); setPath(a, a._d, 0); a.cap.style.opacity = 0; }
      });
      if (plate) { layoutPlate(items); layoutWholeBody(labelsReady); }
      else A.forEach(a => { if (a.labOn) { a.labOn = false; a.lab.classList.remove('b3-on'); } setPath(a, a._d, 0); a.cap.style.opacity = 0; });
      placeTip(plate);
    }
    function layoutWholeBody(ready) { // plate stages: the plinth systems as a fixed, unboxed row of plate labels under the ring
      const orbs = A.filter(a => a.kind === 'orbit'); if (!orbs.length) return;
      const n = orbs.length, s = scale, gw = Math.min(188 * s, (W - 24) / n), ringY = Math.max(...orbs.map(a => a.sy));
      const y = Math.min(H - ROW_H * s, ringY + 14 * s), x0 = W / 2 - gw * n / 2;
      const zoom = root.classList.contains('b3-zoom');
      orbs.slice().sort((p, q) => p.sx - q.sx).forEach((a, i) => {
        const cx = x0 + gw * (i + 0.5), on = ready && a.revealed && !zoom && (!sel || sel === a.sys.id || byId.get(sel).kind === 'orbit');
        if (!a._w) a._w = gw;
        a.lab.style.width = gw.toFixed(1) + 'px';
        const t = `${(cx - gw / 2).toFixed(1)},${y.toFixed(1)}`; if (a._t !== t) { a._t = t; a.lab.style.transform = `translate3d(${(cx - gw / 2).toFixed(1)}px,${y.toFixed(1)}px,0)`; }
        a.lab.classList.toggle('b3-on', on); a.labOn = on;
        a.lab.classList.toggle('b3-dim', !!sel && sel !== a.sys.id); a.lab.classList.toggle('b3-sel', sel === a.sys.id);
        setPath(a, `M${a.sx.toFixed(1)} ${(a.sy + 7).toFixed(1)}L${cx.toFixed(1)} ${(y - 1).toFixed(1)}`, on ? (sel && sel !== a.sys.id ? 0.3 : 1) : 0);
        a.path.classList.toggle('b3-sel', sel === a.sys.id); a.cap.style.opacity = 0;
      });
    }
    function layoutPlate(items) {
      const s = scale, compact = W < 620, colW = compact ? Math.min(168 * s, W * 0.27) : Math.min(196 * s, W * 0.27), inset = (compact ? 12 : 22) * s, gap = (compact ? 48 : 56) * s;
      const top = (pauseEl ? 58 : 18) * s + gap / 2, bot = H - (ROW_H + 60) * s - gap / 2;
      const cols = { l: [], r: [] };
      items.forEach(it => {
        const a = it.a, back = a.isBack && a.away, key = colW.toFixed(0) + (back ? 'b' : '');
        if (a._hk !== key) { a._hk = key; a.lab.style.width = colW + 'px'; a.lab.classList.toggle('b3-back', back); a._h = a.lab.offsetHeight; }
        it.h = a._h;
        let side = it.a.side;
        if (!side || (side === 'l' && it.x > W / 2 + 36) || (side === 'r' && it.x < W / 2 - 36)) side = it.x < W / 2 ? 'l' : 'r';
        it.a.side = side; cols[side].push(it);
      });
      const k = 1 - Math.exp(-lastOverlayDt * 12);
      ['l', 'r'].forEach(side => {
        const c = cols[side].sort((p, q) => p.y - q.y); solveColumn(c, gap, top, bot);
        // leaders never cross: each runs level to one shared bend beside the figure, then angles to its label
        const xc = side === 'l' ? Math.min(...c.map(it => it.x)) - 14 * s : Math.max(...c.map(it => it.x)) + 14 * s;
        c.forEach(it => {
          const a = it.a;
          a.labY = a.labY == null || !a.labOn || reduced ? it.ty : a.labY + (it.ty - a.labY) * k;
          const lx = side === 'l' ? inset : W - inset - colW;
          a.lab.classList.toggle('b3-l', side === 'l'); a.lab.style.width = colW + 'px';
          const back = a.isBack && a.away; a.lab.classList.toggle('b3-back', back);
          const t = `${lx.toFixed(1)},${a.labY.toFixed(1)}`; if (a._t !== t) { a._t = t; a.lab.style.transform = `translate3d(${lx.toFixed(1)}px,${a.labY.toFixed(1)}px,0) translateY(-50%)`; }
          if (!a.labOn) { a.labOn = true; a.lab.classList.add('b3-on'); }
          a.lab.classList.toggle('b3-dim', !!sel && sel !== a.sys.id); a.lab.classList.toggle('b3-sel', sel === a.sys.id);
          const endX = side === 'l' ? inset + colW + 10 * s : W - inset - colW - 10 * s;
          const elX = side === 'l' ? Math.min(endX + 26 * s, xc) : Math.max(endX - 26 * s, xc);
          const sx = it.x + (side === 'l' ? -8 : 8), ly = back ? a.labY - 8 * s : a.labY;
          setPath(a, `M${sx.toFixed(1)} ${it.y.toFixed(1)}L${xc.toFixed(1)} ${it.y.toFixed(1)}L${elX.toFixed(1)} ${ly.toFixed(1)}L${endX.toFixed(1)} ${ly.toFixed(1)}`, 1);
          a.path.classList.toggle('b3-sel', sel === a.sys.id); a.path.classList.toggle('b3-dim', !!sel && sel !== a.sys.id); a.path.classList.toggle('b3-bk', back);
          a.cap.setAttribute('cx', endX.toFixed(1)); a.cap.setAttribute('cy', ly.toFixed(1)); a.cap.style.opacity = sel && sel !== a.sys.id ? 0.3 : 1;
        });
      });
    }
    let tipId = null, tipW = 0, tipH = 0, tipWrap = null;
    const tipLead = document.createElementNS(NS, 'path'); tipLead.style.opacity = 0; leadSvg.appendChild(tipLead); tipLead._d = '';
    function placeTip(plate) {
      // narrow stages: the selection (or hover), else one resting tag on the system that needs the most attention
      const rest = !plate && !sel && !hoverId && o.restTag !== false && worstA && worstA.attn ? worstA.sys.id : null;
      const id = (o.selTip === false && !plate ? null : sel) || (plate ? null : hoverId) || (sel ? null : rest), a = id ? byId.get(id) : null;
      if (!a || !a.revealed || (a.kind === 'orbit' && plate) || (plate && a.labOn) || root.classList.contains('b3-entering')) { tipEl.classList.remove('b3-on'); tipLead.style.opacity = 0; return; }
      const wrap = !plate, maxW = Math.round(clamp(Math.min(W * 0.44, (a.sx >= W / 2 ? a.sx : W - a.sx) - 40), 132, 210));
      if (tipId !== id || tipWrap !== wrap) {
        tipId = id; tipWrap = wrap; tipEl.querySelector('b').textContent = a.sys.label; tipEl.querySelector('em').innerHTML = a.status.split(' · ').map(t => `<span style="white-space:nowrap">${esc(t)}</span>`).join(' · ');
        tipEl.style.setProperty('--c', a.color); tipEl.style.setProperty('--fg', pTxt[a.sys.worst || 'in_range']); tipEl.classList.toggle('b3-attn', a.attn);
        tipEl.classList.toggle('b3-wrap', wrap); tipEl.style.maxWidth = wrap ? maxW + 'px' : '';
        tipW = tipEl.offsetWidth; tipH = tipEl.offsetHeight; tipEl._x = tipEl._y = -1e4;
      }
      const w = tipW, h = tipH;
      if (!wrap) {
        const x = clamp(a.sx - w / 2, 10, W - w - 10); let y = a.sy - h - 20; if (y < 10) y = a.sy + 20;
        setXY(tipEl, x, y); tipEl.classList.add('b3-on'); tipLead.style.opacity = 0; return;
      }
      // beside the figure, on the far side from the dot, nudged off every other hotspot, with a leader to the dot
      const left = a.sx >= W / 2, x = left ? 12 : W - 12 - w;
      const others = A.filter(b => b !== a && b.revealed && !b.away).map(b => [b.sx, b.sy]);
      const hits = y => others.some(([px, py]) => px > x - 10 && px < x + w + 10 && py > y - 10 && py < y + h + 10);
      let y = clamp(a.sy - h / 2, 10, H - h - 10);
      for (const dy of [0, -44, 44, -88, 88, -132]) { const yy = clamp(a.sy - h / 2 + dy, 10, H - h - 10); if (!hits(yy)) { y = yy; break; } }
      setXY(tipEl, x, y); tipEl.classList.add('b3-on');
      const ex = left ? x + w : x, ey = clamp(a.sy, y + 14, y + h - 14), dx = a.sx + (left ? -9 : 9);
      const d = `M${ex.toFixed(1)} ${ey.toFixed(1)}L${dx.toFixed(1)} ${a.sy.toFixed(1)}`;
      if (tipLead._d !== d) { tipLead._d = d; tipLead.setAttribute('d', d); }
      tipLead.style.opacity = 1;
    }

    /* loop: draws only while something moves; the ambient sway runs at 30 fps and stops after one cycle */
    const ft = [];
    function wake() { if (!raf && alive && inView && !document.hidden) { lastT = 0; raf = requestAnimationFrame(frame); } }
    function frame(ts) {
      raf = 0; if (!alive) return;
      if (lastT && ambient && !drag && !ent && !sel && !peek && !hoverId && Math.abs(vel) < 1e-4 && ts - lastT < 30) { raf = requestAnimationFrame(frame); return; } // idle sway: ~30 fps on any refresh rate
      const dt = lastT ? Math.min(0.05, (ts - lastT) / 1000) : 1 / 60; lastT = ts; lastOverlayDt = dt;
      const busy = step(ts, dt);
      draw(ts);
      if (mode === 'webgl' && o.adaptive !== false && busy === 2 && dt < 0.1) adapt(dt);
      if (busy && (ratio >= 0.5 || busy === 2)) raf = requestAnimationFrame(frame);
      else if (busy === 1) { ambient = false; tAnim = 0; root.classList.remove('b3-amb'); }
    }
    function adapt(dt) {
      ft.push(dt); if (ft.length < 90) return;
      const med = ft.slice().sort((a, b) => a - b)[45]; ft.length = 0;
      if (med <= 0.022) return;
      if (dpr > 1) { dpr = dprMax = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); U.uPx.value = dpr; }
      else if (bodyGeo && bodyGeo.drawRange.count === Infinity) bodyGeo.setDrawRange(0, M.body.ring + Math.floor((M.body.count - M.body.ring) / 2));
    }
    function startEntrance() {
      if (entered || ent || mode !== 'webgl') return;
      if (reduced) { entered = true; reveal = 3; posterOut(); wake(); return; }
      ent = { t0: performance.now() }; reveal = -0.15; posterOut(); wake();
    }

    /* input */
    function nearestSys(t) { const b = t && t.closest && t.closest('[data-sys]'); return b && root.contains(b) ? b.dataset.sys : null; }
    function onDown(e) {
      if (e.target.closest('.b3-pause')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (mode !== 'webgl') return;
      if (e.pointerType !== 'mouse') { const r = root.getBoundingClientRect(); if (e.clientX - r.left < 24 || r.right - e.clientX < 24) return; } // leave edge swipes to the OS (back gesture)
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), claimed: false, touch: e.pointerType !== 'mouse' };
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) { if (e.pointerType === 'mouse' && !drag) setHover(nearestSys(e.target)); return; }
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.claimed) {
        if (Math.hypot(dx, dy) < 6) return;
        if (drag.touch && Math.abs(dx) <= Math.abs(dy)) { drag = null; return; } // vertical: the page scrolls
        drag.claimed = true; vel = 0; if (ent || !entered) { ent = null; entered = true; reveal = 3; posterOut(); }
        try { root.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        root.classList.add('b3-is-drag'); setHover(null);
      }
      const now = performance.now(), mx = e.clientX - drag.x, my = e.clientY - drag.y, ddt = Math.max(1, now - drag.t);
      drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
      yawS.x += mx * 0.008; yawS.v = 0; holdYaw = yawS.x; lastUser = now;
      vel = 0.6 * vel + 0.4 * (mx * 0.008) / (ddt / 16.67);
      if (!drag.touch) { pitS.x = clamp(pitS.x + my * 0.003, -12 * DEG, 12 * DEG); pitS.v = 0; }
      wake();
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.claimed) {
        suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
        root.classList.remove('b3-is-drag');
        if (performance.now() - drag.t > 80 || reduced) vel = 0;
        lastUser = performance.now(); startAmbient();
      }
      drag = null; wake();
    }
    function onClick(e) {
      if (suppressClick) { e.stopPropagation(); return; }
      if (e.target.closest('.b3-pause')) return;
      const id = nearestSys(e.target);
      if (id) setSel(sel === id ? null : id, true);
      else if (sel) setSel(null, true);
    }
    function onLeave() { setHover(null); }
    function onKey(e) {
      if (e.target !== root) return;
      const k = e.key, now = performance.now();
      if ((k === 'ArrowLeft' || k === 'ArrowRight') && mode === 'webgl') {
        const base0 = holdYaw != null ? holdYaw : yawS.x;
        holdYaw = base0 + (k === 'ArrowLeft' ? -15 : 15) * DEG; lastUser = now; if (reduced) yawS.x = holdYaw; e.preventDefault(); wake();
      } else if (k === 'ArrowUp' || k === 'ArrowDown') {
        const i = sel ? A.findIndex(a => a.sys.id === sel) : -1, n = A.length;
        const j = i < 0 ? (k === 'ArrowDown' ? 0 : n - 1) : (i + (k === 'ArrowDown' ? 1 : -1) + n) % n;
        setSel(A[j].sys.id, true); e.preventDefault();
      } else if (k === 'Escape' && sel) { setSel(null, true); e.preventDefault(); }
      else if (k === 'Home' && mode === 'webgl') { holdYaw = null; lastUser = -1e9; pitS.x = 0; e.preventDefault(); wake(); }
    }
    function onPause() {
      paused = !paused;
      pauseEl.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pauseEl.querySelector('span').textContent = paused ? 'Resume motion' : 'Pause motion';
      pauseEl.querySelector('svg').innerHTML = paused ? '<path d="M3.2 1.8v8.4L10 6z" fill="currentColor"/>' : '<rect x="2.5" y="2" width="2.2" height="8" rx=".6" fill="currentColor"/><rect x="7.3" y="2" width="2.2" height="8" rx=".6" fill="currentColor"/>';
      syncMotionClass(); if (!paused) startAmbient(); wake();
    }
    function syncMotionClass() { root.classList.toggle('b3-motion', motion()); }
    function onVis() { if (!document.hidden) wake(); }
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    if (pauseEl) pauseEl.addEventListener('click', onPause);
    document.addEventListener('visibilitychange', onVis);
    syncMotionClass();

    /* visibility: the entrance waits until 60% of the stage is on screen */
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(es => {
        es.forEach(e => { inView = e.isIntersecting; ratio = e.intersectionRatio; });
        if (inView && ratio >= 0.6) startEntrance();
        if (inView) wake();
      }, { rootMargin: '100px 0px', threshold: [0, 0.3, 0.5, 0.6, 0.8] });
      io.observe(root);
    }

    /* boot */
    drawPoster();
    const boot = () => {
      if (!alive) return;
      if (initGL()) { root.classList.remove('b3-is-static'); if (!io || ratio >= 0.6) startEntrance(); wake(); }
      else toFallback();
    };
    if (!window.THREE && o.threeReady && typeof o.threeReady.then === 'function' && !o.forceFallback) {
      root.classList.add('b3-is-static'); entered = true; wake();
      o.threeReady.then(() => { if (alive) { entered = false; boot(); } }, () => { if (alive) toFallback(); });
    } else boot();
    if (o.selected) setSel(o.selected, false);
    announce(null); srEl.textContent = '';

    return {
      select(id) { setSel(id || null, false); },
      enter() { if (mode !== 'webgl' || reduced) return; ent = null; entered = false; startEntrance(); }, // replay the entrance (e.g. on deck slide enter)
      get state() { return { mode, quality, selected: sel, yaw: yawS.x, entering: !!ent, entered, dpr, paused, reduced, ambient, looping: !!raf, points: M.body.count + M.floor.count + M.orbit.count + M.organs.count + M.vessel.count }; },
      preview(id) { const v = id && byId.has(id) ? id : null; if (v !== peek) { peek = v; if (!v) startAmbient(); wake(); } },
      setPaused(v) { if (!!v !== paused) { if (pauseEl) onPause(); else { paused = !!v; syncMotionClass(); if (!paused) startAmbient(); wake(); } } },
      get mode() { return mode; },
      get quality() { return quality; },
      destroy() {
        alive = false; cancelAnimationFrame(raf); raf = 0;
        if (io) io.disconnect(); if (ro) ro.disconnect(); else window.removeEventListener('resize', onWinResize);
        document.removeEventListener('visibilitychange', onVis);
        teardownGL(); root.remove();
      },
    };
  }

  return { mount, svg: svgFigure, buildModel, anchorsFor, statusOf };
}
