-- Demo organizations for local testing (map, search, feed).
-- Safe to re-run: uses fixed UUIDs with ON CONFLICT DO NOTHING.
-- Password for demo accounts: Demo123456!

-- Demo clinic owner
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'a1000001-0001-4001-8001-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo-clinic@dentalconnect.test',
  crypt('Demo123456!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
) on conflict (id) do nothing;

-- Demo laboratory owner
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'a1000002-0002-4002-8002-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo-lab@dentalconnect.test',
  crypt('Demo123456!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
) on conflict (id) do nothing;

update public.users set account_type = 'clinic' where id = 'a1000001-0001-4001-8001-000000000001';
update public.users set account_type = 'laboratory' where id = 'a1000002-0002-4002-8002-000000000002';

insert into public.clinics (
  id, owner_user_id, name, slug, description, city, county, is_verified, open_for_collaboration, location
) values (
  'b2000001-0001-4001-8001-000000000001',
  'a1000001-0001-4001-8001-000000000001',
  'Clinica Dentara Smile Iași',
  'clinica-smile-iasi',
  'Implantologie și estetică dentară în centrul Iașiului.',
  'Iași', 'Iași', true, true,
  ST_SetSRID(ST_MakePoint(27.6014, 47.1585), 4326)::geography
) on conflict (id) do nothing;

insert into public.laboratories (
  id, owner_user_id, name, slug, description, city, county, is_verified, open_for_collaboration, location, collaboration_zone
) values (
  'b2000002-0002-4002-8002-000000000002',
  'a1000002-0002-4002-8002-000000000002',
  'Lab Proteze Dentare Nord',
  'lab-proteze-nord',
  'Laborator de protetică și zirconiu pentru clinici din Moldova.',
  'Iași', 'Iași', true, true,
  ST_SetSRID(ST_MakePoint(27.5890, 47.1620), 4326)::geography,
  'national'
) on conflict (id) do nothing;

insert into public.clinics (
  id, owner_user_id, name, slug, description, city, county, is_verified, location
) values (
  'b2000003-0003-4003-8003-000000000003',
  'a1000001-0001-4001-8001-000000000001',
  'Dental Art București',
  'dental-art-bucuresti',
  'Clinică premium în Sector 1.',
  'București', 'București', true,
  ST_SetSRID(ST_MakePoint(26.1025, 44.4268), 4326)::geography
) on conflict (id) do nothing;

insert into public.posts (id, author_type, author_id, post_type, content, status) values
  ('c3000001-0001-4001-8001-000000000001', 'clinic', 'b2000001-0001-4001-8001-000000000001', 'announcement',
   'Deschidem programări pentru consultații de implantologie — contactați-ne prin mesaje.', 'published'),
  ('c3000002-0002-4002-8002-000000000002', 'laboratory', 'b2000002-0002-4002-8002-000000000002', 'text',
   'Colaborăm cu clinici din Iași și împrejurimi pentru lucrări pe zirconiu și E.max.', 'published')
on conflict (id) do nothing;
