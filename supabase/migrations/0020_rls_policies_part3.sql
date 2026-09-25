-- RLS part 3: reviews, verification, notifications, moderation, GDPR, admin.

-- ============================================================================
-- reviews — public read (visible), patient (no existing review) can insert,
-- author can update within edit window / admin, author/admin delete.
-- ============================================================================
alter table public.reviews enable row level security;

create policy reviews_select_public on public.reviews
  for select using (status = 'visible' or patient_user_id = auth.uid() or public.is_platform_admin());
create policy reviews_insert on public.reviews
  for insert with check (
    patient_user_id = auth.uid() and public.current_account_type() = 'patient'
  );
create policy reviews_update on public.reviews
  for update using (
    (patient_user_id = auth.uid() and created_at > now() - interval '48 hours')
    or public.is_platform_admin()
  );
create policy reviews_delete on public.reviews
  for delete using (patient_user_id = auth.uid() or public.is_platform_admin());

-- ============================================================================
-- verification_requests / verification_documents — subject managers +
-- admin only. Documents: admin-only SELECT, subject manager INSERT only.
-- ============================================================================
alter table public.verification_requests enable row level security;

create policy verification_requests_select on public.verification_requests
  for select using (
    (subject_type = 'clinic' and public.is_clinic_manager(subject_id))
    or (subject_type = 'laboratory' and public.is_laboratory_manager(subject_id))
    or public.is_platform_admin()
  );
create policy verification_requests_insert on public.verification_requests
  for insert with check (
    (subject_type = 'clinic' and public.is_clinic_manager(subject_id))
    or (subject_type = 'laboratory' and public.is_laboratory_manager(subject_id))
  );
create policy verification_requests_update_admin on public.verification_requests
  for update using (public.is_platform_admin());

alter table public.verification_documents enable row level security;

-- CRITICAL (docs/03-security.md §4): no SELECT policy for regular users.
-- Only admins can read; subject org can INSERT (upload) but never SELECT
-- after upload — retrieval for the submitter is status-only, never document
-- content, enforced by the absence of any non-admin SELECT policy here.
create policy verification_documents_select_admin_only on public.verification_documents
  for select using (public.is_platform_admin());
create policy verification_documents_insert on public.verification_documents
  for insert with check (
    exists (
      select 1 from public.verification_requests vr
      where vr.id = verification_request_id
        and (
          (vr.subject_type = 'clinic' and public.is_clinic_manager(vr.subject_id))
          or (vr.subject_type = 'laboratory' and public.is_laboratory_manager(vr.subject_id))
        )
    )
  );
create policy verification_documents_delete_admin on public.verification_documents
  for delete using (public.is_platform_admin());

-- ============================================================================
-- notifications / notification_preferences / devices — self only.
-- ============================================================================
alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update using (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete using (user_id = auth.uid());
-- No client INSERT policy — notifications are created exclusively by the
-- SECURITY DEFINER trigger functions in 0017_notification_triggers.sql.

alter table public.notification_preferences enable row level security;
create policy notification_preferences_select_own on public.notification_preferences for select using (user_id = auth.uid());
create policy notification_preferences_update_own on public.notification_preferences for update using (user_id = auth.uid());

alter table public.devices enable row level security;
create policy devices_select_own on public.devices for select using (user_id = auth.uid());
create policy devices_insert_own on public.devices for insert with check (user_id = auth.uid());
create policy devices_update_own on public.devices for update using (user_id = auth.uid());
create policy devices_delete_own on public.devices for delete using (user_id = auth.uid());

alter table public.push_queue enable row level security;
-- No client policies at all — Edge Function (service-role) only.

-- ============================================================================
-- blocked_users — self (as blocker) only.
-- ============================================================================
alter table public.blocked_users enable row level security;

create policy blocked_users_select_own on public.blocked_users for select using (blocker_user_id = auth.uid());
create policy blocked_users_insert_own on public.blocked_users for insert with check (blocker_user_id = auth.uid());
create policy blocked_users_delete_own on public.blocked_users for delete using (blocker_user_id = auth.uid());

-- ============================================================================
-- reports — reporter sees own; admin sees all; reporter cannot see other
-- reports (docs/03-security.md: reporter identity never surfaced to the
-- reported party — enforced here by simply never granting the reported party
-- any SELECT on reports at all).
-- ============================================================================
alter table public.reports enable row level security;

create policy reports_select on public.reports
  for select using (reporter_user_id = auth.uid() or public.is_platform_admin());
create policy reports_insert on public.reports
  for insert with check (reporter_user_id = auth.uid());
create policy reports_update_admin on public.reports for update using (public.is_platform_admin());

-- ============================================================================
-- platform_limits — public read (so clients can show "x/25 photos used"),
-- admin write.
-- ============================================================================
alter table public.platform_limits enable row level security;
create policy platform_limits_select_public on public.platform_limits for select using (true);
create policy platform_limits_admin_write on public.platform_limits for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ============================================================================
-- GDPR tables — self only.
-- ============================================================================
alter table public.consent_records enable row level security;
create policy consent_records_select_own on public.consent_records for select using (user_id = auth.uid());
create policy consent_records_insert_own on public.consent_records for insert with check (user_id = auth.uid());

alter table public.data_export_requests enable row level security;
create policy data_export_requests_select_own on public.data_export_requests for select using (user_id = auth.uid());
create policy data_export_requests_insert_own on public.data_export_requests for insert with check (user_id = auth.uid());
create policy data_export_requests_delete_own on public.data_export_requests for delete using (user_id = auth.uid());
-- No client UPDATE policy — fulfillment (status -> ready, file_storage_path)
-- is Edge Function (service-role) only.

alter table public.account_deletion_requests enable row level security;
create policy account_deletion_requests_select_own on public.account_deletion_requests for select using (user_id = auth.uid());
create policy account_deletion_requests_insert_own on public.account_deletion_requests for insert with check (user_id = auth.uid());

-- ============================================================================
-- admin_users / audit_logs — admin only, audit_logs is insert-only even for
-- admins (append-only ledger) via application-layer discipline (Edge
-- Functions always INSERT, never UPDATE/DELETE) plus no UPDATE/DELETE
-- policy at all here.
-- ============================================================================
alter table public.admin_users enable row level security;
create policy admin_users_select_admin on public.admin_users for select using (public.is_platform_admin());

alter table public.audit_logs enable row level security;
create policy audit_logs_select_admin on public.audit_logs for select using (public.is_platform_admin());
create policy audit_logs_insert_admin on public.audit_logs for insert with check (public.is_platform_admin());
-- No UPDATE/DELETE policy anywhere in this file for audit_logs — append-only.
