# Deployment Guide

Step-by-step instructions to deploy Outfittr to production using Neon (database), Render (API), and Vercel (frontend). All services have free tiers sufficient for personal/demo use.

---

## Prerequisites

- A GitHub account with the Outfittr repo pushed
- The app running locally (to verify everything works before deploying)

---

## Step 1: Database — Neon Postgres

Neon provides serverless Postgres with a generous free tier.

1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Click **New Project** and name it `outfittr`.
3. Select the region closest to your Render deployment (e.g., US East).
4. Once created, go to the **Dashboard** and find the **Connection string**.
5. Copy the **pooled** connection string. It looks like:

   ```
   postgresql://neondb_owner:aBcDeFgH@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

6. Save this — you'll paste it as `DATABASE_URL` in Render.

> **Tip**: Use the pooled connection string (the one without `-pooler` removed) for better performance with Prisma in serverless/containerized environments.

---

## Step 2: API — Render

Render hosts the Express API and runs Prisma migrations on each deploy.

### Create the service

1. Go to [render.com](https://render.com) and sign in.
2. Click **New → Web Service**.
3. Connect your GitHub repo (`outfittr`).
4. Configure the service:

| Setting | Value |
| --- | --- |
| **Name** | `outfittr-api` (or any name) |
| **Root Directory** | `apps/api` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` |
| **Start Command** | `npm run start` |
| **Instance Type** | Free |

### Set environment variables

In the Render dashboard, go to **Environment** and add:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Your Neon pooled connection string |
| `JWT_SECRET` | A random 64+ character string (generate with `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://your-app.vercel.app` (set this after Vercel deploy — see Step 3) |

> **Important**: Leave `PORT` unset. Render provides it automatically via the `PORT` environment variable.

### Deploy and verify

1. Click **Create Web Service**. Render will clone, build, migrate, and start the API.
2. Wait for the deploy to complete (2–5 minutes).
3. Open: `https://your-render-service.onrender.com/api/health`
4. You should see:

   ```json
   { "status": "ok", "timestamp": "2025-..." }
   ```

If you see this, the API is live and connected to the database.

> **Note**: Render's free tier spins down after 15 minutes of inactivity. The first request after sleep takes 30–60 seconds (cold start). You can use an external uptime monitor (e.g., UptimeRobot) pointing at `/api/health` to keep it warm.

---

## Step 3: Frontend — Vercel

Vercel hosts the Next.js frontend.

### Create the project

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New → Project** and import your GitHub repo.
3. Configure:

| Setting | Value |
| --- | --- |
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js (auto-detected) |

### Set environment variables

Add these in the Vercel project settings under **Environment Variables**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://your-render-service.onrender.com/api` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Your Cloudinary unsigned preset name |

> **Critical**: `NEXT_PUBLIC_API_URL` **must include `/api`** at the end. The Express server mounts all routes under `/api/*`. If you omit it, auth endpoints will return 404.

### Deploy

Click **Deploy**. Once complete, note your Vercel URL (e.g., `https://outfittr.vercel.app`).

### Update CORS on Render

Now go back to Render and set:

```
CORS_ORIGIN=https://outfittr.vercel.app
```

> **Critical**: The value must match your Vercel domain exactly, including the `https://` protocol. **No trailing slash.** `https://outfittr.vercel.app/` (with slash) will cause CORS failures.

After updating the env var, Render will automatically redeploy.

### Verify end-to-end

1. Open your Vercel URL.
2. Register a new account.
3. If registration works, the frontend → API → database chain is connected.

---

## Step 4: Cloudinary (Image Uploads)

Cloudinary handles wardrobe item image uploads from the browser. The free tier provides 25 monthly credits (sufficient for personal use).

### Create an unsigned upload preset

1. Sign up at [cloudinary.com](https://cloudinary.com) (free).
2. From the **Dashboard**, note your **Cloud name** (top-left).
3. Go to **Settings → Upload → Upload presets**.
4. Click **Add upload preset**.
5. Configure:

| Field | Value |
| --- | --- |
| **Signing Mode** | Unsigned |
| **Folder** | `outfittr` |
| **Allowed formats** | `jpg,jpeg,png,webp` |

> **Warning**: The "Allowed formats" field expects **comma-separated values** with no spaces around commas. Enter `jpg,jpeg,png,webp` exactly. Do **not** paste format values into the "Transformations" field — that's for image manipulation, not upload restrictions.

6. Under **Upload control**, set **Max file size** to `5000000` (5 MB in bytes) or `5 mb`.
7. Save the preset and note the **Preset name**.

### Add to Vercel

Set these environment variables in Vercel:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset-name
```

Redeploy the Vercel project after adding/changing env vars (Vercel → Deployments → Redeploy).

### Security note

Unsigned presets allow anyone with the preset name to upload files. Mitigate this by:

- Restricting allowed formats (`jpg,jpeg,png,webp`)
- Setting a max file size (5 MB)
- Restricting uploads to a specific folder (`outfittr`)
- Optionally enabling moderation in the Cloudinary console

Never use a **signed** upload preset in client-side code — it would expose your API secret.

---

## Step 5: Open-Meteo (Weather)

Open-Meteo provides free weather data with no API key required for non-commercial use.

There is **nothing to configure**. The API calls Open-Meteo directly:

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Forecast: `https://api.open-meteo.com/v1/forecast`

Both are cached in-memory (geocode: 1 hour, forecast: 15 minutes) to minimize external calls.

> **Note**: Forecasts cover ~16 days into the future. Trips beyond this window will have empty weather data until the dates come into range. Users can click "Refresh Weather" to re-fetch.

---

## Common Failure Modes

### Frontend shows "Network error" or CORS blocked

**Cause**: `CORS_ORIGIN` on Render doesn't match the Vercel domain exactly.

**Fix**: Ensure `CORS_ORIGIN` is set to `https://your-app.vercel.app` with no trailing slash and the correct protocol.

### Auth endpoints return 404

**Cause**: `NEXT_PUBLIC_API_URL` doesn't include `/api`.

**Fix**: Set it to `https://your-render-service.onrender.com/api` (not just the root URL).

### Render deploy fails at Prisma migrate

**Cause**: Migration files aren't in the expected order, or `DATABASE_URL` is wrong.

**Fix**:
- Verify `DATABASE_URL` is a valid Neon connection string with `?sslmode=require`.
- Ensure migration directories sort lexicographically (timestamps: `20240601...`, `20240602...`, `20240603...`).

### First request is very slow (30–60s)

**Cause**: Render free tier spins down after inactivity.

**Fix**: This is expected. Point an uptime monitor at `/api/health` to keep the service warm. Render's paid tier ($7/month) eliminates cold starts.

### Image upload fails with "Upload preset not found"

**Cause**: The preset name in `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` doesn't match what's in Cloudinary, or the preset is set to "signed" instead of "unsigned".

**Fix**: Double-check the preset name in Cloudinary → Settings → Upload → Upload presets. Ensure **Signing Mode** is "Unsigned".

### Vercel build fails with module not found

**Cause**: Vercel root directory isn't set to `apps/web`.

**Fix**: In Vercel project settings → General → Root Directory, set it to `apps/web`.

### Weather data is blank for a trip

**Cause**: Open-Meteo only forecasts ~16 days out.

**Fix**: Wait until trip dates enter the forecast window, then click "Refresh Weather". Alternatively, for demo purposes, create a trip starting within the next two weeks.

---

## Post-Deploy Checklist

- [ ] `/api/health` returns `{ "status": "ok" }` on Render
- [ ] Vercel site loads the landing page
- [ ] Registration + login works
- [ ] Creating a wardrobe item works
- [ ] Image upload works (Cloudinary)
- [ ] Creating a trip populates weather
- [ ] Generating outfits works
- [ ] Outfit feedback (👍/👎) works
- [ ] Dashboard shows personalization widget after giving feedback
