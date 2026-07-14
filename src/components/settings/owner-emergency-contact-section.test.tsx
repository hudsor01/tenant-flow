/**
 * OwnerEmergencyContactSection confirmation tests
 *
 * DASH-21: "Remove Contact" no longer clears the saved contact directly — the
 * destructive mutation runs only from the ConfirmDialog's confirm action.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDelete, mockUpdate } = vi.hoisted(() => ({
	mockDelete: vi.fn(),
	mockUpdate: vi.fn(),
}));

// The hook return objects are created ONCE (in the factory closure) so each
// render receives the same `contact`/mutation references. The component's
// `useEffect([contact, isEditing])` would otherwise re-run forever if the mock
// returned a fresh object per render (production returns a stable query cache).
vi.mock("#hooks/api/use-owner-emergency-contact", () => {
	const contactResult = {
		data: { name: "Jane Roe", phone: "555-0100", relationship: "Spouse" },
		isLoading: false,
	};
	const updateResult = { mutateAsync: mockUpdate, isPending: false };
	const deleteResult = { mutateAsync: mockDelete, isPending: false };
	return {
		useOwnerEmergencyContact: () => contactResult,
		useUpdateOwnerEmergencyContactMutation: () => updateResult,
		useDeleteOwnerEmergencyContactMutation: () => deleteResult,
	};
});

import { OwnerEmergencyContactSection } from "./owner-emergency-contact-section";

describe("OwnerEmergencyContactSection delete confirmation", () => {
	beforeEach(() => {
		mockDelete.mockReset().mockResolvedValue(undefined);
		mockUpdate.mockReset().mockResolvedValue(undefined);
	});

	it("does not delete on the Remove Contact click — it opens a confirm dialog", async () => {
		render(<OwnerEmergencyContactSection />);

		await userEvent.click(
			screen.getByRole("button", { name: "Remove Contact" }),
		);

		expect(mockDelete).not.toHaveBeenCalled();
		expect(screen.getByText("Remove emergency contact?")).toBeInTheDocument();
	});

	it("deletes only after confirming in the dialog", async () => {
		render(<OwnerEmergencyContactSection />);

		await userEvent.click(
			screen.getByRole("button", { name: "Remove Contact" }),
		);
		await userEvent.click(screen.getByRole("button", { name: "Remove" }));

		expect(mockDelete).toHaveBeenCalledTimes(1);
	});
});
