import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Button } from '#components/ui/button'
import { Home, User, Building } from 'lucide-react'
import Link from 'next/link'
import { LeaseSignatureStatus } from '#components/leases/lease-signature-status'
import type { Lease } from '#types/core'

interface UnitInfo {
	id: string
	property_id: string
	unit_number?: string | null | undefined
}

interface LeaseSidebarProps {
	lease: Lease
	unit: UnitInfo | null | undefined
}

export function LeaseSidebar({ lease, unit }: LeaseSidebarProps) {
	const isDraft = lease.lease_status === 'draft'
	const isPendingSignature = lease.lease_status === 'pending_signature'
	const isActive = lease.lease_status === 'active'

	return (
		<div className="space-y-4">
			{/* Signature Status - show for draft and pending_signature leases */}
			{(isDraft || isPendingSignature) && (
				<LeaseSignatureStatus leaseId={lease.id} />
			)}

			{/* Quick Actions */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Quick Actions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{isActive && (
						<Button variant="outline" className="w-full justify-start" asChild>
							<Link href={`/maintenance?unit_id=${lease.unit_id}`}>
								<Home className="w-4 h-4 mr-2" />
								Maintenance Requests
							</Link>
						</Button>
					)}
					<Button variant="outline" className="w-full justify-start" asChild>
						<Link href={`/tenants/${lease.primary_tenant_id}`}>
							<User className="w-4 h-4 mr-2" />
							View Tenant Profile
						</Link>
					</Button>
					{unit && (
						<Button variant="outline" className="w-full justify-start" asChild>
							<Link href={`/properties/${unit.property_id}/units/${unit.id}`}>
								<Building className="w-4 h-4 mr-2" />
								View Unit Details
							</Link>
						</Button>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
