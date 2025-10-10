import { CreateTenantForm } from '../create-tenant-form.client'

export default function NewTenantPage() {
	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Add Tenant</h1>
				<p className="text-muted-foreground">
					Create a new tenant profile and collect essential lease information.
				</p>
			</div>
			<CreateTenantForm />
		</div>
	)
}
