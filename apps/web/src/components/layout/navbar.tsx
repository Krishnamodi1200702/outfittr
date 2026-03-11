'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { usePathname, useRouter } from 'next/navigation';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) =>
    pathname === path ? 'text-accent' : 'text-accent-muted hover:text-accent';

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-accent">
            outfittr
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            <Link
              href="/dashboard"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isActive('/dashboard')}`}
            >
              Dashboard
            </Link>
            <Link
              href="/wardrobe"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isActive('/wardrobe')}`}
            >
              Wardrobe
            </Link>
            <Link
              href="/trips"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isActive('/trips')}`}
            >
              Trips
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-accent-dim">{user.name}</span>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="text-sm text-accent-muted hover:text-accent transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
