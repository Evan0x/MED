import { describe, expect, it } from 'vitest';
import { groupPlaces, isHumanOriented, SECTIONS, uniquePlaces } from './categories.js';

const pharmacy = {
  place_id: 'node/1',
  name: 'Human Pharmacy',
  types: ['pharmacy'],
  categories: ['pharmacy'],
  distanceMeters: 120,
};
const vet = {
  place_id: 'node/2',
  name: 'City Veterinary Clinic',
  types: ['clinic'],
  categories: ['clinic'],
  distanceMeters: 80,
};
const clinic = {
  place_id: 'node/3',
  name: 'Walk-In Clinic',
  types: ['clinic', 'doctor'],
  categories: ['clinic'],
  distanceMeters: 200,
};

describe('category filtering', () => {
  it('keeps human pharmacies and clinics and drops animal facilities', () => {
    expect(isHumanOriented(pharmacy)).toBe(true);
    expect(isHumanOriented(vet)).toBe(false);
    const grouped = groupPlaces([pharmacy, vet, clinic], SECTIONS);
    expect(grouped.pharmacy.allPlaces.map((p) => p.place_id)).toEqual(['node/1']);
    expect(grouped.clinic.allPlaces.map((p) => p.place_id)).toEqual(['node/3']);
  });

  it('deduplicates markers by place id', () => {
    expect(uniquePlaces([pharmacy, pharmacy, clinic])).toHaveLength(2);
  });
});
