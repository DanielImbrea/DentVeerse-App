-- Notification pipeline: SECURITY DEFINER triggers insert cross-user
-- notification rows synchronously on the relevant DB event, then enqueue a
-- push-dispatch job via push_queue (polled by an Edge Function — see
-- docs/08-verification-notifications-reports.md Part B).

create or replace function public.create_notification(
  p_user_id uuid,
  p_type notification_type,
  p_actor_type text,
  p_actor_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_pref_column text;
  v_should_send boolean := true;
begin
  -- Respect notification_preferences at insert time already for the in-app
  -- list too (docs/08 Part B: "respected at dispatch-time, not just a UI-side
  -- filter" — the in-app row is still useful even if push is suppressed, so
  -- we always insert the notification row, but only enqueue push if enabled).
  select case p_type
    when 'new_follower' then new_follower
    when 'new_like' then new_like
    when 'new_comment' then new_comment
    when 'new_message' then new_message
    when 'collaboration_request' then collaboration_request
    when 'opportunity_response' then opportunity_response
    when 'verification_approved' then verification_approved
    when 'new_review' then new_review
  end into v_should_send
  from public.notification_preferences
  where user_id = p_user_id;

  insert into public.notifications (user_id, type, actor_type, actor_id, target_type, target_id, body)
  values (p_user_id, p_type, p_actor_type, p_actor_id, p_target_type, p_target_id, p_body)
  returning id into v_notification_id;

  if coalesce(v_should_send, true) then
    insert into public.push_queue (notification_id) values (v_notification_id);
  end if;

  return v_notification_id;
end;
$$;

-- new_follower: notify the followed org's owner+admins.
create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.target_type = 'clinic' then
    for r in select user_id from public.clinic_members where clinic_id = new.target_id loop
      perform public.create_notification(r.user_id, 'new_follower', 'patient', new.follower_user_id, 'clinic', new.target_id, null);
    end loop;
  elsif new.target_type = 'laboratory' then
    for r in select user_id from public.laboratory_members where laboratory_id = new.target_id loop
      perform public.create_notification(r.user_id, 'new_follower', 'patient', new.follower_user_id, 'laboratory', new.target_id, null);
    end loop;
  end if;
  return new;
end;
$$;

create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_new_follower();

-- new_like: notify the post author org's owner+admins.
create or replace function public.notify_new_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_post record;
begin
  if new.target_type <> 'post' then
    return new;
  end if;

  select author_type, author_id into v_post from public.posts where id = new.target_id;

  if v_post.author_type = 'clinic' then
    for r in select user_id from public.clinic_members where clinic_id = v_post.author_id loop
      perform public.create_notification(r.user_id, 'new_like', 'user', new.user_id, 'post', new.target_id, null);
    end loop;
  elsif v_post.author_type = 'laboratory' then
    for r in select user_id from public.laboratory_members where laboratory_id = v_post.author_id loop
      perform public.create_notification(r.user_id, 'new_like', 'user', new.user_id, 'post', new.target_id, null);
    end loop;
  end if;
  return new;
end;
$$;

create trigger likes_notify
  after insert on public.likes
  for each row execute function public.notify_new_like();

-- new_comment: notify the post author, plus the parent-comment author if a reply.
create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_post record;
  v_parent_author uuid;
begin
  select author_type, author_id into v_post from public.posts where id = new.post_id;

  if v_post.author_type = 'clinic' then
    for r in select user_id from public.clinic_members where clinic_id = v_post.author_id loop
      perform public.create_notification(r.user_id, 'new_comment', 'user', new.author_user_id, 'post', new.post_id, null);
    end loop;
  elsif v_post.author_type = 'laboratory' then
    for r in select user_id from public.laboratory_members where laboratory_id = v_post.author_id loop
      perform public.create_notification(r.user_id, 'new_comment', 'user', new.author_user_id, 'post', new.post_id, null);
    end loop;
  end if;

  if new.parent_comment_id is not null then
    select author_user_id into v_parent_author from public.comments where id = new.parent_comment_id;
    if v_parent_author is not null and v_parent_author <> new.author_user_id then
      perform public.create_notification(v_parent_author, 'new_comment', 'user', new.author_user_id, 'comment', new.id, null);
    end if;
  end if;

  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_new_comment();

-- new_message: notify the other conversation member(s).
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select user_id from public.conversation_members
    where conversation_id = new.conversation_id and user_id <> new.sender_user_id
  loop
    perform public.create_notification(r.user_id, 'new_message', 'user', new.sender_user_id, 'conversation', new.conversation_id, null);
  end loop;
  return new;
end;
$$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- collaboration_request: notify the opportunity author org.
create or replace function public.notify_opportunity_interest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_opp record;
begin
  select author_type, author_id into v_opp from public.opportunities where id = new.opportunity_id;

  if v_opp.author_type = 'clinic' then
    for r in select user_id from public.clinic_members where clinic_id = v_opp.author_id loop
      perform public.create_notification(r.user_id, 'collaboration_request', new.responder_type::text, new.responder_id, 'opportunity', new.opportunity_id, null);
    end loop;
  elsif v_opp.author_type = 'laboratory' then
    for r in select user_id from public.laboratory_members where laboratory_id = v_opp.author_id loop
      perform public.create_notification(r.user_id, 'collaboration_request', new.responder_type::text, new.responder_id, 'opportunity', new.opportunity_id, null);
    end loop;
  end if;
  return new;
end;
$$;

create trigger opportunity_interests_notify_created
  after insert on public.opportunity_interests
  for each row execute function public.notify_opportunity_interest();

-- opportunity_response: notify the responding org when status changes to accepted/rejected.
create or replace function public.notify_opportunity_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.status not in ('accepted', 'rejected') or new.status = old.status then
    return new;
  end if;

  if new.responder_type = 'clinic' then
    for r in select user_id from public.clinic_members where clinic_id = new.responder_id loop
      perform public.create_notification(r.user_id, 'opportunity_response', 'opportunity', new.opportunity_id, 'opportunity_interest', new.id, new.status::text);
    end loop;
  elsif new.responder_type = 'laboratory' then
    for r in select user_id from public.laboratory_members where laboratory_id = new.responder_id loop
      perform public.create_notification(r.user_id, 'opportunity_response', 'opportunity', new.opportunity_id, 'opportunity_interest', new.id, new.status::text);
    end loop;
  end if;
  return new;
end;
$$;

create trigger opportunity_interests_notify_response
  after update of status on public.opportunity_interests
  for each row execute function public.notify_opportunity_response();

-- verification_approved: notify the subject org.
create or replace function public.notify_verification_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.status <> 'approved' or old.status = 'approved' then
    return new;
  end if;

  if new.subject_type = 'clinic' then
    for r in select user_id from public.clinic_members where clinic_id = new.subject_id loop
      perform public.create_notification(r.user_id, 'verification_approved', 'admin', new.reviewed_by_admin_id, 'clinic', new.subject_id, null);
    end loop;
  elsif new.subject_type = 'laboratory' then
    for r in select user_id from public.laboratory_members where laboratory_id = new.subject_id loop
      perform public.create_notification(r.user_id, 'verification_approved', 'admin', new.reviewed_by_admin_id, 'laboratory', new.subject_id, null);
    end loop;
  end if;
  return new;
end;
$$;

create trigger verification_requests_notify
  after update of status on public.verification_requests
  for each row execute function public.notify_verification_approved();

-- new_review: notify the reviewed clinic's owner+admins.
create or replace function public.notify_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select user_id from public.clinic_members where clinic_id = new.clinic_id loop
    perform public.create_notification(r.user_id, 'new_review', 'patient', new.patient_user_id, 'review', new.id, null);
  end loop;
  return new;
end;
$$;

create trigger reviews_notify
  after insert on public.reviews
  for each row execute function public.notify_new_review();
