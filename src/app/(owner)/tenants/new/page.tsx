"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
	AddTenantForm,
	applicationToTenantInitialValues,
} from "#components/tenants/add-tenant-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";
import { applicationQueries } from "#hooks/api/query-keys/application-keys";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";
import { unitQueries } from "#hooks/api/query-keys/unit-keys";

/**
 * Add Tenant Page (Full Page Fallback)
 *
 * Renders when user navigates directly to /tenants/new (e.g., bookmark, refresh).
 * The intercepting route modal handles the normal flow from /tenants.
 *
 * THIS PAGE HAS A TWIN (research Pitfall 6):
 * `src/app/(owner)/@modal/(.)tenants/new/page.tsx` renders the same form from
 * the intercepting route and must forward the same application prefill in the
 * same way. A prefill that works on one navigation path and not the other is
 * invisible from the path that works, so edit both together.
 */
export default function AddTenantPage() {
	return (
		<div className="mx-auto w-full max-w-lg py-8">
			{/* The application prefill reads a query parameter through
			    useSearchParams, which sits under a Suspense boundary — the same
			    shape /leases/new uses for its preselection params. */}
			<Suspense fallback={<AddTenantPageSkeleton />}>
				<AddTenantPageContent />
			</Suspense>
		</div>
	);
}

function AddTenantPageSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-7 w-32 mb-2" />
				<Skeleton className="h-5 w-full" />
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function AddTenantPageContent() {
	const searchParams = useSearchParams();
	// UI-SPEC §B-6: the URL carries the application UUID and NOTHING else.
	// Applicant name, email and phone are resolved from this id under RLS, never
	// read off the query string — applicant PII in a URL lands in access logs,
	// browser history and the Referer header of every outbound link here.
	const applicationId = searchParams.get("application") ?? "";

	const { data: propertiesResponse, isPending: propertiesPending } = useQuery(
		propertyQueries.list(),
	);
	const { data: unitsResponse, isPending: unitsPending } = useQuery(
		unitQueries.list(),
	);
	const applicationQuery = useQuery(applicationQueries.detail(applicationId));

	const properties = propertiesResponse?.data ?? [];
	const units = unitsResponse?.data ?? [];

	// A query that is not enabled stays `isPending` forever, so the wait is gated
	// on there actually being an id — otherwise a plain /tenants/new visit would
	// render a skeleton that never resolves.
	const waitingForApplication =
		applicationId !== "" && applicationQuery.isPending;

	if (propertiesPending || unitsPending || waitingForApplication) {
		return <AddTenantPageSkeleton />;
	}

	// A stale, deleted or foreign id resolves to null: RLS returns nothing for
	// another owner's application, so "not found" and "not yours" are
	// indistinguishable here by design (T-66-52). Render the form UNPREFILLED
	// rather than erroring — refusing to create a tenant because a query
	// parameter went stale is the worse outcome.
	const application = applicationQuery.data ?? null;
	const initialValues = application
		? applicationToTenantInitialValues(application)
		: undefined;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Add Tenant</CardTitle>
				<CardDescription>
					Add a tenant record. You can assign them to a property now or attach
					them to a lease later.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<AddTenantForm
					properties={properties}
					units={units}
					initialValues={initialValues}
					applicationId={applicationId}
				/>
			</CardContent>
		</Card>
	);
}
