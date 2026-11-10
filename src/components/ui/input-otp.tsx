"use client";

/**
 * Local divergence from the shadcn registry item, fix round 4, Part 5b
 * (66.2-39; recorded in the divergence register):
 * - focus ring `ring-ring`, opaque, where upstream draws `ring-ring/50`: the
 *   half-alpha ring read 2.17-2.58:1 on the page, card and popover, under
 *   WCAG 1.4.11's 3:1;
 * - invalid focus ring `ring-destructive-text` where upstream draws
 *   `ring-destructive/20` (dark `/40`), which read 1.43:1;
 * - the container clips its overflow, 4px out (fix round 4, Part 8f):
 *   input-otp widens its transparent input 40px past the slots, as room for
 *   a password manager's badge, when the point it probes near the row's
 *   right edge is not the row (the slots always cover it) and it measures
 *   room in the nearest box that clips. The widened input ran past the MFA
 *   dialog, which scrolls, and the dialog scrolled sideways (302px in 286px
 *   at 320, at 320-400). The row is now that box, so input-otp finds no room
 *   and keeps the input the row's width (measured 238px at 320, 350px at
 *   1280), as it does wherever there is none: a badge, if one shows, sits
 *   over the last slot. The 4px clip margin keeps the slots' 3px focus ring.
 */
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useContext } from "react";

import { cn } from "#lib/utils";

function InputOTP({
	className,
	containerClassName,
	...props
}: ComponentProps<typeof OTPInput> & {
	containerClassName?: string;
}) {
	return (
		<OTPInput
			data-slot="input-otp"
			containerClassName={cn(
				"flex items-center gap-2 overflow-clip [overflow-clip-margin:4px] has-disabled:opacity-50",
				containerClassName,
			)}
			className={cn("disabled:cursor-not-allowed", className)}
			{...props}
		/>
	);
}

function InputOTPGroup({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="input-otp-group"
			className={cn("flex items-center", className)}
			{...props}
		/>
	);
}

function InputOTPSlot({
	index,
	className,
	...props
}: ComponentProps<"div"> & {
	index: number;
}) {
	const inputOTPContext = useContext(OTPInputContext);
	const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

	return (
		<div
			data-slot="input-otp-slot"
			data-active={isActive}
			className={cn(
				"data-[active=true]:border-ring data-[active=true]:ring-ring data-[active=true]:aria-invalid:ring-destructive-text aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex size-11 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
				className,
			)}
			{...props}
		>
			{char}
			{hasFakeCaret && (
				<div className="pointer-events-none absolute inset-0 flex-center">
					<div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
				</div>
			)}
		</div>
	);
}

function InputOTPSeparator({ ...props }: ComponentProps<"div">) {
	return (
		<div data-slot="input-otp-separator" role="separator" {...props}>
			<MinusIcon />
		</div>
	);
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
