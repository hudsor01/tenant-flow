/**
 * @vitest-environment jsdom
 * An Item inside an ItemGroup is an item of its list (66.2-39 fix round 4,
 * Part 8h; WCAG 1.3.1).
 *
 * ItemGroup is a `list`, and its Items had no role, so the list owned no
 * listitem: axe's `aria-required-children` failed /about's and /help's
 * groups. The group now tells its Items through a context; an Item outside a
 * group keeps no role.
 */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	Item,
	ItemContent,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
} from "#components/ui/item";

describe("Item roles", () => {
	it("are list items inside a group and roleless outside one", () => {
		render(
			<>
				<ItemGroup>
					<Item variant="outline">
						<ItemContent>
							<ItemTitle>Email Support</ItemTitle>
						</ItemContent>
					</Item>
					<ItemSeparator />
					<Item variant="outline">
						<ItemContent>
							<ItemTitle>Phone Support</ItemTitle>
						</ItemContent>
					</Item>
				</ItemGroup>
				<Item data-testid="alone">
					<ItemContent>
						<ItemTitle>Alone</ItemTitle>
					</ItemContent>
				</Item>
			</>,
		);
		const list = screen.getByRole("list");
		expect(within(list).getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getByTestId("alone")).not.toHaveAttribute("role");
	});
});
