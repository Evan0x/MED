export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function isValidLatLng(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
}

export function clampRadius(radius, { min, max, fallback }) {
  const n = Number(radius);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function bboxDiagonalMeters(bounds) {
  if (!bounds) return 0;
  return haversineMeters(bounds.south, bounds.west, bounds.north, bounds.east);
}

export function isValidBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') return false;
  const { south, west, north, east } = bounds;
  return isValidLatLng(south, west) && isValidLatLng(north, east) && Number(north) > Number(south);
}

export function boundingBoxFromRadius(lat, lng, radiusMeters) {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.max(0.2, Math.cos((Number(lat) * Math.PI) / 180)));
  return {
    south: Number(lat) - latDelta,
    north: Number(lat) + latDelta,
    west: Number(lng) - lngDelta,
    east: Number(lng) + lngDelta,
  };
}
