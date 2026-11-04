import { CACHE_TTL_PLACES_MS, MAX_RADIUS_METERS } from './constants.js';
import { createTtlCache } from './cache.js';
import { boundingBoxFromRadius } from './geo.js';
import { fetchJson } from './httpFetch.js';
import { createLimiter } from './rateLimit.js';
import { CATEGORY_IDS } from './classify.js';
import { dedupePlaces, groupPlacesByCategory, normalizeNominatimResult } from './normalize.js';

const QUERIES = [
  { amenity: 'hospital' },
  { amenity: 'clinic' },
  { amenity: 'pharmacy' },
  { amenity: 'dentist' },
  { q: 'optician' },
  { q: 'fitness' },
  { q: 'park' },
  { q: 'community centre' },
  { q: 'Whole Foods' },
];

const cache = createTtlCache({ ttlMs: CACHE_TTL_PLACES_MS, maxSize: 80 });
const limiter = createLimiter({ minIntervalMs: 500, maxConcurrent: 2 });

async function nominatimSearch(params, signal) {
  const release = await limiter.acquire();
  try {
    return await fetchJson(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal,
      retries: 0,
      timeoutMs: 2500,
    });
  } finally {
    release();
  }
}

function buildParams(query, box) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    bounded: '1',
    viewbox: `${box.west},${box.south},${box.east},${box.north}`,
    limit: '50',
    extratags: '1',
    addressdetails: '0',
    dedupe: '0',
  });
  if (query.amenity) params.set('amenity', query.amenity);
  if (query.q) params.set('q', query.q);
  return params;
}

export async function searchNominatimNearby({ lat, lng, radius }, signal) {
  const origin = { lat: Number(lat), lng: Number(lng) };
  const maxDistance = Number(radius) || MAX_RADIUS_METERS;
  const box = boundingBoxFromRadius(origin.lat, origin.lng, maxDistance);
  const key = `nom:${origin.lat.toFixed(3)}:${origin.lng.toFixed(3)}:${maxDistance}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const batches = [];
  for (const query of QUERIES) {
    if (signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
    try {
      const data = await nominatimSearch(buildParams(query, box), signal);
      batches.push((Array.isArray(data) ? data : [])
        .map((item) => normalizeNominatimResult(item, origin))
        .filter(Boolean)
        .filter((place) => (place.distanceMeters ?? Infinity) <= maxDistance));
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      batches.push([]);
    }
  }

  const places = dedupePlaces(batches.flat())
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  const payload = {
    places,
    grouped: groupPlacesByCategory(places, CATEGORY_IDS),
    center: origin,
    radius: maxDistance,
    source: 'nominatim',
  };
  if (places.length) cache.set(key, payload);
  return payload;
}
