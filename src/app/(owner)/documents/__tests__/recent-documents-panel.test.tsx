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

function loadingState() {
	return {
		data: undefined,
		isLoading: true,
		isError: false,
		refetch: vi.fn(),
	};
}

function errorState(refetch: () => void) {
	return {
		data: undefined,
		isLoading: false,
		isError: true,
		error: new Error(DRIVER_ERROR_MESSAGE),
		refetch,
	};
}

function successState(rows: DocumentRow[]) {
	return {
		data: { rows, totalCount: rows.length, page: 0, pageSize: 50 },
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
