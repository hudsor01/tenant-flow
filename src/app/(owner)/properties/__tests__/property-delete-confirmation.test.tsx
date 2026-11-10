/**
 * @vitest-environment jsdom
 * A property's delete confirmation says what the delete does (66.2-39 fix
 * round 4, Part 8h).
 *
 * Both property deletes set `status = 'inactive'` (a soft delete) and touch
 * nothing else: no trigger cascades to the units, and the leases stay. The
 * property page's confirmation said the delete "will also delete all units
 * associated with this property" and "cannot be undone", and the properties
 * list's said "This action cannot be undone": a cascade and a permanence the
 * mutation does not have. Both now say the property leaves the list and its
 * units and leases are kept, and name the property in the title.
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import PropertiesPage from "#app/(owner)/properties/page";
import { PropertyDetails } from "#app/(owner)/properties/property-details.client";
import { DEFAULT_PROPERTY } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

vi.mock("#components/documents/documents-section", () => ({
	DocumentsSection: () => null,
}));
vi.mock("#components/properties/property-image-gallery", () => ({
	PropertyImageGallery: () => null,
}));
vi.mock("#components/properties/property-performance-section", () => ({
	PropertyPerformanceSection: () => null,
}));
vi.mock("#components/properties/property-units-table", () => ({
	PropertyUnitsTable: () => null,
}));
vi.mock("#hooks/api/use-property-mutations", () => ({
	useDeletePropertyMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("#components/properties/properties", () => ({
	Properties: ({
		onPropertyDelete,
	}: {
		onPropertyDelete: (id: string) => void;
	}): ReactNode => (
		<button type="button" onClick={() => onPropertyDelete("p1")}>
			delete p1
		</button>
	),
}));
vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();
	return {
		...actual,
		useQuery: () => ({
			data: {
				data: [
					{ ...DEFAULT_PROPERTY, id: "p1", name: "Maple Court", units: [] },
				],
				total: 1,
			},
			isLoading: false,
			error: null,
		}),
	};
});

const SAYS =
	"This marks the property as inactive, so it leaves your property list. Its units and leases are kept.";

describe("a property's delete confirmation", () => {
	it("on the property's page names it and claims no cascade or permanence", async () => {
		const user = userEvent.setup();
		render(
			<PropertyDetails
				property={{ ...DEFAULT_PROPERTY, name: "Maple Court" }}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Delete property" }));
		const dialog = await screen.findByRole("alertdialog", {
			name: 'Delete property "Maple Court"?',
		});
		expect(within(dialog).getByText(SAYS)).toBeInTheDocument();
		expect(dialog.textContent).not.toMatch(
			/delete all units|cannot be undone/i,
		);
	});

	it("on the properties list names it and claims no permanence", async () => {
		const user = userEvent.setup();
		render(<PropertiesPage />);
		await user.click(screen.getByRole("button", { name: "delete p1" }));
		const dialog = await screen.findByRole("alertdialog", {
			name: 'Delete property "Maple Court"?',
		});
		expect(within(dialog).getByText(SAYS)).toBeInTheDocument();
		expect(dialog.textContent).not.toMatch(/cannot be undone/i);
	});
});
