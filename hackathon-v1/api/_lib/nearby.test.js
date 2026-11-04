import { describe, expect, it } from 'vitest';
import { mergePlaceResults } from './nearby.js';

describe('mergePlaceResults', () => {
  it('dedupes by id and keeps the richer set', () => {
    const photon = {
      source: 'photon',
      radius: 8000,
      center: { lat: 1, lng: 2 },
      places: [
        { id: 'node/1', place_id: 'node/1', name: 'Clinic A', categories: ['clinic'], types: ['clinic'], lat: 1, lng: 2, distanceMeters: 100 },
        { id: 'node/2', place_id: 'node/2', name: 'Pharmacy A', categories: ['pharmacy'], types: ['pharmacy'], lat: 1.01, lng: 2, distanceMeters: 200 },
      ],
    };
    const overpass = {
      source: 'overpass',
      radius: 8000,
      places: [
        { id: 'node/1', place_id: 'node/1', name: 'Clinic A', categories: ['clinic', 'er'], types: ['clinic', 'hospital'], lat: 1, lng: 2, distanceMeters: 100 },
        { id: 'node/3', place_id: 'node/3', name: 'Park', categories: ['outdoor'], types: ['park'], lat: 1.02, lng: 2, distanceMeters: 300 },
      ],
    };
    const merged = mergePlaceResults(photon, overpass);
    expect(merged.places.map((p) => p.place_id).sort()).toEqual(['node/1', 'node/2', 'node/3']);
    expect(merged.places[0].categories).toEqual(expect.arrayContaining(['clinic']));
    expect(merged.source).toBe('photon+overpass');
  });

  it('survives a missing provider result', () => {
    const merged = mergePlaceResults(null, {
      source: 'photon',
      radius: 8000,
      places: [{ id: 'node/9', place_id: 'node/9', name: 'Rx', categories: ['pharmacy'], types: ['pharmacy'], lat: 0, lng: 0, distanceMeters: 10 }],
    });
    expect(merged.places).toHaveLength(1);
    expect(merged.source).toBe('photon');
  });
});
