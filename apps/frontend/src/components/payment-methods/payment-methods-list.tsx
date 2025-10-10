'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	useDeletePaymentMethod,
	usePaymentMethods,
	useSetDefaultPaymentMethod
} from '@/hooks/api/use-payment-methods'
import type { PaymentMethodResponse } from '@repo/shared/types/core'
import {
	BanknoteIcon,
	CheckCircle2Icon,
	CreditCardIcon,
	Loader2Icon,
	MoreVerticalIcon
} from 'lucide-react'
import { useState } from 'react'
import { AddPaymentMethodDialog } from './add-payment-method-dialog'

export function PaymentMethodsList() {
	const [showAddDialog, setShowAddDialog] = useState(false)
	const { data: paymentMethods, isLoading, error } = usePaymentMethods()
	const setDefault = useSetDefaultPaymentMethod()
	const deleteMethod = useDeletePaymentMethod()

	const handleSetDefault = async (id: string) => {
		await setDefault.mutateAsync(id).catch(() => {
			// Error is handled by the mutation's onError callback
		})
	}

	const handleDelete = async (id: string) => {
		await deleteMethod.mutateAsync(id).catch(() => {
			// Error is handled by the mutation's onError callback
		})
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Payment Methods</CardTitle>
						<CardDescription>
							Manage how you pay for rent and fees
						</CardDescription>
					</div>
					<Button onClick={() => setShowAddDialog(true)}>
						Add Payment Method
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>
							Failed to load payment methods. Please try again.
						</AlertDescription>
					</Alert>
				)}

				{isLoading && (
					<div className="flex items-center justify-center py-8">
						<Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				)}

				{!isLoading &&
					!error &&
					paymentMethods &&
					paymentMethods.length === 0 && (
						<div className="py-8 text-center text-muted-foreground">
							<p>No payment methods added yet</p>
							<p className="text-sm mt-2">
								Add a payment method to enable automatic rent payments
							</p>
						</div>
					)}

				{!isLoading &&
					!error &&
					paymentMethods &&
					paymentMethods.length > 0 && (
						<div className="space-y-4">
							{paymentMethods.map(method => (
								<PaymentMethodCard
									key={method.id}
									method={method}
									onSetDefault={handleSetDefault}
									onDelete={handleDelete}
									isSettingDefault={setDefault.isPending}
									isDeleting={deleteMethod.isPending}
								/>
							))}
						</div>
					)}
			</CardContent>

			<AddPaymentMethodDialog
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				onSuccess={() => setShowAddDialog(false)}
			/>
		</Card>
	)
}

interface PaymentMethodCardProps {
	method: PaymentMethodResponse
	onSetDefault: (id: string) => void
	onDelete: (id: string) => void
	isSettingDefault: boolean
	isDeleting: boolean
}

function PaymentMethodCard({
	method,
	onSetDefault,
	onDelete,
	isSettingDefault,
	isDeleting
}: PaymentMethodCardProps) {
	const Icon = method.type === 'card' ? CreditCardIcon : BanknoteIcon

	return (
		<div className="flex items-center justify-between rounded-lg border p-4">
			<div className="flex items-center gap-4">
				<div className="rounded-full bg-muted p-2">
					<Icon className="h-5 w-5" />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium">
							{method.type === 'card'
								? `${method.brand ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1) : 'Card'} •••• ${method.last4}`
								: `${method.bankName || 'Bank Account'} •••• ${method.last4}`}
						</span>
						{method.isDefault && (
							<span className="flex items-center gap-1 text-sm text-green-600">
								<CheckCircle2Icon className="h-4 w-4" />
								Default
							</span>
						)}
					</div>
					<p className="text-sm text-muted-foreground">
						{method.type === 'card'
							? 'Credit/Debit Card'
							: 'Bank Account (ACH)'}
					</p>
				</div>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						disabled={isSettingDefault || isDeleting}
					>
						<MoreVerticalIcon className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{!method.isDefault && (
						<DropdownMenuItem onClick={() => onSetDefault(method.id)}>
							Set as Default
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						onClick={() => onDelete(method.id)}
						className="text-destructive"
					>
						Remove
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
