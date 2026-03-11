import { z } from 'zod';

// ── Auth ─────────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Wardrobe ─────────────────────────────────────────
const categories = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'shoes',
  'accessories', 'activewear', 'swimwear', 'formal',
] as const;

const formalities = ['casual', 'smart_casual', 'business', 'formal', 'athletic'] as const;
const seasons = ['spring', 'summer', 'fall', 'winter'] as const;

export const createWardrobeItemSchema = z.object({
  category: z.enum(categories),
  name: z.string().min(1).max(200),
  colors: z.array(z.string().min(1)).min(1, 'At least one color required'),
  seasonTags: z.array(z.enum(seasons)).min(1, 'At least one season required'),
  formality: z.enum(formalities),
  notes: z.string().max(1000).optional(),
  imageUrl: z.string().url().nullish().or(z.literal('')).transform((v) => v || null),
});

export const updateWardrobeItemSchema = createWardrobeItemSchema.partial();

// ── Trips ────────────────────────────────────────────
export const createTripSchema = z
  .object({
    name: z.string().min(1).max(200),
    location: z.string().min(1).max(200),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    activities: z.array(z.string().min(1)).default([]),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

// ── Style Profile ────────────────────────────────────
const bodyTypes = ['lean', 'athletic', 'broad', 'curvy', 'average'] as const;
const heightRanges = ['petite', 'short', 'average', 'tall', 'very_tall'] as const;
const skinUndertones = ['warm', 'cool', 'neutral'] as const;
const styleVibes = ['minimalist', 'classic', 'streetwear', 'bohemian', 'preppy', 'edgy', 'romantic', 'sporty'] as const;
const fitPreferences = ['slim', 'regular', 'relaxed', 'oversized'] as const;

export const styleProfileSchema = z.object({
  bodyType: z.enum(bodyTypes),
  heightRange: z.enum(heightRanges),
  skinUndertone: z.enum(skinUndertones),
  styleVibe: z.enum(styleVibes),
  fitPreference: z.enum(fitPreferences),
  favoriteColors: z.array(z.string().min(1).max(30)).max(10).default([]),
  avoidColors: z.array(z.string().min(1).max(30)).max(10).default([]),
});

// ── Outfit Swap ──────────────────────────────────────
export const swapItemSchema = z.object({
  outfitItemId: z.string().min(1),
  newWardrobeItemId: z.string().min(1),
});
