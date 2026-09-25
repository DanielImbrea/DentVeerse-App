import { SITE } from '@dental/config/site';
import { SiteLogo } from '../components/SiteLogo';

/**
 * Marketing homepage placeholder. Real content/SEO work (clinic/lab public
 * profile pages for discoverability, landing sections) is scoped alongside
 * the mobile-app phases that create the underlying data (Phases 4-9) — the
 * web marketing site reads the same public tables via RLS, no separate
 * backend. See docs/01-architecture.md §1.
 *
 * Brand mark: `/public/dentveerse-mark.svg` (icon only, no text).
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8 gap-4">
      <SiteLogo size={160} className="h-40 w-40" />
      <h1 className="font-display text-5xl text-text-primary">DentalConnect</h1>
      <p className="text-text-secondary text-lg text-center max-w-xl">
        Ecosistemul profesional dedicat domeniului dentar — pacienți, clinici și laboratoare de
        tehnică dentară, într-un singur loc.
      </p>
      <a
        href={`mailto:${SITE.contactEmail}`}
        className="text-primary font-medium hover:underline"
      >
        {SITE.contactEmail}
      </a>
      <footer className="mt-12 text-sm text-text-secondary flex flex-wrap gap-x-4 gap-y-2 justify-center">
        <a href="/privacy" className="hover:underline">
          Confidențialitate
        </a>
        <a href="/terms" className="hover:underline">
          Termeni
        </a>
        <a href="/cookie-policy" className="hover:underline">
          Cookie
        </a>
      </footer>
    </main>
  );
}
