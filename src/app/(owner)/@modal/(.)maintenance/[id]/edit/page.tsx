"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { use } from "react";
import { MaintenanceForm } from "#components/maintenance/maintenance-form.client";
import { RouteModal } from "#components/ui/route-modal";
import { Skeleton } from "#components/ui/skeleton";
import { maintenanceQueries } from "#hooks/api/query-keys/maintenance-keys";

/**
 * Edit Maintenance Request Modal (Intercepting Route)
 *
 * MaintenanceForm's form-level onSuccess calls router.back(), so a successful
 * edit dismisses the modal without extra wiring. The heading mirrors the full
 * page at /maintenance/[id]/edit for sibling parity.
 */
export default function EditMaintenanceModal({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const {
		data: request,
		isLoading,
		error,
	} = useQuery(maintenanceQueries.detail(id));

	if (error) {
		notFound();
	}

	return (
		<RouteModal
			intent="edit"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="typography-h3 tracking-tight">
						Edit maintenance request
					</h2>
					<p className="text-muted-foreground">
						Update request details and keep the record current.
					</p>
				</div>
				{isLoading ? (
					<Skeleton className="h-96 w-full rounded-xl" />
				) : request ? (
					<MaintenanceForm mode="edit" request={request} />
				) : null}
			</div>
		</RouteModal>
	);
}
