"use client";

import type { ComponentProps } from "react";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { useFieldContext } from "../form-contexts";

type DateFieldProps = Omit<
	ComponentProps<typeof Input>,
	"value" | "onChange" | "onBlur" | "name" | "type"
> & {
	label: string;
};

/** `<input type="date">` bound to the active TanStack field (string value). */
export function DateField({ label, id, ...inputProps }: DateFieldProps) {
	const field = useFieldContext<string>();
	const fieldId = id ?? field.name;
	return (
		<Field>
			<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
			<Input
				id={fieldId}
				name={field.name}
				type="date"
				value={field.state.value}
				onChange={(event) => field.handleChange(event.target.value)}
				onBlur={field.handleBlur}
				{...inputProps}
			/>
			<FieldError errors={field.state.meta.errors} />
		</Field>
	);
}
