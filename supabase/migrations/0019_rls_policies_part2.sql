-- RLS part 2: feed, social graph, opportunities, messaging.

-- ============================================================================
-- posts / post_media — public read (published + not blocked), manager write,
-- patients cannot insert.
-- ============================================================================
alter table public.posts enable row level security;

create policy posts_select_public on public.posts
  for select using (
    (
      status = 'published'
      and not public.is_blocked_by_viewer(author_type::text, author_id)
    )
    or (author_type = 'clinic' and public.is_clinic_manager(author_id))
    or (author_type = 'laboratory' and public.is_laboratory_manager(author_id))
    or public.is_platform_admin()
  );
create policy posts_insert on public.posts
  for insert with check (
    (author_type = 'clinic' and public.is_clinic_manager(author_id))
    or (author_type = 'laboratory' and public.is_laboratory_manager(author_id))
  );
create policy posts_update on public.posts
  for update using (
    (author_type = 'clinic' and public.is_clinic_manager(author_id))
    or (author_type = 'laboratory' and public.is_laboratory_manager(author_id))
    or public.is_platform_admin()
  );
create policy posts_delete on public.posts
  for delete using (
    (author_type = 'clinic' and public.is_clinic_manager(author_id))
    or (author_type = 'laboratory' and public.is_laboratory_manager(author_id))
    or public.is_platform_admin()
  );

alter table public.post_media enable row level security;

create policy post_media_select on public.post_media
  for select using (
    exists (
      select 1 from public.posts p where p.id = post_id and (
        (p.status = 'published' and not public.is_blocked_by_viewer(p.author_type::text, p.author_id))
        or (p.author_type = 'clinic' and public.is_clinic_manager(p.author_id))
        or (p.author_type = 'laboratory' and public.is_laboratory_manager(p.author_id))
      )
    )
  );
create policy post_media_write on public.post_media
  for all using (
    exists (
      select 1 from public.posts p where p.id = post_id and (
        (p.author_type = 'clinic' and public.is_clinic_manager(p.author_id))
        or (p.author_type = 'laboratory' and public.is_laboratory_manager(p.author_id))
      )
    )
  );

-- ============================================================================
-- follows — fully public read (confirmed by client, docs/16 §1), self-write.
-- ============================================================================
alter table public.follows enable row level security;

create policy follows_select_public on public.follows for select using (true);
create policy follows_insert_self on public.follows
  for insert with check (follower_user_id = auth.uid());
create policy follows_delete_self on public.follows
  for delete using (follower_user_id = auth.uid());

-- ============================================================================
-- likes — self-write, public-ish read via counters (raw rows readable by self
-- and via aggregate through posts.like_count for everyone else).
-- ============================================================================
alter table public.likes enable row level security;

create policy likes_select_own on public.likes for select using (user_id = auth.uid());
create policy likes_insert_self on public.likes
  for insert with check (user_id = auth.uid());
create policy likes_delete_self on public.likes
  for delete using (user_id = auth.uid());

-- ============================================================================
-- comments — public read (visible), any authenticated user can insert
-- (unless blocked by the post's author org), author/admin write.
-- ============================================================================
alter table public.comments enable row level security;

create policy comments_select_public on public.comments
  for select using (status = 'visible' or author_user_id = auth.uid() or public.is_platform_admin());
create policy comments_insert on public.comments
  for insert with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id and not public.is_blocked_by_viewer(p.author_type::text, p.author_id)
    )
  );
create policy comments_update on public.comments
  for update using (author_user_id = auth.uid() or public.is_platform_admin());
create policy comments_delete on public.comments
  for delete using (author_user_id = auth.uid() or public.is_platform_admin());

-- ============================================================================
-- saves / favorites — self-only, private.
-- ============================================================================
alter table public.saves enable row level security;
create policy saves_select_own on public.saves for select using (user_id = auth.uid());
create policy saves_insert_self on public.saves for insert with check (user_id = auth.uid());
create policy saves_delete_self on public.saves for delete using (user_id = auth.uid());

alter table public.favorites enable row level security;
create policy favorites_select_own on public.favorites for select using (user_id = auth.uid());
create policy favorites_insert_self on public.favorites for insert with check (user_id = auth.uid());
create policy favorites_delete_self on public.favorites for delete using (user_id = auth.uid());

-- ============================================================================
-- opportunities — public read (open, not blocked), author sees all own
-- statuses, manager write.
-- ============================================================================
alter table public.opportunities enable row level security;

create policy opportunities_select_public on public.opportunities
  for select using (
    (status = 'open' and not public.is_blocked_by_viewer(author_type::text, author_id))
    or (author_type = 'clinic' and public.is_clinic_manager(author_id))
    or (author_type = 'laboratory' and public.is_laboratory_manager(author_id))
    or public.is_platform_admin()
  );
create policy opportunities_insert on public.opportunities
  for insert with check (
    (author_type = 'clinic' and public.is_clinic_manager(author_id))
    or (author_type = 'laboratory' and public.is_laboratory_manager(author_id))
  );
create policy opportunities_update on public.opportunities
  for update using (
    (author_type = 'clinic' and public.is_clinic_manager(author_id))
    or (author_type = 'laboratory' and public.is_laboratory_manager(author_id))
  );
create policy opportunities_delete on public.opportunities
  for delete using (
    (author_type = 'clinic' and public.is_clinic_manager(author_id))
    or (author_type = 'laboratory' and public.is_laboratory_manager(author_id))
  );

-- ============================================================================
-- opportunity_interests — visible to author org and responding org only.
-- ============================================================================
alter table public.opportunity_interests enable row level security;

create policy opportunity_interests_select on public.opportunity_interests
  for select using (
    (responder_type = 'clinic' and public.is_clinic_manager(responder_id))
    or (responder_type = 'laboratory' and public.is_laboratory_manager(responder_id))
    or exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and (
        (o.author_type = 'clinic' and public.is_clinic_manager(o.author_id))
        or (o.author_type = 'laboratory' and public.is_laboratory_manager(o.author_id))
      )
    )
  );
create policy opportunity_interests_insert on public.opportunity_interests
  for insert with check (
    (responder_type = 'clinic' and public.is_clinic_manager(responder_id))
    or (responder_type = 'laboratory' and public.is_laboratory_manager(responder_id))
  );
-- Opportunity author org can accept/reject; responder can withdraw.
-- SECURITY FIX (second audit): split policies previously used separate USING/
-- WITH CHECK across two permissive policies — PostgreSQL ORs USING and WITH CHECK
-- independently, so a responder's USING match + author's WITH CHECK (accepted)
-- could combine and allow self-accept. Use ONE update policy with actor-scoped checks.
drop policy if exists opportunity_interests_update_by_author on public.opportunity_interests;
drop policy if exists opportunity_interests_update_by_responder on public.opportunity_interests;

create policy opportunity_interests_update on public.opportunity_interests
  for update using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and (
        (o.author_type = 'clinic' and public.is_clinic_manager(o.author_id))
        or (o.author_type = 'laboratory' and public.is_laboratory_manager(o.author_id))
      )
    )
    or (responder_type = 'clinic' and public.is_clinic_manager(responder_id))
    or (responder_type = 'laboratory' and public.is_laboratory_manager(responder_id))
  )
  with check (
    (
      exists (
        select 1 from public.opportunities o
        where o.id = opportunity_id and (
          (o.author_type = 'clinic' and public.is_clinic_manager(o.author_id))
          or (o.author_type = 'laboratory' and public.is_laboratory_manager(o.author_id))
        )
      )
      and status in ('accepted', 'rejected')
    )
    or (
      (
        (responder_type = 'clinic' and public.is_clinic_manager(responder_id))
        or (responder_type = 'laboratory' and public.is_laboratory_manager(responder_id))
      )
      and status = 'withdrawn'
    )
  );
-- No delete policy — state transitions only, per docs/03-security.md.

-- ============================================================================
-- conversations / conversation_members / messages / message_attachments —
-- members only. Conversation creation goes through create_or_get_conversation
-- (SECURITY DEFINER RPC), not raw client INSERT — no INSERT policy on
-- conversations/conversation_members for regular clients.
-- ============================================================================
alter table public.conversations enable row level security;

create policy conversations_select_members on public.conversations
  for select using (public.is_conversation_member(id));

alter table public.conversation_members enable row level security;

create policy conversation_members_select on public.conversation_members
  for select using (public.is_conversation_member(conversation_id));
create policy conversation_members_update_own on public.conversation_members
  for update using (user_id = auth.uid()); -- e.g. updating last_read_at

alter table public.messages enable row level security;

create policy messages_select_members on public.messages
  for select using (public.is_conversation_member(conversation_id));
create policy messages_insert_members on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );
create policy messages_update_own on public.messages
  for update using (sender_user_id = auth.uid()); -- soft-delete own message only

alter table public.message_attachments enable row level security;

create policy message_attachments_select_members on public.message_attachments
  for select using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );
create policy message_attachments_insert_members on public.message_attachments
  for insert with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.sender_user_id = auth.uid()
        and public.is_conversation_member(m.conversation_id)
    )
  );
create policy message_attachments_delete_sender on public.message_attachments
  for delete using (
    exists (select 1 from public.messages m where m.id = message_id and m.sender_user_id = auth.uid())
  );
