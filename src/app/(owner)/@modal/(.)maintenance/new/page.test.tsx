/**
 * NewMaintenanceModal (Intercepting Route) tests
 *
 * DASH-02: hoisted maintenance new modal renders inside the (owner) @modal
 * slot with sibling-parity heading. MaintenanceForm handles its own
 * router.back() on success, so no onSuccess wiring is passed here.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#components/ui/route-modal", () => ({
	RouteModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const maintenanceFormProps = vi.fn();
vi.mock("#components/maintenance/maintenance-form.client", () => ({
	MaintenanceForm: (props: { mode: string; onSuccess?: () => void }) => {
		maintenanceFormProps(props);
		return <div>maintenance-form</div>;
	},
}));

import NewMaintenanceModal from "./page";

describe("NewMaintenanceModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the parity heading and MaintenanceForm in create mode", () => {
		render(<NewMaintenanceModal />);
		expect(screen.getByText("New maintenance request")).toBeInTheDocument();
		expect(screen.getByText("maintenance-form")).toBeInTheDocument();
		expect(maintenanceFormProps).toHaveBeenCalledWith(
			expect.objectContaining({ mode: "create" }),
		);
	});

	it("does not pass an onSuccess prop (form back-navigates internally)", () => {
		render(<NewMaintenanceModal />);
		const props = maintenanceFormProps.mock.calls[0]?.[0] as {
			onSuccess?: () => void;
		};
		expect(props.onSuccess).toBeUndefined();
	});
});
