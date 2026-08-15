/**
 * AddTenantModal — the INTERCEPTING-ROUTE call site of `AddTenantForm`.
 *
 * WHY THIS FILE CARRIES ITS OWN PREFILL ASSERTIONS. `AddTenantForm` is rendered
 * from two places: `src/app/(owner)/tenants/new/page.tsx` and this intercepted
 * twin. Research Pitfall 6 records that the two are independently editable and
 * that a suite covering only the direct route stays green while this path
 * silently drops the prefill — the owner sees a filled form when they refresh
 * `/tenants/new` and an empty one when they click through from `/applications`.
 * So the prefill is asserted HERE, against THIS page module, rather than
 * against a shared helper that one working call site would satisfy.
 *
 * `AddTenantForm` is deliberately NOT mocked. A mock that captures props proves
 * this page passed something; rendering the real form proves the owner actually
 * sees the applicant's details in the inputs.
 *
 * `useQuery` is mocked and dispatches on the query key's root because the body
 * issues four reads (properties, units, the application, the duplicate-tenant
 * check) and a blanket mock would answer all four with the same object. The
 * `queryOptions()` factories stay real, so the keys under test are the real keys.
 *
 * Original coverage (Dialog accessibility, requirements 2.1/2.2/2.5 from
 * fix-tenant-invitation-issues) is retained below unchanged in intent.
 *
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { RentalApplicationRow } from "#hooks/api/query-keys/application-keys";
import type { TenantEmailMatch } from "#hooks/api/query-keys/tenant-keys";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import AddTenantModal from "./page";

const APPLICATION_ID = "11111111-2222-3333-4444-555555555555";

/** Only the columns this page reads; the real row carries forty-one. */
type ApplicantFixture = Pick<
	RentalApplicationRow,
	| "applicant_email"
	| "applicant_first_name"
	| "applicant_last_name"
	| "applicant_phone"
>;

const APPLICANT: ApplicantFixture = {
	applicant_email: "marisol.vega@example.com",
	applicant_first_name: "Marisol",
	applicant_last_name: "Vega",
	applicant_phone: "5125550132",
};

interface Scenario {
	/** What `?application=` resolves to. */
	searchParams: string;
	/** What the application detail query answers with. */
	application: ApplicantFixture | null;
	/** What the duplicate-tenant lookup answers with. */
	duplicateTenant: TenantEmailMatch | null;
}

let scenario: Scenario;

// Mock the RouteModal component to avoid router dependencies. The real Dialog
// primitives are imported so DialogTitle/DialogDescription keep their context.
vi.mock("#components/ui/route-modal", async () => {
	const actual = await vi.importActual<typeof import("#components/ui/dialog")>(
		"#components/ui/dialog",
	);
	return {
		RouteModal: ({ children }: { children: ReactNode }) => (
			<actual.Dialog open={true}>
				<actual.DialogContent>{children}</actual.DialogContent>
			</actual.Dialog>
		),
	};
});

vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(scenario.searchParams),
	useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

/** Typed so `mock.calls` destructures without a cast. */
const mockUseQuery =
	vi.fn<(options: { queryKey: readonly unknown[] }) => unknown>();
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

function settled(data: unknown) {
	return { data, isPending: false, isLoading: false, isError: false };
}

/**
 * Dispatch on the real query key root. `["tenants", "list", "by-email", …]` has
 * to be checked before the plain tenants roots so the duplicate lookup is not
 * answered with a property/unit payload.
 */
function answer(options: { queryKey: readonly unknown[] }) {
	const key = options.queryKey;
	if (key[0] === "properties") return settled({ data: [] });
	if (key[0] === "units") return settled({ data: [] });
	if (key[0] === "applications") return settled(scenario.application);
	if (key[0] === "tenants" && key[2] === "by-email") {
		return settled(scenario.duplicateTenant);
	}
	return settled(undefined);
}

function renderModal(): ReactElement {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	const ui = (
		<QueryClientProvider client={queryClient}>
			<AddTenantModal />
		</QueryClientProvider>
	);
	render(ui);
	return ui;
}

beforeEach(() => {
	vi.clearAllMocks();
	scenario = {
		searchParams: "",
		application: null,
		duplicateTenant: null,
	};
	mockUseQuery.mockImplementation(answer);
});

describe("AddTenantModal - Dialog Accessibility", () => {
	/**
	 * Requirement 2.1: Dialog must include DialogTitle component.
	 * Queried by heading role, not text: the real form renders a submit control
	 * labelled "Add Tenant" too, so a bare text query is ambiguous.
	 */
	it("should render DialogTitle component", () => {
		renderModal();
		expect(
			screen.getByRole("heading", { name: "Add Tenant" }),
		).toBeInTheDocument();
	});

	/** Requirement 2.2: Dialog must include DialogDescription component */
	it("should render DialogDescription component", () => {
		renderModal();
		expect(screen.getByText(/Add a tenant record/)).toBeInTheDocument();
	});

	/** Requirement 2.5: Dialog should not produce accessibility warnings */
	it("should not log accessibility warnings to console", () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const consoleErrorSpy = vi.spyOn(console, "error");

		renderModal();

		const isAccessibilityMessage = (call: unknown[]) =>
			call.some(
				(arg) =>
					typeof arg === "string" &&
					(arg.includes("aria-") ||
						arg.includes("DialogTitle") ||
						arg.includes("DialogDescription") ||
						arg.includes("accessibility")),
			);

		expect(
			consoleWarnSpy.mock.calls.filter(isAccessibilityMessage),
		).toHaveLength(0);
		expect(
			consoleErrorSpy.mock.calls.filter(isAccessibilityMessage),
		).toHaveLength(0);

		consoleWarnSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});
});

/**
 * THE HEADER-TO-BODY RUNG IS `gap-4` AND NOTHING MAY ADD TO IT.
 *
 * This page's wrapper moved from `space-y-4` to `flex flex-col gap-4`. Radix
 * renders `DialogDescription` as a `<p>`, `ui/dialog.tsx` gives it only
 * `text-muted-foreground text-sm`, and `globals.css` declares an unscoped
 * `p { margin-bottom: 1rem }` inside `@layer base`. That paragraph is the LAST
 * child of the unstyled header box, so its bottom margin collapses through the
 * box's bottom edge onto the box — and the box is a flex item, where margins are
 * ADDITIVE rather than collapsing. Under `space-y-4` the same margin collapsed
 * away; under flex it renders 16px on top of the declared 16px.
 *
 * ASSERTED ON THE COMPUTED VALUE, NOT ON THE CLASS STRING. `expect(class).toContain("mb-0")`
 * passes against every member of this defect family — the class is always
 * present and always spelled right, and the only real question is whether
 * anything cancels the base declaration at all. `computeParagraphCascade`
 * answers that by applying globals.css's REAL `p` rule at run time and reading
 * `getComputedStyle`.
 */
describe("AddTenantModal - the flex rung above the form (D-3)", () => {
	it("cancels the unscoped p margin on the description, which flex would otherwise add to gap-4", () => {
		renderModal();

		const description = screen.getByText(/Add a tenant record/);
		expect(description.tagName.toLowerCase()).toBe("p");

		// THE STRUCTURAL HALF, which is what makes the margin load-bearing rather
		// than harmless. jsdom computes no layout, so it is asserted as DOM facts:
		// the description is the last child of its box, and that box is a child of
		// a flex column. Either one changing turns the assertion below from
		// necessary into merely harmless, so both are pinned here.
		const box = description.parentElement;
		expect(box).not.toBeNull();
		if (box === null) return;
		expect(box.lastElementChild).toBe(description);
		const column = box.parentElement;
		expect(column).not.toBeNull();
		if (column === null) return;
		const columnClasses = column.className.split(/\s+/);
		expect(columnClasses).toContain("flex");
		expect(columnClasses).toContain("flex-col");
		expect(columnClasses).toContain("gap-4");

		const { neutralized, baseline } = computeParagraphCascade(description);

		// Positive control on the harness: an unclassed <p> in the same document
		// under the same stylesheet. If globals.css never reached the document this
		// would read "0px" and the assertion below would prove nothing — it would
		// pass against a build that neutralizes nothing.
		expect(baseline.marginBottom).toBe("16px");

		// The assertion. Without `mb-0` this reads "16px" — the same as the
		// baseline — and the rung renders at 32px instead of the declared 16px.
		expect(neutralized.marginBottom).toBe("0px");
	});
});

describe("AddTenantModal - application prefill (APPLY-04, Pitfall 6)", () => {
	const emailInput = () => screen.getByLabelText(/email address/i);
	const firstNameInput = () => screen.getByLabelText(/first name/i);
	const lastNameInput = () => screen.getByLabelText(/last name/i);
	const phoneInput = () => screen.getByLabelText(/phone number/i);

	it("prefills the applicant's details when opened with ?application=<id>", () => {
		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = APPLICANT;

		renderModal();

		expect(emailInput()).toHaveValue("marisol.vega@example.com");
		expect(firstNameInput()).toHaveValue("Marisol");
		expect(lastNameInput()).toHaveValue("Vega");
		expect(phoneInput()).toHaveValue("5125550132");

		// Every value above differs from the form's `""` default, so none of them
		// could be produced by an unprefilled render of this call site.
		expect(emailInput()).not.toHaveValue("");
		expect(phoneInput()).not.toHaveValue("");
	});

	it("resolves the applicant from the id alone — the URL carries no PII", () => {
		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = APPLICANT;

		renderModal();

		const applicationCall = mockUseQuery.mock.calls.find(
			([options]) => options.queryKey[0] === "applications",
		);

		// POSITIVE CONTROL FIRST: the id IS in the parameters and IS what the page
		// looked the row up by. Without this, the absence assertions below would
		// pass just as happily against a URL carrying no parameters at all.
		expect(applicationCall?.[0].queryKey).toContain(APPLICATION_ID);

		const params = new URLSearchParams(scenario.searchParams);
		expect([...params.keys()]).toEqual(["application"]);
		const rawQueryString = scenario.searchParams;
		expect(rawQueryString).not.toContain("marisol.vega@example.com");
		expect(rawQueryString).not.toContain("Marisol");
		expect(rawQueryString).not.toContain("5125550132");
		// …and the prefill still happened, from the id alone.
		expect(emailInput()).toHaveValue("marisol.vega@example.com");
	});

	it("leaves phone empty for an applicant who gave none, without losing the rest", async () => {
		// The modal-path equivalent of the merge-not-replace assertion: the
		// omitted value keeps the form's `""` default and the input stays
		// controlled. A `defaultValues: initialValues` replacement renders the
		// same empty box and only diverges once the owner types.
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
			// swallowed; the recorded calls are asserted below
		});
		const user = userEvent.setup();

		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = { ...APPLICANT, applicant_phone: null };

		renderModal();

		expect(phoneInput()).toHaveValue("");
		// Positive control: this call site did prefill, so the empty phone is the
		// default surviving rather than a prefill that never reached the form.
		expect(emailInput()).toHaveValue("marisol.vega@example.com");

		await user.type(phoneInput(), "5125550199");
		expect(phoneInput()).toHaveValue("5125550199");

		const uncontrolledWarnings = consoleError.mock.calls.filter((call) =>
			call.some(
				(arg) => typeof arg === "string" && /uncontrolled input/i.test(arg),
			),
		);
		expect(uncontrolledWarnings).toHaveLength(0);
		consoleError.mockRestore();
	});

	it("renders an empty form when opened with no application parameter", () => {
		renderModal();

		expect(emailInput()).toHaveValue("");
		expect(firstNameInput()).toHaveValue("");
		expect(lastNameInput()).toHaveValue("");
		expect(phoneInput()).toHaveValue("");
		// Positive control: the form rendered at all rather than a skeleton.
		expect(
			screen.getByRole("button", { name: /add tenant/i }),
		).toBeInTheDocument();
	});

	it("renders an unprefilled form when the id is stale, deleted or another owner's", () => {
		// RLS returns nothing for a foreign application, so "not found" and
		// "not yours" are the same null here. Neither may block tenant creation.
		scenario.searchParams = "application=00000000-0000-0000-0000-000000000000";
		scenario.application = null;

		renderModal();

		expect(emailInput()).toHaveValue("");
		expect(
			screen.getByRole("button", { name: /add tenant/i }),
		).toBeInTheDocument();
	});

	it("shows the duplicate-tenant notice without gating the form", async () => {
		const user = userEvent.setup();
		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = APPLICANT;
		scenario.duplicateTenant = { id: "tenant-9", name: "Marisol Vega" };

		renderModal();

		expect(
			screen.getByText(/already matches tenant Marisol Vega/i),
		).toBeInTheDocument();
		// Both routes stay open, and the submit control is untouched: a repeat
		// applicant for a second unit is a normal case, not a blocked one.
		expect(
			screen.getByRole("link", { name: /go to Marisol Vega/i }),
		).toHaveAttribute("href", "/tenants/tenant-9");
		expect(screen.getByRole("button", { name: /^add tenant$/i })).toBeEnabled();

		// BOTH ACTIONS MUST BE REAL CONTROLS, not labels. Presence in the document
		// is satisfied by an inert button, so this clicks the one that has no href
		// to prove it does its job: the notice clears and the form survives.
		await user.click(
			screen.getByRole("button", { name: /continue creating a new tenant/i }),
		);
		expect(
			screen.queryByText(/already matches tenant/i),
		).not.toBeInTheDocument();
		expect(emailInput()).toHaveValue("marisol.vega@example.com");
	});

	it("does not show the notice when no tenant matches the applicant", () => {
		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = APPLICANT;

		renderModal();

		// Positive control: the prefilled form rendered, so the absence below is
		// an absence of the notice and not an absence of the whole page.
		expect(emailInput()).toHaveValue("marisol.vega@example.com");
		expect(
			screen.queryByText(/already matches tenant/i),
		).not.toBeInTheDocument();
	});
});
