/**
 * The persisted query cache is discarded when a cached return shape changes
 * (CLAUDE.md, Data layer: "bump QUERY_CACHE_BUSTER when a cached return shape
 * changes"). financialQueries.balanceSheet moved from a { data, success }
 * wrapper to BalanceSheetResult (66.2-39, part K, v2); the income statement, the
 * cash flow, the year-end report, the tax documents and the property
 * performance queries moved to result unions and rent received (part L, v3);
 * the dashboard, expense and maintenance queries gained the trends, the year
 * over year and the costs the RPCs now compute (part M, v4); the dashboard
 * trends, the lease profitability, the statements' lines and the report
 * queries changed shape again (part N, v5); the tax documents lost their
 * deduction, Schedule E and depreciation fields (part Q, v6); the analytics
 * pages, the report queries and the income statement lost the fields no
 * screen or export reads, unitQueries.list's rows gained the `propertyName`
 * their embedded property gives, maintenanceQueries.list's rows the
 * `propertyName`, `unitNumber` and `tenantName` their embedded unit, property
 * and tenant give, maintenanceQueries.detail the same and the tenant's
 * `tenantEmail` and `tenantPhone`, and leaseQueries.detail its `tenant` and
 * `unit` in place of the raw `tenants` and `units` embeds (fix round 3, v7);
 * the ledger-unavailable results lost the tax year, as-of date, period and
 * year no page read (fix round 4, v8). An entry persisted under an older buster would be read back by the new
 * pages as neither shape and drawn as an empty or $0 report until the refetch
 * landed. The buster is module-private, so this reads the source.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
	join(process.cwd(), "src/providers/query-provider.tsx"),
	"utf8",
);

describe("QUERY_CACHE_BUSTER", () => {
	it("is past v1 to v7, whose entries have the old shapes", () => {
		const buster = /const QUERY_CACHE_BUSTER = "([^"]+)";/.exec(SOURCE)?.[1];
		expect(buster).toBeDefined();
		expect(buster).not.toBe("tenantflow-cache-v1");
		expect(buster).not.toBe("tenantflow-cache-v2");
		expect(buster).not.toBe("tenantflow-cache-v3");
		expect(buster).not.toBe("tenantflow-cache-v4");
		expect(buster).not.toBe("tenantflow-cache-v5");
		expect(buster).not.toBe("tenantflow-cache-v6");
		expect(buster).not.toBe("tenantflow-cache-v7");
		expect(buster).toBe("tenantflow-cache-v8");
	});
});
