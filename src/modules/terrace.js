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
  const PAL = WOOD ? {
    top: { optimal: '#ECEAD6', in_range: '#F5EEDF', borderline: '#F5EBD8', out_of_range: '#F4E6DA' },
    wall: { optimal: '#CDBE9C', in_range: '#D7C5A4', borderline: '#D9C4A0', out_of_range: '#D8C09E' },
    core: '#F2EFDF', grain: 'rgba(150,120,80,.22)', edge: '#8F7C5C', seam: 'rgba(143,124,92,.38)',
    base: '#C9B48F', hatch: 'rgba(110,88,58,.32)', lip: '#E6D9C0',
  } : {
    top: { optimal: '#E4EADC', in_range: '#F4F2EC', borderline: '#F7EEE2', out_of_range: '#F6EAE5' },
    wall: { optimal: '#CAD5C0', in_range: '#E0DBD1', borderline: '#E7D9C5', out_of_range: '#E5D4CD' },
    core: '#D8E2CE', grain: 'rgba(44,78,37,.12)', edge: '#8C877D', seam: 'rgba(118,115,109,.30)',
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
    SYS.forEach(s => { s.a0 = a; s.a1 = a + s.markers.length * slot; s.b1 = s.a1 + gapDeg / 2; a = s.a1 + gapDeg; });
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
  const cuts = () => [keyAng / 2, 360 - keyAng / 2].concat(SYS.slice(0, -1).map(s => s.b1));

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
    const CUTS = cuts();
    const lineOn = (r0, r1, a, z) => { const p = P(C, r0, a, z), q = P(C, r1, a, z); return `M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}`; };
    /* pins sorted into the layer that hides them correctly: back-half pins
       sit with their own terrace (the next, higher one is drawn over them),
       front-half pins go on top of everything, nearest last */
    const layers = ORDER.map(() => []), front = [];
    heads = [];
    DOTS.forEach((d, i) => {
      const p = at(d, u), z = zAt(p.r), A = rad(d.ang + C.rot);
      const base = P(C, p.r, d.ang, z);
      const item = { i, st: p.st, x: base[0], y: base[1] };
      if (isoOn && Math.cos(A) > .08) layers[ORDER.indexOf(p.st)].push(item); else front.push(item);
    });
    const byDepth = (a, b) => a.y - b.y;
    /* terraces, outermost (lowest) first */
    for (let k = 3; k >= 0; k--) {
      const st = ORDER[k], rIn = FR[k + 1], rOut = FR[k + 2], zLo = k === 3 ? 0 : Z(ORDER[k + 1]), zHi = Z(st);
      out.push(wall(C, rOut, zLo, zHi, PAL.wall[st], PAL.edge));
      if (WOOD) out.push(hatch(C, rOut, zLo, zHi, 3, PAL.hatch));
      /* seams continue down the walls that face us, so the sectors read as cut blocks */
      if (isoOn) {
        let sp = '';
        CUTS.forEach(a => {
          const A = rad(a + C.rot); if (Math.cos(A) > -.06) return;
          const x = cx + rOut * C.R * Math.sin(A), yy = C.cy - rOut * C.R * C.q * Math.cos(A);
          sp += `M${f1(x)} ${f1(yy - zLo * C.k)}V${f1(yy - zHi * C.k)}`;
        });
        if (sp) out.push(`<path d="${sp}" stroke="${PAL.seam}" stroke-width=".7" fill="none"/>`);
      }
      out.push(ell(C, rOut, zHi, PAL.top[st], PAL.edge, .7));
      if (WOOD) {
        let g = '';
        for (let j = 1; j < 4; j++) { const r = rIn + (rOut - rIn) * j / 4; g += ell(C, r, zHi, 'none', PAL.grain, .7); }
        out.push(g);
      }
      out.push(`<path d="${CUTS.map(a => lineOn(st === 'optimal' ? FR[1] : rIn, rOut, a, zHi)).join('')}" stroke="${PAL.seam}" stroke-width=".8" fill="none"/>`);
      /* the step's name, cut into the riser that faces us */
      if (C.k > .82 && (zHi - zLo) * C.k > riserFs * 1.05) {
        const fade = clamp((C.k - .82) / .16, 0, 1);
        const zb = zLo + (zHi - zLo) / 2 - riserFs * .36 / C.k, rx = rOut * C.R, ry = rx * C.q, yc = C.cy - zb * C.k, th = rad(64);
        const id = `${uid}-rs-${k}`;
        out.push(`<path id="${id}" d="M${f1(cx - rx * Math.sin(th))} ${f1(yc + ry * Math.cos(th))}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(cx + rx * Math.sin(th))} ${f1(yc + ry * Math.cos(th))}" fill="none"/>`
          + `<text font-size="${f1(riserFs)}" font-weight="600" letter-spacing=".12em" fill="${FG[st]}" opacity="${f1(fade * .92)}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${H(WORD[st].toUpperCase())}</textPath></text>`);
      }
      if (st === 'optimal') {
        out.push(ell(C, FR[1], zHi, PAL.core, 'rgba(44,78,37,.22)', .8));
        out.push(ell(C, FR[1] * .78, zHi, 'none', 'rgba(44,78,37,.16)', .8));
      }
      layers[k].sort(byDepth).forEach(it => out.push(pin(it, C)));
    }
    /* the count at target, standing on the plateau */
    {
      const lit = DOTS.reduce((n, d) => n + (at(d, u).st === 'optimal' ? 1 : 0), 0);
      const ry = FR[1] * C.R * C.q, yc = C.cy - Z('optimal') * C.k;
      const nFs = clamp(ry * (wide ? .7 : .62), 15, 46), denFs = nFs * .36, subFs = clamp(nFs * .26, 8, 10.5);
      out.push(`<g aria-hidden="true"><text class="tr-serif" x="${f1(cx)}" y="${f1(yc + nFs * .2)}" text-anchor="middle" font-size="${f1(nFs)}" fill="#1A500F" letter-spacing="-.02em">${lit}<tspan font-size="${f1(denFs)}" fill="#2C4E25" dx="${f1(denFs * .22)}">of ${N}</tspan></text>`
        + `<text x="${f1(cx)}" y="${f1(yc + nFs * .2 + subFs * 1.75)}" text-anchor="middle" font-size="${f1(subFs)}" font-weight="600" letter-spacing=".12em" fill="#2C4E25">AT TARGET</text></g>`);
    }
    front.sort(byDepth).forEach(it => out.push(pin(it, C)));
    svg.innerHTML = out.join('');
    sync();
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
      ? `<circle cx="0" cy="${f1(-h)}" r="${f1(r - .5)}" fill="#FFFFFF" stroke="#8A857D" stroke-width="1.3"/>`
      : `<circle cx="0" cy="${f1(-h)}" r="${f1(r)}" fill="${DOT[st]}" stroke="#FFFFFF" stroke-width="1.6"/>`;
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
  on(svg, 'pointermove', e => {
    if (e.pointerType === 'touch') return;
    const i = nearest(e);
    if (i !== hot) { hot = i; tipFor = hot < 0 ? tipFor : -1; sync(); svg.style.cursor = i >= 0 ? 'pointer' : ''; }
  });
  on(svg, 'pointerleave', () => { if (hot >= 0) { hot = -1; sync(); } if (act < 0) hideTip(); });
  on(svg, 'click', e => {
    const i = nearest(e);
    if (i >= 0 && opts.onOpen) opts.onOpen(DOTS[i].m.id);
  });
  const firstAttention = () => { const i = DOTS.findIndex(d => attn(d.m.state)); return i < 0 ? 0 : i; };
  on(svg, 'focus', () => { if (act < 0) act = firstAttention(); tipFor = -1; sync(); });
  on(svg, 'blur', () => { act = -1; sync(); hideTip(); });
  on(svg, 'keydown', e => {
    if (!N) return;
    let to = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (act + 1) % N;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (act - 1 + N) % N;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = N - 1;
    else if ((e.key === 'Enter' || e.key === ' ') && act >= 0) { e.preventDefault(); if (opts.onOpen) opts.onOpen(DOTS[act].m.id); return; }
    else if (e.key === 'Escape') { act = -1; sync(); hideTip(); return; }
    if (to === null) return;
    e.preventDefault(); act = to; tipFor = -1; sync();
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
      cancelAnimationFrame(tween); cancelAnimationFrame(rzRaf);
      el.innerHTML = ''; el.className = prevClass;
    },
    highlight(systemId) { hlSys = systemId && SYS.some(s => s.id === systemId) ? systemId : null; if (hlSys) hlState = null; sync(); },
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
  };
}
