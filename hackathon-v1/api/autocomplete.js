import { json, readJson } from './_lib/http.js';
import { isValidLatLng } from './_lib/geo.js';
import { searchPhoton } from './_lib/photon.js';

export const maxDuration = 10;

export async function POST(request) {
  const body = await readJson(request);
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (query.length < 2) return json({ suggestions: [] });
  if (query.length > 200) return json({ error: 'Query is too long.' }, 400);

  const lat = body?.lat;
  const lng = body?.lng;
  const bias = isValidLatLng(lat, lng) ? { lat: Number(lat), lng: Number(lng) } : {};
  const limit = Math.min(8, Math.max(1, Number(body?.limit) || 6));

  try {
    const suggestions = await searchPhoton(query, { limit, ...bias });
    return json({ suggestions });
  } catch (err) {
    if (err?.name === 'AbortError') return json({ error: 'Request cancelled.' }, 499);
    console.error('Photon autocomplete error', err);
    return json({ error: 'Address suggestions are temporarily unavailable.' }, 502);
  }
}
