/**
 * @vitest-environment jsdom
 * Sheet parts after the new-york-v4 sync (research H10, the D-46 prerequisite).
 *
 * Every part carries its upstream data-slot before the props spread, so a consumer data-slot (the
 * canonical sidebar's `sidebar`) wins on the dialog element. SheetContent's corner close renders by
 * default, is named "Close" by its aria-label and keeps the 44px target; `showCloseButton={false}`
 * removes it. SheetClose wraps the Radix close.
 */

import { fireEvent, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import {
	Sheet,
	SheetClose,
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
	onOpenChange?: (open: boolean) => void,
) {
	return render(
		<Sheet open onOpenChange={onOpenChange}>
			<SheetTrigger>Open sheet</SheetTrigger>
			<SheetContent side="left" {...contentProps}>
				<SheetHeader>
					<SheetTitle>Probe sheet</SheetTitle>
					<SheetDescription>Probe description</SheetDescription>
				</SheetHeader>
				<SheetFooter>
					<SheetClose>Done</SheetClose>
				</SheetFooter>
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

	it("drops the corner close when showCloseButton is false", () => {
		renderSheet({ showCloseButton: false });

		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
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

	it("tags SheetClose and closes the sheet through onOpenChange", () => {
		const onOpenChange = vi.fn();
		renderSheet({}, onOpenChange);

		const done = screen.getByRole("button", { name: "Done" });
		expect(done.dataset.slot).toBe("sheet-close");
		fireEvent.click(done);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
