/**
 * NewUnitModal (Intercepting Route) tests
 *
 * DASH-04/15: the create-unit modal passes onSuccess={() => router.back()} so
 * UnitForm closes in place instead of navigating to /units.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: mockBack }),
}));

vi.mock("#components/ui/route-modal", () => ({
	RouteModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const unitFormProps = vi.fn();
vi.mock("#components/units/unit-form.client", () => ({
	UnitForm: (props: { mode: string; onSuccess?: () => void }) => {
		unitFormProps(props);
		return (
			<button type="button" onClick={() => props.onSuccess?.()}>
				submit-unit
			</button>
		);
	},
}));

import NewUnitModal from "./page";

describe("NewUnitModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the create heading and UnitForm in create mode", () => {
		render(<NewUnitModal />);
		expect(screen.getByText("Add New Unit")).toBeInTheDocument();
		expect(unitFormProps).toHaveBeenCalledWith(
			expect.objectContaining({ mode: "create" }),
		);
	});

	it("closes the modal via router.back() after a successful create", async () => {
		const user = userEvent.setup();
		render(<NewUnitModal />);
		await user.click(screen.getByText("submit-unit"));
		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});
