/**
 * EditMaintenanceModal (Intercepting Route) tests
 *
 * DASH-07: correct nesting `(.)maintenance/[id]/edit` with sibling-parity
 * heading; MaintenanceForm handles its own back-navigation on success.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// React's `use()` returns synchronously when the thenable already carries
// `status`/`value`, so tests avoid Suspense-resolution flakiness in jsdom.
function resolvedParams<T>(value: T): Promise<T> {
	const p = Promise.resolve(value) as Promise<T> & {
		status: string;
		value: T;
	};
	p.status = "fulfilled";
	p.value = value;
	return p;
}

const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: mockBack }),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));

const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();
	return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

vi.mock("#components/ui/route-modal", () => ({
	RouteModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const maintenanceFormProps = vi.fn();
vi.mock("#components/maintenance/maintenance-form.client", () => ({
	MaintenanceForm: (props: { mode: string; request?: unknown }) => {
		maintenanceFormProps(props);
		return <div>maintenance-form</div>;
	},
}));

import EditMaintenanceModal from "./page";

function renderModal(id: string) {
	return render(<EditMaintenanceModal params={resolvedParams({ id })} />);
}

describe("EditMaintenanceModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the parity heading and MaintenanceForm with the loaded request", async () => {
		const request = { id: "req-1", title: "Leaky faucet" };
		useQueryMock.mockReturnValue({
			data: request,
			isLoading: false,
			error: null,
		});
		renderModal("req-1");
		expect(
			await screen.findByText("Edit maintenance request"),
		).toBeInTheDocument();
		expect(screen.getByText("maintenance-form")).toBeInTheDocument();
		expect(maintenanceFormProps).toHaveBeenCalledWith(
			expect.objectContaining({ mode: "edit", request }),
		);
	});

	it("renders a skeleton while loading (no form)", async () => {
		useQueryMock.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});
		renderModal("req-1");
		expect(
			await screen.findByText("Edit maintenance request"),
		).toBeInTheDocument();
		expect(screen.queryByText("maintenance-form")).not.toBeInTheDocument();
	});
});
