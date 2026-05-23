"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PortfolioPaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
}

type PageToken = number | "ellipsis-start" | "ellipsis-end";

function buildPageWindow(currentPage: number, totalPages: number): PageToken[] {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}
	const tokens: PageToken[] = [1];
	const windowStart = Math.max(2, currentPage - 1);
	const windowEnd = Math.min(totalPages - 1, currentPage + 1);
	if (windowStart > 2) tokens.push("ellipsis-start");
	for (let p = windowStart; p <= windowEnd; p++) tokens.push(p);
	if (windowEnd < totalPages - 1) tokens.push("ellipsis-end");
	tokens.push(totalPages);
	return tokens;
}

export function PortfolioPagination({
	currentPage,
	totalPages,
	totalItems,
	itemsPerPage,
	onPageChange,
}: PortfolioPaginationProps) {
	if (totalPages <= 1) return null;

	const startItem = (currentPage - 1) * itemsPerPage + 1;
	const endItem = Math.min(currentPage * itemsPerPage, totalItems);
	const tokens = buildPageWindow(currentPage, totalPages);

	return (
		<div className="px-4 py-3 border-t border-border flex items-center justify-between">
			<span className="text-sm text-muted-foreground">
				Showing {startItem} to {endItem} of {totalItems}
			</span>
			<nav className="flex items-center gap-1" aria-label="Pagination">
				<button
					type="button"
					onClick={() => onPageChange(Math.max(1, currentPage - 1))}
					disabled={currentPage === 1}
					aria-label="Previous page"
					className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<ChevronLeft aria-hidden="true" className="size-4" />
				</button>
				{tokens.map((token) =>
					typeof token === "number" ? (
						<button
							type="button"
							key={token}
							onClick={() => onPageChange(token)}
							aria-current={token === currentPage ? "page" : undefined}
							aria-label={`Page ${token}`}
							className={`min-w-8 h-8 px-2 text-sm font-medium rounded-md transition-colors ${
								token === currentPage
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted text-muted-foreground"
							}`}
						>
							{token}
						</button>
					) : (
						<span
							key={token}
							aria-hidden="true"
							className="min-w-8 h-8 px-2 text-sm font-medium text-muted-foreground inline-flex items-center justify-center"
						>
							...
						</span>
					),
				)}
				<button
					type="button"
					onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
					disabled={currentPage === totalPages}
					aria-label="Next page"
					className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<ChevronRight aria-hidden="true" className="size-4" />
				</button>
			</nav>
		</div>
	);
}
