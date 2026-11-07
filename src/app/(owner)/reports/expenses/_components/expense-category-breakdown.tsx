import { Receipt } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { formatCurrency } from "#lib/utils/currency";
import type { ExpenseCategorySummary } from "#types/analytics";

interface ExpenseCategoryBreakdownProps {
	categories: ExpenseCategorySummary[];
}

/**
 * The year to date's expenses by vendor, each vendor named as entered. The
 * chips ran each name through a first-letter capitalizer ("acme plumbing"
 * read "Acme plumbing") and a style map keyed on maintenance, utilities,
 * insurance, taxes, management and other: a vendor named exactly like a key
 * took that key's style, and every other vendor the map's default, which is
 * the one style here.
 */
export function ExpenseCategoryBreakdown({
	categories,
}: ExpenseCategoryBreakdownProps) {
	if (categories.length === 0) return null;

	return (
		<BlurFade delay={0.35}>
			<div className="bg-card border border-border rounded-lg p-4 mb-6">
				<h3 className="text-sm font-medium text-foreground mb-3">
					Expenses by Vendor, Year to Date
				</h3>
				<div className="flex flex-wrap gap-4">
					{categories.map((vendor) => (
						<div key={vendor.category} className="flex items-center gap-3">
							<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
								<Receipt aria-hidden="true" className="w-3 h-3" />
								{vendor.category}
							</span>
							<span className="text-sm text-muted-foreground">
								{formatCurrency(vendor.amount)} ({vendor.percentage.toFixed(1)}
								%)
							</span>
						</div>
					))}
				</div>
			</div>
		</BlurFade>
	);
}
