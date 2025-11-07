'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { ButtonGroup } from '#components/ui/button-group'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Textarea } from '#components/ui/textarea'
import { cn } from '#lib/utils'
import type { Tables } from '@repo/shared/types/supabase'
import { leaseUpdateSchema } from '@repo/shared/validation/leases'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@repo/shared/utils/currency'
import {
	Building,
	Calendar,
	CreditCard,
	DollarSign,
	Edit,
	Eye,
	FileText,
	RotateCcw,
	Users
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { useUpdateLease } from '#hooks/api/use-lease'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import { useCreateRentPayment } from '#hooks/api/use-rent-payments'
import { LateFeesSection } from './late-fees-section'
import { RenewLeaseDialog } from './renew-lease-dialog'
import { TerminateLeaseDialog } from './terminate-lease-dialog'

type Lease = Tables<'lease'>

interface LeaseActionButtonsProps {
	lease: Lease
}

export function LeaseActionButtons({ lease }: LeaseActionButtonsProps) {
	const [viewOpen, setViewOpen] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const [renewOpen, setRenewOpen] = useState(false)
	const [terminateOpen, setTerminateOpen] = useState(false)
	const [payRentOpen, setPayRentOpen] = useState(false)
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
		useState<string>('')
	const queryClient = useQueryClient()

	const { data: paymentMethods } = usePaymentMethods()
	const createPayment = useCreateRentPayment()
	const updateLease = useUpdateLease()

	const form = useForm({
		defaultValues: {
			startDate: lease.startDate,
			endDate: lease.endDate,
			rentAmount: lease.rentAmount,
			securityDeposit: lease.securityDeposit,
			terms: lease.terms || '',
			status: lease.status
		},
		onSubmit: async ({ value }) => {
			try {
				await updateLease.mutateAsync({
					id: lease.id,
					data: {
						startDate: value.startDate,
						endDate: value.endDate,
						rentAmount: value.rentAmount,
						securityDeposit: value.securityDeposit,
						terms: value.terms || null,
						status: value.status
					}
				})
				queryClient.invalidateQueries({ queryKey: ['leases'] })
				toast.success('Lease updated successfully')
				setEditOpen(false)
			} catch (error) {
				toast.error(
					`Failed to update lease: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = leaseUpdateSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	const handlePayRent = async () => {
		if (!selectedPaymentMethodId) {
			toast.error('Please select a payment method')
			return
		}

		try {
			const result = await createPayment.mutateAsync({
				tenantId: lease.tenantId,
				leaseId: lease.id,
				amount: lease.rentAmount,
				paymentMethodId: selectedPaymentMethodId
			})

			const receiptUrl =
				result.paymentIntent.receiptUrl || result.paymentIntent.receiptUrl

			if (result.success && receiptUrl) {
				toast.success(
					<div>
						Payment successful!{' '}
						<a
							href={receiptUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="underline"
						>
							View Receipt
						</a>
					</div>
				)
				setPayRentOpen(false)
				setSelectedPaymentMethodId('')
			} else {
				toast.error('Payment completed but receipt unavailable')
			}
		} catch {
			toast.error('Payment failed. Please try again.')
		}
	}

	return (
		<ButtonGroup>
			{/* Edit Button & Dialog */}
			<Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
				<Edit className="size-4" />
			</Button>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Edit Lease Agreement</DialogTitle>
						<DialogDescription>
							Update lease terms including dates, rent amount, and conditions.
						</DialogDescription>
					</DialogHeader>

					<form
						onSubmit={e => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className="space-y-4"
					>
						<div className="grid grid-cols-2 gap-4">
							<form.Field name="startDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="edit-startDate">Start Date</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Calendar className="size-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="edit-startDate"
												type="date"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<form.Field name="endDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="edit-endDate">End Date</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Calendar className="size-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="edit-endDate"
												type="date"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<form.Field name="rentAmount">
								{field => (
									<Field>
										<FieldLabel htmlFor="edit-rentAmount">
											Monthly Rent
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<DollarSign className="size-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="edit-rentAmount"
												type="number"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(Number(e.target.value))
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<form.Field name="securityDeposit">
								{field => (
									<Field>
										<FieldLabel htmlFor="edit-securityDeposit">
											Security Deposit
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<DollarSign className="size-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="edit-securityDeposit"
												type="number"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(Number(e.target.value))
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>
						</div>

						<form.Field name="terms">
							{field => (
								<Field>
									<FieldLabel htmlFor="edit-terms">
										Terms & Conditions
									</FieldLabel>
									<Textarea
										id="edit-terms"
										value={field.state.value}
										onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										rows={3}
									/>
									{field.state.meta.errors?.length && (
										<FieldError>
											{String(field.state.meta.errors[0])}
										</FieldError>
									)}
								</Field>
							)}
						</form.Field>

						<div className="flex justify-end pt-2">
							<ButtonGroup>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={updateLease.isPending}>
									{updateLease.isPending ? 'Updating...' : 'Update Lease'}
								</Button>
							</ButtonGroup>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Renew Button & Dialog */}
			<Button
				variant="outline"
				size="sm"
				onClick={() => setRenewOpen(true)}
				disabled={lease.status !== 'ACTIVE'}
			>
				<RotateCcw className="size-4" />
			</Button>

			<RenewLeaseDialog
				open={renewOpen}
				onOpenChange={setRenewOpen}
				lease={lease}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ['leases'] })
					queryClient.invalidateQueries({ queryKey: ['lease-stats'] })
				}}
			/>

			{/* Terminate Lease Dialog */}
			<TerminateLeaseDialog
				open={terminateOpen}
				onOpenChange={setTerminateOpen}
				lease={lease}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ['leases'] })
					queryClient.invalidateQueries({ queryKey: ['lease-stats'] })
				}}
			/>

			{/* View Button & Dialog */}
			<Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
				<Eye className="size-4" />
			</Button>

			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FileText className="size-5" />
							Lease Agreement
						</DialogTitle>
						<DialogDescription>
							View complete lease agreement details including terms, financial
							information, and status.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* Lease Information */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Calendar className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium">Lease Period</span>
								</div>
								<span className="text-sm text-muted-foreground">
									{new Date(lease.startDate).toLocaleDateString()} -{' '}
									{new Date(lease.endDate).toLocaleDateString()}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<DollarSign className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium">Monthly Rent</span>
								</div>
								<span className="font-semibold">
									{formatCurrency(lease.rentAmount)}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<DollarSign className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium">Security Deposit</span>
								</div>
								<span className="text-sm text-muted-foreground">
									{formatCurrency(lease.securityDeposit)}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">Status</span>
								</div>
								<Badge
									className={cn(
										'text-[oklch(var(--primary-foreground))]',
										lease.status === 'ACTIVE'
											? 'bg-(--chart-1)'
											: 'bg-(--chart-5)'
									)}
								>
									{lease.status}
								</Badge>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Users className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium">Tenant ID</span>
								</div>
								<span className="text-sm text-muted-foreground font-mono">
									{lease.tenantId}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Building className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium">Unit ID</span>
								</div>
								<span className="text-sm text-muted-foreground font-mono">
									{lease.unitId}
								</span>
							</div>
						</div>

						{/* Late Fees Section */}
						<LateFeesSection leaseId={lease.id} />

						{/* Terms & Conditions */}
						{lease.terms && (
							<div className="space-y-2">
								<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
									Terms & Conditions
								</h3>
								<div className="p-3 bg-muted rounded-lg">
									<p className="text-sm whitespace-pre-wrap">{lease.terms}</p>
								</div>
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex justify-between pt-4 border-t gap-2">
							<div className="flex gap-2">
								{lease.status === 'ACTIVE' && (
									<>
										<Button
											variant="default"
											size="sm"
											onClick={() => {
												setViewOpen(false)
												setPayRentOpen(true)
											}}
										>
											<CreditCard className="size-4 mr-2" />
											Pay Rent
										</Button>
										<Button
											variant="destructive"
											size="sm"
											onClick={() => {
												setViewOpen(false)
												setTerminateOpen(true)
											}}
										>
											Terminate Lease
										</Button>
									</>
								)}
							</div>

							<ButtonGroup>
								<Button variant="outline" onClick={() => setViewOpen(false)}>
									Close
								</Button>
								<Button
									onClick={() => {
										setViewOpen(false)
										setEditOpen(true)
									}}
								>
									Edit Lease
								</Button>
							</ButtonGroup>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Pay Rent Dialog */}
			<Dialog open={payRentOpen} onOpenChange={setPayRentOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CreditCard className="size-5" />
							Pay Rent
						</DialogTitle>
						<DialogDescription>
							Make a one-time rent payment for this lease
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{/* Rent Amount Display */}
						<div className="p-4 bg-muted rounded-lg">
							<p className="text-sm text-muted-foreground mb-1">Rent Amount</p>
							<p className="text-2xl font-semibold">
								{formatCurrency(lease.rentAmount)}
							</p>
						</div>

						{/* Payment Method Selection */}
						<div className="space-y-2">
							<Label htmlFor="paymentMethod">Payment Method</Label>
							<Select
								value={selectedPaymentMethodId}
								onValueChange={setSelectedPaymentMethodId}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select payment method" />
								</SelectTrigger>
								<SelectContent>
									{paymentMethods?.map(method => (
										<SelectItem key={method.id} value={method.id}>
											{method.type === 'card'
												? `${method.brand} ••••${method.last4}`
												: `${method.bankName || 'Bank'} ••••${method.last4}`}
											{method.isDefault && ' (Default)'}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{!paymentMethods?.length && (
								<p className="text-sm text-muted-foreground">
									No payment methods saved. Please add a payment method first.
								</p>
							)}
						</div>

						{/* Action Buttons */}
						<div className="flex justify-end gap-2 pt-4 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setPayRentOpen(false)
									setSelectedPaymentMethodId('')
								}}
							>
								Cancel
							</Button>
							<Button
								onClick={handlePayRent}
								disabled={
									createPayment.isPending ||
									!selectedPaymentMethodId ||
									!paymentMethods?.length
								}
							>
								{createPayment.isPending ? 'Processing...' : 'Pay Now'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</ButtonGroup>
	)
}
