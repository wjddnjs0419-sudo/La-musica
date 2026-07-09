// Shared fetch wrapper for the free-tier Gemini REST calls scattered across
// `translatePrompt.ts` / `refineStylePrompt.ts` / `musicTitle.ts` /
// `lyrics-assistant/prompt.ts`. All four share one GEMINI_API_KEY, so the
// free tier's 15 RPM project-wide limit gets contended under concurrent
// users. Bounds each attempt with a timeout and retries 429/503 with
// backoff (honoring Retry-After) before giving up, instead of failing on
// the first transient rate-limit hit.

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;
const RETRYABLE_STATUS = new Set([429, 503]);

export interface FetchGeminiRetryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

// Fetch `url` with a per-attempt timeout, retrying 429/503 responses (and
// network/timeout failures) up to `maxRetries` times with backoff. Mirrors
// plain `fetch` semantics otherwise: resolves with the Response (possibly
// non-ok) once retries are exhausted, or rejects if every attempt throws.
export async function fetchGeminiWithRetry(
  url: string,
  init: RequestInit,
  opts: FetchGeminiRetryOptions = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const isLastAttempt = attempt === maxRetries;
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || isLastAttempt) {
        return res;
      }
      const delay = parseRetryAfterMs(res.headers.get("retry-after")) ?? BASE_BACKOFF_MS * 2 ** attempt;
      await sleep(delay);
    } catch (err) {
      if (isLastAttempt) throw err;
      await sleep(BASE_BACKOFF_MS * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
}
