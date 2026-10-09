// A custom property's computed value already has its var() references substituted ("max(1ms, calc(360ms * 1 * 1))"),
// so it is evaluated here as CSS math, without the DOM. Probing through transition-duration was unreliable: pages
// suppress transitions with `!important` during load or a theme switch, and a reduced-motion region does the same,
// so a probe could read 0s and a cache would then spread that 0. Values this reader can't parse are probed in the host,
// uncached, exactly as before.
const timeCache = new Map<string, number>();
const rawValue = (host: Element, token: string) =>
  host.ownerDocument.defaultView?.getComputedStyle(host).getPropertyValue(token).trim() ?? "";

/** CSS math over times: numbers with s/ms, + − × ÷, calc(), min(), max(), clamp(). Seconds, or null if unreadable. */
export function evaluateCssTime(text: string): number | null {
  const tokens = text.match(/-?\d*\.?\d+(?:e-?\d+)?(?:ms|s)?|[a-z-]+\(|[()*/+,-]/gi);
  if (!tokens || tokens.join("").replace(/\s/g, "") !== text.replace(/\s/g, "")) return null;
  let at = 0;
  type V = { n: number; time: boolean };
  const fail = (): never => {
    throw new Error("unreadable");
  };
  const atom = (): V => {
    const t = tokens[at++] ?? fail();
    if (/^(calc)\($/i.test(t)) {
      const v = sum();
      if (tokens[at++] !== ")") fail();
      return v;
    }
    if (/^(min|max|clamp)\($/i.test(t)) {
      const args = [sum()];
      while (tokens[at] === ",") {
        at++;
        args.push(sum());
      }
      if (tokens[at++] !== ")") fail();
      const ns = args.map((a) => a.n);
      const fn = t.slice(0, -1).toLowerCase();
      const n =
        fn === "min" ? Math.min(...ns) : fn === "max" ? Math.max(...ns) : Math.min(Math.max(ns[1], ns[0]), ns[2]);
      return { n, time: args.some((a) => a.time) };
    }
    if (t === "(") {
      const v = sum();
      if (tokens[at++] !== ")") fail();
      return v;
    }
    const m = t.match(/^(-?\d*\.?\d+(?:e-?\d+)?)(ms|s)?$/i) ?? fail();
    const n = Number(m[1]);
    return m[2] ? { n: m[2].toLowerCase() === "ms" ? n / 1000 : n, time: true } : { n, time: false };
  };
  const product = (): V => {
    let v = atom();
    while (tokens[at] === "*" || tokens[at] === "/") {
      const op = tokens[at++];
      const r = atom();
      v = op === "*" ? { n: v.n * r.n, time: v.time || r.time } : { n: v.n / r.n, time: v.time && !r.time };
    }
    return v;
  };
  const sum = (): V => {
    let v = product();
    while (tokens[at] === "+" || tokens[at] === "-") {
      const op = tokens[at++];
      const r = product();
      v = { n: op === "+" ? v.n + r.n : v.n - r.n, time: v.time || r.time };
    }
    return v;
  };
  try {
    const v = sum();
    return at === tokens.length && v.time && Number.isFinite(v.n) ? Math.max(0, v.n) : null;
  } catch {
    return null;
  }
}

/** Resolve a CSS time expression at an explicit host. No browser access occurs until called. Returns seconds. */
export function resolveCssTime(host: Element, token: string, fallback = 0): number {
  const raw = rawValue(host, token);
  if (!raw) return fallback;
  const known = timeCache.get(raw);
  if (known !== undefined) return known;
  const value = evaluateCssTime(raw);
  if (value === null) return probeTime(host, token, fallback);
  timeCache.set(raw, value);
  return value;
}
function probeTime(host: Element, token: string, fallback: number): number {
  const probe = host.ownerDocument.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;transition-property:opacity";
  probe.style.transitionDuration = `var(${token}, ${fallback}s)`;
  host.appendChild(probe);
  try {
    const raw = host.ownerDocument.defaultView?.getComputedStyle(probe).transitionDuration ?? "";
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value / (raw.endsWith("ms") ? 1000 : 1) : fallback;
  } finally {
    probe.remove();
  }
}

/** A CSS easing expression resolved in the same host, suitable for Web Animations. */
export function resolveCssEasing(host: Element, token: string, fallback = "ease"): string {
  const raw = rawValue(host, token);
  if (!raw) return fallback;
  // a substituted timing function is already what Web Animations takes; anything else is resolved in the host
  if (/^(ease(-in|-out|-in-out)?|linear|step-start|step-end)$|^(cubic-bezier|linear|steps)\([^()]*\)$/i.test(raw))
    return raw;
  return probeEasing(host, token, fallback);
}
function probeEasing(host: Element, token: string, fallback: string): string {
  const probe = host.ownerDocument.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;transition-property:opacity";
  probe.style.transitionTimingFunction = `var(${token}, ${fallback})`;
  host.appendChild(probe);
  try {
    return host.ownerDocument.defaultView?.getComputedStyle(probe).transitionTimingFunction || fallback;
  } finally {
    probe.remove();
  }
}
