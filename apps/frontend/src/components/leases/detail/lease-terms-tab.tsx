'use client'

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription
} from '#components/ui/card'
import { Badge } from '#components/ui/badge'
import { formatCurrency } from './lease-detail-utils'
import type { Lease } from '@repo/shared/types/core'

interface LeaseTermsTabProps {
	lease: Lease
}

export function LeaseTermsTab({ lease }: LeaseTermsTabProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Lease Terms</CardTitle>
				<CardDescription>Financial and policy details</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Financial Terms */}
				<section>
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
						Financial Terms
					</h3>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="p-3 rounded-lg border">
							<p className="text-sm text-muted-foreground">Late Fee</p>
							<p className="font-medium">
								{lease.late_fee_amount
									? `${formatCurrency(lease.late_fee_amount)} after ${lease.late_fee_days || 0} days`
									: 'None'}
							</p>
						</div>
						<div className="p-3 rounded-lg border">
							<p className="text-sm text-muted-foreground">Autopay</p>
							<p className="font-medium">
								{lease.auto_pay_enabled ? 'Enabled' : 'Disabled'}
							</p>
						</div>
						<div className="p-3 rounded-lg border">
							<p className="text-sm text-muted-foreground">Currency</p>
							<p className="font-medium">{lease.rent_currency || 'USD'}</p>
						</div>
						<div className="p-3 rounded-lg border">
							<p className="text-sm text-muted-foreground">
								Stripe Subscription
							</p>
							<p className="font-medium capitalize">
								{lease.stripe_subscription_status === 'none'
									? 'Not Set Up'
									: lease.stripe_subscription_status}
							</p>
						</div>
					</div>
				</section>

				{/* Property Rules */}
				{(lease.pets_allowed !== null || lease.max_occupants !== null) && (
					<section>
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
							Property Rules
						</h3>
						<div className="grid gap-3 sm:grid-cols-2">
							{lease.max_occupants !== null && (
								<div className="p-3 rounded-lg border">
									<p className="text-sm text-muted-foreground">Max Occupants</p>
									<p className="font-medium">{lease.max_occupants}</p>
								</div>
							)}
							<div className="p-3 rounded-lg border">
								<p className="text-sm text-muted-foreground">Pets</p>
								<p className="font-medium">
									{lease.pets_allowed ? 'Allowed' : 'Not Allowed'}
									{lease.pets_allowed && lease.pet_deposit && (
										<span className="text-muted-foreground">
											{' '}
											(${lease.pet_deposit} deposit)
										</span>
									)}
								</p>
							</div>
						</div>
					</section>
				)}

				{/* Utilities */}
				{(lease.utilities_included?.length ||
					lease.tenant_responsible_utilities?.length) && (
					<section>
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
							Utilities
						</h3>
						<div className="space-y-3">
							{lease.utilities_included &&
								lease.utilities_included.length > 0 && (
									<div className="p-3 rounded-lg border">
										<p className="text-sm text-muted-foreground mb-1">
											Included in Rent
										</p>
										<div className="flex flex-wrap gap-1">
											{lease.utilities_included.map(util => (
												<Badge
													key={util}
													variant="secondary"
													className="capitalize"
												>
													{util}
												</Badge>
											))}
										</div>
									</div>
								)}
							{lease.tenant_responsible_utilities &&
								lease.tenant_responsible_utilities.length > 0 && (
									<div className="p-3 rounded-lg border">
										<p className="text-sm text-muted-foreground mb-1">
											Tenant Responsible
										</p>
										<div className="flex flex-wrap gap-1">
											{lease.tenant_responsible_utilities.map(util => (
												<Badge
													key={util}
													variant="outline"
													className="capitalize"
												>
													{util}
												</Badge>
											))}
										</div>
									</div>
								)}
						</div>
					</section>
				)}

				{/* Disclosures */}
				{lease.property_built_before_1978 && (
					<section>
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
							Disclosures
						</h3>
						<div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
							<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
								Lead Paint Disclosure
							</p>
							<p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
								Property built before 1978.
								{lease.lead_paint_disclosure_acknowledged
									? ' Disclosure acknowledged by tenant.'
									: ' Acknowledgment pending.'}
							</p>
						</div>
					</section>
				)}
			</CardContent>
		</Card>
	)
}
