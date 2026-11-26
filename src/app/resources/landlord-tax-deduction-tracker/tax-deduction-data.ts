/**
 * The tracker's deductions, each on its own Schedule E (Form 1040) Part I
 * line. Checked 2026-11-25 against the 2026 Schedule E and its instructions
 * (irs.gov/pub/irs-dft/f1040se--dft.pdf, i1040se--dft.pdf), Pub. 527, Pub.
 * 946, Treas. Reg. § 1.263(a)-3, IR-2025-128 and Announcement 2026-11.
 * Re-check every January: the mileage rate, the safe-harbor limits and the
 * form's line layout change.
 */

/**
 * The date the rows above were last checked, shown under the H1 and given as
 * the page's `dateModified`; `review-freshness.test.ts` fails once its tax
 * year is behind the calendar year.
 */
export const TAX_DATA_CHECKED_AT = "2026-11-25";

/** The tax year the rows describe. */
export const TAX_YEAR = 2026;

/** When the tracker was first published (its page's first commit). */
export const TAX_TRACKER_PUBLISHED_AT = "2026-04-01";

/** A Schedule E Part I expense line on the 2026 form (5 through 19). */
const SCHEDULE_E_LINES = [
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"11",
	"12",
	"13a",
	"13b",
	"14",
	"15",
	"16",
	"17",
	"18",
	"19",
] as const;

export type ScheduleELine = (typeof SCHEDULE_E_LINES)[number];

export interface DeductionCategory {
	category: string;
	color: string;
	headerColor: string;
	/** Shown under the category heading, for rules that aren't one row. */
	note?: string;
	items: Array<{
		deduction: string;
		line: ScheduleELine;
		description: string;
		example: string;
	}>;
}

/** "Line 12" or "Lines 9, 16, 17, 19", in the form's order. */
export function scheduleLinesLabel(category: DeductionCategory): string {
	const lines = SCHEDULE_E_LINES.filter((line) =>
		category.items.some((item) => item.line === line),
	);
	return `Schedule E, ${lines.length === 1 ? "Line" : "Lines"} ${lines.join(", ")}`;
}

export const deductionCategories: DeductionCategory[] = [
	{
		category: "Mortgage & Financing",
		color: "border-info/20",
		headerColor: "bg-info/10 text-info-text",
		items: [
			{
				deduction: "Mortgage Interest",
				line: "12",
				description:
					"Interest paid to a bank or lender on loans used to buy or improve the rental",
				example: "Interest shown on your Form 1098",
			},
			{
				deduction: "Points & Loan Origination Fees",
				line: "12",
				description:
					"Points paid to get a rental-property loan, purchase or refinance, deducted over the life of the loan",
				example:
					"$3,000 in points on a 30-year loan = $100/year (straight-line applies when the points are small enough; see Pub. 527)",
			},
			{
				deduction: "Other Interest",
				line: "13b",
				description:
					"Interest on other loans, to the extent the money went to the rental",
				example:
					"HELOC interest on the part of the loan spent on rental repairs",
			},
		],
	},
	{
		category: "Property Expenses",
		color: "border-success/20",
		headerColor: "bg-success/10 text-success-text",
		items: [
			{
				deduction: "Insurance Premiums",
				line: "9",
				description:
					"Landlord, liability, flood and umbrella premiums for the rental (rental share only; a multi-year prepayment is deducted year by year)",
				example: "Annual premium from your policy's declarations page",
			},
			{
				deduction: "Property Taxes",
				line: "16",
				description:
					"State and local property taxes on the rental (assessments for new streets, sidewalks or sewers are added to basis instead)",
				example: "Annual property tax bill from the county assessor",
			},
			{
				deduction: "Utilities",
				line: "17",
				description:
					"Utilities paid by the landlord (water, electric, gas, trash, internet)",
				example: "Water bill paid by landlord: $80/month per unit",
			},
			{
				deduction: "HOA / Condo Fees",
				line: "19",
				description:
					"Regular association dues for the rental unit (special assessments for improvements are depreciated, not deducted)",
				example: "Monthly HOA fee of $350 = $4,200/year",
			},
		],
	},
	{
		category: "Repairs & Maintenance",
		color: "border-warning/20",
		headerColor: "bg-warning/10 text-warning-text",
		items: [
			{
				deduction: "Cleaning & Maintenance",
				line: "7",
				description:
					"Ongoing upkeep: lawn care, snow removal, pest control, cleaning",
				example: "Monthly lawn service: $120/month = $1,440/year",
			},
			{
				deduction: "Routine Repairs",
				line: "14",
				description:
					"Fixing broken items to restore property to working condition",
				example:
					"Fixing a leaky faucet ($150), replacing a broken window ($300)",
			},
			{
				deduction: "Appliance & System Repairs",
				line: "14",
				description:
					"Repairing (not replacing) appliances and systems: HVAC service, dishwasher fix",
				example: "HVAC tune-up: $150/visit, dishwasher repair: $200",
			},
			{
				deduction: "Painting & Flooring",
				line: "14",
				description: "Repainting between tenants, minor flooring repairs",
				example: "Interior repaint between tenants",
			},
		],
	},
	{
		category: "Depreciation",
		color: "border-primary/20",
		headerColor: "bg-primary/10 text-primary-text",
		note: "Elections made each year with a statement on your return: items costing $2,500 or less per invoice or item can be deducted in full (de minimis safe harbor). If the building's unadjusted basis is $1 million or less, repairs and improvements on it totaling no more than $10,000 or 2% of that basis, whichever is less, can be deducted in full (safe harbor for small taxpayers).",
		items: [
			{
				deduction: "Building",
				line: "18",
				description:
					"The building's cost, not the land's, recovered over 27.5 years (straight-line)",
				example:
					"$275,000 building basis / 27.5 = $10,000 per full year; the first and last years are prorated",
			},
			{
				deduction: "Building Improvements",
				line: "18",
				description:
					"Roof, HVAC system, water heater, additions: depreciated over 27.5 years, like the building",
				example: "New $15,000 roof / 27.5 = $545 per full year",
			},
			{
				deduction: "Appliances, Carpet & Furniture",
				line: "18",
				description:
					"5-year property. For items bought in 2026, 100% bonus depreciation applies unless you elect out",
				example:
					"New $1,200 refrigerator: deducted in full for 2026 with bonus depreciation",
			},
			{
				deduction: "Land Improvements",
				line: "18",
				description:
					"Fences, driveways, parking areas, shrubbery: 15-year property. For 2026 purchases, 100% bonus depreciation applies unless you elect out",
				example:
					"New $6,000 fence: deducted in full for 2026, or over 15 years if you elect out",
			},
		],
	},
	{
		category: "Professional Services",
		color: "border-destructive/20",
		headerColor: "bg-destructive/10 text-destructive-text",
		items: [
			{
				deduction: "Legal Fees",
				line: "10",
				description:
					"Attorney fees for lease drafting or review and evictions (fees to buy the property, defend its title or improve it are added to basis)",
				example: "Eviction attorney's invoice",
			},
			{
				deduction: "Accounting / Tax Prep",
				line: "10",
				description: "CPA fees for rental property tax preparation and advice",
				example: "Annual tax prep with Schedule E",
			},
			{
				deduction: "Property Management Fees",
				line: "11",
				description: "Fees paid to a property manager",
				example: "$1,500/month rent x a 10% fee = $150/month = $1,800/year",
			},
			{
				deduction: "Tenant Screening",
				line: "19",
				description:
					"Background check and credit report fees (if paid by landlord)",
				example: "Screening fee for each applicant",
			},
		],
	},
	{
		category: "Travel & Auto",
		color: "border-info/20",
		headerColor: "bg-info/10 text-info-text",
		note: "Claiming car expenses? Also complete Form 4562, Part V.",
		items: [
			{
				deduction: "Mileage (Standard Rate)",
				line: "6",
				description:
					"Trips to manage, maintain or show the property, at the IRS standard rate (2026: 72.5 cents a mile through June 30, 76 cents from July 1), plus parking and tolls",
				example: "500 miles driven July to December 2026 x 76 cents = $380",
			},
			{
				deduction: "Travel to Distant Properties",
				line: "6",
				description:
					"Airfare, lodging and 50% of meals when the trip's main purpose is managing or maintaining the rental (not improving it)",
				example: "Quarterly trips to an out-of-state rental: flights + hotel",
			},
			{
				deduction: "Vehicle Loan Interest",
				line: "13a",
				description:
					"The rental-use share of interest on a loan for a vehicle used in the rental activity (a new line on the 2026 form)",
				example: "$1,000 of interest x 40% rental use = $400",
			},
		],
	},
	{
		category: "Other Deductions",
		color: "bg-muted/50 border-border",
		headerColor: "bg-muted text-foreground",
		items: [
			{
				deduction: "Advertising",
				line: "5",
				description: "Listing fees, signage, online advertising for vacancies",
				example: "Listing-site fees and a yard sign",
			},
			{
				deduction: "Office Supplies",
				line: "15",
				description:
					"Printer ink, paper, envelopes, stamps for rental correspondence",
				example: "Stamps and envelopes for lease renewals",
			},
			{
				deduction: "Software & Tools",
				line: "19",
				description: "Property management software subscriptions",
				example: "TenantFlow subscription: $19-$149/month",
			},
			{
				deduction: "Association Dues & Education",
				line: "19",
				description:
					"Landlord association dues and publications; seminar or course costs only if your rental is a trade or business",
				example: "Local landlord association membership",
			},
		],
	},
];
