"use client";

import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#components/ui/input-group";
import { useFieldContext } from "../form-contexts";

type IconInputFieldProps = Omit<
	ComponentProps<typeof InputGroupInput>,
	"value" | "onChange" | "onBlur" | "name"
> & {
	label: string;
	icon: LucideIcon;
	description?: string;
};

/**
 * Text input with a leading icon (InputGroup) bound to the active field —
 * the pattern the owner-subscribe form hand-rolled for first/last/email/password.
 */
export function IconInputField({
	label,
	icon: Icon,
	description,
	id,
	...inputProps
}: IconInputFieldProps) {
	const field = useFieldContext<string>();
	const fieldId = id ?? field.name;
	return (
		<Field>
			<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
			<InputGroup>
				<InputGroupAddon align="inline-start">
					<Icon />
				</InputGroupAddon>
				<InputGroupInput
					id={fieldId}
					name={field.name}
					value={field.state.value}
					onChange={(event) => field.handleChange(event.target.value)}
					onBlur={field.handleBlur}
					{...inputProps}
				/>
			</InputGroup>
			{description ? <FieldDescription>{description}</FieldDescription> : null}
			<FieldError
				errors={field.state.meta.isTouched ? field.state.meta.errors : []}
			/>
		</Field>
	);
}
