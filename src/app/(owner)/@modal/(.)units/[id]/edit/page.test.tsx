/**
 * EditUnitModal (Intercepting Route) tests
 *
 * DASH-04/15: correct nesting `(.)units/[id]/edit`; UnitForm receives the id
 * and onSuccess={() => router.back()} so a successful edit closes the modal.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
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
vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: mockBack }),
}));

vi.mock("#components/ui/route-modal", () => ({
	RouteModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const unitFormProps = vi.fn();
vi.mock("#components/units/unit-form.client", () => ({
	UnitForm: (props: { mode: string; id?: string; onSuccess?: () => void }) => {
		unitFormProps(props);
		return (
			<button type="button" onClick={() => props.onSuccess?.()}>
				submit-unit
			</button>
		);
	},
}));

import EditUnitModal from "./page";

function renderModal(id: string) {
	return render(<EditUnitModal params={resolvedParams({ id })} />);
}

describe("EditUnitModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders UnitForm in edit mode with the route id", async () => {
		renderModal("unit-1");
		expect(await screen.findByText("submit-unit")).toBeInTheDocument();
		expect(unitFormProps).toHaveBeenCalledWith(
			expect.objectContaining({ mode: "edit", id: "unit-1" }),
		);
	});

	it("closes the modal via router.back() after a successful edit", async () => {
		const user = userEvent.setup();
		renderModal("unit-1");
		await user.click(await screen.findByText("submit-unit"));
		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});
