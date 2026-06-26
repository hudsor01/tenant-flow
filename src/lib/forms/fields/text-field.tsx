"use client";

import type { ComponentProps } from "react";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { useFieldContext } from "../form-contexts";

type TextFieldProps = Omit<
	ComponentProps<typeof Input>,
	"value" | "onChange" | "onBlur" | "name"
> & {
	label: string;
};

/**
 * Text input bound to the active TanStack field. Mirrors the plain
 * `Input` + `Label` + error pattern the hand-rolled form sections used.
 */
export function TextField({ label, id, ...inputProps }: TextFieldProps) {
	const field = useFieldContext<string>();
	const fieldId = id ?? field.name;
	return (
		<Field>
			<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
			<Input
				id={fieldId}
				name={field.name}
				value={field.state.value}
				onChange={(event) => field.handleChange(event.target.value)}
				onBlur={field.handleBlur}
				{...inputProps}
			/>
			<FieldError
				errors={field.state.meta.isTouched ? field.state.meta.errors : []}
			/>
		</Field>
	);
}
