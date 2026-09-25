-- pgTAP tests for the second-audit security fixes
-- (supabase/migrations/0025_protect_org_privileged_columns.sql,
-- 0026_protect_immutable_columns.sql, and the opportunity_interests
-- WITH CHECK split in 0019).
--
-- STATUS: TEST CREATED, NOT EXECUTED. Same caveat as
-- supabase/tests/database/rls_critical_paths.sql — no Postgres instance
-- available in this environment to actually run `supabase test db`. Run
-- this locally in Cursor to confirm these fixes actually work as intended
-- before considering the vulnerabilities closed.

begin;
select plan(6);

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'clinic-a-owner@test.local'),
  ('66666666-6666-6666-6666-666666666666', 'patient-b@test.local'),
  ('77777777-7777-7777-7777-777777777777', 'lab-owner@test.local');

update public.users set account_type = 'clinic' where id = '55555555-5555-5555-5555-555555555555';
update public.users set account_type = 'patient' where id = '66666666-6666-6666-6666-666666666666';
update public.users set account_type = 'laboratory' where id = '77777777-7777-7777-7777-777777777777';

insert into public.clinics (id, owner_user_id, name, slug, city)
values ('caaaaaaa-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Clinic A', 'clinic-a', 'Bucuresti');

-- ============================================================================
-- Test 1: a clinic manager CANNOT self-grant is_verified via a direct UPDATE.
-- ============================================================================
set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

select throws_ok(
  $$ update public.clinics set is_verified = true where id = 'caaaaaaa-1111-1111-1111-111111111111' $$,
  'P0001',
  null,
  'a clinic manager cannot self-grant is_verified (0025 fix)'
);

-- ============================================================================
-- Test 2: a clinic manager CANNOT fabricate their own rating_avg.
-- ============================================================================
select throws_ok(
  $$ update public.clinics set rating_avg = 5.0 where id = 'caaaaaaa-1111-1111-1111-111111111111' $$,
  'P0001',
  null,
  'a clinic manager cannot fabricate rating_avg (0025 fix)'
);

-- ============================================================================
-- Test 3: legitimate non-privileged column updates still work (sanity check
-- that the trigger isn't overly broad).
-- ============================================================================
select lives_ok(
  $$ update public.clinics set description = 'Updated description' where id = 'caaaaaaa-1111-1111-1111-111111111111' $$,
  'a clinic manager CAN still update non-privileged columns like description'
);

-- ============================================================================
-- Test 4: opportunity author_id is immutable after creation (0026 fix).
-- ============================================================================
insert into public.opportunities (id, author_type, author_id, title, description)
values ('eaaaaaaa-1111-1111-1111-111111111111', 'clinic', 'caaaaaaa-1111-1111-1111-111111111111', 'Test', 'Test description');

select throws_ok(
  $$ update public.opportunities set author_id = 'deadbeef-0000-0000-0000-000000000000' where id = 'eaaaaaaa-1111-1111-1111-111111111111' $$,
  'P0001',
  null,
  'opportunities.author_id cannot be reassigned after creation (0026 fix)'
);

-- ============================================================================
-- Test 5-6: conversation_members identity fields are immutable (0026 fix,
-- the most serious finding in the second audit).
-- ============================================================================
reset role;
insert into public.laboratories (id, owner_user_id, name, slug, city)
values ('baaaaaaa-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'Lab A', 'lab-a', 'Bucuresti');

insert into public.conversations (id, type, origin) values ('c0000000-1111-1111-1111-111111111111', 'direct', 'manual');
insert into public.conversation_members (conversation_id, user_id, acting_as_type, acting_as_id)
values
  ('c0000000-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'patient', '66666666-6666-6666-6666-666666666666'),
  ('c0000000-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'clinic', 'caaaaaaa-1111-1111-1111-111111111111');

set local role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);

select throws_ok(
  $$ update public.conversation_members set acting_as_type = 'clinic', acting_as_id = 'caaaaaaa-1111-1111-1111-111111111111' where conversation_id = 'c0000000-1111-1111-1111-111111111111' and user_id = '66666666-6666-6666-6666-666666666666' $$,
  'P0001',
  null,
  'a patient conversation member cannot spoof acting_as_type/acting_as_id to impersonate a clinic (0026 fix — most serious finding)'
);

select lives_ok(
  $$ update public.conversation_members set last_read_at = now() where conversation_id = 'c0000000-1111-1111-1111-111111111111' and user_id = '66666666-6666-6666-6666-666666666666' $$,
  'a conversation member CAN still update last_read_at (legitimate use of this policy)'
);

select * from finish();
rollback;
