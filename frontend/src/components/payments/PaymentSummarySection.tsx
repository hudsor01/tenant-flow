import type { LeaseWithRelations } from '@/types/relationships'

interface PaymentSummarySectionProps {
	selectedLeaseId: string | undefined
	availableLeases: LeaseWithRelations[]
}

/**
 * Payment form section showing summary of selected lease
 * Displays property, unit, tenant, and rent information
 */
export default function PaymentSummarySection({
	selectedLeaseId,
	availableLeases
}: PaymentSummarySectionProps) {
	if (!selectedLeaseId) return null

	const selectedLease = availableLeases.find(
		lease => lease.id === selectedLeaseId
	)

	if (!selectedLease) return null

	return (
		<div className="bg-muted/50 mt-4 rounded-lg p-4">
			<h4 className="mb-2 font-medium">Payment Summary</h4>
			<div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
				<div>
					<span className="text-muted-foreground">Property:</span>
					<div className="font-medium">
						{selectedLease.unit?.property?.name}
					</div>
				</div>
				<div>
					<span className="text-muted-foreground">Unit:</span>
					<div className="font-medium">
						Unit {selectedLease.unit?.unitNumber}
					</div>
				</div>
				<div>
					<span className="text-muted-foreground">Tenant:</span>
					<div className="font-medium">
						{selectedLease.tenant?.name}
					</div>
				</div>
				<div>
					<span className="text-muted-foreground">Monthly Rent:</span>
					<div className="font-medium text-green-600">
						${selectedLease.rentAmount}
					</div>
				</div>
			</div>
		</div>
	)
}
