/**
 * AddTenantPage — the DIRECT-NAVIGATION call site of `AddTenantForm`.
 *
 * The twin of `src/app/(owner)/@modal/(.)tenants/new/page.test.tsx`, and it
 * exists for the same reason in the opposite direction. Research Pitfall 6 is
 * symmetric: a suite that pins only the intercepted route stays green while a
 * bookmark or a refresh of `/tenants/new?application=…` lands the owner on an
 * empty form. Each call site is asserted against its own page module, so
 * dropping the prop on either one turns exactly one file red.
 *
 * `AddTenantForm` is NOT mocked here either — a prop-capturing mock proves the
 * page passed something, while rendering the real form proves the owner sees
 * the applicant's details in the inputs.
 *
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { RentalApplicationRow } from "#hooks/api/query-keys/application-keys";
import type { TenantEmailMatch } from "#hooks/api/query-keys/tenant-keys";
import AddTenantPage from "./page";

const APPLICATION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

type ApplicantFixture = Pick<
	RentalApplicationRow,
	| "applicant_email"
	| "applicant_first_name"
	| "applicant_last_name"
	| "applicant_phone"
>;

const APPLICANT: ApplicantFixture = {
	applicant_email: "theo.nakamura@example.com",
	applicant_first_name: "Theo",
	applicant_last_name: "Nakamura",
	applicant_phone: "5125550164",
};

interface Scenario {
	searchParams: string;
	application: ApplicantFixture | null;
	duplicateTenant: TenantEmailMatch | null;
}

let scenario: Scenario;

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

function renderPage(): ReactElement {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	const ui = (
		<QueryClientProvider client={queryClient}>
			<AddTenantPage />
		</QueryClientProvider>
	);
	render(ui);
	return ui;
}

const emailInput = () => screen.getByLabelText(/email address/i);
const firstNameInput = () => screen.getByLabelText(/first name/i);
const lastNameInput = () => screen.getByLabelText(/last name/i);
const phoneInput = () => screen.getByLabelText(/phone number/i);

beforeEach(() => {
	vi.clearAllMocks();
	scenario = {
		searchParams: "",
		application: null,
		duplicateTenant: null,
	};
	mockUseQuery.mockImplementation(answer);
});

describe("AddTenantPage - application prefill (APPLY-04, Pitfall 6)", () => {
	it("prefills the applicant's details when opened with ?application=<id>", () => {
		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = APPLICANT;

		renderPage();

		expect(emailInput()).toHaveValue("theo.nakamura@example.com");
		expect(firstNameInput()).toHaveValue("Theo");
		expect(lastNameInput()).toHaveValue("Nakamura");
		expect(phoneInput()).toHaveValue("5125550164");

		// Each value differs from the form's `""` default, so an unprefilled
		// render of this call site could not satisfy any of them.
		expect(emailInput()).not.toHaveValue("");
		expect(phoneInput()).not.toHaveValue("");
	});

	it("resolves the applicant from the id alone — the URL carries no PII", () => {
		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = APPLICANT;

		renderPage();

		const applicationCall = mockUseQuery.mock.calls.find(
			([options]) => options.queryKey[0] === "applications",
		);

		// POSITIVE CONTROL FIRST: the id IS present and IS what the row was looked
		// up by. The absence assertions below are green against a URL with no
		// parameters at all, which is why this comes first.
		expect(applicationCall?.[0].queryKey).toContain(APPLICATION_ID);

		const params = new URLSearchParams(scenario.searchParams);
		expect([...params.keys()]).toEqual(["application"]);
		expect(scenario.searchParams).not.toContain("theo.nakamura@example.com");
		expect(scenario.searchParams).not.toContain("Theo");
		expect(scenario.searchParams).not.toContain("5125550164");
		expect(emailInput()).toHaveValue("theo.nakamura@example.com");
	});

	it("leaves phone empty for an applicant who gave none, without losing the rest", () => {
		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = { ...APPLICANT, applicant_phone: null };

		renderPage();

		expect(phoneInput()).toHaveValue("");
		// Positive control: this call site did prefill.
		expect(emailInput()).toHaveValue("theo.nakamura@example.com");
	});

	it("renders an empty form when opened with no application parameter", () => {
		renderPage();

		expect(emailInput()).toHaveValue("");
		expect(firstNameInput()).toHaveValue("");
		expect(lastNameInput()).toHaveValue("");
		expect(phoneInput()).toHaveValue("");
		expect(
			screen.getByRole("button", { name: /add tenant/i }),
		).toBeInTheDocument();
	});

	it("renders an unprefilled form when the id is stale, deleted or another owner's", () => {
		scenario.searchParams = "application=00000000-0000-0000-0000-000000000000";
		scenario.application = null;

		renderPage();

		expect(emailInput()).toHaveValue("");
		expect(
			screen.getByRole("button", { name: /add tenant/i }),
		).toBeInTheDocument();
	});

	it("shows the duplicate-tenant notice without gating the form", async () => {
		const user = userEvent.setup();
		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = APPLICANT;
		scenario.duplicateTenant = { id: "tenant-4", name: "Theo Nakamura" };

		renderPage();

		expect(
			screen.getByText(/already matches tenant Theo Nakamura/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /go to Theo Nakamura/i }),
		).toHaveAttribute("href", "/tenants/tenant-4");
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
		expect(emailInput()).toHaveValue("theo.nakamura@example.com");
	});

	it("does not show the notice when no tenant matches the applicant", () => {
		scenario.searchParams = `application=${APPLICATION_ID}`;
		scenario.application = APPLICANT;

		renderPage();

		// Positive control: the prefilled form rendered, so this is an absence of
		// the notice rather than an absence of the page.
		expect(emailInput()).toHaveValue("theo.nakamura@example.com");
		expect(
			screen.queryByText(/already matches tenant/i),
		).not.toBeInTheDocument();
	});
});
