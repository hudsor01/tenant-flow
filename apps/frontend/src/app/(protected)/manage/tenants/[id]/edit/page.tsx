import { CardLayout } from '#components/ui/card-layout'
import { Suspense, lazy } from 'react'

// Dynamic import with code splitting
const TenantEditForm = lazy(() =>
	import('../../../../tenant/tenant-edit-form.client').then(mod => ({
		default: mod.TenantEditForm
	}))
)

interface TenantEditPageProps {
	params: Promise<{ id: string }>
}

// Loading fallback component
function TenantEditFormSkeleton() {
	return (
		<CardLayout
			title="Edit Tenant Information"
			description="Update tenant contact details and emergency contact information"
			isLoading={true}
		>
			<div className="space-y-6">
				<div className="grid grid-cols-2 gap-4">
					<div className="h-10 rounded-md bg-muted animate-pulse" />
					<div className="h-10 rounded-md bg-muted animate-pulse" />
				</div>
				<div className="h-10 rounded-md bg-muted animate-pulse" />
				<div className="h-10 rounded-md bg-muted animate-pulse" />
				<div className="h-24 rounded-md bg-muted animate-pulse" />
			</div>
		</CardLayout>
	)
}

export default async function TenantEditPage({ params }: TenantEditPageProps) {
	const { id } = await params

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Edit tenant</h1>
				<p className="text-muted-foreground">
					Update tenant contact details and emergency contact information.
				</p>
			</div>
			<Suspense fallback={<TenantEditFormSkeleton />}>
				<TenantEditForm id={id} />
			</Suspense>
		</div>
	)
}
