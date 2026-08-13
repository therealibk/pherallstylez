/**
 * In-memory sliding-window rate limiter for login attempt protection.
 *
 * LIMITATION: This limiter is per-process. On serverless platforms with multiple
 * concurrent instances (e.g. Vercel), each instance has its own store and limits
 * are not shared across instances. For multi-instance production deployments,
 * replace this with an external store such as Upstash Redis.
 *
 * For a single-instance deployment (VPS, Railway, Render) this works correctly.
 */

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

const store = new Map<string, RateLimitEntry>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();

  // Probabilistic cleanup — avoids unbounded memory growth without a timer
  if (store.size > 500 || Math.random() < 0.05) {
    purgeExpired();
  }

  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { attempts: 1, windowStart: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetMs: WINDOW_MS };
  }

  entry.attempts += 1;
  const resetMs = WINDOW_MS - (now - entry.windowStart);

  if (entry.attempts > MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetMs };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.attempts, resetMs };
}

/** Exposed for test teardown only — do not call in application code. */
export function _resetForTests(): void {
  store.clear();
}
