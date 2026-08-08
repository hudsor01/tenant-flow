/**
 * Production fixtures for the Phase 66 application specs (plan 66-17).
 *
 * WHY THIS FILE EXISTS AND WHAT IT IS ALLOWED TO WRITE.
 *
 * The E2E suite authenticates against PRODUCTION Supabase (the `e2e-smoke` job
 * passes the real `NEXT_PUBLIC_SUPABASE_URL` and the synthetic owner's
 * credentials), and it holds NO service-role key. That combination sets a hard
 * boundary on what these specs may create:
 *
 *   - `rental_application_links` ships a SELECT policy and NOTHING ELSE (plan
 *     66-01). There is no DELETE policy and no delete RPC for any role, so a link
 *     row this suite creates can be revoked but can NEVER be removed. Therefore
 *     link creation is REUSE-FIRST and bounded: at most one active link and at
 *     most one dead link exist for all time, and every later run finds and reuses
 *     them. Creating a fresh link per run would accumulate permanent rows in a
 *     production table on every PR.
 *   - `rental_applications` DOES have an owner DELETE policy
 *     (`rental_applications_delete`), so an application this suite submits is
 *     fully reversible and is deleted in teardown along with the owner
 *     notification the RPC raises.
 *
 * NOTHING HERE RUNS IN A BROWSER. The `public` Playwright project pins
 * `storageState: { cookies: [], origins: [] }`, which constrains the BROWSER, not
 * the Node test process. Seeding therefore signs in over the Supabase REST API
 * from Node and hands the spec a raw token; the browser still visits
 * `/apply/<token>` with no cookies at all, which is the point of the surface.
 *
 * EVERY FAILURE PATH RETURNS `null` WITH A REASON RATHER THAN THROWING. A missing
 * credential, a missing unit, an undeployed Edge Function or a capped link must
 * SKIP the dependent assertions, not fail them — the same probe-and-skip
 * discipline `lease-signing-tokens.rls.test.ts` uses for its deploy gate. The
 * reason string is surfaced by the caller so a skip is never silent.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** The RPC clamps to [1, 365]; §C gives the owner no expiry control. */
const LINK_EXPIRY_DAYS = 60;

/** Bounded reads only (CLAUDE.md: every list query carries a limit). */
const LINK_LIMIT = 200;
const UNIT_LIMIT = 25;

/**
 * The trap field name, read from the same constant the Edge Function reads it
 * from rather than retyped. Importing the Deno leaf module into a Playwright
 * spec would drag a `supabase/functions` path through the e2e tsconfig for one
 * string, so it is mirrored here and pinned by 66-02's own constant test.
 */
const HONEYPOT_FIELD = "company_website";

export interface SeedCredentials {
	url: string;
	key: string;
	email: string;
	password: string;
}

export interface ApplicationLinkFixture {
	id: string;
	unitId: string;
	rawToken: string;
}

/** A raw PostgREST row, before it passes a mapper. */
type RawRow = Record<string, unknown>;

function readString(raw: RawRow, field: string): string | null {
	const value = raw[field];
	return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Credentials for the seeding client.
 *
 * The email default MIRRORS `auth-helpers.ts` exactly. The owner spec logs the
 * BROWSER in through `loginAsOwner` while this module seeds through the REST
 * API, and if the two resolved different accounts the seeded rows would be
 * invisible to the page under RLS and every assertion would skip for a reason
 * nobody could see.
 */
export function readSeedCredentials(): SeedCredentials | null {
	const url =
		process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.TEST_SUPABASE_PUBLISHABLE_KEY ??
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	const email = process.env.E2E_OWNER_EMAIL ?? "test-admin@tenantflow.app";
	const rawPassword = process.env.E2E_OWNER_PASSWORD;
	if (!url || !key || !rawPassword) return null;
	// Same unescaping `loginAsOwner` applies, for the same reason: the secret is
	// stored shell-escaped.
	return { url, key, email, password: rawPassword.replace(/\\!/g, "!") };
}

/** Signs the seeding client in. `null` on any auth failure — never a throw. */
export async function signInAsOwner(
	credentials: SeedCredentials,
): Promise<SupabaseClient | null> {
	const client = createClient(credentials.url, credentials.key, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
	const { error } = await client.auth.signInWithPassword({
		email: credentials.email,
		password: credentials.password,
	});
	return error ? null : client;
}

/**
 * Probe whether the public `apply-token` Edge Function is deployed.
 *
 * Fail-CLOSED on a throw, copied from `isApplyFunctionDeployed` in
 * `rental-applications.rls.test.ts`: a probe that dies on DNS or a timeout skips
 * the dependent tests rather than false-failing them. A gateway 404 whose body
 * carries `code: "NOT_FOUND"` is the only response that means "not deployed" —
 * every other 404 comes from the function itself.
 */
export async function isApplyFunctionDeployed(
	baseUrl: string,
): Promise<boolean> {
	try {
		const probe = await fetch(`${baseUrl}/functions/v1/apply-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "context", token: "not-a-real-token" }),
		});
		if (probe.status === 404) {
			const body = (await probe.json().catch(() => ({}))) as { code?: string };
			return body.code !== "NOT_FOUND";
		}
		return true;
	} catch {
		return false;
	}
}

interface LinkRow {
	id: string;
	unitId: string;
	rawToken: string;
	expiresAt: string;
	revokedAt: string | null;
}

/**
 * Typed PostgREST boundary (CLAUDE.md). A row missing any NOT NULL column is
 * DROPPED rather than coerced: this module only ever needs *a* usable link, so a
 * malformed row must not become a fixture that fails a geometry assertion for a
 * reason that has nothing to do with geometry.
 */
function mapLinkRow(raw: RawRow): LinkRow | null {
	const id = readString(raw, "id");
	const unitId = readString(raw, "unit_id");
	const rawToken = readString(raw, "raw_token");
	const expiresAt = readString(raw, "expires_at");
	if (!id || !unitId || !rawToken || !expiresAt) return null;
	const revoked = raw.revoked_at;
	return {
		id,
		unitId,
		rawToken,
		expiresAt,
		revokedAt: typeof revoked === "string" ? revoked : null,
	};
}

function isActive(row: LinkRow, now: number): boolean {
	if (row.revokedAt !== null) return false;
	const expires = Date.parse(row.expiresAt);
	// An unparseable timestamp fails closed, matching `applicationLinkState`.
	return Number.isFinite(expires) && expires > now;
}

async function readLinks(client: SupabaseClient): Promise<LinkRow[]> {
	const { data } = await client
		.from("rental_application_links")
		.select("id,unit_id,raw_token,expires_at,revoked_at")
		.order("created_at", { ascending: false })
		.limit(LINK_LIMIT);
	const rows: RawRow[] = Array.isArray(data) ? (data as RawRow[]) : [];
	return rows.flatMap((row) => {
		const mapped = mapLinkRow(row);
		return mapped ? [mapped] : [];
	});
}

async function readUnitIds(client: SupabaseClient): Promise<string[]> {
	const { data } = await client.from("units").select("id").limit(UNIT_LIMIT);
	const rows: RawRow[] = Array.isArray(data) ? (data as RawRow[]) : [];
	return rows.flatMap((row) => {
		const id = readString(row, "id");
		return id ? [id] : [];
	});
}

/** `null` when the RPC refuses (already-active link, unit not found, no auth). */
async function createLink(
	client: SupabaseClient,
	unitId: string,
): Promise<ApplicationLinkFixture | null> {
	const { data, error } = await client.rpc("create_application_link", {
		p_unit_id: unitId,
		p_expires_days: LINK_EXPIRY_DAYS,
	});
	if (error) return null;
	const row: RawRow | undefined = Array.isArray(data)
		? (data[0] as RawRow | undefined)
		: undefined;
	if (!row) return null;
	const id = readString(row, "link_id");
	const rawToken = readString(row, "raw_token");
	return id && rawToken ? { id, unitId, rawToken } : null;
}

export interface ApplyTokenFixtures {
	/** A link in a usable state — the form renders against this one. */
	active: ApplicationLinkFixture | null;
	/**
	 * A REAL link row in a permanently dead state. E-10 compares this render
	 * against a garbage token, which is only a non-enumeration proof when one
	 * side is a row that genuinely exists.
	 */
	dead: ApplicationLinkFixture | null;
	/** Non-null whenever either fixture is missing. Surfaced in the skip. */
	reason: string | null;
}

/**
 * Resolve both link fixtures, creating AT MOST what is missing.
 *
 * THE DEAD LINK IS RESOLVED FIRST, and the order is load-bearing. The RPC
 * refuses while an active link already exists for a unit, so on a first run
 * against an owner with a single unit the only way to end with BOTH fixtures is
 * to mint the dead one, revoke it (a revoked link does not block creation), and
 * then mint the active one on the same unit. Resolving the active one first
 * would leave the dead one unobtainable and silently skip E-10 forever.
 *
 * `expires_at` is NOT backdated to produce the dead state, because there is no
 * UPDATE policy on this table for any role and the RPC clamps `p_expires_days`
 * to a minimum of one day. Revocation is the only dead state an authenticated
 * owner can actually produce, and it carries the same non-enumeration property:
 * `get_application_context` collapses invalid, expired, revoked and unit-deleted
 * into one shape, so a revoked row is exactly the "real token in a dead state"
 * E-10 needs to contrast against a token that never existed.
 */
export async function ensureApplyTokens(
	client: SupabaseClient,
): Promise<ApplyTokenFixtures> {
	const units = await readUnitIds(client);
	if (units.length === 0) {
		return {
			active: null,
			dead: null,
			reason: "the synthetic owner has no units, so no link can be minted",
		};
	}

	const now = Date.now();
	let links = await readLinks(client);

	const toFixture = (row: LinkRow): ApplicationLinkFixture => ({
		id: row.id,
		unitId: row.unitId,
		rawToken: row.rawToken,
	});

	const freeUnit = (): string | undefined => {
		const taken = new Set(
			links.filter((row) => isActive(row, now)).map((row) => row.unitId),
		);
		return units.find((unitId) => !taken.has(unitId));
	};

	const existingDead = links.find((row) => !isActive(row, now));
	let deadFixture: ApplicationLinkFixture | null = existingDead
		? toFixture(existingDead)
		: null;

	if (!deadFixture) {
		const unitId = freeUnit();
		if (unitId) {
			const minted = await createLink(client, unitId);
			if (minted) {
				const { error } = await client.rpc("revoke_application_link", {
					p_link_id: minted.id,
				});
				// A minted-but-unrevoked link is still ACTIVE and must not be reported
				// as dead — that would make E-10 compare two renders of the same state.
				if (!error) deadFixture = minted;
				links = await readLinks(client);
			}
		}
	}

	// `links` was re-read above whenever a link was minted, so this `find` sees
	// the row that dead-link resolution just revoked rather than a stale snapshot.
	const existingActive = links.find((row) => isActive(row, now));
	let activeFixture: ApplicationLinkFixture | null = existingActive
		? toFixture(existingActive)
		: null;

	if (!activeFixture) {
		const unitId = freeUnit();
		if (unitId) activeFixture = await createLink(client, unitId);
	}

	const missing: string[] = [];
	if (!activeFixture) missing.push("an active link");
	if (!deadFixture) missing.push("a dead (revoked) link");

	return {
		active: activeFixture,
		dead: deadFixture,
		reason:
			missing.length === 0
				? null
				: `could not resolve ${missing.join(" and ")} for the synthetic owner`,
	};
}

export interface SeededApplication {
	id: string;
	/** True only when THIS run inserted it, which is what teardown keys on. */
	seeded: boolean;
}

/** The D-05 field contract, exactly as `parseSubmissionPayload` expects it. */
function applicationPayload(tag: string): Record<string, unknown> {
	return {
		first_name: "E2E",
		last_name: "Fixture",
		email: `${tag}@example.com`,
		phone: "555-010-0100",
		desired_move_in_date: "2027-01-01",
		current_street: "1 Test St",
		current_city: "Testville",
		current_state: "TX",
		current_postal_code: "75001",
		gross_monthly_income: 5000,
		occupant_count: 2,
		reference_1_name: "Reference One",
		reference_1_phone: "555-010-0101",
		certified: true,
	};
}

/**
 * Give the owner queue at least one row.
 *
 * REUSE-FIRST, and not merely as an optimisation. Every submit permanently
 * increments `rental_application_links.submission_count` toward the fail-closed
 * lifetime cap of 250, and that counter has no decrement path. Reusing any
 * application the owner already holds means a suite that runs on every PR
 * consumes the cap at most once rather than once per run.
 *
 * Rows converted to a tenant are excluded: `/applications/[id]` swaps the
 * conversion link for "View tenant" once `converted_tenant_id` is set, so E-21
 * would have no href to assert.
 */
export async function ensureApplication(
	client: SupabaseClient,
	baseUrl: string,
	activeToken: string,
): Promise<{ application: SeededApplication | null; reason: string | null }> {
	const { data } = await client
		.from("rental_applications")
		.select("id,converted_tenant_id")
		.is("converted_tenant_id", null)
		.order("created_at", { ascending: false })
		.limit(5);
	const existing: RawRow[] = Array.isArray(data) ? (data as RawRow[]) : [];
	for (const row of existing) {
		const id = readString(row, "id");
		if (id) return { application: { id, seeded: false }, reason: null };
	}

	if (!(await isApplyFunctionDeployed(baseUrl))) {
		return {
			application: null,
			reason: "the apply-token Edge Function is not deployed",
		};
	}

	const submissionId = crypto.randomUUID();
	const response = await fetch(`${baseUrl}/functions/v1/apply-token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			action: "submit",
			token: activeToken,
			submission_id: submissionId,
			// Comfortably past MIN_ELAPSED_MS (3s) and far inside MAX_ELAPSED_MS
			// (24h). A machine-fast elapsed time returns an ordinary 200 with ZERO
			// rows written, which would leave this helper reporting success against
			// an empty queue.
			form_loaded_at: Date.now() - 10_000,
			[HONEYPOT_FIELD]: "",
			application: applicationPayload(`e2e-apply-${Date.now()}`),
		}),
	}).catch(() => null);

	if (!response) {
		return { application: null, reason: "the apply-token submit call failed" };
	}
	const body = (await response.json().catch(() => ({}))) as {
		success?: boolean;
		reason?: string;
	};
	if (body.success !== true) {
		return {
			application: null,
			reason: `apply-token refused the seed submission (${body.reason ?? "unknown"})`,
		};
	}

	const { data: written } = await client
		.from("rental_applications")
		.select("id")
		.eq("submission_id", submissionId)
		.limit(1);
	const writtenRows: RawRow[] = Array.isArray(written)
		? (written as RawRow[])
		: [];
	const firstRow = writtenRows[0];
	const id = firstRow ? readString(firstRow, "id") : null;
	if (!id) {
		// A 200 with no row is the honeypot/timing branch answering success. Say so
		// rather than reporting a fixture that does not exist.
		return {
			application: null,
			reason: "apply-token answered success but wrote no row",
		};
	}
	return { application: { id, seeded: true }, reason: null };
}

/**
 * Remove ONLY what this run created. A reused row belongs to the account, not to
 * the suite, and deleting it would destroy a fixture every later run depends on.
 *
 * The notification goes first: `create_notification` fires inside the submit RPC
 * and nothing cascades from `rental_applications` to it, so deleting the
 * application alone leaves an orphan pointing at a dead id.
 */
export async function removeSeededApplication(
	client: SupabaseClient,
	application: SeededApplication | null,
): Promise<void> {
	if (!application || !application.seeded) return;
	await client.from("notifications").delete().eq("entity_id", application.id);
	await client.from("rental_applications").delete().eq("id", application.id);
}
