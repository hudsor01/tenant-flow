"use client";

import { Building2, CreditCard, Wallet } from "lucide-react";
import { useState } from "react";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
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
import { formatDate, formatLocalYmd } from "#lib/formatters/date";
import { handleMutationError } from "#lib/mutation-error-handler";
import { CSV_MIME_TYPE } from "#lib/reports/csv";
import { downloadBlob } from "#lib/reports/download-blob";
import { ReportExportButton } from "../report-export-button";
import { BalanceEquationCheck } from "./balance-equation-check";
import { BalanceSection } from "./balance-section";
import {
	balanceSheetCsvFilename,
	buildBalanceSheetCsv,
} from "./balance-sheet-csv";
import { BalanceSheetError } from "./balance-sheet-error";
import { BalanceSheetSkeleton } from "./balance-sheet-skeleton";
import { buildBalanceSheetView } from "./balance-sheet-view";
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

	// The last day of the selected month, as local YYYY-MM-DD (day 0 of the
	// following month).
	const asOfDate = formatLocalYmd(
		new Date(parseInt(year, 10), parseInt(month, 10), 0),
	);
	const { data, isLoading, isPlaceholderData, error, refetch } =
		useBalanceSheet(asOfDate);
	const balanceData = data?.data;
	const view = buildBalanceSheetView(balanceData);
	const { totalAssets, totalLiabilities, totalEquity, isBalanced } = view;

	// The global keepPreviousData shows the last month while the selected one
	// loads, so the export waits for the data that matches the selectors.
	const exportUnavailableReason = !balanceData
		? "No balance sheet data to export yet."
		: isPlaceholderData
			? "Loading the selected month. Export is available when it finishes."
			: null;

	const handleExport = () => {
		if (!balanceData || isPlaceholderData) return;
		try {
			const asOf = balanceData.period.end_date;
			const csv = buildBalanceSheetCsv({ asOfDate: asOf, view });
			downloadBlob(
				new Blob([csv], { type: CSV_MIME_TYPE }),
				balanceSheetCsvFilename(asOf),
			);
		} catch (exportError) {
			handleMutationError(
				exportError,
				"Export balance sheet",
				"Couldn't export the balance sheet. Please try again.",
			);
		}
	};

	if (isLoading) {
		return <BalanceSheetSkeleton />;
	}

	if (error) {
		return <BalanceSheetError onRetryAction={() => void refetch()} />;
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
						<ReportExportButton
							onExport={handleExport}
							unavailableReason={exportUnavailableReason}
						/>
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
						items={view.assetGroups}
						total={totalAssets}
						totalLabel="Total Assets"
						colorClass="text-success-text"
					/>

					<div className="space-y-6">
						<BalanceSection
							title="Liabilities"
							icon={CreditCard}
							items={view.liabilityGroups}
							total={totalLiabilities}
							totalLabel="Total Liabilities"
							colorClass="text-destructive-text"
						/>
						<EquitySection items={view.equityItems} totalEquity={totalEquity} />
					</div>
				</div>
			</BlurFade>
		</div>
	);
}
