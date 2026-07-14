"use client";

import { useRouter } from "next/navigation";
import { RouteModal } from "#components/ui/route-modal";
import { UnitForm } from "#components/units/unit-form.client";

/**
 * New Unit Modal (Intercepting Route)
 *
 * UnitForm's create path prefers `onSuccess` over its default
 * `router.push("/units")`, so the modal closes in place on a successful create.
 */
export default function NewUnitModal() {
	const router = useRouter();

	return (
		<RouteModal
			intent="create"
			className="max-w-3xl max-h-[90vh] overflow-y-auto"
		>
			<div className="space-y-6">
				<div className="space-y-2">
					<h2 className="typography-h3">Add New Unit</h2>
					<p className="text-muted-foreground">Create a new rental unit</p>
				</div>
				<UnitForm mode="create" onSuccess={() => router.back()} />
			</div>
		</RouteModal>
	);
}
