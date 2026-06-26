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
