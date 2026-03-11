'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfigured = CLOUD_NAME && UPLOAD_PRESET;

  function validate(file: File): string | null {
    if (!ALLOWED_TYPES.has(file.type)) return 'Only JPG, PNG, and WebP files are allowed.';
    if (file.size > MAX_SIZE) return 'File must be under 5 MB.';
    return null;
  }

  async function upload(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isConfigured) {
      setError('Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', UPLOAD_URL);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error?.message || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      onChange(result.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  // If we already have an image
  if (value) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-accent-muted">Image</label>
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-subtle">
            <img
              src={value}
              alt="Item"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              className="text-xs text-accent-muted hover:text-accent transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled || uploading}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  // Empty state — drop zone
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-accent-muted">Image (optional)</label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 transition-colors ${
          dragOver
            ? 'border-accent/40 bg-white/5'
            : 'border-border hover:border-border-hover'
        } ${disabled || uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        {uploading ? (
          <>
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-accent-muted border-t-transparent" />
            <p className="text-xs text-accent-muted">Uploading… {progress}%</p>
            <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-surface-subtle">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <span className="mb-1 text-xl text-accent-dim">📷</span>
            <p className="text-xs text-accent-muted">
              Drop an image here or <span className="text-accent">browse</span>
            </p>
            <p className="mt-0.5 text-[10px] text-accent-dim">JPG, PNG, WebP · max 5 MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/** Whether the upload component is currently uploading (exposed for form submit disable) */
export function useImageUploadState() {
  const [uploading, setUploading] = useState(false);
  return { uploading, setUploading };
}
