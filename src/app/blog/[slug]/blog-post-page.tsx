"use client";

import { ArrowRight, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { COMPETITORS } from "#app/compare/[competitor]/compare-data";
import { BlogCard } from "#components/blog/blog-card";
import { BlogInlineCta } from "#components/blog/blog-inline-cta";
import { BlogPostBreadcrumb } from "#components/blog/blog-post-breadcrumb";
import { LeadMagnetCta } from "#components/blog/lead-magnet-cta";
import { NewsletterSignup } from "#components/blog/newsletter-signup";
import { PageLayout } from "#components/layout/page-layout";
import { Button } from "#components/ui/button";
import { useRelatedPosts } from "#hooks/api/use-blogs";
import { BLOG_TO_COMPETITOR, BLOG_TO_RESOURCE } from "#lib/content-links";
import { categoryLabel } from "#lib/seo/blog-categories";
import { cn } from "#lib/utils";
import MarkdownContent, { headingId } from "./markdown-content";

/**
 * Subset of `BlogDetail` actually rendered by this page. Defining the prop
 * shape locally lets the server pass the post directly without forcing the
 * caller to materialize every column on `blogs`.
 */
export type BlogPostProps = {
	post: {
		readonly title: string;
		readonly excerpt: string | null;
		readonly content: string;
		readonly featured_image: string | null;
		readonly reading_time: number | null;
		readonly published_at: string | null;
		readonly category: string | null;
	};
	slug: string;
};

/**
 * Split markdown content at a `## ` heading near ~40% of the total length.
 * Returns [firstHalf, secondHalf]. If no good split point, secondHalf is empty.
 */
const LEAD_MAGNETS: Record<
	string,
	{
		title: string;
		description: string;
		resourceType: "checklist" | "guide" | "spreadsheet";
		downloadUrl: string;
	}
> = {
	"twelve-month-preventive-maintenance-calendar-rentals": {
		title: "Download the Complete Maintenance Checklist",
		description:
			"Get a printable season-by-season maintenance checklist covering HVAC, plumbing, electrical, and exterior inspections for your rental properties.",
		resourceType: "checklist",
		downloadUrl: "/resources/seasonal-maintenance-checklist",
	},
	"mortgage-interest-deduction-rental-property-schedule-e": {
		title: "Free Tax Deduction Tracker Spreadsheet",
		description:
			"Track every deductible expense throughout the year with this ready-to-use spreadsheet. Categorized by IRS schedule with auto-calculated totals.",
		resourceType: "spreadsheet",
		downloadUrl: "/resources/landlord-tax-deduction-tracker",
	},
	"security-deposit-deadlines-and-caps-all-50-states": {
		title: "Security Deposit Quick Reference Card",
		description:
			"A one-page reference with deposit limits, return deadlines, and required documentation for all 50 states. Print it and keep it at your desk.",
		resourceType: "guide",
		downloadUrl: "/resources/security-deposit-reference-card",
	},
};

/** Extract `## ` section headings for the "On this page" nav — ids built with
 *  the SAME headingId() the renderer uses, so anchors can never drift. */
function extractToc(content: string): { id: string; text: string }[] {
	const matches = content.match(/^## .+$/gm) ?? [];
	return matches.map((line) => {
		const text = line.replace(/^## /, "").trim();
		return { id: headingId(text), text };
	});
}

function splitContentForCta(content: string): [string, string] {
	const lines = content.split("\n");
	const totalLength = content.length;
	const targetSplit = totalLength * 0.4;

	let currentLength = 0;

	for (const [i, line] of lines.entries()) {
		currentLength += line.length + 1;
		if (currentLength >= targetSplit && line.startsWith("## ")) {
			return [lines.slice(0, i).join("\n"), lines.slice(i).join("\n")];
		}
	}

	return [content, ""];
}

export default function BlogPostPage({ post, slug }: BlogPostProps) {
	// Hero LCP: the image must be VISIBLE in the no-JS / pre-hydration render
	// (social scrapers, non-JS crawlers, and the LCP measurement all see the
	// server HTML). `jsReady` is false during SSR + first paint, so the image
	// renders fully visible. Once the client effect runs we enable the
	// blur-up polish: if the bytes haven't decoded yet (`!imageLoaded`) the
	// blurred placeholder shows and the `onLoad` transition resolves it. If
	// they're already loaded (cached), nothing visually changes.
	const [imageLoaded, setImageLoaded] = useState(false);
	const [jsReady, setJsReady] = useState(false);
	useEffect(() => {
		setJsReady(true);
	}, []);

	const heroBlurUp = jsReady && !imageLoaded;

	// Related-posts is the only remaining client fetch. `useBlogCategories`
	// was dropped — its only consumer was a category-name → slug lookup
	// that's deterministic from the visible category string. The server
	// already passes `post.category`, so a network round-trip just to
	// confirm `lower-and-dasherize` was wasted.
	const { data: relatedPosts } = useRelatedPosts(post.category ?? "", slug, 3);

	const markdownContent = post.content.trim();
	const [firstHalf, secondHalf] = splitContentForCta(markdownContent);
	const leadMagnet = LEAD_MAGNETS[slug];
	const competitorSlug = BLOG_TO_COMPETITOR[slug];
	const resourceSlug = BLOG_TO_RESOURCE[slug];

	// `post.category` is the raw `blogs.category` value — the kebab SLUG.
	// Use it verbatim as the category-page slug (the lower-and-dasherize is a
	// harmless no-op on an already-kebab value) and humanize it for the
	// visible chip label so it reads "Software Vault", not "software-vault".
	const postCategory = post.category ?? "";
	const categorySlug = postCategory.toLowerCase().replace(/\s+/g, "-");
	const categoryDisplayLabel = postCategory ? categoryLabel(categorySlug) : "";

	const toc = extractToc(markdownContent);

	return (
		<PageLayout>
			<BlogPostBreadcrumb title={post.title} category={post.category} />

			{/* Article — outer column 4xl; text content reads at 3xl (~75ch)
			    while the hero spans the full 4xl for editorial contrast. */}
			<article className="container mx-auto px-6 pb-16 max-w-4xl">
				{/* Header BEFORE the hero: the generated cover already carries the
				    title, so leading with it stacked two titles back-to-back. */}
				<header className="mx-auto max-w-3xl pt-10 mb-10">
					<div className="flex flex-wrap items-center gap-3 mb-6">
						{postCategory && (
							<Link
								href={`/blog/category/${categorySlug}`}
								className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-text transition-colors hover:bg-primary/15"
							>
								{categoryDisplayLabel}
							</Link>
						)}
						<span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							<Clock className="size-3.5" aria-hidden="true" />
							{post.reading_time} min read
						</span>
					</div>

					<h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
						{post.title}
					</h1>

					<p className="text-lg lg:text-xl text-muted-foreground leading-relaxed mb-8">
						{post.excerpt}
					</p>

					<div className="flex items-center gap-3">
						<span
							aria-hidden="true"
							className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
						>
							TF
						</span>
						<div>
							<div className="text-sm font-semibold text-foreground">
								TenantFlow Team
							</div>
							<div className="text-xs text-muted-foreground">
								{post.published_at
									? new Date(post.published_at).toLocaleDateString("en-US", {
											month: "long",
											day: "numeric",
											year: "numeric",
										})
									: ""}
							</div>
						</div>
					</div>
				</header>

				{/* Featured image — curated when present, otherwise the generated
				    per-post cover (/api/og/blog/[slug]; category palette +
				    slug-hashed composition) so every post has unique on-brand art. */}
				<div className="relative aspect-video overflow-hidden rounded-xl border border-border mb-12">
					<Image
						src={post.featured_image ?? `/api/og/blog/${slug}?v=4`}
						alt={post.title}
						fill
						sizes="(max-width: 768px) 100vw, 896px"
						priority
						className={cn(
							"object-cover transition-all duration-700 ease-out",
							heroBlurUp
								? "blur-sm opacity-0 scale-105"
								: "blur-0 opacity-100 scale-100",
						)}
						onLoad={() => setImageLoaded(true)}
					/>
				</div>

				<div className="mx-auto max-w-3xl">
					{/* On this page — anchored to the ids MarkdownContent renders */}
					{toc.length >= 3 && (
						<nav
							aria-label="Table of contents"
							className="mb-10 rounded-xl border border-border bg-muted/40 p-5"
						>
							<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								On this page
							</p>
							<ol className="space-y-2">
								{toc.map((item) => (
									<li key={item.id}>
										<a
											href={`#${item.id}`}
											className="text-sm text-muted-foreground transition-colors hover:text-primary-text"
										>
											{item.text}
										</a>
									</li>
								))}
							</ol>
						</nav>
					)}

					{/* Article Content with inline CTA */}
					<div className="prose prose-lg dark:prose-invert max-w-none prose-blockquote:border-primary prose-headings:tracking-tight prose-a:text-primary-text">
						<MarkdownContent content={firstHalf} />
						{secondHalf &&
							(leadMagnet ? (
								<LeadMagnetCta
									title={leadMagnet.title}
									description={leadMagnet.description}
									resourceType={leadMagnet.resourceType}
									downloadUrl={leadMagnet.downloadUrl}
								/>
							) : (
								<BlogInlineCta />
							))}
						{secondHalf && <MarkdownContent content={secondHalf} />}
					</div>
				</div>

				{competitorSlug && (
					<div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-xl text-center">
						<p className="text-muted-foreground mb-3">
							Compare TenantFlow vs {COMPETITORS[competitorSlug]?.name}{" "}
							side-by-side
						</p>
						<Link
							href={`/compare/${competitorSlug}`}
							className="inline-flex items-center text-primary-text font-semibold hover:text-primary/80 transition-colors"
						>
							See Full Comparison
							<ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
						</Link>
					</div>
				)}

				{resourceSlug && (
					<div className="mt-8 p-6 bg-muted border border-border rounded-xl text-center">
						<p className="text-muted-foreground mb-3">
							Download our free related resource
						</p>
						<Link
							href={`/resources/${resourceSlug}`}
							className="inline-flex items-center text-primary-text font-semibold hover:text-primary/80 transition-colors"
						>
							View Resource
							<ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
						</Link>
					</div>
				)}

				{/* Bottom CTA Section */}
				<div className="mt-16 p-8 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl text-center">
					{/* Styled as a heading but rendered as <p>: this bottom CTA repeats
					    on every post, so an <h3> here pollutes the heading outline
					    with non-content marketing copy. */}
					<p className="typography-h3 text-foreground mb-4">
						Ready to transform your property management?
					</p>
					<p className="text-muted-foreground mb-6">
						Centralize your portfolio with the document vault, lease e-sign, and
						tax-ready reports.
					</p>
					<Button size="lg" className="px-8" asChild>
						<Link href="/pricing">
							Start free — no card
							<ArrowRight className="size-5 ml-2" />
						</Link>
					</Button>
				</div>

				{/* Newsletter Signup */}
				<div className="mt-12">
					<NewsletterSignup />
				</div>

				{/* Related Articles */}
				{relatedPosts && relatedPosts.length > 0 && (
					<section className="mt-16">
						<h2 className="text-2xl font-bold mb-6">Related Articles</h2>
						<div className="grid md:grid-cols-3 gap-6">
							{relatedPosts.map((rp) => (
								<BlogCard key={rp.id} post={rp} />
							))}
						</div>
					</section>
				)}
			</article>
		</PageLayout>
	);
}
