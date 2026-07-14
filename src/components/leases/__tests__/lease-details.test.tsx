/**
 * @vitest-environment jsdom
 * LeaseDetails Component Tests
 *
 * Tests the enhanced lease detail view including:
 * - Timeline rendering with events
 * - Status badges and expiring badges
 * - Tabbed content (Details, Timeline, Terms)
 * - Responsive layout
 * - Loading and error states
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "#test/utils/test-render";
import type { Lease } from "#types/core";
import { LeaseDetails } from "../detail/lease-details.client";

// Mock the hooks
const mockLease: Lease = {
	id: "lease-test-123",
	unit_id: "unit-101",
	primary_tenant_id: "tenant-123",
	owner_user_id: "owner-123",
	start_date: "2024-01-01",
	end_date: "2024-12-31",
	rent_amount: 2500,
	rent_currency: "USD",
	security_deposit: 5000,
	lease_status: "active",
	payment_day: 1,
	grace_period_days: 3,
	late_fee_amount: 50,
	late_fee_days: 5,
	created_at: "2023-12-15T00:00:00Z",
	updated_at: "2024-06-01T00:00:00Z",
	owner_signature_user_agent: null,
	tenant_signature_user_agent: null,
	tenant_signature_name: null,
	owner_signature_consent_at: null,
	tenant_signature_consent_at: null,
	signed_document_path: null,
	signed_document_hash: null,
	landlord_notice_address: null,
	immediate_family_members: null,
	owner_signed_at: "2023-12-20T10:00:00Z",
	owner_signature_ip: null,
	owner_signature_method: "in_app",
	tenant_signed_at: "2023-12-22T14:00:00Z",
	tenant_signature_ip: null,
	tenant_signature_method: "in_app",
	sent_for_signature_at: "2023-12-18T09:00:00Z",
	max_occupants: 4,
	pets_allowed: true,
	pet_deposit: 250,
	pet_rent: 25,
	utilities_included: ["water", "trash"],
	tenant_responsible_utilities: ["electricity", "gas"],
	property_rules: null,
	property_built_before_1978: true,
	lead_paint_disclosure_acknowledged: true,
	governing_state: "TX",
};

const mockTenant = {
	id: "tenant-123",
	first_name: "John",
	last_name: "Doe",
	email: "john.doe@example.com",
	user_id: "user-123",
	created_at: "2023-01-01T00:00:00Z",
	updated_at: "2023-01-01T00:00:00Z",
};

const mockUnit = {
	id: "unit-101",
	property_id: "prop-123",
	unit_number: "101",
	bedrooms: 2,
	bathrooms: 1,
	square_feet: 900,
	status: "occupied",
	rent_amount: 2500,
	created_at: "2023-01-01T00:00:00Z",
	updated_at: "2023-01-01T00:00:00Z",
};

// Mock the query hooks
vi.mock("@tanstack/react-query", async () => {
	const actual = await vi.importActual("@tanstack/react-query");
	return {
		...actual,
		useQuery: vi.fn((options) => {
			const queryKey = options.queryKey || [];

			// Mock lease detail query
			if (queryKey.includes("leases") && queryKey.includes("detail")) {
				return {
					data: mockLease,
					isLoading: false,
					isError: false,
					error: null,
				};
			}

			// Mock tenant list query
			if (queryKey.includes("tenants") && queryKey.includes("list")) {
				return {
					data: { data: [mockTenant] },
					isLoading: false,
					isError: false,
				};
			}

			// Default
			return {
				data: null,
				isLoading: false,
				isError: false,
			};
		}),
	};
});

vi.mock("#hooks/api/use-unit", () => ({
	useUnitList: () => ({
		data: [mockUnit],
		isLoading: false,
		error: null,
	}),
}));

vi.mock("#hooks/api/use-lease", () => ({
	leaseQueries: {
		all: () => ["leases"],
		lists: () => ["leases", "list"],
		list: () => ({ queryKey: ["leases", "list"] }),
		detail: (id: string) => ({ queryKey: ["leases", "detail", id] }),
	},
	useCancelSignatureRequestMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
	}),
	useSignedDocumentUrl: () => ({
		data: null,
		isLoading: false,
		error: null,
	}),
}));

// Mock use-tenant to provide tenantQueries (needed by use-lease)
vi.mock("#hooks/api/use-tenant", () => ({
	tenantQueries: {
		all: () => ["tenants"],
		lists: () => ["tenants", "list"],
		list: () => ({ queryKey: ["tenants", "list"] }),
		detail: (id: string) => ({ queryKey: ["tenants", "detail", id] }),
	},
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe("LeaseDetails", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		test("renders lease ID in header", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(screen.getByText(/Lease #lease-te/i)).toBeInTheDocument();
			});
		});

		test("renders status badge for active lease", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(screen.getByText("Active")).toBeInTheDocument();
			});
		});

		test("renders key metrics cards", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(screen.getByText("Monthly Rent")).toBeInTheDocument();
				expect(screen.getByText("Security Deposit")).toBeInTheDocument();
				expect(screen.getByText("Payment Day")).toBeInTheDocument();
				expect(screen.getByText("Grace Period")).toBeInTheDocument();
			});
		});

		test("renders rent amount correctly formatted", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				// Check for the formatted rent amount
				const rentElements = screen.getAllByText(/\$2,500\.00/);
				expect(rentElements.length).toBeGreaterThan(0);
			});
		});
	});

	describe("Tabs", () => {
		test("renders all three tabs", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: /details/i }),
				).toBeInTheDocument();
				expect(
					screen.getByRole("tab", { name: /timeline/i }),
				).toBeInTheDocument();
				expect(screen.getByRole("tab", { name: /terms/i })).toBeInTheDocument();
			});
		});

		test("Details tab is selected by default", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				const detailsTab = screen.getByRole("tab", { name: /details/i });
				expect(detailsTab).toHaveAttribute("data-state", "active");
			});
		});

		test("can switch to Timeline tab", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: /timeline/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("tab", { name: /timeline/i }));

			await waitFor(() => {
				expect(screen.getByText("Lease History")).toBeInTheDocument();
			});
		});

		test("can switch to Terms tab", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: /terms/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("tab", { name: /terms/i }));

			await waitFor(() => {
				expect(screen.getByText("Lease Terms")).toBeInTheDocument();
			});
		});
	});

	describe("Timeline Events", () => {
		test("shows lease created event", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: /timeline/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("tab", { name: /timeline/i }));

			await waitFor(() => {
				expect(screen.getByText("Lease Created")).toBeInTheDocument();
			});
		});

		test("shows signature events", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: /timeline/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("tab", { name: /timeline/i }));

			await waitFor(() => {
				expect(screen.getByText("Owner Signed")).toBeInTheDocument();
				expect(screen.getByText("Tenant Signed")).toBeInTheDocument();
			});
		});

		test("shows lease activated event for active lease", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: /timeline/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("tab", { name: /timeline/i }));

			await waitFor(() => {
				expect(screen.getByText("Lease Activated")).toBeInTheDocument();
			});
		});
	});

	describe("Terms Tab", () => {
		test("shows financial terms section", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await user.click(screen.getByRole("tab", { name: /terms/i }));

			await waitFor(() => {
				expect(screen.getByText("Financial Terms")).toBeInTheDocument();
				expect(screen.getByText("Late Fee")).toBeInTheDocument();
			});
		});

		test("shows property rules when present", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await user.click(screen.getByRole("tab", { name: /terms/i }));

			await waitFor(() => {
				expect(screen.getByText("Property Rules")).toBeInTheDocument();
				expect(screen.getByText("Max Occupants")).toBeInTheDocument();
				expect(screen.getByText("Pets")).toBeInTheDocument();
			});
		});

		test("shows utilities section when utilities defined", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await user.click(screen.getByRole("tab", { name: /terms/i }));

			await waitFor(() => {
				expect(screen.getByText("Utilities")).toBeInTheDocument();
				expect(screen.getByText("Included in Rent")).toBeInTheDocument();
				expect(screen.getByText("Tenant Responsible")).toBeInTheDocument();
			});
		});

		test("shows lead paint disclosure for pre-1978 properties", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await user.click(screen.getByRole("tab", { name: /terms/i }));

			await waitFor(() => {
				expect(screen.getByText("Lead Paint Disclosure")).toBeInTheDocument();
			});
		});
	});

	describe("Details Tab", () => {
		test("shows tenant information", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(screen.getByText("John Doe")).toBeInTheDocument();
				expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
			});
		});

		test("shows unit information", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(screen.getByText("Unit 101")).toBeInTheDocument();
			});
		});
	});

	describe("Quick Actions", () => {
		test("renders quick actions card for active lease", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(screen.getByText("Quick Actions")).toBeInTheDocument();
			});
		});

		test("shows maintenance link for active lease", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(
					screen.getByRole("link", { name: /maintenance requests/i }),
				).toBeInTheDocument();
			});
			expect(
				screen.queryByRole("link", { name: /view payments/i }),
			).not.toBeInTheDocument();
		});

		test("shows tenant profile link", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(
					screen.getByRole("link", { name: /view tenant profile/i }),
				).toBeInTheDocument();
			});
		});

		test("shows unit link to the unit edit route when unit exists", async () => {
			// DASH-11: the affordance is relabeled "View Unit" and points at the
			// real per-unit route /units/[id]/edit (the old
			// /properties/[id]/units/[unitId] route never existed and 404'd).
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				const unitLink = screen.getByRole("link", { name: /view unit/i });
				expect(unitLink).toHaveAttribute("href", "/units/unit-101/edit");
			});
		});
	});

	describe("Edit Button", () => {
		test("renders a disabled (locked) edit affordance for a signed lease", async () => {
			// mockLease is signed (tenant_signed_at set) → terms locked, so the
			// Edit affordance is a disabled button, not an editable link (LEASE-04).
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				const editButton = screen.getByRole("button", {
					name: /editing is locked/i,
				});
				expect(editButton).toBeDisabled();
			});
			expect(screen.queryByRole("link", { name: /edit lease/i })).toBeNull();
		});

		test("renders an edit link for an unsigned (not-yet-signed) lease", async () => {
			// Keep the lease active but clear tenant_signed_at → terms unlocked, so
			// the Edit affordance is a working link to the edit route.
			const originalTenantSignedAt = mockLease.tenant_signed_at;
			mockLease.tenant_signed_at = null;
			try {
				render(<LeaseDetails id="lease-test-123" />);

				await waitFor(() => {
					const editLink = screen.getByRole("link", { name: /edit lease/i });
					expect(editLink).toHaveAttribute(
						"href",
						"/leases/lease-test-123/edit",
					);
				});
			} finally {
				mockLease.tenant_signed_at = originalTenantSignedAt;
			}
		});
	});

	describe("Accessibility", () => {
		test("tabs are keyboard navigable", async () => {
			const user = userEvent.setup();
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: /details/i }),
				).toBeInTheDocument();
			});

			// Tab to focus on tabs
			const detailsTab = screen.getByRole("tab", { name: /details/i });
			await user.click(detailsTab);

			// Arrow right should move to next tab
			await user.keyboard("{ArrowRight}");

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: /timeline/i })).toHaveFocus();
			});
		});

		test("links have accessible text", async () => {
			render(<LeaseDetails id="lease-test-123" />);

			await waitFor(() => {
				// All links should have discernible text
				const links = screen.getAllByRole("link");
				for (const link of links) {
					expect(link).toHaveAccessibleName();
				}
			});
		});
	});
});
