'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Subtle gradient orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-white/[0.02] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full bg-white/[0.015] blur-3xl" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <span className="text-lg font-semibold tracking-tight">outfittr</span>
        <Link href="/auth" className="btn-secondary text-sm">
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1 text-xs text-accent-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Now in beta
          </div>
          <h1 className="mb-5 text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Pack smarter.
            <br />
            <span className="text-accent-muted">Travel lighter.</span>
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-accent-dim">
            Build your digital wardrobe, plan trips, and get AI-curated outfits for every
            day — based on weather, activities, and your style.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth?tab=register" className="btn-primary text-sm">
              Get started free
            </Link>
            <Link href="#features" className="btn-ghost text-sm">
              Learn more ↓
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">How it works</h2>
            <p className="text-accent-dim">Three steps to stress-free packing.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                num: '01',
                title: 'Build your wardrobe',
                desc: 'Add your clothing items with details like category, color, season, and formality level.',
              },
              {
                num: '02',
                title: 'Plan your trip',
                desc: 'Enter your destination, dates, and planned activities. We pull weather data automatically.',
              },
              {
                num: '03',
                title: 'Get outfit plans',
                desc: 'Receive curated daily outfits from your own wardrobe, matched to weather and occasion.',
              },
            ].map((f) => (
              <div key={f.num} className="card group">
                <span className="mb-4 block font-mono text-xs text-accent-dim">{f.num}</span>
                <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-accent-dim">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">Ready to pack smarter?</h2>
          <p className="mb-8 text-accent-dim">
            Join the beta and never overpack again.
          </p>
          <Link href="/auth?tab=register" className="btn-primary">
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-accent-dim">
          © {new Date().getFullYear()} Outfittr. Built with care.
        </div>
      </footer>
    </div>
  );
}
