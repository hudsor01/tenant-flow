"use client";

import type { ComponentProps } from "react";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { useFieldContext } from "../form-contexts";

type NumberFieldProps = Omit<
	ComponentProps<typeof Input>,
	"value" | "onChange" | "onBlur" | "name" | "type"
> & {
	label: string;
};

/**
 * Numeric input for a nullable number field. Empty input maps to `null`
 * (not `NaN`) — the coercion the property acquisition-cost field hand-rolled.
 */
export function NumberField({ label, id, ...inputProps }: NumberFieldProps) {
	const field = useFieldContext<number | null>();
	const fieldId = id ?? field.name;
	return (
		<Field>
			<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
			<Input
				id={fieldId}
				name={field.name}
				type="number"
				value={field.state.value ?? ""}
				onChange={(event) => {
					const raw = event.target.value;
					field.handleChange(raw === "" ? null : Number.parseFloat(raw));
				}}
				onBlur={field.handleBlur}
				{...inputProps}
			/>
			<FieldError errors={field.state.meta.errors} />
		</Field>
	);
}
