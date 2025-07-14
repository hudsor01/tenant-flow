import React from 'react'
import { BaseFormModal, FormSection } from '@/components/common/BaseFormModal'
import { Form } from '@/components/ui/form'
import { FileText, CreditCard } from 'lucide-react'
import type { Payment, PaymentType } from '@/types/entities'
import { usePaymentFormData } from '@/hooks/usePaymentFormData'
import { usePaymentForm } from '@/hooks/usePaymentForm'
import PaymentDetailsSection from './PaymentDetailsSection'
import PaymentNotesSection from './PaymentNotesSection'
import PaymentSummarySection from './PaymentSummarySection'

interface PaymentFormModalProps {
	isOpen: boolean
	onClose: () => void
	propertyId?: string
	leaseId?: string
	tenantId?: string
	payment?: Payment
	mode: 'create' | 'edit'
	defaultAmount?: number
	defaultType?: PaymentType
}

/**
 * Modal for creating or editing payments
 * Uses decomposed sections for better maintainability:
 * - PaymentDetailsSection: Core payment fields
 * - PaymentNotesSection: Optional notes field
 * - PaymentSummarySection: Selected lease summary
 */
export default function PaymentFormModal({
	isOpen,
	onClose,
	propertyId,
	leaseId,
	tenantId,
	payment,
	mode,
	defaultAmount,
	defaultType = 'RENT'
}: PaymentFormModalProps) {
	const {
		availableLeases,
		payments,
		handleSubmit,
		getDefaultValues,
		getAmountForLease
	} = usePaymentFormData({
		propertyId,
		leaseId,
		tenantId,
		payment,
		mode,
		defaultAmount,
		defaultType,
		onClose
	})

	const { form, watchedLeaseId } = usePaymentForm({
		defaultValues: getDefaultValues(),
		getAmountForLease,
		handleSubmit
	})

	return (
		<BaseFormModal
			isOpen={isOpen}
			onClose={onClose}
			title={mode === 'create' ? 'Record Payment' : 'Edit Payment'}
			description={
				mode === 'create'
					? 'Record a payment that was received from a tenant.'
					: 'Update the payment details.'
			}
			icon={CreditCard}
			iconBgColor="bg-green-100"
			iconColor="text-green-600"
			maxWidth="2xl"
			onSubmit={form.handleSubmit(handleSubmit)}
			submitLabel={
				mode === 'create' ? 'Record Payment' : 'Update Payment'
			}
			cancelLabel="Cancel"
			isSubmitting={payments.creating || payments.updating}
			submitDisabled={payments.creating || payments.updating}
		>
			<FormSection icon={FileText} title="Payment Details" delay={0}>
				<Form {...form}>
					<PaymentDetailsSection
						form={form}
						availableLeases={availableLeases as any}
					/>

					<PaymentNotesSection form={form} />

					<PaymentSummarySection
						selectedLeaseId={watchedLeaseId}
						availableLeases={availableLeases as any}
					/>
				</Form>
			</FormSection>
		</BaseFormModal>
	)
}
