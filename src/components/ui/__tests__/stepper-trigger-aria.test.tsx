/**
 * @vitest-environment jsdom
 * The stepper's triggers state their position and name only a rendered panel
 * (66.2-39 fix round 4, Part 8h; WCAG 4.1.2).
 *
 * The store changed its steps Map in place, so a selector returning it saw the
 * same reference after every step registered and the triggers kept the empty
 * map's answer: each read aria-posinset 0 and aria-setsize 0 (axe
 * aria-valid-attr-value on the bulk import dialog and the lease wizard). And
 * each trigger named its panel in aria-controls whether or not the panel was
 * rendered: a step's content mounts only while it is active, and the lease
 * wizard renders none. The store now replaces the Map, and a panel registers
 * while it is rendered.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	Content,
	Item,
	List,
	Root,
	Separator,
	Trigger,
} from "#components/ui/stepper";
import { useStore } from "#components/ui/stepper-context";

const STEPS = ["upload", "validate", "confirm"] as const;

function Harness({ withContent }: { withContent: boolean }) {
	return (
		<Root value="validate">
			<List>
				{STEPS.map((step, index) => (
					<Item key={step} value={step}>
						<Trigger>{step}</Trigger>
						{index < STEPS.length - 1 && <Separator />}
					</Item>
				))}
			</List>
			{withContent &&
				STEPS.map((step) => (
					<Content key={step} value={step}>
						{step} panel
					</Content>
				))}
		</Root>
	);
}

/** Records each `steps` the store hands a selector, as a trigger reads it. */
function StepsSeen({ seen }: { seen: unknown[] }) {
	seen.push(useStore((state) => state.steps));
	return null;
}

describe("the stepper's store", () => {
	it("hands a selector a new steps map after each step registers", () => {
		// The React Compiler memoizes what a trigger derives from `steps` on its
		// identity, so the in-place change left the production build's triggers
		// at aria-posinset 0; jsdom runs without the compiler, so this reads the
		// identity itself.
		const seen: unknown[] = [];
		render(
			<Root value="upload">
				<StepsSeen seen={seen} />
				<List>
					{STEPS.map((step) => (
						<Item key={step} value={step}>
							<Trigger>{step}</Trigger>
						</Item>
					))}
				</List>
			</Root>,
		);
		expect(new Set(seen).size).toBeGreaterThan(1);
		const last = seen.at(-1);
		expect(last instanceof Map ? [...last.keys()] : null).toEqual([...STEPS]);
	});
});

describe("the stepper's triggers", () => {
	it("state their position in the step set", () => {
		render(<Harness withContent />);
		const tabs = screen.getAllByRole("tab");
		expect(tabs.map((tab) => tab.getAttribute("aria-posinset"))).toEqual([
			"1",
			"2",
			"3",
		]);
		expect(tabs.map((tab) => tab.getAttribute("aria-setsize"))).toEqual([
			"3",
			"3",
			"3",
		]);
	});

	it("name in aria-controls only the panel that is rendered", () => {
		const { unmount } = render(<Harness withContent />);
		const controls = screen
			.getAllByRole("tab")
			.map((tab) => tab.getAttribute("aria-controls"));
		expect(controls[0]).toBeNull();
		expect(controls[2]).toBeNull();
		const panel = screen.getByRole("tabpanel");
		expect(controls[1]).toBe(panel.id);
		unmount();
		render(<Harness withContent={false} />);
		expect(
			screen
				.getAllByRole("tab")
				.map((tab) => tab.getAttribute("aria-controls")),
		).toEqual([null, null, null]);
	});

	it("render a separator after every step but the last", () => {
		render(<Harness withContent />);
		expect(
			document.querySelectorAll('[data-slot="stepper-separator"]'),
		).toHaveLength(2);
	});
});
