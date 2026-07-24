/**
 * UsageSection component tests (METER-02 / METER-03).
 *
 * Proves the proactive upgrade surface:
 *   (a) Growth at 20/25 e-signs (80%) shows the e-sign near-cap upgrade prompt
 *       with a /billing/plans?source=esign_quota CTA;
 *   (b) Max shows "Unlimited" for both widgets with no Progress bar;
 *   (c) a storage value in the GB range at >=80% renders via formatBytes as GB
 *       and shows the storage prompt with a ?source=storage_quota_gate CTA.
 *
 * useQuery is mocked and dispatches on the queryKey (the real usageQueries
 * factory keys), so the widgets render off controlled state without a live
 * QueryClient or the RPC boundary.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface QueryState {
	data?: unknown;
	isLoading: boolean;
	isError: boolean;
}

const { esignResult, storageResult } = vi.hoisted(() => ({
	esignResult: vi.fn<() => QueryState>(),
	storageResult: vi.fn<() => QueryState>(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();
	return {
		...actual,
		useQuery: (options: { queryKey: readonly unknown[] }) => {
			const key = options.queryKey;
			if (Array.isArray(key) && key.includes("esign")) return esignResult();
			return storageResult();
		},
	};
});

import { UsageSection } from "../sections/usage-section";

const GB = 1024 * 1024 * 1024;

beforeEach(() => {
	vi.clearAllMocks();
	// Default both widgets to well-below-cap so a single test can drive one
	// widget into the near-cap state without the other tripping its prompt.
	esignResult.mockReturnValue({
		data: { used: 3, cap: 25, unlimited: false },
		isLoading: false,
		isError: false,
	});
	storageResult.mockReturnValue({
		data: { usedBytes: 1 * GB, limitGb: 10, unlimited: false },
		isLoading: false,
		isError: false,
	});
});

describe("UsageSection — e-sign near-cap (METER-02)", () => {
	it("shows the e-sign upgrade prompt + esign_quota CTA at 20/25", () => {
		esignResult.mockReturnValue({
			data: { used: 20, cap: 25, unlimited: false },
			isLoading: false,
			isError: false,
		});

		render(<UsageSection />);

		expect(
			screen.getByText(/20 of 25 lease e-signs used this month/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/approaching your monthly e-sign limit/i),
		).toBeInTheDocument();
		const cta = screen.getByRole("link", { name: /upgrade your plan/i });
		expect(cta).toHaveAttribute("href", "/billing/plans?source=esign_quota");
	});
});

describe("UsageSection — Max unlimited", () => {
	it("shows Unlimited for both widgets with no Progress bar", () => {
		esignResult.mockReturnValue({
			data: { used: 0, cap: 25, unlimited: true },
			isLoading: false,
			isError: false,
		});
		storageResult.mockReturnValue({
			data: { usedBytes: 0, limitGb: -1, unlimited: true },
			isLoading: false,
			isError: false,
		});

		render(<UsageSection />);

		expect(screen.getByText(/unlimited e-signs/i)).toBeInTheDocument();
		expect(screen.getByText(/unlimited storage/i)).toBeInTheDocument();
		expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
		expect(
			screen.queryByRole("link", { name: /upgrade your plan/i }),
		).not.toBeInTheDocument();
	});
});

describe("UsageSection — storage near-cap GB rendering (METER-03)", () => {
	it("renders GB via formatBytes and shows the storage_quota_gate CTA at >=80%", () => {
		storageResult.mockReturnValue({
			data: { usedBytes: 8.5 * GB, limitGb: 10, unlimited: false },
			isLoading: false,
			isError: false,
		});

		render(<UsageSection />);

		expect(screen.getByText(/8\.5 GB of 10 GB used/i)).toBeInTheDocument();
		expect(
			screen.getByText(/approaching your storage quota/i),
		).toBeInTheDocument();
		const cta = screen.getByRole("link", { name: /upgrade your plan/i });
		expect(cta).toHaveAttribute(
			"href",
			"/billing/plans?source=storage_quota_gate",
		);
	});
});
