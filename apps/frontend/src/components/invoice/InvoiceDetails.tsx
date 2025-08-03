import { Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { UseFormRegister } from 'react-hook-form'

import type { CustomerInvoiceForm } from '@tenantflow/shared'

interface InvoiceDetailsProps {
register: UseFormRegister<CustomerInvoiceForm>
}

export function InvoiceDetails({ register }: InvoiceDetailsProps) {
	return (
		<Card className="group bg-card/80 h-fit border-0 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl">
			<CardHeader className="from-primary/5 to-accent/5 border-border/50 flex items-center justify-center border-b bg-gradient-to-r py-4">
				<CardTitle className="text-foreground flex items-center justify-center gap-3">
					<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-2 transition-colors">
						<Eye className="text-primary h-5 w-5" />
					</div>
					<span className="font-serif">Invoice Details</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="py-4">
				<div className="mb-6 flex items-center justify-center gap-8">
					<div className="flex items-center gap-4">
						<Label
							htmlFor="invoiceNumber"
							className="text-sm font-medium whitespace-nowrap"
						>
							Invoice Number
						</Label>
						<Input
							id="invoiceNumber"
							{...register('invoiceNumber')}
							placeholder="INV-001"
							className="w-40"
						/>
					</div>
					<div className="flex items-center gap-4">
						<Label
							htmlFor="dueDate"
							className="text-sm font-medium whitespace-nowrap"
						>
							Due Date
						</Label>
						<Input
							id="dueDate"
							type="date"
							{...register('dueDate', {
								setValueAs: value => new Date(value)
							})}
							className="w-40"
						/>
					</div>
				</div>

				{/* Terms & Conditions */}
				<div className="flex flex-col gap-2">
					<Label htmlFor="terms">Terms & Conditions</Label>
					<Textarea
						id="terms"
						{...register('terms')}
						placeholder="Payment is due within 30 days."
						rows={3}
					/>
				</div>
			</CardContent>
		</Card>
	)
}
