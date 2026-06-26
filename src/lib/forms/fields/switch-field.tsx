"use client";

import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#components/ui/field";
import { Switch } from "#components/ui/switch";
import { useFieldContext } from "../form-contexts";

type SwitchFieldProps = {
	label: string;
	description?: string;
	id?: string;
	disabled?: boolean;
};

/** Boolean toggle bound to the active TanStack field (shadcn Switch). */
export function SwitchField({
	label,
	description,
	id,
	disabled,
}: SwitchFieldProps) {
	const field = useFieldContext<boolean>();
	const fieldId = id ?? field.name;
	return (
		<Field orientation="horizontal">
			<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
			<Switch
				id={fieldId}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked)}
				disabled={disabled ?? false}
			/>
			{description ? <FieldDescription>{description}</FieldDescription> : null}
			<FieldError
				errors={field.state.meta.isTouched ? field.state.meta.errors : []}
			/>
		</Field>
	);
}
