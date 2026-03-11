'use client';

import { useState, FormEvent } from 'react';
import type { WardrobeItem, CreateWardrobeItemRequest, ClothingCategory, Formality, Season } from '@outfittr/shared';
import { Input, Select, Badge } from '@/components/ui';
import { CATEGORY_LABELS, FORMALITY_LABELS } from '@/lib/utils';

const SEASON_OPTIONS: Season[] = ['spring', 'summer', 'fall', 'winter'];

interface Props {
  initial?: WardrobeItem;
  onSubmit: (data: CreateWardrobeItemRequest) => Promise<void>;
  onCancel: () => void;
}

export function WardrobeItemForm({ initial, onSubmit, onCancel }: Props) {
  const [category, setCategory] = useState<string>(initial?.category || '');
  const [name, setName] = useState(initial?.name || '');
  const [colorInput, setColorInput] = useState('');
  const [colors, setColors] = useState<string[]>(initial?.colors || []);
  const [seasonTags, setSeasonTags] = useState<string[]>(initial?.seasonTags || []);
  const [formality, setFormality] = useState<string>(initial?.formality || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addColor() {
    const c = colorInput.trim().toLowerCase();
    if (c && !colors.includes(c)) {
      setColors([...colors, c]);
    }
    setColorInput('');
  }

  function toggleSeason(s: string) {
    setSeasonTags((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: CreateWardrobeItemRequest = {
        category: category as ClothingCategory,
        name,
        colors,
        seasonTags: seasonTags as Season[],
        formality: formality as Formality,
        ...(notes && { notes }),
        ...(imageUrl && { imageUrl }),
      };
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Blue Oxford Shirt"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          required
        />
        <Select
          label="Formality"
          value={formality}
          onChange={(e) => setFormality(e.target.value)}
          options={Object.entries(FORMALITY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          required
        />
      </div>

      {/* Colors */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-accent-muted">Colors</label>
        <div className="flex gap-2">
          <input
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addColor();
              }
            }}
            placeholder="Type a color, press Enter"
            className="flex-1"
          />
          <button type="button" onClick={addColor} className="btn-secondary text-sm px-3">
            Add
          </button>
        </div>
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {colors.map((c) => (
              <Badge key={c} variant="accent" onRemove={() => setColors(colors.filter((x) => x !== c))}>
                {c}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Seasons */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-accent-muted">Seasons</label>
        <div className="flex flex-wrap gap-2">
          {SEASON_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSeason(s)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                seasonTags.includes(s)
                  ? 'border-accent/30 bg-white/10 text-accent'
                  : 'border-border text-accent-dim hover:border-border-hover'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://..."
        type="url"
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-accent-muted">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this item..."
          rows={2}
          className="w-full resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary text-sm">
          {loading ? 'Saving…' : initial ? 'Update' : 'Add item'}
        </button>
      </div>
    </form>
  );
}
