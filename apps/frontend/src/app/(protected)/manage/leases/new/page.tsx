import { LeaseForm } from '#components/leases/lease-form.client'
import { requireSession } from '#lib/server-auth'

export default async function NewLeasePage() {
	await requireSession()

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Create lease</h1>
				<p className="text-muted-foreground">
					Set up a new lease agreement, assign tenants, and configure rent
					details.
				</p>
			</div>
			<LeaseForm mode="create" />
		</div>
	)
}
