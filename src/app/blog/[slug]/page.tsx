import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogPostBreadcrumb } from "#components/blog/blog-post-breadcrumb";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { env } from "#env";
import { createLogger } from "#lib/frontend-logger";
import { createArticleJsonLd } from "#lib/seo/article-schema";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createClient as createServerClient } from "#lib/supabase/server";
import BlogPostPage from "./blog-post-page";

// ISR with on-demand fallback. `generateStaticParams` enumerates known
// published slugs at build time so they prerender. `dynamicParams = true`
// lets slugs published AFTER the last build still render — n8n's 2-hour
// content cron produces posts faster than the Vercel deploy cadence, so
// `dynamicParams = false` (the original Phase-6 BLOG-02 setting) caused
// real 404s on every fresh post until the next manual redeploy. The
// soft-200 risk that motivated `false` is handled instead by the
// in-component `notFound()` call below: `getBlogPost(slug)` filters
// `status='published'` (line ~83) and returns null for any unknown or
// unpublished slug, at which point the page calls `notFound()` and Next
// returns a real HTTP 404. Known slugs serve from the 5-minute revalidate
// cache; unknown slugs render once on first request then cache.
export const dynamicParams = true;
export const revalidate = 300;

const logger = createLogger({ component: "BlogPost" });

interface Props {
	params: Promise<{ slug: string }>;
}

/**
 * Build-time slug enumeration. Returns ONLY published rows so a leaked
 * unpublished slug cannot mint a static page. ISR misses for unknown
 * slugs hit `notFound()` in the page component below.
 *
 * Uses a cookie-less anon-key client (not the `#lib/supabase/server`
 * cookie-aware client) because `generateStaticParams` runs at build time
 * without an HTTP request context — `cookies()` from `next/headers`
 * would throw "used `cookies()` inside `generateStaticParams`". Anon-key
 * still respects RLS (`status='published'` is also the policy gate for
 * public reads), so build-time enumeration matches request-time visibility.
 */
export async function generateStaticParams() {
	const supabase = createSupabaseClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	);
	const { data, error } = await supabase
		.from("blogs")
		.select("slug")
		.eq("status", "published");

	if (error) {
		logger.error("generateStaticParams failed", {
			action: "generateStaticParams",
			route: "/blog/[slug]",
			metadata: { error: error.message, code: error.code },
		});
		return [];
	}

	return (data ?? []).map(({ slug }) => ({ slug }));
}

/** Deduplicated blog post query — shared by generateMetadata and Page */
const getBlogPost = cache(async (slug: string) => {
	const supabase = await createServerClient();

	// Race against 5s timeout to prevent Supabase cold-start hangs
	// (80-398s observed in Sentry).
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error("Blog post query timed out")),
			5000,
		);
	});
	const query = supabase
		.from("blogs")
		.select(
			"title, slug, published_at, updated_at, featured_image, content, reading_time, category, meta_description, excerpt, tags, canonical_url",
		)
		.eq("slug", slug)
		.eq("status", "published")
		.single();

	try {
		const { data, error } = await Promise.race([query, timeout]);
		if (error) {
			// PGRST116 = "Results contain 0 rows" from .single() — genuine miss.
			// Any other code is a real DB problem; throw so Next.js error boundary
			// surfaces a 500 instead of a misleading 404.
			if (error.code === "PGRST116") return null;
			logger.error("Blog post query failed", {
				action: "getBlogPost",
				route: `/blog/${slug}`,
				metadata: { error: error.message, code: error.code },
			});
			throw new Error("Blog post query failed");
		}
		return data;
	} catch (err) {
		// Re-log timeout errors with context before bubbling to error boundary.
		if (err instanceof Error && err.message === "Blog post query timed out") {
			logger.error("Blog post query timed out", {
				action: "getBlogPost",
				route: `/blog/${slug}`,
				metadata: {},
			});
		}
		throw err;
	} finally {
		if (timer) clearTimeout(timer);
	}
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const post = await getBlogPost(slug);

	if (!post) {
		notFound();
	}

	const description = post.meta_description || post.excerpt;
	const ogImageUrl = `/api/og/blog/${slug}`;

	// Blocker-#1 fix: `post.canonical_url` (Plan 06-01 column) lands here in
	// the framework-emitted `<head>` via `Metadata.alternates.canonical`.
	// When non-null the post points elsewhere (e.g. brief #10 →
	// `/compare/buildium`); when null, fall back to the post's own URL so
	// every published post always has a canonical reference.
	const canonical = post.canonical_url ?? `/blog/${slug}`;

	return {
		// `title.absolute` opts out of the parent layout's `'%s | TenantFlow'`
		// template — without this, the rendered <title> would be
		// "Post Title | TenantFlow Blog | TenantFlow" (template stacking).
		title: { absolute: `${post.title} | TenantFlow Blog` },
		description,
		openGraph: {
			title: post.title,
			description,
			type: "article",
			publishedTime: post.published_at ?? undefined,
			modifiedTime: post.updated_at ?? post.published_at ?? undefined,
			section: post.category ?? undefined,
			// Per-post OG image generated by `/api/og/blog/[slug]/route.tsx`.
			// Always 1200×630 (the @vercel/og ImageResponse dimensions are
			// fixed by the route). The post's own `featured_image`, when
			// present, is rendered inside the article body but is NOT
			// shadowed here — a single canonical og:image per page is
			// required for LinkedIn / Slack / Discord cards.
			images: [
				{
					url: ogImageUrl,
					width: 1200,
					height: 630,
					alt: post.title,
				},
			],
			siteName: "TenantFlow",
		},
		twitter: {
			card: "summary_large_image",
			site: "@tenantflow",
			creator: "@tenantflow",
			title: post.title,
			description,
			images: [ogImageUrl],
		},
		alternates: {
			canonical,
		},
	};
}

export default async function Page({ params }: Props) {
	const { slug } = await params;
	const post = await getBlogPost(slug);
	if (!post) notFound();

	const wordCount = post?.content
		? post.content.trim().split(/\s+/).length
		: undefined;

	const categorySlug = post?.category
		? post.category.toLowerCase().replace(/\s+/g, "-")
		: "";

	const breadcrumbSchema = post
		? createBreadcrumbJsonLd(`/blog/category/${categorySlug}/${slug}`, {
				[categorySlug]: post.category ?? categorySlug,
				[slug]: post.title ?? slug,
			})
		: null;

	// Article schema only emits when we have a real published_at — Google's
	// Article rich-result eligibility requires datePublished, and faking
	// `new Date().toISOString()` produces a misleading freshness signal that
	// will not match what crawlers see on subsequent visits.
	const articleSchema =
		post && post.published_at
			? createArticleJsonLd({
					title: post.title,
					slug: post.slug,
					datePublished: post.published_at,
					dateModified: post.updated_at ?? post.published_at,
					// Author byline on the rendered page reads "TenantFlow Team", and
					// individual posts are not reliably attributed to a single human.
					// Schema author follows the visible byline so the entity matches —
					// `authorType: 'Organization'` because a team/brand isn't a
					// schema.org `Person`.
					authorName: "TenantFlow Team",
					authorType: "Organization",
					image: post.featured_image ?? undefined,
					wordCount,
					keywords: Array.isArray(post.tags)
						? post.tags.filter((t): t is string => typeof t === "string")
						: undefined,
					description: post.meta_description ?? post.excerpt ?? undefined,
					timeRequired: post.reading_time
						? `PT${post.reading_time}M`
						: undefined,
				})
			: null;

	return (
		<>
			{breadcrumbSchema && <JsonLdScript schema={breadcrumbSchema} />}
			{articleSchema && <JsonLdScript schema={articleSchema} />}
			<BlogPostBreadcrumb title={post.title} category={post.category} />
			<BlogPostPage post={post} slug={slug} />
		</>
	);
}
