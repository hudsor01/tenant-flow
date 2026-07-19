/**
 * Tenants state-wiring tests (STATE-12): the prune effect reconciles the
 * selection against the fetched list, and the bulk-delete guard passes only
 * still-listed ids to onBulkDelete. Heavy children are mocked; TenantActionBar
 * is mocked to expose its onDelete so the guard can be invoked directly.
 */
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTenantsStore } from "#stores/tenants-store";
import type { TenantItem } from "#types/sections/tenants";

let actionBarProps: Record<string, unknown> = {};
vi.mock("../tenant-action-bar", () => ({
	TenantActionBar: (props: Record<string, unknown>) => {
		actionBarProps = props;
		return null;
	},
}));
vi.mock("../tenant-detail-sheet", () => ({ TenantDetailSheet: () => null }));
vi.mock("../tenant-grid", () => ({ TenantGrid: () => null }));
vi.mock("../tenant-quick-actions", () => ({ TenantQuickActions: () => null }));
vi.mock("../tenant-stats", () => ({ TenantStats: () => null }));
vi.mock("../tenant-table", () => ({ TenantTable: () => null }));
vi.mock("../tenant-toolbar", () => ({ TenantToolbar: () => null }));
vi.mock("#components/bulk-import/bulk-import-dialog", () => ({
	BulkImportDialog: () => null,
}));

function tenant(id: string): TenantItem {
	return {
		id,
		fullName: `Tenant ${id}`,
		email: `${id}@example.com`,
		leaseStatus: "active",
	} as TenantItem;
}

async function renderTenants(tenants: TenantItem[], onBulkDelete = vi.fn()) {
	const { Tenants } = await import("../tenants");
	const view = render(
		<Tenants
			tenants={tenants}
			onViewTenant={vi.fn()}
			onEditTenant={vi.fn()}
			onContactTenant={vi.fn()}
			onViewLease={vi.fn()}
			onDeleteTenant={vi.fn()}
			onBulkDelete={onBulkDelete}
		/>,
	);
	return { view, onBulkDelete };
}

describe("Tenants state wiring (STATE-12)", () => {
	afterEach(() => {
		cleanup();
		useTenantsStore.getState().reset();
		vi.clearAllMocks();
	});

	it("prunes a phantom selected id absent from the fetched list", async () => {
		useTenantsStore.setState({ selectedIds: new Set(["t1", "ghost"]) });
		await renderTenants([tenant("t1")]);
		await waitFor(() => {
			const sel = useTenantsStore.getState().selectedIds;
			expect(sel.has("ghost")).toBe(false);
			expect(sel.has("t1")).toBe(true);
		});
	});

	it("bulk delete passes only still-listed ids to onBulkDelete", async () => {
		const onBulkDelete = vi.fn();
		// Seed before render so the captured handler closes over the selection;
		// both ids are listed, so the prune effect keeps them.
		useTenantsStore.setState({ selectedIds: new Set(["t1", "t2"]) });
		await renderTenants([tenant("t1"), tenant("t2")], onBulkDelete);
		(actionBarProps.onDelete as () => void)();
		expect(onBulkDelete).toHaveBeenCalledTimes(1);
		expect((onBulkDelete.mock.calls[0]?.[0] as string[])?.sort()).toEqual([
			"t1",
			"t2",
		]);
	});
});
