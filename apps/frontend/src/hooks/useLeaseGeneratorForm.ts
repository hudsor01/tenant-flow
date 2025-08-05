import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@/lib/zod-resolver-helper'
import { toast } from 'sonner'
import type {
	LeaseGeneratorForm,
	LeaseOutputFormat
} from '@repo/shared'
import { leaseFormSchema } from '@repo/shared'

interface UseLeaseGeneratorFormProps {
	onGenerate: (
		data: LeaseGeneratorForm,
		format: LeaseOutputFormat
	) => Promise<void>
	requiresPayment: boolean
	selectedFormat: LeaseOutputFormat
}

/**
 * Custom hook for managing lease generator form state and logic
 * Separates form logic from UI components
 */
export function useLeaseGeneratorForm({
	onGenerate,
	requiresPayment,
	selectedFormat
}: UseLeaseGeneratorFormProps) {
	const form = useForm<LeaseGeneratorForm>({
		resolver: zodResolver(leaseFormSchema),
		defaultValues: {
			tenantNames: [{ name: '' }],
			paymentDueDate: 1,
			lateFeeAmount: 50,
			lateFeeDays: 5,
			paymentMethod: 'check',
			petPolicy: 'not_allowed',
			smokingPolicy: 'not_allowed',
			maintenanceResponsibility: 'landlord',
			utilitiesIncluded: [],
			rentAmount: 0,
			securityDeposit: 0,
			propertyType: 'apartment',
			maxOccupants: 2,
			occupancyLimits: {
				adults: 2,
				childrenUnder18: 0,
				childrenUnder2: 0
			}
		}
	})

	// Tenant names field array management
	const {
		fields: tenantFields,
		append: addTenant,
		remove: removeTenant
	} = useFieldArray({
		control: form.control,
		name: 'tenantNames'
	})

	// Form submission handler
	const handleSubmit = async (data: LeaseGeneratorForm) => {
		if (requiresPayment) {
			toast.error('Payment required to generate additional leases')
			return
		}

		try {
			await onGenerate(data, selectedFormat)
		} catch (error) {
			toast.error('Failed to generate lease agreement')
			console.error('Lease generation error:', error)
		}
	}

	return {
		form,
		tenantFields,
		addTenant: () => addTenant({ name: '' }),
		removeTenant,
		handleSubmit: form.handleSubmit(handleSubmit)
	}
}
