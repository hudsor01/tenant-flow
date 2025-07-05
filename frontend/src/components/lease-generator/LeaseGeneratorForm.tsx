import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	FileText,
	Plus,
	Minus,
	Download,
	DollarSign,
	Calendar,
	MapPin,
	User,
	Building,
	CreditCard,
	Loader2,
	CheckCircle,
	AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import type {
	LeaseGeneratorForm,
	LeaseOutputFormat
} from '@/types/lease-generator'
import { AdditionalTermsSection } from './sections/AdditionalTermsSection'
import { SUPPORTED_REGIONS, getStateData } from '@/lib/state-data'
import { generateStateLease } from '@/lib/lease-templates/state-lease-generator'

const leaseSchema = z.object({
	// Property Information
	propertyAddress: z.string().min(1, 'Property address is required'),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(2, 'State is required'),
	zipCode: z.string().min(5, 'Valid ZIP code is required'),
	unitNumber: z.string().optional(),

	// Landlord Information
	landlordName: z.string().min(1, 'Landlord name is required'),
	landlordEmail: z.string().email('Valid email is required'),
	landlordPhone: z.string().optional(),
	landlordAddress: z.string().min(1, 'Landlord address is required'),

	// Tenant Information
	tenantNames: z
		.array(z.string().min(1, 'Tenant name is required'))
		.min(1, 'At least one tenant is required'),

	// Lease Terms
	rentAmount: z.number().min(1, 'Rent amount must be greater than 0'),
	securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
	leaseStartDate: z.string().min(1, 'Lease start date is required'),
	leaseEndDate: z.string().min(1, 'Lease end date is required'),

	// Payment Information
	paymentDueDate: z.number().min(1).max(31),
	lateFeeAmount: z.number().min(0),
	lateFeeDays: z.number().min(1),
	paymentMethod: z.enum(['check', 'online', 'bank_transfer', 'cash']),
	paymentAddress: z.string().optional(),

	// Additional Terms
	petPolicy: z.enum(['allowed', 'not_allowed', 'with_deposit']),
	petDeposit: z.number().optional(),
	smokingPolicy: z.enum(['allowed', 'not_allowed']),
	maintenanceResponsibility: z.enum(['landlord', 'tenant', 'shared']),
	utilitiesIncluded: z.array(z.string()),
	additionalTerms: z.string().optional()
})

interface LeaseGeneratorFormProps {
	onGenerate: (
		data: LeaseGeneratorForm,
		format: LeaseOutputFormat
	) => Promise<void>
	isGenerating: boolean
	usageRemaining: number
	requiresPayment: boolean
}

// Get all supported states and regions from state data
const SUPPORTED_STATES_AND_REGIONS = SUPPORTED_REGIONS.map(key => {
	const data = getStateData(key)
	return data ? { key, name: data.name, code: data.code } : null
}).filter(Boolean) as { key: string; name: string; code: string }[]

export default function LeaseGeneratorForm({
	onGenerate,
	isGenerating,
	usageRemaining,
	requiresPayment
}: LeaseGeneratorFormProps) {
	const [selectedFormat, setSelectedFormat] =
		useState<LeaseOutputFormat>('pdf')
	const [selectedUtilities, setSelectedUtilities] = useState<string[]>([])
	const [selectedState, setSelectedState] = useState<string>('')
	const [stateWarnings, setStateWarnings] = useState<string[]>([])
	const posthog = usePostHog()

	// Track form view on mount
	useEffect(() => {
		posthog?.capture('lease_generator_form_viewed', {
			usage_remaining: usageRemaining,
			requires_payment: requiresPayment,
			timestamp: new Date().toISOString()
		})
	}, [posthog, usageRemaining, requiresPayment])

	// Define available utilities options
	const utilitiesOptions = [
		'Water',
		'Electricity',
		'Gas',
		'Internet',
		'Cable/TV',
		'Trash/Recycling',
		'Sewer',
		'Heating',
		'Air Conditioning',
		'Lawn Care',
		'Snow Removal'
	]

	type FormData = z.infer<typeof leaseSchema>

	const form = useForm<FormData>({
		resolver: zodResolver(leaseSchema),
		defaultValues: {
			tenantNames: [''],
			paymentDueDate: 1,
			lateFeeAmount: 50,
			lateFeeDays: 5,
			paymentMethod: 'check',
			petPolicy: 'not_allowed',
			smokingPolicy: 'not_allowed',
			maintenanceResponsibility: 'landlord',
			utilitiesIncluded: [],
			rentAmount: 0,
			securityDeposit: 0
		}
	})

	const { fields, append, remove } = useFieldArray({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		control: form.control as any,
		name: 'tenantNames'
	})

	const handleUtilityToggle = (utility: string) => {
		const updated = selectedUtilities.includes(utility)
			? selectedUtilities.filter(u => u !== utility)
			: [...selectedUtilities, utility]

		setSelectedUtilities(updated)
		form.setValue('utilitiesIncluded', updated)
	}

	const handleSubmit = async (data: FormData) => {
		// Track form submission attempt
		posthog?.capture('lease_generator_form_submitted', {
			format: selectedFormat,
			tenant_count: data.tenantNames.length,
			rent_amount: data.rentAmount,
			security_deposit: data.securityDeposit,
			payment_method: data.paymentMethod,
			pet_policy: data.petPolicy,
			smoking_policy: data.smokingPolicy,
			utilities_count: data.utilitiesIncluded.length,
			state: data.state,
			requires_payment: requiresPayment,
			usage_remaining: usageRemaining,
			timestamp: new Date().toISOString()
		})

		if (requiresPayment) {
			posthog?.capture('lease_generator_payment_required', {
				format: selectedFormat,
				timestamp: new Date().toISOString()
			})

			toast.error('Payment required to generate additional leases')
			return
		}

		try {
			// Generate state-compliant lease
			const leaseResult = generateStateLease({
				data: {
					propertyAddress: data.propertyAddress,
					city: data.city,
					state: data.state,
					zipCode: data.zipCode,
					unitNumber: data.unitNumber,
					landlordName: data.landlordName,
					landlordEmail: data.landlordEmail,
					landlordPhone: data.landlordPhone,
					landlordAddress: data.landlordAddress,
					tenantNames: data.tenantNames,
					rentAmount: data.rentAmount,
					securityDeposit: data.securityDeposit,
					leaseStartDate: data.leaseStartDate,
					leaseEndDate: data.leaseEndDate,
					paymentDueDate: data.paymentDueDate,
					lateFeeAmount: data.lateFeeAmount,
					lateFeeDays: data.lateFeeDays,
					paymentMethod: data.paymentMethod,
					paymentAddress: data.paymentAddress,
					petPolicy: data.petPolicy,
					petDeposit: data.petDeposit,
					smokingPolicy: data.smokingPolicy,
					maintenanceResponsibility: data.maintenanceResponsibility,
					utilitiesIncluded: data.utilitiesIncluded,
					additionalTerms: data.additionalTerms
				},
				stateKey: data.state,
				format: selectedFormat
			})

			// Show warnings if any
			if (leaseResult.warnings.length > 0) {
				leaseResult.warnings.forEach(warning => {
					toast.warning(warning)
				})
			}

			await onGenerate(data, selectedFormat)

			// Track successful generation
			posthog?.capture('lease_generator_success', {
				format: selectedFormat,
				tenant_count: data.tenantNames.length,
				rent_amount: data.rentAmount,
				state: data.state,
				is_compliant: leaseResult.isCompliant,
				warnings_count: leaseResult.warnings.length,
				timestamp: new Date().toISOString()
			})

			toast.success(
				`${getStateData(data.state)?.name} lease agreement generated successfully!`
			)
		} catch (error) {
			// Track generation failure
			posthog?.capture('lease_generator_error', {
				format: selectedFormat,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			})

			toast.error('Failed to generate lease agreement')
			console.error('Lease generation error:', error)
		}
	}

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			{/* Usage Status Header */}
			<Card className="border-primary/20">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<FileText className="text-primary h-6 w-6" />
							<div>
								<CardTitle>
									Free Lease Agreement Generator
								</CardTitle>
								<CardDescription>
									Generate professional lease agreements
									instantly
								</CardDescription>
							</div>
						</div>
						<div className="text-right">
							{usageRemaining > 0 ? (
								<Badge variant="secondary" className="text-sm">
									<CheckCircle className="mr-1 h-4 w-4" />
									{usageRemaining} free use
									{usageRemaining > 1 ? 's' : ''} remaining
								</Badge>
							) : (
								<Badge
									variant="destructive"
									className="text-sm"
								>
									<CreditCard className="mr-1 h-4 w-4" />
									Payment required
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>
			</Card>

			<form
				onSubmit={form.handleSubmit(handleSubmit)}
				className="space-y-6"
			>
				<Tabs
					defaultValue="property"
					className="space-y-6"
					onValueChange={value => {
						posthog?.capture('lease_generator_tab_changed', {
							tab: value,
							timestamp: new Date().toISOString()
						})
					}}
				>
					<TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
						<TabsTrigger
							value="property"
							className="flex items-center gap-2"
						>
							<Building className="h-4 w-4" />
							Property
						</TabsTrigger>
						<TabsTrigger
							value="parties"
							className="flex items-center gap-2"
						>
							<User className="h-4 w-4" />
							Parties
						</TabsTrigger>
						<TabsTrigger
							value="terms"
							className="flex items-center gap-2"
						>
							<DollarSign className="h-4 w-4" />
							Terms
						</TabsTrigger>
						<TabsTrigger
							value="additional"
							className="flex items-center gap-2"
						>
							<FileText className="h-4 w-4" />
							Additional
						</TabsTrigger>
					</TabsList>

					{/* Property Information */}
					<TabsContent value="property">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<MapPin className="h-5 w-5" />
									Property Information
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="md:col-span-2">
										<Label htmlFor="propertyAddress">
											Property Address *
										</Label>
										<Input
											id="propertyAddress"
											placeholder="123 Main Street"
											{...form.register(
												'propertyAddress'
											)}
										/>
										{form.formState.errors
											.propertyAddress && (
											<p className="text-destructive text-sm">
												{
													form.formState.errors
														.propertyAddress.message
												}
											</p>
										)}
									</div>

									<div>
										<Label htmlFor="city">City *</Label>
										<Input
											id="city"
											placeholder="Springfield"
											{...form.register('city')}
										/>
										{form.formState.errors.city && (
											<p className="text-destructive text-sm">
												{
													form.formState.errors.city
														.message
												}
											</p>
										)}
									</div>

									<div>
										<Label htmlFor="state">State *</Label>
										<Select
											onValueChange={value => {
												form.setValue('state', value)
												setSelectedState(value)

												// Show state-specific information
												const stateData =
													getStateData(value)
												if (stateData) {
													const warnings: string[] =
														[]
													if (
														stateData
															.legalRequirements
															.securityDepositLimit !==
														'No statutory limit'
													) {
														warnings.push(
															`Security deposit limit: ${stateData.legalRequirements.securityDepositLimit}`
														)
													}
													warnings.push(
														`Entry notice required: ${stateData.legalRequirements.noticeToEnter}`
													)
													setStateWarnings(warnings)
												}
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select state or region" />
											</SelectTrigger>
											<SelectContent>
												{SUPPORTED_STATES_AND_REGIONS.map(
													region => (
														<SelectItem
															key={region.key}
															value={region.key}
														>
															{region.name} (
															{region.code})
														</SelectItem>
													)
												)}
											</SelectContent>
										</Select>
										{form.formState.errors.state && (
											<p className="text-destructive text-sm">
												{
													form.formState.errors.state
														.message
												}
											</p>
										)}
									</div>

									<div>
										<Label htmlFor="zipCode">
											ZIP Code *
										</Label>
										<Input
											id="zipCode"
											placeholder="62701"
											{...form.register('zipCode')}
										/>
										{form.formState.errors.zipCode && (
											<p className="text-destructive text-sm">
												{
													form.formState.errors
														.zipCode.message
												}
											</p>
										)}
									</div>

									<div>
										<Label htmlFor="unitNumber">
											Unit Number (Optional)
										</Label>
										<Input
											id="unitNumber"
											placeholder="Apt 4B"
											{...form.register('unitNumber')}
										/>
									</div>
								</div>

								{/* State-specific information */}
								{selectedState && stateWarnings.length > 0 && (
									<div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
										<h4 className="mb-2 font-medium text-blue-900">
											{getStateData(selectedState)?.name}{' '}
											Legal Requirements:
										</h4>
										<ul className="space-y-1 text-sm text-blue-800">
											{stateWarnings.map(
												(warning, index) => (
													<li key={index}>
														• {warning}
													</li>
												)
											)}
										</ul>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Parties Information */}
					<TabsContent value="parties">
						<div className="space-y-6">
							{/* Landlord Information */}
							<Card>
								<CardHeader>
									<CardTitle>Landlord Information</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div>
											<Label htmlFor="landlordName">
												Full Name *
											</Label>
											<Input
												id="landlordName"
												placeholder="John Smith"
												{...form.register(
													'landlordName'
												)}
											/>
											{form.formState.errors
												.landlordName && (
												<p className="text-destructive text-sm">
													{
														form.formState.errors
															.landlordName
															.message
													}
												</p>
											)}
										</div>

										<div>
											<Label htmlFor="landlordEmail">
												Email Address *
											</Label>
											<Input
												id="landlordEmail"
												type="email"
												placeholder="john@example.com"
												{...form.register(
													'landlordEmail'
												)}
											/>
											{form.formState.errors
												.landlordEmail && (
												<p className="text-destructive text-sm">
													{
														form.formState.errors
															.landlordEmail
															.message
													}
												</p>
											)}
										</div>

										<div>
											<Label htmlFor="landlordPhone">
												Phone Number
											</Label>
											<Input
												id="landlordPhone"
												placeholder="(555) 123-4567"
												{...form.register(
													'landlordPhone'
												)}
											/>
										</div>

										<div className="md:col-span-1">
											<Label htmlFor="landlordAddress">
												Mailing Address *
											</Label>
											<Input
												id="landlordAddress"
												placeholder="456 Oak Avenue, Springfield, IL 62702"
												{...form.register(
													'landlordAddress'
												)}
											/>
											{form.formState.errors
												.landlordAddress && (
												<p className="text-destructive text-sm">
													{
														form.formState.errors
															.landlordAddress
															.message
													}
												</p>
											)}
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Tenant Information */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										Tenant Information
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => append('')}
										>
											<Plus className="mr-1 h-4 w-4" />
											Add Tenant
										</Button>
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{fields.map((field, index) => (
										<div
											key={field.id}
											className="flex gap-2"
										>
											<div className="flex-1">
												<Label
													htmlFor={`tenantNames.${index}`}
												>
													Tenant {index + 1} Full Name
													*
												</Label>
												<Input
													placeholder="Jane Doe"
													{...form.register(
														`tenantNames.${index}` as const
													)}
												/>
												{form.formState.errors
													.tenantNames?.[index] && (
													<p className="text-destructive text-sm">
														{
															form.formState
																.errors
																.tenantNames[
																index
															]?.message
														}
													</p>
												)}
											</div>
											{fields.length > 1 && (
												<Button
													type="button"
													variant="outline"
													size="icon"
													onClick={() =>
														remove(index)
													}
													className="mt-6"
												>
													<Minus className="h-4 w-4" />
												</Button>
											)}
										</div>
									))}
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					{/* Lease Terms */}
					<TabsContent value="terms">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Calendar className="h-5 w-5" />
									Lease Terms & Payment
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div>
										<Label htmlFor="rentAmount">
											Monthly Rent Amount *
										</Label>
										<div className="relative">
											<DollarSign className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
											<Input
												id="rentAmount"
												type="number"
												placeholder="1500"
												className="pl-9"
												{...form.register(
													'rentAmount',
													{ valueAsNumber: true }
												)}
											/>
										</div>
										{form.formState.errors.rentAmount && (
											<p className="text-destructive text-sm">
												{
													form.formState.errors
														.rentAmount.message
												}
											</p>
										)}
									</div>

									<div>
										<Label htmlFor="securityDeposit">
											Security Deposit *
										</Label>
										<div className="relative">
											<DollarSign className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
											<Input
												id="securityDeposit"
												type="number"
												placeholder="1500"
												className="pl-9"
												{...form.register(
													'securityDeposit',
													{ valueAsNumber: true }
												)}
											/>
										</div>
										{form.formState.errors
											.securityDeposit && (
											<p className="text-destructive text-sm">
												{
													form.formState.errors
														.securityDeposit.message
												}
											</p>
										)}
									</div>

									<div>
										<Label htmlFor="leaseStartDate">
											Lease Start Date *
										</Label>
										<Input
											id="leaseStartDate"
											type="date"
											{...form.register('leaseStartDate')}
										/>
										{form.formState.errors
											.leaseStartDate && (
											<p className="text-destructive text-sm">
												{
													form.formState.errors
														.leaseStartDate.message
												}
											</p>
										)}
									</div>

									<div>
										<Label htmlFor="leaseEndDate">
											Lease End Date *
										</Label>
										<Input
											id="leaseEndDate"
											type="date"
											{...form.register('leaseEndDate')}
										/>
										{form.formState.errors.leaseEndDate && (
											<p className="text-destructive text-sm">
												{
													form.formState.errors
														.leaseEndDate.message
												}
											</p>
										)}
									</div>

									<div>
										<Label htmlFor="paymentDueDate">
											Payment Due Date
										</Label>
										<Select
											onValueChange={value =>
												form.setValue(
													'paymentDueDate',
													parseInt(value)
												)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="1st of month" />
											</SelectTrigger>
											<SelectContent>
												{Array.from(
													{ length: 31 },
													(_, i) => i + 1
												).map(day => (
													<SelectItem
														key={day}
														value={day.toString()}
													>
														{day}
														{day === 1
															? 'st'
															: day === 2
																? 'nd'
																: day === 3
																	? 'rd'
																	: 'th'}{' '}
														of month
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor="paymentMethod">
											Payment Method
										</Label>
										<Select
											onValueChange={value =>
												form.setValue(
													'paymentMethod',
													value as
														| 'check'
														| 'online'
														| 'bank_transfer'
														| 'cash'
												)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select method" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="check">
													Check
												</SelectItem>
												<SelectItem value="online">
													Online Payment
												</SelectItem>
												<SelectItem value="bank_transfer">
													Bank Transfer
												</SelectItem>
												<SelectItem value="cash">
													Cash
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor="lateFeeAmount">
											Late Fee Amount
										</Label>
										<div className="relative">
											<DollarSign className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
											<Input
												id="lateFeeAmount"
												type="number"
												placeholder="50"
												className="pl-9"
												{...form.register(
													'lateFeeAmount',
													{ valueAsNumber: true }
												)}
											/>
										</div>
									</div>

									<div>
										<Label htmlFor="lateFeeDays">
											Late Fee After (Days)
										</Label>
										<Input
											id="lateFeeDays"
											type="number"
											placeholder="5"
											{...form.register('lateFeeDays', {
												valueAsNumber: true
											})}
										/>
									</div>
								</div>

								{form.watch('paymentMethod') === 'check' && (
									<div>
										<Label htmlFor="paymentAddress">
											Payment Address
										</Label>
										<Input
											id="paymentAddress"
											placeholder="Where should checks be mailed?"
											{...form.register('paymentAddress')}
										/>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Additional Terms */}
					<TabsContent value="additional">
						<AdditionalTermsSection
							form={form}
							utilitiesOptions={utilitiesOptions}
							selectedUtilities={selectedUtilities}
							handleUtilityToggle={handleUtilityToggle}
							selectedFormat={selectedFormat}
							setSelectedFormat={setSelectedFormat}
						/>
					</TabsContent>
				</Tabs>

				{/* Generate Button */}
				<Card className="border-primary/20">
					<CardContent className="pt-6">
						<div className="space-y-4 text-center">
							{requiresPayment && (
								<div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
									<div className="text-destructive flex items-center justify-center gap-2">
										<AlertTriangle className="h-5 w-5" />
										<span className="font-medium">
											Payment Required
										</span>
									</div>
									<p className="text-muted-foreground mt-2 text-sm">
										You've used your free lease generation.
										Pay $9.99 to generate unlimited leases
										for 24 hours.
									</p>
								</div>
							)}

							<Button
								type="submit"
								size="lg"
								className="w-full px-12 md:w-auto"
								disabled={isGenerating || requiresPayment}
							>
								{isGenerating ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										Generating Lease...
									</>
								) : requiresPayment ? (
									<>
										<CreditCard className="mr-2 h-5 w-5" />
										Payment Required - $9.99
									</>
								) : (
									<>
										<Download className="mr-2 h-5 w-5" />
										Generate Lease Agreement
									</>
								)}
							</Button>

							{!requiresPayment && usageRemaining === 1 && (
								<p className="text-muted-foreground text-sm">
									This is your free trial. Additional leases
									require payment.
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</form>
		</div>
	)
}
