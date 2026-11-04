import { haversineMeters } from './geo.js';
import { classifyOsmTags, fallbackNameFromTags } from './classify.js';
import { openingHoursFromTag } from './openingHours.js';

function pickTag(tags, keys) {
  for (const key of keys) {
    if (tags[key]) return String(tags[key]).trim();
  }
  return null;
}

export function normalizeWebsite(raw) {
  if (!raw) return null;
  let value = String(raw).trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function formatOsmAddress(tags = {}) {
  if (tags['addr:full']) return tags['addr:full'];
  const line1 = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const locality = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:suburb'];
  const region = tags['addr:state'] || tags['addr:province'];
  const parts = [line1, locality, region, tags['addr:postcode']].filter(Boolean);
  return parts.join(', ') || null;
}

export function formatPhotonAddress(props = {}) {
  if (props.street || props.housenumber) {
    const line1 = [props.housenumber, props.street].filter(Boolean).join(' ');
    return [line1, props.district, props.city, props.state, props.postcode, props.country]
      .filter(Boolean)
      .join(', ');
  }
  return [props.name, props.district, props.city, props.state, props.postcode, props.country]
    .filter(Boolean)
    .join(', ');
}

function elementCoords(el) {
  if (Number.isFinite(el.lat) && Number.isFinite(el.lon)) return { lat: el.lat, lng: el.lon };
  if (el.center && Number.isFinite(el.center.lat) && Number.isFinite(el.center.lon)) {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

export function emptyPlaceFields() {
  return {
    rating: null,
    user_ratings_total: null,
    price_level: null,
    photos: [],
    reviews: [],
    photoUrl: null,
  };
}

export function normalizeOsmElement(el, origin) {
  const tags = el?.tags || {};
  const coords = elementCoords(el);
  if (!coords) return null;

  const name = tags.name || tags['name:en'] || fallbackNameFromTags(tags);
  if (!name) return null;

  const { types, categories } = classifyOsmTags(tags, name);
  if (categories.length === 0) return null;

  const vicinity = formatOsmAddress(tags);
  const website = normalizeWebsite(pickTag(tags, ['website', 'contact:website', 'url']));
  const phone = pickTag(tags, ['phone', 'contact:phone', 'mobile', 'contact:mobile']);
  const openingHours = openingHoursFromTag(tags.opening_hours);
  const id = `${el.type}/${el.id}`;
  const about = pickTag(tags, ['description', 'note', 'healthcare:speciality']);

  return {
    id,
    place_id: id,
    name,
    lat: coords.lat,
    lng: coords.lng,
    geometry: { location: { lat: coords.lat, lng: coords.lng } },
    vicinity,
    address: vicinity,
    types,
    categories,
    opening_hours: openingHours,
    phone,
    website,
    url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    about,
    distanceMeters: origin ? Math.round(haversineMeters(origin.lat, origin.lng, coords.lat, coords.lng)) : null,
    ...emptyPlaceFields(),
  };
}

export function detailsFromPlace(place) {
  if (!place) return null;
  return {
    hours: place.opening_hours,
    website: place.website,
    phone: place.phone,
    photos: place.photos ?? [],
    reviews: place.reviews ?? [],
    url: place.url,
    about: place.about ?? null,
  };
}

export function dedupePlaces(places) {
  const byId = new Map();
  for (const place of places) {
    if (!place?.id) continue;
    const prev = byId.get(place.id);
    if (!prev) {
      byId.set(place.id, { ...place, types: [...place.types], categories: [...place.categories] });
      continue;
    }
    prev.types = [...new Set([...prev.types, ...place.types])];
    prev.categories = [...new Set([...prev.categories, ...place.categories])];
  }

  const unique = [...byId.values()];
  const kept = [];
  for (const place of unique) {
    const dup = kept.find((other) => (
      other.name === place.name
      && haversineMeters(other.lat, other.lng, place.lat, place.lng) < 60
    ));
    if (dup) {
      dup.types = [...new Set([...dup.types, ...place.types])];
      dup.categories = [...new Set([...dup.categories, ...place.categories])];
      if (!dup.vicinity && place.vicinity) dup.vicinity = place.vicinity;
      if (!dup.phone && place.phone) dup.phone = place.phone;
      if (!dup.website && place.website) dup.website = place.website;
      continue;
    }
    kept.push(place);
  }
  return kept;
}

export function groupPlacesByCategory(places, categoryIds) {
  const grouped = {};
  for (const id of categoryIds) grouped[id] = [];
  for (const place of places) {
    for (const category of place.categories || []) {
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(place);
    }
  }
  for (const id of Object.keys(grouped)) {
    grouped[id] = grouped[id]
      .slice()
      .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
      .slice(0, 40);
  }
  return grouped;
}

function photonOsmType(code) {
  if (code === 'W' || code === 'way') return 'way';
  if (code === 'R' || code === 'relation') return 'relation';
  return 'node';
}

export function normalizePhotonPoi(feature, origin) {
  const coords = feature?.geometry?.coordinates;
  const props = feature?.properties || {};
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const name = props.name || fallbackNameFromTags({ [props.osm_key]: props.osm_value });
  if (!name) return null;
  const tags = {};
  if (props.osm_key && props.osm_value) tags[props.osm_key] = props.osm_value;
  const { types, categories } = classifyOsmTags(tags, name);
  if (categories.length === 0) return null;
  const vicinity = formatPhotonAddress(props);
  const osmType = photonOsmType(props.osm_type);
  const osmId = props.osm_id;
  const id = osmId != null ? `${osmType}/${osmId}` : `photon/${lat},${lng},${name}`;
  return {
    id,
    place_id: id,
    name,
    lat,
    lng,
    geometry: { location: { lat, lng } },
    vicinity,
    address: vicinity,
    types,
    categories,
    opening_hours: null,
    phone: null,
    website: null,
    url: osmId != null ? `https://www.openstreetmap.org/${osmType}/${osmId}` : null,
    about: null,
    distanceMeters: origin ? Math.round(haversineMeters(origin.lat, origin.lng, lat, lng)) : null,
    ...emptyPlaceFields(),
  };
}

export function normalizeNominatimResult(item, origin) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const name = item.name || String(item.display_name || '').split(',')[0].trim();
  if (!name) return null;
  const extra = item.extratags || {};
  const tags = {
    ...extra,
    [item.category || item.class || 'amenity']: item.type,
  };
  const { types, categories } = classifyOsmTags(tags, name);
  if (categories.length === 0) return null;
  const osmType = item.osm_type === 'way' || item.osm_type === 'relation' ? item.osm_type : 'node';
  const id = item.osm_id != null ? `${osmType}/${item.osm_id}` : `nominatim/${lat},${lng},${name}`;
  const vicinity = item.display_name || formatOsmAddress(extra);
  return {
    id,
    place_id: id,
    name,
    lat,
    lng,
    geometry: { location: { lat, lng } },
    vicinity,
    address: vicinity,
    types,
    categories,
    opening_hours: openingHoursFromTag(extra.opening_hours),
    phone: extra.phone || extra['contact:phone'] || null,
    website: normalizeWebsite(extra.website || extra['contact:website']),
    url: item.osm_id != null ? `https://www.openstreetmap.org/${osmType}/${item.osm_id}` : null,
    about: extra.description || null,
    distanceMeters: origin ? Math.round(haversineMeters(origin.lat, origin.lng, lat, lng)) : null,
    ...emptyPlaceFields(),
  };
}

export function normalizePhotonFeature(feature) {
  const coords = feature?.geometry?.coordinates;
  const props = feature?.properties || {};
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const address = formatPhotonAddress(props) || props.name || null;
  if (!address) return null;
  return {
    address,
    lat,
    lng,
    name: props.name || address,
    city: props.city || null,
    country: props.country || null,
  };
}
