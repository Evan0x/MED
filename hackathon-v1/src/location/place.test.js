import { describe, expect, it } from 'vitest';
import { detailsFromPlace, formatDistance, getDirectionsUrl, getPhotoUrl, getPlaceLatLng } from './place.js';

describe('place helpers', () => {
  const place = {
    place_id: 'node/4',
    name: 'Clinic',
    lat: 40.7,
    lng: -74.0,
    website: 'https://clinic.example',
    phone: '555',
    opening_hours: { open_now: true, weekday_text: ['Monday: Open 24 hours'] },
    photos: [{ url: 'https://img.example/p.jpg' }],
    about: 'Neighborhood clinic',
  };

  it('reads coordinates from the stable model', () => {
    expect(getPlaceLatLng(place)).toEqual({ lat: 40.7, lng: -74 });
    expect(getPlaceLatLng({ geometry: { location: { lat: 1, lng: 2 } } })).toEqual({ lat: 1, lng: 2 });
  });

  it('builds OSM/OSRM directions instead of Google Maps URLs', () => {
    const url = getDirectionsUrl(place, { lat: 40.71, lng: -74.01 });
    expect(url).toContain('openstreetmap.org/directions');
    expect(url).toContain('fossgis_osrm_car');
    expect(url).not.toContain('google.com');
    expect(getPhotoUrl(place)).toBe('https://img.example/p.jpg');
  });

  it('formats distances without inventing a value', () => {
    expect(formatDistance(240)).toBe('240 m');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(null)).toBeNull();
  });

  it('projects details without provider-specific photo objects', () => {
    expect(detailsFromPlace(place)).toMatchObject({
      website: 'https://clinic.example',
      phone: '555',
      about: 'Neighborhood clinic',
      photos: [{ url: 'https://img.example/p.jpg' }],
    });
  });
});
