import { readMotionFactor } from "./motion-tokens";

/**
 * Contour: a surface whose outline moves like matter instead of a box that resizes. Beamline's own model (research/
 * morphing-interfaces-2026-10-04): a rounded quadrilateral whose four corners each follow their target on a critically
 * damped spring. The corner facing the way it travels answers fastest and the far one slowest, so it leads and gathers;
 * each edge's midpoint heads for where its edge will be a little ahead of its corners and may only bulge outward (the
 * leading edge rounds out like the front of a drop, the tail stays smooth), and while the shape is longer than its target the long edges
 * pinch toward the centre, so a fast move draws a neck; while it is stretched its corners round toward a capsule, as a moving drop does. No spring overshoots: the elasticity is the parts arriving at
 * different moments, never bounce. At rest the surface is its plain CSS box with no clip and no frames.
 *
 * The look decides the material through four inputs on the element (preset-source.css): --m-morph-spread (how unevenly
 * the corners answer; 0 is rigid travel), --m-morph-front (px the leading edge may round out), --m-morph-waist (how much
 * a stretch pinches) and --m-morph-weight (a multiplier on the response time).
 */
export interface ContourBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Contour {
  /** Move the surface to `box` (in its offset parent's coordinates). `instant` places it with no motion. */
  to(box: ContourBox, options?: { instant?: boolean }): void;
  /** Stop and leave the surface at its target. */
  destroy(): void;
}

type Point = [number, number];
type Corner = "tl" | "tr" | "br" | "bl";
type Edge = "t" | "r" | "b" | "l";
const CORNERS: Corner[] = ["tl", "tr", "br", "bl"];
const EDGES: Edge[] = ["t", "r", "b", "l"];
/** Outward direction of each corner, for deciding which one leads. */
const OUT: Record<Corner, Point> = { tl: [-1, -1], tr: [1, -1], br: [1, 1], bl: [-1, 1] };
/** Outward direction of each edge. */
const NORMAL: Record<Edge, Point> = { t: [0, -1], r: [1, 0], b: [0, 1], l: [-1, 0] };
/** Settles at the motion-token morph spring at the foundation default. */
const BASE_RESPONSE = 0.26;

interface Mechanics {
  spread: number;
  front: number;
  waist: number;
  weight: number;
  /** The colour of the edge drawn along a non-rectangular outline (the look's hairline, which a clip would cut off). */
  rim: string;
  rimWidth: number;
}

/** One step of a critically damped spring with response time `t` (s), in closed form so a long frame cannot explode. */
function step(x: number, v: number, target: number, t: number, dt: number): [number, number] {
  const w = (2 * Math.PI) / (t * 1.2);
  const d = x - target;
  const e = Math.exp(-w * dt);
  return [target + (d + (v + w * d) * dt) * e, (v - w * (v + w * d) * dt) * e];
}

const cornersOf = (b: ContourBox): Record<Corner, Point> => ({
  tl: [b.x, b.y],
  tr: [b.x + b.w, b.y],
  br: [b.x + b.w, b.y + b.h],
  bl: [b.x, b.y + b.h],
});
const midsOf = (c: Record<Corner, Point>): Record<Edge, Point> => ({
  t: [(c.tl[0] + c.tr[0]) / 2, (c.tl[1] + c.tr[1]) / 2],
  r: [(c.tr[0] + c.br[0]) / 2, (c.tr[1] + c.br[1]) / 2],
  b: [(c.br[0] + c.bl[0]) / 2, (c.br[1] + c.bl[1]) / 2],
  l: [(c.bl[0] + c.tl[0]) / 2, (c.bl[1] + c.tl[1]) / 2],
});
const zero = <K extends string>(keys: K[]) => Object.fromEntries(keys.map((k) => [k, [0, 0]])) as Record<K, Point>;
const num = (style: CSSStyleDeclaration, name: string, fallback: number) => {
  const value = Number.parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
};

/** All moving contours share one frame loop, which stops when the last one settles. */
const moving = new Set<(dt: number) => boolean>();
let frame = 0;
let last = 0;
function tick(now: number) {
  const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
  last = now;
  for (const advance of moving) if (!advance(dt)) moving.delete(advance);
  frame = moving.size ? requestAnimationFrame(tick) : 0;
}
function run(advance: (dt: number) => boolean) {
  moving.add(advance);
  if (!frame) {
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
}

/** One contour per element, so a remount (or React's development double mount) keeps its place and keeps moving. */
const contours = new WeakMap<HTMLElement, Contour>();
export function createContour(el: HTMLElement): Contour {
  const existing = contours.get(el);
  if (existing) return existing;
  let target: ContourBox | null = null;
  let pos: Record<Corner, Point> | null = null;
  let vel = zero(CORNERS);
  let mid: Record<Edge, Point> = { t: [0, 0], r: [0, 0], b: [0, 0], l: [0, 0] };
  let midVel = zero(EDGES);
  let mech: Mechanics = { spread: 0.35, front: 5, waist: 0.16, weight: 1, rim: "none", rimWidth: 1 };
  let rimPath: SVGPathElement | null = null;
  const rim = (d: string | null, w = 0, h = 0) => {
    if (!d || mech.rim === "none") {
      if (rimPath) (rimPath.ownerSVGElement as SVGSVGElement).style.display = "none";
      return;
    }
    if (!rimPath) {
      const ns = "http://www.w3.org/2000/svg";
      const svg = el.ownerDocument.createElementNS(ns, "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("data-contour-rim", "");
      svg.style.cssText = "position:absolute;left:0;top:0;z-index:2;overflow:visible;pointer-events:none";
      rimPath = el.ownerDocument.createElementNS(ns, "path");
      rimPath.setAttribute("fill", "none");
      svg.appendChild(rimPath);
      el.appendChild(svg);
    }
    const svg = rimPath.ownerSVGElement as SVGSVGElement;
    svg.style.display = "";
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    rimPath.setAttribute("d", d);
    // the clip keeps the inner half of the stroke: an edge of rimWidth inside the outline
    rimPath.setAttribute("stroke-width", String(mech.rimWidth * 2));
    rimPath.style.stroke = mech.rim;
  };
  let response = BASE_RESPONSE;
  let radius = 0;
  let running = false;

  const rest = () => {
    if (!target) return;
    el.style.transform = `translate(${target.x}px, ${target.y}px)`;
    el.style.width = `${target.w}px`;
    el.style.height = `${target.h}px`;
    el.style.clipPath = "";
    rim(null);
    delete el.dataset.morphing;
  };

  const draw = () => {
    if (!pos || !target) return;
    const c = pos;
    const w = (c.tr[0] - c.tl[0] + c.br[0] - c.bl[0]) / 2;
    const h = (c.bl[1] - c.tl[1] + c.br[1] - c.tr[1]) / 2;
    // the long edges pinch while the shape is longer than its target (area kept, roughly)
    const pinchY = Math.min(h * mech.waist * 0.5, 4, h * Math.max(0, w / target.w - 1) * mech.waist);
    const pinchX = Math.min(w * mech.waist * 0.5, 4, w * Math.max(0, h / target.h - 1) * mech.waist);
    const edges: Record<Edge, Point> = {
      t: [mid.t[0], mid.t[1] + pinchY],
      b: [mid.b[0], mid.b[1] - pinchY],
      l: [mid.l[0] + pinchX, mid.l[1]],
      r: [mid.r[0] - pinchX, mid.r[1]],
    };
    // still a rectangle (a rigid look, or a straight move): move the box itself and keep every bit of the look's paint
    const flat = (a: number, b: number) => Math.abs(a - b) < 0.35;
    const corners = midsOf(c);
    if (
      flat(c.tl[1], c.tr[1]) &&
      flat(c.bl[1], c.br[1]) &&
      flat(c.tl[0], c.bl[0]) &&
      flat(c.tr[0], c.br[0]) &&
      EDGES.every((k) => flat(edges[k][0], corners[k][0]) && flat(edges[k][1], corners[k][1]))
    ) {
      el.style.transform = `translate(${c.tl[0]}px, ${c.tl[1]}px)`;
      el.style.width = `${c.tr[0] - c.tl[0]}px`;
      el.style.height = `${c.bl[1] - c.tl[1]}px`;
      el.style.clipPath = "";
      rim(null);
      return;
    }
    const all = [...CORNERS.map((k) => c[k]), ...EDGES.map((k) => edges[k])];
    const minX = Math.floor(Math.min(...all.map((p) => p[0]))) - 1;
    const minY = Math.floor(Math.min(...all.map((p) => p[1]))) - 1;
    const maxX = Math.ceil(Math.max(...all.map((p) => p[0]))) + 1;
    const maxY = Math.ceil(Math.max(...all.map((p) => p[1]))) + 1;
    const local = (p: Point): Point => [p[0] - minX, p[1] - minY];
    const C = CORNERS.map((k) => local(c[k]));
    const E = (["t", "r", "b", "l"] as Edge[]).map((k) => local(edges[k]));
    const len = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const toward = (a: Point, b: Point, d: number): Point => {
      const l = len(a, b);
      return [a[0] + ((b[0] - a[0]) / l) * d, a[1] + ((b[1] - a[1]) / l) * d];
    };
    // each corner backs off its radius along both of its real edges and turns through the corner itself, so a sheared
    // shape never folds over; each edge bows through its midpoint
    // a moving drop is round: corners grow toward a capsule while the shape is stretched or far from home
    const away = Math.max(w / target.w - 1, h / target.h - 1, 0);
    const round = mech.front > 0 ? Math.min(1, away * 2.5) : 0;
    const r = radius + (Math.min(w, h) / 2 - radius) * Math.max(0, round);
    const rr = C.map((p, i) => Math.min(r, len(p, C[(i + 1) % 4]) / 2.2, len(p, C[(i + 3) % 4]) / 2.2));
    const into = C.map((p, i) => toward(p, C[(i + 3) % 4], rr[i]));
    const out = C.map((p, i) => toward(p, C[(i + 1) % 4], rr[i]));
    const through = (a: Point, m: Point, b: Point): Point => [
      2 * m[0] - (a[0] + b[0]) / 2,
      2 * m[1] - (a[1] + b[1]) / 2,
    ];
    const f = (p: Point) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    let d = `M${f(out[0])}`;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      // an edge the rounded corners have nearly used up can only bow a little, or its middle would point
      const a = out[i];
      const b = into[j];
      const chord: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const bow: Point = [E[i][0] - chord[0], E[i][1] - chord[1]];
      const most = len(a, b) * 0.18;
      const bowLen = Math.hypot(bow[0], bow[1]);
      const m: Point =
        bowLen > most ? [chord[0] + (bow[0] / bowLen) * most, chord[1] + (bow[1] / bowLen) * most] : E[i];
      d += ` Q${f(through(a, m, b))} ${f(b)} Q${f(C[j])} ${f(out[j])}`;
    }
    el.style.transform = `translate(${minX}px, ${minY}px)`;
    el.style.width = `${maxX - minX}px`;
    el.style.height = `${maxY - minY}px`;
    el.style.clipPath = `path("${d}Z")`;
    rim(`${d}Z`, maxX - minX, maxY - minY);
  };

  const advance = (dt: number) => {
    if (!pos || !target || !el.isConnected) return (running = false);
    const goal = cornersOf(target);
    let busy = false;
    for (const k of CORNERS) {
      const p = pos[k];
      const v = vel[k];
      const g = goal[k];
      const dx = g[0] - p[0];
      const dy = g[1] - p[1];
      const dist = Math.hypot(dx, dy);
      // -1 … 1: how squarely this corner faces the way it is going
      const along = dist > 0.5 ? (OUT[k][0] * dx + OUT[k][1] * dy) / (dist * Math.SQRT2) : 0;
      const t = response * (1 + mech.spread * 0.4 - mech.spread * along);
      for (const a of [0, 1] as const) {
        [p[a], v[a]] = step(p[a], v[a], g[a], t, dt);
        if (Math.abs(p[a] - g[a]) > 0.2 || Math.abs(v[a]) > 4) busy = true;
      }
    }
    const now = midsOf(pos);
    const aim = midsOf(goal);
    for (const k of EDGES) {
      for (const a of [0, 1] as const)
        [mid[k][a], midVel[k][a]] = step(mid[k][a], midVel[k][a], aim[k][a], response * 0.75, dt);
      // the lead is a few pixels at most, and never more than a fraction of the edge or of the shape's depth
      const across = k === "t" || k === "b" ? target.h : target.w;
      const edge =
        k === "t" ? [pos.tl, pos.tr] : k === "b" ? [pos.br, pos.bl] : k === "l" ? [pos.bl, pos.tl] : [pos.tr, pos.br];
      const limit = Math.min(
        mech.front,
        across * 0.3,
        Math.hypot(edge[1][0] - edge[0][0], edge[1][1] - edge[0][1]) * 0.15,
      );
      // edges only ever bulge outward: the front rounds out, the tail stays smooth instead of curling in
      let ox = mid[k][0] - now[k][0];
      let oy = mid[k][1] - now[k][1];
      const [nx, ny] = NORMAL[k];
      const inward = ox * nx + oy * ny;
      if (inward < 0) {
        ox -= inward * nx;
        oy -= inward * ny;
        mid[k][0] = now[k][0] + ox;
        mid[k][1] = now[k][1] + oy;
      }
      const off = Math.hypot(ox, oy);
      if (off > limit) {
        mid[k][0] = now[k][0] + (ox / off) * limit;
        mid[k][1] = now[k][1] + (oy / off) * limit;
      }
      if (Math.abs(mid[k][0] - aim[k][0]) > 0.2 || Math.abs(mid[k][1] - aim[k][1]) > 0.2) busy = true;
    }
    if (!busy) {
      pos = goal;
      vel = zero(CORNERS);
      mid = midsOf(goal);
      midVel = zero(EDGES);
      rest();
      return (running = false);
    }
    draw();
    return true;
  };

  const contour: Contour = {
    to(box, options) {
      const same = target && target.x === box.x && target.y === box.y && target.w === box.w && target.h === box.h;
      if (same && !options?.instant) return;
      target = { ...box };
      const style = getComputedStyle(el);
      const r = style.borderTopLeftRadius;
      radius = r.endsWith("%") ? (Number.parseFloat(r) / 100) * Math.min(box.w, box.h) : Number.parseFloat(r) || 0;
      mech = {
        spread: num(style, "--m-morph-spread", 0.35),
        front: num(style, "--m-morph-front", 6),
        waist: num(style, "--m-morph-waist", 0.18),
        weight: num(style, "--m-morph-weight", 1),
        rim: style.getPropertyValue("--m-morph-rim").trim() || "none",
        rimWidth: num(style, "--m-morph-rim-width", 1),
      };
      const factor = readMotionFactor(el);
      response = BASE_RESPONSE * mech.weight * factor;
      // first placement, reduced motion, or a hidden surface: be there, with nothing to watch
      if (!pos || options?.instant || factor < 0.05 || !el.getClientRects().length) {
        pos = cornersOf(target);
        vel = zero(CORNERS);
        mid = midsOf(pos);
        midVel = zero(EDGES);
        moving.delete(advance);
        running = false;
        rest();
        return;
      }
      el.dataset.morphing = "";
      if (!running) {
        running = true;
        run(advance);
      }
    },
    destroy() {
      moving.delete(advance);
      running = false;
      if (target) rest();
    },
  };
  contours.set(el, contour);
  return contour;
}
