export interface LeaseTemplate {
	id: string
	name: string
	description: string
	leaseTerm: number
	isDefault: boolean
	clauses: string[]
	lastUpdated: string
	usageCount: number
}

export interface LeaseTemplatesProps {
	templates: LeaseTemplate[]
	onCreateTemplate: () => void
	onEditTemplate: (templateId: string) => void
	onDuplicateTemplate: (templateId: string) => void
	onDeleteTemplate: (templateId: string) => void
	onSetDefault: (templateId: string) => void
	onPreviewTemplate: (templateId: string) => void
	onDownloadTemplate: (templateId: string) => void
}

export const CLAUSE_LABELS: Record<string, string> = {
	security_deposit: 'Security Deposit',
	late_fees: 'Late Fees',
	maintenance: 'Maintenance Responsibilities',
	utilities: 'Utilities',
	pets_prohibited: 'No Pets',
	pets_allowed: 'Pets Allowed',
	pet_deposit: 'Pet Deposit',
	breed_restrictions: 'Breed Restrictions',
	subletting_prohibited: 'No Subletting',
	'30_day_notice': '30-Day Notice',
	renewal_option: 'Renewal Option'
}

export function formatTemplateDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	})
}
