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
 * the premise is checked, not assumed. A paragraph whose margin reaches its
 * component's root is followed to the component's JSX call sites in the other
 * files (`crossFileHits`, 66.2-39 fix round 4, Part 8b): the bulk import's
 * "Closing automatically" note broke the stepper's flex column from another
 * file, which only Part 5c's rendered sweep had seen. Lists are held by
 * `list-base-rule-neutralized.test.ts`, which requires every list to cancel
 * all four base list values whatever its container.
 *
 * RATCHET. `DEFERRED` holds the hits in files this PR does not change (66.2
 * deferred-items), by file and count: a new hit anywhere fails, and so does a
 * fixed one until its entry goes. Every hit in a file this PR changes is fixed.
 * Each entry also holds the file's git blob id at the PR's base, d9c7329f0
 * (`#test/utils/git-blob`), so a deferred file that changes fails the ratchet
 * and its hits are fixed in that change: two deferred files became PR files
 * after this guard was written and kept their hits behind their entries
 * (66.2-39 fix round 4, Part 8b).
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
	crossFileHits,
} from "#test/utils/base-margin-sites";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { gitBlobId } from "#test/utils/git-blob";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";

const ROOT = process.cwd();
const UI_DIR = join(ROOT, "src/components/ui");

/** Hits in files this PR does not change: deferred, not fixed here, each with its blob at d9c7329f0. */
const DEFERRED: Record<string, readonly [hits: number, blob: string]> = {
	"src/app/(admin)/admin/analytics/page.tsx": [
		1,
		"1b436ec887f6dc09f2ac34555988092dfd922189",
	],
	"src/app/(owner)/@modal/(.)leases/[id]/edit/page.tsx": [
		1,
		"f1c01563e06c97e5169546609321e7722139434e",
	],
	"src/app/(owner)/@modal/(.)maintenance/[id]/edit/page.tsx": [
		1,
		"376fecd8f6b2c31b0a89c076fd24f804481fd848",
	],
	"src/app/(owner)/analytics/financial/_components/breakdown-list.tsx": [
		1,
		"de07c434f7013af650f679bfaab94de8a9f8172b",
	],
	"src/app/(owner)/documents/templates/components/branding-editor.tsx": [
		1,
		"ab640343b60d1ff9e084f3aa96452ef318d4e1eb",
	],
	"src/app/(owner)/documents/templates/components/clauses-editor.tsx": [
		1,
		"b6397463df22f2e9a9530afea2599fcb29c783e3",
	],
	"src/app/(owner)/documents/templates/maintenance-request/page.tsx": [
		1,
		"066a70cf0f1dec3602e442d502ec9861606d19b3",
	],
	"src/app/(owner)/documents/templates/property-inspection/page.tsx": [
		1,
		"41c061bb00b70f4ecacdb3c079d77979dac44c56",
	],
	"src/app/(owner)/documents/templates/rental-application/page.tsx": [
		1,
		"c3700d733c5d78fa8161aeba356527ba1407eb6a",
	],
	"src/app/(owner)/documents/templates/tenant-notice/page.tsx": [
		1,
		"793655667c43e24795c02bd2de31878c1ecae3c2",
	],
	"src/app/(owner)/reports/generate/page.tsx": [
		1,
		"ac019397e2e04e01ef57bfa7a33398144c17da60",
	],
	"src/app/(owner)/reports/report-hub-tile.tsx": [
		1,
		"74de3ec2156c1275f875684e57cb3000bca0d05e",
	],
	"src/app/auth/confirm-email/loading.tsx": [
		1,
		"0b2dbc8d536722f4b448b00f7eae79a2e2d7d2a3",
	],
	"src/app/marketing-home.tsx": [2, "a637d6e38fbbde2a5d0f2d22f23321dfc95cf60c"],
	"src/app/pricing/page.tsx": [1, "5b684df9ea95251daf511cc5b1ed8b7a09c310c1"],
	"src/app/security-policy/page.tsx": [
		1,
		"e573dca49e90859aae9b8708c2ed96240108116c",
	],
	"src/app/sign/[token]/page.tsx": [
		3,
		"59920fd69e0b49cae40d4a631849c72d03953bb7",
	],
	"src/components/admin/deliverability-table.tsx": [
		1,
		"554323816217ddc619546d7926ae99c0fa691672",
	],
	"src/components/admin/funnel-chart.tsx": [
		1,
		"ce62d176c6450b577c36f6d52e8edac7203283e8",
	],
	"src/components/admin/gate-conversion-table.tsx": [
		1,
		"5b5e8a8b111d06fcbb5e168f2f96dd50cdb661ef",
	],
	"src/components/bulk-import/bulk-import-dialog.tsx": [
		1,
		"389a01a37f66ac6d13dc303737964fdb7179f102",
	],
	"src/components/dashboard/dashboard-activity-card.tsx": [
		3,
		"b19802c47ad4b87175aa27eeedd6f7e0085652f9",
	],
	"src/components/data-table/data-table-pagination.tsx": [
		1,
		"809d7bac7d8816cb5e74e9b5ead4fb99faa5fe60",
	],
	"src/components/error-boundary/error-fallback.tsx": [
		1,
		"12c1bd46cf7c736c9a3043fc5437e5c265a054dd",
	],
	"src/components/inspections/inspection-detail.client.tsx": [
		3,
		"07caaa274018aa481a5ed5ecff5be839fc709532",
	],
	"src/components/ledger/add-line-dialog.tsx": [
		1,
		"4ea9d26da0a7c3d8d6d9110053c7fed0731efdd9",
	],
	"src/components/ledger/ledger-date-field.tsx": [
		1,
		"e0a4af7b3060cb96952fd609434f1effed7e0b71",
	],
	"src/components/ledger/ledger-table.tsx": [
		2,
		"3ba77b5ee6f7f252347042fd4643a781dbf8f095",
	],
	"src/components/ledger/track-since-dialog.tsx": [
		2,
		"020a436558ff1ec2e8d0699b97a819a3f2f81836",
	],
	"src/components/maintenance/maintenance-form.client.tsx": [
		1,
		"f92f0f37db5108ebf8a91ee14469025a1a8ffc1b",
	],
	"src/components/marketing/sticky-conversion-cta.tsx": [
		1,
		"8e96648044fed78625fe687e2640d43829439dcb",
	],
	"src/components/notifications/notification-popover-list.tsx": [
		1,
		"a93cbe45ea6dd284897823e6c7bfcf7632d002a1",
	],
	"src/components/notifications/notifications-inbox.client.tsx": [
		3,
		"9887cf96726efb1069afafe83a815b765115dbf2",
	],
	"src/components/onboarding/onboarding-step-complete.tsx": [
		1,
		"5a877de32e2622cefa1b88fe5777c1b4c270a7aa",
	],
	"src/components/onboarding/onboarding-step-welcome.tsx": [
		1,
		"d6aeb42d7128e2466b74ec4de65829b223d1e5dc",
	],
	"src/components/properties/add-unit-panel.tsx": [
		2,
		"e4e649fd0bfd1bb4966a2b407347e95ea8c7c5e2",
	],
	"src/components/properties/edit-unit-panel.tsx": [
		1,
		"3f925aa01cdbaa7caeffb145bf9fad98f6ad7f70",
	],
	"src/components/properties/property-units-single-view.tsx": [
		1,
		"e794cbdcd9e16fc1b271db4be58596f23f499157",
	],
	"src/components/settings/category-create-dialog.tsx": [
		2,
		"d6bc4d7202d01814a4b7cbd75f85e1530d986212",
	],
	"src/components/settings/category-rename-dialog.tsx": [
		1,
		"1aad9f874a7ce692b5a7da63a5c788da7e73686a",
	],
	"src/components/tenants/add-tenant-property-fields.tsx": [
		1,
		"e46314e9018fe6dd8f4599cb2c49cb1da0359c6a",
	],
	"src/lib/forms/fields/icon-input-field.tsx": [
		1,
		"48e5d8e2af3d01041d584671741115dd4a33a01d",
	],
	"src/lib/forms/fields/switch-field.tsx": [
		1,
		"337b1f46bcdd6e926928d990a366beb39ccbb229",
	],
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
		expect(
			shapes(`<DialogHeader className="sr-only">
				<DialogTitle>Title</DialogTitle>
				<DialogDescription>never seen</DialogDescription>
			</DialogHeader>`),
		).toEqual([]);
		expect(shapes(`<Unknown><p className="text-sm">a</p></Unknown>`)).toEqual(
			[],
		);
	});

	it("follows a margin that reaches a component's root to its callers", () => {
		const step = {
			path: "src/step.tsx",
			source: `export function Step({ done }: { done: boolean }) {
				return (
					<div className="space-y-5">
						<div role="status">{done && <p className="text-xs">closing</p>}</div>
					</div>
				);
			}`,
		};
		const caller = (wrapper: string) => ({
			path: "src/stepper.tsx",
			source: `import { Step } from "./step";
			export function Stepper() {
				return ${wrapper};
			}`,
		});
		const found = (wrapper: string) =>
			crossFileHits([step, caller(wrapper)], components, box).map(
				(h) => `${h.file}:${h.line}:${h.shape} ${h.via}`,
			);
		expect(
			found(
				`<div className="flex flex-col gap-4"><div><Step done /></div></div>`,
			),
		).toEqual([
			"src/step.tsx:4:d last child of <div> > last child of <div> > root of <Step>, rendered at src/stepper.tsx:3 as last child of <div> > flex or grid item of <div>",
		]);
		expect(
			found(`<div className="space-y-4"><Step done /><footer /></div>`),
		).toEqual([]);
		expect(found(`<div><Step done /><p>after</p></div>`)).toEqual([]);
		// One of a ternary's branches always follows, so the note is never last.
		expect(
			crossFileHits(
				[
					{
						path: "src/panel.tsx",
						source: `export function Panel({ busy }: { busy: boolean }) {
							return (
								<div className="space-y-4">
									<p className="text-xs">Recent</p>
									{busy ? <span>...</span> : <ul />}
								</div>
							);
						}`,
					},
					{
						path: "src/page.tsx",
						source: `import { Panel } from "./panel";
						export function Page() { return <section className="p-6"><Panel busy /></section>; }`,
					},
				],
				components,
				box,
			),
		).toEqual([]);
	});

	it("leaves no hit outside the deferred files", () => {
		const offenders: Record<string, number> = {};
		const lines: string[] = [];
		const files = collect(join(ROOT, "src"));
		const sources = files.map((path) => ({
			path,
			source: readFileSync(join(ROOT, path), "utf8"),
		}));
		const across = crossFileHits(sources, components, box);
		for (const { path: file, source } of sources) {
			const hits = [
				...scan(file, source),
				...across.filter((h) => h.file === file),
			];
			if (hits.length === 0) continue;
			offenders[file] = hits.length;
			if (DEFERRED[file]?.[0] !== hits.length) {
				for (const h of hits)
					lines.push(`${h.file}:${h.line} (${h.shape}) ${h.via}`);
			}
		}
		expect(lines).toEqual([]);
		expect(offenders).toEqual(
			Object.fromEntries(
				Object.entries(DEFERRED).map(([file, [hits]]) => [file, hits]),
			),
		);
	}, 60_000);

	it("defers only files left as they were at the PR's base", () => {
		const changed = Object.entries(DEFERRED)
			.filter(([file, [, blob]]) => gitBlobId(join(ROOT, file)) !== blob)
			.map(([file]) => `${file} changed since d9c7329f0: fix its paragraphs`);
		expect(changed).toEqual([]);
	});
});
