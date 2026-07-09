import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GeneralSettings } from "../general-settings";

// vi.hoisted so these mocks can be referenced inside the hoisted vi.mock
// factories below (CLAUDE.md testing rule).
const h = vi.hoisted(() => ({
	usersUpdate: vi.fn(),
	authUpdateUser: vi.fn(),
	prefsUpsert: vi.fn(),
	prefsRow: {
		current: null as {
			timezone: string | null;
			language: string | null;
		} | null,
	},
	profile: {
		current: null as { email: string; phone: string | null } | null,
	},
	toastInfo: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			updateUser: (payload: unknown) => {
				h.authUpdateUser(payload);
				return Promise.resolve({ data: {}, error: null });
			},
		},
		from: (table: string) => {
			if (table === "users") {
				return {
					update: (payload: unknown) => ({
						eq: () => {
							h.usersUpdate(payload);
							return Promise.resolve({ error: null });
						},
					}),
				};
			}
			if (table === "user_preferences") {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: () =>
								Promise.resolve({ data: h.prefsRow.current, error: null }),
						}),
					}),
					upsert: (payload: unknown) => {
						h.prefsUpsert(payload);
						return Promise.resolve({ error: null });
					},
				};
			}
			throw new Error(`unexpected table ${table}`);
		},
	}),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: () => Promise.resolve({ id: "user-1" }),
}));

vi.mock("#hooks/api/use-profile", () => ({
	useProfile: () => ({ data: h.profile.current, isLoading: false }),
	profileKeys: { all: ["profile"] },
}));

vi.mock("#providers/preferences-provider", () => ({
	usePreferencesStore: (selector: (state: unknown) => unknown) =>
		selector({ themeMode: "system", setThemeMode: vi.fn() }),
	useDataDensity: () => ({
		dataDensity: "comfortable",
		setDataDensity: vi.fn(),
	}),
}));

vi.mock("../owner-emergency-contact-section", () => ({
	OwnerEmergencyContactSection: () => null,
}));

vi.mock("sonner", () => ({
	toast: {
		info: (...args: unknown[]) => h.toastInfo(...args),
		success: (...args: unknown[]) => h.toastSuccess(...args),
		error: (...args: unknown[]) => h.toastError(...args),
		warning: vi.fn(),
	},
}));

function renderWithClient(ui: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}

describe("GeneralSettings (FORMFIX-06)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		h.profile.current = { email: "owner@example.com", phone: "555-1000" };
		h.prefsRow.current = { timezone: "America/New_York", language: "es" };
	});

	it("loads saved timezone/language from user_preferences on mount", async () => {
		renderWithClient(<GeneralSettings />);

		const timezone = (await screen.findByLabelText(
			"Timezone",
		)) as HTMLSelectElement;
		const language = screen.getByLabelText("Language") as HTMLSelectElement;

		// Reflects the persisted values, NOT the hardcoded America/Chicago / en-US.
		await waitFor(() => expect(timezone.value).toBe("America/New_York"));
		expect(language.value).toBe("es");
	});

	it("persists all fields: phone → users, email → Auth, timezone/language → user_preferences", async () => {
		const user = userEvent.setup();
		renderWithClient(<GeneralSettings />);

		const emailInput = (await screen.findByLabelText(
			"Contact Email",
		)) as HTMLInputElement;
		const phoneInput = screen.getByLabelText(
			"Phone Number",
		) as HTMLInputElement;
		const timezone = screen.getByLabelText("Timezone") as HTMLSelectElement;
		const language = screen.getByLabelText("Language") as HTMLSelectElement;

		await user.clear(emailInput);
		await user.type(emailInput, "new@example.com");
		await user.clear(phoneInput);
		await user.type(phoneInput, "555-2000");
		await user.selectOptions(timezone, "America/Denver");
		await user.selectOptions(language, "fr");

		await user.click(screen.getByRole("button", { name: /save changes/i }));

		// Phone → `users` (email is a locked column, never written here).
		await waitFor(() => {
			expect(h.usersUpdate).toHaveBeenCalledWith({ phone: "555-2000" });
		});
		expect(h.usersUpdate).not.toHaveBeenCalledWith(
			expect.objectContaining({ email: expect.anything() }),
		);

		// Email → Supabase Auth (confirmation flow), NOT the users table.
		expect(h.authUpdateUser).toHaveBeenCalledWith({ email: "new@example.com" });

		expect(h.prefsUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: "user-1",
				timezone: "America/Denver",
				language: "fr",
			}),
		);
	});

	it("does not wipe email with a blank value (T-31-06-02)", async () => {
		const user = userEvent.setup();
		renderWithClient(<GeneralSettings />);

		const emailInput = (await screen.findByLabelText(
			"Contact Email",
		)) as HTMLInputElement;
		await user.clear(emailInput);

		await user.click(screen.getByRole("button", { name: /save changes/i }));

		await waitFor(() => {
			expect(h.toastInfo).toHaveBeenCalledWith("No changes to save");
		});
		// No email key sent (would have wiped the account email).
		expect(h.usersUpdate).not.toHaveBeenCalled();
		expect(h.authUpdateUser).not.toHaveBeenCalled();
	});

	it("shows 'No changes to save' when nothing changed", async () => {
		const user = userEvent.setup();
		renderWithClient(<GeneralSettings />);

		// Wait for both profile + preferences to seed the form.
		const timezone = (await screen.findByLabelText(
			"Timezone",
		)) as HTMLSelectElement;
		await waitFor(() => expect(timezone.value).toBe("America/New_York"));

		await user.click(screen.getByRole("button", { name: /save changes/i }));

		await waitFor(() => {
			expect(h.toastInfo).toHaveBeenCalledWith("No changes to save");
		});
		expect(h.usersUpdate).not.toHaveBeenCalled();
		expect(h.prefsUpsert).not.toHaveBeenCalled();
	});
});
