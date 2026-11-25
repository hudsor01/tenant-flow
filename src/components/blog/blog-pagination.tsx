"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { blogPageHref } from "#lib/blog/blog-page-urls";
import { cn } from "#lib/utils";

interface BlogPaginationProps {
	/** The listing's first page, e.g. `/blog` or `/blog/category/lease-law`. */
	basePath: string;
	/** The page being shown; the server knows it from the route. */
	currentPage: number;
	totalPages: number;
	className?: string;
}

/**
 * Previous / next links between a listing's pages. Page N lives at
 * `<basePath>/page/N` (page 1 at the bare path), so the listings render
 * statically (2026-11-24 SEO audit BL1, CT-1).
 */
export function BlogPagination({
	basePath,
	currentPage: requestedPage,
	totalPages,
	className,
}: BlogPaginationProps) {
	const currentPage = Math.max(1, Math.min(requestedPage, totalPages));

	if (totalPages <= 1) {
		return null;
	}

	const linkClasses =
		"inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground";
	const disabledClasses = "pointer-events-none opacity-50";

	const prevPage = currentPage - 1;
	const nextPage = currentPage + 1;
	const hasPrev = currentPage > 1;
	const hasNext = currentPage < totalPages;

	return (
		<nav
			aria-label="Blog pagination"
			className={cn("flex items-center justify-center gap-4", className)}
		>
			{/* Real anchors so the page>1 URLs exist in the SSR HTML and are
			    crawlable. The onClick is a guard only: it preventDefaults
			    nothing but a disabled boundary link. aria-disabled (not the
			    `disabled` attribute, invalid on <a>) plus pointer-events-none
			    gate the boundary pages. */}
			<Link
				href={blogPageHref(basePath, prevPage)}
				className={cn(linkClasses, !hasPrev && disabledClasses)}
				aria-label="Previous page"
				aria-disabled={!hasPrev}
				tabIndex={hasPrev ? undefined : -1}
				onClick={(e) => {
					if (!hasPrev) e.preventDefault();
				}}
			>
				<ChevronLeft className="size-4" />
			</Link>

			<span className="text-sm text-muted-foreground">
				Page {currentPage} of {totalPages}
			</span>

			<Link
				href={blogPageHref(basePath, nextPage)}
				className={cn(linkClasses, !hasNext && disabledClasses)}
				aria-label="Next page"
				aria-disabled={!hasNext}
				tabIndex={hasNext ? undefined : -1}
				onClick={(e) => {
					if (!hasNext) e.preventDefault();
				}}
			>
				<ChevronRight className="size-4" />
			</Link>
		</nav>
	);
}
