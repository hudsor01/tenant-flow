"use client";

import { Field, FieldError, FieldLabel } from "#components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { useFieldContext } from "../form-contexts";

type SelectFieldProps = {
	label: string;
	options: ReadonlyArray<{ value: string; label: string }>;
	placeholder?: string;
	id?: string;
	disabled?: boolean;
};

/**
 * Single-select bound to the active TanStack field. `onValueChange` resolves
 * the chosen option from `options` (which constrains the valid values) so the
 * value is forwarded without an `as` cast.
 */
export function SelectField({
	label,
	options,
	placeholder,
	id,
	disabled,
}: SelectFieldProps) {
	const field = useFieldContext<string>();
	const fieldId = id ?? field.name;
	return (
		<Field>
			<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
			<Select
				value={field.state.value}
				onValueChange={(value) => {
					const option = options.find((candidate) => candidate.value === value);
					if (option) field.handleChange(option.value);
				}}
				disabled={disabled ?? false}
			>
				<SelectTrigger id={fieldId}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<FieldError
				errors={field.state.meta.isTouched ? field.state.meta.errors : []}
			/>
		</Field>
	);
}
