# Avela

Avela helps people find nearby healthcare and wellness places, keep a portable health profile, and chat with an on-site health assistant.

## Mapping stack

Google Maps / Places has been replaced with an OpenStreetMap-based stack:

| Need | Provider | Where it runs |
| --- | --- | --- |
| Map tiles | [OpenFreeMap](https://openfreemap.org/) vector styles via MapLibre GL JS | Browser |
| Nearby healthcare POIs | [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), with Photon / Nominatim fallback | `/api/places` |
| Address search, reverse geocoding, autocomplete | [Photon](https://photon.komoot.io) | `/api/geocode`, `/api/autocomplete` |
| Current location | Browser Geolocation API | Landing page and map locate control |
| Directions link | OSM.org directions with the OSRM engine | Place detail modal |

The frontend talks only to `/api/*` and a stable place model (`id` / `place_id`, `name`, `lat`/`lng`, `types`, `categories`, `vicinity`, `opening_hours`, `phone`, `website`). Overpass and Photon response shapes never leak into UI components.

## Scripts

```bash
npm install
npm run dev      # Vite + local /api functions
npm test         # Vitest
npm run lint
npm run build
```

## Environment

Copy `.env.example` to `.env`. Mapping no longer needs a Google Maps browser key. Optional OSM overrides:

- `OVERPASS_URL` — Overpass interpreter (falls back to a second public instance on failure)
- `PHOTON_URL` — Photon base URL
- `OSM_USER_AGENT` — required identification for OSM usage policy
- `VITE_MAP_STYLE_URL` — MapLibre style URL (default OpenFreeMap Positron)
- `VITE_MAP_STYLE_URL_DARK` — optional dark style URL (default OpenFreeMap Dark)

Chat, translation, and speech still use their existing server-only Google/Gemini keys.

## Usage policy

Public Overpass and Photon endpoints are shared community infrastructure. This app:

- sends **one** Overpass query per search (all categories together)
- caches nearby/geocode/autocomplete results
- debounces autocomplete and map-move discovery
- cancels in-flight requests
- rate-limits and retries with backoff
- caps search radius and rejects huge viewports

For production traffic, point `OVERPASS_URL` / `PHOTON_URL` at instances you operate or have permission to use.

## Known limitations

- OpenStreetMap POIs often lack ratings, review counts, photos, and price levels. Ranking still runs; distance and open/closed status carry more weight when ratings are missing.
- `opening_hours` is parsed for common OSM patterns. Seasonal/complex rules are treated as unknown rather than guessed.
- “Get Directions” opens OpenStreetMap routing (OSRM via osm.org). It is not Google Maps turn-by-turn navigation, and there is no in-app route geometry overlay.
- Public Overpass/Photon availability varies. Configure your own endpoints for production.

## Deploy

Vercel settings are unchanged (`vercel.json` SPA rewrites). After deploy:

1. Remove `VITE_GOOGLE_MAPS_API_KEY` from the Vercel project if it is still set.
2. Keep Clerk, Supabase, Gemini, Translate, and TTS secrets as they are.
3. Optionally set `OVERPASS_URL`, `PHOTON_URL`, `OSM_USER_AGENT`, `VITE_MAP_STYLE_URL`, and `VITE_MAP_STYLE_URL_DARK`.
