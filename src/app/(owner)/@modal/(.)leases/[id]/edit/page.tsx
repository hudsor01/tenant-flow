"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound, useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { LeaseForm } from "#components/leases/lease-form";
import { isLeaseTermsLocked } from "#components/leases/lease-terms-lock";
import { RouteModal } from "#components/ui/route-modal";
import { Skeleton } from "#components/ui/skeleton";
import { leaseQueries } from "#hooks/api/query-keys/lease-keys";

/**
 * Edit Lease Modal (Intercepting Route)
 *
 * Mirrors the full page at /leases/[id]/edit, including the terms-lock gate:
 * once the lease is pending_signature or the tenant has signed, the editable
 * term form must never render. Bounce to the read-only detail via
 * router.replace; the @modal slot's default.tsx renders null on that
 * unmatched soft navigation, dismissing this modal.
 *
 * LeaseForm's edit path performs no navigation of its own, so the modal
 * supplies `onSuccess={() => router.back()}` to dismiss itself on save.
 */
export default function EditLeaseModal({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const router = useRouter();
	const { data: lease, isLoading, error } = useQuery(leaseQueries.detail(id));

	if (error) {
		notFound();
	}

	const termsLocked = lease ? isLeaseTermsLocked(lease) : false;
	useEffect(() => {
		if (termsLocked) {
			router.replace(`/leases/${id}`);
		}
	}, [termsLocked, router, id]);

	return (
		<RouteModal
			intent="edit"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="typography-h3">Edit Lease</h2>
					<p className="text-muted-foreground">Update lease details</p>
				</div>
				{isLoading || termsLocked ? (
					<Skeleton className="h-96 w-full rounded-xl" />
				) : lease ? (
					<LeaseForm
						mode="edit"
						lease={lease}
						onSuccess={() => router.back()}
					/>
				) : null}
			</div>
		</RouteModal>
	);
}
