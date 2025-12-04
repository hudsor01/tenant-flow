'use client'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { useQuery } from '@tanstack/react-query'
import { leaseQueries } from '#hooks/api/queries/lease-queries'
import { tenantQueries } from '#hooks/api/queries/tenant-queries'
import { useUnitList } from '#hooks/api/use-unit'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { Calendar, Home, User } from 'lucide-react'
import Link from 'next/link'
import { LeaseSignatureStatus } from '#components/leases/lease-signature-status'
import { SendForSignatureButton } from '#components/leases/send-for-signature-button'
import { SignLeaseButton } from '#components/leases/sign-lease-button'
import { LEASE_STATUS } from '#lib/constants/status-values'

interface LeaseDetailsProps {
	id: string
}

const logger = createLogger({ component: 'LeaseDetails' })

export function LeaseDetails({ id }: LeaseDetailsProps) {
	const {
		data: lease,
		isLoading,
		isError
	} = useQuery(leaseQueries.detail(id))

	const { data: tenantsResponse } = useQuery(tenantQueries.list())

	const { data: units } = useUnitList()

	const tenant = tenantsResponse?.data?.find(t => t.id === lease?.primary_tenant_id)
	const unit = units?.find(u => u.id === lease?.unit_id)

	if (isLoading) {
		return (
			<div className="animate-pulse text-muted-foreground">
				Loading lease...
			</div>
		)
	}

	if (isError || !lease) {
		logger.error('Failed to load lease details', { action: 'loadLeaseDetails' })
		return (
			<CardLayout
				title="Unable to load lease"
				description="Something went wrong while loading this lease. Please refresh and try again."
				error="Failed to load lease details"
			/>
		)
	}

	const isDraft = lease.lease_status === LEASE_STATUS.DRAFT
	const isPendingSignature = lease.lease_status === LEASE_STATUS.PENDING_SIGNATURE
	const tenantFullName = tenant?.first_name || tenant?.last_name
		? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
		: tenant?.name

	// Build props conditionally to satisfy exactOptionalPropertyTypes
	const signatureButtonProps: { leaseId: string; size: 'sm'; tenantName?: string } = {
		leaseId: lease.id,
		size: 'sm'
	}
	if (tenantFullName) {
		signatureButtonProps.tenantName = tenantFullName
	}

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			<div className="lg:col-span-2 flex flex-col gap-4">
				<div className="flex justify-end gap-2 mb-2">
					{isDraft && tenant && (
						<SendForSignatureButton {...signatureButtonProps} />
					)}
					{isPendingSignature && (
						<SignLeaseButton
							leaseId={lease.id}
							role="owner"
							alreadySigned={!!lease.owner_signed_at}
							size="sm"
						/>
					)}
					<Button asChild variant="outline" size="sm">
						<Link href={`/leases/${lease.id}/edit`}>Edit lease</Link>
					</Button>
				</div>
				<CardLayout
					title={`Lease #${lease.id.slice(0, 8)}`}
					description={`Status: ${lease.lease_status}`}
					className="flex-1"
				>
					<div className="space-y-8">
						<section className="space-y-3">
							<h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
								Key details
							</h2>
							<div className="grid gap-4 md:grid-cols-2">
								<div className="rounded-xl border bg-muted/20 p-4">
									<div className="flex items-center gap-2 text-muted">
										<Calendar className="size-4" />
										Lease period
									</div>
									<p className="mt-1 text-sm font-medium">
										{lease.start_date
											? new Date(lease.start_date).toLocaleDateString()
											: 'Start TBD'}{' '}
										&mdash;{' '}
										{lease.end_date
											? new Date(lease.end_date).toLocaleDateString()
											: 'End TBD'}
									</p>
								</div>
								<div className="rounded-xl border bg-muted/20 p-4">
									<div className="flex items-center gap-2 text-muted">
										<Home className="size-4" />
										Monthly rent
									</div>
									<p className="mt-1 text-sm font-medium">
										{new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: 'USD'
										}).format(lease.rent_amount ?? 0)}
									</p>
								</div>
							</div>
						</section>

						<section className="space-y-3">
							<h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
								Tenant
							</h2>
							{tenant ? (
								<div className="rounded-xl border bg-muted/20 p-4">
									<div className="flex items-center gap-2 text-muted">
										<User className="size-4" />
										Assigned tenant
									</div>
									<p className="mt-1 text-sm font-medium">{tenant.first_name || tenant.last_name ? `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() : tenant.name || 'Unknown'}</p>
                            <p className="text-muted">
                              {tenant.email}
									</p>
								</div>
							) : (
								<p className="text-muted">
									No tenant assigned
								</p>
							)}
						</section>

						<section className="space-y-3">
							<h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
								Unit
							</h2>
							{unit ? (
								<div className="rounded-xl border bg-muted/20 p-4">
									<p className="text-sm font-medium">Unit {unit.unit_number}</p>
									<p className="text-muted">
										{unit.bedrooms} bd · {unit.bathrooms} ba
									</p>
								</div>
							) : (
								<p className="text-muted">No unit linked</p>
							)}
						</section>
					</div>
				</CardLayout>
			</div>
			<div className="flex flex-col gap-4">
				{/* Signature Status - show for draft and pending_signature leases */}
				{(isDraft || isPendingSignature) && (
					<LeaseSignatureStatus leaseId={lease.id} />
				)}

				<CardLayout
					title="Security deposit"
					description={new Intl.NumberFormat('en-US', {
						style: 'currency',
						currency: 'USD'
					}).format(lease.security_deposit ?? 0)}
				/>
			</div>
		</div>
	)
}
