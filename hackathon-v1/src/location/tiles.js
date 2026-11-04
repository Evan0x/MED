export const DEFAULT_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
export const DEFAULT_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

export const MAP_ATTRIBUTION = [
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>',
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a>',
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
].join(' ');

export function mapStyleConfig(dark = false) {
  const configured = import.meta.env.VITE_MAP_STYLE_URL;
  const configuredDark = import.meta.env.VITE_MAP_STYLE_URL_DARK;
  const url = dark
    ? (configuredDark || configured || DEFAULT_STYLE_DARK)
    : (configured || DEFAULT_STYLE_LIGHT);
  return { url, attribution: MAP_ATTRIBUTION };
}
