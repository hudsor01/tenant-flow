/**
 * Authed get_dashboard_data_v2 fetch helper for the POLISH-09 dashboard smoke.
 *
 * WHY THIS EXISTS:
 * The dashboard-smoke spec asserts that the rendered KPI numbers and the
 * occupancy donut match the LIVE RPC values for the synthetic owner — never
 * hardcoded numbers — so a zero-data (or differently-seeded) owner can never
 * produce a false failure. This helper derives those expected values by calling
 * the SAME `get_dashboard_data_v2` RPC the dashboard UI calls
 * (src/hooks/api/use-owner-dashboard.ts: `rpc("get_dashboard_data_v2",
 * { p_user_id: user.id })`), scoped to the owner via their Bearer token so RLS
 * applies identically to the in-app fetch.
 *
 * It is a PURE Node fetch — it never touches a Playwright `page`. It reuses the
 * same env-var resolution and `/auth/v1/token` password-grant endpoint as
 * `auth-helpers.ts` (intentionally NOT the cookie-chunking path — that is a
 * browser-context concern; here we only need the access_token + user id to call
 * the RPC over REST). A non-2xx token or RPC response throws an actionable error
 * (mirroring the auth-helpers "missing session fields" failure style) so a
 * misconfigured run fails loud instead of as a confusing assertion mismatch.
 */

// Resolve the Supabase URL + publishable key from the SAME env vars
// auth-helpers.ts reads (TEST_* preferred, NEXT_PUBLIC_* fallback).
function resolveSupabaseConfig(): { supabaseUrl: string; supabaseKey: string } {
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
	return { supabaseUrl, supabaseKey };
}

// Resolve the synthetic owner credentials from the SAME env vars auth-helpers
// reads, including the `\!` -> `!` un-escape (the password is shell-escaped in
// CI secrets / .env so a literal `!` survives quoting).
function resolveOwnerCredentials(): { email: string; password: string } {
	const email = process.env.E2E_OWNER_EMAIL || "test-admin@tenantflow.app";
	const rawPassword = process.env.E2E_OWNER_PASSWORD;
	if (!rawPassword) {
		throw new Error("E2E_OWNER_PASSWORD environment variable is required");
	}
	return { email, password: rawPassword.replace(/\\!/g, "!") };
}

/**
 * Narrowed dashboard payload — only the fields the smoke spec asserts on. The
 * mapper below validates every one of these so a contract drift (missing field /
 * wrong type) throws here, not as a misleading DOM-vs-undefined mismatch.
 */
export interface DashboardSmokeData {
	stats: {
		units: {
			total: number;
			occupied: number;
			vacant: number;
			occupancyRate: number;
		};
		revenue: { monthly: number };
		leases: { active: number; expiringSoon: number };
		maintenance: { open: number };
		properties: { total: number };
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Read a required finite number off an unknown record, throwing an actionable
// error on a missing/non-numeric field (defends against silent RPC drift).
function requireNumber(
	source: Record<string, unknown>,
	key: string,
	path: string,
): number {
	const raw = source[key];
	if (typeof raw !== "number" || !Number.isFinite(raw)) {
		throw new Error(
			`get_dashboard_data_v2 returned a missing/invalid number at ${path}.${key} (got: ${JSON.stringify(raw)})`,
		);
	}
	return raw;
}

// Read a required object off an unknown record, throwing on absence so the
// downstream field reads fail with a precise path instead of "cannot read of
// undefined".
function requireObject(
	source: Record<string, unknown>,
	key: string,
	path: string,
): Record<string, unknown> {
	const raw = source[key];
	if (!isRecord(raw)) {
		throw new Error(
			`get_dashboard_data_v2 returned a missing/invalid object at ${path}.${key}`,
		);
	}
	return raw;
}

/**
 * Typed mapper at the RPC boundary (CLAUDE.md: NO `any`, NO `as unknown as`).
 * Narrows the unknown JSON to exactly the fields the smoke spec compares to the
 * DOM; throws on any missing/mistyped field.
 */
function mapDashboardSmokeData(raw: unknown): DashboardSmokeData {
	if (!isRecord(raw)) {
		throw new Error(
			"get_dashboard_data_v2 returned a non-object payload — verify the RPC is deployed and the owner is authenticated",
		);
	}
	const stats = requireObject(raw, "stats", "<root>");
	const units = requireObject(stats, "units", "stats");
	const revenue = requireObject(stats, "revenue", "stats");
	const leases = requireObject(stats, "leases", "stats");
	const maintenance = requireObject(stats, "maintenance", "stats");
	const properties = requireObject(stats, "properties", "stats");

	return {
		stats: {
			units: {
				total: requireNumber(units, "total", "stats.units"),
				occupied: requireNumber(units, "occupied", "stats.units"),
				vacant: requireNumber(units, "vacant", "stats.units"),
				occupancyRate: requireNumber(units, "occupancyRate", "stats.units"),
			},
			revenue: { monthly: requireNumber(revenue, "monthly", "stats.revenue") },
			leases: {
				active: requireNumber(leases, "active", "stats.leases"),
				expiringSoon: requireNumber(leases, "expiringSoon", "stats.leases"),
			},
			maintenance: {
				open: requireNumber(maintenance, "open", "stats.maintenance"),
			},
			properties: {
				total: requireNumber(properties, "total", "stats.properties"),
			},
		},
	};
}

interface TokenResponse {
	access_token: string;
	user: { id: string };
}

function isTokenResponse(value: unknown): value is TokenResponse {
	if (!isRecord(value)) return false;
	const user = value.user;
	return (
		typeof value.access_token === "string" &&
		isRecord(user) &&
		typeof user.id === "string"
	);
}

/**
 * Authenticate the synthetic owner against the Supabase password-grant token
 * endpoint and call `get_dashboard_data_v2` with their Bearer token (so RLS
 * scopes the call to the owner), returning the narrowed payload for DOM
 * comparison. Throws an actionable error on any non-2xx response.
 */
export async function fetchDashboardDataAsOwner(): Promise<DashboardSmokeData> {
	const { supabaseUrl, supabaseKey } = resolveSupabaseConfig();
	const { email, password } = resolveOwnerCredentials();

	// 1) Password-grant token (same endpoint + headers as auth-helpers.ts).
	const tokenResponse = await fetch(
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

	if (!tokenResponse.ok) {
		const detail = await tokenResponse.text();
		throw new Error(
			`fetchDashboardDataAsOwner: Supabase token request failed (${tokenResponse.status}): ${detail}`,
		);
	}

	const tokenJson: unknown = await tokenResponse.json();
	if (!isTokenResponse(tokenJson)) {
		throw new Error(
			"fetchDashboardDataAsOwner: Supabase token response missing required fields (access_token / user.id)",
		);
	}
	const { access_token: accessToken, user } = tokenJson;

	// 2) Call the RPC over REST with the OWNER Bearer token (RLS-scoped),
	//    matching the UI call shape: { p_user_id: user.id }.
	const rpcResponse = await fetch(
		`${supabaseUrl}/rest/v1/rpc/get_dashboard_data_v2`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				apikey: supabaseKey,
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({ p_user_id: user.id }),
		},
	);

	if (!rpcResponse.ok) {
		const detail = await rpcResponse.text();
		throw new Error(
			`fetchDashboardDataAsOwner: get_dashboard_data_v2 RPC failed (${rpcResponse.status}): ${detail}`,
		);
	}

	const rpcJson: unknown = await rpcResponse.json();
	return mapDashboardSmokeData(rpcJson);
}
