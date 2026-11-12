import { lazy, Suspense } from "react";
import { TenantEditFormSkeleton } from "../../components/tenant-edit-form-skeleton";

// Dynamic import with code splitting
const TenantEditForm = lazy(() =>
	import("../../components/tenant-edit-form.client").then((mod) => ({
		default: mod.TenantEditForm,
	})),
);

interface TenantEditPageProps {
	params: Promise<{ id: string }>;
}

export default async function TenantEditPage({ params }: TenantEditPageProps) {
	const { id } = await params;

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h3 tracking-tight">Edit tenant</h1>
				<p className="text-muted-foreground">
					Update tenant contact details and emergency contact information.
				</p>
			</div>
			<Suspense fallback={<TenantEditFormSkeleton />}>
				<TenantEditForm id={id} />
			</Suspense>
		</div>
	);
}
