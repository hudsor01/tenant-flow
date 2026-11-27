/**
 * @vitest-environment jsdom
 *
 * The stepper's optional `resolveRows` step (2026-11-26): the lease importer
 * matches names to ids before the preview. The preview waits for it, and a
 * lookup that fails holds every row back rather than importing unmatched
 * rows.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
	BulkImportConfig,
	BulkImportParseResult,
} from "#components/bulk-import/types";
import { useBulkImportStepperState } from "#components/bulk-import/use-bulk-import-stepper-state";
import { createTestWrapper } from "#test/utils/test-render";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

interface Row {
	name: string;
	id?: string;
}

const parsed: BulkImportParseResult<Row> = {
	rows: [
		{ row: 2, data: { name: "a" }, errors: [], parsed: { name: "a" } },
		{
			row: 3,
			data: { name: "" },
			errors: [{ field: "name", message: "Name is required" }],
			parsed: null,
		},
	],
	tooManyRows: false,
	totalRowCount: 2,
};

function configWith(
	resolveRows: BulkImportConfig<Row>["resolveRows"],
): BulkImportConfig<Row> {
	return {
		entityLabel: { singular: "Thing", plural: "Things" },
		templateFilename: "things.csv",
		templateHeaders: ["name"],
		templateSampleRows: [["a"]],
		requiredFields: "name",
		parseAndValidate: () => parsed,
		...(resolveRows ? { resolveRows } : {}),
		insertRow: async () => ({ error: null }),
		invalidateKeys: [],
	};
}

function setup(config: BulkImportConfig<Row>) {
	return renderHook(
		() =>
			useBulkImportStepperState<Row>({
				config,
				currentStep: "validate",
				onStepChange: vi.fn(),
				onComplete: vi.fn(),
			}),
		{ wrapper: createTestWrapper().Wrapper },
	);
}

const csvFile = () =>
	new File(["name\na\n"], "things.csv", { type: "text/csv" });

describe("useBulkImportStepperState resolveRows", () => {
	it("shows the resolved rows, and reports resolving while it runs", async () => {
		let finish: (value: BulkImportParseResult<Row>) => void = () => {};
		const resolveRows = vi.fn(
			() =>
				new Promise<BulkImportParseResult<Row>>((resolve) => {
					finish = resolve;
				}),
		);
		const { result } = setup(configWith(resolveRows));

		act(() => {
			void result.current.handleFileSelect(csvFile());
		});
		await waitFor(() => expect(result.current.resolving).toBe(true));
		expect(result.current.parseResult).toBeNull();

		await act(async () => {
			finish({
				...parsed,
				rows: parsed.rows.map((r) =>
					r.parsed ? { ...r, parsed: { ...r.parsed, id: "id-a" } } : r,
				),
			});
		});
		await waitFor(() => expect(result.current.resolving).toBe(false));
		expect(resolveRows).toHaveBeenCalledWith(parsed);
		expect(result.current.parseResult?.rows[0]?.parsed).toEqual({
			name: "a",
			id: "id-a",
		});
		expect(result.current.validRowCount).toBe(1);
	});

	it("holds every parsed row back when the lookup fails", async () => {
		const { result } = setup(
			configWith(() => Promise.reject(new Error("offline"))),
		);
		await act(async () => {
			await result.current.handleFileSelect(csvFile());
		});
		expect(result.current.resolving).toBe(false);
		const rows = result.current.parseResult?.rows ?? [];
		expect(rows[0]?.parsed).toBeNull();
		expect(rows[0]?.errors[0]?.message).toBe(
			"Couldn't check this row against your records. Upload the file again.",
		);
		// The row that already failed parsing keeps its own error.
		expect(rows[1]?.errors).toEqual(parsed.rows[1]?.errors);
		expect(result.current.validRowCount).toBe(0);
	});

	it("skips the step for an importer without one", async () => {
		const { result } = setup(configWith(undefined));
		await act(async () => {
			await result.current.handleFileSelect(csvFile());
		});
		expect(result.current.parseResult).toBe(parsed);
		expect(result.current.resolving).toBe(false);
	});
});
