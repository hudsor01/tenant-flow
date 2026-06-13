import Link from "next/link";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#components/ui/breadcrumb";
import { categoryLabel } from "#lib/seo/blog-categories";

export interface BlogPostBreadcrumbProps {
	title: string;
	category: string | null;
}

/**
 * Visible breadcrumb for blog post + category pages.
 *
 * `category` is the raw `blogs.category` value, which is the kebab SLUG
 * (e.g. `lease-law`) — not a human label. The category node therefore links
 * to `/blog/category/<slug>` (the slug verbatim) and renders the human
 * label via `categoryLabel()`. The segments MUST match the JSON-LD emitted
 * by `createBlogPostBreadcrumbJsonLd` for the same post — search engines
 * penalize visible-vs-schema drift. See 06-RESEARCH-codebase-audit.md
 * Pitfall 2.
 */
export function BlogPostBreadcrumb({
	title,
	category,
}: BlogPostBreadcrumbProps) {
	// `category` is the raw `blogs.category` value — the kebab SLUG in
	// production. The lower-and-dasherize is a no-op on a kebab value but
	// keeps the link identical to the meta-bar chip in blog-post-page.tsx if
	// the column ever carries spaced/cased text. The label is humanized.
	const categorySlug = category
		? category.toLowerCase().replace(/\s+/g, "-")
		: null;
	const label = categorySlug ? categoryLabel(categorySlug) : null;

	return (
		<div className="max-w-4xl mx-auto px-6 lg:px-8 pt-12">
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
					{categorySlug && label && (
						<>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href={`/blog/category/${categorySlug}`}>{label}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
						</>
					)}
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{title}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
}
