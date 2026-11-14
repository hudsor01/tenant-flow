/**
 * @vitest-environment jsdom
 * Every tenant option in the maintenance form has a name (66.2-39 fix round 4,
 * Part 8h; WCAG 4.1.2).
 *
 * An option read `{first_name} {last_name}`, so a tenant saved with only
 * `name`, or only an email, rendered an empty option: axe's
 * aria-toggle-field-name failed the open tenant list on /maintenance/new and
 * on a request's edit page. An option now falls back to the tenant's name,
 * then the email.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useMaintenanceForm } from "#hooks/use-maintenance-form";
import { render } from "#test/utils/test-render";
import { MaintenanceFormFields } from "../maintenance-form-fields";

// The form's vendor picker reads the owner's vendors; none here.
vi.mock("#hooks/api/query-keys/vendor-keys", () => ({
	vendorQueries: {
		allActive: () => ({
			queryKey: ["vendors", "list", "all-active"],
			queryFn: async () => [],
		}),
	},
}));

vi.mock("#hooks/api/use-tenant", () => ({
	useAllTenants: () => ({
		data: [
			{
				id: "t1",
				first_name: "Ada",
				last_name: "Park",
				name: null,
				email: "ada@example.com",
			},
			{
				id: "t2",
				first_name: null,
				last_name: null,
				name: "Bo Lin",
				email: "bo@example.com",
			},
			{
				id: "t3",
				first_name: null,
				last_name: null,
				name: null,
				email: "cy@example.com",
			},
		],
	}),
}));

function Harness() {
	const form = useMaintenanceForm({ mode: "create" });
	return (
		<MaintenanceFormFields
			form={form}
			propertiesData={[]}
			unitsByProperty={new Map()}
		/>
	);
}

describe("the maintenance form's tenant options", () => {
	it("each read a name", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		await user.click(screen.getByRole("combobox", { name: /tenant/i }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent),
		).toEqual(["Ada Park", "Bo Lin", "cy@example.com"]);
	});
});
