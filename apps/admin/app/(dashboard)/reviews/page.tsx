import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { revalidatePath } from 'next/cache';
import { ContentCard } from '../../../components/ContentCard';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import { formatDateTime, formatReviewStatus, s } from '../../../lib/strings';
import { toAuditJson } from '../../../lib/auditJson';

export default async function ReviewsPage() {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data: reviews } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(50);

  async function hideReview(formData: FormData) {
    'use server';
    const { adminId } = await requireAdmin();

    const reviewId = formData.get('reviewId') as string;

    const admin = createAdminClient();
    const { data: before } = await admin.from('reviews').select('*').eq('id', reviewId).single();

    await admin.from('reviews').update({ status: 'hidden_by_admin' }).eq('id', reviewId);

    await admin.from('audit_logs').insert({
      admin_id: adminId,
      action: 'review_hidden',
      target_type: 'reviews',
      target_id: reviewId,
      before: toAuditJson(before),
      after: { status: 'hidden_by_admin' },
    });

    revalidatePath('/reviews');
  }

  return (
    <main className="p-8 lg:p-10">
      <PageHeader title={s.reviews.title} description={s.reviews.description} />
      <div className="flex flex-col gap-4">
        {(reviews ?? []).map((review) => (
          <ContentCard key={review.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={`★ ${review.rating}`} variant="warning" />
                <StatusBadge
                  status={formatReviewStatus(review.status)}
                  variant={review.status === 'visible' ? 'success' : 'neutral'}
                />
                <span className="text-text-secondary text-xs">{formatDateTime(review.created_at)}</span>
              </div>
              {review.comment ? <p className="text-sm leading-relaxed">{review.comment}</p> : null}
            </div>
            {review.status === 'visible' ? (
              <form action={hideReview} className="shrink-0">
                <input type="hidden" name="reviewId" value={review.id} />
                <ActionButton type="submit" tooltip={s.tooltips.hideReview}>
                  {s.actions.hide}
                </ActionButton>
              </form>
            ) : null}
          </ContentCard>
        ))}
      </div>
    </main>
  );
}
