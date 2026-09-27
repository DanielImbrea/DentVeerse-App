import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { revalidatePath } from 'next/cache';
import { PageHeader } from '../../../components/PageHeader';
import { SearchBar } from '../../../components/SearchBar';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import { formatAccountType, formatDate, formatUserStatus, s } from '../../../lib/strings';
import { toAuditJson } from '../../../lib/auditJson';

export default async function UsersPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireAdmin();

  const supabase = createAdminClient();
  const query = searchParams.q ?? '';

  let dbQuery = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(50);
  if (query) dbQuery = dbQuery.or(`email.ilike.%${query}%,phone.ilike.%${query}%`);

  const { data: users } = await dbQuery;

  async function toggleSuspend(formData: FormData) {
    'use server';
    const { adminId } = await requireAdmin();

    const userId = formData.get('userId') as string;
    const newStatus = formData.get('newStatus') as 'active' | 'suspended';

    const admin = createAdminClient();
    const { data: before } = await admin.from('users').select('*').eq('id', userId).single();

    await admin.from('users').update({ status: newStatus }).eq('id', userId);

    await admin.from('audit_logs').insert({
      admin_id: adminId,
      action: newStatus === 'suspended' ? 'user_suspended' : 'user_restored',
      target_type: 'users',
      target_id: userId,
      before: toAuditJson(before),
      after: { status: newStatus },
    });

    revalidatePath('/users');
  }

  return (
    <main className="p-8 lg:p-10">
      <PageHeader title={s.users.title} description={s.users.description} />
      <SearchBar placeholder={s.users.searchPlaceholder} defaultValue={query} />

      <div className="admin-table">
        <table className="w-full">
          <thead>
            <tr>
              <th>{s.users.email}</th>
              <th>{s.users.type}</th>
              <th>{s.users.status}</th>
              <th>{s.users.created}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id}>
                <td className="font-medium">{user.email}</td>
                <td>{formatAccountType(user.account_type)}</td>
                <td>
                  <StatusBadge
                    status={formatUserStatus(user.status)}
                    variant={user.status === 'suspended' ? 'error' : 'success'}
                  />
                </td>
                <td className="text-text-secondary">{formatDate(user.created_at)}</td>
                <td className="text-right">
                  <form action={toggleSuspend}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="newStatus" value={user.status === 'suspended' ? 'active' : 'suspended'} />
                    <ActionButton
                      type="submit"
                      variant={user.status === 'suspended' ? 'success' : 'danger'}
                      tooltip={user.status === 'suspended' ? s.tooltips.restoreUser : s.tooltips.suspendUser}
                    >
                      {user.status === 'suspended' ? s.actions.restore : s.actions.suspend}
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
