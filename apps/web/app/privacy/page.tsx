import { SITE } from '@dental/config/site';

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 prose prose-neutral">
      <h1 className="font-display text-3xl text-text-primary">Politica de confidențialitate</h1>
      <p className="text-text-secondary">
        Document provizoriu — necesită review juridic înainte de lansare publică largă. Ultima
        actualizare: septembrie 2026.
      </p>
      <p>
        {SITE.brandName} ({SITE.productName}) procesează datele contului (email, profil, mesaje,
        conținut publicat) prin Supabase. Nu stocăm dosare medicale. Pentru exercitarea drepturilor
        GDPR (acces, ștergere) folosește setările din aplicație sau scrie-ne la{' '}
        <a href={`mailto:${SITE.contactEmail}`} className="text-primary">
          {SITE.contactEmail}
        </a>
        .
      </p>
      <p>
        <a href="/" className="text-primary">
          ← Înapoi
        </a>
      </p>
    </main>
  );
}
