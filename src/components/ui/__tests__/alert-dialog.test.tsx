/**
 * @vitest-environment jsdom
 * AlertDialog Action and Cancel after the new-york-v4 sync (ledger C14, C16).
 *
 * C14: both parts render through `<Button variant size asChild>` and carry the upstream
 * `alert-dialog-action` / `alert-dialog-cancel` data-slots, which win over Button's `button` slot
 * because Radix Slot lets the child's own props override the slot's. `data-variant` and
 * `data-size` come from Button.
 *
 * C16: destructive confirmations use `variant="destructive"` instead of overriding the default
 * variant's colors, so their token set is the destructive Button's. Against the legacy
 * composition the only differences are the destructive Button's own tokens
 * (`DESTRUCTIVE_DELTA`): VD-19's dark fill and destructive focus ring, and 66.2-39 part F's
 * light and dark hovers.
 *
 * Radix Slot joins the child className onto the Button's classes with a plain string
 * concatenation, without twMerge. A className passed to Action or Cancel is therefore appended
 * unmerged: the `flex-1` passthrough keeps the Button base `shrink-0`, which the legacy twMerged
 * composition dropped (`FLEX1_PASSTHROUGH_DELTA`).
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { buttonVariants } from "#components/ui/button";
import { ConfirmDialog } from "#components/ui/confirm-dialog";
import { cn } from "#lib/utils";
import { render } from "#test/utils/test-render";

const LEGACY_DESTRUCTIVE =
	"bg-destructive text-destructive-foreground hover:bg-destructive/90";

// Signed symmetric difference, sorted: "+" = only on the current destructive Action,
// "-" = only on the legacy `cn(buttonVariants(), LEGACY_DESTRUCTIVE)` composition.
// VD-19: the dark fill and the destructive focus ring (+dark:bg-destructive/60,
// +focus-visible:ring-destructive-text, -focus-visible:ring-ring; fix round 4,
// Part 5b made both rings opaque). Part F: the light and dark hovers
// (+hover:bg-destructive-text, -hover:bg-destructive/90, +dark:hover:bg-destructive/90,
// -dark:hover:bg-primary/90).
const DESTRUCTIVE_DELTA = [
	"+dark:bg-destructive/60",
	"+dark:hover:bg-destructive/90",
	"+focus-visible:ring-destructive-text",
	"+hover:bg-destructive-text",
	"-dark:hover:bg-primary/90",
	"-focus-visible:ring-ring",
	"-hover:bg-destructive/90",
];

// Same signing, against the legacy `cn(buttonVariants({ variant }), "flex-1")` compositions.
const FLEX1_PASSTHROUGH_DELTA = ["+shrink-0"];

function tokens(className: string | null): string[] {
	return [...new Set((className ?? "").split(/\s+/).filter(Boolean))].sort();
}

function signedDelta(current: string[], legacy: string[]): string[] {
	const added = current.filter((t) => !legacy.includes(t)).map((t) => `+${t}`);
	const removed = legacy
		.filter((t) => !current.includes(t))
		.map((t) => `-${t}`);
	return [...added, ...removed].sort();
}

function renderOpen(children: ReactNode) {
	return render(
		<AlertDialog defaultOpen>
			<AlertDialogContent>
				<AlertDialogTitle>t</AlertDialogTitle>
				<AlertDialogDescription>d</AlertDialogDescription>
				<AlertDialogFooter>{children}</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>,
	);
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

describe("alert-dialog parts", () => {
	it("action default", () => {
		renderOpen(<AlertDialogAction>Go</AlertDialogAction>);
		const action = button("Go");
		expect(action).toHaveAttribute("data-slot", "alert-dialog-action");
		expect(action).toHaveAttribute("data-variant", "default");
		expect(action).toHaveAttribute("data-size", "default");
		const rendered = tokens(action.getAttribute("class"));
		expect(rendered).toEqual(
			tokens(cn(buttonVariants({ variant: "default", size: "default" }))),
		);
		expect(rendered).toEqual(tokens(cn(buttonVariants())));
	});

	it("cancel default", () => {
		renderOpen(<AlertDialogCancel>Back</AlertDialogCancel>);
		const cancel = button("Back");
		expect(cancel).toHaveAttribute("data-slot", "alert-dialog-cancel");
		expect(cancel).toHaveAttribute("data-variant", "outline");
		expect(cancel).toHaveAttribute("data-size", "default");
		const rendered = tokens(cancel.getAttribute("class"));
		expect(rendered).toEqual(
			tokens(cn(buttonVariants({ variant: "outline", size: "default" }))),
		);
		expect(rendered).toEqual(
			tokens(cn(buttonVariants({ variant: "outline" }))),
		);
	});

	it("destructive action", () => {
		renderOpen(
			<AlertDialogAction variant="destructive">Delete</AlertDialogAction>,
		);
		const action = button("Delete");
		expect(action).toHaveAttribute("data-slot", "alert-dialog-action");
		expect(action).toHaveAttribute("data-variant", "destructive");
		const rendered = tokens(action.getAttribute("class"));
		expect(rendered).toEqual(
			tokens(cn(buttonVariants({ variant: "destructive", size: "default" }))),
		);
		const legacy = tokens(cn(buttonVariants(), LEGACY_DESTRUCTIVE));
		const delta = signedDelta(rendered, legacy);
		// VD-19 adds the dark fill and the ring tokens; 66.2-39 part F moves the
		// light hover from destructive/90 (4.39:1) to destructive-text (6.38:1)
		// and the dark hover from primary/90 to destructive/90.
		const PART_F_HOVER = new Set([
			"hover:bg-destructive-text",
			"hover:bg-destructive/90",
		]);
		for (const entry of delta) {
			const token = entry.slice(1);
			expect(
				token.startsWith("dark:") ||
					token.startsWith("focus-visible:ring-") ||
					PART_F_HOVER.has(token),
			).toBe(true);
		}
		expect(delta).toEqual(DESTRUCTIVE_DELTA);
	});

	it("className passthrough", () => {
		renderOpen(
			<>
				<AlertDialogCancel className="flex-1">Back</AlertDialogCancel>
				<AlertDialogAction variant="destructive" className="flex-1">
					Delete
				</AlertDialogAction>
			</>,
		);
		const action = tokens(button("Delete").getAttribute("class"));
		const cancel = tokens(button("Back").getAttribute("class"));
		expect(action).toEqual(
			tokens(
				`${cn(buttonVariants({ variant: "destructive", size: "default" }))} flex-1`,
			),
		);
		expect(cancel).toEqual(
			tokens(
				`${cn(buttonVariants({ variant: "outline", size: "default" }))} flex-1`,
			),
		);
		expect(
			signedDelta(
				action,
				tokens(cn(buttonVariants({ variant: "destructive" }), "flex-1")),
			),
		).toEqual(FLEX1_PASSTHROUGH_DELTA);
		expect(
			signedDelta(
				cancel,
				tokens(cn(buttonVariants({ variant: "outline" }), "flex-1")),
			),
		).toEqual(FLEX1_PASSTHROUGH_DELTA);
	});

	it("size", () => {
		renderOpen(<AlertDialogAction size="sm">Go</AlertDialogAction>);
		const action = button("Go");
		expect(action).toHaveAttribute("data-size", "sm");
		expect(tokens(action.getAttribute("class"))).toEqual(
			tokens(cn(buttonVariants({ variant: "default", size: "sm" }))),
		);
	});

	it("asChild renders one button", () => {
		renderOpen(
			<>
				<AlertDialogCancel>Back</AlertDialogCancel>
				<AlertDialogAction>Go</AlertDialogAction>
			</>,
		);
		const dialog = screen.getByRole("alertdialog");
		expect(dialog.querySelectorAll("button button")).toHaveLength(0);
		expect(button("Go")).toBeInstanceOf(HTMLButtonElement);
		expect(button("Back")).toBeInstanceOf(HTMLButtonElement);
	});

	it("action closes", async () => {
		const onAction = vi.fn();
		renderOpen(
			<>
				<AlertDialogCancel>Back</AlertDialogCancel>
				<AlertDialogAction onClick={onAction}>Go</AlertDialogAction>
			</>,
		);
		await userEvent.click(button("Go"));
		expect(onAction).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("cancel closes without confirming", async () => {
		const onAction = vi.fn();
		renderOpen(
			<>
				<AlertDialogCancel>Back</AlertDialogCancel>
				<AlertDialogAction onClick={onAction}>Go</AlertDialogAction>
			</>,
		);
		await userEvent.click(button("Back"));
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(onAction).toHaveBeenCalledTimes(0);
	});

	it("disabled reaches the DOM", () => {
		renderOpen(<AlertDialogAction disabled>Go</AlertDialogAction>);
		expect(button("Go")).toBeDisabled();
	});
});

describe("ConfirmDialog variant forwarding", () => {
	function renderConfirm(
		props: Partial<{
			confirmVariant: "default" | "destructive";
			loading: boolean;
		}> = {},
	) {
		return render(
			<ConfirmDialog
				open
				onOpenChange={vi.fn()}
				title="Remove item"
				description="This cannot be undone."
				confirmText="Remove"
				onConfirm={vi.fn()}
				{...props}
			/>,
		);
	}

	it("defaults to the destructive variant", () => {
		renderConfirm();
		const confirm = button("Remove");
		expect(confirm).toHaveAttribute("data-slot", "alert-dialog-action");
		expect(confirm).toHaveAttribute("data-variant", "destructive");
		expect(tokens(confirm.getAttribute("class"))).toEqual(
			tokens(cn(buttonVariants({ variant: "destructive", size: "default" }))),
		);
	});

	it("forwards confirmVariant default", () => {
		renderConfirm({ confirmVariant: "default" });
		const confirm = button("Remove");
		expect(confirm).toHaveAttribute("data-variant", "default");
		expect(tokens(confirm.getAttribute("class"))).toEqual(
			tokens(buttonVariants()),
		);
	});

	it("loading disables both buttons", () => {
		renderConfirm({ loading: true });
		expect(button("Processing...")).toBeDisabled();
		expect(button("Cancel")).toBeDisabled();
	});
});
