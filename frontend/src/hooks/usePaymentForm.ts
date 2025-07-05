import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { PaymentFormData } from './usePaymentFormData'

// Form validation schema
const paymentSchema = z.object({
	leaseId: z.string().min(1, 'Please select a lease'),
	amount: z
		.number()
		.min(0.01, 'Amount must be greater than 0')
		.max(100000, 'Amount too high'),
	date: z.string().min(1, 'Payment date is required'),
	type: z.enum([
		'RENT',
		'DEPOSIT',
		'LATE_FEE',
		'MAINTENANCE',
		'OTHER'
	] as const),
	notes: z.string().optional()
})

interface UsePaymentFormProps {
	defaultValues: PaymentFormData
	getAmountForLease: (leaseId: string) => number
	handleSubmit: (data: PaymentFormData) => Promise<void>
	// defaultType?: string; // Unused parameter
}

/**
 * Custom hook for managing payment form logic and validation
 * Separates form state and business logic from UI components
 */
export function usePaymentForm({
	defaultValues,
	getAmountForLease,
	handleSubmit
}: UsePaymentFormProps) {
	const form = useForm<PaymentFormData>({
		resolver: zodResolver(paymentSchema),
		defaultValues
	})

	const { watch, setValue } = form
	const watchedLeaseId = watch('leaseId')
	const watchedType = watch('type')

	// Auto-populate amount when lease changes (only for RENT type)
	useEffect(() => {
		if (watchedLeaseId && watchedType === 'RENT') {
			const amount = getAmountForLease(watchedLeaseId)
			if (amount > 0) {
				setValue('amount', amount)
			}
		}
	}, [watchedLeaseId, watchedType, getAmountForLease, setValue])

	// Auto-populate amount when type changes to RENT
	useEffect(() => {
		if (watchedType === 'RENT' && watchedLeaseId) {
			const amount = getAmountForLease(watchedLeaseId)
			if (amount > 0) {
				setValue('amount', amount)
			}
		}
	}, [watchedType, watchedLeaseId, getAmountForLease, setValue])

	return {
		form,
		handleSubmit,
		paymentSchema,
		watchedLeaseId,
		watchedType
	}
}
