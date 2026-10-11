/* ==========================================================================
   climb.js: "the climb" - one marker's own bands as a short isometric
   staircase, its worst state at the foot and its goal on the top step. The
   result stands where it is and a dashed walk climbs to the goal.

   Presentational only, and nothing is scored: the steps are the marker's
   states in band order, and the position along a step is where the value sits
   inside that band. Drawn in the terrace's camera and stone, so the card and
   the hero read as one picture.

   renderClimb(spec) -> SVG string
   spec = { id, name, steps: [{ state, label }], cur, frac (0..1 toward the
            better side), value, unit, goalWord ('target' | 'lab range') }

   Concatenated inside the page IIFE by build.py: only renderClimb is declared
   at top level.
   ========================================================================== */
function renderClimb(spec) {
  const WORD = { optimal: 'Optimal', in_range: 'In range', borderline: 'Borderline', out_of_range: 'Out of range' };
  const DOT = { optimal: '#2C4E25', in_range: '#A9A49B', borderline: '#C97B2D', out_of_range: '#B3402F' };
  const INK = { optimal: '#1A500F', in_range: '#76736D', borderline: '#9A5A1C', out_of_range: '#B3402F' };
  const TOP = { optimal: '#E4EADC', in_range: '#F4F2EC', borderline: '#F7EEE2', out_of_range: '#F6EAE5' };
  const SIDE = { optimal: '#CAD5C0', in_range: '#E0DBD1', borderline: '#E7D9C5', out_of_range: '#E5D4CD' };
  const FRONT = { optimal: '#D7E0CF', in_range: '#EAE6DE', borderline: '#EFE3D2', out_of_range: '#EEDFD9' };
  const EDGE = '#8C877D';
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = x => Math.round(x * 10) / 10;
  const mix = (hex, to, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.substr(i, 2), 16) * (1 - k) + to * k).toString(16).padStart(2, '0')).join('');

  const steps = spec.steps, n = steps.length, cur = spec.cur;
  const sw = 70, dd = 34, hh = 40;                  // a step's run, its depth, its rise
  const C30 = Math.cos(Math.PI / 6), uid = 'cl-' + String(spec.id).replace(/[^a-z0-9]/gi, '');
  const padL = 34, padT = 58;
  const ox = padL + dd * C30, oy = padT + n * hh - n * sw * .5;
  const P = (x, y, z) => [ox + (x - y) * C30, oy + (x + y) * .5 - z];
  const poly = (pts, fill, sw2 = .8) => `<path d="M${pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z" fill="${fill}" stroke="${EDGE}" stroke-width="${sw2}" stroke-linejoin="round"/>`;
  const out = [];

  /* the stair: each step a block from the ground to its own height, foot to top */
  steps.forEach((s, i) => {
    const x0 = i * sw, x1 = x0 + sw, z = (i + 1) * hh;
    out.push(poly([P(x1, 0, 0), P(x1, dd, 0), P(x1, dd, z), P(x1, 0, z)], SIDE[s.state]));      // riser side, facing right
    out.push(poly([P(x0, dd, 0), P(x1, dd, 0), P(x1, dd, z), P(x0, dd, z)], FRONT[s.state]));   // front face
    out.push(poly([P(x0, 0, z), P(x1, 0, z), P(x1, dd, z), P(x0, dd, z)], TOP[s.state]));       // tread
  });
  /* each step's name under its own foot: the feet step down the page, so the
     names never meet */
  const ground = P(n * sw, dd, 0)[1];
  steps.forEach((s, i) => {
    const xe = P((i + 1) * sw, dd, 0)[0] - 8, ye = P(i * sw + sw * .75, dd, 0)[1] + 15;
    out.push(`<text x="${f1(xe)}" y="${f1(ye)}" text-anchor="end" font-size="8.5" font-weight="600" letter-spacing=".08em" fill="${INK[s.state]}">${H(WORD[s.state].toUpperCase())}</text>`);
    if (s.range) out.push(`<text x="${f1(xe)}" y="${f1(ye + 12)}" text-anchor="end" font-size="9.5" font-family="var(--mono, ui-monospace, Menlo, monospace)" fill="#76736D">${H(s.range)}</text>`);
  });

  /* the walk: from the result along its tread, up each riser, to the goal */
  const yMid = dd * .5;
  const xu = cur * sw + sw * (.14 + .72 * Math.max(0, Math.min(1, spec.frac)));
  const walk = [P(xu, yMid, (cur + 1) * hh)];
  for (let k = cur + 1; k < n; k++) { walk.push(P(k * sw, yMid, k * hh)); walk.push(P(k * sw, yMid, (k + 1) * hh)); }
  const goal = P((n - 1) * sw + sw * .5, yMid, n * hh);
  walk.push(goal);
  /* the walk is dashed, so it draws in through a mask: a solid copy of the same
     path, revealed along its length when the card opens */
  if (cur < n - 1) {
    const d = `M${walk.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}`;
    out.push(`<mask id="${uid}-m" maskUnits="userSpaceOnUse"><path class="cl-draw" d="${d}" pathLength="1" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></mask>`
      + `<path d="${d}" mask="url(#${uid}-m)" fill="none" stroke="${DOT[steps[cur].state]}" stroke-width="1.4" stroke-dasharray="2 3" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  out.push(`<ellipse cx="${f1(goal[0])}" cy="${f1(goal[1])}" rx="11" ry="6.3" fill="none" stroke="#2C4E25" stroke-width="1.3" stroke-dasharray="2 2"/>`);
  out.push(`<text x="${f1(goal[0] + 16)}" y="${f1(goal[1] - 8)}" font-size="12" font-style="italic" font-weight="500" fill="#1A500F">${H(spec.goalWord)}</text>`);

  /* the result: a small sphere on a post, lit like the terrace's pins */
  const st = steps[cur].state, you = walk[0], r = 8, post = 13;
  out.push(`<ellipse cx="${f1(you[0])}" cy="${f1(you[1])}" rx="${f1(r * .7)}" ry="${f1(r * .38)}" fill="#252525" opacity=".18"/>`
    + `<line x1="${f1(you[0])}" y1="${f1(you[1])}" x2="${f1(you[0])}" y2="${f1(you[1] - post + r * .7)}" stroke="#4A4842" stroke-width="1.2" stroke-linecap="round"/>`
    + `<circle cx="${f1(you[0])}" cy="${f1(you[1] - post)}" r="${r}" fill="url(#${uid}-g)" stroke="${mix(DOT[st], 0, .34)}" stroke-width=".6"/>`
    + `<ellipse cx="${f1(you[0] - r * .34)}" cy="${f1(you[1] - post - r * .4)}" rx="${f1(r * .26)}" ry="${f1(r * .19)}" fill="#fff" opacity=".5"/>`);
  out.push(`<text x="${f1(you[0])}" y="${f1(you[1] - post - r - 9)}" text-anchor="middle" font-size="12" font-style="italic" font-weight="500" fill="${INK[st]}">you, ${H(spec.value)}</text>`);

  const togo = n - 1 - cur;
  const aria = `${spec.name}: ${spec.value}${spec.unit ? ' ' + spec.unit : ''}, ${WORD[st].toLowerCase()}, ${togo === 0 ? 'at its goal' : `${togo} step${togo === 1 ? '' : 's'} below the ${spec.goalWord}`}`;
  const VW = Math.ceil(P(n * sw, 0, 0)[0] + 96), VH = Math.ceil(ground + 30);
  return `<svg class="climb-svg" viewBox="0 0 ${VW} ${VH}" width="${VW}" height="${VH}" role="img" aria-label="${H(aria)}">`
    + `<defs><radialGradient id="${uid}-g" cx=".42" cy=".4" r=".66" fx=".33" fy=".3"><stop offset="0" stop-color="${mix(DOT[st], 255, .52)}"/><stop offset=".48" stop-color="${DOT[st]}"/><stop offset="1" stop-color="${mix(DOT[st], 0, .34)}"/></radialGradient></defs>`
    + out.join('') + '</svg>';
}
