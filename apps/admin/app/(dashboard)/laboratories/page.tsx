import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { revalidatePath } from 'next/cache';
import { PageHeader } from '../../../components/PageHeader';
import { SearchBar } from '../../../components/SearchBar';
import { StatusBadge, VerifiedBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import { formatUserStatus, s } from '../../../lib/strings';

export default async function LaboratoriesPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireAdmin();

  const supabase = createAdminClient();
  const query = searchParams.q ?? '';

  let dbQuery = supabase.from('laboratories').select('*').order('created_at', { ascending: false }).limit(50);
  if (query) dbQuery = dbQuery.ilike('name', `%${query}%`);

  const { data: laboratories } = await dbQuery;

  async function toggleSuspend(formData: FormData) {
    'use server';
    const { adminId } = await requireAdmin();

    const laboratoryId = formData.get('laboratoryId') as string;
    const newStatus = formData.get('newStatus') as 'active' | 'suspended';

    const admin = createAdminClient();
    const { data: before } = await admin.from('laboratories').select('*').eq('id', laboratoryId).single();

    await admin.from('laboratories').update({ status: newStatus }).eq('id', laboratoryId);

    await admin.from('audit_logs').insert({
      admin_id: adminId,
      action: newStatus === 'suspended' ? 'laboratory_suspended' : 'laboratory_restored',
      target_type: 'laboratories',
      target_id: laboratoryId,
      before,
      after: { status: newStatus },
    });

    revalidatePath('/laboratories');
  }

  return (
    <main className="p-8 lg:p-10">
      <PageHeader title={s.laboratories.title} description={s.laboratories.description} />
      <SearchBar placeholder={s.laboratories.searchPlaceholder} defaultValue={query} />

      <div className="admin-table">
        <table className="w-full">
          <thead>
            <tr>
              <th>{s.laboratories.name}</th>
              <th>{s.laboratories.city}</th>
              <th>{s.laboratories.zone}</th>
              <th>{s.laboratories.verified}</th>
              <th>{s.laboratories.status}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(laboratories ?? []).map((lab) => (
              <tr key={lab.id}>
                <td className="font-medium">{lab.name}</td>
                <td>{lab.city}</td>
                <td>{lab.collaboration_zone}</td>
                <td>
                  <VerifiedBadge verified={lab.is_verified} />
                </td>
                <td>
                  <StatusBadge
                    status={formatUserStatus(lab.status)}
                    variant={lab.status === 'suspended' ? 'error' : 'success'}
                  />
                </td>
                <td className="text-right">
                  <form action={toggleSuspend}>
                    <input type="hidden" name="laboratoryId" value={lab.id} />
                    <input type="hidden" name="newStatus" value={lab.status === 'suspended' ? 'active' : 'suspended'} />
                    <ActionButton
                      type="submit"
                      variant={lab.status === 'suspended' ? 'success' : 'danger'}
                      tooltip={lab.status === 'suspended' ? s.tooltips.restoreLab : s.tooltips.suspendLab}
                    >
                      {lab.status === 'suspended' ? s.actions.restore : s.actions.suspend}
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
