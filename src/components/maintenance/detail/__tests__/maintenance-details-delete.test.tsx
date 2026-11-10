/**
 * A maintenance request's Delete Request asks through the app's ConfirmDialog,
 * not the browser's `confirm()` (66.2-39 fix round 4, Part 8g). The button
 * only opens it, naming the request; the hard delete (its expenses and photos
 * go with it, by cascade) runs only from its Delete request, and the page
 * leaves for the list only once the delete succeeded.
 *
 * @vitest-environment jsdom
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import { render } from "#test/utils/test-render";

const { mockFrom, mockDelete, mockPush } = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockDelete: vi.fn(),
	mockPush: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));
vi.mock("next/navigation", () => {
	const router = { push: mockPush, replace: vi.fn(), refresh: vi.fn() };
	return {
		useRouter: () => router,
		usePathname: () => "/maintenance/req-1",
		useSearchParams: () => new URLSearchParams(),
		useParams: () => ({}),
	};
});
vi.mock("#hooks/api/use-maintenance", () => {
	const mutation = { mutateAsync: mockDelete, isPending: false };
	return { useDeleteMaintenanceRequest: () => mutation };
});
vi.mock("../photos-card", () => ({ PhotosCard: () => null }));
vi.mock("../expenses-card", () => ({ ExpensesCard: () => null }));
vi.mock("../schedule-dialog", () => ({ ScheduleDialog: () => null }));
vi.mock("../status-select", () => ({ StatusSelect: () => null }));
vi.mock("#components/documents/documents-section", () => ({
	DocumentsSection: () => null,
}));

import { MaintenanceDetails } from "../maintenance-details.client";

const DETAIL_ROW = {
	id: "req-1",
	owner_user_id: "owner-1",
	unit_id: "unit-1",
	tenant_id: "7c0ffee0-0000-4000-8000-000000000001",
	title: "Heater makes noise",
	description: "Reported on the phone; needs a visit this week.",
	priority: "medium",
	status: "open",
	vendor_id: null,
	requested_by: null,
	assigned_to: null,
	estimated_cost: null,
	scheduled_date: null,
	completed_at: null,
	inspection_date: null,
	inspection_findings: null,
	inspector_id: null,
	created_at: "2026-10-01T00:00:00Z",
	updated_at: "2026-10-01T00:00:00Z",
	units: {
		unit_number: "2B",
		property_id: "p-2",
		properties: { name: "Gamma Flats", status: "active" },
	},
	tenant: {
		name: null,
		first_name: "Sam",
		last_name: "Lee",
		email: "sam@example.com",
		phone: null,
	},
};

async function renderPage() {
	render(
		<Suspense fallback={null}>
			<MaintenanceDetails id="req-1" />
		</Suspense>,
	);
	return screen.findByRole("button", { name: "Delete Request" });
}

describe("MaintenanceDetails delete confirmation", () => {
	beforeEach(() => {
		mockFrom.mockReset();
		mockDelete.mockReset().mockResolvedValue(undefined);
		mockPush.mockReset();
		mockFrom.mockImplementation((table: string) =>
			table === "maintenance_requests"
				? createQueryChain({ data: DETAIL_ROW, error: null })
				: createQueryChain({ data: [], error: null, count: 0 }),
		);
	});

	it("opens the confirmation on Delete Request, and deletes nothing", async () => {
		await userEvent.click(await renderPage());
		const dialog = screen.getByRole("alertdialog");
		expect(
			within(dialog).getByText('Delete request "Heater makes noise"?'),
		).toBeVisible();
		expect(
			within(dialog).getByText(
				"This permanently deletes the maintenance request with its expenses and photos. This can't be undone.",
			),
		).toBeVisible();
		expect(mockDelete).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("deletes once from the confirmation's Delete request, then leaves for the list", async () => {
		await userEvent.click(await renderPage());
		await userEvent.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "Delete request",
			}),
		);
		expect(mockDelete).toHaveBeenCalledTimes(1);
		expect(mockDelete).toHaveBeenCalledWith("req-1");
		await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/maintenance"));
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("deletes nothing on Cancel", async () => {
		await userEvent.click(await renderPage());
		await userEvent.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "Cancel",
			}),
		);
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		expect(mockDelete).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("stays on the request when the delete fails", async () => {
		mockDelete.mockRejectedValueOnce(new Error("rejected"));
		await userEvent.click(await renderPage());
		await userEvent.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "Delete request",
			}),
		);
		await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		expect(mockPush).not.toHaveBeenCalled();
		expect(screen.getByText("Heater makes noise")).toBeInTheDocument();
	});
});
