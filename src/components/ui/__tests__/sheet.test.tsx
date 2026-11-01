/**
 * @vitest-environment jsdom
 * Sheet parts after the new-york-v4 sync (research H10, the D-46 prerequisite).
 *
 * Every part carries its upstream data-slot before the props spread, so a consumer data-slot (the
 * canonical sidebar's `sidebar`) wins on the dialog element. SheetContent's corner close always
 * renders as a direct child button of the dialog (the target of the sidebar's D-46
 * `[&>button]:hidden`), is named "Close" by its aria-label and keeps the 44px target. Upstream's
 * `SheetClose` export (trimmed in Phase 19, D-26) and `showCloseButton` prop (no caller) are not
 * adopted.
 */

import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";

import * as sheetModule from "#components/ui/sheet";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "#components/ui/sheet";
import { render } from "#test/utils/test-render";

function renderSheet(
	contentProps: Partial<ComponentProps<typeof SheetContent>> = {},
) {
	return render(
		<Sheet open>
			<SheetTrigger>Open sheet</SheetTrigger>
			<SheetContent side="left" {...contentProps}>
				<SheetHeader>
					<SheetTitle>Probe sheet</SheetTitle>
					<SheetDescription>Probe description</SheetDescription>
				</SheetHeader>
				<SheetFooter>Probe footer</SheetFooter>
			</SheetContent>
		</Sheet>,
	);
}

describe("Sheet", () => {
	it("renders the upstream data-slots on every part", () => {
		renderSheet();

		const dialog = screen.getByRole("dialog");
		expect(dialog.dataset.slot).toBe("sheet-content");
		for (const slot of [
			"sheet-overlay",
			"sheet-header",
			"sheet-title",
			"sheet-description",
			"sheet-footer",
		]) {
			expect(document.querySelectorAll(`[data-slot="${slot}"]`)).toHaveLength(
				1,
			);
		}
		expect(screen.getByText("Open sheet").dataset.slot).toBe("sheet-trigger");
	});

	it("renders one labelled 44px close by default, with no sr-only duplicate", () => {
		renderSheet();

		const close = screen.getByRole("button", { name: "Close" });
		expect(close.classList.contains("min-h-11")).toBe(true);
		expect(close.classList.contains("min-w-11")).toBe(true);
		expect(close.querySelector(".sr-only")).toBeNull();
		expect(screen.queryByText("Close dialog")).toBeNull();
	});

	it("renders the corner close as a direct child button of the dialog", () => {
		renderSheet();

		const dialog = screen.getByRole("dialog");
		const close = screen.getByRole("button", { name: "Close" });
		expect(close.parentElement).toBe(dialog);
		expect(dialog.querySelectorAll(":scope > button")).toHaveLength(1);
	});

	it("exports no SheetClose (Phase 19 trim, D-26)", () => {
		expect(Object.keys(sheetModule).sort()).toEqual([
			"Sheet",
			"SheetContent",
			"SheetDescription",
			"SheetFooter",
			"SheetHeader",
			"SheetTitle",
			"SheetTrigger",
		]);
	});

	it("lets a consumer data-slot win on the dialog element", () => {
		render(
			<Sheet open>
				<SheetContent side="left" data-slot="sidebar">
					<SheetTitle>Probe sheet</SheetTitle>
					<SheetDescription>Probe description</SheetDescription>
				</SheetContent>
			</Sheet>,
		);

		expect(screen.getByRole("dialog").dataset.slot).toBe("sidebar");
	});
});
