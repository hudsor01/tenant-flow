# Phase 52: Notification Center, Activity Feed & Channel Honesty - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 52-notification-center-activity-feed-channel-honesty
**Areas discussed:** Inbox surface, Event catalog, Activity feed, Unread policy

---

## Inbox surface

| Option | Description | Selected |
|--------|-------------|----------|
| Popover + full page (Recommended) | Bell popover with recent items; View-all links to dedicated /notifications page | ✓ |
| Popover only | Popover is the whole surface; no dedicated route | |
| Full page only | Bell navigates straight to /notifications | |

| Option | Description | Selected |
|--------|-------------|----------|
| 10 recent + actions (Recommended) | 10 most recent, unread distinct, mark-all-read, View-all | ✓ |
| 5 recent, minimal | 5 items + View-all only | |
| You decide | Claude picks during planning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate + mark read (Recommended) | Click marks read and follows action_url to the entity | ✓ |
| Mark read only | Click toggles read state; navigation via explicit link | |
| You decide | Claude picks during planning | |

**User's choice:** All recommended options.

---

## Event catalog

| Option | Description | Selected |
|--------|-------------|----------|
| Core set (Recommended) | E-sign lifecycle + maintenance created/status-changed; CRUD excluded | ✓ |
| E-sign only | Only signature events notify | |
| Broad set | Core + property/unit/tenant/lease CRUD events | |

| Option | Description | Selected |
|--------|-------------|----------|
| Email per-category (Recommended) | Toggles govern email only; in-app always created | ✓ |
| Email + in-app per-category | Two toggle columns per category | |
| You decide | Claude picks during planning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Instant per event (Recommended) | Immediate send via existing Resend rail | ✓ |
| Hourly batch | Coalesce into periodic summary | |
| You decide | Claude picks during planning | |

**User's choice:** All recommended options.

---

## Activity feed

| Option | Description | Selected |
|--------|-------------|----------|
| Card in dashboard grid (Recommended) | Activity card alongside existing widgets | ✓ |
| Full-width bottom section | Wider timeline below the portfolio table | |
| You decide | Claude places during planning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Attention vs audit (Recommended) | Notifications = happened TO you; activity = full audit trail incl. own actions | ✓ |
| System events only | Activity shows only system/automated events | |
| You decide | Claude locks the rule during planning | |

| Option | Description | Selected |
|--------|-------------|----------|
| 10 recent, no page (Recommended) | Card shows 10 most recent; no /activity route in v10 | ✓ |
| 10 recent + /activity page | Card plus full paginated history route | |
| You decide | Claude sizes during planning | |

**User's choice:** All recommended options.

---

## Unread policy

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit only (Recommended) | Click-through + mark-all-read; popover open never auto-clears | ✓ |
| Auto on popover open | Viewing marks visible items read | |
| You decide | Claude picks during planning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Count, capped 9+ (Recommended) | Numeric badge capping at 9+ | ✓ |
| Count, capped 99+ | Higher cap | |
| Dot only | Presence dot, no number | |

| Option | Description | Selected |
|--------|-------------|----------|
| 90d read / 180d unread (Recommended) | Read archives at 90d, unread at 180d; archive-then-delete | ✓ |
| Flat 90d | Everything archives at 90d | |
| You decide | Claude picks matching existing retention table | |

**User's choice:** All recommended options.

## Claude's Discretion

- Popover component choice (Popover vs DropdownMenu)
- Exact card placement within the dashboard grid
- Activity entry copy format, empty states, loading skeletons

## Deferred Ideas

- Dedicated /activity history page with pagination (post-v10 if earned)
- Notification email batching (Phase 62 digest is the summarization surface)
