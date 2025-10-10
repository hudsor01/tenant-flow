import { CreateTenantForm } from '../../../tenant-portal/create-tenant-form.client'

export default function NewTenantPage() {
	return (
		<div className="mx-auto w-full max-w-2xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Add new tenant</h1>
				<p className="text-muted-foreground">
					Create a new tenant profile and assign them to a property.
				</p>
			</div>
			<CreateTenantForm />
		</div>
	)
}
