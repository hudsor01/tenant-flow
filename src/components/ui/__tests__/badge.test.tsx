/**
 * Badge destructive variant: its text is the paired `destructive-foreground`
 * token, as on the Button destructive variant (D-29), never a named white,
 * so both themes take the token's value.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "#components/ui/badge";

describe("Badge destructive variant", () => {
	it("pairs the destructive fill with the destructive-foreground token", () => {
		render(<Badge variant="destructive">Overdue</Badge>);
		const badge = screen.getByText("Overdue");
		expect(badge).toHaveClass("bg-destructive", "text-destructive-foreground");
		expect(
			[...badge.classList].filter((name) => /(^|:)text-white$/.test(name)),
		).toEqual([]);
	});
});
