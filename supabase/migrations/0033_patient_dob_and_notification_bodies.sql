-- Patient date of birth + richer in-app notification bodies (Romanian).

alter table public.patient_profiles
  add column if not exists date_of_birth date;

create or replace function public.notification_actor_label(
  p_actor_type text,
  p_actor_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if p_actor_type = 'patient' then
    select trim(concat_ws(' ', first_name, last_name))
      into v_label
      from public.patient_profiles
     where user_id = p_actor_id;
    return coalesce(nullif(v_label, ''), 'Un pacient');
  elsif p_actor_type = 'user' then
    select trim(concat_ws(' ', p.first_name, p.last_name))
      into v_label
      from public.patient_profiles p
     where p.user_id = p_actor_id;
    if v_label is not null and v_label <> '' then
      return v_label;
    end if;
    return 'Un utilizator';
  elsif p_actor_type = 'clinic' then
    select name into v_label from public.clinics where id = p_actor_id;
    return coalesce(v_label, 'O clinică');
  elsif p_actor_type = 'laboratory' then
    select name into v_label from public.laboratories where id = p_actor_id;
    return coalesce(v_label, 'Un laborator');
  elsif p_actor_type = 'admin' then
    return 'Echipa DentalConnect';
  end if;
  return 'Cineva';
end;
$$;

create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_actor text;
  v_target text;
begin
  v_actor := public.notification_actor_label('patient', new.follower_user_id);

  if new.target_type = 'clinic' then
    select name into v_target from public.clinics where id = new.target_id;
    for r in select user_id from public.clinic_members where clinic_id = new.target_id loop
      perform public.create_notification(
        r.user_id, 'new_follower', 'patient', new.follower_user_id, 'clinic', new.target_id,
        v_actor || ' a început să urmărească ' || coalesce(v_target, 'clinica ta')
      );
    end loop;
  elsif new.target_type = 'laboratory' then
    select name into v_target from public.laboratories where id = new.target_id;
    for r in select user_id from public.laboratory_members where laboratory_id = new.target_id loop
      perform public.create_notification(
        r.user_id, 'new_follower', 'patient', new.follower_user_id, 'laboratory', new.target_id,
        v_actor || ' a început să urmărească ' || coalesce(v_target, 'laboratorul tău')
      );
    end loop;
  end if;
  return new;
end;
$$;

create or replace function public.notify_new_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_post record;
  v_actor text;
begin
  if new.target_type <> 'post' then
    return new;
  end if;

  v_actor := public.notification_actor_label('user', new.user_id);
  select author_type, author_id into v_post from public.posts where id = new.target_id;

  if v_post.author_type = 'clinic' then
    for r in select user_id from public.clinic_members where clinic_id = v_post.author_id loop
      perform public.create_notification(
        r.user_id, 'new_like', 'user', new.user_id, 'post', new.target_id,
        v_actor || ' a apreciat o postare'
      );
    end loop;
  elsif v_post.author_type = 'laboratory' then
    for r in select user_id from public.laboratory_members where laboratory_id = v_post.author_id loop
      perform public.create_notification(
        r.user_id, 'new_like', 'user', new.user_id, 'post', new.target_id,
        v_actor || ' a apreciat o postare'
      );
    end loop;
  end if;
  return new;
end;
$$;

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
  v_actor text;
begin
  v_actor := public.notification_actor_label('user', new.author_user_id);
  select author_type, author_id into v_post from public.posts where id = new.post_id;

  if v_post.author_type = 'clinic' then
    for r in select user_id from public.clinic_members where clinic_id = v_post.author_id loop
      perform public.create_notification(
        r.user_id, 'new_comment', 'user', new.author_user_id, 'post', new.post_id,
        v_actor || ' a comentat la o postare'
      );
    end loop;
  elsif v_post.author_type = 'laboratory' then
    for r in select user_id from public.laboratory_members where laboratory_id = v_post.author_id loop
      perform public.create_notification(
        r.user_id, 'new_comment', 'user', new.author_user_id, 'post', new.post_id,
        v_actor || ' a comentat la o postare'
      );
    end loop;
  end if;

  if new.parent_comment_id is not null then
    select author_user_id into v_parent_author from public.comments where id = new.parent_comment_id;
    if v_parent_author is not null and v_parent_author <> new.author_user_id then
      perform public.create_notification(
        v_parent_author, 'new_comment', 'user', new.author_user_id, 'comment', new.id,
        v_actor || ' ți-a răspuns la un comentariu'
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_actor text;
begin
  v_actor := public.notification_actor_label('user', new.sender_user_id);

  for r in
    select user_id from public.conversation_members
    where conversation_id = new.conversation_id and user_id <> new.sender_user_id
  loop
    perform public.create_notification(
      r.user_id, 'new_message', 'user', new.sender_user_id, 'conversation', new.conversation_id,
      'Mesaj nou de la ' || v_actor
    );
  end loop;
  return new;
end;
$$;
