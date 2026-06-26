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
 *
 * CAVEAT — field component ↔ field value type: each field component asserts the
 * value type it binds (`useFieldContext<string>()`, `<number | null>()`,
 * `<boolean>()`). TanStack's `fieldComponents` registry does NOT cross-check that
 * assertion against the field's real type, so mounting e.g. `<field.NumberField>`
 * on a `string` field compiles clean and silently writes the wrong type.
 * Convention: mount each field component only on a field of its asserted value
 * type — TextField / SelectField / IconInputField / DateField → `string`,
 * NumberField → `number | null`, SwitchField → `boolean` — and let each form's
 * own tests pin the binding.
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
