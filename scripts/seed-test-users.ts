/**
 * Mint the synthetic test cast into a LOCAL Supabase stack.
 *
 * Replaces supabase/seed.sql, which could never serve this purpose: it creates a
 * different cast (`owner-a@test.com`, `tenant-a@test.com`, `test-admin@…`) that
 * no suite reads, writes auth rows by hand with crypt() and ZERO auth.identities,
 * never sets is_admin or subscription_status, and inserts a `tenants.user_id`
 * column dropped on 2026-06-16 -- so it aborts any reset outright. It references
 * the `e2e-` cast zero times.
 *
 * The suites read E2E_OWNER_{EMAIL,PASSWORD}, E2E_OWNER_B_{EMAIL,PASSWORD} and
 * E2E_ADMIN_{EMAIL,PASSWORD} (tests/integration/rls/*.test.ts,
 * tests/e2e/auth-helpers.ts:273, tests/e2e/dashboard-rpc-helpers.ts:49). This
 * script creates exactly those three identities, so no suite changes.
 *
 * SAFETY: refuses to run against anything but a loopback Supabase URL. The
 * password below is a repo constant on purpose -- it only ever authenticates
 * against a disposable local stack, so there is no credential to rotate, and the
 * "cannot reset the synthetic user's password" problem stops existing.
 *
 *   supabase start
 *   eval "$(supabase status -o env)"   # or pass SUPABASE_URL / SECRET_KEY
 *   bun scripts/seed-test-users.ts
 */

import { createClient } from "@supabase/supabase-js";

const LOCAL_TEST_PASSWORD = "LocalE2E!pw9";

const SUPABASE_URL =
	process.env.API_URL ??
	process.env.NEXT_PUBLIC_SUPABASE_URL ??
	"http://127.0.0.1:54321";
const SECRET_KEY =
	process.env.SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

function assertLocal(url: string): void {
	let host: string;
	try {
		host = new URL(url).hostname;
	} catch {
		throw new Error(`SUPABASE_URL is not a URL: ${url}`);
	}
	const loopback =
		host === "127.0.0.1" ||
		host === "localhost" ||
		host === "[::1]" ||
		host === "::1";
	if (!loopback) {
		throw new Error(
			`refusing to seed test users against non-loopback host "${host}". ` +
				`This script is for a disposable local stack only; it must never touch a hosted project.`,
		);
	}
}

interface SeedUser {
	id: string;
	email: string;
	isAdmin: boolean;
	/** Owner A must stay `active` or the proxy's subscription gate sends e2e to /pricing. */
	subscriptionStatus: "active";
}

// Fixed UUIDs so a reseed is stable and rows can be referenced across runs.
const CAST: SeedUser[] = [
	{
		id: "00000000-0000-4000-8000-00000000000a",
		email: "e2e-owner-a@tenantflow.app",
		isAdmin: false,
		subscriptionStatus: "active",
	},
	{
		id: "00000000-0000-4000-8000-00000000000b",
		email: "e2e-owner-b@tenantflow.app",
		isAdmin: false,
		subscriptionStatus: "active",
	},
	{
		id: "00000000-0000-4000-8000-0000000000ad",
		email: "e2e-admin@tenantflow.app",
		isAdmin: true,
		subscriptionStatus: "active",
	},
];

async function main(): Promise<void> {
	assertLocal(SUPABASE_URL);
	if (!SECRET_KEY) {
		throw new Error(
			'SECRET_KEY is empty. Run `eval "$(supabase status -o env)"` first, or set SUPABASE_SECRET_KEY.',
		);
	}

	const admin = createClient(SUPABASE_URL, SECRET_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	for (const user of CAST) {
		// createUser with email_confirm writes a real auth.identities row, which
		// seed.sql's hand-rolled crypt() inserts never did -- without it the
		// password grant has no identity to match and sign-in fails.
		const { error: createError } = await admin.auth.admin.createUser({
			id: user.id,
			email: user.email,
			password: LOCAL_TEST_PASSWORD,
			email_confirm: true,
		});
		if (
			createError &&
			!/already been registered|already exists/i.test(createError.message)
		) {
			throw new Error(
				`createUser(${user.email}) failed: ${createError.message}`,
			);
		}
		if (createError) {
			// Already present from an earlier seed -- make the password authoritative.
			const { error: updateError } = await admin.auth.admin.updateUserById(
				user.id,
				{
					password: LOCAL_TEST_PASSWORD,
					email_confirm: true,
				},
			);
			if (updateError) {
				throw new Error(
					`updateUserById(${user.email}) failed: ${updateError.message}`,
				);
			}
		}

		// public.users is created by the signup trigger as `trialing`; the e2e
		// owner must be `active` (tests/e2e/auth-helpers.ts:328 fails loudly when
		// the gate redirects to /pricing), and the admin needs is_admin.
		const { error: rowError } = await admin
			.from("users")
			.update({
				is_admin: user.isAdmin,
				subscription_status: user.subscriptionStatus,
			})
			.eq("id", user.id);
		if (rowError) {
			throw new Error(
				`users row update for ${user.email} failed: ${rowError.message}`,
			);
		}

		// Prove the pair actually authenticates rather than assuming createUser
		// implies a working password grant.
		const probe = createClient(SUPABASE_URL, SECRET_KEY, {
			auth: { autoRefreshToken: false, persistSession: false },
		});
		const { data: signIn, error: signInError } =
			await probe.auth.signInWithPassword({
				email: user.email,
				password: LOCAL_TEST_PASSWORD,
			});
		if (signInError || !signIn.session) {
			throw new Error(
				`${user.email} was created but does not authenticate: ${signInError?.message ?? "no session"}`,
			);
		}
		await probe.auth.signOut();

		console.log(
			`  ${user.email.padEnd(28)} id=${user.id}  is_admin=${user.isAdmin}  verified sign-in`,
		);
	}

	console.log(`\nSeeded ${CAST.length} test users against ${SUPABASE_URL}`);
	console.log("Export for the suites:");
	console.log("  E2E_OWNER_EMAIL=e2e-owner-a@tenantflow.app");
	console.log("  E2E_OWNER_B_EMAIL=e2e-owner-b@tenantflow.app");
	console.log("  E2E_ADMIN_EMAIL=e2e-admin@tenantflow.app");
	console.log(
		"  E2E_{OWNER,OWNER_B,ADMIN}_PASSWORD=<the repo constant in this file>",
	);
}

main().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
