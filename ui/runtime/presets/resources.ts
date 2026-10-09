/** Shared document resources are reference-counted; importing this module creates no DOM. */
const resources = new WeakMap<Document, Map<string, { element: SVGSVGElement; users: number }>>();
export function acquireSvgDefinitions(name: string, definitions: string, target?: Document): () => void {
  const doc = target ?? (typeof document === "undefined" ? undefined : document);
  if (!doc) return () => {};
  let entries = resources.get(doc);
  if (!entries) resources.set(doc, (entries = new Map()));
  let entry = entries.get(name);
  if (!entry) {
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.dataset.puiResource = name;
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    svg.innerHTML = `<defs>${definitions}</defs>`;
    (doc.body ?? doc.documentElement).appendChild(svg);
    entry = { element: svg, users: 0 };
    entries.set(name, entry);
  }
  entry.users += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--entry.users === 0) {
      entry.element.remove();
      entries.delete(name);
    }
  };
}
