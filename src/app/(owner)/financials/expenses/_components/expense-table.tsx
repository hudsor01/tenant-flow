"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Receipt, Search, X } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { Input } from "#components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#components/ui/table";
import type { ExpenseRow } from "#hooks/api/query-keys/expense-keys";
import { formatCurrency } from "#lib/utils/currency";

interface ExpenseTableProps {
	expenses: ExpenseRow[];
	filteredExpenses: ExpenseRow[];
	paginatedExpenses: ExpenseRow[];
	searchQuery: string;
	currentPage: number;
	totalPages: number;
	itemsPerPage: number;
	onSearchChange: (value: string) => void;
	onPageChange: (page: number) => void;
	onClearFilters: () => void;
}

export function ExpenseTable({
	expenses,
	filteredExpenses,
	paginatedExpenses,
	searchQuery,
	currentPage,
	totalPages,
	itemsPerPage,
	onSearchChange,
	onPageChange,
	onClearFilters,
}: ExpenseTableProps) {
	return (
		<BlurFade delay={0.4} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				{/* Toolbar */}
				<div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
					<div className="relative w-full sm:w-64">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search expenses..."
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="pl-9 h-9"
						/>
					</div>

					<div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto">
						{searchQuery && (
							<button
								onClick={onClearFilters}
								className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
							>
								<X className="h-3 w-3" />
								Clear
							</button>
						)}
						<span className="text-sm text-muted-foreground whitespace-nowrap">
							{filteredExpenses.length} expense
							{filteredExpenses.length !== 1 ? "s" : ""}
						</span>
					</div>
				</div>

				{/* Table */}
				<Table>
					<TableHeader className="bg-muted/50">
						<TableRow className="hover:bg-transparent">
							<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Date
							</TableHead>
							<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Description
							</TableHead>
							<TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Property
							</TableHead>
							<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
								Amount
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedExpenses.map((expense: ExpenseRow) => (
							<TableRow key={expense.id}>
								<TableCell className="text-sm">
									{expense.expense_date
										? format(new Date(expense.expense_date), "MMM d, yyyy")
										: "--"}
								</TableCell>
								<TableCell>
									<div>
										<p className="font-medium text-foreground text-sm">
											{expense.description || "Expense"}
										</p>
										{expense.vendor_name && (
											<p className="text-xs text-muted-foreground">
												{expense.vendor_name}
											</p>
										)}
									</div>
								</TableCell>
								<TableCell className="hidden md:table-cell text-sm text-muted-foreground">
									{expense.property_name || "--"}
								</TableCell>
								<TableCell className="text-right tabular-nums font-medium text-foreground">
									{formatCurrency(expense.amount)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>

				{/* No results from filters */}
				{filteredExpenses.length === 0 && expenses.length > 0 && (
					<div className="text-center py-12">
						<p className="text-muted-foreground">
							No expenses match your filters
						</p>
						<button
							onClick={onClearFilters}
							className="mt-3 text-sm text-primary-text hover:underline"
						>
							Clear filters
						</button>
					</div>
				)}

				{/* Empty state - no expenses at all */}
				{expenses.length === 0 && (
					<div className="text-center py-12">
						<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
							<Receipt className="w-8 h-8 text-primary" />
						</div>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							No expenses yet
						</h2>
						<p className="text-muted-foreground">
							Expenses from maintenance requests will appear here.
						</p>
					</div>
				)}

				{/* Pagination */}
				{filteredExpenses.length > 0 && totalPages > 1 && (
					<div className="px-4 py-3 border-t border-border flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							Showing {(currentPage - 1) * itemsPerPage + 1}
							{" - "}
							{Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of{" "}
							{filteredExpenses.length}
						</span>
						<div className="flex items-center gap-1">
							<button
								onClick={() => onPageChange(Math.max(1, currentPage - 1))}
								disabled={currentPage === 1}
								className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Previous page"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							{Array.from(
								{ length: Math.min(totalPages, 5) },
								(_, i) => i + 1,
							).map((page) => (
								<button
									key={page}
									onClick={() => onPageChange(page)}
									className={`min-w-8 h-8 px-2 text-sm font-medium rounded-md transition-colors ${
										page === currentPage
											? "bg-primary text-primary-foreground"
											: "hover:bg-muted text-muted-foreground"
									}`}
								>
									{page}
								</button>
							))}
							<button
								onClick={() =>
									onPageChange(Math.min(totalPages, currentPage + 1))
								}
								disabled={currentPage === totalPages}
								className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Next page"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}
			</div>
		</BlurFade>
	);
}
