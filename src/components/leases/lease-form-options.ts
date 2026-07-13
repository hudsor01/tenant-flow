import { formOptions } from "@tanstack/react-form";
import { z } from "zod";
import {
	nonNegativeWholeDollarSchema,
	positiveWholeDollarSchema,
} from "#lib/validation/common";

/**
 * Validates the full lease form on blur + submit. Passed as a Standard Schema
 * directly (no `safeParse` / `z.treeifyError`) — its shape already matches the
 * form values, so TanStack runs it and maps issues to fields.
 */
const validationSchema = z
	.object({
		unit_id: z.string().min(1, "Unit is required"),
		primary_tenant_id: z.string().min(1, "Primary tenant is required"),
		start_date: z.string().min(1, "Start date is required"),
		end_date: z.string().min(1, "End date is required"),
		// leases.rent_amount / security_deposit are integer (whole-dollar) columns.
		rent_amount: positiveWholeDollarSchema,
		security_deposit: nonNegativeWholeDollarSchema,
		rent_currency: z.string().min(1, "Currency is required"),
		payment_day: z
			.number()
			.min(1)
			.max(31, "Payment day must be between 1 and 31"),
		lease_status: z.string().min(1, "Lease status is required"),
	})
	.refine(
		(data) => {
			// Only cross-check once both dates are present; the min(1) checks above
			// own the "required" errors.
			if (!data.start_date || !data.end_date) return true;
			const start = new Date(`${data.start_date}T00:00:00.000Z`);
			const end = new Date(`${data.end_date}T00:00:00.000Z`);
			return end > start;
		},
		{ message: "End date must be after start date", path: ["end_date"] },
	);

/**
 * Shared options for the lease create/edit form — spread into both `useAppForm`
 * (lease-form) and the section `withForm` components. The static `defaultValues`
 * fix the value types; `useAppForm` overrides them with the runtime (edit-mode)
 * values.
 */
export const leaseFormOptions = formOptions({
	defaultValues: {
		unit_id: "",
		primary_tenant_id: "",
		start_date: "",
		end_date: "",
		rent_amount: 0,
		security_deposit: 0,
		rent_currency: "USD",
		payment_day: 1,
		lease_status: "draft",
	},
	validators: {
		onBlur: validationSchema,
		onSubmit: validationSchema,
	},
});
