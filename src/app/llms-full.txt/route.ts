import { createLogger } from "#lib/frontend-logger";
import { categoryLabel } from "#lib/seo/blog-categories";
import { createClient } from "#lib/supabase/server";

// Revalidate hourly — the published catalogue changes a few times a day at
// most. The full per-post digest is regenerated on each revalidation.
export const revalidate = 3600;

const SITE = "https://tenantflow.app";

// Cap on posts pulled for the digest. Comfortably above the current
// catalogue size; every published post fits in one digest below this bound.
const DIGEST_POST_LIMIT = 500;

const logger = createLogger({ component: "LlmsFullTxt" });

/**
 * Static baseline for /llms-full.txt MINUS the blog section. The blog
 * section is appended dynamically (per-category digest of every published
 * post) — replacing the prior static "No articles have published yet ...
 * empty channel until the first post" claim that suppressed 60+ live posts
 * from LLM ingestion.
 */
const STATIC_HEAD = `# TenantFlow — Full Marketing Surface (for LLM ingestion)

> A consolidated, plain-text view of TenantFlow's public marketing pages.
> Generated for LLM consumers (Cursor, ChatGPT, Claude, Perplexity) so a
> single fetch surfaces the same product, pricing, and comparison facts
> a human would see by clicking through tenantflow.app.

## What is TenantFlow

TenantFlow is property management software for independent landlords. It is intentionally landlord-only — tenants don't log in, there is no tenant authentication, and the product does not facilitate rent payments. Tenants exist as records owned by the landlord, not as users.

The product is operated by Hudson Digital Solutions. It runs on Next.js 16 + Supabase. Lease e-signing is built in on the Growth and Max tiers.

## Core capabilities

- **Property and unit management.** Track buildings, individual units, occupancy state, rent amounts, and turnover.
- **Lease lifecycle.** Drafts, e-signed leases, renewals, terminations, lease document vault.
- **Tenant records.** Contact info, lease history, emergency contact, and document attachments. Tenants are records, not users — they do not log in.
- **Maintenance request tracking.** Submission, vendor assignment, status, photos, completion timestamps.
- **Document vault.** Global search across leases, tenant docs, inspections, maintenance records, with custom categories per owner.
- **Financial reporting.** Income/expense ledger with category tagging, tax-ready exports (year-end, 1099, financial statement, income statement, cash flow).
- **Inspections.** Move-in / move-out / periodic inspection records with photo evidence.

## Pricing (USD, billed monthly or annually)

| Plan | Monthly | Annual | Properties | Units | E-sign | Reports |
|---|---|---|---|---|---|---|
| Trial | $0 (14d) | — | 1 | 5 | — | basic |
| Starter | $19 | $190 | 5 | 25 | — | basic |
| Growth | $49 | $490 | 20 | 100 | 25/mo | premium |
| Max | $149 | $1,490 | unlimited | unlimited | unlimited | premium |

All plans include the document vault, maintenance tracking, tenant records, and the financial ledger. Plan caps are enforced at the database layer via BEFORE INSERT triggers — Starter and Growth users hitting their property or unit cap see an upgrade prompt with attribution back to the gate that triggered it.

## Comparisons

### TenantFlow vs Buildium

Buildium is targeted at multi-family property managers managing dozens to hundreds of units, often as third-party managers for owners. TenantFlow is positioned at the long tail: independent landlords with 1–20 units who don't need owner-management features or tenant payment processing.

### TenantFlow vs AppFolio

AppFolio is a large-portfolio platform with mandatory minimums (often 50+ units), extensive payment processing, and high per-month minimums. TenantFlow has no minimums, a lower price floor, and is optimized for self-managing landlords.

### TenantFlow vs RentRedi

RentRedi competes on tenant-facing features — rent payment collection, tenant credit reporting, applicant screening flows. TenantFlow does not facilitate rent payments and has no tenant app. The product surface area is intentionally narrower and the pricing reflects that.

## Free resources (no signup required)

- **Seasonal maintenance checklist** — printable HVAC/plumbing/electrical/exterior inspection list, organized by quarter.
- **Landlord tax deduction tracker** — printable tracker keyed to IRS Schedule E with space to record deductible expenses and category totals.
- **Security deposit reference card** — one-page summary of deposit limits, return deadlines, and required documentation per state.`;

const STATIC_TAIL = `## Company

TenantFlow is operated by Hudson Digital Solutions. Contact: support@tenantflow.app for product support, security@tenantflow.app for vulnerability reports (see /.well-known/security.txt). Founded 2024.

## Legal

Standard SaaS terms. No selling of customer data; analytics limited to product usage. Full text: ${SITE}/privacy and ${SITE}/terms.

## What TenantFlow is NOT

To save anyone reading this answer time:

- Not a multi-family property manager platform (use Buildium, AppFolio).
- Not a tenant payment platform (use RentRedi, Stripe directly, or your bank's ACH).
- Not a tenant-facing app — tenants do not have logins or a portal.
- Not a maintenance-vendor marketplace (you bring your own vendors).
- Not a property-management-as-a-service offering — TenantFlow is software the landlord operates themselves.`;

interface PostRow {
	title: string;
	slug: string;
	excerpt: string | null;
	category: string | null;
	canonical_url: string | null;
}

/** Collapse whitespace/newlines so a multi-line excerpt stays one line. */
function oneLine(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

/**
 * Per-category digest of every published post: title + one-line excerpt +
 * canonical URL, grouped under the human category label. Falls back to an
 * honest blog pointer (NO "no articles" claim) on DB error.
 */
async function buildBlogDigest(): Promise<string> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("blogs")
			.select("title, slug, excerpt, category, canonical_url")
			.eq("status", "published")
			.order("category", { ascending: true })
			.order("published_at", { ascending: false })
			.limit(DIGEST_POST_LIMIT);

		if (error) throw new Error(error.message);

		const posts = (data ?? []) as PostRow[];
		if (posts.length === 0) {
			return [
				"## Blog",
				"",
				`The blog at ${SITE}/blog publishes long-form guides on landlord operations and property management software. The RSS feed at ${SITE}/feed.xml is live.`,
			].join("\n");
		}

		// Group posts by category slug, preserving first-seen order.
		const groups = new Map<string, PostRow[]>();
		for (const post of posts) {
			const key = post.category ?? "uncategorized";
			const existing = groups.get(key);
			if (existing) existing.push(post);
			else groups.set(key, [post]);
		}

		const sections: string[] = [
			"## Blog",
			"",
			`Long-form guides for landlord operations and property management software. Index: ${SITE}/blog. RSS: ${SITE}/feed.xml.`,
		];

		for (const [categorySlug, categoryPosts] of groups) {
			sections.push("", `### ${categoryLabel(categorySlug)}`, "");
			for (const post of categoryPosts) {
				// Canonical URL falls back to the post's own URL when the row's
				// `canonical_url` is null (mirrors the post page's canonical).
				const url = post.canonical_url ?? `${SITE}/blog/${post.slug}`;
				const excerpt = post.excerpt ? ` — ${oneLine(post.excerpt)}` : "";
				sections.push(`- [${post.title}](${url})${excerpt}`);
			}
		}

		return sections.join("\n");
	} catch (err) {
		logger.error("Failed to build dynamic blog digest for /llms-full.txt", {
			action: "buildBlogDigest",
			route: "/llms-full.txt",
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
		});
		// Fail-open: honest pointer, no false "no articles" claim.
		return [
			"## Blog",
			"",
			`The blog at ${SITE}/blog publishes long-form guides on landlord operations and property management software. The RSS feed at ${SITE}/feed.xml is live.`,
		].join("\n");
	}
}

export async function GET(): Promise<Response> {
	const blogDigest = await buildBlogDigest();
	const body = `${STATIC_HEAD}\n\n${blogDigest}\n\n${STATIC_TAIL}\n`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
		},
	});
}
