"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { LeaseCreationWizard } from "#components/leases/wizard/lease-creation-wizard";

export default function NewLeasePage() {
	const router = useRouter();

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="mb-8">
				<h1 className="text-2xl font-semibold text-foreground">
					Generate New Lease
				</h1>
				<p className="text-muted-foreground">
					Create a new lease agreement step by step.
				</p>
			</div>
			{/* FORMFIX-04: the wizard reads preselection query params via
			    useSearchParams, which must sit under a Suspense boundary. */}
			<Suspense fallback={null}>
				<LeaseCreationWizard
					onSuccess={(leaseId) => router.push(`/leases/${leaseId}`)}
				/>
			</Suspense>
		</div>
	);
}
