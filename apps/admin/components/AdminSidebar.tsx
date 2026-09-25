'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { s } from '../lib/strings';

const NAV = [
  { href: '/overview', label: s.nav.overview, icon: '◉' },
  { href: '/users', label: s.nav.users, icon: '👤' },
  { href: '/clinics', label: s.nav.clinics, icon: '🦷' },
  { href: '/laboratories', label: s.nav.laboratories, icon: '🧪' },
  { href: '/posts', label: s.nav.posts, icon: '📝' },
  { href: '/comments', label: s.nav.comments, icon: '💬' },
  { href: '/reviews', label: s.nav.reviews, icon: '★' },
  { href: '/reports', label: s.nav.reports, icon: '⚑' },
  { href: '/verifications', label: s.nav.verifications, icon: '✓' },
];

export function AdminSidebar({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-surface-dark text-white flex flex-col min-h-screen">
      <div className="px-6 py-8 border-b border-white/10">
        <p className="font-display text-lg font-semibold tracking-tight">{s.appName}</p>
        <p className="text-white/60 text-xs mt-1">{s.appSubtitle}</p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-primary text-white font-medium shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-base w-5 text-center" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={signOutAction} className="px-3 py-4 border-t border-white/10">
        <button
          type="submit"
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-error/20 hover:text-red-200 transition-colors"
        >
          <span className="w-5 text-center" aria-hidden>
            ↪
          </span>
          {s.nav.signOut}
        </button>
      </form>
    </aside>
  );
}
