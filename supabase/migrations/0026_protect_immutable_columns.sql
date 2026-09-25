-- SECURITY FIX (second audit, this session, continued from 0025): several
-- more tables had the same class of bug as clinics/laboratories —
-- UPDATE policies with a USING clause but no WITH CHECK, letting the
-- authorized actor change columns that identify WHICH row they're
-- authorized to touch, effectively letting them reassign ownership/
-- identity after the fact. Found systematically by reviewing every
-- `for update`/`for all` policy across 0018-0020 for missing WITH CHECK.
--
-- Most serious of this batch: `conversation_members_update_own` let a
-- conversation member change their own `acting_as_type`/`acting_as_id` —
-- meaning a patient in a conversation could rewrite their row to claim
-- they were acting as a DIFFERENT clinic, spoofing identity inside an
-- otherwise-legitimate conversation. Also found: `opportunities_update`
-- allowed reassigning `author_id` to an org the actor doesn't manage
-- (vandalism vector, and also bypasses the max-5-active-opportunities
-- INSERT trigger since that trigger only fires on INSERT, not UPDATE).
--
-- Generic reusable trigger: given a list of column names (passed as
-- trigger arguments), rejects any UPDATE that changes those columns,
-- unless the caller is a platform admin, a service-role backend call, or
-- the change originates from within another trigger's nested execution
-- (pg_trigger_depth() > 1) — same allow-list rationale as
-- 0025_protect_org_privileged_columns.sql.

create or replace function public.reject_immutable_column_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  col text;
begin
  if pg_trigger_depth() > 1 or auth.role() = 'service_role' or public.is_platform_admin() then
    return new;
  end if;

  foreach col in array TG_ARGV loop
    if (to_jsonb(new) ->> col) is distinct from (to_jsonb(old) ->> col) then
      raise exception 'Column % cannot be changed after creation', col;
    end if;
  end loop;

  return new;
end;
$$;

-- opportunities: author_type/author_id immutable (prevents vandalism-by-
-- reassignment AND closes the max-active-opportunities limit bypass, since
-- that limit is only enforced on INSERT).
create trigger opportunities_protect_author
  before update on public.opportunities
  for each row execute function public.reject_immutable_column_change('author_type', 'author_id');

-- portfolio_items: owner_type/owner_id immutable.
create trigger portfolio_items_protect_owner
  before update on public.portfolio_items
  for each row execute function public.reject_immutable_column_change('owner_type', 'owner_id');

-- posts: author_type/author_id immutable.
create trigger posts_protect_author
  before update on public.posts
  for each row execute function public.reject_immutable_column_change('author_type', 'author_id');

-- comments: author_user_id/post_id immutable (prevents an author from
-- reassigning a comment's authorship or moving it to a different post).
create trigger comments_protect_identity
  before update on public.comments
  for each row execute function public.reject_immutable_column_change('author_user_id', 'post_id');

-- dentists: clinic_id immutable (prevents moving a team member listing to
-- a different clinic than the one it was created under).
create trigger dentists_protect_clinic
  before update on public.dentists
  for each row execute function public.reject_immutable_column_change('clinic_id');

-- conversation_members: THE MOST SERIOUS FIX IN THIS BATCH — user_id,
-- conversation_id, acting_as_type, acting_as_id are all immutable. The
-- member-update policy exists only so a member can update their own
-- `last_read_at` (see packages/api/src/messaging.ts `markConversationRead`)
-- — nothing else about a conversation membership row should ever change
-- after creation.
create trigger conversation_members_protect_identity
  before update on public.conversation_members
  for each row execute function public.reject_immutable_column_change('user_id', 'conversation_id', 'acting_as_type', 'acting_as_id');

-- devices: user_id immutable (prevents reassigning a device/push-token
-- registration to a different user's account).
create trigger devices_protect_owner
  before update on public.devices
  for each row execute function public.reject_immutable_column_change('user_id');

-- notifications: user_id immutable (the update policy exists only to set
-- read_at — see packages/api/src/notifications.ts `markNotificationRead`).
create trigger notifications_protect_owner
  before update on public.notifications
  for each row execute function public.reject_immutable_column_change('user_id');

-- reviews: clinic_id/patient_user_id immutable. Without this, a patient
-- could use the legitimate 48-hour edit window (supabase/migrations/0020
-- `reviews_update`) to silently reassign an existing review to point at a
-- DIFFERENT clinic_id — since the rating-recalculation trigger fires on
-- any UPDATE to `reviews`, this would incorrectly move the review's effect
-- from one clinic's rating_avg to another's.
create trigger reviews_protect_identity
  before update on public.reviews
  for each row execute function public.reject_immutable_column_change('clinic_id', 'patient_user_id');
