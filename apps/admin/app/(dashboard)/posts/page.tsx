import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { revalidatePath } from 'next/cache';
import { ContentCard } from '../../../components/ContentCard';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/ActionButton';
import { formatDateTime, formatPostStatus, formatPostType, s } from '../../../lib/strings';

export default async function PostsPage() {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data: posts } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50);

  async function hidePost(formData: FormData) {
    'use server';
    const { adminId } = await requireAdmin();

    const postId = formData.get('postId') as string;

    const admin = createAdminClient();
    const { data: before } = await admin.from('posts').select('*').eq('id', postId).single();

    await admin.from('posts').update({ status: 'removed' }).eq('id', postId);

    await admin.from('audit_logs').insert({
      admin_id: adminId,
      action: 'post_hidden',
      target_type: 'posts',
      target_id: postId,
      before,
      after: { status: 'removed' },
    });

    revalidatePath('/posts');
  }

  return (
    <main className="p-8 lg:p-10">
      <PageHeader title={s.posts.title} description={s.posts.description} />
      <div className="flex flex-col gap-4">
        {(posts ?? []).map((post) => (
          <ContentCard key={post.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={formatPostType(post.post_type)} variant="neutral" />
                <StatusBadge
                  status={formatPostStatus(post.status)}
                  variant={post.status === 'removed' ? 'error' : 'success'}
                />
                <span className="text-text-secondary text-xs">{formatDateTime(post.created_at)}</span>
              </div>
              {post.content ? <p className="text-sm leading-relaxed">{post.content}</p> : null}
            </div>
            {post.status !== 'removed' ? (
              <form action={hidePost} className="shrink-0">
                <input type="hidden" name="postId" value={post.id} />
                <ActionButton type="submit" tooltip={s.tooltips.hidePost}>
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
