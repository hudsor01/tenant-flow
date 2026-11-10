/**
 * @vitest-environment jsdom
 * The combobox's input, trigger and list are named and linked (66.2-39 fix
 * round 4, Part 8h; WCAG 4.1.2).
 *
 * Dice UI 2.0.0 points the input's and the trigger's `aria-controls` at a list
 * id it never gives the list, renders the trigger as a bare chevron button,
 * and leaves the list unnamed: on the lease wizard's property, unit and tenant
 * comboboxes axe failed `aria-valid-attr-value` (aria-controls), `button-name`
 * (the trigger) and `aria-input-field-name` (the open list). The wrapper now
 * gives the list an id both point at and names the trigger; the input and the
 * list take their name from the caller's label.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
	Combobox,
	ComboboxAnchor,
	ComboboxContent,
	ComboboxInput,
	ComboboxItem,
	ComboboxTrigger,
} from "#components/ui/combobox";
import { render } from "#test/utils/test-render";

function Harness() {
	return (
		<>
			<span id="fruit-label">Fruit</span>
			<Combobox value="" onValueChange={() => {}}>
				<ComboboxAnchor>
					<ComboboxInput aria-labelledby="fruit-label" />
					<ComboboxTrigger />
				</ComboboxAnchor>
				<ComboboxContent aria-labelledby="fruit-label">
					<ComboboxItem value="apple">Apple</ComboboxItem>
				</ComboboxContent>
			</Combobox>
		</>
	);
}

describe("the combobox", () => {
	it("names its trigger, and links its input and trigger to the named list", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		const input = screen.getByRole("combobox", { name: "Fruit" });
		const trigger = screen.getByRole("button", { name: "Show options" });
		await user.click(trigger);
		const list = await screen.findByRole("listbox", { name: "Fruit" });
		expect(list.id).not.toBe("");
		expect(input).toHaveAttribute("aria-controls", list.id);
		expect(trigger).toHaveAttribute("aria-controls", list.id);
	});
});
