/**
 * Give a synthetic PRODUCTION test account a new password, and put it
 * everywhere the suites read it, without anyone seeing it.
 *
 *   bun scripts/rotate-test-account-password.ts owner-b
 *
 * The integration, RLS and e2e suites sign in to production as the synthetic
 * accounts below. Their passwords live in GitHub secrets (write-only) and in a
 * developer's `.env.local`; when neither copy is known locally there is no way
 * to read one back, only to set a new one. This script:
 *
 *   1. generates a random password (never printed);
 *   2. sets it on the account with the Admin API (SUPABASE_SECRET_KEY);
 *   3. signs in with it (publishable key) to prove it works;
 *   4. writes the account's email and password variables into `.env.local`;
 *   5. sets the password secret for GitHub Actions AND Dependabot (`gh`), so
 *      CI keeps signing in. Each `gh secret set` reads the value from stdin,
 *      never from its arguments.
 *
 * Only the accounts in ACCOUNTS can be touched: a typo cannot reset a real
 * owner's password. Run it from the repo root, where bun loads `.env.local`
 * (it needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and
 * SUPABASE_SECRET_KEY). A CI job signed in with the old password keeps its
 * session; one that signs in between steps 2 and 5 fails and can be re-run.
 *
 * If step 5 fails (gh not signed in), the new password is already in
 * `.env.local`; fix gh and run with `--secrets-only` to push it from there.
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const REPO = "hudsor01/tenant-flow";

export const ACCOUNTS = {
	"owner-a": {
		email: "e2e-owner-a@tenantflow.app",
		emailVar: "E2E_OWNER_EMAIL",
		passwordVar: "E2E_OWNER_PASSWORD",
	},
	"owner-b": {
		email: "e2e-owner-b@tenantflow.app",
		emailVar: "E2E_OWNER_B_EMAIL",
		passwordVar: "E2E_OWNER_B_PASSWORD",
	},
	admin: {
		email: "e2e-admin@tenantflow.app",
		emailVar: "E2E_ADMIN_EMAIL",
		passwordVar: "E2E_ADMIN_PASSWORD",
	},
} as const;

type AccountName = keyof typeof ACCOUNTS;

export function isAccountName(value: string | undefined): value is AccountName {
	return value !== undefined && Object.hasOwn(ACCOUNTS, value);
}

/** 32 URL-safe characters: nothing an env file or a shell needs to quote. */
export function generatePassword(): string {
	return randomBytes(24).toString("base64url");
}

/**
 * `text` with each `NAME=value` line in `entries` replaced, or appended when
 * absent. Other lines, comments and blank lines are kept as they are.
 */
export function upsertEnvLines(
	text: string,
	entries: Record<string, string>,
): string {
	const lines = text === "" ? [] : text.split("\n");
	if (lines.at(-1) === "") lines.pop();
	for (const [name, value] of Object.entries(entries)) {
		const assignment = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`);
		const line = `${name}=${value}`;
		const index = lines.findIndex((existing) => assignment.test(existing));
		if (index === -1) lines.push(line);
		else lines[index] = line;
	}
	return `${lines.join("\n")}\n`;
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`${name} is not set. Run from the repo root so bun loads .env.local, or export it.`,
		);
	}
	return value;
}

function setGitHubSecret(
	name: string,
	value: string,
	app: "actions" | "dependabot",
): void {
	// The value goes in on stdin, never on the command line (visible in ps).
	const result = spawnSync(
		"gh",
		["secret", "set", name, "--repo", REPO, "--app", app],
		{ input: value, stdio: ["pipe", "ignore", "pipe"], encoding: "utf8" },
	);
	if (result.status !== 0) {
		const reason = result.error?.message ?? result.stderr.trim();
		throw new Error(
			`gh secret set ${name} (${app}) failed: ${reason}. The new password is in .env.local; run again with --secrets-only once gh works.`,
		);
	}
}

function pushSecrets(passwordVar: string, password: string): void {
	setGitHubSecret(passwordVar, password, "actions");
	setGitHubSecret(passwordVar, password, "dependabot");
	console.log(`Set ${passwordVar} for GitHub Actions and Dependabot.`);
}

async function findUserId(
	admin: SupabaseClient,
	email: string,
): Promise<string> {
	for (let page = 1; page < 100; page++) {
		const { data, error } = await admin.auth.admin.listUsers({
			page,
			perPage: 1000,
		});
		if (error) throw new Error(`listUsers failed: ${error.message}`);
		const match = data.users.find((user) => user.email === email);
		if (match) return match.id;
		if (data.users.length < 1000) break;
	}
	throw new Error(`No auth user with email ${email}.`);
}

async function main(argv: string[]): Promise<void> {
	const name = argv.find((arg) => !arg.startsWith("--"));
	if (!isAccountName(name)) {
		throw new Error(
			`Usage: bun scripts/rotate-test-account-password.ts <${Object.keys(ACCOUNTS).join("|")}> [--secrets-only]`,
		);
	}
	const account = ACCOUNTS[name];

	if (argv.includes("--secrets-only")) {
		pushSecrets(account.passwordVar, requireEnv(account.passwordVar));
		return;
	}

	const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
	const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
	const secretKey = requireEnv("SUPABASE_SECRET_KEY");
	const noSession = {
		auth: { persistSession: false, autoRefreshToken: false },
	};
	const admin = createClient(url, secretKey, noSession);

	const userId = await findUserId(admin, account.email);
	const password = generatePassword();
	const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
		password,
	});
	if (updateError) {
		throw new Error(`Setting the password failed: ${updateError.message}`);
	}

	const client = createClient(url, publishableKey, noSession);
	const { error: signInError } = await client.auth.signInWithPassword({
		email: account.email,
		password,
	});
	if (signInError) {
		throw new Error(
			`The new password was set but signing in with it failed: ${signInError.message}`,
		);
	}
	await client.auth.signOut();
	console.log(`Set and verified a new password for ${account.email}.`);

	const envPath = resolve(process.cwd(), ".env.local");
	let current = "";
	try {
		current = readFileSync(envPath, "utf8");
	} catch {
		// No .env.local yet: it is created.
	}
	writeFileSync(
		envPath,
		upsertEnvLines(current, {
			[account.emailVar]: account.email,
			[account.passwordVar]: password,
		}),
		{ mode: 0o600 },
	);
	console.log(
		`Wrote ${account.emailVar} and ${account.passwordVar} to ${envPath}.`,
	);

	pushSecrets(account.passwordVar, password);
}

if (process.argv[1]?.endsWith("/rotate-test-account-password.ts")) {
	main(process.argv.slice(2)).catch((err: unknown) => {
		console.error(err instanceof Error ? err.message : String(err));
		process.exit(1);
	});
}
