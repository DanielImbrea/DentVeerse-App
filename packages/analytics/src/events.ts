/**
 * The event catalog from docs/01-architecture.md §31, typed as a union so
 * every call site is checked against this exact list rather than allowing
 * arbitrary string event names to proliferate. Add new events here first,
 * not ad hoc at the call site.
 */
export type AnalyticsEvent =
  | { name: 'signup_completed'; properties: { account_type: 'patient' | 'clinic' | 'laboratory' } }
  | { name: 'onboarding_completed'; properties: { account_type: 'patient' | 'clinic' | 'laboratory' } }
  | { name: 'profile_created'; properties: { account_type: 'patient' | 'clinic' | 'laboratory' } }
  | { name: 'profile_edited'; properties: { org_type: 'clinic' | 'laboratory'; org_id: string } }
  | { name: 'search_performed'; properties: { query_length: number; result_count: number } }
  | { name: 'profile_viewed'; properties: { target_type: 'clinic' | 'laboratory' | 'dentist'; target_id: string } }
  | { name: 'portfolio_item_viewed'; properties: { portfolio_item_id: string; owner_type: 'clinic' | 'laboratory' } }
  | { name: 'follow_created'; properties: { target_type: 'clinic' | 'laboratory' | 'dentist' } }
  | { name: 'message_sent'; properties: { conversation_id: string } }
  | { name: 'opportunity_created'; properties: { author_type: 'clinic' | 'laboratory' } }
  | { name: 'opportunity_interest_registered'; properties: { opportunity_id: string } }
  | { name: 'review_submitted'; properties: { clinic_id: string; rating: number } }
  | { name: 'post_created'; properties: { post_type: string } }
  | { name: 'post_engagement'; properties: { post_id: string; interaction: 'like' | 'comment' | 'save' | 'share' } }
  // Reserved for the Monetization Phase (docs/09-subscriptions-payments.md) —
  // included in the type now so instrumentation is ready when that phase
  // begins, even though nothing fires this event yet (⚪ intentionally
  // deferred, matching the DB/API/UI status for subscriptions generally).
  | { name: 'subscription_started'; properties: { plan: string; billing_period: string } };
