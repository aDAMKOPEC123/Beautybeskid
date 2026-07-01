function isVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0
    && rect.height > 0
    && style.display !== 'none'
    && style.visibility !== 'hidden';
}

export function findVisibleElement(selector: string): Element | null {
  return Array.from(document.querySelectorAll(selector)).find(isVisible) ?? null;
}

/**
 * Waits until a tour anchor is both mounted and visible. Lazy route chunks and
 * API-backed screens can legitimately need more than a few seconds to render.
 */
export function waitForElement(selector: string, timeout = 10_000): Promise<Element | null> {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const poll = () => {
      const element = findVisibleElement(selector);
      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startedAt >= timeout) {
        console.warn(`[Tour] Element "${selector}" nie pojawił się w ciągu ${timeout} ms.`);
        resolve(null);
        return;
      }

      window.setTimeout(poll, 100);
    };

    poll();
  });
}
