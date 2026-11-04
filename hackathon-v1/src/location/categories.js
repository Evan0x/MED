const ANIMAL_TYPES = new Set(['veterinary_care', 'pet_store', 'zoo', 'aquarium']);
const ANIMAL_NAME_PATTERNS = [
  'veterinar', 'vet ', 'vet-', ' vet', 'animal', 'pet ', 'pets ', ' pets', 'pet-',
  'canine', 'feline', 'equine', 'kennel', 'dog ', 'cat ', 'avian', 'reptile',
  'wildlife', 'zoo', 'aquarium', 'groomer', 'grooming',
];

export function isHumanOriented(place) {
  const types = place.types ?? [];
  if (types.some((t) => ANIMAL_TYPES.has(t))) return false;
  const name = ` ${(place.name ?? '').toLowerCase()} `;
  if (ANIMAL_NAME_PATTERNS.some((kw) => name.includes(kw))) return false;
  return true;
}

const RETAIL_NOISE_TYPES = new Set([
  'clothing_store', 'shoe_store', 'jewelry_store', 'book_store',
  'home_goods_store', 'furniture_store', 'hardware_store', 'electronics_store',
  'liquor_store', 'bar', 'night_club', 'gas_station', 'car_repair',
  'beauty_salon', 'hair_care', 'spa',
]);

export function hasRetailNoise(place) {
  const types = place.types ?? [];
  return types.some((t) => RETAIL_NOISE_TYPES.has(t));
}

export const SECTIONS = [
  {
    id: 'medical', label: 'Get Well',
    icon: '🏥',
    accent: '#0f766e',
    accentDark: '#2dd4bf',
    accentSoft: '#ecfdf5',
    accentSoftDark: '#0d2821',
    categories: [
      {
        id: 'pharmacy', label: 'Pharmacy', icon: '💊',
        filter: (p) => (p.categories ?? []).includes('pharmacy') && isHumanOriented(p) && !hasRetailNoise(p),
      },
      {
        id: 'er', label: 'ER / Emergency', icon: '🚑',
        filter: (p) => (p.categories ?? []).includes('er') && isHumanOriented(p),
      },
      {
        id: 'dentist', label: 'Dentist', icon: '🦷',
        filter: (p) => (p.categories ?? []).includes('dentist') && isHumanOriented(p),
      },
      {
        id: 'clinic', label: 'Clinic', icon: '🩺',
        filter: (p) => (p.categories ?? []).includes('clinic') && isHumanOriented(p) && !hasRetailNoise(p),
      },
      {
        id: 'optician', label: 'Optician', icon: '👓',
        filter: (p) => (p.categories ?? []).includes('optician') && isHumanOriented(p) && !hasRetailNoise(p),
      },
    ],
  },
  {
    id: 'wellness', label: 'Stay Well',
    icon: '🌿',
    accent: '#15803d',
    accentDark: '#4ade80',
    accentSoft: '#f0fdf4',
    accentSoftDark: '#0d2018',
    categories: [
      {
        id: 'gym', label: 'Gym', icon: '🏋️',
        filter: (p) => (p.categories ?? []).includes('gym'),
      },
      {
        id: 'outdoor', label: 'Outdoor Space', icon: '🌳',
        filter: (p) => (p.categories ?? []).includes('outdoor'),
      },
      {
        id: 'community', label: 'Community Center', icon: '🏛️',
        filter: (p) => (p.categories ?? []).includes('community'),
      },
      {
        id: 'therapist', label: 'Therapist', icon: '🧠',
        filter: (p) => (p.categories ?? []).includes('therapist'),
      },
      {
        id: 'healthy_eating', label: 'Healthy Eating', icon: '🥗',
        filter: (p) => (p.categories ?? []).includes('healthy_eating'),
      },
    ],
  },
];

export function groupPlaces(places, sections = SECTIONS) {
  const data = {};
  for (const section of sections) {
    for (const cat of section.categories) {
      const allPlaces = (places ?? [])
        .filter((p) => cat.filter(p))
        .slice()
        .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
        .slice(0, 40);
      data[cat.id] = { allPlaces };
    }
  }
  return data;
}

export function uniquePlaces(places) {
  const seen = new Set();
  const out = [];
  for (const place of places ?? []) {
    const id = place.place_id || place.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(place);
  }
  return out;
}
