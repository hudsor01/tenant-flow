'use client'

import { useRouter } from 'next/navigation'
import { LeaseCreationWizard } from '#components/leases/wizard'

export default function NewLeasePage() {
	const router = useRouter()

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h3 tracking-tight">Create Lease</h1>
				<p className="text-muted-foreground">
					Set up a new lease agreement by selecting a property, unit, and
					tenant, then configure the lease terms.
				</p>
			</div>
			<LeaseCreationWizard
				onSuccess={leaseId => router.push(`/leases/${leaseId}`)}
			/>
		</div>
	)
}
