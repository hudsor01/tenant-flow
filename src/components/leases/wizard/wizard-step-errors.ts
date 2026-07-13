import type { ZodError } from "zod";

// Plain labels for every wizard field, used to turn a developer-facing Zod
// message for a MISSING required value into "<Label> is required". Field-level
// messages that already read well (the whole-dollar `.int()` copy, the
// end-date refine, range checks) are preserved as-is.
const FIELD_LABELS: Record<string, string> = {
	property_id: "Property",
	unit_id: "Unit",
	primary_tenant_id: "Primary tenant",
	start_date: "Start date",
	end_date: "End date",
	rent_amount: "Monthly rent",
	security_deposit: "Security deposit",
	late_fee_amount: "Late fee",
	payment_day: "Payment day",
	grace_period_days: "Grace period",
	pet_deposit: "Pet deposit",
	pet_rent: "Monthly pet rent",
	lead_paint_disclosure_acknowledged: "Lead-based paint disclosure",
};

// The selection uuid fields only ever fail because nothing was picked; their
// raw messages ("Invalid UUID format" / "expected string, received undefined")
// are never useful, so any failure maps to required copy.
const SELECTION_KEYS = new Set(["property_id", "unit_id", "primary_tenant_id"]);

// A missing required value yields a raw zod message like
// "Invalid input: expected string, received undefined". Detect that shape so it
// becomes a plain required message, without clobbering the custom field
// messages (whole-dollar, date refine) which never contain "received …".
const MISSING_VALUE_MESSAGE = /received (undefined|null|nan)/i;

/**
 * Flatten a step's Zod validation error to a `{ field -> first message }` map,
 * substituting friendly required-field copy for missing values and the
 * selection uuid fields, while keeping actionable field-level messages.
 */
export function mapStepErrors(error: ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = issue.path[0];
		if (typeof key !== "string" || key in out) continue;
		if (SELECTION_KEYS.has(key) || MISSING_VALUE_MESSAGE.test(issue.message)) {
			out[key] = `${FIELD_LABELS[key] ?? "This field"} is required`;
		} else {
			out[key] = issue.message;
		}
	}
	return out;
}
