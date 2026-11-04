import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchNearbyPlaces = vi.fn();
vi.mock('./_lib/nearby.js', () => ({
  searchNearbyPlaces: (...args) => searchNearbyPlaces(...args),
}));

import { POST } from './places.js';

function post(body) {
  return POST(new Request('http://localhost/api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('POST /api/places', () => {
  beforeEach(() => {
    searchNearbyPlaces.mockReset();
  });

  it('rejects invalid coordinates', async () => {
    const res = await post({ lat: 1000, lng: 0 });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid location.' });
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
  });

  it('returns normalized nearby results', async () => {
    searchNearbyPlaces.mockResolvedValue({
      places: [{ place_id: 'node/1', name: 'Clinic', categories: ['clinic'] }],
      grouped: { clinic: [{ place_id: 'node/1' }] },
      center: { lat: 40.7, lng: -74 },
      radius: 4000,
    });
    const res = await post({ lat: 40.7, lng: -74 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.places[0].place_id).toBe('node/1');
    expect(searchNearbyPlaces).toHaveBeenCalledWith(expect.objectContaining({ lat: 40.7, lng: -74, radius: 8000 }));
  });

  it('maps upstream failures to a stable error', async () => {
    searchNearbyPlaces.mockRejectedValue(new Error('timeout'));
    const res = await post({ lat: 40.7, lng: -74 });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Nearby search is temporarily unavailable. Please try again.' });
  });
});
