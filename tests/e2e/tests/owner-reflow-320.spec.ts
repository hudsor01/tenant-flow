import { crc32, deflateSync } from "node:zlib";
import {
	type BrowserContext,
	expect,
	type Locator,
	type Page,
	type Route,
	test,
} from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";
import {
	readSeedCredentials,
	signInAsOwner,
} from "../lib/application-fixtures";
import { boxOf, REFLOW_OVERLAYS, readReflow } from "../lib/measure";
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
	withSessionUser,
} from "../lib/reflow-states";
import { tourProgressWriteBody } from "../lib/tour-progress-write";

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
		// A control one route of the group measured is not opened again on
		// another route of the same page (the settings tabs' routes).
		const measured = new Set<string>();
		for (const path of paths) {
			failures.push(
				...(await reflowStateFailures(page, path, {
					header: path === "/dashboard",
					measured,
				})),
			);
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
 * tenant (`tenant_id` is NOT NULL), with long text and figures, and assigned
 * the synthetic vendor (its `vendor` embed), so the vendor card, the table's
 * Vendor column and the board card's vendor line are measured with the
 * longest name. The guard answers its detail, expenses and photos reads in
 * the browser.
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
		vendor_id: SYNTHETIC_VENDOR.id,
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
		vendor: {
			name: SYNTHETIC_VENDOR.name,
			trade: SYNTHETIC_VENDOR.trade,
			phone: SYNTHETIC_VENDOR.phone,
			email: SYNTHETIC_VENDOR.email,
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

/**
 * Answers owner A's lease read in the browser (a GET, never a write) with
 * production's row lengthened and `fields` set: `ledger_start_date`, so the
 * page shows a tracked ledger and its Record receipt and Add line controls,
 * or a draft's status, so it shows Send for Signature.
 */
async function answerLeaseAs(
	page: Page,
	id: string,
	fields: Record<string, unknown>,
): Promise<void> {
	await page.route(
		new RegExp(`/rest/v1/leases\\?.*id=eq\\.${id}`),
		async (route) => {
			if (route.request().method() !== "GET") return route.fallback();
			const response = await route.fetch();
			const tracked = (row: unknown) =>
				row !== null && typeof row === "object" ? { ...row, ...fields } : row;
			const body = lengthenRead(await response.json());
			const headers = { ...response.headers() };
			delete headers["content-encoding"];
			delete headers["content-length"];
			return route.fulfill({
				status: response.status(),
				headers,
				body: JSON.stringify(
					Array.isArray(body) ? body.map(tracked) : tracked(body),
				),
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
			if (route.table === "leases") {
				// The ledger's receipt and line dialogs open only on a tracked
				// lease: owner A's lease read, answered with a start date.
				await answerLeaseAs(page, id, { ledger_start_date: "2026-01-01" });
				await expectReflowStates(page, `/leases/${id}`);
				// Send for Signature (an ARIA dialog trigger: it opens the
				// dialog and nothing else) shows on a draft: the read answered
				// as one. Nothing in the dialog is pressed.
				await page.unrouteAll({ behavior: "ignoreErrors" });
				await answerLeaseAs(page, id, {
					lease_status: "draft",
					owner_signed_at: null,
					tenant_signed_at: null,
					sent_for_signature_at: null,
				});
				await page.goto(`/leases/${id}`);
				await page.getByRole("button", { name: "Send for Signature" }).click();
				await expect(page.getByRole("dialog")).toBeVisible();
				const failures = reflowFailures(
					`/leases/${id} as a draft > Send for Signature`,
					await readReflow(page, "overlay"),
				);
				expect(failures, failures.join("\n")).toEqual([]);
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
		const imports = await answerImports(page);
		await signIn(page, context);
		const failures: string[] = [];
		for (const [path, control, csv, valid] of BULK_IMPORTS(property)) {
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
			const submit = dialog.getByRole("button", { name: /^Import \d+ / });
			await expect(submit).toBeVisible();
			failures.push(
				...reflowFailures(
					`${path} > ${control}, validate`,
					await readReflow(page, "overlay"),
				),
			);
			// The result step, from a CSV whose rows are all valid (a row with
			// an error disables Import): each row's insert (a browser request to
			// Supabase, one per row in use-bulk-import-mutation.ts) is answered
			// here, the first as a rejected duplicate, so the result is partial
			// and stays open (a full success closes itself after 5s).
			await page.keyboard.press("Escape");
			await expect(dialog).toBeHidden();
			await page.getByRole("button", { name: control, exact: true }).click();
			await dialog.locator('input[type="file"]').setInputFiles({
				name: "import.csv",
				mimeType: "text/csv",
				buffer: Buffer.from(valid),
			});
			await expect(submit).toBeEnabled();
			await submit.click();
			await expect(dialog.getByText("Partial import completed")).toBeVisible({
				timeout: 20_000,
			});
			failures.push(
				...reflowFailures(
					`${path} > ${control}, result`,
					await readReflow(page, "overlay"),
				),
			);
		}
		expect(failures, failures.join("\n")).toEqual([]);
		expect(imports.answered, "the bulk imports' inserts answered").toBe(24);
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
		// Go to Dashboard: one PATCH of users.onboarding_status (a browser
		// request, use-onboarding.ts), answered here; the dialog closes on the
		// click, and the dashboard is the state it leaves.
		let done = 0;
		await page.route(/\/rest\/v1\/users\?id=eq\./, (route) => {
			if (route.request().method() !== "PATCH") return route.fallback();
			done += 1;
			return route.fulfill({ status: 204, body: "" });
		});
		await dialog.getByRole("button", { name: "Go to Dashboard" }).click();
		await expect(dialog).toBeHidden();
		failures.push(
			...reflowFailures("onboarding, done", await readReflow(page, "page")),
		);
		expect(failures, failures.join("\n")).toEqual([]);
		expect(done, "the onboarding PATCH answered").toBe(1);
	});

	test(`the onboarding tour's steps fit ${REFLOW_WIDTH}px`, async ({
		page,
		context,
	}) => {
		// The tour starts for an owner with no progress row: owner A's read,
		// answered empty. Each step's upsert (a browser request,
		// use-tour-progress.ts) is answered with the row it writes.
		let upserts = 0;
		await page.route("**/rest/v1/user_tour_progress*", (route) => {
			const request = route.request();
			if (request.method() === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: "[]",
				});
			}
			if (request.method() !== "POST") return route.fallback();
			upserts += 1;
			return route.fulfill({
				status: 201,
				contentType: "application/json",
				body: tourProgressWriteBody(request.url(), request.postDataJSON()),
			});
		});
		await signIn(page, context);
		await page.evaluate(() =>
			localStorage.removeItem("tenantflow:tour-progress"),
		);
		// Step 2 across the 48rem breakpoint (Part 8f): steps 2-4 take their
		// side from it, and a step whose props changed lost its place in the
		// tour, so the spotlight stayed with no step in it.
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/dashboard");
		const step = page.locator('[data-slot="tour-step"]');
		await expect(step).toBeVisible({ timeout: 15_000 });
		await page.getByRole("button", { name: "Next step" }).click();
		await expect(step).toContainText("Track Your Performance");
		await page.setViewportSize({ width: REFLOW_WIDTH, height: 800 });
		await expect(
			step,
			"tour step 2 after the viewport went from 1280 to 320",
		).toContainText("Track Your Performance");
		const failures: string[] = reflowFailures(
			"tour step 2, after 1280 to 320",
			await readReflow(page, "overlay"),
		);
		await page.getByRole("button", { name: "Previous step" }).click();
		for (let index = 1; ; index += 1) {
			await expect(step).toBeVisible({ timeout: 15_000 });
			failures.push(
				...reflowFailures(
					`tour step ${index}`,
					await readReflow(page, "overlay"),
				),
			);
			const next = page.getByRole("button", { name: "Next step" });
			if ((await next.count()) === 0) break;
			await next.click();
		}
		// Finish completes the tour: its upsert is answered, and the page it
		// leaves is read.
		await page.getByRole("button", { name: "Finish tour" }).click();
		await expect(step).toBeHidden();
		failures.push(
			...reflowFailures("the tour finished", await readReflow(page, "page")),
		);
		expect(failures, failures.join("\n")).toEqual([]);
		expect(upserts, "the tour's upserts answered").toBeGreaterThan(0);
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

	test(`the states owner A has no data for fit ${REFLOW_WIDTH}px`, async ({
		page,
		context,
	}) => {
		// Synthetic rows answered in the browser, never written: a vendor, a
		// maintenance request in the List view, a document (its signed URL and
		// file too), property images, ledger entries, an emergency contact, two
		// sessions, an active application link, and last a verified MFA
		// factor. Each page is read, and the dialog an ARIA trigger (or a
		// plain button that opens one) shows; nothing in a confirmation is
		// pressed.
		test.setTimeout(150_000);
		const property = recordId("property");
		const lease = recordId("lease");
		const unit = recordId("unit");
		await answerSyntheticRows(page, { property, unit });
		await signIn(page, context);
		await page.evaluate(() =>
			localStorage.setItem(
				"tenantflow-view-preferences",
				JSON.stringify({ maintenance: "table" }),
			),
		);
		const failures: string[] = [];
		const readPage = async (state: string) =>
			failures.push(...reflowFailures(state, await readReflow(page, "page")));
		const readOpened = async (state: string, trigger: Locator) => {
			await trigger.click();
			await expect(page.locator(REFLOW_OVERLAYS).first()).toBeVisible();
			failures.push(
				...reflowFailures(state, await readReflow(page, "overlay")),
			);
			await page.keyboard.press("Escape");
			await expect(page.locator(REFLOW_OVERLAYS)).toHaveCount(0);
		};
		const main = page.locator("main");
		await page.goto("/maintenance/vendors");
		await expect(main.getByText(SYNTHETIC_VENDOR.name).first()).toBeVisible();
		await readPage("/maintenance/vendors, a vendor");
		await readOpened(
			"/maintenance/vendors > Delete vendor",
			main.getByRole("button", { name: `Delete ${SYNTHETIC_VENDOR.name}` }),
		);
		await page.goto("/maintenance");
		await expect(main.getByText(SYNTHETIC_REQUEST_TITLE).first()).toBeVisible();
		await readPage("/maintenance, List view, a request");
		await readOpened(
			"/maintenance > Delete request",
			main.getByRole("button", { name: "Delete request" }).first(),
		);
		await page.goto(`/properties/${property}`);
		const preview = main.getByRole("button", { name: /^lease-agreement-/ });
		await expect(preview).toBeEnabled();
		await expect(
			main.getByRole("button", { name: "View property image 1" }),
		).toBeVisible();
		await readPage(`/properties/${property}, a document and three images`);
		await readOpened(
			`/properties/${property} > the document's preview`,
			preview,
		);
		await readOpened(
			`/properties/${property} > the image lightbox`,
			main.getByRole("button", { name: "View property image 1" }),
		);
		await page.goto("/documents/vault");
		const vaultPreview = main.getByRole("button", {
			name: /^lease-agreement-/,
		});
		await expect(vaultPreview).toBeEnabled();
		await readPage("/documents/vault, a document");
		await readOpened("/documents/vault > the document's preview", vaultPreview);
		await answerLeaseAs(page, lease, { ledger_start_date: "2026-01-01" });
		await page.goto(`/leases/${lease}`);
		await page.getByRole("tab", { name: "Ledger" }).click();
		await expect(
			main.getByRole("button", { name: "Reverse entry" }).first(),
		).toBeVisible();
		await readPage(`/leases/${lease} > Ledger, two entries`);
		await page.goto("/settings");
		await expect(
			main.getByRole("button", { name: "Remove Contact" }),
		).toBeVisible();
		await readPage("/settings, an emergency contact");
		await page.goto("/settings?tab=security");
		await expect(
			main.getByRole("button", { name: "Sign Out All Other Devices" }),
		).toBeVisible();
		await readPage("/settings?tab=security, two sessions");
		await page.goto("/applications");
		await expect(
			main.getByRole("button", { name: "Revoke" }).first(),
		).toBeVisible();
		await readPage("/applications, an active link");
		// A verified TOTP factor (withSessionUser): /login opens the challenge
		// for a signed-in aal1 session that has one. Nothing in it is pressed:
		// dismissing it signs out, a POST that blockWrites stops anyway.
		await withSessionUser(context, { factors: [VERIFIED_FACTOR] });
		await page.goto("/login");
		await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
		failures.push(
			...reflowFailures(
				"/login > the MFA dialog",
				await readReflow(page, "overlay"),
			),
		);
		expect(failures, failures.join("\n")).toEqual([]);
	});
});

/** A synthetic vendor, with the longest name the reads lengthen to. */
const SYNTHETIC_VENDOR = {
	id: "8f0f0000-0000-4000-8000-000000000001",
	owner_user_id: SYNTHETIC_REQUEST_ID,
	name: "Northwest Plumbing Heating & Air Conditioning Services LLC",
	email: "maximiliana.vandenberghe-montgomery@outlook.com",
	phone: "+1 (555) 555-0123",
	trade: "plumbing",
	hourly_rate: 125,
	status: "active",
	notes: null,
	created_at: "2026-11-01T00:00:00Z",
	updated_at: "2026-11-01T00:00:00Z",
};

/** A 1600x1000 PNG, the synthetic document and images' bytes. */
function syntheticPng(): Buffer {
	const chunk = (type: string, data: Buffer) => {
		const body = Buffer.concat([Buffer.from(type), data]);
		const out = Buffer.alloc(body.length + 8);
		out.writeUInt32BE(data.length, 0);
		body.copy(out, 4);
		out.writeUInt32BE(crc32(body), body.length + 4);
		return out;
	};
	const width = 1600;
	const height = 1000;
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header.set([8, 2, 0, 0, 0], 8);
	const row = Buffer.concat([
		Buffer.from([0]),
		Buffer.alloc(width * 3, Buffer.from([70, 110, 90])),
	]);
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(Buffer.concat(Array(height).fill(row)))),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

/**
 * Answers, in the browser, the reads that show what owner A has none of
 * (each a GET or a read RPC, never sent): a vendor, a maintenance request
 * (the List view's read), a document on owner A's newest property with its
 * signed URL (the storage sign POST, a read) and its file, the vault's search,
 * three property images and their optimized files, two ledger entries, an
 * emergency contact, two other sessions and an active application link on
 * owner A's newest unit.
 */
async function answerSyntheticRows(
	page: Page,
	ids: { property: string; unit: string },
): Promise<void> {
	const png = syntheticPng();
	const rows = (route: Route, body: unknown[]) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			headers: {
				"content-range": `0-${body.length - 1}/${body.length}`,
				"access-control-expose-headers": "content-range",
			},
			body: JSON.stringify(body),
		});
	const get = (pattern: RegExp, body: unknown[]) =>
		page.route(pattern, (route) =>
			route.request().method() === "GET" ? rows(route, body) : route.fallback(),
		);
	const rpc = (name: string, body: unknown) =>
		page.route(new RegExp(`/rest/v1/rpc/${name}$`), (route) =>
			route.request().method() === "POST"
				? route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(body),
					})
				: route.fallback(),
		);
	const filePath = `property/${ids.property}/synthetic.png`;
	const document = {
		id: "8f0f0000-0000-4000-8000-000000000006",
		entity_type: "property",
		entity_id: ids.property,
		document_type: "other",
		mime_type: "image/png",
		file_path: filePath,
		storage_url: filePath,
		file_size: 2048,
		title: "lease-agreement-riverside-gardens-north-tower-unit-1204-signed.pdf",
		tags: null,
		description: null,
		owner_user_id: SYNTHETIC_REQUEST_ID,
		created_at: "2026-11-01T12:00:00Z",
	};
	await get(/\/rest\/v1\/vendors\?/, [SYNTHETIC_VENDOR]);
	await get(/\/rest\/v1\/maintenance_requests\?/, [
		{
			...syntheticRequest(
				{
					id: "8f0f0000-0000-4000-8000-000000000003",
					property_id: ids.property,
				},
				"8f0f0000-0000-4000-8000-000000000004",
			),
			tenant: {
				name: "Maximiliana Vandenberghe-Montgomery",
				first_name: null,
				last_name: null,
			},
		},
	]);
	await get(
		new RegExp(`/rest/v1/documents\\?.*entity_id=eq\\.${ids.property}`),
		[document],
	);
	await rpc("search_documents", [{ ...document, total_count: 1 }]);
	await page.route(/\/storage\/v1\/object\/sign\/tenant-documents/, (route) => {
		const request = route.request();
		if (request.method() === "POST") {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{
						error: null,
						path: filePath,
						signedURL: `/object/sign/tenant-documents/${filePath}?token=synthetic`,
					},
				]),
			});
		}
		return route.fulfill({ status: 200, contentType: "image/png", body: png });
	});
	await get(
		/\/rest\/v1\/property_images\?/,
		[0, 1, 2].map((i) => ({
			id: `8f0f0000-0000-4000-8000-00000000001${i}`,
			property_id: ids.property,
			image_url: `${ids.property}/synthetic-${i}.png`,
			display_order: i,
			created_at: "2026-11-01T12:00:00Z",
		})),
	);
	await page.route(/\/_next\/image\?/, (route) =>
		route.fulfill({ status: 200, contentType: "image/png", body: png }),
	);
	await rpc("get_lease_ledger", [
		{
			id: "8f0f0000-0000-4000-8000-000000000020",
			kind: "charge",
			type: "rent",
			amount: 1_234_567,
			entry_date: "2026-11-01",
			due_date: "2026-11-01",
			description:
				"The tenant reports water leaking through the kitchen ceiling",
			method: null,
			reverses_id: null,
			charge_id: null,
			receipts_sum: 0,
		},
		{
			id: "8f0f0000-0000-4000-8000-000000000021",
			kind: "receipt",
			type: null,
			amount: 1_234_567,
			entry_date: "2026-11-03",
			due_date: null,
			description: null,
			method: "check",
			reverses_id: null,
			charge_id: "8f0f0000-0000-4000-8000-000000000020",
			receipts_sum: 0,
		},
	]);
	await get(/\/rest\/v1\/users\?select=emergency_contact_name/, [
		{
			emergency_contact_name: "Maximiliana Vandenberghe-Montgomery",
			emergency_contact_phone: "+1 (555) 555-0123",
			emergency_contact_relationship: "Sister-in-law and property co-manager",
		},
	]);
	await rpc(
		"get_user_sessions",
		[
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		].map((agent, i) => ({
			id: `8f0f0000-0000-4000-8000-00000000003${i}`,
			user_id: SYNTHETIC_REQUEST_ID,
			created_at: "2026-10-01T00:00:00Z",
			updated_at: "2026-11-07T00:00:00Z",
			user_agent: agent,
			ip: "203.0.113.5",
		})),
	);
	await get(/\/rest\/v1\/rental_application_links\?/, [
		{
			id: "8f0f0000-0000-4000-8000-000000000040",
			unit_id: ids.unit,
			raw_token: "synthetic-token",
			expires_at: "2027-01-01T00:00:00Z",
			revoked_at: null,
			submission_count: 3,
			created_at: "2026-11-01T00:00:00Z",
		},
	]);
}

/** A verified TOTP factor, as GET /auth/v1/user lists one. Never enrolled. */
const VERIFIED_FACTOR = {
	id: "8f0f0000-0000-4000-8000-0000000000f1",
	friendly_name: "Authenticator",
	factor_type: "totp",
	status: "verified",
	created_at: "2026-10-01T12:00:00Z",
	updated_at: "2026-10-01T12:00:00Z",
};

test(`a positioned overlay keeps its place when the viewport changes`, async ({
	page,
	context,
}) => {
	// 66.2-39 fix round 4, Part 8f: the lease wizard's property list (Dice UI,
	// placed by top and left) took its width from wherever it last sat, and
	// under reduced motion read its own size a frame late, so after a change
	// of viewport, open or closed, it sat narrower and off its place. Its box
	// after 1280 to 390, open and closed, is the box a page loaded at 390
	// gives it (Part 8f's sweep measured every kind across 23 changes).
	test.setTimeout(60_000);
	await signIn(page, context);
	await page.setViewportSize({ width: 390, height: 800 });
	await page.goto("/leases/new");
	const trigger = page.locator('[data-slot="combobox-trigger"]').first();
	const list = page.locator('[data-slot="combobox-content"]');
	const failures: string[] = [];
	const at = (box: { x: number; width: number }) =>
		`x ${Math.round(box.x * 100) / 100}, ${Math.round(box.width * 100) / 100}px wide`;
	const read = async (state: string) => {
		failures.push(...reflowFailures(state, await readReflow(page, "overlay")));
		return boxOf(list);
	};
	const open = async (state: string) => {
		await trigger.click();
		await expect(list).toBeVisible();
		return read(state);
	};
	const close = async () => {
		await page.keyboard.press("Escape");
		await expect(list).toBeHidden();
	};
	const fresh = await open("the property list, on a page loaded at 390");
	await close();
	await page.setViewportSize({ width: 1280, height: 800 });
	await open("the property list, opened at 1280");
	await page.setViewportSize({ width: 390, height: 800 });
	const live = await read("the property list, open from 1280 to 390");
	await close();
	await page.setViewportSize({ width: 1280, height: 800 });
	await open("the property list, opened at 1280 again");
	await close();
	await page.setViewportSize({ width: 390, height: 800 });
	const reopened = await open("the property list, reopened at 390 after 1280");
	await close();
	for (const [state, box] of [
		["open from 1280 to 390", live],
		["reopened at 390 after 1280", reopened],
	] as const) {
		if (
			Math.abs(box.x - fresh.x) > 1 ||
			Math.abs(box.width - fresh.width) > 1
		) {
			failures.push(
				`the property list ${state}: ${at(box)}; a page loaded at 390 opens it at ${at(fresh)}`,
			);
		}
	}
	expect(failures, failures.join("\n")).toEqual([]);
});

/**
 * Answers each bulk import's row inserts in the browser (never sent): a POST
 * to properties, tenants or units, or the bulk_import_create_lease RPC. The
 * first row of each import is a rejected duplicate (23505), the rest succeed,
 * as PostgREST answers them: an insert with no select is a 201 with no body,
 * the RPC a JSON uuid.
 */
async function answerImports(page: Page): Promise<{ answered: number }> {
	const traffic = { answered: 0 };
	const seen = new Set<string>();
	await page.route(
		/\/rest\/v1\/(properties|tenants|units|rpc\/bulk_import_create_lease)(\?|$)/,
		(route) => {
			const request = route.request();
			if (request.method() !== "POST") return route.fallback();
			traffic.answered += 1;
			const path = new URL(request.url()).pathname;
			if (!seen.has(path)) {
				seen.add(path);
				return route.fulfill({
					status: 409,
					contentType: "application/json",
					body: JSON.stringify({
						code: "23505",
						message: "duplicate key value violates unique constraint",
						details: null,
						hint: null,
					}),
				});
			}
			return path.endsWith("bulk_import_create_lease")
				? route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(
							`8f0f0000-0000-4000-8000-${String(traffic.answered).padStart(12, "0")}`,
						),
					})
				: route.fulfill({ status: 201, body: "" });
		},
	);
	return traffic;
}

/**
 * Each bulk import: its page, its control's name, a CSV with long and invalid
 * rows (the validate step), and one of six long valid rows (the result step).
 * The units' rent is 99,999, the largest the import takes (UNIT_RENT_MAXIMUM).
 */
function BULK_IMPORTS(property: string): [string, string, string, string][] {
	const entry = (
		path: string,
		control: string,
		header: string,
		good: (i: number) => string,
		bad: string,
	): [string, string, string, string] => [
		path,
		control,
		[
			header,
			...Array.from({ length: 8 }, (_, i) => (i % 4 === 3 ? bad : good(i))),
		].join("\n"),
		[header, ...Array.from({ length: 6 }, (_, i) => good(i))].join("\n"),
	];
	return [
		entry(
			"/properties",
			"Bulk Import",
			"name,address_line1,address_line2,city,state,postal_code,country,property_type",
			(i) =>
				`Riverside Gardens Apartment Community North Tower ${i},12345 Northwest Riverside Gardens Boulevard,Building C Suite 1200,Rancho Santa Margarita,CA,92688,US,APARTMENT`,
			"Bad Row,,,,ZZ,abc,US,CASTLE",
		),
		entry(
			"/tenants",
			"Import Tenants",
			"email,first_name,last_name,phone,status",
			(i) =>
				`maximiliana.vandenberghe-montgomery${i}@outlook.com,Maximiliana,Vandenberghe-Montgomery,+1 (555) 555-0123,active`,
			"not-an-email,,,,unknown",
		),
		entry(
			"/leases",
			"Import Leases",
			"unit_id,primary_tenant_id,start_date,end_date,rent_amount,security_deposit,payment_day,rent_currency",
			(i) =>
				`8e0e0000-0000-4000-8000-00000000020${i},8e0e0000-0000-4000-8000-00000000030${i},2026-12-01,2027-11-30,999999,999999,1,USD`,
			"nope,nope,2027-01-01,2026-01-01,abc,,40,XX",
		),
		entry(
			`/properties/${property}`,
			"Import Units",
			"unit_number,rent_amount,bedrooms,bathrooms,square_feet,status",
			(i) => `PH-120${i}-North,99999,4,3.5,12345,available`,
			"U9,-5,x,,,haunted",
		),
	];
}
