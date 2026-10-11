/* ==========================================================================
   climb.js: "the climb" - one marker's own bands as a short isometric
   staircase, its worst state at the foot and its goal on the top step. The
   result stands where it is and a dashed walk climbs to the goal.

   Presentational only, and nothing is scored: the steps are the marker's
   states in band order, and the position along a step is where the value sits
   inside that band. Drawn in the terrace's camera and stone, so the card and
   the hero read as one picture.

   renderClimb(spec) -> SVG string, the stair at rest
   spec = { id, name, steps: [{ state, range }], cur, frac (0..1 toward the
            better side), value, unit, goalWord ('target' | 'lab range') }

   wireClimbs() - once per page. With a mouse, hovering a stair turns it on
   its own axis, partly rightward toward its profile, and it follows the
   pointer a few degrees either way. The light stays with the camera, so the
   faces turning toward you brighten and the risers fall into shade; the stair
   lifts off a soft shadow, the result hops, and the walk to the goal runs.
   Every frame is a re-projection of the same blocks, not a CSS transform, so
   the stone stays isometric and the labels stay upright.

   Concatenated inside the page IIFE by build.py: renderClimb, wireClimbs and
   CLIMB_SCENES are declared at top level.
   ========================================================================== */
const CLIMB_SCENES = new Map();

function climbScene(spec) {
  const WORD = { optimal: 'Optimal', in_range: 'In range', borderline: 'Borderline', out_of_range: 'Out of range' };
  const DOT = { optimal: '#2C4E25', in_range: '#A9A49B', borderline: '#C97B2D', out_of_range: '#B3402F' };
  const INK = { optimal: '#1A500F', in_range: '#76736D', borderline: '#9A5A1C', out_of_range: '#B3402F' };
  const TOP = { optimal: '#E4EADC', in_range: '#F4F2EC', borderline: '#F7EEE2', out_of_range: '#F6EAE5' };
  const SIDE = { optimal: '#CAD5C0', in_range: '#E0DBD1', borderline: '#E7D9C5', out_of_range: '#E5D4CD' };
  const FRONT = { optimal: '#D7E0CF', in_range: '#EAE6DE', borderline: '#EFE3D2', out_of_range: '#EEDFD9' };
  const EDGE = '#8C877D';
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = x => Math.round(x * 10) / 10;
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16));
  const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (h, to, k) => hex(rgb(h).map(v => v * (1 - k) + to * k));

  const steps = spec.steps, n = steps.length, cur = spec.cur;
  const sw = 70, dd = 34, hh = 40;                  // a step's run, its depth, its rise
  const C30 = Math.cos(Math.PI / 6), uid = 'cl-' + String(spec.id).replace(/[^a-z0-9]/gi, '');
  const padL = 34, padT = 58;
  const ox = padL + dd * C30, oy = padT + n * hh - n * sw * .5;
  const pvx = n * sw / 2, pvy = dd / 2;             // the stair turns on its own centre

  /* the light rides with the camera, low and from the front left: at rest it
     gives exactly the old FRONT and SIDE tones, and as the stair turns the
     face swinging toward you brightens while the riser side falls away */
  const LA = 62 * Math.PI / 180, dS = Math.cos(LA), dF = Math.sin(LA);
  const shade = (st, d) => { const a = rgb(SIDE[st]), b = rgb(FRONT[st]), t = Math.max(-1.6, Math.min(1.8, (d - dS) / (dF - dS)));
    return hex(a.map((v, i) => v + (b[i] - v) * t)); };

  /* one camera per yaw: world (x along the run, y into the page, z up) turned
     about the pivot, then the terrace's 30-degree projection. The stair's
     bounding box is re-centred so it turns in place instead of drifting */
  const hull = [];
  steps.forEach((s, i) => { const z = (i + 1) * hh; [[i * sw, 0], [(i + 1) * sw, 0], [i * sw, dd], [(i + 1) * sw, dd]].forEach(([x, y]) => { hull.push([x, y, 0], [x, y, z]); }); });
  const raw = (yr, x, y, z) => { const c = Math.cos(yr), s = Math.sin(yr), dx = x - pvx, dy = y - pvy;
    const X = pvx + dx * c + dy * s, Y = pvy - dx * s + dy * c;
    return [ox + (X - Y) * C30, oy + (X + Y) * .5 - z]; };
  const centre = yr => { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    hull.forEach(p => { const q = raw(yr, p[0], p[1], p[2]); a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); });
    return [(a + b) / 2, (c + d) / 2]; };
  const c0 = centre(0);
  const camera = yawDeg => { const yr = yawDeg * Math.PI / 180, cc = centre(yr), sx = c0[0] - cc[0], sy = c0[1] - cc[1];
    return { yr, P: (x, y, z) => { const q = raw(yr, x, y, z); return [q[0] + sx, q[1] + sy]; } }; };

  const yMid = dd * .5;
  const xu = cur * sw + sw * (.14 + .72 * Math.max(0, Math.min(1, spec.frac)));
  const st = steps[cur].state, r = 8, post = 13;
  const dpath = pts => `M${pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}`;

  /* the scene as a fixed list of elements: the same nodes every frame, only
     their geometry and the turned faces' tones change */
  function frame(yaw = 0, lift = 0, hop = 0, glint = 0) {
    const { yr, P } = camera(yaw);
    const L = (x, y, z) => P(x, y, z + lift);      // the stair, lifted off its shadow
    const els = [];
    /* the shadow on the ground, only there while the stair is lifted */
    const lk = Math.min(1, lift / 7), sh = (x, y) => { const q = P(x, y, 0); return [q[0] + 6 * lk, q[1] + 3 * lk]; };
    els.push({ t: 'path', a: { d: dpath([sh(0, 0), sh(n * sw, 0), sh(n * sw, dd), sh(0, dd)]) + 'Z', opacity: f1(lk * .22 * 100) / 100 } });
    const dFront = Math.sin(LA + yr), dSide = Math.cos(LA + yr);
    steps.forEach((s, i) => {
      const x0 = i * sw, x1 = x0 + sw, z = (i + 1) * hh;
      els.push({ t: 'path', a: { d: dpath([L(x1, 0, 0), L(x1, dd, 0), L(x1, dd, z), L(x1, 0, z)]) + 'Z', fill: shade(s.state, dSide) } });   // riser side, facing right
      els.push({ t: 'path', a: { d: dpath([L(x0, dd, 0), L(x1, dd, 0), L(x1, dd, z), L(x0, dd, z)]) + 'Z', fill: shade(s.state, dFront) } }); // front face
      els.push({ t: 'path', a: { d: dpath([L(x0, 0, z), L(x1, 0, z), L(x1, dd, z), L(x0, dd, z)]) + 'Z' } });                                // tread
    });
    /* a glint: while the stair is turning, a band of light crosses the
       front faces, placed by the angle and as strong as the turn is fast */
    const g0 = L(0, dd, 0), g1 = L(n * sw, dd, 0), gx = g0[0] - 60 + (g1[0] - g0[0] + 120) * Math.max(0, Math.min(1, yaw / 30));
    const gy = L(0, dd, n * hh * .5)[1];
    els.push({ t: 'linearGradient', a: { x1: f1(gx - 30), y1: f1(gy - 16), x2: f1(gx + 30), y2: f1(gy + 16) } });
    steps.forEach((s, i) => {
      const x0 = i * sw, x1 = x0 + sw, z = (i + 1) * hh;
      els.push({ t: 'path', a: { d: dpath([L(x0, dd, 0), L(x1, dd, 0), L(x1, dd, z), L(x0, dd, z)]) + 'Z', opacity: f1(glint * 100) / 100 } });
    });
    /* each step's name under its own foot, on the ground: the feet step down
       the page, so the names never meet */
    steps.forEach((s, i) => {
      const xe = P((i + 1) * sw, dd, 0)[0] - 8, ye = P(i * sw + sw * .75, dd, 0)[1] + 15;
      els.push({ t: 'text', a: { x: f1(xe), y: f1(ye) } });
      if (s.range) els.push({ t: 'text', a: { x: f1(xe), y: f1(ye + 12) } });
    });
    /* the walk: from the result along its tread, up each riser, to the goal */
    const walk = [L(xu, yMid, (cur + 1) * hh)];
    for (let k = cur + 1; k < n; k++) { walk.push(L(k * sw, yMid, k * hh)); walk.push(L(k * sw, yMid, (k + 1) * hh)); }
    const goal = L((n - 1) * sw + sw * .5, yMid, n * hh);
    walk.push(goal);
    if (cur < n - 1) { const d = dpath(walk); els.push({ t: 'path', a: { d } }, { t: 'path', a: { d } }); }
    els.push({ t: 'ellipse', a: { cx: f1(goal[0]), cy: f1(goal[1]) } });
    els.push({ t: 'text', a: { x: f1(goal[0] + 16), y: f1(goal[1] - 8) } });
    /* the result: a small sphere on a post, lit like the terrace's pins */
    const you = walk[0], up = post + hop;
    els.push({ t: 'ellipse', a: { cx: f1(you[0]), cy: f1(you[1]), opacity: f1((.18 - Math.min(hop, 8) * .012) * 100) / 100 } });
    els.push({ t: 'line', a: { x1: f1(you[0]), y1: f1(you[1]), x2: f1(you[0]), y2: f1(you[1] - up + r * .7) } });
    els.push({ t: 'circle', a: { cx: f1(you[0]), cy: f1(you[1] - up) } });
    els.push({ t: 'ellipse', a: { cx: f1(you[0] - r * .34), cy: f1(you[1] - up - r * .4) } });
    els.push({ t: 'text', a: { x: f1(you[0]), y: f1(you[1] - up - r - 9) } });
    return els;
  }

  /* what never changes: each element's paint and words, in frame() order */
  const fixed = [];
  fixed.push({ a: { class: 'cl-shadow', fill: '#252525', filter: `url(#${uid}-b)` } });
  steps.forEach(s => {
    fixed.push({ a: { stroke: EDGE, 'stroke-width': .8, 'stroke-linejoin': 'round' } });
    fixed.push({ a: { stroke: EDGE, 'stroke-width': .8, 'stroke-linejoin': 'round' } });
    fixed.push({ a: { fill: TOP[s.state], stroke: EDGE, 'stroke-width': .8, 'stroke-linejoin': 'round' } });
  });
  fixed.push({ a: { id: `${uid}-s`, gradientUnits: 'userSpaceOnUse' }, kids: '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>' });
  steps.forEach(() => fixed.push({ a: { class: 'cl-glint', fill: `url(#${uid}-s)`, 'pointer-events': 'none' } }));
  steps.forEach(s => {
    fixed.push({ a: { 'text-anchor': 'end', 'font-size': 8.5, 'font-weight': 600, 'letter-spacing': '.08em', fill: INK[s.state] }, x: WORD[s.state].toUpperCase() });
    if (s.range) fixed.push({ a: { 'text-anchor': 'end', 'font-size': 9.5, 'font-family': 'var(--mono, ui-monospace, Menlo, monospace)', fill: '#76736D' }, x: s.range });
  });
  /* the walk is dashed, so it draws in through a mask: a solid copy of the same
     path, revealed along its length when the card opens */
  if (cur < n - 1) {
    fixed.push({ a: { class: 'cl-draw', pathLength: 1, fill: 'none', stroke: '#fff', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, open: `<mask id="${uid}-m" maskUnits="userSpaceOnUse">`, close: '</mask>' });
    fixed.push({ a: { class: 'cl-walk', mask: `url(#${uid}-m)`, fill: 'none', stroke: DOT[st], 'stroke-width': 1.4, 'stroke-dasharray': '2 3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } });
  }
  fixed.push({ a: { class: 'cl-ring', rx: 11, ry: 6.3, fill: 'none', stroke: '#2C4E25', 'stroke-width': 1.3, 'stroke-dasharray': '2 2' } });
  fixed.push({ a: { 'font-size': 12, 'font-style': 'italic', 'font-weight': 500, fill: '#1A500F' }, x: spec.goalWord });
  fixed.push({ a: { rx: f1(r * .7), ry: f1(r * .38), fill: '#252525' } });
  fixed.push({ a: { stroke: '#4A4842', 'stroke-width': 1.2, 'stroke-linecap': 'round' } });
  fixed.push({ a: { r, fill: `url(#${uid}-g)`, stroke: mix(DOT[st], 0, .34), 'stroke-width': .6 } });
  fixed.push({ a: { rx: f1(r * .26), ry: f1(r * .19), fill: '#fff', opacity: .5 } });
  fixed.push({ a: { 'text-anchor': 'middle', 'font-size': 12, 'font-style': 'italic', 'font-weight': 500, fill: INK[st] }, x: `you, ${spec.value}` });

  const attrs = o => Object.keys(o).map(k => ` ${k}="${H(o[k])}"`).join('');
  function svg() {
    const els = frame(0, 0, 0);
    const body = els.map((e, i) => { const f = fixed[i];
      const inner = f.kids != null ? f.kids : f.x != null ? H(f.x) : null;
      const tag = `<${e.t} data-k="${i}"${attrs(f.a)}${attrs(e.a)}${inner != null ? `>${inner}</${e.t}>` : '/>'}`;
      return f.open ? f.open + tag + f.close : tag; }).join('');
    const togo = n - 1 - cur;
    const aria = `${spec.name}: ${spec.value}${spec.unit ? ' ' + spec.unit : ''}, ${WORD[st].toLowerCase()}, ${togo === 0 ? 'at its goal' : `${togo} step${togo === 1 ? '' : 's'} below the ${spec.goalWord}`}`;
    const P0 = camera(0).P, ground = P0(n * sw, dd, 0)[1];
    const VW = Math.ceil(P0(n * sw, 0, 0)[0] + 96), VH = Math.ceil(ground + 30);
    return `<svg class="climb-svg" data-climb="${uid}" viewBox="0 0 ${VW} ${VH}" width="${VW}" height="${VH}" role="img" aria-label="${H(aria)}">`
      + `<defs><radialGradient id="${uid}-g" cx=".42" cy=".4" r=".66" fx=".33" fy=".3"><stop offset="0" stop-color="${mix(DOT[st], 255, .52)}"/><stop offset=".48" stop-color="${DOT[st]}"/><stop offset="1" stop-color="${mix(DOT[st], 0, .34)}"/></radialGradient>`
      + `<filter id="${uid}-b" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="5"/></filter></defs>`
      + body + '</svg>';
  }
  return { uid, frame, svg };
}

function renderClimb(spec) {
  const sc = climbScene(spec);
  CLIMB_SCENES.set(sc.uid, sc);
  return sc.svg();
}

function wireClimbs() {
  const YAW = 22, SPAN = 12, LIFT = 7;              // degrees at rest on hover, the pointer's swing, px of lift
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const live = new WeakMap();
  /* springs, integrated per frame: the turn is a touch underdamped so it
     settles with a small overshoot, the lift is critically damped */
  const spring = (s, k, w, z, dt) => { s[k + 'v'] += (w * w * (s[k + 'T'] - s[k]) - 2 * z * w * s[k + 'v']) * dt; s[k] += s[k + 'v'] * dt; };
  function tick(s, now) {
    const dt = Math.min(.034, Math.max(.001, (now - s.t) / 1000)); s.t = now;
    for (let i = 0; i < 2; i++) { spring(s, 'y', 13, .55, dt / 2); spring(s, 'l', 15, 1, dt / 2); }
    const ht = (now - s.hop0) / 460, hop = ht > 0 && ht < 1 ? Math.sin(Math.PI * ht) * 7 : 0;
    const els = s.sc.frame(s.y, Math.max(0, s.l), hop, Math.min(1, Math.abs(s.yv) / 70));
    els.forEach((e, i) => { const node = s.nodes[i]; if (!node) return; for (const k in e.a) node.setAttribute(k, e.a[k]); });
    const rest = Math.abs(s.y - s.yT) < .02 && Math.abs(s.yv) < .02 && Math.abs(s.l - s.lT) < .02 && Math.abs(s.lv) < .02 && hop === 0;
    s.raf = rest ? 0 : requestAnimationFrame(t => tick(s, t));
  }
  const kick = s => { if (!s.raf) { s.t = performance.now(); s.raf = requestAnimationFrame(t => tick(s, t)); } };
  const aim = (s, e) => { const b = s.svg.getBoundingClientRect(), mx = b.width ? (e.clientX - b.left) / b.width : .5;
    s.yT = s.on ? YAW + SPAN * (Math.max(0, Math.min(1, mx)) - .5) : 0; s.lT = s.on ? LIFT : 0; kick(s); };
  function adopt(svg) {
    const sc = CLIMB_SCENES.get(svg.dataset.climb); if (!sc) return null;
    const nodes = []; svg.querySelectorAll('[data-k]').forEach(el => { nodes[+el.dataset.k] = el; });
    const s = { sc, svg, nodes, y: 0, yv: 0, yT: 0, l: 0, lv: 0, lT: 0, t: 0, raf: 0, on: false, hop0: -1e9 };
    svg.addEventListener('pointermove', e => { if (s.on) aim(s, e); });
    svg.addEventListener('pointerleave', e => { s.on = false; svg.closest('.climb-w').classList.remove('cl-on'); aim(s, e); });
    return s;
  }
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch' || !fine.matches) return;
    const svg = e.target.closest && e.target.closest('svg.climb-svg'); if (!svg) return;
    let s = live.get(svg); if (!s) { s = adopt(svg); if (!s) return; live.set(svg, s); }
    if (s.on) return;
    s.on = true; s.hop0 = performance.now() + 90;
    svg.closest('.climb-w').classList.add('cl-on');
    aim(s, e);
  });
}
