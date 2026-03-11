import { prisma } from './prisma';
import type { StyleProfile, WardrobeItem, TripDay } from '@prisma/client';

// ── Types ────────────────────────────────────────────
interface ScoredItem {
  item: WardrobeItem;
  score: number;
  reasons: string[];
}

interface GeneratedOutfit {
  occasion: string;
  items: string[]; // wardrobeItem IDs
  confidence: number;
  notes: string;
}

type TripDayWithWeather = TripDay;

// ── Constants ────────────────────────────────────────
const NIGHT_ACTIVITIES = new Set([
  'nightlife', 'club', 'party', 'dinner', 'bar', 'concert', 'theater', 'date',
]);

const CASUAL_ACTIVITIES = new Set([
  'hiking', 'beach', 'gym', 'sports', 'sightseeing', 'photography', 'camping',
]);

const NEUTRALS = new Set([
  'black', 'white', 'grey', 'gray', 'navy', 'beige', 'cream', 'charcoal', 'tan', 'khaki', 'ivory',
]);

const WARM_COLORS = new Set([
  'olive', 'cream', 'tan', 'brown', 'rust', 'terracotta', 'gold', 'coral',
  'warm navy', 'peach', 'mustard', 'camel', 'khaki', 'burgundy',
]);

const COOL_COLORS = new Set([
  'charcoal', 'crisp white', 'white', 'cool blue', 'blue', 'navy', 'burgundy',
  'emerald', 'green', 'lavender', 'silver', 'ice blue', 'plum', 'mauve', 'teal',
]);

// ── Main entry point ─────────────────────────────────
export async function generateOutfitsForTrip(tripId: string, userId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
    include: { days: { orderBy: { date: 'asc' } } },
  });
  if (!trip) throw new Error('Trip not found');

  const wardrobe = await prisma.wardrobeItem.findMany({
    where: { userId },
  });
  if (wardrobe.length === 0) throw new Error('Wardrobe is empty — add items first');

  const profile = await prisma.styleProfile.findUnique({
    where: { userId },
  });

  // Determine which days need night outfits
  const hasNightActivities = trip.activities.some((a) =>
    NIGHT_ACTIVITIES.has(a.toLowerCase()),
  );

  // Delete existing outfits for this trip
  const dayIds = trip.days.map((d) => d.id);
  await prisma.outfit.deleteMany({
    where: { tripDayId: { in: dayIds } },
  });

  // Track which items are used on which day to encourage variety
  const recentlyUsed = new Map<string, number>(); // itemId -> last used day index

  for (let dayIdx = 0; dayIdx < trip.days.length; dayIdx++) {
    const day = trip.days[dayIdx];
    const occasions = determineOccasions(trip.activities, hasNightActivities);

    for (const occasion of occasions) {
      const outfit = buildOutfit(
        wardrobe,
        day,
        occasion,
        trip.activities,
        profile,
        recentlyUsed,
        dayIdx,
      );

      if (outfit) {
        const created = await prisma.outfit.create({
          data: {
            tripDayId: day.id,
            occasion: outfit.occasion,
            notes: outfit.notes,
            items: {
              create: outfit.items.map((wardrobeItemId) => ({ wardrobeItemId })),
            },
          },
        });

        // Track usage
        for (const itemId of outfit.items) {
          recentlyUsed.set(itemId, dayIdx);
        }
      }
    }
  }

  // Re-fetch the full trip
  return prisma.trip.findFirst({
    where: { id: tripId },
    include: {
      days: {
        orderBy: { date: 'asc' },
        include: {
          outfits: {
            include: { items: { include: { wardrobeItem: true } } },
          },
        },
      },
    },
  });
}

// ── Occasion selection ───────────────────────────────
function determineOccasions(activities: string[], hasNight: boolean): string[] {
  const occasions = ['day'];
  if (hasNight) occasions.push('night');
  return occasions;
}

// ── Core outfit builder ──────────────────────────────
function buildOutfit(
  wardrobe: WardrobeItem[],
  day: TripDayWithWeather,
  occasion: string,
  activities: string[],
  profile: StyleProfile | null,
  recentlyUsed: Map<string, number>,
  dayIdx: number,
): GeneratedOutfit | null {
  const isNight = occasion === 'night';
  const targetFormality = getTargetFormality(activities, isNight);
  const isRainy = (day.precipitationMm ?? 0) > 2 ||
    (day.weatherCondition?.toLowerCase().includes('rain') ?? false) ||
    (day.weatherCondition?.toLowerCase().includes('drizzle') ?? false);
  const isCold = (day.weatherLow ?? 15) < 12;
  const isHot = (day.weatherHigh ?? 20) > 28;

  // Score every item
  const scored = wardrobe.map((item) =>
    scoreItem(item, day, occasion, targetFormality, isRainy, isCold, isHot, profile, recentlyUsed, dayIdx),
  );

  // Select by category composition
  const top = pickBest(scored, ['tops', 'activewear']);
  const bottom = pickBest(scored, ['bottoms']);
  const shoes = pickBest(scored, ['shoes']);
  const dress = pickBest(scored, ['dresses', 'formal']);

  // Decide: dress OR top+bottom
  const useDress = dress && dress.score > ((top?.score ?? 0) + (bottom?.score ?? 0)) / 2 + 5;

  let coreItems: ScoredItem[];
  if (useDress && dress) {
    coreItems = [dress, shoes].filter(Boolean) as ScoredItem[];
  } else if (top && bottom && shoes) {
    coreItems = [top, bottom, shoes];
  } else {
    // Not enough items for a full outfit
    const available = [top, bottom, shoes, dress].filter(Boolean) as ScoredItem[];
    if (available.length < 2) return null;
    coreItems = available;
  }

  // Optional outerwear
  const usedIds = new Set(coreItems.map((s) => s.item.id));
  if (isRainy || isCold) {
    const outerwear = pickBest(scored, ['outerwear'], usedIds);
    if (outerwear) {
      // Height check: shorter users — skip very long outerwear
      let skipLong = false;
      if (profile?.heightRange === 'petite' || profile?.heightRange === 'short') {
        if (outerwear.item.name.toLowerCase().includes('long') ||
            outerwear.item.name.toLowerCase().includes('trench') ||
            outerwear.item.name.toLowerCase().includes('maxi')) {
          skipLong = true;
        }
      }
      if (!skipLong) coreItems.push(outerwear);
    }
  }

  // Optional accessory
  const usedIdsWithOuterwear = new Set(coreItems.map((s) => s.item.id));
  const accessory = pickBest(scored, ['accessories'], usedIdsWithOuterwear);
  if (accessory && accessory.score > 30) {
    coreItems.push(accessory);
  }

  // Calculate confidence
  const avgScore = coreItems.reduce((sum, s) => sum + s.score, 0) / coreItems.length;
  const confidence = Math.min(100, Math.max(10, Math.round(avgScore)));

  // Generate notes
  const notes = buildNotes(coreItems, day, occasion, activities, profile, confidence, isRainy);

  return {
    occasion,
    items: coreItems.map((s) => s.item.id),
    confidence,
    notes,
  };
}

// ── Scoring ──────────────────────────────────────────
function scoreItem(
  item: WardrobeItem,
  day: TripDayWithWeather,
  occasion: string,
  targetFormality: string,
  isRainy: boolean,
  isCold: boolean,
  isHot: boolean,
  profile: StyleProfile | null,
  recentlyUsed: Map<string, number>,
  dayIdx: number,
): ScoredItem {
  let score = 50; // baseline
  const reasons: string[] = [];

  // ── Formality match (±15) ──────────────────────────
  const formalityOrder = ['athletic', 'casual', 'smart_casual', 'business', 'formal'];
  const targetIdx = formalityOrder.indexOf(targetFormality);
  const itemIdx = formalityOrder.indexOf(item.formality);
  const formalityDist = Math.abs(targetIdx - itemIdx);
  if (formalityDist === 0) {
    score += 15;
    reasons.push('Formality matches activity');
  } else if (formalityDist === 1) {
    score += 5;
  } else {
    score -= formalityDist * 5;
  }

  // ── Weather ────────────────────────────────────────
  if (isRainy && item.category === 'outerwear') {
    score += 12;
    reasons.push('Outerwear for rain protection');
  }
  if (isCold && (item.category === 'outerwear' || item.seasonTags.includes('winter') || item.seasonTags.includes('fall'))) {
    score += 8;
    reasons.push('Good for cool weather');
  }
  if (isHot && (item.seasonTags.includes('summer') || item.seasonTags.includes('spring'))) {
    score += 8;
  }
  if (isHot && item.category === 'outerwear') {
    score -= 15;
  }

  // ── Color harmony ─────────────────────────────────
  const itemColors = item.colors.map((c) => c.toLowerCase());
  const neutralCount = itemColors.filter((c) => NEUTRALS.has(c)).length;
  if (neutralCount > 0) {
    score += 5; // neutrals are safe
  }

  // ── Profile-based scoring ──────────────────────────
  if (profile) {
    // Favorite colors boost
    for (const c of itemColors) {
      if (profile.favoriteColors.some((f) => c.includes(f.toLowerCase()) || f.toLowerCase().includes(c))) {
        score += 10;
        reasons.push(`Matches favorite color: ${c}`);
        break;
      }
    }

    // Avoid colors penalty
    for (const c of itemColors) {
      if (profile.avoidColors.some((a) => c.includes(a.toLowerCase()) || a.toLowerCase().includes(c))) {
        score -= 20;
        reasons.push(`Color to avoid: ${c}`);
        break;
      }
    }

    // Skin undertone color affinity
    for (const c of itemColors) {
      if (profile.skinUndertone === 'warm' && WARM_COLORS.has(c)) {
        score += 6;
        if (!reasons.some((r) => r.includes('undertone')))
          reasons.push('Warm tone complements your skin undertone');
      } else if (profile.skinUndertone === 'cool' && COOL_COLORS.has(c)) {
        score += 6;
        if (!reasons.some((r) => r.includes('undertone')))
          reasons.push('Cool tone complements your skin undertone');
      }
    }

    // Body type / fit rules
    if (profile.bodyType === 'broad') {
      if (item.category === 'tops' && item.formality === 'athletic') {
        score -= 5; // very tight tops
      }
      if (item.category === 'tops' && (profile.fitPreference === 'regular' || profile.fitPreference === 'relaxed')) {
        score += 5;
        reasons.push('Relaxed fit suits broad build');
      }
    }

    if (profile.bodyType === 'lean') {
      if (profile.fitPreference === 'slim') {
        score += 4;
      }
    }

    if (profile.bodyType === 'athletic') {
      if (item.category === 'bottoms' && item.name.toLowerCase().includes('taper')) {
        score += 5;
        reasons.push('Tapered fit suits athletic build');
      }
      if (item.category === 'bottoms' && item.name.toLowerCase().includes('skinny')) {
        score -= 5;
      }
    }

    if (profile.bodyType === 'curvy') {
      if (item.category === 'outerwear') {
        score += 4;
        reasons.push('Structured layers define silhouette');
      }
      if (profile.fitPreference === 'slim' && item.name.toLowerCase().includes('boxy')) {
        score -= 5;
      }
    }

    // Height rules
    if ((profile.heightRange === 'petite' || profile.heightRange === 'short') && item.category === 'outerwear') {
      if (item.name.toLowerCase().includes('long') || item.name.toLowerCase().includes('maxi')) {
        score -= 8;
      }
    }
  }

  // ── Variety penalty (recency) ──────────────────────
  const lastUsed = recentlyUsed.get(item.id);
  if (lastUsed !== undefined) {
    const daysSince = dayIdx - lastUsed;
    if (daysSince === 0) score -= 40; // same day
    else if (daysSince === 1) score -= 15;
    else if (daysSince === 2) score -= 5;
  }

  // ── Night occasion boost ───────────────────────────
  if (occasion === 'night') {
    if (item.formality === 'smart_casual' || item.formality === 'formal' || item.formality === 'business') {
      score += 8;
    }
    if (item.category === 'activewear' || item.formality === 'athletic') {
      score -= 15;
    }
  }

  return { item, score: Math.max(0, Math.min(100, score)), reasons };
}

// ── Helpers ──────────────────────────────────────────
function pickBest(
  scored: ScoredItem[],
  categories: string[],
  excludeIds?: Set<string>,
): ScoredItem | null {
  const candidates = scored
    .filter((s) => categories.includes(s.item.category))
    .filter((s) => !excludeIds?.has(s.item.id))
    .sort((a, b) => b.score - a.score);

  return candidates[0] ?? null;
}

function getTargetFormality(activities: string[], isNight: boolean): string {
  if (isNight) return 'smart_casual';
  const lowerActivities = activities.map((a) => a.toLowerCase());
  if (lowerActivities.some((a) => CASUAL_ACTIVITIES.has(a))) return 'casual';
  if (lowerActivities.some((a) => a === 'business' || a === 'conference' || a === 'meeting')) return 'business';
  return 'smart_casual';
}

function buildNotes(
  items: ScoredItem[],
  day: TripDayWithWeather,
  occasion: string,
  activities: string[],
  profile: StyleProfile | null,
  confidence: number,
  isRainy: boolean,
): string {
  const weatherDesc = day.weatherCondition ?? 'mixed';
  const tempRange = day.weatherHigh && day.weatherLow
    ? `${Math.round(day.weatherLow)}–${Math.round(day.weatherHigh)}°C`
    : 'unknown temp';
  const actStr = activities.slice(0, 2).join(', ') || 'general';

  const lines: string[] = [];

  // Summary
  const label = occasion === 'night' ? 'Evening' : 'Day';
  lines.push(`${label} outfit for ${actStr} in ${weatherDesc} (${tempRange})`);
  lines.push('');

  // "Why this works" bullets
  const allReasons: string[] = [];
  for (const s of items) {
    allReasons.push(...s.reasons);
  }
  // Dedupe and take top 4
  const uniqueReasons = [...new Set(allReasons)].slice(0, 4);
  if (uniqueReasons.length > 0) {
    lines.push('Why this works for you:');
    for (const r of uniqueReasons) {
      lines.push(`• ${r}`);
    }
  } else {
    lines.push('Why this works for you:');
    lines.push('• Balanced neutral palette');
    if (isRainy) lines.push('• Weather-appropriate layers');
    if (profile) lines.push(`• Suited for ${profile.bodyType} build, ${profile.fitPreference} fit`);
    else lines.push('• Complete a style profile for personalized picks');
  }

  lines.push('');
  lines.push(`Confidence: ${confidence}/100`);

  return lines.join('\n');
}
