/* ==========================================================================
   vo2iso.js: the VO2max comparison as isometric stone columns standing on an
   age line. The published bike medians (FRIEND registry) stand at the middle
   of their decade; the patient's column stands at their age, with last year's
   result marked on its face. Heights are to one scale; nothing is
   interpolated between the medians, so no line joins them.

   renderVo2Iso({ cols, prev, compact, grow }) -> SVG string
     cols: [{ age, value, label, sub, kind: 'median' | 'you' }]
     prev: { value, label } | null  (marked on the 'you' column)
     grow: 0..1, the columns rising as the section arrives

   Concatenated inside the page IIFE by build.py: only renderVo2Iso is
   declared at top level.
   ========================================================================== */
function renderVo2Iso(o) {
  const compact = !!o.compact, grow = o.grow == null ? 1 : Math.max(0, Math.min(1, o.grow));
  const C30 = Math.cos(Math.PI / 6), f1 = x => Math.round(x * 10) / 10;
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A0 = 20, A1 = 80, L = compact ? 260 : 380, D = compact ? 30 : 36, ZK = compact ? 3.1 : 3.6, CW = compact ? 34 : 38;
  const ax = a => (a - A0) / (A1 - A0) * L;
  const padL = compact ? 40 : 44, padT = compact ? 74 : 70;
  const zMax = Math.max(...o.cols.map(c => c.value)) * ZK;
  const ox = padL + D * C30, oy = padT + zMax;
  const P = (x, y, z) => [ox + (x - y) * C30, oy + (x + y) * .5 - z];
  const poly = (pts, fill, cls = '') => `<path${cls ? ` class="${cls}"` : ''} d="M${pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z" fill="${fill}" stroke="#8C877D" stroke-width=".8" stroke-linejoin="round"/>`;
  const out = [];
  /* the ground: a long slab under the age line, with a tick every ten years */
  const g0 = -10, g1 = L + 10, gh = 6;
  out.push(poly([P(g0, 0, 0), P(g1, 0, 0), P(g1, D, 0), P(g0, D, 0)], '#F0EDE5'));
  out.push(poly([P(g0, D, 0), P(g1, D, 0), P(g1, D, -gh), P(g0, D, -gh)], '#E7E2D9'));
  out.push(poly([P(g1, 0, 0), P(g1, D, 0), P(g1, D, -gh), P(g1, 0, -gh)], '#DFD7CA'));
  /* tick numbers give way to the columns' names, which sit on the same line */
  const named = o.cols.map(c => ax(c.age));
  for (let a = A0; a <= A1; a += 10) {
    const p = P(ax(a), D, -gh), q = P(ax(a), D, -gh - 4);
    out.push(`<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" stroke="#8C877D" stroke-width=".8"/>`);
    if ((!compact || a % 20 === 0) && named.every(x => Math.abs(x - ax(a)) > (compact ? 42 : 52))) out.push(`<text x="${f1(q[0] - 2)}" y="${f1(q[1] + 11)}" text-anchor="middle" font-size="${compact ? 11 : 10}" fill="#76736D" font-family="var(--mono, ui-monospace, Menlo, monospace)">${a}</text>`);
  }
  const al = P(g0 - 4, D, -gh - 4);
  out.push(`<text x="${f1(al[0] - 4)}" y="${f1(al[1] + 11)}" text-anchor="end" font-size="${compact ? 11 : 10}" fill="#76736D">age</text>`);
  /* the columns, back to front */
  const FACE = { median: { top: '#F4F2EC', front: '#E7E2D9', side: '#D6D0C4' }, you: { top: '#BFD0B6', front: '#87A482', side: '#5E7D58' } };
  const cols = o.cols.slice().sort((a, b) => a.age - b.age);
  cols.forEach(c => {
    const t = FACE[c.kind] || FACE.median, x0 = ax(c.age) - CW / 2, x1 = x0 + CW, y0 = (D - CW * .7) / 2, y1 = y0 + CW * .7;
    const z = Math.max(0.01, c.value * ZK * grow);
    out.push(`<g class="v-col v-${c.kind}">`
      + poly([P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, z), P(x1, y0, z)], t.side)
      + poly([P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, z), P(x0, y1, z)], t.front)
      + poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], t.top) + '</g>');
    /* last year, marked on the patient's column */
    if (c.kind === 'you' && o.prev && grow > .98) {
      const zp = o.prev.value * ZK, a = P(x0, y1, zp), b = P(x1, y1, zp), e = P(x1, y0, zp);
      out.push(`<path d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}L${f1(e[0])} ${f1(e[1])}" fill="none" stroke="#FFFCF7" stroke-width="1.6" stroke-dasharray="3 2.5"/>`);
      out.push(`<text x="${f1(e[0] + 6)}" y="${f1(e[1] + 4)}" font-size="${compact ? 11 : 10.5}" fill="#474747">${H(o.prev.label)}</text>`);
    }
    /* the value above, the name below */
    const top = P((x0 + x1) / 2, (y0 + y1) / 2, z);
    out.push(`<text x="${f1(top[0])}" y="${f1(top[1] - 12)}" text-anchor="middle" font-family="var(--serif, Castoro, Georgia, serif)" font-size="${c.kind === 'you' ? (compact ? 24 : 26) : (compact ? 17 : 18)}" fill="${c.kind === 'you' ? '#1A500F' : '#474747'}" opacity="${grow > .6 ? 1 : 0}">${H(c.value.toFixed(1))}</text>`);
    const foot = P((x0 + x1) / 2, D, -gh - 4);
    out.push(`<text x="${f1(foot[0] - 4)}" y="${f1(foot[1] + (compact ? 30 : 28))}" text-anchor="middle" font-size="${compact ? 11.5 : 11}" font-weight="600" fill="${c.kind === 'you' ? '#1A500F' : '#474747'}">${H(c.label)}</text>`);
    if (c.sub) out.push(`<text x="${f1(foot[0] - 4)}" y="${f1(foot[1] + (compact ? 44 : 41))}" text-anchor="middle" font-size="${compact ? 10.5 : 10}" fill="#76736D">${H(c.sub)}</text>`);
  });
  const end = P(g1, D, -gh);
  const VW = Math.ceil(P(g1 + 30, 0, 0)[0] + (compact ? 10 : 24)), VH = Math.ceil(end[1] + (compact ? 52 : 50));
  return `<svg class="vo2-iso" viewBox="0 0 ${VW} ${VH}" width="100%" role="img" aria-label="${H(o.aria || '')}">${out.join('')}</svg>`;
}
