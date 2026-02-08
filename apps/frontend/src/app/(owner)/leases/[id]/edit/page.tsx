'use client'

import { use } from 'react'
import { LeaseForm } from '#components/leases/lease-form'
import { Skeleton } from '#components/ui/skeleton'
import { leaseQueries } from '#hooks/api/query-keys/lease-keys'
import { useQuery } from '@tanstack/react-query'

interface LeaseEditPageProps {
	params: Promise<{ id: string }>
}

export default function LeaseEditPage({ params }: LeaseEditPageProps) {
	const { id } = use(params)
	const { data: lease, isLoading, error } = useQuery(leaseQueries.detail(id))

	if (isLoading) {
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<div className="space-y-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-5 w-80" />
				</div>
				<Skeleton className="h-96 w-full rounded-xl" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive mb-2">
						Error Loading Lease
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load lease'}
					</p>
				</div>
			</div>
		)
	}

	if (!lease) {
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<p className="text-muted-foreground">Lease not found</p>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h3 tracking-tight">Edit lease</h1>
				<p className="text-muted-foreground">
					Make changes to lease timelines, tenant assignment, or financial
					terms.
				</p>
			</div>
			<LeaseForm
				mode="edit"
				lease={lease}
				onSuccess={() => {
					// Navigate back after successful update
					if (typeof window !== 'undefined') {
						window.history.back()
					}
				}}
			/>
		</div>
	)
}
