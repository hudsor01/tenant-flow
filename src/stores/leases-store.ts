/**
 * Leases Store - Leases Page State Management
 *
 * Consolidates useState calls from the leases page to prevent
 * excessive re-renders on filter changes.
 *
 * State categories:
 * - Filters: search, status filter
 * - Sorting: field, direction
 * - Pagination: current page
 * - Selection: selected row IDs (reconciled against fetched data)
 * - Dialogs: selected lease ID, dialog visibility states
 */

import { create } from "zustand";
import type {
	SortDirection,
	SortField,
} from "#components/leases/table/lease-utils";

export type StatusFilter =
	| "all"
	| "active"
	| "expiring"
	| "pending_signature"
	| "expired"
	| "ended"
	| "terminated"
	| "draft";

export interface LeasesState {
	// Tab state (note: synced with URL in component)
	activeTab: string;

	// Filter state
	searchQuery: string;
	statusFilter: StatusFilter;

	// Sort state
	sortField: SortField;
	sortDirection: SortDirection;

	// Pagination state
	currentPage: number;
	itemsPerPage: number;

	// Selection state (reconciled against fetched data via pruneSelection)
	selectedRows: Set<string>;

	// Dialog state — id only; entity is derived from the query-backed list
	selectedLeaseId: string | null;
	showRenewDialog: boolean;
	showTerminateDialog: boolean;
}

export interface LeasesActions {
	// Tab actions
	setActiveTab: (tab: string) => void;

	// Filter actions
	setSearchQuery: (query: string) => void;
	setStatusFilter: (filter: StatusFilter) => void;
	clearFilters: () => void;

	// Sort actions
	setSortField: (field: SortField) => void;
	setSortDirection: (direction: SortDirection) => void;
	toggleSort: (field: SortField) => void;

	// Pagination actions
	setCurrentPage: (page: number) => void;
	resetPagination: () => void;

	// Selection actions
	toggleSelectAll: (allIds: string[]) => void;
	toggleSelect: (id: string) => void;
	clearSelection: () => void;

	/**
	 * Reconcile selected rows against a valid id set.
	 * Returns the SAME state object when nothing was removed (no-op guard
	 * against render loops).
	 */
	pruneSelection: (validIds: string[]) => void;

	// Dialog actions — operate on id only
	openRenewDialog: (leaseId: string) => void;
	openTerminateDialog: (leaseId: string) => void;
	closeRenewDialog: () => void;
	closeTerminateDialog: () => void;
	closeAllDialogs: () => void;

	// Reset store
	reset: () => void;
}

const initialState: LeasesState = {
	activeTab: "overview",
	searchQuery: "",
	statusFilter: "all",
	sortField: "endDate",
	sortDirection: "asc",
	currentPage: 1,
	itemsPerPage: 10,
	selectedRows: new Set(),
	selectedLeaseId: null,
	showRenewDialog: false,
	showTerminateDialog: false,
};

export const useLeasesStore = create<LeasesState & LeasesActions>(
	(set, get) => ({
		...initialState,

		// Tab actions
		setActiveTab: (tab) => set({ activeTab: tab }),

		// Filter actions
		setSearchQuery: (query) => {
			set({ searchQuery: query, currentPage: 1 });
		},

		setStatusFilter: (filter) => {
			set({ statusFilter: filter, currentPage: 1 });
		},

		clearFilters: () => {
			set({
				searchQuery: "",
				statusFilter: "all",
				currentPage: 1,
			});
		},

		// Sort actions
		setSortField: (field) => set({ sortField: field }),

		setSortDirection: (direction) => set({ sortDirection: direction }),

		toggleSort: (field) => {
			const { sortField, sortDirection } = get();
			if (sortField === field) {
				set({ sortDirection: sortDirection === "asc" ? "desc" : "asc" });
			} else {
				set({ sortField: field, sortDirection: "asc" });
			}
		},

		// Pagination actions
		setCurrentPage: (page) => set({ currentPage: page }),

		resetPagination: () => set({ currentPage: 1 }),

		// Selection actions
		toggleSelectAll: (allIds) => {
			const { selectedRows } = get();
			if (selectedRows.size === allIds.length) {
				set({ selectedRows: new Set() });
			} else {
				set({ selectedRows: new Set(allIds) });
			}
		},

		toggleSelect: (id) => {
			const { selectedRows } = get();
			const newSelected = new Set(selectedRows);
			if (newSelected.has(id)) {
				newSelected.delete(id);
			} else {
				newSelected.add(id);
			}
			set({ selectedRows: newSelected });
		},

		clearSelection: () => set({ selectedRows: new Set() }),

		// Selection reconciliation (STATE-01/05/12 class fix)
		pruneSelection: (validIds) => {
			const { selectedRows } = get();
			const pruned = new Set(
				Array.from(selectedRows).filter((id) => validIds.includes(id)),
			);
			if (pruned.size === selectedRows.size) {
				return; // no-op guard: return same state object
			}
			set({ selectedRows: pruned });
		},

		// Dialog actions — id-only (STATE-03: entity derived from query cache)
		openRenewDialog: (leaseId) => {
			set({ selectedLeaseId: leaseId, showRenewDialog: true });
		},

		openTerminateDialog: (leaseId) => {
			set({ selectedLeaseId: leaseId, showTerminateDialog: true });
		},

		closeRenewDialog: () => {
			set({ showRenewDialog: false, selectedLeaseId: null });
		},

		closeTerminateDialog: () => {
			set({ showTerminateDialog: false, selectedLeaseId: null });
		},

		closeAllDialogs: () => {
			set({
				showRenewDialog: false,
				showTerminateDialog: false,
				selectedLeaseId: null,
			});
		},

		// Reset store
		reset: () => set(initialState),
	}),
);
