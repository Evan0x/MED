import { apiPost } from '../api';
import { haversineMeters } from '../../api/_lib/geo.js';
import { SEARCH_RADIUS_METERS } from './place';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const inflight = new Map();

export function clearLocationCache() {
  cache.clear();
  inflight.clear();
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

function round(n, decimals = 3) {
  const f = 10 ** decimals;
  return Math.round(Number(n) * f) / f;
}

function nearbyKey({ lat, lng, radius, bounds }) {
  if (bounds) {
    return `bbox:${round(bounds.south)}:${round(bounds.west)}:${round(bounds.north)}:${round(bounds.east)}`;
  }
  return `around:${round(lat)}:${round(lng)}:${Math.round(radius || SEARCH_RADIUS_METERS)}`;
}

async function cachedPost(key, path, body, signal) {
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  if (inflight.has(key)) return inflight.get(key);
  const pending = apiPost(path, body, { signal })
    .then((data) => cacheSet(key, data))
    .finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

export async function searchNearby({
  lat,
  lng,
  radius = SEARCH_RADIUS_METERS,
  bounds,
  signal,
} = {}) {
  const key = nearbyKey({ lat, lng, radius, bounds });
  return cachedPost(key, 'places', { lat, lng, radius, bounds }, signal);
}

export async function geocodeAddress(query, { signal } = {}) {
  const q = String(query || '').trim();
  const key = `geo:${q.toLowerCase()}`;
  return cachedPost(key, 'geocode', { action: 'forward', query: q }, signal);
}

export async function reverseGeocode(lat, lng, { signal } = {}) {
  const key = `rev:${Number(lat).toFixed(5)}:${Number(lng).toFixed(5)}`;
  return cachedPost(key, 'geocode', { action: 'reverse', lat, lng }, signal);
}

export async function suggestAddresses(query, { lat, lng, signal, limit = 6 } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const key = `ac:${q.toLowerCase()}:${lat ?? ''}:${lng ?? ''}:${limit}`;
  const data = await cachedPost(key, 'autocomplete', { query: q, lat, lng, limit }, signal);
  return data?.suggestions ?? [];
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (err) => reject(new Error(err?.message ? `Geolocation error: ${err.message}` : 'Geolocation error.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

export function shouldRefetchForMove(previous, next, minMoveMeters = 1600) {
  if (!previous) return false;
  if (!next) return false;
  return haversineMeters(previous.lat, previous.lng, next.lat, next.lng) >= minMoveMeters;
}

export function debounce(fn, wait = 400) {
  let timer;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}
