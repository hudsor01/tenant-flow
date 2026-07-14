/**
 * EditPropertyModal (Intercepting Route) tests
 *
 * DASH-08: correct nesting `(.)properties/[id]/edit`; PropertyForm's edit path
 * back-navigates when no onSuccess is supplied, so the modal passes none.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
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

vi.mock("next/navigation", () => ({
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

const propertyFormProps = vi.fn();
vi.mock("#components/properties/property-form.client", () => ({
	PropertyForm: (props: {
		mode: string;
		property?: unknown;
		showSuccessState?: boolean;
	}) => {
		propertyFormProps(props);
		return <div>property-form</div>;
	},
}));

import EditPropertyModal from "./page";

function renderModal(id: string) {
	return render(<EditPropertyModal params={resolvedParams({ id })} />);
}

describe("EditPropertyModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders PropertyForm in edit mode with the loaded property", async () => {
		const property = { id: "prop-1", name: "Maple Court" };
		useQueryMock.mockReturnValue({
			data: property,
			isLoading: false,
			error: null,
		});
		renderModal("prop-1");
		expect(await screen.findByText("property-form")).toBeInTheDocument();
		expect(propertyFormProps).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: "edit",
				property,
				showSuccessState: false,
			}),
		);
	});

	it("renders a skeleton while loading (no form)", async () => {
		useQueryMock.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});
		renderModal("prop-1");
		// Suspense resolves the params; the form should not render while loading.
		await Promise.resolve();
		expect(screen.queryByText("property-form")).not.toBeInTheDocument();
	});
});
