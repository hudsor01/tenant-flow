/**
 * Auth Mutation Hooks Tests
 *
 * Covers the 3 mutation hooks in use-auth-mutations.ts:
 * - useSignOutMutation
 * - useSupabasePasswordResetMutation
 * - useChangePasswordMutation (SECURITY-CRITICAL: 3 reject branches)
 *
 * Mocked at the lib boundaries (createClient factory, get-cached-user,
 * frontend-logger, mutation-error-handler) and
 * the local ./use-auth surface (authKeys + useAuthCacheUtils).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockSignOut,
	mockSignInWithPassword,
	mockResetPasswordForEmail,
	mockUpdateUser,
	mockGetCachedUser,
	mockClearAuthData,
	mockHandleMutationError,
	mockHandleMutationSuccess,
	mockLoggerInfo,
	mockLoggerError,
} = vi.hoisted(() => ({
	mockSignOut: vi.fn(),
	mockSignInWithPassword: vi.fn(),
	mockResetPasswordForEmail: vi.fn(),
	mockUpdateUser: vi.fn(),
	mockGetCachedUser: vi.fn(),
	mockClearAuthData: vi.fn(),
	mockHandleMutationError: vi.fn(),
	mockHandleMutationSuccess: vi.fn(),
	mockLoggerInfo: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			signOut: mockSignOut,
			signInWithPassword: mockSignInWithPassword,
			resetPasswordForEmail: mockResetPasswordForEmail,
			updateUser: mockUpdateUser,
		},
	}),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));

vi.mock("#lib/frontend-logger", () => ({
	logger: {
		info: mockLoggerInfo,
		error: mockLoggerError,
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: mockHandleMutationError,
	handleMutationSuccess: mockHandleMutationSuccess,
}));

vi.mock("../use-auth", () => ({
	authKeys: {
		supabase: {
			all: ["supabase-auth"],
			user: () => ["supabase-auth", "user"],
			session: () => ["supabase-auth", "session"],
		},
	},
	useAuthCacheUtils: () => ({ clearAuthData: mockClearAuthData }),
}));

import {
	useChangePasswordMutation,
	useSignOutMutation,
	useSupabasePasswordResetMutation,
} from "../use-auth-mutations";

function renderWithClient<TReturn>(hook: () => TReturn): {
	result: { current: TReturn };
	queryClient: QueryClient;
} {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	const { result } = renderHook(hook, { wrapper });
	return { result, queryClient };
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("useSignOutMutation", () => {
	it("calls clearAuthData on success", async () => {
		mockSignOut.mockResolvedValue({ error: null });

		const { result } = renderWithClient(() => useSignOutMutation());
		await result.current.mutateAsync();

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(mockSignOut).toHaveBeenCalledTimes(1);
		expect(mockClearAuthData).toHaveBeenCalledTimes(1);
		expect(mockLoggerInfo).toHaveBeenCalledWith(
			expect.stringContaining("signed out"),
			expect.objectContaining({ action: "sign_out_success" }),
		);
	});

	it("logs and sets isError when signOut errors (clearAuthData not called)", async () => {
		mockSignOut.mockResolvedValue({ error: new Error("network down") });

		const { result } = renderWithClient(() => useSignOutMutation());
		await expect(result.current.mutateAsync()).rejects.toMatchObject({
			message: expect.stringContaining("network down"),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(mockClearAuthData).not.toHaveBeenCalled();
		expect(mockLoggerError).toHaveBeenCalledWith(
			"Sign out failed",
			expect.objectContaining({ action: "sign_out_error" }),
		);
	});
});

describe("useSupabasePasswordResetMutation", () => {
	it("calls resetPasswordForEmail with the update-password redirectTo", async () => {
		mockResetPasswordForEmail.mockResolvedValue({ error: null });

		const { result } = renderWithClient(() =>
			useSupabasePasswordResetMutation(),
		);
		await result.current.mutateAsync("owner@example.com");

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
			"owner@example.com",
			{ redirectTo: `${window.location.origin}/auth/update-password` },
		);
		expect(mockHandleMutationSuccess).toHaveBeenCalledWith(
			"Password reset",
			expect.stringContaining("check your email"),
		);
	});

	it("routes to handleMutationError on error", async () => {
		mockResetPasswordForEmail.mockResolvedValue({
			error: new Error("rate limited"),
		});

		const { result } = renderWithClient(() =>
			useSupabasePasswordResetMutation(),
		);
		await expect(
			result.current.mutateAsync("owner@example.com"),
		).rejects.toMatchObject({
			message: expect.stringContaining("rate limited"),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "rate limited" }),
			"Password reset",
		);
	});
});

describe("useChangePasswordMutation (security-critical)", () => {
	const input = { currentPassword: "old-pw", newPassword: "new-pw" };

	it("rejects 'User not authenticated' and does NOT call updateUser when cached user has no email", async () => {
		mockGetCachedUser.mockResolvedValue({ id: "user-1", email: null });

		const { result } = renderWithClient(() => useChangePasswordMutation());
		await expect(result.current.mutateAsync(input)).rejects.toMatchObject({
			message: expect.stringContaining("User not authenticated"),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(mockGetCachedUser).toHaveBeenCalledTimes(1);
		expect(mockSignInWithPassword).not.toHaveBeenCalled();
		expect(mockUpdateUser).not.toHaveBeenCalled();
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "User not authenticated" }),
			"Change password",
		);
		expect(mockHandleMutationSuccess).not.toHaveBeenCalled();
	});

	it("rejects 'Current password is incorrect' when re-auth fails (updateUser not called)", async () => {
		mockGetCachedUser.mockResolvedValue({
			id: "user-1",
			email: "owner@example.com",
		});
		mockSignInWithPassword.mockResolvedValue({
			data: null,
			error: new Error("Invalid login credentials"),
		});

		const { result } = renderWithClient(() => useChangePasswordMutation());
		await expect(result.current.mutateAsync(input)).rejects.toMatchObject({
			message: expect.stringContaining("Current password is incorrect"),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(mockSignInWithPassword).toHaveBeenCalledWith({
			email: "owner@example.com",
			password: "old-pw",
		});
		expect(mockUpdateUser).not.toHaveBeenCalled();
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Current password is incorrect" }),
			"Change password",
		);
		expect(mockHandleMutationSuccess).not.toHaveBeenCalled();
	});

	it("rejects when updateUser errors after a successful re-auth", async () => {
		mockGetCachedUser.mockResolvedValue({
			id: "user-1",
			email: "owner@example.com",
		});
		mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
		mockUpdateUser.mockResolvedValue({
			data: null,
			error: new Error("weak password"),
		});

		const { result } = renderWithClient(() => useChangePasswordMutation());
		await expect(result.current.mutateAsync(input)).rejects.toMatchObject({
			message: expect.stringContaining("weak password"),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(mockUpdateUser).toHaveBeenCalledTimes(1);
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "weak password" }),
			"Change password",
		);
		// Dual-fire guard (parity with the other two reject branches): the
		// success handler must NOT fire on the updateUser-error path.
		expect(mockHandleMutationSuccess).not.toHaveBeenCalled();
	});

	it("happy path: calls updateUser({ password }) exactly once after re-auth", async () => {
		mockGetCachedUser.mockResolvedValue({
			id: "user-1",
			email: "owner@example.com",
		});
		mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
		mockUpdateUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});

		const { result } = renderWithClient(() => useChangePasswordMutation());
		await result.current.mutateAsync(input);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(mockGetCachedUser).toHaveBeenCalledTimes(1);
		expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
		expect(mockUpdateUser).toHaveBeenCalledTimes(1);
		expect(mockUpdateUser).toHaveBeenCalledWith({ password: "new-pw" });
		expect(mockHandleMutationSuccess).toHaveBeenCalledWith(
			"Change password",
			expect.stringContaining("updated successfully"),
		);
		expect(mockHandleMutationError).not.toHaveBeenCalled();
	});
});
