/**
 * @vitest-environment jsdom
 * Every control the template form renders is named by its visible label
 * (66.2-39 fix round 4, Part 8h; WCAG 4.1.2).
 *
 * A checkbox field's label was a `<p>` beside the checkbox, and a list item's
 * checkbox label a `<span>`: neither was associated with its control, so the
 * Radix checkbox (a button whose only content is its check icon) had no name.
 * axe's `button-name` failed the rental application's "Background check
 * consent" checkbox on every state of its template page. Each label is now a
 * `<label htmlFor>` of its control, and a checkbox's description is its
 * accessible description. The shared Label of the other controls is rendered
 * in the same branch as the control it names.
 */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { type DynamicField, DynamicForm } from "./dynamic-form";

const VALUES: Record<string, unknown> = {
	backgroundCheck: true,
	applicantName: "",
	notes: "",
	unitType: "",
	occupants: [{ name: "", isMinor: false }],
};

const form = {
	Field: ({
		name,
		children,
	}: {
		name: string;
		children: (api: {
			state: { value: unknown };
			handleChange: (value: unknown) => void;
			handleBlur: () => void;
		}) => ReactNode;
	}) => (
		<>
			{children({
				state: { value: VALUES[name] },
				handleChange: vi.fn(),
				handleBlur: vi.fn(),
			})}
		</>
	),
};

const FIELDS: DynamicField[] = [
	{
		name: "backgroundCheck",
		label: "Background check consent",
		type: "checkbox",
		description: "The applicant authorizes a background report.",
	},
	{ name: "applicantName", label: "Applicant name", type: "text" },
	{ name: "notes", label: "Notes", type: "textarea" },
	{
		name: "unitType",
		label: "Unit type",
		type: "select",
		options: [{ value: "apartment", label: "Apartment" }],
	},
	{
		name: "occupants",
		label: "Occupants",
		type: "list",
		itemLabel: "Occupant",
		itemFields: [
			{ key: "name", label: "Occupant name", type: "text" },
			{ key: "isMinor", label: "Under 18", type: "checkbox" },
		],
	},
];

describe("the template form's controls", () => {
	it("are each named by their visible label", () => {
		render(<DynamicForm form={form} fields={FIELDS} />);

		const consent = screen.getByRole("checkbox", {
			name: "Background check consent",
		});
		expect(consent).toHaveAccessibleDescription(
			"The applicant authorizes a background report.",
		);
		expect(
			screen.getByRole("checkbox", { name: "Under 18" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Applicant name" }),
		).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Notes" })).toBeInTheDocument();
		expect(
			screen.getByRole("combobox", { name: "Unit type" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Occupant name" }),
		).toBeInTheDocument();
	});
});
