import { LeaseGenerationForm } from '#components/leases/lease-generation-form'
import { requireSession } from '#lib/server-auth'

export default async function GenerateLeasePage({
	searchParams
}: {
	searchParams: Promise<{ propertyId: string; unitId: string; tenantId: string }>
}) {
	await requireSession()
	const params = await searchParams

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">Generate Texas Lease Agreement</h1>
				<p className="text-muted-foreground">
					Fill out the form below to generate a Texas Residential Lease
					Agreement PDF
				</p>
			</div>

			<div className="rounded-xl border bg-card p-6">
				<LeaseGenerationForm
					propertyId={params.propertyId}
					unitId={params.unitId}
					tenantId={params.tenantId}
				/>
			</div>
		</div>
	)
}
