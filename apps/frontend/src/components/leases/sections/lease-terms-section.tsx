import type { UseFormReturn } from 'react-hook-form'
import { DollarSign } from 'lucide-react'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
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
import { FormSection } from '@/components/modals/base-form-modal'
import type { LeaseFormData } from '@/hooks/use-lease-form'

interface LeaseTermsSectionProps {
	form: UseFormReturn<LeaseFormData>
	selectedProperty: { id: string } | null
	mode: 'create' | 'edit'
}

/**
 * Lease terms section for lease forms
 * Handles dates, financial terms, and status
 */
export function LeaseTermsSection({
	form,
	selectedProperty,
	mode
}: LeaseTermsSectionProps) {
	if (!selectedProperty) {
		return null
	}

	return (
		<FormSection icon={DollarSign} title="4. Lease Terms" delay={3}>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{/* Start Date */}
				<FormField
					control={form.control}
					name="startDate"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Lease Start Date *</FormLabel>
							<FormControl>
								<Input type="date" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* End Date */}
				<FormField
					control={form.control}
					name="endDate"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Lease End Date *</FormLabel>
							<FormControl>
								<Input type="date" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Rent Amount */}
				<FormField
					control={form.control}
					name="monthlyRent"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Monthly Rent *</FormLabel>
							<FormControl>
								<div className="relative">
									<span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
										$
									</span>
									<Input
										type="number"
										className="pl-8"
										{...field}
										onChange={(
											e: React.ChangeEvent<HTMLInputElement>
										) =>
											field.onChange(
												parseFloat(e.target.value) ?? 0
											)
										}
									/>
								</div>
							</FormControl>
							<FormDescription>
								Monthly rent amount agreed upon in the lease
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Security Deposit */}
				<FormField
					control={form.control}
					name="securityDeposit"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Security Deposit *</FormLabel>
							<FormControl>
								<div className="relative">
									<span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
										$
									</span>
									<Input
										type="number"
										className="pl-8"
										{...field}
										onChange={(
											e: React.ChangeEvent<HTMLInputElement>
										) =>
											field.onChange(
												parseFloat(e.target.value) ?? 0
											)
										}
									/>
								</div>
							</FormControl>
							<FormDescription>
								Security deposit amount (typically 1-2x MONTHLY
								rent)
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Late Fee Days */}
				<FormField
					control={form.control}
					name="lateFeeDays"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Late Fee Grace Period (Days)</FormLabel>
							<FormControl>
								<Input
									type="number"
									min="0"
									max="30"
									{...field}
									onChange={(
										e: React.ChangeEvent<HTMLInputElement>
									) =>
										field.onChange(
											parseInt(e.target.value) ||
												undefined
										)
									}
								/>
							</FormControl>
							<FormDescription>
								Days after due date before late fee applies
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Late Fee Amount */}
				<FormField
					control={form.control}
					name="lateFeeAmount"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Late Fee Amount</FormLabel>
							<FormControl>
								<div className="relative">
									<span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
										$
									</span>
									<Input
										type="number"
										className="pl-8"
										min="0"
										{...field}
										onChange={(
											e: React.ChangeEvent<HTMLInputElement>
										) =>
											field.onChange(
												parseFloat(e.target.value) ||
													undefined
											)
										}
									/>
								</div>
							</FormControl>
							<FormDescription>
								Fixed late fee amount or percentage of rent
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Enhanced Status for edit mode */}
				{mode === 'edit' && (
					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem className="md:col-span-2">
								<FormLabel>Lease Status</FormLabel>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select lease status" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="DRAFT">
											Draft
										</SelectItem>
										<SelectItem value="PENDING_REVIEW">
											Pending Review
										</SelectItem>
										<SelectItem value="PENDING_SIGNATURES">
											Awaiting Signatures
										</SelectItem>
										<SelectItem value="SIGNED">
											Signed
										</SelectItem>
										<SelectItem value="ACTIVE">
											Active
										</SelectItem>
										<SelectItem value="EXPIRED">
											Expired
										</SelectItem>
										<SelectItem value="TERMINATED">
											Terminated
										</SelectItem>
										<SelectItem value="PENDING_RENEWAL">
											Pending Renewal
										</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
			</div>
		</FormSection>
	)
}
