import { CACHE_TTL_PLACES_MS, OVERPASS_CLIENT_TIMEOUT_MS, OVERPASS_TIMEOUT_SECONDS, overpassUrls } from './constants.js';
import { createTtlCache, placesCacheKey } from './cache.js';
import { bboxDiagonalMeters } from './geo.js';
import { fetchWithPolicy } from './httpFetch.js';
import { createLimiter } from './rateLimit.js';
import { CATEGORY_IDS } from './classify.js';
import { dedupePlaces, groupPlacesByCategory, normalizeOsmElement } from './normalize.js';

const cache = createTtlCache({ ttlMs: CACHE_TTL_PLACES_MS, maxSize: 80 });
const limiter = createLimiter({ minIntervalMs: 400, maxConcurrent: 3 });
const inflight = new Map();
const deadUntil = new Map();
const DEAD_MS = 10 * 60 * 1000;
const TIMEOUT_DEAD_MS = 3 * 60 * 1000;

const SELECTORS = [
  '["amenity"~"^(hospital|clinic|doctors|pharmacy|dentist|community_centre|social_centre)$"]',
  '["healthcare"~"^(hospital|clinic|doctor|dentist|pharmacy|psychotherapist|counsellor|psychologist|optometrist|urgent_care|centre|center)$"]',
  '["emergency"~"^(yes|urgent_care|emergency_ward_entrance)$"]',
  '["shop"~"^(optician|health_food|herbalist|nutrition_supplements|chemist)$"]',
  '["leisure"~"^(fitness_centre|fitness_station|sports_centre|park|garden)$"]',
];

function isDead(url) {
  return (deadUntil.get(url) || 0) > Date.now();
}

function markDead(url, ms = DEAD_MS) {
  deadUntil.set(url, Date.now() + ms);
}

export function buildOverpassQuery({ lat, lng, radius, bounds }) {
  const filter = bounds
    ? `(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`
    : `(around:${radius},${lat},${lng})`;
  const body = SELECTORS.map((sel) => `nwr${sel}${filter}`).join(';');
  return `[out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}];(${body};);out center tags;`;
}

export function normalizeOverpassResponse(data, origin) {
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  const places = dedupePlaces(
    elements.map((el) => normalizeOsmElement(el, origin)).filter(Boolean),
  ).sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  return {
    places,
    grouped: groupPlacesByCategory(places, CATEGORY_IDS),
  };
}

async function queryOneEndpoint(url, query, signal) {
  const res = await fetchWithPolicy(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ data: query }).toString(),
    signal,
    retries: 0,
    timeoutMs: OVERPASS_CLIENT_TIMEOUT_MS,
  });
  return res.json();
}

function firstSuccess(promises) {
  return new Promise((resolve, reject) => {
    let remaining = promises.length;
    let lastError;
    if (remaining === 0) {
      reject(new Error('Overpass unavailable'));
      return;
    }
    promises.forEach((promise) => {
      promise.then(resolve, (err) => {
        lastError = err;
        remaining -= 1;
        if (remaining === 0) reject(lastError || new Error('Overpass unavailable'));
      });
    });
  });
}

export async function searchOverpass(params, signal) {
  const query = buildOverpassQuery(params);
  const key = `overpass:${placesCacheKey(params)}`;
  const cached = cache.get(key);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const urls = overpassUrls().filter((url) => !isDead(url));
  if (urls.length === 0) return null;

  const run = (async () => {
    const origin = { lat: params.lat, lng: params.lng };
    try {
      const payload = await firstSuccess(urls.map(async (url) => {
        const release = await limiter.acquire();
        try {
          const data = await queryOneEndpoint(url, query, signal);
          const normalized = normalizeOverpassResponse(data, origin);
          return {
            ...normalized,
            center: origin,
            radius: params.radius ?? Math.round(bboxDiagonalMeters(params.bounds) / 2),
            source: 'overpass',
          };
        } catch (err) {
          if (err?.name === 'AbortError' && signal?.aborted) throw err;
          if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
            markDead(url, TIMEOUT_DEAD_MS);
          } else if (err?.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
            markDead(url);
          }
          throw err;
        } finally {
          release();
        }
      }));
      if (payload?.places?.length) cache.set(key, payload);
      return payload;
    } catch (err) {
      if (err?.name === 'AbortError' && signal?.aborted) throw err;
      return null;
    }
  })();

  inflight.set(key, run);
  try {
    return await run;
  } finally {
    inflight.delete(key);
  }
}

export function _clearOverpassCache() {
  cache.clear();
  inflight.clear();
  deadUntil.clear();
}
