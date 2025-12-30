/**
 * Lease Template Builder - Dynamic Lease Agreement Generator
 * 
 * This client component provides an interactive lease template builder
 * with clause selection, state-specific rules, and PDF generation.
 */

'use client'

import * as React from 'react'
import {
	leaseTemplateSchema,
	renderLeaseHtmlBody,
	getDefaultSelections,
	createDefaultContext,
	type LeaseTemplateSelections,
	type LeaseTemplateContext,
	type CustomClause,
	stateNames
} from '@repo/shared/templates/lease-template'
import type { USState } from '@repo/shared/types/lease-generator.types'
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
import { API_BASE_URL } from '#lib/api-config'

// Import extracted components
import { PreviewPanel } from './components/preview-panel'
import { PdfPreviewPanel } from './components/pdf-preview-panel'
import { ClauseSelector } from './components/clause-selector'
import {
	ConfigurationPanel,
	type LeaseBuilderInputs
} from './components/configuration-panel'
import { StateRuleSummary } from './components/state-rule-summary'

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
	const [state, setState] = React.useState<USState>(defaultState)
	const [includeStateDisclosures, setIncludeStateDisclosures] =
		React.useState(true)
	const [includeFederalDisclosures, setIncludeFederalDisclosures] =
		React.useState(true)
	const [selectedClauses, setSelectedClauses] = React.useState<string[]>(
		() =>
			getDefaultSelections(leaseTemplateSchema, defaultState).selectedClauses
	)
	const customClauses = React.useMemo<CustomClause[]>(() => [], [])
	const [pdfPreview, setPdfPreview] = React.useState<string | null>(null)
	const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false)

	const [builderInputs, setBuilderInputs] = React.useState<LeaseBuilderInputs>({
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

	const context: LeaseTemplateContext = React.useMemo(() => {
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
	}, [builderInputs, state])

	const selections: LeaseTemplateSelections = React.useMemo(
		() => ({
			state,
			selectedClauses,
			includeFederalDisclosures,
			includeStateDisclosures,
			customClauses
		}),
		[
			state,
			selectedClauses,
			includeFederalDisclosures,
			includeStateDisclosures,
			customClauses
		]
	)

	const previewHtml = React.useMemo(() => {
		return renderLeaseHtmlBody(leaseTemplateSchema, selections, context)
	}, [context, selections])

	const recommendedClauses = React.useMemo(() => {
		return new Set(
			leaseTemplateSchema.stateRules[state]?.recommendedClauses ?? []
		)
	}, [state])

	const toggleClause = React.useCallback((clauseId: string) => {
		setSelectedClauses(prev =>
			prev.includes(clauseId)
				? prev.filter(id => id !== clauseId)
				: [...prev, clauseId]
		)
	}, [])

	const handlePreviewPdf = React.useCallback(async () => {
		setIsGeneratingPdf(true)
		try {
			const response = await fetch(
				`${API_BASE_URL}/api/v1/pdf/lease/template/preview`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ selections, context })
				}
			)

			if (!response.ok) {
				throw new Error('Failed to generate PDF preview')
			}

			const payload = await response.json()
			if (!payload.pdf) {
				throw new Error('Invalid PDF response')
			}

			setPdfPreview(`data:application/pdf;base64,${payload.pdf}`)
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
	}, [context, selections])

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
