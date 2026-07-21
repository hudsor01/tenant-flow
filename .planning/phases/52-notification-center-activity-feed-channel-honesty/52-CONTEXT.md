# Phase 52: Notification Center, Activity Feed & Channel Honesty - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

The milestone's foundation phase. Delivers: (1) the in-app notification write path (`create_notification` RPC + owner RLS on the existing `notifications` table) that every later v10.0 phase publishes through; (2) the owner-facing notification center (header bell + popover + `/notifications` page); (3) the dashboard activity timeline over the existing `activity` table; (4) channel honesty — SMS and browser-push toggles removed from Settings; (5) orphan schema cleanup (`payout_events` table, `leases.docuseal_document_url` column). Requirements: NOTIF-01..05, ACT-01/02, HONEST-01/02, CLEAN-01/02.

Out of this phase: renewal-reminder events (Phase 53 publishes them), application events (57), digest events (62), any email-template redesign, any Realtime subscription, any service worker.

</domain>

<decisions>
## Implementation Decisions

### Inbox surface
- **D-01:** Bell popover + dedicated `/notifications` page. Popover = quick glance; "View all" routes to the full page (which is where retention-scale history lives).
- **D-02:** Popover shows the 10 most recent, unread visually distinct, mark-all-read button, View-all link. Density matches the header's existing CommandDialog patterns.
- **D-03:** Clicking a notification marks it read AND navigates to its `action_url` (entity deep link — lease, maintenance request). Notifications are shortcuts to the work.

### Event catalog
- **D-04:** Launch event set (wired in this phase): e-sign lifecycle (tenant signed, lease fully executed, finalize failed) + maintenance (request created, status changed). CRUD events (property/unit/tenant edits) are explicitly NOT notifications — they belong to the activity feed. Later phases wire their own events through the same RPC (reminder sent → 53, application received → 57, digest sent → 62).
- **D-05:** Settings notification matrix after SMS/push removal: per-category toggles govern EMAIL only. In-app notifications are always created (GitHub/Linear model) — the inbox is passive, the badge stays truthful, no silent-inbox foot-gun.
- **D-06 [informational]:** Notification emails send instantly per event via the existing Resend rail (suppression-honoring). No hourly batching — Phase 62's digest covers summarization. **Scope note (2026-07-19):** email DELIVERY is deferred to Phase 53, which builds the suppression-honoring send rail (REMIND-03 ports the suppression layers) — sending before that rail exists would hit the documented suppression-bypass/CI-spam pitfall. Phase 52 is in-app only; D-06 is implemented by Phase 53's plans, not this phase's.

### Activity feed
- **D-07:** Activity lives as a card in the existing dashboard widget grid (alongside Quick Actions / expiring leases), not a full-width section.
- **D-08:** ACT-02 split rule locked — **attention vs audit**: notifications = things that happened TO the owner needing awareness (signatures, maintenance, reminders); activity = the complete audit trail INCLUDING the owner's own actions (created lease, edited property, uploaded document). No overlap ambiguity.
- **D-09:** Activity card shows 10 most recent; NO dedicated `/activity` route in v10. The card is the feature.

### Unread policy
- **D-10:** Explicit mark-read only — click-through marks that item, mark-all-read clears the rest. Opening the popover never auto-clears (badge integrity, GitHub model).
- **D-11:** Unread badge is a numeric count capped at "9+".
- **D-12:** Retention: read notifications archive at 90d, unread at 180d, archive-then-delete cron in the 3 AM window — consistent with the existing retention family (`security_events`, `user_errors`).

### Claude's Discretion
- Popover component choice (Popover vs DropdownMenu), exact card placement within the dashboard grid, activity entry copy format, empty states (use the `Empty` compound component per CLAUDE.md), loading skeletons.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone research (decisions already made at milestone level)
- `.planning/research/SUMMARY.md` — synthesized v10.0 research; Phase-52-relevant: polling not Realtime, zero new deps, notification write-path unblocks phases 53/57/60/62
- `.planning/research/ARCHITECTURE.md` — notification center integration design: TanStack Query `refetchInterval: 60_000`, client `NotificationBell` island in `AppShellHeader`, `create_notification` RPC mirroring `sign_lease_with_token`'s atomic insert
- `.planning/research/PITFALLS.md` — notification-center pitfalls: unbounded growth (D-12 addresses), N+1 unread counts (single count query), notification spam eroding trust (D-04's curated event set addresses)

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — NOTIF-01..05, ACT-01/02, HONEST-01/02, CLEAN-01/02 (exact acceptance wording)
- `.planning/ROADMAP.md` — Phase 52 goal + success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `notifications` table (base schema `20251101000000`): `id, user_id, notification_type, entity_type, entity_id, title, message, is_read, read_at, action_url, created_at` — schema is already inbox-complete; needs owner RLS + write-path RPC, NOT a new table
- `activity` table + `get_user_dashboard_activities` RPC — existing, unconsumed; the activity card reads through these
- `src/components/shell/app-shell-header.tsx` — bell mounts here (client island next to `app-shell-search`)
- `src/components/settings/notification-settings.tsx` — SMS toggle (line ~127) and push toggle (line ~144) to remove; per-category email matrix to keep
- `sign_lease_with_token` RPC — the atomic-insert SECURITY DEFINER pattern `create_notification` mirrors
- Existing retention crons (`cleanup-security-events` etc.) — the notification cleanup cron copies this shape (archive table, `LIMIT 10000`, `FOR UPDATE SKIP LOCKED`, 3 AM window)
- `_shared/resend.ts` in edge functions — the email send rail for instant per-event emails

### Established Patterns
- Query keys via `queryOptions()` factories in `src/hooks/api/query-keys/` — new `notification-keys.ts` follows suit; unread-count query uses `refetchInterval: 60_000`
- Mutations invalidate domain keys + `ownerDashboardKeys.all`
- One policy per operation per role; `(select auth.uid())` in RLS; RPCs validate `auth.uid()` + lock `search_path = public`
- `Empty` compound component for empty states; `text-muted-foreground`; no new `@modal` slots (plain routes + Dialog per STACK.md)

### Integration Points
- `create_notification` is called by: this phase's e-sign + maintenance event hooks, then Phase 53 (reminder sent), 57 (application received), 62 (digest sent)
- E-sign event source: `lease-signature` / `sign-lease-token` edge functions + signature RPCs (where "tenant signed"/"fully executed"/"finalize failed" are already known)
- Maintenance event source: maintenance mutations (created/status-changed)
- CLEAN-01/02 migrations: archive-then-drop `payout_events`; drop `leases.docuseal_document_url`

</code_context>

<specifics>
## Specific Ideas

- GitHub/Linear as the explicit reference model: passive always-on in-app inbox, explicit mark-read, numeric badge, email toggles as the only preference surface
- The bell popover should feel native to the existing header (CommandDialog density), not a bolt-on

</specifics>

<deferred>
## Deferred Ideas

- Dedicated `/activity` history page with pagination — revisit after v10 if the dashboard card earns it
- Hourly/daily notification email batching — Phase 62's digest is the summarization surface; only reconsider if per-event volume becomes a complaint

</deferred>

---

*Phase: 52-Notification Center, Activity Feed & Channel Honesty*
*Context gathered: 2026-07-19*
