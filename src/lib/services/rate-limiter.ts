/**
 * In-Memory Sliding Window Rate Limiter.
 * Provides resilient IP throttling for anonymous / guest endpoints.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const cache = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 10 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function purgeStale(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const threshold = now - windowMs;
  for (const [key, record] of cache.entries()) {
    record.timestamps = record.timestamps.filter((ts) => ts > threshold);
    if (record.timestamps.length === 0) {
      cache.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  limit: number;
}

/**
 * Checks and records an action for the given key (e.g. IP).
 *
 * @param key Identifier (typically client IP address)
 * @param limit Maximum allowed events within the window (default: 10)
 * @param windowMs Time window in milliseconds (default: 1 hour = 3,600,000 ms)
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  purgeStale(windowMs);

  let record = cache.get(key);
  if (!record) {
    record = { timestamps: [] };
    cache.set(key, record);
  }

  // Remove timestamps outside the sliding window
  const windowStart = now - windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
      limit,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  const resetInSeconds = Math.ceil(windowMs / 1000);

  return {
    allowed: true,
    remaining,
    resetInSeconds,
    limit,
  };
}

/**
 * Test helper to reset the rate limiter map.
 */
export function resetRateLimiter() {
  cache.clear();
}
