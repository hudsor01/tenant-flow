import type { LucideIcon } from 'lucide-react'
import {
	Building2,
	FileSpreadsheet,
	FileText,
	TrendingUp,
	Wrench
} from 'lucide-react'

export type ReportFormat = 'pdf' | 'excel'
export type ReportType =
	| 'executive-monthly'
	| 'financial-performance'
	| 'property-portfolio'
	| 'lease-portfolio'
	| 'maintenance-operations'
	| 'tax-preparation'

export interface ReportCard {
	id: ReportType
	title: string
	description: string
	icon: LucideIcon
	formats: ReportFormat[]
	category: 'executive' | 'financial' | 'operations'
}

export const reportCards: ReportCard[] = [
	{
		id: 'executive-monthly',
		title: 'Executive Monthly Report',
		description:
			'Comprehensive monthly summary for leadership with key metrics and trends',
		icon: FileText,
		formats: ['pdf', 'excel'],
		category: 'executive'
	},
	{
		id: 'financial-performance',
		title: 'Financial Performance',
		description:
			'Detailed P&L, NOI by property, and expense breakdown with monthly trends',
		icon: TrendingUp,
		formats: ['pdf', 'excel'],
		category: 'financial'
	},
	{
		id: 'property-portfolio',
		title: 'Property Portfolio',
		description:
			'Portfolio analysis with property rankings, occupancy metrics, and vacancy analysis',
		icon: Building2,
		formats: ['pdf', 'excel'],
		category: 'operations'
	},
	{
		id: 'lease-portfolio',
		title: 'Lease Portfolio',
		description:
			'Lease analytics including profitability scores, lifecycle trends, and status breakdown',
		icon: FileText,
		formats: ['pdf', 'excel'],
		category: 'financial'
	},
	{
		id: 'maintenance-operations',
		title: 'Maintenance Operations',
		description:
			'Operations metrics with response times, cost breakdown, and urgency analysis',
		icon: Wrench,
		formats: ['pdf', 'excel'],
		category: 'operations'
	},
	{
		id: 'tax-preparation',
		title: 'Tax Preparation',
		description:
			'Tax-ready report with Schedule E codes and depreciation calculations (Excel only)',
		icon: FileSpreadsheet,
		formats: ['excel'],
		category: 'financial'
	}
]

// Report generation stub -- calls generate-pdf Edge Function when implemented
export const reportsClient = {
	generateReport: async (
		_reportType: ReportType,
		_params: {
			user_id: string
			start_date: string
			end_date: string
			format: ReportFormat
		}
	): Promise<void> => {
		throw new Error(
			'Report generation requires StirlingPDF Edge Function implementation'
		)
	}
}
