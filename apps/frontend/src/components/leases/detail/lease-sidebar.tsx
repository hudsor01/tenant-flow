'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { DollarSign, Home, User, Building } from 'lucide-react'
import Link from 'next/link'
import { LeaseSignatureStatus } from '#components/leases/lease-signature-status'
import type { Lease } from '@repo/shared/types/core'
import { LEASE_STATUS } from '#lib/constants/status-values'

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
	const isDraft = lease.lease_status === LEASE_STATUS.DRAFT
	const isPendingSignature =
		lease.lease_status === LEASE_STATUS.PENDING_SIGNATURE
	const isActive = lease.lease_status === LEASE_STATUS.ACTIVE

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
						<>
							<Button variant="outline" className="w-full justify-start" asChild>
								<Link href={`/rent-collection?lease_id=${lease.id}`}>
									<DollarSign className="w-4 h-4 mr-2" />
									View Payments
								</Link>
							</Button>
							<Button variant="outline" className="w-full justify-start" asChild>
								<Link href={`/maintenance?unit_id=${lease.unit_id}`}>
									<Home className="w-4 h-4 mr-2" />
									Maintenance Requests
								</Link>
							</Button>
						</>
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

			{/* Subscription Status (if active lease) */}
			{isActive && lease.stripe_subscription_id && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Autopay Status</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Status</span>
								<Badge
									variant={
										lease.stripe_subscription_status === 'active'
											? 'default'
											: 'secondary'
									}
								>
									{lease.stripe_subscription_status}
								</Badge>
							</div>
							{lease.subscription_failure_reason && (
								<div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-sm text-red-700 dark:text-red-300">
									{lease.subscription_failure_reason}
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
