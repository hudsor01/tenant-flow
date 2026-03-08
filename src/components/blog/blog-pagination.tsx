'use client'

import { parseAsInteger, useQueryState } from 'nuqs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '#lib/utils'

interface BlogPaginationProps {
	totalPages: number
	className?: string
}

export function BlogPagination({ totalPages, className }: BlogPaginationProps) {
	const [page, setPage] = useQueryState(
		'page',
		parseAsInteger.withDefault(1)
	)

	const currentPage = Math.max(1, Math.min(page, totalPages))

	if (totalPages <= 1) {
		return null
	}

	const buttonClasses =
		'inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50'

	return (
		<nav
			aria-label="Blog pagination"
			className={cn(
				'flex items-center justify-center gap-4',
				className
			)}
		>
			<button
				type="button"
				className={buttonClasses}
				disabled={currentPage <= 1}
				onClick={() =>
					setPage(currentPage - 1 === 1 ? null : currentPage - 1)
				}
				aria-label="Previous page"
			>
				<ChevronLeft className="size-4" />
			</button>

			<span className="text-sm text-muted-foreground">
				Page {currentPage} of {totalPages}
			</span>

			<button
				type="button"
				className={buttonClasses}
				disabled={currentPage >= totalPages}
				onClick={() => setPage(currentPage + 1)}
				aria-label="Next page"
			>
				<ChevronRight className="size-4" />
			</button>
		</nav>
	)
}
