/**
 * application-keys unit tests (Phase 66, APPLY-01 / APPLY-03 / APPLY-04).
 *
 * Pins the four invariants that fail silently rather than loudly:
 *   (a) the typed PostgREST boundary — every NOT NULL field throws when
 *       dropped, every nullable resolves to `null` (never `undefined`, never
 *       the string "null"), every `numeric` column coerces, and an unknown
 *       `status` throws instead of widening the union;
 *   (b) the queue is bounded by `.range()` and totalled from
 *       `{ count: 'exact' }` — never `rows.length`, which is capped at the page
 *       size and makes the pager say "25 of 25" forever;
 *   (c) all four mutations invalidate `applicationKeys.all` AND
 *       `ownerDashboardKeys.all`;
 *   (d) `record_application_conversion` returning `(false,
 *       'already_converted')` is a RESOLVED result, not a thrown error.
 */

import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockFrom,
	mockSelect,
	mockOrder,
	mockEq,
	mockRange,
	mockLimit,
	mockDelete,
	mockDeleteEq,
	mockDeleteSelect,
	mockRpc,
} = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockSelect: vi.fn(),
	mockOrder: vi.fn(),
	mockEq: vi.fn(),
	mockRange: vi.fn(),
	mockLimit: vi.fn(),
	mockDelete: vi.fn(),
	mockDeleteEq: vi.fn(),
	mockDeleteSelect: vi.fn(),
	mockRpc: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

vi.mock("#lib/postgrest-error-handler", () => ({
	handlePostgrestError: vi.fn((error: unknown) => {
		throw error;
	}),
}));

import {
	APPLICATIONS_PAGE_SIZE,
	applicationKeys,
	applicationQueries,
	deleteApplicationMutationOptions,
	isAnonymized,
	mapRentalApplicationRow,
	mapRentalApplicationSummaryRow,
	recordApplicationConversionMutationOptions,
	setApplicationNotesMutationOptions,
	setApplicationStatusMutationOptions,
} from "../application-keys";
import { ownerDashboardKeys } from "../owner-dashboard-keys";
import { tenantQueries } from "../tenant-keys";

const APP_ID = "00000000-0000-0000-0000-0000000000a1";
const OWNER_ID = "00000000-0000-0000-0000-0000000000b1";
const UNIT_ID = "00000000-0000-0000-0000-0000000000c1";
const TENANT_ID = "00000000-0000-0000-0000-0000000000d1";

/** Every column `mapRentalApplicationRow` reads, all forty-one. */
const fullRow: Record<string, unknown> = {
	id: APP_ID,
	owner_user_id: OWNER_ID,
	link_id: "00000000-0000-0000-0000-0000000000e1",
	unit_id: UNIT_ID,
	property_label: "Maple Court",
	unit_label: "2B",
	status: "reviewing",
	decided_at: null,
	disposition_reason: null,
	converted_tenant_id: null,
	converted_at: null,
	occupant_count: 2,
	anonymized_at: null,
	created_at: "2026-08-01T12:00:00Z",
	owner_notes: "Called references.",
	applicant_first_name: "Dana",
	applicant_last_name: "Reyes",
	applicant_email: "dana@example.com",
	applicant_phone: "555-0100",
	desired_move_in_date: "2026-09-01",
	current_street: "12 Elm St",
	current_city: "Austin",
	current_state: "TX",
	current_postal_code: "78701",
	current_landlord_name: "Pat Kim",
	current_landlord_phone: "555-0111",
	reason_for_moving: "Relocating for work",
	gross_monthly_income: 5200,
	employer_name: "Acme",
	employer_role: "Engineer",
	employer_months: 26,
	other_income_source: "Freelance",
	other_income_amount: 300,
	pet_details: "One cat",
	vehicle_details: "Sedan",
	reference_1_name: "Jo Ng",
	reference_1_relationship: "Former landlord",
	reference_1_phone: "555-0122",
	reference_2_name: "Sam Lee",
	reference_2_relationship: "Employer",
	reference_2_phone: "555-0133",
};

const NOT_NULL_FIELDS = [
	"id",
	"owner_user_id",
	"property_label",
	"applicant_first_name",
	"applicant_last_name",
	"applicant_email",
	"status",
	"created_at",
] as const;

const NULLABLE_FIELDS = [
	"link_id",
	"unit_id",
	"unit_label",
	"decided_at",
	"disposition_reason",
	"converted_tenant_id",
	"converted_at",
	"anonymized_at",
	"owner_notes",
	"applicant_phone",
	"desired_move_in_date",
	"current_street",
	"current_city",
	"current_state",
	"current_postal_code",
	"current_landlord_name",
	"current_landlord_phone",
	"reason_for_moving",
	"gross_monthly_income",
	"employer_name",
	"employer_role",
	"employer_months",
	"other_income_source",
	"other_income_amount",
	"pet_details",
	"vehicle_details",
	"reference_1_name",
	"reference_1_relationship",
	"reference_1_phone",
	"reference_2_name",
	"reference_2_relationship",
	"reference_2_phone",
] as const;

const summaryRow: Record<string, unknown> = {
	id: APP_ID,
	owner_user_id: OWNER_ID,
	unit_id: UNIT_ID,
	property_label: "Maple Court",
	unit_label: "2B",
	status: "new",
	created_at: "2026-08-01T12:00:00Z",
	applicant_first_name: "Dana",
	applicant_last_name: "Reyes",
	applicant_email: "dana@example.com",
	anonymized_at: null,
};

/** The second argument every TanStack v5 mutationFn receives. */
function mutationContext(client: QueryClient) {
	return { client, meta: undefined };
}

type LooseFn = (...args: unknown[]) => unknown;

/** Invoke a mutationOptions callback without widening the option types. */
function callbackOf(options: object, name: "onSuccess"): LooseFn {
	const fn = (options as Record<string, unknown>)[name];
	if (typeof fn !== "function") {
		throw new Error(`expected a ${name} callback on these mutation options`);
	}
	return fn as LooseFn;
}

function listChain() {
	mockFrom.mockReturnValue({ select: mockSelect });
	mockSelect.mockReturnValue({ order: mockOrder });
	mockOrder.mockReturnValue({
		order: mockOrder,
		eq: mockEq,
		range: mockRange,
	});
	mockEq.mockReturnValue({ eq: mockEq, range: mockRange });
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("mapRentalApplicationRow", () => {
	it("maps a complete row, every field, with correct types", () => {
		const mapped = mapRentalApplicationRow(fullRow);

		expect(Object.keys(mapped).sort()).toEqual(
			[...NOT_NULL_FIELDS, ...NULLABLE_FIELDS, "occupant_count"].sort(),
		);
		expect(mapped.id).toBe(APP_ID);
		expect(mapped.owner_user_id).toBe(OWNER_ID);
		expect(mapped.status).toBe("reviewing");
		expect(mapped.property_label).toBe("Maple Court");
		expect(mapped.unit_label).toBe("2B");
		expect(mapped.applicant_email).toBe("dana@example.com");
		expect(mapped.reference_2_phone).toBe("555-0133");
		expect(typeof mapped.occupant_count).toBe("number");
		expect(mapped.occupant_count).toBe(2);
		expect(typeof mapped.gross_monthly_income).toBe("number");
	});

	it("throws on each NOT NULL field independently", () => {
		for (const field of NOT_NULL_FIELDS) {
			const broken = { ...fullRow, [field]: undefined };
			expect(
				() => mapRentalApplicationRow(broken),
				`expected a throw when '${field}' is missing`,
			).toThrow(new RegExp(`'${field}'`));
		}
	});

	it("throws when a NOT NULL field is present but non-string", () => {
		expect(() => mapRentalApplicationRow({ ...fullRow, id: 12345 })).toThrow(
			/'id'/,
		);
	});

	it("throws when occupant_count is absent (NOT NULL in the schema)", () => {
		expect(() =>
			mapRentalApplicationRow({ ...fullRow, occupant_count: undefined }),
		).toThrow(/'occupant_count'/);
	});

	it("returns null — never undefined, never the string 'null' — for every absent nullable", () => {
		const minimal: Record<string, unknown> = { occupant_count: 1 };
		for (const field of NOT_NULL_FIELDS) {
			minimal[field] = field === "status" ? "new" : `value-${field}`;
		}

		const mapped = mapRentalApplicationRow(minimal);
		// Spread, never a cast — CLAUDE.md rule 8 applies to tests too.
		const record: Record<string, unknown> = { ...mapped };
		for (const field of NULLABLE_FIELDS) {
			expect(record[field], `expected null for '${field}'`).toBeNull();
			expect(record[field]).not.toBe("null");
			expect(record[field]).not.toBeUndefined();
		}
	});

	it("coerces numeric columns that PostgREST returns as strings", () => {
		const mapped = mapRentalApplicationRow({
			...fullRow,
			gross_monthly_income: "5200.50",
			other_income_amount: "300.00",
			occupant_count: "3",
			employer_months: "26",
		});

		expect(mapped.gross_monthly_income).toBe(5200.5);
		expect(mapped.other_income_amount).toBe(300);
		expect(mapped.occupant_count).toBe(3);
		expect(mapped.employer_months).toBe(26);
		expect(typeof mapped.occupant_count).toBe("number");
		expect(typeof mapped.gross_monthly_income).toBe("number");
	});

	it("throws when a numeric column carries a non-numeric value", () => {
		expect(() =>
			mapRentalApplicationRow({ ...fullRow, gross_monthly_income: "n/a" }),
		).toThrow(/'gross_monthly_income'/);
	});

	it("throws when status is outside the four-value vocabulary", () => {
		for (const bad of ["archived", "NEW", "", "declined"]) {
			expect(
				() => mapRentalApplicationRow({ ...fullRow, status: bad }),
				`expected a throw for status '${bad}'`,
			).toThrow(/status/);
		}
	});

	it("accepts each of the four vocabulary values", () => {
		for (const status of ["new", "reviewing", "approved", "rejected"]) {
			expect(mapRentalApplicationRow({ ...fullRow, status }).status).toBe(
				status,
			);
		}
	});
});

describe("mapRentalApplicationSummaryRow", () => {
	it("maps the eleven queue columns", () => {
		const mapped = mapRentalApplicationSummaryRow(summaryRow);
		expect(Object.keys(mapped).sort()).toEqual(Object.keys(summaryRow).sort());
		expect(mapped.status).toBe("new");
		expect(mapped.applicant_first_name).toBe("Dana");
	});

	it("does not require the thirty detail columns the queue never selects", () => {
		expect(() => mapRentalApplicationSummaryRow(summaryRow)).not.toThrow();
	});

	it("throws when a NOT NULL queue column is dropped from the select", () => {
		for (const field of [
			"id",
			"owner_user_id",
			"property_label",
			"created_at",
			"applicant_first_name",
			"applicant_last_name",
			"applicant_email",
		]) {
			expect(
				() =>
					mapRentalApplicationSummaryRow({ ...summaryRow, [field]: undefined }),
				`expected a throw when '${field}' is missing`,
			).toThrow(new RegExp(`'${field}'`));
		}
		expect(() =>
			mapRentalApplicationSummaryRow({ ...summaryRow, status: "archived" }),
		).toThrow(/status/);
	});
});

describe("isAnonymized", () => {
	it("is true exactly when anonymized_at is not null", () => {
		expect(isAnonymized({ anonymized_at: "2028-08-01T00:00:00Z" })).toBe(true);
		expect(isAnonymized({ anonymized_at: null })).toBe(false);
		expect(isAnonymized(mapRentalApplicationRow(fullRow))).toBe(false);
	});
});

describe("applicationKeys", () => {
	it("exposes a stable `all` root", () => {
		expect(applicationKeys.all).toEqual(["applications"]);
	});

	it("prefixes detail() with the same root, so one invalidation reaches both", () => {
		const detail = applicationKeys.detail(APP_ID);
		const list = applicationKeys.list({ page: 0 });
		expect(detail[0]).toBe(applicationKeys.all[0]);
		expect(list[0]).toBe(applicationKeys.all[0]);
		expect(detail).toContain(APP_ID);
	});

	it("distinguishes pages", () => {
		expect(applicationKeys.list({ page: 0 })).not.toEqual(
			applicationKeys.list({ page: 1 }),
		);
	});

	it("distinguishes unit filters", () => {
		expect(applicationKeys.list({ page: 0, unitId: "a" })).not.toEqual(
			applicationKeys.list({ page: 0, unitId: "b" }),
		);
		expect(applicationKeys.list({ page: 0, unitId: "a" })).not.toEqual(
			applicationKeys.list({ page: 0 }),
		);
	});

	it("distinguishes status filters", () => {
		expect(applicationKeys.list({ page: 0, status: "new" })).not.toEqual(
			applicationKeys.list({ page: 0, status: "reviewing" }),
		);
	});
});

describe("applicationQueries.list", () => {
	it("selects an explicit column list with { count: 'exact' } and never '*'", async () => {
		listChain();
		mockRange.mockResolvedValue({ data: [summaryRow], error: null, count: 1 });

		await applicationQueries.list({ page: 0 }).queryFn?.({} as never);

		expect(mockFrom).toHaveBeenCalledWith("rental_applications");
		const [columns, options] = mockSelect.mock.calls[0] ?? [];
		expect(columns).not.toContain("*");
		expect(columns).toContain("applicant_first_name");
		// The PII the queue does not render must not be selected (T-66-34).
		expect(columns).not.toContain("gross_monthly_income");
		expect(columns).not.toContain("owner_notes");
		expect(columns).not.toContain("occupant_count");
		expect(columns).not.toContain("reference_1_name");
		expect(options).toEqual({ count: "exact" });
	});

	it("orders created_at desc with a deterministic id tiebreaker", async () => {
		listChain();
		mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

		await applicationQueries.list({ page: 0 }).queryFn?.({} as never);

		expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
		expect(mockOrder).toHaveBeenCalledWith("id", { ascending: false });
	});

	it("bounds page 0 and page 2 with .range() at 25 per page", async () => {
		listChain();
		mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

		await applicationQueries.list({ page: 0 }).queryFn?.({} as never);
		expect(mockRange).toHaveBeenCalledWith(0, APPLICATIONS_PAGE_SIZE - 1);

		await applicationQueries.list({ page: 2 }).queryFn?.({} as never);
		expect(mockRange).toHaveBeenCalledWith(50, 74);
		expect(APPLICATIONS_PAGE_SIZE).toBe(25);
	});

	it("applies eq filters only when the filter is set", async () => {
		listChain();
		mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

		await applicationQueries.list({ page: 0 }).queryFn?.({} as never);
		expect(mockEq).not.toHaveBeenCalled();

		await applicationQueries
			.list({ page: 0, unitId: UNIT_ID, status: "approved" })
			.queryFn?.({} as never);
		expect(mockEq).toHaveBeenCalledWith("unit_id", UNIT_ID);
		expect(mockEq).toHaveBeenCalledWith("status", "approved");
	});

	it("takes total from the count header, not the loaded slice length", async () => {
		listChain();
		mockRange.mockResolvedValue({
			data: [summaryRow, summaryRow],
			error: null,
			count: 137,
		});

		const page = await applicationQueries
			.list({ page: 0 })
			.queryFn?.({} as never);

		expect(page?.rows).toHaveLength(2);
		expect(page?.total).toBe(137);
	});

	it("falls back to total 0 — never rows.length — when the count header is null", async () => {
		listChain();
		mockRange.mockResolvedValue({
			data: [summaryRow, summaryRow],
			error: null,
			count: null,
		});

		const page = await applicationQueries
			.list({ page: 0 })
			.queryFn?.({} as never);

		expect(page?.rows).toHaveLength(2);
		expect(page?.total).toBe(0);
	});

	it("routes a PostgREST error through handlePostgrestError", async () => {
		listChain();
		mockRange.mockResolvedValue({
			data: null,
			error: { message: "boom", code: "42501" },
			count: null,
		});

		await expect(
			applicationQueries.list({ page: 0 }).queryFn?.({} as never),
		).rejects.toMatchObject({ message: expect.stringContaining("boom") });
	});
});

describe("applicationQueries.detail", () => {
	function detailChain() {
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ eq: mockEq });
		mockEq.mockReturnValue({ limit: mockLimit });
	}

	it("uses select('*') with .limit(1) rather than .single()", async () => {
		detailChain();
		mockLimit.mockResolvedValue({ data: [fullRow], error: null });

		const row = await applicationQueries.detail(APP_ID).queryFn?.({} as never);

		expect(mockSelect).toHaveBeenCalledWith("*");
		expect(mockEq).toHaveBeenCalledWith("id", APP_ID);
		expect(mockLimit).toHaveBeenCalledWith(1);
		expect(row?.id).toBe(APP_ID);
	});

	it("resolves null for a missing row instead of throwing", async () => {
		detailChain();
		mockLimit.mockResolvedValue({ data: [], error: null });

		const row = await applicationQueries.detail(APP_ID).queryFn?.({} as never);
		expect(row).toBeNull();
	});

	it("is disabled without an id", () => {
		expect(applicationQueries.detail("").enabled).toBe(false);
	});
});

function spiedClient() {
	const queryClient = new QueryClient();
	const invalidate = vi
		.spyOn(queryClient, "invalidateQueries")
		.mockResolvedValue(undefined);
	const invalidatedKeys = (): unknown[] =>
		invalidate.mock.calls.map((call) => call[0]?.queryKey);
	return { queryClient, invalidate, invalidatedKeys };
}

describe("owner mutations", () => {
	it("setApplicationStatus calls the RPC without a reason when none is given", async () => {
		const { queryClient } = spiedClient();
		mockRpc.mockResolvedValue({ data: null, error: null });
		const options = setApplicationStatusMutationOptions(queryClient);

		await options.mutationFn?.(
			{ applicationId: APP_ID, status: "reviewing" },
			mutationContext(queryClient),
		);

		expect(mockRpc).toHaveBeenCalledWith("set_application_status", {
			p_application_id: APP_ID,
			p_status: "reviewing",
		});
		// The optional arg must be ABSENT, not sent as undefined.
		const args = mockRpc.mock.calls[0]?.[1] as Record<string, unknown>;
		expect("p_disposition_reason" in args).toBe(false);
	});

	it("setApplicationStatus forwards the closed-vocabulary decline reason", async () => {
		const { queryClient } = spiedClient();
		mockRpc.mockResolvedValue({ data: null, error: null });
		const options = setApplicationStatusMutationOptions(queryClient);

		await options.mutationFn?.(
			{
				applicationId: APP_ID,
				status: "rejected",
				dispositionReason: "another_applicant_selected",
			},
			mutationContext(queryClient),
		);

		expect(mockRpc).toHaveBeenCalledWith("set_application_status", {
			p_application_id: APP_ID,
			p_status: "rejected",
			p_disposition_reason: "another_applicant_selected",
		});
	});

	it("setApplicationNotes calls set_application_notes", async () => {
		const { queryClient } = spiedClient();
		mockRpc.mockResolvedValue({ data: null, error: null });
		const options = setApplicationNotesMutationOptions(queryClient);

		await options.mutationFn?.(
			{ applicationId: APP_ID, notes: "Called refs" },
			mutationContext(queryClient),
		);

		expect(mockRpc).toHaveBeenCalledWith("set_application_notes", {
			p_application_id: APP_ID,
			p_notes: "Called refs",
		});
	});

	it("recordApplicationConversion returns success on a first conversion", async () => {
		const { queryClient } = spiedClient();
		mockRpc.mockResolvedValue({
			data: [{ success: true, reason: null }],
			error: null,
		});
		const options = recordApplicationConversionMutationOptions(queryClient);

		const result = await options.mutationFn?.(
			{
				applicationId: APP_ID,
				tenantId: TENANT_ID,
			},
			mutationContext(queryClient),
		);

		expect(mockRpc).toHaveBeenCalledWith("record_application_conversion", {
			p_application_id: APP_ID,
			p_tenant_id: TENANT_ID,
		});
		expect(result).toEqual({ success: true, reason: null });
	});

	it("recordApplicationConversion surfaces already_converted as a resolved result, not an error", async () => {
		const { queryClient } = spiedClient();
		mockRpc.mockResolvedValue({
			data: [{ success: false, reason: "already_converted" }],
			error: null,
		});
		const options = recordApplicationConversionMutationOptions(queryClient);

		const result = await options.mutationFn?.(
			{
				applicationId: APP_ID,
				tenantId: TENANT_ID,
			},
			mutationContext(queryClient),
		);

		expect(result).toEqual({ success: false, reason: "already_converted" });
	});

	it("recordApplicationConversion throws when the RPC returns no row at all", async () => {
		const { queryClient } = spiedClient();
		mockRpc.mockResolvedValue({ data: [], error: null });
		const options = recordApplicationConversionMutationOptions(queryClient);

		await expect(
			options.mutationFn?.(
				{ applicationId: APP_ID, tenantId: TENANT_ID },
				mutationContext(queryClient),
			),
		).rejects.toMatchObject({
			message: expect.stringContaining("no row"),
		});
	});

	it("deleteApplication goes through the PostgREST DELETE policy, not an RPC", async () => {
		const { queryClient } = spiedClient();
		mockFrom.mockReturnValue({ delete: mockDelete });
		mockDelete.mockReturnValue({ eq: mockDeleteEq });
		mockDeleteEq.mockReturnValue({ select: mockDeleteSelect });
		mockDeleteSelect.mockResolvedValue({ data: [{ id: APP_ID }], error: null });

		const options = deleteApplicationMutationOptions(queryClient);
		await options.mutationFn?.(APP_ID, mutationContext(queryClient));

		expect(mockFrom).toHaveBeenCalledWith("rental_applications");
		expect(mockDeleteEq).toHaveBeenCalledWith("id", APP_ID);
		expect(mockDeleteSelect).toHaveBeenCalledWith("id");
		expect(mockRpc).not.toHaveBeenCalled();
	});

	it("deleteApplication throws when RLS silently matched zero rows", async () => {
		const { queryClient } = spiedClient();
		mockFrom.mockReturnValue({ delete: mockDelete });
		mockDelete.mockReturnValue({ eq: mockDeleteEq });
		mockDeleteEq.mockReturnValue({ select: mockDeleteSelect });
		mockDeleteSelect.mockResolvedValue({ data: [], error: null });

		const options = deleteApplicationMutationOptions(queryClient);
		await expect(
			options.mutationFn?.(APP_ID, mutationContext(queryClient)),
		).rejects.toMatchObject({
			message: expect.stringContaining("permission"),
		});
	});

	it("every mutation invalidates applicationKeys.all AND ownerDashboardKeys.all", async () => {
		const factories: ((client: QueryClient) => object)[] = [
			setApplicationStatusMutationOptions,
			setApplicationNotesMutationOptions,
			recordApplicationConversionMutationOptions,
			deleteApplicationMutationOptions,
		];

		for (const factory of factories) {
			const { queryClient, invalidatedKeys } = spiedClient();
			const options = factory(queryClient);
			await callbackOf(options, "onSuccess")(undefined, undefined, undefined);

			const keys = invalidatedKeys();
			expect(
				keys,
				`${factory.name} must invalidate applicationKeys.all`,
			).toEqual(expect.arrayContaining([applicationKeys.all]));
			expect(
				keys,
				`${factory.name} must invalidate ownerDashboardKeys.all`,
			).toEqual(expect.arrayContaining([ownerDashboardKeys.all]));
		}
	});

	it("recordApplicationConversion additionally invalidates the tenant keys", async () => {
		const { queryClient, invalidatedKeys } = spiedClient();
		const options = recordApplicationConversionMutationOptions(queryClient);
		await callbackOf(options, "onSuccess")(undefined, undefined, undefined);

		expect(invalidatedKeys()).toEqual(
			expect.arrayContaining([tenantQueries.all()]),
		);
	});
});
