'use client'

import { Card, CardContent } from '#components/ui/card'
import { Calendar, User, Building } from 'lucide-react'
import { cn } from '#lib/utils'
import { formatDate, getDaysUntilExpiry } from './lease-detail-utils'
import type { Lease } from '@repo/shared/types/core'

interface TenantInfo {
	email?: string | null | undefined
	first_name?: string | null | undefined
	last_name?: string | null | undefined
	name?: string | null | undefined
}

interface UnitInfo {
	unit_number?: string | null | undefined
	bedrooms?: number | null | undefined
	bathrooms?: number | null | undefined
	square_feet?: number | null | undefined
	property_id: string
}

interface LeaseDetailsTabProps {
	lease: Lease
	tenant: TenantInfo | null | undefined
	unit: UnitInfo | null | undefined
}

export function LeaseDetailsTab({
	lease,
	tenant,
	unit
}: LeaseDetailsTabProps) {
	const daysUntilExpiry = getDaysUntilExpiry(lease.end_date)
	const isExpiringSoon =
		daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30

	const tenantFullName =
		tenant?.first_name || tenant?.last_name
			? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
			: tenant?.name

	return (
		<Card>
			<CardContent className="p-6 space-y-6">
				{/* Lease Period */}
				<section>
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
						Lease Period
					</h3>
					<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
						<Calendar className="w-8 h-8 text-primary" />
						<div>
							<p className="font-medium">
								{formatDate(lease.start_date)} - {formatDate(lease.end_date)}
							</p>
							{daysUntilExpiry !== null && (
								<p
									className={cn(
										'text-sm',
										isExpiringSoon
											? 'text-orange-600 dark:text-orange-400'
											: 'text-muted-foreground'
									)}
								>
									{daysUntilExpiry > 0
										? `${daysUntilExpiry} days remaining`
										: daysUntilExpiry === 0
											? 'Expires today'
											: 'Expired'}
								</p>
							)}
						</div>
					</div>
				</section>

				{/* Tenant Info */}
				<section>
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
						Tenant
					</h3>
					{tenant ? (
						<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
							<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
								<User className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="font-medium">{tenantFullName || 'Unknown'}</p>
								<p className="text-sm text-muted-foreground">{tenant.email}</p>
							</div>
						</div>
					) : (
						<p className="text-muted-foreground p-4 border rounded-lg bg-muted/10">
							No tenant assigned to this lease
						</p>
					)}
				</section>

				{/* Unit Info */}
				<section>
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
						Unit
					</h3>
					{unit ? (
						<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
							<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
								<Building className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="font-medium">Unit {unit.unit_number}</p>
								<p className="text-sm text-muted-foreground">
									{unit.bedrooms} bed, {unit.bathrooms} bath
									{unit.square_feet
										? ` | ${unit.square_feet.toLocaleString()} sq ft`
										: ''}
								</p>
							</div>
						</div>
					) : (
						<p className="text-muted-foreground p-4 border rounded-lg bg-muted/10">
							No unit linked to this lease
						</p>
					)}
				</section>
			</CardContent>
		</Card>
	)
}
