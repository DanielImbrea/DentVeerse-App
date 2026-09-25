/**
 * Extracted during the code-quality audit (docs/17-implementation-status.md
 * §27) — this exact logic was previously duplicated verbatim in
 * apps/mobile/app/(onboarding)/clinic/profile.tsx and
 * apps/mobile/app/(onboarding)/laboratory/profile.tsx. Both now import
 * from here instead.
 *
 * Produces a URL-safe slug from a display name, e.g. "Clinica Dr. Popescu"
 * -> "clinica-dr-popescu". Does NOT guarantee uniqueness — the caller is
 * responsible for handling a `clinics.slug`/`laboratories.slug` unique-
 * constraint violation (see the two onboarding screens' error handling).
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (ă, â, î, ș, ț -> a, a, i, s, t)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
