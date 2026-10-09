/** One way to rank and mark matches for every search-as-you-type list (command menu, combobox, multi-select). */

/** How well `label` (and its keywords) answers `query`: label start 100, word start 80, anywhere 60, keyword 45,
 *  every word of a several-word query found across label, keywords and description 40 (50 when one starts the label:
 *  "billing city" finds Billing address › City), description 30, letters in order 15, no match 0. An empty query
 *  matches everything with 1. */
export function rank(query: string, label: string, keywords?: string[], description?: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const l = label.toLowerCase();
  const at = l.indexOf(q);
  if (at === 0) return 100 - l.length / 100;
  if (at > 0 && /[\s\-/(_.]/.test(l[at - 1])) return 80;
  if (at > 0) return 60;
  if (keywords?.some((k) => k.toLowerCase().includes(q))) return 45;
  const words = q.split(/\s+/);
  if (words.length > 1) {
    const hay = [l, ...(keywords ?? []).map((k) => k.toLowerCase()), description?.toLowerCase() ?? ""];
    if (words.every((w) => hay.some((h) => h.includes(w)))) return words.some((w) => l.startsWith(w)) ? 50 : 40;
  }
  if (description?.toLowerCase().includes(q)) return 30;
  let i = 0;
  for (const ch of l) if (ch === q[i]) i++;
  return i === q.length ? 15 : 0;
}

/** Sorts by rank (best first, original order for ties) and drops non-matches. */
export function filterRanked<T>(
  items: T[],
  query: string,
  get: (item: T) => { label: string; keywords?: string[]; description?: string },
): T[] {
  if (!query.trim()) return items;
  return items
    .map((item, order) => {
      const g = get(item);
      return { item, order, s: rank(query, g.label, g.keywords, g.description) };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.order - b.order)
    .map((r) => r.item);
}

/** The label with the matched run emphasised. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const at = q ? text.toLowerCase().indexOf(q) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-medium text-ink">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}
