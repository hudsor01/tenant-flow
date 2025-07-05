import React from 'react'
import { useVirtualList, useMemoizedFn } from 'ahooks'
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
import type { PaymentWithDetails } from '@/types/relationships'

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
	const handleEdit = useMemoizedFn((payment: PaymentWithDetails) => {
		onEdit?.(payment)
	})

	const handleDelete = useMemoizedFn((paymentId: string) => {
		onDelete?.(paymentId)
	})

	const formatCurrency = useMemoizedFn((amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount)
	})

	const getStatusColor = useMemoizedFn((status: string) => {
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
	})

	// Virtual list setup
	const [containerRef, list] = useVirtualList(payments, {
		itemHeight,
		overscan: 5 // Render 5 extra items outside viewport for smooth scrolling
	})

	// Early return for small lists (virtualization not needed)
	if (payments.length <= 50) {
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
					{payments.map(payment => (
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
								{payment.tenant?.name || 'N/A'}
							</TableCell>
							<TableCell>
								{payment.property?.name || 'N/A'}
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

	return (
		<div className="w-full">
			{/* Fixed Header */}
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
			</Table>

			{/* Virtualized Body */}
			<div
				ref={containerRef}
				style={{ height: containerHeight }}
				className="overflow-auto border-t"
			>
				<div style={{ height: list.totalHeight, position: 'relative' }}>
					{list.map(({ data: payment, index }) => (
						<motion.div
							key={payment.id}
							style={{
								position: 'absolute',
								top: index * itemHeight,
								width: '100%',
								height: itemHeight
							}}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.2 }}
						>
							<Table>
								<TableBody>
									<TableRow className="h-full">
										<TableCell>
											{format(
												new Date(payment.date),
												'MMM dd, yyyy'
											)}
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
												className={getStatusColor(
													payment.status
												)}
											>
												{payment.status}
											</Badge>
										</TableCell>
										<TableCell>
											{payment.tenant?.name || 'N/A'}
										</TableCell>
										<TableCell>
											{payment.property?.name || 'N/A'}
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
														onClick={() =>
															handleEdit(payment)
														}
													>
														Edit Payment
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															handleDelete(
																payment.id
															)
														}
														className="text-red-600"
													>
														Delete Payment
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	)
}

// Performance optimizations memo wrapper
export const VirtualizedPaymentTableMemo = React.memo(VirtualizedPaymentTable)
