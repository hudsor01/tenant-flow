import { format } from 'date-fns'
import {
	CheckCircle,
	Clock,
	XCircle,
	AlertCircle,
	FileText
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import { getStatusBadgeVariant } from '@/hooks/useTenantDetailData'

interface Lease {
	id: string
	status: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit: number
	unit?: {
		unitNumber: string
		property?: {
			name: string
		}
	}
}

interface TenantLeaseSectionProps {
	leases?: Lease[]
}

const getStatusIcon = (status: string) => {
	switch (status) {
		case 'ACTIVE':
			return <CheckCircle className="h-4 w-4 text-green-500" />
		case 'PENDING':
			return <Clock className="h-4 w-4 text-yellow-500" />
		case 'EXPIRED':
		case 'TERMINATED':
			return <XCircle className="h-4 w-4 text-red-500" />
		default:
			return <AlertCircle className="h-4 w-4 text-gray-500" />
	}
}

/**
 * Tenant lease history section displaying all leases
 * Shows lease status, property info, dates, and financial details
 */
export default function TenantLeaseSection({
	leases
}: TenantLeaseSectionProps) {
	return (
		<TabsContent value="leases" className="space-y-4">
			<div className="space-y-4">
				{leases?.map(lease => (
					<Card
						key={lease.id}
						className="transition-shadow hover:shadow-md"
					>
						<CardContent className="p-6">
							<div className="flex items-start justify-between">
								<div className="flex-1 space-y-3">
									<div className="flex items-center space-x-3">
										<h4 className="font-semibold">
											{lease.unit?.property?.name} - Unit{' '}
											{lease.unit?.unitNumber}
										</h4>
										<Badge
											variant={getStatusBadgeVariant(
												lease.status
											)}
										>
											{lease.status}
										</Badge>
									</div>

									<div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
										<div>
											<p className="text-muted-foreground">
												Lease Period
											</p>
											<p className="font-medium">
												{format(
													new Date(lease.startDate),
													'MMM yyyy'
												)}{' '}
												-
												{format(
													new Date(lease.endDate),
													'MMM yyyy'
												)}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground">
												Monthly Rent
											</p>
											<p className="font-medium">
												$
												{lease.rentAmount.toLocaleString()}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground">
												Security Deposit
											</p>
											<p className="font-medium">
												$
												{lease.securityDeposit.toLocaleString()}
											</p>
										</div>
									</div>
								</div>

								{getStatusIcon(lease.status)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{(!leases || leases.length === 0) && (
				<div className="py-12 text-center">
					<FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
					<p className="text-muted-foreground">
						No lease history found
					</p>
				</div>
			)}
		</TabsContent>
	)
}
