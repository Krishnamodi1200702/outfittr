'use client';

import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

// ── Input ────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-accent-muted">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';

// ── Select ───────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-accent-muted">{label}</label>
      )}
      <select className={`w-full ${className}`} {...props}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────
export function Badge({
  children,
  variant = 'default',
  onRemove,
}: {
  children: ReactNode;
  variant?: 'default' | 'accent';
  onRemove?: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
        variant === 'accent'
          ? 'bg-white/10 text-accent'
          : 'bg-surface-subtle text-accent-muted'
      }`}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:text-red-400 transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
}

// ── Modal ────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-surface-raised p-6 shadow-2xl animate-slide-up">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-accent-dim hover:text-accent transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="mb-4 text-4xl">{icon}</span>
      <h3 className="mb-1.5 text-lg font-medium text-accent">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-accent-dim">{description}</p>
      {action}
    </div>
  );
}
