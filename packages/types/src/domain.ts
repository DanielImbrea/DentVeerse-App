// Hand-authored composite/domain types that build on the generated Supabase
// `Database` type (see supabase.ts). Keep these thin — prefer deriving from
// `Database['public']['Tables'][...]['Row']` once Phase 2 generates real types,
// rather than re-declaring shapes by hand and risking drift.

export type AccountType = 'patient' | 'clinic' | 'laboratory';

export type OrgType = 'clinic' | 'laboratory';

export type OrgMemberRole = 'owner' | 'admin' | 'editor';

export type CollaborationZone = 'local' | 'national' | 'european' | 'international';

export type PostType =
  | 'photo'
  | 'video'
  | 'text'
  | 'portfolio'
  | 'announcement'
  | 'collaboration';

export type NotificationType =
  | 'new_follower'
  | 'new_like'
  | 'new_comment'
  | 'new_message'
  | 'collaboration_request'
  | 'opportunity_response'
  | 'verification_approved'
  | 'new_review';

export type OpportunityStatus = 'open' | 'closed' | 'filled' | 'cancelled';

export type OpportunityInterestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'withdrawn_by_system';

export type ReportReason =
  | 'spam'
  | 'fake_account'
  | 'offensive_content'
  | 'scam'
  | 'inappropriate_content'
  | 'other';

export type VerificationDocumentType =
  | 'cui'
  | 'dsp_authorization'
  | 'technician_certificate'
  | 'id_document'
  | 'other';

/**
 * Centralizes every role/permission check so it is never duplicated ad hoc
 * across screens — see docs/04-mobile.md §3. Implemented as a hook
 * (`usePermissions()`) in apps/mobile/src/features/auth, this is the type
 * contract that hook returns.
 */
export interface Permissions {
  canPost: boolean;
  canManageTeam: boolean;
  canEditServices: boolean;
  canRespondToOpportunity: boolean;
  canCreateOpportunity: boolean;
  canReview: boolean;
}
