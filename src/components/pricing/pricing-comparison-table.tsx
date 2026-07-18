"use client";

import { Check, ChevronDown, Minus } from "lucide-react";
import { useState } from "react";
import { Button } from "#components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#components/ui/collapsible";
import { MAX_PUBLIC_PRICE_DISPLAY } from "#config/pricing";
import { cn } from "#lib/utils";

interface PricingComparisonTableProps {
	className?: string;
}

type FeatureValue = boolean | string | number;

interface ComparisonFeature {
	name: string;
	starter: FeatureValue;
	growth: FeatureValue;
	max: FeatureValue;
	tooltip?: string;
}

interface FeatureCategory {
	category: string;
	features: ComparisonFeature[];
}

const comparisonData: FeatureCategory[] = [
	{
		category: "Property Management",
		features: [
			{ name: "Properties", starter: "5", growth: "20", max: "Unlimited" },
			{ name: "Units", starter: "25", growth: "100", max: "Unlimited" },
			{
				name: "Tenant records",
				starter: "Unlimited",
				growth: "Unlimited",
				max: "Unlimited",
			},
			{ name: "Lease management", starter: true, growth: true, max: true },
		],
	},
	{
		category: "Document Vault",
		features: [
			{
				name: "Per-entity storage (property, lease, tenant, maintenance, inspection)",
				starter: true,
				growth: true,
				max: true,
			},
			{ name: "Global text search", starter: true, growth: true, max: true },
			{
				name: "Multi-select category + date-range filters",
				starter: true,
				growth: true,
				max: true,
			},
			{
				name: "Bulk-download as zip (cap 500 docs/request)",
				starter: true,
				growth: true,
				max: true,
			},
			{
				name: "Custom user-defined categories",
				starter: true,
				growth: true,
				max: true,
			},
			{
				name: "Storage quota",
				starter: "10GB",
				growth: "50GB",
				max: "Unlimited",
			},
		],
	},
	{
		category: "Leases",
		features: [
			{
				name: "E-sign leases",
				starter: false,
				growth: "25 / mo",
				max: "Unlimited",
			},
			{ name: "Renewal reminders", starter: false, growth: true, max: true },
		],
	},
	{
		category: "Maintenance",
		features: [
			{ name: "Work order tracking", starter: true, growth: true, max: true },
			{ name: "Photo attachments", starter: true, growth: true, max: true },
			{ name: "Kanban workflow board", starter: true, growth: true, max: true },
		],
	},
	{
		category: "Reporting & Analytics",
		features: [
			{
				name: "Financial reports",
				starter: "Basic",
				growth: "Advanced",
				max: "Advanced",
			},
			{ name: "Occupancy analytics", starter: true, growth: true, max: true },
			{ name: "Expense tracking", starter: true, growth: true, max: true },
		],
	},
	{
		category: "Support",
		features: [
			{ name: "Email support", starter: true, growth: true, max: true },
			{
				name: "Priority email support",
				starter: false,
				growth: true,
				max: true,
			},
			{ name: "Phone support", starter: false, growth: true, max: true },
			{
				name: "Dedicated account manager",
				starter: false,
				growth: false,
				max: true,
			},
		],
	},
];

function FeatureCell({
	value,
	highlight = false,
}: {
	value: FeatureValue;
	highlight?: boolean;
}) {
	if (typeof value === "boolean") {
		return value ? (
			<Check
				className={cn(
					"size-5 mx-auto",
					highlight ? "text-primary" : "text-success",
				)}
			/>
		) : (
			<Minus className="size-5 text-muted-foreground/50 mx-auto" />
		);
	}
	return (
		<span
			className={cn(
				"text-sm font-medium",
				highlight ? "text-primary-text" : "text-foreground",
			)}
		>
			{value}
		</span>
	);
}

function CategorySection({
	category,
	features,
	defaultOpen = false,
}: FeatureCategory & { defaultOpen?: boolean }) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					className="w-full justify-between py-4 px-6 h-auto rounded-none border-b border-border/50 hover:bg-muted/50"
				>
					<span className="font-semibold text-foreground">{category}</span>
					<ChevronDown
						className={cn(
							"size-5 text-muted-foreground transition-transform duration-200",
							isOpen && "rotate-180",
						)}
					/>
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{features.map((feature, idx) => (
					<div
						key={feature.name}
						className={cn(
							"grid grid-cols-4 items-center py-3 px-6",
							idx % 2 === 0 ? "bg-muted/20" : "bg-transparent",
						)}
					>
						<div className="text-sm text-muted-foreground">{feature.name}</div>
						<div className="text-center">
							<FeatureCell value={feature.starter} />
						</div>
						<div className="text-center bg-primary/5 -my-3 py-3 border-x border-primary/10">
							<FeatureCell value={feature.growth} highlight />
						</div>
						<div className="text-center">
							<FeatureCell value={feature.max} />
						</div>
					</div>
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}

export function PricingComparisonTable({
	className,
}: PricingComparisonTableProps) {
	return (
		<div className={cn("w-full", className)}>
			<div className="text-center mb-8">
				<h2 className="text-2xl font-bold text-foreground mb-2">
					Compare All Features
				</h2>
				<p className="text-muted-foreground">
					See exactly what you get with each plan
				</p>
			</div>

			<div className="relative overflow-x-auto rounded-xl border border-border/50 bg-card">
				<div
					className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-card to-transparent md:hidden"
					aria-hidden="true"
				/>
				<div className="min-w-[640px]">
					{/* Sticky header */}
					<div className="grid grid-cols-4 items-center py-4 px-6 bg-muted/50 border-b border-border/50 sticky top-0 z-10">
						<div className="text-sm font-medium text-muted-foreground">
							Features
						</div>
						<div className="text-center">
							<div className="text-sm font-semibold text-foreground">
								Starter
							</div>
							<div className="text-xs text-muted-foreground">$19/mo</div>
						</div>
						<div className="text-center bg-primary/5 -my-4 py-4 border-x border-primary/10">
							<div className="text-sm font-semibold text-primary-text">
								Growth
							</div>
							<div className="text-xs text-primary-text">$49/mo</div>
						</div>
						<div className="text-center">
							<div className="text-sm font-semibold text-foreground">Max</div>
							<div className="text-xs text-muted-foreground">
								{MAX_PUBLIC_PRICE_DISPLAY}/mo
							</div>
						</div>
					</div>

					{/* Category sections */}
					{comparisonData.map((category, idx) => (
						<CategorySection
							key={category.category}
							{...category}
							defaultOpen={idx === 0}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
