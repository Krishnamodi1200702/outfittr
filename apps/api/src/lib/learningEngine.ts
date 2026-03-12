import { prisma } from './prisma';

// ── Weight keys and their default values ─────────────
// All weights are clamped to [-1, 1].
// Positive = prefer, negative = avoid.
export interface PreferenceWeights {
  preferNeutralColors: number;   // positive: prefer neutrals; negative: prefer bold
  preferBrightAccents: number;   // positive: like pops of color
  preferCasualShoes: number;     // positive: prefer sneakers/casual; negative: prefer dress shoes
  preferSmartCasualNight: number;// positive: dress up at night; negative: keep casual
  preferRelaxedFit: number;      // positive: relaxed/oversized; negative: slim
  preferOuterwearLayers: number; // positive: layer even when mild
  preferAccessories: number;     // positive: always accessorize
  avoidBrightColors: number;     // positive: penalize bright items
  avoidTightTops: number;        // positive: penalize fitted tops
  preferDressesOverSeparates: number; // positive: prefer dresses
}

export const DEFAULT_WEIGHTS: PreferenceWeights = {
  preferNeutralColors: 0,
  preferBrightAccents: 0,
  preferCasualShoes: 0,
  preferSmartCasualNight: 0,
  preferRelaxedFit: 0,
  preferOuterwearLayers: 0,
  preferAccessories: 0,
  avoidBrightColors: 0,
  avoidTightTops: 0,
  preferDressesOverSeparates: 0,
};

const WEIGHT_KEYS = Object.keys(DEFAULT_WEIGHTS) as (keyof PreferenceWeights)[];

function clamp(v: number, min = -1, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

// ── Reason → weight mapping ──────────────────────────
// Feedback reasons map to weight nudges.
const DISLIKE_REASON_MAP: Record<string, Partial<PreferenceWeights>> = {
  'Too bright':              { avoidBrightColors: 0.15, preferNeutralColors: 0.1 },
  'Too formal':              { preferSmartCasualNight: -0.1, preferCasualShoes: 0.1 },
  'Not my vibe':             {}, // generic — no strong signal
  'Too tight':               { avoidTightTops: 0.15, preferRelaxedFit: 0.1 },
  "Doesn't match":           { preferNeutralColors: 0.05 },
  'Not weather-appropriate': {}, // context-specific, no weight change
};

const LIKE_REASON_MAP: Record<string, Partial<PreferenceWeights>> = {
  'Love the colors':  { preferBrightAccents: 0.1, avoidBrightColors: -0.1 },
  'Good fit':         { preferRelaxedFit: -0.05 }, // means current fit is good, slight nudge
  'My vibe':          {}, // generic positive
  'Versatile':        { preferNeutralColors: 0.05 },
};

// ── Swap pattern → weight mapping ────────────────────
function getSwapWeightNudges(
  fromCategory: string,
  toCategory: string,
  fromFormality: string,
  toFormality: string,
  fromName: string,
  toName: string,
): Partial<PreferenceWeights> {
  const nudges: Partial<PreferenceWeights> = {};

  // Shoe swap patterns
  if (fromCategory === 'shoes' || toCategory === 'shoes') {
    const toNameL = toName.toLowerCase();
    const fromNameL = fromName.toLowerCase();
    if (toNameL.includes('sneaker') || toNameL.includes('trainer')) {
      nudges.preferCasualShoes = 0.12;
    }
    if (fromNameL.includes('sneaker') && (toNameL.includes('loafer') || toNameL.includes('oxford') || toNameL.includes('heel'))) {
      nudges.preferCasualShoes = -0.12;
    }
  }

  // Formality swap patterns
  const fOrder = ['athletic', 'casual', 'smart_casual', 'business', 'formal'];
  const fromIdx = fOrder.indexOf(fromFormality);
  const toIdx = fOrder.indexOf(toFormality);
  if (toIdx > fromIdx) {
    nudges.preferSmartCasualNight = 0.08; // swapping up = prefers more formal
  } else if (toIdx < fromIdx) {
    nudges.preferSmartCasualNight = -0.08;
  }

  return nudges;
}

// ── Load user weights ────────────────────────────────
export async function getUserWeights(userId: string): Promise<PreferenceWeights> {
  const record = await prisma.userPreferenceWeights.findUnique({
    where: { userId },
  });

  if (!record) return { ...DEFAULT_WEIGHTS };

  const stored = record.weights as Record<string, number>;
  const weights = { ...DEFAULT_WEIGHTS };
  for (const key of WEIGHT_KEYS) {
    if (typeof stored[key] === 'number') {
      weights[key] = clamp(stored[key]);
    }
  }
  return weights;
}

// ── Update weights from recent signals ───────────────
export async function updateUserWeightsFromSignals(userId: string): Promise<PreferenceWeights> {
  // Start from current weights
  const weights = await getUserWeights(userId);

  // 1. Process recent feedback (last 50)
  const feedback = await prisma.outfitFeedback.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  for (const fb of feedback) {
    const reasonMap = fb.rating === 1 ? LIKE_REASON_MAP : DISLIKE_REASON_MAP;
    for (const reason of fb.reasons) {
      const nudges = reasonMap[reason];
      if (nudges) {
        for (const [key, delta] of Object.entries(nudges)) {
          const k = key as keyof PreferenceWeights;
          if (k in weights) {
            weights[k] = clamp(weights[k] + (delta as number));
          }
        }
      }
    }

    // Generic rating signal: likes slightly reinforce existing tendencies
    if (fb.rating === -1 && fb.reasons.length === 0) {
      // Generic dislike with no reason — small neutral push
      weights.preferNeutralColors = clamp(weights.preferNeutralColors + 0.02);
    }
  }

  // 2. Process recent swap events (last 30)
  const swaps = await prisma.swapEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  for (const swap of swaps) {
    // Load the from and to items to get formality + name
    const [fromItem, toItem] = await Promise.all([
      prisma.wardrobeItem.findUnique({ where: { id: swap.fromWardrobeItemId } }),
      prisma.wardrobeItem.findUnique({ where: { id: swap.toWardrobeItemId } }),
    ]);

    if (fromItem && toItem) {
      const nudges = getSwapWeightNudges(
        fromItem.category,
        toItem.category,
        fromItem.formality,
        toItem.formality,
        fromItem.name,
        toItem.name,
      );
      for (const [key, delta] of Object.entries(nudges)) {
        const k = key as keyof PreferenceWeights;
        if (k in weights) {
          weights[k] = clamp(weights[k] + (delta as number));
        }
      }
    }
  }

  // 3. Apply decay toward zero for stability (shrink by 5% each update)
  for (const key of WEIGHT_KEYS) {
    weights[key] = clamp(weights[key] * 0.95);
  }

  // 4. Persist
  await prisma.userPreferenceWeights.upsert({
    where: { userId },
    update: { weights: weights as Record<string, number> },
    create: { userId, weights: weights as Record<string, number> },
  });

  return weights;
}

// ── Get learning summary for UI ──────────────────────
export async function getLearningStats(userId: string) {
  const [likes, dislikes, swapCount, weights] = await Promise.all([
    prisma.outfitFeedback.count({ where: { userId, rating: 1 } }),
    prisma.outfitFeedback.count({ where: { userId, rating: -1 } }),
    prisma.swapEvent.count({ where: { userId } }),
    getUserWeights(userId),
  ]);

  // Derive top preferences summary from weights
  const activeWeights = WEIGHT_KEYS
    .map((k) => ({ key: k, value: weights[k] }))
    .filter((w) => Math.abs(w.value) > 0.05)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 3);

  const WEIGHT_LABELS: Record<string, [string, string]> = {
    preferNeutralColors:        ['prefers neutral tones', 'prefers bold tones'],
    preferBrightAccents:        ['likes pops of color', 'prefers muted palettes'],
    preferCasualShoes:          ['prefers casual footwear', 'prefers dress shoes'],
    preferSmartCasualNight:     ['dresses up at night', 'keeps it casual at night'],
    preferRelaxedFit:           ['prefers relaxed fit', 'prefers slim fit'],
    preferOuterwearLayers:      ['loves layering', 'prefers minimal layers'],
    preferAccessories:          ['accessorizes often', 'keeps it simple'],
    avoidBrightColors:          ['avoids bright colors', 'open to bright colors'],
    avoidTightTops:             ['avoids tight tops', 'likes fitted tops'],
    preferDressesOverSeparates: ['prefers dresses', 'prefers separates'],
  };

  const preferences = activeWeights.map((w) => {
    const labels = WEIGHT_LABELS[w.key];
    return labels ? (w.value > 0 ? labels[0] : labels[1]) : w.key;
  });

  return {
    likes,
    dislikes,
    swaps: swapCount,
    totalSignals: likes + dislikes + swapCount,
    preferences,
    weights,
  };
}
