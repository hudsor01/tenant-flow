import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import RentPaymentForm from '@/components/payments/RentPaymentForm'
import { Calendar, Receipt, Clock } from 'lucide-react'
import { useTenantData } from '@/hooks/useTenantData'
import { usePaymentsByLease } from '@/hooks/usePayments'
import { format, addMonths } from 'date-fns'

export default function TenantPayments() {
	const { data: tenantData, isLoading } = useTenantData()
	const { data: payments = [] } = usePaymentsByLease(tenantData?.currentLease?.id || '')

	if (isLoading) {
		return <div>Loading payment information...</div>
	}

	if (!tenantData?.currentLease) {
		return (
			<div className="py-8 text-center">
				<p className="text-muted-foreground">No active lease found</p>
			</div>
		)
	}

	const lease = tenantData.currentLease
	const currentDate = new Date()
	const nextDueDate = format(addMonths(currentDate, 0), 'MMMM dd, yyyy')
	const isRentDue = true // You'd calculate this based on lease terms

	return (
		<div className="space-y-6">
			{/* Rent Due Alert */}
			{isRentDue && (
				<Card className="border-orange-200 bg-orange-50">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-orange-800">
							<Clock className="h-5 w-5" />
							Rent Payment Due
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="mb-4 text-orange-700">
							Your rent payment of{' '}
							<strong>${lease.rentAmount}</strong> is due on{' '}
							{nextDueDate}
						</p>
						<Badge
							variant="secondary"
							className="bg-orange-100 text-orange-800"
						>
							Due: {nextDueDate}
						</Badge>
					</CardContent>
				</Card>
			)}

			<div className="grid gap-6 md:grid-cols-2">
				{/* Payment Form */}
				<div>
					<h2 className="mb-4 text-xl font-semibold">
						Make Rent Payment
					</h2>
					<RentPaymentForm
						leaseId={lease.id}
						rentAmount={lease.rentAmount}
						propertyName={lease.unit.property.name}
						dueDate={nextDueDate}
					/>
				</div>

				{/* Payment History */}
				<div>
					<h2 className="mb-4 text-xl font-semibold">
						Payment History
					</h2>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Receipt className="h-5 w-5" />
								Recent Payments
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{payments.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center">
									No payments yet
								</p>
							) : (
								payments.slice(0, 5).map(payment => (
									<div
										key={payment.id}
										className="flex items-center justify-between border-b py-2 last:border-b-0"
									>
										<div>
											<p className="font-medium">
												${payment.amount}
											</p>
											<p className="text-muted-foreground text-sm">
												{format(
													new Date(payment.date),
													'MMM dd, yyyy'
												)}
											</p>
										</div>
										<Badge
											variant={
												payment.status === 'COMPLETED'
													? 'default'
													: 'secondary'
											}
											className={
												payment.status === 'COMPLETED'
													? 'bg-green-100 text-green-800'
													: ''
											}
										>
											{payment.status}
										</Badge>
									</div>
								))
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Lease Information */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Lease Information
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-3">
					<div>
						<p className="text-muted-foreground text-sm">
							Monthly Rent
						</p>
						<p className="text-2xl font-bold">
							${lease.rentAmount}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground text-sm">
							Lease Start
						</p>
						<p className="font-medium">
							{format(new Date(lease.startDate), 'MMM dd, yyyy')}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground text-sm">
							Lease End
						</p>
						<p className="font-medium">
							{format(new Date(lease.endDate), 'MMM dd, yyyy')}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
