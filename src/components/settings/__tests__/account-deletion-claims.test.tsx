/**
 * @vitest-environment jsdom
 * What the app says about deleting, anonymizing, exporting and keeping an
 * owner's data, held to what the code does (66.2-39 fix round 4, Part 8i).
 *
 * Both Danger Zones said "After 30 days, all your data will be permanently
 * anonymized", the scheduled notice said "Your account will be permanently
 * deleted on <date>", and the plan-end panels said "Your data will be deleted
 * on <date>". The job keeps leases, tenants, expenses, the rent ledger, the
 * emergency contact and the sign-in, waits while a lease is active, and
 * nothing deletes data when a plan ends. Each sentence of the deletion copy
 * is read against the latest migration body of the function that does it, so
 * a migration that changes the job fails here until the copy follows.
 *
 * The legal pages said the same false things (66.2-39 fix round 4, Part 8j;
 * owner, 2026-11-09: rewrite them to match): data "deleted within 90 days",
 * payment records "retained for 7 years", "export your data at any time",
 * "delete your account and associated data at any time", "we comply with GDPR
 * requirements", backups "for up to 90 days". Their passages are held to the
 * same function bodies and the export function, and the false-claim scan now
 * reads them too.
 *
 * Owner, 2026-11-09 (Part 8k): an owner whose plan or trial has lapsed reaches
 * Settings, its export and its deletion request (the proxy exempts Settings
 * from its subscription gate). The privacy policy said both worked only "while
 * your subscription or trial is active", and the cancel dialog that a plan
 * must be chosen "to open the app again"; both now say what the proxy does.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_DELETION_COPY } from "#components/settings/deletion-scheduled-notice";
import { authKeys } from "#hooks/api/use-auth";

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
			getSession: vi.fn(),
		},
		rpc: vi.fn(),
		from: vi.fn(),
	}),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { AccountDataSection } from "../account-data-section";
import { GdprDataActions } from "../gdpr-data-actions";

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase/migrations");

/** The body of the newest `create or replace function public.<name>(` in the ledger. */
function latestFunctionBody(name: string): { file: string; body: string } {
	const head = new RegExp(
		`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\s*\\(`,
		"i",
	);
	const files = readdirSync(MIGRATIONS)
		.filter((f) => f.endsWith(".sql"))
		.sort();
	for (const file of files.reverse()) {
		const sql = readFileSync(join(MIGRATIONS, file), "utf8");
		const start = sql.search(head);
		if (start === -1) continue;
		const rest = sql.slice(start);
		const end = rest.search(/^\$[a-z_]*\$;/im);
		return { file, body: end === -1 ? rest : rest.slice(0, end) };
	}
	throw new Error(`no migration defines public.${name}`);
}

function renderWith(ui: ReactNode, deletionRequestedAt: string | null) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	queryClient.setQueryData(authKeys.deletionStatus(), {
		deletion_requested_at: deletionRequestedAt,
	});
	return render(
		createElement(QueryClientProvider, { client: queryClient }, ui),
	);
}

afterEach(() => {
	cleanup();
});

describe("the account-deletion copy is what the job does", () => {
	const request = latestFunctionBody("request_account_deletion");
	const nightly = latestFunctionBody("process_account_deletions");
	const anonymize = latestFunctionBody("anonymize_deleted_user");

	it("reads the job from the ledger's newest bodies", () => {
		expect(request.file).toBe(
			"20260710220901_reconcile_request_account_deletion.sql",
		);
		expect(nightly.file).toBe("20260306180000_gdpr_anonymize_cascade.sql");
		expect(anonymize.file).toBe(
			"20260807003639_rental_applications_gdpr_cascade.sql",
		);
	});

	it("the request only stamps the date, so it never refuses for a lease or a payment", () => {
		expect(request.body).toMatch(/set deletion_requested_at = now\(\)/);
		expect(request.body).not.toMatch(/lease|payment|rent/i);
		expect(ACCOUNT_DELETION_COPY.intro).toBe(
			"Request deletion of your account. It runs after 30 days, and you can cancel until then.",
		);
	});

	it("the nightly job runs once the request is 30 days old and retries a failure", () => {
		expect(nightly.body).toMatch(
			/deletion_requested_at < now\(\) - interval '30 days'/,
		);
		expect(nightly.body).toMatch(/perform public\.anonymize_deleted_user/);
		expect(nightly.body).toMatch(/exception when others/);
		expect(ACCOUNT_DELETION_COPY.confirmTitle).toBe(
			"This schedules your account for deletion in 30 days.",
		);
	});

	it("waits while a lease is active", () => {
		expect(anonymize.body).toMatch(
			/lease_status = 'active'[\s\S]*raise exception/,
		);
		expect(ACCOUNT_DELETION_COPY.confirmBody).toContain(
			"If a lease is still active then, deletion waits until none is.",
		);
	});

	it("removes the profile's name, email, phone and photo", () => {
		for (const set of [
			/full_name = '\[deleted user\]'/,
			/email = '\[deleted-'/,
			/phone = null/,
			/avatar_url = null/,
		]) {
			expect(anonymize.body).toMatch(set);
		}
		expect(ACCOUNT_DELETION_COPY.confirmBody).toContain(
			"your name, email, phone and photo are removed from your profile",
		);
	});

	it("marks the properties inactive and deletes notifications and applications", () => {
		expect(anonymize.body).toMatch(
			/update public\.properties set status = 'inactive'/,
		);
		expect(anonymize.body).toMatch(/delete from public\.notifications /);
		expect(anonymize.body).toMatch(/delete from public\.rental_applications /);
		expect(ACCOUNT_DELETION_COPY.confirmBody).toContain(
			"your properties are marked inactive, and your notifications and rental applications are deleted.",
		);
	});

	it("keeps the leases, tenants, expenses, rent records, sign-in and emergency contact", () => {
		expect(anonymize.body).not.toMatch(
			/(delete from|update) public\.(leases|tenants|expenses|rent_charges|rent_receipts)\b/,
		);
		expect(anonymize.body).not.toMatch(/emergency_contact/);
		expect(anonymize.body).not.toMatch(/auth\.users/);
		expect(ACCOUNT_DELETION_COPY.confirmBody).toContain(
			"Your leases, tenants, expenses and rent records are kept, and so are your sign-in and emergency contact.",
		);
	});
});

describe("both Danger Zones say it", () => {
	const panels: [string, () => ReactNode][] = [
		["AccountDataSection", () => createElement(AccountDataSection)],
		["GdprDataActions standalone", () => createElement(GdprDataActions)],
	];
	for (const [label, make] of panels) {
		it(`${label}: the intro and the confirmation`, async () => {
			renderWith(make(), null);
			expect(screen.getByText(ACCOUNT_DELETION_COPY.intro)).toBeInTheDocument();
			await userEvent.click(
				screen.getByRole("button", { name: /^delete (my )?account$/i }),
			);
			expect(
				screen.getByText(ACCOUNT_DELETION_COPY.confirmTitle),
			).toBeInTheDocument();
			expect(
				screen.getByText(ACCOUNT_DELETION_COPY.confirmBody),
			).toBeInTheDocument();
		});
	}

	it("GdprDataActions inline: the confirmation", async () => {
		renderWith(createElement(GdprDataActions, { variant: "inline" }), null);
		await userEvent.click(
			screen.getByRole("button", { name: /^delete account$/i }),
		);
		expect(
			screen.getByText(ACCOUNT_DELETION_COPY.confirmBody),
		).toBeInTheDocument();
	});
});

describe("the export copy names what export-user-data returns", () => {
	// It said "Export all your account data including properties, tenants,
	// leases, and payment history"; the function reads no rent ledger,
	// inspections, vendors or applications, and lists documents without files.
	it("lists the function's tables and nothing it leaves out", () => {
		const fn = readFileSync(
			join(ROOT, "supabase/functions/export-user-data/index.ts"),
			"utf8",
		);
		const tables = [...fn.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]);
		expect([...new Set(tables)].sort()).toEqual([
			"documents",
			"expenses",
			"leases",
			"maintenance_requests",
			"properties",
			"tenants",
			"units",
			"users",
		]);
		expect(fn).toMatch(
			/\.select\("id, document_type, file_path, created_at"\)/,
		);
		renderWith(createElement(AccountDataSection), null);
		expect(
			screen.getByText(
				"Download your profile, properties, units, tenants, leases, maintenance requests, expenses and document list as a JSON file.",
			),
		).toBeInTheDocument();
	});
});

describe("the legal pages say what the deletion job and the export do", () => {
	const anonymize = latestFunctionBody("anonymize_deleted_user");
	/** A page's text with JSX line wrapping collapsed. */
	const pageText = (file: string) =>
		readFileSync(join(ROOT, file), "utf8").replace(/\s+/g, " ");
	const privacy = pageText("src/app/privacy/page.tsx");
	const terms = pageText("src/app/terms/page.tsx");

	it("the privacy policy's deleted accounts are what the job removes and keeps", () => {
		expect(anonymize.body).not.toMatch(
			/(delete from|update) public\.(units|maintenance_requests|documents|leases|tenants|expenses|rent_charges|rent_receipts)\b/,
		);
		expect(anonymize.body).not.toMatch(/storage\./);
		expect(anonymize.body).toMatch(/update public\.activity set description/);
		expect(anonymize.body).toMatch(/delete from public\.user_preferences /);
		expect(anonymize.body).toMatch(
			/delete from public\.notification_settings /,
		);
		expect(privacy).toContain(
			"Account deletion runs 30 days after you request it, and waits while any of your leases is active. It removes your name, email, phone and photo link from your profile, marks your properties inactive, replaces the descriptions in your activity history, and deletes your notifications, notification preferences and settings, and rental applications. Your leases, tenants, units, maintenance requests, documents and their files, expenses and rent records are kept, and so are your profile photo file, your emergency contact and your sign-in account, which holds your email address",
		);
		expect(privacy).toContain(
			"Your expenses and rent records are kept while your account exists, and account deletion does not remove them",
		);
	});

	it("the privacy policy's export is the function's tables", () => {
		expect(privacy).toContain(
			"You can download your profile, properties, units, tenants, leases, maintenance requests, expenses and document list as a JSON file from your account settings",
		);
	});

	it("Settings' export and deletion request are open whatever the subscription, as the proxy does", () => {
		const proxy = readFileSync(join(ROOT, "src/proxy.ts"), "utf8");
		expect(proxy).toMatch(
			/const SUBSCRIPTION_EXEMPT_PREFIXES = \["\/settings"\] as const;/,
		);
		expect(proxy).toMatch(/!isSubscriptionExempt\(pathname\)/);
		expect(privacy).toContain(
			"as a JSON file from your account settings at any time, including after your subscription or trial ends.",
		);
		expect(privacy).toContain(
			"You can request deletion of your account from your account settings at any time, including after your subscription or trial ends, or by contacting us at",
		);
		const faqs = readFileSync(join(ROOT, "src/data/faqs.ts"), "utf8");
		expect(faqs).toContain(
			"In Settings you can download your data or request account deletion at any time, including after your plan or trial ends. Deletion runs 30 days after the request, waits while a lease is active, and can be cancelled until then.",
		);
	});

	it("deletion is a request that runs after 30 days, in both documents", () => {
		expect(privacy).toContain(
			"Deletion runs 30 days after the request, and you can cancel it until then; Section 6 describes what it removes and what it keeps.",
		);
		expect(terms).toContain(
			"describes (Section 7.3); deletion runs 30 days after the request.",
		);
	});
});

describe("no copy claims a deletion, a retention limit or an export the code does not do", () => {
	/** Phrases that state something no code does. */
	const FALSE_CLAIMS = [
		/all associated data/i,
		/all your data will be/i,
		/all your account data/i,
		/permanently anonymi[sz]ed/i,
		/will be permanently deleted/i,
		/data will be deleted on/i,
		/30-day retention window/i,
		/data stays for 30 days/i,
		/keep your account when/i,
		/GDPR-compliant/i,
		/Cannot delete account with/i,
		/deleted within 90 days/i,
		/retained for 7 years/i,
		/export your data at any time/i,
		/delete your account and associated data/i,
		/comply with GDPR/i,
		/backups for up to 90 days/i,
		/backups are retained for 90 days/i,
		/terminate your account at any time/i,
		// Settings, its export and its deletion request are not gated by the
		// subscription (owner, 2026-11-09, Part 8k).
		/while your subscription or trial is active/i,
		/to open the app again/i,
	];

	function sources(dir: string): string[] {
		return readdirSync(dir).flatMap((name) => {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) {
				return name === "__tests__" || name === "test" ? [] : sources(path);
			}
			return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)
				? [path]
				: [];
		});
	}

	it("finds none in src, the legal pages included", () => {
		const hits: string[] = [];
		for (const path of sources(join(ROOT, "src"))) {
			const file = relative(ROOT, path);
			// JSX wraps a sentence over lines: read it whole.
			const text = readFileSync(path, "utf8").replace(/\s+/g, " ");
			for (const claim of FALSE_CLAIMS) {
				if (claim.test(text)) hits.push(`${file} ${claim}`);
			}
		}
		expect(hits).toEqual([]);
	});
});
