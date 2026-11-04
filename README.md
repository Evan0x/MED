# Avela

Find care fast, stay well longer.

Avela is a location-aware healthcare companion that helps users discover nearby medical and wellness resources, maintain a portable health profile, and access an in-app health assistant.

## Features

- Healthcare discovery map + list with category-based grouping
- Location search (forward geocoding), reverse geocoding, and address autocomplete
- Current-location flow (`Find Me`) with graceful coordinate fallback
- Health profile management with Supabase-backed persistence
- AI-powered assistant/chat features
- Responsive UI with dark mode support

## Tech stack

- Frontend: React + Vite + React Router
- Maps: MapLibre GL JS
- Geo data providers: OpenStreetMap ecosystem (Overpass + Photon + fallback handling)
- API backend: Vercel Serverless Functions in [hackathon-v1/api](hackathon-v1/api)
- Auth/Data: Clerk + Supabase

## Repository structure

This workspace contains two app folders:

- [hackathon-v1](hackathon-v1) — **active app** (use this for development and deployment)
- [hackathon v.1](hackathon%20v.1) — older legacy folder retained for history

For day-to-day work, use [hackathon-v1](hackathon-v1).

## Quick start

### Prerequisites

- Node.js 20+
- npm

### Local development

```bash
cd hackathon-v1
npm install
cp .env.example .env
npm run dev
```

Default local URL: http://localhost:5173

## Scripts (active app)

Run these inside [hackathon-v1](hackathon-v1):

```bash
npm run dev        # Vite dev server
npm run build      # production build
npm run preview    # preview built app
npm run test       # run Vitest once
npm run test:watch # run Vitest in watch mode
npm run lint       # ESLint
```

## Environment variables

Source of truth: [hackathon-v1/.env.example](hackathon-v1/.env.example)

Main keys:

- Clerk: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- AI/translation/speech: `GEMINI_API_KEY`, `GOOGLE_TRANSLATE_KEY`, `GOOGLE_TTS_KEY`
- Public app URL: `VITE_PUBLIC_URL`
- Optional map/provider overrides:
	- `OVERPASS_URL`
	- `PHOTON_URL`
	- `OSM_USER_AGENT`
	- `VITE_MAP_STYLE_URL`
	- `VITE_MAP_STYLE_URL_DARK`

## API routes

Server routes are in [hackathon-v1/api](hackathon-v1/api):

- `POST /api/places` — nearby healthcare discovery
- `POST /api/geocode` — forward/reverse geocoding
- `POST /api/autocomplete` — address suggestions
- `POST /api/chat` — assistant responses
- `POST /api/translate` — translation
- `POST /api/speech` — speech output

## Deployment (Vercel)

Deploy from [hackathon-v1](hackathon-v1):

1. Import the repository in Vercel.
2. Set Root Directory to `hackathon-v1`.
3. Add environment variables from [hackathon-v1/.env.example](hackathon-v1/.env.example).
4. Deploy.

The SPA rewrite configuration is defined in [hackathon-v1/vercel.json](hackathon-v1/vercel.json).

## Operational notes

- Geolocation requires browser permission and secure context (HTTPS/localhost).
- Public Overpass/Photon endpoints are shared infrastructure; for production scale, use controlled endpoints.
- The UI is built to tolerate provider failures and fallback where possible.

## Documentation

Detailed app-level documentation is in [hackathon-v1/README.md](hackathon-v1/README.md).
