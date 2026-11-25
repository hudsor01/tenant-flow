import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogCard } from "#components/blog/blog-card";
import { BlogPagination } from "#components/blog/blog-pagination";
import { NewsletterSignup } from "#components/blog/newsletter-signup";
import { PageLayout } from "#components/layout/page-layout";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { BlogEmptyState } from "#components/shared/blog-empty-state";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#components/ui/breadcrumb";
import { loadBlogListing, loadComparisonPosts } from "#lib/blog/blog-listing";
import { blogPageHref } from "#lib/blog/blog-page-urls";
import {
	blogAnonClient,
	blogReadsUnavailable,
	getBlogCategories,
} from "#lib/blog/blog-queries";
import { categoryLabel } from "#lib/seo/blog-categories";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";

/**
 * The blog hub, page `page` of every published post. `/blog` renders page 1
 * and `/blog/page/[page]` the rest; both are static and revalidate every 5
 * minutes (2026-11-24 SEO audit BL1: reading `?page=` made the hub render on
 * every request).
 */
export async function blogIndexMetadata(page: number): Promise<Metadata> {
	// Soft-404 guard: with zero published posts the hub is an empty
	// placeholder, so it is noindex until the first post lands. A failed count
	// fails closed to noindex too.
	let count = 0;
	if (!blogReadsUnavailable()) {
		const { count: published, error } = await blogAnonClient()
			.from("blogs")
			.select("id", { count: "exact", head: true })
			.eq("status", "published");
		if (error) {
			Sentry.captureException(error, {
				tags: { surface: "blog-index-metadata" },
			});
		}
		count = published ?? 0;
	}

	return createPageMetadata({
		title: "Landlord Blog: Guides for Independent Landlords",
		description:
			"Practical guides for independent landlords on leases, maintenance, inspections, rent records and tax season, and how to run them in TenantFlow.",
		path: blogPageHref("/blog", page),
		ogCard: "blog-index",
		noindex: page > 1 || count === 0,
	});
}

export async function BlogIndex({ page }: { page: number }) {
	const [listing, categories, comparisons] = await Promise.all([
		loadBlogListing({ page }),
		// Fail-soft (returns [] on error): the category chips just hide.
		getBlogCategories(),
		loadComparisonPosts(),
	]);
	// Past the last page: a real 404, so crawlers drop the URL.
	if (!listing) notFound();
	const { posts, totalPages } = listing;

	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/blog")} />

			<div className="container mx-auto max-w-6xl px-6 lg:px-8 pt-8">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link href="/">Home</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Blog</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			<section className="section-spacing">
				<div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
					<h1 className="text-responsive-display-xl font-bold tracking-tight">
						The blog for independent landlords
					</h1>
					<p className="mt-4 mb-0 text-lg text-muted-foreground">
						Operational guides for leases, maintenance, tax season, and the
						document vault.
					</p>
				</div>
			</section>

			{categories.length > 0 && (
				<section className="pb-8">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<div className="flex flex-wrap items-center gap-2">
							{categories.map((cat) => (
								<Link
									key={cat.slug}
									href={`/blog/category/${cat.slug}`}
									className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									{categoryLabel(cat.slug)}
									<span className="text-muted-foreground group-hover:text-inherit">
										({cat.post_count})
									</span>
								</Link>
							))}
						</div>
					</div>
				</section>
			)}

			{comparisons.length > 0 && (
				<section className="section-spacing">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<h2 className="mb-6 text-2xl font-bold">Software Comparisons</h2>
						<div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
							{comparisons.map((post) => (
								<BlogCard
									key={post.id}
									post={post}
									className="min-w-70 shrink-0 snap-start md:min-w-[320px]"
								/>
							))}
						</div>
					</div>
				</section>
			)}

			<section className="section-spacing">
				<div className="mx-auto max-w-6xl px-6 lg:px-8">
					<h2 className="mb-6 text-2xl font-bold">Insights &amp; Guides</h2>
					{posts.length === 0 ? (
						<BlogEmptyState message="New articles appear here as we write them. Subscribe below to follow along." />
					) : (
						<>
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{posts.map((post) => (
									<BlogCard key={post.id} post={post} />
								))}
							</div>
							{totalPages > 1 && (
								<BlogPagination
									basePath="/blog"
									currentPage={page}
									totalPages={totalPages}
									className="mt-8"
								/>
							)}
						</>
					)}
				</div>
			</section>

			<section className="section-spacing">
				<div className="mx-auto max-w-2xl px-6 lg:px-8">
					<NewsletterSignup className="shadow-sm" location="blog-hub" />
				</div>
			</section>
		</PageLayout>
	);
}
