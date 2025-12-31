'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { formatCurrency } from '#lib/formatters/currency'
import { DollarSign } from 'lucide-react'
import type { ExpenseRecord } from '@repo/shared/types/core'
import { AddExpenseDialog } from './add-expense-dialog'

interface ExpensesCardProps {
	maintenanceId: string
	expenses: ExpenseRecord[]
	onRefresh: () => void
}

export function ExpensesCard({
	maintenanceId,
	expenses,
	onRefresh
}: ExpensesCardProps) {
	const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<div>
					<CardTitle className="text-base">Expenses</CardTitle>
					<CardDescription>
						Track costs associated with this request
					</CardDescription>
				</div>
				<AddExpenseDialog
					maintenanceId={maintenanceId}
					onSuccess={onRefresh}
				/>
			</CardHeader>
			<CardContent>
				{expenses.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<DollarSign className="size-8 mx-auto mb-2 opacity-50" />
						<p>No expenses recorded yet</p>
					</div>
				) : (
					<div className="space-y-3">
						{expenses.map(expense => (
							<div
								key={expense.id}
								className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
							>
								<div>
									<p className="font-medium">
										{expense.vendor_name || 'Unknown Vendor'}
									</p>
									<p className="text-sm text-muted-foreground">
										{expense.expense_date
											? new Date(expense.expense_date).toLocaleDateString()
											: 'No date'}
									</p>
								</div>
								<p className="font-medium">
									{formatCurrency(expense.amount ?? 0)}
								</p>
							</div>
						))}
						<div className="flex items-center justify-between pt-3 border-t">
							<p className="font-medium">Total</p>
							<p className="font-bold text-lg">{formatCurrency(totalExpenses)}</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
