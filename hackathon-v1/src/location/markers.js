export const CATEGORY_MARKER = {
  pharmacy: { color: '#0f766e', label: 'Pharmacy' },
  er: { color: '#b91c1c', label: 'Emergency' },
  dentist: { color: '#0369a1', label: 'Dentist' },
  clinic: { color: '#0e7490', label: 'Clinic' },
  optician: { color: '#5b21b6', label: 'Optician' },
  gym: { color: '#15803d', label: 'Gym' },
  outdoor: { color: '#3f6212', label: 'Park' },
  community: { color: '#57534e', label: 'Community' },
  therapist: { color: '#6d28d9', label: 'Therapist' },
  healthy_eating: { color: '#65a30d', label: 'Healthy eating' },
};

export function primaryCategory(place) {
  const ids = place?.categories || [];
  return ids.find((id) => CATEGORY_MARKER[id]) || ids[0] || 'clinic';
}

export function markerColorForPlace(place, selected, accent = '#0f766e') {
  if (selected) return accent;
  return CATEGORY_MARKER[primaryCategory(place)]?.color || '#64748b';
}

export function placesToGeoJSON(places, selectedId) {
  return {
    type: 'FeatureCollection',
    features: (places || []).flatMap((place) => {
      const lat = Number(place.lat ?? place.geometry?.location?.lat);
      const lng = Number(place.lng ?? place.geometry?.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      const id = place.place_id || place.id;
      return [{
        type: 'Feature',
        id,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          id,
          name: place.name || '',
          category: primaryCategory(place),
          selected: id === selectedId,
          color: markerColorForPlace(place, id === selectedId),
        },
      }];
    }),
  };
}

export function viewportFromMap(map) {
  const center = map.getCenter();
  const bounds = map.getBounds();
  return {
    lat: center.lat,
    lng: center.lng,
    bounds: {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    },
  };
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
