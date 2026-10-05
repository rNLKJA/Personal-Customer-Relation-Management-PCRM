/** Tiny in-memory fixed-window rate limiter (per server instance). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return function allow(key: string, now = Date.now()): boolean {
    const entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      if (hits.size > 5000) hits.clear();
      hits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }
    entry.count++;
    return entry.count <= limit;
  };
}
