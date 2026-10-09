/**
 * Keeping a keyboard user's place when something disappears. Removing the element that has focus (a dismissed alert,
 * a removed chip or file, a deleted row) drops focus on <body>, and the next Tab starts at the top of the page.
 */

const TABBABLE = "a[href], button, input:not([type=hidden]), select, textarea, [tabindex], [contenteditable=true]";

function tabbables(scope: Element) {
  // a modal layer (menu, dialog) marks the rest of the page aria-hidden while it is open (data-aria-hidden): that
  // content is still where focus should land once the layer closes
  return [...scope.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (e) =>
      e.tabIndex >= 0 &&
      !e.matches(":disabled") &&
      !e.closest("[inert], [aria-hidden=true]:not([data-aria-hidden])") &&
      e.getClientRects().length > 0,
  );
}

/** The control after `item` in reading order (outside it), or the one before it. */
function neighbour(item: Element, scope: Element) {
  const all = tabbables(scope).filter((e) => !item.contains(e));
  return (
    all.find((e) => item.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) ??
    all.reverse().find((e) => item.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_PRECEDING) ??
    null
  );
}

/**
 * Call just before `item` is removed or hidden: if focus is inside it, focus moves to the next control after it (or
 * the one before). `scope` keeps the search inside a widget (a toolbar, a field); `fallback` is used when the scope has
 * nothing else to focus. Does nothing when focus is elsewhere, so a removal the user did not start never steals focus.
 */
export function focusAfterRemoval(
  item: Element | null | undefined,
  { scope, fallback }: { scope?: Element | null; fallback?: HTMLElement | null } = {},
) {
  if (!item || !item.contains(document.activeElement)) return;
  (neighbour(item, scope ?? document.body) ?? fallback)?.focus();
}

/**
 * For an action that may or may not remove its item (the app decides, as with a row's Delete): call before running it.
 * If the item is gone afterwards and focus fell to the page, focus moves to the control that followed it.
 */
export function keepPlaceIfRemoved(item: Element | null | undefined, { scope }: { scope?: Element | null } = {}) {
  if (!item) return;
  const target = neighbour(item, scope ?? document.body);
  const check = () => {
    if (
      !item.isConnected &&
      (!document.activeElement || document.activeElement === document.body) &&
      target?.isConnected
    )
      target.focus();
  };
  setTimeout(check, 0);
  setTimeout(check, 400); // after an exit animation
}
