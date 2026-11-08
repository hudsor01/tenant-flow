/**
 * @vitest-environment jsdom
 * No paragraph keeps the base margin where it breaks its container's declared
 * spacing (66.2-39 fix round 4, class M, OD-C3-1; it replaces fix round 3's
 * heading-subtitle regexes, which saw one shape of the class: G6).
 *
 * globals.css' `@layer base` `p { margin-bottom: 1rem }` stays (D-B defers
 * removing it). A paragraph whose class string declares no bottom margin keeps
 * those 16px, and they break the spacing around it in four shapes
 * (`#test/utils/base-margin-sites`, which reads each class string's effect
 * from the CSS Tailwind's own design system emits for it):
 * - (a) a flex or grid item: an item's margin adds to the container's gap
 *   (the property tiles' labels 24px above their figures where 8 is declared);
 * - (b) the last child of a padded or bordered box: 16px more below the text
 *   than above it (the owner error boxes, 40 below against 24 above);
 * - (c) followed by a sibling whose top margin is under 16px: the two collapse
 *   to 16 where 4 is declared (every title + `mt-1` body pair);
 * - (d) the last child of a block that holds nothing in, so the margin
 *   collapses through it onto a flex item, a vertical space child or one of
 *   the shapes above (the cash-flow figures, the year-end header block).
 *
 * The scan reads every non-test .tsx under src, with the components of
 * `src/components/ui` read as the boxes they render (`componentBoxes`), and the
 * base rule itself from globals.css (`computeParagraphCascade`'s probe), so
 * the premise is checked, not assumed. Lists are held by
 * `list-base-rule-neutralized.test.ts`, which requires every list to cancel
 * all four base list values whatever its container.
 *
 * RATCHET. `DEFERRED` holds the hits in files this PR does not change (66.2
 * deferred-items), by file and count: a new hit anywhere fails, and so does a
 * fixed one until its entry goes. Every hit in a file this PR changes is fixed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
	type BaseMarginHit,
	type BoxStyle,
	baseMarginHits,
	type ComponentBox,
	componentBoxes,
	createBoxReader,
} from "#test/utils/base-margin-sites";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";

const ROOT = process.cwd();
const UI_DIR = join(ROOT, "src/components/ui");

/** Hits in files this PR does not change: deferred, not fixed here. */
const DEFERRED: Record<string, number> = {
	"src/app/(admin)/admin/analytics/page.tsx": 1,
	"src/app/(owner)/@modal/(.)leases/[id]/edit/page.tsx": 1,
	"src/app/(owner)/@modal/(.)maintenance/[id]/edit/page.tsx": 1,
	"src/app/(owner)/analytics/financial/_components/breakdown-list.tsx": 1,
	"src/app/(owner)/billing/checkout/cancel/page.tsx": 1,
	"src/app/(owner)/billing/checkout/success/page.tsx": 2,
	"src/app/(owner)/documents/templates/components/branding-editor.tsx": 1,
	"src/app/(owner)/documents/templates/components/clauses-editor.tsx": 1,
	"src/app/(owner)/documents/templates/maintenance-request/page.tsx": 1,
	"src/app/(owner)/documents/templates/property-inspection/page.tsx": 1,
	"src/app/(owner)/documents/templates/rental-application/page.tsx": 1,
	"src/app/(owner)/documents/templates/tenant-notice/page.tsx": 1,
	"src/app/(owner)/reports/generate/page.tsx": 1,
	"src/app/(owner)/reports/report-hub-tile.tsx": 1,
	"src/app/(owner)/tenants/components/move-out-dialog.tsx": 1,
	"src/app/auth/confirm-email/loading.tsx": 1,
	"src/app/marketing-home.tsx": 2,
	"src/app/pricing/page.tsx": 1,
	"src/app/privacy/page.tsx": 2,
	"src/app/security-policy/page.tsx": 1,
	"src/app/sign/[token]/page.tsx": 3,
	"src/app/stripe/success/page.tsx": 1,
	"src/app/terms/page.tsx": 3,
	"src/components/admin/deliverability-table.tsx": 1,
	"src/components/admin/funnel-chart.tsx": 1,
	"src/components/admin/gate-conversion-table.tsx": 1,
	"src/components/applications/application-decline-dialog.tsx": 1,
	"src/components/auth/two-factor-setup-steps.tsx": 5,
	"src/components/bulk-import/bulk-import-dialog.tsx": 1,
	"src/components/dashboard/dashboard-activity-card.tsx": 3,
	"src/components/data-table/data-table-pagination.tsx": 1,
	"src/components/error-boundary/error-fallback.tsx": 1,
	"src/components/inspections/inspection-detail.client.tsx": 3,
	"src/components/leases/wizard/terms-step.tsx": 5,
	"src/components/ledger/add-line-dialog.tsx": 1,
	"src/components/ledger/ledger-date-field.tsx": 1,
	"src/components/ledger/ledger-table.tsx": 2,
	"src/components/ledger/track-since-dialog.tsx": 2,
	"src/components/maintenance/detail/expenses-card.tsx": 5,
	"src/components/maintenance/maintenance-form.client.tsx": 1,
	"src/components/marketing/sticky-conversion-cta.tsx": 1,
	"src/components/notifications/notification-popover-list.tsx": 1,
	"src/components/notifications/notifications-inbox.client.tsx": 3,
	"src/components/onboarding/onboarding-step-complete.tsx": 1,
	"src/components/onboarding/onboarding-step-welcome.tsx": 1,
	"src/components/properties/add-unit-panel.tsx": 2,
	"src/components/properties/edit-unit-panel.tsx": 1,
	"src/components/properties/property-units-single-view.tsx": 1,
	"src/components/settings/category-create-dialog.tsx": 2,
	"src/components/settings/category-delete-dialog.tsx": 1,
	"src/components/settings/category-rename-dialog.tsx": 1,
	"src/components/tenants/add-tenant-property-fields.tsx": 1,
	"src/components/tenants/tenant-table.tsx": 1,
	"src/components/ui/bento-grid.tsx": 1,
	"src/lib/forms/fields/icon-input-field.tsx": 1,
	"src/lib/forms/fields/switch-field.tsx": 1,
};

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "__tests__") continue;
			out.push(...collect(abs));
		} else if (
			entry.name.endsWith(".tsx") &&
			!/\.test\.tsx$/.test(entry.name)
		) {
			out.push(relative(ROOT, abs));
		}
	}
	return out;
}

let box: (classes: string[]) => BoxStyle;
let components: Map<string, ComponentBox>;

function scan(file: string, source: string): BaseMarginHit[] {
	return baseMarginHits(file, source, components, box);
}

/** The shapes the scan reports for a fixture, one `line:shape` per hit. */
function shapes(source: string): string[] {
	return scan("fixture.tsx", source).map((h) => `${h.line}:${h.shape}`);
}

beforeAll(async () => {
	box = createBoxReader(await loadProjectDesignSystem());
	components = componentBoxes(
		readdirSync(UI_DIR)
			.filter((name) => name.endsWith(".tsx"))
			.map((name) => {
				const path = relative(ROOT, join(UI_DIR, name));
				return { path, source: readFileSync(join(ROOT, path), "utf8") };
			}),
	);
}, 30_000);

describe("paragraphs carry no base margin where it breaks declared spacing", () => {
	it("rests on the globals.css rule it guards against", () => {
		const probe = document.createElement("p");
		document.body.appendChild(probe);
		const { baseline } = computeParagraphCascade(probe);
		probe.remove();
		expect(baseline.marginBottom).toBe("16px");
	});

	it("reads the ui components as the boxes they render", () => {
		const style = (name: string) => {
			const component = components.get(name);
			if (!component) throw new Error(`no box for ${name}`);
			return box(component.classes);
		};
		expect(style("Card")).toMatchObject({
			flexOrGrid: true,
			holdsMargin: true,
		});
		expect(style("CardHeader")).toMatchObject({ flexOrGrid: true });
		expect(style("CardContent")).toMatchObject({
			flexOrGrid: false,
			holdsMargin: false,
		});
		expect(style("DialogHeader")).toMatchObject({ flexOrGrid: true });
		expect(style("DialogContent")).toMatchObject({
			flexOrGrid: true,
			holdsMargin: true,
		});
		expect(style("Stat")).toMatchObject({
			flexOrGrid: true,
			holdsMargin: true,
		});
		expect(style("Field")).toMatchObject({ flexOrGrid: true });
		expect(style("ItemContent")).toMatchObject({ flexOrGrid: true });
		expect(components.get("DialogDescription")?.tag).toBe("p");
	});

	it("finds each shape, through a component and a conditional", () => {
		expect(
			shapes(`<div className="flex gap-2">
				<p className="text-sm">a</p>
			</div>`),
		).toEqual(["2:a"]);
		expect(
			shapes(`<div className="rounded-lg border p-6">
				<h2>Title</h2>
				<p className="text-muted-foreground">b</p>
			</div>`),
		).toEqual(["3:b"]);
		expect(
			shapes(`<div>
				<p className="font-medium">c</p>
				<p className="mt-1 mb-0 text-sm">d</p>
			</div>`),
		).toEqual(["2:c"]);
		expect(
			shapes(`<div className="flex items-center justify-between gap-4">
				<div>
					<h1>Title</h1>
					<p className="text-muted-foreground">d</p>
				</div>
			</div>`),
		).toEqual(["4:d"]);
		expect(
			shapes(`<div className="space-y-3">
				<div><p className="text-xs">d</p></div>
				<ul />
			</div>`),
		).toEqual(["2:d"]);
		expect(
			shapes(
				`<Card><CardContent><p className="text-sm">d</p></CardContent></Card>`,
			),
		).toEqual(["1:d"]);
		expect(
			shapes(`<div className="p-4">
				<p className="text-sm">b</p>
				{error && <span>more</span>}
			</div>`),
		).toEqual(["2:b"]);
		expect(
			shapes(`<td className="px-4 py-3">
				<p className="text-xs">dates</p>
				<p className="mb-0 text-sm lg:hidden">shown below lg</p>
			</td>`),
		).toEqual(["2:b"]);
		expect(
			shapes(`import Link from "next/link";
			const Tile = () => (
				<Link href="/x" className="rounded-lg border p-5">
					<h3>Title</h3>
					<p className="text-sm">b</p>
				</Link>
			);`),
		).toEqual(["5:b"]);
		expect(
			shapes(`<div className="flex flex-col gap-1">
				{items.map((item) => (
					<p key={item} className="text-sm">{item}</p>
				))}
			</div>`),
		).toEqual(["3:a"]);
	});

	it("passes a paragraph whose margin is declared or cannot break anything", () => {
		expect(
			shapes(
				`<div className="flex gap-2"><p className="mb-0 text-sm">a</p></div>`,
			),
		).toEqual([]);
		expect(
			shapes(
				`<div className="rounded-lg border p-6"><p className="mt-1 mb-0">b</p></div>`,
			),
		).toEqual([]);
		expect(
			shapes(`<div className="flex gap-2 [&>p]:mb-0"><p>a</p></div>`),
		).toEqual([]);
		expect(
			shapes(
				`<div className="space-y-2"><p>first</p><p className="mb-0">last</p></div>`,
			),
		).toEqual([]);
		expect(
			shapes(`<div className="space-y-4"><div><p>d</p></div><ul /></div>`),
		).toEqual([]);
		expect(
			shapes(
				`<div><p className="text-sm">prose</p><p className="text-sm">prose</p></div>`,
			),
		).toEqual([]);
		expect(
			shapes(`<div className="flex"><p className="sr-only">hidden</p></div>`),
		).toEqual([]);
		expect(
			shapes(
				`<div className="p-4"><p className="text-sm">a</p><Button /></div>`,
			),
		).toEqual([]);
		expect(shapes(`<Unknown><p className="text-sm">a</p></Unknown>`)).toEqual(
			[],
		);
	});

	it("leaves no hit outside the deferred files", () => {
		const offenders: Record<string, number> = {};
		const lines: string[] = [];
		for (const file of collect(join(ROOT, "src"))) {
			const hits = scan(file, readFileSync(join(ROOT, file), "utf8"));
			if (hits.length === 0) continue;
			offenders[file] = hits.length;
			if (DEFERRED[file] !== hits.length) {
				for (const h of hits)
					lines.push(`${h.file}:${h.line} (${h.shape}) ${h.via}`);
			}
		}
		expect(lines).toEqual([]);
		expect(offenders).toEqual(DEFERRED);
	}, 60_000);
});
