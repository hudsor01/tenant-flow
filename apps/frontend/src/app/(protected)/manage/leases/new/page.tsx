import { CreateLeaseForm } from './create-lease-form.client'

export default function NewLeasePage() {
	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Create lease</h1>
				<p className="text-muted-foreground">
					Set up a new lease agreement, assign tenants, and configure rent
					details.
				</p>
			</div>
			<CreateLeaseForm />
		</div>
	)
}
