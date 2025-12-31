export type BrandingInfo = {
	companyName: string
	logoUrl: string | null
	primaryColor: string
}

export type CustomField = {
	label: string
	value: string
}

export type ClauseItem = {
	id: string
	text: string
}

export type TemplatePreviewOptions = {
	templateTitle: string
	state?: string
	branding: BrandingInfo
	customFields: CustomField[]
	clauses: ClauseItem[]
	data: Record<string, unknown>
}
