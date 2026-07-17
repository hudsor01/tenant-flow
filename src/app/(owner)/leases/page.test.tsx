/**
 * LeasesPage state-wiring tests (STATE-01 clamp + STATE-03 dialog cleanup +
 * STATE-01 selection prune). Heavy children are mocked; LeasesTable is mocked
 * to a spy so we can assert the props the page derives (paginated slice +
 * clamped page). The real leases-store singleton is driven directly.
 */
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLeasesStore } from "#stores/leases-store";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock }),
	useSearchParams: () => new URLSearchParams(),
}));

// Control the fetched dataset.
const useLeaseListMock = vi.fn();
vi.mock("#hooks/api/use-lease", () => ({
	useLeaseList: () => useLeaseListMock(),
}));

// transformLease needs a full lease shape; short-circuit to the fields the page reads.
vi.mock("#components/leases/table/lease-utils", async (orig) => ({
	...(await orig()),
	transformLease: (l: { id: string; status: string }) => ({
		id: l.id,
		status: l.status,
		// The page's sort eagerly computes every comparison, so provide the
		// fields it reads regardless of the active sortField.
		tenantName: "Tenant",
		propertyName: "Property",
		startDate: "2026-01-01",
		endDate: "2026-12-31",
		rentAmount: 1000,
		original: l,
	}),
}));

// Capture the props LeasesTable receives; render nothing.
let lastTableProps: Record<string, unknown> = {};
vi.mock("#components/leases/table/leases-table", () => ({
	LeasesTable: (props: Record<string, unknown>) => {
		lastTableProps = props;
		return null;
	},
}));

// Null out the remaining heavy children.
vi.mock("#components/leases/dialogs/leases-dialogs", () => ({
	LeasesDialogs: () => null,
}));
vi.mock("./leases-stat-cards", () => ({ LeasesStatCards: () => null }));
vi.mock("#components/bulk-import/bulk-import-dialog", () => ({
	BulkImportDialog: () => null,
}));
vi.mock("#components/leases/bulk-import-config", () => ({
	leaseBulkImportConfig: () => ({}),
}));

function seedLeases(count: number) {
	const data = Array.from({ length: count }, (_, i) => ({
		id: `lease-${i}`,
		status: "active",
	}));
	useLeaseListMock.mockReturnValue({
		data: { data, total: count },
		isLoading: false,
		error: null,
	});
}

async function renderPage() {
	const { default: LeasesPage } = await import("./page");
	return render(<LeasesPage />);
}

describe("LeasesPage state wiring", () => {
	afterEach(() => {
		cleanup();
		useLeasesStore.getState().reset();
		vi.clearAllMocks();
	});

	it("STATE-01: clamps a stale out-of-range page so the slice is never empty", async () => {
		seedLeases(3); // one page (itemsPerPage is well above 3)
		useLeasesStore.setState({ currentPage: 2 }); // stale stored page
		await renderPage();

		// The paginated slice uses effectivePage (1), not the raw stored page (2),
		// so rows render instead of an empty stranded page.
		expect((lastTableProps.paginatedLeases as unknown[]).length).toBe(3);
		expect(lastTableProps.currentPage).toBe(1);

		// The write-back effect reconciles the store to the clamped page.
		await waitFor(() => expect(useLeasesStore.getState().currentPage).toBe(1));
	});

	it("STATE-01: does NOT prune during the loading render (preserves a cross-nav selection)", async () => {
		// Page remounts with isLoading=true and an empty list (query GC'd) while
		// the singleton still holds the prior selection — must not wipe it.
		useLeaseListMock.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});
		useLeasesStore.setState({ selectedRows: new Set(["lease-0", "lease-1"]) });
		await renderPage();

		// Give effects a chance to run; the selection must survive.
		await Promise.resolve();
		expect(useLeasesStore.getState().selectedRows.size).toBe(2);
	});

	it("STATE-01: preserves a valid stored page across a cold (isLoading) remount", async () => {
		// Cold SPA return: isLoading=true, no data yet, but the user was on page 2.
		useLeaseListMock.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});
		useLeasesStore.setState({ currentPage: 2 });
		await renderPage();

		// The write-back effect must NOT collapse the stored page to 1 while
		// loading — the position is restored once the real data arrives.
		await Promise.resolve();
		expect(useLeasesStore.getState().currentPage).toBe(2);
	});

	it("STATE-01: prunes a phantom selected id absent from the fetched list", async () => {
		seedLeases(2);
		useLeasesStore.setState({
			selectedRows: new Set(["lease-0", "ghost-deleted"]),
		});
		await renderPage();

		await waitFor(() => {
			const sel = useLeasesStore.getState().selectedRows;
			expect(sel.has("ghost-deleted")).toBe(false);
			expect(sel.has("lease-0")).toBe(true);
		});
	});

	it("STATE-03: resets dialog state on unmount (no back/forward auto-reopen)", async () => {
		seedLeases(1);
		useLeasesStore.setState({
			selectedLeaseId: "lease-0",
			showRenewDialog: true,
		});
		const view = await renderPage();
		view.unmount();

		const s = useLeasesStore.getState();
		expect(s.showRenewDialog).toBe(false);
		expect(s.showTerminateDialog).toBe(false);
		expect(s.selectedLeaseId).toBeNull();
	});
});
