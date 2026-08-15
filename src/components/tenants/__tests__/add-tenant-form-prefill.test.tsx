/**
 * APPLY-04 — application prefill and conversion recording on `AddTenantForm`.
 *
 * THE TWO TRAPS THIS FILE IS BUILT AROUND.
 *
 * 1. "The form is prefilled" passes trivially if the assertion reads its own
 *    fixture back. Every prefill assertion here is paired with a field that must
 *    stay EMPTY, and with a check that the prefilled value differs from the
 *    form's `""` default. The phone-omitted case is the load-bearing one: it is
 *    the only assertion that separates `{ ...defaults, ...initialValues }` from
 *    `defaultValues: initialValues`, and the latter passes every other prefill
 *    assertion in this file while quietly handing React an uncontrolled input.
 *
 * 2. "The conversion mutation was not called" passes when the form never
 *    submitted at all. Both negative assertions carry a positive control in the
 *    same test — the create mutation must have been called first.
 *
 * WHAT THIS FILE DOES NOT PROVE. It does not prove the OTHER call site forwards
 * anything: `src/app/(owner)/@modal/(.)tenants/new/page.test.tsx` owns that, in
 * its own file, because research Pitfall 6 records that the intercepting-route
 * path drops the prop invisibly from here.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { ApplicationConversionResult } from "#hooks/api/query-keys/application-keys";
import {
	AddTenantForm,
	type AddTenantFormValues,
	type ApplicationPrefillSource,
	applicationToTenantInitialValues,
} from "../add-tenant-form";

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warning: vi.fn(),
	},
}));

const mockCreateTenant = vi.fn();
vi.mock("#hooks/api/use-tenant-mutations", () => ({
	useCreateTenantMutation: () => ({
		mutateAsync: mockCreateTenant,
		isPending: false,
	}),
}));

const mockRecordConversion = vi.fn();
vi.mock("#hooks/api/query-keys/application-keys", () => ({
	recordApplicationConversionMutationOptions: () => ({
		mutationKey: ["applications", "record-conversion"],
		mutationFn: (variables: unknown) => mockRecordConversion(variables),
	}),
}));

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		back: vi.fn(),
		refresh: vi.fn(),
	}),
}));

const APPLICATION_ROW: ApplicationPrefillSource = {
	applicant_email: "dana.reyes@example.com",
	applicant_first_name: "Dana",
	applicant_last_name: "Reyes",
	applicant_phone: "5125550147",
};

/** Exactly the keys `applicationToTenantInitialValues` is allowed to produce. */
const ALLOWED_PREFILL_KEYS = ["email", "first_name", "last_name", "phone"];

function renderForm(props: {
	initialValues?: Partial<AddTenantFormValues>;
	applicationId?: string;
}): ReactElement {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	const ui = (
		<QueryClientProvider client={queryClient}>
			<AddTenantForm
				properties={[]}
				units={[]}
				initialValues={props.initialValues}
				applicationId={props.applicationId}
			/>
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
	mockCreateTenant.mockResolvedValue({ id: "new-tenant-id" });
	mockRecordConversion.mockResolvedValue({
		success: true,
		reason: null,
	} satisfies ApplicationConversionResult);
});

describe("applicationToTenantInitialValues", () => {
	it("maps exactly four keys and smuggles nothing else across", () => {
		const values = applicationToTenantInitialValues(APPLICATION_ROW);

		// EQUALITY, not membership: a `toContain` check passes when a fifth key
		// appears, and a fifth key means an applicant field with no home on
		// `tenants` is being copied into a second retention surface (T-66-51).
		expect(Object.keys(values).sort()).toEqual(ALLOWED_PREFILL_KEYS);

		// Positive control — an empty object would satisfy nothing above.
		expect(values).toEqual({
			email: "dana.reyes@example.com",
			first_name: "Dana",
			last_name: "Reyes",
			phone: "5125550147",
		});
	});

	it("does not carry any field the tenants table has no column for", () => {
		// The row the detail page holds is far wider than the four keys above.
		// Handing the mapper a wider object must not widen its output.
		const wideRow = {
			...APPLICATION_ROW,
			gross_monthly_income: 7200,
			employer_name: "Kestrel Labs",
			current_street: "88 Bellow Ave",
			reference_1_phone: "5125550188",
		} as ApplicationPrefillSource;

		const values: Record<string, unknown> =
			applicationToTenantInitialValues(wideRow);

		expect(Object.keys(values).sort()).toEqual(ALLOWED_PREFILL_KEYS);
		expect(values.gross_monthly_income).toBeUndefined();
		expect(values.employer_name).toBeUndefined();
		expect(values.current_street).toBeUndefined();
		// Positive control: the four legitimate keys did come through.
		expect(values.email).toBe("dana.reyes@example.com");
	});

	it('maps a null phone to the empty string, not undefined and not "null"', () => {
		const values = applicationToTenantInitialValues({
			...APPLICATION_ROW,
			applicant_phone: null,
		});

		expect(values.phone).toBe("");
		expect(values.phone).not.toBeUndefined();
		expect(values.phone).not.toBe("null");
		// The key is PRESENT with an empty value — an absent key would also make
		// the first assertion's `undefined` comparison look reasonable.
		expect(Object.keys(values).sort()).toEqual(ALLOWED_PREFILL_KEYS);
	});
});

describe("AddTenantForm - prefill (APPLY-04)", () => {
	it("populates email, first name, last name and phone from initialValues", () => {
		renderForm({
			initialValues: applicationToTenantInitialValues(APPLICATION_ROW),
		});

		expect(emailInput()).toHaveValue("dana.reyes@example.com");
		expect(firstNameInput()).toHaveValue("Dana");
		expect(lastNameInput()).toHaveValue("Reyes");
		expect(phoneInput()).toHaveValue("5125550147");

		// Each prefilled value differs from the form's `""` default, so none of
		// the assertions above could be satisfied by an unprefilled render.
		expect(emailInput()).not.toHaveValue("");
		expect(firstNameInput()).not.toHaveValue("");
		expect(lastNameInput()).not.toHaveValue("");
		expect(phoneInput()).not.toHaveValue("");
	});

	it("keeps the default for a key initialValues omits (merge, not replace)", async () => {
		// THE TEST THAT CATCHES A REPLACEMENT — and the resting DOM alone does not
		// catch it. `IconInputField` passes `value={field.state.value}` straight
		// through with no `?? ""`, so under `defaultValues: initialValues` the
		// omitted `phone` is `undefined`, the input renders EMPTY exactly as a
		// merged `""` would, and every value assertion still passes. The
		// difference only becomes observable when the owner types: React logs an
		// uncontrolled-to-controlled warning that a merged default never produces.
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
			// swallowed; the assertion below reads the recorded calls
		});
		const user = userEvent.setup();

		renderForm({
			initialValues: {
				email: APPLICATION_ROW.applicant_email,
				first_name: APPLICATION_ROW.applicant_first_name,
				last_name: APPLICATION_ROW.applicant_last_name,
			},
		});

		expect(phoneInput()).toHaveValue("");
		// Positive control: the prefill did happen, so an empty phone is the
		// default surviving the spread rather than a render that prefilled nothing.
		expect(emailInput()).toHaveValue("dana.reyes@example.com");

		await user.type(phoneInput(), "5125550147");
		// Positive control: the typing actually reached the field, so the warning
		// assertion below is not passing against an interaction that never ran.
		expect(phoneInput()).toHaveValue("5125550147");

		const uncontrolledWarnings = consoleError.mock.calls.filter((call) =>
			call.some(
				(arg) => typeof arg === "string" && /uncontrolled input/i.test(arg),
			),
		);
		expect(uncontrolledWarnings).toHaveLength(0);
		consoleError.mockRestore();
	});

	it("renders every field empty when no initialValues are supplied", () => {
		renderForm({});

		expect(emailInput()).toHaveValue("");
		expect(firstNameInput()).toHaveValue("");
		expect(lastNameInput()).toHaveValue("");
		expect(phoneInput()).toHaveValue("");
	});
});

describe("AddTenantForm - conversion recording (APPLY-04, D-08)", () => {
	async function submit() {
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /add tenant/i }));
	}

	it("records the conversion against the created tenant when an applicationId is set", async () => {
		renderForm({
			initialValues: applicationToTenantInitialValues(APPLICATION_ROW),
			applicationId: "application-77",
		});

		await submit();

		await waitFor(() => {
			expect(mockRecordConversion).toHaveBeenCalledTimes(1);
		});
		// The tenant id is the one the create mutation returned — the RPC records
		// an outcome for a tenant that already exists, it never creates one.
		expect(mockRecordConversion.mock.calls[0]?.[0]).toEqual({
			applicationId: "application-77",
			tenantId: "new-tenant-id",
		});
	});

	it("never records a conversion when no applicationId is present", async () => {
		renderForm({
			initialValues: applicationToTenantInitialValues(APPLICATION_ROW),
		});

		await submit();

		// POSITIVE CONTROL FIRST: the form really did submit and create a tenant.
		// Without this, the negative assertion below passes against a form that
		// silently failed validation and never ran onSubmit at all.
		await waitFor(() => {
			expect(mockCreateTenant).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(mockRouterPush).toHaveBeenCalledWith("/tenants");
		});
		expect(mockRecordConversion).not.toHaveBeenCalled();
	});

	it("never records a conversion for an empty applicationId", async () => {
		// THE VALUE BOTH PAGES ACTUALLY PASS when there is no `?application=`
		// parameter is `""`, not `undefined` — `searchParams.get(...) ?? ""`. A
		// guard written as `applicationId === undefined` is green against the
		// prop-omitted case above and would mark an application whose id is the
		// empty string on every ordinary tenant creation.
		renderForm({
			initialValues: applicationToTenantInitialValues(APPLICATION_ROW),
			applicationId: "",
		});

		await submit();

		// Positive control before the negative assertion.
		await waitFor(() => {
			expect(mockCreateTenant).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(mockRouterPush).toHaveBeenCalledWith("/tenants");
		});
		expect(mockRecordConversion).not.toHaveBeenCalled();
	});

	it("treats already_converted as a non-error and continues the success flow", async () => {
		mockRecordConversion.mockResolvedValue({
			success: false,
			reason: "already_converted",
		} satisfies ApplicationConversionResult);

		renderForm({
			initialValues: applicationToTenantInitialValues(APPLICATION_ROW),
			applicationId: "application-77",
		});

		await submit();

		// POSITIVE CONTROL: the already_converted branch actually ran. "No error
		// toast" is trivially true for a mutation that was never called.
		await waitFor(() => {
			expect(mockRecordConversion).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(mockRouterPush).toHaveBeenCalledWith("/tenants");
		});

		expect(toast.error).not.toHaveBeenCalled();
		expect(toast.warning).not.toHaveBeenCalled();
	});

	it("warns that the tenant exists but the link was not recorded when the RPC fails", async () => {
		mockRecordConversion.mockRejectedValue(new Error("permission denied"));

		renderForm({
			initialValues: applicationToTenantInitialValues(APPLICATION_ROW),
			applicationId: "application-77",
		});

		await submit();

		await waitFor(() => {
			expect(toast.warning).toHaveBeenCalledTimes(1);
		});
		const message = vi.mocked(toast.warning).mock.calls[0]?.[0];
		expect(String(message)).toMatch(/tenant created/i);
		expect(String(message)).toMatch(/could not be marked as converted/i);

		// No rollback: the tenant was created and stays created.
		expect(mockCreateTenant).toHaveBeenCalledTimes(1);
		await waitFor(() => {
			expect(mockRouterPush).toHaveBeenCalledWith("/tenants");
		});
	});
});
