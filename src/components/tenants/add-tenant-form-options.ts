import { formOptions } from "@tanstack/react-form";

/**
 * Shared options for the add-tenant form — spread into both `useAppForm`
 * (add-tenant-form) and the section `withForm` components. Validation is
 * field-level (Standard Schema on each field's `onChange`), so there are no
 * form-level validators here.
 */
export const addTenantFormOptions = formOptions({
	defaultValues: {
		email: "",
		first_name: "",
		last_name: "",
		phone: "",
		property_id: "",
		unit_id: "",
	},
});
