/**
 * E2E Authentication Helpers - API-Based Authentication
 *
 * ARCHITECTURE: Uses Supabase REST API for authentication instead of UI login
 *
 * WHY API-BASED:
 * 1. Playwright 1.53+ has fill() regressions with React controlled inputs
 * 2. UI login is fragile due to React hydration timing
 * 3. API login is 10x faster (~200ms vs ~3s)
 * 4. More reliable - no DOM interaction issues
 *
 * HOW IT WORKS:
 * 1. Call Supabase /auth/v1/token endpoint directly
 * 2. Get access_token, refresh_token, user data
 * 3. Inject the session as @supabase/ssr cookies on the browser context
 * 4. Navigate to protected pages (the cookies carry the session)
 *
 * REFERENCES:
 * - https://playwright.dev/docs/auth
 * - https://mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test
 * - https://supabase.com/docs/guides/auth/sessions
 */

import { type Page } from "@playwright/test";
import { createLogger } from "./lib/frontend-logger";

// Extract Supabase configuration from environment variables
// No more hardcoded project refs!
function getSupabaseConfig(): {
	supabaseUrl: string;
	supabaseKey: string;
	projectRef: string;
} {
	const supabaseUrl =
		process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey =
		process.env.TEST_SUPABASE_PUBLISHABLE_KEY ||
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!supabaseUrl) {
		throw new Error(
			"Missing Supabase URL. Set TEST_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable.",
		);
	}
	if (!supabaseKey) {
		throw new Error(
			"Missing Supabase key. Set TEST_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable.",
		);
	}

	// Extract project ref from URL (e.g., https://abc123.supabase.co -> abc123)
	const url = new URL(supabaseUrl);
	const hostnameParts = url.hostname.split(".");
	const projectRef = hostnameParts[0];
	if (!projectRef) {
		throw new Error(`Invalid Supabase URL: ${supabaseUrl}`);
	}

	return { supabaseUrl, supabaseKey, projectRef };
}

// Lazy-loaded config (initialized on first use)
let _config: {
	supabaseUrl: string;
	supabaseKey: string;
	projectRef: string;
} | null = null;
function getConfig() {
	if (!_config) {
		_config = getSupabaseConfig();
	}
	return _config!;
}

const logger = createLogger({ component: "AuthHelpers" });

// Worker-level session cache (isolated per worker process)
const sessionCache = new Map<string, SupabaseSession>();

// Debug logging helper
const debugLog = (message: string, ...rest: string[]) => {
	if (!process.env.DEBUG) return;
	if (rest.length > 0) {
		logger.debug(message, undefined, ...rest);
	} else {
		logger.debug(message);
	}
};

interface SupabaseSession {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	expires_at: number;
	token_type: string;
	user: {
		id: string;
		email: string;
		app_metadata: Record<string, unknown>;
		user_metadata: Record<string, unknown>;
	};
}

interface LoginOptions {
	email?: string;
	password?: string;
	forceLogin?: boolean; // Skip cache, force fresh login
}

/**
 * Authenticate via Supabase REST API
 *
 * Calls the /auth/v1/token endpoint directly to get session tokens.
 * This is much faster and more reliable than UI-based login.
 */
async function authenticateViaAPI(
	email: string,
	password: string,
): Promise<SupabaseSession> {
	const config = getConfig();
	const { supabaseUrl, supabaseKey } = config;

	const response = await fetch(
		`${supabaseUrl}/auth/v1/token?grant_type=password`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				apikey: supabaseKey,
				Authorization: `Bearer ${supabaseKey}`,
			},
			body: JSON.stringify({ email, password }),
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(
			`Supabase auth failed: ${error.error_description || error.message || response.statusText}`,
		);
	}

	const data = (await response.json()) as SupabaseSession;
	// Validate the fields the @supabase/ssr cookie + the proxy's getUser() depend
	// on, so a malformed token response fails with an actionable error instead of
	// a confusing downstream /login redirect.
	if (!data.access_token || !data.refresh_token || data.expires_at == null) {
		throw new Error(
			"Supabase token response missing required session fields (access_token / refresh_token / expires_at)",
		);
	}
	return data;
}

/**
 * Supabase SSR cookie chunking constants (from @supabase/ssr/src/utils/chunker.ts)
 */
const MAX_CHUNK_SIZE = 3180;

/**
 * Base64URL encode per RFC 4648 with "base64-" prefix
 * This is what @supabase/ssr expects in cookies
 * @see https://github.com/supabase/ssr/blob/main/src/utils/base64url.ts
 */
function toBase64UrlWithPrefix(jsonValue: string): string {
	// Node.js Buffer works in both Node and modern browsers via bundlers
	// Use btoa for browser compatibility
	const base64 =
		typeof Buffer !== "undefined"
			? Buffer.from(jsonValue).toString("base64")
			: btoa(jsonValue);

	// Convert to Base64URL: +→-, /→_, no padding
	const base64Url = base64
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");

	return `base64-${base64Url}`;
}

/**
 * Create chunks matching Supabase SSR format
 * - Base64URL encode with "base64-" prefix
 * - If encoded value ≤ MAX_CHUNK_SIZE: single cookie with key name (no suffix)
 * - If larger: multiple cookies with .0, .1, .2 suffixes
 */
function createCookieChunks(
	key: string,
	sessionJson: string,
): Array<{ name: string; value: string }> {
	// Encode session as Base64URL with prefix (matching @supabase/ssr format)
	const encodedValue = toBase64UrlWithPrefix(sessionJson);

	// If small enough, return single cookie without suffix
	if (encodedValue.length <= MAX_CHUNK_SIZE) {
		return [{ name: key, value: encodedValue }];
	}

	// Split into numbered chunks
	const chunks: Array<{ name: string; value: string }> = [];
	for (
		let i = 0, chunkIndex = 0;
		i < encodedValue.length;
		i += MAX_CHUNK_SIZE, chunkIndex++
	) {
		chunks.push({
			name: `${key}.${chunkIndex}`,
			value: encodedValue.slice(i, i + MAX_CHUNK_SIZE),
		});
	}

	return chunks;
}

/**
 * Inject the authenticated session into the browser context as @supabase/ssr cookies.
 *
 * This app uses `@supabase/ssr` (`createBrowserClient` with no `cookies` option,
 * see src/lib/supabase/client.ts), so the browser client AND the Next.js proxy
 * read the session from cookies (`document.cookie`) — NOT localStorage. We write
 * the chunked, base64url-prefixed cookies `@supabase/ssr` expects (via
 * createCookieChunks) onto the context, so the caller's first navigation to a
 * protected route carries the session and the proxy lets it through. No page
 * load happens here — the caller navigates to its target page next.
 *
 * (An earlier approach wrote only localStorage — copied from a non-SSR
 * supabase-js blog post — which left the app unauthenticated and redirected
 * protected routes to /login.)
 *
 * @see https://github.com/supabase/ssr (cookie storage adapter)
 */
async function injectSessionIntoBrowser(
	page: import("@playwright/test").Page,
	session: SupabaseSession,
	baseUrl: string,
): Promise<void> {
	const { projectRef } = getConfig();
	const storageKey = `sb-${projectRef}-auth-token`;
	const sessionJson = JSON.stringify(session);

	// Set the chunked @supabase/ssr cookies on the context BEFORE any navigation,
	// so the caller's first request to a protected route carries the session.
	const cookies = createCookieChunks(storageKey, sessionJson).map((chunk) => ({
		name: chunk.name,
		value: chunk.value,
		url: baseUrl,
	}));
	await page.context().addCookies(cookies);
	debugLog(
		` Session written as ${cookies.length} cookie chunk(s): ${storageKey}`,
	);
}

/**
 * Login as property owner via API
 *
 * Uses the same fast API-based approach as loginAsTenant: calls Supabase
 * /auth/v1/token directly then injects the session into the browser context.
 * ~200ms vs ~3s for UI-based login.
 *
 * @param page - Playwright Page instance
 * @param options - Login credentials and cache control
 */
export async function loginAsOwner(page: Page, options: LoginOptions = {}) {
	const email =
		options.email || process.env.E2E_OWNER_EMAIL || "test-admin@tenantflow.app";
	const rawPassword =
		options.password ||
		process.env.E2E_OWNER_PASSWORD ||
		(() => {
			throw new Error("E2E_OWNER_PASSWORD environment variable is required");
		})();
	const password = rawPassword.replace(/\\!/g, "!");
	const cacheKey = `owner:${email}`;

	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3050";

	// Check cache first
	let session = sessionCache.get(cacheKey);

	if (!session || options.forceLogin) {
		debugLog(` Authenticating owner via API: ${email}`);

		try {
			session = await authenticateViaAPI(email, password);
			sessionCache.set(cacheKey, session);
			debugLog(` Owner API authentication successful`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			debugLog(` Owner API authentication failed: ${message}`);
			throw error;
		}
	} else {
		debugLog(` Using cached owner session for: ${email}`);
	}

	// Inject the session as @supabase/ssr cookies onto the browser context
	await injectSessionIntoBrowser(page, session, baseUrl);

	// Navigate to dashboard - the cookie session is carried on this first request
	await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });

	// Wait for auth to stabilize
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
		debugLog(" networkidle timeout, continuing with domcontentloaded");
	});

	// Verify we're not on login page
	const currentUrl = page.url();
	if (currentUrl.includes("/login")) {
		throw new Error(
			`Owner login failed: Redirected to login page. Session may be invalid.`,
		);
	}
	// The proxy applies a subscription gate AFTER auth: an owner whose
	// subscription_status is not 'active'/'trialing' is redirected to /pricing.
	// Fail loudly with an actionable message instead of a confusing downstream
	// timeout (this is the failure mode that broke PR #674's CI).
	if (currentUrl.includes("/pricing")) {
		throw new Error(
			`Owner login succeeded but was redirected to /pricing: the synthetic owner (${email}) failed the subscription gate — pin its public.users.subscription_status to 'active'.`,
		);
	}

	debugLog(` Logged in as owner (${email})`);
}

/**
 * Login as tenant via API
 *
 * @param page - Playwright Page instance
 * @param options - Login credentials and cache control
 */
export async function loginAsTenant(page: Page, options: LoginOptions = {}) {
	const email =
		options.email ||
		process.env.E2E_TENANT_EMAIL ||
		"test-tenant@tenantflow.app";
	const rawPassword =
		options.password ||
		process.env.E2E_TENANT_PASSWORD ||
		(() => {
			throw new Error("E2E_TENANT_PASSWORD environment variable is required");
		})();
	const password = rawPassword.replace(/\\!/g, "!");
	const cacheKey = `tenant:${email}`;

	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3050";

	// Check cache first
	let session = sessionCache.get(cacheKey);

	if (!session || options.forceLogin) {
		debugLog(` Authenticating tenant via API: ${email}`);

		try {
			session = await authenticateViaAPI(email, password);
			sessionCache.set(cacheKey, session);
			debugLog(` Tenant API authentication successful`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			debugLog(` Tenant API authentication failed: ${message}`);
			throw error;
		}
	} else {
		debugLog(` Using cached tenant session for: ${email}`);
	}

	// Inject the session as @supabase/ssr cookies onto the browser context
	await injectSessionIntoBrowser(page, session, baseUrl);

	// Navigate to tenant portal - the cookie session is carried on this first request
	await page.goto(`${baseUrl}/tenant`, { waitUntil: "domcontentloaded" });

	// Wait for auth to stabilize - use shorter timeout and don't fail if networkidle not reached
	// (persistent connections like SSE/WebSocket can prevent networkidle)
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
		debugLog(" networkidle timeout, continuing with domcontentloaded");
	});

	// Verify we're on the tenant page, not redirected to login
	const currentUrl = page.url();
	if (currentUrl.includes("/login")) {
		throw new Error(
			`Tenant login failed: Redirected to login page. Session may be invalid.`,
		);
	}

	debugLog(` Logged in as tenant (${email})`);
}

/**
 * Clear session cache (for logout testing or forced re-login)
 */
export function clearSessionCache() {
	sessionCache.clear();
	debugLog(" Session cache cleared");
}
