import { formOptions } from "@tanstack/react-form";
import { z } from "zod";
import { propertyFormSchema } from "#lib/validation/properties";
import type { PropertyType } from "#types/core";

/**
 * Required text/select fields validated on blur + submit. Extended to the full
 * form shape — the four extra fields accept their value type without
 * constraint — so the schema's input type matches the form data and it can be
 * passed to TanStack as a Standard Schema directly (no `safeParse` /
 * `z.treeifyError`). Only the six picked fields are meaningfully validated,
 * matching the prior hand-rolled validator exactly.
 */
const validationSchema = propertyFormSchema
	.pick({
		name: true,
		property_type: true,
		address_line1: true,
		city: true,
		state: true,
		postal_code: true,
	})
	.extend({
		address_line2: z.string(),
		country: z.string(),
		acquisition_cost: z.number().nullable(),
		acquisition_date: z.string(),
	});

/**
 * Shared options for the property create/edit form — spread into both
 * `useAppForm` (property-form.client) and the section `withForm` components.
 * The static `defaultValues` fix the value types; `useAppForm` overrides them
 * with the runtime (edit-mode) values.
 */
export const propertyFormOptions = formOptions({
	defaultValues: {
		name: "",
		property_type: "SINGLE_FAMILY" as PropertyType,
		address_line1: "",
		address_line2: "",
		city: "",
		state: "",
		postal_code: "",
		country: "US",
		acquisition_cost: null as number | null,
		acquisition_date: "",
	},
	// Single `onChange` validator, deliberately NOT `onBlur` + `onSubmit` (D4).
	// A form-level `onBlur` schema only re-evaluates on blur, so any value set
	// programmatically (a Select, a calendar popover) never refreshes `canSubmit`.
	// `FormApi.handleSubmit` then early-returns on that stale flag BEFORE it calls
	// `validateAllFields("submit")`, so the click silently does nothing.
	// Registering the same schema under `onSubmit` as well would also write the
	// identical message under two errorMap keys and render it twice.
	validators: {
		onChange: validationSchema,
	},
});
