# Outfittr

**Pack smarter. Travel lighter.** A full-stack travel wardrobe planner that generates personalized daily outfits based on weather, activities, and your style — then learns from your feedback to get better over time.

Built as a production-grade TypeScript monorepo with a Next.js frontend, Express API, Prisma ORM, and a deterministic rules-based outfit engine. No paid AI keys required — all personalization is explainable and runs on structured signals.

---

## Features

- **Wardrobe management** — Full CRUD with Cloudinary image uploads (drag-and-drop, unsigned preset). Each item tracks category, colors, season tags, and formality level.
- **Trip planning with weather** — Create trips with location, dates, and activity tags. Daily forecasts (temp, precipitation, conditions) are fetched automatically from Open-Meteo and can be refreshed on demand.
- **Style Profile wizard** — Multi-step onboarding at `/profile/style` captures body type, height, skin undertone, style vibe, fit preference, and favorite/avoid colors.
- **Outfit generation** — A deterministic rules-based engine scores every wardrobe item against weather, activity formality, color harmony, body type fit rules, and learned preferences, then composes complete outfits with confidence scores and explainable notes.
- **Outfit swapping + packing list** — Swap individual items in any outfit (filtered by category). A deduplicated packing list aggregates all items across every outfit.
- **Feedback learning loop** — Like/dislike outfits with reason chips (e.g., "Too bright", "Good fit"). Swap events are recorded. Preference weights update automatically and flow into future outfit generation. Dashboard shows personalization status in real time.

---

## How the Outfit Engine Works

The engine in `apps/api/src/lib/outfitEngine.ts` is fully deterministic — no LLM calls, no randomness, no paid APIs.

### Inputs

| Source | Data |
| --- | --- |
| **Wardrobe items** | Category (tops/bottoms/shoes/outerwear/etc.), colors, season tags, formality (casual → formal) |
| **Trip day weather** | High/low temp °C, precipitation mm, WMO weather code, condition label |
| **Trip activities** | Determines occasions: always "day"; "night" added if activities include nightlife, dinner, bar, etc. |
| **Style Profile** | Body type, height range, skin undertone, style vibe, fit preference, favorite/avoid colors |
| **Learned weights** | 10 preference knobs from the feedback learning loop (see below) |

### Scoring signals

Every wardrobe item is scored (baseline 50) with additive/subtractive modifiers:

- **Formality match** — Items matching the target formality for the occasion get +15; adjacent get +5; distant levels are penalized.
- **Weather suitability** — Outerwear boosted in rain/cold, penalized in heat. Summer-tagged items boosted when hot.
- **Color harmony** — Neutrals (black, white, navy, beige, grey) get a safe bonus. Bright colors are boosted or penalized based on learned `preferBrightAccents` / `avoidBrightColors` weights.
- **Skin undertone affinity** — Warm-toned colors (olive, rust, cream) score higher for warm undertones; cool-toned (emerald, navy, lavender) for cool.
- **Body type + fit rules** — Broad builds prefer relaxed tops; athletic builds prefer tapered bottoms; curvy builds get a structured-layer bonus; petite/short heights avoid long outerwear.
- **Favorite/avoid colors** — Direct boosts (+10) and penalties (-20) from the Style Profile.
- **Recency penalty** — Items worn in the last 1–2 days are penalized to encourage variety across trip days.
- **Learned preference weights** — All 10 weights from the learning engine apply as continuous score modifiers (see personalization section).

### Output

The engine composes each outfit as **top + bottom + shoes** (or **dress + shoes**), plus optional outerwear (if rain/cold or user prefers layers) and accessory (threshold adjusted by learned `preferAccessories` weight). Each outfit includes a confidence score (0–100) and multi-line notes explaining why items were selected, plus a `🧠 Personalized` line when learned signals are active.

---

## How Personalization Learns

The learning loop is deterministic, explainable, and uses zero external AI services.

### Signal collection

- **Feedback** — Users 👍 like or 👎 dislike each outfit. Reason chips provide structured signal: dislike reasons include "Too bright", "Too formal", "Too tight", "Not my vibe", "Doesn't match", "Not weather-appropriate"; like reasons include "Love the colors", "Good fit", "My vibe", "Versatile".
- **Swaps** — Every item swap is recorded with the from/to wardrobe item IDs, category, and formality context.

### Weight computation

The learning engine (`apps/api/src/lib/learningEngine.ts`) processes the last 50 feedback events and 30 swap events to update 10 preference weights, each clamped to [-1, 1]:

| Weight | What it controls |
| --- | --- |
| `preferNeutralColors` | Boost neutrals vs bold tones |
| `preferBrightAccents` | Boost pops of color |
| `avoidBrightColors` | Penalize bright items |
| `preferCasualShoes` | Sneakers vs dress shoes |
| `preferSmartCasualNight` | Dress up vs keep casual at night |
| `preferRelaxedFit` | Relaxed/oversized vs slim |
| `avoidTightTops` | Penalize fitted/athletic tops |
| `preferOuterwearLayers` | Layer even in mild weather |
| `preferAccessories` | Lower the threshold to include accessories |
| `preferDressesOverSeparates` | Prefer dresses over top+bottom |

### Examples

| Signal | Weight effect |
| --- | --- |
| Dislike with **"Too bright"** | `avoidBrightColors` +0.15, `preferNeutralColors` +0.10 |
| Dislike with **"Too tight"** | `avoidTightTops` +0.15, `preferRelaxedFit` +0.10 |
| Swap **loafers → sneakers** | `preferCasualShoes` +0.12 |
| Swap **casual → smart casual** formality | `preferSmartCasualNight` +0.08 |

### Stability

All weights decay 5% per update cycle to prevent runaway drift, and are hard-clamped to [-1, 1] after every computation. Updates run in the background after each feedback submission and swap event.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Zod validation |
| Database | PostgreSQL — Docker (local), Neon (production) |
| ORM | Prisma with ordered SQL migrations |
| Auth | JWT with bcrypt password hashing |
| Weather | Open-Meteo — free, no API key |
| Images | Cloudinary — free tier, unsigned browser uploads |
| Testing | Vitest |
| Tooling | ESLint, Prettier, npm workspaces |

---

## Architecture

```mermaid
graph TB
    subgraph Client["Frontend — Vercel"]
        WEB["Next.js App Router<br/>(apps/web)"]
        UPLOAD["Cloudinary<br/>Unsigned Upload"]
    end

    subgraph Server["API — Render"]
        API["Express + TypeScript<br/>(apps/api)"]
        AUTH["JWT Auth"]
        ENGINE["Outfit Engine<br/>(rules-based scoring)"]
        LEARN["Learning Engine<br/>(preference weights)"]
        WEATHER["Weather Service<br/>(TTL cache)"]
    end

    subgraph External
        METEO["Open-Meteo<br/>(free, no key)"]
        CDN["Cloudinary CDN"]
    end

    subgraph Data
        PRISMA["Prisma ORM"]
        PG["PostgreSQL<br/>(Neon)"]
    end

    WEB -->|"REST + JWT"| API
    WEB -->|"direct upload"| CDN
    API --> AUTH
    API --> ENGINE
    ENGINE --> LEARN
    API --> WEATHER --> METEO
    API --> PRISMA --> PG

    style WEB fill:#0a0a0a,stroke:#333,color:#fff
    style API fill:#0a0a0a,stroke:#333,color:#fff
    style ENGINE fill:#1a1a1a,stroke:#555,color:#fff
    style LEARN fill:#1a1a1a,stroke:#555,color:#fff
    style PG fill:#336791,stroke:#333,color:#fff
    style METEO fill:#ff9500,stroke:#333,color:#fff
    style CDN fill:#3448c5,stroke:#333,color:#fff
```

---

## Project Structure

```
outfittr/
├── apps/
│   ├── api/                         # Express API
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # 11 models
│   │   │   └── migrations/          # Ordered SQL migrations
│   │   └── src/
│   │       ├── controllers/         # auth, wardrobe, trips, outfits, profile
│   │       ├── middleware/           # JWT auth, Zod validation
│   │       ├── routes/              # Express routers
│   │       ├── validators/          # Zod schemas + tests
│   │       └── lib/
│   │           ├── outfitEngine.ts   # Deterministic outfit scoring
│   │           ├── learningEngine.ts # Preference weight computation
│   │           ├── weather.ts        # Open-Meteo client + TTL cache
│   │           ├── prisma.ts         # Prisma singleton
│   │           └── jwt.ts            # Token sign/verify
│   └── web/                         # Next.js frontend
│       └── src/
│           ├── app/                  # App Router pages
│           │   ├── auth/             # Login / register
│           │   ├── dashboard/        # Overview + personalization widget
│           │   ├── wardrobe/         # CRUD with image uploads
│           │   ├── trips/            # List + create
│           │   ├── trips/[id]/       # Detail, outfits, feedback, packing list
│           │   └── profile/style/    # Style Profile wizard
│           ├── components/
│           │   ├── ui/               # Input, Modal, Badge, ImageUpload, ItemThumbnail
│           │   ├── layout/           # Navbar, AppShell
│           │   ├── wardrobe/         # Item form
│           │   └── trips/            # Trip form
│           └── lib/
│               ├── api.ts            # Typed API client (all endpoints)
│               ├── auth.tsx          # Auth context + useAuth hook
│               └── utils.ts          # Formatters, weather code maps
├── packages/
│   └── shared/                      # TypeScript types shared across apps
├── docker-compose.yml               # Local Postgres
├── package.json                     # npm workspaces root
└── tsconfig.base.json
```

---

## Local Development

### Prerequisites

- Node.js ≥ 18, npm ≥ 9
- Docker & Docker Compose

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/outfittr.git
cd outfittr
npm install

# Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start Postgres
docker-compose up -d

# Run all migrations
cd apps/api
npx prisma migrate dev --name init
cd ../..

# Start both servers
npm run dev -w apps/api   # Terminal 1 → http://localhost:4000
npm run dev -w apps/web   # Terminal 2 → http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000), register an account, and start adding wardrobe items.

---

## Environment Variables

### `apps/api/.env`

| Variable | Local | Production | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | `postgresql://outfittr:outfittr_local@localhost:5432/outfittr?schema=public` | Neon connection string | Pooled connection recommended for prod |
| `JWT_SECRET` | Any dev string | Random 64+ char string | **Must be strong in production** |
| `JWT_EXPIRES_IN` | `7d` | `7d` | Token expiry duration |
| `PORT` | `4000` | `4000` | Render auto-assigns via `PORT` |
| `CORS_ORIGIN` | `http://localhost:3000` | `https://your-app.vercel.app` | Must match Vercel domain exactly — **no trailing slash** |
| `NODE_ENV` | `development` | `production` | |

### `apps/web/.env`

| Variable | Local | Production | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | `https://your-api.onrender.com/api` | **Must include `/api`** or endpoints will 404 |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your cloud name | Same | From Cloudinary Dashboard |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Your preset name | Same | Unsigned preset; allowed formats: `jpg,jpeg,png,webp` |

---

## Deployment

For detailed step-by-step deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

### Database → Neon

Create a free project at [neon.tech](https://neon.tech) and copy the pooled connection string into `DATABASE_URL`.

### API → Render

| Setting | Value |
| --- | --- |
| Root Directory | `apps/api` |
| Build Command | `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` |
| Start Command | `npm run start` |
| Health Check | `GET /api/health` → `{ "status": "ok" }` |

Set all `apps/api/.env` variables in the Render dashboard.

### Frontend → Vercel

| Setting | Value |
| --- | --- |
| Root Directory | `apps/web` |
| Framework | Next.js (auto-detected) |

Set all three `NEXT_PUBLIC_*` environment variables in the Vercel dashboard.

### Cloudinary

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Settings → Upload → Upload Presets → Add an **unsigned** preset.
3. Set folder to `outfittr`, allowed formats to `jpg,jpeg,png,webp`, max file size to 5 MB.
4. Copy cloud name and preset name into the web env vars.

---

## API Endpoints

Base URL: `/api`

### Auth
| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Sign in, returns JWT |
| GET | `/auth/me` | Yes | Get current user |

### Wardrobe
| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/wardrobe` | Yes | List all items |
| POST | `/wardrobe` | Yes | Create item |
| PUT | `/wardrobe/:id` | Yes | Update item |
| DELETE | `/wardrobe/:id` | Yes | Delete item |

### Trips
| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/trips` | Yes | List all trips |
| POST | `/trips` | Yes | Create trip (auto-fetches weather) |
| GET | `/trips/:id` | Yes | Trip detail with days + outfits |
| DELETE | `/trips/:id` | Yes | Delete trip |
| POST | `/trips/:id/refresh-weather` | Yes | Re-fetch weather for all days |
| POST | `/trips/:id/generate-outfits` | Yes | Generate day + night outfits |

### Style Profile
| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/profile/style` | Yes | Get style profile |
| PUT | `/profile/style` | Yes | Upsert style profile |

### Outfits + Feedback
| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/outfits/:id/swap-item` | Yes | Swap one item in an outfit |
| POST | `/outfits/:id/feedback` | Yes | Submit like/dislike + reason chips |
| GET | `/outfits/:id/feedback` | Yes | Get existing feedback |
| GET | `/outfits/personalization/summary` | Yes | Learning stats + active preference weights |

---

## Troubleshooting

**CORS errors in production** — `CORS_ORIGIN` in the API env must match your Vercel domain exactly, including the protocol. No trailing slash. Correct: `https://outfittr.vercel.app`. Wrong: `https://outfittr.vercel.app/`.

**Auth endpoints returning 404** — `NEXT_PUBLIC_API_URL` must include `/api` at the end. The API mounts all routes under `/api/*`. Correct: `https://your-api.onrender.com/api`. Wrong: `https://your-api.onrender.com`.

**Slow first request in production** — Render's free tier spins down after inactivity. The first request after sleep triggers a cold start (30–60 seconds). Point an external uptime monitor at `/api/health` to keep the service warm.

**Prisma migration ordering** — Migration directories must sort lexicographically after the init migration. The repo uses timestamp prefixes (`20240601000000_`, `20240602000000_`, `20240603000000_`) to ensure correct ordering. Continue the sequence when adding new migrations.

**Cloudinary uploads failing** — Verify the upload preset is set to **unsigned** (not signed). Allowed formats in the Cloudinary preset must be comma-separated: `jpg,jpeg,png,webp`. The cloud name is on the Cloudinary Dashboard homepage, not in settings.

**Weather data not populating** — Open-Meteo only provides forecasts ~16 days out. For trips further in the future, weather will remain blank until the dates enter the forecast window. Click "Refresh Weather" to re-fetch when dates are in range.

---

## Screenshots

> Screenshots coming soon. The app features a dark minimal UI inspired by Linear and Vercel:
>
> - **Landing page** — Marketing hero with feature grid
> - **Dashboard** — Wardrobe stats, upcoming trips, personalization widget, style profile CTA
> - **Wardrobe** — Card grid with thumbnails, category filters, create/edit modals with drag-drop upload
> - **Trip detail** — Weather summary bar, day-by-day outfit cards with confidence scores, 👍/👎 feedback with reason chips, swap modal, packing list
> - **Style Profile** — 5-step wizard with progress bar (body → skin → style → favorite colors → avoid colors)

---

## Roadmap

- [ ] AI-powered outfit suggestions using local/open models
- [ ] Social sharing — export packing lists or trip outfits
- [ ] Wardrobe item recognition from photos
- [ ] Multi-user trips (travel group coordination)
- [ ] Outfit calendar view with drag-and-drop reordering
- [ ] Mobile app (React Native)
- [ ] PDF packing list export

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev -w apps/api` | Start API dev server |
| `npm run dev -w apps/web` | Start Next.js dev server |
| `npm run build -w apps/api` | Build API |
| `npm run build -w apps/web` | Build frontend |
| `npm run lint -w apps/api` | Lint API |
| `npm run typecheck -w apps/api` | Type-check API |
| `npm run test -w apps/api` | Run API tests |

---

## License

MIT

## Credits

- [Open-Meteo](https://open-meteo.com) — Free weather API, no key required for non-commercial use
- [Cloudinary](https://cloudinary.com) — Image hosting and transformation
- [Neon](https://neon.tech) — Serverless Postgres
- [Prisma](https://prisma.io) — TypeScript ORM
- [Tailwind CSS](https://tailwindcss.com) — Utility-first CSS
- [Zod](https://zod.dev) — Runtime schema validation
