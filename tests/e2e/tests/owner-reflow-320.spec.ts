import { test } from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";
import {
	readSeedCredentials,
	signInAsOwner,
} from "../lib/application-fixtures";
import {
	expectNoPageOverflow,
	type NewestRecord,
	newestRecord,
	OWNER_REFLOW_ROUTES,
	REFLOW_WIDTH,
} from "../lib/reflow";

/**
 * WCAG 1.4.10 Reflow, owner pages (66.2-39 fix round 1, part F): no page owner
 * A can reach scrolls sideways at 320 CSS px. Placed at the root of
 * `tests/e2e/tests/` and listed in the `owner-axe` testMatch (which CI runs)
 * for the reasons `reports-hub.spec.ts` gives. The route list and the
 * measurement are in `tests/e2e/lib/reflow.ts`. The detail and edit pages take
 * owner A's newest record of each kind, read over PostgREST as owner A; a kind
 * with no record skips its pages, with the reason, and a lookup that fails
 * (or a REST sign-in that fails) fails them with its error (`newestRecord`).
 */
test.use({ viewport: { width: REFLOW_WIDTH, height: 800 } });

test.beforeEach(async ({ page }) => {
	await loginAsOwner(page);
	await page.evaluate(() => {
		localStorage.setItem(
			"tenantflow:tour-progress",
			JSON.stringify({ "owner-onboarding": "completed" }),
		);
	});
});

for (const path of OWNER_REFLOW_ROUTES) {
	test(`${path} does not scroll sideways at ${REFLOW_WIDTH}px`, async ({
		page,
	}) => {
		await expectNoPageOverflow(page, path);
	});
}

interface DetailRoute {
	kind: string;
	table: string;
	/** The soft-delete column, or null for a hard-deleted table. */
	statusColumn: string | null;
	paths: (id: string) => string[];
}

const DETAIL_ROUTES: DetailRoute[] = [
	{
		kind: "property",
		table: "properties",
		statusColumn: "status",
		paths: (id) => [`/properties/${id}`, `/properties/${id}/edit`],
	},
	{
		kind: "tenant",
		table: "tenants",
		statusColumn: "status",
		paths: (id) => [`/tenants/${id}`, `/tenants/${id}/edit`],
	},
	{
		kind: "lease",
		table: "leases",
		statusColumn: "lease_status",
		paths: (id) => [`/leases/${id}`, `/leases/${id}/edit`],
	},
	{
		kind: "maintenance request",
		table: "maintenance_requests",
		statusColumn: null,
		paths: (id) => [`/maintenance/${id}`, `/maintenance/${id}/edit`],
	},
	{
		kind: "unit",
		table: "units",
		statusColumn: "status",
		paths: (id) => [`/units/${id}/edit`],
	},
	{
		kind: "inspection",
		table: "inspections",
		statusColumn: null,
		paths: (id) => [`/inspections/${id}`],
	},
	{
		kind: "application",
		table: "rental_applications",
		statusColumn: null,
		paths: (id) => [`/applications/${id}`],
	},
];

const records = new Map<string, NewestRecord>();
let setupFailure: string | null = "the id lookup has not run";

test.describe("detail and edit pages", () => {
	test.beforeAll(async () => {
		const credentials = readSeedCredentials();
		if (!credentials) {
			setupFailure =
				"no seed credentials: the Supabase URL, the publishable key and E2E_OWNER_PASSWORD are needed";
			return;
		}
		const client = await signInAsOwner(credentials);
		if (!client) {
			setupFailure = "could not sign owner A in over the REST API";
			return;
		}
		for (const route of DETAIL_ROUTES) {
			let query = client
				.from(route.table)
				.select("id")
				.order("created_at", { ascending: false })
				.limit(1);
			if (route.statusColumn) query = query.neq(route.statusColumn, "inactive");
			const { data, error } = await query;
			records.set(route.kind, newestRecord(route.kind, { data, error }));
		}
		setupFailure = null;
		// Local scope only: a global sign-out would revoke the RLS suite's
		// sessions (see apply-token.spec.ts).
		await client.auth.signOut({ scope: "local" });
	});

	for (const route of DETAIL_ROUTES) {
		test(`owner A's newest ${route.kind}: its pages do not scroll sideways at ${REFLOW_WIDTH}px`, async ({
			page,
		}) => {
			test.setTimeout(90_000);
			if (setupFailure) throw new Error(setupFailure);
			const record = records.get(route.kind);
			if (!record) throw new Error(`no lookup ran for ${route.kind}`);
			if (record.state === "failed") throw new Error(record.reason);
			if (record.state === "none") {
				test.skip(true, record.reason);
			} else {
				for (const path of route.paths(record.id)) {
					await expectNoPageOverflow(page, path);
				}
			}
		});
	}
});
