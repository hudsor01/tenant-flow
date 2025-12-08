'use client'

import { useForm } from '@tanstack/react-form'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import {
	useGenerateLease,
	useLeaseAutoFill
} from '#hooks/api/use-lease-generation'
import { useEffect, useRef, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { logger } from '@repo/shared/lib/frontend-logger'
import { LeaseWizard } from './lease-wizard'
import { BasicInfoStep } from './steps/basic-info-step'
import { FinancialStep } from './steps/financial-step'
import { TermsStep } from './steps/terms-step'
import { ReviewStep } from './steps/review-step'

interface LeaseGenerationFormWizardProps {
	property_id: string
	unit_id: string
	tenant_id: string
	onSuccess?: () => void
}

/**
 * Texas Residential Lease Agreement Generation Form - Wizard Version
 * 4-step guided process to reduce information overload
 */
export function LeaseGenerationFormWizard({
	property_id,
	unit_id,
	tenant_id,
	onSuccess
}: LeaseGenerationFormWizardProps) {
	const { data: autoFillData, isLoading: isAutoFilling } = useLeaseAutoFill(
		property_id,
		unit_id,
		tenant_id
	)
	const generateLease = useGenerateLease()

	const form = useForm({
		defaultValues: {
			agreementDate: new Date().toISOString().split('T')[0],
			ownerName: '',
			ownerAddress: '',
			ownerPhone: '',
			tenantName: '',
			propertyAddress: '',
			commencementDate: '',
			terminationDate: '',
			rent_amount: 0,
			rentDueDay: 1,
			late_fee_amount: 0,
			lateFeeGraceDays: 3,
			nsfFee: 50,
			security_deposit: 0,
			security_depositDueDays: 30,
			maxOccupants: 2,
			allowedUse: 'Residential dwelling purposes only. No business activities.',
			alterationsAllowed: false,
			alterationsRequireConsent: true,
			utilitiesIncluded: [] as string[],
			tenantResponsibleUtilities: [
				'Electric',
				'Gas',
				'Water',
				'Internet'
			] as string[],
			propertyRules: '',
			holdOverRentMultiplier: 1.2,
			petsAllowed: false,
			petDeposit: 0,
			petRent: 0,
			prevailingPartyAttorneyFees: true,
			governingState: 'TX',
			noticeAddress: '',
			noticeEmail: '',
			propertyBuiltBefore1978: false,
			leadPaintDisclosureProvided: false,
			property_id,
			tenant_id
		} as LeaseGenerationFormData,
		onSubmit: async ({ value }) => {
			try {
				await generateLease.mutateAsync(value)
				onSuccess?.()
			} catch (error) {
				logger.error('Form submission failed', {
					action: 'lease_form_submit_error',
					metadata: { error: String(error) }
				})
			}
		}
	})

	// Auto-fill form when data is loaded
	const hasAutoFilledRef = useRef(false)

	useEffect(() => {
		if (autoFillData && !hasAutoFilledRef.current) {
			hasAutoFilledRef.current = true
			Object.entries(autoFillData).forEach(([key, value]) => {
				if (value !== undefined) {
					try {
						const fieldInfo = form.getFieldInfo(
							key as keyof LeaseGenerationFormData
						)
						if (fieldInfo?.instance) {
							fieldInfo.instance.setValue(value)
						}
					} catch (error) {
						logger.warn(`Failed to auto-fill field ${key}`, {
							action: 'lease_form_autofill_field_error',
							metadata: { field: key, error: String(error) }
						})
					}
				}
			})
		}
	}, [autoFillData, form])

	if (isAutoFilling) {
		return (
			<div className="flex-center p-8">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	const handleSubmit = () => {
		form.handleSubmit()
	}

	return (
		<LeaseWizard
			property_id={property_id}
			unit_id={unit_id}
			tenant_id={tenant_id}
			onSubmit={handleSubmit}
			isSubmitting={generateLease.isPending}
		>
			{({ currentStep, setCanGoNext }) => (
				<WizardStepContent
					currentStep={currentStep}
					setCanGoNext={setCanGoNext}
					form={form}
				/>
			)}
		</LeaseWizard>
	)
}

/**
 * Separate component to properly handle validation state updates via useEffect
 * This prevents the infinite render loop caused by calling setCanGoNext during render
 */
function WizardStepContent({
	currentStep,
	setCanGoNext,
	form
}: {
	currentStep: number
	setCanGoNext: (can: boolean) => void
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any
}) {
	const values = form.state.values

	// Memoize validation to prevent unnecessary effect triggers
	const isValid = useMemo(() => {
		switch (currentStep) {
			case 0: // Basic Info
				return !!(
					values.agreementDate &&
					values.ownerName &&
					values.ownerAddress &&
					values.tenantName &&
					values.propertyAddress &&
					values.commencementDate &&
					values.terminationDate
				)
			case 1: // Financial
				return !!(
					values.rent_amount > 0 &&
					values.rentDueDay >= 1 &&
					values.rentDueDay <= 31
				)
			case 2: // Terms
				return !!(values.maxOccupants && values.maxOccupants > 0)
			case 3: // Review
				return true
			default:
				return false
		}
	}, [currentStep, values])

	// Update parent state via useEffect to avoid render-time state updates
	useEffect(() => {
		setCanGoNext(isValid)
	}, [isValid, setCanGoNext])

	return (
		<>
			{currentStep === 0 && <BasicInfoStep form={form} />}
			{currentStep === 1 && <FinancialStep form={form} />}
			{currentStep === 2 && <TermsStep form={form} />}
			{currentStep === 3 && <ReviewStep form={form} />}
		</>
	)
}
