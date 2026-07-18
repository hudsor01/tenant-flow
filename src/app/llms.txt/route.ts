import { blogAnonClient } from "#lib/blog/blog-queries";
import { createLogger } from "#lib/frontend-logger";
import { categoryLabel } from "#lib/seo/blog-categories";

// Revalidate hourly — the published-post set changes at most a few times a
// day, and AI crawlers don't need minute-level freshness on a TOC file.
export const revalidate = 3600;

const SITE = "https://tenantflow.app";

// How many newest posts to list in the curated TOC. The full per-post
// catalogue lives in /llms-full.txt; this file stays a scannable index.
const NEWEST_POST_LIMIT = 15;

const logger = createLogger({ component: "LlmsTxt" });

/**
 * Static baseline for /llms.txt MINUS the blog section — that section is
 * appended dynamically (or, on DB error, replaced with a minimal honest
 * pointer that never claims the blog is empty). The prior static file
 * asserted "The blog will publish ... as articles ship" / "returns an empty
 * channel until the first post" while 60+ posts were live, suppressing the
 * whole content asset from AI crawlers.
 */
const STATIC_HEAD = `# TenantFlow

> Property management software for independent landlords. Track leases, maintenance requests, tenant records, and financial reporting in one place. Landlord-only — tenants don't log in, the product does not facilitate rent payments. 14-day free trial.

TenantFlow is a SaaS for independent landlords who want a single source of truth for their rental properties. The product centralizes lease documents (with built-in e-signing on Growth and Max tiers), maintenance request tracking, tenant records, and tax-ready financial reporting. Pricing tiers are Starter ($19/mo), Growth ($49/mo), and Max ($149/mo).

The site is operated by [Hudson Digital Solutions](https://hudsondigitalsolutions.com). The blog publishes practical landlord guides on screening, lease lifecycle, maintenance, taxes, and software comparisons.

## Product

- [Features overview](${SITE}/features): the property, unit, lease, tenant, maintenance, and document modules.
- [Pricing](${SITE}/pricing): plan caps, feature comparison, and a free 14-day trial across all tiers.
- [About](${SITE}/about): product mission and positioning.

## Comparisons

Side-by-side feature and pricing comparisons against the most-considered alternatives:

- [TenantFlow vs Buildium](${SITE}/compare/buildium)
- [TenantFlow vs AppFolio](${SITE}/compare/appfolio)
- [TenantFlow vs RentRedi](${SITE}/compare/rentredi)

## Resources

Free downloadable tools landlords can use without signing up:

- [Seasonal maintenance checklist](${SITE}/resources/seasonal-maintenance-checklist)
- [Landlord tax deduction tracker](${SITE}/resources/landlord-tax-deduction-tracker)
- [Security deposit reference card](${SITE}/resources/security-deposit-reference-card)`;

const STATIC_TAIL = `## Help

- [Help center](${SITE}/help)
- [FAQ](${SITE}/faq)
- [Contact](${SITE}/contact)

## Optional

- [Terms of Service](${SITE}/terms)
- [Privacy Policy](${SITE}/privacy)
- [Security Policy](${SITE}/security-policy)`;

interface CategoryRow {
	name: string;
	slug: string;
	post_count: number;
}

interface PostRow {
	title: string;
	slug: string;
}

/**
 * DB-driven blog section: the 5 category hub links plus the newest post
 * links. Returns the static-baseline pointer (NO "no articles" claim) on any
 * DB error so the file degrades honestly instead of suppressing the asset.
 */
async function buildBlogSection(): Promise<string> {
	try {
		const supabase = blogAnonClient();
		const [categoriesResult, postsResult] = await Promise.all([
			supabase.rpc("get_blog_categories"),
			supabase
				.from("blogs")
				.select("title, slug")
				.eq("status", "published")
				.order("published_at", { ascending: false })
				.limit(NEWEST_POST_LIMIT),
		]);

		if (categoriesResult.error) throw new Error(categoriesResult.error.message);
		if (postsResult.error) throw new Error(postsResult.error.message);

		const categories = (categoriesResult.data ?? []) as CategoryRow[];
		const posts = (postsResult.data ?? []) as PostRow[];

		const categoryLines = categories.map(
			(cat) =>
				`- [${categoryLabel(cat.slug)}](${SITE}/blog/category/${cat.slug}) (${cat.post_count} articles)`,
		);
		const postLines = posts.map(
			(post) => `- [${post.title}](${SITE}/blog/${post.slug})`,
		);

		const lines = [
			"## Blog",
			"",
			"Practical, long-form guides for landlord operations and property management software.",
			"",
			"- [Blog index](" + SITE + "/blog)",
			"- [RSS feed](" + SITE + "/feed.xml)",
		];

		if (categoryLines.length > 0) {
			lines.push("", "### Categories", "", ...categoryLines);
		}
		if (postLines.length > 0) {
			lines.push("", "### Latest articles", "", ...postLines);
		}

		return lines.join("\n");
	} catch (err) {
		logger.error("Failed to build dynamic blog section for /llms.txt", {
			action: "buildBlogSection",
			route: "/llms.txt",
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
		});
		// Fail-open: honest pointer with NO false "no articles" claim.
		return [
			"## Blog",
			"",
			"Practical, long-form guides for landlord operations and property management software.",
			"",
			`- [Blog index](${SITE}/blog)`,
			`- [RSS feed](${SITE}/feed.xml)`,
		].join("\n");
	}
}

export async function GET(): Promise<Response> {
	const blogSection = await buildBlogSection();
	const body = `${STATIC_HEAD}\n\n${blogSection}\n\n${STATIC_TAIL}\n`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
		},
	});
}
