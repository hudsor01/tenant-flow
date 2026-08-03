/**
 * `/documents` landing composition pins + RSC purity guard (DOCS-01, D-04, D-06).
 *
 * `page.tsx` is a Server Component that is pure composition over
 * `DOCUMENTS_HUB_ENTRIES` and `DOCUMENTS_HUB_BANDS` — it filters by band and
 * renders one tile per entry, and hand-lists nothing. So pinning the data pins
 * the rendered structure, which is the same reasoning
 * `../../reports/__tests__/reports-hub.test.tsx` states for the same shape.
 * Nothing is rendered here, so this is a plain `.ts` file with no JSX.
 *
 * The source scan in Group C is the ENFORCEMENT of D-04 (server shell, one
 * client island) and D-06 (the 308 is gone and may not come back). Every
 * content assertion runs on comment-stripped source, and that is load-bearing
 * in both directions: `page.tsx`'s doc block names the island and describes the
 * reversed 308, so a raw-source scan would be self-satisfying on the positives
 * and self-failing on the negatives.
 *
 * Deliberately absent: any assertion about `<RecentDocumentsPanel`. It does not
 * exist yet — plan 65-02 adds that pin to this same file.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPORTING_REDIRECTS } from "#lib/seo/reporting-redirects";
import {
	DOCUMENTS_HUB_BANDS,
	DOCUMENTS_HUB_ENTRIES,
	DOCUMENTS_VAULT_ENTRY,
	type DocumentsHubBandId,
} from "../documents-hub-entries";

const cwd = process.cwd();
const OWNER_ROOT = "src/app/(owner)";
const HUB_INDEX = `${OWNER_ROOT}/documents/page.tsx`;

/**
 * Strip block and line comments so documentation cannot satisfy — or trip — the
 * guard it documents. Copied verbatim from `reports-hub-purity.test.ts`.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, "");
}

function matchNames(
	source: string,
	patterns: readonly { name: string; pattern: RegExp }[],
): string[] {
	return patterns
		.filter(({ pattern }) => pattern.test(source))
		.map(({ name }) => name);
}

function entriesInBand(band: DocumentsHubBandId) {
	return DOCUMENTS_HUB_ENTRIES.filter((entry) => entry.band === band);
}

describe("documents hub directory", () => {
	it("holds exactly 6 entries", () => {
		expect(DOCUMENTS_HUB_ENTRIES).toHaveLength(6);
	});

	it("holds exactly 3 bands, ordered vault then build then printables", () => {
		// EQUALITY, never toContain: the order IS the descending-weight ladder
		// (65-UI-SPEC I-1), and exhaustiveness is what stops a fourth band being
		// appended without a decision.
		expect(DOCUMENTS_HUB_BANDS.map((band) => band.id)).toEqual([
			"vault",
			"build",
			"printables",
		]);
	});

	it("puts 1 entry in vault, 1 in build and 4 in printables", () => {
		expect(entriesInBand("vault")).toHaveLength(1);
		expect(entriesInBand("build")).toHaveLength(1);
		expect(entriesInBand("printables")).toHaveLength(4);
	});

	it("assigns every entry to a declared band", () => {
		const bandIds = new Set(DOCUMENTS_HUB_BANDS.map((band) => band.id));
		const unassigned = DOCUMENTS_HUB_ENTRIES.filter(
			(entry) => !bandIds.has(entry.band),
		).map((entry) => entry.id);
		expect(unassigned).toEqual([]);
	});

	it("carries DOCUMENTS_VAULT_ENTRY by reference as the only vault entry", () => {
		// Both halves are required. The filter alone passes on a structural clone
		// declared alongside the export, which `page.tsx` would then render twice —
		// once from the export it imports and once from the array it maps.
		expect(DOCUMENTS_HUB_ENTRIES).toContain(DOCUMENTS_VAULT_ENTRY);
		expect(entriesInBand("vault")).toEqual([DOCUMENTS_VAULT_ENTRY]);
	});

	it("gives every entry a unique id", () => {
		const ids = DOCUMENTS_HUB_ENTRIES.map((entry) => entry.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("gives every entry a non-empty title and description", () => {
		const incomplete = DOCUMENTS_HUB_ENTRIES.filter(
			(entry) =>
				entry.title.trim().length === 0 ||
				entry.description.trim().length === 0,
		).map((entry) => entry.id);
		expect(incomplete).toEqual([]);
	});

	it("uses 6 distinct lucide icons", () => {
		// 65-UI-SPEC I-5: the four printables must be visually distinct. All four
		// template pages ship `FileText` today, so reusing one glyph across two
		// tiles is the live regression this pins against.
		const icons = DOCUMENTS_HUB_ENTRIES.map((entry) => entry.icon);
		expect(new Set(icons).size).toBe(6);
	});
});

describe("documents hub bands", () => {
	it("leaves the vault band untitled, because its heading is the vault entry", () => {
		// I-4: Band 1's <h2> renders DOCUMENTS_VAULT_ENTRY.title. A band title here
		// would be a second heading competing with it.
		const vaultBand = DOCUMENTS_HUB_BANDS.find((band) => band.id === "vault");
		expect(vaultBand).toBeDefined();
		expect(vaultBand?.title).toBeNull();
		expect(vaultBand?.description).toBeNull();
	});

	it("gives the build and printables bands a non-empty title", () => {
		const untitled = DOCUMENTS_HUB_BANDS.filter(
			(band) => band.id !== "vault" && (band.title ?? "").trim().length === 0,
		).map((band) => band.id);
		expect(untitled).toEqual([]);
	});

	it("gives every band a unique, non-empty heading id", () => {
		const missing = DOCUMENTS_HUB_BANDS.filter(
			(band) => band.headingId.trim().length === 0,
		).map((band) => band.id);
		expect(missing).toEqual([]);
		expect(new Set(DOCUMENTS_HUB_BANDS.map((b) => b.headingId)).size).toBe(
			DOCUMENTS_HUB_BANDS.length,
		);
	});
});

describe("documents hub hrefs reach real routes", () => {
	it.each(DOCUMENTS_HUB_ENTRIES.map((entry) => [entry.id, entry.href]))(
		"%s -> %s has a page.tsx on disk",
		(_id, href) => {
			// This is what refuses `/documents/templates`: that path holds only a
			// `components/` directory, has no page.tsx, and 404s in production
			// today. A tile pointing at it would be a dead door reading as a
			// shipped feature.
			expect(existsSync(join(cwd, OWNER_ROOT + href, "page.tsx"))).toBe(true);
		},
	);

	it("points no entry at the index itself", () => {
		const selfLinks = DOCUMENTS_HUB_ENTRIES.filter(
			(entry) => entry.href === "/documents",
		).map((entry) => entry.id);
		expect(selfLinks).toEqual([]);
	});

	it("keeps every href under /documents/", () => {
		const strays = DOCUMENTS_HUB_ENTRIES.filter(
			(entry) => !entry.href.startsWith("/documents/"),
		).map((entry) => `${entry.id} -> ${entry.href}`);
		expect(strays).toEqual([]);
	});
});

/** D-04 / D-06: the landing stays a data-free Server Component. */
const HUB_INDEX_FORBIDDEN: readonly { name: string; pattern: RegExp }[] = [
	{ name: 'client directive ("use client")', pattern: /["']use client["']/ },
	{ name: "useQuery", pattern: /\buseQuery\b/ },
	{ name: "useState", pattern: /\buseState\b/ },
	{ name: "useEffect", pattern: /\buseEffect\b/ },
	{ name: "createClient", pattern: /\bcreateClient\b/ },
	{ name: "supabase import", pattern: /from\s+["'][^"']*supabase[^"']*["']/ },
	{ name: "permanentRedirect", pattern: /\bpermanentRedirect\b/ },
	{ name: "redirect", pattern: /\bredirect\b/ },
	{
		name: "next/navigation import",
		pattern: /from\s+["']next\/navigation["']/,
	},
];

/**
 * Paired positives. Without them the whole group passes against an empty file:
 * every absence assertion is vacuously true on zero bytes.
 */
const HUB_INDEX_REQUIRED: readonly string[] = [
	"export default function",
	"<h1",
	'from "./documents-hub-entries"',
	"<DocumentHubTile",
	"Open the vault",
];

const strippedHubIndex = stripComments(
	readFileSync(join(cwd, HUB_INDEX), "utf8"),
);

describe("D-04/D-06 the /documents landing is a Server Component", () => {
	it("actually scanned a non-empty file", () => {
		// Guards against a silently-empty or comment-only scan, which is how this
		// class of test goes vacuous. `reports-hub-purity.test.ts` carries the
		// equivalent self-check for the same reason.
		expect(strippedHubIndex.length).toBeGreaterThan(200);
	});

	it("carries no client directive, hook, database client or navigation redirect", () => {
		expect(matchNames(strippedHubIndex, HUB_INDEX_FORBIDDEN)).toEqual([]);
	});

	it.each(HUB_INDEX_REQUIRED)(
		"still composes the hub: contains %s",
		(needle) => {
			expect(strippedHubIndex).toContain(needle);
		},
	);
});

describe("the purity detector itself fires", () => {
	it.each([
		["client directive", '"use client";'],
		["query hook", "const { data } = useQuery(opts);"],
		["local state", "const [x, setX] = useState(0);"],
		["effect hook", "useEffect(() => {}, []);"],
		["database client", "const supabase = createClient();"],
		[
			"supabase import",
			'import { createBrowserClient } from "#lib/supabase/client";',
		],
		["the reinstated 308", 'permanentRedirect("/documents/vault");'],
		["a soft redirect", 'redirect("/documents/vault");'],
		["navigation import", 'import { redirect } from "next/navigation";'],
	])("flags %s", (_label, source) => {
		expect(matchNames(source, HUB_INDEX_FORBIDDEN).length).toBeGreaterThan(0);
	});

	it("does not flag a comment that merely documents the reversal", () => {
		const source = [
			"// The old file answered with a 308 and named permanentRedirect.",
			"/* It imported redirect from next/navigation and called useState. */",
			"export default function DocumentsPage() {}",
		].join("\n");
		expect(matchNames(stripComments(source), HUB_INDEX_FORBIDDEN)).toEqual([]);
	});
});

describe("SC-2 reversing the 308 adds no redirect anywhere", () => {
	it("leaves the Phase 56 reporting map at exactly 7 entries", () => {
		// The length pin is what stops the /documents assertion below passing on an
		// emptied array. It must be asserted against the array in TypeScript and
		// never against a grep: `grep -c "source:"` over reporting-redirects.ts
		// returns 9, because the `readonly source: string` interface field and a
		// prose "as a source:" in the header both match.
		expect(REPORTING_REDIRECTS).toHaveLength(7);
	});

	it("adds no /documents source or destination", () => {
		const touchesDocuments = REPORTING_REDIRECTS.filter(
			(rule) =>
				rule.source === "/documents" ||
				rule.source.startsWith("/documents/") ||
				rule.destination === "/documents" ||
				rule.destination.startsWith("/documents/"),
		).map((rule) => `${rule.source} -> ${rule.destination}`);
		expect(touchesDocuments).toEqual([]);
	});
});
