import { describe, expect, it } from 'vitest';
import { buildOverpassQuery } from './overpass.js';

describe('buildOverpassQuery', () => {
  it('uses a single around query for all healthcare categories', () => {
    const query = buildOverpassQuery({ lat: 40.7, lng: -74.0, radius: 4000 });
    expect(query).toContain('[out:json][timeout:5]');
    expect(query).toContain('(around:4000,40.7,-74)');
    expect(query.match(/nwr\[/g).length).toBeGreaterThan(1);
    expect(query).toContain('out center tags');
    expect(query).not.toContain('around:4000,40.7,-74);nwr["amenity"="hospital"](around');
  });

  it('supports viewport bounding boxes', () => {
    const query = buildOverpassQuery({
      lat: 40.7,
      lng: -74.0,
      bounds: { south: 40.6, west: -74.1, north: 40.8, east: -73.9 },
    });
    expect(query).toContain('(40.6,-74.1,40.8,-73.9)');
    expect(query).not.toContain('around:');
  });
});
