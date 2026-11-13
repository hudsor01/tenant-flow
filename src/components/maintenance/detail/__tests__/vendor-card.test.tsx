/**
 * @vitest-environment jsdom
 * The maintenance detail page's vendor card (vendor assignment): a picker of
 * the owner's active vendors that assigns, changes or clears the request's
 * vendor, the assigned vendor's phone and email as links, and a way to the
 * vendor list (to add the first vendor when there is none).
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MaintenanceDetailRow } from "#hooks/api/query-keys/maintenance-mappers";
import { DEFAULT_MAINTENANCE_REQUEST } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

const { mutateAsync, vendors } = vi.hoisted(() => ({
	mutateAsync: vi.fn(),
	vendors: {
		current: [] as Array<{ id: string; name: string; trade: string }>,
	},
}));

vi.mock("#hooks/api/use-maintenance", () => ({
	useMaintenanceVendorMutation: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("#hooks/api/query-keys/vendor-keys", () => ({
	vendorQueries: {
		allActive: () => ({
			queryKey: ["vendors", "list", "all-active"],
			queryFn: async () => vendors.current,
		}),
	},
}));

import { VendorCard } from "../vendor-card";

const ACE = "0a0a0a0a-0000-4000-8000-00000000beef";
const BOLT = "0b0b0b0b-0000-4000-8000-00000000beef";

const UNASSIGNED: MaintenanceDetailRow = {
	...DEFAULT_MAINTENANCE_REQUEST,
	tenantEmail: null,
	tenantPhone: null,
	vendorTrade: null,
	vendorPhone: null,
	vendorEmail: null,
};

const ASSIGNED: MaintenanceDetailRow = {
	...UNASSIGNED,
	status: "assigned",
	vendor_id: ACE,
	vendorName: "Ace Plumbing",
	vendorTrade: "plumbing",
	vendorPhone: "(555) 010-2000",
	vendorEmail: "jobs@aceplumbing.example",
};

async function vendorPicker() {
	const picker = await screen.findByRole("combobox", {
		name: "Assigned vendor",
	});
	await waitFor(() => expect(picker).toBeEnabled());
	return picker;
}

describe("the maintenance request's vendor card", () => {
	beforeEach(() => {
		mutateAsync.mockReset().mockResolvedValue(ASSIGNED);
		vendors.current = [
			{ id: ACE, name: "Ace Plumbing", trade: "plumbing" },
			{ id: BOLT, name: "Bolt Electric", trade: "electrical" },
		];
	});

	it("assigns the vendor picked", async () => {
		const user = userEvent.setup();
		render(<VendorCard request={UNASSIGNED} />);
		const picker = await vendorPicker();
		expect(picker).toHaveTextContent("No vendor");
		await user.click(picker);
		await user.click(
			await screen.findByRole("option", { name: "Ace Plumbing · Plumbing" }),
		);
		expect(mutateAsync).toHaveBeenCalledWith({
			id: UNASSIGNED.id,
			data: { vendor_id: ACE },
		});
	});

	it("shows the assigned vendor and how to reach them", async () => {
		render(<VendorCard request={ASSIGNED} />);
		const picker = await vendorPicker();
		expect(picker).toHaveTextContent("Ace Plumbing · Plumbing");
		expect(
			screen.getByRole("link", { name: "(555) 010-2000" }),
		).toHaveAttribute("href", "tel:5550102000");
		expect(
			screen.getByRole("link", { name: "jobs@aceplumbing.example" }),
		).toHaveAttribute("href", "mailto:jobs@aceplumbing.example");
		expect(
			screen.getByRole("link", { name: "Manage vendors" }),
		).toHaveAttribute("href", "/maintenance/vendors");
	});

	it("clears the vendor on No vendor, and changes nothing on the same vendor", async () => {
		const user = userEvent.setup();
		render(<VendorCard request={ASSIGNED} />);
		const picker = await vendorPicker();

		await user.click(picker);
		await user.click(
			await screen.findByRole("option", { name: "Ace Plumbing · Plumbing" }),
		);
		expect(mutateAsync).not.toHaveBeenCalled();

		await user.click(picker);
		await user.click(await screen.findByRole("option", { name: "No vendor" }));
		expect(mutateAsync).toHaveBeenCalledWith({
			id: ASSIGNED.id,
			data: { vendor_id: null },
		});
	});

	it("names a vendor no longer active, with its contact details", async () => {
		vendors.current = [
			{ id: BOLT, name: "Bolt Electric", trade: "electrical" },
		];
		const user = userEvent.setup();
		render(<VendorCard request={ASSIGNED} />);
		const picker = await vendorPicker();
		expect(picker).toHaveTextContent("Ace Plumbing (inactive)");
		expect(
			screen.getByRole("link", { name: "jobs@aceplumbing.example" }),
		).toBeInTheDocument();
		await user.click(picker);
		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual([
			"No vendor",
			"Ace Plumbing (inactive)",
			"Bolt Electric · Electrical",
		]);
	});

	it("leads to the vendor list when the owner has no vendors", async () => {
		vendors.current = [];
		render(<VendorCard request={UNASSIGNED} />);
		expect(
			await screen.findByText(/You have no vendors yet\./),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Add a vendor" })).toHaveAttribute(
			"href",
			"/maintenance/vendors",
		);
		expect(screen.queryByRole("link", { name: "Manage vendors" })).toBeNull();
		expect(screen.queryByText("Phone")).toBeNull();
	});
});
