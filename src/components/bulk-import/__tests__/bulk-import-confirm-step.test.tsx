/**
 * @vitest-environment jsdom
 * BulkImportConfirmStep Tests
 *
 * Pins the C5 accessible name of the bulk-import progress bar ("Import
 * progress", UI-SPEC copywriting) and the value it exposes while importing.
 */

import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { render } from "#test/utils/test-render";
import type { ImportProgress } from "#types/api-contracts";
import { BulkImportConfirmStep } from "../bulk-import-confirm-step";

const ENTITY_LABEL = { singular: "Tenant", plural: "Tenants" };
const CUMULATIVE = { imported: 0, failed: 0, totalAttempted: 0 };

function renderImporting(importProgress: ImportProgress | null) {
	return render(
		<BulkImportConfirmStep
			entityLabel={ENTITY_LABEL}
			isImporting
			importProgress={importProgress}
			result={null}
			cumulative={CUMULATIVE}
			retryCount={0}
			parseResult={null}
		/>,
	);
}

describe("BulkImportConfirmStep progress bar", () => {
	test("is named and exposes the import progress", () => {
		renderImporting({ current: 3, total: 7, succeeded: 3, failed: 0 });
		const region = screen.getByRole("status");
		const bar = within(region).getByRole("progressbar", {
			name: "Import progress",
		});
		expect(bar).toHaveAttribute("aria-valuenow", String((3 / 7) * 100));
		expect(bar).toHaveAttribute("aria-valuetext", "43%");
	});

	test("starts at zero before the first batch reports", () => {
		renderImporting(null);
		const bar = screen.getByRole("progressbar", { name: "Import progress" });
		expect(bar).toHaveAttribute("aria-valuenow", "0");
	});
});
