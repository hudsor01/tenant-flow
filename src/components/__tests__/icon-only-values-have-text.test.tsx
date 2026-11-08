/**
 * @vitest-environment jsdom
 * WCAG 1.1.1 on icons that carry a value.
 *
 * A cell whose only visible content is an icon (a check for "included", a
 * minus for "not included") states its value through that icon alone. Lucide
 * renders every icon `aria-hidden` unless it is given a label, so such a cell
 * reads as nothing to a screen reader. The pricing comparison table did that
 * for every boolean row (66.2-39 fix round 4, Part 5c): "Lease management"
 * followed by three silent cells.
 *
 * The rule, the one the rendered sweep applies: walk up from each icon that is
 * not inside a control; stop at the first ancestor with visible text (the
 * icon then sits beside text and is decorative), or at the icon's cell (a
 * td/th/li/dd/dt/cell role, or a block whose row has a sibling with text).
 * A cell reached that way must carry accessible text: words in the DOM that
 * are not aria-hidden (sr-only counts), or a label on a role="img" or svg.
 * Every surface below renders such cells; each must name every one of them.
 */

import { fireEvent, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { COMPETITORS } from "#app/compare/[competitor]/compare-data";
import { FeatureTable } from "#app/compare/[competitor]/compare-sections";
import { PricingComparisonTable } from "#components/pricing/pricing-comparison-table";
import { ComparisonTable } from "#components/sections/comparison-table";

const CONTROL =
	'a[href], button, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="checkbox"], [role="switch"], [role="radio"], [role="combobox"], [role="link"], summary, label, input, select, textarea';
const CELL =
	'td, th, li, dd, dt, [role="cell"], [role="gridcell"], [role="rowheader"], [role="columnheader"], [role="listitem"]';

const isSrOnly = (el: Element): boolean => el.closest(".sr-only") !== null;

/** Text a sighted user sees in `el`, ignoring `skip`, svg text and sr-only text. */
function paintedText(el: Element, skip: Element | null): string {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	let out = "";
	for (let n = walker.nextNode(); n; n = walker.nextNode()) {
		const parent = n.parentElement;
		if (!parent || (skip && skip.contains(parent))) continue;
		if (parent.closest("svg") || isSrOnly(parent)) continue;
		out += n.textContent ?? "";
	}
	return out.trim();
}

/** Text the accessibility tree exposes for `el` (aria-hidden subtrees drop out). */
function accessibleText(el: Element): string {
	if (el.getAttribute("aria-hidden") === "true") return "";
	const label = el.getAttribute("aria-label");
	if (
		label?.trim() &&
		(el.getAttribute("role") === "img" || el.tagName.toLowerCase() === "svg")
	)
		return label.trim();
	let out = "";
	for (const child of el.childNodes) {
		if (child.nodeType === Node.TEXT_NODE) out += child.textContent ?? "";
		else if (child.nodeType === Node.ELEMENT_NODE)
			out += ` ${accessibleText(child as Element)}`;
	}
	return out.trim();
}

interface IconCell {
	cell: Element;
	row: string;
}

function iconOnlyCells(root: Element): IconCell[] {
	const cells: IconCell[] = [];
	for (const svg of root.querySelectorAll("svg")) {
		if (svg.parentElement?.closest("svg") || svg.closest(CONTROL)) continue;
		for (let e = svg.parentElement; e && e !== root; e = e.parentElement) {
			if (paintedText(e, svg)) break;
			const parent = e.parentElement;
			const besideText =
				parent !== null &&
				[...parent.children].some(
					(sibling) => sibling !== e && paintedText(sibling, null) !== "",
				);
			if (e.matches(CELL) || besideText) {
				if (!cells.some((c) => c.cell === e))
					cells.push({
						cell: e,
						row: paintedText(parent ?? e, null).slice(0, 60),
					});
				break;
			}
		}
	}
	return cells;
}

function unnamedIconCells(
	ui: ReactElement,
	open?: (root: HTMLElement) => void,
) {
	const { container, unmount } = render(ui);
	open?.(container);
	const cells = iconOnlyCells(container);
	const unnamed = cells
		.filter(({ cell }) => accessibleText(cell) === "")
		.map(({ row }) => row);
	unmount();
	return { cells: cells.length, unnamed };
}

/** Opens every collapsed section so each row is in the DOM. */
function expandAll(root: HTMLElement) {
	for (const trigger of root.querySelectorAll('[aria-expanded="false"]'))
		fireEvent.click(trigger);
}

const SURFACES: [string, () => ReactElement, ((root: HTMLElement) => void)?][] =
	[
		[
			"pricing comparison table (/pricing)",
			() => <PricingComparisonTable />,
			expandAll,
		],
		["features comparison table (/features)", () => <ComparisonTable />],
		...Object.values(COMPETITORS).map((data): [string, () => ReactElement] => [
			`compare feature table (/compare/${data.slug})`,
			() => <FeatureTable data={data} />,
		]),
	];

describe("icons that are a cell's only content carry a text alternative (WCAG 1.1.1)", () => {
	it.each(SURFACES)("%s", (_name, ui, open) => {
		const { cells, unnamed } = unnamedIconCells(ui(), open);
		expect(cells, "the surface renders icon-only cells").toBeGreaterThan(0);
		expect(
			unnamed,
			"rows with an icon-only cell that has no text alternative",
		).toEqual([]);
	});
});
