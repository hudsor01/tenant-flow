'use client'

import { useState } from 'react'
import {
	Building2,
	Users,
	FileText,
	Check,
	ChevronRight,
	ChevronLeft,
	Home,
	User,
	Calendar,
	DollarSign,
	Clock,
	AlertCircle,
	Plus,
	Search
} from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'

interface Property {
	id: string
	name: string
	units: Unit[]
}

interface Unit {
	id: string
	number: string
	bedrooms: number
	bathrooms: number
	rent: number
	status: 'vacant' | 'occupied'
}

interface Tenant {
	id: string
	name: string
	email: string
	phone: string
}

interface Template {
	id: string
	name: string
	description: string
	leaseTerm: number
	isDefault: boolean
}

interface GenerateLeaseProps {
	properties: Property[]
	existingTenants: Tenant[]
	templates: Template[]
	onGenerate: (data: LeaseFormData) => void
	onCancel: () => void
}

interface LeaseFormData {
	propertyId: string
	unitId: string
	tenantId?: string
	newTenant?: {
		name: string
		email: string
		phone: string
	}
	templateId: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit: number
	paymentDay: number
	lateFeeAmount: number
	lateFeeDays: number
	gracePeriodDays: number
}

const STEPS = [
	{ id: 'property', label: 'Property & Unit', icon: Building2 },
	{ id: 'tenant', label: 'Tenant', icon: Users },
	{ id: 'terms', label: 'Lease Terms', icon: FileText },
	{ id: 'review', label: 'Review', icon: Check }
]

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount / 100)
}

export function GenerateLease({
	properties,
	existingTenants,
	templates,
	onGenerate,
	onCancel
}: GenerateLeaseProps) {
	const [currentStep, setCurrentStep] = useState(0)
	const [formData, setFormData] = useState<Partial<LeaseFormData>>({
		paymentDay: 1,
		lateFeeDays: 5,
		lateFeeAmount: 5000,
		gracePeriodDays: 3
	})
	const [tenantMode, setTenantMode] = useState<'existing' | 'new'>('existing')
	const [tenantSearch, setTenantSearch] = useState('')

	// Get selected property and unit
	const selectedProperty = properties.find(p => p.id === formData.propertyId)
	const selectedUnit = selectedProperty?.units.find(
		u => u.id === formData.unitId
	)
	const selectedTenant = existingTenants.find(t => t.id === formData.tenantId)
	const selectedTemplate = templates.find(t => t.id === formData.templateId)

	// Filter tenants by search
	const filteredTenants = existingTenants.filter(
		t =>
			t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
			t.email.toLowerCase().includes(tenantSearch.toLowerCase())
	)

	// Calculate end date based on template
	const calculateEndDate = (startDate: string, months: number) => {
		const date = new Date(startDate)
		date.setMonth(date.getMonth() + months)
		date.setDate(date.getDate() - 1) // End day before anniversary
		return date.toISOString().split('T')[0]
	}

	const handleNext = () => {
		if (currentStep < STEPS.length - 1) {
			setCurrentStep(currentStep + 1)
		}
	}

	const handleBack = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1)
		}
	}

	const handleSubmit = () => {
		if (
			formData.propertyId &&
			formData.unitId &&
			formData.startDate &&
			formData.endDate
		) {
			onGenerate(formData as LeaseFormData)
		}
	}

	const canProceed = () => {
		switch (currentStep) {
			case 0:
				return !!formData.propertyId && !!formData.unitId
			case 1:
				return tenantMode === 'existing'
					? !!formData.tenantId
					: !!(formData.newTenant?.name && formData.newTenant?.email)
			case 2:
				return (
					!!formData.templateId && !!formData.startDate && !!formData.rentAmount
				)
			default:
				return true
		}
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="mb-8">
					<h1 className="text-2xl font-semibold text-foreground">
						Generate New Lease
					</h1>
					<p className="text-muted-foreground">
						Create a new lease agreement step by step.
					</p>
				</div>
			</BlurFade>

			{/* Progress Steps */}
			<BlurFade delay={0.2} inView>
				<div className="flex items-center justify-between mb-8 max-w-2xl">
					{STEPS.map((step, index) => {
						const StepIcon = step.icon
						const isActive = index === currentStep
						const isCompleted = index < currentStep
						return (
							<div key={step.id} className="flex items-center">
								<div className="flex flex-col items-center">
									<div
										className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
											isCompleted
												? 'bg-emerald-500 text-white'
												: isActive
													? 'bg-primary text-primary-foreground'
													: 'bg-muted text-muted-foreground'
										}`}
									>
										{isCompleted ? (
											<Check className="w-5 h-5" />
										) : (
											<StepIcon className="w-5 h-5" />
										)}
									</div>
									<span
										className={`text-xs mt-2 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
									>
										{step.label}
									</span>
								</div>
								{index < STEPS.length - 1 && (
									<div
										className={`w-16 h-0.5 mx-2 ${index < currentStep ? 'bg-emerald-500' : 'bg-muted'}`}
									/>
								)}
							</div>
						)
					})}
				</div>
			</BlurFade>

			{/* Step Content */}
			<div className="max-w-2xl">
				{/* Step 1: Property & Unit */}
				{currentStep === 0 && (
					<BlurFade delay={0.3} inView>
						<div className="bg-card border border-border rounded-lg p-6">
							<h2 className="text-lg font-medium mb-4">
								Select Property & Unit
							</h2>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium mb-2">
										Property
									</label>
									<div className="grid grid-cols-1 gap-3">
										{properties.map(property => (
											<button
												key={property.id}
												onClick={() =>
													setFormData({
														...formData,
														propertyId: property.id,
														unitId: undefined
													})
												}
												className={`flex items-center gap-3 p-4 rounded-lg border transition-colors text-left ${
													formData.propertyId === property.id
														? 'border-primary bg-primary/5'
														: 'border-border hover:border-primary/50'
												}`}
											>
												<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
													<Building2 className="w-5 h-5 text-primary" />
												</div>
												<div>
													<p className="font-medium">{property.name}</p>
													<p className="text-sm text-muted-foreground">
														{
															property.units.filter(u => u.status === 'vacant')
																.length
														}{' '}
														vacant units
													</p>
												</div>
											</button>
										))}
									</div>
								</div>

								{selectedProperty && (
									<div>
										<label className="block text-sm font-medium mb-2">
											Unit
										</label>
										<div className="grid grid-cols-2 gap-3">
											{selectedProperty.units
												.filter(unit => unit.status === 'vacant')
												.map(unit => (
													<button
														key={unit.id}
														onClick={() =>
															setFormData({
																...formData,
																unitId: unit.id,
																rentAmount: unit.rent,
																securityDeposit: unit.rent
															})
														}
														className={`flex flex-col p-4 rounded-lg border transition-colors text-left ${
															formData.unitId === unit.id
																? 'border-primary bg-primary/5'
																: 'border-border hover:border-primary/50'
														}`}
													>
														<div className="flex items-center gap-2 mb-2">
															<Home className="w-4 h-4 text-muted-foreground" />
															<span className="font-medium">
																Unit {unit.number}
															</span>
														</div>
														<p className="text-sm text-muted-foreground">
															{unit.bedrooms} bed • {unit.bathrooms} bath
														</p>
														<p className="text-sm font-medium text-primary mt-1">
															{formatCurrency(unit.rent)}/mo
														</p>
													</button>
												))}
										</div>
										{selectedProperty.units.filter(u => u.status === 'vacant')
											.length === 0 && (
											<p className="text-sm text-muted-foreground text-center py-4">
												No vacant units available at this property.
											</p>
										)}
									</div>
								)}
							</div>
						</div>
					</BlurFade>
				)}

				{/* Step 2: Tenant */}
				{currentStep === 1 && (
					<BlurFade delay={0.3} inView>
						<div className="bg-card border border-border rounded-lg p-6">
							<h2 className="text-lg font-medium mb-4">Select or Add Tenant</h2>

							<div className="flex gap-2 mb-4">
								<button
									onClick={() => setTenantMode('existing')}
									className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
										tenantMode === 'existing'
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground hover:text-foreground'
									}`}
								>
									Existing Tenant
								</button>
								<button
									onClick={() => setTenantMode('new')}
									className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
										tenantMode === 'new'
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground hover:text-foreground'
									}`}
								>
									<Plus className="w-4 h-4 inline-block mr-1" />
									New Tenant
								</button>
							</div>

							{tenantMode === 'existing' ? (
								<div className="space-y-4">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
										<input
											type="text"
											placeholder="Search tenants..."
											value={tenantSearch}
											onChange={e => setTenantSearch(e.target.value)}
											className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
										/>
									</div>
									<div className="space-y-2 max-h-64 overflow-y-auto">
										{filteredTenants.map(tenant => (
											<button
												key={tenant.id}
												onClick={() =>
													setFormData({
														...formData,
														tenantId: tenant.id,
														newTenant: undefined
													})
												}
												className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
													formData.tenantId === tenant.id
														? 'border-primary bg-primary/5'
														: 'border-border hover:border-primary/50'
												}`}
											>
												<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
													<User className="w-5 h-5 text-muted-foreground" />
												</div>
												<div>
													<p className="font-medium">{tenant.name}</p>
													<p className="text-sm text-muted-foreground">
														{tenant.email}
													</p>
												</div>
											</button>
										))}
									</div>
								</div>
							) : (
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium mb-1">
											Full Name
										</label>
										<input
											type="text"
											value={formData.newTenant?.name || ''}
											onChange={e =>
												setFormData({
													...formData,
													tenantId: undefined,
													newTenant: {
														...formData.newTenant,
														name: e.target.value
													} as any
												})
											}
											className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
											placeholder="John Doe"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											Email Address
										</label>
										<input
											type="email"
											value={formData.newTenant?.email || ''}
											onChange={e =>
												setFormData({
													...formData,
													newTenant: {
														...formData.newTenant,
														email: e.target.value
													} as any
												})
											}
											className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
											placeholder="john@email.com"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											Phone Number
										</label>
										<input
											type="tel"
											value={formData.newTenant?.phone || ''}
											onChange={e =>
												setFormData({
													...formData,
													newTenant: {
														...formData.newTenant,
														phone: e.target.value
													} as any
												})
											}
											className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
											placeholder="(555) 123-4567"
										/>
									</div>
								</div>
							)}
						</div>
					</BlurFade>
				)}

				{/* Step 3: Lease Terms */}
				{currentStep === 2 && (
					<BlurFade delay={0.3} inView>
						<div className="bg-card border border-border rounded-lg p-6">
							<h2 className="text-lg font-medium mb-4">Lease Terms</h2>

							<div className="space-y-6">
								<div>
									<label className="block text-sm font-medium mb-2">
										Lease Template
									</label>
									<div className="grid grid-cols-1 gap-3">
										{templates.map(template => (
											<button
												key={template.id}
												onClick={() => {
													setFormData({
														...formData,
														templateId: template.id,
														endDate: formData.startDate
															? calculateEndDate(
																	formData.startDate,
																	template.leaseTerm
																)
															: undefined
													})
												}}
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

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium mb-1">
											<Calendar className="w-4 h-4 inline-block mr-1" />
											Start Date
										</label>
										<input
											type="date"
											value={formData.startDate || ''}
											onChange={e => {
												const startDate = e.target.value
												const template = templates.find(
													t => t.id === formData.templateId
												)
												setFormData({
													...formData,
													startDate,
													endDate: template
														? calculateEndDate(startDate, template.leaseTerm)
														: undefined
												})
											}}
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
												setFormData({ ...formData, endDate: e.target.value })
											}
											className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
										/>
									</div>
								</div>

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
												value={
													formData.rentAmount ? formData.rentAmount / 100 : ''
												}
												onChange={e =>
													setFormData({
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
													setFormData({
														...formData,
														securityDeposit: Number(e.target.value) * 100
													})
												}
												className="w-full pl-8 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
											/>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-4">
									<div>
										<label className="block text-sm font-medium mb-1">
											Payment Day
										</label>
										<select
											value={formData.paymentDay || 1}
											onChange={e =>
												setFormData({
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
										<label className="block text-sm font-medium mb-1">
											Late Fee
										</label>
										<div className="relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
												$
											</span>
											<input
												type="number"
												value={
													formData.lateFeeAmount
														? formData.lateFeeAmount / 100
														: ''
												}
												onChange={e =>
													setFormData({
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
												setFormData({
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
				)}

				{/* Step 4: Review */}
				{currentStep === 3 && (
					<BlurFade delay={0.3} inView>
						<div className="bg-card border border-border rounded-lg p-6">
							<h2 className="text-lg font-medium mb-4">Review Lease Details</h2>

							<div className="space-y-6">
								<div className="p-4 bg-muted/30 rounded-lg">
									<h3 className="text-sm font-medium text-muted-foreground mb-3">
										Property & Unit
									</h3>
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
											<Building2 className="w-5 h-5 text-primary" />
										</div>
										<div>
											<p className="font-medium">{selectedProperty?.name}</p>
											<p className="text-sm text-muted-foreground">
												Unit {selectedUnit?.number}
											</p>
										</div>
									</div>
								</div>

								<div className="p-4 bg-muted/30 rounded-lg">
									<h3 className="text-sm font-medium text-muted-foreground mb-3">
										Tenant
									</h3>
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
											<User className="w-5 h-5 text-muted-foreground" />
										</div>
										<div>
											<p className="font-medium">
												{selectedTenant?.name || formData.newTenant?.name}
											</p>
											<p className="text-sm text-muted-foreground">
												{selectedTenant?.email || formData.newTenant?.email}
											</p>
										</div>
									</div>
								</div>

								<div className="p-4 bg-muted/30 rounded-lg">
									<h3 className="text-sm font-medium text-muted-foreground mb-3">
										Lease Terms
									</h3>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<p className="text-sm text-muted-foreground">Template</p>
											<p className="font-medium">{selectedTemplate?.name}</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">Term</p>
											<p className="font-medium">
												{formData.startDate} to {formData.endDate}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Monthly Rent
											</p>
											<p className="font-medium">
												{formatCurrency(formData.rentAmount || 0)}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Security Deposit
											</p>
											<p className="font-medium">
												{formatCurrency(formData.securityDeposit || 0)}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Payment Due
											</p>
											<p className="font-medium">
												{formData.paymentDay}st of each month
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">Late Fee</p>
											<p className="font-medium">
												{formatCurrency(formData.lateFeeAmount || 0)} after{' '}
												{formData.gracePeriodDays} days
											</p>
										</div>
									</div>
								</div>

								<div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
									<div className="flex items-start gap-3">
										<AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
										<div>
											<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
												Ready to Generate
											</p>
											<p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
												Once generated, the lease will be created as a draft.
												You can review and edit it before sending for
												signatures.
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</BlurFade>
				)}

				{/* Navigation Buttons */}
				<BlurFade delay={0.4} inView>
					<div className="flex items-center justify-between mt-6">
						<button
							onClick={currentStep === 0 ? onCancel : handleBack}
							className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							<ChevronLeft className="w-4 h-4" />
							{currentStep === 0 ? 'Cancel' : 'Back'}
						</button>
						<button
							onClick={
								currentStep === STEPS.length - 1 ? handleSubmit : handleNext
							}
							disabled={!canProceed()}
							className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{currentStep === STEPS.length - 1 ? 'Generate Lease' : 'Continue'}
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
