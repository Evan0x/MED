export const DEFAULT_RADIUS_METERS = 8000;
export const MAX_RADIUS_METERS = 15000;
export const MIN_RADIUS_METERS = 500;

export const OVERPASS_TIMEOUT_SECONDS = 5;
export const OVERPASS_CLIENT_TIMEOUT_MS = 2500;
export const PHOTON_NEARBY_TIMEOUT_MS = 1200;
export const FETCH_TIMEOUT_MS = 8000;
export const CACHE_TTL_PLACES_MS = 5 * 60 * 1000;
export const CACHE_TTL_GEOCODE_MS = 30 * 60 * 1000;
export const CACHE_TTL_AUTOCOMPLETE_MS = 10 * 60 * 1000;

export const DEFAULT_OVERPASS_URLS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

export const DEFAULT_PHOTON_URL = 'https://photon.komoot.io';

export const DEFAULT_USER_AGENT =
  'Avelamed/1.0 (https://avelamed.vercel.app; healthcare locator; osm-based)';

export function osmUserAgent() {
  return process.env.OSM_USER_AGENT || DEFAULT_USER_AGENT;
}

export function overpassUrls() {
  const configured = process.env.OVERPASS_URL?.trim();
  if (configured) {
    return [configured, ...DEFAULT_OVERPASS_URLS.filter((url) => url !== configured)];
  }
  return DEFAULT_OVERPASS_URLS;
}

export function photonUrl() {
  return (process.env.PHOTON_URL || DEFAULT_PHOTON_URL).replace(/\/$/, '');
}
