import { blogAnonClient } from "#lib/blog/blog-queries";
import { createLogger } from "#lib/frontend-logger";
import { categoryLabel } from "#lib/seo/blog-categories";
import {
	LLMS_FULL_HEAD,
	LLMS_FULL_PREAMBLE,
	LLMS_FULL_TAIL,
} from "#lib/seo/llms-full-facts";

// Revalidate hourly — the published catalogue changes a few times a day at
// most. The full per-post digest is regenerated on each revalidation.
export const revalidate = 3600;

const SITE = "https://tenantflow.app";

// Cap on posts pulled for the digest. Comfortably above the current
// catalogue size; every published post fits in one digest below this bound.
const DIGEST_POST_LIMIT = 500;

const logger = createLogger({ component: "LlmsFullTxt" });

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
		const supabase = blogAnonClient();
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
	// The product sections live in #lib/seo/llms-full-facts, which the blog
	// factory's RAG index also reads; only the blog digest is built here.
	const body = `${LLMS_FULL_PREAMBLE}\n\n${LLMS_FULL_HEAD}\n\n${blogDigest}\n\n${LLMS_FULL_TAIL}\n`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
		},
	});
}
