import { Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

let configured = false;

export function ensureMapWorker() {
  if (configured) return;
  configured = true;
  if (typeof window === 'undefined' || !workerUrl) return;
  try {
    setWorkerUrl(workerUrl);
  } catch {
    configured = false;
  }
}

export { Map, Marker, Popup };
