/**
 * A row the plan-limit trigger refuses reports what that means, not the
 * trigger's machine text (help-trace bug 6, 2026-11-25: the failed-rows list
 * read "plan_limit_exceeded: properties (5 / 5 used)").
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { propertyBulkImportConfig } from "#components/properties/bulk-import-config";
import { propertyCreateSchema } from "#lib/validation/properties";
import type { BulkImportResult } from "#types/api-contracts";
import { useBulkImportMutation } from "../use-bulk-import-mutation";

/** The error enforce_property_plan_limit raises, as PostgREST returns it. */
function propertyLimitError(): Error {
	return Object.assign(
		new Error("plan_limit_exceeded: properties (5 / 5 used)"),
		{
			code: "P0001",
			hint: "plan_limit_exceeded",
			details:
				'{"resource":"properties","used":5,"limit":5,"upgrade_source":"property_limit"}',
		},
	);
}

const ROW = propertyCreateSchema.parse({
	name: "Maple Duplex",
	address_line1: "12 Maple St",
	city: "Austin",
	state: "TX",
	postal_code: "78701",
	property_type: "MULTI_UNIT",
});

describe("useBulkImportMutation — a plan-limited row", () => {
	it("lists the plan's limit, in words, for the row the trigger refused", async () => {
		const config = {
			...propertyBulkImportConfig(),
			insertRow: vi
				.fn()
				.mockResolvedValueOnce({ error: null })
				.mockResolvedValueOnce({ error: propertyLimitError() }),
			invalidateKeys: [],
		};
		const setResult = vi.fn<(result: BulkImportResult | null) => void>();
		const client = new QueryClient();
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(
			() =>
				useBulkImportMutation({
					config,
					setImportProgress: vi.fn(),
					setResult,
					mountedRef: { current: true },
				}),
			{ wrapper },
		);

		await act(async () => {
			await result.current.mutateAsync([
				{ csvLine: 2, parsed: ROW },
				{ csvLine: 3, parsed: ROW },
			]);
		});

		expect(setResult).toHaveBeenLastCalledWith({
			success: false,
			imported: 1,
			failed: 1,
			errors: [
				{
					row: 3,
					error:
						"You've reached your plan's limit of 5 properties. Upgrade to add more.",
				},
			],
		});
	});
});
