# Avela

Avela is a healthcare discovery web app for finding nearby clinics, hospitals, pharmacies, and related services.

It includes:
- location-based healthcare search
- address autocomplete + geocoding
- dark-mode map/list experience
- health profile and assistant features

---

## Tech stack

- **Frontend:** React + Vite + React Router
- **Map rendering:** MapLibre GL JS
- **Geospatial/data providers:** OpenStreetMap ecosystem (Overpass, Photon, Nominatim fallback)
- **Server routes:** Vercel serverless functions in `/api`
- **Auth / data:** Clerk + Supabase

---

## Mapping architecture

| Need | Provider | Runtime |
| --- | --- | --- |
| Base map tiles | OpenFreeMap styles via MapLibre | Browser |
| Nearby healthcare POIs | Overpass API (+ fallback logic) | `/api/places` |
| Forward + reverse geocode | Photon | `/api/geocode` |
| Address autocomplete | Photon | `/api/autocomplete` |
| Current location | Browser Geolocation API | Landing + Results |
| Directions handoff | OSM.org (OSRM) | Place details |

The UI consumes normalized place objects from `/api/*` so raw provider response formats do not leak into components.

---

## Quick start

1. Install dependencies

```bash
npm install
```

2. Create local environment

```bash
cp .env.example .env
```

3. Run development server

```bash
npm run dev
```

4. Open the app

```text
http://localhost:5173
```

---

## Scripts

```bash
npm run dev        # start local dev server
npm run build      # production build
npm run preview    # preview built output
npm run test       # run Vitest once
npm run test:watch # run Vitest in watch mode
npm run lint       # run ESLint
```

---

## Environment variables

Use `.env.example` as the source of truth.

### Required (feature-dependent)
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_TRANSLATE_KEY`
- `GOOGLE_TTS_KEY`

### App URL
- `VITE_PUBLIC_URL` (default: `http://localhost:5173`)

### Optional OSM/provider overrides
- `OVERPASS_URL`
- `PHOTON_URL`
- `OSM_USER_AGENT`
- `VITE_MAP_STYLE_URL`
- `VITE_MAP_STYLE_URL_DARK`

> Mapping no longer requires a browser Google Maps key.

---

## API routes

- `POST /api/places` → nearby healthcare discovery
- `POST /api/geocode` → forward/reverse geocoding
- `POST /api/autocomplete` → address suggestions
- `POST /api/chat` → assistant chat
- `POST /api/translate` → translation
- `POST /api/speech` → TTS/speech output

---

## Deployment (Vercel)

This project is configured as a Vite app with SPA rewrites via `vercel.json`.

Recommended deploy checklist:
- configure all required secrets in Vercel project settings
- keep OSM provider env values explicit for production traffic
- ensure `OSM_USER_AGENT` identifies your app and contact URL

---

## Geolocation notes

`Find Me` relies on browser geolocation permissions.

If users report location failures:
- verify site location permission is **Allow**
- verify device-level location services are enabled
- use HTTPS or localhost
- avoid restricted in-app browsers when possible

The app now falls back to raw coordinates when reverse geocoding is temporarily unavailable.

---

## Open data caveats

OpenStreetMap-derived place data may have:
- missing ratings/reviews/photos/price levels
- inconsistent `opening_hours` quality
- variable provider availability on public endpoints

For reliable production scale, use provider infrastructure you control or have explicit quota/permission for.
