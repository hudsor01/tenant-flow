"use client";

import type { ComponentProps } from "react";
import { Button } from "#components/ui/button";
import { useFormContext } from "../form-contexts";

type SubmitButtonProps = Omit<
	ComponentProps<typeof Button>,
	"type" | "disabled"
> & {
	label: string;
	submittingLabel?: string;
};

/**
 * Submit button wired to form state via `form.Subscribe` — disabled until the
 * form `canSubmit`, swaps to `submittingLabel` while submitting. Replaces the
 * per-form `canSubmit`/`isSubmitting` button wiring.
 *
 * Safe with FIELD-level validators (`<form.AppField validators={{ onChange }}>`)
 * and with a form-level `onChange` schema, because both keep `canSubmit` current.
 *
 * Do NOT pair this with a FORM-level `onBlur` validator (D4). That combination
 * deadlocks: the form-level schema validates every field on any blur, so
 * `canSubmit` goes false while the user is still filling, and this button then
 * disables itself on the very blur its own click causes — the click never lands.
 * `FormApi.handleSubmit` compounds it by early-returning on a stale `canSubmit`
 * before it calls `validateAllFields("submit")`, so a programmatically-set value
 * (Select, calendar popover) leaves the form permanently unsubmittable with no
 * visible error. Use a form-level `onChange` validator instead.
 */
export function SubmitButton({
	label,
	submittingLabel = "Saving...",
	...buttonProps
}: SubmitButtonProps) {
	const form = useFormContext();
	return (
		<form.Subscribe
			selector={(state) => [state.canSubmit, state.isSubmitting] as const}
		>
			{([canSubmit, isSubmitting]) => (
				<Button type="submit" disabled={!canSubmit} {...buttonProps}>
					{isSubmitting ? submittingLabel : label}
				</Button>
			)}
		</form.Subscribe>
	);
}
