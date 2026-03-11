'use client';

import { useState, FormEvent } from 'react';
import type { CreateTripRequest } from '@outfittr/shared';
import { Input, Badge } from '@/components/ui';

const ACTIVITY_SUGGESTIONS = [
  'sightseeing',
  'dining',
  'hiking',
  'beach',
  'business',
  'nightlife',
  'shopping',
  'museums',
  'sports',
  'photography',
];

interface Props {
  onSubmit: (data: CreateTripRequest) => Promise<void>;
  onCancel: () => void;
}

export function TripForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [activityInput, setActivityInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addActivity(a: string) {
    const cleaned = a.trim().toLowerCase();
    if (cleaned && !activities.includes(cleaned)) {
      setActivities([...activities, cleaned]);
    }
    setActivityInput('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit({ name, location, startDate, endDate, activities });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip');
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
        label="Trip name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Summer in Paris"
        required
      />

      <Input
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="e.g. Paris, France"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
        <Input
          label="End date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          min={startDate}
          required
        />
      </div>

      {/* Activities */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-accent-muted">Activities</label>
        <div className="flex gap-2">
          <input
            value={activityInput}
            onChange={(e) => setActivityInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addActivity(activityInput);
              }
            }}
            placeholder="Type or pick below"
            className="flex-1"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {ACTIVITY_SUGGESTIONS.filter((a) => !activities.includes(a)).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => addActivity(a)}
              className="rounded-md border border-border px-2 py-0.5 text-xs text-accent-dim hover:border-border-hover hover:text-accent-muted transition-colors"
            >
              + {a}
            </button>
          ))}
        </div>
        {activities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activities.map((a) => (
              <Badge
                key={a}
                variant="accent"
                onRemove={() => setActivities(activities.filter((x) => x !== a))}
              >
                {a}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary text-sm">
          {loading ? 'Creating…' : 'Create trip'}
        </button>
      </div>
    </form>
  );
}
