import { describe, expect, it, vi } from "vitest";
import { completeSubscribeSignup } from "../subscribe-complete";

describe("completeSubscribeSignup", () => {
	it("skips checkout and closes the dialog when email confirmation is required", async () => {
		const startCheckout = vi.fn().mockResolvedValue(undefined);
		const closeDialog = vi.fn();

		await completeSubscribeSignup(
			{
				email: "owner@example.com",
				tenant_id: "user-123",
				requiresEmailConfirmation: true,
			},
			{ startCheckout, closeDialog },
		);

		expect(startCheckout).not.toHaveBeenCalled();
		expect(closeDialog).toHaveBeenCalledTimes(1);
	});

	it("starts checkout with the customer email and closes the dialog when no confirmation is required", async () => {
		const startCheckout = vi.fn().mockResolvedValue(undefined);
		const closeDialog = vi.fn();

		await completeSubscribeSignup(
			{
				email: "owner@example.com",
				tenant_id: "user-123",
				requiresEmailConfirmation: false,
			},
			{ startCheckout, closeDialog },
		);

		expect(startCheckout).toHaveBeenCalledTimes(1);
		expect(startCheckout).toHaveBeenCalledWith({
			customerEmail: "owner@example.com",
			tenant_id: "user-123",
		});
		expect(closeDialog).toHaveBeenCalledTimes(1);
	});

	it("omits tenant_id when it is not present and treats an absent flag as no confirmation", async () => {
		const startCheckout = vi.fn().mockResolvedValue(undefined);
		const closeDialog = vi.fn();

		await completeSubscribeSignup(
			{ email: "owner@example.com" },
			{ startCheckout, closeDialog },
		);

		expect(startCheckout).toHaveBeenCalledTimes(1);
		expect(startCheckout).toHaveBeenCalledWith({
			customerEmail: "owner@example.com",
		});
		expect(closeDialog).toHaveBeenCalledTimes(1);
	});

	it("propagates a startCheckout rejection without closing the dialog", async () => {
		const startCheckout = vi
			.fn()
			.mockRejectedValue(new Error("Failed to start checkout"));
		const closeDialog = vi.fn();

		await expect(
			completeSubscribeSignup(
				{ email: "owner@example.com" },
				{ startCheckout, closeDialog },
			),
		).rejects.toMatchObject({
			message: expect.stringContaining("Failed to start checkout"),
		});

		expect(closeDialog).not.toHaveBeenCalled();
	});
});
