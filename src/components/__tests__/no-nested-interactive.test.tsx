/**
 * No control inside another control (HTML's interactive-content rule).
 *
 * Eight links wrapped a Button (`<Link><Button/></Link>`: an `<a>` holding a
 * `<button>`, two tab stops for one action, and invalid HTML): the year-end
 * page's Reports, the tenant page's Edit, the units page's Add Unit, the
 * inspections page's New Inspection and four on /pricing/cancel. The canonical
 * form is `<Button asChild><Link/></Button>`, one `<a>` with the button's look.
 * The multi-select's option rows held the Radix Checkbox, a `<button
 * role="checkbox">` inside the row's `<button role="option">`; the row now
 * draws the checkbox's look with a span. The dashboard's preset menu put a
 * delete `<button>` inside each apply menu item, where the arrow keys never
 * reach it; apply and delete are now two menu items in one row.
 *
 * Covered here: a static guard over every non-test `src/**\/*.tsx` for the
 * shapes the 66.2-39 part I AST sweep found (a Link or anchor whose first
 * child is a Button or button; a Button, button or Radix trigger without
 * `asChild` whose first child is a Link or anchor; a trigger without `asChild`
 * whose first child is a Button), and renders of the three components that
 * did it differently.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortfolioPresetMenu } from "#components/dashboard/components/portfolio-preset-menu";
import { MultiSelectChips } from "#components/shared/multi-select-chips";
import { useDashboardPresetsStore } from "#stores/dashboard-presets-store";

const SRC = join(process.cwd(), "src");

function tsxFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__") out.push(...tsxFiles(abs));
		} else if (
			entry.name.endsWith(".tsx") &&
			!/\.(test|spec)\.tsx$/.test(entry.name)
		) {
			out.push(abs);
		}
	}
	return out;
}

// An opening tag (attributes may hold `>` inside `{...}` only as `=>`, which
// none of these do), then whitespace or a JSX comment, then the child's tag.
const GAP = String.raw`\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)*`;
const NESTS: ReadonlyArray<readonly [string, RegExp]> = [
	[
		"a link holding a button",
		new RegExp(String.raw`<(?:Link|a)\b[^>]*>${GAP}<(?:Button|button)\b`, "g"),
	],
	[
		"a button holding a link",
		new RegExp(
			String.raw`<(?:Button|button|\w+Trigger)\b(?![^>]*\basChild\b)[^>]*>${GAP}<(?:Link|a)\b`,
			"g",
		),
	],
	[
		"a trigger holding a button",
		new RegExp(
			String.raw`<\w+(?:Trigger|Close)\b(?![^>]*\basChild\b)[^>]*>${GAP}<(?:Button|button)\b`,
			"g",
		),
	],
];

function nestedInSource(files: ReadonlyMap<string, string>): string[] {
	const hits: string[] = [];
	for (const [path, source] of files) {
		for (const [label, pattern] of NESTS) {
			for (const match of source.matchAll(pattern)) {
				const line = source.slice(0, match.index).split("\n").length;
				hits.push(`${path}:${line} ${label}`);
			}
		}
	}
	return hits;
}

describe("no control nests another (static)", () => {
	const files = new Map(
		tsxFiles(SRC).map((abs) => [
			relative(process.cwd(), abs),
			readFileSync(abs, "utf8"),
		]),
	);

	it("catches each shape and passes asChild", () => {
		const planted = new Map([
			["a.tsx", '<Link href="/x">\n\t<Button>Go</Button>\n</Link>'],
			[
				"b.tsx",
				'<Button variant="outline">\n\t<Link href="/x">Go</Link>\n</Button>',
			],
			["c.tsx", "<DialogTrigger>\n\t<Button>Open</Button>\n</DialogTrigger>"],
			["d.tsx", '<Button asChild>\n\t<Link href="/x">Go</Link>\n</Button>'],
			[
				"e.tsx",
				"<DialogTrigger asChild>\n\t<Button>Open</Button>\n</DialogTrigger>",
			],
		]);
		expect(nestedInSource(planted)).toEqual([
			"a.tsx:1 a link holding a button",
			"b.tsx:1 a button holding a link",
			"c.tsx:1 a trigger holding a button",
		]);
	});

	it("finds none in src/", () => {
		expect(files.size).toBeGreaterThan(400);
		const hits = nestedInSource(files);
		expect(
			hits,
			`a control inside a control -- use <Button asChild><Link/></Button>:\n${hits.join("\n")}`,
		).toEqual([]);
	});
});

describe("no control nests another (rendered)", () => {
	beforeEach(() => {
		useDashboardPresetsStore.setState({ presets: {} });
	});

	it("draws the multi-select's checkbox without a second button", async () => {
		const user = userEvent.setup();
		render(
			<MultiSelectChips
				options={[
					{ value: "lease", label: "Lease" },
					{ value: "receipt", label: "Receipt" },
				]}
				value={["lease"]}
				onChange={vi.fn()}
				aria-label="Filter by category"
			/>,
		);
		await user.click(
			screen.getByRole("button", { name: /Filter by category/ }),
		);
		const listbox = await screen.findByRole("listbox");
		expect(listbox.querySelectorAll("button button")).toHaveLength(0);
		expect(within(listbox).queryAllByRole("checkbox")).toHaveLength(0);
		const options = within(listbox).getAllByRole("option");
		expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual([
			"true",
			"false",
		]);
		const boxes = options.map((o) =>
			o.querySelector('span[aria-hidden="true"][data-state]'),
		);
		expect(boxes.map((b) => b?.getAttribute("data-state"))).toEqual([
			"checked",
			"unchecked",
		]);
	});

	it("reaches a preset's delete with the arrow keys", async () => {
		useDashboardPresetsStore.getState().savePreset("Vacant only", {
			filters: { status: ["vacant"] },
			sort: [],
			columnVisibility: {},
			page: 1,
		});
		const user = userEvent.setup();
		render(<PortfolioPresetMenu />, {
			wrapper: ({ children }: { children: ReactNode }) => (
				<NuqsTestingAdapter>{children}</NuqsTestingAdapter>
			),
		});
		await user.click(screen.getByRole("button", { name: /^presets$/i }));
		const menu = await screen.findByRole("menu");
		expect(menu.querySelectorAll("[role=menuitem] button")).toHaveLength(0);
		const remove = within(menu).getByRole("menuitem", {
			name: "Delete preset Vacant only",
		});
		const apply = within(menu).getByRole("menuitem", { name: "Vacant only" });
		// The arrow keys move through the menu's items; delete is one of them.
		apply.focus();
		await user.keyboard("{ArrowDown}");
		expect(remove).toHaveFocus();
		await user.keyboard("{Enter}");
		expect(
			useDashboardPresetsStore.getState().presets["Vacant only"],
		).toBeUndefined();
		// The menu stays open, as the inline delete kept it.
		expect(screen.getByRole("menu")).toBeInTheDocument();
	});
});
