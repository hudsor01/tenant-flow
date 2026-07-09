import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OwnerNotificationSettings } from "#hooks/api/query-keys/owner-notification-settings-keys";
import { NotificationSettings } from "../notification-settings";

const mockUseSettings = vi.fn();
const mockMutate = vi.fn();

vi.mock("#hooks/api/use-owner-notification-settings", () => ({
	useOwnerNotificationSettings: () => mockUseSettings(),
	useUpdateOwnerNotificationSettingsMutation: () => ({
		mutate: mockMutate,
		isPending: false,
	}),
}));

function makeSettings(
	overrides: Partial<Omit<OwnerNotificationSettings, "categories">>,
): OwnerNotificationSettings {
	return {
		email: true,
		sms: true,
		push: true,
		inApp: true,
		categories: { maintenance: true, leases: true, general: true },
		...overrides,
	};
}

describe("NotificationSettings — Enable All (FORMFIX-07)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("writes all four channels in a single mutate when toggled ON", async () => {
		const user = userEvent.setup();
		// sms off => aggregate is OFF, so clicking toggles it ON.
		mockUseSettings.mockReturnValue({
			data: makeSettings({ sms: false }),
			isLoading: false,
		});

		render(<NotificationSettings />);

		const enableAll = screen.getByRole("switch", {
			name: /enable all notifications/i,
		});
		expect(enableAll).not.toBeChecked();

		await user.click(enableAll);

		expect(mockMutate).toHaveBeenCalledTimes(1);
		expect(mockMutate).toHaveBeenCalledWith({
			email: true,
			sms: true,
			push: true,
			inApp: true,
		});
	});

	it("reads checked=false when any channel is off", () => {
		mockUseSettings.mockReturnValue({
			data: makeSettings({ push: false }),
			isLoading: false,
		});

		render(<NotificationSettings />);

		expect(
			screen.getByRole("switch", { name: /enable all notifications/i }),
		).not.toBeChecked();
	});

	it("reads checked=true only when all channels are on", () => {
		mockUseSettings.mockReturnValue({
			data: makeSettings({}),
			isLoading: false,
		});

		render(<NotificationSettings />);

		expect(
			screen.getByRole("switch", { name: /enable all notifications/i }),
		).toBeChecked();
	});

	it("writes all four channels OFF when toggled off from the all-on state", async () => {
		const user = userEvent.setup();
		mockUseSettings.mockReturnValue({
			data: makeSettings({}),
			isLoading: false,
		});

		render(<NotificationSettings />);

		const enableAll = screen.getByRole("switch", {
			name: /enable all notifications/i,
		});
		expect(enableAll).toBeChecked();

		await user.click(enableAll);

		expect(mockMutate).toHaveBeenCalledWith({
			email: false,
			sms: false,
			push: false,
			inApp: false,
		});
	});
});
