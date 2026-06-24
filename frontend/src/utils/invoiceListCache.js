const CACHE_PREFIX = "invoice_list_cache_v1:";
const CACHE_TTL_MS = 2 * 60 * 1000;
export const INVOICE_LIST_CACHE_EVENT = "invoice-list-cache-changed";

function cacheKey(userId) {
  return `${CACHE_PREFIX}${userId || "anonymous"}`;
}

export function readInvoiceListCache(userId) {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.invoices)) return null;

    const updatedAt = Number(parsed.updatedAt || 0);
    return {
      invoices: parsed.invoices,
      updatedAt,
      isFresh: Date.now() - updatedAt < CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

export function writeInvoiceListCache(userId, invoices) {
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({
        invoices: Array.isArray(invoices) ? invoices : [],
        updatedAt: Date.now(),
      })
    );
    window.dispatchEvent(new Event(INVOICE_LIST_CACHE_EVENT));
  } catch {
    // Ignore cache write failures; the API remains the source of truth.
  }
}

export function clearInvoiceListCache(userId) {
  try {
    if (userId) {
      localStorage.removeItem(cacheKey(userId));
    } else {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    }
    window.dispatchEvent(new Event(INVOICE_LIST_CACHE_EVENT));
  } catch {
    // Ignore cache clear failures.
  }
}
