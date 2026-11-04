const ANIMAL_NAME_PATTERNS = [
  'veterinar', 'vet ', 'vet-', ' vet', 'animal hospital', 'animal clinic',
  'pet hospital', 'pet clinic', 'pet store', 'pets ', 'canine', 'feline',
  'equine', 'kennel', 'avian', 'reptile', 'wildlife', 'groomer', 'grooming',
];

const ANIMAL_AMENITY = new Set(['veterinary', 'animal_boarding', 'animal_shelter']);
const ANIMAL_HEALTHCARE = new Set(['veterinary']);
const ANIMAL_SHOP = new Set(['pet', 'pet_grooming']);

export const CATEGORY_IDS = [
  'pharmacy', 'er', 'dentist', 'clinic', 'optician',
  'gym', 'outdoor', 'community', 'therapist', 'healthy_eating',
];

function nameHaystack(name) {
  return ` ${(name || '').toLowerCase()} `;
}

export function isAnimalPlace(tags = {}, name = '') {
  if (ANIMAL_AMENITY.has(tags.amenity) || ANIMAL_HEALTHCARE.has(tags.healthcare) || ANIMAL_SHOP.has(tags.shop)) {
    return true;
  }
  const hay = nameHaystack(name);
  return ANIMAL_NAME_PATTERNS.some((kw) => hay.includes(kw));
}

function add(types, categories, typeList, categoryId) {
  typeList.forEach((t) => types.add(t));
  if (categoryId) categories.add(categoryId);
}

export function classifyOsmTags(tags = {}, name = '') {
  const types = new Set();
  const categories = new Set();
  if (isAnimalPlace(tags, name)) return { types: [], categories: [] };

  const amenity = tags.amenity || '';
  const healthcare = tags.healthcare || '';
  const shop = tags.shop || '';
  const leisure = tags.leisure || '';
  const emergency = tags.emergency || '';
  const healthcareSpeciality = (tags['healthcare:speciality'] || tags.speciality || '').toLowerCase();
  const hay = nameHaystack(name);

  if (amenity === 'pharmacy' || healthcare === 'pharmacy' || shop === 'chemist') {
    add(types, categories, ['pharmacy', 'drugstore'], 'pharmacy');
  }
  if (amenity === 'hospital' || healthcare === 'hospital' || healthcare === 'emergency_ward') {
    add(types, categories, ['hospital'], 'er');
  }
  if (emergency === 'yes' || emergency === 'emergency_ward_entrance' || emergency === 'ambulance_station') {
    add(types, categories, ['hospital'], 'er');
  }
  if (amenity === 'dentist' || healthcare === 'dentist' || healthcareSpeciality.includes('dentist')) {
    add(types, categories, ['dentist'], 'dentist');
  }
  if (
    amenity === 'clinic'
    || amenity === 'doctors'
    || healthcare === 'clinic'
    || healthcare === 'doctor'
    || healthcare === 'centre'
    || healthcare === 'center'
    || healthcare === 'health_post'
  ) {
    add(types, categories, ['doctor', 'health', 'clinic'], 'clinic');
  }
  if (healthcare === 'urgent_care' || emergency === 'urgent_care' || hay.includes('urgent care') || hay.includes('walk-in') || hay.includes('walk in')) {
    add(types, categories, ['doctor', 'health', 'clinic'], 'clinic');
  }
  if (shop === 'optician' || healthcare === 'optometrist' || healthcare === 'optician') {
    add(types, categories, ['optician'], 'optician');
  }
  if (leisure === 'fitness_centre' || leisure === 'fitness_station' || amenity === 'gym') {
    add(types, categories, ['gym'], 'gym');
  }
  if (leisure === 'sports_centre' && (hay.includes('gym') || hay.includes('fitness') || hay.includes('yoga'))) {
    add(types, categories, ['gym'], 'gym');
  }
  if (leisure === 'park' || leisure === 'nature_reserve' || leisure === 'garden' || leisure === 'stadium' || tags.natural) {
    add(types, categories, ['park', 'natural_feature'], 'outdoor');
  }
  if (amenity === 'community_centre' || amenity === 'social_centre' || leisure === 'sports_centre') {
    add(types, categories, ['community'], 'community');
  }
  if (
    healthcare === 'psychotherapist'
    || healthcare === 'counsellor'
    || healthcare === 'counselor'
    || healthcare === 'psychologist'
    || healthcare === 'psychiatrist'
    || amenity === 'therapist'
  ) {
    add(types, categories, ['physiotherapist'], 'therapist');
  }
  if (shop === 'health_food' || shop === 'nutrition_supplements' || shop === 'herbalist' || tags['diet:vegan'] === 'yes' || tags.organic === 'yes') {
    add(types, categories, ['health_food_store', 'food'], 'healthy_eating');
  }
  if ((tags.cuisine || '').toLowerCase().match(/salad|juice|vegan|vegetarian|organic/)) {
    add(types, categories, ['restaurant', 'food', 'cafe'], 'healthy_eating');
  }
  if (
    hay.includes('therap') || hay.includes('counsel') || hay.includes('mental health')
    || hay.includes('psycholog') || hay.includes('psychiatr') || hay.includes('behav')
  ) {
    add(types, categories, ['physiotherapist'], 'therapist');
  }
  if (
    hay.includes('health food') || hay.includes('juice bar')
    || (shop === 'supermarket' && (hay.includes('whole foods') || hay.includes('trader joe') || hay.includes('organic')))
    || ((amenity === 'cafe' || amenity === 'restaurant') && (hay.includes('organic') || hay.includes('vegan') || hay.includes('salad') || hay.includes('juice')))
  ) {
    add(types, categories, ['food', 'health_food_store'], 'healthy_eating');
  }

  if (categories.size === 0) {
    if (hay.includes('pharmacy') || hay.includes('drugstore') || hay.includes('chemist') || hay.includes('apothecary')) {
      add(types, categories, ['pharmacy', 'drugstore'], 'pharmacy');
    }
    if (hay.includes('hospital') || hay.includes('emergency')) {
      add(types, categories, ['hospital'], 'er');
    }
    if (hay.includes('dental') || hay.includes('dentist') || hay.includes('orthodont')) {
      add(types, categories, ['dentist'], 'dentist');
    }
    if (hay.includes('clinic') || hay.includes('urgent') || hay.includes('physician') || hay.includes('medical')) {
      add(types, categories, ['doctor', 'health', 'clinic'], 'clinic');
    }
    if (hay.includes('optic') || hay.includes('optom') || hay.includes('vision') || hay.includes('eyeglass') || hay.includes('eyewear')) {
      add(types, categories, ['optician'], 'optician');
    }
    if (hay.includes('gym') || hay.includes('fitness') || hay.includes('crossfit') || hay.includes('yoga') || hay.includes('pilates')) {
      add(types, categories, ['gym'], 'gym');
    }
    if (hay.includes('park') || hay.includes('trail') || hay.includes('garden')) {
      add(types, categories, ['park'], 'outdoor');
    }
    if (hay.includes('community') || hay.includes('recreation') || hay.includes('ymca') || hay.includes('ywca')) {
      add(types, categories, ['community'], 'community');
    }
    if (hay.includes('therap') || hay.includes('counsel') || hay.includes('mental') || hay.includes('psych') || hay.includes('behav')) {
      add(types, categories, ['physiotherapist'], 'therapist');
    }
    if (hay.includes('organic') || hay.includes('vegan') || hay.includes('salad') || hay.includes('juice') || hay.includes('health food')) {
      add(types, categories, ['food', 'health_food_store'], 'healthy_eating');
    }
  }

  return { types: [...types], categories: [...categories] };
}

export function fallbackNameFromTags(tags = {}) {
  const amenity = tags.amenity;
  const healthcare = tags.healthcare;
  const shop = tags.shop;
  const leisure = tags.leisure;
  if (amenity === 'hospital' || healthcare === 'hospital') return 'Hospital';
  if (amenity === 'pharmacy' || healthcare === 'pharmacy') return 'Pharmacy';
  if (amenity === 'clinic' || healthcare === 'clinic') return 'Clinic';
  if (amenity === 'doctors' || healthcare === 'doctor') return 'Doctor';
  if (amenity === 'dentist' || healthcare === 'dentist') return 'Dentist';
  if (healthcare === 'urgent_care') return 'Urgent Care';
  if (shop === 'optician' || healthcare === 'optometrist') return 'Optician';
  if (leisure === 'fitness_centre') return 'Gym';
  if (leisure === 'park') return 'Park';
  if (amenity === 'community_centre') return 'Community Center';
  if (healthcare === 'psychotherapist' || healthcare === 'counsellor') return 'Therapist';
  if (shop === 'health_food') return 'Health Food Store';
  return null;
}
