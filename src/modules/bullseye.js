/* ==========================================================================
   bullseye.js: Signature 3, "Your longevity target" (pure SVG + CSS).

   One honest picture of every marker. Rings from the centre outward ARE the
   four states (optimal, in range, borderline, out of range); each body system
   owns a sector, clockwise from 12 o'clock after the ring key; a dot's depth
   inside its ring says how close the value sits to the better side. Nothing
   is scored: position, colour and words all come from the page's own states.

   renderBullseye(el, opts) -> { destroy(), highlight(systemId|null),
     highlightState(state|null), setCompare(bool), select(markerId|null), play() }

   opts = {
     markers: [{ id, name, system, systemLabel, state, closeness (0..1, 1 = best spot in its ring),
                 valueText, unit,
                 // optional extras, all presentational:
                 hollow (no clinic target: the lab range is the goal), once (measured once),
                 priority (1..3), note (e.g. "Target below 0.80"),
                 prev ({ state, closeness } at the last exam, for compare trails and the 'trend' entrance) }],
     systems: [{ id, label, short? }],       (sector order)
     reducedMotion, onOpen(markerId), onSystem?(systemId),
     theme?: 'light' | 'dark',               (dark = exam-room forest-night surface)
     entrance?: 'edge' | 'trend',            (edge, the default: fly in along the spoke)
     dock?: 'auto' | 'always' | 'never',     (touch/phone readout under the chart)
     centerLabel?: 'at target', ariaLabel?, autoplay? (default true: plays at 35% visible)
   }

   Concatenated inside the page IIFE by build.py: only renderBullseye and
   bullseyeCloseness are declared at top level; everything else is local.
   ========================================================================== */

/** Closeness 0..1 for a quantity marker (1 = the best spot inside its state's
 *  ring). Presentational geometry only, computed from the bands already shown:
 *  best available band -> distance from its nearest real edge (domain ends are
 *  not edges); any other band -> distance from the edge it shares with a better
 *  state. Ordinal (dipstick) results sit mid-ring. */
function bullseyeCloseness(bands, value, ordinal) {
  if (ordinal || value == null || !bands || !bands.segments || !bands.domain) return 0.5;
  const RANK = { optimal: 3, in_range: 2, borderline: 1, out_of_range: 0 };
  const cl = x => Math.max(0, Math.min(1, x));
  const [a, b] = bands.domain; let lo = a;
  const list = bands.segments.map(s => {
    const hi = s.upTo === null ? b : Math.min(Math.max(s.upTo, a), b);
    const x = { lo, hi, state: s.state }; lo = hi; return x;
  }).filter(x => x.hi > x.lo);
  if (!list.length) return 0.5;
  let i = list.findIndex(x => value < x.hi); if (i < 0) i = list.length - 1;
  const band = list[i], w = band.hi - band.lo;
  const best = Math.max(...list.map(x => RANK[x.state]));
  if (RANK[band.state] === best) {
    const loReal = i > 0, hiReal = i < list.length - 1;
    if (loReal && hiReal) return cl(Math.min(value - band.lo, band.hi - value) / (w / 2));
    if (loReal) return cl((value - band.lo) / w);
    if (hiReal) return cl((band.hi - value) / w);
    return 0.5;
  }
  const L = list[i - 1], Rt = list[i + 1];
  const bl = !!L && RANK[L.state] > RANK[band.state], br = !!Rt && RANK[Rt.state] > RANK[band.state];
  // open-ended toward the domain edge: the depth would measure an arbitrary visual end, so it sits mid-ring
  if ((bl && !br && i === list.length - 1) || (br && !bl && i === 0)) return 0.5;
  const t = bl && br ? Math.min(value - band.lo, band.hi - value) / w : bl ? (value - band.lo) / w : br ? (band.hi - value) / w : 0.5;
  return cl(1 - t);
}

function renderBullseye(el, opts) {
  opts = opts || {};
  const NS = 'http://www.w3.org/2000/svg';
  const ORDER = ['optimal', 'in_range', 'borderline', 'out_of_range'];
  const WORD = { optimal: 'Optimal', in_range: 'In range', borderline: 'Borderline', out_of_range: 'Out of range' };
  const SHORT = { heart: 'Heart', metabolic: 'Metabolic', hormones: 'Hormones', thyroid: 'Thyroid', liver: 'Liver', kidney: 'Kidney',
    inflammation: 'Inflammation', nutrients: 'Vitamins', blood: 'Blood', electrolytes: 'Electrolytes', urine: 'Urine' };
  const attn = s => s === 'borderline' || s === 'out_of_range';
  const dark = opts.theme === 'dark';
  const RM = !!opts.reducedMotion;
  const uid = 'bx' + (renderBullseye.seq = (renderBullseye.seq || 0) + 1);
  const EASE = 'cubic-bezier(.16,1,.3,1)', EASE_IO = 'cubic-bezier(.65,0,.35,1)';
  const canAnim = !RM && typeof el.animate === 'function';
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const f1 = x => Math.round(x * 100) / 100;

  /* ---------- palette (Optimal DS; status colours never alone: ring position + words) ---------- */
  const PAL = dark ? {
    bg: '#1C3118', plate: 'rgba(255,252,247,.025)', cut: '#1C3118', stroke: '#1C3118', strokeW: 2.5,
    dot: { optimal: '#A4C29D', in_range: '#8F887C', borderline: '#E0A340', out_of_range: '#E58A7A' },
    fg: { optimal: '#A4C29D', in_range: '#C4BCAE', borderline: '#E0A340', out_of_range: '#E58A7A' },
    band: { optimal: 'rgba(164,194,157,.12)', in_range: 'rgba(196,188,174,.05)', borderline: 'rgba(224,163,64,.05)' },
    outTint: 'rgba(229,138,122,.07)',
    glow: ['rgba(164,194,157,.30)', 'rgba(164,194,157,.12)'],
    line: { core: 'rgba(164,194,157,.45)', opt: 'rgba(164,194,157,.34)', hair: 'rgba(255,252,247,.13)', out: 'rgba(229,138,122,.32)' },
    label: 'rgba(255,252,247,.72)', labelOn: '#FFFCF7', arc: 'rgba(255,252,247,.22)',
    count: '#FFFCF7', countSub: 'rgba(164,194,157,.95)', coreRing: 'rgba(164,194,157,.16)',
    trail: 'rgba(255,252,247,.55)', spoke: 'rgba(164,194,157,.55)', spokeFaint: 'rgba(255,252,247,.045)', focus: '#FFFCF7', sel: '#FFFCF7', seam: 'rgba(255,252,247,.12)', hollow: '#8F887C',
    veil: 'rgba(28,49,24,.7)', outline: 'rgba(164,194,157,.55)', hollowFill: '#1C3118', num: '#FFFCF7',
    shade: '#000000', shadeA: .42, plateLift: '0 3px 16px rgba(0,0,0,.30)', coreLift: '0 2px 7px rgba(0,0,0,.26)',
  } : {
    bg: '#FFFCF7', plate: '#FFFFFF', cut: '#FFFFFF', stroke: '#FFFFFF', strokeW: 1.75,
    dot: { optimal: '#2C4E25', in_range: '#A9A49B', borderline: '#C97B2D', out_of_range: '#B3402F' },
    fg: { optimal: '#1A500F', in_range: '#76736D', borderline: '#9A5A1C', out_of_range: '#B3402F' },
    band: { optimal: 'rgba(135,164,130,.17)', in_range: 'rgba(150,136,112,.07)', borderline: 'rgba(201,123,45,.085)' },
    outTint: 'rgba(179,64,47,.06)',
    glow: ['rgba(135,164,130,.42)', 'rgba(135,164,130,.20)'],
    line: { core: 'rgba(44,78,37,.16)', opt: 'rgba(44,78,37,.36)', hair: 'rgba(118,115,109,.2)', out: 'rgba(179,64,47,.2)' },
    label: '#474747', labelOn: '#252525', arc: 'rgba(118,115,109,.42)',
    count: '#1A500F', countSub: '#2C4E25', coreRing: 'rgba(44,78,37,.14)',
    trail: 'rgba(118,115,109,.62)', spoke: 'rgba(44,78,37,.42)', spokeFaint: 'rgba(118,115,109,.06)', focus: '#519044', sel: '#252525', seam: '#DDDCDB', hollow: '#8A857D',
    veil: 'rgba(255,255,255,.72)', outline: 'rgba(44,78,37,.3)', hollowFill: '#FFFFFF', num: '#252525',
    shade: '#2C4E25', shadeA: .20, plateLift: '0 3px 18px rgba(44,78,37,.10)', coreLift: '0 2px 7px rgba(44,78,37,.09)',
  };

  /* ---------- one stylesheet per document ---------- */
  if (!document.getElementById('bx-css')) {
    const st = document.createElement('style'); st.id = 'bx-css';
    st.textContent = `
.bx{position:relative;width:100%;font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#252525;letter-spacing:0;-webkit-tap-highlight-color:transparent;font-feature-settings:"cv05" 1,"cv08" 1,"ss01" 1}
.bx-svg{display:block;width:100%;height:auto;overflow:visible;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.bx-svg:focus{outline:none}
.bx-svg text{font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
.bx-svg .bx-serif{font-family:"Castoro","Iowan Old Style","Palatino Linotype",Georgia,serif}
.bx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;margin:0}
.bx-plate{filter:var(--bx-plate-lift,none)}
.bx-core{filter:var(--bx-core-lift,none)}
/* parallax rides the translate property, not transform, so it composes
   with the entrance animations instead of fighting them */
.bx-rings,.bx-bounds,.bx-keys{translate:calc(var(--bx-px,0) * 2.5px) calc(var(--bx-py,0) * 2.5px)}
.bx-cmp{translate:calc(var(--bx-px,0) * 4px) calc(var(--bx-py,0) * 4px)}
.bx-dots{translate:calc(var(--bx-px,0) * 7px) calc(var(--bx-py,0) * 7px)}
.bx-labs{translate:calc(var(--bx-px,0) * -2px) calc(var(--bx-py,0) * -2px)}
.bx-rings,.bx-bounds,.bx-keys,.bx-cmp,.bx-dots,.bx-labs{transition:translate .5s cubic-bezier(.2,.7,.2,1)}
.bx-par .bx-rings,.bx-par .bx-bounds,.bx-par .bx-keys,.bx-par .bx-cmp,.bx-par .bx-dots,.bx-par .bx-labs{transition:none}
.bx-rm .bx-rings,.bx-rm .bx-bounds,.bx-rm .bx-keys,.bx-rm .bx-cmp,.bx-rm .bx-dots,.bx-rm .bx-labs{translate:none}
.bx-dot{cursor:pointer;outline:none;transition:opacity .28s cubic-bezier(.2,.7,.2,1)}
.bx-dot .fr,.bx-dot .sel{opacity:0;transition:opacity .16s}
.bx-dot:focus-visible .fr{opacity:1}
.bx-dot.hot .sel{opacity:1}
.bx-pre .bx-dot,.bx-pre .bx-labs,.bx-pre .bx-keys,.bx-pre .bx-rings,.bx-pre .bx-count{opacity:0}
.bx-lab,.bx-keys text{transition:opacity .28s cubic-bezier(.2,.7,.2,1)}
.bx-veil,.bx-bveil,.bx-outline{opacity:0;transition:opacity .32s cubic-bezier(.2,.7,.2,1);pointer-events:none}
.bx-hl .bx-veil:not(.on),.bx-hs .bx-bveil:not(.on),.bx-outline.on{opacity:1}
.bx-hl .bx-dot:not(.on),.bx-hs .bx-dot:not(.on){opacity:.16}
.bx-hl .bx-lab:not(.on),.bx-hs .bx-keys text:not(.on){opacity:.3}
.bx-pulse{transform-box:fill-box;transform-origin:center;opacity:0;pointer-events:none}
.bx-pulse.go{animation:bx-pulse 2.4s cubic-bezier(.16,1,.3,1) 2}
@keyframes bx-pulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(2.6);opacity:0}}
.bx-spoke{opacity:0;transition:opacity .2s;pointer-events:none}
.bx-spoke.on{opacity:1}
.bx-cmp{opacity:0;transition:opacity .5s cubic-bezier(.2,.7,.2,1);pointer-events:none}
.bx-cmp.on{opacity:1}
.bx-tip{position:absolute;left:0;top:0;z-index:5;width:max-content;min-width:184px;max-width:252px;padding:12px 14px 11px;border-radius:8px;background:#fff;border:1px solid #DDDCDB;
  box-shadow:0 1px 1px rgba(28,49,24,.04),0 14px 34px -16px rgba(28,49,24,.30);pointer-events:none;opacity:0;visibility:hidden;
  transform:translate3d(var(--x,0),calc(var(--y,0px) + 4px),0);transition:opacity .28s cubic-bezier(.2,.7,.2,1),transform .28s cubic-bezier(.2,.7,.2,1),visibility 0s .28s}
.bx-tip.on{opacity:1;visibility:visible;transform:translate3d(var(--x,0),var(--y,0),0);transition-delay:0s}
.bx-t-sys{margin:0 0 4px;font-size:10.5px;line-height:1.3;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#76736D}
.bx-t-name{margin:0;font:400 19px/1.15 "Castoro","Iowan Old Style",Georgia,serif;letter-spacing:-.01em;color:#252525}
.bx-t-row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:9px}
.bx-t-val{font-size:15px;font-weight:500;line-height:1.2;font-variant-numeric:tabular-nums;color:#252525;white-space:nowrap}
.bx-t-val small{font-size:12.5px;font-weight:400;color:#76736D;margin-left:4px}
.bx-tag{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;line-height:1;white-space:nowrap}
.bx-tag i{width:7px;height:7px;border-radius:50%;flex:none}
.bx-tag.chip{height:22px;padding:0 8px;border-radius:4px}
.bx-tag.chip i{width:6px;height:6px}
.bx-tag.s-optimal{color:#1A500F}.bx-tag.s-optimal i{background:#2C4E25}
.bx-tag.s-in_range{color:#474747}.bx-tag.s-in_range i{background:#76736D}
.bx-tag.s-borderline{background:#F7EBDD;color:#9A5A1C}.bx-tag.s-borderline i{background:#C97B2D}
.bx-tag.s-out_of_range{background:#F7E5E1;color:#B3402F}.bx-tag.s-out_of_range i{background:#B3402F}
.bx-t-note{margin:8px 0 0;font-size:12.5px;line-height:1.4;color:#76736D}
.bx-t-go{margin:10px 0 0;padding-top:9px;border-top:1px solid #EEECE7;font-size:12px;font-weight:500;line-height:1.2;color:#2C4E25;display:flex;align-items:center;gap:6px}
.bx-t-go svg{width:13px;height:13px}
.bx-dock{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:12px;margin-top:14px;height:112px;padding:0 10px;border-radius:8px;background:#fff;border:1px solid #DDDCDB}
.bx-dock[hidden]{display:none}
.bx-step{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;border:1px solid #DDDCDB;background:#FFFCF7;color:#252525;cursor:pointer;padding:0;transition:background .16s,border-color .16s}
.bx-step:hover{border-color:#B9B6B0}
.bx-step svg{width:16px;height:16px}
.bx-step:focus-visible,.bx-open:focus-visible{outline:2px solid #519044;outline-offset:3px}
.bx-read{min-width:0}
.bx-read .bx-t-sys{margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bx-read .bx-t-sys span{color:#A9A49B;font-weight:500;letter-spacing:.04em}
.bx-d-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.bx-d-row .bx-t-name{min-width:0;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bx-d-foot{align-items:center;margin-top:7px}
.bx-hint{margin:0;font-size:13px;line-height:1.45;color:#76736D;text-align:center}
.bx-hint b{display:block;font:400 19px/1.2 "Castoro","Iowan Old Style",Georgia,serif;color:#252525;margin-bottom:2px}
.bx-open{display:inline-flex;align-items:center;gap:5px;height:32px;margin:-6px -4px -6px 0;padding:0 4px;border:0;background:none;color:#2C4E25;font:500 13px/1 "Inter",sans-serif;cursor:pointer;white-space:nowrap;border-radius:4px}
.bx-open{position:relative}.bx-open::after{content:"";position:absolute;inset:-6px -6px}
.bx-open svg{width:13px;height:13px;transition:transform .16s}
.bx-open:hover svg{transform:translateX(2px)}
.bx-dark{color:#FFFCF7}
.bx-dark .bx-tip,.bx-dark .bx-dock{background:rgba(28,49,24,.94);border-color:rgba(255,252,247,.18);box-shadow:none;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.bx-dark .bx-t-name,.bx-dark .bx-t-val{color:#FFFCF7}
.bx-dark .bx-t-sys,.bx-dark .bx-t-note,.bx-dark .bx-t-val small,.bx-dark .bx-hint{color:rgba(255,252,247,.66)}
.bx-dark .bx-t-go{color:#A4C29D;border-top-color:rgba(255,252,247,.14)}
.bx-dark .bx-tag.s-optimal{color:#A4C29D}.bx-dark .bx-tag.s-in_range{color:#C4BCAE}
.bx-dark .bx-tag.s-borderline{background:rgba(224,163,64,.16);color:#E0A340}.bx-dark .bx-tag.s-out_of_range{background:rgba(229,138,122,.16);color:#E58A7A}
.bx-dark .bx-step{background:transparent;border-color:rgba(255,252,247,.22);color:#FFFCF7}
.bx-dark .bx-hint b{color:#FFFCF7}.bx-dark .bx-open{color:#A4C29D}
.bx-rm *{transition-duration:0s!important;animation:none!important}
@media (prefers-reduced-motion:reduce){.bx *{animation:none!important}}
`;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- data ---------- */
  const markersIn = (opts.markers || []).filter(m => m && ORDER.includes(m.state));
  const sysIn = (opts.systems || []).slice();
  markersIn.forEach(m => { if (!sysIn.some(s => s.id === m.system)) sysIn.push({ id: m.system, label: m.systemLabel || m.system }); });
  const SYS = sysIn.map(s => ({ id: s.id, label: s.label, short: s.short || SHORT[s.id] || String(s.label).split(/\s+/)[0],
    markers: markersIn.filter(m => m.system === s.id) })).filter(s => s.markers.length);
  SYS.forEach(s => {
    s.need = s.markers.filter(m => attn(m.state)).length;
    s.worst = ORDER.slice().reverse().find(st => s.markers.some(m => m.state === st));
  });
  const DOTS = []; SYS.forEach((s, si) => s.markers.forEach((m, j) => DOTS.push({ m, si, j, i: DOTS.length })));
  const N = DOTS.length;
  const COUNT = { optimal: 0, in_range: 0, borderline: 0, out_of_range: 0 }; DOTS.forEach(d => COUNT[d.m.state]++);
  const breakdown = s => ['out_of_range', 'borderline'].map(st => { const n = s.markers.filter(m => m.state === st).length; return n ? `${n} ${WORD[st].toLowerCase()}` : ''; }).filter(Boolean).join(', ');
  const summary = `${N} markers. ${ORDER.map(s => `${COUNT[s]} ${WORD[s].toLowerCase()}`).join(', ')}.` +
    (SYS.some(s => s.need) ? ' Needing attention: ' + SYS.filter(s => s.need).map(s => `${s.label}, ${breakdown(s)}`).join('; ') + '.' : '');
  const ariaDot = m => `${m.name}, ${m.valueText}${m.unit ? ' ' + m.unit : ''}, ${WORD[m.state].toLowerCase()}, ${m.systemLabel || (SYS.find(s => s.id === m.system) || {}).label || ''}` +
    (m.hollow ? ', no clinic target' : '') + (m.priority ? `, priority ${m.priority}` : '') + (m.once ? ', measured once' : '');

  /* ---------- shell ---------- */
  const prevClass = el.className;
  el.classList.add('bx'); if (dark) el.classList.add('bx-dark'); if (RM) el.classList.add('bx-rm');
  el.style.setProperty('--bx-plate-lift', `drop-shadow(${PAL.plateLift})`);
  el.style.setProperty('--bx-core-lift', `drop-shadow(${PAL.coreLift})`);
  el.innerHTML = `<svg class="bx-svg${canAnim && opts.autoplay !== false ? ' bx-pre' : ''}" xmlns="${NS}" focusable="false" tabindex="-1" role="group" aria-roledescription="target chart" aria-label="${H(opts.ariaLabel || 'Your longevity target: every marker placed in the ring for its state, grouped by body system')}" aria-describedby="${uid}-d"></svg>
<p class="bx-sr" id="${uid}-d">${H(summary)} Use the arrow keys to move between markers and Enter to open one.</p>
<div class="bx-tip" aria-hidden="true"></div>
<div class="bx-dock" hidden><button type="button" class="bx-step" data-d="-1" aria-label="Previous marker"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="bx-read" aria-live="polite"></div><button type="button" class="bx-step" data-d="1" aria-label="Next marker"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>`;
  const svg = el.querySelector('svg'), tip = el.querySelector('.bx-tip'), dock = el.querySelector('.bx-dock'), read = el.querySelector('.bx-read');
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- state ---------- */
  let W = 0, wide = true, dockOn = false, cx = 0, cy = 0, R = 0, rr = [], slot = 0, keyAng = 0, played = !canAnim || opts.autoplay === false;
  let active = -1, hot = -1, sel = -1, hlSys = null, hlState = null, compare = false, anims = [], raf = 0, timers = [], lastPtr = 'mouse', tipVia = 'hover';
  let dotEls = [], pos = [], labelsBuilt = false;
  const coarse = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;

  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const P = (r, a) => [cx + r * Math.sin(rad(a)), cy - r * Math.cos(rad(a))];
  const pxy = (r, a) => { const p = P(r, a); return `${f1(p[0])} ${f1(p[1])}`; };
  const arc = (r, a0, a1, sweep = 1) => `A${f1(r)} ${f1(r)} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${sweep} ${pxy(r, a1)}`;
  const annulus = (r0, r1) => `M${f1(cx - r1)} ${f1(cy)}a${f1(r1)} ${f1(r1)} 0 1 0 ${f1(2 * r1)} 0a${f1(r1)} ${f1(r1)} 0 1 0 ${f1(-2 * r1)} 0Z` +
    (r0 > 0 ? `M${f1(cx - r0)} ${f1(cy)}a${f1(r0)} ${f1(r0)} 0 1 0 ${f1(2 * r0)} 0a${f1(r0)} ${f1(r0)} 0 1 0 ${f1(-2 * r0)} 0Z` : '');
  const wedge = (r0, r1, a0, a1) => `M${pxy(r1, a0)}${arc(r1, a0, a1)}L${pxy(r0, a1)}${arc(r0, a1, a0, 0)}Z`;
  const dotR = (st, hollow) => (hollow ? (wide ? 4.2 : 3.8) : attn(st) ? DR * 1.24 : DR);
  let DR = 6;
  const bandOf = st => ORDER.indexOf(st) + 1; // rr[k]..rr[k+1]
  const radial = (st, c, hollow) => {
    const k = bandOf(st), r0 = rr[k], r1 = rr[k + 1], pad = dotR(st, hollow) + (wide ? 3 : 2.25);
    const lo = r0 + pad, hi = r1 - pad; if (hi <= lo) return (r0 + r1) / 2;
    return lo + (1 - clamp(+c || 0, 0, 1)) * (hi - lo);
  };

  function measurer() {
    const t = document.createElementNS(NS, 'text'); t.setAttribute('x', -9999); t.setAttribute('y', -9999); t.setAttribute('aria-hidden', 'true');
    svg.appendChild(t);
    const fn = (str, fs, weight, track) => {
      t.textContent = str; t.style.fontSize = fs + 'px'; t.style.fontWeight = weight; t.style.letterSpacing = track + 'em';
      let w = 0; try { w = t.getComputedTextLength(); } catch (e) { w = 0; }
      if (!w) w = str.length * fs * (str === str.toUpperCase() ? 0.68 : 0.55) + str.length * fs * track;
      return w;
    };
    fn.done = () => t.remove();
    return fn;
  }

  /* ---------- layout + draw ---------- */
  function build() {
    W = Math.max(260, Math.round(el.clientWidth || 360));
    wide = W >= 460;
    dockOn = opts.dock === 'always' || (opts.dock !== 'never' && (!wide || coarse));
    const S = W; cx = W / 2; cy = S / 2;
    const track = wide ? 52 : 38;
    R = S / 2 - track - 1;
    rr = (wide ? [0, .2, .43, .68, .87, 1] : [0, .23, .45, .68, .87, 1]).map(f => f * R);
    if (rr[1] < 36) rr[1] = 36; // the count needs room on the smallest phones
    DR = clamp(R * 0.026, 4.7, 9);
    svg.setAttribute('viewBox', `0 0 ${W} ${S}`);
    svg.setAttribute('width', W); svg.setAttribute('height', S);
    svg.innerHTML = '';
    const measure = measurer();

    /* ring key on the 12 o'clock axis: the wedge is as wide as the widest label needs */
    const keyFs = wide ? 9 : 10, keyTr = wide ? 0.1 : 0.05, keyCap = keyFs * 0.73;
    const keys = ORDER.map((s, k) => {
      const w = measure(WORD[s].toUpperCase(), keyFs, 600, keyTr), r0 = rr[k + 1], r1 = rr[k + 2];
      const r = (r0 + r1) / 2 - keyCap / 2; // baseline; caps sit centred in the ring
      return { s, w, r, need: deg((w + (wide ? 16 : 12)) / r), show: k > 0 };
    });
    keyAng = clamp(Math.max(...keys.slice(1).map(k => k.need)), 16, wide ? 36 : 44);

    const gapDeg = wide ? 1.5 : 1.8;
    const avail = 360 - keyAng - SYS.length * gapDeg;
    slot = avail / Math.max(1, N);
    let a = keyAng / 2 + gapDeg / 2;
    SYS.forEach(s => { s.a0 = a; s.a1 = a + s.markers.length * slot; s.mid = (s.a0 + s.a1) / 2; s.b0 = s.a0 - gapDeg / 2; s.b1 = s.a1 + gapDeg / 2; a = s.a1 + gapDeg; });

    /* dot positions: angle = slot centre, radius = inside its state's ring */
    pos = DOTS.map(d => {
      const s = SYS[d.si], ang = s.a0 + (d.j + 0.5) * slot, st = d.m.state;
      const hol = !!d.m.hollow && st === 'in_range', k = bandOf(st), pad = dotR(st, hol) + (wide ? 3 : 2.25);
      return { ang, r: radial(st, d.m.closeness, hol), lo: rr[k] + pad, hi: rr[k + 1] - pad, st, dr: dotR(st, hol) };
    });
    relax(pos);
    pos.forEach(p => { const q = P(p.r, p.ang); p.x = q[0]; p.y = q[1]; });
    /* OPTIMAL joins the key only where it clears every optimal dot near 12 o'clock */
    {
      const k0 = keys[0], band0 = rr[1] + 3, band1 = rr[2] - keyCap - 3;
      for (let r = band1; r >= band0; r -= 2) {
        const h = deg((k0.w / 2 + 4) / r);
        const hit = pos.some(p => p.st === 'optimal' && (Math.min(p.ang, 360 - p.ang) - deg((p.dr + 2) / p.r)) < h && p.r + p.dr > r - 2 && p.r - p.dr < r + keyCap + 2);
        if (!hit) { k0.r = r; k0.show = true; break; }
      }
    }
    DOTS.forEach((d, i) => {
      const pv = d.m.prev;
      if (pv && ORDER.includes(pv.state)) {
        const k = bandOf(pv.state), pad = dotR(pv.state) + (wide ? 3 : 2.25);
        const r = clamp(radial(pv.state, pv.closeness, !!d.m.hollow && pv.state === 'in_range'), rr[k] + pad, rr[k + 1] - pad);
        const q = P(r, pos[i].ang); pos[i].prev = { x: q[0], y: q[1], r, st: pv.state };
      }
    });

    const defs = [], out = [];
    /* defs: sage glow for the target, feathered halos for attention dots, hatch for out of range */
    /* one gradient, used by all 39 shadows: a soft blob with no filter, so it
       costs nothing and travels with its dot when the year turns */
    defs.push(`<radialGradient id="${uid}-sh">
      <stop offset="0" stop-color="${PAL.shade}" stop-opacity="${PAL.shadeA}"/>
      <stop offset=".55" stop-color="${PAL.shade}" stop-opacity="${f1(PAL.shadeA * .62)}"/>
      <stop offset="1" stop-color="${PAL.shade}" stop-opacity="0"/></radialGradient>`);
    defs.push(`<radialGradient id="${uid}-glow" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr[2])}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${PAL.glow[0]}"/><stop offset="${f1(rr[1] / rr[2])}" stop-color="${PAL.glow[1]}"/><stop offset="1" stop-color="${PAL.band.optimal}"/></radialGradient>`);

    /* rings */
    let rings = `<g class="bx-rings" style="transform-origin:${f1(cx)}px ${f1(cy)}px">`;
    if (opts.plate !== false) rings += `<circle class="bx-plate" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R + 0.5)}" fill="${PAL.plate}"/>`;
    rings += `<path class="bx-core" d="${annulus(0, rr[2])}" fill="url(#${uid}-glow)"/>`;
    rings += `<path d="${annulus(rr[2], rr[3])}" fill="${PAL.band.in_range}" fill-rule="evenodd"/>`;
    rings += `<path d="${annulus(rr[3], rr[4])}" fill="${PAL.band.borderline}" fill-rule="evenodd"/>`;
    rings += `<path d="${annulus(rr[4], rr[5])}" fill="${PAL.outTint}" fill-rule="evenodd"/>`;
    /* one faint spoke per marker, from the target to its tick on the bezel */
    DOTS.forEach(d => { const s2 = SYS[d.si], ag = s2.a0 + (d.j + 0.5) * slot; rings += `<path d="M${pxy(rr[1] + 2, ag)}L${pxy(R, ag)}" stroke="${PAL.spokeFaint}" stroke-width="1"/>`; });
    /* engraved inner target: a faint concentric ring inside the core */
    rings += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr[1] * .78)}" fill="none" stroke="${PAL.coreRing}" stroke-width="1"/>`;
    /* sector gaps: parallel-sided cream cuts from the core edge to the rim */
    const cuts = [keyAng / 2, 360 - keyAng / 2].concat(SYS.slice(0, -1).map(s => s.b1));
    cuts.forEach(g => { rings += `<path d="M${pxy(rr[1] + 0.5, g)}L${pxy(R, g)}" stroke="${PAL.seam}" stroke-width="1" stroke-linecap="butt"/>`; });
    rings += '</g>';
    /* ring boundaries, drawn on entrance (start at 12 o'clock) */
    const bnd = [[rr[1], PAL.line.core, 1], [rr[2], PAL.line.opt, 1.25], [rr[3], PAL.line.hair, 1], [rr[4], PAL.line.hair, 1], [rr[5], PAL.line.out, 1]];
    let bounds = `<g class="bx-rings bx-bounds">`;
    bnd.forEach(([r, c, w]) => { bounds += `<circle class="bx-bd" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="none" stroke="${c}" stroke-width="${w}" transform="rotate(-90 ${f1(cx)} ${f1(cy)})" data-len="${f1(2 * Math.PI * r)}"/>`; });
    bounds += '</g>';
    out.push(rings, bounds);

    /* ring key: state names on the 12 o'clock axis, each inside its own ring */
    let keyG = `<g class="bx-keys" aria-hidden="true">`;
    keys.forEach(k => {
      if (!k.show) return;
      const kid = `${uid}-k-${k.s}`;
      defs.push(`<path id="${kid}" d="M${pxy(k.r, -80)}${arc(k.r, -80, 80, 1)}"/>`);
      keyG += `<text class="k-${k.s}" font-size="${keyFs}" font-weight="600" letter-spacing="${keyTr}em" fill="${PAL.fg[k.s]}"><textPath href="#${kid}" startOffset="50%" text-anchor="middle">${H(WORD[k.s].toUpperCase())}</textPath></text>`;
    });
    keyG += '</g>';
    out.push(keyG);

    /* veils for highlight (per sector, per band) + highlighted sector outline */
    let veils = `<g aria-hidden="true">`;
    SYS.forEach(s => { veils += `<path class="bx-veil" data-s="${H(s.id)}" d="${wedge(rr[1] + 0.5, R + 2, s.b0, s.b1)}" fill="${PAL.veil}"/>`; });
    veils += `<path class="bx-veil" data-s="__key" d="${wedge(rr[1] + 0.5, R + 2, 360 - keyAng / 2, 360 + keyAng / 2)}" fill="${PAL.veil}"/>`;
    ORDER.forEach((s, k) => { veils += `<path class="bx-bveil" data-st="${s}" d="${annulus(rr[k + 1], rr[k + 2])}" fill="${PAL.veil}" fill-rule="evenodd"/>`; });
    SYS.forEach(s => { veils += `<path class="bx-outline" data-s="${H(s.id)}" d="${wedge(rr[1] + 0.5, R + 0.5, s.a0 - 0.35, s.a1 + 0.35)}" fill="none" stroke="${PAL.outline}" stroke-width="1" stroke-linejoin="round"/>`; });
    veils += '</g>';
    out.push(veils);

    /* centre: the count at target */
    /* the sub-label is fitted to the chord of the core circle where it sits */
    const nFs = wide ? clamp(rr[1] * .78, 26, 46) : clamp(rr[1] * .7, 22, 30), subTxt = (opts.centerLabel || 'at target').toUpperCase();
    let subFs = wide ? 8.5 : 10, subTr = wide ? 0.12 : 0.06, subY = nFs * .08 + subFs * 1.9;
    for (let it = 0; it < 8; it++) {
      const w = measure(subTxt, subFs, 600, subTr), yy = subY + subFs * .2, chord = 2 * Math.sqrt(Math.max(0, rr[1] * rr[1] - yy * yy)) - 8;
      if (w <= chord) break;
      if (subTr > .06) subTr -= .03; else subFs -= .25;
      subY = nFs * .08 + subFs * 1.75;
    }
    out.push(`<g class="bx-count" aria-hidden="true"><text class="bx-serif bx-n" x="${f1(cx)}" y="${f1(cy + nFs * .08)}" text-anchor="middle" font-size="${f1(nFs)}" fill="${PAL.count}" letter-spacing="-.02em">${COUNT.optimal}</text>` +
      `<text x="${f1(cx)}" y="${f1(cy + subY)}" text-anchor="middle" font-size="${f1(subFs)}" font-weight="600" letter-spacing="${f1(subTr)}em" fill="${PAL.countSub}">${H(subTxt)}</text></g>`);

    /* compare: last exam ghosts + dashed trails (hidden until setCompare(true)) */
    let cmp = `<g class="bx-cmp${compare ? ' on' : ''}" aria-hidden="true">`;
    pos.forEach((p, i) => {
      if (!p.prev) return; const dx = p.x - p.prev.x, dy = p.y - p.prev.y, L = Math.hypot(dx, dy); if (L < DR * 1.6) return; // only visible moves, never jitter
      const ex = p.x - dx / L * (p.dr + 2.5), ey = p.y - dy / L * (p.dr + 2.5);
      const ux = dx / L, uy = dy / L, ch = wide ? 4 : 3.4, c1 = [ex - ux * ch - uy * ch * .7, ey - uy * ch + ux * ch * .7], c2 = [ex - ux * ch + uy * ch * .7, ey - uy * ch - ux * ch * .7];
      cmp += `<path d="M${f1(p.prev.x)} ${f1(p.prev.y)}L${f1(ex)} ${f1(ey)}" stroke="${PAL.trail}" stroke-width="1" stroke-dasharray="2 3" fill="none"/>` +
        `<path d="M${f1(c1[0])} ${f1(c1[1])}L${f1(ex)} ${f1(ey)}L${f1(c2[0])} ${f1(c2[1])}" stroke="${PAL.trail}" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<circle cx="${f1(p.prev.x)}" cy="${f1(p.prev.y)}" r="${f1(DR * .6)}" fill="${PAL.dot[p.prev.st]}" fill-opacity=".4"/>`;
    });
    cmp += '</g>';
    out.push(cmp);

    out.push(`<line class="bx-spoke" x1="${f1(cx)}" y1="${f1(cy)}" x2="${f1(cx)}" y2="${f1(cy)}" stroke="${PAL.spoke}" stroke-width="1" stroke-linecap="round"/>`);

    /* dots: grey first so attention dots sit on top */
    const z = { in_range: 0, optimal: 1, borderline: 2, out_of_range: 3 };
    const drawOrder = DOTS.map((d, i) => i).sort((a, b) => z[DOTS[a].m.state] - z[DOTS[b].m.state]);
    let dots = `<g class="bx-dots">`;
    drawOrder.forEach(i => {
      const d = DOTS[i], m = d.m, p = pos[i], st = m.state, r = p.dr, hollow = !!m.hollow && st === 'in_range';
      const ux = (p.x - cx) / p.r, uy = (p.y - cy) / p.r;
      /* elevation: a dot in the outer rings sits higher off the page than one
         at target, so depth reads as distance from target rather than decor */
      const lift = bandOf(st) * (wide ? 1.15 : 0.9);
      let g = `<g class="bx-dot s-${st}" data-i="${i}" data-s="${H(m.system)}" role="button" tabindex="-1" aria-label="${H(ariaDot(m))}" style="transform:translate(${f1(p.x)}px,${f1(p.y)}px)">`;
      g += `<circle r="${f1(Math.max(r + 6, 12))}" fill="transparent"/>`;
      if (lift > 0) g += `<ellipse class="bx-sh" cx="0" cy="${f1(lift * 1.5)}" rx="${f1(r * 1.55 + lift * .35)}" ry="${f1(r * 1.4 + lift * .25)}" fill="url(#${uid}-sh)" pointer-events="none"/>`;
      if (st === 'out_of_range' && canAnim) g += `<circle class="bx-pulse" r="${f1(r)}" fill="none" stroke="${PAL.dot[st]}" stroke-width="1.25"/>`;
      if (m.once) g += `<circle r="${f1(r + 3.75)}" fill="none" stroke="${PAL.dot[st]}" stroke-opacity=".7" stroke-width="1" stroke-dasharray="2 2.2" pointer-events="none"/>`;
      g += hollow
        ? `<circle r="${f1(r - 0.6)}" fill="${PAL.hollowFill}" stroke="${PAL.hollow}" stroke-width="1.25"/>`
        : `<circle r="${f1(r)}" fill="${PAL.dot[st]}" stroke="${PAL.stroke}" stroke-width="${PAL.strokeW}"/>`;
      if (m.priority === 1 && !m.once) g += `<circle r="${f1(r + 3.5)}" fill="none" stroke="${PAL.dot[st]}" stroke-opacity=".6" stroke-width="1" pointer-events="none"/>`;
      g += `<circle class="sel" r="${f1(r + 4)}" fill="none" stroke="${PAL.sel}" stroke-width="1.25" pointer-events="none"/>`;
      g += `<circle class="fr" r="${f1(r + 4.5)}" fill="none" stroke="${PAL.focus}" stroke-width="2" pointer-events="none"/>`;
      if (m.priority) {
        const off = r + (m.priority === 1 ? 12.5 : wide ? 9 : 8.5);
        g += `<text class="bx-serif bx-pnum" x="${f1(ux * off)}" y="${f1(uy * off)}" text-anchor="middle" dominant-baseline="central" font-size="13" font-style="italic" fill="${PAL.num}" pointer-events="none">${H(m.priority)}</text>`;
      }
      dots += g + '</g>';
    });
    dots += '</g>';
    out.push(dots);

    svg.innerHTML = `<defs>${defs.join('')}</defs>` + out.join('') + `<g class="bx-labs" aria-hidden="true"></g>`;
    dotEls = []; svg.querySelectorAll('.bx-dot').forEach(g => { dotEls[+g.dataset.i] = g; });
    layoutLabels();
    applyState();
    if (active < 0) active = firstAttention();
    roving(active);
    dock.hidden = !dockOn;
    if (dockOn) renderDock(sel);
  }

  /* collision relax: dots that share a ring and sit on neighbouring spokes move
     apart radially, never leaving their ring */
  function relax(ps) {
    const minGap = wide ? 3 : 2.25;
    ORDER.forEach(st => {
      const idx = ps.map((p, i) => i).filter(i => ps[i].st === st).sort((a, b) => ps[a].ang - ps[b].ang);
      for (let it = 0; it < 40; it++) {
        let moved = false;
        for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < Math.min(idx.length, a + 3); b++) {
          const p = ps[idx[a]], q = ps[idx[b]];
          const dAng = Math.abs(q.ang - p.ang); if (dAng > 30) continue;
          const rm = (p.r + q.r) / 2, chord = 2 * rm * Math.sin(rad(dAng) / 2), need = p.dr + q.dr + minGap;
          if (chord >= need) continue;
          const dr = Math.sqrt(need * need - chord * chord), cur = Math.abs(q.r - p.r);
          if (cur >= dr - 0.05) continue;
          const push = (dr - cur) / 2 + 0.01;
          const qOut = q.r > p.r || (q.r === p.r && (b % 2 === 1));
          if (qOut) { q.r = Math.min(q.hi, q.r + push); p.r = Math.max(p.lo, p.r - push); }
          else { q.r = Math.max(q.lo, q.r - push); p.r = Math.min(p.hi, p.r + push); }
          moved = true;
        }
        if (!moved) break;
      }
    });
  }

  /* sector labels: curved along the rim, flipped upright below the equator,
     full names on desktop, short names on phones, nudged apart when crowded */
  function layoutLabels() {
    const labs = svg.querySelector('.bx-labs'); if (!labs) return;
    const measure = measurer();
    // full names everywhere (no abbreviations): tracked caps on wide charts, sentence case at 11px on phones
    const fs = wide ? 9.75 : 11, tr = wide ? 0.085 : 0, fw = wide ? 600 : 500, lh = wide ? 12.5 : 13.5;
    const arcR = R + (wide ? 8 : 6), base = R + (wide ? 21 : 18), cap = fs * 0.73;
    const L = SYS.map(s => {
      const cs = t => (wide ? t.toUpperCase() : t);
      const variants = [[cs(s.label)]];
      if (/\s/.test(s.label)) {
        const m = s.label.match(/^(.*?)\s(&\s.*|and\s.*)$/i) || s.label.match(/^(\S+)\s(.*)$/);
        if (m) variants.push([cs(m[1]), cs(m[2])]);
      }
      return { s, variants, v: 0, sub: '', subW: 0, widths: variants.map(v => Math.max(...v.map(t => measure(t, fs, fw, tr)))) };
    });
    const ext = l => deg(((Math.max(l.widths[l.v], l.subW) / 2) + (wide ? 6 : 4)) / base);
    let c = [];
    const place = () => {
      c = L.map(l => l.s.mid);
      const lo = keyAng / 2 - 3, hi = 360 - keyAng / 2 + 3;
      for (let it = 0; it < 80; it++) {
        let moved = false;
        for (let i = 0; i < L.length; i++) {
          const e = ext(L[i]), span = (L[i].s.a1 - L[i].s.a0) / 2 + 3;
          c[i] = clamp(c[i], Math.max(L[i].s.mid - span, lo + e), Math.min(L[i].s.mid + span, hi - e));
          if (i < L.length - 1) {
            const e2 = ext(L[i + 1]), ov = (c[i] + e) - (c[i + 1] - e2);
            if (ov > 0.01) { c[i] -= ov / 2; c[i + 1] += ov / 2; moved = true; }
          }
        }
        if (!moved) break;
      }
      const bad = new Set();
      for (let i = 0; i < L.length - 1; i++) if ((c[i] + ext(L[i])) - (c[i + 1] - ext(L[i + 1])) > 0.3) { bad.add(i); bad.add(i + 1); }
      return bad;
    };
    for (let round = 0; round < 4; round++) {
      const bad = place(); if (!bad.size) break;
      let changed = false;
      [...bad].sort((a, b) => L[b].widths[L[b].v] - L[a].widths[L[a].v]).slice(0, 1).forEach(i => { if (L[i].v < L[i].variants.length - 1) { L[i].v++; changed = true; } });
      if (!changed) { [...bad].forEach(i => { if (L[i].v < L[i].variants.length - 1) { L[i].v++; changed = true; } }); }
      if (!changed) break;
    }
    place();

    let defs = '', g = '';
    const gapHalf = wide ? 0.75 : 0.9;
    L.forEach((l, i) => {
      const s = l.s, lines = l.variants[l.v].slice(), mid = c[i];
      const flip = mid > 95 && mid < 265;
      const rows = lines.map(t => ({ t, fs, w: fw, tr, fill: PAL.label }));
      const n = rows.length;
      /* reading order top-to-bottom: above the equator the first line is the outermost */
      rows.forEach((row, k) => {
        const ring = flip ? k : n - 1 - k;
        const r = flip ? base + cap + ring * lh : base + ring * lh;
        const id = `${uid}-lp-${i}-${k}`, span = 70;
        defs += flip
          ? `<path id="${id}" d="M${pxy(r, mid + span)}${arc(r, mid + span, mid - span, 0)}"/>`
          : `<path id="${id}" d="M${pxy(r, mid - span)}${arc(r, mid - span, mid + span, 1)}"/>`;
        g += `<text class="bx-lab" data-s="${H(s.id)}" font-size="${row.fs}" font-weight="${row.w}" letter-spacing="${row.tr}em" fill="${row.fill}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${H(row.t)}</textPath></text>`;
      });
      /* the sector bracket: a hairline arc over the sector's spokes with a tick per marker */
      g += `<g class="bx-lab" data-s="${H(s.id)}"><path d="M${pxy(arcR, s.a0 + 0.3)}${arc(arcR, s.a0 + 0.3, s.a1 - 0.3)}" fill="none" stroke="${PAL.arc}" stroke-width="1" stroke-linecap="round"/>`;
      for (let j = 0; j < s.markers.length; j++) { const aj = s.a0 + (j + 0.5) * slot; g += `<path d="M${pxy(arcR, aj)}L${pxy(arcR - (wide ? 3.5 : 2.5), aj)}" stroke="${PAL.arc}" stroke-width="1"/>`; }
      g += '</g>';
      if (opts.onSystem) g += `<path class="bx-lhit" data-s="${H(s.id)}" d="${wedge(R + 2, R + (wide ? 50 : 38), s.a0 - gapHalf, s.a1 + gapHalf)}" fill="transparent" style="cursor:pointer"/>`;
    });
    measure.done();
    labs.innerHTML = `<defs>${defs}</defs>${g}`;
    labelsBuilt = true;
    applyState();
  }

  /* ---------- state -> classes ---------- */
  function applyState() {
    svg.classList.toggle('bx-hl', !!hlSys); svg.classList.toggle('bx-hs', !hlSys && !!hlState);
    svg.querySelectorAll('[data-s]').forEach(n => n.classList.toggle('on', !!hlSys && n.dataset.s === hlSys));
    svg.querySelectorAll('.bx-bveil').forEach(n => n.classList.toggle('on', n.dataset.st === hlState));
    svg.querySelectorAll('.bx-keys text').forEach(n => n.classList.toggle('on', !!hlState && n.classList.contains('k-' + hlState)));
    if (!hlSys && hlState) dotEls.forEach((g, i) => g && g.classList.toggle('on', DOTS[i].m.state === hlState));
    svg.querySelectorAll('.bx-outline').forEach(n => n.classList.toggle('on', !!hlSys && n.dataset.s === hlSys));
    const cg = svg.querySelector('.bx-cmp'); if (cg) cg.classList.toggle('on', compare);
  }

  function firstAttention() {
    const i = DOTS.findIndex(d => attn(d.m.state)); return i < 0 ? 0 : i;
  }
  function roving(i) {
    dotEls.forEach((g, k) => g && g.setAttribute('tabindex', k === i ? '0' : '-1'));
  }

  /* ---------- tooltip / readout ---------- */
  function tagHTML(st) {
    return `<span class="bx-tag s-${st}${attn(st) ? ' chip' : ''}"><i></i>${WORD[st]}</span>`;
  }
  function body(i) {
    const m = DOTS[i].m, sys = SYS[DOTS[i].si];
    return `<p class="bx-t-sys">${H(m.systemLabel || sys.label)}</p>` +
      `<p class="bx-t-name">${H(m.name)}</p>` +
      `<div class="bx-t-row"><span class="bx-t-val">${H(m.valueText)}${m.unit ? `<small>${H(m.unit)}</small>` : ''}</span>${tagHTML(m.state)}</div>`;
  }
  function showTip(i, via) {
    hot = i; markHot();
    if (dockOn) { sel = i; renderDock(i); return; }
    const m = DOTS[i].m;
    const note = String(m.note || '').split('\n').filter(Boolean);
    if (m.hollow) note.push('No clinic target: the lab range is the goal.');
    if (m.once && !note.some(t => /once/i.test(t))) note.push('Measured once.');
    tip.innerHTML = body(i) + (note.length ? `<p class="bx-t-note">${note.map(H).join('<br>')}</p>` : '') +
      `<p class="bx-t-go">${via === 'key' ? 'Press Enter for details' : 'Select for details'} ${ARROW}</p>`;
    /* place it on whichever side keeps the centre of the target in view */
    const rect = svg.getBoundingClientRect(), k = rect.width / W || 1;
    const p = pos[i], tw = tip.offsetWidth, th = tip.offsetHeight, ew = el.clientWidth, eh = rect.height || W * k;
    const px = p.x * k, py = p.y * k, g = p.dr * k + 12, ccx = cx * k, ccy = cy * k;
    let best = null, bs = -Infinity;
    [[px - tw / 2, py - g - th, 24], [px - tw / 2, py + g, 24], [px - g - tw, py - th / 2, 0], [px + g, py - th / 2, 0]].forEach(([x, y, pref]) => {
      const X = clamp(x, 0, Math.max(0, ew - tw)), Y = clamp(y, -16, eh - th + 16);
      const covers = px > X - 8 && px < X + tw + 8 && py > Y - 8 && py < Y + th + 8;
      const score = Math.hypot(X + tw / 2 - ccx, Y + th / 2 - ccy) + pref - (Math.abs(X - x) + Math.abs(Y - y)) * 0.6 - (covers ? 1e4 : 0);
      if (score > bs) { bs = score; best = [X, Y]; }
    });
    tip.style.setProperty('--x', f1(best[0]) + 'px'); tip.style.setProperty('--y', f1(best[1]) + 'px');
    tip.classList.add('on');
  }
  function hideTip() {
    tip.classList.remove('on'); hot = dockOn ? sel : -1; markHot();
  }
  function markHot() {
    dotEls.forEach((g, k) => g && g.classList.toggle('hot', k === hot));
    const sp = svg.querySelector('.bx-spoke'); if (!sp) return;
    if (hot >= 0) {
      const p = pos[hot], ux = (p.x - cx) / p.r, uy = (p.y - cy) / p.r, r0 = rr[1] + 1, r1 = p.r - p.dr - 4.5;
      sp.setAttribute('x1', f1(cx + ux * r0)); sp.setAttribute('y1', f1(cy + uy * r0));
      sp.setAttribute('x2', f1(cx + ux * Math.max(r0, r1))); sp.setAttribute('y2', f1(cy + uy * Math.max(r0, r1)));
      sp.classList.add('on');
    } else sp.classList.remove('on');
  }
  function renderDock(i) {
    if (!dockOn) return;
    if (i == null || i < 0) {
      read.innerHTML = `<p class="bx-hint"><b>${coarse ? 'Tap' : 'Select'} any dot</b>or step through all ${N} markers</p>`;
      return;
    }
    const m = DOTS[i].m;
    read.innerHTML = `<p class="bx-t-sys">${H(m.systemLabel || SYS[DOTS[i].si].label)} <span>· ${i + 1} of ${N}</span></p>` +
      `<div class="bx-d-row"><p class="bx-t-name">${H(m.name)}</p><span class="bx-t-val">${H(m.valueText)}${m.unit ? `<small>${H(m.unit)}</small>` : ''}</span></div>` +
      `<div class="bx-d-row bx-d-foot">${tagHTML(m.state)}<button type="button" class="bx-open" data-i="${i}">Details ${ARROW}</button></div>`;
  }

  /* ---------- entrance ---------- */
  function play() {
    played = true;
    anims.forEach(a => { try { a.cancel(); } catch (e) { /* noop */ } }); anims = [];
    timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf);
    svg.classList.remove('bx-pre');
    svg.querySelectorAll('.bx-pulse').forEach(p => p.classList.remove('go'));
    if (!canAnim) { setCount(COUNT.optimal); return; }
    const A = (node, kf, o) => { const a = node.animate(kf, Object.assign({ fill: 'backwards' }, o)); anims.push(a); return a; };
    svg.querySelectorAll('.bx-rings:not(.bx-bounds)').forEach(g => A(g, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 760, easing: EASE }));
    svg.querySelectorAll('.bx-bd').forEach((c, k) => {
      const len = +c.dataset.len; c.style.strokeDasharray = `${len} ${len}`;
      A(c, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1000, delay: 60 + k * 70, easing: EASE_IO });
    });
    const kt = [...svg.querySelectorAll('.bx-keys text')];
    kt.reverse().forEach((t, k) => A(t, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 520 + k * 70, easing: EASE }));
    A(svg.querySelector('.bx-count'), [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 240, easing: EASE });
    const lab = [...svg.querySelectorAll('.bx-lab')];
    lab.forEach(t => { const si = SYS.findIndex(s => s.id === t.dataset.s); A(t, [{ opacity: 0 }, { opacity: 1 }], { duration: 480, delay: 300 + si * 45, easing: EASE }); });
    const trend = opts.entrance === 'trend';
    /* The 'trend' entrance is the year turning, told once: the dots arrive
       where they sat last year, hold, then glide to this year's positions.
       There is no fly-in from the edge: a dot that flies in says nothing, and
       it competed with the glide that carries the whole meaning. */
    const GLIDE_AT = 1050, GLIDE = 1200, EMPH = 'cubic-bezier(.16,1,.3,1)';
    let end = 0;
    DOTS.forEach((d, i) => {
      const g = dotEls[i], p = pos[i]; if (!g) return;
      const to = `translate(${f1(p.x)}px,${f1(p.y)}px)`;
      if (trend) {
        const stagger = Math.round(((p.ang / (Math.PI * 2)) % 1 + 1) % 1 * 18 * 12); // 18 ms by angle
        const at = p.prev ? `translate(${f1(p.prev.x)}px,${f1(p.prev.y)}px)` : to;
        A(g, [{ transform: at, opacity: 0 }, { transform: at, opacity: 1 }], { duration: 300, delay: 500 + stagger, easing: EASE });
        if (p.prev) {
          A(g, [{ transform: at, offset: 0 }, { transform: to, offset: 1 }],
            { duration: GLIDE, delay: GLIDE_AT + stagger, easing: EMPH, fill: 'both' });
        }
        end = Math.max(end, GLIDE_AT + stagger + GLIDE);
      } else {
        const edge = P(R + (wide ? 34 : 22), p.ang), from = `translate(${f1(edge[0])}px,${f1(edge[1])}px)`;
        const delay = 420 + d.si * 62 + d.j * 24;
        A(g, [{ transform: from, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: to, opacity: 1 }], { duration: 900, delay, easing: EASE });
        end = Math.max(end, delay + 900);
      }
    });
    // the priority numerals land last, once the year has finished turning
    if (trend) svg.querySelectorAll('.bx-pnum').forEach(t => A(t, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 2400, easing: EASE }));
    // the carried-forward marker pulses once, so "measured once" is noticed
    if (trend) timers.push(setTimeout(pulse, 2300));
    /* The centre count is this year's, so it counts to last year's total first
       and then turns with the dots. */
    const prevOpt = trend ? DOTS.reduce((n, d) => n + (d.m.prev ? (d.m.prev.state === 'optimal' ? 1 : 0) : (d.m.state === 'optimal' ? 1 : 0)), 0) : COUNT.optimal;
    const t0 = performance.now(), dur = 1100;
    const tick = t => {
      const el = t - t0;
      const k = clamp((el - 240) / dur, 0, 1), e = 1 - Math.pow(2, -10 * k);
      let v = prevOpt * (k >= 1 ? 1 : e);
      if (trend && el > GLIDE_AT) { const g = clamp((el - GLIDE_AT) / GLIDE, 0, 1); v = prevOpt + (COUNT.optimal - prevOpt) * (1 - Math.pow(1 - g, 3)); }
      setCount(Math.round(v));
      if (el < (trend ? GLIDE_AT + GLIDE : 240 + dur)) raf = requestAnimationFrame(tick); else setCount(COUNT.optimal);
    };
    setCount(0); raf = requestAnimationFrame(tick);
  }
  function setCount(n) { const t = svg.querySelector('.bx-n'); if (t) t.textContent = n; }
  /* two slow pulses (under 5 s, so no pause control is needed); replays on sector highlight */
  function pulse() {
    if (!canAnim) return;
    svg.querySelectorAll('.bx-pulse').forEach(p => { p.classList.remove('go'); void p.getBoundingClientRect(); p.classList.add('go'); });
  }

  /* ---------- events ---------- */
  const dotIndex = t => { const g = t && t.closest && t.closest('.bx-dot'); return g ? +g.dataset.i : -1; };
  function toSvg(e) { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * W / r.width]; }
  /* A finger is about 28 CSS px wide here. The chart is drawn in its own
     coordinate space, so that has to be converted through the render scale or
     the hit area shrinks to a few pixels on a phone. */
  const pxToSvg = px => { const r = svg.getBoundingClientRect(); return r.width ? px * W / r.width : px; };
  function nearest(x, y, max) {
    let best = -1, bd = max;
    pos.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y) - p.dr; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
  const offs = [];
  on(svg, 'pointerdown', e => { lastPtr = e.pointerType || 'mouse'; });
  let preview = null;
  on(svg, 'pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const lh = e.target.closest && e.target.closest('.bx-lhit');
    if (lh) { if (preview === null) preview = hlSys || ''; hlSys = lh.dataset.s; hlState = null; applyState(); return; }
    const i = dotIndex(e.target); if (i < 0) return;
    if (!dockOn) showTip(i, 'hover'); else { hot = i; markHot(); }
  });
  on(svg, 'pointerout', e => {
    if (e.pointerType !== 'mouse') return;
    const lh = e.target.closest && e.target.closest('.bx-lhit');
    if (lh && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.bx-lhit'))) { hlSys = preview || null; preview = null; applyState(); return; }
    const i = dotIndex(e.target); if (i < 0) return;
    const to = dotIndex(e.relatedTarget); if (to === i) return;
    if (document.activeElement === dotEls[i]) return;
    if (!dockOn) hideTip(); else { hot = sel; markHot(); }
  });
  on(svg, 'click', e => {
    const lab = e.target.closest && e.target.closest('.bx-lhit');
    if (lab && opts.onSystem) { preview = null; opts.onSystem(lab.dataset.s); return; }
    let i = dotIndex(e.target);
    if (lastPtr !== 'mouse') {
      if (i < 0) { const [x, y] = toSvg(e); i = nearest(x, y, pxToSvg(28)); }
      if (i < 0) { if (!dockOn) hideTip(); return; }
      if (dockOn || hot !== i) { active = i; roving(i); showTip(i, 'tap'); return; }
    }
    if (i >= 0 && opts.onOpen) opts.onOpen(DOTS[i].m.id);
  });
  /* Parallax. A few pixels of differential drift as the pointer crosses the
     chart, enough to separate the rings from the dots. Fine pointers only, and
     never under reduced motion - a touch device gets nothing. */
  if (!RM && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    let pr = 0, pX = 0, pY = 0, parked = true;
    const apply = () => {
      pr = 0;
      el.style.setProperty('--bx-px', pX.toFixed(3));
      el.style.setProperty('--bx-py', pY.toFixed(3));
    };
    on(svg, 'pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const b = svg.getBoundingClientRect(); if (!b.width) return;
      pX = clamp(((e.clientX - b.left) / b.width - 0.5) * 2, -1, 1);
      pY = clamp(((e.clientY - b.top) / b.height - 0.5) * 2, -1, 1);
      if (parked) { parked = false; el.classList.add('bx-par'); }
      if (!pr) pr = requestAnimationFrame(apply);
    });
    on(svg, 'pointerleave', () => {
      // ease back to centre rather than snapping: drop the no-transition class
      parked = true; el.classList.remove('bx-par'); pX = pY = 0;
      if (!pr) pr = requestAnimationFrame(apply);
    });
  }
  on(svg, 'focusin', e => { const i = dotIndex(e.target); if (i < 0) return; active = i; roving(i); showTip(i, 'key'); });
  on(svg, 'focusout', e => { if (svg.contains(e.relatedTarget)) return; if (!dockOn) hideTip(); });
  on(svg, 'keydown', e => {
    const i = dotIndex(e.target); if (i < 0) return;
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % N;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + N) % N;
    else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = N - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (opts.onOpen) opts.onOpen(DOTS[i].m.id); return; }
    else if (e.key === 'Escape') { hideTip(); return; }
    if (n >= 0) { e.preventDefault(); dotEls[n].focus(); }
  });
  /* The dock reads like a card, so it steps on a swipe as well as on its
     buttons. Vertical drags are left to the page. */
  let sw = null;
  on(dock, 'pointerdown', e => { if (e.pointerType === 'mouse') return; sw = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
  on(dock, 'pointerup', e => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y, dt = e.timeStamp - sw.t;
    sw = null;
    if (dt > 700 || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const d = dx < 0 ? 1 : -1, base = sel < 0 ? (d > 0 ? firstAttention() - 1 : firstAttention() + 1) : sel;
    const n = (base + d + N) % N; active = n; roving(n); showTip(n, 'step');
  });
  on(dock, 'pointercancel', () => { sw = null; });
  on(dock, 'click', e => {
    const st = e.target.closest('.bx-step'), op = e.target.closest('.bx-open');
    if (st) { const d = +st.dataset.d, base = sel < 0 ? (d > 0 ? firstAttention() - 1 : firstAttention() + 1) : sel; const n = (base + d + N) % N; active = n; roving(n); showTip(n, 'step'); }
    else if (op && opts.onOpen) opts.onOpen(DOTS[+op.dataset.i].m.id);
  });

  /* ---------- lifecycle ---------- */
  build();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (svg.isConnected) layoutLabels(); });
  let io = null;
  if (!played) {
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting && x.intersectionRatio >= .35)) { io.disconnect(); io = null; play(); } }, { threshold: [0, .35, .6] });
      io.observe(el);
    } else play();
  } else if (canAnim === false) setCount(COUNT.optimal);
  let rzRaf = 0;
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
    cancelAnimationFrame(rzRaf);
    rzRaf = requestAnimationFrame(() => {
      const w = Math.round(el.clientWidth); if (!w || Math.abs(w - W) < 1) return;
      const hadFocus = svg.contains(document.activeElement);
      anims.forEach(a => { try { a.finish(); } catch (e) { /* noop */ } }); anims = [];
      build(); setCount(COUNT.optimal); if (played) svg.classList.remove('bx-pre');
      if (hadFocus && dotEls[active]) dotEls[active].focus({ preventScroll: true });
    });
  }) : null;
  if (ro) ro.observe(el);

  return {
    destroy() {
      offs.forEach(f => f()); if (io) io.disconnect(); if (ro) ro.disconnect();
      anims.forEach(a => { try { a.cancel(); } catch (e) { /* noop */ } }); timers.forEach(clearTimeout); cancelAnimationFrame(raf); cancelAnimationFrame(rzRaf);
      el.innerHTML = ''; el.className = prevClass;
    },
    highlight(systemId) { hlSys = systemId && SYS.some(s => s.id === systemId) ? systemId : null; if (hlSys) hlState = null; applyState(); if (hlSys && SYS.find(s => s.id === hlSys).markers.some(m => m.state === 'out_of_range')) pulse(); },
    highlightState(state) { hlState = ORDER.includes(state) ? state : null; if (hlState) hlSys = null; applyState(); },
    /* setYear(t): 0 is the previous exam, 1 is this one. Dots travel between
       the positions they already hold, their state flips at the midpoint, and
       the centre count counts with them. */
    setYear(t) {
      const k = t < 0 ? 0 : t > 1 ? 1 : t;
      let n = 0;
      dotEls.forEach((g, i) => {
        if (!g) return;
        const p = pos[i], m = DOTS[i].m, pv = m.prev;
        const x = pv && p.prev ? p.prev.x + (p.x - p.prev.x) * k : p.x;
        const y = pv && p.prev ? p.prev.y + (p.y - p.prev.y) * k : p.y;
        g.style.transform = `translate(${f1(x)}px,${f1(y)}px)`;
        const st = pv && k < 0.5 ? pv.state : m.state;
        if (g.dataset.st !== st) {
          g.dataset.st = st;
          g.setAttribute('class', `bx-dot s-${st}${g.classList.contains('on') ? ' on' : ''}`);
          g.querySelectorAll('circle[fill]:not([fill="transparent"]):not([fill="none"])').forEach(c => c.setAttribute('fill', PAL.dot[st]));
        }
        if (st === 'optimal') n++;
      });
      setCount(n);
      svg.querySelector('.bx-cmp') && svg.querySelector('.bx-cmp').classList.toggle('on', k < 0.985);
    },
    setCompare(v) { compare = !!v; applyState(); },
    select(markerId) { const i = DOTS.findIndex(d => d.m.id === markerId); if (i < 0) { sel = -1; hideTip(); if (dockOn) renderDock(-1); return; } active = i; roving(i); showTip(i, 'api'); },
    play() { if (canAnim) play(); },
  };
}
