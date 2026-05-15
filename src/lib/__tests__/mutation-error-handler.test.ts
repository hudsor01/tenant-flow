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

	it("does NOT fire upgrade toast for unrelated PostgrestError", () => {
		const error = {
			message: "duplicate key value violates unique constraint",
			code: "23505", // unique_violation
			hint: "",
			details: "Key (id) already exists.",
		};

		handleMutationError(error, "Create property");

		// Falls through to the generic-message branch (no status, no plan-limit
		// hint, not a 4xx/5xx code path). Toast title is the raw message.
		const [title, opts] = lastToastErrorCall();
		expect(title).toBe("duplicate key value violates unique constraint");
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

		const [title, opts] = lastToastErrorCall();
		expect(title).toBe("some other raise_exception");
		expect(opts?.action).toBeUndefined();
	});
});
