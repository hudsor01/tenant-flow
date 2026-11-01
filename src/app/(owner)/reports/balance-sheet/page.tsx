"use client";

import { Building2, CreditCard, Download, Wallet } from "lucide-react";
import { useState } from "react";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import { Button } from "#components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatValue,
} from "#components/ui/stat";
import { useBalanceSheet } from "#hooks/api/use-financials";
import { formatDate } from "#lib/formatters/date";
import { BalanceEquationCheck } from "./balance-equation-check";
import { BalanceSection } from "./balance-section";
import { BalanceSheetError } from "./balance-sheet-error";
import { BalanceSheetSkeleton } from "./balance-sheet-skeleton";
import { EquitySection } from "./equity-section";

export default function BalanceSheetPage() {
	const now = new Date();
	const [year, setYear] = useState(String(now.getFullYear()));
	const [month, setMonth] = useState(
		String(now.getMonth() + 1).padStart(2, "0"),
	);

	// Each Select trigger's name starts with the value it shows, then says what
	// it picks (WCAG 2.5.3 label in name; a bare trigger had no name at all).
	const monthName = new Date(2000, parseInt(month, 10) - 1, 1).toLocaleString(
		"en-US",
		{ month: "long" },
	);

	const asOfDate = `${year}-${month}-${new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate()}`;
	const { data, isLoading, error, refetch } = useBalanceSheet(asOfDate);
	const balanceData = data?.data;

	const assetsItems = (() => {
		if (!balanceData) return [];
		return [
			{
				label: "Current Assets",
				items: [
					{ name: "Cash", amount: balanceData.assets.currentAssets.cash },
					{
						name: "Accounts Receivable",
						amount: balanceData.assets.currentAssets.accountsReceivable,
					},
					{
						name: "Security Deposits",
						amount: balanceData.assets.currentAssets.security_deposits,
					},
				],
				subtotal:
					balanceData.assets.currentAssets.cash +
					balanceData.assets.currentAssets.accountsReceivable +
					balanceData.assets.currentAssets.security_deposits,
			},
			{
				label: "Fixed Assets",
				items: [
					{
						name: "Property Values",
						amount: balanceData.assets.fixedAssets.propertyValues,
					},
					{
						name: "Accumulated Depreciation",
						amount: -balanceData.assets.fixedAssets.accumulatedDepreciation,
					},
					{
						name: "Net Property Value",
						amount: balanceData.assets.fixedAssets.netPropertyValue,
					},
				],
				subtotal: balanceData.assets.fixedAssets.netPropertyValue,
			},
		];
	})();

	const liabilitiesItems = (() => {
		if (!balanceData) return [];
		return [
			{
				label: "Current Liabilities",
				items: [
					{
						name: "Accounts Payable",
						amount: balanceData.liabilities.currentLiabilities.accountsPayable,
					},
					{
						name: "Security Deposit Liability",
						amount:
							balanceData.liabilities.currentLiabilities
								.security_depositLiability,
					},
					{
						name: "Accrued Expenses",
						amount: balanceData.liabilities.currentLiabilities.accruedExpenses,
					},
				],
				subtotal:
					balanceData.liabilities.currentLiabilities.accountsPayable +
					balanceData.liabilities.currentLiabilities.security_depositLiability +
					balanceData.liabilities.currentLiabilities.accruedExpenses,
			},
			{
				label: "Long-Term Liabilities",
				items: [
					{
						name: "Mortgages Payable",
						amount:
							balanceData.liabilities.longTermLiabilities.mortgagesPayable,
					},
				],
				subtotal: balanceData.liabilities.longTermLiabilities.mortgagesPayable,
			},
		];
	})();

	const equityItems = (() => {
		if (!balanceData) return [];
		return [
			{ name: "Owner Capital", amount: balanceData.equity.ownerCapital },
			{
				name: "Retained Earnings",
				amount: balanceData.equity.retainedEarnings,
			},
			{
				name: "Current Period Income",
				amount: balanceData.equity.currentPeriodIncome,
			},
		];
	})();

	const totalAssets = balanceData?.assets.totalAssets || 0;
	const totalLiabilities = balanceData?.liabilities.totalLiabilities || 0;
	const totalEquity = balanceData?.equity.totalEquity || 0;
	const isBalanced = balanceData?.balanceCheck !== false;

	if (isLoading) {
		return <BalanceSheetSkeleton />;
	}

	if (error) {
		return (
			<BalanceSheetError error={error} onRetryAction={() => void refetch()} />
		);
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1}>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Balance Sheet</h1>
						<p className="text-muted-foreground">
							As of {formatDate(asOfDate, { style: "long" })}
						</p>
					</div>
					{/* Below sm the header stacks and this row spans it: the controls wrap
				    rather than shrink, since a shrunk select clips its value. */}
					<div className="flex flex-wrap gap-2 sm:flex-nowrap">
						<Select value={year} onValueChange={setYear}>
							<SelectTrigger className="w-25" aria-label={`${year} (year)`}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Array.from({ length: 3 }, (_, i) =>
									String(now.getFullYear() - i),
								).map((y) => (
									<SelectItem key={y} value={y}>
										{y}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={month} onValueChange={setMonth}>
							<SelectTrigger
								className="w-32.5"
								aria-label={`${monthName} (month)`}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="01">January</SelectItem>
								<SelectItem value="02">February</SelectItem>
								<SelectItem value="03">March</SelectItem>
								<SelectItem value="04">April</SelectItem>
								<SelectItem value="05">May</SelectItem>
								<SelectItem value="06">June</SelectItem>
								<SelectItem value="07">July</SelectItem>
								<SelectItem value="08">August</SelectItem>
								<SelectItem value="09">September</SelectItem>
								<SelectItem value="10">October</SelectItem>
								<SelectItem value="11">November</SelectItem>
								<SelectItem value="12">December</SelectItem>
							</SelectContent>
						</Select>
						<Button variant="outline">
							<Download className="w-4 h-4" />
							Export
						</Button>
					</div>
				</div>
			</BlurFade>

			{/* Summary Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<BlurFade delay={0.15}>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="var(--color-success)"
							colorTo="oklch(from var(--color-success) l c h / 0.3)"
						/>
						<StatLabel>Total Assets</StatLabel>
						<StatValue className="flex items-baseline text-success-text">
							$
							{totalAssets.toLocaleString("en-US", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<Building2 />
						</StatIndicator>
						<StatDescription>what you own</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2}>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Liabilities</StatLabel>
						<StatValue className="flex items-baseline text-destructive-text">
							$
							{totalLiabilities.toLocaleString("en-US", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<CreditCard />
						</StatIndicator>
						<StatDescription>what you owe</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25}>
					<Stat className="relative overflow-hidden">
						{totalEquity > 0 && (
							<BorderBeam
								size={100}
								duration={12}
								colorFrom="var(--color-primary)"
								colorTo="oklch(from var(--color-primary) l c h / 0.3)"
							/>
						)}
						<StatLabel>Total Equity</StatLabel>
						<StatValue className="flex items-baseline">
							$
							{totalEquity.toLocaleString("en-US", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Wallet />
						</StatIndicator>
						<StatDescription>net worth</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Balance Equation Check */}
			<BlurFade delay={0.3}>
				<BalanceEquationCheck
					totalAssets={totalAssets}
					totalLiabilities={totalLiabilities}
					totalEquity={totalEquity}
					isBalanced={isBalanced}
				/>
			</BlurFade>

			{/* Balance Sheet Details */}
			<BlurFade delay={0.35}>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<BalanceSection
						title="Assets"
						icon={Building2}
						items={assetsItems}
						total={totalAssets}
						totalLabel="Total Assets"
						colorClass="text-success-text"
					/>

					<div className="space-y-6">
						<BalanceSection
							title="Liabilities"
							icon={CreditCard}
							items={liabilitiesItems}
							total={totalLiabilities}
							totalLabel="Total Liabilities"
							colorClass="text-destructive-text"
						/>
						<EquitySection items={equityItems} totalEquity={totalEquity} />
					</div>
				</div>
			</BlurFade>
		</div>
	);
}
