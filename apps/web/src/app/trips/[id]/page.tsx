'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Badge, Modal } from '@/components/ui';
import { ItemThumbnail } from '@/components/ui/item-thumbnail';
import { api, ApiRequestError } from '@/lib/api';
import type { Trip, Outfit, OutfitItem, OutfitFeedback, WardrobeItem } from '@outfittr/shared';
import { formatDate, formatDateRange, daysBetween, weatherCodeToIcon, weatherCodeToLabel, CATEGORY_LABELS } from '@/lib/utils';

const DISLIKE_REASONS = [
  'Too bright', 'Too formal', 'Not my vibe', 'Too tight', "Doesn't match", 'Not weather-appropriate',
];
const LIKE_REASONS = ['Love the colors', 'Good fit', 'My vibe', 'Versatile'];

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, OutfitFeedback>>({});

  const [swapTarget, setSwapTarget] = useState<{ outfit: Outfit; outfitItem: OutfitItem } | null>(null);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    if (params.id) {
      Promise.all([api.getTrip(params.id as string), api.listWardrobe()])
        .then(([t, w]) => {
          setTrip(t);
          setWardrobe(w);
          // Load feedback for all outfits
          const outfitIds: string[] = [];
          for (const day of t.days ?? []) {
            for (const o of day.outfits ?? []) {
              outfitIds.push(o.id);
            }
          }
          return Promise.all(outfitIds.map((id) => api.getFeedback(id).then((fb) => [id, fb] as const)));
        })
        .then((results) => {
          const map: Record<string, OutfitFeedback> = {};
          for (const [id, fb] of results) {
            if (fb) map[id] = fb;
          }
          setFeedbackMap(map);
        })
        .catch(() => router.push('/trips'))
        .finally(() => setLoading(false));
    }
  }, [params.id, router]);

  const handleRefreshWeather = useCallback(async () => {
    if (!trip || refreshing) return;
    setRefreshing(true);
    try { setTrip(await api.refreshTripWeather(trip.id)); }
    catch (err) { console.error('Weather refresh failed:', err); }
    finally { setRefreshing(false); }
  }, [trip, refreshing]);

  const handleGenerateOutfits = useCallback(async () => {
    if (!trip || generating) return;
    setGenerating(true);
    setGenError('');
    try { setTrip(await api.generateOutfits(trip.id)); setFeedbackMap({}); }
    catch (err) { setGenError(err instanceof ApiRequestError ? err.message : 'Failed to generate outfits'); }
    finally { setGenerating(false); }
  }, [trip, generating]);

  const handleSwap = useCallback(async (newItemId: string) => {
    if (!swapTarget || swapping) return;
    setSwapping(true);
    try {
      await api.swapOutfitItem(swapTarget.outfit.id, {
        outfitItemId: swapTarget.outfitItem.id,
        newWardrobeItemId: newItemId,
      });
      setTrip(await api.getTrip(trip!.id));
      setSwapTarget(null);
    } catch (err) { console.error('Swap failed:', err); }
    finally { setSwapping(false); }
  }, [swapTarget, swapping, trip]);

  const handleFeedback = useCallback(async (outfitId: string, rating: 1 | -1, reasons: string[]) => {
    // Optimistic update
    const prev = feedbackMap[outfitId];
    setFeedbackMap((m) => ({
      ...m,
      [outfitId]: { id: '', userId: '', outfitId, rating, reasons, createdAt: new Date().toISOString() },
    }));
    try {
      const fb = await api.submitFeedback(outfitId, { rating, reasons });
      setFeedbackMap((m) => ({ ...m, [outfitId]: fb }));
    } catch {
      // Rollback
      if (prev) setFeedbackMap((m) => ({ ...m, [outfitId]: prev }));
      else setFeedbackMap((m) => { const n = { ...m }; delete n[outfitId]; return n; });
    }
  }, [feedbackMap]);

  const hasWeather = trip?.days?.some((d) => d.weatherCode !== null) ?? false;
  const hasOutfits = trip?.days?.some((d) => d.outfits && d.outfits.length > 0) ?? false;

  const packingList = (() => {
    if (!trip?.days) return [];
    const seen = new Map<string, WardrobeItem>();
    for (const day of trip.days) {
      for (const outfit of day.outfits ?? []) {
        for (const oi of outfit.items ?? []) {
          if (oi.wardrobeItem && !seen.has(oi.wardrobeItem.id)) {
            seen.set(oi.wardrobeItem.id, oi.wardrobeItem);
          }
        }
      }
    }
    return Array.from(seen.values());
  })();

  const swapCandidates = swapTarget?.outfitItem.wardrobeItem
    ? wardrobe.filter((w) => w.category === swapTarget.outfitItem.wardrobeItem!.category)
    : [];

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
            <Link href="/trips" className="mb-4 inline-flex items-center gap-1 text-sm text-accent-dim hover:text-accent-muted transition-colors">
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
                    {trip.activities.map((a) => <Badge key={a} variant="accent">{a}</Badge>)}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={handleRefreshWeather} disabled={refreshing} className="btn-secondary text-sm">
                  {refreshing ? <><Spinner /> Fetching…</> : <>↻ Weather</>}
                </button>
                <button onClick={handleGenerateOutfits} disabled={generating} className="btn-primary text-sm">
                  {generating ? <><Spinner /> Generating…</> : hasOutfits ? <>↻ Regenerate</> : <>✦ Generate Outfits</>}
                </button>
              </div>
            </div>
            {genError && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{genError}</div>
            )}
          </div>

          {/* Weather bar */}
          {hasWeather && trip.days && (
            <div className="mb-6 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {trip.days.map((day) => {
                  const hasData = day.weatherCode !== null;
                  return (
                    <div key={day.id} className="flex flex-col items-center rounded-lg bg-surface-raised border border-border px-3 py-2 min-w-[4.5rem]">
                      <span className="text-[10px] text-accent-dim mb-1">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className="text-lg leading-none mb-1">{hasData ? weatherCodeToIcon(day.weatherCode) : '—'}</span>
                      {hasData ? (
                        <span className="text-[11px] font-medium text-accent-muted">{Math.round(day.weatherLow!)}° / {Math.round(day.weatherHigh!)}°</span>
                      ) : <span className="text-[11px] text-accent-dim">—</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Days */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Daily itinerary</h2>
            {trip.days && trip.days.length > 0 ? (
              <div className="space-y-6">
                {trip.days.map((day, idx) => {
                  const hasData = day.weatherCode !== null;
                  const dayOutfits = day.outfits ?? [];
                  return (
                    <div key={day.id} className="card">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium">Day {idx + 1}</span>
                        <span className="text-xs text-accent-dim">{formatDate(day.date)}</span>
                      </div>
                      {hasData ? (
                        <div className="mb-4 rounded-lg bg-surface-subtle p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl leading-none">{weatherCodeToIcon(day.weatherCode)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-accent">{day.weatherCondition || weatherCodeToLabel(day.weatherCode)}</p>
                              <div className="mt-0.5 flex items-center gap-3 text-xs text-accent-muted">
                                <span>{Math.round(day.weatherLow!)}° – {Math.round(day.weatherHigh!)}°C</span>
                                {day.precipitationMm !== null && day.precipitationMm > 0 && (
                                  <><span className="text-accent-dim">·</span><span>💧 {day.precipitationMm.toFixed(1)} mm</span></>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-accent-dim">
                          No weather data — <button onClick={handleRefreshWeather} disabled={refreshing} className="text-accent-muted hover:text-accent transition-colors">fetch weather</button>
                        </div>
                      )}
                      {dayOutfits.length > 0 ? (
                        <div className="space-y-3">
                          {dayOutfits.map((outfit) => (
                            <OutfitCard
                              key={outfit.id}
                              outfit={outfit}
                              feedback={feedbackMap[outfit.id] ?? null}
                              onSwap={(oi) => setSwapTarget({ outfit, outfitItem: oi })}
                              onFeedback={handleFeedback}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-accent-dim">
                          No outfits — <button onClick={handleGenerateOutfits} disabled={generating} className="text-accent-muted hover:text-accent transition-colors">generate outfits</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-accent-dim">No days in this trip.</p>}
          </div>

          {/* Packing List */}
          {packingList.length > 0 && (
            <div className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold">Packing list</h2>
              <p className="text-xs text-accent-dim">{packingList.length} unique items across all outfits</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {packingList.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <ItemThumbnail src={item.imageUrl} alt={item.name} size="sm" fallback={CATEGORY_LABELS[item.category]?.charAt(0)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-accent-dim">{CATEGORY_LABELS[item.category]} · {item.colors.slice(0, 2).join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Swap Modal */}
          <Modal open={!!swapTarget} onClose={() => setSwapTarget(null)} title="Swap item">
            {swapTarget && (
              <div>
                <p className="mb-1 text-xs text-accent-dim">Replace: <span className="text-accent-muted">{swapTarget.outfitItem.wardrobeItem?.name}</span></p>
                <p className="mb-4 text-xs text-accent-dim">Category: {CATEGORY_LABELS[swapTarget.outfitItem.wardrobeItem?.category ?? ''] ?? 'Unknown'}</p>
                {swapCandidates.filter((w) => w.id !== swapTarget.outfitItem.wardrobeItemId).length === 0 ? (
                  <p className="py-4 text-center text-sm text-accent-dim">No other items in this category.</p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {swapCandidates.filter((w) => w.id !== swapTarget.outfitItem.wardrobeItemId).map((w) => (
                      <button key={w.id} onClick={() => handleSwap(w.id)} disabled={swapping}
                        className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-border-hover transition-colors disabled:opacity-50">
                        <ItemThumbnail src={w.imageUrl} alt={w.name} size="sm" fallback={CATEGORY_LABELS[w.category]?.charAt(0)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-xs text-accent-dim">{w.colors.slice(0, 3).join(', ')} · {w.formality}</p>
                        </div>
                        <span className="text-xs text-accent-muted shrink-0">Select →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Modal>
        </div>
      )}
    </AppShell>
  );
}

function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

// ── Outfit Card with feedback ────────────────────────
function OutfitCard({
  outfit,
  feedback,
  onSwap,
  onFeedback,
}: {
  outfit: Outfit;
  feedback: OutfitFeedback | null;
  onSwap: (item: OutfitItem) => void;
  onFeedback: (outfitId: string, rating: 1 | -1, reasons: string[]) => void;
}) {
  const isNight = outfit.occasion === 'night';
  const noteLines = (outfit.notes ?? '').split('\n').filter(Boolean);
  const summary = noteLines[0] ?? '';
  const bullets = noteLines.filter((l) => l.startsWith('•'));
  const personalizationLine = noteLines.find((l) => l.startsWith('🧠'));
  const confidenceLine = noteLines.find((l) => l.startsWith('Confidence:'));
  const confidenceMatch = confidenceLine?.match(/(\d+)/);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : null;

  const [showReasons, setShowReasons] = useState(false);
  const [pendingRating, setPendingRating] = useState<1 | -1 | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>(feedback?.reasons ?? []);
  const [saving, setSaving] = useState(false);

  const currentRating = feedback?.rating ?? null;

  function handleRatingClick(rating: 1 | -1) {
    if (currentRating === rating) return; // already set
    setPendingRating(rating);
    setSelectedReasons([]);
    setShowReasons(true);
  }

  function toggleReason(r: string) {
    setSelectedReasons((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  async function confirmFeedback() {
    if (!pendingRating) return;
    setSaving(true);
    onFeedback(outfit.id, pendingRating, selectedReasons);
    setSaving(false);
    setShowReasons(false);
    setPendingRating(null);
  }

  return (
    <div className={`rounded-lg border p-4 ${isNight ? 'border-indigo-500/20 bg-indigo-500/[0.03]' : 'border-border bg-surface-subtle/50'}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{isNight ? '🌙' : '☀️'}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent-muted">{outfit.occasion} outfit</span>
        </div>
        <div className="flex items-center gap-2">
          {confidence !== null && (
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${confidence >= 70 ? 'bg-emerald-500/10 text-emerald-400' : confidence >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
              {confidence}/100
            </span>
          )}
          {/* Feedback buttons */}
          <div className="flex gap-0.5">
            <button
              onClick={() => handleRatingClick(1)}
              disabled={saving}
              className={`rounded-md px-2 py-1 text-sm transition-colors ${
                currentRating === 1
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-accent-dim hover:text-emerald-400 hover:bg-emerald-500/5'
              }`}
              title="Like this outfit"
            >
              👍
            </button>
            <button
              onClick={() => handleRatingClick(-1)}
              disabled={saving}
              className={`rounded-md px-2 py-1 text-sm transition-colors ${
                currentRating === -1
                  ? 'bg-red-500/15 text-red-400'
                  : 'text-accent-dim hover:text-red-400 hover:bg-red-500/5'
              }`}
              title="Dislike this outfit"
            >
              👎
            </button>
          </div>
        </div>
      </div>

      {/* Reason chips */}
      {showReasons && pendingRating && (
        <div className="mb-3 rounded-lg border border-border bg-surface-raised p-3">
          <p className="mb-2 text-[10px] font-medium text-accent-muted">
            {pendingRating === 1 ? 'What do you like?' : 'What went wrong?'} (optional)
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(pendingRating === 1 ? LIKE_REASONS : DISLIKE_REASONS).map((r) => (
              <button
                key={r}
                onClick={() => toggleReason(r)}
                className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                  selectedReasons.includes(r)
                    ? pendingRating === 1
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-border text-accent-dim hover:border-border-hover'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={confirmFeedback} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
              Submit
            </button>
            <button onClick={() => { setShowReasons(false); setPendingRating(null); }} className="btn-ghost text-xs py-1.5 px-3">
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Current feedback display */}
      {currentRating && !showReasons && feedback?.reasons && feedback.reasons.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {feedback.reasons.map((r) => (
            <span key={r} className={`rounded-md px-2 py-0.5 text-[10px] ${
              currentRating === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {r}
            </span>
          ))}
        </div>
      )}

      {summary && <p className="mb-3 text-xs text-accent-muted">{summary}</p>}

      <div className="mb-3 space-y-1.5">
        {(outfit.items ?? []).map((oi) => (
          <div key={oi.id} className="group flex items-center gap-2.5 rounded-md bg-surface-raised/50 px-3 py-2">
            <ItemThumbnail src={oi.wardrobeItem?.imageUrl} alt={oi.wardrobeItem?.name ?? ''} size="sm" fallback={CATEGORY_LABELS[oi.wardrobeItem?.category ?? '']?.charAt(0)} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{oi.wardrobeItem?.name ?? 'Unknown'}</p>
              <p className="text-[10px] text-accent-dim">{CATEGORY_LABELS[oi.wardrobeItem?.category ?? ''] ?? ''} · {oi.wardrobeItem?.colors.slice(0, 2).join(', ')}</p>
            </div>
            <button onClick={() => onSwap(oi)} className="rounded px-2 py-1 text-[10px] text-accent-dim opacity-0 group-hover:opacity-100 hover:bg-surface-subtle hover:text-accent-muted transition-all">Swap</button>
          </div>
        ))}
      </div>

      {/* Why it works + personalization */}
      {(bullets.length > 0 || personalizationLine) && (
        <details className="group">
          <summary className="cursor-pointer text-[10px] text-accent-dim hover:text-accent-muted transition-colors">
            Why this works for you ▾
          </summary>
          <ul className="mt-2 space-y-0.5">
            {bullets.map((b, i) => <li key={i} className="text-[11px] text-accent-dim leading-relaxed">{b}</li>)}
          </ul>
          {personalizationLine && (
            <p className="mt-1.5 text-[11px] text-accent-muted">{personalizationLine}</p>
          )}
        </details>
      )}
    </div>
  );
}
