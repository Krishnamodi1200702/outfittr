'use client';

interface Props {
  src: string | null | undefined;
  alt: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

export function ItemThumbnail({ src, alt, fallback, size = 'md' }: Props) {
  const sizeClass = sizes[size];

  if (src) {
    return (
      <div className={`${sizeClass} shrink-0 overflow-hidden rounded-md border border-border bg-surface-subtle`}>
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 flex items-center justify-center rounded-md bg-surface-subtle border border-border text-accent-dim`}
    >
      <span className={size === 'sm' ? 'text-[10px]' : 'text-xs'}>
        {fallback || '👕'}
      </span>
    </div>
  );
}
