"use client";

import type { ComponentProps } from "react";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { Textarea } from "#components/ui/textarea";
import { useFieldContext } from "../form-contexts";

type TextareaFieldProps = Omit<
	ComponentProps<typeof Textarea>,
	"value" | "onChange" | "onBlur" | "name"
> & {
	label: string;
};

/** Multi-line text input bound to the active TanStack field. */
export function TextareaField({
	label,
	id,
	...textareaProps
}: TextareaFieldProps) {
	const field = useFieldContext<string>();
	const fieldId = id ?? field.name;
	return (
		<Field>
			<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
			<Textarea
				id={fieldId}
				name={field.name}
				value={field.state.value}
				onChange={(event) => field.handleChange(event.target.value)}
				onBlur={field.handleBlur}
				{...textareaProps}
			/>
			<FieldError errors={field.state.meta.errors} />
		</Field>
	);
}
