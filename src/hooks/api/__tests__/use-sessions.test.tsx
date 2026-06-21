/**
 * Sessions Hooks Tests
 *
 * Covers useUserSessions (query) and the complex useRevokeSessionMutation:
 * current-session signOut fast-path, non-current RPC revoke, decode-failed
 * fast-path, post-RPC re-decode defense-in-depth, error/auth branches, and
 * the optimistic cache remove + rollback + invalidation.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted Supabase auth + rpc mocks referenced inside vi.mock factories.
const {
	mockGetSession,
	mockGetUser,
	mockSignOut,
	mockRpc,
	mockDecodeSessionId,
	mockHandleMutationError,
	mockHandleMutationSuccess,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockGetUser: vi.fn(),
	mockSignOut: vi.fn(),
	mockRpc: vi.fn(),
	mockDecodeSessionId: vi.fn(),
	mockHandleMutationError: vi.fn(),
	mockHandleMutationSuccess: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			getSession: mockGetSession,
			getUser: mockGetUser,
			signOut: mockSignOut,
		},
		rpc: mockRpc,
	}),
}));

// Partial mock: keep sessionKeys/sessionQueries/UserSession real so the cache
// keys and the list queryFn behave exactly as production; only override the
// decode helper so the current-session match is controllable per test.
vi.mock("../query-keys/session-keys", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../query-keys/session-keys")>();
	return {
		...actual,
		decodeSessionIdFromAccessToken: mockDecodeSessionId,
	};
});

vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: mockHandleMutationError,
	handleMutationSuccess: mockHandleMutationSuccess,
}));

import { sessionKeys, type UserSession } from "../query-keys/session-keys";
import { useRevokeSessionMutation, useUserSessions } from "../use-sessions";

function createWrapperWithClient(): {
	wrapper: ({ children }: { children: ReactNode }) => ReactNode;
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
	return { wrapper, queryClient };
}

function makeSession(accessToken = "header.payload.sig", userId = "user-1") {
	return {
		data: {
			session: { access_token: accessToken, user: { id: userId } },
		},
	};
}

/**
 * Build a real (unsigned) JWT-shaped token whose base64url payload decodes to
 * the given session_id. The list queryFn calls the REAL
 * decodeSessionIdFromAccessToken (intra-module reference, not the mocked
 * export), so a real token is needed to exercise the is_current flagging.
 */
function makeAccessTokenForSession(sessionId: string): string {
	const payload = Buffer.from(JSON.stringify({ session_id: sessionId }))
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `header.${payload}.sig`;
}

function makeUserSession(id: string, isCurrent = false): UserSession {
	return {
		id,
		user_id: "user-1",
		created_at: "2026-01-01T00:00:00Z",
		updated_at: "2026-01-01T00:00:00Z",
		user_agent: null,
		ip: null,
		browser: null,
		os: null,
		device: null,
		is_current: isCurrent,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("useUserSessions", () => {
	it("maps get_user_sessions rows and flags the current session via decoded JWT", async () => {
		// The list queryFn uses the REAL decode helper (intra-module call), so
		// provide a real token whose payload carries session_id=session-current.
		mockGetSession.mockResolvedValue(
			makeSession(makeAccessTokenForSession("session-current"), "user-1"),
		);
		mockRpc.mockResolvedValue({
			data: [
				{
					id: "session-current",
					user_id: "user-1",
					created_at: "2026-01-01T00:00:00Z",
					updated_at: "2026-01-02T00:00:00Z",
					user_agent:
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0",
					ip: "1.2.3.4",
				},
				{
					id: "session-other",
					user_id: "user-1",
					created_at: "2026-01-01T00:00:00Z",
					updated_at: "2026-01-02T00:00:00Z",
					user_agent: null,
					ip: null,
				},
			],
			error: null,
		});

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useUserSessions(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data?.length).toBe(2);
		expect(result.current.data?.[0]?.id).toBe("session-current");
		expect(result.current.data?.[0]?.is_current).toBe(true);
		expect(result.current.data?.[0]?.browser).toBe("Chrome");
		expect(result.current.data?.[0]?.os).toBe("macOS");
		expect(result.current.data?.[1]?.is_current).toBe(false);
		expect(mockRpc).toHaveBeenCalledWith("get_user_sessions", {
			p_user_id: "user-1",
		});
	});

	it("returns an empty list when there is no session", async () => {
		mockGetSession.mockResolvedValue({ data: { session: null } });

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useUserSessions(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual([]);
		expect(mockRpc).not.toHaveBeenCalled();
	});

	it("surfaces an error when get_user_sessions RPC fails", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue(null);
		mockRpc.mockResolvedValue({
			data: null,
			error: { message: "rpc boom" },
		});

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useUserSessions(), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toMatchObject({ message: "rpc boom" });
	});
});

describe("useRevokeSessionMutation - current session fast-path", () => {
	it("signs out and skips the RPC when input.isCurrent is true", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue("some-other-id");
		mockSignOut.mockResolvedValue({ error: null });

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		const res = await result.current.mutateAsync({
			id: "session-A",
			isCurrent: true,
		});

		expect(res).toEqual({ success: true, message: "Session terminated" });
		expect(mockSignOut).toHaveBeenCalledTimes(1);
		expect(mockRpc).not.toHaveBeenCalled();
		expect(mockGetUser).not.toHaveBeenCalled();
	});

	it("rejects when signOut on the current session errors", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue(null);
		mockSignOut.mockResolvedValue({ error: { message: "signout failed" } });

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		await expect(
			result.current.mutateAsync({ id: "session-A", isCurrent: true }),
		).rejects.toMatchObject({
			message: expect.stringContaining("signout failed"),
		});
		expect(mockRpc).not.toHaveBeenCalled();
	});

	it("routes decode-failed-at-list rows (isCurrent=false but fresh decode matches) to signOut", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		// Fresh decode resolves to the same id the caller wants to revoke even
		// though the listing carried is_current=false (decode failed at list).
		mockDecodeSessionId.mockReturnValue("session-A");
		mockSignOut.mockResolvedValue({ error: null });

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		const res = await result.current.mutateAsync({
			id: "session-A",
			isCurrent: false,
		});

		expect(res).toEqual({ success: true, message: "Session terminated" });
		expect(mockSignOut).toHaveBeenCalledTimes(1);
		expect(mockRpc).not.toHaveBeenCalled();
		expect(mockGetUser).not.toHaveBeenCalled();
	});
});

describe("useRevokeSessionMutation - non-current RPC path", () => {
	it("calls getUser then revoke_user_session and does NOT sign out", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		// Fresh decode never matches input.id in either decode call.
		mockDecodeSessionId.mockReturnValue("current-session-id");
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});
		mockRpc.mockResolvedValue({ data: null, error: null });

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		const res = await result.current.mutateAsync({
			id: "session-B",
			isCurrent: false,
		});

		expect(res).toEqual({ success: true, message: "Session terminated" });
		expect(mockGetUser).toHaveBeenCalledTimes(1);
		expect(mockRpc).toHaveBeenCalledWith("revoke_user_session", {
			p_user_id: "user-1",
			p_session_id: "session-B",
		});
		expect(mockSignOut).not.toHaveBeenCalled();
	});

	it("post-RPC re-decode matching input.id triggers signOut after the RPC (defense-in-depth)", async () => {
		const callOrder: string[] = [];
		mockGetSession.mockResolvedValue(makeSession());
		// First decode (fast-path) does NOT match → RPC path; second decode
		// (post-RPC) DOES match → signOut.
		mockDecodeSessionId
			.mockReturnValueOnce("current-session-id")
			.mockReturnValueOnce("session-B");
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});
		mockRpc.mockImplementation(() => {
			callOrder.push("rpc");
			return Promise.resolve({ data: null, error: null });
		});
		mockSignOut.mockImplementation(() => {
			callOrder.push("signOut");
			return Promise.resolve({ error: null });
		});

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		const res = await result.current.mutateAsync({
			id: "session-B",
			isCurrent: false,
		});

		expect(res).toEqual({ success: true, message: "Session terminated" });
		expect(mockRpc).toHaveBeenCalledTimes(1);
		expect(mockSignOut).toHaveBeenCalledTimes(1);
		expect(callOrder).toEqual(["rpc", "signOut"]);
	});

	it("rejects with the RPC error when revoke_user_session fails", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue("current-session-id");
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});
		mockRpc.mockResolvedValue({
			data: null,
			error: { message: "revoke denied" },
		});

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		await expect(
			result.current.mutateAsync({ id: "session-B", isCurrent: false }),
		).rejects.toMatchObject({
			message: expect.stringContaining("revoke denied"),
		});
		expect(mockSignOut).not.toHaveBeenCalled();
	});

	it("rejects when getUser returns an error", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue("current-session-id");
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: { message: "getUser failed" },
		});

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		await expect(
			result.current.mutateAsync({ id: "session-B", isCurrent: false }),
		).rejects.toMatchObject({
			message: expect.stringContaining("getUser failed"),
		});
		expect(mockRpc).not.toHaveBeenCalled();
	});

	it('rejects "Not authenticated" when getUser returns no user', async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue("current-session-id");
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		await expect(
			result.current.mutateAsync({ id: "session-B", isCurrent: false }),
		).rejects.toMatchObject({
			message: expect.stringContaining("Not authenticated"),
		});
		expect(mockRpc).not.toHaveBeenCalled();
	});

	it("treats a null session as non-current and proceeds to the RPC path", async () => {
		mockGetSession.mockResolvedValue({ data: { session: null } });
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});
		mockRpc.mockResolvedValue({ data: null, error: null });

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		const res = await result.current.mutateAsync({
			id: "session-B",
			isCurrent: false,
		});

		expect(res).toEqual({ success: true, message: "Session terminated" });
		// session was null in both getSession calls → decode never invoked.
		expect(mockDecodeSessionId).not.toHaveBeenCalled();
		expect(mockRpc).toHaveBeenCalledWith("revoke_user_session", {
			p_user_id: "user-1",
			p_session_id: "session-B",
		});
		expect(mockSignOut).not.toHaveBeenCalled();
	});
});

describe("useRevokeSessionMutation - optimistic cache", () => {
	it("onMutate removes the revoked row from sessionKeys.all and onSettled invalidates", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue(null);
		mockSignOut.mockResolvedValue({ error: null });

		const { wrapper, queryClient } = createWrapperWithClient();
		queryClient.setQueryData<UserSession[]>(sessionKeys.all, [
			makeUserSession("session-A", true),
			makeUserSession("session-B"),
		]);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		await result.current.mutateAsync({ id: "session-A", isCurrent: true });

		const cached = queryClient.getQueryData<UserSession[]>(sessionKeys.all);
		expect(cached?.map((s) => s.id)).toEqual(["session-B"]);

		await waitFor(() => {
			const invalidatedKeys = invalidateSpy.mock.calls.map(
				(call) => (call[0] as { queryKey: unknown }).queryKey,
			);
			expect(invalidatedKeys).toContainEqual(sessionKeys.all);
		});
	});

	it("onError restores context.previous and forwards the error to handleMutationError", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue(null);
		mockSignOut.mockResolvedValue({ error: { message: "signout failed" } });

		const { wrapper, queryClient } = createWrapperWithClient();
		const seed = [
			makeUserSession("session-A", true),
			makeUserSession("session-B"),
		];
		queryClient.setQueryData<UserSession[]>(sessionKeys.all, seed);

		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		await expect(
			result.current.mutateAsync({ id: "session-A", isCurrent: true }),
		).rejects.toMatchObject({
			message: expect.stringContaining("signout failed"),
		});

		// Rollback: the optimistically-removed row is restored.
		const cached = queryClient.getQueryData<UserSession[]>(sessionKeys.all);
		expect(cached?.map((s) => s.id)).toEqual(["session-A", "session-B"]);
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "signout failed" }),
			"Revoke session",
		);
	});

	it("onSuccess reports success via handleMutationSuccess", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue(null);
		mockSignOut.mockResolvedValue({ error: null });

		const { wrapper } = createWrapperWithClient();
		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		await result.current.mutateAsync({ id: "session-A", isCurrent: true });

		expect(mockHandleMutationSuccess).toHaveBeenCalledWith(
			"Revoke session",
			"The session has been terminated successfully",
		);
	});

	it("rolls back the optimistic removal when the non-current RPC path rejects", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		// Decode never matches → RPC path (the security-relevant route).
		mockDecodeSessionId.mockReturnValue("current-session-id");
		mockGetUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});
		mockRpc.mockResolvedValue({
			data: null,
			error: { message: "revoke denied" },
		});

		const { wrapper, queryClient } = createWrapperWithClient();
		queryClient.setQueryData<UserSession[]>(sessionKeys.all, [
			makeUserSession("session-A", true),
			makeUserSession("session-B"),
		]);

		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		await expect(
			result.current.mutateAsync({ id: "session-B", isCurrent: false }),
		).rejects.toMatchObject({
			message: expect.stringContaining("revoke denied"),
		});

		// RPC failed → optimistic removal of session-B is rolled back.
		const cached = queryClient.getQueryData<UserSession[]>(sessionKeys.all);
		expect(cached?.map((s) => s.id)).toEqual(["session-A", "session-B"]);
		expect(mockSignOut).not.toHaveBeenCalled();
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "revoke denied" }),
			"Revoke session",
		);
	});

	it("onMutate is a no-op (no crash, no cache write) when the cache is empty", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockDecodeSessionId.mockReturnValue(null);
		mockSignOut.mockResolvedValue({ error: null });

		const { wrapper, queryClient } = createWrapperWithClient();
		// No seed — exercises the `if (previous)` guard in onMutate.
		const setSpy = vi.spyOn(queryClient, "setQueryData");

		const { result } = renderHook(() => useRevokeSessionMutation(), {
			wrapper,
		});

		await result.current.mutateAsync({ id: "session-A", isCurrent: true });

		// Guard skipped the optimistic write because there was no cached list.
		expect(setSpy).not.toHaveBeenCalled();
		expect(queryClient.getQueryData(sessionKeys.all)).toBeUndefined();
	});
});
