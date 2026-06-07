import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonalInformationSection } from "#components/profiles/tenant/personal-information-section";

const baseFormData = {
	first_name: "Ada",
	last_name: "Lovelace",
	email: "ada@example.com",
	phone: "(555) 123-4567",
};

function renderSection() {
	return render(
		<PersonalInformationSection
			formData={baseFormData}
			isEditing={true}
			isLoading={false}
			onEditToggle={() => {}}
			onChange={() => {}}
			onSave={() => {}}
			onCancel={() => {}}
		/>,
	);
}

describe("A11Y-01: PersonalInformationSection programmatic labels", () => {
	// getByLabelText resolves ONLY when the <FieldLabel htmlFor> ↔ <input id>
	// association is wired correctly — this IS the axe "label" rule, proven
	// deterministically in jsdom.
	it("associates every input with its label (htmlFor ↔ id)", () => {
		const { getByLabelText } = renderSection();

		expect(getByLabelText("First Name *")).toHaveAttribute("type", "text");
		expect(getByLabelText("Last Name *")).toHaveAttribute("type", "text");
		expect(getByLabelText("Email Address *")).toHaveAttribute("type", "email");
		expect(getByLabelText("Phone Number")).toHaveAttribute("type", "tel");
	});

	it("exposes each control via its accessible name (getByRole name)", () => {
		const { getByRole } = renderSection();

		// editable controls resolve as textbox by their accessible name
		expect(getByRole("textbox", { name: "First Name *" })).toBeInTheDocument();
		expect(getByRole("textbox", { name: "Last Name *" })).toBeInTheDocument();
		expect(getByRole("textbox", { name: "Phone Number" })).toBeInTheDocument();
	});

	it("each input id is unique (no duplicate associations)", () => {
		const { getByLabelText } = renderSection();
		const ids = [
			getByLabelText("First Name *").id,
			getByLabelText("Last Name *").id,
			getByLabelText("Email Address *").id,
			getByLabelText("Phone Number").id,
		];
		for (const id of ids) {
			expect(id).not.toBe("");
		}
		expect(new Set(ids).size).toBe(ids.length);
	});
});
