/**
 * Accessibility tests for TenantToolbar (A11Y-02)
 *
 * Proves the placeholder-only search <input> and the unlabeled status
 * <select> expose programmatic accessible names via aria-label, so that
 * assistive tech (and the axe "label" rule) can identify the controls.
 *
 * These getByRole({ name }) queries resolve ONLY if the aria-label
 * association is correct — they fail if the accessible name regresses.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TenantToolbar } from "#components/tenants/tenant-toolbar";

describe("TenantToolbar accessibility (A11Y-02)", () => {
	function renderToolbar() {
		return render(
			<TenantToolbar
				searchQuery=""
				onSearchChange={vi.fn()}
				statusFilter="all"
				onStatusFilterChange={vi.fn()}
				viewMode="table"
				onViewModeChange={vi.fn()}
				filteredCount={0}
			/>,
		);
	}

	it("exposes an accessible name for the search input", () => {
		renderToolbar();
		expect(
			screen.getByRole("textbox", { name: /search tenants/i }),
		).toBeInTheDocument();
	});

	it("exposes an accessible name for the status filter select", () => {
		renderToolbar();
		expect(
			screen.getByRole("combobox", { name: /filter by status/i }),
		).toBeInTheDocument();
	});
});
