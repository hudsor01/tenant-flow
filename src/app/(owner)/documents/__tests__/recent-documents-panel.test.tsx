/**
 * `RecentDocumentsPanel` — the /documents landing's single client island
 * (DOCS-01, D-02, D-03, D-04, D-12; 65-UI-SPEC §I-2/§I-3/§I-6).
 *
 * The load-bearing assertion in this file is the FIRST one. SC-3 says the
 * landing preview and `/documents/vault` "can never disagree", and the whole of
 * that guarantee is that both call `documentSearchQueries.list` with a params
 * object that reduces to exactly `{ page: 0 }`. Anything else — a `limit`, a
 * `staleTime`, an entity filter — forks the cache entry and quietly downgrades
 * the claim to a hope. So the params are pinned with `toEqual`, not
 * `toMatchObject`, and the resulting key literal is spelled out beneath it.
 *
 * `@tanstack/react-query` is mocked at `useQuery` only, which means the factory
 * itself stays REAL and spy-able. No Supabase mock is needed: `createClient()`
 * lives inside the factory's `queryFn`, and a mocked `useQuery` never invokes
 * it. `nuqs` is not mocked either — the panel reads no URL state.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentRow } from "#hooks/api/query-keys/document-keys";
import { documentSearchQueries } from "#hooks/api/query-keys/document-search-keys";
import { RecentDocumentsPanel } from "../recent-documents-panel";

const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", async () => {
	const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
		"@tanstack/react-query",
	);
	return { ...actual, useQuery: () => mockUseQuery() };
});

/**
 * The panel reads the owner's real category labels so it cannot disagree with
 * the vault, which reads the same `documentCategoryQueries.list()` entry. Mocked
 * separately from `useQuery` above so the document-params pin stays exact — the
 * blanket `useQuery` mock would otherwise answer this hook too and make the
 * `toEqual({ page: 0 })` assertion count calls it should not see.
 */
const mockUseDocumentCategories = vi.fn();

vi.mock("#hooks/api/use-document-categories", () => ({
	useDocumentCategories: () => mockUseDocumentCategories(),
}));

/** The raw PostgREST string the panel must never surface (T-65-06). */
const DRIVER_ERROR_MESSAGE = 'PGRST116: relation "documents" does not exist';

let rowSeq = 0;

/**
 * A valid `DocumentRow`. The type is IMPORTED, never redeclared — a local
 * duplicate would be a ZT-3 violation and would also stop compiling the moment
 * the real row shape changes, which is the point of importing it.
 */
function makeRow(overrides: Partial<DocumentRow> = {}): DocumentRow {
	rowSeq += 1;
	return {
		id: `doc-${rowSeq}`,
		entity_type: "property",
		entity_id: "00000000-0000-0000-0000-000000000001",
		document_type: "lease",
		mime_type: "application/pdf",
		file_path: `property/prop-1/${rowSeq}-file.pdf`,
		storage_url: `property/prop-1/${rowSeq}-file.pdf`,
		file_size: 1024,
		title: `Document ${rowSeq}`,
		tags: null,
		description: null,
		owner_user_id: "owner-1",
		created_at: "2026-04-15T00:00:00Z",
		// Deliberately populated: the shared cache entry really does carry live
		// signed URLs, and D-03 says the panel must render none of them.
		signed_url: `https://example.com/signed/${rowSeq}.pdf`,
		...overrides,
	};
}

// The panel branches on `isPending`, not `isLoading` (CR-01). These fixtures
// carry BOTH flags with the real TanStack v5 relationship (`isLoading ===
// isPending && isFetching`) so they stay honest if the component's predicate is
// ever changed back.
function loadingState() {
	return {
		data: undefined,
		isPending: true,
		isLoading: true,
		isError: false,
		refetch: vi.fn(),
	};
}

// Pending but NOT fetching — the state `isLoading` cannot see. Reachable two
// ways in this app: `networkMode: "online"` parks an offline query at
// `fetchStatus: "paused"`, and PersistQueryClientProvider's `isRestoring`
// window forces `fetchStatus: "idle"` on every cold load.
function pausedState() {
	return {
		data: undefined,
		isPending: true,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	};
}

function errorState(refetch: () => void) {
	return {
		data: undefined,
		isPending: false,
		isLoading: false,
		isError: true,
		error: new Error(DRIVER_ERROR_MESSAGE),
		refetch,
	};
}

function successState(rows: DocumentRow[]) {
	return {
		data: { rows, totalCount: rows.length, page: 0, pageSize: 50 },
		isPending: false,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	};
}

function makeRows(count: number): DocumentRow[] {
	return Array.from({ length: count }, () => makeRow());
}

describe("RecentDocumentsPanel — the shared-cache guarantee (SC-3, D-02)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		rowSeq = 0;
		// Default: categories resolved and matching the seed labels, so existing
		// assertions read the same as before the owner-label lookup was added.
		mockUseDocumentCategories.mockReturnValue({
			categories: [],
			isLoading: false,
			isError: false,
		});
	});

	it("calls documentSearchQueries.list with exactly { page: 0 } on every render", () => {
		mockUseQuery.mockReturnValue(successState(makeRows(3)));
		const listSpy = vi.spyOn(documentSearchQueries, "list");
		try {
			render(<RecentDocumentsPanel />);
			expect(listSpy).toHaveBeenCalled();
			// EVERY recorded call, not the last one and not a call count. React may
			// render more than once; pinning the count would be brittle, whereas
			// pinning every argument is the actual contract. `toEqual` is
			// exhaustive — it is what fails when a `limit`, a `staleTime` or a
			// filter key is added, which is exactly the drift SC-3 forbids.
			for (const call of listSpy.mock.calls) {
				expect(call[0]).toEqual({ page: 0 });
			}
		} finally {
			listSpy.mockRestore();
		}
	});

	it("resolves to the vault's default unfiltered cache key, spelled out", () => {
		// `documents-vault.client.tsx:230-239` produces this SAME array in its
		// default unfiltered state: all five of its spreads are empty and
		// `pageParam` is 0, so its params object reduces to `{ page: 0 }` too.
		// This literal is the concrete form of the "cannot disagree" guarantee —
		// if the factory's key shape ever changes, this fails and forces the
		// claim to be re-verified rather than silently weakened.
		expect(documentSearchQueries.list({ page: 0 }).queryKey).toEqual([
			"documents",
			"search",
			"",
			null,
			null,
			null,
			null,
			0,
		]);
	});
});

describe("RecentDocumentsPanel — the four states (§I-3)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		rowSeq = 0;
		// Default: categories resolved and matching the seed labels, so existing
		// assertions read the same as before the owner-label lookup was added.
		mockUseDocumentCategories.mockReturnValue({
			categories: [],
			isLoading: false,
			isError: false,
		});
	});

	it("renders exactly five skeleton rows while loading, never a spinner", () => {
		mockUseQuery.mockReturnValue(loadingState());
		const { container } = render(<RecentDocumentsPanel />);
		// `Skeleton` sets `data-slot="skeleton"` — a stable hook independent of
		// CSS class drift, and the same selector `documents-vault.test.tsx:232`
		// uses.
		expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
			5,
		);
		// Paired so the count above is provably not being taken from an empty
		// tree, plus the §I-3 "never a spinner" rule.
		expect(screen.getByText("Recently added")).toBeInTheDocument();
		expect(container.querySelectorAll(".animate-spin")).toHaveLength(0);
	});

	// CR-01. The empty copy is a positive claim — "you have no documents" — and a
	// pending-but-paused query has not earned it. `isLoading` is false here, so
	// branching on it renders RecentEmpty with no error and no Retry: permanently
	// while offline, and as a flash on every cold load during cache restore.
	it("shows skeletons, never the empty copy, while pending but not fetching", () => {
		mockUseQuery.mockReturnValue(pausedState());
		const { container } = render(<RecentDocumentsPanel />);
		expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
			5,
		);
		expect(screen.queryByText("No documents yet")).not.toBeInTheDocument();
	});

	// Perfect-PR cycle 1 (second frozen state). globals.css:517-524 declares
	// unscoped `ul, ol { margin: 1rem 0; padding-left: 1.5rem }` and
	// `li { margin-bottom: 0.25rem }` in @layer base. Tailwind v4 preflight resets
	// only `list-style` for lists and ships no universal margin/padding reset, so
	// that base rule wins and indents the rows 24px out of alignment with the
	// panel's own label and footer link. jsdom loads no stylesheet, so this pins
	// the neutralizing classes rather than a measured offset.
	it("neutralizes the global ul indent without defeating the spacing rungs", () => {
		mockUseQuery.mockReturnValue(successState(makeRows(3)));
		const { container } = render(<RecentDocumentsPanel />);
		const list = container.querySelector("ul");
		const cls = list?.getAttribute("class")?.split(/\s+/) ?? [];

		// Kills the base rule's 24px indent and its top margin.
		expect(cls).toContain("pl-0");
		expect(cls).toContain("mt-0");
		// Kills the base `li { margin-bottom: .25rem }` bleed.
		expect(cls).toContain("[&>li]:mb-0");

		// The two anti-regressions, and the reason this list uses gap rather than
		// space-y. Tailwind v4 compiles space utilities inside `:where()`, making
		// them specificity-0, so BOTH of the neutralizing utilities above would
		// outrank them:
		//   :where(.space-y-1>:not(:last-child))  (0,0,0)
		//   .[&>li]:mb-0>li                       (0,1,1)  -> row rhythm becomes 0
		//   :where(.space-y-4>:not(:last-child))  (0,0,0)  on this <ul>
		//   .my-0                                 (0,1,0)  -> footer link goes flush
		// `gap` is not a margin so it cannot be beaten by a margin override, and
		// `mt-0` leaves the parent's space-y-4 bottom margin alone.
		expect(cls).toContain("gap-1");
		expect(cls).not.toContain("space-y-1");
		expect(cls).not.toContain("my-0");
	});

	// Perfect-PR cycle 1. §I-2 calls for a truncating title, but `truncate` alone
	// on ItemTitle is INERT: the primitive is `flex w-fit` (item.tsx:118-128), and
	// text-overflow:ellipsis does not apply to a flex container's anonymous text
	// child, while w-fit sizes the box to its text so overflow:hidden never clips.
	// The parent ItemContent is `flex flex-1` with no min-width, so the line cannot
	// shrink either. A ~100-char file_path (rendered whenever title is null, which
	// the schema allows) then overflowed the card and scrolled the page sideways.
	//
	// jsdom runs no layout engine, so this pins the CLASS CONTRACT that produces
	// truncation rather than the rendered ellipsis. Stated plainly so the test is
	// not mistaken for a visual assertion.
	describe("long titles can actually truncate (§I-2)", () => {
		const LONG_PATH =
			"maintenance_request/9f3c1e2a-1b4d-4c5e-8f2a-0d7b6c5a4e31/1754236800000-inspection-report-final-v3.pdf";

		it("gives the title a block box that can shrink and clip", () => {
			mockUseQuery.mockReturnValue(
				successState([makeRow({ title: null, file_path: LONG_PATH })]),
			);
			const { container } = render(<RecentDocumentsPanel />);

			const title = container.querySelector('[data-slot="item-title"]');
			expect(title).not.toBeNull();
			const cls = title?.getAttribute("class") ?? "";

			// Present: the combination that makes truncation effective.
			for (const required of ["truncate", "block", "w-full", "min-w-0"]) {
				expect(cls.split(/\s+/)).toContain(required);
			}
			// Absent: the two primitive defaults that made `truncate` inert.
			expect(cls.split(/\s+/)).not.toContain("flex");
			expect(cls.split(/\s+/)).not.toContain("w-fit");
		});

		it("lets the content column shrink below its min-content width", () => {
			mockUseQuery.mockReturnValue(
				successState([makeRow({ title: null, file_path: LONG_PATH })]),
			);
			const { container } = render(<RecentDocumentsPanel />);
			const content = container.querySelector('[data-slot="item-content"]');
			expect(content?.getAttribute("class")?.split(/\s+/)).toContain("min-w-0");
		});

		// Non-vacuity: the fallback path this guards must really be reachable —
		// documents.title is nullable while file_path is NOT NULL.
		it("renders the file_path when title is null", () => {
			mockUseQuery.mockReturnValue(
				successState([makeRow({ title: null, file_path: LONG_PATH })]),
			);
			const { container } = render(<RecentDocumentsPanel />);
			expect(container.textContent).toContain(LONG_PATH);
		});
	});

	// Perfect-PR cycle 1 (third frozen state). `document_categories.label` is
	// mutable for every row including the seeded defaults — update() gates on
	// ownership only, with no is_default guard — and the vault reads that table
	// (documents-vault.client.tsx:168). A panel reading the static seed map would
	// show "Insurance · 3 days ago" while the vault filter and the upload Select
	// showed "Insurance Certificates", in the same session, for the same document.
	describe("category labels come from the owner's table, not the seed map", () => {
		it("uses a renamed default category's label", () => {
			mockUseDocumentCategories.mockReturnValue({
				categories: [
					{ slug: "insurance", label: "Insurance Certificates" },
					{ slug: "lease", label: "Lease" },
				],
				isLoading: false,
				isError: false,
			});
			mockUseQuery.mockReturnValue(
				successState([makeRow({ document_type: "insurance" })]),
			);
			const { container } = render(<RecentDocumentsPanel />);
			expect(container.textContent).toContain("Insurance Certificates");
		});

		it("uses a custom slug's label instead of the prettifier", () => {
			mockUseDocumentCategories.mockReturnValue({
				categories: [{ slug: "hoa_dues", label: "HOA Dues" }],
				isLoading: false,
				isError: false,
			});
			mockUseQuery.mockReturnValue(
				successState([makeRow({ document_type: "hoa_dues" })]),
			);
			const { container } = render(<RecentDocumentsPanel />);
			expect(container.textContent).toContain("HOA Dues");
			// The prettifier's output, which is what the static map fell back to.
			expect(container.textContent).not.toContain("Hoa dues");
		});

		// Rows must not be withheld while categories load — the label is decoration
		// on a metadata line, so it degrades to the seed default and then the
		// prettifier rather than gating the list.
		it("still renders rows with a fallback label while categories are pending", () => {
			mockUseDocumentCategories.mockReturnValue({
				categories: [],
				isLoading: true,
				isError: false,
			});
			mockUseQuery.mockReturnValue(
				successState([makeRow({ title: "Q1 Lease", document_type: "lease" })]),
			);
			const { container } = render(<RecentDocumentsPanel />);
			expect(container.textContent).toContain("Q1 Lease");
			expect(container.textContent).toContain("Lease");
		});
	});

	// WR-02. Category slugs are owner-created and the validating regex
	// /^[a-z0-9_]+$/ admits these two, which resolve off Object.prototype on a
	// bare index read — putting the Object constructor or [object Object] into a
	// landlord's document list.
	it.each(["__proto__", "constructor"])(
		"falls back to the prettifier for the prototype-chain slug %s",
		(slug) => {
			mockUseQuery.mockReturnValue(
				successState([makeRow({ document_type: slug })]),
			);
			const { container } = render(<RecentDocumentsPanel />);
			expect(container.textContent).not.toContain("[object Object]");
			expect(container.textContent).not.toContain("native code");
		},
	);

	it("renders the D-12 empty copy and names no entity type", () => {
		mockUseQuery.mockReturnValue(successState([]));
		const { container } = render(<RecentDocumentsPanel />);

		expect(screen.getByText("No documents yet")).toBeInTheDocument();
		const description = screen.getByText(
			"Documents you upload appear here, newest first.",
		);
		expect(description).toBeInTheDocument();

		// The guard with teeth. The SUPERSEDED copy read "Upload documents from
		// any property, lease, tenant, or maintenance record …" — an enumeration
		// that named four of the five entity types and renamed one. D-12 dropped
		// the enumeration precisely so there is no drift surface; this assertion
		// is what stops it being reintroduced.
		expect(description.textContent ?? "").not.toMatch(
			/\b(property|properties|lease|tenant|maintenance|inspection)\b/i,
		);

		// §I-3: the empty state carries NO CTA — the vault's own primary button
		// sits 24px above it.
		expect(container.querySelectorAll("a")).toHaveLength(0);
		expect(container.querySelectorAll("button")).toHaveLength(0);
	});

	it("renders inline error copy plus a working Retry, and leaks no driver string", () => {
		const refetch = vi.fn();
		mockUseQuery.mockReturnValue(errorState(refetch));
		const { container } = render(<RecentDocumentsPanel />);

		expect(
			screen.getByText("Couldn't load recent documents."),
		).toBeInTheDocument();

		const retry = screen.getByRole("button", { name: /retry/i });
		fireEvent.click(retry);
		expect(refetch).toHaveBeenCalledTimes(1);

		// T-65-06: `handlePostgrestError` captures to Sentry and rethrows WITHOUT
		// a toast, so this panel's own copy is the ENTIRE user-facing surface for
		// a failed load. Rendering anything off the error object would put a
		// PostgREST driver string in front of a landlord.
		expect(container.textContent ?? "").not.toContain("PGRST116");
		expect(container.textContent ?? "").not.toContain(DRIVER_ERROR_MESSAGE);
	});
});

describe("RecentDocumentsPanel — the success state", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		rowSeq = 0;
		// Default: categories resolved and matching the seed labels, so existing
		// assertions read the same as before the owner-label lookup was added.
		mockUseDocumentCategories.mockReturnValue({
			categories: [],
			isLoading: false,
			isError: false,
		});
	});

	it("shows the first five rows in server order and drops the rest", () => {
		mockUseQuery.mockReturnValue(successState(makeRows(12)));
		const { container } = render(<RecentDocumentsPanel />);

		const items = Array.from(container.querySelectorAll("li"));
		expect(items).toHaveLength(5);
		// `search_documents` orders `created_at desc` in SQL, so "newest first"
		// is already true on arrival. Re-sorting client-side would be a second
		// ordering opinion competing with the vault's.
		expect(items[0]?.textContent).toContain("Document 1");
		expect(items[4]?.textContent).toContain("Document 5");
		expect(screen.queryByText("Document 6")).not.toBeInTheDocument();
	});

	it("renders rows as non-interactive previews — no link, no button, no href (D-03)", () => {
		mockUseQuery.mockReturnValue(successState(makeRows(12)));
		const { container } = render(<RecentDocumentsPanel />);

		// Paired with the length-5 assertion so the selectors below are provably
		// scanning a POPULATED tree rather than passing vacuously.
		expect(container.querySelectorAll("li")).toHaveLength(5);
		expect(container.querySelectorAll("li a, li button")).toHaveLength(0);
		// T-65-03: the shared cache entry carries 1-hour signed URLs for up to 50
		// documents. A row that rendered one would be a second file-access path
		// competing with the vault's.
		expect(container.querySelectorAll("li [href]")).toHaveLength(0);
	});

	it("offers exactly one door: View all documents -> /documents/vault", () => {
		mockUseQuery.mockReturnValue(successState(makeRows(12)));
		const { container } = render(<RecentDocumentsPanel />);

		const links = Array.from(container.querySelectorAll("a"));
		expect(links).toHaveLength(1);
		const viewAll = screen.getByRole("link", { name: "View all documents" });
		expect(viewAll).toHaveAttribute("href", "/documents/vault");
	});

	it("escapes an injection payload in a document title (T-65-05)", () => {
		const payload = '<img src=x onerror="alert(1)">';
		mockUseQuery.mockReturnValue(successState([makeRow({ title: payload })]));
		const { container } = render(<RecentDocumentsPanel />);

		// Document titles are owner-supplied. React escapes text children and no
		// `dangerouslySetInnerHTML` enters this file, so the payload must appear
		// as literal text and produce no element.
		expect(container.querySelector("img")).toBeNull();
		expect(screen.getByText(payload)).toBeInTheDocument();
	});
});
