/**
 * The product sections of /llms-full.txt: what TenantFlow is, does, costs and
 * is not (LLMS_FULL_HEAD and LLMS_FULL_TAIL; LLMS_FULL_PREAMBLE is the page's
 * title). One source for two readers:
 *   - src/app/llms-full.txt/route.ts serves them around a per-post blog digest;
 *   - scripts/rag-index-blog-corpus.ts embeds them as the blog factory's
 *     grounding facts (blog_rag_chunks), without the digest, so an older
 *     post's wording never comes back as a "fact".
 * Keep every sentence true of the shipped product; the factory may repeat any
 * of it in a published post.
 */

const SITE = "https://tenantflow.app";

/** The page's title and intro; served by the route, not embedded as a fact. */
export const LLMS_FULL_PREAMBLE = `# TenantFlow — Full Marketing Surface (for LLM ingestion)

> A consolidated, plain-text view of TenantFlow's public marketing pages.
> Generated for LLM consumers (Cursor, ChatGPT, Claude, Perplexity) so a
> single fetch surfaces the same product, pricing, and comparison facts
> a human would see by clicking through tenantflow.app.`;

export const LLMS_FULL_HEAD = `## What is TenantFlow

TenantFlow is property management software for independent landlords. It is intentionally landlord-only — tenants don't log in, there is no tenant authentication, and the product does not facilitate rent payments. Tenants exist as records owned by the landlord, not as users.

The product is operated by Hudson Digital Solutions. It runs on Next.js 16 + Supabase. Lease e-signing is built in on the Growth and Max tiers.

## Core capabilities

- **Property and unit management.** Track buildings, individual units, occupancy, and rent amounts.
- **Leases.** Create a lease in a guided form (property, unit, tenant, rent, deposit, dates, and payment terms), then renew, end, or terminate it. A separate lease template builder assembles built-in clauses into a downloadable PDF; that PDF cannot be sent for e-signature.
- **Lease e-signing (Growth and Max).** The landlord sends a lease for signature; the tenant signs from an emailed link, with no account, and the landlord signs in the app. Both sign a TenantFlow-generated lease agreement listing the property and unit, the start and end dates, the monthly rent, the security deposit, the governing state, the landlord's notice address and immediate family members (when entered), and the two parties. It does not include the payment day, late-fee, grace-period, pet, utility, or property-rule terms, the template builder's clauses, or an uploaded file. When both have signed, the executed PDF, with a signature audit certificate, is filed automatically on the lease, listed in the document vault, and emailed to the tenant. Growth includes 25 signature requests a month; Max is unlimited.
- **Tenant records.** Contact details, an emergency contact, the leases linked to the tenant, a move-out date and reason, and uploaded documents. Tenants are records, not users. A tenant record holds no notes, communication log, or payment history.
- **Rental applications.** A shareable application link for each unit; applicants apply without an account. The landlord sets each application's status, keeps private notes on it, and can convert it into a tenant record. TenantFlow runs no credit, background, or eviction checks.
- **Maintenance tracking.** The landlord logs each request (tenants cannot submit requests), sets its priority and a scheduled date, assigns a vendor, attaches photos and documents, logs repair costs, downloads a work-order PDF, and marks it complete.
- **Inspections.** Move-in and move-out inspection records, room by room, with photo evidence.
- **Document vault.** Files (PDFs and images, up to 10 MB each) added in the Documents section of a property, lease, tenant, maintenance request, or inspection, plus every e-signed lease, in one list: searchable by title (an upload's file name; e-signed leases are titled for their property, unit and tenant), filterable by the kind of record a file belongs to, by category, and by upload date, and downloadable as a ZIP of up to 500 files. Maintenance and inspection photos stay on their request or inspection. Owners define their own categories. There are no folders, tags, version history, or sharing links.
- **Rent ledger.** Each lease has a ledger. Once the landlord starts tracking a lease, a rent charge posts each month; the landlord adds other charges and logs each payment they receive. Entries are corrected by reversal, never edited.
- **Financial reporting.** An income statement, cash flow statement, balance sheet, and year-end report built from the rent ledger and the repair costs logged on maintenance requests, with expenses by vendor and property. CSV exports of these reports on every plan; on Growth and Max, PDF year-end and tax-document exports and the financial analytics export.
- **Renewal reminders (Growth and Max).** Email reminders to the landlord before a lease ends.

## Pricing (USD, billed monthly or annually)

| Plan | Monthly | Annual | Properties | Units | E-sign | Reports |
|---|---|---|---|---|---|---|
| Trial | $0 (14d) | — | 1 | 5 | — | basic |
| Starter | $19 | $190 | 5 | 25 | — | basic |
| Growth | $49 | $490 | 20 | 100 | 25/mo | premium |
| Max | $149 | $1,490 | unlimited | unlimited | unlimited | premium |

The Trial row is a new account's 14-day free trial before it picks a plan. Picking a plan at checkout with more than two days of the trial left continues the remaining trial days at that plan's limits; checkout takes a card and bills the plan when the trial ends. With two days or fewer left, checkout takes a card and billing starts at once. All plans include the document vault, maintenance tracking, tenant records, and the financial ledger. Property and unit caps are enforced in the database (BEFORE INSERT triggers); an account at its cap (Trial, Starter, or Growth) sees an upgrade prompt when it adds one more.

## Comparisons

### TenantFlow vs Buildium

Buildium is targeted at multi-family property managers managing dozens to hundreds of units, often as third-party managers for owners. TenantFlow is positioned at the long tail: independent landlords who manage their own rentals and don't need owner-management features or tenant payment processing. Plans run from Starter (up to 5 properties and 25 units) to Max (unlimited).

### TenantFlow vs AppFolio

AppFolio is a large-portfolio platform with mandatory minimums (often 50+ units), extensive payment processing, and high per-month minimums. TenantFlow has no minimums, a lower price floor, and is optimized for self-managing landlords.

### TenantFlow vs RentRedi

RentRedi competes on tenant-facing features — rent payment collection, tenant credit reporting, applicant screening flows. TenantFlow does not facilitate rent payments and has no tenant app; its product surface is intentionally narrower.

## Free resources (no signup required)

- **Seasonal maintenance checklist** — printable season-by-season list (spring, summer, fall, winter) of HVAC, plumbing, exterior, safety, and landscaping tasks.
- **Landlord tax deduction tracker** — printable tracker keyed to IRS Schedule E with space to record deductible expenses and category totals.
- **Security deposit reference card** — printable state-by-state table (all 50 states plus DC) of deposit limits, return deadlines, and whether an itemized statement or interest is required.`;

export const LLMS_FULL_TAIL = `## Company

TenantFlow is operated by Hudson Digital Solutions. Contact: support@tenantflow.app for product support, security@tenantflow.app for vulnerability reports (see /.well-known/security.txt). Founded 2024.

## Legal

Standard SaaS terms. No selling of customer data; analytics limited to product usage. Full text: ${SITE}/privacy and ${SITE}/terms.

## What TenantFlow is NOT

To save anyone reading this answer time:

- Not a platform for third-party property management companies (use Buildium, AppFolio).
- Not a tenant payment platform (use RentRedi, Stripe directly, or your bank's ACH).
- Not a tenant-facing app — tenants do not have logins or a portal and cannot submit maintenance requests.
- Not a messaging tool — apart from the lease-signing emails (the signing link, its reminder, and the executed copy), TenantFlow does not message, text, or notify tenants, and it keeps no communication log. Notices such as a rent-increase notice are PDFs the landlord delivers.
- Not a screening service — no credit, background, or eviction checks.
- Not an accounting system — no bank connections or expense categories.
- Not a maintenance-vendor marketplace (you bring your own vendors).
- Not a property-management-as-a-service offering — TenantFlow is software the landlord operates themselves.`;
