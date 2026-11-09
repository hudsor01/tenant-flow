/**
 * @vitest-environment jsdom
 * "Sign out" against the real auth-js (66.2-39 fix round 4, Part 8k).
 *
 * Nothing here is mocked between the app and the network: the hook and the
 * `/auth/signout` page run the app's own `createClient()` (`@supabase/ssr`'s
 * browser client and auth-js 2.118.0), which keeps the session in
 * `document.cookie`, and only `fetch` is a stub that answers in this process.
 * The session is synthetic; no request leaves the test.
 *
 * With one `scope: "global"` request, a failed request had already removed
 * the browser's session (`_signOut` does on any error other than 401/403/404
 * unless the scope is `others`), and the page then said "You have been signed
 * out successfully" while every other session stayed open. The sign-out is
 * now `others`, then `local`.
 */

import {
	onlineManager,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import {
	act,
	cleanup,
	render,
	renderHook,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toastError, router } = vi.hoisted(() => ({
	toastError: vi.fn(),
	router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
}));
vi.mock("sonner", () => ({
	toast: { error: toastError, success: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import SignOutPage from "#app/auth/signout/page";
import { AuthStoreProvider } from "#providers/auth-provider";
import { sessionKeys, type UserSession } from "../query-keys/session-keys";
import {
	SignOutIncompleteError,
	useSignOutMutation,
} from "../use-auth-mutations";
import { useRevokeSessionMutation } from "../use-sessions";

// The app's browser client keys its cookie on the project ref, the URL's first
// label: http://localhost:54321 (src/test/unit-setup.ts) gives "localhost".
const COOKIE = "sb-localhost-auth-token";

const b64url = (value: unknown) =>
	btoa(JSON.stringify(value))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

const USER = {
	id: "00000000-0000-4000-8000-000000000001",
	aud: "authenticated",
	role: "authenticated",
	email: "owner@example.com",
	app_metadata: {},
	user_metadata: {},
	created_at: "2026-01-01T00:00:00Z",
};

function seedSession() {
	const exp = Math.floor(Date.now() / 1000) + 3600;
	const accessToken = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({
		sub: USER.id,
		exp,
		aud: "authenticated",
		role: "authenticated",
		session_id: "00000000-0000-4000-8000-0000000000aa",
	})}.c2lnbmF0dXJl`;
	const session = {
		access_token: accessToken,
		refresh_token: "synthetic-refresh",
		expires_in: 3600,
		expires_at: exp,
		token_type: "bearer",
		user: USER,
	};
	// @supabase/ssr's cookie encoding: "base64-" + base64url(JSON).
	document.cookie = `${COOKIE}=base64-${b64url(session)}; path=/`;
}

const hasSession = () =>
	document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`));

type Answer = "ok" | "500" | "offline";
let calls: string[] = [];
/** How each logout request is answered, in order, whatever its scope (then "ok"). */
let answers: Answer[];
/** How each revoke_user_session RPC is answered, in order (then "ok"). */
let rpcAnswers: Answer[];
/**
 * How GET /auth/v1/user is answered: the user, GoTrue's answer for a JWT
 * whose session no longer exists (403 `session_not_found`), one for a JWT it
 * rejects (401 `bad_jwt`), or a 500.
 */
let userAnswer: "ok" | "403-session-not-found" | "401-bad-jwt" | "500";

function stubFetch() {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? "GET";
			calls.push(`${method} ${url.pathname}${url.search}`);
			if (url.pathname === "/auth/v1/logout") {
				const answer = answers.shift() ?? "ok";
				if (answer === "offline") throw new TypeError("Failed to fetch");
				if (answer === "500") {
					return new Response(
						JSON.stringify({ code: 500, msg: "server error" }),
						{ status: 500, headers: { "content-type": "application/json" } },
					);
				}
				return new Response(null, { status: 204 });
			}
			if (url.pathname === "/rest/v1/rpc/revoke_user_session") {
				const answer = rpcAnswers.shift() ?? "ok";
				if (answer === "offline") throw new TypeError("Failed to fetch");
				if (answer === "500") {
					return new Response(
						JSON.stringify({ code: "XX000", message: "server error" }),
						{ status: 500, headers: { "content-type": "application/json" } },
					);
				}
				return new Response(null, { status: 204 });
			}
			if (url.pathname === "/auth/v1/user" && userAnswer !== "ok") {
				const [status, code, msg] =
					userAnswer === "403-session-not-found"
						? [
								403,
								"session_not_found",
								"Session from session_id claim in JWT does not exist",
							]
						: userAnswer === "401-bad-jwt"
							? [
									401,
									"bad_jwt",
									"invalid JWT: unable to parse or verify signature",
								]
							: [500, "unexpected_failure", "server error"];
				return new Response(
					JSON.stringify({ code: status, error_code: code, msg }),
					{
						status,
						headers: {
							"content-type": "application/json",
							"x-supabase-api-version": "2024-01-01",
						},
					},
				);
			}
			if (url.pathname === "/auth/v1/user") {
				return new Response(JSON.stringify(USER), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}
			return new Response("{}", {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}),
	);
}

const logouts = () => calls.filter((c) => c.includes("/auth/v1/logout"));

function newClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
}

function renderSignOut(options?: { toastOnError?: boolean }) {
	const queryClient = newClient();
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	return renderHook(() => useSignOutMutation(options), { wrapper });
}

beforeEach(() => {
	calls = [];
	answers = [];
	rpcAnswers = [];
	userAnswer = "ok";
	// Node's BroadcastChannel keeps the worker alive; auth-js skips it when absent.
	vi.stubGlobal("BroadcastChannel", undefined);
	stubFetch();
	seedSession();
	toastError.mockClear();
	router.push.mockClear();
	router.replace.mockClear();
});

afterEach(() => {
	cleanup();
	onlineManager.setOnline(true);
	document.cookie = `${COOKIE}=; path=/; max-age=0`;
	vi.unstubAllGlobals();
});

describe("useSignOutMutation, with the real auth-js", () => {
	it("a failing first request keeps the session and throws, and a retry sends again", async () => {
		answers = ["500", "500"];
		const { result } = renderSignOut();

		await act(async () => {
			await expect(result.current.mutateAsync()).rejects.toMatchObject({
				name: "AuthRetryableFetchError",
			});
		});
		expect(logouts()).toEqual(["POST /auth/v1/logout?scope=others"]);
		expect(hasSession()).toBe(true);

		await act(async () => {
			await expect(result.current.mutateAsync()).rejects.toMatchObject({
				name: "AuthRetryableFetchError",
			});
		});
		expect(logouts()).toEqual([
			"POST /auth/v1/logout?scope=others",
			"POST /auth/v1/logout?scope=others",
		]);
		expect(hasSession()).toBe(true);
	});

	it("success sends scope=others, then scope=local, and removes the session", async () => {
		const { result } = renderSignOut();

		await act(async () => {
			await result.current.mutateAsync();
		});
		expect(logouts()).toEqual([
			"POST /auth/v1/logout?scope=others",
			"POST /auth/v1/logout?scope=local",
		]);
		expect(hasSession()).toBe(false);
	});

	// Part 8l: one GET /auth/v1/user before the logouts asks whether the
	// server still accepts this browser's session.
	it("asks the server for the user first, then sends the two logouts", async () => {
		const { result } = renderSignOut();

		await act(async () => {
			await result.current.mutateAsync();
		});
		expect(calls).toEqual([
			"GET /auth/v1/user",
			"POST /auth/v1/logout?scope=others",
			"POST /auth/v1/logout?scope=local",
		]);
	});

	it("a session another device already ended (403 session_not_found) is the incomplete outcome, with no logout sent", async () => {
		userAnswer = "403-session-not-found";
		const { result } = renderSignOut();

		await act(async () => {
			await expect(result.current.mutateAsync()).rejects.toBeInstanceOf(
				SignOutIncompleteError,
			);
		});
		// Without the check: others and local both answered 403, which auth-js
		// treats as success, and the owner read "signed out" everywhere.
		expect(logouts()).toEqual([]);
		expect(hasSession()).toBe(false);
		expect(toastError).toHaveBeenCalledWith(
			"Sign out did not finish. This browser was already signed out, so your other devices could not be signed out from here. Sign in and sign out again to end their sessions.",
		);
		expect(router.replace).toHaveBeenCalledTimes(1);
		expect(router.replace).toHaveBeenCalledWith("/login");
	});

	it("a JWT the server rejects (401) is the same outcome, and the rejected session is removed", async () => {
		userAnswer = "401-bad-jwt";
		answers = ["ok"];
		const { result } = renderSignOut();

		await act(async () => {
			await expect(result.current.mutateAsync()).rejects.toMatchObject({
				name: "SignOutIncompleteError",
				detail:
					"This browser was already signed out, so your other devices could not be signed out from here. Sign in and sign out again to end their sessions.",
			});
		});
		expect(logouts()).toEqual(["POST /auth/v1/logout?scope=local"]);
		expect(hasSession()).toBe(false);
		expect(router.replace).toHaveBeenCalledWith("/login");
	});

	it("a getUser() failure that is not an ended session (500) is left to the logouts", async () => {
		userAnswer = "500";
		const { result } = renderSignOut();

		await act(async () => {
			await result.current.mutateAsync();
		});
		expect(logouts()).toEqual([
			"POST /auth/v1/logout?scope=others",
			"POST /auth/v1/logout?scope=local",
		]);
		expect(hasSession()).toBe(false);
	});

	it("a rejected fetch (offline) keeps the session and throws", async () => {
		answers = ["offline"];
		const { result } = renderSignOut();

		await act(async () => {
			await expect(result.current.mutateAsync()).rejects.toMatchObject({
				message: expect.stringContaining("Failed to fetch"),
			});
		});
		expect(logouts()).toEqual(["POST /auth/v1/logout?scope=others"]);
		expect(hasSession()).toBe(true);
	});

	it("a failing second request is SignOutIncompleteError, after auth-js removed the session", async () => {
		answers = ["ok", "500"];
		const { result } = renderSignOut();

		await act(async () => {
			await expect(result.current.mutateAsync()).rejects.toBeInstanceOf(
				SignOutIncompleteError,
			);
		});
		expect(logouts()).toEqual([
			"POST /auth/v1/logout?scope=others",
			"POST /auth/v1/logout?scope=local",
		]);
		expect(hasSession()).toBe(false);
	});

	it("runs offline at once (networkMode always), never paused until the browser is back", async () => {
		answers = ["offline"];
		onlineManager.setOnline(false);
		const { result } = renderSignOut();

		act(() => {
			result.current.mutate();
		});
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.isPaused).toBe(false);
		expect(logouts()).toEqual(["POST /auth/v1/logout?scope=others"]);
		expect(hasSession()).toBe(true);
	});

	it("toasts a failure where the page has no inline error, and only there", async () => {
		answers = ["offline", "offline"];
		const shell = renderSignOut();
		await act(async () => {
			await shell.result.current.mutateAsync().catch(() => {});
		});
		expect(toastError).toHaveBeenCalledWith(
			"Sign out failed. Check your connection and try again.",
		);

		toastError.mockClear();
		const page = renderSignOut({ toastOnError: false });
		await act(async () => {
			await page.result.current.mutateAsync().catch(() => {});
		});
		expect(toastError).not.toHaveBeenCalled();
	});

	it("toasts the incomplete sign-out with what ended and how to end the rest", async () => {
		answers = ["ok", "offline"];
		const { result } = renderSignOut();
		await act(async () => {
			await result.current.mutateAsync().catch(() => {});
		});
		expect(toastError).toHaveBeenCalledWith(
			"Sign out did not finish. You are signed out of this browser, but its session may still be open on our server. Sign in again and end it under Active Sessions in Settings.",
		);
	});
});

describe("/auth/signout, with the real auth-js and AuthProvider", () => {
	function renderPage() {
		const queryClient = newClient();
		return render(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(AuthStoreProvider, null, createElement(SignOutPage)),
			),
		);
	}

	async function pressSignOut(name: RegExp) {
		await userEvent.click(await screen.findByRole("button", { name }));
	}

	it("a failed first request shows the error, keeps the session, and Try Again sends again", async () => {
		answers = ["offline", "offline"];
		renderPage();
		await pressSignOut(/^sign out$/i);

		expect(
			await screen.findByText(
				"Sign out failed — check your connection and try again.",
			),
		).toBeInTheDocument();
		expect(hasSession()).toBe(true);
		expect(screen.queryByText("Signed Out")).toBeNull();

		await pressSignOut(/^try again$/i);
		await waitFor(() =>
			expect(logouts()).toEqual([
				"POST /auth/v1/logout?scope=others",
				"POST /auth/v1/logout?scope=others",
			]),
		);
		expect(screen.queryByText("Signed Out")).toBeNull();
	});

	it("a failed second request never says Signed Out, though auth-js removed the session", async () => {
		answers = ["ok", "500"];
		renderPage();
		await pressSignOut(/^sign out$/i);

		expect(
			await screen.findByText("Sign out did not finish"),
		).toBeInTheDocument();
		expect(hasSession()).toBe(false);
		// AuthProvider's SIGNED_OUT handler dropped the page's session check,
		// which refetched as null; the page still does not claim a sign-out.
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});
		expect(screen.queryByText("Signed Out")).toBeNull();
		expect(
			screen.queryByText("You have been signed out successfully."),
		).toBeNull();
		expect(screen.getByRole("button", { name: /^sign in$/i })).toBeVisible();
	});

	it("a session ended on the server after the page loaded says so in the page, never Signed Out", async () => {
		renderPage();
		const button = await screen.findByRole("button", { name: /^sign out$/i });
		userAnswer = "403-session-not-found";
		await userEvent.click(button);

		expect(
			await screen.findByText(
				"This browser was already signed out, so your other devices could not be signed out from here. Sign in and sign out again to end their sessions.",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Sign out did not finish")).toBeInTheDocument();
		expect(screen.queryByText("Signed Out")).toBeNull();
		expect(logouts()).toEqual([]);
		expect(hasSession()).toBe(false);
		expect(router.replace).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: /^sign in$/i })).toBeVisible();
	});

	it("an arrival whose session already ended reads as signed out on this browser, and claims nothing else", async () => {
		userAnswer = "403-session-not-found";
		renderPage();

		// AuthProvider's own getUser() met the 403 and auth-js removed the
		// session, so the page's session check reads none.
		expect(await screen.findByText("Signed Out")).toBeInTheDocument();
		expect(
			screen.getByText("You are not signed in on this browser."),
		).toBeInTheDocument();
		expect(hasSession()).toBe(false);
		expect(logouts()).toEqual([]);
	});

	// Part 8l: a success lands on /login at once, once; no timer.
	it("success lands on /login once", async () => {
		renderPage();
		await pressSignOut(/^sign out$/i);

		await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
		expect(router.replace).toHaveBeenCalledTimes(1);
		expect(router.push).not.toHaveBeenCalled();
		expect(logouts()).toEqual([
			"POST /auth/v1/logout?scope=others",
			"POST /auth/v1/logout?scope=local",
		]);
		expect(hasSession()).toBe(false);
	});
});

// The session row's "Sign out this device" (use-sessions.ts, Part 8l). Its
// own row signs out with `scope: "local"`, which auth-js 2.118.0 answers on
// failure by removing this browser's session anyway; another row's revoke is
// an RPC that touches nothing in this browser.
describe("the session row's Sign out this device, with the real auth-js", () => {
	const CURRENT = "00000000-0000-4000-8000-0000000000aa";
	const OTHER = "00000000-0000-4000-8000-0000000000bb";

	function row(id: string, isCurrent: boolean): UserSession {
		return {
			id,
			user_id: USER.id,
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

	function renderRevoke() {
		// The session list stays cached (no observer here), as the row's list
		// does while Settings shows it.
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
				mutations: { retry: false },
			},
		});
		queryClient.setQueryData<UserSession[]>(sessionKeys.all, [
			row(CURRENT, true),
			row(OTHER, false),
		]);
		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client: queryClient }, children);
		return {
			queryClient,
			...renderHook(() => useRevokeSessionMutation(), { wrapper }),
		};
	}

	it("a failed sign-out of this device clears the session, shows the incomplete outcome and lands on /login", async () => {
		answers = ["500"];
		const { result, queryClient } = renderRevoke();

		await act(async () => {
			await expect(
				result.current.mutateAsync({ id: CURRENT, isCurrent: true }),
			).rejects.toBeInstanceOf(SignOutIncompleteError);
		});
		expect(logouts()).toEqual(["POST /auth/v1/logout?scope=local"]);
		expect(hasSession()).toBe(false);
		expect(toastError).toHaveBeenCalledWith(
			"Sign out did not finish. You are signed out of this browser, but its session may still be open on our server. Sign in again and end it under Active Sessions in Settings.",
		);
		expect(router.replace).toHaveBeenCalledTimes(1);
		expect(router.replace).toHaveBeenCalledWith("/login");
		// No row comes back to offer a retry that cannot work.
		expect(
			queryClient
				.getQueryData<UserSession[]>(sessionKeys.all)
				?.map((s) => s.id),
		).toEqual([OTHER]);
	});

	// Part 8l: offline it runs at once (networkMode always), never paused until
	// the browser is back, when the session would have ended unasked.
	it("runs offline at once: this device's row fails to the incomplete outcome", async () => {
		answers = ["offline"];
		onlineManager.setOnline(false);
		const { result } = renderRevoke();

		act(() => {
			result.current.mutate({ id: CURRENT, isCurrent: true });
		});
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.isPaused).toBe(false);
		expect(result.current.error).toBeInstanceOf(SignOutIncompleteError);
		expect(logouts()).toEqual(["POST /auth/v1/logout?scope=local"]);
		expect(hasSession()).toBe(false);
		expect(router.replace).toHaveBeenCalledWith("/login");
	});

	it("a failed revoke of another session keeps this one, restores its row, and a retry sends again", async () => {
		rpcAnswers = ["500"];
		const { result, queryClient } = renderRevoke();

		await act(async () => {
			await expect(
				result.current.mutateAsync({ id: OTHER, isCurrent: false }),
			).rejects.toMatchObject({ message: "server error" });
		});
		const rpcCalls = () =>
			calls.filter((c) => c.includes("revoke_user_session"));
		expect(rpcCalls()).toEqual(["POST /rest/v1/rpc/revoke_user_session"]);
		expect(logouts()).toEqual([]);
		expect(hasSession()).toBe(true);
		expect(router.replace).not.toHaveBeenCalled();
		expect(
			queryClient
				.getQueryData<UserSession[]>(sessionKeys.all)
				?.map((s) => s.id),
		).toEqual([CURRENT, OTHER]);

		await act(async () => {
			await result.current.mutateAsync({ id: OTHER, isCurrent: false });
		});
		expect(rpcCalls()).toEqual([
			"POST /rest/v1/rpc/revoke_user_session",
			"POST /rest/v1/rpc/revoke_user_session",
		]);
		expect(hasSession()).toBe(true);
	});
});
