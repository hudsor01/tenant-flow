/**
 * FORMFIX-02: the contact form must actually transmit — invoke the
 * `send-contact-email` edge function — and show the "Thank You" screen ONLY on
 * a real success. Before the fix the submit handler only logged and showed the
 * thank-you unconditionally, so a failed (or never-attempted) send still told
 * the user their message went through. These tests pin the submit branching so
 * that regression cannot return.
 *
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		functions: { invoke: invokeMock },
	}),
}));

import { ContactForm } from "#components/contact/contact-form";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText(/full name/i), "Jane Landlord");
	await user.type(screen.getByLabelText(/email address/i), "jane@example.com");

	// Subject is a Radix Select — open it and pick a real option.
	await user.click(screen.getByRole("combobox", { name: /interested in/i }));
	await user.click(
		await screen.findByRole("option", { name: /scheduling a product demo/i }),
	);

	await user.type(
		screen.getByLabelText(/how can we help/i),
		"I would like a demo of the product, please.",
	);
}

describe("ContactForm submit (FORMFIX-02)", () => {
	// jsdom in this project does not expose a global `localStorage`, and the
	// form-progress hook's clearProgress() is not wrapped in try/catch — an
	// undefined localStorage would throw on the success path and mask the
	// thank-you. Provide a clean in-memory stub per test.
	let mockStorage: Record<string, string>;

	beforeEach(() => {
		invokeMock.mockReset();
		mockStorage = {};
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => mockStorage[key] ?? null,
			setItem: (key: string, value: string) => {
				mockStorage[key] = value;
			},
			removeItem: (key: string) => {
				delete mockStorage[key];
			},
			clear: () => {
				for (const key of Object.keys(mockStorage)) delete mockStorage[key];
			},
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("invokes send-contact-email and shows the thank-you on success", async () => {
		const user = userEvent.setup();
		invokeMock.mockResolvedValue({ data: { success: true }, error: null });

		render(<ContactForm />);
		await fillValidForm(user);
		await user.click(screen.getByRole("button", { name: /send message/i }));

		await waitFor(() => {
			expect(invokeMock).toHaveBeenCalledWith(
				"send-contact-email",
				expect.objectContaining({
					body: expect.objectContaining({
						name: "Jane Landlord",
						email: "jane@example.com",
						subject: "Product Demo",
						message: "I would like a demo of the product, please.",
					}),
				}),
			);
		});

		expect(
			await screen.findByRole("heading", { name: /thank you/i }),
		).toBeInTheDocument();
	});

	it("surfaces an error and does NOT show the thank-you when the invoke errors", async () => {
		const user = userEvent.setup();
		invokeMock.mockResolvedValue({
			data: null,
			error: { message: "Edge Function returned a non-2xx status code" },
		});

		render(<ContactForm />);
		await fillValidForm(user);
		await user.click(screen.getByRole("button", { name: /send message/i }));

		await waitFor(() => {
			expect(invokeMock).toHaveBeenCalled();
		});

		// Failure path: no thank-you, a visible error message instead.
		expect(
			screen.queryByRole("heading", { name: /thank you/i }),
		).not.toBeInTheDocument();
		expect(
			await screen.findByText(/couldn't send your message/i),
		).toBeInTheDocument();
	});

	it("treats a non-success payload as a failure (no thank-you)", async () => {
		const user = userEvent.setup();
		invokeMock.mockResolvedValue({ data: { success: false }, error: null });

		render(<ContactForm />);
		await fillValidForm(user);
		await user.click(screen.getByRole("button", { name: /send message/i }));

		await waitFor(() => {
			expect(invokeMock).toHaveBeenCalled();
		});

		expect(
			screen.queryByRole("heading", { name: /thank you/i }),
		).not.toBeInTheDocument();
		expect(
			await screen.findByText(/couldn't send your message/i),
		).toBeInTheDocument();
	});

	it("does not invoke the function when client-side validation fails", async () => {
		const user = userEvent.setup();

		render(<ContactForm />);
		await user.type(screen.getByLabelText(/full name/i), "Jane Landlord");
		await user.type(
			screen.getByLabelText(/email address/i),
			"jane@example.com",
		);
		await user.click(screen.getByRole("combobox", { name: /interested in/i }));
		await user.click(
			await screen.findByRole("option", {
				name: /scheduling a product demo/i,
			}),
		);
		// Message is non-empty (passes the native `required` check) but too short
		// for the JS length rule, so the invoke must be blocked before it fires.
		await user.type(screen.getByLabelText(/how can we help/i), "short");
		await user.click(screen.getByRole("button", { name: /send message/i }));

		await waitFor(() => {
			expect(
				screen.getByText(/message must be at least 10 characters/i),
			).toBeInTheDocument();
		});
		expect(invokeMock).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("heading", { name: /thank you/i }),
		).not.toBeInTheDocument();
	});

	it("blocks an over-length message client-side instead of the unsatisfiable 400 loop (FORM-17)", async () => {
		const user = userEvent.setup();

		render(<ContactForm />);
		await user.type(screen.getByLabelText(/full name/i), "Jane Landlord");
		await user.type(
			screen.getByLabelText(/email address/i),
			"jane@example.com",
		);
		await user.click(screen.getByRole("combobox", { name: /interested in/i }));
		await user.click(
			await screen.findByRole("option", {
				name: /scheduling a product demo/i,
			}),
		);
		// fireEvent bypasses the new maxLength attribute to exercise the JS guard;
		// 5001 chars exceeds CONTACT_FORM_MESSAGE_MAX_LENGTH (5000).
		fireEvent.change(screen.getByLabelText(/how can we help/i), {
			target: { value: "x".repeat(5001) },
		});
		await user.click(screen.getByRole("button", { name: /send message/i }));

		await waitFor(() => {
			expect(
				screen.getByText(/message cannot exceed 5000 characters/i),
			).toBeInTheDocument();
		});
		expect(invokeMock).not.toHaveBeenCalled();
	});
});
