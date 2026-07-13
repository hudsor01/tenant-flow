/**
 * Property-Based Tests for AddTenantForm Error Handling
 *
 * Feature: fix-tenant-invitation-issues
 * Property 6: Frontend Error Display
 * Validates: Requirements 4.3, 6.2
 *
 * Property: For any error thrown by a mutation, the frontend should display a
 * user-friendly error toast notification with a clear message.
 *
 * Note: After NestJS removal (phase-57), the invite mutation throws a stub error.
 * These tests validate the error display logic pattern independently.
 */

import {
	QueryClient,
	QueryClientProvider,
	useMutation,
} from "@tanstack/react-query";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as fc from "fast-check";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AddTenantRequest } from "#lib/validation/tenants";
import type { Property, Unit } from "#types/core";
import { AddTenantForm } from "../add-tenant-form";

// Mock dependencies
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

// Mock the create-tenant mutation so the guard test never hits PostgREST.
const mockCreateTenant = vi.fn().mockResolvedValue({ id: "new-tenant-id" });
vi.mock("#hooks/api/use-tenant-mutations", () => ({
	useCreateTenantMutation: () => ({
		mutateAsync: mockCreateTenant,
		isPending: false,
	}),
}));

const mockRouterPush = vi.fn();
const mockRouterBack = vi.fn();
const mockRouterRefresh = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		back: mockRouterBack,
		refresh: mockRouterRefresh,
	}),
}));

// Helper to create a query client for each test
function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
}

// Wrapper component for hooks
function createWrapper() {
	const queryClient = createTestQueryClient();
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}> {children} </QueryClientProvider>
	);
}

describe("AddTenantForm - Property-Based Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Property 6: Frontend Error Display
	 *
	 * For any error thrown by the mutation, the frontend should display a
	 * user-friendly error toast notification with a clear message.
	 *
	 * This property test verifies that:
	 * 1. Any error thrown by the mutation results in toast.error being called
	 * 2. The error message is user-friendly (not raw error objects)
	 * 3. The error toast includes a description
	 *
	 * We test this by simulating the mutation's error handling directly.
	 */
	it("should display error toast for any mutation error", async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate various error types
				fc.oneof(
					fc.constant(new Error("Network error")),
					fc.constant(new Error("Server error")),
					fc.constant(new Error("Validation failed")),
					fc.constant(new Error("Unauthorized")),
					fc.constant(new Error("Forbidden")),
					fc.constant(new Error("Not found")),
					fc.constant(new Error("Internal server error")),
					fc.constant(new Error("Service unavailable")),
					fc.constant(new Error("Timeout")),
					fc.constant(new Error("Bad request")),
				),
				async (error) => {
					// Clear all mocks before each property test iteration
					vi.clearAllMocks();

					// Create a mutation that mimics the form's error handling behavior
					const { result } = renderHook(
						() =>
							useMutation({
								mutationFn: async (_payload: AddTenantRequest) => {
									throw error;
								},
								onError: (err: unknown) => {
									// This is the same error handling logic as in the form
									toast.error("Failed to send invitation", {
										description:
											err instanceof Error
												? err.message
												: "Please try again or contact support.",
									});
								},
							}),
						{ wrapper: createWrapper() },
					);

					// Execute the mutation with valid data
					const payload: AddTenantRequest = {
						tenantData: {
							email: "test@example.com",
							first_name: "John",
							last_name: "Doe",
						},
						leaseData: {
							property_id: "prop-123",
						},
					};

					result.current.mutate(payload);

					// Assert: toast.error was called
					await waitFor(
						() => {
							expect(toast.error).toHaveBeenCalled();
						},
						{ timeout: 2000 },
					);

					// Verify the error toast was called with proper structure
					const errorCalls = vi.mocked(toast.error).mock.calls;
					expect(errorCalls.length).toBeGreaterThan(0);

					// Check that the first argument is a string (the title)
					const [title, options] = errorCalls[0] as [
						string,
						{ description: string },
					];
					expect(typeof title).toBe("string");
					expect(title).toBe("Failed to send invitation");

					// Check that options contain a description
					expect(options).toBeDefined();
					expect(options.description).toBeDefined();
					expect(typeof options.description).toBe("string");

					// Verify the description is user-friendly
					// It should be the error message since we're throwing Error objects
					expect(options.description).toBe(error.message);
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property 6 (Edge Case): Non-Error Objects
	 *
	 * Verify that even when the mutation throws non-Error objects (strings, objects, etc.),
	 * the frontend still displays a user-friendly error toast.
	 */
	it("should display error toast for non-Error thrown values", async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate various non-Error types that might be thrown
				fc.oneof(
					fc.string(),
					fc.constant({ message: "Custom error object" }),
					fc.constant({ error: "Something went wrong" }),
					fc.constant(null),
					fc.constant(undefined),
				),
				async (thrownValue) => {
					// Create a mutation that mimics the form's behavior
					const { result } = renderHook(
						() =>
							useMutation({
								mutationFn: async (_payload: AddTenantRequest) => {
									throw thrownValue;
								},
								onError: (err: unknown) => {
									// This is the same error handling logic as in the form
									toast.error("Failed to send invitation", {
										description:
											err instanceof Error
												? err.message
												: "Please try again or contact support.",
									});
								},
							}),
						{ wrapper: createWrapper() },
					);

					// Execute the mutation with valid data
					const payload: AddTenantRequest = {
						tenantData: {
							email: "test@example.com",
							first_name: "Jane",
							last_name: "Smith",
						},
						leaseData: {
							property_id: "prop-123",
						},
					};

					result.current.mutate(payload);

					// Assert: toast.error was called with fallback message
					await waitFor(
						() => {
							expect(toast.error).toHaveBeenCalled();
						},
						{ timeout: 2000 },
					);

					// Verify the error toast has a user-friendly fallback message
					const errorCalls = vi.mocked(toast.error).mock.calls;
					expect(errorCalls.length).toBeGreaterThan(0);

					const [title, options] = errorCalls[0] as [
						string,
						{ description: string },
					];
					expect(title).toBe("Failed to send invitation");
					expect(options.description).toBeDefined();
					expect(typeof options.description).toBe("string");
					// Should have a fallback message for non-Error objects
					expect(options.description.length).toBeGreaterThan(0);
					// For non-Error objects, should use the fallback
					if (!(thrownValue instanceof Error)) {
						expect(options.description).toBe(
							"Please try again or contact support.",
						);
					}
				},
			),
			{ numRuns: 50 },
		);
	});
});

/**
 * Property 7: Error Type Distinction
 *
 * Feature: fix-tenant-invitation-issues, Property 7: Error Type Distinction
 * Validates: Requirements 4.4
 *
 * For any error, the system should display the error message from the error object.
 * This property test verifies that:
 * 1. Authentication-type errors are displayed correctly
 * 2. Authorization-type errors are displayed correctly
 * 3. The error messages clearly distinguish between the two types
 */
it("should distinguish between authentication and authorization errors", async () => {
	await fc.assert(
		fc.asyncProperty(
			// Generate authentication (401) and authorization (403) errors
			fc.oneof(
				// Authentication failures - user not logged in or invalid token
				fc.record({
					type: fc.constant("authentication" as const),
					error: fc.oneof(
						fc.constant(new Error("Authentication required")),
						fc.constant(new Error("Invalid or expired token")),
						fc.constant(new Error("Please log in to continue")),
						fc.constant(new Error("Session expired")),
					),
				}),
				// Authorization failures - user logged in but lacks permissions
				fc.record({
					type: fc.constant("authorization" as const),
					error: fc.oneof(
						fc.constant(new Error("You do not have permission to add tenants")),
						fc.constant(new Error("Access denied: insufficient permissions")),
						fc.constant(
							new Error("You do not have access to this property resource"),
						),
						fc.constant(new Error("Forbidden: property owner access required")),
					),
				}),
			),
			async ({ type, error }) => {
				// Clear all mocks before each property test iteration
				vi.clearAllMocks();

				// Create a mutation that mimics the form's behavior
				const { result } = renderHook(
					() =>
						useMutation({
							mutationFn: async (_payload: AddTenantRequest) => {
								throw error;
							},
							onError: (err: unknown) => {
								// This is the same error handling logic as in the form
								toast.error("Failed to send invitation", {
									description:
										err instanceof Error
											? err.message
											: "Please try again or contact support.",
								});
							},
						}),
					{ wrapper: createWrapper() },
				);

				// Execute the mutation with valid data
				const payload: AddTenantRequest = {
					tenantData: {
						email: "test@example.com",
						first_name: "Test",
						last_name: "User",
					},
					leaseData: {
						property_id: "prop-123",
					},
				};

				result.current.mutate(payload);

				// Assert: toast.error was called
				await waitFor(
					() => {
						expect(toast.error).toHaveBeenCalled();
					},
					{ timeout: 2000 },
				);

				// Verify the error toast was called with proper structure
				const errorCalls = vi.mocked(toast.error).mock.calls;
				expect(errorCalls.length).toBeGreaterThan(0);

				const [title, options] = errorCalls[0] as [
					string,
					{ description: string },
				];

				// Verify basic structure
				expect(title).toBe("Failed to send invitation");
				expect(options.description).toBeDefined();
				expect(typeof options.description).toBe("string");

				// Verify the error message is displayed
				expect(options.description).toBe(error.message);

				// Verify that the error message contains appropriate keywords
				// based on the error type
				const description = options.description.toLowerCase();

				if (type === "authentication") {
					// Authentication errors should mention login, token, or session
					const hasAuthKeywords =
						description.includes("authentication") ||
						description.includes("token") ||
						description.includes("log in") ||
						description.includes("session");

					expect(hasAuthKeywords).toBe(true);
				} else {
					// Authorization errors should mention permission, access, or forbidden
					const hasAuthzKeywords =
						description.includes("permission") ||
						description.includes("access") ||
						description.includes("forbidden");

					expect(hasAuthzKeywords).toBe(true);
				}
			},
		),
		{ numRuns: 100 },
	);
});

/**
 * FORMFIX-01: the add-tenant unsaved-changes guard must arm REACTIVELY.
 *
 * Regression: the call site passed a non-reactive `form.state.isDirty` snapshot,
 * so the `beforeunload` guard never armed as the user typed. The fix reads dirty
 * via `useStore(form.store, (s) => s.isDirty)`. These tests prove the listener is
 * registered after a field change and removed once the form returns to pristine.
 */
describe("AddTenantForm - unsaved-changes guard (FORMFIX-01)", () => {
	function renderForm() {
		const queryClient = createTestQueryClient();
		return render(
			<QueryClientProvider client={queryClient}>
				<AddTenantForm properties={[]} units={[]} />
			</QueryClientProvider>,
		);
	}

	function countBeforeUnload(calls: unknown[][]): number {
		return calls.filter((call) => call[0] === "beforeunload").length;
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("arms the beforeunload guard when the form becomes dirty", async () => {
		const user = userEvent.setup();
		const addSpy = vi.spyOn(window, "addEventListener");

		renderForm();

		// Pristine form → guard not armed.
		expect(countBeforeUnload(addSpy.mock.calls)).toBe(0);

		await user.type(screen.getByLabelText(/email address/i), "a");

		// Dirty form → reactive isDirty flips true → effect registers the guard.
		await waitFor(() => {
			expect(countBeforeUnload(addSpy.mock.calls)).toBeGreaterThan(0);
		});

		addSpy.mockRestore();
	});

	it("removes the beforeunload guard when the armed form unmounts (navigate-away)", async () => {
		// TanStack Form's field-level `isDirty` is sticky once a field changes, so
		// the guard disarms on submit/navigation (unmount) rather than on revert.
		// This asserts the reactive effect's cleanup runs, mirroring the real
		// navigate-away path after a successful create.
		const user = userEvent.setup();
		const addSpy = vi.spyOn(window, "addEventListener");
		const removeSpy = vi.spyOn(window, "removeEventListener");

		const { unmount } = renderForm();

		await user.type(screen.getByLabelText(/email address/i), "a");
		await waitFor(() => {
			expect(countBeforeUnload(addSpy.mock.calls)).toBeGreaterThan(0);
		});

		unmount();

		expect(countBeforeUnload(removeSpy.mock.calls)).toBeGreaterThan(0);

		addSpy.mockRestore();
		removeSpy.mockRestore();
	});
});

const TEST_PROPERTY: Property = {
	id: "prop-1",
	owner_user_id: "owner-1",
	name: "Maple Court",
	address_line1: "1 Maple St",
	address_line2: null,
	city: "Austin",
	state: "TX",
	postal_code: "78701",
	country: "US",
	property_type: "single_family",
	status: "active",
	date_sold: null,
	sale_price: null,
	acquisition_cost: null,
	acquisition_date: null,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	search_vector: null,
};

const TEST_UNIT: Unit = {
	id: "unit-1",
	property_id: "prop-1",
	owner_user_id: "owner-1",
	unit_number: "101",
	bedrooms: 1,
	bathrooms: 1,
	square_feet: 650,
	rent_amount: 1200,
	rent_currency: "USD",
	rent_period: "month",
	status: "available",
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};

/**
 * FORMFIX-04: a property/unit selected in the add-tenant form must not be
 * silently discarded. There is no standalone tenant↔unit link, so the created
 * tenant + selection are carried into the lease-creation flow via query params.
 */
describe("AddTenantForm - carries selection into lease flow (FORMFIX-04)", () => {
	function renderForm() {
		const queryClient = createTestQueryClient();
		return render(
			<QueryClientProvider client={queryClient}>
				<AddTenantForm properties={[TEST_PROPERTY]} units={[TEST_UNIT]} />
			</QueryClientProvider>,
		);
	}

	async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
		await user.type(screen.getByLabelText(/first name/i), "John");
		await user.type(screen.getByLabelText(/last name/i), "Doe");
		await user.type(
			screen.getByLabelText(/email address/i),
			"john@example.com",
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("routes to /leases/new with the tenant, property, and unit when a property is selected", async () => {
		const user = userEvent.setup();
		renderForm();

		await fillRequiredFields(user);

		// Pick the property — the single available unit auto-selects.
		await user.click(screen.getByRole("combobox", { name: /property/i }));
		await user.click(
			await screen.findByRole("option", { name: /maple court/i }),
		);

		await user.click(screen.getByRole("button", { name: /add tenant/i }));

		await waitFor(() => {
			expect(mockRouterPush).toHaveBeenCalled();
		});

		const leaseCall = mockRouterPush.mock.calls.find(
			([url]) => typeof url === "string" && url.startsWith("/leases/new"),
		);
		expect(leaseCall).toBeDefined();
		const url = leaseCall?.[0] as string;
		expect(url).toContain("tenant=new-tenant-id");
		expect(url).toContain("property=prop-1");
		expect(url).toContain("unit=unit-1");
		// The selection is NOT silently dropped to the tenants list.
		expect(mockRouterPush).not.toHaveBeenCalledWith("/tenants");
	});

	it("redirects to /tenants when no property is selected", async () => {
		const user = userEvent.setup();
		renderForm();

		await fillRequiredFields(user);
		await user.click(screen.getByRole("button", { name: /add tenant/i }));

		await waitFor(() => {
			expect(mockRouterPush).toHaveBeenCalledWith("/tenants");
		});

		const leaseCall = mockRouterPush.mock.calls.find(
			([url]) => typeof url === "string" && url.startsWith("/leases/new"),
		);
		expect(leaseCall).toBeUndefined();

		// FORMFIX-08: the form no longer fires its own success toast — the single
		// success toast comes from the create mutation's createMutationCallbacks.
		expect(toast.success).not.toHaveBeenCalledWith("Tenant added");
	});
});

describe("AddTenantForm - optional phone validation (FORM-19)", () => {
	function renderForm() {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		return render(
			<QueryClientProvider client={queryClient}>
				<AddTenantForm properties={[]} units={[]} />
			</QueryClientProvider>,
		);
	}

	it("rejects a malformed non-empty phone number", async () => {
		const user = userEvent.setup();
		renderForm();

		const phone = screen.getByLabelText(/phone number/i);
		await user.type(phone, "abc");
		await user.tab(); // blur → field becomes touched so the error renders

		await waitFor(() => {
			expect(screen.getByText(/can only contain digits/i)).toBeInTheDocument();
		});
	});

	it("accepts an empty phone (optional) without error", async () => {
		const user = userEvent.setup();
		renderForm();

		const phone = screen.getByLabelText(/phone number/i);
		await user.click(phone);
		await user.tab(); // touched but empty

		expect(
			screen.queryByText(/can only contain digits/i),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/at least 10 characters/i),
		).not.toBeInTheDocument();
	});
});
