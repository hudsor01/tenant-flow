/**
 * A submit button submits the form it renders with (66.2-39 fix round 4,
 * Part 5d).
 *
 * THE DEFECT. `/tenants/[id]/edit` could not save: TenantEditForm built its
 * `type="submit"` Save Changes button into CardLayout's `footer` prop, and
 * CardLayout renders that prop in its CardFooter, a sibling of the
 * CardContent that holds the `<form>`. The button had no form owner
 * (`button.form === null`), so a click submitted nothing and sent no update.
 * AddTenantForm had no `<form>` at all: its submit button worked only through
 * an `onClick`, and Enter in a field did nothing.
 *
 * WHAT IS RENDERED HERE. Every form component that hands its submit button to
 * a slot outside the `<form>` (the static sweep of every `type="submit"` in
 * `src` found one: TenantEditForm), and every form component whose submit
 * button had no `<form>` (AddTenantForm). Each case checks the button's form
 * owner and that the action the user takes (a click, or Enter in a field)
 * reaches the mutation. `submit-buttons-inside-a-form.test.ts` holds the rest
 * of the class statically.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantEditForm } from "#app/(owner)/tenants/components/tenant-edit-form.client";
import { AddTenantForm } from "#components/tenants/add-tenant-form";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import { DEFAULT_TENANT } from "#test/utils/test-data";

const mocks = vi.hoisted(() => ({
	update: vi.fn(),
	create: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("#hooks/api/use-tenant-mutations", () => ({
	useUpdateTenantMutation: () => ({
		mutateAsync: mocks.update,
		isPending: false,
	}),
	useCreateTenantMutation: () => ({
		mutateAsync: mocks.create,
		isPending: false,
	}),
}));

const TENANT_ID = "7b1f4a0e-0000-4000-8000-000000000001";

function asButton(element: HTMLElement): HTMLButtonElement {
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`expected a <button>, got <${element.tagName}>`);
	}
	return element;
}

function client(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
			mutations: { retry: false },
		},
	});
}

async function renderTenantEditForm() {
	const queryClient = client();
	queryClient.setQueryData(tenantQueries.detail(TENANT_ID).queryKey, {
		...DEFAULT_TENANT,
		id: TENANT_ID,
		emergency_contact_name: "Jordan Lee",
		emergency_contact_phone: "(512) 555-0100",
		emergency_contact_relationship: "Sibling",
	});
	const view = render(
		<QueryClientProvider client={queryClient}>
			<Suspense fallback={null}>
				<TenantEditForm id={TENANT_ID} />
			</Suspense>
		</QueryClientProvider>,
	);
	const save = asButton(
		await screen.findByRole("button", { name: /save changes/i }),
	);
	return { view, save };
}

function renderAddTenantForm() {
	const view = render(
		<QueryClientProvider client={client()}>
			<AddTenantForm properties={[]} units={[]} />
		</QueryClientProvider>,
	);
	const add = asButton(screen.getByRole("button", { name: /add tenant/i }));
	return { view, add };
}

describe("a submit button submits the form it renders with", () => {
	beforeEach(() => {
		mocks.update.mockReset().mockResolvedValue({ ...DEFAULT_TENANT });
		mocks.create.mockReset().mockResolvedValue({
			...DEFAULT_TENANT,
			id: TENANT_ID,
		});
	});

	describe("TenantEditForm (Save Changes rendered in CardLayout's footer)", () => {
		it("Save Changes belongs to the tenant form", async () => {
			const { view, save } = await renderTenantEditForm();
			const forms = view.container.querySelectorAll("form");
			expect(forms).toHaveLength(1);
			expect(save.type).toBe("submit");
			expect(save.form).toBe(forms[0]);
		});

		it("clicking Save Changes sends the update", async () => {
			const { save } = await renderTenantEditForm();
			const user = userEvent.setup();
			const relationship = screen.getByLabelText(/relationship/i);
			await user.clear(relationship);
			await user.type(relationship, "Parent");
			await user.click(save);
			await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
			expect(mocks.update).toHaveBeenCalledWith({
				id: TENANT_ID,
				data: {
					emergency_contact_name: "Jordan Lee",
					emergency_contact_phone: "(512) 555-0100",
					emergency_contact_relationship: "Parent",
				},
			});
		});
	});

	describe("AddTenantForm (no <form> of its own before the fix)", () => {
		it("Add Tenant belongs to the tenant form", () => {
			const { view, add } = renderAddTenantForm();
			const forms = view.container.querySelectorAll("form");
			expect(forms).toHaveLength(1);
			expect(add.type).toBe("submit");
			expect(add.form).toBe(forms[0]);
		});

		it("Enter in a field submits the form", async () => {
			renderAddTenantForm();
			const user = userEvent.setup();
			await user.type(screen.getByLabelText(/first name/i), "Dana");
			await user.type(screen.getByLabelText(/last name/i), "Reyes");
			await user.type(
				screen.getByLabelText(/email address/i),
				"dana.reyes@example.com{Enter}",
			);
			await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
			expect(mocks.create).toHaveBeenCalledWith(
				expect.objectContaining({
					email: "dana.reyes@example.com",
					first_name: "Dana",
					last_name: "Reyes",
				}),
			);
		});
	});
});
