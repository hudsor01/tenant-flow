/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mail } from "lucide-react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { useAppForm } from "#lib/forms/form-hook";

function Harness() {
	const form = useAppForm({
		defaultValues: {
			name: "",
			cost: null as number | null,
			active: false,
			color: "red",
			note: "",
			email: "",
			born: "",
		},
	});
	return (
		<form aria-label="harness">
			<form.AppField name="name">
				{(field) => <field.TextField label="Name" />}
			</form.AppField>
			<form.AppField name="cost">
				{(field) => <field.NumberField label="Cost" />}
			</form.AppField>
			<form.AppField name="active">
				{(field) => <field.SwitchField label="Active" />}
			</form.AppField>
			<form.AppField name="color">
				{(field) => (
					<field.SelectField
						label="Color"
						options={[
							{ value: "red", label: "Red" },
							{ value: "blue", label: "Blue" },
						]}
					/>
				)}
			</form.AppField>
			<form.AppField name="note">
				{(field) => <field.TextareaField label="Note" />}
			</form.AppField>
			<form.AppField name="email">
				{(field) => <field.IconInputField label="Email" icon={Mail} />}
			</form.AppField>
			<form.AppField name="born">
				{(field) => <field.DateField label="Born" />}
			</form.AppField>
			<form.AppForm>
				<form.SubmitButton label="Save" />
			</form.AppForm>
		</form>
	);
}

function ValidatedHarness() {
	const form = useAppForm({ defaultValues: { name: "" } });
	return (
		<form aria-label="validated">
			<form.AppField
				name="name"
				validators={{
					onChange: ({ value }) => (value.length < 2 ? "Too short" : undefined),
				}}
			>
				{(field) => <field.TextField label="Name" />}
			</form.AppField>
			<form.AppForm>
				<form.SubmitButton label="Save" />
			</form.AppForm>
		</form>
	);
}

// Invalid on mount but never interacted — used to prove error display is gated
// on `isTouched` (the field has an error in state, but it must not render).
function MountInvalidHarness() {
	const form = useAppForm({
		defaultValues: { name: "" },
		validators: { onMount: z.object({ name: z.string().min(2, "Too short") }) },
	});
	return (
		<form aria-label="mount-invalid">
			<form.AppField name="name">
				{(field) => <field.TextField label="Name" />}
			</form.AppField>
		</form>
	);
}

describe("shared form field components", () => {
	it("renders every registered field component plus the submit button", () => {
		render(<Harness />);
		expect(screen.getByLabelText("Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Cost")).toBeInTheDocument();
		expect(screen.getByRole("switch", { name: "Active" })).toBeInTheDocument();
		expect(screen.getByLabelText("Note")).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Born")).toBeInTheDocument();
		expect(screen.getByText("Color")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
	});

	it("binds a text input to field state", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		const name = screen.getByLabelText("Name");
		await user.type(name, "Acme");
		expect(name).toHaveValue("Acme");
	});

	it("coerces empty number input to null and parses numbers", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		const cost = screen.getByLabelText("Cost");
		await user.type(cost, "250");
		expect(cost).toHaveValue(250);
		await user.clear(cost);
		expect(cost).toHaveValue(null);
	});

	it("toggles the boolean switch field", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		const toggle = screen.getByRole("switch", { name: "Active" });
		expect(toggle).toHaveAttribute("aria-checked", "false");
		await user.click(toggle);
		expect(toggle).toHaveAttribute("aria-checked", "true");
	});

	it("forwards the selected option to the field (SelectField)", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		const select = screen.getByRole("combobox", { name: "Color" });
		expect(select).toHaveTextContent("Red");
		await user.click(select);
		await user.click(await screen.findByRole("option", { name: "Blue" }));
		expect(select).toHaveTextContent("Blue");
	});

	it("renders a field validation error through FieldError once touched", async () => {
		const user = userEvent.setup();
		render(<ValidatedHarness />);
		await user.type(screen.getByLabelText("Name"), "a");
		// Errors are gated on `isTouched` — blur the field to surface it.
		await user.tab();
		expect(await screen.findByRole("alert")).toHaveTextContent("Too short");
	});

	it("hides errors on an untouched field (gated on isTouched)", () => {
		// Field is invalid on mount but never interacted — the error exists in
		// state yet must not render until the field is touched.
		render(<MountInvalidHarness />);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("disables the submit button while the form cannot submit", async () => {
		const user = userEvent.setup();
		render(<ValidatedHarness />);
		const submit = screen.getByRole("button", { name: "Save" });
		const name = screen.getByLabelText("Name");
		await user.type(name, "a");
		expect(submit).toBeDisabled();
		await user.type(name, "bc");
		expect(submit).toBeEnabled();
	});
});
