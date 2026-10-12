/* optimal-vo2-bike: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-vo2-bike")) return;
const AZIMUTH = 45;
const ELEVATION = 30;
const SHADES = 4;
const RADIANS = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
function cameraOf({ scale, azimuth = AZIMUTH, elevation = ELEVATION }) {
    const a = azimuth * RADIANS;
    const e = elevation * RADIANS;
    return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: scale * UNIT };
}
function iso([x, y, z], projection) {
    const { origin } = projection;
    const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);
    return [origin[0] + (x * sinA - y * cosA) * k, origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
}
function towardViewer(projection) {
    const { sinA, cosA } = cameraOf(projection);
    return [cosA, sinA];
}
function depthOf([x, y, z], projection) {
    const { sinA, cosA, sinE, cosE } = cameraOf(projection);
    return (x * cosA + y * sinA) * cosE + z * sinE;
}
const tenth = (value) => {
    const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
    return text === "-0" ? "0" : text;
};
function pathOf(points, closed = false) {
    if (!points.length)
        return "";
    return points.map(([x, y], at) => `${at ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") + (closed ? "Z" : "");
}
const joinPaths = (paths) => paths.filter(Boolean).join("");
function roundedPlan({ x, y, w, d, r }, steps = 8) {
    const radius = Math.max(0, Math.min(r, w / 2, d / 2));
    const corners = [
        [x + w - radius, y + radius, -90],
        [x + w - radius, y + d - radius, 0],
        [x + radius, y + d - radius, 90],
        [x + radius, y + radius, 180],
    ];
    const out = [];
    for (const [cx, cy, start] of corners) {
        const count = radius > 0 ? steps : 0;
        for (let step = 0; step <= count; step++) {
            const angle = (start + (count ? (90 * step) / count : 45)) * RADIANS;
            out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
        }
    }
    return out;
}
function signedArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index++) {
        const [ax, ay] = points[index];
        const [bx, by] = points[(index + 1) % points.length];
        area += ax * by - bx * ay;
    }
    return area / 2;
}
const oriented = (points) => (signedArea(points) < 0 ? [...points].reverse() : points);
function convexHull(points) {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length < 3)
        return sorted;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
            lower.pop();
        lower.push(point);
    }
    const upper = [];
    for (let index = sorted.length - 1; index >= 0; index--) {
        const point = sorted[index];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
            upper.pop();
        upper.push(point);
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
function runsOf(flags, want) {
    const count = flags.length;
    const runs = [];
    const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
    if (start < 0)
        return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
    let run = null;
    for (let step = 0; step < count; step++) {
        const index = (start + step) % count;
        if (flags[index] === want) {
            if (!run)
                run = [index];
            run.push((index + 1) % count);
        }
        else if (run) {
            runs.push(run);
            run = null;
        }
    }
    if (run)
        runs.push(run);
    return runs;
}
function extrude(ring, z, height, projection, options = {}) {
    const convex = options.convex ?? true;
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const { sinA, cosA } = cameraOf(projection);
    const normals = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const length = Math.hypot(dx, dy) || 1;
        return (counter ? [dy / length, -dx / length] : [-dy / length, dx / length]);
    });
    const facing = normals.map(([nx, ny]) => nx * vx + ny * vy > 1e-9);
    const top = ring.map(([x, y]) => iso([x, y, z + height], projection));
    const bottom = ring.map(([x, y]) => iso([x, y, z], projection));
    const outline = [];
    const crease = [];
    for (const run of runsOf(facing, false))
        outline.push(pathOf(run.map((index) => top[index])));
    for (const run of runsOf(facing, true)) {
        crease.push(pathOf(run.map((index) => top[index])));
        if (height > 0)
            outline.push(pathOf(run.map((index) => bottom[index])));
    }
    if (height > 0) {
        for (let index = 0; index < count; index++) {
            if (facing[(index + count - 1) % count] !== facing[index])
                outline.push(pathOf([top[index], bottom[index]]));
        }
    }
    let fill;
    if (convex) {
        fill = pathOf(convexHull([...top, ...bottom]), true);
    }
    else {
        const parts = [pathOf(oriented(top), true), pathOf(oriented(bottom), true)];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const next = (index + 1) % count;
            parts.push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
        fill = parts.join("");
    }
    const buckets = Array.from({ length: SHADES }, () => []);
    if (height > 0) {
        const [lx, ly] = [-sinA, cosA];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const [nx, ny] = normals[index];
            const lit = (nx * lx + ny * ly + 1) / 2;
            const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
            const next = (index + 1) % count;
            buckets[shade].push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
    }
    let bevel;
    if (options.bevel && options.bevel > 0) {
        const by = options.bevel;
        const inset = ring.map(([x, y], index) => {
            const [ax, ay] = normals[(index + count - 1) % count];
            const [bx, by2] = normals[index];
            const mx = ax + bx;
            const my = ay + by2;
            const length = Math.hypot(mx, my) || 1;
            return [x - (mx / length) * by, y - (my / length) * by];
        });
        const insetTop = inset.map(([x, y]) => iso([x, y, z + height], projection));
        bevel = runsOf(facing, true)
            .map((run) => pathOf([top[run[0]], ...run.slice(1, -1).map((index) => insetTop[index]), top[run[run.length - 1]]]))
            .join("");
    }
    return {
        fill,
        outline: outline.join(""),
        crease: crease.join(""),
        top: pathOf(oriented(top), true),
        shades: buckets.map((paths) => paths.join("")),
        bevel,
    };
}
const ringOf = (plan, steps = 8) => roundedPlan(plan, steps);
function slabOf(plan, z, height, projection, steps = 8, bevel = 0) {
    return extrude(ringOf(plan, steps), z, height, projection, { convex: true, bevel });
}
function circleRing(cx, cy, radius, steps = 40) {
    return Array.from({ length: steps }, (_, step) => {
        const angle = (step / steps) * Math.PI * 2;
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
}
function cylinder(cx, cy, radius, z, height, projection, steps = 32, bevel = 0) {
    return extrude(circleRing(cx, cy, radius, steps), z, height, projection, { convex: true, bevel });
}
const insetPlan = ({ x, y, w, d, r }, by) => ({ x: x + by, y: y + by, w: w - by * 2, d: d - by * 2, r: Math.max(0, r - by) });
function onTop(points, z, projection, closed = false) {
    return pathOf(points.map(([x, y]) => iso([x, y, z], projection)), closed);
}
const planOutline = (plan, z, projection, steps = 8) => onTop(ringOf(plan, steps), z, projection, true);
const lineOnTop = (from, to, z, projection) => onTop([from, to], z, projection);
const segment = (from, to, projection) => pathOf([iso(from, projection), iso(to, projection)]);
const rise = (at, from, to, projection) => segment([at[0], at[1], from], [at[0], at[1], to], projection);
const ring = (cx, cy, radius, z, projection, steps = 40) => onTop(circleRing(cx, cy, radius, steps), z, projection, true);
const pointsAt = (points, projection) => points.map((point) => iso(point, projection));
function dotGrid(x, y, columns, rows, gap, z, projection) {
    const dots = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++)
            dots.push(iso([x + column * gap, y + row * gap, z], projection));
    }
    return dots;
}
function corners({ x, y, w, d }, inset = 0) {
    return [
        [x + inset, y + inset],
        [x + w - inset, y + inset],
        [x + inset, y + d - inset],
        [x + w - inset, y + d - inset],
    ];
}
function boxCorners({ x, y, w, d }, z0, z1) {
    const out = [];
    for (const px of [x, x + w])
        for (const py of [y, y + d])
            for (const z of [z0, z1])
                out.push([px, py, z]);
    return out;
}
function knurl(cx, cy, radius, z0, z1, count, projection, inset = 0.4) {
    const [vx, vy] = towardViewer(projection);
    const lines = [];
    for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        if (nx * vx + ny * vy < 0.15)
            continue;
        lines.push(segment([cx + radius * nx, cy + radius * ny, z0 + inset], [cx + radius * nx, cy + radius * ny, z1 - inset], projection));
    }
    return lines.join("");
}
function sideArc(cx, cy, radius, z, projection, steps = 24) {
    const [vx, vy] = towardViewer(projection);
    const facing = Math.atan2(vy, vx);
    const points = [];
    for (let step = 0; step <= steps; step++) {
        const angle = facing - Math.PI / 2 + (step / steps) * Math.PI;
        points.push(iso([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), z], projection));
    }
    return pathOf(points);
}
function ringSeam(ring, z, projection) {
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const facing = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const [nx, ny] = counter ? [dy, -dx] : [-dy, dx];
        return nx * vx + ny * vy > 1e-9;
    });
    return runsOf(facing, true).map((run) => pathOf(run.map((index) => iso([ring[index][0], ring[index][1], z], projection)))).join("");
}
const sideSeam = (plan, z, projection, steps = 8) => ringSeam(ringOf(plan, steps), z, projection);
function sideRing(center, radius, axis, projection, steps = 20) {
    const [px, py, pz] = center;
    const points = [];
    for (let step = 0; step < steps; step++) {
        const angle = (step / steps) * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        points.push(iso(axis === "x" ? [px, py + u, pz + v] : [px + u, py, pz + v], projection));
    }
    return pathOf(points, true);
}
function coil(from, to, center, radius, turns, axis, projection, perTurn = 16) {
    const count = Math.max(1, Math.round(turns * perTurn));
    const back = [];
    const front = [];
    let run = [];
    let near = null;
    for (let index = 0; index <= count; index++) {
        const share = index / count;
        const angle = share * turns * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        const along = from + (to - from) * share;
        const point = axis === "x" ? [along, center[0] + u, center[1] + v] : [center[0] + u, along, center[1] + v];
        const normal = axis === "x" ? [0, Math.cos(angle), Math.sin(angle)] : [Math.cos(angle), 0, Math.sin(angle)];
        const facing = depthOf(normal, projection) > 0;
        const flat = iso(point, projection);
        if (near === null)
            near = facing;
        if (facing !== near) {
            run.push(flat);
            (near ? front : back).push(pathOf(run));
            run = [flat];
            near = facing;
            continue;
        }
        run.push(flat);
    }
    if (run.length > 1)
        (near ? front : back).push(pathOf(run));
    return { back: back.join(""), front: front.join("") };
}
function topTicks(from, to, step, every, edge, z, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, edge] : [edge, at];
        const b = axis === "x" ? [at, edge + length] : [edge + length, at];
        (big ? major : minor).push(lineOnTop(a, b, z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function sideTicks(from, to, step, every, face, top, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, face, top] : [face, at, top];
        const b = axis === "x" ? [at, face, top - length] : [face, at, top - length];
        (big ? major : minor).push(segment(a, b, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function radialTicks(cx, cy, radius, count, every, z, lengths, projection, from = 0, span = Math.PI * 2) {
    const minor = [];
    const major = [];
    const closed = Math.abs(span - Math.PI * 2) < 1e-9;
    const steps = closed ? count : count + 1;
    for (let index = 0; index < steps; index++) {
        const angle = from + (index / count) * span;
        const big = index % every === 0;
        const inner = radius - (big ? lengths[1] : lengths[0]);
        const sx = Math.sin(angle);
        const sy = -Math.cos(angle);
        (big ? major : minor).push(lineOnTop([cx + sx * inner, cy + sy * inner], [cx + sx * radius, cy + sy * radius], z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
const haloOf = (plan, z, height, projection) => slabOf(plan, z, height, projection).fill;
function axisVector(projection, [dx, dy, dz]) {
    const origin = iso([0, 0, 0], projection);
    const moved = iso([dx, dy, dz], projection);
    return [moved[0] - origin[0], moved[1] - origin[1]];
}
const fine = (value) => Math.round(value * 100) / 100;
function translateAlong(projection, by) {
    const [x, y] = axisVector(projection, by);
    return `translate(${fine(x)} ${fine(y)})`;
}
const thousandth = (value) => Math.round(value * 1000) / 1000;
function axesAt(at, z, projection) {
    const origin = iso([at[0], at[1], z], projection);
    const along = (point) => {
        const [px, py] = iso(point, projection);
        return [px - origin[0], py - origin[1]];
    };
    return { origin, x: along([at[0] + 1, at[1], z]), y: along([at[0], at[1] + 1, z]), z: along([at[0], at[1], z + 1]) };
}
const matrixOf = (u, v, origin) => `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;
function holdStill(element, [dx, dy]) {
    const text = dx || dy ? `translate(${-dx} ${-dy})` : "";
    element.querySelectorAll("[data-hold]").forEach((node) => (text ? node.setAttribute("transform", text) : node.removeAttribute("transform")));
}
function topMatrix(at, z, projection, along = "x") {
    const { origin, x, y } = axesAt(at, z, projection);
    return along === "x" ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}
function sideMatrix(at, z, projection, face) {
    const { origin, x, y, z: up } = axesAt(at, z, projection);
    const down = [-up[0], -up[1]];
    return face === "left" ? matrixOf(x, down, origin) : matrixOf([-y[0], -y[1]], down, origin);
}
function screenRise(height, projection) {
    const { cosE, k } = cameraOf(projection);
    return height * cosE * k;
}
function fitProjection(points, width, height, { pad = 24, headroom = 0, azimuth = AZIMUTH, elevation = ELEVATION } = {}) {
    const unit = { origin: [0, 0], scale: 1, azimuth, elevation };
    const flat = points.map((point) => iso(point, unit));
    const xs = flat.map(([x]) => x);
    const ys = flat.map(([, y]) => y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const up = Math.min(...ys);
    const down = Math.max(...ys);
    const scale = Math.min((width - pad * 2) / (right - left), (height - pad * 2 - headroom) / (down - up));
    return {
        origin: [width / 2 - ((left + right) / 2) * scale, headroom + (height - headroom) / 2 - ((up + down) / 2) * scale],
        scale,
        azimuth,
        elevation,
    };
}
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attrs = (pairs) => Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key, value]) => ` ${key}="${escape(String(value))}"`)
    .join("");
function solidSvg(paths, { tone = "hi", crease = "faint", halo = false, lit = false, flat = false, className, inner = "" } = {}) {
    const parts = [];
    if (halo)
        parts.push(`<path class="iso-halo" d="${paths.fill}"/>`);
    parts.push(`<path class="iso-fill" d="${paths.fill}"/>`);
    if (!flat) {
        paths.shades.forEach((d, shade) => {
            if (d)
                parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`);
        });
        parts.push(`<path class="iso-top" d="${paths.top}"/>`);
    }
    if (crease !== "none" && paths.crease)
        parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>`);
    if (crease !== "none" && paths.bevel)
        parts.push(`<path class="iso-line iso-bevel" data-tone="${crease}" d="${paths.bevel}"/>`);
    if (inner)
        parts.push(inner);
    parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/>`);
    return `<g${attrs({ class: className ? `iso-solid ${className}` : "iso-solid", "data-lit": lit ? "" : undefined, "data-seamless": paths.seamless ? "" : undefined })}>${parts.join("")}</g>`;
}
function lineSvg(d, { tone = "lo", dotted = false, dashed = false, flow = false, className, free } = {}) {
    if (!d)
        return "";
    return `<path${attrs({
        class: className ? `iso-line ${className}` : "iso-line",
        "data-tone": tone,
        "data-free": free === true ? "" : free || undefined,
        "data-dotted": dotted ? "" : undefined,
        "data-dashed": dashed ? "" : undefined,
        "data-flow": flow ? "" : undefined,
        d,
    })}/>`;
}
function dotsSvg(points, { size = 0.5, tone = "mid", pulse = false } = {}) {
    const dots = points
        .map(([x, y, alpha], index) => `<circle cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"${alpha !== undefined && alpha < 1 ? ` fill-opacity="${Math.max(0, alpha).toFixed(2)}"` : ""}${pulse ? ` data-pulse="" style="--pulse-at:${(index * 137) % 1600}ms"` : ""}/>`)
        .join("");
    return `<g class="iso-dots" data-tone="${tone}">${dots}</g>`;
}
function fadedSvg(list, style = {}) {
    const groups = new Map();
    for (const entry of list) {
        const [d, alpha] = Array.isArray(entry) ? entry : [entry.d, entry.alpha];
        if (!d || !(alpha > 0.02))
            continue;
        const level = Math.min(1, Math.round(alpha * 20) / 20);
        groups.set(level, (groups.get(level) ?? "") + d);
    }
    return [...groups].map(([alpha, d]) => (alpha >= 1 ? lineSvg(d, style) : `<g opacity="${alpha.toFixed(2)}">${lineSvg(d, style)}</g>`)).join("");
}
function fadeLineSvg(points, { fade = [0, 0], tone = "lo", className, stops = 6 } = {}) {
    if (points.length < 2)
        return "";
    const ease = (t) => t * t * (3 - 2 * t);
    const hashOf = (text) => {
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++)
            hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
        return (hash >>> 0).toString(36);
    };
    const lengths = [0];
    for (let index = 1; index < points.length; index++)
        lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]));
    const at = (length) => {
        let index = 1;
        while (index < points.length - 1 && lengths[index] < length)
            index++;
        const span = lengths[index] - lengths[index - 1] || 1;
        const t = Math.max(0, Math.min(1, (length - lengths[index - 1]) / span));
        return [points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t, points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t];
    };
    const pieceOf = (from, to) => [at(from), ...points.filter((_, index) => lengths[index] > from + 1e-6 && lengths[index] < to - 1e-6), at(to)];
    const total = lengths[lengths.length - 1];
    if (total < 1e-6)
        return "";
    let [start, end] = Array.isArray(fade) ? fade : [fade, fade];
    if (start + end > total) {
        const share = total / (start + end);
        start *= share;
        end *= share;
    }
    const paint = `var(--anatomy-${tone})`;
    const ramp = (piece, rising) => {
        const d = pathOf(piece);
        const [x1, y1] = piece[0];
        const [x2, y2] = piece[piece.length - 1];
        const id = `iso-fade-${hashOf(`${d}|${tone}|${rising}`)}`;
        const marks = Array.from({ length: stops + 1 }, (_, index) => {
            const t = index / stops;
            const alpha = ease(rising ? t : 1 - t);
            return `<stop offset="${t.toFixed(3)}" stop-opacity="${alpha.toFixed(3)}" style="stop-color:${paint}"/>`;
        }).join("");
        const gradient = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${tenth(x1)}" y1="${tenth(y1)}" x2="${tenth(x2)}" y2="${tenth(y2)}">${marks}</linearGradient>`;
        return `<defs>${gradient}</defs><path${attrs({ class: className ? `iso-line ${className}` : "iso-line", "data-tone": tone, "data-free": rising ? "start" : "end", d, style: `stroke:url(#${id})` })}/>`;
    };
    const parts = [];
    if (start > 0.05)
        parts.push(ramp(pieceOf(0, start), true));
    if (total - end - start > 0.05)
        parts.push(lineSvg(pathOf(pieceOf(start, total - end)), { tone, className }));
    if (end > 0.05)
        parts.push(ramp(pieceOf(total - end, total), false));
    return `<g class="iso-fade">${parts.join("")}</g>`;
}
function wireSvg(from, to, { via = [], tone = "lo", dotted = false, dashed = false, flow = false, ends = "both", size = 1.2 } = {}) {
    const d = pathOf([from, ...via, to]);
    const end = ([x, y]) => `<circle class="iso-wire-end" cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"/>`;
    return `<g class="iso-wire" data-tone="${tone}">${lineSvg(d, { tone, dotted, dashed, flow })}${ends === "both" || ends === "from" ? end(from) : ""}${ends === "both" || ends === "to" ? end(to) : ""}</g>`;
}
function faceTextSvg(transform, text, { size = 3, tone = "mid", anchor = "start" } = {}) {
    return `<text class="iso-face-text" data-tone="${tone}" transform="${transform}" font-size="${size}" text-anchor="${anchor}">${escape(text)}</text>`;
}
function groupSvg(children, extra = {}) {
    return `<g${attrs(extra)}>${Array.isArray(children) ? children.join("") : children}</g>`;
}
function figureSvg({ width, height, label, body, standalone = false, className }) {
    const style = standalone ? `<style>${ISO_CSS}</style>` : "";
    return `<svg${attrs({
        xmlns: "http://www.w3.org/2000/svg",
        class: `iso-svg${standalone ? " iso" : ""}${className ? ` ${className}` : ""}`,
        "data-theme": standalone || undefined,
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": label,
    })}>${style}${Array.isArray(body) ? body.join("") : body}</svg>`;
}
function swatchSvg(mark) {
    if (mark === "raised" || mark === "flat" || mark === "lit") {
        const body = mark === "flat" ? "M2 6.5 8 3.5 14 6.5 8 9.5Z" : "M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z";
        const crease = mark === "flat" ? "" : `<path class="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5"/>`;
        return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="${body}"/>${crease}</svg>`;
    }
    return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>`;
}
function plateHtml({ fig, title, hint, readout = "", keys = [], caption, body }) {
    const corner = (name, text, extra = "") => `<span class="iso-plate-corner" data-corner="${name}"${extra}>${escape(text)}</span>`;
    const legend = keys.length || caption
        ? `<figcaption class="iso-legend">${keys.length ? `<span class="iso-keys">${keys.map((key) => `<span class="iso-key">${swatchSvg(key.mark)}${escape(key.label)}</span>`).join("")}</span>` : ""}${caption ? `<span class="iso-caption">${escape(caption)}</span>` : ""}</figcaption>`
        : "";
    return `<figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">${corner("fig", fig)}${title ? corner("title", title) : ""}${hint ? corner("hint", hint) : ""}${corner("readout", readout, " data-readout")}</div>${body}</div>${legend}</figure>`;
}
function pageHtml({ title, theme = "dark", body, script = "", width = 650 }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>${ISO_CSS}${PAGE_CSS.replace("__WIDTH__", String(width))}</style></head><body class="iso" data-theme="${theme}"><main class="iso-page">${body}</main>${script ? `<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>` : ""}</body></html>`;
}
const PAGE_CSS = `
*{box-sizing:border-box}
html{color-scheme:dark}
body[data-theme="light"]{color-scheme:light}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.iso-page{width:min(__WIDTH__px,100% - 32px);margin:64px auto 96px}
`;
const ISO_CSS = `
.iso{
  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;
  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;
  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;
  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;
  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;
  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;
  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);
  --anatomy-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;
}
.iso[data-theme="light"]{
  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;
  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;
  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;
  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;
  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;
  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;
}
.iso-svg{display:block;width:100%;height:auto;overflow:visible}
.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}
.iso-fill{fill:var(--anatomy-paper);stroke:none}
.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}
.iso-shade,.iso-top{stroke:none}
.iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}
.iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}
.iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}
.iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}
.iso-top{fill:var(--anatomy-top)}
.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}
.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}
.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}
.iso-solid[data-seamless]>.iso-shade[data-shade="0"]{stroke:var(--anatomy-shade-0)}
.iso-solid[data-seamless]>.iso-shade[data-shade="1"]{stroke:var(--anatomy-shade-1)}
.iso-solid[data-seamless]>.iso-shade[data-shade="2"]{stroke:var(--anatomy-shade-2)}
.iso-solid[data-seamless]>.iso-shade[data-shade="3"]{stroke:var(--anatomy-shade-3)}
.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}
.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}
.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}
.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}
.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}
.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}
.iso-line[data-tone="hi"]{stroke:var(--anatomy-hi)}
.iso-line[data-tone="mid"]{stroke:var(--anatomy-mid)}
.iso-line[data-tone="lo"]{stroke:var(--anatomy-lo)}
.iso-line[data-tone="faint"]{stroke:var(--anatomy-faint)}
.iso-line[data-tone="lit"]{stroke:var(--anatomy-lit)}
.iso-line[data-tone="red"]{stroke:var(--anatomy-red)}
.iso-line[data-tone="green"]{stroke:var(--anatomy-green)}
.iso-line[data-tone="blue"]{stroke:var(--anatomy-blue)}
.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}
.iso-line[data-dashed]{stroke-dasharray:3 3}
.iso-line[data-flow]{stroke-dasharray:2 6}
.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.iso-wire[data-tone="hi"] .iso-wire-end{stroke:var(--anatomy-hi)}
.iso-wire[data-tone="mid"] .iso-wire-end{stroke:var(--anatomy-mid)}
.iso-wire[data-tone="faint"] .iso-wire-end{stroke:var(--anatomy-faint)}
.iso-wire[data-tone="lit"] .iso-wire-end{stroke:var(--anatomy-lit)}
.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}
.iso-dots[data-tone="hi"] circle{opacity:.85}
.iso-dots[data-tone="mid"] circle{opacity:.45}
.iso-dots[data-tone="lo"] circle{opacity:.22}
.iso-dots[data-tone="faint"] circle{opacity:.12}
.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}
.iso-face-text[data-tone="hi"]{fill:var(--anatomy-hi)}
.iso-face-text[data-tone="lo"]{fill:var(--anatomy-lo)}
.iso-face-text[data-tone="faint"]{fill:var(--anatomy-faint)}
.tb-body{fill:var(--anatomy-shade-2);stroke:none}
.tb-shine{fill:var(--anatomy-top);stroke:none}
.tb-shade{fill:var(--anatomy-shade-0);stroke:none}
.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}
.tb-ring[data-tone="mid"]{stroke:var(--anatomy-mid)}
.tb-ring[data-tone="faint"]{stroke:var(--anatomy-faint)}
.tb-ring[data-tone="hi"]{stroke:var(--anatomy-hi)}
@keyframes iso-flow{to{stroke-dashoffset:-32}}
@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}
.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}
.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}
.iso-figure{margin:32px 0 36px}
.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}
.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}
.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}
.iso-plate-corner[data-corner="fig"]{top:0;left:0;color:var(--anatomy-text)}
.iso-plate-corner[data-corner="title"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="hint"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="readout"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}
.iso-plate .iso-svg{margin:0 auto}
.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}
.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}
.iso-key{display:inline-flex;align-items:center;gap:7px}
.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}
.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.iso-swatch[data-mark="raised"] path,.iso-swatch[data-mark="flat"] path{stroke:var(--anatomy-mid)}
.iso-swatch[data-mark="lit"] path{stroke:var(--anatomy-lit)}
.iso-swatch[data-mark="dim"] path{stroke:var(--anatomy-lo)}
.iso-swatch[data-mark="dotted"] path{stroke-dasharray:.01 3;stroke-width:1.4}
.iso-swatch[data-mark="dashed"] path{stroke-dasharray:3 2.5}
.iso-swatch[data-mark="red"] path{stroke:var(--anatomy-red)}
.iso-swatch[data-mark="green"] path{stroke:var(--anatomy-green)}
.iso-swatch[data-mark="blue"] path{stroke:var(--anatomy-blue)}
.iso-swatch-crease{stroke:var(--anatomy-lo)!important}
@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner="hint"]{bottom:18px}}
@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}
`;

const G = (() => {

const TAU = Math.PI * 2;
const LIGHT_UP = 1.2;
const BANDS = [0, 0.2, 0.42, 0.62];

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
const unit3 = (a) => {
  const length = len3(a) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function viewOf(P) {
  const { sinA, cosA, sinE, cosE } = cameraOf(P);
  return [cosA * cosE, sinA * cosE, sinE];
}

function lightOf(P) {
  const { sinA, cosA } = cameraOf(P);
  return unit3([-sinA, cosA, LIGHT_UP]);
}

const scaleOf = (P) => cameraOf(P).k;

function bandOf(score) {
  let tone = 0;
  while (tone < BANDS.length && score >= BANDS[tone]) tone++;
  return tone;
}

const toneOf = (normal, P) => bandOf(dot3(unit3(normal), lightOf(P)));

function frameAlong(o, a) {
  const axis = unit3(a);
  const helper = Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const u = unit3(cross3(helper, axis));
  const v = cross3(axis, u);
  return { o, a: axis, u, v };
}

const frameOf = (o, a, u, v) => ({ o, a, u, v });

function pointOf(F, s, r, angle) {
  const c = Math.cos(angle);
  const n = Math.sin(angle);
  return [
    F.o[0] + F.a[0] * s + r * (c * F.u[0] + n * F.v[0]),
    F.o[1] + F.a[1] * s + r * (c * F.u[1] + n * F.v[1]),
    F.o[2] + F.a[2] * s + r * (c * F.u[2] + n * F.v[2]),
  ];
}

const radialOf = (F, angle) => {
  const c = Math.cos(angle);
  const n = Math.sin(angle);
  return [c * F.u[0] + n * F.v[0], c * F.u[1] + n * F.v[1], c * F.u[2] + n * F.v[2]];
};

const tangentOf = (F, angle) => {
  const c = Math.cos(angle);
  const n = Math.sin(angle);
  return [-n * F.u[0] + c * F.v[0], -n * F.u[1] + c * F.v[1], -n * F.u[2] + c * F.v[2]];
};

const angleToward = (F, direction) => Math.atan2(dot3(direction, F.v), dot3(direction, F.u));

function hullTagged(points) {
  const sorted = [...points].sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o, a, b) => (a.p[0] - o.p[0]) * (b.p[1] - o.p[1]) - (a.p[1] - o.p[1]) * (b.p[0] - o.p[0]);
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 1e-9) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 1e-9) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const hullOf = (points) => hullTagged(points.map((p) => ({ p }))).map(({ p }) => p);

function runsOf(flags) {
  const count = flags.length;
  const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
  if (start < 0) return flags[0] ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
  const runs = [];
  let run = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    if (flags[index]) {
      if (!run) run = [index];
      run.push((index + 1) % count);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}

function groupsOf(keys) {
  const count = keys.length;
  const out = [];
  const start = keys.findIndex((key, index) => key !== keys[(index + count - 1) % count]);
  if (start < 0) {
    if (keys[0] !== null) out.push({ key: keys[0], run: Array.from({ length: count + 1 }, (_, index) => index % count) });
    return out;
  }
  let current = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    const key = keys[index];
    if (current && current.key === key) {
      current.run.push((index + 1) % count);
      continue;
    }
    if (current && current.key !== null) out.push(current);
    current = { key, run: [index, (index + 1) % count] };
  }
  if (current && current.key !== null) out.push(current);
  return out;
}

const stepsFor = (radius, least = 16, most = 112, scale = 0) => Math.max(least, Math.min(most, scale ? Math.ceil((TAU * radius * scale) / 3) : Math.round((radius * 1.3) / 4) * 4));

function chains(edges) {
  const out = [];
  let current = null;
  for (const [a, b, keep] of edges) {
    if (!keep) {
      if (current) out.push(current);
      current = null;
      continue;
    }
    if (!current) current = [a];
    current.push(b);
  }
  if (current) out.push(current);
  if (out.length > 1 && edges[0][2] && edges[edges.length - 1][2]) {
    const last = out.pop();
    out[0] = [...last, ...out[0].slice(1)];
  }
  return out;
}

function labelledArcs(nr, na, view, light, gr = nr, ga = na) {
  const cuts = [];
  if (Math.abs(gr) > 1e-9) {
    const visibleCut = -(ga * view.a) / (gr * view.flat);
    if (visibleCut > -1 && visibleCut < 1) {
      const d = Math.acos(visibleCut);
      cuts.push(view.phi - d, view.phi + d);
    }
  }
  if (Math.abs(nr) > 1e-9) {
    for (const threshold of BANDS) {
      const c = (threshold - na * light.a) / (nr * light.flat);
      if (c > -1 && c < 1) {
        const d = Math.acos(c);
        cuts.push(light.phi - d, light.phi + d);
      }
    }
  }
  const wrap = (angle) => ((angle % TAU) + TAU) % TAU;
  const sorted = [...new Set(cuts.map((angle) => Math.round(wrap(angle) * 1e9) / 1e9))].sort((a, b) => a - b);
  const label = (angle) => {
    const facing = gr * view.flat * Math.cos(angle - view.phi) + ga * view.a;
    if (facing <= 1e-9) return -1;
    return bandOf(nr * light.flat * Math.cos(angle - light.phi) + na * light.a);
  };
  if (!sorted.length) {
    const tone = label(0);
    return tone < 0 ? [] : [{ tone, from: 0, to: TAU, full: true }];
  }
  const arcs = sorted.map((from, index) => {
    const to = index + 1 < sorted.length ? sorted[index + 1] : sorted[0] + TAU;
    return { tone: label((from + to) / 2), from, to };
  });
  const merged = [];
  for (const arc of arcs) {
    const last = merged[merged.length - 1];
    if (last && last.tone === arc.tone && Math.abs(last.to - arc.from) < 1e-9) last.to = arc.to;
    else merged.push({ ...arc });
  }
  if (merged.length > 1 && merged[0].tone === merged[merged.length - 1].tone && Math.abs(merged[merged.length - 1].to - TAU - merged[0].from) < 1e-9) {
    const last = merged.pop();
    merged[0].from = last.from - TAU;
  }
  return merged.filter((arc) => arc.tone >= 0);
}

function hermiteSlopes(run) {
  const n = run.length - 1;
  const h = Array.from({ length: n }, (_, j) => run[j + 1][0] - run[j][0]);
  const delta = h.map((value, j) => (run[j + 1][1] - run[j][1]) / value);
  const d = new Array(n + 1).fill(0);
  const end = (h0, h1, d0, d1) => {
    let value = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(value) !== Math.sign(d0)) value = 0;
    else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(value) > Math.abs(3 * d0)) value = 3 * d0;
    return value;
  };
  if (n === 1) d[0] = d[1] = delta[0];
  else {
    d[0] = end(h[0], h[1], delta[0], delta[1]);
    d[n] = end(h[n - 1], h[n - 2], delta[n - 1], delta[n - 2]);
  }
  for (let k = 1; k < n; k++) {
    if (delta[k - 1] * delta[k] <= 0) continue;
    const w1 = 2 * h[k] + h[k - 1];
    const w2 = h[k] + 2 * h[k - 1];
    d[k] = (w1 + w2) / (w1 / delta[k - 1] + w2 / delta[k]);
  }
  return d;
}

function curveRuns(meridian) {
  const m = meridian.length;
  const segments = new Array(m - 1).fill(null);
  let start = 0;
  while (start < m - 1) {
    let end = start + 1;
    while (end < m - 1 && meridian[end][2] && Math.abs(meridian[end + 1][0] - meridian[end][0]) > 1e-9 && Math.abs(meridian[end][0] - meridian[end - 1][0]) > 1e-9) end++;
    const run = meridian.slice(start, end + 1);
    const n = run.length - 1;
    if (n >= 2 && run.every((point, j) => j === 0 || Math.abs(point[0] - run[j - 1][0]) > 1e-9)) {
      const d = hermiteSlopes(run);
      for (let j = 0; j < n; j++) {
        const [s0, r0] = run[j];
        const [s1, r1] = run[j + 1];
        const hj = s1 - s0;
        const d0 = d[j];
        const d1 = d[j + 1];
        const radius = (s) => {
          const t = (s - s0) / hj;
          return (2 * t ** 3 - 3 * t ** 2 + 1) * r0 + (t ** 3 - 2 * t ** 2 + t) * hj * d0 + (-2 * t ** 3 + 3 * t ** 2) * r1 + (t ** 3 - t ** 2) * hj * d1;
        };
        const slope = (s) => {
          const t = (s - s0) / hj;
          return ((6 * t ** 2 - 6 * t) * r0 + (6 * t - 6 * t ** 2) * r1) / hj + (3 * t ** 2 - 4 * t + 1) * d0 + (3 * t ** 2 - 2 * t) * d1;
        };
        segments[start + j] = { radius, slope };
      }
    }
    start = end;
  }
  return segments;
}

function curved(meridian, P, segments, { error = 0.2, depth = 6 } = {}) {
  const k = scaleOf(P);
  const out = [meridian[0]];
  for (let i = 0; i < meridian.length - 1; i++) {
    const curve = segments[i];
    const [s0] = meridian[i];
    const [s1] = meridian[i + 1];
    if (curve) {
      const split = (a, b, level) => {
        const mid = (a + b) / 2;
        const chord = (curve.radius(a) + curve.radius(b)) / 2;
        if (level < depth && Math.abs(curve.radius(mid) - chord) * k > error) {
          split(a, mid, level + 1);
          out.push([mid, curve.radius(mid), 1]);
          split(mid, b, level + 1);
        }
      };
      split(s0, s1, 0);
    }
    out.push(meridian[i + 1]);
  }
  return out;
}

function smoothRows(meridian, F, P, { rows = 6, slope = null, radius = null, steps = 48, error = 0.35, depth: deepest = 8, fineness = 0.1 } = {}) {
  const V = viewOf(P);
  const L = lightOf(P);
  const view = { a: dot3(F.a, V), flat: Math.hypot(dot3(F.u, V), dot3(F.v, V)), phi: Math.atan2(dot3(F.v, V), dot3(F.u, V)) };
  const light = { a: dot3(F.a, L), flat: Math.hypot(dot3(F.u, L), dot3(F.v, L)), phi: Math.atan2(dot3(F.v, L), dot3(F.u, L)) };
  const m = meridian.length;
  const faces = [];
  for (let i = 0; i < m - 1; i++) {
    const ds = meridian[i + 1][0] - meridian[i][0];
    const dr = meridian[i + 1][1] - meridian[i][1];
    const length = Math.hypot(ds, dr) || 1;
    faces.push([ds / length, -dr / length]);
  }
  const splines = slope ? null : curveRuns(meridian);
  const vertexNormal = (k, own) => {
    if (k <= 0 || k >= m - 1 || !meridian[k][2]) return own;
    const a = faces[k - 1];
    const b = faces[k];
    const x = a[0] + b[0];
    const y = a[1] + b[1];
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  };
  const normalAt = (i, u) => {
    const [s0] = meridian[i];
    const [s1] = meridian[i + 1];
    const s = s0 + (s1 - s0) * u;
    const sign = Math.sign(s1 - s0) || 1;
    const g = slope ? slope(s) : splines[i] ? splines[i].slope(s) : null;
    if (g !== null) {
      const length = Math.hypot(1, g);
      return [sign / length, (-sign * g) / length];
    }
    const a = vertexNormal(i, faces[i]);
    const b = vertexNormal(i + 1, faces[i]);
    const x = a[0] + (b[0] - a[0]) * u;
    const y = a[1] + (b[1] - a[1]) * u;
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  };
  const pointAt = (i, u, angle) => {
    const [s0, r0] = meridian[i];
    const [s1, r1] = meridian[i + 1];
    const s = s0 + (s1 - s0) * u;
    return iso(pointOf(F, s, radius ? radius(s) : splines && splines[i] ? splines[i].radius(s) : r0 + (r1 - r0) * u, angle), P);
  };
  const buckets = [[], [], [], [], []];
  const fine = TAU / Math.max(24, Math.min(192, steps * 1.5));
  const arcPoints = (i, u, from, to) => {
    const count = Math.max(1, Math.ceil((to - from) / fine));
    return Array.from({ length: count + 1 }, (_, index) => pointAt(i, u, from + ((to - from) * index) / count));
  };
  const centreOf = (arc, reference) => {
    let mid = (arc.from + arc.to) / 2 - reference;
    mid = ((mid % TAU) + TAU) % TAU;
    return mid;
  };
  const levelOf = (i, u) => {
    const [nr, na] = normalAt(i, u);
    const groups = new Map();
    for (const arc of labelledArcs(nr, na, view, light, faces[i][0], faces[i][1])) {
      if (!groups.has(arc.tone)) groups.set(arc.tone, []);
      groups.get(arc.tone).push(arc);
    }
    for (const list of groups.values()) list.sort((x, y) => centreOf(x, light.phi) - centreOf(y, light.phi));
    return { i, u, groups };
  };
  const same = (x, y) => {
    if (x.groups.size !== y.groups.size) return false;
    for (const [tone, list] of x.groups) if ((y.groups.get(tone) ?? []).length !== list.length) return false;
    return true;
  };
  const align = (reference, arc) => {
    const out = { ...arc };
    const centre = (reference.from + reference.to) / 2;
    while ((out.from + out.to) / 2 - centre > Math.PI) {
      out.from -= TAU;
      out.to -= TAU;
    }
    while (centre - (out.from + out.to) / 2 > Math.PI) {
      out.from += TAU;
      out.to += TAU;
    }
    return out;
  };
  const strayOf = (i, a, mid, b) => {
    let worst = 0;
    for (const [tone, list] of mid.groups) {
      list.forEach((arc, index) => {
        const lo = align(arc, a.groups.get(tone)[index]);
        const hi = align(arc, b.groups.get(tone)[index]);
        for (const key of ["from", "to"]) {
          const p = pointAt(i, mid.u, arc[key]);
          const p0 = pointAt(i, a.u, lo[key]);
          const p1 = pointAt(i, b.u, hi[key]);
          worst = Math.max(worst, Math.hypot(p[0] - (p0[0] + p1[0]) / 2, p[1] - (p0[1] + p1[1]) / 2));
        }
      });
    }
    return worst;
  };
  const sheet = (tone, levels) => {
    levels[0].groups.get(tone).forEach((arc, index) => {
      const chain = [arc];
      for (let k = 1; k < levels.length; k++) chain.push(align(chain[k - 1], levels[k].groups.get(tone)[index]));
      const last = levels.length - 1;
      const points = [...arcPoints(levels[0].i, levels[0].u, chain[0].from, chain[0].to)];
      for (let k = 1; k < last; k++) points.push(pointAt(levels[k].i, levels[k].u, chain[k].to));
      points.push(...arcPoints(levels[last].i, levels[last].u, chain[last].from, chain[last].to).reverse());
      for (let k = last - 1; k >= 1; k--) points.push(pointAt(levels[k].i, levels[k].u, chain[k].from));
      buckets[tone].push(pathOf(oriented(points), true));
    });
  };
  const overlap = (x, y) => Math.min(x.to, y.to) - Math.max(x.from, y.from);
  const strip = (tone, a, b) => {
    const below = a.groups.get(tone) ?? [];
    const above = (b.groups.get(tone) ?? []).map((arc) => ({ arc, used: false }));
    const quad = (lo, hi) => {
      const points = [...arcPoints(a.i, a.u, lo.from, lo.to), ...arcPoints(b.i, b.u, hi.from, hi.to).reverse()];
      buckets[tone].push(pathOf(oriented(points), true));
    };
    for (const arc of below) {
      let best = null;
      let score = -Infinity;
      for (const entry of above) {
        if (entry.used) continue;
        const aligned = align(arc, entry.arc);
        const value = overlap(arc, aligned);
        if (value > score) (score = value), (best = entry);
      }
      if (best && score > -0.05) {
        best.used = true;
        quad(arc, align(arc, best.arc));
      } else {
        const centre = (arc.from + arc.to) / 2;
        quad(arc, { from: centre, to: centre });
      }
    }
    for (const entry of above) {
      if (entry.used) continue;
      const centre = (entry.arc.from + entry.arc.to) / 2;
      quad({ from: centre, to: centre }, entry.arc);
    }
  };
  const k = scaleOf(P);
  let run = [];
  const flush = () => {
    const tones = [...new Set(run.flatMap((level) => [...level.groups.keys()]))].sort((x, y) => x - y);
    for (const tone of tones) {
      const countOf = (level) => (level.groups.get(tone) ?? []).length;
      let start = 0;
      for (let at = 1; at <= run.length; at++) {
        if (at < run.length && countOf(run[at - 1]) === countOf(run[at])) continue;
        if (at - 1 > start && countOf(run[start])) sheet(tone, run.slice(start, at));
        if (at < run.length) strip(tone, run[at - 1], run[at]);
        start = at;
      }
    }
    run = [];
  };
  for (let i = 0; i < m - 1; i++) {
    const ds = meridian[i + 1][0] - meridian[i][0];
    if (Math.abs(ds) < 1e-9) {
      flush();
      continue;
    }
    const count = Math.max(1, rows);
    const reach = (Math.hypot(ds, meridian[i + 1][1] - meridian[i][1]) * k) / count;
    const limit = Math.max(1, Math.min(deepest, Math.ceil(Math.log2(Math.max(2, reach / fineness)))));
    const coarse = Array.from({ length: count + 1 }, (_, index) => levelOf(i, index / count));
    run.push(coarse[0]);
    const refine = (a, b, depth) => {
      const mid = levelOf(i, (a.u + b.u) / 2);
      const split = depth < limit && (!same(a, b) || !same(a, mid) || (depth < 6 && strayOf(i, a, mid, b) > error));
      if (!split) {
        run.push(b);
        return;
      }
      refine(a, mid, depth + 1);
      refine(mid, b, depth + 1);
    };
    for (let index = 1; index <= count; index++) refine(coarse[index - 1], coarse[index], 0);
  }
  flush();
  return buckets;
}

function sideOf(meridian) {
  const m = meridian.length;
  let first = 0;
  let last = m - 1;
  if (meridian[0][1] <= 1e-9) first = 1;
  if (meridian[m - 1][1] <= 1e-9) last = m - 2;
  const side = meridian.slice(first, last + 1);
  for (let index = 1; index < side.length; index++) if (side[index][0] - side[index - 1][0] <= 1e-9) return null;
  return side.length >= 3 ? side : null;
}

function surfaceOf(side, F, P, rims, { samples = 96, slope = null } = {}) {
  const V = viewOf(P);
  const aV = dot3(F.a, V);
  const facing = Math.atan2(dot3(F.v, V), dot3(F.u, V));
  const [left, right] = silhouettePoints(side, F, P, { samples, slope });
  if (left.length <= samples || right.length <= samples) return null;
  const s0 = side[0][0];
  const s1 = side[side.length - 1][0];
  const angleOf = (point) => angleToward(F, sub3(point, add3(F.o, mul3(F.a, dot3(sub3(point, F.o), F.a)))));
  const wrap = (angle) => ((angle % TAU) + TAU) % TAU;
  const arc = (s, r, from, to, through) => {
    let sweep = wrap(to - from);
    if (wrap(through - from) > sweep) sweep -= TAU;
    const count = Math.max(4, Math.ceil(Math.abs(sweep) / (TAU / 96)), Math.ceil((Math.abs(sweep) * r * scaleOf(P)) / 1.5));
    return Array.from({ length: count + 1 }, (_, index) => iso(pointOf(F, s, r, from + (sweep * index) / count), P));
  };
  const r0 = side[0][1];
  const r1 = side[side.length - 1][1];
  const bottom = -aV > 0 ? facing + Math.PI : facing;
  const top = aV > 0 ? facing + Math.PI : facing;
  const L = left.map((point) => iso(point, P));
  const R = right.map((point) => iso(point, P));
  const topArc = arc(s1, r1, angleOf(left[left.length - 1]), angleOf(right[right.length - 1]), top);
  const bottomArc = arc(s0, r0, angleOf(right[0]), angleOf(left[0]), bottom);
  const keepFirst = rims === "all" || rims === "first" || rims === "ends";
  const keepLast = rims === "all" || rims === "last" || rims === "ends";
  const fill = pathOf([...L, ...topArc, ...[...R].reverse(), ...bottomArc], true);
  const outline = [pathOf(L), pathOf(R), keepLast ? pathOf(topArc) : "", keepFirst ? pathOf(bottomArc) : ""].join("");
  const hull = hullOf([...arc(s0, r0, 0, TAU - 1e-6, Math.PI), ...arc(s1, r1, 0, TAU - 1e-6, Math.PI), ...L, ...R]);
  let gap = 0;
  for (const p of [...L, ...R]) {
    let best = Infinity;
    for (let index = 0; index < hull.length; index++) {
      const a = hull[index];
      const b = hull[(index + 1) % hull.length];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t));
    }
    gap = Math.max(gap, best);
  }
  return { fill, outline, gap };
}

const softOf = (meridian) => meridian.some((point) => Boolean(point[2]));

function lathe(meridian, F, P, { steps = stepsFor(Math.max(...meridian.map(([, r]) => r)), 32, 160, scaleOf(P)), fill = "auto", hole = null, bevel = 0, rims = "all", smooth: asked = "auto", waist = 0.5 } = {}) {
  const smooth = asked === "auto" ? softOf(meridian) : asked;
  const V = viewOf(P);
  const L = lightOf(P);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const aL = dot3(F.a, L);
  const uL = dot3(F.u, L);
  const vL = dot3(F.v, L);
  const n = steps;
  const m = meridian.length;
  const rings = meridian.map(([s, r]) => Array.from({ length: n }, (_, j) => iso(pointOf(F, s, r, (j / n) * TAU), P)));
  const midC = [];
  const midS = [];
  for (let j = 0; j < n; j++) {
    const t = ((j + 0.5) / n) * TAU;
    midC.push(Math.cos(t));
    midS.push(Math.sin(t));
  }
  const seen = [];
  const tones = [];
  for (let i = 0; i < m - 1; i++) {
    const ds = meridian[i + 1][0] - meridian[i][0];
    const dr = meridian[i + 1][1] - meridian[i][1];
    const length = Math.hypot(ds, dr);
    const row = [];
    const toneRow = [];
    for (let j = 0; j < n; j++) {
      if (length < 1e-9) {
        row.push(false);
        toneRow.push(0);
        continue;
      }
      const facing = ds * (midC[j] * uV + midS[j] * vV) - dr * aV;
      const lit = (ds * (midC[j] * uL + midS[j] * vL) - dr * aL) / length;
      row.push(facing > 1e-6 * length);
      toneRow.push(bandOf(lit));
    }
    seen.push(row);
    tones.push(toneRow);
  }
  const buckets = [[], [], [], [], []];
  const all = [];
  const smoothed = smooth ? smoothRows(meridian, F, P, { steps, ...(smooth === true ? {} : smooth) }) : null;
  if (smoothed) smoothed.forEach((list, tone) => list.forEach((d) => (buckets[tone].push(d), all.push(d))));
  for (let i = 0; i < m - 1; i++) {
    if (smoothed && Math.abs(meridian[i + 1][0] - meridian[i][0]) > 1e-9) continue;
    const keys = seen[i].map((visible, j) => (visible ? tones[i][j] : null));
    for (const { key, run } of groupsOf(keys)) {
      const a = run.map((j) => rings[i][j]);
      const b = run.map((j) => rings[i + 1][j]).reverse();
      const d = pathOf(oriented([...a, ...b]), true);
      buckets[key].push(d);
      all.push(d);
    }
  }
  const phi = Math.atan2(vV, uV);
  const flatV = Math.hypot(uV, vV);
  const rangeOf = (i) => {
    const ds = meridian[i + 1][0] - meridian[i][0];
    const dr = meridian[i + 1][1] - meridian[i][1];
    if (Math.hypot(ds, dr) < 1e-9) return null;
    if (Math.abs(ds) < 1e-9 || flatV < 1e-9) return -dr * aV > 1e-9 ? [-1, 1] : null;
    const c = (dr * aV) / (ds * flatV);
    return ds > 0 ? [Math.max(-1, c), 1] : [-1, Math.min(1, c)];
  };
  const arcsOf = (ranges) => {
    if (ranges.some((range) => !range)) return [];
    const lo = Math.max(...ranges.map(([x]) => x));
    const hi = Math.min(...ranges.map(([, x]) => x));
    if (lo >= hi - 1e-9) return [];
    const near = Math.acos(Math.min(1, hi));
    const far = Math.acos(Math.max(-1, lo));
    if (hi >= 1 && lo <= -1) return [[phi, phi + TAU]];
    if (hi >= 1) return [[phi - far, phi + far]];
    if (lo <= -1) return [[phi + near, phi + TAU - near]];
    return [[phi + near, phi + far], [phi - far, phi - near]];
  };
  const along = (s, r, [from, to]) => {
    const count = Math.max(2, Math.ceil(((to - from) * Math.max(r, 1e-6) * scaleOf(P)) / 1.5));
    return Array.from({ length: count + 1 }, (_, j) => iso(pointOf(F, s, r, from + ((to - from) * j) / count), P));
  };
  const creases = [];
  for (let i = 1; i < m - 1; i++) {
    if (meridian[i][2] || meridian[i][1] <= 1e-9) continue;
    for (const arc of arcsOf([rangeOf(i - 1), rangeOf(i)])) creases.push(pathOf(along(meridian[i][0], meridian[i][1], arc)));
  }
  let bevelPath = "";
  if (bevel > 0 && m > 2) {
    const ends = [];
    if (meridian[0][1] <= 1e-9) ends.push([0, 1, 1]);
    if (meridian[m - 1][1] <= 1e-9) ends.push([m - 2, m - 2, m - 3]);
    for (const [cap, rim, side] of ends) {
      const [s, r] = meridian[rim];
      for (const arc of arcsOf([rangeOf(cap), rangeOf(side)])) {
        const inset = along(s, Math.max(0, r - bevel), arc);
        const edge = along(s, r, arc);
        bevelPath += pathOf([edge[0], ...inset.slice(1, -1), edge[edge.length - 1]]);
      }
    }
  }
  const { fill: fillPath, outline } = outlineOf(meridian, F, P, { steps: n, fill, hole, rims, smooth, waist, all });
  return {
    fill: fillPath,
    outline,
    crease: creases.join(""),
    top: buckets[4].join(""),
    shades: buckets.slice(0, 4).map((list) => list.join("")),
    bevel: bevelPath || undefined,
    seamless: Boolean(smoothed),
  };
}

function shapeOf(meridian, P, smooth) {
  if (smooth && smooth.radius) {
    const segments = meridian.slice(0, -1).map(([s0], index) => (Math.abs(meridian[index + 1][0] - s0) > 1e-9 ? { radius: smooth.radius, slope: smooth.slope } : null));
    return curved(meridian, P, segments);
  }
  const curves = smooth && !smooth.slope ? curveRuns(meridian) : null;
  return curves && curves.some(Boolean) ? curved(meridian, P, curves) : meridian;
}

function outlineOf(meridian, F, P, { steps = stepsFor(Math.max(...meridian.map(([, r]) => r)), 32, 160, scaleOf(P)), fill = "auto", hole = null, rims = "all", smooth: asked = "auto", waist = 0.5, all = null } = {}) {
  const smooth = asked === "auto" ? softOf(meridian) : asked;
  const n = steps;
  let fillPath;
  let outline;
  const shape = shapeOf(meridian, P, smooth);
  const side = fill === "auto" || fill === "surface" ? sideOf(shape) : null;
  const surface = side && !hole ? surfaceOf(side, F, P, rims, { slope: smooth && smooth.slope ? smooth.slope : null }) : null;
  if (surface && (fill === "surface" || surface.gap > waist)) {
    fillPath = surface.fill;
    outline = surface.outline;
  } else if (fill === "hull" || fill === "auto" || fill === "surface") {
    const most = Math.max(...shape.map(([, r]) => r));
    const around = Math.min(320, Math.max(n, Math.ceil((TAU * most * scaleOf(P)) / 1.5)));
    const tagged = [];
    shape.forEach(([s, r], index) => {
      for (let j = 0; j < around; j++) tagged.push({ p: iso(pointOf(F, s, r, (j / around) * TAU), P), ring: index });
    });
    const hull = hullTagged(tagged);
    const holePath = hole ? pathOf(Array.from({ length: around }, (_, j) => iso(pointOf(F, hole[0], hole[1], (j / around) * TAU), P)), true) : "";
    fillPath = pathOf(hull.map(({ p }) => p), true) + holePath;
    if (rims === "all") {
      outline = pathOf(hull.map(({ p }) => p), true) + holePath;
    } else {
      const keepFirst = rims === "first" || rims === "ends";
      const keepLast = rims === "last" || rims === "ends";
      const edges = hull.map((a, index) => {
        const b = hull[(index + 1) % hull.length];
        const same = a.ring === b.ring;
        const keep = !same || (a.ring !== 0 && a.ring !== shape.length - 1) || (keepFirst && a.ring === 0) || (keepLast && a.ring === shape.length - 1);
        return [a.p, b.p, keep];
      });
      outline = chains(edges).map((points) => pathOf(points)).join("") + holePath;
    }
  } else {
    fillPath = all ? all.join("") : (({ shades, top }) => [...shades, top].join(""))(lathe(meridian, F, P, { steps: n, fill: "auto", hole, rims, smooth, waist }));
    outline = "";
  }
  return { fill: fillPath, outline };
}

const signedArea = (points) => points.reduce((sum, [x, y], index) => {
  const [nx, ny] = points[(index + 1) % points.length];
  return sum + x * ny - nx * y;
}, 0);

const oriented = (points) => (signedArea(points) < 0 ? [...points].reverse() : points);

const saddleStart = (R, a, angle) => Math.sqrt(Math.max(0, R * R - a * a * Math.cos(angle) ** 2));

function saddleOf(F, a, start, s1, P, { steps = stepsFor(a, 24) } = {}) {
  const V = viewOf(P);
  const L = lightOf(P);
  const n = steps;
  const angle = (j) => (j / n) * TAU;
  const from = typeof start === "function" ? start : (t) => saddleStart(start, a, t);
  const low = Array.from({ length: n }, (_, j) => iso(pointOf(F, from(angle(j)), a, angle(j)), P));
  const high = Array.from({ length: n }, (_, j) => iso(pointOf(F, s1, a, angle(j)), P));
  const seen = [];
  const tones = [];
  for (let j = 0; j < n; j++) {
    const normal = radialOf(F, angle(j + 0.5));
    seen.push(dot3(normal, V) > 1e-6);
    tones.push(bandOf(dot3(normal, L)));
  }
  const buckets = [[], [], [], [], []];
  const fills = [];
  const keys = seen.map((visible, j) => (visible ? tones[j] : null));
  for (const { key, run } of groupsOf(keys)) {
    const d = pathOf(oriented([...run.map((j) => low[j]), ...run.map((j) => high[j]).reverse()]), true);
    buckets[key].push(d);
    fills.push(d);
  }
  const capSeen = dot3(F.a, V) > 1e-6;
  if (capSeen) {
    const d = pathOf(oriented(high), true);
    buckets[bandOf(dot3(F.a, L))].push(d);
    fills.push(d);
  }
  const front = runsOf(seen);
  const back = runsOf(seen.map((visible) => !visible));
  const edges = [];
  for (const run of front) {
    edges.push(pathOf(run.map((j) => low[j])));
    edges.push(pathOf([low[run[0]], high[run[0]]]), pathOf([low[run[run.length - 1]], high[run[run.length - 1]]]));
  }
  for (const run of capSeen ? back : front) edges.push(pathOf(run.map((j) => high[j])));
  return {
    fill: fills.join(""),
    outline: edges.join(""),
    crease: capSeen ? front.map((run) => pathOf(run.map((j) => high[j]))).join("") : "",
    top: buckets[4].join(""),
    shades: buckets.slice(0, 4).map((list) => list.join("")),
    seamless: true,
  };
}

function prismOf(F, polygon, s0, s1, P) {
  const V = viewOf(P);
  const L = lightOf(P);
  const ring = oriented(polygon.map(([x, y]) => [x, y]));
  const n = ring.length;
  const at = (s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  const low = ring.map((point) => iso(at(s0, point), P));
  const high = ring.map((point) => iso(at(s1, point), P));
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (let j = 0; j < n; j++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[(j + 1) % n];
    const normal = unit3(add3(mul3(F.u, y1 - y0), mul3(F.v, -(x1 - x0))));
    const visible = dot3(normal, V) > 1e-6;
    seen.push(visible);
    if (visible) buckets[bandOf(dot3(normal, L))].push(pathOf([low[j], low[(j + 1) % n], high[(j + 1) % n], high[j]], true));
  }
  const ends = [[s0, low, mul3(F.a, -1)], [s1, high, F.a]];
  const capSeen = ends.map(([, , normal]) => dot3(normal, V) > 1e-6);
  ends.forEach(([, points, normal], index) => capSeen[index] && buckets[bandOf(dot3(normal, L))].push(pathOf(points, true)));
  const hull = hullOf([...low, ...high]);
  const creases = [];
  for (let j = 0; j < n; j++) {
    const prev = (j - 1 + n) % n;
    const a = [ring[j][0] - ring[prev][0], ring[j][1] - ring[prev][1]];
    const b = [ring[(j + 1) % n][0] - ring[j][0], ring[(j + 1) % n][1] - ring[j][1]];
    const sharp = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]) || 1) < Math.cos(0.35);
    if (sharp && seen[j] && seen[prev]) creases.push(pathOf([low[j], high[j]]));
    ends.forEach(([, points], index) => capSeen[index] && seen[j] && creases.push(pathOf([points[j], points[(j + 1) % n]])));
  }
  return { fill: pathOf(hull, true), outline: pathOf(hull, true), crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((list) => list.join("")) };
}

function stadium(r0, r1, offset, steps = 32) {
  const circle = (cx, r) => Array.from({ length: steps }, (_, index) => [cx + r * Math.cos((index / steps) * TAU), r * Math.sin((index / steps) * TAU)]);
  return hullOf([...circle(0, r0), ...circle(offset, r1)]);
}

function sphereOf(centre, r, P, { steps = 48 } = {}) {
  const V = viewOf(P);
  const L = lightOf(P);
  const F = frameAlong(centre, V);
  const flat = (p) => iso(p, P);
  const rim = Array.from({ length: steps }, (_, index) => pointOf(F, 0, r, (index / steps) * TAU));
  const outline = pathOf(rim.map(flat), true);
  const capOf = (threshold) => {
    const points = rim.filter((p) => dot3(sub3(p, centre), L) / r >= threshold).map(flat);
    const c = dot3(L, V);
    const LF = frameAlong(add3(centre, mul3(L, r * threshold)), L);
    const radius = r * Math.sqrt(Math.max(0, 1 - threshold * threshold));
    for (let index = 0; index < steps; index++) {
      const p = pointOf(LF, 0, radius, (index / steps) * TAU);
      if (dot3(sub3(p, centre), V) >= -1e-9) points.push(flat(p));
    }
    if (c > threshold) points.push(flat(add3(centre, mul3(V, r))));
    return points.length > 2 ? pathOf(hullOf(points), true) : "";
  };
  const shades = [outline, capOf(BANDS[1]), capOf(BANDS[2]), capOf(BANDS[3])];
  return { fill: outline, outline, crease: "", top: "", shades, seamless: true };
}

const disc = (s0, s1, r, F, P, options = {}) =>
  lathe(
    [
      [s0, 0],
      [s0, r],
      [s1, r],
      [s1, 0],
    ],
    F,
    P,
    { steps: stepsFor(r, 32, 160, scaleOf(P)), ...options },
  );

const ringBand = (s0, s1, rIn, rOut, F, P, options = {}) =>
  lathe(
    [
      [s0, rIn],
      [s0, rOut],
      [s1, rOut],
      [s1, rIn],
    ],
    F,
    P,
    { steps: stepsFor(rOut, 32, 160, scaleOf(P)), hole: null, ...options },
  );

function solidOf(profile, F, P, options = {}) {
  const first = profile[0];
  const last = profile[profile.length - 1];
  const meridian = [[first[0], 0], ...profile, [last[0], 0]];
  const most = Math.max(...profile.map(([, r]) => r));
  return lathe(meridian, F, P, { steps: stepsFor(most, 32, 160, scaleOf(P)), ...options });
}

function bandOfProfile(profile, F, P, options = {}) {
  const most = Math.max(...profile.map(([, r]) => r));
  return lathe(profile, F, P, { steps: stepsFor(most, 32, 160, scaleOf(P)), ...options });
}

function silhouettePoints(profile, F, P, { samples = 72, slope: given = null, radius = null } = {}) {
  const V = viewOf(P);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const facing = Math.atan2(vV, uV);
  const flat = Math.hypot(uV, vV) || 1e-9;
  const s0 = profile[0][0];
  const s1 = profile[profile.length - 1][0];
  const radiusAt = radius ?? ((s) => {
    let index = 1;
    while (index < profile.length - 1 && profile[index][0] < s) index++;
    const [sa, ra] = profile[index - 1];
    const [sb, rb] = profile[index];
    return ra + ((rb - ra) * (s - sa)) / (sb - sa || 1);
  });
  const side = (sign) => {
    const points = [];
    for (let step = 0; step <= samples; step++) {
      const s = s0 + ((s1 - s0) * step) / samples;
      const h = (s1 - s0) / samples / 2 || 0.01;
      const slope = given ? given(s) : (radiusAt(Math.min(s1, s + h)) - radiusAt(Math.max(s0, s - h))) / (Math.min(s1, s + h) - Math.max(s0, s - h) || 1);
      const c = (slope * aV) / flat;
      if (Math.abs(c) > 1) continue;
      points.push(pointOf(F, s, radiusAt(s), facing + sign * Math.acos(c)));
    }
    return points;
  };
  return [side(1), side(-1)];
}

const silhouetteOf = (profile, F, P, options = {}) =>
  silhouettePoints(profile, F, P, options)
    .map((points) => pathOf(points.map((point) => iso(point, P))))
    .join("");

function profileCurve(profile, { slope = null, radius = null } = {}) {
  for (let index = 1; index < profile.length; index++) if (profile[index][0] - profile[index - 1][0] <= 1e-9) throw new Error(`profileCurve: s must rise along the profile (point ${index} at s = ${profile[index][0]})`);
  const segments = curveRuns(profile);
  const s0 = profile[0][0];
  const s1 = profile[profile.length - 1][0];
  const find = (s) => {
    let lo = 0;
    let hi = profile.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (profile[mid][0] <= s) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const linear = (index, s) => {
    const [sa, ra] = profile[index];
    const [sb, rb] = profile[index + 1];
    return [ra + ((rb - ra) * (s - sa)) / (sb - sa), (rb - ra) / (sb - sa)];
  };
  const radiusAt = radius ?? ((s) => {
    const at = Math.max(s0, Math.min(s1, s));
    const index = find(at);
    return segments[index] ? segments[index].radius(at) : linear(index, at)[0];
  });
  const slopeAt = slope ?? ((s) => {
    const at = Math.max(s0, Math.min(s1, s));
    const index = find(at);
    return segments[index] ? segments[index].slope(at) : linear(index, at)[1];
  });
  return { s0, s1, radius: radiusAt, slope: slopeAt, analytic: Boolean(slope && radius) };
}

function bandsOf(profile, cuts, F, P, { slope = null, radius = null, steps, rows = 6, rims = "none", fill = "auto", samples = 72 } = {}) {
  const curve = profileCurve(profile, { slope, radius });
  const { s0, s1 } = curve;
  const stops = [s0, ...[...new Set(cuts)].filter((s) => s > s0 + 1e-6 && s < s1 - 1e-6).sort((a, b) => a - b), s1];
  const most = Math.max(...profile.map(([, r]) => r), ...stops.map((s) => curve.radius(s)));
  const n = steps ?? stepsFor(most, 32, 160, scaleOf(P));
  const knot = (s, soft) => (soft ? [s, curve.radius(s), 1] : [s, curve.radius(s)]);
  const meridianOf = (a, b) => [knot(a), ...profile.filter(([s]) => s > a + 1e-9 && s < b - 1e-9).map(([s, , soft]) => knot(s, soft)), knot(b)];
  const shading = { slope: curve.slope, radius: curve.radius, rows };
  const bands = stops.slice(0, -1).map((a, index) => {
    const b = stops[index + 1];
    const meridian = meridianOf(a, b);
    const paths = lathe(meridian, F, P, { steps: n, rims, fill, smooth: shading });
    const seam = index < stops.length - 2 ? arcOf(F, b, curve.radius(b), P, { slope: curve.slope(b) }) : "";
    return { s0: a, s1: b, profile: meridian, paths: { ...paths, outline: "" }, outline: paths.outline, seam };
  });
  const sidesOf = (from = s0, to = s1, { ends = false, count = samples } = {}) => {
    const span = [Math.max(s0, from), Math.min(s1, to)];
    const dense = Array.from({ length: count + 1 }, (_, index) => knot(span[0] + ((span[1] - span[0]) * index) / count, true));
    const points = silhouettePoints(dense, F, P, { samples: count, slope: curve.slope, radius: curve.radius });
    const rim = (s) => arcOf(F, s, curve.radius(s), P, { slope: curve.slope(s) });
    const rimsAt = ends === true ? span : ends === "first" ? [span[0]] : ends === "last" ? [span[1]] : [];
    return { d: points.map((list) => pathOf(list.map((point) => iso(point, P)))).join("") + rimsAt.map(rim).join(""), points };
  };
  return { bands, sidesOf, radius: curve.radius, slope: curve.slope, steps: n, s0, s1 };
}

function arcOf(F, s, r, P, { slope = 0, steps = 0, least = 0.02, inward = false, from = 0, to = TAU, trim = 0.3 } = {}) {
  const V = viewOf(P);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const flat = Math.hypot(uV, vV);
  const phi = Math.atan2(vV, uV);
  const norm = Math.hypot(1, slope);
  const full = Math.abs(to - from - TAU) < 1e-9;
  let visible;
  if (flat < 1e-9) visible = (inward ? slope * aV / norm > least : -slope * aV / norm > least) ? [[phi, phi + TAU]] : [];
  else if (inward) {
    const c = (slope * aV - least * norm) / flat;
    visible = c <= -1 ? [] : c >= 1 ? [[phi, phi + TAU]] : [[phi + Math.acos(c), phi + TAU - Math.acos(c)]];
  } else {
    const c = (least * norm + slope * aV) / flat;
    visible = c >= 1 ? [] : c <= -1 ? [[phi, phi + TAU]] : [[phi - Math.acos(c), phi + Math.acos(c)]];
  }
  const at = (t) => iso(pointOf(F, s, r, t), P);
  const speed = (t) => {
    const a = at(t - 1e-3);
    const b = at(t + 1e-3);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2e-3;
  };
  const count = (span) => Math.max(2, Math.ceil(((steps || stepsFor(r, 24, 112)) * span) / TAU), Math.ceil((span * r * scaleOf(P)) / 1.5));
  const out = [];
  for (const [a, b] of visible) {
    if (b - a >= TAU - 1e-9 && full) {
      const n = count(TAU);
      out.push(pathOf(Array.from({ length: n }, (_, j) => at(from + (j / n) * TAU)), true));
      continue;
    }
    const pieces = full ? [[a, b, true, true]] : [];
    if (!full)
      for (let turn = -2; turn <= 2; turn++) {
        const lo = Math.max(a + turn * TAU, from);
        const hi = Math.min(b + turn * TAU, to);
        if (hi - lo > 1e-6) pieces.push([lo, hi, lo > from + 1e-9, hi < to - 1e-9]);
      }
    for (const [lo, hi, limb0, limb1] of pieces) {
      const span = hi - lo;
      const cut0 = limb0 && trim > 0 ? Math.min(span * 0.25, trim / (speed(lo) || 1)) : 0;
      const cut1 = limb1 && trim > 0 ? Math.min(span * 0.25, trim / (speed(hi) || 1)) : 0;
      const t0 = lo + cut0;
      const t1 = hi - cut1;
      const n = count(t1 - t0);
      out.push(pathOf(Array.from({ length: n + 1 }, (_, j) => at(t0 + ((t1 - t0) * j) / n))));
    }
  }
  return out.join("");
}

function circleOf(F, s, r, P, steps = 0) {
  const count = steps || stepsFor(r, 24, 112);
  return pathOf(
    Array.from({ length: count }, (_, j) => iso(pointOf(F, s, r, (j / count) * TAU), P)),
    true,
  );
}

function spokesOf(F, s, r0, r1, count, P, { phase = 0, sweep = 0, from = 0, to = TAU } = {}) {
  const lines = [];
  for (let index = 0; index < count; index++) {
    const t = phase + from + (index / count) * (to - from);
    lines.push(pathOf([iso(pointOf(F, s, r0, t), P), iso(pointOf(F, s, r1, t + sweep), P)]));
  }
  return lines.join("");
}

const fadeOf = (value, [lo, hi]) => {
  const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo || 1e-9)));
  return t * t * (3 - 2 * t);
};

function ribsOf(F, s0, s1, r, count, P, { phase = 0, twist = 0, least = 0.12, r1 = r, fade = null, seams = false } = {}) {
  const V = viewOf(P);
  const lines = [];
  const slope = (r1 - r) / (s1 - s0 || 1);
  for (let index = 0; index < count; index++) {
    const t = phase + (index / count) * TAU;
    const radial = radialOf(F, t + twist / 2);
    const normal = unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]);
    const facing = dot3(normal, V);
    const d = pathOf([iso(pointOf(F, s0, r, t), P), iso(pointOf(F, s1, r1, t + twist), P)]);
    if (fade) {
      const alpha = fadeOf(facing, fade);
      if (alpha > 0.02) lines.push({ d, alpha });
      continue;
    }
    if (facing < least) continue;
    lines.push(d);
  }
  const ends = seams ? [seams === "last" ? "" : arcOf(F, s0, r, P, { slope }), seams === "first" ? "" : arcOf(F, s1, r1, P, { slope })].filter(Boolean) : [];
  if (fade) return [...lines, ...ends.map((d) => ({ d, alpha: 1 }))];
  return [...lines, ...ends].join("");
}

function rodOut(F, from, to, r, P, { stroke = 0, ...options } = {}) {
  const pad = 0.35 / scaleOf(P);
  const ring = (s) => Array.from({ length: 48 }, (_, index) => iso(pointOf(F, s, r + pad, (index / 48) * TAU), P));
  return {
    paths: disc(from - stroke, to, r, F, P, options),
    clip: pathOf(hullOf([...ring(from), ...ring(to + stroke)]), true),
    from,
    to,
    stroke,
    reach: to + stroke,
  };
}

function dotsOf(F, s, r, count, P, { phase = 0, slope = 0, least = 0.08, all = false, fade = null } = {}) {
  const V = viewOf(P);
  const out = [];
  for (let index = 0; index < count; index++) {
    const t = phase + (index / count) * TAU;
    let alpha = 1;
    if (!all) {
      const radial = radialOf(F, t);
      const normal = unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]);
      const facing = dot3(normal, V);
      if (fade) alpha = fadeOf(facing, fade);
      else if (facing < least) continue;
      if (alpha <= 0.02) continue;
    }
    const [x, y] = iso(pointOf(F, s, r, t), P);
    out.push(alpha < 1 ? [x, y, alpha] : [x, y]);
  }
  return out;
}

function facingOf(F, angle, P, slope = 0) {
  const radial = radialOf(F, angle);
  return dot3(unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]), viewOf(P));
}

function fillet(points, radius, perArc = 7, { P = null, tube = 0, margin = 1.3 } = {}) {
  if (points.length < 3) return points.map((p) => [...p]);
  const V = P && tube ? viewOf(P) : null;
  const out = [[...points[0]]];
  for (let index = 1; index < points.length - 1; index++) {
    const prev = points[index - 1];
    const here = points[index];
    const next = points[index + 1];
    const into = unit3(sub3(here, prev));
    const outOf = unit3(sub3(next, here));
    const cosTurn = Math.max(-1, Math.min(1, dot3(into, outOf)));
    const turn = Math.acos(cosTurn);
    if (turn < 1e-3) {
      out.push([...here]);
      continue;
    }
    const room = Math.min(len3(sub3(here, prev)), len3(sub3(next, here))) * 0.48;
    const facing = V ? Math.abs(dot3(unit3(cross3(into, outOf)), V)) : 1;
    const bend = V ? Math.max(radius, (margin * tube) / (0.7 * Math.max(0.05, facing) ** 2)) : radius;
    const cut = Math.min(bend * Math.tan(turn / 2), room);
    const a = sub3(here, mul3(into, cut));
    const b = add3(here, mul3(outOf, cut));
    const count = Math.max(2, Math.ceil((perArc * turn) / (Math.PI / 2)));
    for (let step = 0; step <= count; step++) {
      const t = step / count;
      const p0 = lerp3(a, here, t);
      const p1 = lerp3(here, b, t);
      out.push(lerp3(p0, p1, t));
    }
  }
  out.push([...points[points.length - 1]]);
  return out;
}

function resample(points, spacing) {
  const lengths = [0];
  for (let index = 1; index < points.length; index++) lengths.push(lengths[index - 1] + len3(sub3(points[index], points[index - 1])));
  const total = lengths[lengths.length - 1];
  const count = Math.max(1, Math.round(total / spacing));
  const out = [];
  let segment = 1;
  for (let step = 0; step <= count; step++) {
    const at = (total * step) / count;
    while (segment < points.length - 1 && lengths[segment] < at) segment++;
    const a = points[segment - 1];
    const b = points[segment];
    const span = lengths[segment] - lengths[segment - 1] || 1;
    out.push(lerp3(a, b, Math.min(1, Math.max(0, (at - lengths[segment - 1]) / span))));
  }
  return out;
}

function pathLength(points) {
  let total = 0;
  for (let index = 1; index < points.length; index++) total += len3(sub3(points[index], points[index - 1]));
  return total;
}

function cut(points, from, to) {
  const out = [];
  let walked = 0;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1];
    const b = points[index];
    const length = len3(sub3(b, a));
    const start = walked;
    const end = walked + length;
    if (end >= from && start <= to) {
      const t0 = Math.max(0, (from - start) / (length || 1));
      const t1 = Math.min(1, (to - start) / (length || 1));
      if (!out.length) out.push(lerp3(a, b, t0));
      out.push(lerp3(a, b, t1));
    }
    walked = end;
  }
  return out;
}

const pointAlong = (points, at) => {
  const piece = cut(points, at, at + 0.01);
  return piece[0] ?? points[points.length - 1];
};

function tangentAlong(points, at) {
  const total = pathLength(points);
  const a = pointAlong(points, Math.max(0, at - 0.6));
  const b = pointAlong(points, Math.min(total, at + 0.6));
  return unit3(sub3(b, a));
}

function spiral(F, s, r0, r1, a0, a1, steps = 28) {
  const out = [];
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    out.push(pointOf(F, s, r0 + (r1 - r0) * t, a0 + (a1 - a0) * t));
  }
  return out;
}

function arcPoints(F, s, r, a0, a1, steps = 24) {
  return Array.from({ length: steps + 1 }, (_, index) => pointOf(F, s, r, a0 + ((a1 - a0) * index) / steps));
}

return { frameOf, frameAlong, prismOf, pointOf, solidOf, sphereOf, circleOf, arcOf };})();

// An artist's mannequin with ball joints, shared by Fig 4 (treadmill) and Fig 5 (bike).
//
// Turned wooden segments between steel ball joints. It is the patient in these
// figures, and its joints are exactly what a markerless gait camera tracks.
// Proportions are the standard segment-length fractions of standing height
// (Drillis & Contini 1966, as tabled in Winter, Biomechanics and Motor Control of
// Human Movement, 4th ed., 2009, Fig. 4.1) for a 170 cm adult.
//
// Pure geometry: no kit imports, so the page can inline it with `export`
// stripped. `skeletonOf` places the joints from a pose; `partsOf` turns the
// joints into turned solids, balls and two foot blocks that the caller draws
// with the kit's lathe (`solidOf`, `sphereOf`, `prismOf`). Everything is one
// object, MANNEQUIN, so nothing clashes with the kit's globals in the page.
const MANNEQUIN = (() => {
  const H = 170;
  const footLen = 0.152 * H;
  const BODY = {
    H,
    thigh: 0.245 * H, //        hip joint → knee
    shank: 0.246 * H, //        knee → ankle
    ankleZ: 0.039 * H, //       ankle joint above the sole
    foot: footLen, //           heel → toe tip
    ankleX: 0.21 * footLen, //  ankle joint forward of the heel
    ball: 0.72 * footLen, //    ball of the foot (metatarsal heads) from the heel
    hipHalf: 8.5, //            hip joint centres ≈ 0.1 H apart
    kneeHalf: 7.2,
    ankleHalf: 5.2, //          runners land close to the midline
    trunk: 0.288 * H, //        hip line → shoulder line (0.818 H − 0.530 H)
    shoulderHalf: 0.106 * H,
    upperArm: 0.186 * H,
    forearm: 0.146 * H,
    hand: 0.108 * H,
    chin: 0.34 * H, //          hip line → chin (0.870 H − 0.530 H)
    head: 0.13 * H, //          chin → crown
  };
  const R = { hip: 5.4, knee: 4.7, ankle: 3.3, waist: 6.4, neck: 3.9, shoulder: 4.6, elbow: 3.5, wrist: 2.5 };

  // ---------------------------------------------------------------- vectors (local: the page has its own)
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a) => mul(a, 1 / (len(a) || 1));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
  /** Same convention as the kit's G.frameAlong. */
  function frameAlong(o, a) {
    const axis = unit(a);
    const helper = Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    const u = unit(cross(helper, axis));
    return { o, a: axis, u, v: cross(axis, u) };
  }
  const RAD = Math.PI / 180;

  /**
   * Joint positions in the world.
   *   base     world point on the floor (or belt) straight under the pelvis
   *   heading  ° the body faces, from +x toward +y (0 = facing +x)
   *   pelvis   hip-joint height above base
   *   trunk    ° forward lean of the trunk about the hip line
   *   legs     { R, L }: sagittal { hip, knee, ankle } as [forward, up] relative to base, `sole` (rad, toe up +),
 *            optional `toe` (rad) and `width` ({ hip, knee, ankle } lateral offsets)
   *   arms     { R, L }: { shoulder: ° from vertical (+ forward), elbow: ° bend }
   */
  function skeletonOf({ base, heading = 0, pelvis, trunk = 0, legs, arms }) {
    const h = heading * RAD;
    const fwd = [Math.cos(h), Math.sin(h), 0];
    const left = [-Math.sin(h), Math.cos(h), 0];
    const up = [0, 0, 1];
    const at = (forward, side, z) => add(base, add(add(mul(fwd, forward), mul(left, side)), mul(up, z)));
    const J = { fwd, left, up };
    J.pelvis = at(0, 0, pelvis);
    const lean = trunk * RAD;
    J.axis = add(mul(fwd, Math.sin(lean)), mul(up, Math.cos(lean)));
    const onTrunk = (s, side = 0) => add(add(J.pelvis, mul(J.axis, s)), mul(left, side));
    J.waist = onTrunk(0.3 * BODY.trunk);
    J.neck = onTrunk(BODY.trunk + 0.025 * H);
    J.chin = onTrunk(BODY.chin);
    for (const [k, side] of [["R", -1], ["L", 1]]) {
      const leg = legs[k];
      const w = leg.width ?? {}; // optional lateral offsets: { hip, knee, ankle }
      J[`hip${k}`] = at(leg.hip[0], side * (w.hip ?? BODY.hipHalf), leg.hip[1]);
      J[`knee${k}`] = at(leg.knee[0], side * (w.knee ?? BODY.kneeHalf), leg.knee[1]);
      J[`ankle${k}`] = at(leg.ankle[0], side * (w.ankle ?? BODY.ankleHalf), leg.ankle[1]);
      // foot frame: origin at the heel's ground point, u along the sole toward the toe, v up off the sole
      const s = leg.sole;
      const u = add(mul(fwd, Math.cos(s)), mul(up, Math.sin(s)));
      const v = add(mul(fwd, -Math.sin(s)), mul(up, Math.cos(s)));
      const heel = sub(J[`ankle${k}`], add(mul(u, BODY.ankleX), mul(v, BODY.ankleZ)));
      J[`foot${k}`] = { o: heel, u, v, a: left };
      // toes: hinge at the ball of the foot, so they can stay flat while the heel lifts
      const t = leg.toe ?? s;
      const ball = add(heel, mul(u, BODY.ball));
      J[`toe${k}`] = { o: ball, u: add(mul(fwd, Math.cos(t)), mul(up, Math.sin(t))), v: add(mul(fwd, -Math.sin(t)), mul(up, Math.cos(t))), a: left };
      const arm = arms[k];
      const sh = add(onTrunk(BODY.trunk - 1.5), mul(left, side * BODY.shoulderHalf));
      J[`shoulder${k}`] = sh;
      const a1 = arm.shoulder * RAD;
      const out = mul(left, side * 0.1); // a little away from the body
      const d1 = unit(add(add(mul(fwd, Math.sin(a1)), mul(up, -Math.cos(a1))), out));
      J[`elbow${k}`] = add(sh, mul(d1, BODY.upperArm));
      const a2 = (arm.shoulder + arm.elbow) * RAD;
      const d2 = unit(add(add(mul(fwd, Math.sin(a2)), mul(up, -Math.cos(a2))), mul(left, -side * 0.12)));
      J[`wrist${k}`] = add(J[`elbow${k}`], mul(d2, BODY.forearm));
      J[`hand${k}`] = add(J[`wrist${k}`], mul(d2, BODY.hand * 0.55));
      J[`dir${k}`] = { upper: d1, fore: d2 };
    }
    J.head = add(J.chin, mul(unit(add(J.axis, mul(up, 1.5))), BODY.head * 0.5));
    return J;
  }

  // ---------------------------------------------------------------- turned profiles ([s, r, smooth]) along each segment
  // limbs are plain tapered dowels (a cone frustum shades smoothly round its axis and is cheap to redraw every frame)
  const taper = (length, r0, r1, { start = 0, end = 0 } = {}) => [[start, r0], [length - end, r1]];
  const egg = (length, r, { at = 0.55 } = {}) => {
    const pts = [];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = t * length;
      const x = t < at ? t / at : (1 - t) / (1 - at);
      pts.push([s, Math.max(0.01, r * Math.sqrt(Math.max(0, 1 - (1 - x) ** 2))), 1]);
    }
    return pts;
  };

  /**
   * The solids for a skeleton, each { name, kind: "lathe" | "ball" | "prism", ... , centre }.
   * Wood parts have `wood: true`; balls are steel joints. `dots` are the tracking points.
   */
  function partsOf(J) {
    const parts = [];
    let group = "trunk";
    const seg = (name, from, to, profileOf, extra = {}) => {
      const length = len(sub(to, from));
      const F = frameAlong(from, sub(to, from));
      parts.push({ name, group, kind: "lathe", F, profile: profileOf(length), centre: lerp(from, to, 0.5), wood: true, ...extra });
    };
    const ball = (name, c, r) => parts.push({ name, group, kind: "ball", c, r, centre: c });
    // trunk: pelvis barrel across the hips, waist ball, chest, shoulder yoke, neck, head
    {
      const o = add(J.pelvis, mul(J.axis, 2.5));
      const F = frameAlong(add(o, mul(J.left, -10.5)), J.left);
      const p = [[0, 4.6, 1], [0.7, 6.2, 1], [2.2, 7.2, 1], [5, 7.7, 1], [10.5, 7.9, 1], [16, 7.7, 1], [18.8, 7.2, 1], [20.3, 6.2, 1], [21, 4.6, 1]];
      parts.push({ name: "pelvis", group, rigid: true, kind: "lathe", F, profile: p, centre: o, wood: true });
    }
    ball("waist", J.waist, R.waist);
    {
      const F = frameAlong(add(J.pelvis, mul(J.axis, 0.3 * BODY.trunk + 4)), J.axis);
      const L = BODY.trunk - 0.3 * BODY.trunk - 2;
      const p = [[0, 6.2, 1], [0.25 * L, 9.8, 1], [0.55 * L, 12, 1], [0.8 * L, 12.2, 1], [0.95 * L, 10.4, 1], [L, 7.6, 1]];
      parts.push({ name: "chest", group, rigid: true, kind: "lathe", F, profile: p, centre: add(F.o, mul(J.axis, L / 2)), wood: true });
    }
    {
      const c = add(J.pelvis, mul(J.axis, BODY.trunk - 1.5));
      const half = BODY.shoulderHalf - 1;
      const F = frameAlong(add(c, mul(J.left, -half)), J.left);
      const p = [[0, 3.2, 1], [1.5, 4.2, 1], [half, 5.4, 1], [2 * half - 1.5, 4.2, 1], [2 * half, 3.2, 1]];
      parts.push({ name: "yoke", group, rigid: true, kind: "lathe", F, profile: p, centre: c, wood: true });
    }
    seg("neck", J.neck, J.chin, (l) => [[0, 3.4, 1], [l * 0.5, 3.1, 1], [l, 3.5, 1]], { rigid: true });
    ball("neckball", J.neck, R.neck);
    {
      const F = frameAlong(sub(J.chin, mul(unit(sub(J.head, J.chin)), 1.2)), sub(J.head, J.chin));
      parts.push({ name: "head", group, rigid: true, kind: "lathe", F, profile: egg(BODY.head + 1.2, 9.2, { at: 0.5 }), centre: J.head, wood: true });
    }
    for (const k of ["R", "L"]) {
      // legs
      group = `leg${k}`;
      ball(`hip${k}`, J[`hip${k}`], R.hip);
      seg(`thigh${k}`, J[`hip${k}`], J[`knee${k}`], (l) => taper(l, 6.4, 4.2, { start: 2.6, end: 2.4 }));
      ball(`knee${k}`, J[`knee${k}`], R.knee);
      seg(`shank${k}`, J[`knee${k}`], J[`ankle${k}`], (l) => taper(l, 4.6, 2.7, { start: 2.4, end: 1.8 }));
      ball(`ankle${k}`, J[`ankle${k}`], R.ankle);
      const f = J[`foot${k}`];
      const B = BODY;
      // the foot: a convex wedge from the heel to the ball, under the ankle ball, and a toe block hinged at the ball
      const poly = [[0.4, 0], [B.ball, 0], [B.ball + 0.6, 1.4], [B.ball - 0.4, 4.4], [B.ankleX + 2.6, B.ankleZ - 1.0], [B.ankleX - 2.4, B.ankleZ - 1.2], [0, 4.4], [-0.3, 1.6]];
      parts.push({ name: `foot${k}`, group: `leg${k}`, kind: "prism", F: f, poly, s0: -3.8, s1: 3.8, centre: add(f.o, mul(f.u, B.ball / 2)), wood: true });
      const t = J[`toe${k}`];
      const toe = B.foot - B.ball;
      parts.push({ name: `toe${k}`, group: `leg${k}`, kind: "prism", F: t, poly: [[0.9, 0], [toe - 1.6, 0], [toe, 1.2], [toe - 1.2, 2.6], [0.9, 3.4]], s0: -3.6, s1: 3.6, centre: add(t.o, mul(t.u, toe / 2)), wood: true });
      // arms
      group = `arm${k}`;
      ball(`shoulder${k}`, J[`shoulder${k}`], R.shoulder);
      seg(`upper${k}`, J[`shoulder${k}`], J[`elbow${k}`], (l) => taper(l, 3.9, 2.8, { start: 2.2, end: 1.8 }));
      ball(`elbow${k}`, J[`elbow${k}`], R.elbow);
      seg(`fore${k}`, J[`elbow${k}`], J[`wrist${k}`], (l) => taper(l, 3.1, 2.1, { start: 1.8, end: 1.2 }));
      ball(`wrist${k}`, J[`wrist${k}`], R.wrist);
      // a closed hand: a wooden ball just past the wrist
      parts.push({ name: `hand${k}`, group, kind: "ball", c: lerp(J[`wrist${k}`], J[`hand${k}`], 0.55), r: 3.4, centre: lerp(J[`wrist${k}`], J[`hand${k}`], 0.55), wood: true });
    }
    group = "trunk";
    const dots = ["pelvis", "head", "shoulderR", "shoulderL", "elbowR", "elbowL", "wristR", "wristL", "hipR", "hipL", "kneeR", "kneeL", "ankleR", "ankleL"].map((name) => ({ name, c: J[name] }));
    return { parts, dots };
  }

  return { BODY, R, skeletonOf, partsOf, frameAlong };
})();

// Fig 5 model: a ramp test on a bike ergometer → power, oxygen uptake, heart rate, RER, breathing,
// and the pedalling pose that draws it.
//
// Pure functions, no DOM. [n] keys refer to reference/truth-pack.md §5.
// One modelled person (45 years, 75 kg): a typical pattern, not a prediction.

const TRUTH = {
  bm: 75, //              kg, the modelled rider
  age: 45, //             years
  slope: 10.3, //         ml O₂/min per W on a ramp, 10.29 ± 1.01 in healthy men [7] HIGH
  rest: 3.5, //           ml/kg/min seated at rest, 1 MET [21] (convention) HIGH
  base: [150, 6], //      unloaded pedalling VO₂ = 150 + 6 × body mass, ml/min [9] MEDIUM
  rampMin: 10, //         ramp sized to reach the ceiling in about 10 min [1][3] HIGH
  tau: 0.6, //            min, VO₂ lags the ramp as a first-order response (30–45 s) LOW: shape only
  tauOff: 1.0, //         min, recovery fall-off LOW: shape only
  hrRest: 65, //          bpm, typical adult at rest LOW
  hrMax: [208, 0.7], //   HRmax = 208 − 0.7 × age [16] HIGH (a population average, ±10 bpm or more)
  rer: { rest: 0.8, vt1: 0.9, xVT1: 0.55, max: 1.15, bend: 1.6 }, // LOW shape; RER ≥ 1.10 at max is the usual criterion [11] HIGH
  cadence: 60, //         rpm, the usual target (55–70) [6] MEDIUM
  phases: { rest: 3, unloaded: 3, recovery: 3 }, // min [3][5] HIGH
  plateau: 45, //         ml/min softness of the ceiling (shape only)
  hold: 1.0, //           min the plateau runs before the test stops
  breath: { f0: 14, f1: 36, ve: 27, veTop: 10, xRCP: 0.85, exhale: 0.55 }, // breathing, LOW: drives the turbine and the hose only
  hoseArea: 9.6, //       cm², a 35 mm breathing hose
  ceilings: [25, 35, 45, 55], // ml/kg/min offered by the fitness control (model values, not norms)
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hrMaxOf = (age = TRUTH.age) => TRUTH.hrMax[0] - TRUTH.hrMax[1] * age;
const baseOf = (bm = TRUTH.bm) => TRUTH.base[0] + TRUTH.base[1] * bm;
const softMin = (a, b, k) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));

/** RER for a share x of VO₂max (LOW shape, crosses 1.0 near 80 %). */
function rerOf(x) {
  const r = TRUTH.rer;
  if (x <= r.xVT1) return r.rest + (r.vt1 - r.rest) * clamp(x / r.xVT1, 0, 1);
  return r.vt1 + (r.max - r.vt1) * Math.pow(clamp((x - r.xVT1) / (1 - r.xVT1), 0, 1), r.bend);
}

/**
 * The whole test for one ceiling (ml/kg/min): arrays sampled every 0.01 min.
 * Ramp rate is chosen, as a lab would, so the line reaches the ceiling in about 10 minutes.
 */
function testOf(ceilingPerKg) {
  const bm = TRUTH.bm;
  const max = ceilingPerKg * bm;
  const rest = TRUTH.rest * bm;
  const base = baseOf(bm);
  const R = (max - base) / (TRUTH.slope * TRUTH.rampMin); // W/min
  const p = TRUTH.phases;
  const t0 = p.rest + p.unloaded; // ramp start
  const tCross = t0 + (max - base) / (TRUTH.slope * R) + TRUTH.tau; // the lagging line meets the ceiling
  const tEnd = tCross + TRUTH.hold; // the plateau has held: stop
  const total = tEnd + p.recovery;
  const dt = 0.01;
  const n = Math.ceil(total / dt) + 1;
  const T = { t: new Float32Array(n), W: new Float32Array(n), vo2: new Float32Array(n), hr: new Float32Array(n), rer: new Float32Array(n), f: new Float32Array(n), ve: new Float32Array(n), pedal: new Uint8Array(n) };
  let y = rest;
  const hrMax = hrMaxOf();
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    const ramping = t >= t0 && t < tEnd;
    const W = ramping ? R * (t - t0) : 0;
    const pedal = t >= p.rest ? 1 : 0;
    const target = t < p.rest ? rest : softMin(base + TRUTH.slope * W, max, TRUTH.plateau);
    const tau = t >= tEnd ? TRUTH.tauOff : TRUTH.tau;
    if (i) y += ((target - y) * dt) / tau;
    const x = clamp((y - rest) / (max - rest), 0, 1);
    const xr = y / max;
    const rer = rerOf(xr);
    const b = TRUTH.breath;
    const f = b.f0 + b.f1 * xr * xr;
    const vco2 = (rer * y) / 1000; // L/min
    const ve = vco2 * (b.ve + b.veTop * clamp((xr - b.xRCP) / (1 - b.xRCP), 0, 1));
    T.t[i] = t;
    T.W[i] = W;
    T.vo2[i] = y;
    T.hr[i] = TRUTH.hrRest + (hrMax - TRUTH.hrRest) * x;
    T.rer[i] = rer;
    T.f[i] = f;
    T.ve[i] = ve;
    T.pedal[i] = pedal;
  }
  let peakW = 0;
  for (const w of T.W) peakW = Math.max(peakW, w);
  return { ...T, n, dt, ceiling: ceilingPerKg, max, rest, base, R, t0, tCross, tEnd, total, peakW };
}

/** State of a test at minute t (linear between samples). */
function sampleAt(T, t) {
  const u = clamp(t, 0, T.total) / T.dt;
  const i = Math.min(T.n - 2, Math.floor(u));
  const f = u - i;
  const lerp = (a) => a[i] + (a[i + 1] - a[i]) * f;
  const phase = t < TRUTH.phases.rest ? "rest" : t < T.t0 ? "unloaded" : t < T.tEnd ? "ramp" : "recovery";
  const vo2 = lerp(T.vo2);
  const f2 = lerp(T.f);
  const ve = lerp(T.ve);
  return { t, phase, W: lerp(T.W), vo2, perKg: vo2 / TRUTH.bm, hr: lerp(T.hr), rer: lerp(T.rer), f: f2, ve, tv: ve / f2, pedal: T.pedal[Math.round(u)] === 1 };
}

// ---------------------------------------------------------------- the rider on the bike (animation geometry)
// Sagittal [forward, up] points relative to the floor under the bottom bracket. A
// standard bike fit: knee bent about 30° at the bottom of the stroke, ball of the
// foot over the pedal axle, trunk leaning 35° forward. LOW as numbers; never printed.
const BIKE = {
  bb: [0, 32], //       bottom bracket
  crank: 17.2, //       cm (172.5 mm)
  hip: [-20, 0], //     hip x; height set by the knee-at-bottom fit below
  kneeBottom: 30, //    ° knee bend at the bottom of the stroke
  sole: -14, //         ° sole angle (toe down) with a little ankling through the stroke
  ankling: 8,
  grip: [46, 106, 22], // handlebar grip: forward, up, half-width
  trunk: 35, //         ° forward lean
};
const RAD = Math.PI / 180;
const rot2 = ([x, z], a) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];

function knee2(hip, ankle, B) {
  const reach = B.thigh + B.shank - 0.05;
  let dx = ankle[0] - hip[0];
  let dz = ankle[1] - hip[1];
  let d = Math.hypot(dx, dz);
  if (d > reach) {
    dx *= reach / d;
    dz *= reach / d;
    d = reach;
  }
  const a = (B.thigh * B.thigh - B.shank * B.shank + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, B.thigh * B.thigh - a * a));
  const ux = dx / d;
  const uz = dz / d;
  return { knee: [hip[0] + ux * a - uz * h, hip[1] + uz * a + ux * h], ankle: [hip[0] + dx, hip[1] + dz] };
}
const footAnkle = (pedal, sole, B) => {
  const r = rot2([B.ankleX - B.ball, B.ankleZ], sole);
  return [pedal[0] + r[0], pedal[1] + r[1]];
};
/** Hip height that gives `kneeBottom` at the bottom of the stroke. */
function saddleOf(B) {
  const pedal = [BIKE.bb[0], BIKE.bb[1] - BIKE.crank];
  const ankle = footAnkle(pedal, (BIKE.sole - BIKE.ankling) * RAD, B); // sole at the bottom of the stroke (sin = −1)
  const d = Math.sqrt(B.thigh ** 2 + B.shank ** 2 + 2 * B.thigh * B.shank * Math.cos(BIKE.kneeBottom * RAD));
  const dx = BIKE.hip[0] - ankle[0];
  return ankle[1] + Math.sqrt(d * d - dx * dx);
}
/** Pedal axle position for crank angle θ (rad, 0 = forward, π/2 = top), right crank; the left is opposite. */
const pedalAt = (theta) => [BIKE.bb[0] + BIKE.crank * Math.cos(theta), BIKE.bb[1] + BIKE.crank * Math.sin(theta)];

/** Both legs and both arms for crank angle θ. B = mannequin body with `hipZ` from saddleOf. */
function riderAt(theta, B) {
  const hip = [BIKE.hip[0], B.hipZ];
  const legs = {};
  for (const [k, off] of [["R", 0], ["L", Math.PI]]) {
    const th = theta + off;
    const pedal = pedalAt(th);
    // ankling: toe drops most on the down-stroke's back half, flattens over the top
    const sole = (BIKE.sole + BIKE.ankling * Math.sin(th)) * RAD;
    const s = knee2(hip, footAnkle(pedal, sole, B), B);
    legs[k] = { hip, knee: s.knee, ankle: s.ankle, sole, toe: sole, pedal };
  }
  // arms: reach from the shoulder to the grips (two-link, elbows bent down and back)
  const lean = BIKE.trunk * RAD;
  const shoulder = [hip[0] + Math.sin(lean) * (B.trunk - 1.5), hip[1] + Math.cos(lean) * (B.trunk - 1.5)];
  const fore = B.forearm + 0.3 * B.hand; // wrist to the middle of the fist
  const dx = BIKE.grip[0] - shoulder[0];
  const dz = BIKE.grip[1] - shoulder[1];
  const d = Math.min(Math.hypot(dx, dz), B.upperArm + fore - 0.1);
  const line = Math.atan2(dx, -dz); // from straight down, + forward
  const alpha = Math.acos(clamp((B.upperArm ** 2 + d * d - fore ** 2) / (2 * B.upperArm * d), -1, 1));
  const bend = Math.PI - Math.acos(clamp((B.upperArm ** 2 + fore ** 2 - d * d) / (2 * B.upperArm * fore), -1, 1));
  const arm = { shoulder: (line - alpha) / RAD, elbow: bend / RAD };
  return { legs, arms: { R: arm, L: arm }, trunk: BIKE.trunk, pelvis: B.hipZ };
}

// Page-side renderer for shared/mannequin.mjs (inlined after the kit, the lathe as G, and MANNEQUIN).
//
// One SVG group per part, created once; each frame rewrites the paths' `d`
// (no re-render) and re-appends groups only when the painter's order changes.
// Order: far arm, far leg, anything the figure slots "between" (a plumb line),
// trunk, near leg, near arm; inside each, back to front by depth, joint balls
// nudged forward so they sit over the ends of the segments they join.
function mannequinView(host, P, { between = [] } = {}) {
  const NS = "http://www.w3.org/2000/svg";
  const nodes = new Map();
  let lastOrder = "";
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) n.setAttribute(key, value);
    if (parent) parent.appendChild(n);
    return n;
  };
  function nodeOf(part) {
    let n = nodes.get(part.name);
    if (n) return n;
    const g = el("g", { class: part.wood ? "mq-wood" : part.kind === "ball" ? "mq-joint" : "mq-part", "data-name": `mq.${part.name}` });
    const shape = el("g", { class: "iso-solid" }, g);
    n = {
      g,
      shape,
      fill: el("path", { class: "iso-fill" }, shape),
      shades: [0, 1, 2, 3].map((i) => el("path", { class: "iso-shade", "data-shade": i }, shape)),
      top: el("path", { class: "iso-top" }, shape),
      crease: el("path", { class: "iso-line iso-crease", "data-tone": "faint" }, shape),
      edge: el("path", { class: "iso-line iso-edge", "data-tone": "mid" }, shape),
      extra: el("g", {}, g),
      state: {},
    };
    nodes.set(part.name, n);
    return n;
  }
  function pathsOf(part) {
    if (part.kind === "ball") return G.sphereOf(part.c, part.r, P, { steps: 40 });
    if (part.kind === "prism") return G.prismOf(part.F, part.poly, part.s0, part.s1, P);
    return G.solidOf(part.profile, part.F, P);
  }
  // rigid parts (the trunk) only ride up and down with the pelvis: draw them once, then translate
  const rigid = new Map();
  function setPaths(n, paths) {
    n.fill.setAttribute("d", paths.fill);
    paths.shades.forEach((d, i) => n.shades[i].setAttribute("d", d || ""));
    n.top.setAttribute("d", paths.top || "");
    n.crease.setAttribute("d", paths.crease || "");
    n.edge.setAttribute("d", paths.outline);
    if (paths.seamless) n.shape.setAttribute("data-seamless", "");
    else n.shape.removeAttribute("data-seamless");
  }
  /**
   * parts: MANNEQUIN.partsOf(J).parts plus any extra parts ({ name, group, kind, ... }).
   * decorate(part, extraGroup, state): optional, draws dots, glows and the like into the part's group.
   */
  function draw(parts, J, decorate) {
    const near = depthOf(J.hipL, P) >= depthOf(J.hipR, P) ? "L" : "R";
    const far = near === "L" ? "R" : "L";
    const groups = [`arm${far}`, `leg${far}`, ...between, "trunk", `leg${near}`, `arm${near}`];
    const rank = Object.fromEntries(groups.map((g, i) => [g, i]));
    const list = [];
    for (const part of parts) {
      const n = nodeOf(part);
      if (part.kind === "line") {
        if (!n.line) {
          n.shape.remove();
          n.line = el("path", { class: "iso-line", "data-tone": "lit", "data-free": "" });
          n.g.insertBefore(n.line, n.extra);
        }
        n.line.setAttribute("d", pathOf(part.points.map((p) => iso(p, P))));
        if (part.className) n.line.setAttribute("class", `iso-line ${part.className}`);
      } else if (part.rigid) {
        const key = `${part.F.a.map((v) => v.toFixed(4))}|${part.F.o.map((v, i) => (v - J.pelvis[i]).toFixed(3))}`;
        let c = rigid.get(part.name);
        if (!c || c.key !== key) {
          c = { key, anchor: iso(J.pelvis, P) };
          setPaths(n, pathsOf(part));
          rigid.set(part.name, c);
        }
        const now = iso(J.pelvis, P);
        n.shape.setAttribute("transform", `translate(${(now[0] - c.anchor[0]).toFixed(2)} ${(now[1] - c.anchor[1]).toFixed(2)})`);
      } else {
        setPaths(n, pathsOf(part));
      }
      if (decorate) decorate(part, n.extra, n.state);
      list.push({ part, n, key: (rank[part.group] ?? 2) * 1e6 + depthOf(part.centre, P) + (part.kind === "ball" ? 3 : 0) + (part.bias || 0) });
    }
    list.sort((a, b) => a.key - b.key);
    const order = list.map((x) => x.part.name).join(",");
    if (order !== lastOrder) {
      for (const { n } of list) host.appendChild(n.g);
      lastOrder = order;
    }
  }
  return { draw, nodes };
}

// The little bike for the ALE results page: the rider pedals at the figure's 60 rpm, the
// flywheel turns and the mask's analyser blinks with each breath. No test timeline, no
// numbers: motion only. Derived from Fig 5's live.js (optimal-anatomy-figures).
const DATA = {"P":{"origin":[190.76623300627978,490.97023578572555],"scale":2.3823466890310074,"azimuth":50,"elevation":22},"B":{"H":170,"thigh":41.65,"shank":41.82,"ankleZ":6.63,"foot":25.84,"ankleX":5.4264,"ball":18.6048,"hipHalf":8.5,"kneeHalf":7.2,"ankleHalf":5.2,"trunk":48.959999999999994,"shoulderHalf":18.02,"upperArm":31.62,"forearm":24.819999999999997,"hand":18.36,"chin":57.800000000000004,"head":22.1,"hipZ":105.85368383441602},"W":400,"H":570,"mask":{"base":[20.91409164589365,0,157.92545552970097],"face":[0.9707511885171749,0,-0.24008775477414987],"axis":[0.24008775477414993,0,0.9707511885171748]},"bike":{"bb":[0,0,32],"fly":{"x":40,"y":12,"z":40,"r":20,"t":3.4},"crank":17.2,"hipX":-20}};

function mount(fig) {
  const P = DATA.P;
  const B = { ...DATA.B };
  const stage = fig.querySelector(".iso-stage");
  const svg = stage.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const nodes = { runner: q('[data-part="runner"]'), brake: q('[data-part="brake"]'), fly: q('[data-part="flyspin"]') };
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) n.setAttribute(key, value);
    if (parent) parent.appendChild(n);
    return n;
  };
  const KS = P.scale * Math.sqrt(1.6);
  const view = mannequinView(nodes.runner, P, {});
  const base = [DATA.bike.hipX, 0, 0];
  const WATTS = 200; //   the brake sits part-way down, as on a steady hard effort (drawn only)
  const BREATHS = 28; //  breaths a minute, for the light's rhythm only
  let theta = 0.6;
  let flyAngle = 0;
  let breath = 0;

  const WIDTH = { hip: B.hipHalf, knee: 8.6, ankle: 9 };
  function riderParts(pose) {
    const parts = [];
    const m = DATA.mask;
    const Fm = MANNEQUIN.frameAlong(m.base, m.face);
    parts.push({ name: "mask", group: "trunk", rigid: true, kind: "lathe", F: Fm, profile: [[0, 6.0], [2.6, 6.0, 1], [4.6, 4.4, 1], [6.0, 3.2]], centre: G.pointOf(Fm, 5, 0, 0), bias: 2 });
    parts.push({ name: "analyser", group: "trunk", rigid: true, kind: "lathe", F: Fm, profile: [[5.6, 3.0], [6.4, 4.6, 1], [8.6, 5.0, 1], [11.0, 4.6, 1], [12.0, 3.0]], centre: G.pointOf(Fm, 9, 0, 0), bias: 2.5 });
    const bb = DATA.bike.bb;
    for (const [k, off] of [["R", 0], ["L", Math.PI]]) {
      const th = theta + off;
      const side = k === "L" ? 1 : -1;
      const u = [Math.cos(th), 0, Math.sin(th)];
      const v = [-Math.sin(th), 0, Math.cos(th)];
      const a = [0, side, 0];
      parts.push({ name: `crank${k}`, group: `leg${k}`, kind: "prism", F: { o: [bb[0], side * 13, bb[2]], a, u, v }, poly: [[-2.4, -1.8], [DATA.bike.crank + 1.8, -1.3], [DATA.bike.crank + 1.8, 1.3], [-2.4, 1.8]], s0: 0, s1: 1.6, centre: [bb[0] + u[0] * 9, side * 14, bb[2] + u[2] * 9], bias: 1 });
      const pedal = pose.legs[k].pedal;
      const sole = pose.legs[k].sole;
      parts.push({ name: `pedal${k}`, group: `leg${k}`, kind: "prism", F: { o: [pedal[0], side * 5, pedal[1]], a, u: [Math.cos(sole), 0, Math.sin(sole)], v: [-Math.sin(sole), 0, Math.cos(sole)] }, poly: [[-5, -2.4], [5, -2.4], [5, -0.2], [-5, -0.2]], s0: 0, s1: 8, centre: [pedal[0], side * 9, pedal[1] - 1.2], bias: -1 });
    }
    return parts;
  }
  let strapDone = false;
  let led = null;
  function decorate(part, g, st) {
    if (part.name === "chest" && !strapDone) {
      const L = part.profile[part.profile.length - 1][0];
      g.innerHTML = lineSvg(G.arcOf(part.F, 0.6 * L - 1.2, 12.25, P) + G.arcOf(part.F, 0.6 * L + 1.2, 12.25, P), { tone: "mid", className: "vo-strap" });
      strapDone = true;
    }
    if (part.name === "analyser" && !st.led) {
      const c = iso(G.pointOf(part.F, 8.6, 5.0, Math.PI / 2), P);
      st.led = el("circle", { class: "vo-led", cx: c[0].toFixed(1), cy: c[1].toFixed(1), r: (0.9 * KS).toFixed(2) }, g);
      led = st.led;
    }
    if (part.kind === "ball" && /^(hip|knee|ankle|shoulder|elbow|wrist)/.test(part.name)) {
      if (!st.dot) st.dot = el("circle", { class: "mq-dot", r: (1.2 * KS).toFixed(2) }, g);
      const c = iso(part.c, P);
      st.dot.setAttribute("cx", c[0].toFixed(1));
      st.dot.setAttribute("cy", c[1].toFixed(1));
    }
  }
  const FLY = DATA.bike.fly;
  function brakeSvg(W) {
    const x = FLY.x - 13;
    const rimZ = FLY.z + Math.sqrt(FLY.r ** 2 - 13 ** 2);
    const over = 5.5 * Math.min(1, W / 420);
    const z0 = rimZ + 2.4 - over;
    const yN = FLY.y + FLY.t / 2 + 0.3;
    const rod = solidSvg(cylinder(x, FLY.y, 0.9, z0 + 5, FLY.z + FLY.r + 9 - 1.2 - (z0 + 5), P, 12), { tone: "lo" });
    const bridge = solidSvg(slabOf({ x: x - 4, y: FLY.y - FLY.t / 2 - 2.2, w: 8, d: FLY.t + 4.4, r: 0.6 }, z0 + 4, 1.8, P, 2, 0.2), { tone: "mid" });
    const magnet = solidSvg(slabOf({ x: x - 4, y: yN, w: 8, d: 1.9, r: 0.5 }, z0, 5.8, P, 2, 0.2), { tone: "hi", className: "vo-magnet" });
    return rod + bridge + magnet;
  }
  function flySvg() {
    return [0, 1, 2, 3, 4].map((i) => {
      const a = flyAngle + (i * 2 * Math.PI) / 5;
      const p = iso([FLY.x + 11 * Math.cos(a), FLY.y + FLY.t / 2 + 0.02, FLY.z + 11 * Math.sin(a)], P);
      return `<circle class="vo-hole" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(1.6 * KS).toFixed(2)}"/>`;
    }).join("");
  }
  nodes.brake.innerHTML = brakeSvg(WATTS);

  function render(dt) {
    const turn = dt * (TRUTH.cadence / 60) * 2 * Math.PI;
    theta -= turn;
    flyAngle -= turn * 2.6;
    breath = (breath + dt / (60 / BREATHS)) % 1;
    const pulse = breath < TRUTH.breath.exhale ? Math.sin((Math.PI * breath) / TRUTH.breath.exhale) : 0;
    const pose = riderAt(theta, B);
    const legs = {};
    for (const k of ["R", "L"]) {
      const L = pose.legs[k];
      legs[k] = { hip: [L.hip[0] - DATA.bike.hipX, L.hip[1]], knee: [L.knee[0] - DATA.bike.hipX, L.knee[1]], ankle: [L.ankle[0] - DATA.bike.hipX, L.ankle[1]], sole: L.sole, toe: L.toe, width: WIDTH };
    }
    const J = MANNEQUIN.skeletonOf({ base, pelvis: pose.pelvis, trunk: pose.trunk, legs, arms: pose.arms });
    const { parts } = MANNEQUIN.partsOf(J);
    view.draw([...parts, ...riderParts(pose)], J, decorate);
    if (led) led.setAttribute("fill-opacity", (0.3 + 0.7 * pulse).toFixed(2));
    nodes.fly.innerHTML = flySvg();
  }

  let raf = 0, last = 0, visible = true;
  function tick(now) {
    raf = 0;
    if (!visible || still.matches) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    render(dt);
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf && visible && !still.matches) { last = 0; raf = requestAnimationFrame(tick); } }
  new IntersectionObserver((entries) => { visible = entries.some((e) => e.isIntersecting); if (visible) start(); }).observe(stage);
  still.addEventListener("change", () => (still.matches ? render(0) : start()));
  render(0);
  start();
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: 44px;\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 9px; font-size: 13px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* The mannequin (shared/mannequin.mjs): turned wood segments, steel ball joints, tracking dots. */\n.iso.optimal {\n  /* Forest night: dark walnut, so the figure sits in the room rather than glowing */\n  --mq-face: #6b5a44;\n  --mq-shade-0: #3f3326;\n  --mq-shade-1: #4b3d2d;\n  --mq-shade-2: #574735;\n  --mq-shade-3: #63523e;\n  --mq-top: #7a684f;\n  --mq-edge: #e9e6dc;\n}\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream: pale beech */\n  --mq-face: #f3e6cf;\n  --mq-shade-0: #cdb592;\n  --mq-shade-1: #d9c4a3;\n  --mq-shade-2: #e4d2b5;\n  --mq-shade-3: #ecdec5;\n  --mq-top: #f8eedc;\n  --mq-edge: #3e3d39;\n}\n.mq-wood {\n  --anatomy-face: var(--mq-face);\n  --anatomy-paper: var(--mq-face);\n  --anatomy-shade-0: var(--mq-shade-0);\n  --anatomy-shade-1: var(--mq-shade-1);\n  --anatomy-shade-2: var(--mq-shade-2);\n  --anatomy-shade-3: var(--mq-shade-3);\n  --anatomy-top: var(--mq-top);\n}\n.mq-dot { fill: var(--anatomy-lit); stroke: var(--anatomy-card); stroke-width: 0.5; }\n.mq-glow { fill: var(--opt-heat); stroke: none; }\n.mq-glow-ring { fill: none; stroke: var(--opt-heat-ink); stroke-width: 0.6; }\n/* Fig 5 · clear tubing and glass, the cart's screens, the breath layer. */\n.iso.optimal { --vo-screen: #0f1b0c; --vo-ink: #c9e3c1; --vo-dim: #4f6b48; --vo-glass: rgba(201, 227, 193, 0.10); --vo-glass-edge: #8e9884; }\n.iso.optimal[data-theme=\"light\"] { --vo-screen: #1d2a1a; --vo-ink: #d9efd2; --vo-dim: #5d7a56; --vo-glass: rgba(44, 78, 37, 0.06); --vo-glass-edge: #76736d; }\n.vo-stage { position: relative; }\n.vo-gl, .vo-front { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }\n.iso.optimal:not([data-theme=\"light\"]) .vo-gl { mix-blend-mode: screen; }\n.vo-stage[data-gl] .vo-fallback { display: none; }\n.vo-glass .iso-fill, .vo-glass .iso-top, .vo-glass .iso-shade { fill: var(--vo-glass); stroke: none; }\n.vo-hose .tb-body { fill: var(--vo-glass); }\n.vo-hose .tb-shine, .vo-hose .tb-shade { opacity: 0.35; }\n.vo-screen { fill: var(--vo-screen); }\n.vo-window { fill: var(--anatomy-shade-0); }\n.vo-level { fill: var(--anatomy-lit); }\n.vo-cell-label { fill: var(--anatomy-strong); font-family: var(--opt-ui); font-weight: 600; }\n.vo-grid { fill: none; stroke: var(--vo-dim); stroke-width: 0.25; opacity: 0.5; }\n.vo-axis { fill: none; stroke: var(--vo-dim); stroke-width: 0.4; }\n.vo-guide { fill: none; stroke: var(--vo-dim); stroke-width: 0.4; stroke-dasharray: 1 1; }\n.vo-ceiling { fill: none; stroke: var(--opt-heat); stroke-width: 0.45; stroke-dasharray: 1.2 0.8; }\n.vo-trace { fill: none; stroke: var(--opt-heat); stroke-width: 0.7; stroke-linejoin: round; stroke-linecap: round; }\n.vo-dot { fill: var(--vo-ink); }\n.vo-tick { fill: var(--vo-dim); font-family: var(--opt-ui); font-weight: 500; }\n.vo-strap { stroke-width: 1.6; }\n.vo-hole { fill: var(--anatomy-shade-1); stroke: var(--anatomy-lo); stroke-width: 0.4; }\n.vo-vane { fill: none; stroke: var(--anatomy-mid); stroke-width: 1.2; stroke-linecap: round; }\n.vo-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.vo-par { display: block; margin-top: 6px; }\n.vo-par:first-child { margin-top: 0; }\n.vo-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n.vo-scrub { display: flex; align-items: center; gap: 12px; margin: 10px 4px 0; }\n.vo-play { appearance: none; border: 0; min-height: 44px; min-width: 72px; padding: 0 16px; border-radius: 999px; background: transparent; box-shadow: inset 0 0 0 1px var(--opt-rule); color: var(--anatomy-text); font: 500 14px/1 var(--opt-ui); cursor: pointer; touch-action: manipulation; }\n.vo-play:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.vo-clock { font: 500 13px/1 var(--opt-ui); color: var(--anatomy-muted); min-width: 40px; text-align: right; font-feature-settings: \"tnum\" 1; }\n.vo-range { flex: 1; min-width: 0; height: 44px; margin: 0; background: transparent; accent-color: var(--opt-btn-on); -webkit-appearance: none; appearance: none; touch-action: pan-y; }\n.vo-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.vo-range::-moz-range-track { height: 4px; border-radius: 2px; background: var(--opt-rule); }\n.vo-range::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); box-shadow: 0 0 0 1px var(--opt-rule); }\n.vo-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: var(--opt-btn-on); border: 3px solid var(--anatomy-card); }\n.vo-range:focus-visible { outline: 2px solid var(--opt-fig); outline-offset: 2px; }\n.vo-led { fill: var(--anatomy-lit); stroke: var(--anatomy-card); stroke-width: 0.4; }\n.vb .iso-stage{margin:0}.vb svg{display:block;width:100%;height:auto}" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"opt-figure vb\"><div class=\"iso-stage\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"iso-svg\" viewBox=\"0 0 400 570\" role=\"img\" aria-label=\"A wooden artist's mannequin pedalling a lab exercise bike, wearing a face mask with a small wireless breath analyser that blinks with each breath.\"><path class=\"iso-halo\" d=\"M11.9 477.3L12 475.1L13.2 472.9L15.5 470.9L18.9 469.1L104.1 431L108.3 429.5L113.3 428.3L118.8 427.5L124.6 427L130.5 427.1L136.3 427.5L141.7 428.4L146.6 429.6L377.4 502.2L381.5 503.8L384.8 505.6L387 507.7L388.1 509.9L388.1 510.1L388 512.4L386.8 514.5L384.5 516.6L381.1 518.4L295.9 556.4L291.7 558L286.7 559.2L281.2 560L275.4 560.4L269.5 560.4L263.7 559.9L258.3 559.1L253.4 557.8L22.6 485.3L18.5 483.7L15.2 481.8L13 479.8L11.9 477.6Z\"/><g data-part=\"belt\"><path class=\"iso-line\" data-tone=\"mid\" data-free=\"\" d=\"M175.1 378.5L268 403.5M184.5 438.3L271.6 426.3\"/></g><g class=\"it\" data-name=\"stand.footR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M15.7 461L17.7 459.4L114.5 416.2L118.4 415.2L123 415L127.3 415.8L136.5 418.7L139.2 420.1L139.6 421.9L139.6 435.8L137.6 437.4L40.8 480.7L36.9 481.7L32.3 481.8L28 481.1L18.8 478.2L16.1 476.7L15.7 475Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M139.6 435.8L137.6 437.4L137.6 423.5L139.6 421.9ZM137.6 437.4L40.8 480.7L40.8 466.7L137.6 423.5ZM40.8 480.7L36.9 481.7L36.9 467.7L40.8 466.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M36.9 481.7L32.3 481.8L32.3 467.9L36.9 467.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M32.3 481.8L28 481.1L28 467.1L32.3 467.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M28 481.1L18.8 478.2L18.8 464.2L28 467.1ZM18.8 478.2L16.1 476.7L16.1 462.8L18.8 464.2ZM16.1 476.7L15.7 475L15.7 461L16.1 462.8Z\"/><path class=\"iso-top\" d=\"M136.5 418.7L139.2 420.1L139.6 421.9L137.6 423.5L40.8 466.7L36.9 467.7L32.3 467.9L28 467.1L18.8 464.2L16.1 462.8L15.7 461L17.7 459.4L114.5 416.2L118.4 415.2L123 415L127.3 415.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M139.6 421.9L137.6 423.5L40.8 466.7L36.9 467.7L32.3 467.9L28 467.1L18.8 464.2L16.1 462.8L15.7 461\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M139.6 421.9L136.6 423.2L40 466.4L36.5 467.3L32.5 467.4L28.7 466.7L19.7 463.9L17.2 462.6L15.7 461\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M15.7 461L17.7 459.4L114.5 416.2L118.4 415.2L123 415L127.3 415.8L136.5 418.7L139.2 420.1L139.6 421.9M139.6 435.8L137.6 437.4L40.8 480.7L36.9 481.7L32.3 481.8L28 481.1L18.8 478.2L16.1 476.7L15.7 475M139.6 421.9L139.6 435.8M15.7 461L15.7 475\"/></g></g><g class=\"it\" data-name=\"stand.footF\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M259.7 534.8L261.6 533.2L350.7 493.4L354.6 492.4L359.2 492.2L363.5 493L372.7 495.9L375.4 497.3L375.8 499.1L375.8 513L373.8 514.6L284.7 554.4L280.9 555.4L276.2 555.6L272 554.8L262.8 551.9L260.1 550.5L259.7 548.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M375.8 513L373.8 514.6L373.8 500.6L375.8 499.1ZM373.8 514.6L284.7 554.4L284.7 540.4L373.8 500.6ZM284.7 554.4L280.9 555.4L280.9 541.4L284.7 540.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M280.9 555.4L276.2 555.6L276.2 541.6L280.9 541.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M276.2 555.6L272 554.8L272 540.8L276.2 541.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M272 554.8L262.8 551.9L262.8 537.9L272 540.8ZM262.8 551.9L260.1 550.5L260.1 536.5L262.8 537.9ZM260.1 550.5L259.7 548.7L259.7 534.8L260.1 536.5Z\"/><path class=\"iso-top\" d=\"M372.7 495.9L375.4 497.3L375.8 499.1L373.8 500.6L284.7 540.4L280.9 541.4L276.2 541.6L272 540.8L262.8 537.9L260.1 536.5L259.7 534.8L261.6 533.2L350.7 493.4L354.6 492.4L359.2 492.2L363.5 493Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M375.8 499.1L373.8 500.6L284.7 540.4L280.9 541.4L276.2 541.6L272 540.8L262.8 537.9L260.1 536.5L259.7 534.8\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M375.8 499.1L372.8 500.4L283.9 540.1L280.5 541L276.4 541.1L272.6 540.5L263.6 537.6L261.2 536.4L259.7 534.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M259.7 534.8L261.6 533.2L350.7 493.4L354.6 492.4L359.2 492.2L363.5 493L372.7 495.9L375.4 497.3L375.8 499.1M375.8 513L373.8 514.6L284.7 554.4L280.9 555.4L276.2 555.6L272 554.8L262.8 551.9L260.1 550.5L259.7 548.7M375.8 499.1L375.8 513M259.7 534.8L259.7 548.7\"/></g></g><g class=\"it\" data-name=\"beam\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M70.2 426.7L71.5 425.7L79.2 422.2L81.8 421.6L84.9 421.5L87.7 421.9L323.2 496L325 496.9L325.2 498.1L325.2 514.8L323.9 515.9L316.2 519.4L313.6 520L310.5 520.1L307.7 519.6L72.2 445.6L70.4 444.7L70.2 443.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M325.2 514.8L323.9 515.9L323.9 499.1L325.2 498.1ZM323.9 515.9L316.2 519.4L316.2 502.6L323.9 499.1ZM316.2 519.4L313.6 520L313.6 503.3L316.2 502.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M313.6 520L310.5 520.1L310.5 503.4L313.6 503.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M310.5 520.1L307.7 519.6L307.7 502.9L310.5 503.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M307.7 519.6L72.2 445.6L72.2 428.9L307.7 502.9ZM72.2 445.6L70.4 444.7L70.4 427.9L72.2 428.9ZM70.4 444.7L70.2 443.5L70.2 426.7L70.4 427.9Z\"/><path class=\"iso-top\" d=\"M323.2 496L325 496.9L325.2 498.1L323.9 499.1L316.2 502.6L313.6 503.3L310.5 503.4L307.7 502.9L72.2 428.9L70.4 427.9L70.2 426.7L71.5 425.7L79.2 422.2L81.8 421.6L84.9 421.5L87.7 421.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M325.2 498.1L323.9 499.1L316.2 502.6L313.6 503.3L310.5 503.4L307.7 502.9L72.2 428.9L70.4 427.9L70.2 426.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M325.2 498.1L322.9 498.9L315.4 502.3L313.2 502.8L310.7 502.9L308.3 502.5L73.1 428.6L71.6 427.8L70.2 426.7\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M325.3 505.9L323.9 507.5L316.2 511L312.1 511.8L307.7 511.3L72.2 437.2L70.1 435.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M70.2 426.7L71.5 425.7L79.2 422.2L81.8 421.6L84.9 421.5L87.7 421.9L323.2 496L325 496.9L325.2 498.1M325.2 514.8L323.9 515.9L316.2 519.4L313.6 520L310.5 520.1L307.7 519.6L72.2 445.6L70.4 444.7L70.2 443.5M325.2 498.1L325.2 514.8M70.2 426.7L70.2 443.5\"/></g></g><g class=\"it\" data-name=\"seat.column\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M128.2 218.6L139.8 213.4L151.7 215.4L174.8 449.9L163.2 455.1L151.3 453.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M174.8 449.9L163.2 455.1L140.1 220.5L151.7 215.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M163.2 455.1L151.3 453.1L128.2 218.6L140.1 220.5Z\"/><path class=\"iso-top\" d=\"M151.7 215.4L140.1 220.5L128.2 218.6L139.8 213.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M151.7 215.4L140.1 220.5M163.2 455.1L140.1 220.5M140.1 220.5L128.2 218.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M128.2 218.6L139.8 213.4L151.7 215.4L174.8 449.9L163.2 455.1L151.3 453.1Z\"/></g></g><g class=\"it\" data-name=\"seat.clamp\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M129.8 205.5L130.5 204.4L132.1 203.3L134.6 202.5L137.5 202.1L140.7 202L143.8 202.2L146.6 202.9L148.7 203.8L149.9 204.9L150.2 206.1L150.2 217.2L149.5 218.4L147.8 219.4L145.4 220.2L142.5 220.7L139.3 220.8L136.1 220.5L133.4 219.9L131.3 219L130 217.9L129.8 216.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M147.8 219.4L145.4 220.2L145.4 209L147.8 208.3ZM150.2 217.2L149.5 218.4L149.5 207.2L150.2 206.1ZM149.5 218.4L147.8 219.4L147.8 208.3L149.5 207.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M145.4 220.2L142.5 220.7L142.5 209.5L145.4 209ZM142.5 220.7L139.3 220.8L139.3 209.6L142.5 209.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M139.3 220.8L136.1 220.5L136.1 209.4L139.3 209.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M136.1 220.5L133.4 219.9L133.4 208.7L136.1 209.4ZM133.4 219.9L131.3 219L131.3 207.8L133.4 208.7ZM131.3 219L130 217.9L130 206.7L131.3 207.8ZM130 217.9L129.8 216.7L129.8 205.5L130 206.7Z\"/><path class=\"iso-top\" d=\"M147.8 208.3L145.4 209L142.5 209.5L139.3 209.6L136.1 209.4L133.4 208.7L131.3 207.8L130 206.7L129.8 205.5L130.5 204.4L132.1 203.3L134.6 202.5L137.5 202.1L140.7 202L143.8 202.2L146.6 202.9L148.7 203.8L149.9 204.9L150.2 206.1L149.5 207.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M150.2 206.1L149.5 207.2L147.8 208.3L145.4 209L142.5 209.5L139.3 209.6L136.1 209.4L133.4 208.7L131.3 207.8L130 206.7L129.8 205.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M129.8 205.5L130.5 204.4L132.1 203.3L134.6 202.5L137.5 202.1L140.7 202L143.8 202.2L146.6 202.9L148.7 203.8L149.9 204.9L150.2 206.1M150.2 217.2L149.5 218.4L147.8 219.4L145.4 220.2L142.5 220.7L139.3 220.8L136.1 220.5L133.4 219.9L131.3 219L130 217.9L129.8 216.7M129.8 205.5L129.8 216.7M150.2 206.1L150.2 217.2\"/></g></g><g class=\"it\" data-name=\"bb.house\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M167.8 411.8L169.2 410.2L184.7 403.2L188.8 402.5L193.2 403L211.6 408.8L213.8 410.3L213.8 459.5L212.4 461.1L196.9 468L192.8 468.8L188.4 468.3L169.9 462.5L167.8 461Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M213.8 459.5L212.4 461.1L212.4 412L213.8 410.3ZM212.4 461.1L196.9 468L196.9 418.9L212.4 412Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M196.9 468L192.8 468.8L192.8 419.7L196.9 418.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M192.8 468.8L188.4 468.3L188.4 419.2L192.8 419.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M188.4 468.3L169.9 462.5L169.9 413.3L188.4 419.2ZM169.9 462.5L167.8 461L167.8 411.8L169.9 413.3Z\"/><path class=\"iso-top\" d=\"M211.6 408.8L213.8 410.3L212.4 412L196.9 418.9L192.8 419.7L188.4 419.2L169.9 413.3L167.8 411.8L169.2 410.2L184.7 403.2L188.8 402.5L193.2 403Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M213.8 410.3L212.4 412L196.9 418.9L192.8 419.7L188.4 419.2L169.9 413.3L167.8 411.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M167.8 411.8L169.2 410.2L184.7 403.2L188.8 402.5L193.2 403L211.6 408.8L213.8 410.3M213.8 459.5L212.4 461.1L196.9 468L192.8 468.8L188.4 468.3L169.9 462.5L167.8 461M213.8 410.3L213.8 459.5M167.8 411.8L167.8 461\"/></g></g><g class=\"it\" data-name=\"saddle\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M101 193.8L110 186.3L128.1 181.7L143.9 185.2L185.8 206.9L190.8 211.7L190.8 221.8L177.3 220.8L112.9 209.1L101 203.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M190.8 221.8L177.3 220.8L177.3 210.7L190.8 211.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M177.3 220.8L138.6 213.5L138.6 203.4L177.3 210.7ZM138.6 213.5L112.9 209.1L112.9 199L138.6 203.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M112.9 209.1L101 203.9L101 193.8L112.9 199Z\"/><path class=\"iso-top\" d=\"M128.1 181.7L143.9 185.2L159.9 193.9L185.8 206.9L190.8 211.7L177.3 210.7L138.6 203.4L112.9 199L101 193.8L110 186.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M190.8 211.7L177.3 210.7M177.3 210.7L138.6 203.4M138.6 203.4L112.9 199M112.9 209.1L112.9 199M112.9 199L101 193.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M101 193.8L110 186.3L128.1 181.7L143.9 185.2L185.8 206.9L190.8 211.7L190.8 221.8L177.3 220.8L112.9 209.1L101 203.9Z\"/></g></g><g class=\"it\" data-name=\"bb.shell\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M167.5 404.6L167.6 403.2L167.8 401.9L168.1 400.7L168.5 399.6L169.1 398.6L169.8 397.7L170.6 397L171.4 396.4L172.4 395.9L199.5 383.8L200.5 383.5L201.5 383.4L202.6 383.4L203.8 383.6L204.9 384L206 384.5L207.1 385.1L208.2 385.9L209.2 386.9L210.1 387.9L211 389.1L211.8 390.3L212.4 391.6L213 393L213.4 394.4L213.8 395.8L214 397.2L214 398.6L214 399.9L213.8 401.2L213.4 402.4L213 403.5L212.4 404.5L211.8 405.4L211 406.1L210.1 406.7L209.2 407.2L182.1 419.3L181 419.6L180 419.7L178.9 419.7L177.8 419.5L176.6 419.2L175.5 418.6L174.4 418L173.4 417.2L172.4 416.3L171.4 415.2L170.6 414.1L169.8 412.8L169.1 411.5L168.5 410.2L168.1 408.8L167.8 407.4L167.6 405.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M182.6 419.1L184.1 418.1L185.3 416.7L186.2 414.9L186.7 412.9L186.9 410.7L186.7 408.3L186.2 405.9L185.3 403.6L212.4 391.5L213.3 393.8L213.8 396.2L214 398.6L213.8 400.8L213.3 402.8L212.4 404.6L211.2 406L209.7 407Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M185.3 403.6L184.1 401.5L211.2 389.4L212.4 391.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M184.1 401.5L182.6 399.6L209.7 387.4L211.2 389.4ZM177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L177.2 407.6L186.9 410.7L186.7 412.9L186.2 414.9L185.3 416.7L184.1 418.1L182.6 419.1L180.9 419.6L179.1 419.7L177.2 419.3L175.3 418.5L173.5 417.3L171.8 415.7L170.4 413.8L169.1 411.6L168.2 409.3L167.7 406.9L167.5 404.6L167.7 402.3L168.2 400.3L169.1 398.6L170.4 397.2L171.8 396.2L173.5 395.6L175.3 395.5L177.2 395.9L179.1 396.7L180.9 397.9L182.6 399.6L184.1 401.5L185.3 403.6L186.2 405.9L186.7 408.3L186.9 410.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M182.6 399.6L180.9 397.9L179.1 396.7L206.2 384.6L208 385.8L209.7 387.4Z\"/><path class=\"iso-top\" d=\"M179.1 396.7L177.2 395.9L175.3 395.5L173.5 395.6L171.8 396.2L198.9 384.1L200.6 383.5L202.4 383.4L204.3 383.8L206.2 384.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M182.4 419.2L183.3 418.7L184.1 418L184.9 417.2L185.5 416.3L186 415.3L186.4 414.1L186.7 412.9L186.9 411.6L186.9 410.2L186.8 408.8L186.6 407.4L186.2 406L185.7 404.6L185.1 403.3L184.4 402L183.6 400.8L182.7 399.7L181.7 398.7L180.7 397.8L179.6 397L178.5 396.4L177.4 395.9L176.3 395.6L175.2 395.5L174.1 395.5L173 395.7L172 396.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M167.5 404.6L167.6 403.2L167.8 401.9L168.1 400.7L168.5 399.6L169.1 398.6L169.8 397.7L170.6 397L171.4 396.4L172.4 395.9L199.5 383.8L200.5 383.5L201.5 383.4L202.6 383.4L203.8 383.6L204.9 384L206 384.5L207.1 385.1L208.2 385.9L209.2 386.9L210.1 387.9L211 389.1L211.8 390.3L212.4 391.6L213 393L213.4 394.4L213.8 395.8L214 397.2L214 398.6L214 399.9L213.8 401.2L213.4 402.4L213 403.5L212.4 404.5L211.8 405.4L211 406.1L210.1 406.7L209.2 407.2L182.1 419.3L181 419.6L180 419.7L178.9 419.7L177.8 419.5L176.6 419.2L175.5 418.6L174.4 418L173.4 417.2L172.4 416.3L171.4 415.2L170.6 414.1L169.8 412.8L169.1 411.5L168.5 410.2L168.1 408.8L167.8 407.4L167.6 405.9Z\"/></g></g><g class=\"it\" data-name=\"chainring\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M150.7 400.3L150.7 399L150.8 397.6L151 396.3L151.2 395L151.5 393.8L151.8 392.5L152.1 391.3L152.6 390.2L153 389.1L153.6 388L154.1 387L154.7 386L155.4 385.1L156.1 384.2L156.9 383.4L157.6 382.6L158.5 381.9L159.3 381.3L160.2 380.7L161.1 380.2L162.1 379.7L164.4 378.7L165.4 378.3L166.4 377.9L167.5 377.7L168.5 377.5L169.6 377.4L170.7 377.3L171.8 377.3L172.9 377.4L174.1 377.5L175.2 377.7L176.3 378L177.5 378.4L178.6 378.8L179.8 379.3L180.9 379.8L182 380.4L183.2 381L184.3 381.8L185.3 382.5L186.4 383.4L187.5 384.3L188.5 385.2L189.5 386.2L190.5 387.2L191.4 388.3L192.3 389.4L193.2 390.6L194 391.8L194.8 393L195.6 394.3L196.3 395.6L197 396.9L197.7 398.3L198.2 399.7L198.8 401L199.3 402.5L199.7 403.9L200.1 405.3L200.5 406.7L200.8 408.2L201 409.6L201.2 411L201.3 412.4L201.4 413.8L201.4 415.2L201.4 416.6L201.3 418L201.2 419.3L201 420.6L200.8 421.9L200.5 423.1L200.1 424.3L199.7 425.5L199.3 426.7L198.8 427.7L198.2 428.8L197.7 429.8L197 430.7L196.3 431.6L195.6 432.5L194.8 433.3L194 434L193.2 434.7L192.3 435.3L191.4 435.9L190.5 436.3L188.1 437.4L187.2 437.8L186.2 438.2L185.1 438.5L184.1 438.7L183 438.8L181.9 438.9L180.8 439L179.7 438.9L178.6 438.8L177.5 438.6L176.3 438.4L175.2 438.1L174 437.7L172.9 437.3L171.7 436.8L170.6 436.2L169.5 435.6L168.4 434.9L167.3 434.1L166.2 433.3L165.1 432.5L164.1 431.5L163.1 430.6L162.1 429.6L161.1 428.5L160.2 427.4L159.3 426.3L158.5 425.1L157.6 423.9L156.9 422.6L156.1 421.3L155.4 420L154.7 418.7L154.1 417.3L153.6 415.9L153 414.5L152.6 413.1L152.1 411.7L151.8 410.3L151.5 408.8L151.2 407.4L151 406L150.8 404.5L150.7 403.1L150.7 401.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M187.3 437.7L189.2 436.8L191 435.6L192.6 434.2L194.1 432.6L195.4 430.7L196.5 428.7L197.4 426.5L198.2 424.1L198.7 421.6L199 419L199.1 416.3L199 413.5L198.7 410.7L198.2 407.8L197.4 405L196.5 402.2L195.4 399.4L197.7 398.4L198.8 401.2L199.8 404L200.5 406.8L201 409.6L201.3 412.5L201.4 415.2L201.3 417.9L201 420.6L200.5 423.1L199.8 425.5L198.8 427.7L197.7 429.7L196.4 431.6L194.9 433.2L193.3 434.6L191.5 435.8L189.7 436.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M195.4 399.4L194.1 396.8L192.6 394.2L194.9 393.2L196.4 395.7L197.7 398.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M192.6 394.2L191 391.8L189.2 389.5L187.3 387.4L189.7 386.4L191.5 388.5L193.3 390.8L194.9 393.2ZM174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L174.9 408.7L199.1 416.3L199 419L198.7 421.6L198.2 424.1L197.4 426.5L196.5 428.7L195.4 430.7L194.1 432.6L192.6 434.2L191 435.6L189.2 436.8L187.3 437.7L185.3 438.4L183.2 438.8L181.1 439L178.8 438.8L176.6 438.5L174.3 437.8L172 436.9L169.8 435.7L167.6 434.4L165.5 432.7L163.4 430.9L161.5 428.9L159.6 426.7L157.9 424.3L156.4 421.8L155 419.2L153.8 416.5L152.8 413.7L151.9 410.9L151.3 408.1L150.9 405.2L150.7 402.4L150.7 399.7L150.9 397L151.3 394.4L151.9 392L152.8 389.7L153.8 387.6L155 385.6L156.4 383.9L157.9 382.3L159.6 381L161.5 380L163.4 379.2L165.5 378.7L167.6 378.4L169.8 378.4L172 378.6L174.3 379.1L176.6 379.9L178.8 381L181.1 382.2L183.2 383.7L185.3 385.5L187.3 387.4L189.2 389.5L191 391.8L192.6 394.2L194.1 396.8L195.4 399.4L196.5 402.2L197.4 405L198.2 407.8L198.7 410.7L199 413.5L199.1 416.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M187.3 387.4L185.3 385.5L183.2 383.7L181.1 382.2L183.4 381.2L185.6 382.7L187.7 384.4L189.7 386.4Z\"/><path class=\"iso-top\" d=\"M181.1 382.2L178.8 381L176.6 379.9L174.3 379.1L172 378.6L169.8 378.4L167.6 378.4L165.5 378.7L163.4 379.2L161.5 380L163.8 379L165.7 378.2L167.8 377.6L169.9 377.3L172.1 377.3L174.4 377.6L176.6 378.1L178.9 378.9L181.2 379.9L183.4 381.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M187.8 437.5L188.7 437.1L189.6 436.6L190.5 436L191.4 435.3L192.2 434.6L193 433.9L193.7 433L194.4 432.2L195.1 431.3L195.7 430.3L196.2 429.3L196.7 428.2L197.2 427.1L197.6 425.9L198 424.8L198.3 423.5L198.6 422.3L198.8 421L199 419.7L199.1 418.4L199.1 417L199.1 415.6L199.1 414.2L199 412.8L198.8 411.4L198.6 410L198.3 408.6L198 407.2L197.7 405.7L197.2 404.3L196.8 402.9L196.3 401.5L195.7 400.2L195.1 398.8L194.4 397.5L193.8 396.2L193 394.9L192.2 393.6L191.4 392.4L190.6 391.2L189.7 390.1L188.8 389L187.8 387.9L186.9 386.9L185.9 386L184.8 385L183.8 384.2L182.7 383.4L181.6 382.6L180.5 381.9L179.4 381.3L178.3 380.7L177.2 380.2L176.1 379.7L174.9 379.3L173.8 379L172.6 378.7L171.5 378.5L170.4 378.4L169.3 378.3L168.2 378.4L167.1 378.4L166 378.6L165 378.8L164 379L163 379.4L162 379.8\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M192.2 414.1L191.6 408.5L189.9 402.9L187.1 397.7L183.5 393.2L179.4 389.8L174.9 387.7L170.4 387L166.2 387.8L162.6 390L159.9 393.5L158.2 398L157.6 403.2L158.2 408.8L159.9 414.4L162.6 419.6L166.2 424.1L170.4 427.5L174.9 429.6L179.4 430.3L183.5 429.5L187.1 427.3L189.9 423.8L191.6 419.3Z\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M150.7 400.3L150.7 399L150.8 397.6L151 396.3L151.2 395L151.5 393.8L151.8 392.5L152.1 391.3L152.6 390.2L153 389.1L153.6 388L154.1 387L154.7 386L155.4 385.1L156.1 384.2L156.9 383.4L157.6 382.6L158.5 381.9L159.3 381.3L160.2 380.7L161.1 380.2L162.1 379.7L164.4 378.7L165.4 378.3L166.4 377.9L167.5 377.7L168.5 377.5L169.6 377.4L170.7 377.3L171.8 377.3L172.9 377.4L174.1 377.5L175.2 377.7L176.3 378L177.5 378.4L178.6 378.8L179.8 379.3L180.9 379.8L182 380.4L183.2 381L184.3 381.8L185.3 382.5L186.4 383.4L187.5 384.3L188.5 385.2L189.5 386.2L190.5 387.2L191.4 388.3L192.3 389.4L193.2 390.6L194 391.8L194.8 393L195.6 394.3L196.3 395.6L197 396.9L197.7 398.3L198.2 399.7L198.8 401L199.3 402.5L199.7 403.9L200.1 405.3L200.5 406.7L200.8 408.2L201 409.6L201.2 411L201.3 412.4L201.4 413.8L201.4 415.2L201.4 416.6L201.3 418L201.2 419.3L201 420.6L200.8 421.9L200.5 423.1L200.1 424.3L199.7 425.5L199.3 426.7L198.8 427.7L198.2 428.8L197.7 429.8L197 430.7L196.3 431.6L195.6 432.5L194.8 433.3L194 434L193.2 434.7L192.3 435.3L191.4 435.9L190.5 436.3L188.1 437.4L187.2 437.8L186.2 438.2L185.1 438.5L184.1 438.7L183 438.8L181.9 438.9L180.8 439L179.7 438.9L178.6 438.8L177.5 438.6L176.3 438.4L175.2 438.1L174 437.7L172.9 437.3L171.7 436.8L170.6 436.2L169.5 435.6L168.4 434.9L167.3 434.1L166.2 433.3L165.1 432.5L164.1 431.5L163.1 430.6L162.1 429.6L161.1 428.5L160.2 427.4L159.3 426.3L158.5 425.1L157.6 423.9L156.9 422.6L156.1 421.3L155.4 420L154.7 418.7L154.1 417.3L153.6 415.9L153 414.5L152.6 413.1L152.1 411.7L151.8 410.3L151.5 408.8L151.2 407.4L151 406L150.8 404.5L150.7 403.1L150.7 401.7Z\"/></g></g><g class=\"it\" data-name=\"fly.pulley\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M258 411.7L258.1 410.4L258.4 409.2L258.8 408L259.4 407L260 406.1L260.8 405.3L261.7 404.7L262.6 404.2L264.9 403.2L265.9 402.9L267 402.7L268.1 402.8L269.3 403L270.4 403.4L271.5 404L272.6 404.7L273.7 405.6L274.6 406.6L275.6 407.7L276.4 408.9L277.1 410.2L277.7 411.6L278.2 413L278.5 414.4L278.7 415.8L278.8 417.2L278.7 418.5L278.5 419.8L278.2 421L277.7 422.1L277.1 423.1L276.4 424L275.6 424.7L274.6 425.2L272.3 426.2L271.3 426.6L270.3 426.8L269.2 426.9L268.1 426.7L266.9 426.4L265.8 425.9L264.7 425.3L263.6 424.5L262.6 423.6L261.7 422.5L260.8 421.3L260 420.1L259.4 418.7L258.8 417.4L258.4 415.9L258.1 414.5L258 413.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M272.4 426.2L273.7 425.3L274.9 423.9L275.8 422.3L276.3 420.4L276.5 418.2L276.3 416L275.8 413.7L274.9 411.5L277.2 410.5L278.1 412.7L278.6 415L278.8 417.2L278.6 419.3L278.1 421.2L277.2 422.9L276.1 424.2L274.7 425.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M274.9 411.5L273.7 409.5L276.1 408.4L277.2 410.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M273.7 409.5L272.4 407.6L274.7 406.6L276.1 408.4ZM267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L267.2 415.3L276.5 418.2L276.3 420.4L275.8 422.3L274.9 423.9L273.7 425.3L272.4 426.2L270.8 426.8L269 426.9L267.2 426.5L265.4 425.7L263.7 424.5L262.1 423L260.7 421.2L259.5 419.1L258.7 416.9L258.2 414.7L258 412.4L258.2 410.3L258.7 408.4L259.5 406.7L260.7 405.4L262.1 404.4L263.7 403.9L265.4 403.8L267.2 404.1L269 404.9L270.8 406.1L272.4 407.6L273.7 409.5L274.9 411.5L275.8 413.7L276.3 416L276.5 418.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M272.4 407.6L270.8 406.1L269 404.9L271.3 403.9L273.1 405.1L274.7 406.6Z\"/><path class=\"iso-top\" d=\"M269 404.9L267.2 404.1L265.4 403.8L263.7 403.9L262.1 404.4L264.4 403.4L266 402.9L267.7 402.8L269.5 403.1L271.3 403.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M272.1 426.3L273 425.8L273.9 425.2L274.6 424.4L275.2 423.4L275.7 422.4L276.1 421.2L276.3 420L276.4 418.7L276.4 417.3L276.3 416L276 414.6L275.6 413.2L275 411.8L274.4 410.5L273.6 409.3L272.8 408.2L271.9 407.1L270.9 406.2L269.8 405.4L268.7 404.8L267.6 404.3L266.5 404L265.4 403.8L264.3 403.8L263.3 404L262.3 404.3\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M258 411.7L258.1 410.4L258.4 409.2L258.8 408L259.4 407L260 406.1L260.8 405.3L261.7 404.7L262.6 404.2L264.9 403.2L265.9 402.9L267 402.7L268.1 402.8L269.3 403L270.4 403.4L271.5 404L272.6 404.7L273.7 405.6L274.6 406.6L275.6 407.7L276.4 408.9L277.1 410.2L277.7 411.6L278.2 413L278.5 414.4L278.7 415.8L278.8 417.2L278.7 418.5L278.5 419.8L278.2 421L277.7 422.1L277.1 423.1L276.4 424L275.6 424.7L274.6 425.2L272.3 426.2L271.3 426.6L270.3 426.8L269.2 426.9L268.1 426.7L266.9 426.4L265.8 425.9L264.7 425.3L263.6 424.5L262.6 423.6L261.7 422.5L260.8 421.3L260 420.1L259.4 418.7L258.8 417.4L258.4 415.9L258.1 414.5L258 413.1Z\"/></g></g><g class=\"it\" data-name=\"gripR\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M324.3 211.7L324.4 210.5L324.8 209.3L325.3 208.3L326 207.5L326.8 206.9L346.2 198.3L347.1 198L348.2 197.9L349.3 198.1L350.3 198.6L351.4 199.3L352.3 200.2L353.2 201.3L353.9 202.6L354.4 203.9L354.7 205.2L354.8 206.6L354.7 207.8L354.4 209L353.9 210L353.2 210.8L352.3 211.4L333 220L332 220.3L331 220.4L329.9 220.2L328.8 219.7L327.8 219L326.8 218.1L326 217L325.3 215.8L324.8 214.4L324.4 213.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M333 220L333.8 219.5L334.5 218.7L335 217.7L335.3 216.5L335.4 215.2L335.3 213.9L335 212.5L334.5 211.2L353.9 202.6L354.4 203.9L354.7 205.2L354.8 206.6L354.7 207.8L354.4 209L353.9 210L353.2 210.8L352.3 211.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M334.5 211.2L333.8 210L353.2 201.3L353.9 202.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M333.8 210L333 208.9L352.3 200.2L353.2 201.3ZM329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L329.9 213.5L335.4 215.2L335.3 216.5L335 217.7L334.5 218.7L333.8 219.5L333 220L332 220.3L331 220.4L329.9 220.2L328.8 219.7L327.8 219L326.8 218.1L326 217L325.3 215.8L324.8 214.4L324.4 213.1L324.3 211.7L324.4 210.5L324.8 209.3L325.3 208.3L326 207.5L326.8 206.9L327.8 206.6L328.8 206.6L329.9 206.8L331 207.2L332 208L333 208.9L333.8 210L334.5 211.2L335 212.5L335.3 213.9L335.4 215.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M333 208.9L332 208L331 207.2L350.3 198.6L351.4 199.3L352.3 200.2Z\"/><path class=\"iso-top\" d=\"M331 207.2L329.9 206.8L328.8 206.6L327.8 206.6L326.8 206.9L346.2 198.3L347.1 198L348.2 197.9L349.3 198.1L350.3 198.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M332.8 220.1L333.7 219.5L334.4 218.8L334.9 217.8L335.3 216.7L335.4 215.4L335.3 214.1L335.1 212.7L334.6 211.4L333.9 210.1L333.1 209L332.1 208.1L331.1 207.3L330 206.8L329 206.6L327.9 206.6L326.9 206.9\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M324.3 211.7L324.4 210.5L324.8 209.3L325.3 208.3L326 207.5L326.8 206.9L346.2 198.3L347.1 198L348.2 197.9L349.3 198.1L350.3 198.6L351.4 199.3L352.3 200.2L353.2 201.3L353.9 202.6L354.4 203.9L354.7 205.2L354.8 206.6L354.7 207.8L354.4 209L353.9 210L353.2 210.8L352.3 211.4L333 220L332 220.3L331 220.4L329.9 220.2L328.8 219.7L327.8 219L326.8 218.1L326 217L325.3 215.8L324.8 214.4L324.4 213.1Z\"/></g></g><g class=\"it\" data-name=\"brake.arm\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M229.4 326.4L230.3 323.2L295.8 326.1L295.8 332.8L294.9 336L229.4 333.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M295.8 326.1L294.9 329.3L294.9 336L295.8 332.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M294.9 329.3L294.9 336L229.4 333.1L229.4 326.4Z\"/><path class=\"iso-top\" d=\"M295.8 326.1L294.9 329.3L229.4 326.4L230.3 323.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M295.8 326.1L294.9 329.3M294.9 329.3L229.4 326.4M294.9 329.3L294.9 336\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M229.4 326.4L230.3 323.2L295.8 326.1L295.8 332.8L294.9 336L229.4 333.1Z\"/></g></g><g class=\"it\" data-name=\"front.column\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M279.7 492.7L284.3 245.5L296.7 240L309.6 244.4L305 491.6L292.6 497.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M305 491.6L292.6 497.1L297.2 249.9L309.6 244.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M292.6 497.1L279.7 492.7L284.3 245.5L297.2 249.9Z\"/><path class=\"iso-top\" d=\"M309.6 244.4L297.2 249.9L284.3 245.5L296.7 240Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M309.6 244.4L297.2 249.9M292.6 497.1L297.2 249.9M297.2 249.9L284.3 245.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M279.7 492.7L284.3 245.5L296.7 240L309.6 244.4L305 491.6L292.6 497.1Z\"/></g></g><g class=\"it\" data-name=\"fly.axle\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M270.2 419.4L270.3 418.5L270.5 417.7L270.8 417.1L271.3 416.5L271.8 416.2L286.4 409.7L287 409.5L287.7 409.4L288.4 409.6L289.1 409.9L289.8 410.3L290.5 411L291 411.7L291.5 412.5L291.8 413.4L292 414.3L292.1 415.2L292 416L291.8 416.8L291.5 417.5L291 418L290.5 418.4L275.9 424.9L275.3 425.1L274.6 425.1L273.9 425L273.2 424.7L272.5 424.2L271.8 423.6L271.3 422.9L270.8 422L270.5 421.2L270.3 420.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M275.9 424.9L276.5 424.5L277 424L277.3 423.3L277.5 422.5L277.6 421.7L277.5 420.8L277.3 419.9L277 419L291.5 412.5L291.8 413.4L292 414.3L292.1 415.2L292 416L291.8 416.8L291.5 417.5L291 418L290.5 418.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M277 419L276.5 418.2L291 411.7L291.5 412.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M276.5 418.2L275.9 417.4L290.5 411L291 411.7ZM273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L273.9 420.5L277.6 421.7L277.5 422.5L277.3 423.3L277 424L276.5 424.5L275.9 424.9L275.3 425.1L274.6 425.1L273.9 425L273.2 424.7L272.5 424.2L271.8 423.6L271.3 422.9L270.8 422L270.5 421.2L270.3 420.2L270.2 419.4L270.3 418.5L270.5 417.7L270.8 417.1L271.3 416.5L271.8 416.2L272.5 415.9L273.2 415.9L273.9 416L274.6 416.4L275.3 416.8L275.9 417.4L276.5 418.2L277 419L277.3 419.9L277.5 420.8L277.6 421.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M275.9 417.4L275.3 416.8L274.6 416.4L289.1 409.9L289.8 410.3L290.5 411Z\"/><path class=\"iso-top\" d=\"M274.6 416.4L273.9 416L273.2 415.9L272.5 415.9L271.8 416.2L286.4 409.7L287 409.5L287.7 409.4L288.4 409.6L289.1 409.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M275.9 424.9L276.7 424.3L277.2 423.5L277.5 422.3L277.6 421.1L277.3 419.8L276.7 418.5L275.9 417.4L275 416.6L273.9 416.1L272.9 415.9L271.9 416.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M270.2 419.4L270.3 418.5L270.5 417.7L270.8 417.1L271.3 416.5L271.8 416.2L286.4 409.7L287 409.5L287.7 409.4L288.4 409.6L289.1 409.9L289.8 410.3L290.5 411L291 411.7L291.5 412.5L291.8 413.4L292 414.3L292.1 415.2L292 416L291.8 416.8L291.5 417.5L291 418L290.5 418.4L275.9 424.9L275.3 425.1L274.6 425.1L273.9 425L273.2 424.7L272.5 424.2L271.8 423.6L271.3 422.9L270.8 422L270.5 421.2L270.3 420.2Z\"/></g></g><g class=\"it\" data-name=\"flywheel\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M210.4 404.9L210.4 403.5L210.5 402.1L210.6 400.8L210.7 399.4L210.8 398.1L211 396.8L211.2 395.5L211.4 394.2L211.7 392.9L212 391.7L212.3 390.4L212.6 389.2L213 388L213.4 386.8L213.8 385.6L214.2 384.5L214.7 383.4L215.2 382.3L215.7 381.2L216.3 380.2L216.8 379.1L217.4 378.2L218 377.2L218.7 376.2L219.4 375.3L220 374.4L220.8 373.6L221.5 372.7L222.2 371.9L223 371.1L223.8 370.4L224.6 369.7L225.5 369L226.3 368.3L227.2 367.7L228.1 367.1L229 366.6L229.9 366.1L230.9 365.6L231.8 365.1L238.4 362.2L239.4 361.8L240.4 361.4L241.4 361L242.4 360.7L243.5 360.4L244.5 360.2L245.6 359.9L246.6 359.8L247.7 359.6L248.8 359.5L249.9 359.4L251 359.4L252.1 359.4L253.2 359.4L254.3 359.5L255.4 359.6L256.6 359.8L257.7 359.9L258.9 360.2L260 360.4L261.1 360.7L262.3 361L263.4 361.4L264.6 361.7L265.7 362.2L266.9 362.6L268 363.1L269.2 363.6L270.3 364.2L271.4 364.8L272.5 365.4L273.7 366L274.8 366.7L275.9 367.4L277 368.2L278.1 368.9L279.2 369.8L280.2 370.6L281.3 371.4L282.3 372.3L283.4 373.3L284.4 374.2L285.4 375.2L286.4 376.2L287.4 377.2L288.4 378.2L289.3 379.3L290.2 380.4L291.2 381.5L292.1 382.7L293 383.8L293.8 385L294.7 386.2L295.5 387.4L296.3 388.7L297.1 389.9L297.9 391.2L298.6 392.5L299.3 393.8L300 395.1L300.7 396.4L301.4 397.8L302 399.1L302.6 400.5L303.2 401.9L303.7 403.3L304.3 404.7L304.8 406.1L305.3 407.5L305.7 408.9L306.2 410.3L306.6 411.7L306.9 413.2L307.3 414.6L307.6 416L307.9 417.5L308.2 418.9L308.4 420.3L308.6 421.8L308.8 423.2L309 424.6L309.1 426L309.2 427.5L309.3 428.9L309.3 430.3L309.3 431.7L309.3 433L309.3 434.4L309.2 435.8L309.1 437.1L309 438.5L308.8 439.8L308.6 441.1L308.4 442.4L308.2 443.7L307.9 444.9L307.6 446.2L307.3 447.4L306.9 448.6L306.6 449.8L306.2 451L305.7 452.1L305.3 453.3L304.8 454.4L304.3 455.5L303.7 456.5L303.2 457.6L302.6 458.6L302 459.6L301.4 460.5L300.7 461.5L300 462.4L299.3 463.2L298.6 464.1L297.9 464.9L297.1 465.7L296.3 466.5L295.5 467.2L294.7 467.9L293.8 468.6L293 469.2L292.1 469.8L291.2 470.4L290.2 470.9L289.3 471.4L288.4 471.9L287.4 472.3L280.8 475.3L279.8 475.7L278.8 476L277.8 476.4L276.8 476.7L275.7 476.9L274.7 477.2L273.6 477.4L272.6 477.5L271.5 477.7L270.4 477.7L269.3 477.8L268.2 477.8L267.1 477.8L266 477.7L264.8 477.7L263.7 477.5L262.6 477.4L261.4 477.2L260.3 476.9L259.1 476.7L258 476.4L256.9 476.1L255.7 475.7L254.6 475.3L253.4 474.8L252.3 474.4L251.1 473.9L250 473.3L248.9 472.8L247.7 472.2L246.6 471.5L245.5 470.9L244.4 470.2L243.3 469.4L242.2 468.7L241.1 467.9L240 467.1L239 466.2L237.9 465.3L236.9 464.4L235.8 463.5L234.8 462.5L233.8 461.6L232.8 460.5L231.8 459.5L230.9 458.4L229.9 457.4L229 456.3L228.1 455.1L227.2 454L226.3 452.8L225.5 451.6L224.6 450.4L223.8 449.2L223 447.9L222.2 446.7L221.5 445.4L220.8 444.1L220 442.8L219.4 441.5L218.7 440.1L218 438.8L217.4 437.4L216.8 436L216.3 434.6L215.7 433.3L215.2 431.9L214.7 430.4L214.2 429L213.8 427.6L213.4 426.2L213 424.8L212.6 423.3L212.3 421.9L212 420.5L211.7 419L211.4 417.6L211.2 416.2L211 414.7L210.8 413.3L210.7 411.9L210.6 410.5L210.5 409.1L210.4 407.7L210.4 406.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M281.9 474.8L283.8 473.8L285.6 472.7L287.3 471.4L289 470L290.6 468.5L292.1 466.9L293.5 465.2L294.8 463.4L296.1 461.4L297.2 459.4L298.2 457.2L299.2 455L300 452.7L300.7 450.3L301.3 447.8L301.8 445.3L302.2 442.7L302.5 440L302.7 437.3L302.7 434.6L302.7 431.8L302.5 429L302.2 426.2L301.8 423.3L301.3 420.5L300.7 417.6L300 414.8L299.2 411.9L298.2 409.1L297.2 406.3L296.1 403.6L302.7 400.6L303.8 403.4L304.8 406.2L305.8 409L306.6 411.8L307.3 414.7L307.9 417.5L308.4 420.4L308.8 423.2L309.1 426.1L309.3 428.9L309.3 431.7L309.3 434.4L309.1 437.1L308.8 439.8L308.4 442.4L307.9 444.9L307.3 447.4L306.6 449.8L305.8 452.1L304.8 454.3L303.8 456.4L302.7 458.5L301.4 460.4L300.1 462.3L298.7 464L297.2 465.6L295.6 467.1L293.9 468.5L292.2 469.7L290.4 470.8L288.5 471.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M296.1 403.6L294.8 400.8L293.5 398.2L292.1 395.6L290.6 393L289 390.5L295.6 387.6L297.2 390.1L298.7 392.6L300.1 395.2L301.4 397.9L302.7 400.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M289 390.5L287.3 388.1L285.6 385.8L283.8 383.5L281.9 381.3L280 379.3L286.6 376.3L288.5 378.4L290.4 380.6L292.2 382.8L293.9 385.2L295.6 387.6ZM256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L256.6 420.1L302.7 434.6L302.7 437.3L302.5 440L302.2 442.7L301.8 445.3L301.3 447.8L300.7 450.3L300 452.7L299.2 455L298.2 457.2L297.2 459.4L296.1 461.4L294.8 463.4L293.5 465.2L292.1 466.9L290.6 468.5L289 470L287.3 471.4L285.6 472.7L283.8 473.8L281.9 474.8L280 475.6L278 476.3L275.9 476.9L273.8 477.3L271.7 477.6L269.5 477.8L267.3 477.8L265.1 477.7L262.8 477.4L260.6 477L258.3 476.5L256 475.8L253.7 475L251.4 474L249.2 472.9L246.9 471.7L244.7 470.4L242.5 468.9L240.4 467.3L238.2 465.6L236.2 463.8L234.1 461.9L232.2 459.9L230.3 457.7L228.4 455.5L226.6 453.2L224.9 450.9L223.3 448.4L221.8 445.9L220.3 443.3L218.9 440.7L217.7 438L216.5 435.2L215.4 432.4L214.4 429.6L213.5 426.8L212.8 424L212.1 421.1L211.5 418.3L211.1 415.4L210.8 412.6L210.5 409.8L210.4 407L210.4 404.2L210.5 401.5L210.8 398.8L211.1 396.2L211.5 393.6L212.1 391.1L212.8 388.7L213.5 386.3L214.4 384L215.4 381.8L216.5 379.7L217.7 377.7L218.9 375.9L220.3 374.1L221.8 372.4L223.3 370.9L224.9 369.4L226.6 368.1L228.4 366.9L230.3 365.9L232.2 365L234.1 364.2L236.2 363.5L238.2 363L240.4 362.7L242.5 362.4L244.7 362.3L246.9 362.4L249.2 362.6L251.4 362.9L253.7 363.4L256 364L258.3 364.8L260.6 365.7L262.8 366.7L265.1 367.8L267.3 369.1L269.5 370.5L271.7 372L273.8 373.7L275.9 375.4L278 377.3L280 379.3L281.9 381.3L283.8 383.5L285.6 385.8L287.3 388.1L289 390.5L290.6 393L292.1 395.6L293.5 398.2L294.8 400.8L296.1 403.6L297.2 406.3L298.2 409.1L299.2 411.9L300 414.8L300.7 417.6L301.3 420.5L301.8 423.3L302.2 426.2L302.5 429L302.7 431.8L302.7 434.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M280 379.3L278 377.3L275.9 375.4L273.8 373.7L271.7 372L269.5 370.5L267.3 369.1L273.9 366.2L276.1 367.6L278.3 369.1L280.4 370.7L282.5 372.5L284.6 374.4L286.6 376.3Z\"/><path class=\"iso-top\" d=\"M267.3 369.1L265.1 367.8L262.8 366.7L260.6 365.7L258.3 364.8L256 364L253.7 363.4L251.4 362.9L249.2 362.6L246.9 362.4L244.7 362.3L242.5 362.4L240.4 362.7L238.2 363L236.2 363.5L234.1 364.2L232.2 365L238.8 362L240.7 361.2L242.8 360.6L244.8 360.1L246.9 359.7L249.1 359.5L251.3 359.4L253.5 359.5L255.8 359.7L258 360L260.3 360.5L262.6 361.1L264.9 361.8L267.1 362.7L269.4 363.7L271.7 364.9L273.9 366.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M281.1 475.1L282.1 474.7L283 474.2L284 473.7L284.9 473.1L285.8 472.5L286.6 471.9L287.5 471.3L288.3 470.6L289.2 469.9L290 469.2L290.7 468.4L291.5 467.6L292.2 466.8L292.9 465.9L293.6 465L294.3 464.1L295 463.2L295.6 462.2L296.2 461.2L296.7 460.2L297.3 459.2L297.8 458.1L298.3 457L298.8 455.9L299.2 454.8L299.7 453.7L300.1 452.5L300.4 451.3L300.8 450.1L301.1 448.8L301.4 447.6L301.6 446.3L301.9 445.1L302.1 443.8L302.3 442.5L302.4 441.1L302.5 439.8L302.6 438.4L302.7 437.1L302.7 435.7L302.7 434.3L302.7 432.9L302.7 431.6L302.6 430.2L302.5 428.7L302.4 427.3L302.2 425.9L302 424.5L301.8 423.1L301.5 421.6L301.3 420.2L301 418.8L300.7 417.3L300.3 415.9L299.9 414.5L299.5 413.1L299.1 411.7L298.6 410.3L298.1 408.9L297.6 407.5L297.1 406.1L296.5 404.7L296 403.3L295.3 402L294.7 400.6L294.1 399.3L293.4 397.9L292.7 396.6L292 395.3L291.2 394L290.5 392.8L289.7 391.5L288.9 390.3L288 389.1L287.2 387.9L286.3 386.7L285.4 385.6L284.5 384.4L283.6 383.3L282.7 382.2L281.7 381.2L280.8 380.1L279.8 379.1L278.8 378.1L277.8 377.1L276.8 376.2L275.7 375.3L274.7 374.4L273.6 373.5L272.6 372.7L271.5 371.9L270.4 371.1L269.3 370.4L268.2 369.7L267.1 369L266 368.3L264.9 367.7L263.8 367.1L262.6 366.6L261.5 366.1L260.3 365.6L259.2 365.1L258.1 364.7L256.9 364.3L255.8 364L254.6 363.6L253.5 363.4L252.4 363.1L251.2 362.9L250.1 362.7L249 362.6L247.8 362.5L246.7 362.4L245.6 362.4L244.5 362.3L243.4 362.4L242.3 362.4L241.2 362.6L240.2 362.7L239.1 362.9L238 363.1L237 363.3L236 363.6L235 363.9L234 364.3L233 364.6L232 365\"/><path class=\"iso-line\" data-tone=\"lo\" d=\"M295.8 432.4L294.5 419.7L290.5 407L284.3 395.2L276.2 385.1L266.7 377.4L256.5 372.6L246.4 371L236.9 372.8L228.8 377.8L222.6 385.7L218.6 395.9L217.3 407.8L218.6 420.5L222.6 433.2L228.8 445L236.9 455.1L246.4 462.8L256.5 467.6L266.7 469.2L276.2 467.4L284.3 462.4L290.5 454.5L294.5 444.3Z\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M210.4 404.9L210.4 403.5L210.5 402.1L210.6 400.8L210.7 399.4L210.8 398.1L211 396.8L211.2 395.5L211.4 394.2L211.7 392.9L212 391.7L212.3 390.4L212.6 389.2L213 388L213.4 386.8L213.8 385.6L214.2 384.5L214.7 383.4L215.2 382.3L215.7 381.2L216.3 380.2L216.8 379.1L217.4 378.2L218 377.2L218.7 376.2L219.4 375.3L220 374.4L220.8 373.6L221.5 372.7L222.2 371.9L223 371.1L223.8 370.4L224.6 369.7L225.5 369L226.3 368.3L227.2 367.7L228.1 367.1L229 366.6L229.9 366.1L230.9 365.6L231.8 365.1L238.4 362.2L239.4 361.8L240.4 361.4L241.4 361L242.4 360.7L243.5 360.4L244.5 360.2L245.6 359.9L246.6 359.8L247.7 359.6L248.8 359.5L249.9 359.4L251 359.4L252.1 359.4L253.2 359.4L254.3 359.5L255.4 359.6L256.6 359.8L257.7 359.9L258.9 360.2L260 360.4L261.1 360.7L262.3 361L263.4 361.4L264.6 361.7L265.7 362.2L266.9 362.6L268 363.1L269.2 363.6L270.3 364.2L271.4 364.8L272.5 365.4L273.7 366L274.8 366.7L275.9 367.4L277 368.2L278.1 368.9L279.2 369.8L280.2 370.6L281.3 371.4L282.3 372.3L283.4 373.3L284.4 374.2L285.4 375.2L286.4 376.2L287.4 377.2L288.4 378.2L289.3 379.3L290.2 380.4L291.2 381.5L292.1 382.7L293 383.8L293.8 385L294.7 386.2L295.5 387.4L296.3 388.7L297.1 389.9L297.9 391.2L298.6 392.5L299.3 393.8L300 395.1L300.7 396.4L301.4 397.8L302 399.1L302.6 400.5L303.2 401.9L303.7 403.3L304.3 404.7L304.8 406.1L305.3 407.5L305.7 408.9L306.2 410.3L306.6 411.7L306.9 413.2L307.3 414.6L307.6 416L307.9 417.5L308.2 418.9L308.4 420.3L308.6 421.8L308.8 423.2L309 424.6L309.1 426L309.2 427.5L309.3 428.9L309.3 430.3L309.3 431.7L309.3 433L309.3 434.4L309.2 435.8L309.1 437.1L309 438.5L308.8 439.8L308.6 441.1L308.4 442.4L308.2 443.7L307.9 444.9L307.6 446.2L307.3 447.4L306.9 448.6L306.6 449.8L306.2 451L305.7 452.1L305.3 453.3L304.8 454.4L304.3 455.5L303.7 456.5L303.2 457.6L302.6 458.6L302 459.6L301.4 460.5L300.7 461.5L300 462.4L299.3 463.2L298.6 464.1L297.9 464.9L297.1 465.7L296.3 466.5L295.5 467.2L294.7 467.9L293.8 468.6L293 469.2L292.1 469.8L291.2 470.4L290.2 470.9L289.3 471.4L288.4 471.9L287.4 472.3L280.8 475.3L279.8 475.7L278.8 476L277.8 476.4L276.8 476.7L275.7 476.9L274.7 477.2L273.6 477.4L272.6 477.5L271.5 477.7L270.4 477.7L269.3 477.8L268.2 477.8L267.1 477.8L266 477.7L264.8 477.7L263.7 477.5L262.6 477.4L261.4 477.2L260.3 476.9L259.1 476.7L258 476.4L256.9 476.1L255.7 475.7L254.6 475.3L253.4 474.8L252.3 474.4L251.1 473.9L250 473.3L248.9 472.8L247.7 472.2L246.6 471.5L245.5 470.9L244.4 470.2L243.3 469.4L242.2 468.7L241.1 467.9L240 467.1L239 466.2L237.9 465.3L236.9 464.4L235.8 463.5L234.8 462.5L233.8 461.6L232.8 460.5L231.8 459.5L230.9 458.4L229.9 457.4L229 456.3L228.1 455.1L227.2 454L226.3 452.8L225.5 451.6L224.6 450.4L223.8 449.2L223 447.9L222.2 446.7L221.5 445.4L220.8 444.1L220 442.8L219.4 441.5L218.7 440.1L218 438.8L217.4 437.4L216.8 436L216.3 434.6L215.7 433.3L215.2 431.9L214.7 430.4L214.2 429L213.8 427.6L213.4 426.2L213 424.8L212.6 423.3L212.3 421.9L212 420.5L211.7 419L211.4 417.6L211.2 416.2L211 414.7L210.8 413.3L210.7 411.9L210.6 410.5L210.5 409.1L210.4 407.7L210.4 406.3Z\"/></g><g data-part=\"flyspin\"></g></g><g class=\"it\" data-name=\"fly.hub\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M244.3 417.9L244.4 416.6L244.7 415.3L245.1 414.2L245.6 413.1L246.3 412.2L247 411.4L247.9 410.8L248.9 410.3L251.9 409L253 408.7L254 408.5L255.2 408.6L256.3 408.8L257.4 409.2L258.5 409.8L259.6 410.5L260.7 411.4L261.7 412.4L262.6 413.5L263.4 414.7L264.1 416L264.7 417.4L265.2 418.8L265.5 420.2L265.7 421.6L265.8 423L265.7 424.3L265.5 425.6L265.2 426.8L264.7 427.9L264.1 428.9L263.4 429.8L262.6 430.5L261.7 431L258.6 432.4L257.6 432.8L256.5 433L255.4 433L254.3 432.9L253.2 432.5L252.1 432.1L250.9 431.4L249.9 430.6L248.9 429.7L247.9 428.6L247 427.5L246.3 426.2L245.6 424.9L245.1 423.5L244.7 422.1L244.4 420.7L244.3 419.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M258.6 432.4L260 431.4L261.1 430.1L262 428.4L262.5 426.5L262.7 424.4L262.5 422.1L262 419.9L261.1 417.7L264.2 416.3L265.1 418.5L265.6 420.7L265.8 423L265.6 425.1L265.1 427L264.2 428.7L263.1 430L261.7 431Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M261.1 417.7L260 415.6L263.1 414.2L264.2 416.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M260 415.6L258.6 413.8L261.7 412.4L263.1 414.2ZM253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L253.5 421.5L262.7 424.4L262.5 426.5L262 428.4L261.1 430.1L260 431.4L258.6 432.4L257 432.9L255.3 433L253.5 432.6L251.7 431.9L249.9 430.7L248.3 429.1L246.9 427.3L245.8 425.3L244.9 423.1L244.4 420.8L244.2 418.6L244.4 416.4L244.9 414.5L245.8 412.8L246.9 411.5L248.3 410.6L249.9 410L251.7 409.9L253.5 410.3L255.3 411.1L257 412.2L258.6 413.8L260 415.6L261.1 417.7L262 419.9L262.5 422.1L262.7 424.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M258.6 413.8L257 412.2L255.3 411.1L258.4 409.7L260.1 410.9L261.7 412.4Z\"/><path class=\"iso-top\" d=\"M255.3 411.1L253.5 410.3L251.7 409.9L249.9 410L248.3 410.6L251.4 409.2L253 408.6L254.8 408.6L256.6 408.9L258.4 409.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M258.4 432.5L259.3 432L260.1 431.3L260.8 430.5L261.5 429.6L262 428.5L262.3 427.4L262.6 426.2L262.7 424.8L262.7 423.5L262.5 422.1L262.2 420.7L261.8 419.3L261.3 418L260.6 416.7L259.9 415.4L259 414.3L258.1 413.3L257.1 412.3L256.1 411.6L255 410.9L253.9 410.4L252.7 410.1L251.6 409.9L250.6 409.9L249.5 410.1L248.6 410.5\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M244.3 417.9L244.4 416.6L244.7 415.3L245.1 414.2L245.6 413.1L246.3 412.2L247 411.4L247.9 410.8L248.9 410.3L251.9 409L253 408.7L254 408.5L255.2 408.6L256.3 408.8L257.4 409.2L258.5 409.8L259.6 410.5L260.7 411.4L261.7 412.4L262.6 413.5L263.4 414.7L264.1 416L264.7 417.4L265.2 418.8L265.5 420.2L265.7 421.6L265.8 423L265.7 424.3L265.5 425.6L265.2 426.8L264.7 427.9L264.1 428.9L263.4 429.8L262.6 430.5L261.7 431L258.6 432.4L257.6 432.8L256.5 433L255.4 433L254.3 432.9L253.2 432.5L252.1 432.1L250.9 431.4L249.9 430.6L248.9 429.7L247.9 428.6L247 427.5L246.3 426.2L245.6 424.9L245.1 423.5L244.7 422.1L244.4 420.7L244.3 419.3Z\"/></g></g><g class=\"it\" data-name=\"stem\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M290.4 232.9L290.6 231.9L291.9 231.1L293.9 230.4L296.4 230.2L298.9 230.3L301.2 230.7L302.8 231.5L303.6 232.4L303.6 244.7L303.3 245.7L302 246.5L300 247.1L297.5 247.4L295 247.3L292.7 246.8L291.1 246.1L290.4 245.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M302 246.5L300 247.1L300 234.9L302 234.2ZM303.6 244.7L303.3 245.7L303.3 233.4L303.6 232.4ZM303.3 245.7L302 246.5L302 234.2L303.3 233.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M300 247.1L297.5 247.4L297.5 235.1L300 234.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M297.5 247.4L295 247.3L295 235L297.5 235.1ZM295 247.3L292.7 246.8L292.7 234.6L295 235Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M292.7 246.8L291.1 246.1L291.1 233.8L292.7 234.6ZM291.1 246.1L290.4 245.2L290.4 232.9L291.1 233.8Z\"/><path class=\"iso-top\" d=\"M302 234.2L300 234.9L297.5 235.1L295 235L292.7 234.6L291.1 233.8L290.4 232.9L290.6 231.9L291.9 231.1L293.9 230.4L296.4 230.2L298.9 230.3L301.2 230.7L302.8 231.5L303.6 232.4L303.3 233.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M303.6 232.4L303.3 233.4L302 234.2L300 234.9L297.5 235.1L295 235L292.7 234.6L291.1 233.8L290.4 232.9\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M290.4 232.9L290.6 231.9L291.9 231.1L293.9 230.4L296.4 230.2L298.9 230.3L301.2 230.7L302.8 231.5L303.6 232.4M303.6 244.7L303.3 245.7L302 246.5L300 247.1L297.5 247.4L295 247.3L292.7 246.8L291.1 246.1L290.4 245.2M290.4 232.9L290.4 245.2M303.6 232.4L303.6 244.7\"/></g></g><g class=\"it\" data-name=\"handlebar\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M260.3 241.7L260.4 240.9L260.6 240.1L261 239.4L261.4 238.9L262 238.5L327.8 209.1L328.5 208.9L329.2 208.9L329.9 209L330.6 209.3L331.3 209.8L331.9 210.4L332.5 211.1L333 212L333.3 212.8L333.5 213.7L333.6 214.6L333.5 215.5L333.3 216.3L333 216.9L332.5 217.5L331.9 217.8L266.1 247.2L265.4 247.5L264.7 247.5L264 247.4L263.3 247L262.6 246.6L262 246L261.4 245.2L261 244.4L260.6 243.5L260.4 242.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M266.1 247.2L266.6 246.9L267.1 246.3L267.4 245.7L267.6 244.9L267.7 244L267.6 243.1L267.4 242.2L267.1 241.4L333 212L333.3 212.8L333.5 213.7L333.6 214.6L333.5 215.5L333.3 216.3L333 216.9L332.5 217.5L331.9 217.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M267.1 241.4L266.6 240.5L332.5 211.1L333 212Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M266.6 240.5L266.1 239.8L331.9 210.4L332.5 211.1ZM264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L264 242.9L267.7 244L267.6 244.9L267.4 245.7L267.1 246.3L266.6 246.9L266.1 247.2L265.4 247.5L264.7 247.5L264 247.4L263.3 247L262.6 246.6L262 246L261.4 245.2L261 244.4L260.6 243.5L260.4 242.6L260.3 241.7L260.4 240.9L260.6 240.1L261 239.4L261.4 238.9L262 238.5L262.6 238.3L263.3 238.3L264 238.4L264.7 238.7L265.4 239.2L266.1 239.8L266.6 240.5L267.1 241.4L267.4 242.2L267.6 243.1L267.7 244Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M266.1 239.8L265.4 239.2L264.7 238.7L330.6 209.3L331.3 209.8L331.9 210.4Z\"/><path class=\"iso-top\" d=\"M264.7 238.7L264 238.4L263.3 238.3L262.6 238.3L262 238.5L327.8 209.1L328.5 208.9L329.2 208.9L329.9 209L330.6 209.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M266 247.3L266.8 246.7L267.4 245.8L267.7 244.7L267.7 243.4L267.4 242.1L266.8 240.9L266.1 239.8L265.1 238.9L264.1 238.4L263 238.3L262.1 238.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M260.3 241.7L260.4 240.9L260.6 240.1L261 239.4L261.4 238.9L262 238.5L327.8 209.1L328.5 208.9L329.2 208.9L329.9 209L330.6 209.3L331.3 209.8L331.9 210.4L332.5 211.1L333 212L333.3 212.8L333.5 213.7L333.6 214.6L333.5 215.5L333.3 216.3L333 216.9L332.5 217.5L331.9 217.8L266.1 247.2L265.4 247.5L264.7 247.5L264 247.4L263.3 247L262.6 246.6L262 246L261.4 245.2L261 244.4L260.6 243.5L260.4 242.6Z\"/></g></g><g class=\"it\" data-name=\"power.head\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M265.9 206.7L267.2 205.7L294.4 193.6L296.9 192.9L300 192.8L302.8 193.3L316.7 197.7L318.5 198.6L318.8 199.8L318.8 219.3L317.4 220.4L290.3 232.5L287.8 233.2L284.7 233.3L281.8 232.8L268 228.4L266.2 227.5L265.9 226.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M318.8 219.3L317.4 220.4L317.4 200.8L318.8 199.8ZM317.4 220.4L290.3 232.5L290.3 212.9L317.4 200.8ZM290.3 232.5L287.8 233.2L287.8 213.6L290.3 212.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M287.8 233.2L284.7 233.3L284.7 213.7L287.8 213.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M284.7 233.3L281.8 232.8L281.8 213.2L284.7 213.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M281.8 232.8L268 228.4L268 208.9L281.8 213.2ZM268 228.4L266.2 227.5L266.2 207.9L268 208.9ZM266.2 227.5L265.9 226.3L265.9 206.7L266.2 207.9Z\"/><path class=\"iso-top\" d=\"M316.7 197.7L318.5 198.6L318.8 199.8L317.4 200.8L290.3 212.9L287.8 213.6L284.7 213.7L281.8 213.2L268 208.9L266.2 207.9L265.9 206.7L267.2 205.7L294.4 193.6L296.9 192.9L300 192.8L302.8 193.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M318.8 199.8L317.4 200.8L290.3 212.9L287.8 213.6L284.7 213.7L281.8 213.2L268 208.9L266.2 207.9L265.9 206.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M318.8 199.8L316.4 200.6L289.5 212.6L287.4 213.2L284.9 213.3L282.5 212.8L268.9 208.6L267.3 207.8L265.9 206.7\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M265.9 206.7L267.2 205.7L294.4 193.6L296.9 192.9L300 192.8L302.8 193.3L316.7 197.7L318.5 198.6L318.8 199.8M318.8 219.3L317.4 220.4L290.3 232.5L287.8 233.2L284.7 233.3L281.8 232.8L268 228.4L266.2 227.5L265.9 226.3M318.8 199.8L318.8 219.3M265.9 206.7L265.9 226.3\"/></g><g class=\"iso-dots\" data-tone=\"lit\"><circle cx=\"313.6\" cy=\"209.3\" r=\"0.6\"/><circle cx=\"294.2\" cy=\"217.9\" r=\"0.6\"/></g></g><g class=\"it\" data-name=\"gripL\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M239.1 249.8L239.2 248.5L239.5 247.4L240 246.4L240.7 245.6L241.6 245L260.9 236.3L261.9 236L262.9 236L264 236.2L265.1 236.6L266.1 237.4L267.1 238.3L267.9 239.4L268.6 240.6L269.1 241.9L269.5 243.3L269.6 244.6L269.5 245.9L269.1 247.1L268.6 248.1L267.9 248.9L267.1 249.4L247.7 258.1L246.8 258.4L245.7 258.4L244.7 258.2L243.6 257.8L242.5 257.1L241.6 256.1L240.7 255L240 253.8L239.5 252.5L239.2 251.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M247.7 258.1L248.6 257.5L249.3 256.7L249.8 255.7L250.1 254.5L250.2 253.3L250.1 251.9L249.8 250.6L249.3 249.3L268.6 240.6L269.1 241.9L269.5 243.3L269.6 244.6L269.5 245.9L269.1 247.1L268.6 248.1L267.9 248.9L267.1 249.4Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M249.3 249.3L248.6 248L267.9 239.4L268.6 240.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M248.6 248L247.7 246.9L267.1 238.3L267.9 239.4ZM244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L244.7 251.5L250.2 253.3L250.1 254.5L249.8 255.7L249.3 256.7L248.6 257.5L247.7 258.1L246.8 258.4L245.7 258.4L244.7 258.2L243.6 257.8L242.5 257.1L241.6 256.1L240.7 255L240 253.8L239.5 252.5L239.2 251.1L239.1 249.8L239.2 248.5L239.5 247.4L240 246.4L240.7 245.6L241.6 245L242.5 244.7L243.6 244.6L244.7 244.8L245.7 245.3L246.8 246L247.7 246.9L248.6 248L249.3 249.3L249.8 250.6L250.1 251.9L250.2 253.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M247.7 246.9L246.8 246L245.7 245.3L265.1 236.6L266.1 237.4L267.1 238.3Z\"/><path class=\"iso-top\" d=\"M245.7 245.3L244.7 244.8L243.6 244.6L242.5 244.7L241.6 245L260.9 236.3L261.9 236L262.9 236L264 236.2L265.1 236.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M247.6 258.1L248.5 257.6L249.2 256.8L249.7 255.9L250.1 254.7L250.2 253.5L250.1 252.1L249.8 250.8L249.3 249.4L248.7 248.2L247.9 247.1L246.9 246.1L245.9 245.4L244.8 244.9L243.7 244.6L242.7 244.6L241.7 244.9\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M239.1 249.8L239.2 248.5L239.5 247.4L240 246.4L240.7 245.6L241.6 245L260.9 236.3L261.9 236L262.9 236L264 236.2L265.1 236.6L266.1 237.4L267.1 238.3L267.9 239.4L268.6 240.6L269.1 241.9L269.5 243.3L269.6 244.6L269.5 245.9L269.1 247.1L268.6 248.1L267.9 248.9L267.1 249.4L247.7 258.1L246.8 258.4L245.7 258.4L244.7 258.2L243.6 257.8L242.5 257.1L241.6 256.1L240.7 255L240 253.8L239.5 252.5L239.2 251.1Z\"/></g></g><g data-part=\"brake\"></g><g data-part=\"runner\"></g></svg></div></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-vo2-bike", Fig);
})();
