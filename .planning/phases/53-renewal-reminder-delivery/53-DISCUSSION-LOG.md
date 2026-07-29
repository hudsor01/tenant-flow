# Phase 53: Renewal Reminder Delivery - Discussion Log

> **Audit trail only.** Not consumed by downstream agents — decisions live in CONTEXT.md.

**Date:** 2026-07-21
**Phase:** 53-renewal-reminder-delivery
**Areas discussed:** Reminder cadence, Starter behavior, Email content, Go-live policy

---

## Reminder cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 30/7/1 (Recommended) | Delivery is the gap; queue+thresholds exist and are tested | ✓ |
| Widen to 60/30/7 | More runway but requires queue + CHECK + backfill change | |
| You decide | | |

**User's choice:** Keep 30/7/1.

## Starter behavior

| Option | Description | Selected |
|--------|-------------|----------|
| In-app only, no email (Recommended) | Starter gets free in-app notification + widget; email gated Growth/Max | ✓ |
| Nothing for Starter | Skip Starter entirely | |
| You decide | | |

**User's choice:** In-app only, no email.

## Email content

| Option | Description | Selected |
|--------|-------------|----------|
| One email per lease (Recommended) | 1:1 with delivery-state rows, clean idempotency | ✓ |
| Per-owner digest | Coalesce same-day; Phase 62 owns digest | |

| Option | Description | Selected |
|--------|-------------|----------|
| View lease + renew (Recommended) | CTA deep-links /leases/[id] + renew dialog | ✓ |
| Dashboard widget | Links to dashboard | |

| Option | Description | Selected |
|--------|-------------|----------|
| Match existing transactional emails | Reuse branded auth/e-sign layout | |
| New reminder-specific template | Bespoke reminder design (on shared Resend rail) | ✓ |

**User's choice:** One email per lease; CTA to lease detail; NEW reminder-specific template.

## Go-live policy

| Option | Description | Selected |
|--------|-------------|----------|
| Clean slate: expire all, then start (Recommended) | Count + expire backlog without sending, then enable | ✓ |
| Catch-up: send still-valid windows | Risk day-one burst | |

| Option | Description | Selected |
|--------|-------------|----------|
| app_config flag, default off (Recommended) | reminders_delivery_enabled gates the edge fn; migration flips it last | ✓ |
| Cron schedule as switch | No in-function guard | |

**User's choice:** Clean slate + app_config flag (default off).

## Claude's Discretion
- delivery_status column shape, Idempotency-Key derivation, email copy/subject wording, cron slot.

## Deferred Ideas
- Widen cadence (60/30/7) — future; per-owner digest — Phase 62.
