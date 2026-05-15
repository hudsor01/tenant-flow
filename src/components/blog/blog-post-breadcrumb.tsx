import Link from "next/link";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#components/ui/breadcrumb";

export interface BlogPostBreadcrumbProps {
	title: string;
	category: string | null;
}

/**
 * Visible breadcrumb for blog post + category pages.
 *
 * Path MUST match the segments emitted by `createBreadcrumbJsonLd` for the
 * same post — search engines penalize visible-vs-schema drift. See
 * 06-RESEARCH-codebase-audit.md Pitfall 2. The category-slug derivation here
 * (`category.toLowerCase().replace(/\s+/g, '-')`) is the same transform
 * `BlogPostPage` uses to build the `/blog/category/<slug>` link in the meta
 * bar, so the breadcrumb and the category-name link cannot drift.
 */
export function BlogPostBreadcrumb({
	title,
	category,
}: BlogPostBreadcrumbProps) {
	const categorySlug = category
		? category.toLowerCase().replace(/\s+/g, "-")
		: null;

	return (
		<div className="max-w-4xl mx-auto px-6 lg:px-8 pt-6">
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
					{categorySlug && category && (
						<>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href={`/blog/category/${categorySlug}`}>
										{category}
									</Link>
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
