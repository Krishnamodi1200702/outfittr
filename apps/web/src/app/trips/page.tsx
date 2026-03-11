'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Modal, Badge, EmptyState } from '@/components/ui';
import { TripForm } from '@/components/trips/trip-form';
import { api } from '@/lib/api';
import type { Trip, CreateTripRequest } from '@outfittr/shared';
import { formatDateRange, daysBetween } from '@/lib/utils';

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.listTrips().then(setTrips).finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: CreateTripRequest) {
    const trip = await api.createTrip(data);
    setTrips((prev) => [trip, ...prev]);
    setShowCreate(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trip and all its data?')) return;
    await api.deleteTrip(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <AppShell>
      <div className="animate-fade-in">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trips</h1>
            <p className="mt-1 text-sm text-accent-dim">
              {trips.length} trip{trips.length !== 1 ? 's' : ''} planned
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            + Plan a trip
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon="✈️"
            title="No trips yet"
            description="Plan your first trip and we'll help you pack the perfect wardrobe."
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
                + Plan first trip
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="card group relative transition-colors hover:border-border-hover"
              >
                <Link href={`/trips/${trip.id}`} className="block">
                  <div className="mb-3">
                    <h3 className="font-medium">{trip.name}</h3>
                    <p className="text-sm text-accent-dim">{trip.location}</p>
                  </div>
                  <div className="mb-3 flex items-center gap-3 text-xs text-accent-muted">
                    <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                    <span className="text-accent-dim">·</span>
                    <span>{daysBetween(trip.startDate, trip.endDate)} days</span>
                  </div>
                  {trip.activities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {trip.activities.map((a) => (
                        <Badge key={a}>{a}</Badge>
                      ))}
                    </div>
                  )}
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(trip.id);
                  }}
                  className="absolute right-4 top-4 rounded p-1 text-xs text-accent-dim opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/5 transition-all"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Plan a trip">
          <TripForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      </div>
    </AppShell>
  );
}
