'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type { Trip } from '@outfittr/shared';
import { formatDate, formatDateRange, daysBetween, weatherCodeToIcon, weatherCodeToLabel } from '@/lib/utils';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.id) {
      api
        .getTrip(params.id as string)
        .then(setTrip)
        .catch(() => router.push('/trips'))
        .finally(() => setLoading(false));
    }
  }, [params.id, router]);

  const handleRefreshWeather = useCallback(async () => {
    if (!trip || refreshing) return;
    setRefreshing(true);
    try {
      const updated = await api.refreshTripWeather(trip.id);
      setTrip(updated);
    } catch (err) {
      console.error('Failed to refresh weather:', err);
    } finally {
      setRefreshing(false);
    }
  }, [trip, refreshing]);

  const hasWeather = trip?.days?.some((d) => d.weatherCode !== null) ?? false;

  return (
    <AppShell>
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : !trip ? (
        <div className="py-16 text-center text-accent-dim">Trip not found.</div>
      ) : (
        <div className="animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/trips"
              className="mb-4 inline-flex items-center gap-1 text-sm text-accent-dim hover:text-accent-muted transition-colors"
            >
              ← Back to trips
            </Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{trip.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-accent-muted">
                  <span>{trip.location}</span>
                  <span className="text-accent-dim">·</span>
                  <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                  <span className="text-accent-dim">·</span>
                  <span>{daysBetween(trip.startDate, trip.endDate)} days</span>
                </div>
                {trip.activities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {trip.activities.map((a) => (
                      <Badge key={a} variant="accent">
                        {a}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleRefreshWeather}
                disabled={refreshing}
                className="btn-secondary text-sm shrink-0"
              >
                {refreshing ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-muted border-t-transparent" />
                    Fetching…
                  </>
                ) : (
                  <>↻ Refresh Weather</>
                )}
              </button>
            </div>
          </div>

          {/* Weather summary bar */}
          {hasWeather && trip.days && (
            <div className="mb-6 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {trip.days.map((day) => {
                  const hasData = day.weatherCode !== null;
                  return (
                    <div
                      key={day.id}
                      className="flex flex-col items-center rounded-lg bg-surface-raised border border-border px-3 py-2 min-w-[4.5rem]"
                    >
                      <span className="text-[10px] text-accent-dim mb-1">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-lg leading-none mb-1">
                        {hasData ? weatherCodeToIcon(day.weatherCode) : '—'}
                      </span>
                      {hasData ? (
                        <span className="text-[11px] font-medium text-accent-muted">
                          {Math.round(day.weatherLow!)}° / {Math.round(day.weatherHigh!)}°
                        </span>
                      ) : (
                        <span className="text-[11px] text-accent-dim">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Daily itinerary</h2>
            {trip.days && trip.days.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trip.days.map((day, idx) => {
                  const hasData = day.weatherCode !== null;

                  return (
                    <div key={day.id} className="card">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-accent-muted">
                          Day {idx + 1}
                        </span>
                        <span className="text-xs text-accent-dim">{formatDate(day.date)}</span>
                      </div>

                      {/* Weather block */}
                      {hasData ? (
                        <div className="mb-3 rounded-lg bg-surface-subtle p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl leading-none">
                              {weatherCodeToIcon(day.weatherCode)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-accent">
                                {day.weatherCondition || weatherCodeToLabel(day.weatherCode)}
                              </p>
                              <div className="mt-0.5 flex items-center gap-3 text-xs text-accent-muted">
                                <span>
                                  {Math.round(day.weatherLow!)}° – {Math.round(day.weatherHigh!)}°C
                                </span>
                                {day.precipitationMm !== null && day.precipitationMm > 0 && (
                                  <>
                                    <span className="text-accent-dim">·</span>
                                    <span>💧 {day.precipitationMm.toFixed(1)} mm</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {day.weatherFetchedAt && (
                            <p className="mt-2 text-[10px] text-accent-dim">
                              Updated {new Date(day.weatherFetchedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mb-3 rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-accent-dim">
                          No weather data yet
                          <br />
                          <button
                            onClick={handleRefreshWeather}
                            disabled={refreshing}
                            className="mt-1 text-accent-muted hover:text-accent transition-colors"
                          >
                            {refreshing ? 'Fetching…' : 'Fetch weather →'}
                          </button>
                        </div>
                      )}

                      {/* Outfits block */}
                      {day.outfits && day.outfits.length > 0 ? (
                        <div className="space-y-2">
                          {day.outfits.map((outfit) => (
                            <div key={outfit.id} className="rounded-md bg-surface-subtle p-2">
                              <p className="text-xs font-medium">{outfit.occasion}</p>
                              {outfit.items && (
                                <p className="text-xs text-accent-dim">
                                  {outfit.items.length} items
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-accent-dim">
                          No outfits planned yet
                          <br />
                          <span className="text-accent-muted">Coming soon</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-accent-dim">No days in this trip.</p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
