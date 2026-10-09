/**
 * Copies text to the clipboard and says whether it worked. Uses the async Clipboard API where the page is allowed to
 * (a secure context with focus), and falls back to a hidden textarea and execCommand elsewhere (http previews,
 * embedded frames).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(area);
    const previous = document.activeElement as HTMLElement | null;
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    previous?.focus({ preventScroll: true });
    return ok;
  } catch {
    return false;
  }
}
