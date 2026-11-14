/**
 * @vitest-environment jsdom
 * The maintenance form's vendor (vendor assignment). A create sends the picked
 * vendor, which the DB's vendor trigger turns into an assigned request, and
 * no vendor_id at all without one. An edit always sends the vendor: the picked
 * one, or null when cleared so the request loses it.
 */
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
} from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { MaintenanceUpdateMutationVariables } from "#hooks/api/use-maintenance";
import { useMaintenanceForm } from "#hooks/use-maintenance-form";
import type { MaintenanceRequestCreate } from "#lib/validation/maintenance";
import { DEFAULT_MAINTENANCE_REQUEST } from "#test/utils/test-data";
import type { MaintenanceRequest } from "#types/core";

const VENDOR = "0a0a0a0a-0000-4000-8000-00000000beef";

const FILLED = {
	title: "Heater makes noise",
	description: "Reported on the phone; needs a visit this week.",
	unit_id: "11111111-1111-4111-8111-111111111111",
	tenant_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

function wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			{children}
		</QueryClientProvider>
	);
}

function renderCreateForm() {
	const create = vi.fn(
		async (_payload: MaintenanceRequestCreate): Promise<MaintenanceRequest> =>
			DEFAULT_MAINTENANCE_REQUEST,
	);
	const { result } = renderHook(
		() =>
			useMaintenanceForm({
				mode: "create",
				defaultValues: FILLED,
				createMutation: useMutation({ mutationFn: create }),
			}),
		{ wrapper },
	);
	return { form: result, create };
}

function renderEditForm(vendorId: string) {
	const update = vi.fn(
		async (
			_variables: MaintenanceUpdateMutationVariables,
		): Promise<MaintenanceRequest> => DEFAULT_MAINTENANCE_REQUEST,
	);
	const { result } = renderHook(
		() =>
			useMaintenanceForm({
				mode: "edit",
				requestId: "maintenance-1",
				defaultValues: { ...FILLED, vendor_id: vendorId },
				updateMutation: useMutation({ mutationFn: update }),
			}),
		{ wrapper },
	);
	return { form: result, update };
}

describe("the maintenance form's vendor", () => {
	it("is sent on a create when one is picked", async () => {
		const { form, create } = renderCreateForm();
		act(() => form.current.setFieldValue("vendor_id", VENDOR));
		await act(() => form.current.handleSubmit());
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ vendor_id: VENDOR, status: "open" }),
			expect.anything(),
		);
	});

	it("is left out of a create without one", async () => {
		const { form, create } = renderCreateForm();
		await act(() => form.current.handleSubmit());
		expect(create).toHaveBeenCalledTimes(1);
		expect(create.mock.calls[0]?.[0]).not.toHaveProperty("vendor_id");
	});

	it("is sent on an edit as picked", async () => {
		const { form, update } = renderEditForm("");
		act(() => form.current.setFieldValue("vendor_id", VENDOR));
		await act(() => form.current.handleSubmit());
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "maintenance-1",
				data: expect.objectContaining({ vendor_id: VENDOR }),
			}),
			expect.anything(),
		);
	});

	it("is sent as null on an edit that clears it", async () => {
		const { form, update } = renderEditForm(VENDOR);
		act(() => form.current.setFieldValue("vendor_id", ""));
		await act(() => form.current.handleSubmit());
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ vendor_id: null }),
			}),
			expect.anything(),
		);
	});
});
