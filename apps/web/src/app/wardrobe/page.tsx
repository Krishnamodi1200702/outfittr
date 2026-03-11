'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Modal, Badge, EmptyState } from '@/components/ui';
import { WardrobeItemForm } from '@/components/wardrobe/item-form';
import { api } from '@/lib/api';
import type { WardrobeItem, CreateWardrobeItemRequest } from '@outfittr/shared';
import { CATEGORY_LABELS, FORMALITY_LABELS } from '@/lib/utils';

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<WardrobeItem | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.listWardrobe().then(setItems).finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: CreateWardrobeItemRequest) {
    const item = await api.createWardrobeItem(data);
    setItems((prev) => [item, ...prev]);
    setShowCreate(false);
  }

  async function handleUpdate(data: CreateWardrobeItemRequest) {
    if (!editing) return;
    const updated = await api.updateWardrobeItem(editing.id, data);
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return;
    await api.deleteWardrobeItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const categories = ['all', ...new Set(items.map((i) => i.category))];
  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);

  return (
    <AppShell>
      <div className="animate-fade-in">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Wardrobe</h1>
            <p className="mt-1 text-sm text-accent-dim">
              {items.length} item{items.length !== 1 ? 's' : ''} in your closet
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            + Add item
          </button>
        </div>

        {/* Filter */}
        {items.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === cat
                    ? 'border-accent/30 bg-white/10 text-accent'
                    : 'border-border text-accent-dim hover:border-border-hover hover:text-accent-muted'
                }`}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="👕"
            title="Your wardrobe is empty"
            description="Add your first clothing item to start building outfits."
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
                + Add first item
              </button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="card group relative transition-colors hover:border-border-hover"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-accent-dim">
                      {CATEGORY_LABELS[item.category]} · {FORMALITY_LABELS[item.formality]}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditing(item)}
                      className="rounded p-1 text-xs text-accent-dim hover:text-accent hover:bg-surface-subtle transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1 text-xs text-accent-dim hover:text-red-400 hover:bg-red-500/5 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.colors.map((c) => (
                    <Badge key={c}>{c}</Badge>
                  ))}
                  {item.seasonTags.map((s) => (
                    <Badge key={s} variant="accent">{s}</Badge>
                  ))}
                </div>
                {item.notes && (
                  <p className="mt-2 text-xs text-accent-dim leading-relaxed line-clamp-2">
                    {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add wardrobe item">
          <WardrobeItemForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>

        {/* Edit modal */}
        <Modal
          open={!!editing}
          onClose={() => setEditing(null)}
          title="Edit wardrobe item"
        >
          {editing && (
            <WardrobeItemForm
              initial={editing}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
