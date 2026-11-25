"use client";

import { Printer } from "lucide-react";
import { Button } from "#components/ui/button";
import { track } from "#lib/analytics/track";

/** `resource` names the page for the funnel's `resource_print` event. */
export function PrintButton({ resource }: { resource: string }) {
	return (
		<Button
			variant="outline"
			className="print:hidden"
			onClick={() => {
				track({ name: "resource_print", props: { resource } });
				window.print();
			}}
		>
			<Printer className="size-4 mr-2" />
			Print / Save as PDF
		</Button>
	);
}
