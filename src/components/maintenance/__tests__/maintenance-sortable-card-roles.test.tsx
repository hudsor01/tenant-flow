/**
 * @vitest-environment jsdom
 * A maintenance board card is one control, its link (66.2-39 fix round 4,
 * Part 8h; WCAG 4.1.2).
 *
 * The sortable wrapper spread dnd-kit's `attributes` (role="button",
 * tabIndex 0, the keyboard-drag instructions) around the card's own link,
 * but the board registers only a PointerSensor, so the wrapper was a tab stop
 * no key operates and a button holding a link: axe's nested-interactive
 * failed every card. The wrapper keeps the pointer listeners only.
 */
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_MAINTENANCE_REQUEST } from "#test/utils/test-data";
import { MaintenanceSortableCard } from "../cards/maintenance-sortable-card";

describe("a maintenance board card", () => {
	it("is a link, not a button wrapped around one", () => {
		const request = DEFAULT_MAINTENANCE_REQUEST;
		const { container } = render(
			<DndContext>
				<SortableContext items={[request.id]}>
					<MaintenanceSortableCard request={request} columnId="open" />
				</SortableContext>
			</DndContext>,
		);
		expect(screen.queryAllByRole("button")).toEqual([]);
		const link = screen.getByRole("link");
		const wrapper = link.parentElement;
		expect(wrapper?.getAttribute("role")).toBeNull();
		expect(wrapper?.getAttribute("tabindex")).toBeNull();
		expect(container.querySelectorAll("[tabindex], a[href]")).toHaveLength(1);
	});
});
