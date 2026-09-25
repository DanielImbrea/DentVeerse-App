import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { revalidatePath } from 'next/cache';
import { PageHeader } from '../../../components/PageHeader';
import { SearchBar } from '../../../components/SearchBar';
import { StatusBadge, VerifiedBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import { formatUserStatus, s } from '../../../lib/strings';

export default async function ClinicsPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireAdmin();

  const supabase = createAdminClient();
  const query = searchParams.q ?? '';

  let dbQuery = supabase.from('clinics').select('*').order('created_at', { ascending: false }).limit(50);
  if (query) dbQuery = dbQuery.ilike('name', `%${query}%`);

  const { data: clinics } = await dbQuery;

  async function toggleSuspend(formData: FormData) {
    'use server';
    const { adminId } = await requireAdmin();

    const clinicId = formData.get('clinicId') as string;
    const newStatus = formData.get('newStatus') as 'active' | 'suspended';

    const admin = createAdminClient();
    const { data: before } = await admin.from('clinics').select('*').eq('id', clinicId).single();

    await admin.from('clinics').update({ status: newStatus }).eq('id', clinicId);

    await admin.from('audit_logs').insert({
      admin_id: adminId,
      action: newStatus === 'suspended' ? 'clinic_suspended' : 'clinic_restored',
      target_type: 'clinics',
      target_id: clinicId,
      before,
      after: { status: newStatus },
    });

    revalidatePath('/clinics');
  }

  return (
    <main className="p-8 lg:p-10">
      <PageHeader title={s.clinics.title} description={s.clinics.description} />
      <SearchBar placeholder={s.clinics.searchPlaceholder} defaultValue={query} />

      <div className="admin-table">
        <table className="w-full">
          <thead>
            <tr>
              <th>{s.clinics.name}</th>
              <th>{s.clinics.city}</th>
              <th>{s.clinics.verified}</th>
              <th>{s.clinics.rating}</th>
              <th>{s.clinics.status}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(clinics ?? []).map((clinic) => (
              <tr key={clinic.id}>
                <td className="font-medium">{clinic.name}</td>
                <td>{clinic.city}</td>
                <td>
                  <VerifiedBadge verified={clinic.is_verified} />
                </td>
                <td className="text-text-secondary">
                  {clinic.rating_avg.toFixed(1)} ({clinic.rating_count})
                </td>
                <td>
                  <StatusBadge
                    status={formatUserStatus(clinic.status)}
                    variant={clinic.status === 'suspended' ? 'error' : 'success'}
                  />
                </td>
                <td className="text-right">
                  <form action={toggleSuspend}>
                    <input type="hidden" name="clinicId" value={clinic.id} />
                    <input type="hidden" name="newStatus" value={clinic.status === 'suspended' ? 'active' : 'suspended'} />
                    <ActionButton
                      type="submit"
                      variant={clinic.status === 'suspended' ? 'success' : 'danger'}
                      tooltip={clinic.status === 'suspended' ? s.tooltips.restoreClinic : s.tooltips.suspendClinic}
                    >
                      {clinic.status === 'suspended' ? s.actions.restore : s.actions.suspend}
                    </ActionButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
