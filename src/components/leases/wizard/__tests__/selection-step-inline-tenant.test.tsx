/**
 * The lease wizard's tenant step: a tenant added from inside the wizard
 * becomes the lease's primary tenant, and the empty state names the button
 * that adds one (help-trace bugs 1 and 2, 2026-11-25).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SelectionStep } from "../selection-step";

const mocks = vi.hoisted(() => ({
	from: vi.fn(),
	mutateAsync: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mocks.from }),
}));

vi.mock("#hooks/api/use-tenant-mutations", () => ({
	useCreateTenantMutation: () => ({
		mutateAsync: mocks.mutateAsync,
		isPending: false,
	}),
}));

/** A query chain that resolves with `rows` however it is built. */
function rowsChain(rows: unknown[]) {
	const result = { data: rows, error: null };
	const chain: Record<string, unknown> = {};
	for (const method of ["select", "neq", "eq", "order", "range", "single"]) {
		chain[method] = () => chain;
	}
	chain.then = (resolve: (value: unknown) => unknown) =>
		Promise.resolve(result).then(resolve);
	return chain;
}

function renderStep(onChange = vi.fn()) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	render(
		<QueryClientProvider client={client}>
			<SelectionStep data={{ property_id: "prop-1" }} onChange={onChange} />
		</QueryClientProvider>,
	);
	return onChange;
}

beforeEach(() => {
	mocks.from.mockReset();
	mocks.from.mockImplementation(() => rowsChain([]));
	mocks.mutateAsync.mockReset();
});

describe("SelectionStep — adding a tenant from the wizard", () => {
	it("selects the tenant it creates as the primary tenant", async () => {
		mocks.mutateAsync.mockResolvedValue({ id: "tenant-new" });
		const user = userEvent.setup();
		const onChange = renderStep();

		await user.click(
			await screen.findByRole("button", { name: /Add New Tenant/i }),
		);
		await user.type(screen.getByLabelText(/First Name/), "Dana");
		await user.type(screen.getByLabelText(/Last Name/), "Reyes");
		await user.type(screen.getByLabelText(/Email/), "dana@example.com");
		await user.click(screen.getByRole("button", { name: "Add Tenant" }));

		expect(mocks.mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({
				first_name: "Dana",
				last_name: "Reyes",
				email: "dana@example.com",
			}),
		);
		expect(onChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ primary_tenant_id: "tenant-new" }),
		);
		// Back on the picker, not the add form.
		expect(
			await screen.findByRole("button", { name: /Add New Tenant/i }),
		).toBeInTheDocument();
	});

	it("selects nobody when the create fails", async () => {
		mocks.mutateAsync.mockRejectedValue(new Error("Unique violation"));
		const user = userEvent.setup();
		const onChange = renderStep();

		await user.click(
			await screen.findByRole("button", { name: /Add New Tenant/i }),
		);
		await user.type(screen.getByLabelText(/First Name/), "Dana");
		await user.type(screen.getByLabelText(/Last Name/), "Reyes");
		await user.type(screen.getByLabelText(/Email/), "dana@example.com");
		await user.click(screen.getByRole("button", { name: "Add Tenant" }));

		expect(onChange).not.toHaveBeenCalledWith(
			expect.objectContaining({ primary_tenant_id: expect.any(String) }),
		);
	});

	it("points an owner with no tenants at the button that adds one", async () => {
		renderStep();

		const description = await screen.findByText(/to get started/);
		expect(description).toHaveTextContent('Use "Add New Tenant" above');
		expect(
			screen.getByRole("button", { name: /Add New Tenant/i }),
		).toBeInTheDocument();
	});
});
