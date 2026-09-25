import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { PageHeader } from '../../../components/PageHeader';
import { StatCard } from '../../../components/StatCard';
import { s } from '../../../lib/strings';

export default async function OverviewPage() {
  await requireAdmin();

  const supabase = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalClinics },
    { count: totalLaboratories },
    { count: totalPatients },
    { count: pendingVerifications },
    { count: openReports },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('clinics').select('id', { count: 'exact', head: true }),
    supabase.from('laboratories').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('account_type', 'patient'),
    supabase.from('verification_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  const cards = [
    { label: s.overview.totalUsers, value: totalUsers ?? 0 },
    { label: s.overview.patients, value: totalPatients ?? 0 },
    { label: s.overview.clinics, value: totalClinics ?? 0 },
    { label: s.overview.laboratories, value: totalLaboratories ?? 0 },
    {
      label: s.overview.pendingVerifications,
      value: pendingVerifications ?? 0,
      href: '/verifications',
      accent: 'warning' as const,
    },
    { label: s.overview.openReports, value: openReports ?? 0, href: '/reports', accent: 'error' as const },
  ];

  return (
    <main className="p-8 lg:p-10">
      <PageHeader title={s.overview.title} description={s.overview.description} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
      <p className="text-text-secondary text-sm mt-10 max-w-2xl leading-relaxed">{s.overview.monetizationNote}</p>
    </main>
  );
}
