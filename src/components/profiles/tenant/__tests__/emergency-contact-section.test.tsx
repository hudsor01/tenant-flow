import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";
import { EmergencyContactSection } from "../emergency-contact-section";

function renderSection() {
	return render(
		<EmergencyContactSection
			formData={{ name: "", relationship: "", phone: "" }}
			hasExistingContact={false}
			isEditing={true}
			isLoading={false}
			isSaving={false}
			onEditToggle={vi.fn()}
			onChange={vi.fn()}
			onSave={vi.fn()}
			onCancel={vi.fn()}
			onDelete={vi.fn()}
		/>,
	);
}

describe("EmergencyContactSection a11y", () => {
	afterEach(() => {
		cleanup();
	});

	it("associates every input with its programmatic label (htmlFor/id)", () => {
		renderSection();

		// getByLabelText resolves ONLY when the FieldLabel htmlFor matches the input id.
		expect(screen.getByLabelText("Contact Name *")).toHaveAttribute(
			"type",
			"text",
		);
		expect(screen.getByLabelText("Relationship")).toHaveAttribute(
			"type",
			"text",
		);
		expect(screen.getByLabelText("Phone Number *")).toHaveAttribute(
			"type",
			"tel",
		);
	});

	it("exposes each control via its accessible name (getByRole)", () => {
		renderSection();

		expect(
			screen.getByRole("textbox", { name: "Contact Name *" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Relationship" }),
		).toBeInTheDocument();
		// Phone label includes an icon; accessible name is still the text "Phone Number *".
		expect(
			screen.getByRole("textbox", { name: "Phone Number *" }),
		).toBeInTheDocument();
	});
});
