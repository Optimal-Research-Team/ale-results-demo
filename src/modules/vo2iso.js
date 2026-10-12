/* ==========================================================================
   vo2iso.js: the VO2max comparison as stone columns standing on an age line,
   in front of a wall ruled every 10 ml/kg/min. The published bike or
   treadmill medians (FRIEND registry) stand at the middle of their decade,
   cross-hatched like the page's engraving plates; the patient's column
   stands at their age in forest, with last year's result as a thin collar
   around it. Heights are to one scale. Nothing is interpolated between the
   medians, so nothing joins them.

   A gentle axonometric camera (the age line falls 20 degrees, depth 38) keeps
   the drawing wide and short; the climb and the terrace use steeper ones.

   renderVo2Iso({ cols, prev, compact, grow, aria }) -> SVG string
     cols: [{ age, value, label, sub, kind: 'median' | 'you' }]
     prev: { value, label } | null  (a collar on the 'you' column)
     grow: 0..1, the columns rising as the section arrives

   Concatenated inside the page IIFE by build.py: only renderVo2Iso is
   declared at top level.
   ========================================================================== */
function renderVo2Iso(o) {
  const compact = !!o.compact, grow = o.grow == null ? 1 : Math.max(0, Math.min(1, o.grow));
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = x => Math.round(x * 10) / 10;
  const rad = d => d * Math.PI / 180, CA = Math.cos(rad(20)), SA = Math.sin(rad(20)), CB = Math.cos(rad(38)), SB = Math.sin(rad(38));
  /* world: x along the age line, y towards the viewer, z up; all in drawing units */
  const A0 = 20, A1 = 80, L = compact ? 250 : 290, D = compact ? 30 : 32, CW = compact ? 28 : 30, CD = compact ? 20 : 22;
  const top = Math.max(50, Math.ceil(Math.max(...o.cols.map(c => c.value)) / 10) * 10);
  const ZK = (compact ? 130 : 138) / top, X0 = -14, X1 = L + 14, GH = 5;
  const ax = a => (a - A0) / (A1 - A0) * L;
  const padL = compact ? 40 : 44, padT = 30;
  const ox = padL + D * CB, oy = padT + top * ZK - X0 * SA;
  const P = (x, y, z) => [ox + x * CA - y * CB, oy + x * SA + y * SB - z];
  const pts = a => a.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L');
  const poly = (a, fill, extra = '') => `<path d="M${pts(a)}Z" fill="${fill}" stroke="#8C877D" stroke-width=".75" stroke-linejoin="round"${extra}/>`;
  const fs = (d, c) => compact ? c : d;
  const id = 'v' + (compact ? 'c' : 'w');
  const out = [];
  out.push(`<defs><pattern id="${id}h" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="4" height="4" fill="#EFEBE3"/><line x1="0" y1="0" x2="0" y2="4" stroke="#B9B2A5" stroke-width=".7"/></pattern>`
    + `<pattern id="${id}x" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(52)"><rect width="4" height="4" fill="#E2DCD0"/><line x1="0" y1="0" x2="0" y2="4" stroke="#A8A094" stroke-width=".7"/></pattern>`
    + `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93AE8C"/><stop offset="1" stop-color="#6F8F68"/></linearGradient></defs>`);

  /* the wall behind, ruled every 10 */
  const zw = top * ZK + 8;
  out.push(poly([P(X0, 0, 0), P(X1, 0, 0), P(X1, 0, zw), P(X0, 0, zw)], '#FBF9F4'));
  for (let v = 10; v <= top; v += 10) {
    const a = P(X0, 0, v * ZK), b = P(X1, 0, v * ZK);
    out.push(`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="#D9D3C7" stroke-width=".7"/>`);
    out.push(`<text x="${f1(a[0] - 5)}" y="${f1(a[1] + 3.5)}" text-anchor="end" font-size="${fs(9.5, 10)}" fill="#8C877D" font-family="var(--mono, ui-monospace, Menlo, monospace)">${v}</text>`);
  }
  const u = P(X0, 0, zw);
  out.push(`<text x="${f1(u[0] - 5)}" y="${f1(u[1] - 6)}" text-anchor="start" font-size="${fs(9.5, 10)}" fill="#8C877D">ml/kg/min</text>`);

  /* the floor: a slab carrying the age line */
  out.push(poly([P(X0, 0, 0), P(X1, 0, 0), P(X1, D, 0), P(X0, D, 0)], '#F0EDE5'));
  out.push(poly([P(X0, D, 0), P(X1, D, 0), P(X1, D, -GH), P(X0, D, -GH)], '#E7E2D9'));
  out.push(poly([P(X1, 0, 0), P(X1, D, 0), P(X1, D, -GH), P(X1, 0, -GH)], '#DCD5C8'));
  const named = o.cols.map(c => ax(c.age));
  for (let a = A0; a <= A1; a += 10) {
    const p = P(ax(a), D, -GH), q = P(ax(a), D + 3, -GH);
    out.push(`<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" stroke="#8C877D" stroke-width=".75"/>`);
    if ((!compact || a % 20 === 0) && named.every(x => Math.abs(x - ax(a)) > (compact ? 34 : 36)))
      out.push(`<text x="${f1(q[0] - 3)}" y="${f1(q[1] + 11)}" text-anchor="middle" font-size="${fs(9.5, 10)}" fill="#8C877D" font-family="var(--mono, ui-monospace, Menlo, monospace)">${a}</text>`);
  }
  const al = P(X0, D, -GH);
  out.push(`<text x="${f1(al[0] - 6)}" y="${f1(al[1] + 12)}" text-anchor="end" font-size="${fs(9.5, 10)}" fill="#8C877D">age</text>`);

  /* shadows first, then the columns far to near */
  const cols = o.cols.slice().sort((a, b) => a.age - b.age);
  const box = c => { const x0 = ax(c.age) - CW / 2, y0 = (D - CD) / 2; return { x0, x1: x0 + CW, y0, y1: y0 + CD, z: Math.max(.01, c.value * ZK * grow) }; };
  cols.forEach(c => { const b = box(c), s = b.z * .22;
    out.push(`<path d="M${pts([P(b.x1, b.y0, 0), P(b.x1 + s, b.y0 - s * .15, 0), P(b.x1 + s, b.y1 - s * .15, 0), P(b.x1, b.y1, 0)])}Z" fill="#252525" opacity=".06"/>`); });
  cols.forEach(c => {
    const b = box(c), you = c.kind === 'you';
    const side = you ? '#55744F' : `url(#${id}x)`, front = you ? `url(#${id}g)` : `url(#${id}h)`, topf = you ? '#C3D3BA' : '#F7F5F0';
    out.push(`<g class="v-col v-${c.kind}">`
      + poly([P(b.x1, b.y0, 0), P(b.x1, b.y1, 0), P(b.x1, b.y1, b.z), P(b.x1, b.y0, b.z)], side)
      + poly([P(b.x0, b.y1, 0), P(b.x1, b.y1, 0), P(b.x1, b.y1, b.z), P(b.x0, b.y1, b.z)], front)
      + poly([P(b.x0, b.y0, b.z), P(b.x1, b.y0, b.z), P(b.x1, b.y1, b.z), P(b.x0, b.y1, b.z)], topf)
      + '</g>');
    /* last year: a thin collar around the patient's column, its label off to the right */
    if (you && o.prev && grow > .98) {
      const zp = o.prev.value * ZK, h = 2.2;
      out.push(poly([P(b.x0, b.y1, zp - h), P(b.x1, b.y1, zp - h), P(b.x1, b.y1, zp + h), P(b.x0, b.y1, zp + h)], '#FFFCF7', ' opacity=".85"'));
      out.push(poly([P(b.x1, b.y0, zp - h), P(b.x1, b.y1, zp - h), P(b.x1, b.y1, zp + h), P(b.x1, b.y0, zp + h)], '#E8EEE3', ' opacity=".85"'));
      const s0 = P(b.x1, (b.y0 + b.y1) / 2, zp), s1 = [s0[0] + (compact ? 14 : 18), s0[1]];
      out.push(`<path d="M${f1(s0[0] + 2)} ${f1(s0[1])}L${f1(s1[0])} ${f1(s1[1])}" stroke="#8C877D" stroke-width=".75"/>`);
      out.push(`<text x="${f1(s1[0] + 4)}" y="${f1(s1[1] + 3.5)}" font-size="${fs(10.5, 11)}" fill="#474747">${H(o.prev.label)}</text>`);
    }
    /* the value on top, the name and its note under the floor */
    const t = P((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, b.z);
    out.push(`<text x="${f1(t[0])}" y="${f1(t[1] - 9)}" text-anchor="middle" font-family="var(--serif, Castoro, Georgia, serif)" font-size="${you ? fs(21, 22) : fs(15, 16)}" fill="${you ? '#1A500F' : '#474747'}" opacity="${grow > .6 ? 1 : 0}">${H(c.value.toFixed(1))}</text>`);
    const f = P((b.x0 + b.x1) / 2, D + 3, -GH);
    if (you) out.push(`<path d="M${f1(f[0])} ${f1(f[1] - 1)}l-4 6h8z" fill="#2C4E25"/>`);
    out.push(`<text x="${f1(f[0])}" y="${f1(f[1] + (you ? 20 : 15))}" text-anchor="middle" font-size="${fs(10.5, 11.5)}" font-weight="600" fill="${you ? '#1A500F' : '#474747'}">${H(c.label)}</text>`);
    if (c.sub) out.push(`<text x="${f1(f[0])}" y="${f1(f[1] + (you ? 33 : 28))}" text-anchor="middle" font-size="${fs(9.5, 10.5)}" fill="#8C877D">${H(c.sub)}</text>`);
  });
  const VW = Math.ceil(P(X1, 0, 0)[0] + (compact ? 64 : 70));
  const VH = Math.ceil(Math.max(P(X0, D, -GH)[1], P(X1, D, -GH)[1]) + 42);
  return `<svg class="vo2-iso" viewBox="0 0 ${VW} ${VH}" width="100%" role="img" aria-label="${H(o.aria || '')}">${out.join('')}</svg>`;
}
