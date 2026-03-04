'use client'

/**
 * Lease Creation Wizard
 * Unified multi-step wizard for creating lease agreements
 */
import { useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import { Card, CardContent } from '#components/ui/card'
import {
	Stepper,
	StepperList,
	StepperItem,
	StepperTrigger,
	StepperIndicator,
	StepperTitle,
	StepperDescription,
	StepperSeparator
} from '#components/ui/stepper'
import { ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react'
import { cn } from '#lib/utils'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'

import { mutationKeys } from '#hooks/api/mutation-keys'
import { leaseQueries } from '#hooks/api/query-keys/lease-keys'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'

import { SelectionStep } from './selection-step'
import { TermsStep, type DurationPreset } from './terms-step'
import { DetailsStep } from './details-step'
import { ReviewStep } from './review-step'

import type {
	SelectionStepData,
	TermsStepData,
	LeaseDetailsStepData,
	WizardStep
} from '#shared/validation/lease-wizard.schemas'
import {
	selectionStepSchema,
	termsStepSchema,
	leaseDetailsStepSchema
} from '#shared/validation/lease-wizard.schemas'

const WIZARD_STEPS: {
	value: WizardStep
	title: string
	description: string
}[] = [
	{ value: 'selection', title: 'Selection', description: 'Property & tenant' },
	{ value: 'terms', title: 'Terms', description: 'Dates & finances' },
	{ value: 'details', title: 'Details', description: 'Rules & disclosures' },
	{ value: 'review', title: 'Review', description: 'Confirm & create' }
]

interface LeaseCreationWizardProps {
	onSuccess?: (leaseId: string) => void
}

export function LeaseCreationWizard({ onSuccess }: LeaseCreationWizardProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [currentStep, setCurrentStep] = useState<WizardStep>('selection')

	// Form state for each step
	const [selectionData, setSelectionData] = useState<
		Partial<SelectionStepData>
	>({})
	const [termsData, setTermsData] = useState<Partial<TermsStepData>>({
		payment_day: 1,
		grace_period_days: 3,
		late_fee_amount: 0
	})
	const [selectedDuration, setSelectedDuration] = useState<DurationPreset>(null)

	// Track whether rent was auto-filled from unit (so we don't overwrite manual edits)
	const rentAutoFilled = useRef(false)

	const handleUnitSelected = useCallback((rentAmount: number | null) => {
		if (rentAmount && rentAmount > 0) {
			setTermsData(prev => ({
				...prev,
				rent_amount: rentAmount,
				security_deposit: rentAmount
			}))
			rentAutoFilled.current = true
		}
	}, [])
	const [detailsData, setDetailsData] = useState<Partial<LeaseDetailsStepData>>(
		{
			pets_allowed: false,
			utilities_included: [],
			tenant_responsible_utilities: [],
			property_built_before_1978: false,
			governing_state: 'TX'
		}
	)

	// Fetch property/unit/tenant names for review step via Supabase PostgREST
	const { data: propertyData } = useQuery({
		queryKey: ['properties', selectionData.property_id],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('properties')
				.select('id, name')
				.eq('id', selectionData.property_id ?? '')
				.single()
			if (error) return null
			return data
		},
		enabled: !!selectionData.property_id
	})

	const { data: unitData } = useQuery({
		queryKey: ['units', selectionData.unit_id],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('units')
				.select('id, unit_number')
				.eq('id', selectionData.unit_id ?? '')
				.single()
			if (error) return null
			return data
		},
		enabled: !!selectionData.unit_id
	})

	const { data: tenantData } = useQuery({
		queryKey: ['tenants', selectionData.primary_tenant_id],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('tenants')
				.select('id, first_name, last_name')
				.eq('id', selectionData.primary_tenant_id ?? '')
				.single()
			if (error) return null
			return data
		},
		enabled: !!selectionData.primary_tenant_id
	})

	// Create lease mutation via Supabase PostgREST
	const createLeaseMutation = useMutation({
		mutationKey: mutationKeys.leases.create,
		mutationFn: async () => {
			const supabase = createClient()
			const user = await getCachedUser()
			const ownerId = requireOwnerUserId(user?.id)

			const { data, error } = await supabase
				.from('leases')
				.insert({
					...selectionData,
					...termsData,
					...detailsData,
					owner_user_id: ownerId,
					lease_status: 'draft',
					rent_currency: 'USD'
				})
				.select('id')
				.single()
			if (error) throw new Error(error.message || 'Failed to create lease')
			return data
		},
		onSuccess: data => {
			toast.success('Lease draft created successfully')
			if (onSuccess) {
				onSuccess(data.id)
			} else {
				router.push(`/leases/${data.id}`)
			}
		},
		onError: error => {
			toast.error(
				error instanceof Error ? error.message : 'Failed to create lease'
			)
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
		}
	})

	// Step validation
	const validateStep = useCallback(
		(step: WizardStep): boolean => {
			switch (step) {
				case 'selection':
					return selectionStepSchema.safeParse(selectionData).success
				case 'terms':
					return termsStepSchema.safeParse(termsData).success
				case 'details': {
					const result = leaseDetailsStepSchema.safeParse(detailsData)
					return result.success
				}
				case 'review':
					return true
				default:
					return false
			}
		},
		[selectionData, termsData, detailsData]
	)

	const currentStepIndex = WIZARD_STEPS.findIndex(s => s.value === currentStep)
	const isFirstStep = currentStepIndex === 0
	const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1
	const canGoNext = validateStep(currentStep)

	const goToNextStep = () => {
		if (!isLastStep && canGoNext) {
			const nextStep = WIZARD_STEPS[currentStepIndex + 1]
			if (nextStep) setCurrentStep(nextStep.value)
		}
	}

	const goToPreviousStep = () => {
		if (!isFirstStep) {
			const prevStep = WIZARD_STEPS[currentStepIndex - 1]
			if (prevStep) setCurrentStep(prevStep.value)
		}
	}

	const handleSubmit = () => {
		if (isLastStep) {
			createLeaseMutation.mutate()
		} else {
			goToNextStep()
		}
	}

	// Combined data for review
	const combinedData = useMemo(
		() => ({
			...selectionData,
			...termsData,
			...detailsData
		}),
		[selectionData, termsData, detailsData]
	)

	return (
		<div className="w-full max-w-4xl mx-auto space-y-8">
			{/* Progress Stepper */}
			<Stepper
				value={currentStep}
				onValueChange={value => setCurrentStep(value as WizardStep)}
				orientation="horizontal"
				nonInteractive
			>
				<StepperList>
					{WIZARD_STEPS.map(step => (
						<StepperItem key={step.value} value={step.value}>
							<StepperTrigger className="gap-3">
								<StepperIndicator />
								<div className="flex flex-col items-start">
									<StepperTitle>{step.title}</StepperTitle>
									<StepperDescription className="hidden sm:block">
										{step.description}
									</StepperDescription>
								</div>
							</StepperTrigger>
							<StepperSeparator />
						</StepperItem>
					))}
				</StepperList>
			</Stepper>

			{/* Step Content */}
			<Card>
				<CardContent className="pt-6">
					<div className="min-h-[400px]">
						{currentStep === 'selection' && (
							<SelectionStep
								data={selectionData}
								onChange={setSelectionData}
								onUnitSelected={handleUnitSelected}
							/>
						)}
						{currentStep === 'terms' && (
							<TermsStep
								data={termsData}
								onChange={setTermsData}
								selectedDuration={selectedDuration}
								onDurationChange={setSelectedDuration}
							/>
						)}
						{currentStep === 'details' && (
							<DetailsStep data={detailsData} onChange={setDetailsData} />
						)}
						{currentStep === 'review' && (
							<ReviewStep
								data={combinedData}
								propertyName={propertyData?.name}
								unitNumber={unitData?.unit_number || 'Main Unit'}
								tenantName={
									tenantData
										? `${tenantData.first_name} ${tenantData.last_name}`
										: undefined
								}
							/>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Navigation Buttons */}
			<div
				className={cn(
					'flex items-center',
					isFirstStep ? 'justify-end' : 'justify-between'
				)}
			>
				{!isFirstStep && (
					<Button
						type="button"
						variant="outline"
						onClick={goToPreviousStep}
						disabled={createLeaseMutation.isPending}
					>
						<ChevronLeft className="mr-2 h-4 w-4" />
						Previous
					</Button>
				)}

				{!isLastStep ? (
					<Button
						type="button"
						onClick={goToNextStep}
						disabled={!canGoNext || createLeaseMutation.isPending}
					>
						Next
						<ChevronRight className="ml-2 h-4 w-4" />
					</Button>
				) : (
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={createLeaseMutation.isPending || !canGoNext}
					>
						{createLeaseMutation.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Creating...
							</>
						) : (
							<>
								<FileText className="mr-2 h-4 w-4" />
								Create Draft Lease
							</>
						)}
					</Button>
				)}
			</div>
		</div>
	)
}
