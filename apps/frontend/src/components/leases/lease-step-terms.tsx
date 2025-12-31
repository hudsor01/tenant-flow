'use client'

import { Calendar, DollarSign, FileText } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { LeaseTemplate, LeaseFormData } from './types'

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Calculate lease end date based on start date and template term
 */
function calculateEndDate(startDate: string, months: number): string {
	const date = new Date(startDate)
	date.setMonth(date.getMonth() + months)
	date.setDate(date.getDate() - 1) // End day before anniversary
	const isoString = date.toISOString()
	return isoString.slice(0, 10)
}

// ============================================================================
// TYPES
// ============================================================================

export interface LeaseStepTermsProps {
	templates: LeaseTemplate[]
	formData: Partial<LeaseFormData>
	onFormDataChange: (data: Partial<LeaseFormData>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LeaseStepTerms - Lease terms configuration step for lease wizard
 *
 * Features:
 * - Template selection with auto end-date calculation
 * - Date pickers for start/end dates
 * - Financial inputs (rent, deposit, late fee)
 * - Payment configuration (due day, grace period)
 */
export function LeaseStepTerms({
	templates,
	formData,
	onFormDataChange
}: LeaseStepTermsProps) {
	const handleTemplateSelect = (template: LeaseTemplate) => {
		const newEndDate = formData.startDate
			? calculateEndDate(formData.startDate, template.leaseTerm)
			: undefined

		if (newEndDate) {
			onFormDataChange({
				...formData,
				templateId: template.id,
				endDate: newEndDate
			})
		} else {
			const { endDate: _removed, ...rest } = formData
			onFormDataChange({
				...rest,
				templateId: template.id
			})
		}
	}

	const handleStartDateChange = (startDate: string) => {
		const template = templates.find(t => t.id === formData.templateId)
		const newEndDate = template
			? calculateEndDate(startDate, template.leaseTerm)
			: undefined

		if (newEndDate) {
			onFormDataChange({
				...formData,
				startDate,
				endDate: newEndDate
			})
		} else {
			const { endDate: _removed, ...rest } = formData
			onFormDataChange({
				...rest,
				startDate
			})
		}
	}

	return (
		<BlurFade delay={0.3} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<h2 className="text-lg font-medium mb-4">Lease Terms</h2>

				<div className="space-y-6">
					{/* Template Selection */}
					<div>
						<label className="block text-sm font-medium mb-2">
							Lease Template
						</label>
						<div className="grid grid-cols-1 gap-3">
							{templates.map(template => (
								<button
									key={template.id}
									onClick={() => handleTemplateSelect(template)}
									className={`flex items-start gap-3 p-4 rounded-lg border transition-colors text-left ${
										formData.templateId === template.id
											? 'border-primary bg-primary/5'
											: 'border-border hover:border-primary/50'
									}`}
								>
									<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
										<FileText className="w-5 h-5 text-primary" />
									</div>
									<div>
										<div className="flex items-center gap-2">
											<p className="font-medium">{template.name}</p>
											{template.isDefault && (
												<span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
													Default
												</span>
											)}
										</div>
										<p className="text-sm text-muted-foreground mt-1">
											{template.description}
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											{template.leaseTerm === 1
												? 'Month-to-month'
												: `${template.leaseTerm} months`}
										</p>
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Date Selection */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium mb-1">
								<Calendar className="w-4 h-4 inline-block mr-1" />
								Start Date
							</label>
							<input
								type="date"
								value={formData.startDate || ''}
								onChange={e => handleStartDateChange(e.target.value)}
								className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">
								<Calendar className="w-4 h-4 inline-block mr-1" />
								End Date
							</label>
							<input
								type="date"
								value={formData.endDate || ''}
								onChange={e =>
									onFormDataChange({ ...formData, endDate: e.target.value })
								}
								className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					</div>

					{/* Rent & Deposit */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium mb-1">
								<DollarSign className="w-4 h-4 inline-block mr-1" />
								Monthly Rent
							</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									$
								</span>
								<input
									type="number"
									value={formData.rentAmount ? formData.rentAmount / 100 : ''}
									onChange={e =>
										onFormDataChange({
											...formData,
											rentAmount: Number(e.target.value) * 100
										})
									}
									className="w-full pl-8 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">
								<DollarSign className="w-4 h-4 inline-block mr-1" />
								Security Deposit
							</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									$
								</span>
								<input
									type="number"
									value={
										formData.securityDeposit
											? formData.securityDeposit / 100
											: ''
									}
									onChange={e =>
										onFormDataChange({
											...formData,
											securityDeposit: Number(e.target.value) * 100
										})
									}
									className="w-full pl-8 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
						</div>
					</div>

					{/* Payment Settings */}
					<div className="grid grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium mb-1">
								Payment Day
							</label>
							<select
								value={formData.paymentDay || 1}
								onChange={e =>
									onFormDataChange({
										...formData,
										paymentDay: Number(e.target.value)
									})
								}
								className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
							>
								{[1, 5, 10, 15].map(day => (
									<option key={day} value={day}>
										{day}st of month
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Late Fee</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									$
								</span>
								<input
									type="number"
									value={
										formData.lateFeeAmount ? formData.lateFeeAmount / 100 : ''
									}
									onChange={e =>
										onFormDataChange({
											...formData,
											lateFeeAmount: Number(e.target.value) * 100
										})
									}
									className="w-full pl-8 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">
								Grace Period
							</label>
							<select
								value={formData.gracePeriodDays || 3}
								onChange={e =>
									onFormDataChange({
										...formData,
										gracePeriodDays: Number(e.target.value)
									})
								}
								className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
							>
								{[0, 3, 5, 7].map(days => (
									<option key={days} value={days}>
										{days} days
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
