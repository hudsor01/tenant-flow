'use client'

import { use } from 'react'
import { LeaseForm } from '#components/leases/lease-form'
import { RouteModal } from '#components/ui/route-modal'
import { Skeleton } from '#components/ui/skeleton'
import { leaseQueries } from '#hooks/api/query-keys/lease-keys'
import { useQuery } from '@tanstack/react-query'
import { notFound } from 'next/navigation'

/**
 * Edit Lease Modal (Intercepting Route)
 */
export default function EditLeaseModal({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = use(params)
	const { data: lease, isLoading, error } = useQuery(leaseQueries.detail(id))

	if (error) {
		notFound()
	}

	return (
		<RouteModal
			intent="edit"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="typography-h3">Edit Lease</h2>
					<p className="text-muted-foreground">Update lease details</p>
				</div>
				{isLoading ? (
					<Skeleton className="h-96 w-full rounded-xl" />
				) : lease ? (
					<LeaseForm mode="edit" lease={lease} />
				) : null}
			</div>
		</RouteModal>
	)
}
