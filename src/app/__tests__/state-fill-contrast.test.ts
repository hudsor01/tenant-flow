/**
 * Every interactive state keeps its label legible (WCAG 1.4.3 in each state;
 * 66.2-39 fix round 1, part F, status-colors.md section 7).
 *
 * For each class string in shipped `src/` (no tests, `src/test/`), every state
 * chain that sets a fill or a label (`hover`, `focus`, `focus-visible`,
 * `active`, `data-[state=…]`, `data-highlighted`, `data-[selected=true]`,
 * `aria-*`, `group-hover`, under a compound selector too) is paired as the
 * cascade pairs it (`state-fill-pairs.ts`) and measured from the globals.css
 * token values over the page, card and popover surfaces, in both themes. A
 * label must clear 4.5:1. An inherited label is read as both `foreground` and
 * `muted-foreground`.
 *
 * A Button's element carries more than its caller's class string: Button merges
 * the caller's `className` into the variant's classes with `cn`, so a caller
 * that sets only a hover label keeps the variant's hover fill (66.2-39 fix
 * round 3, F58, F60). Every Button site (`#test/utils/button-sites`, wrappers
 * such as the sidebar trigger included) is therefore also measured on the
 * merged class string Button renders (`buttonClasses`: `cn(buttonVariants({
 * variant, size, className }))`), for each class string its caller can pass.
 *
 * A class string cannot show what its element carries, so three reviewed lists
 * name the states the string alone mis-reads. Each entry must still match, and
 * an icon-only entry must clear its own 3:1 (WCAG 1.4.11). LABEL_ELSEWHERE never
 * applies to a merged Button string, which is the element's whole class:
 * - ICON_ONLY: the state's label is an icon, the control's only content;
 * - LABEL_ELSEWHERE: the label color is set in another class string of the
 *   same element, given here and measured;
 * - NO_LABEL: the fill carries no text (a switch track, a carousel dot), or
 *   the state can never match (a Radix part that sets no `data-state`).
 *
 * A class string also cannot see the fills around its element: a tinted
 * control inside a tinted section paints over both (66.2-39 fix round 4, F1,
 * G32: the canceled subscription section's `bg-destructive/10` left the
 * deletion notice's warning text at 4.40:1 and the Delete Account hover at
 * 4.48, measured 4.38 / 4.46 in Chrome). `STACK_FIXTURES` renders the tinted
 * stacks of this PR's files that the F1 sweep read under 4.5:1 or nearest it
 * (the canceled section; the balance check, 4.66 at its closest), and every
 * text element in them, at rest and in each state on its chain, must clear
 * 4.5:1 over its composited fills (`renderedStacks`).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { BalanceEquationCheck } from "#app/(owner)/reports/balance-sheet/balance-equation-check";
import { ConfirmEmailErrorBanner } from "#app/auth/confirm-email/confirm-email-states";
import { deductionCategories } from "#app/resources/landlord-tax-deduction-tracker/tax-deduction-data";
import { ApplicationStatusBadge } from "#components/applications/application-status-badge";
import { ForgotPasswordModal } from "#components/auth/forgot-password-modal";
import { PlanCard } from "#components/billing/plan-card";
import { BulkImportValidateStep } from "#components/bulk-import/bulk-import-validate-step";
import { SignLeaseForm } from "#components/leases/sign-lease-form";
import { SubscriptionCancelSection } from "#components/settings/sections/subscription-cancel-section";
import { UNAVAILABLE_OUTLINE_BUTTON_CLASSES } from "#components/shared/unavailable-outline-button";
import { Item } from "#components/ui/item";
import { authKeys } from "#hooks/api/use-auth";
import { buttonClasses, buttonSites } from "#test/utils/button-sites";
import {
	classStrings,
	type Paint,
	renderedStacks,
	type StackPair,
	type StatePair,
	splitClass,
	stackContrast,
	statePairs,
	worstStateContrast,
} from "#test/utils/state-fill-pairs";
import { collectG7SourceTexts } from "#test/utils/tailwind-guards";

// The canceled subscription section, rendered as Settings > Billing draws it
// for a canceled plan: its subscription state from the billing hooks, the
// GDPR actions inside it from a seeded deletion-status query.
vi.mock("#hooks/api/use-billing", () => ({
	useSubscriptionStatus: () => ({
		data: {
			subscriptionStatus: "canceled",
			stripeCustomerId: "cus_test",
			stripePriceId: "price_test",
			currentPeriodEnd: "2026-10-15T12:00:00Z",
			cancelAtPeriodEnd: false,
		},
		isLoading: false,
		isError: false,
		refetch: () => undefined,
	}),
}));
vi.mock("#hooks/api/use-billing-mutations", () => ({
	useCancelSubscriptionMutation: () => ({ mutate: () => undefined }),
	useReactivateSubscriptionMutation: () => ({ mutate: () => undefined }),
}));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => {
		throw new Error("the deletion status is seeded; nothing fetches");
	},
}));

const ROOT = process.cwd();
const CSS = readFileSync(resolve(ROOT, "src/app/globals.css"), "utf8");
const COLORS = new Set(
	[...CSS.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1] ?? ""),
);

/** A reviewed state: the file and one source token that identifies it. */
interface Reviewed {
	file: string;
	token: string;
	reason: string;
}

const ICON_ONLY: Reviewed[] = [
	{
		file: "src/components/leases/table/leases-table-columns.tsx",
		token: "hover:text-primary",
		reason: "the RefreshCw Renew icon button, named by aria-label",
	},
	{
		file: "src/components/bulk-import/bulk-import-upload-step.tsx",
		token: "group-hover:bg-primary/15",
		reason: "the Upload icon tile above the dropzone's own text",
	},
];

const LABEL_ELSEWHERE: (Reviewed & { label: Paint })[] = [
	{
		file: "src/components/properties/image-lightbox.tsx",
		token: "hover:bg-black/70",
		label: { token: "white", alpha: 1 },
		reason: "the close button's X icon is text-white",
	},
	{
		file: "src/components/properties/property-image-gallery.tsx",
		token: "group-hover:bg-black/70",
		label: { token: "white", alpha: 1 },
		reason: 'the "+N" overlay text is text-white',
	},
	{
		file: "src/components/ui/stepper-header.tsx",
		token: "data-[state=active]:bg-primary",
		label: { token: "primary-foreground", alpha: 1 },
		reason: "the indicator's number and icon are text-primary-foreground",
	},
];

const NO_LABEL: Reviewed[] = [
	{
		file: "src/components/ui/switch.tsx",
		token: "data-[state=checked]:bg-primary",
		reason: "the switch track; the bg-background thumb is the mark",
	},
	{
		file: "src/components/pricing/bento-pricing-section.tsx",
		token: "data-[state=checked]:bg-primary",
		reason: "the billing-period Switch track override",
	},
	{
		file: "src/components/sections/testimonials-section.tsx",
		token: "hover:bg-muted-foreground/50",
		reason: "a carousel dot button, no text",
	},
	{
		file: "src/components/ui/dialog.tsx",
		token: "data-[state=open]:bg-accent",
		reason:
			"Radix DialogClose sets no data-state, so the upstream class never matches",
	},
];

interface Finding {
	file: string;
	line: number;
	pair: StatePair;
	ratio: number;
	at: string;
	/** Measured on a Button's merged class string, not one literal. */
	merged: boolean;
}

function matches(entry: Reviewed, finding: Finding): boolean {
	return (
		finding.file === entry.file && finding.pair.source.includes(entry.token)
	);
}

function stateFindings(): { checked: number; under: Finding[] } {
	let checked = 0;
	const under: Finding[] = [];
	const measure = (
		path: string,
		line: number,
		text: string,
		merged: boolean,
	) => {
		for (const pair of statePairs(text, COLORS)) {
			checked += 1;
			const { ratio, at } = worstStateContrast(CSS, pair);
			if (ratio < 4.5) {
				under.push({ file: path, line, pair, ratio, at, merged });
			}
		}
	};
	const sources = collectG7SourceTexts(ROOT);
	for (const { path, text } of sources) {
		for (const literal of classStrings(text)) {
			measure(path, literal.line, literal.text, false);
		}
	}
	const sites = buttonSites(new Map(sources.map((s) => [s.path, s.text])));
	for (const site of sites) {
		for (const className of site.classNames) {
			measure(
				site.file,
				site.line,
				buttonClasses(site.variant, site.size, className),
				true,
			);
		}
	}
	return { checked, under };
}

function reviewedFor(f: Finding): Reviewed[] {
	return [...ICON_ONLY, ...(f.merged ? [] : LABEL_ELSEWHERE), ...NO_LABEL];
}

describe("state fills keep their labels at 4.5:1 (66.2-39 fix round 1, part F)", () => {
	const { checked, under } = stateFindings();

	it("measures every state pair in shipped src", () => {
		expect(checked).toBeGreaterThan(400);
	});

	it("leaves no label under 4.5:1 in any state, either theme", () => {
		const unexplained = under
			.filter((f) => !reviewedFor(f).some((entry) => matches(entry, f)))
			.map(
				(f) =>
					`${f.file}:${f.line} ${f.pair.state} ${f.ratio.toFixed(2)} ${f.at} [${f.pair.source.join(" ")}]`,
			);
		expect(unexplained).toEqual([]);
	});

	it("holds an icon-only state at 3:1 and a label set elsewhere at 4.5:1", () => {
		const failures: string[] = [];
		for (const f of under) {
			if (ICON_ONLY.some((entry) => matches(entry, f)) && f.ratio < 3) {
				failures.push(`${f.file}:${f.line} icon ${f.ratio.toFixed(2)} ${f.at}`);
			}
			const elsewhere = f.merged
				? undefined
				: LABEL_ELSEWHERE.find((entry) => matches(entry, f));
			if (elsewhere) {
				const { ratio, at } = worstStateContrast(CSS, f.pair, elsewhere.label);
				if (ratio < 4.5) {
					failures.push(`${f.file}:${f.line} ${ratio.toFixed(2)} ${at}`);
				}
			}
		}
		expect(failures).toEqual([]);
	});

	it("keeps every reviewed entry live", () => {
		const stale = [...ICON_ONLY, ...LABEL_ELSEWHERE, ...NO_LABEL]
			.filter((entry) => !under.some((f) => matches(entry, f)))
			.map((entry) => `${entry.file} ${entry.token}`);
		expect(stale).toEqual([]);
	});

	it("reads the pairs the way the cascade paints them (fixtures)", () => {
		const pairsOf = (classes: string) => statePairs(classes, COLORS);
		const outlineDark = pairsOf(
			"hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50",
		).find((p) => p.theme === "dark");
		expect(outlineDark?.fill).toEqual({ token: "input", alpha: 0.5 });
		expect(outlineDark?.label).toEqual({
			token: "accent-foreground",
			alpha: 1,
		});
		const toggleOnHover = pairsOf(
			"hover:text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary-text",
		).find((p) => p.state === "data-[state=on]:hover" && p.theme === "light");
		expect(toggleOnHover?.fill).toEqual({ token: "primary-text", alpha: 1 });
		expect(toggleOnHover?.label).toEqual({
			token: "primary-foreground",
			alpha: 1,
		});
		const iconOnFocus = pairsOf(
			"focus:bg-accent [&_svg:not([class*='text-'])]:text-muted-foreground focus:[&_svg:not([class*='text-'])]:text-accent-foreground",
		).find((p) => p.state.includes("[&_svg") && p.theme === "dark");
		expect(iconOnFocus?.fill).toEqual({ token: "accent", alpha: 1 });
		// An unavailable outline Button restates its inherited label under the
		// pointer: the merged string's aria-disabled hover reads inherited, not
		// the variant's hover:text-accent-foreground (66.2-39 fix round 4, G15).
		const unavailableHover = pairsOf(
			buttonClasses(
				"outline",
				"sm",
				`gap-1.5 ${UNAVAILABLE_OUTLINE_BUTTON_CLASSES}`,
			),
		).filter((p) => p.state === "aria-disabled:hover");
		expect(unavailableHover.map((p) => [p.theme, p.fill, p.label])).toEqual([
			["light", { token: "background", alpha: 1 }, null],
			["dark", { token: "input", alpha: 0.3 }, null],
		]);
		const failing = pairsOf(
			"bg-primary text-primary-foreground hover:bg-primary/90",
		)
			.filter((p) => p.theme === "light")
			.map((p) => worstStateContrast(CSS, p).ratio);
		expect(Math.min(...failing)).toBeLessThan(4.5);
	});
});

/** The canceled section, with the account's deletion requested or not. */
function canceledSection(deletionRequestedAt: string | null): ReactElement {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});
	client.setQueryData(authKeys.deletionStatus(), {
		deletion_requested_at: deletionRequestedAt,
	});
	return createElement(
		QueryClientProvider,
		{ client },
		createElement(SubscriptionCancelSection),
	);
}

/**
 * The tinted stacks of this PR's files the F1 sweep read under 4.5:1 or
 * nearest it, with the theme surface each sits on and a text it must show (so
 * a fixture that renders something else fails).
 */
const STACK_FIXTURES: {
	name: string;
	surface: string;
	element: () => ReactElement;
	shows: string;
	/** The element renders into a portal: read the whole document body. */
	portal?: boolean;
}[] = [
	{
		name: "canceled section, deletion not requested",
		surface: "background",
		element: () => canceledSection(null),
		shows: "Delete Account",
	},
	{
		name: "canceled section, deletion requested",
		surface: "background",
		element: () => canceledSection("2026-11-01T00:00:00Z"),
		shows: "Account scheduled for deletion",
	},
	{
		name: "balance check, balanced",
		surface: "background",
		element: () =>
			createElement(BalanceEquationCheck, {
				totalAssets: 100,
				totalLiabilities: 40,
				totalEquity: 60,
				isBalanced: true,
			}),
		shows: "Balanced",
	},
	{
		name: "balance check, unbalanced",
		surface: "background",
		element: () =>
			createElement(BalanceEquationCheck, {
				totalAssets: 100,
				totalLiabilities: 40,
				totalEquity: 50,
				isBalanced: false,
			}),
		shows: "Unbalanced",
	},
	// The F1 rendered sweep's tinted-stack failures (66.2-39 fix round 4,
	// Part 5b), each measured in Chrome before and after.
	{
		name: "forgot-password notice (dark read 1.03)",
		surface: "background",
		element: () =>
			withQueryClient(
				createElement(ForgotPasswordModal, {
					open: true,
					onOpenChange: () => undefined,
				}),
			),
		shows: "If an account exists with this email",
		portal: true,
	},
	{
		name: "bulk import, too many rows (dark read 1.01)",
		surface: "background",
		element: () =>
			createElement(BulkImportValidateStep, {
				file: new File(["a"], "properties.csv", { type: "text/csv" }),
				parseResult: { rows: [], tooManyRows: true, totalRowCount: 150 },
				templateHeaders: ["name", "city"],
			}),
		shows: "Too many rows",
	},
	{
		name: "confirm-email expired-link banner (light read 4.29)",
		surface: "background",
		element: () => createElement(ConfirmEmailErrorBanner),
		shows: "Confirmation link expired or invalid",
	},
	{
		name: "signing consent hint (read 2.64 under its row's fade)",
		surface: "background",
		element: () =>
			createElement(SignLeaseForm, {
				token: "probe-token",
				tenantName: "Probe Tenant",
			}),
		shows: "Open the lease above to enable this checkbox.",
	},
	{
		name: "the current plan's success badge on its tinted card (read 4.22)",
		surface: "background",
		element: () =>
			createElement(PlanCard, {
				plan: {
					id: "growth",
					name: "Growth",
					description: "Probe plan",
					price: 29,
					priceId: null,
					features: [{ name: "E-sign", included: true }],
					tier: 2,
				},
				isCurrentPlan: true,
				isMostPopular: true,
				currentTier: 2,
				onSelect: () => undefined,
			}),
		shows: "Probe plan",
	},
	{
		name: "a new application's info badge on its hovered row (read 3.95)",
		surface: "background",
		// application-queue.tsx: each row is an Item rendered as a link.
		element: () =>
			createElement(
				Item,
				{ size: "default", asChild: true },
				createElement(
					"a",
					{ href: "#probe" },
					createElement(ApplicationStatusBadge, { status: "new" }),
				),
			),
		shows: "New",
	},
	...deductionCategories.map((cat) => ({
		name: `tax worksheet, ${cat.category} (read 3.79-4.36 light)`,
		surface: "background",
		// The page's nesting (page.tsx): the category box, its header row and
		// its total row, with the data module's own class strings.
		element: () =>
			createElement(
				"div",
				{ className: `rounded-xl border ${cat.color} overflow-hidden` },
				createElement(
					"table",
					null,
					createElement(
						"tbody",
						null,
						createElement(
							"tr",
							{ className: cat.headerColor },
							createElement("td", null, "Category Total:"),
						),
					),
				),
			),
		shows: "Category Total:",
	})),
];

function withQueryClient(element: ReactElement): ReactElement {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return createElement(QueryClientProvider, { client }, element);
}

describe("text inside a tint keeps 4.5:1 over every fill under it (66.2-39 fix round 4, F1)", () => {
	it.each(STACK_FIXTURES)(
		"$name",
		async ({ element, surface, shows, portal }) => {
			const { container, unmount } = render(element());
			await screen.findByText(shows, { exact: false });
			const stacks = renderedStacks(portal ? document.body : container, COLORS);
			expect(stacks.length).toBeGreaterThan(0);
			const under = stacks
				.map((pair) => ({ pair, ratio: stackContrast(CSS, surface, pair) }))
				.filter(({ ratio }) => ratio < 4.5)
				.map(
					({ pair, ratio }) =>
						`${pair.theme} ${pair.state} "${pair.text}" ${ratio.toFixed(2)} [${pair.layers.map((l) => `${l.token}/${Math.round(l.alpha * 100)}`).join(" > ")}] ${pair.label?.token ?? "inherited"}`,
				);
			unmount();
			expect(under).toEqual([]);
		},
	);

	it("reads the tint under the tint (the canceled section's notice and Delete hover)", async () => {
		const pending = render(canceledSection("2026-11-01T00:00:00Z"));
		await screen.findByText("Account scheduled for deletion");
		const notice = renderedStacks(pending.container, COLORS).find(
			(pair) =>
				pair.text === "Account scheduled for deletion" &&
				pair.theme === "light" &&
				pair.state === "rest",
		);
		expect(notice?.layers.map((l) => l.token)).toEqual([
			"destructive",
			"warning",
		]);
		expect(notice?.label?.token).toBe("warning-text");
		pending.unmount();
		const idle = render(canceledSection(null));
		await screen.findByText("Delete Account");
		const hover = renderedStacks(idle.container, COLORS).find(
			(pair) =>
				pair.text === "Delete Account" &&
				pair.theme === "light" &&
				pair.state === "button:hover",
		);
		expect(hover?.layers.map((l) => l.token)).toEqual([
			"destructive",
			"destructive",
		]);
		expect(hover?.label?.token).toBe("destructive-text");
		idle.unmount();
	});
});

/**
 * A resting label faded by an alpha (`text-<token>/<n>`) paints lighter than
 * its token: the F1 rendered sweep read `text-muted-foreground/70` at 3.20:1
 * (the /login trust strip) and `/50` at 2.12:1 (the tax worksheet's "$")
 * (66.2-39 fix round 4, Part 5b). Every resting faded label in shipped src
 * must clear 4.5:1 over the page, card and popover in both themes, except a
 * reviewed mark that is not text.
 */
const FADED_MARKS: Reviewed[] = [
	...[
		["src/app/(owner)/properties/units/page.tsx", "text-muted-foreground/50"],
		[
			"src/components/dashboard/components/portfolio-data-table.tsx",
			"text-muted-foreground/40",
		],
		[
			"src/components/leases/table/leases-table.tsx",
			"text-muted-foreground/40",
		],
		[
			"src/components/maintenance/vendors-page.client.tsx",
			"text-muted-foreground/40",
		],
		[
			"src/components/properties/properties-filters.tsx",
			"text-muted-foreground/40",
		],
	].map(([file = "", token = ""]) => ({
		file,
		token,
		reason:
			"an empty state's illustration icon above its own title and text (decorative)",
	})),
	{
		file: "src/components/billing/plan-card.tsx",
		token: "text-muted-foreground/40",
		reason:
			"the excluded feature's icon beside its struck-through label, which carries the state",
	},
	{
		file: "src/components/properties/property-table.tsx",
		token: "text-muted-foreground/50",
		reason:
			"the unsorted column's arrow beside the column label; the sorted arrow is text-primary",
	},
	{
		file: "src/components/sections/how-it-works.tsx",
		token: "text-muted-foreground/40",
		reason: "the decorative chevron between two step cards",
	},
	{
		file: "src/components/sections/testimonials-section.tsx",
		token: "text-primary/20",
		reason: "the decorative quote mark above a testimonial",
	},
];

interface FadedFinding {
	file: string;
	line: number;
	token: string;
	ratio: number;
	at: string;
}

function fadedLabels(): { checked: number; under: FadedFinding[] } {
	let checked = 0;
	const under: FadedFinding[] = [];
	const FADED = new RegExp(`^${"te"}xt-([a-z0-9-]+)/(\\d+)$`);
	const FILL = new RegExp(`^${"b"}g-([a-z0-9-]+)(?:/(\\d+))?$`);
	for (const { path, text } of collectG7SourceTexts(ROOT)) {
		for (const literal of classStrings(text)) {
			const tokens = literal.text.split(/\s+/).filter(Boolean);
			const resting = (theme: "light" | "dark", re: RegExp) => {
				let found: Paint | null = null;
				for (const token of tokens) {
					const { variants, utility } = splitClass(token);
					if (variants.some((v) => v !== "dark")) continue;
					if (theme === "light" && variants.includes("dark")) continue;
					const m = re.exec(utility.replace(/^!|!$/g, ""));
					if (m?.[1] && COLORS.has(m[1])) {
						found = { token: m[1], alpha: m[2] ? Number(m[2]) / 100 : 1 };
					}
				}
				return found;
			};
			for (const theme of ["light", "dark"] as const) {
				const label = resting(theme, FADED);
				if (!label || label.alpha >= 1) continue;
				checked += 1;
				const pair: StatePair = {
					state: "rest",
					theme,
					fill: resting(theme, FILL),
					label,
					source: tokens.filter((t) => FADED.test(splitClass(t).utility)),
				};
				const { ratio, at } = worstStateContrast(CSS, pair);
				if (ratio < 4.5) {
					under.push({
						file: path,
						line: literal.line,
						token: pair.source.join(" "),
						ratio,
						at,
					});
				}
			}
		}
	}
	return { checked, under };
}

describe("a faded resting label keeps 4.5:1 (66.2-39 fix round 4, Part 5b)", () => {
	const { checked, under } = fadedLabels();
	const reviewed = (f: FadedFinding) =>
		FADED_MARKS.some((e) => e.file === f.file && f.token.includes(e.token));

	it("measures every faded resting label in shipped src", () => {
		expect(checked).toBeGreaterThan(10);
	});

	it("leaves no faded label under 4.5:1, either theme", () => {
		expect(
			under
				.filter((f) => !reviewed(f))
				.map(
					(f) => `${f.file}:${f.line} ${f.token} ${f.ratio.toFixed(2)} ${f.at}`,
				),
		).toEqual([]);
	});

	it("keeps every reviewed mark live", () => {
		expect(
			FADED_MARKS.filter(
				(e) =>
					!under.some((f) => f.file === e.file && f.token.includes(e.token)),
			).map((e) => `${e.file} ${e.token}`),
		).toEqual([]);
	});
});

/** A paint drawn straight on a surface, as `stackContrast` reads it. */
function markOn(
	theme: "light" | "dark",
	surface: string,
	mark: Paint,
	layers: Paint[] = [],
): number {
	const pair: StackPair = {
		text: mark.token,
		state: "rest",
		theme,
		layers,
		label: mark,
	};
	return stackContrast(CSS, surface, pair);
}

/**
 * The surfaces a control's boundary sits on: the sweep read inputs on all
 * four (the table header's select-all checkbox sits on the muted header row).
 */
const CONTROL_SURFACES = ["background", "card", "popover", "muted"] as const;
/** The surfaces a focus indicator is measured on, as the state fills are. */
const FOCUS_SURFACES = ["background", "card", "popover"] as const;

describe("control boundaries and focus indicators hold 3:1 (WCAG 1.4.11; 66.2-39 fix round 4, Part 5b)", () => {
	it("draws the input token, every control's boundary, at 3:1 on each surface", () => {
		const under: string[] = [];
		for (const theme of ["light", "dark"] as const) {
			for (const surface of CONTROL_SURFACES) {
				const ratio = markOn(theme, surface, { token: "input", alpha: 1 });
				if (ratio < 3)
					under.push(`${theme} input on ${surface} ${ratio.toFixed(2)}`);
			}
		}
		expect(under).toEqual([]);
	});

	/**
	 * A focus indicator drawn on a surface the three tokens are not: the CTA
	 * band buttons on /faq and /help sit on the primary band, and
	 * `primary-cta-band-contrast.test.tsx` measures them there (VD-135).
	 */
	const FOCUS_REVIEWED: Reviewed[] = [
		"src/app/faq/page.tsx",
		"src/app/help/page.tsx",
	].map((file) => ({
		file,
		token: "primary-foreground",
		reason: "a CTA band button's focus ring, measured on the band (VD-135)",
	}));

	it("gives every focus state a ring, outline, border or fill at 3:1 on each surface", () => {
		const FOCUS =
			/^(focus|focus-visible|has-focus|has-focus-visible|group-focus|group-focus-visible|peer-focus-visible)$|^has-\[.*focus|^\[&:has\(.*focus/;
		const PAINT = new RegExp(
			`^(ring|outline|${"bo"}rder|${"b"}g)-([a-z0-9-]+)(?:/(\\d+))?$`,
		);
		const BORDER_WIDTH = new RegExp(`^${"bo"}rder(-[xytrbl])?(-\\d+)?$`);
		const under: string[] = [];
		const live = new Set<string>();
		let checked = 0;
		for (const { path, text } of collectG7SourceTexts(ROOT)) {
			for (const literal of classStrings(text)) {
				// A focus border color paints only where the string draws a border.
				const drawsBorder = literal.text
					.split(/\s+/)
					.some((t) => BORDER_WIDTH.test(splitClass(t).utility));
				for (const theme of ["light", "dark"] as const) {
					const paints = new Map<string, Paint>();
					for (const token of literal.text.split(/\s+/).filter(Boolean)) {
						const { variants, utility } = splitClass(token);
						const rest = variants.filter((v) => v !== "dark");
						if (theme === "light" && variants.includes("dark")) continue;
						if (rest.length !== 1 || !FOCUS.test(rest[0] ?? "")) continue;
						const m = PAINT.exec(utility.replace(/^!|!$/g, ""));
						if (!m?.[2] || !COLORS.has(m[2])) continue;
						if (m[1] === "border" && !drawsBorder) continue;
						paints.set(`${rest[0]}:${m[1]}`, {
							token: m[2],
							alpha: m[3] ? Number(m[3]) / 100 : 1,
						});
					}
					if (!paints.size) continue;
					checked += 1;
					let best = 0;
					let worstAt = "";
					for (const [key, paint] of paints) {
						const ratio = Math.min(
							...FOCUS_SURFACES.map((s) => markOn(theme, s, paint)),
						);
						if (ratio > best) {
							best = ratio;
							worstAt = `${key} ${paint.token}/${Math.round(paint.alpha * 100)}`;
						}
					}
					const review = FOCUS_REVIEWED.find(
						(e) => e.file === path && worstAt.includes(e.token),
					);
					if (best < 3 && review) live.add(review.file);
					else if (best < 3)
						under.push(
							`${path}:${literal.line} ${theme} ${best.toFixed(2)} ${worstAt}`,
						);
				}
			}
		}
		expect(checked).toBeGreaterThan(40);
		expect(under).toEqual([]);
		expect(
			FOCUS_REVIEWED.filter((e) => !live.has(e.file)).map((e) => e.file),
		).toEqual([]);
	});
});

/**
 * `outline-none` sets the outline style to none, and in Tailwind 4 a width or
 * color utility does not restore it: a string that hides the outline and then
 * draws a focus-visible one needs a focus-visible style utility too (the data
 * table's column header drew no outline at all; the sweep read its base
 * 4px ring/20 halo at 1.34:1).
 */
describe("a focus-visible outline after outline-none names its style (66.2-39 fix round 4, Part 5b)", () => {
	it("restores the outline style wherever a string hides the outline and draws one", () => {
		const HIDE = new RegExp(`(^|:)${"out"}line-none$`);
		const DRAW = new RegExp(
			`^focus(-visible)?:${"out"}line-(\\d|[a-z]+-?[a-z]*$)`,
		);
		const STYLE = new RegExp(
			`^focus(-visible)?:${"out"}line-(solid|dashed|dotted|double)$`,
		);
		const missing: string[] = [];
		for (const { path, text } of collectG7SourceTexts(ROOT)) {
			for (const literal of classStrings(text)) {
				const tokens = literal.text.split(/\s+/).filter(Boolean);
				const draws = tokens.filter(
					(t) =>
						DRAW.test(t) && !STYLE.test(t) && !/offset|-none$|-hidden$/.test(t),
				);
				if (!tokens.some((t) => HIDE.test(t)) || !draws.length) continue;
				if (!tokens.some((t) => STYLE.test(t))) {
					missing.push(`${path}:${literal.line} ${draws.join(" ")}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});
});

describe("a hovered text link keeps 4.5:1 (66.2-39 fix round 4, Part 5b)", () => {
	it("paints the base link hover in a token that clears 4.5:1 on each surface", () => {
		const rule = /a:not\(\[role="button"\]\)[^{]*\):hover\s*\{([^}]*)\}/.exec(
			CSS,
		);
		const value =
			/(?:^|\n)\s*color:\s*([^;]+);/.exec(rule?.[1] ?? "")?.[1]?.trim() ?? "";
		const token = /var\(--color-([a-z0-9-]+)\)/.exec(value)?.[1] ?? "";
		const mix =
			/color-mix\(in \w+, var\(--color-[a-z0-9-]+\) (\d+)%, transparent\)/.exec(
				value,
			);
		const paint: Paint = { token, alpha: mix?.[1] ? Number(mix[1]) / 100 : 1 };
		const under: string[] = [];
		for (const theme of ["light", "dark"] as const) {
			for (const surface of CONTROL_SURFACES) {
				const ratio = markOn(theme, surface, paint);
				if (ratio < 4.5)
					under.push(`${theme} ${value} on ${surface} ${ratio.toFixed(2)}`);
			}
		}
		expect(token).not.toBe("");
		expect(under).toEqual([]);
	});
});

/**
 * Sonner's rich-color toasts (`richColors` on the root layout's Toaster) read
 * their label and fill from `--<type>-text` / `--<type>-bg`. Its own light
 * palette put success at 4.26:1 and error at 4.35:1 (the F1 sweep's toast
 * states); the Toaster maps each to an AA companion on a 10% status tint.
 */
describe("a rich-color toast keeps 4.5:1 (66.2-39 fix round 4, Part 5b)", () => {
	const SONNER = readFileSync(
		resolve(ROOT, "src/components/ui/sonner.tsx"),
		"utf8",
	);
	const SONNER_CSS = readFileSync(
		resolve(ROOT, "node_modules/sonner/dist/styles.css"),
		"utf8",
	);
	/** Sonner's own `--<name>` in its light or dark toaster block, as sRGB 0-1. */
	const sonnerDefault = (theme: "light" | "dark", name: string) => {
		const block =
			new RegExp(`\\[data-sonner-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(
				SONNER_CSS,
			)?.[1] ?? "";
		const m = new RegExp(
			`--${name}:\\s*hsl\\((\\d+),\\s*([\\d.]+)%,\\s*([\\d.]+)%\\)`,
		).exec(block);
		if (!m) throw new Error(`sonner has no ${theme} --${name}`);
		const [h, sat, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
		const k = (n: number) => (n + h / 30) % 12;
		const a = sat * Math.min(l, 1 - l);
		return [0, 8, 4].map(
			(n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)),
		);
	};
	const lum = (c: number[]) => {
		const lin = c.map((v) =>
			v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
		);
		return (
			0.2126 * (lin[0] ?? 0) + 0.7152 * (lin[1] ?? 0) + 0.0722 * (lin[2] ?? 0)
		);
	};
	const ratioOf = (x: number[], y: number[]) => {
		const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
		return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
	};

	it.each(["success", "info", "warning", "error"])("%s", (type) => {
		const text = new RegExp(
			`\\[--${type}-text:var\\(--color-([a-z0-9-]+)\\)\\]!`,
		).exec(SONNER)?.[1];
		const bg = new RegExp(
			`\\[--${type}-bg:color-mix\\(in_oklab,var\\(--color-([a-z0-9-]+)\\)_(\\d+)%,var\\(--color-popover\\)\\)\\]!`,
		).exec(SONNER);
		const under: string[] = [];
		for (const theme of ["light", "dark"] as const) {
			const ratio =
				text && bg?.[1]
					? markOn(theme, "popover", { token: text, alpha: 1 }, [
							{ token: bg[1], alpha: Number(bg[2]) / 100 },
						])
					: ratioOf(
							sonnerDefault(theme, `${type}-text`),
							sonnerDefault(theme, `${type}-bg`),
						);
			if (ratio < 4.5)
				under.push(
					`${theme} ${type} ${ratio.toFixed(2)}${text ? "" : " (Sonner's own palette)"}`,
				);
		}
		expect(under).toEqual([]);
	});
});
