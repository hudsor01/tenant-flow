/**
 * An inspection room's delete asks through the app's ConfirmDialog, not the
 * browser's `confirm()` (66.2-39 fix round 4, Part 8g). The room's trash
 * button only opens it, naming the room; the delete (the room, its rating,
 * notes and photos, permanently) runs only from its Delete room.
 *
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InspectionRoom } from "#types/sections/inspections";

const { mockDelete } = vi.hoisted(() => ({ mockDelete: vi.fn() }));

vi.mock("#hooks/api/use-inspection-room-mutations", () => {
	const update = { mutate: vi.fn(), isPending: false };
	const remove = { mutate: mockDelete, isPending: false };
	return {
		useUpdateInspectionRoom: () => update,
		useDeleteInspectionRoom: () => remove,
	};
});
vi.mock("../inspection-photo-upload", () => ({
	InspectionPhotoUpload: () => null,
}));

import { InspectionRoomCard } from "../inspection-room-card";

const ROOM: InspectionRoom = {
	id: "room-1",
	inspection_id: "insp-1",
	room_name: "Primary bedroom",
	room_type: "bedroom",
	condition_rating: "good",
	notes: null,
	created_at: "2026-11-01T00:00:00Z",
	updated_at: "2026-11-01T00:00:00Z",
	photos: [],
};

function renderCard() {
	render(<InspectionRoomCard room={ROOM} inspectionId="insp-1" />);
	return screen.getByRole("button", { name: "Delete room Primary bedroom" });
}

describe("InspectionRoomCard delete confirmation", () => {
	beforeEach(() => {
		mockDelete.mockReset();
	});

	it("opens the confirmation on the trash button, and deletes nothing", async () => {
		await userEvent.click(renderCard());
		const dialog = screen.getByRole("alertdialog");
		expect(
			within(dialog).getByText('Delete room "Primary bedroom"?'),
		).toBeVisible();
		expect(
			within(dialog).getByText(
				"This permanently deletes the room with its condition rating, notes and photos. This can't be undone.",
			),
		).toBeVisible();
		expect(mockDelete).not.toHaveBeenCalled();
	});

	it("deletes the room once, only from the confirmation's Delete room", async () => {
		await userEvent.click(renderCard());
		await userEvent.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "Delete room",
			}),
		);
		expect(mockDelete).toHaveBeenCalledTimes(1);
		expect(mockDelete).toHaveBeenCalledWith("room-1");
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
	});

	it("deletes nothing on Cancel", async () => {
		await userEvent.click(renderCard());
		await userEvent.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "Cancel",
			}),
		);
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		expect(mockDelete).not.toHaveBeenCalled();
	});
});
