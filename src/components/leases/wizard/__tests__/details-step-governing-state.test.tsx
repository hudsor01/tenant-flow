/**
 * The lease's Governing State picker offers every state the lease schema
 * accepts, 50 states and DC, by name (help-trace bug 3, 2026-11-25: it
 * offered ten).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { stateNames } from "#lib/templates/lease-template";
import { usStateSchema } from "#lib/validation/lease-wizard.schemas";
import { DetailsStep } from "../details-step";

describe("DetailsStep — Governing State", () => {
	it("offers every state the lease accepts, alphabetically by name", async () => {
		const user = userEvent.setup();
		render(<DetailsStep data={{}} onChange={vi.fn()} />);

		await user.click(screen.getByRole("combobox", { name: "Governing State" }));
		const offered = screen.getAllByRole("option").map((o) => o.textContent);

		expect(offered).toHaveLength(usStateSchema.options.length);
		expect(offered).toHaveLength(51);
		expect(offered).toContain("Wyoming");
		expect(offered).toContain("District of Columbia");
		expect(offered).toEqual(
			usStateSchema.options
				.map((code) => stateNames[code])
				.sort((a, b) => a.localeCompare(b)),
		);
	});

	it("saves the chosen state's code", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<DetailsStep data={{}} onChange={onChange} />);

		await user.click(screen.getByRole("combobox", { name: "Governing State" }));
		await user.click(screen.getByRole("option", { name: "Washington" }));

		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ governing_state: "WA" }),
		);
	});
});
