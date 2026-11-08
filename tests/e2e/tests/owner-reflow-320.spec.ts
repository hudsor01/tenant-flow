import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";
import {
	readSeedCredentials,
	signInAsOwner,
} from "../lib/application-fixtures";
import { readReflow } from "../lib/measure";
import {
	expectReflowStates,
	type NewestRecord,
	newestRecord,
	OWNER_REFLOW_ROUTES,
	REFLOW_WIDTH,
	reflowFailures,
	reflowStateFailures,
} from "../lib/reflow";
import {
	answerReadsLong,
	blockWrites,
	lengthenRead,
} from "../lib/reflow-states";

/**
 * WCAG 1.4.10 Reflow, owner pages (66.2-39 fix round 1, part F; fix round 4,
 * Part 8e): no page owner A can reach, and no state its visible controls
 * open, scrolls sideways at 320 CSS px, puts a control past the viewport or
 * runs text past its box. Placed at the root of `tests/e2e/tests/` and listed
 * in the `owner-axe` testMatch (which CI runs) for the reasons
 * `reports-hub.spec.ts` gives. The route list is in `tests/e2e/lib/reflow.ts`,
 * the reading in `measure.ts` (`readReflow`), the states in
 * `reflow-states.ts`.
 *
 * Every read is answered in the browser with production's body lengthened
 * (`answerReadsLong`: names, addresses, emails and descriptions at length,
 * figures at seven digits) and every write is fulfilled or aborted there
 * (`blockWrites`), so no state the guard opens writes to production. Each
 * route test opens every trigger the page shows (`measureEachTrigger`). The
 * flows below walk the states no trigger reaches: the lease wizard's steps,
 * each bulk import's upload and validate steps, the onboarding wizard, the
 * tour and the intercepted create and edit modals. The detail and edit pages
 * take owner A's newest record of each kind, read over PostgREST as owner A;
 * owner A has no maintenance request, so that kind is a synthetic record
 * answered in the browser, never written. A lookup that fails fails its pages.
 */
// Reduced motion: an overlay's entrance finishes at once (globals.css), so
// each state reads settled on its first poll.
test.use({
	viewport: { width: REFLOW_WIDTH, height: 800 },
	reducedMotion: "reduce",
});

async function signIn(page: Page, context: BrowserContext): Promise<void> {
	await blockWrites(context);
	await answerReadsLong(context);
	await loginAsOwner(page);
	await page.evaluate(() => {
		localStorage.setItem(
			"tenantflow:tour-progress",
			JSON.stringify({ "owner-onboarding": "completed" }),
		);
	});
}

/**
 * The listed routes by their first segment, one test (and one sign-in) each:
 * a sign-in lands on the dashboard first, so a test per route spent a second
 * of each on it.
 */
const ROUTE_GROUPS = new Map<string, string[]>();
for (const path of OWNER_REFLOW_ROUTES) {
	const group = path.split(/[/?]/)[1] ?? "";
	ROUTE_GROUPS.set(group, [...(ROUTE_GROUPS.get(group) ?? []), path]);
}

for (const [group, paths] of ROUTE_GROUPS) {
	test(`/${group} pages and the states their controls open fit ${REFLOW_WIDTH}px`, async ({
		page,
		context,
	}) => {
		test.setTimeout(30_000 + 30_000 * paths.length);
		await signIn(page, context);
		const failures: string[] = [];
		for (const path of paths) {
			failures.push(...(await reflowStateFailures(page, path)));
		}
		expect(failures, failures.join("\n")).toEqual([]);
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

/** The synthetic maintenance request's id: never a row in production. */
const SYNTHETIC_REQUEST_ID = "8e0e0000-0000-4000-8000-000000000001";

/** The synthetic request's title, which its page must show to be measured. */
const SYNTHETIC_REQUEST_TITLE =
	"Water leaking through the kitchen ceiling below the upstairs bathroom";

/**
 * A maintenance request as the detail read returns it (MAINTENANCE_DETAIL_SELECT
 * in maintenance-keys.ts), on owner A's newest unit and for owner A's newest
 * tenant (`tenant_id` is NOT NULL), with long text and figures. The guard
 * answers its detail, expenses and photos reads in the browser.
 */
function syntheticRequest(
	unit: { id: string; property_id: string },
	tenantId: string,
) {
	return {
		id: SYNTHETIC_REQUEST_ID,
		owner_user_id: SYNTHETIC_REQUEST_ID,
		unit_id: unit.id,
		tenant_id: tenantId,
		title: SYNTHETIC_REQUEST_TITLE,
		description:
			"The tenant reports water leaking through the kitchen ceiling below the upstairs bathroom after every shower; the drywall is stained and soft near the light fixture.",
		priority: "urgent",
		status: "needs_reassignment",
		vendor_id: null,
		requested_by: null,
		assigned_to: null,
		estimated_cost: 1_234_567,
		scheduled_date: "2026-12-02",
		completed_at: null,
		inspection_date: null,
		inspection_findings: null,
		inspector_id: null,
		created_at: "2026-11-01T15:04:05Z",
		updated_at: "2026-11-02T15:04:05Z",
		units: {
			unit_number: "PH-1204-North",
			property_id: unit.property_id,
			properties: {
				name: "Riverside Gardens Apartment Community North Tower",
				status: "active",
			},
		},
		tenant: {
			name: null,
			first_name: "Maximiliana",
			last_name: "Vandenberghe-Montgomery",
			email: "maximiliana.vandenberghe-montgomery@outlook.com",
			phone: "+1 (555) 555-0123",
		},
	};
}

/** Answers the synthetic request's reads (a GET each) in the browser. */
async function answerSyntheticRequest(
	page: Page,
	unit: { id: string; property_id: string },
	tenantId: string,
): Promise<void> {
	const request = syntheticRequest(unit, tenantId);
	const expense = {
		id: "8e0e0000-0000-4000-8000-000000000101",
		amount: 1_234_567.89,
		description:
			"Replaced the cracked drain line and patched the ceiling drywall",
		expense_date: "2026-11-02",
		vendor_name: "Northwest Plumbing Heating & Air Conditioning Services LLC",
		maintenance_request_id: SYNTHETIC_REQUEST_ID,
		status: "active",
	};
	await page.route(
		new RegExp(`/rest/v1/[a-z_]+\\?.*${SYNTHETIC_REQUEST_ID}`),
		(route) => {
			const read = route.request();
			if (read.method() !== "GET") return route.fallback();
			const table = new URL(read.url()).pathname.split("/").pop();
			const rows =
				table === "maintenance_requests"
					? [request]
					: table === "expenses"
						? [expense, { ...expense, id: `${expense.id.slice(0, -1)}2` }]
						: [];
			const single = (read.headers().accept ?? "").includes("vnd.pgrst.object");
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				headers: { "content-range": `0-${rows.length - 1}/${rows.length}` },
				body: JSON.stringify(single ? rows[0] : rows),
			});
		},
	);
}

const records = new Map<string, NewestRecord>();
let newestUnit: { id: string; property_id: string } | null = null;
let setupFailure: string | null = "the id lookup has not run";

test.describe("detail and edit pages, and the flows", () => {
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
		const { data } = await client
			.from("units")
			.select("id, property_id")
			.neq("status", "inactive")
			.order("created_at", { ascending: false })
			.limit(1);
		newestUnit = (data?.[0] as { id: string; property_id: string }) ?? null;
		setupFailure = null;
		// Local scope only: a global sign-out would revoke the RLS suite's
		// sessions (see apply-token.spec.ts).
		await client.auth.signOut({ scope: "local" });
	});

	function recordId(kind: string): string {
		if (setupFailure) throw new Error(setupFailure);
		const record = records.get(kind);
		if (!record) throw new Error(`no lookup ran for ${kind}`);
		if (record.state === "failed") throw new Error(record.reason);
		if (record.state === "found") return record.id;
		throw new Error(`${record.reason}: restore owner A's data`);
	}

	for (const route of DETAIL_ROUTES) {
		test(`owner A's newest ${route.kind}: its pages and their states fit ${REFLOW_WIDTH}px`, async ({
			page,
			context,
		}) => {
			test.setTimeout(120_000);
			if (setupFailure) throw new Error(setupFailure);
			let id: string;
			const record = records.get(route.kind);
			if (route.table === "maintenance_requests" && record?.state === "none") {
				// Owner A has no maintenance request: a synthetic one, never written.
				if (!newestUnit) {
					throw new Error("owner A has no unit for the synthetic request");
				}
				await answerSyntheticRequest(page, newestUnit, recordId("tenant"));
				id = SYNTHETIC_REQUEST_ID;
			} else {
				id = recordId(route.kind);
			}
			await signIn(page, context);
			for (const path of route.paths(id)) {
				await expectReflowStates(page, path);
				if (id === SYNTHETIC_REQUEST_ID) {
					// The synthetic request rendered, so its page was measured.
					await expect(
						page.getByText(SYNTHETIC_REQUEST_TITLE).first(),
					).toBeVisible();
				}
			}
		});
	}

	test(`the lease wizard's four steps fit ${REFLOW_WIDTH}px`, async ({
		page,
		context,
	}) => {
		test.setTimeout(90_000);
		const tenant = recordId("tenant");
		const property = recordId("property");
		// A vacant unit on owner A's property, answered in the browser.
		const unit = {
			id: "8e0e0000-0000-4000-8000-000000000050",
			unit_number: "PH-1204-North",
			property_id: property,
			rent_amount: 999_999,
			status: "available",
			bedrooms: 2,
			bathrooms: 1,
			square_feet: 900,
		};
		await page.route(/\/rest\/v1\/units\?.*property_id=eq\./, (route) =>
			route.request().method() === "GET"
				? route.fulfill({
						status: 200,
						contentType: "application/json",
						headers: { "content-range": "0-0/1" },
						body: JSON.stringify([unit]),
					})
				: route.fallback(),
		);
		await signIn(page, context);
		const failures: string[] = [];
		const read = async (state: string) => {
			failures.push(...reflowFailures(state, await readReflow(page, "page")));
		};
		await page.goto(
			`/leases/new?tenant=${tenant}&property=${property}&unit=${unit.id}`,
		);
		await read("step 1, selection");
		const main = page.locator("main");
		const next = main.getByRole("button", { name: "Next", exact: true });
		await next.click();
		await read("step 2, terms");
		await main.getByRole("button", { name: "12 months" }).click();
		await page.locator("#start_date").fill("2026-12-01");
		for (const [field, value] of [
			["#rent_amount", "999999"],
			["#security_deposit", "999999"],
			["#payment_day", "28"],
			["#grace_period_days", "30"],
			["#late_fee_amount", "99999"],
		] as const) {
			await page.locator(field).fill(value);
		}
		await read("step 2, terms filled");
		await next.click();
		await read("step 3, details");
		await page.locator("#pets_allowed").click();
		await page.locator("#pet_deposit").fill("99999");
		await page.locator("#pet_rent").fill("9999");
		await page.locator("#max_occupants").fill("12");
		await page
			.locator("#property_rules")
			.fill(String(lengthenRead("x", "property_rules")));
		await page.locator("#property_built_before_1978").click();
		await page.locator("#lead_paint_disclosure_acknowledged").click();
		for (const utility of await main
			.locator('[id^="included-"], [id^="tenant-"]')
			.all()) {
			await utility.click();
		}
		await read("step 3, details with every section on");
		await next.click();
		await expect(main.getByText("Financial Terms")).toBeVisible();
		await read("step 4, review");
		expect(failures, failures.join("\n")).toEqual([]);
	});

	test(`each bulk import's upload and validate steps fit ${REFLOW_WIDTH}px`, async ({
		page,
		context,
	}) => {
		test.setTimeout(90_000);
		const property = recordId("property");
		// The property's units table, with its Import Units, shows for a
		// multi-unit type: owner A's property read, answered as an apartment.
		await page.route(
			new RegExp(`/rest/v1/properties\\?.*id=eq\\.${property}`),
			async (route) => {
				if (route.request().method() !== "GET") return route.fallback();
				const response = await route.fetch();
				const body = lengthenRead(await response.json());
				const asApartment = (row: unknown) =>
					row !== null && typeof row === "object"
						? { ...row, property_type: "APARTMENT" }
						: row;
				const headers = { ...response.headers() };
				delete headers["content-encoding"];
				delete headers["content-length"];
				return route.fulfill({
					status: response.status(),
					headers,
					body: JSON.stringify(
						Array.isArray(body) ? body.map(asApartment) : asApartment(body),
					),
				});
			},
		);
		await signIn(page, context);
		const failures: string[] = [];
		for (const [path, control, csv] of BULK_IMPORTS(property)) {
			await page.goto(path);
			await page.getByRole("button", { name: control, exact: true }).click();
			const dialog = page.getByRole("dialog");
			await expect(dialog).toBeVisible();
			failures.push(
				...reflowFailures(
					`${path} > ${control}, upload`,
					await readReflow(page, "overlay"),
				),
			);
			// A local file chosen and parsed in the browser; Import is never pressed.
			await dialog.locator('input[type="file"]').setInputFiles({
				name: "import.csv",
				mimeType: "text/csv",
				buffer: Buffer.from(csv),
			});
			await expect(
				dialog.getByRole("button", { name: /^Import \d+ / }),
			).toBeVisible();
			failures.push(
				...reflowFailures(
					`${path} > ${control}, validate`,
					await readReflow(page, "overlay"),
				),
			);
		}
		expect(failures, failures.join("\n")).toEqual([]);
	});

	test(`the onboarding wizard's three steps fit ${REFLOW_WIDTH}px`, async ({
		page,
		context,
	}) => {
		// The wizard opens for an owner who has not started onboarding: owner
		// A's status read, answered so. Closing it would write (blocked).
		await page.route(
			/\/rest\/v1\/users\?.*select=onboarding_status/,
			(route) =>
				route.request().method() === "GET"
					? route.fulfill({
							status: 200,
							contentType: "application/json",
							body: JSON.stringify({ onboarding_status: "not_started" }),
						})
					: route.fallback(),
		);
		await signIn(page, context);
		await page.goto("/dashboard");
		const dialog = page.getByRole("dialog");
		const failures: string[] = [];
		await expect(
			dialog.getByRole("button", { name: "Get Started" }),
		).toBeVisible();
		failures.push(
			...reflowFailures(
				"onboarding, welcome",
				await readReflow(page, "overlay"),
			),
		);
		await dialog.getByRole("button", { name: "Get Started" }).click();
		await expect(
			dialog.getByRole("button", { name: "Skip", exact: true }),
		).toBeVisible();
		failures.push(
			...reflowFailures(
				"onboarding, property",
				await readReflow(page, "overlay"),
			),
		);
		// Skip moves to the last step on the client; nothing is written.
		await dialog.getByRole("button", { name: "Skip", exact: true }).click();
		await expect(
			dialog.getByRole("button", { name: "Skip", exact: true }),
		).toBeHidden();
		failures.push(
			...reflowFailures(
				"onboarding, complete",
				await readReflow(page, "overlay"),
			),
		);
		expect(failures, failures.join("\n")).toEqual([]);
	});

	test(`the onboarding tour's steps fit ${REFLOW_WIDTH}px`, async ({
		page,
		context,
	}) => {
		// The tour starts for an owner with no progress row: owner A's read,
		// answered empty. Its progress writes are blocked.
		await page.route("**/rest/v1/user_tour_progress*", (route) =>
			route.request().method() === "GET"
				? route.fulfill({
						status: 200,
						contentType: "application/json",
						body: "[]",
					})
				: route.fallback(),
		);
		await signIn(page, context);
		await page.evaluate(() =>
			localStorage.removeItem("tenantflow:tour-progress"),
		);
		await page.goto("/dashboard");
		const step = page.locator('[data-slot="tour-step"]');
		const failures: string[] = [];
		for (let index = 1; ; index += 1) {
			await expect(step).toBeVisible({ timeout: 15_000 });
			failures.push(
				...reflowFailures(
					`tour step ${index}`,
					await readReflow(page, "overlay"),
				),
			);
			const next = page.getByRole("button", { name: "Next step" });
			// The last step says Finish, which would complete the tour: not pressed.
			if ((await next.count()) === 0) break;
			await next.click();
		}
		expect(failures, failures.join("\n")).toEqual([]);
	});

	test(`the intercepted create and edit modals fit ${REFLOW_WIDTH}px`, async ({
		page,
		context,
	}) => {
		test.setTimeout(90_000);
		const property = recordId("property");
		const tenant = recordId("tenant");
		const unit = recordId("unit");
		await signIn(page, context);
		const failures: string[] = [];
		for (const [path, href, menu] of [
			["/units", "/units/new", null],
			["/units", `/units/${unit}/edit`, "Open (actions )?menu"],
			["/maintenance", "/maintenance/new", null],
			[`/properties/${property}`, null, null],
			[`/tenants/${tenant}`, `/tenants/${tenant}/edit`, null],
		] as const) {
			await page.goto(path);
			await readReflow(page, "page");
			if (menu)
				await page
					.getByRole("button", { name: new RegExp(`^${menu}`) })
					.first()
					.click();
			if (href) await page.locator(`a[href="${href}"]`).first().click();
			else
				await page.getByRole("button", { name: "Edit", exact: true }).click();
			await expect(page.getByRole("dialog")).toBeVisible();
			failures.push(
				...reflowFailures(
					`${path} > ${href ?? "Edit"} (modal)`,
					await readReflow(page, "overlay"),
				),
			);
		}
		expect(failures, failures.join("\n")).toEqual([]);
	});
});

/** Each bulk import: its page, its control's name and a CSV with long and invalid rows. */
function BULK_IMPORTS(property: string): [string, string, string][] {
	const rows = (header: string, good: (i: number) => string, bad: string) =>
		[
			header,
			...Array.from({ length: 8 }, (_, i) => (i % 4 === 3 ? bad : good(i))),
		].join("\n");
	return [
		[
			"/properties",
			"Bulk Import",
			rows(
				"name,address_line1,address_line2,city,state,postal_code,country,property_type",
				(i) =>
					`Riverside Gardens Apartment Community North Tower ${i},12345 Northwest Riverside Gardens Boulevard,Building C Suite 1200,Rancho Santa Margarita,CA,92688,US,APARTMENT`,
				"Bad Row,,,,ZZ,abc,US,CASTLE",
			),
		],
		[
			"/tenants",
			"Import Tenants",
			rows(
				"email,first_name,last_name,phone,status",
				(i) =>
					`maximiliana.vandenberghe-montgomery${i}@outlook.com,Maximiliana,Vandenberghe-Montgomery,+1 (555) 555-0123,active`,
				"not-an-email,,,,unknown",
			),
		],
		[
			"/leases",
			"Import Leases",
			rows(
				"unit_id,primary_tenant_id,start_date,end_date,rent_amount,security_deposit,payment_day,rent_currency",
				(i) =>
					`8e0e0000-0000-4000-8000-00000000020${i},8e0e0000-0000-4000-8000-00000000030${i},2026-12-01,2027-11-30,999999,999999,1,USD`,
				"nope,nope,2027-01-01,2026-01-01,abc,,40,XX",
			),
		],
		[
			`/properties/${property}`,
			"Import Units",
			rows(
				"unit_number,rent_amount,bedrooms,bathrooms,square_feet,status",
				(i) => `PH-120${i}-North,999999,4,3.5,12345,available`,
				"U9,-5,x,,,haunted",
			),
		],
	];
}
