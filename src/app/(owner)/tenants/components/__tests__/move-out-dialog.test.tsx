/**
 * @vitest-environment jsdom
 * "Mark as moved out" (66.2-39 fix round 4, Part 8j): its reasons are the
 * shared list the tenant page reads, and its notes field stops where the saved
 * reason (`slug: notes`) would pass the column's 2,000 characters, and says so.
 */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	MOVE_OUT_NOTES_MAX_LENGTH,
	MOVE_OUT_REASON_LABELS,
} from "#lib/constants/status-types";
import { render } from "#test/utils/test-render";
import { MoveOutDialog } from "../move-out-dialog";

function renderDialog() {
	return render(
		<MoveOutDialog
			tenantName="Jordan Lee"
			open
			onOpenChange={vi.fn()}
			moveOutDate=""
			onMoveOutDateChange={vi.fn()}
			moveOutReason=""
			onMoveOutReasonChange={vi.fn()}
			additionalNotes=""
			onAdditionalNotesChange={vi.fn()}
			isPending={false}
			onSubmit={vi.fn()}
		/>,
	);
}

describe("MoveOutDialog", () => {
	it("bounds the notes and states the bound under the field", () => {
		renderDialog();
		const notes = screen.getByLabelText("Additional Notes (Optional)");
		expect(notes).toHaveAttribute(
			"maxLength",
			String(MOVE_OUT_NOTES_MAX_LENGTH),
		);
		expect(notes).toHaveAccessibleDescription("Up to 1,981 characters.");
	});

	it("offers the shared list of reasons, in its order", async () => {
		const user = userEvent.setup();
		renderDialog();
		await user.click(screen.getByRole("combobox", { name: /reason/i }));
		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual(Object.values(MOVE_OUT_REASON_LABELS));
	});

	it("says the date, reason and notes are saved", () => {
		renderDialog();
		expect(
			screen.getByText(
				/saves the date, reason and notes on their page\. They stay in your tenant list/,
			),
		).toBeInTheDocument();
	});
});
