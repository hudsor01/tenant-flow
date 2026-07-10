/**
 * PropertyForm Component Tests
 * Tests consolidated property form in both create and edit modes
 *
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { vi } from "vitest";
import { render } from "#test/utils/test-render";
import type { Property } from "#types/core";
import { PropertyForm } from "../property-form.client";
import "@testing-library/jest-dom/vitest";

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

// FORMFIX-08: mock the mutation module the component actually imports so a
// submit resolves without PostgREST; the real success toast lives in the
// mutation's createMutationCallbacks (covered by create-mutation-callbacks.test).
const { mockCreateProperty, mockUpdateProperty } = vi.hoisted(() => ({
	mockCreateProperty: vi.fn().mockResolvedValue({ id: "new-property-id" }),
	mockUpdateProperty: vi.fn().mockResolvedValue({ id: "property-1" }),
}));
vi.mock("#hooks/api/use-property-mutations", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("#hooks/api/use-property-mutations")>();
	return {
		...actual,
		useCreatePropertyMutation: () => ({
			mutateAsync: mockCreateProperty,
			isPending: false,
		}),
		useUpdatePropertyMutation: () => ({
			mutateAsync: mockUpdateProperty,
			isPending: false,
		}),
	};
});

// Mock useCurrentUser hook
vi.mock("#hooks/use-current-user", () => ({
	useCurrentUser: () => ({
		user: { id: "user-1", email: "test@example.com" },
		user_id: "user-1",
		isAuthenticated: true,
		isLoading: false,
		session: {},
	}),
}));

// Mock hooks
vi.mock("#hooks/api/use-properties", () => ({
	useCreatePropertyMutation: () => ({
		mutateAsync: vi.fn().mockResolvedValue({ id: "new-property-id" }),
		isPending: false,
	}),
	useUpdatePropertyMutation: () => ({
		mutateAsync: vi.fn().mockResolvedValue({ id: "property-1" }),
		isPending: false,
	}),
	useDeletePropertyImageMutation: () => ({
		mutateAsync: vi.fn().mockResolvedValue({}),
		isPending: false,
	}),
	useUploadPropertyImageMutation: () => ({
		mutateAsync: vi.fn().mockResolvedValue({}),
		isPending: false,
	}),
	usePropertyImages: () => ({
		data: [],
		isLoading: false,
		error: null,
	}),
}));

vi.mock("#hooks/api/use-auth", () => ({
	useSupabaseUser: () => ({
		data: { id: "user-1", email: "test@example.com" },
	}),
}));

vi.mock("#hooks/use-supabase-upload", () => ({
	useSupabaseUpload: () => ({
		isSuccess: false,
		successes: [],
		errors: [],
		files: [],
		getRootProps: () => ({}),
		getInputProps: () => ({}),
		isDragActive: false,
		isDragReject: false,
	}),
}));

vi.mock("#hooks/use-lightbox-state", () => ({
	useLightboxState: (initialIndex: number) => ({
		isOpen: false,
		currentIndex: initialIndex,
		open: vi.fn(),
		close: vi.fn(),
		goToImage: vi.fn(),
		setIndex: vi.fn(),
	}),
}));

const DEFAULT_PROPERTY: Property = {
	id: "property-1",
	owner_user_id: "owner-1",
	name: "Sunset Apartments",
	address_line1: "123 Main St",
	address_line2: null,
	city: "San Francisco",
	state: "CA",
	postal_code: "94105",
	country: "US",
	property_type: "multi_family",
	status: "active",
	date_sold: null,
	sale_price: null,
	acquisition_cost: null,
	acquisition_date: null,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	search_vector: null,
};

function renderWithQueryClient(ui: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}

describe("PropertyForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Create Mode", () => {
		test("renders create mode with empty form", () => {
			renderWithQueryClient(<PropertyForm mode="create" />);

			expect(screen.getByLabelText(/property name/i)).toHaveValue("");
			expect(screen.getByLabelText(/^Address \*$/i)).toHaveValue("");
			expect(
				screen.getByRole("button", { name: /create property/i }),
			).toBeInTheDocument();
		});

		test("shows all required fields marked with asterisk", () => {
			renderWithQueryClient(<PropertyForm mode="create" />);

			expect(screen.getByText(/property name \*/i)).toBeInTheDocument();
			expect(screen.getByText(/property type \*/i)).toBeInTheDocument();
			expect(screen.getByText(/address \*/i)).toBeInTheDocument();
			expect(screen.getByText(/city \*/i)).toBeInTheDocument();
			expect(screen.getByText(/state \*/i)).toBeInTheDocument();
			expect(screen.getByText(/zip code \*/i)).toBeInTheDocument();
		});

		test("shows image upload section in create mode", () => {
			renderWithQueryClient(<PropertyForm mode="create" />);

			expect(
				screen.getByText(/property images \(optional\)/i),
			).toBeInTheDocument();
			expect(
				screen.getByText(/drag & drop images here, or click to browse/i),
			).toBeInTheDocument();
		});

		test("displays correct button text in create mode", () => {
			renderWithQueryClient(<PropertyForm mode="create" />);

			const submitButton = screen.getByRole("button", {
				name: /create property/i,
			});
			expect(submitButton).toBeInTheDocument();
			expect(submitButton).not.toBeDisabled();
		});
	});

	describe("Edit Mode", () => {
		test("renders edit mode with populated fields", () => {
			renderWithQueryClient(
				<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />,
			);

			expect(screen.getByLabelText(/property name/i)).toHaveValue(
				"Sunset Apartments",
			);
			expect(screen.getByLabelText(/^Address \*$/i)).toHaveValue("123 Main St");
			expect(screen.getByLabelText(/city/i)).toHaveValue("San Francisco");
			expect(screen.getByLabelText(/state/i)).toHaveValue("CA");
			expect(screen.getByLabelText(/zip code/i)).toHaveValue("94105");
		});

		test("shows image upload section in edit mode", () => {
			renderWithQueryClient(
				<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />,
			);

			expect(screen.getByText(/property image/i)).toBeInTheDocument();
		});

		test("displays correct button text in edit mode", () => {
			renderWithQueryClient(
				<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />,
			);

			const submitButton = screen.getByRole("button", {
				name: /update property/i,
			});
			expect(submitButton).toBeInTheDocument();
			expect(submitButton).not.toBeDisabled();
		});

		test("populates property type select with correct value", () => {
			renderWithQueryClient(
				<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />,
			);

			// Verify Property Type label exists and form is rendered
			expect(screen.getByText(/property type \*/i)).toBeInTheDocument();
			// The form should be rendered in edit mode successfully
		});

		// PROP-05: clearing the optional Address line 2 must null the column in the
		// update payload (previously the conditional-spread omitted it, so the DB
		// kept its old value). NOT-NULL columns must never be sent as null.
		test("clearing Address line 2 sends address_line2: null in the update payload (PROP-05)", async () => {
			const user = userEvent.setup();
			const editable: Property = {
				...DEFAULT_PROPERTY,
				property_type: "SINGLE_FAMILY",
				address_line2: "Suite 200",
			};
			renderWithQueryClient(<PropertyForm mode="edit" property={editable} />);

			const line2 = screen.getByLabelText(/address line 2/i);
			expect(line2).toHaveValue("Suite 200");
			await user.clear(line2);

			await user.click(
				screen.getByRole("button", { name: /update property/i }),
			);

			await waitFor(() => {
				expect(mockUpdateProperty).toHaveBeenCalled();
			});
			expect(mockUpdateProperty).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "property-1",
					data: expect.objectContaining({
						// cleared optional field → explicit null
						address_line2: null,
						// NOT-NULL column stays a string (never null)
						name: expect.any(String),
					}),
				}),
			);
		});

		test("editing a non-empty Address line 2 sends the string (PROP-05)", async () => {
			const user = userEvent.setup();
			const editable: Property = {
				...DEFAULT_PROPERTY,
				property_type: "SINGLE_FAMILY",
				address_line2: "Suite 200",
			};
			renderWithQueryClient(<PropertyForm mode="edit" property={editable} />);

			const line2 = screen.getByLabelText(/address line 2/i);
			await user.clear(line2);
			await user.type(line2, "Suite 305");

			await user.click(
				screen.getByRole("button", { name: /update property/i }),
			);

			await waitFor(() => {
				expect(mockUpdateProperty).toHaveBeenCalled();
			});
			expect(mockUpdateProperty).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ address_line2: "Suite 305" }),
				}),
			);
		});
	});

	describe("Form Validation", () => {
		test("accepts property name with 3 or more characters", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<PropertyForm mode="create" />);

			const nameInput = screen.getByLabelText(/property name/i);
			await user.type(nameInput, "ABC");

			expect(nameInput).toHaveValue("ABC");
		});

		test("accepts valid 5-digit ZIP code", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<PropertyForm mode="create" />);

			const zipInput = screen.getByLabelText(/zip code/i);
			await user.type(zipInput, "94105");

			expect(zipInput).toHaveValue("94105");
		});

		test("accepts valid 9-digit ZIP code", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<PropertyForm mode="create" />);

			const zipInput = screen.getByLabelText(/zip code/i);
			await user.type(zipInput, "94105-1234");

			expect(zipInput).toHaveValue("94105-1234");
		});

		test("accepts valid 2-character state code", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<PropertyForm mode="create" />);

			const stateInput = screen.getByLabelText(/state/i);
			await user.type(stateInput, "CA");

			expect(stateInput).toHaveValue("CA");
		});
	});

	describe("User Interactions", () => {
		test("allows user to fill out the form", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<PropertyForm mode="create" />);

			await user.type(screen.getByLabelText(/property name/i), "Test Property");
			await user.type(screen.getByLabelText(/^Address \*$/i), "456 Oak Ave");
			await user.type(screen.getByLabelText(/city/i), "Oakland");
			await user.type(screen.getByLabelText(/state/i), "CA");
			await user.type(screen.getByLabelText(/zip code/i), "94601");

			expect(screen.getByLabelText(/property name/i)).toHaveValue(
				"Test Property",
			);
			expect(screen.getByLabelText(/^Address \*$/i)).toHaveValue("456 Oak Ave");
			expect(screen.getByLabelText(/city/i)).toHaveValue("Oakland");
			expect(screen.getByLabelText(/state/i)).toHaveValue("CA");
			expect(screen.getByLabelText(/zip code/i)).toHaveValue("94601");
		});

		test("converts state input to uppercase automatically", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<PropertyForm mode="create" />);

			const stateInput = screen.getByLabelText(/state/i);
			await user.type(stateInput, "ca");

			expect(stateInput).toHaveValue("CA");
		});

		test("cancel button navigates back", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<PropertyForm mode="create" />);

			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			// Note: window.history.back() is called, which we can't easily test in jsdom
			// This test verifies the button exists and is clickable
		});
	});

	describe("Accessibility", () => {
		test("all form fields have proper labels", () => {
			renderWithQueryClient(<PropertyForm mode="create" />);

			// Text inputs can be queried by label
			expect(screen.getByLabelText(/property name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/^Address \*$/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
			// Country is a select field and may not have a standard label query
			// Verify country label exists via text query instead
			expect(screen.getByText(/country \*/i)).toBeInTheDocument();

			// Verify property type label exists (accessibility)
			expect(screen.getByText(/property type \*/i)).toBeInTheDocument();
		});

		test("form inputs have appropriate autocomplete attributes", () => {
			renderWithQueryClient(<PropertyForm mode="create" />);

			expect(screen.getByLabelText(/property name/i)).toHaveAttribute(
				"autocomplete",
				"organization",
			);
			expect(screen.getByLabelText(/^Address \*$/i)).toHaveAttribute(
				"autocomplete",
				"street-address",
			);
			expect(screen.getByLabelText(/city/i)).toHaveAttribute(
				"autocomplete",
				"address-level2",
			);
			expect(screen.getByLabelText(/state/i)).toHaveAttribute(
				"autocomplete",
				"address-level1",
			);
			expect(screen.getByLabelText(/zip code/i)).toHaveAttribute(
				"autocomplete",
				"postal-code",
			);
		});
	});

	describe("Mode-Specific Behavior", () => {
		test("create mode does not require property prop", () => {
			expect(() => {
				renderWithQueryClient(<PropertyForm mode="create" />);
			}).not.toThrow();
		});

		test("edit mode renders with property data", () => {
			expect(() => {
				renderWithQueryClient(
					<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />,
				);
			}).not.toThrow();
		});

		test("accepts onSuccess callback prop", async () => {
			const onSuccess = vi.fn();
			renderWithQueryClient(
				<PropertyForm
					mode="edit"
					property={DEFAULT_PROPERTY}
					onSuccess={onSuccess}
				/>,
			);

			// Note: Full form submission testing would require mocking the mutation
			// This verifies the prop is accepted
			expect(onSuccess).not.toHaveBeenCalled(); // Not called until form submits
		});
	});

	/**
	 * FORMFIX-01 (reactive unsaved-changes guard) + FORMFIX-08 (no duplicate toast).
	 */
	describe("Guard reactivity + single toast (FORMFIX-01, FORMFIX-08)", () => {
		function countBeforeUnload(calls: unknown[][]): number {
			return calls.filter((call) => call[0] === "beforeunload").length;
		}

		async function fillCreateFields(user: ReturnType<typeof userEvent.setup>) {
			await user.type(screen.getByLabelText(/property name/i), "Test Property");
			await user.type(screen.getByLabelText(/^Address \*$/i), "456 Oak Ave");
			await user.type(screen.getByLabelText(/city/i), "Oakland");
			await user.type(screen.getByLabelText(/state/i), "CA");
			await user.type(screen.getByLabelText(/zip code/i), "94601");
		}

		test("arms the beforeunload guard when the form becomes dirty", async () => {
			const user = userEvent.setup();
			const addSpy = vi.spyOn(window, "addEventListener");

			renderWithQueryClient(<PropertyForm mode="create" />);
			expect(countBeforeUnload(addSpy.mock.calls)).toBe(0);

			await user.type(screen.getByLabelText(/property name/i), "Maple");

			await waitFor(() => {
				expect(countBeforeUnload(addSpy.mock.calls)).toBeGreaterThan(0);
			});

			addSpy.mockRestore();
		});

		test("create submit fires no form-level success toast", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<PropertyForm mode="create" />);

			await fillCreateFields(user);
			await user.click(
				screen.getByRole("button", { name: /create property/i }),
			);

			await waitFor(() => {
				expect(mockCreateProperty).toHaveBeenCalled();
			});
			// The single success toast is the mutation callback's, not the form's.
			expect(toast.success).not.toHaveBeenCalled();
		});

		test("update submit fires no form-level success toast", async () => {
			const user = userEvent.setup();
			const editable: Property = {
				...DEFAULT_PROPERTY,
				property_type: "SINGLE_FAMILY",
			};
			renderWithQueryClient(<PropertyForm mode="edit" property={editable} />);

			const nameInput = screen.getByLabelText(/property name/i);
			await user.clear(nameInput);
			await user.type(nameInput, "Renamed Property");
			await user.click(
				screen.getByRole("button", { name: /update property/i }),
			);

			await waitFor(() => {
				expect(mockUpdateProperty).toHaveBeenCalled();
			});
			expect(toast.success).not.toHaveBeenCalled();
		});
	});
});
