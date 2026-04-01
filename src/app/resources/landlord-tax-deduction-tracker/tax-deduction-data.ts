export interface DeductionCategory {
	category: string
	scheduleRef: string
	color: string
	headerColor: string
	items: Array<{
		deduction: string
		description: string
		example: string
	}>
}

export const deductionCategories: DeductionCategory[] = [
	{
		category: 'Mortgage & Financing',
		scheduleRef: 'Schedule E, Line 12-13',
		color: 'bg-blue-50 border-blue-200',
		headerColor: 'bg-blue-100 text-blue-900',
		items: [
			{
				deduction: 'Mortgage Interest',
				description: 'Interest paid on loans used to acquire or improve rental property',
				example: 'Monthly mortgage interest portion from Form 1098',
			},
			{
				deduction: 'Points & Loan Origination Fees',
				description: 'Points paid to obtain a mortgage (amortized over loan term for refinances)',
				example: '$3,000 in points on a 30-year loan = $100/year',
			},
			{
				deduction: 'Loan Interest (Other)',
				description: 'Interest on other loans used for rental property purposes',
				example: 'HELOC used for rental property renovations',
			},
		],
	},
	{
		category: 'Property Expenses',
		scheduleRef: 'Schedule E, Lines 5-19',
		color: 'bg-green-50 border-green-200',
		headerColor: 'bg-green-100 text-green-900',
		items: [
			{
				deduction: 'Property Taxes',
				description: 'State and local property taxes on rental property',
				example: 'Annual property tax bill from county assessor',
			},
			{
				deduction: 'Insurance Premiums',
				description: 'Landlord insurance, liability, flood, umbrella policies',
				example: 'Annual landlord policy: $1,200-$2,400/year per property',
			},
			{
				deduction: 'HOA / Condo Fees',
				description: 'Monthly association fees for rental units in managed communities',
				example: 'Monthly HOA fee of $350 = $4,200/year',
			},
			{
				deduction: 'Utilities',
				description: 'Utilities paid by landlord (water, electric, gas, trash, internet)',
				example: 'Water bill paid by landlord: $80/month per unit',
			},
		],
	},
	{
		category: 'Repairs & Maintenance',
		scheduleRef: 'Schedule E, Line 14',
		color: 'bg-amber-50 border-amber-200',
		headerColor: 'bg-amber-100 text-amber-900',
		items: [
			{
				deduction: 'Routine Repairs',
				description: 'Fixing broken items to restore property to working condition',
				example: 'Fixing a leaky faucet ($150), replacing a broken window ($300)',
			},
			{
				deduction: 'Maintenance Services',
				description: 'Ongoing maintenance: lawn care, snow removal, pest control, cleaning',
				example: 'Monthly lawn service: $120/month = $1,440/year',
			},
			{
				deduction: 'Appliance Repairs',
				description: 'Repairing (not replacing) appliances: HVAC service, dishwasher fix',
				example: 'HVAC tune-up: $150/visit, dishwasher repair: $200',
			},
			{
				deduction: 'Painting & Flooring',
				description: 'Repainting between tenants, minor flooring repairs',
				example: 'Interior repaint: $1,500-$3,000 per unit',
			},
		],
	},
	{
		category: 'Depreciation',
		scheduleRef: 'Schedule E, Line 18 / Form 4562',
		color: 'bg-purple-50 border-purple-200',
		headerColor: 'bg-purple-100 text-purple-900',
		items: [
			{
				deduction: 'Building Depreciation',
				description: 'Residential rental property depreciated over 27.5 years (straight-line)',
				example: '$275,000 building value / 27.5 = $10,000/year deduction',
			},
			{
				deduction: 'Appliance / Equipment',
				description: 'Major appliances and equipment depreciated over 5-7 years',
				example: 'New $2,500 HVAC unit: $357-$500/year for 5-7 years',
			},
			{
				deduction: 'Improvements (Section 179)',
				description: 'Qualifying improvements can be expensed immediately up to annual limit',
				example: 'New roof ($15,000) may qualify under safe harbor rules',
			},
			{
				deduction: 'Land Improvements',
				description: 'Fencing, parking lots, landscaping depreciated over 15 years',
				example: 'New fence ($6,000) = $400/year for 15 years',
			},
		],
	},
	{
		category: 'Professional Services',
		scheduleRef: 'Schedule E, Lines 10-11, 17',
		color: 'bg-rose-50 border-rose-200',
		headerColor: 'bg-rose-100 text-rose-900',
		items: [
			{
				deduction: 'Property Management Fees',
				description: 'Fees paid to property management company (typically 8-12% of rent)',
				example: '$1,500/month rent x 10% = $150/month = $1,800/year',
			},
			{
				deduction: 'Legal Fees',
				description: 'Attorney fees for lease review, evictions, entity formation',
				example: 'Eviction attorney: $500-$2,000 per case',
			},
			{
				deduction: 'Accounting / Tax Prep',
				description: 'CPA fees for rental property tax preparation and advice',
				example: 'Annual tax prep with Schedule E: $300-$800',
			},
			{
				deduction: 'Tenant Screening',
				description: 'Background check and credit report fees (if paid by landlord)',
				example: '$30-$50 per applicant screened',
			},
		],
	},
	{
		category: 'Travel & Auto',
		scheduleRef: 'Schedule E / Form 4562',
		color: 'bg-teal-50 border-teal-200',
		headerColor: 'bg-teal-100 text-teal-900',
		items: [
			{
				deduction: 'Mileage (Standard Rate)',
				description: 'IRS standard mileage rate for rental property trips (2025: 70 cents/mile)',
				example: '500 miles/year for showings, repairs, inspections = $350 deduction',
			},
			{
				deduction: 'Travel to Distant Properties',
				description: 'Airfare, hotel, and meals for managing out-of-area rental property',
				example: 'Quarterly trips to out-of-state rental: flights + hotel',
			},
		],
	},
	{
		category: 'Other Deductions',
		scheduleRef: 'Schedule E, Line 19',
		color: 'bg-gray-50 border-gray-200',
		headerColor: 'bg-gray-100 text-gray-900',
		items: [
			{
				deduction: 'Advertising',
				description: 'Listing fees, signage, online advertising for vacancies',
				example: 'Zillow listing: $10-$30/week, yard sign: $25',
			},
			{
				deduction: 'Software & Tools',
				description: 'Property management software subscriptions',
				example: 'TenantFlow subscription: $29-$199/month',
			},
			{
				deduction: 'Office Supplies',
				description: 'Printer ink, paper, envelopes, stamps for rental correspondence',
				example: '$100-$300/year in supplies',
			},
			{
				deduction: 'Education',
				description: 'Landlord courses, books, membership dues for real estate associations',
				example: 'Local landlord association membership: $100-$300/year',
			},
		],
	},
]
