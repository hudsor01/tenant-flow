import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonalInfoSection } from "#components/profiles/owner/personal-info-section";

const baseProps = {
	profile: {
		email: "owner@example.com",
		phone: "(555) 123-4567",
		full_name: "Jane Doe",
		status: "active",
	},
	isEditing: true,
	isPending: false,
	formData: {
		first_name: "Jane",
		last_name: "Doe",
		phone: "(555) 123-4567",
	},
	onEditClick: () => {},
	onCancelEdit: () => {},
	onSaveProfile: () => {},
	onFormChange: () => {},
};

describe("A11Y-01: owner PersonalInfoSection programmatic labels", () => {
	// Every edit-mode input must resolve via its visible <Label htmlFor> ↔
	// <Input id> association. getByLabelText / getByRole({ name }) ONLY match
	// when the label is programmatically associated with the control — this is
	// the deterministic local equivalent of the axe "label" rule.
	it("associates a label with every editable input", () => {
		const { getByLabelText, getByRole } = render(
			<PersonalInfoSection {...baseProps} />,
		);

		// First / Last name + phone are editable textboxes.
		const firstName = getByLabelText("First Name");
		expect(firstName).toBeInstanceOf(HTMLInputElement);
		expect((firstName as HTMLInputElement).value).toBe("Jane");

		const lastName = getByLabelText("Last Name");
		expect(lastName).toBeInstanceOf(HTMLInputElement);
		expect((lastName as HTMLInputElement).value).toBe("Doe");

		const phone = getByLabelText("Phone Number");
		expect(phone).toBeInstanceOf(HTMLInputElement);
		expect((phone as HTMLInputElement).type).toBe("tel");

		// Email is a disabled (read-only) input — disabled inputs are not in the
		// "textbox" role tree, so assert the label association directly.
		const email = getByLabelText("Email Address");
		expect(email).toBeInstanceOf(HTMLInputElement);
		expect((email as HTMLInputElement).value).toBe("owner@example.com");

		// Accessible-name proof via the role tree for the enabled controls.
		expect(getByRole("textbox", { name: "First Name" })).toBe(firstName);
		expect(getByRole("textbox", { name: "Last Name" })).toBe(lastName);
		expect(getByRole("textbox", { name: "Phone Number" })).toBe(phone);
	});
});
