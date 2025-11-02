'use client'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { useAllTenants } from '#hooks/api/use-tenant'
import { clientFetch } from '#lib/api/client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Home, User } from 'lucide-react'
import Link from 'next/link'
import type { Lease, Unit } from '@repo/shared/types/core'

interface LeaseDetailsProps {
	id: string
}

const logger = createLogger({ component: 'LeaseDetails' })

export function LeaseDetails({ id }: LeaseDetailsProps) {
	const {
		data: lease,
		isLoading,
		isError
	} = useQuery({
		queryKey: ['leases', id],
		queryFn: () => clientFetch<Lease>(`/api/v1/leases/${id}`)
	})

	const { data: tenants = [] } = useAllTenants()

	const { data: units = [] } = useQuery({
		queryKey: ['units'],
		queryFn: () => clientFetch<Unit[]>('/api/v1/units')
	})

	const tenant = tenants.find(t => t.id === lease?.tenantId)
	const unit = units.find((u) => u.id === lease?.unitId)

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

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			<div className="lg:col-span-2 flex flex-col gap-4">
				<div className="flex justify-end mb-2">
					<Button asChild variant="outline" size="sm">
						<Link href={`/manage/leases/${lease.id}/edit`}>Edit lease</Link>
					</Button>
				</div>
				<CardLayout
					title={`Lease #${lease.id.slice(0, 8)}`}
					description={`Status: ${lease.status}`}
					className="flex-1"
				>
					<div className="space-y-8">
						<section className="space-y-3">
							<h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
								Key details
							</h2>
							<div className="grid gap-4 md:grid-cols-2">
								<div className="rounded-xl border bg-muted/20 p-4">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Calendar className="size-4" />
										Lease period
									</div>
									<p className="mt-1 text-sm font-medium">
										{lease.startDate
											? new Date(lease.startDate).toLocaleDateString()
											: 'Start TBD'}{' '}
										&mdash;{' '}
										{lease.endDate
											? new Date(lease.endDate).toLocaleDateString()
											: 'End TBD'}
									</p>
								</div>
								<div className="rounded-xl border bg-muted/20 p-4">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Home className="size-4" />
										Monthly rent
									</div>
									<p className="mt-1 text-sm font-medium">
										{new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: 'USD'
										}).format(lease.rentAmount ?? 0)}
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
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<User className="size-4" />
										Assigned tenant
									</div>
									<p className="mt-1 text-sm font-medium">{tenant.name}</p>
									<p className="text-sm text-muted-foreground">
										{tenant.email}
									</p>
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
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
									<p className="text-sm font-medium">Unit {unit.unitNumber}</p>
									<p className="text-sm text-muted-foreground">
										{unit.bedrooms} bd · {unit.bathrooms} ba
									</p>
								</div>
							) : (
								<p className="text-sm text-muted-foreground">No unit linked</p>
							)}
						</section>
					</div>
				</CardLayout>
			</div>
			<CardLayout
				title="Security deposit"
				description={new Intl.NumberFormat('en-US', {
					style: 'currency',
					currency: 'USD'
				}).format(lease.securityDeposit ?? 0)}
			/>
		</div>
	)
}
