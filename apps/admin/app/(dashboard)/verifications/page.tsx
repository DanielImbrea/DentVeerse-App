import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ContentCard, EmptyState } from '../../../components/ContentCard';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import {
  formatDateTime,
  formatSubjectType,
  formatVerificationDocumentType,
  formatVerificationStatus,
  s,
} from '../../../lib/strings';
import { ViewDocumentButton } from './ViewDocumentButton';

type OrgSummary = {
  id: string;
  name: string;
  city: string | null;
  county: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_verified: boolean;
};

export default async function VerificationsPage() {
  await requireAdmin();

  const supabase = createAdminClient();

  const { data: requests } = await supabase
    .from('verification_requests')
    .select('*, verification_documents(id, document_type, uploaded_at)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false });

  const clinicIds = (requests ?? []).filter((r) => r.subject_type === 'clinic').map((r) => r.subject_id);
  const labIds = (requests ?? []).filter((r) => r.subject_type === 'laboratory').map((r) => r.subject_id);

  const [{ data: clinics }, { data: laboratories }] = await Promise.all([
    clinicIds.length
      ? supabase.from('clinics').select('id, name, city, county, address, phone, email, is_verified').in('id', clinicIds)
      : Promise.resolve({ data: [] as OrgSummary[] }),
    labIds.length
      ? supabase.from('laboratories').select('id, name, city, county, address, phone, email, is_verified').in('id', labIds)
      : Promise.resolve({ data: [] as OrgSummary[] }),
  ]);

  const orgById = new Map<string, OrgSummary>();
  for (const org of [...(clinics ?? []), ...(laboratories ?? [])]) {
    orgById.set(org.id, org as OrgSummary);
  }

  async function decide(formData: FormData) {
    'use server';
    const { adminId } = await requireAdmin();

    const requestId = formData.get('requestId') as string;
    const decision = formData.get('decision') as 'approved' | 'rejected';
    const note = (formData.get('note') as string) || null;

    const admin = createAdminClient();

    await admin
      .from('verification_requests')
      .update({ status: decision, review_note: note, reviewed_by_admin_id: adminId })
      .eq('id', requestId);

    await admin.from('audit_logs').insert({
      admin_id: adminId,
      action: `verification_${decision}`,
      target_type: 'verification_requests',
      target_id: requestId,
      after: { decision, note },
    });

    revalidatePath('/verifications');
  }

  return (
    <main className="p-8 lg:p-10">
      <PageHeader title={s.verifications.title} description={s.verifications.description} />
      <div className="flex flex-col gap-4">
        {(requests ?? []).map((request: any) => {
          const org = orgById.get(request.subject_id);
          const adminOrgHref = request.subject_type === 'clinic' ? '/clinics' : '/laboratories';

          return (
            <ContentCard key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatusBadge status={formatSubjectType(request.subject_type)} variant="neutral" />
                    <StatusBadge status={formatVerificationStatus(request.status)} variant="warning" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary">{org?.name ?? 'Organizație necunoscută'}</h2>
                  <p className="text-sm text-text-secondary mt-1">
                    {[org?.address, org?.city, org?.county].filter(Boolean).join(', ') || 'Adresă necompletată'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {[org?.phone, org?.email].filter(Boolean).join(' · ') || 'Contact necompletat'}
                  </p>
                  <p className="text-xs text-text-secondary mt-2">
                    {s.verifications.submittedAt}: {formatDateTime(request.submitted_at)}
                  </p>
                </div>
                <Link href={adminOrgHref} className="text-sm text-primary font-medium hover:underline">
                  {s.verifications.viewOrgInAdmin} →
                </Link>
              </div>

              <div className="rounded-xl border border-border bg-background/60 p-4 mb-4">
                <p className="text-sm font-medium text-text-primary mb-3">{s.verifications.documents}</p>
                <div className="flex flex-col gap-2">
                  {(request.verification_documents ?? []).map((doc: any) => (
                    <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 text-sm border-b border-border/60 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-medium text-text-primary">{formatVerificationDocumentType(doc.document_type)}</span>
                        <span className="text-text-secondary ml-2">· {formatDateTime(doc.uploaded_at)}</span>
                      </div>
                      <ViewDocumentButton documentId={doc.id} />
                    </div>
                  ))}
                  {(request.verification_documents ?? []).length === 0 ? (
                    <span className="text-text-secondary text-sm">{s.verifications.noDocuments}</span>
                  ) : null}
                </div>
              </div>

              <form action={decide} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input type="hidden" name="requestId" value={request.id} />
                <input name="note" placeholder={s.verifications.reviewNote} className="admin-input flex-1" />
                <div className="flex gap-3">
                  <ActionButton type="submit" name="decision" value="approved" variant="success" tooltip={s.tooltips.approveVerification}>
                    {s.actions.approve}
                  </ActionButton>
                  <ActionButton type="submit" name="decision" value="rejected" tooltip={s.tooltips.rejectVerification}>
                    {s.actions.reject}
                  </ActionButton>
                </div>
              </form>
            </ContentCard>
          );
        })}
        {(requests ?? []).length === 0 ? <EmptyState message={s.verifications.empty} /> : null}
      </div>
    </main>
  );
}
