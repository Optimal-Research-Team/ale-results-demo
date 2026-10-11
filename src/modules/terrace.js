/* ==========================================================================
   terrace.js: "Your longevity target" as an isometric terrace (pure SVG).

   The same chart as bullseye.js, tilted. The rings are the four states and
   each is a terrace: optimal is the raised centre and every worse state sits
   one step lower. Systems keep their sectors (sized by marker count) and a
   pin's depth inside its terrace is the same closeness the flat chart uses.
   Height says the state a second time; it encodes nothing new, so the picture
   reads the same flat or tilted - and tilt 0 is the flat chart.

   Tilting also turns the plate half a turn, so the ring key (the gap with no
   markers in it) faces the viewer and the state names can be cut into the
   front of each step, where no pin can stand in front of them.

   renderTerrace(el, opts) -> { destroy(), highlight(systemId|null),
     highlightState(state|null), setCompare(), select(markerId|null), play(),
     setFrame(f), setYear(t), setTilt(t, animate) }

   opts: the bullseye's (markers, systems, reducedMotion, onOpen, onFrame,
     ariaLabel) plus material?: 'stone' | 'wood' and tiltIn?: false to skip
     the entrance (flat -> terrace) and start tilted.

   Concatenated inside the page IIFE by build.py: only renderTerrace is
   declared at top level; everything else is local.
   ========================================================================== */
function renderTerrace(el, opts) {
  opts = opts || {};
  const NS = 'http://www.w3.org/2000/svg';
  const ORDER = ['optimal', 'in_range', 'borderline', 'out_of_range'];
  const WORD = { optimal: 'Optimal', in_range: 'In range', borderline: 'Borderline', out_of_range: 'Out of range' };
  const attn = s => s === 'borderline' || s === 'out_of_range';
  const RM = !!opts.reducedMotion;
  const uid = 'tr' + (renderTerrace.seq = (renderTerrace.seq || 0) + 1);
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const f1 = x => Math.round(x * 10) / 10;
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const ease = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const WOOD = opts.material === 'wood';
  /* ry/rx of a circle at full tilt: true isometric is 0.577. Phones look a
     little more from above, so small dots are less squashed and the plate
     fills more of a tall screen */
  let Q = 0.58;

  /* the flat chart's colours; the world stays cream and bone so the four
     states are the only colour on the plate */
  const DOT = { optimal: '#2C4E25', in_range: '#A9A49B', borderline: '#C97B2D', out_of_range: '#B3402F' };
  const FG = { optimal: '#1A500F', in_range: '#76736D', borderline: '#9A5A1C', out_of_range: '#B3402F' };
  /* pins are small spheres: each state's colour, lit from the upper left */
  const mix = (hex, to, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.substr(i, 2), 16) * (1 - k) + to * k).toString(16).padStart(2, '0')).join('');
  const SPHERE = {};
  ORDER.forEach(st => { SPHERE[st] = { hi: mix(DOT[st], 255, st === 'optimal' ? .5 : .55), mid: DOT[st], lo: mix(DOT[st], 0, st === 'in_range' ? .3 : .38) }; });
  SPHERE.hollow = { hi: '#FFFFFF', mid: '#F7F5F0', lo: '#D9D4CA' };
  const PAL = WOOD ? {
    top: { optimal: '#ECEAD6', in_range: '#F5EEDF', borderline: '#F5EBD8', out_of_range: '#F4E6DA' },
    wall: { optimal: '#CDBE9C', in_range: '#D7C5A4', borderline: '#D9C4A0', out_of_range: '#D8C09E' },
    cut: '#D3C2A2', core: '#F2EFDF', grain: 'rgba(150,120,80,.22)', edge: '#8F7C5C', seam: 'rgba(143,124,92,.38)',
    base: '#C9B48F', hatch: 'rgba(110,88,58,.32)', lip: '#E6D9C0',
  } : {
    top: { optimal: '#E4EADC', in_range: '#F4F2EC', borderline: '#F7EEE2', out_of_range: '#F6EAE5' },
    wall: { optimal: '#CAD5C0', in_range: '#E0DBD1', borderline: '#E7D9C5', out_of_range: '#E5D4CD' },
    cut: '#DDD3C3', core: '#D8E2CE', grain: 'rgba(44,78,37,.12)', edge: '#8C877D', seam: 'rgba(118,115,109,.30)',
    base: '#EAE3D6', hatch: 'rgba(118,104,82,.30)', lip: '#F2EEE6',
  };

  if (!document.getElementById('tr-style')) {
    const st = document.createElement('style');
    st.id = 'tr-style';
    st.textContent = `
.tr{position:relative;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.tr-svg{display:block;width:100%;height:auto;overflow:visible;outline:none;touch-action:pan-y}
.tr-svg:focus-visible{outline:2px solid #519044;outline-offset:6px;border-radius:14px}
.tr-pin{cursor:pointer;transition:opacity .25s}
.tr-pin .tr-hl{opacity:0;transition:opacity .15s}
.tr-pin.hot .tr-hl,.tr-pin.act .tr-hl{opacity:1}
.tr-pin.dim{opacity:.16}
.tr-serif{font-family:"Castoro","Iowan Old Style","Palatino Linotype",Georgia,serif}
.tr-tip{position:absolute;left:0;top:0;z-index:3;pointer-events:none;opacity:0;transform:translate(-50%,calc(-100% - 14px));
  transition:opacity .14s;background:#fff;border:1px solid #E7E2D9;border-radius:12px;padding:11px 13px 10px;
  box-shadow:0 10px 30px rgba(37,37,37,.10),0 1px 2px rgba(37,37,37,.06);min-width:168px;max-width:250px;
  font:400 13px/1.35 inherit;color:#252525;text-align:left}
.tr-tip.on{opacity:1}
.tr-tip .s{margin:0 0 4px;font-size:10.5px;line-height:1.3;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#76736D}
.tr-tip .n{margin:0 0 5px;font-size:14px;font-weight:600;line-height:1.25}
.tr-tip .v{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;font-size:15px;font-weight:500;font-variant-numeric:tabular-nums}
.tr-tip .v small{font-size:12px;font-weight:400;color:#76736D;margin-left:3px}
.tr-tip .t{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:#474747}
.tr-tip .t i{width:7px;height:7px;border-radius:50%;flex:none}
.tr-tip .g{margin:9px 0 0;padding-top:8px;border-top:1px solid #EEECE7;font-size:12px;font-weight:500;color:#2C4E25}
.tr-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- data ---------- */
  const markersIn = (opts.markers || []).filter(m => m && ORDER.includes(m.state));
  const EXAMS = markersIn.reduce((n, m) => Math.max(n, (m.series && m.series.length) || 0), 0) || 1;
  const sysIn = (opts.systems || []).slice();
  markersIn.forEach(m => { if (!sysIn.some(s => s.id === m.system)) sysIn.push({ id: m.system, label: m.systemLabel || m.system }); });
  const SYS = sysIn.map(s => ({ id: s.id, label: s.label, markers: markersIn.filter(m => m.system === s.id) })).filter(s => s.markers.length);
  const DOTS = []; SYS.forEach((s, si) => s.markers.forEach((m, j) => DOTS.push({ m, si, j })));
  const N = DOTS.length;
  const COUNT = { optimal: 0, in_range: 0, borderline: 0, out_of_range: 0 }; DOTS.forEach(d => COUNT[d.m.state]++);
  const summary = `${N} markers. ${ORDER.map(s => `${COUNT[s]} ${WORD[s].toLowerCase()}`).join(', ')}.`;

  /* ---------- shell ---------- */
  const prevClass = el.className;
  el.classList.add('tr');
  el.innerHTML = `<svg class="tr-svg" xmlns="${NS}" tabindex="0" role="group" aria-roledescription="target chart"
  aria-label="${H(opts.ariaLabel || 'Your longevity target: every marker on the terrace for its state, grouped by body system')}" aria-describedby="${uid}-d"></svg>
<p class="tr-sr" id="${uid}-d">${H(summary)} Use the arrow keys to move between markers and Enter to open one.</p>
<p class="tr-sr" id="${uid}-live" aria-live="polite"></p>
<div class="tr-tip" aria-hidden="true"></div>`;
  const svg = el.querySelector('svg'), tip = el.querySelector('.tr-tip'), live = el.querySelector(`#${uid}-live`);

  /* ---------- geometry ---------- */
  let W = 0, S = 0, wide = true, cx = 0, DR = 6, Ri = 0, Rf = 0, cyI = 0, cyF = 0, STEP = 0, BASE = 0, PIN = 0;
  let FR = [], keyAng = 24, gapDeg = 1.5, slot = 0, riserFs = 10;
  let t = (RM || opts.tiltIn === false) ? 1 : 0, u = EXAMS - 1;
  let hot = -1, act = -1, hlSys = null, hlState = null, heads = [], tween = 0, played = t === 1;

  const Z = st => STEP * (4 - ORDER.indexOf(st));          // terrace height at full tilt
  const bandOf = st => ORDER.indexOf(st) + 1;              // FR[k]..FR[k+1]
  const dotR = (st, hollow) => (hollow ? DR * .86 : attn(st) ? DR * 1.2 : DR);
  const ringAt = r => { for (let k = 1; k < FR.length - 1; k++) if (r < FR[k + 1]) return ORDER[k - 1]; return ORDER[ORDER.length - 1]; };
  const radial = (st, c, hollow) => {
    const k = bandOf(st), pad = (dotR(st, hollow) + (wide ? 3 : 2.25)) / Ri;
    const lo = FR[k] + pad, hi = FR[k + 1] - pad; if (hi <= lo) return (FR[k] + FR[k + 1]) / 2;
    return lo + (1 - clamp(+c || 0, 0, 1)) * (hi - lo);
  };
  /* a pin crossing a ring edge climbs the step rather than teleporting */
  const zAt = r => {
    const st = ringAt(r), k = bandOf(st);
    let z = Z(st);
    const w = 1.1 * DR / Ri;
    if (k > 1 && Math.abs(r - FR[k]) < w) { const s = (FR[k] + w - r) / (2 * w); z += (Z(ORDER[k - 2]) - z) * s * s * (3 - 2 * s); }
    else if (k < 4 && Math.abs(r - FR[k + 1]) < w) { const s = (r - (FR[k + 1] - w)) / (2 * w); z += (Z(ORDER[k]) - z) * s * s * (3 - 2 * s); }
    return z;
  };

  let measureCtx = null;
  const measure = (str, fs, weight, track) => {
    try {
      if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
      measureCtx.font = `${weight} ${fs}px Inter, system-ui, sans-serif`;
      return measureCtx.measureText(str).width + str.length * fs * track;
    } catch (e) { return str.length * fs * .72; }
  };

  function layout() {
    W = Math.max(280, Math.round(el.clientWidth || 640));
    wide = W >= 520;
    Q = wide ? .58 : .67;
    cx = W / 2;
    DR = clamp(W * .0102, 4.4, 8.4);
    Ri = W / 2 - DR * 2.2 - 6;
    FR = wide ? [0, .2, .43, .68, .87, 1] : [0, .23, .45, .68, .87, 1];
    STEP = Ri * (wide ? .056 : .072);
    BASE = Ri * .05;
    PIN = DR * 2.7;
    const up = Math.max(...ORDER.map((st, k) => FR[k + 2] * Ri * Q + Z(st))) + PIN * 1.15 + DR * 1.3 + 6;
    const down = Ri * 1.035 * Q + BASE + 4;
    S = Math.ceil(up + down + 2);
    cyI = up + 1;
    Rf = Math.min(S / 2, W / 2) - DR * 1.6 - 4; cyF = S / 2;
    /* the ring key: wide enough for each step's name cut into its riser */
    riserFs = clamp(STEP * .46, 8, 11);
    const need = ORDER.map((st, k) => deg((measure(WORD[st].toUpperCase(), riserFs, 600, .12) + (wide ? 22 : 14)) / (FR[k + 2] * Ri)));
    keyAng = clamp(Math.max(...need), 16, 44);
    gapDeg = wide ? 1.5 : 1.8;
    slot = (360 - keyAng - SYS.length * gapDeg) / Math.max(1, N);
    let a = keyAng / 2 + gapDeg / 2;
    SYS.forEach(s => { s.a0 = a; s.a1 = a + s.markers.length * slot; s.b0 = s.a0 - gapDeg / 2; s.b1 = s.a1 + gapDeg / 2; a = s.a1 + gapDeg; });
    DOTS.forEach(d => {
      const m = d.m, s = SYS[d.si], hol = !!m.hollow;
      d.ang = s.a0 + (d.j + .5) * slot;
      d.now = { r: radial(m.state, m.closeness, hol && m.state === 'in_range'), st: m.state };
      d.frames = (m.series && m.series.length > 1) ? m.series.map(f => (f ? { r: radial(f.state, f.closeness, hol && f.state === 'in_range'), st: f.state } : null)) : null;
      if (d.frames && d.frames[d.frames.length - 1]) d.frames[d.frames.length - 1] = d.now;
    });
    svg.setAttribute('viewBox', `0 0 ${W} ${S}`);
    svg.setAttribute('width', W); svg.setAttribute('height', S);
  }

  /* where a marker is at frame u: walking between measured exams, holding its
     last known spot through a year it was not drawn */
  function at(d, uu) {
    const fr = d.frames;
    if (!fr || EXAMS < 2) return d.now;
    const a = Math.floor(uu), b = Math.min(EXAMS - 1, a + 1), k = uu - a;
    const back = j => { for (let q = j; q >= 0; q--) if (fr[q]) return fr[q]; return null; };
    const A = back(a), B = back(b);
    if (A && B) { const r = A.r + (B.r - A.r) * k; return { r, st: ringAt(r) }; }
    return A || B || d.now;
  }

  /* ---------- camera ---------- */
  const cam = () => {
    const k = t;
    return { k, q: 1 - k * (1 - Q), R: Rf + (Ri - Rf) * k, cy: cyF + (cyI - cyF) * k, rot: 180 * k };
  };
  const P = (C, r, a, z) => { const A = rad(a + C.rot); return [cx + r * C.R * Math.sin(A), C.cy - r * C.R * C.q * Math.cos(A) - z * C.k]; };
  const ell = (C, r, z, fill, stroke, sw, extra) =>
    `<ellipse cx="${f1(cx)}" cy="${f1(C.cy - z * C.k)}" rx="${f1(r * C.R)}" ry="${f1(r * C.R * C.q)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra || ''}/>`;
  /* the visible (front) half of a vertical cylinder wall between two heights */
  const wall = (C, r, z0, z1, fill, stroke) => {
    if ((z1 - z0) * C.k < .4) return '';
    const rx = r * C.R, ry = rx * C.q, yb = C.cy - z0 * C.k, yt = C.cy - z1 * C.k, x0 = cx - rx, x1 = cx + rx;
    return `<path d="M${f1(x0)} ${f1(yt)}L${f1(x0)} ${f1(yb)}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(x1)} ${f1(yb)}L${f1(x1)} ${f1(yt)}A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(x0)} ${f1(yt)}Z" fill="${fill}" stroke="${stroke}" stroke-width=".7" stroke-linejoin="round"/>`;
  };
  const hatch = (C, r, z0, z1, step, color) => {
    if ((z1 - z0) * C.k < 2) return '';
    const rx = r * C.R, ry = rx * C.q;
    let p = '';
    for (let x = cx - rx + step; x < cx + rx - 1; x += step) {
      const dy = ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
      p += `M${f1(x)} ${f1(C.cy - z1 * C.k + dy)}V${f1(C.cy - z0 * C.k + dy)}`;
    }
    return `<path d="${p}" stroke="${color}" stroke-width=".6" fill="none"/>`;
  };
  /* ---------- sectors ----------
     The plate is drawn as eleven solid slices, one per system, plus the ring
     key's gap (in front once tilted). A slice can then lift out of its socket
     on hover: its neighbours' cut faces and the plinth show where it was. */
  let lift = SYS.map(() => 0), openSys = -1, liftRaf = 0, liftLast = 0;
  const sectors = () => SYS.map((s, i) => ({ i, b0: s.b0, b1: s.b1, mid: (s.b0 + s.b1) / 2 }))
    .concat([{ i: -1, b0: 360 - keyAng / 2, b1: 360 + keyAng / 2, mid: 360 }]);
  const offOf = (C, x) => {
    const L = x.i >= 0 ? lift[x.i] : 0;
    if (L < .001) return [0, 0, 0];
    const A = rad(x.mid + C.rot), d = C.R * .11 * L;
    return [d * Math.sin(A), -d * C.q * Math.cos(A) - (wide ? 20 : 12) * L * C.k, L];
  };
  const Po = (C, r, a, z, o) => { const q = P(C, r, a, z); return [q[0] + o[0], q[1] + o[1]]; };
  const steps = (a0, a1, by) => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / by)), out = []; for (let j = 0; j <= n; j++) out.push(a0 + (a1 - a0) * j / n); return out; };
  const arcPts = (C, r, a0, a1, z, o) => steps(a0, a1, 2.4).map(a => Po(C, r, a, z, o));
  const facing = (C, a) => Math.cos(rad(a + C.rot)) < 0;
  const pathOf = pts => `M${pts.map(q => `${f1(q[0])} ${f1(q[1])}`).join('L')}Z`;
  const lineOf = pts => `M${pts.map(q => `${f1(q[0])} ${f1(q[1])}`).join('L')}`;
  const sideVisible = (C, a, side) => (side > 0 ? Math.sin(rad(a + C.rot)) > .02 : Math.sin(rad(a + C.rot)) < -.02);
  const PROFILE = () => [[FR[1], 0], [FR[1], Z('optimal')], [FR[2], Z('optimal')], [FR[2], Z('in_range')], [FR[3], Z('in_range')], [FR[3], Z('borderline')],
    [FR[4], Z('borderline')], [FR[4], Z('out_of_range')], [1, Z('out_of_range')], [1, 0]];
  /* a cut through the plate: the stepped profile, with a layer line at each
     step's height so it reads as the inside of the land, not a new wall */
  const cutFace = (C, a, o) => {
    let g = `<path d="${pathOf(PROFILE().map(([r, z]) => Po(C, r, a, z, o)))}" fill="${PAL.cut}" stroke="${PAL.edge}" stroke-width=".7" stroke-linejoin="round"/>`;
    [['out_of_range', FR[4]], ['borderline', FR[3]], ['in_range', FR[2]]].forEach(([st, r1]) => {
      const p0 = Po(C, FR[1], a, Z(st), o), p1 = Po(C, r1, a, Z(st), o);
      g += `<path d="M${f1(p0[0])} ${f1(p0[1])}L${f1(p1[0])} ${f1(p1[1])}" stroke="${PAL.hatch}" stroke-width=".7"/>`;
    });
    return g;
  };

  function drawSector(C, x, o, out, back, front, cuts) {
    const proud = o[2] > .001, seamC = proud ? PAL.edge : PAL.seam;
    for (let k = 3; k >= 0; k--) {
      const st = ORDER[k], rIn = st === 'optimal' ? FR[1] : FR[k + 1], rOut = FR[k + 2];
      const zLo = k === 3 ? 0 : Z(ORDER[k + 1]), zHi = Z(st);
      if ((zHi - zLo) * C.k >= .4) {
        const fa = steps(x.b0, x.b1, 1.2).filter(a => facing(C, a));
        if (fa.length > 1) {
          const top = fa.map(a => Po(C, rOut, a, zHi, o)), bot = fa.map(a => Po(C, rOut, a, zLo, o));
          out.push(`<path d="${pathOf(top.concat(bot.slice().reverse()))}" fill="${PAL.wall[st]}" stroke="${seamC}" stroke-width=".7" stroke-linejoin="round"/>`);
          out.push(`<path d="${lineOf(bot)}" fill="none" stroke="${PAL.edge}" stroke-width=".7"/>`);
          if (WOOD) out.push(`<path d="${fa.filter((_, j) => j % 2).map(a => { const p0 = Po(C, rOut, a, zLo, o), p1 = Po(C, rOut, a, zHi, o); return `M${f1(p0[0])} ${f1(p0[1])}L${f1(p1[0])} ${f1(p1[1])}`; }).join('')}" stroke="${PAL.hatch}" stroke-width=".5"/>`);
        }
      }
      const outer = arcPts(C, rOut, x.b0, x.b1, zHi, o), inner = arcPts(C, rIn, x.b1, x.b0, zHi, o);
      out.push(`<path d="${pathOf(outer.concat(inner))}" fill="${PAL.top[st]}" stroke="${seamC}" stroke-width=".7" stroke-linejoin="round"/>`);
      out.push(`<path d="${lineOf(outer)}" fill="none" stroke="${PAL.edge}" stroke-width=".7"/>`);
      if (WOOD) for (let j = 1; j < 4; j++) out.push(`<path d="${lineOf(arcPts(C, rIn + (rOut - rIn) * j / 4, x.b0, x.b1, zHi, o))}" fill="none" stroke="${PAL.grain}" stroke-width=".7"/>`);
      (back[k] || []).sort(byDepth).forEach(it => out.push(pin(it, C)));
    }
    (cuts || []).forEach(a => out.push(cutFace(C, a, o)));
    front.sort(byDepth).forEach(it => out.push(pin(it, C)));
  }
  const byDepth = (p, q) => p.y - q.y;

  /* ---------- draw ---------- */
  function render() {
    if (!W) return;
    const C = cam(), out = [];
    const isoOn = C.k > .02;
    /* plinth: a cut of soil under the plate, hatched like the engravings */
    if (isoOn) {
      out.push(wall(C, 1.035, -BASE, 0, PAL.base, PAL.edge));
      out.push(hatch(C, 1.035, -BASE, 0, wide ? 4 : 3.4, PAL.hatch));
      out.push(ell(C, 1.035, 0, PAL.lip, PAL.edge, .7));
    }
    const SEC = sectors();
    SEC.forEach(x => { x.o = offOf(C, x); });
    /* the socket a lifted slice leaves: a shaded floor where it stood */
    SEC.forEach(x => {
      if (x.o[2] < .02) return;
      const fl = arcPts(C, 1, x.b0, x.b1, 0, [0, 0, 0]).concat(arcPts(C, FR[1], x.b1, x.b0, 0, [0, 0, 0]));
      out.push(`<path d="${pathOf(fl)}" fill="#2C4E25" opacity="${f1(.1 * x.o[2])}"/>`);
    });
    /* a lifted slice's shadow: its footprint straight below it, on the plinth */
    SEC.forEach(x => {
      if (x.o[2] < .02 || !isoOn) return;
      const up = (wide ? 20 : 12) * x.o[2] * C.k, so = [x.o[0], x.o[1] + up, 0];
      const fp = arcPts(C, 1, x.b0, x.b1, 0, so).concat(arcPts(C, FR[1], x.b1, x.b0, 0, so));
      out.push(`<path d="${pathOf(fp)}" fill="#252525" opacity="${f1(.13 * x.o[2])}"/>`);
    });
    /* pins go with their slice: back-half pins sit with their own terrace (the
       next, higher one is drawn over them), front-half pins on top of the slice */
    const back = SYS.map(() => ORDER.map(() => [])), front = SYS.map(() => []);
    heads = [];
    DOTS.forEach((d, i) => {
      const p = at(d, u), z = zAt(p.r), A = rad(d.ang + C.rot), o = SEC[d.si].o;
      const base = Po(C, p.r, d.ang, z, o);
      const item = { i, st: p.st, x: base[0], y: base[1] };
      if (isoOn && Math.cos(A) > .08) back[d.si][ORDER.indexOf(p.st)].push(item); else front[d.si].push(item);
    });
    /* which cut faces show: a lifted slice's own sides, and the faces of the
       neighbours it lifted away from */
    const cutsOf = SEC.map(() => []);
    SEC.forEach((x, n) => {
      if (x.o[2] < .02 || !isoOn) return;
      if (sideVisible(C, x.b0, -1)) cutsOf[n].push(x.b0);
      if (sideVisible(C, x.b1, 1)) cutsOf[n].push(x.b1);
      const prev = SEC[(n - 1 + SEC.length) % SEC.length], next = SEC[(n + 1) % SEC.length];
      if (sideVisible(C, x.b0, 1)) cutsOf[(n - 1 + SEC.length) % SEC.length].push(prev.b1);
      if (sideVisible(C, x.b1, -1)) cutsOf[(n + 1) % SEC.length].push(next.b0);
    });
    const order = SEC.map((x, n) => ({ x, n, y: Po(C, .62, x.mid, 0, x.o)[1] + (x.o[2] > .02 ? 4000 * x.o[2] * (Po(C, .62, x.mid, 0, x.o)[1] > C.cy ? 1 : 0) : 0) }))
      .sort((p, q) => p.y - q.y);
    let coreDone = false;
    const core = () => {
      const zc = Z('optimal');
      out.push(wall(C, FR[1], 0, zc, PAL.wall.optimal, PAL.edge));
      out.push(ell(C, FR[1], zc, PAL.core, 'rgba(44,78,37,.22)', .8));
      out.push(ell(C, FR[1] * .78, zc, 'none', 'rgba(44,78,37,.16)', .8));
      const lit = DOTS.reduce((n, d) => n + (at(d, u).st === 'optimal' ? 1 : 0), 0);
      const ry = FR[1] * C.R * C.q, yc = C.cy - zc * C.k;
      const nFs = clamp(ry * (wide ? .7 : .62), 15, 46), denFs = nFs * .36, subFs = clamp(nFs * .26, 8, 10.5);
      out.push(`<g aria-hidden="true"><text class="tr-serif" x="${f1(cx)}" y="${f1(yc + nFs * .2)}" text-anchor="middle" font-size="${f1(nFs)}" fill="#1A500F" letter-spacing="-.02em">${lit}<tspan font-size="${f1(denFs)}" fill="#2C4E25" dx="${f1(denFs * .22)}">of ${N}</tspan></text>`
        + `<text x="${f1(cx)}" y="${f1(yc + nFs * .2 + subFs * 1.75)}" text-anchor="middle" font-size="${f1(subFs)}" font-weight="600" letter-spacing=".12em" fill="#2C4E25">AT TARGET</text></g>`);
    };
    order.forEach(({ x, n }) => {
      if (!coreDone && Po(C, .62, x.mid, 0, [0, 0, 0])[1] > C.cy) { core(); coreDone = true; }
      drawSector(C, x, x.o, out, x.i >= 0 ? back[x.i] : [], x.i >= 0 ? front[x.i] : [], cutsOf[n]);
      /* each step's name, cut into the riser that faces us, inside the ring key */
      if (x.i < 0 && C.k > .82) {
        const fade = clamp((C.k - .82) / .16, 0, 1);
        for (let k = 3; k >= 0; k--) {
          const st = ORDER[k], rOut = FR[k + 2], zLo = k === 3 ? 0 : Z(ORDER[k + 1]), zHi = Z(st);
          if ((zHi - zLo) * C.k <= riserFs * 1.05) continue;
          const zb = zLo + (zHi - zLo) / 2 - riserFs * .36 / C.k, rx = rOut * C.R, ry = rx * C.q, yc = C.cy - zb * C.k, th = rad(64);
          const id = `${uid}-rs-${k}`;
          out.push(`<path id="${id}" d="M${f1(cx - rx * Math.sin(th))} ${f1(yc + ry * Math.cos(th))}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(cx + rx * Math.sin(th))} ${f1(yc + ry * Math.cos(th))}" fill="none"/>`
            + `<text font-size="${f1(riserFs)}" font-weight="600" letter-spacing=".12em" fill="${FG[st]}" opacity="${f1(fade * .92)}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${H(WORD[st].toUpperCase())}</textPath></text>`);
        }
      }
    });
    if (!coreDone) core();
    /* every system's name at rest, quiet: above the rim behind, below the plinth
       in front, on the outer ring at the sides (where the rim meets the frame).
       Desktop and TV only: a phone names a system when it is tapped. */
    if (wide && C.k > .82) {
      const anyOpen = SEC.some(x => x.i >= 0 && x.o[2] > .02);
      SEC.forEach(x => {
        if (x.i < 0) return;
        const A = rad(x.mid + C.rot), cA = Math.cos(A);
        let p, dy;
        if (cA > .5) { p = Po(C, 1, x.mid, Z('out_of_range'), x.o); dy = -10; }
        else if (cA < -.5) { p = Po(C, 1.035, x.mid, -BASE, x.o); dy = 15; }
        else { p = Po(C, .935, x.mid, Z('out_of_range'), x.o); dy = 4; }
        const op = x.o[2] > .02 ? 0 : anyOpen ? .3 : .68 * clamp((C.k - .82) / .16, 0, 1);
        if (op < .01) return;
        out.push(`<text class="tr-rest" x="${f1(p[0])}" y="${f1(p[1] + dy)}" text-anchor="middle" font-size="11" font-weight="500" fill="#76736D" opacity="${f1(op)}" paint-order="stroke" stroke="#FFFCF7" stroke-width="3" stroke-linejoin="round" aria-hidden="true">${H(SYS[x.i].label)}</text>`);
      });
    }
    /* the lifted system names itself in full, with its counts */
    SEC.forEach(x => {
      if (x.i < 0 || x.o[2] < .02) return;
      const sy = SYS[x.i], by = { optimal: 0, in_range: 0, borderline: 0, out_of_range: 0 };
      DOTS.forEach(d => { if (d.si === x.i) by[at(d, u).st]++; });
      const parts = ['out_of_range', 'borderline', 'in_range', 'optimal'].filter(st => by[st]).map(st => `${by[st]} ${st === 'out_of_range' ? 'out' : WORD[st].toLowerCase()}`);
      const A = rad(x.mid + C.rot), lp = Po(C, 1.1, x.mid, Z('out_of_range'), x.o);
      const sx = Math.sin(A), anchor = Math.abs(sx) < .35 ? 'middle' : sx > 0 ? 'start' : 'end';
      const ly = lp[1] + (Math.cos(A) < 0 ? 16 : -10);
      const lx = clamp(lp[0] + (anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0), 6, W - 6);
      const halo = 'paint-order="stroke" stroke="#FFFCF7" stroke-width="4" stroke-linejoin="round"';
      out.push(`<g class="tr-lab" opacity="${f1(clamp((x.o[2] - .15) / .6, 0, 1))}" aria-hidden="true">`
        + `<text x="${f1(lx)}" y="${f1(ly)}" text-anchor="${anchor}" font-size="${wide ? 14 : 12.5}" font-weight="600" fill="#252525" ${halo}>${H(sy.label)}</text>`
        + `<text x="${f1(lx)}" y="${f1(ly + (wide ? 16 : 14.5))}" text-anchor="${anchor}" font-size="${wide ? 12 : 11}" fill="#9A5A1C" ${halo}>${H(parts.join(' · '))}</text></g>`);
    });
    const grad = Object.keys(SPHERE).map(k => `<radialGradient id="${uid}-sp-${k}" cx=".42" cy=".4" r=".66" fx=".33" fy=".3">`
      + `<stop offset="0" stop-color="${SPHERE[k].hi}"/><stop offset=".48" stop-color="${SPHERE[k].mid}"/><stop offset="1" stop-color="${SPHERE[k].lo}"/></radialGradient>`).join('');
    svg.innerHTML = `<defs>${grad}</defs>` + out.join('');
    sync();
  }

  /* ---------- lifting ---------- */
  function openTo(i) {
    if (i === openSys) return;
    openSys = i;
    if (RM) { lift = lift.map((_, k) => (k === openSys ? 1 : 0)); render(); return; }
    if (!liftRaf) { liftLast = performance.now(); liftRaf = requestAnimationFrame(liftStep); }
  }
  function liftStep(now) {
    /* eased by real time, so a frame that arrives late catches up instead of
       leaving a slice half-lifted on a busy device */
    const dt = Math.min(1, (now - liftLast) / 1000); liftLast = now;
    const k2 = 1 - Math.exp(-dt * 13);
    let moving = false;
    lift = lift.map((v, k) => {
      const to = k === openSys ? 1 : 0, nv = v + (to - v) * k2;
      if (Math.abs(to - nv) > .003) { moving = true; return nv; }
      return to;
    });
    render();
    liftRaf = moving ? requestAnimationFrame(liftStep) : 0;
  }
  /* which slice is under the pointer: the surfaces in the order they are
     painted, the last one hit wins, and a lifted slice is tested where it floats */
  function sectorAt(px, py) {
    const C = cam(), SEC = sectors();
    SEC.forEach(x => { x.o = offOf(C, x); });
    let hit = -1;
    SEC.map(x => ({ x, y: Po(C, .62, x.mid, 0, x.o)[1] + (x.o[2] > .02 ? 4000 : 0) })).sort((p, q) => p.y - q.y).forEach(({ x }) => {
      if (x.i < 0) return;
      for (let k = 3; k >= 0; k--) {
        const st = ORDER[k], z = Z(st) * C.k, rIn = st === 'optimal' ? FR[1] : FR[k + 1], rOut = FR[k + 2] + (k === 3 ? .04 : 0);
        const sx = (px - cx - x.o[0]) / C.R, sy = (C.cy - z + x.o[1] - py) / (C.R * C.q), r = Math.hypot(sx, sy);
        if (r < rIn || r > rOut) continue;
        let a = deg(Math.atan2(sx, sy)) - C.rot; a = ((a % 360) + 360) % 360;
        if ((a >= x.b0 && a <= x.b1) || (a + 360 >= x.b0 && a + 360 <= x.b1)) hit = x.i;
      }
    });
    return hit;
  }

  function pin(it, C) {
    const d = DOTS[it.i], m = d.m, st = it.st, hollow = !!m.hollow && st === 'in_range', r = dotR(st, hollow);
    const h = PIN * C.k * (st === 'out_of_range' ? 1.15 : 1);
    const hx = it.x, hy = it.y - h;
    heads[it.i] = { x: hx, y: hy, r };
    let g = `<g class="tr-pin s-${st}" data-i="${it.i}" transform="translate(${f1(it.x)} ${f1(it.y)})">`;
    if (h > 1.5) g += `<ellipse cx="0" cy="0" rx="${f1(r * .7)}" ry="${f1(r * .7 * C.q)}" fill="#252525" opacity="${f1(.18 * C.k)}"/>`
      + `<line x1="0" y1="0" x2="0" y2="${f1(-h + r * .7)}" stroke="#4A4842" stroke-width="1.1" stroke-linecap="round"/>`;
    if (m.once) g += `<circle cx="0" cy="${f1(-h)}" r="${f1(r + 3.6)}" fill="none" stroke="${DOT[st]}" stroke-opacity=".75" stroke-width="1" stroke-dasharray="2 2.2"/>`;
    g += hollow
      ? `<circle cx="0" cy="${f1(-h)}" r="${f1(r - .3)}" fill="url(#${uid}-sp-hollow)" stroke="#8A857D" stroke-width="1.3"/>`
      : `<circle cx="0" cy="${f1(-h)}" r="${f1(r)}" fill="url(#${uid}-sp-${st})" stroke="${SPHERE[st].lo}" stroke-width=".6"/>`;
    /* a pin of light: what makes a disc read as a ball at this size */
    g += `<ellipse cx="${f1(-r * .34)}" cy="${f1(-h - r * .4)}" rx="${f1(r * .26)}" ry="${f1(r * .19)}" fill="#FFFFFF" opacity="${hollow ? .9 : .5}" transform="rotate(-30 ${f1(-r * .34)} ${f1(-h - r * .4)})"/>`;
    g += `<circle class="tr-hl" cx="0" cy="${f1(-h)}" r="${f1(r + 4)}" fill="none" stroke="#252525" stroke-width="1.25"/>`;
    return g + '</g>';
  }

  /* classes that change without a redraw: hover, keyboard, highlight */
  function sync() {
    svg.querySelectorAll('.tr-pin').forEach(g => {
      const i = +g.dataset.i, m = DOTS[i].m;
      g.classList.toggle('hot', i === hot);
      g.classList.toggle('act', i === act);
      const off = (hlSys && m.system !== hlSys) || (hlState && !g.classList.contains('s-' + hlState));
      g.classList.toggle('dim', !!off);
    });
    const show = hot >= 0 ? hot : act;
    if (show >= 0) placeTip(show); else tip.classList.remove('on');
  }

  /* ---------- tooltip ---------- */
  let tipFor = -1;
  function placeTip(i) {
    const hd = heads[i]; if (!hd) return;
    if (tipFor !== i) {
      tipFor = i;
      const d = DOTS[i], m = d.m, cur = at(d, u), now = u > EXAMS - 1.015;
      const sys = SYS[d.si].label;
      tip.innerHTML = `<p class="s">${H(sys)}</p><p class="n">${H(m.name)}</p>`
        + `<p class="v">${now ? `<span>${H(m.valueText)}${m.unit ? `<small>${H(m.unit)}</small>` : ''}</span>` : ''}`
        + `<span class="t"><i style="background:${DOT[cur.st]}"></i>${H(WORD[cur.st])}${now ? '' : ' then'}</span></p>`
        + (opts.onOpen ? `<p class="g">See its history →</p>` : '');
      live.textContent = `${m.name}, ${now ? `${m.valueText}${m.unit ? ' ' + m.unit : ''}, ` : ''}${WORD[cur.st].toLowerCase()}, ${sys}`;
    }
    const sr = svg.getBoundingClientRect(), er = el.getBoundingClientRect(), k = sr.width / W;
    tip.style.left = `${f1(sr.left - er.left + hd.x * k)}px`;
    tip.style.top = `${f1(sr.top - er.top + (hd.y - hd.r) * k)}px`;
    tip.classList.add('on');
  }
  const hideTip = () => { tip.classList.remove('on'); tipFor = -1; };

  /* ---------- input ---------- */
  const nearest = e => {
    const sr = svg.getBoundingClientRect(); if (!sr.width) return -1;
    const k = W / sr.width, x = (e.clientX - sr.left) * k, y = (e.clientY - sr.top) * k;
    let best = -1, bd = Math.max(15, DR * 2.6) * (e.pointerType === 'touch' ? 1.6 : 1);
    heads.forEach((h, i) => { if (!h) return; const dd = Math.hypot(h.x - x, h.y - y); if (dd < bd) { bd = dd; best = i; } });
    return best;
  };
  const offs = [];
  const on = (node, ev, fn, o) => { node.addEventListener(ev, fn, o); offs.push(() => node.removeEventListener(ev, fn, o)); };
  const svgXY = e => { const sr = svg.getBoundingClientRect(), k = W / (sr.width || 1); return [(e.clientX - sr.left) * k, (e.clientY - sr.top) * k]; };
  let lastPtr = 'mouse';
  on(svg, 'pointerdown', e => { lastPtr = e.pointerType || 'mouse'; }, { passive: true });
  on(svg, 'pointermove', e => {
    if (e.pointerType === 'touch') return;
    const i = nearest(e), [x, y] = svgXY(e);
    openTo(i >= 0 ? DOTS[i].si : sectorAt(x, y));
    if (i !== hot) { hot = i; tipFor = hot < 0 ? tipFor : -1; sync(); }
    svg.style.cursor = i >= 0 ? 'pointer' : '';
  });
  /* a finger "leaves" after every tap, before the click: only a mouse leaving drops the lift */
  on(svg, 'pointerleave', e => { if (e.pointerType === 'touch') return; if (hot >= 0) { hot = -1; sync(); } if (act < 0) { hideTip(); openTo(-1); } });
  on(svg, 'click', e => {
    const i = nearest(e), [x, y] = svgXY(e);
    if (lastPtr === 'touch') {
      // a tap lifts a system first; a dot opens only once its system is up
      if (i >= 0 && DOTS[i].si === openSys) { if (opts.onOpen) opts.onOpen(DOTS[i].m.id); return; }
      const s2 = i >= 0 ? DOTS[i].si : sectorAt(x, y);
      openTo(s2 === openSys ? -1 : s2);
      return;
    }
    if (i >= 0 && opts.onOpen) opts.onOpen(DOTS[i].m.id);
  });
  on(document, 'pointerdown', e => { if (openSys >= 0 && !svg.contains(e.target)) openTo(-1); }, { passive: true });
  const firstAttention = () => { const i = DOTS.findIndex(d => attn(d.m.state)); return i < 0 ? 0 : i; };
  /* only keyboard focus picks a dot: a tap also focuses the chart, and must
     not lift a system before its own click decides what the tap meant */
  on(svg, 'focus', () => {
    let kb = true; try { kb = svg.matches(':focus-visible'); } catch (e) { kb = lastPtr !== 'touch'; }
    if (!kb) return;
    if (act < 0) act = firstAttention(); tipFor = -1; openTo(DOTS[act] ? DOTS[act].si : -1); sync();
  });
  on(svg, 'blur', () => { act = -1; sync(); hideTip(); openTo(-1); });
  on(svg, 'keydown', e => {
    if (!N) return;
    let to = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (act + 1) % N;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (act - 1 + N) % N;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = N - 1;
    else if ((e.key === 'Enter' || e.key === ' ') && act >= 0) { e.preventDefault(); if (opts.onOpen) opts.onOpen(DOTS[act].m.id); return; }
    else if (e.key === 'Escape') { act = -1; sync(); hideTip(); openTo(-1); return; }
    if (to === null) return;
    e.preventDefault(); act = to; tipFor = -1; openTo(DOTS[act].si); sync();
  });

  /* ---------- motion ---------- */
  /* t0 is when the move should start. A busy main thread (a phone decoding
     the page's images on first load) delays frames, not the schedule: the
     tilt catches up rather than starting seconds late. */
  function animateTilt(to, ms, done, t0) {
    cancelAnimationFrame(tween);
    if (RM) { t = to; render(); if (done) done(); return; }
    const from = t;
    t0 = t0 || performance.now();
    const step = now => {
      if (now < t0) { tween = requestAnimationFrame(step); return; }
      const k = clamp((now - t0) / ms, 0, 1);
      t = from + (to - from) * ease(k);
      render();
      if (k < 1) tween = requestAnimationFrame(step); else if (done) done();
    };
    tween = requestAnimationFrame(step);
  }
  let io = null;
  function entrance() {
    if (played) return;
    played = true;
    animateTilt(1, 1700, null, performance.now() + 380);
  }
  if (!played && typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting && x.intersectionRatio >= .3)) { io.disconnect(); io = null; entrance(); } }, { threshold: [0, .3, .6] });
    io.observe(el);
  } else if (!played) entrance();

  let ro = null, lastW = 0, rzRaf = 0;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => {
      cancelAnimationFrame(rzRaf);
      rzRaf = requestAnimationFrame(() => { const w = Math.round(el.clientWidth); if (w && w !== lastW) { lastW = w; layout(); render(); } });
    });
    ro.observe(el);
  }

  layout(); lastW = W; render();

  return {
    destroy() {
      offs.forEach(f => f()); if (io) io.disconnect(); if (ro) ro.disconnect();
      cancelAnimationFrame(tween); cancelAnimationFrame(rzRaf); cancelAnimationFrame(liftRaf);
      el.innerHTML = ''; el.className = prevClass;
    },
    highlight(systemId) { hlSys = systemId && SYS.some(s => s.id === systemId) ? systemId : null; if (hlSys) hlState = null; openTo(hlSys ? SYS.findIndex(s => s.id === hlSys) : -1); sync(); },
    highlightState(state) { hlState = ORDER.includes(state) ? state : null; if (hlState) hlSys = null; sync(); },
    setCompare() { /* the years are walked with the scrubber; there is no separate overlay yet */ },
    select(markerId) { const i = DOTS.findIndex(d => d.m.id === markerId); act = i; tipFor = -1; sync(); if (i < 0) hideTip(); },
    play() { if (!RM) { t = 0; render(); played = false; entrance(); } },
    /* f is a float index into the exam list: 0 is the first assessment, N-1 today */
    setFrame(f) {
      u = clamp(+f || 0, 0, EXAMS - 1);
      tipFor = -1;
      render();
      if (opts.onFrame) {
        const by = { optimal: 0, in_range: 0, borderline: 0, out_of_range: 0 };
        DOTS.forEach(d => { by[at(d, u).st]++; });
        opts.onFrame(by, u);
      }
    },
    setYear(k) { this.setFrame(EXAMS >= 2 ? EXAMS - 2 + clamp(k, 0, 1) : 0); },
    /* 0 is the flat chart, 1 the terrace */
    setTilt(to, animate) { played = true; if (io) { io.disconnect(); io = null; } if (animate) animateTilt(clamp(to, 0, 1), 1100); else { cancelAnimationFrame(tween); t = clamp(to, 0, 1); render(); } },
    get tilt() { return t; },
    /* for QA: which system is lifted, and the label it shows */
    get lifted() { return openSys >= 0 ? SYS[openSys].id : null; },
    liftSystem(id) { openTo(SYS.findIndex(s => s.id === id)); },
  };
}
