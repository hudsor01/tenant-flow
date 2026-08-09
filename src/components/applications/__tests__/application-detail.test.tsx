/**
 * `ApplicationDetail` — the owner's decision surface (APPLY-03, APPLY-04,
 * UI-SPEC §B-5/§B-6/§B-7).
 *
 * WHAT THIS FILE DOES NOT PROVE. jsdom computes no layout and loads no
 * stylesheet, so nothing here decides geometry, computed style or the cascade.
 * Specifically NOT decided here and owned by plan 66-17's Playwright spec:
 *
 *   E-21  the conversion href asserted against a real rendered DOM
 *
 * The href assertion below is the earlier, cheaper half of that pair: it reads
 * the attribute React produced, which catches a second parameter added in
 * source but cannot catch one a client-side router appends. Both halves exist
 * on purpose.
 *
 * EVERY ABSENCE ASSERTION CARRIES A POSITIVE CONTROL in the same test. "Mark
 * reviewing is absent", "no `[deleted]` appears" and "the mutation was not
 * called" all pass against an empty render, a crashed render and a mistyped
 * selector, so each is paired with a query that must find something first. Plan
 * 66-16's mutation campaign found three assertions of exactly that shape,
 * including the one its own plan nominated as load-bearing.
 *
 * `useQuery` and `useMutation` are both mocked and both dispatch on a key — the
 * query key's root for the reads (the component issues two: the application and
 * the converted tenant's name) and the mutation key for the writes (it holds
 * three). A blanket mock would answer every call with the same object, which is
 * how a test ends up asserting that "a mutation fired" without knowing which.
 * The `queryOptions()` and `mutationOptions()` factories themselves stay REAL,
 * which is what makes the argument assertions mean anything. No Supabase mock is
 * needed: `createClient()` lives inside each factory's `queryFn`/`mutationFn`,
 * and neither mock ever invokes those.
 */

import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mutationKeys } from "#hooks/api/mutation-keys";
import {
	applicationKeys,
	type RentalApplicationRow,
} from "#hooks/api/query-keys/application-keys";
import { ownerDashboardKeys } from "#hooks/api/query-keys/owner-dashboard-keys";
import { computeListCascade } from "#test/utils/base-rule-cascade";
import { ApplicationDetail } from "../application-detail";

/**
 * The options object the component hands `useMutation`. Captured rather than
 * merely dispatched on, because WHICH `onSuccess` survives the spread is the
 * whole question: an options-level callback REPLACES the factory's, while one
 * passed to `mutate(vars, { onSuccess })` runs alongside it.
 */
interface CapturedMutation {
	mutationKey?: readonly unknown[];
	onSuccess?: (
		data: unknown,
		variables: unknown,
		context: unknown,
	) => unknown | Promise<unknown>;
	onError?: (
		error: unknown,
		variables: unknown,
		context: unknown,
	) => unknown | Promise<unknown>;
}

const { mockUseQuery, mockUseMutation, invalidateSpy, removeSpy } = vi.hoisted(
	() => ({
		mockUseQuery: vi.fn(),
		mockUseMutation: vi.fn(),
		invalidateSpy: vi.fn(),
		removeSpy: vi.fn(),
	}),
);

vi.mock("@tanstack/react-query", async () => {
	const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
		"@tanstack/react-query",
	);
	return {
		...actual,
		useQuery: (options: { queryKey: readonly unknown[] }) =>
			mockUseQuery(options),
		useMutation: (options: CapturedMutation) => mockUseMutation(options),
		// The real one needs a provider. STABLE spies, not fresh `vi.fn()`s per
		// call: the factories hand this client to their own `onSuccess`, and the
		// tests below invoke that callback directly to prove the invalidation is
		// still attached — and, for the delete, that the deleted row's detail entry
		// is REMOVED before that invalidation can refetch it to null.
		useQueryClient: () => ({
			invalidateQueries: invalidateSpy,
			removeQueries: removeSpy,
		}),
	};
});

const pushSpy = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushSpy }),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

/** The application id every fixture uses. Thirty-six characters, as E-21 asserts. */
const APPLICATION_ID = "3f1a7c2e-9b4d-4f81-a6c5-0d2e8b7a1f34";
const TENANT_ID = "8c2b5d41-77ae-4e39-9f10-2a6c4b8d0e75";

/**
 * The key the detail read is mounted under. Built from the FACTORY, never
 * written out as a literal — the whole reason the delete could refetch a deleted
 * row is that `applicationKeys.all` prefixes this, and a hand-written copy would
 * stop tracking that relationship the moment it changed.
 */
const detailKey = applicationKeys.detail(APPLICATION_ID);

/** The placeholder `anonymize_old_rental_applications` writes into the three
 *  NOT NULL applicant columns. It must never reach the screen. */
const SENTINEL = "[deleted]";

/**
 * A fully populated row. The type is IMPORTED, never redeclared — a local
 * duplicate would be a ZT-3 violation and would stop tracking plan 66-09's real
 * column contract the moment it changes.
 *
 * Every optional field is populated on purpose, so a test that needs a blank can
 * create exactly ONE and assert against it without competing matches.
 */
function makeRow(
	overrides: Partial<RentalApplicationRow> = {},
): RentalApplicationRow {
	return {
		id: APPLICATION_ID,
		owner_user_id: "00000000-0000-4000-8000-0000000000ff",
		link_id: "11111111-0000-4000-8000-000000000001",
		unit_id: "22222222-0000-4000-8000-000000000002",
		property_label: "Pecan Street Duplex",
		unit_label: "A",
		status: "new",
		decided_at: null,
		disposition_reason: null,
		converted_tenant_id: null,
		converted_at: null,
		occupant_count: 2,
		anonymized_at: null,
		created_at: "2026-08-01T00:00:00Z",
		owner_notes: null,
		applicant_first_name: "Dana",
		applicant_last_name: "Reyes",
		applicant_email: "dana@example.com",
		applicant_phone: "512-555-0134",
		desired_move_in_date: "2026-09-01",
		current_street: "18 Mesquite Row",
		current_city: "Austin",
		current_state: "TX",
		current_postal_code: "78702",
		current_landlord_name: "Ana Vega",
		current_landlord_phone: "512-555-0177",
		reason_for_moving: "Closer to work",
		gross_monthly_income: 5400,
		employer_name: "Bluebonnet Labs",
		employer_role: "Technician",
		employer_months: 26,
		other_income_source: "Freelance",
		other_income_amount: 300,
		pet_details: "One cat, 9 lbs",
		vehicle_details: "2019 Civic, TX ABC-1234",
		reference_1_name: "Marisol Cruz",
		reference_1_relationship: "Former landlord",
		reference_1_phone: "512-555-0199",
		reference_2_name: "Ben Ortiz",
		reference_2_relationship: "Colleague",
		reference_2_phone: "512-555-0122",
		...overrides,
	};
}

/** The swept stub: three placeholders, everything else cleared. */
function makeAnonymizedRow(): RentalApplicationRow {
	return makeRow({
		status: "rejected",
		decided_at: "2024-07-04T00:00:00Z",
		disposition_reason: "another_applicant_selected",
		anonymized_at: "2026-07-04T00:00:00Z",
		applicant_first_name: SENTINEL,
		applicant_last_name: SENTINEL,
		applicant_email: SENTINEL,
		applicant_phone: null,
		desired_move_in_date: null,
		current_street: null,
		current_city: null,
		current_state: null,
		current_postal_code: null,
		current_landlord_name: null,
		current_landlord_phone: null,
		reason_for_moving: null,
		gross_monthly_income: null,
		employer_name: null,
		employer_role: null,
		employer_months: null,
		other_income_source: null,
		other_income_amount: null,
		pet_details: null,
		vehicle_details: null,
		reference_1_name: null,
		reference_1_relationship: null,
		reference_1_phone: null,
		reference_2_name: null,
		reference_2_relationship: null,
		reference_2_phone: null,
		owner_notes: null,
	});
}

interface QueryResult {
	data: unknown;
	isPending: boolean;
	/**
	 * Carried alongside `isPending` with the real TanStack v5 relationship
	 * (`isLoading === isPending && isFetching`) so these fixtures stay honest if
	 * the component's predicate is ever changed to the derived flag.
	 */
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
}

function resolved(data: unknown): QueryResult {
	return {
		data,
		isPending: false,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	};
}

/**
 * Route the application read to `row` and the tenant-name read to `tenant`. The
 * root segment is the discriminator: `applicationKeys.all` is `["applications"]`
 * and `tenantQueries.all()` is `["tenants"]`.
 */
function mockQueries(
	row: RentalApplicationRow | null,
	tenant: {
		id: string;
		first_name: string | null;
		last_name: string | null;
	} | null = null,
) {
	mockUseQuery.mockImplementation(
		(options: { queryKey: readonly unknown[] }) =>
			options.queryKey[0] === "applications" ? resolved(row) : resolved(tenant),
	);
}

const setStatusSpy = vi.fn();
const setNotesSpy = vi.fn();
const deleteSpy = vi.fn();

/** Every options object the component handed `useMutation`, keyed by its key. */
const capturedMutations = new Map<string, CapturedMutation>();

/** Dispatch on the mutation key so each of the three writes has its own spy. */
function mockMutations() {
	capturedMutations.clear();
	mockUseMutation.mockImplementation((options: CapturedMutation) => {
		const key = JSON.stringify(options.mutationKey ?? []);
		capturedMutations.set(key, options);
		const mutate =
			key === JSON.stringify(mutationKeys.applications.setStatus)
				? setStatusSpy
				: key === JSON.stringify(mutationKeys.applications.setNotes)
					? setNotesSpy
					: deleteSpy;
		return { mutate, isPending: false };
	});
}

/** The options the component passed for one mutation key. Throws if absent. */
function capturedFor(mutationKey: readonly unknown[]): CapturedMutation {
	const captured = capturedMutations.get(JSON.stringify(mutationKey));
	if (captured === undefined) {
		throw new Error(
			`The component never called useMutation for ${JSON.stringify(mutationKey)} — the parser, not the source, may be wrong.`,
		);
	}
	return captured;
}

function renderDetail() {
	return render(<ApplicationDetail applicationId={APPLICATION_ID} />);
}

/** The one control the whole action bar exists to place. */
function primaryLink(name: string): HTMLElement {
	return screen.getByRole("link", { name });
}

beforeEach(() => {
	vi.clearAllMocks();
	// `clearAllMocks` clears calls but KEEPS implementations, and the delete test
	// below installs one on each of these to model what the real cache does. A
	// reset here stops that leaking into every test that runs after it.
	invalidateSpy.mockReset();
	removeSpy.mockReset();
	mockMutations();
});

afterEach(() => {
	cleanup();
});

describe("ApplicationDetail — the action bar has three states, not one", () => {
	// State 1 of the §B-6 table.
	it("offers approve-and-open plus Mark reviewing on a new application", () => {
		mockQueries(makeRow({ status: "new" }));
		renderDetail();

		expect(primaryLink("Approve and open tenant form")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Mark reviewing" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
		// The helper is the thing that stops the primary reading as "a tenant now
		// exists". It renders in this state and in the two below.
		expect(
			screen.getByText(/The tenant record is not created until you submit/),
		).toBeInTheDocument();
	});

	// Still state 1, minus one control. The absence below is the whole claim, so
	// the primary control is proven present first — otherwise an empty render,
	// a thrown render and a renamed button all satisfy it equally.
	it("drops Mark reviewing once the application is already reviewing", () => {
		mockQueries(makeRow({ status: "reviewing" }));
		renderDetail();

		expect(primaryLink("Approve and open tenant form")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Mark reviewing" }),
		).not.toBeInTheDocument();
	});

	// State 2. The label loses "Approve" because the application already is
	// approved; the helper must NOT go with it.
	it("reads Open tenant form once approved, and keeps the helper", () => {
		mockQueries(
			makeRow({ status: "approved", decided_at: "2026-08-02T00:00:00Z" }),
		);
		renderDetail();

		expect(primaryLink("Open tenant form")).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "Approve and open tenant form" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByText(/The tenant record is not created until you submit/),
		).toBeInTheDocument();
	});

	// State 3. Both halves are asserted: a control that reads "View tenant" while
	// the helper still promises to create something is the failure this pins.
	it("reads View tenant once converted, and says who it converted to", () => {
		mockQueries(
			makeRow({
				status: "approved",
				decided_at: "2026-08-02T00:00:00Z",
				converted_tenant_id: TENANT_ID,
				converted_at: "2026-08-04T00:00:00Z",
			}),
			{ id: TENANT_ID, first_name: "Dana", last_name: "Reyes" },
		);
		renderDetail();

		const view = primaryLink("View tenant");
		expect(view).toHaveAttribute("href", `/tenants/${TENANT_ID}`);
		expect(
			screen.getByText("Converted to tenant Dana Reyes on Aug 4, 2026."),
		).toBeInTheDocument();
		// Converting settles the application; there is nothing left to decline.
		expect(
			screen.queryByRole("button", { name: "Decline" }),
		).not.toBeInTheDocument();
	});

	// `converted_tenant_id` is `on delete set null`, so a converted row whose
	// tenant was later deleted is normal rather than broken. Saying so beats a
	// dangling link or a silent blank.
	it("says the tenant is gone when the conversion outlived the tenant", () => {
		mockQueries(
			makeRow({
				status: "approved",
				decided_at: "2026-08-02T00:00:00Z",
				converted_tenant_id: null,
				converted_at: "2026-08-04T00:00:00Z",
			}),
		);
		renderDetail();

		expect(primaryLink("Open tenant form")).toBeInTheDocument();
		expect(
			screen.getByText(
				"The tenant record created from this application no longer exists.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "View tenant" }),
		).not.toBeInTheDocument();
	});

	it("marks the application approved when the approve control is used", async () => {
		const user = userEvent.setup();
		mockQueries(makeRow({ status: "new" }));
		renderDetail();

		await user.click(primaryLink("Approve and open tenant form"));

		// The vars object, read positionally: `mutate` is called with one argument
		// here and with two in the decline dialog, and asserting the shape of the
		// call rather than the payload is how a test passes without knowing what
		// was sent.
		expect(setStatusSpy.mock.calls[0]?.[0]).toEqual({
			applicationId: APPLICATION_ID,
			status: "approved",
		});
	});

	it("moves a new application to reviewing without a reason", async () => {
		const user = userEvent.setup();
		mockQueries(makeRow({ status: "new" }));
		renderDetail();

		await user.click(screen.getByRole("button", { name: "Mark reviewing" }));

		expect(setStatusSpy.mock.calls[0]?.[0]).toEqual({
			applicationId: APPLICATION_ID,
			status: "reviewing",
		});
	});
});

describe("ApplicationDetail — the conversion href carries the id and nothing else", () => {
	// T-66-11. `toContain("/tenants/new?application=")` would pass with `&email=`
	// appended, which is the exact leak this phase forbids — so the regex is
	// anchored at both ends and the id is proven present before the absence of
	// everything else is claimed.
	it("matches the anchored E-21 shape with no second parameter", () => {
		mockQueries(makeRow({ status: "new" }));
		renderDetail();

		const href = primaryLink("Approve and open tenant form").getAttribute(
			"href",
		);

		// POSITIVE CONTROL: the id really is in the URL. Without this, an href of
		// "/tenants/new" alone would satisfy every "carries no PII" assertion.
		expect(href).toContain(APPLICATION_ID);
		expect(href).toBe(`/tenants/new?application=${APPLICATION_ID}`);
		expect(href).toMatch(/^\/tenants\/new\?application=[0-9a-f-]{36}$/);
		expect(href).not.toContain("&");
		expect(href).not.toContain("dana@example.com");
		expect(href).not.toContain("Dana");
		expect(href).not.toContain("512-555-0134");
	});

	it("keeps the same shape on the approved state's control", () => {
		mockQueries(
			makeRow({ status: "approved", decided_at: "2026-08-02T00:00:00Z" }),
		);
		renderDetail();

		const href = primaryLink("Open tenant form").getAttribute("href");
		expect(href).toContain(APPLICATION_ID);
		expect(href).toMatch(/^\/tenants\/new\?application=[0-9a-f-]{36}$/);
	});
});

describe("ApplicationDetail — the record, in the applicant's own order", () => {
	it("renders the five form sections under the applicant's own headings", () => {
		mockQueries(makeRow());
		renderDetail();

		const headings = screen
			.getAllByRole("heading", { level: 2 })
			.map((node) => node.textContent);
		expect(headings.slice(0, 5)).toEqual([
			"About you",
			"Where you live now",
			"Income",
			"Household",
			"References",
		]);
	});

	// The blank is SHOWN, never hidden: an owner has to be able to see that a
	// field was offered and skipped. The fixture leaves exactly one field blank,
	// so a single match proves it is that field and not a coincidence.
	it("renders Not provided for a blank optional value rather than omitting it", () => {
		mockQueries(makeRow({ reference_2_name: null }));
		renderDetail();

		// POSITIVE CONTROL: the label really is on screen, so the value read below
		// is provably the one belonging to it.
		const label = screen.getByText("Second reference name");
		expect(label).toBeInTheDocument();
		expect(label.nextElementSibling?.textContent).toBe("Not provided");

		// Scoped to the References card, where the fixture leaves exactly one field
		// blank. An unscoped count would also pick up the record card's own blanks
		// (an undecided row has no decision date and no reason) and would pass
		// against an implementation that rendered "Not provided" for everything.
		const references = screen.getByRole("group", { name: "References" });
		expect(within(references).getAllByText("Not provided")).toHaveLength(1);
		// Positive control on the same card: the populated reference fields really
		// did render their own values, so the single blank is a blank and not the
		// only thing that rendered.
		expect(within(references).getByText("Marisol Cruz")).toBeInTheDocument();
		expect(within(references).getByText("512-555-0122")).toBeInTheDocument();
	});

	it("renders the applicant's email in the record it was submitted with", () => {
		mockQueries(makeRow());
		renderDetail();

		const label = screen.getByText("Email");
		expect(label.nextElementSibling?.textContent).toBe("dana@example.com");
	});

	// T-66-09. Applicant free text is attacker-controlled and lands inside a
	// logged-in dashboard; React escaping it is the whole mitigation.
	it("escapes an injection payload in a free-text answer", () => {
		const payload = '<img src=x onerror="alert(1)">';
		mockQueries(makeRow({ reason_for_moving: payload }));
		const { container } = renderDetail();

		expect(container.querySelector("img")).toBeNull();
		expect(screen.getByText(payload)).toBeInTheDocument();
	});

	// The reason is the evidence the two-year window exists to keep. Rendering
	// the raw column would show `another_applicant_selected` to a landlord.
	it("renders a recorded decline reason through its label", () => {
		mockQueries(
			makeRow({
				status: "rejected",
				decided_at: "2026-08-03T00:00:00Z",
				disposition_reason: "another_applicant_selected",
			}),
		);
		renderDetail();

		const label = screen.getByText("Recorded reason");
		expect(label.nextElementSibling?.textContent).toBe(
			"Another applicant was selected",
		);
		expect(screen.queryByText("another_applicant_selected")).toBeNull();
	});
});

/**
 * THE BREADCRUMB IS A LIST, AND IT IS THE ONE THIS PHASE FORGOT.
 *
 * `BreadcrumbList` renders a bare `<ol>` whose only classes are layout
 * (`ui/breadcrumb.tsx:11-21`), so all three unscoped `@layer base` declarations
 * at `globals.css:517-524` landed on it: `padding-left: 1.5rem`,
 * `margin-top: 1rem` and — from the same `margin: 1rem 0` shorthand —
 * `margin-bottom: 1rem`, plus `margin-bottom: 0.25rem` on each `<li>`.
 *
 * The page shell is `p-6 lg:p-8 … flex flex-col gap-6` and the breadcrumb is its
 * FIRST flex item, so nothing collapses: the trail sat 16px below where the
 * padding declares, and its text started 24px to the RIGHT of the `<h1>`
 * directly beneath it. This phase neutralizes the same trap correctly on three
 * `<ul>`s; the `<ol>` got nothing.
 *
 * Computed values, not classes, for the reason recorded in
 * `#test/utils/base-rule-cascade`.
 */
describe("ApplicationDetail — the breadcrumb ol defeats the base rules", () => {
	it("zeroes padding-left, both vertical margins and the crumb margins", () => {
		mockQueries(makeRow({ status: "new" }));
		const { container } = renderDetail();

		const trail = container.querySelector("nav[aria-label='Breadcrumb'] ol");
		if (!trail) throw new Error("the detail page rendered no breadcrumb <ol>");
		const { neutralized, baseline } = computeListCascade(trail);

		// Positive control on the harness: an unclassed list in the same document
		// under the same stylesheet. Without it every assertion below would pass
		// against a stylesheet that never applied.
		expect(baseline.paddingLeft).toBe("24px");
		expect(baseline.marginTop).toBe("16px");
		expect(baseline.marginBottom).toBe("16px");
		expect(baseline.firstChildMarginBottom).toBe("4px");

		// The 24px indent is the visible one: it pushes the trail out of alignment
		// with the `<h1>` immediately below it.
		expect(neutralized.paddingLeft).toBe("0px");
		expect(neutralized.marginTop).toBe("0px");
		expect(neutralized.marginBottom).toBe("0px");
		expect(neutralized.firstChildTag).toBe("li");
		expect(neutralized.firstChildMarginBottom).toBe("0px");
	});
});

describe("ApplicationDetail — an anonymized row is a stub, not a person", () => {
	// T-66-50. A banner-only implementation still renders the placeholder in the
	// name card and in the <h1>, so the absence assertion is the real claim and
	// the banner is its positive control.
	it("renders the banner and no placeholder anywhere in the output", () => {
		mockQueries(makeAnonymizedRow());
		const { container } = renderDetail();

		expect(
			screen.getByText("This application has been anonymized."),
		).toBeInTheDocument();
		expect(
			screen.getByText(/TenantFlow removes applicant details two years/),
		).toBeInTheDocument();
		expect(container.textContent ?? "").not.toContain(SENTINEL);
		// The stub the spec requires: the unit, the dates, the status and the
		// reason survive, and they are what this page still has to show.
		expect(screen.getByText("Pecan Street Duplex")).toBeInTheDocument();
		expect(
			screen.getByText("Another applicant was selected"),
		).toBeInTheDocument();
	});

	it("offers no conversion control and no notes editor on a swept row", () => {
		mockQueries(makeAnonymizedRow());
		renderDetail();

		// POSITIVE CONTROL first: the page really rendered.
		expect(
			screen.getByText("This application has been anonymized."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /tenant form/ }),
		).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Private notes")).not.toBeInTheDocument();
	});

	it("renders none of the five applicant cards", () => {
		mockQueries(makeAnonymizedRow());
		renderDetail();

		const headings = screen
			.getAllByRole("heading", { level: 2 })
			.map((node) => node.textContent);
		expect(headings).toEqual(["Application record"]);
	});
});

describe("ApplicationDetail — declining captures a reason before it commits", () => {
	async function openDeclineDialog(user: ReturnType<typeof userEvent.setup>) {
		await user.click(screen.getByRole("button", { name: "Decline" }));
		return screen.findByRole("dialog");
	}

	function confirmButton(): HTMLElement {
		return screen.getByRole("button", { name: "Decline application" });
	}

	it("keeps the confirm inert until a reason is chosen, then enables it", async () => {
		const user = userEvent.setup();
		mockQueries(makeRow({ status: "reviewing" }));
		renderDetail();

		await openDeclineDialog(user);

		// The disabled state is the claim, and "disabled" is satisfied by a button
		// that is broken for unrelated reasons — so the test does not stop here.
		expect(confirmButton()).toBeDisabled();
		expect(setStatusSpy).not.toHaveBeenCalled();

		await user.click(screen.getByRole("combobox", { name: "Reason" }));
		await user.click(
			await screen.findByRole("option", {
				name: "Income did not meet the stated requirement",
			}),
		);

		// The control genuinely becomes usable. Without this the assertion above
		// would pass against a permanently inert button.
		await waitFor(() => {
			expect(confirmButton()).toBeEnabled();
		});
	});

	it("sends the chosen reason, not merely a status change", async () => {
		const user = userEvent.setup();
		mockQueries(makeRow({ status: "reviewing" }));
		renderDetail();

		await openDeclineDialog(user);
		await user.click(screen.getByRole("combobox", { name: "Reason" }));
		await user.click(
			await screen.findByRole("option", { name: "Applicant withdrew" }),
		);
		await waitFor(() => {
			expect(confirmButton()).toBeEnabled();
		});
		await user.click(confirmButton());

		// The RPC raises without a reason, and the DB value is `rejected` while the
		// label the owner read was "Declined" (UI-14). Both are asserted.
		expect(setStatusSpy.mock.calls[0]?.[0]).toEqual({
			applicationId: APPLICATION_ID,
			status: "rejected",
			dispositionReason: "applicant_withdrew",
		});
	});

	it("offers only the seven closed-vocabulary reasons", async () => {
		const user = userEvent.setup();
		mockQueries(makeRow({ status: "reviewing" }));
		renderDetail();

		await openDeclineDialog(user);
		await user.click(screen.getByRole("combobox", { name: "Reason" }));

		const options = await screen.findAllByRole("option");
		expect(options).toHaveLength(7);
		// A free-text escape hatch here would be applicant PII living in the one
		// column the anonymize sweep deliberately preserves (D-11d).
		expect(screen.queryByRole("textbox", { name: /reason/i })).toBeNull();
	});
});

describe("ApplicationDetail — delete is confirmed before anything happens", () => {
	it("calls no mutation until the confirm itself is clicked", async () => {
		const user = userEvent.setup();
		mockQueries(makeRow());
		renderDetail();

		await user.click(
			screen.getByRole("button", { name: "Application actions" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Delete application" }),
		);

		// POSITIVE CONTROL: the confirm surface really opened, so the absence
		// assertion beneath it is being made against a live dialog and not against
		// a menu that never rendered.
		const dialog = await screen.findByRole("alertdialog");
		expect(
			within(dialog).getByText(/TenantFlow keeps applications for two years/),
		).toBeInTheDocument();
		expect(deleteSpy).not.toHaveBeenCalled();

		await user.click(within(dialog).getByRole("button", { name: "Delete" }));
		expect(deleteSpy.mock.calls[0]?.[0]).toBe(APPLICATION_ID);
	});

	// D-09: nothing points from `tenants` back to `rental_applications`, so no
	// cascade is possible. A warning implying otherwise would stop owners from
	// tidying up records they are entitled to remove.
	it("makes no claim about the converted tenant in the confirm copy", async () => {
		const user = userEvent.setup();
		mockQueries(
			makeRow({
				status: "approved",
				decided_at: "2026-08-02T00:00:00Z",
				converted_tenant_id: TENANT_ID,
				converted_at: "2026-08-04T00:00:00Z",
			}),
			{ id: TENANT_ID, first_name: "Dana", last_name: "Reyes" },
		);
		renderDetail();

		await user.click(
			screen.getByRole("button", { name: "Application actions" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Delete application" }),
		);

		const dialog = await screen.findByRole("alertdialog");
		const copy = dialog.textContent ?? "";
		expect(copy).toContain("This cannot be undone.");
		expect(copy).not.toContain("tenant record");
		expect(copy).not.toContain("Dana Reyes");
	});
});

describe("ApplicationDetail — loading, failure and a row that is not there", () => {
	// The not-found copy is a positive claim about the owner's data, and a query
	// that is pending but not in flight has not earned it. Reachable twice in
	// this app: `networkMode: "online"` parks an offline query at a paused fetch
	// status, and PersistQueryClientProvider mounts from an async effect.
	it("shows skeletons while pending but not fetching, never the 404", () => {
		mockUseQuery.mockImplementation(() => ({
			data: undefined,
			isPending: true,
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		}));
		const { container } = renderDetail();

		expect(
			container.querySelectorAll('[data-slot="skeleton"]').length,
		).toBeGreaterThan(0);
		expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
	});

	// RLS makes "not yours" and "does not exist" the same null, deliberately.
	it("renders the shared not-found page for a null row", () => {
		mockQueries(null);
		renderDetail();

		expect(screen.getByText("Page not found")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Back to applications/ }),
		).toHaveAttribute("href", "/applications");
	});

	it("renders an inline retry and leaks no PostgREST string", async () => {
		const user = userEvent.setup();
		const refetch = vi.fn();
		mockUseQuery.mockImplementation(() => ({
			data: undefined,
			isPending: false,
			isLoading: false,
			isError: true,
			refetch,
		}));
		const { container } = renderDetail();

		expect(
			screen.getByText("Couldn't load this application."),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Retry" }));
		expect(refetch).toHaveBeenCalledTimes(1);
		expect(container.textContent ?? "").not.toContain("PGRST");
	});
});

/**
 * THE OPTIONS-LEVEL `onSuccess` TRAP.
 *
 * `useMutation({ ...factory(queryClient), onSuccess })` REPLACES the factory's
 * own `onSuccess` — the object spread does exactly what it says. Only a callback
 * handed to `mutate(vars, { onSuccess })` runs ALONGSIDE it. The factories are
 * where plan 66-09's invalidation of `applicationKeys.all` and
 * `ownerDashboardKeys.all` lives, so the trap writes to the database and
 * refreshes nothing: with `staleTime: 5 * 60 * 1000` the notes textarea reverted
 * to the old note, and a deleted application stayed in the queue with the pager
 * still counting it.
 *
 * A TEST THAT ONLY ASSERTED "THE TOAST APPEARED" WOULD HAVE PASSED BEFORE THE
 * FIX, because the toast is exactly what the replacing callback did. So these
 * invoke the surviving `onSuccess` and assert the invalidation itself.
 */
describe("ApplicationDetail — every write invalidates what it changed", () => {
	it.each([
		["the status write", mutationKeys.applications.setStatus],
		["the notes write", mutationKeys.applications.setNotes],
		["the delete", mutationKeys.applications.delete],
	])("keeps the factory's invalidation on %s", async (_label, mutationKey) => {
		mockQueries(makeRow());
		renderDetail();

		const options = capturedFor(mutationKey);
		// Positive control: there IS a surviving success callback to run. Without
		// this, a component that passed none would satisfy the assertions below by
		// invalidating nothing and never being called.
		expect(options.onSuccess).toBeTypeOf("function");
		await options.onSuccess?.(undefined, undefined, undefined);

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: applicationKeys.all,
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ownerDashboardKeys.all,
		});
	});

	it("puts the notes toast and draft reset on the CALL, not on the options", async () => {
		const user = userEvent.setup();
		mockQueries(makeRow({ owner_notes: "Called Tuesday." }));
		renderDetail();

		await user.type(screen.getByLabelText("Private notes"), " Left a message.");
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Save notes" })).toBeEnabled();
		});
		await user.click(screen.getByRole("button", { name: "Save notes" }));

		const perCall = setNotesSpy.mock.calls[0]?.[1] as
			| { onSuccess?: () => void }
			| undefined;
		expect(perCall?.onSuccess).toBeTypeOf("function");
		expect(toast.success).not.toHaveBeenCalled();
		perCall?.onSuccess?.();
		expect(toast.success).toHaveBeenCalledWith("Notes saved");
	});

	/**
	 * A SUCCESSFUL DELETE MUST NEVER SHOW THE OWNER A 404.
	 *
	 * Moving the delete's side effects to the per-call `onSuccess` restored the
	 * factory's invalidation (the test above) and introduced an ordering defect the
	 * broken version did not have. React Query awaits the OPTIONS-level `onSuccess`
	 * to completion before running the per-call one. The options-level callback is
	 * the factory's, and it awaited `invalidateQueries({ queryKey:
	 * applicationKeys.all })` — which matches the mounted
	 * `applicationQueries.detail(id)`, because `detail()` is prefixed with `all` on
	 * purpose. That query is active, so it refetched, and the row had just been
	 * deleted, so it resolved to `null`, and `ApplicationDetail` renders
	 * `<NotFoundPage />` for a null row. The navigation is in the per-call
	 * callback, which had not run yet. Confirm delete -> "Page not found" -> "
	 * Application deleted" -> redirect.
	 *
	 * THE CACHE IS SIMULATED, AND ONLY ITS TWO DOCUMENTED BEHAVIOURS ARE. The
	 * harness mocks `useQuery`, so this file has no real cache to invalidate;
	 * what is modelled here is exactly (a) an invalidation of a key that prefixes
	 * the mounted detail refetches it and (b) a refetch of a deleted row yields
	 * null. Both are properties of TanStack Query and of
	 * `applicationQueries.detail`'s `.limit(1)` + `[0]`, not of this test. The
	 * cache-level half — that `removeQueries` really does take the entry out of
	 * the invalidation's match set — is proved against a real `QueryClient` and a
	 * real `QueryObserver` in `query-keys/__tests__/application-keys.test.ts`.
	 *
	 * A TEST ASSERTING ONLY THE TOAST AND THE NAVIGATION PASSES IN THE BROKEN
	 * STATE — both of those fire, just after the 404. That is the shape of
	 * assertion that let this through, so the assertion here is the absence of the
	 * not-found copy at the moment the invalidation resolves.
	 */
	it("never renders the not-found page for a delete that succeeded", async () => {
		const user = userEvent.setup();
		let row: RentalApplicationRow | null = makeRow();
		mockUseQuery.mockImplementation(
			(options: { queryKey: readonly unknown[] }) =>
				options.queryKey[0] === "applications" ? resolved(row) : resolved(null),
		);
		const { rerender } = renderDetail();

		// Positive control: the loaded detail really rendered, so the absence
		// assertion below is read out of a populated tree and not an empty one.
		expect(primaryLink("Approve and open tenant form")).toBeInTheDocument();
		expect(screen.queryByText("Page not found")).not.toBeInTheDocument();

		let detailRemoved = false;
		removeSpy.mockImplementation(
			(filters: { queryKey: readonly unknown[] }) => {
				if (JSON.stringify(filters.queryKey) === JSON.stringify(detailKey)) {
					detailRemoved = true;
				}
			},
		);
		invalidateSpy.mockImplementation(
			(filters: { queryKey: readonly unknown[] }) => {
				// An invalidation refetches every ACTIVE query the key prefixes. The
				// detail is active and is prefixed by `applicationKeys.all` — unless it
				// was removed from the cache first, in which case there is nothing left
				// to match.
				const prefixes = detailKey
					.slice(0, filters.queryKey.length)
					.every((segment, index) => segment === filters.queryKey[index]);
				if (prefixes && !detailRemoved) {
					row = null;
					rerender(<ApplicationDetail applicationId={APPLICATION_ID} />);
				}
			},
		);

		await user.click(
			screen.getByRole("button", { name: "Application actions" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Delete application" }),
		);
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Delete" }));

		// React Query's ordering, reproduced: the factory's callback first, awaited
		// to completion, and only then the per-call one.
		const options = capturedFor(mutationKeys.applications.delete);
		await options.onSuccess?.(undefined, APPLICATION_ID, undefined);

		// THE ASSERTION. On the defective version the invalidation has by now
		// refetched the deleted row to null and the tree is showing the 404, with
		// the toast and the redirect still to come.
		expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
		expect(pushSpy).not.toHaveBeenCalled();

		const perCall = deleteSpy.mock.calls[0]?.[1] as
			| { onSuccess?: () => void }
			| undefined;
		perCall?.onSuccess?.();
		expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
		expect(pushSpy).toHaveBeenCalledWith("/applications");
	});

	it("puts the delete toast and the navigation on the CALL, not on the options", async () => {
		const user = userEvent.setup();
		mockQueries(makeRow());
		renderDetail();

		await user.click(
			screen.getByRole("button", { name: "Application actions" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Delete application" }),
		);
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Delete" }));

		const perCall = deleteSpy.mock.calls[0]?.[1] as
			| { onSuccess?: () => void }
			| undefined;
		expect(perCall?.onSuccess).toBeTypeOf("function");
		// The navigation must not fire until the delete actually resolved.
		expect(pushSpy).not.toHaveBeenCalled();
		perCall?.onSuccess?.();
		expect(toast.success).toHaveBeenCalledWith("Application deleted");
		expect(pushSpy).toHaveBeenCalledWith("/applications");
	});
});

describe("ApplicationDetail — the owner's private notes", () => {
	it("sends what is in the field, and only once it differs from the server", async () => {
		const user = userEvent.setup();
		mockQueries(makeRow({ owner_notes: "Called Tuesday." }));
		renderDetail();

		const save = screen.getByRole("button", { name: "Save notes" });
		// Nothing has changed yet, so there is nothing to save.
		expect(save).toBeDisabled();

		const field = screen.getByLabelText("Private notes");
		await user.type(field, " Left a message.");

		await waitFor(() => {
			expect(save).toBeEnabled();
		});
		await user.click(save);

		expect(setNotesSpy.mock.calls[0]?.[0]).toEqual({
			applicationId: APPLICATION_ID,
			notes: "Called Tuesday. Left a message.",
		});
	});
});
