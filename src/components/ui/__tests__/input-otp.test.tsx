/**
 * @vitest-environment jsdom
 * InputOTP data-slot attributes (new-york-v4 values, ledger C1).
 *
 * The 2FA consumers style the slots through `*:data-[slot=input-otp-slot]:...` classes, which only
 * match when InputOTPSlot renders the upstream data-slot. input-otp spreads the root's rest props
 * onto the hidden input, so `input-otp` lands on that input.
 */

import { describe, expect, it } from "vitest";

import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "#components/ui/input-otp";
import { render } from "#test/utils/test-render";

function renderOtp(slotClassName?: string) {
	return render(
		<InputOTP maxLength={6}>
			<InputOTPGroup>
				<InputOTPSlot index={0} className={slotClassName} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
			</InputOTPGroup>
			<InputOTPSeparator />
			<InputOTPGroup>
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>,
	);
}

describe("InputOTP data-slots", () => {
	it("tags the input, both groups, every slot and the separator", () => {
		const { container } = renderOtp();

		expect(
			container.querySelectorAll('[data-slot="input-otp-slot"]'),
		).toHaveLength(6);
		expect(
			container.querySelectorAll('[data-slot="input-otp-group"]'),
		).toHaveLength(2);

		const separators = container.querySelectorAll(
			'[data-slot="input-otp-separator"]',
		);
		expect(separators).toHaveLength(1);
		expect(separators[0]?.getAttribute("role")).toBe("separator");

		const input = container.querySelector("input");
		expect(input?.getAttribute("data-slot")).toBe("input-otp");
	});

	it("merges a consumer className onto a slot and keeps size-11", () => {
		const { container } = renderOtp("probe-slot-class");
		const first = container.querySelector('[data-slot="input-otp-slot"]');

		expect(first?.classList.contains("size-11")).toBe(true);
		expect(first?.classList.contains("probe-slot-class")).toBe(true);
	});
});
