/**
 * NewPropertyModal (Intercepting Route) tests
 *
 * DASH-09: the create-property modal supplies onSuccess={() => router.back()}
 * as its only dismissal hook (PropertyForm's create path has no default close).
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

const propertyFormProps = vi.fn();
vi.mock("#components/properties/property-form.client", () => ({
	PropertyForm: (props: {
		mode: string;
		showSuccessState?: boolean;
		onSuccess?: () => void;
	}) => {
		propertyFormProps(props);
		return (
			<button type="button" onClick={() => props.onSuccess?.()}>
				submit-property
			</button>
		);
	},
}));

import NewPropertyModal from "./page";

describe("NewPropertyModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders PropertyForm in create mode without the success state", () => {
		render(<NewPropertyModal />);
		expect(screen.getByText("submit-property")).toBeInTheDocument();
		expect(propertyFormProps).toHaveBeenCalledWith(
			expect.objectContaining({ mode: "create", showSuccessState: false }),
		);
	});

	it("closes the modal via router.back() after a successful create", async () => {
		const user = userEvent.setup();
		render(<NewPropertyModal />);
		await user.click(screen.getByText("submit-property"));
		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});
