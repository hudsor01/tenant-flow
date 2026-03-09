/**
 * Lease Template Builder - Dynamic Lease Agreement Generator
 *
 * This client component provides an interactive lease template builder
 * with clause selection, state-specific rules, and PDF generation.
 */

'use client'

import { useState } from 'react'
import {
	leaseTemplateSchema,
	renderLeaseHtmlBody,
	getDefaultSelections,
	createDefaultContext,
	type LeaseTemplateSelections,
	type LeaseTemplateContext,
	type CustomClause,
	stateNames
} from '#lib/templates/lease-template'
import type { USState } from '#types/lease-generator.types'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Button } from '#components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { TooltipProvider } from '#components/ui/tooltip'
import { toast } from 'sonner'
import { BookOpen, FileText, RefreshCw } from 'lucide-react'
import { createClient } from '#lib/supabase/client'

// Import extracted components
import { PreviewPanel } from './preview-panel'
import { PdfPreviewPanel } from './pdf-preview-panel'
import { ClauseSelector } from './clause-selector'
import {
	ConfigurationPanel,
	type LeaseBuilderInputs
} from './configuration-panel'
import { StateRuleSummary } from './state-rule-summary'

const ALL_US_STATES: USState[] = [
	'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
	'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
	'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
	'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
	'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

const stateSelectOptions = ALL_US_STATES.map(code => ({
	value: code,
	label: stateNames[code] ?? code
}))

const defaultState: USState = 'CA'

function dollarsToCents(value: string) {
	const numeric = Number(value.replace(/[^0-9.]/g, ''))
	if (Number.isNaN(numeric)) return 0
	return Math.round(numeric * 100)
}

export function LeaseTemplateBuilder() {
	const [state, setState] = useState<USState>(defaultState)
	const [includeStateDisclosures, setIncludeStateDisclosures] =
		useState(true)
	const [includeFederalDisclosures, setIncludeFederalDisclosures] =
		useState(true)
	const [selectedClauses, setSelectedClauses] = useState<string[]>(
		() =>
			getDefaultSelections(leaseTemplateSchema, defaultState).selectedClauses
	)
	const customClauses: CustomClause[] = []
	const [pdfPreview, setPdfPreview] = useState<string | null>(null)
	const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

	const [builderInputs, setBuilderInputs] = useState<LeaseBuilderInputs>({
		ownerName: 'Property Management LLC',
		ownerAddress: '456 Business Ave, Suite 400, San Francisco, CA 94108',
		tenantNames: 'John Doe; Jane Doe',
		propertyAddress: '123 Main Street, San Francisco, CA 94105',
		rent_amount: '3500',
		security_deposit: '3500',
		rentDueDay: '1',
		leasestart_date: '2024-01-01',
		leaseEndDate: '2024-12-31',
		late_fee_amount: '100',
		gracePeriodDays: '5'
	})

	const context: LeaseTemplateContext = (() => {
		return createDefaultContext({
			ownerName: builderInputs.ownerName,
			ownerAddress: builderInputs.ownerAddress,
			tenantNames: builderInputs.tenantNames,
			propertyAddress: builderInputs.propertyAddress,
			propertyState: state,
			rent_amountCents: dollarsToCents(builderInputs.rent_amount),
			security_depositCents: dollarsToCents(builderInputs.security_deposit),
			rentDueDay: Number(builderInputs.rentDueDay) || 1,
			leasestart_dateISO: builderInputs.leasestart_date,
			leaseEndDateISO: builderInputs.leaseEndDate,
			late_fee_amountCents: dollarsToCents(builderInputs.late_fee_amount),
			gracePeriodDays: Number(builderInputs.gracePeriodDays) || 0
		})
	})()

	const selections: LeaseTemplateSelections = ({
			state,
			selectedClauses,
			includeFederalDisclosures,
			includeStateDisclosures,
			customClauses
		})

	const previewHtml = (() => {
		return renderLeaseHtmlBody(leaseTemplateSchema, selections, context)
	})()

	const recommendedClauses = (() => {
		return new Set(
			leaseTemplateSchema.stateRules[state]?.recommendedClauses ?? []
		)
	})()

	const toggleClause = (clauseId: string) => {
		setSelectedClauses(prev =>
			prev.includes(clauseId)
				? prev.filter(id => id !== clauseId)
				: [...prev, clauseId]
		)
	}

	const handlePreviewPdf = async () => {
		setIsGeneratingPdf(true)
		try {
			const supabase = createClient()
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.access_token) throw new Error('Not authenticated')

			const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const response = await fetch(`${baseUrl}/functions/v1/generate-pdf`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ html: previewHtml, filename: 'lease-preview.pdf' }),
			})

			if (!response.ok) {
				const errText = await response.text().catch(() => response.statusText)
				throw new Error(`Failed to generate PDF preview: ${errText}`)
			}

			const blob = await response.blob()
			const blobUrl = URL.createObjectURL(blob)
			setPdfPreview(blobUrl)
			toast.success('PDF preview generated')
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Unable to generate PDF preview'
			toast.error(message)
		} finally {
			setIsGeneratingPdf(false)
		}
	}

	return (
		<TooltipProvider>
			<div className="space-y-6">
				<Card>
					<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<FileText className="hidden size-5 text-primary sm:block" />
								Dynamic Lease Builder
							</CardTitle>
							<CardDescription>
								Choose clauses, review state rules, and preview the generated
								lease before downloading the PDF.
							</CardDescription>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Select
								value={state}
								onValueChange={value => setState(value as USState)}
							>
								<SelectTrigger className="w-[160px]">
									<SelectValue placeholder="Select state" />
								</SelectTrigger>
								<SelectContent className="max-h-72">
									{stateSelectOptions.map(option => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setSelectedClauses(
										getDefaultSelections(leaseTemplateSchema, state)
											.selectedClauses
									)
									toast.success('Restored default clause selection')
								}}
							>
								<RefreshCw className="mr-1 size-4" /> Reset Clauses
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
							<aside className="space-y-6">
								<ConfigurationPanel
									builderInputs={builderInputs}
									onChange={setBuilderInputs}
									includeStateDisclosures={includeStateDisclosures}
									onToggleStateDisclosures={() =>
										setIncludeStateDisclosures(prev => !prev)
									}
									includeFederalDisclosures={includeFederalDisclosures}
									onToggleFederalDisclosures={() =>
										setIncludeFederalDisclosures(prev => !prev)
									}
								/>

								<StateRuleSummary state={state} />
							</aside>
							<div className="space-y-6">
								<ClauseSelector
									selectedClauses={selectedClauses}
									onToggleClause={toggleClause}
									recommendedClauses={recommendedClauses}
									state={state}
								/>

								<PreviewPanel html={previewHtml} />

								<PdfPreviewPanel
									isGenerating={isGeneratingPdf}
									dataUrl={pdfPreview}
									onGenerate={handlePreviewPdf}
								/>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BookOpen className="size-5 text-primary" /> Legal Glossary
						</CardTitle>
						<CardDescription>
							Hover over clauses to see plain-language explanations of legal
							terminology.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
						{Object.entries(leaseTemplateSchema.glossary).map(
							([term, definition]) => (
								<div
									key={term}
									className="rounded-lg border bg-muted/30 p-4 text-sm"
								>
									<p className="font-medium text-foreground">{term}</p>
									<p className="text-muted-foreground">{definition}</p>
								</div>
							)
						)}
					</CardContent>
				</Card>
			</div>
		</TooltipProvider>
	)
}
