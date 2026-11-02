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

	it("renders a skeleton per figure while the summary loads, not zeros", () => {
		const { container } = render(<OwnerPaymentSummary summary={undefined} />);
		expect(
			container.querySelectorAll(
				'[data-slot="card-title"] [data-slot="skeleton"]',
			),
		).toHaveLength(4);
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
		expect(screen.queryByText("0")).not.toBeInTheDocument();
	});

	it("says the read failed instead of rendering zeros as figures", () => {
		render(<OwnerPaymentSummary summary={undefined} isError />);
		expect(
			screen.getByText("Couldn't load the payment summary."),
		).toBeInTheDocument();
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
		expect(screen.queryByText("Late fees cumulative")).not.toBeInTheDocument();
	});

	it("keeps the figures it has when a later refetch fails", () => {
		render(
			<OwnerPaymentSummary
				summary={{
					lateFeeTotal: 115,
					unpaidTotal: 1185.5,
					unpaidCount: 4,
					tenantCount: 2,
				}}
				isError
			/>,
		);
		expect(screen.getByText("$1,185.50")).toBeInTheDocument();
		expect(screen.getByText("4")).toBeInTheDocument();
	});
});
