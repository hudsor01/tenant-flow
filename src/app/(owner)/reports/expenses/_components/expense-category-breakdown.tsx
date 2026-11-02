import { Receipt } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { formatCurrency } from "#lib/utils/currency";

/**
 * One of get_expense_summary's `categories`: the year to date's expenses by
 * vendor. A "category" is the vendor's name as the owner entered it
 * (coalesce(nullif(vendor_name, ''), 'Other')); the data model has no expense
 * category of its own.
 */
interface VendorSummary {
	category: string;
	amount: number;
	percentage: number;
}

interface ExpenseCategoryBreakdownProps {
	categories: VendorSummary[];
}

/**
 * The year to date's expenses by vendor, each vendor named as entered. The
 * chips ran each name through a first-letter capitalizer ("acme plumbing"
 * read "Acme plumbing") and a style map keyed on category names no vendor has
 * (maintenance, utilities, insurance, taxes, management), so every chip took
 * the map's default; that default is the one style here.
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
