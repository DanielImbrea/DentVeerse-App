import { SITE } from '@dental/config/site';

export default function CookiePolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display text-3xl text-text-primary">Politica de cookie-uri</h1>
      <p className="text-text-secondary mt-4">
        Folosim cookie-uri esențiale pentru funcționarea site-ului. Cookie-urile analitice (dacă sunt
        activate) necesită consimțământul tău prin bannerul de pe site.
      </p>
      <p className="mt-4 text-text-secondary">
        Întrebări:{' '}
        <a href={`mailto:${SITE.contactEmail}`} className="text-primary">
          {SITE.contactEmail}
        </a>
      </p>
      <p className="mt-8">
        <a href="/" className="text-primary">
          ← Înapoi
        </a>
      </p>
    </main>
  );
}
