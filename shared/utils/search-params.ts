/**
 * Every filter lives in the URL, so each one has to hand the others through:
 * building the href from the current query string — instead of from scratch —
 * is what keeps toggling one filter from silently dropping the others.
 * A `null` update removes the key.
 */
export const buildFilterHref = (
  current: URLSearchParams,
  updates: Record<string, string | null>,
): string => {
  // Copied, never mutated: `useSearchParams` hands back a read-only instance
  // whose `set`/`delete` throw.
  const params = new URLSearchParams(current);

  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query ? `/?${query}` : "/";
};
