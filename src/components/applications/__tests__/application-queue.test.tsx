/**
 * `ApplicationQueue` — the owner review queue (APPLY-03, UI-SPEC §B-2/§B-3/§B-4).
 *
 * WHAT THIS FILE DOES NOT PROVE. jsdom computes no layout and loads no
 * stylesheet, so nothing here decides geometry, computed style or the cascade.
 * Specifically NOT decided here and owned by plan 66-17's Playwright spec:
 *
 *   E-17  queue row height and non-overlap at 375px
 *   E-18  the row link's computed `text-decoration-line` and `color`
 *   E-20  the `<ul>`'s computed `padding-left` and its first `<li>`'s margin
 *
 * That split is not pedantry. §D-1 is a real unlayered `@media (max-width:768px)`
 * block that outranks every Tailwind utility at 768px and below, and §D-4 is a
 * `truncate` that is INERT on the primitive it is written on — both are cases
 * where the class is present and spelled correctly and the rendered result is
 * still wrong. Phase 65 shipped two defects of exactly that shape. So the one
 * class-contract test below is labelled as a deletion guard and nothing more.
 *
 * EVERY ABSENCE ASSERTION CARRIES A POSITIVE CONTROL in the same test. "No
 * create-a-link button is present" and "the word Rejected does not appear" both
 * pass against an empty render, a crashed render and a mistyped selector, so
 * each is paired with a query that must find something first.
 *
 * `useQuery` is mocked and dispatches on the query key's root, because the
 * component issues two reads — the rows and the unit-filter options — and a
 * blanket mock would answer both with the same object. The `queryOptions()`
 * factories themselves stay REAL and spy-able, which is what makes the
 * pagination and query-key assertions mean anything. No Supabase mock is needed:
 * `createClient()` lives inside each factory's `queryFn`, and a mocked
 * `useQuery` never invokes it.
 */

import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	APPLICATIONS_PAGE_SIZE,
	type ApplicationSummaryRow,
	applicationKeys,
	applicationQueries,
} from "#hooks/api/query-keys/application-keys";
import { ApplicationQueue } from "../application-queue";

const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", async () => {
	const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
		"@tanstack/react-query",
	);
	return {
		...actual,
		useQuery: (options: { queryKey: readonly unknown[] }) =>
			mockUseQuery(options),
	};
});

/** The raw PostgREST string the queue must never surface (T-66-43). */
const DRIVER_ERROR_MESSAGE =
	'PGRST205: Could not find the table "public.rental_applications"';

interface QueryResult {
	data: unknown;
	isPending: boolean;
	isLoading: boolean;
	isError: boolean;
	error?: Error;
	refetch: () => void;
}

/**
 * Route the applications read to `state` and the unit-filter read to an empty
 * property list. The root segment is the discriminator: `applicationKeys.all` is
 * `["applications"]` and `propertyQueries.lists()` starts at `"properties"`.
 */
function mockQueries(state: QueryResult) {
	mockUseQuery.mockImplementation(
		(options: { queryKey: readonly unknown[] }) =>
			options.queryKey[0] === "applications"
				? state
				: {
						data: { data: [] },
						isPending: false,
						isLoading: false,
						isError: false,
						refetch: vi.fn(),
					},
	);
}

let rowSeq = 0;

/**
 * A valid `ApplicationSummaryRow`. The type is IMPORTED, never redeclared — a
 * local duplicate would be a ZT-3 violation and would stop tracking the real
 * eleven-column contract the moment plan 66-09's `Pick` changes.
 */
function makeRow(
	overrides: Partial<ApplicationSummaryRow> = {},
): ApplicationSummaryRow {
	rowSeq += 1;
	const suffix = String(rowSeq).padStart(12, "0");
	return {
		id: `00000000-0000-4000-8000-${suffix}`,
		owner_user_id: "00000000-0000-4000-8000-0000000000ff",
		unit_id: `unit-${rowSeq}`,
		property_label: "Pecan Street Duplex",
		unit_label: "A",
		status: "new",
		created_at: "2026-08-01T00:00:00Z",
		applicant_first_name: "Dana",
		applicant_last_name: `Reyes${rowSeq}`,
		applicant_email: `dana${rowSeq}@example.com`,
		anonymized_at: null,
		...overrides,
	};
}

function makeRows(count: number): ApplicationSummaryRow[] {
	return Array.from({ length: count }, () => makeRow());
}

// The component branches on `isPending`, not on the flag derived from it. These
// fixtures carry BOTH with the real TanStack v5 relationship
// (`isLoading === isPending && isFetching`) so they stay honest if the
// component's predicate is ever changed back.
function loadingState(): QueryResult {
	return {
		data: undefined,
		isPending: true,
		isLoading: true,
		isError: false,
		refetch: vi.fn(),
	};
}

/** Pending but NOT fetching — the state the derived flag cannot see. */
function pausedState(): QueryResult {
	return {
		data: undefined,
		isPending: true,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	};
}

function errorState(refetch: () => void): QueryResult {
	return {
		data: undefined,
		isPending: false,
		isLoading: false,
		isError: true,
		error: new Error(DRIVER_ERROR_MESSAGE),
		refetch,
	};
}

function successState(
	rows: ApplicationSummaryRow[],
	total: number,
): QueryResult {
	return {
		data: { rows, total },
		isPending: false,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	};
}

/**
 * Radix activates a tab on `mousedown`, not on `click` — its Trigger composes
 * `onMouseDown` (react-tabs/dist/index.mjs:121), so `fireEvent.click` alone
 * changes nothing and a test written that way would pass for the wrong reason.
 */
function selectTab(name: string) {
	fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

/** The pager line, read as one string so the total cannot be matched loosely. */
function pagerText(): string {
	return screen.getByText(/^Showing /).textContent ?? "";
}

beforeEach(() => {
	vi.clearAllMocks();
	rowSeq = 0;
});

afterEach(() => {
	cleanup();
});

describe("ApplicationQueue — the pager reports the corpus, not the page", () => {
	// T-66-35. The fixture is deliberately a FULL page (25 rows) against a total
	// of 57, so "of 57" and "of 25" are different strings and the assertion has
	// teeth. A pager sourcing its total from the loaded slice renders "of 25"
	// here and stays wrong forever from page two onward, where Next never enables.
	it("reads the total from the count header rather than the loaded slice", () => {
		mockQueries(successState(makeRows(APPLICATIONS_PAGE_SIZE), 57));
		render(<ApplicationQueue />);

		// Positive control: the rows really are on screen, so the pager below is
		// provably being read out of a populated tree.
		expect(screen.getAllByRole("listitem")).toHaveLength(
			APPLICATIONS_PAGE_SIZE,
		);
		expect(pagerText()).toBe("Showing 1–25 of 57");
	});

	it("asks plan 66-09 for page 1, which is the .range(25, 49) slice", () => {
		mockQueries(successState(makeRows(APPLICATIONS_PAGE_SIZE), 57));
		const listSpy = vi.spyOn(applicationQueries, "list");
		try {
			render(<ApplicationQueue />);
			expect(listSpy.mock.calls.at(-1)?.[0]).toEqual({ page: 0 });

			fireEvent.click(screen.getByRole("button", { name: "Next" }));

			// The filters object is what this component owns; the `.range()` call it
			// turns into belongs to `applicationQueries.list` and is tested there.
			// The page size is asserted alongside it because that constant is the
			// entire mapping from `{ page: 1 }` to rows 25 through 49.
			expect(listSpy.mock.calls.at(-1)?.[0]).toEqual({ page: 1 });
			expect(APPLICATIONS_PAGE_SIZE).toBe(25);
			expect(pagerText()).toBe("Showing 26–50 of 57");
		} finally {
			listSpy.mockRestore();
		}
	});

	// The branch where a naive `from + pageSize - 1` prints "Showing 51-75 of 57"
	// and tells the owner about eighteen applications that do not exist.
	it("clamps the last page's upper bound to the total", () => {
		mockQueries(successState(makeRows(APPLICATIONS_PAGE_SIZE), 57));
		render(<ApplicationQueue />);

		fireEvent.click(screen.getByRole("button", { name: "Next" }));
		fireEvent.click(screen.getByRole("button", { name: "Next" }));

		expect(pagerText()).toBe("Showing 51–57 of 57");
		expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
	});

	it("disables Previous on the first page and Next on a single-page corpus", () => {
		mockQueries(successState(makeRows(3), 3));
		render(<ApplicationQueue />);

		expect(pagerText()).toBe("Showing 1–3 of 3");
		expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
	});
});

describe("ApplicationQueue — filters drive the query key", () => {
	it("moves to a different cache entry when the status tab changes", () => {
		mockQueries(successState(makeRows(3), 3));
		const listSpy = vi.spyOn(applicationQueries, "list");
		try {
			render(<ApplicationQueue />);
			const before = listSpy.mock.results.at(-1)?.value.queryKey;

			selectTab("Declined");

			const after = listSpy.mock.results.at(-1)?.value.queryKey;
			// A refetch is not the claim. The claim is that the two renders address
			// two DIFFERENT cache entries, which is what stops the filtered view from
			// serving the unfiltered rows out of cache.
			expect(before).not.toEqual(after);
			expect(after).toEqual(
				applicationKeys.list({ page: 0, status: "rejected" }),
			);
			// UI-14 in the key layer: the tab says "Declined", the column says
			// `rejected`, and the query must send the column value.
			expect(JSON.stringify(after)).toContain("rejected");
		} finally {
			listSpy.mockRestore();
		}
	});

	it("returns to page 0 when a filter changes", () => {
		mockQueries(successState(makeRows(APPLICATIONS_PAGE_SIZE), 57));
		const listSpy = vi.spyOn(applicationQueries, "list");
		try {
			render(<ApplicationQueue />);
			fireEvent.click(screen.getByRole("button", { name: "Next" }));
			expect(listSpy.mock.calls.at(-1)?.[0]).toEqual({ page: 1 });

			selectTab("Approved");

			// Page 3 of the unfiltered corpus is routinely past the end of a filtered
			// one; keeping the index would show an empty list whose only escape is
			// Previous.
			expect(listSpy.mock.calls.at(-1)?.[0]).toEqual({
				page: 0,
				status: "approved",
			});
		} finally {
			listSpy.mockRestore();
		}
	});
});

describe("ApplicationQueue — the two empty states are not the same state", () => {
	it("offers the action that fixes it when the owner has no applications", () => {
		mockQueries(successState([], 0));
		render(<ApplicationQueue />);

		expect(screen.getByText("No applications yet")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Create an application link" }),
		).toBeInTheDocument();
		expect(
			screen.queryByText("No applications match this filter"),
		).not.toBeInTheDocument();
	});

	it("offers no action when the emptiness is the filter's doing", () => {
		mockQueries(successState([], 0));
		render(<ApplicationQueue />);

		selectTab("Approved");

		// Positive controls first: the tab really moved and the filtered copy really
		// rendered. Without these the absence assertion below would also pass on a
		// render that threw.
		expect(screen.getByRole("tab", { name: "Approved" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(
			screen.getByText("No applications match this filter"),
		).toBeInTheDocument();

		// The whole point of the second branch. Offering "create a link" to an owner
		// who has applications and merely filtered them out is the wrong action, and
		// it reads as though their applications had been lost.
		expect(
			screen.queryByRole("button", { name: "Create an application link" }),
		).not.toBeInTheDocument();
		expect(screen.queryByText("No applications yet")).not.toBeInTheDocument();
	});

	it("renders no pager when there is nothing to page through", () => {
		mockQueries(successState([], 0));
		render(<ApplicationQueue />);

		expect(screen.getByText("No applications yet")).toBeInTheDocument();
		expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument();
	});
});

describe("ApplicationQueue — loading and failure", () => {
	it("renders five skeleton rows while loading, never a spinner", () => {
		mockQueries(loadingState());
		const { container } = render(<ApplicationQueue />);

		expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
			5,
		);
		expect(container.querySelectorAll(".animate-spin")).toHaveLength(0);
		expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument();
	});

	// The empty copy is a positive claim about the owner's data, and a query that
	// is pending but not in flight has not earned it. Reachable twice in this app:
	// `networkMode: "online"` parks an offline query at a paused fetch status, and
	// PersistQueryClientProvider mounts from an async effect, so every cold load
	// passes through a restore window that forces an idle fetch status.
	it("shows skeletons, never the empty copy, while pending but not fetching", () => {
		mockQueries(pausedState());
		const { container } = render(<ApplicationQueue />);

		expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
			5,
		);
		expect(screen.queryByText("No applications yet")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Create an application link" }),
		).not.toBeInTheDocument();
	});

	it("renders an inline retry and leaks no PostgREST string", () => {
		const refetch = vi.fn();
		mockQueries(errorState(refetch));
		const { container } = render(<ApplicationQueue />);

		expect(screen.getByText("Couldn't load applications.")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Retry" }));
		expect(refetch).toHaveBeenCalledTimes(1);

		// T-66-43. `handlePostgrestError` captures to Sentry and rethrows without a
		// toast, so this component's own copy is the ENTIRE user-facing surface for
		// a failed load. Anything rendered off the error object puts a schema name
		// and a driver code in front of a landlord.
		expect(container.textContent ?? "").not.toContain("PGRST");
		expect(container.textContent ?? "").not.toContain(DRIVER_ERROR_MESSAGE);
	});
});

describe("ApplicationQueue — the rows", () => {
	it("links each row to its own detail route and nowhere else", () => {
		const rows = makeRows(3);
		mockQueries(successState(rows, 3));
		render(<ApplicationQueue />);

		const links = screen.getAllByRole("link");
		expect(links).toHaveLength(3);
		rows.forEach((row, index) => {
			expect(links[index]).toHaveAttribute("href", `/applications/${row.id}`);
		});
	});

	// UI-14. The column value stays `rejected` because D-07 locks the CHECK
	// constraint; the word an owner reads is "Declined". A naive `{row.status}`
	// render shows "rejected" and a naive capitalisation shows "Rejected".
	it("labels a rejected row Declined, never Rejected", () => {
		mockQueries(
			successState(
				[makeRow({ status: "rejected", applicant_last_name: "Okafor" })],
				1,
			),
		);
		const { container } = render(<ApplicationQueue />);

		// POSITIVE CONTROL. The absence assertion at the bottom passes against an
		// empty list, so the declined row has to be proven on screen first.
		const row = screen.getByRole("listitem");
		expect(within(row).getByText(/Okafor/)).toBeInTheDocument();
		// Scoped to the row: "Declined" is also a tab label, so an unscoped query
		// would match the filter control instead of the chip.
		expect(within(row).getByText("Declined")).toBeInTheDocument();
		expect(container.textContent ?? "").not.toContain("Rejected");
	});

	it("renders the property, unit and relative date on the meta line", () => {
		mockQueries(
			successState(
				[
					makeRow({
						property_label: "Pecan Street Duplex",
						unit_label: "B",
						created_at: new Date().toISOString(),
					}),
				],
				1,
			),
		);
		const { container } = render(<ApplicationQueue />);

		const meta = container.querySelector('[data-slot="item-description"]');
		expect(meta?.textContent).toBe("Pecan Street Duplex · Unit B · Today");
	});

	it("drops the unit segment rather than rendering a dangling separator", () => {
		mockQueries(
			successState(
				[makeRow({ unit_label: null, created_at: new Date().toISOString() })],
				1,
			),
		);
		const { container } = render(<ApplicationQueue />);

		const meta = container.querySelector('[data-slot="item-description"]');
		expect(meta?.textContent).toBe("Pecan Street Duplex · Today");
		expect(meta?.textContent).not.toContain("· ·");
	});

	// T-66-09. Applicant names are attacker-controlled free text rendered inside a
	// logged-in dashboard. React escapes text children and no HTML is constructed
	// from applicant strings anywhere in this component.
	it("escapes an injection payload in an applicant name", () => {
		const payload = '<img src=x onerror="alert(1)">';
		mockQueries(successState([makeRow({ applicant_first_name: payload })], 1));
		const { container } = render(<ApplicationQueue />);

		expect(container.querySelector("img")).toBeNull();
		expect(screen.getByText(new RegExp("onerror"))).toBeInTheDocument();
	});
});

/**
 * A DELETION GUARD, NOT A LAYOUT ASSERTION. Every class below neutralizes a real
 * unscoped `@layer base` rule in globals.css, and jsdom loads no stylesheet, so
 * this proves only that the class survives an edit — not that the cascade
 * resolved. The computed values are plan 66-17's E-18 and E-20, and that
 * distinction is the whole reason those two rows exist in UI-SPEC §E.
 */
describe("ApplicationQueue — base-rule neutralizers survive (spelling only)", () => {
	it("keeps the four classes that stop the base rules from reaching the queue", () => {
		mockQueries(successState(makeRows(2), 2));
		const { container } = render(<ApplicationQueue />);

		const list = container.querySelector("ul");
		const listClasses = list?.getAttribute("class")?.split(/\s+/) ?? [];
		// globals.css:517-524 — `ul, ol { margin: 1rem 0; padding-left: 1.5rem }`
		// and `li { margin-bottom: 0.25rem }`.
		expect(listClasses).toContain("pl-0");
		expect(listClasses).toContain("mt-0");
		expect(listClasses).toContain("[&>li]:mb-0");
		// `gap`, not a margin-based rung: the `[&>li]:mb-0` above is (0,1,1) and
		// would outrank a specificity-0 `:where()` margin rule, flattening the row
		// rhythm to zero (§D-2).
		expect(listClasses).toContain("gap-2");

		// globals.css:504 — the base `a` rule sets `color: var(--color-primary)`
		// plus an underline that becomes visible on hover. Either class missing is
		// a visible defect: an accent-blue row, or a hover underline spanning it.
		const link = screen.getAllByRole("link")[0];
		const linkClasses = link?.getAttribute("class")?.split(/\s+/) ?? [];
		expect(linkClasses).toContain("no-underline");
		expect(linkClasses).toContain("text-foreground");

		// §D-4. `truncate` is inert on ItemTitle's `flex w-fit` box, so the block
		// box and BOTH `min-w-0`s are what actually make it fire.
		const title = container.querySelector('[data-slot="item-title"]');
		const titleClasses = title?.getAttribute("class")?.split(/\s+/) ?? [];
		for (const required of ["truncate", "block", "w-full", "min-w-0"]) {
			expect(titleClasses).toContain(required);
		}
		expect(titleClasses).not.toContain("w-fit");
		const content = container.querySelector('[data-slot="item-content"]');
		expect(content?.getAttribute("class")?.split(/\s+/) ?? []).toContain(
			"min-w-0",
		);
	});
});
