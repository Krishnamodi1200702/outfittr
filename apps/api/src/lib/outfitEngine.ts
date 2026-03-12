import { prisma } from './prisma';
import type { StyleProfile, WardrobeItem, TripDay } from '@prisma/client';
import { getUserWeights, type PreferenceWeights, DEFAULT_WEIGHTS } from './learningEngine';

// ── Types ────────────────────────────────────────────
interface ScoredItem {
  item: WardrobeItem;
  score: number;
  reasons: string[];
}

interface GeneratedOutfit {
  occasion: string;
  items: string[];
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

const BRIGHT_COLORS = new Set([
  'red', 'orange', 'yellow', 'hot pink', 'fuchsia', 'lime', 'electric blue',
  'coral', 'magenta', 'neon', 'bright',
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

  const wardrobe = await prisma.wardrobeItem.findMany({ where: { userId } });
  if (wardrobe.length === 0) throw new Error('Wardrobe is empty — add items first');

  const profile = await prisma.styleProfile.findUnique({ where: { userId } });
  const learnedWeights = await getUserWeights(userId);
  const hasLearnedSignals = Object.values(learnedWeights).some((v) => Math.abs(v) > 0.05);

  const hasNightActivities = trip.activities.some((a) =>
    NIGHT_ACTIVITIES.has(a.toLowerCase()),
  );

  // Delete existing outfits for this trip
  const dayIds = trip.days.map((d) => d.id);
  await prisma.outfit.deleteMany({ where: { tripDayId: { in: dayIds } } });

  const recentlyUsed = new Map<string, number>();

  for (let dayIdx = 0; dayIdx < trip.days.length; dayIdx++) {
    const day = trip.days[dayIdx];
    const occasions = determineOccasions(trip.activities, hasNightActivities);

    for (const occasion of occasions) {
      const outfit = buildOutfit(
        wardrobe, day, occasion, trip.activities,
        profile, learnedWeights, hasLearnedSignals,
        recentlyUsed, dayIdx,
      );

      if (outfit) {
        await prisma.outfit.create({
          data: {
            tripDayId: day.id,
            occasion: outfit.occasion,
            notes: outfit.notes,
            items: {
              create: outfit.items.map((wardrobeItemId) => ({ wardrobeItemId })),
            },
          },
        });

        for (const itemId of outfit.items) {
          recentlyUsed.set(itemId, dayIdx);
        }
      }
    }
  }

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
  weights: PreferenceWeights,
  hasLearnedSignals: boolean,
  recentlyUsed: Map<string, number>,
  dayIdx: number,
): GeneratedOutfit | null {
  const isNight = occasion === 'night';
  const targetFormality = getTargetFormality(activities, isNight, weights);
  const isRainy = (day.precipitationMm ?? 0) > 2 ||
    (day.weatherCondition?.toLowerCase().includes('rain') ?? false) ||
    (day.weatherCondition?.toLowerCase().includes('drizzle') ?? false);
  const isCold = (day.weatherLow ?? 15) < 12;
  const isHot = (day.weatherHigh ?? 20) > 28;

  const scored = wardrobe.map((item) =>
    scoreItem(item, day, occasion, targetFormality, isRainy, isCold, isHot,
              profile, weights, recentlyUsed, dayIdx),
  );

  const top = pickBest(scored, ['tops', 'activewear']);
  const bottom = pickBest(scored, ['bottoms']);
  const shoes = pickBest(scored, ['shoes']);
  const dress = pickBest(scored, ['dresses', 'formal']);

  const dressBonus = weights.preferDressesOverSeparates * 10;
  const useDress = dress && dress.score > ((top?.score ?? 0) + (bottom?.score ?? 0)) / 2 + 5 + dressBonus;

  let coreItems: ScoredItem[];
  if (useDress && dress) {
    coreItems = [dress, shoes].filter(Boolean) as ScoredItem[];
  } else if (top && bottom && shoes) {
    coreItems = [top, bottom, shoes];
  } else {
    const available = [top, bottom, shoes, dress].filter(Boolean) as ScoredItem[];
    if (available.length < 2) return null;
    coreItems = available;
  }

  // Optional outerwear — learned weight can push this even in mild weather
  const usedIds = new Set(coreItems.map((s) => s.item.id));
  const wantOuterwear = isRainy || isCold || weights.preferOuterwearLayers > 0.2;
  if (wantOuterwear) {
    const outerwear = pickBest(scored, ['outerwear'], usedIds);
    if (outerwear) {
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

  // Optional accessory — learned weight influences threshold
  const usedIdsAll = new Set(coreItems.map((s) => s.item.id));
  const accessoryThreshold = 30 - (weights.preferAccessories * 15);
  const accessory = pickBest(scored, ['accessories'], usedIdsAll);
  if (accessory && accessory.score > accessoryThreshold) {
    coreItems.push(accessory);
  }

  const avgScore = coreItems.reduce((sum, s) => sum + s.score, 0) / coreItems.length;
  const confidence = Math.min(100, Math.max(10, Math.round(avgScore)));

  const notes = buildNotes(
    coreItems, day, occasion, activities,
    profile, weights, hasLearnedSignals, confidence, isRainy,
  );

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
  weights: PreferenceWeights,
  recentlyUsed: Map<string, number>,
  dayIdx: number,
): ScoredItem {
  let score = 50;
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
  const isNeutral = itemColors.some((c) => NEUTRALS.has(c));
  const isBright = itemColors.some((c) => BRIGHT_COLORS.has(c));

  if (isNeutral) {
    score += 5 + Math.round(weights.preferNeutralColors * 8);
  }

  // ── Learned weights: color preferences ─────────────
  if (isBright) {
    score += Math.round(weights.preferBrightAccents * 8);
    score -= Math.round(weights.avoidBrightColors * 10);
    if (weights.avoidBrightColors > 0.2) {
      reasons.push('Deprioritized bright colors (your preference)');
    }
  }

  // ── Learned weights: shoe preference ───────────────
  if (item.category === 'shoes') {
    const nameL = item.name.toLowerCase();
    if (nameL.includes('sneaker') || nameL.includes('trainer') || item.formality === 'casual' || item.formality === 'athletic') {
      score += Math.round(weights.preferCasualShoes * 10);
      if (weights.preferCasualShoes > 0.2) {
        reasons.push('Casual footwear (your preference)');
      }
    }
    if (nameL.includes('loafer') || nameL.includes('oxford') || nameL.includes('heel') || item.formality === 'formal' || item.formality === 'business') {
      score -= Math.round(weights.preferCasualShoes * 8);
    }
  }

  // ── Learned weights: fit preference ────────────────
  if (item.category === 'tops') {
    if (weights.avoidTightTops > 0.2 && (item.formality === 'athletic' || item.name.toLowerCase().includes('slim') || item.name.toLowerCase().includes('fitted'))) {
      score -= Math.round(weights.avoidTightTops * 10);
      reasons.push('Avoiding tight tops (your preference)');
    }
    if (weights.preferRelaxedFit > 0.2 && (item.name.toLowerCase().includes('relaxed') || item.name.toLowerCase().includes('oversized'))) {
      score += Math.round(weights.preferRelaxedFit * 8);
      reasons.push('Relaxed fit (your preference)');
    }
  }

  // ── Profile-based scoring ──────────────────────────
  if (profile) {
    for (const c of itemColors) {
      if (profile.favoriteColors.some((f) => c.includes(f.toLowerCase()) || f.toLowerCase().includes(c))) {
        score += 10;
        reasons.push(`Matches favorite color: ${c}`);
        break;
      }
    }

    for (const c of itemColors) {
      if (profile.avoidColors.some((a) => c.includes(a.toLowerCase()) || a.toLowerCase().includes(c))) {
        score -= 20;
        reasons.push(`Color to avoid: ${c}`);
        break;
      }
    }

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

    if (profile.bodyType === 'broad') {
      if (item.category === 'tops' && item.formality === 'athletic') score -= 5;
      if (item.category === 'tops' && (profile.fitPreference === 'regular' || profile.fitPreference === 'relaxed')) {
        score += 5;
        reasons.push('Relaxed fit suits broad build');
      }
    }
    if (profile.bodyType === 'lean' && profile.fitPreference === 'slim') score += 4;
    if (profile.bodyType === 'athletic') {
      if (item.category === 'bottoms' && item.name.toLowerCase().includes('taper')) {
        score += 5;
        reasons.push('Tapered fit suits athletic build');
      }
      if (item.category === 'bottoms' && item.name.toLowerCase().includes('skinny')) score -= 5;
    }
    if (profile.bodyType === 'curvy') {
      if (item.category === 'outerwear') {
        score += 4;
        reasons.push('Structured layers define silhouette');
      }
      if (profile.fitPreference === 'slim' && item.name.toLowerCase().includes('boxy')) score -= 5;
    }
    if ((profile.heightRange === 'petite' || profile.heightRange === 'short') && item.category === 'outerwear') {
      if (item.name.toLowerCase().includes('long') || item.name.toLowerCase().includes('maxi')) score -= 8;
    }
  }

  // ── Variety penalty ────────────────────────────────
  const lastUsed = recentlyUsed.get(item.id);
  if (lastUsed !== undefined) {
    const daysSince = dayIdx - lastUsed;
    if (daysSince === 0) score -= 40;
    else if (daysSince === 1) score -= 15;
    else if (daysSince === 2) score -= 5;
  }

  // ── Night occasion boost ───────────────────────────
  if (occasion === 'night') {
    // Learned weight: how much to dress up at night
    const nightFormalityBoost = 8 + Math.round(weights.preferSmartCasualNight * 8);
    if (item.formality === 'smart_casual' || item.formality === 'formal' || item.formality === 'business') {
      score += nightFormalityBoost;
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

function getTargetFormality(activities: string[], isNight: boolean, weights: PreferenceWeights): string {
  if (isNight) {
    // Learned weight can shift night formality
    if (weights.preferSmartCasualNight < -0.3) return 'casual';
    return 'smart_casual';
  }
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
  weights: PreferenceWeights,
  hasLearnedSignals: boolean,
  confidence: number,
  isRainy: boolean,
): string {
  const weatherDesc = day.weatherCondition ?? 'mixed';
  const tempRange = day.weatherHigh && day.weatherLow
    ? `${Math.round(day.weatherLow)}–${Math.round(day.weatherHigh)}°C`
    : 'unknown temp';
  const actStr = activities.slice(0, 2).join(', ') || 'general';

  const lines: string[] = [];

  const label = occasion === 'night' ? 'Evening' : 'Day';
  lines.push(`${label} outfit for ${actStr} in ${weatherDesc} (${tempRange})`);
  lines.push('');

  const allReasons: string[] = [];
  for (const s of items) {
    allReasons.push(...s.reasons);
  }
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

  // Personalization note
  if (hasLearnedSignals) {
    lines.push('');
    // Build a short readable summary of top active weights
    const activeLabels: string[] = [];
    if (Math.abs(weights.preferNeutralColors) > 0.1)
      activeLabels.push(weights.preferNeutralColors > 0 ? 'neutral tones' : 'bold colors');
    if (Math.abs(weights.preferCasualShoes) > 0.1)
      activeLabels.push(weights.preferCasualShoes > 0 ? 'casual footwear' : 'dress shoes');
    if (Math.abs(weights.avoidBrightColors) > 0.1)
      activeLabels.push('muted palette');
    if (Math.abs(weights.preferRelaxedFit) > 0.1)
      activeLabels.push(weights.preferRelaxedFit > 0 ? 'relaxed fit' : 'slim fit');

    if (activeLabels.length > 0) {
      lines.push(`🧠 Personalized: prefers ${activeLabels.slice(0, 3).join(', ')}`);
    } else {
      lines.push('🧠 Personalized using your feedback');
    }
  }

  lines.push('');
  lines.push(`Confidence: ${confidence}/100`);

  return lines.join('\n');
}
