import type { UseFormReturn } from 'react-hook-form'
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage
} from '@/components/ui/form'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FileText, DollarSign, Calendar } from 'lucide-react'
import type { LeaseWithRelations } from '@/types/relationships'
import type { PaymentFormData } from '@/hooks/usePaymentFormData'
import {
	getPaymentTypeDescription,
	PAYMENT_TYPE_OPTIONS
} from '@/utils/paymentTypeUtils'

interface PaymentDetailsSectionProps {
	form: UseFormReturn<PaymentFormData>
	availableLeases: LeaseWithRelations[]
}

/**
 * Payment form section for core payment details:
 * - Lease selection with property/unit/tenant info
 * - Payment amount with currency formatting
 * - Payment date picker
 * - Payment type selection with icons and descriptions
 */
export default function PaymentDetailsSection({
	form,
	availableLeases
}: PaymentDetailsSectionProps) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			{/* Lease Selection */}
			<FormField
				control={form.control}
				name="leaseId"
				render={({ field }) => (
					<FormItem className="md:col-span-2">
						<FormLabel>
							<FileText className="mr-1 inline h-4 w-4" />
							Lease
						</FormLabel>
						<Select
							onValueChange={field.onChange}
							defaultValue={field.value}
						>
							<FormControl>
								<SelectTrigger>
									<SelectValue placeholder="Select a lease" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{availableLeases.map(lease => (
									<SelectItem key={lease.id} value={lease.id}>
										<div className="flex w-full items-center justify-between">
											<span>
												{lease.unit?.property?.name} -
												Unit {lease.unit?.unitNumber}
											</span>
											<span className="text-muted-foreground ml-4">
												{lease.tenant?.name} - $
												{lease.rentAmount}/mo
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormDescription>
							Select the lease this payment is for
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Payment Amount */}
			<FormField
				control={form.control}
				name="amount"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<DollarSign className="mr-1 inline h-4 w-4" />
							Amount
						</FormLabel>
						<FormControl>
							<div className="relative">
								<span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
									$
								</span>
								<Input
									type="number"
									step="0.01"
									className="pl-8"
									{...field}
									onChange={e =>
										field.onChange(
											parseFloat(e.target.value) || 0
										)
									}
								/>
							</div>
						</FormControl>
						<FormDescription>
							Payment amount received
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Payment Date */}
			<FormField
				control={form.control}
				name="date"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Calendar className="mr-1 inline h-4 w-4" />
							Payment Date
						</FormLabel>
						<FormControl>
							<Input type="date" {...field} />
						</FormControl>
						<FormDescription>
							When the payment was received
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Payment Type */}
			<FormField
				control={form.control}
				name="type"
				render={({ field }) => (
					<FormItem className="md:col-span-2">
						<FormLabel>Payment Type</FormLabel>
						<Select
							onValueChange={field.onChange}
							defaultValue={field.value}
						>
							<FormControl>
								<SelectTrigger>
									<SelectValue placeholder="Select payment type" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{PAYMENT_TYPE_OPTIONS.map(option => {
									const IconComponent = option.icon
									return (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											<div className="flex items-center gap-2">
												<IconComponent className="h-4 w-4" />
												<div>
													<div className="font-medium">
														{option.label}
													</div>
													<div className="text-muted-foreground text-xs">
														{getPaymentTypeDescription(
															option.value
														)}
													</div>
												</div>
											</div>
										</SelectItem>
									)
								})}
							</SelectContent>
						</Select>
						<FormDescription>
							Categorize this payment for reporting
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	)
}
