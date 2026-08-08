/**
 * `ApplicationLinkPanel` — the owner link surface (APPLY-01, UI-SPEC §C).
 *
 * WHAT THIS FILE DOES NOT PROVE. jsdom computes no layout and loads no
 * stylesheet, so nothing here decides geometry, computed style or the cascade.
 * E-19 — the URL field visible with a non-empty value on a SECOND real page load
 * — belongs to plan 66-17's Playwright spec. What this file proves is the
 * component-level half of the same property: the value survives an unmount and a
 * re-render against unchanged data, which is the assertion a `/sign`-style
 * reveal-once port is the only implementation to fail.
 *
 * EVERY ABSENCE ASSERTION CARRIES A POSITIVE CONTROL in the same test. "No
 * Create link button is present" and "the word Expired does not appear" both pass
 * against an empty render, a crashed render and a mistyped selector, so each is
 * paired with a query that must find something first — and the revoked-state test
 * renders the ACTIVE state first, in the same test, so a panel that renders
 * nothing at all cannot reach the assertion.
 *
 * THE URL IS ASSERTED AGAINST A LITERAL, never against a string this file
 * rebuilds the way the component does. `NEXT_PUBLIC_APP_URL` is forced to a host
 * jsdom does not serve, so a URL assembled from the browser's own origin fails
 * (66-RESEARCH Pitfall 1 / T-66-44): the submit Edge Function's CORS check is an
 * exact comparison against that variable, so an origin-derived link works for the
 * owner who copied it and fails for every applicant, silently.
 *
 * `useQuery` is mocked and dispatches on the query key's root, because the panel
 * issues two reads — the links and the units — and a blanket mock would answer
 * both with the same object. `useMutation` dispatches on the mutation key's leaf
 * so the create and revoke calls stay distinguishable. No Supabase mock is
 * needed: `createClient()` lives inside each factory's `queryFn`, and a mocked
 * `useQuery` never invokes it.
 */

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApplicationsPage from "#app/(owner)/applications/page";
import type { ApplicationLinkRow } from "#hooks/api/query-keys/application-link-keys";
import { ApplicationLinkPanel } from "../application-link-panel";

const {
	mockUseQuery,
	createMutate,
	revokeMutate,
	toastSuccess,
	toastError,
	writeText,
} = vi.hoisted(() => ({
	mockUseQuery: vi.fn(),
	createMutate: vi.fn(),
	revokeMutate: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
	writeText: vi.fn(() => Promise.resolve()),
}));

vi.mock("@tanstack/react-query", async () => {
	const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
		"@tanstack/react-query",
	);
	// A real client, so the mutation-option factories under test receive the type
	// they actually take rather than a stub that happens to typecheck.
	const client = new actual.QueryClient();
	return {
		...actual,
		useQuery: (options: { queryKey: readonly unknown[] }) =>
			mockUseQuery(options),
		useMutation: (options: { mutationKey?: readonly unknown[] }) => ({
			mutate:
				options.mutationKey?.[2] === "createLink" ? createMutate : revokeMutate,
			isPending: false,
		}),
		useQueryClient: () => client,
	};
});

vi.mock("sonner", () => ({
	toast: { success: toastSuccess, error: toastError },
}));

/**
 * A host jsdom does not serve. The whole point: `window.location.origin` here is
 * `http://localhost:3000`, so any URL built from it is a different string.
 */
const APP_URL = "https://tenantflow.app";
const RAW_TOKEN = "abc123";
/**
 * Written out in full, deliberately. A `${APP_URL}/apply/${RAW_TOKEN}` template
 * would rebuild the URL exactly the way the component does and would therefore
 * agree with it even when both are wrong.
 */
const EXPECTED_URL = "https://tenantflow.app/apply/abc123";

const LINK_ID = "00000000-0000-4000-8000-0000000000f1";
const UNIT_ID = "00000000-0000-4000-8000-0000000000c1";
const UNIT_LABEL = "Pecan Street Duplex · Unit A";

interface QueryResult {
	data: unknown;
	isPending: boolean;
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
}

/**
 * The unit shape the panel actually reads. Deliberately NOT the generated
 * `Property & { units: Unit[] }`: the panel touches exactly three fields, the
 * mocked `useQuery` erases the type on the way through regardless, and a
 * thirty-field literal would be noise that proves nothing. The real contract is
 * held by `propertyQueries.listWithDetails()`'s own return type at the call site.
 */
interface UnitFixture {
	id: string;
	unit_number: string;
}

function propertiesState(
	units: UnitFixture[] = [{ id: UNIT_ID, unit_number: "A" }],
): QueryResult {
	return {
		data: { data: [{ name: "Pecan Street Duplex", units }] },
		isPending: false,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	};
}

/** `ApplicationLinkRow` is IMPORTED, never redeclared — a local duplicate would
 * be a ZT-3 violation and would stop tracking plan 66-09's `Pick` contract. */
function makeLink(
	overrides: Partial<ApplicationLinkRow> = {},
): ApplicationLinkRow {
	return {
		id: LINK_ID,
		unit_id: UNIT_ID,
		raw_token: RAW_TOKEN,
		// Far enough out that "active" holds whenever this suite runs, and a fixed
		// UTC date so the rendered expiry text is deterministic.
		expires_at: "2126-10-06T12:00:00.000Z",
		revoked_at: null,
		submission_count: 0,
		created_at: "2026-08-07T12:00:00.000Z",
		...overrides,
	};
}

function linksState(rows: ApplicationLinkRow[]): QueryResult {
	return {
		data: rows,
		isPending: false,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	};
}

// The panel branches on `isPending`, not on the flag derived from it. These
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
		refetch,
	};
}

/**
 * `applicationLinkKeys.all` is `["application-links"]` and
 * `propertyQueries.lists()` starts at `"properties"`, so the root segment is a
 * sufficient discriminator.
 */
function mockQueries(links: QueryResult, properties: QueryResult) {
	mockUseQuery.mockImplementation(
		(options: { queryKey: readonly unknown[] }) =>
			options.queryKey[0] === "application-links" ? links : properties,
	);
}

/**
 * The three-way dispatcher the whole-page test needs: `/applications` mounts the
 * queue as well, and its list read is rooted at `"applications"`, which is a
 * different key from the links' `"application-links"`.
 */
function mockPageQueries(
	links: QueryResult,
	properties: QueryResult,
	applications: QueryResult,
) {
	mockUseQuery.mockImplementation(
		(options: { queryKey: readonly unknown[] }) => {
			const root = options.queryKey[0];
			if (root === "application-links") return links;
			if (root === "applications") return applications;
			return properties;
		},
	);
}

/** An owner with zero applications — the branch that carries the CTA. */
function applicationsEmptyState(): QueryResult {
	return {
		data: { rows: [], total: 0 },
		isPending: false,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	};
}

/** The whole panel as one string, for absence assertions that must not be
 * satisfied by a selector typo. */
function panelText(container: HTMLElement): string {
	return container.textContent ?? "";
}

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
/** jsdom implements no scrolling at all, so this is a definition, not a spy. */
const scrollIntoView = vi.fn<Element["scrollIntoView"]>();

beforeEach(() => {
	vi.clearAllMocks();
	Element.prototype.scrollIntoView = scrollIntoView;
	process.env.NEXT_PUBLIC_APP_URL = APP_URL;
	// jsdom ships no clipboard at all, so this is a definition rather than a
	// replacement. `configurable` so repeated definitions across files are safe.
	Object.defineProperty(globalThis.navigator, "clipboard", {
		value: { writeText },
		configurable: true,
	});
});

afterEach(() => {
	cleanup();
	process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
});

describe("ApplicationLinkPanel — a unit with no link", () => {
	it("offers Create link and renders no URL field", () => {
		mockQueries(linksState([]), propertiesState());
		render(<ApplicationLinkPanel />);

		// Positive control: the row really rendered, so the absence below is being
		// read out of a populated tree rather than an empty one.
		expect(screen.getByText(UNIT_LABEL)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Create link" }),
		).toBeInTheDocument();

		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Copy application link" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Revoke" }),
		).not.toBeInTheDocument();
	});

	it("asks for a link for the unit that was clicked", () => {
		mockQueries(
			linksState([]),
			propertiesState([
				{ id: UNIT_ID, unit_number: "A" },
				{ id: "unit-b", unit_number: "B" },
			]),
		);
		render(<ApplicationLinkPanel />);

		const buttons = screen.getAllByRole("button", { name: "Create link" });
		expect(buttons).toHaveLength(2);

		fireEvent.click(buttons[1] as HTMLElement);

		// The second row's unit id, not the first — a panel that closes over the
		// wrong row mints a link for the wrong unit and nothing on screen says so.
		expect(createMutate).toHaveBeenCalledTimes(1);
		expect(createMutate).toHaveBeenCalledWith({ unitId: "unit-b" });
	});
});

describe("ApplicationLinkPanel — the URL comes from the canonical origin", () => {
	it("renders the full env-derived URL in a readonly field", () => {
		mockQueries(linksState([makeLink()]), propertiesState());
		render(<ApplicationLinkPanel />);

		const field = screen.getByRole("textbox");
		// A literal, not a template this file rebuilds the component's way.
		expect(field).toHaveValue(EXPECTED_URL);
		expect(field).toHaveAttribute("readonly");

		// T-66-44 stated as an assertion rather than a comment: the browser's own
		// origin is a DIFFERENT string here, so an origin-derived URL cannot pass
		// the equality above. That failure is asymmetric in production — it works
		// for the owner who copied it and fails CORS for every applicant.
		expect(window.location.origin).not.toBe(APP_URL);
		expect(EXPECTED_URL).not.toContain(window.location.origin);
	});

	it("selects the whole URL on focus so it is copyable without the button", () => {
		mockQueries(linksState([makeLink()]), propertiesState());
		render(<ApplicationLinkPanel />);

		const field = screen.getByRole("textbox");
		expect(field).toHaveValue(EXPECTED_URL);

		fireEvent.focus(field);

		expect((field as HTMLInputElement).selectionStart).toBe(0);
		expect((field as HTMLInputElement).selectionEnd).toBe(EXPECTED_URL.length);
	});
});

describe("ApplicationLinkPanel — the link is re-copyable, not shown once (D-03a)", () => {
	it("still holds the URL after a copy, an unmount and a fresh render", async () => {
		mockQueries(linksState([makeLink()]), propertiesState());

		const first = render(<ApplicationLinkPanel />);
		expect(screen.getByRole("textbox")).toHaveValue(EXPECTED_URL);

		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Copy application link" }),
			);
		});
		expect(writeText).toHaveBeenCalledWith(EXPECTED_URL);

		// The owner comes back a week later. The mocked data is UNCHANGED, which is
		// the point: nothing about the second visit differs except that the copy
		// already happened once. A reveal-once port passes every assertion above
		// and fails here, because its value lives in mutation state that a remount
		// discards rather than in a stored column that a query re-reads.
		first.unmount();
		render(<ApplicationLinkPanel />);

		const second = screen.getByRole("textbox");
		expect(second).toHaveValue(EXPECTED_URL);
		expect((second as HTMLInputElement).value).not.toBe("");
		expect(
			screen.getByRole("button", { name: "Copy application link" }),
		).toBeInTheDocument();
	});

	it("offers no affordance that would rotate the token", () => {
		mockQueries(linksState([makeLink()]), propertiesState());
		const { container } = render(<ApplicationLinkPanel />);

		// Positive control first.
		expect(screen.getByRole("textbox")).toHaveValue(EXPECTED_URL);

		// Rotating an active link's token silently breaks every listing already
		// posted, which is the failure D-03a exists to avoid.
		expect(panelText(container)).not.toContain("Regenerate");
		expect(panelText(container)).not.toContain("Create a new link");
		expect(screen.queryByRole("button", { name: "Create link" })).toBeNull();
	});
});

describe("ApplicationLinkPanel — copy announces as well as shows", () => {
	it("writes the exact URL and swaps the accessible name", async () => {
		mockQueries(linksState([makeLink()]), propertiesState());
		render(<ApplicationLinkPanel />);

		const button = screen.getByRole("button", {
			name: "Copy application link",
		});

		await act(async () => {
			fireEvent.click(button);
		});

		// A test that only asserts the button is present passes against an inert
		// button. This asserts the clipboard received the right value.
		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText).toHaveBeenCalledWith(EXPECTED_URL);
		expect(toastSuccess).toHaveBeenCalledWith("Application link copied");

		// An icon swap alone is invisible to a screen reader, and this is the only
		// icon-only control in the phase.
		expect(
			screen.getByRole("button", { name: "Application link copied" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Copy application link" }),
		).toBeNull();
	});

	it("tells the owner to copy manually when the clipboard refuses", async () => {
		writeText.mockRejectedValueOnce(new Error("NotAllowedError"));
		mockQueries(linksState([makeLink()]), propertiesState());
		render(<ApplicationLinkPanel />);

		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Copy application link" }),
			);
		});

		expect(toastError).toHaveBeenCalledWith(
			"Couldn't copy the link. Select the field and copy it.",
		);
		expect(toastSuccess).not.toHaveBeenCalled();
		// The name must NOT claim a copy that did not happen.
		expect(
			screen.getByRole("button", { name: "Copy application link" }),
		).toBeInTheDocument();
	});
});

describe("ApplicationLinkPanel — revoked beats expired", () => {
	it("labels a revoked-and-lapsed link Revoked, and dates it from the revocation", () => {
		// POSITIVE CONTROL: the active state renders first, in this same test, so
		// the chip assertion below cannot be satisfied by a panel that renders
		// nothing at all.
		mockQueries(linksState([makeLink()]), propertiesState());
		const active = render(<ApplicationLinkPanel />);
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(panelText(active.container)).toMatch(
			/^.*Expires Oct 6, 2126 \(\d+ days\)/s,
		);
		active.unmount();

		mockQueries(
			linksState([
				makeLink({
					revoked_at: "2026-07-20T12:00:00.000Z",
					expires_at: "2026-08-01T12:00:00.000Z",
				}),
			]),
			propertiesState(),
		);
		const { container } = render(<ApplicationLinkPanel />);

		expect(screen.getByText("Revoked")).toBeInTheDocument();
		// The owner needs to see that they took it down deliberately, and WHEN —
		// not the unrelated date on which the 60 days happened to lapse.
		expect(screen.getByText("Revoked Jul 20, 2026")).toBeInTheDocument();
		expect(panelText(container)).not.toContain("Expired");
		expect(
			screen.getByRole("button", { name: "Create a new link" }),
		).toBeInTheDocument();
	});

	it("labels a merely lapsed link Expired and still offers a new one", () => {
		mockQueries(
			linksState([makeLink({ expires_at: "2026-01-05T12:00:00.000Z" })]),
			propertiesState(),
		);
		const { container } = render(<ApplicationLinkPanel />);

		expect(screen.getByText("Expired")).toBeInTheDocument();
		expect(screen.getByText("Expired Jan 5, 2026")).toBeInTheDocument();
		expect(panelText(container)).not.toContain("Revoked");

		// The RPC refuses only while an ACTIVE link exists; expired and revoked
		// links deliberately do not block, which is what makes a lapsed listing
		// re-listable instead of permanently dead.
		expect(
			screen.getByRole("button", { name: "Create a new link" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});
});

describe("ApplicationLinkPanel — revoke is gated behind the confirmation", () => {
	it("does not call the mutation until the confirm button is clicked", () => {
		mockQueries(linksState([makeLink()]), propertiesState());
		render(<ApplicationLinkPanel />);

		// Nothing confirm-shaped exists before the trigger is used.
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(screen.queryByRole("button", { name: "Revoke link" })).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Revoke" }));

		// A ConfirmDialog wired to fire its action on open looks identical in a
		// screenshot and destroys a live listing on the first click.
		expect(revokeMutate).not.toHaveBeenCalled();
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Revoke link" }));

		expect(revokeMutate).toHaveBeenCalledTimes(1);
		expect(revokeMutate.mock.calls[0]?.[0]).toEqual({ linkId: LINK_ID });
	});

	it("states that applications already received are untouched", () => {
		mockQueries(linksState([makeLink()]), propertiesState());
		render(<ApplicationLinkPanel />);

		fireEvent.click(screen.getByRole("button", { name: "Revoke" }));

		// T-66-46. Without this sentence an owner reasonably believes revoking
		// destroys the applications they have collected, and leaves a link live
		// that they meant to take down.
		expect(
			screen.getByText(
				/Applications you have already received are not affected/,
			),
		).toBeInTheDocument();
		expect(screen.getByText("Revoke this link?")).toBeInTheDocument();
	});

	it("closes without calling the mutation when the owner cancels", () => {
		mockQueries(linksState([makeLink()]), propertiesState());
		render(<ApplicationLinkPanel />);

		fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(revokeMutate).not.toHaveBeenCalled();
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});
});

describe("ApplicationLinkPanel — the owner has no units", () => {
	it("says so and offers no link to create", () => {
		mockQueries(linksState([]), propertiesState([]));
		const { container } = render(<ApplicationLinkPanel />);

		expect(screen.getByText("No units yet")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Add a unit to a property before you can accept applications for it.",
			),
		).toBeInTheDocument();

		expect(screen.queryByRole("button", { name: "Create link" })).toBeNull();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(panelText(container)).not.toContain(UNIT_LABEL);
	});
});

describe("ApplicationLinkPanel — loading and failure", () => {
	it("renders three skeleton rows while loading, never a spinner", () => {
		mockQueries(loadingState(), loadingState());
		const { container } = render(<ApplicationLinkPanel />);

		expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
			3,
		);
		expect(container.querySelectorAll(".animate-spin")).toHaveLength(0);
		expect(screen.queryByText("No units yet")).not.toBeInTheDocument();
	});

	// "You have no units" is a positive claim about the owner's data, and a query
	// that is pending but not in flight has not earned it. Reachable twice in this
	// app: `networkMode: "online"` parks an offline query at a paused fetch status,
	// and PersistQueryClientProvider mounts from an async effect.
	it("shows skeletons, never the empty copy, while pending but not fetching", () => {
		mockQueries(linksState([]), pausedState());
		const { container } = render(<ApplicationLinkPanel />);

		expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
			3,
		);
		expect(screen.queryByText("No units yet")).not.toBeInTheDocument();
	});

	it("degrades to an inline retry rather than removing the band", () => {
		const refetch = vi.fn();
		mockQueries(errorState(refetch), propertiesState());
		render(<ApplicationLinkPanel />);

		expect(
			screen.getByText("Couldn't load application links."),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Retry" }));
		expect(refetch).toHaveBeenCalledTimes(1);
	});
});

/**
 * §B-2. The queue is Band 1 and the links are Band 2 precisely because the
 * queue's zero-applications state is the bridge to this band. That bridge is an
 * id lookup, and the handler no-ops on a miss rather than throwing, so renaming
 * the id turns the primary first-run action into a silent dead button with
 * nothing failing anywhere. This is the assertion that stops that.
 */
describe("/applications — the queue's empty state bridges to the links band", () => {
	it("scrolls to and focuses the links band when the CTA is used", () => {
		mockPageQueries(
			linksState([]),
			propertiesState(),
			applicationsEmptyState(),
		);
		render(<ApplicationsPage />);

		const band = document.getElementById("application-links");
		expect(band).not.toBeNull();
		// Positive controls: the band really is the section the panel mounted
		// inside, so the focus assertion below is about the right element.
		expect(band?.tagName).toBe("SECTION");
		expect(band?.textContent).toContain("Application links");
		expect(band?.textContent).toContain(UNIT_LABEL);

		fireEvent.click(
			screen.getByRole("button", { name: "Create an application link" }),
		);

		expect(scrollIntoView).toHaveBeenCalledTimes(1);
		// A `<section>` is not focusable by default, so `.focus()` on it is a
		// silent no-op: without `tabIndex={-1}` a mouse user sees the scroll while
		// a keyboard user is left at the top of the page with focus unmoved.
		expect(document.activeElement).toBe(band);
	});
});
