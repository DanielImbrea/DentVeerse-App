'use client';

import Link from 'next/link';
import { s } from '../../lib/strings';

export default function DashboardError({ error }: { error: Error & { digest?: string } }) {
  const isUnauthorized = error.name === 'UnauthorizedError';

  return (
    <main className="min-h-screen flex items-center justify-center px-8 bg-background">
      <div className="admin-card max-w-sm p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">
          {isUnauthorized ? s.errors.accessDenied : s.errors.somethingWrong}
        </h1>
        <p className="text-text-secondary text-sm mb-6">
          {isUnauthorized ? s.errors.noAdminAccessDetail : s.errors.unexpected}
        </p>
        <Link href="/login" className="admin-btn-primary underline underline-offset-2">
          {s.errors.goToLogin}
        </Link>
      </div>
    </main>
  );
}
