'use client'

import { useForm } from '@tanstack/react-form'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import {
	useGenerateLease,
	useLeaseAutoFill
} from '#hooks/api/use-lease-generation'
import { useEffect, useRef } from 'react'
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
			allowedUse:
				'Residential dwelling purposes only. No business activities.',
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
						const fieldInfo = form.getFieldInfo(key as keyof LeaseGenerationFormData)
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
			{({ currentStep, setCanGoNext }) => {
				// Validate current step based on form values
				const values = form.state.values
				let isValid = false

				switch (currentStep) {
					case 0: // Basic Info
						isValid = !!(
							values.agreementDate &&
							values.ownerName &&
							values.ownerAddress &&
							values.tenantName &&
							values.propertyAddress &&
							values.commencementDate &&
							values.terminationDate
						)
						break
					case 1: // Financial
						isValid = !!(
							values.rent_amount > 0 &&
							values.rentDueDay >= 1 &&
							values.rentDueDay <= 31
						)
						break
					case 2: // Terms
						isValid = !!(values.maxOccupants && values.maxOccupants > 0)
						break
					case 3: // Review
						isValid = true
						break
				}

				// Update wizard navigation state (only once per render)
				setCanGoNext(isValid)

				return (
					<>
						{/* Step 1: Basic Information */}
						{currentStep === 0 && (
							<BasicInfoStep form={form} />
						)}

						{/* Step 2: Financial Terms */}
						{currentStep === 1 && (
							<FinancialStep form={form} />
						)}

						{/* Step 3: Terms & Conditions */}
						{currentStep === 2 && (
							<TermsStep form={form} />
						)}

						{/* Step 4: Review & Legal */}
						{currentStep === 3 && (
							<ReviewStep form={form} />
						)}
					</>
				)
			}}
		</LeaseWizard>
	)
}
