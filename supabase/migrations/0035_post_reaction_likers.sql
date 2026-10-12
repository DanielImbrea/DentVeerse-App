-- List who reacted on a post (display names only; security definer bypasses likes_select_own).

create or replace function public.get_post_reaction_likers(p_post_id uuid, p_limit int default 50)
returns table (
  user_id uuid,
  reaction_type text,
  first_name text,
  last_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.user_id,
    l.reaction_type,
    p.first_name,
    p.last_name
  from public.likes l
  left join public.patient_profiles p on p.user_id = l.user_id
  where l.target_type = 'post'
    and l.target_id = p_post_id
  order by l.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.get_post_reaction_likers(uuid, int) from public;
grant execute on function public.get_post_reaction_likers(uuid, int) to authenticated;
