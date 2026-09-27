import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { revalidatePath } from 'next/cache';
import { ContentCard } from '../../../components/ContentCard';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import { formatCommentStatus, formatDateTime, s } from '../../../lib/strings';
import { toAuditJson } from '../../../lib/auditJson';

export default async function CommentsPage() {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data: comments } = await supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(50);

  async function hideComment(formData: FormData) {
    'use server';
    const { adminId } = await requireAdmin();

    const commentId = formData.get('commentId') as string;

    const admin = createAdminClient();
    const { data: before } = await admin.from('comments').select('*').eq('id', commentId).single();

    await admin.from('comments').update({ status: 'removed' }).eq('id', commentId);

    await admin.from('audit_logs').insert({
      admin_id: adminId,
      action: 'comment_hidden',
      target_type: 'comments',
      target_id: commentId,
      before: toAuditJson(before),
      after: { status: 'removed' },
    });

    revalidatePath('/comments');
  }

  return (
    <main className="p-8 lg:p-10">
      <PageHeader title={s.comments.title} description={s.comments.description} />
      <div className="flex flex-col gap-4">
        {(comments ?? []).map((comment) => (
          <ContentCard key={comment.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge
                  status={formatCommentStatus(comment.status)}
                  variant={comment.status === 'removed' ? 'error' : 'success'}
                />
                <span className="text-text-secondary text-xs">{formatDateTime(comment.created_at)}</span>
              </div>
              <p className="text-sm leading-relaxed">{comment.content}</p>
            </div>
            {comment.status !== 'removed' ? (
              <form action={hideComment} className="shrink-0">
                <input type="hidden" name="commentId" value={comment.id} />
                <ActionButton type="submit" tooltip={s.tooltips.hideComment}>
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
