/**
 * @vitest-environment jsdom
 * UpdatePasswordForm saving spinner (66.2-39 F19).
 *
 * The inline spinner sits on the primary Submit button, whose label is
 * `text-primary-foreground`. Its arc was a named `border-white`, which in dark
 * mode drew a white arc beside the dark primary-foreground label. The arc uses
 * the `primary-foreground` token, so it always matches the label.
 */

import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";

const { updateUser } = vi.hoisted(() => ({
	updateUser: vi.fn(() => new Promise<never>(() => undefined)),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ auth: { updateUser } }),
}));

import { UpdatePasswordForm } from "../update-password-form";

describe("UpdatePasswordForm saving state", () => {
	it("draws the spinner arc in the primary-foreground token", async () => {
		render(<UpdatePasswordForm />);
		const password = "Str0ng!Passw0rd";
		fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
			target: { value: password },
		});
		fireEvent.change(screen.getByPlaceholderText("Confirm your new password"), {
			target: { value: password },
		});
		fireEvent.click(screen.getByRole("button", { name: /save new password/i }));
		const saving = await screen.findByText("Saving...");
		const spinner = saving.parentElement?.querySelector(".animate-spin");
		expect(spinner?.classList).toContain("border-primary-foreground");
		expect(spinner?.classList).not.toContain("border-white");
	});
});
