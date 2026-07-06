"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { LeaseForm } from "#components/leases/lease-form";
import { isLeaseTermsLocked } from "#components/leases/lease-terms-lock";
import { Skeleton } from "#components/ui/skeleton";
import { leaseQueries } from "#hooks/api/query-keys/lease-keys";

interface LeaseEditPageProps {
	params: Promise<{ id: string }>;
}

export default function LeaseEditPage({ params }: LeaseEditPageProps) {
	const { id } = use(params);
	const router = useRouter();
	const { data: lease, isLoading, error } = useQuery(leaseQueries.detail(id));

	// Route-level terms-lock gate (defense-in-depth with the lease-header Edit
	// gate + the 26-06 server trigger): once the lease is pending_signature or
	// tenant_signed_at is set, a typed/bookmarked edit URL must NOT render the
	// editable term form. Bounce to the read-only detail where the header shows
	// the locked state.
	const termsLocked = lease ? isLeaseTermsLocked(lease) : false;
	useEffect(() => {
		if (termsLocked) {
			router.replace(`/leases/${id}`);
		}
	}, [termsLocked, router, id]);

	if (isLoading) {
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<div className="space-y-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-5 w-80" />
				</div>
				<Skeleton className="h-96 w-full rounded-xl" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive-text mb-2">
						Error Loading Lease
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : "Failed to load lease"}
					</p>
				</div>
			</div>
		);
	}

	if (!lease) {
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<p className="text-muted-foreground">Lease not found</p>
			</div>
		);
	}

	if (termsLocked) {
		// Redirect to the detail is in flight — render the skeleton so the
		// editable term form never flashes for a signed / pending lease.
		return (
			<div className="mx-auto w-full max-w-4xl space-y-10">
				<div className="space-y-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-5 w-80" />
				</div>
				<Skeleton className="h-96 w-full rounded-xl" />
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="typography-h3 tracking-tight">Edit lease</h1>
				<p className="text-muted-foreground">
					Make changes to lease timelines, tenant assignment, or financial
					terms.
				</p>
			</div>
			<LeaseForm
				mode="edit"
				lease={lease}
				onSuccess={() => {
					// Navigate back after successful update
					if (typeof window !== "undefined") {
						window.history.back();
					}
				}}
			/>
		</div>
	);
}
