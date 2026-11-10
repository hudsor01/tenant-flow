/**
 * @vitest-environment jsdom
 * A box that scrolls takes a tab stop while it scrolls (66.2-39 fix round 4,
 * Part 8h; WCAG 2.1.1).
 *
 * A table wider than its box, with no control inside, left a keyboard user
 * no way to scroll it: axe's scrollable-region-focusable failed the lease
 * ledger, the property performance tables, the bulk import preview and three
 * public tables. The table container (and those boxes) take `tabIndex={0}`
 * while their content overflows, and no tab stop while it fits.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollRegion } from "#components/ui/scroll-region";
import { Table, TableBody, TableCell, TableRow } from "#components/ui/table";

function size(scrollWidth: number, clientWidth: number) {
	vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(
		scrollWidth,
	);
	vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
		clientWidth,
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("ScrollRegion", () => {
	it("is a tab stop while its content overflows", () => {
		size(640, 320);
		render(<ScrollRegion data-testid="box">wide</ScrollRegion>);
		expect(screen.getByTestId("box")).toHaveAttribute("tabindex", "0");
	});

	it("is no tab stop while its content fits", () => {
		size(320, 320);
		render(<ScrollRegion data-testid="box">fits</ScrollRegion>);
		expect(screen.getByTestId("box")).not.toHaveAttribute("tabindex");
	});

	it("is the table's container", () => {
		size(640, 320);
		render(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>$1,234,567.00</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		);
		const container = document.querySelector('[data-slot="table-container"]');
		expect(container).toHaveAttribute("tabindex", "0");
	});
});
