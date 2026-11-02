/**
 * OwnerPaymentSummary renders DOLLAR amounts as dollars.
 *
 * `lateFeeTotal` and `unpaidTotal` come from `get_billing_insights`, whose money
 * is dollars like every other amount in the app. The cards formatted them with
 * `formatCents`, which divides by 100 first, so $1,250.00 of late fees rendered
 * as $12.50.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwnerPaymentSummary } from "../owner-payment-summary";

describe("OwnerPaymentSummary", () => {
	it("formats late fees and unpaid totals as dollars, not cents", () => {
		render(
			<OwnerPaymentSummary
				summary={{
					lateFeeTotal: 1250,
					unpaidTotal: 3400.5,
					unpaidCount: 3,
					tenantCount: 7,
				}}
			/>,
		);
		expect(screen.getByText("$1,250.00")).toBeInTheDocument();
		expect(screen.getByText("$3,400.50")).toBeInTheDocument();
		expect(screen.queryByText("$12.50")).not.toBeInTheDocument();
	});

	it("renders zero dollars for a missing summary", () => {
		render(<OwnerPaymentSummary summary={null} />);
		expect(screen.getAllByText("$0.00")).toHaveLength(2);
	});
});
