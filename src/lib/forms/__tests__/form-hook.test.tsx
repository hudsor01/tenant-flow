/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mail } from "lucide-react";
import { describe, expect, it } from "vitest";
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
});
