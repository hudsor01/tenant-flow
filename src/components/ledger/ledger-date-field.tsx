"use client";

/**
 * Calendar-in-Popover date field for the three ledger dialogs (55-UI-SPEC
 * Surface Layouts 2-4). Bound to the active TanStack field through
 * `useFieldContext`, so it mounts inside `form.AppField` exactly like the
 * registered field components in `src/lib/forms/fields/`.
 *
 * Ledger dates are plain calendar days (`date` columns), never timestamps, so
 * the field's value is the `YYYY-MM-DD` string the mutation schemas validate.
 * Conversion happens on the LOCAL calendar day in both directions: the day the
 * owner clicks is the day that is stored, with no timezone shift.
 *
 * Lives here rather than in `src/lib/forms/fields/` because all three consumers
 * are ledger dialogs; the shared registry stays free of subsystem-specific
 * fields, and the three dialogs share one implementation instead of three.
 */

import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#components/ui/button";
import { Calendar } from "#components/ui/calendar";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#components/ui/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#components/ui/popover";
import { useFieldContext } from "#lib/forms/form-contexts";
import { cn } from "#lib/utils";

/** The `YYYY-MM-DD` shape every ledger `date` column and zod schema expects. */
export const LEDGER_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Serialise a picked day to the stored ledger date (local calendar day). */
export function toLedgerDateString(date: Date): string {
	return format(date, "yyyy-MM-dd");
}

/** Parse a stored ledger date back to a `Date`, or `undefined` if unset/bad. */
export function fromLedgerDateString(value: string): Date | undefined {
	if (!LEDGER_DATE_PATTERN.test(value)) return undefined;
	const parsed = parse(value, "yyyy-MM-dd", new Date());
	return isValid(parsed) ? parsed : undefined;
}

interface LedgerDateFieldProps {
	label: string;
	description?: string;
	id?: string;
	placeholder?: string;
	autoFocus?: boolean;
	disabled?: boolean;
}

export function LedgerDateField({
	label,
	description,
	id,
	placeholder = "Pick a date",
	autoFocus = false,
	disabled = false,
}: LedgerDateFieldProps) {
	const field = useFieldContext<string>();
	const [open, setOpen] = useState(false);
	const fieldId = id ?? field.name;
	const selected = fromLedgerDateString(field.state.value);

	return (
		<Field>
			<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						id={fieldId}
						type="button"
						variant="outline"
						disabled={disabled}
						// Primary field of a deliberately-opened dialog form (CLAUDE.md
						// forms convention: autoFocus the primary input).
						autoFocus={autoFocus}
						onBlur={field.handleBlur}
						className={cn(
							"w-full justify-start font-normal",
							!selected && "text-muted-foreground",
						)}
					>
						<CalendarIcon aria-hidden="true" className="size-4" />
						{selected ? format(selected, "MMM d, yyyy") : placeholder}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<Calendar
						mode="single"
						captionLayout="dropdown"
						selected={selected}
						onSelect={(date) => {
							if (!date) return;
							field.handleChange(toLedgerDateString(date));
							setOpen(false);
						}}
					/>
				</PopoverContent>
			</Popover>
			{description ? <FieldDescription>{description}</FieldDescription> : null}
			<FieldError
				errors={field.state.meta.isTouched ? field.state.meta.errors : []}
			/>
		</Field>
	);
}
