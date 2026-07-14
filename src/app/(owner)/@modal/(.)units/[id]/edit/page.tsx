"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { RouteModal } from "#components/ui/route-modal";
import { UnitForm } from "#components/units/unit-form.client";

/**
 * Edit Unit Modal (Intercepting Route)
 *
 * UnitForm's edit path performs no navigation of its own, so the modal supplies
 * `onSuccess={() => router.back()}` to dismiss itself on a successful save.
 */
export default function EditUnitModal({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);

	return (
		<RouteModal
			intent="edit"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="typography-h3">Edit Unit</h2>
					<p className="text-muted-foreground">Update unit details</p>
				</div>
				<UnitForm mode="edit" id={id} onSuccess={() => router.back()} />
			</div>
		</RouteModal>
	);
}
