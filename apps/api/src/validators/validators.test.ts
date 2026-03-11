import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, createWardrobeItemSchema, createTripSchema } from '../validators';

describe('registerSchema', () => {
  it('accepts valid registration', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'securepass123',
      name: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass123',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });
});

describe('createWardrobeItemSchema', () => {
  it('accepts valid wardrobe item', () => {
    const result = createWardrobeItemSchema.safeParse({
      category: 'tops',
      name: 'Blue Oxford Shirt',
      colors: ['blue', 'white'],
      seasonTags: ['spring', 'fall'],
      formality: 'smart_casual',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty colors array', () => {
    const result = createWardrobeItemSchema.safeParse({
      category: 'tops',
      name: 'Shirt',
      colors: [],
      seasonTags: ['summer'],
      formality: 'casual',
    });
    expect(result.success).toBe(false);
  });
});

describe('createTripSchema', () => {
  it('accepts valid trip', () => {
    const result = createTripSchema.safeParse({
      name: 'Paris Vacation',
      location: 'Paris, France',
      startDate: '2025-06-01',
      endDate: '2025-06-07',
      activities: ['sightseeing', 'dining'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects end date before start date', () => {
    const result = createTripSchema.safeParse({
      name: 'Trip',
      location: 'NYC',
      startDate: '2025-06-07',
      endDate: '2025-06-01',
      activities: [],
    });
    expect(result.success).toBe(false);
  });
});
