/**
 * @vitest-environment jsdom
 * CommandDialog's inner Command className (new-york-v4, ledger C3).
 *
 * The input wrapper is a direct child of the Command root, so the dialog's 48px rule must be the
 * upstream depth-1 form `**:data-[slot=command-input-wrapper]:h-12`; the wrapper's own `h-11`
 * (the 44px row outside the dialog) stays.
 */

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#components/ui/command";
import { render } from "#test/utils/test-render";

describe("CommandDialog", () => {
	it("applies the upstream wrapper rule and keeps the wrapper's own height", () => {
		render(
			<CommandDialog open>
				<CommandInput placeholder="Search" />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Pages">
						<CommandItem>Dashboard</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>,
		);

		const root = document.querySelector('[data-slot="command"]');
		expect(root).not.toBeNull();
		const tokens = [...(root?.classList ?? [])];
		expect(tokens).toContain("**:data-[slot=command-input-wrapper]:h-12");
		expect(tokens).toContain("[&_[cmdk-input]]:h-12");
		expect(
			tokens.filter((t) => t.startsWith("**:[&_") || t.startsWith("**:**:")),
		).toEqual([]);

		const wrapper = document.querySelector(
			'[data-slot="command-input-wrapper"]',
		);
		expect(wrapper?.parentElement).toBe(root);
		expect(wrapper?.classList.contains("h-11")).toBe(true);

		expect(
			screen.getByRole("dialog", { name: "Command Palette" }),
		).toBeInTheDocument();
	});
});
