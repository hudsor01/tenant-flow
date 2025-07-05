import type { UseFormReturn } from 'react-hook-form'
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import type { PaymentFormData } from '@/hooks/usePaymentFormData'

interface PaymentNotesSectionProps {
	form: UseFormReturn<PaymentFormData>
}

/**
 * Payment form section for optional notes field
 * Allows users to add additional context about the payment
 */
export default function PaymentNotesSection({
	form
}: PaymentNotesSectionProps) {
	return (
		<FormField
			control={form.control}
			name="notes"
			render={({ field }) => (
				<FormItem className="md:col-span-2">
					<FormLabel>Notes (Optional)</FormLabel>
					<FormControl>
						<Textarea
							placeholder="Add any additional notes about this payment..."
							className="resize-none"
							rows={3}
							{...field}
						/>
					</FormControl>
					<FormDescription>
						Optional notes about the payment (payment method,
						special circumstances, etc.)
					</FormDescription>
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}
