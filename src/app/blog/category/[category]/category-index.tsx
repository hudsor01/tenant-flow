import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
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
import { loadBlogListing } from "#lib/blog/blog-listing";
import { blogPageHref } from "#lib/blog/blog-page-urls";
import { getBlogCategories } from "#lib/blog/blog-queries";
import {
	categoryLabel,
	MIN_INDEXED_CATEGORY_POSTS,
} from "#lib/seo/blog-categories";
import { createBlogCategoryBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createCollectionPageJsonLd } from "#lib/seo/collection-schema";
import { blogCategoryOgImage } from "#lib/seo/og-cards";
import { createPageMetadata } from "#lib/seo/page-metadata";

/**
 * A blog category listing, page `page`. `/blog/category/[category]` renders
 * page 1 and `.../page/[page]` the rest; both are static and revalidate
 * every 5 minutes (2026-11-24 SEO audit CT-1: reading `?page=` made every
 * category page render on each request).
 */

/** The category from `get_blog_categories` (cached), or null if unknown. */
const getValidCategory = cache(async (slug: string) => {
	const categories = await getBlogCategories();
	return categories.find((category) => category.slug === slug) ?? null;
});

/** The live category slugs, for `generateStaticParams`. */
export async function blogCategorySlugs(): Promise<{ category: string }[]> {
	const categories = await getBlogCategories();
	return categories.map((category) => ({ category: category.slug }));
}

/** A category page's description, in its metadata and its JSON-LD. */
function categoryDescription(label: string): string {
	return `Browse TenantFlow blog posts about ${label.toLowerCase()}. Expert insights and practical guides for landlords.`;
}

export async function categoryIndexMetadata(
	category: string,
	page: number,
): Promise<Metadata> {
	const validCategory = await getValidCategory(category);
	if (!validCategory) return { title: "Category Not Found | TenantFlow" };

	// The column stores the kebab slug; humanize it for the title.
	const label = categoryLabel(validCategory.slug);

	// noindex later pages, and any category below MIN_INDEXED_CATEGORY_POSTS
	// (CT-2: a one- or two-card page is thin). `follow` stays, so its posts
	// are still found; the count is live, so the page joins the index by
	// itself once enough posts are published.
	return createPageMetadata({
		title: `${label} Articles & Guides`,
		description: categoryDescription(label),
		path: blogPageHref(`/blog/category/${category}`, page),
		ogImage: blogCategoryOgImage(category),
		noindex: page > 1 || validCategory.post_count < MIN_INDEXED_CATEGORY_POSTS,
	});
}

export async function CategoryIndex({
	category,
	page,
}: {
	category: string;
	page: number;
}) {
	const validCategory = await getValidCategory(category);
	if (!validCategory) notFound();

	const listing = await loadBlogListing({
		page,
		category: validCategory.name,
	});
	// Past the last page: a real 404, so crawlers drop the URL.
	if (!listing) notFound();
	const { posts, total, totalPages } = listing;
	const label = categoryLabel(validCategory.slug);

	return (
		<PageLayout>
			<JsonLdScript schema={createBlogCategoryBreadcrumbJsonLd(category)} />
			<JsonLdScript
				schema={createCollectionPageJsonLd({
					name: `${label} Articles & Guides`,
					path: blogPageHref(`/blog/category/${category}`, page),
					description: categoryDescription(label),
					pages: posts.map((post) => ({
						name: post.title,
						path: `/blog/${post.slug}`,
					})),
				})}
			/>

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
							<BreadcrumbLink asChild>
								<Link href="/blog">Blog</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{label}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			<section className="section-spacing">
				<div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
					<h1 className="text-responsive-display-xl font-bold tracking-tight">
						{label}
					</h1>
					<p className="mt-4 mb-0 text-lg text-muted-foreground">
						{total} article{total === 1 ? "" : "s"} on {label.toLowerCase()}.
					</p>
				</div>
			</section>

			<section className="section-spacing">
				<div className="mx-auto max-w-6xl px-6 lg:px-8">
					{posts.length === 0 ? (
						<BlogEmptyState message="No posts in this category yet." />
					) : (
						<>
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{posts.map((post) => (
									<BlogCard key={post.id} post={post} />
								))}
							</div>
							{totalPages > 1 && (
								<BlogPagination
									basePath={`/blog/category/${category}`}
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
					<NewsletterSignup className="shadow-sm" location="blog-category" />
				</div>
			</section>
		</PageLayout>
	);
}
