'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { WardrobeItem, Trip, StyleProfile, PersonalizationSummary } from '@outfittr/shared';
import { formatDateRange, daysBetween, CATEGORY_LABELS } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [profile, setProfile] = useState<StyleProfile | null | undefined>(undefined);
  const [personalization, setPersonalization] = useState<PersonalizationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listWardrobe(),
      api.listTrips(),
      api.getStyleProfile(),
      api.getPersonalizationSummary().catch(() => null),
    ])
      .then(([w, t, p, ps]) => {
        setWardrobe(w);
        setTrips(t);
        setProfile(p);
        setPersonalization(ps);
      })
      .finally(() => setLoading(false));
  }, []);

  const categoryCounts = wardrobe.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const upcomingTrips = trips.filter((t) => new Date(t.startDate) >= new Date());

  return (
    <AppShell>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-accent-dim">
            Here&apos;s an overview of your wardrobe and trips.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Wardrobe Summary */}
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Wardrobe</h2>
                <Link href="/wardrobe" className="text-xs text-accent-muted hover:text-accent transition-colors">
                  View all →
                </Link>
              </div>
              {wardrobe.length === 0 ? (
                <p className="py-6 text-center text-sm text-accent-dim">
                  No items yet.{' '}
                  <Link href="/wardrobe" className="text-accent-muted hover:text-accent">
                    Add your first item
                  </Link>
                </p>
              ) : (
                <>
                  <p className="mb-4 text-3xl font-bold">{wardrobe.length}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryCounts).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="rounded-md bg-surface-subtle px-2.5 py-1 text-xs text-accent-muted"
                      >
                        {CATEGORY_LABELS[cat] || cat} · {count}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Trips Summary */}
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Trips</h2>
                <Link href="/trips" className="text-xs text-accent-muted hover:text-accent transition-colors">
                  View all →
                </Link>
              </div>
              {trips.length === 0 ? (
                <p className="py-6 text-center text-sm text-accent-dim">
                  No trips planned.{' '}
                  <Link href="/trips" className="text-accent-muted hover:text-accent">
                    Plan your first trip
                  </Link>
                </p>
              ) : (
                <div className="space-y-3">
                  {(upcomingTrips.length > 0 ? upcomingTrips : trips).slice(0, 3).map((trip) => (
                    <Link
                      key={trip.id}
                      href={`/trips/${trip.id}`}
                      className="block rounded-lg border border-border p-3 hover:border-border-hover transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{trip.name}</p>
                          <p className="text-xs text-accent-dim">{trip.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-accent-muted">
                            {formatDateRange(trip.startDate, trip.endDate)}
                          </p>
                          <p className="text-xs text-accent-dim">
                            {daysBetween(trip.startDate, trip.endDate)} days
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Personalization Status */}
            {personalization && personalization.totalSignals > 0 && (
              <div className="card lg:col-span-2">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-semibold">Personalization</h2>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                    Active
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 mb-3 text-xs text-accent-muted">
                  <span>👍 {personalization.likes} likes</span>
                  <span>👎 {personalization.dislikes} dislikes</span>
                  <span>🔄 {personalization.swaps} swaps</span>
                </div>
                {personalization.preferences.length > 0 && (
                  <div>
                    <p className="text-[10px] text-accent-dim mb-1.5">Current preferences:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {personalization.preferences.map((p) => (
                        <span key={p} className="rounded-md bg-surface-subtle px-2.5 py-1 text-xs text-accent-muted">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Style Profile CTA */}
            {profile === null && (
              <div className="card lg:col-span-2 border-dashed">
                <div className="flex flex-col items-center py-4 text-center sm:flex-row sm:text-left sm:justify-between">
                  <div className="mb-4 sm:mb-0">
                    <h2 className="font-semibold">Personalize your style</h2>
                    <p className="mt-1 text-sm text-accent-dim">
                      Complete your style profile so we can tailor outfit picks to your body, taste, and colors.
                    </p>
                  </div>
                  <Link href="/profile/style" className="btn-primary text-sm shrink-0">
                    Set up style profile
                  </Link>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="card lg:col-span-2">
              <h2 className="mb-4 font-semibold">Quick actions</h2>
              <div className="flex flex-wrap gap-3">
                <Link href="/wardrobe" className="btn-secondary text-sm">
                  + Add clothing item
                </Link>
                <Link href="/trips" className="btn-secondary text-sm">
                  + Plan a trip
                </Link>
                <Link href="/profile/style" className="btn-secondary text-sm">
                  {profile ? '✎ Edit style profile' : '✦ Personalize my style'}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
