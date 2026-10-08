const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Loads the Maps JS API (with Places) once, then calls callback.
// Safe to call from any page; later callers wait for the same script.
export function loadGoogleMaps(callback) {
  if (window.google?.maps?.places) { callback(); return; }
  const existing = document.querySelector('#gmaps-script');
  if (existing) {
    existing.addEventListener('load', callback);
    return;
  }
  const script = document.createElement('script');
  script.id = 'gmaps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  document.head.appendChild(script);
}
