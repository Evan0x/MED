import { CATEGORY_IDS } from './classify.js';
import { createTtlCache, placesCacheKey } from './cache.js';
import { CACHE_TTL_PLACES_MS } from './constants.js';
import { dedupePlaces, groupPlacesByCategory } from './normalize.js';
import { searchNominatimNearby } from './nominatim.js';
import { searchOverpass } from './overpass.js';
import { searchPhotonNearby } from './photon.js';

const cache = createTtlCache({ ttlMs: CACHE_TTL_PLACES_MS, maxSize: 80 });
const inflight = new Map();

export function mergePlaceResults(...results) {
  const live = results.filter((result) => result && Array.isArray(result.places) && result.places.length);
  const places = dedupePlaces(live.flatMap((result) => result.places))
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  const sources = [...new Set(live.map((result) => result.source).filter(Boolean))];
  return {
    places,
    grouped: groupPlacesByCategory(places, CATEGORY_IDS),
    center: live.find((result) => result.center)?.center ?? null,
    radius: Math.max(0, ...live.map((result) => Number(result.radius) || 0)),
    source: sources.join('+') || 'merged',
  };
}

function ignoreUnavailable(err, signal) {
  if (err?.name === 'AbortError' && signal?.aborted) throw err;
  return null;
}

export async function searchNearbyPlaces(params, signal) {
  const key = placesCacheKey(params);
  const cached = cache.get(key);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const run = (async () => {
    const [nominatim, photon, overpass] = await Promise.all([
      searchNominatimNearby(params, signal).catch((err) => ignoreUnavailable(err, signal)),
      searchPhotonNearby(params, signal).catch((err) => ignoreUnavailable(err, signal)),
      searchOverpass(params, signal).catch((err) => ignoreUnavailable(err, signal)),
    ]);
    const merged = mergePlaceResults(nominatim, photon, overpass);
    if (!merged.places.length) {
      throw new Error('Nearby search is temporarily unavailable.');
    }
    cache.set(key, merged);
    return merged;
  })();

  inflight.set(key, run);
  try {
    return await run;
  } finally {
    inflight.delete(key);
  }
}

export function _clearNearbyCache() {
  cache.clear();
  inflight.clear();
}
