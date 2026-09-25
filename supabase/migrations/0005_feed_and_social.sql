-- Feed & Social Graph. See docs/02-database.md §3-4.

-- ============================================================================
-- posts (polymorphic author: clinic | laboratory — patients cannot author)
-- ============================================================================
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_type post_author_type not null,
  author_id uuid not null,
  post_type post_type not null,
  content text,
  linked_portfolio_item_id uuid references public.portfolio_items(id),
  linked_opportunity_id uuid, -- FK added in 0006_opportunities.sql after that table exists
  status post_status not null default 'published',
  like_count int not null default 0,
  comment_count int not null default 0,
  save_count int not null default 0,
  share_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index posts_author_idx on public.posts (author_type, author_id);
create index posts_created_idx on public.posts (created_at desc);
create index posts_status_idx on public.posts (status);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create or replace function public.validate_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_type = 'clinic' then
    if not exists (select 1 from public.clinics where id = new.author_id) then
      raise exception 'posts.author_id % does not reference an existing clinic', new.author_id;
    end if;
  elsif new.author_type = 'laboratory' then
    if not exists (select 1 from public.laboratories where id = new.author_id) then
      raise exception 'posts.author_id % does not reference an existing laboratory', new.author_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_validate_author
  before insert or update of author_type, author_id on public.posts
  for each row execute function public.validate_post_author();

-- ============================================================================
-- post_media
-- ============================================================================
create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type media_type not null,
  storage_path text not null,
  video_playback_url text,
  thumbnail_url text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index post_media_post_idx on public.post_media (post_id);

-- ============================================================================
-- follows (polymorphic target: clinic | laboratory | dentist)
-- ============================================================================
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references public.users(id) on delete cascade,
  target_type follow_target_type not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (follower_user_id, target_type, target_id),
  check (
    -- prevent a clinic/lab owner from "following" their own org via this
    -- user_id (self-follow is still possible via a different acting
    -- identity in theory; the practical guard lives in the app layer /
    -- create_or_get flows, this is a light DB-level sanity check placeholder)
    true
  )
);

create index follows_target_idx on public.follows (target_type, target_id);
create index follows_follower_idx on public.follows (follower_user_id);

create or replace function public.validate_follow_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.target_type = 'clinic' and not exists (select 1 from public.clinics where id = new.target_id) then
    raise exception 'follows.target_id % does not reference an existing clinic', new.target_id;
  elsif new.target_type = 'laboratory' and not exists (select 1 from public.laboratories where id = new.target_id) then
    raise exception 'follows.target_id % does not reference an existing laboratory', new.target_id;
  elsif new.target_type = 'dentist' and not exists (select 1 from public.dentists where id = new.target_id) then
    raise exception 'follows.target_id % does not reference an existing dentist', new.target_id;
  end if;
  return new;
end;
$$;

create trigger follows_validate_target
  before insert on public.follows
  for each row execute function public.validate_follow_target();

-- ============================================================================
-- likes (target: post | comment)
-- ============================================================================
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index likes_target_idx on public.likes (target_type, target_id);

-- ============================================================================
-- comments (with 1-level reply support)
-- ============================================================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_user_id uuid not null references public.users(id),
  parent_comment_id uuid references public.comments(id) on delete cascade,
  content text not null,
  status comment_status not null default 'visible',
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index comments_post_idx on public.comments (post_id, created_at);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- ============================================================================
-- saves (feed-interaction save, distinct from favorites — docs/02 §4 rationale)
-- ============================================================================
create table public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

-- ============================================================================
-- favorites (general-purpose save list — polymorphic target)
-- ============================================================================
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_type favorite_target_type not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index favorites_user_idx on public.favorites (user_id);

create or replace function public.validate_favorite_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.target_type = 'clinic' and not exists (select 1 from public.clinics where id = new.target_id) then
    raise exception 'favorites.target_id % does not reference an existing clinic', new.target_id;
  elsif new.target_type = 'laboratory' and not exists (select 1 from public.laboratories where id = new.target_id) then
    raise exception 'favorites.target_id % does not reference an existing laboratory', new.target_id;
  elsif new.target_type = 'dentist' and not exists (select 1 from public.dentists where id = new.target_id) then
    raise exception 'favorites.target_id % does not reference an existing dentist', new.target_id;
  elsif new.target_type = 'post' and not exists (select 1 from public.posts where id = new.target_id) then
    raise exception 'favorites.target_id % does not reference an existing post', new.target_id;
  end if;
  return new;
end;
$$;

create trigger favorites_validate_target
  before insert on public.favorites
  for each row execute function public.validate_favorite_target();

-- Keep saves <-> favorites(target_type='post') in sync, per docs/02-database.md
-- §4: "a saved post exists in both tables by design."
create or replace function public.sync_save_to_favorite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.favorites (user_id, target_type, target_id)
    values (new.user_id, 'post', new.post_id)
    on conflict (user_id, target_type, target_id) do nothing;
  elsif TG_OP = 'DELETE' then
    delete from public.favorites
    where user_id = old.user_id and target_type = 'post' and target_id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger saves_sync_favorite
  after insert or delete on public.saves
  for each row execute function public.sync_save_to_favorite();

-- ============================================================================
-- Counter-maintaining triggers on posts (like_count, comment_count, save_count)
-- ============================================================================
create or replace function public.bump_post_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta int;
  pid uuid;
  col text;
begin
  if TG_OP = 'INSERT' then
    delta := 1;
  elsif TG_OP = 'DELETE' then
    delta := -1;
  else
    return null;
  end if;

  if TG_TABLE_NAME = 'likes' then
    if TG_OP = 'INSERT' then
      if new.target_type <> 'post' then return coalesce(new, old); end if;
      pid := new.target_id;
    else
      if old.target_type <> 'post' then return coalesce(new, old); end if;
      pid := old.target_id;
    end if;
    update public.posts set like_count = greatest(0, like_count + delta) where id = pid;
  elsif TG_TABLE_NAME = 'comments' then
    pid := coalesce(new.post_id, old.post_id);
    update public.posts set comment_count = greatest(0, comment_count + delta) where id = pid;
  elsif TG_TABLE_NAME = 'saves' then
    pid := coalesce(new.post_id, old.post_id);
    update public.posts set save_count = greatest(0, save_count + delta) where id = pid;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger likes_bump_post_counter
  after insert or delete on public.likes
  for each row execute function public.bump_post_counter();

create trigger comments_bump_post_counter
  after insert or delete on public.comments
  for each row execute function public.bump_post_counter();

create trigger saves_bump_post_counter
  after insert or delete on public.saves
  for each row execute function public.bump_post_counter();
