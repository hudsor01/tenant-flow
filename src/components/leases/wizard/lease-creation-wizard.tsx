'use client'

/**
 * Lease Creation Wizard
 * Unified multi-step wizard for creating lease agreements
 */
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUnsavedChangesWarning } from '#hooks/use-unsaved-changes'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import { Card, CardContent } from '#components/ui/card'
import { ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react'
import { cn } from '#lib/utils'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'

import { mutationKeys } from '#hooks/api/mutation-keys'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { leaseQueries } from '#hooks/api/query-keys/lease-keys'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'

import { SelectionStep } from './selection-step'
import { TermsStep, type DurationPreset } from './terms-step'
import { DetailsStep } from './details-step'
import { ReviewStep } from './review-step'
import { LeaseCreationWizardHeader, WIZARD_STEPS } from './lease-creation-wizard-header'

import type {
	SelectionStepData,
	TermsStepData,
	LeaseDetailsStepData,
	WizardStep
} from '#lib/validation/lease-wizard.schemas'
import {
	selectionStepSchema,
	termsStepSchema,
	leaseDetailsStepSchema
} from '#lib/validation/lease-wizard.schemas'

interface LeaseCreationWizardProps {
	onSuccess?: (leaseId: string) => void
}

export function LeaseCreationWizard({ onSuccess }: LeaseCreationWizardProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [currentStep, setCurrentStep] = useState<WizardStep>('selection')
	useUnsavedChangesWarning(currentStep !== 'selection')
	const [selectionData, setSelectionData] = useState<Partial<SelectionStepData>>({})
	const [termsData, setTermsData] = useState<Partial<TermsStepData>>({
		payment_day: 1,
		grace_period_days: 3,
		late_fee_amount: 0
	})
	const [selectedDuration, setSelectedDuration] = useState<DurationPreset>(null)
	const rentAutoFilled = useRef(false)
	const handleUnitSelected = (rentAmount: number | null) => {
		if (rentAmount && rentAmount > 0) {
			setTermsData(prev => ({
				...prev,
				rent_amount: rentAmount,
				security_deposit: rentAmount
			}))
			rentAutoFilled.current = true
		}
	}
	const [detailsData, setDetailsData] = useState<Partial<LeaseDetailsStepData>>(
		{
			pets_allowed: false,
			utilities_included: [],
			tenant_responsible_utilities: [],
			property_built_before_1978: false,
			governing_state: 'TX'
		}
	)

	// Fetch entity names for review step
	const { data: propertyData } = useQuery({
		queryKey: [...propertyQueries.all(), selectionData.property_id],
		queryFn: async () => {
			const supabase = createClient()
			const { data } = await supabase.from('properties').select('id, name').eq('id', selectionData.property_id ?? '').single()
			return data ?? null
		},
		enabled: !!selectionData.property_id
	})
	const { data: unitData } = useQuery({
		queryKey: [...unitQueries.all(), selectionData.unit_id],
		queryFn: async () => {
			const supabase = createClient()
			const { data } = await supabase.from('units').select('id, unit_number').eq('id', selectionData.unit_id ?? '').single()
			return data ?? null
		},
		enabled: !!selectionData.unit_id
	})
	const { data: tenantData } = useQuery({
		queryKey: [...tenantQueries.all(), selectionData.primary_tenant_id],
		queryFn: async () => {
			const supabase = createClient()
			const { data } = await supabase
				.from('tenants')
				.select('id, first_name, last_name, users!tenants_user_id_fkey(first_name, last_name)')
				.eq('id', selectionData.primary_tenant_id ?? '')
				.single()
			if (!data) return null
			const user = data.users as unknown as
				| { first_name: string | null; last_name: string | null }
				| null
			return {
				id: data.id,
				first_name: data.first_name ?? user?.first_name ?? null,
				last_name: data.last_name ?? user?.last_name ?? null
			}
		},
		enabled: !!selectionData.primary_tenant_id
	})

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

	const validateStep = (step: WizardStep): boolean => {
		switch (step) {
			case 'selection': return selectionStepSchema.safeParse(selectionData).success
			case 'terms': return termsStepSchema.safeParse(termsData).success
			case 'details': return leaseDetailsStepSchema.safeParse(detailsData).success
			case 'review': return true
			default: return false
		}
	}

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

	const combinedData = ({
			...selectionData,
			...termsData,
			...detailsData
		})

	return (
		<div className="w-full max-w-4xl mx-auto space-y-8">
			<LeaseCreationWizardHeader
				currentStep={currentStep}
				onStepChange={setCurrentStep}
			/>

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
