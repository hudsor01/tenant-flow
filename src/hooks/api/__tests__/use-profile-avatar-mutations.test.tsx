/**
 * useUploadAvatarMutation tests (UIX-05)
 *
 * Pins the cache-busting fix: after getPublicUrl(), the URL persisted to
 * users.avatar_url and returned as AvatarUploadResponse carries a `?v=<ts>`
 * token so a re-upload (deterministic path + upsert overwrites the same object)
 * still changes the stored URL — busting the CDN/browser cache key and forcing
 * React to re-render the new src. The deterministic path + upsert:true are
 * preserved so no orphan objects accumulate.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PUBLIC_URL = "https://cdn.example.test/avatars/user-123/avatar.png";

// --- hoisted mock fns referenced inside vi.mock (CLAUDE.md rule) ---
const {
	mockStorageUpload,
	mockGetPublicUrl,
	mockUpdate,
	mockEq,
	mockFrom,
	mockGetCachedUser,
} = vi.hoisted(() => ({
	mockStorageUpload: vi.fn(),
	mockGetPublicUrl: vi.fn(),
	mockUpdate: vi.fn(),
	mockEq: vi.fn(),
	mockFrom: vi.fn(),
	mockGetCachedUser: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		storage: {
			from: () => ({
				upload: mockStorageUpload,
				getPublicUrl: mockGetPublicUrl,
			}),
		},
		from: mockFrom,
	}),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));

vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: vi.fn(),
	handleMutationSuccess: vi.fn(),
	showStorageQuotaUpgradeToast: vi.fn(),
}));

vi.mock("#lib/frontend-logger", () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	}),
}));

import { handleMutationError } from "#lib/mutation-error-handler";
import { useUploadAvatarMutation } from "../use-profile-avatar-mutations";

function renderWithClient<TReturn>(hook: () => TReturn): {
	result: { current: TReturn };
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
	return { result };
}

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCachedUser.mockResolvedValue({ id: "user-123" });
	mockStorageUpload.mockResolvedValue({ error: null });
	mockGetPublicUrl.mockReturnValue({ data: { publicUrl: PUBLIC_URL } });
	mockEq.mockResolvedValue({ error: null });
	mockUpdate.mockReturnValue({ eq: mockEq });
	mockFrom.mockReturnValue({ update: mockUpdate });
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("useUploadAvatarMutation — cache-busted avatar_url (UIX-05)", () => {
	it("persists and returns a `?v=<timestamp>` versioned URL", async () => {
		const { result } = renderWithClient(() => useUploadAvatarMutation());
		const file = new File(["x"], "me.png", { type: "image/png" });

		const response = await result.current.mutateAsync(file);

		// users.avatar_url payload carries the cache-buster token.
		expect(mockUpdate).toHaveBeenCalledTimes(1);
		const payload = mockUpdate.mock.calls[0]?.[0] as { avatar_url: string };
		// Assert the prefix + token shape without building a RegExp from PUBLIC_URL
		// (a dynamic pattern would need full metacharacter escaping — CodeQL flags
		// the partial `.`-only escape as incomplete string escaping).
		expect(payload.avatar_url.startsWith(`${PUBLIC_URL}?v=`)).toBe(true);
		expect(payload.avatar_url).toMatch(/\?v=\d+$/);

		// The persisted URL and the returned AvatarUploadResponse are identical.
		expect(response.avatar_url).toBe(payload.avatar_url);
		expect(response.avatar_url).toContain("?v=");

		// Scoped to the current user.
		expect(mockEq).toHaveBeenCalledWith("id", "user-123");
	});

	it("keeps the deterministic path + upsert (no per-upload object, no orphans)", async () => {
		const { result } = renderWithClient(() => useUploadAvatarMutation());
		const file = new File(["x"], "portrait.jpg", { type: "image/jpeg" });

		await result.current.mutateAsync(file);

		expect(mockStorageUpload).toHaveBeenCalledTimes(1);
		expect(mockStorageUpload).toHaveBeenCalledWith(
			"user-123/avatar.jpg",
			file,
			{ upsert: true, contentType: "image/jpeg" },
		);
	});
});

describe("useUploadAvatarMutation — storage plan-limit Upgrade CTA (METER-04)", () => {
	it("routes a storage-quota rejection through handleMutationError for the Upgrade toast", async () => {
		const { result } = renderWithClient(() => useUploadAvatarMutation());
		const file = new File(["x"], "me.png", { type: "image/png" });

		// The Plan 04 trigger rejects the upload with the plan_limit_exceeded:
		// message prefix (StorageApiError — no hint/detail); the mutationFn
		// re-throws it, and onError forwards it to the shared handler.
		mockStorageUpload.mockResolvedValueOnce({
			error: {
				name: "StorageApiError",
				message:
					"plan_limit_exceeded: storage quota reached (11811160064 / 10737418240 bytes used)",
				status: 400,
				statusCode: "400",
			},
		});

		await expect(result.current.mutateAsync(file)).rejects.toMatchObject({
			message: expect.stringContaining("plan_limit_exceeded:"),
		});

		// onError forwarded the prefixed storage error to the shared handler,
		// which (unit-tested in mutation-error-handler.test) renders the
		// 'Plan limit reached' Upgrade toast (source=storage_quota_gate).
		expect(vi.mocked(handleMutationError)).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining("plan_limit_exceeded:"),
			}),
			"Upload avatar",
		);
	});
});
