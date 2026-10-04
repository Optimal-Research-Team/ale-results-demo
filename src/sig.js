/* ==========================================================================
   Signatures (v5): the page and deck wiring for the three modules.
     · Your longevity target  → renderBullseye (SVG)          #target, deck 3
     · Behind the numbers     → mountVials (three.js r128)    #samples
     · The Living Scan        → mountScan (three.js r128)     #scan, deck 1 + 4
   three.js arrives through the deferred <script id="three-js"> in src.html,
   never on the critical path. WebGL scenes mount only as they near the
   viewport, render only while visible, and fall back to the modules' SVG
   stills without WebGL. Nothing here computes a medical value: every count,
   state and range comes from MARKERS / SYSTEMS / SUMMARY.
   ========================================================================== */

/* ---------- three.js loader, WebGL test, lazy mount ---------- */
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const GL_OK = (() => {
  try {
    const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl');
    if (!g) return false;
    const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext();
    return true;
  } catch (e) { return false; }
})();
/* Screenshots and thumbnails (webdriver) mount everything at once, so the
   captured page shows the real figures; people get lazy mounting. */
const EAGER = !!navigator.webdriver;
let threeP = null;
function loadThree() {
  if (threeP) return threeP;
  threeP = new Promise((ok, no) => {
    if (window.THREE) { ok(window.THREE); return; }
    if (!GL_OK) { no(new Error('webgl')); return; }
    let tag = document.getElementById('three-js');
    if (!tag) { tag = document.createElement('script'); tag.src = THREE_URL; tag.async = true; (document.head || document.documentElement).appendChild(tag); }
    tag.addEventListener('load', () => (window.THREE ? ok(window.THREE) : no(new Error('three'))), { once: true });
    tag.addEventListener('error', () => no(new Error('three')), { once: true });
    setTimeout(() => (window.THREE ? ok(window.THREE) : no(new Error('three timeout'))), 6000);
  });
  threeP.catch(() => {}); // every caller handles the failure; keep the console clean
  return threeP;
}
/** Run fn once the element is within `margin` of the viewport (or at once for thumbnails). */
function near(el, fn, margin) {
  if (!el) return;
  if (EAGER || !('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin });
  io.observe(el);
}

/* ==========================================================================
   Shared "which system" state. focusSys drives the visuals (target sector,
   body figure, system list, pills); ui.sys is the ledger filter and changes
   only through the ledger's own controls or "Show these in results".
   ========================================================================== */
let focusSys = null, pinnedState = null, bx = null, scan = null;
function focusSystem(id, from) {
  focusSys = id && SYS_BY[id] ? id : null;
  pinnedState = null; syncLegend();
  applyChart();
  if (scan && from !== 'scan') scan.select(focusSys);
  syncSysUI();
}
/* The system rows live in the sheet now, so this only runs while it is open. */
function syncSysUI() {
  $$('.bm-row', drawer).forEach(r => {
    const on = r.dataset.row === focusSys;
    r.dataset.open = String(on); r.classList.toggle('on', on);
    $('.bm-btn', r).setAttribute('aria-expanded', String(on)); $('.clip-in', r).inert = !on;
  });
}
function showInResults(id) {
  ui.f = 'all'; ui.q = ''; $('#q').value = ''; syncSearch();
  setLedgerSys(id, true);
  requestAnimationFrame(landOnRows);
}
SYS_SUBS.push(id => focusSystem(id, 'ledger'));

/* ==========================================================================
   SIGNATURE 3 · Your longevity target
   ========================================================================== */
const BX_SYS = SYSTEMS.map(s => ({ id: s.system, label: s.label }));
const BX_MARKERS = MARKERS.map(mv => {
  const m = mv.marker, ord = isOrd(mv), L = mv.latest, Pv = mv.previous, g = goalOf(mv), u = unitOf(mv);
  const hasTarget = !ord && bandList(mv.bands).some(x => x.state === 'optimal');
  const note = [
    g && !ord ? `${goalWord(mv)} ${targetText(mv)}${u ? ' ' + u : ''}` : '',
    mv.carriedForward || m.oncePerLifetime ? `Measured once, in ${formatYear(L.examDate)}.` : '',
    Pv ? `${formatYear(Pv.examDate)} → ${formatYear(L.examDate)}: ${valText(mv, Pv)} → ${valText(mv, L)}` : '',
  ].filter(Boolean).join('\n');
  return {
    id: m.id, name: m.name, system: m.system, systemLabel: SYSTEM_LABEL[m.system], state: L.state,
    // no clinic target: one fixed lane mid-ring (depth would otherwise read as "nearly optimal")
    closeness: L.state === 'in_range' && !hasTarget ? 0.5 : bullseyeCloseness(mv.bands, L.value, ord), valueText: valText(mv, L), unit: u,
    hollow: L.state === 'in_range' && !hasTarget, hasTarget, once: m.oncePerLifetime, priority: null, note,
    prev: Pv ? { state: Pv.state, closeness: Pv.state === 'in_range' && !hasTarget ? 0.5 : bullseyeCloseness(mv.bands, Pv.value, ord) } : null,
    /* every exam, not just the last two, so the chart can be walked through the
       whole history. A year the marker was not drawn holds null and the dot
       simply stays where it was. */
    series: EXAM_DATES.map(d => {
      const pt = mv.points.find(x => x.examDate === d);
      if (!pt || pt.value == null) return null;
      return { state: pt.state, closeness: pt.state === 'in_range' && !hasTarget ? 0.5 : bullseyeCloseness(mv.bands, pt.value, ord) };
    }),
  };
});
function mountTarget() {
  if (!$('#bx')) return;
  bx = renderBullseye($('#bx'), {
    markers: BX_MARKERS, systems: BX_SYS, reducedMotion: !MOTION, entrance: 'trend',
    ariaLabel: `Your longevity target: all ${S.total} markers, each in the ring for its state and grouped by body system`,
    onOpen: id => openDrawer(id),
    onSystem: id => focusSystem(focusSys === id ? null : id, 'target'),
  });
  applyChart();
}
function applyChart() {
  if (!bx) return;
  if (pinnedState) bx.highlightState(pinnedState);
  else { bx.highlightState(null); bx.highlight(focusSys); }
  renderCtx();
}
const tgCtx = $('#tgCtx');
/** One line under the chart saying what the highlight shows, with its action. */
function renderCtx() {
  let h = '';
  if (pinnedState) {
    const n = S.byState[pinnedState], f = pinnedState === 'optimal' ? 'opt' : needs(pinnedState) ? 'attn' : null;
    h = `<span class="tg-cx-t"><span class="dot bg-${pinnedState}"></span><b class="num">${n}</b> ${esc(STATE_LABEL[pinnedState].toLowerCase())}</span>` +
      (f ? `<button type="button" class="tg-cx-a" data-tg-see="${f}">${f === 'attn' ? `See all ${attention} that need attention` : 'See them in results'} ${ICON.arrow}</button>` : '');
  } else if (focusSys) {
    const s = SYS_BY[focusSys];
    h = `<span class="tg-cx-t"><b>${esc(s.label)}</b><span class="num">${s.markerIds.length} marker${s.markerIds.length === 1 ? '' : 's'}</span>${sysTag(s)}</span>` +
      `<button type="button" class="tg-cx-a" data-bm-go="${s.system}">Show these in results ${ICON.arrow}</button>`;
  }
  if (!tgCtx) return;
  tgCtx.innerHTML = h ? h + `<button type="button" class="tg-cx-x" data-tg-clear aria-label="Clear highlight">${ICON.x}</button>` : '';
  tgCtx.classList.toggle('on', !!h);
}
function syncLegend() { $$('.tg-row').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.st === pinnedState))); }
const legend = $('.tg-legend');
if (legend) legend.addEventListener('pointerover', e => { const b = e.target.closest('.tg-row'); if (b && bx && e.pointerType === 'mouse') bx.highlightState(b.dataset.st); });
if (legend) legend.addEventListener('pointerleave', applyChart);
if (legend) legend.addEventListener('focusin', e => { const b = e.target.closest('.tg-row'); if (b && bx) bx.highlightState(b.dataset.st); });
if (legend) legend.addEventListener('focusout', e => { if (!legend.contains(e.relatedTarget)) applyChart(); });
if (legend) legend.addEventListener('click', e => {
  const b = e.target.closest('.tg-row'); if (!b) return;
  pinnedState = pinnedState === b.dataset.st ? null : b.dataset.st;
  syncLegend(); applyChart();
});
const tgCmpEl = $('#tgCmp');
if (tgCmpEl) tgCmpEl.addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-checked') !== 'true'; e.currentTarget.setAttribute('aria-checked', String(on)); if (bx) bx.setCompare(on); });
const tgListEl = $('#tgList');
if (tgListEl) tgListEl.addEventListener('click', e => {
  const btn = e.currentTarget, box = $('.tg-list'), open = box.dataset.open !== 'true';
  box.dataset.open = String(open); btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Hide the list' : 'View as list';
  $('#tgListBox').inert = !open;
});
mountTarget();

/* ==========================================================================
   SIGNATURE 1 · Behind the numbers (the sample containers)
   ========================================================================== */
const vsSec = $('#samples'), vsPin = $('.vs-pin', vsSec), vsSticky = $('.vs-sticky', vsSec), vsGL = $('#vialsGL');
const vsBeats = $$('.vs-beat', vsSec), vsIdx = $$('.vs-idx li', vsSec), vsSheet = $('#vsSheet'), vsLeg = $('.vs-leg', vsSec), vsBelow = $('.vs-below', vsSec);
const VS_WIDE = matchMedia('(min-width: 1001px) and (min-height: 700px)');
const VS_POSTER = vsGL.innerHTML;
const VS_OPTS = {
  containers: SAMPLES.map(c => ({ id: c.id, label: c.label, cap: c.cap, markerCount: c.markerCount, states: c.states, systems: c.systems })),
  total: S.total, date: SAMPLE_DATE,
};
const vsPline = document.createElement('p'); vsPline.className = 'vs-pline num'; vsPline.setAttribute('aria-live', 'polite');
let vials = null, vsMode = null, vsBeat = -1, vsSel = null, vsFailed = false, vsTop = 0, vsRaf = 0, vsWant = false, vsFocusId = null;
/* story: the pinned desktop story. pstory: the phone's short pinned story (375–640 wide, 600+ tall).
   still: beats beside one settled frame. compact: unpinned, the set turns with scroll. */
const vsModeFor = () => {
  const live = MOTION && GL_OK && !vsFailed;
  if (VS_WIDE.matches) return live ? 'story' : 'still';
  // v7: phones get the unpinned stage. The pinned phone story cost ~1,460 px
  // and hijacked the scroll; the set now turns with the page as it passes.
  return 'compact';
};
/* Story progress. The tubes start dropping into the rack while the section scrolls in (the first
   stretch plays on approach), so the stage is never empty when it pins. */
const VS_LEAD = 0.12, VS_LEAD_P = 0.18;
function vsP() {
  if (vsMode === 'story' || vsMode === 'pstory') {
    const lead = vsMode === 'story' ? VS_LEAD : VS_LEAD_P;
    const r = vsPin.getBoundingClientRect(), span = r.height - vsSticky.offsetHeight, vh = innerHeight;
    const pin = span > 0 ? clamp((vsTop - r.top) / span, 0, 1) : 0, near = clamp((vh - r.top) / Math.max(1, vh - vsTop), 0, 1);
    return lead * near + (1 - lead) * pin;
  }
  if (vsMode === 'compact') { const r = vsGL.getBoundingClientRect(), vh = innerHeight; return clamp((vh - r.top) / (vh + r.height), 0, 1); }
  return 1;
}
/* Phone curve onto the scene's own: drop 0–0.3, turn label-forward 0.3–0.6, then each container lifts in turn. */
const phoneCurve = p => (p < 0.3 ? (p / 0.3) * 0.12 : p < 0.6 ? 0.12 + ((p - 0.3) / 0.3) * 0.225 : 0.35 + ((p - 0.6) / 0.4) * 0.315);
function vsSetBeat(p) {
  const b = vsMode === 'pstory' ? (p < 0.45 ? 0 : 1) : p < 0.33 ? 0 : p < 0.66 ? 1 : 2;
  vsIdx.forEach((li, i) => li.style.setProperty('--w', (clamp((p - i / 3) * 3, 0, 1) * 100).toFixed(1) + '%'));
  if (b === vsBeat) return;
  vsBeat = b;
  vsBeats.forEach((el, i) => el.classList.toggle('on', i === b));
  vsIdx.forEach((li, i) => li.classList.toggle('on', i === b));
}
function vsRead() {
  vsRaf = 0; if (!vsMode) return;
  const p = vsP();
  if (vsMode === 'story' || vsMode === 'pstory') vsSetBeat(p);
  if (vials && MOTION && vsMode !== 'still') vials.setProgress(vsMode === 'pstory' ? phoneCurve(p) : p);
}
/* the phone story's legend follows the lifted container: its cell presses, its counts show under the row */
function vsFocus(id) {
  vsFocusId = id;
  if (vsMode !== 'pstory' || vsSel) return;
  $$('.vs-cell', vsSec).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vial === id)));
  const c = SAMPLES.find(x => x.id === id);
  vsPline.innerHTML = c ? `<b>${esc(c.label)}</b> · ${countsLine(c.states)}` : `<span class="vs-pl-q">${esc(`${SAMPLES.length} samples · ${SAMPLES.reduce((n, x) => n + x.markerCount, 0)} markers from this visit`)}</span>`;
}
/* The desktop story fills the containers as you scroll, and the tally climbs
   with them: each container's markers are counted in as its liquid rises, so
   the object is the progress read rather than a chart beside it. */
const vsTally = $('#vsTally'), vsTallyN = vsTally && $('.vt-n', vsTally);
let vsLastN = -1;
function vsCount(fills, cs) {
  if (!vsTallyN) return;
  let n = 0;
  cs.forEach((c, i) => { n += (c.markerCount || 0) * (fills[i] || 0); });
  const r = Math.round(n);
  if (r === vsLastN) return;
  vsLastN = r;
  vsTallyN.textContent = r;
  vsTally.classList.toggle('full', r >= cs.reduce((t, c) => t + (c.markerCount || 0), 0));
}

function vsMount() {
  vsWant = true;
  if (vials || !GL_OK || vsFailed) return;
  loadThree().then(() => {
    if (vials || !vsMode) return;
    const still = vsMode === 'still' || !MOTION, story = vsMode === 'story', pst = vsMode === 'pstory';
    vials = mountVials(vsGL, Object.assign({}, VS_OPTS, {
      mode: vsMode === 'compact' ? 'compact' : 'story', reducedMotion: still,
      progress: vsMode === 'still' ? 1 : pst ? phoneCurve(vsP()) : vsP(), callout: story,
      zoom: story ? 1.32 : 1, bleed: story, onFocus: vsFocus,
      fillScroll: story, onFill: story ? vsCount : null,
    }));
    if (vials.fallback) { vsFailed = true; vsSetMode(); return; }
    if (vsSel) vials.setFocus(vsSel);
    vsRead();
  }, () => { vsFailed = true; vsSetMode(); });
}
function vsSetMode() {
  const m = vsModeFor();
  vsTop = 0;
  if (m !== vsMode) {
    vsMode = m; vsSec.dataset.mode = m; vsBeat = -1;
    if (m === 'story' || m === 'pstory') vsSetBeat(0); else vsBeats.forEach(el => el.classList.add('on'));
    if (m === 'pstory') { vsSticky.appendChild(vsLeg); vsSticky.appendChild(vsPline); vsFocus(null); }
    else if (vsLeg.parentNode !== vsBelow) { vsBelow.insertBefore(vsLeg, vsBelow.firstChild); vsPline.remove(); }
    if (vials) { vials.destroy(); vials = null; vsGL.innerHTML = VS_POSTER; if (vsWant) vsMount(); }
  }
  vsTop = parseFloat(getComputedStyle(vsSticky).top) || 0;
  vsRead();
}
/* ==========================================================================
   #14 · the phone carousel. Swiping is the native control, so the carousel
   drives the 3D set: the settled card lifts its container and dims the rest,
   and tapping a container scrolls to its card. A one-time tour shows the
   piece without hijacking the scroll.
   ========================================================================== */
const vsCar = $('#vsCar'), vsTrack = $('#vsTrack'), vsPager = $('#vsPager');
const vsCards = vsTrack ? $$('.vs-card', vsTrack) : [];
let vsCard = 0, vsCarRaf = 0, tourT2 = null, tourDone = false;
function vsCardAt() {
  if (!vsTrack) return 0;
  const x = vsTrack.scrollLeft + 1;
  let best = 0, bd = Infinity;
  vsCards.forEach((el, i) => { const d = Math.abs(el.offsetLeft - vsTrack.offsetLeft - x); if (d < bd) { bd = d; best = i; } });
  return best;
}
function vsCarSync() {
  vsCarRaf = 0;
  const i = vsCardAt(); if (i === vsCard) return;
  vsCard = i;
  vsCards.forEach((el, k) => el.classList.toggle('on', k === i));
  $$('i', vsPager).forEach((d, k) => d.classList.toggle('on', k === i));
  const id = i === 0 ? null : (vsCards[i].dataset.vialCard || null);
  if (vials) vials.setFocus(id);          // the settled card lifts its container
  vsSel = id;
  $$('.vs-cell', vsSec).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vial === id)));
}
function vsGoCard(i, smooth = true) {
  if (!vsTrack || !vsCards[i]) return;
  vsTrack.scrollTo({ left: vsCards[i].offsetLeft - vsTrack.offsetLeft, behavior: smooth && MOTION ? 'smooth' : 'instant' });
}
function stopVsTour() { clearTimeout(tourT2); tourT2 = null; tourDone = true; }
function vsTour() {
  if (tourDone || !MOTION || !vsTrack || !MQ.phone.matches) return;
  tourDone = true;                        // once per page view
  let k = 0;
  const step = () => { k++; if (k > vsCards.length - 1) { tourT2 = null; return; } vsGoCard(k); tourT2 = setTimeout(step, 880); };
  tourT2 = setTimeout(step, 880);         // 5 cards x 880 ms = 4.4 s, under WCAG 2.2.2
}
if (vsTrack) {
  vsTrack.addEventListener('scroll', () => { if (!vsCarRaf) vsCarRaf = requestAnimationFrame(vsCarSync); }, { passive: true });
  ['touchstart', 'pointerdown', 'wheel', 'keydown'].forEach(ev => vsTrack.addEventListener(ev, stopVsTour, { passive: true }));
  addEventListener('scroll', () => { if (tourT2) stopVsTour(); }, { passive: true, once: true });
  vsTrack.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); stopVsTour();
    vsGoCard(clamp(vsCard + (e.key === 'ArrowRight' ? 1 : -1), 0, vsCards.length - 1));
  });
  // the tour starts when the carousel has actually arrived
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (e.intersectionRatio < 0.6) return;
      cio.disconnect(); setTimeout(vsTour, 400);
    }), { threshold: 0.6 });
    cio.observe(vsCar);
  }
}

function vsSelect(id) {
  if (MQ.phone.matches && vsTrack) {
    stopVsTour();
    const i = vsCards.findIndex(el => el.dataset.vialCard === id);
    vsGoCard(i < 0 ? 0 : i);
    return;
  }
  vsSel = vsSel === id ? null : id;
  if (vials) vials.setFocus(vsSel);
  $$('.vs-cell', vsSec).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vial === vsSel)));
  const c = SAMPLES.find(x => x.id === vsSel);
  if (vsMode === 'pstory') { if (c) vsPline.innerHTML = `<b>${esc(c.label)}</b> · ${countsLine(c.states)}`; else vsFocus(vsFocusId); return; }
  vsSheet.classList.toggle('on', !!c);
  const sys = c ? (c.systems.length > 3 ? [...c.systems.slice(0, 2).map(esc), `+${c.systems.length - 2} more`] : c.systems.map(esc)) : [];
  vsSheet.innerHTML = c ? `<p class="vs-sh-h"><i style="background:${c.hex}"></i><b>${esc(c.label)}</b><span>${esc(c.tube)} · <span class="num">${c.markerCount}</span> marker${c.markerCount === 1 ? '' : 's'}</span></p>
    <p class="vs-sh-c num">${countsLine(c.states)}</p><p class="vs-sh-s">${sys.join('<span class="sep"> · </span>')}</p>` : '';
}
vsSec.addEventListener('click', e => {
  const cell = e.target.closest('[data-vial]'); if (cell) { vsSelect(cell.dataset.vial); return; }
  // tap a container on the canvas (compact and still): nearest cap by x
  if (!vials || vials.fallback || vsMode === 'story' || !e.target.closest('#vialsGL')) return;
  const r = vsGL.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bd = Infinity;
  SAMPLES.forEach(c => { const a = vials.getAnchor(c.id); if (!a) return; const d = Math.abs(a.x - x) / Math.max(a.r, 12); if (d < bd && y > a.y - 60) { bd = d; best = c.id; } });
  if (best && bd < 2.2) vsSelect(best);
});
/* the pinned story never traps focus: tabbing into a beat scrolls the story to it */
vsSec.addEventListener('focusin', e => {
  const beat = e.target.closest('.vs-beat'); if (vsMode !== 'story' || !beat || +beat.dataset.b === vsBeat) return;
  const r = vsPin.getBoundingClientRect(), span = r.height - vsSticky.offsetHeight;
  const want = (+beat.dataset.b + 0.5) / 3, pin = clamp((want - VS_LEAD) / (1 - VS_LEAD), 0, 1);
  scrollTo({ top: scrollY + r.top - vsTop + span * pin, behavior: 'instant' }); // not smooth: the focused beat must be the visible one at once
});
addEventListener('scroll', () => { if (!vsRaf) vsRaf = requestAnimationFrame(vsRead); }, { passive: true });
addEventListener('resize', () => { cancelAnimationFrame(vsRaf); vsRaf = requestAnimationFrame(vsSetMode); });
VS_WIDE.addEventListener('change', vsSetMode);
vsSetMode();
near(vsSec, vsMount, '150% 0px');

/* ==========================================================================
   SIGNATURE 1 · The Living Scan
   The hero is a pinned track: the figure builds under a laser on arrival, and
   scrolling dollies the camera onto the furthest result and hands off to #attention.
   It also absorbed v6's body map, so its reticles are the system controls.
   ========================================================================== */
const scanSec = $('#scan'), scanTrack = $('.scan-track'), scanFrame = $('.scan-frame'), scanCopy = $('.scan-copy'), scanStage = $('#scanStage');
const P1_MV = ATTENTION[0], P1_SYS = P1_MV ? P1_MV.marker.system : SYSTEMS[0].system;
const scanQuality = () => (MQ.phone.matches ? 'phone' : docEl.classList.contains('tv') ? 'tv' : 'desktop');
/* ?hero=bay switches the hero to the Systems Bay treatment: a character-screen
   read with slot cards, a radar field and heavier chrome. */
const HERO = new URLSearchParams(location.search).get('hero') || 'target';
const HERO_BAY = HERO === 'bay';
const HERO_LINE = HERO === 'engraving';
if (HERO) docEl.classList.add('hero-' + HERO);
const zoomK = () => { const z = parseFloat(getComputedStyle(docEl).getPropertyValue('--z')); return docEl.classList.contains('tv') && z > 0 ? z : 1; };

/* The camera solves its framing from what the copy actually measures, so the
   crown and the lowest reticle hold at 360, 390, 430 and on a 4K TV. */
function scanFrameSpec(W, H) {
  const stacked = MQ.phone.matches || W / H < 1.1;
  const bar = parseFloat(getComputedStyle(docEl).getPropertyValue('--chrome-h')) || 65;
  const pad = stacked ? 16 : 32, hudBottom = bar + pad + (stacked ? 34 : 8);
  if (stacked) {
    const cA = $('.sc-cA', scanCopy);
    const copyTop = cA ? cA.offsetTop : Math.round(H * 0.52);
    scanStage.style.setProperty('--copy-top', copyTop + 'px');
    return { composition: 'stacked', hudBottom, copyTop, figX: 0.5, safeL: pad, safeR: pad, wbTop: hudBottom + 8, restYaw: 14, lockYaw: 26 };
  }
  return { composition: 'side', crown: HERO_BAY ? 0.20 : 0.175, sole: HERO_BAY ? 0.90 : 0.885,
    figX: HERO_BAY ? 0.55 : 0.52, plateX: HERO_BAY ? 0.55 : 0.52, bx: 0.60,
    tagGap: HERO_BAY ? 58 : 36, tagTop: HERO_BAY ? 96 : 70, tagBot: HERO_BAY ? 72 : 104,
    safeL: 40, safeR: 40, hudTop: bar - 26, hudBottom, copyTop: Math.round(H * 0.5), wbTop: hudBottom + 8, restYaw: 16, lockYaw: 28 };
}

const SCAN_SYSTEMS = SYSTEMS.map(s => {
  const mk = MARKERS.filter(m => m.marker.system === s.system);
  return { id: s.system, label: s.label, worst: s.worst, status: sysStatus(s), attn: needs(s.worst),
    count: mk.length, tiles: STATE_ORDER.flatMap(k => mk.filter(m => m.latest.state === k).map(() => k)) };
});
/* The 39 markers themselves: the subject of the scan. The figure is the volume
   they sit in, nothing more. */
const SCAN_MARKERS = MARKERS.map(m => ({ id: m.marker.id, system: m.marker.system, state: m.latest.state, priority: 0 }));
const SCAN_PRIOS = Object.fromEntries(ATTENTION.slice(0, 3).map((mv, i) => [mv.marker.system, i + 1]));
const SCAN_HUD = {
  tl: `Scan ${YEAR} · ${S.total} markers · ${SYSTEMS.length} systems`,
  tr: `${V.report.labName} · ${shortMonthDay(V.report.collectedAt.slice(0, 10))}`,
  honesty: 'Mapped from blood and urine · positions approximate',
  hint: 'Drag to turn · S · all systems', hintPhone: 'Tap a system',
};

/* ?hero=sample - the draw itself is the hero. The tubes are the warmest,
   most tactile object the product owns, and they are literally where every
   number on the page came from. The systems keep their home in the body
   section, which returns when this hero is chosen. */
const HERO_SAMPLE = HERO === 'sample';
let heroVials = null;
function mountSampleHero() {
  const st = $('#sampleStage'); if (!st || heroVials) return;
  heroVials = mountVials(st, {
    containers: SAMPLES.filter(c => c.id !== 'urine')
      .map(c => ({ id: c.id, label: c.label, cap: c.cap, markerCount: c.markerCount, states: c.states, systems: c.systems, tube: c.tube })),
    total: S.total, date: SAMPLE_DATE, mode: 'compact', labels: false,
    zoom: 1, bleed: false,
    reducedMotion: !MOTION, threeReady: loadThree(), forceFallback: !GL_OK,
  });
  let vr = 0;
  const spin = () => {
    vr = 0;
    const t = scanTrack.getBoundingClientRect(), Z = zoomK();
    const span = t.height - scanFrame.offsetHeight * Z;
    const p = span > 8 ? clamp(-t.top / span, 0, 1) : (t.top < 0 ? 1 : 0);
    if (heroVials && heroVials.setProgress) heroVials.setProgress(p);
  };
  addEventListener('scroll', () => { if (!vr) vr = requestAnimationFrame(spin); }, { passive: true });
  spin();
}


/* The plates light when they arrive, and the sheet's plate lights as it opens. */
function litPlates(root) {
  $$('.plate-wrap', root || document).forEach(w => {
    if (w._lit) return; w._lit = 1;
    near(w, () => requestAnimationFrame(() => w.classList.add('lit')), '40% 0px');
  });
}
litPlates();
document.addEventListener('plates:new', e => litPlates(e.detail || document));

/* Ambient loops: fetched only as their section approaches, and revealed only
   once playback has actually started. If the file never plays - no codec, slow
   link, a blocked autoplay - the ground beneath simply stays. */
$$('video.loop').forEach(v => {
  near(v.parentElement || v, () => {
    v.preload = 'auto';
    const show = () => v.classList.add('ready');
    v.addEventListener('playing', show, { once: true });
    v.addEventListener('loadeddata', () => { if (!v.paused) show(); }, { once: true });
    const go = v.play();
    if (go && go.catch) go.catch(() => { /* autoplay refused: the still stands */ });
  }, '150% 0px');
});

/* A drawn trunk section. Irregular ring spacing from layered sine bands, a
   darker latewood edge on each ring, radial grain and a few checks, so it
   reads as timber rather than a target. Painted once to a canvas at mount, so
   it costs nothing per frame and stays crisp at any size. A supplied
   photograph replaces it, but the page never depends on one. */
/* The hero's horizon: a stand of conifers drawn the way the organ plates are
   drawn - silhouettes filled with cross-hatch, sage ink, no outline doing the
   work. Painted rather than drawn as path data so the stand is different at
   every width and nothing ships as an asset. It lives in the bottom band and
   fades out well before the chart, which stays the subject. */
function paintHatch(cv, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  if (!g) return;
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);
  g.lineCap = 'round';

  // a stable shuffle, so the stand is the same on every repaint at one width
  let seed = Math.round(w) * 2654435761 % 4294967296;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

  /* hatch a closed path: parallel strokes across its bounding box, clipped.
     Two passes at opposing angles make the cross-hatch; one pass alone reads
     as shading, which is what the far rows want. */
  const hatch = (path, box, gap, ang, alpha, lw) => {
    g.save(); g.clip(path);
    g.strokeStyle = `rgba(44,78,37,${alpha})`; g.lineWidth = lw;
    const [x0, y0, x1, y1] = box, diag = Math.hypot(x1 - x0, y1 - y0);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, dx = Math.cos(ang), dy = Math.sin(ang);
    g.beginPath();
    for (let t = -diag; t <= diag; t += gap) {
      const px = cx + -dy * t, py = cy + dx * t;
      g.moveTo(px - dx * diag, py - dy * diag);
      g.lineTo(px + dx * diag, py + dy * diag);
    }
    g.stroke(); g.restore();
  };

  /* an engraved spruce: tiers of branches stepping out as they descend, each
     tier with a little droop, so no two trees share a silhouette */
  const spruce = (x, base, ht, halfW, tiers) => {
    const pth = new Path2D(), top = base - ht;
    pth.moveTo(x, top);
    const side = dir => {
      for (let i = 1; i <= tiers; i++) {
        const f = i / tiers, y = top + ht * f;
        const out = halfW * Math.pow(f, 0.78) * (0.86 + rnd() * 0.28);
        pth.lineTo(x + dir * out, y - ht / tiers * 0.26);   // branch tip
        pth.lineTo(x + dir * out * 0.46, y);                // back toward the trunk
      }
      pth.lineTo(x + dir * halfW * 0.08, base);
    };
    side(1);
    pth.lineTo(x - halfW * 0.08, base);
    // mirror back up the other side
    const pts = [];
    for (let i = tiers; i >= 1; i--) {
      const f = i / tiers, y = top + ht * f;
      const out = halfW * Math.pow(f, 0.78) * (0.86 + rnd() * 0.28);
      pts.push([x - out * 0.46, y], [x - out, y - ht / tiers * 0.26]);
    }
    pts.forEach(q => pth.lineTo(q[0], q[1]));
    pth.closePath();
    return { pth, box: [x - halfW * 1.1, top, x + halfW * 1.1, base] };
  };

  /* Three depths. Far trees are small, pale and shaded one way only; near
     trees carry a wash under the hatch so they have mass rather than outline.
     Spacing is jittered hard enough that they cluster and overlap - evenly
     spaced trees read as a fence. */
  const stand = (n, baseY, htR, hwR, ink, gap, cross, lw, wash) => {
    const xs = [];
    for (let i = 0; i < n; i++) xs.push(rnd() * (w + 120) - 60);
    xs.sort((a, b) => a - b);
    xs.forEach(x => {
      const ht = htR[0] + rnd() * (htR[1] - htR[0]);
      const hw = hwR[0] + rnd() * (hwR[1] - hwR[0]);
      const { pth, box } = spruce(x, baseY + rnd() * 10 - 5, ht, hw, 5 + Math.round(rnd() * 3));
      if (wash) { g.save(); g.fillStyle = `rgba(44,78,37,${wash})`; g.fill(pth); g.restore(); }
      hatch(pth, box, gap, -1.18, ink, lw);
      if (cross) hatch(pth, box, gap * 2.1, 0.62, ink * 0.55, lw);
    });
  };
  stand(Math.round(w / 34) + 10, h * 0.72, [h * 0.10, h * 0.30], [8, 21], 0.065, 1.9, false, 0.7, 0);
  stand(Math.round(w / 58) + 6, h * 0.88, [h * 0.20, h * 0.52], [14, 33], 0.10, 2.0, true, 0.75, 0.016);
  stand(Math.round(w / 150) + 3, h * 1.06, [h * 0.40, h * 0.92], [28, 58], 0.125, 2.3, true, 0.85, 0.03);

  // fade the whole band out toward the top, so it never reaches the chart
  const fade = g.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.30, 'rgba(0,0,0,.52)');
  fade.addColorStop(0.62, 'rgba(0,0,0,.10)');
  fade.addColorStop(0.84, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = fade; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
}

/* Repaint on resize, but only when the width really changed - a phone's
   address bar collapsing is not a new stand of trees. */
/* The three supplied engravings are set from their data URIs rather than
   baked into the markup, so an absent file simply leaves the slot empty. */
function mountEngravings() {
  const r = $('.mv-round');
  if (r && typeof RING_URI === 'string' && RING_URI) r.style.backgroundImage = `url("${RING_URI}")`;
  const c = $('.close-shore');
  if (c && typeof CLOSE_URI === 'string' && CLOSE_URI) c.style.backgroundImage = `url("${CLOSE_URI}")`;
  const g = $('.colophon');
  if (g && typeof SPRIG_URI === 'string' && SPRIG_URI) g.src = SPRIG_URI;
}
mountEngravings();

function mountHatch() {
  const cv = $('#thHatch'); if (!cv) return;
  /* A supplied engraving wins over the painted stand. It is placed, not
     stretched: anchored to the bottom and sized to cover, so a wide plate
     crops at the sides rather than squashing on a narrow screen. */
  if (typeof TREELINE_URI === 'string' && TREELINE_URI) {
    const d = document.createElement('div');
    d.className = 'th-hatch th-plate';
    d.setAttribute('aria-hidden', 'true');
    d.style.backgroundImage = `url("${TREELINE_URI}")`;
    cv.replaceWith(d);
    return;
  }
  let lastW = -1;
  const draw = () => {
    const r = cv.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (Math.abs(r.width - lastW) < 2) return;
    lastW = r.width;
    paintHatch(cv, r.width, r.height);
  };
  draw();
  let t = 0;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 180); }, { passive: true });
}

function paintWood(cv, size) {
  const d = Math.max(512, Math.min(1400, Math.round(size)));
  cv.width = cv.height = d;
  const g = cv.getContext('2d'), C = d / 2;
  const cx = C * 1.04, cy = C * 0.96;                   // the pith sits a little off centre
  const img = g.createImageData(d, d), P = img.data;
  // a cheap value-noise field: three octaves of hashed lattice
  const h2 = (x, y) => { let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const sm = t => t * t * (3 - 2 * t);
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a0 = h2(xi, yi), b0 = h2(xi + 1, yi), c0 = h2(xi, yi + 1), d0 = h2(xi + 1, yi + 1);
    return (a0 * (1 - xf) + b0 * xf) * (1 - yf) + (c0 * (1 - xf) + d0 * xf) * yf;
  };
  const fbm = (x, y) => vnoise(x, y) * 0.6 + vnoise(x * 2.3, y * 2.3) * 0.28 + vnoise(x * 5.1, y * 5.1) * 0.12;
  // the palette: bone through warm sage, never orange
  const LO = [40, 56, 33], MID = [98, 114, 79], HI = [168, 178, 138];
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const dx = (x - cx) / C, dy = (y - cy) / C;
      const r = Math.sqrt(dx * dx + dy * dy * 1.06);     // a touch elliptical, as a real cut is
      const ang = Math.atan2(dy, dx);
      // ring spacing wanders, and wide years alternate with narrow ones
      const warp = fbm(x / 130, y / 130) * 5.2 + fbm(x / 44, y / 44) * 1.5 + fbm(x / 15, y / 15) * 0.4;
      // ring width drifts with radius, so no two years are the same thickness
      const band = r * (40 + 11 * Math.sin(r * 4.1 + 1.3) + 6 * Math.sin(r * 11.7));
      const rings = Math.sin(band + warp);
      const late = Math.pow(Math.max(0, rings), 3.4);    // a thin dark latewood edge
      const grain = (vnoise(ang * 52, r * 190) - 0.5) * 0.06;
      let t = 0.55 + 0.20 * rings + grain - late * 0.24;
      t += (fbm(x / 6, y / 6) - 0.5) * 0.045;            // fibre
      // a few radial checks running out from the pith
      const ck = Math.abs(Math.sin(ang * 1.5 + fbm(x / 200, y / 200) * 2.2));
      if (ck > 0.9986 && r > 0.10) t -= (ck - 0.9986) * 90;   // one or two fine checks, not spokes
      t = Math.max(0, Math.min(1, t));
      const c0 = t < 0.5 ? LO : MID, c1 = t < 0.5 ? MID : HI, u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const o = (y * d + x) * 4;
      P[o] = c0[0] + (c1[0] - c0[0]) * u;
      P[o + 1] = c0[1] + (c1[1] - c0[1]) * u;
      P[o + 2] = c0[2] + (c1[2] - c0[2]) * u;
      P[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // a soft vignette so the rim sits back into the ground
  const vg = g.createRadialGradient(cx, cy, d * 0.18, cx, cy, d * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,16,7,.62)');
  g.fillStyle = vg; g.fillRect(0, 0, d, d);
  return cv;
}

/* ?hero=rings - scrolling travels outward through the years. Each ring lights
   as its year arrives, its markers fade in, and the last ring is today. */
const HERO_RINGS = HERO === 'rings';
const HERO_TARGET = HERO === 'target';
/* The hero bullseye. Scroll turns the year: the dots travel from where they
   sat last exam to where they sit now, their states flip at the midpoint, and
   the centre count counts with them. */
let bxHero = null;
function mountTargetHero() {
  const el = $('#bxHero'); if (!el) return;
  mountHatch();
  bxHero = renderBullseye(el, {
    markers: BX_MARKERS, systems: BX_SYS, reducedMotion: !MOTION, entrance: 'trend', autoplay: false, dock: 'never',
    ariaLabel: `Your longevity target: all ${S.total} markers, each in the ring for its state and grouped by body system`,
    onOpen: id => openDrawer(id),
    onSystem: id => focusSystem(focusSys === id ? null : id, 'target'),
  });
  bx = bxHero;                                  // the ledger and sheets drive the same chart

  /* The chart's position in time has one source of truth: the scrubber's value.
     Scrolling writes to it, dragging writes to it, and only it moves the dots.
     Scroll still only covers the last leg - previous exam to today - because
     that is the story the hero tells; the handle is there to walk the rest. */
  const NX = EXAM_DATES.length;
  const scrub = $('#sbIn'), fill = $('#sbFill'), marks = $$('.th-scrub .sb-y');
  const yrs = $$('#thYr span');
  let held = false, lastK = -1;
  const paint = f => {
    if (bxHero.setFrame) bxHero.setFrame(f); else if (bxHero.setYear) bxHero.setYear(f);
    const u = NX > 1 ? clamp(f / (NX - 1), 0, 1) : 1;
    if (fill) fill.style.transform = `scaleX(${u.toFixed(4)})`;
    const near = Math.round(f);
    if (near !== lastK) {
      lastK = near;
      marks.forEach((m, i) => m.classList.toggle('on', i === near));
      yrs.forEach((y, i) => y.classList.toggle('on', i === near));
      if (scrub) scrub.setAttribute('aria-valuetext', formatYear(EXAM_DATES[clamp(near, 0, NX - 1)]));
    }
  };
  const setFrom = f => { if (scrub) scrub.value = String(f); paint(f); };
  if (scrub) {
    scrub.addEventListener('input', () => { paint(parseFloat(scrub.value)); });
    scrub.addEventListener('pointerdown', () => { held = true; });
    scrub.addEventListener('focus', () => { held = true; });
    scrub.addEventListener('blur', () => { held = false; });
    /* A fine step makes the drag smooth and the keyboard useless - at 0.01 an
       arrow key is a hundredth of a year. Arrows move a whole assessment. */
    scrub.addEventListener('keydown', e => {
      const cur = parseFloat(scrub.value);
      let to = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown') to = Math.ceil(cur - 1);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') to = Math.floor(cur + 1);
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = NX - 1;
      if (to === null) return;
      e.preventDefault();
      setFrom(clamp(to, 0, NX - 1));
    });
    /* Let go between two assessments and the chart is showing a moment that
       never happened. Settle onto the nearer one. */
    const settle = () => {
      if (!held) return;
      held = false;
      const cur = parseFloat(scrub.value), to = clamp(Math.round(cur), 0, NX - 1);
      if (Math.abs(cur - to) < 0.004) { setFrom(to); return; }
      const t0 = cur, d = to - t0;
      let k = 0;
      const step = () => {
        k += 0.14;
        const e2 = k >= 1 ? 1 : 1 - Math.pow(1 - k, 3);
        setFrom(t0 + d * e2);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    addEventListener('pointerup', settle, { passive: true });
    addEventListener('pointercancel', settle, { passive: true });
  }

  let r2 = 0;
  const onScroll = () => {
    r2 = 0;
    const t = scanTrack.getBoundingClientRect(), Z = zoomK();
    const span = t.height - scanFrame.offsetHeight * Z;
    const p = span > 8 ? clamp(-t.top / span, 0, 1) : (t.top < 0 ? 1 : 0);
    // the first three fifths turn the year; the rest hands off to the copy
    const yr = clamp(p / 0.6, 0, 1);
    if (!held) setFrom(NX > 1 ? (NX - 2) + yr : 0);
    const b = clamp((p - 0.66) / 0.2, 0, 1);
    scanCopy.style.setProperty('--b', (b * b * (3 - 2 * b)).toFixed(3));
    scanCopy.dataset.state = b > 0.5 ? 'B' : 'A';
    const on = t.bottom > 8 && t.top < innerHeight - 8;
    // the target hero is cream, so the browser chrome never darkens for it
    if (on !== scanOn) { scanOn = on; docEl.classList.toggle('on-scan', on); }
  };
  addEventListener('scroll', () => { if (!r2) r2 = requestAnimationFrame(onScroll); }, { passive: true });
  addEventListener('resize', () => { if (!r2) r2 = requestAnimationFrame(onScroll); });
  addEventListener('beforeprint', () => { setFrom(NX - 1); });
  addEventListener('afterprint', onScroll);
  if (matchMedia) { const mq = matchMedia('print');
    if (mq.addEventListener) mq.addEventListener('change', e => { if (e.matches) setFrom(NX - 1); else onScroll(); }); }
  onScroll();
}
function mountRingsHero() {
  const wrap = $('.rg-wrap'); if (!wrap) return;
  const bg = $('.rg-bg');
  if (bg && IMG.canopy) { bg.style.backgroundImage = `url(${IMG.canopy})`; requestAnimationFrame(() => bg.classList.add('on')); }
  const wood = $('.rg-wood');
  if (wood && typeof WOOD_URI === 'string' && WOOD_URI) {
    wood.style.backgroundImage = `url(${WOOD_URI})`;
    docEl.classList.add('has-wood');
  }
  if (wood && !docEl.classList.contains('has-wood')) {
    const cv = document.createElement('canvas');
    paintWood(cv, (wood.offsetWidth || 720) * Math.min(2, devicePixelRatio || 1));
    wood.style.backgroundImage = `url(${cv.toDataURL('image/jpeg', 0.86)})`;
    wood.classList.add('drawn');
  }
  const tilt = $('.rg-tilt'), rings = $$('.rg-yg'), dots = $$('.rg-d'), yrs = $$('.rg-yr span');
  const N = rings.length;
  let cur = -1, rr = 0;
  function apply(p) {
    rr = 0;
    // the years divide the first 80% of the track; the last fifth holds today
    const k = Math.min(N - 1, Math.floor(clamp(p, 0, 0.999) / 0.8 * N));
    // the disc grows outward with the journey, so the tree is still adding wood
    const disc = $('.rg-disc');
    if (disc) disc.style.setProperty('--grow', (58 + 44 * clamp(p, 0, 1)).toFixed(1) + '%');
    if (k !== cur) {
      cur = k;
      rings.forEach((c, i) => c.classList.toggle('on', i === k));
      yrs.forEach((y, i) => y.classList.toggle('on', i === k));
      dots.forEach(d => d.classList.toggle('show', +d.dataset.ringY === k));
    }
    // the slice tips as you travel, and its cut edge opens up with it
    if (tilt && MOTION) {
      const rx = 7 - p * 5;
      tilt.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      tilt.style.setProperty('--rz', (-2 + p * 3).toFixed(2) + 'deg');
      tilt.style.setProperty('--rs', (1 + p * 0.06).toFixed(3));
      tilt.style.setProperty('--edge', (10 + rx * 1.7).toFixed(1) + 'px');
    }
  }
  function onScroll() {
    const t = scanTrack.getBoundingClientRect(), Z = zoomK();
    const span = t.height - scanFrame.offsetHeight * Z;
    const p = span > 8 ? clamp(-t.top / span, 0, 1) : (t.top < 0 ? 1 : 0);
    apply(p);
    const b = clamp((p - 0.82) / 0.14, 0, 1);
    scanCopy.style.setProperty('--b', (b * b * (3 - 2 * b)).toFixed(3));
    scanCopy.dataset.state = b > 0.5 ? 'B' : 'A';
    const on = t.bottom > 8 && t.top < innerHeight - 8;
    if (on !== scanOn) { scanOn = on; docEl.classList.toggle('on-scan', on); themeColor(on ? '#0F1C0D' : '#FFFCF7'); }
  }
  addEventListener('scroll', () => { if (!rr) rr = requestAnimationFrame(onScroll); }, { passive: true });
  addEventListener('resize', () => { if (!rr) rr = requestAnimationFrame(onScroll); });
  apply(0); onScroll();
}

function mountScanHero() {
  scan = mountScan(scanStage, {
    systems: SCAN_SYSTEMS, markers: SCAN_MARKERS, priorities: SCAN_PRIOS, sex: V.patient.sex,
    lockId: P1_SYS, lockLabel: P1_MV ? `Furthest from target · ${P1_MV.marker.name}` : '',
    mode: 'page', quality: scanQuality(), frame: scanFrameSpec, hud: SCAN_HUD, tags: 'split',
    vessels: HERO_BAY, cards: HERO_BAY, look: HERO_LINE ? 'line' : null,
    reducedMotion: !MOTION, threeReady: loadThree(), forceFallback: !GL_OK,
    print: () => $$('.sc-cA > *', scanCopy),
    onSelect: id => { focusSystem(id, 'scan'); openDrawer({ context: 'system', id }); },
    onAll: () => (MQ.phone.matches ? openDrawer({ context: 'list' }) : scan.setPlate(!scan.state.plate)),
  });
  if (room.classList.contains('on')) scan.setPaused(true);
  scanScroll();
  /* Skip the build when the patient did not land at the top: a restored scroll,
     a deep link, or the hero already behind them. */
  const fresh = scrollY < 4 && !location.hash;
  if (fresh) scan.enter().then(presentHint); else { scan.enter({ skip: true }); presentHint(); }
}

/* p is solved from rects (viewport px) against the frame's own height (local
   px), so it stays correct under the TV zoom. */
let scanRaf = 0, scanOn = false;
function scanScroll() {
  scanRaf = 0;
  if (HERO_RINGS || HERO_TARGET) return;
  if (HERO_SAMPLE) { const r0 = scanTrack.getBoundingClientRect();
    const on0 = r0.bottom > 8 && r0.top < innerHeight - 8;
    if (on0 !== scanOn) { scanOn = on0; docEl.classList.toggle('on-scan', on0); themeColor(on0 ? '#0F1C0D' : '#FFFCF7'); }
    return; }
  const r = scanTrack.getBoundingClientRect(), Z = zoomK();
  const span = r.height - scanFrame.offsetHeight * Z;
  const p = span > 8 ? clamp(-r.top / span, 0, 1) : (r.top < 0 ? 1 : 0);
  if (scan) scan.setProgress(p);
  const t = clamp((p - 0.35) / 0.25, 0, 1);
  scanCopy.style.setProperty('--b', (t * t * (3 - 2 * t)).toFixed(3));
  scanCopy.dataset.state = t > 0.5 ? 'B' : 'A';
  const on = r.bottom > 8 && r.top < innerHeight - 8;
  if (on !== scanOn) { scanOn = on; docEl.classList.toggle('on-scan', on); themeColor(on ? '#0F1C0D' : '#FFFCF7'); }
}
function themeColor(c) { let m = document.querySelector('meta[name=theme-color]'); if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); } m.content = c; }
addEventListener('scroll', () => { if (!scanRaf) scanRaf = requestAnimationFrame(scanScroll); }, { passive: true });
addEventListener('resize', () => { if (!scanRaf) scanRaf = requestAnimationFrame(scanScroll); });

/* ==========================================================================
   #19 · Present stops on the page. The NP drives the results on the TV with a
   clicker, so Space / PageDown walk a list of whole frames instead of
   scrolling by a screenful. Wheel and touch are never intercepted.
   ========================================================================== */
const PRESENT = (() => {
  const q = new URLSearchParams(location.search).get('present');
  if (q === '1') return true;
  if (q === '0') return false;
  return null; // follow html.tv
})();
const presentOn = () => (PRESENT === null ? docEl.classList.contains('tv') : PRESENT);
/* Each stop is a y in page px, solved when asked so it survives a resize. */
function presentStops() {
  const tr = scanTrack.getBoundingClientRect(), top = tr.top + scrollY;
  const span = tr.height - scanFrame.offsetHeight * zoomK();
  const stops = [{ y: top, name: 'hero-a' }, { y: top + span * 0.9, name: 'hero-b' }];
  const at = (sel, name) => { const el = $(sel); if (el) stops.push({ y: el.getBoundingClientRect().top + scrollY - 8, name }); };
  at('#attention', 'attention'); at('#plan', 'plan'); at('#note', 'note');
  at('#target', 'target'); at('#progress', 'progress');
  const vs = $('.vs-pin');
  if (vs) { const b = vs.getBoundingClientRect(), y0 = b.top + scrollY, h = b.height - innerHeight;
    [0.12, 0.5, 0.88].forEach((k, i) => stops.push({ y: y0 + Math.max(0, h) * k, name: 'samples-' + (i + 1) })); }
  at('#results', 'results'); at('.s-close', 'close');
  return stops.filter(s => s.y >= -2).sort((a, b) => a.y - b.y);
}
let tweenRaf = 0;
function tweenTo(y, ms) {
  cancelAnimationFrame(tweenRaf);
  const y0 = scrollY, dy = y - y0, t0 = performance.now();
  const jump0 = t => scrollTo({ top: t, behavior: 'instant' });
  if (!MOTION) { jump0(y); arrived(); return; }
  const step = t => {
    const k = Math.min(1, (t - t0) / ms), e = 0.5 - 0.5 * Math.cos(Math.PI * k); // --ease-io
    jump0(y0 + dy * e);
    if (k < 1) tweenRaf = requestAnimationFrame(step); else { jump0(y); setTimeout(arrived, 80); }
  };
  tweenRaf = requestAnimationFrame(step);
}
function arrived() { document.dispatchEvent(new CustomEvent('section:arrive')); flushArrivals(); }
function presentGo(dir) {
  const stops = presentStops(), y = scrollY, eps = 12;
  const i = dir > 0 ? stops.findIndex(s => s.y > y + eps) : (() => { for (let k = stops.length - 1; k >= 0; k--) if (stops[k].y < y - eps) return k; return -1; })();
  if (i < 0) return false;
  const from = stops.findIndex(s => Math.abs(s.y - y) <= eps);
  const heroMove = (from === 0 && i === 1) || (from === 1 && i === 0);
  tweenTo(stops[i].y, heroMove ? 1400 * (docEl.classList.contains('tv') ? 1.25 : 1) : 900);
  return true;
}
/* The hint appears once per session, the first time TV mode comes up. */
function presentHint() {
  if (!presentOn() || !MOTION) return;
  try { if (sessionStorage.getItem('ale-present-hint')) return; sessionStorage.setItem('ale-present-hint', '1'); } catch (e) { /* private mode */ }
  const el = document.createElement('p');
  el.className = 'sc-h sc-phint'; el.textContent = 'Space · next'; el.setAttribute('aria-hidden', 'true');
  scanStage.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); }, 3000);
}
addEventListener('keydown', e => {
  if (!presentOn() || room.classList.contains('on') || drawer.classList.contains('on')) return;
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  const onBody = e.target === document.body || e.target === docEl || !!e.target.closest('main, .s-scan');
  const fwd = e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey) || (e.key === 'ArrowRight' && onBody);
  const back = e.key === 'PageUp' || (e.key === ' ' && e.shiftKey) || (e.key === 'ArrowLeft' && onBody);
  if (e.key === 'Home') { e.preventDefault(); tweenTo(0, 900); if (scan) setTimeout(() => scan.replay(), 950); return; }
  if (fwd && presentGo(1)) e.preventDefault();
  else if (back && presentGo(-1)) e.preventDefault();
});

/* S shows every system at once on a pointer device; Esc puts it away. */
addEventListener('keydown', e => {
  if (room.classList.contains('on') || !scan || MQ.phone.matches) return;
  if (e.target.closest('input, textarea, select')) return;
  if (e.key === 's' || e.key === 'S') { scan.setPlate(!scan.state.plate); }
  else if (e.key === 'Escape' && scan.state.plate) { scan.setPlate(false); }
});
const mountHero = () => (HERO_TARGET ? mountTargetHero() : HERO_RINGS ? mountRingsHero() : HERO_SAMPLE ? mountSampleHero() : mountScanHero());
near(scanSec, () => ('requestIdleCallback' in window && !EAGER ? requestIdleCallback(mountHero, { timeout: 400 }) : mountHero()), '200% 0px');

/* ---------- page events for all three ---------- */
document.addEventListener('click', e => {
  if (e.target.closest('#room')) return;
  const go = e.target.closest('[data-bm-go]'); if (go) { closeDrawer(); showInResults(go.dataset.bmGo); return; }
  if (e.target.closest('[data-sys-list]')) { openDrawer({ context: 'list' }); return; }
  if (e.target.closest('[data-close-drawer]')) { closeDrawer(); return; }
  const bm = e.target.closest('[data-bm]'); if (bm) { focusSystem(focusSys === bm.dataset.bm ? null : bm.dataset.bm, 'list'); return; }
  if (e.target.closest('[data-bm-clear]')) { focusSystem(null, 'list'); return; }
  const see = e.target.closest('[data-tg-see]'); if (see) { applyFilter(see.dataset.tgSee); requestAnimationFrame(landOnRows); return; }
  if (e.target.closest('[data-tg-clear]')) { if (pinnedState) { pinnedState = null; syncLegend(); applyChart(); } else focusSystem(null, 'target'); }
});

/* One scan for the whole deck: the welcome slide frames it to the right of
   the copy and runs the laser build; the body slide plates every tag and
   locks onto the heart. Disposed when the deck closes. */
function deckScan(sl) {
  const welcome = sl.classList.contains('welcome');
  room.classList.add('scan-on');
  room.classList.toggle('scan-live', !welcome);
  const frame = (W, H) => welcome
    ? { composition: 'side', crown: 0.10, sole: 0.94, figX: 0.75, plateX: 0.75, bx: 0.72, spanB: 0.42, safeL: W * 0.54, safeR: 40, hudBottom: 40, copyTop: H * 0.5, restYaw: 16, lockYaw: 30 }
    : { composition: 'side', crown: 0.07, sole: 0.92, figX: 0.62, plateX: 0.54, bx: 0.52, spanB: 0.30, safeL: 40, safeR: 40, hudBottom: 44, copyTop: H * 0.5, restYaw: 18, lockYaw: 30 };
  if (!rScan) {
    rScan = mountScan($('#rScan'), {
      systems: SCAN_SYSTEMS, priorities: SCAN_PRIOS, sex: V.patient.sex, lockId: P1_SYS, lockLabel: P1_MV ? `Furthest from target · ${P1_MV.marker.name}` : '',
      mode: 'deck', quality: 'tv', tags: welcome ? 'none' : 'plate', tagScale: 1.25, artScale: () => roomScale(),
      frame: (W, H) => deckFrame(W, H), hud: { honesty: SCAN_HUD.honesty },
      reducedMotion: !MOTION, threeReady: loadThree(), forceFallback: !GL_OK, timeScale: 1.25,
      print: () => (deckWelcome ? $$('.welcome .stage > *') : []),
      onSelect: id => { stopTour(); syncDeckRows(id); },
    });
  }
  deckWelcome = welcome; deckFrame = frame;
  rScan.setPaused(false);
  rScan.setTags(welcome ? 'none' : 'plate');
  rScan.setPlate(!welcome);
  rScan.refit();
  rScan.setProgress(0);
  if (welcome) { rScan.replay(); }
  else { rScan.replay(); deckSelect(null); startTour(); }
}
let deckWelcome = false;
let deckFrame = (W, H) => ({ composition: 'side' });

/* ==========================================================================
   Exam-room deck: the dark target on the big picture, the lume body map.
   Created on first view of their slide, disposed when the deck closes; the
   page's figure pauses while the deck is up.
   ========================================================================== */
let rBx = null, rScan = null, rTrails = true, rSel = null, tourT = null, tourI = -1, bodyWasPaused = false;
const TOUR = attnSystems.map(s => s.system);
function syncDeckRows(id) { rSel = id || null; $$('.r-att-row', room).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.deckSys === rSel))); }
function deckSelect(id) { syncDeckRows(id); if (rScan) rScan.select(rSel); }
function stopTour() { clearTimeout(tourT); tourT = null; }
function stepTour() {
  tourI++;
  if (tourI >= TOUR.length) { deckSelect(null); tourT = null; return; }
  deckSelect(TOUR[tourI]); tourT = setTimeout(stepTour, 5000);
}
function startTour() { stopTour(); if (!MOTION || !TOUR.length) return; tourI = -1; tourT = setTimeout(stepTour, auto ? 1500 : 4000); }
ROOM_HOOKS.open.push(() => { if (scan) { bodyWasPaused = !!scan.state.paused; scan.setPaused(true); } });
ROOM_HOOKS.close.push(() => {
  stopTour(); syncDeckRows(null);
  if (rBx) { rBx.destroy(); rBx = null; }
  if (rScan) { rScan.destroy(); rScan = null; }
  if (scan && !bodyWasPaused) scan.setPaused(false);
});
ROOM_HOOKS.enter.push(sl => {
  if (sl.classList.contains('r-big')) {
    if (!rBx) {
      rBx = renderBullseye($('#rBx'), { markers: BX_MARKERS, systems: BX_SYS, theme: 'dark', reducedMotion: !MOTION, entrance: 'trend', autoplay: false, dock: 'never',
        ariaLabel: `All ${S.total} markers on the longevity target, with last year's positions as trails`, onOpen: () => {} });
      rBx.setCompare(rTrails);
    }
    rBx.play();
  }
  if (sl.classList.contains('r-scanned')) deckScan(sl);
});
ROOM_HOOKS.leave.push(sl => {
  if (sl.classList.contains('r-scanned')) {
    stopTour();
    room.classList.remove('scan-on', 'scan-live');
    if (rScan) { rScan.setProgress(0); rScan.setPaused(true); }
  }
});
/* The deck's builds. The body slide's build 1 is the same lock the page hero
   reaches by scrolling, so the deck and the page tell one story. */
ROOM_HOOKS.build.push((sl, n) => {
  if (sl.classList.contains('r-body') && rScan) { rScan.setProgress(n >= 1 ? 1 : 0); if (n >= 1) stopTour(); else startTour(); }
  if (sl.classList.contains('r-big') && rBx) {
    if (n === 0) { rBx.setCompare(false); rBx.reset && rBx.reset(); }
    else if (n === 1) { rBx.setCompare(true); }
    else { rTrails = true; rBx.setCompare(true); rBx.play(); }
  }
});
ROOM_HOOKS.key.push((e, sl) => {
  if (sl.classList.contains('r-big') && e.key.toLowerCase() === 't' && rBx) { rTrails = !rTrails; rBx.setCompare(rTrails); return true; }
  if (sl.classList.contains('r-body') && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault(); stopTour();
    const ids = [null, ...SYSTEMS.map(s => s.system)], i = ids.indexOf(rSel), n = ids.length;
    deckSelect(ids[(i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n]); return true;
  }
  return false;
});
room.addEventListener('click', e => { const b = e.target.closest('[data-deck-sys]'); if (!b) return; stopTour(); deckSelect(rSel === b.dataset.deckSys ? null : b.dataset.deckSys); });

if (location.hash === '#room') openRoom();

/* Last: if the URL names a marker, open it. After everything else has mounted,
   so the sheet lands on a page that is already built. */
openFromHash();
