# Avela

> Find care fast, stay well longer.
>
> Avela is a location-aware healthcare companion that helps people discover nearby medical and wellness resources, keeps an encrypted digital health passport, and offers an AI health assistant for everyday questions.

---

## Features

- **Healthcare map & results** — Google Places search across curated categories (Pharmacy, ER, Dentist, Clinic, Optician, Gym, Outdoor spaces, Community centers, Therapists, Healthy eating) with a Bayesian ranking model that balances rating, distance, price, insurance likelihood, and "open now" status.
- **Two well-being modes** — *Get Well* (medical) and *Stay Well* (wellness), each with its own curated category set.
- **Smart sort** — Nearest, cheapest, highest rating, most reviewed, and "likely accepts insurance" (heuristic).
- **Health Profile** — a digital passport with critical medical info (blood type, allergies, conditions, medications, procedures, emergency contact, insurance). Backed by Supabase, exportable as a signed PDF, and shareable via a QR code that links to a read-only overview.
- **AvelaAI chatbot** — Gemini-powered assistant for symptom triage, medication Qs, nutrition, mental-health support, fitness, sleep, and preventive-care guidance, with translation + speech helpers.
- **Authentication** — Clerk handles sign-in, sessions, and user identity.
- **Responsive, branded UI** — custom Avela logo (heart-in-circle), Plus Jakarta Sans wordmark, teal palette, and unified result cards with category-accented headers.

## Tech stack

- **Frontend:** React 19 + Vite 8, React Router 7
- **Auth:** Clerk (`@clerk/clerk-react`)
- **Database:** Supabase (`@supabase/supabase-js`) for health profiles
- **Maps & places:** Google Maps JavaScript API + Places Service
- **AI:** Google Gemini (`gemini-2.5-flash`) for chat, translate, and speech
- **PDF export:** jsPDF
- **QR codes:** `qrcode.react`
- **Hosting:** Vercel (Vite preset, SPA rewrites)

## Project structure

```
react-app/
├── .gitignore
├── README.md                 ← you are here
└── hackathon v.1/            ← the actual Vite app (Vercel "Root Directory")
    ├── index.html
    ├── package.json
    ├── vercel.json           ← SPA rewrites + build config
    ├── public/
    │   ├── avela-logo.png
    │   ├── avela-ai-logo.png
    │   └── favicon.svg
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── Supabase.jsx      ← Supabase client
        ├── Components/
        │   ├── AvelaLogo.jsx     ← logo + wordmark + lockup
        │   ├── AuthHeader.jsx    ← top-nav on every page
        │   ├── Healthchatbot.jsx ← AvelaAI chat widget
        │   └── PlaceDetailModal.jsx
        └── Pages/
            ├── Landing.jsx
            ├── Results.jsx          ← search + map + ranked results
            ├── HealthProfile.jsx    ← profile editor + PDF export
            └── HealthProfileOverview.jsx  ← read-only shareable view
```

## Getting started

### Prerequisites

- Node.js **20+**
- npm (bundled with Node)

### 1. Clone & install

```bash
git clone https://github.com/Evan0x/MED.git
cd "MED/hackathon v.1"
npm install
```

### 2. Configure environment variables

Create `hackathon v.1/.env` with the following (keys are required — the app throws on startup without the Clerk key):

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_GOOGLE_MAPS_API_KEY=AIza...
VITE_GEMINI_KEY=AIza...
VITE_GEMINI_TRANSLATE_KEY=AIza...
VITE_GEMINI_SPEECH_KEY=AIza...
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Where to get each:

| Key | Source |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | [Clerk dashboard](https://dashboard.clerk.com/) → your app → API Keys |
| `VITE_GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) — enable Maps JavaScript API and Places API |
| `VITE_GEMINI_*` | [Google AI Studio](https://aistudio.google.com/) → Get API key |
| `VITE_SUPABASE_*` | [Supabase dashboard](https://supabase.com/dashboard) → Project Settings → API |

### 3. Run

```bash
npm run dev      # start dev server on http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the production build locally
npm run lint     # ESLint
```

## Supabase schema

The health profile feature expects a `health_profiles` table keyed on `user_id` (Clerk user id). Minimal columns used by the app:

```sql
create table public.health_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      text unique not null,
  first_name   text,
  last_name    text,
  blood_type   text,
  allergies    text,
  conditions   text,
  past_procedures   text,
  medications  text,
  emergency_name    text,
  emergency_phone   text,
  emergency_email   text,
  insurance_provider text,
  insurance_policy   text,
  updated_at   timestamptz default now()
);
```

Enable RLS and add a policy that lets a user read/write only rows where `user_id` equals their Clerk id (passed via a JWT claim or a service call).

## Deployment (Vercel)

The repo is set up so you can import it directly on [vercel.com/new](https://vercel.com/new):

1. **Import** `Evan0x/MED` from GitHub.
2. **Root Directory:** set to `hackathon v.1`.
3. **Framework Preset:** Vite (auto-detected).
4. **Environment Variables:** add every `VITE_*` key from the [Getting started](#2-configure-environment-variables) section to Production, Preview, and Development.
5. Click **Deploy**. `hackathon v.1/vercel.json` handles the SPA rewrites so React Router routes like `/profile` and `/results` work on refresh.

After the first deploy, add your Vercel URL to the allowed origins of:

- **Clerk** → app → Domains
- **Supabase** → Auth → URL configuration
- **Google Cloud** → your Maps/Places API key → HTTP referrer restrictions

## Architecture notes

### Results ranking (`src/Pages/Results.jsx`)

Each Google Places result is scored with a Bayesian-adjusted rating and combined with distance, open-now, and price signals:

```
score = 0.50 · ratingScore + 0.30 · distanceScore + 0.12 · openBonus + 0.08 · priceScore
```

The top result is surfaced as *Best Overall*; a second card is chosen per the user's selected sort (nearest, cheapest, highest rating, most reviewed, or insurance-friendly).

### Category groups

Header + the two result cards for each category are rendered inside a single grouped card with a section-colored left accent bar, so the three elements read as one unit instead of three disconnected cards. Missing or broken place photos fall back to a category-specific emoji (💊, 🚑, 🦷, 🩺, 👓, 🏋️, 🌳, 🏛️, 🧠, 🥗), with 🏥 as the universal default.

### AvelaAI (`src/Components/Healthchatbot.jsx`)

A floating teal chat button opens a Gemini-backed assistant with skill chips (symptoms, meds, nutrition, mental, fitness, sleep), quick-reply suggestions, markdown rendering, typing indicators, and a persistent 911 disclaimer. The system prompt enforces empathetic, non-prescriptive guidance and redirects emergencies to emergency services.

## License

Private / unreleased. All rights reserved.
