# Phase 54: E-sign & Storage Metering - Discussion Log

> **Audit trail only.** Not consumed by downstream agents — decisions live in CONTEXT.md.

**Date:** 2026-07-23
**Phase:** 54-e-sign-storage-metering
**Areas discussed:** E-sign cap reset window, Resend metering, Storage over-quota behavior, Grandfather scope

---

## Pre-discussion finding: quota values are locked by pricing claims
Scout confirmed the sold values in `src/config/pricing.ts` + `get_user_plan_limits`: e-sign Growth 25/mo, Max unlimited, Starter none; storage Trial 1 / Starter 10 / Growth 50 GB. Max storage is sold as "Unlimited" but the DB function returns 100 GB — a live claims-integrity bug folded into this phase (reconcile to `-1`). Because this is a claims-integrity milestone, the values are NOT gray areas — only the enforcement *behavior* is.

## E-sign cap reset window

| Option | Description | Selected |
|--------|-------------|----------|
| Calendar month (1st) (Recommended) | Resets 1st of month; simplest to compute + display; matches "per month" | ✓ |
| Billing-cycle anchored | Resets on Stripe renewal date; fairer but per-owner variable window | |
| Rolling 30 days | Trailing-30-day count; smoothest but hard to reason about | |

**User's choice:** Calendar month (1st).

## Resend metering

| Option | Description | Selected |
|--------|-------------|----------|
| No — only initial send counts (Recommended) | Resends are corrections/nudges, not new agreements | ✓ |
| Yes — every token issuance counts | Simpler RPC but punishes a bounced email | |

**User's choice:** No — meter the `send` action only; `resend` is exempt.

## Storage over-quota behavior (non-grandfathered)

| Option | Description | Selected |
|--------|-------------|----------|
| Hard-block + upgrade prompt (Recommended) | Upload refused at 100%; reads/downloads/deletes always allowed | ✓ |
| Warn but allow (truly soft) | Never blocks — but reopens the claims-integrity gap | |

**User's choice:** Hard-block + upgrade prompt.

## Grandfather scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full exemption (keep uploading) (Recommended) | Pre-launch over-quota owners never upload-blocked; enforcement only for post-launch crossers | ✓ |
| Data-only (block new uploads) | Protects existing data but walls off new uploads immediately | |

**User's choice:** Full exemption — truest to "nobody retroactively locked out."

## Claude's Discretion
- `esign_events` column shape + race-safe count-and-insert form; grandfather-flag storage shape; near-cap warning threshold (default 80%); owner-attributable bucket set (exclude system `blog-covers`); upload-enforcement mechanism (client pre-check + DB-level guard).

## Deferred Ideas
- Historical usage charts; explicit receipt-photo metering (already covered by the storage sum); HONEST-04 pricing-copy refresh.
