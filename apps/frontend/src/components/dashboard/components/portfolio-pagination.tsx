'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PortfolioPaginationProps {
	currentPage: number
	totalPages: number
	totalItems: number
	itemsPerPage: number
	onPageChange: (page: number) => void
}

export function PortfolioPagination({
	currentPage,
	totalPages,
	totalItems,
	itemsPerPage,
	onPageChange
}: PortfolioPaginationProps) {
	if (totalPages <= 1) return null

	const startItem = (currentPage - 1) * itemsPerPage + 1
	const endItem = Math.min(currentPage * itemsPerPage, totalItems)

	return (
		<div className="px-4 py-3 border-t border-border flex items-center justify-between">
			<span className="text-sm text-muted-foreground">
				Showing {startItem}–{endItem} of {totalItems}
			</span>
			<div className="flex items-center gap-1">
				<button
					onClick={() => onPageChange(Math.max(1, currentPage - 1))}
					disabled={currentPage === 1}
					className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
					<button
						key={page}
						onClick={() => onPageChange(page)}
						className={`min-w-8 h-8 px-2 text-sm font-medium rounded-md transition-colors ${
							page === currentPage
								? 'bg-primary text-primary-foreground'
								: 'hover:bg-muted text-muted-foreground'
						}`}
					>
						{page}
					</button>
				))}
				<button
					onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
					disabled={currentPage === totalPages}
					className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>
		</div>
	)
}
