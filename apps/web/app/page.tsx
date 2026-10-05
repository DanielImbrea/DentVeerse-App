import { SITE } from '@dental/config/site';
import { SiteLogo } from '../components/SiteLogo';

const features = [
  {
    title: 'Găsire pacienți',
    body: 'Profil pe hartă, căutare după oraș și specializare, recenzii și badge verificat.',
  },
  {
    title: 'Portofoliu & feed',
    body: 'Lucrări before/after, video, echipă și servicii — mai mult decât un site static.',
  },
  {
    title: 'Colaborări B2B',
    body: 'Oportunități și mesaje direct între clinici și laboratoare.',
  },
];

export default function HomePage() {
  const iosStore = SITE.storeUrls.ios;
  const androidStore = SITE.storeUrls.android;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex flex-col items-center px-8 pt-16 pb-10 text-center gap-4">
        <SiteLogo size={120} className="h-28 w-28" />
        <p className="text-sm uppercase tracking-widest text-text-secondary">{SITE.brandName}</p>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary max-w-2xl">
          {SITE.productName}
        </h1>
        <p className="text-text-secondary text-lg max-w-xl">
          Ecosistemul profesional dedicat domeniului dentar — pacienți, clinici și laboratoare, într-un
          singur loc.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          {iosStore ? (
            <a
              href={iosStore}
              className="rounded-full bg-primary text-white px-6 py-3 font-medium hover:opacity-90"
            >
              App Store
            </a>
          ) : (
            <span className="rounded-full border border-border px-6 py-3 text-text-secondary">
              iOS — în curând (TestFlight)
            </span>
          )}
          {androidStore ? (
            <a
              href={androidStore}
              className="rounded-full bg-primary text-white px-6 py-3 font-medium hover:opacity-90"
            >
              Google Play
            </a>
          ) : (
            <span className="rounded-full border border-border px-6 py-3 text-text-secondary">
              Android — în curând
            </span>
          )}
        </div>
        <a href={`mailto:${SITE.contactEmail}`} className="text-primary font-medium hover:underline mt-2">
          {SITE.contactEmail}
        </a>
      </header>

      <section className="px-8 pb-12 max-w-4xl mx-auto w-full grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <article key={f.title} className="border border-border rounded-2xl p-6 bg-surface/50">
            <h2 className="font-semibold text-lg text-text-primary">{f.title}</h2>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">{f.body}</p>
          </article>
        ))}
      </section>

      <footer className="mt-auto py-8 text-sm text-text-secondary flex flex-wrap gap-x-4 gap-y-2 justify-center border-t border-border">
        <a href={SITE.legalPaths.privacy} className="hover:underline">
          Confidențialitate
        </a>
        <a href={SITE.legalPaths.terms} className="hover:underline">
          Termeni
        </a>
        <a href={SITE.legalPaths.cookies} className="hover:underline">
          Cookie
        </a>
      </footer>
    </main>
  );
}
