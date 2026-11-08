import { DollarSign } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { formatDate } from "#lib/formatters/date";
import { formatCurrency } from "#lib/utils/currency";
import type { ExpenseRecord } from "#types/core";
import { AddExpenseDialog } from "./add-expense-dialog";

interface ExpensesCardProps {
	maintenanceId: string;
	expenses: ExpenseRecord[];
	onRefresh: () => void;
}

export function ExpensesCard({
	maintenanceId,
	expenses,
	onRefresh,
}: ExpensesCardProps) {
	const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

	return (
		<Card>
			{/* The header primitive is a grid, so `flex-row justify-between`
			    alone did nothing and Add Expense sat under the title; it is a
			    flex row that wraps (66.2-39 fix round 4, Part 8e). mb-0 below
			    on each paragraph that ends a block or is a flex item: the base
			    margin added 16px inside the row or under the empty state. */}
			<CardHeader className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<CardTitle className="text-base">Expenses</CardTitle>
					<CardDescription>
						Track costs associated with this request
					</CardDescription>
				</div>
				<AddExpenseDialog maintenanceId={maintenanceId} onSuccess={onRefresh} />
			</CardHeader>
			<CardContent>
				{expenses.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<DollarSign className="size-8 mx-auto mb-2 opacity-50" />
						<p className="mb-0">No expenses recorded yet</p>
					</div>
				) : (
					<div className="space-y-3">
						{expenses.map((expense) => (
							<div
								key={expense.id}
								className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
							>
								<div>
									<p className="font-medium">
										{expense.vendor_name || "Unknown Vendor"}
									</p>
									{expense.description ? (
										<p className="text-sm text-muted-foreground">
											{expense.description}
										</p>
									) : null}
									<p className="mb-0 text-sm text-muted-foreground">
										{expense.expense_date
											? formatDate(expense.expense_date)
											: "No date"}
									</p>
								</div>
								<p className="mb-0 shrink-0 font-medium">
									{formatCurrency(expense.amount ?? 0)}
								</p>
							</div>
						))}
						<div className="flex items-center justify-between pt-3 border-t">
							<p className="mb-0 font-medium">Total</p>
							<p className="mb-0 font-bold text-lg">
								{formatCurrency(totalExpenses)}
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
