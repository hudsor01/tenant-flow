/**
 * Inspection Mutation Hooks Tests
 *
 * DATA-01: useUpdateInspection must INVALIDATE the enriched detail cache
 * (rooms + signed photo URLs) rather than overwrite it with the bare updated
 * row via updateDetail. This asserts the detail key is invalidated so a
 * regression re-adding updateDetail (collapsing the Rooms section) fails here.
 *
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import { inspectionQueries } from "../query-keys/inspection-keys";
import { useUpdateInspection } from "../use-inspection-mutations";

vi.mock("#lib/frontend-logger", () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	}),
}));
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

const supabaseFromMock = vi.fn();
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: supabaseFromMock }),
}));

const mockInspection = {
	id: "insp-123",
	inspection_type: "move_in",
	status: "completed",
	property_id: "prop-1",
	scheduled_date: "2026-01-01",
};

function createSpyWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	}
	return { Wrapper, invalidateSpy };
}

describe("useUpdateInspection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		supabaseFromMock.mockImplementation(() =>
			createQueryChain({ data: mockInspection }),
		);
	});

	it("invalidates the enriched detail key on update (DATA-01)", async () => {
		const { Wrapper, invalidateSpy } = createSpyWrapper();
		const { result } = renderHook(() => useUpdateInspection("insp-123"), {
			wrapper: Wrapper,
		});

		await result.current.mutateAsync({ status: "completed" });

		const invalidatedKeys = invalidateSpy.mock.calls.map((c) =>
			JSON.stringify((c[0] as { queryKey?: unknown })?.queryKey),
		);
		expect(invalidatedKeys).toContain(
			JSON.stringify(inspectionQueries.detailQuery("insp-123").queryKey),
		);
	});
});
