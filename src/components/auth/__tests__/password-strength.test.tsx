/**
 * @vitest-environment jsdom
 * PasswordStrength met-requirement text (66.2-39).
 *
 * A met rule read `text-accent`, the vivid fill token: 3.51:1 on the popover
 * in light mode, under AA for its 14px text. It uses the AA companion
 * `text-success-text`: 5.38:1 light / 11.57:1 dark on `bg-popover` (Chrome,
 * canvas readback). Unmet rules keep `text-muted-foreground`.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordStrength } from "../password-strength";

describe("PasswordStrength requirement list", () => {
	it("colors a met rule with the AA success text token", () => {
		render(<PasswordStrength placeholder="New password" />);
		const input = screen.getByPlaceholderText("New password");
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: "abcdefgh" } });
		const items = screen.getAllByRole("listitem");
		const met = items.filter((li) =>
			li.classList.contains("text-success-text"),
		);
		const unmet = items.filter((li) =>
			li.classList.contains("text-muted-foreground"),
		);
		expect(met.length).toBeGreaterThan(0);
		expect(unmet.length).toBeGreaterThan(0);
		expect(items.filter((li) => li.classList.contains("text-accent"))).toEqual(
			[],
		);
	});
});
