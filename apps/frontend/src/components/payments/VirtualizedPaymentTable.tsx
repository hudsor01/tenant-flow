import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { MoreHorizontal, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import type { PaymentWithDetails } from '@/types/api'

interface VirtualizedPaymentTableProps {
	payments: PaymentWithDetails[]
	onEdit?: (payment: PaymentWithDetails) => void
	onDelete?: (paymentId: string) => void
	itemHeight?: number
	containerHeight?: number
}

export default function VirtualizedPaymentTable({
	payments,
	onEdit,
	onDelete,
	itemHeight = 60, // Height of each table row
	containerHeight = 500
}: VirtualizedPaymentTableProps) {
	// Memoized handlers to prevent unnecessary re-renders
	const handleEdit = useCallback((payment: PaymentWithDetails) => {
		onEdit?.(payment)
	}, [onEdit])

	const handleDelete = useCallback((paymentId: string) => {
		onDelete?.(paymentId)
	}, [onDelete])

	const formatCurrency = useCallback((amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount)
	}, [])

	const getStatusColor = useCallback((status: string) => {
		switch (status) {
			case 'PAID':
				return 'bg-green-100 text-green-800'
			case 'PENDING':
				return 'bg-yellow-100 text-yellow-800'
			case 'LATE':
				return 'bg-red-100 text-red-800'
			default:
				return 'bg-gray-100 text-gray-800'
		}
	}, [])

	// For large lists, we paginate. For small lists, show all
	const shouldVirtualize = payments.length > 100
	const displayedPayments = useMemo(() => {
		if (shouldVirtualize) {
			// For very large lists, show first 100 items
			return payments.slice(0, 100)
		}
		return payments
	}, [payments, shouldVirtualize])

	// Early return for small lists (virtualization not needed)
	if (!shouldVirtualize) {
		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Amount</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Tenant</TableHead>
						<TableHead>Property</TableHead>
						<TableHead className="w-[50px]"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{displayedPayments.map(payment => (
						<TableRow key={payment.id}>
							<TableCell>
								{format(new Date(payment.date), 'MMM dd, yyyy')}
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<Receipt className="h-4 w-4" />
									{payment.type}
								</div>
							</TableCell>
							<TableCell className="font-medium">
								{formatCurrency(payment.amount)}
							</TableCell>
							<TableCell>
								<Badge
									className={getStatusColor(payment.status)}
								>
									{payment.status}
								</Badge>
							</TableCell>
							<TableCell>
								{payment.lease?.tenant?.name || 'N/A'}
							</TableCell>
							<TableCell>
								{payment.lease?.unit?.property?.name || 'N/A'}
							</TableCell>
							<TableCell>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className="h-8 w-8 p-0"
										>
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuLabel>
											Actions
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={() => handleEdit(payment)}
										>
											Edit Payment
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() =>
												handleDelete(payment.id)
											}
											className="text-red-600"
										>
											Delete Payment
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		)
	}

	// For very large lists, show a simplified view
	return (
		<div className="w-full">
			<div className="mb-4 text-sm text-gray-600">
				Showing first 100 of {payments.length} payments. Use filters to narrow results.
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Amount</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Tenant</TableHead>
						<TableHead>Property</TableHead>
						<TableHead className="w-[50px]"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{displayedPayments.map((payment, index) => (
						<motion.tr
							key={payment.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2, delay: index * 0.05 }}
						>
							<TableCell>
								{format(new Date(payment.date), 'MMM dd, yyyy')}
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<Receipt className="h-4 w-4" />
									{payment.type}
								</div>
							</TableCell>
							<TableCell className="font-medium">
								{formatCurrency(payment.amount)}
							</TableCell>
							<TableCell>
								<Badge className={getStatusColor(payment.status)}>
									{payment.status}
								</Badge>
							</TableCell>
							<TableCell>
								{payment.lease?.tenant?.name || 'N/A'}
							</TableCell>
							<TableCell>
								{payment.lease?.unit?.property?.name || 'N/A'}
							</TableCell>
							<TableCell>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className="h-8 w-8 p-0"
										>
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuLabel>Actions</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={() => handleEdit(payment)}
										>
											Edit Payment
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => handleDelete(payment.id)}
											className="text-red-600"
										>
											Delete Payment
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</motion.tr>
					))}
				</TableBody>
			</Table>
		</div>
	)
}

// Performance optimizations memo wrapper
export const VirtualizedPaymentTableMemo = React.memo(VirtualizedPaymentTable)
