import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock toast + logger before importing the module so the toast spy captures
// every call and logger noise doesn't pollute output.
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("#lib/frontend-logger", () => ({
	createLogger: () => ({
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	}),
}));

// `handleMutationError` calls `Sentry.captureException` + `addBreadcrumb`
// for every error. Mock both so the test stays isolated from the real SDK.
vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

import { toast } from "sonner";
import { handleMutationError } from "#lib/mutation-error-handler";

type ToastCall = [string, Record<string, unknown> | undefined];

const lastToastErrorCall = (): ToastCall => {
	const mock = vi.mocked(toast.error);
	const calls = mock.mock.calls;
	if (calls.length === 0) {
		throw new Error("expected toast.error to have been called");
	}
	const last = calls[calls.length - 1];
	return [
		last?.[0] as string,
		last?.[1] as Record<string, unknown> | undefined,
	];
};

describe("handleMutationError — plan-limit detection", () => {
	beforeEach(() => {
		vi.mocked(toast.error).mockClear();
	});

	it("routes properties trigger error to upgrade toast with parsed source", () => {
		// Shape that the BEFORE INSERT trigger surfaces through PostgREST →
		// supabase-js → mutation onError. Top-level `hint` + `details`.
		const error = {
			message: "plan_limit_exceeded: properties (1 / 1 used)",
			code: "P0001",
			hint: "plan_limit_exceeded",
			details:
				'{"resource":"properties","used":1,"limit":1,"upgrade_source":"property_limit_gate"}',
		};

		handleMutationError(error, "Create property");

		const [title, opts] = lastToastErrorCall();
		expect(title).toBe("Plan limit reached");
		expect(opts?.description).toBe(
			"plan_limit_exceeded: properties (1 / 1 used)",
		);
		// Action callback would route to /billing/plans?source=property_limit_gate.
		// We can't easily test the navigation without window.location stubbing,
		// but the action must exist and have the right label.
		const action = opts?.action as { label?: string } | undefined;
		expect(action?.label).toBe("Upgrade");
	});

	it("routes units trigger error with the units source tag", () => {
		const error = {
			message: "plan_limit_exceeded: units (5 / 5 used)",
			code: "P0001",
			hint: "plan_limit_exceeded",
			details:
				'{"resource":"units","used":5,"limit":5,"upgrade_source":"unit_limit_gate"}',
		};

		handleMutationError(error, "Create unit");

		const [title] = lastToastErrorCall();
		expect(title).toBe("Plan limit reached");
	});

	it("falls back to default upgrade source when DETAIL is malformed JSON", () => {
		const error = {
			message: "plan_limit_exceeded",
			code: "P0001",
			hint: "plan_limit_exceeded",
			details: "{ this is not valid json",
		};

		handleMutationError(error, "Create property");

		// Toast still fires with upgrade action — the parse failure is
		// swallowed and the default 'plan_limit_gate' source is used.
		const [title, opts] = lastToastErrorCall();
		expect(title).toBe("Plan limit reached");
		const action = opts?.action as { label?: string } | undefined;
		expect(action?.label).toBe("Upgrade");
	});

	it("falls back to default upgrade source when DETAIL is missing", () => {
		const error = {
			message: "plan_limit_exceeded",
			code: "P0001",
			hint: "plan_limit_exceeded",
			// no `details`
		};

		handleMutationError(error, "Create property");

		const [title, opts] = lastToastErrorCall();
		expect(title).toBe("Plan limit reached");
		const action = opts?.action as { label?: string } | undefined;
		expect(action?.label).toBe("Upgrade");
	});

	it("maps a 23505 unique-violation to friendly copy (no raw constraint text)", () => {
		const error = {
			message: "duplicate key value violates unique constraint",
			code: "23505", // unique_violation
			hint: "",
			details: "Key (id) already exists.",
		};

		handleMutationError(error, "Create property");

		// Leaky SQLSTATE → friendly product copy, NOT the raw DB message.
		const [title, opts] = lastToastErrorCall();
		expect(title).toBe("This record already exists.");
		// And specifically NOT the plan-limit toast.
		expect(opts?.action).toBeUndefined();
	});

	it("does NOT confuse a different P0001 error (no plan_limit_exceeded hint)", () => {
		const error = {
			message: "some other raise_exception",
			code: "P0001",
			hint: "something_else",
			details: "",
		};

		handleMutationError(error, "Create property");

		// P0001 is author-written RAISE copy — not leaky, surfaces verbatim.
		const [title, opts] = lastToastErrorCall();
		expect(title).toBe("some other raise_exception");
		expect(opts?.action).toBeUndefined();
	});
});

describe("handleMutationError — leaky SQLSTATE → friendly copy (UIX-04)", () => {
	beforeEach(() => {
		vi.mocked(toast.error).mockClear();
	});

	it("maps a RAW Postgres constraint message to its friendly copy by SQLSTATE", () => {
		// Each case pairs a real auto-generated Postgres system message (which leaks
		// schema internals) with the friendly copy it must be replaced by.
		const cases: Array<[string, string, string]> = [
			[
				"23505",
				'duplicate key value violates unique constraint "users_email_key"',
				"This record already exists.",
			],
			[
				"23514",
				'new row for relation "leases" violates check constraint "leases_status_check"',
				"Some of the information entered isn't allowed. Please review and try again.",
			],
			[
				"23503",
				'insert or update on table "leases" violates foreign key constraint "leases_unit_id_fkey"',
				"This action references a record that no longer exists.",
			],
			[
				"23502",
				'null value in column "name" of relation "properties" violates not-null constraint',
				"A required field is missing.",
			],
			[
				"42501",
				'new row violates row-level security policy for table "properties"',
				"You don't have permission to perform this action.",
			],
		];

		for (const [code, raw, friendly] of cases) {
			vi.mocked(toast.error).mockClear();
			handleMutationError({ message: raw, code }, "Save record");
			const [title, opts] = lastToastErrorCall();
			expect(title).toBe(friendly);
			expect(opts?.action).toBeUndefined();
		}
	});

	it("surfaces an AUTHOR-written RAISE message verbatim even under a constraint SQLSTATE (regression)", () => {
		// The codebase RAISEs user-facing copy under 23514 (term-lock trigger) and
		// 42501 (default-category delete). These must NOT be genericized.
		const authorCases: Array<[string, string]> = [
			["23514", "Cannot edit financial terms of a signed lease"],
			["42501", "Default categories cannot be deleted"],
		];
		for (const [code, authorMsg] of authorCases) {
			vi.mocked(toast.error).mockClear();
			handleMutationError({ message: authorMsg, code }, "Update lease");
			const [title] = lastToastErrorCall();
			expect(title).toBe(authorMsg);
		}
	});

	it("maps an unmapped leaky class-22 code to the generic fallback", () => {
		handleMutationError(
			{ message: "date/time field value out of range", code: "22007" },
			"Save record",
		);
		const [title] = lastToastErrorCall();
		expect(title).toBe("Something went wrong. Please try again.");
	});

	it("maps an unmapped PGRST* code to the generic fallback", () => {
		handleMutationError(
			{
				message: "JSON object requested, multiple rows returned",
				code: "PGRST116",
			},
			"Save record",
		);
		const [title] = lastToastErrorCall();
		expect(title).toBe("Something went wrong. Please try again.");
	});

	it("lets a customMessage override a mapped SQLSTATE code", () => {
		handleMutationError(
			{
				message: "duplicate key value violates unique constraint",
				code: "23505",
			},
			"Create tenant",
			"A tenant with that email already exists.",
		);
		const [title] = lastToastErrorCall();
		expect(title).toBe("A tenant with that email already exists.");
	});

	it("keeps a non-leaky code's raw message verbatim", () => {
		// P0002 (no_data_found) is author-written PL/pgSQL RAISE — surfaces as-is.
		handleMutationError(
			{ message: "Lease term is locked and cannot be changed.", code: "P0002" },
			"Update lease",
		);
		const [title] = lastToastErrorCall();
		expect(title).toBe("Lease term is locked and cannot be changed.");
	});

	it("keeps a message with no code verbatim", () => {
		handleMutationError({ message: "Network request failed" }, "Save record");
		const [title] = lastToastErrorCall();
		expect(title).toBe("Network request failed");
	});
});
