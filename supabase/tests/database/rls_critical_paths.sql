-- pgTAP RLS test suite. Run via `supabase test db`.
-- Priority: verification_documents (highest sensitivity, docs/03-security.md §4),
-- account_type immutability, blocked-user full-hide, follows public visibility,
-- review uniqueness, opportunity_interests duplicate prevention.
--
-- IMPORTANT (per user instruction): these tests are WRITTEN but NOT EXECUTED
-- in this environment — there is no network access here to run `supabase
-- start` / `supabase test db`. Run them locally in Cursor before relying on
-- them. See docs/12-testing-cicd.md for the full testing strategy this suite
-- implements a first slice of.

begin;
select plan(12);

-- Setup: two fake auth users via auth.users (pgTAP tests typically run with
-- direct table access before RLS is layered on via SET ROLE / set_config).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'clinic-owner@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'other-clinic-owner@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'patient@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'admin@test.local'),
  ('55555555-5555-5555-5555-555555555555', 'lab-owner@test.local');

update public.users set account_type = 'clinic' where id = '11111111-1111-1111-1111-111111111111';
update public.users set account_type = 'clinic' where id = '22222222-2222-2222-2222-222222222222';
update public.users set account_type = 'patient' where id = '33333333-3333-3333-3333-333333333333';
update public.users set account_type = 'laboratory' where id = '55555555-5555-5555-5555-555555555555';

insert into public.admin_users (id, email, role) values
  ('44444444-4444-4444-4444-444444444444', 'admin@test.local', 'super_admin');

-- ============================================================================
-- Test 1-2: account_type immutability
-- ============================================================================
select throws_ok(
  $$ update public.users set account_type = 'laboratory' where id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001',
  'account_type is immutable and cannot be changed after creation',
  'account_type cannot be changed after creation'
);

select is(
  (select account_type::text from public.users where id = '11111111-1111-1111-1111-111111111111'),
  'clinic',
  'account_type remains unchanged after a rejected update attempt'
);

-- ============================================================================
-- Setup: a clinic owned by user 1, with a verification request + document.
-- ============================================================================
insert into public.clinics (id, owner_user_id, name, slug, city)
values ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Test Clinic', 'test-clinic', 'Bucuresti');

insert into public.verification_requests (id, subject_type, subject_id, status)
values ('a1111111-1111-1111-1111-111111111111', 'clinic', 'c1111111-1111-1111-1111-111111111111', 'pending');

insert into public.verification_documents (id, verification_request_id, storage_path, document_type)
values ('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'c1111111.../cui.pdf', 'cui');

-- ============================================================================
-- Test 3-5: verification_documents — admin-only SELECT, never the submitter.
-- ============================================================================
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (select count(*) from public.verification_documents where id = 'd1111111-1111-1111-1111-111111111111')::int,
  0,
  'clinic owner (submitter) cannot SELECT their own verification document'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is(
  (select count(*) from public.verification_documents where id = 'd1111111-1111-1111-1111-111111111111')::int,
  0,
  'an unrelated clinic owner cannot SELECT another org''s verification document'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);

select is(
  (select count(*) from public.verification_documents where id = 'd1111111-1111-1111-1111-111111111111')::int,
  1,
  'platform admin CAN SELECT the verification document'
);

-- ============================================================================
-- Test 6-7: follows — fully public read (docs/16 §1).
-- ============================================================================
reset role;
insert into public.follows (follower_user_id, target_type, target_id)
values ('33333333-3333-3333-3333-333333333333', 'clinic', 'c1111111-1111-1111-1111-111111111111');

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is(
  (select count(*) from public.follows where target_id = 'c1111111-1111-1111-1111-111111111111')::int,
  1,
  'any authenticated user can read another clinic''s follower list (fully public per client decision)'
);

set local role anon;
select is(
  (select count(*) from public.follows where target_id = 'c1111111-1111-1111-1111-111111111111')::int,
  1,
  'even an anonymous (unauthenticated) request can read the public follows list'
);

-- ============================================================================
-- Test 8-9: reviews — one review per patient per clinic (uniqueness).
-- ============================================================================
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select lives_ok(
  $$ insert into public.reviews (clinic_id, patient_user_id, rating) values ('c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 5) $$,
  'a patient can submit a review for a clinic they have not reviewed yet'
);

select throws_ok(
  $$ insert into public.reviews (clinic_id, patient_user_id, rating) values ('c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 3) $$,
  '23505',
  null,
  'a second review by the same patient for the same clinic is rejected (unique constraint)'
);

-- ============================================================================
-- Test 10: rating recalculation trigger fired correctly.
-- ============================================================================
select is(
  (select rating_count from public.clinics where id = 'c1111111-1111-1111-1111-111111111111'),
  1,
  'clinics.rating_count is recalculated to 1 after the single visible review'
);

-- ============================================================================
-- Test 11-12: opportunity_interests — duplicate prevention.
-- ============================================================================
reset role;
insert into public.laboratories (id, owner_user_id, name, slug, city)
values ('b1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Test Lab', 'test-lab', 'Bucuresti');

insert into public.opportunities (id, author_type, author_id, title, description)
values ('e1111111-1111-1111-1111-111111111111', 'clinic', 'c1111111-1111-1111-1111-111111111111', 'Test opportunity', 'Test description');

set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

select lives_ok(
  $$ insert into public.opportunity_interests (opportunity_id, responder_type, responder_id) values ('e1111111-1111-1111-1111-111111111111', 'laboratory', 'b1111111-1111-1111-1111-111111111111') $$,
  'a laboratory can register interest in an open opportunity'
);

select throws_ok(
  $$ insert into public.opportunity_interests (opportunity_id, responder_type, responder_id) values ('e1111111-1111-1111-1111-111111111111', 'laboratory', 'b1111111-1111-1111-1111-111111111111') $$,
  '23505',
  null,
  'a duplicate interest registration from the same laboratory is rejected (unique constraint)'
);

select * from finish();
rollback;
