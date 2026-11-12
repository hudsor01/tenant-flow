import { CardLayout } from "#components/ui/card-layout";

/** The edit form's loading state: its page's Suspense fallback and the server render. */
export function TenantEditFormSkeleton() {
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
	);
}
