import { DollarSign, Shield, Clock, Wrench, FileText } from 'lucide-react'
import type { PaymentType } from '@/types/entities'

/**
 * Get the appropriate icon for a payment type
 */
export const getPaymentTypeIcon = (type: PaymentType) => {
	switch (type) {
		case 'RENT':
			return DollarSign
		case 'DEPOSIT':
			return Shield
		case 'LATE_FEE':
			return Clock
		case 'MAINTENANCE':
			return Wrench
		case 'OTHER':
		default:
			return FileText
	}
}

/**
 * Get a description for a payment type
 */
export const getPaymentTypeDescription = (type: PaymentType): string => {
	switch (type) {
		case 'RENT':
			return 'Monthly rental payment'
		case 'DEPOSIT':
			return 'Security or pet deposit'
		case 'LATE_FEE':
			return 'Late payment penalty'
		case 'MAINTENANCE':
			return 'Maintenance or repair charge'
		case 'OTHER':
		default:
			return 'Other payment type'
	}
}

/**
 * Payment type options for select components
 */
export const PAYMENT_TYPE_OPTIONS = [
	{ value: 'RENT', label: 'Rent', icon: DollarSign },
	{ value: 'DEPOSIT', label: 'Deposit', icon: Shield },
	{ value: 'LATE_FEE', label: 'Late Fee', icon: Clock },
	{ value: 'MAINTENANCE', label: 'Maintenance', icon: Wrench },
	{ value: 'OTHER', label: 'Other', icon: FileText }
] as const
