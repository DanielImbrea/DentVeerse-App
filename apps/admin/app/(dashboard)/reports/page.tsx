import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { revalidatePath } from 'next/cache';
import { ContentCard, EmptyState } from '../../../components/ContentCard';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import { formatDateTime, formatReportReason, formatReportTarget, getAdminReportPath, s } from '../../../lib/strings';
import Link from 'next/link';

export default async function ReportsPage() {
  await requireAdmin();

  const supabase = createAdminClient();

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  async function resolveReport(formData: FormData) {
    'use server';
    const { adminId } = await requireAdmin();

    const reportId = formData.get('reportId') as string;
    const action = formData.get('action') as 'resolved_actioned' | 'resolved_dismissed';

    const admin = createAdminClient();

    const { data: before } = await admin.from('reports').select('*').eq('id', reportId).single();

    await admin
      .from('reports')
      .update({ status: action, resolved_by_admin_id: adminId, resolved_at: new Date().toISOString() })
      .eq('id', reportId);

    await admin.from('audit_logs').insert({
      admin_id: adminId,
      action: `report_${action}`,
      target_type: before?.target_type ?? 'unknown',
      target_id: before?.target_id ?? null,
      before,
      after: { status: action },
    });

    revalidatePath('/reports');
  }

  return (
    <main className="p-8 lg:p-10">
      <PageHeader title={s.reports.title} description={s.reports.description} />
      <div className="flex flex-col gap-4">
        {(reports ?? []).map((report) => (
          <ContentCard key={report.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={formatReportTarget(report.target_type)} variant="neutral" />
                <StatusBadge status={formatReportReason(report.reason)} variant="warning" />
              </div>
              {report.note ? <p className="text-text-secondary text-sm">{report.note}</p> : null}
              <p className="text-text-secondary text-xs mt-2">
                ID: <span className="font-mono">{report.target_id}</span>
              </p>
              {getAdminReportPath(report.target_type, report.target_id) ? (
                <Link
                  href={getAdminReportPath(report.target_type, report.target_id)!}
                  className="inline-block text-primary text-sm font-medium mt-2 hover:underline"
                >
                  Deschide secțiunea →
                </Link>
              ) : null}
              <p className="text-text-secondary text-xs mt-2">{formatDateTime(report.created_at)}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <form action={resolveReport}>
                <input type="hidden" name="reportId" value={report.id} />
                <input type="hidden" name="action" value="resolved_actioned" />
                <ActionButton type="submit" tooltip={s.tooltips.reportAction}>
                  {s.actions.action}
                </ActionButton>
              </form>
              <form action={resolveReport}>
                <input type="hidden" name="reportId" value={report.id} />
                <input type="hidden" name="action" value="resolved_dismissed" />
                <ActionButton type="submit" variant="muted" tooltip={s.tooltips.reportDismiss}>
                  {s.actions.dismiss}
                </ActionButton>
              </form>
            </div>
          </ContentCard>
        ))}
        {(reports ?? []).length === 0 ? <EmptyState message={s.reports.empty} /> : null}
      </div>
    </main>
  );
}
