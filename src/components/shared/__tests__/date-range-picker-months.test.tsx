/**
 * The date-range picker shows two months only where they sit side by side
 * (66.2-39 fix round 4, Part 5d).
 *
 * The calendar's months row is `flex-col md:flex-row`: below Tailwind's `md`
 * breakpoint a second month stacks under the first. Stacked, the document
 * vault's picker stood 777.5px tall in the 444px above its trigger at 390x844,
 * its month navigation and first weeks off screen. The picker now asks for
 * `md` itself and shows one month below it. The query is read from the
 * `matchMedia` call the picker makes, and pinned to the compiled theme's
 * `--breakpoint-md`, so the two cannot drift apart.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "#components/shared/date-range-picker";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";

const ENGINE_TIMEOUT_MS = 60_000;

/** A viewport `width` px wide, answering the picker's `(width >= Nrem)` query. */
function viewport(width: number): string[] {
	const asked: string[] = [];
	vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
		asked.push(query);
		const bound = /^\(width >= ([\d.]+)rem\)$/.exec(query)?.[1];
		return {
			matches: bound !== undefined && width >= Number(bound) * 16,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		};
	});
	return asked;
}

async function openPicker(): Promise<number> {
	render(
		<DateRangePicker
			value={{ from: undefined, to: undefined }}
			onChange={() => {}}
			placeholder="Any date"
		/>,
	);
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: /filter by date range/i }));
	const content = await screen.findByRole("dialog");
	return content.querySelectorAll("table").length;
}

describe("the date-range picker shows two months only where they sit side by side", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shows one month on a 390px screen", async () => {
		viewport(390);
		expect(await openPicker()).toBe(1);
	});

	it("shows one month just below md (767px)", async () => {
		viewport(767);
		expect(await openPicker()).toBe(1);
	});

	it("shows two months from md (768px)", async () => {
		viewport(768);
		expect(await openPicker()).toBe(2);
	});

	it(
		"asks for the compiled theme's md breakpoint",
		async () => {
			const asked = viewport(1280);
			await openPicker();
			const designSystem = await loadProjectDesignSystem();
			const md = designSystem.resolveThemeValue("--breakpoint-md");
			expect(md).toBe("48rem");
			expect(asked).toContain(`(width >= ${md})`);
		},
		ENGINE_TIMEOUT_MS,
	);
});
