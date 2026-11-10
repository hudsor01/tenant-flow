/**
 * @vitest-environment jsdom
 * The History tab's event discs hide the rail behind them (66.2-39 fix round 4,
 * G18; VD-51).
 *
 * A 1px `bg-border` rail runs behind the icon discs, which sit over it
 * (`relative z-10`) only to hide it. The discs took 10% token tints
 * (`bg-info/10`, which compile to `color-mix(… 10%, transparent)`) in place of
 * the opaque `bg-blue-100`-style fills, so the rail showed through seven of
 * the nine discs in both themes (Chrome, compiled CSS: 1.36-1.46:1 against the
 * rest of the disc). Each disc is now an opaque `bg-card` circle with the tint
 * on a layer inside it.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";
import type { LeaseTimelineEvent } from "../lease-detail-utils";
import { LeaseTimelineTab } from "../lease-timeline-tab";

const TYPES: LeaseTimelineEvent["type"][] = [
	"created",
	"sent_for_signature",
	"owner_signed",
	"tenant_signed",
	"activated",
	"renewed",
	"terminated",
	"ended",
	"expired",
];

/** The background colors the compiled classes of `element` set. */
async function backgrounds(element: Element): Promise<string[]> {
	const designSystem = await loadProjectDesignSystem();
	return designSystem
		.candidatesToCss([...element.classList])
		.filter((rule): rule is string => rule !== null)
		.flatMap((rule) => [...rule.matchAll(/background-color:\s*([^;}]+)/g)])
		.map((match) => (match[1] ?? "").trim());
}

describe("the lease timeline's event discs", () => {
	it("paint an opaque disc over the rail for every event type", async () => {
		const events = TYPES.map((type, index) => ({
			id: type,
			type,
			title: type,
			description: type,
			timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
		}));
		const { container } = render(<LeaseTimelineTab events={events} />);
		const rail = container.querySelector(".absolute.w-px");
		expect(rail?.className).toContain("bg-border");
		const discs = [...container.querySelectorAll(".relative.z-10")];
		expect(discs).toHaveLength(TYPES.length);
		const fills = await Promise.all(discs.map(backgrounds));
		// One opaque fill per disc: a token, never a mix with transparent.
		expect(fills).toEqual(TYPES.map(() => ["var(--card)"]));
		// The event's tint and icon color ride on the layer inside.
		for (const disc of discs) {
			const layer = disc.firstElementChild;
			expect(layer?.querySelector("svg")).not.toBeNull();
			expect((await backgrounds(layer as Element)).length).toBe(1);
		}
	}, 30_000);
});
