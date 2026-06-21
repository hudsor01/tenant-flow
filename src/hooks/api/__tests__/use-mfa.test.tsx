/**
 * MFA Hooks Tests
 *
 * Covers the 3 MFA mutations (enroll/verify/unenroll) and the 2 MFA
 * queries (status/factors). Mocks the Supabase client at the
 * `#lib/supabase/client` factory boundary plus the named lib boundaries
 * (mutation-error-handler, sonner). Never reaches into Supabase internals.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockEnroll,
	mockChallenge,
	mockVerify,
	mockUnenroll,
	mockListFactors,
	mockGetAal,
	mockHandleMutationError,
	mockToastSuccess,
	mockToastError,
} = vi.hoisted(() => ({
	mockEnroll: vi.fn(),
	mockChallenge: vi.fn(),
	mockVerify: vi.fn(),
	mockUnenroll: vi.fn(),
	mockListFactors: vi.fn(),
	mockGetAal: vi.fn(),
	mockHandleMutationError: vi.fn(),
	mockToastSuccess: vi.fn(),
	mockToastError: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			mfa: {
				enroll: mockEnroll,
				challenge: mockChallenge,
				verify: mockVerify,
				unenroll: mockUnenroll,
				listFactors: mockListFactors,
				getAuthenticatorAssuranceLevel: mockGetAal,
			},
		},
	}),
}));

vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: mockHandleMutationError,
}));

vi.mock("sonner", () => ({
	toast: {
		success: mockToastSuccess,
		error: mockToastError,
	},
}));

import { mfaKeys } from "../query-keys/mfa-keys";
import {
	useMfaEnrollMutation,
	useMfaFactors,
	useMfaStatus,
	useMfaUnenrollMutation,
	useMfaVerifyMutation,
} from "../use-mfa";

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

describe("useMfaEnrollMutation", () => {
	it("enrolls a TOTP factor with the default friendlyName and maps the response fields", async () => {
		mockEnroll.mockResolvedValueOnce({
			data: {
				id: "factor-123",
				totp: {
					qr_code: "data:image/svg+xml;base64,QR",
					secret: "SECRETBASE32",
					uri: "otpauth://totp/TenantFlow",
				},
			},
			error: null,
		});

		const { result } = renderWithClient(() => useMfaEnrollMutation());
		const enrollment = await result.current.mutateAsync(undefined);

		expect(mockEnroll).toHaveBeenCalledTimes(1);
		expect(mockEnroll).toHaveBeenCalledWith({
			factorType: "totp",
			friendlyName: "Authenticator App",
		});

		expect(enrollment).toEqual({
			factorId: "factor-123",
			qrCode: "data:image/svg+xml;base64,QR",
			secret: "SECRETBASE32",
			uri: "otpauth://totp/TenantFlow",
		});
	});

	it("forwards a custom friendlyName argument", async () => {
		mockEnroll.mockResolvedValueOnce({
			data: {
				id: "factor-9",
				totp: { qr_code: "qr", secret: "s", uri: "u" },
			},
			error: null,
		});

		const { result } = renderWithClient(() => useMfaEnrollMutation());
		await result.current.mutateAsync("My Phone");

		expect(mockEnroll).toHaveBeenCalledWith({
			factorType: "totp",
			friendlyName: "My Phone",
		});
	});

	it("rejects and routes to handleMutationError when enroll returns an error", async () => {
		mockEnroll.mockResolvedValueOnce({
			data: null,
			error: { message: "enroll boom" },
		});

		const { result } = renderWithClient(() => useMfaEnrollMutation());

		await expect(result.current.mutateAsync(undefined)).rejects.toMatchObject({
			message: expect.stringContaining("enroll boom"),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "enroll boom" }),
			"MFA enrollment",
		);
	});
});

describe("useMfaVerifyMutation", () => {
	it("challenges then verifies in order, threads challengeId, invalidates mfaKeys.all + toasts on success", async () => {
		const callOrder: string[] = [];
		mockChallenge.mockImplementationOnce(async () => {
			callOrder.push("challenge");
			return { data: { id: "challenge-abc" }, error: null };
		});
		mockVerify.mockImplementationOnce(async () => {
			callOrder.push("verify");
			return { data: {}, error: null };
		});

		const { result, queryClient } = renderWithClient(() =>
			useMfaVerifyMutation(),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		await result.current.mutateAsync({ factorId: "factor-1", code: "123456" });

		// challenge runs BEFORE verify
		expect(callOrder).toEqual(["challenge", "verify"]);

		expect(mockChallenge).toHaveBeenCalledWith({ factorId: "factor-1" });
		// challengeId from challenge() is threaded into verify()
		expect(mockVerify).toHaveBeenCalledWith({
			factorId: "factor-1",
			challengeId: "challenge-abc",
			code: "123456",
		});

		await waitFor(() => {
			expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: mfaKeys.all });
		});
		expect(mockToastSuccess).toHaveBeenCalledWith(
			"Two-factor authentication verified",
		);
	});

	it("rejects when challenge() errors and does NOT call verify()", async () => {
		mockChallenge.mockResolvedValueOnce({
			data: null,
			error: { message: "challenge failed" },
		});

		const { result } = renderWithClient(() => useMfaVerifyMutation());

		await expect(
			result.current.mutateAsync({ factorId: "factor-1", code: "000000" }),
		).rejects.toMatchObject({
			message: expect.stringContaining("challenge failed"),
		});

		expect(mockVerify).not.toHaveBeenCalled();
		expect(mockToastSuccess).not.toHaveBeenCalled();
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "challenge failed" }),
			"MFA verification",
		);
	});

	it("rejects when verify() errors (challenge succeeded)", async () => {
		mockChallenge.mockResolvedValueOnce({
			data: { id: "challenge-xyz" },
			error: null,
		});
		mockVerify.mockResolvedValueOnce({
			data: null,
			error: { message: "verify failed" },
		});

		const { result } = renderWithClient(() => useMfaVerifyMutation());

		await expect(
			result.current.mutateAsync({ factorId: "factor-1", code: "111111" }),
		).rejects.toMatchObject({
			message: expect.stringContaining("verify failed"),
		});

		expect(mockChallenge).toHaveBeenCalledTimes(1);
		expect(mockVerify).toHaveBeenCalledTimes(1);
		expect(mockToastSuccess).not.toHaveBeenCalled();
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "verify failed" }),
			"MFA verification",
		);
	});
});

describe("useMfaUnenrollMutation", () => {
	it("unenrolls by factorId, invalidates mfaKeys.all + toasts on success", async () => {
		mockUnenroll.mockResolvedValueOnce({ data: {}, error: null });

		const { result, queryClient } = renderWithClient(() =>
			useMfaUnenrollMutation(),
		);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		await result.current.mutateAsync("factor-42");

		expect(mockUnenroll).toHaveBeenCalledWith({ factorId: "factor-42" });

		await waitFor(() => {
			expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: mfaKeys.all });
		});
		expect(mockToastSuccess).toHaveBeenCalledWith(
			"Two-factor authentication disabled",
		);
	});

	it("rejects and routes to handleMutationError when unenroll errors", async () => {
		mockUnenroll.mockResolvedValueOnce({
			data: null,
			error: { message: "unenroll failed" },
		});

		const { result } = renderWithClient(() => useMfaUnenrollMutation());

		await expect(result.current.mutateAsync("factor-42")).rejects.toMatchObject(
			{
				message: expect.stringContaining("unenroll failed"),
			},
		);

		expect(mockToastSuccess).not.toHaveBeenCalled();
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "unenroll failed" }),
			"Disable 2FA",
		);
	});
});

describe("useMfaStatus", () => {
	it("derives enabled + verification-required when MFA enrolled but not yet stepped up (aal1 -> aal2)", async () => {
		mockGetAal.mockResolvedValueOnce({
			data: { currentLevel: "aal1", nextLevel: "aal2" },
			error: null,
		});

		const { result } = renderWithClient(() => useMfaStatus());

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockGetAal).toHaveBeenCalledTimes(1);
		expect(result.current.data).toEqual({
			currentLevel: "aal1",
			nextLevel: "aal2",
			isMfaEnabled: true,
			requiresMfaVerification: true,
		});
	});

	it("derives enabled but NOT verification-required once stepped up (aal2 -> aal2)", async () => {
		// Disambiguates requiresMfaVerification from isMfaEnabled: both would be
		// true here if the second-condition guard (currentLevel !== 'aal2') regressed.
		mockGetAal.mockResolvedValueOnce({
			data: { currentLevel: "aal2", nextLevel: "aal2" },
			error: null,
		});

		const { result } = renderWithClient(() => useMfaStatus());

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual({
			currentLevel: "aal2",
			nextLevel: "aal2",
			isMfaEnabled: true,
			requiresMfaVerification: false,
		});
	});

	it("derives disabled when no factor enrolled (aal1 -> aal1)", async () => {
		mockGetAal.mockResolvedValueOnce({
			data: { currentLevel: "aal1", nextLevel: "aal1" },
			error: null,
		});

		const { result } = renderWithClient(() => useMfaStatus());

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual({
			currentLevel: "aal1",
			nextLevel: "aal1",
			isMfaEnabled: false,
			requiresMfaVerification: false,
		});
	});

	it("surfaces an error when getAuthenticatorAssuranceLevel fails", async () => {
		mockGetAal.mockResolvedValueOnce({
			data: null,
			error: { message: "aal failed" },
		});

		const { result } = renderWithClient(() => useMfaStatus());

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(result.current.error).toMatchObject({ message: "aal failed" });
	});
});

describe("useMfaFactors", () => {
	it("maps listed TOTP factors into EnrolledFactor records", async () => {
		mockListFactors.mockResolvedValueOnce({
			data: {
				totp: [
					{
						id: "totp-1",
						friendly_name: "Authenticator App",
						status: "verified",
						created_at: "2026-01-01T00:00:00Z",
						updated_at: "2026-01-02T00:00:00Z",
					},
				],
			},
			error: null,
		});

		const { result } = renderWithClient(() => useMfaFactors());

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockListFactors).toHaveBeenCalledTimes(1);
		expect(result.current.data).toEqual([
			{
				id: "totp-1",
				type: "totp",
				friendlyName: "Authenticator App",
				status: "verified",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-02T00:00:00Z",
			},
		]);
	});

	it("maps a missing friendly_name to undefined and appends phone factors after totp", async () => {
		mockListFactors.mockResolvedValueOnce({
			data: {
				totp: [
					{
						id: "totp-1",
						friendly_name: null,
						status: "unverified",
						created_at: "2026-01-01T00:00:00Z",
						updated_at: "2026-01-02T00:00:00Z",
					},
				],
				phone: [
					{
						id: "phone-1",
						friendly_name: "My Phone",
						status: "verified",
						created_at: "2026-02-01T00:00:00Z",
						updated_at: "2026-02-02T00:00:00Z",
					},
				],
			},
			error: null,
		});

		const { result } = renderWithClient(() => useMfaFactors());

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// totp first (null friendly_name -> undefined), phone appended after
		expect(result.current.data).toEqual([
			{
				id: "totp-1",
				type: "totp",
				friendlyName: undefined,
				status: "unverified",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-02T00:00:00Z",
			},
			{
				id: "phone-1",
				type: "phone",
				friendlyName: "My Phone",
				status: "verified",
				createdAt: "2026-02-01T00:00:00Z",
				updatedAt: "2026-02-02T00:00:00Z",
			},
		]);
	});

	it("surfaces an error when listFactors fails", async () => {
		mockListFactors.mockResolvedValueOnce({
			data: null,
			error: { message: "list failed" },
		});

		const { result } = renderWithClient(() => useMfaFactors());

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(result.current.error).toMatchObject({ message: "list failed" });
	});
});
