// ── Auth ─────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ── Wardrobe ─────────────────────────────────────────
export type ClothingCategory =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'shoes'
  | 'accessories'
  | 'activewear'
  | 'swimwear'
  | 'formal';

export type Formality = 'casual' | 'smart_casual' | 'business' | 'formal' | 'athletic';

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface WardrobeItem {
  id: string;
  userId: string;
  category: ClothingCategory;
  name: string;
  colors: string[];
  seasonTags: Season[];
  formality: Formality;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWardrobeItemRequest {
  category: ClothingCategory;
  name: string;
  colors: string[];
  seasonTags: Season[];
  formality: Formality;
  notes?: string;
  imageUrl?: string;
}

export interface UpdateWardrobeItemRequest extends Partial<CreateWardrobeItemRequest> {}

// ── Trips ────────────────────────────────────────────
export interface Trip {
  id: string;
  userId: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  activities: string[];
  createdAt: string;
  updatedAt: string;
  days?: TripDay[];
}

export interface CreateTripRequest {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  activities: string[];
}

export interface TripDay {
  id: string;
  tripId: string;
  date: string;
  weatherHigh: number | null;
  weatherLow: number | null;
  weatherCondition: string | null;
  precipitationMm: number | null;
  weatherCode: number | null;
  weatherFetchedAt: string | null;
  outfits?: Outfit[];
}

export interface Outfit {
  id: string;
  tripDayId: string;
  occasion: string;
  notes: string | null;
  items?: OutfitItem[];
}

export interface OutfitItem {
  id: string;
  outfitId: string;
  wardrobeItemId: string;
  wardrobeItem?: WardrobeItem;
}

// ── API Response ─────────────────────────────────────
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
