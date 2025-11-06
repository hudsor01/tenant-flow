'use client'

import * as React from 'react'
import DOMPurify from 'dompurify'
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
import { Badge } from '#components/ui/badge'
import { Checkbox } from '#components/ui/checkbox'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '#components/ui/tooltip'
import { toast } from 'sonner'
import { BookOpen, Download, FileText, Info, RefreshCw } from 'lucide-react'
import { cn } from '#lib/utils'
import { API_BASE_URL } from '#lib/api-config'

const ALL_US_STATES: USState[] = [
	'AL',
	'AK',
	'AZ',
	'AR',
	'CA',
	'CO',
	'CT',
	'DE',
	'FL',
	'GA',
	'HI',
	'ID',
	'IL',
	'IN',
	'IA',
	'KS',
	'KY',
	'LA',
	'ME',
	'MD',
	'MA',
	'MI',
	'MN',
	'MS',
	'MO',
	'MT',
	'NE',
	'NV',
	'NH',
	'NJ',
	'NM',
	'NY',
	'NC',
	'ND',
	'OH',
	'OK',
	'OR',
	'PA',
	'RI',
	'SC',
	'SD',
	'TN',
	'TX',
	'UT',
	'VT',
	'VA',
	'WA',
	'WV',
	'WI',
	'WY',
	'DC'
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

	const [builderInputs, setBuilderInputs] = React.useState({
		ownerName: 'Property Management LLC',
		ownerAddress: '456 Business Ave, Suite 400, San Francisco, CA 94108',
		tenantNames: 'John Doe; Jane Doe',
		propertyAddress: '123 Main Street, San Francisco, CA 94105',
		rentAmount: '3500',
		securityDeposit: '3500',
		rentDueDay: '1',
		leaseStartDate: '2024-01-01',
		leaseEndDate: '2024-12-31',
		lateFeeAmount: '100',
		gracePeriodDays: '5'
	})

	const context: LeaseTemplateContext = React.useMemo(() => {
		return createDefaultContext({
			ownerName: builderInputs.ownerName,
			ownerAddress: builderInputs.ownerAddress,
			tenantNames: builderInputs.tenantNames,
			propertyAddress: builderInputs.propertyAddress,
			propertyState: state,
			rentAmountCents: dollarsToCents(builderInputs.rentAmount),
			securityDepositCents: dollarsToCents(builderInputs.securityDeposit),
			rentDueDay: Number(builderInputs.rentDueDay) || 1,
			leaseStartDateISO: builderInputs.leaseStartDate,
			leaseEndDateISO: builderInputs.leaseEndDate,
			lateFeeAmountCents: dollarsToCents(builderInputs.lateFeeAmount),
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
			// Call backend PDF service with correct /api/v1/ prefix
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

function ConfigurationPanel(props: {
	builderInputs: {
		ownerName: string
		ownerAddress: string
		tenantNames: string
		propertyAddress: string
		rentAmount: string
		securityDeposit: string
		rentDueDay: string
		leaseStartDate: string
		leaseEndDate: string
		lateFeeAmount: string
		gracePeriodDays: string
	}
	onChange: React.Dispatch<
		React.SetStateAction<{
			ownerName: string
			ownerAddress: string
			tenantNames: string
			propertyAddress: string
			rentAmount: string
			securityDeposit: string
			rentDueDay: string
			leaseStartDate: string
			leaseEndDate: string
			lateFeeAmount: string
			gracePeriodDays: string
		}>
	>
	includeStateDisclosures: boolean
	onToggleStateDisclosures: () => void
	includeFederalDisclosures: boolean
	onToggleFederalDisclosures: () => void
}) {
	const {
		builderInputs,
		onChange,
		includeStateDisclosures,
		onToggleStateDisclosures,
		includeFederalDisclosures,
		onToggleFederalDisclosures
	} = props

	return (
		<Card className="shadow-sm">
			<CardHeader>
				<CardTitle className="text-base">Lease Details</CardTitle>
				<CardDescription>
					Provide base information to personalize the clause text.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<LabeledInput
					label="owner"
					value={builderInputs.ownerName}
					onChange={event =>
						onChange(prev => ({ ...prev, ownerName: event.target.value }))
					}
				/>
				<LabeledInput
					label="owner address"
					value={builderInputs.ownerAddress}
					onChange={event =>
						onChange(prev => ({ ...prev, ownerAddress: event.target.value }))
					}
				/>
				<LabeledInput
					label="Tenant names"
					helpText="Separate multiple tenants with semicolons"
					value={builderInputs.tenantNames}
					onChange={event =>
						onChange(prev => ({ ...prev, tenantNames: event.target.value }))
					}
				/>
				<LabeledInput
					label="Premises address"
					value={builderInputs.propertyAddress}
					onChange={event =>
						onChange(prev => ({ ...prev, propertyAddress: event.target.value }))
					}
				/>
				<div className="grid grid-cols-2 gap-3">
					<LabeledInput
						label="Rent (USD)"
						value={builderInputs.rentAmount}
						onChange={event =>
							onChange(prev => ({ ...prev, rentAmount: event.target.value }))
						}
					/>
					<LabeledInput
						label="Deposit (USD)"
						value={builderInputs.securityDeposit}
						onChange={event =>
							onChange(prev => ({
								...prev,
								securityDeposit: event.target.value
							}))
						}
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<LabeledInput
						label="Rent due day"
						type="number"
						value={builderInputs.rentDueDay}
						onChange={event =>
							onChange(prev => ({ ...prev, rentDueDay: event.target.value }))
						}
					/>
					<LabeledInput
						label="Grace period (days)"
						type="number"
						value={builderInputs.gracePeriodDays}
						onChange={event =>
							onChange(prev => ({
								...prev,
								gracePeriodDays: event.target.value
							}))
						}
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<LabeledInput
						label="Lease start"
						type="date"
						value={builderInputs.leaseStartDate}
						onChange={event =>
							onChange(prev => ({
								...prev,
								leaseStartDate: event.target.value
							}))
						}
					/>
					<LabeledInput
						label="Lease end"
						type="date"
						value={builderInputs.leaseEndDate}
						onChange={event =>
							onChange(prev => ({ ...prev, leaseEndDate: event.target.value }))
						}
					/>
				</div>
				<LabeledInput
					label="Late fee (USD)"
					value={builderInputs.lateFeeAmount}
					onChange={event =>
						onChange(prev => ({ ...prev, lateFeeAmount: event.target.value }))
					}
				/>

				<div className="flex flex-col gap-2 pt-4">
					<label
						htmlFor="include-state-disclosures"
						className="flex items-center gap-2 text-sm font-medium"
					>
						<Checkbox
							id="include-state-disclosures"
							checked={includeStateDisclosures}
							onCheckedChange={onToggleStateDisclosures}
						/>
						Include state disclosures
					</label>
					<label
						htmlFor="include-federal-disclosures"
						className="flex items-center gap-2 text-sm font-medium"
					>
						<Checkbox
							id="include-federal-disclosures"
							checked={includeFederalDisclosures}
							onCheckedChange={onToggleFederalDisclosures}
						/>
						Include federal notices
					</label>
				</div>
			</CardContent>
		</Card>
	)
}

function LabeledInput(
	props: React.InputHTMLAttributes<HTMLInputElement> & {
		label: string
		helpText?: string
	}
) {
	const { label, helpText, ...inputProps } = props
	const id = React.useId()
	return (
		<div className="space-y-1 text-xs">
			<label htmlFor={id} className="font-medium text-muted-foreground">
				{label}
			</label>
			<Input
				id={id}
				{...inputProps}
				className={cn('h-9 text-sm', inputProps.className)}
			/>
			{helpText ? <p className="text-muted-foreground/80">{helpText}</p> : null}
		</div>
	)
}

function ClauseSelector(props: {
	selectedClauses: string[]
	onToggleClause: (id: string) => void
	recommendedClauses: Set<string>
	state: USState
}) {
	const { selectedClauses, onToggleClause, recommendedClauses, state } = props

	return (
		<Card className="shadow-sm">
			<CardHeader>
				<CardTitle className="text-base">Clause Library</CardTitle>
				<CardDescription>
					Choose the clauses to include. Recommended clauses for {state} are
					highlighted.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				{leaseTemplateSchema.sections.map(section => (
					<div key={section.id} className="space-y-3">
						<div>
							<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
								{section.title}
							</h3>
							<p className="text-xs text-muted-foreground">
								{section.description}
							</p>
						</div>
						<div className="space-y-2">
							{section.clauses.map(clause => {
								const selected = selectedClauses.includes(clause.id)
								const recommended = recommendedClauses.has(clause.id)
								return (
									<div
										key={clause.id}
										className={cn(
											'rounded-lg border p-3 transition-colors',
											selected ? 'border-primary bg-primary/5' : 'border-border'
										)}
									>
										<div className="flex items-start justify-between gap-2">
											<label
												className="flex flex-1 cursor-pointer items-start gap-3 text-sm"
												htmlFor={clause.id}
											>
												<Checkbox
													id={clause.id}
													checked={selected}
													onCheckedChange={() => onToggleClause(clause.id)}
												/>
												<span>
													<span className="font-medium text-foreground flex items-center gap-2">
														{clause.title}
														{recommended && (
															<Badge variant="secondary">Recommended</Badge>
														)}
													</span>
													<span className="text-xs text-muted-foreground">
														{clause.description}
													</span>
												</span>
											</label>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type="button"
														className="text-muted-foreground"
													>
														<Info className="size-4" />
													</button>
												</TooltipTrigger>
												<TooltipContent className="max-w-xs text-xs">
													{clause.tooltip}
												</TooltipContent>
											</Tooltip>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	)
}

function PreviewPanel({ html }: { html: string }) {
	// Sanitize HTML to prevent XSS attacks
	const sanitizedHtml = React.useMemo(() => {
		if (typeof window === 'undefined') return html
		return DOMPurify.sanitize(html, {
			ALLOWED_TAGS: [
				'p',
				'div',
				'span',
				'br',
				'strong',
				'em',
				'u',
				'h1',
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'ul',
				'ol',
				'li',
				'table',
				'thead',
				'tbody',
				'tr',
				'th',
				'td'
			],
			ALLOWED_ATTR: ['class', 'style'],
			ADD_ATTR: [], // Explicitly block all attributes except allowed
			ALLOW_DATA_ATTR: false, // Block data-* attributes
			FORBID_TAGS: ['script', 'iframe', 'embed', 'object', 'form'], // Explicitly block dangerous tags
			FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'] // Block event handlers
		})
	}, [html])

	return (
		<Card className="shadow-sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<FileText className="size-4 text-primary" /> HTML Preview
				</CardTitle>
				<CardDescription>
					Rendered lease agreement using the selected clauses.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div
					className="prose max-w-none rounded-lg border bg-white p-6 text-sm shadow-inner"
					dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
				/>
			</CardContent>
		</Card>
	)
}

function PdfPreviewPanel(props: {
	isGenerating: boolean
	dataUrl: string | null
	onGenerate: () => void
}) {
	const { isGenerating, dataUrl, onGenerate } = props
	return (
		<Card className="shadow-sm">
			<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<CardTitle className="flex items-center gap-2 text-base">
						<Download className="size-4 text-primary" /> PDF Preview
					</CardTitle>
					<CardDescription>
						Generate a printable PDF using the current selections.
					</CardDescription>
				</div>
				<Button
					onClick={onGenerate}
					disabled={isGenerating}
					variant="default"
					size="sm"
				>
					{isGenerating ? (
						<span className="flex items-center gap-2">
							<RefreshCw className="size-4 animate-spin" /> Generating…
						</span>
					) : (
						<>
							<Download className="mr-1 size-4" /> Render PDF
						</>
					)}
				</Button>
			</CardHeader>
			<CardContent>
				{dataUrl ? (
					<div className="h-[480px] w-full overflow-hidden rounded-lg border">
						<iframe
							src={dataUrl}
							title="Lease PDF Preview"
							className="h-full w-full"
						/>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						Generate a preview to view the PDF in-line. You can download it
						directly from the preview frame.
					</p>
				)}
			</CardContent>
		</Card>
	)
}

function StateRuleSummary({ state }: { state: USState }) {
	const rules = leaseTemplateSchema.stateRules[state]
	if (!rules) return null
	return (
		<Card className="shadow-sm">
			<CardHeader>
				<CardTitle className="text-base">
					{rules.stateName} Highlights
				</CardTitle>
				<CardDescription>
					Automatic notes drawn from TenantFlow’s compliance library.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 text-xs">
				<ul className="list-disc space-y-2 pl-4">
					{rules.notices.map(notice => (
						<li key={notice}>{notice}</li>
					))}
				</ul>
			</CardContent>
		</Card>
	)
}
