# Demo Seed Guide

This document describes how to populate Outfittr with demo data for presentations, screenshots, or quick testing. It includes a recommended manual workflow and a proposed seed script plan.

---

## Quick Manual Demo Workflow

If you want to test the full feature set in under 10 minutes:

### 1. Register

Go to `/auth` and create an account (e.g., `demo@outfittr.com` / `demodemo1`).

### 2. Set up Style Profile

Go to `/profile/style` and complete the 5-step wizard:

- Body type: **Athletic**
- Height: **Average**
- Skin undertone: **Warm**
- Style vibe: **Minimalist**
- Fit preference: **Regular**
- Favorite colors: **black**, **navy**, **olive**, **cream**
- Avoid colors: **orange**, **yellow**

### 3. Add wardrobe items (8–12 items minimum)

Go to `/wardrobe` and add items across categories. For a good demo, include at least:

| Name | Category | Colors | Formality | Seasons |
| --- | --- | --- | --- | --- |
| White Oxford Shirt | tops | white | smart_casual | spring, fall |
| Navy Crew Tee | tops | navy | casual | summer, spring |
| Black Slim Chinos | bottoms | black | smart_casual | spring, fall, winter |
| Khaki Shorts | bottoms | khaki, beige | casual | summer |
| White Sneakers | shoes | white | casual | spring, summer |
| Brown Leather Loafers | shoes | brown | smart_casual | spring, fall |
| Olive Field Jacket | outerwear | olive | casual | fall, winter |
| Navy Rain Jacket | outerwear | navy | casual | spring, fall |
| Black Dress | dresses | black | formal | fall, winter |
| Silver Watch | accessories | silver | smart_casual | spring, summer, fall, winter |
| Denim Jacket | outerwear | blue | casual | spring, fall |
| Grey Wool Sweater | tops | grey | smart_casual | fall, winter |

### 4. Create a trip

Go to `/trips` and create:

- Name: **Weekend in Paris**
- Location: **Paris, France**
- Start date: (within the next 7 days for weather data)
- End date: (2–3 days after start)
- Activities: **sightseeing**, **dining**, **nightlife**, **museums**

### 5. Generate outfits

Go to the trip detail page and:

1. Click **Refresh Weather** (wait for weather to populate).
2. Click **Generate Outfits**.
3. You should see day outfits and night outfits for each day, with confidence scores and "why this works" notes.

### 6. Give feedback

- 👍 Like a couple of outfits, selecting reasons like "Good fit" and "My vibe".
- 👎 Dislike one outfit, selecting "Too bright" or "Too formal".
- Swap one item (e.g., swap loafers for sneakers on a day outfit).

### 7. Check personalization

Go to `/dashboard`. The Personalization widget should show your feedback stats and learned preferences.

### 8. Regenerate outfits

Go back to the trip and click **Regenerate Outfits**. The new outfits should reflect your feedback — for example, fewer bright colors if you disliked them, or more casual shoes if you swapped to sneakers.

---

## Proposed Seed Script: `npm run seed:demo`

A seed script would automate steps 1–6 above for faster demos and testing. Below is the plan for implementing it.

### What it would create

| Entity | Count | Details |
| --- | --- | --- |
| Demo user | 1 | `demo@outfittr.com` / `demodemo1` |
| Style profile | 1 | Athletic, warm, minimalist, regular fit |
| Wardrobe items | 12 | Mixed categories, colors, formalities, and seasons |
| Trip | 1 | "Weekend in Paris", 3 days, starting tomorrow |
| Trip days | 3 | Auto-created by the trip controller |
| Weather | 3 | Auto-fetched from Open-Meteo (if dates in forecast range) |
| Generated outfits | 6 | ~2 per day (day + night, since activities include nightlife) |
| Feedback | 3 | 2 likes, 1 dislike with reason chips |
| Preference weights | 1 | Updated from the feedback signals |

### Implementation plan

1. **Create the script file**: `apps/api/prisma/seed.ts`

2. **Add to `apps/api/package.json`**:

   ```json
   {
     "prisma": {
       "seed": "tsx prisma/seed.ts"
     },
     "scripts": {
       "seed:demo": "npx prisma db seed"
     }
   }
   ```

3. **Script structure** (pseudocode):

   ```ts
   import { PrismaClient } from '@prisma/client';
   import bcrypt from 'bcryptjs';

   const prisma = new PrismaClient();

   async function main() {
     // 1. Create or find demo user
     const passwordHash = await bcrypt.hash('demodemo1', 12);
     const user = await prisma.user.upsert({
       where: { email: 'demo@outfittr.com' },
       update: {},
       create: { email: 'demo@outfittr.com', name: 'Demo User', passwordHash },
     });

     // 2. Upsert style profile
     await prisma.styleProfile.upsert({
       where: { userId: user.id },
       update: {},
       create: {
         userId: user.id,
         bodyType: 'athletic',
         heightRange: 'average',
         skinUndertone: 'warm',
         styleVibe: 'minimalist',
         fitPreference: 'regular',
         favoriteColors: ['black', 'navy', 'olive', 'cream'],
         avoidColors: ['orange', 'yellow'],
       },
     });

     // 3. Create wardrobe items (12 items)
     const items = [
       { category: 'tops', name: 'White Oxford Shirt', colors: ['white'], formality: 'smart_casual', seasonTags: ['spring', 'fall'] },
       { category: 'tops', name: 'Navy Crew Tee', colors: ['navy'], formality: 'casual', seasonTags: ['summer', 'spring'] },
       // ... (10 more items as listed in the manual workflow)
     ];
     for (const item of items) {
       await prisma.wardrobeItem.create({
         data: { ...item, userId: user.id },
       });
     }

     // 4. Create trip (starting tomorrow, 3 days)
     const start = new Date();
     start.setDate(start.getDate() + 1);
     const end = new Date(start);
     end.setDate(end.getDate() + 2);

     const trip = await prisma.trip.create({
       data: {
         userId: user.id,
         name: 'Weekend in Paris',
         location: 'Paris, France',
         startDate: start,
         endDate: end,
         activities: ['sightseeing', 'dining', 'nightlife', 'museums'],
         days: {
           create: [
             { date: new Date(start) },
             { date: new Date(start.getTime() + 86400000) },
             { date: new Date(start.getTime() + 172800000) },
           ],
         },
       },
     });

     // 5. Call the outfit engine to generate outfits
     //    Import and call generateOutfitsForTrip(trip.id, user.id)

     // 6. Submit sample feedback
     //    Create OutfitFeedback records and call updateUserWeightsFromSignals

     console.log('✓ Demo data seeded');
     console.log('  Login: demo@outfittr.com / demodemo1');
   }

   main()
     .catch(console.error)
     .finally(() => prisma.$disconnect());
   ```

4. **Run it**:

   ```bash
   cd apps/api
   npm run seed:demo
   ```

### Why this is useful

- **Presentations**: Start with a fully populated account instead of manually clicking through forms.
- **Screenshots**: Consistent data for README screenshots and demo videos.
- **Testing**: Quickly get to a state where outfit generation, feedback, and personalization can be tested.
- **CI/E2E tests**: A seed script provides a known baseline for automated testing.

### Idempotency

The script should use `upsert` for the user and style profile, and check for existing wardrobe items before creating duplicates. Running it multiple times should be safe.

---

## Resetting Demo Data

To wipe all data and start fresh:

```bash
cd apps/api
npx prisma migrate reset --force
npm run seed:demo  # (once implemented)
```

This drops all tables, re-runs all migrations, and re-seeds.
