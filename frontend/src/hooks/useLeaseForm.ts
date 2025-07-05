import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { UseLeaseFormProps } from '@/types/forms'
import { useLeases } from '@/hooks/useLeases'

// Improved schema with proper property-first logic
const leaseSchema = z
	.object({
		propertyId: z.string().min(1, 'Please select a property'),
		unitId: z.string().nullable().optional(),
		tenantId: z.string().min(1, 'Please select at least one tenant'),
		startDate: z.string().min(1, 'Start date is required'),
		endDate: z.string().min(1, 'End date is required'),
		rentAmount: z
			.number()
			.min(0, 'Rent amount must be positive')
			.max(100000, 'Rent amount too high'),
		securityDeposit: z
			.number()
			.min(0, 'Security deposit must be positive')
			.max(100000, 'Security deposit too high'),
		status: z
			.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT'])
			.optional()
	})
	.refine(
		data => {
			const start = new Date(data.startDate)
			const end = new Date(data.endDate)
			return end > start
		},
		{
			message: 'End date must be after start date',
			path: ['endDate']
		}
	)

export type LeaseFormData = z.infer<typeof leaseSchema>

/**
 * Custom hook for managing lease form state and submission
 * Separates form logic from UI components
 */
export function useLeaseForm({
	lease,
	mode = 'create',
	propertyId: defaultPropertyId,
	unitId: defaultUnitId,
	tenantId: defaultTenantId,
	onSuccess,
	onClose
}: UseLeaseFormProps) {
	const leases = useLeases()

	const form = useForm<LeaseFormData>({
		resolver: zodResolver(leaseSchema),
		defaultValues: {
			propertyId: defaultPropertyId || '',
			unitId: defaultUnitId || lease?.unitId || '',
			tenantId: defaultTenantId || lease?.tenantId || '',
			startDate: lease?.startDate
				? format(new Date(lease.startDate), 'yyyy-MM-dd')
				: '',
			endDate: lease?.endDate
				? format(new Date(lease.endDate), 'yyyy-MM-dd')
				: '',
			rentAmount: lease?.rentAmount || 0,
			securityDeposit: lease?.securityDeposit || 0,
			status: lease?.status || 'DRAFT'
		}
	})

	const handleSubmit = async (data: LeaseFormData) => {
		try {
			if (mode === 'create') {
				await leases.create({
					unitId: data.unitId || '',
					tenantId: data.tenantId,
					startDate: data.startDate,
					endDate: data.endDate,
					rentAmount: data.rentAmount,
					securityDeposit: data.securityDeposit,
					status: 'ACTIVE'
				})
				toast.success('Lease created successfully')
			} else if (lease) {
				await leases.update(lease.id, {
					startDate: data.startDate,
					endDate: data.endDate,
					rentAmount: data.rentAmount,
					securityDeposit: data.securityDeposit,
					status: data.status === 'DRAFT' ? 'ACTIVE' : data.status
				})
				toast.success('Lease updated successfully')
			}

			form.reset()
			onSuccess()
			onClose()
		} catch (error) {
			console.error('Error saving lease:', error)
			toast.error(
				mode === 'create'
					? 'Failed to create lease'
					: 'Failed to update lease'
			)
		}
	}

	const isPending = leases.creating || leases.updating

	return {
		form,
		handleSubmit: form.handleSubmit(handleSubmit),
		isPending,
		leaseSchema
	}
}
