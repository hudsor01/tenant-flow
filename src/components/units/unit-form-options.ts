import { formOptions } from "@tanstack/react-form";

/**
 * Shared options for the unit create/edit form — spread into both `useAppForm`
 * (unit-form.client) and the `withForm` section (unit-form-fields). The static
 * `defaultValues` fix the value types (all string-backed inputs); `useAppForm`
 * overrides them with the runtime (edit-mode) values. No declarative validators
 * — the form validates imperatively in its `onSubmit` (toast feedback).
 */
export const unitFormOptions = formOptions({
	defaultValues: {
		property_id: "",
		unit_number: "",
		bedrooms: "1",
		bathrooms: "1",
		square_feet: "",
		rent_amount: "",
		status: "available" as
			| "available"
			| "occupied"
			| "maintenance"
			| "reserved",
	},
});
