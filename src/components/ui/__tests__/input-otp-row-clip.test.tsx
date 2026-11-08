/**
 * Pins the InputOTP row's clip (66.2-39 fix round 4, Part 8f). input-otp
 * widens its transparent input 40px past the slots, as room for a password
 * manager's badge, when it measures room in the nearest box that clips; the
 * MFA dialog scrolls, so the widened input made it scroll sideways (302px in
 * 286px at 320, at 320-400). With the row clipping its overflow, input-otp
 * finds no room there and keeps the input the row's width; the 4px clip
 * margin keeps the slots' 3px focus ring.
 *
 * jsdom has no layout and input-otp decides on timers after focus, so this
 * file pins the CONFIGURATION; the rendered effect was measured by Part 8f's
 * states sweep (VD-177: the MFA dialog and the 2FA setup dialog's code row,
 * 320-1600, both themes).
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "#components/ui/input-otp";

describe("the InputOTP row", () => {
	it("clips its overflow 4px out, so the widened input never widens the box around it", () => {
		const { container } = render(
			<InputOTP maxLength={2}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
				</InputOTPGroup>
			</InputOTP>,
		);
		const input = container.querySelector('[data-slot="input-otp"]');
		// input-otp marks the row it renders the slots and the input in.
		const row = input?.closest('[data-input-otp-container="true"]');
		expect(row?.className.split(/\s+/)).toEqual(
			expect.arrayContaining(["overflow-clip", "[overflow-clip-margin:4px]"]),
		);
	});
});
