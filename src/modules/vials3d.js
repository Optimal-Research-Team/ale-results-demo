/* ==========================================================================
   SIGNATURE 1 · "Behind the numbers" — the collection tubes (three.js r128)

   mountVials(el, opts) → { setProgress(p), setFocus(id|null), getAnchor(id),
                            resize(), render(), destroy(), fallback }
   vialsFallbackSVG(opts) → string   (no-WebGL still + loading poster)

   Concatenated inside the page IIFE by build.py: function declarations only at
   top level, every helper lives inside vialsBuild() so nothing collides with
   page scope. Needs window.THREE (or opts.THREE); without it, or without
   WebGL, the SVG still is shown and the returned API is inert.

   opts = {
     containers: [{ id, label, cap: 'gold'|'lavender'|'grey'|'urine',
                    markerCount, systems: string[],
                    states?: string[] | {optimal,in_range,borderline,out_of_range},
                    tube?: 'Gold-top tube (SST)', code?: 'SERUM · SST' }],
     total, reducedMotion, onProgress?(p),
     mode?: 'story' (pinned 3-beat, default) | 'compact' (phone, unpinned),
     callout?: bool (built-in glass callout; default true in story mode),
     date?: '12 SEP 2026', progress?: initial p, onFocus?(id|null),
     onReady?(), onFallback?(reason), exposure?: number
   }
   Medical content is never computed here: counts and states arrive as data.
   ========================================================================== */
function mountVials(el, opts) { return vialsLib().mount(el, opts || {}); }
function vialsFallbackSVG(opts) { return vialsLib().svg(opts || {}); }
function vialsLib() { return vialsLib.x || (vialsLib.x = vialsBuild()); }

function vialsBuild() {
  const DEG = Math.PI / 180;
  const ORDER = ['optimal', 'in_range', 'borderline', 'out_of_range'];
  const TILE = { optimal: '#2C4E25', in_range: '#A9A49B', borderline: '#C97B2D', out_of_range: '#B3402F' };
  const FG = { optimal: '#2C4E25', in_range: '#76736D', borderline: '#9A5A1C', out_of_range: '#B3402F' };
  const WORD = { optimal: 'optimal', in_range: 'in range', borderline: 'borderline', out_of_range: 'out of range' };
  const KIND = {
    gold: { hex: '#C9A04A', gl: '#B68C35', sample: 'Serum', tube: 'Gold-top tube (SST)', code: 'SERUM · SST', liquid: 1, fill: 7.0, short: 'gold-top serum tube' },
    lavender: { hex: '#A696C8', gl: '#9281BC', sample: 'Whole blood', tube: 'Lavender-top tube (EDTA)', code: 'WHOLE BLOOD · EDTA', liquid: 0, fill: 6.5, short: 'lavender-top whole-blood tube' },
    grey: { hex: '#8E918C', gl: '#7E827C', sample: 'Plasma', tube: 'Grey-top tube (fluoride)', code: 'PLASMA · FLUORIDE', liquid: 3, fill: 5.5, short: 'grey-top plasma tube' },
    urine: { hex: '#EFE9DC', sample: 'Urine', tube: 'Specimen cup', code: 'URINE', liquid: 2, fill: 3.55, short: 'urine cup' },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const emph = t => 1 - Math.pow(1 - clamp01(t), 4);           // ≈ cubic-bezier(.16,1,.3,1)
  const win = (p, a, b, r) => ss(a - r, a + r, p) * (1 - ss(b - r, b + r, p));
  const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

  function norm(c) {
    const k = KIND[c.cap] || KIND.gold;
    let st = c.states;
    if (st && !Array.isArray(st)) st = ORDER.flatMap(s => Array(st[s] || 0).fill(s));
    st = (st || []).slice().sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    const counts = {}; ORDER.forEach(s => (counts[s] = 0)); st.forEach(s => counts[s]++);
    return Object.assign({}, c, { k, isCup: c.cap === 'urine', label: c.label || k.sample, tube: c.tube || k.tube, code: c.code || k.code,
      n: c.markerCount != null ? c.markerCount : st.length, states: st, counts, systems: c.systems || [] });
  }
  const countsLine = c => ORDER.filter(s => c.counts[s]).map(s => `<span style="color:${FG[s]}">${c.counts[s]} ${WORD[s]}</span>`).join('<span class="vl-dot"> · </span>');
  const ariaLabel = (items, total) => {
    const parts = items.map((c, i) => `${c.k.short}, ${c.n}${i ? '' : ' markers'}`);
    const num = ['no', 'one', 'two', 'three', 'four', 'five', 'six'][items.length] || items.length;
    return `Illustration of ${num} sample containers: ${parts.join('; ')}.${total ? ` ${total} markers in total.` : ''}`;
  };

  /* ---------------------------------------------------------------- style */
  function injectStyle() {
    if (document.getElementById('vl-style')) return;
    const st = document.createElement('style'); st.id = 'vl-style';
    st.textContent = `
.vl{overflow:hidden;isolation:isolate}
.vl-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .45s cubic-bezier(.16,1,.3,1)}
.vl-poster{position:absolute;inset:0;transition:opacity .45s cubic-bezier(.16,1,.3,1),visibility 0s .45s}
.vl-poster svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.vl-live .vl-canvas{opacity:1}.vl-live .vl-poster{opacity:0;visibility:hidden}
.vl-lead{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;opacity:0;transition:opacity .28s cubic-bezier(.2,.7,.2,1)}
.vl-lead path{fill:none;stroke:rgba(71,71,71,.55);stroke-width:1}.vl-lead circle{fill:#FFFCF7;stroke:#474747;stroke-width:1}
.vl-co{position:absolute;left:0;top:0;width:300px;max-width:calc(100% - 32px);box-sizing:border-box;padding:18px 20px 16px;border-radius:8px;
  background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(14px) saturate(1.1);backdrop-filter:blur(14px) saturate(1.1);border:1px solid #DDDCDB;
  font:400 13px/1.45 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#474747;letter-spacing:-.006em;
  font-feature-settings:"cv05" 1,"cv08" 1,"ss01" 1,"tnum" 1;pointer-events:none;opacity:0;will-change:transform,opacity;transition:opacity .28s cubic-bezier(.2,.7,.2,1)}
.vl-co-in{transform:translateY(4px);transition:transform .28s cubic-bezier(.16,1,.3,1)}
.vl-on .vl-co,.vl-on .vl-lead{opacity:1}.vl-on .vl-co-in{transform:none}
.vl-co-h{display:flex;align-items:center;gap:10px}
.vl-co-h i{width:12px;height:12px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(4,5,4,.12)}
.vl-co-t{font:400 22px/1.1 Castoro,"Iowan Old Style","Palatino Linotype",Georgia,serif;color:#252525;letter-spacing:-.01em}
.vl-co-sub{margin:3px 0 0 22px;color:#76736D}
.vl-co-n{display:flex;align-items:baseline;gap:8px;margin:14px 0 10px}
.vl-co-n b{font:400 44px/.9 Castoro,Georgia,serif;color:#252525;font-variant-numeric:tabular-nums lining-nums;letter-spacing:-.02em}
.vl-co-n span{font-weight:500;color:#474747}
.vl-co-tiles{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:10px}.vl-co-tiles i{width:6px;height:14px;border-radius:1px}
.vl-co p{margin:0}.vl-co-c{font-weight:500}.vl-co-c > span{white-space:nowrap}.vl-co-c .vl-dot{color:#A9A49B;white-space:normal}
.vl-co-s{margin-top:6px!important;color:#474747;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.vl-co-sm{width:212px;padding:13px 14px 12px;font-size:12px}.vl-co-sm .vl-co-t{font-size:18px}.vl-co-sm .vl-co-sub{margin-left:20px}
.vl-co-sm .vl-co-n{margin:9px 0 7px}.vl-co-sm .vl-co-n b{font-size:32px}.vl-co-sm .vl-co-tiles i{width:4px;height:10px}.vl-co-sm .vl-co-s{display:none}
@media (prefers-reduced-motion:reduce){.vl-canvas,.vl-poster,.vl-co,.vl-co-in,.vl-lead{transition:none}}`;
    (document.head || document.documentElement).appendChild(st);
  }


  /* ----------------------------------------------------------------- GLSL */
  // One analytic studio: warm cream sweep, a large key softbox front-left, a thin
  // sage-tinted strip right, an overhead strip, and a darker negative fill behind
  // the set so clear glass keeps a defined edge on cream. The glass shader reads it
  // directly; everything else reads the same function through PMREM.
  const GLSL_ENV = `
float vlBox(float x, float a, float b, float s){ return smoothstep(a - s, a + s, x) * (1.0 - smoothstep(b - s, b + s, x)); }
vec3 vlStudio(vec3 R){
  R = normalize(R);
  float az = atan(R.x, abs(R.x) + abs(R.z) < 1e-5 ? 1e-5 : R.z);
  float el = R.y;
  vec3 top = vec3(1.00, 0.972, 0.930);
  vec3 hor = vec3(0.780, 0.735, 0.665);
  vec3 flo = vec3(0.470, 0.420, 0.350);
  vec3 c = el > 0.0 ? mix(hor, top, smoothstep(0.0, 0.85, el)) : mix(hor, flo, smoothstep(0.0, 0.40, -el));
  c *= mix(1.0, 0.30, smoothstep(1.9, 2.75, abs(az)) * (1.0 - smoothstep(0.30, 0.85, el)));
  c += vec3(1.00, 0.955, 0.890) * 8.0 * vlBox(az, -1.34, -0.80, 0.05) * vlBox(el, -0.34, 0.72, 0.07);
  c += vec3(0.930, 1.000, 0.925) * 4.2 * vlBox(az, 1.24, 1.40, 0.025) * vlBox(el, -0.28, 0.62, 0.07);
  c += vec3(1.00, 0.985, 0.960) * 2.4 * vlBox(el, 0.88, 1.01, 0.04) * vlBox(az, -1.3, 1.3, 0.3);
  return c;
}
vec3 vlTone(vec3 c){
#if defined( TONE_MAPPING )
  c = toneMapping(c);
#endif
  return c;
}
vec3 vlDisp(vec3 c){ return linearToOutputTexel(vec4(vlTone(c), 1.0)).rgb; }
`;
  const VS_WORLD = `
varying vec3 vWN; varying vec3 vWP; varying vec3 vLP;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz; vLP = position;
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
  const FS_ENV = `varying vec3 vWP; void main(){ gl_FragColor = linearToOutputTexel(vec4(vlStudio(normalize(vWP)), 1.0)); }`;   // RGBE when PMREM renders it
  // Clear PET/glass: Fresnel reflection of the studio (additive, premultiplied),
  // a refraction-dark edge band, a faint inner light line, and an optional frost.
  const FS_GLASS = `
uniform float uDim, uOp, uBase, uFrost, uFrostY, uBack, uRim;
uniform vec3 uHaze;
varying vec3 vWN; varying vec3 vWP; varying vec3 vLP;
void main(){
  vec3 V = normalize(cameraPosition - vWP);
  vec3 N = normalize(vWN);
  if (dot(N, V) < 0.0) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float g = 1.0 - ndv;
  float F = 0.04 + 0.96 * pow(g, 5.0);
  float k = 1.0 - uBack * 0.55;
  vec3 pre = vlTone(vlStudio(reflect(-V, N)) * F) * k;
  float a = F * k;
  float edge = smoothstep(0.70, 0.985, g) * (1.0 - uBack * 0.7);
  float lip = smoothstep(0.50, 0.64, g) * (1.0 - smoothstep(0.66, 0.78, g)) * (1.0 - uBack);
  pre += vec3(0.285, 0.270, 0.240) * edge * 0.52; a += edge * 0.52;
  pre += vec3(1.0, 0.99, 0.965) * lip * (0.10 + uRim * 0.18); a += lip * 0.05;
  float fr = uBase + uFrost * (1.0 - smoothstep(uFrostY - 0.45, uFrostY, vLP.y));
  pre += vec3(0.975, 0.960, 0.925) * fr; a += fr;
  a = clamp(max(a, max(pre.r, max(pre.g, pre.b)) * 0.35), 0.0, 1.0);
  pre = mix(pre, uHaze * a, uDim);
  gl_FragColor = vec4(pre, a) * uOp;
}`;
  // Liquids are opaque and shaded as if seen against the cream set: Beer-Lambert
  // through the chord for serum and urine, a scattering core for whole blood.
  // Back faces below the fill line stand in for the liquid's top surface.
  const FS_LIQ = `
uniform float uDim, uOp, uGlow, uFill, uClot, uGel, uTilt, uKind;
uniform vec3 uHaze;
varying vec3 vWN; varying vec3 vWP; varying vec3 vLP;
vec3 beer(vec3 s, float t){ return exp(-s * t); }
void main(){
  if (vLP.y > uFill) discard;
  vec3 V = normalize(cameraPosition - vWP);
  vec3 N = normalize(vWN);
  float top = gl_FrontFacing ? 0.0 : 1.0;
  float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
  vec3 L = normalize(vec3(-0.66, 0.58, 0.48));
  float wrap = mix(clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0), 0.9, top);
  float th = mix(ndv, 1.0, top);
  float y = mix(vLP.y - vLP.x * uTilt, uFill, top);
  vec3 creamL = vec3(1.0, 0.972, 0.930);
  vec3 col;
  if (uKind < 0.5) {
    col = mix(vec3(0.225, 0.030, 0.021), vec3(0.050, 0.0085, 0.006), smoothstep(0.03, 0.62, th));
  } else if (uKind < 1.5) {
    vec3 clot = mix(vec3(0.150, 0.022, 0.015), vec3(0.034, 0.0065, 0.0045), smoothstep(0.03, 0.62, th));
    vec3 gel = mix(vec3(0.930, 0.905, 0.815), vec3(0.745, 0.705, 0.575), th);
    vec3 ser = creamL * beer(vec3(0.19, 0.52, 1.62), 0.34 + 0.95 * th);
    float e = 0.022;
    col = mix(clot, gel, smoothstep(uClot - e, uClot + e, y));
    col = mix(col, ser, smoothstep(uGel - e, uGel + e, y));
    col += vec3(0.22, 0.20, 0.14) * (1.0 - smoothstep(0.0, 0.045, abs(y - uGel))) * (1.0 - top);
  } else if (uKind > 2.5) {
    // spun plasma: packed red cells, a thin buffy coat, straw plasma above (clearer than serum, no gel)
    vec3 cells = mix(vec3(0.150, 0.022, 0.015), vec3(0.034, 0.0065, 0.0045), smoothstep(0.03, 0.62, th));
    vec3 buffy = mix(vec3(0.840, 0.790, 0.670), vec3(0.640, 0.600, 0.500), th);
    vec3 pla = creamL * beer(vec3(0.15, 0.42, 1.30), 0.32 + 0.9 * th);
    float e = 0.02;
    col = mix(cells, buffy, smoothstep(uClot - e, uClot + e, y));
    col = mix(col, pla, smoothstep(uGel - e, uGel + e, y));
  } else {
    col = creamL * beer(vec3(0.12, 0.33, 1.08), 0.30 + 0.95 * th);
  }
  col *= mix(0.70, 1.12, wrap);
  float men = smoothstep(uFill - 0.10, uFill - 0.004, vLP.y) * (1.0 - top);
  col = mix(col, col * 1.5 + vec3(0.05, 0.045, 0.04), men * 0.55);
  col = mix(col, col * 1.12 + vec3(0.035, 0.03, 0.025), top);
  vec3 glowC = uKind < 0.5 ? vec3(0.06, 0.008, 0.005) : vec3(0.24, 0.15, 0.035);
  float gm = (uKind > 0.5 && uKind < 1.5) || uKind > 2.5 ? smoothstep(uGel, uGel + 0.12, y) : 1.0;
  col += glowC * uGlow * gm * (0.35 + 0.65 * th);
  vec3 d = linearToOutputTexel(vec4(col * 0.97, 1.0)).rgb;
  d = mix(d, uHaze, uDim * 0.55);
  gl_FragColor = vec4(d * uOp, uOp);
}`;

  /* ------------------------------------------------------- canvas helpers */
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function spaced(g, text, x, y, track) {
    let cx = x; for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + track; } return cx - track;
  }
  function spacedW(g, text, track) { let w = 0; for (const ch of text) w += g.measureText(ch).width + track; return w - track; }
  // Optimal mark: seven dots on an open ring, heaviest at nine o'clock.
  function mark(g, x, y, R, col) {
    g.fillStyle = col;
    [[180, .47], [238, .39], [124, .41], [-69, .30], [69, .31], [-20, .24], [20, .24]].forEach(([a, r]) => {
      g.beginPath(); g.arc(x + Math.cos(a * DEG) * R, y + Math.sin(a * DEG) * R, R * r, 0, Math.PI * 2); g.fill();
    });
  }
  function wordmark(g, x, y, h, col) {           // (x, baseline y), h = cap height in px
    const R = h * 0.36; mark(g, x + R * 1.5, y - h * 0.5, R, col);
    g.font = `400 ${Math.round(h * 1.42)}px Castoro, Georgia, serif`; g.fillStyle = col; g.textBaseline = 'alphabetic';
    g.fillText('Optimal', x + R * 3.35, y); return x + R * 3.35 + g.measureText('Optimal').width;
  }
  function paper(g, w, h, seed) {
    g.fillStyle = '#FFF9EE'; g.fillRect(0, 0, w, h);
    const r = rng(seed); for (let i = 0; i < w * h / 700; i++) { g.fillStyle = `rgba(110,98,78,${0.02 + r() * 0.03})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
  }
  function tiles(g, c, x, y, tw, th, gap) {
    c.states.forEach((s, i) => { g.fillStyle = TILE[s]; g.fillRect(x + i * (tw + gap), y, tw, th); });
    return x + c.states.length * (tw + gap) - gap;
  }
  // Tube label. Canvas x runs up the tube (text reads bottom → top, like a real
  // tube label); canvas y runs around it from azimuth A0 (top) to A1 (bottom).
  const LA0 = -150, LA1 = 20;
  function drawTubeLabel(canvas, c, date) {
    const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, yA = a => (a - LA0) / (LA1 - LA0) * H;
    paper(g, W, H, hash(c.id));
    const r = rng(hash(c.id + 'bar'));
    g.fillStyle = '#2B2B28';
    for (let x = 150; x < 760;) { const w = 2 + ((r() * 4) | 0) * 2; g.fillRect(x, yA(-138), w, yA(-100) - yA(-138)); x += w + 3 + ((r() * 4) | 0) * 2; }
    g.font = '500 18px Inter, Arial, sans-serif'; g.fillStyle = '#76736D'; g.textBaseline = 'alphabetic';
    spaced(g, 'ALA  ·  ' + (date || ''), 150, yA(-90), 2.4);
    g.fillStyle = '#2C4E25'; g.fillRect(36, yA(-81), W - 72, 3); g.fillRect(36, yA(12.5), W - 72, 2);
    // row A: wordmark + sample code
    const wx = wordmark(g, 56, yA(-55), 31, '#2C4E25');
    g.font = '600 25px Inter, Arial, sans-serif'; g.fillStyle = '#2C4E25';
    spaced(g, c.code, Math.max(wx + 60, 400), yA(-56.5), 3);
    // row B: the count, big, and the collection date
    g.font = '400 150px Castoro, Georgia, serif'; g.fillStyle = '#252525';
    const nx = 52, nw = g.measureText(String(c.n)).width; g.fillText(String(c.n), nx, yA(-8.5));
    g.font = '500 33px Inter, Arial, sans-serif'; g.fillStyle = '#474747'; g.fillText(c.n === 1 ? 'marker' : 'markers', nx + nw + 16, yA(-10.5));
    g.font = '500 22px Inter, Arial, sans-serif'; g.fillStyle = '#76736D'; g.textAlign = 'right';
    g.fillText(date || '', W - 56, yA(-10.5)); g.textAlign = 'left';
    // row C: one tile per marker, in state order
    tiles(g, c, 60, yA(-3.2), 15, yA(6.4) - yA(-3.2), 5);
    const sh = g.createLinearGradient(0, H - 7, 0, H); sh.addColorStop(0, 'rgba(90,80,62,0)'); sh.addColorStop(1, 'rgba(90,80,62,.22)'); g.fillStyle = sh; g.fillRect(0, H - 7, W, 7);
    const sx = g.createLinearGradient(0, 0, 8, 0); sx.addColorStop(0, 'rgba(90,80,62,.18)'); sx.addColorStop(1, 'rgba(90,80,62,0)'); g.fillStyle = sx; g.fillRect(0, 0, 8, H);
  }
  function drawCupLabel(canvas, c, date) {
    const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    paper(g, W, H, hash(c.id));
    g.fillStyle = '#2C4E25'; g.fillRect(34, 34, W - 68, 4); g.fillRect(34, H - 40, W - 68, 2);
    wordmark(g, 36, 104, 34, '#2C4E25');
    g.font = '600 25px Inter, Arial, sans-serif'; g.fillStyle = '#2C4E25'; spaced(g, c.code, 40, 170, 3.2);
    g.font = '400 150px Castoro, Georgia, serif'; g.fillStyle = '#252525'; const nw = g.measureText(String(c.n)).width; g.fillText(String(c.n), 34, 318);
    g.font = '500 34px Inter, Arial, sans-serif'; g.fillStyle = '#474747'; g.fillText(c.n === 1 ? 'marker' : 'markers', 34 + nw + 16, 314);
    tiles(g, c, 40, 350, 22, 40, 7);
    g.font = '500 21px Inter, Arial, sans-serif'; g.fillStyle = '#76736D'; spaced(g, 'ALA · ' + (date || ''), 40, 440, 2.2);
    const r = rng(hash(c.id + 'bar')); g.fillStyle = '#2B2B28';
    for (let x = 300; x < W - 40;) { const w = 2 + ((r() * 3) | 0) * 2; g.fillRect(x, 400, w, 52); x += w + 3 + ((r() * 3) | 0) * 2; }
  }
  function drawGrads(canvas) {                    // printed graduations for the cup
    const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height; g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(92,88,80,.78)'; g.font = '500 22px Inter, Arial, sans-serif'; g.textBaseline = 'middle';
    for (let i = 0; i <= 12; i++) { const y = H - 20 - i * ((H - 40) / 12); const big = i % 2 === 0; g.fillRect(24, y - 1, big ? 60 : 34, 2); if (big && i) g.fillText(String(i * 10), 96, y); }
    g.fillText('mL', 96, 20);
  }
  // Pale oak, straight grain: smooth 1-D value noise warped along x, plus pores and ray flecks.
  function oak(w, h, seed, opts) {
    const c = cv(w, h), g = c.getContext('2d'), r = rng(seed);
    const n = 512, tab = Array.from({ length: n }, r), nz = x => { const i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f); return lerp(tab[((i % n) + n) % n], tab[(((i + 1) % n) + n) % n], t); };
    const img = g.createImageData(w, h), d = img.data, ph = r() * 50;
    const L = [226, 209, 176], M = [211, 188, 147], D = [186, 157, 112];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const gy = y + 5 * Math.sin(x * 0.0042 + ph) + 2.2 * Math.sin(x * 0.013 + y * 0.02);
      let v = nz(gy * 0.045) * 0.55 + nz(gy * 0.16 + 40) * 0.3 + nz(gy * 0.6 + 90) * 0.15;
      v = v * 0.85 + nz(x * 0.004 + gy * 0.01 + 200) * 0.15;
      const t = Math.pow(v, 1.3), a = t < 0.5 ? L : M, b = t < 0.5 ? M : D, k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const i = (y * w + x) * 4; d[i] = a[0] + (b[0] - a[0]) * k; d[i + 1] = a[1] + (b[1] - a[1]) * k; d[i + 2] = a[2] + (b[2] - a[2]) * k; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < w * h / 260; i++) { g.fillStyle = `rgba(120,92,56,${0.06 + r() * 0.12})`; g.fillRect(r() * w, r() * h, 2 + r() * 7, 1); }         // pores
    for (let i = 0; i < w * h / 2600; i++) { g.fillStyle = `rgba(246,234,210,${0.18 + r() * 0.2})`; g.fillRect(r() * w, r() * h, 4 + r() * 14, 1 + r() * 1.2); } // ray flecks
    if (opts && opts.draw) opts.draw(g, w, h);
    return c;
  }
  function soft(w, h, draws) {                    // blurred shapes via the shadow trick
    const c = cv(w, h), g = c.getContext('2d'), OFF = 10000;
    draws.forEach(d => {
      g.save(); g.shadowColor = d.color; g.shadowBlur = d.blur; g.shadowOffsetX = OFF; g.fillStyle = '#000';
      g.translate(-OFF, 0); g.beginPath(); d.path(g); g.fill(); g.restore();
    });
    return c;
  }
  const rr = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

  /* ------------------------------------------------------------ fallback */
  // A hand-built still of the beat 3 composition (36 px per cm, 10° camera).
  // It is the no-WebGL fallback and the loading poster, so it tracks the 3D layout.
  let svgN = 0;
  function svg(o) {
    const items = (o.containers || []).map(norm), tubes = items.filter(c => !c.isCup).slice(0, 3), cup = items.find(c => c.isCup);
    const u = 'vl' + (++svgN), G = 468, Y = h => +(G - h * 35.5).toFixed(1), RC = 222, f = n => +n.toFixed(1);
    const X = tubes.map((_, i) => RC + (i - (tubes.length - 1) / 2) * 108);
    const mk = (x, y, R, col) => [[180, .47], [238, .39], [124, .41], [-69, .30], [69, .31], [-20, .24], [20, .24]]
      .map(([a, r]) => `<circle cx="${f(x + Math.cos(a * DEG) * R)}" cy="${f(y + Math.sin(a * DEG) * R)}" r="${f(R * r)}"/>`).join('').replace(/^/, `<g fill="${col}">`) + '</g>';
    let s = `<svg viewBox="0 0 640 540" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>
<linearGradient id="${u}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3D2B2"/><stop offset=".6" stop-color="#D8C19B"/><stop offset="1" stop-color="#C7AD85"/></linearGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCC8A6"/><stop offset="1" stop-color="#EBDEC3"/></linearGradient>
<linearGradient id="${u}g" x1="0" x2="1"><stop offset="0" stop-color="#5E584C" stop-opacity=".42"/><stop offset=".07" stop-color="#fff" stop-opacity=".05"/><stop offset=".2" stop-color="#fff" stop-opacity=".72"/><stop offset=".3" stop-color="#fff" stop-opacity=".04"/><stop offset=".8" stop-color="#fff" stop-opacity=".04"/><stop offset=".86" stop-color="#F4F8EF" stop-opacity=".6"/><stop offset=".93" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#5E584C" stop-opacity=".45"/></linearGradient>
<linearGradient id="${u}b" x1="0" x2="1"><stop offset="0" stop-color="#8A3026"/><stop offset=".22" stop-color="#521611"/><stop offset=".7" stop-color="#3B0E0B"/><stop offset="1" stop-color="#6E2219"/></linearGradient>
<linearGradient id="${u}s" x1="0" x2="1"><stop offset="0" stop-color="#F4DE9E"/><stop offset=".45" stop-color="#E6C06A"/><stop offset="1" stop-color="#EFD28A"/></linearGradient>
<linearGradient id="${u}u" x1="0" x2="1"><stop offset="0" stop-color="#F6E7B4"/><stop offset=".5" stop-color="#EDD27F"/><stop offset="1" stop-color="#F3DEA0"/></linearGradient>
<linearGradient id="${u}p" x1="0" x2="1"><stop offset="0" stop-color="#D9D3C6"/><stop offset=".25" stop-color="#FBF8F1"/><stop offset="1" stop-color="#F3EFE6"/></linearGradient>
<linearGradient id="${u}c" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".22" stop-color="#fff" stop-opacity=".30"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<radialGradient id="${u}h"><stop offset="0" stop-color="#3E3A2C" stop-opacity=".34"/><stop offset=".6" stop-color="#3E3A2C" stop-opacity=".12"/><stop offset="1" stop-color="#3E3A2C" stop-opacity="0"/></radialGradient>
<radialGradient id="${u}a"><stop offset="0" stop-color="#E8B84E" stop-opacity=".45"/><stop offset="1" stop-color="#E8B84E" stop-opacity="0"/></radialGradient>
<pattern id="${u}r" width="4.4" height="8" patternUnits="userSpaceOnUse"><rect width="2" height="8" fill="#000" fill-opacity=".11"/><rect x="2" width="1" height="8" fill="#fff" fill-opacity=".18"/></pattern></defs>
<ellipse cx="${RC + 18}" cy="${G + 1}" rx="215" ry="17" fill="url(#${u}h)"/>`;
    if (cup) {
      const cx = RC + 248, gb = G - 19, top = Y(7) - 19, lid0 = Y(6.5) - 19, lid1 = Y(7.85) - 19, lq = Y(c_fill()) - 19;
      function c_fill() { return cup.k.fill; }
      const hw = y => f(98 + (gb - y) / (gb - top) * 10);
      s += `<ellipse cx="${cx + 20}" cy="${gb - 2}" rx="128" ry="15" fill="url(#${u}h)"/><ellipse cx="${cx + 36}" cy="${gb - 8}" rx="54" ry="9" fill="url(#${u}a)"/>
<path d="M${cx - hw(lid0)} ${lid0} L${cx + hw(lid0)} ${lid0} L${cx + 98} ${gb - 8} Q${cx + 97} ${gb} ${cx + 88} ${gb} L${cx - 88} ${gb} Q${cx - 97} ${gb} ${cx - 98} ${gb - 8} Z" fill="#F7F4EE" fill-opacity=".55" stroke="#7D766A" stroke-opacity=".35"/>
<path d="M${cx - hw(lq) + 4} ${lq} L${cx + hw(lq) - 4} ${lq} L${cx + 94} ${gb - 10} Q${cx + 93} ${gb - 4} ${cx + 85} ${gb - 4} L${cx - 85} ${gb - 4} Q${cx - 93} ${gb - 4} ${cx - 94} ${gb - 10} Z" fill="url(#${u}u)"/>
<ellipse cx="${cx}" cy="${lq}" rx="${hw(lq) - 4}" ry="7" fill="#F8EBC2"/>
<rect x="${cx - 98}" y="${lid0}" width="196" height="${gb - lid0}" fill="url(#${u}g)" opacity=".7"/>
<g fill="#5C5850" fill-opacity=".7">${Array.from({ length: 11 }, (_, i) => `<rect x="${cx + 70}" y="${f(gb - 26 - i * 17)}" width="${i % 2 ? 7 : 13}" height="1.5"/>`).join('')}</g>
<rect x="${cx - 58}" y="${Y(4.6) - 19}" width="118" height="${f((4.6 - 1.25) * 35.5)}" fill="url(#${u}p)"/>
<rect x="${cx - 50}" y="${Y(4.6) - 11}" width="102" height="1.6" fill="#2C4E25"/>${mk(cx - 44, Y(4.6) + 2, 3.6, '#2C4E25')}
<text x="${cx - 36}" y="${Y(4.6) + 6}" font-family="Castoro,Georgia,serif" font-size="11" fill="#2C4E25">Optimal</text>
<text x="${cx - 49}" y="${Y(4.6) + 22}" font-family="Inter,Arial,sans-serif" font-size="6" font-weight="600" letter-spacing="1" fill="#2C4E25">${esc(cup.code)}</text>
<text x="${cx - 50}" y="${Y(4.6) + 58}" font-family="Castoro,Georgia,serif" font-size="38" fill="#252525">${cup.n}</text>
<text x="${cx - 26}" y="${Y(4.6) + 56}" font-family="Inter,Arial,sans-serif" font-size="8" font-weight="500" fill="#474747">${cup.n === 1 ? 'marker' : 'markers'}</text>
${cup.states.map((st, i) => `<rect x="${cx - 48 + i * 7}" y="${Y(4.6) + 64}" width="5" height="9" fill="${TILE[st]}"/>`).join('')}
<path d="M${cx - 114} ${lid1 + 6} Q${cx - 114} ${lid1} ${cx - 106} ${lid1} L${cx + 106} ${lid1} Q${cx + 114} ${lid1} ${cx + 114} ${lid1 + 6} L${cx + 114} ${lid0} L${cx - 114} ${lid0} Z" fill="#E9E2D3"/>
<rect x="${cx - 114}" y="${lid1 + 6}" width="228" height="${lid0 - lid1 - 8}" fill="url(#${u}r)"/><rect x="${cx - 114}" y="${lid1}" width="228" height="${lid0 - lid1}" fill="url(#${u}c)"/>
<ellipse cx="${cx}" cy="${lid1 + 1}" rx="110" ry="6" fill="#F4EFE6"/>`;
    }
    s += `<rect x="41" y="350" width="362" height="26" rx="9" fill="url(#${u}t)"/>`;
    s += X.map(x => `<ellipse cx="${x}" cy="360" rx="27" ry="5.5" fill="#6B5537" fill-opacity=".28"/><ellipse cx="${x}" cy="360" rx="24.5" ry="4" fill="#2A1F14"/>`).join('');
    tubes.forEach((c, i) => {
      const x = X[i], t = 23, lqTop = Y(c.k.fill + BASE_H), lbl0 = Y(7.0), lbl1 = Y(3.1), sst = c.k.liquid === 1, pla = c.k.liquid === 3;
      const lw = 34, n = c.states.length, th = Math.min(4, (lbl1 - lbl0 - 16) / Math.max(1, n) - 1);
      s += `<g><rect x="${x - t + 2}" y="${lqTop}" width="${2 * t - 4}" height="${360 - lqTop}" fill="url(#${u}${sst || pla ? 's' : 'b'})"/>
${pla ? `<rect x="${x - t + 2}" y="${Y(3.74)}" width="${2 * t - 4}" height="${f(Y(3.65) - Y(3.74))}" fill="#ECE5D4"/><rect x="${x - t + 2}" y="${Y(3.65)}" width="${2 * t - 4}" height="${f(360 - Y(3.65))}" fill="url(#${u}b)"/>` : ''}
${sst ? `<rect x="${x - t + 2}" y="${Y(4.15)}" width="${2 * t - 4}" height="${f(Y(3.35) - Y(4.15))}" fill="#E8E1CC"/><rect x="${x - t + 2}" y="${Y(3.35)}" width="${2 * t - 4}" height="${f(360 - Y(3.35))}" fill="url(#${u}b)"/>` : ''}
<rect x="${x - t + 2}" y="${lqTop - 1}" width="${2 * t - 4}" height="3" fill="#fff" fill-opacity="${sst || pla ? .55 : .25}"/>
<rect x="${x - t + 3}" y="${Y(9.25) + 2}" width="${2 * t - 6}" height="${f(Y(8.55) - Y(9.25))}" fill="#6F685F"/><rect x="${x - t + 3}" y="${f(Y(8.55) - 3)}" width="${2 * t - 6}" height="3" fill="#4E4943"/>
<path d="M${x - t} ${Y(9.25)} V360 H${x + t} V${Y(9.25)}" fill="#fff" fill-opacity=".14"/><rect x="${x - t}" y="${Y(9.25)}" width="${2 * t}" height="${f(360 - Y(9.25))}" fill="url(#${u}g)"/>
<rect x="${x - t + 1}" y="${lbl0}" width="${lw}" height="${f(lbl1 - lbl0)}" fill="url(#${u}p)"/><rect x="${x - t + 4}" y="${lbl0 + 4}" width="1.3" height="${f(lbl1 - lbl0 - 8)}" fill="#2C4E25"/>
<text transform="translate(${x - t + 11} ${f(lbl1 - 7)}) rotate(-90)" font-family="Inter,Arial,sans-serif" font-size="5.4" font-weight="600" letter-spacing=".8" fill="#2C4E25">${esc(c.code)}</text>
<text transform="translate(${x - t + 28} ${f(lbl1 - 7)}) rotate(-90)" font-family="Castoro,Georgia,serif" font-size="19" fill="#252525">${c.n}</text>
${c.states.map((st, j) => `<rect x="${x - t + 30.5}" y="${f(lbl1 - 7 - (j + 1) * (th + 1))}" width="3" height="${f(th)}" fill="${TILE[st]}"/>`).join('')}
<rect x="${x - 29}" y="${Y(9.25) - 16}" width="58" height="16" rx="2" fill="${c.k.hex}"/><rect x="${x - 28}" y="${Y(11.55)}" width="56" height="${f(Y(9.25) - Y(11.55) - 12)}" rx="7" fill="${c.k.hex}"/>
<rect x="${x - 28}" y="${Y(11.55) + 8}" width="56" height="${f(Y(9.25) - Y(11.55) - 26)}" fill="url(#${u}r)"/><rect x="${x - 29}" y="${Y(11.55)}" width="58" height="${f(Y(9.25) - Y(11.55))}" rx="6" fill="url(#${u}c)"/>
<ellipse cx="${x}" cy="${Y(11.55) + 2}" rx="24" ry="4" fill="#fff" fill-opacity=".22"/><path d="M${x - 24.5} 360 A24.5 4 0 0 0 ${x + 24.5} 360" fill="none" stroke="#F6EAD2" stroke-opacity=".8" stroke-width="1.5"/></g>`;
    });
    s += `<rect x="35" y="369" width="374" height="99" rx="10" fill="url(#${u}o)"/><rect x="35" y="369" width="374" height="99" rx="10" fill="none" stroke="#9C7F57" stroke-opacity=".25"/>
<g stroke="#9E8058" stroke-opacity=".16" fill="none">${[384, 391, 402, 417, 430, 446, 455].map((y, i) => `<path d="M40 ${y} C140 ${y + (i % 2 ? 3 : -3)} 300 ${y + (i % 2 ? -2 : 2)} 404 ${y}"/>`).join('')}</g>
<path d="M45 370 H399" stroke="#FFF6E4" stroke-opacity=".6"/>
${mk(RC - 30, 423, 3.4, '#8E7148')}<text x="${RC - 22}" y="427" font-family="Castoro,Georgia,serif" font-size="13" fill="#8E7148">Optimal</text></svg>`;
    return s.replace(/\n/g, '');
  }
  const BASE_H = 0.35;

  /* --------------------------------------------------------------- mount */
  function mount(el, o) {
    const T = o.THREE || window.THREE;
    const items = (o.containers || []).map(norm);
    const mode = o.mode === 'compact' ? 'compact' : 'story';
    const reduced = !!o.reducedMotion;
    const useCallout = o.callout != null ? !!o.callout : mode === 'story';
    injectStyle();
    el.classList.add('vl');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.innerHTML = `<div class="vl-poster">${svg(o)}</div><canvas class="vl-canvas" aria-hidden="true"></canvas>` +
      (useCallout ? '<svg class="vl-lead" aria-hidden="true"><path/><circle r="2.5"/></svg><div class="vl-co" aria-hidden="true"><div class="vl-co-in"></div></div>' : '');
    if (!el.hasAttribute('aria-label')) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', ariaLabel(items, o.total)); }
    const canvas = el.querySelector('canvas');
    const inert = reason => {
      el.classList.add('vl-fallback'); el.classList.remove('vl-live');
      if (o.onFallback) o.onFallback(reason);
      return { fallback: true, setProgress() {}, setFocus() {}, getAnchor() { return null; }, resize() {}, render() {},
        destroy() { el.innerHTML = ''; el.classList.remove('vl', 'vl-fallback', 'vl-live', 'vl-on'); } };
    };
    if (!T || !T.WebGLRenderer) return inert('three');
    // Create the context ourselves so a machine without WebGL falls back quietly (three logs an error otherwise).
    const attrs = { alpha: true, antialias: true, premultipliedAlpha: true, depth: true, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    let gl = null;
    try { gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs); } catch (e) { gl = null; }
    if (!gl) return inert('webgl');
    try { return build(T, el, canvas, gl, items, o, mode, reduced, useCallout, inert); } catch (e) {
      if (window.console) console.warn('vials3d: falling back to SVG', e && e.message);
      return inert(/context/i.test(e && e.message) ? 'webgl' : 'error');
    }
  }

  function build(T, el, canvas, gl, items, o, mode, reduced, useCallout, inert) {
    const disposables = [];
    const keep = x => (disposables.push(x), x);
    const renderer = new T.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true, premultipliedAlpha: true, stencil: false, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = o.exposure || 1.1;
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(22, 1, 1, 500);
    const FOV_T = Math.tan(11 * DEG);
    const lin = hex => new T.Color(hex).convertSRGBToLinear();
    const date = o.date || '';

    // ---- environment (PMREM of the analytic studio) + three lights that agree with it
    const envScene = new T.Scene();
    const envGeo = new T.SphereGeometry(100, 64, 32), envMat = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vWP; void main(){ vWP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: GLSL_ENV + FS_ENV });
    envScene.add(new T.Mesh(envGeo, envMat));
    const pm = new T.PMREMGenerator(renderer);
    const envRT = keep(pm.fromScene(envScene, 0, 0.1, 300));
    pm.dispose(); envGeo.dispose(); envMat.dispose();
    scene.environment = envRT.texture;
    const key = new T.DirectionalLight(0xfff1de, 1.05); key.position.set(-8, 7.5, 5);
    const rim = new T.DirectionalLight(0xf2f7ec, 0.5); rim.position.set(3, 5, -8);
    const hemi = new T.HemisphereLight(0xf4f1e8, 0xdce5d6, 0.28);
    scene.add(key, rim, hemi);

    const haze = new T.Vector3(1.0, 0.988, 0.969);
    const U = () => ({ uDim: { value: 0 }, uOp: { value: 1 }, uGlow: { value: 0 }, uHaze: { value: haze }, uRim: { value: 0 } });
    function patch(mat, u) {
      if (mat.envMapIntensity != null) mat.envMapIntensity = mat.userData.env || 0.5;
      mat.onBeforeCompile = sh => {
        sh.uniforms.uDim = u.uDim; sh.uniforms.uOp = u.uOp; sh.uniforms.uHaze = u.uHaze;
        sh.fragmentShader = 'uniform float uDim; uniform float uOp; uniform vec3 uHaze;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
          '#include <dithering_fragment>\n\tgl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, uDim);\n\tgl_FragColor.a *= uOp;');
      };
      mat.customProgramCacheKey = () => 'vl-patch';
      return keep(mat);
    }
    const glass = (u, side, base, frost, frostY) => keep(new T.ShaderMaterial({
      uniforms: { uDim: u.uDim, uOp: u.uOp, uHaze: u.uHaze, uRim: u.uRim, uBase: { value: base }, uFrost: { value: frost || 0 }, uFrostY: { value: frostY || 0 }, uBack: { value: side === T.BackSide ? 1 : 0 } },
      vertexShader: VS_WORLD, fragmentShader: GLSL_ENV + FS_GLASS, side, transparent: true, depthWrite: false, premultipliedAlpha: true, userData: { vlT: 1 } }));
    const liquid = (u, kind, fill, clot, gel, tilt) => keep(new T.ShaderMaterial({
      uniforms: { uDim: u.uDim, uOp: u.uOp, uHaze: u.uHaze, uGlow: u.uGlow, uFill: { value: fill }, uClot: { value: clot || 0 }, uGel: { value: gel || 0 }, uTilt: { value: tilt || 0 }, uKind: { value: kind } },
      vertexShader: VS_WORLD, fragmentShader: GLSL_ENV + FS_LIQ, side: T.DoubleSide, premultipliedAlpha: true }));
    const tex = (c, srgb) => { const t = keep(new T.CanvasTexture(c)); if (srgb !== false) t.encoding = T.sRGBEncoding; t.anisotropy = aniso; return t; };

    // ---- geometry helpers
    function lathe(pts, seg, ribs) {
      const g = keep(new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg));
      if (ribs) {
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z); if (r < 1e-4) continue;
          const w = ss(ribs.y0, ribs.y0 + 0.08, y) * (1 - ss(ribs.y1 - 0.08, ribs.y1, y)); if (!w) continue;
          const th = Math.atan2(x, z), rib = Math.pow(0.5 + 0.5 * Math.cos(th * ribs.n), 3);
          const k = (r + ribs.amp * rib * w) / r; pos.setX(i, x * k); pos.setZ(i, z * k);
        }
        g.computeVertexNormals();
        const nor = g.attributes.normal, np = pts.length;           // weld the seam normals
        for (let j = 0; j < np; j++) {
          const a = j, b = seg * np + j;
          const nx = nor.getX(a) + nor.getX(b), ny = nor.getY(a) + nor.getY(b), nz = nor.getZ(a) + nor.getZ(b), l = Math.hypot(nx, ny, nz) || 1;
          nor.setXYZ(a, nx / l, ny / l, nz / l); nor.setXYZ(b, nx / l, ny / l, nz / l);
        }
      }
      return g;
    }
    const arcPts = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * DEG; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

    // ---- layout (cm; y up; the camera looks down −z)
    const tubes = items.filter(c => !c.isCup), cupC = items.find(c => c.isCup);
    const SP = 3.0, RW = Math.max(1, tubes.length) * SP + 1.4, RH = 2.8, RD = 3.0, RB = 0.14;
    const RCX = -2.0, BASE = 0.35;                 // rack centre x; tube tip rests 0.35 above the ground
    const CUP = { x: 4.9, z: -3.0 };
    const PIV = new T.Vector3(cupC ? 0.45 : RCX, 0, cupC ? -1.2 : 0);
    const world = new T.Group(); world.position.copy(PIV); scene.add(world);
    const at = (obj, x, y, z) => { obj.position.set(x - PIV.x, y, z - PIV.z); world.add(obj); return obj; };

    // ---- rack: a pale-oak block with three bored holes and an engraved mark
    const rackU = U();
    {
      const w = RW - 2 * RB, h = RH - 2 * RB, cr = 0.42;
      const sh = new T.Shape(); const x0 = -w / 2, y0 = RB;
      sh.moveTo(x0 + cr, y0); sh.lineTo(x0 + w - cr, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + cr); sh.lineTo(x0 + w, y0 + h - cr);
      sh.quadraticCurveTo(x0 + w, y0 + h, x0 + w - cr, y0 + h); sh.lineTo(x0 + cr, y0 + h); sh.quadraticCurveTo(x0, y0 + h, x0, y0 + h - cr);
      sh.lineTo(x0, y0 + cr); sh.quadraticCurveTo(x0, y0, x0 + cr, y0);
      const geo = keep(new T.ExtrudeGeometry(sh, { depth: RD - 2 * RB, bevelEnabled: true, bevelThickness: RB, bevelSize: RB, bevelSegments: 5, curveSegments: 10 }));
      geo.translate(0, 0, -(RD - 2 * RB) / 2);
      const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;   // box-map UVs (cm → 0..1)
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
        if (az >= ax && az >= ay) uv.setXY(i, (x + RW / 2) / RW, y / RH);
        else if (ay >= ax) uv.setXY(i, (x + RW / 2) / RW, 1 - (z + RD / 2) / RD);
        else uv.setXY(i, 0.012 + (z + RD / 2) / RD * 0.06, y / RH);
      }
      const holesX = tubes.map((_, i) => (i - (tubes.length - 1) / 2) * SP);
      const topC = oak(1024, 256, 7, { draw(g, W, H) {
        holesX.forEach(hx => {
          const cx = (hx + RW / 2) / RW * W, cy = H / 2, sx = W / RW, sy = H / RD;
          g.save(); g.translate(cx, cy); g.scale(sx, sy);
          let gr = g.createRadialGradient(0, 0, 0.5, 0, 0, 1.25); gr.addColorStop(0, 'rgba(60,44,26,.55)'); gr.addColorStop(0.62, 'rgba(60,44,26,.22)'); gr.addColorStop(1, 'rgba(60,44,26,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1.25, 0, 7); g.fill();
          g.fillStyle = '#2A1F14'; g.beginPath(); g.arc(0, 0, 0.745, 0, 7); g.fill();
          g.strokeStyle = 'rgba(250,236,208,.55)'; g.lineWidth = 0.035; g.beginPath(); g.arc(0, 0.02, 0.765, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
          g.restore();
        });
      } });
      const frontC = oak(1024, 256, 11, { draw(g, W, H) {
        const ao = g.createLinearGradient(0, 0, 0, H); ao.addColorStop(0, 'rgba(255,248,232,.10)'); ao.addColorStop(0.55, 'rgba(120,96,64,0)'); ao.addColorStop(1, 'rgba(96,74,46,.16)');
        g.fillStyle = ao; g.fillRect(0, 0, W, H);
        const x = W / 2 - 92, y = H * 0.62;
        g.save(); g.globalAlpha = 0.9; wordmark(g, x, y + 1.5, 26, 'rgba(255,246,228,.55)'); g.restore();
        wordmark(g, x, y, 26, 'rgba(118,92,58,.82)');
      } });
      const topT = tex(topC), frontT = tex(frontC), bumpT = tex(topC, false);
      const mTop = patch(new T.MeshStandardMaterial({ map: topT, bumpMap: bumpT, bumpScale: 0.012, roughness: 0.6, metalness: 0 }), rackU);
      const mFront = patch(new T.MeshStandardMaterial({ map: frontT, bumpMap: tex(frontC, false), bumpScale: 0.012, roughness: 0.6, metalness: 0 }), rackU);
      const rack = new T.Mesh(geo, [mFront, mTop]);
      at(rack, RCX, 0, 0);
      const shC = soft(512, 256, [
        { color: 'rgba(62,58,44,.26)', blur: 44, path: g => rr(g, 256 - RW * 12.8 + 26, 128 - RD * 12.8 - 24, RW * 25.6, RD * 25.6 + 8, 20) },
        { color: 'rgba(62,58,44,.30)', blur: 22, path: g => rr(g, 256 - RW * 12.8 - 8, 128 - RD * 12.8 - 8, RW * 25.6 + 16, RD * 25.6 + 16, 16) },
        { color: 'rgba(62,58,44,.42)', blur: 7, path: g => rr(g, 256 - RW * 12.8 - 2, 128 - RD * 12.8 - 2, RW * 25.6 + 4, RD * 25.6 + 4, 12) },
        { color: 'rgba(46,40,30,.72)', blur: 3, path: g => rr(g, 256 - RW * 12.8 + 2, 128 - RD * 12.8 + 2, RW * 25.6 - 4, RD * 25.6 - 4, 8) },
      ]);
      const shM = keep(new T.MeshBasicMaterial({ map: tex(shC), transparent: true, depthWrite: false, toneMapped: false }));
      const shP = new T.Mesh(keep(new T.PlaneGeometry(20, 10)), shM); shP.rotation.x = -Math.PI / 2; shP.renderOrder = -2;
      at(shP, RCX, 0.012, 0);
    }

    // ---- items
    const I = [];
    const capProfile = [[0.40, -0.02], [0.60, -0.02], [0.78, 0.0], [0.815, 0.03], [0.832, 0.09], [0.832, 0.60], [0.826, 0.655], [0.798, 0.69], [0.796, 0.74],
      [0.796, 1.96], ...arcPts(0.716, 1.98, 0.08, 0, 90, 5).map(([x, y]) => [x, y + 0.0]), [0.62, 2.285], [0.34, 2.29], [0.30, 2.265], [0.0, 2.265]];
    const TUBE_R = 0.65, CAP_Y = 8.9;
    const tubeGlassPts = [...arcPts(0, TUBE_R, TUBE_R, -90, 0, 12), [TUBE_R, 10.0], [0.62, 10.06], [0.585, 10.06]];
    function liquidPts(top) { return [...arcPts(0, TUBE_R, 0.598, -90, 0, 12), [0.598, top]]; }

    tubes.forEach((c, k) => {
      const u = U(), holder = new T.Group(), lifter = new T.Group(), spinner = new T.Group(), body = new T.Group();
      holder.add(lifter); lifter.add(spinner); spinner.add(body); body.position.y = BASE - RH;
      const hx = RCX + (k - (tubes.length - 1) / 2) * SP; at(holder, hx, RH, 0);
      const kind = c.k.liquid, full = c.k.fill;
      const lq = kind === 3 ? liquid(u, 3, full, 3.3, 3.37, Math.tan(7 * DEG)) : liquid(u, kind, full, 3.0, 3.8, Math.tan(7 * DEG));
      body.add(new T.Mesh(lathe(liquidPts(full), 48), lq));
      const gB = new T.Mesh(lathe(tubeGlassPts, 64), glass(u, T.BackSide, 0.018)); gB.renderOrder = 3;
      const gF = new T.Mesh(gB.geometry, glass(u, T.FrontSide, 0.022)); gF.renderOrder = 4;
      body.add(gB, gF);
      const stopper = new T.Mesh(keep(new T.CylinderGeometry(0.598, 0.598, 1.0, 40)), patch(new T.MeshStandardMaterial({ color: lin('#6B645C'), roughness: 0.6 }), u));
      stopper.position.y = CAP_Y - 0.35; body.add(stopper);
      const capMat = patch(new T.MeshPhysicalMaterial({ color: lin(c.k.gl || c.k.hex), roughness: 0.44, metalness: 0, clearcoat: 0.28, clearcoatRoughness: 0.4 }), u);
      const cap = new T.Mesh(lathe(capProfile, 168, { n: 24, amp: 0.026, y0: 0.76, y1: 1.94 }), capMat); cap.position.y = CAP_Y; body.add(cap);
      // paper label (front print + plain back so the window never shows mirrored ink)
      const lab = cv(1024, 512); drawTubeLabel(lab, c, date);
      const labT = tex(lab);
      const L0 = 2.75, L1 = 6.65, lg = keep(new T.CylinderGeometry(0.664, 0.664, L1 - L0, 72, 1, true, LA0 * DEG, (LA1 - LA0) * DEG));
      { const uv = lg.attributes.uv; for (let i = 0; i < uv.count; i++) { const uu = uv.getX(i), vv = uv.getY(i); uv.setXY(i, vv, 1 - uu); } }
      const lf = new T.Mesh(lg, patch(new T.MeshStandardMaterial({ map: labT, roughness: 0.62, metalness: 0 }), u));
      const lb = new T.Mesh(lg, patch(new T.MeshStandardMaterial({ color: lin('#F6F0E4'), emissive: lin('#3A3630'), roughness: 0.8, side: T.BackSide }), u));
      lf.position.y = lb.position.y = (L0 + L1) / 2; body.add(lf, lb);
      I.push({ c, k, u, holder, lifter, spinner, body, liq: lq, full, cup: false, x: hx, z: 0, capTop: CAP_Y + 2.29, labelCanvas: lab, labelTex: labT,
        mats: [], order: items.indexOf(c) });
    });

    if (cupC) {
      const c = cupC, u = U(), holder = new T.Group(), lifter = new T.Group(), spinner = new T.Group();
      holder.add(lifter); lifter.add(spinner); at(holder, CUP.x, 0, CUP.z);
      const r0 = 2.72, r1 = 3.0, H = 7.0, rAt = y => r0 + (r1 - r0) * y / H;
      const cupPts = [[0, 0.0], [r0 - 0.22, 0.0], ...arcPts(r0 - 0.22, 0.22, 0.22, -90, 0, 6), [rAt(H), H], [rAt(H) - 0.02, H + 0.04]];
      const lqTop = c.k.fill;
      const liqPts = [[0, 0.3], [r0 - 0.36, 0.3], ...arcPts(r0 - 0.36, 0.44, 0.14, -90, 0, 4), [rAt(lqTop) - 0.08, lqTop]];
      const lq = liquid(u, 2, lqTop, 0, 0, 0);
      spinner.add(new T.Mesh(lathe(liqPts, 72), lq));
      const gB = new T.Mesh(lathe(cupPts, 96), glass(u, T.BackSide, 0.03, 0.10, 0.75)); gB.renderOrder = 1;
      const gF = new T.Mesh(gB.geometry, glass(u, T.FrontSide, 0.04, 0.16, 0.75)); gF.renderOrder = 2;
      spinner.add(gB, gF);
      const lidPts = [[2.98, 6.5], [3.12, 6.52], [3.165, 6.58], [3.17, 6.66], [3.17, 7.64], ...arcPts(3.05, 7.66, 0.12, 0, 90, 5), [2.6, 7.8], [1.4, 7.84], [0, 7.85]];
      const lid = new T.Mesh(lathe(lidPts, 216, { n: 36, amp: 0.034, y0: 6.7, y1: 7.6 }), patch(new T.MeshPhysicalMaterial({ color: lin('#F4ECDD'), roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.5, userData: { env: 0.38 } }), u));
      spinner.add(lid);
      const lab = cv(512, 512); drawCupLabel(lab, c, date); const labT = tex(lab);
      const ly0 = 1.25, ly1 = 4.6, span = 70;
      const lgeo = keep(new T.CylinderGeometry(rAt(ly1) + 0.018, rAt(ly0) + 0.018, ly1 - ly0, 48, 1, true, -span / 2 * DEG, span * DEG));
      const lf = new T.Mesh(lgeo, patch(new T.MeshStandardMaterial({ map: labT, roughness: 0.62 }), u)); lf.position.y = (ly0 + ly1) / 2; spinner.add(lf);
      const lb = new T.Mesh(lgeo, patch(new T.MeshStandardMaterial({ color: lin('#F6F0E4'), emissive: lin('#3A3630'), roughness: 0.8, side: T.BackSide }), u)); lb.position.y = lf.position.y; spinner.add(lb);
      const gc = cv(256, 512); drawGrads(gc);
      const gg = keep(new T.CylinderGeometry(rAt(6.3) + 0.012, rAt(0.7) + 0.012, 5.6, 24, 1, true, 44 * DEG, 30 * DEG));
      const gm = new T.Mesh(gg, keep(new T.MeshBasicMaterial({ map: tex(gc), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.85, userData: { vlT: 1 } })));
      gm.position.y = 3.5; gm.renderOrder = 2.5; spinner.add(gm);
      const ring = (r0, r1) => g => { g.arc(128, 128, r0, 0, Math.PI * 2); g.moveTo(128 + r1, 128); g.arc(128, 128, r1, Math.PI * 2, 0, true); };
      const shC = soft(256, 256, [                    // a clear cup: dark rim, light passes through the base
        { color: 'rgba(62,58,44,.24)', blur: 30, path: g => g.arc(128 + 22, 128 - 32, 64, 0, 7) },
        { color: 'rgba(62,58,44,.10)', blur: 8, path: g => g.arc(128, 128, 56, 0, 7) },
        { color: 'rgba(62,58,44,.34)', blur: 9, path: ring(63, 50) },
        { color: 'rgba(46,40,30,.55)', blur: 2.5, path: ring(58.5, 54.5) },
      ]);
      const shM = keep(new T.MeshBasicMaterial({ map: tex(shC), transparent: true, depthWrite: false, toneMapped: false, userData: { vlT: 1 } }));
      const shP = new T.Mesh(keep(new T.PlaneGeometry(12, 12)), shM); shP.rotation.x = -Math.PI / 2; shP.position.y = 0.012; shP.renderOrder = -1;
      const caC = soft(256, 256, [{ color: 'rgba(226,176,72,.50)', blur: 16, path: g => g.ellipse(128 + 26, 128 - 36, 34, 24, 0.5, 0, 7) },
        { color: 'rgba(255,236,176,.55)', blur: 6, path: g => g.ellipse(128 + 20, 128 - 26, 16, 10, 0.5, 0, 7) }]);
      const caM = keep(new T.MeshBasicMaterial({ map: tex(caC), transparent: true, depthWrite: false, toneMapped: false, userData: { vlT: 1 } }));
      const caP = new T.Mesh(shP.geometry, caM); caP.rotation.x = -Math.PI / 2; caP.position.y = 0.014; caP.renderOrder = -1;
      holder.add(shP, caP);
      I.push({ c, u, holder, lifter, spinner, liq: lq, full: lqTop, cup: true, x: CUP.x, z: CUP.z, capTop: 7.85, shadow: shM, caustic: caM, labelCanvas: lab, labelTex: labT,
        order: items.indexOf(c) });
    }
    I.sort((a, b) => a.order - b.order);
    I.forEach(it => { it.mats = []; it.holder.traverse(m => { if (m.material) it.mats.push(m.material); }); it.fm = 0; it.fmT = 0; });

    // ---- fonts: redraw the printed labels once Castoro + Inter are ready
    if (document.fonts && document.fonts.load) {
      Promise.all(['400 118px Castoro', '500 24px Inter', '600 24px Inter'].map(f => document.fonts.load(f).catch(() => null))).then(() => {
        if (dead) return;
        I.forEach(it => { (it.cup ? drawCupLabel : drawTubeLabel)(it.labelCanvas, it.c, date); it.labelTex.needsUpdate = true; });
        dirty();
      });
    }

    /* -------------------------------------------------------- choreography */
    const N = I.length, B2 = [0.35, 0.665];
    const fwin = i => [B2[0] + (B2[1] - B2[0]) * i / N, B2[0] + (B2[1] - B2[0]) * (i + 1) / N];
    let aspect = 1, D0 = 40, BX = 0, stageW = 800, stageH = 800, coSize = null;
    const ZOOM = Math.max(1, +o.zoom || 1);
    function fit() {
      const hw = (cupC ? 8.4 : RW / 2 + 1.6) + (mode === 'compact' ? 0.9 : 0), hh = mode === 'compact' ? 7.4 : 6.9;
      D0 = Math.max(hh / FOV_T, hw / (FOV_T * aspect) / ZOOM); // zoom never crops the set vertically; the bleed takes the width
      // bleed: when the zoomed set is wider than the view, keep the rack's left edge and let the cup run off the right
      BX = o.bleed ? Math.max(0, hw - D0 * FOV_T * aspect) : 0;
    }
    const v = new T.Vector3(), tgt = new T.Vector3();
    function pose(p, manual) {
      const story = mode === 'story' && !reduced;
      const q = reduced ? (mode === 'story' ? 1 : 0.5) : p;
      const h3 = story ? ss(0.67, 0.86, q) : 1;
      let yaw;
      if (story) yaw = lerp(lerp(-18, 8, ss(0, 0.36, q)), 0, h3);
      else yaw = lerp(-20, 20, q);
      world.rotation.y = yaw * DEG;
      let F = 0; const f = [];
      I.forEach((it, i) => {
        const [a, b] = fwin(i);
        const fs = story ? win(q, a, b, 0.016) : 0;
        f[i] = Math.max(fs, it.fm); F += f[i];
      });
      F = Math.min(1, F);
      let tk = 0;
      const fills = [];
      I.forEach((it, i) => {
        let op = 1, yo = 0, fill = 1, spin;
        const fan = it.cup ? 0 : (tk - 1) * 4 * DEG;
        if (story) {
          if (!it.cup) {
            const e = clamp01((q - (0.004 + 0.018 * tk)) / 0.06);
            op = ss(0, 0.5, e); yo = lerp(5.8, 0, emph(e));
            fill = ss(0.03 + 0.015 * tk, 0.1 + 0.015 * tk, q); // filled before the stage pins: the first frame is never empty
            spin = lerp(-Math.PI, 0.17, ss(0.02, 0.54, q)) + fan * h3;
          } else {
            fill = ss(0.05, 0.13, q);
            spin = lerp(-2.1, 0, ss(0.06, 0.56, q));
          }
        } else {
          spin = it.cup ? lerp(-0.6, 0.35, q) : lerp(-0.9, 0.6, q) + fan;
        }
        if (o.fillScroll) {
          const a0 = 0.20 + i * 0.17;
          fill = ss(a0, a0 + 0.26, q);
        }
        fills[i] = fill;
        if (!it.cup) tk++;
        const fi = f[i];
        spin += (it.cup ? 0.18 : 0.34) * fi;
        it.holder.position.y = (it.cup ? 0 : RH) + yo;
        it.lifter.position.y = (it.cup ? 0.9 : mode === 'story' ? 1.9 : 1.2) * fi - (it.cup ? 0 : 1.2 * clamp01(F - fi)); // the others settle into the rack
        it.lifter.rotation.x = (it.cup ? 3 : 8) * DEG * fi;
        it.spinner.rotation.y = spin;
        it.u.uOp.value = op;
        it.u.uDim.value = 0.42 * clamp01(F - fi);
        it.u.uGlow.value = fi;
        it.u.uRim.value = fi;
        it.liq.uniforms.uFill.value = lerp(it.cup ? 0.28 : 0.04, it.full, fill);
        it.holder.visible = op > 0.003;
        const tr = op < 0.999; it.mats.forEach(m => { if (!m.userData.vlT) m.transparent = tr; });
        if (it.shadow) { it.shadow.opacity = op * (1 - 0.3 * fi); it.caustic.opacity = op * fill * (1 - 0.3 * fi); }
        it.f = fi;
      });
      if (o.onFill) o.onFill(fills, I.map(it => it.c));
      scene.updateMatrixWorld();
      // camera: overview → hero, pulled toward the focused container
      const over = { x: PIV.x - BX, y: 5.3, z: PIV.z, el: 5.5, d: D0 * 1.03 };
      const hero = { x: PIV.x - BX, y: mode === 'story' ? 5.05 : 5.45, z: PIV.z, el: mode === 'story' ? 10.5 : 9, d: D0 };
      const cam = { x: lerp(over.x, hero.x, h3), y: lerp(over.y, hero.y, h3), z: lerp(over.z, hero.z, h3), el: lerp(over.el, hero.el, h3), d: lerp(over.d, hero.d, h3) };
      if (F > 0.001) {
        const fc = { x: 0, y: 0, z: 0, el: 0, d: 0 }; let wsum = 0;
        const pull = mode === 'story' ? 1 : 0.35;
        I.forEach((it, i) => {
          if (f[i] < 0.001) return;
          it.holder.getWorldPosition(v);
          const lift = it.lifter.position.y;
          // leave room on the right for the glass callout: the item sits centred in what's left
          const R = it.cup ? 3.2 : 0.85, cardF = useCallout ? Math.min(0.62, ((stageW < 560 ? 212 : 300) + (stageW < 560 ? 26 : 44) + 16) / stageW) : 0;
          const d = Math.max(D0 * (it.cup ? 0.9 : 0.84), (it.cup ? 5.6 : 6.3) / FOV_T, R / ((1 - cardF - 0.06) * FOV_T * aspect)); // never so close the set crops itself
          const hwF = d * FOV_T * aspect, phi = useCallout ? (1 - cardF) / 2 : 0.5;
          const y = it.cup ? 4.5 + lift : 6.9 + 0.6 * lift;
          fc.x += (v.x + (0.5 - phi) * 2 * hwF) * f[i]; fc.y += y * f[i]; fc.z += v.z * 0.6 * f[i]; fc.el += 6 * f[i]; fc.d += d * f[i]; wsum += f[i];
        });
        const w = ss(0, 1, F) * pull;
        ['x', 'y', 'z', 'el', 'd'].forEach(k2 => { cam[k2] = lerp(cam[k2], fc[k2] / wsum, w); });
      }
      tgt.set(cam.x, cam.y, cam.z);
      camera.position.set(cam.x, cam.y + Math.sin(cam.el * DEG) * cam.d, cam.z + Math.cos(cam.el * DEG) * cam.d);
      camera.lookAt(tgt);
      camera.updateMatrixWorld();
      return f;
    }

    /* ------------------------------------------------------------ callout */
    const co = useCallout && el.querySelector('.vl-co'), coIn = co && co.querySelector('.vl-co-in');
    const lead = useCallout && el.querySelector('.vl-lead'), leadPath = lead && lead.querySelector('path'), leadDot = lead && lead.querySelector('circle');
    let coId = null, lastFocus = null;
    function anchorOf(it) {
      if (!it) return null;
      const W = stageW, H = stageH;
      const loc = new T.Vector3(0, it.cup ? 7.2 : CAP_Y + 1.15 + (BASE - RH), 0);
      const pw = it.spinner.localToWorld(loc.clone()), c0 = pw.clone().project(camera);
      const edge = pw.clone().add(new T.Vector3(it.cup ? 3.25 : 0.9, 0, 0)).project(camera);
      return { x: (c0.x * 0.5 + 0.5) * W, y: (-c0.y * 0.5 + 0.5) * H, r: Math.abs(edge.x - c0.x) * 0.5 * W, w: W, h: H };
    }
    function callout(f) {
      let best = -1, bf = 0; f.forEach((x, i) => { if (x > bf) { bf = x; best = i; } });
      const it = bf > 0.5 ? I[best] : null;
      const id = it ? it.c.id : null;
      if (id !== lastFocus) { lastFocus = id; if (o.onFocus) o.onFocus(id); }
      if (!co) return;
      el.classList.toggle('vl-on', !!it);
      if (!it) return;
      const c = it.c;
      if (coId !== c.id) {
        coId = c.id; coSize = null;
        coIn.innerHTML = `<div class="vl-co-h"><i style="background:${c.k.hex}"></i><span class="vl-co-t">${esc(c.label)}</span></div>
<div class="vl-co-sub">${esc(c.tube)}</div>
<div class="vl-co-n"><b>${c.n}</b><span>${c.n === 1 ? 'marker' : 'markers'}</span></div>
<div class="vl-co-tiles">${c.states.map(s => `<i style="background:${TILE[s]}"></i>`).join('')}</div>
<p class="vl-co-c">${countsLine(c)}</p>${c.systems.length ? `<p class="vl-co-s">${c.systems.map(esc).join(' · ')}</p>` : ''}`;
      }
      const a = anchorOf(it); if (!a) return;
      if (!coSize) { co.classList.toggle('vl-co-sm', a.w < 560); coSize = [co.offsetWidth, co.offsetHeight]; }
      const [cw, ch] = coSize, gap = a.w < 560 ? 26 : 44;
      // try right, left, then above the cap; score off-stage spill and any overlap with the other containers' caps
      const others = I.filter(j => j !== it && j.holder.visible).map(anchorOf).filter(Boolean);
      const place = (side) => {
        let x, y;
        if (side === 'r') { x = a.x + a.r + gap; y = a.y - 34; }
        else if (side === 'l') { x = a.x - a.r - gap - cw; y = a.y - 34; }
        else { x = a.x - cw / 2; y = a.y - a.r - gap - ch; }
        const X = Math.max(16, Math.min(a.w - cw - 16, x)), Y = Math.max(16, Math.min(a.h - ch - 16, y));
        let pen = Math.abs(X - x) * 3 + Math.abs(Y - y) * 2 + (side === 'u' ? 40 : side === 'l' ? 12 : 0);
        others.forEach(q => { const r = q.r + 10, ox = Math.max(0, Math.min(X + cw, q.x + r) - Math.max(X, q.x - r)), oy = Math.max(0, Math.min(Y + ch, q.y + r * 2.2) - Math.max(Y, q.y - r)); pen += ox * oy * 0.5; });
        if (X < a.x + a.r && X + cw > a.x - a.r && Y < a.y + a.r && Y + ch > a.y - a.r) pen += 1e5; // never on its own cap
        return { side, x: X, y: Y, pen };
      };
      if (!it._side || it._sideT !== coId) { it._side = ['r', 'l', 'u'].map(place).sort((p, q) => p.pen - q.pen)[0].side; it._sideT = coId; }
      const pl = place(it._side), x = pl.x, y = pl.y;
      co.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
      let ax, ay, ex, ey;
      if (pl.side === 'u') { ax = a.x; ay = a.y - a.r - 6; ex = Math.max(x + 18, Math.min(x + cw - 18, a.x)); ey = y + ch; }
      else { const right = pl.side === 'r'; ax = right ? a.x + a.r + 8 : a.x - a.r - 8; ay = a.y; ex = right ? x : x + cw; ey = Math.max(y + 18, Math.min(y + ch - 18, a.y)); }
      const mx = pl.side === 'u' ? ax : ax + (ex - ax) * 0.45;
      leadPath.setAttribute('d', pl.side === 'u' ? `M${ax.toFixed(1)} ${ay.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}` : `M${ax.toFixed(1)} ${ay.toFixed(1)} L${mx.toFixed(1)} ${ay.toFixed(1)} L${mx.toFixed(1)} ${ey.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}`);
      leadDot.setAttribute('cx', ax.toFixed(1)); leadDot.setAttribute('cy', ay.toFixed(1));
    }

    /* --------------------------------------------------------------- loop */
    let dead = false, raf = 0, last = 0, visible = true, target = clamp01(o.progress || 0), s = reduced ? target : target, reported = -1, live = false;
    const dprCap = () => (Math.min(el.clientWidth, window.innerWidth) <= 640 ? 1.5 : 1.75);
    function resize() {
      const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight || Math.round(w * 0.9));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap()));
      renderer.setSize(w, h, false);
      stageW = w; stageH = h; coSize = null; aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); fit();
    }
    function frame() {
      const f = pose(s);
      renderer.render(scene, camera);
      callout(f);
      if (!live) { live = true; el.classList.add('vl-live'); if (o.onReady) o.onReady(); }
      if (o.onProgress && s !== reported) { reported = s; o.onProgress(s); }
    }
    function tick(now) {
      raf = 0; if (dead) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
      let moving = false;
      if (reduced) s = target;
      else { s += (target - s) * (1 - Math.exp(-12 * dt)); if (Math.abs(target - s) < 1e-4) s = target; else moving = true; }
      I.forEach(it => {
        if (reduced) it.fm = it.fmT;
        else { it.fm += (it.fmT - it.fm) * (1 - Math.exp(-7 * dt)); if (Math.abs(it.fmT - it.fm) < 1e-3) it.fm = it.fmT; else moving = true; }
      });
      frame();
      if (moving) schedule(); else last = 0;
    }
    function schedule() { if (!raf && !dead && visible && !document.hidden) raf = requestAnimationFrame(tick); }
    function dirty() { schedule(); }
    const ro = window.ResizeObserver ? new ResizeObserver(() => { resize(); if (visible) frame(); }) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', onWinResize);
    function onWinResize() { resize(); frame(); }
    const io = window.IntersectionObserver ? new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) { last = 0; schedule(); } }, { rootMargin: '100px' }) : null;
    if (io) io.observe(el);
    const onVis = () => { if (!document.hidden) { last = 0; schedule(); } };
    document.addEventListener('visibilitychange', onVis);
    const onLost = e => {                            // keep the SVG poster, drop everything GL
      e.preventDefault(); teardown();
      el.querySelectorAll('canvas,.vl-co,.vl-lead').forEach(n => n.remove());
      const dead2 = inert('context-lost'); Object.assign(api, dead2);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    resize();
    frame();                                         // first frame immediately, even off-screen

    function teardown() {
      if (dead) return; dead = true;
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', onWinResize);
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      disposables.forEach(d => d && d.dispose && d.dispose());
      renderer.dispose();
      try { const ext = renderer.getContext().getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* ignore */ }
    }
    const api = {
      fallback: false,
      setProgress(p) { target = clamp01(+p || 0); if (reduced) s = target; schedule(); },
      setFocus(id) { I.forEach(it => { it.fmT = it.c.id === id ? 1 : 0; }); schedule(); },
      getAnchor(id) { const it = I.find(x => x.c.id === id); return it ? anchorOf(it) : null; },
      resize() { resize(); frame(); },
      render() { frame(); },
      destroy() { if (dead) return; teardown(); el.innerHTML = ''; el.classList.remove('vl', 'vl-live', 'vl-on', 'vl-fallback'); },
      _debug: { renderer, scene, camera },
    };
    return api;
  }

  return { mount, svg };
}
