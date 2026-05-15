import { NextResponse } from "next/server";
import { env } from "#env";
import { createLogger } from "#lib/frontend-logger";
import { createClient } from "#lib/supabase/server";

// Cache the feed for 24h via ISR — RSS readers commonly poll hourly,
// and the underlying `blogs` table doesn't change minute-to-minute.
export const revalidate = 86400;

// Cap on items shipped per feed fetch. RSS clients don't paginate
// feeds, so older posts simply won't appear in the channel once the
// blog grows past this count. 50 is the conventional ceiling — Feedly,
// NetNewsWire, and similar readers expect to see "recent" posts, not
// the full archive (which is what /sitemap.xml is for).
const FEED_ITEM_LIMIT = 50;

const logger = createLogger({ component: "RssFeed" });

/**
 * Entity-escape a string for inclusion in XML element/attribute values.
 * RSS 2.0 element bodies use CDATA for HTML, so use `cdataEscape` for
 * those; this helper is for raw element values like `<link>` URLs.
 */
function xmlEscape(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Escape any literal `]]>` inside content destined for a CDATA section.
 * The canonical RSS escape splits the section: end the current CDATA
 * with `]]>`, then re-open with `<![CDATA[` after the literal `>`. Even
 * though a typical blog excerpt won't contain `]]>`, the input is a
 * database row that an admin or migration could populate with anything,
 * and an unescaped `]]>` terminates the CDATA early and lets arbitrary
 * XML follow.
 */
function cdataEscape(value: string): string {
	return value.replace(/]]>/g, "]]]]><![CDATA[>");
}

function rfc822(date: string | null | undefined): string {
	const d = date ? new Date(date) : new Date();
	if (Number.isNaN(d.getTime())) return new Date().toUTCString();
	return d.toUTCString();
}

export async function GET(): Promise<Response> {
	const baseUrl = env.NEXT_PUBLIC_APP_URL || "https://tenantflow.app";
	const feedUrl = `${baseUrl}/feed.xml`;

	let posts: Array<{
		slug: string;
		title: string;
		excerpt: string | null;
		published_at: string | null;
		updated_at: string | null;
		category: string | null;
	}> = [];

	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("blogs")
			.select("slug, title, excerpt, published_at, updated_at, category")
			.eq("status", "published")
			.order("published_at", { ascending: false })
			.limit(FEED_ITEM_LIMIT);

		if (error) {
			throw new Error(error.message);
		}
		posts = data ?? [];
	} catch (err) {
		logger.error("Failed to fetch blog posts for RSS feed", {
			action: "generateRssFeed",
			route: "/feed.xml",
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
		});
		// Fall through with empty `posts` — return a valid empty feed
		// rather than 500-ing on every reader poll.
	}

	const lastBuildDate = rfc822(posts[0]?.updated_at ?? posts[0]?.published_at);

	const items = posts
		.map((post) => {
			const url = `${baseUrl}/blog/${post.slug}`;
			const description = post.excerpt ?? "";
			return [
				"    <item>",
				`      <title>${xmlEscape(post.title)}</title>`,
				`      <link>${xmlEscape(url)}</link>`,
				`      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
				`      <pubDate>${rfc822(post.published_at)}</pubDate>`,
				post.category
					? `      <category>${xmlEscape(post.category)}</category>`
					: "",
				`      <description><![CDATA[${cdataEscape(description)}]]></description>`,
				"    </item>",
			]
				.filter(Boolean)
				.join("\n");
		})
		.join("\n");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TenantFlow Blog</title>
    <link>${xmlEscape(`${baseUrl}/blog`)}</link>
    <description>Property management for landlords — leases, maintenance, tenants, and the financial side.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

	return new NextResponse(xml, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
		},
	});
}
