import { json, readJson } from './_lib/http.js';
import { isValidLatLng } from './_lib/geo.js';
import { geocodePhoton, reversePhoton } from './_lib/photon.js';

export const maxDuration = 10;

export async function POST(request) {
  const body = await readJson(request);
  const action = body?.action === 'reverse' ? 'reverse' : 'forward';

  try {
    if (action === 'reverse') {
      const lat = Number(body?.lat);
      const lng = Number(body?.lng);
      if (!isValidLatLng(lat, lng)) return json({ error: 'Invalid location.' }, 400);
      const result = await reversePhoton(lat, lng);
      if (!result) return json({ error: 'Could not convert your coordinates to an address.' }, 404);
      return json(result);
    }

    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    if (!query || query.length > 200) return json({ error: 'Please enter an address.' }, 400);
    const result = await geocodePhoton(query);
    if (!result) return json({ error: 'Address not found. Try selecting from the dropdown.' }, 404);
    return json(result);
  } catch (err) {
    if (err?.name === 'AbortError') return json({ error: 'Request cancelled.' }, 499);
    console.error('Photon geocode error', err);
    return json({ error: 'Address lookup is temporarily unavailable. Please try again.' }, 502);
  }
}
