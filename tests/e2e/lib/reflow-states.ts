import {
	type BrowserContext,
	expect,
	type Page,
	type Route,
} from "@playwright/test";
import { REFLOW_OVERLAYS, readReflow } from "./measure";

/**
 * The states a page reaches from its visible controls, for the reflow guard
 * (66.2-39 fix round 4, Part 8e). `owner-reflow-320.spec.ts` measured each
 * listed route's first render only, with owner A's data: it passed while the
 * lease wizard's review step ran $1,500.00 into the next term and its Create
 * Draft Lease button pushed the page to 341px, and while a maintenance
 * request's header did the same, because the review step is three steps in,
 * and owner A has no maintenance request, so its pages were skipped. This
 * module reaches those states:
 *   - `answerReadsLong` answers every Supabase read in the browser with
 *     production's body lengthened (strings by key, figures to seven digits);
 *     `blockWrites` fulfills or aborts every other request that is not a read,
 *     so no write reaches production from a state the guard opens;
 *   - `measureEachTrigger` opens every dialog, sheet, menu, popover, select,
 *     tooltip, accordion, tab and view control the page (or a region, the
 *     header) shows, the controls a tab's panel adds, and one level inside an
 *     open dialog, one control per row column or list item, and reads each
 *     state with `readReflow`. A plain button (no ARIA trigger state) counts
 *     only when its name starts with a verb that opens something (a plan
 *     card's Upgrade or Downgrade opens the plan dialog on /billing/plans;
 *     /pricing's Start free opens the subscribe dialog for a visitor, and
 *     the public spec is signed out) and it is outside a form: a `<button>`
 *     with no `type` is `type="submit"`, so the element's `type` property
 *     cannot tell them apart. A control whose name says it deletes, sends,
 *     signs out or publishes is never pressed, with one exception (Part 8f):
 *     an ARIA dialog trigger (`aria-haspopup="dialog"` or a `dialog-trigger`
 *     / `alert-dialog-trigger` slot) opens its confirmation, since pressing
 *     it opens a dialog and nothing else; nothing inside an `alertdialog` is
 *     ever pressed. A tooltip trigger is focused, never pressed, whatever its
 *     name.
 *
 * Controls are pressed only when they open a state. A control whose press only issues a
 * request is not a state, so it is never pressed: one that builds or fetches
 * a file (pdf, download, export, print, generate), and the billing-portal
 * controls Manage Plan, Manage Subscription and View All Invoices, each a
 * POST to the billing-portal Edge Function and then a navigation away from
 * the app (66.2-39 fix round 4, Part 8f, a main-session decision).
 * `blockWrites` stays the boundary for anything pressed.
 */

/** Long values a read's string fields take, by key. */
const LONG_TEXT: readonly (readonly [RegExp, string])[] = [
	[
		/^(name|property_name|propertyName)$/,
		"Riverside Gardens Apartment Community North Tower",
	],
	[
		/^(title|subject)$/,
		"Water leaking through the kitchen ceiling below the upstairs bathroom",
	],
	[/^first_name$/, "Maximiliana"],
	[/^last_name$/, "Vandenberghe-Montgomery"],
	[/email$/, "maximiliana.vandenberghe-montgomery@outlook.com"],
	[/phone$/, "+1 (555) 555-0123"],
	[
		/^(address|address_line1|street)$/,
		"12345 Northwest Riverside Gardens Boulevard",
	],
	[/^address_line2$/, "Building C, Suite 1200"],
	[/^city$/, "Rancho Santa Margarita"],
	[/^unit_number$/, "PH-1204-North"],
	[
		/^(vendor_name|company_name|business_name|company)$/,
		"Northwest Plumbing Heating & Air Conditioning Services LLC",
	],
	[
		/^(file_name|filename|original_name)$/,
		"lease-agreement-riverside-gardens-north-tower-unit-1204-signed.pdf",
	],
	[
		/^(description|notes|property_rules|message|body|inspection_findings|reason|comment)$/,
		"The tenant reports water leaking through the kitchen ceiling below the upstairs bathroom after every shower; the drywall is stained and soft near the light fixture.",
	],
	[
		/^(tenant_name|applicant_name|full_name|display_name|contact_name)$/,
		"Maximiliana Vandenberghe-Montgomery",
	],
];

/** Numeric keys that are not figures (ids, dates, counts of rooms, positions). */
const NOT_A_FIGURE =
	/(^id$|_id$|^year|^month$|_month$|^day$|week|version|order|bedrooms|bathrooms|square_feet|sqft|payment_day|^lat|^lng|index|^page|limit|offset|step|score|duration|^x$|^y$|year_built|postal|zip)/i;
const RATE =
	/(rate|percent|pct|occupancy|margin|ratio|utilization|yield|roi|growth|_change$|^change)/i;
const MONEY =
	/(amount|rent|revenue|income|expense|cost|balance|net|profit|price|deposit|paid|due|cash|equity|asset|liabilit|fee|collected|outstanding|owed|spend|spent|value|sum|noi|payment|charge|receipt|loss|gain|flow|budget|^total$)/i;
const COUNT =
	/(count|^num|units|tenants|leases|properties|requests|^open|pending|active|expiring|vacant|occupied|available|overdue|completed|urgent|emergency|inspections|vendors|applications|documents|days|signed|draft|expired|terminated|total)/i;

/**
 * A read's body with its strings lengthened by key (`LONG_TEXT`) and its
 * figures at seven digits: money $1,234,567, counts 1,234, rates 100%.
 * Enumerated strings (status, type, slug) and non-figure numbers stay.
 */
export function lengthenRead(value: unknown, key = "", parent = ""): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => lengthenRead(item, key, parent));
	}
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, lengthenRead(v, k, key)]),
		);
	}
	if (typeof value === "string") {
		if (value === "" || key === "") return value;
		const long = LONG_TEXT.find(([pattern]) => pattern.test(key));
		return long ? long[1] : value;
	}
	if (typeof value !== "number" || key === "" || NOT_A_FIGURE.test(key)) {
		return value;
	}
	if (RATE.test(key)) {
		return Math.abs(value) <= 1 && !Number.isInteger(value) ? 1 : 100;
	}
	if (MONEY.test(key) || (MONEY.test(parent) && !COUNT.test(key))) {
		return 1_234_567;
	}
	if (COUNT.test(key)) return 1234;
	return value;
}

const READ_RPC = /^\/rest\/v1\/rpc\/(get_|search_)/;

function isSupabase(url: URL): boolean {
	return url.hostname.endsWith(".supabase.co");
}

/**
 * Every request that is not a read, to every host, the app's own origin
 * included (a Next server action is a POST to the page), is fulfilled
 * (Supabase: a 400, as a rejected write) or aborted, so no state the guard
 * opens writes to production. Reads pass: GET, HEAD, OPTIONS and POST
 * `rpc/get_*` / `rpc/search_*`. The session refresh grant and storage signing
 * are aborted.
 */
export async function blockWrites(
	context: BrowserContext,
): Promise<{ fulfilled: number; aborted: number }> {
	const traffic = { fulfilled: 0, aborted: 0 };
	await context.route("**/*", (route) => {
		const request = route.request();
		const method = request.method();
		if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
			return route.fallback();
		}
		const url = new URL(request.url());
		if (isSupabase(url) && method === "POST" && READ_RPC.test(url.pathname)) {
			return route.fallback();
		}
		if (
			isSupabase(url) &&
			url.pathname !== "/auth/v1/token" &&
			!url.pathname.startsWith("/storage/")
		) {
			traffic.fulfilled += 1;
			return route.fulfill({
				status: 400,
				contentType: "application/json",
				body: JSON.stringify({
					code: "P0001",
					message: "e2e write rejected",
					details: null,
					hint: null,
				}),
			});
		}
		traffic.aborted += 1;
		return route.abort("blockedbyclient");
	});
	return traffic;
}

/**
 * The page reads the session cookie's user with `set` merged in (a verified
 * MFA factor): `getAuthenticatorAssuranceLevel` reads the stored session, and
 * @supabase/ssr stores it in `document.cookie`. Only the page's reads change;
 * the cookie the browser sends is the real one, so the proxy sees owner A as
 * it is. `listFactors` reads the user over the network, so GET /auth/v1/user is
 * answered with production's user and the same fields.
 */
export async function withSessionUser(
	context: BrowserContext,
	set: Record<string, unknown>,
): Promise<void> {
	await context.addInitScript((fields) => {
		const native = Object.getOwnPropertyDescriptor(
			Document.prototype,
			"cookie",
		);
		if (!native?.get || !native.set) return;
		const read = native.get;
		const write = native.set;
		const token = /^sb-.+-auth-token(\.\d+)?$/;
		const index = (name: string) => Number(name.match(/\.(\d+)$/)?.[1] ?? -1);
		Object.defineProperty(Document.prototype, "cookie", {
			configurable: true,
			get(this: Document) {
				const raw: string = read.call(this);
				const jar = raw
					.split("; ")
					.filter(Boolean)
					.map((c) => [
						c.slice(0, c.indexOf("=")),
						c.slice(c.indexOf("=") + 1),
					]);
				const parts = jar
					.filter(([name]) => token.test(name ?? ""))
					.sort((a, b) => index(a[0] ?? "") - index(b[0] ?? ""));
				const key = parts[0]?.[0]?.replace(/\.\d+$/, "");
				if (!key) return raw;
				const encoded = parts
					.map(([, value]) => decodeURIComponent(value ?? ""))
					.join("")
					.replace(/^base64-/, "");
				const bytes = Uint8Array.from(
					atob(encoded.replace(/-/g, "+").replace(/_/g, "/")),
					(ch) => ch.charCodeAt(0),
				);
				const session = JSON.parse(new TextDecoder().decode(bytes));
				session.user = { ...session.user, ...fields };
				let binary = "";
				for (const byte of new TextEncoder().encode(JSON.stringify(session))) {
					binary += String.fromCharCode(byte);
				}
				const value = `base64-${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
				const chunks =
					value.length <= 3180
						? [[key, value]]
						: Array.from({ length: Math.ceil(value.length / 3180) }, (_, i) => [
								`${key}.${i}`,
								value.slice(i * 3180, (i + 1) * 3180),
							]);
				return [...jar.filter(([name]) => !token.test(name ?? "")), ...chunks]
					.map(([name, v]) => `${name}=${v}`)
					.join("; ");
			},
			set(this: Document, value: string) {
				write.call(this, value);
			},
		});
	}, set);
	await context.route(/\.supabase\.co\/auth\/v1\/user(\?|$)/, async (route) => {
		if (route.request().method() !== "GET") return route.fallback();
		try {
			const response = await route.fetch();
			const user = (await response.json()) as Record<string, unknown>;
			const headers = { ...response.headers() };
			delete headers["content-encoding"];
			delete headers["content-length"];
			await route.fulfill({
				status: response.status(),
				headers,
				body: JSON.stringify({ ...user, ...set }),
			});
		} catch {
			// The page moved on (or the read failed): nothing to answer.
			await route.abort("failed").catch(() => {});
		}
	});
}

interface ReadAnswer {
	status: number;
	headers: Record<string, string>;
	body: string;
}

/**
 * Answers every Supabase REST read (GET, and POST `rpc/get_*` /
 * `rpc/search_*`) in the browser with production's body lengthened
 * (`lengthenRead`). Production is read once per URL and request body; a
 * repeat read gets the same answer, so a refetch in flight when the page
 * moves on holds no production response a navigation can dispose of. A read
 * whose fetch fails is aborted.
 */
export async function answerReadsLong(
	context: BrowserContext,
): Promise<{ answered: number }> {
	const traffic = { answered: 0 };
	const answers = new Map<string, Promise<ReadAnswer>>();
	const fetchLong = async (route: Route): Promise<ReadAnswer> => {
		const response = await route.fetch();
		const text = await response.text();
		const headers = { ...response.headers() };
		// route.fetch() returns the decoded body; the encoding no longer applies.
		delete headers["content-encoding"];
		delete headers["content-length"];
		let body = text;
		try {
			body = JSON.stringify(lengthenRead(JSON.parse(text)));
		} catch {
			// Not JSON (an empty HEAD body): answered as production sent it.
		}
		return { status: response.status(), headers, body };
	};
	await context.route(/\.supabase\.co\/rest\/v1\//, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const read =
			request.method() === "GET" ||
			(request.method() === "POST" && READ_RPC.test(url.pathname));
		if (!read) return route.fallback();
		const key = `${request.method()} ${request.url()} ${request.postData() ?? ""} ${request.headers().accept ?? ""}`;
		let answer = answers.get(key);
		if (!answer) {
			answer = fetchLong(route);
			answers.set(key, answer);
		}
		try {
			const ready = await answer;
			traffic.answered += 1;
			await route.fulfill(ready);
		} catch {
			answers.delete(key);
			await route.abort("failed").catch(() => {});
		}
	});
	return traffic;
}

/** A control `measureEachTrigger` found, and how it finds it again. */
interface Trigger {
	key: string;
	nth: number;
	kind: string;
	name: string;
	popup: string | null;
}

/** Poll intervals for a state change the page makes at once (reduced motion). */
const FAST = [25, 50, 100, 250];

const TRIGGERS =
	'[aria-haspopup]:not([aria-haspopup="false"]), [aria-expanded], [data-slot$="-trigger"], [role="tab"], [data-slot="toggle-group-item"], [aria-pressed], button';

/**
 * A control the guard never presses: it deletes, sends, signs out or
 * publishes. An ARIA dialog trigger with such a name opens its confirmation
 * (`opensDialog`); a tooltip trigger is focused.
 */
const DESTRUCTIVE =
	/\b(delete|remove|sign ?out|log ?out|send|publish|terminate|cancel subscription|deactivate|archive|discard|revoke|decline|reject)\b/i;

/** Whether pressing the trigger only opens a dialog (an ARIA dialog trigger). */
function opensDialog(trigger: Trigger): boolean {
	return (
		trigger.popup === "dialog" ||
		trigger.kind === "dialog-trigger" ||
		trigger.kind === "alert-dialog-trigger"
	);
}

/**
 * The in-page half of the trigger driver, one function so the key a control
 * is found by is computed one way (`page.evaluate` takes no closures):
 *   - "list": the visible controls under `root` that open a state,
 *     deduplicated (one per row column, one per name). A plain button counts
 *     only when its name says it opens something and it is not in a form;
 *     inside a dialog only ARIA triggers count;
 *   - "mark": marks the control `key`/`nth` with `data-reflow-trigger`;
 *   - "selected": the tab selected in the tablist of the tab `key`/`nth`.
 */
function triggerQuery(arg: {
	op: "list" | "mark" | "selected";
	root: string | null;
	selector: string;
	plain?: boolean;
	key?: string;
	nth?: number;
}): Trigger[] {
	const OPENER =
		/^(add|new|record|edit|view|schedule|reschedule|renew|rename|move out|rent increase|track|bulk|details|open|preview|manage|assign|change|set up|filter|filters|columns|show|more|select|choose|browse|customize|contact|see|learn|compare|start tracking|enable$|upgrade$|downgrade$|start free$)\b/i;
	const keyOf = (el: Element) => {
		const name = (
			el.getAttribute("aria-label") ||
			el.textContent ||
			el.getAttribute("title") ||
			""
		)
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 80);
		const kind =
			el.getAttribute("data-slot") ||
			el.getAttribute("role") ||
			el.tagName.toLowerCase();
		const row = el.closest("tr, [role='row']");
		const cell = row
			? [...row.children].findIndex((child) => child.contains(el))
			: -1;
		let norm = name.replace(/\bfor\b.*$/i, "for …").replace(/\d+/g, "#");
		if (kind === "checkbox" || el.getAttribute("role") === "checkbox") {
			norm = row ? "" : el.closest('[data-slot="card"]') ? "card" : norm;
		}
		// A list's per-item control ("Rename Insurance"): one per verb.
		if (el.closest("li, [role='listitem']") && /^\w+ \S/.test(norm)) {
			norm = `item: ${norm.split(" ")[0]}`;
		}
		if (row) norm = `row cell ${cell}: ${norm}`;
		return {
			key: `${kind}|${el.getAttribute("aria-haspopup") ?? ""}|${norm}`,
			name,
			kind,
		};
	};
	for (const old of document.querySelectorAll("[data-reflow-trigger]")) {
		old.removeAttribute("data-reflow-trigger");
	}
	const scope = arg.root
		? document.querySelector(arg.root)
		: document.querySelector("main");
	if (!scope) return [];
	const all = [...scope.querySelectorAll(arg.selector)];
	const keys = all.map(keyOf);
	const describe = (index: number): Trigger => {
		const el = all[index] as Element;
		const { key, name, kind } = keys[index] as ReturnType<typeof keyOf>;
		const nth = keys.slice(0, index).filter((k) => k.key === key).length;
		return { key, nth, kind, name, popup: el.getAttribute("aria-haspopup") };
	};
	const found = keys
		.map((k, index) => (k.key === arg.key ? index : -1))
		.filter((index) => index >= 0)[arg.nth ?? 0];
	if (arg.op === "mark") {
		const el = found === undefined ? undefined : all[found];
		if (!el?.checkVisibility({ visibilityProperty: true })) return [];
		el.setAttribute("data-reflow-trigger", "");
		return [describe(found as number)];
	}
	if (arg.op === "selected") {
		const selected = (found === undefined ? undefined : all[found])
			?.closest('[role="tablist"]')
			?.querySelector('[role="tab"][aria-selected="true"]');
		const index = selected ? all.indexOf(selected) : -1;
		return index >= 0 ? [describe(index)] : [];
	}
	const seen = new Map<string, Trigger>();
	for (const [index, el] of all.entries()) {
		if (!el.checkVisibility({ visibilityProperty: true })) continue;
		if (el.matches("[disabled], [aria-disabled='true']")) continue;
		if (el.tagName === "A" && !el.hasAttribute("aria-haspopup")) continue;
		if (
			el.getAttribute("role") === "tab" &&
			el.getAttribute("aria-selected") === "true"
		) {
			continue;
		}
		const trigger = describe(index);
		const plain =
			el.tagName === "BUTTON" &&
			!el.matches(arg.selector.replace(/, button$/, ""));
		if (
			plain &&
			(!arg.plain ||
				// A file it builds or fetches (a PDF preview, an export), or the
				// billing portal it opens, is a request, not a state.
				/\b(pdf|download|export|print|generate)\b/i.test(trigger.name) ||
				/^(manage plan|manage subscription|view all invoices)$/i.test(
					trigger.name,
				) ||
				el.getAttribute("type") === "submit" ||
				el.closest("form") ||
				!OPENER.test(trigger.name))
		) {
			continue;
		}
		if (!seen.has(trigger.key)) seen.set(trigger.key, trigger);
	}
	return [...seen.values()];
}

/** Whether an overlay is open, and whether it is a popper (menu, listbox, popover, tooltip). */
function overlayState(selector: string): {
	open: boolean;
	popper: boolean;
	dialog: boolean;
	alert: boolean;
} {
	const open = [...document.querySelectorAll(selector)].filter(
		(o) => o.getClientRects().length > 0,
	);
	const last = open.at(-1);
	return {
		open: open.length > 0,
		popper: !!last?.closest("[data-radix-popper-content-wrapper]"),
		dialog: open.some(
			(o) =>
				!o.closest("[data-radix-popper-content-wrapper]") &&
				(o.getAttribute("role") === "dialog" ||
					o.getAttribute("role") === "alertdialog"),
		),
		alert: open.some((o) => o.getAttribute("role") === "alertdialog"),
	};
}

async function closeOverlays(page: Page): Promise<void> {
	const isOpen = () =>
		page.evaluate(overlayState, REFLOW_OVERLAYS).then((state) => state.open);
	// A nested layer (a select inside a dialog) takes one Escape per layer.
	for (let layer = 0; layer < 3 && (await isOpen()); layer += 1) {
		await page.keyboard.press("Escape");
		await expect
			.poll(isOpen, { timeout: 2000, intervals: FAST })
			.toBe(false)
			.catch(() => {});
	}
	await page.mouse.move(0, 0);
}

/**
 * Presses one trigger and waits for what it opens: an overlay, an expanded or
 * selected state. Returns false when the trigger is no longer on the page.
 */
async function pressTrigger(
	page: Page,
	trigger: Trigger,
	root: string | null,
): Promise<boolean> {
	const found = await page.evaluate(triggerQuery, {
		op: "mark" as const,
		root,
		selector: TRIGGERS,
		key: trigger.key,
		nth: trigger.nth,
	});
	if (found.length === 0) return false;
	const control = page.locator("[data-reflow-trigger]");
	const home = page.url();
	// A tooltip opens on focus as on hover, and focus is not intercepted by
	// whatever sits over the trigger.
	if (trigger.kind === "tooltip-trigger") await control.focus();
	else await control.click();
	// An ARIA trigger states what it opened; a plain button shows an overlay
	// or navigates (an intercepted modal), or changed the page at once.
	const aria = trigger.kind !== "button";
	await expect
		.poll(
			() =>
				page.evaluate(
					({ selector, home }) => {
						const el = document.querySelector("[data-reflow-trigger]");
						return (
							document.querySelectorAll(selector).length > 0 ||
							location.href !== home ||
							el?.getAttribute("aria-expanded") === "true" ||
							el?.getAttribute("aria-selected") === "true" ||
							el?.getAttribute("aria-pressed") === "true" ||
							/open/.test(el?.getAttribute("data-state") ?? "") ||
							el?.getAttribute("data-state") === "on"
						);
					},
					{ selector: REFLOW_OVERLAYS, home },
				),
			{ timeout: aria ? 3000 : 1000, intervals: FAST },
		)
		.toBe(true)
		.catch(() => {});
	if (page.url() !== home) {
		// A navigation that opens a modal: wait for it, or for the page.
		await expect
			.poll(
				() =>
					page.evaluate(
						(selector) => document.querySelectorAll(selector).length > 0,
						REFLOW_OVERLAYS,
					),
				{ timeout: 1500, intervals: FAST },
			)
			.toBe(true)
			.catch(() => {});
	}
	return true;
}

/**
 * Opens every trigger `triggerQuery` lists on the page as it is now (and,
 * inside an open dialog or sheet, that dialog's own ARIA triggers), reads each
 * state with `readReflow`, and puts the page back: Escape for an overlay,
 * the page's own URL again after a tab, a view or a navigation. Returns every
 * state with its problems, for the caller to assert on together.
 */
export async function measureEachTrigger(
	page: Page,
	options: {
		label: string;
		root?: string | null;
		/** The page's region to list controls in (main by default; the header). */
		region?: string;
		seen?: Set<string>;
		/**
		 * Controls already measured on this pathname by an earlier route of the
		 * same test (`/settings?tab=billing` shows the tabs `/settings` did).
		 */
		measured?: Set<string>;
	} = {
		label: "",
	},
): Promise<{ state: string; problems: string[] }[]> {
	const root = options.root ?? null;
	const scope = root ?? options.region ?? null;
	const home = page.url();
	const results: { state: string; problems: string[] }[] = [];
	const triggers = await page.evaluate(triggerQuery, {
		op: "list" as const,
		root: scope,
		selector: TRIGGERS,
		plain: root === null,
	});
	// The keys measured on this page: a tab's panel opens only its own.
	const seen = options.seen ?? new Set<string>();
	const pathname = new URL(home).pathname;
	const measured = options.measured ?? new Set<string>();
	const fresh = triggers.filter(
		(trigger) =>
			!seen.has(trigger.key) && !measured.has(`${pathname}|${trigger.key}`),
	);
	for (const trigger of fresh) measured.add(`${pathname}|${trigger.key}`);
	for (const trigger of fresh) seen.add(trigger.key);
	for (const trigger of fresh) {
		if (NAVIGATES.has(trigger.key)) continue;
		if (
			DESTRUCTIVE.test(trigger.name) &&
			!opensDialog(trigger) &&
			trigger.kind !== "tooltip-trigger"
		) {
			continue;
		}
		const state = `${options.label}${trigger.kind} "${trigger.name}"`;
		// A tab is put back by pressing the tab that was selected before it.
		const selectedTab =
			trigger.kind === "tab" || trigger.kind === "tabs-trigger"
				? ((
						await page.evaluate(triggerQuery, {
							op: "selected" as const,
							root: scope,
							selector: TRIGGERS,
							key: trigger.key,
							nth: trigger.nth,
						})
					)[0] ?? null)
				: null;
		if (!(await pressTrigger(page, trigger, scope))) continue;
		const overlay = await page.evaluate(overlayState, REFLOW_OVERLAYS);
		if (!overlay.open && page.url() !== home) {
			// It navigated: the page it reached is measured as its own route,
			// and the control is not pressed again on another route.
			NAVIGATES.add(trigger.key);
			await page.goto(home);
			await readReflow(page, "page");
			continue;
		}
		const reading = await readReflow(page, overlay.open ? "overlay" : "page");
		results.push({ state, problems: reading.problems });
		// A confirmation (an alertdialog) is read, and nothing in it pressed.
		if (overlay.dialog && !overlay.alert && root === null) {
			results.push(
				...(await measureEachTrigger(page, {
					label: `${state} > `,
					root: '[role="dialog"], [role="alertdialog"]',
					measured,
				})),
			);
		}
		if (selectedTab && !overlay.open && root === null) {
			// The tab's panel: the controls it shows that the page did not.
			results.push(
				...(await measureEachTrigger(page, {
					label: `${state} > `,
					seen,
					measured,
				})),
			);
		}
		if (root !== null) {
			// Inside a dialog: close only what this trigger opened.
			if (overlay.popper) await page.keyboard.press("Escape");
			continue;
		}
		await closeOverlays(page);
		// An intercepted modal closes by going back to the page.
		await expect
			.poll(() => page.url(), { timeout: 3000, intervals: FAST })
			.toBe(home)
			.catch(() => {});
		const restored =
			page.url() === home &&
			(!selectedTab || (await pressTrigger(page, selectedTab, scope)));
		if (!restored) {
			await page.goto(home);
			await readReflow(page, "page");
		}
	}
	return results;
}

/**
 * Keys of controls whose press navigated: the page each reaches is a route of
 * its own, so later routes do not press them again (the settings tabs on each
 * settings route).
 */
const NAVIGATES = new Set<string>();
