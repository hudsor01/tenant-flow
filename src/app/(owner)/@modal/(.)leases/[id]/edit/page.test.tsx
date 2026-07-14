/**
 * EditLeaseModal (Intercepting Route) tests
 *
 * DASH-05: correct nesting `(.)leases/[id]/edit`; the modal ports the full
 * page's terms-lock gate (redirect to the read-only detail when locked) and
 * passes onSuccess={() => router.back()} so a successful edit closes the modal.
 *
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// React's `use()` returns synchronously when the thenable already carries
// `status`/`value`, so tests avoid Suspense-resolution flakiness in jsdom.
function resolvedParams<T>(value: T): Promise<T> {
	const p = Promise.resolve(value) as Promise<T> & {
		status: string;
		value: T;
	};
	p.status = "fulfilled";
	p.value = value;
	return p;
}

const mockBack = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: mockBack, replace: mockReplace }),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));

const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();
	return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

vi.mock("#components/ui/route-modal", () => ({
	RouteModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const leaseFormProps = vi.fn();
vi.mock("#components/leases/lease-form", () => ({
	LeaseForm: (props: { mode: string; onSuccess?: () => void }) => {
		leaseFormProps(props);
		return (
			<button type="button" onClick={() => props.onSuccess?.()}>
				submit-lease
			</button>
		);
	},
}));

import EditLeaseModal from "./page";

function renderModal(id: string) {
	return render(<EditLeaseModal params={resolvedParams({ id })} />);
}

describe("EditLeaseModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the editable LeaseForm for an unlocked lease", async () => {
		useQueryMock.mockReturnValue({
			data: { id: "lease-1", lease_status: "draft", tenant_signed_at: null },
			isLoading: false,
			error: null,
		});
		renderModal("lease-1");
		expect(await screen.findByText("submit-lease")).toBeInTheDocument();
		expect(leaseFormProps).toHaveBeenCalledWith(
			expect.objectContaining({ mode: "edit" }),
		);
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it("closes via router.back() after a successful edit", async () => {
		const user = userEvent.setup();
		useQueryMock.mockReturnValue({
			data: { id: "lease-1", lease_status: "draft", tenant_signed_at: null },
			isLoading: false,
			error: null,
		});
		renderModal("lease-1");
		await user.click(await screen.findByText("submit-lease"));
		expect(mockBack).toHaveBeenCalledTimes(1);
	});

	it("redirects a terms-locked lease to the read-only detail and hides the form", async () => {
		useQueryMock.mockReturnValue({
			data: {
				id: "lease-1",
				lease_status: "pending_signature",
				tenant_signed_at: null,
			},
			isLoading: false,
			error: null,
		});
		renderModal("lease-1");
		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith("/leases/lease-1");
		});
		expect(screen.queryByText("submit-lease")).not.toBeInTheDocument();
	});
});
