export const SEARCH_RADIUS_METERS = 8000;
export const LIST_PER_CATEGORY = 8;

export function formatDistance(meters) {
  if (meters == null || meters === '') return null;
  if (!Number.isFinite(Number(meters))) return null;
  const m = Math.max(0, Math.round(Number(meters)));
  if (m < 1000) return `${m} m`;
  const km = m / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function getPlaceLatLng(place) {
  const lat = place?.lat ?? place?.geometry?.location?.lat;
  const lng = place?.lng ?? place?.geometry?.location?.lng;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

export function isPlaceOpen(place) {
  return place?.opening_hours?.open_now === true;
}

export function getPhotoUrl(place, details) {
  return details?.photos?.[0]?.url || place?.photoUrl || place?.photos?.[0]?.url || null;
}

export function getDirectionsUrl(place, origin) {
  const dest = getPlaceLatLng(place);
  if (!dest) return 'https://www.openstreetmap.org/directions';
  if (origin && Number.isFinite(Number(origin.lat)) && Number.isFinite(Number(origin.lng))) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.lat}%2C${origin.lng}%3B${dest.lat}%2C${dest.lng}`;
  }
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${dest.lat}%2C${dest.lng}`;
}

export function detailsFromPlace(place) {
  if (!place) return null;
  return {
    hours: place.opening_hours ?? null,
    website: place.website ?? null,
    phone: place.phone ?? null,
    photos: place.photos ?? [],
    reviews: place.reviews ?? [],
    url: place.url ?? null,
    about: place.about ?? null,
  };
}

export function detailsMapFromPlaces(places) {
  const map = {};
  for (const place of places || []) {
    map[place.place_id] = detailsFromPlace(place);
  }
  return map;
}
