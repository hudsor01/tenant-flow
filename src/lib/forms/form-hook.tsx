"use client";

import { createFormHook } from "@tanstack/react-form";
import { DateField } from "./fields/date-field";
import { IconInputField } from "./fields/icon-input-field";
import { NumberField } from "./fields/number-field";
import { SelectField } from "./fields/select-field";
import { SwitchField } from "./fields/switch-field";
import { TextField } from "./fields/text-field";
import { TextareaField } from "./fields/textarea-field";
import { SubmitButton } from "./form-components/submit-button";
import { fieldContext, formContext } from "./form-contexts";

/**
 * Shared TanStack Form composition layer for the whole app.
 *
 * - `useAppForm` — the typed form hook every form uses (replaces raw `useForm`).
 * - `withForm` — wrap an extracted form section; it receives a fully typed
 *   `form` from the `defaultValues` (or shared `formOptions`) passed to it, so
 *   sections never hand-roll a `ReactFormExtendedApi` alias.
 * - `withFieldGroup` — type a reusable group of fields (e.g. a wizard step).
 *
 * Fields render through the registered components via `form.AppField`:
 *   <form.AppField name="email">{(field) => <field.IconInputField .../>}</form.AppField>
 * Form-level chrome renders via `form.AppForm` (e.g. `<form.SubmitButton .../>`).
 *
 * Define each form's options once with `formOptions({ defaultValues, validators })`
 * from `@tanstack/react-form` and spread into both `useAppForm` and `withForm`.
 */
export const { useAppForm, withForm, withFieldGroup } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextField,
		NumberField,
		TextareaField,
		SelectField,
		SwitchField,
		IconInputField,
		DateField,
	},
	formComponents: {
		SubmitButton,
	},
});
