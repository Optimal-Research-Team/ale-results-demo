/* ==========================================================================
   View — Annual Longevity Assessment on the Optimal Health Design System.
   Part one (Maya's narrative): hero → section rail → note → longevity target
   → priorities → progress. Part two (explore): samples → body → every result
   → plan → sign-off, plus the drawer and the exam-room deck. The three
   signatures (target, samples, body) are mounted by sig.js after this file.
   Every dynamic string goes through esc.
   ========================================================================== */
const IMG = { hero: '{{HERO}}', canopy: '{{CANOPY}}', wmInv: '{{WM_INV}}', wmWhite: '{{WM_WHITE}}' };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const ORD = ['First', 'Second', 'Third'];
const WORD = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
const spell = n => WORD[n] || String(n);
const HEX = { optimal: '#2C4E25', in_range: '#76736D', borderline: '#C97B2D', out_of_range: '#B3402F' };
const TXT = { optimal: '#1A500F', in_range: '#474747', borderline: '#9A5A1C', out_of_range: '#B3402F' };
const HUE_DARK = { optimal: '#A4C29D', in_range: '#C4BCAE', borderline: '#E0A340', out_of_range: '#E58A7A' }; // text on forest-night
const HUE_DARK_MARK = { optimal: '#A4C29D', in_range: '#8F887C', borderline: '#E0A340', out_of_range: '#E58A7A' }; // dots and marks: in range sits below optimal in luminance
const ICON = {
  cal: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 15 6-6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  dl: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.5v8m0 0 3-3m-3 3-3-3M3 13.5h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.75" stroke="currentColor" stroke-width="1.5"/><path d="m10.5 10.5 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  arrow: '<svg class="arr" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  msg: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.75 4.25c0-.83.67-1.5 1.5-1.5h7.5c.83 0 1.5.67 1.5 1.5v5.5c0 .83-.67 1.5-1.5 1.5H6.5l-2.75 2.25v-2.25h0c-.55 0-1-.45-1-1v-6Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.25 6.5 5 3.75 7.75 6.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dn: '<svg viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.25 3.5 5 6.25 7.75 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  flat: '<svg viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.5 5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const MQ = { phone: matchMedia('(max-width: 640px)'), narrow: matchMedia('(max-width: 900px)'), xs: matchMedia('(max-width: 360px)'), reduce: matchMedia('(prefers-reduced-motion: reduce)') };
/* Motion only when it can be driven and nobody asked for less of it. Webdriver
   (screenshots, thumbnails) always gets the settled final state. */
const MOTION = 'IntersectionObserver' in window && !MQ.reduce.matches && !navigator.webdriver;
document.documentElement.classList.toggle('motion', MOTION);
const behavior = () => (MOTION ? 'smooth' : 'auto');

const isOrd = mv => mv.marker.valueType === 'ordinal';
const valText = (mv, p) => (p == null ? '—' : isOrd(mv) ? p.valueText : fmtT(p.value, mv.marker.precision));
const unitOf = mv => (isOrd(mv) ? '' : mv.marker.unit);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const monthDay = iso => { const [, m, d] = ymd(iso); return `${MONTHS[m - 1]} ${d}`; };
const needs = s => s === 'borderline' || s === 'out_of_range';
const firstPt = mv => mv.points.find(p => p.value != null);
const dayNum = iso => { const [y, m, d] = ymd(iso); return Date.UTC(y, m - 1, d) / 864e5; };
const pad2 = n => String(n).padStart(2, '0');
/* Whether this page can hand the viewer a file at all. A framed or hosted page
   cannot, so the calendar file is never offered there as if it could. Read at
   the moment it matters rather than cached, because a host can announce itself
   after this script has run. */
function canSaveFile() {
  try { if (window.top !== window.self) return false; } catch (x) { return false; }
  if (window.claude) return false; // an artifact host mediates every save
  return typeof document.createElement('a').download === 'string';
}
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; })();
/** "In 10 weeks" — plain calendar arithmetic from today to a booked date. */
function countdown(iso) {
  const n = dayNum(iso) - dayNum(TODAY);
  if (n < 0) return ''; if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow';
  if (n < 14) return `In ${n} days`;
  if (n <= 91) return `In ${Math.round(n / 7)} weeks`;
  return `In ${Math.round(n / 30.44)} months`;
}
/** Borderline and out of range read as chrome chips; optimal and in range as dot + word. */
const stateTag = (s, cls = '') => `<span class="${needs(s) ? 'chip' : 'state'} s-${s}${cls ? ' ' + cls : ''}"><span class="dot bg-${s}"></span>${esc(STATE_LABEL[s])}</span>`;
const dotWord = s => `<span class="state s-${s}"><span class="dot bg-${s}"></span>${esc(STATE_LABEL[s])}</span>`;
const arrowVals = (mv, a, b) => `${esc(valText(mv, a))} → ${esc(valText(mv, b))}`;

/* ---------- ranges ---------- */
const inBand = (x, v) => v >= x.lo && (v < x.hi || x.open);
const goalOf = mv => (isOrd(mv) ? null : goalBand(mv.bands));
/* Green means optimal and nothing else: markers without a clinic target show the lab range in grey. */
const isTarget = g => !!g && g.state === 'optimal';
const goalWord = mv => (isTarget(goalOf(mv)) ? 'Target' : 'Lab range');
function targetText(mv) {
  const g = goalOf(mv); if (!g) return '';
  const [a, b] = mv.bands.domain, p = mv.marker.precision;
  if (g.lo <= a) return `below ${fmtT(g.hi, p)}`;
  if (g.open || g.hi >= b) return `above ${fmtT(g.lo, p)}`;
  return `${fmtT(g.lo, p)}–${fmtT(g.hi, p)}`;
}
/** Plain arithmetic on the bands already shown: how far the value sits from the target. */
function distParts(mv) {
  const g = goalOf(mv); if (!g) return null;
  const v = mv.latest.value; if (inBand(g, v)) return null;
  return { n: fmtNum(v < g.lo ? g.lo - v : v - g.hi, mv.marker.precision), u: unitOf(mv), dir: v < g.lo ? 'below' : 'above' };
}
const distLine = mv => { const d = distParts(mv); return d ? `${d.n} ${d.u} ${d.dir} target` : ''; };
function bandPhrase(mv, x) {
  const [a, b] = mv.bands.domain, p = mv.marker.precision;
  if (x.lo <= a) return `below ${fmtT(x.hi, p)}`;
  if (x.open || x.hi >= b) return `above ${fmtT(x.lo, p)}`;
  return `${fmtT(x.lo, p)}–${fmtT(x.hi, p)}`;
}
function rangeText(mv, x) {
  const [a, b] = mv.bands.domain, p = mv.marker.precision, u = unitOf(mv);
  if (x.lo <= a) return `Below ${fmtT(x.hi, p)} ${u}`;
  if (x.open || x.hi >= b) return `${fmtT(x.lo, p)} ${u} and above`;
  return `${fmtT(x.lo, p)}–${fmtT(x.hi, p)} ${u}`;
}
/** What the rail shows, as a sentence for screen readers (the rail itself is aria-hidden). */
function railSentence(mv, withPrev = false) {
  const s = STATE_LABEL[mv.latest.state].toLowerCase();
  if (isOrd(mv)) return `${mv.latest.valueText}, ${s}.`;
  const parts = bandList(mv.bands).map((x, i) => `${i ? STATE_LABEL[x.state].toLowerCase() : STATE_LABEL[x.state]} ${bandPhrase(mv, x)}`);
  return `${valText(mv, mv.latest)} ${unitOf(mv)}, ${s}. ${parts.join('; ')}.${withPrev && mv.previous ? ` Last year ${valText(mv, mv.previous)}.` : ''}`;
}

/* Range rail: quiet base, raised target (green) or lab range (grey), tinted
   borderline, hatched out of range, and a state-coloured marker kept inside
   its own zone. Annotations are laid out in px by layRB(). */
const sameBand = (x, y) => !!x && !!y && x.lo === y.lo && x.hi === y.hi;
function rangeBar(mv, { size = 'md', ticks = false, prev = false, target = false, zones = false, glide = false, dark = false } = {}) {
  const col = s => (dark ? HUE_DARK[s] : HEX[s]), hue = s => (dark ? HUE_DARK[s] : TXT[s]);
  if (isOrd(mv)) {
    const cur = mv.latest.value, st = mv.bands.stepStates;
    const segs = mv.bands.steps.map((t, i) => `<i class="${st[i] === 'optimal' ? 'tg' : needs(st[i]) ? 'z-' + st[i] : ''}${i === cur ? ' cur' : ''}"></i>`).join('');
    const labs = ticks ? `<div class="rb-sl">${mv.bands.steps.map((t, i) => `<span${i === cur ? ` class="on" style="color:${hue(mv.latest.state)}"` : ''}>${esc(t)}</span>`).join('')}</div>` : '';
    return `<div class="rb ord ${size}" data-lay aria-hidden="true"><div class="rb-track"><div class="rb-steps">${segs}</div><span class="mk" style="left:${(((cur + 0.5) / st.length) * 100).toFixed(2)}%;background:${col(mv.latest.state)}"></span></div>${labs}</div>`;
  }
  const [a, b] = mv.bands.domain, bl = bandList(mv.bands), g = goalBand(mv.bands), p = mv.marker.precision;
  const P = v => clamp((v - a) / (b - a), 0, 1) * 100, f2 = x => x.toFixed(2);
  const zoneOf = v => bl.find(x => inBand(x, v)) || (v < a ? bl[0] : bl[bl.length - 1]);
  const zAttr = x => `data-zl="${f2(P(x.lo))}" data-zr="${f2(P(x.hi))}"`;
  const v = mv.latest.value, cz = zoneOf(v);
  let z = '';
  bl.forEach(x => {
    const l = P(x.lo), w = P(x.hi) - l, isG = sameBand(x, g);
    const cls = isG ? (isTarget(g) ? 'tg' : 'lab') : needs(x.state) ? 'z-' + x.state : '';
    if (cls) z += `<span class="z ${cls}${l <= 0.01 ? ' e0' : ''}${l + w >= 99.99 ? ' e1' : ''}${x === cz ? ' on' : ''}" style="left:${f2(l)}%;width:${f2(w)}%"></span>`;
  });
  const cp = P(v);
  let pv = '', pvl = '', from = null;
  if (mv.previous) {
    const pp = P(mv.previous.value);
    if (glide) from = pp;
    if (prev && Math.abs(pp - cp) >= 3) {
      pv = `<span class="pv" data-x="${f2(pp)}" ${zAttr(zoneOf(mv.previous.value))} style="left:${f2(pp)}%"></span>`;
      pvl = `<span class="pvl num">${zones ? 'Last year' : esc(formatYear(mv.previous.examDate))}</span>`;
    }
  }
  const mk = `<span class="mk" data-x="${f2(cp)}" ${zAttr(cz)} style="left:${f2(cp)}%;background:${col(mv.latest.state)}"${from != null ? ` data-from="${f2(from)}"` : ''}></span>`;
  let above = '', below = '';
  if (zones) above = bl.map(x => { const on = x === cz, c = f2((P(x.lo) + P(x.hi)) / 2); return `<span class="zn${on ? ' on' : ''}" data-c="${c}" data-w="${f2(P(x.hi) - P(x.lo))}" style="left:${c}%${on ? ';color:' + hue(x.state) : ''}">${esc(STATE_LABEL[x.state])}</span>`; }).join('');
  if (ticks || target) {
    const tcOn = target && !!g, isEdge = t => !!g && (Math.abs(t - g.lo) < 1e-9 || Math.abs(t - g.hi) < 1e-9);
    // the boundary of the patient's zone that faces the goal: the line that decides the state
    let prot = null;
    if (g && !sameBand(cz, g)) { prot = cz.hi <= g.lo ? cz.hi : cz.lo; if (tcOn && isEdge(prot)) prot = null; }
    const tk = ticks ? bl.slice(1).map(x => x.lo).filter(t => !(tcOn && isEdge(t)))
      .map(t => `<span class="tk num${prot != null && Math.abs(t - prot) < 1e-9 ? ' prot' : ''}" data-at="${f2(P(t))}" style="left:${f2(P(t))}%">${esc(fmtT(t, p))}</span>`).join('') : '';
    const gc = g ? f2((P(g.lo) + P(g.hi)) / 2) : '0';
    below = (tcOn ? `<span class="tc num" data-c="${gc}" style="left:${gc}%${dark ? '' : ';color:' + (isTarget(g) ? '#1A500F' : '#474747')}">${goalWord(mv)} ${esc(targetText(mv))}</span>` : '') + tk;
  }
  // last year's label rides above the rail, or below it when zone names own the space above
  if (pvl) { if (zones) below += pvl; else above += pvl; }
  return `<div class="rb ${size}" data-lay aria-hidden="true">${above ? `<div class="rb-above">${above}</div>` : ''}<div class="rb-track"><span class="base"></span>${z}${pv}${mk}</div>${below ? `<div class="rb-below">${below}</div>` : ''}</div>`;
}

/* ---------- line charts — drawn at real pixel size into .lc placeholders ---------- */
const CH = {
  card: { padT: 24, padB: 22, padL: 4, padR: 10, yr: 11, sub: 11.5, last: 13, bandLabel: false, labels: 'ends', lastSide: true, area: true, yrs: 'ends', force: true },
  mini: { padT: 6, padB: 6, padL: 5, padR: 5, yr: 0, labels: 'none', midPts: false, stub: true },
  drawer: { padT: 16, padB: 28, padL: 34, padR: 10, yr: 11, sub: 11.5, last: 13, bandLabel: true, labels: 'all', grid: true },
  tv: { padT: 64, padB: 56, padL: 10, padR: 16, yr: 20, sub: 24, last: 30, bandLabel: true, labels: 'notlast', gap: true, force: true },
  tvs: { padT: 12, padB: 34, padL: 8, padR: 8, yr: 19, sub: 20, last: 26, bandLabel: false, labels: 'none', yrs: 'ends', force: true },
};
function gridTicks(lo, hi) {
  const span = hi - lo; let best = null;
  for (const m of [1, 1.5, 2, 2.5, 3, 5]) for (let e = -3; e <= 4; e++) {
    const step = m * 10 ** e, t = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) t.push(+v.toFixed(6));
    const score = Math.abs(t.length - 3) * 2 + (t.length < 3 ? 1 : 0) + (m === 1.5 || m === 3 ? 0.5 : 0);
    if (!best || score < best.score || (score === best.score && step > best.step)) best = { score, step, t };
  }
  return best.t.length > 4 ? best.t.filter((_, i) => i % 2 === 0) : best.t;
}
let GID = 0;
function lineChart(mv, { w, h, variant = 'card' } = {}) {
  const c = CH[variant] || CH.card, dark = variant.startsWith('tv');
  const pts = mv.points.filter(p => p.value != null);
  const n = EXAM_DATES.length, g = goalOf(mv), tg = isTarget(g);
  const lastTxt = pts.length ? valText(mv, pts[pts.length - 1]) : '';
  const padR = c.lastSide ? Math.max(c.padR, Math.ceil(lastTxt.length * c.last * 0.6) + 12) : c.padR;
  const iw = w - c.padL - padR, ih = h - c.padT - c.padB;
  const X = i => c.padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const vals = pts.map(p => p.value);
  let a = Math.min(...vals), b = Math.max(...vals);
  let far = 0; // -1 the target sits below the frame, +1 above it
  if (g) {
    const span = Math.max(b - a, Math.abs(b) * 0.12), reach = span * 2;
    if (g.hi <= a) { if (a - g.hi <= reach) a = g.hi; else far = -1; }
    else if (g.lo >= b) { if (g.lo - b <= reach) b = g.lo; else far = 1; }
  }
  const pad = (b - a || Math.abs(b) || 1) * 0.28, lo = a - pad, hi = b + pad;
  const Y = v => c.padT + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const top = c.padT, bot = c.padT + ih;
  const col = dark
    ? { line: '#FFFCF7', sub: 'rgba(255,252,247,.66)', strong: '#FFFCF7', base: 'rgba(255,252,247,.22)', fill: tg ? 'rgba(164,194,157,.24)' : 'rgba(255,252,247,.08)', edge: tg ? 'rgba(164,194,157,.7)' : 'rgba(255,252,247,.35)', lab: 'rgba(255,252,247,.85)', bg: '#1C3118', grid: 'rgba(255,252,247,.08)' }
    : { line: '#2C4E25', sub: '#76736D', strong: '#252525', base: '#DDDCDB', fill: tg ? 'rgba(135,164,130,.20)' : 'rgba(118,115,109,.12)', edge: tg ? 'rgba(44,78,37,.38)' : 'rgba(118,115,109,.40)', lab: tg ? '#1A500F' : '#474747', bg: '#FFFCF7', grid: '#EEEAE3' };
  const P = pts.map(p => [X(EXAM_DATES.indexOf(p.examDate)), Y(p.value)]);
  const font = 'font-family="Inter,sans-serif"';
  const T = (x, y, s, fs, fill, anchor = 'start', weight = 400, cls = '') => `<text${cls ? ` class="${cls}"` : ''} x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="${fs}" font-weight="${weight}" fill="${fill}" ${font} style="font-variant-numeric:tabular-nums">${esc(s)}</text>`;
  const HL = (y, stroke, sw = 1) => `<line x1="${c.padL}" x2="${(c.padL + iw).toFixed(1)}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${stroke}" stroke-width="${sw}"/>`;
  let out = '', defs = '';
  if (c.grid) {
    const gt = gridTicks(lo, hi), gd = Math.max(...gt.map(decimals));
    gt.forEach(v => { const y = Y(v); if (y < top - 0.5 || y > bot + 0.5) return; out += HL(y, col.grid) + T(c.padL - 8, y + 4, fmtNum(v, gd), 11, col.sub, 'end'); });
  }
  // goal band: the only tint; edge only on the side(s) facing the data
  let label = null, gapBox = null;
  if (g) {
    const gy1 = g.open ? -Infinity : Y(g.hi), gy2 = Y(g.lo);
    let y1 = clamp(gy1, top, bot), y2 = clamp(gy2, top, bot);
    // a band that reads as a hairline reads as nothing: give it 10 px, inside the plot
    if (y2 - y1 > 1 && y2 - y1 < 10) { if (y2 >= bot - 0.5) y1 = y2 - 10; else y2 = Math.min(bot, y1 + 10); }
    const ew = dark ? 1.5 : 1;
    const fs = variant === 'tv' ? 21 : c.sub;
    if (y2 - y1 > 1) {
      out += `<rect class="band" x="${c.padL}" y="${y1.toFixed(1)}" width="${iw.toFixed(1)}" height="${(y2 - y1).toFixed(1)}" fill="${col.fill}"/>`;
      if (y1 > top + 0.5) out += HL(y1, col.edge, ew);
      if (y2 < bot - 0.5) out += HL(y2, col.edge, ew);
      if (c.bandLabel) {
        const bh = y2 - y1, atBot = y2 >= bot - 0.5 && y1 > top + 0.5, fits = bh >= fs + 14;
        let y;
        if (atBot) y = fits ? y2 - 8 : y1 - 8;
        else if (y1 <= top + 0.5 && y2 < bot - 0.5) y = fits ? y1 + 7 + fs * 0.78 : y2 + 8 + fs * 0.78;
        else y = fits ? y1 + 7 + fs * 0.78 : y1 - 8;
        label = { y, fs, txt: `${tg ? 'Target' : 'Lab range'} ${targetText(mv)}` };
      }
    } else if (c.stub) {
      const below = gy2 >= bot, sy = below ? bot - 6 : top;
      out += `<rect x="${c.padL}" y="${sy.toFixed(1)}" width="${iw.toFixed(1)}" height="6" fill="${col.fill}"/>` + HL(below ? sy : sy + 6, col.edge);
    }
  }
  /* The target is off the scale (Ferritin: target 50-80 against a value of
     174). A sliver at the edge would read as "nearly there", so the edge is
     dashed and says which way the target lies. */
  if (far && c.bandLabel) {
    const ey = far < 0 ? bot - 1 : top + 1, fs = variant === 'tv' ? 21 : c.sub;
    out += `<line x1="${c.padL}" x2="${(c.padL + iw).toFixed(1)}" y1="${ey.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${col.edge}" stroke-width="${dark ? 1.5 : 1}" stroke-dasharray="4 4"/>`;
    out += T(c.padL + 8, far < 0 ? ey - 7 : ey + 7 + fs * 0.78, `${tg ? 'Target' : 'Lab range'} ${targetText(mv)} ${far < 0 ? '\u2193' : '\u2191'}`, fs, col.lab, 'start', 600);
  }
  // gap to target (exam-room priority slides): a dashed drop from today's value to the band edge
  const lastP = pts[pts.length - 1], [lx, ly] = P[P.length - 1];
  let gap = '';
  if (c.gap && g && distParts(mv)) {
    const edge = lastP.value >= g.hi ? g.hi : g.lo, ey = clamp(Y(edge), top, bot), hue = HUE_DARK[lastP.state];
    const yA = ey > ly ? ly + 13 : ly - 13, my = (yA + ey) / 2, txt = distLine(mv), gw = txt.length * 21 * 0.54;
    gap = `<g class="gap"><line x1="${lx.toFixed(1)}" x2="${lx.toFixed(1)}" y1="${yA.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${hue}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/><line x1="${(lx - 9).toFixed(1)}" x2="${(lx + 9).toFixed(1)}" y1="${ey.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${hue}" stroke-width="2" stroke-linecap="round"/>${T(lx - 18, my + 7, txt, 21, hue, 'end', 500)}</g>`;
    gapBox = [lx - 18 - gw, my - 16, lx, my + 10];
  }
  if (label) {
    const wEst = label.txt.length * label.fs * 0.56;
    const hit = x0 => P.some(([px, py]) => px > x0 - 10 && px < x0 + wEst + 10 && py > label.y - label.fs - 8 && py < label.y + 8)
      || (gapBox && x0 + wEst > gapBox[0] && x0 < gapBox[2] && label.y > gapBox[1] && label.y - label.fs < gapBox[3]);
    let x = c.padL + 8, anchor = 'start';
    if (hit(x) && !hit(c.padL + iw - 8 - wEst)) { x = c.padL + iw - 8; anchor = 'end'; }
    out += T(x, label.y, label.txt, label.fs, col.lab, anchor, 600);
  }
  // baseline, soft area, line, points
  out += HL(bot + 0.5, col.base);
  const d = P.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
  if (c.area && P.length > 1) {
    const id = 'ga' + ++GID;
    defs += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C4E25" stop-opacity=".10"/><stop offset="1" stop-color="#2C4E25" stop-opacity="0"/></linearGradient>`;
    out += `<path class="ar" d="${d} L${lx.toFixed(1)} ${bot.toFixed(1)} L${P[0][0].toFixed(1)} ${bot.toFixed(1)} Z" fill="url(#${id})"/>`;
  }
  if (P.length > 1) out += `<path class="ln" pathLength="1" d="${d}" fill="none" stroke="${col.line}" stroke-width="${dark ? 3 : 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
  out += gap;
  pts.forEach((p, i) => {
    const last = i === pts.length - 1, [cx, cy] = P[i];
    if (!last && i !== 0 && c.midPts === false) return;
    if (last) out += `<circle class="lp" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${variant === 'mini' ? 3.75 : dark ? 8 : 5}" fill="${dark ? HUE_DARK[p.state] : HEX[p.state]}" stroke="${col.bg}" stroke-width="${dark ? 3 : 2.5}"/>`;
    else out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${dark ? 5 : 2.75}" fill="${col.bg}" stroke="${col.line}" stroke-width="${dark ? 2.5 : 1.5}"/>`;
    const mode = c.labels;
    if (mode === 'none' || (mode === 'ends' && !last && i !== 0) || (mode === 'notlast' && last)) return;
    const fs = last ? c.last : c.sub;
    const lastCol = dark ? HUE_DARK[p.state] : TXT[p.state];
    if (last && c.lastSide) { out += T(cx + 10, cy + fs * 0.36, valText(mv, p), fs, lastCol, 'start', 600, 'lv'); return; }
    const nb = [P[i - 1], P[i + 1]].filter(Boolean).map(q => q[1]);
    let above = !(nb.length && nb.every(y => y < cy - 1));
    if (!above && cy + 10 + fs > bot) above = true;
    if (above && cy - 10 - fs < 0) above = false;
    const off = last ? (dark ? 16 : 11) : dark ? 14 : 9;
    const ty = above ? cy - off : cy + off + fs * 0.74;
    const anchor = P.length === 1 ? 'middle' : i === 0 ? 'start' : last ? 'end' : 'middle';
    const tx = i === 0 && P.length > 1 ? Math.max(cx - 2, 0) : last && P.length > 1 ? Math.min(cx + 2, w) : cx;
    out += T(tx, ty, valText(mv, p), fs, last ? lastCol : col.sub, anchor, last ? 600 : 400);
  });
  const plotted = new Set(pts.map(p => EXAM_DATES.indexOf(p.examDate)));
  if (c.yr) EXAM_DATES.forEach((e, i) => {
    if (c.yrs === 'ends' && i !== 0 && i !== n - 1 && !plotted.has(i)) return;
    const anchor = i === 0 ? 'start' : i === n - 1 ? (c.lastSide ? 'middle' : 'end') : 'middle';
    out += T(X(i), h - (dark ? 10 : 6), formatYear(e), c.yr, col.sub, anchor);
  });
  const aria = `${mv.marker.name}: ${pts.map(p => `${valText(mv, p)} in ${formatYear(p.examDate)}`).join(', ')}.${g ? ` ${tg ? 'Target' : 'Lab range'} ${targetText(mv)}.` : ''}`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(aria)}">${defs ? `<defs>${defs}</defs>` : ''}${out}</svg>`;
}
/* Ledger "since 2025" sparkline: 56×20, the line plus a dashed reference at
   the nearest target edge only when today's value sits outside it. */
const TREND = { improved: 'Improved', steady: 'Steady', worsened: 'Further from target', new: 'New' };
function spark(mv) {
  const W = 56, H = 20;
  if (mv.carriedForward) return `<span class="tw tw-once">Once · ${esc(formatYear(mv.latest.examDate))}</span>`;
  const word = `<span class="tw tw-${mv.trend}">${TREND[mv.trend]}</span>`;
  if (isOrd(mv)) return `<svg class="sp" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><line x1="3" x2="${W - 3}" y1="10" y2="10" stroke="#A9A49B" stroke-width="1.25" stroke-dasharray="1.5 3.5" stroke-linecap="round"/></svg>${word}`;
  const pts = mv.points.filter(p => p.value != null);
  if (pts.length < 2) return `<span class="sp-none" aria-hidden="true"></span>${word}`;
  const vs = pts.map(p => p.value), g = goalOf(mv), e = pts[pts.length - 1], s = pts[0];
  let lo0 = Math.min(...vs), hi0 = Math.max(...vs), edge = null;
  if (g && !inBand(g, e.value)) {
    edge = e.value >= g.hi ? g.hi : g.lo;
    const sp0 = Math.max(hi0 - lo0, Math.abs(hi0) * 0.1);
    if (edge < lo0 - sp0 * 1.6 || edge > hi0 + sp0 * 1.6) edge = null;
    else { lo0 = Math.min(lo0, edge); hi0 = Math.max(hi0, edge); }
  }
  // y-span never smaller than 22% of the marker's visual domain: a steady result draws a nearly flat line
  const [d0, d1] = mv.bands.domain, minSpan = (d1 - d0) * 0.22, mid = (lo0 + hi0) / 2, span = Math.max((hi0 - lo0) * 1.3, minSpan);
  const lo = mid - span / 2, hi = mid + span / 2;
  const X = p => 4 + (EXAM_DATES.indexOf(p.examDate) / (EXAM_DATES.length - 1)) * (W - 8);
  const Y = v => H - 3 - ((v - lo) / (hi - lo)) * (H - 6);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p).toFixed(1) + ' ' + Y(p.value).toFixed(1)).join(' ');
  const ref = edge == null ? '' : `<line x1="0" x2="${W}" y1="${Y(edge).toFixed(1)}" y2="${Y(edge).toFixed(1)}" stroke="${isTarget(g) ? 'rgba(44,78,37,.55)' : 'rgba(118,115,109,.55)'}" stroke-dasharray="2 2"/>`;
  return `<svg class="sp" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${ref}<path d="${d}" fill="none" stroke="#474747" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${X(s).toFixed(1)}" cy="${Y(s.value).toFixed(1)}" r="2" fill="#F0EDE5" stroke="#474747" stroke-width="1.25"/><circle cx="${X(e).toFixed(1)}" cy="${Y(e.value).toFixed(1)}" r="3.5" fill="${HEX[e.state]}"/></svg>${word}`;
}

/* ---------- data for the page ---------- */
const V = VIEW, S = V.summary, VER = V.version;
const attention = S.byState.borderline + S.byState.out_of_range;
const paras = VER.summary.split(/\n\s*\n/).map(t => t.trim()).filter(Boolean);
const wins = MARKERS.filter(m => m.trend === 'improved' && !isOrd(m) && m.previous)
  .map(m => ({ m, first: firstPt(m) }))
  .sort((a, b) => Math.abs((b.m.latest.value - b.first.value) / b.first.value) - Math.abs((a.m.latest.value - a.first.value) / a.first.value))
  .slice(0, 8).map(x => x.m);
const winsPage = wins.slice(0, 4); // v5: the page shows four, the deck six, the ledger all of them
const COLLECTED = formatLongDate(V.report.collectedAt.slice(0, 10));
const PUBLISHED = formatLongDate(V.report.publishedAt.slice(0, 10));
const YEAR = formatYear(V.report.examDate);
const PREV_YEAR = formatYear(PREV_EXAM);
const nP = VER.priorities.length;
const winsUseLab = winsPage.some(m => !isTarget(goalOf(m)));
const attnSystems = SYSTEMS.filter(s => needs(s.worst));
/* Names every state that needs attention, worst first ("1 out of range · 2
   borderline"), so severity never rides on colour alone. Moved here from
   body3d.js, which v7 retires. */
function statusOf(s) {
  const b = s.byState || {};
  if (b.out_of_range || b.borderline) return [b.out_of_range ? `${b.out_of_range} out of range` : '', b.borderline ? `${b.borderline} borderline` : ''].filter(Boolean).join(' · ');
  const present = STATE_ORDER.filter(k => b[k]);
  if (!present.length) return s.worst ? STATE_LABEL[s.worst] : '';
  if (present.length === 1) return b[present[0]] === 1 ? STATE_LABEL[present[0]] : 'All ' + STATE_LABEL[present[0]].toLowerCase();
  return present.map(k => `${b[k]} ${STATE_LABEL[k].toLowerCase()}`).join(', ');
}
const sysStatus = s => statusOf(s); // "3 need attention" · "All in range" · "2 optimal, 1 in range"
const SYS_BY = Object.fromEntries(SYSTEMS.map(s => [s.system, s]));

/* Sample containers (presentational grouping, not medical data; lab
   confirmation pending, DESIGN-DIRECTION-v5 §16.2). Counts come from MARKERS. */
const SAMPLE_OF = m => m.marker.system === 'urine' ? 'urine' : m.marker.id === 'glu' ? 'fluoride'
  : (m.marker.system === 'blood' || m.marker.id === 'a1c') ? 'edta' : 'sst';
const SAMPLE_KIND = {
  sst: { cap: 'gold', label: 'Serum', tube: 'Gold top', hex: '#C9A04A' },
  edta: { cap: 'lavender', label: 'Whole blood', tube: 'Lavender top', hex: '#A696C8' },
  fluoride: { cap: 'grey', label: 'Plasma', tube: 'Grey top', hex: '#8E918C' },
  urine: { cap: 'urine', label: 'Urine', tube: 'Specimen cup', hex: '#E9CF84' },
};
const lcFirst = s => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const CARRIED = MARKERS.filter(m => m.carriedForward); // e.g. Lp(a): measured once, in an earlier draw
const SAMPLES = ['sst', 'edta', 'fluoride', 'urine'].map(id => {
  const ms = MARKERS.filter(m => !m.carriedForward && SAMPLE_OF(m) === id);
  const systems = SYSTEMS.map(s => ({ s, in: ms.filter(m => m.marker.system === s.system) })).filter(x => x.in.length)
    .map(x => x.in.length === x.s.markerIds.length ? x.s.label : `${x.s.label} (${x.in.map(m => lcFirst(m.marker.name)).join(', ')})`);
  return Object.assign({ id, markerCount: ms.length, states: ms.map(m => m.latest.state), systems, ids: ms.map(m => m.marker.id) }, SAMPLE_KIND[id]);
}).filter(c => c.markerCount);
const SAMPLE_DATE = (() => { const [y, m, d] = ymd(V.report.collectedAt.slice(0, 10)); return `${d} ${MONTHS[m - 1].slice(0, 3).toUpperCase()} ${y}`; })();
const tileStrip = (states, cls = 'tiles') => `<span class="${cls}" aria-hidden="true">${STATE_ORDER.map(s => `<i class="t-${s}"></i>`.repeat(states.filter(x => x === s).length)).join('')}</span>`;
const countsLine = states => STATE_ORDER.filter(s => states.includes(s)).map(s => `<span class="s-${s} nw">${states.filter(x => x === s).length} ${esc(STATE_LABEL[s].toLowerCase())}</span>`).join('<span class="sep"> · </span>');
const countsText = states => STATE_ORDER.filter(s => states.includes(s)).map(s => `${states.filter(x => x === s).length} ${STATE_LABEL[s].toLowerCase()}`).join(', ');

/** Mini spectrum for a body-system group: one tile per marker (ledger groups, the body map list). */
function miniSpec(g) {
  const c = emptyCounts(); g.forEach(m => c[m.latest.state]++);
  return `<span class="g-spec" aria-hidden="true">${STATE_ORDER.map(s => `<i class="t-${s}"></i>`.repeat(c[s])).join('')}</span>`;
}

/* Ambient loops. They are decoration over a ground that already works, so
   each is muted, inert, lazy and absent under reduced motion - the still
   beneath carries the design on its own. */
const MEDIA = { rings: 'media/rings.mp4', canopy: 'media/canopy.mp4', tubes: 'media/tubes.mp4' };
const loopVideo = (key, cls = '') => (MOTION
  ? `<video class="loop${cls ? ' ' + cls : ''}" src="${MEDIA[key]}" autoplay muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>`
  : '');

/* The engraved organ plates. Each system that has one shows it; a system
   without one simply shows none, so the set can land a piece at a time. The
   hormones plate follows the patient's sex, the way its anchor already does. */
const plateFor = id => {
  const k = id === 'hormones' ? `hormones-${(V.patient.sex || 'M').toLowerCase()}` : id;
  return (typeof PLATES !== 'undefined' && (PLATES[k] || PLATES[id])) || '';
};
const plateImg = (id, cls = '') => {
  const src = plateFor(id);
  if (!src) return '';
  const sy = SYS_BY[id];
  return `<span class="plate-wrap${sy ? ' s-' + sy.worst : ''}${cls ? ' ' + cls : ''}" aria-hidden="true">`
    + `<img class="plate" src="${src}" alt="" loading="lazy" decoding="async"></span>`;
};

/* ---------- sections ---------- */

/* SIGNATURE 1 · The Living Scan. The patient's own body map as the hero: a
   voxel figure, its scanner HUD and its reticles are mounted by sig.js
   (mountScan); this builds the pinned track, the two copy states the laser
   prints, and the accessible summary that stands in for the figure. The scan
   absorbs v6's "system by system" section, so the reticles are the body map. */
const shortMonthDay = iso => { const [, m, d] = ymd(iso); return `${MONTHS[m - 1].slice(0, 3)} ${d}`; };
const NEXT_VISIT = VER.nextSteps.find(n => n.due === VER.retestDate) || null;
/* italicise one noun inside a frozen clinical title: styling only, never a rewrite */
const emNoun = (text, noun) => { const i = noun ? text.indexOf(noun) : -1; return i < 0 ? esc(text) : `${esc(text.slice(0, i))}<em>${esc(noun)}</em>${esc(text.slice(i + noun.length))}`; };
const SCAN_SUMMARY = `Body map: ${SYSTEMS.length} systems. ` + (attnSystems.length
  ? `${spell(attnSystems.length)} need${attnSystems.length === 1 ? 's' : ''} attention: ${attnSystems.map(s => `${s.label}, ${sysStatus(s)}`).join('; ')}.`
  : 'Nothing needs attention.');
function nextVisit() {
  if (!NEXT_VISIT) return '';
  return `<a class="sc-next" href="#plan"><span class="sc-nk">Next</span><span class="sep"> · </span><span class="num">${esc(shortMonthDay(NEXT_VISIT.due))}</span><span class="sep"> · </span><span class="sc-nt">${esc(NEXT_VISIT.title)}</span>${ICON.arrow}</a>`;
}
/* ==========================================================================
   ?hero=rings - The Section. A cross-cut of trunk: every growth ring is a
   year, so the hero is the patient's record of time rather than a picture of
   their body. The wood is only the ground; the rings, the systems and the
   markers are all drawn, so nothing depends on where the photograph's own
   rings happen to fall. Scrolling travels outward, 2024 to today.
   ========================================================================== */
const RING_YEARS = EXAM_DATES.map(d => ({ date: d, year: formatYear(d) }));
const R_AT = [0.50, 0.685, 0.87];                       // ring radius per year, of the disc
/* ?hero=target - the longevity target IS the hero. The one piece of this
   product nobody else has, it answers "am I okay" in a glance, and it is pure
   vector, so it is exact on a 75-inch screen and on a 360 px phone with no
   mesh, photograph, video or fallback behind it. Scrolling turns the year.
   The copy is deliberately spare: the chart already says 33 of 39. */
function targetHero() {
  const p1 = VER.priorities[0], mv1 = BY_ID[p1.biomarkerIds[0]], dp1 = distParts(mv1);
  return `<section id="scan" class="s-scan s-thero" aria-labelledby="thH">
  <div class="scan-track"><div class="scan-frame">
    <canvas class="th-hatch" id="thHatch" aria-hidden="true"></canvas>
    <figure class="th-fig">
      <div class="th-chart" id="bxHero"></div>
      <figcaption class="th-cap"><span class="th-yr" id="thYr" aria-hidden="true"><span class="on">${esc(PREV_YEAR)}</span><i></i><span>${esc(YEAR)}</span></span>
        <span class="th-hint"><span class="tp">Tap</span><span class="hv">Select</span> a dot for its history</span></figcaption>
    </figure>
    <div class="scan-copy" data-state="A">
      <div class="sc-cA">
        <p class="eyebrow">${esc(PRODUCT_NAME)} · ${esc(YEAR)}</p>
        <h1 id="thH">${esc(VER.headline)}${VER.headlineEmphasis ? ` <em>${esc(VER.headlineEmphasis)}</em>` : ''}</h1>
        <div class="byline"><span class="avatar" aria-hidden="true">${esc(V.clinician.initials)}</span><span>Reviewed by <b>${esc(NP_NAME)}</b><br><span class="num">${esc(PUBLISHED)}</span></span></div>
        ${nextVisit()}
      </div>
      <div class="sc-cB" aria-hidden="true">
        <p class="eyebrow">Your first priority · ${esc(SYSTEM_LABEL[mv1.marker.system])}</p>
        <h2 class="d2">${emNoun(p1.title, mv1.marker.name)}</h2>
        <div class="sc-val"><span class="v num">${esc(valText(mv1, mv1.latest))}</span><span class="u">${esc(unitOf(mv1))}</span>${stateTag(mv1.latest.state)}${dp1 ? `<span class="sc-d">${esc(distLine(mv1))}</span>` : ''}</div>
        <div class="sc-blinks"><button type="button" class="sc-why" data-prio-sheet="0">Why, and what we'll do ${ICON.arrow}</button><a class="textlink" href="#priorities">Your three priorities ${ICON.chev}</a></div>
      </div>
    </div>
    <p class="sc-foot"><a href="#priorities">Your first priority · ${esc(p1.title)} ${ICON.arrow}</a></p>
  </div></div>
</section>`;
}

function ringsHero() {
  const p1 = VER.priorities[0], mv1 = BY_ID[p1.biomarkerIds[0]], dp1 = distParts(mv1);
  const stats = [[S.healthy, 'healthy'], [attention, 'to watch'], [nP, 'priorities']];
  const C = 500, TAU = Math.PI * 2, N = SYSTEMS.length;
  const pol = (r, a2) => [C + r * Math.cos(a2), C + r * Math.sin(a2)];
  // systems take equal sectors from twelve o'clock, in the page's own order
  const sect = SYSTEMS.map((sy, i) => {
    const a0 = -Math.PI / 2 + (i / N) * TAU, a1 = -Math.PI / 2 + ((i + 1) / N) * TAU;
    return { sy, a0, a1, mid: (a0 + a1) / 2 };
  });
  const yearRing = (k) => {
    const r = R_AT[k] * 430;
    // two strokes a pixel apart: a groove and the light caught on its lower lip
    return `<g class="rg-yg" data-y="${k}">`
      + `<circle class="rg-yl" cx="${C}" cy="${(C + 1.2).toFixed(1)}" r="${r.toFixed(1)}"/>`
      + `<circle class="rg-y" cx="${C}" cy="${C}" r="${r.toFixed(1)}"/></g>`;
  };
  // every marker sits on its year's ring, inside its system's sector
  const dots = RING_YEARS.map((_, k) => {
    const r = R_AT[k] * 430;
    return sect.map(({ sy, a0, a1 }) => {
      const ms = MARKERS.filter(m => m.marker.system === sy.system);
      return ms.map((m, j) => {
        const t = (j + 1) / (ms.length + 1), a2 = a0 + (a1 - a0) * (0.12 + 0.76 * t);
        const pt = m.points[k], st = pt && pt.value != null ? pt.state : null;
        const [x, y] = pol(r, a2);
        const turn = ((a2 + Math.PI / 2) / TAU + 1) % 1;          // 0 at twelve, clockwise
        const d = (turn * 620).toFixed(0);
        if (!st) return `<circle class="rg-d rg-off" data-ring-y="${k}" style="--d:${d}ms" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`;
        const prio = m.marker.id === mv1.marker.id;
        return `<circle class="rg-d s-${st}${prio ? ' prio' : ''}" data-ring-y="${k}" data-open-marker="${esc(m.marker.id)}" style="--d:${d}ms" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${prio ? 11 : 7.5}"><title>${esc(m.marker.name)}: ${esc(valText(m, pt))} ${esc(unitOf(m))}</title></circle>`;
      }).join('');
    }).join('');
  }).join('');
  const spokes = sect.map(({ a0 }) => {
    const [x1, y1] = pol(150, a0), [x2, y2] = pol(446, a0);
    return `<line class="rg-sp" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('');
  const labels = sect.map(({ sy, mid }) => {
    const [x, y] = pol(472, mid), right = Math.cos(mid) > -0.06;
    const [tx0, ty0] = pol(436, mid), [tx1, ty1] = pol(462, mid);
    return `<line class="rg-tick" x1="${tx0.toFixed(1)}" y1="${ty0.toFixed(1)}" x2="${tx1.toFixed(1)}" y2="${ty1.toFixed(1)}"/>`
      + `<text class="rg-l${needs(sy.worst) ? ' attn' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${right ? 'start' : 'end'}" dominant-baseline="middle" data-bm="${esc(sy.system)}">${esc(sy.label)}</text>`;
  }).join('');
  return `<section id="scan" class="s-scan s-rings" aria-labelledby="rgH">
  <div class="scan-track"><div class="scan-frame">
    <div class="rg-bg" aria-hidden="true"></div>
    <div class="rg-wrap"><div class="rg-tilt">
      <div class="rg-edge" aria-hidden="true"></div>
      <div class="rg-disc"><div class="rg-wood"></div>${loopVideo('rings', 'loop-rings')}
        <svg class="rg-svg" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
          <g class="rg-spokes">${spokes}</g>
          <g class="rg-rings">${RING_YEARS.map((_, k) => yearRing(k)).join('')}</g>
          <g class="rg-dots">${dots}</g>
          <circle class="rg-pith" cx="${C}" cy="${C}" r="7"/>
          <g class="rg-hand" aria-hidden="true"><line x1="${C}" y1="${C}" x2="${C}" y2="58"/></g>
        </svg>
      </div>
      <svg class="rg-out" viewBox="0 0 1000 1000" focusable="false" aria-hidden="true">${labels}</svg>
    </div>
      <p class="rg-yr" aria-hidden="true">${RING_YEARS.map((y, k) => `<span data-yr="${k}">${esc(y.year)}</span>`).join('')}</p>
    </div>
    <div class="scan-copy" data-state="A">
      <div class="sc-cA">
        <p class="sc-pill">${stats.map(([n, l]) => `<span class="nw"><b class="num">${n}</b> ${esc(l)}</span>`).join('<span class="sep"> · </span>')}</p>
        <p class="eyebrow">${esc(PRODUCT_NAME)} · ${esc(YEAR)}</p>
        <h1 id="rgH">${esc(VER.headline)}${VER.headlineEmphasis ? ` <em>${esc(VER.headlineEmphasis)}</em>` : ''}</h1>
        <div class="byline"><span class="avatar" aria-hidden="true">${esc(V.clinician.initials)}</span><span>Reviewed by <b>${esc(NP_NAME)}</b><br><span class="num">${esc(PUBLISHED)}</span></span></div>
        <div class="capsule"><button type="button" data-toast="In the portal this opens Messages with ${esc(NP_FIRST)}.">Message ${esc(NP_FIRST)}</button><button type="button" class="solid" data-toast="In the portal this downloads your report as a PDF.">${ICON.dl}Download PDF</button></div>
        <nav class="sc-stats" aria-label="Your results at a glance">${[[S.healthy, 'markers in a healthy range', '#target', ''], [attention, 'markers to watch this year', '#results', ' data-watch'], [nP, `priorities, chosen by ${NP_FIRST}`, '#priorities', '']].map(([n, l, h, x]) => `<a href="${h}"${x}><b class="num" data-count="${n}">${n}</b><span>${esc(l)}</span></a>`).join('')}</nav>
        ${nextVisit()}
      </div>
      <div class="sc-cB" aria-hidden="true">
        <p class="eyebrow">Your first priority · ${esc(SYSTEM_LABEL[mv1.marker.system])}</p>
        <h2 class="d2">${emNoun(p1.title, mv1.marker.name)}</h2>
        <div class="sc-val"><span class="v num">${esc(valText(mv1, mv1.latest))}</span><span class="u">${esc(unitOf(mv1))}</span>${stateTag(mv1.latest.state)}${dp1 ? `<span class="sc-d">${esc(distLine(mv1))}</span>` : ''}</div>
        <div class="sc-blinks"><button type="button" class="sc-why" data-prio-sheet="0">Why, and what we'll do ${ICON.arrow}</button><a class="textlink" href="#priorities">Your three priorities ${ICON.chev}</a></div>
      </div>
    </div>
    <p class="sc-foot"><a href="#priorities">Your first priority · ${esc(p1.title)} ${ICON.arrow}</a></p>
  </div></div>
  <p class="sr">${esc(SCAN_SUMMARY)}</p>
</section>`;
}

function scanHero() {
  const stats = [[S.healthy, 'healthy', 'markers in a healthy range', '#target', ''], [attention, 'to watch', 'markers to watch this year', '#results', ' data-watch'], [nP, 'priorities', `priorities, chosen by ${NP_FIRST}`, '#priorities', '']];
  const p1 = VER.priorities[0], mv = BY_ID[p1.biomarkerIds[0]], dp = distParts(mv);
  const sys1 = SYSTEM_LABEL[mv.marker.system];
  return `<section id="scan" class="s-scan" aria-labelledby="scH">
  <div class="scan-track"><div class="scan-frame">
    <svg class="bay-rings" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      <g class="spin">
        <circle class="r1" cx="500" cy="500" r="212"/><circle class="r2" cx="500" cy="500" r="286"/>
        <circle class="r3" cx="500" cy="500" r="358"/><circle class="r3" cx="500" cy="500" r="430"/>
        <line class="r3" x1="500" y1="70" x2="500" y2="930"/><line class="r3" x1="70" y1="500" x2="930" y2="500"/>
        <path class="sweep" d="M500 500 L500 214 A286 286 0 0 1 672 271 Z" fill="rgba(164,194,157,.05)" stroke="none"/>
        <line class="sweep" x1="500" y1="500" x2="500" y2="214"/>
      </g>
    </svg>
    <div class="bay-rail" aria-hidden="true">
      <div><b class="num">${S.healthy}</b><span>Healthy</span><i style="--w:${Math.round(S.healthy / S.total * 100)}%;--c:#A4C29D"></i></div>
      <div><b class="num">${attention}</b><span>To watch</span><i style="--w:${Math.round(attention / S.total * 100)}%;--c:#E0A340"></i></div>
      <div><b class="num">${nP}</b><span>Priorities</span><i style="--w:${Math.round(nP / S.total * 100)}%;--c:#E58A7A"></i></div>
    </div>
    <div class="scan-stage" id="scanStage"></div>
    <div class="sample-stage" id="sampleStage" role="img" aria-label="${esc(`Illustration of ${spell(SAMPLES.length).toLowerCase()} sample containers from your blood draw.`)}"></div>
    <div class="sample-legend" aria-hidden="true">${SAMPLES.filter(c => c.id !== 'urine').map(c => `<span class="sl-c"><i style="background:${c.hex}"></i><b>${esc(c.label)}</b><span class="num">${c.markerCount}</span></span>`).join('')}</div>
    <div class="bay-scan" aria-hidden="true"></div>
    <div class="scan-copy" data-state="A">
      <div class="sc-cA">
        <p class="sc-pill">${stats.map(([n, l]) => `<span class="nw"><b class="num">${n}</b> ${esc(l)}</span>`).join('<span class="sep"> · </span>')}</p>
        <p class="eyebrow">${esc(PRODUCT_NAME)} · ${esc(YEAR)}</p>
        <h1 id="scH">${esc(VER.headline)}${VER.headlineEmphasis ? ` <em>${esc(VER.headlineEmphasis)}</em>` : ''}</h1>
        <div class="byline"><span class="avatar" aria-hidden="true">${esc(V.clinician.initials)}</span><span>Reviewed by <b>${esc(NP_NAME)}</b><br><span class="num">${esc(PUBLISHED)}</span></span></div>
        <div class="capsule"><button type="button" data-toast="In the portal this opens Messages with ${esc(NP_FIRST)}.">Message ${esc(NP_FIRST)}</button><button type="button" class="solid" data-toast="In the portal this downloads your report as a PDF.">${ICON.dl}Download PDF</button></div>
        <nav class="sc-stats" aria-label="Your results at a glance">${stats.map(([n, , l, h, x]) => `<a href="${h}"${x}><b class="num" data-count="${n}">${n}</b><span>${esc(l)}</span></a>`).join('')}</nav>
        ${nextVisit()}
      </div>
      <div class="sc-cB" aria-hidden="true">
        <p class="eyebrow">Your first priority · ${esc(sys1)}</p>
        <h2 class="d2">${emNoun(p1.title, mv.marker.name)}</h2>
        <div class="sc-val"><span class="v num">${esc(valText(mv, mv.latest))}</span><span class="u">${esc(unitOf(mv))}</span>${stateTag(mv.latest.state)}${dp ? `<span class="sc-d">${esc(distLine(mv))}</span>` : ''}</div>
        <div class="sc-rb">${rangeBar(mv, { size: 'tv', ticks: true, zones: true, prev: true, glide: true, dark: true })}</div>
        <div class="sc-blinks"><button type="button" class="sc-why" data-prio-sheet="0">Why, and what we'll do ${ICON.arrow}</button><a class="textlink" href="#priorities">Your three priorities ${ICON.chev}</a></div>
      </div>
    </div>
    <p class="sc-foot"><a href="#priorities">Your first priority · ${esc(p1.title)} ${ICON.arrow}</a></p>
  </div></div>
  <p class="sr">${esc(SCAN_SUMMARY)}</p>
</section>`;
}

const RAIL = [['scan', 'Body'], ['priorities', 'Priorities'], ['plan', 'Plan'], ['note', 'Note'], ['target', 'Target'], ['progress', 'Progress'], ['samples', 'Samples'], ['results', 'Results']];
/* chapter marks: the page reads as two halves, Maya's narrative then the patient's own exploring */
const partTwo = () => `<div class="s-p2"><div class="wrap p2o"><p class="p2-k">Part two</p><p class="p2-h">Your year in <em>review</em></p></div></div>`;
const chap = (n, t) => `<p class="chap"><span class="chap-n">${n}</span><span class="chap-t">${esc(t)}</span></p>`;
function srail() {
  return `<nav class="srail" aria-label="Sections"><div class="srail-bar">
    <span class="srail-t">${esc(PRODUCT_NAME)} · ${esc(YEAR)}</span>
    <div class="srail-in">${RAIL.map(([id, l]) => `<a href="#${id}" data-spy="${id}">${esc(l)}</a>`).join('')}<i class="srail-ind" aria-hidden="true"></i></div>
    <button type="button" class="srail-pdf" data-toast="In the portal this downloads your report as a PDF.">${ICON.dl}Download PDF</button>
  </div></nav>`;
}

function note() {
  return `<section id="note" class="s-note"><div class="wrap railgrid">
    <div class="head nt-head"><p class="eyebrow">A note from your NP</p><h2 class="d2">What we see in your <em>results</em></h2></div>
    <div class="letter"><span class="q" aria-hidden="true">“</span>${paras.map((p, i) => `<p class="${i ? 'p2' : 'lead'}">${esc(p)}</p>`).join('')}
      <div class="sign"><span class="avatar" aria-hidden="true">${esc(V.clinician.initials)}</span><span><b>${esc(NP_NAME)}</b><span class="sg-r">Your nurse practitioner</span><span class="sg-p">Nurse practitioner<span class="sep"> · </span><span class="num">${esc(PUBLISHED)}</span></span></span>${SPRIG_URI ? '<img class="colophon" src="" alt="" aria-hidden="true">' : ''}</div>
    </div>
  </div></section>`;
}

/* SIGNATURE 3 · Your longevity target. The chart itself is mounted by sig.js
   (renderBullseye); this is its legend, controls and the list equivalent. */
const VIZ = { optimal: '#2C4E25', in_range: '#A9A49B', borderline: '#C97B2D', out_of_range: '#B3402F' };
const cmpLine = s => {
  const d = S.byState[s] - S.previous.byState[s];
  const txt = d > 0 ? `${d} more than last year` : d < 0 ? `${-d} fewer than last year` : 'Same as last year';
  const good = (s === 'optimal' && d > 0) || (needs(s) && d < 0);
  return `<span class="cmp num${good ? ' good' : ''}">${d > 0 ? ICON.up : d < 0 ? ICON.dn : ICON.flat}<span>${txt}</span></span>`;
};
/** A 28px concentric glyph with one ring filled: the legend row's own picture of where its dots sit. */
function ringGlyph(k, dark = false) {
  const r = [3, 6.5, 9.5, 12, 13.5], c = (dark ? HUE_DARK : VIZ)[STATE_ORDER[k]], ln = dark ? 'rgba(255,252,247,.22)' : 'rgba(118,115,109,.32)';
  const circ = x => `M${14 - x} 14a${x} ${x} 0 1 0 ${2 * x} 0a${x} ${x} 0 1 0 ${-2 * x} 0Z`;
  return `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="${circ(r[k + 1])}${k ? circ(r[k]) : ''}" fill="${c}" fill-rule="evenodd" fill-opacity=".9"/>${r.slice(1).map(x => `<circle cx="14" cy="14" r="${x}" fill="none" stroke="${ln}" stroke-width="1"/>`).join('')}</svg>`;
}
function target() {
  const o = S.byState.optimal;
  const legend = STATE_ORDER.map((s, k) => `<li><button type="button" class="tg-row" data-st="${s}" aria-pressed="false">
      <span class="tg-g">${ringGlyph(k)}</span><span class="tg-n num s-${s}" data-count="${S.byState[s]}">${S.byState[s]}</span>
      <span class="tg-l"><span class="tg-lt"><b>${esc(STATE_LABEL[s])}</b>${cmpLine(s)}</span><span class="tg-d">${esc(STATE_DEFINITION[s])}</span></span></button></li>`).join('');
  const hollow = `<li class="tg-hol"><svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"><circle cx="14" cy="7" r="3.6" fill="#fff" stroke="#8A857D" stroke-width="1.25"/></svg><span>Hollow: no clinic target, the lab range is the goal.</span></li>`;
  const cols = STATE_ORDER.filter(s => S.byState[s]).map(s => {
    const ms = MARKERS.filter(m => m.latest.state === s);
    return `<div class="tg-col"><h3 class="tg-ch"><span class="dot bg-${s}"></span>${esc(STATE_LABEL[s])} <span class="num">(${ms.length})</span></h3>
      ${ms.map(m => `<button type="button" class="tg-li" data-open-marker="${esc(m.marker.id)}"><span class="nm">${esc(m.marker.name)}</span><span class="num">${esc(valText(m, m.latest))}${unitOf(m) ? ` <small>${esc(unitOf(m))}</small>` : ''}</span></button>`).join('')}</div>`;
  }).join('');
  return `<section id="target" class="s-target" aria-labelledby="tgH"><div class="wrap tg-grid">
    <div class="tg-copy">
      <div class="head"><p class="eyebrow">Your longevity target</p>
        <h2 class="tg-h mr" id="tgH"><span class="tg-num num"><span class="tg-big">${S.healthy}</span><span class="tg-of">of ${S.total}</span></span><span class="tg-rest">markers are in a <em>healthy range</em></span></h2>
        <p class="lede">${spell(o)} ${o === 1 ? 'is' : 'are'} at our longevity target. ${spell(attention)} need${attention === 1 ? 's' : ''} attention, and your ${spell(nP).toLowerCase()} priorities are built around them.</p></div>
      <ul class="tg-legend" aria-label="The four states">${legend}${hollow}</ul>
      <div class="tg-ctl"><button type="button" class="tg-sw" role="switch" aria-checked="false" id="tgCmp"><i aria-hidden="true"></i>Compare with ${esc(PREV_YEAR)}</button>
        <button type="button" class="tg-lk" id="tgList" aria-expanded="false" aria-controls="tgListBox">View as list</button></div>
    </div>
    <figure class="tg-fig"><div class="tg-chart" id="bx"></div>
      <p class="tg-ctx" id="tgCtx" aria-live="polite"></p>
      <p class="tg-one"><span class="tp">Tap</span><span class="hv">Select</span> a dot for its history<span class="sep"> · </span><button type="button" class="tg-how" aria-expanded="false">How to read this ${ICON.chev}</button></p>
      <figcaption class="tg-cap">Each dot is one marker and each ring is a state. Inside a ring, dots nearer the centre sit closer to the next better state. <span class="tg-cap-h">Hollow dots have no clinic target; the lab range is their goal. </span><span class="nw">Numbers 1–3</span> mark your priorities. <span class="hv">Select</span><span class="tp">Tap</span> a dot for its history.</figcaption></figure>
  </div>
  <div class="wrap"><div class="tg-list" data-open="false"><div class="clip"><div class="clip-in" id="tgListBox" inert><div class="tg-cols">${cols}</div></div></div></div></div>
  </section>`;
}

function priorities() {
  const rows = VER.priorities.map((p, i) => {
    const mv = BY_ID[p.biomarkerIds[0]], dp = distParts(mv);
    const hist = mv.points.map((x, k) => `<span class="${k === mv.points.length - 1 ? 'cur' : ''}"><span class="yr">${esc(formatYear(x.examDate))}</span> ${esc(valText(mv, x))}</span>`).join('<span class="ar">→</span>');
    const also = p.biomarkerIds.slice(1).map(id => BY_ID[id]).filter(Boolean).map(a =>
      `<button type="button" class="also" data-open-marker="${esc(a.marker.id)}"><b>${esc(a.marker.name)}</b><span class="num">${esc(valText(a, a.latest))} ${esc(unitOf(a))}</span>${stateTag(a.latest.state)}</button>`).join('');
    const open = i === 0; // v5: the first priority leads open; the others wait as peeks (desktop and phone)
    return `<article class="prio" data-open="${open}">
      <button type="button" class="prio-head" aria-expanded="${open}" aria-controls="pb${i}" data-prio="${i}">
        ${plateImg(mv.marker.system, 'plate-prio')}
        <span class="p-num" aria-hidden="true">${i + 1}</span>
        <span class="p-meta"><span class="sr">${ORD[i]} priority · </span>${esc(SYSTEM_LABEL[mv.marker.system])}</span>
        <span class="p-title">${esc(p.title)}</span>
        <span class="prio-peek"><span class="num">${esc(valText(mv, mv.latest))}</span><span class="pk-u">${esc(unitOf(mv))}</span>${stateTag(mv.latest.state)}<span class="pk-rb">${rangeBar(mv, { size: 'sm', target: true })}</span></span>
        ${dp ? `<span class="p-dist s-${mv.latest.state}">${esc(distLine(mv))}</span>` : '<span class="p-dist"></span>'}
        <span class="p-plan"><b>What we'll do</b>${esc(p.plan)}</span>
        <span class="chev-w">${ICON.chev}</span>
      </button>
      <div class="clip"><div class="clip-in" id="pb${i}"${open ? '' : ' inert'}><div class="prio-grid">
        <div class="inst"><div class="kicker">Where you are</div>
          <div class="bigval"><span class="v num">${esc(valText(mv, mv.latest))}</span><span class="u">${esc(unitOf(mv))}</span>${stateTag(mv.latest.state)}</div>
          ${rangeBar(mv, { ticks: true, target: true, prev: true, glide: true })}
          <p class="sr">${esc(railSentence(mv, true))}</p>
          ${!isOrd(mv) && mv.points.length > 1 ? `<div class="lc lc-prio" data-chart="${esc(mv.marker.id)}" data-variant="card"></div>` : ''}
          <p class="hist num">${hist}${dp ? `<span class="hd s-${mv.latest.state}">${esc(distLine(mv))}</span>` : ''}</p>
          ${dp ? `<div class="readout"><span class="rd-l">To reach target</span><span class="rd-v s-${mv.latest.state}"><b class="num">${esc(dp.n)}</b> ${esc(dp.u)} ${dp.dir}</span></div>` : ''}
        </div>
        <div class="why"><div class="kicker">Why it matters</div><p>${esc(p.body)}</p>
          <button type="button" class="wwd" aria-expanded="false">What we'll do ${ICON.chev}</button>
          <div class="kicker k2">What we'll do</div><p class="plan-t">${esc(p.plan)}</p>
          ${(() => { const nc = nextCheckFor(p); return nc
            ? `<a class="p-when" href="#plan"><span class="pw-k">Next measured</span><span class="pw-d num">${esc(formatShortDate(nc.due))}</span><span class="pw-t">${esc(nc.title)}</span>${ICON.arrow}</a>`
            : ''; })()}
          ${also}
          <button type="button" class="textlink" data-open-marker="${esc(mv.marker.id)}">See the full history ${ICON.arrow}</button>
        </div>
      </div></div></div>
    </article>`;
  }).join('');
  return `<section id="priorities" class="s-prios"><div class="wrap">${chap('Part one', 'Your focus for the year')}</div><div class="wrap">
    <div class="head split"><div><p class="eyebrow"><span class="pr-a">Your focus for the year<span class="sep"> · </span>chosen by ${esc(NP_FIRST)}</span><span class="pr-b">Chosen by ${esc(NP_FIRST)}</span></p>
    <h2 class="d2">Your ${spell(nP).toLowerCase()} <span class="ringed"><em>priorities</em><svg class="ring" aria-hidden="true" focusable="false"><ellipse cx="50%" cy="50%" rx="49.3%" ry="47%" pathLength="1"/></svg></span></h2></div>
    <p class="lede">Chosen by ${esc(NP_FIRST)} from your results, in order of importance.</p></div>
    <div class="prios">${rows}</div>
  </div></section>`;
}

function moved() {
  if (!winsPage.length) return '';
  const y0 = formatYear(EXAM_DATES[0]);
  const items = winsPage.map((m, i) => {
    const f = firstPt(m);
    return `<button type="button" class="mv drw" style="--i:${i % 4}" data-open-marker="${esc(m.marker.id)}">
      <span class="mv-h"><span class="mv-n">${esc(m.marker.name)}</span>${stateTag(m.latest.state, 'mv-s')}</span>
      <span class="mv-f num"><span class="mv-a">${esc(valText(m, f))}</span><span class="mv-ar" aria-hidden="true">→</span><span class="sr"> to </span><span class="mv-b">${esc(valText(m, m.latest))}</span><span class="mv-u">${esc(unitOf(m))}</span></span>
      <span class="mv-dl"><span class="mv-pct num">${esc(formatPctChange(f.value, m.latest.value) || '')}</span><span class="mv-since num">${esc(formatYear(f.examDate))} → ${esc(YEAR)}</span></span>
      <span class="lc lc-card" data-chart="${esc(m.marker.id)}" data-variant="card"></span>
      <span class="mv-more" aria-hidden="true">View history ${ICON.arrow}</span>
      <span class="lc lc-mini" data-chart="${esc(m.marker.id)}" data-variant="mini"></span>
      <span class="mv-cv" aria-hidden="true">${ICON.next}</span>
    </button>`;
  }).join('');
  return `<section id="progress" class="s-moved">${RING_URI ? '<div class="mv-round" aria-hidden="true"></div>' : ''}<div class="wrap">
    <div class="head split"><div><p class="eyebrow">Progress · ${esc(y0)} to ${esc(YEAR)}</p><h2 class="d2">What moved in the <em>right direction</em></h2></div>
    <div class="split-r"><p class="lede"><span class="mv-l1">Since last year, <span class="num">${S.improved}</span> markers moved toward your target or lab range.</span><span class="mv-l2"> Below, four of them over two years; the shaded band shows where we want each one to sit.</span></p>
      <p class="mv-key" aria-hidden="true"><span><i class="k-band"></i>Target band</span>${winsUseLab ? '<span><i class="k-band lab"></i>Lab range</span>' : ''}</p></div></div>
    <div class="charts">${items}</div>
    <button type="button" class="textlink mv-all" data-see="up"><span>See all <span class="num">${S.improved}</span> that improved</span>${ICON.arrow}</button>
  </div></section>`;
}

/* SIGNATURE 1 · Behind the numbers. One DOM, three layouts (sig.js sets
   data-mode): story = pinned 3-beat scroll on wide, tall screens; still =
   the same beats stacked beside one settled frame (reduced motion, no WebGL);
   compact = phones and short screens, unpinned, with a tappable legend. */
const SAMPLE_SST = SAMPLES.find(c => c.id === 'sst');
function sampleLegend() {
  return SAMPLES.map(c => `<button type="button" class="vs-cell" data-vial="${c.id}" aria-pressed="false">
    <span class="vs-ch"><i style="background:${c.hex}"></i>${esc(c.label)}</span><span class="vs-cs">${esc(c.tube)}</span>
    <span class="vs-cn"><b class="num">${c.markerCount}</b><i class="vs-cd" style="background:${c.hex}" aria-hidden="true"></i>${c.markerCount === 1 ? 'marker' : 'markers'}</span>${tileStrip(c.states, 'vs-ct')}<span class="sr">: ${esc(countsText(c.states))}</span></button>`).join('');
}
/* One line per result carried forward from an earlier draw (Lp(a)), so "this visit" stays literally true. */
const carriedNote = () => CARRIED.map(m => `${esc(m.marker.name)} is from your ${esc(formatYear(m.latest.examDate))} draw${m.marker.oncePerLifetime ? '; it’s measured once in a lifetime' : ''}.`).join(' ');
/* #14 · the phone carousel. One card per sample plus an overview, so the
   patient swipes the story instead of scrolling through a pinned stage. Every
   sentence here is v6's, split verbatim: nothing is rewritten. */
const SAMPLE_LINE = {
  sst: 'Serum, the clear part of your blood, carries {n} of your markers.',
  edta: 'Whole blood gives your blood count and A1c.',
  fluoride: 'A separate tube keeps glucose stable until it\u2019s measured.',
  urine: 'Urine checks your kidneys from another angle.',
};
function sampleCards() {
  const lede = `Collected on ${esc(COLLECTED)} at ${esc(V.report.labName)}: three tubes of blood and a urine sample. Every result from this visit comes from them.`;
  const cards = [`<li class="vs-card vs-card-0" data-c="0" role="group" aria-roledescription="slide" aria-label="1 of ${SAMPLES.length + 1}">
      <p class="vs-ck">One draw</p><h3 class="vs-cht"><em>Four samples</em></h3><p class="vs-cp">${lede}</p></li>`];
  SAMPLES.forEach((c, i) => {
    const line = (SAMPLE_LINE[c.id] || '').replace('{n}', c.markerCount);
    cards.push(`<li class="vs-card" data-c="${i + 1}" data-vial-card="${esc(c.id)}" role="group" aria-roledescription="slide" aria-label="${i + 2} of ${SAMPLES.length + 1}">
      <p class="vs-ck"><i style="background:${c.hex}"></i>${esc(c.label)}<span class="sep"> · </span>${esc(c.tube)}</p>
      <p class="vs-cn2"><b class="num">${c.markerCount}</b><span>${c.markerCount === 1 ? 'marker' : 'markers'}</span></p>
      ${tileStrip(c.states, 'vs-ct')}<span class="sr">: ${esc(countsText(c.states))}</span>
      <p class="vs-cp">${esc(line)}</p></li>`);
  });
  return cards.join('');
}
function samples() {
  const nSys = SYSTEMS.length, sp = spell(nSys).toLowerCase();
  const aria = `Illustration of ${spell(SAMPLES.length).toLowerCase()} sample containers: ${SAMPLES.map(c => `${c.label.toLowerCase()}, ${c.tube.toLowerCase()}, ${c.markerCount} marker${c.markerCount === 1 ? '' : 's'}`).join('; ')}.`;
  const b3 = `<h3 class="vs-h"><em><span class="num" data-count="${S.total}">${S.total}</span> markers</em> across ${sp} systems</h3>`;
  const links = `<div class="vs-links"><button type="button" class="textlink" data-sys-list><span>Explore by system</span>${ICON.arrow}</button><a href="#results" class="textlink"><span>See all <span class="num">${S.total}</span> results</span>${ICON.arrow}</a></div>`;
  return `<section id="samples" class="s-samples" data-mode="still" aria-labelledby="vsH">
    <div class="vs-pin"><div class="vs-sticky wrap">
      <div class="vs-text">
        <p class="eyebrow">Behind the numbers</p>
        <div class="vs-beats">
          <div class="vs-beat on" data-b="0"><h2 class="vs-h" id="vsH">One draw, <em>four samples</em></h2>
            <p class="vs-p">Collected on ${esc(COLLECTED)} at ${esc(V.report.labName)}: three tubes of blood and a urine sample. Every result from this visit comes from them.${CARRIED.length ? ` <span class="vs-fn">${carriedNote()}</span>` : ''}</p></div>
          <div class="vs-beat" data-b="1"><h3 class="vs-h">Each sample answers <em>different questions</em></h3>
            <p class="vs-p">Serum, the clear part of your blood, carries <span class="num">${SAMPLE_SST ? SAMPLE_SST.markerCount : 0}</span> of your markers. Whole blood gives your blood count and A1c. A separate tube keeps glucose stable until it’s measured. Urine checks your kidneys from another angle.</p></div>
          <div class="vs-beat" data-b="2">${b3}
            <p class="vs-p">Four samples, read across ${sp} systems of your body. Start with the map, or go straight to every result.</p>${links}</div>
        </div>
        <p class="vs-tally" id="vsTally" aria-hidden="true"><b class="vt-n num">0</b><span>of <span class="num">${SAMPLES.reduce((n, c) => n + c.markerCount, 0)}</span> markers from this draw</span></p>
        <ol class="vs-idx" aria-hidden="true">${['One draw', 'Four samples', `${S.total} markers`].map((t, i) => `<li${i ? '' : ' class="on"'}><span class="num">0${i + 1}</span>${esc(t)}</li>`).join('')}</ol>
      </div>
      <figure class="vs-fig">
        <div class="vs-gl" id="vialsGL" role="img" aria-label="${esc(aria)}">${vialsFallbackSVG({ containers: SAMPLES, total: S.total, date: SAMPLE_DATE })}</div>
        <figcaption class="vs-cap">Illustration: one container per sample type. Your lab may use more than one of each.</figcaption>
      </figure>
    </div></div>
    <div class="vs-car" id="vsCar" role="group" aria-roledescription="carousel" aria-label="Your four samples">
      <ul class="vs-track" id="vsTrack" tabindex="0">${sampleCards()}</ul>
      <div class="vs-pager" id="vsPager" aria-hidden="true">${Array.from({ length: SAMPLES.length + 1 }, (_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>
      <div class="wrap vs-carfoot">${links}${CARRIED.length ? `<p class="vs-fn2">${carriedNote()}</p>` : ''}</div>
    </div>
    <div class="wrap vs-below">
      <div class="vs-leg" role="group" aria-label="Sample containers">${sampleLegend()}</div>
      <div class="vs-sheet" id="vsSheet" aria-live="polite"></div>
      <div class="vs-end">${b3.replace('class="vs-h"', 'class="vs-h vs-h3"')}${links}<p class="vs-cap">Illustration: one container per sample type. Your lab may use more than one of each.</p></div>
    </div>
  </section>`;
}

/* SIGNATURE 2 · Your body, system by system. The figure is mounted by
   sig.js (mountScan); the system list is the canonical, accessible control. */
function sysMarkers(s) {
  return MARKERS.filter(m => m.marker.system === s.system).map(m => `<button type="button" class="bm-mk" data-open-marker="${esc(m.marker.id)}">
    <span class="nm">${esc(m.marker.name)}</span><span class="v num">${esc(valText(m, m.latest))}${unitOf(m) ? `<small>${esc(unitOf(m))}</small>` : ''}</span>${stateTag(m.latest.state)}</button>`).join('');
}
const sysTag = s => needs(s.worst) ? `<span class="chip s-${s.worst}"><span class="dot bg-${s.worst}"></span>${esc(sysStatus(s))}</span>` : `<span class="bm-st">${esc(sysStatus(s))}</span>`;
const attnMarkers = attnSystems.reduce((n, s) => n + s.byState.borderline + s.byState.out_of_range, 0);
const bmHeadText = attnSystems.length ? `${spell(attnSystems.length)} system${attnSystems.length === 1 ? ' needs' : 's need'} attention (${attnMarkers} marker${attnMarkers === 1 ? '' : 's'})` : 'Nothing needs attention';
/* Phones list the systems as two-line pills, the ones that need attention first. */
const SYS_ATTN_FIRST = SYSTEMS.slice().sort((a, b) => STATE_RANK[a.worst] - STATE_RANK[b.worst] || SYSTEMS.indexOf(a) - SYSTEMS.indexOf(b));
/* The system list and pills that v6 drew inside #body now live in the scan's
   list sheet (sig.js, openDrawer({context:'system'})); the markup is shared. */
function sysRows() {
  return SYSTEMS.map(s => `<div class="bm-row" data-row="${s.system}" data-open="false">
      <button type="button" class="bm-btn" data-bm="${s.system}" aria-expanded="false" aria-controls="bm-${s.system}">
        <span class="bm-g" style="--c:${HUE_DARK_MARK[s.worst]}"></span><span class="bm-tx"><span class="bm-nm">${esc(s.label)}</span><span class="bm-st s-${s.worst}">${esc(sysStatus(s))}</span></span>
        <span class="bm-rt">${miniSpec(MARKERS.filter(m => m.marker.system === s.system))}</span><span class="chev-w">${ICON.chev}</span></button>
      <div class="clip"><div class="clip-in" id="bm-${s.system}" inert><div class="bm-more">${sysMarkers(s)}
        <button type="button" class="btn ghost bm-go" data-bm-go="${s.system}">Show these in results ${ICON.arrow}</button></div></div></div>
    </div>`).join('');
}

const FILTERS = [
  { k: 'all', l: 'All', s: 'All', fn: () => true },
  { k: 'attn', l: 'Needs attention', s: 'Attention', fn: m => needs(m.latest.state) },
  { k: 'up', l: 'Improved', s: 'Improved', fn: m => m.trend === 'improved' },
  { k: 'opt', l: 'Optimal', s: 'Optimal', fn: m => m.latest.state === 'optimal' },
];
/* v5 phones: only the most urgent group starts open (v4 opened all three); the
   target and body map above now lead with attention, and the rest are one tap away. */
let tabsReady = false; // the tab scroller's fade + active-tab scroll run once the rail UI below exists
/* v7 phones: every group starts collapsed, so the ledger reads as an index
   (v6 opened the most urgent group, which cost ~640 px). On a pointer device
   the groups are headings, not accordions, so nothing changes there. */
const ui = { f: 'all', sys: null, q: '', open: new Set(MQ.phone.matches ? [] : attnSystems.slice().sort((a, b) => STATE_RANK[a.worst] - STATE_RANK[b.worst]).slice(0, 1).map(s => s.system)) };
const KEY = `<span class="key" aria-hidden="true"><span><i class="k-tg"></i>Target</span><span><i class="k-lab"></i>Lab range</span><span><i class="k-bor"></i>Borderline</span><span><i class="k-out"></i>Out of range</span></span>`;

/* How-to-read example: an annotated rail, not a patient value. It sits in the
   ledger toolbar on desktop, right where the rails start. */
const EXAMPLE = {
  marker: { valueType: 'quantity', precision: 0, unit: '' },
  bands: { domain: [0, 100], segments: [{ upTo: 12, state: 'in_range' }, { upTo: 40, state: 'optimal' }, { upTo: 54, state: 'in_range' }, { upTo: 72, state: 'borderline' }, { upTo: null, state: 'out_of_range' }] },
  latest: { value: 31, state: 'optimal' }, previous: null,
};
function exampleFig() {
  return `<figure class="ex" aria-label="How to read a result: the green block is our target, grey blocks are the lab range when we have no target, tan is borderline, hatched is out of range, and the dot is this year's value.">
    <div class="ex-top"><span style="left:26%">Target</span><span style="left:63%">Borderline</span></div>
    ${rangeBar(EXAMPLE, { size: 'sm' })}
    <div class="ex-bot"><span style="left:31%">This year</span><span class="r" style="left:86%">Out of range</span></div>
  </figure><span class="ex-lab" aria-hidden="true"><i class="k-lab"></i>Lab range<small>when there's no clinic target</small></span>`;
}

function ledgerShell() {
  return `<section id="results" class="s-ledger"><div class="wrap">
    <div class="head split"><div><p class="eyebrow">Every result</p><h2 class="d2">All <span class="num">${S.total}</span> <em>biomarkers</em></h2></div>
    <p class="lede"><span class="lg-from">From your blood draw on ${esc(COLLECTED)} at ${esc(V.report.labName)}. </span><span class="hv">Select</span><span class="tp">Tap</span> any result to see its history and what it means.</p></div>
    <div class="ledger">
      <nav class="toc" id="toc" aria-label="Body systems"></nav>
      <div class="lg-main">
        <div class="toolbar">
          <div class="tb1">
            <label class="sel-pill"><span class="sr">Body system</span><select id="sys"></select>${ICON.down}</label>
            <label class="search">${ICON.search}<span class="sr">Search biomarkers</span><input id="q" type="search" placeholder="Search biomarkers" autocomplete="off" enterkeyhint="search"><button type="button" class="q-x" id="qx" aria-label="Clear search" hidden>${ICON.x}</button><kbd class="slash" aria-hidden="true">/</kbd></label>
          </div>
          <div class="tb2"><div class="tabs" id="tabs" role="toolbar" aria-label="Filter results"></div><div class="tb-ex">${exampleFig()}</div><button type="button" class="tb-find" id="tbFind" aria-label="Search biomarkers">${ICON.search}</button></div>
        </div>
        <div class="tb-sub">${KEY}<button type="button" class="xall" id="xall"></button></div>
        <div id="rows" aria-live="polite"></div>
        <div class="lg-note">
          <p>Reviewed by <b>${esc(NP_NAME)}</b><span class="sep"> · </span><span class="num">${esc(PUBLISHED)}</span></p>
          <p>Blood drawn <span class="num">${esc(COLLECTED)}</span> at ${esc(V.report.labName)}</p>
          <p>Optimal ranges are our clinic's longevity targets, reviewed by our nurse practitioners. Lab ranges come from ${esc(V.report.labName)}.</p>
        </div>
      </div>
    </div>
  </div></section>`;
}
function rowHTML(m) {
  return `<button type="button" class="row${isOrd(m) ? ' ord' : ''}" data-open-marker="${esc(m.marker.id)}">
      <span class="nm">${esc(m.marker.name)}${m.marker.long ? `<small>${esc(m.marker.long)}</small>` : ''}</span>
      <span class="vu"><span class="v num">${esc(valText(m, m.latest))}</span><span class="u">${esc(unitOf(m))}</span></span>
      <span class="bar">${rangeBar(m, { size: 'sm' })}</span>
      <span class="tr">${spark(m)}</span>
      <span class="st">${stateTag(m.latest.state)}</span>
      <span class="go" aria-hidden="true">${ICON.arrow}</span></button>`;
}
function renderLedger() {
  const phone = MQ.phone.matches;
  $('#tabs').innerHTML = FILTERS.map(f => `<button type="button" data-f="${f.k}" aria-pressed="${ui.f === f.k}"><span class="tb-l">${esc(f.l)}</span><span class="tb-s">${esc(f.s)}</span><span class="c num">${MARKERS.filter(f.fn).length}</span></button>`).join('');
  $('#toc').innerHTML = `<button type="button" data-sys="" aria-pressed="${!ui.sys}"><span>All systems</span><span class="c num">${S.total}</span></button>` +
    SYSTEMS.map(s => { const n = s.byState.borderline + s.byState.out_of_range;
      return `<button type="button" data-sys="${s.system}" aria-pressed="${ui.sys === s.system}"><span>${esc(s.label)}</span><span class="c num">${n ? `<span class="dot bg-${s.worst}" title="${n} to watch"></span>` : ''}${s.markerIds.length}</span></button>`; }).join('');
  $('#sys').innerHTML = `<option value="">${MQ.xs.matches ? 'All' : 'All systems'}</option>` + SYSTEMS.map(s => `<option value="${s.system}"${ui.sys === s.system ? ' selected' : ''}>${esc(s.label)} (${s.markerIds.length})</option>`).join('');
  const f = FILTERS.find(x => x.k === ui.f).fn, q = ui.q.trim().toLowerCase();
  const forced = ui.f !== 'all' || !!ui.sys || !!q;
  const list = MARKERS.filter(m => f(m) && (!ui.sys || m.marker.system === ui.sys) && (!q || (m.marker.name + ' ' + (m.marker.long || '')).toLowerCase().includes(q)));
  let h = '';
  for (const s of SYSTEMS) {
    const g = list.filter(m => m.marker.system === s.system); if (!g.length) continue;
    const gb = emptyCounts(); g.forEach(m => gb[m.latest.state]++);
    const n = gb.borderline + gb.out_of_range;
    const cnt = `${g.length} ${g.length > 1 ? 'markers' : 'marker'}${n ? ` · ${statusOf({ byState: gb })}` : ''}`;
    if (phone) {
      const open = forced || ui.open.has(s.system);
      h += `<div class="grp-w" data-open="${open}" data-sysg="${s.system}"><button type="button" class="grp gb" data-grp="${s.system}" aria-expanded="${open}" aria-controls="g-${s.system}"><span class="g-l">${esc(s.label)}</span><span class="g-c num">${cnt}</span>${miniSpec(g)}<span class="chev-w">${ICON.chev}</span></button>
        <div class="clip"><div class="clip-in" id="g-${s.system}"${open ? '' : ' inert'}><div class="g-rows">${g.map(rowHTML).join('')}</div></div></div></div>`;
    } else {
      // the system's engraving rides its heading: eleven plates were drawn and
      // only the three priority ones were regularly seen
      h += `<div class="grp">${plateImg(s.system, 'plate-grp')}<h3>${esc(s.label)}</h3><span class="g-meta">${miniSpec(g)}<span class="g-c num">${cnt}</span></span></div>${g.map(rowHTML).join('')}`;
    }
  }
  $('#rows').innerHTML = h || `<p class="empty">No results match. Clear the search or pick another filter.</p>`;
  syncXall();
  if (tabsReady) syncTabs();
  $$('.rb[data-lay]', $('#rows')).forEach(layRB);
}
function syncXall() {
  const xall = $('#xall'), boxes = $$('.grp-w', $('#rows')), forced = ui.f !== 'all' || !!ui.sys || !!ui.q.trim();
  const all = boxes.length && boxes.every(b => b.dataset.open === 'true');
  xall.hidden = forced || !boxes.length; xall.textContent = all ? 'Collapse all' : 'Expand all'; xall.dataset.all = all ? '1' : '';
}
function setGroup(box, open) {
  box.dataset.open = String(open);
  const btn = $('.gb', box), inner = $('.clip-in', box);
  btn.setAttribute('aria-expanded', String(open)); inner.inert = !open;
  if (open) ui.open.add(box.dataset.sysg); else ui.open.delete(box.dataset.sysg);
}

/* The calendar file. The page already holds every date, title and detail, so
   it is assembled from the same strings the plan shows - never a reworded
   version. All-day events, because a draw date is a day, not a time. */
function icsFor(steps) {
  const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
  const day = iso => iso.replace(/-/g, '');
  const nextDay = iso => { const [y, m, d] = ymd(iso); const t = new Date(Date.UTC(y, m - 1, d + 1)); 
    return `${t.getUTCFullYear()}${pad2(t.getUTCMonth() + 1)}${pad2(t.getUTCDate())}`; };
  // RFC 5545 wants CRLF, escaped separators, and lines folded at 75 octets
  const esc5 = t => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const fold = l => { const out = []; let r = l;
    while (r.length > 73) { out.push(r.slice(0, 73)); r = ' ' + r.slice(73); } out.push(r); return out.join('\r\n'); };
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Optimal Health//Annual Longevity Assessment//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  steps.filter(s2 => s2.due).forEach((s2, i) => {
    L.push('BEGIN:VEVENT',
      `UID:ale-${YEAR}-${i}-${day(s2.due)}@beoptimal.ca`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(s2.due)}`,
      `DTEND;VALUE=DATE:${nextDay(s2.due)}`,
      fold(`SUMMARY:${esc5(s2.title)}`),
      fold(`DESCRIPTION:${esc5(s2.detail)} — ${esc5(PRODUCT_NAME)} ${esc5(YEAR)}, ${esc5(CLINIC.name)}`),
      fold(`LOCATION:${esc5(CLINIC.name)}\\, ${esc5(CLINIC.city)}`),
      'BEGIN:VALARM', 'TRIGGER:-P2D', 'ACTION:DISPLAY', fold(`DESCRIPTION:${esc5(s2.title)}`), 'END:VALARM',
      'END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}

/* The sheet a patient actually keeps. Printed only, and only on page one:
   the chart, the three priorities and the dates, so the first page answers
   "what matters and when" without the other eleven. */
/* Which visit next measures a priority. Inferred only from a verbatim match -
   a step that names one of the priority's own markers in its title or detail -
   so this never invents a schedule the plan does not already state. No match,
   no line. */
function nextCheckFor(p) {
  const names = p.biomarkerIds.map(id => BY_ID[id]).filter(Boolean).map(m => m.marker.name.toLowerCase());
  return VER.nextSteps.filter(s2 => s2.due && s2.due >= TODAY).find(s2 => {
    const hay = `${s2.title} ${s2.detail}`.toLowerCase();
    return names.some(n => hay.includes(n));
  }) || null;
}

function printSummary() {
  const dated = VER.nextSteps.filter(s2 => s2.due);
  const pr = VER.priorities.map((p, i) => {
    const mv = BY_ID[p.biomarkerIds[0]];
    return `<li><span class="ps-n num">${i + 1}</span><span class="ps-b"><b>${esc(p.title)}</b>
      <small>${esc(SYSTEM_LABEL[mv.marker.system])} · ${esc(mv.marker.name)} ${esc(valText(mv, mv.latest))}${unitOf(mv) ? ' ' + esc(unitOf(mv)) : ''}</small></span></li>`;
  }).join('');
  const dt = dated.map(s2 => `<li><span class="ps-d num">${esc(formatShortDate(s2.due))}</span>
    <span class="ps-b"><b>${esc(s2.title)}</b><small>${esc(s2.detail)}</small></span></li>`).join('');
  return `<section class="p-sum" aria-hidden="true">
    <div class="wrap"><div class="ps-grid">
      <div><h2>Your ${esc(spell(VER.priorities.length).toLowerCase())} priorities</h2><ol class="ps-l">${pr}</ol></div>
      <div><h2>Your dates</h2><ol class="ps-l ps-dates">${dt}</ol></div>
    </div>
    <p class="ps-f">${esc(CLINIC.name)} · ${esc(CLINIC.city)} · ${esc(CLINIC.phone)}<span class="sep"> · </span>Reviewed by ${esc(NP_NAME)}, ${esc(PUBLISHED)}</p></div>
  </section>`;
}

function planCard() {
  const due = VER.retestDate, match = VER.nextSteps.find(s => s.due === due);
  const [yy] = due ? ymd(due) : [];
  const walked = s => !!s.due && s.due <= TODAY;
  const steps = VER.nextSteps.map((s, i, arr) => {
    const next = !!s.due && s.due === due, today = s.due === TODAY;
    const segIn = i ? (walked(arr[i - 1]) ? 'solid' : 'dash') : '', segOut = i < arr.length - 1 ? (walked(s) ? 'solid' : 'dash') : '';
    const m = next ? 'Next' : today ? 'Today' : s.due ? formatShortDate(s.due) : 'Ongoing';
    return `<li class="${today ? 'today' : next ? 'next' : walked(s) ? 'done' : 'later'}">
      <span class="st-rail${segIn ? ' in-' + segIn : ''}${segOut ? ' out-' + segOut : ''}" aria-hidden="true"><i class="st-node"></i></span>
      <span class="st-t"><span class="st-m num">${esc(m)}</span><span class="st-h"><b>${esc(s.title)}</b>${next ? '<span class="tag-next">Next</span>' : ''}</span><small>${esc(s.detail)}</small>${next ? `<span class="st-big num">${esc(formatLongDate(s.due))}</span>` : ''}</span>
      <span class="when num">${today ? 'Today' : s.due ? esc(formatMonthYear(s.due)) : 'Ongoing'}</span></li>`;
  }).join('');
  const btns = cls => `<div class="${cls}"><button type="button" class="btn primary" data-toast="In the portal this opens Messages with ${esc(NP_FIRST)}.">Message ${esc(NP_FIRST)}</button><button type="button" class="btn secondary" data-ics>${ICON.cal || ''}${canSaveFile() ? 'Add to calendar' : 'See your dates'}</button></div>`;
  const cd = due ? countdown(due) : '';
  const place = `${CLINIC.name}, ${CLINIC.city.split(',')[0]}`;
  return `<section id="plan" class="s-plan"><div class="wrap"><div class="plan-card">
    <div class="dark"><p class="eyebrow">The plan</p><h2 class="d2">Your next <em>twelve months</em></h2><ul class="steps">${steps}</ul>${btns('m-btns')}</div>
    <div class="light"><p class="eyebrow">Next bloodwork</p><div class="date num">${due ? `${esc(monthDay(due))}<span>, ${yy}</span>` : 'To be booked'}</div>
      ${cd ? `<span class="cd num">${esc(cd)}</span>` : ''}
      ${match ? `<dl class="appt"><div><dt>Visit</dt><dd>${esc(match.title)}</dd></div><div><dt>Includes</dt><dd>${esc(match.detail)}</dd></div><div><dt>Where</dt><dd>${esc(place)}</dd></div></dl>` : '<p>Your NP will book it with you.</p>'}
      ${btns('btns')}</div>
  </div></div></section>`;
}

/* The page closes on a warm, confident moment: Maya's own last line from her note, one action. */
function closing() {
  /* v7: the quote is the sentence that credits the patient, verbatim from the
     note. v6 repeated "We will go through the plan together at your visit",
     which is odd to read on the TV during that visit. */
  const CLOSE_Q = 'That is the result of the work you put in.';
  const line = paras.some(t => t.includes(CLOSE_Q)) ? CLOSE_Q
    : ((paras[paras.length - 1] || '').match(/[^.!?]+[.!?]\s*$/) || [''])[0].trim();
  const EM_WORD = 'work'; // styling only
  const due = VER.retestDate, month = due ? MONTHS[ymd(due)[1] - 1] : '';
  const cta = due ? `Book your ${month} follow-up` : `Message ${NP_FIRST}`;
  return `<section class="s-close" aria-label="Until your next visit">${CLOSE_URI
    ? '<div class="close-shore" aria-hidden="true"></div>'
    : `<div class="close-photo" style="background-image:url('${IMG.hero}')" aria-hidden="true">${loopVideo('canopy', 'loop-close')}</div>`}
    <div class="wrap"><figure class="close-f"><blockquote class="close-q mr">${emNoun(line, line.includes(EM_WORD) ? EM_WORD : '')}</blockquote>
      <figcaption class="close-by"><span class="avatar" aria-hidden="true">${esc(V.clinician.initials)}</span>${esc(NP_NAME)}, from her note</figcaption></figure>
      <button type="button" class="pill-cta" data-toast="In the portal this opens booking.">${esc(cta)} ${ICON.arrow}</button></div></section>`;
}
function signoff() {
  return `<section id="signoff" class="s-sign" aria-label="About this report"><div class="wrap"><div class="so">
    <span class="avatar" aria-hidden="true">${esc(V.clinician.initials)}</span>
    <div class="so-t"><p class="so-by">Reviewed by <b>${esc(NP_NAME)}</b><span class="so-d"><span class="so-sep"> · </span><span class="num">${esc(PUBLISHED)}</span></span></p>
      <p>Blood drawn <span class="num">${esc(COLLECTED)}</span> at ${esc(V.report.labName)}</p>
      <p class="so-fine">Optimal ranges are our clinic's longevity targets, reviewed by our nurse practitioners. Lab ranges come from ${esc(V.report.labName)}.</p></div>
  </div></div></section>`;
}

/* One story order on every viewport: the scan hands off to the priorities, the
   plan answers "what do I do", and Part two is the patient's own exploring. */
const HERO_Q = new URLSearchParams(location.search).get('hero') || 'target';
$('#app').innerHTML = (HERO_Q === 'target' ? targetHero() : HERO_Q === 'rings' ? ringsHero() : scanHero()) + printSummary() + srail() + priorities() + planCard() + partTwo()
  + note() + (HERO_Q === 'target' ? '' : target()) + moved() + samples() + ledgerShell() + closing() + signoff();
renderLedger();

/* ---------- layout pass: charts at real size, rail annotations ---------- */
function renderChart(el) {
  const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight);
  if (!w || !h || (el._w === w && el._h === h)) return;
  el._w = w; el._h = h;
  const mv = BY_ID[el.dataset.chart]; if (!mv) return;
  el.innerHTML = lineChart(mv, { w, h, variant: el.dataset.variant });
}
/* Marker and last-year tick stay inside their own zone; labels are placed in
   priority order (target caption, the patient's zone, the deciding boundary,
   last year, the rest) and yield rather than collide. */
function layRB(rb) {
  const track = rb.querySelector('.rb-track'), W = track ? track.clientWidth : 0; if (!W) return;
  const mk = rb.querySelector('.mk');
  if (rb.classList.contains('ord')) { const c = rb.querySelector('.rb-steps .cur'); if (c && mk) mk.style.left = (c.offsetLeft + c.offsetWidth / 2).toFixed(1) + 'px'; return; }
  const fit = (el, padPx) => {
    const zl = (+el.dataset.zl / 100) * W, zr = (+el.dataset.zr / 100) * W, x0 = (+el.dataset.x / 100) * W, m = el.offsetWidth / 2 + padPx;
    const x = zr - zl < 2 * m ? (zl + zr) / 2 : clamp(x0, zl + m, zr - m);
    el.style.left = x.toFixed(1) + 'px'; return x;
  };
  const tv = rb.classList.contains('tv');
  const mx = mk ? fit(mk, tv ? 8 : 6.5) : 0;
  const pv = rb.querySelector('.pv'), pvl = rb.querySelector('.pvl');
  let px = null;
  if (pv) { px = fit(pv, 3); const clash = Math.abs(px - mx) < mk.offsetWidth / 2 + 5; pv.style.visibility = clash ? 'hidden' : ''; if (clash) px = null; }
  const above = rb.querySelector('.rb-above'), occ = { a: [], b: [] };
  const place = (el, row, l, cx) => {
    el.style.left = l.toFixed(1) + 'px'; el.style.transform = 'none'; el.style.visibility = ''; el.style.setProperty('--mx', (cx - l).toFixed(1) + 'px');
    occ[row].push([l, l + el.offsetWidth]);
  };
  /* force: the target tick carries the number the whole card is about, so it
     takes a slot even when the row is crowded. Zone names yield instead. */
  const put = (el, row, cx, gap = 8, opts = [0], force = false) => {
    const w = el.offsetWidth;
    for (const o of opts) {
      const l = clamp(o === 0 ? cx - w / 2 : o < 0 ? cx + 4 - w : cx - 4, 0, Math.max(0, W - w));
      if (!occ[row].some(([x, y]) => l + w + gap > x && l - gap < y)) { place(el, row, l, cx); return true; }
    }
    if (force) { place(el, row, clamp(cx - w / 2, 0, Math.max(0, W - w)), cx); return true; }
    el.style.visibility = 'hidden'; return false;
  };
  const at = (el, k) => (+el.dataset[k] / 100) * W;
  const tc = rb.querySelector('.tc'); if (tc) put(tc, 'b', at(tc, 'c'), 10, [0]);
  const zn = [...rb.querySelectorAll('.zn')], tks = [...rb.querySelectorAll('.tk')];
  zn.filter(s => s.classList.contains('on')).forEach(s => put(s, 'a', at(s, 'c')));
  tks.filter(t => t.classList.contains('prot')).forEach(t => put(t, 'b', at(t, 'at'), 6, [0, 1, -1], true));
  const pvRow = pvl && pvl.parentNode === above ? 'a' : 'b';
  const placePv = () => { if (!pvl) return; const ok = px != null && put(pvl, pvRow, px, 6, [0, 1, -1]); if (!ok) { pvl.style.visibility = 'hidden'; if (pv) pv.style.visibility = 'hidden'; } };
  if (pvRow === 'a') placePv();
  tks.filter(t => !t.classList.contains('prot')).forEach(t => put(t, 'b', at(t, 'at'), 5));
  if (pvRow === 'b') placePv();
  zn.filter(s => !s.classList.contains('on')).forEach(s => { if (s.offsetWidth > at(s, 'w') + 4) s.style.visibility = 'hidden'; else put(s, 'a', at(s, 'c')); });
}
let roT = null;
const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(layoutAll, 150); }) : null;
function hydrate(root = document) {
  $$('.lc', root).forEach(el => { renderChart(el); if (ro && !el._obs) { ro.observe(el); el._obs = true; } });
  $$('.rb[data-lay]', root).forEach(layRB);
}
function layoutAll() { hydrate(document); railFade(); moveInd($('.srail [aria-current]'), true); }
hydrate(document);
if (ro) ro.observe(document.body);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { $$('.rb[data-lay]').forEach(layRB); moveInd($('.srail [aria-current]'), true); });

/* ---------- motion: reveals, count-up, marker glide ---------- */
function countUp(el) {
  const end = +el.dataset.count, t0 = performance.now();
  const tick = t => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); el.textContent = String(Math.round(end * e)); if (k < 1) requestAnimationFrame(tick); };
  el.textContent = '0'; requestAnimationFrame(tick);
}
function glideMk(mk, delay = 0.3) {
  if (!MOTION || !mk || mk.dataset.from == null) return;
  const to = mk.style.left; mk.style.transition = 'none'; mk.style.left = mk.dataset.from + '%';
  mk.getBoundingClientRect();
  mk.style.transition = `left .7s cubic-bezier(.2,.7,.2,1) ${delay}s`; mk.style.left = to;
}
function glide(prio) { if (prio._glided) return; prio._glided = true; glideMk(prio.querySelector('.inst .mk[data-from]')); }
/* v7 motion language (#11, #30): an entrance plays when its section *arrives*
   and the thumb has stopped, never while the patient is reading something
   else mid-scroll. Motion means one of three things: change since last year,
   a signature assembling, or the hero's scroll-scrubbed camera. */
let scrollIdle = true, idleT2 = null;
addEventListener('scroll', () => {
  scrollIdle = false; clearTimeout(idleT2);
  idleT2 = setTimeout(() => { scrollIdle = true; flushArrivals(); }, 120);
}, { passive: true });
addEventListener('scrollend', () => { scrollIdle = true; flushArrivals(); });
const pending = new Set();
function fire(el) {
  el.classList.add('in');
  if (el._mr) el._mr.forEach(h => h.classList.add('in'));
  if (el.classList.contains('prio') && el.dataset.open === 'true') glide(el);
  $$('[data-count]', el).forEach(countUp);
}
function flushArrivals() { if (!scrollIdle) return; pending.forEach(el => { pending.delete(el); fire(el); }); }
function arrive(el) { if (scrollIdle) fire(el); else pending.add(el); }
if (MOTION) {
  // a section counts as arrived at 70% visible, or as soon as a tall one fills the screen
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || e.intersectionRatio < 0.7) return;
    io.unobserve(e.target); arrive(e.target);
  }), { threshold: [0.7, 0.99] });
  // a clipped element never intersects, so each mask-reveal heading is observed through its parent
  $$('.drw, .prio, .ringed').forEach(el => io.observe(el));
  $$('.mr').forEach(h => { const par = h.parentElement; if (!par._mr) { par._mr = []; io.observe(par); } par._mr.push(h); });
  // the hero's stat row counts once the scan has settled, in step with the build
  requestAnimationFrame(() => $$('.sc-stats [data-count]').forEach(countUp));
}

/* ---------- accordions ---------- */
function setOpen(box, head, open) {
  box.dataset.open = String(open); head.setAttribute('aria-expanded', String(open));
  const inner = box.querySelector('.clip-in'); if (inner) inner.inert = !open;
}
$$('.pk-rb .rb').forEach(layRB);

/* ---------- section rail: scroll-spy, sliding indicator, edge fades ---------- */
const rail = $('.srail'), railIn = $('.srail-in'), ind = $('.srail-ind'), tabsEl = $('#tabs'), tb2 = $('.tb2');
function moveInd(a, instant = false) {
  if (!ind) return;
  if (!a) { ind.style.opacity = '0'; return; }
  const cs = getComputedStyle(a), pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
  if (instant || ind.style.opacity !== '1') ind.style.transition = 'none';
  ind.style.width = (a.offsetWidth - pl - pr) + 'px'; ind.style.transform = `translateX(${a.offsetLeft + pl}px)`; ind.style.opacity = '1';
  ind.getBoundingClientRect(); ind.style.transition = '';
}
/* Edge fades only when a scroller actually overflows, and only on the side with more. */
function fade(box, sc) {
  const over = sc.scrollWidth > sc.clientWidth + 1;
  box.classList.toggle('fl', over && sc.scrollLeft > 2);
  box.classList.toggle('fr', over && sc.scrollLeft < sc.scrollWidth - sc.clientWidth - 2);
}
function railFade() { fade(rail, railIn); fade(tb2, tabsEl); }
function syncTabs() {
  fade(tb2, tabsEl);
  const on = $('[aria-pressed="true"]', tabsEl); if (!on || tabsEl.scrollWidth <= tabsEl.clientWidth) return;
  const l = on.offsetLeft, r = l + on.offsetWidth;
  if (l < tabsEl.scrollLeft + 16 || r > tabsEl.scrollLeft + tabsEl.clientWidth - 16) tabsEl.scrollLeft = Math.max(0, l - 16);
}
tabsReady = true;
railIn.addEventListener('scroll', () => fade(rail, railIn), { passive: true });
tabsEl.addEventListener('scroll', () => fade(tb2, tabsEl), { passive: true });
railFade();
if ('IntersectionObserver' in window) {
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    $$('[data-spy]', rail).forEach(a => a.removeAttribute('aria-current'));
    const a = $(`[data-spy="${e.target.id}"]`, rail); if (!a) return;
    a.setAttribute('aria-current', 'true'); moveInd(a);
    if (MQ.narrow.matches) {
      const l = a.offsetLeft, r = l + a.offsetWidth, vl = railIn.scrollLeft, vr = vl + railIn.clientWidth;
      if (l < vl + 16 || r > vr - 16) railIn.scrollTo({ left: l < vl + 16 ? l - 16 : r - railIn.clientWidth + 16, behavior: behavior() });
    }
  }), { rootMargin: '-40% 0px -55% 0px' });
  RAIL.forEach(([id]) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  // desktop: the section index slides in once the hero has gone
  new IntersectionObserver(([e]) => rail.classList.toggle('show', !e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' }).observe($('.scan-frame'));
} else rail.classList.add('show');
/* Desktop chrome: past the hero the portal nav slides away and one 52px bar remains; scrolling up brings the
   nav back. Jumps from a link hold it away until the scroll lands. */
const docEl = document.documentElement;
/* ---------- the TV tier: one continuous zoom over the 1440 master ----------
   At 1600 px and up the approved desktop composition scales to fill the screen,
   so a 65" TV shows the same design larger rather than a wider one. Everything
   compared with scrollY or a rect is multiplied by Z; anything written back to
   CSS is divided by it (zf). */
const TV_MIN = 1600;
let Z = 1;
const zf = () => Z;
function setZoom() {
  const z = innerWidth >= TV_MIN ? Math.max(1, Math.min(innerWidth / 1440, innerHeight / 790)) : 1;
  const on = z >= 1.1 && CSS.supports('zoom', '1.5');
  Z = on ? z : 1;
  docEl.style.setProperty('--z', on ? z.toFixed(4) : '1');
  docEl.classList.toggle('tv', on);
}
setZoom();
let zT = null;
addEventListener('resize', () => { clearTimeout(zT); zT = setTimeout(() => { const was = Z; setZoom(); if (was !== Z) layoutAll(); }, 150); });
let navY = scrollY, navLock = 0, navRaf = 0;
function navScroll() {
  navRaf = 0;
  const y = scrollY, dy = y - navY; navY = y;
  if (MQ.narrow.matches) { docEl.classList.remove('nav-away'); return; }
  const heroEnd = $('.scan-track').offsetHeight - 64;
  if (y < heroEnd) { docEl.classList.remove('nav-away'); return; }
  if (performance.now() < navLock) { docEl.classList.add('nav-away'); return; }
  if (dy > 4) docEl.classList.add('nav-away'); else if (dy < -6) docEl.classList.remove('nav-away');
}
addEventListener('scroll', () => { if (!navRaf) navRaf = requestAnimationFrame(navScroll); }, { passive: true });
function holdNav(ms = 1400) { if (MQ.narrow.matches) return; navLock = performance.now() + ms; docEl.classList.add('nav-away'); }

/* ---------- ledger: keep the list in view on phone; pinned tabs grow a search button ---------- */
function ledgerAnchorY() {
  if (MQ.phone.matches) return $('#rows').getBoundingClientRect().top + scrollY - (rail.offsetHeight + tb2.offsetHeight + 8);
  const off = MQ.narrow.matches ? rail.offsetHeight + 12 : 52 + 16;
  return $('.ledger').getBoundingClientRect().top + scrollY - off;
}
function keepLedgerInView() { if (!MQ.phone.matches) return; const y = ledgerAnchorY(); if (scrollY > y + 1) scrollTo({ top: y, behavior: 'auto' }); }
function landOnRows() { holdNav(); scrollTo({ top: Math.max(0, ledgerAnchorY()), behavior: behavior() }); }
/* The ledger's system filter. The body map and the target chart follow it
   (sig.js subscribes), so every view of "which system" agrees. */
const SYS_SUBS = [];
function setLedgerSys(id, quiet = false) {
  ui.sys = id || null; renderLedger(); if (!quiet) keepLedgerInView();
  SYS_SUBS.forEach(f => f(ui.sys, 'ledger'));
}
function applyFilter(k) { const had = !!ui.sys; ui.f = k; ui.sys = null; ui.q = ''; $('#q').value = ''; syncSearch(); renderLedger(); if (had) SYS_SUBS.forEach(f => f(null, 'ledger')); }
let tbRaf = 0;
/* Phones: once the filter tabs stick, the section rail slides away so one ~45px bar remains;
   it comes back on scroll-up or when the list ends. */
let tbY = scrollY;
function tbStuck() {
  tbRaf = 0;
  if (!MQ.phone.matches) { tb2.classList.remove('stuck'); docEl.classList.remove('ledger-pin'); return; }
  const pinned = docEl.classList.contains('ledger-pin'), want = pinned ? 0 : rail.offsetHeight, t1 = $('.tb1').getBoundingClientRect();
  const was = tb2.classList.contains('stuck'), now = tb2.getBoundingClientRect().top <= want + 1 && t1.bottom < want + 2;
  const inList = now && $('#rows').getBoundingClientRect().bottom > 160, y = scrollY, dy = y - tbY; tbY = y;
  if (!inList || dy < -6) docEl.classList.remove('ledger-pin'); else if (dy > 3) docEl.classList.add('ledger-pin');
  if (was !== now) { tb2.classList.toggle('stuck', now); setTimeout(() => fade(tb2, tabsEl), 300); }
}
addEventListener('scroll', () => { if (!tbRaf) tbRaf = requestAnimationFrame(tbStuck); }, { passive: true });
$('#tbFind').addEventListener('click', () => {
  $('#q').focus({ preventScroll: true });
  scrollTo({ top: $('.tb1').getBoundingClientRect().top + scrollY - rail.offsetHeight - 8, behavior: behavior() });
});

/* ---------- drawer: side panel on desktop, bottom sheet on phone ---------- */
const drawer = $('#drawer'), scrim = $('#scrim');
let lastFocus = null, drIO = null;
let openMarkerId = null;
/* The sheet carries four contexts now that the scan's reticles open it:
   a marker (v6), one system, the list of all 11, and a priority. */
function openDrawer(arg) {
  const req = typeof arg === 'string' || typeof arg === 'number' ? { context: 'marker', id: arg } : (arg || {});
  openMarkerId = req.context && req.context !== 'marker' ? null : (req.id != null ? String(req.id) : null);
  if (req.context === 'system') return sysSheet(req.id);
  if (req.context === 'list') return listSheet();
  if (req.context === 'priority') return prioSheet(req.i | 0);
  if (req.context === 'dates') return datesSheet();
  const id = req.id, mv = BY_ID[id]; if (!mv) return;
  const pr = VER.priorities.find(p => p.biomarkerIds.includes(id));
  const you = x => x.state === mv.latest.state && inBand(x, mv.latest.value);
  const youL = '<span class="you-l">You</span>';
  const rows = isOrd(mv)
    ? mv.bands.steps.map((t, i) => { const y = mv.latest.valueText === t; return `<tr class="${y ? 'you' : ''}"><td>${dotWord(mv.bands.stepStates[i])}</td><td>${esc(t)}${y ? youL : ''}</td></tr>`; }).join('')
    : bandList(mv.bands).map(x => `<tr class="${you(x) ? 'you' : ''}"><td>${dotWord(x.state)}</td><td class="num">${esc(rangeText(mv, x))}${you(x) ? youL : ''}</td></tr>`).join('');
  const name = mv.marker.name, vt = `${valText(mv, mv.latest)}${unitOf(mv) ? ' ' + unitOf(mv) : ''}`;
  drawer.innerHTML = `<div class="dr-head" id="drHead">
      <span class="dr-grab" aria-hidden="true"></span>
      <div class="dr-bar"><div class="dr-lab"><p class="eyebrow">${esc(SYSTEM_LABEL[mv.marker.system])}</p><p class="dr-mini" aria-hidden="true"><b>${esc(name)}</b><span class="num"> · ${esc(vt)}</span></p></div>
      <button type="button" class="x" id="drClose" aria-label="Close">${ICON.x}</button></div>
    </div>
    <div class="dr-in">
      <h2 id="drTitle">${esc(name)}</h2>${mv.marker.long ? `<p class="long">${esc(mv.marker.long)}</p>` : ''}
      <div class="dr-val"><span class="v num">${esc(valText(mv, mv.latest))}</span>${unitOf(mv) ? `<span class="u">${esc(unitOf(mv))}</span>` : ''}${stateTag(mv.latest.state)}${mv.carriedForward ? `<span class="once">Measured ${esc(formatYear(mv.latest.examDate))}, once in a lifetime</span>` : ''}</div>
      <div class="dr-rb">${rangeBar(mv, { ticks: true, zones: true })}<p class="sr">${esc(railSentence(mv))}</p></div>
      ${!isOrd(mv) && mv.points.length > 1 ? `<div class="dr-sec"><h3>Your history</h3><div class="lc lc-drawer" data-chart="${esc(mv.marker.id)}" data-variant="drawer"></div></div>` : ''}
      ${pr ? `<div class="dr-sec"><h3>${ORD[pr.rank - 1]} priority</h3><div class="np-note"><p><b>${esc(pr.title)}.</b> ${esc(pr.plan)}</p><p class="by">${esc(NP_NAME)}</p></div></div>` : ''}
      <div class="dr-sec"><h3>What it is</h3><p>${esc(mv.marker.copy.about)}</p></div>
      <div class="dr-sec"><h3>Ranges</h3><table class="rtab"><tbody>${rows}</tbody></table></div>
      <div class="dr-sec"><h3>From the lab</h3><p class="sm">Blood drawn ${esc(COLLECTED)} at ${esc(V.report.labName)}. Optimal is our clinic's longevity target; in range follows the lab's reference interval.</p></div>
    </div>
    <div class="dr-foot"><button type="button" class="btn primary block" data-toast="In the portal this opens Messages with ${esc(NP_FIRST)}.">${ICON.msg}Ask ${esc(NP_FIRST)} about ${esc(name)}</button></div>`;
  showDrawer();
}

/* One system, opened from a scan reticle, the list sheet or the ledger. */
function sysSheet(id) {
  const sy = SYS_BY[id]; if (!sy) return;
  const mk = MARKERS.filter(m => m.marker.system === sy.system);
  drawer.innerHTML = `<div class="dr-head" id="drHead">
      <span class="dr-grab" aria-hidden="true"></span>
      <div class="dr-bar"><div class="dr-lab"><p class="eyebrow">Your body</p><p class="dr-mini" aria-hidden="true"><b>${esc(sy.label)}</b></p></div>
      <button type="button" class="x" id="drClose" aria-label="Close">${ICON.x}</button></div>
    </div>
    <div class="dr-in">
      ${plateImg(sy.system, 'plate-dr')}
      <h2 id="drTitle">${esc(sy.label)}</h2>
      <div class="dr-val">${sysTag(sy)}<span class="dr-n num">${mk.length} marker${mk.length === 1 ? '' : 's'}</span></div>
      <div class="dr-sec">${tileStrip(mk.map(m => m.latest.state), 'dr-tiles')}<p class="sr">${esc(countsText(mk.map(m => m.latest.state)))}</p></div>
      <div class="dr-sec"><h3>Markers</h3><div class="bm-more">${sysMarkers(sy)}</div></div>
    </div>
    <div class="dr-foot"><button type="button" class="btn primary block" data-bm-go="${esc(sy.system)}">Show these in results ${ICON.arrow}</button></div>`;
  showDrawer();
}

/* All eleven systems, plus the legend that explains the scan's four glyphs. */
function listSheet() {
  drawer.innerHTML = `<div class="dr-head" id="drHead">
      <span class="dr-grab" aria-hidden="true"></span>
      <div class="dr-bar"><div class="dr-lab"><p class="eyebrow">Your body</p><p class="dr-mini" aria-hidden="true"><b>${SYSTEMS.length} systems</b></p></div>
      <button type="button" class="x" id="drClose" aria-label="Close">${ICON.x}</button></div>
    </div>
    <div class="dr-in">
      <h2 id="drTitle">Your body, <em>system by system</em></h2>
      <p class="long">${esc(bmHeadText)}. Each system is marked by the result that needs the most attention.</p>
      <div class="bm-list">${sysRows()}</div>
      <div class="dr-sec"><h3>How to read the scan</h3><ul class="sc-leg">${STATE_ORDER.map(k => `<li><i class="sc-lg sc-lg-${k}" aria-hidden="true"></i><b>${esc(STATE_LABEL[k])}</b><span>${esc(STATE_DEFINITION[k])}</span></li>`).join('')}</ul>
        <p class="sm">Grouped by the system each marker relates to; every result comes from blood or urine. Positions are approximate.</p></div>
    </div>`;
  showDrawer();
}

/* A priority, opened from the scan's B state. The words are the page's own. */
function prioSheet(i) {
  const pr = VER.priorities[i]; if (!pr) return;
  const mv = BY_ID[pr.biomarkerIds[0]], dp = distParts(mv);
  drawer.innerHTML = `<div class="dr-head" id="drHead">
      <span class="dr-grab" aria-hidden="true"></span>
      <div class="dr-bar"><div class="dr-lab"><p class="eyebrow">${esc(ORD[i])} priority</p><p class="dr-mini" aria-hidden="true"><b>${esc(pr.title)}</b></p></div>
      <button type="button" class="x" id="drClose" aria-label="Close">${ICON.x}</button></div>
    </div>
    <div class="dr-in">
      <h2 id="drTitle">${esc(pr.title)}</h2>
      <div class="dr-val"><span class="v num">${esc(valText(mv, mv.latest))}</span>${unitOf(mv) ? `<span class="u">${esc(unitOf(mv))}</span>` : ''}${stateTag(mv.latest.state)}</div>
      <div class="dr-rb">${rangeBar(mv, { ticks: true, zones: true, prev: true })}<p class="sr">${esc(railSentence(mv, true))}</p></div>
      ${dp ? `<div class="readout"><span class="rd-l">To reach target</span><span class="rd-v s-${mv.latest.state}"><b class="num">${esc(dp.n)}</b> ${esc(dp.u)} ${dp.dir}</span></div>` : ''}
      <div class="dr-sec"><h3>Why it matters</h3><p>${esc(pr.body)}</p></div>
      <div class="dr-sec"><h3>What we'll do</h3><div class="np-note"><p>${esc(pr.plan)}</p><p class="by">${esc(NP_NAME)}</p></div></div>
      <div class="dr-sec"><h3>The markers</h3><div class="bm-more">${pr.biomarkerIds.map(id => BY_ID[id]).filter(Boolean).map(m => `<button type="button" class="bm-mk" data-open-marker="${esc(m.marker.id)}"><span class="nm">${esc(m.marker.name)}</span><span class="v num">${esc(valText(m, m.latest))}${unitOf(m) ? `<small>${esc(unitOf(m))}</small>` : ''}</span>${stateTag(m.latest.state)}</button>`).join('')}</div></div>
    </div>
    <div class="dr-foot"><a class="btn primary block" href="#priorities" data-close-drawer>See all ${esc(spell(nP).toLowerCase())} priorities ${ICON.arrow}</a></div>`;
  showDrawer();
}

/* Your dates. The calendar file is the gift, but a sandboxed page cannot always
   hand a file to the browser - and the dates themselves are the thing the
   patient actually needs - so the dates are shown first and the file is
   offered underneath, only where it can really be delivered. */
function datesSheet() {
  const dated = VER.nextSteps.filter(s => s.due), open = VER.nextSteps.filter(s => !s.due);
  if (!dated.length) return;
  const wk = iso => { const [y, m, d] = ymd(iso); return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; };
  const next = VER.retestDate;
  const rows = dated.map(s => {
    const [yy, mm, dd] = ymd(s.due), past = s.due < TODAY, isNext = s.due === next;
    const mark = past ? '<span class="cl-cd past">Under way</span>'
      : `<span class="cl-cd${isNext ? ' next' : ''} num">${esc(countdown(s.due))}</span>`;
    return `<li class="${past ? 'past' : isNext ? 'next' : ''}">
      <span class="cl-d" aria-hidden="true"><b class="num">${dd}</b><small>${esc(MONTHS[mm - 1].slice(0, 3))}</small></span>
      <span class="cl-t"><span class="cl-w num">${esc(wk(s.due))}, ${esc(monthDay(s.due))}, ${yy}</span><b>${esc(s.title)}</b><small>${esc(s.detail)}</small>${mark}</span></li>`;
  }).join('');
  const foot = canSaveFile()
    ? `<button type="button" class="btn primary block" data-ics-save>${ICON.cal || ''}Download the calendar file</button>`
    : `<p class="dr-plain">${esc(`${CLINIC.name} sends these dates to your calendar from the patient portal. Here they are in the meantime.`)}</p>`;
  drawer.innerHTML = `<div class="dr-head" id="drHead">
      <span class="dr-grab" aria-hidden="true"></span>
      <div class="dr-bar"><div class="dr-lab"><p class="eyebrow">The plan</p><p class="dr-mini" aria-hidden="true"><b>Your dates</b></p></div>
      <button type="button" class="x" id="drClose" aria-label="Close">${ICON.x}</button></div>
    </div>
    <div class="dr-in">
      <h2 id="drTitle">Your ${esc(spell(dated.length).toLowerCase())} <em>dates</em></h2>
      <p class="long">Every dated step in your plan, through your next ${esc(PRODUCT_NAME)}. Each one is a day, not an appointment time${open.length ? `; ${esc(spell(open.length).toLowerCase())} more ${open.length === 1 ? 'step runs' : 'steps run'} throughout` : ''}.</p>
      <ol class="cal-list">${rows}</ol>
      <div class="dr-sec"><h3>Where to be</h3><p class="sm">${esc(CLINIC.name)}, ${esc(CLINIC.city)}. ${esc(NP_FIRST)} books the visits with you; the reminders land two days ahead.</p></div>
    </div>
    <div class="dr-foot">${foot}</div>`;
  showDrawer();
}

/* A marker is addressable: #m/apob opens that result's sheet on load, so the
   clinic can send someone straight to the one row they should read. The hash
   is written with replaceState, never pushState, so the sheet does not fill
   the back button with one entry per result opened. */
const MARK_HASH = /^#m\/([A-Za-z0-9_-]+)$/;
function markHash(id) {
  if (!history.replaceState) return;
  const want = id ? `#m/${id}` : '';
  const cur = location.hash;
  if (cur === want) return;
  // only ever clear a hash this feature wrote; never trample #plan or #room
  if (!want && !MARK_HASH.test(cur)) return;
  try { history.replaceState(null, '', location.pathname + location.search + want); } catch (x) { /* file:// */ }
}
function openFromHash() {
  const m = MARK_HASH.exec(location.hash);
  if (!m) return false;
  const id = m[1];
  if (!BY_ID[id]) { markHash(null); return false; }
  openDrawer(id);
  return true;
}
addEventListener('hashchange', () => { if (!openFromHash() && !MARK_HASH.test(location.hash)) closeDrawer(); });

/* Shared mount: the entrance stagger, focus, the sticky head and the drag. */
function showDrawer() {
  $$('.dr-in > *', drawer).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 6)));
  document.dispatchEvent(new CustomEvent('plates:new', { detail: drawer }));
  lastFocus = document.activeElement;
  drawer.style.transform = ''; drawer.classList.add('on'); scrim.classList.add('on'); drawer.setAttribute('aria-hidden', 'false');
  document.documentElement.style.overflow = 'hidden'; document.body.classList.add('dr-open');
  drawer.scrollTop = 0; hydrate(drawer); $('#drClose').focus({ preventScroll: true });
  markHash(openMarkerId);
  const head = $('#drHead');
  if (drIO) drIO.disconnect();
  drIO = new IntersectionObserver(([e]) => head.classList.toggle('stuck', !e.isIntersecting && e.boundingClientRect.top < head.getBoundingClientRect().bottom), { root: drawer, rootMargin: `-${head.offsetHeight}px 0px 0px 0px` });
  drIO.observe($('#drTitle'));
  bindDrag(head);
}
function closeDrawer() {
  if (!drawer.classList.contains('on')) return;
  openMarkerId = null; markHash(null);
  drawer.classList.remove('on'); scrim.classList.remove('on'); drawer.setAttribute('aria-hidden', 'true');
  drawer.style.transform = '';
  document.documentElement.style.overflow = ''; document.body.classList.remove('dr-open');
  if (drIO) { drIO.disconnect(); drIO = null; }
  if (lastFocus) lastFocus.focus({ preventScroll: true });
}
function bindDrag(head) {
  let d = null;
  head.addEventListener('pointerdown', e => {
    if (!MQ.phone.matches || e.target.closest('button') || e.button > 0) return;
    d = { y0: e.clientY, y: e.clientY, t: e.timeStamp, v: 0, dy: 0 };
    drawer.style.transition = 'none'; head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', e => {
    if (!d) return;
    const dt = Math.max(1, e.timeStamp - d.t); d.v = (e.clientY - d.y) / dt; d.y = e.clientY; d.t = e.timeStamp;
    d.dy = Math.max(0, e.clientY - d.y0); drawer.style.transform = `translateY(${d.dy}px)`;
  });
  const end = () => {
    if (!d) return; const { dy, v } = d; d = null; drawer.style.transition = '';
    if (dy > 96 || (dy > 12 && v > 0.5)) closeDrawer(); else drawer.style.transform = '';
  };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
}
scrim.addEventListener('click', closeDrawer);
drawer.addEventListener('click', e => { if (e.target.closest('#drClose')) closeDrawer(); });
drawer.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = $$('button, [href], input, select', drawer).filter(x => !x.disabled); if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});

/* ---------- toast ---------- */
let tT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tT); tT = setTimeout(() => t.classList.remove('on'), 2800); }

/* ---------- events ---------- */
/* #21 · the target's caption is a disclosure on phones */
document.addEventListener('click', e => {
  const h = e.target.closest('.tg-how'); if (!h) return;
  const fig = h.closest('.tg-fig'), on = fig.dataset.how !== '1';
  fig.dataset.how = on ? '1' : '0'; h.setAttribute('aria-expanded', String(on));
});
function jump(id) { const el = document.getElementById(id); if (!el) return; if (el.getBoundingClientRect().top > 0) holdNav(); else holdNav(400); el.scrollIntoView({ behavior: behavior(), block: 'start' }); }
document.addEventListener('click', e => {
  if (e.target.closest('#room')) return;
  const n = e.target.closest('[data-noop]'); if (n) { e.preventDefault(); toast('Sample: other portal pages are not part of this prototype.'); return; }
  const t = e.target.closest('[data-toast]'); if (t) { toast('Sample. ' + t.dataset.toast); return; }
  const a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute('href').length > 1) {
    e.preventDefault();
    if ('watch' in a.dataset) { applyFilter('attn'); requestAnimationFrame(landOnRows); return; }
    jump(a.getAttribute('href').slice(1)); return;
  }
  const see = e.target.closest('[data-see]'); if (see) { applyFilter(see.dataset.see); requestAnimationFrame(landOnRows); return; }
  const f = e.target.closest('[data-f]'); if (f) { ui.f = f.dataset.f; renderLedger(); keepLedgerInView(); return; }
  const s = e.target.closest('#toc [data-sys]'); if (s) { setLedgerSys(s.dataset.sys); return; }
  const gp = e.target.closest('[data-grp]'); if (gp) { const box = gp.closest('.grp-w'); setGroup(box, box.dataset.open !== 'true'); syncXall(); return; }
  if (e.target.closest('#xall')) { const open = !$('#xall').dataset.all; $$('.grp-w', $('#rows')).forEach(b => setGroup(b, open)); syncXall(); keepLedgerInView(); return; }
  const p = e.target.closest('[data-prio]'); if (p) {
    if (MQ.phone.matches) { openDrawer({ context: 'priority', i: +p.dataset.prio }); return; }
    const box = p.closest('.prio'), open = box.dataset.open !== 'true'; setOpen(box, p, open); if (open) glide(box); else $$('.pk-rb .rb', box).forEach(layRB); return;
  }
  const wd = e.target.closest('.wwd'); if (wd) { const pr = wd.closest('.prio'); pr.classList.add('wwd-on'); wd.setAttribute('aria-expanded', 'true'); const pt = $('.plan-t', pr); if (pt) { pt.tabIndex = -1; pt.focus({ preventScroll: true }); } return; }
  const m = e.target.closest('[data-open-marker]'); if (m) openDrawer(m.dataset.openMarker);
});
function syncSearch() { $('#qx').hidden = !ui.q; }
$('#q').addEventListener('input', e => { ui.q = e.target.value; syncSearch(); renderLedger(); keepLedgerInView(); });
$('#qx').addEventListener('click', () => { ui.q = ''; $('#q').value = ''; syncSearch(); renderLedger(); $('#q').focus(); });
$('#sys').addEventListener('change', e => setLedgerSys(e.target.value));
const syncPh = () => { $('#q').placeholder = MQ.phone.matches ? 'Search' : 'Search biomarkers'; };
syncPh();
MQ.phone.addEventListener('change', () => { syncPh(); renderLedger(); tbStuck(); });
MQ.xs.addEventListener('change', () => renderLedger());

/* ==========================================================================
   Exam-room presentation — in production: beoptimal-clinician (present)
   route, driven from the NP's laptop. A fixed 1920×1080 artboard scaled to
   the screen; starts on a cover with no name; B and Esc drop to a neutral
   screen; End returns to the NP's editor. Controls hide when idle.
   ========================================================================== */
const room = $('#room'), neutral = $('#neutral');
const WMK = `<img class="r-wm" src="${IMG.wmWhite}" alt="" aria-hidden="true">`;
const rise = (i, cls = '', st = '') => `class="rise${cls ? ' ' + cls : ''}" style="--i:${i}${st ? ';' + st : ''}"`;
const slides = [];
slides.push(`<div class="slide cover"><div class="photo" style="background-image:url('${IMG.canopy}')"><img class="cv-wm" src="${IMG.wmInv}" alt="Optimal"></div><p class="hint">Press → to begin</p></div>`);
/* The welcome copy is held back until the NP presses Start: until then the
   patient's name is not in the rendered DOM (PHIPA: a screen left facing a
   waiting room must not name them). WELCOME_HTML is injected by go(). */
const WELCOME_HTML = `<div class="stage r-wl">
  <p ${rise(0, 'eyebrow')}>${esc(PRODUCT_NAME)} · ${esc(YEAR)}</p>
  <h2 ${rise(1, 'r-h')}>Welcome back, <em>${esc(V.patient.firstName)}.</em></h2>
  <p ${rise(2, 'r-sub')}>${esc(paras[0] || '')}</p>
  <div ${rise(3, 'r-meta')}><span>Your nurse practitioner<b>${esc(NP_NAME)}</b></span><span>Blood drawn<b class="num">${esc(COLLECTED)}</b></span><span>Markers<b class="num">${S.total}</b></span></div></div>`;
slides.push(`<div class="slide welcome r-scanned" data-welcome></div>`);
if (wins.length) {
  const six = wins.slice(0, 6), lab = six.some(m => !isTarget(goalOf(m)));
  slides.push(`<div class="slide">${WMK}<div class="stage tight">
  <p ${rise(0, 'eyebrow')}>Since ${esc(formatYear(EXAM_DATES[0]))}</p><h2 ${rise(1, 'r-h r-h2')}>What your work <em>changed</em></h2>
  <div class="r-charts">${six.map((m, k) => { const f = firstPt(m), st = m.latest.state; return `<div ${rise(k + 2, 'r-card')}>
    <h4>${esc(m.marker.name)}</h4>
    <p class="r-dv num"><span>${esc(valText(m, f))}</span><i>→</i><b>${esc(valText(m, m.latest))}</b><small>${esc(unitOf(m))}</small></p>
    <p class="r-st sm" style="color:${HUE_DARK[st]}"><span class="dot" style="background:${HUE_DARK[st]}"></span>${esc(STATE_LABEL[st])}<span class="r-tg"> · ${goalWord(m)} ${esc(targetText(m))}</span></p>
    <div class="lc lc-tvs" data-chart="${esc(m.marker.id)}" data-variant="tvs"></div></div>`; }).join('')}</div>
  <p ${rise(8, 'r-key')}><i></i>Shaded band: your target${lab ? '<i class="lab"></i>Grey band: lab range' : ''}</p></div></div>`);
}
/* v5: the big picture carries the dark bullseye (2025 trails kept on, T
   toggles them); a new body slide carries the lume figure. Both are mounted
   by sig.js when the slide is first shown and disposed when the deck closes. */
slides.push(`<div class="slide r-big" data-builds="2">${WMK}<div class="stage r-bp">
  <div class="r-bp-l">
    <p ${rise(0, 'eyebrow')}>The big picture</p>
    <h2 ${rise(1, 'r-h')}><span class="num">${S.healthy}</span> of <span class="num">${S.total}</span> in a <em>healthy range</em></h2>
    <div ${rise(2, 'r-counts r-c2')}>${STATE_ORDER.map(s => `<div><div class="n num" style="color:${HUE_DARK[s]}">${S.byState[s]}</div><div class="l"><i class="r-dot" style="background:${HUE_DARK_MARK[s]}"></i>${esc(STATE_LABEL[s])}</div></div>`).join('')}</div>
    <p ${rise(3, 'r-note')}>Each dot is one marker, in the ring for its state. The faint trails show where markers that moved sat in ${esc(PREV_YEAR)}.</p>
    <ul ${rise(4, 'r-key2')}><li><i class="k-hol"></i>Hollow: no clinic target</li>${CARRIED.length ? `<li><i class="k-once"></i>Dashed ring: measured once (${CARRIED.map(m => `${esc(m.marker.name)}, ${esc(formatYear(m.latest.examDate))}`).join('; ')})</li>` : ''}<li><i class="k-pn">1</i>Italic 1–${nP}: your priorities</li></ul>
  </div>
  <div class="r-bp-r"><div class="r-bx" id="rBx"></div></div></div></div>`);
slides.push(`<div class="slide r-body r-scanned" data-builds="1">${WMK}<div class="stage r-bd">
  <div class="r-bd-l">
    <p ${rise(0, 'eyebrow')}>Your body</p>
    <h2 ${rise(1, 'r-h')}>System by <em>system</em></h2>
    <div ${rise(2, 'r-att')}>${attnSystems.map(s => `<button type="button" class="r-att-row" data-deck-sys="${s.system}" aria-pressed="false"><b>${esc(s.label)}</b><span style="color:${HUE_DARK[s.worst]}"><i style="background:${HUE_DARK[s.worst]}"></i>${esc(sysStatus(s))}</span></button>`).join('')}</div>
    <p ${rise(3, 'r-note')}>${spell(SYSTEMS.length)} systems, each marked by the result that needs the most attention.</p>
  </div>
  </div></div></div>`);
VER.priorities.forEach((p, i) => {
  const mv = BY_ID[p.biomarkerIds[0]];
  slides.push(`<div class="slide r-pslide" data-builds="2">${WMK}<div class="stage r-prio">
    <p ${rise(0, 'eyebrow r-eb')}><span class="r-pn">${i + 1}</span>${ORD[i]} priority · ${esc(SYSTEM_LABEL[mv.marker.system])}</p>
    <h2 ${rise(1, 'r-t')}>${esc(p.title)}</h2>
    <div class="r-l">
      <p ${rise(2, 'r-today')}>Today</p>
      <div ${rise(3, 'r-val')}><span class="v num">${esc(valText(mv, mv.latest))}</span><span class="u">${esc(unitOf(mv))}</span></div>
      <div ${rise(4, 'r-rb')}>${rangeBar(mv, { size: 'tv', ticks: true, zones: true, prev: true, glide: true, dark: true })}</div>
      <p ${rise(5, 'r-st', 'color:' + HUE_DARK[mv.latest.state])}><span class="dot" style="background:${HUE_DARK[mv.latest.state]}"></span>${esc(STATE_LABEL[mv.latest.state])}</p>
      <div ${rise(6, 'plan')} data-b="2"><span>What we'll do</span>${esc(p.plan)}</div>
      ${p.biomarkerIds.slice(1).map(id => BY_ID[id]).filter(Boolean).map(a => `<p ${rise(7, 'r-also')} data-b="2"><span class="dot" style="background:${HUE_DARK_MARK[a.latest.state]}"></span><b>${esc(a.marker.name)}</b> <span class="num">${esc(valText(a, a.latest))} ${esc(unitOf(a))}</span> · <span style="color:${HUE_DARK[a.latest.state]}">${esc(STATE_LABEL[a.latest.state])}</span>${a.carriedForward ? ` · measured once, in ${esc(formatYear(a.latest.examDate))}` : ''}</p>`).join('')}</div>
    <div ${rise(3, 'r-c')} data-b="1">${!isOrd(mv) && mv.points.length > 1 ? `<div class="lc lc-tv" data-chart="${esc(mv.marker.id)}" data-variant="tv"></div>` : ''}</div></div></div>`);
});
/* Plan: a twelve-month timeline spaced by real dates. */
const tlStart = V.report.examDate, tlEnd = (() => { const [y, m, d] = ymd(tlStart); return `${y + 1}-${pad2(m)}-${pad2(d)}`; })();
const tlFrac = iso => clamp((dayNum(iso) - dayNum(tlStart)) / (dayNum(tlEnd) - dayNum(tlStart)), 0, 1);
const tlMonth = k => { const [y, m, d] = ymd(tlStart); const t = new Date(Date.UTC(y, m - 1 + k, d)); return { f: tlFrac(`${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`), l: MONTHS[t.getUTCMonth()].slice(0, 3) }; };
{
  const due = VER.retestDate, dated = VER.nextSteps.filter(s => s.due);
  const nextIdx = dated.findIndex(s => s.due === due);
  const ticks = Array.from({ length: 13 }, (_, k) => tlMonth(k));
  const nodes = dated.map((s, i) => {
    const f = tlFrac(s.due), next = i === nextIdx, up = (i % 2 === 1) === (nextIdx < 0 || nextIdx % 2 === 1);
    const end = f > 0.8 ? ' end' : '';
    const lab = next
      ? `<p class="tl-m">Next bloodwork</p><p class="tl-big num">${esc(formatLongDate(s.due))}</p><p class="tl-t">${esc(s.title)}</p><p class="tl-d">${esc(s.detail)}</p>`
      : `<p class="tl-m num">${esc(s.due === TODAY ? 'Today' : formatShortDate(s.due))}</p><p class="tl-t">${esc(s.title)}</p><p class="tl-d">${esc(s.detail)}</p>`;
    return `<div class="tl-n ${up ? 'up' : 'dn'}${next ? ' next' : ''}${end}" style="left:${(f * 100).toFixed(2)}%;--k:${i}"><span class="tl-lead"></span><i class="tl-dot"></i>${next ? '<svg class="tl-ring" viewBox="0 0 64 40" aria-hidden="true"><ellipse cx="32" cy="20" rx="30" ry="17" transform="rotate(-4 32 20)"/></svg>' : ''}<div class="tl-lab">${lab}</div></div>`;
  }).join('');
  slides.push(`<div class="slide">${WMK}<div class="stage r-plan">
  <p ${rise(0, 'eyebrow')}>Your plan</p><h2 ${rise(1, 'r-h r-h3')}>Your next <em>twelve months</em></h2>
  <div class="tl">
    <span class="tl-axis"></span>${ticks.map(t => `<i class="tl-tk" style="left:${(t.f * 100).toFixed(2)}%"></i>`).join('')}
    ${nodes}
  </div></div></div>`);
}
/* The closing slide: what happens next, with nothing to press. */
{
  const due = VER.retestDate, step = VER.nextSteps.find(n => n.due === due);
  if (step) slides.push(`<div class="slide r-next"><div class="photo" style="background-image:url('${IMG.canopy}')"></div>${WMK}<div class="stage r-nx">
    <p ${rise(0, 'eyebrow')}>Your next visit</p>
    <p ${rise(1, 'r-nx-d num')}>${esc(formatLongDate(due))}</p>
    <p ${rise(2, 'r-nx-t')}>${esc(step.title)}</p>
    <p ${rise(3, 'r-nx-s')}>${esc(step.detail)}</p></div></div>`);
}
$('#slides').innerHTML = slides.join('');
const SL = [...room.querySelectorAll('.slide')];
let cur = 0, auto = false, aT = null, capT = null, idleT = null, prevSl = null, tagT = null, bld = 0;
const buildsOf = sl => +(sl && sl.dataset.builds || 0);
/* sig.js hangs the WebGL / SVG signature slides off these: open, close,
   enter(slide), leave(slide), key(event, slide) → true when it handled it. */
const ROOM_HOOKS = { open: [], close: [], enter: [], leave: [], key: [], build: [] };
const roomHook = (k, ...a) => ROOM_HOOKS[k].some(f => f(...a) === true);
const canHover = matchMedia('(hover: hover)');
function wake() {
  room.classList.remove('idle'); clearTimeout(idleT);
  if (!canHover.matches) return;
  idleT = setTimeout(() => { if (room.querySelector('.r-ctl:hover, .r-ctl :focus-visible')) wake(); else room.classList.add('idle'); }, 2500);
}
let roomS = 1;
function roomScale() { return roomS; }
function fitRoom() { roomS = Math.min(innerWidth / 1920, innerHeight / 1080); room.style.setProperty('--s', roomS.toFixed(4)); }
let fitRaf = 0;
addEventListener('resize', () => { if (!room.classList.contains('on')) return; cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitRoom); });
function setBuild(n) {
  const sl = SL[cur], max = buildsOf(sl);
  const up = n > bld;
  bld = clamp(n, 0, max);
  sl.dataset.build = String(bld);
  if (up && bld === 1 && sl.classList.contains('r-pslide')) $$('.mk[data-from]', sl).forEach(mk => glideMk(mk, 0.1));
  roomHook('build', sl, bld);
  renderPips();
}
function renderPips() {
  $('#pips').innerHTML = SL.map((sl, i) => {
    const n = buildsOf(sl);
    return `<i class="${i === cur ? 'cur' : ''}"></i>` + (i === cur && n ? Array.from({ length: n }, (_, k) => `<i class="tick${k < bld ? ' on' : ''}"></i>`).join('') : '');
  }).join('');
}
/* -> advances the current slide's build before it moves on; <- steps back. */
function advance(dir) {
  const max = buildsOf(SL[cur]);
  if (dir > 0 && bld < max) { setBuild(bld + 1); return; }
  if (dir < 0 && bld > 0) { setBuild(bld - 1); return; }
  go(cur + dir);
}
function go(n) {
  const back = n < cur;
  cur = Math.max(0, Math.min(SL.length - 1, n));
  SL.forEach((s, i) => { s.classList.toggle('cur', i === cur); s.classList.remove('in'); });
  const sl0 = SL[cur];
  bld = back ? buildsOf(sl0) : 0; sl0.dataset.build = String(bld);
  renderPips();
  const sl = SL[cur];
  // the patient's name enters the DOM only once the NP has left the cover
  if (sl.dataset.welcome !== undefined && !sl.firstChild) sl.innerHTML = WELCOME_HTML;
  if (prevSl && prevSl !== sl) roomHook('leave', prevSl);
  prevSl = sl;
  requestAnimationFrame(() => {
    sl.classList.add('in'); $$('.rb[data-lay]', sl).forEach(layRB);
    // on a slide with builds the glide waits for its build; elsewhere it plays on arrival
    if (!buildsOf(sl) || bld > 0) $$('.mk[data-from]', sl).forEach(mk => glideMk(mk, 0.9));
    roomHook('enter', sl);
  });
  // the "exam-room view" pill is for the NP: it belongs to the cover only
  room.classList.toggle('tag-off', cur > 0); clearTimeout(tagT);
  if (cur === 0) tagT = setTimeout(() => room.classList.add('tag-off'), 3000);
  clearTimeout(aT);
  if (auto) aT = setTimeout(() => (bld < buildsOf(sl) ? setBuild(bld + 1) : go(cur + 1 < SL.length ? cur + 1 : 1)),
    bld < buildsOf(sl) ? 4000 : sl.classList.contains('r-body') ? 22000 : 14000);
}
function setBlank(on) { neutral.classList.toggle('on', on); $('#rBlank').setAttribute('aria-pressed', String(on)); }
function openRoom() {
  prevSl = null; roomHook('open');
  room.classList.add('on'); room.setAttribute('aria-hidden', 'false'); document.documentElement.style.overflow = 'hidden'; setBlank(false);
  fitRoom(); $$('.lc', room).forEach(el => { el._w = 0; }); hydrate(room); go(0); wake();
  clearTimeout(capT); capT = setTimeout(() => setBlank(true), PRESENT_MAX_MINUTES * 60000);
}
function closeRoom() { if (prevSl) roomHook('leave', prevSl); prevSl = null; roomHook('close'); room.classList.remove('on', 'idle'); room.setAttribute('aria-hidden', 'true'); document.documentElement.style.overflow = ''; clearTimeout(aT); clearTimeout(capT); clearTimeout(idleT); auto = false; $('#rAuto').setAttribute('aria-pressed', 'false'); }
room.addEventListener('pointermove', wake); room.addEventListener('focusin', wake);
$('#openRoom').addEventListener('click', openRoom);
$('#rPrev').addEventListener('click', () => advance(-1));
$('#rNext').addEventListener('click', () => { setBlank(false); advance(1); });
$('#rAuto').addEventListener('click', () => { auto = !auto; $('#rAuto').setAttribute('aria-pressed', String(auto)); go(cur); });
$('#rBlank').addEventListener('click', () => setBlank(!neutral.classList.contains('on')));
$('#rExit').addEventListener('click', closeRoom);
document.addEventListener('keydown', e => {
  if (room.classList.contains('on')) {
    if (e.key === 'Tab') { wake(); return; }
    if (roomHook('key', e, SL[cur])) { wake(); return; }
    if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); setBlank(false); advance(1); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); advance(-1); }
    else if (e.key === 'Escape' || e.key.toLowerCase() === 'b') setBlank(true);
    else if (e.key.toLowerCase() === 'a') $('#rAuto').click();
    return;
  }
  if (e.key === 'Escape' && drawer.classList.contains('on')) { closeDrawer(); return; }
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(tag) && !drawer.classList.contains('on')) { e.preventDefault(); setTimeout(() => { $('#q').focus({ preventScroll: true }); $('#q').scrollIntoView({ block: 'center', behavior: behavior() }); }, 0); }
});
