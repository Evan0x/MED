import { FETCH_TIMEOUT_MS, osmUserAgent } from './constants.js';
import { withBackoff } from './rateLimit.js';

export function abortAfter(ms, parentSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onParentAbort);
    },
  };
}

export async function fetchWithPolicy(url, {
  method = 'GET',
  headers = {},
  body,
  timeoutMs = FETCH_TIMEOUT_MS,
  retries = 2,
  signal,
} = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      signal.addEventListener('abort', onAbort, { once: true });
    }
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'User-Agent': osmUserAgent(),
          ...headers,
        },
        body,
        signal: controller.signal,
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Upstream error (${res.status})`);
        lastError.status = res.status;
        if (attempt < retries) {
          await withBackoff(attempt);
          continue;
        }
        throw lastError;
      }
      if (!res.ok) {
        const err = new Error(`Upstream error (${res.status})`);
        err.status = res.status;
        throw err;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      const timedOutAttempt = timedOut || err?.name === 'TimeoutError';
      if (timedOutAttempt) {
        lastError = Object.assign(new Error('Upstream timeout'), { name: 'TimeoutError' });
        if (attempt < retries) {
          await withBackoff(attempt);
          continue;
        }
        throw lastError;
      }
      if (err?.name === 'AbortError') throw err;
      const retryable = err?.status == null || err.status === 429 || err.status >= 500;
      if (retryable && attempt < retries) {
        await withBackoff(attempt);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw lastError;
}

export async function fetchJson(url, options) {
  const res = await fetchWithPolicy(url, options);
  return res.json();
}
