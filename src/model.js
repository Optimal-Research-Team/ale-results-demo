/* ==========================================================================
   Pure helpers (mirror lib/ale/status.ts, format.ts, trend.ts)
   ========================================================================== */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ymd = iso => iso.split('-').map(Number);
const formatLongDate = iso => { const [y, m, d] = ymd(iso); return `${MONTHS[m - 1]} ${d}, ${y}`; };
const formatShortDate = iso => { const [y, m, d] = ymd(iso); return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`; };
const formatMonthYear = iso => { const [y, m] = ymd(iso); return `${MONTHS[m - 1].slice(0, 3)} ${y}`; };
const formatYear = iso => iso.slice(0, 4);
const fmtNum = (x, p) => { const s = Math.abs(x).toFixed(p); const [i, f] = s.split('.'); return (x < 0 ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : ''); };
const decimals = x => { const t = String(x), i = t.indexOf('.'); return i < 0 ? 0 : t.length - i - 1; };
const fmtT = (x, p) => fmtNum(x, Math.max(p, decimals(x)));
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
const formatPctChange = (a, b) => { if (a == null || b == null || a === 0) return null; const p = Math.round((b - a) / a * 100); return (p > 0 ? '+' : p < 0 ? '−' : '') + Math.abs(p) + '%'; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emptyCounts = () => ({ optimal: 0, in_range: 0, borderline: 0, out_of_range: 0 });

function stateFor(bands, value) {
  for (const seg of bands.segments) if (seg.upTo === null || value < seg.upTo) return seg.state;
  return bands.segments[bands.segments.length - 1].state;
}
function worstState(states) {
  let w = null; for (const s of states) if (s && (w === null || STATE_RANK[s] < STATE_RANK[w])) w = s; return w;
}
function toBands(d) {
  if (d.steps) {
    const segments = []; d.stepStates.forEach((s, i) => { const last = segments[segments.length - 1]; if (last && last.state === s) last.upTo = i + 1; else segments.push({ upTo: i + 1, state: s }); });
    segments[segments.length - 1].upTo = null;
    return { sex: 'any', domain: [0, d.steps.length], segments, steps: d.steps, stepStates: d.stepStates, lab: { low: null, high: null }, optimal: null, source: 'Synthetic prototype catalog' };
  }
  const r = d.r, segments = [];
  for (let i = 1; i < r.length - 1; i += 2) segments.push({ upTo: i + 1 < r.length - 1 ? r[i + 1] : null, state: r[i] });
  return { sex: 'M', domain: [r[0], r[r.length - 1]], segments, lab: { low: null, high: null }, optimal: null, source: 'Synthetic prototype catalog' };
}
/** Bands as drawable intervals clipped to the visual domain. */
function bandList(bands) {
  const [a, b] = bands.domain; let lo = a;
  return bands.segments.map(s => { const hi = s.upTo === null ? b : Math.min(Math.max(s.upTo, a), b); const out = { lo, hi, state: s.state, open: s.upTo === null }; lo = hi; return out; }).filter(x => x.hi > x.lo);
}
function goalBand(bands) { const bl = bandList(bands); return bl.find(x => x.state === O) || bl.find(x => x.state === N) || null; }
function distToGoal(bands, v) { const g = goalBand(bands); if (!g) return 0; return v < g.lo ? g.lo - v : v > g.hi ? v - g.hi : 0; }

const LAST_EXAM = EXAM_DATES[EXAM_DATES.length - 1];
/* A first assessment has no previous exam. Falling back to the only one keeps
   every consumer working; FIRST_EXAM is how the page knows to stop talking
   about change it cannot show. */
const FIRST_EXAM = EXAM_DATES.length < 2;
const PREV_EXAM = FIRST_EXAM ? LAST_EXAM : EXAM_DATES[EXAM_DATES.length - 2];

function buildMarker(d, order) {
  const bands = toBands(d), ordinal = !!d.steps;
  const reading = (examDate, raw, kind) => {
    if (raw == null) return null;
    const value = ordinal ? d.steps.indexOf(raw) : raw;
    return { examDate, kind, value, valueText: ordinal ? raw : null, comparator: null, state: ordinal ? d.stepStates[value] : stateFor(bands, value) };
  };
  /* Not every result arrives on the annual cadence. A low vitamin D gets
     rechecked in the spring; a thyroid dose change is followed up in six
     weeks. Those readings are real history and belong on the marker's line,
     but they are not an assessment: the ring chart, the year scrubber and the
     year-over-year tally all stay keyed to EXAM_DATES, and an interim reading
     is simply a point between two of them. */
  const points = [
    ...EXAM_DATES.map((examDate, i) => reading(examDate, d.v[i], 'exam')),
    ...(d.x || []).map(([date, raw]) => reading(date, raw, 'interim')),
  ].filter(Boolean).sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : 0));
  const latest = points[points.length - 1];
  // one lab hiccup and a marker has no value in any exam; it is dropped rather
  // than taking the whole page down on latest.examDate
  if (!latest) return null;
  const carriedForward = latest.examDate !== LAST_EXAM;
  const previous = carriedForward || FIRST_EXAM ? null : (points.find(p => p.examDate === PREV_EXAM && p.kind === 'exam') || null);
  const mv = {
    marker: { id: d.id, name: d.name, long: d.long, system: d.system, order, precision: d.precision || 0, unit: d.unit,
      direction: 'in_range', copy: { why: d.why, about: d.about }, oncePerLifetime: !!d.once, valueType: ordinal ? 'ordinal' : 'quantity' },
    bands, points, latest, previous, trend: 'steady', labFlag: null, refText: null, carriedForward,
  };
  mv.trend = trendOf(mv);
  return mv;
}
function trendOf(mv) {
  if (mv.carriedForward) return 'steady';
  if (!mv.previous) return 'new';
  const a = mv.previous, b = mv.latest;
  if (STATE_RANK[b.state] !== STATE_RANK[a.state]) return STATE_RANK[b.state] > STATE_RANK[a.state] ? 'improved' : 'worsened';
  if (mv.marker.valueType === 'ordinal') return 'steady';
  const [d0, d1] = mv.bands.domain, d = (distToGoal(mv.bands, a.value) - distToGoal(mv.bands, b.value)) / (d1 - d0);
  return d > 0.025 ? 'improved' : d < -0.025 ? 'worsened' : 'steady';
}

const MARKERS = DEFS.map(buildMarker).filter(Boolean);
const BY_ID = Object.fromEntries(MARKERS.map(m => [m.marker.id, m]));
const SUMMARY = (() => {
  const byState = emptyCounts(), prev = emptyCounts(); let prevTotal = 0;
  MARKERS.forEach(m => {
    byState[m.latest.state]++;
    const pp = [...m.points].reverse().find(p => p.kind === 'exam' && p.examDate <= PREV_EXAM);
    if (pp) { prev[pp.state]++; prevTotal++; }
  });
  return { total: MARKERS.length, byState, healthy: byState.optimal + byState.in_range,
    previous: { total: prevTotal, byState: prev, healthy: prev.optimal + prev.in_range },
    improved: MARKERS.filter(m => m.trend === 'improved').length, worsened: MARKERS.filter(m => m.trend === 'worsened').length };
})();
const SYSTEMS = SYSTEM_ORDER.map(s => {
  const ms = MARKERS.filter(m => m.marker.system === s), byState = emptyCounts();
  ms.forEach(m => byState[m.latest.state]++);
  return { system: s, label: SYSTEM_LABEL[s], markerIds: ms.map(m => m.marker.id), byState, worst: worstState(ms.map(m => m.latest.state)) };
}).filter(s => s.markerIds.length);

/** PatientView (lib/ale/types.ts) — everything the dashboard, TV deck and PDF render. */
const VIEW = {
  productName: PRODUCT_NAME,
  report: { id: 'sample-report', examDate: LAST_EXAM, collectedAt: '2026-09-12T08:10:00-04:00', labName: 'LifeLabs', publishedAt: '2026-09-24T16:30:00-04:00', amended: false, status: 'published' },
  patient: { firstName: 'Daniel', sex: 'M', ageAtExam: 44 },

  version: VERSION, markers: MARKERS, systems: SYSTEMS, summary: SUMMARY, examDates: EXAM_DATES,
  catalog: { version: 'sample', approved: false },
};

