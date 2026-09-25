# 06 — Feed & Messaging Architecture

## Part A — Feed

### Content model
Post types: `photo`, `video`, `text`, `portfolio` (links an existing `portfolio_items` row),
`announcement`, `collaboration` (links an `opportunities` row). Only clinic/laboratory accounts can
author posts; patients view and interact (client §15/§17 implicitly — patients are never listed as
publishers in the spec).

### Visual differentiation by post type (client requirement — feed must not feel visually noisy)
Each `post_type` renders through a distinct `PostCard` variant sharing the same outer chrome
(author header, interaction bar) but distinct body treatment:
- `portfolio`: image/video carousel with a "Case" chip and category tag, pulling directly from the
  linked portfolio item — reinforces portfolio as the platform's visual core rather than duplicating
  upload flows.
- `announcement`: text-forward card with a subtle `accent` left-border treatment, no image required.
- `collaboration`: card surfaces the linked opportunity's title/city/specialization inline with a
  "View Opportunity" CTA, visually distinct (uses the `secondary`/graphite surface tint) so it reads
  as "business," not "casual update."
- `photo`/`video`: standard media-forward card.

### Pagination & ranking (kept intentionally simple per master prompt §13 instruction not to
over-engineer an AI recommendation system)
- **MVP ranking:** reverse-chronological within the user's **follow graph** (posts from
  followed clinics/labs) interleaved with a smaller share of **local discovery** posts (same city /
  nearby, from non-followed but verified/high-rated orgs) — a simple weighted merge, not a learned
  model. Weighting (e.g., 80% followed / 20% discovery) is a config value, not hardcoded, so it can
  be tuned without a redeploy.
- **Pagination:** cursor-based keyset pagination on `(created_at desc, id)`, fetched in pages of
  ~15–20 posts via TanStack Query's `useInfiniteQuery`.
- **Counters:** `like_count`/`comment_count`/`save_count`/`share_count` are denormalized columns
  (see `02-database.md`) maintained by triggers — the feed query never does a live `COUNT(*)` join,
  which is the main feed-performance risk at scale.

### Media loading & video handling
- Images: served from Supabase Storage's CDN with on-the-fly resizing (Supabase Image
  Transformations) so the feed requests appropriately sized thumbnails, not full-resolution
  originals — critical for mobile data/perf.
- Video: uploaded originals are sent to **Mux or Cloudflare Stream** via an Edge Function trigger
  on upload completion; the feed only ever plays back the transcoded adaptive-bitrate stream +
  poster thumbnail, never the raw upload. Autoplay (muted, on-scroll-into-view) mirrors standard
  mobile feed UX, with a tap-to-unmute affordance.
- Caching: TanStack Query cache + `expo-image`'s disk cache for images; video playback relies on the
  streaming provider's CDN rather than local caching of full video files.

### Interactions
`likes`, `comments`, `saves`, `share` (native share sheet + deep link, not an in-app "share" content
type) all follow the same optimistic-UI pattern: immediate local state flip → mutation fired →
reconciled/rolled back on server response. Rate limiting (per §Security) caps rapid repeated
like/unlike or comment spam from a single account.

## Part B — Messaging

### Realtime architecture
Built entirely on **Supabase Realtime** (Postgres logical replication → WebSocket broadcast),
scoped by RLS:
- Client subscribes to `postgres_changes` on `messages` filtered to `conversation_id = :id`, which
  Supabase evaluates against the same RLS policy as a `SELECT` would — a user who isn't a
  `conversation_members` row for that conversation cannot subscribe, closing the same access hole a
  REST read would have.
- **Presence — confirmed global, platform-wide** (`16-client-decisions-mvp-scope-update.md` §3):
  uses Supabase Realtime's Presence API on a **single global channel keyed by `user_id`**
  (e.g. `presence:online-users`), not a per-conversation channel. A user's "online" state is
  broadcast once and read by any screen showing that user (conversation list, chat header, profile),
  rather than re-negotiated per conversation.

### Conversation creation rules
Enforced via an RPC/Edge Function (`create_or_get_conversation`), not a raw client insert, so the
allowed-pair rules (client §17: Patient→Clinic, Clinic→Laboratory, Laboratory→Clinic, Clinic→Clinic,
Laboratory→Laboratory) and blocked-user checks are enforced server-side in one place:
1. Reject if either party has blocked the other (`blocked_users` check both directions).
2. Reject patient-initiated conversations with laboratories (not in the allowed-pair list) and any
   patient→patient conversation (patients don't message each other per spec).
3. If a conversation between the same two `acting_as` identities already exists, return it instead
   of creating a duplicate.
4. If triggered by an accepted `opportunity_interests` row, tag `conversations.origin = 'opportunity'`
   and link back for context in the chat header ("Started from: <opportunity title>").

### Message ordering & pagination
- Ordering: `created_at` plus `id` as tiebreaker (both indexed together) — never relies on
  client-supplied timestamps for ordering.
- Pagination: keyset pagination loading the most recent N messages first, "load earlier" fetching
  backwards by `created_at < cursor`.
- **Optimistic send:** message appended to local state immediately with a temporary client-side id
  and `sending` status; replaced by the server-confirmed row (via the Realtime echo or the mutation
  response) once persisted; failed sends show an inline retry affordance rather than silently
  disappearing.

### Attachments
Images/files upload to the **private** `message-attachments` bucket; the message row references
`message_attachments.storage_path`, and the client renders attachments via **short-lived signed
URLs** requested per view (batched per page of messages, not per-message individual calls) —
never a durable public URL, consistent with the private-bucket rule in `03-security.md`.

### Seen / unread
- `messages.seen_at` set when the recipient's client acknowledges a message it has rendered
  on-screen (debounced, not per-message-instant to avoid write amplification).
- Unread badge count per conversation is derived as `count(messages where created_at >
  conversation_members.last_read_at)`, computed client-side from the already-fetched page for the
  active conversation, and via a lightweight aggregate query for the conversation list badge —
  not a live subscription-triggered recount on every keystroke.

### Offline behavior & retry
- Outgoing messages queue locally (Zustand-persisted or `expo-sqlite`-backed queue) when offline and
  flush on reconnect, in original order, each retried with exponential backoff up to a bounded
  attempt count before surfacing a manual-retry state to the user.
- Realtime subscription reconnect uses Supabase's built-in reconnection with a resync fetch
  (re-pull latest page) on regain-connectivity to reconcile any messages missed while offline —
  WebSocket delivery alone is not treated as guaranteed-once delivery.

### Block / Report inside messaging
Both actions are available from the conversation header. Blocking immediately: (1) prevents new
messages from being sent by either party into that conversation (enforced by an RLS/RPC check on
insert, not just UI hiding), (2) hides the conversation from the blocker's active list (moved to an
"archived/blocked" filter, not deleted — preserves evidence for potential reports/moderation).
Reporting a message creates a `reports` row (`target_type='message'`) with the message content
snapshotted at report time (so subsequent deletion/editing doesn't erase moderation evidence) —
this snapshot detail should be added as a `content_snapshot` field on `reports` for message-type
reports specifically, noted here as a schema refinement for the coding agent to implement.
