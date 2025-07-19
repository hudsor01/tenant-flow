import React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Calendar, DollarSign } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import type { LeaseGeneratorFormData } from '@/hooks/useLeaseGeneratorForm'

interface LeaseTermsSectionProps {
	form: UseFormReturn<LeaseGeneratorFormData>
}

/**
 * Lease terms section for lease generator
 * Handles financial terms, dates, and payment information
 */
export function LeaseTermsSection({ form }: LeaseTermsSectionProps) {
	const paymentMethod = form.watch('paymentMethod')

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Calendar className="h-5 w-5" />
					Lease Terms & Payment
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="rentAmount">
							Monthly Rent Amount *
						</Label>
						<div className="relative">
							<DollarSign className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
							<Input
								id="rentAmount"
								type="number"
								placeholder="1500"
								className="pl-9"
								{...form.register('rentAmount', {
									valueAsNumber: true
								})}
							/>
						</div>
						{form.formState.errors.rentAmount && (
							<p className="text-destructive text-sm">
								{form.formState.errors.rentAmount.message}
							</p>
						)}
					</div>

					<div>
						<Label htmlFor="securityDeposit">
							Security Deposit *
						</Label>
						<div className="relative">
							<DollarSign className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
							<Input
								id="securityDeposit"
								type="number"
								placeholder="1500"
								className="pl-9"
								{...form.register('securityDeposit', {
									valueAsNumber: true
								})}
							/>
						</div>
						{form.formState.errors.securityDeposit && (
							<p className="text-destructive text-sm">
								{form.formState.errors.securityDeposit.message}
							</p>
						)}
					</div>

					<div>
						<Label htmlFor="leaseStartDate">
							Lease Start Date *
						</Label>
						<Input
							id="leaseStartDate"
							type="date"
							{...form.register('leaseStartDate')}
						/>
						{form.formState.errors.leaseStartDate && (
							<p className="text-destructive text-sm">
								{form.formState.errors.leaseStartDate.message}
							</p>
						)}
					</div>

					<div>
						<Label htmlFor="leaseEndDate">Lease End Date *</Label>
						<Input
							id="leaseEndDate"
							type="date"
							{...form.register('leaseEndDate')}
						/>
						{form.formState.errors.leaseEndDate && (
							<p className="text-destructive text-sm">
								{form.formState.errors.leaseEndDate.message}
							</p>
						)}
					</div>

					<div>
						<Label htmlFor="paymentDueDate">Payment Due Date</Label>
						<Select
							onValueChange={(value: string) =>
								form.setValue('paymentDueDate', parseInt(value))
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="1st of month" />
							</SelectTrigger>
							<SelectContent>
								{Array.from(
									{ length: 31 },
									(_, i) => i + 1
								).map(day => (
									<SelectItem
										key={day}
										value={day.toString()}
									>
										{day}
										{day === 1
											? 'st'
											: day === 2
												? 'nd'
												: day === 3
													? 'rd'
													: 'th'}{' '}
										of month
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label htmlFor="paymentMethod">Payment Method</Label>
						<Select
							onValueChange={(value: string) =>
								form.setValue(
									'paymentMethod',
									value as
										| 'check'
										| 'online'
										| 'bank_transfer'
										| 'cash'
								)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select method" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="check">Check</SelectItem>
								<SelectItem value="online">
									Online Payment
								</SelectItem>
								<SelectItem value="bank_transfer">
									Bank Transfer
								</SelectItem>
								<SelectItem value="cash">Cash</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label htmlFor="lateFeeAmount">Late Fee Amount</Label>
						<div className="relative">
							<DollarSign className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
							<Input
								id="lateFeeAmount"
								type="number"
								placeholder="50"
								className="pl-9"
								{...form.register('lateFeeAmount', {
									valueAsNumber: true
								})}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="lateFeeDays">
							Late Fee After (Days)
						</Label>
						<Input
							id="lateFeeDays"
							type="number"
							placeholder="5"
							{...form.register('lateFeeDays', {
								valueAsNumber: true
							})}
						/>
					</div>
				</div>

				{paymentMethod === 'check' && (
					<div>
						<Label htmlFor="paymentAddress">Payment Address</Label>
						<Input
							id="paymentAddress"
							placeholder="Where should checks be mailed?"
							{...form.register('paymentAddress')}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
