import { LeaseForm } from '#components/leases/lease-form.client'
import { serverFetch } from '#lib/api/server'
import { requireSession } from '#lib/server-auth'
import type { Lease } from '@repo/shared/types/core'

interface LeaseEditPageProps {
	params: Promise<{ id: string }>
}

export default async function LeaseEditPage({ params }: LeaseEditPageProps) {
	const { id } = await params
	await requireSession()

	// Fetch lease data on server
	const lease = await serverFetch<Lease>(`/api/v1/leases/${id}`)

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Edit lease</h1>
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
