/**
 * Every overlay list fits the space beside its trigger, and scrolls (66.2-39
 * fix round 4, Part 5d).
 *
 * THE DEFECT. A popover, select, menu or combobox is positioned beside its
 * trigger, flipped to the side with more room; nothing else limits its size.
 * Where neither side holds it, the part past the viewport cannot be reached:
 * the lease wizard's property combobox (Dice UI's `max-h-fit overflow-hidden`)
 * opened 778px tall above its input at 1280x800 with 11 of 24 options above
 * the screen; the document vault's category filter ran 1251px tall at
 * 1280x800 and its date-range calendar 777.5px in the 444px above its trigger
 * at 390x844; /applications' unit filter stood 414.4px wide in a 390px
 * viewport. Each primitive now bounds its content box by the space its
 * positioner measures (`--radix-*-content-available-height/-width`, Dice UI's
 * `--dice-available-height/-width`) and scrolls inside it, and SelectTrigger
 * is capped at its container's width.
 *
 * HOW IT IS READ. Each primitive is rendered open in jsdom, and its content
 * element's own classes are compiled by the project's Tailwind; the base
 * (unconditional) `@layer utilities` declarations whose selector matches the
 * element are its box rules. jsdom applies no class CSS, so the cascade is
 * resolved here, as the app-shell display guard resolves it.
 */

import { render, screen } from "@testing-library/react";
import type { AtRule, Container, Rule } from "postcss";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import {
	Combobox,
	ComboboxAnchor,
	ComboboxContent,
	ComboboxInput,
	ComboboxItem,
} from "#components/ui/combobox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { compileCandidates, parseCss } from "#test/utils/tailwind-engine";

const ENGINE_TIMEOUT_MS = 60_000;

/** The unconditional utility declarations the element's own classes give it. */
async function boxRules(element: Element): Promise<Map<string, string>> {
	const root = parseCss(await compileCandidates([...element.classList]));
	const out = new Map<string, string>();
	const visitRules = (container: Container, conditional: boolean) => {
		container.each((node) => {
			if (node.type === "atrule") {
				const at = node as AtRule;
				visitRules(at, conditional || at.name !== "layer");
				return;
			}
			if (node.type !== "rule" || conditional) return;
			const rule = node as Rule;
			let matches = false;
			try {
				matches = element.matches(rule.selector);
			} catch {
				matches = false;
			}
			if (!matches) return;
			rule.walkDecls((decl) => {
				out.set(decl.prop, decl.value);
			});
		});
	};
	root.each((node) => {
		if (
			node.type === "atrule" &&
			(node as AtRule).name === "layer" &&
			(node as AtRule).params === "utilities"
		) {
			visitRules(node as AtRule, false);
		}
	});
	return out;
}

interface Case {
	name: string;
	slot: string;
	/** The custom properties the positioner sets on the content element. */
	height: string;
	width: string;
	ui: ReactElement;
}

const CASES: Case[] = [
	{
		name: "PopoverContent",
		slot: "popover-content",
		height: "--radix-popover-content-available-height",
		width: "--radix-popover-content-available-width",
		ui: (
			<Popover open>
				<PopoverTrigger>Open</PopoverTrigger>
				<PopoverContent>Body</PopoverContent>
			</Popover>
		),
	},
	{
		name: "SelectContent",
		slot: "select-content",
		height: "--radix-select-content-available-height",
		width: "--radix-select-content-available-width",
		ui: (
			<Select open value="a">
				<SelectTrigger aria-label="Pick">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="a">A</SelectItem>
				</SelectContent>
			</Select>
		),
	},
	{
		name: "DropdownMenuContent",
		slot: "dropdown-menu-content",
		height: "--radix-dropdown-menu-content-available-height",
		width: "--radix-dropdown-menu-content-available-width",
		ui: (
			<DropdownMenu open>
				<DropdownMenuTrigger>Open</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Item</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
	{
		name: "ComboboxContent",
		slot: "combobox-content",
		height: "--dice-available-height",
		width: "--dice-available-width",
		ui: (
			<Combobox open value="">
				<ComboboxAnchor>
					<ComboboxInput aria-label="Search" />
				</ComboboxAnchor>
				<ComboboxContent>
					<ComboboxItem value="a">A</ComboboxItem>
				</ComboboxContent>
			</Combobox>
		),
	},
];

describe("every overlay list fits the space beside its trigger, and scrolls", () => {
	it.each(CASES)(
		"$name is bounded by $height and $width and scrolls",
		async ({ slot, height, width, ui }) => {
			render(ui);
			const content = document.querySelector(`[data-slot="${slot}"]`);
			if (!content) throw new Error(`${slot} did not render`);
			const rules = await boxRules(content);
			expect(rules.get("max-height")).toBe(`var(${height})`);
			expect(rules.get("max-width")).toBe(`var(${width})`);
			expect(["auto", "scroll"]).toContain(rules.get("overflow-y"));
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"SelectTrigger is capped at its container's width, with a definite minimum so the cap holds in grid and flex cells",
		async () => {
			render(
				<Select>
					<SelectTrigger aria-label="Property">
						<SelectValue placeholder="Select property" />
					</SelectTrigger>
				</Select>,
			);
			const rules = await boxRules(
				screen.getByRole("combobox", { name: "Property" }),
			);
			expect(rules.get("max-width")).toBe("100%");
			expect(rules.get("min-width")).toBe("calc(var(--spacing) * 11)");
		},
		ENGINE_TIMEOUT_MS,
	);
});
