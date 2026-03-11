// ── Open-Meteo Weather Service ───────────────────────
// Free, keyless weather API — https://open-meteo.com
// Geocoding: https://geocoding-api.open-meteo.com
// Forecast:  https://api.open-meteo.com

// ── Simple TTL cache ─────────────────────────────────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs = 30 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  clear(): void {
    this.store.clear();
  }
}

// 30-min TTL for geocode (locations don't move), 15-min for forecasts
const geocodeCache = new TtlCache(60 * 60 * 1000); // 1 hour
const forecastCache = new TtlCache(15 * 60 * 1000); // 15 min

// ── Types ────────────────────────────────────────────
export interface GeoLocation {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
}

export interface DayForecast {
  date: string; // YYYY-MM-DD
  tempMinC: number;
  tempMaxC: number;
  precipitationSumMm: number;
  weatherCode: number;
}

// ── Geocoding ────────────────────────────────────────
export async function geocodeLocation(query: string): Promise<GeoLocation | null> {
  const cacheKey = `geo:${query.toLowerCase().trim()}`;
  const cached = geocodeCache.get<GeoLocation>(cacheKey);
  if (cached) return cached;

  const base = query.trim();
  const cityOnly = base.split(',')[0].trim();
  const candidates = Array.from(
    new Set([
      base,
      base.replace(/,/g, ' ').replace(/\s+/g, ' ').trim(),
      cityOnly,
      `${cityOnly} USA`,
      `${cityOnly} United States`,
    ].filter(Boolean))
  );

  for (const q of candidates) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', q);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) continue;

    const data = await res.json().catch(() => null);
    if (!data?.results || data.results.length === 0) continue;

    const r = data.results[0];
    const location: GeoLocation = {
      latitude: r.latitude,
      longitude: r.longitude,
      name: r.name,
      country: r.country ?? '',
    };

    geocodeCache.set(cacheKey, location);
    return location;
  }

  return null;
}

// ── Forecast ─────────────────────────────────────────
export async function fetchForecast(
  latitude: number,
  longitude: number,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
): Promise<DayForecast[]> {
  const cacheKey = `fc:${latitude.toFixed(2)},${longitude.toFixed(2)}:${startDate}:${endDate}`;
  const cached = forecastCache.get<DayForecast[]>(cacheKey);
  if (cached) return cached;

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code');
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`[weather] Forecast failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  const daily = data.daily;
  if (!daily || !daily.time) return [];

  const forecasts: DayForecast[] = daily.time.map((date: string, i: number) => ({
    date,
    tempMaxC: daily.temperature_2m_max[i] ?? null,
    tempMinC: daily.temperature_2m_min[i] ?? null,
    precipitationSumMm: daily.precipitation_sum[i] ?? 0,
    weatherCode: daily.weather_code[i] ?? 0,
  }));

  forecastCache.set(cacheKey, forecasts);
  return forecasts;
}

// ── Convenience: location string → forecast ──────────
export async function getWeatherForTrip(
  locationStr: string,
  startDate: Date,
  endDate: Date,
): Promise<{ geo: GeoLocation; forecasts: DayForecast[] } | null> {
  const geo = await geocodeLocation(locationStr);
  if (!geo) return null;

  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  const forecasts = await fetchForecast(
    geo.latitude,
    geo.longitude,
    fmtDate(startDate),
    fmtDate(endDate),
  );

  return { geo, forecasts };
}

// ── WMO weather code → human label ───────────────────
// https://open-meteo.com/en/docs#weathervariables
export function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 49) return 'Fog';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code <= 99) return 'Thunderstorm w/ hail';
  return 'Unknown';
}
