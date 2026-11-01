/**
 * @vitest-environment jsdom
 * Tenant table sort headers (66.2-39 F2).
 *
 * - Every sort chevron (the inactive ChevronsUpDown and the active ChevronUp /
 *   ChevronDown) is `shrink-0`, so a narrow column at 390px squeezes the
 *   title, never the 16px icon.
 * - The SortableHeader button is `type="button"`, so it can never submit an
 *   enclosing form.
 * - `aria-sort` sits on the `<th role="columnheader">`, the element whose role
 *   supports it, and follows the sort cycle none -> ascending -> descending.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { TenantItem } from "#types/sections/tenants";
import { TenantTable } from "../tenant-table";
import { SortableHeader } from "../tenant-table-helpers";

function sortIcons(button: HTMLElement): SVGElement[] {
	return Array.from(button.querySelectorAll("svg"));
}

describe("SortableHeader", () => {
	it.each([
		["inactive", "email", null],
		["ascending", "fullName", "asc"],
		["descending", "fullName", "desc"],
	] as const)(
		"keeps the %s chevron from shrinking",
		(_state, current, direction) => {
			render(
				<SortableHeader
					title="Name"
					field="fullName"
					currentSort={current}
					currentDirection={direction}
					onSort={() => undefined}
				/>,
			);
			const button = screen.getByRole("button", { name: "Name" });
			const icons = sortIcons(button);
			expect(icons).toHaveLength(1);
			expect(icons[0]?.getAttribute("class")).toContain("shrink-0");
		},
	);

	it("is a type=button control", () => {
		render(
			<SortableHeader
				title="Name"
				field="fullName"
				currentSort={null}
				currentDirection={null}
				onSort={() => undefined}
			/>,
		);
		expect(screen.getByRole("button", { name: "Name" })).toHaveAttribute(
			"type",
			"button",
		);
	});
});

describe("TenantTable aria-sort", () => {
	it("puts aria-sort on the column header and follows the sort cycle", async () => {
		const user = userEvent.setup();
		const tenants: TenantItem[] = [];
		render(
			<TenantTable
				tenants={tenants}
				selectedIds={new Set()}
				onSelectChange={() => undefined}
				onSelectAll={() => undefined}
				onDeselectAll={() => undefined}
				onView={() => undefined}
				onEdit={() => undefined}
				onDelete={() => undefined}
				onViewLease={() => undefined}
			/>,
		);
		const button = screen.getByRole("button", { name: "Name" });
		const header = button.closest("th");
		expect(header).toHaveAttribute("role", "columnheader");
		expect(header).toHaveAttribute("aria-sort", "none");
		expect(button).not.toHaveAttribute("aria-sort");
		await user.click(button);
		expect(header).toHaveAttribute("aria-sort", "ascending");
		await user.click(button);
		expect(header).toHaveAttribute("aria-sort", "descending");
	});
});
