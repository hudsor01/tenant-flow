"use client";

import { ArrowLeft, ArrowRight, Clock, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { COMPETITORS } from "#app/compare/[competitor]/compare-data";
import { BlogCard } from "#components/blog/blog-card";
import { BlogInlineCta } from "#components/blog/blog-inline-cta";
import { LeadMagnetCta } from "#components/blog/lead-magnet-cta";
import { NewsletterSignup } from "#components/blog/newsletter-signup";
import { PageLayout } from "#components/layout/page-layout";
import { Button } from "#components/ui/button";
import { useRelatedPosts } from "#hooks/api/use-blogs";
import { BLOG_TO_COMPETITOR, BLOG_TO_RESOURCE } from "#lib/content-links";
import { cn } from "#lib/utils";
import MarkdownContent from "./markdown-content";

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
	"preventive-maintenance-checklist-rental-properties-seasonal-guide": {
		title: "Download the Complete Maintenance Checklist",
		description:
			"Get a printable season-by-season maintenance checklist covering HVAC, plumbing, electrical, and exterior inspections for your rental properties.",
		resourceType: "checklist",
		downloadUrl: "/resources/seasonal-maintenance-checklist",
	},
	"landlord-tax-deductions-missing-2025": {
		title: "Free Tax Deduction Tracker Spreadsheet",
		description:
			"Track every deductible expense throughout the year with this ready-to-use spreadsheet. Categorized by IRS schedule with auto-calculated totals.",
		resourceType: "spreadsheet",
		downloadUrl: "/resources/landlord-tax-deduction-tracker",
	},
	"security-deposit-laws-by-state-2025": {
		title: "Security Deposit Quick Reference Card",
		description:
			"A one-page reference with deposit limits, return deadlines, and required documentation for all 50 states. Print it and keep it at your desk.",
		resourceType: "guide",
		downloadUrl: "/resources/security-deposit-reference-card",
	},
};

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
	const [imageLoaded, setImageLoaded] = useState(false);

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

	// Category slug is deterministic from the visible category name —
	// same lower-and-dasherize transform the sitemap uses to build the
	// `/blog/category/<slug>` URLs. No DB round-trip needed here.
	const postCategory = post.category ?? "";
	const categorySlug = postCategory.toLowerCase().replace(/\s+/g, "-");

	return (
		<PageLayout>
			{/* Back to Blog */}
			<div className="container mx-auto px-6 page-content pb-8 max-w-4xl">
				<Link
					href="/blog"
					className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
				>
					<ArrowLeft className="size-4 mr-2" />
					Back to Blog
				</Link>
			</div>

			{/* Featured Image */}
			{post.featured_image && (
				<div className="relative aspect-video max-w-4xl mx-auto overflow-hidden rounded-lg mb-8">
					<Image
						src={post.featured_image}
						alt={post.title}
						fill
						sizes="(max-width: 768px) 100vw, 896px"
						priority
						className={cn(
							"object-cover transition-all duration-700 ease-out",
							imageLoaded
								? "blur-0 opacity-100 scale-100"
								: "blur-sm opacity-0 scale-105",
						)}
						onLoad={() => setImageLoaded(true)}
					/>
				</div>
			)}

			{/* Article */}
			<article className="container mx-auto px-6 pb-16 max-w-4xl">
				<header className="mb-12">
					<h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
						{post.title}
					</h1>

					<p className="text-xl text-muted-foreground leading-relaxed mb-8">
						{post.excerpt}
					</p>

					<div className="flex flex-wrap items-center gap-6 text-muted-foreground border-t border-b border-border py-4">
						<div className="flex items-center gap-2">
							<User className="size-4" />
							<span>TenantFlow Team</span>
						</div>
						<div className="flex items-center gap-2">
							<Clock className="size-4" />
							<span>{post.reading_time} min read</span>
						</div>
						<div>
							{post.published_at
								? new Date(post.published_at).toLocaleDateString("en-US", {
										month: "long",
										day: "numeric",
										year: "numeric",
									})
								: ""}
						</div>
						{postCategory && (
							<Link
								href={`/blog/category/${categorySlug}`}
								className="text-primary-text hover:text-primary/80 transition-colors"
							>
								{postCategory}
							</Link>
						)}
					</div>
				</header>

				{/* Article Content with inline CTA */}
				<div className="prose prose-lg dark:prose-invert max-w-none prose-blockquote:border-primary">
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
					<h3 className="typography-h3 text-foreground mb-4">
						Ready to transform your property management?
					</h3>
					<p className="text-muted-foreground mb-6">
						Centralize your portfolio with the document vault, lease e-sign, and
						tax-ready reports.
					</p>
					<Button size="lg" className="px-8" asChild>
						<Link href="/login">
							Start Free Trial
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
