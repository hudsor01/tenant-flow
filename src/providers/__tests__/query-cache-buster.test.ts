/**
 * The persisted query cache is discarded when a cached return shape changes
 * (CLAUDE.md, Data layer: "bump QUERY_CACHE_BUSTER when a cached return shape
 * changes"). financialQueries.balanceSheet moved from ApiResponse<BalanceSheet
 * Data> to BalanceSheetResult (66.2-39, part K); an entry persisted under v1
 * would be read back by the new page as neither shape and drawn as a $0 sheet
 * until the refetch landed. The buster is module-private, so this reads the
 * source.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
	join(process.cwd(), "src/providers/query-provider.tsx"),
	"utf8",
);

describe("QUERY_CACHE_BUSTER", () => {
	it("is past v1, whose balance-sheet entries have the old shape", () => {
		const buster = /const QUERY_CACHE_BUSTER = "([^"]+)";/.exec(SOURCE)?.[1];
		expect(buster).toBeDefined();
		expect(buster).not.toBe("tenantflow-cache-v1");
		expect(buster).toBe("tenantflow-cache-v2");
	});
});
