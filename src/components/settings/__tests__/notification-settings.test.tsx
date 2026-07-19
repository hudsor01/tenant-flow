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

// The OwnerNotificationSettings type still carries sms/push/inApp (the DB
// columns stay — orchestrator scope decision #3), so the fixture keeps setting
// them. No assertion below reads or writes them: the honest preference surface
// is email + the three categories only.
function makeSettings(
	overrides: Partial<OwnerNotificationSettings>,
): OwnerNotificationSettings {
	return {
		email: true,
		sms: true,
		push: true,
		inApp: true,
		...overrides,
		categories: {
			maintenance: true,
			leases: true,
			general: true,
			...overrides.categories,
		},
	};
}

describe("NotificationSettings — Enable All (FORMFIX-07)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("writes only email + categories in a single mutate when toggled ON", async () => {
		const user = userEvent.setup();
		// A category off => aggregate is OFF, so clicking toggles it ON.
		mockUseSettings.mockReturnValue({
			data: makeSettings({
				categories: { maintenance: false, leases: true, general: true },
			}),
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
			categories: { maintenance: true, leases: true, general: true },
		});
	});

	it("reads checked=false when a category is off", () => {
		mockUseSettings.mockReturnValue({
			data: makeSettings({
				categories: { maintenance: false, leases: true, general: true },
			}),
			isLoading: false,
		});

		render(<NotificationSettings />);

		expect(
			screen.getByRole("switch", { name: /enable all notifications/i }),
		).not.toBeChecked();
	});

	it("reads checked=true only when email and all categories are on", () => {
		mockUseSettings.mockReturnValue({
			data: makeSettings({}),
			isLoading: false,
		});

		render(<NotificationSettings />);

		expect(
			screen.getByRole("switch", { name: /enable all notifications/i }),
		).toBeChecked();
	});

	it("writes email + categories OFF when toggled off from the all-on state", async () => {
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

		expect(mockMutate).toHaveBeenCalledTimes(1);
		expect(mockMutate).toHaveBeenCalledWith({
			email: false,
			categories: { maintenance: false, leases: false, general: false },
		});
	});
});

describe("NotificationSettings — channel honesty (HONEST-01/02)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders only the honest Email channel + category toggles, never SMS/push/in-app", () => {
		mockUseSettings.mockReturnValue({
			data: makeSettings({}),
			isLoading: false,
		});

		render(<NotificationSettings />);

		// Honest surface present.
		expect(screen.getByText("Email Notifications")).toBeInTheDocument();
		expect(screen.getByText("Maintenance Requests")).toBeInTheDocument();
		expect(screen.getByText("Lease Updates")).toBeInTheDocument();
		expect(screen.getByText("General Notifications")).toBeInTheDocument();

		// Dishonest channels gone — no delivery infra (SMS/push) and in-app is
		// always-on (D-05). Regression pin: these must never reappear.
		expect(screen.queryByText(/SMS/i)).toBeNull();
		expect(screen.queryByText("Push Notifications")).toBeNull();
		expect(screen.queryByText(/Browser push/i)).toBeNull();
		expect(screen.queryByText("In-App Notifications")).toBeNull();
	});
});
