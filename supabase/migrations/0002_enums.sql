-- Enum types. See docs/02-database.md for the table-by-table rationale.

create type account_type as enum ('patient', 'clinic', 'laboratory');
create type entity_status as enum ('active', 'suspended', 'deleted');
create type org_member_role as enum ('owner', 'admin', 'editor');
create type collaboration_zone as enum ('local', 'national', 'european', 'international');
create type service_category as enum ('clinic', 'laboratory', 'both');
create type portfolio_owner_type as enum ('clinic', 'laboratory');
create type portfolio_status as enum ('published', 'draft', 'removed');
create type media_type as enum ('image', 'video');
create type before_after_role as enum ('before', 'after', 'single');
create type post_author_type as enum ('clinic', 'laboratory');
create type post_type as enum ('photo', 'video', 'text', 'portfolio', 'announcement', 'collaboration');
create type post_status as enum ('published', 'removed', 'flagged');
create type comment_status as enum ('visible', 'removed');
create type follow_target_type as enum ('clinic', 'laboratory', 'dentist');
create type favorite_target_type as enum ('clinic', 'laboratory', 'dentist', 'post');
create type opportunity_author_type as enum ('clinic', 'laboratory');
create type opportunity_status as enum ('open', 'closed', 'filled', 'cancelled');
create type opportunity_interest_status as enum ('pending', 'accepted', 'rejected', 'withdrawn', 'withdrawn_by_system');
create type conversation_type as enum ('direct');
create type conversation_origin as enum ('manual', 'opportunity');
create type acting_as_type as enum ('patient', 'clinic', 'laboratory');
create type message_status as enum ('sent', 'deleted');
create type attachment_type as enum ('image', 'file');
create type review_status as enum ('visible', 'hidden_by_admin', 'flagged');
create type verification_subject_type as enum ('clinic', 'laboratory');
create type verification_status as enum ('pending', 'approved', 'rejected');
create type verification_document_type as enum ('cui', 'dsp_authorization', 'technician_certificate', 'id_document', 'other');
create type notification_type as enum (
  'new_follower', 'new_like', 'new_comment', 'new_message',
  'collaboration_request', 'opportunity_response', 'verification_approved', 'new_review'
);
create type device_platform as enum ('ios', 'android');
create type report_target_type as enum ('profile_clinic', 'profile_laboratory', 'post', 'comment', 'message', 'review');
create type report_reason as enum ('spam', 'fake_account', 'offensive_content', 'scam', 'inappropriate_content', 'other');
create type report_status as enum ('open', 'reviewing', 'resolved_actioned', 'resolved_dismissed');
create type admin_role as enum ('super_admin', 'moderator', 'support');
create type consent_type as enum ('terms', 'privacy_policy', 'marketing');
create type export_request_status as enum ('pending', 'processing', 'ready', 'expired');

-- Reusable updated_at trigger function, attached to every table with an
-- updated_at column below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
