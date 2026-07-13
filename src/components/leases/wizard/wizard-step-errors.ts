import type { ZodError } from "zod";

// The selection-step fields are bare `uuidSchema`, whose only message is the
// developer-facing "Invalid UUID format". A landlord who advances without
// picking a property/unit/tenant must see a plain required message, not that.
// Terms/details fields carry their own user-facing messages, so they pass
// through unchanged (these keys never collide with the selection keys).
const SELECTION_FIELD_LABELS: Record<string, string> = {
	property_id: "Property is required",
	unit_id: "Unit is required",
	primary_tenant_id: "Primary tenant is required",
};

/**
 * Flatten a step's Zod validation error to a `{ field -> first message }` map,
 * substituting friendly required-field copy for the selection-step uuid fields.
 */
export function mapStepErrors(error: ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = issue.path[0];
		if (typeof key === "string" && !(key in out)) {
			out[key] = SELECTION_FIELD_LABELS[key] ?? issue.message;
		}
	}
	return out;
}
