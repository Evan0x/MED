import { describe, expect, it } from 'vitest';
import { classifyOsmTags, isAnimalPlace } from './classify.js';

describe('classifyOsmTags', () => {
  it('maps hospitals, clinics, pharmacies, doctors, and urgent care', () => {
    expect(classifyOsmTags({ amenity: 'hospital' }, 'City Hospital').categories).toContain('er');
    expect(classifyOsmTags({ amenity: 'clinic' }, 'Family Clinic').categories).toContain('clinic');
    expect(classifyOsmTags({ amenity: 'pharmacy' }, 'Main Pharmacy').categories).toContain('pharmacy');
    expect(classifyOsmTags({ amenity: 'doctors' }, 'Dr Smith').categories).toContain('clinic');
    expect(classifyOsmTags({ healthcare: 'urgent_care' }, 'Rapid Urgent Care').categories).toContain('clinic');
    expect(classifyOsmTags({ amenity: 'dentist' }, 'Smile Dental').categories).toContain('dentist');
  });

  it('uses name fallbacks when OSM tags are missing', () => {
    expect(classifyOsmTags({}, 'Downtown Pharmacy').categories).toContain('pharmacy');
    expect(classifyOsmTags({}, 'Walk-In Clinic').categories).toContain('clinic');
    expect(classifyOsmTags({}, 'Vision Works Optometry').categories).toContain('optician');
    expect(classifyOsmTags({ amenity: 'clinic' }, 'Boston Counseling').categories).toContain('therapist');
    expect(classifyOsmTags({ shop: 'supermarket' }, 'Whole Foods Market').categories).toContain('healthy_eating');
    expect(classifyOsmTags({ amenity: 'parking' }, 'Whole Foods Market Parking').categories).not.toContain('healthy_eating');
    expect(classifyOsmTags({}, 'Northside Psychologist').categories).toContain('therapist');
  });

  it('excludes veterinary and animal facilities', () => {
    expect(isAnimalPlace({ amenity: 'veterinary' }, 'Paws Clinic')).toBe(true);
    expect(classifyOsmTags({ amenity: 'veterinary' }, 'Paws Clinic').categories).toEqual([]);
    expect(classifyOsmTags({ amenity: 'clinic' }, 'Animal Hospital').categories).toEqual([]);
  });
});
