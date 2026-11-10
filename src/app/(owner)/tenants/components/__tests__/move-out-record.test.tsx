/**
 * @vitest-environment jsdom
 * The tenant page shows what "Mark as moved out" saved (66.2-39 fix round 4,
 * Part 8j): the date as the page's other dates read, the reason's label from
 * the shared list, and the notes, each when set; a reason outside the list
 * shows as written, never blank.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	MOVE_OUT_NOTES_MAX_LENGTH,
	MOVE_OUT_REASON_LABELS,
	moveOutReasonText,
} from "#lib/constants/status-types";
import { MoveOutRecord } from "../move-out-record";

describe("MoveOutRecord", () => {
	it("shows the date, the reason's label and the notes", () => {
		render(
			<MoveOutRecord
				date="2026-07-07"
				reason="relocation: took a job in Denver"
			/>,
		);
		expect(screen.getByText("Move-Out")).toBeInTheDocument();
		expect(screen.getByText("Move-Out Date")).toBeInTheDocument();
		expect(screen.getByText("July 7, 2026")).toBeInTheDocument();
		expect(screen.getByText("Relocation")).toBeInTheDocument();
		expect(screen.getByText("Notes")).toBeInTheDocument();
		expect(screen.getByText("took a job in Denver")).toBeInTheDocument();
		expect(screen.queryByText(/relocation:/)).not.toBeInTheDocument();
	});

	it("reads each slug as its label from the shared list", () => {
		for (const [slug, label] of Object.entries(MOVE_OUT_REASON_LABELS)) {
			const { unmount } = render(<MoveOutRecord date={null} reason={slug} />);
			expect(screen.getByText(label)).toBeInTheDocument();
			expect(screen.queryByText("Notes")).not.toBeInTheDocument();
			unmount();
		}
	});

	it("shows a 2,000-character reason's notes in full", () => {
		const notes = "word ".repeat(MOVE_OUT_NOTES_MAX_LENGTH / 5).slice(0, -1);
		const reason = moveOutReasonText("early_termination", notes);
		expect(reason.length).toBeLessThanOrEqual(2000);
		render(<MoveOutRecord date="2026-01-31" reason={reason} />);
		expect(screen.getByText("Early Termination")).toBeInTheDocument();
		expect(screen.getByText(notes)).toBeInTheDocument();
		expect(screen.getByText("January 31, 2026")).toBeInTheDocument();
	});

	it("shows a reason whose slug is not in the list as written", () => {
		render(
			<MoveOutRecord date={null} reason="moved_in_with_family: since May" />,
		);
		expect(screen.getByText("Reason")).toBeInTheDocument();
		expect(
			screen.getByText("moved_in_with_family: since May"),
		).toBeInTheDocument();
		expect(screen.queryByText("Notes")).not.toBeInTheDocument();
		expect(screen.queryByText("Move-Out Date")).not.toBeInTheDocument();
	});

	it("shows a date it cannot read as written", () => {
		render(<MoveOutRecord date="07/07/2026" reason={null} />);
		expect(screen.getByText("07/07/2026")).toBeInTheDocument();
		expect(screen.queryByText("Reason")).not.toBeInTheDocument();
	});

	it("renders nothing when neither is set", () => {
		const { container } = render(<MoveOutRecord date={null} reason={null} />);
		expect(container).toBeEmptyDOMElement();
	});
});
