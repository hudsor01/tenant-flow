import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OwnerEmergencyContactSection } from "../owner-emergency-contact-section";

const mockUseOwnerEmergencyContact = vi.fn();
const mockUpdateMutation = vi.fn();
const mockDeleteMutation = vi.fn();

vi.mock("#hooks/api/use-owner-emergency-contact", () => ({
	useOwnerEmergencyContact: () => mockUseOwnerEmergencyContact(),
	useUpdateOwnerEmergencyContactMutation: () => mockUpdateMutation(),
	useDeleteOwnerEmergencyContactMutation: () => mockDeleteMutation(),
}));

describe("OwnerEmergencyContactSection a11y (A11Y-01)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseOwnerEmergencyContact.mockReturnValue({
			data: null,
			isLoading: false,
		});
		mockUpdateMutation.mockReturnValue({
			mutateAsync: vi.fn(),
			isPending: false,
		});
		mockDeleteMutation.mockReturnValue({
			mutateAsync: vi.fn(),
			isPending: false,
		});
	});

	it("associates each input with its label via htmlFor/id (programmatic labels)", () => {
		render(<OwnerEmergencyContactSection />);

		// getByLabelText resolves ONLY when FieldLabel htmlFor === input id.
		// Each assertion proves the label↔input association exists.
		expect(screen.getByLabelText("Contact Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Contact Name").tagName).toBe("INPUT");

		expect(screen.getByLabelText("Relationship")).toBeInTheDocument();
		expect(screen.getByLabelText("Relationship").tagName).toBe("INPUT");

		// Phone label wraps an icon + visible "Phone Number" text node.
		expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
		expect(screen.getByLabelText("Phone Number").tagName).toBe("INPUT");
	});
});
