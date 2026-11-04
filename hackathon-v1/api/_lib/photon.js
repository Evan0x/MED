import {
  CACHE_TTL_AUTOCOMPLETE_MS,
  CACHE_TTL_GEOCODE_MS,
  MAX_RADIUS_METERS,
  PHOTON_NEARBY_TIMEOUT_MS,
  photonUrl,
} from './constants.js';
import { createTtlCache } from './cache.js';
import { abortAfter, fetchJson } from './httpFetch.js';
import { createLimiter } from './rateLimit.js';
import { dedupePlaces, groupPlacesByCategory, normalizePhotonFeature, normalizePhotonPoi } from './normalize.js';
import { CATEGORY_IDS } from './classify.js';

const POI_QUERIES = [
  { q: 'hospital', osm_tag: 'amenity:hospital' },
  { q: 'clinic', osm_tag: 'amenity:clinic' },
  { q: 'pharmacy', osm_tag: 'amenity:pharmacy' },
  { q: 'doctor', osm_tag: 'amenity:doctors' },
  { q: 'dentist', osm_tag: 'amenity:dentist' },
  { q: 'urgent', osm_tag: 'healthcare:urgent_care' },
  { q: 'optician', osm_tag: 'shop:optician' },
  { q: 'gym', osm_tag: 'leisure:fitness_centre' },
  { q: 'park', osm_tag: 'leisure:park' },
  { q: 'community', osm_tag: 'amenity:community_centre' },
  { q: 'therapy', osm_tag: 'healthcare:psychotherapist' },
  { q: 'organic', osm_tag: 'shop:health_food' },
];

const geocodeCache = createTtlCache({ ttlMs: CACHE_TTL_GEOCODE_MS, maxSize: 200 });
const autocompleteCache = createTtlCache({ ttlMs: CACHE_TTL_AUTOCOMPLETE_MS, maxSize: 200 });
const limiter = createLimiter({ minIntervalMs: 80, maxConcurrent: 2 });
const poiLimiter = createLimiter({ minIntervalMs: 40, maxConcurrent: 6 });
const DEAD_MS = 10 * 60 * 1000;
let deadUntil = 0;

function markDead() {
  deadUntil = Date.now() + DEAD_MS;
}

async function photonGet(path, signal, burstLimiter = limiter, timeoutMs = 2500) {
  if (Date.now() < deadUntil) {
    throw Object.assign(new Error('Photon unavailable'), { name: 'PhotonUnavailable' });
  }
  const release = await burstLimiter.acquire();
  try {
    return await fetchJson(`${photonUrl()}${path}`, { signal, retries: 0, timeoutMs });
  } catch (err) {
    if (err?.name === 'AbortError' && signal?.aborted) throw err;
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || err?.name === 'PhotonUnavailable') {
      markDead();
    }
    throw err;
  } finally {
    release();
  }
}

export function normalizePhotonResponse(data) {
  const features = Array.isArray(data?.features) ? data.features : [];
  return features.map(normalizePhotonFeature).filter(Boolean);
}

export async function searchPhoton(query, { limit = 5, lat, lng, signal } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ q, limit: String(Math.min(10, Math.max(1, limit))) });
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    params.set('lat', String(lat));
    params.set('lon', String(lng));
  }
  const key = `q:${params.toString()}`;
  const cached = autocompleteCache.get(key);
  if (cached) return cached;

  const data = await photonGet(`/api?${params.toString()}`, signal);
  const results = normalizePhotonResponse(data);
  autocompleteCache.set(key, results);
  return results;
}

export async function geocodePhoton(query, { signal } = {}) {
  const q = String(query || '').trim();
  if (!q) return null;
  const key = `geo:${q.toLowerCase()}`;
  const cached = geocodeCache.get(key);
  if (cached !== undefined) return cached;

  const results = await searchPhoton(q, { limit: 1, signal });
  const match = results[0] || null;
  geocodeCache.set(key, match);
  return match;
}

export async function reversePhoton(lat, lng, { signal } = {}) {
  const key = `rev:${Number(lat).toFixed(5)}:${Number(lng).toFixed(5)}`;
  const cached = geocodeCache.get(key);
  if (cached !== undefined) return cached;

  const params = new URLSearchParams({ lat: String(lat), lon: String(lng) });
  const data = await photonGet(`/reverse?${params.toString()}`, signal);
  const match = normalizePhotonResponse(data)[0] || {
    address: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
    lat: Number(lat),
    lng: Number(lng),
    name: 'Current location',
    city: null,
    country: null,
  };
  geocodeCache.set(key, match);
  return match;
}

async function runPhotonQueries(queries, origin, maxDistance, signal) {
  return Promise.all(queries.map(async ({ q, osm_tag }) => {
    const params = new URLSearchParams({
      q,
      lat: String(origin.lat),
      lon: String(origin.lng),
      limit: '30',
      osm_tag,
    });
    const key = `poi:${params.toString()}`;
    const cached = autocompleteCache.get(key);
    if (cached) return cached;
    try {
      const data = await photonGet(`/api?${params.toString()}`, signal, poiLimiter, PHOTON_NEARBY_TIMEOUT_MS);
      const places = (data?.features || [])
        .map((feature) => normalizePhotonPoi(feature, origin))
        .filter(Boolean)
        .filter((place) => (place.distanceMeters ?? Infinity) <= maxDistance);
      autocompleteCache.set(key, places);
      return places;
    } catch {
      return [];
    }
  }));
}

export async function searchPhotonNearby({ lat, lng, radius }, signal) {
  if (Date.now() < deadUntil) return null;
  const origin = { lat: Number(lat), lng: Number(lng) };
  const maxDistance = Number(radius) || MAX_RADIUS_METERS;
  const guard = abortAfter(PHOTON_NEARBY_TIMEOUT_MS, signal);
  try {
    const batches = await runPhotonQueries(POI_QUERIES, origin, maxDistance, guard.signal);
    const places = dedupePlaces(batches.flat())
      .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
    if (places.length === 0) {
      markDead();
      return null;
    }
    return {
      places,
      grouped: groupPlacesByCategory(places, CATEGORY_IDS),
      center: origin,
      radius: maxDistance,
      source: 'photon',
    };
  } catch (err) {
    if (err?.name === 'AbortError' && signal?.aborted) throw err;
    markDead();
    return null;
  } finally {
    guard.dispose();
  }
}

export function _clearPhotonCache() {
  geocodeCache.clear();
  autocompleteCache.clear();
  deadUntil = 0;
}
