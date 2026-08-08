"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
	AddTenantForm,
	applicationToTenantInitialValues,
} from "#components/tenants/add-tenant-form";
import { ApplicationPrefillNotice } from "#components/tenants/application-prefill-notice";
import { DialogDescription, DialogTitle } from "#components/ui/dialog";
import { RouteModal } from "#components/ui/route-modal";
import { Skeleton } from "#components/ui/skeleton";
import { applicationQueries } from "#hooks/api/query-keys/application-keys";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import { unitQueries } from "#hooks/api/query-keys/unit-keys";

/**
 * Add Tenant Modal (Intercepting Route)
 *
 * Opens as a modal overlay when clicking "Add Tenant" from /tenants page.
 * Collects basic tenant info + optional property assignment for the landlord's records.
 *
 * Lease creation is handled separately.
 *
 * THIS PAGE HAS A TWIN (research Pitfall 6):
 * `src/app/(owner)/tenants/new/page.tsx` renders the same form on direct
 * navigation and must forward the same application prefill in the same way.
 * This intercepted path is the one that silently drops the prop, and the
 * failure is invisible from the direct-navigation path — so edit both together.
 */
export default function AddTenantModal() {
	return (
		<RouteModal intent="create" className="max-w-lg">
			<div className="flex flex-col gap-4">
				<div>
					<DialogTitle>Add Tenant</DialogTitle>
					<DialogDescription>
						Add a tenant record. You can assign them to a property now or attach
						them to a lease later.
					</DialogDescription>
				</div>
				{/* The application prefill reads a query parameter through
				    useSearchParams, which sits under a Suspense boundary. */}
				<Suspense fallback={<AddTenantModalSkeleton />}>
					<AddTenantModalBody />
				</Suspense>
			</div>
		</RouteModal>
	);
}

function AddTenantModalSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			{[1, 2, 3, 4].map((i) => (
				<Skeleton key={i} className="h-10 w-full" />
			))}
		</div>
	);
}

function AddTenantModalBody() {
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
	// UI-SPEC §B-6: the duplicate-tenant check belongs on the DESTINATION page,
	// where the tenant is about to be created. Its result is a notice above the
	// form and never a gate on it — a repeat applicant for a second unit is a
	// normal case.
	const { data: duplicateTenant } = useQuery(
		tenantQueries.byEmail(applicationQuery.data?.applicant_email ?? ""),
	);

	const properties = propertiesResponse?.data ?? [];
	const units = unitsResponse?.data ?? [];

	// A query that is not enabled stays `isPending` forever, so the wait is gated
	// on there actually being an id — otherwise opening the modal without an
	// application would render a skeleton that never resolves.
	const waitingForApplication =
		applicationId !== "" && applicationQuery.isPending;

	if (propertiesPending || unitsPending || waitingForApplication) {
		return <AddTenantModalSkeleton />;
	}

	// A stale, deleted or foreign id resolves to null: RLS returns nothing for
	// another owner's application, so "not found" and "not yours" are
	// indistinguishable here by design (T-66-52). Render the form UNPREFILLED
	// rather than erroring.
	const application = applicationQuery.data ?? null;
	const initialValues = application
		? applicationToTenantInitialValues(application)
		: undefined;

	return (
		<div className="flex flex-col gap-4">
			{duplicateTenant ? (
				<ApplicationPrefillNotice
					matchedTenantId={duplicateTenant.id}
					matchedTenantName={duplicateTenant.name}
				/>
			) : null}
			<AddTenantForm
				properties={properties}
				units={units}
				initialValues={initialValues}
				applicationId={applicationId}
			/>
		</div>
	);
}
