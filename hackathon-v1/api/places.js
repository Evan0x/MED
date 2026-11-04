import { json, readJson } from './_lib/http.js';
import {
  DEFAULT_RADIUS_METERS,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
} from './_lib/constants.js';
import { bboxDiagonalMeters, clampRadius, isValidBounds, isValidLatLng } from './_lib/geo.js';
import { searchNearbyPlaces } from './_lib/nearby.js';

export const maxDuration = 15;

export async function POST(request) {
  const body = await readJson(request);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!isValidLatLng(lat, lng)) return json({ error: 'Invalid location.' }, 400);

  const radius = clampRadius(body?.radius, {
    min: MIN_RADIUS_METERS,
    max: MAX_RADIUS_METERS,
    fallback: DEFAULT_RADIUS_METERS,
  });

  let bounds;
  if (body?.bounds) {
    if (!isValidBounds(body.bounds)) return json({ error: 'Invalid map bounds.' }, 400);
    const diagonal = bboxDiagonalMeters(body.bounds);
    if (diagonal > MAX_RADIUS_METERS * 2) {
      bounds = undefined;
    } else {
      bounds = {
        south: Number(body.bounds.south),
        west: Number(body.bounds.west),
        north: Number(body.bounds.north),
        east: Number(body.bounds.east),
      };
    }
  }

  try {
    const result = await searchNearbyPlaces({ lat, lng, radius, bounds });
    return json(result);
  } catch (err) {
    if (err?.name === 'AbortError' && request.signal?.aborted) {
      return json({ error: 'Request cancelled.' }, 499);
    }
    console.error('Overpass error', err);
    return json({ error: 'Nearby search is temporarily unavailable. Please try again.' }, 502);
  }
}
