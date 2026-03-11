'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui';
import { api, ApiRequestError } from '@/lib/api';
import type {
  StyleProfile,
  BodyType,
  HeightRange,
  SkinUndertone,
  StyleVibe,
  FitPreference,
} from '@outfittr/shared';

const STEPS = ['Body', 'Skin', 'Style', 'Love', 'Avoid'] as const;

const BODY_TYPES: { value: BodyType; label: string; desc: string }[] = [
  { value: 'lean', label: 'Lean', desc: 'Narrow shoulders and hips' },
  { value: 'athletic', label: 'Athletic', desc: 'Defined musculature' },
  { value: 'broad', label: 'Broad', desc: 'Wide shoulders or chest' },
  { value: 'curvy', label: 'Curvy', desc: 'Defined waist, rounded hips' },
  { value: 'average', label: 'Average', desc: 'Balanced proportions' },
];

const HEIGHT_RANGES: { value: HeightRange; label: string }[] = [
  { value: 'petite', label: 'Petite (< 5\'2" / 157 cm)' },
  { value: 'short', label: 'Short (5\'2"–5\'5" / 157–165 cm)' },
  { value: 'average', label: 'Average (5\'5"–5\'9" / 165–175 cm)' },
  { value: 'tall', label: 'Tall (5\'9"–6\'1" / 175–185 cm)' },
  { value: 'very_tall', label: 'Very Tall (> 6\'1" / 185 cm)' },
];

const UNDERTONES: { value: SkinUndertone; label: string; desc: string }[] = [
  { value: 'warm', label: 'Warm', desc: 'Golden, olive, or peachy. Veins look green.' },
  { value: 'cool', label: 'Cool', desc: 'Pink, red, or blue. Veins look blue/purple.' },
  { value: 'neutral', label: 'Neutral', desc: 'Mix of both. Veins look blue-green.' },
];

const STYLE_VIBES: { value: StyleVibe; label: string }[] = [
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'classic', label: 'Classic' },
  { value: 'streetwear', label: 'Streetwear' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'preppy', label: 'Preppy' },
  { value: 'edgy', label: 'Edgy' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'sporty', label: 'Sporty' },
];

const FIT_PREFS: { value: FitPreference; label: string; desc: string }[] = [
  { value: 'slim', label: 'Slim', desc: 'Close to the body' },
  { value: 'regular', label: 'Regular', desc: 'Standard, comfortable' },
  { value: 'relaxed', label: 'Relaxed', desc: 'Easy and roomy' },
  { value: 'oversized', label: 'Oversized', desc: 'Intentionally loose' },
];

const COLOR_PRESETS = [
  'black', 'white', 'grey', 'navy', 'beige', 'brown', 'tan', 'cream',
  'blue', 'red', 'green', 'pink', 'purple', 'orange', 'yellow', 'teal',
  'olive', 'burgundy', 'rust', 'coral', 'emerald', 'lavender', 'mustard', 'charcoal',
];

export default function StyleProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [bodyType, setBodyType] = useState<BodyType>('average');
  const [heightRange, setHeightRange] = useState<HeightRange>('average');
  const [skinUndertone, setSkinUndertone] = useState<SkinUndertone>('neutral');
  const [styleVibe, setStyleVibe] = useState<StyleVibe>('classic');
  const [fitPreference, setFitPreference] = useState<FitPreference>('regular');
  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);
  const [avoidColors, setAvoidColors] = useState<string[]>([]);

  useEffect(() => {
    api
      .getStyleProfile()
      .then((p) => {
        if (p) {
          setBodyType(p.bodyType);
          setHeightRange(p.heightRange);
          setSkinUndertone(p.skinUndertone);
          setStyleVibe(p.styleVibe);
          setFitPreference(p.fitPreference);
          setFavoriteColors(p.favoriteColors);
          setAvoidColors(p.avoidColors);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleColor(color: string, list: string[], setter: (v: string[]) => void) {
    if (list.includes(color)) {
      setter(list.filter((c) => c !== color));
    } else if (list.length < 10) {
      setter([...list, color]);
    }
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      await api.upsertStyleProfile({
        bodyType,
        heightRange,
        skinUndertone,
        styleVibe,
        fitPreference,
        favoriteColors,
        avoidColors,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl animate-fade-in">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Style Profile</h1>
        <p className="mb-8 text-sm text-accent-dim">
          Help us personalize outfit recommendations to your body and taste.
        </p>

        {/* Progress */}
        <div className="mb-8 flex gap-1.5">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              className="flex-1 group"
            >
              <div
                className={`h-1 rounded-full transition-colors ${
                  i <= step ? 'bg-accent' : 'bg-surface-subtle'
                }`}
              />
              <span
                className={`mt-1.5 block text-[10px] font-medium transition-colors ${
                  i === step ? 'text-accent' : 'text-accent-dim'
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Step 0: Body type + height */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-accent-muted">Body type</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {BODY_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    onClick={() => setBodyType(bt.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      bodyType === bt.value
                        ? 'border-accent/40 bg-white/5'
                        : 'border-border hover:border-border-hover'
                    }`}
                  >
                    <p className="text-sm font-medium">{bt.label}</p>
                    <p className="text-xs text-accent-dim">{bt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-3 block text-sm font-medium text-accent-muted">Height range</label>
              <div className="space-y-2">
                {HEIGHT_RANGES.map((h) => (
                  <button
                    key={h.value}
                    onClick={() => setHeightRange(h.value)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      heightRange === h.value
                        ? 'border-accent/40 bg-white/5 font-medium'
                        : 'border-border text-accent-muted hover:border-border-hover'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Skin undertone */}
        {step === 1 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-accent-muted">Skin undertone</label>
            <p className="mb-4 text-xs text-accent-dim">
              Tip: look at the veins on your inner wrist under natural light.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {UNDERTONES.map((u) => (
                <button
                  key={u.value}
                  onClick={() => setSkinUndertone(u.value)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    skinUndertone === u.value
                      ? 'border-accent/40 bg-white/5'
                      : 'border-border hover:border-border-hover'
                  }`}
                >
                  <p className="mb-1 text-sm font-medium">{u.label}</p>
                  <p className="text-xs text-accent-dim leading-relaxed">{u.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Style vibe + fit preference */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-accent-muted">Style vibe</label>
              <div className="flex flex-wrap gap-2">
                {STYLE_VIBES.map((sv) => (
                  <button
                    key={sv.value}
                    onClick={() => setStyleVibe(sv.value)}
                    className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                      styleVibe === sv.value
                        ? 'border-accent/40 bg-white/5 font-medium'
                        : 'border-border text-accent-muted hover:border-border-hover'
                    }`}
                  >
                    {sv.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-3 block text-sm font-medium text-accent-muted">Fit preference</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {FIT_PREFS.map((fp) => (
                  <button
                    key={fp.value}
                    onClick={() => setFitPreference(fp.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      fitPreference === fp.value
                        ? 'border-accent/40 bg-white/5'
                        : 'border-border hover:border-border-hover'
                    }`}
                  >
                    <p className="text-sm font-medium">{fp.label}</p>
                    <p className="text-xs text-accent-dim">{fp.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Favorite colors */}
        {step === 3 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-accent-muted">
              Favorite colors
            </label>
            <p className="mb-4 text-xs text-accent-dim">
              Pick colors you love wearing. Up to 10. These get priority in outfit picks.
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleColor(c, favoriteColors, setFavoriteColors)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    favoriteColors.includes(c)
                      ? 'border-accent/40 bg-white/10 font-medium text-accent'
                      : 'border-border text-accent-dim hover:border-border-hover hover:text-accent-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {favoriteColors.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {favoriteColors.map((c) => (
                  <Badge key={c} variant="accent" onRemove={() => toggleColor(c, favoriteColors, setFavoriteColors)}>
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Avoid colors + review + save */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-accent-muted">
                Colors to avoid
              </label>
              <p className="mb-4 text-xs text-accent-dim">
                Colors that don&apos;t work for you. These get deprioritized. Up to 10.
              </p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.filter((c) => !favoriteColors.includes(c)).map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleColor(c, avoidColors, setAvoidColors)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      avoidColors.includes(c)
                        ? 'border-red-500/30 bg-red-500/5 text-red-400'
                        : 'border-border text-accent-dim hover:border-border-hover hover:text-accent-muted'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {avoidColors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {avoidColors.map((c) => (
                    <Badge key={c} onRemove={() => toggleColor(c, avoidColors, setAvoidColors)}>
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Review summary */}
            <div className="rounded-xl border border-border bg-surface-raised p-4">
              <h3 className="mb-3 text-sm font-semibold">Review your profile</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-accent-dim">Body:</span>{' '}
                  <span className="text-accent-muted">{bodyType}</span>
                </div>
                <div>
                  <span className="text-accent-dim">Height:</span>{' '}
                  <span className="text-accent-muted">{heightRange.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-accent-dim">Undertone:</span>{' '}
                  <span className="text-accent-muted">{skinUndertone}</span>
                </div>
                <div>
                  <span className="text-accent-dim">Vibe:</span>{' '}
                  <span className="text-accent-muted">{styleVibe}</span>
                </div>
                <div>
                  <span className="text-accent-dim">Fit:</span>{' '}
                  <span className="text-accent-muted">{fitPreference}</span>
                </div>
                <div>
                  <span className="text-accent-dim">Fav colors:</span>{' '}
                  <span className="text-accent-muted">{favoriteColors.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost text-sm"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="btn-primary text-sm"
            >
              Continue →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
