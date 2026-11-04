import { describe, expect, it } from 'vitest';
import { escapeHtml, markerColorForPlace, placesToGeoJSON, primaryCategory } from './markers.js';

describe('placesToGeoJSON', () => {
  it('skips invalid coordinates and marks the selected feature', () => {
    const geojson = placesToGeoJSON([
      { place_id: 'node/1', name: 'Clinic', lat: 40.7, lng: -74, categories: ['clinic'] },
      { place_id: 'node/2', name: 'Broken' },
    ], 'node/1');
    expect(geojson.features).toHaveLength(1);
    expect(geojson.features[0].geometry.coordinates).toEqual([-74, 40.7]);
    expect(geojson.features[0].properties.selected).toBe(true);
    expect(primaryCategory({ categories: ['clinic'] })).toBe('clinic');
    expect(markerColorForPlace({ categories: ['er'] }, false)).toBe('#b91c1c');
    expect(escapeHtml('<x>')).toBe('&lt;x&gt;');
  });
});
