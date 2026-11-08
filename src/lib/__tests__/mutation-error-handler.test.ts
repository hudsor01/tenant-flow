import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { DiagnosticError } from "#lib/diagnostic-error";
import {
	handleMutationError,
	userFacingErrorMessage,
} from "#lib/mutation-error-handler";
import { ApiErrorCode, createApiErrorFromResponse } from "#lib/utils/api-error";

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
		// The trigger's MESSAGE is a machine prefix for detection; the copy is
		// built from its DETAIL (66.2-39 fix round 4, Part 5d).
		expect(opts?.description).toBe(
			"You've reached your plan's limit of 1 property. Upgrade to add more.",
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

		const [title, opts] = lastToastErrorCall();
		expect(title).toBe("Plan limit reached");
		expect(opts?.description).toBe(
			"You've reached your plan's limit of 5 units. Upgrade to add more.",
		);
	});

	it("never shows the trigger's plan_limit_exceeded message, whatever the DETAIL says", () => {
		const cases: Array<[string | undefined, string]> = [
			[
				'{"resource":"storage","used":5,"limit":5,"upgrade_source":"storage_quota_gate"}',
				"You've reached your plan's storage limit. Upgrade for more space.",
			],
			[
				'{"resource":"units","upgrade_source":"unit_limit_gate"}',
				"You've reached your plan's limit of units. Upgrade to add more.",
			],
			[
				"{ this is not valid json",
				"You've reached a limit of your current plan. Upgrade to add more.",
			],
			[
				undefined,
				"You've reached a limit of your current plan. Upgrade to add more.",
			],
		];
		for (const [details, copy] of cases) {
			vi.mocked(toast.error).mockClear();
			handleMutationError(
				{
					message: "plan_limit_exceeded: units (5 / 5 used)",
					code: "P0001",
					hint: "plan_limit_exceeded",
					...(details === undefined ? {} : { details }),
				},
				"Create unit",
			);
			const [, opts] = lastToastErrorCall();
			expect(opts?.description, String(details)).toBe(copy);
		}
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

describe("handleMutationError — storage plan-limit (StorageApiError message prefix)", () => {
	// StorageApiError carries only { name, message, status, statusCode } — no
	// `.hint`/`.detail` — so the trigger's `plan_limit_exceeded:` message prefix
	// is the ONLY quota signal that survives to the client (Plan 04 contract).
	const originalLocation = window.location;

	beforeEach(() => {
		vi.mocked(toast.error).mockClear();
		// Capture the Upgrade CTA navigation without hitting jsdom's unimplemented
		// navigation. Plain object → `window.location.href = …` writes to `.href`.
		Object.defineProperty(window, "location", {
			configurable: true,
			value: { href: "" },
		});
	});

	afterEach(() => {
		Object.defineProperty(window, "location", {
			configurable: true,
			value: originalLocation,
		});
	});

	it("fires the 'Plan limit reached' Upgrade toast for a storage rejection (source=storage_quota_gate)", () => {
		const storageError = {
			name: "StorageApiError",
			message:
				"plan_limit_exceeded: storage quota reached (11811160064 / 10737418240 bytes used)",
			status: 400,
			statusCode: "400",
		};

		handleMutationError(storageError, "Upload document");

		const [title, opts] = lastToastErrorCall();
		expect(title).toBe("Plan limit reached");
		// Shares the stable dedupe id with the proactive pre-check so a batch
		// upload never stacks duplicate 'Plan limit reached' toasts.
		expect(opts?.id).toBe("storage-quota-upgrade");
		const action = opts?.action as
			| { label?: string; onClick?: () => void }
			| undefined;
		expect(action?.label).toBe("Upgrade");
		// The CTA points at the storage-quota source (no DETAIL JSON on a
		// StorageApiError, so the storage default is used).
		action?.onClick?.();
		expect(window.location.href).toBe(
			"/billing/plans?source=storage_quota_gate",
		);
	});

	it("still routes the PostgREST hint path to its parsed source (no regression)", () => {
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
		// The PostgREST hint path keeps its prior identity-less toast (no dedupe
		// id) so it is unchanged by the storage wiring.
		expect(opts?.id).toBeUndefined();
		const action = opts?.action as
			| { label?: string; onClick?: () => void }
			| undefined;
		expect(action?.label).toBe("Upgrade");
		// DETAIL JSON still wins over the storage default for the PostgREST path.
		action?.onClick?.();
		expect(window.location.href).toBe(
			"/billing/plans?source=property_limit_gate",
		);
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

	it("keeps an author RAISE message verbatim under every SQLSTATE the migrations raise with", () => {
		// PL/pgSQL's default P0001 and every `errcode` in supabase/migrations.
		for (const code of [
			"P0001",
			"PLIM1",
			"22023",
			"23514",
			"28000",
			"42501",
			"0A000",
		]) {
			expect(
				userFacingErrorMessage({
					message: "Lease term is locked and cannot be changed.",
					code,
				}),
				code,
			).toBe("Lease term is locked and cannot be changed.");
		}
	});

	it("never shows Postgres's own text under any other SQLSTATE (66.2-39 fix round 4, Part 5d)", () => {
		// None of these matches RAW_DB_INTERNALS: before, each was toasted verbatim.
		const cases: Array<[string, string]> = [
			["57014", "canceling statement due to statement timeout"],
			["42703", "column properties.foo does not exist"],
			["P0002", "query returned no rows"],
			["42883", "operator does not exist: text = uuid"],
			["53300", "sorry, too many clients already"],
		];
		for (const [code, message] of cases) {
			vi.mocked(toast.error).mockClear();
			handleMutationError({ message, code, details: null, hint: null }, "Save");
			const [title] = lastToastErrorCall();
			expect(title, code).toBe("Something went wrong. Please try again.");
		}
	});

	it("keeps a message with no code verbatim", () => {
		handleMutationError(
			{ message: "Choose a unit before saving." },
			"Save record",
		);
		const [title] = lastToastErrorCall();
		expect(title).toBe("Choose a unit before saving.");
	});
});

const NETWORK_COPY =
	"Network error. Please check your connection and try again.";

/** Chrome's, Firefox's and Safari's text for a fetch that never reached the server. */
const BROWSER_FETCH_FAILURES = [
	"Failed to fetch",
	"NetworkError when attempting to fetch resource.",
	"Load failed",
];

/** A real supabase-js client whose every request fails as `fetch` does offline. */
function offlineClient(failure: unknown) {
	return createClient("http://localhost:54321", "sb_publishable_mock", {
		global: {
			fetch: async () => {
				throw failure;
			},
		},
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});
}

describe("userFacingErrorMessage — a failed fetch, as each library passes it on (fix round 4, G62)", () => {
	beforeEach(() => {
		vi.mocked(toast.error).mockClear();
	});

	it.each(BROWSER_FETCH_FAILURES)(
		"shows the network copy for postgrest-js's, auth-js's and storage-js's errors (%s)",
		async (text) => {
			const client = offlineClient(new TypeError(text));
			// postgrest-js: a plain { message: "TypeError: <text>", code: "" }.
			const { error: rpcError } = await client.rpc("get_lease_stats");
			expect(rpcError?.message).toBe(`TypeError: ${text}`);
			expect(userFacingErrorMessage(rpcError)).toBe(NETWORK_COPY);
			// auth-js: AuthRetryableFetchError(<text>), and the login page's
			// `new Error(error.message)` of it.
			const { error: authError } = await client.auth.signInWithPassword({
				email: "owner@example.com",
				password: "not-a-real-password",
			});
			expect(authError?.name).toBe("AuthRetryableFetchError");
			expect(userFacingErrorMessage(authError)).toBe(NETWORK_COPY);
			expect(userFacingErrorMessage(new Error(authError?.message))).toBe(
				NETWORK_COPY,
			);
			// storage-js: StorageUnknownError(<text>).
			const { error: storageError } = await client.storage
				.from("tenant-documents")
				.upload("lease/1/a.txt", new Blob(["a"]));
			expect(storageError?.name).toBe("StorageUnknownError");
			expect(userFacingErrorMessage(storageError)).toBe(NETWORK_COPY);
		},
	);

	it("shows the network copy for postgrest-js's FetchError prefix (an error with no name)", async () => {
		const { error } = await offlineClient({ message: "Failed to fetch" }).rpc(
			"get_lease_stats",
		);
		expect(error?.message).toBe("FetchError: Failed to fetch");
		expect(userFacingErrorMessage(error)).toBe(NETWORK_COPY);
	});

	it("toasts the network copy for a mutation whose PostgREST call failed offline", async () => {
		const { error } = await offlineClient(new TypeError("Failed to fetch")).rpc(
			"get_lease_stats",
		);
		handleMutationError(error, "Save lease");
		expect(lastToastErrorCall()[0]).toBe(NETWORK_COPY);
	});

	it("keeps other text verbatim: the match is the whole message", () => {
		expect(
			userFacingErrorMessage(new Error("Failed to fetch tour progress")),
		).toBe("Failed to fetch tour progress");
		expect(
			userFacingErrorMessage({
				message: "FetchError: Failed to fetch the lease",
			}),
		).toBe("FetchError: Failed to fetch the lease");
	});
});

describe("userFacingErrorMessage — the one sanitizer (66.2-39 part I)", () => {
	beforeEach(() => {
		vi.mocked(toast.error).mockClear();
	});

	it("shows an ApiError's product copy, never the HTTP status line", () => {
		const error = createApiErrorFromResponse(
			new Response("raw body", { status: 502, statusText: "Bad Gateway" }),
			ApiErrorCode.PDF_GENERATION_FAILED,
		);
		expect(error.message).toContain("Bad Gateway");
		expect(userFacingErrorMessage(error)).toBe(
			"Failed to generate the PDF. Please try again.",
		);
		handleMutationError(error, "Download PDF");
		expect(lastToastErrorCall()[0]).toBe(
			"Failed to generate the PDF. Please try again.",
		);
	});

	it("shows the network copy for the browser's own fetch failure", () => {
		for (const text of [
			"Failed to fetch",
			"NetworkError when attempting to fetch resource.",
			"Load failed",
		]) {
			expect(userFacingErrorMessage(new TypeError(text))).toBe(NETWORK_COPY);
		}
	});

	it("genericizes a raw permission or missing-relation message", () => {
		for (const [message, code] of [
			["permission denied for table leases", "42501"],
			['relation "public.x" does not exist', "42P01"],
			['column "y" of relation "leases" does not exist', "42703"],
			["function public.f(uuid) does not exist", "42883"],
		] as const) {
			const shown = userFacingErrorMessage({ message, code });
			expect(shown, message).not.toContain(message);
		}
		expect(
			userFacingErrorMessage({
				message: "permission denied for table leases",
				code: "42501",
			}),
		).toBe("You don't have permission to perform this action.");
	});

	it("keeps author copy verbatim and falls back when there is no message", () => {
		expect(
			userFacingErrorMessage(new Error("Default categories cannot be deleted")),
		).toBe("Default categories cannot be deleted");
		expect(userFacingErrorMessage(new Error(""), "Upload failed")).toBe(
			"Upload failed",
		);
		expect(userFacingErrorMessage(undefined, "Upload failed")).toBe(
			"Upload failed",
		);
	});
});

describe("userFacingErrorMessage — a message that names code is never shown (66.2-39 fix round 4, Part 5d)", () => {
	beforeEach(() => {
		vi.mocked(toast.error).mockClear();
	});

	it("shows the fallback for a DiagnosticError (a boundary mapper's shape check)", () => {
		const error = new DiagnosticError(
			"mapDocumentCategoryRow: NOT NULL field 'slug' missing or non-string from PostgREST response",
		);
		expect(userFacingErrorMessage(error, "Rename failed")).toBe(
			"Rename failed",
		);
		handleMutationError(error, "Rename category");
		expect(lastToastErrorCall()[0]).toBe(
			"Something went wrong. Please try again.",
		);
	});

	it("shows the fallback for a JavaScript runtime fault, the network copy still for a failed fetch", () => {
		for (const error of [
			new TypeError("Cannot read properties of undefined (reading 'id')"),
			new RangeError("Invalid time value"),
			new SyntaxError(
				"Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON",
			),
			new ReferenceError("foo is not defined"),
			new DOMException("signal is aborted without reason", "AbortError"),
		]) {
			expect(userFacingErrorMessage(error, "Save failed"), error.name).toBe(
				"Save failed",
			);
		}
		expect(userFacingErrorMessage(new TypeError("Failed to fetch"))).toBe(
			NETWORK_COPY,
		);
	});

	it("shows the fallback for an HTML page passed on as a PostgREST message", () => {
		expect(
			userFacingErrorMessage(
				{ message: "<html><head><title>502 Bad Gateway</title></head></html>" },
				"Save failed",
			),
		).toBe("Save failed");
	});

	it("maps supabase-js's own Edge Function errors to copy", () => {
		const named = (name: string, message: string) =>
			Object.assign(new Error(message), { name });
		expect(
			userFacingErrorMessage(
				named(
					"FunctionsHttpError",
					"Edge Function returned a non-2xx status code",
				),
				"Send failed",
			),
		).toBe("Send failed");
		expect(
			userFacingErrorMessage(
				named("FunctionsRelayError", "Relay Error invoking the Edge Function"),
				"Send failed",
			),
		).toBe("Send failed");
		expect(
			userFacingErrorMessage(
				named(
					"FunctionsFetchError",
					"Failed to send a request to the Edge Function",
				),
			),
		).toBe(NETWORK_COPY);
	});
});

describe("handleMutationError — a status branch's own copy for an error with no message", () => {
	beforeEach(() => {
		vi.mocked(toast.error).mockClear();
	});

	// The branch copy was the `||` operand behind `displayMessage`, which can
	// no longer be empty: `userFacingErrorMessage` returns its fallback for a
	// blank message, so each branch passes its copy as that fallback.
	it.each([
		[409, "Conflict", "This item already exists or has been modified"],
		[403, "Access Denied", "You do not have permission to perform this action"],
		[404, "Not Found", "The requested item could not be found"],
	])("a %i shows %s with its copy", (status, title, copy) => {
		handleMutationError(Object.assign(new Error(""), { status }), "Load lease");
		expect(lastToastErrorCall()).toEqual([title, { description: copy }]);

		handleMutationError({ status }, "Load lease");
		expect(lastToastErrorCall()).toEqual([title, { description: copy }]);
	});

	it("keeps the sanitized message, and the caller's copy, over the branch copy", () => {
		handleMutationError(
			Object.assign(new Error("Lease is already signed"), { status: 409 }),
			"Edit lease",
		);
		expect(lastToastErrorCall()).toEqual([
			"Conflict",
			{ description: "Lease is already signed" },
		]);

		handleMutationError(
			Object.assign(new Error(""), { status: 404 }),
			"Load lease",
			"That lease is gone",
		);
		expect(lastToastErrorCall()).toEqual([
			"Not Found",
			{ description: "That lease is gone" },
		]);
	});

	it("shows the generic copy for an error with no message and no status", () => {
		handleMutationError(new Error(""), "Save notes");
		expect(lastToastErrorCall()).toEqual([
			"Something went wrong. Please try again.",
			undefined,
		]);
	});
});
