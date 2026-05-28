import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { isMissingRelationError, safeFetch } from "../report-data";

describe("isMissingRelationError", () => {
	it("returns true for Postgres 42P01 by error code", () => {
		expect(isMissingRelationError({ code: "42P01", message: "anything" })).toBe(
			true,
		);
	});

	it("returns true for 42P01 by message regex (no code)", () => {
		expect(
			isMissingRelationError({
				message: 'relation "public.rent_payments" does not exist',
			}),
		).toBe(true);
	});

	it("matches the message regex case-insensitively", () => {
		expect(
			isMissingRelationError({
				message: 'RELATION "x" DOES NOT EXIST',
			}),
		).toBe(true);
	});

	it("returns false for other Postgres error codes", () => {
		expect(
			isMissingRelationError({ code: "23505", message: "duplicate key" }),
		).toBe(false);
		expect(
			isMissingRelationError({ code: "42501", message: "permission denied" }),
		).toBe(false);
	});

	it("returns false for plain Error objects without 42P01 metadata", () => {
		expect(isMissingRelationError(new Error("network failure"))).toBe(false);
	});

	it("returns false for non-object inputs", () => {
		expect(isMissingRelationError(null)).toBe(false);
		expect(isMissingRelationError(undefined)).toBe(false);
		expect(isMissingRelationError("error string")).toBe(false);
		expect(isMissingRelationError(42)).toBe(false);
	});

	it("does not over-match on similar phrases", () => {
		expect(
			isMissingRelationError({
				message: "function does not exist",
			}),
		).toBe(false);
		expect(
			isMissingRelationError({
				message: "relation rent_payments does not exist", // missing quotes
			}),
		).toBe(false);
	});
});

describe("safeFetch", () => {
	const FALLBACK = { rows: [] as Array<{ id: string }> };

	function makeClient(): QueryClient {
		return new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
	}

	it("returns { data, available: true } on success", async () => {
		const qc = makeClient();
		const result = await safeFetch(
			qc,
			{
				queryKey: ["test", "ok"] as const,
				queryFn: async () => ({ rows: [{ id: "1" }] }),
			},
			FALLBACK,
		);
		expect(result.available).toBe(true);
		expect(result.data).toEqual({ rows: [{ id: "1" }] });
	});

	it("returns fallback + available=false on 42P01", async () => {
		const qc = makeClient();
		const result = await safeFetch(
			qc,
			{
				queryKey: ["test", "missing"] as const,
				queryFn: async () => {
					throw { code: "42P01", message: 'relation "x" does not exist' };
				},
			},
			FALLBACK,
		);
		expect(result.available).toBe(false);
		expect(result.data).toBe(FALLBACK);
	});

	it("re-throws on other errors (not 42P01)", async () => {
		const qc = makeClient();
		await expect(
			safeFetch(
				qc,
				{
					queryKey: ["test", "boom"] as const,
					queryFn: async () => {
						throw new Error("network failure");
					},
				},
				FALLBACK,
			),
		).rejects.toMatchObject({ message: expect.stringContaining("network") });
	});

	it("re-throws on permission-denied (42501), not just any error", async () => {
		const qc = makeClient();
		await expect(
			safeFetch(
				qc,
				{
					queryKey: ["test", "perm"] as const,
					queryFn: async () => {
						throw { code: "42501", message: "permission denied" };
					},
				},
				FALLBACK,
			),
		).rejects.toMatchObject({ code: "42501" });
	});
});
