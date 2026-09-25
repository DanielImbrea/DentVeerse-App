import { SITE } from '@dental/config/site';

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display text-3xl text-text-primary">Termeni și condiții</h1>
      <p className="text-text-secondary mt-4">
        Document provizoriu — necesită review juridic. Platforma este un serviciu de networking și
        discovery dentar; nu înlocuiește relația medicală pacient–medic.
      </p>
      <p className="mt-4 text-text-secondary">
        Contact:{' '}
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
