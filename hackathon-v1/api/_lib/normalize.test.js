import { describe, expect, it } from 'vitest';
import {
  dedupePlaces,
  formatPhotonAddress,
  groupPlacesByCategory,
  normalizeOsmElement,
  normalizePhotonFeature,
  normalizePhotonPoi,
  normalizeWebsite,
} from './normalize.js';
import { CATEGORY_IDS } from './classify.js';
import { normalizeOverpassResponse } from './overpass.js';

const origin = { lat: 40.71, lng: -74.01 };

describe('normalizeOsmElement', () => {
  it('converts OSM tags into the stable place model', () => {
    const place = normalizeOsmElement({
      type: 'node',
      id: 99,
      lat: 40.712,
      lon: -74.006,
      tags: {
        name: 'Seaport Pharmacy',
        amenity: 'pharmacy',
        phone: '+1 555 0100',
        website: 'seaportpharmacy.example',
        'addr:housenumber': '12',
        'addr:street': 'Front St',
        'addr:city': 'New York',
        opening_hours: 'Mo-Fr 09:00-18:00',
      },
    }, origin);

    expect(place).toMatchObject({
      id: 'node/99',
      place_id: 'node/99',
      name: 'Seaport Pharmacy',
      lat: 40.712,
      lng: -74.006,
      types: expect.arrayContaining(['pharmacy']),
      categories: ['pharmacy'],
      phone: '+1 555 0100',
      rating: null,
      photos: [],
    });
    expect(place.geometry.location).toEqual({ lat: 40.712, lng: -74.006 });
    expect(place.vicinity).toContain('Front St');
    expect(place.website).toBe('https://seaportpharmacy.example/');
    expect(place.opening_hours?.weekday_text?.length).toBe(7);
    expect(place.url).toBe('https://www.openstreetmap.org/node/99');
  });

  it('skips unnamed and uncategorized elements', () => {
    expect(normalizeOsmElement({ type: 'node', id: 1, lat: 1, lon: 1, tags: {} }, origin)).toBeNull();
    expect(normalizeOsmElement({
      type: 'node', id: 2, lat: 1, lon: 1, tags: { name: 'Random Bench' },
    }, origin)).toBeNull();
  });

  it('uses way center coordinates and a fallback name from tags', () => {
    const place = normalizeOsmElement({
      type: 'way',
      id: 5,
      center: { lat: 41, lon: -73 },
      tags: { amenity: 'hospital' },
    }, origin);
    expect(place.name).toBe('Hospital');
    expect(place.lat).toBe(41);
    expect(place.categories).toContain('er');
  });
});

describe('dedupePlaces', () => {
  it('merges duplicate OSM ids and nearby same-name objects', () => {
    const a = normalizeOsmElement({
      type: 'node', id: 1, lat: 40.71, lon: -74.01,
      tags: { name: 'City Clinic', amenity: 'clinic' },
    }, origin);
    const b = normalizeOsmElement({
      type: 'node', id: 1, lat: 40.71, lon: -74.01,
      tags: { name: 'City Clinic', amenity: 'clinic', healthcare: 'doctor' },
    }, origin);
    const c = normalizeOsmElement({
      type: 'way', id: 2, lat: 40.7101, lon: -74.0101,
      tags: { name: 'City Clinic', amenity: 'doctors' },
    }, origin);
    const out = dedupePlaces([a, b, c]);
    expect(out).toHaveLength(1);
    expect(out[0].categories).toContain('clinic');
  });
});

describe('groupPlacesByCategory', () => {
  it('puts a place into each of its categories and caps at 20', () => {
    const hospital = normalizeOsmElement({
      type: 'node', id: 8, lat: 40.71, lon: -74.01,
      tags: { name: 'General Hospital', amenity: 'hospital' },
    }, origin);
    const grouped = groupPlacesByCategory([hospital], CATEGORY_IDS);
    expect(grouped.er[0].name).toBe('General Hospital');
    expect(grouped.pharmacy).toEqual([]);
  });
});

describe('photon + website normalization', () => {
  it('formats photon features without exposing provider fields to callers', () => {
    const result = normalizePhotonFeature({
      geometry: { coordinates: [-74.0, 40.7] },
      properties: { name: 'City Hall', street: 'Broadway', housenumber: '1', city: 'New York', country: 'USA' },
    });
    expect(result).toEqual({
      address: '1 Broadway, New York, USA',
      lat: 40.7,
      lng: -74.0,
      name: 'City Hall',
      city: 'New York',
      country: 'USA',
    });
    expect(formatPhotonAddress({ city: 'Paris', country: 'France' })).toBe('Paris, France');
    const poi = normalizePhotonPoi({
      geometry: { coordinates: [-74.0, 40.7] },
      properties: { name: 'Main Pharmacy', osm_key: 'amenity', osm_value: 'pharmacy', osm_type: 'N', osm_id: 77, city: 'New York' },
    }, origin);
    expect(poi.place_id).toBe('node/77');
    expect(poi.categories).toContain('pharmacy');
  });

  it('maps Nominatim results into the same place model', async () => {
    const { normalizeNominatimResult } = await import('./normalize.js');
    const place = normalizeNominatimResult({
      lat: '40.7',
      lon: '-74.0',
      name: 'West Pharmacy',
      display_name: 'West Pharmacy, New York',
      osm_type: 'node',
      osm_id: 55,
      category: 'amenity',
      type: 'pharmacy',
      extratags: { phone: '555' },
    }, origin);
    expect(place.place_id).toBe('node/55');
    expect(place.categories).toContain('pharmacy');
    expect(place.phone).toBe('555');
  });

  it('normalizes websites and rejects bad protocols', () => {
    expect(normalizeWebsite('example.com')).toBe('https://example.com/');
    expect(normalizeWebsite('javascript:alert(1)')).toBeNull();
    expect(normalizeWebsite('')).toBeNull();
  });
});

describe('normalizeOverpassResponse', () => {
  it('drops invalid elements and returns grouped stable places', () => {
    const result = normalizeOverpassResponse({
      elements: [
        { type: 'node', id: 1, lat: 40.72, lon: -74.0, tags: { name: 'Rx', amenity: 'pharmacy' } },
        { type: 'node', id: 2, tags: { name: 'No coords', amenity: 'clinic' } },
      ],
    }, origin);
    expect(result.places).toHaveLength(1);
    expect(result.grouped.pharmacy).toHaveLength(1);
    expect(result.places[0].place_id).toBe('node/1');
  });
});
