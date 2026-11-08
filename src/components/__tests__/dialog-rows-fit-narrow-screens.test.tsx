/**
 * Rows inside a dialog fit a phone-width dialog (66.2-39 fix round 4, Part 5d).
 *
 * THE DEFECTS. Part 5d's rendered sweep read every opened dialog at 390x844
 * for content wider than the dialog. Three rows were:
 * - the six-digit code row of the two-factor setup and sign-in verification
 *   dialogs: fixed 44px slots made a 360px row in a 308px dialog body, its
 *   input and buttons running past the screen's right edge;
 * - the bulk-import stepper: three steps with their titles and descriptions
 *   beside the indicators, 564px in a 308px body, so the dialog scrolled
 *   sideways;
 * - the Add Unit dialog's property select (SelectTrigger's own cap is held
 *   in `#components/ui/__tests__/overlay-content-bounds.test.tsx`).
 * The code row's slots now share its width (44px each from `sm`, where the
 * row is 360px), and the stepper's step text is screen-reader only below
 * `sm`. Behind all three, the dialog's grid had one implicit auto column, so
 * the widest row widened the whole dialog (the bulk-import preview table
 * drew the footer buttons 564px wide): DialogContent and AlertDialogContent
 * now declare one minmax(0, 1fr) column.
 *
 * HOW IT IS READ. jsdom lays nothing out, so each row's classes are compiled
 * by the project's Tailwind and resolved against the rendered element: the
 * `@layer utilities` declarations whose selector matches it and whose media
 * condition holds at the width asked.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { AtRule, Container, Rule } from "postcss";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { MfaVerificationDialog } from "#components/auth/mfa-verification-dialog";
import { VerifyStep } from "#components/auth/two-factor-setup-steps";
import { BulkImportStepper } from "#components/bulk-import/bulk-import-stepper";
import { tenantBulkImportConfig } from "#components/tenants/bulk-import-config";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "#components/ui/dialog";
import { compileCandidates, parseCss } from "#test/utils/tailwind-engine";

const ENGINE_TIMEOUT_MS = 60_000;

/**
 * Does a compiled media condition hold at `width` px? lightningcss writes
 * Tailwind's `(width >= Xrem)` as `(min-width: Xrem)` and `(width < Xrem)` as
 * `not all and (min-width: Xrem)`.
 */
function holds(params: string, width: number): boolean {
	const text = params.trim();
	const negated = /^not all and /.test(text);
	const m = /\((min|max)-width: ([\d.]+)rem\)$/.exec(text);
	if (!m) throw new Error(`unread media condition: ${params}`);
	const bound = Number(m[2]) * 16;
	const value = m[1] === "min" ? width >= bound : width <= bound;
	return negated ? !value : value;
}

/** The utility declarations `classes` give `element` at a `width` px viewport. */
async function rulesAt(
	classes: readonly string[],
	element: Element,
	width: number,
): Promise<Map<string, string>> {
	const root = parseCss(await compileCandidates(classes));
	const out = new Map<string, string>();
	const visitRules = (container: Container, applies: boolean) => {
		container.each((node) => {
			if (node.type === "atrule") {
				const at = node as AtRule;
				if (at.name === "media") {
					visitRules(at, applies && holds(at.params, width));
				} else if (at.name === "layer") {
					visitRules(at, applies);
				}
				return;
			}
			if (node.type !== "rule" || !applies) return;
			const rule = node as Rule;
			let matches = false;
			try {
				matches = element.matches(rule.selector);
			} catch {
				matches = false;
			}
			if (matches) {
				rule.walkDecls((d) => {
					out.set(d.prop, d.value);
				});
			}
		});
	};
	root.each((node) => {
		if (
			node.type === "atrule" &&
			(node as AtRule).name === "layer" &&
			(node as AtRule).params === "utilities"
		) {
			visitRules(node as AtRule, true);
		}
	});
	return out;
}

/** The code row: slots share the group's width, the row stops at 360px. */
async function expectFluidCodeRow() {
	const slots = [...document.querySelectorAll('[data-slot="input-otp-slot"]')];
	expect(slots).toHaveLength(6);
	for (const slot of slots) {
		const group = slot.parentElement;
		if (!group) throw new Error("slot without a group");
		const classes = [...group.classList, ...slot.classList];
		for (const width of [320, 390]) {
			const rules = await rulesAt(classes, slot, width);
			expect(rules.get("flex"), `slot flex at ${width}`).toBe("1");
			expect(rules.get("width"), `slot width at ${width}`).toBe("auto");
			expect(rules.get("min-width"), `slot min-width at ${width}`).toMatch(
				/^(0|calc\(var\(--spacing\) \* 0\))$/,
			);
		}
		const groupRules = await rulesAt([...group.classList], group, 390);
		expect(groupRules.get("flex")).toBe("1");
	}
	const container = document.querySelector("[data-input-otp-container]");
	if (!container) throw new Error("no code row container");
	const rules = await rulesAt([...container.classList], container, 390);
	expect(rules.get("width")).toBe("100%");
	expect(rules.get("max-width")).toBe("calc(var(--spacing) * 90)");
}

describe("a dialog's content never widens the dialog", () => {
	it(
		"DialogContent and AlertDialogContent declare one minmax(0, 1fr) column",
		async () => {
			render(
				<>
					<Dialog open>
						<DialogContent aria-describedby={undefined}>
							<DialogTitle>Dialog</DialogTitle>
						</DialogContent>
					</Dialog>
					<AlertDialog open>
						<AlertDialogContent aria-describedby={undefined}>
							<AlertDialogTitle>Alert</AlertDialogTitle>
						</AlertDialogContent>
					</AlertDialog>
				</>,
			);
			for (const slot of ["dialog-content", "alert-dialog-content"]) {
				const content = document.querySelector(`[data-slot="${slot}"]`);
				if (!content) throw new Error(`${slot} did not render`);
				const rules = await rulesAt([...content.classList], content, 390);
				expect(rules.get("display"), slot).toBe("grid");
				expect(rules.get("grid-template-columns"), slot).toBe(
					"repeat(1, minmax(0, 1fr))",
				);
			}
		},
		ENGINE_TIMEOUT_MS,
	);
});

describe("rows inside a dialog fit a phone-width dialog", () => {
	beforeAll(() => {
		// input-otp reads the caret's position; jsdom has no layout to answer.
		if (typeof document.elementFromPoint !== "function") {
			Object.defineProperty(document, "elementFromPoint", {
				configurable: true,
				value: () => null,
			});
		}
	});

	it(
		"the two-factor setup's code row shares its width between the six slots",
		async () => {
			render(
				<Dialog open>
					<DialogContent>
						<VerifyStep
							verifyCode=""
							onVerifyCodeChange={vi.fn()}
							verifyPending={false}
							verifyError={null}
							onVerify={vi.fn()}
							onBack={vi.fn()}
						/>
					</DialogContent>
				</Dialog>,
			);
			await expectFluidCodeRow();
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"the sign-in verification's code row shares its width between the six slots",
		async () => {
			render(
				<MfaVerificationDialog
					open
					onOpenChange={vi.fn()}
					factorId="factor-1"
					onSuccess={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);
			await expectFluidCodeRow();
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"the bulk-import stepper's step text is screen-reader only below sm, shown from sm",
		async () => {
			render(
				<QueryClientProvider client={new QueryClient()}>
					<BulkImportStepper
						config={tenantBulkImportConfig()}
						currentStep="upload"
						onStepChange={vi.fn()}
						onComplete={vi.fn()}
					/>
				</QueryClientProvider>,
			);
			for (const title of ["Upload", "Validate", "Confirm"]) {
				const block = screen.getByText(title).parentElement;
				if (!block) throw new Error(`no text block for ${title}`);
				const narrow = await rulesAt([...block.classList], block, 390);
				expect(narrow.get("position"), title).toBe("absolute");
				expect(narrow.get("width"), title).toBe("1px");
				const wide = await rulesAt([...block.classList], block, 640);
				expect(wide.get("position"), title).toBeUndefined();
				expect(wide.get("margin-left"), title).toBe("calc(var(--spacing) * 3)");
			}
		},
		ENGINE_TIMEOUT_MS,
	);
});
