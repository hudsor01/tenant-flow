import { LeaseGenerationFormWizard } from '#components/leases/lease-generation-form-wizard'

export default async function GenerateLeasePage({
	searchParams
}: PageProps<'/leases/generate'>) {
	const params = (await searchParams) ?? {}

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">Generate Texas Lease Agreement</h1>
				<p className="text-muted-foreground">
					Follow the guided steps below to generate your Texas Residential Lease Agreement PDF
				</p>
			</div>

			<div className="rounded-xl border bg-card p-8">
				<LeaseGenerationFormWizard
					property_id={typeof params?.property_id === 'string' ? params.property_id : ''}
					unit_id={typeof params?.unit_id === 'string' ? params.unit_id : ''}
					tenant_id={typeof params?.tenant_id === 'string' ? params.tenant_id : ''}
				/>
			</div>
		</div>
	)
}
