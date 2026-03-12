export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();

  if (sameMonth) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.getDate()}, ${e.getFullYear()}`;
  }

  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1;
}

export const CATEGORY_LABELS: Record<string, string> = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  dresses: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  activewear: 'Activewear',
  swimwear: 'Swimwear',
  formal: 'Formal',
};

export const FORMALITY_LABELS: Record<string, string> = {
  casual: 'Casual',
  smart_casual: 'Smart Casual',
  business: 'Business',
  formal: 'Formal',
  athletic: 'Athletic',
};

// ── WMO Weather Code → Icon + Label ─────────────────
// https://open-meteo.com/en/docs#weathervariables
export function weatherCodeToIcon(code: number | null): string {
  if (code === null || code === undefined) return '—';
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 49) return '🌫️';
  if (code <= 59) return '🌦️';
  if (code <= 69) return '🌧️';
  if (code <= 79) return '🌨️';
  if (code <= 84) return '🌧️';
  if (code <= 86) return '🌨️';
  if (code === 95) return '⛈️';
  if (code <= 99) return '⛈️';
  return '❓';
}

export function weatherCodeToLabel(code: number | null): string {
  if (code === null || code === undefined) return 'Unknown';
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
